/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Financial Ratio Analysis — LIVE from the double-entry books.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. All ratio math is unchanged: liquidity,
   activity, leverage and profitability ratios derived from the Balance
   Sheet (useBalanceSheet) + Module P&L (useModulePL), benchmarked and
   flagged. Category summary → ResponsiveGrid; each category → a DataTable
   inside a PageSection.
   ──────────────────────────────────────────────────────────────────── */

import React, { useMemo } from 'react';
import { useBalanceSheet, useModulePL } from '../../../core/useAccounting';
import { DataTable } from '../../../shell/DataTable';
import { PageSection, ResponsiveGrid, StatusPill, LoadingState, ErrorState, EmptyState } from '../../../shell/primitives';
import { RptShell } from '../components/scaffold';

const CAT_COLOR = { Liquidity: '#2563eb', Activity: '#d97706', Leverage: '#dc2626', Profitability: '#16a34a' };

export function RatioAnalysis({ branch }) {
  // LIVE — ratios from the double-entry Balance Sheet + Module P&L.
  const qBS = useBalanceSheet(branch, { to: '' });
  const qPL = useModulePL(branch, {});
  const bs = qBS.data, pl = qPL.data;
  const loading = qBS.isLoading || qPL.isLoading;
  const errored = qBS.isError || qPL.isError;

  const RATIOS = useMemo(() => {
    const sideMap = (rows) => { const m = {}; (rows || []).forEach((g) => { m[g.group] = (m[g.group] || 0) + (g.amount || 0); }); return m; };
    const A = sideMap(bs && bs.assets), L = sideMap(bs && bs.liabilities);
    const sum = (map, keys) => keys.reduce((s, k) => s + (map[k] || 0), 0);
    const CA = sum(A, ['Current Assets', 'Bank Accounts', 'Cash-in-Hand', 'Deposits (Asset)', 'Loans & Advances (Asset)', 'Stock-in-Hand', 'Sundry Debtors']);
    const CL = sum(L, ['Current Liabilities', 'Duties & Taxes', 'Provisions', 'Sundry Creditors', 'Bank OD Accounts']);
    const inv = A['Stock-in-Hand'] || 0;
    const cash = (A['Bank Accounts'] || 0) + (A['Cash-in-Hand'] || 0);
    const recv = A['Sundry Debtors'] || 0;
    const pay = L['Sundry Creditors'] || 0;
    const totA = bs ? bs.totalAssets || 0 : 0;
    const equity = sum(L, ['Capital Account', 'Reserves & Surplus', 'Profit & Loss A/c']);
    const debt = sum(L, ['Loans (Liability)', 'Secured Loans', 'Unsecured Loans', 'Bank OD Accounts']);
    const rev = pl ? pl.totals.sales || 0 : 0;
    const cogs = pl ? pl.totals.cogs || 0 : 0;
    const gp = pl ? pl.totals.gp || 0 : 0;
    const net = pl ? pl.bridge.netProfit || 0 : 0;
    const safe = (a, b) => (b ? a / b : null);

    const list = [
      { category: 'Liquidity', name: 'Current Ratio', value: safe(CA, CL), fmt: 'x', bench: 1.5, dir: 'up' },
      { category: 'Liquidity', name: 'Quick Ratio (Acid Test)', value: safe(CA - inv, CL), fmt: 'x', bench: 1.0, dir: 'up' },
      { category: 'Liquidity', name: 'Cash Ratio', value: safe(cash, CL), fmt: 'x', bench: 0.3, dir: 'up' },
      { category: 'Activity', name: 'DSO — Days Sales Outstanding (annualised)', value: rev ? recv / rev * 365 : null, fmt: 'd', bench: 45, dir: 'down' },
      { category: 'Activity', name: 'DPO — Days Payables Outstanding (annualised)', value: cogs ? pay / cogs * 365 : null, fmt: 'd', bench: 40, dir: 'up' },
      { category: 'Activity', name: 'Asset Turnover', value: safe(rev, totA), fmt: 'x', bench: 2.0, dir: 'up' },
      { category: 'Leverage', name: 'Debt-Equity Ratio', value: safe(debt, equity), fmt: 'x', bench: 1.0, dir: 'down' },
      { category: 'Profitability', name: 'Gross Profit Margin', value: rev ? gp / rev * 100 : null, fmt: '%', bench: 10, dir: 'up' },
      { category: 'Profitability', name: 'Net Profit Margin', value: rev ? net / rev * 100 : null, fmt: '%', bench: 3, dir: 'up' },
      { category: 'Profitability', name: 'Return on Assets (ROA)', value: totA ? net / totA * 100 : null, fmt: '%', bench: 8, dir: 'up' },
      { category: 'Profitability', name: 'Return on Equity (ROE)', value: equity ? net / equity * 100 : null, fmt: '%', bench: 12, dir: 'up' },
    ];
    list.forEach((r) => { r.good = r.value == null ? false : (r.dir === 'up' ? r.value >= r.bench : r.value <= r.bench); });
    return list;
  }, [bs, pl]);

  const totA = bs ? bs.totalAssets || 0 : 0;
  const rev = pl ? pl.totals.sales || 0 : 0;
  const hasData = !!bs && (Math.abs(totA) > 0.01 || rev > 0);

  const sfx = (r) => (r.fmt === '%' ? '%' : r.fmt === 'd' ? 'd' : 'x');
  const benchTxt = (r) => (r.dir === 'up' ? '≥ ' : '≤ ') + r.bench + sfx(r);
  const valTxt = (r) => (r.value == null ? '—' : r.value.toFixed(r.fmt === 'd' ? 0 : 2) + sfx(r));

  const columnsFor = (col) => [
    { key: 'name', header: 'Ratio', className: 'font-semibold', hideable: false },
    { key: 'value', header: 'Value', num: true, sortValue: (r) => (r.value == null ? -Infinity : r.value), render: (r) => <span className="font-bold" style={{ color: col }}>{valTxt(r)}</span> },
    { key: 'bench', header: 'Benchmark', align: 'center', sortable: false, render: (r) => <span className="text-[10px] text-ink-muted">{benchTxt(r)}</span> },
    { key: 'status', header: 'Status', align: 'center', sortValue: (r) => (r.value == null ? -1 : r.good ? 1 : 0), render: (r) => (r.value == null ? <span className="text-ink-subtle">—</span> : <StatusPill tone={r.good ? 'success' : 'danger'} size="sm">{r.good ? '✓ Healthy' : '⚠ Watch'}</StatusPill>) },
  ];

  return (
    <RptShell title="Financial Ratio Analysis" subtitle="Liquidity · Activity · Leverage · Profitability — live from the double-entry books">
      {loading && <LoadingState label="Loading live books…" />}
      {!loading && errored && <ErrorState message="Could not load accounting data." onRetry={() => { qBS.refetch(); qPL.refetch(); }} />}
      {!loading && !errored && !hasData && (
        <PageSection><EmptyState title="No transactions found" hint="Financial ratios are derived from posted vouchers. Record transactions to populate this analysis." /></PageSection>
      )}

      {!loading && !errored && hasData && (
        <>
          <ResponsiveGrid cols={4} gap="md" className="mb-4">
            {Object.entries(CAT_COLOR).map(([cat, col]) => {
              const ratios = RATIOS.filter((r) => r.category === cat && r.value != null);
              const goodCount = ratios.filter((r) => r.good).length;
              return (
                <div key={cat} className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{ borderTopColor: col }}>
                  <p className="text-[10px] uppercase tracking-wide text-ink-muted">{cat}</p>
                  <p className="mt-1 text-lg font-extrabold tablet:text-xl" style={{ color: col }}>{goodCount}/{ratios.length}</p>
                  <p className="text-[10px] text-ink-muted">healthy ratios</p>
                </div>
              );
            })}
          </ResponsiveGrid>

          {Object.keys(CAT_COLOR).map((cat) => (
            <DataTable
              key={cat}
              title={cat}
              loading={qBS.isLoading || qPL.isLoading}
              isError={qBS.isError || qPL.isError}
              columns={columnsFor(CAT_COLOR[cat])}
              rows={RATIOS.filter((r) => r.category === cat)}
              getRowKey={(r) => r.name}
              dense
              showDensityToggle={false}
              className="mb-3.5"
            />
          ))}
        </>
      )}
    </RptShell>
  );
}

export default RatioAnalysis;
