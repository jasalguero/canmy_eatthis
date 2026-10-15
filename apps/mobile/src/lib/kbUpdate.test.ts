import { generateKeyPairSync, sign } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

import kbEn from '../../assets/kb/kb.en.json';
import kbEs from '../../assets/kb/kb.es.json';
import kbIndex from '../../assets/kb/kb.index.json';
import type { HistoryDatabase, SqlParam } from './history';
import {
  CHECK_INTERVAL_MS,
  applyStoredKbUpdate,
  checkForKbUpdate,
  migrateKbStore,
} from './kbUpdate';
import { compareVersions, verifyKbDownload } from './kbVerify';
import {
  clearKbUpdate,
  getBundledKbVersion,
  getKbEntry,
  getKbVersion,
  installKbUpdate,
  resolveOffline,
  setActiveKbLanguage,
} from './offlineKb';
import { buildRealVerdict } from './verdict';

/**
 * docs/02 D38. A KB is signed here exactly as the Worker signs it (Ed25519 over the served bytes,
 * `services/api/src/manifest.ts`) and checked by the code the app runs.
 */

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const PUBLIC_KEY = Buffer.from(publicKey.export({ format: 'jwk' }).x ?? '', 'base64url').toString(
  'base64',
);
const other = generateKeyPairSync('ed25519');

type Artifact = { version: string; lang: 'en' | 'es'; entries: Array<Record<string, unknown>> };
const INDEX = (kbIndex as { index: Record<string, string> }).index;

/** A served KB: by default the bundled one under a new version, so it is "different". */
function served(
  options: {
    lang?: 'en' | 'es';
    version?: string;
    edit?: (bundle: {
      entries: Array<Record<string, unknown>>;
      index: Record<string, string>;
    }) => void;
    key?: typeof privateKey | null;
    minAppVersion?: string;
  } = {},
) {
  const lang = options.lang ?? 'en';
  const artifact = structuredClone((lang === 'en' ? kbEn : kbEs) as Artifact);
  const bundle = {
    version: options.version ?? 'update-1',
    lang,
    entries: artifact.entries,
    index: { ...INDEX },
  };
  options.edit?.(bundle);
  const body = JSON.stringify(bundle);
  const bytes = utf8ToBytes(body);
  const key = options.key === undefined ? privateKey : options.key;
  const manifest = {
    version: bundle.version,
    lang,
    entryCount: bundle.entries.length,
    sha256: bytesToHex(sha256(bytes)),
    sizeBytes: bytes.length,
    minAppVersion: options.minAppVersion ?? '1.0.0',
    url: `/v1/kb/${lang}`,
    signature: key ? sign(null, Buffer.from(bytes), key).toString('base64') : null,
  };
  return { manifest, body };
}

function check(s: ReturnType<typeof served>, language: 'en' | 'es' = 'en') {
  return verifyKbDownload({
    ...s,
    publicKeyBase64: PUBLIC_KEY,
    appVersion: '1.1.0',
    language,
  });
}

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

function fakeServer(s: ReturnType<typeof served>) {
  return jest.fn(async (url: string) => {
    if (url.endsWith(`/v1/kb/manifest?lang=${s.manifest.lang}`)) {
      return new Response(JSON.stringify(s.manifest), { status: 200 });
    }
    if (url.endsWith(s.manifest.url)) return new Response(s.body, { status: 200 });
    return new Response('', { status: 404 });
  }) as unknown as typeof fetch;
}

const CONFIG = { apiUrl: 'https://api.example', publicKeyBase64: PUBLIC_KEY, appVersion: '1.1.0' };

afterEach(() => {
  clearKbUpdate();
});

describe('verifying a downloaded KB', () => {
  it('accepts a signed, intact KB', () => {
    const result = check(served());
    expect(result.ok).toBe(true);
  });

  it.each([
    ['unsigned', () => served({ key: null })],
    ['signed with another key', () => served({ key: other.privateKey })],
    ['for a newer app', () => served({ minAppVersion: '9.0.0' })],
  ])('refuses one that is %s', (_, make) => {
    expect(check(make()).ok).toBe(false);
  });

  it('refuses bytes changed after signing', () => {
    const s = served();
    const tampered = s.body.replace('"toxic"', '"safe"');
    expect(check({ ...s, body: tampered })).toMatchObject({ ok: false });
  });

  it('refuses one for the other language', () => {
    expect(check(served({ lang: 'es' }), 'en')).toMatchObject({
      ok: false,
      reason: 'wrong language',
    });
  });

  it('refuses an index that points at a missing entry', () => {
    const s = served({
      edit: (b) => {
        b.index.ghost = 'no_such_entry';
      },
    });
    expect(check(s)).toMatchObject({ ok: false, reason: 'index points at a missing entry' });
  });

  it('refuses a toxic row with no emergency actions, even when signed', () => {
    const s = served({
      edit: (b) => {
        const entry = b.entries.find((e) => e.id === 'grapes_raisins') as {
          species: { dog: { emergency_actions: string[] } };
        };
        entry.species.dog.emergency_actions = [];
      },
    });
    expect(check(s)).toMatchObject({ ok: false, reason: 'an entry breaks a verdict invariant' });
  });

  it('refuses a sign this build has no words for', () => {
    const s = served({
      edit: (b) => {
        const entry = b.entries.find((e) => e.id === 'grapes_raisins') as {
          species: { dog: { signs: string[] } };
        };
        entry.species.dog.signs = ['brand_new_sign'];
      },
    });
    expect(check(s)).toMatchObject({ ok: false });
  });

  it('compares app versions numerically', () => {
    expect(compareVersions('1.10.0', '1.9.2')).toBeGreaterThan(0);
    expect(compareVersions('1.1', '1.1.0')).toBe(0);
  });
});

describe('answering from an installed update', () => {
  const withNewEntry = () =>
    served({
      edit: (b) => {
        const grapes = b.entries.find((e) => e.id === 'grapes_raisins');
        b.entries.push({
          ...structuredClone(grapes),
          id: 'test_new_item',
          displayName: 'Testfruit',
        });
        b.index.testfruit = 'test_new_item';
      },
    });

  it('finds a new entry through the new index, in its language only', () => {
    const result = check(withNewEntry());
    if (!result.ok) throw new Error(result.reason);
    installKbUpdate(result.bundle);

    setActiveKbLanguage('en');
    expect(resolveOffline('testfruit')).toEqual({ type: 'exact', kbId: 'test_new_item' });
    expect(getKbVersion('en')).toBe('update-1');
    expect(
      buildRealVerdict({ kbId: 'test_new_item', species: 'dog', language: 'en', disclaimer: 'x' })
        .verdict,
    ).toBe('toxic');

    // In Spanish the app is back on the bundled KB, entries and index together.
    setActiveKbLanguage('es');
    expect(resolveOffline('testfruit').type).not.toBe('exact');
    expect(getKbEntry('test_new_item', 'en')).toBeUndefined();
    expect(getKbVersion('es')).toBe(getBundledKbVersion('es'));
  });
});

describe('checking for and storing an update', () => {
  async function store() {
    const db = memoryDb();
    await migrateKbStore(db);
    return db;
  }

  it('stores a verified update and installs it at the next launch', async () => {
    const db = await store();
    const s = served();
    const outcome = await checkForKbUpdate('en', getBundledKbVersion('en'), CONFIG, {
      db,
      fetch: fakeServer(s),
      now: () => 1_000,
    });
    expect(outcome).toBe('stored');
    expect(getKbVersion('en')).toBe(getBundledKbVersion('en'));

    setActiveKbLanguage('en');
    expect(await applyStoredKbUpdate('en', CONFIG, db)).toBe('update-1');
    expect(getKbVersion('en')).toBe('update-1');
  });

  it('downloads nothing when the served KB is the one in use', async () => {
    const db = await store();
    const s = served({ version: getBundledKbVersion('en') });
    const fetchFn = fakeServer(s);
    expect(
      await checkForKbUpdate('en', getBundledKbVersion('en'), CONFIG, {
        db,
        fetch: fetchFn,
        now: () => 1,
      }),
    ).toBe('up_to_date');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('asks at most once a day', async () => {
    const db = await store();
    const fetchFn = fakeServer(served({ version: getBundledKbVersion('en') }));
    const deps = (now: number) => ({ db, fetch: fetchFn, now: () => now });
    await checkForKbUpdate('en', getBundledKbVersion('en'), CONFIG, deps(0));
    expect(await checkForKbUpdate('en', 'x', CONFIG, deps(CHECK_INTERVAL_MS - 1))).toBe('not_due');
    expect(
      await checkForKbUpdate('en', getBundledKbVersion('en'), CONFIG, deps(CHECK_INTERVAL_MS)),
    ).toBe('up_to_date');
  });

  it('keeps the current KB when the download is rejected or the network is down', async () => {
    const db = await store();
    const rejected = await checkForKbUpdate('en', 'v', CONFIG, {
      db,
      fetch: fakeServer(served({ key: other.privateKey })),
      now: () => 1,
    });
    expect(rejected).toEqual({ rejected: 'bad signature' });

    const offline = await checkForKbUpdate('en', 'v', CONFIG, {
      db: await store(),
      fetch: (async () => {
        throw new Error('network is unreachable');
      }) as unknown as typeof fetch,
      now: () => 1,
    });
    expect(offline).toEqual({ failed: 'network is unreachable' });

    setActiveKbLanguage('en');
    expect(await applyStoredKbUpdate('en', CONFIG, db)).toBe(getBundledKbVersion('en'));
  });

  it('drops a stored update once the app ships a different bundled KB', async () => {
    const db = await store();
    const s = served();
    await db.runAsync(
      'INSERT INTO kb_updates (lang, manifest, body, bundled_version, installed_at) VALUES (?, ?, ?, ?, ?)',
      'en',
      JSON.stringify(s.manifest),
      s.body,
      'an-older-bundle',
      1,
    );
    setActiveKbLanguage('en');
    expect(await applyStoredKbUpdate('en', CONFIG, db)).toBe(getBundledKbVersion('en'));
    expect(await db.getFirstAsync('SELECT lang FROM kb_updates')).toBeNull();
  });
});
