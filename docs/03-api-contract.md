# 03 — API Contract

Base URL: `https://api.canmyeatthis.app` (placeholder). All endpoints versioned under `/v1`.
Every schema below lives in `packages/shared/src/schemas/` as Zod and is the single source of truth.
Do not hand-write these types in either half of the codebase.

## Auth

There are no accounts and no sessions (D24). `POST /v1/identify` requires an
`X-Device-Id: <uuid>` header: an anonymous id the app generates once, used only for per-device rate
limiting. A missing or malformed id is `UNAUTHENTICATED`. The id is not an identity and proves
nothing about the caller, which is why the global daily cap (`docs/01-architecture.md` §6.3) is
what actually bounds spend.

---

## `POST /v1/identify`

The only endpoint that costs money. Called when local resolution fails or a photo is present.

### Request

```jsonc
{
  "species": "dog" | "cat",
  "text": "dark chocolate bar" | null,        // user's typed description, trimmed, ≤ 500 chars
  "images": [                                  // 0–4 items
    { "data": "<base64 jpeg>", "hash": "<blake3 of bytes>" }
  ],
  "barcode": { "format": "ean13", "value": "8410000000000" } | null,
  "locale": "es-ES",
  "hints": {                                   // optional, from on-device pre-filter
    "category": "plant" | "packaged" | "prepared" | "chemical" | "unknown"
  }
}
```

Constraints enforced server-side and mirrored client-side:
- at least one of `text`, `images`, `barcode` must be present
- each image ≤ 400 KB base64, longest edge ≤ 1024 px, JPEG only
- total request ≤ 2 MB

### Response 200

```jsonc
{
  "requestId": "req_01J...",
  "resolvedBy": "kb_exact" | "barcode" | "cache" | "model" | "model_fallback",
  "needsConfirmation": true,
  "candidates": [
    {
      "id": "cand_1",
      "label": "Dark chocolate bar",
      "kbId": "chocolate_dark" | null,
      "confidence": 0.86,
      "confidenceBand": "high" | "medium" | "low",
      "detectedIngredients": ["cocoa mass", "sugar"],   // from label OCR or barcode
      "imageIndex": 0
    },
    { "id": "cand_2", "label": "Milk chocolate", "kbId": "chocolate_milk", "confidence": 0.09, "confidenceBand": "low" }
  ],
  "alternates": [                     // KB confusables of the primary — always offered on the confirm screen
    { "kbId": "chocolate_white", "label": "White chocolate" }
  ],
  "verdict": { /* VerdictPayload, present only when needsConfirmation === false */ } | null,
  "imageQuality": { "usable": true, "reason": null },
  "meta": { "provider": "gemini", "model": "gemini-3.5-flash-lite", "cached": false, "latencyMs": 1840 }
}
```

`needsConfirmation` is `false` only for `resolvedBy: "kb_exact"` or `"barcode"` with a single
high-confidence candidate. Anything model-derived is `true`. See product spec §2.3.

---

## `POST /v1/verdict`

Pure function of `(kbId, species)`. No model call, no cost.
The app calls this after the user confirms an identification. It can also be computed entirely
on-device from the bundled KB — **it must produce an identical result either way**, and a shared
test fixture set enforces that.

```jsonc
// request
{ "kbId": "chocolate_dark", "species": "dog", "locale": "es-ES" }   // locale picks the KB language only
```

### `VerdictPayload`

```jsonc
{
  "kbId": "chocolate_dark",
  "displayName": "Dark chocolate",
  "species": "dog",
  "verdict": "safe" | "caution" | "toxic" | "unknown",
  "severity": "mild" | "moderate" | "severe" | null,     // non-null iff verdict === "toxic"
  "headline": "Toxic to dogs. Call your vet.",
  "summary": "Dark chocolate contains theobromine, which dogs clear very slowly.",
  "signs": ["vomiting", "restlessness", "tachycardia", "tremors"],     // controlled-vocabulary ids
  "onsetHours": { "min": 2, "max": 12 } | null,                        // only when a source states it
  "emergencyActions": ["call_vet_now", "do_not_induce_vomiting", "bring_packaging"],  // vocabulary ids; non-empty when toxic
  "sources": [ { "label": "Merck Veterinary Manual — Chocolate toxicosis", "url": "https://..." } ],
  "kbVersion": "2026.09.17",
  "disclaimer": "This is general information, not veterinary advice..."
}
```

**Invariants (enforce with runtime assertions and tests, not convention):**
1. `verdict === "toxic"` ⇒ `severity !== null` **and** `emergencyActions.length > 0`
2. `verdict === "unknown"` ⇒ `headline` never contains the substring "safe"
3. `resolvedBy === "model_fallback"` ⇒ `verdict ∈ {caution, unknown}`. Never `safe`.
4. Every `toxic` and `caution` payload has `sources.length > 0`.
5. `severity` is `null` unless `verdict === "toxic"`.

There is no `mechanism`, `riskBand` or weight/amount context: those features are out of scope
(`docs/00-product-spec.md` §6). `signs` and `emergencyActions` are ids, translated by the app.

---

## `GET /v1/kb/manifest`

```jsonc
{ "version": "2026.09.17", "entryCount": 512, "sha256": "...", "minAppVersion": "1.0.0",
  "url": "https://cdn.../kb-2026.09.17.json.gz", "sizeBytes": 214_880 }
```

App checks on cold start (max once per 24 h), downloads and swaps atomically if newer, keeps the
bundled snapshot as fallback. Signature-verify before swapping. This is the path that lets a wrong
verdict be corrected the same day without a store release.

## `GET /v1/hotlines?region=ES`

```jsonc
{ "region": "ES",
  "hotlines": [ { "name": "Servicio de Información Toxicológica", "phone": "+34915620420",
                  "notes": "24 h", "cost": "free" } ],
  "fallback": [ { "name": "ASPCA Animal Poison Control (US)", "phone": "+18884264435", "cost": "fee applies" } ] }
```

Bundled offline for the top ~15 regions; refreshed with the KB manifest. **These numbers must be
verified by a human before each release** and carry a `verifiedAt` date in the source data.

---

## Errors

Uniform envelope. The app maps every code to specific copy; there is no generic "something went
wrong" screen.

```jsonc
{ "error": { "code": "RATE_LIMITED", "message": "…", "retryAfterSec": 42, "requestId": "req_…" } }
```

| Code | HTTP | App behaviour |
|---|---|---|
| `INVALID_REQUEST` | 400 | Developer error — log to Sentry, generic message |
| `UNAUTHENTICATED` | 401 | Missing or malformed `X-Device-Id`. Developer error — regenerate the id and retry once |
| `ATTESTATION_FAILED` | 403 | Reserved: nothing returns it, because attestation is out of scope (D24). Offer offline text lookup |
| `SPEND_CAP_EXCEEDED` | 503 | The global daily cap or the kill switch refused the vision path. "Photo checks are paused for today." **Offline KB lookup, verdicts and hotlines stay available** |
| `RATE_LIMITED` | 429 | Backoff + retry, show remaining seconds |
| `IMAGE_UNUSABLE` | 422 | "That photo's hard to read — try again in better light?" with retake CTA |
| `NO_SUBJECT_FOUND` | 422 | "I couldn't find anything edible in that photo." |
| `PROVIDER_UNAVAILABLE` | 503 | Fall back to text-only resolution, tell the user photos are down |
| `INTERNAL` | 500 | Sentry + offline fallback |

**Every error path must still offer the offline KB and the hotline CTA.** A user in an emergency
with a failing network must not hit a dead end.

---

## Prompt contract (server-side, versioned in `services/api/src/prompts/`)

The identification prompt is versioned (`identify.v3.ts`) and its version is recorded in the request
log, so a regression can be traced to a prompt change. It must:

- state that the job is **identification only**, never a safety judgement
- require JSON matching the provided schema, `temperature: 0`
- require an explicit `null`/low confidence rather than a guess when the image is unclear
- require reading and returning any visible ingredient or brand text verbatim
- require flagging plants at genus level with an explicit note when species cannot be distinguished
- never be asked whether something is toxic
