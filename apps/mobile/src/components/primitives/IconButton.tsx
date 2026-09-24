import type { ReactNode } from 'react';
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
 *
 * Exactly one of `glyph`/`icon` is expected. `glyph` (plain punctuation — `×`, `✕`, `←`, `→`)
 * scales with the font size and every platform renders it as flat, monochrome text. `icon`
 * (docs/02-tech-decisions.md D25) is for anything that isn't safe as a Unicode character —
 * `⚙` (gear) was tried here and rendered as a solid blue colour-emoji badge on a real iOS
 * Simulator, not the ink-coloured glyph docs/06 calls for; see `./icons.tsx`.
 */
export interface IconButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  /** A text glyph — scales with the font size, unlike an icon font at a fixed pt size. */
  glyph?: string;
  /** A drawn icon (from `./icons.tsx`), for anything a Unicode glyph can't render safely. */
  icon?: ReactNode;
  accessibilityLabel: string;
  /** Tone of the glyph; omit when `className` provides the colour. Ignored when `icon` is set —
   *  an `icon`'s colour is a prop on the icon itself (see `./icons.tsx`). */
  className?: string;
  glyphClassName?: string;
}

export function IconButton({
  glyph,
  icon,
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
      {icon ?? (
        <Text variant="title" className={glyphClassName ?? 'text-ink-secondary'}>
          {glyph}
        </Text>
      )}
    </Pressable>
  );
}
