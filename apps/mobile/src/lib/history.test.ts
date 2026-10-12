import { DatabaseSync } from 'node:sqlite';

import { buildRealVerdict, buildUnknownVerdict } from '@/lib/verdict';
import {
  DUPLICATE_WINDOW_MS,
  HISTORY_LIMIT,
  type HistoryDatabase,
  type NewHistoryRecord,
  type SqlParam,
  addCheck,
  deleteCheck,
  listChecks,
  matchesSearch,
  migrateHistory,
  recordFromPayload,
} from './history';
import { reopenTarget, toRowView } from './historyRows';
import { createHistoryStore } from './historyStore';

// The native module has no runtime under Jest; these tests hand the store a database directly.
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

/**
 * The real SQL, run against Node's built-in SQLite through the same four calls `expo-sqlite`
 * offers, so the schema, ordering and pruning are tested as they run on a phone.
 */
function memoryDb(): HistoryDatabase {
  const db = new DatabaseSync(':memory:');
  return {
    execAsync: async (source) => {
      db.exec(source);
    },
    runAsync: async (source, ...params: SqlParam[]) => db.prepare(source).run(...params),
    getAllAsync: async <T>(source: string, ...params: SqlParam[]) =>
      db.prepare(source).all(...params) as T[],
    getFirstAsync: async <T>(source: string, ...params: SqlParam[]) =>
      (db.prepare(source).get(...params) as T | undefined) ?? null,
  };
}

async function freshDb(): Promise<HistoryDatabase> {
  const db = memoryDb();
  await migrateHistory(db);
  return db;
}

function check(overrides: Partial<NewHistoryRecord> = {}): NewHistoryRecord {
  return {
    kbId: 'grapes_raisins',
    query: 'grapes',
    species: 'dog',
    verdict: 'toxic',
    severity: 'severe',
    kbVersion: '1.0.0',
    displayName: 'Grapes and raisins',
    checkedAt: 1_000,
    thumbnailUri: null,
    ...overrides,
  };
}

describe('the history table', () => {
  it('migrates once and is safe to migrate again', async () => {
    const db = await freshDb();
    await addCheck(db, check());
    await migrateHistory(db);
    expect(await listChecks(db)).toHaveLength(1);
  });

  it('round-trips a check, unknowns included', async () => {
    const db = await freshDb();
    await addCheck(db, check({ kbId: null, verdict: 'unknown', severity: null, query: 'zzz' }));
    const [row] = await listChecks(db);
    expect(row).toMatchObject({ kbId: null, verdict: 'unknown', severity: null, query: 'zzz' });
    expect(typeof row?.id).toBe('number');
  });

  it('saves the same check arriving twice only once', async () => {
    const db = await freshDb();
    await addCheck(db, check({ checkedAt: 1_000 }));
    await addCheck(db, check({ checkedAt: 1_500 }));
    expect(await listChecks(db)).toHaveLength(1);
  });

  it('saves a repeat of a check once the window has passed, or for the other species', async () => {
    const db = await freshDb();
    await addCheck(db, check({ checkedAt: 1_000 }));
    await addCheck(db, check({ checkedAt: 1_100, species: 'cat' }));
    await addCheck(db, check({ checkedAt: 1_100 + DUPLICATE_WINDOW_MS, species: 'cat' }));
    expect(await listChecks(db)).toHaveLength(3);
  });

  it('lists newest first', async () => {
    const db = await freshDb();
    await addCheck(db, check({ query: 'old', checkedAt: 1 }));
    await addCheck(db, check({ query: 'new', checkedAt: 3 }));
    await addCheck(db, check({ query: 'middle', checkedAt: 2 }));
    expect((await listChecks(db)).map((r) => r.query)).toEqual(['new', 'middle', 'old']);
  });

  it('deletes one check and leaves the rest', async () => {
    const db = await freshDb();
    await addCheck(db, check({ query: 'a', checkedAt: 1 }));
    await addCheck(db, check({ query: 'b', checkedAt: 2 }));
    const [newest] = await listChecks(db);
    await deleteCheck(db, newest?.id ?? -1);
    expect((await listChecks(db)).map((r) => r.query)).toEqual(['a']);
  });

  it(`keeps only the newest ${HISTORY_LIMIT}`, async () => {
    const db = await freshDb();
    for (let i = 0; i < HISTORY_LIMIT + 3; i++) {
      await addCheck(db, check({ query: `q${i}`, checkedAt: i }));
    }
    const rows = await listChecks(db);
    expect(rows).toHaveLength(HISTORY_LIMIT);
    expect(rows.at(-1)?.query).toBe('q3');
  });
});

describe('recordFromPayload', () => {
  it('stores the KB id, the answer and the KB version, not the prose', () => {
    const payload = buildRealVerdict({
      kbId: 'grapes_raisins',
      species: 'cat',
      language: 'en',
      disclaimer: 'x',
    });
    const record = recordFromPayload(payload, '  grapes ', 42);
    expect(record).toEqual({
      kbId: 'grapes_raisins',
      query: 'grapes',
      species: 'cat',
      verdict: payload.verdict,
      severity: payload.severity,
      kbVersion: payload.kbVersion,
      displayName: payload.displayName,
      checkedAt: 42,
      thumbnailUri: null,
    });
  });

  it('stores no KB id for a query that matched nothing', () => {
    const payload = buildUnknownVerdict({
      query: 'qwertyuiop',
      species: 'dog',
      language: 'en',
      disclaimer: 'x',
      headline: 'h',
      summary: 's',
    });
    expect(recordFromPayload(payload, 'qwertyuiop', 1).kbId).toBeNull();
  });
});

describe('re-opening a check', () => {
  const stored = (overrides: Partial<NewHistoryRecord> = {}) => ({ id: 1, ...check(overrides) });

  it('re-opens the entry it answered with', () => {
    expect(reopenTarget(stored(), 'en')).toEqual({
      kind: 'entry',
      kbId: 'grapes_raisins',
      species: 'dog',
    });
  });

  it('shows today’s answer and says when it differs from the one given then', () => {
    // Stored as "no known toxicity" under an older KB; today's KB says toxic. The row must show
    // toxic, never the old, more optimistic answer.
    const view = toRowView(stored({ verdict: 'safe', severity: null }), 'en', 'x');
    expect(view.verdictNow).toBe('toxic');
    expect(view.changed).toBe(true);
  });

  it('does not flag an unchanged answer', () => {
    const today = buildRealVerdict({
      kbId: 'grapes_raisins',
      species: 'dog',
      language: 'en',
      disclaimer: 'x',
    });
    const view = toRowView(stored({ verdict: today.verdict }), 'en', 'x');
    expect(view.changed).toBe(false);
  });

  it('names the row in the current language', () => {
    const view = toRowView(stored(), 'es', 'x');
    expect(view.name).toBe(
      buildRealVerdict({ kbId: 'grapes_raisins', species: 'dog', language: 'es', disclaimer: 'x' })
        .displayName,
    );
  });

  it('runs an unmatched query again, and finds it if the KB now covers it', () => {
    const view = toRowView(
      stored({ kbId: null, verdict: 'unknown', severity: null, query: 'uvas' }),
      'en',
      'x',
    );
    expect(view.target).toEqual({ kind: 'entry', kbId: 'grapes_raisins', species: 'dog' });
    expect(view.changed).toBe(true);
  });

  it('falls back to its typed text when its entry no longer exists', () => {
    const target = reopenTarget(stored({ kbId: 'no_longer_in_kb', query: 'qwertyuiop' }), 'en');
    expect(target).toEqual({ kind: 'unknown', query: 'qwertyuiop', species: 'dog' });
  });
});

describe('matchesSearch', () => {
  it('ignores case and accents', () => {
    expect(matchesSearch(['Plátano'], 'platano')).toBe(true);
    expect(matchesSearch(['Grapes and raisins'], 'GRAPE')).toBe(true);
  });

  it('matches any of the names it is given, and everything for an empty search', () => {
    expect(matchesSearch(['Uvas', 'grapes'], 'grap')).toBe(true);
    expect(matchesSearch(['Uvas'], 'onion')).toBe(false);
    expect(matchesSearch(['Uvas'], '  ')).toBe(true);
  });
});

describe('the history store', () => {
  it('records and removes checks', async () => {
    const db = await freshDb();
    const store = createHistoryStore(async () => db);
    await store.getState().record(check());
    expect(store.getState().records).toHaveLength(1);
    await store.getState().remove(store.getState().records[0]?.id ?? -1);
    expect(store.getState().records).toEqual([]);
  });

  it('never throws when storage fails — a verdict must still show (AGENTS.md #4)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createHistoryStore(async () => {
      throw new Error('disk full');
    });
    await expect(store.getState().record(check())).resolves.toBeUndefined();
    await expect(store.getState().load()).resolves.toBeUndefined();
    expect(store.getState()).toMatchObject({ records: [], loaded: true });
    warn.mockRestore();
  });

  it('shows an empty list where there is no database (the web build)', async () => {
    const store = createHistoryStore(async () => null);
    await store.getState().load();
    expect(store.getState()).toMatchObject({ records: [], loaded: true });
  });
});
