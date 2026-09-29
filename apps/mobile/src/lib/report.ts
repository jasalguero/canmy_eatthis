import type { VerdictPayload } from '@canmyeatthis/shared';
import Constants from 'expo-constants';
import type { TFunction } from 'i18next';
import { Linking } from 'react-native';

/**
 * "Report a wrong answer" (docs/05 §5, docs/05-safety-legal.md §6): an email to a real inbox. A Google Play
 * requirement for AI content, the knowledge base's correction channel, and a record of diligence.
 *
 * A `mailto:` needs no server, account or connection to compose. The pre-filled body carries only
 * what finds the entry — the item, the answer shown, the animal, the KB and app versions — and
 * nothing about the user.
 *
 * `CONTACT_EMAIL` is public: it appears in the app, the store listings and the privacy policy.
 * If it is ever `null`, no report button is shown.
 */
export const CONTACT_EMAIL: string | null = 'canmy_eatthis@jasalguero.com';

export function canReport(): boolean {
  return CONTACT_EMAIL !== null;
}

function appVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

export function mailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** A report about one answer, from its result screen. */
export function reportWrongAnswer(t: TFunction, payload: VerdictPayload): void {
  if (!CONTACT_EMAIL) return;
  const values = {
    item: payload.displayName,
    species: payload.species,
    verdict: t(`result:verdictWord_${payload.verdict}`),
    kbVersion: payload.kbVersion,
    appVersion: appVersion(),
  };
  void Linking.openURL(
    mailtoUrl(
      CONTACT_EMAIL,
      t('result:reportEmailSubject', values),
      t('result:reportEmailBody', values),
    ),
  );
}

/** A report not tied to one answer, from Settings. */
export function reportGeneral(t: TFunction, kbVersion: string): void {
  if (!CONTACT_EMAIL) return;
  const values = { kbVersion, appVersion: appVersion() };
  void Linking.openURL(
    mailtoUrl(
      CONTACT_EMAIL,
      t('settings:reportEmailSubject'),
      t('settings:reportEmailBody', values),
    ),
  );
}
