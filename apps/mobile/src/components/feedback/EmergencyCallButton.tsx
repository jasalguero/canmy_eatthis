import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Loop, PhoneIcon, Text } from '@/components/primitives';
import { useTheme } from '@/theme/ThemeProvider';
import { hardShadow, sizes, tokens } from '@/theme/tokens';
import { VERDICT_CLASSES } from '@/theme/verdict';

/**
 * The emergency path. AGENTS.md #4: this must work offline, logged out, unpaid and over quota —
 * so it opens the bundled emergency screen (`app/emergency.tsx`) and nothing else. No network
 * call, no session, no feature flag, no state it could be wrong about. There is no code path here
 * that can fail to render.
 *
 * It opens a screen rather than dialling one number because docs/05 §3 wants the user's own vet
 * offered first, the region's poison lines with their fees stated, and an emergency-vet search —
 * and because a region may have no checked poison line at all, which a single `tel:` cannot say.
 *
 * Filled with `toxic.accent` (docs/06 §4) and labelled with `toxic.onAccent`, which is a token
 * because white on the dark theme's accent is 2.5:1 (docs/02 D18). The thick ink border and flat
 * shadow are Bold Ink's button treatment (docs/02 D25) — the colours and reachability guarantees
 * below are unchanged from before that.
 *
 * Reachability: docs/06 §5 requires this to be within two moves of a toxic result for keyboard
 * and switch control. It is rendered in a sticky footer, so it is the last focusable element on
 * the screen regardless of how long the content above it is.
 *
 * The handset icon rings (the canvas's A5 `.ring`, docs/02 D26) — a `Loop` around the icon only.
 * The button itself, its colour, label and `onPress` are never inside an animation, so nothing
 * about motion can change whether it renders or works (AGENTS.md #4); with reduced motion the
 * icon simply sits still.
 */
export interface EmergencyCallButtonProps {
  /** Opens the emergency screen — `openEmergency` from `lib/emergency.ts` everywhere but tests. */
  onPress: () => void;
  className?: string;
}

/** The canvas's `animation-delay: 1.2s` — the banner has landed before the phone starts. */
const RING_DELAY_MS = 1200;

export function EmergencyCallButton({ onPress, className }: EmergencyCallButtonProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const classes = VERDICT_CLASSES.toxic;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('result:emergencyCall')}
      accessibilityHint={t('result:emergencyCallA11yHint')}
      onPress={onPress}
      style={[{ minHeight: sizes.checkButtonHeight }, hardShadow[1][theme]]}
      className={[
        'items-center justify-center rounded-lg border-[3px] border-line-strong px-5 py-3',
        classes.accentFill,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <View className="flex-row items-center justify-center gap-3">
        <Loop kind="ring" delay={RING_DELAY_MS} origin="50% 60%" pointerEvents="none">
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <PhoneIcon size={26} color={tokens[theme].verdict.toxic.onAccent} />
          </View>
        </Loop>
        <Text variant="headline" className={`shrink text-center ${classes.onAccentText}`}>
          {t('result:emergencyCall')}
        </Text>
      </View>
    </Pressable>
  );
}
