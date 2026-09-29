import { describe, expect, it, vi } from 'vitest';
import {
  buildCacheKey,
  checkAndReserveDailyCap,
  checkDeviceRateLimit,
  getCachedResponse,
  isKillSwitchActive,
  secondsUntilUtcMidnight,
  setCachedResponse,
} from '../src/kv.js';
import { createFakeKv } from './fakeKv.js';

describe('isKillSwitchActive', () => {
  it('is off (vision enabled) when the key is missing', async () => {
    expect(await isKillSwitchActive(createFakeKv())).toBe(false);
  });

  it('is on when explicitly set to "true"', async () => {
    expect(await isKillSwitchActive(createFakeKv({ 'config:kill_switch': 'true' }))).toBe(true);
  });

  it('is off when set to anything other than "true"', async () => {
    expect(await isKillSwitchActive(createFakeKv({ 'config:kill_switch': 'false' }))).toBe(false);
  });

  it('fails closed (killed) on a KV read error', async () => {
    const kv = createFakeKv();
    vi.spyOn(kv, 'get').mockRejectedValueOnce(new Error('kv down'));
    expect(await isKillSwitchActive(kv)).toBe(true);
  });
});

describe('checkAndReserveDailyCap', () => {
  it('allows calls under the cap and counts down remaining', async () => {
    const kv = createFakeKv();
    const first = await checkAndReserveDailyCap(kv, 3);
    expect(first).toEqual({ allowed: true, remaining: 2 });
    const second = await checkAndReserveDailyCap(kv, 3);
    expect(second).toEqual({ allowed: true, remaining: 1 });
  });

  it('refuses once the cap is reached — this is the layer that prevents an unbounded bill', async () => {
    const kv = createFakeKv();
    await checkAndReserveDailyCap(kv, 1);
    const second = await checkAndReserveDailyCap(kv, 1);
    expect(second).toEqual({ allowed: false, remaining: 0 });
  });

  it('fails closed (refuses) on a KV error — the conservative direction', async () => {
    const kv = createFakeKv();
    vi.spyOn(kv, 'get').mockRejectedValueOnce(new Error('kv down'));
    expect(await checkAndReserveDailyCap(kv, 500)).toEqual({ allowed: false, remaining: 0 });
  });
});

describe('checkDeviceRateLimit', () => {
  it('allows calls under the per-hour limit', async () => {
    const kv = createFakeKv();
    const result = await checkDeviceRateLimit(kv, 'device-1', 5);
    expect(result.allowed).toBe(true);
  });

  it('refuses once a device exceeds its hourly limit', async () => {
    const kv = createFakeKv();
    await checkDeviceRateLimit(kv, 'device-1', 1);
    const second = await checkDeviceRateLimit(kv, 'device-1', 1);
    expect(second.allowed).toBe(false);
    expect(second.retryAfterSec).toBeGreaterThan(0);
  });

  it('rate-limits devices independently', async () => {
    const kv = createFakeKv();
    await checkDeviceRateLimit(kv, 'device-1', 1);
    const other = await checkDeviceRateLimit(kv, 'device-2', 1);
    expect(other.allowed).toBe(true);
  });

  it('fails open (allowed) on a KV error — unlike the daily cap, this does not risk the bill', async () => {
    const kv = createFakeKv();
    vi.spyOn(kv, 'get').mockRejectedValueOnce(new Error('kv down'));
    expect((await checkDeviceRateLimit(kv, 'device-1', 5)).allowed).toBe(true);
  });
});

const BASE_KEY = {
  species: 'dog',
  language: 'en',
  normalisedText: 'x',
  imageHashes: [] as string[],
  promptVersion: 'identify.v1',
  kbVersion: 'v1',
};

describe('cache', () => {
  it('round-trips a cached value through the same derived key', async () => {
    const kv = createFakeKv();
    const key = await buildCacheKey({ ...BASE_KEY, normalisedText: 'dark chocolate' });
    expect(await getCachedResponse(kv, key)).toBeNull();
    await setCachedResponse(kv, key, { hello: 'world' });
    expect(await getCachedResponse(kv, key)).toEqual({ hello: 'world' });
  });

  it('derives the same key regardless of image hash order (order-independent)', async () => {
    const a = await buildCacheKey({ ...BASE_KEY, imageHashes: ['b', 'a'] });
    const b = await buildCacheKey({ ...BASE_KEY, imageHashes: ['a', 'b'] });
    expect(a).toBe(b);
  });

  it('derives a different key when anything that changes the answer changes', async () => {
    const base = await buildCacheKey(BASE_KEY);
    for (const change of [
      { species: 'cat' },
      { language: 'es' },
      { normalisedText: 'y' },
      { imageHashes: ['c'] },
      // A new prompt or a new KB must never be served the old one's cached answers.
      { promptVersion: 'identify.v2' },
      { kbVersion: 'other' },
    ]) {
      expect(await buildCacheKey({ ...BASE_KEY, ...change })).not.toBe(base);
    }
  });

  it('a write failure degrades to "not cached", never an error (docs/01-architecture.md §6.1)', async () => {
    const kv = createFakeKv();
    vi.spyOn(kv, 'put').mockRejectedValueOnce(new Error('kv write failed'));
    await expect(setCachedResponse(kv, 'some-key', { a: 1 })).resolves.toBeUndefined();
  });

  it('a read failure degrades to a cache miss, never an error', async () => {
    const kv = createFakeKv();
    vi.spyOn(kv, 'get').mockRejectedValueOnce(new Error('kv read failed'));
    expect(await getCachedResponse(kv, 'some-key')).toBeNull();
  });
});

describe('secondsUntilUtcMidnight', () => {
  it('counts down to the next UTC midnight, when the daily cap resets', () => {
    expect(secondsUntilUtcMidnight(new Date('2026-09-24T23:59:00Z'))).toBe(60);
    expect(secondsUntilUtcMidnight(new Date('2026-09-24T00:00:00Z'))).toBe(86_400);
  });
});
