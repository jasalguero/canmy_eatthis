#!/usr/bin/env node
// Copies the built KB artefacts into every consumer that ships a committed snapshot instead of
// fetching one OTA (docs/02-tech-decisions.md D21, extended in H4 to cover services/api — real
// OTA delivery is doc07 Phase 8, well past either). Run after `pnpm --filter kb build`.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_DIST = join(__dirname, '..', 'dist');
const REPO_ROOT = join(__dirname, '..', '..', '..');

const FILES = ['kb.en.json', 'kb.es.json', 'kb.index.json'];
const TARGETS = [
  join(REPO_ROOT, 'apps', 'mobile', 'assets', 'kb'),
  join(REPO_ROOT, 'services', 'api', 'src', 'kb-data'),
];

if (!existsSync(KB_DIST)) {
  console.error(`${KB_DIST} does not exist — run "pnpm --filter kb build" first.`);
  process.exit(1);
}

for (const target of TARGETS) {
  mkdirSync(target, { recursive: true });
  for (const file of FILES) {
    const from = join(KB_DIST, file);
    const to = join(target, file);
    if (!existsSync(from)) {
      console.error(`missing build artefact: ${from}`);
      process.exit(1);
    }
    copyFileSync(from, to);
    console.log(`synced ${file} -> ${target}`);
  }
}
