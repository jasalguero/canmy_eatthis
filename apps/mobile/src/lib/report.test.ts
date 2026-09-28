import { Linking } from 'react-native';

import { initI18n } from '@/i18n';
import { buildRealVerdict } from '@/lib/verdict';
import { CONTACT_EMAIL, canReport, mailtoUrl, reportWrongAnswer } from './report';

const i18n = initI18n('en');

describe('mailtoUrl', () => {
  it('encodes the subject and body', () => {
    expect(mailtoUrl('a@b.c', 'Wrong answer: Grapes & raisins', 'Line 1\nLine 2')).toBe(
      'mailto:a@b.c?subject=Wrong%20answer%3A%20Grapes%20%26%20raisins&body=Line%201%0ALine%202',
    );
  });
});

describe('the report email', () => {
  it('names the entry, the answer and the versions, in the user’s language', () => {
    const payload = buildRealVerdict({
      kbId: 'grapes_raisins',
      species: 'cat',
      language: 'es',
      disclaimer: 'x',
    });
    const values = {
      item: payload.displayName,
      species: payload.species,
      verdict: i18n.t('result:verdictWord_toxic', { lng: 'es' }),
      kbVersion: payload.kbVersion,
      appVersion: '0.0.1',
    };
    expect(i18n.t('result:reportEmailSubject', { ...values, lng: 'es' })).toBe(
      'Respuesta incorrecta: Uvas y pasas (gato)',
    );
    const body = i18n.t('result:reportEmailBody', { ...values, lng: 'es' });
    expect(body).toContain(`Versión de la base de conocimiento: ${payload.kbVersion}`);
    expect(body).toContain('Animal: gato');
  });
});

describe('reportWrongAnswer', () => {
  it('opens an email to the contact address about that answer', () => {
    expect(CONTACT_EMAIL).toBe('canmy_eatthis@jasalguero.com');
    expect(canReport()).toBe(true);
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const payload = buildRealVerdict({
      kbId: 'grapes_raisins',
      species: 'dog',
      language: 'en',
      disclaimer: 'x',
    });
    reportWrongAnswer(i18n.t, payload);
    const url = open.mock.calls[0]?.[0] ?? '';
    expect(url.startsWith('mailto:canmy_eatthis@jasalguero.com?subject=')).toBe(true);
    expect(decodeURIComponent(url)).toContain('Wrong answer: Grapes and raisins (dog)');
    open.mockRestore();
  });
});
