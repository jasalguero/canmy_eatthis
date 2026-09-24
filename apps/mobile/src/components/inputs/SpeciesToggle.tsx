import type { Species } from '@canmyeatthis/shared';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutAnimation,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  UIManager,
  View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Mascot } from '@/components/feedback';
import { Text } from '@/components/primitives';
import { useTheme } from '@/theme/ThemeProvider';
import { motion, radius, sizes, tokens } from '@/theme/tokens';

// Android needs this opted into explicitly, same as `Collapsible` — without it LayoutAnimation
// is a silent no-op there rather than an instant jump, which would look identical to before this
// change and defeat the point of adding it.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Signature interaction #1 (docs/06 §2): a sliding pill between Dog and Cat, with a light haptic
 * on change and a mascot face in each segment (docs/02-tech-decisions.md D25). It is the first
 * thing anyone touches, and the answer genuinely depends on it — the KB is authored per species
 * (AGENTS.md #8), so this is a safety control as much as a piece of chrome.
 *
 * **The slide is `LayoutAnimation`, not `react-native-reanimated` (docs/02 D25, following D23).**
 * D23 found that Reanimated's animated styles did not reliably reach a real device here, with no
 * error and no reproduction on web — the pill rendered with no colour and no position at all.
 * `LayoutAnimation` is a different mechanism (it wraps the next native prop commit in a platform
 * animation, rather than driving styles through Reanimated's own worklet/UI-thread pipeline),
 * and it is already proven working in this exact codebase (`Collapsible`'s expand/collapse
 * ships on it). Critically, it keeps D23's safety property: `pillOffset` below is still computed
 * directly from `value` on every render and applied as an ordinary style, so if the animation
 * request does nothing on some device, the pill still SNAPS to the correct position — the exact
 * pre-D25 behaviour — rather than rendering wrong or invisible. Requesting the animation is pure
 * upside; there is no new way for this control to fail.
 *
 * Still **implemented, not yet verified on a real device or simulator** — this environment has no
 * full Xcode install (only the command-line tools), so there is no way to confirm the slide is
 * visible rather than merely requested. Treat it the same way `docs/screenshots/README.md`
 * already treats haptics: correct in principle, pending a device pass.
 *
 * Implementation notes still worth keeping:
 *  - The pill moves via `insetInlineStart`, never `left`/`right` (docs/06 §2, CI-checked) —
 *    and never `transform: translateX` either, now: `LayoutAnimation` is documented and reliably
 *    cross-platform for changes to actual layout properties (`insetInlineStart`, `width`, …), not
 *    for a `transform` set outside layout, so the switch to `insetInlineStart` is what makes the
 *    animation request meaningful, not just present. The travel distance is measured from the
 *    track rather than expressed as a percentage — React Native resolves a percentage width on
 *    an absolutely positioned child against the parent's padding box, which does not line up
 *    with the padded halves the labels actually occupy, and the pill ends up overhanging by the
 *    padding. Measuring is a few lines and is exact.
 *  - The two options are `radio`s inside a `radiogroup`, which is what gives a screen reader the
 *    "1 of 2" context; a pair of buttons would not.
 *  - `useReducedMotion()` (docs/06 §1 Motion) skips the animation request, not the state change —
 *    the pill still moves, instantly, exactly as it did before D25.
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
  const reducedMotion = useReducedMotion();
  /** Width of one half of the track's content box — the pill's travel distance. */
  const [halfWidth, setHalfWidth] = useState(0);

  const onTrackLayout = useCallback((event: LayoutChangeEvent) => {
    // width minus the 4pt padding on each side, halved.
    setHalfWidth((event.nativeEvent.layout.width - TRACK_PADDING * 2) / 2);
  }, []);

  const select = useCallback(
    (species: Species) => {
      if (species === value) return;
      if (!reducedMotion) {
        LayoutAnimation.configureNext({
          duration: motion.durationBase,
          update: { type: LayoutAnimation.Types.spring, springDamping: 0.7 },
        });
      }
      // Light impact: a confirmation of a deliberate tap, not an alert.
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(species);
    },
    [value, onChange, reducedMotion],
  );

  const pillStart = TRACK_PADDING + (value === 'dog' ? 0 : halfWidth);

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
          insetInlineStart: pillStart,
          width: halfWidth,
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
            className="flex-1 flex-row items-center justify-center gap-2 rounded-full px-3"
          >
            <Mascot species={species} pose="head" size={sizes.mascotToggle} />
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
