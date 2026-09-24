/**
 * Nightly live-provider drift check (docs/07 Phase 5). The committed suite never calls a model;
 * this is the one place that does, so a provider-side change (model retired, output drift, schema
 * handling change) shows up within a day instead of in a user's result.
 *
 *   GEMINI_API_KEY=… pnpm --filter @canmyeatthis/api run eval:live
 *
 * It calls the provider directly — not through the Worker — so it neither consumes nor needs the
 * production daily cap. It does cost money: ~10 text calls plus one per image, per run.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_VISION_CONFIG } from '../src/config.js';
import { resolveCandidateLabel } from '../src/kb.js';
import { createGeminiProvider } from '../src/providers/gemini.js';
import type { ProviderInput } from '../src/providers/types.js';

interface Case {
  name: string;
  input: ProviderInput;
  expected: string | null;
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.log('GEMINI_API_KEY not set — skipping the live eval.');
  process.exit(0);
}
const model = process.env.EVAL_MODEL ?? DEFAULT_VISION_CONFIG.primaryModel;
const MIN_PASS_RATE = Number(process.env.EVAL_MIN_PASS_RATE ?? '0.8');

const dir = join(import.meta.dirname, '.');
const spec = JSON.parse(readFileSync(join(dir, 'cases.json'), 'utf8')) as {
  text: Array<{ text: string; expected: string | null }>;
};
const cases: Case[] = spec.text.map((c) => ({
  name: `text: ${c.text}`,
  input: { text: c.text, images: [], language: 'en' },
  expected: c.expected,
}));
for (const file of readdirSync(join(dir, 'images')).filter((f) => f.endsWith('.jpg'))) {
  const expected = file.split('__')[0] ?? 'null';
  cases.push({
    name: `image: ${file}`,
    input: {
      text: null,
      images: [readFileSync(join(dir, 'images', file)).toString('base64')],
      language: 'en',
    },
    expected: expected === 'null' ? null : expected,
  });
}

const provider = createGeminiProvider(apiKey);
let passed = 0;
const rows: string[] = [];
for (const c of cases) {
  const started = Date.now();
  let got: string | null = null;
  let answered = false;
  let note = '';
  try {
    const result = await provider.identify(c.input, model);
    if (result.kind === 'ok') {
      answered = true;
      const top = result.output.candidates[0];
      got = top ? resolveCandidateLabel(top.label, top.commonName) : null;
      note = top ? `"${top.label}" @ ${top.confidence}` : 'no candidates';
    } else {
      note = `malformed: ${result.detail}`;
    }
  } catch (err) {
    note = `unavailable: ${(err as Error).message}`;
  }
  // A provider error is a failure even for a `null` case — "no answer" is not "correctly no match".
  const ok = answered && got === c.expected;
  if (ok) passed++;
  rows.push(
    `${ok ? 'PASS' : 'FAIL'}  ${c.name}  expected=${c.expected} got=${got}  ${note}  ${Date.now() - started}ms`,
  );
}

const rate = cases.length === 0 ? 1 : passed / cases.length;
console.log(`Live eval — model ${model}, ${cases.length} cases\n`);
console.log(rows.join('\n'));
console.log(
  `\n${passed}/${cases.length} passed (${(rate * 100).toFixed(0)}%, threshold ${MIN_PASS_RATE * 100}%)`,
);
if (!cases.some((c) => c.input.images.length > 0)) {
  console.log('Note: eval/images/ is empty — only the text path was exercised.');
}
process.exit(rate >= MIN_PASS_RATE ? 0 : 1);
