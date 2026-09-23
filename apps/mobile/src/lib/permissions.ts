import { Linking } from 'react-native';

/**
 * docs/07 Phase 3: "permission flows including denied and denied-permanently (deep-link to
 * Settings)". `expo-camera`/`expo-image-picker` permission hooks return a `PermissionResponse`
 * (`{granted, canAskAgain, status}`); this maps that native shape to the three UI states the
 * capture screens actually branch on, kept pure so the branching logic is unit-testable without
 * a native permissions call.
 */
export type PermissionUiState = 'granted' | 'denied' | 'denied-permanently';

export function permissionUiState(
  response: { granted: boolean; canAskAgain: boolean } | null | undefined,
): PermissionUiState {
  if (!response) return 'denied';
  if (response.granted) return 'granted';
  return response.canAskAgain ? 'denied' : 'denied-permanently';
}

/** The only way out of `denied-permanently` — the OS will not show its own prompt again. */
export function openAppSettings(): void {
  void Linking.openSettings();
}
