/**
 * Positive resolution fixtures (docs/04-knowledge-base.md §6): input string -> expected kbId,
 * via the normalised alias index `build.ts` emits (exact/alias match only — fuzzy matching is
 * Phase 3). Covers case-insensitivity, plurals and accented/un-accented Spanish, which is what
 * `normalise()` is responsible for folding to the same key.
 */
export const POSITIVE_RESOLUTIONS: { input: string; expected: string }[] = [
  // Bare "chocolate" is an alias of the more severe entry on purpose (docs/02 D33): a plain
  // "chocolate" is the commonest dog-toxin query and must not answer "not sure".
  { input: 'chocolate', expected: 'chocolate_dark' },
  { input: 'Chocolate', expected: 'chocolate_dark' },
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
  { input: 'lemon', expected: 'lemon' },
  { input: 'limón', expected: 'lemon' },
  { input: 'limon', expected: 'lemon' }, // un-accented Spanish must still resolve
  { input: 'lemon peel', expected: 'lemon' },
  { input: 'pineapple', expected: 'pineapple' },
  { input: 'piña', expected: 'pineapple' },
  { input: 'pina', expected: 'pineapple' }, // un-accented Spanish must still resolve
  { input: 'ananá', expected: 'pineapple' },
  { input: 'apple', expected: 'apple' }, // the shorter word still means apple
];
