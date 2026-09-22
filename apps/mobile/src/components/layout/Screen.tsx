import { View, type ViewProps } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

/**
 * The base screen container: `surface.base`, safe-area insets, nothing else.
 *
 * `edges` is a prop because the Result banner is full-bleed to the top edge (docs/06 §4) and
 * has to opt out of the top inset while keeping the bottom one.
 */
export interface ScreenProps extends ViewProps {
  className?: string;
  edges?: readonly Edge[];
}

export function Screen({ className, edges = ['top', 'bottom'], children, ...rest }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-surface-base">
      <View className={['flex-1', className ?? ''].filter(Boolean).join(' ')} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}
