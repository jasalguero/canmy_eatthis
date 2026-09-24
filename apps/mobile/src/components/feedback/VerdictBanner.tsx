import type { Species, Verdict } from '@canmyeatthis/shared';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/primitives';
import { useTheme } from '@/theme/ThemeProvider';
import { VERDICT_MASCOT_MOOD } from '@/theme/mascot';
import { hardShadow, radius, sizes, tokens, verdictBadge } from '@/theme/tokens';
import { VERDICT_CLASSES, VERDICT_GLYPH, verdictWordKey } from '@/theme/verdict';
import { Mascot } from './Mascot';

/**
 * The app's signature moment (docs/06 §2.3): the full-bleed verdict colour, glyph, word — and,
 * since docs/02-tech-decisions.md D25, the mascot in the mood the verdict maps to. Full-bleed to
 * the top edge (docs/06 §4) — the screen that renders it opts out of the top safe-area inset, so
 * this component reserves it itself via `useSafeAreaInsets` rather than a fixed `pt-*` class,
 * which would sit under the status bar/notch on any device with one.
 *
 * Three things here are safety requirements rather than polish:
 *
 *  - **The verdict word is read first.** `announceForAccessibility` on reveal, and the word is
 *    the first element in the tree, so VoiceOver and TalkBack lead with the answer rather than
 *    with the item name (docs/06 §5).
 *  - **Colour is never the only signal.** The glyph and the word are both present at every size;
 *    in grayscale the four verdicts stay distinguishable by `✓ ! ⚠ ?` and by their wording. The
 *    mascot's mood is a FOURTH signal in the same spirit (worried only ever backs `toxic`), never
 *    a substitute for the other three.
 *  - **Nothing here is fixed-height, and the badge can't clip the glyph.** Spanish runs 20–30%
 *    longer than English and the worst case for the whole app is `es` at 200% font scale landing
 *    on this banner (docs/06 §2). The glyph badge below is a MINIMUM size (`minWidth`/`minHeight`,
 *    not `width`/`height`), so a scaled-up glyph grows the badge into a pill rather than being
 *    clipped by a fixed circle — and the mascot sits beside the text column at a fixed size
 *    rather than absolutely positioned over it, so a long translation pushes it down as the row
 *    wraps, never sitting underneath it.
 *
 * **The background colour is a plain, unconditional `View` style (docs/02 D23), and this
 * component adds nothing that touches it.** D23 found that a `react-native-reanimated`-driven
 * wash-in did not reach a real device at all — the banner rendered with no colour, the single
 * highest-stakes failure this app can have (AGENTS.md #2). The badge and mascot below are pure
 * addition: static, decorative, and irrelevant to whether the banner itself renders correctly.
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
      <View className="flex-row flex-wrap items-start justify-between gap-3">
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
          className="min-w-0 flex-1 gap-2"
        >
          {/* The glyph's white "sticker" badge (docs/02 D25) — a minimum, not a fixed, size. */}
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              minWidth: sizes.verdictBadge,
              minHeight: sizes.verdictBadge,
              borderRadius: radius.full,
              borderWidth: 3,
              borderColor: verdictBadge.border,
              backgroundColor: verdictBadge.bg,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
              ...hardShadow[1][theme],
            }}
          >
            <Text variant="title" style={{ color: verdictBadge.ink }}>
              {VERDICT_GLYPH[verdict]}
            </Text>
          </View>
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
        {/* Decorative — the mood is a real signal (see doc comment) but never the only one, and
            the glyph/word above already carry it for assistive tech. */}
        <Mascot species={species} mood={VERDICT_MASCOT_MOOD[verdict]} size={sizes.mascotBanner} />
      </View>
    </View>
  );
}
