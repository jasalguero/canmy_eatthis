import type { Species } from '@canmyeatthis/shared';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { easingFor, nativeDriver, useMotionEnabled } from '@/components/primitives';
import { useTheme } from '@/theme/ThemeProvider';
import { COIN_FLIP } from '@/theme/motion';
import { hardShadow, radius, tokens } from '@/theme/tokens';
import { Mascot } from './Mascot';

/**
 * The logo "coin" — the asterisk slot in CanMy*EatThis is your pet (the canvas's `.coin`). Dog on
 * one face, cat on the other; changing `species` flips it over (`.coin-in`'s 700ms overshoot
 * rotateY, docs/02 D26).
 *
 * Each face rotates on its own (front 0→180°, back −180→0°) rather than the pair sharing a
 * rotated parent, because iOS flattens a parent's 3D transform before its children's
 * `backfaceVisibility` is applied. The faces also cross-fade at the half-way point, so even a
 * platform that ignores `backfaceVisibility` never shows a mirrored or doubled face. Motion off:
 * the right face, instantly.
 */
export function MascotCoin({
  species,
  size,
  borderWidth = 2.5,
}: {
  species: Species;
  size: number;
  borderWidth?: number;
}) {
  const { theme } = useTheme();
  const t_ = tokens[theme];
  const enabled = useMotionEnabled();
  const target = species === 'cat' ? 1 : 0;
  const flip = useRef(new Animated.Value(target)).current;

  useEffect(() => {
    if (!enabled) {
      flip.setValue(target);
      return;
    }
    const animation = Animated.timing(flip, {
      toValue: target,
      duration: COIN_FLIP.duration,
      easing: easingFor(COIN_FLIP.easing),
      useNativeDriver: nativeDriver(),
    });
    animation.start(({ finished }) => {
      if (!finished) flip.setValue(target);
    });
    return () => animation.stop();
  }, [enabled, target, flip]);

  const face = (faceSpecies: Species, rotate: string[], opacity: number[]) => (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: radius.full,
          borderWidth,
          borderColor: t_.border.strong,
          backgroundColor: faceSpecies === 'cat' ? t_.brand.tintCat : t_.brand.tintDog,
          alignItems: 'center',
          justifyContent: 'flex-end',
          overflow: 'hidden',
          backfaceVisibility: 'hidden',
          opacity: flip.interpolate({
            inputRange: [0, 0.5, 0.5001, 1],
            outputRange: opacity,
            extrapolate: 'clamp',
          }),
          transform: [
            { perspective: size * 6 },
            { rotateY: flip.interpolate({ inputRange: [0, 1], outputRange: rotate }) },
          ],
        },
      ]}
    >
      <Mascot species={faceSpecies} pose="head" size={size * 1.05} />
    </Animated.View>
  );

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: radius.full, ...hardShadow[1][theme] }}
    >
      {face('dog', ['0deg', '180deg'], [1, 1, 0, 0])}
      {face('cat', ['-180deg', '0deg'], [0, 0, 1, 1])}
    </View>
  );
}
