import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DATA_DIR, loadEntries, validateCrossEntry, validateVocabCoverage } from './build.js';

/**
 * `drafts/` holds entries written by Claude and not yet approved (drafts/README.md). The build
 * never reads it, so nothing here can ship. This suite keeps drafts honest and ready to promote:
 * each one passes the same per-entry schema, and the cross-entry checks (alias uniqueness,
 * substring rule, `confusable_with` resolution, vocabulary) against the live KB, so moving a
 * file into `data/` cannot break the build for a reason that was knowable in advance.
 */
const DRAFTS_DIR = join(DATA_DIR, '..', 'drafts');
const hasDrafts = existsSync(DRAFTS_DIR) && readdirSync(DRAFTS_DIR).some((f) => /\.ya?ml$/.test(f));

describe.skipIf(!hasDrafts)('KB drafts', () => {
  const drafts = hasDrafts ? loadEntries(DRAFTS_DIR).map((l) => l.entry) : [];
  const live = loadEntries().map((l) => l.entry);

  it('validates alongside the live KB', () => {
    expect(() => validateCrossEntry([...live, ...drafts])).not.toThrow();
    expect(() => validateVocabCoverage(drafts)).not.toThrow();
  });

  it('never shares an id with a live entry', () => {
    const liveIds = new Set(live.map((e) => e.id));
    for (const draft of drafts) expect(liveIds.has(draft.id), draft.id).toBe(false);
  });

  // A draft claims no review it has not had (docs/02 D17). Approval happens on promotion.
  it('claims no review or approved translation', () => {
    for (const draft of drafts) {
      expect(draft.review, draft.id).toEqual({
        reviewed_by: null,
        reviewed_at: null,
        status: 'draft',
      });
      expect(draft.translations.es.tier_a, draft.id).not.toBe('approved');
      expect(draft.translations.es.tier_b, draft.id).not.toBe('approved');
      expect(draft.translations.es.reviewed_by, draft.id).toBeNull();
    }
  });

  // AGENTS.md #15: every entry carries two sources, whatever its verdict.
  it('carries at least two sources', () => {
    for (const draft of drafts) expect(draft.sources.length, draft.id).toBeGreaterThanOrEqual(2);
  });
});
