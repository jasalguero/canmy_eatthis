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
  // Spanish near-misses (docs/07 Phase 4 acceptance: "including its Spanish near-misses").
  'perro chocolate', // shares "chocolate" — a breed, not the food
  'maní', // shares "maní" with the peanut-butter aliases — the nut itself, not the spread
  'tarta de queso', // shares "queso" — cheesecake, not cheese
  'pan de ajo', // shares "ajo" — garlic bread, a prepared dish
  'hueso de pollo', // shares "pollo" — a bone, not cooked plain chicken
  'tarta de zanahoria', // shares "zanahoria" — carrot cake, not a carrot
];
