#!/usr/bin/env node
// Copies the built KB artefacts into apps/mobile as a committed asset snapshot (docs/02
// D21 — real OTA delivery is doc07 Phase 8, well past H3; until then the app bundles a static
// copy it re-syncs and commits whenever the KB changes). Run after `pnpm --filter kb build`.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_DIST = join(__dirname, '..', 'dist');
const MOBILE_ASSETS_KB = join(__dirname, '..', '..', '..', 'apps', 'mobile', 'assets', 'kb');

const FILES = ['kb.en.json', 'kb.es.json', 'kb.index.json'];

if (!existsSync(KB_DIST)) {
  console.error(`${KB_DIST} does not exist — run "pnpm --filter kb build" first.`);
  process.exit(1);
}

mkdirSync(MOBILE_ASSETS_KB, { recursive: true });

for (const file of FILES) {
  const from = join(KB_DIST, file);
  const to = join(MOBILE_ASSETS_KB, file);
  if (!existsSync(from)) {
    console.error(`missing build artefact: ${from}`);
    process.exit(1);
  }
  copyFileSync(from, to);
  console.log(`synced ${file} -> apps/mobile/assets/kb/`);
}
