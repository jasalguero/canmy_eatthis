import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DISCLAIMER } from '../src/strings.js';

const LOCALES = join(__dirname, '..', '..', '..', 'apps', 'mobile', 'src', 'i18n', 'locales');

describe('server-side disclaimer', () => {
  it.each(['en', 'es'] as const)('matches the app catalogue word for word (%s)', (lang) => {
    const legal = JSON.parse(readFileSync(join(LOCALES, lang, 'legal.json'), 'utf8'));
    expect(DISCLAIMER[lang]).toBe(legal.disclaimer);
  });
});
