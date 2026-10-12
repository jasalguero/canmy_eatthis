import type { VerdictPayload } from '@canmyeatthis/shared';
import Constants from 'expo-constants';
import type { TFunction } from 'i18next';
import { Alert, Linking, Share } from 'react-native';

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
 *
 * A device with no mail app (the iOS simulator, a phone with Mail deleted) rejects the `mailto:`.
 * Then the address is shown instead, with a share sheet to copy it — never a silent dead button.
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

/** Shown when no app can take the `mailto:`: the address itself, and a way to copy it. */
export function showNoMailApp(t: TFunction, to: string): void {
  Alert.alert(t('common:noMailAppTitle'), t('common:noMailAppMessage', { email: to }), [
    { text: t('common:close'), style: 'cancel' },
    {
      text: t('common:shareEmailAddress'),
      onPress: () => void Share.share({ message: to }).catch(() => undefined),
    },
  ]);
}

function openEmail(t: TFunction, to: string, subject: string, body: string): Promise<void> {
  return Linking.openURL(mailtoUrl(to, subject, body)).then(
    () => undefined,
    () => showNoMailApp(t, to),
  );
}

/** A report about one answer, from its result screen. */
export async function reportWrongAnswer(t: TFunction, payload: VerdictPayload): Promise<void> {
  if (!CONTACT_EMAIL) return;
  const values = {
    item: payload.displayName,
    species: payload.species,
    verdict: t(`result:verdictWord_${payload.verdict}`),
    kbVersion: payload.kbVersion,
    appVersion: appVersion(),
  };
  await openEmail(
    t,
    CONTACT_EMAIL,
    t('result:reportEmailSubject', values),
    t('result:reportEmailBody', values),
  );
}

/** A report not tied to one answer, from Settings. */
export async function reportGeneral(t: TFunction, kbVersion: string): Promise<void> {
  if (!CONTACT_EMAIL) return;
  const values = { kbVersion, appVersion: appVersion() };
  await openEmail(
    t,
    CONTACT_EMAIL,
    t('settings:reportEmailSubject'),
    t('settings:reportEmailBody', values),
  );
}
