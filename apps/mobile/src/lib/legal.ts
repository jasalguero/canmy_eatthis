import { Linking } from 'react-native';

import type { SupportedLanguage } from '@/i18n/namespaces';

/**
 * The privacy policy and terms of use, published from `site/` to GitHub Pages
 * (`.github/workflows/pages.yml`). Both stores require the privacy policy at a public URL, and
 * Apple also requires it to be reachable from inside the app.
 *
 * Opened in the user's **language** (the pages are text; AGENTS.md #12), in English or Spanish.
 */
export const LEGAL_SITE = 'https://jasalguero.github.io/canmy_eatthis';

export type LegalPage = 'privacy' | 'terms';

export function legalUrl(page: LegalPage, language: SupportedLanguage): string {
  return `${LEGAL_SITE}/${language}/${page}.html`;
}

export function openLegal(page: LegalPage, language: SupportedLanguage): void {
  void Linking.openURL(legalUrl(page, language));
}
