import { getKbEntry, resolveExact } from './kb.js';
import type { Language } from './kb.js';

/**
 * Barcode → ingredient list (docs/02-tech-decisions.md D8). Free, instant and exact where a
 * photo is slow, costly and a guess — this is why doc07 Phase 5 wants it ahead of a model call,
 * not as a fallback from one.
 *
 * Pet food first, since that's this app's actual subject; regular Open Food Facts as a fallback,
 * since a lot of what people ask about (chocolate, xylitol gum, raisins) is human food a pet got
 * into, not pet food.
 */
const PET_FOOD_FACTS_BASE = 'https://world.openpetfoodfacts.org/api/v2/product';
const FOOD_FACTS_BASE = 'https://world.openfoodfacts.org/api/v2/product';

const BARCODE_TIMEOUT_MS = 4000;

export interface BarcodeProduct {
  productName: string | null;
  ingredientsText: string | null;
}

interface OpenFoodFactsResponse {
  status: number;
  product?: { product_name?: string; ingredients_text?: string };
}

async function fetchProduct(base: string, barcode: string): Promise<BarcodeProduct | null> {
  const url = `${base}/${encodeURIComponent(barcode)}.json?fields=product_name,ingredients_text`;
  // Open Food Facts asks every API client to identify itself with a User-Agent.
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CanMyEatThis/0.1 (hobby app; barcode ingredient lookup)' },
    signal: AbortSignal.timeout(BARCODE_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => ({ status: 0 }))) as OpenFoodFactsResponse;
  if (body.status !== 1 || !body.product) return null;
  return {
    productName: body.product.product_name ?? null,
    ingredientsText: body.product.ingredients_text ?? null,
  };
}

/** `null` on a genuine "not found" in either database. Throws only on a real network failure —
 * the caller (the route) is what decides how that degrades (docs/03 `PROVIDER_UNAVAILABLE`). */
export async function lookupBarcode(barcode: string): Promise<BarcodeProduct | null> {
  const pet = await fetchProduct(PET_FOOD_FACTS_BASE, barcode);
  if (pet) return pet;
  return fetchProduct(FOOD_FACTS_BASE, barcode);
}

export interface IngredientMatch {
  kbId: string;
  label: string;
}

/**
 * Scans a product's ingredient list against the KB's exact alias tier (`resolveExact` — never
 * fuzzy; see its doc comment for the "salt" → avocado false positive that rule exists for). This
 * is how a barcode scan catches xylitol in gum or onion powder in a stock cube without a model
 * call at all (D8). Ingredient lists are comma/semicolon
 * separated free text (Open Food Facts convention); each item is resolved independently and
 * de-duplicated by KB id, since the same entry (e.g. "cocoa mass" and "cocoa powder") can appear
 * as more than one line item.
 */
export function matchIngredientsAgainstKb(
  ingredientsText: string,
  language: Language,
): IngredientMatch[] {
  const items = ingredientsText
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);

  const matches = new Map<string, string>();
  for (const item of items) {
    const kbId = resolveExact(item);
    if (kbId && !matches.has(kbId)) {
      const entry = getKbEntry(kbId, language);
      if (entry) matches.set(kbId, entry.displayName);
    }
  }
  return [...matches.entries()].map(([kbId, label]) => ({ kbId, label }));
}
