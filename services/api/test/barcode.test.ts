import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupBarcode, matchIngredientsAgainstKb } from '../src/barcode.js';

/**
 * `fetch` is mocked here so the committed suite stays hermetic (doc07 Phase 4's "CI makes zero
 * live model calls" spirit extends to every external call, not just the vision providers) — this
 * module was additionally verified once against the real Open Food Facts API by hand (a real
 * Nutella barcode), which is not repeated here to keep tests fast and network-independent.
 */
afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetchSequence(responses: Array<{ ok: boolean; status?: number; body?: unknown }>) {
  let call = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      const next = responses[call] ?? responses.at(-1);
      call++;
      return {
        ok: next?.ok ?? false,
        status: next?.status ?? (next?.ok ? 200 : 500),
        json: async () => next?.body,
      } as Response;
    }),
  );
}

describe('lookupBarcode', () => {
  it('returns the pet-food-facts product when found there', async () => {
    mockFetchSequence([
      {
        ok: true,
        body: { status: 1, product: { product_name: 'Chew Treat', ingredients_text: 'chicken' } },
      },
    ]);
    const result = await lookupBarcode('1234567890123');
    expect(result).toEqual({ productName: 'Chew Treat', ingredientsText: 'chicken' });
  });

  it('falls back to Open Food Facts when the pet database has no match', async () => {
    mockFetchSequence([
      { ok: true, body: { status: 0 } },
      {
        ok: true,
        body: {
          status: 1,
          product: { product_name: 'Nutella', ingredients_text: 'sugar, palm oil' },
        },
      },
    ]);
    const result = await lookupBarcode('3017620422003');
    expect(result?.productName).toBe('Nutella');
  });

  it('returns null when neither database has the barcode', async () => {
    mockFetchSequence([
      { ok: true, body: { status: 0 } },
      { ok: true, body: { status: 0 } },
    ]);
    expect(await lookupBarcode('0000000000000')).toBeNull();
  });

  it('returns null when both databases answer 404, which is how they report an unknown product', async () => {
    mockFetchSequence([
      { ok: false, status: 404, body: { status: 0 } },
      { ok: false, status: 404, body: { status: 0 } },
    ]);
    expect(await lookupBarcode('4006381333932')).toBeNull();
  });

  // It used to return null here too, which reported a database outage as "product not found".
  it('throws on a server error, so an outage is never reported as "not found"', async () => {
    mockFetchSequence([{ ok: false, status: 503 }]);
    await expect(lookupBarcode('3017620422003')).rejects.toThrow('HTTP 503');
  });
});

describe('matchIngredientsAgainstKb', () => {
  it('finds a KB-known ingredient in a comma-separated list', () => {
    const matches = matchIngredientsAgainstKb('sugar, xylitol, water', 'en');
    expect(matches).toEqual([{ kbId: 'xylitol', label: 'Xylitol' }]);
  });

  it('matches multiple distinct entries and de-duplicates repeats', () => {
    const matches = matchIngredientsAgainstKb('onion powder; garlic; onion', 'en');
    expect(matches).toEqual([{ kbId: 'alliums', label: 'Onion, garlic, leek or chive' }]);
  });

  it('returns an empty list when nothing in the ingredients matches the KB', () => {
    expect(matchIngredientsAgainstKb('water, salt, rice flour', 'en')).toEqual([]);
  });

  it('never fuzzy-matches an ingredient line — "salt" must not become avocado ("palta")', () => {
    expect(matchIngredientsAgainstKb('salt, sugar, sal, azúcar', 'en')).toEqual([]);
  });

  // Pet foods list vitamin D3 as an ordinary ingredient; only `is_ingredient` entries may match.
  it('does not match entries that are not ingredients, like vitamin D supplements', () => {
    expect(matchIngredientsAgainstKb('chicken, rice, vitamin D3, vitamin D', 'en')).toEqual([]);
  });

  it('matches through brackets and percentages', () => {
    const matches = matchIngredientsAgainstKb('flour, fruit (raisins 12%), water', 'en');
    expect(matches.map((m) => m.kbId)).toEqual(['grapes_raisins']);
  });

  it('resolves in the requested language', () => {
    const matches = matchIngredientsAgainstKb('azúcar, xilitol, agua', 'es');
    expect(matches).toEqual([{ kbId: 'xylitol', label: 'Xilitol' }]);
  });
});
