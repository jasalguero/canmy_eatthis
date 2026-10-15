import { generateKeyPairSync, verify } from 'node:crypto';
import {
  ApiErrorSchema,
  KbBundleSchema,
  KbManifestSchema,
  VerdictPayloadSchema,
} from '@canmyeatthis/shared';
import { describe, expect, it } from 'vitest';
import { app, makeEnv } from './helpers.js';

function post(path: string, body: unknown) {
  return app.request(path, { method: 'POST', body: JSON.stringify(body) }, makeEnv());
}

describe('POST /v1/verdict', () => {
  it('returns a schema-valid verdict in the requested language', async () => {
    const res = await post('/v1/verdict', {
      kbId: 'grapes_raisins',
      species: 'dog',
      locale: 'es-MX',
    });
    expect(res.status).toBe(200);
    const payload = VerdictPayloadSchema.parse(await res.json());
    expect(payload.verdict).toBe('toxic');
    expect(payload.disclaimer).toBe('Esta es información general, no un consejo veterinario.');
  });

  it('defaults to English when no locale is sent', async () => {
    const payload = VerdictPayloadSchema.parse(
      await (await post('/v1/verdict', { kbId: 'carrot', species: 'cat' })).json(),
    );
    expect(payload.displayName).toBe('Carrot');
  });

  it('an unknown kbId is INVALID_REQUEST, never an invented verdict', async () => {
    const res = await post('/v1/verdict', { kbId: 'not_real', species: 'dog' });
    expect(res.status).toBe(400);
    expect(ApiErrorSchema.parse(await res.json()).error.code).toBe('INVALID_REQUEST');
  });
});

describe('GET /v1/kb/manifest', () => {
  it('describes exactly the bytes /v1/kb/:lang serves', async () => {
    for (const lang of ['en', 'es'] as const) {
      const manifest = KbManifestSchema.parse(
        await (await app.request(`/v1/kb/manifest?lang=${lang}`, {}, makeEnv())).json(),
      );
      const res = await app.request(manifest.url, {}, makeEnv());
      const bytes = new Uint8Array(await res.arrayBuffer());
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      expect(hex).toBe(manifest.sha256);
      expect(bytes.length).toBe(manifest.sizeBytes);
      expect(manifest.entryCount).toBeGreaterThan(0);
      expect(manifest.lang).toBe(lang);
      expect(res.headers.get('etag')).toBe(`"${manifest.sha256}"`);
    }
  });

  it("serves one language's entries with the alias index", async () => {
    const res = await app.request('/v1/kb/es', {}, makeEnv());
    const bundle = KbBundleSchema.parse(await res.json());
    expect(bundle.lang).toBe('es');
    const ids = new Set(bundle.entries.map((entry) => entry.id));
    expect(Object.values(bundle.index).every((id) => ids.has(id))).toBe(true);
  });

  it('is unsigned without a signing key', async () => {
    const manifest = KbManifestSchema.parse(
      await (await app.request('/v1/kb/manifest?lang=en', {}, makeEnv())).json(),
    );
    expect(manifest.signature).toBeNull();
  });

  it('signs the served bytes with KB_SIGNING_KEY', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const env = makeEnv({
      KB_SIGNING_KEY: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
    });
    const manifest = KbManifestSchema.parse(
      await (await app.request('/v1/kb/manifest?lang=en', {}, env)).json(),
    );
    const bytes = Buffer.from(await (await app.request(manifest.url, {}, env)).arrayBuffer());
    const signature = Buffer.from(manifest.signature ?? '', 'base64');
    expect(verify(null, bytes, publicKey, signature)).toBe(true);
    bytes.writeUInt8(bytes.readUInt8(10) ^ 1, 10);
    expect(verify(null, bytes, publicKey, signature)).toBe(false);
  });

  it('rejects an unsupported language', async () => {
    expect((await app.request('/v1/kb/manifest?lang=fr', {}, makeEnv())).status).toBe(400);
  });
});

describe('health and unknown routes', () => {
  it('serves /v1/health', async () => {
    expect((await app.request('/v1/health', {}, makeEnv())).status).toBe(200);
  });

  it('an unknown route is a shaped 404', async () => {
    const res = await app.request('/v1/nope', {}, makeEnv());
    expect(res.status).toBe(404);
    expect(ApiErrorSchema.parse(await res.json()).error.code).toBe('INVALID_REQUEST');
  });
});
