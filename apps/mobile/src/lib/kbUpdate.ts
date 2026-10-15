import type { SupportedLanguage } from '@/i18n/namespaces';
import type { HistoryDatabase } from '@/lib/history';
import { verifyKbDownload } from '@/lib/kbVerify';
import { getBundledKbVersion, getKbVersion, installKbUpdate } from '@/lib/offlineKb';

/**
 * Knowledge-base updates without a store release (docs/02 D38, docs/04-knowledge-base.md §5).
 *
 * At launch, `applyStoredKbUpdate` puts a previously downloaded, still-valid update in front of the
 * bundled KB. Then `checkForKbUpdate` asks the Worker, at most once a day per language, whether a
 * different KB is being served; if so it downloads it, verifies it (`lib/kbVerify.ts`) and stores
 * it for the next launch. Nothing swaps under a screen that is already open.
 *
 * Every failure is silent and leaves the KB the app already has. The emergency path never waits
 * on any of this (AGENTS.md #4): the bundled KB answers from the first frame.
 *
 * Off unless the build sets both `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_KB_PUBLIC_KEY`
 * (`lib/features.ts`), so a build without them makes no network call at all.
 */

export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15_000;

export interface KbUpdateConfig {
  apiUrl: string;
  publicKeyBase64: string;
  appVersion: string;
}

export interface KbUpdateDeps {
  db: HistoryDatabase;
  fetch: typeof fetch;
  now: () => number;
}

const MIGRATIONS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS kb_updates (
     lang TEXT PRIMARY KEY,
     manifest TEXT NOT NULL,
     body TEXT NOT NULL,
     bundled_version TEXT NOT NULL,
     installed_at INTEGER NOT NULL
   );
   CREATE TABLE IF NOT EXISTS kb_checks (
     lang TEXT PRIMARY KEY,
     checked_at INTEGER NOT NULL
   );`,
];

export async function migrateKbStore(db: HistoryDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  for (let version = row?.user_version ?? 0; version < MIGRATIONS.length; version++) {
    await db.execAsync(MIGRATIONS[version] as string);
    await db.execAsync(`PRAGMA user_version = ${version + 1}`);
  }
}

interface StoredUpdate {
  manifest: string;
  body: string;
  bundled_version: string;
}

/**
 * Installs the stored update for `language`, if there is one and it still verifies. An update is
 * dropped when the app has since shipped a different bundled KB (a store release carries its own
 * snapshot, which may be newer) or when it no longer verifies for this app version.
 * Returns the version now in use.
 */
export async function applyStoredKbUpdate(
  language: SupportedLanguage,
  config: KbUpdateConfig,
  db: HistoryDatabase,
): Promise<string> {
  const row = await db.getFirstAsync<StoredUpdate>(
    'SELECT manifest, body, bundled_version FROM kb_updates WHERE lang = ?',
    language,
  );
  if (!row) return getKbVersion(language);
  const result =
    row.bundled_version === getBundledKbVersion(language)
      ? verifyKbDownload({
          manifest: JSON.parse(row.manifest),
          body: row.body,
          publicKeyBase64: config.publicKeyBase64,
          appVersion: config.appVersion,
          language,
        })
      : null;
  if (!result?.ok) {
    await db.runAsync('DELETE FROM kb_updates WHERE lang = ?', language);
    return getKbVersion(language);
  }
  installKbUpdate(result.bundle);
  return result.bundle.version;
}

export type CheckOutcome =
  | 'not_due'
  | 'up_to_date'
  | 'stored'
  | { rejected: string }
  | { failed: string };

/**
 * One check against the Worker. `activeVersion` is the KB the app is answering from now; a served
 * KB with the same version needs no download.
 */
export async function checkForKbUpdate(
  language: SupportedLanguage,
  activeVersion: string,
  config: KbUpdateConfig,
  deps: KbUpdateDeps,
): Promise<CheckOutcome> {
  const { db, now } = deps;
  const last = await db.getFirstAsync<{ checked_at: number }>(
    'SELECT checked_at FROM kb_checks WHERE lang = ?',
    language,
  );
  if (last && now() - last.checked_at < CHECK_INTERVAL_MS) return 'not_due';

  try {
    const base = config.apiUrl.replace(/\/+$/, '');
    const manifestRes = await fetchWithTimeout(
      deps.fetch,
      `${base}/v1/kb/manifest?lang=${language}`,
    );
    if (!manifestRes.ok) return { failed: `manifest HTTP ${manifestRes.status}` };
    const manifest = (await manifestRes.json()) as { version?: unknown; url?: unknown };

    await db.runAsync(
      'INSERT OR REPLACE INTO kb_checks (lang, checked_at) VALUES (?, ?)',
      language,
      now(),
    );
    if (manifest.version === activeVersion) return 'up_to_date';
    if (typeof manifest.url !== 'string' || !manifest.url.startsWith('/')) {
      return { rejected: 'manifest url is not a path on this server' };
    }

    const bodyRes = await fetchWithTimeout(deps.fetch, `${base}${manifest.url}`);
    if (!bodyRes.ok) return { failed: `KB HTTP ${bodyRes.status}` };
    const body = await bodyRes.text();

    const result = verifyKbDownload({
      manifest,
      body,
      publicKeyBase64: config.publicKeyBase64,
      appVersion: config.appVersion,
      language,
    });
    if (!result.ok) return { rejected: result.reason };

    await db.runAsync(
      `INSERT OR REPLACE INTO kb_updates (lang, manifest, body, bundled_version, installed_at)
       VALUES (?, ?, ?, ?, ?)`,
      language,
      JSON.stringify(manifest),
      body,
      getBundledKbVersion(language),
      now(),
    );
    return 'stored';
  } catch (error) {
    return { failed: error instanceof Error ? error.message : 'unknown error' };
  }
}

async function fetchWithTimeout(fetchFn: typeof fetch, url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetchFn(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
