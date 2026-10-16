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
import { getKbEntry, resolveExactOffline } from '@/lib/offlineKb';
import {
  type ConfirmSelection,
  confirmChoices,
  confirmTarget,
  usePhotoResultStore,
} from '@/lib/photoFlow';
import { useSettingsStore } from '@/lib/settings';
import { sizes } from '@/theme/tokens';

/**
 * Confirm (docs/06 §4).
 *
 * This screen is a safety gate, not a convenience: a verdict is only as good as the
 * identification behind it, and the model produces candidates, never verdicts (AGENTS.md #1).
 * Every photo check lands here (`lib/photoFlow.ts` `routeForPhotoOutcome`, docs/05 §1 rule 5).
 *
 * Three ways in:
 *   - `?kbId=` — a typed query the on-device resolver matched only fuzzily: one candidate.
 *   - the photo path — the identification `identifying.tsx` just received: the top candidate,
 *     then the other candidates and the KB's confusables for it, then anything the model named that
 *     the KB does not hold. Plants are always shown as low confidence, with the vet notice
 *     (docs/04-knowledge-base.md §2).
 *   - development only — the gallery's fixed states, `?plant=1` for the plant case.
 *
 * Whatever is picked, the result is computed on the device from the KB; a name the KB does not
 * hold is an `unknown`, and "Something else" resolves the typed text exactly or not at all.
 */
interface ConfirmOption {
  id: string;
  label: string;
  selection: ConfirmSelection;
}

interface ConfirmProps {
  primary: Candidate;
  /** Other candidates and KB confusables (`lib/photoFlow.ts` `confirmChoices`), in that order. */
  alternates: readonly Alternate[];
  /** Candidates the KB does not hold, offered by name. */
  unmatched?: readonly string[];
  photoUri: string | null;
  isPlant: boolean;
  /** Where confirming goes for a selection; `null` keeps the button disabled. */
  resultFor: (selection: ConfirmSelection) => Record<string, string> | null;
}

export default function ConfirmRoute() {
  const params = useLocalSearchParams<{ plant?: string; kbId?: string; species?: string }>();
  const language = useSettingsStore((state) => state.language);
  const draftPhotos = useDraftStore((state) => state.photos);
  const photoResponse = usePhotoResultStore((state) => state.response);
  const species: Species = params.species === 'cat' ? 'cat' : 'dog';
  const resultFor = (selection: ConfirmSelection) =>
    confirmTarget(selection, species, resolveExactOffline);

  if (params.kbId) {
    const entry = getKbEntry(params.kbId, language);
    if (!entry) return <Redirect href="/" />;
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
        resultFor={resultFor}
      />
    );
  }

  // The photo path: the identification the Identifying screen just received.
  const choices = photoResponse ? confirmChoices(photoResponse) : null;
  if (choices) {
    const entry = choices.primary.kbId ? getKbEntry(choices.primary.kbId, language) : undefined;
    const isPlant = entry?.category === 'plant';
    return (
      <Confirm
        // Photo-identified plants are always shown as low confidence (docs/04-knowledge-base.md §2).
        primary={isPlant ? { ...choices.primary, confidenceBand: 'low' } : choices.primary}
        alternates={choices.others}
        unmatched={choices.unmatched}
        photoUri={draftPhotos[0] ?? null}
        isPlant={isPlant}
        resultFor={resultFor}
      />
    );
  }

  // Development only: the gallery's fixed states (`lib/devPreview.ts`).
  const isPlant = params.plant === '1';
  const dev = __DEV__ ? devConfirm(isPlant) : null;
  if (!dev) return <Redirect href="/" />;
  return (
    <Confirm
      primary={dev.primary}
      alternates={dev.alternates}
      photoUri={draftPhotos[0] ?? dev.photoUri}
      isPlant={isPlant}
      resultFor={() => ({ case: dev.resultCaseId })}
    />
  );
}

function Confirm({
  primary,
  alternates,
  unmatched = [],
  photoUri,
  isPlant,
  resultFor,
}: ConfirmProps) {
  const { t } = useTranslation();

  const primaryOption: ConfirmOption = {
    id: `primary:${primary.id}`,
    label: primary.label,
    selection: primary.kbId
      ? { kind: 'kb', kbId: primary.kbId }
      : { kind: 'named', label: primary.label },
  };
  const options: ConfirmOption[] = [
    ...alternates.map((a) => ({
      id: `kb:${a.kbId}`,
      label: a.label,
      selection: { kind: 'kb', kbId: a.kbId } as const,
    })),
    ...unmatched.map((label) => ({
      id: `named:${label}`,
      label,
      selection: { kind: 'named', label } as const,
    })),
  ];

  const [selected, setSelected] = useState<string>(primaryOption.id);
  const [otherText, setOtherText] = useState('');
  const choosingOther = selected === 'other';
  const selection: ConfirmSelection = choosingOther
    ? { kind: 'typed', text: otherText }
    : ([primaryOption, ...options].find((o) => o.id === selected)?.selection ??
      primaryOption.selection);
  const target = resultFor(selection);

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

        <Pressable
          accessibilityRole="radio"
          accessibilityState={{
            selected: selected === primaryOption.id,
            checked: selected === primaryOption.id,
          }}
          accessibilityLabel={primary.label}
          onPress={() => setSelected(primaryOption.id)}
        >
          <Card
            className={[
              'gap-3 border',
              selected === primaryOption.id ? 'border-brand-primary' : 'border-line-default',
            ].join(' ')}
          >
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
        </Pressable>

        {/* Always offered: "Something else" is how a wrong identification is corrected. */}
        <Section title={t('confirm:alternatesTitle')}>
          <View accessibilityRole="radiogroup" className="gap-2">
            {[...options, { id: 'other', label: t('confirm:somethingElse') }].map((option) => {
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
      </ScrollScreen>

      <StickyFooter>
        <Button
          label={t(
            selected === primaryOption.id ? 'confirm:confirmCta' : 'confirm:confirmChoiceCta',
          )}
          size="large"
          disabled={!target}
          onPress={() => {
            if (target) router.push({ pathname: '/result', params: target });
          }}
        />
      </StickyFooter>
    </KeyboardAvoidingView>
  );
}
