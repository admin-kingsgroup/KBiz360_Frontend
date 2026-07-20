import './core/formPersistence.js';   // ← draft autosave to localStorage (load first)
import './core/exportGuardSetup.js';   // ← wire the (dormant) Report/Export controls
import React from 'react';
import ReactDOM from 'react-dom/client';
import { installNumberWheelGuard } from './core/ux/numberGuard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.jsx';
import { ErrorBoundary } from './shell/ErrorBoundary';
import './index.css';   // ← Tailwind directives + base styles

/* ────────────────────────────────────────────────────────────────────
   TanStack Query client
   Ready for when you add a backend / external API calls.
   Defaults tuned for an internal ERP: long stale time, no aggressive refetch.
   ──────────────────────────────────────────────────────────────────── */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,             // 1 minute
      gcTime: 5 * 60_000,            // keep cache 5 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Protect every <input type="number"> from silent wheel-scroll value changes.
installNumberWheelGuard();

// A DATA router (createBrowserRouter) — same URL-as-source-of-truth as before (deep
// links + native Back/Forward), but it also unlocks react-router's useBlocker, which
// App uses to guard the browser's own Back/Forward against leaving a dirty form. A
// single splat route renders App, which keeps doing its own in-app routing via
// useLocation; ErrorBoundary stays INSIDE the router (unchanged nesting) so it still
// catches App's render errors and can use router hooks.
const router = createBrowserRouter([
  { path: '*', element: <ErrorBoundary><App /></ErrorBoundary> },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
