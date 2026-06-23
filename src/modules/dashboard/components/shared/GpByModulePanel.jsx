import React from 'react';
import { BAR_COLORS } from '../../utils/constants';
import { safeRatio } from '../../utils/helpers';
import { Button } from '../../../../shell/primitives';

export function GpByModulePanel({ modGp, totalGp, formatMoney, onViewFullReport }) {
  return (
    <div className="rounded-brand border border-surface-border bg-surface p-4 shadow-card">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-xs font-bold text-ink">📊 GP by Product — This Month</p>
        <Button variant="ghost" size="xs" onClick={onViewFullReport}>Full Report →</Button>
      </div>
      {modGp.length === 0 && <p className="text-[11px] text-ink-muted">No bookings this month</p>}
      {modGp.map((m, i) => {
        const pct = safeRatio(m.gp, totalGp);
        const barW = Math.max(3, pct);
        return (
          <div key={m.mod} className="mb-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-ink">{m.mod}</span>
              <div className="flex items-center gap-2.5">
                <span className="text-[9.5px] text-ink-muted">{m.cnt} bookings</span>
                <span className="text-[11px] font-bold tabular-nums text-ink">{formatMoney(m.gp)}</span>
                <span className="min-w-[30px] text-right text-[9.5px] font-bold" style={{ color: BAR_COLORS[i] || '#5b616e' }}>{Math.round(pct)}%</span>
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: barW + '%', background: BAR_COLORS[i] || '#5b616e' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
