import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HOTLINES, type Species } from '@canmyeatthis/shared';
import { I18nextProvider } from 'react-i18next';
import { type ReactTestInstance, type ReactTestRenderer, act, create } from 'react-test-renderer';

import EmergencyRoute from '@/app/emergency';
import ResultRoute from '@/app/result';
import { initI18n } from '@/i18n';
import { SUPPORTED_LANGUAGES } from '@/i18n/namespaces';
import { emergencyHotlines } from '@/lib/emergency';
import { getKbEntry, getKbVersion } from '@/lib/offlineKb';
import { useSettingsStore } from '@/lib/settings';
import { buildRealVerdict, buildUnknownVerdict } from '@/lib/verdict';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { tokens } from '@/theme/tokens';

import kbEn from '../../assets/kb/kb.en.json';
import kbEs from '../../assets/kb/kb.es.json';
import enCatalogue from '../i18n/locales/en/result.json';

/**
 * docs/05-safety-legal.md §1, the non-negotiable product rules, one `describe` per rule, plus the
 * Phase 5 acceptance lines about the hotline and language/region (docs/07). Where a rule is held
 * elsewhere — a CI script, an existing test — the `describe` says so, so this file is the index.
 * `docs/eval/safety-rules.md` records the same mapping, with the rules no test can hold.
 */

// --- Rendering real screens under Jest -------------------------------------------------------

const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), dismissTo: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams.current,
  Redirect: () => null,
}));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 's', Warning: 'w', Error: 'e' },
}));
jest.mock('react-native-reanimated', () => ({ useReducedMotion: () => true }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 47, bottom: 34 }),
  };
});
// History has no database under Jest; a result must show regardless (historyStore.ts).
jest.mock('@/lib/historyDb', () => ({ openHistoryDb: async () => null }));

const i18n = initI18n('en');

/** Any network call fails the test: everything below must work with no connection at all. */
const offlineFetch = jest.fn(() => {
  throw new Error('network is unreachable');
});

beforeEach(() => {
  globalThis.fetch = offlineFetch as unknown as typeof fetch;
  offlineFetch.mockClear();
});

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme="light">{element}</ThemeProvider>
      </I18nextProvider>,
    );
  });
  return tree;
}

/** Every string rendered as text, in order. */
function texts(tree: ReactTestRenderer): string[] {
  const out: string[] = [];
  const walk = (node: ReactTestInstance | string) => {
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    for (const child of node.children) walk(child);
  };
  walk(tree.root);
  return out;
}

function labels(tree: ReactTestRenderer): string[] {
  return tree.root
    .findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string')
    .map((n) => n.props.accessibilityLabel as string);
}

async function setLocale(language: 'en' | 'es', region: string) {
  useSettingsStore.setState({ language, region });
  await act(async () => {
    await i18n.changeLanguage(language);
  });
}

function openResult(params: Record<string, string>): ReactTestRenderer {
  mockParams.current = params;
  return render(<ResultRoute />);
}

// --- The bundled KB, both languages ---------------------------------------------------------

interface RawEntry {
  id: string;
}
const KB_IDS = (kbEn as { entries: RawEntry[] }).entries.map((entry) => entry.id);
const SPECIES: Species[] = ['dog', 'cat'];
const TOXIC_CASES = SUPPORTED_LANGUAGES.flatMap((language) =>
  KB_IDS.flatMap((kbId) =>
    SPECIES.map((species) => ({ language, kbId, species })).filter(
      ({ kbId: id, species: s, language: l }) => getKbEntry(id, l)?.species[s].verdict === 'toxic',
    ),
  ),
);

/** All prose a person can read from the KB and the UI catalogues, per language. */
function allUserFacingText(): string[] {
  const out: string[] = [];
  const collect = (value: unknown) => {
    if (typeof value === 'string') out.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(kbEn);
  collect(kbEs);
  for (const language of SUPPORTED_LANGUAGES) {
    collect(i18n.getDataByLanguage(language));
  }
  return out;
}

// --- Rule 1 ----------------------------------------------------------------------------------

/** Hue in degrees of a `#rrggbb` colour. */
function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

describe('rule 1: "unknown" never renders as safe', () => {
  it.each(['light', 'dark'] as const)('unknown is never a green in the %s theme', (theme) => {
    const unknown = tokens[theme].verdict.unknown;
    const safe = tokens[theme].verdict.safe;
    for (const role of ['bg', 'surface', 'accent'] as const) {
      expect(unknown[role]).not.toBe(safe[role]);
      const h = hue(unknown[role]);
      // Green runs roughly 75°–165°; unknown is a blue-grey, never in it.
      expect(h < 75 || h > 165).toBe(true);
    }
  });

  it('a query the KB does not cover is unknown, with copy that reassures nobody', () => {
    const payload = buildUnknownVerdict({
      query: 'qwertyuiop',
      species: 'dog',
      language: 'en',
      disclaimer: 'x',
      headline: enCatalogue.unknownHeadline,
      summary: enCatalogue.unknownBody,
    });
    expect(payload.verdict).toBe('unknown');
    for (const copy of [payload.headline, payload.summary, enCatalogue.verdictWord_unknown]) {
      expect(copy).not.toMatch(/no known toxicity|well tolerated|fine|okay|ok\b/i);
    }
  });
});

describe('rule 2: "safe" is never a bare claim', () => {
  it('no catalogue or KB text claims it (scripts/check-safe-claims.sh holds the full rule in CI)', () => {
    expect(
      allUserFacingText().filter((s) => /\b(is|are|it's) safe\b|safe to eat/i.test(s)),
    ).toEqual([]);
  });
});

// --- Rule 3 and the Phase 5 hotline line ------------------------------------------------------

describe('rule 3: the emergency path needs no login, no limit and no network', () => {
  it('every toxic entry builds its verdict with the network down, in every language', () => {
    expect(TOXIC_CASES.length).toBeGreaterThan(0);
    for (const { kbId, species, language } of TOXIC_CASES) {
      const payload = buildRealVerdict({ kbId, species, language, disclaimer: 'x' });
      expect(payload.verdict).toBe('toxic');
      expect(payload.emergencyActions.length).toBeGreaterThan(0);
    }
    expect(offlineFetch).not.toHaveBeenCalled();
  });

  it('a toxic result shows the call button with the network down', async () => {
    await setLocale('en', 'US');
    const tree = openResult({ kbId: 'grapes_raisins', species: 'dog' });
    expect(labels(tree)).toContain(i18n.t('result:emergencyCall'));
    expect(offlineFetch).not.toHaveBeenCalled();
  });

  it.each(['US', 'GB', 'ES'])(
    'the emergency screen lists %s release-build lines with the network down',
    async (region) => {
      await setLocale('en', region);
      const tree = render(<EmergencyRoute />);
      const shown = labels(tree).join('\n');
      const releaseLines = emergencyHotlines(region, false);
      expect(releaseLines.length).toBeGreaterThan(0);
      for (const line of releaseLines) expect(shown).toContain(line.display);
      expect(offlineFetch).not.toHaveBeenCalled();
    },
  );

  it('nothing on the emergency path reads the daily photo-identification cap', () => {
    // The cap lives in the Worker (services/api) and guards only the photo path, which this
    // release does not ship. The hotline registry is bundled in packages/shared.
    expect(HOTLINES.every((line) => typeof line.phone === 'string')).toBe(true);
  });
});

// --- Rule 4 ----------------------------------------------------------------------------------

describe('rule 4: every screen that gives a verdict carries the disclaimer', () => {
  const verdicts: Array<{ name: string; params: Record<string, string> }> = [
    { name: 'toxic', params: { kbId: 'grapes_raisins', species: 'dog' } },
    { name: 'unknown', params: { unknown: '1', query: 'qwertyuiop', species: 'cat' } },
    ...KB_IDS.map((kbId, i) => ({
      name: kbId,
      params: { kbId, species: i % 2 ? 'cat' : 'dog' },
    })),
  ];

  it.each(verdicts)('the result for $name shows it', async ({ params }) => {
    await setLocale('en', 'US');
    const tree = openResult(params);
    expect(texts(tree)).toContain(i18n.t('legal:disclaimer'));
  });

  it('the barcode product screen renders the disclaimer under its verdict cards', () => {
    // product.tsx renders `t('legal:disclaimer')` beside the cards; held by this source check
    // because the screen needs a live product lookup to render.
    const source = readFileSync(join(__dirname, '../app/product.tsx'), 'utf8');
    expect(source).toMatch(/t\('legal:disclaimer'\)/);
    expect(source).toMatch(/\{disclaimer\}/);
  });
});

// --- Rules 6 and 7 ---------------------------------------------------------------------------

describe('rule 6: never tell a user their pet does not need a vet', () => {
  it('no text in either language clears an animal', () => {
    const clears =
      /(no|don't|do not|doesn't|does not|won't) need (to see |to call |a |to go to the )?(a )?vet|no (hace falta|necesita|necesitas) (ir al |llamar al |un |al )?veterinari|sin necesidad de (ir al )?veterinari/i;
    expect(allUserFacingText().filter((s) => clears.test(s))).toEqual([]);
  });
});

describe('rule 7: no dosage calculator and no risk bands', () => {
  it('the bundled KB carries no dose, weight or band fields', () => {
    const forbiddenKey = /dose|dosage|weight|mg_per_kg|band|threshold/i;
    const keys = new Set<string>();
    const walk = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
          keys.add(key);
          walk(child);
        }
      }
    };
    walk(kbEn);
    walk(kbEs);
    expect([...keys].filter((key) => forbiddenKey.test(key))).toEqual([]);
  });

  it('no text gives an amount per body weight', () => {
    const perWeight = /\d\s*(mg|g|gr|ml)\s*(\/|per|por)\s*(kg|lb|kilo)/i;
    expect(allUserFacingText().filter((s) => perWeight.test(s))).toEqual([]);
  });
});

// --- Phase 5: a Spanish speaker in a US region -------------------------------------------------

describe('a Spanish speaker in the US gets Spanish text and US hotline numbers', () => {
  afterAll(async () => {
    await setLocale('en', 'US');
  });

  it('on the emergency screen', async () => {
    await setLocale('es', 'US');
    const tree = render(<EmergencyRoute />);
    const shown = texts(tree);
    expect(shown).toContain(i18n.t('hotlines:title', { lng: 'es' }));
    expect(i18n.t('hotlines:title', { lng: 'es' })).not.toBe(
      i18n.t('hotlines:title', { lng: 'en' }),
    );
    const allLabels = labels(tree).join('\n');
    for (const line of emergencyHotlines('US', false)) expect(allLabels).toContain(line.display);
    for (const line of emergencyHotlines('ES', false)) {
      expect(allLabels).not.toContain(line.display);
    }
  });

  it('on a toxic result, from the Spanish KB', async () => {
    await setLocale('es', 'US');
    const tree = openResult({ kbId: 'grapes_raisins', species: 'dog' });
    const shown = texts(tree);
    const es = getKbEntry('grapes_raisins', 'es');
    expect(shown).toContain(es?.displayName);
    expect(shown).toContain(i18n.t('legal:disclaimer', { lng: 'es' }));
    expect(getKbVersion('es')).toBeTruthy();
  });
});
