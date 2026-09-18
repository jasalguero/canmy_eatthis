# 07 — Implementation Plan

> ⚠️ **Hobby build:** `docs/10-hobby-scope.md` §7 collapses these eleven phases into seven and cuts
> roughly a third of the features below (monetisation, dose bands, attestation-first, PostHog,
> plant-ID API, the 500-entry KB). Read it before starting. The acceptance criteria here still apply
> to the work that survives, and the phase mapping is in doc 10's table.

Eleven phases. Each is sized to be handed to a single agent working alone, states its dependencies,
and ends in acceptance criteria that can be checked without judgement calls. **A phase is not done
until every box is ticked.**

Phases 2, 4 and 5 are independent of each other after Phase 1 and can run in parallel across agents.
Everything else is sequential.

```
P0 ──► P1 ──┬──► P2 (UI)        ──┐
            ├──► P4 (offline res) ├──► P6 ──► P7 ──► P8 ──► P9 ──► P10
            └──► P5 (proxy)     ──┘
                 P3 (capture) ──────┘
```

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
- Biome (or ESLint+Prettier), Husky pre-commit, GitHub Actions running `typecheck lint test build`
- i18next + `i18next-icu` + expo-localization wired; `en` and `es` catalogues split by namespace
  (`common`, `home`, `result`, `errors`, `onboarding`, `legal`), may be near-empty
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

**Depends on:** P0. **Blocks:** everything.

- YAML schema and Zod validator per `docs/04-knowledge-base.md` §1
- `packages/kb/build.ts` → emits `kb.json` (entries) and `kb.index.json` (normalised alias → id),
  gzipped, with a SHA-256 and a version stamp
- Build fails on any violation of the seven schema rules in §1
- **Author Tier 1 (≈60) and Tier 2 (≈120) entries** with `en` and `es`, sources cited, dog and cat
  authored separately, `review.status: draft`
- **Extract the `signs` / `emergency_actions` controlled vocabulary (~120 terms) and translate it
  once** — this is what makes the mandatory translation tier affordable
- `display_name` and `aliases` for **both** languages on every entry; Spanish aliases authored by a
  native speaker as a search index, not translated (`docs/09-localisation.md` §4)
- `translations.<lang>` tier block per entry; build emits a per-language, per-tier coverage report
- Build emits one artefact per language plus a shared structural core, so a device downloads only
  the prose it needs
- `resolveVerdict(kbId, species, context)` in `packages/shared` — pure, no I/O, enforcing all five
  invariants from `docs/03-api-contract.md` with runtime assertions
- Fixture suites: verdict fixtures, resolution fixtures (including the negative near-miss set)

**Acceptance**
- [ ] ≥180 entries, every one validating, every one with both species
- [ ] Every `toxic` entry has `severity`, non-empty `emergency_actions`, ≥1 sourced citation
- [ ] `pnpm --filter kb build` emits a gzipped KB under 400 KB
- [ ] All five `VerdictPayload` invariants covered by passing tests
- [ ] Negative resolution fixtures all fail to match — "chocolate lab" does not resolve to chocolate
- [ ] Deliberately corrupting an entry fails the build with a readable error
- [ ] Every entry resolves from both English and Spanish input
- [ ] A `toxic` entry with `translations.es.tier_b: machine` fails the build
- [ ] An entry with `tier_a` below `approved` in a shipped language fails the build
- [ ] Every controlled-vocabulary id used by any entry exists in both language catalogues
- [ ] The per-tier coverage report is emitted; toxic-below-approved counts for Tiers A and B are zero

---

## Phase 2 — Design system and static UI

**Depends on:** P0 (P1 for realistic mock data). **Parallel with:** P3, P4, P5.

- Tokens, `tailwind.config.js` with the Tailwind palette **removed**, light and dark
- Full component inventory from `docs/06-ui-design-system.md` §3
- All screens built against **hardcoded mock data, no network**: Home, Identifying, Confirm,
  Result ×4 verdicts ×2 severities, History, Profile, Settings, First-run, every error state
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

## Phase 3 — Input capture and the image pipeline

**Depends on:** P2.

- `expo-camera` multi-shot (max 4), `expo-image-picker` multi-select, barcode scanning mode
- Permission flows including **denied** and **denied-permanently** (deep-link to Settings)
- `expo-image-manipulator` pipeline: resize longest edge → 1024 px, JPEG quality 0.8,
  **strip all EXIF**
- Thumbnail generation, removal, reordering, full-screen preview
- Draft persistence — the in-progress input survives a backgrounding

**Acceptance**
- [ ] Processed images average <200 KB; none exceed 400 KB
- [ ] Automated test runs `exiftool` over pipeline output: **zero** GPS or EXIF tags remain
- [ ] Permission denial does not dead-end — text input stays usable, with a route to Settings
- [ ] Check button enablement exactly matches the ≥1-photo-OR-≥2-chars rule (unit tested)
- [ ] A 12 MP photo processes in under 800 ms on a mid-range Android device

---

## Phase 4 — Offline resolution

**Depends on:** P1, P2. **Parallel with:** P3, P5.

- Bundle `kb.json` + `kb.index.json` as app assets; load and index at startup (target <150 ms)
- Exact match → alias match → Fuse.js fuzzy, **conservative threshold**, tuned against fixtures
- Wire Home → local resolution → Result, entirely offline
- Language-aware: Spanish input resolves through Spanish aliases

**Acceptance**
- [ ] "chocolate", "Chocolate", "chocolat", "uvas", "xilitol", "cebolla" all resolve correctly
- [ ] Un-accented Spanish resolves: "limon", "platano", "pina" all match
- [ ] The entire negative fixture set fails to match, including its Spanish near-misses
- [ ] An entry with `tier_c: missing` still renders a fully usable Spanish result — correct colour,
      glyph, verdict word, signs and emergency actions — with only the "Why" section marked as
      shown in English
- [ ] Cross-language alias fallback works: an English-only alias still resolves for a Spanish user
- [ ] Airplane mode: typed lookups work end to end with no error state
- [ ] Resolution completes in <50 ms on a mid-range Android device
- [ ] Cold start to interactive under 2 s with the KB loaded

---

## Phase 5 — The proxy service

**Depends on:** P0, P1. **Parallel with:** P2, P3, P4.

- Hono routes: `/v1/session`, `/v1/identify`, `/v1/verdict`, `/v1/kb/manifest`, `/v1/hotlines`
- Zod validation on every boundary, in and out
- `VisionProvider` adapter with **two** implementations (Gemini, OpenAI), structured output,
  `temperature: 0`, provider chosen from a KV config document
- Escalation: `confidence < 0.7` or `high_risk` KB flag → re-run on the stronger model, take the
  more cautious result
- Server-side KB (same build artefact), candidate → KB resolution, override list applied last
- KV response cache keyed on `(species, normalised text, perceptual image hash)`, 30-day TTL
- **Spend caps — built in this phase, in the same commit as the first model call** (`docs/10` §3):
  a global daily counter in KV with a hard refusal above threshold, a KV kill-switch flag for the
  vision path, provider-side quota caps set in the Google Cloud console, and per-device rate
  limiting on an anonymous UUID. Exceeding any of them degrades to offline-KB-only with an honest
  message — never to an error
- **Paid provider tier only.** Google's free tier trains on submitted content and permits human
  review of inputs and outputs; that is not acceptable for user photos (`docs/10` §2.1)
- Rate limiting; dev-mode session tokens behind an env flag that is **off in production**
- Barcode route → Open Food Facts / Open Pet Food Facts → ingredient scan against `is_ingredient`
  entries
- Versioned prompts in `src/prompts/`, prompt version recorded in the request log
- Prompt states that **text visible in the image may be in any language** and must be returned
  verbatim as seen; `model_fallback` prose responds in the user's language and is limited to a short
  factual description — never emergency instructions, which come only from the KB
- Structured logging: requestId, prompt version, KB version, provider, latency, cache hit,
  **normalised query only — never raw text, never image bytes**

**Acceptance**
- [ ] Contract tests pass against recorded provider fixtures — CI makes zero live model calls
- [ ] Cache hit returns in <100 ms; p95 uncached under 3 s
- [ ] `grep -r` finds no API key in any committed file; `wrangler secret list` is the only source
- [ ] Every error code in `docs/03-api-contract.md` is reachable and correctly shaped
- [ ] Invariant test: no response path can emit `verdict: "safe"` with `resolvedBy: "model_fallback"`
- [ ] Malformed model output (truncated JSON, wrong schema) degrades to `unknown`, never crashes
- [ ] **Forcing the global daily counter past its threshold refuses the vision path and leaves the
      offline KB, verdicts and hotline fully working**
- [ ] Flipping the KV kill switch disables the vision path within one request, no deploy
- [ ] A KV write failure degrades to "not cached", never to an error
- [ ] The configured provider is the paid tier; the free tier is used only in development
- [ ] Nightly live-provider job exists and reports drift against the image fixture set

---

## Phase 6 — Integration and the confirm gate

**Depends on:** P3, P4, P5.

- TanStack Query client, typed from `packages/shared`, retry with backoff, cancel on screen exit
- Full flow: Home → Identifying → Confirm → Result
- Confirm screen wired to real candidates and to `confusable_with` alternates
- Local resolution tried first even when a photo is attached
- Every error code mapped to its designed screen
- `identification_rejected_at_confirm` and `verdict_unknown` telemetry

**Acceptance**
- [ ] End-to-end against a 20-photo test set on both platforms; results recorded in
      `docs/eval/phase6.md` with per-item pass/fail
- [ ] Confirm screen never skipped for a photo-derived identification (asserted in code and tested)
- [ ] Killing the network mid-request produces the designed offline state, not a crash
- [ ] Identical `(kbId, species, context)` yields byte-identical verdicts on-device and server-side
      — shared fixture suite runs in both environments
- [ ] No unhandled promise rejections under Sentry in a 30-minute manual session

---

## Phase 7 — Safety, legal and emergency

**Depends on:** P6.

- First-run flow: what it is, what it is not, **AI-processing consent** (Apple 5.1.2)
- Text-only mode for users who decline photo upload — fully functional
- Disclaimer footer on every verdict screen; long form in Settings
- **Region**-aware hotline registry (not language-aware), bundled offline, `tel:` links, fees
  stated, the language each service operates in recorded, "find an emergency vet" maps deep link
- Disclaimer, ToS and privacy policy translated by a **legal** translator and reviewed for validity
  in each language and jurisdiction — a launch blocker per language
- "Report a wrong answer" → a real inbox
- Terms of service and privacy policy, drafted and lawyer-reviewed

**Acceptance**
- [ ] Every one of the eight non-negotiable rules in `docs/05-safety-legal.md` §1 has a passing test
      or a signed-off manual check
- [ ] Hotline CTA works in airplane mode, logged out, with quota exhausted, on an expired subscription
- [ ] Declining AI consent leaves a working app
- [ ] Every hotline number dialled and verified by a human; `verifiedAt` and operating language(s)
      recorded
- [ ] Legal review complete and recorded **for each shipped language**
- [ ] A Spanish speaker in a US region gets Spanish text and US hotline numbers

---

## Phase 8 — History, profile, polish

**Depends on:** P7.

- SQLite history with thumbnails, search, re-open, delete, KB version stamped per entry
- Pet profile: species, name, optional weight; weight requested non-blockingly after a first toxic
  result; risk bands activated
- Animation and haptic pass; empty, loading and error states finished
- KB Tier 3 entries expanded toward ~500
- OTA KB update flow implemented and exercised

**Acceptance**
- [ ] History survives app restart and reinstall-from-backup; readable offline
- [ ] Risk band renders `unknown` whenever weight or amount is missing — never guessed
- [ ] No numeric dose figure appears anywhere in the UI (grep + manual review)
- [ ] A KB edit reaches a running app via OTA in under 4 hours, end to end, timed
- [ ] ≥500 KB entries, all `review.status: approved`
- [ ] Spanish Tier A at 100% `approved`; Tier B ≥95% `approved`, and **100% for every `toxic` entry**

---

## Phase 9 — Hardening, attestation, monetisation

**Depends on:** P8.

- **Hobby build: App Attest / Play Integrity are deferred** until determined abuse appears — the
  spend caps from Phase 5 cover the scenario that actually costs money. **RevenueCat and PostHog are
  cut entirely** (`docs/10` §8)
- **Dev session mode disabled in production** — this part stays, and is a release blocker
- Sentry with source maps on both halves
- Optional: on-device ML Kit pre-filter to reject unusable photos before an API call
- Optional: specialist plant-ID route
- Performance pass: cold start, memory, bundle size, Hermes profiling

**Acceptance**
- [ ] Dev session mode is off in production
- [ ] Global daily cap reached → offline KB and hotline both still fully reachable
- [ ] Cold start under 2 s on a mid-range Android device
- [ ] Crash-free sessions above 99.5% across a week of internal testing

---

## Phase 10 — Store submission

**Depends on:** P9.

- **Hobby build:** there is no veterinary sign-off. The gate is instead the editorial standard in
  `docs/10-hobby-scope.md` §4 — every entry carries ≥2 independent authoritative sources, the
  source is displayed above the fold on every result, and thin or contested entries were omitted
  rather than guessed. If a vet can be found to review 60–80 entries as a favour, do it
- iOS: Privacy Manifest, App Privacy labels, purpose strings, review notes explaining the AI use
- Android: Health apps declaration, Data safety form, AI content disclosure
- Store listings, screenshots and ASO keywords per locale (es-ES distinct from es-MX if both ship),
  a demo video for reviewers
- TestFlight and Play internal testing with ≥20 real users
- EAS Submit pipelines; a documented and rehearsed rollback plan

**Acceptance**
- [ ] Every entry has ≥2 independent authoritative sources, verified by a manual pass
- [ ] The source is visible above the fold on every result screen
- [ ] Both declaration forms submitted and accepted
- [ ] ≥20 external testers, ≥100 real checks, feedback triaged
- [ ] A native Spanish speaker has walked the full flow end to end, including an emergency result
- [ ] The KB correction path exercised once under realistic conditions and timed
- [ ] Builds accepted by both stores

---

## Cross-cutting rules for every phase

1. **Never widen a verdict's optimism.** Any change that could turn an amber or red result green
   requires a KB change with vet sign-off, not a code change.
2. **`packages/shared` is the only place resolution logic lives.** Duplicating it in the app or the
   Worker is a review failure.
3. **No secrets in the repo.** Ever.
4. **Every phase leaves CI green.**
5. **Every new KB entry ships with its sources.** No exceptions, no "add later".
6. **No user-facing string literals in components.** Everything through `t()`, in both languages,
   never built by concatenating fragments.
7. **When in doubt, return `unknown`.** A false negative in this app is a dead animal; a false
   `unknown` is a mildly annoyed user.
