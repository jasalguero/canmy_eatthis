import { useTranslation } from 'react-i18next';
import { SafeAreaView, StyleSheet, Text } from 'react-native';

/**
 * Phase 0 placeholder screen — proves the app boots, i18n resolves, and routing works.
 * Phase 2 (docs/07-implementation-plan.md) replaces this with the real Home screen built
 * against the design system and mock data. Nothing here is final UI.
 */
export default function Home() {
  const { t } = useTranslation('common');

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>{t('appName')}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 20,
  },
});
