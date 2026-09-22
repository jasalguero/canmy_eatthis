import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

/**
 * A loading placeholder with a gentle pulse.
 *
 * `useReducedMotion()` is honoured (docs/06 §1, §5): with the setting on, the block renders at a
 * steady opacity and no animation is started at all — not merely a shorter one. A skeleton that
 * keeps pulsing is exactly the kind of thing the setting exists to stop.
 */
export interface SkeletonProps {
  /** Height in points. Width comes from `className` (usually `w-full`). */
  height: number;
  className?: string;
}

export function Skeleton({ height, className }: SkeletonProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0.4);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withRepeat(
      withTiming(1, { duration: motion.durationSlow * 2 }),
      -1,
      true, // reverse: fade back down rather than snapping
    );
  }, [reducedMotion, progress]);

  const style = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      style={[{ height }, style]}
      className={['rounded-sm bg-surface-sunken', className ?? ''].filter(Boolean).join(' ')}
    />
  );
}
