/**
 * NativeWind v4 Tailwind config (docs/02-tech-decisions.md D4, docs/06-ui-design-system.md §1).
 *
 * **Tailwind's default palette is removed, not extended** — `bg-red-500` must not resolve.
 * Every colour in the app comes from `src/theme/tokens.ts` (AGENTS.md #7: no colour literals
 * outside `theme/`, no Tailwind default palette classes). The token file is the single source
 * of truth; this config only maps it onto Tailwind class names.
 *
 * Theming model: every colour token is exposed as a CSS variable (`--verdict-safe-bg`, …) and
 * the Tailwind colour map references those variables. `ThemeProvider` (src/theme/ThemeProvider.tsx)
 * sets the variable values from `tokens[theme]` at the root, so class names are theme-agnostic
 * (`bg-surface-base`, never `dark:bg-…` for colours) and there is exactly one place a theme
 * value can change. Non-colour tokens (spacing, radii, type) are identical in both themes and
 * are mapped directly.
 *
 * `tokens.ts` is TypeScript, so it is loaded with jiti (the same loader Tailwind itself uses
 * for TS configs). Two token groups are renamed for class ergonomics:
 *   tokens.text  → `ink`   (text-ink-primary, not text-text-primary)
 *   tokens.border → `line`  (border-line-default)
 */

// jiti 1.x: the default export is the factory itself (createJITI only exists in jiti 2.x).
const createJiti = require('jiti');
// `tailwindcss/plugin` is CJS exporting the function directly; `.default` is undefined. The
// `?? ` fallback keeps this working whether the loader interops it or not.
const tailwindPluginModule = require('tailwindcss/plugin');
const plugin = tailwindPluginModule.default ?? tailwindPluginModule;

const jiti = createJiti(__filename, { interopDefault: true });
const tokensModule = jiti('./src/theme/tokens.ts');
const { spacingScale, radius, elevation } = tokensModule;

/** Tailwind colour map referencing the CSS variables (class names are theme-agnostic). */
function palette() {
  const v = (name) => `var(--${name})`;
  // Keys mirror VerdictTokens in src/theme/tokens.ts exactly; `on-bg`/`on-accent` are the
  // CI-checked label colours for the two fills (banner, accent button).
  const verdictKeys = ['bg', 'surface', 'fg', 'accent', 'on-bg', 'on-accent'];
  const verdictPalette = Object.fromEntries(
    ['safe', 'caution', 'toxic', 'unknown'].map((name) => [
      name,
      Object.fromEntries(verdictKeys.map((key) => [key, v(`verdict-${name}-${key}`)])),
    ]),
  );
  return {
    verdict: verdictPalette,
    brand: {
      primary: v('brand-primary'),
      press: v('brand-primary-press'),
      tint: v('brand-tint'),
      'on-primary': v('brand-on-primary'),
    },
    surface: {
      base: v('surface-base'),
      raised: v('surface-raised'),
      sunken: v('surface-sunken'),
      overlay: v('surface-overlay'),
    },
    ink: {
      primary: v('ink-primary'),
      secondary: v('ink-secondary'),
      tertiary: v('ink-tertiary'),
      inverse: v('ink-inverse'),
    },
    line: { subtle: v('line-subtle'), default: v('line-default'), strong: v('line-strong') },
  };
}

/** Type scale (docs/06 §2): [size, {lineHeight, fontWeight}]. */
function typeScale() {
  const t = tokensModule.typography;
  return Object.fromEntries(
    Object.entries(t).map(([role, s]) => [
      role,
      [`${s.size}px`, { lineHeight: `${s.lineHeight}px`, fontWeight: s.weight }],
    ]),
  );
}

/** Two elevation levels only (docs/06 §1), per platform: iOS shadow, Android elevation. */
const elevationPlugin = plugin(({ addUtilities }) => {
  addUtilities({ '.elevation-1': elevation[1], '.elevation-2': elevation[2] });
});

module.exports = {
  // Required by NativeWind v4: the preset supplies the React Native platform config (which core
  // plugins exist, how styles are emitted). It also brings Tailwind's default theme with it —
  // which is fine, because `theme` below is `theme`, not `theme.extend`, and therefore REPLACES
  // the preset's `colors`, `fontSize` and `spacing` wholesale. `bg-red-500` still does not
  // resolve; there is a test asserting exactly that.
  presets: [require('nativewind/preset')],
  // `class`, not `media`, for two reasons.
  //
  // 1. **`media` crashes the web build.** react-native-css-interop's web colour-scheme runtime
  //    reads the `darkMode` flag at module load; when the stylesheet has not arrived yet (the
  //    dev-server case) it installs a MutationObserver on `<head>` and, once the CSS lands,
  //    calls `colorScheme.set(...)` — which its own guard rejects when the flag is `media`,
  //    throwing "Cannot manually set color scheme, as dark mode is type 'media'". That is an
  //    upstream bug (css-interop 0.2.7) in a code path we never call. `class` makes the same
  //    call legal, so the observer resolves to `system` instead of throwing.
  // 2. **`media` cannot see the in-app Appearance setting.** Settings lets the user force light
  //    or dark independently of the device (src/lib/settings.ts). Under `media` a `dark:`
  //    variant would follow the OS and disagree with the colours around it; under `class` it
  //    follows whatever ThemeProvider resolved, override included.
  //
  // This changes nothing about the app's colours: those are CSS variables set by ThemeProvider
  // (see header) and there is not a single `dark:` variant in the codebase. The strategy only
  // governs how a `dark:` variant would resolve if one were ever added — and ThemeProvider keeps
  // NativeWind's colour scheme in sync so that it would resolve correctly on both platforms.
  darkMode: 'class',
  // Tailwind only emits a class it has seen in a scanned file. NativeWind's Metro integration
  // does NOT supply this for us — without it Tailwind finds no content, generates no utilities,
  // and the app renders completely unstyled while still compiling and passing every type check.
  // It is the one piece of this config whose absence is invisible until you look at a screen.
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    // NOTE: `theme` (not `extend`) — this REPLACES Tailwind's defaults for these groups, which
    // is what removes the default palette. `bg-red-500` does not resolve.
    colors: palette(),
    fontSize: typeScale(),
    // 4 pt base scale (docs/06 §1): p-1 = 4pt … p-9 = 96pt.
    spacing: Object.fromEntries(spacingScale.map((px, i) => [String(i), `${px}px`])),
    borderRadius: {
      sm: `${radius.sm}px`,
      md: `${radius.md}px`,
      lg: `${radius.lg}px`,
      full: `${radius.full}px`,
    },
    // One family, the platform system font (docs/06 §2 — see tokens.ts for the Inter note).
    fontFamily: { sans: ['system'] },
  },
  plugins: [elevationPlugin],
};
