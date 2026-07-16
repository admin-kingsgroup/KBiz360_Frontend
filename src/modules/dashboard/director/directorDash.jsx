/* ════════════════════════════════════════════════════════════════════
   DIRECTOR DASHBOARDS  /dashboards/*
   The whole-company MENU_DASHBOARDS suite (Financials, Business, Targets,
   Control groups) — one dispatcher (DirectorDash) picks the panel by the
   route's `which` segment (see App.jsx's /dashboards/(...) regex route).

   BUSINESS SUB-MODULE REORG (2026-07-13): moved out of
   directorDashboards/directorDashboards.jsx into dashboard/ (this file's
   folder-name mismatch was the ONLY reorg issue here — directorDashboards/
   and dashboard/ both serve MENU_DASHBOARDS and belong in one module).
   TargetsMaster (the only MENU_FINANCE-bound export in the original file)
   moved separately to finance/targetsMaster.jsx.
   ════════════════════════════════════════════════════════════════════ */
import React, { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../core/api';
import { FocusBanner } from '../../../core/ux/FocusBanner';
import { bc } from '../../../core/styles';
import { PeriodBar } from '../../../core/period';
import { Button, Select, Input, FormField, Skeleton } from '../../../shell/primitives';
import {
  useProfitAndLoss, useModulePL, useBalanceSheet, useAgeing, useInvoiceGP,
  useTaxSummary, useTrialBalance, useVoucherApprovals, useYearOverYear,
  useBudgetVsActual, useTargetsVsActual,
  useCashForecast, useCustomerLtv, useAbcAnalysis,
} from '../../../core/useAccounting';
import { CONSOLIDATED_LABEL } from '../../../core/data';
import { currencySplit, curRegion } from '../../../core/format';
import { liquidityKind, isLiquidRow } from '../../../core/ledgerKind';
import { openPrintPreview } from '../../../core/PrintPreview';
import { PnlWaterfallPanel } from '../components/shared/PnlWaterfallPanel';
import { TrendingUp, PieChart, Receipt, CircleDollarSign, ArrowRight } from 'lucide-react';
import { C, REGION, curSym, branchList, r0, money, pct, pad2, iso, fyStr, MOD_OPTS, Toolbar, KPI, Card, th, td, num, usePeriod } from './shared';

// D2 consolidated currency split — section header for one per-currency block. The ALL
// view keeps India (₹) and Africa ($) subtotals SEPARATE (no FX, no blended total);
// these headers label each block. Rendered only when a hook returns a `byCurrency` split.
const CurHead = ({ symbol, currency }) => (
  <div style={{ margin: '16px 0 2px', fontSize: 13, fontWeight: 800, color: C.dark }}>
    {symbol} <span style={{ color: C.dim, fontWeight: 600 }}>({curRegion(symbol, currency)})</span>
  </div>
);

export function ExecutiveOverview({ branch, go }) {
  const p = usePeriod('all'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  // Consolidated = Group/ALL scope: render the money KPIs PER BRANCH (each in its own
  // currency), never one merged cross-branch ₹ total. Driven by each hook's `byBranch`.
  const isAll = !branch || branch === 'ALL' || branch?.code === 'ALL';
  const plQ = useProfitAndLoss(branch, range); const pl = plQ.data || {};
  const mplQ = useModulePL(branch, { ...range, summary: true }); const mpl = mplQ.data || {};
  const bsQ = useBalanceSheet(branch, { to: range.to }); const bs = bsQ.data || {};
  const age = useAgeing(branch, range.to).data || {};
  const tax = useTaxSummary(branch, range).data || {};
  // Cash/bank is an as-of position → drop `from` so closing = opening + all movement to
  // `range.to` (matches CashLiquidityDash & the Cash Forecast opening).
  const trial = useTrialBalance(branch, { to: range.to }).data || {};
  const appr = useVoucherApprovals(branch, 'pending').data || {};
  const yoy = useYearOverYear(branch, range).data || {};
  // Gate the "all clear" verdict on real data — otherwise a still-loading or
  // failed board (all zeros) would falsely read as "books look healthy".
  const coreLoading = plQ.isLoading || mplQ.isLoading || bsQ.isLoading;
  const coreError = plQ.isError || mplQ.isError || bsQ.isError;

  const sales = mpl?.totals?.sales || 0, gp = mpl?.totals?.gp || 0;
  const net = pl?.netProfit || 0;
  const assetTotal = (bs.assets || []).reduce((s, a) => s + (a.amount || 0), 0);
  const liabTotal = (bs.liabilities || []).reduce((s, a) => s + (a.amount || 0), 0);
  // The backend always plugs the sheet with a "Difference in Opening Balances" row, so
  // assetTotal−liabTotal is ~0 by construction (and its own `balanced` flag is always
  // true). The genuine imbalance is the size of that plug row — use it so the alert can
  // actually fire (mirrors BalanceSheetDash).
  const bsDiffRow = (bs.liabilities || []).find((l) => /difference in opening/i.test(l.group || ''));
  const bsDiff = bsDiffRow ? (bsDiffRow.amount || 0) : 0;
  const balanced = Math.abs(bsDiff) < 1;
  const cash = (trial.rows || []).filter(isLiquidRow).reduce((s, r) => s + ((r.closingDebit || 0) - (r.closingCredit || 0)), 0);
  const ar = age?.receivables?.totals?.total || 0, ap = age?.payables?.totals?.total || 0;
  const arOverdue = age?.receivables?.totals?.d90 || 0;
  const pend = appr?.counts?.pending?.n || 0, pendAmt = appr?.counts?.pending?.amount || 0;
  // YoY comparison values live in yoy.rows ({ line, cy, ly }).
  const yrow = (q) => (yoy?.rows || []).find((r) => (r.line || '').toLowerCase().includes(q));
  const rNet = yrow('net profit'), rSales = yrow('revenue');
  const dNet = rNet ? deltaPct(rNet.cy, rNet.ly) : null;
  const dSales = rSales ? deltaPct(rSales.cy, rSales.ly) : null;

  // alert feed
  const alerts = [];
  if (net < 0) alerts.push(['bad', `Net loss this period: ${money(cur, net)}`]);
  if (gp < 0) alerts.push(['bad', `Gross loss: ${money(cur, gp)}`]);
  if (!balanced && (assetTotal || liabTotal)) alerts.push(['bad', `Balance Sheet out of balance by ${money(cur, bsDiff)}`]);
  if (cash < 0) alerts.push(['bad', `Negative cash/bank balance: ${money(cur, cash)}`]);
  if (arOverdue > 0) alerts.push(['warn', `Receivables overdue 90+ days: ${money(cur, arOverdue)}`]);
  if (pend > 0) alerts.push(['warn', `${pend} approval(s) pending (${money(cur, pendAmt)}) — awaiting your sign-off`]);
  if (!alerts.length) {
    if (coreError) alerts.push(['bad', 'Couldn’t load some figures — this view may be incomplete. Try refreshing.']);
    else if (coreLoading) alerts.push(['warn', <Skeleton style={{ display: 'inline-block', height: 10, width: 180, verticalAlign: 'middle' }} />]);
    else alerts.push(['good', 'No exceptions — books look healthy for this period.']);
  }

  // ── Per-branch money KPIs (Group/ALL scope only) ──
  // Stitch each money KPI from the matching hook's `byBranch` slice so every branch's
  // Revenue/GP/NP/Cash/Receivables/Payables/Tax prints in its OWN currency — never a
  // merged cross-currency ₹ sum. Keyed by branch code.
  const liquidOf = (rows) => (rows || []).filter(isLiquidRow).reduce((s, r) => s + ((r.closingDebit || 0) - (r.closingCredit || 0)), 0);
  const perBranchKpis = useMemo(() => {
    if (!isAll) return [];
    const find = (arr, code) => (Array.isArray(arr) ? arr.find((x) => x.branch === code) : null) || {};
    const codes = [...new Set([
      ...(Array.isArray(mpl.byBranch) ? mpl.byBranch : []).map((b) => b.branch),
      ...(Array.isArray(pl.byBranch) ? pl.byBranch : []).map((b) => b.branch),
      ...(Array.isArray(trial.byBranch) ? trial.byBranch : []).map((b) => b.branch),
      ...(Array.isArray(bs.byBranch) ? bs.byBranch : []).map((b) => b.branch),
      ...(Array.isArray(age.byBranch) ? age.byBranch : []).map((b) => b.branch),
    ])].filter(Boolean).sort();
    return codes.map((code) => {
      const m = find(mpl.byBranch, code);
      const p2 = find(pl.byBranch, code);
      const tr = find(trial.byBranch, code);
      const b = find(bs.byBranch, code);
      const a = find(age.byBranch, code);
      const tx = find(tax.byBranch, code);
      const bSales = m?.totals?.sales || 0, bGp = m?.totals?.gp || 0;
      const bLiquid = Array.isArray(tr?.rows)
        ? liquidOf(tr.rows)
        : (b.assets || []).filter((g) => /cash|bank/i.test(g.group || '')).reduce((s, g) => s + (g.amount || 0), 0);
      return {
        code, cur: (bc({ code }) || {}).cur || '₹',
        sales: bSales, gp: bGp,
        net: p2?.netProfit || 0,
        cash: bLiquid,
        ar: a?.receivables?.totals?.total || 0,
        arOverdue: a?.receivables?.totals?.d90 || 0,
        ap: a?.payables?.totals?.total || 0,
        taxNet: tx?.netPayable || 0,
      };
    });
  }, [isAll, mpl.byBranch, pl.byBranch, trial.byBranch, bs.byBranch, age.byBranch, tax.byBranch]); // isAll included so a branch↔ALL switch recomputes

  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Executive Overview" sub={`Whole-company snapshot · ${range.label}`} branch={branch} p={p} />
      {isAll ? (
        <>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.dim, margin: '2px 2px 8px' }}>
            Group money KPIs — per branch, each in its own currency · no cross-currency total
          </div>
          {perBranchKpis.length === 0 && <div style={{ padding: '14px 2px', fontSize: 12.5, color: C.dim }}>No branch data for this period.</div>}
          {perBranchKpis.map((r) => (
            <div key={r.code} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '2px 2px 8px', borderBottom: `2px solid ${C.blue}`, paddingBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: C.dark }}>{r.code}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.dim }}>· {r.cur}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <KPI label="Revenue" value={money(r.cur, r.sales)} onClick={go && (() => go('/dashboards/sales'))} />
                <KPI label="Gross Profit" value={money(r.cur, r.gp)} sub={pct(r.sales ? (r.gp / r.sales) * 100 : 0) + ' margin'} tone={r.gp < 0 ? 'bad' : 'good'} onClick={go && (() => go('/dashboards/module-gp'))} />
                <KPI label="Net Profit" value={money(r.cur, r.net)} tone={r.net < 0 ? 'bad' : 'good'} onClick={go && (() => go('/dashboards/profitability'))} />
                <KPI label="Cash & Bank" value={money(r.cur, r.cash)} tone={r.cash < 0 ? 'bad' : undefined} onClick={go && (() => go('/dashboards/cash'))} />
                <KPI label="Receivables" value={money(r.cur, r.ar)} sub={r.arOverdue ? `${money(r.cur, r.arOverdue)} overdue 90+` : 'current'} tone={r.arOverdue ? 'bad' : undefined} onClick={go && (() => go('/dashboards/arap'))} />
                <KPI label="Payables" value={money(r.cur, r.ap)} onClick={go && (() => go('/dashboards/arap'))} />
                <KPI label="GST/VAT Net" value={money(r.cur, r.taxNet)} sub={r.taxNet >= 0 ? 'payable' : 'refundable'} onClick={go && (() => go('/dashboards/tax'))} />
              </div>
            </div>
          ))}
        </>
      ) : (
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Revenue" value={money(cur, sales)} delta={dSales} onClick={go && (() => go('/dashboards/sales'))} />
        <KPI label="Gross Profit" value={money(cur, gp)} sub={pct(sales ? (gp / sales) * 100 : 0) + ' margin'} tone={gp < 0 ? 'bad' : 'good'} onClick={go && (() => go('/dashboards/module-gp'))} />
        <KPI label="Net Profit" value={money(cur, net)} tone={net < 0 ? 'bad' : 'good'} delta={dNet} onClick={go && (() => go('/dashboards/profitability'))} />
        <KPI label="Cash & Bank" value={money(cur, cash)} tone={cash < 0 ? 'bad' : undefined} onClick={go && (() => go('/dashboards/cash'))} />
        <KPI label="Receivables" value={money(cur, ar)} sub={arOverdue ? `${money(cur, arOverdue)} overdue 90+` : 'current'} tone={arOverdue ? 'bad' : undefined} onClick={go && (() => go('/dashboards/arap'))} />
        <KPI label="Payables" value={money(cur, ap)} onClick={go && (() => go('/dashboards/arap'))} />
        <KPI label="GST/VAT Net" value={money(cur, tax?.netPayable || 0)} sub={(tax?.netPayable || 0) >= 0 ? 'payable' : 'refundable'} onClick={go && (() => go('/dashboards/tax'))} />
        <KPI label="Pending Approvals" value={String(pend)} sub={money(cur, pendAmt)} tone={pend ? 'bad' : 'good'} onClick={go && (() => go('/dashboards/audit'))} />
      </div>
      )}

      <Card title="⚠ Attention Needed">
        <div style={{ padding: '6px 0' }}>
          {alerts.map(([tone, msg], i) => (
            <div key={i} style={{ padding: '7px 14px', fontSize: 12.5, color: tone === 'bad' ? C.red : tone === 'warn' ? C.amber : C.green, borderBottom: i < alerts.length - 1 ? '1px solid #dfe2e7' : 'none' }}>
              {tone === 'bad' ? '🔴' : tone === 'warn' ? '🟡' : '🟢'} {msg}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Gross Profit by Module">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Module</th><th style={{ ...th, ...num }}>Sales</th><th style={{ ...th, ...num }}>COGS</th><th style={{ ...th, ...num }}>GP</th><th style={{ ...th, ...num }}>GP %</th></tr></thead>
          <tbody>
            {(mpl.modules || []).map((m) => (
              <tr key={m.key} {...rowNav(go, '/dashboards/module-gp')}><td style={td}>{m.key}</td><td style={{ ...td, ...num }}>{money(cur, m.sales)}</td><td style={{ ...td, ...num }}>{money(cur, m.cogs)}</td><td style={{ ...td, ...num, fontWeight: 700, color: m.gp < 0 ? C.red : C.green }}>{money(cur, m.gp)}</td><td style={{ ...td, ...num }}>{pct(m.gpPct)}</td></tr>
            ))}
            {!(mpl.modules || []).length && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>No data for this period.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
function deltaPct(cur, prev) { cur = Number(cur) || 0; prev = Number(prev) || 0; if (!prev) return null; return ((cur - prev) / Math.abs(prev)) * 100; }

// ── 2) Profitability (P&L) ────────────────────────────────────────────────────
export function ProfitabilityDash({ branch, go }) {
  const p = usePeriod('all'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const pl = useProfitAndLoss(branch, range).data || {};
  const mpl = useModulePL(branch, { ...range, summary: true }).data || {};
  const sales = mpl?.totals?.sales || 0, cogs = mpl?.totals?.cogs || 0, gp = pl?.grossProfit ?? (sales - cogs);
  const indExp = pl?.indirect?.debitTotal || 0, indInc = pl?.indirect?.creditTotal || 0, net = pl?.netProfit || 0;
  const bar = (label, val, base, col) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
      <span style={{ width: 150, fontSize: 12.5, color: C.dim }}>{label}</span>
      <div style={{ flex: 1, background: '#eef1f7', borderRadius: 5, height: 18 }}><div style={{ width: `${base ? Math.min(100, Math.abs(val) / base * 100) : 0}%`, background: col, height: '100%', borderRadius: 5 }} /></div>
      <span style={{ width: 130, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: val < 0 ? C.red : C.dark }}>{money(cur, val)}</span>
    </div>
  );
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Profitability (P&L)" sub={`Revenue → Net Profit · ${range.label}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Revenue" icon={TrendingUp} value={money(cur, sales)} onClick={go && (() => go('/dashboards/sales'))} />
        <KPI label="Gross Profit" icon={PieChart} value={money(cur, gp)} sub={pct(sales ? gp / sales * 100 : 0)} tone={gp < 0 ? 'bad' : 'good'} onClick={go && (() => go('/dashboards/module-gp'))} />
        <KPI label="Indirect Expenses" icon={Receipt} value={money(cur, indExp)} onClick={go && (() => go('/dashboards/expenses'))} />
        <KPI label="Net Profit" icon={CircleDollarSign} value={money(cur, net)} tone={net < 0 ? 'bad' : 'good'} sub={pct(sales ? net / sales * 100 : 0)} onClick={go && (() => go('/reports/pnl'))} />
      </div>
      <Card title="Profit Bridge">
        <div style={{ padding: '10px 16px' }}>
          {bar('Revenue', sales, sales, C.blue)}
          {bar('– COGS', -cogs, sales, '#9aa7c2')}
          {bar('= Gross Profit', gp, sales, C.green)}
          {bar('+ Indirect Income', indInc, sales, '#6fae7e')}
          {bar('– Indirect Expense', -indExp, sales, '#d99')}
          {bar('= Net Profit', net, sales, net < 0 ? C.red : C.dark)}
        </div>
      </Card>
    </div>
  );
}

// ── 3) Cash & Liquidity ───────────────────────────────────────────────────────
export function CashLiquidityDash({ branch, go }) {
  const p = usePeriod('all'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  // Liquidity is a POSITION (as-of), not a period flow: read the trial balance with the
  // `from` bound dropped so each ledger's closing = opening + ALL movement up to the
  // period's `to` (the true balance). A `from`-bounded read would show only this-period
  // movement and disagree with the Cash Forecast's opening (which also strips `from`).
  const trialQ = useTrialBalance(branch, { to: range.to }); const trial = trialQ.data || {};
  const rows = (trial.rows || []).filter(isLiquidRow);
  const bal = (r) => (r.closingDebit || 0) - (r.closingCredit || 0); // closing balance (Dr +ve)
  const cash = rows.filter((r) => liquidityKind(r) === 'cash').reduce((s, r) => s + bal(r), 0);
  const bankRows = rows.filter((r) => liquidityKind(r) === 'bank');
  const bank = bankRows.reduce((s, r) => s + bal(r), 0);
  const loading = trialQ.isLoading;
  // Drill to the (now live) Cash Position report — it lists exactly these cash & bank
  // ledgers, the same trial-balance liquid rows this KPI sums.
  const toCash = go && (() => go('/reports/cash-position'));
  const mv = (n, tone) => (loading ? '…' : money(cur, n));
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Cash & Liquidity" sub={`Cash + bank position · ${range.label}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Cash in Hand" value={mv(cash)} tone={loading ? undefined : (cash < 0 ? 'bad' : undefined)} onClick={toCash} />
        <KPI label="Bank Balance" value={mv(bank)} tone={loading ? undefined : (bank < 0 ? 'bad' : undefined)} onClick={toCash} />
        <KPI label="Total Liquid" value={mv(cash + bank)} tone={loading ? undefined : ((cash + bank) < 0 ? 'bad' : 'good')} onClick={toCash} />
      </div>
      <Card title="Bank & Cash Accounts">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Account</th><th style={th}>Group</th><th style={{ ...th, ...num }}>Balance</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (<tr key={i} {...rowNav(go, '/reports/cash-position')}><td style={td}>{r.ledger || r.name}</td><td style={{ ...td, color: C.dim }}>{r.group}</td><td style={{ ...td, ...num, fontWeight: 700, color: bal(r) < 0 ? C.red : C.dark }}>{money(cur, bal(r))}</td></tr>))}
            {!rows.length && <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>No cash/bank ledgers found.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── 4) Receivables & Payables ─────────────────────────────────────────────────
export function ReceivablesPayablesDash({ branch, go }) {
  const p = usePeriod('all'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  // Ageing is an as-of snapshot — drive it off the period's `to` so the period bar
  // actually changes the view (previously it always showed "as of today").
  const age = useAgeing(branch, range.to).data || {};
  const ar = age.receivables || { rows: [], totals: {} }, ap = age.payables || { rows: [], totals: {} };
  const buckets = (t) => ['d0', 'd30', 'd60', 'd90'].map((k, i) => [['0–30', '30–60', '60–90', '90+'][i], t?.[k] || 0]);
  const tbl = (title, data, tone, to) => (
    <Card title={title} right={
      <strong onClick={to && go ? () => go(to) : undefined} role={to && go ? 'button' : undefined} tabIndex={to && go ? 0 : undefined}
        onKeyDown={to && go ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(to); } } : undefined}
        title={to && go ? 'Open report →' : undefined}
        style={{ color: tone, fontSize: 13, cursor: to && go ? 'pointer' : 'default', textDecoration: to && go ? 'underline dotted' : 'none' }}>{money(cur, data.totals?.total || 0)}</strong>
    }>
      <div style={{ display: 'flex', gap: 8, padding: '8px 14px', flexWrap: 'wrap' }}>
        {buckets(data.totals).map(([l, v]) => <span key={l} style={{ fontSize: 11.5, color: C.dim }}>{l}: <b style={{ color: l === '90+' && v ? C.red : C.dark }}>{money(cur, v)}</b></span>)}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={th}>Party</th><th style={{ ...th, ...num }}>0–30</th><th style={{ ...th, ...num }}>30–60</th><th style={{ ...th, ...num }}>60–90</th><th style={{ ...th, ...num }}>90+</th><th style={{ ...th, ...num }}>Total</th></tr></thead>
        <tbody>
          {(data.rows || []).slice().sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, 12).map((r, i) => (
            <tr key={i} {...rowNav(go, to)}><td style={td}>{r.party}</td><td style={{ ...td, ...num }}>{money(cur, r.d0)}</td><td style={{ ...td, ...num }}>{money(cur, r.d30)}</td><td style={{ ...td, ...num }}>{money(cur, r.d60)}</td><td style={{ ...td, ...num, color: r.d90 ? C.red : undefined }}>{money(cur, r.d90)}</td><td style={{ ...td, ...num, fontWeight: 700 }}>{money(cur, r.total)}</td></tr>
          ))}
          {!(data.rows || []).length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>Nothing outstanding.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Receivables & Payables" sub={`Ageing as of ${range.to} · top 12 each`} branch={branch} p={p} />
      {tbl('Receivables (from customers)', ar, C.green, '/reports/rec')}
      {tbl('Payables (to suppliers)', ap, C.red, '/reports/pay')}
    </div>
  );
}

// ── 5) Branch & Group Performance ─────────────────────────────────────────────
// Per-branch P&L + capital in each branch's native currency, then a Group subtotal
// per currency (the "combined" report) — respecting that branches in different
// currencies can't be summed without forex.
export function BranchPerformanceDash({ go, branch }) {
  const p = usePeriod('all'); const range = p.range;
  // A specific top-bar branch scopes the league table to that branch's row only
  // (its currency-group subtotal follows); the full comparison lives under ALL.
  const shellCode = branch && branch !== 'ALL' ? (branch.code || branch) : '';
  const BR = branchList().filter((b) => !shellCode || b.code === shellCode); // live branches (code + currency)
  // Two parallel fan-outs per branch: P&L (module-pl) and capital (capital-analysis).
  const plQ = useQueries({
    queries: BR.map((b) => ({
      queryKey: ['accounting', 'module-pl', b.code, range.from, range.to, 'summary'],
      queryFn: () => apiGet('/api/accounting/module-pl', { branch: b.code, from: range.from, to: range.to, summary: 1 }),
    })),
  });
  const capQ = useQueries({
    queries: BR.map((b) => ({
      queryKey: ['accounting', 'capital-analysis', b.code, range.from, range.to],
      queryFn: () => apiGet('/api/accounting/capital-analysis', { branch: b.code, from: range.from, to: range.to }),
    })),
  });
  const rowOf = (b, i) => {
    const d = plQ[i].data || {}; const c = (capQ[i].data || {}).totals || {};
    const sales = d?.totals?.sales || 0, gp = d?.totals?.gp || 0;
    return {
      code: b.code, cur: b.cur, sales, cogs: d?.totals?.cogs || 0, gp,
      gpPct: sales ? gp / sales * 100 : 0, net: d?.bridge?.netProfit ?? 0,
      capital: (c.capitalEmployed != null ? c.capitalEmployed : c.capitalInvested) || 0, inflow: c.inflowCapital || 0,
    };
  };
  const rows = BR.map(rowOf);
  const loading = plQ.some((x) => x.isLoading) || capQ.some((x) => x.isLoading);
  // Surface partial failures: if a branch's P&L/capital call errored, its row silently
  // contributes 0 to the currency-group subtotal — flag which branches didn't load so a
  // depressed Group total isn't mistaken for a real downturn.
  const failedBranches = BR.filter((b, i) => plQ[i].isError || capQ[i].isError).map((b) => b.code);

  // Per-currency group subtotals (the consolidated "Group Report") — a Group report
  // must subtotal WITHIN a currency and never add ₹ to $.
  const curList = [...new Set(BR.map((b) => b.cur))];
  const groups = curList.map((cur) => {
    const grp = rows.filter((r) => r.cur === cur);
    const sum = (k) => grp.reduce((s, r) => s + (r[k] || 0), 0);
    const sales = sum('sales'), gp = sum('gp'), inflow = sum('inflow');
    return {
      cur, label: `${REGION[cur] ? REGION[cur] + ' ' : ''}Group (${cur})`, rows: grp,
      sales, cogs: sum('cogs'), gp, gpPct: sales ? gp / sales * 100 : 0,
      net: sum('net'), capital: sum('capital'), inflow, gpYield: inflow ? gp / inflow * 100 : 0,
    };
  });

  const dataRow = (cur, r, bold) => {
    const w = bold ? 800 : undefined;
    return (<>
      <td style={{ ...td, ...num, fontWeight: w }}>{money(cur, r.sales)}</td>
      <td style={{ ...td, ...num, fontWeight: bold ? 800 : 700, color: r.gp < 0 ? C.red : C.green }}>{money(cur, r.gp)}</td>
      <td style={{ ...td, ...num, fontWeight: w }}>{pct(r.gpPct)}</td>
      <td style={{ ...td, ...num, fontWeight: bold ? 800 : 700, color: r.net < 0 ? C.red : C.dark }}>{money(cur, r.net)}</td>
      <td style={{ ...td, ...num, fontWeight: w }}>{money(cur, r.capital)}</td>
      <td style={{ ...td, ...num, fontWeight: w }}>{money(cur, r.inflow)}</td>
    </>);
  };

  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Branch & Group Performance" sub={`Per-branch + currency-group totals · ${range.label} · native currency`} branch={'ALL'} p={p} />

      {failedBranches.length > 0 && (
        <div style={{ margin: '0 0 8px', padding: '7px 12px', fontSize: 12, fontWeight: 600, color: C.red, background: '#fbecec', border: `1px solid ${C.red}`, borderRadius: 6 }}>
          ⚠ Couldn’t load {failedBranches.join(', ')} — Group totals below exclude {failedBranches.length > 1 ? 'these branches' : 'this branch'}. Refresh to retry.
        </div>
      )}

      {/* Group (combined) totals — one KPI per currency group, never mixed */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {groups.map((g) => (
          <KPI key={g.cur} label={`${g.label} · Net Profit`} value={loading ? '…' : money(g.cur, g.net)} tone={loading ? undefined : (g.net < 0 ? 'bad' : 'good')}
            sub={loading ? <Skeleton style={{ height: 9, width: 130, display: 'inline-block' }} /> : `Sales ${money(g.cur, g.sales)} · GP ${pct(g.gpPct)} · Capital ${money(g.cur, g.capital)}`}
            onClick={go && (() => go('/reports/branch'))} />
        ))}
      </div>

      <Card title="Per-branch — Sales · GP · Net · Capital  (grouped & subtotalled by currency)">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>Branch</th><th style={{ ...th, ...num }}>Sales</th><th style={{ ...th, ...num }}>Gross Profit</th>
            <th style={{ ...th, ...num }}>GP %</th><th style={{ ...th, ...num }}>Net Profit</th>
            <th style={{ ...th, ...num }}>Capital Employed</th><th style={{ ...th, ...num }}>In-Flow Capital</th>
          </tr></thead>
          <tbody>
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`}><td colSpan={7} style={{ ...td, padding: 10 }}><Skeleton className="h-4 w-full" style={{ opacity: Math.max(0.4, 1 - i * 0.15) }} /></td></tr>
            ))}
            {!loading && groups.map((g) => (
              <React.Fragment key={g.cur}>
                <tr><td colSpan={7} style={{ ...td, background: C.bg, fontWeight: 800, color: C.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>{g.label}</td></tr>
                {g.rows.map((r) => (
                  <tr key={r.code} {...rowNav(go, '/reports/branch')}>
                    <td style={{ ...td, fontWeight: 700 }}>{r.code} <span style={{ color: C.dim, fontWeight: 400 }}>{r.cur}</span></td>
                    {dataRow(r.cur, r, false)}
                  </tr>
                ))}
                <tr style={{ background: '#fbfbfe' }}>
                  <td style={{ ...td, fontWeight: 800 }}>{g.label} — subtotal</td>
                  {dataRow(g.cur, g, true)}
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '8px 14px', fontSize: 11, color: C.dim }}>Group subtotals are combined <b>within each currency</b> — ₹ branches (India) and $ branches (Africa) are never added together. A single FX-normalised all-company total needs forex rates.</div>
      </Card>
    </div>
  );
}

// generic two-column "name + amount" list table
// Props that turn a table row into a keyboard-accessible drill button. `route` may be a
// string; a falsy go/route leaves the row inert (no cursor/handlers).
function rowNav(go, route) {
  if (!go || !route) return {};
  return {
    onClick: () => go(route), role: 'button', tabIndex: 0,
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(route); } },
    title: 'Open report →', style: { cursor: 'pointer' },
  };
}

// `rowTo` (string | (row)=>string) + `go` make each row drill into its source report.
function ListTable({ title, rows, cur, right, valColor, go, rowTo }) {
  const routeOf = (r) => (typeof rowTo === 'function' ? rowTo(r) : rowTo);
  return (
    <Card title={title} right={right}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} {...rowNav(go, routeOf(r))} style={{ background: r.bold ? C.bg : undefined }}><td style={{ ...td, fontWeight: r.bold ? 700 : 400, paddingLeft: r.indent ? 28 : 12 }}>{r.name}</td><td style={{ ...td, ...num, fontWeight: r.bold ? 700 : 400, color: valColor ? valColor(r.amount) : C.dark }}>{money(cur, r.amount)}</td></tr>
          ))}
          {!rows.length && <tr><td colSpan={2} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>No data.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}
const miniBar = (label, val, base, col, cur, nav) => {
  const { style: navStyle, ...navRest } = nav || {};
  return (
  <div key={label} {...navRest} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', ...navStyle }}>
    <span style={{ width: 160, fontSize: 12, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    <div style={{ flex: 1, background: '#eef1f7', borderRadius: 5, height: 16, minWidth: 60 }}><div style={{ width: `${base ? Math.min(100, Math.abs(val) / base * 100) : 0}%`, background: col, height: '100%', borderRadius: 5 }} /></div>
    <span style={{ width: 120, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: val < 0 ? C.red : C.dark }}>{money(cur, val)}</span>
  </div>
);};
const topBy = (rows, keyFn, valFn, n = 10) => {
  const m = {}; rows.forEach((r) => { const k = keyFn(r) || '—'; m[k] = (m[k] || 0) + (valFn(r) || 0); });
  return Object.entries(m).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, n);
};

// ── 6) Balance Sheet ──────────────────────────────────────────────────────────
export function BalanceSheetDash({ branch, go }) {
  const p = usePeriod('all'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const bsQ = useBalanceSheet(branch, { to: range.to }); const bs = bsQ.data || {};
  const assets = bs.assets || [], liabs = bs.liabilities || [];
  const aT = assets.reduce((s, a) => s + (a.amount || 0), 0), lT = liabs.reduce((s, a) => s + (a.amount || 0), 0);
  // The backend ALWAYS plugs the sheet with a "Difference in Opening Balances" row so
  // Assets == Liabilities on paper (and its own `balanced` flag is computed AFTER the
  // plug, so it's always true). The genuine imbalance is therefore the size of that
  // plug row — surface it instead of recomputing aT−lT (which is always ~0).
  const diffRow = liabs.find((l) => /difference in opening/i.test(l.group || ''));
  const realDiff = diffRow ? (diffRow.amount || 0) : 0;
  const balanced = Math.abs(realDiff) < 1;
  const loading = bsQ.isLoading;
  const toBs = go && (() => go('/reports/bs'));
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Balance Sheet" sub={`Financial position as of ${range.to}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Total Assets" value={loading ? '…' : money(cur, aT)} onClick={toBs} />
        <KPI label="Total Liabilities & Capital" value={loading ? '…' : money(cur, lT)} onClick={toBs} />
        <KPI label="Balanced" value={loading ? '…' : (balanced ? '✓ Yes' : '✗ No')} tone={loading ? undefined : (balanced ? 'good' : 'bad')} sub={loading || balanced ? '' : money(cur, realDiff) + ' unbalanced'} />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 320px' }}><ListTable title="Liabilities & Capital" rows={[...liabs.map((l) => ({ name: l.group, amount: l.amount })), { name: 'Total', amount: lT, bold: true }]} cur={cur} go={go} rowTo="/reports/bs" /></div>
        <div style={{ flex: '1 1 320px' }}><ListTable title="Assets" rows={[...assets.map((a) => ({ name: a.group, amount: a.amount })), { name: 'Total', amount: aT, bold: true }]} cur={cur} go={go} rowTo="/reports/bs" /></div>
      </div>
    </div>
  );
}

// ── 7) Module / Product GP ────────────────────────────────────────────────────
export function ModuleGpDash({ branch, go }) {
  const p = usePeriod('all'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const mpl = useModulePL(branch, { ...range, summary: true }).data || {};
  const mods = mpl.modules || [], t = mpl.totals || {};
  const maxGp = Math.max(1, ...mods.map((m) => Math.abs(m.gp || 0)));
  const toGp = go && (() => go('/reports/gp'));
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Module / Product GP" sub={`Gross profit by product · ${range.label}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Sales" value={money(cur, t.sales)} onClick={toGp} />
        <KPI label="COGS" value={money(cur, t.cogs)} onClick={toGp} />
        <KPI label="Gross Profit" value={money(cur, t.gp)} tone={(t.gp || 0) < 0 ? 'bad' : 'good'} sub={pct(t.gpPct || 0)} onClick={toGp} />
      </div>
      <Card title="GP by Module"><div style={{ padding: '10px 16px' }}>{mods.map((m) => miniBar(m.name || m.key, m.gp, maxGp, (m.gp || 0) < 0 ? C.red : C.green, cur, rowNav(go, '/reports/gp')))}{!mods.length && <div style={{ color: C.dim, fontSize: 12 }}>No data.</div>}</div></Card>
      <Card title="Detail">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Module</th><th style={{ ...th, ...num }}>Sales</th><th style={{ ...th, ...num }}>COGS</th><th style={{ ...th, ...num }}>GP</th><th style={{ ...th, ...num }}>GP %</th><th style={{ ...th, ...num }}>% of Sales</th></tr></thead>
          <tbody>
            {mods.map((m) => (<tr key={m.key} {...rowNav(go, '/reports/gp')}><td style={td}>{m.name || m.key}</td><td style={{ ...td, ...num }}>{money(cur, m.sales)}</td><td style={{ ...td, ...num }}>{money(cur, m.cogs)}</td><td style={{ ...td, ...num, fontWeight: 700, color: (m.gp || 0) < 0 ? C.red : C.green }}>{money(cur, m.gp)}</td><td style={{ ...td, ...num }}>{pct(m.gpPct)}</td><td style={{ ...td, ...num }}>{pct(m.pctOfSales)}</td></tr>))}
            {!mods.length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>No data.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── 8) Sales & Bookings ───────────────────────────────────────────────────────
export function SalesBookingsDash({ branch, go }) {
  const p = usePeriod('all'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const mpl = useModulePL(branch, { ...range, summary: true }).data || {};
  const igp = useInvoiceGP(branch, range).data || {};
  const rows = igp.rows || [], deals = rows.length;
  const sales = mpl?.totals?.sales || 0;
  const topCust = topBy(rows, (r) => r.customer, (r) => r.sale, 10);
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Sales & Bookings" sub={`Sales, deals & top customers · ${range.label}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Total Sales" value={money(cur, sales)} onClick={go && (() => go('/reports/sreg'))} />
        <KPI label="Deals / Bookings" value={String(deals)} onClick={go && (() => go('/reports/invoice-gp'))} />
        <KPI label="Avg Deal" value={money(cur, deals ? sales / deals : 0)} onClick={go && (() => go('/reports/invoice-gp'))} />
        <KPI label="Gross Profit" value={money(cur, mpl?.totals?.gp || 0)} tone={(mpl?.totals?.gp || 0) < 0 ? 'bad' : 'good'} onClick={go && (() => go('/reports/gp'))} />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 320px' }}><ListTable title="Sales by Module" rows={(mpl.modules || []).map((m) => ({ name: m.name || m.key, amount: m.sales }))} cur={cur} go={go} rowTo="/reports/gp" /></div>
        <div style={{ flex: '1 1 320px' }}><ListTable title="Top 10 Customers (by sales)" rows={topCust} cur={cur} go={go} rowTo="/reports/sreg" /></div>
      </div>
    </div>
  );
}

// ── 9) Supplier / Purchase ────────────────────────────────────────────────────
export function SupplierPurchaseDash({ branch, go }) {
  const p = usePeriod('all'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const mpl = useModulePL(branch, { ...range, summary: true }).data || {};
  const igp = useInvoiceGP(branch, range).data || {};
  // Payables ageing respects the period's as-of date (mirrors ReceivablesPayablesDash) —
  // previously fixed to "today" regardless of the period bar.
  const age = useAgeing(branch, range.to).data || {};
  const rows = igp.rows || [];
  const topSup = topBy(rows, (r) => r.supplier, (r) => r.cost, 10);
  const payRows = (age.payables?.rows || []).slice(0, 10);
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Supplier / Purchase" sub={`Purchases & payables · ${range.label}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Total Purchases" value={money(cur, mpl?.totals?.cogs || 0)} onClick={go && (() => go('/reports/preg'))} />
        <KPI label="Payables Outstanding" value={money(cur, age.payables?.totals?.total || 0)} tone={(age.payables?.totals?.d90 || 0) ? 'bad' : undefined} sub={(age.payables?.totals?.d90 || 0) ? money(cur, age.payables.totals.d90) + ' overdue 90+' : ''} onClick={go && (() => go('/reports/pay'))} />
        <KPI label="Suppliers" value={String(topBy(rows, (r) => r.supplier, () => 1, 9999).filter((s) => s.name !== '—').length)} onClick={go && (() => go('/masters/supplier-tabs'))} />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 320px' }}><ListTable title="Top 10 Suppliers (by purchase)" rows={topSup} cur={cur} go={go} rowTo="/reports/preg" /></div>
        <div style={{ flex: '1 1 320px' }}><ListTable title="Top Payables (outstanding)" rows={payRows.map((r) => ({ name: r.party, amount: r.total }))} cur={cur} valColor={(v) => v < 0 ? C.green : C.red} go={go} rowTo="/reports/pay" /></div>
      </div>
    </div>
  );
}

// ── 10) Tax & Compliance ──────────────────────────────────────────────────────
export function TaxComplianceDash({ branch, go }) {
  const p = usePeriod('all'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const tax = useTaxSummary(branch, range).data || {};
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Tax & Compliance" sub={`GST / VAT position · ${range.label}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Output Tax" value={money(cur, tax.output?.total || 0)} onClick={go && (() => go('/tax/gstr-1-prep'))} />
        <KPI label="Input Tax (ITC)" value={money(cur, tax.input?.total || 0)} onClick={go && (() => go('/tax/gstr-3b-prep'))} />
        <KPI label="Net Payable" value={money(cur, tax.netPayable || 0)} tone={(tax.netPayable || 0) > 0 ? 'bad' : 'good'} sub={(tax.netPayable || 0) >= 0 ? 'payable' : 'refundable'} onClick={go && (() => go('/tax/gstr-3b-prep'))} />
        <KPI label="TCS Payable" value={money(cur, tax.tcs?.payable || 0)} onClick={go && (() => go('/tax/tds'))} />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 320px' }}><ListTable title="Output Tax (on sales)" rows={(tax.output?.lines || []).map((l) => ({ name: l.ledger, amount: l.amount }))} cur={cur} go={go} rowTo="/tax/gstr-1-prep" right={<strong style={{ color: C.dark }}>{money(cur, tax.output?.total || 0)}</strong>} /></div>
        <div style={{ flex: '1 1 320px' }}><ListTable title="Input Tax (on purchases)" rows={(tax.input?.lines || []).map((l) => ({ name: l.ledger, amount: l.amount }))} cur={cur} go={go} rowTo="/tax/gstr-3b-prep" right={<strong style={{ color: C.dark }}>{money(cur, tax.input?.total || 0)}</strong>} /></div>
      </div>
    </div>
  );
}

// ── 11) Expenses ──────────────────────────────────────────────────────────────
export function ExpensesDash({ branch, go }) {
  const p = usePeriod('all'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
 
  const mpl = useModulePL(branch, range).data || {};
  const ind = mpl.indirect || {};
  const total = ind.expense || 0;
  
  const heads = [];
  (ind.groups || []).forEach((g) => {
    if ((g.ledgers || []).length) (g.ledgers || []).forEach((l) => heads.push({ name: l.name, amount: l.amount }));
    else heads.push({ name: g.name, amount: g.amount });
  });
  heads.sort((a, b) => (b.amount || 0) - (a.amount || 0));
  const maxv = Math.max(1, ...heads.map((h) => Math.abs(h.amount || 0)));
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Expenses" sub={`Indirect expenses by head · ${range.label}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Total Indirect Expense" value={money(cur, total)} onClick={go && (() => go('/reports/pnl'))} />
        <KPI label="Expense Heads" value={String(heads.length)} onClick={go && (() => go('/reports/pnl'))} />
        <KPI label="Largest Head" value={heads[0] ? money(cur, heads[0].amount) : '—'} sub={heads[0]?.name || ''} onClick={go && (() => go('/reports/pnl'))} />
      </div>
      <Card title="Expenses by Head"><div style={{ padding: '10px 16px' }}>{heads.map((h) => miniBar(h.name, h.amount, maxv, '#c98', cur, rowNav(go, '/reports/pnl')))}{!heads.length && <div style={{ color: C.dim, fontSize: 12 }}>No expenses for this period.</div>}</div></Card>
    </div>
  );
}

// ── 12) Approvals & Audit ─────────────────────────────────────────────────────
export function ApprovalsAuditDash({ branch, go }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const toVch = go && (() => go('/transactions/voucher-approvals'));
  const toBkg = go && (() => go('/transactions/approvals'));
  const va = useVoucherApprovals(branch, 'pending').data || {};
  const counts = va.counts || {};
  const brCode = branch === 'ALL' || !branch ? '' : (branch.code || branch);
 
  const bq = useQuery({ queryKey: ['booking-orders', 'summary', brCode || 'all'], queryFn: () => apiGet('/api/booking-orders/summary', { branch: brCode }) });
  const bsum = bq.data || {};
  const bCount = (s) => (bsum[s]?.count || 0);
  const entries = (va.entries || []).slice(0, 15);
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Approvals & Audit" sub="Live control queue — vouchers + SO/PO/GP bookings" branch={branch} hidePeriod />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Vouchers Pending" value={String(counts.pending?.n || 0)} sub={money(cur, counts.pending?.amount || 0)} tone={(counts.pending?.n || 0) ? 'bad' : 'good'} onClick={toVch} />
        <KPI label="Bookings Pending" value={String(bCount('pending'))} tone={bCount('pending') ? 'bad' : 'good'} onClick={toBkg} />
        <KPI label="Approved" value={String((counts.approved?.n || 0) + bCount('approved'))} tone="good" onClick={toVch} />
        <KPI label="Rejected" value={String((counts.rejected?.n || 0) + bCount('rejected'))} onClick={toVch} />
        <KPI label="Deleted" value={String((counts.deleted?.n || 0) + bCount('deleted'))} onClick={toVch} />
      </div>
      <Card title="Pending Vouchers (awaiting your sign-off)">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Vch No</th><th style={th}>Type</th><th style={th}>Party</th><th style={{ ...th, ...num }}>Amount</th></tr></thead>
          <tbody>
            {entries.map((e, i) => (<tr key={i} onClick={toVch} role={toVch ? 'button' : undefined} tabIndex={toVch ? 0 : undefined}
              onKeyDown={toVch ? (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toVch(); } } : undefined}
              title={toVch ? 'Open in approvals queue →' : undefined} style={{ cursor: toVch ? 'pointer' : 'default' }}>
              <td style={{ ...td, fontFamily: 'monospace' }}>{e.vno}</td><td style={td}>{e.category || e.type}</td><td style={td}>{e.party || '—'}</td><td style={{ ...td, ...num }}>{money(cur, e.total)}</td></tr>))}
            {!entries.length && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>Nothing pending — all caught up.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// achievement gauge bar
const gauge = (pct, tone) => (
  <div style={{ background: '#eef1f7', borderRadius: 6, height: 22, overflow: 'hidden', position: 'relative' }}>
    <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: tone, height: '100%', transition: 'width .3s' }} />
    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: pct > 55 ? '#fff' : C.dark }}>{pct}%</span>
  </div>
);
const stTone = (s) => (s === 'met' || s === 'ok' ? C.green : s === 'warn' ? C.amber : s === 'over' || s === 'short' ? C.red : C.dim);
const stLabel = (s) => ({ met: '✓ Met', warn: '⚠ Near', short: '✗ Short', over: '🔴 Over', ok: '🟢 OK', 'no-target': 'No target' }[s] || s);

// ── 13/14/15) Sales / GP / Collections vs Target ──────────────────────────────
export function VsTargetDash({ branch, metric = 'sales', go }) {
  const p = usePeriod('all'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const d = useTargetsVsActual(branch, metric, { ...range, fy: fyStr() }).data || {};
  const t = d.totals || {}, rows = d.rows || [];
  // Consolidated ALL view mixing currencies → render Target/Actual/Variance per currency.
  const split = currencySplit(d);
  const title = { sales: 'Sales vs Target', gp: 'GP vs Target', collections: 'Collections vs Target' }[metric];
  // "Actual" drills into the live source that the achievement is measured against;
  // "Target" drills into the Sales Targets editor where the goal is set.
  const actualRoute = { sales: '/reports/sreg', gp: '/reports/gp', collections: '/reports/rec' }[metric];
  const toActual = go && (() => go(actualRoute));
  const toTarget = go && (() => go('/dashboards/sales-target'));
  const block = (bcur, bt, brows) => {
    const ach = bt.target ? Math.round((bt.actual / bt.target) * 100) : 0;
    return (
      <>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <KPI label="Target" value={money(bcur, bt.target)} onClick={toTarget} />
          <KPI label="Actual" value={money(bcur, bt.actual)} tone={(bt.actual || 0) >= (bt.target || 0) ? 'good' : undefined} onClick={toActual} />
          <KPI label="Variance" value={money(bcur, bt.variance)} tone={(bt.variance || 0) >= 0 ? 'good' : 'bad'} onClick={toActual} />
          <KPI label="Achievement" value={ach + '%'} tone={ach >= 100 ? 'good' : ach >= 90 ? undefined : 'bad'} sub={stLabel(bt.status)} onClick={toActual} />
        </div>
        <Card title="Achievement"><div style={{ padding: '14px 16px' }}>{gauge(ach, ach >= 100 ? C.green : ach >= 90 ? C.amber : C.red)}{!bt.target && <div style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>No target set. Set one in <b>Finance ▸ Sales Targets</b>.</div>}</div></Card>
        {metric !== 'collections' && (
          <Card title="By Module">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Module</th><th style={{ ...th, ...num }}>Target</th><th style={{ ...th, ...num }}>Actual</th><th style={{ ...th, ...num }}>Variance</th><th style={{ ...th, ...num }}>Ach %</th><th style={th}>Status</th></tr></thead>
              <tbody>
                {brows.map((r, i) => (<tr key={i} {...rowNav(go, actualRoute)}><td style={td}>{r.name}</td><td style={{ ...td, ...num }}>{money(bcur, r.target)}</td><td style={{ ...td, ...num }}>{money(bcur, r.actual)}</td><td style={{ ...td, ...num, color: r.variance < 0 ? C.red : C.green }}>{money(bcur, r.variance)}</td><td style={{ ...td, ...num }}>{pct(r.pct)}</td><td style={{ ...td, color: stTone(r.status), fontWeight: 700 }}>{stLabel(r.status)}</td></tr>))}
                {!brows.length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>No module-level targets/actuals.</td></tr>}
              </tbody>
            </table>
          </Card>
        )}
      </>
    );
  };
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title={title} sub={`Achievement vs target · ${range.label}`} branch={branch} p={p} />
      {split
        ? split.map((c) => (<div key={c.currency}><CurHead symbol={c.symbol} currency={c.currency} />{block(c.symbol, c.totals || {}, c.rows || [])}</div>))
        : block(cur, t, rows)}
    </div>
  );
}

// ── 16) Budget vs Expense ─────────────────────────────────────────────────────
export function BudgetVsExpenseDash({ branch, go }) {
  const p = usePeriod('all'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const d = useBudgetVsActual(branch, { ...range, fy: fyStr() }).data || {};
  const t = d.totals || {}, rows = d.rows || [];
  // Consolidated ALL view mixing currencies → render budget/actual per currency.
  const split = currencySplit(d);
  const toExp = go && (() => go('/reports/pnl'));
  const block = (bcur, bt, brows) => {
    const over = brows.filter((r) => r.status === 'over').length;
    return (
      <>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <KPI label="Budget (to date)" value={money(bcur, bt.budget)} onClick={go && (() => go('/expense/budget'))} />
          <KPI label="Actual Spend" value={money(bcur, bt.actual)} onClick={toExp} />
          <KPI label="Variance" value={money(bcur, bt.variance)} tone={(bt.variance || 0) >= 0 ? 'good' : 'bad'} sub={(bt.variance || 0) >= 0 ? 'under budget' : 'over budget'} onClick={toExp} />
          <KPI label="Heads Over Budget" value={String(over)} tone={over ? 'bad' : 'good'} onClick={toExp} />
        </div>
        <Card title="By Expense Head">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Head</th><th style={th}>Group</th><th style={{ ...th, ...num }}>Budget</th><th style={{ ...th, ...num }}>Actual</th><th style={{ ...th, ...num }}>Variance</th><th style={{ ...th, ...num }}>Used %</th><th style={th}>Status</th></tr></thead>
            <tbody>
              {brows.map((r, i) => (<tr key={i} {...rowNav(go, '/reports/pnl')}><td style={td}>{r.name}{r.unbudgeted && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: C.amber }}>· no budget</span>}</td><td style={{ ...td, color: C.dim }}>{r.group}</td><td style={{ ...td, ...num }}>{money(bcur, r.budget)}</td><td style={{ ...td, ...num }}>{money(bcur, r.actual)}</td><td style={{ ...td, ...num, color: r.variance < 0 ? C.red : C.green }}>{money(bcur, r.variance)}</td><td style={{ ...td, ...num }}>{pct(r.pct)}</td><td style={{ ...td, color: stTone(r.status), fontWeight: 700 }}>{stLabel(r.status)}</td></tr>))}
              {!brows.length && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>No budgets set. Add them in <b>Finance ▸ Expense Budget</b>.</td></tr>}
            </tbody>
          </table>
        </Card>
      </>
    );
  };
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Budget vs Expense" sub={`Indirect expense budget vs actual · ${d.months || ''} mo · ${range.label}`} branch={branch} p={p} />
      {split
        ? split.map((c) => (<div key={c.currency}><CurHead symbol={c.symbol} currency={c.currency} />{block(c.symbol, c.totals || {}, c.rows || [])}</div>))
        : block(cur, t, rows)}
    </div>
  );
}

// ── 16b) Performance vs Target — ONE page folding Sales / GP / Budget / Nett ───
// Profit vs their targets. Four gauge tiles → the Profit Bridge that ties them
// together → a module breakdown (Sales⇄GP toggle) beside the expense-head budget
// table. All four cards share ONE Branch/Period header (each old dashboard set its
// own period independently). Tiles drill into the standalone dashboards, which
// stay live as the deep-dive views. NP actual = P&L netProfit; NP target = the
// company-total 'np' SalesTarget (metric added to the targets master).
export function PerformanceDash({ branch, go }) {
  const p = usePeriod('all'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const fy = fyStr();
  const salesQ = useTargetsVsActual(branch, 'sales', { ...range, fy });
  const gpQ    = useTargetsVsActual(branch, 'gp',    { ...range, fy });
  const npQ    = useTargetsVsActual(branch, 'np',    { ...range, fy });
  const budQ   = useBudgetVsActual(branch, { ...range, fy });
  const ld = salesQ.isLoading || gpQ.isLoading || npQ.isLoading || budQ.isLoading; // don't paint ₹0 as real while loading
  const nT = npQ.data?.totals || {};

  // Consolidated ALL view mixing currencies → India (₹) & Africa ($) kept separate across
  // all four metrics. Build an ordered (INR-first) currency list from whichever hooks
  // split, then pull each metric's matching per-currency entry for that block.
  const salesSplit = currencySplit(salesQ.data), gpSplit = currencySplit(gpQ.data);
  const npSplit = currencySplit(npQ.data), budSplit = currencySplit(budQ.data);
  const anySplit = salesSplit || gpSplit || npSplit || budSplit;
  const curList = [];
  [salesSplit, gpSplit, npSplit, budSplit].forEach((sp) => (sp || []).forEach((e) => { if (!curList.some((x) => x.currency === e.currency)) curList.push({ currency: e.currency, symbol: e.symbol }); }));
  const entryFor = (split, currency) => (split ? (split.find((x) => x.currency === currency) || {}) : {});

  const [tab, setTab] = useState('sales');            // module table toggle

  const achOf  = (t) => (t.target ? Math.round((t.actual / t.target) * 100) : 0);
  const usedOf = (t) => (t.budget ? Math.round((t.actual / t.budget) * 100) : 0);
  // Achievement gauge tone. Budget is inverted — high "used %" is BAD (overspend),
  // so ≤100 = green (under budget), ≤110 = amber, else red. The rest are the
  // standard ≥100 green / ≥90 amber / red thresholds.
  const toneOf = (t) => (t.invert
    ? (t.ach <= 100 ? C.green : t.ach <= 110 ? C.amber : C.red)
    : (t.ach >= 100 ? C.green : t.ach >= 90 ? C.amber : C.red));

  const buildTiles = (sT, gT, npT, bT) => ([
    { key: 'sales', title: 'Sales vs Target',       ach: achOf(sT), actual: sT.actual, target: sT.target, variance: sT.variance, invert: false, route: '/dashboards/sales-target', aLabel: 'Actual', tLabel: 'Target', fav: 'ahead', unfav: 'short' },
    { key: 'gp',    title: 'GP vs Target',          ach: achOf(gT), actual: gT.actual, target: gT.target, variance: gT.variance, invert: false, route: '/dashboards/gp-target',    aLabel: 'Actual', tLabel: 'Target', fav: 'ahead', unfav: 'short' },
    { key: 'bud',   title: 'Budget vs Expense',     ach: usedOf(bT), actual: bT.actual, target: bT.budget, variance: bT.variance, invert: true,  route: '/dashboards/budget-expense', aLabel: 'Spent', tLabel: 'Budget', fav: 'under', unfav: 'over' },
    { key: 'np',    title: 'Nett Profit vs Target', ach: achOf(npT), actual: npT.actual, target: npT.target, variance: npT.variance, invert: false, route: '/dashboards/profitability', aLabel: 'Actual', tLabel: 'Target', fav: 'ahead', unfav: 'short' },
  ]);
  const noNpTarget = !ld && !nT.target;

  const Tile = ({ t, bcur }) => {
    const tone = toneOf(t);
    const favUp = (t.variance || 0) >= 0;               // positive variance is favourable for ALL four (budget's is budget−actual)
    const open = go && t.route ? () => go(t.route) : undefined;
    return (
      <div onClick={open} role={open ? 'button' : undefined} tabIndex={open ? 0 : undefined}
        onKeyDown={open ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } } : undefined}
        title={open ? 'Open full dashboard →' : undefined}
        className="min-w-[210px] flex-1 basis-[210px] rounded-brand bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
        style={{ cursor: open ? 'pointer' : 'default', border: `1px solid ${C.border}`, borderTop: `4px solid ${tone}` }}>
        <div className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{t.title}</div>
        <div style={{ marginTop: 10, marginBottom: 10 }}>{gauge(ld ? 0 : t.ach, tone)}{t.invert && <div className="mt-0.5 text-right text-[10px] text-ink-muted">of budget used</div>}</div>
        <div className="flex items-baseline justify-between">
          <span className="text-[16px] font-black tabular-nums" style={{ color: C.dark }}>{ld ? '…' : money(bcur, t.actual)}</span>
          <span className="text-[12px] text-ink-muted tabular-nums">/ {ld ? '…' : money(bcur, t.target)}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between">
          <span className="text-[10.5px] text-ink-muted">{t.aLabel} / {t.tLabel}</span>
          {!ld && <span className="text-[11px] font-bold" style={{ color: favUp ? C.green : C.red }}>{favUp ? '▲' : '▼'} {money(bcur, Math.abs(t.variance || 0))} {favUp ? t.fav : t.unfav}</span>}
        </div>
      </div>
    );
  };

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{ padding: '3px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
      color: tab === id ? '#fff' : C.dim, background: tab === id ? C.dark : '#fff', border: `1px solid ${tab === id ? C.dark : C.border}`, borderRadius: 6 }}>{label}</button>
  );

  const tilesRow = (tls, bcur) => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{tls.map((t) => <Tile key={t.key} t={t} bcur={bcur} />)}</div>
  );

  const tablesRow = (bcur, salesRows, gpRows, budRows) => {
    const modRows = tab === 'sales' ? salesRows : gpRows;
    const overHeads = budRows.filter((r) => r.status === 'over').length;
    return (
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 440 }}>
          <Card title={`${tab === 'sales' ? 'Sales' : 'GP'} vs Target — by Module`} right={<div style={{ display: 'flex', gap: 6 }}><TabBtn id="sales" label="Sales" /><TabBtn id="gp" label="GP" /></div>}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Module</th><th style={{ ...th, ...num }}>Target</th><th style={{ ...th, ...num }}>Actual</th><th style={{ ...th, ...num }}>Variance</th><th style={{ ...th, ...num }}>Ach %</th><th style={th}>Status</th></tr></thead>
              <tbody>
                {modRows.map((r, i) => (<tr key={i} {...rowNav(go, tab === 'sales' ? '/reports/sreg' : '/reports/gp')}><td style={td}>{r.name}</td><td style={{ ...td, ...num }}>{money(bcur, r.target)}</td><td style={{ ...td, ...num }}>{money(bcur, r.actual)}</td><td style={{ ...td, ...num, color: r.variance < 0 ? C.red : C.green }}>{money(bcur, r.variance)}</td><td style={{ ...td, ...num }}>{pct(r.pct)}</td><td style={{ ...td, color: stTone(r.status), fontWeight: 700 }}>{stLabel(r.status)}</td></tr>))}
                {ld && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`}><td colSpan={6} style={{ ...td, padding: 10 }}><Skeleton className="h-4 w-full" style={{ opacity: Math.max(0.4, 1 - i * 0.15) }} /></td></tr>
                ))}
                {!ld && !modRows.length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>No module-level targets/actuals.</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>
        <div style={{ flex: 1, minWidth: 440 }}>
          <Card title="Budget vs Expense — by Head" right={<span style={{ fontSize: 11, fontWeight: 700, color: overHeads ? C.red : C.green }}>{overHeads} over budget</span>}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Head</th><th style={{ ...th, ...num }}>Budget</th><th style={{ ...th, ...num }}>Actual</th><th style={{ ...th, ...num }}>Variance</th><th style={{ ...th, ...num }}>Used %</th><th style={th}>Status</th></tr></thead>
              <tbody>
                {budRows.map((r, i) => (<tr key={i} {...rowNav(go, '/reports/pnl')}><td style={td}>{r.name}{r.unbudgeted && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: C.amber }}>· no budget</span>}</td><td style={{ ...td, ...num }}>{money(bcur, r.budget)}</td><td style={{ ...td, ...num }}>{money(bcur, r.actual)}</td><td style={{ ...td, ...num, color: r.variance < 0 ? C.red : C.green }}>{money(bcur, r.variance)}</td><td style={{ ...td, ...num }}>{pct(r.pct)}</td><td style={{ ...td, color: stTone(r.status), fontWeight: 700 }}>{stLabel(r.status)}</td></tr>))}
                {ld && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`}><td colSpan={6} style={{ ...td, padding: 10 }}><Skeleton className="h-4 w-full" style={{ opacity: Math.max(0.4, 1 - i * 0.15) }} /></td></tr>
                ))}
                {!ld && !budRows.length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>No budgets set. Add them in Finance ▸ Expense Budget.</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="TGT VS Sales/GP/EX/NP" sub={`Sales · GP · Budget · Nett Profit — all vs target · ${range.label}`} branch={branch} p={p} />
      {anySplit
        ? curList.map((c) => <div key={c.currency}><CurHead symbol={c.symbol} currency={c.currency} />{tilesRow(buildTiles(entryFor(salesSplit, c.currency).totals || {}, entryFor(gpSplit, c.currency).totals || {}, entryFor(npSplit, c.currency).totals || {}, entryFor(budSplit, c.currency).totals || {}), c.symbol)}</div>)
        : tilesRow(buildTiles(salesQ.data?.totals || {}, gpQ.data?.totals || {}, nT, budQ.data?.totals || {}), cur)}
      <div className="mt-1.5 text-[11px] text-ink-muted">Green ≥100% · amber ≥90% · red &lt;90% (budget inverts: green = under budget).{noNpTarget && <> · <b>No Nett Profit target set</b> — add one in <b>Finance ▸ Sales Targets</b> (metric “Nett Profit”).</>}</div>

      {/* PnlWaterfallPanel is a self-titled card ("📉 Profit Bridge") — render it
          directly (NO wrapping Card) to avoid a card-in-card + duplicate title. */}
      <div className="mt-3.5">
        <PnlWaterfallPanel branch={branch} range={range} formatMoney={(n) => money(cur, n)} onViewFullReport={go && (() => go('/reports/pnl'))} />
      </div>

      {anySplit
        ? curList.map((c) => <div key={c.currency}><CurHead symbol={c.symbol} currency={c.currency} />{tablesRow(c.symbol, entryFor(salesSplit, c.currency).rows || [], entryFor(gpSplit, c.currency).rows || [], entryFor(budSplit, c.currency).rows || [])}</div>)
        : tablesRow(cur, salesQ.data?.rows || [], gpQ.data?.rows || [], budQ.data?.rows || [])}
    </div>
  );
}


// ── 17) Cash Forecast (13-week) ───────────────────────────────────────────────
// Forward liquidity projection from /api/accounting/cash-forecast: opening cash &
// bank, then due-date-bucketed inflow/outflow over the next 13 weeks with a running
// closing balance. The lowest projected closing is the liquidity risk to watch.
export function CashForecastDash({ branch, go }) {
  const p = usePeriod('all'); const range = p.range;       // period sets the opening cash cut-off (as-of date)
  const cur = (bc(branch) || {}).cur || '₹';
  const q = useCashForecast(branch, range); const d = q.data || {};
  const rows = d.rows || [];
  const opening = d.opening || 0;
  const totalIn = rows.reduce((s, r) => s + (r.inflow || 0), 0);
  const totalOut = rows.reduce((s, r) => s + (r.outflow || 0), 0);
  const closing = rows.length ? rows[rows.length - 1].closing : opening;
  const low = rows.reduce((m, r) => (r.closing < m.closing ? r : m), { closing: opening, week: 'now' });
  const maxFlow = Math.max(1, ...rows.map((r) => Math.max(r.inflow || 0, r.outflow || 0)));
  const ld = q.isLoading; // don't paint computed-from-empty ₹0 while the forecast loads
  const mv = (n) => (ld ? '…' : money(cur, n));
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Cash Forecast (13-week)" sub={`Projected liquidity from due-dated invoices · opening as of ${range.to}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Opening Cash & Bank" value={mv(opening)} tone={ld ? undefined : (opening < 0 ? 'bad' : undefined)} onClick={go && (() => go('/dashboards/cash'))} />
        <KPI label="Expected Inflow (13w)" value={mv(totalIn)} tone={ld ? undefined : 'good'} onClick={go && (() => go('/dashboards/arap'))} />
        <KPI label="Expected Outflow (13w)" value={mv(totalOut)} onClick={go && (() => go('/dashboards/arap'))} />
        <KPI label="Projected Closing" value={mv(closing)} tone={ld ? undefined : (closing < 0 ? 'bad' : 'good')} />
        <KPI label="Lowest Point" value={q.isLoading ? '…' : money(cur, low.closing)} sub={low.closing < 0 ? `cash gap at ${low.week}` : `at ${low.week}`} tone={low.closing < 0 ? 'bad' : undefined} />
      </div>
      <Card title="Weekly Projection">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Week</th><th style={{ ...th }}>Flow</th><th style={{ ...th, ...num }}>Inflow</th><th style={{ ...th, ...num }}>Outflow</th><th style={{ ...th, ...num }}>Net</th><th style={{ ...th, ...num }}>Closing</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const net = (r.inflow || 0) - (r.outflow || 0);
              return (
                <tr key={r.week}>
                  <td style={{ ...td, fontWeight: 700 }}>{r.week}</td>
                  <td style={{ ...td, width: 220 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ background: '#eaf4ee', borderRadius: 3, height: 7 }}><div style={{ width: `${(r.inflow || 0) / maxFlow * 100}%`, background: C.green, height: '100%', borderRadius: 3 }} /></div>
                      <div style={{ background: '#fbecec', borderRadius: 3, height: 7 }}><div style={{ width: `${(r.outflow || 0) / maxFlow * 100}%`, background: C.red, height: '100%', borderRadius: 3 }} /></div>
                    </div>
                  </td>
                  <td style={{ ...td, ...num, color: C.green }}>{money(cur, r.inflow)}</td>
                  <td style={{ ...td, ...num, color: C.red }}>{money(cur, r.outflow)}</td>
                  <td style={{ ...td, ...num, fontWeight: 700, color: net < 0 ? C.red : C.dark }}>{money(cur, net)}</td>
                  <td style={{ ...td, ...num, fontWeight: 700, color: (r.closing || 0) < 0 ? C.red : C.dark }}>{money(cur, r.closing)}</td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>{q.isLoading ? 'Building forecast…' : 'No open invoices to project.'}</td></tr>}
          </tbody>
        </table>
        <div style={{ padding: '8px 14px', fontSize: 11, color: C.dim }}>Inflows = open sales due (by credit days), outflows = open purchases due. Overdue items land in W1; anything beyond 13 weeks rolls into W13.</div>
      </Card>
    </div>
  );
}

// ── 18) YoY Growth ────────────────────────────────────────────────────────────
// Year-over-year P&L from /api/accounting/yoy: the current window vs the SAME
// window one year earlier (defaults to FY-to-date). Growth is good on Income lines,
// bad on Cost lines — colour follows the line's `group`.
export function YoYGrowthDash({ branch, go }) {
  const p = usePeriod('all'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const yq = useYearOverYear(branch, range); const d = yq.data || {};
  const rows = d.rows || [];
  const find = (q) => rows.find((r) => (r.line || '').toLowerCase().includes(q)) || { cy: 0, ly: 0, group: 'Income' };
  const rev = find('revenue'), gpRow = find('gross profit'), netRow = find('net profit');
  const growthTone = (r) => { const g = deltaPct(r.cy, r.ly); if (g == null) return undefined; const good = r.group === 'Costs' ? g < 0 : g >= 0; return good ? 'good' : 'bad'; };
  const dlt = (r) => deltaPct(r.cy, r.ly);
  // Don't paint ₹0 / ▲0% as if real while loading or when the window has no data —
  // the table already shows a "no data"/loading message; the KPI cards must too.
  const noData = yq.isLoading || !rows.length;
  const kv = (r) => (noData ? '…' : money(cur, r.cy));
  const ks = (r) => (noData ? '' : `prev ${money(cur, r.ly)}`);
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="YoY Growth" sub={`${d.current?.label || 'This year'} vs ${d.prior?.label || 'last year'}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Revenue" value={kv(rev)} sub={ks(rev)} delta={noData ? null : dlt(rev)} tone={noData ? undefined : growthTone(rev)} onClick={go && (() => go('/dashboards/sales'))} />
        <KPI label="Gross Profit" value={kv(gpRow)} sub={ks(gpRow)} delta={noData ? null : dlt(gpRow)} tone={noData ? undefined : growthTone(gpRow)} onClick={go && (() => go('/dashboards/module-gp'))} />
        <KPI label="Net Profit" value={kv(netRow)} sub={ks(netRow)} delta={noData ? null : dlt(netRow)} tone={noData ? undefined : growthTone(netRow)} onClick={go && (() => go('/dashboards/profitability'))} />
      </div>
      <Card title="P&L — This Year vs Last Year">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Line</th><th style={{ ...th, ...num }}>{d.current?.label || 'Current'}</th><th style={{ ...th, ...num }}>{d.prior?.label || 'Prior'}</th><th style={{ ...th, ...num }}>Change</th><th style={{ ...th, ...num }}>Growth %</th></tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const change = (r.cy || 0) - (r.ly || 0);
              const g = dlt(r); const tone = growthTone(r);
              const col = tone === 'good' ? C.green : tone === 'bad' ? C.red : C.dim;
              return (
                <tr key={i} style={{ background: r.bold ? C.bg : undefined }} {...rowNav(go, '/reports/pnl')}>
                  <td style={{ ...td, fontWeight: r.bold ? 800 : 400 }}>{r.line}</td>
                  <td style={{ ...td, ...num, fontWeight: r.bold ? 800 : 400 }}>{money(cur, r.cy)}</td>
                  <td style={{ ...td, ...num, color: C.dim }}>{money(cur, r.ly)}</td>
                  <td style={{ ...td, ...num, color: change >= 0 ? C.dark : C.red }}>{money(cur, change)}</td>
                  <td style={{ ...td, ...num, fontWeight: 700, color: col }}>{g == null ? '—' : (g >= 0 ? '▲ ' : '▼ ') + pct(Math.abs(g))}</td>
                </tr>
              );
            })}
            {yq.isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`}><td colSpan={5} style={{ ...td, padding: 10 }}><Skeleton className="h-4 w-full" style={{ opacity: Math.max(0.4, 1 - i * 0.15) }} /></td></tr>
            ))}
            {!yq.isLoading && !rows.length && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>No comparison data for this window.</td></tr>}
          </tbody>
        </table>
        <div style={{ padding: '8px 14px', fontSize: 11, color: C.dim }}>Compared against the matching span of the previous financial year. On cost lines a fall (▼) is the favourable move.</div>
      </Card>
    </div>
  );
}

// ── 19) Customer Value (LTV + ABC) ────────────────────────────────────────────
// Who drives the business: lifetime value & recency per customer (/customer-ltv)
// merged with the ABC/Pareto class (/abc-analysis?by=customer). A-class customers
// are the ~top 80% of revenue — the relationships to protect.
export function CustomerValueDash({ branch, go }) {
  const p = usePeriod('all'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const lq = useCustomerLtv(branch, range); const ltv = lq.data || {};
  const abc = useAbcAnalysis(branch, { ...range, by: 'customer' }).data || {};
  // Consolidated ALL view mixing currencies → India (₹) & Africa ($) kept separate. The
  // ABC split is paired to the LTV split by currency so each block's class values match.
  const split = currencySplit(ltv);
  const abcByCur = {}; (currencySplit(abc) || []).forEach((e) => { abcByCur[e.currency] = e; });
  const clsColor = (c) => (c === 'A' ? C.green : c === 'B' ? C.amber : c === 'C' ? C.dim : C.dim);
  const block = (bcur, t, cls, ltvRows, abcRows) => {
    const classOf = {}; (abcRows || []).forEach((r) => { classOf[r.name] = r.class; });
    const rows = (ltvRows || []).slice(0, 25).map((r) => ({ ...r, class: classOf[r.name] || '—' }));
    const clsChip = (k, c) => (
      <span key={k} style={{ fontSize: 11.5, color: C.dim }}>
        Class {k}: <b style={{ color: c }}>{(cls[k]?.count || 0)}</b> cust · {money(bcur, cls[k]?.value || 0)} ({(cls[k]?.share || 0).toFixed(0)}%)
      </span>
    );
    return (
      <>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <KPI label="Customers" value={String(t.customers || 0)} onClick={go && (() => go('/masters/customers'))} />
          <KPI label="Total Revenue" value={money(bcur, t.ltv || 0)} tone="good" onClick={go && (() => go('/dashboards/sales'))} />
          <KPI label="Bookings" value={String(t.bookings || 0)} />
          <KPI label="Avg per Customer" value={money(bcur, (t.customers ? (t.ltv || 0) / t.customers : 0))} />
        </div>
        <Card title="ABC / Pareto split">
          <div style={{ display: 'flex', gap: 16, padding: '10px 14px', flexWrap: 'wrap' }}>
            {clsChip('A', C.green)}{clsChip('B', C.amber)}{clsChip('C', C.dim)}
            <span style={{ fontSize: 11, color: C.dim, marginLeft: 'auto' }}>A = top ~80% of revenue · B = next ~15% · C = long tail</span>
          </div>
        </Card>
        <Card title="Top Customers by Lifetime Value">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Customer</th><th style={{ ...th }}>Class</th><th style={{ ...th, ...num }}>Revenue</th><th style={{ ...th, ...num }}>GP</th><th style={{ ...th, ...num }}>GP %</th><th style={{ ...th, ...num }}>Bookings</th><th style={{ ...th, ...num }}>Avg Basket</th><th style={{ ...th, ...num }}>Last Seen</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} {...rowNav(go, '/masters/customers')}>
                  <td style={td}>{r.name}</td>
                  <td style={{ ...td, fontWeight: 800, color: clsColor(r.class) }}>{r.class}</td>
                  <td style={{ ...td, ...num, fontWeight: 700 }}>{money(bcur, r.ltv)}</td>
                  <td style={{ ...td, ...num, color: (r.gp || 0) < 0 ? C.red : C.green }}>{money(bcur, r.gp)}</td>
                  <td style={{ ...td, ...num }}>{pct(r.gpPct)}</td>
                  <td style={{ ...td, ...num }}>{r.totalBookings}</td>
                  <td style={{ ...td, ...num }}>{money(bcur, r.avgBasket)}</td>
                  <td style={{ ...td, ...num, color: r.recencyDays > 180 ? C.red : C.dim }}>{r.recencyDays != null ? `${r.recencyDays}d ago` : '—'}</td>
                </tr>
              ))}
              {lq.isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`}><td colSpan={8} style={{ ...td, padding: 10 }}><Skeleton className="h-4 w-full" style={{ opacity: Math.max(0.4, 1 - i * 0.15) }} /></td></tr>
              ))}
              {!lq.isLoading && !rows.length && <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>No customer activity for this period.</td></tr>}
            </tbody>
          </table>
        </Card>
      </>
    );
  };
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Customer Value (LTV + ABC)" sub={`Who drives revenue · ${range.label} · top 25`} branch={branch} p={p} />
      {split
        ? split.map((c) => { const a = abcByCur[c.currency] || {}; return (<div key={c.currency}><CurHead symbol={c.symbol} currency={c.currency} />{block(c.symbol, c.totals || {}, a.classes || {}, c.rows || [], a.rows || [])}</div>); })
        : block(cur, ltv.totals || {}, abc.classes || {}, ltv.rows || [], abc.rows || [])}
    </div>
  );
}

// Router for the Director dropdown routes. `setRoute` (App's navigate) lets the
// KPI tiles drill into the matching register/report.
export function DirectorDash({ which, branch, setRoute }) {
  const go = (r) => setRoute && setRoute(r);
  // Every dashboard receives `go` so its money KPIs drill into the matching
  // register/report. (Previously only a handful were passed `go`, leaving most
  // dashboards' amounts non-clickable.)
  if (which === 'profitability') return <ProfitabilityDash branch={branch} go={go} />;
  if (which === 'cash') return <CashLiquidityDash branch={branch} go={go} />;
  if (which === 'arap') return <ReceivablesPayablesDash branch={branch} go={go} />;
  if (which === 'branch') return <BranchPerformanceDash go={go} branch={branch} />;
  if (which === 'balance-sheet') return <BalanceSheetDash branch={branch} go={go} />;
  if (which === 'module-gp') return <ModuleGpDash branch={branch} go={go} />;
  if (which === 'sales') return <SalesBookingsDash branch={branch} go={go} />;
  if (which === 'supplier') return <SupplierPurchaseDash branch={branch} go={go} />;
  if (which === 'tax') return <TaxComplianceDash branch={branch} go={go} />;
  if (which === 'expenses') return <ExpensesDash branch={branch} go={go} />;
  if (which === 'audit') return <ApprovalsAuditDash branch={branch} go={go} />;
  if (which === 'sales-target') return <VsTargetDash branch={branch} metric="sales" go={go} />;
  if (which === 'gp-target') return <VsTargetDash branch={branch} metric="gp" go={go} />;
  if (which === 'collections-target') return <VsTargetDash branch={branch} metric="collections" go={go} />;
  if (which === 'budget-expense') return <BudgetVsExpenseDash branch={branch} go={go} />;
  if (which === 'performance') return <PerformanceDash branch={branch} go={go} />;
  if (which === 'cash-forecast') return <CashForecastDash branch={branch} go={go} />;
  if (which === 'yoy') return <YoYGrowthDash branch={branch} go={go} />;
  if (which === 'customer-value') return <CustomerValueDash branch={branch} go={go} />;
  return <ExecutiveOverview branch={branch} go={go} />;
}
