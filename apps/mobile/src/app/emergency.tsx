import type { Hotline } from '@canmyeatthis/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { ScrollScreen, Section } from '@/components/layout';
import { Button, Card, Text } from '@/components/primitives';
import { callHotline, emergencyHotlines, findEmergencyVetUrl } from '@/lib/emergency';
import { useSettingsStore } from '@/lib/settings';

/**
 * The emergency screen (docs/05-safety-legal.md §3), opened by every `EmergencyCallButton`.
 *
 * AGENTS.md #4: it works offline, logged out and in every build — the numbers are bundled
 * (`packages/shared/src/hotlines.ts`) and calling is a `tel:` link. In docs/05's order:
 *   1. the user's own vet, usually fastest and free
 *   2. the poison lines for the user's **region** (never their language, AGENTS.md #12), each with
 *      its cost and the languages it answers in, so nobody is surprised by a fee or an
 *      English-only line in an emergency
 *   3. an emergency-vet search in the maps app
 *
 * A region with no checked line says so plainly instead of offering a guess. Unverified lines
 * show only in development builds, labelled as unverified.
 */
export default function Emergency() {
  const { t } = useTranslation();
  const region = useSettingsStore((state) => state.region);
  const hotlines = emergencyHotlines(region);

  return (
    <ScrollScreen contentClassName="gap-5 px-4 pb-6 pt-2">
      <View className="gap-2">
        <Text variant="display" tone="primary" accessibilityRole="header">
          {t('hotlines:title')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('hotlines:intro')}
        </Text>
      </View>

      <Card className="gap-1">
        <Text variant="headline" tone="primary" accessibilityRole="header">
          {t('hotlines:ownVetTitle')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('hotlines:ownVetBody')}
        </Text>
      </Card>

      <Section title={t('hotlines:regionTitle', { region })}>
        {hotlines.length > 0 ? (
          <View className="gap-3">
            {hotlines.map((hotline) => (
              <HotlineCard key={hotline.id} hotline={hotline} />
            ))}
          </View>
        ) : (
          <Text variant="body" tone="secondary">
            {t('hotlines:noneForRegion')}
          </Text>
        )}
        <Button
          label={t('hotlines:changeRegion')}
          variant="quiet"
          onPress={() => router.push('/settings')}
          className="self-start"
        />
      </Section>

      <Button
        label={t('hotlines:findVet')}
        variant="secondary"
        onPress={() => void Linking.openURL(findEmergencyVetUrl(t('hotlines:findVetQuery')))}
      />

      <Button label={t('common:back')} variant="quiet" onPress={() => router.back()} />
    </ScrollScreen>
  );
}

function HotlineCard({ hotline }: { hotline: Hotline }) {
  const { t } = useTranslation();
  const cost =
    hotline.cost === 'fee' ? t(`hotlines:fee_${hotline.id}`) : t(`hotlines:cost_${hotline.cost}`);
  const languages = hotline.languages.map((code) => t(`hotlines:language_${code}`)).join(', ');

  return (
    <Card className="gap-2">
      <Text variant="headline" tone="primary">
        {hotline.name}
      </Text>
      <Button
        label={hotline.display}
        size="large"
        accessibilityLabel={t('hotlines:callA11y', {
          name: hotline.name,
          number: hotline.display,
        })}
        onPress={() => callHotline(hotline)}
      />
      <Text variant="body" tone="secondary">
        {cost}
      </Text>
      {hotline.hours24 ? (
        <Text variant="caption" tone="tertiary">
          {t('hotlines:hours24')}
        </Text>
      ) : null}
      <Text variant="caption" tone="tertiary">
        {t('hotlines:languages', { languages })}
      </Text>
      {hotline.verifiedAt === null ? (
        <Text variant="caption" tone="tertiary">
          {t('hotlines:unverified')}
        </Text>
      ) : null}
    </Card>
  );
}
