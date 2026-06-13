/* ════════════════════════════════════════════════════════════════════
   SALES & GP ANALYTICS  ·  /reports/sales-gp-analytics
   ────────────────────────────────────────────────────────────────────
   Management dashboard for Revenue · Cost · Gross Profit · GP% across the
   five business segments — B2C Meta · B2C Ref · B2B · B2E · Inter-Branch.

   Everything is sourced from the LIVE double-entry books (no demo data):
     · GET /api/vouchers?category=sale      → revenue + segment (partyGroup)
     · GET /api/vouchers?category=purchase  → cost (paired to sales by Link No)
     · GET /api/accounting/invoice-gp       → reconciliation cross-check
     · GET /api/accounting/profit-and-loss  → GP reconciliation vs P&L
     · GET /api/accounting/trial-balance    → inter-branch receivable/payable
     · GET /api/accounting/ledger?name=     → ledger drill-down (on demand)

   GP = Revenue − Cost.  GP% = GP ÷ Revenue × 100.  Cost is matched to a sale
   by shared Link No (same pairing the backend invoice-GP engine uses), so the
   totals reconcile with the Invoice-wise GP report and the P&L gross profit.
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from 'react';
import {
  useSalesRegister, usePurchaseRegister, useInvoiceGP, useProfitAndLoss,
  useTrialBalance, useLedgerStatement,
} from '../core/useAccounting';
import { useLedgerRegistry } from '../core/useReference';
import { PeriodBar } from '../core/period';
import { BRANCHES } from '../core/data';
import { fmtINR } from '../core/format';
import { openLedgerModal } from '../core/LedgerModalHost';
import { CUR_FY, CUR_QUARTER, CUR_MONTH, ALL_TIME_FROM, todayISO, fmtDate, monthLabel, fyQuarterOf } from '../core/dates';
import { cardStyle } from '../core/helpers';
import { RPT_thStyle, RPT_tdStyle } from '../core/styles';
import { exportToExcel } from '../core/exportExcel';
import { exportToCSV } from '../core/business-logic';
import { VoucherEditor } from './accountingLive';
import { isInterBranch, brName } from './interbranch';

/* ── service (product) from voucher type ── */
const PRODUCT = {
  SF: 'Flight', PF: 'Flight', SHT: 'Hotel', PHT: 'Hotel', SH: 'Holiday', PH: 'Holiday',
  SV: 'Visa', PV: 'Visa', SI: 'Insurance', PI: 'Insurance', SC: 'Car', PC: 'Car', SM: 'Misc', PM: 'Misc',
};
const serviceOf = (v) => PRODUCT[v.type] || v.type || 'Other';

/* ── the five segments (+ a transparent catch-all so nothing is hidden) ── */
const CATS = ['B2C Meta', 'B2C Ref', 'B2B', 'B2E', 'Inter Branch'];
const CAT_CLR = {
  'B2C Meta': '#185FA5', 'B2C Ref': '#1D9E75', 'B2B': '#854F0B', 'B2E': '#6B4C8B',
  'Inter Branch': '#A32D2D', 'Unclassified': '#5a6691', 'Direct Cost': '#5a6691',
};
function categoryOf(v) {
  const hay = `${v.partyGroup || ''} ${v.party || ''}`;
  if (isInterBranch(hay)) return 'Inter Branch';
  const low = hay.toLowerCase();
  if (/meta/.test(low)) return 'B2C Meta';
  if (/b2e/.test(low)) return 'B2E';
  if (/b2b/.test(low)) return 'B2B';
  if (/b2c|referr?al|\bref\b/.test(low)) return 'B2C Ref';
  return 'Unclassified';
}

/* ── date helpers (vouchers may carry ISO or DD-MM-YYYY) ── */
function toDate(s) {
  if (!s) return null;
  let m = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = String(s).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (m) { let y = +m[3]; if (y < 100) y += 2000; return new Date(y, +m[2] - 1, +m[1]); }
  const d = new Date(s); return isNaN(d.getTime()) ? null : d;
}
function inRange(v, from, to) {
  const d = toDate(v); if (!d) return true;          // never silently drop
  if (from) { const f = toDate(from); if (f && d < f) return false; }
  if (to)   { const t = toDate(to);   if (t && d > t) return false; }
  return true;
}
const monthKeyOf = (s) => { const d = toDate(s); return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : '—'; };

const money = (n) => fmtINR(n || 0);
const pct = (gp, sale) => (sale ? (gp / sale) * 100 : 0);
const pctStr = (gp, sale) => `${pct(gp, sale).toFixed(1)}%`;
const gpColor = (p) => (p >= 25 ? '#1D9E75' : p >= 12 ? '#854F0B' : '#A32D2D');

/* ── tiny UI atoms ── */
const tBtn = (active) => ({ padding: '6px 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${active ? '#0d1326' : '#e1e3ec'}`, background: active ? '#0d1326' : '#fff', color: active ? '#d4a437' : '#5a6691', whiteSpace: 'nowrap' });
const xBtn = { padding: '7px 12px', background: '#fff', border: '1px solid #e1e3ec', borderRadius: 6, fontSize: 11.5, cursor: 'pointer', fontWeight: 600, color: '#5a6691' };
const Th = ({ children, right }) => <th style={{ ...RPT_thStyle, textAlign: right ? 'right' : 'left' }}>{children}</th>;
const linkCell = { color: '#185FA5', cursor: 'pointer', fontWeight: 600 };

/* ══════════════════════════════════════════════════════════════════════
   MAIN
   ════════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'category', label: 'Category-wise' },
  { id: 'client', label: 'Client-wise' },
  { id: 'supplier', label: 'Supplier-wise' },
  { id: 'consultant', label: 'Consultant-wise' },
  { id: 'branch', label: 'Branch-wise' },
  { id: 'service', label: 'Service-wise' },
  { id: 'monthly', label: 'Monthly Trend' },
  { id: 'quarterly', label: 'Quarterly Trend' },
  { id: 'topCustomers', label: 'Top Customers' },
  { id: 'topSuppliers', label: 'Top Suppliers' },
  { id: 'topProfit', label: 'Top Profit Accounts' },
  { id: 'interbranch', label: 'Inter Branch' },
];

export function SalesGpAnalytics({ branch }) {
  const [preset, setPreset] = useState('all');
  const [from, setFrom] = useState(ALL_TIME_FROM);     // default: inception → today (data may sit in a prior FY)
  const [to, setTo]     = useState(todayISO());
  const [tab, setTab]   = useState('category');
  const [view, setView] = useState('summary');          // summary | detailed
  const [drill, setDrill] = useState(null);             // { dim, key, label } → invoice list
  const [voucher, setVoucher] = useState(null);         // { id }

  const applyPreset = (id) => {
    setPreset(id);
    const r = {
      all:     { from: '', to: '' },
      today:   { from: todayISO(), to: todayISO() },
      month:   { from: `${CUR_MONTH}-01`, to: todayISO() },
      quarter: { from: CUR_QUARTER.startISO, to: CUR_QUARTER.endISO },
      ytd:     { from: CUR_FY.startISO, to: todayISO() },
      fy:      { from: CUR_FY.startISO, to: CUR_FY.endISO },
    }[id];
    if (r) { setFrom(r.from); setTo(r.to); }
  };

  /* live data */
  const salesQ = useSalesRegister(branch);
  const purchQ = usePurchaseRegister(branch);
  const gpQ    = useInvoiceGP(branch, { from, to });
  const pnlQ   = useProfitAndLoss(branch, { from, to });
  const sales = salesQ.data || [];
  const purch = purchQ.data || [];
  const loading = salesQ.isLoading || purchQ.isLoading;

  /* ── build invoices: pair sale↔purchase by Link No (else per-voucher) ── */
  const model = useMemo(() => {
    const live = (v) => v.status !== 'cancelled' && inRange(v.date, from, to);
    const salesF = sales.filter(live);
    const purchF = purch.filter(live);

    const groups = new Map();
    const ensure = (k) => {
      if (!groups.has(k)) groups.set(k, { key: k, ref: '', linkNo: '', customer: '', supplier: '', consultant: '', branch: '', service: '', status: '', category: '', date: '', sale: 0, cost: 0, saleV: [], purchV: [] });
      return groups.get(k);
    };
    salesF.forEach((v) => {
      const k = (v.linkNo || '').trim() || `S:${v.id || v.vno}`;
      const g = ensure(k);
      g.sale += v.subtotal || 0;
      if (!g.customer) g.customer = v.party || '—';
      if (!g.consultant) g.consultant = v.consultant || '—';
      if (!g.branch) g.branch = v.branch || '—';
      if (!g.service) g.service = serviceOf(v);
      if (!g.category) g.category = categoryOf(v);
      if (!g.ref) g.ref = v.linkNo || v.vno;
      if (!g.status) g.status = v.status || 'saved';
      if (!g.date || (v.date && v.date < g.date)) g.date = v.date;
      g.linkNo = v.linkNo || g.linkNo;
      g.saleV.push({ id: v.id, vno: v.vno, party: v.party, amt: v.subtotal, type: v.type });
    });
    purchF.forEach((v) => {
      const k = (v.linkNo || '').trim();
      const g = k && groups.has(k) ? groups.get(k) : ensure(`P:${v.id || v.vno}`);
      g.cost += v.subtotal || 0;
      if (!g.supplier) g.supplier = v.party || '—';
      if (!g.branch) g.branch = v.branch || '—';
      if (!g.service) g.service = serviceOf(v);
      if (!g.date) g.date = v.date;
      if (!g.ref) g.ref = v.linkNo || v.vno;
      g.purchV.push({ id: v.id, vno: v.vno, party: v.party, amt: v.subtotal, type: v.type });
    });

    const invoices = [...groups.values()].map((g) => {
      const category = g.category || (g.sale > 0 ? 'Unclassified' : 'Direct Cost');
      return { ...g, category, gp: g.sale - g.cost, gpPct: pct(g.sale - g.cost, g.sale) };
    });

    const totals = invoices.reduce((a, x) => ({ sale: a.sale + x.sale, cost: a.cost + x.cost }), { sale: 0, cost: 0 });
    return { invoices, totals: { ...totals, gp: totals.sale - totals.cost } };
  }, [sales, purch, from, to]);

  const { invoices, totals } = model;
  const hasData = invoices.length > 0;

  /* ── per-category KPI summary ── */
  const catSummary = useMemo(() => {
    const present = [...CATS];
    const extra = [...new Set(invoices.map((i) => i.category))].filter((c) => !present.includes(c));
    return [...present, ...extra].map((cat) => {
      const rows = invoices.filter((i) => i.category === cat);
      const sale = rows.reduce((s, r) => s + r.sale, 0);
      const cost = rows.reduce((s, r) => s + r.cost, 0);
      const custs = new Set(rows.filter((r) => r.sale > 0).map((r) => r.customer)).size;
      const txns = rows.filter((r) => r.sale > 0).length;
      return { cat, sale, cost, gp: sale - cost, gpPct: pct(sale - cost, sale), txns, customers: custs, avg: txns ? sale / txns : 0 };
    }).filter((c) => CATS.includes(c.cat) || c.sale || c.cost);
  }, [invoices]);

  /* ── reconciliation ── */
  const gpRows = gpQ.data?.rows || [];
  const recon = {
    gpRevenue: gpRows.reduce((s, r) => s + (r.sale || 0), 0),
    gpCost: gpRows.reduce((s, r) => s + (r.cost || 0), 0),
    pnlGross: pnlQ.data?.grossProfit,
  };
  const revOk = !gpRows.length || Math.abs(recon.gpRevenue - totals.sale) < 1;
  const costOk = !gpRows.length || Math.abs(recon.gpCost - totals.cost) < 1;

  /* ── exports ── */
  const exportCols = [
    { key: 'category', label: 'Category' }, { key: 'customer', label: 'Customer' }, { key: 'ref', label: 'Invoice/Booking' },
    { key: 'service', label: 'Service' }, { key: 'sale', label: 'Sales' }, { key: 'cost', label: 'Cost' },
    { key: 'gp', label: 'Gross Profit' }, { key: 'gpPctR', label: 'GP %' }, { key: 'consultant', label: 'Consultant' },
    { key: 'branch', label: 'Branch' }, { key: 'supplier', label: 'Supplier' }, { key: 'status', label: 'Status' },
  ];
  const exportRows = invoices.map((i) => ({ ...i, gpPctR: i.gpPct.toFixed(1) }));
  const fname = `sales-gp-analytics_${from || 'all'}_to_${to || 'today'}`;
  const doExcel = () => exportToExcel(fname, exportCols, exportRows);
  const doCsv = () => exportToCSV(exportRows, exportCols.map((c) => c.key), `${fname}.csv`);

  /* ── voucher drill overlay ── */
  if (voucher) {
    return (
      <div style={{ padding: 18, maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontSize: 12, color: '#5a6691', marginBottom: 8 }}>
          <button onClick={() => setVoucher(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#185FA5', fontWeight: 600, padding: 0 }}>Sales &amp; GP Analytics</button>
          <span style={{ color: '#b9bed4' }}> ▸ </span><span style={{ color: '#0d1326', fontWeight: 700 }}>Voucher</span>
        </div>
        <div style={cardStyle}><VoucherEditor voucherId={voucher.id} cur="₹" onBack={() => setVoucher(null)} /></div>
      </div>
    );
  }

  return (
    <div style={{ padding: 18, maxWidth: 1500, margin: '0 auto' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e1e3ec' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: '#0d1326', fontWeight: 700 }}>Sales &amp; GP Analytics</h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#5a6691' }}>Revenue · Cost · Gross Profit · GP% across B2C Meta · B2C Ref · B2B · B2E · Inter-Branch — live from the books</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => window.print()} style={xBtn}>📄 PDF</button>
          <button onClick={() => window.print()} style={xBtn}>🖨 Print</button>
          <button onClick={doExcel} style={xBtn}>📊 Excel</button>
          <button onClick={doCsv} style={xBtn}>📋 CSV</button>
        </div>
      </div>

      {/* time filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <PeriodBar branch={branch} defaultPreset="all" onChange={(r) => { setFrom(r.from); setTo(r.to); }} />
        <span style={{ width: 1, height: 22, background: '#e1e3ec' }} />
        <button onClick={() => setView('summary')} style={tBtn(view === 'summary')}>Summary</button>
        <button onClick={() => setView('detailed')} style={tBtn(view === 'detailed')}>Detailed</button>
      </div>

      {/* reconciliation banner */}
      {hasData && (
        <div style={{ ...cardStyle, marginBottom: 12, borderLeft: `4px solid ${revOk && costOk ? '#1D9E75' : '#854F0B'}`, background: revOk && costOk ? '#f4faf0' : '#fffaf0' }}>
          <p style={{ margin: 0, fontSize: 11.5, color: '#384677', lineHeight: 1.6 }}>
            <b>Reconciliation</b> · Revenue {money(totals.sale)} {revOk ? '✔' : `⚠ vs Invoice-GP ${money(recon.gpRevenue)}`} ·
            Cost {money(totals.cost)} {costOk ? '✔' : `⚠ vs Invoice-GP ${money(recon.gpCost)}`} ·
            Gross Profit {money(totals.gp)}{recon.pnlGross != null ? ` · P&L GP ${money(recon.pnlGross)}` : ''}
            {recon.pnlGross != null && Math.abs(recon.pnlGross - totals.gp) > 1 ? ' ⚠ (P&L GP includes supplier incentives & direct expenses)' : ''}
          </p>
        </div>
      )}

      {/* category KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginBottom: 14 }}>
        {catSummary.map((c) => {
          const clr = CAT_CLR[c.cat] || '#5a6691';
          return (
            <div key={c.cat} onClick={() => { setTab('category'); setDrill({ dim: 'category', key: c.cat, label: c.cat }); }}
              style={{ ...cardStyle, borderTop: `3px solid ${clr}`, cursor: 'pointer', transition: 'box-shadow .15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 18px rgba(13,19,38,0.10)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: clr }}>{c.cat}</p>
                <span style={{ fontSize: 11, fontWeight: 700, color: gpColor(c.gpPct) }}>GP {pctStr(c.gp, c.sale)}</span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 800, color: '#0d1326' }}>{money(c.sale)}</p>
              <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 10, color: '#5a6691', flexWrap: 'wrap' }}>
                <span>Cost {money(c.cost)}</span>
                <span style={{ color: gpColor(c.gpPct), fontWeight: 700 }}>GP {money(c.gp)}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 10, color: '#8b93b3', flexWrap: 'wrap' }}>
                <span>{c.txns} txns</span><span>{c.customers} customers</span><span>Avg {money(c.avg)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* analysis tab bar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setDrill(null); }} style={tBtn(tab === t.id)}>{t.label}</button>
        ))}
      </div>

      {loading && <div style={{ ...cardStyle, textAlign: 'center', color: '#5a6691', padding: 28 }}>Loading sales &amp; purchase vouchers…</div>}
      {!loading && !hasData && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 36 }}>
          <p style={{ margin: 0, fontSize: 32 }}>📊</p>
          <p style={{ margin: '8px 0 4px', fontSize: 14, fontWeight: 700, color: '#0d1326' }}>No sales in this period</p>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5a6691' }}>Adjust the date range, or post sale/purchase vouchers — the segment comes from each customer's party sub-group (B2C Meta / B2C Ref / B2B / B2E).</p>
        </div>
      )}

      {!loading && hasData && view === 'detailed' && (
        <InvoiceTable title="All Transactions" invoices={drill ? invoices.filter((i) => matchDrill(i, drill)) : invoices} onVoucher={setVoucher} drill={drill} clearDrill={() => setDrill(null)} />
      )}

      {!loading && hasData && view === 'summary' && (
        <>
          {tab === 'interbranch'
            ? <InterBranchTab branch={branch} from={from} to={to} invoices={invoices} onVoucher={setVoucher} />
            : <AnalysisTab tab={tab} invoices={invoices} catSummary={catSummary} onDrill={(d) => setDrill(d)} />}
          {drill && tab !== 'interbranch' && (
            <InvoiceTable title={`${drill.label} — transactions`} invoices={invoices.filter((i) => matchDrill(i, drill))} onVoucher={setVoucher} drill={drill} clearDrill={() => setDrill(null)} />
          )}
        </>
      )}
    </div>
  );
}

/* match an invoice to a drill selection { dim, key } */
function matchDrill(i, d) {
  switch (d.dim) {
    case 'category': return i.category === d.key;
    case 'client': return i.customer === d.key;
    case 'supplier': return i.supplier === d.key;
    case 'consultant': return i.consultant === d.key;
    case 'branch': return i.branch === d.key;
    case 'service': return i.service === d.key;
    case 'monthly': return monthKeyOf(i.date) === d.key;
    case 'quarterly': { const dd = toDate(i.date); return dd ? fyQuarterOf(dd).label === d.key : false; }
    default: return true;
  }
}

/* ══════════════════════════════════════════════════════════════════════
   ANALYSIS TAB — one aggregate table, rows drill to the invoice list
   ════════════════════════════════════════════════════════════════════ */
function aggregate(invoices, keyFn) {
  const m = new Map();
  invoices.forEach((i) => {
    const k = keyFn(i) || '—';
    if (!m.has(k)) m.set(k, { key: k, sale: 0, cost: 0, txns: 0, custSet: new Set() });
    const r = m.get(k);
    r.sale += i.sale; r.cost += i.cost; if (i.sale > 0) { r.txns += 1; if (i.customer) r.custSet.add(i.customer); }
  });
  return [...m.values()].map((r) => ({ ...r, gp: r.sale - r.cost, gpPct: pct(r.sale - r.cost, r.sale), customers: r.custSet.size, avg: r.txns ? r.sale / r.txns : 0 }));
}

function AnalysisTab({ tab, invoices, catSummary, onDrill }) {
  const cfg = {
    category:   { dim: 'category', label: 'Category', keyFn: (i) => i.category, sort: 'sale' },
    client:     { dim: 'client', label: 'Customer / Company', keyFn: (i) => i.customer, sort: 'sale', salesOnly: true },
    supplier:   { dim: 'supplier', label: 'Supplier', keyFn: (i) => i.supplier, sort: 'cost' },
    consultant: { dim: 'consultant', label: 'Consultant', keyFn: (i) => i.consultant, sort: 'gp', salesOnly: true },
    branch:     { dim: 'branch', label: 'Branch', keyFn: (i) => i.branch, sort: 'sale', brand: true },
    service:    { dim: 'service', label: 'Service', keyFn: (i) => i.service, sort: 'sale' },
    monthly:    { dim: 'monthly', label: 'Month', keyFn: (i) => monthKeyOf(i.date), sort: 'key', fmt: (k) => monthLabel(k) },
    quarterly:  { dim: 'quarterly', label: 'Quarter', keyFn: (i) => { const d = toDate(i.date); return d ? fyQuarterOf(d).label : '—'; }, sort: 'key' },
    topCustomers: { dim: 'client', label: 'Top Customers', keyFn: (i) => i.customer, sort: 'sale', salesOnly: true, top: 15 },
    topSuppliers: { dim: 'supplier', label: 'Top Suppliers', keyFn: (i) => i.supplier, sort: 'cost', top: 15 },
    topProfit:    { dim: 'client', label: 'Top Profit-Making Accounts', keyFn: (i) => i.customer, sort: 'gp', salesOnly: true, top: 15 },
  }[tab] || {};

  let rows = aggregate(invoices.filter((i) => (cfg.salesOnly ? i.sale > 0 : true)), cfg.keyFn);
  if (cfg.sort === 'key') rows.sort((a, b) => String(a.key).localeCompare(String(b.key)));
  else rows.sort((a, b) => (b[cfg.sort] || 0) - (a[cfg.sort] || 0));
  if (cfg.top) rows = rows.slice(0, cfg.top);

  const tot = rows.reduce((a, r) => ({ sale: a.sale + r.sale, cost: a.cost + r.cost, gp: a.gp + r.gp, txns: a.txns + r.txns }), { sale: 0, cost: 0, gp: 0, txns: 0 });

  return (
    <div style={{ ...cardStyle }}>
      <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#0d1326' }}>{cfg.label} <span style={{ color: '#5a6691', fontWeight: 500 }}>· {rows.length} rows · click any row to drill</span></p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead><tr>
            <Th>{cfg.label}</Th><Th right>Revenue</Th><Th right>Cost</Th><Th right>Gross Profit</Th><Th right>GP %</Th>
            <Th right>Txns</Th><Th right>Customers</Th><Th right>Avg Sale</Th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} onClick={() => onDrill({ dim: cfg.dim, key: r.key, label: cfg.fmt ? cfg.fmt(r.key) : (cfg.brand ? brName(r.key) : r.key) })}
                style={{ cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; }} onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}>
                <td style={{ ...RPT_tdStyle, fontWeight: 600, ...linkCell }}>{cfg.fmt ? cfg.fmt(r.key) : (cfg.brand ? brName(r.key) : r.key)}</td>
                <td style={{ ...RPT_tdStyle, textAlign: 'right', color: '#185FA5' }}>{money(r.sale)}</td>
                <td style={{ ...RPT_tdStyle, textAlign: 'right', color: '#854F0B' }}>{money(r.cost)}</td>
                <td style={{ ...RPT_tdStyle, textAlign: 'right', fontWeight: 700 }}>{money(r.gp)}</td>
                <td style={{ ...RPT_tdStyle, textAlign: 'right', fontWeight: 700, color: gpColor(r.gpPct) }}>{pctStr(r.gp, r.sale)}</td>
                <td style={{ ...RPT_tdStyle, textAlign: 'right' }}>{r.txns}</td>
                <td style={{ ...RPT_tdStyle, textAlign: 'right' }}>{r.customers}</td>
                <td style={{ ...RPT_tdStyle, textAlign: 'right', color: '#5a6691' }}>{money(r.avg)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr style={{ background: '#0d1326' }}>
            <td style={{ padding: '9px 12px', fontWeight: 700, color: '#d4a437' }}>TOTAL</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#fff' }}>{money(tot.sale)}</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#fff' }}>{money(tot.cost)}</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#d4a437' }}>{money(tot.gp)}</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#fff' }}>{pctStr(tot.gp, tot.sale)}</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#fff' }}>{tot.txns}</td>
            <td colSpan={2} />
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   INVOICE (detailed category) TABLE — expand to ledger entries → voucher
   ════════════════════════════════════════════════════════════════════ */
function InvoiceTable({ title, invoices, onVoucher, drill, clearDrill }) {
  const [open, setOpen] = useState('');
  const rows = [...invoices].sort((a, b) => b.sale - a.sale);
  const tot = rows.reduce((a, r) => ({ sale: a.sale + r.sale, cost: a.cost + r.cost, gp: a.gp + r.gp }), { sale: 0, cost: 0, gp: 0 });
  return (
    <div style={{ ...cardStyle, marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0d1326' }}>{title} <span style={{ color: '#5a6691', fontWeight: 500 }}>· {rows.length} invoices</span></p>
        {drill && clearDrill && <button onClick={clearDrill} style={xBtn}>✕ Clear filter</button>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead><tr>
            <Th>Customer</Th><Th>Invoice / Booking</Th><Th>Service</Th><Th right>Sales</Th><Th right>Cost</Th>
            <Th right>GP</Th><Th right>GP %</Th><Th>Consultant</Th><Th>Branch</Th><Th>Status</Th>
          </tr></thead>
          <tbody>
            {rows.map((inv) => {
              const isOpen = open === inv.key;
              return (
                <React.Fragment key={inv.key}>
                  <tr onClick={() => setOpen(isOpen ? '' : inv.key)} style={{ cursor: 'pointer', background: isOpen ? '#f7f8fb' : '' }}>
                    <td style={{ ...RPT_tdStyle, fontWeight: 600 }}><span style={{ color: '#b9bed4', marginRight: 5 }}>{isOpen ? '▾' : '▸'}</span>{inv.customer}</td>
                    <td style={{ ...RPT_tdStyle, fontFamily: 'monospace', fontSize: 10, color: '#185FA5' }}>{inv.ref || '—'}</td>
                    <td style={RPT_tdStyle}>{inv.service}</td>
                    <td style={{ ...RPT_tdStyle, textAlign: 'right', color: '#185FA5' }}>{money(inv.sale)}</td>
                    <td style={{ ...RPT_tdStyle, textAlign: 'right', color: '#854F0B' }}>{money(inv.cost)}</td>
                    <td style={{ ...RPT_tdStyle, textAlign: 'right', fontWeight: 700 }}>{money(inv.gp)}</td>
                    <td style={{ ...RPT_tdStyle, textAlign: 'right', fontWeight: 700, color: gpColor(inv.gpPct) }}>{pctStr(inv.gp, inv.sale)}</td>
                    <td style={RPT_tdStyle}>{inv.consultant}</td>
                    <td style={RPT_tdStyle}>{brName(inv.branch)}</td>
                    <td style={RPT_tdStyle}><span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 9.5, fontWeight: 700, background: inv.status === 'cancelled' ? '#FCEBEB' : '#EAF3DE', color: inv.status === 'cancelled' ? '#A32D2D' : '#27500A' }}>{inv.status || 'saved'}</span></td>
                  </tr>
                  {isOpen && (
                    <tr><td colSpan={10} style={{ padding: '4px 12px 12px 34px', background: '#fafbfd' }}>
                      <p style={{ margin: '6px 0 4px', fontSize: 10, fontWeight: 700, color: '#5a6691', textTransform: 'uppercase' }}>Ledger entries / vouchers — click to view &amp; edit</p>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
                        <tbody>
                          {[...inv.saleV.map((x) => ({ ...x, side: 'Sale' })), ...inv.purchV.map((x) => ({ ...x, side: 'Purchase' }))].map((vx, j) => (
                            <tr key={j} style={{ borderBottom: '1px solid #eef1f6' }}>
                              <td style={{ padding: '5px 8px', width: 70 }}><span style={{ fontSize: 9, fontWeight: 700, color: vx.side === 'Sale' ? '#185FA5' : '#854F0B' }}>{vx.side}</span></td>
                              <td style={{ padding: '5px 8px' }}>
                                {vx.id ? <button onClick={() => onVoucher({ id: vx.id })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#185FA5', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, padding: 0 }}>{vx.vno}</button>
                                  : <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{vx.vno}</span>}
                              </td>
                              <td style={{ padding: '5px 8px', color: '#384677' }}>{vx.party || '—'}</td>
                              <td style={{ padding: '5px 8px', color: '#5a6691' }}>{serviceOf(vx)}</td>
                              <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>{money(vx.amt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td></tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot><tr style={{ background: '#0d1326' }}>
            <td colSpan={3} style={{ padding: '9px 12px', fontWeight: 700, color: '#d4a437' }}>TOTAL — {rows.length}</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#fff' }}>{money(tot.sale)}</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#fff' }}>{money(tot.cost)}</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#d4a437' }}>{money(tot.gp)}</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#fff' }}>{pctStr(tot.gp, tot.sale)}</td>
            <td colSpan={3} />
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   INTER-BRANCH ANALYSIS — Revenue/Cost/GP (from segment) + Receivable/
   Payable/Elimination (from inter-branch Sundry ledgers) + drill to voucher
   ════════════════════════════════════════════════════════════════════ */
function InterBranchTab({ branch, from, to, invoices, onVoucher }) {
  const tbQ = useTrialBalance(branch, { from, to });
  const regQ = useLedgerRegistry(branch);
  const tbRows = tbQ.data?.rows || [];
  const ledgers = regQ.data || [];
  const [openLedger, setOpenLedger] = useState('');

  const ib = useMemo(() => {
    const regByName = new Map(ledgers.map((l) => [String(l.name).toLowerCase(), l]));
    const recv = [], pay = [];
    tbRows.forEach((row) => {
      const group = row.group || regByName.get(String(row.ledger).toLowerCase())?.group || '';
      const isDr = /sundry debtors/i.test(group), isCr = /sundry creditors/i.test(group);
      if ((!isDr && !isCr) || !isInterBranch(row.ledger)) return;
      const reg = regByName.get(String(row.ledger).toLowerCase());
      const owning = reg && reg.branch && reg.branch !== 'ALL' ? reg.branch : null;
      const item = { ledger: row.ledger, owning, outstanding: isDr ? (row.closingDebit || 0) : (row.closingCredit || 0) };
      (isDr ? recv : pay).push(item);
    });
    const totRecv = recv.reduce((s, r) => s + r.outstanding, 0);
    const totPay = pay.reduce((s, r) => s + r.outstanding, 0);
    return { recv, pay, totRecv, totPay, elim: Math.min(totRecv, totPay) };
  }, [tbRows, ledgers]);

  const seg = invoices.filter((i) => i.category === 'Inter Branch');
  const rev = seg.reduce((s, i) => s + i.sale, 0);
  const cost = seg.reduce((s, i) => s + i.cost, 0);

  const Stat = ({ label, value, clr }) => (
    <div style={{ ...cardStyle, borderTop: `3px solid ${clr}` }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: clr, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: '#0d1326' }}>{money(value)}</p>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 14 }}>
        <Stat label="Revenue" value={rev} clr="#185FA5" />
        <Stat label="Cost" value={cost} clr="#854F0B" />
        <Stat label="Gross Profit" value={rev - cost} clr="#1D9E75" />
        <Stat label="Receivable" value={ib.totRecv} clr="#185FA5" />
        <Stat label="Payable" value={ib.totPay} clr="#A32D2D" />
        <Stat label="Elimination Impact" value={ib.elim} clr="#6B4C8B" />
      </div>

      {seg.length > 0 && <InvoiceTable title="Inter-Branch Transactions" invoices={seg} onVoucher={onVoucher} />}

      {/* inter-branch ledger drill (Branch → Ledger → Voucher) */}
      <div style={{ ...cardStyle, marginTop: 14 }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#0d1326' }}>Inter-Branch Ledgers — Receivable ⇄ Payable</p>
        {ib.recv.length === 0 && ib.pay.length === 0 && <p style={{ margin: 0, fontSize: 11.5, color: '#5a6691' }}>No inter-branch Sundry Debtor / Creditor ledgers found in this period.</p>}
        {[...ib.recv.map((r) => ({ ...r, side: 'Receivable' })), ...ib.pay.map((p) => ({ ...p, side: 'Payable' }))].map((l) => {
          const isOpen = openLedger === l.ledger;
          return (
            <div key={`${l.side}:${l.ledger}`} style={{ border: '1px solid #eef1f6', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
              <div onClick={() => setOpenLedger(isOpen ? '' : l.ledger)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', background: isOpen ? '#f7f8fb' : '#fff' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0d1326' }}><span style={{ color: '#b9bed4', marginRight: 5 }}>{isOpen ? '▾' : '▸'}</span>{l.ledger}</p>
                  <p style={{ margin: '1px 0 0 16px', fontSize: 10, color: '#5a6691' }}>{l.owning ? brName(l.owning) : '—'} · {l.side}</p>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: l.side === 'Receivable' ? '#185FA5' : '#A32D2D' }}>{money(l.outstanding)}</span>
                  <button onClick={(e) => { e.stopPropagation(); openLedgerModal(l.ledger); }} title="Open full ledger account" style={{ border: '1px solid #d6dbe6', background: '#fff', borderRadius: 6, fontSize: 11, padding: '3px 8px', cursor: 'pointer', color: '#0d1326', fontWeight: 700 }}>📒 Ledger</button>
                </span>
              </div>
              {isOpen && <IBLedgerVouchers ledger={l.ledger} branch={branch} from={from} to={to} onVoucher={onVoucher} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IBLedgerVouchers({ ledger, branch, from, to, onVoucher }) {
  const q = useLedgerStatement(ledger, branch, { from, to });
  const lines = q.data?.lines || [];
  if (q.isLoading) return <div style={{ padding: 14, fontSize: 11, color: '#5a6691' }}>Loading postings…</div>;
  return (
    <div style={{ overflowX: 'auto', borderTop: '1px solid #eef1f6' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
        <thead><tr style={{ background: '#f3f4f8' }}>
          {['Date', 'Voucher', 'Narration', 'Dr', 'Cr', 'Balance'].map((h, i) => <th key={i} style={{ padding: '6px 10px', textAlign: i >= 3 ? 'right' : 'left', color: '#5a6691', fontWeight: 700, fontSize: 9.5 }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {lines.length === 0 && <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#5a6691' }}>No postings in range.</td></tr>}
          {lines.map((e, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f8' }}>
              <td style={{ padding: '5px 10px', color: '#5a6691', whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</td>
              <td style={{ padding: '5px 10px' }}>{e.voucherId ? <button onClick={() => onVoucher({ id: e.voucherId })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#185FA5', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, padding: 0 }}>{e.vno || '(view)'}</button> : <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{e.vno}</span>}</td>
              <td style={{ padding: '5px 10px', color: '#384677' }}>{e.narration || e.party || '—'}</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', color: e.debit > 0 ? '#185FA5' : '#cfd3e2' }}>{e.debit > 0 ? money(e.debit) : '—'}</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', color: e.credit > 0 ? '#A32D2D' : '#cfd3e2' }}>{e.credit > 0 ? money(e.credit) : '—'}</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 700, color: e.balanceSide === 'Cr' ? '#A32D2D' : '#185FA5' }}>{money(Math.abs(e.balance))} {e.balanceSide}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
