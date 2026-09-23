import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { tokens } from '@/theme/tokens';

/**
 * A loading placeholder.
 *
 * **Not animated (docs/02-tech-decisions.md D23).** This used to pulse via
 * `react-native-reanimated`; that library's animated styles do not reliably reach a real device
 * (confirmed first in `SpeciesToggle`, then `VerdictBanner`), so this is a plain, static `View`
 * now — a static grey block is a fine skeleton, an invisible one is not.
 */
export interface SkeletonProps {
  /** Height in points. Width comes from `className` (usually `w-full`). */
  height: number;
  className?: string;
}

export function Skeleton({ height, className }: SkeletonProps) {
  const { theme } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      style={{ height, backgroundColor: tokens[theme].surface.sunken }}
      className={['rounded-sm', className ?? ''].filter(Boolean).join(' ')}
    />
  );
}
