/**
 * Typo fixtures for the fuzzy-match tier (docs/07-implementation-plan.md Phase 4, docs/02
 * D9: "tune the threshold against a fixture set of real typos"). Unlike
 * `resolution.fixtures.ts` (exact/alias match only), these deliberately do NOT appear as
 * aliases anywhere in `packages/kb/data` — each is a plausible misspelling or keyboard slip of
 * a real alias, chosen so it is unambiguous: it is close in both edit-distance and length to
 * exactly one entry's alias, never equidistant between two (see `resolveText.ts`'s ambiguity
 * guard, which is why a bare "chocolate" is *not* in this list — it sits between
 * `chocolate_dark` and `chocolate_milk` and correctly resolves to nothing).
 */
export const FUZZY_POSITIVE_RESOLUTIONS: { input: string; expected: string }[] = [
  { input: 'onyon', expected: 'alliums' }, // docs/01-architecture.md's own example
  { input: 'garlik', expected: 'alliums' },
  { input: 'onyons', expected: 'alliums' },
  { input: 'zylitol', expected: 'xylitol' },
  { input: 'xylytol', expected: 'xylitol' },
  { input: 'silitol', expected: 'xylitol' }, // Spanish "xilitol" typo
  { input: 'antifreze', expected: 'antifreeze_ethylene_glycol' },
  { input: 'anticongelantte', expected: 'antifreeze_ethylene_glycol' },
  { input: 'macadmia', expected: 'macadamia_nuts' },
  { input: 'avocaddo', expected: 'avocado' },
  { input: 'agwacate', expected: 'avocado' }, // Spanish "aguacate" typo
  { input: 'gwacamole', expected: 'avocado' },
  { input: 'carrott', expected: 'carrot' },
  { input: 'zanaoria', expected: 'carrot' }, // Spanish "zanahoria" typo
  { input: 'sebolla', expected: 'alliums' }, // Spanish "cebolla" typo
  { input: 'kueso', expected: 'cheese' }, // Spanish "queso" typo
  { input: 'raticid', expected: 'rodenticide' },
  { input: 'rodentisida', expected: 'rodenticide' }, // Spanish "raticida" typo
  { input: 'espreso', expected: 'caffeine' },
];

/**
 * Words that must NOT resolve via the fuzzy tier even though they score well against a real
 * alias by substring alone — the length-ratio guard in `resolveText.ts` exists specifically for
 * these. A raw peanut and peanut butter are a different safety question (the KB entry is
 * specifically about xylitol-containing peanut butter), so this is not just a near-miss like
 * `NEGATIVE_RESOLUTIONS` — it is a case fuzzy matching would get *more* confidently wrong than a
 * real typo, because "peanut" is scored as a near-perfect (unpenalised) prefix of "peanut butter".
 */
export const FUZZY_FALSE_FRIENDS: string[] = ['peanut', 'peanuts', 'maní'];
