import { Asset } from 'expo-asset';

/**
 * A stand-in photo for the Phase 2 tray.
 *
 * `PhotoThumb` takes a URI string because that is what `expo-image-picker` and `expo-camera`
 * hand back in Phase 3 (a `file://` path). So the mock resolves a bundled asset to its URI rather
 * than passing a `require()` handle, and the component never learns that Phase 2 had no camera.
 *
 * Resolved through `expo-asset` rather than `Image.resolveAssetSource`: the latter does not
 * exist on react-native-web, and the web build is where the Phase 2 screenshots come from.
 *
 * It reuses the app icon: adding placeholder binaries to the repo for a phase that deletes them
 * again is not worth it, and an obviously-not-a-photo image makes it plain in a screenshot that
 * nothing here came from a camera.
 */
export const MOCK_PHOTO_URI: string = Asset.fromModule(require('../../assets/icon.png')).uri;
