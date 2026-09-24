import { describe, expect, it } from 'vitest';
import {
  buildVerdict,
  getAlternates,
  getKbEntry,
  getKbVersion,
  languageFromLocale,
  resolveCandidateLabel,
  resolveExact,
  resolveOffline,
} from '../src/kb.js';

describe('server-side KB (mirrors apps/mobile/src/lib/offlineKb.ts — AGENTS.md #5)', () => {
  it('resolves an exact alias, same as the on-device resolver', () => {
    expect(resolveOffline('dark chocolate')).toEqual({ type: 'exact', kbId: 'chocolate_dark' });
  });

  it('resolves a realistic typo via the fuzzy tier', () => {
    expect(resolveOffline('onyon')).toEqual({ type: 'fuzzy', kbId: 'alliums' });
  });

  it('maps a model-style label onto a KB id through the exact tier', () => {
    // A realistic model-style label (with a parenthetical), not a bare stored alias.
    expect(resolveCandidateLabel('Antifreeze (ethylene glycol)')).toBe(
      'antifreeze_ethylene_glycol',
    );
  });

  it('falls back to the generic common name when the specific label has no alias', () => {
    expect(resolveCandidateLabel('Lindt Excellence 85% bar', 'dark chocolate')).toBe(
      'chocolate_dark',
    );
  });

  it('never fuzzy-matches text the Worker reads (labels, ingredient lines)', () => {
    // The fuzzy tier maps "salt" onto the Spanish alias "palta" (avocado). Fine-ish for a typed
    // query the user then sees; wrong for the 30 lines of an ingredient list.
    expect(resolveOffline('salt').type).toBe('fuzzy');
    expect(resolveExact('salt')).toBeNull();
    expect(resolveExact('onyon')).toBeNull();
    expect(resolveCandidateLabel('Salt', 'salt')).toBeNull();
  });

  it('returns KB confusables as localised alternates', () => {
    const entry = getKbEntry('chocolate_dark', 'en');
    const alternates = getAlternates('chocolate_dark', 'es');
    expect(alternates.map((a) => a.kbId)).toEqual(entry?.confusableWith);
    for (const a of alternates) expect(a.label).toBe(getKbEntry(a.kbId, 'es')?.displayName);
  });

  it("picks the KB language from the locale's language, never its region (AGENTS.md #12)", () => {
    expect(languageFromLocale('es-ES')).toBe('es');
    expect(languageFromLocale('es-419')).toBe('es');
    expect(languageFromLocale('en-ES')).toBe('en');
    expect(languageFromLocale('fr-FR')).toBe('en');
    expect(languageFromLocale(undefined)).toBe('en');
  });

  it('looks up an entry by id and language', () => {
    expect(getKbEntry('chocolate_dark', 'en')?.displayName).toBe('Dark chocolate');
    expect(getKbEntry('chocolate_dark', 'es')?.displayName).toBe('Chocolate negro');
    expect(getKbEntry('not_a_real_id', 'en')).toBeUndefined();
  });

  it('exposes a non-empty KB version for every shipped language', () => {
    expect(getKbVersion('en').length).toBeGreaterThan(0);
    expect(getKbVersion('es').length).toBeGreaterThan(0);
  });

  it('builds a real, schema-valid verdict — the same resolveVerdict() the app calls', () => {
    const payload = buildVerdict({
      kbId: 'chocolate_dark',
      species: 'dog',
      language: 'en',
      disclaimer: 'Not a substitute for veterinary advice.',
    });
    expect(payload?.verdict).toBe('toxic');
    expect(payload?.severity).toBe('moderate');
    expect(payload?.sources.length).toBeGreaterThan(0);
  });

  it('returns null rather than throwing for an id the KB does not have', () => {
    expect(
      buildVerdict({ kbId: 'not_a_real_id', species: 'dog', language: 'en', disclaimer: 'x' }),
    ).toBeNull();
  });
});
