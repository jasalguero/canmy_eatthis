import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import type { TypeRole } from '@/theme/tokens';

/**
 * The only text primitive. Every string on screen goes through this, so the type scale
 * (docs/06 §2) is the only way to size text and there are no ad-hoc font sizes to review.
 *
 * Font scaling is deliberately left on (RN's default) and never capped: docs/06 §5 requires the
 * app to stay usable at 200%, and a `maxFontSizeMultiplier` would quietly break that for the
 * users who need it most. That is also why no caller may set a fixed height on a text container.
 */

/** Semantic colour, not a raw token — `tone` keeps `text-ink-*` out of screen code. */
export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'inverse';

// The prop is `variant`, not `role`: React Native already has a `role` prop (the ARIA one), and
// shadowing it would mean a component could never set an accessibility role on its own text.
const VARIANT_CLASS: Record<TypeRole, string> = {
  display: 'text-display',
  title: 'text-title',
  headline: 'text-headline',
  body: 'text-body',
  label: 'text-label',
  caption: 'text-caption',
};

const TONE_CLASS: Record<TextTone, string> = {
  primary: 'text-ink-primary',
  secondary: 'text-ink-secondary',
  tertiary: 'text-ink-tertiary',
  inverse: 'text-ink-inverse',
};

export interface TextProps extends RNTextProps {
  variant?: TypeRole;
  /** Omit when a `className` supplies the colour (e.g. a verdict `fgText`). */
  tone?: TextTone;
  className?: string;
}

export function Text({ variant = 'body', tone, className, ...rest }: TextProps) {
  const classes = [VARIANT_CLASS[variant], tone ? TONE_CLASS[tone] : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return <RNText className={classes} {...rest} />;
}
