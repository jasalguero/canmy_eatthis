/**
 * "Did you mean…?" fixtures for `suggestText` (packages/shared). A suggestion is only ever a
 * tappable candidate — the verdict for the one a person picks still comes from the KB — so these
 * pin two things: that useful candidates are offered, and that gibberish and short common words
 * are offered nothing (a row of irrelevant chips teaches people to ignore the row).
 */
export const SUGGESTION_POSITIVES: { input: string; expectedIncludes: string }[] = [
  { input: 'onyoin', expectedIncludes: 'alliums' }, // two edits off "onion"
  { input: 'grap', expectedIncludes: 'grapes_raisins' },
  { input: 'peanut', expectedIncludes: 'peanut_butter' }, // the case `resolveText` refuses to guess
  { input: 'chocolat cake', expectedIncludes: 'chocolate_dark' }, // one word of the query
  { input: 'lily flower', expectedIncludes: 'lily' }, // an exact word of the query
  { input: 'cebollas verdes', expectedIncludes: 'alliums' }, // Spanish, prefix of the query
  { input: 'aguacate maduro', expectedIncludes: 'avocado' },
];

export const SUGGESTION_NEGATIVES: string[] = ['qwerty', 'zzzq', 'xx', 'the', 'beef', 'labrador'];
