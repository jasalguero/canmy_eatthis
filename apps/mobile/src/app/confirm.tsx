import type { Alternate, Candidate, Species } from '@canmyeatthis/shared';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { ConfidencePill } from '@/components/feedback';
import { DescriptionInput } from '@/components/inputs';
import { ScrollScreen, Section, StickyFooter } from '@/components/layout';
import { Button, Card, Text } from '@/components/primitives';
import { devConfirm } from '@/lib/devPreview';
import { useDraftStore } from '@/lib/draft';
import { features } from '@/lib/features';
import { getKbEntry } from '@/lib/offlineKb';
import { useSettingsStore } from '@/lib/settings';
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
 *
 * `?kbId=...` (H3) is the real path: `identifying.tsx`'s fuzzy-match branch landed here with one
 * real on-device candidate, no alternates (the fuzzy resolver returns one match or none — there
 * is nothing else to offer), and no photo, since this only happens for a typed query.
 *
 * Without `kbId` this is the photo path. Photo identification does not exist yet (D28), so its
 * candidates are the development mocks from `lib/devPreview.ts`, which a release build never
 * gets: there, this screen without a real candidate has nothing to confirm and goes Home.
 */
interface ConfirmProps {
  primary: Candidate;
  alternates: readonly Alternate[];
  photoUri: string | null;
  isPlant: boolean;
  /** Where confirming goes: a real result, or the development mock's. */
  resultParams: Record<string, string>;
}

export default function ConfirmRoute() {
  const params = useLocalSearchParams<{ plant?: string; kbId?: string; species?: string }>();
  const language = useSettingsStore((state) => state.language);
  const draftPhotos = useDraftStore((state) => state.photos);
  const isPlant = params.plant === '1';

  if (params.kbId) {
    const entry = getKbEntry(params.kbId, language);
    if (!entry) return <Redirect href="/" />;
    const species: Species = params.species === 'cat' ? 'cat' : 'dog';
    return (
      <Confirm
        primary={{
          id: entry.id,
          label: entry.displayName,
          kbId: entry.id,
          confidence: 0.6,
          confidenceBand: 'medium',
        }}
        alternates={[]}
        photoUri={null}
        isPlant={false}
        resultParams={{ kbId: entry.id, species }}
      />
    );
  }

  const dev = features.photoId || __DEV__ ? devConfirm(isPlant) : null;
  if (!dev) return <Redirect href="/" />;
  return (
    <Confirm
      primary={dev.primary}
      alternates={dev.alternates}
      photoUri={draftPhotos[0] ?? dev.photoUri}
      isPlant={isPlant}
      resultParams={{ case: dev.resultCaseId }}
    />
  );
}

function Confirm({ primary, alternates, photoUri, isPlant, resultParams }: ConfirmProps) {
  const { t } = useTranslation();

  const [selected, setSelected] = useState<string>(primary.id);
  const [otherText, setOtherText] = useState('');
  const choosingOther = selected === 'other';

  return (
    // Same keyboard-avoidance as Home (index.tsx): without it, focusing "Something else"'s
    // `DescriptionInput` leaves the confirm CTA and the field itself behind the keyboard, with
    // nothing to push either back into view — this Section is otherwise the one place on this
    // screen the keyboard ever opens.
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollScreen contentClassName="gap-5 px-4 pb-6 pt-2">
        <Text variant="title" tone="primary" accessibilityRole="header">
          {t('confirm:title')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('confirm:body')}
        </Text>

        <Card className="gap-3">
          <View className="flex-row items-center gap-3">
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                resizeMode="cover"
                style={{ width: sizes.photoThumb, height: sizes.photoThumb }}
                className="rounded-md bg-surface-sunken"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            ) : null}
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
          onPress={() => router.push({ pathname: '/result', params: resultParams })}
        />
      </StickyFooter>
    </KeyboardAvoidingView>
  );
}
