# Phase 2 (H2) screenshots and acceptance evidence

**Generated, not curated.** Regenerate the whole set with:

```bash
pnpm --filter @canmyeatthis/mobile exec expo export --platform web --dev && pnpm screenshots
```

`--dev` matters: `__DEV__` gates the component gallery, which is one of the screens under review.

## What is here

| Folder | What it is |
|---|---|
| `light/` | Every screen, light theme, `en` |
| `dark/` | Every screen, dark theme, `en` |
| `grayscale/` | The seven verdict screens with colour removed |
| `es-200/` | Every screen in `es` at 200% font scale — the worst case (docs/06 §2) |

## How these are captured, and what that is worth

They are taken from the real web export with Playwright: the same React tree, the same
components, the same tokens and the same mock data as the native app. That makes them a faithful
check of **layout, colour, contrast, wrapping, copy and information order**.

They are **not** a substitute for a device pass. Four things in Phase 2 exist only natively and
**still need to be checked on a simulator or device — that pass has not been done yet**:

- haptics on the verdict reveal and the species toggle (`expo-haptics`)
- the feel of the reveal animation and the scanning shimmer
- VoiceOver / TalkBack focus order and the live-region announcement
- the platform's own Dynamic Type / font-scale behaviour

Until that pass happens, treat those four as implemented-but-unverified. Everything else in the
table below is mechanically checked.

Two capture details are worth knowing when reading the images:

- **The viewport grows to fit each screen** rather than using a full-page capture. A React Native
  `ScrollView` really clips on web, so a full-page shot cut the severe result screen off halfway
  through "What to do now"; unclipping it with CSS showed everything but broke the layout being
  documented, floating the sticky footer up into the content. Growing the viewport keeps the flex
  layout exactly as it resolves on a device. It is the same thing as photographing a taller phone.
- **200% font scale is simulated by doubling the six type-scale roles**, computed from
  `tokens.ts`. React Native Web does not read an OS font scale, and what that setting actually
  does to a React Native `<Text>` is multiply its font size and line height while leaving every
  layout box alone — which is exactly what the override reproduces. `zoom` would scale the layout
  too; a root `font-size` would compound per nesting level.

## Acceptance evidence (docs/07-implementation-plan.md Phase 2)

| Criterion | Evidence |
|---|---|
| Every screen navigable from the gallery, mock data | `light/26-gallery.png`; every screen in this set is reachable from it |
| **Zero network calls in the build** | Asserted by `scripts/screenshots.mjs` — it records every request and fails on any off-origin one |
| Light and dark screenshots of all screens | `light/`, `dark/` (26 screens each) |
| CI contrast check ≥4.5:1 for every verdict token pair | `scripts/check-contrast.mjs`, run in CI |
| Grayscale: all four verdicts still distinguishable | `grayscale/`, and `src/theme/verdict.test.ts` — see the note below |
| 200% font scale: no clipping or overlap | `es-200/` (the harder case; `en` at 200% is strictly shorter) |
| VoiceOver reads the verdict word first | **Implemented, not yet verified on a device.** `VerdictBanner` announces it via `announceForAccessibility` and exposes the banner as a single node whose label starts with the verdict word. The web capture cannot confirm VoiceOver/TalkBack focus order — see the device pass below |
| No colour literals outside `theme/` | `scripts/check-ui-hygiene.sh`, run in CI |
| Every screen at `es` + 200% font scale | `es-200/` |
| A pseudo-locale run surfaces zero hardcoded strings | Asserted by `scripts/screenshots.mjs` — it runs every screen in the pseudo-locale and fails on any unmarked visible string |
| No `marginLeft`/`marginRight`/`left:`/`right:` | `scripts/check-ui-hygiene.sh`, run in CI |

### A note on the grayscale criterion

The four verdicts are **not** distinguishable by luminance, and are not meant to be. All four
banner backgrounds are dark and sit within about 0.05 relative luminance of each other, so in
grayscale they look nearly identical. What separates them is the glyph (`✓ ! ⚠ ?`) and the word
— which is the entire point of docs/06 §1: colour is never the only signal, because red/green is
the exact axis this app depends on and roughly 8% of men cannot use it.

`src/theme/verdict.test.ts` asserts that guarantee directly: a distinct glyph per verdict, and a
distinct word per verdict in every shipped language.

## Mock data

Every screen is on hardcoded mock data with no network and no bundled KB. The entries are
generated from the Phase 1 build artefacts (`pnpm mock:kb`), and the verdict payloads go through
the real `resolveVerdict()`, so nothing in this set is a screenshot of a state the app could not
actually produce. See `apps/mobile/src/mock/kbEntries.ts`.
