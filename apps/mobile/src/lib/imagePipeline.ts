import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'react-native';

/**
 * docs/07 Phase 3: resize longest edge to 1024 px, JPEG quality 0.8, strip all EXIF. The resize
 * happens before the photo ever gets near the network (Phase 4) — this is what keeps a 12 MP photo
 * from a phone camera down to the couple-hundred-KB budget.
 */
export const MAX_EDGE = 1024;
export const JPEG_QUALITY = 0.8;

export interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * Pure — no native calls — so it is unit-testable without a device. Never upscales: an image
 * already at or under `maxEdge` on its longest side is returned unchanged, because "resize
 * longest edge to 1024px" is a ceiling, not a target.
 */
export function computeResizeDimensions(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

/**
 * Resizes to `computeResizeDimensions`'s target, re-encodes as JPEG at `JPEG_QUALITY`, and
 * saves to the cache directory. `expo-image-manipulator`'s render/save pipeline is *why* this
 * library does the job (docs/01-architecture.md) — re-encoding through it does not carry EXIF
 * (including GPS) forward, unlike a bare copy.
 */
export async function processImage(uri: string): Promise<ProcessedImage> {
  const original = await getImageSize(uri);
  const target = computeResizeDimensions(original.width, original.height);

  const context = ImageManipulator.manipulate(uri);
  const rendered = await context.resize(target).renderAsync();
  const saved = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });

  return { uri: saved.uri, width: saved.width, height: saved.height };
}
