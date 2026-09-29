import {
  type BarcodeProduct,
  lookupBarcode as lookupBarcodeShared,
  matchIngredients,
} from '@canmyeatthis/shared';
import { getKbEntry, resolveExact } from './kb.js';
import type { Language } from './kb.js';

/**
 * Barcode → ingredient list (docs/02-tech-decisions.md D8, D29). The lookup and the matching live
 * in `packages/shared`, which the app also uses to look products up directly, so the two cannot
 * disagree (AGENTS.md #5). This module only binds them to the Worker's `fetch` and bundled KB.
 */
export type { BarcodeProduct };

const USER_AGENT =
  'CanMyEatThis/0.1 (https://github.com/jasalguero/canmy_eatthis; canmy_eatthis@jasalguero.com)';

/**
 * `null` on a genuine "not found" in either database. Throws when a database could not be reached
 * or answered with an error — the caller (the route) decides how that degrades (docs/03
 * `PROVIDER_UNAVAILABLE`); it must never be reported as "not found".
 */
export function lookupBarcode(barcode: string): Promise<BarcodeProduct | null> {
  return lookupBarcodeShared(barcode, { fetch, userAgent: USER_AGENT });
}

export interface IngredientMatch {
  kbId: string;
  label: string;
}

/**
 * Scans a product's ingredient list against the KB's exact alias tier (`resolveExact` — never
 * fuzzy; see its doc comment for the "salt" → avocado false positive that rule exists for), and
 * only against entries flagged `is_ingredient`. This is how a barcode scan catches xylitol in gum
 * or onion powder in a stock cube without a model call at all (D8).
 */
export function matchIngredientsAgainstKb(
  ingredientsText: string,
  language: Language,
): IngredientMatch[] {
  const matches: IngredientMatch[] = [];
  const kbIds = matchIngredients(ingredientsText, {
    resolveExact,
    isIngredient: (kbId) => getKbEntry(kbId, language)?.isIngredient === true,
  });
  for (const kbId of kbIds) {
    const entry = getKbEntry(kbId, language);
    if (entry) matches.push({ kbId, label: entry.displayName });
  }
  return matches;
}
