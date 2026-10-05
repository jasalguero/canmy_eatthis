#!/usr/bin/env node
/**
 * Generates the app icon files in apps/mobile/assets/ from the mascot's own artwork
 * (apps/mobile/src/components/feedback/Mascot.tsx, `dogLayers`) so the icon and the app match.
 *
 *   assets/icon.png           1024 x 1024, opaque (App Store forbids transparency/alpha)
 *   assets/adaptive-icon.png  1024 x 1024, transparent, dog kept inside Android's 66% safe zone;
 *                             its background colour is set in app.config.ts (`ICON_BACKGROUND`)
 *
 * Run: node scripts/make-icon.mjs
 * It rasterises with `sharp`, which Expo's tooling already pulls in (it is not a direct dependency,
 * so pnpm does not hoist it: the script finds it in the store).
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const store = join(root, 'node_modules/.pnpm');
const sharpDir = readdirSync(store).find((d) => d.startsWith('sharp@'));
if (!sharpDir) throw new Error('sharp is not installed (run pnpm install)');
const sharp = createRequire(join(store, sharpDir, 'node_modules/'))('sharp');

const INK = '#22170F';
const FUR = '#F4B76B';
const PATCH = '#E39A52';
const MUZZLE = '#FFF6E6';
const BLUSH = '#FF8F80';
const BACKGROUND = '#3E9BFF'; // brand.primary (the toon blue)

// The dog's head, ears, eyes, muzzle and nose: copied from `dogLayers`/`Face` (idle mood).
const dog = `
  <path d="M58 54 C38 50 24 70 26 96 C28 118 40 128 52 122 C62 116 64 96 66 76 C67 64 66 57 58 54 Z" fill="${PATCH}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M142 54 C162 50 176 70 174 96 C172 118 160 128 148 122 C138 116 136 96 134 76 C133 64 134 57 142 54 Z" fill="${PATCH}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M100 36 C136 36 158 58 158 90 C158 122 134 142 100 142 C66 142 42 122 42 90 C42 58 64 36 100 36 Z" fill="${FUR}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M114 60 C134 54 148 70 144 88 C140 102 120 100 113 86 C109 77 108 64 114 60 Z" fill="${PATCH}"/>
  <ellipse cx="64" cy="108" rx="9" ry="5" fill="${BLUSH}" opacity="0.55"/>
  <ellipse cx="136" cy="108" rx="9" ry="5" fill="${BLUSH}" opacity="0.55"/>
  <path d="M68 64 Q78 58 87 63" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  <path d="M113 63 Q122 58 132 64" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="78" cy="84" rx="9.5" ry="11.5" fill="${INK}"/>
  <ellipse cx="122" cy="84" rx="9.5" ry="11.5" fill="${INK}"/>
  <circle cx="81" cy="79.5" r="3.6" fill="#FFFFFF"/>
  <circle cx="125" cy="79.5" r="3.6" fill="#FFFFFF"/>
  <ellipse cx="100" cy="114" rx="30" ry="21" fill="${MUZZLE}" stroke="${INK}" stroke-width="4"/>
  <path d="M100 110 V117 M86 117 Q93 125 100 117 Q107 125 114 117" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M88 101 C88 94 112 94 112 101 C112 107 104 111 100 111 C96 111 88 107 88 101 Z" fill="${INK}"/>
  <ellipse cx="95" cy="99" rx="4" ry="2.2" fill="#FFFFFF" opacity="0.85"/>`;

// Bold Ink's hard shadow: the same shapes, flat ink, offset down and right. Open strokes (fill none)
// stay open so the eyebrows and mouth do not turn into blobs.
const shadow = dog
  .replace(/fill="(?!none)[^"]*"/g, `fill="${INK}"`)
  .replace(/stroke="[^"]*"/g, `stroke="${INK}"`)
  .replace(/opacity="[^"]*"/g, '');

// The head spans roughly x 24..176, y 36..142; its centre is about (100, 89).
const svg = (scale, withBackground) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${withBackground ? `<rect width="1024" height="1024" fill="${BACKGROUND}"/>` : ''}
  <g transform="translate(512 520) scale(${scale}) translate(-100 -89)">
    <g transform="translate(5 5)">${shadow}</g>
    ${dog}
  </g>
</svg>`;

async function render(svgText, file, flatten) {
  let image = sharp(Buffer.from(svgText), { density: 72 }).resize(1024, 1024);
  if (flatten) image = image.flatten({ background: BACKGROUND }).removeAlpha();
  const buf = await image.png().toBuffer();
  writeFileSync(join(root, 'apps/mobile/assets', file), buf);
  console.log(`wrote ${file} (${buf.length} bytes)`);
}
// Icon: the dog fills ~76% of the width. Adaptive: ~52%, inside the 66% safe zone with margin.
await render(svg(5.1, true), 'icon.png', true);
await render(svg(3.4, false), 'adaptive-icon.png', false);
