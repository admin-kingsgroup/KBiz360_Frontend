import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);
