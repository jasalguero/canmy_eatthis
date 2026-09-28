/**
 * Build-time feature flags (docs/02-tech-decisions.md D28).
 *
 * Read from `EXPO_PUBLIC_*` variables, which Expo inlines into the bundle when it is built. They
 * cannot change at runtime and nothing can switch them remotely: a feature that ships switched
 * off would be a hidden, dormant feature, which App Store guideline 2.3.1 forbids.
 *
 * Both default to off. A build that forgets to set them is the text-only app, never an app with
 * a half-finished photo path.
 *
 * Each variable must be read as a literal `process.env.EXPO_PUBLIC_…` member access, or Expo
 * cannot inline it.
 */
export interface Features {
  /** Photo identification: the camera, the library picker, the photo tray and AI consent. */
  photoId: boolean;
  /** Barcode scanning: the camera in barcode mode, and the product lookup behind it. */
  barcode: boolean;
}

export function parseFlag(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

export const features: Features = {
  photoId: parseFlag(process.env.EXPO_PUBLIC_FEATURE_PHOTO_ID),
  barcode: parseFlag(process.env.EXPO_PUBLIC_FEATURE_BARCODE),
};

/** Whether the build needs the camera at all. */
export function usesCamera(f: Features = features): boolean {
  return f.photoId || f.barcode;
}
