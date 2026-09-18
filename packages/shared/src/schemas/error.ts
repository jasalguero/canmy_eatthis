import { z } from 'zod';

/**
 * Hobby-scope deviation from docs/03-api-contract.md — see docs/02-tech-decisions.md D16.
 *
 * docs/03's `QUOTA_EXCEEDED` (402, "Paywall sheet") belonged to the funded plan's per-user
 * subscription quota. AGENTS.md #18 cuts all monetisation code, so there is no paywall to
 * show. What replaces it is the *global* spend cap from docs/10-hobby-scope.md §3: when the
 * daily vision-call counter is exceeded, the vision path refuses and the app degrades to
 * offline-KB-only with an honest message — never an error screen. `SPEND_CAP_EXCEEDED` names
 * that case explicitly so the app can render "photos are unavailable right now" rather than a
 * generic failure.
 */
export const ApiErrorCodeSchema = z.enum([
  'INVALID_REQUEST',
  'UNAUTHENTICATED',
  'ATTESTATION_FAILED',
  'SPEND_CAP_EXCEEDED',
  'RATE_LIMITED',
  'IMAGE_UNUSABLE',
  'NO_SUBJECT_FOUND',
  'PROVIDER_UNAVAILABLE',
  'INTERNAL',
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string().min(1),
    retryAfterSec: z.number().nonnegative().optional(),
    requestId: z.string().min(1),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
