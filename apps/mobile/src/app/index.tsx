import type { Species } from '@canmyeatthis/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { CheckButton, DescriptionInput, PhotoTray, SpeciesToggle } from '@/components/inputs';
import { Screen, StickyFooter } from '@/components/layout';
import { Button, Text } from '@/components/primitives';
import { MOCK_PHOTO_URI } from '@/mock/photos';

/**
 * Home (docs/06 §4).
 *
 * Phase 2: no network and no camera. "Add a photo" appends a placeholder URI so the populated
 * tray, the remove affordance and the photo limit are all reviewable; `expo-camera` and
 * `expo-image-picker` replace that one handler in H3 and nothing else on this screen changes.
 *
 * The Check button lives in a `StickyFooter` inside a `KeyboardAvoidingView` so it rises above
 * the keyboard (docs/06 §4) rather than being covered by it — which on a screen whose main input
 * is a multiline field is the difference between usable and not.
 */

/** docs/03 `IdentifyRequest.images`: at most four. */
const MAX_PHOTOS = 4;

export default function Home() {
  const { t } = useTranslation();
  const [species, setSpecies] = useState<Species>('dog');
  const [photos, setPhotos] = useState<string[]>([]);
  const [description, setDescription] = useState('');

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="flex-1"
        >
          <View className="gap-5 px-4 pb-6 pt-2">
            <View className="flex-row items-center justify-between gap-3">
              <Text variant="title" tone="primary" accessibilityRole="header" className="flex-1">
                {t('home:title')}
              </Text>
              <Button
                label={t('home:openSettings')}
                variant="quiet"
                onPress={() => router.push('/settings')}
              />
            </View>

            <SpeciesToggle value={species} onChange={setSpecies} />

            <View className="gap-2">
              <Text variant="label" tone="secondary" accessibilityRole="header">
                {t('home:photosLabel')}
              </Text>
              <PhotoTray
                uris={photos}
                max={MAX_PHOTOS}
                onAdd={() =>
                  setPhotos((current) =>
                    current.length >= MAX_PHOTOS
                      ? current
                      : [...current, `${MOCK_PHOTO_URI}#${current.length + 1}`],
                  )
                }
                onRemove={(index) => setPhotos((current) => current.filter((_, i) => i !== index))}
              />
            </View>

            <DescriptionInput value={description} onChangeText={setDescription} />

            <Button
              label={t('home:openHistory')}
              variant="quiet"
              onPress={() => router.push('/history')}
              className="self-start"
            />
          </View>
        </ScrollView>

        <StickyFooter>
          <CheckButton
            photoCount={photos.length}
            description={description}
            onPress={() =>
              router.push({
                pathname: '/identifying',
                params: { species, hasPhoto: photos.length > 0 ? '1' : '0' },
              })
            }
          />
        </StickyFooter>
      </KeyboardAvoidingView>
    </Screen>
  );
}
