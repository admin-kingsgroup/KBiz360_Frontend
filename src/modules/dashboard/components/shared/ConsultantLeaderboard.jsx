import React from 'react';
import { MEDALS } from '../../utils/constants';
import { safeRatio } from '../../utils/helpers';
import { Button } from '../../../../shell/primitives';

export function ConsultantLeaderboard({ consultants, formatMoney, onViewAll }) {
  return (
    <div className="rounded-brand border border-surface-border bg-surface p-4 shadow-card">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="m-0 text-xs font-bold text-ink">🏆 Consultant Leaderboard — This Month</h3>
        <Button variant="ghost" size="xs" onClick={onViewAll}>Full →</Button>
      </div>
      {consultants.length === 0 && <p className="text-[11px] text-ink-muted">No data</p>}
      {consultants.map((c, i) => {
        const gpPctC = safeRatio(c.gp, c.rev);
        return (
          <div
            key={c.name}
            className="flex items-center gap-2.5 py-1.5"
            style={{ borderBottom: i < consultants.length - 1 ? '1px solid #f4f5f7' : 'none' }}
          >
            <span className="w-6 text-base">{MEDALS[i] || String(i + 1)}</span>
            <span className="flex-1 text-[11.5px] font-semibold text-ink">{c.name}</span>
            <span className="text-[10.5px] text-ink-muted">{c.cnt} bkgs</span>
            <span className="min-w-[70px] text-right text-[11px] font-bold tabular-nums text-success">{formatMoney(c.gp)}</span>
            <span className="min-w-[42px] rounded-full bg-success-soft px-1.5 py-px text-right text-[9.5px] font-bold text-success">{gpPctC}%</span>
          </div>
        );
      })}
    </div>
  );
}
