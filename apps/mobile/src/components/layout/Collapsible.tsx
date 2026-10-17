import { useState } from 'react';
import { LayoutAnimation, Pressable, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { ChevronDownIcon, Text } from '@/components/primitives';
import { useTheme } from '@/theme/ThemeProvider';
import { sizes, tokens } from '@/theme/tokens';

/**
 * A disclosure section.
 *
 * `locked` renders the content permanently open with no control at all — not a disabled toggle.
 * docs/06 §4 requires "What to do now" on a toxic result to be "expanded and not collapsible",
 * and a disabled-looking control invites a tap that does nothing at the one moment the user is
 * least able to cope with that. Locked sections are a plain header plus content.
 *
 * The toggleable form is drawn as a bordered panel with a primary-ink title and a chevron in a
 * filled circle, so it reads as something to tap: a secondary-ink label and a small text `▾`
 * on the page background were easy to scroll past without noticing there was more inside.
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
  const { theme } = useTheme();

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
    <View
      className={[
        'rounded-md border-2 border-line-strong bg-surface-raised',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        onPress={toggle}
        style={{ minHeight: sizes.touchTarget }}
        className="flex-row items-center justify-between gap-3 px-3 py-2"
      >
        <Text variant="label" tone="primary" className="flex-1">
          {title}
        </Text>
        {/* Decorative: the expanded state is already on the Pressable for assistive tech. */}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
          className="h-8 w-8 items-center justify-center rounded-full bg-surface-sunken"
        >
          <ChevronDownIcon color={tokens[theme].text.primary} />
        </View>
      </Pressable>
      {open ? <View className="px-3 pb-3">{children}</View> : null}
    </View>
  );
}
