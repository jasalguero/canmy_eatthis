import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

/**
 * AGENTS.md #11 and the Phase 2 acceptance line "a pseudo-locale run surfaces zero hardcoded
 * strings" (docs/07). A pseudo-locale run shows a hardcoded string as the one line of plain
 * English among accented ones; this finds the same strings without a person looking at every
 * screen: words written straight into JSX, or into a prop a person reads or hears.
 *
 * Text that is data rather than copy (a hotline's name, a KB display name) arrives through `{}`
 * from a variable, so it is not a literal and is not flagged.
 */

// @babel/parser ships with @babel/core, which Jest already depends on.
const babelParser = createRequire(require.resolve('@babel/core'))('@babel/parser') as {
  parse: (code: string, options: object) => unknown;
};

const SRC = join(__dirname, '..');

/** Props whose string value is read or heard by a person. */
const USER_FACING_PROPS = new Set([
  'label',
  'title',
  'body',
  'placeholder',
  'accessibilityLabel',
  'accessibilityHint',
  'actionLabel',
  'detail',
  'itemName',
  'disabledReason',
  'headline',
  'text',
]);

/** Development-only screens, never in a release build (`app/gallery.tsx` redirects outside dev). */
const ALLOWED_FILES = new Set(['app/gallery.tsx']);

/** Has a letter: punctuation, glyphs and spacing are not copy. */
const HAS_WORD = /\p{L}{2,}/u;

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name: string) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return name.endsWith('.tsx') && !name.endsWith('.test.tsx') ? [path] : [];
  });
}

interface Node {
  type: string;
  [key: string]: unknown;
}

function findings(file: string): string[] {
  const code = readFileSync(file, 'utf8');
  const ast = babelParser.parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  const out: string[] = [];
  const at = (node: Node) =>
    `${relative(SRC, file)}:${(node.loc as { start: { line: number } }).start.line}`;

  const visit = (node: unknown, parent: Node | null) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child, parent);
      return;
    }
    const n = node as Node;
    if (n.type === 'JSXText' && HAS_WORD.test(String(n.value))) {
      out.push(`${at(n)} text "${String(n.value).trim()}"`);
    }
    if (n.type === 'JSXAttribute') {
      const name = (n.name as { name?: string }).name ?? '';
      const value = n.value as Node | null;
      const literal =
        value?.type === 'StringLiteral'
          ? value
          : value?.type === 'JSXExpressionContainer' &&
              (value.expression as Node).type === 'StringLiteral'
            ? (value.expression as Node)
            : null;
      if (USER_FACING_PROPS.has(name) && literal && HAS_WORD.test(String(literal.value))) {
        out.push(`${at(n)} ${name}="${String(literal.value)}"`);
      }
    }
    if (
      n.type === 'JSXExpressionContainer' &&
      parent?.type === 'JSXElement' &&
      ((n.expression as Node).type === 'StringLiteral' ||
        (n.expression as Node).type === 'TemplateLiteral')
    ) {
      const expression = n.expression as Node;
      const raw =
        expression.type === 'StringLiteral'
          ? String(expression.value)
          : (expression.quasis as Array<{ value: { cooked: string } }>)
              .map((q) => q.value.cooked)
              .join('');
      if (HAS_WORD.test(raw)) out.push(`${at(n)} text {"${raw}"}`);
    }
    for (const [key, child] of Object.entries(n)) {
      if (key === 'loc' || key === 'start' || key === 'end') continue;
      visit(child, n);
    }
  };
  visit(ast, null);
  return out;
}

describe('user-facing strings', () => {
  it('are never written into a component; every one goes through t()', () => {
    const files = tsxFiles(SRC).filter((file) => !ALLOWED_FILES.has(relative(SRC, file)));
    expect(files.length).toBeGreaterThan(20);
    expect(files.flatMap(findings)).toEqual([]);
  });

  it('would catch one', () => {
    const dir = mkdtempSync(join(tmpdir(), 'strings-'));
    const file = join(dir, 'Bad.tsx');
    writeFileSync(
      file,
      `export const A = () => <View><Text>Call your vet</Text><Button label="Back" />{'Oops'}</View>;`,
    );
    expect(findings(file)).toHaveLength(3);
  });
});
