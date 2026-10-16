import {
  type ApiErrorCode,
  ApiErrorSchema,
  type IdentifyRequest,
  IdentifyRequestSchema,
  type IdentifyResponse,
  IdentifyResponseSchema,
} from '@canmyeatthis/shared';

/**
 * `POST /v1/identify` (docs/03), the only call in the app that costs money. Pure apart from the
 * injected `fetch`, so every outcome is tested without a network (`identifyClient.test.ts`).
 *
 * The answer is always one of three kinds, and the caller never sees an exception:
 *   - `ok`: a schema-valid response (the schema itself refuses a model answer that skips the
 *     confirm step or carries an optimistic verdict, AGENTS.md #1)
 *   - `error`: one of docs/03's error codes, each of which has a designed screen
 *   - `offline`: no connection, or none that answered in time
 *
 * Retries are for the network, not for answers: a dropped connection or a 502/503 is tried again
 * with backoff; a refusal such as `RATE_LIMITED` or `SPEND_CAP_EXCEEDED` is shown at once, because
 * trying again could only cost money or make the person wait.
 */
export type IdentifyOutcome =
  | { kind: 'ok'; response: IdentifyResponse }
  | { kind: 'error'; code: ApiErrorCode }
  | { kind: 'offline' };

export interface IdentifyCall {
  apiUrl: string;
  deviceId: string;
  request: IdentifyRequest;
  fetch: typeof fetch;
  signal?: AbortSignal;
  /** Waits between attempts; injectable so tests do not sleep. */
  sleep?: (ms: number) => Promise<void>;
}

export const RETRY_DELAYS_MS = [600, 1800] as const;
export const TIMEOUT_MS = 20_000;

const RETRYABLE_STATUS = new Set([502, 503, 504]);

export async function identify(call: IdentifyCall): Promise<IdentifyOutcome> {
  const parsed = IdentifyRequestSchema.safeParse(call.request);
  if (!parsed.success) return { kind: 'error', code: 'INVALID_REQUEST' };
  const sleep = call.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const url = `${call.apiUrl.replace(/\/+$/, '')}/v1/identify`;
  const body = JSON.stringify(parsed.data);

  for (let attempt = 0; ; attempt++) {
    if (call.signal?.aborted) return { kind: 'offline' };
    const result = await attemptOnce(call, url, body);
    const retryable = result === 'network' || result === 'retryable';
    if (!retryable) return result;
    const delay = RETRY_DELAYS_MS[attempt];
    if (delay === undefined || call.signal?.aborted) return { kind: 'offline' };
    await sleep(delay);
  }
}

async function attemptOnce(
  call: IdentifyCall,
  url: string,
  body: string,
): Promise<IdentifyOutcome | 'network' | 'retryable'> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), TIMEOUT_MS);
  const onAbort = () => timeout.abort();
  call.signal?.addEventListener('abort', onAbort);
  let res: Response;
  try {
    res = await call.fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-device-id': call.deviceId },
      body,
      signal: timeout.signal,
    });
  } catch {
    return 'network';
  } finally {
    clearTimeout(timer);
    call.signal?.removeEventListener('abort', onAbort);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return RETRYABLE_STATUS.has(res.status) ? 'retryable' : { kind: 'error', code: 'INTERNAL' };
  }

  if (res.ok) {
    const response = IdentifyResponseSchema.safeParse(json);
    return response.success
      ? { kind: 'ok', response: response.data }
      : { kind: 'error', code: 'INTERNAL' };
  }
  const apiError = ApiErrorSchema.safeParse(json);
  if (apiError.success) return { kind: 'error', code: apiError.data.error.code };
  return RETRYABLE_STATUS.has(res.status) ? 'retryable' : { kind: 'error', code: 'INTERNAL' };
}
