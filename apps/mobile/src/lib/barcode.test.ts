import type { FetchLike } from '@canmyeatthis/shared';

import { lookupProduct } from './barcode';

const PET = 'https://world.openpetfoodfacts.org';
const FOOD = 'https://world.openfoodfacts.org';
const NOT_FOUND = { status: 404, body: { status: 0, status_verbose: 'product not found' } };

/** Answers by URL prefix; anything unlisted behaves like no network. */
function fakeFetch(responses: Record<string, { status: number; body: unknown }>): FetchLike {
  return async (url) => {
    const hit = Object.entries(responses).find(([prefix]) => url.startsWith(prefix));
    if (!hit) throw new TypeError('Network request failed');
    const [, { status, body }] = hit;
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
}

function found(product: { product_name?: string; ingredients_text?: string }) {
  return { status: 200, body: { status: 1, product } };
}

describe('lookupProduct', () => {
  it('matches ingredients against the bundled KB, and never vitamin D3', async () => {
    const result = await lookupProduct(
      '5000000000001',
      'en',
      fakeFetch({
        [PET]: NOT_FOUND,
        [FOOD]: found({
          product_name: 'Fruit loaf',
          ingredients_text: 'Wheat flour, fruit (raisins 12%), sugar, vitamin D3, xylitol',
        }),
      }),
    );
    expect(result).toEqual({
      kind: 'found',
      productName: 'Fruit loaf',
      ingredientsText: 'Wheat flour, fruit (raisins 12%), sugar, vitamin D3, xylitol',
      matches: ['grapes_raisins', 'xylitol'],
    });
  });

  it('resolves Spanish ingredient lists too', async () => {
    const result = await lookupProduct(
      '8400000000001',
      'es',
      fakeFetch({
        [PET]: NOT_FOUND,
        [FOOD]: found({ product_name: 'Chicle', ingredients_text: 'goma base, xilitol, aroma' }),
      }),
    );
    expect(result.kind === 'found' && result.matches).toEqual(['xylitol']);
  });

  it('reports a found product with no recognised ingredients as found, with no matches', async () => {
    const result = await lookupProduct(
      '5000000000002',
      'en',
      fakeFetch({ [PET]: found({ product_name: 'Rice cakes', ingredients_text: 'rice, salt' }) }),
    );
    // "salt" must not fuzzy-match "palta" (avocado): ingredient lines are exact-only.
    expect(result).toMatchObject({ kind: 'found', matches: [] });
  });

  it('distinguishes a product without an ingredient list', async () => {
    const result = await lookupProduct(
      '5000000000003',
      'en',
      fakeFetch({ [PET]: found({ product_name: 'Mystery bar' }) }),
    );
    expect(result).toEqual({ kind: 'no_ingredients', productName: 'Mystery bar' });
  });

  it('reports not_found only when both databases say so', async () => {
    const result = await lookupProduct(
      '4006381333932',
      'en',
      fakeFetch({ [PET]: NOT_FOUND, [FOOD]: NOT_FOUND }),
    );
    expect(result).toEqual({ kind: 'not_found' });
  });

  it('reports unavailable, never not_found, when offline or on a server error', async () => {
    expect(await lookupProduct('3017620422003', 'en', fakeFetch({}))).toEqual({
      kind: 'unavailable',
    });
    const serverError = fakeFetch({ [PET]: { status: 503, body: {} } });
    expect(await lookupProduct('3017620422003', 'en', serverError)).toEqual({
      kind: 'unavailable',
    });
  });
});
