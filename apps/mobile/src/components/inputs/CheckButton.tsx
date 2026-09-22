import { useTranslation } from 'react-i18next';

import { Button } from '@/components/primitives';
import { type CheckInput, canCheck } from '@/lib/checkInput';

/**
 * The Home screen's primary action (docs/06 §4): full width, 56pt tall, radius `lg`, pinned to
 * the bottom safe area by the screen's sticky footer.
 *
 * It takes the raw input rather than a `disabled` boolean so that the enablement rule cannot be
 * re-implemented per screen — `canCheck()` is the single definition and is unit tested. The
 * disabled state shows *why* it is disabled, which docs/06 §4 asks for explicitly.
 */
export interface CheckButtonProps extends CheckInput {
  onPress: () => void;
  loading?: boolean;
  className?: string;
}

export function CheckButton({
  photoCount,
  description,
  onPress,
  loading = false,
  className,
}: CheckButtonProps) {
  const { t } = useTranslation();
  const enabled = canCheck({ photoCount, description });

  return (
    <Button
      label={t('home:check')}
      size="large"
      onPress={onPress}
      loading={loading}
      disabled={!enabled}
      disabledReason={t('home:checkDisabledReason')}
      className={className}
    />
  );
}
