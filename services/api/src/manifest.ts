import type { KbManifest } from '@canmyeatthis/shared';
import { toHex } from './images.js';
import { type Language, getAliasIndex, getEntryCount, getKbVersion, getRawArtifact } from './kb.js';

interface Served {
  body: string;
  manifest: KbManifest;
}

const served = new Map<string, Promise<Served>>();

/**
 * The exact bytes `GET /v1/kb/:lang` serves (one language's entries plus the alias index, the
 * shared `KbBundle` shape), and the manifest describing them. Built once per isolate and key: the
 * KB is bundled into the Worker, so it cannot change without a deploy. `sha256`, `sizeBytes` and
 * `signature` are all computed over the served string itself, so they describe what a client
 * actually downloads.
 *
 * `signingKey` is the `KB_SIGNING_KEY` secret: a base64 PKCS#8 Ed25519 private key
 * (`pnpm --filter @canmyeatthis/api run kb:keygen`). Without it the manifest says
 * `signature: null`, and the app installs nothing (docs/02 D38).
 */
export function getServedKb(
  language: Language,
  minAppVersion: string,
  signingKey?: string,
): Promise<Served> {
  const cacheKey = `${language}|${minAppVersion}|${signingKey ?? ''}`;
  const existing = served.get(cacheKey);
  if (existing) return existing;
  const built = (async () => {
    const raw = getRawArtifact(language);
    const body = JSON.stringify({
      version: raw.version,
      lang: raw.lang,
      entries: raw.entries,
      index: getAliasIndex(),
    });
    const bytes = new TextEncoder().encode(body);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return {
      body,
      manifest: {
        version: getKbVersion(language),
        lang: language,
        entryCount: getEntryCount(language),
        sha256: toHex(new Uint8Array(digest)),
        sizeBytes: bytes.length,
        minAppVersion,
        url: `/v1/kb/${language}`,
        signature: signingKey ? await sign(bytes, signingKey) : null,
      },
    };
  })();
  built.catch(() => served.delete(cacheKey));
  served.set(cacheKey, built);
  return built;
}

async function sign(bytes: Uint8Array, pkcs8Base64: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    Uint8Array.from(atob(pkcs8Base64.trim()), (c) => c.charCodeAt(0)),
    { name: 'Ed25519' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, key, bytes));
  return btoa(String.fromCharCode(...signature));
}
