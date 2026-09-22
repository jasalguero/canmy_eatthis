import { ApiErrorCodeSchema } from '@canmyeatthis/shared';
import { router, useLocalSearchParams } from 'expo-router';

import { ErrorState, type ErrorStateCode } from '@/components/feedback';
import { Screen } from '@/components/layout';

/**
 * The error and offline screens (docs/06 §4: "Designed, not default").
 *
 * One route, parameterised by code, because every error screen has the same obligations: say
 * what happened in one sentence, offer one specific action, and always leave a route to offline
 * text lookup and to the hotline list (AGENTS.md #4).
 *
 * The code is validated against `ApiErrorCodeSchema` rather than trusted from the URL — an
 * unrecognised value falls back to `INTERNAL`, which has copy, instead of rendering a screen of
 * missing translation keys.
 */
export default function ErrorScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const raw = params.code ?? 'INTERNAL';
  const code: ErrorStateCode =
    raw === 'offline' ? 'offline' : (ApiErrorCodeSchema.safeParse(raw).data ?? 'INTERNAL');

  return (
    <Screen className="justify-center">
      <ErrorState
        code={code}
        onRetry={() => router.back()}
        onTypeInstead={() => router.dismissTo('/')}
        onHotlines={() => router.dismissTo('/')}
      />
    </Screen>
  );
}
