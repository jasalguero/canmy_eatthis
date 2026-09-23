import type { Species } from '@canmyeatthis/shared';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DisclaimerFooter,
  EmergencyCallButton,
  SourceCite,
  VerdictBanner,
} from '@/components/feedback';
import { Collapsible, Section, StickyFooter } from '@/components/layout';
import { Button, Text } from '@/components/primitives';
import { useDraftStore } from '@/lib/draft';
import { useSettingsStore } from '@/lib/settings';
import { buildRealVerdict, buildUnknownVerdict } from '@/lib/verdict';
import { MOCK_CASES, MOCK_HOTLINE, findMockCase, mockVerdict } from '@/mock/cases';
import type { MockLanguage } from '@/mock/kbEntries';
import { VERDICT_CLASSES } from '@/theme/verdict';

/**
 * Result (docs/06 §4) — the screen the whole app exists to show.
 *
 * Structure, in the order docs/06 §4 and docs/10 §4 require:
 *   banner (full-bleed, ignores the top safe area)
 *   → headline
 *   → SourceCite, above every collapsible section
 *   → "What to do now" (locked open on toxic)
 *   → collapsible signs / why / sources
 *   → disclaimer, never collapsed
 *   → report a wrong answer
 *
 * The source is placed above the fold and above every section deliberately: without a vet, the
 * claim this app can actually support is "this authority says X", not "X is true" (docs/10 §4).
 * Demoting it to a footnote would change what the app is claiming.
 *
 * On `severity: severe` a persistent banner appears and the call button is duplicated above the
 * fold, so the action is reachable without scrolling in the case where scrolling costs most.
 */

/** Which haptic fires on reveal (docs/06 §2.3). `unknown` gets none: it is not an alert. */
const REVEAL_HAPTIC = {
  safe: Haptics.NotificationFeedbackType.Success,
  caution: Haptics.NotificationFeedbackType.Warning,
  toxic: Haptics.NotificationFeedbackType.Error,
} as const;

export default function Result() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{
    case?: string;
    still?: string;
    kbId?: string;
    unknown?: string;
    species?: string;
    query?: string;
  }>();
  const language = useSettingsStore((state) => state.language);
  const resetDraft = useDraftStore((state) => state.reset);
  const reducedMotion = useReducedMotion();

  // `still` freezes the entrance animation and the haptic for the gallery and for screenshots.
  const still = params.still === '1';
  const species: Species = params.species === 'cat' ? 'cat' : 'dog';
  const disclaimer = t('legal:disclaimer');

  // H3: a real on-device resolution (exact or fuzzy match, or a genuine no-match) takes
  // priority over the mock cases, which stay in place for the `__dev__` gallery's fixed
  // scenarios (docs/07 Phase 2) — `resolveVerdict()` (AGENTS.md #5) is the same function either
  // way, called here against the bundled KB instead of the mock entries (`mock/cases.ts`).
  const payload = params.kbId
    ? buildRealVerdict({ kbId: params.kbId, species, language, disclaimer })
    : params.unknown === '1'
      ? buildUnknownVerdict({
          query: params.query ?? '',
          species,
          language,
          disclaimer,
          headline: t('result:unknownHeadline'),
          summary: t('result:unknownBody'),
        })
      : mockVerdict(
          findMockCase(params.case ?? '') ?? MOCK_CASES[0],
          language as MockLanguage,
          disclaimer,
        );

  const classes = VERDICT_CLASSES[payload.verdict];
  const isToxic = payload.verdict === 'toxic';
  const isSevere = payload.severity === 'severe';

  useEffect(() => {
    if (still || reducedMotion) return;
    const type = REVEAL_HAPTIC[payload.verdict as keyof typeof REVEAL_HAPTIC];
    if (type) void Haptics.notificationAsync(type);
  }, [still, reducedMotion, payload.verdict]);

  const signs = payload.signs.map((id) => t(`vocab:signs.${id}`));
  const actions = payload.emergencyActions.map((id) => t(`vocab:emergency_actions.${id}`));

  const onsetLine = payload.onsetHours
    ? payload.onsetHours.min === payload.onsetHours.max
      ? t('result:onsetRangeSingle', { min: payload.onsetHours.min })
      : t('result:onsetRange', {
          min: payload.onsetHours.min,
          max: payload.onsetHours.max,
        })
    : null;

  return (
    <>
      {/* `edges` omits `top`: the banner is full-bleed to the top edge (docs/06 §4). */}
      <SafeAreaView edges={['bottom']} className="flex-1 bg-surface-base">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
          <VerdictBanner
            verdict={payload.verdict}
            itemName={payload.displayName}
            species={payload.species}
            still={still}
          />

          {isSevere ? (
            <View accessibilityLiveRegion="assertive" className={`px-4 py-3 ${classes.surfaceBg}`}>
              <Text variant="headline" className={classes.fgText}>
                {t('result:severeBanner')}
              </Text>
            </View>
          ) : null}

          <View className="gap-5 px-4 pb-6 pt-5">
            <Text variant="headline" tone="primary">
              {payload.headline}
            </Text>

            {/* The app's actual claim, above every section (docs/10 §4). */}
            {payload.sources[0] ? (
              <SourceCite
                source={payload.sources[0]}
                itemName={payload.displayName}
                verdict={payload.verdict}
                species={payload.species}
              />
            ) : null}

            {/* Severe: the action is reachable without scrolling. */}
            {isSevere ? <EmergencyCallButton phoneNumber={MOCK_HOTLINE} /> : null}

            {isToxic ? (
              // Locked open, with no toggle at all — docs/06 §4.
              <Collapsible title={t('result:sectionWhatToDo')} locked>
                <View className={`gap-2 rounded-md p-3 ${classes.surfaceBg}`}>
                  {actions.map((action) => (
                    <Text key={action} variant="body" className={classes.fgText}>
                      {`• ${action}`}
                    </Text>
                  ))}
                </View>
              </Collapsible>
            ) : null}

            {payload.verdict === 'unknown' ? (
              <Text variant="body" tone="secondary">
                {t('result:unknownBody')}
              </Text>
            ) : null}

            <Collapsible title={t('result:sectionSigns')} defaultOpen={isToxic}>
              <View className="gap-1">
                {signs.length > 0 ? (
                  signs.map((sign) => (
                    <Text key={sign} variant="body" tone="secondary">
                      {`• ${sign}`}
                    </Text>
                  ))
                ) : (
                  <Text variant="body" tone="secondary">
                    {t('result:noSignsListed')}
                  </Text>
                )}
                {onsetLine ? (
                  <Text variant="body" tone="secondary" className="mt-2">
                    {onsetLine}
                  </Text>
                ) : null}
              </View>
            </Collapsible>

            <Collapsible title={t('result:sectionSummary')}>
              <Text variant="body" tone="secondary">
                {payload.summary}
              </Text>
            </Collapsible>

            <Collapsible title={t('result:sectionSources')}>
              <Section className="gap-3">
                {payload.sources.map((source) => (
                  <SourceCite
                    key={source.url}
                    source={source}
                    itemName={payload.displayName}
                    verdict={payload.verdict}
                    species={payload.species}
                  />
                ))}
                <Text variant="caption" tone="tertiary">
                  {t('result:kbVersion', { version: payload.kbVersion })}
                </Text>
              </Section>
            </Collapsible>

            {/* Always visible, never collapsed. */}
            <DisclaimerFooter text={payload.disclaimer} />

            <Button
              label={t('result:reportWrongAnswer')}
              variant="quiet"
              onPress={() => router.push('/settings')}
              className="self-start"
            />
            <Button
              label={t('result:checkSomethingElse')}
              variant="secondary"
              onPress={() => {
                resetDraft();
                router.dismissTo('/');
              }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Toxic: sticky, so it is the last focusable element however long the page is. */}
      {isToxic ? (
        <StickyFooter>
          <EmergencyCallButton phoneNumber={MOCK_HOTLINE} />
        </StickyFooter>
      ) : null}
    </>
  );
}
