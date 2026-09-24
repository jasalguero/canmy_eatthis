/**
 * A minimal in-memory `KVNamespace` for tests — enough of the real interface for this project's
 * usage (`get`/`put`/`delete`), no Miniflare or Cloudflare account needed. `expirationTtl` is
 * accepted and ignored: nothing in this test suite runs long enough to need real expiry, and
 * asserting expiry would mean asserting a wall-clock race rather than the logic under test.
 */
export function createFakeKv(initial: Record<string, string> = {}): KVNamespace {
  const store = new Map<string, string>(Object.entries(initial));

  return {
    async get(key: string, typeOrOptions?: unknown) {
      const raw = store.get(key) ?? null;
      const type =
        typeof typeOrOptions === 'string'
          ? typeOrOptions
          : ((typeOrOptions as { type?: string } | undefined)?.type ?? 'text');
      if (raw === null) return null;
      return type === 'json' ? JSON.parse(raw) : raw;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
    // Unused by this project — present only to satisfy the KVNamespace type shape where needed.
    async list() {
      return {
        keys: [...store.keys()].map((name) => ({ name })),
        list_complete: true,
        cacheStatus: null,
      };
    },
    async getWithMetadata() {
      return { value: null, metadata: null, cacheStatus: null };
    },
    // Test-only escape hatch, not part of KVNamespace.
    __store: store,
    // biome-ignore lint/suspicious/noExplicitAny: the real KVNamespace type is deliberately wide
  } as any;
}
