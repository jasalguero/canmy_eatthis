import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, View } from 'react-native';

import { Screen } from '@/components/layout';
import { Button, IconButton, Text } from '@/components/primitives';
import { useDraftStore } from '@/lib/draft';

/**
 * Full-screen photo preview (docs/00-product-spec.md: "Tap a thumb → full screen, with
 * Remove"). Reordering is a lighter-weight substitute for drag-and-drop: two buttons that move
 * the current photo one slot at a time, gesture-free and screen-reader reachable, which is what
 * "reordering" in docs/07 Phase 3 needs to mean given nothing here justifies a drag library.
 */
export default function PhotoPreview() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ index?: string }>();
  const [index, setIndex] = useState(() => Number(params.index ?? '0'));

  const photos = useDraftStore((state) => state.photos);
  const removePhoto = useDraftStore((state) => state.removePhoto);
  const movePhoto = useDraftStore((state) => state.movePhoto);

  const uri = photos[index];
  if (uri === undefined) {
    // The photo this screen was showing no longer exists (e.g. removed elsewhere) — back out
    // rather than render a broken preview.
    router.back();
    return null;
  }

  function move(direction: -1 | 1) {
    movePhoto(index, direction);
    setIndex(index + direction);
  }

  return (
    <Screen className="gap-4 px-4 py-4">
      <View className="flex-row items-center justify-between">
        <IconButton
          glyph="✕"
          accessibilityLabel={t('camera:cancel')}
          onPress={() => router.back()}
        />
        <Text variant="label" tone="secondary">
          {t('camera:previewTitle', { index: index + 1, total: photos.length })}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View className="flex-1 items-center justify-center overflow-hidden rounded-md bg-surface-sunken">
        <Image
          source={{ uri }}
          resizeMode="contain"
          className="h-full w-full"
          accessibilityIgnoresInvertColors
        />
      </View>

      <View className="flex-row items-center justify-center gap-6">
        <IconButton
          glyph="←"
          accessibilityLabel={t('camera:moveLeftA11y')}
          disabled={index === 0}
          onPress={() => move(-1)}
        />
        <Button
          label={t('home:removePhoto')}
          variant="secondary"
          onPress={() => {
            removePhoto(index);
            router.back();
          }}
        />
        <IconButton
          glyph="→"
          accessibilityLabel={t('camera:moveRightA11y')}
          disabled={index === photos.length - 1}
          onPress={() => move(1)}
        />
      </View>
    </Screen>
  );
}
