import { type ReactNode, createContext, useContext, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  type EasingFunction,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import {
  EASING_BEZIER,
  ENTRANCES,
  type EntranceKind,
  type Keyframes,
  LOOPS,
  type LoopKind,
  type MotionEasing,
} from '@/theme/motion';

/**
 * Bold Ink's motion, on React Native's own `Animated` API (docs/02-tech-decisions.md D26).
 *
 * **Not `react-native-reanimated`.** D23 found Reanimated's animated styles never reached the
 * native view here. Core `Animated` is a separate pipeline (the native driver ships a static
 * animation graph to the platform once, rather than committing styles from a worklet), and it is
 * only ever used here for `transform` and `opacity` — the two properties the native driver owns.
 * Nothing here animates a colour, a size, or anything that carries information.
 *
 * Three rules make a failure here cosmetic rather than a safety problem:
 *
 *  1. **Every entrance ends on the ordinary layout** (`theme/motion.test.ts` asserts it), and
 *     `useEntrance` snaps the value there on a timer after the animation should have finished,
 *     whether or not the platform ever ran it. The worst case is a missing flourish, never a
 *     hidden or offset verdict.
 *  2. **Motion off means no animated style at all** — not a zero-length animation. Reduced motion
 *     (docs/06 §1) and `MotionStill` (the gallery and the screenshot script) render the child
 *     exactly as it would be without this file.
 *  3. **Nothing waits on an animation.** Content is mounted, laid out and accessible from the
 *     first frame; motion only moves it.
 *
 * `useReducedMotion` still comes from `react-native-reanimated` — it is a synchronous read of the
 * OS setting, not an animation, and it is what the rest of the app already uses.
 */

/**
 * The native driver doesn't exist on web; there, `Animated` runs the same graph in JS. A function,
 * read at animation start, so the emergency-path test can run the JS driver — a test renderer
 * never sees values the native driver moves.
 */
export function nativeDriver(): boolean {
  return Platform.OS !== 'web';
}

/** How long after an entrance should have finished before it is forced onto its last frame. */
const SETTLE_GRACE_MS = 400;

const StillContext = createContext(false);

/** Freezes every `Enter`/`Loop` below it on its rest frame — the gallery and `?still=1`. */
export function MotionStill({ still = true, children }: { still?: boolean; children: ReactNode }) {
  return <StillContext.Provider value={still}>{children}</StillContext.Provider>;
}

/** False under reduced motion or `MotionStill`. */
export function useMotionEnabled(): boolean {
  const reduced = useReducedMotion();
  const still = useContext(StillContext);
  return !reduced && !still;
}

export function easingFor(name: MotionEasing): EasingFunction {
  if (name === 'linear') return Easing.linear;
  const [x1, y1, x2, y2] = EASING_BEZIER[name];
  return Easing.bezier(x1, y1, x2, y2);
}

export interface KeyframeScale {
  /** Multiplies every pixel translate — for art drawn at a different scale than the design. */
  unit?: number;
  /** What `translateYFraction` is a fraction of. */
  distance?: number;
  /**
   * Where rotations and scales pivot, as a point's offset from the view's own centre in points.
   * Done with an explicit translate-rotate-translate rather than `transformOrigin`: with a
   * `transformOrigin` the mascot's ears vanished outright on iOS 27 / RN 0.86 (the layer never
   * painted — found on a simulator with a tinted layer), and nothing here can afford a hidden
   * layer for the sake of a pivot.
   */
  pivot?: readonly [number, number];
}

/** A spec's channels as an animated `opacity` + `transform` style driven by `progress` (0→1). */
export function keyframeStyle(
  progress: Animated.Value,
  spec: Keyframes,
  { unit = 1, distance = 0, pivot }: KeyframeScale = {},
): Animated.WithAnimatedObject<ViewStyle> {
  const inputRange = spec.at as number[];
  const lerp = (values: readonly number[], k = 1) =>
    progress.interpolate({ inputRange, outputRange: values.map((v) => v * k) });
  const constant = (range: number[], value: number) =>
    progress.interpolate({ inputRange: range, outputRange: range.map(() => value) });

  // Loosely typed while it's built: RN's transform union type doesn't accept one-key objects
  // pushed into an array. The shape is exactly what `transform` takes.
  const transform: Record<string, Animated.AnimatedInterpolation<number | string>>[] = [];
  if (spec.translateX) transform.push({ translateX: lerp(spec.translateX, unit) });
  if (spec.translateY) transform.push({ translateY: lerp(spec.translateY, unit) });
  if (spec.translateYFraction)
    transform.push({ translateY: lerp(spec.translateYFraction, distance) });
  // Rotating or scaling about `pivot`: move the pivot to the centre, transform, move it back.
  const pivoted = pivot && (spec.rotate || spec.scale || spec.scaleX || spec.scaleY);
  if (pivot && pivoted) {
    transform.push({ translateX: constant(inputRange, pivot[0]) });
    transform.push({ translateY: constant(inputRange, pivot[1]) });
  }
  if (spec.rotate) {
    transform.push({
      rotate: progress.interpolate({
        inputRange,
        outputRange: spec.rotate.map((d) => `${d}deg`),
      }),
    });
  }
  if (spec.scale) transform.push({ scale: lerp(spec.scale) });
  if (spec.scaleX) transform.push({ scaleX: lerp(spec.scaleX) });
  if (spec.scaleY) transform.push({ scaleY: lerp(spec.scaleY) });
  if (pivot && pivoted) {
    transform.push({ translateX: constant(inputRange, -pivot[0]) });
    transform.push({ translateY: constant(inputRange, -pivot[1]) });
  }

  const style: Record<string, unknown> = {};
  if (spec.opacity) style.opacity = lerp(spec.opacity);
  if (transform.length > 0) style.transform = transform;
  return style as Animated.WithAnimatedObject<ViewStyle>;
}

/**
 * Runs `spec` once, 0→1, after `delay`. Re-runs when `replayKey` changes. With motion off the
 * value simply sits at 1 (the rest frame) and no animation is created.
 */
export function useEntrance(
  spec: Keyframes,
  {
    delay = 0,
    enabled = true,
    replayKey,
  }: { delay?: number; enabled?: boolean; replayKey?: unknown } = {},
): Animated.Value {
  const value = useRef(new Animated.Value(enabled ? 0 : 1)).current;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `replayKey` is the replay trigger itself.
  useEffect(() => {
    if (!enabled) {
      value.setValue(1);
      return;
    }
    value.setValue(0);
    const animation = Animated.timing(value, {
      toValue: 1,
      duration: spec.duration,
      delay,
      easing: easingFor(spec.easing),
      useNativeDriver: nativeDriver(),
    });
    animation.start(({ finished }) => {
      if (!finished) value.setValue(1);
    });
    // Rule 1 above: the rest frame is guaranteed by the clock, not by the animation.
    const settle = setTimeout(() => value.setValue(1), delay + spec.duration + SETTLE_GRACE_MS);
    return () => {
      clearTimeout(settle);
      animation.stop();
    };
  }, [enabled, replayKey, delay, spec, value]);

  return value;
}

/**
 * Repeats `spec` forever, after an initial `delay` (CSS's `animation-delay` on an infinite
 * animation: the wait happens once). `alternate` plays it back and forth.
 */
export function useLoop(
  spec: Keyframes,
  {
    delay = 0,
    enabled = true,
    alternate = false,
  }: { delay?: number; enabled?: boolean; alternate?: boolean } = {},
): Animated.Value {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) {
      value.setValue(0);
      return;
    }
    const easing = easingFor(spec.easing);
    const leg = (toValue: number) =>
      Animated.timing(value, {
        toValue,
        duration: spec.duration,
        easing,
        useNativeDriver: nativeDriver(),
      });
    // `Animated.loop` resets the value to where it started before every iteration.
    const cycle = alternate ? Animated.sequence([leg(1), leg(0)]) : leg(1);
    const animation = Animated.sequence([Animated.delay(delay), Animated.loop(cycle)]);
    value.setValue(0);
    animation.start();
    return () => animation.stop();
  }, [enabled, delay, alternate, spec, value]);

  return value;
}

interface WrapperProps extends KeyframeScale {
  delay?: number;
  style?: StyleProp<ViewStyle>;
  /** Where rotations and scales pivot, as a CSS `transform-origin` string ("50% 100%", "12px 4px"). */
  origin?: string;
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
  children?: ReactNode;
}

/** Plays a one-shot entrance on mount (and again whenever `replayKey` changes). */
export function Enter({
  kind,
  replayKey,
  delay = 0,
  unit,
  distance,
  pivot,
  style,
  origin,
  pointerEvents,
  children,
}: WrapperProps & { kind: EntranceKind; replayKey?: unknown }) {
  const enabled = useMotionEnabled();
  const spec = ENTRANCES[kind];
  const progress = useEntrance(spec, { delay, enabled, replayKey });
  return (
    <Animated.View
      pointerEvents={pointerEvents}
      style={[
        style,
        enabled ? keyframeStyle(progress, spec, { unit, distance, pivot }) : null,
        enabled && origin ? { transformOrigin: origin } : null,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Loops `kind` for as long as it is mounted. Decorative only — never wrap information in it. */
export function Loop({
  kind,
  delay = 0,
  unit,
  distance,
  pivot,
  style,
  origin,
  pointerEvents,
  enabled: enabledProp = true,
  children,
}: WrapperProps & { kind: LoopKind; enabled?: boolean }) {
  const enabled = useMotionEnabled() && enabledProp;
  const spec = LOOPS[kind];
  const progress = useLoop(spec, { delay, enabled });
  return (
    <Animated.View
      pointerEvents={pointerEvents}
      style={[
        style,
        enabled ? keyframeStyle(progress, spec, { unit, distance, pivot }) : null,
        enabled && origin ? { transformOrigin: origin } : null,
      ]}
    >
      {children}
    </Animated.View>
  );
}
