import type { ApiErrorCode } from '@canmyeatthis/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Text } from '@/components/primitives';

/**
 * One designed screen per error code (docs/06 §4), keyed off `ApiErrorCode` so a new code in
 * `packages/shared` is a type error here rather than a silently generic screen.
 *
 * Every error offers a route to offline text lookup, and every error offers the hotline list.
 * That is not a nicety: AGENTS.md #4 requires the emergency path to survive every failure mode,
 * and an error screen is exactly where an app usually drops it. `SPEND_CAP_EXCEEDED` is the case
 * this matters most for (docs/10 §3) — the vision path is refused, and what the user sees is an
 * honest message with the whole offline app still behind it, never a dead end.
 */
export type ErrorStateCode = ApiErrorCode | 'offline';

export interface ErrorStateProps {
  code: ErrorStateCode;
  onRetry?: () => void;
  onTypeInstead?: () => void;
  onHotlines?: () => void;
  className?: string;
}

export function ErrorState({
  code,
  onRetry,
  onTypeInstead,
  onHotlines,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <View
      className={['justify-center gap-3 p-6', className ?? ''].filter(Boolean).join(' ')}
      accessibilityLiveRegion="polite"
    >
      <Text variant="title" tone="primary" accessibilityRole="header">
        {t(`errors:${code}_title`)}
      </Text>
      <Text variant="body" tone="secondary">
        {t(`errors:${code}_body`)}
      </Text>
      <View className="mt-2 gap-2">
        {onRetry ? <Button label={t('errors:actionRetry')} onPress={onRetry} /> : null}
        {onTypeInstead ? (
          <Button
            label={t('errors:actionTypeInstead')}
            variant="secondary"
            onPress={onTypeInstead}
          />
        ) : null}
        {onHotlines ? (
          <Button label={t('errors:actionHotlines')} variant="quiet" onPress={onHotlines} />
        ) : null}
      </View>
    </View>
  );
}
