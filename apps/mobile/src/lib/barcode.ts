import { type FetchLike, lookupBarcode, matchIngredients } from '@canmyeatthis/shared';

import type { SupportedLanguage } from '@/i18n/namespaces';
import { getKbEntry, resolveExactOffline } from '@/lib/offlineKb';

/**
 * The app's barcode lookup (docs/02-tech-decisions.md D29): the phone asks Open Pet Food Facts,
 * then Open Food Facts, directly — no server of ours, no key. The lookup and the ingredient
 * matching are the shared ones the Worker also uses (AGENTS.md #5).
 *
 * Every outcome is its own case, because each one needs a different, honest answer:
 * an unreachable database must never read as "product not found", and a product none of whose
 * ingredients are in the KB must never read as harmless.
 */
export type ProductLookup =
  /** Found, with an ingredient list. `matches` may be empty: nothing in it is in the KB. */
  | { kind: 'found'; productName: string | null; ingredientsText: string; matches: string[] }
  /** Found, but the database has no ingredient list for it. */
  | { kind: 'no_ingredients'; productName: string | null }
  | { kind: 'not_found' }
  /** No connection, a timeout, or a database error. */
  | { kind: 'unavailable' };

/** Open Food Facts asks every API client to identify itself. */
export const USER_AGENT =
  'CanMyEatThis/0.1 (https://github.com/jasalguero/canmy_eatthis; canmy_eatthis@jasalguero.com)';

export async function lookupProduct(
  barcode: string,
  language: SupportedLanguage,
  fetchImpl: FetchLike = fetch,
): Promise<ProductLookup> {
  let product: Awaited<ReturnType<typeof lookupBarcode>>;
  try {
    product = await lookupBarcode(barcode, { fetch: fetchImpl, userAgent: USER_AGENT });
  } catch {
    return { kind: 'unavailable' };
  }
  if (!product) return { kind: 'not_found' };
  if (!product.ingredientsText) return { kind: 'no_ingredients', productName: product.productName };

  const matches = matchIngredients(product.ingredientsText, {
    resolveExact: resolveExactOffline,
    isIngredient: (kbId) => getKbEntry(kbId, language)?.isIngredient === true,
  });
  return {
    kind: 'found',
    productName: product.productName,
    ingredientsText: product.ingredientsText,
    matches,
  };
}
