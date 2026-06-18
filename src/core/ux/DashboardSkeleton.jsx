import React from 'react';

export function DashboardSkeleton({ title = 'Dashboard', numKpis = 4, hasCharts = true, columns = 3 }) {
  return (
    <div className="p-4.5 max-w-[1400px] mx-auto space-y-5">
      {/* Header Skeleton */}
      <div className="animate-pulse space-y-2">
        <div className="h-6 bg-slate-200 rounded w-64"></div>
        <div className="h-3.5 bg-slate-100 rounded w-96"></div>
        <div className="h-8 bg-slate-100 rounded w-48 mt-3"></div>
      </div>

      {/* KPI Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {Array.from({ length: numKpis }).map((_, i) => (
          <div key={i} className="animate-pulse border border-black/5 bg-white p-4.5 rounded-xl space-y-2">
            <div className="h-3 bg-slate-100 rounded w-1/2"></div>
            <div className="h-5.5 bg-slate-200 rounded w-3/4"></div>
            <div className="h-3 bg-slate-100 rounded w-1/3"></div>
          </div>
        ))}
      </div>

      {/* Main Grid Skeletons */}
      {hasCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          <div className="lg:col-span-2 animate-pulse border border-black/5 bg-white p-5 rounded-xl space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="h-36 bg-slate-100 rounded"></div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-100 rounded"></div>
              <div className="h-4 bg-slate-100 rounded"></div>
            </div>
          </div>
          <div className="animate-pulse border border-black/5 bg-white p-5 rounded-xl space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-44 bg-slate-100 rounded"></div>
            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
          </div>
        </div>
      )}

      {/* Extra widgets list skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="animate-pulse border border-black/5 bg-white p-5 rounded-xl space-y-3">
            <div className="h-3.5 bg-slate-200 rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-3 bg-slate-100 rounded"></div>
              <div className="h-3 bg-slate-100 rounded"></div>
              <div className="h-3 bg-slate-100 rounded w-5/6"></div>
              <div className="h-3 bg-slate-100 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
