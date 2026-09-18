import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initI18n } from '@/i18n';
import { useSettingsStore } from '@/lib/settings';

export default function RootLayout() {
  // Settings (language + region) are persisted independently and each defaults from the
  // device on first launch — docs/07-implementation-plan.md Phase 0, AGENTS.md #12.
  const language = useSettingsStore((state) => state.language);
  const i18n = useMemo(() => initI18n(language), [language]);

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
