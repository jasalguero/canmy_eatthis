import { blake3 } from '@noble/hashes/blake3';
import { bytesToHex } from '@noble/hashes/utils';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'react-native';

import { base64ToBytes } from '@/lib/base64';

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

/** docs/03: each image ≤ 400 KB as base64. Checked here so an oversized photo never costs a call. */
export const MAX_UPLOAD_BASE64 = 400 * 1024;

/** The re-encode qualities tried, in order, until a photo fits `MAX_UPLOAD_BASE64`. */
export const UPLOAD_QUALITIES = [JPEG_QUALITY, 0.6, 0.45] as const;

/**
 * A processed photo as `POST /v1/identify` takes it: base64 JPEG plus the BLAKE3 of its bytes
 * (docs/03; the Worker re-hashes and ignores ours, `services/api/src/images.ts`). Re-encodes the
 * already-processed file — still no EXIF — stepping the quality down if it is over the limit.
 * Returns `null` for a photo that cannot be made small enough.
 */
export async function encodeForUpload(uri: string): Promise<{ data: string; hash: string } | null> {
  for (const compress of UPLOAD_QUALITIES) {
    const rendered = await ImageManipulator.manipulate(uri).renderAsync();
    const saved = await rendered.saveAsync({ compress, format: SaveFormat.JPEG, base64: true });
    if (saved.base64 && saved.base64.length <= MAX_UPLOAD_BASE64) {
      return { data: saved.base64, hash: bytesToHex(blake3(base64ToBytes(saved.base64))) };
    }
  }
  return null;
}
