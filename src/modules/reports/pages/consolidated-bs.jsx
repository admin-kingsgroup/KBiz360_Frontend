/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Consolidated Balance Sheet — LIVE across ALL branches.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. All consolidation math unchanged (group
   roll-up from useBalanceSheet("ALL") + per-branch rev/GP from useGpBills).
   A statement layout, so Assets / Liabilities keep custom row rendering on
   the scaffold; the branch contribution becomes a DataTable.
   ──────────────────────────────────────────────────────────────────── */

import React, { useMemo } from 'react';
import { useBalanceSheet, useGpBills } from '../../../core/useAccounting';
import { BRANCHES } from '../../../core/data';
import { fmtDate, todayISO } from '../../../core/dates';
import { DataTable } from '../../../shell/DataTable';
import { ResponsiveGrid, StatusPill, LoadingState, ErrorState, EmptyState, PageSection } from '../../../shell/primitives';
import { RptShell } from '../components/scaffold';

export function ConsolidatedBS() {
  const qBS = useBalanceSheet('ALL', { to: '' });
  const qGP = useGpBills('ALL', {});
  const d = qBS.data;
  const loading = qBS.isLoading;
  const errored = qBS.isError;

  const sideMap = (rows) => { const m = {}; (rows || []).forEach((g) => { m[g.group] = (m[g.group] || 0) + (g.amount || 0); }); return m; };
  const A = sideMap(d && d.assets), L = sideMap(d && d.liabilities);
  const r2 = (n) => Math.round((n || 0) * 100) / 100;

  const fixedAssets = A['Fixed Assets'] || 0;
  const investments = A['Investments'] || 0;
  const bank = (A['Bank Accounts'] || 0) + (A['Cash-in-Hand'] || 0);
  const debtors = A['Sundry Debtors'] || 0;
  const totalAssets = d ? r2(d.totalAssets) : 0;
  const otherAssets = r2(totalAssets - (fixedAssets + investments + bank + debtors));

  const capital = L['Capital Account'] || 0;
  const reserves = (L['Reserves & Surplus'] || 0) + (L['Profit & Loss A/c'] || 0);
  const creditors = L['Sundry Creditors'] || 0;
  const gst = L['Duties & Taxes'] || 0;
  const borrowings = (L['Loans (Liability)'] || 0) + (L['Bank OD Accounts'] || 0);
  const totalLiab = d ? r2(d.totalLiabilities) : 0;
  const otherLiab = r2(totalLiab - (capital + reserves + creditors + gst + borrowings));

  const branchRows = useMemo(() => {
    const m = {}; (qGP.data || []).forEach((b) => { const code = b.branch || '—'; if (!m[code]) m[code] = { code, rev: 0, gp: 0 }; m[code].rev += (+b.sell || 0); m[code].gp += ((+b.sell || 0) - (+b.cost || 0)); });
    return Object.values(m).map((x) => ({ ...x, gpPct: x.rev > 0 ? +(x.gp / x.rev * 100).toFixed(1) : 0 })).sort((a, b) => b.rev - a.rev);
  }, [qGP.data]);

  const f = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
  const hasData = !!d && Math.abs(totalAssets) > 0.01;

  const Row = ({ label, val, sub, bold }) => (
    <div className={`flex justify-between border-b border-surface-alt px-3.5 ${bold ? 'bg-surface-alt py-2.5' : 'py-1.5'}`}>
      <span className={`text-[11px] text-navy ${bold ? 'font-bold' : ''}`}>{label}</span>
      <div className="text-right">
        <p className="tabular-nums" style={{ fontWeight: bold ? 800 : 500, color: bold ? '#0d1326' : '#384677', fontSize: bold ? 13 : 11 }}>{val ? f(val) : '—'}</p>
        {sub && <p className="text-[9px] text-ink-muted">{sub}</p>}
      </div>
    </div>
  );

  const Panel = ({ title, color, children }) => (
    <div className="overflow-hidden rounded-brand border border-surface-border bg-surface shadow-sm">
      <div className="px-3.5 py-2.5" style={{ background: color }}><p className="text-[13px] font-extrabold text-white">{title}</p></div>
      {children}
    </div>
  );

  const branchCols = [
    { key: 'code', header: 'Branch', className: 'font-bold text-navy', render: (r) => `${BRANCHES.find((br) => br.code === r.code)?.flag || ''} ${r.code}` },
    { key: 'rev', header: 'Revenue', num: true, render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + r.rev, 0)) },
    { key: 'gp', header: 'Gross Profit', num: true, className: 'text-[#27500A]', render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + r.gp, 0)) },
    { key: 'gpPct', header: 'GP %', num: true, className: 'font-semibold text-[#27500A]', render: (r, v) => `${v}%` },
  ];

  return (
    <RptShell title="Consolidated Balance Sheet" subtitle={`All branches · live double-entry · as at ${fmtDate(todayISO())}`}>
      {loading && <LoadingState label="Loading live books…" />}
      {!loading && errored && <ErrorState message="Could not load accounting data." onRetry={() => { qBS.refetch(); qGP.refetch(); }} />}
      {!loading && !errored && !hasData && (
        <PageSection><EmptyState title="No transactions found" hint="The consolidated balance sheet is built from posted vouchers across all branches. Record transactions to populate it." /></PageSection>
      )}

      {!loading && !errored && hasData && (
        <>
          {d.balanced
            ? <div className="mb-2.5 rounded-lg border border-[#C0DD97] bg-[#EAF3DE] px-3.5 py-2 text-[10.5px] font-semibold text-[#27500A]">✔ Consolidated Balance Sheet balanced · Total: {f(totalAssets)}</div>
            : <div className="mb-2.5 rounded-lg border border-[#FAC775] bg-[#FAEEDA] px-3.5 py-2 text-[10.5px] font-semibold text-[#854F0B]">⚠ Difference: {f(Math.abs(totalAssets - totalLiab))} — review postings</div>}

          <ResponsiveGrid cols={2} gap="md">
            <Panel title="ASSETS" color="#185FA5">
              <Row label="Fixed Assets (net)" val={fixedAssets} sub="Tangible + intangible across all branches" />
              <Row label="Non-current Investments" val={investments} />
              <Row label="Bank & Cash" val={bank} sub="All branches" />
              <Row label="Trade Receivables" val={debtors} sub="Sundry Debtors" />
              <Row label="Other Assets" val={otherAssets} sub="Deposits, advances, current assets" />
              <Row label="TOTAL ASSETS" val={totalAssets} bold />
            </Panel>
            <Panel title="LIABILITIES & CAPITAL" color="#0d1326">
              <Row label="Capital Account" val={capital} />
              <Row label="Reserves & Surplus (incl. P&L)" val={reserves} sub="Cumulative net profit" />
              <Row label="Borrowings" val={borrowings} sub="Loans + bank OD" />
              <Row label="Trade Payables" val={creditors} sub="Sundry Creditors" />
              <Row label="Duties & Taxes (GST/VAT/TDS)" val={gst} />
              <Row label="Other Liabilities" val={otherLiab} sub="Provisions, current liabilities" />
              <Row label="TOTAL LIABILITIES" val={totalLiab} bold />
            </Panel>
          </ResponsiveGrid>

          <DataTable
            className="mt-3"
            title="Branch Contribution — Revenue & Gross Profit (live)"
            columns={branchCols}
            rows={branchRows}
            getRowKey={(r) => r.code}
            dense
            showDensityToggle={false}
            initialSort={{ key: 'rev', dir: 'desc' }}
            exportName="consolidated-bs-branches"
            emptyMessage="No sale/purchase vouchers posted yet."
          />
        </>
      )}
    </RptShell>
  );
}

export default ConsolidatedBS;
