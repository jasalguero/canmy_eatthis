import type { Species } from '@canmyeatthis/shared';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, Pressable, View } from 'react-native';

import { Text } from '@/components/primitives';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, sizes, tokens } from '@/theme/tokens';

/**
 * Signature interaction #1 (docs/06 §2): a sliding pill between Dog and Cat, with a light haptic
 * on change. It is the first thing anyone touches, and the answer genuinely depends on it — the
 * KB is authored per species (AGENTS.md #8), so this is a safety control as much as a piece of
 * chrome.
 *
 * **Not animated, on purpose (docs/02-tech-decisions.md D23).** This was originally a
 * `react-native-reanimated`-driven spring slide. On a real device (iPhone, Expo Go, SDK 57) the
 * pill rendered with no colour and no position update at all — confirmed, via an on-device debug
 * readout, that `useAnimatedStyle`'s computed values (`halfWidth`, the resolved brand colour)
 * were correct in JS the whole time; they just never reached the native view. No error, no
 * warning, nothing reproducible on web or in a unit test. Rather than keep guessing at a
 * Reanimated/Fabric interop issue with no device to debug it on, the pill's position and colour
 * are now driven by a plain `View` and ordinary React state — which cannot fail this way,
 * because it doesn't go through Reanimated's UI-thread pipeline at all. The cost is the slide is
 * an instant snap instead of a spring; the benefit is the control cannot render invisibly.
 *
 * Implementation notes still worth keeping:
 *  - The pill moves with `translateX`, never `left`/`right`: docs/06 §2 mandates logical layout
 *    properties and there is a CI grep for it. The travel distance is measured from the track
 *    rather than expressed as a percentage — React Native resolves a percentage width on an
 *    absolutely positioned child against the parent's padding box, which does not line up with
 *    the padded halves the labels actually occupy, and the pill ends up overhanging by the
 *    padding. Measuring is a few lines and is exact.
 *  - The two options are `radio`s inside a `radiogroup`, which is what gives a screen reader the
 *    "1 of 2" context; a pair of buttons would not.
 */
export interface SpeciesToggleProps {
  value: Species;
  onChange: (species: Species) => void;
  className?: string;
}

const OPTIONS: readonly Species[] = ['dog', 'cat'];

/** Matches the `p-1` on the track (4pt, docs/06 §1 spacing scale). */
const TRACK_PADDING = 4;

export function SpeciesToggle({ value, onChange, className }: SpeciesToggleProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  /** Width of one half of the track's content box — the pill's travel distance. */
  const [halfWidth, setHalfWidth] = useState(0);

  const onTrackLayout = useCallback((event: LayoutChangeEvent) => {
    // width minus the 4pt padding on each side, halved.
    setHalfWidth((event.nativeEvent.layout.width - TRACK_PADDING * 2) / 2);
  }, []);

  const select = useCallback(
    (species: Species) => {
      if (species === value) return;
      // Light impact: a confirmation of a deliberate tap, not an alert.
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(species);
    },
    [value, onChange],
  );

  const pillOffset = value === 'dog' ? 0 : halfWidth;

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('home:speciesA11yLabel')}
      accessibilityHint={t('home:speciesA11yHint')}
      onLayout={onTrackLayout}
      style={{ minHeight: sizes.speciesToggleHeight }}
      className={['flex-row rounded-full bg-surface-sunken p-1', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      {/* The pill, behind the labels. Decorative — state lives on the radios. */}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: 'absolute',
          top: TRACK_PADDING,
          bottom: TRACK_PADDING,
          insetInlineStart: TRACK_PADDING,
          width: halfWidth,
          transform: [{ translateX: pillOffset }],
          backgroundColor: tokens[theme].brand.primary,
          borderRadius: radius.full,
        }}
      />
      {OPTIONS.map((species) => {
        const selected = species === value;
        return (
          <Pressable
            key={species}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={t(`common:species_${species}`)}
            onPress={() => select(species)}
            style={{ minHeight: sizes.touchTarget - 8 }}
            className="flex-1 items-center justify-center rounded-full px-3"
          >
            <Text
              variant="label"
              className={selected ? 'text-brand-on-primary' : 'text-ink-secondary'}
            >
              {t(`common:species_${species}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
