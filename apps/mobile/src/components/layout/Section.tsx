import { View, type ViewProps } from 'react-native';

import { Text } from '@/components/primitives';

/**
 * A titled block of content. The title is an `accessibilityRole="header"` so screen-reader users
 * can jump between sections rather than swiping through every line of a long Result screen.
 */
export interface SectionProps extends ViewProps {
  title?: string;
  className?: string;
}

export function Section({ title, className, children, ...rest }: SectionProps) {
  return (
    <View className={['gap-2', className ?? ''].filter(Boolean).join(' ')} {...rest}>
      {title ? (
        <Text variant="label" tone="secondary" accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
