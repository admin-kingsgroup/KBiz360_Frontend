import { create } from 'zustand';

/**
 * Nav-focus: lets a deep-link carry an entity to focus, threaded past the plain
 * string-router. An alert sets `{ route, params }` then navigates; the target
 * screen (matched by route) reads it via useNavFocus()/FocusBanner and applies
 * it (default tab, highlight, prefilled filter). Cleared on dismiss.
 *
 *   setNavFocus('/transactions/voucher-approvals', { kind:'voucher', status:'pending' });
 *   navigate('/transactions/voucher-approvals');
 */
export const useNavFocusStore = create((set) => ({
  focus: null, // { route, params }
  setFocus: (route, params) => set({ focus: route ? { route, params: params || {} } : null }),
  clear: () => set({ focus: null }),
}));

export const setNavFocus = (route, params) => useNavFocusStore.getState().setFocus(route, params);

// Returns the focus params iff the current focus targets `route`, else null.
export function useNavFocus(route) {
  return useNavFocusStore((s) => (s.focus && s.focus.route === route ? s.focus.params : null));
}
