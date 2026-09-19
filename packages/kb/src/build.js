import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { normalise } from '@canmyeatthis/shared';
import { parse as parseYaml } from 'yaml';
import { KbEntrySchema } from '../schema/entry.js';
import { EMERGENCY_ACTION_IDS, SIGN_IDS } from '../schema/vocab.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..');
export const DATA_DIR = join(PACKAGE_ROOT, 'data');
export const VOCAB_DIR = join(PACKAGE_ROOT, 'vocab');
const DIST_DIR = join(PACKAGE_ROOT, 'dist');
/**
 * Languages the build enforces Tier A/B approval rules for (docs/04 §1 rules 8–9,
 * docs/09-localisation.md §5 rules 1–2).
 */
export const SHIPPED_LANGUAGES = ['en', 'es'];
export const ALL_LANGUAGES = ['en', 'es'];
export class BuildError extends Error {}
function fail(message) {
  throw new BuildError(message);
}
/** `dataDir` defaults to the real `data/` directory; tests point it at a fixture directory. */
export function loadEntries(dataDir = DATA_DIR) {
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  if (files.length === 0) fail(`no YAML entries found in ${dataDir}`);
  return files.map((file) => {
    const raw = readFileSync(join(dataDir, file), 'utf8');
    let parsed;
    try {
      parsed = parseYaml(raw);
    } catch (err) {
      fail(`${file}: invalid YAML — ${err.message}`);
    }
    const result = KbEntrySchema.safeParse(parsed);
    if (!result.success) {
      fail(`${file}: schema validation failed\n${formatZodError(result.error)}`);
    }
    if (result.data.id !== file.replace(/\.ya?ml$/, '')) {
      fail(`${file}: entry id "${result.data.id}" must match its filename`);
    }
    return { file, entry: result.data };
  });
}
function formatZodError(error) {
  return error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
}
function loadVocabCatalogue(lang) {
  const raw = readFileSync(join(VOCAB_DIR, `${lang}.json`), 'utf8');
  return JSON.parse(raw);
}
/** docs/04 §1 rules 5–7: cross-entry checks that need the whole KB, not just one entry. */
export function validateCrossEntry(entries) {
  const idsById = new Map(entries.map((e) => [e.id, e]));
  // Rule 6: confusable_with ids all resolve.
  for (const entry of entries) {
    for (const other of entry.confusable_with) {
      if (!idsById.has(other)) {
        fail(`${entry.id}: confusable_with references unknown id "${other}"`);
      }
    }
  }
  // Rule 5: aliases (including display_name, which functions as an implicit alias) are unique
  // across the whole KB, per language, after normalisation.
  const aliasOwner = new Map(); // `${lang}:${normalised}` -> entry id
  for (const entry of entries) {
    for (const lang of ALL_LANGUAGES) {
      const candidates = [entry.display_name[lang], ...entry.aliases[lang]];
      for (const alias of candidates) {
        const key = `${lang}:${normalise(alias)}`;
        const owner = aliasOwner.get(key);
        if (owner && owner !== entry.id) {
          fail(
            `alias collision: "${alias}" (${lang}) normalises the same for "${owner}" and "${entry.id}"`,
          );
        }
        aliasOwner.set(key, entry.id);
      }
    }
  }
  // Rule 7: no alias is a substring of a different entry's display_name unless listed in that
  // entry's confusable_with ("onion" vs "onion powder" class errors).
  for (const entry of entries) {
    for (const other of entries) {
      if (other.id === entry.id) continue;
      for (const lang of ALL_LANGUAGES) {
        const otherName = normalise(other.display_name[lang]);
        for (const alias of [entry.display_name[lang], ...entry.aliases[lang]]) {
          const normalisedAlias = normalise(alias);
          const isSubstring = otherName.includes(normalisedAlias) && otherName !== normalisedAlias;
          if (isSubstring && !other.confusable_with.includes(entry.id)) {
            fail(
              `${entry.id}: alias "${alias}" (${lang}) is a substring of "${other.id}"'s display ` +
                `name ("${other.display_name[lang]}") but is not in ${other.id}'s confusable_with`,
            );
          }
        }
      }
    }
  }
}
export function buildCoverageReport(entries) {
  const perLanguage = {};
  for (const lang of ALL_LANGUAGES) {
    const tierA = { missing: 0, machine: 0, draft: 0, approved: 0 };
    const tierB = { missing: 0, machine: 0, draft: 0, approved: 0 };
    let toxicBelowApprovedTierA = 0;
    let toxicBelowApprovedTierB = 0;
    for (const entry of entries) {
      // English is the source language and is always considered "approved" Tier A/B — there is
      // nothing to translate. Only `es` (or a future added language) carries real tier status.
      const isToxic =
        entry.species.dog.verdict === 'toxic' || entry.species.cat.verdict === 'toxic';
      if (lang === 'en') {
        tierA.approved++;
        tierB.approved++;
        continue;
      }
      const t = entry.translations.es;
      tierA[t.tier_a]++;
      tierB[t.tier_b]++;
      if (isToxic && t.tier_a !== 'approved') toxicBelowApprovedTierA++;
      if (isToxic && t.tier_b !== 'approved') toxicBelowApprovedTierB++;
    }
    perLanguage[lang] = { tierA, tierB, toxicBelowApprovedTierA, toxicBelowApprovedTierB };
  }
  return { perLanguage };
}
/**
 * docs/04 §1 rules 8–9 / docs/09 §5 rules 1–2, enforced only for `shippedLanguages`.
 * `shippedLanguages` is a parameter (not just the module constant) so tests can prove the gate
 * actually fires — by simulating `es` as shipped against synthetic fixture entries — without
 * requiring the real, not-yet-reviewed `es` KB content to be dishonestly marked `approved`.
 * See docs/02-tech-decisions.md D17.
 */
export function validateShippedLanguageApproval(entries, shippedLanguages = SHIPPED_LANGUAGES) {
  for (const lang of shippedLanguages) {
    if (lang === 'en') continue; // English is the source language; nothing to gate.
    for (const entry of entries) {
      const t = entry.translations.es; // only `es` carries a translations block (en is the source)
      if (t.tier_a !== 'approved') {
        fail(`${entry.id}: tier_a must be "approved" for shipped language "${lang}"`);
      }
      const isToxic =
        entry.species.dog.verdict === 'toxic' || entry.species.cat.verdict === 'toxic';
      if (isToxic && (t.tier_b === 'machine' || t.tier_b === 'draft')) {
        fail(
          `${entry.id}: verdict "toxic" forbids tier_b "${t.tier_b}" in shipped language "${lang}"`,
        );
      }
    }
  }
}
/** docs/04 §1 rule 10: every vocabulary id used by any entry exists in every shipped catalogue. */
export function validateVocabCoverage(entries) {
  const usedSigns = new Set();
  const usedActions = new Set();
  for (const entry of entries) {
    for (const species of [entry.species.dog, entry.species.cat]) {
      for (const s of species.signs) usedSigns.add(s);
      for (const a of species.emergency_actions) usedActions.add(a);
    }
  }
  for (const lang of SHIPPED_LANGUAGES) {
    const catalogue = loadVocabCatalogue(lang);
    for (const id of usedSigns) {
      if (!(id in catalogue.signs)) {
        fail(`vocab/${lang}.json is missing translation for sign "${id}"`);
      }
    }
    for (const id of usedActions) {
      if (!(id in catalogue.emergency_actions)) {
        fail(`vocab/${lang}.json is missing translation for emergency_action "${id}"`);
      }
    }
  }
  for (const id of usedSigns) {
    if (!SIGN_IDS.includes(id)) fail(`unknown sign id used: "${id}"`);
  }
  for (const id of usedActions) {
    if (!EMERGENCY_ACTION_IDS.includes(id)) {
      fail(`unknown emergency_action id used: "${id}"`);
    }
  }
}
function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}
function writeArtifact(name, data) {
  const json = JSON.stringify(data);
  const buf = Buffer.from(json, 'utf8');
  const gz = gzipSync(buf);
  writeFileSync(join(DIST_DIR, name), buf);
  writeFileSync(join(DIST_DIR, `${name}.gz`), gz);
  return { bytes: buf.length, gzipBytes: gz.length, sha256: sha256(buf) };
}
function main() {
  const loaded = loadEntries();
  const entries = loaded.map((l) => l.entry);
  validateCrossEntry(entries);
  validateShippedLanguageApproval(entries);
  validateVocabCoverage(entries);
  const version = sha256(Buffer.from(JSON.stringify(entries))).slice(0, 12);
  // kb.json: the full entry set, structural core + all authored prose for every language.
  const kb = { version, generatedAt: new Date().toISOString(), entries };
  // kb.index.json: normalised alias -> id, across every language (docs/07 Phase 1).
  const index = {};
  for (const entry of entries) {
    for (const lang of ALL_LANGUAGES) {
      for (const alias of [entry.display_name[lang], ...entry.aliases[lang]]) {
        index[normalise(alias)] = entry.id;
      }
    }
  }
  mkdirSync(DIST_DIR, { recursive: true });
  const kbStats = writeArtifact('kb.json', kb);
  const indexStats = writeArtifact('kb.index.json', { version, index });
  const coverage = buildCoverageReport(entries);
  writeFileSync(join(DIST_DIR, 'coverage-report.json'), JSON.stringify(coverage, null, 2));
  // One artefact per language plus the shared structural core (docs/07 Phase 1, docs/09 §5),
  // so a device downloads only the prose it needs.
  for (const lang of ALL_LANGUAGES) {
    const perLang = {
      version,
      lang,
      entries: entries.map((entry) => projectLanguage(entry, lang)),
    };
    writeArtifact(`kb.${lang}.json`, perLang);
  }
  console.log(`Built ${entries.length} entries, KB version ${version}`);
  console.log(
    `kb.json: ${kbStats.bytes} bytes (${kbStats.gzipBytes} gzipped), sha256 ${kbStats.sha256}`,
  );
  console.log(`kb.index.json: ${indexStats.bytes} bytes (${indexStats.gzipBytes} gzipped)`);
  console.log('Coverage report:', JSON.stringify(coverage, null, 2));
}
function projectLanguage(entry, lang) {
  const pickSpecies = (species) => ({
    verdict: species.verdict,
    severity: species.severity,
    headline: species.headline[lang],
    summary: species.summary[lang],
    signs: species.signs,
    onset_hours: species.onset_hours,
    emergency_actions: species.emergency_actions,
  });
  return {
    id: entry.id,
    displayName: entry.display_name[lang],
    category: entry.category,
    aliases: entry.aliases[lang],
    confusableWith: entry.confusable_with,
    isIngredient: entry.is_ingredient,
    highRisk: entry.high_risk,
    species: { dog: pickSpecies(entry.species.dog), cat: pickSpecies(entry.species.cat) },
    sources: entry.sources,
  };
}
// Only run when executed directly (`pnpm build` / `tsx src/build.ts`), not when imported by
// tests — tests exercise the exported validation functions against their own fixtures instead.
const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    main();
  } catch (err) {
    if (err instanceof BuildError) {
      console.error(`KB build failed: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}
