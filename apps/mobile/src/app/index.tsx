import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Mascot, Wordmark } from '@/components/feedback';
import {
  CheckButton,
  DescriptionInput,
  PhotoSourceSheet,
  PhotoTray,
  SpeciesToggle,
} from '@/components/inputs';
import { Screen, StickyFooter } from '@/components/layout';
import { HistoryIcon, IconButton, SettingsIcon, Text } from '@/components/primitives';
import { MAX_PHOTOS, useDraftStore } from '@/lib/draft';
import { processImage } from '@/lib/imagePipeline';
import { useTheme } from '@/theme/ThemeProvider';
import { tokens } from '@/theme/tokens';

/**
 * Home (docs/06 §4).
 *
 * The input is the persisted draft store (`lib/draft.ts`), not local state — that is what makes
 * it survive a backgrounding (docs/07 Phase 3). `[+]` opens `PhotoSourceSheet`; camera and
 * barcode capture happen on the `/camera` screen, the library picker runs in place (it is
 * already its own system modal, not a screen this app owns) — both paths end at
 * `processImage()` before a URI ever reaches the draft.
 *
 * The header is two rows (docs/02-tech-decisions.md D25): the `Wordmark` and the History/Settings
 * icons on the first, the big page title on the second. History moved from a text link ("Recent
 * checks") lower on the screen to a header icon to match the design — `home:openHistory`'s
 * existing string ("Recent checks") still works as the icon's accessibility label unchanged.
 * The page title is `variant="display"` (Lilita One), not `variant="title"` (Nunito) — this
 * screen predates Bold Ink and kept the size/font role its heading had before that decision;
 * the mascot beside it is a flex sibling with a fixed size, not absolutely positioned over the
 * text the way the design canvas draws it, so a long `es` translation at 200% font scale pushes
 * the mascot down as the title wraps instead of the mascot ever sitting on top of it.
 */
export default function Home() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const species = useDraftStore((state) => state.species);
  const setSpecies = useDraftStore((state) => state.setSpecies);
  const photos = useDraftStore((state) => state.photos);
  const addPhoto = useDraftStore((state) => state.addPhoto);
  const removePhoto = useDraftStore((state) => state.removePhoto);
  const description = useDraftStore((state) => state.description);
  const setDescription = useDraftStore((state) => state.setDescription);

  const [sourceSheetVisible, setSourceSheetVisible] = useState(false);

  async function pickFromLibrary() {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });
    if (result.canceled) return;
    for (const asset of result.assets) {
      const processed = await processImage(asset.uri);
      addPhoto(processed.uri);
    }
  }

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
              <Wordmark species={species} />
              <View className="flex-row gap-2">
                <IconButton
                  icon={<HistoryIcon color={tokens[theme].text.secondary} />}
                  accessibilityLabel={t('home:openHistory')}
                  onPress={() => router.push('/history')}
                />
                {/* A drawn `SettingsIcon`, not a `⚙` glyph: that character rendered as a solid
                    blue colour-emoji badge on a real iOS Simulator, not the ink-coloured icon
                    this design calls for — see `IconButton`'s doc comment. And an icon, not a
                    text button: a translated label here ("Ajustes", "Settings") has no fixed
                    width, and at `es` + 200% font scale its natural width once overflowed the
                    screen edge — the exact regression docs/06 §5's acceptance line exists to
                    catch. A fixed-size icon target can't regress this way in any language. */}
                <IconButton
                  icon={<SettingsIcon color={tokens[theme].text.secondary} />}
                  accessibilityLabel={t('home:openSettings')}
                  onPress={() => router.push('/settings')}
                />
              </View>
            </View>

            <View className="flex-row items-start justify-between gap-3">
              <Text
                variant="display"
                tone="primary"
                accessibilityRole="header"
                className="min-w-0 flex-1"
              >
                {t('home:title')}
              </Text>
              <Mascot species={species} pose="peek" size={130} />
            </View>

            <SpeciesToggle value={species} onChange={setSpecies} />

            <View className="gap-2">
              <Text variant="label" tone="secondary" accessibilityRole="header">
                {t('home:photosLabel')}
              </Text>
              <PhotoTray
                uris={photos}
                max={MAX_PHOTOS}
                onAdd={() => setSourceSheetVisible(true)}
                onRemove={removePhoto}
                onPressPhoto={(index) =>
                  router.push({ pathname: '/photo-preview', params: { index } })
                }
              />
            </View>

            <DescriptionInput value={description} onChangeText={setDescription} />
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

      <PhotoSourceSheet
        visible={sourceSheetVisible}
        onClose={() => setSourceSheetVisible(false)}
        onSelectCamera={() => router.push('/camera')}
        onSelectLibrary={() => void pickFromLibrary()}
        onSelectBarcode={() => router.push({ pathname: '/camera', params: { mode: 'barcode' } })}
      />
    </Screen>
  );
}
