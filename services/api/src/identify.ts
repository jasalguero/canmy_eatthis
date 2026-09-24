import {
  type Candidate,
  type ConfidenceBand,
  type IdentifyRequest,
  type IdentifyResponse,
  IdentifyResponseSchema,
  type ImageQuality,
} from '@canmyeatthis/shared';
import { type BarcodeProduct, lookupBarcode, matchIngredientsAgainstKb } from './barcode.js';
import { type VisionConfig, effectiveDailyCap } from './config.js';
import { ApiFailure } from './errors.js';
import { validateImages } from './images.js';
import {
  type Language,
  buildVerdict,
  getAlternates,
  getKbEntry,
  getKbVersion,
  languageFromLocale,
  normalise,
  resolveCandidateLabel,
  resolveExact,
  resolveOffline,
} from './kb.js';
import {
  buildCacheKey,
  checkAndReserveDailyCap,
  checkDeviceRateLimit,
  getCachedResponse,
  isKillSwitchActive,
  secondsUntilUtcMidnight,
  setCachedResponse,
} from './kv.js';
import { type ModelOutput, PROMPT_VERSION } from './prompts/identify.v1.js';
import {
  type ProviderResult,
  ProviderUnavailableError,
  type VisionProvider,
} from './providers/types.js';
import { DISCLAIMER } from './strings.js';

export interface IdentifyDeps {
  kv: KVNamespace;
  /** `null` when no API key is configured — the vision path then reports itself unavailable. */
  provider: VisionProvider | null;
  config: VisionConfig;
  envDailyCap: number;
  deviceHourlyLimit: number;
  lookupBarcode?: (barcode: string) => Promise<BarcodeProduct | null>;
}

/** Filled in as the request progresses and written as one structured log line by the route. */
export interface IdentifyLog {
  promptVersion: string | null;
  kbVersion: string;
  provider: string | null;
  model: string | null;
  cached: boolean;
  resolvedBy: IdentifyResponse['resolvedBy'] | null;
  /** docs/07 Phase 5: the *normalised* query only — never raw text, never image bytes. */
  query: string;
  imageCount: number;
  escalated: boolean;
  modelDetail: string | null;
}

/** Plants are low confidence from a photo whatever the model says (docs/10 §4). */
function confidenceBand(confidence: number, category: string): ConfidenceBand {
  if (category === 'plant') return 'low';
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

const OK_IMAGE: ImageQuality = { usable: true, reason: null };
const NO_MODEL_META = { provider: 'none', model: 'none', cached: false } as const;

/**
 * `POST /v1/identify`, in cost order — every free way to answer is tried before the paid one:
 *
 *   1. barcode → Open Food Facts ingredient scan (free, exact)
 *   2. text only → the same exact/fuzzy KB resolution the app runs offline (free)
 *   3. response cache (free)
 *   4. kill switch → device rate limit → global daily cap → the model (paid)
 *
 * Every model-derived response has `needsConfirmation: true` and `verdict: null`: the model names
 * candidates, the user confirms one, and only then does `resolveVerdict()` produce a verdict
 * (AGENTS.md #1). The outbound response is validated against `IdentifyResponseSchema`, whose
 * invariants make a `model_fallback` "safe" verdict unrepresentable rather than merely avoided.
 */
export async function identify(
  req: IdentifyRequest,
  deviceId: string,
  requestId: string,
  deps: IdentifyDeps,
  log: IdentifyLog,
): Promise<IdentifyResponse> {
  const startedAt = Date.now();
  const language = languageFromLocale(req.locale);
  const text = req.text && req.text.length > 0 ? req.text : null;
  log.kbVersion = getKbVersion(language);
  log.query = text ? normalise(text) : '';
  log.imageCount = req.images.length;

  // Validate images before anything else, so a malformed photo is a 400 even when a barcode
  // would have answered — the client has a bug either way.
  const images = await validateImages(req.images);

  const finish = (response: Omit<IdentifyResponse, 'requestId'>): IdentifyResponse => {
    log.resolvedBy = response.resolvedBy;
    return IdentifyResponseSchema.parse({ ...response, requestId });
  };

  // 1. Barcode.
  if (req.barcode) {
    const fromBarcode = await identifyByBarcode(
      req.barcode.value,
      language,
      deps,
      text,
      images.length,
    );
    if (fromBarcode) {
      return finish({
        ...fromBarcode,
        meta: { ...NO_MODEL_META, latencyMs: Date.now() - startedAt },
      });
    }
  }

  // 2. Text only: the offline tiers. A photo always goes to the model, even with text — the
  // photo may show something other than what was typed.
  if (text && images.length === 0) {
    const resolution = resolveOffline(text);
    if (resolution.kbId) {
      const entry = getKbEntry(resolution.kbId, language);
      if (entry) {
        const exact = resolution.type === 'exact';
        return finish({
          resolvedBy: exact ? 'kb_exact' : 'kb_fuzzy',
          needsConfirmation: !exact,
          candidates: [
            {
              id: 'cand_1',
              label: entry.displayName,
              kbId: entry.id,
              confidence: exact ? 1 : 0.7,
              confidenceBand: exact ? 'high' : 'medium',
            },
          ],
          alternates: getAlternates(entry.id, language),
          verdict: exact
            ? buildVerdict({
                kbId: entry.id,
                species: req.species,
                language,
                disclaimer: DISCLAIMER[language],
              })
            : null,
          imageQuality: OK_IMAGE,
          meta: { ...NO_MODEL_META, latencyMs: Date.now() - startedAt },
        });
      }
    }
  }

  if (!text && images.length === 0) {
    // Only a barcode was sent and it answered nothing.
    throw new ApiFailure('NO_SUBJECT_FOUND', 'barcode not found and no other input to try');
  }

  // 3–4. The paid path. The kill switch comes before the cache: it exists to stop the vision
  // path *entirely*, including when cached model answers turn out to be the problem.
  if (await isKillSwitchActive(deps.kv)) {
    throw new ApiFailure('PROVIDER_UNAVAILABLE', 'vision path disabled by kill switch');
  }

  const cacheKey = await buildCacheKey({
    species: req.species,
    language,
    normalisedText: log.query,
    imageHashes: images.map((i) => i.hash),
    promptVersion: PROMPT_VERSION,
    kbVersion: log.kbVersion,
  });
  const cached = IdentifyResponseSchema.safeParse(
    await getCachedResponse<unknown>(deps.kv, cacheKey),
  );
  if (cached.success) {
    log.cached = true;
    log.promptVersion = PROMPT_VERSION;
    return finish({
      ...cached.data,
      resolvedBy: 'cache',
      meta: { ...cached.data.meta, cached: true, latencyMs: Date.now() - startedAt },
    });
  }

  if (!deps.provider) {
    throw new ApiFailure('PROVIDER_UNAVAILABLE', 'no vision provider configured');
  }

  const rate = await checkDeviceRateLimit(deps.kv, deviceId, deps.deviceHourlyLimit);
  if (!rate.allowed) {
    throw new ApiFailure('RATE_LIMITED', 'device hourly limit reached', rate.retryAfterSec);
  }

  const cap = effectiveDailyCap(deps.envDailyCap, deps.config);
  const reserve = () => checkAndReserveDailyCap(deps.kv, cap);
  if (!(await reserve()).allowed) {
    throw new ApiFailure(
      'SPEND_CAP_EXCEEDED',
      'global daily vision cap reached',
      secondsUntilUtcMidnight(),
    );
  }

  log.provider = deps.provider.id;
  log.promptVersion = PROMPT_VERSION;
  const input = { text, images: images.map((i) => i.data), language };

  let model = deps.config.primaryModel;
  log.model = model;
  let result: ProviderResult;
  try {
    result = await deps.provider.identify(input, model);
  } catch (err) {
    if (err instanceof ProviderUnavailableError) {
      log.modelDetail = err.message;
      throw new ApiFailure('PROVIDER_UNAVAILABLE', 'vision provider unavailable');
    }
    throw err;
  }

  // Escalation (docs/07 Phase 5): a low-confidence or high-risk answer is re-asked of the
  // stronger model, and the more cautious combination kept. The second call reserves its own
  // slot against the cap — escalation can never be how the cap is exceeded.
  if (
    result.kind === 'ok' &&
    deps.config.escalationModel &&
    shouldEscalate(result.output, deps.config)
  ) {
    if ((await reserve()).allowed) {
      try {
        const escalated = await deps.provider.identify(input, deps.config.escalationModel);
        if (escalated.kind === 'ok') {
          result = { kind: 'ok', output: mergeCautiously(result.output, escalated.output) };
          model = deps.config.escalationModel;
          log.model = model;
          log.escalated = true;
        }
      } catch (err) {
        // The primary answer stands; the stronger model being down is not the user's problem.
        if (!(err instanceof ProviderUnavailableError)) throw err;
      }
    }
  }

  const meta = { provider: deps.provider.id, model, cached: false, latencyMs: 0 };

  if (result.kind === 'malformed') {
    // docs/07 Phase 5: malformed model output degrades to `unknown`, never a crash. No
    // candidates, no verdict: the app renders its own `unknown` result. Not cached — the next
    // attempt deserves a fresh call.
    log.modelDetail = result.detail;
    return finish({
      resolvedBy: 'model_fallback',
      needsConfirmation: true,
      candidates: [],
      alternates: [],
      verdict: null,
      imageQuality: OK_IMAGE,
      meta: { ...meta, latencyMs: Date.now() - startedAt },
    });
  }

  const output = result.output;
  if (images.length > 0 && !output.imageQuality.usable) {
    throw new ApiFailure('IMAGE_UNUSABLE', output.imageQuality.reason ?? 'image unusable');
  }
  if (images.length > 0 && output.candidates.length === 0) {
    throw new ApiFailure('NO_SUBJECT_FOUND', 'nothing identifiable in the image');
  }

  const candidates = toCandidates(output, language, images.length);
  const primary = candidates.find((c) => c.kbId !== null);
  const response = finish({
    // `model` only when at least one candidate landed on a KB entry; otherwise nothing the model
    // said maps to curated data and the app must show `unknown`.
    resolvedBy: primary ? 'model' : 'model_fallback',
    needsConfirmation: true,
    candidates,
    alternates: primary?.kbId ? getAlternates(primary.kbId, language) : [],
    verdict: null,
    imageQuality: images.length > 0 ? output.imageQuality : OK_IMAGE,
    meta: { ...meta, latencyMs: Date.now() - startedAt },
  });

  if (response.resolvedBy === 'model') {
    await setCachedResponse(deps.kv, cacheKey, response);
  }
  return response;
}

async function identifyByBarcode(
  value: string,
  language: Language,
  deps: IdentifyDeps,
  text: string | null,
  imageCount: number,
): Promise<Omit<IdentifyResponse, 'requestId' | 'meta'> | null> {
  const hasFallback = text !== null || imageCount > 0;
  let product: BarcodeProduct | null;
  try {
    product = await (deps.lookupBarcode ?? lookupBarcode)(value);
  } catch {
    if (hasFallback) return null;
    throw new ApiFailure('PROVIDER_UNAVAILABLE', 'barcode database unreachable');
  }
  if (!product || !product.ingredientsText) return null;

  const detectedIngredients = product.ingredientsText
    .split(/[,;]/)
    .map((i) => i.trim())
    .filter(Boolean);
  const matches = matchIngredientsAgainstKb(product.ingredientsText, language);

  const candidates: Candidate[] =
    matches.length > 0
      ? matches.map((m, i) => ({
          id: `cand_${i + 1}`,
          label: m.label,
          kbId: m.kbId,
          confidence: 1,
          confidenceBand: 'high' as const,
          detectedIngredients,
        }))
      : [
          {
            id: 'cand_1',
            label: product.productName ?? value,
            kbId: null,
            confidence: 1,
            confidenceBand: 'high' as const,
            detectedIngredients,
          },
        ];

  return {
    resolvedBy: 'barcode',
    // Always confirm (D24): a KB match is one *ingredient* of the product, and a verdict for
    // "carrot" is not a verdict for the soup it came in.
    needsConfirmation: true,
    candidates,
    alternates: [],
    verdict: null,
    imageQuality: OK_IMAGE,
  };
}

export function shouldEscalate(output: ModelOutput, config: VisionConfig): boolean {
  const top = output.candidates[0];
  if (!top) return false;
  if (top.confidence < config.escalationThreshold) return true;
  return output.candidates.some((c) => {
    const kbId = resolveCandidateLabel(c.label, c.commonName);
    return kbId !== null && (getKbEntry(kbId, 'en')?.highRisk ?? false);
  });
}

/**
 * "Take the more cautious result": the escalated model's candidates lead, anything only the
 * primary model saw is kept so the user can still pick it at the confirm screen, a candidate both
 * models named keeps the *lower* of the two confidences, and a photo is only usable if both
 * models agree it is.
 */
export function mergeCautiously(primary: ModelOutput, escalated: ModelOutput): ModelOutput {
  const keyOf = (c: ModelOutput['candidates'][number]) =>
    resolveCandidateLabel(c.label, c.commonName) ?? `label:${normalise(c.label)}`;

  const merged = new Map<string, ModelOutput['candidates'][number]>();
  for (const c of escalated.candidates) {
    if (!merged.has(keyOf(c))) merged.set(keyOf(c), c);
  }
  for (const c of primary.candidates) {
    const existing = merged.get(keyOf(c));
    if (existing) {
      merged.set(keyOf(c), {
        ...existing,
        confidence: Math.min(existing.confidence, c.confidence),
      });
    } else {
      merged.set(keyOf(c), c);
    }
  }
  return {
    imageQuality: {
      usable: primary.imageQuality.usable && escalated.imageQuality.usable,
      reason: escalated.imageQuality.reason ?? primary.imageQuality.reason,
    },
    candidates: [...merged.values()].sort((a, b) => b.confidence - a.confidence).slice(0, 5),
  };
}

/**
 * Model candidates → contract candidates. Each label is mapped to a KB id by exact alias only;
 * each visible ingredient that exactly matches a KB entry becomes its own candidate too (raisins
 * in a cookie), at the parent's confidence, so it is never hidden behind the item it came in.
 */
function toCandidates(output: ModelOutput, language: Language, imageCount: number): Candidate[] {
  const out: Candidate[] = [];
  const seenKbIds = new Set<string>();

  const push = (c: Omit<Candidate, 'id'>) => {
    if (c.kbId) {
      if (seenKbIds.has(c.kbId)) return;
      seenKbIds.add(c.kbId);
    }
    out.push({ id: `cand_${out.length + 1}`, ...c });
  };

  for (const mc of output.candidates) {
    const kbId = resolveCandidateLabel(mc.label, mc.commonName);
    const imageIndex =
      mc.imageIndex !== null && mc.imageIndex < imageCount ? { imageIndex: mc.imageIndex } : {};
    push({
      label: mc.label,
      kbId,
      confidence: mc.confidence,
      confidenceBand: confidenceBand(mc.confidence, mc.category),
      ...(mc.detectedIngredients.length > 0 ? { detectedIngredients: mc.detectedIngredients } : {}),
      ...imageIndex,
    });
    for (const ingredient of mc.detectedIngredients) {
      const ingredientKbId = resolveExact(ingredient);
      const entry = ingredientKbId ? getKbEntry(ingredientKbId, language) : undefined;
      if (entry) {
        push({
          label: entry.displayName,
          kbId: entry.id,
          confidence: mc.confidence,
          confidenceBand: confidenceBand(mc.confidence, mc.category),
          detectedIngredients: [ingredient],
          ...imageIndex,
        });
      }
    }
  }
  return out;
}
