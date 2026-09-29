import { z } from 'zod';
import { SpeciesSchema } from './species.js';

/**
 * `unknown` is non-negotiable (docs/00 verdict taxonomy): an identification
 * failure must never render green. Never remove it "for simplicity".
 */
export const VerdictSchema = z.enum(['safe', 'caution', 'toxic', 'unknown']);
export type Verdict = z.infer<typeof VerdictSchema>;

export const SeveritySchema = z.enum(['mild', 'moderate', 'severe']);
export type Severity = z.infer<typeof SeveritySchema>;

export const SourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});
export type Source = z.infer<typeof SourceSchema>;

/**
 * Deviation from the original docs/03-api-contract.md — see docs/02-tech-decisions.md D16.
 *
 * Left out because the features are out of scope (docs/00-product-spec.md §6, AGENTS.md #16):
 *   - `mechanism`            — no per-entry mechanism prose, link to the source instead
 *   - `riskBand` / `riskBandExplanation` — no weight×amount risk banding
 *   - request `context` (petWeightKg, amount) — nothing left to compute a risk band from
 *
 * Kept:
 *   - `onsetHours` — a sourced fact ("signs typically appear within N–M hours"), not a
 *     judgement call, so it meets the editorial standard in docs/04-knowledge-base.md §2.
 *   - `signs` / `emergencyActions` are arrays of controlled-vocabulary ids (AGENTS.md #13),
 *     never per-entry prose. The vocabulary itself is authored in Phase 1 (packages/kb).
 *     `emergencyActions` for a shipped `toxic` entry is always the same universal-set ids
 *     (docs/04-knowledge-base.md §2) — the schema does not special-case that, the KB content does.
 */
export const VerdictPayloadSchema = z
  .object({
    kbId: z.string().min(1),
    displayName: z.string().min(1),
    species: SpeciesSchema,
    verdict: VerdictSchema,
    severity: SeveritySchema.nullable(),
    headline: z.string().min(1),
    summary: z.string().min(1),
    signs: z.array(z.string().min(1)),
    onsetHours: z
      .object({ min: z.number().nonnegative(), max: z.number().nonnegative() })
      .nullable(),
    emergencyActions: z.array(z.string().min(1)),
    sources: z.array(SourceSchema),
    kbVersion: z.string().min(1),
    disclaimer: z.string().min(1),
  })
  .superRefine((payload, ctx) => {
    // Invariant 1 (docs/03 §VerdictPayload, carried over): toxic ⇒ severity set and
    // emergencyActions non-empty.
    if (payload.verdict === 'toxic') {
      if (payload.severity === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'verdict "toxic" requires a non-null severity',
          path: ['severity'],
        });
      }
      if (payload.emergencyActions.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'verdict "toxic" requires at least one emergencyActions entry',
          path: ['emergencyActions'],
        });
      }
    } else if (payload.severity !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'severity must be null unless verdict is "toxic"',
        path: ['severity'],
      });
    }

    // Invariant 2: unknown ⇒ headline never contains the substring "safe" (case-insensitive,
    // and the word must never appear as a bare claim anywhere — AGENTS.md #3).
    if (payload.verdict === 'unknown' && /safe/i.test(payload.headline)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'verdict "unknown" must never say "safe" in the headline',
        path: ['headline'],
      });
    }

    // Invariant 5: every toxic/caution payload cites at least one source.
    if (
      (payload.verdict === 'toxic' || payload.verdict === 'caution') &&
      payload.sources.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'verdict "toxic" or "caution" requires at least one source',
        path: ['sources'],
      });
    }
  });
export type VerdictPayload = z.infer<typeof VerdictPayloadSchema>;

/**
 * `POST /v1/verdict` request. No `context` (no weight/amount — see module doc).
 * Pure function of (kbId, species); identical result whether computed on-device or server-side.
 */
export const VerdictRequestSchema = z.object({
  kbId: z.string().min(1),
  species: SpeciesSchema,
  // BCP 47, same as `IdentifyRequest.locale`. Picks the KB language only (AGENTS.md #12 —
  // never the region). Optional so an older client still gets an English verdict, not a 400.
  locale: z.string().min(2).optional(),
});
export type VerdictRequest = z.infer<typeof VerdictRequestSchema>;
