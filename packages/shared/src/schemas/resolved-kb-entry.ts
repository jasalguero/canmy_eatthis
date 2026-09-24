import { z } from 'zod';
import { SeveritySchema, SourceSchema, VerdictSchema } from './verdict.js';

/**
 * The shape of one entry inside a `kb.<lang>.json` build artefact (`packages/kb/src/build.ts`,
 * `projectLanguage`) — i.e. what a device or the Worker actually loads at runtime, already
 * resolved to one language. This is deliberately a separate type from the YAML authoring schema
 * in `packages/kb/schema/entry.ts`: `packages/kb` depends on `packages/shared` (for
 * `normalise()`), so `shared` cannot import KB authoring types without a cycle. `resolveVerdict`
 * below only needs this runtime shape.
 */
const ResolvedSpeciesEntrySchema = z.object({
  verdict: VerdictSchema,
  severity: SeveritySchema.nullable(),
  headline: z.string().min(1),
  summary: z.string().min(1),
  signs: z.array(z.string().min(1)),
  onset_hours: z
    .object({ min: z.number().nonnegative(), max: z.number().nonnegative() })
    .nullable(),
  emergency_actions: z.array(z.string().min(1)),
});

export const ResolvedKbEntrySchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  species: z.object({
    dog: ResolvedSpeciesEntrySchema,
    cat: ResolvedSpeciesEntrySchema,
  }),
  sources: z.array(SourceSchema.extend({ accessed: z.string().optional() })),
});
export type ResolvedKbEntry = z.infer<typeof ResolvedKbEntrySchema>;

/**
 * The same artefact entry with the metadata fields `kb.<lang>.json` also carries
 * (`packages/kb/src/build.ts` `projectLanguage`). The Worker needs them — `confusableWith` for the
 * confirm screen's `alternates`, `highRisk` for model escalation — while `resolveVerdict` and the
 * app's mock entries do not, so they extend the base shape rather than widening it.
 */
export const ResolvedKbEntryWithMetaSchema = ResolvedKbEntrySchema.extend({
  category: z.string().min(1),
  confusableWith: z.array(z.string().min(1)),
  isIngredient: z.boolean(),
  highRisk: z.boolean(),
});
export type ResolvedKbEntryWithMeta = z.infer<typeof ResolvedKbEntryWithMetaSchema>;
