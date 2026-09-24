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
//
// Each entry pairs a size class (`text-<role>`, from `fontSize` in tailwind.config.js) with a
// family class (`font-<role>`) — Bold Ink (docs/02 D25) gives every role its own font FILE
// (Lilita One for `display`, a specific Nunito weight otherwise), so the two always travel
// together and there is no separate `fontWeight` to set.
const VARIANT_CLASS: Record<TypeRole, string> = {
  display: 'text-display font-display',
  title: 'text-title font-title',
  headline: 'text-headline font-headline',
  body: 'text-body font-body',
  label: 'text-label font-label',
  caption: 'text-caption font-caption',
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
