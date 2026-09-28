import type { ExpoConfig } from 'expo/config';

import native from '../theme/native.json';
import { tokens } from '../theme/tokens';
import { parseFlag, usesCamera } from './features';

describe('parseFlag', () => {
  it('is on only for "1" or "true"', () => {
    expect(parseFlag('1')).toBe(true);
    expect(parseFlag('true')).toBe(true);
    for (const off of [undefined, '', '0', 'false', 'yes', 'TRUE']) {
      expect(parseFlag(off)).toBe(false);
    }
  });
});

describe('usesCamera', () => {
  it('needs the camera for either feature, and not for a text-only build', () => {
    expect(usesCamera({ photoId: false, barcode: false })).toBe(false);
    expect(usesCamera({ photoId: true, barcode: false })).toBe(true);
    expect(usesCamera({ photoId: false, barcode: true })).toBe(true);
  });
});

/**
 * `app.config.ts` cannot import `features.ts` (Expo loads it without resolving TypeScript
 * modules), so it repeats the flag parsing. These tests keep the two in step, and pin what each
 * build declares to the stores.
 */
const ENV_KEYS = ['EXPO_PUBLIC_FEATURE_PHOTO_ID', 'EXPO_PUBLIC_FEATURE_BARCODE'] as const;
const savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function loadConfig(env: { photoId?: string; barcode?: string }): ExpoConfig {
  process.env.EXPO_PUBLIC_FEATURE_PHOTO_ID = env.photoId ?? '';
  process.env.EXPO_PUBLIC_FEATURE_BARCODE = env.barcode ?? '';
  let config: ExpoConfig | undefined;
  jest.isolateModules(() => {
    const build = require('../../app.config').default;
    config = build({ config: {} });
  });
  return config as ExpoConfig;
}

function cameraText(config: ExpoConfig): string {
  const plugin = config.plugins?.find((p) => Array.isArray(p) && p[0] === 'expo-camera');
  return (plugin as [string, { cameraPermission: string }])[1].cameraPermission;
}

describe('app.config.ts', () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  it('defaults to text-only: no camera or media permissions on Android', () => {
    const config = loadConfig({});
    expect(config.extra?.features).toEqual({ photoId: false, barcode: false });
    expect(config.android?.blockedPermissions).toEqual(
      expect.arrayContaining(['android.permission.CAMERA', 'android.permission.READ_MEDIA_IMAGES']),
    );
    expect(cameraText(config)).not.toMatch(/identify|barcode/i);
  });

  it('allows the camera for barcode scanning, and says that is what it is for', () => {
    const config = loadConfig({ barcode: '1' });
    expect(config.android?.blockedPermissions).not.toContain('android.permission.CAMERA');
    expect(config.android?.blockedPermissions).toContain('android.permission.READ_MEDIA_IMAGES');
    expect(cameraText(config)).toMatch(/barcode/i);
  });

  it('allows the camera and photo library for photo identification', () => {
    const config = loadConfig({ photoId: 'true' });
    expect(config.android?.blockedPermissions).not.toContain('android.permission.CAMERA');
    expect(config.android?.blockedPermissions).not.toContain(
      'android.permission.READ_MEDIA_IMAGES',
    );
    expect(cameraText(config)).toMatch(/identify/i);
  });

  it('never allows the microphone', () => {
    for (const env of [{}, { barcode: '1' }, { photoId: '1', barcode: '1' }]) {
      const config = loadConfig(env);
      expect(config.android?.blockedPermissions).toContain('android.permission.RECORD_AUDIO');
    }
  });
});

describe('native.json', () => {
  it('keeps the splash background equal to the light theme base surface', () => {
    expect(native.splashBackground).toBe(tokens.light.surface.base);
  });
});
