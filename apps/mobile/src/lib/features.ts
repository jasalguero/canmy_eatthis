/**
 * Build-time feature flags (docs/02-tech-decisions.md D28).
 *
 * Read from `EXPO_PUBLIC_*` variables, which Expo inlines into the bundle when it is built. They
 * cannot change at runtime and nothing can switch them remotely: a feature that ships switched
 * off would be a hidden, dormant feature, which App Store guideline 2.3.1 forbids.
 *
 * Off unless set. A build that forgets to set one is the release app, never an app with a
 * half-finished photo path.
 *
 * Barcode scanning had a flag too until its lookup existed; it now ships in every build (D29).
 *
 * Each variable must be read as a literal `process.env.EXPO_PUBLIC_…` member access, or Expo
 * cannot inline it.
 */
export interface Features {
  /** Photo identification: the camera's photo mode, the library picker, the photo tray and AI
   *  consent. */
  photoId: boolean;
  /** Knowledge-base updates from the Worker (`lib/kbUpdate.ts`, docs/02 D38). On only when the
   *  build names both the Worker and the key its KB must be signed with. */
  kbUpdates: { apiUrl: string; publicKeyBase64: string } | null;
}

export function parseFlag(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

export function kbUpdateConfig(
  apiUrl: string | undefined,
  publicKeyBase64: string | undefined,
): Features['kbUpdates'] {
  return apiUrl?.startsWith('https://') && publicKeyBase64 ? { apiUrl, publicKeyBase64 } : null;
}

export const features: Features = {
  photoId: parseFlag(process.env.EXPO_PUBLIC_FEATURE_PHOTO_ID),
  kbUpdates: kbUpdateConfig(process.env.EXPO_PUBLIC_API_URL, process.env.EXPO_PUBLIC_KB_PUBLIC_KEY),
};
