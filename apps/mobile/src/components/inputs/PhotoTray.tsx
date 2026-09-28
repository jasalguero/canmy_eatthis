import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { CameraIcon, Loop, Text } from '@/components/primitives';
import { useTheme } from '@/theme/ThemeProvider';
import { hardShadow, radius, sizes, tokens } from '@/theme/tokens';
import { PhotoThumb } from './PhotoThumb';

/**
 * The photo strip (docs/06 §4 Home). Empty state is a single dashed 3:2 tile; populated state is
 * a horizontal scroller of 88×88 thumbs with a trailing [+] tile.
 *
 * This component only takes URIs and reports intent (`onAdd`/`onRemove`/`onPressPhoto`) — Home
 * wires `onAdd` to `PhotoSourceSheet` (camera/library/barcode), so this stays unaware of capture.
 *
 * The empty state's camera badge (docs/02-tech-decisions.md D25) uses `brand.tint`, not a
 * species tint: this component has no `species` prop (it's also used from the `__dev__` gallery
 * with no species context), and threading one through for a purely decorative badge colour isn't
 * worth the API change.
 */
export interface PhotoTrayProps {
  uris: readonly string[];
  max: number;
  onAdd: () => void;
  onRemove: (index: number) => void;
  /** Opens the full-screen preview (docs/00-product-spec.md: "Tap a thumb → full screen, with Remove"). */
  onPressPhoto: (index: number) => void;
  className?: string;
}

export function PhotoTray({ uris, max, onAdd, onRemove, onPressPhoto, className }: PhotoTrayProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const atLimit = uris.length >= max;

  if (uris.length === 0) {
    const t_ = tokens[theme];
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home:addPhoto')}
        onPress={onAdd}
        className={[
          'aspect-[3/2] w-full items-center justify-center gap-3 rounded-md border-[3px] border-dashed border-line-default bg-surface-raised active:bg-surface-sunken',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* `.a-cam`: the badge breathes (docs/02 D26). */}
        <Loop kind="bob" pointerEvents="none">
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: radius.full,
              borderWidth: 3,
              borderColor: t_.border.strong,
              backgroundColor: t_.brand.tint,
              alignItems: 'center',
              justifyContent: 'center',
              ...hardShadow[1][theme],
            }}
          >
            <CameraIcon size={28} color={t_.text.primary} />
          </View>
        </Loop>
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
              onPress={() => onPressPhoto(i)}
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
