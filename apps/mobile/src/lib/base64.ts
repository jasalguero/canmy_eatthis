const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Standard base64, without relying on `atob`, which not every Hermes build exposes. */
export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.trim().replace(/=+$/, '');
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of clean) {
    const index = B64.indexOf(char);
    if (index < 0) throw new Error('invalid base64');
    value = (value << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}
