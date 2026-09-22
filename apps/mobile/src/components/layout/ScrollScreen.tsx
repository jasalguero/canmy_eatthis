import { ScrollView, type ScrollViewProps, View } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

/**
 * A scrolling screen.
 *
 * `contentContainerStyle: { flexGrow: 1 }` matters more than it looks: without it a short screen
 * cannot centre or push content to the bottom, and — the reason it is not optional here — at
 * 200% font scale a screen that fitted before now overflows, and `flexGrow` is what lets it
 * start scrolling instead of clipping (docs/06 §5).
 *
 * Padding goes on an inner `View` (`contentClassName`) rather than the content container:
 * React Native's `ScrollView` types have no `contentContainerClassName`, and a `View` that
 * inherits `flex-1` from the grown content container behaves identically.
 */
export interface ScrollScreenProps extends ScrollViewProps {
  className?: string;
  /** Classes for the inner content wrapper — this is where padding belongs. */
  contentClassName?: string;
  edges?: readonly Edge[];
}

export function ScrollScreen({
  className,
  contentClassName,
  edges = ['top', 'bottom'],
  children,
  ...rest
}: ScrollScreenProps) {
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-surface-base">
      <ScrollView
        className={['flex-1', className ?? ''].filter(Boolean).join(' ')}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        {...rest}
      >
        <View className={['flex-1', contentClassName ?? ''].filter(Boolean).join(' ')}>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
