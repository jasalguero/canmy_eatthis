import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';

/**
 * A bottom sheet. Built on `Modal` so it inherits the platform's focus trapping and its
 * back-button handling on Android, which a hand-rolled absolutely-positioned overlay does not.
 *
 * The scrim is a `Pressable` with an explicit accessibility label rather than a bare `View`:
 * tap-outside-to-close is invisible to a screen reader otherwise, leaving no way out of the
 * sheet except the platform gesture.
 */
export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Label for the scrim's implicit "close" action — must come from `t()`. */
  closeLabel: string;
  children: React.ReactNode;
}

export function Sheet({ visible, onClose, title, closeLabel, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
          className="flex-1 bg-surface-overlay opacity-60"
        />
        <View
          accessibilityViewIsModal
          style={{ paddingBottom: insets.bottom + 16 }}
          className="rounded-t-lg bg-surface-overlay px-5 pt-4 elevation-2"
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="mb-4 h-1 w-12 self-center rounded-full bg-line-default"
          />
          <Text variant="title" tone="primary" accessibilityRole="header" className="mb-3">
            {title}
          </Text>
          {children}
        </View>
      </View>
    </Modal>
  );
}
