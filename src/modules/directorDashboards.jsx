// ─── Director Dashboards (Director + Super Admin only) ────────────────────────
// Phase 1: a "Dashboards" suite giving the owner a whole-company view. Each reuses
// the existing report endpoints (no new accounting logic). Shared toolbar gives
// period presets; the Executive Overview adds an alert feed + KPI trend arrows.
import React, { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../core/api';
import { bc } from '../core/styles';
import {
  useProfitAndLoss, useModulePL, useBalanceSheet, useAgeing,
  useTaxSummary, useTrialBalance, useVoucherApprovals, useYearOverYear,
} from '../core/useAccounting';

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

// Indian FY (Apr–Mar) aware period presets.
function periodRange(preset, now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth(); // 0-based
  const today = iso(now);
  const fyStartYear = m >= 3 ? y : y - 1;           // FY starts in April
  const qStartMonth = [3, 3, 3, 6, 6, 6, 9, 9, 9, 0, 0, 0][m]; // Apr/Jul/Oct/Jan
  const qStartYear = (m <= 2) ? y : y;             // Jan-Mar quarter belongs to same cal year
  switch (preset) {
    case 'today': return { from: today, to: today, label: 'Today' };
    case 'week': { const d = new Date(now); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return { from: iso(d), to: today, label: 'This Week' }; }
    case 'mtd': return { from: `${y}-${pad2(m + 1)}-01`, to: today, label: 'MTD' };
    case 'qtd': return { from: `${m <= 2 ? y : qStartYear}-${pad2(qStartMonth + 1)}-01`, to: today, label: 'QTD' };
    case 'fy': default: return { from: `${fyStartYear}-04-01`, to: today, label: `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}` };
  }
}

// ── shared UI bits ──────────────────────────────────────────────────────────────
function Toolbar({ title, sub, period, setPeriod, custom, setCustom, branch }) {
  const presets = [['today', 'Today'], ['week', 'Week'], ['mtd', 'MTD'], ['qtd', 'QTD'], ['fy', 'FY']];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.dark }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: C.dim }}>{sub}</div>}
      </div>
      <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 3 }}>
        {presets.map(([k, l]) => (
          <button key={k} onClick={() => { setPeriod(k); setCustom(null); }} style={{ padding: '5px 11px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', background: (period === k && !custom) ? C.dark : 'transparent', color: (period === k && !custom) ? C.gold : C.dim }}>{l}</button>
        ))}
      </div>
      <input type="date" value={custom?.from || ''} onChange={(e) => setCustom((c) => ({ from: e.target.value, to: c?.to || e.target.value }))} style={inpD} />
      <span style={{ color: C.dim }}>→</span>
      <input type="date" value={custom?.to || ''} onChange={(e) => setCustom((c) => ({ from: c?.from || e.target.value, to: e.target.value }))} style={inpD} />
      <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, background: '#E6F1FB', padding: '4px 9px', borderRadius: 5 }}>{branch === 'ALL' || !branch ? 'All branches' : (branch.code || branch)}</span>
    </div>
  );
}
const inpD = { padding: '5px 8px', fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6 };

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

// usePeriod — toolbar state → {from,to}
function usePeriod(def = 'mtd') {
  const [period, setPeriod] = useState(def);
  const [custom, setCustom] = useState(null);
  const range = useMemo(() => (custom?.from && custom?.to ? { ...custom, label: 'Custom' } : periodRange(period)), [period, custom]);
  return { period, setPeriod, custom, setCustom, range };
}

// ── 1) Executive Overview ─────────────────────────────────────────────────────
export function ExecutiveOverview({ branch }) {
  const { range, ...tb } = usePeriod('mtd');
  const cur = (bc(branch) || {}).cur || '₹';
  const pl = useProfitAndLoss(branch, range).data || {};
  const mpl = useModulePL(branch, range).data || {};
  const bs = useBalanceSheet(branch, { to: range.to }).data || {};
  const age = useAgeing(branch).data || {};
  const tax = useTaxSummary(branch, range).data || {};
  const trial = useTrialBalance(branch, range).data || {};
  const appr = useVoucherApprovals(branch, 'pending').data || {};
  const yoy = useYearOverYear(branch, range).data || {};

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
  if (!alerts.length) alerts.push(['good', 'No exceptions — books look healthy for this period.']);

  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Executive Overview" sub={`Whole-company snapshot · ${range.label}`} period={tb.period} setPeriod={tb.setPeriod} custom={tb.custom} setCustom={tb.setCustom} branch={branch} />
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
  const { range, ...tb } = usePeriod('fy');
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
      <Toolbar title="Profitability (P&L)" sub={`Revenue → Net Profit · ${range.label}`} period={tb.period} setPeriod={tb.setPeriod} custom={tb.custom} setCustom={tb.setCustom} branch={branch} />
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
  const { range, ...tb } = usePeriod('mtd');
  const cur = (bc(branch) || {}).cur || '₹';
  const trial = useTrialBalance(branch, range).data || {};
  const rows = (trial.rows || []).filter((r) => /cash|bank/i.test(r.group || ''));
  const bal = (r) => (r.closingDebit || 0) - (r.closingCredit || 0); // closing balance (Dr +ve)
  const cash = rows.filter((r) => /cash/i.test(r.group)).reduce((s, r) => s + bal(r), 0);
  const bankRows = rows.filter((r) => /bank/i.test(r.group));
  const bank = bankRows.reduce((s, r) => s + bal(r), 0);
  return (
    <div style={{ margin: 12 }}>
      <Toolbar title="Cash & Liquidity" sub={`Cash + bank position · ${range.label}`} period={tb.period} setPeriod={tb.setPeriod} custom={tb.custom} setCustom={tb.setCustom} branch={branch} />
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
  const { range, ...tb } = usePeriod('fy');
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
      <Toolbar title="Receivables & Payables" sub={`Ageing as of today · top 12 each`} period={tb.period} setPeriod={tb.setPeriod} custom={tb.custom} setCustom={tb.setCustom} branch={branch} />
      {tbl('Receivables (from customers)', ar, C.green)}
      {tbl('Payables (to suppliers)', ap, C.red)}
    </div>
  );
}

// ── 5) Branch Performance ─────────────────────────────────────────────────────
export function BranchPerformanceDash() {
  const { range, ...tb } = usePeriod('fy');
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
      <Toolbar title="Branch Performance" sub={`All branches compared · ${range.label} · native currency`} period={tb.period} setPeriod={tb.setPeriod} custom={tb.custom} setCustom={tb.setCustom} branch={'ALL'} />
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

// Router for the Director dropdown routes.
export function DirectorDash({ which, branch }) {
  if (which === 'profitability') return <ProfitabilityDash branch={branch} />;
  if (which === 'cash') return <CashLiquidityDash branch={branch} />;
  if (which === 'arap') return <ReceivablesPayablesDash branch={branch} />;
  if (which === 'branch') return <BranchPerformanceDash />;
  return <ExecutiveOverview branch={branch} />;
}
