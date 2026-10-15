import Constants from 'expo-constants';
import { openDatabaseAsync } from 'expo-sqlite';

import type { SupportedLanguage } from '@/i18n/namespaces';
import { features } from '@/lib/features';
import { applyStoredKbUpdate, checkForKbUpdate, migrateKbStore } from '@/lib/kbUpdate';

/**
 * Runs `lib/kbUpdate.ts` once per launch for the app's language: install the stored update, then
 * check for a newer one in the background. Never throws; a failure leaves the bundled KB.
 */
let started = false;

export function startKbUpdates(language: SupportedLanguage): void {
  const kb = features.kbUpdates;
  if (started || !kb) return;
  started = true;
  const config = { ...kb, appVersion: Constants.expoConfig?.version ?? '0.0.0' };
  void (async () => {
    try {
      const db = await openDatabaseAsync('kb.db');
      await migrateKbStore(db);
      const activeVersion = await applyStoredKbUpdate(language, config, db);
      const outcome = await checkForKbUpdate(language, activeVersion, config, {
        db,
        fetch,
        now: Date.now,
      });
      if (__DEV__) console.log('kb update:', outcome);
    } catch (error) {
      if (__DEV__) console.warn('kb update: failed', error);
    }
  })();
}
