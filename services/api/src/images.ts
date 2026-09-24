import type { ImageInput } from '@canmyeatthis/shared';
import { ApiFailure } from './errors.js';

/** docs/03 §identify constraints, enforced here and mirrored by the app's image pipeline. */
export const MAX_IMAGE_BASE64_CHARS = 400 * 1024;
export const MAX_IMAGE_EDGE_PX = 1024;
export const MAX_REQUEST_BYTES = 2 * 1024 * 1024;

export interface ValidatedImage {
  data: string;
  /** SHA-256 of the decoded bytes, computed *here*. */
  hash: string;
}

/**
 * Validates every image and hashes it server-side. The client's `hash` field is ignored on
 * purpose: the hash is part of the shared response cache key, so trusting it would let one client
 * upload photo A labelled with the hash of photo B and have every later user who sends B served
 * the answer for A. Hashing ~400 KB costs well under a millisecond.
 */
export async function validateImages(images: readonly ImageInput[]): Promise<ValidatedImage[]> {
  return Promise.all(
    images.map(async (image, index) => {
      if (image.data.length > MAX_IMAGE_BASE64_CHARS) {
        throw new ApiFailure('INVALID_REQUEST', `images[${index}] exceeds 400 KB base64`);
      }
      let bytes: Uint8Array;
      try {
        bytes = Uint8Array.from(atob(image.data), (ch) => ch.charCodeAt(0));
      } catch {
        throw new ApiFailure('INVALID_REQUEST', `images[${index}] is not valid base64`);
      }
      const size = jpegDimensions(bytes);
      if (!size) {
        throw new ApiFailure('INVALID_REQUEST', `images[${index}] is not a readable JPEG`);
      }
      if (Math.max(size.width, size.height) > MAX_IMAGE_EDGE_PX) {
        throw new ApiFailure('INVALID_REQUEST', `images[${index}] longest edge exceeds 1024 px`);
      }
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return { data: image.data, hash: toHex(new Uint8Array(digest)) };
    }),
  );
}

/**
 * Reads width/height from a JPEG's start-of-frame segment. `null` for anything that is not a
 * well-formed JPEG up to its SOF — which is all this needs to know to refuse it.
 */
export function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1] ?? 0;
    // Fill bytes and standalone markers carry no length.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
    if (length < 2) return null;
    // SOF0–SOF15, excluding DHT (C4), JPG (C8) and DAC (CC).
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) {
      if (offset + 9 > bytes.length) return null;
      const height = ((bytes[offset + 5] ?? 0) << 8) | (bytes[offset + 6] ?? 0);
      const width = ((bytes[offset + 7] ?? 0) << 8) | (bytes[offset + 8] ?? 0);
      return width > 0 && height > 0 ? { width, height } : null;
    }
    if (marker === 0xda || marker === 0xd9) return null; // scan/end reached with no SOF
    offset += 2 + length;
  }
  return null;
}

export function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
