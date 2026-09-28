import { I18nextProvider } from 'react-i18next';
import { Animated, Linking, Platform, StyleSheet } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { type ReactTestInstance, type ReactTestRenderer, act, create } from 'react-test-renderer';

import { initI18n } from '@/i18n';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { verdictRevealMs } from '@/theme/motion';
import { EmergencyCallButton } from './EmergencyCallButton';
import { VerdictBanner } from './VerdictBanner';

/**
 * AGENTS.md #4: the emergency path — toxic verdict and hotline CTA — must work no matter what.
 * docs/02 D26 put motion on both, so this pins down that it can't get in the way: the verdict and
 * the call button are in the tree and working from the very first render, and once the reveal is
 * over, every wrapper around the verdict is back on its ordinary layout — with motion on, and with
 * motion off.
 */

jest.mock('react-native-reanimated', () => ({ useReducedMotion: jest.fn(() => false) }));
// Only the top inset is read (the banner reserves the notch itself); no native module in Jest.
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34 }),
}));
const mockReducedMotion = useReducedMotion as jest.Mock;

const HOTLINE = '+18884264435';
const i18n = initI18n('en');

function renderEmergencyPath(): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme="dark">
          <VerdictBanner verdict="toxic" itemName="Grapes and raisins" species="dog" />
          <EmergencyCallButton phoneNumber={HOTLINE} />
        </ThemeProvider>
      </I18nextProvider>,
    );
  });
  return tree;
}

function textNode(tree: ReactTestRenderer, text: string): ReactTestInstance {
  return tree.root.find((n) => typeof n.type === 'string' && n.props.children === text);
}

/** Every ancestor's resolved opacity and translate, from the node up to the root. */
function ancestorMotion(node: ReactTestInstance) {
  const out: { opacity: number; translateY: number; scale: number }[] = [];
  for (let n: ReactTestInstance | null = node; n; n = n.parent) {
    if (typeof n.type !== 'string') continue;
    const style = StyleSheet.flatten(n.props.style) ?? {};
    const transform = (style.transform ?? []) as Record<string, number>[];
    out.push({
      opacity: typeof style.opacity === 'number' ? style.opacity : 1,
      translateY: transform.reduce((y, t) => y + (t.translateY ?? 0), 0),
      scale: transform.reduce((s, t) => s * (t.scale ?? 1), 1),
    });
  }
  return out;
}

function pressCallButton(tree: ReactTestRenderer) {
  const button = tree.root.find(
    (n) =>
      n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === 'Call a vet now',
  );
  act(() => button.props.onPress());
}

/** The D23 failure: an animation that is requested and simply never runs. */
function animationsNeverRun() {
  const stuck = (): Animated.CompositeAnimation => ({
    start: () => {},
    stop: () => {},
    reset: () => {},
  });
  jest.spyOn(Animated, 'timing').mockImplementation(stuck);
  jest.spyOn(Animated, 'loop').mockImplementation(stuck);
  jest.spyOn(Animated, 'sequence').mockImplementation(stuck);
}

describe.each([
  ['motion on', { reduced: false, stuck: false }],
  ['motion on, but the animations never run (D23)', { reduced: false, stuck: true }],
  ['reduced motion', { reduced: true, stuck: false }],
])('the emergency path, %s', (_label, { reduced, stuck }) => {
  beforeEach(() => {
    jest.useFakeTimers();
    // The JS driver: a test renderer never sees values the native driver moves.
    jest.replaceProperty(Platform, 'OS', 'web');
    mockReducedMotion.mockReturnValue(reduced);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    if (stuck) animationsNeverRun();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('shows the verdict word and a working call button from the first render', () => {
    const tree = renderEmergencyPath();
    expect(textNode(tree, 'Toxic')).toBeTruthy();
    expect(textNode(tree, 'Call a vet now')).toBeTruthy();
    pressCallButton(tree);
    expect(Linking.openURL).toHaveBeenCalledWith(`tel:${HOTLINE}`);
  });

  it('leaves the verdict fully visible and in place once the reveal is over', () => {
    const tree = renderEmergencyPath();
    act(() => {
      jest.advanceTimersByTime(verdictRevealMs('toxic') + 1000);
    });
    for (const text of ['Toxic', 'Grapes and raisins', 'Call a vet now']) {
      for (const m of ancestorMotion(textNode(tree, text))) {
        expect(m.opacity).toBe(1);
        expect(m.translateY).toBe(0);
        expect(m.scale).toBe(1);
      }
    }
  });
});
