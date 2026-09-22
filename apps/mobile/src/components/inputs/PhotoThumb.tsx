import { useTranslation } from 'react-i18next';
import { Image } from 'react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/primitives';
import { sizes } from '@/theme/tokens';

/**
 * One 88×88 thumbnail with a remove affordance (docs/06 §4 Home).
 *
 * The remove control is its own `Pressable` with its own label rather than a long-press on the
 * thumb: a hidden gesture is not discoverable, and it is not reachable by switch control at all.
 * It is inset into the corner but keeps a 44pt target, which is why it overlaps the image.
 */
export interface PhotoThumbProps {
  uri: string;
  onRemove: () => void;
  onPress?: () => void;
  /** 1-based, for "Photo 2 of 4" in the accessibility label. */
  index: number;
  total: number;
}

export function PhotoThumb({ uri, onRemove, onPress, index, total }: PhotoThumbProps) {
  const { t } = useTranslation();
  const label = t('home:photoCount', { count: total });

  return (
    <View style={{ width: sizes.photoThumb, height: sizes.photoThumb }}>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={`${label} — ${index}/${total}`}
        onPress={onPress}
        className="h-full w-full overflow-hidden rounded-md bg-surface-sunken"
      >
        <Image source={{ uri }} resizeMode="cover" className="h-full w-full" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home:removePhoto')}
        onPress={onRemove}
        hitSlop={12}
        style={{ position: 'absolute', top: -6, insetInlineEnd: -6 }}
        className="h-7 w-7 items-center justify-center rounded-full bg-surface-overlay elevation-1"
      >
        <Text variant="label" tone="primary">
          ×
        </Text>
      </Pressable>
    </View>
  );
}
