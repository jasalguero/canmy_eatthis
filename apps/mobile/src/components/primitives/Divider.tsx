import { View } from 'react-native';

/**
 * A hairline rule. `border-b` rather than a fixed height so it stays one physical pixel on every
 * density, and `accessibilityElementsHidden` so it never becomes a screen-reader stop.
 */
export function Divider({ className }: { className?: string }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={['border-b border-line-subtle', className ?? ''].filter(Boolean).join(' ')}
    />
  );
}
