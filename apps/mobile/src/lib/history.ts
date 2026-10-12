import {
  type Severity,
  type Species,
  type Verdict,
  type VerdictPayload,
  normalise,
} from '@canmyeatthis/shared';

/**
 * Past checks, kept on this device in SQLite (docs/02-tech-decisions.md D10, docs/00 §2.5).
 * Nothing here syncs or leaves the phone.
 *
 * A row records what was asked and what the app answered *then*: the item's KB id (or `null` for
 * a query that matched nothing), the typed text, the species, the verdict and severity shown, and
 * the KB version that produced them (docs/04-knowledge-base.md §5: "recorded on every history
 * entry, so a past result can be explained").
 *
 * It does not store the verdict's prose. Re-opening a row resolves it again against today's KB
 * (`lib/historyRows.ts`), so an entry corrected since — grapes moved from caution to toxic, say —
 * is never re-shown with its old, more optimistic answer (AGENTS.md #10). The stored verdict is
 * what lets the list say that the answer has changed.
 *
 * The functions take the database as a parameter so tests can run the real SQL against Node's
 * built-in SQLite (`history.test.ts`); the app passes the `expo-sqlite` handle from
 * `lib/historyDb.ts`.
 */

/** The subset of `expo-sqlite`'s `SQLiteDatabase` this module uses. */
export interface HistoryDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: SqlParam[]): Promise<unknown>;
  getAllAsync<T>(source: string, ...params: SqlParam[]): Promise<T[]>;
  getFirstAsync<T>(source: string, ...params: SqlParam[]): Promise<T | null>;
}

export type SqlParam = string | number | null;

export interface HistoryRecord {
  id: number;
  /** `null` when the query matched nothing (an `unknown` with no KB entry). */
  kbId: string | null;
  /** What the person typed, trimmed. Empty for a check that started from a tap, not typing. */
  query: string;
  species: Species;
  verdict: Verdict;
  severity: Severity | null;
  kbVersion: string;
  /** The displayed name at the time, in the language used then — a fallback label only. */
  displayName: string;
  /** Epoch milliseconds. */
  checkedAt: number;
  /** A local photo thumbnail, for the photo-identification release. Always `null` until then. */
  thumbnailUri: string | null;
}

export type NewHistoryRecord = Omit<HistoryRecord, 'id'>;

/**
 * The most rows kept. History is a convenience, not an archive: past this the oldest go, so the
 * list stays fast to load and search on an old phone.
 */
export const HISTORY_LIMIT = 500;

/** Bump with a new `MIGRATIONS` entry; never edit a shipped one. */
const MIGRATIONS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS checks (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     kb_id TEXT,
     query TEXT NOT NULL,
     species TEXT NOT NULL,
     verdict TEXT NOT NULL,
     severity TEXT,
     kb_version TEXT NOT NULL,
     display_name TEXT NOT NULL,
     checked_at INTEGER NOT NULL,
     thumbnail_uri TEXT
   );
   CREATE INDEX IF NOT EXISTS checks_checked_at ON checks (checked_at DESC);`,
];

/** Creates or upgrades the schema, tracked by SQLite's own `user_version`. Idempotent. */
export async function migrateHistory(db: HistoryDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.execAsync(MIGRATIONS[version] as string);
    await db.execAsync(`PRAGMA user_version = ${version + 1}`);
  }
}

interface CheckRow {
  id: number;
  kb_id: string | null;
  query: string;
  species: string;
  verdict: string;
  severity: string | null;
  kb_version: string;
  display_name: string;
  checked_at: number;
  thumbnail_uri: string | null;
}

function fromRow(row: CheckRow): HistoryRecord {
  return {
    id: row.id,
    kbId: row.kb_id,
    query: row.query,
    species: row.species as Species,
    verdict: row.verdict as Verdict,
    severity: row.severity as Severity | null,
    kbVersion: row.kb_version,
    displayName: row.display_name,
    checkedAt: row.checked_at,
    thumbnailUri: row.thumbnail_uri,
  };
}

/** Newest first. */
export async function listChecks(db: HistoryDatabase): Promise<HistoryRecord[]> {
  const rows = await db.getAllAsync<CheckRow>(
    'SELECT * FROM checks ORDER BY checked_at DESC, id DESC LIMIT ?',
    HISTORY_LIMIT,
  );
  return rows.map(fromRow);
}

export async function addCheck(db: HistoryDatabase, record: NewHistoryRecord): Promise<void> {
  await db.runAsync(
    `INSERT INTO checks
       (kb_id, query, species, verdict, severity, kb_version, display_name, checked_at, thumbnail_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    record.kbId,
    record.query,
    record.species,
    record.verdict,
    record.severity,
    record.kbVersion,
    record.displayName,
    record.checkedAt,
    record.thumbnailUri,
  );
  await db.runAsync(
    `DELETE FROM checks WHERE id NOT IN
       (SELECT id FROM checks ORDER BY checked_at DESC, id DESC LIMIT ?)`,
    HISTORY_LIMIT,
  );
}

export async function deleteCheck(db: HistoryDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM checks WHERE id = ?', id);
}

/**
 * The row to store for a verdict the person has just been shown. `query` is what they typed, when
 * the check started from typing.
 */
export function recordFromPayload(
  payload: VerdictPayload,
  query: string,
  checkedAt: number,
): NewHistoryRecord {
  return {
    kbId: payload.kbId === UNKNOWN_KB_ID ? null : payload.kbId,
    query: query.trim(),
    species: payload.species,
    verdict: payload.verdict,
    severity: payload.severity,
    kbVersion: payload.kbVersion,
    displayName: payload.displayName,
    checkedAt,
    thumbnailUri: null,
  };
}

/** `buildUnknownVerdict`'s placeholder id for a query that matched nothing (`lib/verdict.ts`). */
export const UNKNOWN_KB_ID = '__unknown__';

/**
 * Whether a row matches a search, on any name it can be found by: today's display name in the
 * person's language, the name stored then, and what they typed. Accent- and case-insensitive
 * through the shared `normalise()`, so "platano" finds "Plátano".
 */
export function matchesSearch(names: readonly string[], search: string): boolean {
  const needle = normalise(search);
  if (!needle) return true;
  return names.some((name) => normalise(name).includes(needle));
}
