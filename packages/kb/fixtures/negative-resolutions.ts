/**
 * Strings that must NOT resolve to any KB entry — the classic near-miss traps
 * (docs/04-knowledge-base.md §6, docs/07-implementation-plan.md Phase 1). Each one shares a
 * word with a real entry's display name or alias but names something different. Phase 1's
 * resolution is exact-match-on-normalised-alias only (fuzzy matching is Phase 4), so these
 * mostly guard against a future author accidentally adding one of these phrases as an alias.
 */
export const NEGATIVE_RESOLUTIONS: string[] = [
  'chocolate lab',
  'chocolate labrador',
  'peanut',
  'peanuts',
  'grapefruit',
  'raisin bran',
  'cheesecake',
  'chicken bone',
  'chicken bones',
  'garlic bread',
  'carrot cake',
  'wine gums',
];
