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
   * AI-processing consent (Apple 5.1.2, docs/05-safety-legal.md §6). Defaults to `false`: consent is something
   * the user gives at first run, never something the app assumes. While it is false the app
   * never sends a photo anywhere, and — the point of docs/07 Phase 5 — everything else still
   * works: typed lookups, every verdict, every emergency number.
   */
  photoIdConsent: boolean;
  /** Whether the first-run flow has been completed. */
  onboarded: boolean;
  /**
   * The anonymous id `POST /v1/identify` needs for per-device rate limiting (docs/03 Auth, D24).
   * Made the first time a photo is sent, never before; it identifies no one and is sent nowhere
   * else.
   */
  deviceId: string | null;
  /** Returns the device id, making it on first use. */
  ensureDeviceId: () => string;
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
    (set, get) => ({
      language: deviceDefaultLanguage(),
      region: deviceDefaultRegion(),
      appearance: 'system',
      photoIdConsent: false,
      onboarded: false,
      deviceId: null,
      ensureDeviceId: () => {
        const existing = get().deviceId;
        if (existing) return existing;
        const id = randomUuid();
        set({ deviceId: id });
        return id;
      },
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
        deviceId: state.deviceId,
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

/**
 * A version-4 UUID. `crypto.getRandomValues` where the runtime has it; otherwise `Math.random`,
 * which is enough for an id whose only job is to tell one phone's request rate from another's.
 */
export function randomUuid(): string {
  const bytes = new Uint8Array(16);
  const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => void } })
    .crypto;
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
