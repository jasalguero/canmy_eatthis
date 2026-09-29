import { buildAliasSearchIndex, resolveText } from '@canmyeatthis/shared';
import { describe, expect, it } from 'vitest';
import { FUZZY_FALSE_FRIENDS, FUZZY_POSITIVE_RESOLUTIONS } from '../fixtures/fuzzy-resolutions.js';
import { NEGATIVE_RESOLUTIONS } from '../fixtures/negative-resolutions.js';
import { POSITIVE_RESOLUTIONS } from '../fixtures/resolution.fixtures.js';
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
