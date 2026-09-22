import type { Species, Verdict } from '@canmyeatthis/shared';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/primitives';
import { motion } from '@/theme/tokens';
import { VERDICT_CLASSES, VERDICT_GLYPH, verdictWordKey } from '@/theme/verdict';

/**
 * The app's signature moment (docs/06 §2.3): the banner colour washes in from the top, the glyph
 * springs in, and a haptic fires. Full-bleed to the top edge (docs/06 §4) — the screen that
 * renders it opts out of the top safe-area inset.
 *
 * Three things here are safety requirements rather than polish:
 *
 *  - **The verdict word is read first.** `announceForAccessibility` on reveal, and the word is
 *    the first element in the tree, so VoiceOver and TalkBack lead with the answer rather than
 *    with the item name (docs/06 §5).
 *  - **Colour is never the only signal.** The glyph and the word are both present at every size;
 *    in grayscale the four verdicts stay distinguishable by `✓ ! ⚠ ?` and by their wording.
 *  - **Nothing here is fixed-height.** Spanish runs 20–30% longer than English and the worst
 *    case for the whole app is `es` at 200% font scale landing on this banner (docs/06 §2), so
 *    the glyph is text that scales with everything else and the word wraps freely.
 *
 * The haptic is fired by the caller (`onReveal`), not here: `expo-haptics` is a side effect and
 * a component that renders in a gallery twice over should not buzz the phone twice.
 */
export interface VerdictBannerProps {
  verdict: Verdict;
  /** The resolved item name, from the KB — already in the user's language. */
  itemName: string;
  species: Species;
  /** Optional pet name; falls back to "for dogs"/"for cats" when absent. */
  petName?: string | null;
  /** Skips the entrance animation and the announcement — used by the gallery. */
  still?: boolean;
}

export function VerdictBanner({
  verdict,
  itemName,
  species,
  petName,
  still = false,
}: VerdictBannerProps) {
  const { t } = useTranslation();
  const classes = VERDICT_CLASSES[verdict];
  const reducedMotion = useReducedMotion();
  const animate = !still && !reducedMotion;

  const wash = useSharedValue(animate ? 0 : 1);
  const glyphScale = useSharedValue(animate ? 0.6 : 1);

  const verdictWord = t(verdictWordKey(verdict));
  const subject = petName
    ? t('result:forPet', { petName })
    : t(species === 'dog' ? 'result:forSpecies_dog' : 'result:forSpecies_cat');

  useEffect(() => {
    if (animate) {
      wash.value = withTiming(1, { duration: motion.durationSlow });
      glyphScale.value = withSpring(1, motion.spring);
    }
    if (still) return;
    // The verdict word, first and on its own — before the item name, before anything else.
    AccessibilityInfo.announceForAccessibility(
      t('result:a11yVerdictAnnouncement', { verdictWord, item: itemName, species }),
    );
  }, [animate, still, wash, glyphScale, t, verdictWord, itemName, species]);

  const washStyle = useAnimatedStyle(() => ({ opacity: wash.value }));
  const glyphStyle = useAnimatedStyle(() => ({ transform: [{ scale: glyphScale.value }] }));

  return (
    <Animated.View style={washStyle} className={`w-full px-5 pb-6 pt-5 ${classes.bannerBg}`}>
      <View
        // One accessibility node, read in one breath, verdict word first.
        accessible
        accessibilityRole="header"
        accessibilityLiveRegion="assertive"
        accessibilityLabel={t('result:a11yVerdictAnnouncement', {
          verdictWord,
          item: itemName,
          species,
        })}
        className="gap-1"
      >
        <Animated.View style={glyphStyle} className="self-start">
          <Text
            variant="display"
            className={classes.onBgText}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {VERDICT_GLYPH[verdict]}
          </Text>
        </Animated.View>
        <Text variant="display" className={classes.onBgText}>
          {verdictWord}
        </Text>
        <Text variant="title" className={classes.onBgText}>
          {itemName}
        </Text>
        <Text variant="body" className={`${classes.onBgText} opacity-80`}>
          {subject}
        </Text>
      </View>
    </Animated.View>
  );
}
