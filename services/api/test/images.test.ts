import { describe, expect, it } from 'vitest';
import { jpegDimensions } from '../src/images.js';
import { makeJpeg } from './helpers.js';

const decode = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

describe('jpegDimensions', () => {
  it('reads width and height from the SOF segment', () => {
    expect(jpegDimensions(decode(makeJpeg(1024, 768)))).toEqual({ width: 1024, height: 768 });
  });

  it('returns null for anything that is not a JPEG', () => {
    expect(jpegDimensions(new TextEncoder().encode('GIF89a'))).toBeNull();
    expect(jpegDimensions(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(jpegDimensions(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02]))).toBeNull();
  });
});
