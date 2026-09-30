import type { ConfigContext, ExpoConfig } from 'expo/config';

import native from './src/theme/native.json';

/**
 * Native app config. A `.ts` file rather than `app.json` so the permission texts and Android
 * permissions follow the build's feature flags (docs/02-tech-decisions.md D28).
 *
 * Every build links `expo-camera` and `expo-image-picker`, so every build carries both iOS
 * purpose strings: Apple rejects an upload whose binary references camera or photo-library APIs
 * without one. Each string describes only what that build actually does. Every build scans
 * barcodes (D29), so the camera is always in use; on Android, the photo-library permissions are
 * blocked in a build without photo identification.
 *
 * Expo loads this file without resolving other TypeScript modules, so the flag parsing below
 * mirrors `src/lib/features.ts` rather than importing it (`features.test.ts` keeps them equal),
 * and the splash colour comes from JSON under `src/theme/`.
 */
interface Features {
  photoId: boolean;
}

const parseFlag = (value: string | undefined) => value === '1' || value === 'true';

const flags: Features = {
  photoId: parseFlag(process.env.EXPO_PUBLIC_FEATURE_PHOTO_ID),
};

function cameraPermission(f: Features): string {
  if (f.photoId) {
    return 'CanMy*EatThis uses your camera to scan product barcodes and to identify what your pet might have eaten.';
  }
  return 'CanMy*EatThis uses your camera to scan product barcodes.';
}

function photosPermission(f: Features): string {
  if (f.photoId) {
    return 'CanMy*EatThis uses your photo library so you can add an existing photo of what your pet might have eaten.';
  }
  return 'CanMy*EatThis only uses your photo library if you choose to add a photo.';
}

const blockedPermissions = [
  ...(flags.photoId
    ? []
    : [
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ]),
  'android.permission.RECORD_AUDIO',
];

const splashBackground = native.splashBackground;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'CanMy*EatThis',
  slug: 'canmyeatthis',
  scheme: 'canmyeatthis',
  version: '0.0.1',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'app.canmyeatthis.mobile',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: splashBackground,
    },
    package: 'app.canmyeatthis.mobile',
    blockedPermissions,
  },
  plugins: [
    'expo-router',
    'expo-localization',
    // iOS 27 kills an app that has not adopted the scene lifecycle (D32). No-op from SDK 58.
    ['expo-build-properties', { ios: { enableSceneSupport: true } }],
    [
      'expo-splash-screen',
      { image: './assets/splash.png', resizeMode: 'contain', backgroundColor: splashBackground },
    ],
    ['expo-camera', { cameraPermission: cameraPermission(flags), recordAudioAndroid: false }],
    [
      'expo-image-picker',
      {
        photosPermission: photosPermission(flags),
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    features: flags,
    eas: {
      projectId: 'REPLACE_WITH_EAS_PROJECT_ID',
    },
  },
});
