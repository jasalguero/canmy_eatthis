const tailwindConfig = require('../../tailwind.config.js');

/**
 * The token layer's two structural guarantees, asserted rather than assumed.
 *
 * Contrast ratios are checked separately and mechanically by `scripts/check-contrast.mjs` in CI
 * (docs/06 §1: "do not eyeball it"). What this file covers is the part a ratio check cannot see:
 * that Tailwind's default palette is really gone, and that every colour class the app can write
 * resolves to a token variable rather than to a literal.
 */
describe('tailwind palette', () => {
  const colors = tailwindConfig.theme.colors as Record<string, unknown>;

  it("removes Tailwind's default palette rather than extending it", () => {
    // docs/06 §1 and AGENTS.md #7: a Tailwind default-palette colour class must not resolve.
    // `theme.colors` (not `theme.extend.colors`) is what makes that true, and this is the
    // assertion that keeps it true if someone later adds `extend` out of convenience.
    // (The class names themselves are not spelled out here — scripts/check-ui-hygiene.sh greps
    // the source for them, and it cannot tell a comment from a real usage.)
    for (const defaultGroup of ['red', 'green', 'blue', 'gray', 'slate', 'amber', 'yellow']) {
      expect(colors).not.toHaveProperty(defaultGroup);
    }
    expect(Object.keys(colors).sort()).toEqual([
      'brand',
      'camera',
      'ink',
      'line',
      'surface',
      'verdict',
    ]);
  });

  it('resolves every colour to a CSS variable, never to a literal', () => {
    const literals: string[] = [];
    const walk = (node: unknown, path: string) => {
      if (typeof node === 'string') {
        if (!node.startsWith('var(--')) literals.push(`${path}: ${node}`);
        return;
      }
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        walk(value, `${path}.${key}`);
      }
    };
    walk(colors, 'colors');
    // A literal here would be a theme value that cannot change between light and dark.
    expect(literals).toEqual([]);
  });

  it("keeps darkMode on the 'class' strategy", () => {
    // Not a style preference — `media` breaks the web build. css-interop's web colour-scheme
    // runtime reads this flag at module load, and when the stylesheet arrives later (the
    // dev-server case) its own MutationObserver calls `colorScheme.set(...)`, which its own
    // guard rejects under `media`: "Cannot manually set color scheme, as dark mode is type
    // 'media'". It also means a `dark:` variant could never follow the in-app Appearance
    // override. See the comment in tailwind.config.js.
    expect(tailwindConfig.darkMode).toBe('class');
  });

  it('exposes a label colour for every fill', () => {
    // Every fill needs a CI-checked label token (docs/02 D18) — a missing `on-*` here is how a
    // component ends up hardcoding white on a mint background at 2.8:1.
    const verdict = colors.verdict as Record<string, Record<string, string>>;
    for (const name of ['safe', 'caution', 'toxic', 'unknown']) {
      expect(Object.keys(verdict[name]).sort()).toEqual([
        'accent',
        'bg',
        'fg',
        'on-accent',
        'on-bg',
        'surface',
      ]);
    }
    expect(colors.brand).toHaveProperty('on-primary');
  });
});
