#!/usr/bin/env node
/**
 * Regenerates `apps/mobile/src/mock/kbEntries.ts` from the Phase 1 KB build artefacts.
 *
 * Phase 2 screens run on mock data with no bundled KB (docs/07 Phase 2), but the mock has to
 * behave like the real content — real Spanish length, real source labels, real controlled
 * vocabulary ids — so it is generated from `packages/kb/dist/kb.<lang>.json` rather than
 * invented. Run `pnpm --filter @canmyeatthis/kb build` first if `dist/` is stale.
 *
 * This file and its output are deleted in H3, when the real KB is bundled as an app asset.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const IDS = [
  'carrot',
  'cheese',
  'chocolate_milk',
  'chocolate_dark',
  'grapes_raisins',
  'lily',
  'macadamia_nuts',
];
const LANGUAGES = ['en', 'es'];
const OUT = new URL('../apps/mobile/src/mock/kbEntries.ts', import.meta.url);

const versions = {};
const byLanguage = {};

for (const lang of LANGUAGES) {
  const path = new URL(`../packages/kb/dist/kb.${lang}.json`, import.meta.url);
  const kb = JSON.parse(readFileSync(path, 'utf8'));
  versions[lang] = kb.version;
  byLanguage[lang] = {};
  for (const id of IDS) {
    const entry = kb.entries.find((e) => e.id === id);
    if (!entry) throw new Error(`entry "${id}" is not in kb.${lang}.json`);
    // Projected onto ResolvedKbEntry exactly: the mock must not carry fields the type lacks,
    // or a screen could read something the real runtime shape does not have.
    byLanguage[lang][id] = {
      id: entry.id,
      displayName: entry.displayName,
      species: Object.fromEntries(
        ['dog', 'cat'].map((species) => {
          const s = entry.species[species];
          return [
            species,
            {
              verdict: s.verdict,
              severity: s.severity,
              headline: s.headline,
              summary: s.summary,
              signs: s.signs,
              onset_hours: s.onset_hours,
              emergency_actions: s.emergency_actions,
            },
          ];
        }),
      ),
      sources: entry.sources.map((s) => ({ label: s.label, url: s.url })),
    };
  }
}

const file = `import type { ResolvedKbEntry } from '@canmyeatthis/shared';

/**
 * Mock knowledge-base entries for Phase 2. **Generated — do not edit by hand.**
 *
 * Phase 2 builds every screen against hardcoded mock data with no network and no bundled KB
 * (docs/07 Phase 2) — bundling \`kb.json\` as an app asset is H3's job (docs/10 §7). But the
 * screens still have to be reviewed against content that behaves like the real thing: Spanish
 * that actually runs 20–30% longer than the English, real source labels long enough to wrap, and
 * the real controlled-vocabulary ids so the Result screen's signs list is exercised.
 *
 * So this file is generated from the Phase 1 build artefacts (\`packages/kb/dist/kb.<lang>.json\`)
 * rather than invented: same entries, same prose, same ids, projected onto \`ResolvedKbEntry\`.
 * Regenerate with \`pnpm mock:kb\`. When H3 bundles the real KB, this file and its generator are
 * deleted and nothing else changes — the screens already consume \`ResolvedKbEntry\` and
 * \`resolveVerdict()\`.
 *
 * The chosen entries cover every verdict and every severity, plus the two cases that matter most
 * for review: \`lily\` (caution for dogs, severe toxic for cats — the species toggle changes the
 * answer) and \`macadamia_nuts\` (toxic for dogs, genuinely \`unknown\` for cats).
 */

export type MockLanguage = 'en' | 'es';

export const MOCK_KB_VERSION: Record<MockLanguage, string> = ${JSON.stringify(versions, null, 2)};

export const MOCK_ENTRIES: Record<MockLanguage, Record<string, ResolvedKbEntry>> = ${JSON.stringify(byLanguage, null, 2)};

/** Entry ids present in the mock set, in the order the gallery lists them. */
export const MOCK_ENTRY_IDS = ${JSON.stringify(IDS)} as const;
`;

writeFileSync(OUT, file);
console.log(`wrote ${OUT.pathname} (${IDS.length} entries × ${LANGUAGES.length} languages)`);
