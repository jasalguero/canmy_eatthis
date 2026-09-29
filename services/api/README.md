# services/api — the Worker

The thin proxy from `docs/01-architecture.md`, built in Phase 4 (`docs/07-implementation-plan.md`). The
Worker identifies things and never decides whether they are dangerous. Verdicts come from the same
`resolveVerdict()` and the same KB snapshot the app bundles (AGENTS.md #1, #5).

| Route | Cost | What it does |
|---|---|---|
| `POST /v1/identify` | **paid** on the model path only | barcode → exact/fuzzy KB → cache → Gemini, in that order |
| `POST /v1/verdict` | free | `{ kbId, species, locale? }` → `VerdictPayload` |
| `GET /v1/kb/manifest?lang=en\|es` | free | version, entry count, sha256 and size of the served KB |
| `GET /v1/kb/:lang` | free | the KB artefact the manifest describes |
| `GET /v1/health`, `/health` | free | `{ ok, version }` |

`/v1/identify` needs an `X-Device-Id: <uuid>` header: an anonymous id the app generates once. It
only keys the per-device rate limit (D24). There are no sessions and no attestation (D24).
`/v1/hotlines` is not served here. Hotlines ship bundled in the app (D30) because the emergency
path must work offline (AGENTS.md #4).

## Spend controls

These are `docs/01-architecture.md` §6.3, in the order the code checks them on the paid path:

1. **Kill switch.** KV key `config:kill_switch`. Set it to `true` and every vision request fails
   with `PROVIDER_UNAVAILABLE` on the next request, cached answers included. Delete the key or set
   it to anything else to re-open. If KV cannot be read, the switch counts as on (fails closed).
2. **Per-device rate limit.** `DEVICE_HOURLY_CALL_LIMIT` paid calls per device per UTC hour.
   If KV fails, requests are let through (fails open), because the daily cap still bounds spend.
3. **Global daily cap.** `VISION_DAILY_CALL_CAP` paid calls per UTC day. Above that the Worker
   returns `SPEND_CAP_EXCEEDED` with `retryAfterSec` set to UTC midnight. If KV fails, calls are
   refused (fails closed). Each escalation call reserves its own slot. The KV config's `dailyCap`
   can lower the cap without a deploy but can never raise it.
4. **Provider quota cap.** This one lives in the Google Cloud console, not in code. See setup.

Typed lookups, `/v1/verdict` and the KB routes never touch any of these. They keep working when
the vision path is refused.

**KV ceiling.** Each paid call writes to KV up to three times (counter, device bucket, cache).
The free plan allows 1,000 KV writes a day, so in practice the cap tops out at around 300 calls
a day. When writes fail, the daily cap fails closed and the vision path refuses. That is the safe
direction. If traffic ever gets near this, move to Workers Paid ($5/month), as `docs/01-architecture.md` §6.1 says.

## Vision config (`config:vision` in KV)

```json
{ "primaryModel": "gemini-2.5-flash-lite", "escalationModel": "gemini-2.5-flash",
  "escalationThreshold": 0.7, "dailyCap": 200 }
```

Every field is optional; missing or malformed JSON falls back to the defaults in `src/config.ts`.
`"escalationModel": null` turns escalation off. A candidate below `escalationThreshold`, or one
that maps to a `high_risk` KB entry, is re-asked of the escalation model. The result keeps the
lower of the two confidences.

## One-time setup

1. **Google Cloud: paid tier only** (`docs/01-architecture.md` §6.2). Create a project and enable billing on
   it. Enable the Generative Language API and create an API key restricted to that API. The free
   tier lets Google train on and human-review submitted photos. Never point production at it.
2. **Provider quota cap.** In *APIs & Services → Generative Language API → Quotas*, cap requests
   per day at a little above `VISION_DAILY_CALL_CAP × 2` (the ×2 covers escalation). Also add a
   budget alert under *Billing → Budgets*. The alert only notifies you; the quota cap is what
   stops spending.
3. **KV:** `pnpm --filter @canmyeatthis/api exec wrangler kv namespace create KV`, then paste the
   id into `wrangler.toml`.
4. **Secret:** `pnpm --filter @canmyeatthis/api exec wrangler secret put GEMINI_API_KEY`. This is
   the only place the key lives. `scripts/check-no-secrets.sh` fails CI if one is committed.
5. **Deploy:** `pnpm --filter @canmyeatthis/api run deploy`.
6. **Nightly eval:** add the repository secret `GEMINI_API_KEY_EVAL` (a paid-tier key) so
   `.github/workflows/live-eval.yml` can run. Add real photos to `eval/images/` named
   `<expectedKbId>__<anything>.jpg`.

## Development

```bash
pnpm --filter @canmyeatthis/api test        # hermetic: fetch is stubbed, zero live calls
pnpm --filter @canmyeatthis/api dev         # wrangler dev on :8787, local KV
pnpm --filter @canmyeatthis/api exec wrangler kv key put --binding KV --local config:kill_switch true
```

Without `GEMINI_API_KEY` in `.dev.vars`, the paid path answers `PROVIDER_UNAVAILABLE` and every
free path still works. For local runs, use your own photos only.

## Files

- `src/identify.ts` is the pipeline. Read its doc comment first.
- `src/prompts/identify.v1.ts` holds the prompt and the model output schema. A wording change
  means a new `identify.v2.ts`. The version goes into the log and into the cache key.
- `src/providers/` holds the `VisionProvider` interface and the one Gemini implementation.
- `src/kv.ts` has the cap, the rate limit, the kill switch and the cache.
- `src/kb.ts` is the server-side KB. It loads the same snapshot as the app (`src/kb-data/`),
  synced by `pnpm --filter @canmyeatthis/kb run sync:assets`.
- `test/fixtures/gemini.ts` has the provider response bodies the contract tests replay.
- `eval/` has the nightly live-provider drift check.
