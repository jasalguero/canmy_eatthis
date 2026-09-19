/**
 * Positive resolution fixtures (docs/04-knowledge-base.md §6): input string -> expected kbId,
 * via the normalised alias index `build.ts` emits (exact/alias match only — fuzzy matching is
 * Phase 4). Covers case-insensitivity, plurals and accented/un-accented Spanish, which is what
 * `normalise()` is responsible for folding to the same key.
 */
export const POSITIVE_RESOLUTIONS = [
  { input: 'dark chocolate', expected: 'chocolate_dark' },
  { input: 'Chocolate negro', expected: 'chocolate_dark' },
  { input: 'DARK CHOCOLATE', expected: 'chocolate_dark' },
  { input: 'cocoa powder', expected: 'chocolate_dark' },
  { input: 'xilitol', expected: 'xylitol' },
  { input: 'birch sugar', expected: 'xylitol' },
  { input: 'uvas', expected: 'grapes_raisins' },
  { input: 'grape', expected: 'grapes_raisins' },
  { input: 'raisins', expected: 'grapes_raisins' },
  { input: 'cebolla', expected: 'alliums' },
  { input: 'onion powder', expected: 'alliums' },
  { input: 'ajo', expected: 'alliums' },
  { input: 'macadamias', expected: 'macadamia_nuts' },
  { input: 'lirio asiático', expected: 'lily' },
  { input: 'lirio asiatico', expected: 'lily' }, // un-accented Spanish must still resolve
  { input: 'easter lily', expected: 'lily' },
  { input: 'antifreeze', expected: 'antifreeze_ethylene_glycol' },
  { input: 'anticongelante', expected: 'antifreeze_ethylene_glycol' },
  { input: 'zanahorias', expected: 'carrot' },
];
