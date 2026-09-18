/**
 * Dev-only pseudo-locale: accented characters + ~40% length padding, per
 * docs/07-implementation-plan.md Phase 0. Two jobs:
 *   1. Surface hardcoded strings that bypass `t()` (AGENTS.md #11) — they show up un-accented.
 *   2. Surface layout that breaks on longer text before Spanish (which runs 20–30% longer,
 *      docs/09-localisation.md) or 200% font scale ever gets tested.
 *
 * ICU placeholders (`{count}`, `{count, plural, ...}`) are protected from mangling so the
 * message stays parseable by i18next-icu.
 */

const VOWEL_MAP: Record<string, string> = {
  a: 'á',
  e: 'é',
  i: 'í',
  o: 'ó',
  u: 'ú',
  A: 'Á',
  E: 'É',
  I: 'Í',
  O: 'Ó',
  U: 'Ú',
};

const PAD_RATIO = 0.4;
const PAD_CHAR = '~';

function pseudoLocalizeString(input: string): string {
  const parts = input.split(/(\{[^}]*\})/g);
  const accented = parts
    .map((part) =>
      part.startsWith('{') && part.endsWith('}')
        ? part
        : part.replace(/[aeiouAEIOU]/g, (c) => VOWEL_MAP[c] ?? c),
    )
    .join('');
  const padLength = Math.ceil(accented.length * PAD_RATIO);
  return `[${accented}${PAD_CHAR.repeat(Math.max(padLength, 1))}]`;
}

type Catalogue = Record<string, unknown>;

export function pseudoLocalizeCatalogue<T extends Catalogue>(catalogue: T): T {
  const result: Catalogue = {};
  for (const [key, value] of Object.entries(catalogue)) {
    if (typeof value === 'string') {
      result[key] = pseudoLocalizeString(value);
    } else if (value && typeof value === 'object') {
      result[key] = pseudoLocalizeCatalogue(value as Catalogue);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

// The pseudo-locale's i18next language code. Only ever registered in dev builds — see
// i18n/index.ts, where resources for this code are added exclusively when `__DEV__` is true.
export const PSEUDO_LOCALE = 'en-XA';
