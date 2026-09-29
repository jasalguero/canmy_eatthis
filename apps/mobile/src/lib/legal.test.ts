import { Linking } from 'react-native';

import { LEGAL_SITE, legalUrl, openLegal } from './legal';

describe('legal pages', () => {
  it('are opened in the user’s language', () => {
    expect(legalUrl('privacy', 'en')).toBe(`${LEGAL_SITE}/en/privacy.html`);
    expect(legalUrl('terms', 'es')).toBe(`${LEGAL_SITE}/es/terms.html`);
  });

  it('open in the browser', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    openLegal('privacy', 'es');
    expect(open).toHaveBeenCalledWith('https://jasalguero.github.io/canmy_eatthis/es/privacy.html');
    open.mockRestore();
  });
});
