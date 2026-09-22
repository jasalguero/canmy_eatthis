import { View } from 'react-native';

import { Text } from './Text';

/**
 * A small rounded label. Neutral by default; `className`/`labelClassName` let a verdict-aware
 * caller (ConfidencePill, severity chip) supply tokens from `theme/verdict.ts` without this
 * primitive knowing anything about verdicts.
 */
export interface PillProps {
  label: string;
  className?: string;
  labelClassName?: string;
  /** Screen-reader text when the visual label is an abbreviation or needs context. */
  accessibilityLabel?: string;
}

export function Pill({ label, className, labelClassName, accessibilityLabel }: PillProps) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      className={['self-start rounded-full bg-surface-sunken px-3 py-1', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <Text variant="label" className={labelClassName ?? 'text-ink-secondary'}>
        {label}
      </Text>
    </View>
  );
}
