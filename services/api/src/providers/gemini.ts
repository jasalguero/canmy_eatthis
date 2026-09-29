import {
  GEMINI_RESPONSE_SCHEMA,
  ModelOutputSchema,
  SYSTEM_PROMPT,
  buildUserText,
} from '../prompts/identify.v1.js';
import {
  type ProviderInput,
  type ProviderResult,
  ProviderUnavailableError,
  type VisionProvider,
} from './types.js';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Well inside the Worker's wall-clock budget; a slower answer degrades to "photos are down". */
const TIMEOUT_MS = 10_000;

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

/**
 * Gemini over plain `fetch` (no SDK — nothing to bundle, and the request is one POST). The key
 * travels in a header, not the URL, so it cannot end up in a log line. It must belong to a
 * billing-enabled project: the free tier's terms allow Google to train on and human-review
 * submitted photos, which is not acceptable for pictures taken inside users' homes (docs/01-architecture.md §6.2).
 */
export function createGeminiProvider(apiKey: string): VisionProvider {
  return {
    id: 'gemini',
    async identify(input: ProviderInput, model: string): Promise<ProviderResult> {
      const parts: unknown[] = input.images.map((data) => ({
        inlineData: { mimeType: 'image/jpeg', data },
      }));
      parts.push({
        text: buildUserText({
          text: input.text,
          imageCount: input.images.length,
          language: input.language,
        }),
      });

      let res: Response;
      try {
        res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts }],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 2048,
              responseMimeType: 'application/json',
              responseSchema: GEMINI_RESPONSE_SCHEMA,
            },
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (err) {
        throw new ProviderUnavailableError(`gemini fetch failed: ${(err as Error).name}`);
      }

      if (!res.ok) {
        // 429 here is the provider-side quota cap (docs/01-architecture.md §6.3 layer 3) doing its job.
        throw new ProviderUnavailableError(`gemini responded ${res.status}`);
      }

      let body: GeminiResponse;
      try {
        body = (await res.json()) as GeminiResponse;
      } catch {
        return { kind: 'malformed', detail: 'response body is not JSON' };
      }
      return parseGeminiBody(body);
    },
  };
}

/** Exported for the contract tests, which feed it recorded-shape response bodies directly. */
export function parseGeminiBody(body: GeminiResponse): ProviderResult {
  if (body.promptFeedback?.blockReason) {
    return { kind: 'malformed', detail: `blocked: ${body.promptFeedback.blockReason}` };
  }
  const first = body.candidates?.[0];
  if (!first) return { kind: 'malformed', detail: 'no candidates in response' };
  // MAX_TOKENS means the JSON was cut off mid-object; SAFETY/RECITATION/OTHER mean no answer.
  if (first.finishReason && first.finishReason !== 'STOP') {
    return { kind: 'malformed', detail: `finishReason ${first.finishReason}` };
  }
  const text = first.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { kind: 'malformed', detail: 'model text is not valid JSON' };
  }
  const parsed = ModelOutputSchema.safeParse(json);
  if (!parsed.success) return { kind: 'malformed', detail: 'model JSON does not match schema' };
  return { kind: 'ok', output: parsed.data };
}
