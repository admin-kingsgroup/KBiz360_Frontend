import { useCallback } from 'react';

/**
 * Wraps the App-level setRoute into a stable navigate callback. Keeping this
 * in a hook means pages don't worry about prop drilling — they just call
 * `navigate(path)`.
 */
export function useDashboardActions(setRoute) {
  return {
    navigate: useCallback((route) => setRoute(route), [setRoute]),
  };
}
