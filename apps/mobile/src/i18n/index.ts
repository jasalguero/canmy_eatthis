import * as Localization from 'expo-localization';
import i18next from 'i18next';
import ICU from 'i18next-icu';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import enErrors from './locales/en/errors.json';
import enHome from './locales/en/home.json';
import enLegal from './locales/en/legal.json';
import enOnboarding from './locales/en/onboarding.json';
import enResult from './locales/en/result.json';
import esCommon from './locales/es/common.json';
import esErrors from './locales/es/errors.json';
import esHome from './locales/es/home.json';
import esLegal from './locales/es/legal.json';
import esOnboarding from './locales/es/onboarding.json';
import esResult from './locales/es/result.json';
import { NAMESPACES, SUPPORTED_LANGUAGES, type SupportedLanguage } from './namespaces';
import { PSEUDO_LOCALE, pseudoLocalizeCatalogue } from './pseudoLocale';

const en = {
  common: enCommon,
  home: enHome,
  result: enResult,
  errors: enErrors,
  onboarding: enOnboarding,
  legal: enLegal,
};
const es = {
  common: esCommon,
  home: esHome,
  result: esResult,
  errors: esErrors,
  onboarding: esOnboarding,
  legal: esLegal,
};

const resources: Record<string, typeof en> = { en, es };

// Dev-only pseudo-locale (docs/07 Phase 0) — never shipped, never a fallback target.
if (__DEV__) {
  resources[PSEUDO_LOCALE] = pseudoLocalizeCatalogue(en);
}

/**
 * Device language, folded to one of our two supported languages. This seeds the persisted
 * `language` setting on first launch only (src/lib/settings.ts) — after that, the user's
 * choice in Settings always wins. Language and region are deliberately independent
 * (AGENTS.md #12): this function has no opinion about region.
 */
export function deviceDefaultLanguage(): SupportedLanguage {
  const tag = Localization.getLocales()[0]?.languageCode;
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(tag ?? '')
    ? (tag as SupportedLanguage)
    : 'en';
}

let initialized = false;

export function initI18n(initialLanguage: SupportedLanguage): typeof i18next {
  if (initialized) {
    // Re-called when the persisted language setting changes — i18next was initialised once,
    // so a new language takes effect via changeLanguage (and re-renders through the provider).
    if (i18next.language !== initialLanguage) {
      void i18next.changeLanguage(initialLanguage);
    }
    return i18next;
  }
  initialized = true;

  i18next
    .use(ICU)
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: 'en',
      supportedLngs: __DEV__ ? [...SUPPORTED_LANGUAGES, PSEUDO_LOCALE] : [...SUPPORTED_LANGUAGES],
      ns: [...NAMESPACES],
      defaultNS: 'common',
      interpolation: { escapeValue: false }, // React already escapes
      returnNull: false,
      debug: __DEV__,
    });

  return i18next;
}

export { PSEUDO_LOCALE };
export default i18next;
