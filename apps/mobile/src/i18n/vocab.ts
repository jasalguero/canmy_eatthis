/**
 * The controlled vocabulary (`signs`, `emergency_actions`) as an i18next namespace.
 *
 * AGENTS.md #13: these are ids, never per-entry prose, and they are translated exactly once.
 * That one place is `packages/kb/vocab/<lang>.json` — the KB build already validates that every
 * id used by any entry has a translation there in every shipped language, so importing those
 * files is what keeps the app and that check in agreement. Re-typing the strings into the app's
 * own catalogues would create a second source of truth the KB build cannot see.
 *
 * The JSON is two flat maps; i18next wants one flat namespace, so they are flattened with the
 * group as a key prefix: `vocab:signs.vomiting`, `vocab:emergency_actions.call_vet_now`.
 */
import kbVocabEn from '@canmyeatthis/kb/vocab/en.json';
import kbVocabEs from '@canmyeatthis/kb/vocab/es.json';

type VocabFile = { signs: Record<string, string>; emergency_actions: Record<string, string> };

function flatten(file: VocabFile): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [group, entries] of Object.entries(file)) {
    for (const [id, text] of Object.entries(entries)) out[`${group}.${id}`] = text;
  }
  return out;
}

export const vocabEn = flatten(kbVocabEn as VocabFile);
export const vocabEs = flatten(kbVocabEs as VocabFile);
