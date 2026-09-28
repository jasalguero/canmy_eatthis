export * from './schemas/index.js';
export { normalise } from './normalise.js';
export { resolveVerdict } from './resolveVerdict.js';
export { HOTLINES, hotlinesForRegion } from './hotlines.js';
export {
  BARCODE_TIMEOUT_MS,
  FOOD_FACTS_BASE,
  PET_FOOD_FACTS_BASE,
  isPlausibleBarcode,
  lookupBarcode,
  matchIngredients,
  parseOpenFoodFactsProduct,
  splitIngredients,
  type BarcodeProduct,
  type FetchLike,
  type IngredientMatcher,
  type LookupOptions,
} from './barcode.js';
export {
  buildAliasSearchIndex,
  resolveText,
  type AliasIndex,
  type AliasSearchIndex,
  type TextResolution,
  type TextResolutionType,
} from './resolveText.js';
