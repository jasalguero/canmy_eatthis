import { VerdictSchema } from '@canmyeatthis/shared';

import {
  ENTRANCES,
  type Keyframes,
  LOOPS,
  SPLASH,
  VERDICT_MOTION,
  verdictRevealMs,
} from './motion';

const VERDICTS = VerdictSchema.options;

const REST: Record<string, number> = {
  opacity: 1,
  translateX: 0,
  translateY: 0,
  translateYFraction: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  rotate: 0,
};

function channels(spec: Keyframes) {
  return Object.entries(spec).filter(([key]) => key in REST) as [string, readonly number[]][];
}

describe('motion specs', () => {
  it.each(Object.entries(ENTRANCES))(
    'entrance %s ends on the element’s ordinary, fully visible layout',
    (_name, spec) => {
      // `Enter` snaps to this frame whenever the animation is skipped or never reaches the
      // device, so it has to be the un-animated layout — never a hidden or offset one.
      for (const [key, values] of channels(spec)) {
        expect(values[values.length - 1]).toBe(REST[key]);
      }
    },
  );

  it.each([...Object.entries(ENTRANCES), ...Object.entries(LOOPS)])(
    '%s has one value per keyframe offset, in order, from 0 to 1',
    (_name, spec) => {
      expect(spec.at[0]).toBe(0);
      expect(spec.at[spec.at.length - 1]).toBe(1);
      // Strictly increasing: sorted, and no offset repeated.
      expect([...spec.at].sort((a, b) => a - b)).toEqual([...spec.at]);
      expect(new Set(spec.at).size).toBe(spec.at.length);
      for (const [, values] of channels(spec)) expect(values).toHaveLength(spec.at.length);
    },
  );
});

describe('verdict motion', () => {
  it('only a no-known-toxicity result bounces or sparkles', () => {
    for (const verdict of VERDICTS) {
      const m = VERDICT_MOTION[verdict];
      const playful = m.banner === 'drop' || m.badge === 'pop' || m.mascot === 'mpop' || m.sparkles;
      expect(playful).toBe(verdict === 'safe');
    }
  });

  it('a toxic verdict lands firmly and its mascot stays calm', () => {
    expect(VERDICT_MOTION.toxic).toMatchObject({
      banner: 'dropFirm',
      badge: 'thud',
      mascot: 'fade',
      stagger: false,
      mascotIdle: false,
    });
  });

  it('a toxic verdict is fully shown within half a second', () => {
    expect(verdictRevealMs('toxic')).toBeLessThanOrEqual(500);
  });

  it('every verdict word is on screen within a second', () => {
    for (const verdict of VERDICTS) expect(verdictRevealMs(verdict)).toBeLessThanOrEqual(1000);
  });
});

describe('boot splash', () => {
  it('is gone in under 1.6 seconds', () => {
    expect(SPLASH.holdUntil + SPLASH.fadeOut).toBeLessThan(1600);
  });
});
