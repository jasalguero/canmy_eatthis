import type { SupportedLanguage } from '@/i18n/namespaces';

/** The web export keeps the bundled KB (no SQLite there, `lib/historyDb.web.ts`). */
export function startKbUpdates(_language: SupportedLanguage): void {}
