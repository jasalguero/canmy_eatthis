import { describe, expect, it } from 'vitest';
import {
  type FetchLike,
  isPlausibleBarcode,
  lookupBarcode,
  matchIngredients,
  parseOpenFoodFactsProduct,
  splitIngredients,
} from './barcode.js';

// Response bodies as Open Food Facts returned them (2026-09-28), trimmed to the fields we ask for.
const FOUND = {
  code: '3017620422003',
  product: {
    ingredients_text:
      'Sucre, huile de palme, NOISETTES 13%, cacao maigre 7,4%, LAIT écrémé en poudre 6,6%, LACTOSERUM en poudre, émulsifiants: lécithines [SOJA), vanilline. Sans gluten.',
    product_name: 'Nutella',
  },
  status: 1,
  status_verbose: 'product found',
};
const NOT_FOUND = { code: '4006381333932', status: 0, status_verbose: 'product not found' };
const INVALID = { code: '00000000', status: 0, status_verbose: 'no code or invalid code' };

describe('parseOpenFoodFactsProduct', () => {
  it('reads a found product', () => {
    expect(parseOpenFoodFactsProduct(FOUND)).toEqual({
      productName: 'Nutella',
      ingredientsText: FOUND.product.ingredients_text,
    });
  });

  it('is null for not-found, invalid and malformed bodies', () => {
    for (const body of [NOT_FOUND, INVALID, null, 'nope', { status: 1 }]) {
      expect(parseOpenFoodFactsProduct(body)).toBeNull();
    }
  });

  it('turns blank fields into null', () => {
    expect(
      parseOpenFoodFactsProduct({
        status: 1,
        product: { product_name: '  ', ingredients_text: '' },
      }),
    ).toEqual({ productName: null, ingredientsText: null });
  });
});

describe('isPlausibleBarcode', () => {
  it('accepts 8 to 14 digits only', () => {
    expect(isPlausibleBarcode('3017620422003')).toBe(true);
    expect(isPlausibleBarcode('12345678')).toBe(true);
    for (const bad of ['', '1234567', '123456789012345', '30176204a2003', 'https://x.y']) {
      expect(isPlausibleBarcode(bad)).toBe(false);
    }
  });
});

describe('splitIngredients', () => {
  it('splits on commas, semicolons and brackets, and drops percentages', () => {
    expect(splitIngredients('sugar, cocoa mass (cocoa beans) 45%; raisins 12,5 %, onion')).toEqual([
      'sugar',
      'cocoa mass',
      'cocoa beans',
      'raisins',
      'onion',
    ]);
  });
});

describe('matchIngredients', () => {
  const aliases: Record<string, string> = {
    raisins: 'grapes_raisins',
    'onion powder': 'alliums',
    'vitamin d3': 'vitamin_d_supplements',
  };
  const matcher = {
    resolveExact: (text: string) => aliases[text.toLowerCase()] ?? null,
    isIngredient: (kbId: string) => kbId !== 'vitamin_d_supplements',
  };

  it('returns each matched entry once, in order', () => {
    expect(matchIngredients('Raisins, onion powder, water, raisins', matcher)).toEqual([
      'grapes_raisins',
      'alliums',
    ]);
  });

  it('ignores entries that are not ingredients, like vitamin D supplements', () => {
    expect(matchIngredients('chicken, rice, vitamin D3', matcher)).toEqual([]);
  });
});

function fakeFetch(responses: Record<string, { status: number; body: unknown }>): FetchLike {
  return async (url) => {
    const hit = Object.entries(responses).find(([prefix]) => url.startsWith(prefix));
    if (!hit) throw new TypeError('Network request failed');
    const [, { status, body }] = hit;
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
}

const PET = 'https://world.openpetfoodfacts.org';
const FOOD = 'https://world.openfoodfacts.org';
const opts = (fetch: FetchLike) => ({ fetch, userAgent: 'test' });

describe('lookupBarcode', () => {
  it('prefers the pet food database', async () => {
    const fetch = fakeFetch({
      [PET]: { status: 200, body: { status: 1, product: { product_name: 'Kibble' } } },
      [FOOD]: { status: 200, body: FOUND },
    });
    expect((await lookupBarcode('3017620422003', opts(fetch)))?.productName).toBe('Kibble');
  });

  it('falls back to Open Food Facts when pet food does not know the product', async () => {
    const fetch = fakeFetch({
      [PET]: { status: 404, body: NOT_FOUND },
      [FOOD]: { status: 200, body: FOUND },
    });
    expect((await lookupBarcode('3017620422003', opts(fetch)))?.productName).toBe('Nutella');
  });

  it('is null when neither database knows it', async () => {
    const fetch = fakeFetch({
      [PET]: { status: 404, body: NOT_FOUND },
      [FOOD]: { status: 404, body: NOT_FOUND },
    });
    expect(await lookupBarcode('4006381333932', opts(fetch))).toBeNull();
  });

  // A server error or no network must never be reported as "product not found".
  it('throws on a server error rather than reporting not-found', async () => {
    const fetch = fakeFetch({ [PET]: { status: 503, body: {} } });
    await expect(lookupBarcode('3017620422003', opts(fetch))).rejects.toThrow('HTTP 503');
  });

  // The platform `fetch` rejects a `this` that is not the global object ("Illegal invocation").
  it('calls fetch detached, not as a method of the options object', async () => {
    const options = {
      userAgent: 'test',
      fetch: function (this: unknown) {
        if (this !== undefined) throw new TypeError('Illegal invocation');
        return Promise.resolve({ ok: false, status: 404, json: async () => NOT_FOUND });
      } as FetchLike,
    };
    expect(await lookupBarcode('4006381333932', options)).toBeNull();
  });

  it('throws when offline', async () => {
    await expect(lookupBarcode('3017620422003', opts(fakeFetch({})))).rejects.toThrow();
  });
});
