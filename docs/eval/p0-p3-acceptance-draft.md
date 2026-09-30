# P0–P3 acceptance pass — DRAFT (2026-09-30)

Evidence gathered on `main` at 67426cf by running the commands below locally. Nothing here has been
copied into `docs/07-implementation-plan.md`; tick boxes there only once a human agrees.

Legend: ✅ verified by a command run in this pass · 🟡 code/test exists, not run or only partly
covers the criterion · ⬜ needs a device, a person, or a not-yet-built check · ❌ failed.

## Blocker found and resolved during this pass

`packages/kb/data/alcohol.yaml` line 20 had a stray closing `"` and no opening one, so
`pnpm --filter kb build` and the three `packages/kb` test files failed (introduced in `bbf17e0`).
The opening quote is now present in the working tree and `git diff HEAD` is empty, so the fix
was already committed by the time this was re-checked. After the fix: KB build OK, `kb` tests
21 passed / 4 skipped. CI on GitHub may still show a red run from before the fix; confirm the
latest run is green.

A repo-wide `biome check .` also reported one format error in `apps/mobile/src/mock/cases.ts`
earlier. On re-run from the repo root, `pnpm lint:fix` reports no fixes and `biome check .` is clean.

## Commands run

| Command | Result |
|---|---|
| `pnpm -r typecheck` | ✅ all 4 workspaces clean |
| `pnpm -r test` | ✅ shared 47, kb 21 (+4 skipped: drafts suite, `skipIf(!hasDrafts)`), api 95, mobile 143 |
| `pnpm --filter kb build` | ✅ after the alcohol fix |
| `scripts/check-ui-hygiene.sh`, `check-safe-claims.sh`, `check-no-secrets.sh` | ✅ exit 0 |
| `node scripts/check-contrast.mjs` | ✅ "all contrast and semantic colour checks pass" |
| `npx biome check .` | ✅ clean on re-run (394 files) |

## Phase 0

- ✅ `pnpm -r typecheck && pnpm -r lint && pnpm -r test` — typecheck and test green. Lint: the root
  `lint` script is `biome check .` and is clean on re-run; it is not a per-package script.
- 🟡 App boots on iOS simulator **and** Android emulator — **iOS ✅** (2026-09-30, iPhone 17, iOS 27.0,
  Xcode 27, standalone dev-client build with Metro): boots to the first-run screen. This needed D32
  (`enableSceneSupport`); before it, the build crashed at launch with `SIGTRAP` in
  `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`. **Android ⬜** not run.
- 🟡 `pnpm --filter api dev` serves `/health` — Worker tests pass (95); the P4 notes say it was
  smoke-tested under `wrangler dev`. Not re-run here.
- ⬜ CI green on a pull request — `.github/workflows/ci.yml` runs typecheck, lint, safe-claims,
  secrets, contrast, UI hygiene, Expo versions, test, build, KB-snapshot check. Check the latest run
  on GitHub; earlier runs were likely red because of the alcohol entry.
- 🟡 Schema change breaks both consumers — `apps/mobile` and `services/api` both typecheck against
  `packages/shared`. Do the deliberate-break experiment once and record it.
- 🟡 Language and region independent — `apps/mobile/src/lib/settings.test.ts` exists (passes).
  Confirm it asserts that changing one leaves the other unchanged.
- 🟡 Pseudo-locale renders in a dev build — `src/i18n/pseudoLocale.ts` exists and is wired in
  `i18n/index.ts`. Needs a visual check.

## Phase 1

- 🟡 60–80 entries — **74** YAML files in `packages/kb/data/`; all validate (build passes). All 74
  carry `en` and `es` at Tier A and B `approved`. Both-species and ≥2-sources: the build enforces
  it, and a scan found ≥2 `url:` lines in every file, but that is a weak proxy. Do the manual
  source-independence pass (also a P6 item). One draft file remains in `packages/kb/drafts/`.
- 🟡 Every toxic entry has severity, non-empty `emergency_actions`, sources — enforced by the schema
  in the build; not separately spot-checked.
- ✅ Gzipped KB under 400 KB — `kb.json.gz` 29,065 B; per-language `kb.en.json.gz` 15,613 B,
  `kb.es.json.gz` 17,291 B; index 4,468 B.
- 🟡 `VerdictPayload` invariants — `packages/shared` tests pass (47). Map each invariant in
  `docs/03-api-contract.md` to a named test before ticking.
- ✅ Negative resolution fixtures — `packages/kb/fixtures/negative-resolutions.ts` (with Spanish
  near-misses) is exercised by the passing kb tests.
- 🟡 Corrupting an entry fails the build with a readable error — **demonstrated by accident**: the
  alcohol typo produced `KB build failed: alcohol.yaml: invalid YAML … line 20, column 11`. That is
  the YAML-syntax path; schema-violation paths are covered in `build.test.ts`.
- 🟡 Every entry resolves from en and es — covered by `resolution.fixtures.ts` for a subset. Confirm a
  test iterates *all* entries; if not, add one.
- ✅ Toxic entry with `es.tier_b: machine` fails; ✅ `tier_a` below approved fails — both
  `validateShippedLanguageApproval` `toThrow(BuildError)` cases in `build.test.ts`.
- ✅ Vocabulary ids exist in both catalogues — `validateVocabCoverage(realEntries)` passes on the
  real data.
- ✅ Coverage report emitted; toxic-below-approved is 0 for Tier A and B in both en and es
  (`packages/kb/dist/coverage-report.json`).

## Phase 2

- 🟡 Every screen navigable from gallery with mock data, zero network — `gallery.tsx` plus the
  screens exist and mobile tests pass. "Zero network calls" is not asserted anywhere I found.
- ✅ Light and dark screenshots committed — `docs/screenshots/{light,dark,grayscale,es-200}`.
- ✅ Contrast check passes — `scripts/check-contrast.mjs`, wired into CI.
- 🟡 Grayscale distinguishable — screenshots exist in `docs/screenshots/grayscale`; a person must
  look at them.
- 🟡 200% font scale — `scripts/screenshots.mjs` simulates it (`es-200`, 27 files). Simulation, not a
  device with system font scale at 200%; needs a device pass.
- ⬜ VoiceOver reads the verdict word first — manual, on a device.
- ✅ No colour literals outside `theme/` — `check-ui-hygiene.sh` passes (my own `grep` for
  `#rrggbb` in `.tsx` also found nothing, though the shell glob errored, so rely on the script).
- 🟡 `es` + 200% on every screen — same simulated set as above.
- 🟡 Pseudo-locale surfaces zero hardcoded strings — no automated check found; run in dev build.
- 🟡 No `marginLeft`/`marginRight`/`left:`/`right:` — covered by `check-ui-hygiene.sh` if it
  includes that rule; confirm by reading the script.

## Phase 3

- 🟡 Images average <200 KB, none >400 KB — `imagePipeline.test.ts` exists; measure on real photos.
- ⬜ **`exiftool` zero-tags test** — no `exiftool` reference in the repo; only a code comment
  claiming re-encode drops EXIF. This is the unbuilt automated check the plan asks for.
- 🟡 Permission denial doesn't dead-end — `permissions.test.ts` passes; confirm denied-permanently →
  Settings deep-link on a device.
- ✅ Check-button rule (≥1 photo OR ≥2 chars) — `checkInput.test.ts` passes.
- ⬜ 12 MP in <800 ms on mid-range Android — device measurement.
- ✅ "chocolate", "uvas", "xilitol", "cebolla" resolve — `resolution.fixtures.ts` and
  `offlineKb.test.ts`. 🟡 "chocolat", "limon", "platano", "pina": not found by my grep of the
  fixtures; verify they are present or add them.
- ✅ Negative fixture set fails to match, incl. Spanish near-misses — `negative-resolutions.ts`.
- 🟡 English-only alias resolves for a Spanish user — check for a cross-language fixture.
- 🟡 Airplane mode — `offlineKb.ts` resolves from bundled assets with no network path; run once in
  airplane mode on a device.
- ⬜ Resolution <50 ms and cold start <2 s on mid-range Android — device measurement.

## Suggested order to close the gaps

1. Confirm the latest CI run on GitHub is green.
2. Add the missing automated checks: exiftool test, all-entries-resolve-en/es test, the missing
   Spanish fixtures, a no-network assertion for the mock build.
3. One device session (iOS sim + a real mid-range Android): boot, airplane mode, permissions,
   VoiceOver, 200% system font, timings.
4. Then tick the boxes in `docs/07-implementation-plan.md`, citing this file.
