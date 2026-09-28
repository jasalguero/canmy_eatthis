import { z } from 'zod';

/**
 * Barcode → product → ingredient matches (docs/02-tech-decisions.md D8, D29).
 *
 * Shared by the app, which looks products up directly, and the Worker, so the two cannot disagree
 * about what a product contains (AGENTS.md #5). Network access is passed in as `fetch`, so this
 * module stays pure and testable.
 *
 * Pet food first, since that is this app's subject; regular Open Food Facts as the fallback,
 * since much of what people ask about (chocolate, xylitol gum, raisins) is human food a pet got
 * into.
 */

export const PET_FOOD_FACTS_BASE = 'https://world.openpetfoodfacts.org/api/v2/product';
export const FOOD_FACTS_BASE = 'https://world.openfoodfacts.org/api/v2/product';
export const BARCODE_TIMEOUT_MS = 4000;

export interface BarcodeProduct {
  productName: string | null;
  ingredientsText: string | null;
}

/** Only the fields we ask for; anything else in the response is ignored. */
const OpenFoodFactsResponseSchema = z.object({
  status: z.number(),
  product: z
    .object({
      product_name: z.string().optional().nullable(),
      ingredients_text: z.string().optional().nullable(),
    })
    .optional(),
});

/** A product body from either database, or `null` when it is not a found product. */
export function parseOpenFoodFactsProduct(body: unknown): BarcodeProduct | null {
  const parsed = OpenFoodFactsResponseSchema.safeParse(body);
  if (!parsed.success || parsed.data.status !== 1 || !parsed.data.product) return null;
  const blank = (value: string | null | undefined) => (value?.trim() ? value.trim() : null);
  return {
    productName: blank(parsed.data.product.product_name),
    ingredientsText: blank(parsed.data.product.ingredients_text),
  };
}

export type FetchLike = (
  url: string,
  init: { headers: Record<string, string>; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface LookupOptions {
  fetch: FetchLike;
  /** Open Food Facts asks every API client to identify itself. */
  userAgent: string;
  timeoutMs?: number;
}

/** EAN-8, EAN-13, UPC-A and UPC-E are all 8 to 13 digits. */
export function isPlausibleBarcode(value: string): boolean {
  return /^\d{8,14}$/.test(value);
}

async function fetchProduct(
  base: string,
  barcode: string,
  options: LookupOptions,
): Promise<BarcodeProduct | null> {
  const url = `${base}/${encodeURIComponent(barcode)}.json?fields=product_name,ingredients_text`;
  // Called detached, never as `options.fetch(…)`: the platform `fetch` (browsers, Cloudflare
  // Workers) throws "Illegal invocation" when its `this` is not the global object.
  const doFetch = options.fetch;
  const res = await doFetch(url, {
    headers: { 'User-Agent': options.userAgent },
    signal: AbortSignal.timeout(options.timeoutMs ?? BARCODE_TIMEOUT_MS),
  });
  // A 404 is Open Food Facts' "unknown product", not a failure.
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`barcode lookup failed: HTTP ${res.status}`);
  return parseOpenFoodFactsProduct(await res.json().catch(() => null));
}

/**
 * `null` when neither database knows the barcode. Throws when a database could not be reached
 * (offline, timeout, server error) — the caller decides how that degrades, and it must never be
 * reported as "not found".
 */
export async function lookupBarcode(
  barcode: string,
  options: LookupOptions,
): Promise<BarcodeProduct | null> {
  const pet = await fetchProduct(PET_FOOD_FACTS_BASE, barcode, options);
  if (pet) return pet;
  return fetchProduct(FOOD_FACTS_BASE, barcode, options);
}

/**
 * Splits a free-text ingredient list into candidate items. Open Food Facts lists are separated by
 * commas or semicolons, with sub-ingredients in brackets ("cocoa mass (cocoa beans)") and
 * percentages ("raisins 12%"), all of which would stop an item from matching an alias exactly.
 * Percentages go first: a decimal comma ("12,5 %") would otherwise be split as a separator.
 */
export function splitIngredients(ingredientsText: string): string[] {
  return ingredientsText
    .replace(/\d+(?:[.,]\d+)?\s*%/g, ' ')
    .split(/[,;()[\]{}]/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export interface IngredientMatcher {
  /** Exact alias resolution only — never fuzzy (see the Worker's `resolveExact`). */
  resolveExact: (text: string) => string | null;
  /** Whether the KB entry can appear in an ingredient list (`is_ingredient`). */
  isIngredient: (kbId: string) => boolean;
}

/**
 * The KB entries an ingredient list names, each once, in the order they first appear.
 *
 * Only entries flagged `is_ingredient` count. Without that filter, an entry such as vitamin D
 * supplements would match the "vitamin D3" that pet foods list as an ordinary ingredient, and
 * every such food would scan as toxic.
 */
export function matchIngredients(ingredientsText: string, matcher: IngredientMatcher): string[] {
  const matches: string[] = [];
  for (const item of splitIngredients(ingredientsText)) {
    const kbId = matcher.resolveExact(item);
    if (kbId && matcher.isIngredient(kbId) && !matches.includes(kbId)) matches.push(kbId);
  }
  return matches;
}
