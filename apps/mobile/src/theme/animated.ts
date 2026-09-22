import { cssInterop } from 'nativewind';
import Animated from 'react-native-reanimated';

/**
 * Teaches NativeWind about Reanimated's animated components.
 *
 * NativeWind only applies `className` to components it has been told about. It knows the core
 * React Native components out of the box; it does **not** know `Animated.View`. Passing a
 * `className` to one is silently ignored — no warning, no type error, no build failure. The
 * element renders with its animated `style` and none of its classes, which in this app meant a
 * verdict banner with no background colour and a species-toggle pill that was invisible while
 * being exactly the right size in exactly the right place.
 *
 * Registering it once here is the fix, and importing `AnimatedView` from this module rather than
 * reaching for `Animated.View` directly is what stops the trap being re-set later.
 */
cssInterop(Animated.View, { className: 'style' });

export const AnimatedView = Animated.View;
