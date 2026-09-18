# 06 — UI and Design System

The brief asks for a clean, fancy UI. That is achieved by deciding the system once, up front, and
then refusing to deviate — not by making each screen pretty individually. Phase 2 builds this
before any network code exists.

## 1. Tokens

Defined once in `apps/mobile/src/theme/tokens.ts`, exposed to NativeWind via `tailwind.config.js`.
**Tailwind's default palette is removed, not extended.** `bg-red-500` should not resolve.

### Colour

Two semantic layers. Verdict colours are never used for anything that is not a verdict.

```ts
// Verdict — the only place these values appear
verdict: {
  safe:    { bg: '#0F5132', surface: '#D1F0DF', fg: '#0A3622', accent: '#14A06B' },
  caution: { bg: '#664D03', surface: '#FFF3CD', fg: '#4A3803', accent: '#E0A800' },
  toxic:   { bg: '#5C1A1A', surface: '#FADBD8', fg: '#4A1010', accent: '#D9342B' },
  unknown: { bg: '#3D4348', surface: '#E4E7EA', fg: '#2B3034', accent: '#7A848C' },
}

// Brand / chrome — warm, calm, deliberately not medical-blue
brand: { primary: '#2F6F62', primaryPress: '#245549', tint: '#E8F2EF' }
surface: { base, raised, sunken, overlay }
text: { primary, secondary, tertiary, inverse }
border: { subtle, default, strong }
```

Full light and dark values for every token. Dark mode is not optional — this app is used at 2 a.m.

**Contrast:** every verdict `fg` on its `surface` must pass WCAG AA (≥4.5:1). Add a CI check that
computes contrast ratios from the token file; do not eyeball it.

**Colour is never the only signal.** Every verdict carries a distinct glyph (✓ / ! / ⚠ / ?) and a
distinct word. Roughly 8% of men have some form of colour-vision deficiency, and red/green is the
exact axis this app depends on.

### Type

One family, `Inter` (variable) via `expo-font`, or the platform system font if bundle size matters.

```
display   34 / 40   700    verdict word
title     24 / 30   600    item name
headline  19 / 26   600    the one-sentence answer
body      16 / 24   400    default
label     14 / 20   500    section headers, buttons
caption   12 / 16   400    disclaimer, sources
```

Respect Dynamic Type / font scale up to 200%. The verdict screen must stay usable at that size —
test it; it is where layouts break.

**Spanish runs 20–30% longer than English.** The worst case for this app is `es` at 200% font scale,
and it lands on the verdict banner — the most designed screen here. No fixed-width text containers,
and no `numberOfLines={1}` on anything that carries meaning. Verdict words are *designed* per
language rather than translated ("Not great" → "Mejor evitarlo"), so each language's labels are
chosen by a native speaker to stay short and scannable.

**Logical layout properties only** — `marginStart`/`marginEnd`, `paddingStart`/`paddingEnd`,
`textAlign: 'start'`. Never `left`/`right`. There is a CI grep for this.

### Spacing, radius, elevation

4 pt base scale: `1,2,3,4,6,8,12,16,24` → `4…96`. Radii: `sm 8 / md 14 / lg 20 / full 999`.
Two elevation levels only, both defined per-platform (iOS shadow, Android elevation).

### Motion

`react-native-reanimated` v4, everything on the UI thread. Durations `fast 150 / base 250 / slow 400`.
Spring for anything the finger drives, timing for everything else. **Honour
`useReducedMotion()`** — disable the shimmer and the verdict reveal animation when it is set.

## 2. The three moments that make this feel expensive

Most of the perceived quality comes from three specific interactions. Spend the effort here.

1. **The species toggle.** A spring-animated pill sliding between Dog and Cat, the icon
   cross-fading, a light haptic on change, and the whole screen's accent tint shifting subtly
   (warm ochre for dog, cool slate for cat). Cheap to build, and it is the first thing anyone
   touches.
2. **The scanning state.** Not a spinner. The user's photo stays on screen with a diagonal shimmer
   sweeping over it and a status line stepping through real stages. It makes 2.5 seconds feel
   like feedback rather than waiting.
3. **The verdict reveal.** The banner colour washes in from the top over ~400 ms, the glyph scales
   in with a spring, and a haptic fires — `notificationAsync(Success)` for safe, `Warning` for
   caution, `Error` for toxic. This is the app's signature moment.

## 3. Component inventory (Phase 2 deliverable)

```
primitives/   Text  Button  IconButton  Card  Sheet  Divider  Skeleton  Pill
inputs/       SpeciesToggle  PhotoTray  PhotoThumb  DescriptionInput  CheckButton
feedback/     VerdictBanner  VerdictCard  SourceCite  ConfidencePill
              EmergencyCallButton  DisclaimerFooter  ErrorState  EmptyState
              # RiskBandMeter — cut, see docs/10 §4
layout/       Screen  ScrollScreen  StickyFooter  Section  Collapsible
```

Every component: typed props, no inline colour literals, no magic numbers, dark-mode correct,
`accessibilityRole` and `accessibilityLabel` set. A `__dev__`-only gallery screen renders all of them
in both themes — this is how the design system gets reviewed without Storybook's setup cost.

## 4. Screen specifications

### Home

Species toggle top, height 44, horizontal inset 16. Photo tray below: empty state is a single
dashed 3:2 tile with a camera glyph and "Add a photo"; populated state is a horizontal scroller of
88×88 rounded thumbs with a trailing [+] tile, each thumb carrying a small remove affordance.
Description input below, min 3 lines, grows to 6, `textAlignVertical: top`, character counter only
past 400. Check button pinned to the bottom safe area, full width minus 32, height 56, radius `lg`;
it rises above the keyboard with `KeyboardAvoidingView`/`useAnimatedKeyboard`. Disabled state is a
lower-contrast fill with the reason line beneath in `caption`.

### Confirm

Primary candidate in a large `Card` with its thumbnail, label in `title`, and a `ConfidencePill`
rendering `confidenceBand` as a word — "fairly sure", "not certain". **Never show a percentage**;
a number implies a calibration this system does not have. Alternates as a radio list below.
"Something else…" opens an inline text field. Primary button "Yes, that's it".

### Result

Banner is full-bleed to the top edge, ignoring the safe area, with the status-bar style flipped to
match. Glyph 64 pt, verdict word in `display`, item name in `title`, "for Max 🐕" in `body/secondary`.
Below, on `surface.base`: the one-sentence headline in `headline`, then collapsible sections. On
`toxic`, "What to do now" is **expanded and not collapsible**, and the `EmergencyCallButton` is a
sticky footer with the `toxic.accent` fill. On `severity: severe`, add a persistent top banner and
move the call button above the fold. **`RiskBandMeter` is cut in the hobby build** (`docs/10-hobby-scope.md` §4) — no dose bands, no
weight input, no risk banding.

**The source is a primary element, not a footnote.** Directly beneath the headline, above every
collapsible section, a `SourceCite` component reads *"The Merck Veterinary Manual lists dark
chocolate as toxic to dogs →"* and links out. This is the app's actual claim and it should look
like it. Remaining sources sit in the collapsed section with the KB version beside them.
Disclaimer footer in `caption/tertiary`, always visible, never collapsed. "Report a wrong answer"
link at the very bottom.

### Error and offline states

Designed, not default. Each error code from `docs/03-api-contract.md` gets its own illustration-free
but specific screen: a clear sentence, a specific action, and — always — a route to offline text
lookup and to the hotline list.

## 5. Accessibility checklist (Phase 2 acceptance)

- VoiceOver and TalkBack read the verdict word first on the result screen, via
  `accessibilityLiveRegion` / an `AccessibilityInfo.announceForAccessibility` on reveal.
- All touch targets ≥ 44×44.
- Font scale 200% does not clip or overlap on any screen.
- `useReducedMotion()` honoured.
- Verdict distinguishable with colour removed (grayscale screenshot test).
- Emergency call button reachable by keyboard/switch control within two moves from a toxic result.
- Every screen renders correctly at `es` + 200% font scale, with no truncation or overlap.
- A pseudo-locale run (accented characters, strings padded 40%) surfaces zero hardcoded strings.
