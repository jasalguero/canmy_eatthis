/**
 * Bold Ink's two font families (docs/02-tech-decisions.md D25): Lilita One for the `display`
 * type role, Nunito for everything else. Both are bundled TTF assets via `@expo-google-fonts/*`
 * — loaded from the app bundle, not fetched — so this holds docs/10 §5's "collect nothing"
 * posture and the Phase 2 screenshot script's "zero network calls in the build" assertion.
 *
 * Each family/weight pair below is its own font FILE with its own PostScript name (e.g.
 * `Nunito_700Bold`) — Google Fonts ship this way, and React Native does not synthesise a bold or
 * medium weight across separate font files the way it can for a single variable system font.
 * That is why `tailwind.config.js` maps each typography role straight to the loaded family name
 * for the weight that role needs (`theme/tokens.ts`'s `typography.<role>.weight`), rather than
 * combining one generic family with a `fontWeight` style — the latter silently does nothing on
 * fonts installed this way.
 */
import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';

/** Passed to `useFonts` — the shape it wants: `{ <family name>: <asset module> }`. */
export const FONT_ASSETS = {
  LilitaOne_400Regular,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_700Bold,
  Nunito_800ExtraBold,
};

/**
 * True once every Bold Ink font is loaded and ready to render with. The root layout gates
 * rendering on this (holds the splash screen) so no screen is ever shown mid-swap from the
 * platform system font to Lilita One / Nunito.
 */
export function useAppFonts(): boolean {
  const [loaded] = useFonts(FONT_ASSETS);
  return loaded;
}
