/**
 * Gemini `generateContent` response bodies for the contract tests — CI makes zero live model
 * calls (docs/07 Phase 4). These follow the documented REST response shape (`candidates[].content
 * .parts[].text`, `finishReason`, `promptFeedback.blockReason`); they were authored to that shape,
 * not captured from a live call, because no API key was available when they were written.
 * `pnpm --filter @canmyeatthis/api run eval:live` (nightly, `.github/workflows/live-eval.yml`)
 * is what catches drift between these and the real provider.
 */
export function geminiBody(output: unknown, finishReason = 'STOP') {
  return {
    candidates: [
      {
        content: { role: 'model', parts: [{ text: JSON.stringify(output) }] },
        finishReason,
        index: 0,
      },
    ],
    usageMetadata: { promptTokenCount: 812, candidatesTokenCount: 96, totalTokenCount: 908 },
    modelVersion: 'gemini-2.5-flash-lite',
  };
}

export const DARK_CHOCOLATE_PHOTO = geminiBody({
  imageQuality: { usable: true, reason: null },
  candidates: [
    {
      label: 'Dark chocolate bar',
      commonName: 'dark chocolate',
      confidence: 0.91,
      category: 'packaged',
      detectedIngredients: ['cocoa mass', 'sugar', 'cocoa butter'],
      imageIndex: 0,
    },
    {
      label: 'Milk chocolate bar',
      commonName: 'milk chocolate',
      confidence: 0.06,
      category: 'packaged',
      detectedIngredients: [],
      imageIndex: 0,
    },
  ],
});

/** Low confidence — triggers escalation. */
export const BLURRY_BERRIES_PRIMARY = geminiBody({
  imageQuality: { usable: true, reason: null },
  candidates: [
    {
      label: 'Grapes',
      commonName: 'grapes',
      confidence: 0.55,
      category: 'prepared',
      detectedIngredients: [],
      imageIndex: 0,
    },
    {
      label: 'Blueberries',
      commonName: 'blueberries',
      confidence: 0.3,
      category: 'prepared',
      detectedIngredients: [],
      imageIndex: 0,
    },
  ],
});

export const BLURRY_BERRIES_ESCALATED = geminiBody({
  imageQuality: { usable: true, reason: null },
  candidates: [
    {
      label: 'Red grapes',
      commonName: 'grapes',
      confidence: 0.8,
      category: 'prepared',
      detectedIngredients: [],
      imageIndex: 0,
    },
  ],
});

export const LILY_PHOTO = geminiBody({
  imageQuality: { usable: true, reason: null },
  candidates: [
    {
      label: 'Lily (Lilium, species unclear)',
      commonName: 'lily',
      confidence: 0.95,
      category: 'plant',
      detectedIngredients: [],
      imageIndex: 0,
    },
  ],
});

export const COOKIE_WITH_RAISINS = geminiBody({
  imageQuality: { usable: true, reason: null },
  candidates: [
    {
      label: 'Oatmeal cookie',
      commonName: 'oatmeal cookie',
      confidence: 0.88,
      category: 'packaged',
      detectedIngredients: ['oat flakes', 'raisins', 'sugar'],
      imageIndex: 0,
    },
  ],
});

/** Identified fine, but nothing in the KB — renders `unknown`. */
export const UNKNOWN_ITEM = geminiBody({
  imageQuality: { usable: true, reason: null },
  candidates: [
    {
      label: 'Dragon fruit',
      commonName: 'dragon fruit',
      confidence: 0.9,
      category: 'prepared',
      detectedIngredients: [],
      imageIndex: 0,
    },
  ],
});

export const UNUSABLE_PHOTO = geminiBody({
  imageQuality: { usable: false, reason: 'too dark' },
  candidates: [],
});

export const NOTHING_EDIBLE = geminiBody({
  imageQuality: { usable: true, reason: null },
  candidates: [],
});

// --- Malformed output: every one of these must degrade to `unknown`, never crash. ---

export const TRUNCATED_JSON = {
  candidates: [
    {
      content: {
        role: 'model',
        parts: [
          {
            text: '{"imageQuality":{"usable":true,"reason":null},"candidates":[{"label":"Dark cho',
          },
        ],
      },
      finishReason: 'MAX_TOKENS',
    },
  ],
};

/** Truncated text but a STOP finish reason — the JSON parse is what has to catch it. */
export const TRUNCATED_JSON_STOP = {
  candidates: [
    {
      content: { role: 'model', parts: [{ text: '{"imageQuality":{"usable":true' }] },
      finishReason: 'STOP',
    },
  ],
};

export const WRONG_SCHEMA = geminiBody({
  item: 'Dark chocolate',
  toxic: false,
  verdict: 'safe',
});

export const CONFIDENCE_OUT_OF_RANGE = geminiBody({
  imageQuality: { usable: true, reason: null },
  candidates: [
    {
      label: 'Dark chocolate',
      commonName: 'dark chocolate',
      confidence: 7,
      category: 'packaged',
      detectedIngredients: [],
      imageIndex: 0,
    },
  ],
});

export const PROSE_NOT_JSON = {
  candidates: [
    {
      content: {
        role: 'model',
        parts: [{ text: 'This looks like dark chocolate, which is safe.' }],
      },
      finishReason: 'STOP',
    },
  ],
};

export const SAFETY_BLOCKED = { promptFeedback: { blockReason: 'SAFETY' } };

export const NO_CANDIDATES_ARRAY = { usageMetadata: { totalTokenCount: 10 } };
