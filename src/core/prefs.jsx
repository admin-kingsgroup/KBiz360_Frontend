// ───────────────────────────────────────────────────────────────────────────
// Per-user UI preferences, synced to the backend (GET/PUT /api/user-prefs) with
// a localStorage cache so the UI is instant on load and resilient offline.
//
//   const { prefs, setPref, ready } = usePrefs();
//   setPref('lastLedger', 'Sundry Creditors');   // debounced server write
//
// Top-level keys are replaced wholesale (recents, lastLedger, hotkeys, …) — the
// backend shallow-merges, so independent keys never clobber each other.
// ───────────────────────────────────────────────────────────────────────────
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { apiGet, apiPut } from './api';

const PrefsCtx = createContext({ prefs: {}, setPref: () => {}, ready: false });
export const usePrefs = () => useContext(PrefsCtx);

const LS_KEY = 'kb360-prefs';
const readLS = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch { return {}; } };
const writeLS = (p) => { try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /* ignore quota */ } };

export function PrefsProvider({ enabled = true, children }) {
  const [prefs, setPrefs] = useState(readLS);
  const [ready, setReady] = useState(false);
  const timer = useRef(null);
  const pending = useRef({});

  // Load the server copy once (when signed in) and merge it over the local cache.
  useEffect(() => {
    if (!enabled) { setReady(true); return undefined; }
    let alive = true;
    apiGet('/api/user-prefs')
      .then((d) => {
        if (!alive) return;
        const merged = { ...readLS(), ...(d && typeof d === 'object' ? d : {}) };
        setPrefs(merged); writeLS(merged);
      })
      .catch(() => { /* offline / not-authed → keep local cache */ })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [enabled]);

  const flush = () => {
    const patch = pending.current; pending.current = {};
    if (!enabled || !Object.keys(patch).length) return;
    apiPut('/api/user-prefs', patch).catch(() => { /* best-effort; cache already holds it */ });
  };

  // Update one top-level key: optimistic local + cache write, debounced server PUT.
  const setPref = (key, value) => {
    setPrefs((p) => { const next = { ...p, [key]: value }; writeLS(next); return next; });
    pending.current[key] = value;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return <PrefsCtx.Provider value={{ prefs, setPref, ready }}>{children}</PrefsCtx.Provider>;
}
