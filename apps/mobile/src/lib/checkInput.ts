/**
 * When is the Check button enabled?
 *
 * docs/07 Phase 3 states the rule as "≥1 photo OR ≥2 characters" and requires it to be unit
 * tested, so it lives here as a pure function rather than as a boolean expression inline in the
 * Home screen. The button and the test then read the same rule, and a screen cannot drift from
 * it by adding a condition of its own.
 *
 * Whitespace does not count: two spaces is not a description, and trimming here is what stops
 * " " from enabling a check that can only ever come back `unknown`.
 */
export const MIN_DESCRIPTION_LENGTH = 2;

export interface CheckInput {
  photoCount: number;
  description: string;
}

export function canCheck({ photoCount, description }: CheckInput): boolean {
  return photoCount >= 1 || description.trim().length >= MIN_DESCRIPTION_LENGTH;
}
