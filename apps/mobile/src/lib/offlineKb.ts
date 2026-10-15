import {
  type AliasIndex,
  type AliasSearchIndex,
  type KbBundle,
  type ResolvedKbEntryWithMeta,
  ResolvedKbEntryWithMetaSchema,
  type TextResolution,
  buildAliasSearchIndex,
  resolveText,
  suggestText,
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
  const updated = activeUpdate(language);
  if (updated) return updated;
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
  const updated = activeUpdate(activeLanguage);
  if (updated) return updated.search;
  if (!searchIndex) searchIndex = buildAliasSearchIndex(ALIAS_INDEX);
  return searchIndex;
}

function getAliasIndex(): AliasIndex {
  return activeUpdate(activeLanguage)?.index ?? ALIAS_INDEX;
}

/**
 * A KB update installed at launch (`lib/kbUpdate.ts`, docs/02 D38), already signature-checked and
 * validated. It replaces the bundled KB as a whole — entries and alias index together — and only
 * while the app is in the update's language, so an id the index finds always exists in the entries
 * it is looked up in. Any other language runs on the bundled KB, also as a whole.
 */
interface UpdatedKb extends EntryMap {
  lang: SupportedLanguage;
  index: AliasIndex;
  search: AliasSearchIndex;
}

let update: UpdatedKb | null = null;
let activeLanguage: SupportedLanguage | null = null;

function activeUpdate(language: SupportedLanguage | null): UpdatedKb | null {
  return update && language && update.lang === language && activeLanguage === language
    ? update
    : null;
}

/** The language the app is showing; an installed update applies only while it matches. */
export function setActiveKbLanguage(language: SupportedLanguage): void {
  activeLanguage = language;
}

export function installKbUpdate(bundle: KbBundle): void {
  update = {
    lang: bundle.lang,
    version: bundle.version,
    byId: new Map(bundle.entries.map((entry) => [entry.id, entry])),
    index: bundle.index,
    search: buildAliasSearchIndex(bundle.index),
  };
}

/** Back to the bundled KB everywhere. For tests, and for an update found faulty after install. */
export function clearKbUpdate(): void {
  update = null;
}

/** The version the app shipped with, which an update must differ from to be worth installing. */
export function getBundledKbVersion(language: SupportedLanguage): string {
  return RAW_BY_LANGUAGE[language].version;
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
 * AGENTS.md #5 — against the bundled index built above, or an installed update's. The alias index is language-agnostic
 * (docs/07 Phase 3: "cross-language alias fallback works" — one merged index, built by
 * `buildAliasIndex` across every language), so this takes no `language` argument; look the
 * resolved id up per-language with `getKbEntry` afterwards.
 */
export function resolveOffline(query: string): TextResolution {
  return resolveText(query, getAliasIndex(), getSearchIndex());
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

export interface KbSuggestion {
  kbId: string;
  /** The entry's display name in the person's language — what the chip says. */
  name: string;
}

/**
 * "Did you mean…?" candidates for a query that resolved to nothing. These are names to tap, never
 * an answer: the verdict for the one a person picks is built from the KB like any other lookup
 * (`suggestText` in `packages/shared`).
 */
export function suggestOffline(query: string, language: SupportedLanguage): KbSuggestion[] {
  return suggestText(query, getAliasIndex(), getSearchIndex()).flatMap((kbId) => {
    const entry = getKbEntry(kbId, language);
    return entry ? [{ kbId, name: entry.displayName }] : [];
  });
}
