import './core/formPersistence.js';   // ← draft autosave to localStorage (load first)
import React from 'react';
import ReactDOM from 'react-dom/client';
import { installNumberWheelGuard } from './core/ux/numberGuard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* BrowserRouter makes the URL the single source of truth (deep links +
          native Back/Forward). App bridges its NavContext onto react-router so
          existing consumers keep their { route, navigate, goBack, … } API. */}
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
