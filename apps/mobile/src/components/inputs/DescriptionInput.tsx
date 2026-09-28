import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';

import { Text } from '@/components/primitives';
import { features } from '@/lib/features';
import { useTheme } from '@/theme/ThemeProvider';
import { hardShadow, typography } from '@/theme/tokens';

/**
 * The free-text description (docs/06 §4 Home): min 3 lines, grows to 6, top-aligned, with a
 * character counter that only appears past 400.
 *
 * The min/max height are computed from the type scale's line height rather than hardcoded, so
 * the field still shows three lines at 200% font scale instead of clipping to a box sized for
 * 100% (docs/06 §5). This is the one place a "fixed height" would be most tempting and most wrong.
 *
 * The thick ink border and flat shadow are Bold Ink's input treatment (docs/02 D25) — the
 * focused-border colour swap to `brand.primary` is unchanged from before that, just thicker.
 */
export const DESCRIPTION_MAX_LENGTH = 500;
/** The counter is noise until the user is near the limit (docs/06 §4). */
const COUNTER_VISIBLE_FROM = 400;

export interface DescriptionInputProps {
  value: string;
  onChangeText: (text: string) => void;
  className?: string;
}

export function DescriptionInput({ value, onChangeText, className }: DescriptionInputProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  const lineHeight = typography.body.lineHeight;
  // "Or describe it" only makes sense beside photos (`lib/features.ts`, D28).
  const label = t(features.photoId ? 'home:descriptionLabel' : 'home:descriptionLabelTextOnly');

  return (
    <View className={['gap-2', className ?? ''].filter(Boolean).join(' ')}>
      <Text variant="label" tone="secondary" accessibilityRole="header">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        multiline
        textAlignVertical="top"
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={DESCRIPTION_MAX_LENGTH}
        placeholder={t('home:descriptionPlaceholder')}
        // Multiples of the body line height: 3 lines minimum, growing to 6, plus the padding.
        style={[
          { minHeight: lineHeight * 3 + 24, maxHeight: lineHeight * 6 + 24 },
          hardShadow[1][theme],
        ]}
        className={[
          'rounded-md border-[3px] bg-surface-raised p-3 text-body text-ink-primary',
          focused ? 'border-brand-primary' : 'border-line-strong',
        ].join(' ')}
      />
      {value.length >= COUNTER_VISIBLE_FROM ? (
        <Text variant="caption" tone="tertiary" className="text-end">
          {t('home:charCount', { count: value.length, max: DESCRIPTION_MAX_LENGTH })}
        </Text>
      ) : null}
    </View>
  );
}
