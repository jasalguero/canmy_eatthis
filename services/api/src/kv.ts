/**
 * The four abuse-control layers from docs/10-hobby-scope.md §3, in the order that matters:
 * the global daily cap and the kill switch are what actually prevent an unbounded bill
 * (AGENTS.md #17 — this module exists in the same commit as the first real provider call, not
 * as a follow-up). Every function takes a `KVNamespace` as a parameter rather than reading it off
 * a module-level `env`, so tests exercise the real logic against an in-memory fake
 * (`test/fakeKv.ts`) with no Miniflare or Cloudflare account needed.
 *
 * All four degrade the same way on a KV problem: **soft**. A KV read/write failure here must
 * never surface as a 500 — it must fail toward "treat this call as not allowed" for the cap/kill
 * switch (the conservative direction: refuse a paid call rather than risk missing the cap) and
 * toward "not cached" for the cache (docs/10 §2's own stated failure mode).
 */

const KILL_SWITCH_KEY = 'config:kill_switch';
const DAILY_CAP_KEY_PREFIX = 'spend:daily:';
const RATE_LIMIT_KEY_PREFIX = 'ratelimit:device:';
const CACHE_KEY_PREFIX = 'cache:identify:';

/** UTC calendar date, so the cap resets at midnight UTC regardless of caller timezone. */
function utcDateKey(now: Date): string {
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** UTC hour bucket — a coarse, cheap sliding window for the per-device rate limit. */
function utcHourKey(now: Date): string {
  return now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
}

/**
 * docs/10 §3 layer 2: a boolean in KV, flippable from the dashboard in ~10 seconds, no deploy.
 * Fails **closed** (killed) if KV can't be read — an outage should not silently reopen the
 * vision path.
 */
export async function isKillSwitchActive(kv: KVNamespace): Promise<boolean> {
  try {
    const value = await kv.get(KILL_SWITCH_KEY);
    return value === 'true';
  } catch {
    return true;
  }
}

export interface DailyCapCheck {
  allowed: boolean;
  remaining: number;
}

/** Seconds until the daily counter's UTC date rolls over — the honest `retryAfterSec`. */
export function secondsUntilUtcMidnight(now: Date = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

/**
 * docs/10 §3 layer 1 — "roughly twenty lines of code and it is the layer that actually
 * prevents the disaster." Checks and reserves a slot in one call: this is called *before* the
 * paid provider call, not after, so a request that fails partway through still counts against
 * the day's budget rather than risking an under-count. Fails **closed** on a KV error (refuses
 * the call) — the conservative direction when the alternative is an unbounded bill.
 */
export async function checkAndReserveDailyCap(
  kv: KVNamespace,
  cap: number,
): Promise<DailyCapCheck> {
  const key = DAILY_CAP_KEY_PREFIX + utcDateKey(new Date());
  try {
    const current = Number.parseInt((await kv.get(key)) ?? '0', 10);
    const used = Number.isNaN(current) ? 0 : current;
    if (used >= cap) {
      return { allowed: false, remaining: 0 };
    }
    // expirationTtl is generous (2 days) rather than exact-to-midnight: KV TTLs are approximate,
    // and the key naturally stops being read the moment the UTC date rolls over anyway.
    await kv.put(key, String(used + 1), { expirationTtl: 60 * 60 * 24 * 2 });
    return { allowed: true, remaining: cap - used - 1 };
  } catch {
    return { allowed: false, remaining: 0 };
  }
}

export interface RateLimitCheck {
  allowed: boolean;
  retryAfterSec: number;
}

/**
 * docs/10 §3 layer 4 — casual-abuse protection on an anonymous client-generated device id (no
 * attestation behind it; see docs/02-tech-decisions.md D24). Fails **open** (allowed) on a KV
 * error: unlike the daily cap, letting one device through when KV is briefly unavailable does
 * not risk an unbounded bill — the daily cap is what actually bounds spend.
 */
export async function checkDeviceRateLimit(
  kv: KVNamespace,
  deviceId: string,
  maxPerHour: number,
): Promise<RateLimitCheck> {
  const key = `${RATE_LIMIT_KEY_PREFIX}${deviceId}:${utcHourKey(new Date())}`;
  try {
    const current = Number.parseInt((await kv.get(key)) ?? '0', 10);
    const used = Number.isNaN(current) ? 0 : current;
    if (used >= maxPerHour) {
      return { allowed: false, retryAfterSec: 60 * 60 };
    }
    await kv.put(key, String(used + 1), { expirationTtl: 60 * 60 * 2 });
    return { allowed: true, retryAfterSec: 0 };
  } catch {
    return { allowed: true, retryAfterSec: 0 };
  }
}

/**
 * Builds the cache key from everything that changes the answer: the inputs a model call would
 * otherwise cost money to answer, plus the language (candidate labels and alternates are
 * localised), the prompt version (a new prompt must not serve the old prompt's answers) and the KB
 * version (cached `kbId`s must refer to the KB that is live). Image hashes must be server-computed
 * — see `images.ts`.
 */
export async function buildCacheKey(params: {
  species: string;
  language: string;
  normalisedText: string;
  imageHashes: readonly string[];
  promptVersion: string;
  kbVersion: string;
}): Promise<string> {
  const raw = [
    params.promptVersion,
    params.kbVersion,
    params.species,
    params.language,
    params.normalisedText,
    [...params.imageHashes].sort().join(','),
  ].join('|');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return CACHE_KEY_PREFIX + hex;
}

/** 30-day TTL per docs/03/07. Read failures degrade to a cache miss, never an error. */
export async function getCachedResponse<T>(kv: KVNamespace, cacheKey: string): Promise<T | null> {
  try {
    return await kv.get<T>(cacheKey, 'json');
  } catch {
    return null;
  }
}

/**
 * docs/10 §2: "a failed KV write must degrade to 'not cached', never to an error." Swallows the
 * error deliberately — the caller already has the real response to return regardless.
 */
export async function setCachedResponse(
  kv: KVNamespace,
  cacheKey: string,
  value: unknown,
): Promise<void> {
  try {
    await kv.put(cacheKey, JSON.stringify(value), { expirationTtl: 60 * 60 * 24 * 30 });
  } catch {
    // Soft failure by design — see the module doc comment.
  }
}
