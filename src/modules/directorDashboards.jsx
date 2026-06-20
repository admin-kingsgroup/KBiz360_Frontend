// ─── Director Dashboards (Director + Super Admin only) ────────────────────────
// Phase 1: a "Dashboards" suite giving the owner a whole-company view. Each reuses
// the existing report endpoints (no new accounting logic). Shared toolbar gives
// period presets; the Executive Overview adds an alert feed + KPI trend arrows.
import React, { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/api';
import { FocusBanner } from '../core/ux/FocusBanner';
import { bc } from '../core/styles';
import { PeriodBar, periodRange } from '../core/period';
import {
  useProfitAndLoss, useModulePL, useBalanceSheet, useAgeing, useInvoiceGP,
  useTaxSummary, useTrialBalance, useVoucherApprovals, useYearOverYear,
  useBudgetVsActual, useTargetsVsActual, useSalesTargets, useSaveTargets,
} from '../core/useAccounting';
import { CONSOLIDATED_LABEL } from '../core/data';

const C = { dark: '#0d1326', gold: '#d4a437', blue: '#185FA5', red: '#A32D2D', green: '#1f7a3d', amber: '#b8860b', dim: '#5a6691', border: '#e1e3ec', bg: '#f3f4f8' };
const BRANCHES = [
  { code: 'BOM', cur: '₹' }, { code: 'AMD', cur: '₹' }, { code: 'TKHO', cur: '₹' },
  { code: 'NBO', cur: '$' }, { code: 'DAR', cur: '$' }, { code: 'FBM', cur: '$' },
];

// ── helpers ───────────────────────────────────────────────────────────────────
const r0 = (n) => Math.round(Number(n) || 0);
const money = (cur, n) => (n < 0 ? '-' : '') + (cur || '₹') + Math.abs(r0(n)).toLocaleString('en-IN');
const pct = (n) => (Number(n) || 0).toFixed(1) + '%';
const pad2 = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fyStr = (now = new Date()) => { const y = now.getFullYear(); const s = now.getMonth() >= 3 ? y : y - 1; return `${s}-${String(s + 1).slice(-2)}`; };
const MOD_OPTS = [['', 'All modules'], ['SF', 'Flight'], ['SH', 'Holiday'], ['SHT', 'Hotel'], ['SV', 'Visa'], ['SI', 'Insurance'], ['SC', 'Car'], ['SM', 'Misc']];

// ── shared UI bits ──────────────────────────────────────────────────────────────
// Header with title + the uniform PeriodBar (driven via the usePeriod object `p`).
function Toolbar({ title, sub, branch, p }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.dark }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: C.dim }}>{sub}</div>}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <PeriodBar branch={branch} defaultPreset={p && p.def} onChange={p && p.setRange} />
        <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, background: '#E6F1FB', padding: '4px 9px', borderRadius: 5 }}>{branch === 'ALL' || !branch ? CONSOLIDATED_LABEL : (branch.code || branch)}</span>
      </div>
    </div>
  );
}

function KPI({ label, value, sub, tone, delta }) {
  const col = tone === 'bad' ? C.red : tone === 'good' ? C.green : C.dark;
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', minWidth: 180, flex: '1 1 180px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: col, marginTop: 4 }}>{value}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        {sub && <span style={{ fontSize: 11, color: C.dim }}>{sub}</span>}
        {delta != null && <span style={{ fontSize: 11, fontWeight: 700, color: delta >= 0 ? C.green : C.red }}>{delta >= 0 ? '▲' : '▼'} {pct(Math.abs(delta))}</span>}
      </div>
    </div>
  );
}
const Card = ({ title, children, right }) => (
  <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', marginTop: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
      <strong style={{ color: C.dark, fontSize: 13.5 }}>{title}</strong>{right}
    </div>
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>{children}</div>
  </div>
);
const th = { padding: '8px 12px', background: C.bg, color: C.dim, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' };
const td = { padding: '7px 12px', borderBottom: '1px solid #f2f4f8', fontSize: 12.5 };
const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

// usePeriod — holds the active range; the PeriodBar inside Toolbar drives setRange.
function usePeriod(def = 'all') {
  const [range, setRange] = useState(() => periodRange(def, {}));
  return { range, setRange, def };
}

// ── 1) Executive Overview ─────────────────────────────────────────────────────
export function ExecutiveOverview({ branch }) {
  const p = usePeriod('cfy'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const plQ = useProfitAndLoss(branch, range); const pl = plQ.data || {};
  const mplQ = useModulePL(branch, range); const mpl = mplQ.data || {};
  const bsQ = useBalanceSheet(branch, { to: range.to }); const bs = bsQ.data || {};
  const age = useAgeing(branch).data || {};
  const tax = useTaxSummary(branch, range).data || {};
  const trial = useTrialBalance(branch, range).data || {};
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
  const balanced = Math.abs(assetTotal - liabTotal) < 1;
  const cash = (trial.rows || []).filter((r) => /cash|bank/i.test(r.group || '')).reduce((s, r) => s + ((r.closingDebit || 0) - (r.closingCredit || 0)), 0);
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
  if (!balanced && (assetTotal || liabTotal)) alerts.push(['bad', `Balance Sheet out of balance by ${money(cur, assetTotal - liabTotal)}`]);
  if (cash < 0) alerts.push(['bad', `Negative cash/bank balance: ${money(cur, cash)}`]);
  if (arOverdue > 0) alerts.push(['warn', `Receivables overdue 90+ days: ${money(cur, arOverdue)}`]);
  if (pend > 0) alerts.push(['warn', `${pend} approval(s) pending (${money(cur, pendAmt)}) — awaiting your sign-off`]);
  if (!alerts.length) {
    if (coreError) alerts.push(['bad', 'Couldn’t load some figures — this view may be incomplete. Try refreshing.']);
    else if (coreLoading) alerts.push(['warn', 'Loading the latest figures…']);
    else alerts.push(['good', 'No exceptions — books look healthy for this period.']);
  }

  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Executive Overview" sub={`Whole-company snapshot · ${range.label}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Revenue" value={money(cur, sales)} delta={dSales} />
        <KPI label="Gross Profit" value={money(cur, gp)} sub={pct(sales ? (gp / sales) * 100 : 0) + ' margin'} tone={gp < 0 ? 'bad' : 'good'} />
        <KPI label="Net Profit" value={money(cur, net)} tone={net < 0 ? 'bad' : 'good'} delta={dNet} />
        <KPI label="Cash & Bank" value={money(cur, cash)} tone={cash < 0 ? 'bad' : undefined} />
        <KPI label="Receivables" value={money(cur, ar)} sub={arOverdue ? `${money(cur, arOverdue)} overdue 90+` : 'current'} tone={arOverdue ? 'bad' : undefined} />
        <KPI label="Payables" value={money(cur, ap)} />
        <KPI label="GST/VAT Net" value={money(cur, tax?.netPayable || 0)} sub={(tax?.netPayable || 0) >= 0 ? 'payable' : 'refundable'} />
        <KPI label="Pending Approvals" value={String(pend)} sub={money(cur, pendAmt)} tone={pend ? 'bad' : 'good'} />
      </div>

      <Card title="⚠ Attention Needed">
        <div style={{ padding: '6px 0' }}>
          {alerts.map(([tone, msg], i) => (
            <div key={i} style={{ padding: '7px 14px', fontSize: 12.5, color: tone === 'bad' ? C.red : tone === 'warn' ? C.amber : C.green, borderBottom: i < alerts.length - 1 ? '1px solid #f4f6fa' : 'none' }}>
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
              <tr key={m.key}><td style={td}>{m.key}</td><td style={{ ...td, ...num }}>{money(cur, m.sales)}</td><td style={{ ...td, ...num }}>{money(cur, m.cogs)}</td><td style={{ ...td, ...num, fontWeight: 700, color: m.gp < 0 ? C.red : C.green }}>{money(cur, m.gp)}</td><td style={{ ...td, ...num }}>{pct(m.gpPct)}</td></tr>
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
export function ProfitabilityDash({ branch }) {
  const p = usePeriod('cfy'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const pl = useProfitAndLoss(branch, range).data || {};
  const mpl = useModulePL(branch, range).data || {};
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
        <KPI label="Revenue" value={money(cur, sales)} />
        <KPI label="Gross Profit" value={money(cur, gp)} sub={pct(sales ? gp / sales * 100 : 0)} tone={gp < 0 ? 'bad' : 'good'} />
        <KPI label="Indirect Expenses" value={money(cur, indExp)} />
        <KPI label="Net Profit" value={money(cur, net)} tone={net < 0 ? 'bad' : 'good'} sub={pct(sales ? net / sales * 100 : 0)} />
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
export function CashLiquidityDash({ branch }) {
  const p = usePeriod('cfy'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const trial = useTrialBalance(branch, range).data || {};
  const rows = (trial.rows || []).filter((r) => /cash|bank/i.test(r.group || ''));
  const bal = (r) => (r.closingDebit || 0) - (r.closingCredit || 0); // closing balance (Dr +ve)
  const cash = rows.filter((r) => /cash/i.test(r.group)).reduce((s, r) => s + bal(r), 0);
  const bankRows = rows.filter((r) => /bank/i.test(r.group));
  const bank = bankRows.reduce((s, r) => s + bal(r), 0);
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Cash & Liquidity" sub={`Cash + bank position · ${range.label}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Cash in Hand" value={money(cur, cash)} tone={cash < 0 ? 'bad' : undefined} />
        <KPI label="Bank Balance" value={money(cur, bank)} tone={bank < 0 ? 'bad' : undefined} />
        <KPI label="Total Liquid" value={money(cur, cash + bank)} tone={(cash + bank) < 0 ? 'bad' : 'good'} />
      </div>
      <Card title="Bank & Cash Accounts">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Account</th><th style={th}>Group</th><th style={{ ...th, ...num }}>Balance</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (<tr key={i}><td style={td}>{r.ledger || r.name}</td><td style={{ ...td, color: C.dim }}>{r.group}</td><td style={{ ...td, ...num, fontWeight: 700, color: bal(r) < 0 ? C.red : C.dark }}>{money(cur, bal(r))}</td></tr>))}
            {!rows.length && <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>No cash/bank ledgers found.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── 4) Receivables & Payables ─────────────────────────────────────────────────
export function ReceivablesPayablesDash({ branch }) {
  const p = usePeriod('cfy'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const age = useAgeing(branch).data || {};
  const ar = age.receivables || { rows: [], totals: {} }, ap = age.payables || { rows: [], totals: {} };
  const buckets = (t) => ['d0', 'd30', 'd60', 'd90'].map((k, i) => [['0–30', '30–60', '60–90', '90+'][i], t?.[k] || 0]);
  const tbl = (title, data, tone) => (
    <Card title={title} right={<strong style={{ color: tone, fontSize: 13 }}>{money(cur, data.totals?.total || 0)}</strong>}>
      <div style={{ display: 'flex', gap: 8, padding: '8px 14px', flexWrap: 'wrap' }}>
        {buckets(data.totals).map(([l, v]) => <span key={l} style={{ fontSize: 11.5, color: C.dim }}>{l}: <b style={{ color: l === '90+' && v ? C.red : C.dark }}>{money(cur, v)}</b></span>)}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={th}>Party</th><th style={{ ...th, ...num }}>0–30</th><th style={{ ...th, ...num }}>30–60</th><th style={{ ...th, ...num }}>60–90</th><th style={{ ...th, ...num }}>90+</th><th style={{ ...th, ...num }}>Total</th></tr></thead>
        <tbody>
          {(data.rows || []).slice().sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, 12).map((r, i) => (
            <tr key={i}><td style={td}>{r.party}</td><td style={{ ...td, ...num }}>{money(cur, r.d0)}</td><td style={{ ...td, ...num }}>{money(cur, r.d30)}</td><td style={{ ...td, ...num }}>{money(cur, r.d60)}</td><td style={{ ...td, ...num, color: r.d90 ? C.red : undefined }}>{money(cur, r.d90)}</td><td style={{ ...td, ...num, fontWeight: 700 }}>{money(cur, r.total)}</td></tr>
          ))}
          {!(data.rows || []).length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>Nothing outstanding.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Receivables & Payables" sub={`Ageing as of today · top 12 each`} branch={branch} p={p} />
      {tbl('Receivables (from customers)', ar, C.green)}
      {tbl('Payables (to suppliers)', ap, C.red)}
    </div>
  );
}

// ── 5) Branch Performance ─────────────────────────────────────────────────────
export function BranchPerformanceDash() {
  const p = usePeriod('cfy'); const range = p.range;
  const q = useQueries({
    queries: BRANCHES.map((b) => ({
      queryKey: ['accounting', 'module-pl', b.code, range.from, range.to],
      queryFn: () => apiGet('/api/accounting/module-pl', { branch: b.code, from: range.from, to: range.to }),
    })),
  });
  const rows = BRANCHES.map((b, i) => {
    const d = q[i].data || {};
    return { code: b.code, cur: b.cur, sales: d?.totals?.sales || 0, cogs: d?.totals?.cogs || 0, gp: d?.totals?.gp || 0, net: d?.bridge?.netProfit ?? d?.totals?.gp ?? 0 };
  });
  const loading = q.some((x) => x.isLoading);
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Branch Performance" sub={`All branches compared · ${range.label} · native currency`} branch={'ALL'} p={p} />
      <Card title="Per-branch Sales · GP · Net Profit">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Branch</th><th style={{ ...th, ...num }}>Sales</th><th style={{ ...th, ...num }}>COGS</th><th style={{ ...th, ...num }}>Gross Profit</th><th style={{ ...th, ...num }}>GP %</th><th style={{ ...th, ...num }}>Net Profit</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>Loading branches…</td></tr>}
            {!loading && rows.map((r) => (
              <tr key={r.code}><td style={{ ...td, fontWeight: 700 }}>{r.code} <span style={{ color: C.dim, fontWeight: 400 }}>{r.cur}</span></td><td style={{ ...td, ...num }}>{money(r.cur, r.sales)}</td><td style={{ ...td, ...num }}>{money(r.cur, r.cogs)}</td><td style={{ ...td, ...num, fontWeight: 700, color: r.gp < 0 ? C.red : C.green }}>{money(r.cur, r.gp)}</td><td style={{ ...td, ...num }}>{pct(r.sales ? r.gp / r.sales * 100 : 0)}</td><td style={{ ...td, ...num, fontWeight: 700, color: r.net < 0 ? C.red : C.dark }}>{money(r.cur, r.net)}</td></tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '8px 14px', fontSize: 11, color: C.dim }}>Figures shown in each branch's native currency. A single FX-normalised company total is coming next (needs forex rates).</div>
      </Card>
    </div>
  );
}

// generic two-column "name + amount" list table
function ListTable({ title, rows, cur, right, valColor }) {
  return (
    <Card title={title} right={right}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}><td style={{ ...td, fontWeight: r.bold ? 700 : 400, paddingLeft: r.indent ? 28 : 12 }}>{r.name}</td><td style={{ ...td, ...num, fontWeight: r.bold ? 700 : 400, color: valColor ? valColor(r.amount) : C.dark }}>{money(cur, r.amount)}</td></tr>
          ))}
          {!rows.length && <tr><td colSpan={2} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>No data.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}
const miniBar = (label, val, base, col, cur) => (
  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
    <span style={{ width: 160, fontSize: 12, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    <div style={{ flex: 1, background: '#eef1f7', borderRadius: 5, height: 16, minWidth: 60 }}><div style={{ width: `${base ? Math.min(100, Math.abs(val) / base * 100) : 0}%`, background: col, height: '100%', borderRadius: 5 }} /></div>
    <span style={{ width: 120, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: val < 0 ? C.red : C.dark }}>{money(cur, val)}</span>
  </div>
);
const topBy = (rows, keyFn, valFn, n = 10) => {
  const m = {}; rows.forEach((r) => { const k = keyFn(r) || '—'; m[k] = (m[k] || 0) + (valFn(r) || 0); });
  return Object.entries(m).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, n);
};

// ── 6) Balance Sheet ──────────────────────────────────────────────────────────
export function BalanceSheetDash({ branch }) {
  const p = usePeriod('cfy'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const bs = useBalanceSheet(branch, { to: range.to }).data || {};
  const assets = bs.assets || [], liabs = bs.liabilities || [];
  const aT = assets.reduce((s, a) => s + (a.amount || 0), 0), lT = liabs.reduce((s, a) => s + (a.amount || 0), 0);
  const balanced = Math.abs(aT - lT) < 1;
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Balance Sheet" sub={`Financial position as of ${range.to}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Total Assets" value={money(cur, aT)} />
        <KPI label="Total Liabilities & Capital" value={money(cur, lT)} />
        <KPI label="Balanced" value={balanced ? '✓ Yes' : '✗ No'} tone={balanced ? 'good' : 'bad'} sub={balanced ? '' : money(cur, aT - lT) + ' diff'} />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 320px' }}><ListTable title="Liabilities & Capital" rows={[...liabs, { name: 'Total', amount: lT, bold: true }]} cur={cur} /></div>
        <div style={{ flex: '1 1 320px' }}><ListTable title="Assets" rows={[...assets, { name: 'Total', amount: aT, bold: true }]} cur={cur} /></div>
      </div>
    </div>
  );
}

// ── 7) Module / Product GP ────────────────────────────────────────────────────
export function ModuleGpDash({ branch }) {
  const p = usePeriod('cfy'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const mpl = useModulePL(branch, range).data || {};
  const mods = mpl.modules || [], t = mpl.totals || {};
  const maxGp = Math.max(1, ...mods.map((m) => Math.abs(m.gp || 0)));
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Module / Product GP" sub={`Gross profit by product · ${range.label}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Sales" value={money(cur, t.sales)} />
        <KPI label="COGS" value={money(cur, t.cogs)} />
        <KPI label="Gross Profit" value={money(cur, t.gp)} tone={(t.gp || 0) < 0 ? 'bad' : 'good'} sub={pct(t.gpPct || 0)} />
      </div>
      <Card title="GP by Module"><div style={{ padding: '10px 16px' }}>{mods.map((m) => miniBar(m.name || m.key, m.gp, maxGp, (m.gp || 0) < 0 ? C.red : C.green, cur))}{!mods.length && <div style={{ color: C.dim, fontSize: 12 }}>No data.</div>}</div></Card>
      <Card title="Detail">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Module</th><th style={{ ...th, ...num }}>Sales</th><th style={{ ...th, ...num }}>COGS</th><th style={{ ...th, ...num }}>GP</th><th style={{ ...th, ...num }}>GP %</th><th style={{ ...th, ...num }}>% of Sales</th></tr></thead>
          <tbody>
            {mods.map((m) => (<tr key={m.key}><td style={td}>{m.name || m.key}</td><td style={{ ...td, ...num }}>{money(cur, m.sales)}</td><td style={{ ...td, ...num }}>{money(cur, m.cogs)}</td><td style={{ ...td, ...num, fontWeight: 700, color: (m.gp || 0) < 0 ? C.red : C.green }}>{money(cur, m.gp)}</td><td style={{ ...td, ...num }}>{pct(m.gpPct)}</td><td style={{ ...td, ...num }}>{pct(m.pctOfSales)}</td></tr>))}
            {!mods.length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>No data.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── 8) Sales & Bookings ───────────────────────────────────────────────────────
export function SalesBookingsDash({ branch }) {
  const p = usePeriod('cfy'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const mpl = useModulePL(branch, range).data || {};
  const igp = useInvoiceGP(branch, range).data || {};
  const rows = igp.rows || [], deals = rows.length;
  const sales = mpl?.totals?.sales || 0;
  const topCust = topBy(rows, (r) => r.customer, (r) => r.sale, 10);
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Sales & Bookings" sub={`Sales, deals & top customers · ${range.label}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Total Sales" value={money(cur, sales)} />
        <KPI label="Deals / Bookings" value={String(deals)} />
        <KPI label="Avg Deal" value={money(cur, deals ? sales / deals : 0)} />
        <KPI label="Gross Profit" value={money(cur, mpl?.totals?.gp || 0)} tone="good" />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 320px' }}><ListTable title="Sales by Module" rows={(mpl.modules || []).map((m) => ({ name: m.name || m.key, amount: m.sales }))} cur={cur} /></div>
        <div style={{ flex: '1 1 320px' }}><ListTable title="Top 10 Customers (by sales)" rows={topCust} cur={cur} /></div>
      </div>
    </div>
  );
}

// ── 9) Supplier / Purchase ────────────────────────────────────────────────────
export function SupplierPurchaseDash({ branch }) {
  const p = usePeriod('cfy'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const mpl = useModulePL(branch, range).data || {};
  const igp = useInvoiceGP(branch, range).data || {};
  const age = useAgeing(branch).data || {};
  const rows = igp.rows || [];
  const topSup = topBy(rows, (r) => r.supplier, (r) => r.cost, 10);
  const payRows = (age.payables?.rows || []).slice(0, 10);
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Supplier / Purchase" sub={`Purchases & payables · ${range.label}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Total Purchases" value={money(cur, mpl?.totals?.cogs || 0)} />
        <KPI label="Payables Outstanding" value={money(cur, age.payables?.totals?.total || 0)} tone={(age.payables?.totals?.d90 || 0) ? 'bad' : undefined} sub={(age.payables?.totals?.d90 || 0) ? money(cur, age.payables.totals.d90) + ' overdue 90+' : ''} />
        <KPI label="Suppliers" value={String(topBy(rows, (r) => r.supplier, () => 1, 9999).filter((s) => s.name !== '—').length)} />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 320px' }}><ListTable title="Top 10 Suppliers (by purchase)" rows={topSup} cur={cur} /></div>
        <div style={{ flex: '1 1 320px' }}><ListTable title="Top Payables (outstanding)" rows={payRows.map((r) => ({ name: r.party, amount: r.total }))} cur={cur} valColor={(v) => v < 0 ? C.green : C.red} /></div>
      </div>
    </div>
  );
}

// ── 10) Tax & Compliance ──────────────────────────────────────────────────────
export function TaxComplianceDash({ branch }) {
  const p = usePeriod('cfy'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const tax = useTaxSummary(branch, range).data || {};
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Tax & Compliance" sub={`GST / VAT position · ${range.label}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Output Tax" value={money(cur, tax.output?.total || 0)} />
        <KPI label="Input Tax (ITC)" value={money(cur, tax.input?.total || 0)} />
        <KPI label="Net Payable" value={money(cur, tax.netPayable || 0)} tone={(tax.netPayable || 0) > 0 ? 'bad' : 'good'} sub={(tax.netPayable || 0) >= 0 ? 'payable' : 'refundable'} />
        <KPI label="TCS Payable" value={money(cur, tax.tcs?.payable || 0)} />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 320px' }}><ListTable title="Output Tax (on sales)" rows={(tax.output?.lines || []).map((l) => ({ name: l.ledger, amount: l.amount }))} cur={cur} right={<strong style={{ color: C.dark }}>{money(cur, tax.output?.total || 0)}</strong>} /></div>
        <div style={{ flex: '1 1 320px' }}><ListTable title="Input Tax (on purchases)" rows={(tax.input?.lines || []).map((l) => ({ name: l.ledger, amount: l.amount }))} cur={cur} right={<strong style={{ color: C.dark }}>{money(cur, tax.input?.total || 0)}</strong>} /></div>
      </div>
    </div>
  );
}

// ── 11) Expenses ──────────────────────────────────────────────────────────────
export function ExpensesDash({ branch }) {
  const p = usePeriod('cfy'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const pl = useProfitAndLoss(branch, range).data || {};
  const total = pl?.indirect?.debitTotal || 0;
  // flatten expense heads from the indirect-expense group buckets
  const heads = [];
  (pl?.indirect?.debit || []).forEach((g) => (g.items || []).forEach((it) => heads.push({ name: it.name, amount: it.amount })));
  if (!heads.length) (pl?.indirect?.debit || []).forEach((g) => heads.push({ name: g.name, amount: g.amount }));
  heads.sort((a, b) => (b.amount || 0) - (a.amount || 0));
  const maxv = Math.max(1, ...heads.map((h) => Math.abs(h.amount || 0)));
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Expenses" sub={`Indirect expenses by head · ${range.label}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Total Indirect Expense" value={money(cur, total)} />
        <KPI label="Expense Heads" value={String(heads.length)} />
        <KPI label="Largest Head" value={heads[0] ? money(cur, heads[0].amount) : '—'} sub={heads[0]?.name || ''} />
      </div>
      <Card title="Expenses by Head"><div style={{ padding: '10px 16px' }}>{heads.map((h) => miniBar(h.name, h.amount, maxv, '#c98', cur))}{!heads.length && <div style={{ color: C.dim, fontSize: 12 }}>No expenses for this period.</div>}</div></Card>
    </div>
  );
}

// ── 12) Approvals & Audit ─────────────────────────────────────────────────────
export function ApprovalsAuditDash({ branch }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const p = usePeriod('all');
  const va = useVoucherApprovals(branch, 'pending').data || {};
  const counts = va.counts || {};
  const brCode = branch === 'ALL' || !branch ? '' : (branch.code || branch);
  const bq = useQuery({ queryKey: ['booking-orders', brCode || 'all'], queryFn: () => apiGet('/api/booking-orders', { branch: brCode }) });
  const bookings = bq.data || [];
  const bCount = (s) => bookings.filter((b) => (s === 'approved' ? (b.status === 'approved' || b.status === 'posted') : b.status === s)).length;
  const entries = (va.entries || []).slice(0, 15);
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Approvals & Audit" sub="Control queue — vouchers + SO/PO/GP bookings" branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Vouchers Pending" value={String(counts.pending?.n || 0)} sub={money(cur, counts.pending?.amount || 0)} tone={(counts.pending?.n || 0) ? 'bad' : 'good'} />
        <KPI label="Bookings Pending" value={String(bCount('pending'))} tone={bCount('pending') ? 'bad' : 'good'} />
        <KPI label="Approved" value={String((counts.approved?.n || 0) + bCount('approved'))} tone="good" />
        <KPI label="Rejected" value={String((counts.rejected?.n || 0) + bCount('rejected'))} />
        <KPI label="Deleted" value={String((counts.deleted?.n || 0) + bCount('deleted'))} />
      </div>
      <Card title="Pending Vouchers (awaiting your sign-off)">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Vch No</th><th style={th}>Type</th><th style={th}>Party</th><th style={{ ...th, ...num }}>Amount</th></tr></thead>
          <tbody>
            {entries.map((e, i) => (<tr key={i}><td style={{ ...td, fontFamily: 'monospace' }}>{e.vno}</td><td style={td}>{e.category || e.type}</td><td style={td}>{e.party || '—'}</td><td style={{ ...td, ...num }}>{money(cur, e.total)}</td></tr>))}
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
const stLabel = (s) => ({ met: '✓ Met', warn: '⚠ Near', short: '✗ Short', over: '🔴 Over', ok: '🟢 OK', 'no-target': '— No target' }[s] || s);

// ── 13/14/15) Sales / GP / Collections vs Target ──────────────────────────────
export function VsTargetDash({ branch, metric = 'sales' }) {
  const p = usePeriod('cfy'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const d = useTargetsVsActual(branch, metric, { ...range, fy: fyStr() }).data || {};
  const t = d.totals || {}, rows = d.rows || [];
  const title = { sales: 'Sales vs Target', gp: 'GP vs Target', collections: 'Collections vs Target' }[metric];
  const ach = t.target ? Math.round((t.actual / t.target) * 100) : 0;
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title={title} sub={`Achievement vs target · ${range.label}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Target" value={money(cur, t.target)} />
        <KPI label="Actual" value={money(cur, t.actual)} tone={(t.actual || 0) >= (t.target || 0) ? 'good' : undefined} />
        <KPI label="Variance" value={money(cur, t.variance)} tone={(t.variance || 0) >= 0 ? 'good' : 'bad'} />
        <KPI label="Achievement" value={ach + '%'} tone={ach >= 100 ? 'good' : ach >= 90 ? undefined : 'bad'} sub={stLabel(t.status)} />
      </div>
      <Card title="Achievement"><div style={{ padding: '14px 16px' }}>{gauge(ach, ach >= 100 ? C.green : ach >= 90 ? C.amber : C.red)}{!t.target && <div style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>No target set. Set one in <b>Finance ▸ Sales Targets</b>.</div>}</div></Card>
      {metric !== 'collections' && (
        <Card title="By Module">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Module</th><th style={{ ...th, ...num }}>Target</th><th style={{ ...th, ...num }}>Actual</th><th style={{ ...th, ...num }}>Variance</th><th style={{ ...th, ...num }}>Ach %</th><th style={th}>Status</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (<tr key={i}><td style={td}>{r.name}</td><td style={{ ...td, ...num }}>{money(cur, r.target)}</td><td style={{ ...td, ...num }}>{money(cur, r.actual)}</td><td style={{ ...td, ...num, color: r.variance < 0 ? C.red : C.green }}>{money(cur, r.variance)}</td><td style={{ ...td, ...num }}>{pct(r.pct)}</td><td style={{ ...td, color: stTone(r.status), fontWeight: 700 }}>{stLabel(r.status)}</td></tr>))}
              {!rows.length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>No module-level targets/actuals.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ── 16) Budget vs Expense ─────────────────────────────────────────────────────
export function BudgetVsExpenseDash({ branch }) {
  const p = usePeriod('cfy'); const range = p.range;
  const cur = (bc(branch) || {}).cur || '₹';
  const d = useBudgetVsActual(branch, { ...range, fy: fyStr() }).data || {};
  const t = d.totals || {}, rows = d.rows || [];
  const over = rows.filter((r) => r.status === 'over').length;
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Budget vs Expense" sub={`Indirect expense budget vs actual · ${d.months || ''} mo · ${range.label}`} branch={branch} p={p} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="Budget (to date)" value={money(cur, t.budget)} />
        <KPI label="Actual Spend" value={money(cur, t.actual)} />
        <KPI label="Variance" value={money(cur, t.variance)} tone={(t.variance || 0) >= 0 ? 'good' : 'bad'} sub={(t.variance || 0) >= 0 ? 'under budget' : 'over budget'} />
        <KPI label="Heads Over Budget" value={String(over)} tone={over ? 'bad' : 'good'} />
      </div>
      <Card title="By Expense Head">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Head</th><th style={th}>Group</th><th style={{ ...th, ...num }}>Budget</th><th style={{ ...th, ...num }}>Actual</th><th style={{ ...th, ...num }}>Variance</th><th style={{ ...th, ...num }}>Used %</th><th style={th}>Status</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (<tr key={i}><td style={td}>{r.name}</td><td style={{ ...td, color: C.dim }}>{r.group}</td><td style={{ ...td, ...num }}>{money(cur, r.budget)}</td><td style={{ ...td, ...num }}>{money(cur, r.actual)}</td><td style={{ ...td, ...num, color: r.variance < 0 ? C.red : C.green }}>{money(cur, r.variance)}</td><td style={{ ...td, ...num }}>{pct(r.pct)}</td><td style={{ ...td, color: stTone(r.status), fontWeight: 700 }}>{stLabel(r.status)}</td></tr>))}
            {!rows.length && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.dim, padding: 18 }}>No budgets set. Add them in <b>Finance ▸ Expense Budget</b>.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Targets master (set targets that the vs-Target dashboards compare to) ──────
export function TargetsMaster({ branch }) {
  const [brCode, setBrCode] = useState((branch && branch.code) || 'BOM');
  const [fy, setFy] = useState(fyStr());
  const [metric, setMetric] = useState('sales');
  const [draft, setDraft] = useState({});
  const cur = '₹';
  const q = useSalesTargets({ code: brCode }, fy, metric);
  const save = useSaveTargets();
  const existing = {}; (q.data || []).forEach((t) => { if ((t.month || 0) === 0) existing[t.module || ''] = t.amount; });
  const valOf = (mod) => (draft[mod] !== undefined ? draft[mod] : (existing[mod] ?? ''));
  const onSave = () => {
    const rows = MOD_OPTS.map(([mod]) => ({ month: 0, metric, module: mod, amount: Number(valOf(mod)) || 0 }));
    save.mutate({ branch: brCode, fy, rows }, { onSuccess: () => setDraft({}) });
  };
  const sel = { padding: '7px 10px', fontSize: 13, fontWeight: 700, border: `1px solid ${C.border}`, borderRadius: 6, background: '#fff', color: C.dark };
  return (
    <div style={{ margin: 12, maxWidth: 720 }}>
      <FocusBanner />
      <div style={{ fontSize: 18, fontWeight: 800, color: C.dark }}>Sales Targets</div>
      <div style={{ fontSize: 12, color: C.dim, marginBottom: 12 }}>Set whole-FY targets per module. The Director "vs Target" dashboards pro-rate these to the period and compare against actuals.</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <select value={brCode} onChange={(e) => setBrCode(e.target.value)} style={sel}>{BRANCHES.map((b) => <option key={b.code} value={b.code}>{b.code}</option>)}</select>
        <input value={fy} onChange={(e) => setFy(e.target.value)} placeholder="FY e.g. 2026-27" style={{ ...sel, fontWeight: 400, width: 120 }} />
        <select value={metric} onChange={(e) => setMetric(e.target.value)} style={sel}><option value="sales">Sales</option><option value="gp">Gross Profit</option><option value="collections">Collections</option></select>
      </div>
      <Card title={`${metric === 'sales' ? 'Sales' : metric === 'gp' ? 'GP' : 'Collections'} target · ${brCode} · FY ${fy}`} right={<button onClick={onSave} disabled={save.isPending} style={{ padding: '6px 14px', background: C.dark, color: C.gold, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{save.isPending ? 'Saving…' : 'Save'}</button>}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Module</th><th style={{ ...th, ...num }}>Annual Target ({cur})</th></tr></thead>
          <tbody>
            {MOD_OPTS.map(([mod, label]) => (
              <tr key={mod || 'all'}><td style={{ ...td, fontWeight: mod === '' ? 700 : 400 }}>{label}{mod === '' ? ' (company)' : ''}</td>
                <td style={{ ...td, ...num }}><input type="number" value={valOf(mod)} onChange={(e) => setDraft((d) => ({ ...d, [mod]: e.target.value }))} style={{ width: 160, padding: '5px 8px', textAlign: 'right', border: `1px solid ${C.border}`, borderRadius: 5 }} /></td></tr>
            ))}
          </tbody>
        </table>
      </Card>
      {save.isSuccess && <div style={{ color: C.green, fontSize: 12, marginTop: 8 }}>✓ Saved.</div>}
      {metric === 'collections' && <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>Collections targets are company-wide — only the "All modules" row is used.</div>}
    </div>
  );
}

// Router for the Director dropdown routes.
export function DirectorDash({ which, branch }) {
  if (which === 'profitability') return <ProfitabilityDash branch={branch} />;
  if (which === 'cash') return <CashLiquidityDash branch={branch} />;
  if (which === 'arap') return <ReceivablesPayablesDash branch={branch} />;
  if (which === 'branch') return <BranchPerformanceDash />;
  if (which === 'balance-sheet') return <BalanceSheetDash branch={branch} />;
  if (which === 'module-gp') return <ModuleGpDash branch={branch} />;
  if (which === 'sales') return <SalesBookingsDash branch={branch} />;
  if (which === 'supplier') return <SupplierPurchaseDash branch={branch} />;
  if (which === 'tax') return <TaxComplianceDash branch={branch} />;
  if (which === 'expenses') return <ExpensesDash branch={branch} />;
  if (which === 'audit') return <ApprovalsAuditDash branch={branch} />;
  if (which === 'sales-target') return <VsTargetDash branch={branch} metric="sales" />;
  if (which === 'gp-target') return <VsTargetDash branch={branch} metric="gp" />;
  if (which === 'collections-target') return <VsTargetDash branch={branch} metric="collections" />;
  if (which === 'budget-expense') return <BudgetVsExpenseDash branch={branch} />;
  return <ExecutiveOverview branch={branch} />;
}
