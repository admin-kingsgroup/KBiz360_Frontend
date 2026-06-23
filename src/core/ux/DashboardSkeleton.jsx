/* Premium dashboard loading skeleton — matches the KBiz360 Pro page rhythm
   (PageLayout padding + card surfaces) and uses the .kb-skeleton shimmer
   (reduced-motion aware). Shared by every dashboard page's loading state. */
import React from 'react';

const Bar = ({ className = '', style }) => <div className={`kb-skeleton ${className}`} style={style} />;
const Pane = ({ children, className = '' }) => (
  <div className={`rounded-brand border border-surface-border bg-surface p-4 shadow-card ${className}`}>{children}</div>
);

export function DashboardSkeleton({ numKpis = 4, hasCharts = true, columns = 3 }) {
  return (
    <div className="w-full px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8" aria-hidden="true">
      {/* Header */}
      <div className="mb-5 space-y-2">
        <Bar className="h-6 w-64 max-w-[70%]" />
        <Bar className="h-3.5 w-96 max-w-full" />
      </div>

      {/* KPI grid */}
      <div className="mb-5 grid grid-cols-2 gap-3 tablet:grid-cols-4 desktop:grid-cols-6">
        {Array.from({ length: numKpis }).map((_, i) => (
          <Pane key={i} className="space-y-2"><Bar className="h-2.5 w-1/2" /><Bar className="h-6 w-3/4" /><Bar className="h-2.5 w-1/3" /></Pane>
        ))}
      </div>

      {/* Charts row */}
      {hasCharts && (
        <div className="mb-3.5 grid grid-cols-1 gap-3.5 desktop:grid-cols-3">
          <Pane className="space-y-4 desktop:col-span-2"><Bar className="h-4 w-1/4" /><Bar className="h-36 w-full" /></Pane>
          <Pane className="space-y-4"><Bar className="h-4 w-1/3" /><Bar className="h-44 w-full" /></Pane>
        </div>
      )}

      {/* Widget columns */}
      <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2 desktop:grid-cols-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Pane key={i} className="space-y-3">
            <Bar className="h-3.5 w-1/3" />
            <div className="space-y-2"><Bar className="h-3" /><Bar className="h-3" /><Bar className="h-3 w-5/6" /><Bar className="h-3 w-2/3" /></div>
          </Pane>
        ))}
      </div>
    </div>
  );
}
