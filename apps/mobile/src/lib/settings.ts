import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
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

function deviceDefaultRegion(): RegionCode {
  return Localization.getLocales()[0]?.regionCode ?? 'US';
}

interface SettingsState {
  language: SupportedLanguage;
  region: RegionCode;
  /** Sets language only. Never touches region — see the module doc comment. */
  setLanguage: (language: SupportedLanguage) => void;
  /** Sets region only. Never touches language — see the module doc comment. */
  setRegion: (region: RegionCode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: deviceDefaultLanguage(),
      region: deviceDefaultRegion(),
      setLanguage: (language) => set({ language }),
      setRegion: (region) => set({ region }),
    }),
    {
      name: 'canmyeatthis.settings.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ language: state.language, region: state.region }),
    },
  ),
);

export { SUPPORTED_LANGUAGES };
