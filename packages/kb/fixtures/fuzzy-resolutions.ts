/**
 * Typo fixtures for the fuzzy-match tier (docs/07-implementation-plan.md Phase 3, docs/02
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
  { input: 'expresso', expected: 'caffeine' },
  { input: 'avocato', expected: 'avocado' },
  { input: 'mozarella', expected: 'cheese' },
];

/**
 * Words that must NOT resolve via the fuzzy tier even though they score well against a real
 * alias by substring alone — the length-ratio guard in `resolveText.ts` exists specifically for
 * these. A raw peanut and peanut butter are a different safety question (the KB entry is
 * specifically about xylitol-containing peanut butter), so this is not just a near-miss like
 * `NEGATIVE_RESOLUTIONS` — it is a case fuzzy matching would get *more* confidently wrong than a
 * real typo, because "peanut" is scored as a near-perfect (unpenalised) prefix of "peanut butter".
 */
export const FUZZY_FALSE_FRIENDS: string[] = [
  'peanut',
  'peanuts',
  'maní',
  // Short real words one edit away from a *different* entry's alias, scoring as well as a genuine
  // typo (0.17–0.25). Found by sweeping common English/Spanish food words against the built
  // `kb.index.json` — see D22's addendum in docs/02-tech-decisions.md and `SHORT_QUERY_MAX_LENGTH`
  // in `packages/shared/src/resolveText.ts`. Target alias (entry) in each comment.
  'salt', // palta (avocado)
  'salts', // normalises to "salt"
  'sal', // Spanish "salt"
  'hueso', // queso (cheese) — "bone"; the same score as the real typo "kueso"
  'masa', // pasa (grapes_raisins) — "dough", which is itself a *different* entry
  'papa', // pasa (grapes_raisins) — "potato"
  'pino', // vino (alcohol) — "pine"
  'pine', // wine (alcohol)
  'beef', // beer (alcohol)
  'beet', // beer (alcohol)
  'lime', // lilie (lily)
  'cake', // cafe (caffeine)
  'chip', // chive (alliums)
  'chips', // chive (alliums)
  'chile', // chive (alliums)
  'curry', // currant (grapes_raisins)
  'perro', // puerro (alliums) — "dog"
  'bollo', // cebolla (alliums) — "bun"
  'arroz', // carrot — "rice"
  'corn', // licor (alcohol)
  'cereza', // cerveza (alcohol) — "cherry"; the same score as the real typo "garlik"
  'licorice', // licore (alcohol) — the one long false friend, caught by the Fuse score cutoff
];
