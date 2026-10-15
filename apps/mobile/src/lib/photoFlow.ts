import type { Alternate, Candidate, IdentifyResponse, Species } from '@canmyeatthis/shared';
import { create } from 'zustand';

import { features } from '@/lib/features';
import type { IdentifyOutcome } from '@/lib/identifyClient';
import { useSettingsStore } from '@/lib/settings';

/**
 * Where a photo check goes next, decided in one pure function so the safety rule it carries is
 * tested rather than trusted: **a photo-derived identification always goes to Confirm**
 * (docs/05 §1 rule 5). Whatever the server says about `needsConfirmation`, a request that carried
 * a photo never lands on a result without the person choosing what it is.
 */
export type PhotoRoute =
  | { pathname: '/confirm'; params: { species: Species } }
  | { pathname: '/error'; params: { code: string } };

export function routeForPhotoOutcome(outcome: IdentifyOutcome, species: Species): PhotoRoute {
  if (outcome.kind === 'offline') return { pathname: '/error', params: { code: 'offline' } };
  if (outcome.kind === 'error') return { pathname: '/error', params: { code: outcome.code } };
  const { response } = outcome;
  if (!response.imageQuality.usable) {
    return { pathname: '/error', params: { code: 'IMAGE_UNUSABLE' } };
  }
  if (response.candidates.length === 0) {
    return { pathname: '/error', params: { code: 'NO_SUBJECT_FOUND' } };
  }
  return { pathname: '/confirm', params: { species } };
}

/**
 * What Confirm offers for a photo: the top candidate first, then every other candidate and every
 * KB confusable of the primary (docs/03 `alternates`, "always offered"), each item once.
 * Candidates without a KB entry stay in the list: picking one is an honest "unknown", never a
 * guess at the nearest entry.
 */
export interface ConfirmChoices {
  primary: Candidate;
  others: Alternate[];
  /** Candidates the KB does not know, offered by name; picking one is an `unknown` result. */
  unmatched: string[];
}

export function confirmChoices(response: IdentifyResponse): ConfirmChoices | null {
  const sorted = [...response.candidates].sort((a, b) => b.confidence - a.confidence);
  const [primary, ...rest] = sorted;
  if (!primary) return null;
  const seen = new Set<string>(primary.kbId ? [primary.kbId] : []);
  const others: Alternate[] = [];
  const unmatched: string[] = [];
  for (const candidate of rest) {
    if (candidate.kbId === null) {
      unmatched.push(candidate.label);
    } else if (!seen.has(candidate.kbId)) {
      seen.add(candidate.kbId);
      others.push({ kbId: candidate.kbId, label: candidate.label });
    }
  }
  for (const alternate of response.alternates) {
    if (!seen.has(alternate.kbId)) {
      seen.add(alternate.kbId);
      others.push(alternate);
    }
  }
  return { primary, others, unmatched };
}

/** The last photo answer, held for Confirm: too large and too transient for route params. */
interface PhotoResultState {
  response: IdentifyResponse | null;
  setResponse: (response: IdentifyResponse | null) => void;
}

export const usePhotoResultStore = create<PhotoResultState>()((set) => ({
  response: null,
  setResponse: (response) => set({ response }),
}));

/**
 * Whether this person can check by photo: a build with photo identification (D28) **and** their
 * consent from first run or Settings (Apple 5.1.2). Without consent the app is text-only, with
 * barcode scanning, and nothing about photos is shown or sent (docs/07 Phase 5).
 */
export function photoIdEnabled(consent: boolean, buildHasPhotoId: boolean = features.photoId) {
  return buildHasPhotoId && consent;
}

export function usePhotoIdEnabled(): boolean {
  return photoIdEnabled(useSettingsStore((state) => state.photoIdConsent));
}

/** What the person picked on Confirm. */
export type ConfirmSelection =
  | { kind: 'kb'; kbId: string }
  | { kind: 'named'; label: string }
  | { kind: 'typed'; text: string };

/**
 * The result a Confirm choice opens. Always a verdict computed on the device from the KB
 * (AGENTS.md #1 and #5): an entry the person picked, or what they typed resolved exactly, or an
 * honest `unknown` for anything the KB does not hold. A typed near-miss is not guessed at here.
 */
export function confirmTarget(
  selection: ConfirmSelection,
  species: Species,
  resolveExact: (text: string) => string | null,
): Record<string, string> | null {
  if (selection.kind === 'kb') return { kbId: selection.kbId, species };
  if (selection.kind === 'named') return { unknown: '1', query: selection.label, species };
  const text = selection.text.trim();
  if (text.length < 2) return null;
  const kbId = resolveExact(text);
  return kbId ? { kbId, species, query: text } : { unknown: '1', query: text, species };
}
