// ───────────────────────────────────────────────────────────────────────────
// Focus foundation (WS0) — the shared keyboard/focus building blocks every
// overlay and menu in the app composes onto. No business data, no I/O.
//
//   getFocusable(container)         → ordered list of tabbable elements inside
//   useFocusTrap(ref, opts)         → trap Tab within a container, auto-focus,
//                                      restore focus to the opener on unmount
//   useReturnFocus(active)          → remember + restore focus across an overlay
//
// Esc-to-close is intentionally NOT handled here — the app already owns that via
// core/ux/modalStore (pushModal) + the global hotkey layer. These hooks only
// manage *focus*, so they compose cleanly with the existing Esc plumbing.
// ───────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react';

// Standard tabbable selector. `[tabindex="-1"]` is programmatically focusable
// but NOT tabbable, so it's excluded from the Tab cycle on purpose.
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// Elements that are present but not actually reachable. We deliberately avoid
// layout-based checks (offsetWidth/getClientRects) because they're always 0 in
// jsdom and would make every element look hidden under test.
function isReachable(el) {
  if (!el) return false;
  if (el.hasAttribute('disabled')) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  if (el.closest('[hidden]')) return false;
  if (el.closest('[aria-hidden="true"]')) return false;
  return true;
}

// Ordered tabbable descendants of `container` (document order). Used by the
// focus trap and by the menu/combobox primitives to compute first/last.
export function getFocusable(container) {
  if (!container || typeof container.querySelectorAll !== 'function') return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isReachable);
}

// Trap Tab/Shift+Tab inside `ref.current` while `active`. On activate, moves
// focus into the container (first focusable, or the container itself); on
// deactivate/unmount, restores focus to whatever was focused before.
//
//   useFocusTrap(panelRef);                         // default: active, autofocus
//   useFocusTrap(panelRef, { active: open });       // gate by open state
//   useFocusTrap(panelRef, { autoFocus: false });   // caller focuses manually
export function useFocusTrap(ref, { active = true, autoFocus = true, returnFocus = true } = {}) {
  useEffect(() => {
    if (!active) return undefined;
    const container = ref && ref.current;
    if (!container) return undefined;

    const previouslyFocused = returnFocus ? document.activeElement : null;

    if (autoFocus) {
      const focusables = getFocusable(container);
      let target = focusables[0];
      if (!target) {
        // Nothing tabbable inside — make the container itself focusable so the
        // user lands inside the overlay rather than on the page behind it.
        if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
        target = container;
      }
      try { target.focus(); } catch { /* ignore */ }
    }

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const focusables = getFocusable(container);
      if (focusables.length === 0) { e.preventDefault(); return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !container.contains(activeEl)) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      if (returnFocus && previouslyFocused && typeof previouslyFocused.focus === 'function') {
        try { previouslyFocused.focus(); } catch { /* ignore */ }
      }
    };
  }, [ref, active, autoFocus, returnFocus]);
}

// Remember the focused element when `active` becomes true and restore it when
// `active` turns false / the component unmounts. Use when you don't need a full
// trap (e.g. a transient popover) but still want focus to return to the opener.
export function useReturnFocus(active) {
  const previous = useRef(null);
  useEffect(() => {
    if (!active) return undefined;
    previous.current = document.activeElement;
    return () => {
      const el = previous.current;
      if (el && typeof el.focus === 'function') {
        try { el.focus(); } catch { /* ignore */ }
      }
    };
  }, [active]);
}

// Shared key handler builder for roving-focus lists (menus, listboxes). Given
// the current index + item count, returns the next index for an arrow/Home/End
// key, or null if the key isn't a navigation key. Pure — easy to unit-test and
// reused by the Menu + Combobox primitives so their keyboard model stays identical.
//
//   const next = rovingNextIndex(e.key, i, items.length, { orientation: 'vertical' });
//   if (next != null) { e.preventDefault(); focus(next); }
export function rovingNextIndex(key, current, count, { orientation = 'vertical', loop = true } = {}) {
  if (count <= 0) return null;
  const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
  const prevKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
  const clamp = (i) => {
    if (i < 0) return loop ? count - 1 : 0;
    if (i >= count) return loop ? 0 : count - 1;
    return i;
  };
  switch (key) {
    case nextKey: return clamp(current + 1);
    case prevKey: return clamp(current - 1);
    case 'Home': return 0;
    case 'End': return count - 1;
    default: return null;
  }
}
