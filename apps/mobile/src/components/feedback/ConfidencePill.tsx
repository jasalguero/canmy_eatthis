import type { ConfidenceBand } from '@canmyeatthis/shared';
import { useTranslation } from 'react-i18next';

import { Pill } from '@/components/primitives';

/**
 * Renders `confidenceBand` as a word — "fairly sure", "not certain".
 *
 * **Never a percentage** (docs/06 §4). A number implies a calibration this system does not have:
 * the model's own confidence score is not a probability that the identification is correct, and
 * showing "87%" would invite a user to act on a precision that is not there. The component takes
 * a band, not a number, so there is nothing to round.
 *
 * It is deliberately neutral-coloured: verdict colours are never used for anything that is not a
 * verdict (docs/06 §1), and confidence in an *identification* is not a verdict about safety.
 */
export interface ConfidencePillProps {
  band: ConfidenceBand;
  className?: string;
}

export function ConfidencePill({ band, className }: ConfidencePillProps) {
  const { t } = useTranslation();
  return <Pill label={t(`confirm:confidence_${band}`)} className={className} />;
}
