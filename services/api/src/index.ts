import { Hono } from 'hono';

// Bump on every deploy-relevant change. Surfaced by /health so we can confirm what's live
// without digging through the Cloudflare dashboard.
const VERSION = '0.0.0';

export type Env = {
  // Vars (non-secret, wrangler.toml [vars])
  DEV_SESSION_TOKENS_ENABLED: string;
  VISION_DAILY_CALL_CAP: string;
  // Secrets (wrangler secret put), present at runtime, absent in local type-only checks.
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.get('/health', (c) => {
  return c.json({ ok: true, version: VERSION });
});

export default app;
