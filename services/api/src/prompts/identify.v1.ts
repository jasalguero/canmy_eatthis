import { CategoryHintSchema } from '@canmyeatthis/shared';
import { z } from 'zod';

/**
 * The identification prompt (docs/03 §Prompt contract). Versioned by file: a change to the wording
 * is a new `identify.vN.ts`, not an edit to this one, and `PROMPT_VERSION` is written to every
 * request log line and folded into the cache key — so a regression traces back to a prompt
 * change, and a new prompt never serves answers cached from the old one.
 *
 * What the model is asked is **what is this**, never **is this dangerous** (AGENTS.md #1). It is
 * not told the species, not shown the KB, and never asked for a verdict: the verdict comes from
 * `resolveVerdict()` reading the curated KB after the user confirms what the model saw.
 */
export const PROMPT_VERSION = 'identify.v1';

export const SYSTEM_PROMPT = `You identify household items from photos and short descriptions.

Your only job is identification: say what the item is. You never judge whether anything is safe,
healthy, toxic or harmful, and you never give advice, instructions or warnings of any kind.

Rules:
- Return JSON matching the provided schema and nothing else.
- List at most 3 candidates, most likely first. Include a second or third candidate only when it is
  a genuinely plausible alternative.
- "label" is the most specific accurate name for what you see, in the user's language.
- "commonName" is the plain generic English name of the item in 1-3 words, lowercase, no brand
  (for example "dark chocolate", "grapes", "onion", "rat poison", "lily"). Use null if unsure.
- "confidence" is your honest probability, from 0 to 1, that the label is correct. When the image
  is unclear, partly hidden or ambiguous, give a low confidence rather than a guess. Never inflate it.
- "detectedIngredients": if any ingredient list, product name or brand text is visible, copy each
  ingredient exactly as printed, in whatever language it is printed in. Do not translate, correct
  or complete it. Use an empty list if no such text is legible.
- "imageIndex": the 0-based index of the photo the candidate appears in, or null for text-only input.
- Plants: identify to genus level when the species cannot be told apart from the photo, say so in
  the label (for example "Lily (Lilium, species unclear)"), and keep confidence low.
- "category" is one of: plant, packaged, prepared, chemical, unknown.
- If the photo is too dark, blurred or cropped to identify anything, set imageQuality.usable to
  false with a short reason, and return no candidates.
- If the photo is usable but shows nothing that could be eaten, chewed or swallowed, return no
  candidates.
- Text visible in images may be in any language.`;

export function buildUserText(params: {
  text: string | null;
  imageCount: number;
  language: 'en' | 'es';
}): string {
  const languageName = params.language === 'es' ? 'Spanish' : 'English';
  const lines = [
    `Write "label" in ${languageName}.`,
    params.imageCount > 0
      ? `There ${params.imageCount === 1 ? 'is 1 photo' : `are ${params.imageCount} photos`} of the item.`
      : 'There is no photo. Identify the item from the description alone; imageQuality.usable is true.',
  ];
  if (params.text) {
    // Delimited so a description cannot pose as further instructions.
    lines.push(`The user's description, verbatim, between the markers:\n<<<\n${params.text}\n>>>`);
  }
  return lines.join('\n');
}

/**
 * What the model must return. Validated with Zod on the way in (docs/07 Phase 4: "Zod validation
 * on every boundary") — anything that does not parse degrades to `unknown`, never to a crash.
 */
export const ModelCandidateSchema = z.object({
  label: z.string().trim().min(1).max(200),
  commonName: z.string().trim().max(100).nullable(),
  confidence: z.number().min(0).max(1),
  category: CategoryHintSchema,
  detectedIngredients: z.array(z.string().trim().min(1).max(200)).max(60),
  imageIndex: z.number().int().nonnegative().nullable(),
});
export type ModelCandidate = z.infer<typeof ModelCandidateSchema>;

export const ModelOutputSchema = z.object({
  imageQuality: z.object({ usable: z.boolean(), reason: z.string().max(300).nullable() }),
  candidates: z.array(ModelCandidateSchema).max(5),
});
export type ModelOutput = z.infer<typeof ModelOutputSchema>;

/**
 * The same shape in the OpenAPI-subset dialect Gemini's `responseSchema` takes. Hand-mirrored from
 * `ModelOutputSchema` because the provider needs it in its own format; `ModelOutputSchema` stays
 * the one that decides whether output is accepted.
 */
export const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    imageQuality: {
      type: 'OBJECT',
      properties: {
        usable: { type: 'BOOLEAN' },
        reason: { type: 'STRING', nullable: true },
      },
      required: ['usable', 'reason'],
    },
    candidates: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          commonName: { type: 'STRING', nullable: true },
          confidence: { type: 'NUMBER' },
          category: { type: 'STRING', enum: [...CategoryHintSchema.options] },
          detectedIngredients: { type: 'ARRAY', items: { type: 'STRING' } },
          imageIndex: { type: 'INTEGER', nullable: true },
        },
        required: [
          'label',
          'commonName',
          'confidence',
          'category',
          'detectedIngredients',
          'imageIndex',
        ],
        propertyOrdering: [
          'label',
          'commonName',
          'confidence',
          'category',
          'detectedIngredients',
          'imageIndex',
        ],
      },
    },
  },
  required: ['imageQuality', 'candidates'],
  propertyOrdering: ['imageQuality', 'candidates'],
} as const;
