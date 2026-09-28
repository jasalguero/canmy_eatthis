import { z } from 'zod';

/**
 * One emergency line in the hotline registry (docs/05-safety-legal.md §3, docs/03
 * `GET /v1/hotlines`). Chosen by **region**, never by language (AGENTS.md #12): a Spanish speaker
 * in the US needs US numbers, so `languages` records what each service operates in, and the UI
 * says so.
 *
 * `verifiedAt` is the date a person last dialled the number and confirmed it reaches this service
 * and takes calls about pets. `null` means nobody has, and an unverified line never reaches a
 * release build — a wrong number on the emergency screen is the worst bug this app can ship.
 */
export const HotlineSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/),
  /** The service's own name. A proper noun, shown as is in every language. */
  name: z.string().min(1),
  /** E.164, for the `tel:` link. */
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'phone must be E.164, e.g. +34915620420'),
  /** How the number is written locally, for display. */
  display: z.string().min(1),
  /** ISO 3166-1 alpha-2 regions the service is for. */
  regions: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1),
  /** Languages the service answers in (ISO 639-1). */
  languages: z.array(z.string().regex(/^[a-z]{2}$/)).min(1),
  /** `fee`: the caller pays per case; the amount is in the `hotlines:fee_<id>` string. */
  cost: z.enum(['free', 'standard_rate', 'fee']),
  hours24: z.boolean(),
  /** The official page the number, hours and cost were taken from. */
  source: z.string().url(),
  verifiedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});
export type Hotline = z.infer<typeof HotlineSchema>;
