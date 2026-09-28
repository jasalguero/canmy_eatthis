# 02 — Technology Decisions

Each entry: **decision**, alternatives considered, why. Implementing agents should not deviate
without recording a new entry here.

---

## D1 — Expo (managed) on SDK 57 / React Native 0.86, New Architecture on

**Alternatives:** bare React Native; Flutter; two native apps.

Expo's managed workflow now covers everything this app needs — camera, image picker, image
manipulation, secure store, haptics, blur, updates — with config plugins as the escape hatch for
anything else. EAS Build removes the Xcode/Gradle toolchain from day-to-day work and EAS Submit
removes most of the store upload ritual. EAS Update is what lets a KB correction or a copy fix reach
users in hours, which matters enormously for this product specifically.

New Architecture (Fabric + TurboModules) is the default on SDK 57 and is required for the animation
quality target. Do not opt out.

Flutter would be a defensible alternative; React Native is chosen because it was the stated
requirement and the ecosystem gap has closed.

**Pin the SDK version in Phase 0 and do not chase releases mid-build.**

## D2 — TypeScript, `strict: true`, shared Zod schemas as the single source of truth

Zod schemas live in `packages/shared` and are consumed by both the app and the Worker. Types are
*inferred* from the schemas (`z.infer`), never hand-written alongside them. The Worker validates
every inbound and outbound payload against the same schema the app uses. This is what keeps
independently-built halves from drifting, which matters when different agents build them.

## D3 — expo-router (file-based routing)

**Alternatives:** React Navigation directly.

expo-router *is* React Navigation with a file-based convention on top. The convention is worth it
here specifically because multiple agents will add screens; a directory layout is a contract that
does not need to be explained.

## D4 — NativeWind v4 for styling, on top of a hand-built token layer

**Alternatives:** Tamagui; Unistyles; plain StyleSheet; styled-components.

Tamagui is faster at the compiler level and has a richer component set, but it is opinionated,
has a heavier learning curve and its component API is a thing agents get wrong. NativeWind is
Tailwind semantics over `StyleSheet` — familiar, predictable, and consistent across many authors,
which is the actual constraint here.

**Critical caveat:** NativeWind is a styling mechanism, not a design system. Tailwind's default
palette must be *replaced*, not extended, by the project tokens in `docs/06-ui-design-system.md`.
An agent reaching for `bg-red-500` instead of `bg-verdict-toxic` is a review failure.

## D5 — State: Zustand for client state, TanStack Query for server state

**Alternatives:** Redux Toolkit; Context; Jotai.

Zustand holds species selection, draft inputs and pet profile — small, synchronous, unremarkable.
TanStack Query owns everything that crosses the network: retries with backoff, request
deduplication, cancellation on screen exit, and offline-aware refetch. Do not hand-roll fetch state.

## D6 — Cloudflare Workers + Hono for the proxy

**Alternatives:** Vercel Functions; Supabase Edge Functions; AWS Lambda; a Fly.io container.

Workers win on the two axes that matter: **zero idle cost** (this app will have long quiet periods)
and **no cold start** (a 300 ms Lambda cold start is a meaningful fraction of the latency budget).
KV gives the response cache and D1 gives the KB and anonymised query log without a separate database
to run. Hono is a thin, typed router with first-class Workers support.

Supabase Edge Functions are the runner-up and would be the choice if the project later needs auth
and a relational database — revisit if accounts are added.

## D7 — Vision: provider adapter with at least two implementations

Interface in `services/api/src/providers/`:

```ts
interface VisionProvider {
  id: string;
  identify(input: IdentifyInput): Promise<IdentifyCandidates>;
  costEstimate(input: IdentifyInput): number;
}
```

Ship `gemini.ts` and `openai.ts` in Phase 5. Selection is config, not code —
a KV-stored config document chooses the primary and escalation providers so a provider outage or a
price change is a config edit, not a deploy. Use JSON-schema-constrained structured output on every
provider. `temperature: 0`.

## D8 — Barcode scanning as a first-class input, via `expo-camera`

For packaged products a barcode is free, instant and exact where a photo is slow, costly and a
guess. Resolve against **Open Food Facts** and **Open Pet Food Facts** (open data, ODbL — attribution
required, check terms before shipping). The returned ingredient list is then matched against KB
entries flagged `is_ingredient`, which is how the app catches xylitol in gum, onion powder in
stock cubes, and theobromine in a cocoa product without any model call at all.

## D9 — Local KB: bundled JSON + a prebuilt alias index; fuzzy search via Fuse.js

**Alternatives:** SQLite FTS5 via expo-sqlite; a remote-only KB.

At the expected size (~500–1,500 entries, under 1 MB) an in-memory index loaded at startup is
simpler and faster than FTS5, and it works before the first launch completes. Revisit if the KB
passes ~5,000 entries.

Fuzzy matching must be **conservative**. A false match is worse than no match, because it produces
a confident verdict for the wrong item. Tune the threshold against a fixture set of real typos and
prefer falling through to the model over a marginal match.

## D10 — History in `expo-sqlite`; drafts and preferences in MMKV; tokens in `expo-secure-store`

No cloud sync in v1 (see product spec §6). SQLite is right for history because history is queried
and searched; MMKV is right for small hot key-values; SecureStore is the only correct place for the
attestation token.

## D11 — Abuse control: spend caps first, attestation later

**Superseded for the hobby build by `docs/10-hobby-scope.md` §3.** For a free app run by one
person, the failure mode is not cost per call but an unbounded bill. A global daily counter in KV
plus a dashboard kill switch plus provider-side quota caps is ~a morning's work and covers the
scenario that actually costs money. Per-device rate limiting on an anonymous UUID handles casual
abuse. Attestation is deferred until determined abuse actually appears.

The original reasoning, which still applies if this ever becomes a funded product:

### Original: device attestation, not accounts

App Attest (iOS) and Play Integrity (Android) produce a token the Worker verifies to establish that
the caller is a genuine install of this app on a genuine device. That token is exchanged for a
short-lived session JWT, which is what subsequent calls carry. Rate limit on the device identity
inside that token.

This gives abuse resistance without asking a panicking user to create an account.
**MVP shortcut:** anonymous device UUID + IP rate limiting in Phase 5; real attestation before store
submission in Phase 9. Do not ship to production on the shortcut.

## D12 — i18n from Phase 0: `i18next` + `i18next-icu` + `expo-localization`

**Alternatives:** `react-intl`; `lingui`; deferring i18n to v2.

English and Spanish at launch, architected for N languages. Deferring is the option explicitly
rejected: retrofitting i18n into a shipped React Native app is several times the cost of building
it in, and the knowledge-base schema in particular cannot be reshaped cheaply once it holds 500
entries.

**ICU MessageFormat from day one**, not later. English and Spanish both have two plural forms, so
ICU looks like overhead now; Polish, Russian and Arabic do not, and adopting ICU afterwards is a
full re-key of every catalogue. Catalogues are split by namespace (`common`, `home`, `result`,
`errors`, `onboarding`, `legal`).

**Language and region are separate settings**, both defaulted from `expo-localization` and both
independently overridable. Language drives UI strings and KB prose; region drives poison-control
hotlines, weight units and regional food coverage. A Spanish speaker in the US needs Spanish text
and US hotline numbers — conflating the two is a safety bug, not a cosmetic one.

**Logical layout properties everywhere** (`marginStart`, not `marginLeft`). Neither launch language
is RTL; this costs nothing now and is the difference between a week and a month if Arabic is ever
added.

Full treatment in `docs/09-localisation.md` — including why KB aliases are functional search data
rather than translation, and why KB prose can never be machine-translated to `approved`.

## D13 — Observability: Sentry (crashes and Worker errors) + PostHog (product analytics)

Two events matter more than the rest and should be instrumented in Phase 6:
`identification_rejected_at_confirm` (the user said "not right" — every one of these is a near-miss
worth studying) and `verdict_unknown` (a KB gap worth backfilling).

**Never log image contents or free text as analytics properties.** Log hashes and KB ids.

## D14 — Monetisation: none

**Decided 2026-09-18.** This is a free hobby app. No RevenueCat, no purchase code, no quotas, no
paywall, no subscription state anywhere in the app or the Worker. Delete this concern rather than
deferring it — an unused purchase SDK is still a dependency, a privacy disclosure and a store
review question.

Not charging also narrows the liability surface (`docs/10-hobby-scope.md` §5) and means no
requirement to register as autónomo in Spain for a free giveaway. Both change the moment money is
involved, which is a reason to leave it alone.

The superseded plan — RevenueCat, a free daily tier and a subscription, with the emergency path
never paywalled — is recoverable from this file's history if this ever becomes a product.

## D15 — Monorepo with pnpm workspaces

```
apps/mobile          Expo app
services/api         Cloudflare Worker
packages/shared      Zod schemas, types, verdict logic, normalisation — used by both
packages/kb          KB source data, build script, validation, fixtures
```

`packages/shared` holding the *resolution logic* (not just types) is deliberate: the same
normalise-and-match code runs on-device and at the edge, so local and server resolution cannot
disagree.

## D16 — Phase 0 schema deviations from `docs/03-api-contract.md` (hobby scope)

Implementing Phase 0 (`packages/shared/src/schemas/`), two of docs/03's schemas as written
assume the funded plan and conflict with `docs/10-hobby-scope.md`. Per AGENTS.md "Before you
deviate", recording the change here rather than silently diverging:

1. **`VerdictPayload` drops `mechanism`, `riskBand`, `riskBandExplanation`.** Doc 10 §1/§4 cuts
   per-entry mechanism prose and weight×amount risk banding outright (AGENTS.md #16) — they are
   exactly the highest-expertise, least-reviewable parts of the funded schema, and Doc 10 is
   explicit that they don't exist without a vet. `onsetHours` is kept: it's a sourced fact
   ("signs typically appear within N–M hours"), not a judgement call, so it clears the bar Doc 10
   §4 sets.
2. **`POST /v1/verdict` request drops `context` (`petWeightKg`, `amount`).** Both inputs existed
   only to compute `riskBand`, which no longer exists. The request is now `{ kbId, species }`.
3. **`ApiError` drops `QUOTA_EXCEEDED` (402, "Paywall sheet"), adds `SPEND_CAP_EXCEEDED`.** Doc
   03's `QUOTA_EXCEEDED` belonged to the funded plan's per-user subscription quota; AGENTS.md #18
   cuts all monetisation code, so there is nothing to paywall. `SPEND_CAP_EXCEEDED` names the
   real hobby-scope failure mode instead (Doc 10 §3): the *global* daily vision-call counter is
   exceeded, and the app must degrade to offline-KB-only with an honest message, never an error
   screen.

Everything else in doc 03 (`Species`, `Verdict`, `IdentifyRequest`, `IdentifyResponse`, the
`toxic`/`unknown`/`model_fallback` invariants) is implemented as specified, including as runtime
`superRefine` checks in the Zod schemas themselves rather than left to convention.

## D17 — Phase 1: `review.status` has no vet behind it, and `es` ships gated by a config flag

Implementing Phase 1 (`packages/kb`), two points from docs/04 §1 and docs/09 §5 need recording
because there is no licensed vet available in the hobby build (`docs/10-hobby-scope.md` §4):

1. **`review.status: approved` means "meets the editorial standard in docs/10 §4"** — ≥2
   independent authoritative sources, no thin or contested claims, own-words prose — recorded
   against the author's own name in `reviewed_by`, not a veterinary sign-off. Doc 04 rule 4 ("no
   entry ships to production with `review.status !== approved`") is a *release* gate, enforced
   later (Phase 10); Phase 1 entries are authored as `draft` or `needs_review` and that is
   correct, per doc 07 Phase 1's own instruction to author with `review.status: draft`.
2. **`build.ts` takes a `SHIPPED_LANGUAGES` list and enforces the Tier A/B approval rules
   (docs/04 §1 rules 8–9, docs/09 §5 rules 1–2) only for languages in that list.** Flipping a
   language into `SHIPPED_LANGUAGES` is the concrete signal that native-speaker review
   (docs/09 §4 rule 1) has happened — the build must never require a language to be approved
   before that review, or the only way to keep it green would be to lie about review status.
   **Resolved 2026-09-19:** the Phase 1 pilot batch's `es` content (Claude-drafted, recorded as
   such in each entry's `translations.es.translated_by`) was reviewed by a native Spanish
   speaker (Jose Salguero, recorded in `reviewed_by`), so `es` is now in `SHIPPED_LANGUAGES`
   and its entries carry `tier_a: approved` / `tier_b: approved`. New entries or languages
   re-enter through the same gate: draft status until a named native reviewer signs off.

## D18 — Phase 2: `accent` is a fill colour, and two `on*` tokens were added to the palette

Implementing Phase 2, the contrast check written alongside the tokens (`scripts/check-contrast.mjs`)
failed seven of its own assertions against the palette `docs/06-ui-design-system.md` §1 fixes by
value. Three changes resolve that without repainting a design doc:

1. **`accent` is never a meaning-carrying foreground.** Doc 06 §1 pins the light accents
   (`safe #14A06B`, `caution #E0A800`, …) and they are mid-tone: `caution.accent` on
   `caution.surface` is 1.94:1, nowhere near the 3:1 a non-text signal needs. Rather than change
   values the design doc states literally, the *usage* is narrowed: `accent` is a fill and a
   decorative tint only. The verdict glyph — which doc 06 §1 requires as a non-colour signal —
   renders in `onBg` on the banner and in `fg` on a tinted surface, both CI-checked ≥4.5:1. The
   accent-as-foreground assertions are removed from the check with that reasoning recorded in its
   header; nothing in the app may reintroduce the pattern.
2. **Two tokens added: `verdict.*.onAccent` and `brand.onPrimary`.** Doc 06 §4 puts a
   `toxic.accent` fill under the `EmergencyCallButton`, and doc 06 §1 gives no label colour for a
   fill. The polarity is not constant — white reaches 4.69:1 on light `toxic.accent` but only
   2.48:1 on the dark one, and the dark `brand.primary` mint takes 2.79:1 with white — so the
   label colour cannot be a hardcoded white and has to be a per-theme token. Both are CI-checked
   ≥4.5:1 against their fill. (This extends the four-key verdict shape in doc 06 §1 the same way
   `onBg` already did.)
3. **Borders are checked for ordering, not for a ratio.** The check asserted
   `border.default` ≥3:1 on `surface.base`, which no theme passes (1.42:1 light, 1.90:1 dark) and
   which its own header already said was the wrong rule: borders here are decorative separators,
   not non-text UI components, and WCAG's 3:1 does not apply to them. Focus visibility comes from
   `brand.primary`, which is checked. The implemented rule is now the one the header described —
    `subtle < default < strong`, ordered by contrast against `surface.base` so it means the same
    thing in both themes, where the polarity flips.

## D19 — TypeScript 7 (the native compiler), pinned to `^7.0.2`

**Decided 2026-09-22.** D2 fixed the *shape* of our TypeScript use — `strict: true`, Zod-inferred
types, one shared schema source — but never pinned a major version, and the workspace sat on 5.x
(`^5.7.3`, resolving to 5.9.3). All five `package.json`s (root + the four workspace packages) now
declare `^7.0.2`.

**Why 7 and not 6.** TypeScript 7 is the Go-based native compiler (`tsgo`), now the stable `latest`
on npm. It is a drop-in `tsc` replacement that is materially faster, and it is the line the project
is heading for regardless: 6.0 is the last JS-based release and exists mainly as a bridge. Going
straight to 7 skips the bridge. Concretely, options deprecated in 6.0 are *removed* in 7.0 —
`baseUrl` among them — so 7 forces the clean `paths`-relative-to-tsconfig form rather than letting us
keep a deprecated option silenced with `ignoreDeprecations`. (The mobile tsconfig's `baseUrl` was
already migrated off as part of the same effort.)

**Alternatives:** stay on 5.x (defers the migration and keeps surfacing 6.0 deprecation warnings in
editors that run a newer bundled compiler); step to 6.0 first (an extra hop with no upside — 6.0 is
the bridge, not the destination).

**Verified:** all four packages `tsc --noEmit` clean and the full test suite green on 7.0.2; every
package's `tsc` resolves to 7.0.2.

**One caveat to know about:** `i18next` and `react-i18next` declare `typescript@^5` as a peer
dependency, so `pnpm install` now reports unmet peers for them. This is cosmetic, not a breakage —
the range records which major the libraries were *tested* against, and their types check and their
behaviour is unchanged under 7 (typecheck + tests green). If a future release of either still pins
`^5` and we want the warning gone, the lever is upgrading those libraries, not downgrading the
compiler.

**A second caveat, found during H3 (2026-09-23):** on Node 20.9.0, every package's `tsc` script
(`tsc --noEmit` / `tsc -p tsconfig.build.json`) fails with
`ERR_UNKNOWN_FILE_EXTENSION` on `typescript/bin/tsc` — that file is a `#!/usr/bin/env node`
shebang script with no extension, and pnpm's generated `node_modules/.bin/tsc` shim invokes it via
an explicit `node <path>` rather than executing it directly, which makes Node's ESM loader treat
the extensionless file as an entry module under this package's `"type": "module"` and reject it.
Running the same file directly (`node .../typescript/lib/tsc.js`, bypassing the shim) works and
produces correct output — the compiler itself is fine; only the `.bin` shim's invocation path
breaks. `pnpm --filter <pkg> run typecheck` / `build` therefore fail in-place. **Superseded by
D27:** the repo now requires Node 24, which is not affected. On an old Node 20.x this still applies. Until either Node or
this TypeScript build is updated to close the gap, work around it locally by invoking
`node node_modules/.pnpm/typescript@7.0.2/node_modules/typescript/lib/tsc.js` directly in place of
`tsc`.

## D20 — H3 draft persistence: zustand + AsyncStorage, not MMKV

D10 specified MMKV for drafts and preferences. `lib/settings.ts` (H0/H2) already used zustand's
`persist` middleware over `@react-native-async-storage/async-storage` instead, without an ADR
recording the change — this entry closes that gap for both call sites at once rather than adding
a second, inconsistent storage engine for the H3 draft store (`lib/draft.ts`: species,
description, in-progress photo URIs).

**Why AsyncStorage over MMKV here:** MMKV is a native module — adopting it means a config-plugin
change and a fresh dev-client build, for a payload that is a handful of short strings written on
every keystroke of a multiline text field and read once at startup. AsyncStorage already ships
with Expo, zustand's `persist` already debounces/batches writes to it, and nothing about this
app's draft or settings data is large or write-frequent enough to hit AsyncStorage's actual
weak point (many small keys at high frequency under heavy concurrent load). MMKV is the right
call for `history` in a later phase (`docs/02` D10 keeps SQLite there, unaffected by this entry) —
just not for two small key-value blobs.

**Verified:** `lib/draft.ts`'s unit tests pass, and a manual run confirmed a value written to the
draft store survives a full page reload (the web target's equivalent of a backgrounding) by
reading `localStorage['canmyeatthis.draft.v1']` directly.

## D21 — Bundled KB ships as a committed static asset, not fetched OTA

docs/01-architecture.md's diagram calls the on-device KB "OTA updatable"; docs/07 Phase 8 is where
that update *mechanism* (a versioned manifest, a background fetch, a diff against the running
app's copy) actually gets built — well past H3. H3 only needs the KB usable fully offline from
first launch, so `apps/mobile/assets/kb/{kb.en,kb.es,kb.index}.json` is a plain committed asset,
synced from `packages/kb/dist` by `pnpm --filter kb run sync:mobile`
(`packages/kb/scripts/sync-mobile-assets.mjs`) and imported with a static `import` in
`lib/offlineKb.ts` — Metro bundles it like any other asset, so it is in memory the instant the
module loads, no filesystem read and no async gap before the resolver works.

The risk this creates — the shipped snapshot silently drifting from the KB source after a content
edit — is closed by a CI step (`.github/workflows/ci.yml`) that re-runs the build and the sync and
`git diff --exit-code`s the asset folder, the same style of guardrail the repo already uses for
safe-claims/contrast/UI-hygiene. Whoever edits `packages/kb/data` and forgets to re-sync gets a
failing PR, not a silently stale app.

**Alternatives considered:** fetching the KB from the Worker on first launch (rejected — H3 has no
Worker yet, and doc10 §7's H3 checkpoint is explicitly "no server, no API key, no spend"); bundling
the JSON straight into the JS bundle via a package import from `@canmyeatthis/kb`'s own `dist`
(rejected — that directory is build output, gitignored and ephemeral, and Metro resolving across
a workspace package's gitignored `dist` is exactly the kind of implicit cross-package coupling
`packages/kb`'s own doc comments already avoid elsewhere).

## D22 — Fuzzy text resolution lives in `packages/shared`, with a length-ratio guard beyond Fuse's own threshold

The tier-1 fuzzy matcher docs/01 §"resolution tiers" and docs/02 D9 call for
(`resolveText`/`buildAliasSearchIndex`, `packages/shared/src/resolveText.ts`, using `fuse.js`)
lives in `packages/shared`, not in `apps/mobile`, even though only the app calls it in H3. AGENTS.md
#5 is about verdict resolution disagreeing between the app and the Worker, but the same argument
applies one step earlier: H4's Worker will need to map a model's free-text candidate label onto a
KB id, and that is the same alias-matching problem a typed query solves offline. Fuse.js has no
native or Node-only dependencies, so the identical function will run unmodified in the Worker's V8
isolate later — duplicating this logic there instead would be exactly the "app and Worker
disagree" failure AGENTS.md #5 exists to prevent, just one layer removed from `resolveVerdict`.

Two things worth recording about tuning it, both found empirically against the real KB (see
`packages/kb/src/resolveText.test.ts` and `packages/kb/fixtures/fuzzy-resolutions.ts`), not
guessed:

1. **Fuse's own `threshold` constructor option does not reliably bound the score of what it
   returns.** A Fuse instance built with a *looser* threshold can still return hits scored above
   it (empirically: `threshold: 0.25` returned a hit scored `0.2662`). `resolveText` therefore
   builds Fuse with a loose threshold purely so it does not discard candidates internally, and
   applies the real, conservative cutoff (`FUZZY_THRESHOLD = 0.25`) itself against `hit.score`.
2. **A length-ratio guard is required in addition to the score, or short words falsely match long
   aliases.** `"peanut"` scores `~0.008` against the alias `"peanut butter"` — a *better* score
   than a genuine typo like `"onyon"` gets against `"onion"` (`~0.2`) — because Fuse's
   `ignoreLocation` substring-style match doesn't penalise a query that is simply a strict prefix
   of a longer alias. No score threshold can separate the two cases, because the false positive
   scores better. `resolveText` additionally requires
   `min(len(query), len(alias)) / max(len(query), len(alias)) ≥ 0.7`, which keeps every real typo
   in the fixture set while rejecting `"peanut"`/`"maní"` resolving to `peanut_butter` — a
   distinction that matters here specifically, since a raw peanut and peanut butter are a
   different safety question, not just a different string.

Also recorded: an ambiguous fuzzy match — the best two scoring hits map to two *different* KB ids
within a small margin of each other (e.g. bare `"chocolate"` between `chocolate_dark` and
`chocolate_milk`) — resolves to no match, not a guess. This is D9's "prefer falling through over a
marginal match" applied literally, and it means doc07 Phase 4's acceptance list (written against
the funded 500-entry KB) does not transfer literally: `"chocolate"` alone is not expected to
resolve in this KB, because two real, differently-verdicted entries both plausibly own it.

**Verified:** `packages/shared/src/resolveText.test.ts` (synthetic index, including the ambiguity
and length-ratio cases) and `packages/kb/src/resolveText.test.ts` (the real built KB — every
`POSITIVE_RESOLUTIONS` and `FUZZY_POSITIVE_RESOLUTIONS` fixture resolves, every
`NEGATIVE_RESOLUTIONS` and `FUZZY_FALSE_FRIENDS` fixture does not) both pass.

### D22 addendum — short queries resolve only by same-sound spelling, not by Fuse (2026-09-24)

**Bug:** typing `"salt"` showed the **avocado** verdict. `"salt"` is one substitution from the
Spanish alias `"palta"`, scoring `0.250` with length ratio `0.8`, so it passed both guards above.
Sweeping ~400 common English/Spanish food words against the built `kb.index.json` found about 20
more cases, nearly all 4–6 letters: `hueso`→queso (cheese), `masa`/`papa`→pasa (raisins),
`pino`/`pine`→vino/wine, `beef`/`beet`→beer, `corn`→licor (alcohol), `lime`→lilies,
`cake`→café, `chip`/`chile`→chive, `perro`/`bollo`→puerro/cebolla (alliums), `arroz`→carrot,
`curry`→currant, `cereza`→cerveza, and one longer word, `licorice`→licore. All of them are now in
`FUZZY_FALSE_FRIENDS`.

**Why no threshold fixes it:** in a word this short, one edit usually lands on a different real
word, and that scores exactly like a real typo. `"hueso"`→queso and the positive fixture
`"kueso"`→queso both score `0.200`. `"cereza"`→cerveza and the positive `"garlik"`→garlic both
score `0.167`. The other candidates were checked against the fixtures and rejected:
- *First character must match:* this breaks the positives `kueso`, `sebolla`, `silitol` and `zylitol`.
- *Same-language aliases only:* `hueso` and `queso` are both Spanish, so this does not help, and
  `kb.index.json` does not record an alias's language anyway.

**Change** (`packages/shared/src/resolveText.ts`):
1. Queries of **≤6 normalised characters no longer go through Fuse.** They resolve only when their
   `phoneticKey` exactly equals an alias's key. The key covers only three spelling pairs, one for
   each short positive fixture: `qu`≈`ku` (`kueso`), hard `c`≈`k` (`garlik`) and `y`≈`i`
   (`onyon`). Aliases whose keys collide across two entries are treated as ambiguous and never
   resolve. Adding a new pair needs a fixture that justifies it and a re-run of the sweep.
2. **`FUZZY_THRESHOLD` goes from 0.25 to 0.2** for the Fuse path (7+ characters). `licorice`
   scored exactly 0.250. Every positive still on the Fuse path scores ≤0.182.

**Cost:** short typos that are not same-sound spellings now return `none` instead of a match
(for example `coffe` or `chedar`). This is D9 working as intended: an honest "not found" is better
than a confident wrong verdict. services/api is unaffected, because D24 already keeps model labels
and ingredient lists off the fuzzy tier.

## D23 — `SpeciesToggle`'s pill dropped `react-native-reanimated`, undiagnosed

**Decided 2026-09-23**, from a bug report during H3 device testing, not from a design review.

`SpeciesToggle`'s sliding pill (docs/06 §2 signature interaction #1) was built on
`react-native-reanimated` (`useSharedValue`/`useAnimatedStyle`/`withSpring`) from H2 onward. On a
real device (iPhone, Expo Go, SDK 57 — the app's first ever real-device test; H0–H2 were built
and reviewed without one) the pill rendered with **no colour and no position at all**, in both
themes, with no error or warning surfaced anywhere. Two rounds of fixes narrowed this down without
resolving it:

1. First hypothesis: NativeWind's `cssInterop` registration for `Animated.View`
   (`theme/animated.ts`) wasn't reliably applying a *colour class* on device — plausible, since
   this exact codebase has hit that class of bug once before (see that file's own doc comment).
   Fix: read the colour from `tokens` directly and set it via `style` instead of `className`.
   Result: no change.
2. Second hypothesis: the pill had zero size (`halfWidth` never set), making the colour moot. An
   on-device debug readout (a temporary `<Text>` printing the live values) ruled this out
   conclusively: `halfWidth=175`, `theme=light`, `color=#2F6F62` — every JS-computed value feeding
   the animated style was correct. The style still never reached the native view, not even the
   *initial*, non-animated position.

At that point the only remaining explanation is that `useAnimatedStyle`'s output isn't being
committed to this native view at all — a Reanimated/Fabric interop failure with no reproduction
on web (react-native-web's Reanimated shim doesn't go through the same native pipeline) and no
device available to this project's agents to debug it further (no Xcode/Simulator in this
environment; the user's phone is the only real device in the loop, and probing it is limited to
what can be read off a screenshot).

**The fix ships without a diagnosis.** `SpeciesToggle` no longer imports
`react-native-reanimated` at all: `halfWidth` and the selected species already live in React
state, so the pill's `transform`/`backgroundColor`/`borderRadius` are computed from that state and
applied to a plain `View`. This cannot fail the way the animated version did, because it does not
go through Reanimated's worklet/UI-thread pipeline. The cost is real: the pill now snaps instead
of sliding with a spring. That is an acceptable trade for a control docs/07 Phase 3 itself calls
"a safety control as much as a piece of chrome" — correctness beats polish here without
question, and AGENTS.md's own tie-breaker (favour the animal over the flourish) says the same
thing.

**Update, same day:** the verdict banner was reported with the identical symptom — no colour at
all, on the real device that had just shown the fixed toggle working. That makes it two for two,
not a `SpeciesToggle`-specific quirk, so the same fix was applied everywhere `Animated.View`
carried anything load-bearing rather than waiting for a third report:

- **`VerdictBanner`** — the wash-in and glyph spring are gone; the banner is a plain `View` with
  `backgroundColor` from `tokens`, unconditionally. This is the single highest-stakes colour in
  the app (AGENTS.md #2), so it was converted the moment the banner-specific report came in.
- **`identifying.tsx`'s photo shimmer** — removed outright rather than reimplemented without
  Reanimated. It was always decorative (the doc comment already said the stage text list, not the
  shimmer, carries the information), and a `withRepeat` loop has no cheap non-Reanimated
  equivalent worth building for a purely cosmetic effect.
- **`Skeleton`** — the pulse is gone; it is a plain static placeholder. Not currently reachable by
  a real user (only the `__dev__` gallery uses it today), converted anyway so it isn't the next
  landmine when it is wired into a real loading state.
- **`theme/animated.ts`** (the `cssInterop(Animated.View, ...)` registration module) — deleted.
  Once all four usages above were converted, nothing in the app imported it any more, and keeping
  a utility that exists to work around a library that does not reliably render on-device is not a
  utility worth keeping around unused.

**Still left open:** *why*. This is a Reanimated/Fabric interop failure with no reproduction on
web (react-native-web's Reanimated shim doesn't go through the same native pipeline), no crash, no
warning, and no device available to this project's agents to debug it further (no Xcode/Simulator
in this environment — the user's phone is the only real device in the loop, and probing it was
limited to what could be read off an on-device debug `<Text>` and a screenshot). `react-native-
reanimated` remains a dependency — `expo-router`'s drawer navigation and other Expo internals
require it as a peer regardless of whether this app's own code uses it — so it has not been
removed from `package.json`, only from every place this app's own components relied on its
animated-style output actually reaching the screen. If a future agent wants to reintroduce an
animation here, do not reach for `cssInterop`/inline-`style` tweaks as a first response (both were
tried against this exact failure and did not work) — first establish, on a real device, that
`useAnimatedStyle`'s output visibly reaches a plain test view at all.

## D24 — H4 Worker: no sessions, one provider, exact-only matching for machine-read text

**Decided 2026-09-24**, implementing H4 (`services/api`). This records where the Worker differs
from `docs/03-api-contract.md` and docs/07 Phase 5, and why.

1. **No `/v1/session`, no JWT. Callers send an `X-Device-Id` UUID instead.** In the funded plan,
   sessions wrap attestation. Attestation is deferred (docs/10 §3, D11), and without it a session
   token is just a signed copy of an id the client picked, so it adds no security. The device id
   only keys the per-device rate limit, and the global daily cap is what bounds spend. A missing
   or malformed id is `UNAUTHENTICATED` (401). `ATTESTATION_FAILED` stays in the error enum but
   nothing returns it until attestation is built. `DEV_SESSION_TOKENS_ENABLED` is removed.
2. **One provider: Gemini, paid tier.** docs/10 §7's H4 row overrides D7's "at least two
   implementations". The `VisionProvider` seam in `src/providers/` stays, so adding a second
   provider means one new file and a config value. Escalation (docs/07 Phase 5) uses a stronger
   model from the same provider. Each escalation call reserves its own slot against the daily cap.
3. **Model labels and barcode ingredient lines resolve by exact alias only, never fuzzy.** D22's
   fuzzy tier is tuned for a person typing, who then sees what it matched. Text the Worker reads
   by machine is already spelled correctly, so fuzzy matching there only adds false positives, and
   an ingredient list gives it thirty chances per scan. Found in testing: fuzzy maps the
   ingredient "salt" to the Spanish alias "palta", which is avocado. The model is also asked for a
   generic `commonName` ("dark chocolate" for a branded bar), so exact matching still lands on
   real products. A miss renders `unknown`.
4. **A barcode result always needs confirmation.** docs/03 lets a single barcode match skip the
   confirm gate, but a KB match is one *ingredient* of the product. A "carrot" verdict is not a
   verdict for the soup it was in.
5. **`resolvedBy: "kb_fuzzy"` added.** A server-side fuzzy text match goes through the confirm
   gate. Labelling it `kb_exact` to get there would misreport it in the log.
6. **Server-computed image hashes.** The client's `hash` field is ignored. The hash feeds a
   shared cache key, so trusting the client's value would let one caller poison another user's
   answer. The cache key also includes the prompt version and KB version.
7. **The kill switch is checked before the cache**, so it also stops cached model answers. It
   exists for the day those answers turn out to be the problem.
8. **Server-side verdicts carry the app's disclaimer text verbatim.** `src/strings.ts` holds a
   copy, and a test diffs it against `apps/mobile/src/i18n/locales/*/legal.json`. `POST
   /v1/verdict` takes an optional `locale` (language only, per AGENTS.md #12).
9. **`/v1/hotlines` is not served by the Worker.** Hotlines must work offline (AGENTS.md #4), so
   they ship bundled in the app. The registry needs human-verified numbers and is H5 work.
10. **KB manifest is per language** (`?lang=`). `sha256` and `sizeBytes` describe the exact bytes
    `GET /v1/kb/:lang` serves. Signing and the on-device swap remain Phase 8 (D21). The KB sync
    script is now `sync:assets` (was `sync:mobile`) and writes to both the app and the Worker.

**Known limit:** KV counters are read-modify-write and eventually consistent, so a concurrent
burst can overshoot the daily cap slightly. The provider-side quota cap (docs/10 §3 layer 3,
`services/api/README.md`) is the hard backstop. Free-plan KV's 1,000 writes a day caps real use at
about 300 paid calls a day. When writes fail, the daily cap fails closed.

**Verified:** `services/api/test/` (hermetic, `fetch` stubbed) covers every acceptance item that
can be checked in code. I also smoke-tested under `wrangler dev` (workerd): exact match, verdict,
manifest, no-key `PROVIDER_UNAVAILABLE`, and the kill switch flipped in local KV with no restart.

## D25 — Visual identity: "Bold Ink", chosen from three explored directions

**Decided 2026-09-24.** The user asked for the app's design to become "animated cartoon" style.
Three genuinely different directions were sketched on a design canvas — a loud, thick-outlined
cartoon ("Bold Ink"), a soft pastel blob style ("Marshmallow"), and a non-cartoon "Field Guide"
reference-book alternative — and the user picked Bold Ink. This records what that decision
actually changed in the shipped app, distinct from the exploration itself.

1. **The colour tokens moved, not the token shape.** `apps/mobile/src/theme/tokens.ts` keeps
   exactly the same `VerdictTokens`/`ThemeTokens` interfaces docs/06 §1 defines — six keys per
   verdict, four chrome groups — only the hex values changed. The verdict banner is now a
   saturated "sticker" colour with dark-ink text ON it (`onBg`/`onAccent` are the same ink colour
   in both themes), rather than white text on a dark, desaturated banner. This holds in dark mode
   too — the banner itself stays bright; only the surrounding chrome goes dark — because Bold Ink
   treats the verdict as a badge, not as chrome that follows the theme. Every pair is still
   CI-checked at ≥4.5:1 by `scripts/check-contrast.mjs`, and the semantic rules (`unknown` never
   green, never brighter than `safe`/`caution`) still hold; both were re-verified against the new
   values, not waived.
2. **`brand.primary` split into `primary` (fill) and `link` (text).** The vivid toon-blue that
   works as a button/badge fill with a dark-ink label cannot also pass ≥4.5:1 as text on a light
   surface — the two constraints pull in opposite directions from the same value (checked
   numerically, not by eye: no colour satisfies both `contrast(c, white) ≥ 4.5` and
   `contrast(c, ink) ≥ 4.5` here). `brand.link` is a separate, darker blue for anywhere brand
   colour is text (`SourceCite`'s arrow, the `quiet` button variant). `scripts/check-contrast.mjs`
   was updated to check `brand.link` against `surface.base`/`surface.raised` instead of checking
   `brand.primary` there.
3. **Two bundled Google Fonts — Lilita One (`display`) and Nunito (everything else) — replace the
   platform system font**, a deliberate deviation from docs/06 §2's "the platform system font if
   bundle size matters" allowance: this is a hobby build, and it takes the ~250 KB cost for the
   identity docs/10 asked for. Loaded via `@expo-google-fonts/*` (bundled TTFs, not fetched — this
   holds docs/10 §5's "collect nothing" posture and the screenshot script's zero-network-call
   check) and gated behind the splash screen (`_layout.tsx`) so no screen ever flashes the system
   font. Each typography role maps to a *specific* font file (`tailwind.config.js`'s `fontFamily`),
   not a generic family plus a `fontWeight` style — Google Fonts ship one file per weight with its
   own PostScript name, and React Native does not synthesise weight across separate files the way
   it can for a system font.
4. **A dog-and-cat mascot (`components/feedback/Mascot.tsx`) is a real signal, not decoration
   layered on top of one.** `theme/mascot.ts`'s `VERDICT_MASCOT_MOOD` maps each verdict to a mood
   (`safe`→happy, `caution`→cautious, `toxic`→worried, `unknown`→confused), so it is a fourth
   non-colour channel alongside the existing glyph and word (docs/06 §1) — confirmed in the
   regenerated `docs/screenshots/grayscale/` set, where the mascot's expression is still legible
   with colour removed. It appears in `VerdictBanner`, `SpeciesToggle` and `identifying.tsx`.
   Colour literals live in `theme/mascot.ts` (AGENTS.md #7's designated place for them), and the
   mascot is theme-invariant by design — same fur colours in light and dark, matching how the
   canvas exploration treated it as illustration ink rather than themed chrome.
5. **Motion uses `LayoutAnimation` and plain timers, never `react-native-reanimated` — following
   D23, not reopening it.** D23 found that Reanimated's animated styles did not reliably reach a
   real device here, with no error and no web reproduction, and this session has no way to check
   otherwise: `attach`ing the iOS Simulator tool failed outright (this machine has only the Xcode
   command-line tools, not a full Xcode install), so there is still no device or simulator
   available to this project's agents. Two mechanisms were used instead, both already proven
   working in this exact codebase before this decision:
     - **`SpeciesToggle`'s pill now really slides**, via `LayoutAnimation.configureNext` — the
       same API `Collapsible`'s expand/collapse already ships on — rather than snapping instantly.
       This required switching the pill's position from `transform: translateX` to
       `insetInlineStart` (still a logical property, still CI-checked), because `LayoutAnimation`
       is documented and cross-platform for actual layout-property changes, not for a `transform`
       applied outside layout. Critically, `pillOffset`/`pillStart` is still computed directly
       from `value` on every render, exactly as D23 left it — if the animation request does
       nothing on some device, the pill still snaps to the correct position. There is no new way
       for this control to render wrong, only a chance it renders wrong *instantly* instead of
       *smoothly*, which is strictly the old, safe behaviour.
     - **`identifying.tsx`'s mascot "sniffs" by swapping between two static moods on a plain
       `setInterval`/`setState`** — the identical mechanism that file already uses successfully to
       advance its stage list — rather than through an animation library. `useReducedMotion()`
       freezes it on `idle` (no interval at all), and the same hook now also gates the toggle's
       `LayoutAnimation` request (docs/06 §1 Motion).
     - Neither of these is verified on a real device or simulator. Treat them the way
       `docs/screenshots/README.md` already treats haptics: implemented correctly in principle,
       pending a device pass. If a future agent gets a working Simulator or device, verifying
       these two is the first thing worth doing with it — not reaching for Reanimated again.
6. **One real, unrelated layout bug found and fixed along the way, not left for later.**
   Regenerating the `es` + 200% font-scale screenshots (docs/06 §5's own acceptance line) showed
   Home's "Ajustes"/"Settings" text button overflowing the screen edge — a translated label has no
   fixed width, and the heavier Nunito Bold face (vs. the thinner system font previously) pushed
   an already-marginal fit past the edge. Confirmed pre-existing (the old committed screenshot
   shows the same label touching the edge with no margin), so this decision made a latent bug
   visible rather than causing it, but it was fixed here rather than logged for a future agent:
   the text button became an `IconButton` (⚙), a fixed 44×44 target whose size cannot depend on
   translated string length in the first place — the general fix for this whole bug *class*, not
   a patch for this one screen. `apps/mobile/src/app/index.tsx`.
7. **What did not change.** `resolveVerdict()` and every KB entry, unchanged (AGENTS.md #1, #5) —
   this is presentation only. The verdict glyphs (`✓ ! ⚠ ?`) are unchanged: `verdict.test.ts`
   already asserts their distinctness and it was cheaper to keep them than to re-justify new ones.
   No app icon or splash *artwork* was redrawn — only the splash/adaptive-icon background colour
   moved to the new cream (`app.json`) — redrawing the actual icon/splash images needs real image
   tooling this environment does not have; the existing placeholder art now sits on the new
   background colour, which is a visible seam worth a follow-up, not a blocker.

**Verified:** `pnpm -r typecheck`, `pnpm lint`, `pnpm -r test`, `scripts/check-contrast.mjs`,
`scripts/check-ui-hygiene.sh`, `scripts/check-safe-claims.sh` all pass. `pnpm --filter mobile
run build` (the production web export) and a full `pnpm screenshots` run both succeed; the
regenerated light/dark/grayscale/`es`-200% sets are the evidence for this decision, not an
assertion — including the Home fix above, which the `es`-200% set caught directly. One real bug
was caught this way and is not a residual risk: `Mascot`'s accessibility props were originally set
on the `Svg` element itself, which `react-native-svg`'s web implementation forwards straight to
the DOM `<svg>` tag — surfaced as a live "React does not recognize the `…` prop" warning in the
actual web export (not by typecheck, which cannot see this), fixed by moving them to a wrapping
`View`, which supports all of them natively on every platform including web.

### D25 addendum — verified on a real iOS Simulator (2026-09-24)

The user installed a full Xcode after D25 was written, which removed the blocker its motion
section described. A pass on a booted iPhone 17 Simulator (iOS 27, via Expo Go, not a standalone
build) found:

- **Confirmed working on-device:** the cream/ink palette and saturated verdict banners, both
  fonts (Lilita One is visibly distinct from Nunito on the actual `display`-variant text — "Toxic"
  vs. "Grapes and raisins" on the same screen — not just in the web screenshots), the mascot in
  the banner and the species toggle, and `SpeciesToggle`'s `LayoutAnimation` slide reaching the
  correct end state (species really changes, pill really moves, colours really swap). The
  scanning/sniff mascot and dark mode were not independently re-checked this pass (dark mode
  needs the in-app Settings toggle, not the simulator's system appearance, which this Expo-Go
  session did not pick up live) — no reason to expect them to differ from what light mode and
  everything else already confirmed, since none of it is platform- or theme-conditional code.
- **One real bug found and fixed, not the one first suspected.** The Home header's icon looked
  wrong on-device (a filled blue circle around it) in a way the web screenshots never showed.
  Investigating, the actual cause was **not** the app: Expo Go draws its own on-screen dev-menu
  launcher (a stand-in for the shake gesture, which a simulator can't perform) in the same top-right
  corner, and it was sitting on top of the real button — confirmed by tapping it and getting the
  Expo dev menu, not `/settings`. It is dev-tooling chrome that cannot appear in a real build.
  That said, the ⚙ Unicode glyph originally used there was independently worth replacing:
  characters like it get a default *colour emoji* presentation on some platforms, which is a
  real, separate risk this pass couldn't fully rule in or out for the actual gear glyph itself.
  It is now `SettingsIcon` (`components/primitives/icons.tsx`), a drawn `react-native-svg` icon
  matching the design canvas's own settings glyph, colour resolved from `tokens` — the same
  concrete-colour-string pattern `Mascot`/`SpeciesToggle` already use, since NativeWind has no
  `cssInterop` registration for `react-native-svg` elements in this project. `IconButton` gained
  an `icon` prop alongside its existing `glyph` prop so this is reusable for any future icon that
  isn't safe as plain text.
- **Not re-checked:** whether the pre-existing verdict glyphs (`✓ ! ⚠ ?`, predating this session)
  render as plain text or as colour emoji on real iOS — `⚠` in particular is in the same
  Unicode category as `⚙`. Worth a look if this comes up again, but out of scope to change
  unprompted: those glyphs are asserted for distinctness in `verdict.test.ts` and used throughout
  the KB/result rendering, unlike the Home settings icon, which had exactly one call site.

## D26 — Bold Ink motion on core `Animated`, and an animated boot splash

**Decided 2026-09-25.** The user asked for the design canvas's animations (row A, "Bold Ink") to
be implemented, and for a splash screen at boot. D25 had shipped only two of the canvas's ~20
motions (the toggle's `LayoutAnimation` slide and a two-frame sniff flipbook) because D23 had
found `react-native-reanimated` unreliable and no simulator was available to test anything else.
A simulator now is (D25 addendum), so this reopens the *mechanism* — not D23's conclusion.

1. **Engine: React Native's own `Animated` API with the native driver — still not Reanimated.**
   D23's failure was specific to Reanimated's worklet → UI-thread style commit. Core `Animated`
   is a different pipeline (the animation graph is handed to the platform once), and it is used
   here only for `transform` and `opacity`, the two properties the native driver owns. No colour,
   size or layout property is animated anywhere, so D23's worst case — the verdict banner
   rendering with no colour — cannot recur through this path: the banner's `backgroundColor` is
   still a plain, unconditional style, and the drop moves the banner as a whole.
2. **The canvas's keyframes are data** (`apps/mobile/src/theme/motion.ts`), ported one-for-one
   from its `@keyframes a-*` rules — offsets, values, durations, delays and its two named curves
   (`firm` = `cubic-bezier(.2,.8,.2,1)`, `overshoot` = `cubic-bezier(.34,1.56,.64,1)`).
   `components/primitives/Motion.tsx` turns a spec into an interpolation (`Enter` for one-shot
   entrances, `Loop` for idles). What moved: the verdict banner drop / firm drop, glyph badge
   pop / thud, staggered rise, mascot pop / fade, mascot idle rig (head bob, blink, dog ear sway,
   cat ear twitch, sniffing nose and puffs, worried sweat drop, confused "?" wobble), sparkles on
   no-known-toxicity, the call button's ringing handset, the scanning screen's tilted photo with
   a sweeping scan band and wandering magnifier plus per-stage bouncing dots and popping ticks,
   the Home mascot's pop on species change, the camera badge's bob, and the logo coin's dog↔cat
   flip (`MascotCoin`).
3. **Safety properties, each with a test rather than an assertion:**
   - *Verdict choreography is per verdict* (`VERDICT_MOTION`). Only `safe` bounces, pops or
     sparkles. `toxic` follows the canvas's "2 a.m." artboard: firm 320ms drop, a thud, a mascot
     that fades in and stays calm, and nothing below the banner waits. `caution` and `unknown`
     aren't drawn on the canvas; they take the firm path (AGENTS.md #2 — nothing about `unknown`
     may read as good news). `motion.test.ts` asserts this and a ≤500ms full toxic reveal.
   - *Every entrance ends on the ordinary layout* (`motion.test.ts`), and `useEntrance` forces
     that frame on a timer after the animation should have finished, whether or not it ever ran.
   - *AGENTS.md #4*: `emergencyMotion.test.tsx` renders the toxic banner and the call button with
     motion on, with reduced motion, and with every animation stubbed to never run (the D23
     failure mode), and checks the verdict and the working `tel:` button are there from the first
     render and fully visible and in place afterwards. A mutation check confirmed the
     never-runs case fails if the timer backstop is removed. It runs the JS driver
     (`nativeDriver()` is read lazily for this): a test renderer never sees native-driven values.
   - *Motion off is no animated style at all*, not a zero-length animation. Reduced motion and
     `MotionStill` (the gallery, `?still=1`) render exactly the pre-D26 tree; the mascot is still
     one flat `Svg` then. The screenshot script runs under reduced motion, so the committed set
     is the still path.
4. **The mascot became layered.** To move an ear or the nose with a native-driver transform, each
   moving part is its own same-size `Svg` in an `Animated.View`, with the canvas's
   `transform-origin` resolved to points (`transformOrigin`, not a `react-native-svg` prop — no
   per-frame SVG re-render). The blink is a 150ms state swap every 4.2s, not a transform, because
   an eye-only layer per mood isn't worth it for that.
5. **The boot splash is an overlay, not a gate** (`BootSplash.tsx`). The native splash hands over
   to it once fonts load; the coin pops, flips dog→cat, the name rises, and it fades off the
   *already mounted* first screen after 1.25s (+250ms fade; `motion.test.ts` caps the total under
   1.6s). A tap dismisses it. It is never rendered under reduced motion, and it removes itself as
   soon as a screen reader is detected — it's hidden from assistive tech, so it must not cover
   what that user is navigating. Its background is `surface.base`, which matches the native
   splash's cream in light mode. No new strings: it shows `common:appName`.
6. **Deliberate deviations from the canvas.** The toggle keeps D25's `LayoutAnimation` spring
   (it's proven and has D23's snap-to-correct property); its tint cross-fade isn't animated
   (colour). The canvas's outlined blue wordmark text can't be reproduced (no text stroke in RN),
   so the splash name is ink with a brand-blue hard text shadow. The glyph badge keeps its round
   shape on `toxic` (the canvas squares it — a shape change, not motion).

**Verified on a real iOS Simulator** (iPhone 17, iOS 27, Expo Go), frame bursts captured with
`simctl io screenshot`: the splash's pop → flip → rise → fade onto Home; the safe banner dropping
with its badge popping and content rising, then settling with a sparkle; the toxic result with the
verdict word, source and both call buttons in the very first captured frame and the badge/mascot
arriving after; the scanning screen's band, magnifier, dots and ticks moving. Typecheck, lint,
tests (113), contrast, UI-hygiene, safe-claims, no-secrets and the web build pass.

**Not done:** `pnpm screenshots` regenerates every set but then fails its pseudo-locale pass on
`05-result-safe` — `mockEntry()` has no data for the pseudo language. Reproduced on the unmodified
pre-D26 source, so it is pre-existing and left for a separate fix.

## D27 — Node 24 everywhere (CI, nightly eval, `engines`)

Node 20 reached end of life in April 2026, and GitHub Actions has deprecated it as a runner
runtime. Development was already happening on Node 24 while CI ran on 20, so the two could
disagree. Both workflows now use `node-version: 24`, root `package.json` declares
`"engines": { "node": ">=24" }`, and `.nvmrc` pins 24 for local version managers.

This also makes D19's Node 20.9 `tsc` shim caveat moot, and it satisfies Expo's `>=20.19.4`
floor.

**Alternatives:** Node 22 (also LTS, but moving to 22 would still leave CI on a different major
from the one development uses).

**Verified locally on Node 24.11.1:** typecheck, lint, the safe-claims, no-secrets, contrast,
UI-hygiene and Expo dependency checks, tests, build and the KB snapshot diff all pass.

## D28 — Build-time feature flags; the first release is text-only

Following `docs/10-hobby-scope.md` §7, the first store release is the offline typed-lookup app,
without photo identification. Barcode scanning comes later, once its lookup exists. The photo
and barcode code stays on `main` behind two flags rather than on a branch, because a long-lived
branch would drift from the screens and stores it shares with the rest of the app.

- **`EXPO_PUBLIC_FEATURE_PHOTO_ID` and `EXPO_PUBLIC_FEATURE_BARCODE`**, read in
  `apps/mobile/src/lib/features.ts`. Expo inlines them at build time. Only `"1"` or `"true"`
  turns one on; unset means off, so a build that forgets them is text-only. They are set per EAS
  profile in `apps/mobile/eas.json`: `development` has both on, `preview` and `production` both
  off. A local `expo start` without them is text-only too; set them to work on those paths.
  **Update (D29):** the barcode flag is gone. Barcode scanning ships in every build now that its
  lookup exists, so only the photo flag remains.
- **No runtime or remote switch.** Code shipped switched off and turned on later would be a
  hidden feature, which App Store guideline 2.3.1 forbids.
- **What the flags gate:** the photo tray and source sheet on Home (with barcode alone, a single
  scan button instead), the camera, photo-preview and photo-Confirm routes (each redirects Home
  when its feature is off), the AI consent card on first run, and the consent toggle in
  Settings. Typed fuzzy matches still use Confirm. First run is now shown to every new user: Home
  redirects there until it is completed.
- **`app.json` became `app.config.ts`**, so the native side follows the flags too. Each iOS
  purpose string describes what that build does, and Android blocks the permissions a build does
  not use (`blockedPermissions`); the microphone is blocked in every build. Expo loads this file
  without resolving other TypeScript modules, so it repeats the flag parsing and reads the splash
  colour from `src/theme/native.json`; `features.test.ts` keeps both in step.

**Native modules stay linked in every build.** Expo autolinking reads exclusions only from
`package.json` or CLI arguments, so dropping `expo-camera` and `expo-image-picker` from a
text-only build would mean patching `package.json` inside the EAS build, and making sure no route
imports them at startup. Instead both stay linked and both iOS purpose strings are always
present, since Apple rejects an upload whose binary references those APIs without one.

**To verify on the first real build:** that TestFlight accepts the text-only upload without an
ITMS-90683 purpose-string rejection, and that the Play Console shows no camera or media
permissions for it.

**Alternatives:** a release branch (drift; two apps to maintain); a runtime or remote flag
(guideline 2.3.1); excluding the native modules per build (possible, but needs a build-time
`package.json` patch and can only be checked with a native build — worth revisiting if a store
objects to the unused purpose strings).

## D29 — Barcode lookup from the app, not the Worker, for the first release

D8 put the Open Food Facts lookup in the Worker. The first release has no Worker (D28, docs/10
§7), and barcode scanning is in it, so the app now looks products up itself. Neither database
needs a key or an account, so this adds no secret and no spend.

- **One implementation, in `packages/shared/src/barcode.ts`:** the lookup (Open Pet Food Facts,
  then Open Food Facts), its response parsing, and the ingredient matching. The app
  (`apps/mobile/src/lib/barcode.ts`) and the Worker (`services/api/src/barcode.ts`) both call it,
  with their own `fetch` (AGENTS.md #5).
- **Only `is_ingredient` entries match.** The matcher used to try every alias, so an entry such
  as vitamin D supplements would have matched the "vitamin D3" that pet foods list as an
  ordinary ingredient. Matching stays exact-alias only, never fuzzy.
- **Ingredient lists are split on brackets as well as commas and semicolons, and percentages are
  dropped first**, so "fruit (raisins 12,5 %)" reaches the "raisins" alias.
- **"Not found" and "unreachable" are different answers.** Both databases answer an unknown
  product with HTTP 404 and `status: 0` (checked 2026-09-28); any other error now throws. The
  Worker used to return "not found" for every non-OK response, so an outage read as an unknown
  product.
- **The product screen** (`apps/mobile/src/app/product.tsx`) leads with the product's name, so
  the user can check it is what they are holding, then shows each recognised ingredient's verdict,
  worst first. It says that unrecognised ingredients are not in the list, which says nothing about
  harm; a product with no matches is `unknown`. Unreachable, not-found and no-ingredient-list each
  have their own state, all leading back to typed lookup. A toxic ingredient shows the emergency
  call button.

**Privacy and licensing.** A scan sends the barcode, and with it the device's IP address, to
Open Food Facts. The privacy policy must say so. Their data is under the Open Database License,
which requires attribution; the product screen credits them, and the store listing and About
section should too.

**Alternatives:** keep the lookup in the Worker (needs the Worker in v1, which D28 defers);
bundle a product database (Open Food Facts is millions of products, far beyond an app bundle);
leave barcode out of v1 (declined — it is the fastest way to answer "what's in this?").
