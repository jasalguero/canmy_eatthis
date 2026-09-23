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
 * The light verdict values are the ones fixed in docs/06 §1; the dark values were designed to keep
 * the same hue relationships with AA contrast (verified by the same script).
 */

export type ThemeName = 'light' | 'dark';
export type VerdictId = 'safe' | 'caution' | 'toxic' | 'unknown';

export interface VerdictTokens {
  /** Full-bleed banner background. Dark in BOTH themes (saturated dark in light, darker tint in
   *  dark) — which is why banner text needs its own token rather than `text.inverse`. */
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
  /** Text/glyph ON an `accent` fill. CI-checked ≥4.5:1 against `accent`. Its polarity flips
   *  between themes (light accents take dark labels, dark accents take darker ones), which is
   *  exactly why it is a token and not a hardcoded white. */
  onAccent: string;
  /** Text on `bg` (the banner word, item name). Light in both themes; CI-checked ≥4.5:1 on `bg`.
   *  Extension of the docs/06 §1 four-key shape — see file header. */
  onBg: string;
}

export interface ThemeTokens {
  verdict: Record<VerdictId, VerdictTokens>;
  /** Brand / chrome — warm, calm, deliberately not medical-blue (docs/06 §1). */
  brand: {
    primary: string;
    primaryPress: string;
    tint: string;
    /** Label on a `brand.primary` fill (the Check button). CI-checked ≥4.5:1. White in light,
     *  near-black in dark — the dark-theme primary is a light mint and white on it is 2.8:1. */
    onPrimary: string;
  };
  surface: { base: string; raised: string; sunken: string; overlay: string };
  text: { primary: string; secondary: string; tertiary: string; inverse: string };
  border: { subtle: string; default: string; strong: string };
}

export const tokens: Record<ThemeName, ThemeTokens> = {
  light: {
    verdict: {
      // Values fixed in docs/06-ui-design-system.md §1. `onBg` (banner text) is white in light
      // mode — the banner background is dark and saturated.
      safe: {
        bg: '#0F5132',
        surface: '#D1F0DF',
        fg: '#0A3622',
        accent: '#14A06B',
        onBg: '#FFFFFF',
        onAccent: '#04150D',
      },
      caution: {
        bg: '#664D03',
        surface: '#FFF3CD',
        fg: '#4A3803',
        accent: '#E0A800',
        onBg: '#FFFFFF',
        onAccent: '#2B2002',
      },
      toxic: {
        bg: '#5C1A1A',
        surface: '#FADBD8',
        fg: '#4A1010',
        accent: '#D9342B',
        onBg: '#FFFFFF',
        onAccent: '#FFFFFF',
      },
      // `unknown` is amber-grey, never green (docs/00 hard rule) and never reassuring.
      unknown: {
        bg: '#3D4348',
        surface: '#E4E7EA',
        fg: '#2B3034',
        accent: '#7A848C',
        onBg: '#FFFFFF',
        onAccent: '#14181B',
      },
    },
    brand: { primary: '#2F6F62', primaryPress: '#245549', tint: '#E8F2EF', onPrimary: '#FFFFFF' },
    surface: { base: '#F6F8F7', raised: '#FFFFFF', sunken: '#EDF1EF', overlay: '#FFFFFF' },
    text: { primary: '#1A211E', secondary: '#49544F', tertiary: '#5F6B66', inverse: '#FFFFFF' },
    border: { subtle: '#E2E8E5', default: '#CBD4D0', strong: '#97A39D' },
  },
  dark: {
    // Dark mode is not optional — this app is used at 2 a.m. (docs/06 §1).
    // Same hues as light, inverted luminance; every fg/surface pair ≥4.5:1 (CI-checked).
    verdict: {
      // `onBg` is near-white in dark mode too — the banner background stays dark.
      safe: {
        bg: '#0B2C1D',
        surface: '#1A3829',
        fg: '#C4E9D5',
        accent: '#5BC79A',
        onBg: '#F2F5F4',
        onAccent: '#04150D',
      },
      caution: {
        bg: '#3B2F06',
        surface: '#443A15',
        fg: '#F0DA92',
        accent: '#E3B341',
        onBg: '#F2F5F4',
        onAccent: '#241C03',
      },
      toxic: {
        bg: '#3A100F',
        surface: '#4A1D1B',
        fg: '#F5C6C0',
        accent: '#FF7E72',
        onBg: '#F2F5F4',
        onAccent: '#2A0908',
      },
      unknown: {
        bg: '#25292D',
        surface: '#3A4046',
        fg: '#D9DEE3',
        accent: '#9AA5AD',
        onBg: '#F2F5F4',
        onAccent: '#14181B',
      },
    },
    brand: { primary: '#58A995', primaryPress: '#6FBBA8', tint: '#22342F', onPrimary: '#08100E' },
    surface: { base: '#101413', raised: '#1A201E', sunken: '#0B0F0E', overlay: '#242C29' },
    text: { primary: '#EDF1EF', secondary: '#A9B4AF', tertiary: '#7E8A84', inverse: '#101413' },
    border: { subtle: '#262E2B', default: '#3C4642', strong: '#5D6963' },
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

/** Motion (docs/06 §1): durations fast/base/slow; spring for finger-driven things. */
export const motion = {
  durationFast: 150,
  durationBase: 250,
  durationSlow: 400,
  /** Spring for anything the finger drives (species toggle pill). */
  spring: { damping: 20, stiffness: 180, mass: 0.9 },
} as const;

/**
 * Type scale (docs/06 §2): one family, six roles. [size, lineHeight, weight].
 * Font: the platform system font (docs/06 §2 allows "the platform system font if bundle size
 * matters" — a hobby build takes that option; Inter via expo-font is a drop-in swap of
 * `fontFamily` below, nothing else changes).
 */
export const typography = {
  display: { size: 34, lineHeight: 40, weight: '700' }, // verdict word
  title: { size: 24, lineHeight: 30, weight: '600' }, // item name
  headline: { size: 19, lineHeight: 26, weight: '600' }, // the one-sentence answer
  body: { size: 16, lineHeight: 24, weight: '400' }, // default
  label: { size: 14, lineHeight: 20, weight: '500' }, // section headers, buttons
  caption: { size: 12, lineHeight: 16, weight: '400' }, // disclaimer, sources
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
