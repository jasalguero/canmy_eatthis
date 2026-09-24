import {
  IdentifyRequestSchema,
  KbManifestSchema,
  VerdictPayloadSchema,
  VerdictRequestSchema,
} from '@canmyeatthis/shared';
import { type Context, Hono } from 'hono';
import { loadVisionConfig } from './config.js';
import { type Env, positiveIntVar } from './env.js';
import { ApiFailure, errorResponse, newRequestId } from './errors.js';
import { type IdentifyDeps, type IdentifyLog, identify } from './identify.js';
import { MAX_REQUEST_BYTES } from './images.js';
import { buildVerdict, getKbVersion, languageFromLocale } from './kb.js';
import { getServedKb } from './manifest.js';
import { createGeminiProvider } from './providers/gemini.js';
import { DISCLAIMER } from './strings.js';

// Bump on every deploy-relevant change. Surfaced by /health so we can confirm what's live
// without digging through the Cloudflare dashboard.
const VERSION = '0.1.0';

/** docs/10 §3 — the conservative starting values if a var is missing or garbled. */
const DEFAULT_DAILY_CAP = 500;
const DEFAULT_DEVICE_HOURLY_LIMIT = 20;

type AppEnv = { Bindings: Env; Variables: { requestId: string } };

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    c.set('requestId', newRequestId());
    await next();
  });

  app.onError((err, c) => {
    const requestId = c.get('requestId') ?? newRequestId();
    if (err instanceof ApiFailure) return errorResponse(c, err, requestId);
    console.error(JSON.stringify({ at: 'unhandled', requestId, error: String(err) }));
    return errorResponse(c, new ApiFailure('INTERNAL', 'internal error'), requestId);
  });

  app.notFound((c) =>
    c.json(
      {
        error: { code: 'INVALID_REQUEST', message: 'no such route', requestId: c.get('requestId') },
      },
      404,
    ),
  );

  const health = (c: Context<AppEnv>) => c.json({ ok: true, version: VERSION });
  app.get('/health', health);
  app.get('/v1/health', health);

  app.post('/v1/identify', async (c) => {
    const requestId = c.get('requestId');
    const log: IdentifyLog = {
      promptVersion: null,
      kbVersion: getKbVersion('en'),
      provider: null,
      model: null,
      cached: false,
      resolvedBy: null,
      query: '',
      imageCount: 0,
      escalated: false,
      modelDetail: null,
    };
    const startedAt = Date.now();
    let errorCode: string | null = null;
    try {
      // D24: an anonymous, client-generated UUID — no attestation behind it. It only keys the
      // per-device rate limit; the global cap is what bounds spend.
      const deviceId = c.req.header('x-device-id') ?? '';
      if (!UUID_RE.test(deviceId)) {
        throw new ApiFailure('UNAUTHENTICATED', 'missing or malformed X-Device-Id header');
      }
      const body = await readJsonBody(c);
      const parsed = IdentifyRequestSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiFailure('INVALID_REQUEST', parsed.error.issues[0]?.message ?? 'invalid body');
      }

      const env = c.env;
      const deps: IdentifyDeps = {
        kv: env.KV,
        provider: env.GEMINI_API_KEY ? createGeminiProvider(env.GEMINI_API_KEY) : null,
        config: await loadVisionConfig(env.KV),
        envDailyCap: positiveIntVar(env.VISION_DAILY_CALL_CAP, DEFAULT_DAILY_CAP),
        deviceHourlyLimit: positiveIntVar(
          env.DEVICE_HOURLY_CALL_LIMIT,
          DEFAULT_DEVICE_HOURLY_LIMIT,
        ),
      };
      const response = await identify(parsed.data, deviceId, requestId, deps, log);
      return c.json(response);
    } catch (err) {
      errorCode = err instanceof ApiFailure ? err.code : 'INTERNAL';
      throw err;
    } finally {
      // docs/07 Phase 5 structured log: normalised query only — never raw text, never images.
      console.log(
        JSON.stringify({
          at: 'identify',
          requestId,
          ...log,
          latencyMs: Date.now() - startedAt,
          errorCode,
        }),
      );
    }
  });

  // Pure function of (kbId, species, language) — no model, no cost, no device id needed.
  app.post('/v1/verdict', async (c) => {
    const parsed = VerdictRequestSchema.safeParse(await readJsonBody(c));
    if (!parsed.success) {
      throw new ApiFailure('INVALID_REQUEST', parsed.error.issues[0]?.message ?? 'invalid body');
    }
    const language = languageFromLocale(parsed.data.locale);
    const payload = buildVerdict({
      kbId: parsed.data.kbId,
      species: parsed.data.species,
      language,
      disclaimer: DISCLAIMER[language],
    });
    if (!payload) throw new ApiFailure('INVALID_REQUEST', `unknown kbId "${parsed.data.kbId}"`);
    return c.json(VerdictPayloadSchema.parse(payload));
  });

  app.get('/v1/kb/manifest', async (c) => {
    const language = parseKbLanguage(c.req.query('lang') ?? 'en');
    const { manifest } = await getServedKb(language, c.env.MIN_APP_VERSION || '0.0.0');
    return c.json(KbManifestSchema.parse(manifest));
  });

  app.get('/v1/kb/:lang', async (c) => {
    const language = parseKbLanguage(c.req.param('lang'));
    const { body, manifest } = await getServedKb(language, c.env.MIN_APP_VERSION || '0.0.0');
    return c.body(body, 200, {
      'content-type': 'application/json; charset=utf-8',
      etag: `"${manifest.sha256}"`,
      'cache-control': 'public, max-age=3600',
    });
  });

  return app;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseKbLanguage(raw: string): 'en' | 'es' {
  if (raw === 'en' || raw === 'es') return raw;
  throw new ApiFailure('INVALID_REQUEST', `unsupported KB language "${raw}"`);
}

/** docs/03: total request ≤ 2 MB. Checked on the actual body, not just the declared length. */
async function readJsonBody(c: Context<AppEnv>): Promise<unknown> {
  const declared = Number(c.req.header('content-length') ?? '0');
  if (declared > MAX_REQUEST_BYTES) {
    throw new ApiFailure('INVALID_REQUEST', 'request body exceeds 2 MB');
  }
  const raw = await c.req.text();
  if (raw.length > MAX_REQUEST_BYTES) {
    throw new ApiFailure('INVALID_REQUEST', 'request body exceeds 2 MB');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiFailure('INVALID_REQUEST', 'body is not valid JSON');
  }
}

export default createApp();
