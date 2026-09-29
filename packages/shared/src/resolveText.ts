import Fuse from 'fuse.js';
import { normalise } from './normalise.js';

/**
 * The shape of `kb.index.json`'s `index` field (`packages/kb/src/build.ts`): normalised alias
 * (or display name) → KB entry id.
 */
export type AliasIndex = Record<string, string>;

export type TextResolutionType = 'exact' | 'fuzzy' | 'none';

export interface TextResolution {
  type: TextResolutionType;
  kbId: string | null;
}

/**
 * Wraps a prebuilt Fuse instance so callers (the app, later the Worker) build it once at
 * startup — docs/07 Phase 3 budgets resolution at <50 ms, which a per-query Fuse construction
 * would blow on anything but a tiny KB.
 */
export interface AliasSearchIndex {
  fuse: Fuse<AliasSearchItem>;
  /**
   * `phoneticKey(alias)` → KB id, or `null` when two different entries share a key (ambiguous,
   * never resolved). Only consulted for short queries — see `SHORT_QUERY_MAX_LENGTH`.
   */
  phonetic: Map<string, string | null>;
}

interface AliasSearchItem {
  alias: string;
}

/**
 * D9 (docs/02-tech-decisions.md): fuzzy matching must be conservative — a false match is worse
 * than no match. This is the real cutoff, applied explicitly below against `hit.score` (0 =
 * exact, 1 = anything) — Fuse's own constructor `threshold` option does not reliably bound the
 * score of what it returns (empirically, a Fuse instance built with a *looser* threshold than
 * this can still return hits scored above it), so it is only used to avoid discarding candidates
 * too early internally, and this constant is what actually decides a match. Tuned against
 * `packages/kb/fixtures`: positive typos resolve, the full negative near-miss set still doesn't.
 * Was 0.25 until "licorice" (→ "licore", alcohol) was found sitting exactly on it; every
 * positive typo that still takes the Fuse path scores ≤ 0.182.
 */
const FUZZY_THRESHOLD = 0.2;

/** Looser than `FUZZY_THRESHOLD` on purpose — see the comment above. */
const FUSE_SEARCH_THRESHOLD = 0.6;

/**
 * If the best hit and another hit that maps to a *different* KB id score within this of each
 * other, the query is genuinely ambiguous between two entries (e.g. bare "chocolate" between
 * `chocolate_dark` and `chocolate_milk`). AGENTS.md #10 / D9: prefer no match to a guess.
 */
const AMBIGUITY_SCORE_DELTA = 0.05;

/**
 * Fuse's Bitap scoring is a substring-approximate match with `ignoreLocation`, which scores a
 * short query as an almost-perfect match of any longer alias it happens to be a prefix of —
 * "peanut" scores ~0.008 against "peanut butter", far better than genuine typos like "onyon"
 * score against "onion" (~0.2). No score threshold can separate that from a real typo, because
 * it scores *better*. What actually distinguishes them is length: a real typo is close in length
 * to the word it misspells, while "peanut" is a genuinely different (and, here, safety-relevant
 * different — raw peanuts vs. peanut butter) thing that merely shares a prefix with a longer
 * alias. `packages/kb/fixtures/negative-resolutions.ts`'s "peanut"/"maní" cases are exactly this.
 */
const MIN_LENGTH_RATIO = 0.7;

/**
 * Queries this short (after `normalise`) never go through Fuse. In a short word a single edit
 * lands on a *different real word* far too often: sweeping common food words against the real KB
 * found "salt"→palta (avocado), "hueso"→queso (cheese), "masa"/"papa"→pasa (raisins),
 * "pino"→vino, "beef"→beer, "lime"→lilies, "cake"→café, "perro"→puerro, "cereza"→cerveza…
 * scoring 0.17–0.25, i.e. *exactly* what the genuine short typos score ("kueso"→queso and
 * "hueso"→queso are both 0.200; "garlik"→garlic and "cereza"→cerveza both 0.167). No score
 * threshold, length ratio or first-letter rule separates them (first-letter would also break
 * "kueso", "sebolla", "silitol", "zylitol"). What does is that the real short typos spell the
 * *same sound* differently. So a short query resolves only if its `phoneticKey` equals an
 * alias's exactly. See D22's addendum in docs/02-tech-decisions.md.
 */
const SHORT_QUERY_MAX_LENGTH = 6;

/**
 * Deliberately minimal: only the spelling-for-the-same-sound pairs the typo fixtures
 * (`packages/kb/fixtures/fuzzy-resolutions.ts`) actually need — "qu"≈"ku" ("kueso"), hard
 * "c"≈"k" ("garlik") and "y"≈"i" ("onyon"). Every pair added here widens what a short query can
 * match, so each one needs a fixture justifying it and a re-run of the false-friends sweep.
 */
function phoneticKey(normalised: string): string {
  return normalised
    .replace(/qu/gu, 'ku')
    .replace(/c(?![ei])/gu, 'k')
    .replace(/y/gu, 'i');
}

export function buildAliasSearchIndex(index: AliasIndex): AliasSearchIndex {
  const items: AliasSearchItem[] = Object.keys(index).map((alias) => ({ alias }));
  const fuse = new Fuse(items, {
    keys: ['alias'],
    includeScore: true,
    threshold: FUSE_SEARCH_THRESHOLD,
    ignoreLocation: true,
    distance: 100,
  });
  const phonetic = new Map<string, string | null>();
  for (const [alias, id] of Object.entries(index)) {
    const key = phoneticKey(alias);
    const existing = phonetic.get(key);
    phonetic.set(key, existing === undefined || existing === id ? id : null);
  }
  return { fuse, phonetic };
}

/**
 * Resolves free text to a KB id: exact/alias match first (tier 0, docs/01 §"resolution
 * tiers"), then conservative fuzzy (tier 1). Pure — no I/O — so the app and, later, the Worker's
 * candidate→KB mapping call it against the same artefact and can never disagree (AGENTS.md #5).
 */
export function resolveText(
  query: string,
  index: AliasIndex,
  searchIndex: AliasSearchIndex,
): TextResolution {
  const key = normalise(query);
  if (key.length === 0) return { type: 'none', kbId: null };

  const exact = index[key];
  if (exact) return { type: 'exact', kbId: exact };

  if (key.length <= SHORT_QUERY_MAX_LENGTH) {
    const kbId = searchIndex.phonetic.get(phoneticKey(key));
    return kbId ? { type: 'fuzzy', kbId } : { type: 'none', kbId: null };
  }

  const hits = searchIndex.fuse.search(key).filter((hit) => {
    if ((hit.score ?? 1) > FUZZY_THRESHOLD) return false;
    const shorter = Math.min(key.length, hit.item.alias.length);
    const longer = Math.max(key.length, hit.item.alias.length);
    return shorter / longer >= MIN_LENGTH_RATIO;
  });
  const best = hits[0];
  if (best === undefined) return { type: 'none', kbId: null };

  const bestId = index[best.item.alias];
  const bestScore = best.score ?? 1;
  if (bestId === undefined) return { type: 'none', kbId: null };

  const ambiguous = hits.slice(1).some((hit) => {
    const id = index[hit.item.alias];
    const score = hit.score ?? 1;
    return id !== undefined && id !== bestId && score - bestScore <= AMBIGUITY_SCORE_DELTA;
  });
  if (ambiguous) return { type: 'none', kbId: null };

  return { type: 'fuzzy', kbId: bestId };
}
