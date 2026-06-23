/* Shared dashboard error state — shown when a dashboard's data query fails
   (network / 5xx / permission). Mirrors the AlertsDashboard error card so every
   dashboard fails the same way: a friendly message + a Retry button, instead of
   an endless loading skeleton. Reduced-motion safe (no animation). */
import React from 'react';
import { RefreshCw } from 'lucide-react';

export function DashboardError({ error, onRetry, title = 'Could not load this dashboard.' }) {
  const detail = error?.message || (typeof error === 'string' ? error : '');
  return (
    <div className="w-full px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8">
      <div
        role="alert"
        className="mx-auto max-w-[640px] rounded-brand border border-surface-border bg-surface p-6 text-center shadow-card"
      >
        <div className="mb-1 text-3xl" aria-hidden="true">⚠️</div>
        <p className="m-0 text-sm font-bold text-ink">{title}</p>
        {detail && <p className="mx-auto mt-1.5 max-w-[480px] text-xs text-ink-muted">{detail}</p>}
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-white px-4 py-2 text-xs font-bold text-ink max-tablet:min-h-[44px]"
          >
            <RefreshCw size={13} /> Retry
          </button>
        )}
      </div>
    </div>
  );
}
