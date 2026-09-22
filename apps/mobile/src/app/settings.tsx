import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Switch, View } from 'react-native';

import { ScrollScreen, Section } from '@/components/layout';
import { Button, Divider, Text } from '@/components/primitives';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n/namespaces';
import { type Appearance, useSettingsStore } from '@/lib/settings';
import { MOCK_KB_VERSION } from '@/mock/kbEntries';
import { sizes } from '@/theme/tokens';

/**
 * Settings (docs/06 §4).
 *
 * Language and region are two separate controls with no coupling between them (AGENTS.md #12),
 * and the region row says why in plain words — a Spanish speaker in the United States needs
 * Spanish text and US emergency numbers, and an app that derives one from the other gets that
 * person exactly wrong.
 */

const REGIONS = ['ES', 'US', 'MX', 'AR', 'GB'] as const;
const APPEARANCES: readonly Appearance[] = ['system', 'light', 'dark'];

/** A radio row. Local to this screen — nothing else needs a settings list yet. */
function ChoiceRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{ minHeight: sizes.touchTarget }}
      className="flex-row items-center justify-between gap-3 px-1 py-2"
    >
      <Text variant="body" tone="primary" className="flex-1">
        {label}
      </Text>
      <Text
        variant="body"
        tone={selected ? 'primary' : 'tertiary'}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {selected ? '◉' : '○'}
      </Text>
    </Pressable>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const {
    language,
    region,
    appearance,
    photoIdConsent,
    setLanguage,
    setRegion,
    setAppearance,
    setPhotoIdConsent,
  } = useSettingsStore();

  return (
    <ScrollScreen contentClassName="gap-5 px-4 pb-6 pt-2">
      <Text variant="title" tone="primary" accessibilityRole="header">
        {t('settings:title')}
      </Text>

      <Section title={t('settings:languageLabel')}>
        <View accessibilityRole="radiogroup">
          {SUPPORTED_LANGUAGES.map((code: SupportedLanguage) => (
            <ChoiceRow
              key={code}
              label={t(`settings:language_${code}`)}
              selected={language === code}
              onPress={() => setLanguage(code)}
            />
          ))}
        </View>
      </Section>

      <Divider />

      <Section title={t('settings:regionLabel')}>
        {/* Says out loud that region is not derived from language (AGENTS.md #12). */}
        <Text variant="caption" tone="tertiary">
          {t('settings:regionHint')}
        </Text>
        <View accessibilityRole="radiogroup">
          {REGIONS.map((code) => (
            <ChoiceRow
              key={code}
              label={code}
              selected={region === code}
              onPress={() => setRegion(code)}
            />
          ))}
        </View>
      </Section>

      <Divider />

      <Section title={t('settings:appearanceLabel')}>
        <View accessibilityRole="radiogroup">
          {APPEARANCES.map((value) => (
            <ChoiceRow
              key={value}
              label={t(`settings:appearance_${value}`)}
              selected={appearance === value}
              onPress={() => setAppearance(value)}
            />
          ))}
        </View>
      </Section>

      <Divider />

      <Section title={t('settings:photoIdLabel')}>
        <View className="flex-row items-center justify-between gap-3">
          <Text variant="body" tone="primary" className="flex-1">
            {t('settings:photoIdLabel')}
          </Text>
          <Switch
            accessibilityLabel={t('settings:photoIdLabel')}
            value={photoIdConsent}
            onValueChange={setPhotoIdConsent}
          />
        </View>
        <Text variant="caption" tone="tertiary">
          {t('settings:photoIdHint')}
        </Text>
      </Section>

      <Divider />

      <Section title={t('settings:legalSection')}>
        <Text variant="body" tone="secondary">
          {t('legal:disclaimerLong')}
        </Text>
        <Text variant="label" tone="primary" accessibilityRole="header" className="mt-2">
          {t('legal:sourcesPolicyTitle')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('legal:sourcesPolicyBody')}
        </Text>
      </Section>

      <Divider />

      <Section title={t('settings:aboutSection')}>
        <Text variant="caption" tone="tertiary">
          {t('settings:version', { version: Constants.expoConfig?.version ?? '0.0.0' })}
        </Text>
        <Text variant="caption" tone="tertiary">
          {t('settings:kbVersion', { version: MOCK_KB_VERSION.en })}
        </Text>
        <Button
          label={t('settings:reportWrongAnswer')}
          variant="quiet"
          onPress={() => router.push('/profile')}
          className="self-start"
        />
      </Section>

      {__DEV__ ? (
        <>
          <Divider />
          <Section title={t('settings:devSection')}>
            <Button
              label={t('settings:openGallery')}
              variant="secondary"
              onPress={() => router.push('/gallery')}
            />
          </Section>
        </>
      ) : null}
    </ScrollScreen>
  );
}
