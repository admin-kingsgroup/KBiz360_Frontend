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
export function lazyModule(loader) {
  const cache = Object.create(null);
  return new Proxy(cache, {
    get(target, name) {
      // Destructuring only reads string keys; guard stray symbol probes.
      if (typeof name !== 'string') return target[name];
      if (!target[name]) {
        target[name] = React.lazy(() =>
          loader().then((m) => {
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
