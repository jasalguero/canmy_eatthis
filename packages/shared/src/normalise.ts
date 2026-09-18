/**
 * Normalises free text for KB matching. Used identically on-device (packages/kb resolution,
 * apps/mobile) and at the edge (services/api) — AGENTS.md #5: resolution logic lives only here,
 * so the app and the Worker cannot disagree.
 *
 * Steps, in order:
 *   1. Unicode NFD decomposition + strip combining marks — folds accented Latin letters to
 *      their base form (é→e, ñ→n, ü→u, etc.) without a hand-maintained substitution table.
 *   2. Lowercase.
 *   3. Strip punctuation (keep letters, digits, and whitespace).
 *   4. Collapse runs of whitespace to a single space and trim.
 *   5. Naive singularisation: drop a single trailing "s" when the resulting stem is at least
 *      3 characters. Deliberately simple — this is a fuzzy-match aid, not a real stemmer, and
 *      it intentionally does NOT special-case "-es" plurals (that rule mishandles words that
 *      end in "e" already, e.g. "grapes" → "grape" must not become "grap"). It must never fold
 *      two genuinely different KB entries together; Phase 1's negative fixture set is what
 *      proves that.
 */
export function normalise(text: string): string {
  const folded = text.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const lower = folded.toLowerCase();
  const stripped = lower.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const collapsed = stripped.replace(/\s+/gu, ' ').trim();
  return collapsed
    .split(' ')
    .map(singulariseWord)
    .join(' ');
}

function singulariseWord(word: string): string {
  if (word.length < 4) return word;
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}
