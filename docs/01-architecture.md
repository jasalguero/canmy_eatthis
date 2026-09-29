# 01 — Architecture

## 1. The central design decision

> **The model identifies. The database adjudicates.**

A vision LLM is excellent at answering *"what is in this picture?"* and mediocre — and, crucially,
non-deterministic and unauditable — at answering *"is this toxic to a cat?"*. Those are two different
jobs and this app separates them completely.

```
photo/text ──► IDENTIFY (LLM / barcode) ──► canonical item id
                                                              │
                                                              ▼
                                            ADJUDICATE (curated, sourced KB)
                                                              │
                                                              ▼
                                                      verdict + copy + sources
```

Consequences of this split, all of them good:

- The same question always gets the same answer. A safety app that answers differently on Tuesday
  is not a safety app.
- Every verdict carries a citation, because KB entries carry citations.
- A wrong verdict is a *data bug*, fixable in minutes by editing one JSON row and pushing an OTA
  update — not a prompt-engineering session with uncertain blast radius.
- The KB can be audited entry by entry against its cited sources. A prompt cannot.
- Most queries never reach a model at all.

The LLM is allowed to produce a free-form verdict in exactly one case: the item was identified
confidently but has no KB entry. That result is tagged `source: "model_fallback"`, is capped at
`caution` or `unknown` (**never `safe`**), renders with a visible "not in our verified database"
notice, and is logged for KB backfill.

## 2. System shape

```
┌─────────────────────────── DEVICE ──────────────────────────────┐
│                                                                  │
│  Expo / React Native app                                         │
│   ├── bundled KB snapshot (JSON, ~600 KB)  ◄── OTA updatable     │
│   ├── local resolver (normalise → alias index → fuzzy)           │
│   ├── image pipeline (resize 1024px, JPEG q0.8, strip EXIF)      │
│   ├── barcode scanner + Open Food Facts lookup (D29)             │
│   └── SQLite history                                             │
│                                                                  │
└───────────────────┬──────────────────────────────────────────────┘
                    │  HTTPS + anonymous device id
                    │  (only when local resolution fails or a photo is present)
                    ▼
┌────────────────── EDGE (Cloudflare Worker) ─────────────────────┐
│                                                                  │
│  POST /v1/identify                                               │
│   ├── kill switch → global daily cap → rate limit (per device)   │
│   ├── cache lookup: KV[hash(species, normalised text, imghash)]  │
│   ├── route:  barcode → OFF lookup                               │
│   │           else → vision LLM (structured output)              │
│   ├── resolve candidates against server KB (authoritative copy)  │
│   ├── apply override list (always wins over model)               │
│   └── cache + return                                             │
│                                                                  │
│  GET /v1/kb/manifest, GET /v1/kb/delta?since=  (OTA KB updates)  │
│  GET /v1/hotlines?region=                                        │
│                                                                  │
│  Secrets: model API keys — never leave this boundary             │
└──────────────────────────────────────────────────────────────────┘
```

## 3. Resolution pipeline

Ordered, cheapest-first. Each tier can terminate the request.

| # | Tier | Latency | Cost | Handles |
|---|---|---|---|---|
| 0 | **On-device exact/alias match** | <20 ms | 0 | "chocolate", "uvas", "xylitol" — the majority of typed queries |
| 1 | **On-device fuzzy match** (fuse.js, threshold tuned conservatively) | <50 ms | 0 | "chocolat", "xilitol", "onyon" |
| 2 | **Barcode → Open Food Facts / Open Pet Food Facts** | ~400 ms | 0 | Any packaged product. Exact. Looked up from the app (D29). Returns an ingredient list, which is then scanned for KB-known ingredients |
| 3 | **Server cache hit** | ~60 ms | 0 | Repeat photos/queries across all users |
| 4 | **Vision LLM identify** | 1–3 s | ~$0.0004 | Everything else |
| 5 | **Model fallback verdict** | — | — | Identified but not in KB. Capped at `caution`/`unknown` |

Tiers 0–1 are why the app feels instant and works on a plane. Tier 2 is why packaged goods are
exact rather than guessed. Tier 3 is why the model bill stays small.

Local resolution is attempted **even when a photo is present**: if the user typed "dark chocolate"
and attached a photo, tier 0 answers immediately and the photo is used only to enrich the confirm
screen. Typed text is stronger evidence than a photo and should be treated as such.

## 4. The three questions, answered

### 4.1 Can everything run in the app?

**Technically yes. Practically no — but the server needed is very small.**

A fully on-device build is buildable: bundle the KB, ship a quantised on-device vision model
(ExecuTorch / TFLite / Core ML) or ML Kit image labelling, never touch the network. It would be
free to run and would work offline. It is the wrong trade for this product, for five reasons in
descending order of importance:

1. **The API key.** A key shipped in a React Native binary is a public key. The JS bundle inside an
   `.ipa`/`.apk` is trivially extracted; native string constants are trivially dumped; a proxy on a
   rooted device reads it off the wire regardless of obfuscation or `expo-secure-store`. It must be
   in plaintext at the moment of the call. Every major provider's terms prohibit distributing keys
   client-side. Someone will find it and spend your money. This alone decides the question.
2. **Prompt and rule updates without store review.** If the app mislabels something dangerous, the
   fix must land the same day. An on-device model means an app update, a review queue and a user
   base that upgrades over weeks. For a safety app this is unacceptable.
3. **On-device vision cannot read labels.** The single highest-value recognition task here is
   spotting "xylitol" in an ingredient list on a packet of gum. That is OCR plus reading
   comprehension. Small on-device classifiers emit a fixed label set; they cannot do it.
4. **Open vocabulary.** The set of things a pet might eat is unbounded — foods, plants, human
   medications, cleaning products, garden chemicals, toys. Fixed-label classifiers require a label
   list and training data you do not have.
5. **Cost control and abuse.** Without a server there is no rate limit and no quota.

**The chosen middle ground:** knowledge on-device, perception behind a proxy. A single Cloudflare
Worker with no database of its own beyond KV and D1. Idle cost is effectively zero; there is no
server to patch, scale or SSH into.

**What the app still does fully offline:** every typed query that matches the bundled KB, all
history, all previously seen results, and the emergency hotline numbers. This is the part that
matters most in the emergency case, where signal may be poor and time is short.

### 4.2 Is an LLM the right tool for identification?

**Yes, for identification. No, for the verdict.** (See §1.)

Why a general vision LLM beats a purpose-trained classifier *for this job*:

- **Open vocabulary.** No label list to define, no training set to collect.
- **It reads text in the image.** Ingredient panels, medication blister packs, plant nursery tags,
  brand names. This is worth more than raw classification accuracy here.
- **It handles compound scenes and context.** "A bowl with grapes and cheese" yields two candidates.
- **Structured output.** All current providers support JSON-schema-constrained responses, so the
  output is parseable and typed rather than prose to regex.
- **Zero upfront ML work.** There is no dataset, no training loop, no MLOps.

Its weaknesses, and what covers each:

| Weakness | Cover |
|---|---|
| Confidently wrong on fine-grained species (lily vs. daylily) | Mandatory confirm screen + `confusable_with` alternates + photo-identified plants always treated as low confidence |
| Hallucinated confidence | Never trust the model's self-reported confidence alone; calibrate against a held-out test set and use conservative thresholds |
| Non-determinism | Verdicts do not come from the model; `temperature: 0`; server cache makes repeats identical |
| Cannot judge quantity or the pet's weight | Not asked for: a toxic item routes to a vet whatever the amount. No dose or risk bands (`docs/00-product-spec.md` §6) |
| Latency and per-call cost | Tiers 0–3 mean most requests never reach it |

**Specific model choice (Sept 2026 pricing, verify before building):**

| Model | Input $/1M | Output $/1M | Role |
|---|---|---|---|
| `gpt-5.6-luna` | $0.10–0.20 | — | Cheapest vision tier; good default for identification |
| Gemini 3.5 Flash-Lite | $0.30 | $2.50 | Strong cheap alternative; generous free tier for development |
| Gemini 3.8 Flash | $0.75 | $3.75 | Escalation tier for low-confidence or high-risk items |
| Claude Haiku 4.5 | $1 | $5 | Escalation / second-opinion tier |

Build a **provider adapter interface** in the Worker and put at least two behind it from day one.
Prices and model names on this list have moved repeatedly; the adapter is what keeps that from
being an app release. Route: cheap model first → if `confidence < 0.7` or the primary candidate is
flagged `high_risk` in the KB, re-run on the escalation model and take the more cautious answer.

A rough cost per uncached check: ~1,100 image tokens + ~700 prompt tokens + ~250 output tokens.
At Flash-Lite rates that is well under **$0.001**. With a 70% cache hit rate, ~**$0.0003** per check
amortised — roughly **$3 per 10,000 checks**. The model bill is not the constraint; careful
sourcing of the knowledge base is. The real cost risk is an *unbounded* bill, which §6 covers.

**Alternatives worth adding (not replacing):**

- **Barcode scanning.** Free, instant, exact, and it returns an ingredient list. For packaged goods
  it is strictly better than vision. It ships in the first release, looked up from the app (D29).
- **Specialist plant ID** (Plant.id, PlantNet) is out of scope (`docs/00-product-spec.md` §6).
  Plants are where misidentification is most lethal, so plants resolve by typed name, and a
  photo-identified plant is always low confidence, always confirmed, and always carries a
  "confirm with a vet" notice.
- **On-device pre-filter** (ML Kit image labelling). Not a replacement — a *router and gate*. Reject
  useless photos (blurry, a photo of the pet, a selfie) before spending an API call, and tag
  plant-vs-packaged-vs-prepared to pick the downstream route. Cheap accuracy and latency win.
- **CLIP embeddings against a curated reference set.** Viable for a closed set, considerable work,
  worse than a VLM at the open-vocabulary case. Not recommended.

### 4.3 Can the UI be genuinely good?

Yes, and it is mostly a discipline problem rather than a technology one. The requirements are a
strict design-token system defined before any screen is built, `react-native-reanimated` for
motion that runs on the UI thread, haptics on verdict reveal, and a verdict screen that is designed
rather than assembled. See `docs/06-ui-design-system.md`.

## 5. Data flow, privacy-relevant

1. Photo captured → resized to 1024 px longest edge, JPEG q0.8 (~120–180 KB), **EXIF stripped**
   (GPS in particular) on-device before it leaves the phone.
2. Sent over TLS to the Worker. The Worker holds it in memory, forwards it to the model provider,
   and **does not persist it**. A perceptual hash is stored for cache keying; the image is not.
3. The model provider's retention policy applies to the forwarded copy — this must be named in the
   privacy policy and consented to at first run (Apple 5.1.2 requires explicit consent before
   sharing personal data with a third-party AI service).
4. History is stored locally in SQLite, including the thumbnail. Nothing syncs.
5. A barcode scan sends the barcode — and, like any request, the device's IP address — to Open
   Pet Food Facts and Open Food Facts, from the app (D29). Nothing else about the user is sent.

Opting out of photo upload is possible and should be offered: text-only mode is fully functional.

## 6. Running costs and the spend cap

### 6.1 What it costs to run

| Item | Cost | Notes |
|---|---|---|
| Apple Developer Program | **$99 / year** | Required for the App Store and TestFlight. The main fixed cost |
| Google Play registration | **$25 once** | One-time, lifetime |
| Cloudflare Workers | **€0** | Free plan: 100,000 requests/day |
| Cloudflare KV | **€0** | 100k reads/day, **1,000 writes/day**, 1 GB. See below |
| Cloudflare D1 | **€0** | 5M rows read/day, 100k written, 5 GB |
| Gemini API (paid tier) | **~€1 / month** | At ~100 checks/day. Must be the *paid* tier — §6.2 |
| EAS Build | **€0** | Free plan: 15 iOS + 15 Android builds/month |
| EAS Update | **€0** | Free to 1,000 monthly active users; KB updates go via the Worker anyway |
| Sentry | **€0** | If added; the free plan covers this error volume |
| Domain | **€0–12 / year** | Optional. A `*.workers.dev` subdomain is free and fine |
| **Total** | **~$99/year + $25 once + a couple of euros a month** | |

**The KV write limit is the one real ceiling.** Free-plan KV allows 1,000 writes per day, and every
cache miss writes. At 100 checks/day that is nowhere near the limit; at 2,000 checks/day it breaks.
Workers Paid ($5/month) is the answer at that point. The cache write path fails soft: a failed KV
write degrades to "not cached", never to an error.

### 6.2 Use the paid Gemini tier

Google's API terms differ sharply between tiers. On the **free tier**, "Google uses the content you
submit to the Services and any generated responses to provide, improve, and develop Google products
and services", and "human reviewers may read, annotate, and process your API input and output". On
the **paid tier**, "Google doesn't use your prompts … or responses to improve our products."

For an app that uploads photographs taken inside users' homes, the free tier is not an option. Use
the paid tier in production and the free tier only in development, with your own photos.

### 6.3 The spend cap

The cost risk is not cost per call. It is **waking up to a €2,000 bill** because of a retry loop, a
scraper, or someone who found the endpoint. Four layers, cheapest and most effective first:

1. **A global daily counter in KV.** One integer, incremented per model call, checked before every
   call. Above the threshold (start at 500/day), the vision path is refused and the app degrades to
   offline-KB-only with an honest message. Built in the same commit as the first model call
   (AGENTS.md #17).
2. **A kill switch.** A KV value that disables the vision path entirely, flippable from the
   Cloudflare dashboard in about ten seconds from a phone.
3. **Provider-side quota limits.** Explicit per-project quota caps in the Google Cloud console, plus
   a budget alert. Budget *alerts* do not stop spending on their own — the quota cap does.
4. **Per-device rate limiting.** An anonymous device UUID, N checks per hour. Catches accidental
   loops and casual abuse; it cannot stop someone who rotates device ids, which layers 1–3 bound.

Device attestation (App Attest / Play Integrity) is the answer to determined abuse, and is out of
scope until that appears (`docs/00-product-spec.md` §6).

**Degradation is graceful.** When the cap is hit, the app still does typed lookups offline, still
shows verdicts, still shows the hotlines. It says photos are unavailable right now. That is a mildly
worse app, not a broken one.
