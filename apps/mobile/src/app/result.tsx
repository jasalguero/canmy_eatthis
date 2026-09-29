import type { Species, VerdictPayload } from '@canmyeatthis/shared';
import * as Haptics from 'expo-haptics';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
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
import { Button, Enter, MotionStill, Text } from '@/components/primitives';
import { devResultPayload } from '@/lib/devPreview';
import { useDraftStore } from '@/lib/draft';
import { openEmergency } from '@/lib/emergency';
import { canReport, reportWrongAnswer } from '@/lib/report';
import { useSettingsStore } from '@/lib/settings';
import { buildRealVerdict, buildUnknownVerdict } from '@/lib/verdict';
import { RESULT_STAGGER, VERDICT_MOTION } from '@/theme/motion';
import { VERDICT_CLASSES } from '@/theme/verdict';

/**
 * Result (docs/06 §4) — the screen the whole app exists to show.
 *
 * Structure, in the order docs/06 §4 and docs/04-knowledge-base.md §2 require:
 *   banner (full-bleed, ignores the top safe area)
 *   → headline
 *   → SourceCite, above every collapsible section
 *   → "What to do now" (locked open on toxic)
 *   → collapsible signs / why / sources
 *   → disclaimer, never collapsed
 *   → report a wrong answer
 *
 * The source is placed above the fold and above every section deliberately: without a vet, the
 * claim this app can actually support is "this authority says X", not "X is true" (docs/04-knowledge-base.md §2).
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

export default function ResultRoute() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    case?: string;
    still?: string;
    kbId?: string;
    unknown?: string;
    species?: string;
    query?: string;
  }>();
  const language = useSettingsStore((state) => state.language);
  const species: Species = params.species === 'cat' ? 'cat' : 'dog';
  const disclaimer = t('legal:disclaimer');

  // A real on-device resolution (exact or fuzzy match, or a genuine no-match), both through
  // `resolveVerdict()` (AGENTS.md #5). `?case=` is the gallery's fixed scenarios, which only a
  // development build honours (`lib/devPreview.ts`); anything else has no answer to show.
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
      : devResultPayload(params.case ?? '', language, disclaimer);

  if (!payload) return <Redirect href="/" />;
  // `still` freezes the entrance animation and the haptic for the gallery and for screenshots.
  return <Result payload={payload} still={params.still === '1'} />;
}

function Result({ payload, still }: { payload: VerdictPayload; still: boolean }) {
  const { t, i18n } = useTranslation();
  const resetDraft = useDraftStore((state) => state.reset);
  const reducedMotion = useReducedMotion();

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

  // The canvas's A4 stagger: under a no-known-toxicity banner, the content rises in after it.
  // Every other verdict shows its content from the first frame (`VERDICT_MOTION`, docs/02 D26).
  const stagger = VERDICT_MOTION[payload.verdict].stagger;
  const rise = (index: number) =>
    stagger
      ? ({ kind: 'rise', delay: RESULT_STAGGER.firstCard + index * RESULT_STAGGER.step } as const)
      : null;

  const onsetLine = payload.onsetHours
    ? payload.onsetHours.min === payload.onsetHours.max
      ? t('result:onsetRangeSingle', { min: payload.onsetHours.min })
      : t('result:onsetRange', {
          min: payload.onsetHours.min,
          max: payload.onsetHours.max,
        })
    : null;

  return (
    <MotionStill still={still}>
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
            <Staggered enter={stagger ? { kind: 'rise', delay: RESULT_STAGGER.headline } : null}>
              <Text variant="headline" tone="primary">
                {payload.headline}
              </Text>
            </Staggered>

            {/* The app's actual claim, above every section (docs/04-knowledge-base.md §2). */}
            {payload.sources[0] ? (
              <Staggered enter={rise(0)}>
                <SourceCite
                  source={payload.sources[0]}
                  itemName={payload.displayName}
                  verdict={payload.verdict}
                  species={payload.species}
                />
              </Staggered>
            ) : null}

            {/* Severe: the action is reachable without scrolling. */}
            {isSevere ? <EmergencyCallButton onPress={openEmergency} /> : null}

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

            <Staggered enter={rise(1)}>
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
            </Staggered>

            <Staggered enter={rise(2)}>
              <Collapsible title={t('result:sectionSummary')}>
                <Text variant="body" tone="secondary">
                  {payload.summary}
                </Text>
              </Collapsible>
            </Staggered>

            <Staggered enter={rise(3)}>
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
            </Staggered>

            {/* Always visible, never collapsed. */}
            <DisclaimerFooter text={payload.disclaimer} />

            {canReport() ? (
              <Button
                label={t('result:reportWrongAnswer')}
                variant="quiet"
                onPress={() => reportWrongAnswer(t, payload)}
                className="self-start"
              />
            ) : null}
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
          <EmergencyCallButton onPress={openEmergency} />
        </StickyFooter>
      ) : null}
    </MotionStill>
  );
}

/** Rises `children` in when `enter` is set; renders them untouched otherwise. */
function Staggered({
  enter,
  children,
}: {
  enter: { kind: 'rise'; delay: number } | null;
  children: ReactNode;
}) {
  if (!enter) return <>{children}</>;
  return (
    <Enter kind={enter.kind} delay={enter.delay}>
      {children}
    </Enter>
  );
}
