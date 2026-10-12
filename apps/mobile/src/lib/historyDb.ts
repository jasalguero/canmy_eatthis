import { openDatabaseAsync } from 'expo-sqlite';

import { type HistoryDatabase, migrateHistory } from '@/lib/history';

/**
 * The on-device history database (`lib/history.ts`), opened and migrated once per app run.
 * A failure is not cached: the next call tries again rather than leaving History off until a
 * restart.
 */
let opening: Promise<HistoryDatabase> | null = null;

export function openHistoryDb(): Promise<HistoryDatabase | null> {
  if (!opening) {
    opening = openDatabaseAsync('history.db').then(async (db) => {
      await migrateHistory(db);
      return db;
    });
    opening.catch(() => {
      opening = null;
    });
  }
  return opening;
}
