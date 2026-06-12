// ───────────────────────────────────────────────────────────────────────────
// Global keyboard layer. One document-level keydown listener dispatches to
// handlers registered by combo. LIFO per combo, so the most-recently-mounted
// owner (e.g. the topmost modal) wins — its Esc fires, not the screen's.
//
//   useHotkey('mod+l', openLedgerSwitcher, [deps]);   // mod = Ctrl or Cmd
//   useHotkey('esc', onClose);                         // modal close
//
// While typing in an input/textarea/select, printable single keys are ignored
// so they don't hijack typing; Esc and any chord with mod/alt always fire.
// ───────────────────────────────────────────────────────────────────────────
import React, { createContext, useContext, useEffect, useRef } from 'react';

const HotkeysCtx = createContext(null);

const KEY_ALIAS = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  Escape: 'esc', ' ': 'space', Enter: 'enter',
};
function comboOf(e) {
  let k = e.key;
  k = KEY_ALIAS[k] || k.toLowerCase();
  const isMod = ['control', 'meta', 'alt', 'shift'].includes(k);
  // A shifted punctuation key already encodes shift in its character (e.g. "?"),
  // so don't add a redundant "shift+" to it — otherwise "?" becomes "shift+?".
  const punct = k.length === 1 && !/[a-z0-9]/i.test(k);
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('mod');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey && !punct) parts.push('shift');
  if (!isMod) parts.push(k);
  return parts.join('+');
}
const isTyping = (el) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

export function HotkeysProvider({ children }) {
  const reg = useRef(new Map()); // combo -> entry[]
  const api = useRef(null);
  if (!api.current) {
    api.current = {
      register(combo, fn, opts = {}) {
        const c = String(combo).toLowerCase();
        const list = reg.current.get(c) || [];
        const entry = { fn, opts };
        list.push(entry);
        reg.current.set(c, list);
        return () => { const l = reg.current.get(c) || []; const i = l.indexOf(entry); if (i >= 0) l.splice(i, 1); };
      },
    };
  }

  useEffect(() => {
    const onKey = (e) => {
      const combo = comboOf(e);
      const list = reg.current.get(combo);
      if (!list || !list.length) return;
      const entry = list[list.length - 1]; // LIFO: topmost owner wins
      const chord = combo.includes('mod') || combo.includes('alt') || combo === 'esc';
      if (!entry.opts.allowInInput && isTyping(e.target) && !chord) return;
      e.preventDefault();
      entry.fn(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return <HotkeysCtx.Provider value={api.current}>{children}</HotkeysCtx.Provider>;
}

// Register a hotkey for the lifetime of the component (re-binds when deps change).
export function useHotkey(combo, fn, deps = []) {
  const ctx = useContext(HotkeysCtx);
  useEffect(() => {
    if (!ctx) return undefined;
    return ctx.register(combo, fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
