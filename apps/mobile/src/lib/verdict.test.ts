import { buildRealVerdict, buildUnknownVerdict } from './verdict';

describe('buildRealVerdict', () => {
  it('produces a real, schema-valid payload from the bundled KB', () => {
    const payload = buildRealVerdict({
      kbId: 'chocolate_dark',
      species: 'dog',
      language: 'en',
      disclaimer: 'Not a substitute for veterinary advice.',
    });
    expect(payload.kbId).toBe('chocolate_dark');
    expect(payload.displayName).toBe('Dark chocolate');
    expect(payload.verdict).toBe('toxic');
    expect(payload.severity).toBe('moderate');
    expect(payload.sources.length).toBeGreaterThan(0);
  });

  it('throws for an id the bundled KB does not have — a caller bug, not a user-facing state', () => {
    expect(() =>
      buildRealVerdict({
        kbId: 'not_a_real_id',
        species: 'dog',
        language: 'en',
        disclaimer: 'x',
      }),
    ).toThrow();
  });
});

describe('buildUnknownVerdict', () => {
  it('produces a real unknown verdict that never says "safe" and needs no source', () => {
    const payload = buildUnknownVerdict({
      query: '  the mystery leaf from next door  ',
      species: 'cat',
      language: 'en',
      disclaimer: 'Not a substitute for veterinary advice.',
      headline: 'Not sure — ask your vet',
      summary: 'This is not in our knowledge base, so we will not guess.',
    });
    expect(payload.verdict).toBe('unknown');
    expect(payload.severity).toBeNull();
    expect(payload.sources).toEqual([]);
    expect(/safe/i.test(payload.headline)).toBe(false);
    // Shows back what the user typed, trimmed — never invents an item name.
    expect(payload.displayName).toBe('the mystery leaf from next door');
  });
});
