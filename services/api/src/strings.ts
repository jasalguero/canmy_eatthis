import type { Language } from './kb.js';

/**
 * The only user-facing prose the Worker produces itself: the disclaimer every `VerdictPayload`
 * carries. It must be word-for-word the app's `legal:disclaimer` in each language — a verdict
 * must read the same whether it was resolved on-device or here (AGENTS.md #5). `test/strings.test.ts`
 * diffs these against `apps/mobile/src/i18n/locales/<lang>/legal.json`, so the two cannot drift.
 */
export const DISCLAIMER: Record<Language, string> = {
  en: 'This is general information, not veterinary advice.',
  es: 'Esta es información general, no un consejo veterinario.',
};
