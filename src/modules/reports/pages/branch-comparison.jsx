/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Branch Comparison — LIVE from the double-entry engine.
   ════════════════════════════════════════════════════════════════════
   First report screen migrated out of legacy.jsx onto the shared scaffold:
   RptShell (header/print) + ResponsiveGrid (KPIs) + PageSection (the
   revenue/GP bars) + DataTable (the breakdown grid, with sort/export/sticky
   header and mobile horizontal scroll). Data + math are unchanged: one row
   per booking file from useGpBills, grouped by branch, no hardcoded figures.
   ──────────────────────────────────────────────────────────────────── */

import React, { useMemo } from 'react';
import { Inbox } from 'lucide-react';
import { useGpBills } from '../../../core/useAccounting';
import { fmt, compactAmt } from '../../../core/format';
import { bc } from '../../../core/styleTokens';
import { DataTable } from '../../../shell/DataTable';
import { PageSection, ResponsiveGrid, LoadingState, EmptyState } from '../../../shell/primitives';
import { RptShell } from '../components/scaffold';

const PALETTE = ['#2563eb', '#d97706', '#16a34a', '#dc2626', '#5B21B6', '#0d7a6b'];

export function ReportBranch() {
  // LIVE — one row per booking file, grouped by branch. Empty books → empty state.
  const q = useGpBills('ALL', {});
  const bills = q.data || [];

  const BR_D = useMemo(() => {
    const m = {};
    bills.forEach((b) => {
      const code = b.branch || '—';
      if (!m[code]) m[code] = { branch: code, rev: 0, gp: 0 };
      m[code].rev += (+b.sell || 0);
      m[code].gp += ((+b.sell || 0) - (+b.cost || 0));
    });
    return Object.values(m)
      .map((r, i) => ({ ...r, gpPct: r.rev > 0 ? +(r.gp / r.rev * 100).toFixed(1) : 0, color: PALETTE[i % PALETTE.length] }))
      .sort((a, b) => b.rev - a.rev);
  }, [bills]);

  const hasData = BR_D.length > 0;
  const maxR = Math.max(...BR_D.map((b) => b.rev), 1);
  const totR = BR_D.reduce((s, b) => s + b.rev, 0) || 1;
  // Each branch's figures are in its OWN currency — show them so, and only footer a
  // grand total when every branch shares one currency (₹+$ can't be summed).
  const curOf = (code) => (bc({ code }) || {}).cur || '₹';
  const cm = (v, code) => compactAmt(v, { currency: curOf(code) });
  const curs = [...new Set(BR_D.map((b) => curOf(b.branch)))];
  const oneCur = curs.length === 1;
  const totalCell = (rs, key) => (oneCur ? compactAmt(rs.reduce((s, r) => s + r[key], 0), { currency: curs[0] || '₹' }) : '—');

  if (q.isLoading) {
    return <RptShell title="Branch Comparison" subtitle="All branches · live double-entry"><LoadingState label="Loading live data…" /></RptShell>;
  }
  if (!hasData) {
    return (
      <RptShell title="Branch Comparison" subtitle="All branches · live double-entry">
        <PageSection>
          <EmptyState icon={Inbox} title="No transactions found" hint="Branch revenue and gross profit appear here once sale/purchase vouchers are posted." />
        </PageSection>
      </RptShell>
    );
  }

  const columns = [
    {
      key: 'branch', header: 'Branch', className: 'font-medium',
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: r.color }} />
          {r.branch}
        </span>
      ),
    },
    { key: 'rev', header: 'Revenue', num: true, render: (r, v) => cm(v, r.branch), footer: (rs) => totalCell(rs, 'rev') },
    { key: 'gp', header: 'Gross Profit', num: true, className: 'text-[#16a34a]', render: (r, v) => cm(v, r.branch), footer: (rs) => totalCell(rs, 'gp') },
    { key: 'gpPct', header: 'GP %', num: true, className: 'font-semibold text-[#16a34a]', render: (r, v) => `${v}%` },
    { key: 'share', header: 'Revenue share', num: true, sortValue: (r) => r.rev / totR, render: (r) => `${((r.rev / totR) * 100).toFixed(1)}%` },
  ];

  return (
    <RptShell title="Branch Comparison" subtitle="All branches · live from the books">
      <ResponsiveGrid min="130px" gap="md" className="mb-4">
        {BR_D.map((b, i) => (
          <div key={i} className="rounded-brand border border-t-[3px] border-surface-border bg-surface-alt px-3.5 py-3" style={{ borderTopColor: b.color }}>
            <p className="text-[10.5px] font-semibold text-role-hr">{b.branch}</p>
            <p className="mb-px mt-1 text-base font-bold tabular-nums text-navy">{cm(b.rev, b.branch)}</p>
            <p className="text-[11px] font-semibold text-[#16a34a]">{'GP: ' + b.gpPct + '%'}</p>
          </div>
        ))}
      </ResponsiveGrid>

      <PageSection title="Revenue vs Gross Profit" className="mb-4">
        {BR_D.map((b, i) => (
          <div key={i} className="mb-3.5 last:mb-0">
            <div className="mb-1.5 flex justify-between text-[11.5px]">
              <span className="font-medium text-role-hr">{b.branch}</span>
              <span className="font-semibold tabular-nums text-navy">{cm(b.rev, b.branch)}</span>
            </div>
            <div className="mb-1 h-2.5 overflow-hidden rounded-full bg-surface-alt">
              <div className="h-full rounded-full" style={{ width: (b.rev / maxR * 100) + '%', background: b.color }} />
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
              <div className="h-full rounded-full opacity-45" style={{ width: (b.gp / maxR * 100) + '%', background: b.color }} />
            </div>
          </div>
        ))}
      </PageSection>

      <DataTable
        loading={q.isLoading}
        isError={q.isError}
        columns={columns}
        rows={BR_D}
        getRowKey={(r) => r.branch}
        dense
        showColumnToggle
        exportName="branch-comparison"
        printTitle="Branch Comparison"
        initialSort={{ key: 'rev', dir: 'desc' }}
        emptyMessage="No branch data."
      />
    </RptShell>
  );
}

export default ReportBranch;
