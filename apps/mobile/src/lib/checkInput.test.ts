import { canCheck } from './checkInput';

/**
 * docs/07 Phase 3 states the rule as "≥1 photo OR ≥2 characters" and requires the button's
 * enablement to match it exactly, unit tested. The table is the rule.
 */
describe('canCheck', () => {
  it.each([
    { photoCount: 0, description: '', expected: false },
    { photoCount: 0, description: 'a', expected: false },
    { photoCount: 0, description: 'ab', expected: true },
    { photoCount: 1, description: '', expected: true },
    { photoCount: 4, description: 'chocolate', expected: true },
  ])('photos=$photoCount description="$description" → $expected', ({ expected, ...input }) => {
    expect(canCheck(input)).toBe(expected);
  });

  it('does not count whitespace as a description', () => {
    // "  " would otherwise enable a check that can only ever come back `unknown`.
    expect(canCheck({ photoCount: 0, description: '   ' })).toBe(false);
    expect(canCheck({ photoCount: 0, description: ' a ' })).toBe(false);
    expect(canCheck({ photoCount: 0, description: ' ab ' })).toBe(true);
  });
});
