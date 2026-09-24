/**
 * Worker bindings. Vars are non-secret (`wrangler.toml` `[vars]`); secrets are set with
 * `wrangler secret put` and never appear in the repo in any form (AGENTS.md #6).
 */
export type Env = {
  /** Response cache, spend counter, device rate limits, kill switch, vision config (docs/10 §3). */
  KV: KVNamespace;
  /** docs/10 §3 layer 1 — the hard ceiling on paid model calls per UTC day. */
  VISION_DAILY_CALL_CAP: string;
  /** docs/10 §3 layer 4 — paid model calls per anonymous device per UTC hour. */
  DEVICE_HOURLY_CALL_LIMIT: string;
  /** Oldest app build that can read the KB artefact this Worker serves. */
  MIN_APP_VERSION: string;
  /** Secret. Must be a key on a billing-enabled (paid tier) Google Cloud project — docs/10 §2.1. */
  GEMINI_API_KEY?: string;
};

/**
 * Parses a positive integer var. A missing or garbled value falls back to `fallback` — which for
 * the spend cap is the doc's conservative starting value, never "unlimited".
 */
export function positiveIntVar(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
