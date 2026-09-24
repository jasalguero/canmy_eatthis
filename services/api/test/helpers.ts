import { vi } from 'vitest';
import type { Env } from '../src/env.js';
import { createApp } from '../src/index.js';
import { createFakeKv } from './fakeKv.js';

export const DEVICE_ID = '6f1c2a4e-3b5d-4e7f-8a9b-0c1d2e3f4a5b';

/** A minimal but well-formed JPEG header (SOI + SOF0 + EOI), base64. `seed` varies the bytes. */
export function makeJpeg(width: number, height: number, seed = 0): string {
  const bytes = [
    0xff,
    0xd8,
    // APP0-ish filler segment whose payload carries the seed, so two images hash differently.
    0xff,
    0xe0,
    0x00,
    0x04,
    seed & 0xff,
    (seed >> 8) & 0xff,
    0xff,
    0xc0,
    0x00,
    0x0b,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x01,
    0x01,
    0x11,
    0x00,
    0xff,
    0xd9,
  ];
  return btoa(String.fromCharCode(...bytes));
}

type GeminiReply = { status?: number; body?: unknown } | Error;

/**
 * Stubs global `fetch` so the only thing that can answer is the scripted Gemini queue — any
 * other URL fails the test. This is the "CI makes zero live model calls" guarantee.
 */
export function stubGemini(replies: GeminiReply[]) {
  const calls: Array<{ model: string; body: unknown }> = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const match =
      /generativelanguage\.googleapis\.com\/v1beta\/models\/([^:]+):generateContent$/.exec(url);
    if (!match) throw new Error(`unexpected network call in test: ${url}`);
    calls.push({ model: decodeURIComponent(match[1] ?? ''), body: JSON.parse(String(init?.body)) });
    const reply = replies.shift();
    if (!reply) throw new Error('no scripted Gemini reply left');
    if (reply instanceof Error) throw reply;
    return new Response(JSON.stringify(reply.body ?? {}), { status: reply.status ?? 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

/**
 * Escalation is off unless a test is about it: a high-risk KB hit (chocolate, lilies…) escalates
 * by design, and every other test would otherwise need two scripted replies.
 */
export const NO_ESCALATION = { 'config:vision': JSON.stringify({ escalationModel: null }) };

export function makeEnv(
  overrides: Partial<Env> = {},
  kvInitial: Record<string, string> = NO_ESCALATION,
): Env {
  return {
    KV: createFakeKv(kvInitial),
    VISION_DAILY_CALL_CAP: '500',
    DEVICE_HOURLY_CALL_LIMIT: '20',
    MIN_APP_VERSION: '0.1.0',
    GEMINI_API_KEY: 'test-key-not-real',
    ...overrides,
  };
}

/** The real app wired to the real Gemini adapter — only `fetch` underneath it is scripted. */
export const app = createApp();

export function identifyRequest(env: Env, body: unknown, headers: Record<string, string> = {}) {
  return app.request(
    '/v1/identify',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-device-id': DEVICE_ID, ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    },
    env,
  );
}

export function photoRequest(overrides: Record<string, unknown> = {}) {
  return {
    species: 'dog',
    text: null,
    images: [{ data: makeJpeg(800, 600), hash: 'client-supplied-hash' }],
    barcode: null,
    locale: 'en-GB',
    ...overrides,
  };
}
