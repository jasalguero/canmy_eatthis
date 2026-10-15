import type { IdentifyRequest, Species } from '@canmyeatthis/shared';

import type { SupportedLanguage } from '@/i18n/namespaces';
import { type IdentifyOutcome, identify } from '@/lib/identifyClient';

/**
 * One photo check, from the draft's processed photos to an `IdentifyOutcome`. Everything with a
 * side effect is passed in, so the whole path runs in tests without a camera or a network
 * (`photoCheck.test.ts`).
 */
export interface PhotoCheckDeps {
  apiUrl: string | null;
  deviceId: () => string;
  encode: (uri: string) => Promise<{ data: string; hash: string } | null>;
  fetch: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export async function runPhotoCheck(
  input: {
    photos: readonly string[];
    description: string;
    species: Species;
    language: SupportedLanguage;
    signal?: AbortSignal;
  },
  deps: PhotoCheckDeps,
): Promise<IdentifyOutcome> {
  // A build without a Worker URL has nowhere to send the photo. That is the server being
  // unavailable from the person's point of view, and it has a designed screen.
  if (!deps.apiUrl) return { kind: 'error', code: 'PROVIDER_UNAVAILABLE' };

  const images: IdentifyRequest['images'] = [];
  for (const uri of input.photos.slice(0, 4)) {
    const encoded = await deps.encode(uri).catch(() => null);
    if (!encoded) return { kind: 'error', code: 'IMAGE_UNUSABLE' };
    images.push(encoded);
  }

  const text = input.description.trim().slice(0, 500);
  return identify({
    apiUrl: deps.apiUrl,
    deviceId: deps.deviceId(),
    request: {
      species: input.species,
      text: text.length > 0 ? text : null,
      images,
      barcode: null,
      // Language only (AGENTS.md #12): the Worker picks the KB language from it, never a region.
      locale: input.language,
    },
    fetch: deps.fetch,
    signal: input.signal,
    sleep: deps.sleep,
  });
}
