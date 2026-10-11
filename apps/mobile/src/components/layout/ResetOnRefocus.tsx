import { useIsFocused } from 'expo-router';
import { type ReactNode, useRef, useState } from 'react';

/**
 * Remounts its children each time the screen regains focus after being covered by another
 * screen, so going back to a screen shows it fresh: empty inputs, collapsed accordions, scroll at
 * the top. The Stack keeps covered screens mounted, so without this their local state survives.
 *
 * Route params live in the navigator, not in the screen, so they are unaffected.
 */
export function ResetOnRefocus({ children }: { children: ReactNode }) {
  const focused = useIsFocused();
  const wasBlurred = useRef(false);
  const [generation, setGeneration] = useState(0);

  if (!focused) {
    wasBlurred.current = true;
  } else if (wasBlurred.current) {
    wasBlurred.current = false;
    setGeneration((value) => value + 1);
  }

  return <ResetBoundary key={generation}>{children}</ResetBoundary>;
}

function ResetBoundary({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
