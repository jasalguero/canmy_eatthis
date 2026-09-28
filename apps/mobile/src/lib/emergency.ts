import { type Hotline, hotlinesForRegion } from '@canmyeatthis/shared';
import { router } from 'expo-router';
import { Linking } from 'react-native';

/**
 * The emergency path's actions (AGENTS.md #4). Everything here is local: the hotline registry is
 * bundled in `packages/shared`, and calling is a `tel:` link. Only the emergency-vet search needs
 * a connection, and it is offered alongside the numbers, never instead of them.
 */

/** Opens the emergency screen. What every `EmergencyCallButton` does. */
export function openEmergency(): void {
  router.push('/emergency');
}

/**
 * The region's lines. Unverified lines appear only in a development build, marked as such
 * (docs/05 §3: a number reaches a release only after a person has dialled it).
 */
export function emergencyHotlines(region: string, isDev: boolean = __DEV__): Hotline[] {
  return hotlinesForRegion(region, { includeUnverified: isDev });
}

export function callHotline(hotline: Hotline): void {
  void Linking.openURL(`tel:${hotline.phone}`);
}

/** A maps search, which the platform opens in its maps app or the browser. */
export function findEmergencyVetUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
