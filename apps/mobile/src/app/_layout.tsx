import '../../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initI18n } from '@/i18n';
import { useSettingsStore } from '@/lib/settings';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

/**
 * Root layout. Composition order matters:
 *   SafeAreaProvider  — safe-area insets for every screen
 *   I18nextProvider   — language (persisted, independent of region — AGENTS.md #12)
 *   ThemeProvider     — design-token CSS variables for the active light/dark theme
 */
function RootLayout() {
  // Settings (language + region) are persisted independently and each defaults from the
  // device on first launch — docs/07-implementation-plan.md Phase 0, AGENTS.md #12.
  const language = useSettingsStore((state) => state.language);
  const i18n = useMemo(() => initI18n(language), [language]);

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
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
