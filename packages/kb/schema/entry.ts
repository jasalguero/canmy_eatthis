import { z } from 'zod';
import { EmergencyActionIdSchema, SignIdSchema } from './vocab.js';

/**
 * Per-entry Zod validator matching `docs/04-knowledge-base.md` §1, with the hobby-build cuts
 * from `docs/10-hobby-scope.md` §4 / AGENTS.md #16 already applied:
 *   - no `mechanism` prose
 *   - no `dose_bands` / `concentration` (no risk banding at all)
 *   - no `emergency_actions_extra` (universal set only, no entry-specific instructions)
 *   - no vet `reviewed_by` requirement — there is no vet. `review.status` instead reflects the
 *     editorial standard in docs/10 §4 (≥2 independent sources, careful sourcing), self-applied
 *     and recorded, not a licensed sign-off. See docs/02-tech-decisions.md D17.
 *
 * This validates a single entry in isolation. Cross-entry rules (global alias uniqueness,
 * `confusable_with` resolution, the alias/display_name substring check, and vocabulary ids
 * existing in every shipped language) need the whole KB and live in `src/build.ts`.
 */

export const CategorySchema = z.enum([
  'food',
  'plant',
  'medication',
  'chemical',
  'household',
  'other',
]);
export type Category = z.infer<typeof CategorySchema>;

export const ReviewStatusSchema = z.enum(['draft', 'needs_review', 'approved']);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const TranslationTierStatusSchema = z.enum(['missing', 'machine', 'draft', 'approved']);
export type TranslationTierStatus = z.infer<typeof TranslationTierStatusSchema>;

const LocalizedTextSchema = z.object({ en: z.string().min(1), es: z.string().min(1) });
const LocalizedListSchema = z.object({
  en: z.array(z.string().min(1)).min(1),
  es: z.array(z.string().min(1)).min(1),
});

export const SourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  accessed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'accessed must be an ISO date (YYYY-MM-DD)'),
});
export type EntrySource = z.infer<typeof SourceSchema>;

export const VerdictSchema = z.enum(['safe', 'caution', 'toxic', 'unknown']);
export const SeveritySchema = z.enum(['mild', 'moderate', 'severe']);

const SpeciesEntrySchema = z
  .object({
    verdict: VerdictSchema,
    severity: SeveritySchema.nullable(),
    headline: LocalizedTextSchema,
    summary: LocalizedTextSchema,
    signs: z.array(SignIdSchema),
    onset_hours: z
      .object({ min: z.number().nonnegative(), max: z.number().nonnegative() })
      .nullable(),
    emergency_actions: z.array(EmergencyActionIdSchema),
  })
  .superRefine((species, ctx) => {
    // docs/04 §1 rule 2: verdict toxic ⇒ severity set and non-empty emergency_actions.
    if (species.verdict === 'toxic') {
      if (species.severity === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'verdict "toxic" requires a non-null severity',
          path: ['severity'],
        });
      }
      if (species.emergency_actions.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'verdict "toxic" requires at least one emergency_actions entry',
          path: ['emergency_actions'],
        });
      }
    } else if (species.severity !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'severity must be null unless verdict is "toxic"',
        path: ['severity'],
      });
    }
  });
export type SpeciesEntry = z.infer<typeof SpeciesEntrySchema>;

const TranslationEsSchema = z.object({
  tier_a: TranslationTierStatusSchema,
  tier_b: TranslationTierStatusSchema,
  translated_by: z.string().min(1),
  reviewed_by: z.string().min(1).nullable(),
  reviewed_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

const ReviewSchema = z.object({
  reviewed_by: z.string().min(1).nullable(),
  reviewed_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  status: ReviewStatusSchema,
});

export const KbEntrySchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z][a-z0-9_]*$/, 'id must be snake_case, starting with a lowercase letter'),
    display_name: LocalizedTextSchema,
    category: CategorySchema,
    aliases: LocalizedListSchema,
    confusable_with: z.array(z.string().min(1)),
    is_ingredient: z.boolean(),
    high_risk: z.boolean(),
    species: z.object({
      dog: SpeciesEntrySchema,
      cat: SpeciesEntrySchema,
    }),
    sources: z.array(SourceSchema),
    review: ReviewSchema,
    translations: z.object({ es: TranslationEsSchema }),
  })
  .superRefine((entry, ctx) => {
    // docs/04 §1 rule 3 (hobby editorial standard, docs/10 §4): toxic or caution in EITHER
    // species requires at least two independent sources with URLs.
    const needsSources =
      entry.species.dog.verdict === 'toxic' ||
      entry.species.dog.verdict === 'caution' ||
      entry.species.cat.verdict === 'toxic' ||
      entry.species.cat.verdict === 'caution';
    if (needsSources && entry.sources.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'a "toxic" or "caution" verdict requires at least two independent sources',
        path: ['sources'],
      });
    }
  });
export type KbEntry = z.infer<typeof KbEntrySchema>;
