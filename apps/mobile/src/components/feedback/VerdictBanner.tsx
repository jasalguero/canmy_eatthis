import type { Species, Verdict } from '@canmyeatthis/shared';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/primitives';
import { useTheme } from '@/theme/ThemeProvider';
import { tokens } from '@/theme/tokens';
import { VERDICT_CLASSES, VERDICT_GLYPH, verdictWordKey } from '@/theme/verdict';

/**
 * The app's signature moment (docs/06 §2.3): the full-bleed verdict colour, glyph and word.
 * Full-bleed to the top edge (docs/06 §4) — the screen that renders it opts out of the top
 * safe-area inset, so this component reserves it itself via `useSafeAreaInsets` rather than a
 * fixed `pt-*` class, which would sit under the status bar/notch on any device with one.
 *
 * Three things here are safety requirements rather than polish:
 *
 *  - **The verdict word is read first.** `announceForAccessibility` on reveal, and the word is
 *    the first element in the tree, so VoiceOver and TalkBack lead with the answer rather than
 *    with the item name (docs/06 §5).
 *  - **Colour is never the only signal.** The glyph and the word are both present at every size;
 *    in grayscale the four verdicts stay distinguishable by `✓ ! ⚠ ?` and by their wording.
 *  - **Nothing here is fixed-height.** Spanish runs 20–30% longer than English and the worst
 *    case for the whole app is `es` at 200% font scale landing on this banner (docs/06 §2) — the
 *    glyph and word sit on one row but that row wraps (`flex-wrap`) rather than being forced
 *    onto a single un-breakable line, and the item name below still wraps freely.
 *
 * **Not animated (docs/02-tech-decisions.md D23).** This originally washed in its colour and
 * sprang its glyph via `react-native-reanimated`. On a real device that pipeline did not reach
 * the native view at all — confirmed first in `SpeciesToggle` (same library, same symptom: an
 * on-device debug readout showed every computed value correct in JS, nothing applied on
 * screen), then confirmed here directly: the banner rendered with no colour at all. This is the
 * single highest-stakes colour in the app (AGENTS.md #2 — a verdict must never read as
 * ambiguous, let alone blank), so it gets a plain `View` and no animation library at all, the
 * same fix as `SpeciesToggle`. The reveal haptic (fired by the caller, `result.tsx`) and the
 * accessibility announcement below are unaffected — only the visual wash-in and glyph spring
 * are gone.
 */
export interface VerdictBannerProps {
  verdict: Verdict;
  /** The resolved item name, from the KB — already in the user's language. */
  itemName: string;
  species: Species;
  /** Optional pet name; falls back to "for dogs"/"for cats" when absent. */
  petName?: string | null;
  /** Skips the reveal announcement — used by the gallery, which renders every case at once. */
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
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const classes = VERDICT_CLASSES[verdict];

  const verdictWord = t(verdictWordKey(verdict));
  const subject = petName
    ? t('result:forPet', { petName })
    : t(species === 'dog' ? 'result:forSpecies_dog' : 'result:forSpecies_cat');

  useEffect(() => {
    if (still) return;
    // The verdict word, first and on its own — before the item name, before anything else.
    AccessibilityInfo.announceForAccessibility(
      t('result:a11yVerdictAnnouncement', { verdictWord, item: itemName, species }),
    );
  }, [still, t, verdictWord, itemName, species]);

  return (
    // `backgroundColor` explicit, from `tokens` — see the doc comment above (D23).
    // `paddingTop` adds the safe-area inset on top of the visual 24pt gap (the pre-inset value)
    // — this banner opts out of the screen's own top safe area (docs/06 §4: full-bleed), so it
    // has to reserve that space itself or it renders under the status bar/notch.
    <View
      style={{ backgroundColor: tokens[theme].verdict[verdict].bg, paddingTop: insets.top + 24 }}
      className="w-full px-5 pb-6"
    >
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
        <View className="flex-row flex-wrap items-center gap-2">
          <Text
            variant="display"
            className={classes.onBgText}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {VERDICT_GLYPH[verdict]}
          </Text>
          <Text variant="display" className={classes.onBgText}>
            {verdictWord}
          </Text>
        </View>
        <Text variant="title" className={classes.onBgText}>
          {itemName}
        </Text>
        <Text variant="body" className={`${classes.onBgText} opacity-80`}>
          {subject}
        </Text>
      </View>
    </View>
  );
}
