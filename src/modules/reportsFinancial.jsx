/* ════════════════════════════════════════════════════════════════════
   MODULES/REPORTS-FINANCIAL.JSX

   The Reports → Profit & Loss and Balance Sheet screens, restyled to the
   SAP-Fiori / Tally-Classic look & feel, rendered from LIVE data:

     Profit & Loss  →  GET /api/accounting/module-pl   (module-wise GP →
                       indirect overheads → Net Profit bridge)
     Balance Sheet  →  GET /api/accounting/balance-sheet (group → ledger,
                       Tally-Classic ⇄ Fiori vertical toggle)

   Honest-data notes (mockup asked for things the books don't carry yet):
     · P&L sub-rows are real booking files (by Link No), not the mock's
       International/Domestic split (no int'l/domestic flag on a voucher).
     · The P&L bottom line is Net Profit (Gross − overheads). There is no
       fabricated "Provision for Tax @ 25.17%" line — tax shows only if a
       real tax ledger is posted under indirect expenses.
     · Prior-year columns/trends fetch the previous FY live and compare.
   ════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { card, inp, bc } from '../core/styles';
import { useModulePL, useBalanceSheet, useLedgerStatement, useAgeing, branchCode } from '../core/useAccounting';
import { apiGet, getAuthToken } from '../core/api';
import { exportToExcel } from '../core/exportExcel';
import { CUR_FY, CUR_MONTH, CUR_QUARTER, todayISO, isoDate, fmtDate, fyMonthKeys, monthLabel, rangeNote } from '../core/dates';
import { VoucherEditor } from './accountingLive';
import { useMobile } from '../core/hooks';

/* ── palette (SAP Fiori) ─────────────────────────────────────────────── */
const SAP = {
  shell: '#1d2d3e', border: '#d9d9d9', borderLt: '#ededed',
  text: '#32363a', sec: '#6a6d70', label: '#8696a9',
  blue: '#0070f2', blueBg: '#e8f3ff', green: '#188918', greenBg: '#f1fdf1', greenDk: '#0d6b0d',
  red: '#bb0000', teal: '#04838f', purple: '#5c30a2', orange: '#e9730c', gold: '#c87b00',
  rowHover: '#f0f5ff', rowAlt: '#fafafa', headerBg: '#f0f3f4', pageBg: '#f5f6f7',
  grpBg: '#e8f0fb', grpText: '#0a2955', subBg: '#f3f7fc', subText: '#1a3a6e',
};
const SHADOW = '0 1px 4px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.08)';
const TALLY = { head: '#14396b', titlebar: '#dbe7f5', gold: '#b8860b', green: '#1a7a1a' };

/* ── number/format helpers ───────────────────────────────────────────── */
const curOf = (branch) => bc(branch).cur;
const branchLabel = (branch) => (!branch || branch === 'ALL' ? 'All branches' : (branch.code || branch));
const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString('en-IN') : '—'; };
const paren = (n) => { const v = Math.round(Number(n) || 0); return v ? `(${v.toLocaleString('en-IN')})` : '—'; };
const compact = (cur, n) => {
  const v = Number(n) || 0, a = Math.abs(v);
  if (a >= 1e7) return `${cur}${(v / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${cur}${(v / 1e5).toFixed(2)} L`;
  return `${cur}${Math.round(v).toLocaleString('en-IN')}`;
};
const pctTxt = (p) => `${(Number(p) || 0).toFixed(2)}%`;
const gpColor = (p) => (p >= 13 ? SAP.greenDk : p >= 8 ? SAP.gold : SAP.orange);

/* ── financial-year helpers (Apr–Mar) ────────────────────────────────── */
function fyOptions() {
  const now = new Date();
  const sy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 4 }, (_, i) => { const s = sy - i; return `${s}-${String(s + 1).slice(2)}`; });
}
const fyRange = (label) => { const s = parseInt(label.slice(0, 4), 10); return { from: `${s}-04-01`, to: `${s + 1}-03-31` }; };
const fyPrior = (label) => { const s = parseInt(label.slice(0, 4), 10); return fyRange(`${s - 1}-${String(s).slice(2)}`); };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const asOn = (iso) => { if (!iso) return 'latest'; const d = new Date(iso); return `${String(d.getDate()).padStart(2, '0')}-${MON[d.getMonth()]}-${d.getFullYear()}`; };

/* ── tiny shared chrome ──────────────────────────────────────────────── */
function Wrap({ children }) {
  return <div style={{ maxWidth: 1180, margin: '0 auto', padding: '4px 6px 28px' }}>{children}</div>;
}
function FioriHead({ system, title, sub, right }) {
  return (
    <>
      <div style={{ background: SAP.shell, minHeight: 40, display: 'flex', alignItems: 'center', padding: '6px 16px', borderRadius: '8px 8px 0 0', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ background: '#fff', color: SAP.shell, width: 22, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>KB</span>
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{system}</span>
        {right && <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{right}</div>}
      </div>
      <div style={{ background: '#fff', padding: '12px 20px', border: `1px solid ${SAP.border}`, borderTop: 'none' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: SAP.text }}>{title}</div>
        <div style={{ fontSize: 12, color: SAP.sec, marginTop: 3 }}>{sub}</div>
      </div>
    </>
  );
}
function StateBox({ q, empty, children }) {
  if (q.isLoading) return <div style={{ ...card, padding: 30, textAlign: 'center', color: SAP.sec, fontSize: 12, borderRadius: '0 0 8px 8px' }}>Loading live data…</div>;
  if (q.isError) return <div style={{ ...card, padding: 16, color: SAP.red, fontSize: 12, fontWeight: 600, borderRadius: '0 0 8px 8px' }}>⚠ {q.error?.message || 'Failed to load from backend'}</div>;
  if (empty) return <div style={{ ...card, padding: 30, textAlign: 'center', color: SAP.sec, fontSize: 12, borderRadius: '0 0 8px 8px' }}>No data for this selection.</div>;
  return children;
}
function Kpi({ tone, label, value, sub, trend }) {
  const bar = { blue: SAP.blue, green: SAP.green, teal: SAP.teal, purple: SAP.purple, red: SAP.red, orange: SAP.orange }[tone] || SAP.blue;
  const vc = { green: SAP.greenDk, blue: SAP.blue, teal: SAP.teal, purple: SAP.purple, red: SAP.red }[tone] || SAP.text;
  return (
    <div style={{ background: '#fff', border: `1px solid ${SAP.border}`, borderRadius: 8, padding: 14, boxShadow: SHADOW, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: bar }} />
      <div style={{ fontSize: 10, fontWeight: 600, color: SAP.label, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: vc }}>{value}</div>
      <div style={{ fontSize: 10, color: SAP.label, display: 'flex', gap: 6 }}>{trend}{sub}</div>
    </div>
  );
}
const KpiGrid = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 14 }}>{children}</div>;
function Trend({ cur, prev, invert }) {
  if (prev == null || !isFinite(prev) || prev === 0) return null;
  const p = ((cur - prev) / Math.abs(prev)) * 100, up = p >= 0, good = invert ? !up : up;
  return <span style={{ color: good ? SAP.green : SAP.red, fontWeight: 600 }}>{up ? '▲' : '▼'} {Math.abs(p).toFixed(1)}%</span>;
}
function FCard({ title, sub, badge, children }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${SAP.border}`, borderRadius: 8, boxShadow: SHADOW, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ padding: '12px 18px', borderBottom: `1px solid ${SAP.borderLt}`, background: SAP.headerBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div><div style={{ fontSize: 14, fontWeight: 700, color: SAP.text }}>{title}</div>{sub && <div style={{ fontSize: 11, color: SAP.sec, marginTop: 2 }}>{sub}</div>}</div>
        {badge}
      </div>
      {children}
    </div>
  );
}
const Badge = ({ children, bg = SAP.greenBg, c = SAP.greenDk, bd = '#b8ecb8' }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: bg, color: c, border: `1px solid ${bd}`, whiteSpace: 'nowrap' }}>{children}</span>
);
const Toggle = ({ open }) => <span style={{ display: 'inline-flex', width: 14, height: 14, border: '1px solid currentColor', borderRadius: 3, fontSize: 9, alignItems: 'center', justifyContent: 'center', marginRight: 7, opacity: 0.7 }}>{open ? '−' : '+'}</span>;
const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', padding: '7px 20px 7px 16px' };
// Booking-file drill rows (shared by single-leaf modules and sub-centres).
// Clickable when the file carries editable vouchers → opens the voucher drill.
function FileRows({ files, indent = 48, onPick }) {
  return (files || []).map((f, i) => {
    const drillable = !f.aggregate && (f.vouchers || []).length > 0;
    return (
      <tr key={(f.ref || '') + i} onClick={() => drillable && onPick && onPick(f)}
        style={{ background: i % 2 ? SAP.rowAlt : '#fff', borderBottom: `1px solid ${SAP.borderLt}`, fontStyle: f.aggregate ? 'italic' : 'normal', cursor: drillable ? 'pointer' : 'default' }}>
        <td style={{ padding: `5px 16px 5px ${indent}px`, color: SAP.text }}>{f.ref}{!f.aggregate && (f.customer || f.supplier) ? <span style={{ color: SAP.label }}> · {f.customer || f.supplier}</span> : null}{drillable ? <span style={{ color: SAP.blue, fontWeight: 700, marginLeft: 6 }}>›</span> : null}</td>
        <td style={num}>{inr(f.sale)}</td>
        <td style={num}>{inr(f.cost)}</td>
        <td style={{ ...num, color: f.gp >= 0 ? SAP.greenDk : SAP.red }}>{inr(f.gp)}</td>
        <td style={{ ...num, color: gpColor(f.gpPct) }}>{pctTxt(f.gpPct)}</td>
        <td style={num} />
      </tr>
    );
  });
}

/* ════════════════════════ Drill-to-voucher (touch) ═════════════════════ */
const tapRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: `1px solid ${SAP.borderLt}`, cursor: 'pointer' };

// Full-screen on phones, centred sheet on desktop. Tap the backdrop to close.
function Modal({ title, onClose, mobile, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.45)', zIndex: 800, display: 'flex', justifyContent: 'center', alignItems: mobile ? 'stretch' : 'flex-start', padding: mobile ? 0 : '5vh 12px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: mobile ? '100%' : 'min(720px, 96vw)', height: mobile ? '100%' : 'auto', maxHeight: mobile ? '100%' : '90vh', borderRadius: mobile ? 0 : 10, overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ position: 'sticky', top: 0, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: `1px solid ${SAP.borderLt}`, zIndex: 2 }}>
          <div style={{ fontWeight: 700, color: SAP.text, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, lineHeight: 1, cursor: 'pointer', color: SAP.sec, padding: '2px 8px' }}>✕</button>
        </div>
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// P&L booking file → its sale/purchase vouchers → edit (saving re-posts the journal).
function FileVoucherDrill({ file, cur, mobile, onClose }) {
  const [vid, setVid] = useState(null);
  const vouchers = file?.vouchers || [];
  return (
    <Modal title={vid ? 'Edit Voucher' : `${file.ref} — ${vouchers.length} voucher(s)`} onClose={onClose} mobile={mobile}>
      {vid
        ? <VoucherEditor voucherId={vid} cur={cur} onBack={() => setVid(null)} />
        : (vouchers.length === 0
          ? <div style={{ padding: 24, textAlign: 'center', color: SAP.sec, fontSize: 12 }}>Aggregated row — open a specific sub-centre to reach individual vouchers.</div>
          : vouchers.map((vh) => (
            <div key={vh.id} onClick={() => setVid(vh.id)} style={tapRow}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: SAP.blue, fontWeight: 600, fontSize: 12.5 }}>{vh.vno} <span style={{ color: SAP.label, fontWeight: 400 }}>· {vh.category} · {vh.date}</span></div>
                <div style={{ fontSize: 11, color: SAP.sec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vh.party || '—'}</div>
              </div>
              <div style={{ fontWeight: 700, color: SAP.text, whiteSpace: 'nowrap' }}>{cur}{inr(vh.total)} ›</div>
            </div>
          )))}
    </Modal>
  );
}

// Classic-view module drill: a module row aggregates many booking files, so we
// step module → booking file → its sale/purchase vouchers → edit (re-posts the
// journal). The Fiori view drills file-first; this enters from an aggregate row.
function ModuleVoucherDrill({ module, cur, mobile, onClose }) {
  const allFiles = module.hasSubs ? (module.subs || []).flatMap((s) => s.files || []) : (module.files || []);
  const files = allFiles.filter((f) => !f.aggregate && (f.vouchers || []).length > 0);
  const [file, setFile] = useState(null);
  const [vid, setVid] = useState(null);
  const title = vid ? 'Edit Voucher'
    : file ? `${file.ref} — ${(file.vouchers || []).length} voucher(s)`
      : `${module.name} — ${files.length} booking file(s)`;
  return (
    <Modal title={title} onClose={onClose} mobile={mobile}>
      {vid ? (
        <VoucherEditor voucherId={vid} cur={cur} onBack={() => setVid(null)} />
      ) : file ? (
        (file.vouchers || []).map((vh) => (
          <div key={vh.id} onClick={() => setVid(vh.id)} style={tapRow}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: SAP.blue, fontWeight: 600, fontSize: 12.5 }}>{vh.vno} <span style={{ color: SAP.label, fontWeight: 400 }}>· {vh.category} · {vh.date}</span></div>
              <div style={{ fontSize: 11, color: SAP.sec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vh.party || '—'}</div>
            </div>
            <div style={{ fontWeight: 700, color: SAP.text, whiteSpace: 'nowrap' }}>{cur}{inr(vh.total)} ›</div>
          </div>
        ))
      ) : files.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: SAP.sec, fontSize: 12 }}>No editable vouchers under this module for the selected period.</div>
      ) : (
        files.map((f, i) => (
          <div key={(f.ref || '') + i} onClick={() => setFile(f)} style={tapRow}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: SAP.blue, fontWeight: 600, fontSize: 12.5 }}>{f.ref} <span style={{ color: SAP.label, fontWeight: 400 }}>· {(f.vouchers || []).length} vch</span></div>
              <div style={{ fontSize: 11, color: SAP.sec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.customer || f.supplier || '—'}</div>
            </div>
            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: 700, color: SAP.text }}>{cur}{inr(f.sale)} ›</div>
              <div style={{ fontSize: 10, color: f.gp >= 0 ? SAP.greenDk : SAP.red }}>GP {inr(f.gp)}</div>
            </div>
          </div>
        ))
      )}
    </Modal>
  );
}

// Balance-sheet ledger → its postings → the voucher → edit.
function LedgerVoucherDrill({ ledger, branch, to, cur, mobile, onClose }) {
  const [vid, setVid] = useState(null);
  const q = useLedgerStatement(ledger, branch, { to });
  const lines = q.data?.lines || [];
  return (
    <Modal title={vid ? 'Edit Voucher' : ledger} onClose={onClose} mobile={mobile}>
      {vid
        ? <VoucherEditor voucherId={vid} cur={cur} onBack={() => setVid(null)} />
        : (
          <>
            {q.isLoading && <div style={{ padding: 24, textAlign: 'center', color: SAP.sec }}>Loading ledger…</div>}
            {q.isError && <div style={{ padding: 16, color: SAP.red, fontSize: 12 }}>⚠ {q.error?.message}</div>}
            {!q.isLoading && lines.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: SAP.sec, fontSize: 12 }}>No postings up to this date.</div>}
            {lines.map((ln, i) => (
              <div key={i} onClick={() => ln.voucherId && setVid(ln.voucherId)} style={{ ...tapRow, cursor: ln.voucherId ? 'pointer' : 'default' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: SAP.blue, fontWeight: 600, fontSize: 12.5 }}>{ln.vno} <span style={{ color: SAP.label, fontWeight: 400 }}>· {ln.date}</span></div>
                  <div style={{ fontSize: 11, color: SAP.sec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ln.narration || ln.party || ln.category}</div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 700, color: ln.debit ? SAP.blue : SAP.red, fontSize: 12 }}>{ln.debit ? `Dr ${inr(ln.debit)}` : `Cr ${inr(ln.credit)}`}</div>
                  {ln.voucherId ? <div style={{ fontSize: 10, color: SAP.label }}>tap to edit ›</div> : null}
                </div>
              </div>
            ))}
          </>
        )}
    </Modal>
  );
}
const Th = ({ children, right, w }) => <th style={{ background: '#f7f8f9', color: SAP.sec, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, padding: right ? '9px 20px 9px 16px' : '9px 16px', borderBottom: `2px solid ${SAP.border}`, textAlign: right ? 'right' : 'left', width: w }}>{children}</th>;

/* ═══════════════════ PROFIT & LOSS (Fiori ⇄ Tally Classic) ══════════════ */
/* ── period model — drives every section live off { from, to } ─────────
   Modes: all | ytd | month (matrix) | quarter (matrix) | custom.
   All ranges flow into useModulePL, so Revenue/COGS/GP/overheads/Net Profit
   and every % recompute for the selection. Source of truth: core/dates.js. */
const PNL_PERIOD_KEY = 'kb360-pnl-period';
function loadSavedPeriod() {
  try { return JSON.parse(localStorage.getItem(PNL_PERIOD_KEY) || '{}') || {}; } catch { return {}; }
}
const toolBtn = { padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: SAP.sec, background: '#fff', border: `1px solid ${SAP.border}`, borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' };

// last calendar day of a YYYY-MM key, as ISO (month is 1-based → day 0 of next).
const monthRange = (key) => { const [y, m] = String(key).split('-').map(Number); return { from: `${key}-01`, to: isoDate(new Date(y, m, 0)) }; };
// FY months (Apr→Mar); the current FY is capped at the current month so future
// months don't render as empty columns.
const fyMonthsFor = (label) => {
  const start = parseInt(String(label).slice(0, 4), 10);
  const keys = fyMonthKeys(start);
  return label === CUR_FY.label ? keys.filter((k) => k <= CUR_MONTH) : keys;
};
const QTR_SPAN = { Q1: 'Apr–Jun', Q2: 'Jul–Sep', Q3: 'Oct–Dec', Q4: 'Jan–Mar' };
const fyQuartersFor = (label) => {
  const start = parseInt(String(label).slice(0, 4), 10);
  const all = fyMonthKeys(start);
  const live = new Set(fyMonthsFor(label));
  const out = [];
  for (let qi = 0; qi < 4; qi++) {
    const seg = all.slice(qi * 3, qi * 3 + 3).filter((k) => live.has(k));
    if (!seg.length) continue;
    const code = `Q${qi + 1}`;
    out.push({ key: `${label}-${code}`, label: code, span: QTR_SPAN[code], from: monthRange(seg[0]).from, to: monthRange(seg[seg.length - 1]).to });
  }
  return out;
};
// mode → resolved single-period { from, to, label, note }. month/quarter use the
// matrix; if one of their columns is drilled the focus range is used directly.
function resolvePeriod(mode, fy, custom) {
  if (mode === 'all') return { from: '', to: '', label: 'All Time', note: rangeNote('all', { to: todayISO() }) };
  if (mode === 'custom') {
    const from = custom.from || CUR_FY.startISO, to = custom.to || todayISO();
    return { from, to, label: 'Custom Range', note: rangeNote('range', { from, to }) };
  }
  const r = fyRange(fy);
  const to = fy === CUR_FY.label ? todayISO() : r.to;       // current FY → year-to-date
  return { from: r.from, to, label: `FY ${fy} YTD`, note: rangeNote('range', { from: r.from, to }) };
}
// comparison window: previous FY (ytd) or the equal-length window immediately
// before a custom range.
function priorPeriod(mode, fy, custom) {
  if (mode === 'custom') {
    const a = new Date(custom.from), b = new Date(custom.to);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    const days = Math.round((b - a) / 86400000) + 1;
    const pe = new Date(a); pe.setDate(pe.getDate() - 1);
    const ps = new Date(pe); ps.setDate(ps.getDate() - days + 1);
    return { from: isoDate(ps), to: isoDate(pe), label: 'Previous range' };
  }
  const p = fyPrior(fy);
  return { from: p.from, to: p.to, label: 'FY prior' };
}
// Flatten a single-period payload into an Excel sheet (Section A modules + the
// indirect-expense groups + the net-profit line).
function exportDetail(d, period, cur) {
  if (!d) return;
  const rows = [];
  (d.modules || []).forEach((m) => rows.push({ section: 'Gross Profit', particulars: m.name, sales: m.sales, cogs: m.cogs, amount: m.gp, gpPct: m.gpPct, pctSales: m.pctOfSales }));
  rows.push({ section: 'Gross Profit', particulars: 'TOTAL — Gross Profit', sales: d.totals.sales, cogs: d.totals.cogs, amount: d.totals.gp, gpPct: d.totals.gpPct, pctSales: 100 });
  const expBuckets = (Array.isArray(d.indirect.buckets) && d.indirect.buckets.length)
    ? d.indirect.buckets
    : [{ name: 'Indirect Expenses', amount: d.indirect.expense, groups: d.indirect.groups || [] }];
  expBuckets.forEach((b) => {
    rows.push({ section: 'Indirect Expenses', particulars: b.name, amount: -b.amount, pctSales: b.pctOfSales });
    (b.groups || []).forEach((g) => {
      rows.push({ section: 'Indirect Expenses', particulars: `   ${g.name}`, amount: -g.amount, pctSales: g.pctOfSales });
      (g.ledgers || []).forEach((l) => rows.push({ section: 'Indirect Expenses', particulars: `      ${l.name}`, amount: -l.amount, pctSales: l.pctOfSales }));
    });
    rows.push({ section: 'Indirect Expenses', particulars: `${b.name} — Total`, amount: -b.amount });
  });
  rows.push({ section: 'Indirect Expenses', particulars: 'TOTAL INDIRECT EXPENSES', amount: -d.indirect.expense });
  if (d.bridge.indirectIncome) rows.push({ section: 'Indirect Income', particulars: 'Indirect Income', amount: d.bridge.indirectIncome });
  rows.push({ section: 'Net Profit', particulars: 'NET PROFIT', amount: d.bridge.netProfit });
  const columns = [
    { key: 'section', label: 'Section' }, { key: 'particulars', label: 'Particulars' },
    { key: 'sales', label: `Sales (${cur})` }, { key: 'cogs', label: `COGS (${cur})` },
    { key: 'amount', label: `Amount (${cur})` }, { key: 'gpPct', label: 'GP %' }, { key: 'pctSales', label: '% of Sales' },
  ];
  exportToExcel(`PnL_${period.label} ${period.from || 'inception'}_to_${period.to || todayISO()}`, columns, rows);
}

/* ── period toolbar (quick filters + comparison + custom range + export) ── */
function PnlPeriodBar({ mode, setMode, fy, setFy, compare, setCompare, custom, setCustom, view, setView, showView, canExport, onExport }) {
  const MODES = [['all', 'All Time'], ['ytd', 'YTD'], ['month', 'Monthly'], ['quarter', 'Quarterly'], ['custom', 'Custom']];
  const tab = (active) => ({ padding: '6px 13px', fontSize: 11.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: active ? SAP.blue : '#fff', color: active ? '#fff' : SAP.sec });
  const needsFy = mode === 'ytd' || mode === 'month' || mode === 'quarter';
  return (
    <div style={{ background: '#fff', border: `1px solid ${SAP.border}`, borderTop: 'none', padding: '9px 14px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'inline-flex', border: `1px solid ${SAP.border}`, borderRadius: 6, overflow: 'hidden' }}>
        {MODES.map(([id, label]) => <button key={id} onClick={() => setMode(id)} style={tab(mode === id)}>{label}</button>)}
      </div>
      {needsFy && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: SAP.sec }}>
          Financial Year
          <select value={fy} onChange={(e) => setFy(e.target.value)} style={{ ...inp, width: 'auto', minHeight: 30, fontSize: 11.5, cursor: 'pointer' }}>
            {fyOptions().map((f) => <option key={f} value={f}>FY {f}</option>)}
          </select>
        </label>
      )}
      {mode === 'custom' && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: SAP.sec, flexWrap: 'wrap' }}>
          From <input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} style={{ ...inp, width: 'auto', minHeight: 30, fontSize: 11.5 }} />
          To <input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} style={{ ...inp, width: 'auto', minHeight: 30, fontSize: 11.5 }} />
        </span>
      )}
      {(mode === 'ytd' || mode === 'custom') && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: SAP.sec, cursor: 'pointer' }}>
          <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> Compare vs previous
        </label>
      )}
      <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
        {showView && <PnlViewSwitcher view={view} setView={setView} />}
        {canExport && <button onClick={onExport} style={toolBtn}>⬇ Excel</button>}
        <button onClick={() => window.print()} style={toolBtn}>🖨 Print / PDF</button>
      </div>
    </div>
  );
}

/* ── Monthly / Quarterly side-by-side matrix (one column per period) ─────
   Fires one module-PL query per column (cache-shared with the detail view's
   key), rolls up a FY-Total column, and drills any column → its full P&L. */
function PnLMatrix({ branch, cur, fy, grain, onFocus }) {
  const code = branchCode(branch);
  const cols = useMemo(
    () => (grain === 'month'
      ? fyMonthsFor(fy).map((k) => ({ key: k, label: monthLabel(k), ...monthRange(k) }))
      : fyQuartersFor(fy)),
    [grain, fy],
  );
  const results = useQueries({
    queries: cols.map((c) => ({
      queryKey: ['accounting', 'module-pl', code || 'all', c.from, c.to],
      queryFn: () => apiGet('/api/accounting/module-pl', { branch: code, from: c.from, to: c.to }),
      enabled: !!getAuthToken(),
      staleTime: 30_000,
    })),
  });
  const loading = results.some((r) => r.isLoading);
  const errored = results.find((r) => r.isError);
  const datas = results.map((r) => r.data);

  const agg = useMemo(() => {
    const t = { sales: 0, cogs: 0, gp: 0, indExp: 0, indInc: 0, net: 0 };
    datas.forEach((d) => {
      if (!d) return;
      t.sales += d.totals.sales || 0; t.cogs += d.totals.cogs || 0; t.gp += d.totals.gp || 0;
      t.indExp += d.indirect.expense || 0; t.indInc += d.bridge.indirectIncome || 0; t.net += d.bridge.netProfit || 0;
    });
    return t;
  }, [datas]);

  const pctSafe = (a, b) => (b ? (a / b) * 100 : 0);
  const METRICS = [
    { label: 'Revenue (Sales)', get: (d) => d.totals.sales, total: agg.sales, money: true },
    { label: 'Direct Cost (COGS)', get: (d) => d.totals.cogs, total: agg.cogs, money: true },
    { label: 'Gross Profit', get: (d) => d.totals.gp, total: agg.gp, strong: true, good: true },
    { label: 'Gross Profit %', get: (d) => d.totals.gpPct, total: pctSafe(agg.gp, agg.sales), pct: true },
    { label: 'Indirect Expenses', get: (d) => d.indirect.expense, total: agg.indExp, neg: true },
    { label: 'Indirect Income', get: (d) => d.bridge.indirectIncome, total: agg.indInc },
    { label: 'Net Profit', get: (d) => d.bridge.netProfit, total: agg.net, strong: true, good: true },
    { label: 'Net Profit %', get: (d) => pctSafe(d.bridge.netProfit, d.totals.sales), total: pctSafe(agg.net, agg.sales), pct: true },
  ];
  const fmtCell = (m, d) => (!d ? '—' : (m.pct ? pctTxt(m.get(d)) : inr(m.get(d))));

  const doExport = () => {
    const columns = [{ key: 'metric', label: grain === 'month' ? 'Metric / Month' : 'Metric / Quarter' }, ...cols.map((c) => ({ key: c.key, label: c.label })), { key: 'fytotal', label: 'FY Total' }];
    const rows = METRICS.map((m) => {
      const row = { metric: m.label };
      cols.forEach((c, i) => { row[c.key] = datas[i] ? (m.pct ? +m.get(datas[i]).toFixed(2) : Math.round(m.get(datas[i]))) : ''; });
      row.fytotal = m.pct ? +m.total.toFixed(2) : Math.round(m.total);
      return row;
    });
    exportToExcel(`PnL_${grain}_FY${fy}`, columns, rows);
  };

  if (errored) return <div style={{ ...card, padding: 16, color: SAP.red, fontSize: 12, fontWeight: 600 }}>⚠ {errored.error?.message || 'Failed to load the period matrix'}</div>;

  return (
    <FCard
      title={grain === 'month' ? `Month-wise Profit & Loss — FY ${fy}` : `Quarter-wise Profit & Loss — FY ${fy}`}
      sub={`Each column is a ${grain === 'month' ? 'month' : 'quarter'} of the financial year · click a column header to drill into its full P&L → vouchers · ${cur} excl. GST`}
      badge={<Badge bg={SAP.blueBg} c={SAP.blue} bd="#b8d6ff">{cols.length} {grain === 'month' ? 'months' : 'quarters'}</Badge>}
    >
      <div style={{ padding: '8px 12px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={doExport} style={toolBtn}>⬇ Excel</button>
      </div>
      {loading ? (
        <div style={{ padding: 30, textAlign: 'center', color: SAP.sec, fontSize: 12 }}>Loading {cols.length} periods…</div>
      ) : cols.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', color: SAP.sec, fontSize: 12 }}>No periods in this financial year yet.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 180 + cols.length * 96 }}>
            <thead>
              <tr>
                <Th w={180}>Particulars</Th>
                {cols.map((c) => (
                  <th key={c.key} onClick={() => onFocus({ from: c.from, to: c.to, label: grain === 'month' ? c.label : `${c.label} FY${fy}`, note: rangeNote('range', { from: c.from, to: c.to }) })}
                    title="Click to drill into this period's full P&L"
                    style={{ background: '#f7f8f9', color: SAP.blue, fontSize: 11, fontWeight: 700, padding: '9px 12px', borderBottom: `2px solid ${SAP.border}`, textAlign: 'right', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {c.label}{c.span ? <div style={{ fontSize: 9, color: SAP.label, fontWeight: 500 }}>{c.span}</div> : null} ›
                  </th>
                ))}
                <th style={{ background: SAP.headerBg, color: SAP.text, fontSize: 11, fontWeight: 800, padding: '9px 12px', borderBottom: `2px solid ${SAP.border}`, textAlign: 'right' }}>FY Total</th>
              </tr>
            </thead>
            <tbody>
              {METRICS.map((m, ri) => (
                <tr key={m.label} style={{ background: m.strong ? SAP.greenBg : (ri % 2 ? SAP.rowAlt : '#fff'), borderBottom: `1px solid ${SAP.borderLt}` }}>
                  <td style={{ padding: '7px 14px', fontWeight: m.strong ? 700 : 500, color: m.strong ? SAP.greenDk : SAP.text }}>{m.label}</td>
                  {cols.map((c, i) => (
                    <td key={c.key} style={{ ...num, padding: '7px 12px', fontWeight: m.strong ? 700 : 400, color: m.good ? SAP.greenDk : (m.neg ? SAP.red : SAP.text) }}>{fmtCell(m, datas[i])}</td>
                  ))}
                  <td style={{ ...num, padding: '7px 12px', fontWeight: 700, color: m.good ? SAP.greenDk : (m.neg ? SAP.red : SAP.text), background: m.strong ? '#dff5df' : SAP.headerBg }}>
                    {m.pct ? pctTxt(m.total) : inr(m.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FCard>
  );
}

export function ReportPnLLive({ branch }) {
  const cur = curOf(branch);
  const mobile = useMobile();
  const saved = useMemo(loadSavedPeriod, []);
  const [mode, setMode] = useState(saved.mode || 'ytd');                // all | ytd | month | quarter | custom
  const [fy, setFy] = useState(saved.fy || CUR_FY.label);
  const [compare, setCompare] = useState(saved.compare ?? true);
  const [custom, setCustom] = useState(saved.custom || { from: CUR_FY.startISO, to: todayISO() });
  const [view, setView] = useState(saved.view || 'fiori');             // 'fiori' | 'classic'
  const [focus, setFocus] = useState(null);                            // matrix → drilled column { from, to, label, note }
  useEffect(() => { try { localStorage.setItem(PNL_PERIOD_KEY, JSON.stringify({ mode, fy, compare, custom, view })); } catch { /* ignore */ } }, [mode, fy, compare, custom, view]);
  useEffect(() => { setFocus(null); }, [mode, fy]);                    // realigning the matrix clears any open drill

  const isMatrix = (mode === 'month' || mode === 'quarter') && !focus;
  const period = focus || resolvePeriod(mode, fy, custom);
  const showPY = !isMatrix && !focus && compare && mode !== 'all';
  const prior = showPY ? priorPeriod(mode, fy, custom) : null;

  const q = useModulePL(branch, { from: period.from, to: period.to });
  // No comparison → reuse the same range (cache hit, no extra fetch); prev stays null.
  const qP = useModulePL(branch, prior ? { from: prior.from, to: prior.to } : { from: period.from, to: period.to });
  const d = q.data;
  const prev = showPY ? qP.data : null;

  const [openMod, setOpenMod] = useState({});
  const [openSub, setOpenSub] = useState({});
  const [openExp, setOpenExp] = useState({});
  const [openBucket, setOpenBucket] = useState({});
  const [drillFile, setDrillFile] = useState(null);
  const [drillLedger, setDrillLedger] = useState(null);
  const [expDetail, setExpDetail] = useState('detailed'); // Indirect Expenses: detailed (full tree) | summary (Fixed/Variable totals)

  const ranking = useMemo(() => (d?.modules || []).slice().sort((a, b) => b.gp - a.gp), [d]);
  // Indirect-expense Fixed/Variable buckets. New module-PL payloads carry
  // `indirect.buckets`; fall back to wrapping the flat group list in one bucket
  // so an older cached payload still renders.
  const expBuckets = useMemo(() => {
    if (!d) return [];
    if (Array.isArray(d.indirect.buckets) && d.indirect.buckets.length) return d.indirect.buckets;
    const groups = d.indirect.groups || [];
    return groups.length ? [{ name: 'Indirect Expenses', amount: d.indirect.expense, pctOfSales: d.totals.sales ? (d.indirect.expense / d.totals.sales) * 100 : 0, groups }] : [];
  }, [d]);
  // Estimated tax provision → PAT (matches the HTML's Section C; statutory rate, flagged estimated).
  const TAX_RATE = 0.2517;
  const tax = d ? Math.max(d.bridge.netProfit, 0) * TAX_RATE : 0;
  const pat = d ? d.bridge.netProfit - tax : 0;
  const ratios = useMemo(() => {
    if (!d) return [];
    const mods = (d.modules || []).filter((m) => m.sales > 0);
    const hi = mods.slice().sort((a, b) => b.gpPct - a.gpPct)[0];
    const lo = mods.slice().sort((a, b) => a.gpPct - b.gpPct)[0];
    const s = d.totals.sales || 0;
    return [
      ['Blended Gross Profit Margin', pctTxt(d.totals.gpPct)],
      ['Highest GP% Module', hi ? `${hi.name} (${pctTxt(hi.gpPct)})` : '—'],
      ['Lowest GP% Module', lo ? `${lo.name} (${pctTxt(lo.gpPct)})` : '—'],
      ['Indirect Exp. as % of GP', d.totals.gp ? pctTxt((d.indirect.expense / d.totals.gp) * 100) : '—'],
      ['Net Profit Margin (PBT)', pctTxt(s ? (d.bridge.netProfit / s) * 100 : 0)],
      ['Net Profit Margin (PAT)', pctTxt(s ? (pat / s) * 100 : 0)],
      ['Break-even GP needed', compact(cur, d.indirect.expense)],
    ];
  }, [d, pat, cur]);
  const periodTxt = period.note || period.label || 'all periods';
  const classicPeriod = period.from ? `${asOn(period.from)} to ${asOn(period.to)}` : 'All periods';

  return (
    <Wrap>
      <FioriHead
        system="KBiz360 · Finance"
        title="Profit & Loss — Module-wise Gross Profit"
        sub={<><strong>{branchLabel(branch)}</strong> &nbsp;|&nbsp; {cur} INR (excl. GST) &nbsp;|&nbsp; {isMatrix ? `FY ${fy} · ${mode === 'month' ? 'month-wise' : 'quarter-wise'}` : periodTxt} &nbsp;|&nbsp; Tally double-entry · live</>}
      />
      <PnlPeriodBar
        mode={mode} setMode={setMode} fy={fy} setFy={setFy}
        compare={compare} setCompare={setCompare} custom={custom} setCustom={setCustom}
        view={view} setView={setView} showView={!isMatrix}
        canExport={!isMatrix && !!d} onExport={() => exportDetail(d, period, cur)}
      />
      {focus && (
        <div style={{ background: '#eef4fb', padding: '8px 16px', fontSize: 12, color: SAP.subText, display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${SAP.border}`, borderTop: 'none' }}>
          <button onClick={() => setFocus(null)} style={toolBtn}>← Back to {mode === 'month' ? 'monthly' : 'quarterly'} matrix</button>
          <span>Showing detail for <strong>{focus.label}</strong> · {focus.note}</span>
        </div>
      )}
      <div style={{ background: SAP.pageBg, padding: (!isMatrix && view === 'classic') ? 0 : 16, border: `1px solid ${SAP.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
        {isMatrix ? (
          <PnLMatrix branch={branch} cur={cur} fy={fy} grain={mode} onFocus={setFocus} />
        ) : (
        <StateBox q={q} empty={!d || !(d.modules || []).length}>
          {d && view === 'fiori' && <>
            {/* KPIs */}
            <KpiGrid>
              <Kpi tone="blue" label="Total Sales" value={compact(cur, d.totals.sales)}
                trend={prev && <Trend cur={d.totals.sales} prev={prev.totals?.sales} />} sub={`${(d.modules || []).length} modules`} />
              <Kpi tone="red" label="Total COGS" value={compact(cur, d.totals.cogs)} sub={`${pctTxt(d.totals.sales ? d.totals.cogs / d.totals.sales * 100 : 0)} of sales`} />
              <Kpi tone="green" label="Gross Profit" value={compact(cur, d.totals.gp)}
                trend={prev && <Trend cur={d.totals.gp} prev={prev.totals?.gp} />} sub={`GP ${pctTxt(d.totals.gpPct)}`} />
              <Kpi tone="orange" label="Indirect Expenses" value={compact(cur, d.indirect.expense)} sub={`${pctTxt(d.totals.sales ? d.indirect.expense / d.totals.sales * 100 : 0)} of sales`} />
              <Kpi tone="teal" label="Net Profit" value={compact(cur, d.bridge.netProfit)}
                trend={prev && <Trend cur={d.bridge.netProfit} prev={prev.bridge?.netProfit} />} sub={`NPM ${pctTxt(d.totals.sales ? d.bridge.netProfit / d.totals.sales * 100 : 0)}`} />
            </KpiGrid>

            {/* Section A — module / sub-centre GP (cost-centre driven) */}
            <FCard title="Section A — Module-wise Sales, COGS & Gross Profit"
              sub={`${(d.modules || []).length} modules · cost-centre driven · click a module → sub-centre → booking files · ${cur} excl. GST`}
              badge={<Badge bg={SAP.blueBg} c={SAP.blue} bd="#b8d6ff">{(d.modules || []).length} Modules</Badge>}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead><tr><Th w="34%">Module / Sub-centre / Booking File</Th><Th right>Sales</Th><Th right>COGS</Th><Th right>Gross Profit</Th><Th right w="10%">GP %</Th><Th right w="11%">% of Sales</Th></tr></thead>
                  <tbody>
                    {(d.modules || []).map((m) => {
                      const open = !!openMod[m.key];
                      const tag = m.hasSubs ? `${(m.subs || []).length} sub · ${m.fileCount} files` : `${m.fileCount} files`;
                      return (
                        <React.Fragment key={m.key}>
                          <tr onClick={() => setOpenMod((s) => ({ ...s, [m.key]: !s[m.key] }))}
                            style={{ background: SAP.grpBg, color: SAP.grpText, cursor: 'pointer', borderTop: '2px solid #b3ccf5' }}>
                            <td style={{ padding: '9px 16px', fontWeight: 700 }}><Toggle open={open} /><span style={{ marginRight: 6 }}>{m.icon}</span>{m.name}<span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 5, marginLeft: 8, background: '#fff', color: SAP.blue, border: '1px solid #b8d6ff' }}>{tag}</span></td>
                            <td style={{ ...num, fontWeight: 700 }}>{inr(m.sales)}</td>
                            <td style={{ ...num, fontWeight: 700 }}>{inr(m.cogs)}</td>
                            <td style={{ ...num, fontWeight: 700, color: SAP.greenDk }}>{inr(m.gp)}</td>
                            <td style={{ ...num, fontWeight: 700, color: gpColor(m.gpPct) }}>{pctTxt(m.gpPct)}</td>
                            <td style={{ ...num, color: SAP.sec }}>{pctTxt(m.pctOfSales)}</td>
                          </tr>
                          {/* multi-leaf modules (Flights/Holiday) → sub-centre rows → files */}
                          {open && m.hasSubs && (m.subs || []).map((s) => {
                            const sk = `${m.key}|${s.code}`;
                            const so = !!openSub[sk];
                            return (
                              <React.Fragment key={s.code}>
                                <tr onClick={() => setOpenSub((st) => ({ ...st, [sk]: !st[sk] }))}
                                  style={{ background: SAP.subBg, color: SAP.subText, cursor: 'pointer', borderBottom: `1px solid ${SAP.borderLt}` }}>
                                  <td style={{ padding: '6px 16px 6px 38px', fontWeight: 600 }}><Toggle open={so} />{s.name}<span style={{ fontSize: 9, color: SAP.label, marginLeft: 6 }}>· {s.fileCount} files</span></td>
                                  <td style={{ ...num, fontWeight: 600 }}>{inr(s.sales)}</td>
                                  <td style={{ ...num, fontWeight: 600 }}>{inr(s.cogs)}</td>
                                  <td style={{ ...num, fontWeight: 600, color: SAP.greenDk }}>{inr(s.gp)}</td>
                                  <td style={{ ...num, fontWeight: 600, color: gpColor(s.gpPct) }}>{pctTxt(s.gpPct)}</td>
                                  <td style={{ ...num, color: SAP.sec }}>{pctTxt(s.pctOfSales)}</td>
                                </tr>
                                {so && <FileRows files={s.files} indent={62} onPick={setDrillFile} />}
                              </React.Fragment>
                            );
                          })}
                          {/* single-leaf modules → files directly */}
                          {open && !m.hasSubs && <FileRows files={m.files} indent={48} onPick={setDrillFile} />}
                        </React.Fragment>
                      );
                    })}
                    <tr style={{ background: SAP.greenBg, color: SAP.greenDk, fontWeight: 700, borderTop: '2px solid #b8ecb8' }}>
                      <td style={{ padding: '10px 16px' }}>✚ TOTAL — Gross Profit (All Modules)</td>
                      <td style={num}>{inr(d.totals.sales)}</td>
                      <td style={num}>{inr(d.totals.cogs)}</td>
                      <td style={num}>{inr(d.totals.gp)}</td>
                      <td style={num}>{pctTxt(d.totals.gpPct)}</td>
                      <td style={num}>100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </FCard>

            {/* Section B — indirect expenses, split Fixed vs Variable */}
            <FCard title="Section B — Indirect Expenses (Fixed vs Variable)"
              sub={`${expBuckets.length ? expBuckets.map((b) => b.name).join(' · ') : 'no overheads'} · Indirect Expenses → Fixed / Variable → sub-group → ledger → voucher`}
              badge={<ExpDetailToggle view={expDetail} setView={setExpDetail} />}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead><tr><Th w="48%">Expense Head</Th><Th right>Amount</Th><Th right>% Share</Th><Th right>% of Sales</Th></tr></thead>
                  <tbody>
                    {expBuckets.length === 0 && <tr><td colSpan={4} style={{ padding: 18, textAlign: 'center', color: SAP.sec }}>No indirect overheads posted for this period.</td></tr>}
                    {expBuckets.map((b) => {
                      const bOpen = openBucket[b.name] !== false; // default expanded
                      const isFixed = /fixed/i.test(b.name);
                      const headBg = isFixed ? '#eaf2ff' : '#fef3e2';
                      const headColor = isFixed ? SAP.blue : '#a85d00';
                      const showTree = expDetail === 'detailed' && bOpen;
                      return (
                        <React.Fragment key={b.name}>
                          {/* Fixed / Variable head row (= its total) */}
                          <tr onClick={() => setOpenBucket((s) => ({ ...s, [b.name]: !(s[b.name] !== false) }))}
                            style={{ background: headBg, color: headColor, cursor: 'pointer', borderTop: `2px solid ${headColor}33` }}>
                            <td style={{ padding: '9px 16px', fontWeight: 800, letterSpacing: 0.2 }}>{expDetail === 'detailed' && <Toggle open={bOpen} />}{b.name}</td>
                            <td style={{ ...num, fontWeight: 800 }}>{inr(b.amount)}</td>
                            <td style={{ ...num, color: SAP.sec }}>{pctTxt(d.indirect.expense ? b.amount / d.indirect.expense * 100 : 0)}</td>
                            <td style={{ ...num, color: SAP.sec }}>{pctTxt(b.pctOfSales != null ? b.pctOfSales : (d.totals.sales ? b.amount / d.totals.sales * 100 : 0))}</td>
                          </tr>
                          {/* sub-group rows → ledger rows (detailed view only) */}
                          {showTree && (b.groups || []).map((g) => {
                            const gKey = `${b.name}|${g.name}`;
                            const gOpen = openExp[gKey] !== false; // default expanded
                            return (
                              <React.Fragment key={gKey}>
                                <tr onClick={() => setOpenExp((s) => ({ ...s, [gKey]: !(s[gKey] !== false) }))}
                                  style={{ background: SAP.subBg, color: SAP.subText, cursor: 'pointer', borderBottom: `1px solid ${SAP.borderLt}` }}>
                                  <td style={{ padding: '7px 16px 7px 34px', fontWeight: 700 }}><Toggle open={gOpen} />{g.name}</td>
                                  <td style={{ ...num, fontWeight: 700, color: SAP.red }}>{inr(g.amount)}</td>
                                  <td style={{ ...num, color: SAP.sec }}>{pctTxt(g.pctOfBucket != null ? g.pctOfBucket : (b.amount ? g.amount / b.amount * 100 : 0))}</td>
                                  <td style={{ ...num, color: SAP.sec }}>{pctTxt(g.pctOfSales)}</td>
                                </tr>
                                {gOpen && (g.ledgers || []).map((l, i) => (
                                  <tr key={i} onClick={() => setDrillLedger(l.name)}
                                    style={{ background: i % 2 ? SAP.rowAlt : '#fff', borderBottom: `1px solid ${SAP.borderLt}`, cursor: 'pointer' }}
                                    title="Drill to vouchers">
                                    <td style={{ padding: '5px 16px 5px 56px', color: SAP.text }}>{l.name}<span style={{ color: SAP.blue, fontWeight: 700, marginLeft: 6 }}>›</span></td>
                                    <td style={{ ...num, color: SAP.red }}>{inr(l.amount)}</td>
                                    <td style={{ ...num, color: SAP.sec }}>{pctTxt(l.pctOfGroup)}</td>
                                    <td style={{ ...num, color: SAP.sec }}>{pctTxt(l.pctOfSales)}</td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                    <tr style={{ background: '#fff3f3', color: SAP.red, fontWeight: 800, borderTop: '2px solid #ffb3b3', borderBottom: '1px solid #ffb3b3' }}>
                      <td style={{ padding: '10px 16px' }}>TOTAL INDIRECT EXPENSES</td>
                      <td style={num}>{inr(d.indirect.expense)}</td>
                      <td style={num} />
                      <td style={num}>{pctTxt(d.totals.sales ? d.indirect.expense / d.totals.sales * 100 : 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </FCard>

            {/* Section C — profit bridge */}
            <FCard title="Section C — Profit Bridge (Gross Profit → Net Profit)" badge={<Badge>✓ {d.bridge.result}</Badge>}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  <tr style={{ background: SAP.greenBg, color: SAP.greenDk, fontWeight: 700 }}>
                    <td style={{ padding: '10px 16px', width: '62%' }}>Gross Profit (All Modules)</td>
                    <td style={num}>{inr(d.bridge.grossProfit)}</td>
                    <td style={{ ...num, width: '20%' }}>{pctTxt(d.totals.gpPct)} of Sales</td>
                  </tr>
                  {d.bridge.indirectIncome > 0 && (
                    <tr style={{ borderBottom: `1px solid ${SAP.borderLt}` }}>
                      <td style={{ padding: '7px 16px' }}>Add: Indirect Income</td>
                      <td style={{ ...num, color: SAP.greenDk }}>{inr(d.bridge.indirectIncome)}</td>
                      <td style={num} />
                    </tr>
                  )}
                  <tr style={{ borderBottom: `1px solid ${SAP.borderLt}` }}>
                    <td style={{ padding: '7px 16px' }}>Less: Indirect Expenses (Overheads)</td>
                    <td style={{ ...num, color: SAP.red }}>{paren(d.bridge.indirectExpense)}</td>
                    <td style={{ ...num, color: SAP.sec }}>{pctTxt(d.totals.sales ? d.bridge.indirectExpense / d.totals.sales * 100 : 0)}</td>
                  </tr>
                  <tr style={{ background: SAP.blueBg, color: '#003d99', fontWeight: 700 }}>
                    <td style={{ padding: '10px 16px' }}>NET PROFIT BEFORE TAX (PBT)</td>
                    <td style={num}>{inr(d.bridge.netProfit)}</td>
                    <td style={num}>{pctTxt(d.totals.sales ? d.bridge.netProfit / d.totals.sales * 100 : 0)} of Sales</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${SAP.borderLt}` }}>
                    <td style={{ padding: '7px 16px' }}>Less: Provision for Tax @ 25.17% <span style={{ color: SAP.label, fontSize: 10 }}>(estimated)</span></td>
                    <td style={{ ...num, color: SAP.red }}>{paren(tax)}</td>
                    <td style={{ ...num, color: SAP.sec }}>{pctTxt(d.totals.sales ? tax / d.totals.sales * 100 : 0)}</td>
                  </tr>
                  <tr style={{ background: SAP.shell, color: '#fff', fontWeight: 700, fontSize: 14 }}>
                    <td style={{ padding: '12px 16px' }}>★ &nbsp;NET PROFIT AFTER TAX (PAT)</td>
                    <td style={{ ...num, color: pat >= 0 ? '#4ade80' : '#fca5a5' }}>{inr(pat)}</td>
                    <td style={{ ...num, color: '#9fb4cc' }}>{pctTxt(d.totals.sales ? pat / d.totals.sales * 100 : 0)}</td>
                  </tr>
                </tbody>
              </table>
            </FCard>

            {/* Bottom row — Module GP ranking + Key profitability ratios (like the HTML) */}
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <FCard title="Module GP Ranking (by Gross Profit value)" badge={<Badge bg={SAP.blueBg} c={SAP.blue} bd="#b8d6ff">Top contributors</Badge>}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <tbody>
                    {ranking.map((m, i) => (
                      <tr key={m.key} style={{ borderBottom: `1px solid ${SAP.borderLt}`, background: i % 2 ? SAP.rowAlt : '#fff' }}>
                        <td style={{ padding: '8px 16px', color: SAP.text }}>{i + 1}. {m.icon} {m.name}</td>
                        <td style={{ ...num, color: SAP.greenDk, fontWeight: 600 }}>{compact(cur, m.gp)} <span style={{ color: gpColor(m.gpPct), fontWeight: 700 }}>({pctTxt(m.gpPct)})</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </FCard>
              <FCard title="Key Profitability Ratios" badge={<Badge>{period.label}</Badge>}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <tbody>
                    {ratios.map(([k, v], i) => (
                      <tr key={k} style={{ borderBottom: `1px solid ${SAP.borderLt}`, background: i % 2 ? SAP.rowAlt : '#fff' }}>
                        <td style={{ padding: '8px 16px', color: SAP.sec }}>{k}</td>
                        <td style={{ ...num, color: SAP.text, fontWeight: 600 }}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </FCard>
            </div>
          </>}
          {d && view === 'classic' && (
            <ClassicPnL d={d} cur={cur} mobile={mobile} branch={branch} to={period.to} tax={tax} pat={pat} periodTxt={classicPeriod} />
          )}
        </StateBox>
        )}
      </div>
      {drillFile && <FileVoucherDrill file={drillFile} cur={cur} mobile={mobile} onClose={() => setDrillFile(null)} />}
      {drillLedger && <LedgerVoucherDrill ledger={drillLedger} branch={branch} to={period.to} cur={cur} mobile={mobile} onClose={() => setDrillLedger(null)} />}
    </Wrap>
  );
}

/* ── Indirect Expenses: Detailed (full Fixed/Variable tree) ⇄ Summary (totals) ── */
function ExpDetailToggle({ view, setView }) {
  return (
    <div style={{ display: 'inline-flex', background: '#fff', border: `1px solid ${SAP.border}`, borderRadius: 6, overflow: 'hidden' }}>
      {[['detailed', 'Detailed'], ['summary', 'Summary']].map(([id, label]) => (
        <button key={id} onClick={(e) => { e.stopPropagation(); setView(id); }} style={{ padding: '5px 11px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: view === id ? SAP.blue : '#fff', color: view === id ? '#fff' : SAP.sec }}>{label}</button>
      ))}
    </div>
  );
}

/* ── view switcher (Fiori ⇄ Tally Classic) ───────────────────────────── */
function PnlViewSwitcher({ view, setView }) {
  return (
    <div style={{ display: 'inline-flex', background: '#fff', border: `1px solid ${SAP.border}`, borderRadius: 6, overflow: 'hidden' }}>
      {[['fiori', '▪ SAP Fiori'], ['classic', '▭ Tally Classic']].map(([id, label]) => (
        <button key={id} onClick={() => setView(id)} style={{ padding: '7px 14px', fontSize: 11.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: view === id ? SAP.blue : '#fff', color: view === id ? '#fff' : SAP.sec }}>{label}</button>
      ))}
    </div>
  );
}

/* ── Tally Classic (white) P&L view — Dr/Cr two-column, touch-drillable ── */
// Trading A/c (COGS vs Sales, balancing with Gross Profit c/d) stacked over the
// P&L A/c (indirect expenses + tax + net profit vs GP b/d). Tap any module to
// reach its booking files → vouchers → edit; tap any expense ledger to drill
// its postings → voucher → edit. Same live data & editor as the Fiori view.
function ClassicPnL({ d, cur, mobile, branch, to, tax, pat, periodTxt }) {
  const [drillModule, setDrillModule] = useState(null);
  const [drillLedger, setDrillLedger] = useState(null);
  const mono = { fontFamily: "'Courier New', Courier, monospace" };
  const company = (branch && branch !== 'ALL') ? (branch.code || branch) : 'All Branches — Consolidated';
  const modules = d.modules || [];
  const groups = d.indirect?.groups || [];
  const buckets = (Array.isArray(d.indirect?.buckets) && d.indirect.buckets.length)
    ? d.indirect.buckets
    : (groups.length ? [{ name: 'Indirect Expenses', amount: d.indirect.expense, groups }] : []);
  const indIncome = d.bridge?.indirectIncome || 0;
  const grossProfit = d.bridge?.grossProfit ?? d.totals.gp;

  // Trading account — Purchases/COGS (Dr) vs Sales (Cr); both sides total Nett Sales.
  const tradeLeft = [
    { label: 'Purchase Accounts (COGS)', amount: d.totals.cogs, group: true },
    ...modules.map((m) => ({ label: m.name, amount: m.cogs, sub: true, module: m, icon: m.icon })),
    { label: 'Gross Profit c/d', amount: grossProfit, result: true },
  ];
  // Supplier incentive is direct income → credited in the Trading A/c so COGS +
  // Gross Profit c/d (Dr) balances against Sales + Incentive (Cr): gp = sales + incentive − cogs.
  const incentive = d.totals.incentive || 0;
  const tradeRight = [
    { label: 'Sales Accounts', amount: d.totals.sales, group: true },
    ...modules.map((m) => ({ label: m.name, amount: m.sales, sub: true, module: m, icon: m.icon })),
    ...(incentive > 0 ? [{ label: 'Supplier Incentive (Direct Income)', amount: incentive }] : []),
  ];
  const tradeTotal = d.totals.sales + incentive;

  // Profit & Loss account — Indirect Exp (Fixed/Variable → sub-group → ledger) +
  // Tax + Net Profit (Dr) vs GP b/d + Indirect Income (Cr).
  const plLeft = [
    { label: 'Indirect Expenses', amount: d.indirect.expense, group: true },
    ...buckets.flatMap((b) => [
      { label: b.name, amount: b.amount, bucket: true },
      ...(b.groups || []).flatMap((g) => [
        { label: g.name, amount: g.amount, sub: true },
        ...(g.ledgers || []).map((l) => ({ label: l.name, amount: l.amount, ledger: l.name, leaf: true })),
      ]),
    ]),
    ...(tax > 0 ? [{ label: 'Provision for Tax @ 25.17% (est.)', amount: tax }] : []),
    { label: 'Net Profit (to Capital A/c)', amount: pat, result: true },
  ];
  const plRight = [
    { label: 'Gross Profit b/d', amount: grossProfit, result: true },
    ...(indIncome > 0 ? [{ label: 'Indirect Income', amount: indIncome }] : []),
  ];
  const plTotal = grossProfit + indIncome;

  const nett = d.totals.sales;
  const onRowClick = (r) => { if (r.module) setDrillModule(r.module); else if (r.ledger) setDrillLedger(r.ledger); };

  const Cell = ({ r, side }) => {
    const sep = side === 'cr' ? { borderLeft: '1px solid #d6d6d6' } : {};
    if (!r) return (<><td style={{ ...mono, ...sep }} /><td style={{ ...mono }} /></>);
    const clickable = !!(r.module || r.ledger);
    const color = r.result ? TALLY.green : (r.group || r.bucket) ? TALLY.head : '#1a1a1a';
    const pad = r.leaf ? 46 : r.sub ? 32 : r.bucket ? 20 : 12;
    return (
      <>
        <td onClick={clickable ? () => onRowClick(r) : undefined}
          className={clickable ? 'cl-drill' : undefined}
          style={{ padding: '2px 12px', paddingLeft: pad, color, fontWeight: (r.group || r.bucket || r.result) ? 700 : 400, cursor: clickable ? 'pointer' : 'default', whiteSpace: 'nowrap', ...sep, ...mono }}>
          {r.icon ? <span style={{ marginRight: 5 }}>{r.icon}</span> : null}{r.label}{clickable ? <span style={{ color: TALLY.gold, fontWeight: 700 }}> ›</span> : null}
        </td>
        <td onClick={clickable ? () => onRowClick(r) : undefined}
          style={{ padding: '2px 12px', textAlign: 'right', color, fontWeight: (r.result || r.bucket) ? 700 : 400, cursor: clickable ? 'pointer' : 'default', ...mono }}>{inr(r.amount)}</td>
      </>
    );
  };

  const Section = ({ left, right, total }) => {
    const n = Math.max(left.length, right.length);
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, ...mono }}>
        <colgroup><col style={{ width: '34%' }} /><col style={{ width: '16%' }} /><col style={{ width: '34%' }} /><col style={{ width: '16%' }} /></colgroup>
        <tbody>
          <tr style={{ color: TALLY.head, fontWeight: 700, background: '#f0f4fa', borderBottom: `2px solid ${TALLY.head}` }}>
            <td style={{ padding: '5px 12px', ...mono }}>Particulars (Dr)</td><td style={{ padding: '5px 12px', textAlign: 'right', ...mono }}>Amount</td>
            <td style={{ padding: '5px 12px', borderLeft: '1px solid #a9c2e0', ...mono }}>Particulars (Cr)</td><td style={{ padding: '5px 12px', textAlign: 'right', ...mono }}>Amount</td>
          </tr>
          {Array.from({ length: n }).map((_, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f4f4f4' }}><Cell r={left[i]} /><Cell r={right[i]} side="cr" /></tr>
          ))}
          <tr style={{ color: TALLY.head, fontWeight: 700, borderTop: `2px solid ${TALLY.head}`, borderBottom: `3px double ${TALLY.head}`, background: '#f0f4fa' }}>
            <td style={{ padding: '6px 12px', ...mono }}>Total</td><td style={{ padding: '6px 12px', textAlign: 'right', color: TALLY.gold, ...mono }}>{inr(total)}</td>
            <td style={{ padding: '6px 12px', borderLeft: '1px solid #a9c2e0', ...mono }}>Total</td><td style={{ padding: '6px 12px', textAlign: 'right', color: TALLY.gold, ...mono }}>{inr(total)}</td>
          </tr>
        </tbody>
      </table>
    );
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #b0b0b0', borderRadius: 4, overflow: 'hidden', margin: 12, ...mono }}>
      <style>{'.cl-drill:hover{background:#eef4fb;text-decoration:underline}'}</style>
      <div style={{ background: TALLY.titlebar, color: TALLY.head, padding: '5px 12px', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #a9c2e0' }}>
        <span>KBiz360 Books — {company}</span><span style={{ color: TALLY.gold }}>Profit &amp; Loss A/c</span>
      </div>
      <div style={{ textAlign: 'center', padding: '10px 8px 8px', borderBottom: `2px solid ${TALLY.head}` }}>
        <div style={{ color: TALLY.head, fontSize: 16, fontWeight: 700 }}>{company}</div>
        <div style={{ fontSize: 13 }}>Profit &amp; Loss A/c</div>
        <div style={{ color: TALLY.gold, fontSize: 11, fontWeight: 700 }}>{periodTxt}</div>
      </div>
      <div style={{ padding: '4px 0' }}>
        <Section left={tradeLeft} right={tradeRight} total={tradeTotal} />
      </div>
      <div style={{ borderTop: '1px dashed #c8c8c8', padding: '4px 0' }}>
        <Section left={plLeft} right={plRight} total={plTotal} />
      </div>
      <div style={{ background: TALLY.titlebar, color: TALLY.head, fontSize: 11, fontWeight: 700, padding: '4px 12px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, borderTop: `2px solid ${TALLY.head}`, ...mono }}>
        <span>Gross Profit : <span style={{ color: TALLY.green }}>{inr(grossProfit)} ({pctTxt(d.totals.gpPct)})</span></span>
        <span>Net Profit : <span style={{ color: TALLY.green }}>{inr(pat)} ({pctTxt(nett ? (pat / nett) * 100 : 0)})</span></span>
        <span>Nett Sales : {inr(nett)}</span>
      </div>
      <div style={{ background: '#d4d4d4', color: TALLY.head, fontSize: 11, fontWeight: 700, padding: '4px 12px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, borderTop: '1px solid #b0b0b0', ...mono }}>
        <span>Enter / Tap: Drill a module or expense ledger → voucher → edit (re-posts the journal)</span>
        <span>KBiz360 · live double-entry</span>
      </div>
      {drillModule && <ModuleVoucherDrill module={drillModule} cur={cur} mobile={mobile} onClose={() => setDrillModule(null)} />}
      {drillLedger && <LedgerVoucherDrill ledger={drillLedger} branch={branch} to={to} cur={cur} mobile={mobile} onClose={() => setDrillLedger(null)} />}
    </div>
  );
}

/* ════════════════════════ BALANCE SHEET (Classic ⇄ Fiori) ══════════════ */
const CURRENT_ASSETS = new Set(['Current Assets', 'Bank Accounts', 'Cash-in-Hand', 'Deposits (Asset)', 'Loans & Advances (Asset)', 'Stock-in-Hand', 'Sundry Debtors']);
const CURRENT_LIABS = new Set(['Current Liabilities', 'Duties & Taxes', 'Provisions', 'Sundry Creditors', 'Bank OD Accounts']);
const NETWORTH = new Set(['Capital Account', 'Reserves & Surplus', 'Profit & Loss A/c']);
const sumGroups = (rows, set) => (rows || []).filter((g) => set.has(g.group)).reduce((s, g) => s + (g.amount || 0), 0);

/* ════════════════════════════════════════════════════════════════════
   Balance-Sheet "As On Date" controls — reporting modes, quick filters,
   comparison, Summary/Detailed and PDF/Excel/Print export.

   A Balance Sheet is an "as on a date" statement: the backend accumulates
   every posting from inception up to `to`. So every mode below reduces to a
   primary as-on date `to` and an optional comparison as-on date `toPrev`,
   both fed to the same live useBalanceSheet hook + renderer.
   ════════════════════════════════════════════════════════════════════ */
const prevFyLabel = () => { const s = CUR_FY.startYear - 1; return `${s}-${String(s + 1).slice(2)}`; };
const monthEndISO = (key) => { const [y, m] = String(key).split('-').map(Number); return isoDate(new Date(y, m, 0)); };

const BS_QUICK = [
  ['today', 'Today'],
  ['month', 'Current Month-End'],
  ['quarter', 'Current Quarter-End'],
  ['ytd', 'YTD (Year-to-Date)'],
  ['cfy', 'Current Financial Year'],
  ['pfy', 'Previous Financial Year'],
  ['custom', 'Custom Date'],
];
const BS_COMPARE = [
  ['none', 'No comparison'],
  ['prevDate', 'vs Previous Date (1 yr ago)'],
  ['prevFY', 'vs Previous Financial Year'],
  ['prevMonthEnd', 'vs Previous Month-End'],
];
// Quick filter → the single "as on" cut-off the balance sheet is drawn to.
function bsQuickDate(quick, customDate) {
  switch (quick) {
    case 'today': return todayISO();
    case 'month': return monthEndISO(CUR_MONTH);
    case 'quarter': return CUR_QUARTER.endISO;
    case 'ytd': return todayISO();                 // FY-to-date position = as on today
    case 'cfy': return CUR_FY.endISO;              // 31-Mar of the current FY
    case 'pfy': return fyRange(prevFyLabel()).to;  // 31-Mar of the previous FY
    case 'custom': return customDate || todayISO();
    default: return todayISO();
  }
}
// Comparison mode → the prior "as on" date, derived from the primary `to`.
function bsCompareDate(mode, to) {
  if (!to || mode === 'none') return '';
  const d = new Date(to);
  switch (mode) {
    case 'prevDate': return isoDate(new Date(d.getFullYear() - 1, d.getMonth(), d.getDate()));
    case 'prevFY': { const sy = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return `${sy}-03-31`; }
    case 'prevMonthEnd': return isoDate(new Date(d.getFullYear(), d.getMonth(), 0));
    default: return '';
  }
}

// Segmented button group (light on the white toolbar, dark on the Fiori shell).
function Segmented({ value, onChange, options, dark }) {
  return (
    <div style={{ display: 'inline-flex', background: dark ? 'rgba(255,255,255,0.1)' : '#fff', border: `1px solid ${dark ? 'rgba(255,255,255,0.28)' : SAP.border}`, borderRadius: 6, overflow: 'hidden' }}>
      {options.map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)} style={{ padding: '6px 12px', fontSize: 11.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: value === id ? SAP.blue : 'transparent', color: value === id ? '#fff' : (dark ? '#dfe7ef' : SAP.sec) }}>{label}</button>
      ))}
    </div>
  );
}

// White filter band under the Fiori header: mode · as-on/range dates · compare · detail.
function BSToolbar({ mode, setMode, quick, setQuick, customDate, setCustomDate, rangeFrom, setRangeFrom, rangeTo, setRangeTo, cmp, setCmp, detail, setDetail, to, toPrev }) {
  const lbl = { fontSize: 10, fontWeight: 700, color: SAP.label, textTransform: 'uppercase', letterSpacing: 0.4 };
  const sel = { ...inp, width: 'auto', minHeight: 30, fontSize: 11.5, cursor: 'pointer' };
  const di = { ...inp, width: 'auto', minHeight: 30, fontSize: 11.5 };
  const fw = { display: 'flex', alignItems: 'center', gap: 6 };
  return (
    <div style={{ background: '#fff', border: `1px solid ${SAP.border}`, borderTop: 'none', padding: '10px 16px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={fw}><span style={lbl}>Mode</span><Segmented value={mode} onChange={setMode} options={[['asOn', 'As On Date'], ['range', 'Date Range']]} /></div>
      {mode === 'asOn' ? (
        <>
          <div style={fw}><span style={lbl}>As On</span>
            <select style={sel} value={quick} onChange={(e) => setQuick(e.target.value)}>{BS_QUICK.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            {quick === 'custom' && <input type="date" style={di} value={customDate} onChange={(e) => setCustomDate(e.target.value)} />}
          </div>
          <div style={fw}><span style={lbl}>Compare</span>
            <select style={sel} value={cmp} onChange={(e) => setCmp(e.target.value)}>{BS_COMPARE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </div>
        </>
      ) : (
        <>
          <div style={fw}><span style={lbl}>From</span><input type="date" style={di} value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} /></div>
          <div style={fw}><span style={lbl}>To</span><input type="date" style={di} value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} /></div>
        </>
      )}
      <div style={fw}><span style={lbl}>Detail</span><Segmented value={detail} onChange={setDetail} options={[['summary', 'Summary'], ['detailed', 'Detailed']]} /></div>
      <div style={{ marginLeft: 'auto', fontSize: 11, color: SAP.sec }}>
        {mode === 'range'
          ? <>Movement <strong style={{ color: SAP.text }}>{fmtDate(toPrev)}</strong> → <strong style={{ color: SAP.text }}>{fmtDate(to)}</strong></>
          : <>Position as on <strong style={{ color: SAP.text }}>{fmtDate(to)}</strong> · all postings since inception{toPrev ? <> · vs {fmtDate(toPrev)}</> : null}</>}
      </div>
    </div>
  );
}

// Prev / Difference / %-Change cells, shared by every comparison row. Renders
// nothing when not comparing; three dashes when there is no prior figure.
function DiffCells({ cur, prev, showPY, dark }) {
  if (!showPY) return null;
  const sec = dark ? '#9fb4cc' : SAP.sec;
  if (prev == null) return (<><td style={{ ...num, color: sec }}>—</td><td style={{ ...num, color: sec }}>—</td><td style={{ ...num, color: sec }}>—</td></>);
  const diff = cur - prev;
  const pct = (prev === 0 || !isFinite(prev)) ? null : (diff / Math.abs(prev)) * 100;
  const dc = diff >= 0 ? (dark ? '#7ee07e' : SAP.greenDk) : (dark ? '#ff9a9a' : SAP.red);
  return (<>
    <td style={{ ...num, color: sec }}>{inr(prev)}</td>
    <td style={{ ...num, color: dc }}>{diff === 0 ? '—' : (diff > 0 ? `+${inr(diff)}` : inr(diff))}</td>
    <td style={{ ...num, color: dc }}>{pct == null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`}</td>
  </>);
}

// ── Export: Excel (flatten to rows) + PDF/Print (printable HTML window) ──────
const bsEsc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function bsExportRows({ d, prev, prevMap, showPY, detail }) {
  const out = [];
  const cell = (side, level, name, amount, prevAmt) => {
    const a = Math.round(Number(amount) || 0);
    const r = { side, level, name, amount: a };
    if (showPY) {
      if (prevAmt == null) { r.prev = ''; r.diff = ''; r.pct = ''; }
      else { const p = Math.round(Number(prevAmt) || 0); r.prev = p; r.diff = a - p; r.pct = p === 0 ? '' : (((a - p) / Math.abs(p)) * 100).toFixed(1); }
    }
    out.push(r);
  };
  const side = (groups, name) => {
    for (const g of groups || []) {
      cell(name, 'Group', g.group, g.amount, showPY ? prevMap[g.group] : null);
      if (detail === 'detailed') {
        const { subs, direct } = splitSubGroups(g.ledgers);
        for (const sg of subs) { cell(name, 'Sub-Group', `  ${sg.name}`, sg.amount, null); for (const l of sg.ledgers) cell(name, 'Ledger', `    ${l.name}`, l.amount, null); }
        for (const l of direct) cell(name, 'Ledger', `    ${l.name}`, l.amount, null);
      }
    }
  };
  side(d.liabilities, 'Liabilities');
  cell('Liabilities', 'Total', 'TOTAL LIABILITIES', d.totalLiabilities, showPY ? prev?.totalLiabilities : null);
  side(d.assets, 'Assets');
  cell('Assets', 'Total', 'TOTAL ASSETS', d.totalAssets, showPY ? prev?.totalAssets : null);
  return out;
}

function buildBSHtml({ d, prev, prevMap, showPY, detail, cur, branch, curLabel, prevLabel }) {
  const money = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString('en-IN') : '—'; };
  const cols = 2 + (showPY ? 3 : 0);
  const diffTd = (c, p) => {
    if (!showPY) return '';
    if (p == null) return '<td class="r sec">—</td><td class="r sec">—</td><td class="r sec">—</td>';
    const diff = c - p, pct = p === 0 ? null : (diff / Math.abs(p)) * 100, cls = diff >= 0 ? 'pos' : 'neg';
    const ds = diff === 0 ? '—' : (diff > 0 ? '+' : '') + money(diff);
    const ps = pct == null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    return `<td class="r">${money(p)}</td><td class="r ${cls}">${ds}</td><td class="r ${cls}">${ps}</td>`;
  };
  const sideTable = (label, groups, total, totalLabel, prevTotal) => {
    let body = '';
    for (const g of groups || []) {
      body += `<tr class="grp"><td>${bsEsc(g.group)}</td><td class="r">${money(g.amount)}</td>${diffTd(g.amount, showPY ? prevMap[g.group] : null)}</tr>`;
      if (detail === 'detailed') {
        const { subs, direct } = splitSubGroups(g.ledgers);
        for (const sg of subs) {
          body += `<tr class="sub"><td>${bsEsc(sg.name)}</td><td class="r">${money(sg.amount)}</td>${diffTd(sg.amount, null)}</tr>`;
          for (const l of sg.ledgers) body += `<tr class="led"><td>${bsEsc(l.name)}</td><td class="r">${money(l.amount)}</td>${diffTd(l.amount, null)}</tr>`;
        }
        for (const l of direct) body += `<tr class="led"><td>${bsEsc(l.name)}</td><td class="r">${money(l.amount)}</td>${diffTd(l.amount, null)}</tr>`;
      }
    }
    const head = showPY
      ? `<th>Particulars</th><th class="r">${bsEsc(curLabel)}</th><th class="r">${bsEsc(prevLabel)}</th><th class="r">Difference</th><th class="r">% Chg</th>`
      : `<th>Particulars</th><th class="r">${bsEsc(curLabel)}</th>`;
    return `<table><thead><tr class="hd"><th colspan="${cols}">${bsEsc(label)}</th></tr><tr class="sh">${head}</tr></thead><tbody>${body}<tr class="tot"><td>${bsEsc(totalLabel)}</td><td class="r">${money(total)}</td>${diffTd(total, showPY ? prevTotal : null)}</tr></tbody></table>`;
  };
  const bal = d.balanced, asOnTxt = curLabel.replace('as at ', '');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Balance Sheet · ${bsEsc(branchLabel(branch))} · ${bsEsc(asOnTxt)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#222;background:#fff;padding:16px;max-width:1000px;margin:0 auto}
  h1{font-size:18px;color:#1d2d3e}.meta{color:#555;font-size:11px;margin:3px 0 12px}
  .banner{padding:8px 14px;border-radius:6px;font-weight:700;margin-bottom:14px;font-size:11.5px;border:1px solid ${bal ? '#b8ecb8' : '#ffb3b3'};background:${bal ? '#f1fdf1' : '#fff3f3'};color:${bal ? '#0d6b0d' : '#bb0000'}}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  th,td{padding:4px 10px;border-bottom:1px solid #eee;text-align:left}
  .r{text-align:right;font-variant-numeric:tabular-nums}
  .hd th{background:#1d2d3e;color:#fff;font-size:12px;padding:7px 10px;text-align:left}
  .sh th{background:#f0f3f4;color:#6a6d70;font-size:9.5px;text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid #d9d9d9}
  .grp td{background:#e8f0fb;color:#0a2955;font-weight:700;border-top:1px solid #b3ccf5}
  .sub td{background:#f3f7fc;color:#1a3a6e;font-weight:600;padding-left:26px}
  .led td{padding-left:40px;color:#32363a}
  .tot td{background:#1d2d3e;color:#fff;font-weight:700}
  .pos{color:#0d6b0d}.neg{color:#bb0000}.sec{color:#6a6d70}
  .ft{margin-top:10px;color:#888;font-size:10px;border-top:1px solid #ddd;padding-top:8px}
  @media print{body{padding:0}.noprint{display:none}}
</style></head><body>
  <div class="noprint" style="background:#f0f3f4;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:11px;color:#555">Use your browser's print dialog and choose <b>Save as PDF</b> to export. <button onclick="window.print()" style="margin-left:8px;padding:4px 10px;cursor:pointer">Print / Save PDF</button></div>
  <h1>Balance Sheet</h1>
  <div class="meta"><b>${bsEsc(branchLabel(branch))}</b> &nbsp;·&nbsp; ${bsEsc(cur)} (excl. GST) &nbsp;·&nbsp; ${bsEsc(curLabel)}${showPY ? ` &nbsp;·&nbsp; compared with ${bsEsc(prevLabel)}` : ''} &nbsp;·&nbsp; ${detail === 'summary' ? 'Summary' : 'Detailed'} view</div>
  <div class="banner">${bal ? '✓ Balanced' : '! Out of balance'} — Total Assets ${bsEsc(cur)}${money(d.totalAssets)} ${bal ? '=' : '≠'} Total Liabilities ${bsEsc(cur)}${money(d.totalLiabilities)} &nbsp;|&nbsp; Net Profit ${bsEsc(cur)}${money(d.netProfit)}</div>
  ${sideTable('Liabilities & Capital', d.liabilities, d.totalLiabilities, 'TOTAL LIABILITIES', prev?.totalLiabilities)}
  ${sideTable('Assets', d.assets, d.totalAssets, 'TOTAL ASSETS', prev?.totalAssets)}
  <div class="ft">KBiz360 Books · live double-entry (Tally 28-group master) · balances accumulated from inception up to ${bsEsc(asOnTxt)}. Computer-generated — no signature required.</div>
</body></html>`;
}

function openBSPrint(opts) {
  const html = buildBSHtml(opts);
  const w = window.open('', '_blank', 'width=980,height=800');
  if (!w) { window.alert('Please allow pop-ups to print or save the Balance Sheet as PDF.'); return; }
  w.document.open(); w.document.write(html); w.document.close(); w.focus();
  setTimeout(() => { try { w.print(); } catch { /* the page carries its own Print button */ } }, 400);
}

export function ReportBSLive({ branch }) {
  const cur = curOf(branch);
  const mobile = useMobile();
  const [view, setView] = useState('fiori');           // 'fiori' | 'classic'
  const [mode, setMode] = useState('asOn');            // 'asOn' | 'range' — default As On Date
  const [quick, setQuick] = useState('today');         // default cut-off = current date
  const [customDate, setCustomDate] = useState(todayISO());
  const [rangeFrom, setRangeFrom] = useState(CUR_FY.startISO);
  const [rangeTo, setRangeTo] = useState(todayISO());
  const [cmp, setCmp] = useState('none');              // comparison (As On mode only)
  const [detail, setDetail] = useState('detailed');    // 'summary' | 'detailed'

  // Every mode collapses to a primary as-on date + an optional comparison date.
  const to = mode === 'range' ? rangeTo : bsQuickDate(quick, customDate);
  const toPrev = mode === 'range' ? rangeFrom : bsCompareDate(cmp, to);
  const showPY = !!toPrev;

  const q = useBalanceSheet(branch, { to });
  const qP = useBalanceSheet(branch, { to: toPrev });
  const d = q.data;
  const prev = showPY ? qP.data : null;
  const prevMap = useMemo(() => {
    const m = {}; [...(prev?.liabilities || []), ...(prev?.assets || [])].forEach((g) => { m[g.group] = g.amount; }); return m;
  }, [prev]);

  const curLabel = `as at ${asOn(to)}`;
  const prevLabel = `as at ${asOn(toPrev)}`;

  const doExcel = () => {
    if (!d) return;
    const cols = [{ key: 'side', label: 'Side' }, { key: 'level', label: 'Level' }, { key: 'name', label: 'Particulars' }, { key: 'amount', label: `Amount ${curLabel} (${cur})` }];
    if (showPY) cols.push({ key: 'prev', label: `Previous ${prevLabel} (${cur})` }, { key: 'diff', label: `Difference (${cur})` }, { key: 'pct', label: '% Change' });
    exportToExcel(`Balance-Sheet_${branchLabel(branch)}_${to || 'latest'}`, cols, bsExportRows({ d, prev, prevMap, showPY, detail }));
  };
  const doPrint = () => { if (d) openBSPrint({ d, prev, prevMap, showPY, detail, cur, branch, curLabel, prevLabel }); };
  const expBtn = (dis) => ({ padding: '6px 11px', fontSize: 11, fontWeight: 600, border: '1px solid rgba(255,255,255,0.3)', borderRadius: 5, cursor: dis ? 'default' : 'pointer', background: 'rgba(255,255,255,0.1)', color: '#fff', opacity: dis ? 0.45 : 1 });

  return (
    <Wrap>
      <FioriHead
        system="KBiz360 · Finance"
        title={`Balance Sheet — ${curLabel}`}
        sub={<><strong>{branchLabel(branch)}</strong> &nbsp;|&nbsp; {cur} INR (excl. GST) &nbsp;|&nbsp; Tally 28-Group Master &nbsp;|&nbsp; balances from inception up to {asOn(to)}</>}
        right={<>
          <Segmented dark value={view} onChange={setView} options={[['fiori', '▪ Fiori'], ['classic', '▭ Classic']]} />
          <button onClick={doPrint} disabled={!d} style={expBtn(!d)}>⤓ PDF</button>
          <button onClick={doExcel} disabled={!d} style={expBtn(!d)}>⤓ Excel</button>
          <button onClick={doPrint} disabled={!d} style={expBtn(!d)}>🖨 Print</button>
        </>}
      />
      <BSToolbar
        mode={mode} setMode={setMode} quick={quick} setQuick={setQuick}
        customDate={customDate} setCustomDate={setCustomDate}
        rangeFrom={rangeFrom} setRangeFrom={setRangeFrom} rangeTo={rangeTo} setRangeTo={setRangeTo}
        cmp={cmp} setCmp={setCmp} detail={detail} setDetail={setDetail} to={to} toPrev={toPrev}
      />
      <div style={{ background: SAP.pageBg, padding: view === 'classic' ? 0 : 16, border: `1px solid ${SAP.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
        <StateBox q={q} empty={!d}>
          {d && (view === 'fiori'
            ? <FioriBS d={d} prev={prev} prevMap={prevMap} cur={cur} showPY={showPY} curLabel={curLabel} prevLabel={prevLabel} branch={branch} to={to} mobile={mobile} detail={detail} />
            : <ClassicBS d={d} cur={cur} curLabel={curLabel} detail={detail} />)}
        </StateBox>
      </div>
    </Wrap>
  );
}

/* ── Fiori vertical view ─────────────────────────────────────────────── */
function FioriBS({ d, prev, prevMap, cur, showPY, curLabel, prevLabel, branch, to, mobile, detail }) {
  const netWorth = sumGroups(d.liabilities, NETWORTH);
  const ca = sumGroups(d.assets, CURRENT_ASSETS), cl = sumGroups(d.liabilities, CURRENT_LIABS);
  const workingCap = ca - cl;
  const ratio = cl > 0 ? (ca / cl).toFixed(2) : '—';
  const [drillLedger, setDrillLedger] = useState(null);
  return (
    <>
      <div style={{ background: d.balanced ? SAP.greenBg : '#fff3f3', border: `1px solid ${d.balanced ? '#b8ecb8' : '#ffb3b3'}`, borderRadius: 8, padding: '11px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, fontWeight: 600, color: d.balanced ? SAP.greenDk : SAP.red }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: d.balanced ? SAP.green : SAP.red, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{d.balanced ? '✓' : '!'}</span>
        {d.balanced ? 'Balanced' : 'Out of balance'} — Total Assets {cur}{inr(d.totalAssets)} {d.balanced ? '=' : '≠'} Total Liabilities {cur}{inr(d.totalLiabilities)} &nbsp;|&nbsp; Net Profit {cur}{inr(d.netProfit)} from P&amp;L A/c
      </div>

      <KpiGrid>
        <Kpi tone="blue" label="Balance Sheet Total" value={compact(cur, d.totalAssets)} sub="Assets = Liabilities" />
        <Kpi tone="green" label="Net Worth" value={compact(cur, netWorth)} sub="Capital + P&L A/c" trend={prev && <Trend cur={netWorth} prev={sumGroups(prev.liabilities, NETWORTH)} />} />
        <Kpi tone="teal" label="Working Capital" value={compact(cur, workingCap)} sub="CA − CL" />
        <Kpi tone="purple" label="Current Ratio" value={ratio} sub={`CA ${compact(cur, ca)} / CL ${compact(cur, cl)}`} />
      </KpiGrid>

      <BSSideCard title="Liabilities — Tally Groups" rows={d.liabilities} total={d.totalLiabilities} totalLabel="TOTAL LIABILITIES"
        prevMap={prevMap} prevTotal={prev?.totalLiabilities} cur={cur} showPY={showPY} curLabel={curLabel} prevLabel={prevLabel} detail={detail} onPickLedger={detail === 'detailed' ? setDrillLedger : null} />
      <BSSideCard title="Assets — Tally Groups" rows={d.assets} total={d.totalAssets} totalLabel="TOTAL ASSETS"
        prevMap={prevMap} prevTotal={prev?.totalAssets} cur={cur} showPY={showPY} curLabel={curLabel} prevLabel={prevLabel} detail={detail} onPickLedger={detail === 'detailed' ? setDrillLedger : null} />

      <div style={{ background: '#fff', border: `1px solid ${SAP.border}`, borderRadius: 8, padding: '10px 18px', fontSize: 11, color: SAP.sec, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, boxShadow: SHADOW }}>
        <span><strong style={{ color: SAP.text }}>Group Master:</strong> Tally Default 28 Groups &nbsp;|&nbsp; <strong style={{ color: SAP.text }}>Net Profit:</strong> {cur}{inr(d.netProfit)} (from P&amp;L A/c) &nbsp;|&nbsp; <strong style={{ color: SAP.text }}>Tax:</strong> Excl. GST</span>
      </div>
      {drillLedger && <LedgerVoucherDrill ledger={drillLedger} branch={branch} to={to} cur={cur} mobile={mobile} onClose={() => setDrillLedger(null)} />}
    </>
  );
}
// Split a group's ledgers into named Tally sub-groups (carried on each ledger's
// `subGroup`) and the ledgers that hang directly under the 28-group head.
function splitSubGroups(ledgers) {
  const direct = [];
  const map = new Map(); // subGroup name → { name, amount, ledgers }
  for (const l of (ledgers || [])) {
    const s = (l.subGroup || '').trim();
    if (!s) { direct.push(l); continue; }
    if (!map.has(s)) map.set(s, { name: s, amount: 0, ledgers: [] });
    const sg = map.get(s);
    sg.amount += l.amount || 0;
    sg.ledgers.push(l);
  }
  const subs = [...map.values()].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  return { subs, direct };
}

// A single leaf-ledger row (tap → drill into its postings → voucher → edit).
function bsLedgerRow(l, i, indent, onPickLedger, showPY) {
  return (
    <tr key={`${indent}-${i}-${l.name}`} onClick={() => onPickLedger && onPickLedger(l.name)}
      style={{ background: i % 2 ? SAP.rowAlt : '#fff', borderBottom: `1px solid ${SAP.borderLt}`, cursor: onPickLedger ? 'pointer' : 'default' }}>
      <td style={{ padding: `5px 16px 5px ${indent}px`, color: SAP.text }}>{l.name}{onPickLedger ? <span style={{ color: SAP.blue, fontWeight: 700, marginLeft: 6 }}>›</span> : null}</td>
      <td style={num}>{inr(l.amount)}</td>
      <DiffCells cur={l.amount} prev={null} showPY={showPY} />
    </tr>
  );
}

function BSSideCard({ title, rows, total, totalLabel, prevMap, prevTotal, cur, showPY, curLabel, prevLabel, onPickLedger, detail }) {
  const [open, setOpen] = useState({});
  const [openSub, setOpenSub] = useState({});
  const summary = detail === 'summary';
  return (
    <FCard title={title} sub={summary ? 'Major Tally groups — high-level position' : 'Click a group → sub-group (if any) → ledger → voucher'} badge={<Badge bg="#fef0e0" c={SAP.orange} bd="#ffcf9e">Tally Logic</Badge>}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead><tr>
            <Th w={showPY ? '40%' : '64%'}>Group / Sub-group / Ledger</Th>
            <Th right>{curLabel} ({cur})</Th>
            {showPY && <><Th right>{prevLabel} ({cur})</Th><Th right>Δ ({cur})</Th><Th right>Δ %</Th></>}
          </tr></thead>
          <tbody>
            {rows.map((g, gi) => {
              const { subs, direct } = splitSubGroups(g.ledgers);
              const hasChildren = !summary && (subs.length > 0 || direct.length > 0);
              const isOpen = !!open[g.group];
              const pv = showPY ? (prevMap[g.group] ?? null) : null;
              const rowBg = g.isResult ? SAP.greenBg : SAP.grpBg;
              const rowColor = g.isResult ? SAP.greenDk : SAP.grpText;
              return (
                <React.Fragment key={g.group + gi}>
                  <tr onClick={() => hasChildren && setOpen((s) => ({ ...s, [g.group]: !s[g.group] }))}
                    style={{ background: rowBg, color: rowColor, cursor: hasChildren ? 'pointer' : 'default', borderTop: '2px solid #b3ccf5', fontWeight: 700 }}>
                    <td style={{ padding: '9px 16px' }}>{hasChildren ? <Toggle open={isOpen} /> : <span style={{ marginRight: 7 }}>{g.isResult ? '●' : '•'}</span>}{g.group}</td>
                    <td style={num}>{inr(g.amount)}</td>
                    <DiffCells cur={g.amount} prev={pv} showPY={showPY} />
                  </tr>
                  {/* Sub-groups (if the ledgers carry one) → expand to their ledgers */}
                  {!summary && isOpen && subs.map((sg) => {
                    const sk = `${g.group}|${sg.name}`;
                    const so = !!openSub[sk];
                    return (
                      <React.Fragment key={sk}>
                        <tr onClick={() => setOpenSub((s) => ({ ...s, [sk]: !s[sk] }))}
                          style={{ background: SAP.subBg, color: SAP.subText, cursor: 'pointer', borderBottom: `1px solid ${SAP.borderLt}`, fontWeight: 600 }}>
                          <td style={{ padding: '6px 16px 6px 38px' }}><Toggle open={so} />{sg.name}<span style={{ fontSize: 9, color: SAP.label, marginLeft: 6 }}>· {sg.ledgers.length} ledger{sg.ledgers.length > 1 ? 's' : ''}</span></td>
                          <td style={{ ...num, fontWeight: 600 }}>{inr(sg.amount)}</td>
                          <DiffCells cur={sg.amount} prev={null} showPY={showPY} />
                        </tr>
                        {so && sg.ledgers.map((l, i) => bsLedgerRow(l, i, 62, onPickLedger, showPY))}
                      </React.Fragment>
                    );
                  })}
                  {/* Ledgers with no sub-group hang directly under the 28-group head */}
                  {!summary && isOpen && direct.map((l, i) => bsLedgerRow(l, i, 48, onPickLedger, showPY))}
                </React.Fragment>
              );
            })}
            <tr style={{ background: SAP.shell, color: '#fff', fontWeight: 700, borderTop: `2px solid ${SAP.blue}` }}>
              <td style={{ padding: '11px 16px' }}>{totalLabel}</td>
              <td style={num}>{inr(total)}</td>
              <DiffCells cur={total} prev={showPY ? (prevTotal ?? null) : null} showPY={showPY} dark />
            </tr>
          </tbody>
        </table>
      </div>
    </FCard>
  );
}

/* ── Tally Classic (white) view ──────────────────────────────────────── */
const sideRows = (groups, summary) => (groups || []).flatMap((g) => {
  if (summary) return [{ label: g.group, amount: g.amount, group: true, result: g.isResult }];
  const { subs, direct } = splitSubGroups(g.ledgers);
  return [
    { label: g.group, amount: g.amount, group: true, result: g.isResult },
    ...subs.flatMap((s) => [
      { label: s.name, amount: s.amount, sub: true },
      ...s.ledgers.map((l) => ({ label: l.name, amount: l.amount })),
    ]),
    ...direct.map((l) => ({ label: l.name, amount: l.amount })),
  ];
});
function ClassicBS({ d, cur, curLabel, detail }) {
  const summary = detail === 'summary';
  const left = sideRows(d.liabilities, summary), right = sideRows(d.assets, summary);
  const n = Math.max(left.length, right.length);
  const mono = { fontFamily: "'Courier New', Courier, monospace" };
  const Cell = ({ r }) => r ? (
    <>
      <td style={{ padding: '2px 12px', color: r.group || r.sub ? TALLY.head : '#444', fontWeight: r.group ? 700 : r.sub ? 600 : 400, paddingLeft: r.group ? 12 : r.sub ? 28 : 44, ...mono }}>{r.label}</td>
      <td style={{ padding: '2px 12px', textAlign: 'right', color: r.result ? TALLY.green : '#1a1a1a', fontWeight: r.result || r.sub ? 600 : 400, ...mono }}>{inr(r.amount)}</td>
    </>
  ) : (<><td /><td /></>);
  const ca = sumGroups(d.assets, CURRENT_ASSETS), cl = sumGroups(d.liabilities, CURRENT_LIABS);
  return (
    <div style={{ background: '#fff', border: '1px solid #b0b0b0', borderRadius: 4, overflow: 'hidden', ...mono, margin: 12 }}>
      <div style={{ background: TALLY.titlebar, color: TALLY.head, padding: '5px 12px', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #a9c2e0' }}>
        <span>KBiz360 Books — {branchLabelClassic(d)}</span><span style={{ color: TALLY.gold }}>Balance Sheet</span>
      </div>
      <div style={{ textAlign: 'center', padding: '10px 8px 8px', borderBottom: `2px solid ${TALLY.head}` }}>
        <div style={{ color: TALLY.head, fontSize: 16, fontWeight: 700 }}>{branchLabelClassic(d)}</div>
        <div style={{ fontSize: 13 }}>Balance Sheet</div>
        <div style={{ color: TALLY.gold, fontSize: 11, fontWeight: 700 }}>{curLabel}</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          <tr style={{ color: TALLY.head, fontWeight: 700, background: '#f0f4fa', borderBottom: `2px solid ${TALLY.head}` }}>
            <td style={{ padding: '5px 12px', ...mono }}>Liabilities</td><td style={{ padding: '5px 12px', textAlign: 'right', ...mono }}>{curLabel}</td>
            <td style={{ padding: '5px 12px', ...mono }}>Assets</td><td style={{ padding: '5px 12px', textAlign: 'right', ...mono }}>{curLabel}</td>
          </tr>
          {Array.from({ length: n }).map((_, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}><Cell r={left[i]} /><Cell r={right[i]} /></tr>
          ))}
          <tr style={{ color: TALLY.head, fontWeight: 700, borderTop: `2px solid ${TALLY.head}`, borderBottom: `3px double ${TALLY.head}`, background: '#f0f4fa' }}>
            <td style={{ padding: '6px 12px', ...mono }}>Total</td><td style={{ padding: '6px 12px', textAlign: 'right', color: TALLY.gold, ...mono }}>{inr(d.totalLiabilities)}</td>
            <td style={{ padding: '6px 12px', ...mono }}>Total</td><td style={{ padding: '6px 12px', textAlign: 'right', color: TALLY.gold, ...mono }}>{inr(d.totalAssets)}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ background: TALLY.titlebar, color: TALLY.head, fontSize: 11, fontWeight: 700, padding: '4px 12px', display: 'flex', justifyContent: 'space-between', borderTop: `2px solid ${TALLY.head}`, ...mono }}>
        <span>Working Capital : <span style={{ color: TALLY.green }}>{inr(ca - cl)}</span></span>
        <span>Net Profit : <span style={{ color: TALLY.green }}>{inr(d.netProfit)}</span></span>
        <span>Diff in Op Balance : <span style={{ color: TALLY.green }}>{d.balanced ? '0.00' : inr(d.totalLiabilities - d.totalAssets)}</span></span>
      </div>
    </div>
  );
}
const branchLabelClassic = (d) => (d?.filter?.branch && d.filter.branch !== 'ALL' ? d.filter.branch : 'All Branches — Consolidated');

/* ════════════════════════ AR / AP AGEING (Phase 2, live) ═══════════════════ */
export function ReceivablesLive({ branch }) { return <AgeingReport branch={branch} side="receivables" />; }
export function PayablesLive({ branch }) { return <AgeingReport branch={branch} side="payables" />; }

const BUCKETS = [['d0', '0–30'], ['d30', '31–60'], ['d60', '61–90'], ['d90', '90+']];
const bucketColor = (k) => ({ d0: SAP.greenDk, d30: SAP.gold, d60: SAP.orange, d90: SAP.red }[k] || SAP.text);

function AgeingReport({ branch, side }) {
  const cur = curOf(branch);
  const mobile = useMobile();
  const q = useAgeing(branch);
  const d = q.data;
  const data = d ? d[side] : null;
  const rows = data?.rows || [];
  const totals = data?.totals || { d0: 0, d30: 0, d60: 0, d90: 0, total: 0 };
  const [drillLedger, setDrillLedger] = useState(null);

  const isRec = side === 'receivables';
  const partyLabel = isRec ? 'Customer' : 'Supplier';
  const overdue = totals.d30 + totals.d60 + totals.d90;
  const share = (x) => (totals.total > 0 ? (x / totals.total) * 100 : 0);

  return (
    <Wrap>
      <FioriHead
        system="KBiz360 · Finance"
        title={isRec ? 'Accounts Receivable — Ageing' : 'Accounts Payable — Ageing'}
        sub={<><strong>{branchLabel(branch)}</strong> &nbsp;|&nbsp; {cur} incl. GST &nbsp;|&nbsp; as of {d?.asOf || '—'} &nbsp;|&nbsp; FIFO · live double-entry</>}
      />
      <div style={{ background: SAP.pageBg, padding: 16, border: `1px solid ${SAP.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
        <StateBox q={q} empty={!data || rows.length === 0}>
          <KpiGrid>
            <Kpi tone="blue" label="Total Outstanding" value={compact(cur, totals.total)} sub={`${rows.length} ${partyLabel.toLowerCase()}s`} />
            <Kpi tone="green" label="Current (0–30)" value={compact(cur, totals.d0)} sub={pctTxt(share(totals.d0))} />
            <Kpi tone="orange" label="Overdue (>30 days)" value={compact(cur, overdue)} sub={pctTxt(share(overdue))} />
            <Kpi tone="red" label="Critical (90+ days)" value={compact(cur, totals.d90)} sub={pctTxt(share(totals.d90))} />
          </KpiGrid>

          <FCard title={`${partyLabel}-wise Ageing`} sub="Tap a row to drill into the ledger and edit its vouchers"
            badge={<Badge bg={SAP.blueBg} c={SAP.blue} bd="#b8d6ff">{rows.length} {partyLabel.toLowerCase()}s</Badge>}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead><tr><Th w="30%">{partyLabel}</Th>{BUCKETS.map(([, lbl]) => <Th key={lbl} right>{lbl}</Th>)}<Th right>Total</Th></tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.party + i} onClick={() => setDrillLedger(r.party)}
                      style={{ background: i % 2 ? SAP.rowAlt : '#fff', borderBottom: `1px solid ${SAP.borderLt}`, cursor: 'pointer' }}>
                      <td style={{ padding: '7px 16px', color: SAP.text, fontWeight: 600 }}>{r.party}<span style={{ color: SAP.blue, fontWeight: 700, marginLeft: 6 }}>›</span></td>
                      {BUCKETS.map(([k]) => <td key={k} style={{ ...num, color: r[k] ? bucketColor(k) : SAP.label }}>{inr(r[k])}</td>)}
                      <td style={{ ...num, fontWeight: 700, color: SAP.text }}>{inr(r.total)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: SAP.shell, color: '#fff', fontWeight: 700, borderTop: `2px solid ${SAP.blue}` }}>
                    <td style={{ padding: '10px 16px' }}>TOTAL</td>
                    {BUCKETS.map(([k]) => <td key={k} style={num}>{inr(totals[k])}</td>)}
                    <td style={num}>{inr(totals.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </FCard>
        </StateBox>
        {drillLedger && <LedgerVoucherDrill ledger={drillLedger} branch={branch} to="" cur={cur} mobile={mobile} onClose={() => setDrillLedger(null)} />}
      </div>
    </Wrap>
  );
}
