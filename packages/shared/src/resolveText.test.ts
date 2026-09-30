import { describe, expect, it } from 'vitest';
import { type AliasIndex, buildAliasSearchIndex, resolveText, suggestText } from './resolveText.js';

/**
 * A small synthetic index rather than the real KB — `packages/kb` depends on `packages/shared`
 * (see `resolved-kb-entry.ts`'s doc comment), so a cycle-free unit test here has to build its
 * own fixture. `packages/kb/src/resolveText.test.ts` covers the real KB + the fixture lists.
 */
const INDEX: AliasIndex = {
  onion: 'alliums',
  onions: 'alliums',
  garlic: 'alliums',
  xylitol: 'xylitol',
  'birch sugar': 'xylitol',
  'dark chocolate': 'chocolate_dark',
  'baking chocolate': 'chocolate_dark',
  'milk chocolate': 'chocolate_milk',
  'chocolate bar': 'chocolate_milk',
  carrot: 'carrot',
  queso: 'cheese',
  palta: 'avocado',
  vino: 'alcohol',
  'peanut butter': 'peanut_butter',
  'peanut spread': 'peanut_butter',
};

function resolve(query: string) {
  return resolveText(query, INDEX, buildAliasSearchIndex(INDEX));
}

describe('resolveText', () => {
  it('resolves an exact alias match', () => {
    expect(resolve('onion')).toEqual({ type: 'exact', kbId: 'alliums' });
    // normalise() folds case/plurals before lookup, so this is still exact, not fuzzy.
    expect(resolve('Onions')).toEqual({ type: 'exact', kbId: 'alliums' });
  });

  it('resolves an unambiguous typo via fuzzy match', () => {
    expect(resolve('onyon')).toEqual({ type: 'fuzzy', kbId: 'alliums' });
    expect(resolve('zylitol')).toEqual({ type: 'fuzzy', kbId: 'xylitol' });
    expect(resolve('garlik')).toEqual({ type: 'fuzzy', kbId: 'alliums' });
  });

  it('never resolves an unrelated word, even one that shares a substring', () => {
    // "chocolate lab" shares "chocolate" with two entries but names a dog breed.
    expect(resolve('chocolate lab')).toEqual({ type: 'none', kbId: null });
    expect(resolve('grapefruit')).toEqual({ type: 'none', kbId: null });
  });

  it('does not resolve a short word just because it is a near-perfect prefix of a longer alias', () => {
    // "peanut" scores *better* against "peanut butter" than real typos score against their
    // target, because Fuse's substring match ignores the missing second word entirely. A raw
    // peanut and peanut butter are a different safety question, so this must stay `none`.
    expect(resolve('peanut')).toEqual({ type: 'none', kbId: null });
    expect(resolve('peanuts')).toEqual({ type: 'none', kbId: null });
  });

  it('only resolves a short query via a same-sound spelling, never a one-letter-off real word', () => {
    // "kueso"→queso and "hueso"→queso score identically in Fuse; only the first is a typo.
    expect(resolve('kueso')).toEqual({ type: 'fuzzy', kbId: 'cheese' });
    expect(resolve('hueso')).toEqual({ type: 'none', kbId: null });
    // "salt" is one letter from "palta" (avocado) — the bug that prompted this rule.
    expect(resolve('salt')).toEqual({ type: 'none', kbId: null });
    expect(resolve('pino')).toEqual({ type: 'none', kbId: null });
  });

  it('refuses to guess when a typo is equally close to two different entries', () => {
    // "chocolat"/"choclate" sit almost equidistant between chocolate_dark and chocolate_milk —
    // AGENTS.md #10 / D9: no match beats a coin flip between two real entries.
    expect(resolve('chocolat')).toEqual({ type: 'none', kbId: null });
    expect(resolve('choclate')).toEqual({ type: 'none', kbId: null });
  });

  it('does not treat multiple aliases of the *same* entry as ambiguous', () => {
    // "onion" and "onions" both resolve to alliums — that's agreement, not ambiguity.
    expect(resolve('onyons')).toEqual({ type: 'fuzzy', kbId: 'alliums' });
  });

  it('returns none for an empty or whitespace-only query', () => {
    expect(resolve('')).toEqual({ type: 'none', kbId: null });
    expect(resolve('   ')).toEqual({ type: 'none', kbId: null });
  });
});

describe('suggestText', () => {
  const suggest = (query: string) => suggestText(query, INDEX, buildAliasSearchIndex(INDEX));

  it('offers the entry a typo is close to', () => {
    expect(suggest('carrott')).toEqual(['carrot']);
  });

  it('offers an entry whose alias the query is a prefix of, which resolveText will not guess', () => {
    expect(resolve('peanut')).toEqual({ type: 'none', kbId: null });
    expect(suggest('peanut')).toEqual(['peanut_butter']);
  });

  it('returns each entry once, however many of its aliases match', () => {
    expect(suggest('onyon')).toEqual(['alliums']);
  });

  it('offers nothing for gibberish, a short word, or an empty query', () => {
    expect(suggest('qwerty')).toEqual([]);
    expect(suggest('xy')).toEqual([]);
    expect(suggest('  ')).toEqual([]);
  });

  it('never offers the entry the query is already an alias of', () => {
    expect(suggest('dark chocolate')).not.toContain('chocolate_dark');
  });
});
