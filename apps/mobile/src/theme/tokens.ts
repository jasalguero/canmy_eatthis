/**
 * Design tokens — the single source of truth for every colour, size and motion value in the app.
 * docs/06-ui-design-system.md §1, AGENTS.md #7 (no colour literals outside `theme/`).
 *
 * Two rules this file enforces by construction:
 *   1. **Verdict colours are never used for anything that is not a verdict.** The `verdict` group
 *      is only ever read by verdict components (VerdictBanner, VerdictCard, EmergencyCallButton).
 *      Chrome uses `brand`/`surface`/`text`/`border`.
 *   2. **Every verdict `fg` on its `surface` passes WCAG AA (≥4.5:1) in BOTH themes.** This is
 *      checked mechanically by `scripts/check-contrast.mjs` (CI) — do not "eyeball" a change.
 *
 * **"Bold Ink" visual identity (docs/02-tech-decisions.md D25).** These are the values from that
 * decision: a cream/ink base, saturated cartoon verdict colours (dark ink text ON the bright
 * fill, not white-on-dark), and a toon-blue brand accent. The shape of the token file — six keys
 * per verdict, four chrome groups — is unchanged from the funded-plan design; only the values
 * moved. `onBg`/`onAccent` happen to be the same ink colour for all four verdicts in both themes
 * (the identity's mascot-illustration outline colour), which is why they read as one flat value
 * per theme below rather than four different ones — they are still four independent CI-checked
 * pairs, just designed to the same answer.
 */

export type ThemeName = 'light' | 'dark';
export type VerdictId = 'safe' | 'caution' | 'toxic' | 'unknown';

export interface VerdictTokens {
  /** Full-bleed banner background. A saturated "sticker" colour in BOTH themes (docs/02 D25) —
   *  which is why banner text needs its own token rather than `text.inverse`. */
  bg: string;
  /** Tinted surface for chips/cards (e.g. signs list, verdict card body). */
  surface: string;
  /** Text on `surface`. Must pass ≥4.5:1 against it (CI-checked). */
  fg: string;
  /** Small accents and FILLS: the toxic call-button fill, the species-toggle pill, progress.
   *  Never a foreground mark that carries meaning on `bg`/`surface` — the light palette's
   *  accents are mid-tone by design (docs/06 §1 fixes these values) and do not reach 3:1 there.
   *  Meaning-carrying marks use `onBg` on the banner and `fg` on a tinted surface. */
  accent: string;
  /** Text/glyph ON an `accent` fill. CI-checked ≥4.5:1 against `accent`. */
  onAccent: string;
  /** Text on `bg` (the banner word, item name). CI-checked ≥4.5:1 on `bg`. */
  onBg: string;
}

export interface ThemeTokens {
  verdict: Record<VerdictId, VerdictTokens>;
  /** Brand / chrome (docs/02 D25: a toon blue — deliberately a "this is an app" colour, not a
   *  medical one, same brief as the funded plan's warm green, answered differently). */
  brand: {
    primary: string;
    primaryPress: string;
    tint: string;
    /** Label on a `brand.primary` fill (the Check button). CI-checked ≥4.5:1. */
    onPrimary: string;
    /** `primary` as TEXT (a link, a quiet-button label) rather than as a fill. Bold Ink's
     *  `primary` is a vivid toon blue tuned to carry a dark-ink label as a FILL (docs/02 D25) —
     *  it cannot also pass ≥4.5:1 as text on `surface.raised`, because those two requirements
     *  pull in opposite directions from the same value (a darker primary helps one and fails the
     *  other). `link` is the separate, darker blue for anywhere brand colour is text. CI-checked
     *  ≥4.5:1 on both `surface.base` and `surface.raised`. */
    link: string;
    /** The species toggle's selected-pill fill (docs/02 D25, matching docs/06 §2's original
     *  "warm ochre for dog, cool slate for cat" brief) — never used for anything but that pill.
     *  Plain `text.primary`/`text.inverse` ink passes ≥4.5:1 on both, in both themes
     *  (CI-checked), which is why the toggle's label colour doesn't change with selection. */
    tintDog: string;
    tintCat: string;
  };
  surface: { base: string; raised: string; sunken: string; overlay: string };
  text: { primary: string; secondary: string; tertiary: string; inverse: string };
  border: { subtle: string; default: string; strong: string };
}

export const tokens: Record<ThemeName, ThemeTokens> = {
  light: {
    verdict: {
      // Bold Ink (docs/02 D25): dark ink text sits ON the saturated fill in every verdict —
      // there is no separate "onVerdict" token because the app's four-key VerdictTokens shape
      // already gives each verdict its own CI-checked onBg/onAccent; they are equal by design.
      safe: {
        bg: '#45C97A',
        surface: '#DDF6E6',
        fg: '#0F4A28',
        accent: '#45C97A',
        onBg: '#22170F',
        onAccent: '#22170F',
      },
      caution: {
        bg: '#FFC23D',
        surface: '#FFF0C9',
        fg: '#5A3D00',
        accent: '#FFC23D',
        onBg: '#22170F',
        onAccent: '#22170F',
      },
      toxic: {
        bg: '#FF5B4F',
        surface: '#FFE1DD',
        fg: '#6E130C',
        accent: '#FF5B4F',
        onBg: '#22170F',
        onAccent: '#22170F',
      },
      // `unknown` is blue-grey, never green (docs/00 hard rule) and never reassuring.
      unknown: {
        bg: '#B9C1CD',
        surface: '#E8ECF1',
        fg: '#2D3541',
        accent: '#B9C1CD',
        onBg: '#22170F',
        onAccent: '#22170F',
      },
    },
    brand: {
      primary: '#3E9BFF',
      primaryPress: '#1E7FE0',
      tint: '#DCEEFF',
      onPrimary: '#22170F',
      link: '#0B5FC4',
      tintDog: '#FFC9A3',
      tintCat: '#C4D2FF',
    },
    surface: { base: '#FFF3DC', raised: '#FFFFFF', sunken: '#F7E3BE', overlay: '#FFFFFF' },
    text: { primary: '#22170F', secondary: '#5E4838', tertiary: '#78604C', inverse: '#FFFFFF' },
    // `strong` is the ink outline colour itself — Bold Ink cards and buttons are drawn with a
    // visible dark line (docs/02 D25), not a hairline divider, so the strongest border token IS
    // the illustration ink rather than a step darker than `default`.
    border: { subtle: '#EFE2C4', default: '#D8C6A0', strong: '#22170F' },
  },
  dark: {
    // Dark mode is not optional — this app is used at 2 a.m. (docs/06 §1). The banners stay
    // exactly as saturated as in light mode (docs/02 D25: they are stickers, not chrome) — only
    // the surrounding page goes dark; every fg/surface and onBg/onAccent pair is CI-checked.
    verdict: {
      safe: {
        bg: '#3DBA70',
        surface: '#173A26',
        fg: '#C2F2D4',
        accent: '#3DBA70',
        onBg: '#140D09',
        onAccent: '#140D09',
      },
      caution: {
        bg: '#F5B533',
        surface: '#3E2F0A',
        fg: '#FFE3A0',
        accent: '#F5B533',
        onBg: '#140D09',
        onAccent: '#140D09',
      },
      toxic: {
        bg: '#F4574B',
        surface: '#4A1611',
        fg: '#FFCDC6',
        accent: '#F4574B',
        onBg: '#140D09',
        onAccent: '#140D09',
      },
      unknown: {
        bg: '#9EA8B6',
        surface: '#2A3038',
        fg: '#D8DFE8',
        accent: '#9EA8B6',
        onBg: '#140D09',
        onAccent: '#140D09',
      },
    },
    brand: {
      primary: '#62B0FF',
      primaryPress: '#8CC7FF',
      tint: '#16324D',
      onPrimary: '#140D09',
      link: '#8CC4FF',
      tintDog: '#8A5A3C',
      tintCat: '#4C5C92',
    },
    surface: { base: '#1C1411', raised: '#2B201A', sunken: '#130D0A', overlay: '#332619' },
    text: { primary: '#FFF3DC', secondary: '#D9C4AA', tertiary: '#B39A80', inverse: '#140D09' },
    // `strong` flips to a light ink-on-dark outline — the same "drawn line" personality as
    // light mode, not a lighter version of a grey hairline (docs/02 D25).
    border: { subtle: '#2A2118', default: '#4A3B29', strong: '#FFF3DC' },
  },
};

/* ------------------------------------------------------------------ */
/* Non-colour tokens — identical in both themes                        */
/* ------------------------------------------------------------------ */

/**
 * 4 pt base scale (docs/06 §1): multipliers 1,2,3,4,6,8,12,16,24 → 4…96 pt.
 * Exposed to Tailwind as the numeric spacing scale (p-1 = 4pt … p-9 = 96pt).
 */
export const spacingScale = [0, 4, 8, 12, 16, 24, 32, 48, 64, 96] as const;

/** Radii (docs/06 §1): sm 8 / md 14 / lg 20 / full 999. */
export const radius = { sm: 8, md: 14, lg: 20, full: 999 } as const;

/**
 * Two elevation levels only (docs/06 §1), defined per platform: iOS shadow, Android elevation.
 * Applied via the `elevation-1` / `elevation-2` Tailwind utilities (tailwind.config.js plugin).
 */
export const elevation = {
  1: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  2: {
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
} as const;

/**
 * The Bold Ink "sticker" shadow (docs/02 D25): a flat, unblurred offset rather than the soft
 * `elevation` shadows above — what a shape cut from paper and glued down slightly off-register
 * looks like. iOS renders this exactly (`shadowRadius: 0`); Android's `elevation` prop has no
 * offset control and always blurs, so on Android this degrades to a plain soft shadow at a
 * similar depth — a known platform gap, not a bug, and not worth a custom shadow view for a
 * hobby build. Applied via the `hard-shadow-1` / `hard-shadow-2` Tailwind utilities.
 * Colour is `border.strong`'s ink, not black, so it reads as "outline ink", not a device shadow —
 * callers pass it as a literal here (like `elevation` above) rather than through a class, because
 * `shadowColor` is a style prop, not resolvable from a CSS variable on native.
 */
export const hardShadow = {
  1: {
    light: {
      shadowColor: '#22170F',
      shadowOpacity: 1,
      shadowRadius: 0,
      shadowOffset: { width: 3, height: 3 },
      elevation: 3,
    },
    dark: {
      shadowColor: '#000000',
      shadowOpacity: 1,
      shadowRadius: 0,
      shadowOffset: { width: 3, height: 3 },
      elevation: 3,
    },
  },
  2: {
    light: {
      shadowColor: '#22170F',
      shadowOpacity: 1,
      shadowRadius: 0,
      shadowOffset: { width: 5, height: 5 },
      elevation: 6,
    },
    dark: {
      shadowColor: '#000000',
      shadowOpacity: 1,
      shadowRadius: 0,
      shadowOffset: { width: 5, height: 5 },
      elevation: 6,
    },
  },
} as const;

/**
 * The camera capture screen's own chrome (docs/07 Phase 3). Fixed independent of the app theme
 * — a viewfinder overlay reads the same in light and dark mode, the way a real camera app's
 * shutter UI does not follow the system appearance. `elevation`'s shadow colours above are the
 * same kind of theme-invariant literal, which is why this lives here rather than in `tokens`.
 */
export const camera = {
  chrome: '#000000',
  scrim: 'rgba(0, 0, 0, 0.45)',
  onChrome: '#FFFFFF',
} as const;

/**
 * The verdict banner's glyph badge (docs/02-tech-decisions.md D25) — a white circular "sticker"
 * behind the verdict glyph. Theme-invariant, the same reasoning as `camera` above: this is a
 * fixed design choice (white circle, dark-ink glyph, in BOTH themes — the whole banner is a
 * saturated badge regardless of theme, and this is the badge-on-the-badge), not chrome that
 * should follow the theme. `border`/`ink` are the same value on purpose — one colour, two roles.
 */
export const verdictBadge = {
  bg: '#FFFFFF',
  border: '#22170F',
  ink: '#22170F',
} as const;

/**
 * Motion (docs/06 §1): durations fast/base/slow.
 *
 * **`spring` is not wired to any animation (docs/02-tech-decisions.md D23, D25).** `SpeciesToggle`
 * used to reference it via `react-native-reanimated`, whose animated styles did not reliably
 * reach a real device; that usage was removed in D23 and never restored. `durationFast`/`Base`/
 * `Slow` are used with `LayoutAnimation` instead (D25), which IS proven working in this codebase
 * (`Collapsible`). Left here for a future agent who re-establishes a `react-native-reanimated`
 * animation actually reaches a device — do not wire it up before that. The Bold Ink canvas's own
 * keyframes (entrances, idles, the splash) live in `theme/motion.ts` (D26), on core `Animated`.
 */
export const motion = {
  durationFast: 150,
  durationBase: 250,
  durationSlow: 400,
  spring: { damping: 20, stiffness: 180, mass: 0.9 },
} as const;

/**
 * Type scale (docs/06 §2): one family, six roles. [size, lineHeight, weight].
 *
 * **Font (docs/02 D25):** two Google Fonts, not the platform system font — Lilita One for
 * `display` (the verdict word, the wordmark) and Nunito for everything else. This is a deviation
 * from docs/06 §2, which allows the platform system font "if bundle size matters"; two static
 * font files cost roughly 250 KB combined, which this hobby build accepts for the "cartoon"
 * identity docs/10 asked for. See `apps/mobile/src/theme/fonts.ts` for loading and the fallback
 * while fonts are not yet ready, and `tailwind.config.js` for how `display`/`sans` map to them.
 */
export const typography = {
  display: { size: 34, lineHeight: 40, weight: '700' }, // verdict word — Lilita One (see fonts.ts)
  title: { size: 24, lineHeight: 30, weight: '800' }, // item name
  headline: { size: 19, lineHeight: 26, weight: '700' }, // the one-sentence answer
  body: { size: 16, lineHeight: 24, weight: '400' }, // default
  label: { size: 14, lineHeight: 20, weight: '700' }, // section headers, buttons
  caption: { size: 12, lineHeight: 16, weight: '500' }, // disclaimer, sources
} as const;

export type TypeRole = keyof typeof typography;

/**
 * Component-specific dimensions from the screen specs (docs/06 §4, docs/00 §2). Named here so
 * components never carry magic numbers.
 */
export const sizes = {
  /** Minimum touch target (docs/06 §5 a11y). */
  touchTarget: 44,
  /** Species toggle height (docs/06 §4 Home). */
  speciesToggleHeight: 44,
  /** Photo thumb edge (docs/06 §4 Home). */
  photoThumb: 88,
  /** Check button height (docs/06 §4 Home). */
  checkButtonHeight: 56,
  /** Result banner glyph (docs/06 §4 Result). */
  verdictGlyph: 64,
  /** The mascot art next to the verdict banner text (docs/02 D25). */
  mascotBanner: 96,
  /** How far above its resting place the verdict banner starts its drop (docs/02 D26) — about
   *  one banner height, the canvas's `translateY(-105%)`, without waiting for a layout pass. */
  bannerDropDistance: 320,
  /** The splash screen's mascot coin (docs/02 D26). */
  splashCoin: 132,
  /** The verdict banner's glyph badge — a minimum, not a fixed size, so it can grow rather than
   *  clip the glyph at 200% font scale (docs/06 §5, docs/02 D25). */
  verdictBadge: 58,
  /** The mascot art on the species toggle segment (docs/02 D25). */
  mascotToggle: 28,
  /** The mascot art on the Identifying screen (docs/02 D25). */
  mascotIdentifying: 132,
  /** How far the scanning mascot hangs below the photo's bottom edge (the canvas's A3). */
  scanMascotOverhang: 44,
  /** A scanning stage's round indicator (the canvas's `.a-ind`). */
  stageIndicator: 34,
  /**
   * Camera shutter (docs/07 Phase 3). Explicit, not a Tailwind `h-20`/`w-20` class: this
   * project's `spacing` scale (see `tailwind.config.js`) is fully replaced with the 0–9 index
   * above, so any numeric sizing class outside that range (`h-20`, `pt-14`, `pb-10`, …) silently
   * resolves to nothing rather than erroring — `tokens.test.ts` guards the palette this way but
   * nothing catches a stray sizing class, which is exactly how the camera screen's shutter and
   * top/bottom bars ended up with no size or safe-area padding at all on a real device.
   */
  shutterOuter: 80,
  shutterInner: 64,
} as const;
