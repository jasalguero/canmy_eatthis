import { useColorScheme, vars } from 'nativewind';
import { type ReactNode, createContext, useContext, useMemo } from 'react';
import { View } from 'react-native';

import { type ThemeName, tokens } from './tokens';

/**
 * Resolves the active theme. An explicit `theme` prop (used by the dev gallery to force light or
 * dark, and by a future appearance setting) wins; otherwise the system colour scheme decides.
 * docs/06-ui-design-system.md §1: "Dark mode is not optional — this app is used at 2 a.m."
 */
export function resolveTheme(
  override: ThemeName | undefined,
  system: 'light' | 'dark' | null | undefined,
): ThemeName {
  if (override) return override;
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
  return out;
}

interface ThemeContextValue {
  /** The resolved theme actually in effect (after any override). */
  theme: ThemeName;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light' });

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
  const { colorScheme } = useColorScheme();
  const resolved = resolveTheme(theme, colorScheme);

  const variableStyle = useMemo(() => vars(themeToVariables(resolved)), [resolved]);

  return (
    <ThemeContext.Provider value={{ theme: resolved }}>
      <View style={variableStyle} className="flex-1 bg-surface-base">
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

/** The resolved theme in effect. For non-colour decisions (status-bar style, gallery, …). */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
