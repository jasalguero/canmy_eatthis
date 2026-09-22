import { useTranslation } from 'react-i18next';
import { Linking, Pressable } from 'react-native';

import { Text } from '@/components/primitives';
import { sizes } from '@/theme/tokens';
import { VERDICT_CLASSES } from '@/theme/verdict';

/**
 * The emergency path. AGENTS.md #4: this must work offline, logged out, unpaid and over quota —
 * so it is a `tel:` link and nothing else. No network call, no session, no feature flag, no
 * state it could be wrong about. There is no code path here that can fail to render.
 *
 * Filled with `toxic.accent` (docs/06 §4) and labelled with `toxic.onAccent`, which is a token
 * because white on the dark theme's accent is 2.5:1 (docs/02 D18).
 *
 * Reachability: docs/06 §5 requires this to be within two moves of a toxic result for keyboard
 * and switch control. It is rendered in a sticky footer, so it is the last focusable element on
 * the screen regardless of how long the content above it is.
 */
export interface EmergencyCallButtonProps {
  /** A regional hotline number. The registry itself lands in H5 (docs/10 §7). */
  phoneNumber: string;
  className?: string;
}

export function EmergencyCallButton({ phoneNumber, className }: EmergencyCallButtonProps) {
  const { t } = useTranslation();
  const classes = VERDICT_CLASSES.toxic;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('result:emergencyCall')}
      accessibilityHint={t('result:emergencyCallA11yHint')}
      onPress={() => {
        void Linking.openURL(`tel:${phoneNumber}`);
      }}
      style={{ minHeight: sizes.checkButtonHeight }}
      className={[
        'items-center justify-center rounded-lg px-5 py-3',
        classes.accentFill,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Text variant="headline" className={`text-center ${classes.onAccentText}`}>
        {t('result:emergencyCall')}
      </Text>
    </Pressable>
  );
}
