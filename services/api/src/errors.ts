import type { ApiError, ApiErrorCode } from '@canmyeatthis/shared';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * docs/03 §Errors — one envelope, one HTTP status per code. The app maps the *code* to copy, so
 * `message` is a developer-facing English string and never shown to a user.
 *
 * `SPEND_CAP_EXCEEDED` (D16) is a 503: nothing is wrong with the request, the service is
 * deliberately declining paid work until the UTC day rolls over.
 */
const STATUS_BY_CODE: Record<ApiErrorCode, ContentfulStatusCode> = {
  INVALID_REQUEST: 400,
  UNAUTHENTICATED: 401,
  ATTESTATION_FAILED: 403,
  SPEND_CAP_EXCEEDED: 503,
  RATE_LIMITED: 429,
  IMAGE_UNUSABLE: 422,
  NO_SUBJECT_FOUND: 422,
  PROVIDER_UNAVAILABLE: 503,
  INTERNAL: 500,
};

export function statusForCode(code: ApiErrorCode): ContentfulStatusCode {
  return STATUS_BY_CODE[code];
}

export class ApiFailure extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly retryAfterSec?: number,
  ) {
    super(message);
  }
}

export function errorResponse(c: Context, failure: ApiFailure, requestId: string) {
  const body: ApiError = {
    error: {
      code: failure.code,
      message: failure.message,
      requestId,
      ...(failure.retryAfterSec !== undefined ? { retryAfterSec: failure.retryAfterSec } : {}),
    },
  };
  if (failure.retryAfterSec !== undefined) {
    c.header('Retry-After', String(failure.retryAfterSec));
  }
  return c.json(body, statusForCode(failure.code));
}

export function newRequestId(): string {
  return `req_${crypto.randomUUID().replaceAll('-', '')}`;
}
