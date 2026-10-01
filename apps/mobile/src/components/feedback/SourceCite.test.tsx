import { I18nextProvider } from 'react-i18next';
import { type ReactTestRenderer, act, create } from 'react-test-renderer';

import { initI18n } from '@/i18n';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { SourceCite } from './SourceCite';

// Reanimated needs its native module; only `useReducedMotion` is read, via the Text primitive's imports.
jest.mock('react-native-reanimated', () => ({ useReducedMotion: jest.fn(() => false) }));

/**
 * A source line may only say what the source says. For an `unknown` verdict the source does not
 * settle the question (Hill's dog-only pineapple article under a cat result), so the sentence must
 * say we checked it, never that it "describes" the item as anything — in either language.
 */
const source = {
  label: 'Hill’s Pet Nutrition',
  url: 'https://example.org/p',
  accessed: '2026-10-01',
};

const i18n = initI18n('en');

async function render(language: 'en' | 'es', verdict: 'unknown' | 'toxic'): Promise<string> {
  await act(async () => {
    await i18n.changeLanguage(language);
  });
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme="dark">
          <SourceCite source={source} itemName="Pineapple" verdict={verdict} species="cat" />
        </ThemeProvider>
      </I18nextProvider>,
    );
  });
  return JSON.stringify(tree.toJSON());
}

describe('SourceCite', () => {
  it('says "lists … as" for a verdict the source supports', async () => {
    expect(await render('en', 'toxic')).toContain('lists');
  });

  it('only says we checked the source when the verdict is unknown (en)', async () => {
    const text = await render('en', 'unknown');
    expect(text).toContain('We checked');
    expect(text).not.toContain('lists');
    expect(text).not.toContain('not established');
  });

  it('only says we checked the source when the verdict is unknown (es)', async () => {
    const text = await render('es', 'unknown');
    expect(text).toContain('Consultamos');
    expect(text).not.toContain('describe');
    expect(text).not.toContain('no establecido');
  });
});
