import type { Species, Verdict } from '@canmyeatthis/shared';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/primitives';
import { sizes } from '@/theme/tokens';
import { VERDICT_CLASSES, VERDICT_GLYPH, verdictWordKey } from '@/theme/verdict';

/**
 * The compact form of a verdict — a history row, a saved check.
 *
 * It carries the same three signals as the banner (colour, glyph, word) because the rule holds
 * at every size: colour is never the only signal (docs/06 §1). A grayscale history list is still
 * readable, which a colour-only row would not be.
 *
 * The whole row is one accessibility node with a composed label, so a screen reader reads
 * "Dark chocolate, Toxic, dog" rather than stopping on three separate fragments.
 */
export interface VerdictCardProps {
  verdict: Verdict;
  itemName: string;
  species: Species;
  /** Secondary line — a date in history, the headline elsewhere. */
  detail?: string;
  onPress?: () => void;
  className?: string;
}

export function VerdictCard({
  verdict,
  itemName,
  species,
  detail,
  onPress,
  className,
}: VerdictCardProps) {
  const { t } = useTranslation();
  const classes = VERDICT_CLASSES[verdict];
  const verdictWord = t(verdictWordKey(verdict));

  const content = (
    <View className={`flex-row items-center gap-3 rounded-md p-3 ${classes.surfaceBg}`}>
      <Text
        variant="title"
        className={classes.fgText}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {VERDICT_GLYPH[verdict]}
      </Text>
      <View className="flex-1 gap-1">
        <Text variant="headline" className={classes.fgText}>
          {itemName}
        </Text>
        <Text variant="label" className={classes.fgText}>
          {verdictWord}
        </Text>
        {detail ? (
          <Text variant="caption" className={`${classes.fgText} opacity-80`}>
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const label = t('history:itemA11yLabel', { item: itemName, verdictWord, species });

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label} className={className}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ minHeight: sizes.touchTarget }}
      className={['active:opacity-80', className ?? ''].filter(Boolean).join(' ')}
    >
      {content}
    </Pressable>
  );
}
