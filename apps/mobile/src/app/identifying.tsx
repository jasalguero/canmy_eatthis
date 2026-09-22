import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AnimatedView } from '@/theme/animated';

import { Screen } from '@/components/layout';
import { Button, Text } from '@/components/primitives';
import { MOCK_PHOTO_URI } from '@/mock/photos';
import { motion } from '@/theme/tokens';
import { Image } from 'react-native';

/**
 * Signature interaction #2 (docs/06 §2): the scanning state.
 *
 * Not a spinner. The user's photo stays on screen with a diagonal shimmer sweeping over it and a
 * status line stepping through real stages, which makes a couple of seconds read as feedback
 * rather than as waiting.
 *
 * Two things are load-bearing rather than decorative:
 *  - The stage line is an `accessibilityLiveRegion`, so a screen-reader user gets the same
 *    progress information the shimmer conveys visually.
 *  - `useReducedMotion()` removes the shimmer entirely and leaves the stages, which is the part
 *    that actually carries the information.
 *
 * Phase 2 has no network, so the stages advance on a timer. H5 replaces the timer with the real
 * request lifecycle; the presentation does not change.
 */

const STAGE_KEYS = [
  'identify:stage_preparing',
  'identify:stage_uploading',
  'identify:stage_identifying',
  'identify:stage_matching',
] as const;

/** Long enough to read, short enough not to feel stuck. */
const STAGE_MS = 900;

export default function Identifying() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ species?: string; hasPhoto?: string }>();
  const hasPhoto = params.hasPhoto === '1';
  const reducedMotion = useReducedMotion();
  const [stage, setStage] = useState(0);

  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion || !hasPhoto) return;
    shimmer.value = withRepeat(
      withTiming(1, { duration: motion.durationSlow * 3, easing: Easing.linear }),
      -1,
      false,
    );
  }, [reducedMotion, hasPhoto, shimmer]);

  useEffect(() => {
    if (stage >= STAGE_KEYS.length - 1) return;
    const id = setTimeout(() => setStage((s) => s + 1), STAGE_MS);
    return () => clearTimeout(id);
  }, [stage]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.15 + shimmer.value * 0.25,
    transform: [{ translateY: -200 + shimmer.value * 400 }, { rotate: '-20deg' }],
  }));

  return (
    <Screen className="justify-between px-4 py-6">
      <View className="gap-6">
        <Text variant="title" tone="primary" accessibilityRole="header">
          {t(hasPhoto ? 'identify:title' : 'identify:titleTextOnly')}
        </Text>

        {hasPhoto ? (
          <View className="aspect-[3/2] w-full overflow-hidden rounded-md bg-surface-sunken">
            <Image
              source={{ uri: MOCK_PHOTO_URI }}
              resizeMode="cover"
              className="h-full w-full"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            {reducedMotion ? null : (
              <AnimatedView
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={shimmerStyle}
                className="absolute h-40 w-full bg-surface-raised"
              />
            )}
          </View>
        ) : null}

        <View
          accessibilityLiveRegion="polite"
          accessibilityLabel={t('identify:a11yBusy')}
          accessibilityRole="progressbar"
          accessibilityState={{ busy: true }}
          className="gap-2"
        >
          {STAGE_KEYS.map((key, i) => (
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
