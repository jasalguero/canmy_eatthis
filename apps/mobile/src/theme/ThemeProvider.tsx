import { colorScheme as nativewindColorScheme, vars } from 'nativewind';
import { type ReactNode, createContext, useContext, useEffect, useMemo } from 'react';
import { type ColorSchemeName, View, useColorScheme } from 'react-native';

import { type ThemeName, camera, tokens } from './tokens';

/**
 * Resolves the active theme. An explicit `theme` prop (used by the dev gallery to force light or
 * dark, and by a future appearance setting) wins; otherwise the system colour scheme decides.
 * docs/06-ui-design-system.md §1: "Dark mode is not optional — this app is used at 2 a.m."
 */
export function resolveTheme(override: ThemeName | undefined, system: ColorSchemeName): ThemeName {
  if (override) return override;
  // `ColorSchemeName` also admits `null`, `undefined` and `'unspecified'` — each of which means
  // "the device did not tell us", and light is the right answer for all of them.
  return system === 'dark' ? 'dark' : 'light';
}

/** `onBg` → `on-bg`: token keys are camelCase, CSS variables and Tailwind class names are not. */
function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/**
 * Flatten one theme's token groups into the CSS-variable map the Tailwind colour palette
 * references (see tailwind.config.js). This is the ONLY place the mapping exists — the Tailwind
 * config names the same variables on the read side. Variable names must match it exactly:
 *   --verdict-<verdict>-<key>  --brand-<key>  --surface-<key>  --ink-<key>  --line-<key>
 * where <key> is the kebab-cased token key (`onBg` → `on-bg`, so `text-verdict-toxic-on-bg`).
 */
export function themeToVariables(theme: ThemeName): Record<string, string> {
  const t = tokens[theme];
  const out: Record<string, string> = {};
  for (const [verdict, v] of Object.entries(t.verdict)) {
    for (const [key, value] of Object.entries(v)) {
      out[`--verdict-${verdict}-${kebab(key)}`] = value;
    }
  }
  for (const [key, value] of Object.entries(t.brand)) out[`--brand-${kebab(key)}`] = value;
  for (const [key, value] of Object.entries(t.surface)) out[`--surface-${kebab(key)}`] = value;
  for (const [key, value] of Object.entries(t.text)) out[`--ink-${kebab(key)}`] = value;
  for (const [key, value] of Object.entries(t.border)) out[`--line-${kebab(key)}`] = value;
  // Fixed regardless of `theme` — see tokens.ts's `camera` doc comment — but still routed
  // through a CSS variable like everything else, so nothing here has to special-case it.
  for (const [key, value] of Object.entries(camera)) out[`--camera-${kebab(key)}`] = value;
  return out;
}

interface ThemeContextValue {
  /** The resolved theme actually in effect (after any override). */
  theme: ThemeName;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light' });

/**
 * True inside an existing ThemeProvider. Only the outermost one syncs NativeWind's colour
 * scheme: the dev gallery renders two nested providers side by side (forced light and forced
 * dark) so components can be compared, and if each of those pushed its theme to the global
 * NativeWind scheme they would fight over it and whichever rendered last would win.
 */
const ThemeNestingContext = createContext(false);

/**
 * Sets the design-token CSS variables at the root of the tree so every Tailwind colour class
 * (`bg-surface-base`, `text-ink-primary`, `bg-verdict-toxic-bg`, …) resolves to the active
 * theme's values. Class names stay theme-agnostic — there is exactly one place a theme value
 * changes (here), per the theming model in tailwind.config.js.
 *
 * `vars()` is the cross-platform primitive from react-native-css-interop: on web it yields a
 * plain custom-properties style object (which cascades through the DOM); on native it yields an
 * interop style whose variables are inherited by every descendant through the interop's
 * VariableContext. Applying it to a single root wrapper therefore themes the whole app.
 */
export function ThemeProvider({
  children,
  theme,
}: {
  children: ReactNode;
  /** Force a theme regardless of the system scheme (dev gallery, future appearance setting). */
  theme?: ThemeName;
}) {
  // React Native's own hook, not NativeWind's: all this needs is the device colour scheme, and
  // going direct keeps the theme independent of NativeWind's colour-scheme machinery (which is
  // what produced the `darkMode: 'media'` crash described in tailwind.config.js).
  const colorScheme = useColorScheme();
  const resolved = resolveTheme(theme, colorScheme);
  const isNested = useContext(ThemeNestingContext);

  // Keep NativeWind's notion of dark mode aligned with the theme actually in effect, so a
  // `dark:` variant — if one is ever added — agrees with the token colours around it, including
  // when the user has overridden Appearance in Settings. Requires `darkMode: 'class'`; under
  // `'media'` this call throws by design.
  useEffect(() => {
    if (isNested) return;
    nativewindColorScheme.set(resolved);
  }, [isNested, resolved]);

  const variableStyle = useMemo(() => vars(themeToVariables(resolved)), [resolved]);

  return (
    <ThemeContext.Provider value={{ theme: resolved }}>
      <ThemeNestingContext.Provider value={true}>
        <View style={variableStyle} className="flex-1 bg-surface-base">
          {children}
        </View>
      </ThemeNestingContext.Provider>
    </ThemeContext.Provider>
  );
}

/** The resolved theme in effect. For non-colour decisions (status-bar style, gallery, …). */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
