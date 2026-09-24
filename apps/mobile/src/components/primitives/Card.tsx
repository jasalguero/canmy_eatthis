import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { hardShadow } from '@/theme/tokens';

/**
 * A raised container. Bold Ink (docs/02-tech-decisions.md D25) draws it as a thick ink outline
 * with a flat offset "sticker" shadow, not a soft blurred one — `hardShadow` in `tokens.ts`,
 * applied as an inline style because `shadowColor` isn't something a CSS variable can carry on
 * native. `flat` (on-`surface.sunken` lists, where a shadow would be noise) keeps a plain
 * thin border and drops the shadow.
 */
export interface CardProps extends ViewProps {
  className?: string;
  /** Flat cards sit on `surface.sunken` lists where a shadow would be noise. */
  flat?: boolean;
}

export function Card({ className, flat = false, style, ...rest }: CardProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[flat ? undefined : hardShadow[1][theme], style]}
      className={[
        'rounded-md bg-surface-raised p-4',
        flat ? 'border border-line-subtle' : 'border-[3px] border-line-strong',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}
