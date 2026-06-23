import React from 'react';

/* ════════════════════════════════════════════════════════════════════
   lazyModule — code-split a whole feature module behind React.lazy()
   while keeping App.jsx's existing *named* imports working unchanged.
   ════════════════════════════════════════════════════════════════════

   Before:
     import { SalesFlight, SalesHoliday } from './modules/transactions';
   After:
     const { SalesFlight, SalesHoliday } = lazyModule(() => import('./modules/transactions'));

   Returns a Proxy. Each property access yields a STABLE React.lazy()
   component that resolves to that named export. Every access shares the
   ONE dynamic import() literal you pass in, so Vite/Rollup emit a single
   chunk per module that downloads only on first render of any of its
   screens — instead of everything landing in the initial bundle.

   Requirements:
     • the import() argument must be a string literal (so the bundler can
       statically find and split it)
     • rendered components must sit inside a <Suspense> boundary
   ──────────────────────────────────────────────────────────────────── */

/* A dynamic import() rejects with one of these messages when the chunk
   file 404s. That happens after a fresh deploy: the open tab still holds
   the OLD index.html, so it asks for a chunk hash (outstanding-XNYP_KmG.js)
   that no longer exists on the server. It is NOT a code bug — the cure is
   to reload so the browser fetches the new index.html + current hashes. */
export function isChunkLoadError(err) {
  const msg = String((err && err.message) || err || '');
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) || // Safari
    /'?text\/html'? is not a valid JavaScript MIME type/i.test(msg) // 404 page served as JS
  );
}

const RELOAD_KEY = 'kbiz_chunk_reload_ts';

/* Wrap the dynamic import with: one transient retry (network blip), then a
   single guarded full reload on a genuine stale-chunk failure. The reload is
   throttled via sessionStorage so a chunk that is *truly* gone (e.g. a build
   that never shipped it) can't trap the user in an infinite reload loop —
   after the one reload we let the error surface to the ErrorBoundary. */
export function importWithRetry(loader) {
  return loader().catch((err) =>
    // brief pause then a single retry — covers a momentary network/CDN blip
    new Promise((resolve) => setTimeout(resolve, 500))
      .then(() => loader())
      .catch((err2) => {
        if (isChunkLoadError(err2 || err) && typeof window !== 'undefined') {
          let last = 0;
          try { last = Number(window.sessionStorage.getItem(RELOAD_KEY)) || 0; } catch { /* private mode */ }
          const now = Date.now();
          if (now - last > 10000) {
            try { window.sessionStorage.setItem(RELOAD_KEY, String(now)); } catch { /* ignore */ }
            // Navigating to a not-yet-loaded screen, so a reload is safe here.
            window.location.reload();
            // keep the promise pending; the page is on its way out
            return new Promise(() => {});
          }
        }
        // already reloaded recently (or not a chunk error) → let it surface
        throw err2 || err;
      })
  );
}

export function lazyModule(loader) {
  const cache = Object.create(null);
  return new Proxy(cache, {
    get(target, name) {
      // Destructuring only reads string keys; guard stray symbol probes.
      if (typeof name !== 'string') return target[name];
      if (!target[name]) {
        target[name] = React.lazy(() =>
          importWithRetry(loader).then((m) => {
            if (!(name in m)) {
              throw new Error(`lazyModule: export "${name}" not found in module`);
            }
            return { default: m[name] };
          })
        );
      }
      return target[name];
    },
  });
}
