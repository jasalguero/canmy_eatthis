import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalise } from '@canmyeatthis/shared';
import { describe, expect, it } from 'vitest';
import { stringify as stringifyYaml } from 'yaml';
import { NEGATIVE_RESOLUTIONS } from '../fixtures/negative-resolutions.js';
import { POSITIVE_RESOLUTIONS } from '../fixtures/resolution.fixtures.js';
import type { KbEntry } from '../schema/entry.js';
import {
  BuildError,
  buildCoverageReport,
  loadEntries,
  validateCrossEntry,
  validateShippedLanguageApproval,
  validateVocabCoverage,
} from './build.js';

const realEntries = loadEntries().map((l) => l.entry);

/** Builds the same alias -> id index build.ts's main() does, for resolution fixtures. */
function buildIndex(entries: KbEntry[]): Record<string, string> {
  const index: Record<string, string> = {};
  for (const entry of entries) {
    for (const lang of ['en', 'es'] as const) {
      for (const alias of [entry.display_name[lang], ...entry.aliases[lang]]) {
        index[normalise(alias)] = entry.id;
      }
    }
  }
  return index;
}

describe('the real authored KB', () => {
  it('has at least the Phase 1 pilot batch and every entry validates', () => {
    expect(realEntries.length).toBeGreaterThanOrEqual(15);
  });

  it('every toxic entry has severity, non-empty emergency_actions, and >=1 sourced citation', () => {
    for (const entry of realEntries) {
      for (const species of [entry.species.dog, entry.species.cat]) {
        if (species.verdict === 'toxic') {
          expect(species.severity).not.toBeNull();
          expect(species.emergency_actions.length).toBeGreaterThan(0);
          expect(entry.sources.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('every toxic or caution entry has at least two independent sources', () => {
    for (const entry of realEntries) {
      const needsSources = [entry.species.dog, entry.species.cat].some(
        (s) => s.verdict === 'toxic' || s.verdict === 'caution',
      );
      if (needsSources) expect(entry.sources.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('passes cross-entry validation (alias uniqueness, confusable_with, substrings)', () => {
    expect(() => validateCrossEntry(realEntries)).not.toThrow();
  });

  it('passes vocab coverage validation', () => {
    expect(() => validateVocabCoverage(realEntries)).not.toThrow();
  });

  it('every entry resolves from both its English and Spanish display name', () => {
    const index = buildIndex(realEntries);
    for (const entry of realEntries) {
      expect(index[normalise(entry.display_name.en)]).toBe(entry.id);
      expect(index[normalise(entry.display_name.es)]).toBe(entry.id);
    }
  });

  it('every alias resolves to its own entry', () => {
    const index = buildIndex(realEntries);
    for (const entry of realEntries) {
      for (const lang of ['en', 'es'] as const) {
        for (const alias of entry.aliases[lang]) {
          expect(index[normalise(alias)]).toBe(entry.id);
        }
      }
    }
  });

  it('the positive resolution fixtures resolve to their expected entry', () => {
    const index = buildIndex(realEntries);
    for (const { input, expected } of POSITIVE_RESOLUTIONS) {
      expect(index[normalise(input)]).toBe(expected);
    }
  });

  it('the negative fixture set — near-misses — do not resolve to any entry', () => {
    const index = buildIndex(realEntries);
    for (const query of NEGATIVE_RESOLUTIONS) {
      expect(index[normalise(query)]).toBeUndefined();
    }
  });

  it('emits a coverage report without throwing', () => {
    expect(() => buildCoverageReport(realEntries)).not.toThrow();
  });
});

describe('validateShippedLanguageApproval — proves the gate fires (docs/02-tech-decisions.md D17)', () => {
  function makeEntry(
    overrides: Partial<KbEntry['translations']['es']> = {},
    toxic = true,
  ): KbEntry {
    const localized = { en: 'Test', es: 'Prueba' };
    const speciesShape = {
      verdict: toxic ? ('toxic' as const) : ('safe' as const),
      severity: toxic ? ('mild' as const) : null,
      headline: localized,
      summary: localized,
      signs: [],
      onset_hours: null,
      emergency_actions: toxic ? ['call_vet_now' as const] : [],
    };
    return {
      id: 'test_entry',
      display_name: localized,
      category: 'food',
      aliases: { en: ['test'], es: ['prueba'] },
      confusable_with: [],
      is_ingredient: false,
      high_risk: false,
      species: { dog: speciesShape, cat: speciesShape },
      sources: toxic
        ? [
            { label: 'A', url: 'https://a.example', accessed: '2026-09-19' },
            { label: 'B', url: 'https://b.example', accessed: '2026-09-19' },
          ]
        : [],
      review: { reviewed_by: null, reviewed_at: null, status: 'draft' },
      translations: {
        es: {
          tier_a: 'approved',
          tier_b: 'approved',
          translated_by: 'Test',
          reviewed_by: null,
          reviewed_at: null,
          ...overrides,
        },
      },
    };
  }

  it('passes when es is fully approved and es is shipped', () => {
    expect(() => validateShippedLanguageApproval([makeEntry()], ['en', 'es'])).not.toThrow();
  });

  it('fails when tier_a is not approved and es is shipped', () => {
    expect(() =>
      validateShippedLanguageApproval([makeEntry({ tier_a: 'draft' })], ['en', 'es']),
    ).toThrow(BuildError);
  });

  it('fails when a toxic entry has tier_b: machine and es is shipped', () => {
    expect(() =>
      validateShippedLanguageApproval([makeEntry({ tier_b: 'machine' })], ['en', 'es']),
    ).toThrow(BuildError);
  });

  it('does not fail a not-yet-shipped language even with draft tiers (the real es today)', () => {
    expect(() =>
      validateShippedLanguageApproval([makeEntry({ tier_a: 'draft', tier_b: 'draft' })], ['en']),
    ).not.toThrow();
  });
});

describe('build fails on a corrupted entry with a readable error', () => {
  it('reports a schema violation instead of crashing with a stack trace', () => {
    const dir = mkdtempSync(join(tmpdir(), 'kb-corrupt-'));
    try {
      writeFileSync(
        join(dir, 'broken_entry.yaml'),
        stringifyYaml({
          id: 'broken_entry',
          display_name: { en: 'Broken', es: 'Roto' },
          category: 'food',
          aliases: { en: ['broken'], es: ['roto'] },
          confusable_with: [],
          is_ingredient: false,
          high_risk: false,
          species: {
            dog: {
              verdict: 'toxic',
              severity: null, // invalid: toxic requires non-null severity
              headline: { en: 'x', es: 'x' },
              summary: { en: 'x', es: 'x' },
              signs: [],
              onset_hours: null,
              emergency_actions: [],
            },
            cat: {
              verdict: 'safe',
              severity: null,
              headline: { en: 'x', es: 'x' },
              summary: { en: 'x', es: 'x' },
              signs: [],
              onset_hours: null,
              emergency_actions: [],
            },
          },
          sources: [],
          review: { reviewed_by: null, reviewed_at: null, status: 'draft' },
          translations: {
            es: {
              tier_a: 'draft',
              tier_b: 'draft',
              translated_by: 'x',
              reviewed_by: null,
              reviewed_at: null,
            },
          },
        }),
      );
      expect(() => loadEntries(dir)).toThrow(BuildError);
      try {
        loadEntries(dir);
      } catch (err) {
        expect(err).toBeInstanceOf(BuildError);
        expect((err as BuildError).message).toContain('broken_entry.yaml');
        expect((err as BuildError).message).toContain('severity');
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
