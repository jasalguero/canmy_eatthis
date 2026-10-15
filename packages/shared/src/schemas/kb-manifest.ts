import { z } from 'zod';
import { ResolvedKbEntryWithMetaSchema } from './resolved-kb-entry.js';

/**
 * `GET /v1/kb/manifest?lang=` (docs/03). One manifest per KB language, because the app only
 * ever loads the KB for its current language and `sha256`/`sizeBytes` describe those exact
 * bytes.
 *
 * `signature` is an Ed25519 signature (base64) over those same bytes, made by the Worker with its
 * `KB_SIGNING_KEY` secret (docs/02 D38). It is `null` when the Worker has no key, and the app
 * never installs an unsigned KB.
 */
export const KbManifestSchema = z.object({
  version: z.string().min(1),
  lang: z.enum(['en', 'es']),
  entryCount: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  sizeBytes: z.number().int().positive(),
  minAppVersion: z.string().min(1),
  url: z.string().min(1),
  signature: z.string().min(1).nullable(),
});
export type KbManifest = z.infer<typeof KbManifestSchema>;

/**
 * `GET /v1/kb/:lang`: one language's entries plus the alias index. An update needs both to
 * answer a new or renamed item; new entries under the old index would never be found, and an old
 * index could point at ids the new entries no longer have.
 */
export const KbBundleSchema = z.object({
  version: z.string().min(1),
  lang: z.enum(['en', 'es']),
  entries: z.array(ResolvedKbEntryWithMetaSchema).min(1),
  index: z.record(z.string(), z.string()),
});
export type KbBundle = z.infer<typeof KbBundleSchema>;
