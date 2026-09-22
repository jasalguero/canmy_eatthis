import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * A bar pinned below the scrolling content, inside the safe area.
 *
 * It carries its own top border and `surface.raised` fill so that content scrolling underneath
 * stays legible — on the Result screen this is what sits under the emergency call button, and it
 * must never be ambiguous whether the button is part of the content or part of the chrome.
 */
export interface StickyFooterProps extends ViewProps {
  className?: string;
}

export function StickyFooter({ className, children, ...rest }: StickyFooterProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }}
      className={['border-t border-line-subtle bg-surface-raised px-4 pt-3', className ?? '']
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </View>
  );
}
