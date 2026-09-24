import {
  type AliasIndex,
  type AliasSearchIndex,
  type Alternate,
  type ResolvedKbEntryWithMeta,
  ResolvedKbEntryWithMetaSchema,
  type Species,
  type TextResolution,
  type VerdictPayload,
  buildAliasSearchIndex,
  normalise,
  resolveText,
  resolveVerdict,
} from '@canmyeatthis/shared';

import kbEn from './kb-data/kb.en.json';
import kbEs from './kb-data/kb.es.json';
import kbIndexArtifact from './kb-data/kb.index.json';

/**
 * The server-side mirror of `apps/mobile/src/lib/offlineKb.ts` — same committed snapshot
 * (docs/02-tech-decisions.md D21, extended to this package for H4), same shared functions
 * (AGENTS.md #5), so `/v1/verdict` and the app's on-device resolution can never disagree. This is
 * not a coincidence to maintain by hand: both load `packages/kb/dist` via the same
 * `sync-assets.mjs` script, so a stale copy in either place fails the same CI check.
 */
export type Language = 'en' | 'es';

interface LanguageArtifact {
  version: string;
  lang: string;
  entries: unknown[];
}

const RAW_BY_LANGUAGE: Record<Language, LanguageArtifact> = {
  en: kbEn as LanguageArtifact,
  es: kbEs as LanguageArtifact,
};

const ALIAS_INDEX: AliasIndex = (kbIndexArtifact as { index: AliasIndex }).index;

interface EntryMap {
  version: string;
  byId: Map<string, ResolvedKbEntryWithMeta>;
}

const entryMapCache: Partial<Record<Language, EntryMap>> = {};

function getEntryMap(language: Language): EntryMap {
  const cached = entryMapCache[language];
  if (cached) return cached;

  const raw = RAW_BY_LANGUAGE[language];
  const byId = new Map<string, ResolvedKbEntryWithMeta>();
  for (const rawEntry of raw.entries) {
    const entry = ResolvedKbEntryWithMetaSchema.parse(rawEntry);
    byId.set(entry.id, entry);
  }
  const built: EntryMap = { version: raw.version, byId };
  entryMapCache[language] = built;
  return built;
}

let searchIndex: AliasSearchIndex | null = null;

function getSearchIndex(): AliasSearchIndex {
  if (!searchIndex) searchIndex = buildAliasSearchIndex(ALIAS_INDEX);
  return searchIndex;
}

export function getKbEntry(kbId: string, language: Language): ResolvedKbEntryWithMeta | undefined {
  return getEntryMap(language).byId.get(kbId);
}

export function getKbVersion(language: Language): string {
  return getEntryMap(language).version;
}

/** Tier 0/1 resolution (exact/alias then conservative fuzzy) — the same tiers the app runs. */
export function resolveOffline(query: string): TextResolution {
  return resolveText(query, ALIAS_INDEX, getSearchIndex());
}

/**
 * Tier 0 only — exact alias match, no fuzzy tier. For free text the *Worker* is reading rather
 * than a person typing: model candidate labels and product ingredient lists. Both are already
 * correctly spelled, so the fuzzy tier adds nothing but false positives, and there are many
 * more chances for one: a single barcode runs every line of an ingredient list through the
 * resolver. Found the hard way — fuzzy maps the ingredient "salt" onto the alias "palta"
 * (avocado). A miss here renders `unknown` (AGENTS.md #10); a false hit renders the wrong
 * entry's verdict.
 *
 * Still the shared `resolveText`'s own exact tier, not a re-implementation (AGENTS.md #5): it
 * just refuses to accept a `fuzzy` result.
 */
export function resolveExact(text: string): string | null {
  const resolution = resolveText(text, ALIAS_INDEX, getSearchIndex());
  return resolution.type === 'exact' ? resolution.kbId : null;
}

/**
 * Maps a model candidate onto a KB id: its specific label first, then the plain generic name the
 * prompt also asks for ("Lindt 85% bar" → "dark chocolate"). Exact only — see `resolveExact`.
 */
export function resolveCandidateLabel(label: string, commonName?: string | null): string | null {
  return resolveExact(label) ?? (commonName ? resolveExact(commonName) : null);
}

export function getEntryCount(language: Language): number {
  return getEntryMap(language).byId.size;
}

/** The raw artefact exactly as bundled — served by `GET /v1/kb/:lang` and hashed by the manifest. */
export function getRawArtifact(language: Language): LanguageArtifact {
  return RAW_BY_LANGUAGE[language];
}

/** `confusable_with` of an entry, as the confirm screen's always-offered alternates (docs/03). */
export function getAlternates(kbId: string, language: Language): Alternate[] {
  const entry = getKbEntry(kbId, language);
  if (!entry) return [];
  return entry.confusableWith.flatMap((id) => {
    const other = getKbEntry(id, language);
    return other ? [{ kbId: other.id, label: other.displayName }] : [];
  });
}

/** Picks the KB language from a BCP 47 locale. Language only — never region (AGENTS.md #12). */
export function languageFromLocale(locale: string | undefined): Language {
  return locale?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export { normalise };

export function buildVerdict(params: {
  kbId: string;
  species: Species;
  language: Language;
  disclaimer: string;
}): VerdictPayload | null {
  const entry = getKbEntry(params.kbId, params.language);
  if (!entry) return null;
  return resolveVerdict({
    entry,
    species: params.species,
    kbVersion: getKbVersion(params.language),
    disclaimer: params.disclaimer,
  });
}
