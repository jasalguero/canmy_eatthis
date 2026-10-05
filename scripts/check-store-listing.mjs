// Checks docs/store-listing.md against App Store Connect's field limits and AGENTS.md #3 (no bare
// "safe" in user-facing text, which includes store text). Run: node scripts/check-store-listing.mjs
import { readFileSync } from 'node:fs';

const LIMITS = {
  name: 30,
  subtitle: 30,
  promo: 170,
  keywords: 100,
  description: 4000,
  whatsnew: 4000,
};
const text = readFileSync(new URL('../docs/store-listing.md', import.meta.url), 'utf8');

// Split into language sections at "## " headings, then into fields at <!-- field:x --> markers.
const sections = text.split(/^## /m).slice(1);
let problems = 0;
let checked = 0;
for (const section of sections) {
  const title = section.split('\n')[0].trim();
  const parts = section.split(/<!-- field:(\w+) -->\n/);
  for (let i = 1; i < parts.length; i += 2) {
    const field = parts[i];
    const value = parts[i + 1]
      .replace(/\n+$/, '')
      .split(/\n(?=<!-- field:)/)[0]
      .trimEnd();
    checked++;
    const limit = LIMITS[field];
    const length = [...value].length; // code points, as Apple counts characters
    if (limit !== undefined && length > limit) {
      console.error(`FAIL ${title} / ${field}: ${length} > ${limit}`);
      problems++;
    }
    if (/\bsafe\b/i.test(value)) {
      console.error(`FAIL ${title} / ${field}: contains the word "safe" (AGENTS.md #3)`);
      problems++;
    }
    if (field === 'keywords' && /,\s/.test(value)) {
      console.error(`FAIL ${title} / keywords: no spaces after commas (they waste characters)`);
      problems++;
    }
    console.log(
      `ok   ${title.padEnd(22)} ${field.padEnd(12)} ${String(length).padStart(4)}${limit ? `/${limit}` : ''}`,
    );
  }
}
if (checked === 0) {
  console.error('FAIL: no fields found in docs/store-listing.md');
  process.exit(1);
}
process.exit(problems === 0 ? 0 : 1);
