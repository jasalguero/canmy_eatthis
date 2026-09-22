import { Pressable, type PressableProps } from 'react-native';

import { sizes } from '@/theme/tokens';
import { Text } from './Text';

/**
 * A glyph-only tap target. `accessibilityLabel` is required, not optional: a button whose only
 * content is a glyph is unusable with a screen reader without one, and making it a required prop
 * is the only way that stays true as screens are added.
 *
 * The 44×44 floor (docs/06 §5) is applied as a minimum, so the target still grows with the font
 * scale rather than staying fixed while its glyph outgrows it.
 */
export interface IconButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  /** A text glyph — scales with the font size, unlike an icon font at a fixed pt size. */
  glyph: string;
  accessibilityLabel: string;
  /** Tone of the glyph; omit when `className` provides the colour. */
  className?: string;
  glyphClassName?: string;
}

export function IconButton({
  glyph,
  accessibilityLabel,
  className,
  glyphClassName,
  disabled,
  ...rest
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      style={{ minWidth: sizes.touchTarget, minHeight: sizes.touchTarget }}
      className={[
        'items-center justify-center rounded-full active:bg-surface-sunken',
        disabled ? 'opacity-40' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <Text variant="title" className={glyphClassName ?? 'text-ink-secondary'}>
        {glyph}
      </Text>
    </Pressable>
  );
}
