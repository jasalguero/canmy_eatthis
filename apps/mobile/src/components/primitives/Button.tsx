import { ActivityIndicator, Pressable, type PressableProps, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { hardShadow, sizes } from '@/theme/tokens';
import { Text } from './Text';

/**
 * The one button. Variants are semantic, not visual, so a screen never picks a colour.
 *
 * `primary` fills with `brand.primary` and labels with `brand.onPrimary` — a token pair that
 * exists precisely because white on the dark theme's mint is 2.8:1 (docs/02 D18). The verdict
 * palette is deliberately absent here: a verdict-coloured button is `EmergencyCallButton`, and
 * verdict colours are never used for anything that is not a verdict (docs/06 §1).
 *
 * `primary`/`secondary` carry Bold Ink's thick ink outline and flat "sticker" shadow (docs/02
 * D25); `quiet` is a ghost/text button and stays bare, matching the design canvas.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';
export type ButtonSize = 'regular' | 'large';

const VARIANT_CONTAINER: Record<ButtonVariant, string> = {
  primary: 'bg-brand-primary border-[3px] border-line-strong active:bg-brand-press',
  secondary: 'bg-surface-raised border-[3px] border-line-strong active:bg-surface-sunken',
  quiet: 'bg-transparent active:bg-surface-sunken',
};

const VARIANT_LABEL: Record<ButtonVariant, string> = {
  primary: 'text-brand-on-primary',
  secondary: 'text-ink-primary',
  // `brand-link`, not `brand-primary`: this is a text colour, and `primary` is a fill-only
  // colour under Bold Ink (docs/02 D25) — see tokens.ts's doc comment on `brand.link`.
  quiet: 'text-brand-link',
};

/** Which variants get the hard "sticker" shadow (docs/02 D25) — `quiet` never does. */
const VARIANT_HAS_SHADOW: Record<ButtonVariant, boolean> = {
  primary: true,
  secondary: true,
  quiet: false,
};

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Rendered under a disabled button — docs/06 §4 requires the *reason*, not just a grey fill. */
  disabledReason?: string;
  className?: string;
}

export function Button({
  label,
  variant = 'primary',
  size = 'regular',
  loading = false,
  disabled = false,
  disabledReason,
  className,
  ...rest
}: ButtonProps) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;
  return (
    <View className={className}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        // minHeight, not height: the label must be free to wrap at 200% font scale rather than
        // being clipped to a fixed box (docs/06 §5).
        style={[
          { minHeight: size === 'large' ? sizes.checkButtonHeight : sizes.touchTarget },
          VARIANT_HAS_SHADOW[variant] ? hardShadow[1][theme] : undefined,
        ]}
        className={[
          'items-center justify-center rounded-lg px-5 py-3',
          VARIANT_CONTAINER[variant],
          isDisabled ? 'opacity-40' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        ) : (
          <Text variant="label" className={`text-center ${VARIANT_LABEL[variant]}`}>
            {label}
          </Text>
        )}
      </Pressable>
      {isDisabled && disabledReason ? (
        <Text variant="caption" tone="tertiary" className="mt-2 text-center">
          {disabledReason}
        </Text>
      ) : null}
    </View>
  );
}
