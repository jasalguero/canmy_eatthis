import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ScrollScreen, Section, StickyFooter } from '@/components/layout';
import { Button, Card, Text } from '@/components/primitives';
import { useSettingsStore } from '@/lib/settings';

/**
 * First run (docs/07 Phase 7, docs/10 §5).
 *
 * Three things, in this order: what this is, what it is not, and consent to the AI step. The
 * middle one is not padding — an app that looks up poisons has to be explicit that it is not a
 * vet before the user's first emergency, not during it.
 *
 * **Declining leaves a fully working app.** That is a requirement, not a courtesy (docs/07
 * Phase 7 acceptance), so "Use typed lookups only" is a real choice with its consequence stated,
 * rendered at the same weight as accepting — not a greyed-out escape hatch.
 */
export default function FirstRun() {
  const { t } = useTranslation();
  const setPhotoIdConsent = useSettingsStore((s) => s.setPhotoIdConsent);
  const setOnboarded = useSettingsStore((s) => s.setOnboarded);

  const finish = (consent: boolean) => {
    setPhotoIdConsent(consent);
    setOnboarded(true);
    router.dismissTo('/');
  };

  return (
    <>
      <ScrollScreen contentClassName="gap-5 px-4 pb-6 pt-2">
        <Text variant="title" tone="primary" accessibilityRole="header">
          {t('onboarding:welcomeTitle')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('onboarding:welcomeBody')}
        </Text>

        <Section title={t('onboarding:whatItIsTitle')}>
          <Text variant="body" tone="primary">
            {t('onboarding:whatItIsBody')}
          </Text>
        </Section>

        <Section title={t('onboarding:whatItIsNotTitle')}>
          <Text variant="body" tone="primary">
            {t('onboarding:whatItIsNotBody')}
          </Text>
        </Section>

        <Card className="gap-3">
          <Text variant="headline" tone="primary" accessibilityRole="header">
            {t('onboarding:aiConsentTitle')}
          </Text>
          <Text variant="body" tone="secondary">
            {t('onboarding:aiConsentBody')}
          </Text>
          <Text variant="caption" tone="tertiary">
            {t('onboarding:aiConsentDeclineNote')}
          </Text>
        </Card>
      </ScrollScreen>

      <StickyFooter>
        <View className="gap-2">
          <Button
            label={t('onboarding:aiConsentAccept')}
            size="large"
            onPress={() => finish(true)}
          />
          <Button
            label={t('onboarding:aiConsentDecline')}
            variant="secondary"
            onPress={() => finish(false)}
          />
        </View>
      </StickyFooter>
    </>
  );
}
