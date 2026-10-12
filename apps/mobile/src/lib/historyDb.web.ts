import type { HistoryDatabase } from '@/lib/history';

/**
 * The web build (the CI bundle check and the gallery in a browser) keeps no history:
 * `expo-sqlite` on the web needs a WebAssembly build and cross-origin isolation headers, which a
 * static export cannot rely on. History screens show their empty state there.
 */
export function openHistoryDb(): Promise<HistoryDatabase | null> {
  return Promise.resolve(null);
}
