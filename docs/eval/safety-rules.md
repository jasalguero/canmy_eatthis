# Safety rules: evidence

`docs/05-safety-legal.md` §1, and the Phase 5 acceptance lines in `docs/07-implementation-plan.md`.
Each rule has a passing test or a recorded manual check. Recorded 2026-10-14 against `main` at 1.1.0.

Tests are in `apps/mobile/src/safety/safetyRules.test.tsx` unless named otherwise. They render the
real Result and Emergency screens with `fetch` replaced by one that throws, so anything that
reached for the network would fail them.

| Rule | How it is held |
|---|---|
| 1. "Unknown" never renders as safe | Test: the unknown verdict's banner, surface and accent colours differ from "no known toxicity" and are not green, in both themes; an uncovered query resolves to `unknown` with no reassuring copy. Also `resolveVerdict.test.ts` (invariants) and `theme/verdict.test.ts` (distinct glyphs). |
| 2. "Safe" is never a bare claim | `scripts/check-safe-claims.sh` in CI (catalogues, KB, legal pages), plus a test over every catalogue and KB string. |
| 3. Emergency path: no login, no limit, no network | Test: every toxic KB entry, in both languages and both species, builds its verdict with the network down; a toxic result shows the call button; the emergency screen lists every release-build line for US, GB and ES. The daily cap exists only in the Worker and guards only the photo path, which the app does not call in this release. Earlier on-device evidence: Android emulator in airplane mode (`docs/eval/p0-p3-acceptance.md`). |
| 4. Every verdict screen carries the disclaimer | Test: the Result screen shows it for every KB entry and for an unknown query. The barcode product screen renders it beside its verdict cards (source check, since that screen needs a live product lookup). |
| 5. The confirm step cannot be skipped for photos | Manual check: `app/identifying.tsx` sends every input with a photo to `/confirm`, with no other branch; photo identification is off in release builds (`EXPO_PUBLIC_FEATURE_PHOTO_ID=0`, D28). A test of the photo flow is a second-release acceptance line. |
| 6. Never tell a user their pet does not need a vet | Test: no catalogue or KB string, in English or Spanish, says a pet does not need a vet. |
| 7. No dosage calculator, no risk bands | Test: the bundled KB has no dose, weight, band or threshold fields, and no text gives an amount per body weight. The KB schema has no such fields (`packages/kb`). There is no weight field anywhere in the app (`docs/00` §2.5). |
| 8. No diagnosis, no symptom checker | Manual check: no screen takes symptoms as input. The only inputs are what was eaten, the species, a barcode and (second release) photos. Signs are a read-only list from the controlled vocabulary on the Result screen. |

## Phase 5 acceptance lines

- **Hotline CTA works in airplane mode and with the daily cap exhausted.** Rule 3 above.
- **A Spanish speaker in a US region gets Spanish text and US hotline numbers.** Test: with
  language `es` and region `US`, the emergency screen is in Spanish, shows the US lines and none of
  the Spanish ones, and a toxic result shows the Spanish KB name and the Spanish disclaimer.

## Phase 2: hardcoded strings

`apps/mobile/src/i18n/noHardcodedStrings.test.ts` parses every screen and component and fails on
words written straight into JSX or into a user-facing prop (label, title, accessibility label,
and so on). It finds none. It stands in for looking at every screen in the pseudo-locale; the
development-only gallery is excluded.
