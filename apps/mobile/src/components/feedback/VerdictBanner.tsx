import type { Species, Verdict } from '@canmyeatthis/shared';
import { type ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Enter,
  Loop,
  MotionStill,
  SparkleIcon,
  Text,
  useMotionEnabled,
} from '@/components/primitives';
import { useTheme } from '@/theme/ThemeProvider';
import { MASCOT_EYE_HIGHLIGHT, MASCOT_INK, VERDICT_MASCOT_MOOD } from '@/theme/mascot';
import { RESULT_STAGGER, VERDICT_MOTION } from '@/theme/motion';
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
 * addition: decorative, and irrelevant to whether the banner itself renders correctly.
 *
 * **Motion (docs/02 D26)** is the canvas's A4/A5 choreography, chosen per verdict by
 * `VERDICT_MOTION`: `safe` drops in with a bounce, pops its badge and rises its text; every other
 * verdict lands firmly (`dropFirm`, `thud`, a mascot that fades in and stays calm on `toxic`) and
 * shows its word from the first frame. It only ever moves the banner as a whole or the pieces
 * inside it — `Enter` guarantees each ends on its ordinary layout, and `still` / reduced motion
 * render the banner exactly as it was before any of this.
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

  const m = VERDICT_MOTION[verdict];
  const rise = (delay: number) => (m.stagger ? { kind: 'rise' as const, delay } : null);

  return (
    <MotionStill still={still}>
      {/* The drop moves the banner as a whole — its colour is never touched (D23, above). */}
      <Enter kind={m.banner} distance={sizes.bannerDropDistance}>
        {/* `backgroundColor` explicit, from `tokens` — see the doc comment above (D23).
            `paddingTop` adds the safe-area inset on top of the visual 24pt gap (the pre-inset
            value) — this banner opts out of the screen's own top safe area (docs/06 §4:
            full-bleed), so it has to reserve that space itself or it renders under the notch. */}
        <View
          style={{
            backgroundColor: tokens[theme].verdict[verdict].bg,
            paddingTop: insets.top + 24,
          }}
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
              <Enter kind={m.badge} delay={m.badgeDelay} style={{ alignSelf: 'flex-start' }}>
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
              </Enter>
              <MaybeRise enter={rise(RESULT_STAGGER.verdictWord)}>
                <Text variant="display" className={classes.onBgText}>
                  {verdictWord}
                </Text>
              </MaybeRise>
              <MaybeRise enter={rise(RESULT_STAGGER.itemName)}>
                <Text variant="title" className={classes.onBgText}>
                  {itemName}
                </Text>
              </MaybeRise>
              <MaybeRise enter={rise(RESULT_STAGGER.subject)}>
                <Text variant="body" className={`${classes.onBgText} opacity-80`}>
                  {subject}
                </Text>
              </MaybeRise>
            </View>
            {/* Decorative — the mood is a real signal (see doc comment) but never the only one,
                and the glyph/word above already carry it for assistive tech. */}
            <Enter kind={m.mascot} delay={m.mascotDelay}>
              <Mascot
                species={species}
                mood={VERDICT_MASCOT_MOOD[verdict]}
                size={sizes.mascotBanner}
                animated
                calm={!m.mascotIdle}
              />
              {m.sparkles ? <Sparkles size={sizes.mascotBanner} /> : null}
            </Enter>
          </View>
        </View>
      </Enter>
    </MotionStill>
  );
}

/** Wraps `children` in a staggered rise when `enter` is set; otherwise renders them as they are. */
function MaybeRise({
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

/**
 * The twinkling sparkles around the no-known-toxicity mascot (the canvas's A4 `.spark`s), placed
 * relative to the mascot box at the canvas's proportions. Motion-only: with motion off they are
 * not drawn at all, since a frozen sparkle is just clutter.
 */
const SPARKS = [
  { top: 0.03, start: -0.03, size: 0.125, delay: 200 },
  { top: 0.23, end: -0.02, size: 0.09, delay: 900 },
  { top: 0.55, start: -0.11, size: 0.08, delay: 1400 },
] as const;

function Sparkles({ size }: { size: number }) {
  if (!useMotionEnabled()) return null;
  return (
    <>
      {SPARKS.map((s) => (
        <Loop
          key={s.delay}
          kind="twinkle"
          delay={s.delay}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: s.top * size,
            ...('start' in s
              ? { insetInlineStart: s.start * size }
              : { insetInlineEnd: s.end * size }),
          }}
        >
          <SparkleIcon
            size={Math.max(12, s.size * size * 1.6)}
            color={MASCOT_EYE_HIGHLIGHT}
            outline={MASCOT_INK}
          />
        </Loop>
      ))}
    </>
  );
}
