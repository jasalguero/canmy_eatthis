import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Vector icons for `IconButton`'s `icon` slot (docs/02-tech-decisions.md D25).
 *
 * `IconButton`'s existing glyphs (`×`, `✕`, `←`, `→`) are plain punctuation, which every platform
 * renders as flat, monochrome text. A gear-shaped Unicode character (`⚙`, U+2699) is not: it is
 * one of the characters several platforms give a default *colour emoji* presentation, and real
 * iOS Simulator testing confirmed it — it rendered as a solid blue circular badge, not the
 * ink-coloured icon docs/06 calls for. A path drawn with `react-native-svg` has no text
 * presentation to fall back to, so it can't regress this way. Colour is a required prop, resolved
 * by the caller from `tokens` (the same pattern `Mascot`/`SpeciesToggle` already use for concrete
 * colour strings), rather than a `className` — NativeWind has no `cssInterop` registration for
 * `react-native-svg` elements in this project, and adding one is exactly the kind of extra
 * indirection docs/02 D23 already burned time on for `Animated.View`.
 */
export interface IconProps {
  size?: number;
  color: string;
}

/** The "sliders" settings icon — matches the Bold Ink design canvas's own settings glyph. */
export function SettingsIcon({ size = 22, color }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
    >
      <Path d="M4 7h8.5M16.5 7H20M4 12h2.5M10.5 12H20M4 17h10.5M18.5 17H20" />
      <Circle cx={14.5} cy={7} r={2} />
      <Circle cx={8.5} cy={12} r={2} />
      <Circle cx={16.5} cy={17} r={2} />
    </Svg>
  );
}

/** A clock face — "recent checks" (History), matching the design canvas's history glyph. */
export function HistoryIcon({ size = 22, color }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

/** A camera body — the photo tray's empty-state icon, matching the design canvas's camera glyph. */
export function CameraIcon({ size = 26, color }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M3.5 8.6A1.6 1.6 0 0 1 5.1 7h2.5l1.6-2.4h5.6L16.4 7h2.5a1.6 1.6 0 0 1 1.6 1.6v8.8a1.6 1.6 0 0 1-1.6 1.6H5.1a1.6 1.6 0 0 1-1.6-1.6z" />
      <Circle cx={12} cy={12.8} r={3.3} />
    </Svg>
  );
}
