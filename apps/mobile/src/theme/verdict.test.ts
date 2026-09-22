import { en, es } from '@/i18n';
import { VERDICT_CLASSES, VERDICT_GLYPH, verdictWordKey } from './verdict';

const VERDICTS = ['safe', 'caution', 'toxic', 'unknown'] as const;

/**
 * The non-colour signals, asserted.
 *
 * docs/07 Phase 2 acceptance asks that the four verdicts stay distinguishable in a grayscale
 * screenshot. It is worth being precise about *why* they do, because it is not luminance: the
 * four banner backgrounds are all dark and sit within about 0.05 of each other, so in grayscale
 * they are nearly identical by design. What separates them is the glyph and the word — which is
 * the whole point of docs/06 §1 ("colour is never the only signal"), given that red/green is the
 * exact axis this app depends on and roughly 8% of men cannot use it.
 *
 * So the mechanical check is that every verdict has a distinct glyph and a distinct word in
 * every shipped language, and that no verdict is missing a colour role. The screenshots in
 * `docs/screenshots/grayscale/` are the evidence; this is the guarantee behind them.
 */
describe('verdict signals', () => {
  it('gives every verdict a distinct glyph', () => {
    const glyphs = VERDICTS.map((v) => VERDICT_GLYPH[v]);
    expect(new Set(glyphs).size).toBe(VERDICTS.length);
    for (const glyph of glyphs) expect(glyph.trim().length).toBeGreaterThan(0);
  });

  it.each(['en', 'es'] as const)('gives every verdict a distinct word in %s', (language) => {
    const catalogue = (language === 'en' ? en : es).result as Record<string, string>;
    const words = VERDICTS.map((v) => {
      const key = verdictWordKey(v).replace('result:', '');
      const word = catalogue[key];
      expect(word).toBeDefined();
      return word;
    });
    // Distinct after case folding: two verdicts that differ only in capitalisation are not
    // distinguishable when read aloud by a screen reader.
    expect(new Set(words.map((w) => w.toLocaleLowerCase())).size).toBe(VERDICTS.length);
  });

  it('gives every verdict every colour role', () => {
    for (const verdict of VERDICTS) {
      const classes = VERDICT_CLASSES[verdict];
      expect(Object.keys(classes).sort()).toEqual([
        'accentBorder',
        'accentFill',
        'bannerBg',
        'fgText',
        'onAccentText',
        'onBgText',
        'surfaceBg',
      ]);
      // Each role must reference this verdict's own tokens — a copy/paste across the table
      // would otherwise render, say, the toxic banner in the caution colour.
      for (const value of Object.values(classes)) expect(value).toContain(`-${verdict}-`);
    }
  });
});
