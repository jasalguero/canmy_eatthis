import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, View } from 'react-native';

import { Screen } from '@/components/layout';
import { Button, Text } from '@/components/primitives';
import { useDraftStore } from '@/lib/draft';
import { resolveOffline } from '@/lib/offlineKb';
import { MOCK_PHOTO_URI } from '@/mock/photos';

/**
 * Signature interaction #2 (docs/06 §2): the scanning state.
 *
 * Not a spinner. The user's photo stays on screen with a status line stepping through real
 * stages, which makes a couple of seconds read as feedback rather than as waiting.
 *
 * The stage line is an `accessibilityLiveRegion`, so a screen-reader user gets the same progress
 * information a sighted user gets from the stage list — that text list is what carries the
 * information. There used to also be a shimmer sweeping over the photo; it is gone
 * (docs/02-tech-decisions.md D23) — the `react-native-reanimated`-driven animation did not
 * reliably render on a real device, the same failure found in `SpeciesToggle`/`VerdictBanner`,
 * and it was purely decorative, so it is removed rather than fixed.
 *
 * The stages still advance on a fixed timer — for a typed query the real, synchronous on-device
 * resolution (H3) finishes well under `STAGE_MS`, so the timer is what keeps the moment readable
 * rather than a flash. The photo path still has no network call to time against (H4); H5
 * replaces its timer with the real request lifecycle, and the presentation does not change.
 */

/**
 * The stages differ by input, and not only for polish.
 *
 * A typed check never sends anything: it resolves against the bundled knowledge base, on device
 * and offline (H3). Showing "Preparing your photo" and "Sending it for identification" for a
 * text lookup would be telling the user their data left the device when it did not — which, in
 * an app whose privacy position is "we collect nothing" (docs/10 §5), is the one thing the
 * loading copy must not get wrong.
 */
const PHOTO_STAGE_KEYS = [
  'identify:stage_preparing',
  'identify:stage_uploading',
  'identify:stage_identifying',
  'identify:stage_matching',
] as const;

const TEXT_STAGE_KEYS = ['identify:stage_reading', 'identify:stage_matching'] as const;

/** Long enough to read, short enough not to feel stuck. */
const STAGE_MS = 900;

export default function Identifying() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ species?: string; hasPhoto?: string }>();
  const hasPhoto = params.hasPhoto === '1';
  const [stage, setStage] = useState(0);
  const stageKeys = hasPhoto ? PHOTO_STAGE_KEYS : TEXT_STAGE_KEYS;
  const description = useDraftStore((state) => state.description);
  const draftPhotos = useDraftStore((state) => state.photos);
  const previewUri = draftPhotos[0] ?? MOCK_PHOTO_URI;

  useEffect(() => {
    if (stage < stageKeys.length - 1) {
      const id = setTimeout(() => setStage((s) => s + 1), STAGE_MS);
      return () => clearTimeout(id);
    }

    // Last stage: hand off, rather than sitting on a finished progress list forever.
    //
    // A photo-derived identification always goes through Confirm — real photo *identification*
    // needs a vision model that doesn't exist until H4, so this still hands off to Confirm's
    // mock candidates (AGENTS.md #1: the model produces candidates, never verdicts, so this was
    // always going through a confirmation step regardless).
    //
    // Typed input is real as of H3: `resolveOffline` runs the on-device exact/alias/fuzzy
    // resolver from `packages/shared` (AGENTS.md #5) against the bundled KB. An exact match
    // skips Confirm — nothing to confirm when the user typed the exact name — a fuzzy match
    // goes to Confirm with that one real candidate, and no match is a real `unknown`, not a mock.
    const id = setTimeout(() => {
      if (hasPhoto) {
        router.replace('/confirm');
        return;
      }
      const resolution = resolveOffline(description);
      if (resolution.type === 'exact' && resolution.kbId) {
        router.replace({
          pathname: '/result',
          params: { kbId: resolution.kbId, species: params.species ?? 'dog' },
        });
      } else if (resolution.type === 'fuzzy' && resolution.kbId) {
        router.replace({
          pathname: '/confirm',
          params: { kbId: resolution.kbId, species: params.species ?? 'dog' },
        });
      } else {
        router.replace({
          pathname: '/result',
          params: { unknown: '1', species: params.species ?? 'dog', query: description },
        });
      }
    }, STAGE_MS);
    return () => clearTimeout(id);
  }, [stage, hasPhoto, stageKeys.length, description, params.species]);

  return (
    <Screen className="justify-between px-4 py-6">
      <View className="gap-6">
        <Text variant="title" tone="primary" accessibilityRole="header">
          {t(hasPhoto ? 'identify:title' : 'identify:titleTextOnly')}
        </Text>

        {hasPhoto ? (
          <View className="aspect-[3/2] w-full overflow-hidden rounded-md bg-surface-sunken">
            <Image
              source={{ uri: previewUri }}
              resizeMode="cover"
              className="h-full w-full"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </View>
        ) : null}

        <View
          accessibilityLiveRegion="polite"
          accessibilityLabel={t('identify:a11yBusy')}
          accessibilityRole="progressbar"
          accessibilityState={{ busy: true }}
          className="gap-2"
        >
          {stageKeys.map((key, i) => (
            <Text
              key={key}
              variant="body"
              tone={i === stage ? 'primary' : 'tertiary'}
              className={i > stage ? 'opacity-40' : ''}
            >
              {t(key)}
            </Text>
          ))}
        </View>
      </View>

      <Button label={t('identify:cancel')} variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
