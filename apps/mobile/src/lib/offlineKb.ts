import {
  type AliasIndex,
  type AliasSearchIndex,
  type ResolvedKbEntryWithMeta,
  ResolvedKbEntryWithMetaSchema,
  type TextResolution,
  buildAliasSearchIndex,
  resolveText,
} from '@canmyeatthis/shared';

import type { SupportedLanguage } from '@/i18n/namespaces';

import kbEn from '../../assets/kb/kb.en.json';
import kbEs from '../../assets/kb/kb.es.json';
import kbIndexArtifact from '../../assets/kb/kb.index.json';

/**
 * The bundled KB (docs/07 Phase 3, docs/02-tech-decisions.md D21): a static asset snapshot
 * synced from `packages/kb/dist` by `pnpm --filter kb run sync:assets` and committed to the
 * repo, not fetched OTA. Metro (and Jest, via jest-expo) bundle JSON imports directly, so this
 * is in memory the moment the module loads — no filesystem read, no async gap before the
 * resolver is usable, which is what keeps startup-to-interactive inside the <2 s budget.
 */
interface LanguageArtifact {
  version: string;
  lang: string;
  entries: unknown[];
}

const RAW_BY_LANGUAGE: Record<SupportedLanguage, LanguageArtifact> = {
  en: kbEn as LanguageArtifact,
  es: kbEs as LanguageArtifact,
};

const ALIAS_INDEX: AliasIndex = (kbIndexArtifact as { index: AliasIndex }).index;

interface EntryMap {
  version: string;
  byId: Map<string, ResolvedKbEntryWithMeta>;
}

const entryMapCache: Partial<Record<SupportedLanguage, EntryMap>> = {};

/**
 * Parses and validates lazily, once per language, rather than at module load for every
 * language up front — a given app session only ever needs the user's current language.
 * `ResolvedKbEntrySchema.parse` throwing here (a build/sync mismatch) is exactly the failure
 * mode we want: loud at development time, never a silently wrong verdict on a phone.
 */
function getEntryMap(language: SupportedLanguage): EntryMap {
  const cached = entryMapCache[language];
  if (cached) return cached;

  const raw = RAW_BY_LANGUAGE[language];
  const byId = new Map<string, ResolvedKbEntryWithMeta>();
  for (const rawEntry of raw.entries) {
    // With the metadata (`isIngredient`, …): barcode matching needs it, and the base schema
    // would strip it.
    const entry = ResolvedKbEntryWithMetaSchema.parse(rawEntry);
    byId.set(entry.id, entry);
  }
  const built: EntryMap = { version: raw.version, byId };
  entryMapCache[language] = built;
  return built;
}

let searchIndex: AliasSearchIndex | null = null;

/** Built once, lazily — this is the expensive part `docs/07 Phase 3`'s <150 ms budget is about. */
function getSearchIndex(): AliasSearchIndex {
  if (!searchIndex) searchIndex = buildAliasSearchIndex(ALIAS_INDEX);
  return searchIndex;
}

export function getKbEntry(
  kbId: string,
  language: SupportedLanguage,
): ResolvedKbEntryWithMeta | undefined {
  return getEntryMap(language).byId.get(kbId);
}

export function getKbVersion(language: SupportedLanguage): string {
  return getEntryMap(language).version;
}

/**
 * Tier 0 (exact/alias) then tier 1 (conservative fuzzy) resolution, entirely on-device
 * (docs/01-architecture.md §"resolution tiers"). Calls the shared, pure `resolveText` —
 * AGENTS.md #5 — against the bundled index built above. The alias index is language-agnostic
 * (docs/07 Phase 3: "cross-language alias fallback works" — one merged index, built by
 * `buildAliasIndex` across every language), so this takes no `language` argument; look the
 * resolved id up per-language with `getKbEntry` afterwards.
 */
export function resolveOffline(query: string): TextResolution {
  return resolveText(query, ALIAS_INDEX, getSearchIndex());
}

/**
 * Exact (alias) resolution only, for text nobody typed — an ingredient line from a product
 * database. Fuzzy matching is for a person's typos; applied to an ingredient list it produces
 * confident verdicts for things the product doesn't contain ("salt" → "palta", avocado).
 */
export function resolveExactOffline(text: string): string | null {
  const resolution = resolveOffline(text);
  return resolution.type === 'exact' ? resolution.kbId : null;
}
