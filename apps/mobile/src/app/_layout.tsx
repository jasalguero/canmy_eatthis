import '../../global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initI18n } from '@/i18n';
import { useSettingsStore } from '@/lib/settings';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useAppFonts } from '@/theme/fonts';

// Held until Bold Ink's fonts are loaded (below), so the native splash screen — not a flash of
// the platform system font — is what covers the swap to Lilita One / Nunito (docs/02 D25).
// Module-level, per Expo's own pattern: it must run once, before the first render, not inside
// the component (a component body re-runs; a rejected repeat call here is harmless either way).
void SplashScreen.preventAutoHideAsync();

/**
 * Root layout. Composition order matters:
 *   SafeAreaProvider  — safe-area insets for every screen
 *   I18nextProvider   — language (persisted, independent of region — AGENTS.md #12)
 *   ThemeProvider     — design-token CSS variables for the active light/dark theme
 */
function RootLayout() {
  const fontsLoaded = useAppFonts();

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // Keep the native splash on screen rather than rendering a frame in the system font — this is
  // the ONE render this app skips on a technicality, not a pattern to reach for elsewhere.
  if (!fontsLoaded) return null;

  return <ThemedRootLayout />;
}

function ThemedRootLayout() {
  // Settings (language + region) are persisted independently and each defaults from the
  // device on first launch — docs/07-implementation-plan.md Phase 0, AGENTS.md #12.
  const language = useSettingsStore((state) => state.language);
  const appearance = useSettingsStore((state) => state.appearance);
  // Initialisation only — `language` here is just the value i18next starts with. Switching
  // language afterwards happens in the effect below, never during render.
  const i18n = useMemo(() => initI18n(language), [language]);

  // i18next notifies every `useTranslation` subscriber when the language changes, which is a
  // state update in other components. Doing that during render (it used to happen inside the
  // `useMemo` above) triggers React's "Cannot update a component while rendering a different
  // component" warning and updates subscribers mid-render, so it is an effect.
  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [i18n, language]);

  // `system` means "no override", which is what ThemeProvider's undefined `theme` prop means.
  const themeOverride = appearance === 'system' ? undefined : appearance;

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={themeOverride}>
          {/* Inside the provider so useTheme() resolves the real theme, not the context default. */}
          <StatusBarThemer>
            <Stack screenOptions={{ headerShown: false }} />
          </StatusBarThemer>
        </ThemeProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}

/**
 * Flips the status-bar style to match the theme (docs/06 §4: the Result banner is full-bleed to
 * the top edge "with the status-bar style flipped to match"). Light theme → dark icons; dark
 * theme → light icons.
 */
function StatusBarThemer({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      {children}
    </>
  );
}

export default RootLayout;
