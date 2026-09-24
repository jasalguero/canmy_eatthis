import type { ModelOutput } from '../prompts/identify.v1.js';

/**
 * docs/02 D7's provider seam. Hobby scope ships one implementation (Gemini, paid tier —
 * docs/10 §2.1 and D24); a second provider is a new file here plus a `provider` value in the KV
 * config, not a change to the identify pipeline.
 *
 * The input deliberately has no `species`: identification does not depend on it, and not
 * sending it removes any invitation for the model to reason about toxicity (AGENTS.md #1).
 */
export interface ProviderInput {
  text: string | null;
  /** Base64 JPEG, already validated for size, format and dimensions. */
  images: readonly string[];
  language: 'en' | 'es';
}

export type ProviderResult =
  | { kind: 'ok'; output: ModelOutput }
  /** The provider answered but the answer is unusable — truncated, blocked, wrong schema. */
  | { kind: 'malformed'; detail: string };

/** The provider could not be reached or refused the call (network, timeout, 4xx/5xx, quota). */
export class ProviderUnavailableError extends Error {}

export interface VisionProvider {
  readonly id: string;
  identify(input: ProviderInput, model: string): Promise<ProviderResult>;
}
