import { VerdictPayloadSchema } from '@canmyeatthis/shared';

import { MOCK_CASES, mockVerdict } from './cases';
import { MOCK_ENTRY_IDS, type MockLanguage } from './kbEntries';

const LANGUAGES: MockLanguage[] = ['en', 'es'];
const DISCLAIMER = 'This is general information, not veterinary advice.';

/**
 * The mock set is what every Phase 2 screen and every committed screenshot is built on, so it
 * has to be impossible for it to contain a state the real app could never produce. Running the
 * real `resolveVerdict()` over it is what guarantees that: the function re-validates against
 * every `VerdictPayload` invariant and throws rather than returning something invalid.
 */
describe('mock cases', () => {
  it.each(LANGUAGES)('every case resolves to a valid payload in %s', (language) => {
    for (const mockCase of MOCK_CASES) {
      const payload = mockVerdict(mockCase, language, DISCLAIMER);
      expect(VerdictPayloadSchema.safeParse(payload).success).toBe(true);
    }
  });

  it('covers all four verdicts and all three severities', () => {
    // docs/07 Phase 2 acceptance: Result ×4 verdicts ×severities. A gap here is a screen
    // nobody ever looked at.
    const payloads = MOCK_CASES.map((c) => mockVerdict(c, 'en', DISCLAIMER));
    expect(new Set(payloads.map((p) => p.verdict))).toEqual(
      new Set(['safe', 'caution', 'toxic', 'unknown']),
    );
    expect(new Set(payloads.filter((p) => p.severity).map((p) => p.severity))).toEqual(
      new Set(['mild', 'moderate', 'severe']),
    );
  });

  it('never renders an `unknown` that reads as reassuring', () => {
    // AGENTS.md #2 / invariant 2. The schema enforces it, but the mock copy is what is actually
    // shown in the screenshots, so assert it on the rendered strings too.
    //
    // English can test the bare word; Spanish cannot. "Seguro" means both "safe" and "sure", so
    // the correct copy for an `unknown` headline is literally "No estoy seguro" ("not sure").
    // Matching the bare word there would flag the right answer as the wrong one — which is why
    // `scripts/check-safe-claims.sh` matches *claim patterns* on the KB rather than the word.
    // Same approach here.
    const CLAIMS_EN = /\bis safe\b|\bare safe\b|\bsafe to eat\b/;
    const CLAIMS_ES = /\bes seguro\b|\bes segura\b|\bseguro para\b|\bsegura para\b/;
    for (const language of LANGUAGES) {
      for (const mockCase of MOCK_CASES) {
        const payload = mockVerdict(mockCase, language, DISCLAIMER);
        if (payload.verdict !== 'unknown') continue;
        const headline = payload.headline.toLowerCase();
        expect(headline).not.toMatch(language === 'en' ? CLAIMS_EN : CLAIMS_ES);
        if (language === 'en') expect(headline).not.toMatch(/\bsafe\b/);
        expect(payload.severity).toBeNull();
      }
    }
  });

  it('cites at least one source on every toxic and caution payload', () => {
    // Invariant 5, and the whole editorial standard (docs/04-knowledge-base.md §2): the source is the claim.
    for (const mockCase of MOCK_CASES) {
      const payload = mockVerdict(mockCase, 'en', DISCLAIMER);
      if (payload.verdict === 'toxic' || payload.verdict === 'caution') {
        expect(payload.sources.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('gives every toxic payload a severity and a non-empty emergency action list', () => {
    for (const mockCase of MOCK_CASES) {
      const payload = mockVerdict(mockCase, 'en', DISCLAIMER);
      if (payload.verdict !== 'toxic') continue;
      expect(payload.severity).not.toBeNull();
      expect(payload.emergencyActions.length).toBeGreaterThan(0);
    }
  });

  it('answers differently per species for the same entry', () => {
    // `lily` is caution for dogs and severe-toxic for cats. If these ever agree, either the mock
    // stopped being generated from the real KB or the species toggle stopped mattering — and the
    // toggle mattering is the reason the KB is authored per species (AGENTS.md #8).
    const dog = mockVerdict(
      { id: 'x', entryId: 'lily', species: 'dog', note: '' },
      'en',
      DISCLAIMER,
    );
    const cat = mockVerdict(
      { id: 'y', entryId: 'lily', species: 'cat', note: '' },
      'en',
      DISCLAIMER,
    );
    expect(dog.verdict).not.toBe(cat.verdict);
  });

  it('has both languages for every entry, with different prose', () => {
    for (const id of MOCK_ENTRY_IDS) {
      const en = mockVerdict({ id, entryId: id, species: 'dog', note: '' }, 'en', DISCLAIMER);
      const es = mockVerdict({ id, entryId: id, species: 'dog', note: '' }, 'es', DISCLAIMER);
      expect(es.displayName.length).toBeGreaterThan(0);
      // Not a translation-quality check — just that `es` is not silently the English string.
      expect(es.summary).not.toBe(en.summary);
    }
  });
});
