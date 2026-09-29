import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ScrollScreen, Section, StickyFooter } from '@/components/layout';
import { Button, Card, Text } from '@/components/primitives';
import { features } from '@/lib/features';
import { openLegal } from '@/lib/legal';
import { useSettingsStore } from '@/lib/settings';

/**
 * First run (docs/07 Phase 5, docs/05-safety-legal.md §6). Home redirects here until it has been completed.
 *
 * Three things, in this order: what this is, what it is not, and consent to the AI step. The
 * middle one is not padding — an app that looks up poisons has to be explicit that it is not a
 * vet before the user's first emergency, not during it.
 *
 * **Declining leaves a fully working app.** That is a requirement, not a courtesy (docs/07
 * Phase 5 acceptance), so "Use typed lookups only" is a real choice with its consequence stated,
 * rendered at the same weight as accepting — not a greyed-out escape hatch.
 *
 * A build without photo identification (`lib/features.ts`, D28) sends no photos to any AI
 * service, so it asks for no AI consent: the card is not shown, and one "Continue" finishes with
 * consent off. What such a build does send, and when, is in the privacy policy linked below.
 */
export default function FirstRun() {
  const { t } = useTranslation();
  const setPhotoIdConsent = useSettingsStore((s) => s.setPhotoIdConsent);
  const setOnboarded = useSettingsStore((s) => s.setOnboarded);
  const language = useSettingsStore((s) => s.language);

  const finish = (consent: boolean) => {
    setPhotoIdConsent(consent);
    setOnboarded(true);
    // `replace`, not `dismissTo`: on a first launch this screen is the only one in the stack.
    router.replace('/');
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

        {features.photoId ? (
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
        ) : null}

        <View className="flex-row flex-wrap gap-2">
          <Button
            label={t('legal:privacyPolicy')}
            variant="quiet"
            onPress={() => openLegal('privacy', language)}
          />
          <Button
            label={t('legal:termsOfUse')}
            variant="quiet"
            onPress={() => openLegal('terms', language)}
          />
        </View>
      </ScrollScreen>

      <StickyFooter>
        {features.photoId ? (
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
        ) : (
          <Button label={t('onboarding:continueCta')} size="large" onPress={() => finish(false)} />
        )}
      </StickyFooter>
    </>
  );
}
