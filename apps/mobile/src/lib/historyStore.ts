import { create } from 'zustand';

import {
  type HistoryDatabase,
  type HistoryRecord,
  type NewHistoryRecord,
  addCheck,
  deleteCheck,
  listChecks,
} from '@/lib/history';
import { openHistoryDb } from '@/lib/historyDb';

/**
 * The in-memory view of the history table, so the History screen renders from state and every
 * write re-reads the list.
 *
 * Nothing here throws. History is a convenience next to the emergency path (AGENTS.md #4): a
 * full disk or a failed migration must never stop a verdict from showing, so a failed write is
 * dropped and a failed read leaves the list empty.
 *
 * `open` is injectable only for tests.
 */
interface HistoryState {
  records: HistoryRecord[];
  loaded: boolean;
  load: () => Promise<void>;
  record: (record: NewHistoryRecord) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export function createHistoryStore(open: () => Promise<HistoryDatabase | null> = openHistoryDb) {
  async function withDb(
    work: (db: HistoryDatabase) => Promise<void>,
  ): Promise<HistoryRecord[] | null> {
    try {
      const db = await open();
      if (!db) return [];
      await work(db);
      return await listChecks(db);
    } catch (error) {
      if (__DEV__) console.warn('history: storage failed', error);
      return null;
    }
  }

  return create<HistoryState>()((set) => ({
    records: [],
    loaded: false,
    load: async () => {
      const records = await withDb(async () => {});
      set((state) => ({ records: records ?? state.records, loaded: true }));
    },
    record: async (record) => {
      const records = await withDb((db) => addCheck(db, record));
      if (records) set({ records, loaded: true });
    },
    remove: async (id) => {
      const records = await withDb((db) => deleteCheck(db, id));
      if (records) set({ records, loaded: true });
    },
  }));
}

export const useHistoryStore = createHistoryStore();
