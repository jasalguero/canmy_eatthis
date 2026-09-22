import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/primitives';
import { sizes } from '@/theme/tokens';
import { PhotoThumb } from './PhotoThumb';

/**
 * The photo strip (docs/06 §4 Home). Empty state is a single dashed 3:2 tile; populated state is
 * a horizontal scroller of 88×88 thumbs with a trailing [+] tile.
 *
 * Capture itself is Phase 3 — this component takes URIs and reports intent, so the screen above
 * it can be wired to `expo-camera` later without this changing.
 */
export interface PhotoTrayProps {
  uris: readonly string[];
  max: number;
  onAdd: () => void;
  onRemove: (index: number) => void;
  className?: string;
}

export function PhotoTray({ uris, max, onAdd, onRemove, className }: PhotoTrayProps) {
  const { t } = useTranslation();
  const atLimit = uris.length >= max;

  if (uris.length === 0) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home:addPhoto')}
        onPress={onAdd}
        className={[
          'aspect-[3/2] w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-line-default bg-surface-sunken active:bg-surface-base',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Text variant="title" tone="tertiary">
          ⊞
        </Text>
        <Text variant="label" tone="secondary">
          {t('home:addPhoto')}
        </Text>
      </Pressable>
    );
  }

  return (
    <View className={className}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row items-center gap-3 py-2">
          {uris.map((uri, i) => (
            <PhotoThumb
              key={uri}
              uri={uri}
              index={i + 1}
              total={uris.length}
              onRemove={() => onRemove(i)}
            />
          ))}
          {atLimit ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home:addAnotherPhoto')}
              onPress={onAdd}
              style={{ width: sizes.photoThumb, height: sizes.photoThumb }}
              className="items-center justify-center rounded-md border-2 border-dashed border-line-default active:bg-surface-sunken"
            >
              <Text variant="title" tone="tertiary">
                +
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
      {atLimit ? (
        <Text variant="caption" tone="tertiary">
          {t('home:photoLimitReached', { max })}
        </Text>
      ) : null}
    </View>
  );
}
