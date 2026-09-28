import type { Species } from '@canmyeatthis/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Image, type LayoutChangeEvent, View } from 'react-native';

import { Mascot } from '@/components/feedback';
import { Screen } from '@/components/layout';
import {
  Button,
  CheckIcon,
  Enter,
  Loop,
  MagnifierIcon,
  Text,
  keyframeStyle,
  useLoop,
  useMotionEnabled,
} from '@/components/primitives';
import { useDraftStore } from '@/lib/draft';
import { resolveOffline } from '@/lib/offlineKb';
import { MOCK_PHOTO_URI } from '@/mock/photos';
import { useTheme } from '@/theme/ThemeProvider';
import { MAGNIFIER_COLORS } from '@/theme/mascot';
import { type Keyframes, MAGNIFIER, SCAN } from '@/theme/motion';
import { hardShadow, radius, sizes, tokens } from '@/theme/tokens';

/**
 * Signature interaction #2 (docs/06 §2): the scanning state.
 *
 * Not a spinner. The user's photo stays on screen with a status line stepping through real
 * stages, which makes a couple of seconds read as feedback rather than as waiting.
 *
 * The stage line is an `accessibilityLiveRegion`, so a screen-reader user gets the same progress
 * information a sighted user gets from the stage list — that text list is what carries the
 * information. There used to also be a shimmer sweeping over the photo; it is gone
 * (docs/02-tech-decisions.md D23) — the `react-native-reanimated`-driven animation did not
 * reliably render on a real device, the same failure found in `SpeciesToggle`/`VerdictBanner`.
 *
 * **Motion is the canvas's A3 artboard (docs/02 D26)**: the photo tilted in an ink frame with a
 * scan band sweeping it and a magnifier wandering over it, the mascot hooked over its corner with
 * its nose going, and each stage's indicator bouncing dots while active and popping a tick when
 * done. All of it through `components/primitives/Motion.tsx` (core `Animated`, never
 * `react-native-reanimated` — D23), all of it decorative, and all of it still under reduced
 * motion, where the mascot's face goes back to `idle` rather than a frozen sniff.
 *
 * The stages still advance on a fixed timer — for a typed query the real, synchronous on-device
 * resolution (H3) finishes well under `STAGE_MS`, so the timer is what keeps the moment readable
 * rather than a flash. The photo path still has no network call to time against (H4); H5
 * replaces its timer with the real request lifecycle, and the presentation does not change.
 */

/**
 * The stages differ by input, and not only for polish.
 *
 * A typed check never sends anything: it resolves against the bundled knowledge base, on device
 * and offline (H3). Showing "Preparing your photo" and "Sending it for identification" for a
 * text lookup would be telling the user their data left the device when it did not — which, in
 * an app whose privacy position is "we collect nothing" (docs/10 §5), is the one thing the
 * loading copy must not get wrong.
 */
const PHOTO_STAGE_KEYS = [
  'identify:stage_preparing',
  'identify:stage_uploading',
  'identify:stage_identifying',
  'identify:stage_matching',
] as const;

const TEXT_STAGE_KEYS = ['identify:stage_reading', 'identify:stage_matching'] as const;

/** Long enough to read, short enough not to feel stuck. */
const STAGE_MS = 900;

export default function Identifying() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ species?: string; hasPhoto?: string }>();
  const hasPhoto = params.hasPhoto === '1';
  const species: Species = params.species === 'cat' ? 'cat' : 'dog';
  const [stage, setStage] = useState(0);
  const stageKeys = hasPhoto ? PHOTO_STAGE_KEYS : TEXT_STAGE_KEYS;
  const description = useDraftStore((state) => state.description);
  const draftPhotos = useDraftStore((state) => state.photos);
  const previewUri = draftPhotos[0] ?? MOCK_PHOTO_URI;

  // Only a photo is "sniffed": it's a metaphor for examining the picture, and doesn't fit a
  // typed lookup, which never leaves the device (see the doc comment above).
  const motionOn = useMotionEnabled();

  useEffect(() => {
    if (stage < stageKeys.length - 1) {
      const id = setTimeout(() => setStage((s) => s + 1), STAGE_MS);
      return () => clearTimeout(id);
    }

    // Last stage: hand off, rather than sitting on a finished progress list forever.
    //
    // A photo-derived identification always goes through Confirm — real photo *identification*
    // needs a vision model that doesn't exist until H4, so this still hands off to Confirm's
    // mock candidates (AGENTS.md #1: the model produces candidates, never verdicts, so this was
    // always going through a confirmation step regardless).
    //
    // Typed input is real as of H3: `resolveOffline` runs the on-device exact/alias/fuzzy
    // resolver from `packages/shared` (AGENTS.md #5) against the bundled KB. An exact match
    // skips Confirm — nothing to confirm when the user typed the exact name — a fuzzy match
    // goes to Confirm with that one real candidate, and no match is a real `unknown`, not a mock.
    const id = setTimeout(() => {
      if (hasPhoto) {
        router.replace('/confirm');
        return;
      }
      const resolution = resolveOffline(description);
      if (resolution.type === 'exact' && resolution.kbId) {
        router.replace({
          pathname: '/result',
          params: { kbId: resolution.kbId, species: params.species ?? 'dog' },
        });
      } else if (resolution.type === 'fuzzy' && resolution.kbId) {
        router.replace({
          pathname: '/confirm',
          params: { kbId: resolution.kbId, species: params.species ?? 'dog' },
        });
      } else {
        router.replace({
          pathname: '/result',
          params: { unknown: '1', species: params.species ?? 'dog', query: description },
        });
      }
    }, STAGE_MS);
    return () => clearTimeout(id);
  }, [stage, hasPhoto, stageKeys.length, description, params.species]);

  return (
    <Screen className="justify-between px-4 py-6">
      <View className="gap-6">
        {/* `display` (Lilita One), matching Home's page title (docs/02-tech-decisions.md D25) —
            both are page headings, sized/fonted the same as the design canvas's `.disp` H1s. */}
        <Text variant="display" tone="primary" accessibilityRole="header">
          {t(hasPhoto ? 'identify:title' : 'identify:titleTextOnly')}
        </Text>

        {/* Decorative — the stage list below carries the actual progress information for
            assistive tech (docs/06 §5), so the mascot and the photo stay out of the tree. */}
        {hasPhoto ? (
          <ScanningPhoto uri={previewUri} species={species} sniffing={motionOn} />
        ) : (
          <View className="items-center">
            <Mascot
              species={species}
              mood="idle"
              pose="peek"
              size={sizes.mascotIdentifying}
              animated
            />
          </View>
        )}

        <View
          accessibilityLiveRegion="polite"
          accessibilityLabel={t('identify:a11yBusy')}
          accessibilityRole="progressbar"
          accessibilityState={{ busy: true }}
          className="gap-3"
          style={hasPhoto ? { marginTop: sizes.scanMascotOverhang } : undefined}
        >
          {stageKeys.map((key, i) => (
            <View key={key} className="flex-row items-center gap-3">
              <StageIndicator state={i < stage ? 'done' : i === stage ? 'active' : 'pending'} />
              <Text
                variant="label"
                tone="primary"
                className={['shrink', i > stage ? 'opacity-50' : i < stage ? 'opacity-80' : '']
                  .filter(Boolean)
                  .join(' ')}
              >
                {t(key)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Button label={t('identify:cancel')} variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

/**
 * The photo being examined (the canvas's A3): tilted like a print on the table, a scan band
 * sweeping it (`a-scan`), a magnifier wandering over it (`a-mag`), and the mascot hooked over its
 * corner, sniffing. All decorative; all of it holds still under reduced motion, where only the
 * band and the magnifier disappear.
 */
function ScanningPhoto({
  uri,
  species,
  sniffing,
}: {
  uri: string;
  species: Species;
  sniffing: boolean;
}) {
  const { theme } = useTheme();
  const t_ = tokens[theme];
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setFrame((f) => (f.width === width && f.height === height ? f : { width, height }));
  };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ zIndex: 1 }}
    >
      {/* Outer view carries the shadow and the tilt; the inner one clips — iOS clips a shadow
          drawn by a view that has `overflow: hidden`. */}
      <View
        style={{
          transform: [{ rotate: '-1.6deg' }],
          borderRadius: radius.lg,
          ...hardShadow[2][theme],
        }}
      >
        <View
          onLayout={onLayout}
          className="aspect-[3/2] w-full overflow-hidden bg-surface-sunken"
          style={{ borderRadius: radius.lg, borderWidth: 3, borderColor: t_.border.strong }}
        >
          <Image source={{ uri }} resizeMode="cover" className="h-full w-full" />
          {frame.height > 0 ? <ScanBand height={frame.height} /> : null}
          {frame.width > 0 ? <Magnifier width={frame.width} height={frame.height} /> : null}
        </View>
      </View>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', insetInlineEnd: -10, bottom: -sizes.scanMascotOverhang }}
      >
        <Mascot
          species={species}
          mood={sniffing ? 'sniff' : 'idle'}
          pose="peek"
          size={sizes.mascotIdentifying}
          animated
        />
      </View>
    </View>
  );
}

function ScanBand({ height }: { height: number }) {
  const { theme } = useTheme();
  const t_ = tokens[theme];
  const enabled = useMotionEnabled();
  const spec = useMemo<Keyframes>(
    () => ({
      duration: SCAN.duration,
      easing: 'inOut',
      at: [0, 1],
      translateY: [-SCAN.bandHeight, height],
    }),
    [height],
  );
  const progress = useLoop(spec, { enabled, alternate: true });
  if (!enabled) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: 0,
          insetInlineStart: -8,
          insetInlineEnd: -8,
          height: SCAN.bandHeight,
          borderTopWidth: 3,
          borderBottomWidth: 3,
          borderColor: t_.border.strong,
        },
        keyframeStyle(progress, spec),
      ]}
    >
      {/* The canvas's `color-mix(brand 32%, transparent)`, as an opacity on a brand fill. */}
      <View style={{ flex: 1, backgroundColor: t_.brand.primary, opacity: 0.32 }} />
    </Animated.View>
  );
}

function Magnifier({ width, height }: { width: number; height: number }) {
  const { theme } = useTheme();
  const enabled = useMotionEnabled();
  // The canvas's path is drawn for a 350×244 photo; stretch it onto this one.
  const sx = width / MAGNIFIER.frameWidth;
  const sy = height / MAGNIFIER.frameHeight;
  const spec = useMemo<Keyframes>(
    () => ({
      ...MAGNIFIER,
      translateX: MAGNIFIER.translateX.map((x) => x * sx),
      translateY: MAGNIFIER.translateY.map((y) => y * sy),
    }),
    [sx, sy],
  );
  const progress = useLoop(spec, { enabled });
  if (!enabled) return null;
  const size = MAGNIFIER.size * Math.min(1, sx);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: 0, insetInlineStart: 0, width: size, height: size },
        keyframeStyle(progress, spec),
      ]}
    >
      <MagnifierIcon
        size={size}
        ink={tokens[theme].border.strong}
        handle={MAGNIFIER_COLORS.handle}
        lens={MAGNIFIER_COLORS.lens}
        glint={MAGNIFIER_COLORS.glint}
      />
    </Animated.View>
  );
}

/**
 * A stage's round indicator (the canvas's `.a-ind`): empty while pending, three bouncing dots
 * while active (`a-dots`), a brand-filled tick that pops in once done. Decorative — the stage
 * text beside it and the live region carry the progress.
 */
function StageIndicator({ state }: { state: 'pending' | 'active' | 'done' }) {
  const { theme } = useTheme();
  const t_ = tokens[theme];
  const ring = {
    width: sizes.stageIndicator,
    height: sizes.stageIndicator,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: t_.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  } as const;

  if (state === 'done') {
    return (
      <Enter kind="check" style={{ ...ring, backgroundColor: t_.brand.primary }}>
        <CheckIcon size={18} color={t_.brand.onPrimary} />
      </Enter>
    );
  }
  return (
    <View style={{ ...ring, backgroundColor: t_.surface.raised, flexDirection: 'row', gap: 3 }}>
      {state === 'active'
        ? [0, 150, 300].map((delay) => (
            <Loop key={delay} kind="dots" delay={delay} pointerEvents="none">
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: radius.full,
                  backgroundColor: t_.text.primary,
                }}
              />
            </Loop>
          ))
        : null}
    </View>
  );
}
