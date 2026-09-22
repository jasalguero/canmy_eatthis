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
