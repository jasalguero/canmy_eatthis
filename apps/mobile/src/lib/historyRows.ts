import type { Species, Verdict } from '@canmyeatthis/shared';

import type { SupportedLanguage } from '@/i18n/namespaces';
import type { HistoryRecord } from '@/lib/history';
import { getKbEntry, resolveOffline } from '@/lib/offlineKb';
import { buildRealVerdict } from '@/lib/verdict';

/**
 * What tapping a history row opens: always today's answer, never the stored one (`lib/history.ts`).
 *
 * A row with a KB id re-opens that entry. A row whose entry is gone, or that matched nothing at the
 * time, runs its typed text through the resolver again — the KB may cover it now — and is an
 * `unknown` otherwise. Only an exact match counts here: a fuzzy match would need the person to
 * confirm it, and they are not in the middle of typing.
 */
export type ReopenTarget =
  | { kind: 'entry'; kbId: string; species: Species }
  | { kind: 'unknown'; query: string; species: Species };

export function reopenTarget(record: HistoryRecord, language: SupportedLanguage): ReopenTarget {
  if (record.kbId && getKbEntry(record.kbId, language)) {
    return { kind: 'entry', kbId: record.kbId, species: record.species };
  }
  const query = record.query || record.displayName;
  const resolution = resolveOffline(query);
  if (resolution.type === 'exact' && resolution.kbId && getKbEntry(resolution.kbId, language)) {
    return { kind: 'entry', kbId: resolution.kbId, species: record.species };
  }
  return { kind: 'unknown', query, species: record.species };
}

export interface HistoryRowView {
  record: HistoryRecord;
  /** Today's name in the person's language, so a language switch relabels the list. */
  name: string;
  /** The answer the row re-opens to. */
  verdictNow: Verdict;
  /** The answer differs from the one shown at the time; the row says so. */
  changed: boolean;
  target: ReopenTarget;
}

export function toRowView(
  record: HistoryRecord,
  language: SupportedLanguage,
  disclaimer: string,
): HistoryRowView {
  const target = reopenTarget(record, language);
  if (target.kind === 'unknown') {
    return {
      record,
      name: record.displayName,
      verdictNow: 'unknown',
      changed: record.verdict !== 'unknown',
      target,
    };
  }
  const payload = buildRealVerdict({
    kbId: target.kbId,
    species: target.species,
    language,
    disclaimer,
  });
  return {
    record,
    name: payload.displayName,
    verdictNow: payload.verdict,
    changed: payload.verdict !== record.verdict,
    target,
  };
}
