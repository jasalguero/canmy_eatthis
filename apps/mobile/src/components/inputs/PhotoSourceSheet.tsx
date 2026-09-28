import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Sheet, Text } from '@/components/primitives';
import { sizes } from '@/theme/tokens';

/**
 * The `[+]` action sheet (docs/00-product-spec.md: "Tap [+] → action sheet: Camera / Library /
 * Scan barcode"). Replaces `PhotoTray`'s Phase 2 mock `onAdd`, which just appended a placeholder
 * URI — this is the real H3 entry point into the camera screen, the picker and barcode capture.
 */
export interface PhotoSourceSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectLibrary: () => void;
  onSelectBarcode: () => void;
}

export function PhotoSourceSheet({
  visible,
  onClose,
  onSelectCamera,
  onSelectLibrary,
  onSelectBarcode,
}: PhotoSourceSheetProps) {
  const { t } = useTranslation();

  const options: { label: string; onPress: () => void }[] = [
    { label: t('camera:sourceCamera'), onPress: onSelectCamera },
    { label: t('camera:sourceLibrary'), onPress: onSelectLibrary },
    { label: t('camera:sourceBarcode'), onPress: onSelectBarcode },
  ];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('camera:sourceSheetTitle')}
      closeLabel={t('camera:sourceSheetCloseA11y')}
    >
      <View className="gap-1 pb-2">
        {options.map((option) => (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            onPress={() => {
              onClose();
              option.onPress();
            }}
            style={{ minHeight: sizes.touchTarget }}
            className="justify-center rounded-md px-2 active:bg-surface-sunken"
          >
            <Text variant="body" tone="primary">
              {option.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('camera:sourceCancel')}
          onPress={onClose}
          style={{ minHeight: sizes.touchTarget }}
          className="mt-2 justify-center rounded-md px-2 active:bg-surface-sunken"
        >
          <Text variant="body" tone="secondary">
            {t('camera:sourceCancel')}
          </Text>
        </Pressable>
      </View>
    </Sheet>
  );
}
