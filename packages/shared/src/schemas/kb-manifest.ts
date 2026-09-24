import { z } from 'zod';

/**
 * `GET /v1/kb/manifest?lang=` (docs/03). One manifest per KB language, because the app only
 * ever loads the artefact for its current language and `sha256`/`sizeBytes` describe those exact
 * bytes. Signature verification and the on-device swap are Phase 8 (docs/02 D21) — this is only
 * the description of what the Worker is currently serving.
 */
export const KbManifestSchema = z.object({
  version: z.string().min(1),
  lang: z.enum(['en', 'es']),
  entryCount: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  sizeBytes: z.number().int().positive(),
  minAppVersion: z.string().min(1),
  url: z.string().min(1),
});
export type KbManifest = z.infer<typeof KbManifestSchema>;
