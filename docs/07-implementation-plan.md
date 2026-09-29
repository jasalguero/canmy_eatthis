# 07 — Implementation Plan

Seven phases. Each is sized to be handed to a single agent working alone, states its dependencies,
and ends in acceptance criteria that can be checked without judgement calls. **A phase is not done
until every box is ticked.**

```
P0 ──► P1 ──┬──► P2 (UI) ──► P3 (capture + offline) ──┬──► P5 (integration + safety) ──► P6 (stores)
            └──► P4 (Worker) ─────────────────────────┘
```

Phase 4 is independent of Phases 2 and 3 after Phase 1 and can run in parallel.

## Releases

The phases do not all ship at once (`docs/02-tech-decisions.md` D28):

- **First release — typed lookups and barcode scanning.** Phases 0–3, the safety and legal parts of
  Phase 5, and Phase 6. A complete, free app that answers typed questions and scanned products
  with sourced verdicts: no server of ours, no API key, no model spend, and no AI consent screen.
  It de-risks store review and gets the app to real users before any model spend starts.
- **Second release — photo identification.** Phase 4 (already built) and the photo parts of Phase 5,
  switched on with `EXPO_PUBLIC_FEATURE_PHOTO_ID`, then a store update. The privacy policy must be
  updated first (D31).

---

## Phase 0 — Foundations

**Deliverable:** an empty but correct monorepo that builds, lints, types and runs on both platforms.

- pnpm workspaces: `apps/mobile`, `services/api`, `packages/shared`, `packages/kb`
- `apps/mobile`: `npx create-expo-app` on **SDK 57 / RN 0.86**, New Architecture enabled,
  expo-router, TypeScript `strict: true`, absolute imports via `@/`
- `services/api`: Wrangler + Hono + TypeScript, `/health` returning `{ok:true, version}`
- `packages/shared`: Zod schemas from `docs/03-api-contract.md` — `Species`, `Verdict`,
  `VerdictPayload`, `IdentifyRequest`, `IdentifyResponse`, `ApiError`. Types via `z.infer` only.
- `packages/shared`: `normalise(text)` — lowercase, strip accents/diacritics, collapse whitespace,
  singularise, strip punctuation. **Used by both app and Worker.** Unit tested against a fixture list
  including Spanish accents.
- Biome, Husky pre-commit, GitHub Actions running `typecheck lint test build`
- i18next + `i18next-icu` + expo-localization wired; `en` and `es` catalogues split by namespace
- **Language and region as two separate persisted settings**, each defaulted from the device and
  each independently overridable
- Pseudo-locale (accented, +40% padding) available in dev builds
- `normalise()` fixtures cover Spanish diacritics and `ñ`→`n`, `ü`→`u` folding
- `.env.example`, `wrangler.toml` with secrets referenced but not committed
- EAS project created, dev client builds configured for iOS and Android

**Acceptance**
- [ ] `pnpm -r typecheck && pnpm -r lint && pnpm -r test` green
- [ ] App boots to a blank screen on an iOS simulator **and** an Android emulator
- [ ] `pnpm --filter api dev` serves `/health`
- [ ] CI green on a pull request
- [ ] Changing a Zod schema in `packages/shared` produces a type error in both consumers
- [ ] Switching language and switching region are independent — changing one does not move the other
- [ ] The pseudo-locale renders in a dev build

---

## Phase 1 — Knowledge base

**Depends on:** P0. **Blocks:** everything. The long pole — weeks, not days.

- YAML schema and Zod validator per `docs/04-knowledge-base.md` §1
- `packages/kb/build.ts` → emits `kb.json` (entries) and `kb.index.json` (normalised alias → id),
  gzipped, with a SHA-256 and a version stamp
- Build fails on any violation of the schema rules in `docs/04-knowledge-base.md` §1
- **60–80 entries**, each meeting the editorial standard in `docs/04-knowledge-base.md` §2: at least
  two independent authoritative sources, `en` and `es`, dog and cat authored separately. No
  `mechanism` prose, no dose bands
- **Extract the `signs` / `emergency_actions` controlled vocabulary and translate it once** — this is
  what makes the mandatory translation tier affordable
- `display_name` and `aliases` for **both** languages on every entry; Spanish aliases authored by a
  native speaker as a search index, not translated (`docs/09-localisation.md` §4)
- `translations.<lang>` tier block per entry; build emits a per-language, per-tier coverage report
- Build emits one artefact per language plus a shared structural core, so a device downloads only
  the prose it needs
- `resolveVerdict(kbId, species)` in `packages/shared` — pure, no I/O, enforcing every invariant from
  `docs/03-api-contract.md` with runtime assertions
- Fixture suites: verdict fixtures, resolution fixtures (including the negative near-miss set)

**Acceptance**
- [ ] 60–80 entries, every one validating, every one with both species and at least two sources
- [ ] Every `toxic` entry has `severity`, non-empty `emergency_actions` and its sources
- [ ] `pnpm --filter kb build` emits a gzipped KB under 400 KB
- [ ] All `VerdictPayload` invariants covered by passing tests
- [ ] Negative resolution fixtures all fail to match — "chocolate lab" does not resolve to chocolate
- [ ] Deliberately corrupting an entry fails the build with a readable error
- [ ] Every entry resolves from both English and Spanish input
- [ ] A `toxic` entry with `translations.es.tier_b: machine` fails the build
- [ ] An entry with `tier_a` below `approved` in a shipped language fails the build
- [ ] Every controlled-vocabulary id used by any entry exists in both language catalogues
- [ ] The per-tier coverage report is emitted; toxic-below-approved counts for Tiers A and B are zero

---

## Phase 2 — Design system and static UI

**Depends on:** P0 (P1 for realistic mock data). **Parallel with:** P4.

- Tokens, `tailwind.config.js` with the Tailwind palette **removed**, light and dark
- Full component inventory from `docs/06-ui-design-system.md` §3
- All screens built against **hardcoded mock data, no network**: Home, Identifying, Confirm,
  Result ×4 verdicts ×2 severities, History, Profile, Settings, First-run, every error state
- **Source-forward result screen:** the citation above the fold, above every collapsible section
- The three signature interactions (§2) implemented
- `__dev__` gallery screen rendering every component in both themes
- Accessibility checklist (§5) satisfied

**Acceptance**
- [ ] Every screen navigable from the gallery with mock data, zero network calls in the build
- [ ] Light and dark screenshots of all screens committed to `docs/screenshots/`
- [ ] CI contrast check passes for every verdict token pair (≥4.5:1)
- [ ] Grayscale screenshots: all four verdicts still distinguishable
- [ ] 200% font scale: no clipping or overlap on any screen
- [ ] VoiceOver reads the verdict word first on the Result screen
- [ ] `grep -rE "#[0-9a-fA-F]{6}" apps/mobile/src --include=*.tsx` returns nothing outside `theme/`
- [ ] **Every screen renders correctly at `es` + 200% font scale** — the worst case, and the one
      that breaks the verdict banner
- [ ] A pseudo-locale run surfaces zero hardcoded strings
- [ ] CI grep finds no `marginLeft`/`marginRight`/`left:`/`right:` layout properties

---

## Phase 3 — Capture and offline resolution

**Depends on:** P1, P2. At the end of this phase the app answers typed questions fully offline.

- `expo-camera` multi-shot (max 4), `expo-image-picker` multi-select, barcode scanning mode
- Permission flows including **denied** and **denied-permanently** (deep-link to Settings)
- `expo-image-manipulator` pipeline: resize longest edge → 1024 px, JPEG quality 0.8,
  **strip all EXIF**
- Thumbnail generation, removal, reordering, full-screen preview
- Draft persistence — the in-progress input survives a backgrounding
- Bundle `kb.json` + `kb.index.json` as app assets; load and index at startup (target <150 ms)
- Exact match → alias match → Fuse.js fuzzy, **conservative threshold**, tuned against fixtures
- Wire Home → local resolution → Result, entirely offline
- Language-aware: Spanish input resolves through Spanish aliases

**Acceptance**
- [ ] Processed images average <200 KB; none exceed 400 KB
- [ ] Automated test runs `exiftool` over pipeline output: **zero** GPS or EXIF tags remain
- [ ] Permission denial does not dead-end — text input stays usable, with a route to Settings
- [ ] Check button enablement exactly matches the ≥1-photo-OR-≥2-chars rule (unit tested)
- [ ] A 12 MP photo processes in under 800 ms on a mid-range Android device
- [ ] "chocolate", "Chocolate", "chocolat", "uvas", "xilitol", "cebolla" all resolve correctly
- [ ] Un-accented Spanish resolves: "limon", "platano", "pina" all match
- [ ] The entire negative fixture set fails to match, including its Spanish near-misses
- [ ] Cross-language alias fallback works: an English-only alias still resolves for a Spanish user
- [ ] Airplane mode: typed lookups work end to end with no error state
- [ ] Resolution completes in <50 ms on a mid-range Android device
- [ ] Cold start to interactive under 2 s with the KB loaded

---

## Phase 4 — The Worker

**Depends on:** P0, P1. **Parallel with:** P2, P3. Ships with the second release.

- Hono routes: `/v1/identify`, `/v1/verdict`, `/v1/kb/manifest`, `/v1/hotlines`. No sessions:
  callers send an anonymous device UUID (D24)
- Zod validation on every boundary, in and out
- `VisionProvider` adapter; one provider, Gemini on the **paid tier** (D24,
  `docs/01-architecture.md` §6.2), structured output, `temperature: 0`
- Escalation: `confidence < 0.7` or `high_risk` KB flag → re-run on the stronger model, take the
  more cautious result
- Server-side KB (same build artefact), candidate → KB resolution, override list applied last
- KV response cache keyed on `(species, normalised text, perceptual image hash)`, 30-day TTL
- **Spend cap — built in the same commit as the first model call** (`docs/01-architecture.md`
  §6.3): a global daily counter in KV with a hard refusal above threshold, a KV kill switch for the
  vision path, provider-side quota caps set in the Google Cloud console, and per-device rate
  limiting on the anonymous UUID. Exceeding any of them degrades to offline-KB-only with an honest
  message — never to an error
- Barcode route → Open Food Facts / Open Pet Food Facts → ingredient scan against `is_ingredient`
  entries, using the same shared code as the app (D29)
- Versioned prompts in `src/prompts/`, prompt version recorded in the request log
- Prompt states that **text visible in the image may be in any language** and must be returned
  verbatim as seen; `model_fallback` prose responds in the user's language and is limited to a short
  factual description — never emergency instructions, which come only from the KB
- Structured logging: requestId, prompt version, KB version, provider, latency, cache hit,
  **normalised query only — never raw text, never image bytes**

**Acceptance** — status 2026-09-24 (evidence: `services/api/test/`, D24)
- [x] Contract tests pass against provider fixtures, and CI makes zero live model calls. `fetch`
      is stubbed and any unexpected URL fails the test. Fixtures follow Gemini's documented
      response shape but were authored by hand, not recorded (no key was available)
- [ ] Cache hit returns in <100 ms (**met**, asserted in `identify.test.ts`). p95 uncached under
      3 s: **not yet measured**, needs a live key
- [x] `grep -r` finds no API key in any committed file: `scripts/check-no-secrets.sh`, run in CI
- [x] Every error code in `docs/03-api-contract.md` is reachable and correctly shaped, except
      `ATTESTATION_FAILED`, which nothing returns because attestation is out of scope (D24)
- [x] Invariant test: no response path can emit `verdict: "safe"` with `resolvedBy: "model_fallback"`
- [x] Malformed model output (truncated JSON, wrong schema) degrades to `unknown`, never crashes
      (7 fixtures)
- [x] **Forcing the global daily counter past its threshold refuses the vision path and leaves the
      offline KB and verdicts fully working.** The hotline CTA has no server dependency
- [x] Flipping the KV kill switch disables the vision path within one request, no deploy. Tested,
      and smoke-tested under `wrangler dev`
- [x] A KV write failure degrades to "not cached", never to an error
- [ ] The configured provider is the paid tier; the free tier is used only in development. This
      is a Google Cloud console step (`services/api/README.md` setup) and cannot be checked from
      the repo
- [ ] Nightly live-provider job exists and reports drift against the image fixture set. The job
      exists (`.github/workflows/live-eval.yml`), but it needs the `GEMINI_API_KEY_EVAL` secret
      and real photos in `services/api/eval/images/`

---

## Phase 5 — Integration, safety and legal

**Depends on:** P3 (and P4 for the photo parts).

Safety and legal — **first release**:
- First-run flow: what the app is, what it is not; **AI-processing consent** only in builds with
  photo identification (Apple 5.1.2)
- Disclaimer footer on every verdict screen; long form in Settings
- **Region**-aware hotline registry (not language-aware), bundled offline, `tel:` links, fees
  stated, the language each service operates in recorded, "find an emergency vet" maps link
  (`docs/05-safety-legal.md` §3, D30)
- "Report a wrong answer" → a real inbox
- Privacy policy and terms of use, written from what the app actually does, in every shipped
  language, linked from first run and Settings (`docs/05-safety-legal.md` §6, D31)

Photo identification — **second release**:
- TanStack Query client, typed from `packages/shared`, retry with backoff, cancel on screen exit
- Full flow: Home → Identifying → Confirm → Result
- Confirm screen wired to real candidates and to `confusable_with` alternates
- Local resolution tried first even when a photo is attached
- Every error code mapped to its designed screen
- Text-only mode for users who decline photo upload — fully functional

**Acceptance**
- [ ] Every one of the non-negotiable rules in `docs/05-safety-legal.md` §1 has a passing test or a
      recorded manual check
- [ ] Hotline CTA works in airplane mode and with the daily cap exhausted
- [ ] Every hotline number dialled and verified by a person; `verifiedAt` and operating language(s)
      recorded
- [ ] A Spanish speaker in a US region gets Spanish text and US hotline numbers
- [ ] The privacy policy and terms of use are published and match the app's actual behaviour
- [ ] *(second release)* End-to-end against a 20-photo test set on both platforms; results recorded
      in `docs/eval/` with per-item pass/fail
- [ ] *(second release)* Confirm screen never skipped for a photo-derived identification (asserted
      in code and tested)
- [ ] *(second release)* Killing the network mid-request produces the designed offline state, not a
      crash
- [ ] *(second release)* Identical `(kbId, species)` yields byte-identical verdicts on-device and
      server-side — shared fixture suite runs in both environments
- [ ] *(second release)* Declining AI consent leaves a working app

---

## Phase 6 — Store submission

**Depends on:** P5.

- **The editorial gate:** every entry carries at least two independent authoritative sources, the
  source is displayed above the fold on every result, and thin or contested entries were omitted
  rather than guessed (`docs/04-knowledge-base.md` §2). If a vet can be found to review the entries
  as a favour, do it
- iOS: Privacy Manifest, App Privacy labels, purpose strings, review notes explaining what the
  release does (and, for the photo release, the AI use)
- Android: Health apps declaration, Data safety form, and for the photo release the AI content
  disclosure
- Store listings, screenshots and keywords in English and Spanish, and a demo video for reviewers
- TestFlight and Play testing with real users
- EAS Submit pipelines; a documented rollback plan
- Performance pass: cold start, memory, bundle size

**Acceptance**
- [ ] Every entry has at least two independent authoritative sources, verified by a manual pass
- [ ] The source is visible above the fold on every result screen
- [ ] Both declaration forms submitted and accepted
- [ ] Testers outside the project have run real checks, and their feedback is triaged
- [ ] A native Spanish speaker has walked the full flow end to end, including an emergency result
- [ ] The KB correction path exercised once under realistic conditions and timed
- [ ] Cold start under 2 s on a mid-range Android device
- [ ] Builds accepted by both stores

---

## After the first release

Worth building once the app is in users' hands, in rough order:

- **Photo identification** — the second release above.
- **History** — SQLite, with thumbnails, search, re-open and delete, KB version stamped per entry.
  The History screen exists on mock data and is development-only until then.
- **Pet profile** — species and name only (`docs/00-product-spec.md` §2.5).
- **OTA knowledge base updates** — a KB edit reaching a running app within hours, via the Worker's
  manifest.
- **Knowledge base growth** — only under the editorial standard.
- **Optional:** an on-device pre-filter (ML Kit) that rejects unusable photos before an API call.

---

## Cross-cutting rules for every phase

1. **Never widen a verdict's optimism.** Any change that could turn an amber or red result green
   requires a KB change that meets the editorial standard, not a code change.
2. **`packages/shared` is the only place resolution logic lives.** Duplicating it in the app or the
   Worker is a review failure.
3. **No secrets in the repo.** Ever.
4. **Every phase leaves CI green.**
5. **Every new KB entry ships with its sources.** No exceptions, no "add later".
6. **No user-facing string literals in components.** Everything through `t()`, in both languages,
   never built by concatenating fragments.
7. **When in doubt, return `unknown`.** A false negative in this app is a dead animal; a false
   `unknown` is a mildly annoyed user.
