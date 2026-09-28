import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deviceDefaultLanguage } from '@/i18n';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n/namespaces';

/**
 * ISO 3166-1 alpha-2. Region drives poison hotlines, weight units and regional food coverage
 * (docs/03 `/v1/hotlines?region=`, docs/09-localisation.md). It is NOT derived from language —
 * AGENTS.md #12 is explicit that the two must never be coupled: a Spanish-speaking user in the
 * US still needs US hotline numbers, and an English-speaking expat in Spain needs Spanish ones.
 */
export type RegionCode = string;

/**
 * Appearance is a third independent setting. `system` (the default) follows the device; the
 * explicit values exist because this app is used at 2 a.m. (docs/06 §1) and a user who keeps
 * their phone in light mode may still want the app dark in the dark.
 */
export type Appearance = 'system' | 'light' | 'dark';

function deviceDefaultRegion(): RegionCode {
  return Localization.getLocales()[0]?.regionCode ?? 'US';
}

interface SettingsState {
  language: SupportedLanguage;
  region: RegionCode;
  appearance: Appearance;
  /**
   * AI-processing consent (Apple 5.1.2, docs/10 §5). Defaults to `false`: consent is something
   * the user gives at first run, never something the app assumes. While it is false the app
   * never sends a photo anywhere, and — the point of docs/07 Phase 7 — everything else still
   * works: typed lookups, every verdict, every emergency number.
   */
  photoIdConsent: boolean;
  /** Whether the first-run flow has been completed. */
  onboarded: boolean;
  /** Sets language only. Never touches region — see the module doc comment. */
  setLanguage: (language: SupportedLanguage) => void;
  /** Sets region only. Never touches language — see the module doc comment. */
  setRegion: (region: RegionCode) => void;
  setAppearance: (appearance: Appearance) => void;
  setPhotoIdConsent: (consent: boolean) => void;
  setOnboarded: (onboarded: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: deviceDefaultLanguage(),
      region: deviceDefaultRegion(),
      appearance: 'system',
      photoIdConsent: false,
      onboarded: false,
      setLanguage: (language) => set({ language }),
      setRegion: (region) => set({ region }),
      setAppearance: (appearance) => set({ appearance }),
      setPhotoIdConsent: (photoIdConsent) => set({ photoIdConsent }),
      setOnboarded: (onboarded) => set({ onboarded }),
    }),
    {
      name: 'canmyeatthis.settings.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        language: state.language,
        region: state.region,
        appearance: state.appearance,
        photoIdConsent: state.photoIdConsent,
        onboarded: state.onboarded,
      }),
    },
  ),
);

/**
 * Whether persisted settings have been read back from storage. Until then every field holds its
 * default — `onboarded` is false even for a returning user — so anything that routes on a
 * persisted value has to wait for this.
 */
export function useSettingsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useSettingsStore.persist.hasHydrated());
  useEffect(() => {
    if (useSettingsStore.persist.hasHydrated()) setHydrated(true);
    return useSettingsStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}

export { SUPPORTED_LANGUAGES };
