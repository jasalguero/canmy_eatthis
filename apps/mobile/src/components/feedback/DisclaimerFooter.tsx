import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/primitives';

/**
 * Always visible, never collapsed (docs/06 §4, docs/05 §1).
 *
 * The text comes from the `VerdictPayload` when there is one, so the disclaimer shown next to an
 * answer is the one that travelled with that answer rather than whatever the app happens to
 * bundle today; it falls back to the catalogue on screens with no payload.
 */
export interface DisclaimerFooterProps {
  /** `VerdictPayload.disclaimer`. Falls back to the catalogue string when absent. */
  text?: string;
  className?: string;
}

export function DisclaimerFooter({ text, className }: DisclaimerFooterProps) {
  const { t } = useTranslation();
  return (
    <View className={className}>
      <Text variant="caption" tone="tertiary" accessibilityLabel={t('legal:disclaimerA11yLabel')}>
        {text ?? t('legal:disclaimer')}
      </Text>
    </View>
  );
}
