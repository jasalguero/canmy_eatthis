import { z } from 'zod';

/**
 * The KV config document (docs/02 D7: "selection is config, not code"). Edited from the
 * Cloudflare dashboard, so a model rename or price change is a KV edit, not a deploy:
 *
 *   key `config:vision` →
 *   { "primaryModel": "gemini-2.5-flash-lite", "escalationModel": "gemini-2.5-flash",
 *     "escalationThreshold": 0.7, "dailyCap": 200 }
 *
 * The kill switch is deliberately *not* in this document: it is its own key
 * (`config:kill_switch`, see `kv.ts`) so flipping it from a phone is typing one word, not
 * editing JSON correctly under pressure.
 */
const CONFIG_KEY = 'config:vision';

export const VisionConfigSchema = z.object({
  provider: z.literal('gemini').default('gemini'),
  primaryModel: z.string().min(1).default('gemini-2.5-flash-lite'),
  /** `null` turns escalation off — every low-confidence call then costs one call, not two. */
  escalationModel: z.string().min(1).nullable().default('gemini-2.5-flash'),
  escalationThreshold: z.number().min(0).max(1).default(0.7),
  /**
   * Lowers the daily cap without a deploy. It can only ever *lower* it: the effective cap is
   * `min(VISION_DAILY_CALL_CAP, dailyCap)`, so a typo in the dashboard cannot raise the bill.
   */
  dailyCap: z.number().int().nonnegative().optional(),
});
export type VisionConfig = z.infer<typeof VisionConfigSchema>;

export const DEFAULT_VISION_CONFIG: VisionConfig = VisionConfigSchema.parse({});

/**
 * A missing, unreadable or malformed document falls back to the defaults. That is safe to do
 * here — unlike the kill switch and the cap, nothing in this document can *open* a path that
 * the defaults keep closed.
 */
export async function loadVisionConfig(kv: KVNamespace): Promise<VisionConfig> {
  try {
    const raw = await kv.get(CONFIG_KEY, 'json');
    if (raw === null) return DEFAULT_VISION_CONFIG;
    const parsed = VisionConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : DEFAULT_VISION_CONFIG;
  } catch {
    return DEFAULT_VISION_CONFIG;
  }
}

export function effectiveDailyCap(envCap: number, config: VisionConfig): number {
  return config.dailyCap === undefined ? envCap : Math.min(envCap, config.dailyCap);
}
