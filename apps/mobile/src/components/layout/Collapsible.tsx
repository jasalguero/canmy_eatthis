import { useState } from 'react';
import { LayoutAnimation, Pressable, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Text } from '@/components/primitives';
import { sizes } from '@/theme/tokens';

/**
 * A disclosure section.
 *
 * `locked` renders the content permanently open with no control at all — not a disabled toggle.
 * docs/06 §4 requires "What to do now" on a toxic result to be "expanded and not collapsible",
 * and a disabled-looking control invites a tap that does nothing at the one moment the user is
 * least able to cope with that. Locked sections are a plain header plus content.
 */
export interface CollapsibleProps {
  title: string;
  /** Open on mount. Ignored when `locked` (which is always open). */
  defaultOpen?: boolean;
  /** Permanently open, with no toggle rendered. */
  locked?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Collapsible({
  title,
  defaultOpen = false,
  locked = false,
  children,
  className,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reducedMotion = useReducedMotion();

  if (locked) {
    return (
      <View className={['gap-2', className ?? ''].filter(Boolean).join(' ')}>
        <Text variant="label" tone="secondary" accessibilityRole="header">
          {title}
        </Text>
        {children}
      </View>
    );
  }

  const toggle = () => {
    if (!reducedMotion) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setOpen((v) => !v);
  };

  return (
    <View className={className}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        onPress={toggle}
        style={{ minHeight: sizes.touchTarget }}
        className="flex-row items-center justify-between gap-3 py-2"
      >
        <Text variant="label" tone="secondary" className="flex-1">
          {title}
        </Text>
        {/* Decorative: the expanded state is already on the Pressable for assistive tech. */}
        <Text
          variant="label"
          tone="tertiary"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {open ? '▴' : '▾'}
        </Text>
      </Pressable>
      {open ? <View className="pb-2">{children}</View> : null}
    </View>
  );
}
