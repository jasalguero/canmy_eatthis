import { View } from 'react-native';

import { Button, Text } from '@/components/primitives';

/**
 * A designed empty state (docs/06 §4: "Designed, not default"). Illustration-free on purpose —
 * a specific sentence and a specific action are more use than a picture.
 */
export interface EmptyStateProps {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ title, body, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <View
      className={['items-center justify-center gap-3 p-6', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <Text variant="title" tone="primary" accessibilityRole="header" className="text-center">
        {title}
      </Text>
      <Text variant="body" tone="secondary" className="text-center">
        {body}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="secondary" onPress={onAction} className="mt-2" />
      ) : null}
    </View>
  );
}
