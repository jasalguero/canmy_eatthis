import type { KbManifest } from '@canmyeatthis/shared';
import { toHex } from './images.js';
import { type Language, getEntryCount, getKbVersion, getRawArtifact } from './kb.js';

interface Served {
  body: string;
  manifest: KbManifest;
}

const served: Partial<Record<Language, Promise<Served>>> = {};

/**
 * The exact bytes `GET /v1/kb/:lang` serves, and the manifest describing them. Built once per
 * isolate: the artefact is bundled into the Worker, so it cannot change without a deploy.
 * `sha256`/`sizeBytes` are computed over the served string itself, so they always describe what a
 * client actually downloads.
 */
export function getServedKb(language: Language, minAppVersion: string): Promise<Served> {
  const existing = served[language];
  if (existing) return existing;
  const built = (async () => {
    const body = JSON.stringify(getRawArtifact(language));
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
      },
    };
  })();
  served[language] = built;
  return built;
}
