import {
  type Alternate,
  type Candidate,
  type ResolvedKbEntry,
  type Species,
  type VerdictPayload,
  resolveVerdict,
} from '@canmyeatthis/shared';

import { MOCK_ENTRIES, MOCK_KB_VERSION, type MockLanguage } from './kbEntries';

/**
 * The named scenarios every Phase 2 screen and the gallery are built against.
 *
 * Verdict payloads are produced by calling the real `resolveVerdict()` on the mock entries, not
 * by hand-writing `VerdictPayload` objects. That matters: `resolveVerdict` re-validates against
 * every runtime invariant in `VerdictPayloadSchema` (toxic ⇒ severity + emergency actions,
 * `unknown` never says the reassuring word, toxic/caution ⇒ at least one source), so a mock that
 * would be impossible in production throws here rather than quietly producing a screenshot of a
 * screen that can never exist. It also means the screens are wired to the same function the app
 * will call for real in H3 — AGENTS.md #5.
 */

/** A mock scenario: which entry, which species, and why it is in the set. */
export interface MockCase {
  id: string;
  entryId: string;
  species: Species;
  /** Why this case exists — shown in the dev gallery so the set stays self-documenting. */
  note: string;
}

export const MOCK_CASES: readonly MockCase[] = [
  { id: 'safe-dog', entryId: 'carrot', species: 'dog', note: 'No known toxicity' },
  { id: 'caution-dog', entryId: 'cheese', species: 'dog', note: 'Caution, no severity' },
  { id: 'toxic-mild-dog', entryId: 'chocolate_milk', species: 'dog', note: 'Toxic — mild' },
  { id: 'toxic-moderate-dog', entryId: 'chocolate_dark', species: 'dog', note: 'Toxic — moderate' },
  {
    id: 'toxic-severe-dog',
    entryId: 'grapes_raisins',
    species: 'dog',
    note: 'Toxic — severe: persistent banner, call button above the fold',
  },
  {
    id: 'toxic-severe-cat',
    entryId: 'lily',
    species: 'cat',
    note: 'Severe for cats, caution for dogs — the species toggle changes the answer',
  },
  {
    id: 'caution-dog-species-split',
    entryId: 'lily',
    species: 'dog',
    note: 'The same entry, the other species',
  },
  {
    id: 'unknown-cat',
    entryId: 'macadamia_nuts',
    species: 'cat',
    note: 'A real `unknown` — never green, never reassuring',
  },
];

export function mockEntry(entryId: string, language: MockLanguage): ResolvedKbEntry {
  const entry = MOCK_ENTRIES[language][entryId];
  if (!entry) throw new Error(`no mock entry "${entryId}" in ${language}`);
  return entry;
}

/**
 * Builds the payload for a case. `disclaimer` is passed in from the caller's `t()` rather than
 * hardcoded, because in the real app it travels with the answer in the user's language.
 */
export function mockVerdict(
  mockCase: MockCase,
  language: MockLanguage,
  disclaimer: string,
): VerdictPayload {
  return resolveVerdict({
    entry: mockEntry(mockCase.entryId, language),
    species: mockCase.species,
    kbVersion: MOCK_KB_VERSION[language],
    disclaimer,
  });
}

export function findMockCase(id: string): MockCase | undefined {
  return MOCK_CASES.find((c) => c.id === id);
}

/**
 * Candidates for the Confirm screen. Confidence is a band, never a number, on screen — the raw
 * `confidence` is carried because `IdentifyResponse` has it and the escalation rule in H4 reads
 * it, but no component may render it (docs/06 §4).
 */
export const MOCK_CANDIDATES: readonly Candidate[] = [
  {
    id: 'cand_1',
    label: 'Dark chocolate',
    kbId: 'chocolate_dark',
    confidence: 0.82,
    confidenceBand: 'high',
  },
  {
    id: 'cand_2',
    label: 'Milk chocolate',
    kbId: 'chocolate_milk',
    confidence: 0.41,
    confidenceBand: 'medium',
  },
];

export const MOCK_ALTERNATES: readonly Alternate[] = [
  { kbId: 'chocolate_milk', label: 'Milk chocolate' },
  { kbId: 'cheese', label: 'Cheese' },
];

/** A low-confidence plant candidate — docs/10 §4: photo plant ID is always treated as unreliable. */
export const MOCK_PLANT_CANDIDATE: Candidate = {
  id: 'cand_plant',
  label: 'Lily',
  kbId: 'lily',
  confidence: 0.35,
  confidenceBand: 'low',
};

/** History rows. Dates are fixed, never `Date.now()`, so screenshots are reproducible. */
export interface MockHistoryRow {
  id: string;
  caseId: string;
  checkedAt: Date;
}

export const MOCK_HISTORY: readonly MockHistoryRow[] = [
  { id: 'h1', caseId: 'toxic-moderate-dog', checkedAt: new Date('2026-09-21T20:14:00Z') },
  { id: 'h2', caseId: 'safe-dog', checkedAt: new Date('2026-09-21T12:02:00Z') },
  { id: 'h3', caseId: 'unknown-cat', checkedAt: new Date('2026-09-19T08:40:00Z') },
  { id: 'h4', caseId: 'toxic-severe-cat', checkedAt: new Date('2026-09-17T23:11:00Z') },
];
