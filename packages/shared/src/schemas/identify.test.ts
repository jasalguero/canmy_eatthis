import { describe, expect, it } from 'vitest';
import { type IdentifyResponse, IdentifyResponseSchema } from './identify.js';

/**
 * Invariant 3 (`docs/03-api-contract.md` §VerdictPayload): `resolvedBy === "model_fallback"` ⇒
 * `verdict ∈ {caution, unknown}`, never `safe` or `toxic`. AGENTS.md #1 exists to protect this —
 * the model never produces a verdict, so its one user-facing path (fallback prose) must never
 * carry a "safe" claim it isn't entitled to make. (Invariant 4, risk bands, does not exist in
 * this schema — docs/02-tech-decisions.md D16 — so only invariants 1, 2, 3 and 5 apply
 * here; 1, 2 and 5 are covered in `resolveVerdict.test.ts`.)
 */
function baseResponse(overrides: Partial<IdentifyResponse> = {}) {
  return {
    requestId: 'req_1',
    resolvedBy: 'model_fallback' as const,
    needsConfirmation: true,
    candidates: [],
    alternates: [],
    verdict: null,
    imageQuality: { usable: true, reason: null },
    meta: { provider: 'gemini', model: 'gemini-test', cached: false, latencyMs: 10 },
    ...overrides,
  };
}

const disclaimer = 'This is general information, not veterinary advice.';

function verdictPayload(verdict: 'safe' | 'caution' | 'toxic' | 'unknown') {
  return {
    kbId: 'test_entry',
    displayName: 'Test entry',
    species: 'dog' as const,
    verdict,
    severity: verdict === 'toxic' ? ('mild' as const) : null,
    headline: verdict === 'unknown' ? 'Not sure — ask your vet' : 'Headline',
    summary: 'Summary',
    signs: [],
    onsetHours: null,
    emergencyActions: verdict === 'toxic' ? ['call_vet_now'] : [],
    sources:
      verdict === 'toxic' || verdict === 'caution'
        ? [{ label: 'Source', url: 'https://example.com' }]
        : [],
    kbVersion: 'test-v1',
    disclaimer,
  };
}

describe('IdentifyResponseSchema — invariant 3', () => {
  it('accepts model_fallback with a caution verdict', () => {
    const result = IdentifyResponseSchema.safeParse(
      baseResponse({ verdict: verdictPayload('caution') }),
    );
    expect(result.success).toBe(true);
  });

  it('accepts model_fallback with an unknown verdict', () => {
    const result = IdentifyResponseSchema.safeParse(
      baseResponse({ verdict: verdictPayload('unknown') }),
    );
    expect(result.success).toBe(true);
  });

  it('rejects model_fallback with a safe verdict', () => {
    const result = IdentifyResponseSchema.safeParse(
      baseResponse({ verdict: verdictPayload('safe') }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects model_fallback with a toxic verdict', () => {
    const result = IdentifyResponseSchema.safeParse(
      baseResponse({ verdict: verdictPayload('toxic') }),
    );
    expect(result.success).toBe(false);
  });
});
