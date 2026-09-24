import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * A bar pinned below the scrolling content, inside the safe area.
 *
 * Bold Ink (docs/02-tech-decisions.md D25) draws this as the SAME background as the page
 * (`surface.base`), separated only by a thick ink rule — not a distinct raised white/dark slab.
 * That still holds the reason this component exists: content scrolling underneath stays legible,
 * and on the Result screen this is what sits under the emergency call button, so it must never be
 * ambiguous whether the button is part of the content or part of the chrome. The thick rule does
 * that job now instead of a background-colour change.
 */
export interface StickyFooterProps extends ViewProps {
  className?: string;
}

export function StickyFooter({ className, children, ...rest }: StickyFooterProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }}
      className={['border-t-[3px] border-line-strong bg-surface-base px-4 pt-3', className ?? '']
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </View>
  );
}
