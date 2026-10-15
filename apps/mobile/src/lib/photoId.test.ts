import type { IdentifyResponse } from '@canmyeatthis/shared';

import { type IdentifyOutcome, identify } from './identifyClient';
import { runPhotoCheck } from './photoCheck';
import { confirmChoices, confirmTarget, photoIdEnabled, routeForPhotoOutcome } from './photoFlow';
import { randomUuid } from './settings';

/** docs/07 Phase 5 (second release): the photo path, from request to the Confirm gate. */

const RESPONSE: IdentifyResponse = {
  requestId: 'req_1',
  resolvedBy: 'model',
  needsConfirmation: true,
  candidates: [
    {
      id: 'c2',
      label: 'Milk chocolate',
      kbId: 'chocolate_milk',
      confidence: 0.1,
      confidenceBand: 'low',
    },
    {
      id: 'c1',
      label: 'Dark chocolate',
      kbId: 'chocolate_dark',
      confidence: 0.8,
      confidenceBand: 'high',
    },
    { id: 'c3', label: 'Carob bar', kbId: null, confidence: 0.05, confidenceBand: 'low' },
  ],
  alternates: [
    { kbId: 'chocolate_milk', label: 'Milk chocolate' },
    { kbId: 'chocolate_white', label: 'White chocolate' },
  ],
  verdict: null,
  imageQuality: { usable: true, reason: null },
  meta: { provider: 'gemini', model: 'm', cached: false, latencyMs: 900 },
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

const noSleep = async () => {};

function call(fetchFn: typeof fetch) {
  return identify({
    apiUrl: 'https://api.example/',
    deviceId: '00000000-0000-4000-8000-000000000000',
    request: {
      species: 'dog',
      text: null,
      images: [{ data: 'aGk=', hash: 'h' }],
      barcode: null,
      locale: 'en',
    },
    fetch: fetchFn,
    sleep: noSleep,
  });
}

describe('the identify client', () => {
  it('posts to /v1/identify with the device id and returns a valid answer', async () => {
    const fetchFn = jest.fn(async () => json(200, RESPONSE)) as unknown as jest.Mock;
    await expect(call(fetchFn as unknown as typeof fetch)).resolves.toEqual({
      kind: 'ok',
      response: RESPONSE,
    });
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example/v1/identify');
    expect((init.headers as Record<string, string>)['x-device-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('refuses a model answer that would skip confirmation, as an error', async () => {
    const bad = { ...RESPONSE, needsConfirmation: false };
    await expect(call((async () => json(200, bad)) as unknown as typeof fetch)).resolves.toEqual({
      kind: 'error',
      code: 'INTERNAL',
    });
  });

  it.each(['SPEND_CAP_EXCEEDED', 'RATE_LIMITED', 'PROVIDER_UNAVAILABLE', 'NO_SUBJECT_FOUND'])(
    'passes %s through at once, with no retry',
    async (code) => {
      const fetchFn = jest.fn(async () =>
        json(429, { error: { code, message: 'm', requestId: 'r' } }),
      );
      await expect(call(fetchFn as unknown as typeof fetch)).resolves.toEqual({
        kind: 'error',
        code,
      });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    },
  );

  it('retries a dropped connection with backoff, then reports offline', async () => {
    const fetchFn = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    await expect(call(fetchFn as unknown as typeof fetch)).resolves.toEqual({ kind: 'offline' });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('recovers when a retry gets through', async () => {
    let n = 0;
    const fetchFn = jest.fn(async () => (n++ === 0 ? json(503, {}) : json(200, RESPONSE)));
    await expect(call(fetchFn as unknown as typeof fetch)).resolves.toMatchObject({ kind: 'ok' });
  });

  it('stops when the screen is left', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchFn = jest.fn();
    const outcome = await identify({
      apiUrl: 'https://api.example',
      deviceId: 'd',
      request: { species: 'cat', text: 'x', images: [], barcode: null, locale: 'es' },
      fetch: fetchFn as unknown as typeof fetch,
      signal: controller.signal,
    });
    expect(outcome).toEqual({ kind: 'offline' });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('a photo check', () => {
  const deps = {
    apiUrl: 'https://api.example',
    deviceId: () => 'id',
    encode: async (uri: string) => ({ data: `b64:${uri}`, hash: 'h' }),
    sleep: noSleep,
  };

  it('sends the photos, the trimmed text or null, and the language only', async () => {
    const fetchFn = jest.fn(async () => json(200, RESPONSE));
    await runPhotoCheck(
      { photos: ['a', 'b'], description: '   ', species: 'cat', language: 'es' },
      { ...deps, fetch: fetchFn as unknown as typeof fetch },
    );
    const body = JSON.parse(
      (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body).toEqual({
      species: 'cat',
      text: null,
      images: [
        { data: 'b64:a', hash: 'h' },
        { data: 'b64:b', hash: 'h' },
      ],
      barcode: null,
      locale: 'es',
    });
  });

  it('is "unavailable" in a build with no Worker URL, and sends nothing', async () => {
    const fetchFn = jest.fn();
    const outcome = await runPhotoCheck(
      { photos: ['a'], description: '', species: 'dog', language: 'en' },
      { ...deps, apiUrl: null, fetch: fetchFn as unknown as typeof fetch },
    );
    expect(outcome).toEqual({ kind: 'error', code: 'PROVIDER_UNAVAILABLE' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('calls a photo that cannot be made small enough unusable, and sends nothing', async () => {
    const fetchFn = jest.fn();
    const outcome = await runPhotoCheck(
      { photos: ['a'], description: 'x', species: 'dog', language: 'en' },
      { ...deps, encode: async () => null, fetch: fetchFn as unknown as typeof fetch },
    );
    expect(outcome).toEqual({ kind: 'error', code: 'IMAGE_UNUSABLE' });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('after a photo check (docs/05 §1 rule 5)', () => {
  it('always goes to Confirm, even when the server says no confirmation is needed', () => {
    const asIfExact = { ...RESPONSE, resolvedBy: 'kb_exact' as const, needsConfirmation: false };
    for (const response of [RESPONSE, asIfExact]) {
      expect(routeForPhotoOutcome({ kind: 'ok', response }, 'dog').pathname).toBe('/confirm');
    }
  });

  it.each([
    ['offline', { kind: 'offline' } as const],
    ['SPEND_CAP_EXCEEDED', { kind: 'error', code: 'SPEND_CAP_EXCEEDED' } as const],
    [
      'IMAGE_UNUSABLE',
      {
        kind: 'ok',
        response: { ...RESPONSE, imageQuality: { usable: false, reason: 'blur' } },
      } as const,
    ],
    ['NO_SUBJECT_FOUND', { kind: 'ok', response: { ...RESPONSE, candidates: [] } } as const],
  ])('shows the designed %s screen', (code, outcome) => {
    expect(routeForPhotoOutcome(outcome as IdentifyOutcome, 'cat')).toEqual({
      pathname: '/error',
      params: { code },
    });
  });
});

describe('Confirm choices', () => {
  it('leads with the most likely candidate and offers each other item once', () => {
    const choices = confirmChoices(RESPONSE);
    expect(choices?.primary.kbId).toBe('chocolate_dark');
    expect(choices?.others.map((o) => o.kbId)).toEqual(['chocolate_milk', 'chocolate_white']);
    expect(choices?.unmatched).toEqual(['Carob bar']);
  });

  it('turns every pick into an on-device result, unknown for what the KB lacks', () => {
    const exact = (text: string) => (text === 'uvas' ? 'grapes_raisins' : null);
    expect(confirmTarget({ kind: 'kb', kbId: 'chocolate_dark' }, 'dog', exact)).toEqual({
      kbId: 'chocolate_dark',
      species: 'dog',
    });
    expect(confirmTarget({ kind: 'named', label: 'Carob bar' }, 'cat', exact)).toEqual({
      unknown: '1',
      query: 'Carob bar',
      species: 'cat',
    });
    expect(confirmTarget({ kind: 'typed', text: ' uvas ' }, 'dog', exact)).toEqual({
      kbId: 'grapes_raisins',
      species: 'dog',
      query: 'uvas',
    });
    expect(confirmTarget({ kind: 'typed', text: 'uvaz' }, 'dog', exact)).toMatchObject({
      unknown: '1',
    });
    expect(confirmTarget({ kind: 'typed', text: 'u' }, 'dog', exact)).toBeNull();
  });
});

describe('photo identification needs the build and consent', () => {
  it('is off without consent, so declining leaves a text-only app', () => {
    expect(photoIdEnabled(false, true)).toBe(false);
    expect(photoIdEnabled(true, false)).toBe(false);
    expect(photoIdEnabled(true, true)).toBe(true);
  });
});

describe('the device id', () => {
  it('is a version-4 UUID, new each time', () => {
    const a = randomUuid();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(randomUuid()).not.toBe(a);
  });
});
