import { z } from 'zod';
import { SpeciesSchema } from './species.js';
import { VerdictPayloadSchema } from './verdict.js';

export const ResolvedBySchema = z.enum(['kb_exact', 'barcode', 'cache', 'model', 'model_fallback']);
export type ResolvedBy = z.infer<typeof ResolvedBySchema>;

export const ImageInputSchema = z.object({
  data: z.string().min(1), // base64 JPEG, ≤400 KB, longest edge ≤1024px (enforced server + client side)
  hash: z.string().min(1), // blake3 of the raw bytes
});
export type ImageInput = z.infer<typeof ImageInputSchema>;

export const BarcodeSchema = z.object({
  format: z.string().min(1),
  value: z.string().min(1),
});
export type Barcode = z.infer<typeof BarcodeSchema>;

export const CategoryHintSchema = z.enum(['plant', 'packaged', 'prepared', 'chemical', 'unknown']);
export type CategoryHint = z.infer<typeof CategoryHintSchema>;

export const IdentifyRequestSchema = z
  .object({
    species: SpeciesSchema,
    text: z.string().trim().max(500).nullable(),
    images: z.array(ImageInputSchema).max(4),
    barcode: BarcodeSchema.nullable(),
    locale: z.string().min(2),
    hints: z.object({ category: CategoryHintSchema }).partial().optional(),
  })
  .superRefine((req, ctx) => {
    // docs/03: at least one of text, images, barcode must be present.
    const hasText = req.text !== null && req.text.length > 0;
    const hasImages = req.images.length > 0;
    const hasBarcode = req.barcode !== null;
    if (!hasText && !hasImages && !hasBarcode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'at least one of text, images, or barcode is required',
      });
    }
  });
export type IdentifyRequest = z.infer<typeof IdentifyRequestSchema>;

export const ConfidenceBandSchema = z.enum(['high', 'medium', 'low']);
export type ConfidenceBand = z.infer<typeof ConfidenceBandSchema>;

export const CandidateSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kbId: z.string().min(1).nullable(),
  confidence: z.number().min(0).max(1),
  confidenceBand: ConfidenceBandSchema,
  detectedIngredients: z.array(z.string()).optional(),
  imageIndex: z.number().int().nonnegative().optional(),
});
export type Candidate = z.infer<typeof CandidateSchema>;

export const AlternateSchema = z.object({
  kbId: z.string().min(1),
  label: z.string().min(1),
});
export type Alternate = z.infer<typeof AlternateSchema>;

export const ImageQualitySchema = z.object({
  usable: z.boolean(),
  reason: z.string().nullable(),
});
export type ImageQuality = z.infer<typeof ImageQualitySchema>;

export const IdentifyMetaSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  cached: z.boolean(),
  latencyMs: z.number().nonnegative(),
});
export type IdentifyMeta = z.infer<typeof IdentifyMetaSchema>;

export const IdentifyResponseSchema = z
  .object({
    requestId: z.string().min(1),
    resolvedBy: ResolvedBySchema,
    needsConfirmation: z.boolean(),
    candidates: z.array(CandidateSchema),
    alternates: z.array(AlternateSchema),
    verdict: VerdictPayloadSchema.nullable(),
    imageQuality: ImageQualitySchema,
    meta: IdentifyMetaSchema,
  })
  .superRefine((res, ctx) => {
    // Invariant 3 (docs/03 §VerdictPayload): resolvedBy === "model_fallback" ⇒
    // verdict ∈ {caution, unknown}. Never "safe". This is the invariant AGENTS.md #1
    // exists to protect — enforce it in the schema, not just in code review.
    if (res.resolvedBy === 'model_fallback' && res.verdict !== null) {
      if (res.verdict.verdict !== 'caution' && res.verdict.verdict !== 'unknown') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'resolvedBy "model_fallback" must never carry a "safe" or "toxic" verdict',
          path: ['verdict', 'verdict'],
        });
      }
    }
    // needsConfirmation is false only for kb_exact/barcode single high-confidence matches
    // (docs/03 note under IdentifyResponse); anything model-derived must confirm first.
    if (!res.needsConfirmation && res.resolvedBy !== 'kb_exact' && res.resolvedBy !== 'barcode') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'needsConfirmation may only be false for resolvedBy "kb_exact" or "barcode"',
        path: ['needsConfirmation'],
      });
    }
  });
export type IdentifyResponse = z.infer<typeof IdentifyResponseSchema>;
