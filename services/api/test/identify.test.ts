import { ApiErrorSchema, IdentifyResponseSchema, VerdictPayloadSchema } from '@canmyeatthis/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildVerdict } from '../src/kb.js';
import { DISCLAIMER } from '../src/strings.js';
import * as fx from './fixtures/gemini.js';
import {
  NO_ESCALATION,
  app,
  identifyRequest,
  makeEnv,
  makeJpeg,
  photoRequest,
  stubGemini,
} from './helpers.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const todayCapKey = () => `spend:daily:${new Date().toISOString().slice(0, 10)}`;

async function expectError(res: Response, code: string, status: number) {
  expect(res.status).toBe(status);
  const body = ApiErrorSchema.parse(await res.json());
  expect(body.error.code).toBe(code);
  expect(body.error.requestId).toMatch(/^req_/);
  return body;
}

describe('POST /v1/identify — free paths (no model call)', () => {
  it('an exact typed match resolves from the KB with a verdict and no confirmation', async () => {
    const { fetchMock } = stubGemini([]);
    const res = await identifyRequest(makeEnv(), {
      species: 'dog',
      text: 'Dark chocolate',
      images: [],
      barcode: null,
      locale: 'en-US',
    });
    expect(res.status).toBe(200);
    const body = IdentifyResponseSchema.parse(await res.json());
    expect(body.resolvedBy).toBe('kb_exact');
    expect(body.needsConfirmation).toBe(false);
    expect(body.verdict?.verdict).toBe('toxic');
    expect(body.alternates.map((a) => a.kbId)).toContain('chocolate_milk');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a server-side verdict is byte-identical to the shared resolver (AGENTS.md #5)', async () => {
    stubGemini([]);
    const res = await identifyRequest(makeEnv(), {
      species: 'cat',
      text: 'lirio',
      images: [],
      barcode: null,
      locale: 'es-ES',
    });
    const body = IdentifyResponseSchema.parse(await res.json());
    expect(JSON.stringify(body.verdict)).toBe(
      JSON.stringify(
        buildVerdict({ kbId: 'lily', species: 'cat', language: 'es', disclaimer: DISCLAIMER.es }),
      ),
    );
  });

  it('a fuzzy typed match is resolvedBy kb_fuzzy and must be confirmed', async () => {
    stubGemini([]);
    const res = await identifyRequest(makeEnv(), {
      species: 'dog',
      text: 'onyon',
      images: [],
      barcode: null,
      locale: 'en',
    });
    const body = IdentifyResponseSchema.parse(await res.json());
    expect(body.resolvedBy).toBe('kb_fuzzy');
    expect(body.needsConfirmation).toBe(true);
    expect(body.verdict).toBeNull();
    expect(body.candidates[0]?.kbId).toBe('alliums');
  });
});

describe('POST /v1/identify — model path against recorded-shape provider fixtures', () => {
  it('maps a photo to KB candidates, always behind the confirm gate, never with a verdict', async () => {
    const { calls } = stubGemini([{ body: fx.DARK_CHOCOLATE_PHOTO }]);
    const res = await identifyRequest(makeEnv(), photoRequest());
    expect(res.status).toBe(200);
    const body = IdentifyResponseSchema.parse(await res.json());
    expect(body.resolvedBy).toBe('model');
    expect(body.needsConfirmation).toBe(true);
    expect(body.verdict).toBeNull();
    expect(body.candidates.map((c) => c.kbId)).toEqual(['chocolate_dark', 'chocolate_milk']);
    expect(body.candidates[0]?.confidenceBand).toBe('high');
    expect(body.candidates[0]?.detectedIngredients).toEqual([
      'cocoa mass',
      'sugar',
      'cocoa butter',
    ]);
    expect(body.meta).toMatchObject({ provider: 'gemini', cached: false });

    // The request that went out: temperature 0, JSON schema, no species anywhere (AGENTS.md #1).
    const sent = calls[0]?.body as {
      generationConfig: { temperature: number; responseMimeType: string };
    };
    expect(sent.generationConfig.temperature).toBe(0);
    expect(sent.generationConfig.responseMimeType).toBe('application/json');
    expect(JSON.stringify(sent)).not.toMatch(/\bdog\b/);
    expect(JSON.stringify(sent).toLowerCase()).not.toContain('is this toxic');
  });

  it('never trusts a photo-identified plant above low confidence (docs/10 §4)', async () => {
    stubGemini([{ body: fx.LILY_PHOTO }, { body: fx.LILY_PHOTO }]);
    const body = IdentifyResponseSchema.parse(
      await (await identifyRequest(makeEnv(), photoRequest({ species: 'cat' }))).json(),
    );
    expect(body.candidates[0]?.kbId).toBe('lily');
    expect(body.candidates[0]?.confidenceBand).toBe('low');
  });

  it('surfaces a KB ingredient read off the label as its own candidate', async () => {
    stubGemini([{ body: fx.COOKIE_WITH_RAISINS }, { body: fx.COOKIE_WITH_RAISINS }]);
    const body = IdentifyResponseSchema.parse(
      await (await identifyRequest(makeEnv(), photoRequest())).json(),
    );
    expect(body.candidates.map((c) => c.kbId)).toEqual([null, 'grapes_raisins']);
    expect(body.resolvedBy).toBe('model');
  });

  it('an identified item with no KB entry is model_fallback with no kbIds — the app renders unknown', async () => {
    stubGemini([{ body: fx.UNKNOWN_ITEM }]);
    const body = IdentifyResponseSchema.parse(
      await (await identifyRequest(makeEnv(), photoRequest())).json(),
    );
    expect(body.resolvedBy).toBe('model_fallback');
    expect(body.verdict).toBeNull();
    expect(body.candidates.every((c) => c.kbId === null)).toBe(true);
  });

  it('escalates a low-confidence answer and keeps the more cautious merge', async () => {
    const env = makeEnv({}, {});
    const { calls } = stubGemini([
      { body: fx.BLURRY_BERRIES_PRIMARY },
      { body: fx.BLURRY_BERRIES_ESCALATED },
    ]);
    const body = IdentifyResponseSchema.parse(
      await (await identifyRequest(env, photoRequest())).json(),
    );
    expect(calls.map((c) => c.model)).toEqual(['gemini-2.5-flash-lite', 'gemini-2.5-flash']);
    // Both models named grapes: the lower confidence (0.55) wins, not the escalated 0.8.
    expect(body.candidates[0]).toMatchObject({ kbId: 'grapes_raisins', confidence: 0.55 });
    // Only the primary saw blueberries — still offered.
    expect(body.candidates.map((c) => c.label)).toContain('Blueberries');
    // Each call reserved its own slot against the cap.
    expect(await env.KV.get(todayCapKey())).toBe('2');
  });

  it('skips escalation rather than exceed the daily cap', async () => {
    const env = makeEnv({ VISION_DAILY_CALL_CAP: '1' }, {});
    const { calls } = stubGemini([{ body: fx.BLURRY_BERRIES_PRIMARY }]);
    const res = await identifyRequest(env, photoRequest());
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
  });

  it('escalates a high-risk KB hit even at high confidence', async () => {
    const { calls } = stubGemini([
      { body: fx.DARK_CHOCOLATE_PHOTO },
      { body: fx.DARK_CHOCOLATE_PHOTO },
    ]);
    await identifyRequest(makeEnv({}, {}), photoRequest());
    expect(calls).toHaveLength(2);
  });

  it('keeps the primary answer when the escalation model is down', async () => {
    stubGemini([{ body: fx.BLURRY_BERRIES_PRIMARY }, { status: 503 }]);
    const res = await identifyRequest(makeEnv({}, {}), photoRequest());
    expect(res.status).toBe(200);
    expect(IdentifyResponseSchema.parse(await res.json()).candidates[0]?.confidence).toBe(0.55);
  });

  it('a KV config document can switch models and disable escalation without a deploy', async () => {
    const env = makeEnv(
      {},
      {
        'config:vision': JSON.stringify({ primaryModel: 'some-new-model', escalationModel: null }),
      },
    );
    const { calls } = stubGemini([{ body: fx.BLURRY_BERRIES_PRIMARY }]);
    await identifyRequest(env, photoRequest());
    expect(calls.map((c) => c.model)).toEqual(['some-new-model']);
  });

  it('text the offline tiers cannot resolve goes to the model, text-only', async () => {
    const { calls } = stubGemini([{ body: fx.UNKNOWN_ITEM }]);
    const res = await identifyRequest(makeEnv(), {
      species: 'dog',
      text: 'pitaya',
      images: [],
      barcode: null,
      locale: 'en',
    });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
  });
});

describe('malformed model output degrades to unknown, never crashes', () => {
  for (const [name, body] of Object.entries({
    TRUNCATED_JSON: fx.TRUNCATED_JSON,
    TRUNCATED_JSON_STOP: fx.TRUNCATED_JSON_STOP,
    WRONG_SCHEMA: fx.WRONG_SCHEMA,
    CONFIDENCE_OUT_OF_RANGE: fx.CONFIDENCE_OUT_OF_RANGE,
    PROSE_NOT_JSON: fx.PROSE_NOT_JSON,
    SAFETY_BLOCKED: fx.SAFETY_BLOCKED,
    NO_CANDIDATES_ARRAY: fx.NO_CANDIDATES_ARRAY,
  })) {
    it(name, async () => {
      stubGemini([{ body }]);
      const res = await identifyRequest(makeEnv(), photoRequest());
      expect(res.status).toBe(200);
      const parsed = IdentifyResponseSchema.parse(await res.json());
      expect(parsed.resolvedBy).toBe('model_fallback');
      expect(parsed.verdict).toBeNull();
      expect(parsed.candidates).toEqual([]);
      expect(parsed.needsConfirmation).toBe(true);
    });
  }

  it('a malformed answer is not cached', async () => {
    const env = makeEnv();
    stubGemini([{ body: fx.WRONG_SCHEMA }, { body: fx.DARK_CHOCOLATE_PHOTO }]);
    await identifyRequest(env, photoRequest());
    const second = IdentifyResponseSchema.parse(
      await (await identifyRequest(env, photoRequest())).json(),
    );
    expect(second.resolvedBy).toBe('model');
  });
});

describe('invariant: no response path can emit verdict "safe" with resolvedBy "model_fallback"', () => {
  it('the schema itself rejects it, so no code path can serialise it', () => {
    const safe = buildVerdict({ kbId: 'carrot', species: 'dog', language: 'en', disclaimer: 'x' });
    expect(safe?.verdict).toBe('safe');
    const attempt = IdentifyResponseSchema.safeParse({
      requestId: 'req_x',
      resolvedBy: 'model_fallback',
      needsConfirmation: true,
      candidates: [],
      alternates: [],
      verdict: safe,
      imageQuality: { usable: true, reason: null },
      meta: { provider: 'gemini', model: 'm', cached: false, latencyMs: 1 },
    });
    expect(attempt.success).toBe(false);
  });

  it('across every provider fixture, no model-derived response carries any verdict at all', async () => {
    for (const body of Object.values(fx)) {
      if (typeof body === 'function') continue;
      stubGemini([{ body }, { body }]);
      const res = await identifyRequest(makeEnv(), photoRequest({ species: 'cat' }));
      if (res.status !== 200) continue; // IMAGE_UNUSABLE / NO_SUBJECT_FOUND
      const parsed = IdentifyResponseSchema.parse(await res.json());
      expect(parsed.verdict).toBeNull();
      expect(parsed.needsConfirmation).toBe(true);
      vi.unstubAllGlobals();
    }
  });
});

describe('spend controls (docs/10 §3)', () => {
  it('forcing the daily counter past its threshold refuses the vision path…', async () => {
    const env = makeEnv({ VISION_DAILY_CALL_CAP: '5' }, { ...NO_ESCALATION, [todayCapKey()]: '5' });
    const { fetchMock } = stubGemini([]);
    const body = await expectError(
      await identifyRequest(env, photoRequest()),
      'SPEND_CAP_EXCEEDED',
      503,
    );
    expect(body.error.retryAfterSec).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();

    // …and leaves the offline KB and verdicts fully working. (The hotline CTA is a bundled `tel:`
    // link in the app — no network at all — so there is nothing server-side for the cap to break.)
    const typed = await identifyRequest(env, {
      species: 'dog',
      text: 'xylitol',
      images: [],
      barcode: null,
      locale: 'en',
    });
    expect(typed.status).toBe(200);
    expect(IdentifyResponseSchema.parse(await typed.json()).verdict?.verdict).toBe('toxic');
    const verdict = await app.request(
      '/v1/verdict',
      { method: 'POST', body: JSON.stringify({ kbId: 'rodenticide', species: 'cat' }) },
      env,
    );
    expect(verdict.status).toBe(200);
    expect(VerdictPayloadSchema.parse(await verdict.json()).verdict).toBe('toxic');
    const manifest = await app.request('/v1/kb/manifest', {}, env);
    expect(manifest.status).toBe(200);
  });

  it('a KV dailyCap can lower the cap without a deploy, never raise it', async () => {
    const lowered = makeEnv({}, { 'config:vision': JSON.stringify({ dailyCap: 0 }) });
    stubGemini([]);
    await expectError(await identifyRequest(lowered, photoRequest()), 'SPEND_CAP_EXCEEDED', 503);

    const raised = makeEnv(
      { VISION_DAILY_CALL_CAP: '1' },
      { 'config:vision': JSON.stringify({ dailyCap: 10_000 }), [todayCapKey()]: '1' },
    );
    await expectError(await identifyRequest(raised, photoRequest()), 'SPEND_CAP_EXCEEDED', 503);
  });

  it('flipping the kill switch disables the vision path on the very next request', async () => {
    const env = makeEnv();
    stubGemini([{ body: fx.UNKNOWN_ITEM }]);
    expect((await identifyRequest(env, photoRequest())).status).toBe(200);

    await env.KV.put('config:kill_switch', 'true');
    await expectError(
      await identifyRequest(
        env,
        photoRequest({ images: [{ data: makeJpeg(10, 10, 7), hash: 'h' }] }),
      ),
      'PROVIDER_UNAVAILABLE',
      503,
    );
  });

  it('the kill switch also stops cached model answers', async () => {
    const env = makeEnv();
    stubGemini([{ body: fx.DARK_CHOCOLATE_PHOTO }]);
    await identifyRequest(env, photoRequest());
    await env.KV.put('config:kill_switch', 'true');
    await expectError(await identifyRequest(env, photoRequest()), 'PROVIDER_UNAVAILABLE', 503);
  });

  it('rate-limits one device per hour', async () => {
    const env = makeEnv({ DEVICE_HOURLY_CALL_LIMIT: '1' });
    stubGemini([{ body: fx.UNKNOWN_ITEM }]);
    expect((await identifyRequest(env, photoRequest())).status).toBe(200);
    const body = await expectError(
      await identifyRequest(
        env,
        photoRequest({ images: [{ data: makeJpeg(10, 10, 9), hash: 'h' }] }),
      ),
      'RATE_LIMITED',
      429,
    );
    expect(body.error.retryAfterSec).toBeGreaterThan(0);
  });
});

describe('response cache', () => {
  it('a repeat request is served from cache with no model call, well under 100 ms', async () => {
    const env = makeEnv();
    const { fetchMock } = stubGemini([{ body: fx.DARK_CHOCOLATE_PHOTO }]);
    const first = IdentifyResponseSchema.parse(
      await (await identifyRequest(env, photoRequest())).json(),
    );

    const started = performance.now();
    const res = await identifyRequest(env, photoRequest());
    const elapsed = performance.now() - started;
    const second = IdentifyResponseSchema.parse(await res.json());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.resolvedBy).toBe('cache');
    expect(second.meta.cached).toBe(true);
    expect(second.requestId).not.toBe(first.requestId);
    expect(second.candidates).toEqual(first.candidates);
    expect(elapsed).toBeLessThan(100);
  });

  it('a KV write failure degrades to "not cached", never to an error', async () => {
    const env = makeEnv();
    const realPut = env.KV.put.bind(env.KV);
    vi.spyOn(env.KV, 'put').mockImplementation(async (key: string, ...rest: unknown[]) => {
      if (key.startsWith('cache:')) throw new Error('KV write limit exceeded');
      // biome-ignore lint/suspicious/noExplicitAny: forwarding to the fake's own signature
      return (realPut as any)(key, ...rest);
    });
    stubGemini([{ body: fx.DARK_CHOCOLATE_PHOTO }, { body: fx.DARK_CHOCOLATE_PHOTO }]);
    const res = await identifyRequest(env, photoRequest());
    expect(res.status).toBe(200);
    expect(IdentifyResponseSchema.parse(await res.json()).resolvedBy).toBe('model');
    // Not cached: the repeat goes back to the model.
    const again = IdentifyResponseSchema.parse(
      await (await identifyRequest(env, photoRequest())).json(),
    );
    expect(again.resolvedBy).toBe('model');
  });

  it('ignores the client-supplied image hash, so the cache cannot be poisoned', async () => {
    const env = makeEnv();
    const { fetchMock } = stubGemini([
      { body: fx.UNKNOWN_ITEM },
      { body: fx.DARK_CHOCOLATE_PHOTO },
    ]);
    await identifyRequest(
      env,
      photoRequest({ images: [{ data: makeJpeg(100, 100, 1), hash: 'same' }] }),
    );
    const second = IdentifyResponseSchema.parse(
      await (
        await identifyRequest(
          env,
          photoRequest({ images: [{ data: makeJpeg(100, 100, 2), hash: 'same' }] }),
        )
      ).json(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(second.candidates[0]?.kbId).toBe('chocolate_dark');
  });
});

describe('barcode', () => {
  function stubOpenFoodFacts(product: { product_name?: string; ingredients_text?: string } | null) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (!url.includes('openpetfoodfacts.org') && !url.includes('openfoodfacts.org')) {
          throw new Error(`unexpected network call in test: ${url}`);
        }
        return new Response(JSON.stringify(product ? { status: 1, product } : { status: 0 }));
      }),
    );
  }
  const barcodeRequest = {
    species: 'dog',
    text: null,
    images: [],
    barcode: { format: 'ean13', value: '4000000000000' },
    locale: 'en',
  };

  it('finds a KB ingredient in the product and still asks for confirmation', async () => {
    stubOpenFoodFacts({
      product_name: 'Mint gum',
      ingredients_text: 'Sweeteners (sorbitol, xylitol), gum base',
    });
    const body = IdentifyResponseSchema.parse(
      await (await identifyRequest(makeEnv(), barcodeRequest)).json(),
    );
    expect(body.resolvedBy).toBe('barcode');
    expect(body.needsConfirmation).toBe(true);
    expect(body.candidates.map((c) => c.kbId)).toEqual(['xylitol']);
  });

  it('a product with no KB ingredient is a kbId-null candidate (unknown), not a pass', async () => {
    stubOpenFoodFacts({
      product_name: 'Rice crackers',
      ingredients_text: 'rice, salt, sunflower oil',
    });
    const body = IdentifyResponseSchema.parse(
      await (await identifyRequest(makeEnv(), barcodeRequest)).json(),
    );
    expect(body.candidates).toHaveLength(1);
    expect(body.candidates[0]).toMatchObject({ kbId: null, label: 'Rice crackers' });
    expect(body.verdict).toBeNull();
  });

  it('an unknown barcode with nothing else to try is NO_SUBJECT_FOUND', async () => {
    stubOpenFoodFacts(null);
    await expectError(await identifyRequest(makeEnv(), barcodeRequest), 'NO_SUBJECT_FOUND', 422);
  });

  it('an unreachable barcode database with nothing else to try is PROVIDER_UNAVAILABLE', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network down');
      }),
    );
    await expectError(
      await identifyRequest(makeEnv(), barcodeRequest),
      'PROVIDER_UNAVAILABLE',
      503,
    );
  });
});

describe('every docs/03 error code is reachable and correctly shaped', () => {
  it('INVALID_REQUEST — schema violation, bad JSON, oversize image, non-JPEG', async () => {
    stubGemini([]);
    const env = makeEnv();
    await expectError(
      await identifyRequest(env, {
        species: 'dog',
        text: null,
        images: [],
        barcode: null,
        locale: 'en',
      }),
      'INVALID_REQUEST',
      400,
    );
    await expectError(await identifyRequest(env, '{nope'), 'INVALID_REQUEST', 400);
    await expectError(
      await identifyRequest(
        env,
        photoRequest({ images: [{ data: makeJpeg(2048, 1000), hash: 'h' }] }),
      ),
      'INVALID_REQUEST',
      400,
    );
    await expectError(
      await identifyRequest(
        env,
        photoRequest({ images: [{ data: btoa('GIF89a....'), hash: 'h' }] }),
      ),
      'INVALID_REQUEST',
      400,
    );
    await expectError(
      await identifyRequest(
        env,
        photoRequest({ images: [{ data: 'A'.repeat(400 * 1024 + 4), hash: 'h' }] }),
      ),
      'INVALID_REQUEST',
      400,
    );
  });

  it('UNAUTHENTICATED — missing or malformed device id', async () => {
    stubGemini([]);
    await expectError(
      await identifyRequest(makeEnv(), photoRequest(), { 'x-device-id': 'nope' }),
      'UNAUTHENTICATED',
      401,
    );
  });

  it('IMAGE_UNUSABLE', async () => {
    stubGemini([{ body: fx.UNUSABLE_PHOTO }]);
    await expectError(await identifyRequest(makeEnv(), photoRequest()), 'IMAGE_UNUSABLE', 422);
  });

  it('NO_SUBJECT_FOUND', async () => {
    stubGemini([{ body: fx.NOTHING_EDIBLE }]);
    await expectError(await identifyRequest(makeEnv(), photoRequest()), 'NO_SUBJECT_FOUND', 422);
  });

  it('PROVIDER_UNAVAILABLE — provider 5xx, provider quota 429, timeout, no key configured', async () => {
    for (const reply of [
      { status: 500 },
      { status: 429 },
      new DOMException('timed out', 'TimeoutError'),
    ]) {
      stubGemini([reply]);
      await expectError(
        await identifyRequest(makeEnv(), photoRequest()),
        'PROVIDER_UNAVAILABLE',
        503,
      );
    }
    stubGemini([]);
    const { GEMINI_API_KEY: _unset, ...keyless } = makeEnv();
    await expectError(await identifyRequest(keyless, photoRequest()), 'PROVIDER_UNAVAILABLE', 503);
  });

  it('INTERNAL — an unexpected throw becomes the envelope, not a stack trace', async () => {
    stubGemini([]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(crypto.subtle, 'digest').mockRejectedValue(new Error('boom'));
    await expectError(await identifyRequest(makeEnv(), photoRequest()), 'INTERNAL', 500);
  });

  it('RATE_LIMITED and SPEND_CAP_EXCEEDED are covered under "spend controls" above', () => {
    // ATTESTATION_FAILED is intentionally unreachable: attestation is deferred (docs/10 §3, D24).
    expect(true).toBe(true);
  });
});

describe('structured logging', () => {
  it('logs the normalised query only — never raw text, never image bytes', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((line: string) => lines.push(line));
    stubGemini([{ body: fx.UNKNOWN_ITEM }]);
    const image = makeJpeg(640, 480, 3);
    await identifyRequest(
      makeEnv(),
      photoRequest({ text: 'My Dog ate THIS, Help!!', images: [{ data: image, hash: 'h' }] }),
    );
    const entry = JSON.parse(lines.find((l) => l.includes('"at":"identify"')) ?? '{}');
    expect(entry).toMatchObject({
      promptVersion: 'identify.v1',
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      cached: false,
      query: 'my dog ate thi help',
      imageCount: 1,
    });
    expect(entry.kbVersion).toBeTruthy();
    expect(entry.latencyMs).toBeTypeOf('number');
    const all = lines.join('\n');
    expect(all).not.toContain('My Dog ate THIS');
    expect(all).not.toContain(image);
  });
});
