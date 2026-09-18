# 10 — Hobby Scope, Costs and the No-Vet Editorial Standard

**This document overrides the others wherever they conflict.** Docs 00–09 describe a fully-funded
build; this one describes what is actually being built: a free app, published on both stores, run
by one person, with no revenue and no budget for veterinary or legal review.

Decided 2026-09-18: hobby project · free to users · public on the App Store and Google Play ·
no paid veterinary review available.

---

## 1. What changes, in one table

| Area | Funded plan | Hobby build |
|---|---|---|
| Monetisation | RevenueCat, free tier + subscription | **Removed entirely.** No paywall, no quotas, no purchase code |
| KB size | ~500 entries | **60–80 entries**, each with ≥2 independent authoritative sources |
| Vet review | Licensed vet signs off every entry | **Not available.** Replaced by the editorial standard in §4 |
| Framing | The app gives the answer | **The app signposts to authorities** and shows its sources prominently |
| Risk bands / dose | Weight × amount → risk band | **Cut.** Too expertise-dependent to do unreviewed |
| `mechanism` prose | Authored per entry | **Cut.** Link to the source instead |
| Emergency actions | Per-entry instructions | **Universal set only** — the three lines every authority agrees on |
| Abuse control | App Attest / Play Integrity from day one | **Global spend cap first** (§3). Attestation only if abuse appears |
| Analytics | PostHog funnels | **Cut.** Sentry only. Less to disclose, less to comply with |
| Plant photo ID | Specialist plant-ID API | **Cut.** Plants resolve by typed name; photo-identified plants always low-confidence |
| Phases | 11 | **7** (§7) |

Most of this is deletion, and the result is both cheaper and safer. The features being cut are
precisely the ones that need expertise you do not have.

## 2. What it actually costs to run

| Item | Cost | Notes |
|---|---|---|
| Apple Developer Program | **$99 / year** | Unavoidable for App Store or TestFlight. The main fixed cost |
| Google Play registration | **$25 once** | One-time, lifetime |
| Cloudflare Workers | **€0** | Free plan: 100,000 requests/day. Hobby traffic is a rounding error |
| Cloudflare KV | **€0** | 100k reads/day, **1,000 writes/day**, 1 GB. See the caveat below |
| Cloudflare D1 | **€0** | 5M rows read/day, 100k written, 5 GB |
| Gemini API (paid tier) | **~€1 / month** | At ~100 checks/day. Must be the *paid* tier — see §2.1 |
| EAS Build | **€0** | Free plan: 15 iOS + 15 Android builds/month. Ample |
| EAS Update | **€0** | Free to 1,000 monthly active users — and KB updates go via the Worker anyway, not EAS |
| Sentry | **€0** | Free plan covers hobby error volume |
| Domain | **€0–12 / year** | Optional. A `*.workers.dev` subdomain is free and fine |
| **Total** | **~$99/year + $25 once + a couple of euros a month** | |

**The KV write limit is the one real ceiling.** Free-plan KV allows 1,000 writes per day, and every
cache miss writes. At 100 checks/day that is nowhere near the limit; at 2,000 checks/day it breaks.
If the app ever gets popular, KV writes are the first thing to hit a wall — and Workers Paid is $5/month,
which is the correct response at that point. Design the cache write path so it fails soft: a failed
KV write must degrade to "not cached", never to an error.

### 2.1 Use the paid Gemini tier, even though it costs almost nothing

Google's API terms differ sharply between tiers. On the **free tier**, "Google uses the content you
submit to the Services and any generated responses to provide, improve, and develop Google products
and services", and "human reviewers may read, annotate, and process your API input and output". On
the **paid tier**, "Google doesn't use your prompts … or responses to improve our products."

For an app that uploads photographs taken inside users' homes, the free tier is not an option. It
would have to be disclosed in the privacy policy, and it is the kind of disclosure that would
rightly lose you users.

So: enable billing, use the paid tier, and let it cost a euro a month. Use the free tier only in
development, with your own photos.

## 3. The spend cap is the most important thing you will build

For a funded product the risk is cost per call. For a hobby project the risk is **waking up to a
€2,000 bill** because of a retry loop, a scraper, or one person who found your endpoint. Cost per
call is irrelevant; unbounded volume is not.

Four layers, cheapest and most effective first:

1. **A global daily counter in KV.** One integer, incremented per model call, checked before every
   call. Above the threshold (start at 500/day), the vision path is refused and the app degrades to
   offline-KB-only with an honest message. **This is roughly twenty lines of code and it is the
   layer that actually prevents the disaster.** Build it in the same commit as the first model call,
   not later.
2. **A kill switch.** A boolean in the KV config document that disables the vision path entirely,
   flippable from the Cloudflare dashboard in about ten seconds from a phone. You will want this at
   some point.
3. **Provider-side quota limits.** Set explicit per-project quota caps in the Google Cloud console,
   plus a budget alert. Budget *alerts* do not stop spending on their own — the quota cap is the one
   with teeth.
4. **Per-device rate limiting.** An anonymous device UUID, N checks per hour. Catches accidental
   loops and casual abuse.

App Attest and Play Integrity are deferred, not cancelled. They are the right answer to determined
abuse, but layers 1–3 cover the scenario that actually costs you money, and they cost a morning
rather than a week.

**Degradation must be graceful.** When the cap is hit, the app still does typed lookups offline,
still shows verdicts, still shows the hotline. It just says photos are unavailable right now. That
is a mildly worse app, not a broken one.

## 4. The editorial standard, in place of veterinary review

Without a vet, the app cannot present itself as an authority. It can be excellent as **a fast,
well-organised index into authorities** — which is arguably what a worried owner needs at 2 a.m.
anyway, since the useful action is almost always "call someone".

This is a reframe, not a disclaimer. It changes the product:

- **The source becomes a primary UI element, not a collapsed footnote.** Every result shows, above
  the fold, which authority says this and a link to it. "The Merck Veterinary Manual lists dark
  chocolate as toxic to dogs →". The app's claim is about what the sources say, which is a claim it
  can actually support.
- **Two independent authoritative sources per entry, minimum.** This is an editorial rule a careful
  non-expert can hold honestly. Acceptable sources: the Merck Veterinary Manual, peer-reviewed
  veterinary toxicology literature, university veterinary extension publications, and government
  (FDA/USDA/AEMPS) materials. Pet-blog content is not a source.
- **If two good sources disagree, or coverage is thin, the entry does not ship.** Uncertainty is
  handled by omission, and omission renders as `unknown` — which already routes the user to a vet.
  That is the correct outcome.
- **No `mechanism` prose.** Explaining methylxanthine metabolism in your own words is where a
  non-expert most easily goes wrong, and it adds nothing a link cannot. Cut it entirely.
- **No dose bands, no weight input, no risk banding.** The highest-expertise feature in the plan.
  Without review it should not exist. "Toxic — call your vet" is honest; "moderate risk for an 8 kg
  dog" is a clinical judgement.
- **Emergency actions are the universal set only**, identical across entries: call your vet or a
  poison line now; do not induce vomiting unless told to; bring the packaging. Every authority
  agrees on these. Entry-specific medical instructions are exactly what you cannot write.
- **Plants get special handling.** They are the most dangerous category to misidentify and the
  hardest for a general model. Typed plant lookups are fine. Photo-identified plants are always
  treated as low confidence, always require confirmation, and always show a "plant identification
  from photos is unreliable — confirm with a vet" notice regardless of the model's confidence.

Write all of this down in the repo as an explicit editorial policy, and hold the line when adding
entries later. The temptation to add "just one more" unsourced item is how a careful project stops
being careful.

**If you later find a vet willing to review 60–80 entries as a favour, take it.** That is a plausible
ask for a short list and an implausible one for 500 — another reason the scope cut is the right move
rather than a compromise.

### Be clear-eyed about the residual risk

Publishing a free pet-safety app to the public without veterinary review carries real risk that no
disclaimer fully removes. The mitigations above are genuine and they are the right ones — narrow
scope, strong sourcing, source-forward presentation, omission under uncertainty, and routing every
serious case to a professional. They reduce the risk substantially. They do not eliminate it, and
you should go in knowing that rather than discovering it later.

## 5. Legal, on no budget

Not legal advice, and the honest summary is that the mitigations which matter most here are free.

- **Not charging money helps.** It removes some consumer-protection and commercial-liability angles.
  It does not remove a negligence claim, so it is a reason to be careful, not a reason to relax.
- **Collect nothing.** No accounts, no email, no location, no analytics beyond crash reports. This is
  the single biggest simplification available: GDPR compliance for "we store nothing" is close to
  trivial, and there is no breach to have.
- **Write the privacy policy yourself, honestly.** A generated boilerplate policy describing data you
  do not collect is worse than a short accurate one. It needs to say: photos are sent to Google's
  Gemini API for identification and not stored by us; we use the paid tier, which is not used to
  train their models; crash reports go to Sentry; nothing else leaves the device.
- **Disclose the AI step and get consent at first run.** Apple requires this explicitly (5.1.2), and
  it is right regardless.
- **Terms of service** can be short: information not advice, no warranty, limitation of liability,
  contact address. A template is acceptable here in a way it is not for the privacy policy.
- **Publishing as an individual** is fine in Spain for a free app with no revenue; you are not
  required to register as autónomo to give something away. That changes the moment you monetise —
  and it is one more reason not to.
- **A contact email is mandatory** under both stores' policies anyway. Use one you will actually read,
  since it is also where "this answer is wrong" reports arrive.
- **The "report a wrong answer" flow stays.** It is a Google Play requirement for AI content, your KB
  improvement channel, and evidence of diligence if anything ever goes wrong. Cheapest insurance in
  the project.

## 6. What this means for localisation

Unchanged in principle, much smaller in practice. The tiered model in `docs/09-localisation.md`
still applies, but with 60–80 entries and no `mechanism` prose, Tier C disappears entirely and
Tiers A and B are perhaps 250 short strings per language.

Crucially, **the cost was "hire a bilingual vet" and that is no longer the shape of the work.** You
are authoring the English yourself from cited sources; if you write Spanish natively, doing both
languages is your own time rather than anyone's invoice. The alias lists — the part that must be
translated — need a native speaker, which you are.

Decide es-ES versus es-419 before alias authoring starts (`docs/08` §4). For a hobby project
starting in Spain, es-ES is the obvious first target; adding Latin American aliases later is a
per-entry pass, but over 80 entries rather than 500, which makes it a weekend rather than a project.

## 7. Revised phase plan

Seven phases instead of eleven. Acceptance criteria from `docs/07-implementation-plan.md` still
apply except where a feature has been cut.

| Phase | Contents | Rough size |
|---|---|---|
| **H0 · Foundations** | Monorepo, Zod schemas, CI, i18n + ICU, language/region settings, EAS project | As doc 07 Phase 0 |
| **H1 · Knowledge base** | 60–80 entries, ≥2 sources each, en + es, controlled vocabulary, `resolveVerdict()`, fixtures. **No mechanism, no dose bands** | The long pole — weeks, not days |
| **H2 · Design system + UI** | Tokens, components, all screens on mock data. **Source-forward result screen.** a11y, `es` at 200% | As doc 07 Phase 2 |
| **H3 · Capture + offline** | Camera, picker, barcode, image pipeline, bundled KB, fuzzy resolution. Fully working offline text app at the end of this phase | Doc 07 Phases 3 + 4 merged |
| **H4 · Worker** | Hono, one provider (paid tier), **global daily cap, kill switch, quota caps, device rate limit**, KV cache, KB manifest | Doc 07 Phase 5, minus attestation |
| **H5 · Integration + safety** | Full flow, confirm gate, error states, first-run AI consent, disclaimers, hotlines, report-a-wrong-answer, privacy policy and ToS | Doc 07 Phases 6 + 7 merged |
| **H6 · Store submission** | Health declarations, data safety form, privacy manifest, listings in en + es, review notes, internal testing | As doc 07 Phase 10 |

**A useful checkpoint:** at the end of H3 you have a complete, working, free, offline app that
answers typed questions with sourced verdicts — no server, no API key, no spend, no AI consent
screen, and far less to disclaim. That is a genuinely shippable thing. Consider shipping it, then
adding photos in H4–H5 as a second release. It de-risks the store review, gets the app in front of
real users sooner, and means the model spend only starts once you know anyone wants it.

## 8. Cut list — do not build these

RevenueCat and any purchase code · pet weight input · dose bands and risk banding · `mechanism`
prose · entry-specific emergency instructions · App Attest / Play Integrity (deferred) · PostHog ·
specialist plant-ID API · history cloud sync · multiple pet profiles · load testing at 100
concurrent · the 500-entry KB · Tier C translation.

If one of these becomes genuinely necessary later, the funded plan in docs 00–09 describes how to
build it properly. Until then, every one of them is time not spent on the knowledge base, which is
the only part of this app that users will actually judge.
