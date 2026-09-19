import { z } from 'zod';

/**
 * The controlled vocabulary for `signs`. Ids only — never prose (AGENTS.md #13). Translated
 * once per language in `packages/kb/vocab/<lang>.json`, not per entry. This is what makes the
 * mandatory translation tier affordable (docs/09-localisation.md §1).
 *
 * Extend this list as new entries need a sign it doesn't cover yet — but check for an existing
 * near-match first. Collapsing "tachycardia" and "rapid heart rate" into one id is the entire
 * point of a controlled vocabulary.
 */
export const SIGN_IDS = [
  'vomiting',
  'diarrhoea',
  'lethargy',
  'loss_of_appetite',
  'hypersalivation',
  'weakness',
  'ataxia',
  'tremors',
  'seizures',
  'tachycardia',
  'hyperthermia',
  'restlessness',
  'agitation',
  'disorientation',
  'collapse',
  'difficulty_breathing',
  'pale_gums',
  'abdominal_pain',
  'bloating',
  'increased_thirst',
  'increased_urination',
  'kidney_failure_signs',
  'low_blood_sugar_signs',
  'panting',
  'coma',
  'blood_in_vomit',
  'blood_in_stool',
  'jaundice',
] as const;
export type SignId = (typeof SIGN_IDS)[number];
export const SignIdSchema = z.enum(SIGN_IDS);

/**
 * The controlled vocabulary for `emergency_actions`. Hobby build (docs/10-hobby-scope.md §4):
 * the **universal set only** — the three lines every authority agrees on. No entry-specific
 * emergency instructions (AGENTS.md #16). This list is deliberately not meant to grow.
 */
export const EMERGENCY_ACTION_IDS = [
  'call_vet_now',
  'do_not_induce_vomiting',
  'bring_packaging',
] as const;
export type EmergencyActionId = (typeof EMERGENCY_ACTION_IDS)[number];
export const EmergencyActionIdSchema = z.enum(EMERGENCY_ACTION_IDS);
