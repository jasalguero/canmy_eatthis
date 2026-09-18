# 01 — Architecture

## 1. The central design decision

> **The model identifies. The database adjudicates.**

A vision LLM is excellent at answering *"what is in this picture?"* and mediocre — and, crucially,
non-deterministic and unauditable — at answering *"is this toxic to a cat?"*. Those are two different
jobs and this app separates them completely.

```
photo/text ──► IDENTIFY (LLM / barcode / plant API) ──► canonical item id
                                                              │
                                                              ▼
                                            ADJUDICATE (curated vet-reviewed KB)
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
- The KB can be reviewed and signed off by a veterinarian. A prompt cannot.
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
│   ├── barcode scanner (expo-camera)                              │
│   └── SQLite history                                             │
│                                                                  │
└───────────────────┬──────────────────────────────────────────────┘
                    │  HTTPS + attestation token
                    │  (only when local resolution fails or a photo is present)
                    ▼
┌────────────────── EDGE (Cloudflare Worker) ─────────────────────┐
│                                                                  │
│  POST /v1/identify                                               │
│   ├── verify App Attest / Play Integrity token                   │
│   ├── rate limit (per device, per IP)                            │
│   ├── cache lookup: KV[hash(species, normalised text, imghash)]  │
│   ├── route:  barcode → OFF lookup                               │
│   │           plant-ish → plant-ID API (optional, phase 9)       │
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
| 2 | **Barcode → Open Food Facts / Open Pet Food Facts** | ~400 ms | 0 | Any packaged product. Exact. Returns an ingredient list, which is then scanned for KB-known toxic ingredients |
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
| Confidently wrong on fine-grained species (lily vs. daylily) | Mandatory confirm screen + `confusable_with` alternates + optional specialist plant-ID API |
| Hallucinated confidence | Never trust the model's self-reported confidence alone; calibrate against a held-out test set and use conservative thresholds |
| Non-determinism | Verdicts do not come from the model; `temperature: 0`; server cache makes repeats identical |
| Cannot judge quantity or the pet's weight | Ask the user; present risk *bands*, never a computed dose |
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
amortised — roughly **$3 per 10,000 checks**. The model bill is not the constraint on this business;
the veterinary review of the KB is.

**Alternatives worth adding (not replacing):**

- **Barcode scanning.** Free, instant, exact, and it returns an ingredient list. For packaged goods
  it is strictly better than vision. Ship it in v1.
- **Specialist plant ID** (Plant.id, PlantNet). Plants are where misidentification is most lethal
  and where general VLMs are weakest. Route plant-looking photos here in a later phase.
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

Opting out of photo upload is possible and should be offered: text-only mode is fully functional.
