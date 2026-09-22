import * as Localization from 'expo-localization';
import i18next from 'i18next';
import ICU from 'i18next-icu';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import enConfirm from './locales/en/confirm.json';
import enErrors from './locales/en/errors.json';
import enHistory from './locales/en/history.json';
import enHome from './locales/en/home.json';
import enIdentify from './locales/en/identify.json';
import enLegal from './locales/en/legal.json';
import enOnboarding from './locales/en/onboarding.json';
import enProfile from './locales/en/profile.json';
import enResult from './locales/en/result.json';
import enSettings from './locales/en/settings.json';
import esCommon from './locales/es/common.json';
import esConfirm from './locales/es/confirm.json';
import esErrors from './locales/es/errors.json';
import esHistory from './locales/es/history.json';
import esHome from './locales/es/home.json';
import esIdentify from './locales/es/identify.json';
import esLegal from './locales/es/legal.json';
import esOnboarding from './locales/es/onboarding.json';
import esProfile from './locales/es/profile.json';
import esResult from './locales/es/result.json';
import esSettings from './locales/es/settings.json';
import { NAMESPACES, SUPPORTED_LANGUAGES, type SupportedLanguage } from './namespaces';
import { PSEUDO_LOCALE, pseudoLocalizeCatalogue } from './pseudoLocale';
import { vocabEn, vocabEs } from './vocab';

export const en = {
  common: enCommon,
  home: enHome,
  identify: enIdentify,
  confirm: enConfirm,
  result: enResult,
  errors: enErrors,
  onboarding: enOnboarding,
  legal: enLegal,
  history: enHistory,
  profile: enProfile,
  settings: enSettings,
  vocab: vocabEn,
};
export const es = {
  common: esCommon,
  home: esHome,
  identify: esIdentify,
  confirm: esConfirm,
  result: esResult,
  errors: esErrors,
  onboarding: esOnboarding,
  legal: esLegal,
  history: esHistory,
  profile: esProfile,
  settings: esSettings,
  vocab: vocabEs,
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

/**
 * Initialises the i18next singleton, once. Safe to call on every render: after the first call it
 * returns the existing instance and does nothing else.
 *
 * It deliberately does **not** switch language when called again with a different one.
 * `changeLanguage` makes i18next notify every `useTranslation` subscriber, so calling it from
 * here — which runs inside a `useMemo`, during render — set state on other components mid-render
 * and produced React's "Cannot update a component while rendering a different component"
 * warning. Switching language is a side effect and belongs in an effect: see the one in
 * `src/app/_layout.tsx` that owns it.
 */
export function initI18n(initialLanguage: SupportedLanguage): typeof i18next {
  if (initialized) return i18next;
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
