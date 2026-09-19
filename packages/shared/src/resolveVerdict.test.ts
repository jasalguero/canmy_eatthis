import { describe, expect, it } from 'vitest';
import { resolveVerdict } from './resolveVerdict.js';
import type { ResolvedKbEntry } from './schemas/resolved-kb-entry.js';

/**
 * Fixtures here are hand-built `ResolvedKbEntry` objects, not real KB content — the point is to
 * prove `resolveVerdict` enforces `docs/03-api-contract.md`'s invariants at runtime even when
 * upstream KB data is wrong, not to re-test real entries (that happens against the real KB in
 * `packages/kb`'s own tests).
 */
function makeEntry(overrides: {
  dog?: Partial<ResolvedKbEntry['species']['dog']>;
  sources?: ResolvedKbEntry['sources'];
}): ResolvedKbEntry {
  return {
    id: 'test_entry',
    displayName: 'Test entry',
    species: {
      dog: {
        verdict: 'toxic',
        severity: 'moderate',
        headline: 'Toxic to dogs. Call your vet.',
        summary: 'A test summary.',
        signs: ['vomiting'],
        onset_hours: { min: 2, max: 12 },
        emergency_actions: ['call_vet_now'],
        ...overrides.dog,
      },
      cat: {
        verdict: 'unknown',
        severity: null,
        headline: 'Not sure — ask your vet',
        summary: 'A test summary.',
        signs: [],
        onset_hours: null,
        emergency_actions: [],
      },
    },
    sources: overrides.sources ?? [
      { label: 'Merck Veterinary Manual', url: 'https://www.merckvetmanual.com/' },
    ],
  };
}

const kbVersion = 'test-v1';
const disclaimer = 'This is general information, not veterinary advice.';

describe('resolveVerdict', () => {
  it('produces a valid payload for a well-formed toxic entry (happy path)', () => {
    const payload = resolveVerdict({ entry: makeEntry({}), species: 'dog', kbVersion, disclaimer });
    expect(payload.verdict).toBe('toxic');
    expect(payload.severity).toBe('moderate');
    expect(payload.emergencyActions).toEqual(['call_vet_now']);
    expect(payload.kbVersion).toBe(kbVersion);
  });

  it('invariant 1: throws if a toxic verdict carries a null severity', () => {
    const entry = makeEntry({ dog: { severity: null } });
    expect(() => resolveVerdict({ entry, species: 'dog', kbVersion, disclaimer })).toThrow();
  });

  it('invariant 1: throws if a toxic verdict carries empty emergencyActions', () => {
    const entry = makeEntry({ dog: { emergency_actions: [] } });
    expect(() => resolveVerdict({ entry, species: 'dog', kbVersion, disclaimer })).toThrow();
  });

  it('invariant 1: throws if a non-toxic verdict carries a non-null severity', () => {
    const entry = makeEntry({ dog: { verdict: 'safe', severity: 'mild', emergency_actions: [] } });
    expect(() => resolveVerdict({ entry, species: 'dog', kbVersion, disclaimer })).toThrow();
  });

  it('invariant 2: throws if an unknown verdict headline contains "safe"', () => {
    const entry = makeEntry({
      dog: { verdict: 'unknown', severity: null, emergency_actions: [], headline: 'Probably safe' },
    });
    expect(() => resolveVerdict({ entry, species: 'dog', kbVersion, disclaimer })).toThrow();
  });

  it('invariant 5: throws if a toxic verdict carries zero sources', () => {
    const entry = makeEntry({ sources: [] });
    expect(() => resolveVerdict({ entry, species: 'dog', kbVersion, disclaimer })).toThrow();
  });

  it('invariant 5: a caution verdict also requires at least one source', () => {
    const entry = makeEntry({
      dog: { verdict: 'caution', severity: null, emergency_actions: [] },
      sources: [],
    });
    expect(() => resolveVerdict({ entry, species: 'dog', kbVersion, disclaimer })).toThrow();
  });

  it('a safe verdict needs no sources', () => {
    const entry = makeEntry({
      dog: { verdict: 'safe', severity: null, emergency_actions: [], signs: [], onset_hours: null },
      sources: [],
    });
    const payload = resolveVerdict({ entry, species: 'dog', kbVersion, disclaimer });
    expect(payload.verdict).toBe('safe');
  });
});
