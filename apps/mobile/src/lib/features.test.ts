import type { ExpoConfig } from 'expo/config';

import native from '../theme/native.json';
import { tokens } from '../theme/tokens';
import { parseFlag } from './features';

describe('parseFlag', () => {
  it('is on only for "1" or "true"', () => {
    expect(parseFlag('1')).toBe(true);
    expect(parseFlag('true')).toBe(true);
    for (const off of [undefined, '', '0', 'false', 'yes', 'TRUE']) {
      expect(parseFlag(off)).toBe(false);
    }
  });
});

/**
 * `app.config.ts` cannot import `features.ts` (Expo loads it without resolving TypeScript
 * modules), so it repeats the flag parsing. These tests keep the two in step, and pin what each
 * build declares to the stores.
 */
const ENV_KEY = 'EXPO_PUBLIC_FEATURE_PHOTO_ID';
const savedEnv = process.env[ENV_KEY];

function loadConfig(photoId?: string): ExpoConfig {
  process.env[ENV_KEY] = photoId ?? '';
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
    if (savedEnv === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = savedEnv;
  });

  it('defaults to the release build: camera for barcodes, no photo library', () => {
    const config = loadConfig();
    expect(config.extra?.features).toEqual({ photoId: false });
    expect(config.android?.blockedPermissions).not.toContain('android.permission.CAMERA');
    expect(config.android?.blockedPermissions).toContain('android.permission.READ_MEDIA_IMAGES');
    expect(cameraText(config)).toMatch(/barcode/i);
    expect(cameraText(config)).not.toMatch(/identify/i);
  });

  it('allows the photo library and says the camera also identifies, with photo ID on', () => {
    const config = loadConfig('true');
    expect(config.android?.blockedPermissions).not.toContain(
      'android.permission.READ_MEDIA_IMAGES',
    );
    expect(cameraText(config)).toMatch(/barcode/i);
    expect(cameraText(config)).toMatch(/identify/i);
  });

  it('never allows the microphone', () => {
    for (const env of [undefined, '1']) {
      expect(loadConfig(env).android?.blockedPermissions).toContain(
        'android.permission.RECORD_AUDIO',
      );
    }
  });
});

describe('native.json', () => {
  it('keeps the splash background equal to the light theme base surface', () => {
    expect(native.splashBackground).toBe(tokens.light.surface.base);
  });
});
