import type { Candidate } from '@canmyeatthis/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, View } from 'react-native';

import { ConfidencePill } from '@/components/feedback';
import { DescriptionInput } from '@/components/inputs';
import { ScrollScreen, Section, StickyFooter } from '@/components/layout';
import { Button, Card, Text } from '@/components/primitives';
import { MOCK_ALTERNATES, MOCK_CANDIDATES, MOCK_PLANT_CANDIDATE } from '@/mock/cases';
import { MOCK_PHOTO_URI } from '@/mock/photos';
import { sizes } from '@/theme/tokens';

/**
 * Confirm (docs/06 §4).
 *
 * This screen is a safety gate, not a convenience: a verdict is only as good as the
 * identification behind it, and the model produces candidates, never verdicts (AGENTS.md #1).
 * docs/07 Phase 6 requires it to be impossible to skip for a photo-derived identification — that
 * assertion belongs with the real flow in H5; Phase 2 builds the screen it lands on.
 *
 * `?plant=1` renders the plant case: photo-identified plants are always low confidence and
 * always carry the "confirm with a vet" notice regardless of what the model said (docs/10 §4).
 */
export default function Confirm() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ plant?: string }>();
  const isPlant = params.plant === '1';

  const primary: Candidate = isPlant ? MOCK_PLANT_CANDIDATE : MOCK_CANDIDATES[0];
  const alternates = isPlant ? [] : MOCK_ALTERNATES;

  const [selected, setSelected] = useState<string>(primary.id);
  const [otherText, setOtherText] = useState('');
  const choosingOther = selected === 'other';

  return (
    <>
      <ScrollScreen contentClassName="gap-5 px-4 pb-6 pt-2">
        <Text variant="title" tone="primary" accessibilityRole="header">
          {t('confirm:title')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('confirm:body')}
        </Text>

        <Card className="gap-3">
          <View className="flex-row items-center gap-3">
            <Image
              source={{ uri: MOCK_PHOTO_URI }}
              resizeMode="cover"
              style={{ width: sizes.photoThumb, height: sizes.photoThumb }}
              className="rounded-md bg-surface-sunken"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <View className="flex-1 gap-2">
              <Text variant="title" tone="primary">
                {primary.label}
              </Text>
              {/* A band, never a percentage — docs/06 §4. */}
              <ConfidencePill band={primary.confidenceBand} />
            </View>
          </View>

          {isPlant ? (
            <Text variant="body" tone="secondary" className="rounded-sm bg-surface-sunken p-3">
              {t('confirm:plantWarning')}
            </Text>
          ) : null}
        </Card>

        {alternates.length > 0 ? (
          <Section title={t('confirm:alternatesTitle')}>
            <View accessibilityRole="radiogroup" className="gap-2">
              {[
                ...alternates.map((a) => ({ id: a.kbId, label: a.label })),
                { id: 'other', label: t('confirm:somethingElse') },
              ].map((option) => {
                const isSelected = selected === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected, checked: isSelected }}
                    accessibilityLabel={option.label}
                    onPress={() => setSelected(option.id)}
                    style={{ minHeight: sizes.touchTarget }}
                    className={[
                      'flex-row items-center gap-3 rounded-md border p-3',
                      isSelected
                        ? 'border-brand-primary bg-brand-tint'
                        : 'border-line-default bg-surface-raised',
                    ].join(' ')}
                  >
                    {/* Decorative: selection is already on the radio for assistive tech. */}
                    <Text
                      variant="body"
                      tone={isSelected ? 'primary' : 'tertiary'}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    >
                      {isSelected ? '◉' : '○'}
                    </Text>
                    <Text variant="body" tone="primary" className="flex-1">
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {choosingOther ? (
              <DescriptionInput value={otherText} onChangeText={setOtherText} className="mt-2" />
            ) : null}
          </Section>
        ) : null}
      </ScrollScreen>

      <StickyFooter>
        <Button
          label={t('confirm:confirmCta')}
          size="large"
          onPress={() =>
            router.push({
              pathname: '/result',
              params: { case: isPlant ? 'toxic-severe-cat' : 'toxic-moderate-dog' },
            })
          }
        />
      </StickyFooter>
    </>
  );
}
