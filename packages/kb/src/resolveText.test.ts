import { buildAliasSearchIndex, resolveText, suggestText } from '@canmyeatthis/shared';
import { describe, expect, it } from 'vitest';
import { FUZZY_FALSE_FRIENDS, FUZZY_POSITIVE_RESOLUTIONS } from '../fixtures/fuzzy-resolutions.js';
import { NEGATIVE_RESOLUTIONS } from '../fixtures/negative-resolutions.js';
import { POSITIVE_RESOLUTIONS } from '../fixtures/resolution.fixtures.js';
import { SUGGESTION_NEGATIVES, SUGGESTION_POSITIVES } from '../fixtures/suggestions.js';
import { buildAliasIndex, loadEntries } from './build.js';

/**
 * `resolveText` (the fuzzy tier, docs/07 Phase 3) lives in `packages/shared` (AGENTS.md #5), but
 * it can only be proven against the real KB here — `packages/shared` cannot depend on
 * `packages/kb` without a cycle (see `resolved-kb-entry.ts`'s doc comment), so its own unit
 * tests use a small synthetic index instead. This is the test that exercises it against what
 * actually ships.
 */
const realEntries = loadEntries().map((l) => l.entry);

describe('resolveText against the real KB', () => {
  const index = buildAliasIndex(realEntries);
  const searchIndex = buildAliasSearchIndex(index);

  it('still resolves every exact/alias fixture (unchanged by adding the fuzzy tier)', () => {
    for (const { input, expected } of POSITIVE_RESOLUTIONS) {
      expect(resolveText(input, index, searchIndex)).toEqual({ type: 'exact', kbId: expected });
    }
  });

  it('resolves realistic typos via the fuzzy tier', () => {
    for (const { input, expected } of FUZZY_POSITIVE_RESOLUTIONS) {
      expect(resolveText(input, index, searchIndex)).toEqual({ type: 'fuzzy', kbId: expected });
    }
  });

  it('the negative near-miss set still fails to match under fuzzy resolution', () => {
    for (const query of NEGATIVE_RESOLUTIONS) {
      expect(resolveText(query, index, searchIndex)).toEqual({ type: 'none', kbId: null });
    }
  });

  it('does not resolve a short word that only looks like a match by substring', () => {
    for (const query of FUZZY_FALSE_FRIENDS) {
      expect(resolveText(query, index, searchIndex)).toEqual({ type: 'none', kbId: null });
    }
  });
});

describe('every shipped entry resolves from both languages (docs/07 Phase 1)', () => {
  const index = buildAliasIndex(realEntries);
  const searchIndex = buildAliasSearchIndex(index);

  it('resolves each entry from its display name and its first alias, in en and es', () => {
    for (const entry of realEntries) {
      for (const lang of ['en', 'es'] as const) {
        for (const text of [entry.display_name[lang], entry.aliases[lang][0] as string]) {
          expect(resolveText(text, index, searchIndex), `${entry.id} (${lang}): "${text}"`).toEqual(
            {
              type: 'exact',
              kbId: entry.id,
            },
          );
        }
      }
    }
  });

  it('resolves an English-only alias regardless of the app language (one merged index)', () => {
    // `resolveText` takes no language: an English alias works for a Spanish user and vice versa.
    expect(resolveText('birch sugar', index, searchIndex)).toEqual({
      type: 'exact',
      kbId: 'xylitol',
    });
    expect(resolveText('cebolla', index, searchIndex)).toEqual({ type: 'exact', kbId: 'alliums' });
  });
});

describe('suggestText against the real KB', () => {
  const index = buildAliasIndex(realEntries);
  const searchIndex = buildAliasSearchIndex(index);

  it('offers the entry a typo, prefix or word of the query points at', () => {
    for (const { input, expectedIncludes } of SUGGESTION_POSITIVES) {
      expect(suggestText(input, index, searchIndex), input).toContain(expectedIncludes);
    }
  });

  it('offers nothing for gibberish or a short common word', () => {
    for (const query of SUGGESTION_NEGATIVES) {
      expect(suggestText(query, index, searchIndex), query).toEqual([]);
    }
  });

  it('never offers more than three, or the entry the query already resolves to as its own alias', () => {
    for (const { input } of SUGGESTION_POSITIVES) {
      expect(suggestText(input, index, searchIndex).length).toBeLessThanOrEqual(3);
    }
    expect(suggestText('dark chocolate', index, searchIndex)).not.toContain('chocolate_dark');
  });
});
