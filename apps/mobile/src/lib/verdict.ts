import {
  type Species,
  type VerdictPayload,
  VerdictPayloadSchema,
  resolveVerdict,
} from '@canmyeatthis/shared';

import type { SupportedLanguage } from '@/i18n/namespaces';
import { getKbEntry, getKbVersion } from '@/lib/offlineKb';

/**
 * Builds a real `VerdictPayload` from a resolved KB id — the on-device counterpart to
 * `mock/cases.ts`'s `mockVerdict`, calling the same `resolveVerdict()` (AGENTS.md #5) against
 * the bundled KB instead of the mock entries. Throws if `kbId` isn't in the bundled KB for
 * `language`, which should only happen if a caller passes an id `resolveOffline` never returned.
 */
export function buildRealVerdict(params: {
  kbId: string;
  species: Species;
  language: SupportedLanguage;
  disclaimer: string;
}): VerdictPayload {
  const { kbId, species, language, disclaimer } = params;
  const entry = getKbEntry(kbId, language);
  if (!entry) throw new Error(`offline KB has no entry "${kbId}" for language "${language}"`);
  return resolveVerdict({ entry, species, kbVersion: getKbVersion(language), disclaimer });
}

/**
 * The true "not in our knowledge base" case (docs/07 Phase 3's negative-fixture set, and every
 * query `resolveOffline` returns `none` for). AGENTS.md #10: uncertain stays `unknown`, never a
 * guess. `headline`/`summary` are passed in already translated (`result:unknownHeadline` /
 * `result:unknownBody`) — this module stays free of `t()`, matching `resolveVerdict`'s pattern
 * of taking `disclaimer` as a translated string from the caller.
 *
 * `displayName` is the user's own (trimmed) typed text — there is no resolved item name, and
 * showing back what they asked about is more honest than inventing one.
 */
export function buildUnknownVerdict(params: {
  query: string;
  species: Species;
  language: SupportedLanguage;
  disclaimer: string;
  headline: string;
  summary: string;
}): VerdictPayload {
  const { query, species, language, disclaimer, headline, summary } = params;
  return VerdictPayloadSchema.parse({
    kbId: '__unknown__',
    displayName: query.trim().slice(0, 200) || query,
    species,
    verdict: 'unknown',
    severity: null,
    headline,
    summary,
    signs: [],
    onsetHours: null,
    emergencyActions: [],
    sources: [],
    kbVersion: getKbVersion(language),
    disclaimer,
  });
}
