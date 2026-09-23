import { type BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/layout';
import { Button, IconButton, Text } from '@/components/primitives';
import { MAX_PHOTOS, useDraftStore } from '@/lib/draft';
import { processImage } from '@/lib/imagePipeline';
import { openAppSettings, permissionUiState } from '@/lib/permissions';
import { sizes } from '@/theme/tokens';

/**
 * The camera capture modal (docs/07 Phase 3), reached from `PhotoSourceSheet`. `mode=barcode`
 * switches it into barcode-scanning mode; the resulting value goes into the description field as
 * plain text for now — the actual Open Food Facts lookup is the Worker's job (docs/07 Phase 5,
 * H4), which does not exist yet. This screen's job in H3 is real capture, not identification.
 *
 * Permission handling covers all three states docs/07 Phase 3 asks for: granted, denied
 * (re-askable) and denied-permanently (Settings deep link) — and in every one of them, backing
 * out leaves text input fully usable, since `canCheck()` never required a photo.
 */
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

export default function CameraScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isBarcode = params.mode === 'barcode';
  const insets = useSafeAreaInsets();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);
  const [scanned, setScanned] = useState(false);

  const photos = useDraftStore((state) => state.photos);
  const addPhoto = useDraftStore((state) => state.addPhoto);
  const description = useDraftStore((state) => state.description);
  const setDescription = useDraftStore((state) => state.setDescription);

  const state = permission === null ? null : permissionUiState(permission);

  useEffect(() => {
    if (state === 'denied') void requestPermission();
  }, [state, requestPermission]);

  if (state === null) return null; // permission status not yet loaded — a blink, not a state.

  if (state !== 'granted') {
    return (
      <Screen className="justify-center gap-4 px-6">
        <Text variant="title" tone="primary" accessibilityRole="header">
          {t('camera:permissionDeniedTitle')}
        </Text>
        <Text variant="body" tone="secondary">
          {t(
            state === 'denied-permanently'
              ? 'camera:permissionDeniedPermanentlyBody'
              : 'camera:permissionDeniedBody',
          )}
        </Text>
        {state === 'denied-permanently' ? (
          <Button label={t('camera:openSettings')} onPress={openAppSettings} />
        ) : (
          <Button label={t('camera:permissionAskAgain')} onPress={() => requestPermission()} />
        )}
        <Button label={t('camera:typeInstead')} variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  async function handleCapture() {
    if (capturing) return;
    setCapturing(true);
    try {
      const shot = await cameraRef.current?.takePictureAsync({
        quality: 0.9,
        skipProcessing: true,
      });
      if (!shot) return;
      const processed = await processImage(shot.uri);
      addPhoto(processed.uri);
      if (photos.length + 1 >= MAX_PHOTOS) router.back();
    } finally {
      setCapturing(false);
    }
  }

  function handleBarcode(result: BarcodeScanningResult) {
    if (scanned) return;
    setScanned(true);
    setDescription(description ? `${description} ${result.data}` : result.data);
    router.back();
  }

  return (
    <View className="flex-1 bg-camera-chrome">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={isBarcode ? { barcodeTypes: [...BARCODE_TYPES] } : undefined}
        onBarcodeScanned={isBarcode ? handleBarcode : undefined}
      />

      {/*
        `paddingTop`/`paddingBottom` are explicit, not Tailwind `pt-*`/`pb-*` classes: this
        project's spacing scale is a custom 0–9 index (`tailwind.config.js`), so a class outside
        that range (`pt-14`, `pb-10`, …) silently generates no style at all — which is exactly
        what put these bars flush against the screen edges, under the status bar and home
        indicator, on a real device (a plain simulator/web check never caught it, since neither
        has a notch or a home-indicator inset to reveal the missing padding).
      */}
      <View
        style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}
        className="absolute inset-x-0 top-0 flex-row items-center justify-between gap-2 bg-camera-scrim px-2"
      >
        <IconButton
          glyph="✕"
          accessibilityLabel={t('camera:cancel')}
          onPress={() => router.back()}
          glyphClassName="text-camera-on-chrome"
        />
        <Text variant="label" className="text-camera-on-chrome">
          {t(isBarcode ? 'camera:titleBarcode' : 'camera:titlePhoto')}
        </Text>
        {!isBarcode ? (
          <Text variant="label" className="text-camera-on-chrome">
            {t('camera:counter', { count: photos.length, max: MAX_PHOTOS })}
          </Text>
        ) : (
          <View style={{ width: sizes.touchTarget }} />
        )}
      </View>

      <View
        style={{ paddingTop: 24, paddingBottom: insets.bottom + 16 }}
        className="absolute inset-x-0 bottom-0 items-center gap-4 bg-camera-scrim px-4"
      >
        {isBarcode ? (
          <Text variant="body" className="text-camera-on-chrome">
            {t('camera:barcodeHint')}
          </Text>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('camera:shutterA11y')}
              accessibilityState={{ disabled: capturing }}
              disabled={capturing}
              onPress={handleCapture}
              style={{
                width: sizes.shutterOuter,
                height: sizes.shutterOuter,
                borderRadius: sizes.shutterOuter / 2,
              }}
              className="items-center justify-center border-4 border-camera-on-chrome"
            >
              <View
                style={{
                  width: sizes.shutterInner,
                  height: sizes.shutterInner,
                  borderRadius: sizes.shutterInner / 2,
                }}
                className="bg-camera-on-chrome"
              />
            </Pressable>
            {photos.length > 0 ? (
              <Button label={t('camera:done')} variant="secondary" onPress={() => router.back()} />
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
