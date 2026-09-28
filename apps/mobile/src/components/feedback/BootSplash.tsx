import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  Text as RNText,
  StyleSheet,
} from 'react-native';

import { Enter, nativeDriver } from '@/components/primitives';
import { useTheme } from '@/theme/ThemeProvider';
import { SPLASH } from '@/theme/motion';
import { sizes, tokens } from '@/theme/tokens';
import { MascotCoin } from './MascotCoin';

/**
 * The boot splash (docs/02-tech-decisions.md D26): the native splash hands over to this, the
 * Bold Ink logo coin pops in, flips from dog to cat, the app name rises under it, and the whole
 * thing fades off the already-mounted first screen.
 *
 * It is an overlay, not a gate, because this app is opened in a hurry:
 *
 *  - **Nothing waits for it.** The router, the first screen and every emergency path are mounted
 *    underneath from the first frame; this only covers them for `SPLASH.holdUntil +
 *    SPLASH.fadeOut` (under 1.6s, `motion.test.ts`), and a tap anywhere dismisses it at once.
 *  - **It is never shown to someone it would slow down.** The root layout doesn't render it at
 *    all under reduced motion, and it removes itself the moment a screen reader is found running
 *    — it is invisible to assistive tech, so it must not sit on top of what that user is
 *    actually navigating.
 *  - **It always goes away.** The fade's completion callback and a backstop timer both call
 *    `onDone`; whichever comes first wins.
 *
 * The background is `surface.base`, which in the light theme is the same cream the native splash
 * (`app.json`) draws, so the hand-off is seamless there.
 */
export function BootSplash({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const t_ = tokens[theme];
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog');
  const opacity = useRef(new Animated.Value(1)).current;
  const done = useRef(false);

  const finish = useRef(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }).current;

  const dismiss = useRef((after: number) => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: SPLASH.fadeOut,
      delay: after,
      useNativeDriver: nativeDriver(),
    }).start(({ finished }) => {
      // A fade interrupted by a tap is not the end — the tap's own fade is.
      if (finished) finish();
    });
  }).current;

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (on && !cancelled) finish();
    });
    const flip = setTimeout(() => setSpecies('cat'), SPLASH.flipAt);
    dismiss(SPLASH.holdUntil);
    const backstop = setTimeout(finish, SPLASH.holdUntil + SPLASH.fadeOut + 400);
    return () => {
      cancelled = true;
      clearTimeout(flip);
      clearTimeout(backstop);
    };
  }, [dismiss, finish]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { opacity, backgroundColor: t_.surface.base, zIndex: 10 }]}
    >
      <Pressable
        // Decorative and hidden from assistive tech (see above); a tap only skips ahead.
        accessible={false}
        onPress={() => {
          opacity.stopAnimation();
          dismiss(0);
        }}
        className="flex-1 items-center justify-center gap-6 px-6"
      >
        <Enter kind="pop" delay={SPLASH.coinDelay}>
          <MascotCoin species={species} size={sizes.splashCoin} borderWidth={4} />
        </Enter>
        <Enter kind="rise" delay={SPLASH.wordmarkDelay} style={{ alignSelf: 'stretch' }}>
          <RNText
            className="font-display text-center text-ink-primary"
            style={{
              fontSize: 44,
              lineHeight: 50,
              textShadowColor: t_.brand.primary,
              textShadowOffset: { width: 3, height: 4 },
              textShadowRadius: 0,
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.4}
          >
            {t('common:appName')}
          </RNText>
        </Enter>
      </Pressable>
    </Animated.View>
  );
}
