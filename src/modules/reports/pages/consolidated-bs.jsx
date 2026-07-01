/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Consolidated Balance Sheet — LIVE across ALL branches.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. When scope is consolidated (ALL) this renders
   EACH branch as its OWN Balance Sheet section in its OWN currency, driven by
   the BE `byBranch` slices from useBalanceSheet/useGpBills — never a merged
   cross-branch / cross-currency money total. A statement layout, so Assets /
   Liabilities keep custom row rendering on the scaffold; the per-branch
   contribution becomes a DataTable.
   ──────────────────────────────────────────────────────────────────── */

import React from 'react';
import { useBalanceSheet, useGpBills } from '../../../core/useAccounting';
import { BRANCHES } from '../../../core/data';
import { bc } from '../../../core/styleTokens';
import { localeOf } from '../../../core/format';
import { fmtDate, todayISO } from '../../../core/dates';
import { DataTable } from '../../../shell/DataTable';
import { ResponsiveGrid, StatusPill, LoadingState, ErrorState, EmptyState, PageSection } from '../../../shell/primitives';
import { RptShell } from '../components/scaffold';

// Currency for a branch CODE string, in that branch's own symbol (₹ / $ / …).
// bc() reads branch?.code, so wrap the bare code; 'ALL' has no single currency.
const curOf = (br) => (!br || br === 'ALL' ? '₹' : bc({ code: br }).cur);
const branchLabel = (br) => {
  if (!br || br === 'ALL') return 'All branches — Consolidated';
  const b = BRANCHES.find((x) => x.code === br);
  return b ? `${b.flag || ''} ${b.code}` : br;
};

// Currency-aware money formatter — each branch section prints in its OWN currency.
const money = (n, cur) => (cur || '₹') + Math.round(n || 0).toLocaleString(localeOf(cur || '₹'));

const r2 = (n) => Math.round((n || 0) * 100) / 100;
const sideMap = (rows) => { const m = {}; (rows || []).forEach((g) => { m[g.group] = (m[g.group] || 0) + (g.amount || 0); }); return m; };

// Derive the statement figures for ONE balance-sheet slice (a byBranch entry, or
// the single merged top-level payload). Totals come straight from the slice — no
// cross-branch / cross-currency summing happens here.
const deriveBS = (d) => {
  const A = sideMap(d && d.assets), L = sideMap(d && d.liabilities);
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
  return { fixedAssets, investments, bank, debtors, totalAssets, otherAssets, capital, reserves, creditors, gst, borrowings, totalLiab, otherLiab, balanced: d?.balanced };
};

// Branch-revenue/GP rows from a gp-bills slice (array of booking files for ONE branch).
const gpRowsFromSlice = (rows) => {
  const m = {}; (rows || []).forEach((b) => { const code = b.branch || '—'; if (!m[code]) m[code] = { code, rev: 0, gp: 0 }; m[code].rev += (+b.sell || 0); m[code].gp += ((+b.sell || 0) - (+b.cost || 0)); });
  return Object.values(m).map((x) => ({ ...x, gpPct: x.rev > 0 ? +(x.gp / x.rev * 100).toFixed(1) : 0 })).sort((a, b) => b.rev - a.rev);
};

const Row = ({ label, val, sub, bold, cur }) => (
  <div className={`flex justify-between border-b border-surface-alt px-3.5 ${bold ? 'bg-surface-alt py-2.5' : 'py-1.5'}`}>
    <span className={`text-[11px] text-navy ${bold ? 'font-bold' : ''}`}>{label}</span>
    <div className="text-right">
      <p className="tabular-nums" style={{ fontWeight: bold ? 800 : 500, color: bold ? '#1a1c22' : '#2e323c', fontSize: bold ? 13 : 11 }}>{val ? money(val, cur) : '—'}</p>
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

export function ConsolidatedBS() {
  const qBS = useBalanceSheet('ALL', { to: '' });
  const qGP = useGpBills('ALL', {});
  const bsData = qBS.data;
  const gpData = qGP.data;
  const loading = qBS.isLoading;
  const errored = qBS.isError;

  // Consolidated = all-branches scope: render each branch as its own Balance Sheet
  // section in its OWN currency — never a merged cross-currency total.
  const branch = 'ALL';
  const isAll = !branch || branch === 'ALL' || branch?.code === 'ALL';

  // ONE branch's (or the single merged) statement — Assets/Liabilities panels +
  // branch revenue/GP table — entirely in that branch's currency `cur`. No figure
  // here is summed across branches.
  const section = (bsSlice, gpSlice, branchCode, cur) => {
    const m = deriveBS(bsSlice);
    const rows = gpRowsFromSlice(Array.isArray(gpSlice) ? gpSlice : (gpSlice?.rows || gpSlice?.bills || []));
    const branchCols = [
      { key: 'code', header: 'Branch', className: 'font-bold text-navy', render: (r) => `${BRANCHES.find((br) => br.code === r.code)?.flag || ''} ${r.code}` },
      { key: 'rev', header: 'Revenue', num: true, render: (r, v) => money(v, cur), footer: (rs) => money(rs.reduce((s, r) => s + r.rev, 0), cur) },
      { key: 'gp', header: 'Gross Profit', num: true, className: 'text-[#16a34a]', render: (r, v) => money(v, cur), footer: (rs) => money(rs.reduce((s, r) => s + r.gp, 0), cur) },
      { key: 'gpPct', header: 'GP %', num: true, className: 'font-semibold text-[#16a34a]', render: (r, v) => `${v}%` },
    ];
    return (
      <>
        {m.balanced
          ? <div className="mb-2.5 rounded-lg border border-[#bfe6cd] bg-[#e8f6ed] px-3.5 py-2 text-[10.5px] font-semibold text-[#16a34a]">✔ Balanced · Total: {money(m.totalAssets, cur)}</div>
          : <div className="mb-2.5 rounded-lg border border-[#f3d9a8] bg-[#fbeedb] px-3.5 py-2 text-[10.5px] font-semibold text-[#d97706]">⚠ Difference: {money(Math.abs(m.totalAssets - m.totalLiab), cur)} — review postings</div>}

        <ResponsiveGrid cols={2} gap="md">
          <Panel title="ASSETS" color="#2563eb">
            <Row label="Fixed Assets (net)" val={m.fixedAssets} sub="Tangible + intangible" cur={cur} />
            <Row label="Non-current Investments" val={m.investments} cur={cur} />
            <Row label="Bank & Cash" val={m.bank} cur={cur} />
            <Row label="Trade Receivables" val={m.debtors} sub="Sundry Debtors" cur={cur} />
            <Row label="Other Assets" val={m.otherAssets} sub="Deposits, advances, current assets" cur={cur} />
            <Row label="TOTAL ASSETS" val={m.totalAssets} bold cur={cur} />
          </Panel>
          <Panel title="LIABILITIES & CAPITAL" color="#1a1c22">
            <Row label="Capital Account" val={m.capital} cur={cur} />
            <Row label="Reserves & Surplus (incl. P&L)" val={m.reserves} sub="Cumulative net profit" cur={cur} />
            <Row label="Borrowings" val={m.borrowings} sub="Loans + bank OD" cur={cur} />
            <Row label="Trade Payables" val={m.creditors} sub="Sundry Creditors" cur={cur} />
            <Row label="Duties & Taxes (GST/VAT/TDS)" val={m.gst} cur={cur} />
            <Row label="Other Liabilities" val={m.otherLiab} sub="Provisions, current liabilities" cur={cur} />
            <Row label="TOTAL LIABILITIES" val={m.totalLiab} bold cur={cur} />
          </Panel>
        </ResponsiveGrid>

        <DataTable
          className="mt-3"
          title="Branch Contribution — Revenue & Gross Profit (live)"
          loading={qBS.isLoading || qGP.isLoading}
          isError={qBS.isError || qGP.isError}
          columns={branchCols}
          rows={rows}
          getRowKey={(r) => r.code}
          dense
          showDensityToggle={false}
          initialSort={{ key: 'rev', dir: 'desc' }}
          exportName={`consolidated-bs-branches-${branchCode || 'all'}`}
          emptyMessage="No sale/purchase vouchers posted yet."
        />
      </>
    );
  };

  const byBranch = bsData?.byBranch;
  const gpByBranch = gpData?.byBranch;
  // hasData on the consolidated path = any branch carries a balance sheet.
  const hasData = isAll && Array.isArray(byBranch)
    ? byBranch.some((b) => Math.abs(r2(b.totalAssets)) > 0.01)
    : !!bsData && Math.abs(r2(bsData.totalAssets)) > 0.01;

  return (
    <RptShell title="Consolidated Balance Sheet" subtitle={`All branches · each in its own currency · no cross-currency total · as at ${fmtDate(todayISO())}`}>
      {loading && <LoadingState label="Loading live books…" />}
      {!loading && errored && <ErrorState message="Could not load accounting data." onRetry={() => { qBS.refetch(); qGP.refetch(); }} />}
      {!loading && !errored && !hasData && (
        <PageSection><EmptyState title="No transactions found" hint="The consolidated balance sheet is built from posted vouchers across all branches. Record transactions to populate it." /></PageSection>
      )}

      {!loading && !errored && hasData && (
        isAll && Array.isArray(byBranch)
          // CONSOLIDATED: one Balance Sheet per branch, each in its own currency.
          ? byBranch.map((b) => {
            const code = b.branch;
            const cur = curOf(code);
            const gpSlice = Array.isArray(gpByBranch) ? gpByBranch.find((x) => x.branch === code) : null;
            return (
              <div key={code} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '2px 2px 10px', borderBottom: '2px solid #2563eb', paddingBottom: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#1a1c22' }}>{branchLabel(code)}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#5b6170' }}>· {cur}</span>
                </div>
                {section(b, gpSlice, code, cur)}
              </div>
            );
          })
          // SINGLE branch (non-consolidated payload): the combined statement, unchanged.
          : section(bsData, gpData, branch?.code || branch, curOf(branch?.code || branch))
      )}
    </RptShell>
  );
}

export default ConsolidatedBS;
