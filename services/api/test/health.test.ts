import { describe, expect, it } from 'vitest';
import app from '../src/index.js';

describe('GET /health', () => {
  it('returns ok: true and a version', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, version: expect.any(String) });
  });
});
