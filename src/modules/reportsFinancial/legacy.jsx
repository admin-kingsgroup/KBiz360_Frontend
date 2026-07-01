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
import { card, inp, bc } from '../../core/styles';
import { localeOf } from '../../core/format';
import { periodRange } from '../../core/period';
import { useModulePL, useBalanceSheet, useLedgerStatement, useAgeing, branchCode } from '../../core/useAccounting';
import { computeNetAgeing } from './netAgeing';
import { splitSubGroups, bsFioriExpandKeys, pnlFioriExpandKeys } from './fioriExpand';
import { share, topByGP, lowestGp } from './statementInsights';
import { MiniBar, RailCard, Stat } from '../../core/insightsUI';
import { apiGet, getAuthToken } from '../../core/api';
import { exportToExcel } from '../../core/exportExcel';
import { CUR_FY, CUR_MONTH, CUR_QUARTER, todayISO, isoDate, fmtDate, fyMonthKeys, monthLabel, rangeNote } from '../../core/dates';
import { VoucherEditor } from '../accountingLive';
import { OutstandingOnAccount } from '../outstanding';
import { useMobile } from '../../core/hooks';
import { moduleDrillRows, moduleExpandKeys, moduleDetailKey, moduleHasDetail, moduleSideRows } from '../../core/pnlDetail';
import { openPrintPreview } from '../../core/PrintPreview';
import { LedgerActions } from '../../core/ledgerActions';
import { toast } from '../../core/ux/toast';
import { openLedgerModal } from '../../core/LedgerModalHost';
import { pushModal } from '../../core/ux/modalStore';
import { clickable as keyActivate } from '../../core/ux/clickable';
import { CONSOLIDATED_LABEL } from '../../core/data';

/* ── palette (SAP Fiori) ─────────────────────────────────────────────── */
const SAP = {
  shell: '#1d2d3e', border: '#cdd1d8', borderLt: '#dfe2e7',
  text: '#32363a', sec: '#6a6d70', label: '#8696a9',
  blue: '#2563eb', blueBg: '#e8f0ff', green: '#16a34a', greenBg: '#e8f6ed', greenDk: '#15803d',
  red: '#bb0000', teal: '#04838f', purple: '#5c30a2', orange: '#e9730c', gold: '#c87b00',
  rowHover: '#f0f5ff', rowAlt: '#fafafa', headerBg: '#f0f3f4', pageBg: '#f5f6f7',
  grpBg: '#e8f0fb', grpText: '#0a2955', subBg: '#f3f7fc', subText: '#1a3a6e',
};
const SHADOW = '0 1px 4px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.08)';
const TALLY = { head: '#14396b', titlebar: '#dbe7f5', gold: '#b8860b', green: '#1a7a1a' };

/* ── number/format helpers ───────────────────────────────────────────── */
// `bc()` resolves currency off `branch.code` (with an 'ALL' special-case), so a bare
// branch-code string ('NBO') would fall back to BOM/₹. Normalise a string code into
// `{ code }` first so per-branch sections in the consolidated view get their OWN currency.
const curOf = (branch) => bc(typeof branch === 'string' && branch !== 'ALL' ? { code: branch } : branch).cur;
const branchLabel = (branch) => (!branch || branch === 'ALL' ? CONSOLIDATED_LABEL : (branch.code || branch));
const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString('en-IN') : '—'; };
const paren = (n) => { const v = Math.round(Number(n) || 0); return v ? `(${v.toLocaleString('en-IN')})` : '—'; };
const compact = (cur, n) => {
  const v = Number(n) || 0, a = Math.abs(v);
  if (a >= 1e7) return `${cur}${(v / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${cur}${(v / 1e5).toFixed(2)} L`;
  return `${cur}${Math.round(v).toLocaleString(localeOf(cur))}`;
};
// Branch-locale variant of `compact` for the operational AR/AP screens. Keeps the
// Cr/L Indian compaction (it's a magnitude grouping, not a tax/value change) but
// groups the plain-number tail in the branch's currency locale.
const compactCur = (cur, n) => {
  const v = Number(n) || 0, a = Math.abs(v);
  if (a >= 1e7) return `${cur}${(v / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${cur}${(v / 1e5).toFixed(2)} L`;
  return `${cur}${Math.round(v).toLocaleString(localeOf(cur))}`;
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
function Wrap({ children, wide }) {
  // `wide` (P&L / Balance Sheet statements) uses far more of the screen so the
  // single-column views don't sit as a skinny ribbon in a sea of whitespace.
  return <div style={{ maxWidth: wide ? 1640 : 1180, margin: '0 auto', padding: '4px 6px 28px' }}>{children}</div>;
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
  if (q.isLoading) return <div style={{ ...card, padding: 16, borderRadius: '0 0 8px 8px' }}>{Array.from({ length: 8 }).map((_, r) => <div key={r} className="kb-skeleton" style={{ height: 16, borderRadius: 6, marginBottom: 8, opacity: Math.max(0.4, 1 - r * 0.09) }} />)}</div>;
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
const KpiGrid = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,170px),1fr))', gap: 12, marginBottom: 14 }}>{children}</div>;
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

// MiniBar / RailCard / Stat now live in core/insightsUI (shared across modules).
// Statement grid: KPI ribbon (screen only) over a [ statement | insights rail ]
// two-column layout that collapses to one column on narrower screens.
const STMT_GRID_CSS = '@media (max-width:1180px){.stmt-grid{grid-template-columns:1fr !important}.stmt-rail{order:-1}}';
// Booking-file drill rows (shared by single-leaf modules and sub-centres).
// Clickable when the file carries editable vouchers → opens the voucher drill.
function FileRows({ files, indent = 48, onPick, cur = '₹' }) {
  const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(localeOf(cur)) : '—'; };
  return (files || []).map((f, i) => {
    const drillable = !f.aggregate && (f.vouchers || []).length > 0;
    return (
      <tr key={(f.ref || '') + i} {...keyActivate(() => drillable && onPick && onPick(f))}
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
function Modal({ title, onClose, mobile, children, wide }) {
  useEffect(() => pushModal(onClose), []); // Esc closes the topmost modal
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.45)', zIndex: 800, display: 'flex', justifyContent: 'center', alignItems: mobile ? 'stretch' : 'flex-start', padding: mobile ? 0 : '5vh 12px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: mobile ? '100%' : (wide ? 'min(1040px, 97vw)' : 'min(720px, 96vw)'), height: mobile ? '100%' : 'auto', maxHeight: mobile ? '100%' : '90vh', borderRadius: mobile ? 0 : 10, overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
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
  const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(localeOf(cur)) : '—'; };
  const [vid, setVid] = useState(null);
  const vouchers = file?.vouchers || [];
  return (
    <Modal title={vid ? 'Edit Voucher' : `${file.ref} — ${vouchers.length} voucher(s)`} onClose={onClose} mobile={mobile}>
      {vid
        ? <VoucherEditor voucherId={vid} cur={cur} onBack={() => setVid(null)} onClose={onClose} />
        : (vouchers.length === 0
          ? <div style={{ padding: 24, textAlign: 'center', color: SAP.sec, fontSize: 12 }}>Aggregated row — open a specific sub-centre to reach individual vouchers.</div>
          : vouchers.map((vh) => (
            <div key={vh.id} {...keyActivate(() => setVid(vh.id))} style={tapRow}>
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
  const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(localeOf(cur)) : '—'; };
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
        <VoucherEditor voucherId={vid} cur={cur} onBack={() => setVid(null)} onClose={onClose} />
      ) : file ? (
        (file.vouchers || []).map((vh) => (
          <div key={vh.id} {...keyActivate(() => setVid(vh.id))} style={tapRow}>
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
          <div key={(f.ref || '') + i} {...keyActivate(() => setFile(f))} style={tapRow}>
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

// Ledger drill — now a thin shim onto the ONE unified ledger UI. Every P&L /
// Balance Sheet / GP ledger click flows through here, so they all open the exact
// same `LedgerAccountView` modal (Statement · Bill-wise · Cost-Centre · Components),
// scoped to the top-right global branch. (No bespoke ledger view any more.)
function LedgerVoucherDrill({ ledger, onClose }) {
  useEffect(() => {
    if (ledger) openLedgerModal(ledger);   // branch comes from the global selector
    if (onClose) onClose();                  // immediately release local drill state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
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
function resolvePeriod(mode, fy, custom, branch) {
  if (mode === 'all') return { from: '', to: '', label: 'All Time', note: rangeNote('all', { to: todayISO() }) };
  if (mode === 'custom') {
    const from = custom.from || CUR_FY.startISO, to = custom.to || todayISO();
    return { from, to, label: 'Custom Range', note: rangeNote('range', { from, to }) };
  }
  // Uniform presets (per-branch FY) via the shared period util.
  if (['today', 'week', 'mtd', 'qtd', 'cfy', 'lfy'].includes(mode)) {
    const r = periodRange(mode, { branch });
    return { from: r.from, to: r.to, label: r.label, note: rangeNote('range', { from: r.from, to: r.to }) };
  }
  const r = fyRange(fy);
  const to = fy === CUR_FY.label ? todayISO() : r.to;       // current FY → year-to-date
  return { from: r.from, to, label: `FY ${fy} YTD`, note: rangeNote('range', { from: r.from, to }) };
}
// comparison window: previous FY (ytd) or the equal-length window immediately
// before a custom range.
function priorPeriod(mode, fy, custom, period) {
  // Custom + short presets compare against the equal-length window immediately before.
  if (mode === 'custom' || ['today', 'week', 'mtd', 'qtd'].includes(mode)) {
    const ref = mode === 'custom' ? custom : (period || {});
    const a = new Date(ref.from), b = new Date(ref.to);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    const days = Math.round((b - a) / 86400000) + 1;
    const pe = new Date(a); pe.setDate(pe.getDate() - 1);
    const ps = new Date(pe); ps.setDate(ps.getDate() - days + 1);
    return { from: isoDate(ps), to: isoDate(pe), label: 'Previous period' };
  }
  // LFY's comparison window is the FY *before* last — not last FY itself. The `fy`
  // state isn't shown/updated in LFY mode (it stays at the current FY), so basing
  // the prior on it made the comparison resolve back to the LFY period and every
  // Trend/Δ showed 0% (a period compared against itself). Anchor on the LFY label.
  if (mode === 'lfy') {
    const lfyLabel = `${CUR_FY.startYear - 1}-${String(CUR_FY.startYear).slice(2)}`;
    const p = fyPrior(lfyLabel);
    return { from: p.from, to: p.to, label: 'FY prior' };
  }
  // CFY is year-to-date (FY start → today), so compare against the SAME window one
  // year earlier — not the full prior FY — otherwise a part-year is measured against a
  // 12-month total and every Trend/Δ is overstated. (month/quarter keep the prior-FY
  // comparison since they're full, fixed-length periods.)
  if (mode === 'cfy' && period?.from && period?.to) {
    const shiftYr = (iso) => { const d = new Date(iso); if (isNaN(d.getTime())) return iso; d.setFullYear(d.getFullYear() - 1); return isoDate(d); };
    return { from: shiftYr(period.from), to: shiftYr(period.to), label: 'Prior YTD' };
  }
  const p = fyPrior(fy); // month / quarter → prior FY
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
function PnlPeriodBar({ mode, setMode, fy, setFy, compare, setCompare, custom, setCustom, view, setView, showView, showZero, setShowZero, canExport, onExport }) {
  const MODES = [['all', 'All'], ['today', 'Today'], ['week', 'Week'], ['mtd', 'MTD'], ['qtd', 'QTD'], ['cfy', 'CFY'], ['lfy', 'LFY'], ['month', 'Monthly'], ['quarter', 'Quarterly'], ['custom', 'Custom']];
  const tab = (active) => ({ padding: '6px 13px', fontSize: 11.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: active ? SAP.blue : '#fff', color: active ? '#fff' : SAP.sec });
  const needsFy = mode === 'ytd' || mode === 'month' || mode === 'quarter';
  return (
    <div className="noprint" style={{ background: '#fff', border: `1px solid ${SAP.border}`, borderTop: 'none', padding: '9px 14px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
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
      {(mode !== 'all' && mode !== 'month' && mode !== 'quarter') && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: SAP.sec, cursor: 'pointer' }}>
          <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> Compare vs previous
        </label>
      )}
      {typeof setShowZero === 'function' && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: SAP.sec, cursor: 'pointer' }} title="Show every account in the chart, including those with a zero balance / no entries">
          <input type="checkbox" checked={!!showZero} onChange={(e) => setShowZero(e.target.checked)} /> Show zero-balance accounts
        </label>
      )}
      <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
        {showView && <PnlViewSwitcher view={view} setView={setView} />}
        {canExport && <button onClick={onExport} className="max-tablet:min-h-[44px]" style={toolBtn}>⬇ Excel</button>}
        <button onClick={() => { toast('Opening print view…', 'info'); openPrintPreview({ selector: 'main', title: 'Profit & Loss', recommend: 'landscape' }); }} className="max-tablet:min-h-[44px]" style={toolBtn}>🖨 Print / PDF</button>
      </div>
    </div>
  );
}

/* ── Monthly / Quarterly side-by-side matrix (one column per period) ─────
   Fires one module-PL query per column (cache-shared with the detail view's
   key), rolls up a FY-Total column, and drills any column → its full P&L. */
function PnLMatrix({ branch, cur, fy, grain, onFocus }) {
  const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(localeOf(cur)) : '—'; };
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
  // Margin %-row cells get a performance tint so good/poor periods pop at a glance.
  const pctTint = (v) => (v >= 13 ? '#e7f6ec' : v >= 8 ? '#fef6e0' : v >= 0 ? '#fdeee0' : '#fdecea');

  const doExport = () => {
    const columns = [{ key: 'metric', label: grain === 'month' ? 'Metric / Month' : 'Metric / Quarter' }, ...cols.map((c) => ({ key: c.key, label: c.label })), { key: 'fytotal', label: 'FY Total' }];
    const rows = METRICS.map((m) => {
      const row = { metric: m.label };
      cols.forEach((c, i) => { row[c.key] = datas[i] ? (m.pct ? +m.get(datas[i]).toFixed(2) : Math.round(m.get(datas[i]))) : ''; });
      row.fytotal = m.pct ? +m.total.toFixed(2) : Math.round(m.total);
      return row;
    });
    try { exportToExcel(`PnL_${grain}_FY${fy}`, columns, rows); toast('Downloading Excel export…', 'success'); } catch (e) { toast('Export failed: ' + (e?.message || e), 'error'); }
  };

  if (errored) return <div style={{ ...card, padding: 16, color: SAP.red, fontSize: 12, fontWeight: 600 }}>⚠ {errored.error?.message || 'Failed to load the period matrix'}</div>;

  return (
    <FCard
      title={grain === 'month' ? `Month-wise Profit & Loss — FY ${fy}` : `Quarter-wise Profit & Loss — FY ${fy}`}
      sub={`Each column is a ${grain === 'month' ? 'month' : 'quarter'} of the financial year · click a column header to drill into its full P&L → vouchers · ${cur} excl. GST`}
      badge={<Badge bg={SAP.blueBg} c={SAP.blue} bd="#b8d6ff">{cols.length} {grain === 'month' ? 'months' : 'quarters'}</Badge>}
    >
      <div style={{ padding: '8px 12px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={doExport} className="max-tablet:min-h-[44px]" style={toolBtn}>⬇ Excel</button>
      </div>
      {loading ? (
        <div style={{ padding: 16 }}>{Array.from({ length: 8 }).map((_, r) => <div key={r} className="kb-skeleton" style={{ height: 16, borderRadius: 6, marginBottom: 8, opacity: Math.max(0.4, 1 - r * 0.09) }} />)}</div>
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
                    <td key={c.key} style={{ ...num, padding: '7px 12px', fontWeight: m.strong ? 700 : 400, color: m.good ? SAP.greenDk : (m.neg ? SAP.red : SAP.text), background: m.pct && datas[i] ? pctTint(m.get(datas[i])) : undefined }}>{fmtCell(m, datas[i])}</td>
                  ))}
                  <td style={{ ...num, padding: '7px 12px', fontWeight: 700, color: m.good ? SAP.greenDk : (m.neg ? SAP.red : SAP.text), background: m.pct ? pctTint(m.total) : (m.strong ? '#dff5df' : SAP.headerBg) }}>
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

export function ReportPnLLive({ branch, forceView, hideSwitcher }) {
  const cur = curOf(branch);
  const mobile = useMobile();
  const saved = useMemo(loadSavedPeriod, []);
  const [mode, setMode] = useState(saved.mode || 'cfy');                // all|today|week|mtd|qtd|cfy|lfy|month|quarter|custom (default CFY so the detailed P&L's per-booking file drill stays bounded/fast; widen to All as needed)
  const [fy, setFy] = useState(saved.fy || CUR_FY.label);
  const [compare, setCompare] = useState(saved.compare ?? true);
  const [custom, setCustom] = useState(saved.custom || { from: CUR_FY.startISO, to: todayISO() });
  const [viewState, setView] = useState(saved.view || 'fiori');        // 'fiori' | 'classic' | 'vertical'
  const view = forceView || viewState;                                 // merged screen can pin the view
  const [showZero, setShowZero] = useState(false);                     // include zero-balance accounts
  const [focus, setFocus] = useState(null);                            // matrix → drilled column { from, to, label, note }
  useEffect(() => { try { localStorage.setItem(PNL_PERIOD_KEY, JSON.stringify({ mode, fy, compare, custom, view: viewState })); } catch { /* ignore */ } }, [mode, fy, compare, custom, viewState]);
  useEffect(() => { setFocus(null); }, [mode, fy]);                    // realigning the matrix clears any open drill

  const isMatrix = (mode === 'month' || mode === 'quarter') && !focus;
  const period = focus || resolvePeriod(mode, fy, custom, branch);
  const showPY = !isMatrix && !focus && compare && mode !== 'all';
  const prior = showPY ? priorPeriod(mode, fy, custom, period) : null;

  const q = useModulePL(branch, { from: period.from, to: period.to, includeZero: showZero });
  // No comparison → reuse the same range (cache hit, no extra fetch); prev stays null.
  const qP = useModulePL(branch, prior ? { from: prior.from, to: prior.to, includeZero: showZero } : { from: period.from, to: period.to, includeZero: showZero });
  const d = q.data;
  const prev = showPY ? qP.data : null;

  // Consolidated = all-branches scope: render each branch as its own P&L section in
  // its OWN currency — never a merged cross-branch / cross-currency total. Driven by
  // the BE `byBranch` slice (same shape as the merged top-level module-PL payload).
  const isAll = !branch || branch === 'ALL' || branch?.code === 'ALL';

  const periodTxt = period.note || period.label || 'all periods';
  const classicPeriod = period.from ? `${asOn(period.from)} to ${asOn(period.to)}` : 'All periods';

  return (
    <Wrap wide>
      <FioriHead
        system="KBiz360 · Finance"
        title="Profit & Loss — Module-wise Gross Profit"
        sub={isAll && !isMatrix
          ? <><strong>{branchLabel(branch)}</strong> &nbsp;|&nbsp; each branch in its own currency · <strong>no cross-currency total</strong> &nbsp;|&nbsp; {periodTxt} &nbsp;|&nbsp; Tally double-entry · live</>
          : <><strong>{branchLabel(branch)}</strong> &nbsp;|&nbsp; {cur} INR (excl. GST) &nbsp;|&nbsp; {isMatrix ? `FY ${fy} · ${mode === 'month' ? 'month-wise' : 'quarter-wise'}` : periodTxt} &nbsp;|&nbsp; Tally double-entry · live</>}
      />
      <PnlPeriodBar
        mode={mode} setMode={setMode} fy={fy} setFy={setFy}
        compare={compare} setCompare={setCompare} custom={custom} setCustom={setCustom}
        view={view} setView={setView} showView={!isMatrix && !hideSwitcher}
        showZero={showZero} setShowZero={setShowZero}
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
        ) : isAll && Array.isArray(d?.byBranch) ? (
          <StateBox q={q} empty={!d}>
            {d.byBranch.length === 0
              ? <div style={{ padding: 20, textAlign: 'center', color: SAP.label }}>No data in any branch for this period.</div>
              : d.byBranch.map((b) => {
                const sPrev = Array.isArray(prev?.byBranch) ? prev.byBranch.find((x) => x.branch === b.branch) : null;
                return (
                  <div key={b.branch} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: (view === 'classic') ? '12px 12px 4px' : '2px 2px 10px', borderBottom: `2px solid ${SAP.blue}`, paddingBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: SAP.text }}>{branchLabel(b.branch)}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: SAP.sec }}>· {curOf(b.branch)}</span>
                    </div>
                    <PnLBody d={b} prev={sPrev} cur={curOf(b.branch)} branch={b.branch} period={period} view={view} mobile={mobile} classicPeriod={classicPeriod} />
                  </div>
                );
              })}
          </StateBox>
        ) : (
        <StateBox q={q} empty={!d || (!(d.modules || []).length && !d.indirect?.expense && !d.bridge?.indirectIncome && !d.bridge?.netProfit)}>
          <PnLBody d={d} prev={prev} cur={cur} branch={branch} period={period} view={view} mobile={mobile} classicPeriod={classicPeriod} />
        </StateBox>
        )}
      </div>
    </Wrap>
  );
}

/* ── One scope's P&L body (KPIs + Sections A/B/C + ranking/ratios, or the
   Classic/Vertical/Drill view) in ONE branch's currency. Owns its own expand
   state + voucher/ledger drills, so each per-branch section in the consolidated
   view drills independently. `d` is a byBranch slice or the merged top-level. */
function PnLBody({ d, prev, cur, branch, period, view, mobile, classicPeriod }) {
  const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(localeOf(cur)) : '—'; };
  const paren = (n) => { const v = Math.round(Number(n) || 0); return v ? `(${v.toLocaleString(localeOf(cur))})` : '—'; };
  const [openMod, setOpenMod] = useState({});
  const [openSub, setOpenSub] = useState({});
  const [openHead, setOpenHead] = useState({});   // Section A: ledger → component drill per module
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
  // Fiori "Expand all / Collapse all" — covers Section A (modules → sub-centres →
  // ledger-composition heads) and Section B (Fixed/Variable buckets → sub-groups).
  // Section B defaults expanded, so Collapse must pin those keys false explicitly.
  const fioriKeys = useMemo(() => pnlFioriExpandKeys(d, expBuckets), [d, expBuckets]);
  const hasFioriExpand = fioriKeys.modKeys.length > 0 || fioriKeys.bucketKeys.length > 0;
  const expandAllFiori = () => {
    setExpDetail('detailed');
    setOpenMod(Object.fromEntries(fioriKeys.modKeys.map((k) => [k, true])));
    setOpenSub(Object.fromEntries(fioriKeys.subKeys.map((k) => [k, true])));
    setOpenHead(Object.fromEntries(fioriKeys.headKeys.map((k) => [k, true])));
    setOpenBucket(Object.fromEntries(fioriKeys.bucketKeys.map((k) => [k, true])));
    setOpenExp(Object.fromEntries(fioriKeys.expKeys.map((k) => [k, true])));
  };
  const collapseAllFiori = () => {
    setOpenMod({}); setOpenSub({}); setOpenHead({});
    setOpenBucket(Object.fromEntries(fioriKeys.bucketKeys.map((k) => [k, false])));
    setOpenExp(Object.fromEntries(fioriKeys.expKeys.map((k) => [k, false])));
  };
  // Bottom line is Net Profit (Gross − overheads). Per the honest-data policy in this
  // file's header, there is NO fabricated "Provision for Tax @ 25.17%" / PAT line —
  // any real tax flows through indirect expenses, and the Balance Sheet posts this same
  // pre-tax Net Profit to Capital, so the two now agree.
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
      ['Net Profit Margin', pctTxt(s ? (d.bridge.netProfit / s) * 100 : 0)],
      ['Break-even GP needed', compact(cur, d.indirect.expense)],
    ];
  }, [d, cur]);

  if (!d) return null;
  return (
    <>
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

            {hasFioriExpand && <FioriExpandBar onExpand={expandAllFiori} onCollapse={collapseAllFiori} />}

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
                          <tr {...keyActivate(() => setOpenMod((s) => ({ ...s, [m.key]: !s[m.key] })))}
                            style={{ background: SAP.grpBg, color: SAP.grpText, cursor: 'pointer', borderTop: '2px solid #b3ccf5' }}>
                            <td style={{ padding: '9px 16px', fontWeight: 700 }}><Toggle open={open} /><span style={{ marginRight: 6 }}>{m.icon}</span>{m.name}<span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 5, marginLeft: 8, background: '#fff', color: SAP.blue, border: '1px solid #b8d6ff' }}>{tag}</span></td>
                            <td style={{ ...num, fontWeight: 700 }}>{inr(m.sales)}</td>
                            <td style={{ ...num, fontWeight: 700 }}>{inr(m.cogs)}</td>
                            <td style={{ ...num, fontWeight: 700, color: SAP.greenDk }}>{inr(m.gp)}</td>
                            <td style={{ ...num, fontWeight: 700, color: gpColor(m.gpPct) }}>{pctTxt(m.gpPct)}</td>
                            <td style={{ ...num, color: SAP.sec }}>{pctTxt(m.pctOfSales)}</td>
                          </tr>
                          {/* single-leaf modules: ledger composition at module level (captured fares — Base Fare, K3, Taxes …) */}
                          {open && !m.hasSubs && <FioriLedgerRows m={m} cur={cur} openHead={openHead} setOpenHead={setOpenHead} />}
                          {/* multi-leaf modules (Flights/Holiday) → sub-centre rows → files */}
                          {open && m.hasSubs && (m.subs || []).map((s) => {
                            const sk = `${m.key}|${s.code}`;
                            const so = !!openSub[sk];
                            return (
                              <React.Fragment key={s.code}>
                                <tr {...keyActivate(() => setOpenSub((st) => ({ ...st, [sk]: !st[sk] })))}
                                  style={{ background: SAP.subBg, color: SAP.subText, cursor: 'pointer', borderBottom: `1px solid ${SAP.borderLt}` }}>
                                  <td style={{ padding: '6px 16px 6px 38px', fontWeight: 600 }}><Toggle open={so} />{s.name}<span style={{ fontSize: 9, color: SAP.label, marginLeft: 6 }}>· {s.fileCount} files</span></td>
                                  <td style={{ ...num, fontWeight: 600 }}>{inr(s.sales)}</td>
                                  <td style={{ ...num, fontWeight: 600 }}>{inr(s.cogs)}</td>
                                  <td style={{ ...num, fontWeight: 600, color: SAP.greenDk }}>{inr(s.gp)}</td>
                                  <td style={{ ...num, fontWeight: 600, color: gpColor(s.gpPct) }}>{pctTxt(s.gpPct)}</td>
                                  <td style={{ ...num, color: SAP.sec }}>{pctTxt(s.pctOfSales)}</td>
                                </tr>
                                {/* per-sub-centre ledger composition — fares split by Int'l/Domestic, not merged */}
                                {so && <FioriLedgerRows heads={s.heads} refunds={s.refunds} keyBase={sk} cur={cur} openHead={openHead} setOpenHead={setOpenHead} />}
                                {so && <FileRows files={s.files} indent={62} cur={cur} onPick={setDrillFile} />}
                              </React.Fragment>
                            );
                          })}
                          {/* single-leaf modules → files directly */}
                          {open && !m.hasSubs && <FileRows files={m.files} indent={48} cur={cur} onPick={setDrillFile} />}
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
                          <tr {...keyActivate(() => setOpenBucket((s) => ({ ...s, [b.name]: !(s[b.name] !== false) })))}
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
                                <tr {...keyActivate(() => setOpenExp((s) => ({ ...s, [gKey]: !(s[gKey] !== false) })))}
                                  style={{ background: SAP.subBg, color: SAP.subText, cursor: 'pointer', borderBottom: `1px solid ${SAP.borderLt}` }}>
                                  <td style={{ padding: '7px 16px 7px 34px', fontWeight: 700 }}><Toggle open={gOpen} />{g.name}</td>
                                  <td style={{ ...num, fontWeight: 700, color: SAP.red }}>{inr(g.amount)}</td>
                                  <td style={{ ...num, color: SAP.sec }}>{pctTxt(g.pctOfBucket != null ? g.pctOfBucket : (b.amount ? g.amount / b.amount * 100 : 0))}</td>
                                  <td style={{ ...num, color: SAP.sec }}>{pctTxt(g.pctOfSales)}</td>
                                </tr>
                                {gOpen && (g.ledgers || []).map((l, i) => (
                                  <tr key={i} {...keyActivate(() => setDrillLedger(l.name))}
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
                  {/* Operating GP → Direct Income / Direct Expenses → full Gross Profit
                      (only when there are trading items beyond module Sales/COGS). */}
                  {(!!d.totals.directIncome || !!d.totals.directExpense) && (
                    <>
                      <tr style={{ borderBottom: `1px solid ${SAP.borderLt}`, color: SAP.sec }}>
                        <td style={{ padding: '7px 16px' }}>Operating Gross Profit (Sales − COGS)</td>
                        <td style={num}>{inr(d.totals.operatingGP)}</td>
                        <td style={num} />
                      </tr>
                      {!!d.totals.directIncome && (
                        <tr style={{ borderBottom: `1px solid ${SAP.borderLt}` }}>
                          <td style={{ padding: '7px 16px' }}>Add: Direct Income</td>
                          <td style={{ ...num, color: SAP.greenDk }}>{inr(d.totals.directIncome)}</td>
                          <td style={num} />
                        </tr>
                      )}
                      {!!d.totals.directExpense && (
                        <tr style={{ borderBottom: `1px solid ${SAP.borderLt}` }}>
                          <td style={{ padding: '7px 16px' }}>Less: Direct Expenses</td>
                          <td style={{ ...num, color: SAP.red }}>{paren(d.totals.directExpense)}</td>
                          <td style={num} />
                        </tr>
                      )}
                    </>
                  )}
                  <tr style={{ background: SAP.greenBg, color: SAP.greenDk, fontWeight: 700 }}>
                    <td style={{ padding: '10px 16px', width: '62%' }}>Gross Profit (All Modules)</td>
                    <td style={num}>{inr(d.bridge.grossProfit)}</td>
                    <td style={{ ...num, width: '20%' }}>{pctTxt(d.totals.gpPct)} of Sales</td>
                  </tr>
                  {!!d.bridge.indirectIncome && (
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
                  <tr style={{ background: SAP.shell, color: '#fff', fontWeight: 700, fontSize: 14 }}>
                    <td style={{ padding: '12px 16px' }}>★ &nbsp;NET PROFIT</td>
                    <td style={{ ...num, color: d.bridge.netProfit >= 0 ? '#4ade80' : '#fca5a5' }}>{inr(d.bridge.netProfit)}</td>
                    <td style={{ ...num, color: '#9fb4cc' }}>{pctTxt(d.totals.sales ? d.bridge.netProfit / d.totals.sales * 100 : 0)} of Sales</td>
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
            <ClassicPnL d={d} cur={cur} mobile={mobile} branch={branch} to={period.to} periodTxt={classicPeriod} />
          )}
          {d && view === 'vertical' && (
            <VerticalPnL d={d} cur={cur} mobile={mobile} branch={branch} to={period.to} periodTxt={classicPeriod} />
          )}
          {d && view === 'drill' && (
            <DrillPnL d={d} cur={cur} branch={branch} periodTxt={classicPeriod} />
          )}
      {drillFile && <FileVoucherDrill file={drillFile} cur={cur} mobile={mobile} onClose={() => setDrillFile(null)} />}
      {drillLedger && <LedgerVoucherDrill ledger={drillLedger} branch={branch} to={period.to} cur={cur} mobile={mobile} onClose={() => setDrillLedger(null)} />}
    </>
  );
}

/* ── Section A ledger composition — under an open module, the GL Sales/Purchase
   ledgers each booking line posts to, and the fare/charge components captured on
   the entry (Base Fare, K3, Taxes …). Sales ledgers show their amount in the
   Sales column, Purchase ledgers in the COGS column; click a ledger to reveal
   its components. Same six columns as the module table (colSpan-aware). */
function FioriLedgerRows({ m, heads: headsProp, refunds: refundsProp, keyBase, openHead, setOpenHead, cur = '₹' }) {
  const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(localeOf(cur)) : '—'; };
  // Module-level (m.heads) for single-leaf modules, or a sub-centre's own heads
  // (Int'l/Domestic) when `heads` + `keyBase` are passed — so fares are split, not merged.
  // Show the FULL component ledger name (e.g. "IT-Base Fare") so the drill matches the
  // Chart of Accounts / Tally P&L tree — no display-only prefix stripping.
  const allHeads = headsProp || (m && m.heads) || {};
  const nodeRefunds = refundsProp || (m && m.refunds) || {};
  const base = keyBase || (m && m.key) || '';
  const ledgerLabel = (name) => name;
  const rows = [];
  for (const side of ['sales', 'cogs']) {
    const heads = allHeads[side] || [];
    for (const h of heads) {
      const hk = `${base}:${side}:${h.ledger}`;
      const comps = h.components || [];
      const hasComps = comps.length > 0;
      const ho = !!openHead[hk];
      const salesCol = side === 'sales';
      rows.push(
        <tr key={hk} {...(hasComps ? keyActivate(() => setOpenHead((s) => ({ ...s, [hk]: !s[hk] }))) : {})}
          style={{ background: '#fff', borderBottom: `1px solid ${SAP.borderLt}`, cursor: hasComps ? 'pointer' : 'default' }}>
          <td style={{ padding: '5px 16px 5px 62px', color: SAP.text, fontWeight: 600 }}>
            {hasComps ? <Toggle open={ho} /> : <span style={{ display: 'inline-block', width: 21 }} />}
            <span {...keyActivate((e) => { e.stopPropagation(); openLedgerModal(h.ledger, { invoiceToRegister: true }); })}
              style={{ cursor: 'pointer', color: SAP.blue, textDecoration: 'underline' }}
              title="Open Ledger Account — an invoice inside opens its Sales/Purchase Register">
              {ledgerLabel(h.ledger)}<span style={{ fontWeight: 700 }}> ›</span>
            </span>
          </td>
          <td style={num}>{salesCol ? inr(h.amount) : ''}</td>
          <td style={num}>{salesCol ? '' : inr(h.amount)}</td>
          <td style={num} /><td style={num} /><td style={num} />
        </tr>
      );
      if (ho) comps.forEach((c, i) => rows.push(
        <tr key={`${hk}|${i}`} style={{ background: SAP.rowAlt, borderBottom: `1px solid ${SAP.borderLt}` }}>
          <td style={{ padding: '4px 16px 4px 88px', color: SAP.sec, fontStyle: 'italic', fontSize: 12 }}>{c.label}</td>
          <td style={{ ...num, color: SAP.sec, fontSize: 12 }}>{salesCol ? inr(c.amount) : ''}</td>
          <td style={{ ...num, color: SAP.sec, fontSize: 12 }}>{salesCol ? '' : inr(c.amount)}</td>
          <td style={num} /><td style={num} /><td style={num} />
        </tr>
      ));
    }
    // "Less: Refunds / Reissues" — foots the gross heads to the net total (signed
    // contribution; refunds reduce). Shown only when there's refund movement on this side.
    const rf = Number(nodeRefunds[side]);
    if (heads.length && Math.abs(rf || 0) > 0.5) {
      const salesCol = side === 'sales';
      rows.push(
        <tr key={`${base}:${side}:__refund`} style={{ background: '#fff', borderBottom: `1px solid ${SAP.borderLt}` }}>
          <td style={{ padding: '5px 16px 5px 62px', color: SAP.sec, fontStyle: 'italic', fontWeight: 600 }}>
            <span style={{ display: 'inline-block', width: 21 }} />Less: Refunds / Reissues
          </td>
          <td style={num}>{salesCol ? inr(rf) : ''}</td>
          <td style={num}>{salesCol ? '' : inr(rf)}</td>
          <td style={num} /><td style={num} /><td style={num} />
        </tr>
      );
    }
  }
  if (!rows.length) return null;
  return (
    <>
      <tr style={{ background: '#f6f9ff' }}>
        <td colSpan={6} style={{ padding: '3px 16px 3px 62px', fontSize: 10.5, fontWeight: 700, color: SAP.blue, letterSpacing: 0.3 }}>LEDGER COMPOSITION · captured fares</td>
      </tr>
      {rows}
    </>
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
      {[['fiori', '▪ SAP Fiori'], ['classic', '▭ Tally Classic'], ['vertical', '▤ Vertical'], ['drill', '⊞ Drill']].map(([id, label]) => (
        <button key={id} onClick={() => setView(id)} style={{ padding: '7px 14px', fontSize: 11.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: view === id ? SAP.blue : '#fff', color: view === id ? '#fff' : SAP.sec }}>{label}</button>
      ))}
    </div>
  );
}

// Tally Classic alphabetical (A→Z) comparator — case-insensitive, numeric-aware
// (so "Branch 2" sorts before "Branch 10"). Shared by the Classic P&L and
// Balance Sheet views to arrange Groups / Sub-Groups / Ledgers / modules.
const azByName = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'en', { sensitivity: 'base', numeric: true });

/* ── Tally Classic (white) P&L view — Dr/Cr two-column, touch-drillable ── */
// Trading A/c (COGS vs Sales, balancing with Gross Profit c/d) stacked over the
// P&L A/c (indirect expenses + tax + net profit vs GP b/d). Tap any module to
// reach its booking files → vouchers → edit; tap any expense ledger to drill
// its postings → voucher → edit. Same live data & editor as the Fiori view.
function ClassicPnL({ d, cur, mobile, branch, to, periodTxt }) {
  const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(localeOf(cur)) : '—'; };
  const [drillModule, setDrillModule] = useState(null);
  // Collapsible indirect tree: Fixed/Variable buckets default expanded; sub-groups
  // default collapsed (click a sub-group to reveal its ledgers).
  const [openSub, setOpenSub] = useState({});
  const isOpen = (key, defOpen) => (openSub[key] === undefined ? defOpen : openSub[key]);
  const mono = { fontFamily: "'Courier New', Courier, monospace" };
  const company = (branch && branch !== 'ALL') ? (branch.code || branch) : 'All Branches — Consolidated';
  const modules = [...(d.modules || [])].sort((a, b) => azByName(a.name, b.name)); // A→Z module rows
  const groups = d.indirect?.groups || [];
  const buckets = (Array.isArray(d.indirect?.buckets) && d.indirect.buckets.length)
    ? d.indirect.buckets
    : (groups.length ? [{ name: 'Indirect Expenses', amount: d.indirect.expense, groups }] : []);
  const indIncome = d.bridge?.indirectIncome || 0;
  const incomeGroups = d.indirect?.incomeGroups || []; // indirect-income groups → ledgers (drillable)
  const grossProfit = d.bridge?.grossProfit ?? d.totals.gp;

  // Expand / Collapse all — every bucket + sub-group key in the indirect tree,
  // PLUS every indirect-income group, PLUS every module + its GL ledgers on both
  // trading sides (so "Expand all" also drills modules → ledger → fare components).
  const allKeys = [];
  buckets.forEach((b) => { allKeys.push('b:' + b.name); (b.groups || []).forEach((g) => allKeys.push('g:' + b.name + '/' + g.name)); });
  incomeGroups.forEach((g) => allKeys.push('ig:' + g.name));
  allKeys.push(...moduleExpandKeys(modules));
  const expandAll = () => setOpenSub(Object.fromEntries(allKeys.map((k) => [k, true])));
  const collapseAll = () => setOpenSub(Object.fromEntries(allKeys.map((k) => [k, false])));

  // A module row + (when expanded) its GL ledger rows → fare/charge components.
  // The caret toggles the inline drill; the row's "›" still opens the voucher
  // drill popup. Modules with no captured ledger detail stay non-expandable.
  const moduleBlock = (m, side) => {
    const amount = side === 'cogs' ? m.cogs : m.sales;
    const hasDetail = moduleHasDetail(m, side);
    const ekey = moduleDetailKey(m, side);
    const open = hasDetail && isOpen(ekey, false);
    const row = { label: m.name, amount, sub: true, module: m, icon: m.icon, expandable: hasDetail, ekey, open };
    return open ? [row, ...moduleDrillRows(m, side, isOpen)] : [row];
  };

  // Trading account — Purchases/COGS + Direct Expenses (Dr) vs Sales + Direct Income (Cr).
  // Direct Income (Commission, Discount Received …) and Direct Expenses are the trading
  // items beyond module Sales/COGS; per Tally they sit as their OWN lines ABOVE Gross
  // Profit. Both sides foot to Sales + Direct Income: Dr (cogs + directExp + GP c/d) ==
  // Cr (sales + directInc), since GP = (sales − cogs) + (directInc − directExp).
  const directIncome = d.totals.directIncome || 0;
  const directExpense = d.totals.directExpense || 0;
  // Direct Income / Direct Expenses render as a drillable group ▸ sub-group ▸ ledger
  // tree (like every other group), not a flat lump. A category whose name equals the
  // group itself (ledgers sitting directly under it, no sub-group) skips the dup middle row.
  const directBlock = (gs, total, label, prefix) => {
    const cats = [...(gs || [])].sort((a, b) => azByName(a.name, b.name));
    if (!cats.length) return [{ label, amount: total, ledger: label, leaf: true }]; // no detail → flat fallback (clickable)
    const hOpen = isOpen(prefix, false);
    const head = { label, amount: total, group: true, expandable: true, ekey: prefix, open: hOpen };
    if (!hOpen) return [head];
    return [head, ...cats.flatMap((g) => {
      const led = [...(g.ledgers || [])].sort((x, y) => azByName(x.name, y.name)).map((l) => ({ label: l.name, amount: l.amount, ledger: l.name, leaf: true }));
      if (g.name === label) return led; // ledgers directly under the group — no redundant sub-group row
      const gk = prefix + '/' + g.name;
      const gOpen = isOpen(gk, true);
      const ghead = { label: g.name, amount: g.amount, sub: true, expandable: true, ekey: gk, open: gOpen };
      return gOpen ? [ghead, ...led] : [ghead];
    })];
  };
  // Register the direct-tree expand keys so Expand/Collapse-all covers them too.
  if (directExpense) { allKeys.push('de'); (d.totals.directExpenseGroups || []).forEach((g) => { if (g.name !== 'Direct Expenses') allKeys.push('de/' + g.name); }); }
  if (directIncome) { allKeys.push('di'); (d.totals.directIncomeGroups || []).forEach((g) => { if (g.name !== 'Direct Income') allKeys.push('di/' + g.name); }); }
  const tradeLeft = [
    { label: 'Purchase Accounts (COGS)', amount: d.totals.cogs, group: true },
    ...modules.flatMap((m) => moduleBlock(m, 'cogs')),
    ...(directExpense ? directBlock(d.totals.directExpenseGroups, directExpense, 'Direct Expenses', 'de') : []),
    { label: 'Gross Profit c/d', amount: grossProfit, result: true },
  ];
  const tradeRight = [
    { label: 'Sales Accounts', amount: d.totals.sales, group: true },
    ...modules.flatMap((m) => moduleBlock(m, 'sales')),
    ...(directIncome ? directBlock(d.totals.directIncomeGroups, directIncome, 'Direct Income', 'di') : []),
  ];
  const tradeTotal = d.totals.sales + directIncome;

  // Profit & Loss account — Indirect Exp (Fixed/Variable → sub-group → ledger) +
  // Tax + Net Profit (Dr) vs GP b/d + Indirect Income (Cr).
  const plLeft = [
    { label: 'Indirect Expenses', amount: d.indirect.expense, group: true },
    // Buckets, sub-groups and ledgers all listed alphabetically (A→Z).
    ...[...buckets].sort((a, b) => azByName(a.name, b.name)).flatMap((b) => {
      const bk = 'b:' + b.name;
      const bOpen = isOpen(bk, true);            // bucket (Fixed/Variable) default expanded
      const head = { label: b.name, amount: b.amount, bucket: true, expandable: true, ekey: bk, open: bOpen };
      if (!bOpen) return [head];
      return [head, ...[...(b.groups || [])].sort((x, y) => azByName(x.name, y.name)).flatMap((g) => {
        const gk = 'g:' + b.name + '/' + g.name;
        const gOpen = isOpen(gk, false);         // sub-group default collapsed → click to show ledgers
        const ghead = { label: g.name, amount: g.amount, sub: true, expandable: true, ekey: gk, open: gOpen };
        if (!gOpen) return [ghead];
        return [ghead, ...[...(g.ledgers || [])].sort((x, y) => azByName(x.name, y.name)).map((l) => ({ label: l.name, amount: l.amount, ledger: l.name, leaf: true }))];
      })];
    }),
    { label: 'Net Profit (to Capital A/c)', amount: d.bridge?.netProfit ?? 0, result: true },
  ];
  // Indirect Income → group → ledger (drillable), mirroring the expense tree.
  const incomeTreeRows = [...incomeGroups].sort((a, b) => azByName(a.name, b.name)).flatMap((g) => {
    const gk = 'ig:' + g.name;
    const gOpen = isOpen(gk, true); // shallow tree → default expanded so ledgers are one click from their account
    const ghead = { label: g.name, amount: g.amount, sub: true, expandable: true, ekey: gk, open: gOpen };
    if (!gOpen) return [ghead];
    return [ghead, ...[...(g.ledgers || [])].sort((x, y) => azByName(x.name, y.name)).map((l) => ({ label: l.name, amount: l.amount, ledger: l.name, leaf: true }))];
  });
  const allIncomeLedgers = incomeGroups.flatMap((g) => g.ledgers || []);
  // The "Indirect Income" line must itself open the income ledger account. When the
  // whole indirect income is one ledger, the single line opens it directly; with
  // several ledgers it becomes a drill header (expand → click any ledger). If the
  // backend hasn't sent the income tree yet, still make the line clickable.
  // Show the Indirect Income block whenever there is movement — INCLUDING a net-debit
  // (negative) balance, e.g. a lone Interest-on-FD reversal. `plTotal` already carries
  // `indIncome` with its sign, so the visible Cr rows then foot to the column total.
  const incomeBlock = !indIncome ? []
    : allIncomeLedgers.length === 1
      ? [{ label: 'Indirect Income', amount: indIncome, ledger: allIncomeLedgers[0].name, leaf: true }]
      : incomeGroups.length
        // Expandable group line(s) → click to reveal each income ledger (its own account).
        ? incomeTreeRows
        : [{ label: 'Indirect Income', amount: indIncome, ledger: 'Indirect Income', leaf: true }];
  const plRight = [
    { label: 'Gross Profit b/d', amount: grossProfit, result: true },
    ...incomeBlock,
  ];
  const plTotal = grossProfit + indIncome;

  const nett = d.totals.sales;
  const toggle = (r) => setOpenSub((s) => ({ ...s, [r.ekey]: !r.open }));
  // Row click → drill (module → files popup, ledger → its postings). The caret
  // (rendered separately) toggles the inline expand without drilling.
  const onRowClick = (r) => {
    // A GL ledger leaf → its full Ledger Account (a sale/purchase invoice inside
    // then opens the Sales/Purchase Register). Modules & sub-centres expand inline
    // on click — same as the Drill view; the module's "›" still opens its files.
    if (r.ledger) openLedgerModal(r.ledger, { invoiceToRegister: true });
    else if (r.expandable) toggle(r);
    else if (r.module) setDrillModule(r.module);
  };

  const Cell = ({ r, side }) => {
    const sep = side === 'cr' ? { borderLeft: '1px solid #cdd1d8' } : {};
    if (!r) return (<><td style={{ ...mono, ...sep }} /><td style={{ ...mono }} /><td style={{ ...mono }} /></>);
    const clickable = !!(r.module || r.ledger || r.expandable);
    const bold = !!(r.group || r.bucket || r.sub || r.costCentre || r.result); // groups, sub-groups & cost-centres bold
    const color = r.component ? '#6a6a6a'
      : r.result ? TALLY.green
        : (r.group || r.bucket || r.sub || r.costCentre) ? TALLY.head : '#1a1a1a';
    const pad = r.component ? 58 : r.ledgerHead ? 42 : r.leaf ? 46 : r.costCentre ? 38 : r.sub ? 32 : r.bucket ? 22 : 12;
    return (
      <>
        <td {...(clickable ? keyActivate(() => onRowClick(r)) : {})}
          className={clickable ? 'cl-drill' : undefined}
          style={{ padding: '2px 12px', paddingLeft: pad, color, fontWeight: bold ? 700 : 400, fontSize: r.component ? 12 : 13, fontStyle: r.component ? 'italic' : 'normal', textDecoration: r.group ? 'underline' : 'none', cursor: clickable ? 'pointer' : 'default', whiteSpace: 'nowrap', ...sep, ...mono }}>
          {r.expandable ? <span onClick={(e) => { e.stopPropagation(); toggle(r); }} style={{ color: TALLY.gold, marginRight: 4, cursor: 'pointer' }}>{r.open ? '▾' : '▸'}</span> : null}
          {r.icon ? <span style={{ marginRight: 5 }}>{r.icon}</span> : null}{r.label}{r.module ? <span onClick={(e) => { e.stopPropagation(); setDrillModule(r.module); }} style={{ color: TALLY.gold, fontWeight: 700, cursor: 'pointer' }} title="Show booking files → vouchers"> ›</span> : r.ledger ? <span style={{ color: TALLY.gold, fontWeight: 700 }}> ›</span> : null}
        </td>
        <td {...(clickable ? keyActivate(() => onRowClick(r)) : {})}
          style={{ padding: '2px 12px', textAlign: 'right', color, fontWeight: bold ? 700 : 400, fontSize: r.component ? 12 : 13, fontStyle: r.component ? 'italic' : 'normal', cursor: clickable ? 'pointer' : 'default', ...mono }}>{inr(r.amount)}</td>
        <td style={{ padding: '2px 10px', textAlign: 'right', color: SAP.sec, fontSize: 11, ...mono }}>{!r.component && share(r.amount, nett) >= 0.05 ? `${share(r.amount, nett).toFixed(1)}%` : ''}</td>
      </>
    );
  };

  const Section = ({ left, right, total }) => {
    const n = Math.max(left.length, right.length);
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, ...mono }}>
        <colgroup><col style={{ width: '30%' }} /><col style={{ width: '14%' }} /><col style={{ width: '6%' }} /><col style={{ width: '30%' }} /><col style={{ width: '14%' }} /><col style={{ width: '6%' }} /></colgroup>
        <tbody>
          <tr style={{ color: TALLY.head, fontWeight: 700, background: '#f0f4fa', borderBottom: `2px solid ${TALLY.head}` }}>
            <td style={{ padding: '5px 12px', ...mono }}>Particulars (Dr)</td><td style={{ padding: '5px 12px', textAlign: 'right', ...mono }}>Amount</td><td style={{ padding: '5px 10px', textAlign: 'right', fontSize: 11, ...mono }}>%</td>
            <td style={{ padding: '5px 12px', borderLeft: '1px solid #a9c2e0', ...mono }}>Particulars (Cr)</td><td style={{ padding: '5px 12px', textAlign: 'right', ...mono }}>Amount</td><td style={{ padding: '5px 10px', textAlign: 'right', fontSize: 11, ...mono }}>%</td>
          </tr>
          {Array.from({ length: n }).map((_, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #dfe2e7' }}><Cell r={left[i]} /><Cell r={right[i]} side="cr" /></tr>
          ))}
          <tr style={{ color: TALLY.head, fontWeight: 700, borderTop: `2px solid ${TALLY.head}`, borderBottom: `3px double ${TALLY.head}`, background: '#f0f4fa' }}>
            <td style={{ padding: '6px 12px', ...mono }}>Total</td><td style={{ padding: '6px 12px', textAlign: 'right', color: TALLY.gold, ...mono }}>{inr(total)}</td><td style={{ padding: '6px 10px', ...mono }} />
            <td style={{ padding: '6px 12px', borderLeft: '1px solid #a9c2e0', ...mono }}>Total</td><td style={{ padding: '6px 12px', textAlign: 'right', color: TALLY.gold, ...mono }}>{inr(total)}</td><td style={{ padding: '6px 10px', ...mono }} />
          </tr>
        </tbody>
      </table>
    );
  };

  return (
    <div className="tally-print-doc" style={{ background: '#fff', border: '1px solid #b0b0b0', borderRadius: 4, overflow: 'hidden', margin: 12, ...mono }}>
      <style>{`.cl-drill:hover{background:#eef4fb;text-decoration:underline}
@media print {
  @page { size: A4 landscape; margin: 8mm; }
  body * { visibility: hidden !important; }
  .tally-print-doc, .tally-print-doc * { visibility: visible !important; }
  .tally-print-doc { position: absolute !important; left: 0; top: 0; width: 100% !important; margin: 0 !important; border: none !important; border-radius: 0 !important; overflow: visible !important; box-shadow: none !important; }
  .tally-print-doc .cl-noprint { display: none !important; }
  .tally-print-doc table { page-break-inside: auto; width: 100% !important; }
  .tally-print-doc tr, .tally-print-doc td { page-break-inside: avoid; }
}`}</style>
      <div style={{ background: TALLY.titlebar, color: TALLY.head, padding: '5px 12px', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #a9c2e0' }}>
        <span>KBiz360 Books — {company}</span><span style={{ color: TALLY.gold }}>Profit &amp; Loss A/c</span>
      </div>
      <div style={{ textAlign: 'center', padding: '10px 8px 8px', borderBottom: `2px solid ${TALLY.head}` }}>
        <div style={{ color: TALLY.head, fontSize: 16, fontWeight: 700 }}>{company}</div>
        <div style={{ fontSize: 13 }}>Profit &amp; Loss A/c</div>
        <div style={{ color: TALLY.gold, fontSize: 11, fontWeight: 700 }}>{periodTxt}</div>
      </div>
      {allKeys.length > 0 && (
        <div className="cl-noprint" style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '6px 12px', borderBottom: '1px solid #cdd1d8', background: '#fafbfe' }}>
          <button onClick={expandAll} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${TALLY.head}`, borderRadius: 5, background: '#fff', color: TALLY.head }}>⊞ Expand all</button>
          <button onClick={collapseAll} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${TALLY.head}`, borderRadius: 5, background: '#fff', color: TALLY.head }}>⊟ Collapse all</button>
        </div>
      )}
      <div style={{ padding: '4px 0' }}>
        <Section left={tradeLeft} right={tradeRight} total={tradeTotal} />
      </div>
      <div style={{ borderTop: '1px dashed #c8c8c8', padding: '4px 0' }}>
        <Section left={plLeft} right={plRight} total={plTotal} />
      </div>
      <div style={{ background: TALLY.titlebar, color: TALLY.head, fontSize: 11, fontWeight: 700, padding: '4px 12px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, borderTop: `2px solid ${TALLY.head}`, ...mono }}>
        <span>Gross Profit : <span style={{ color: TALLY.green }}>{inr(grossProfit)} ({pctTxt(d.totals.gpPct)})</span></span>
        <span>Net Profit : <span style={{ color: TALLY.green }}>{inr(d.bridge?.netProfit ?? 0)} ({pctTxt(nett ? ((d.bridge?.netProfit ?? 0) / nett) * 100 : 0)})</span></span>
        <span>Nett Sales : {inr(nett)}</span>
      </div>
      <div style={{ background: '#d4d4d4', color: TALLY.head, fontSize: 11, fontWeight: 700, padding: '4px 12px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, borderTop: '1px solid #b0b0b0', ...mono }}>
        <span>Tap ▸ on a module to reveal its ledgers → captured fares (Base Fare, K3, Taxes…) · or a sub-group to expand its ledgers · tap a name → its entries → voucher → edit</span>
        <span>KBiz360 · live double-entry</span>
      </div>
      {drillModule && <ModuleVoucherDrill module={drillModule} cur={cur} mobile={mobile} onClose={() => setDrillModule(null)} />}
    </div>
  );
}

/* ── Vertical (single-column, statement-style) P&L view ───────────────────────
   Renders the SAME `d`, modules, indirect-expense tree, grossProfit and net profit
   that ClassicPnL uses — just flowing top-to-bottom: Income → less COGS →
   Gross Profit → add Other Income → less Indirect Expenses → Net Profit.
   Fully drillable (module / ledger / sub-group) exactly like Classic. */
function VerticalPnL({ d, cur, mobile, branch, to, periodTxt }) {
  const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(localeOf(cur)) : '—'; };
  const [drillModule, setDrillModule] = useState(null);
  const [openSub, setOpenSub] = useState({});
  const isOpen = (key, defOpen) => (openSub[key] === undefined ? defOpen : openSub[key]);
  const mono = { fontFamily: "'Courier New', Courier, monospace" };
  const company = (branch && branch !== 'ALL') ? (branch.code || branch) : 'All Branches — Consolidated';
  const modules = [...(d.modules || [])].sort((a, b) => azByName(a.name, b.name));
  const groups = d.indirect?.groups || [];
  const buckets = (Array.isArray(d.indirect?.buckets) && d.indirect.buckets.length)
    ? d.indirect.buckets
    : (groups.length ? [{ name: 'Indirect Expenses', amount: d.indirect.expense, groups }] : []);
  const indIncome = d.bridge?.indirectIncome || 0;
  const incomeGroups = d.indirect?.incomeGroups || []; // indirect-income groups → ledgers (drillable)
  const grossProfit = d.bridge?.grossProfit ?? d.totals.gp;
  const directIncome = d.totals.directIncome || 0;
  const directExpense = d.totals.directExpense || 0;
  const revenueTrading = d.totals.sales + directIncome;
  const nett = d.totals.sales;

  // Indirect-income tree (group → ledger) — every ledger row clickable → its account.
  const incomeRows = incomeGroups.flatMap((g) => {
    const gk = 'ig:' + g.name;
    const gOpen = isOpen(gk, true); // shallow tree → default expanded so ledgers are one click from their account
    const ghead = { label: g.name, amount: g.amount, sub: true, expandable: true, ekey: gk, open: gOpen };
    if (!gOpen) return [ghead];
    return [ghead, ...(g.ledgers || []).map((l) => ({ label: l.name, amount: l.amount, ledger: l.name, leaf: true }))];
  });
  const allIncomeLedgers = incomeGroups.flatMap((g) => g.ledgers || []);
  const oneIncomeLedger = allIncomeLedgers.length === 1; // the "Indirect Income" line opens it directly

  // Indirect-expense tree (bucket → sub-group → ledger) — identical to ClassicPnL.
  const expenseRows = buckets.flatMap((b) => {
    const bk = 'b:' + b.name;
    const bOpen = isOpen(bk, true);
    const head = { label: b.name, amount: b.amount, bucket: true, expandable: true, ekey: bk, open: bOpen };
    if (!bOpen) return [head];
    return [head, ...(b.groups || []).flatMap((g) => {
      const gk = 'g:' + b.name + '/' + g.name;
      const gOpen = isOpen(gk, false);
      const ghead = { label: g.name, amount: g.amount, sub: true, expandable: true, ekey: gk, open: gOpen };
      if (!gOpen) return [ghead];
      return [ghead, ...(g.ledgers || []).map((l) => ({ label: l.name, amount: l.amount, ledger: l.name, leaf: true }))];
    })];
  });

  const toggle = (r) => setOpenSub((s) => ({ ...s, [r.ekey]: !r.open }));
  const onRowClick = (r) => {
    // A GL ledger leaf → its full Ledger Account (a sale/purchase invoice inside
    // then opens the Sales/Purchase Register). Modules & sub-centres expand inline
    // on click — same as the Drill view; the module's "›" still opens its files.
    if (r.ledger) openLedgerModal(r.ledger, { invoiceToRegister: true });
    else if (r.expandable) toggle(r);
    else if (r.module) setDrillModule(r.module);
  };

  // A module row + (when expanded) its GL ledger rows → fare/charge components.
  const moduleBlock = (m, side) => {
    const amount = side === 'cogs' ? m.cogs : m.sales;
    const hasDetail = moduleHasDetail(m, side);
    const ekey = moduleDetailKey(m, side);
    const open = hasDetail && isOpen(ekey, false);
    const row = { label: m.name, amount, sub: true, module: m, icon: m.icon, expandable: hasDetail, ekey, open };
    return open ? [row, ...moduleDrillRows(m, side, isOpen)] : [row];
  };

  // allKeys for expand/collapse all (buckets + sub-groups + module/ledger drill).
  const allKeys = [];
  buckets.forEach((b) => { allKeys.push('b:' + b.name); (b.groups || []).forEach((g) => allKeys.push('g:' + b.name + '/' + g.name)); });
  incomeGroups.forEach((g) => allKeys.push('ig:' + g.name));
  allKeys.push(...moduleExpandKeys(modules));
  if (directExpense) { allKeys.push('de'); (d.totals.directExpenseGroups || []).forEach((g) => { if (g.name !== 'Direct Expenses') allKeys.push('de/' + g.name); }); }
  if (directIncome) { allKeys.push('di'); (d.totals.directIncomeGroups || []).forEach((g) => { if (g.name !== 'Direct Income') allKeys.push('di/' + g.name); }); }
  const expandAll = () => setOpenSub(Object.fromEntries(allKeys.map((k) => [k, true])));
  const collapseAll = () => setOpenSub(Object.fromEntries(allKeys.map((k) => [k, false])));

  // Direct Income / Direct Expenses → drillable group ▸ sub-group ▸ ledger (like Classic).
  const directBlock = (gs, total, label, prefix) => {
    const cats = [...(gs || [])].sort((a, b) => azByName(a.name, b.name));
    if (!cats.length) return [{ label, amount: total, ledger: label, leaf: true }];
    const hOpen = isOpen(prefix, false);
    const head = { label, amount: total, group: true, expandable: true, ekey: prefix, open: hOpen };
    if (!hOpen) return [head];
    return [head, ...cats.flatMap((g) => {
      const led = [...(g.ledgers || [])].sort((x, y) => azByName(x.name, y.name)).map((l) => ({ label: l.name, amount: l.amount, ledger: l.name, leaf: true }));
      if (g.name === label) return led;
      const gk = prefix + '/' + g.name;
      const gOpen = isOpen(gk, true);
      const ghead = { label: g.name, amount: g.amount, sub: true, expandable: true, ekey: gk, open: gOpen };
      return gOpen ? [ghead, ...led] : [ghead];
    })];
  };

  const pctCell = (v, bold) => <td style={{ padding: '3px 10px', textAlign: 'right', color: SAP.sec, fontSize: 11.5, fontWeight: bold ? 700 : 400, ...mono }}>{share(v, nett) >= 0.05 ? `${share(v, nett).toFixed(1)}%` : ''}</td>;
  const Row = ({ r, neg }) => {
    const clickable = !!(r.module || r.ledger || r.expandable);
    const bold = !!(r.group || r.bucket || r.sub || r.costCentre || r.result);
    const color = r.component ? '#6a6a6a' : r.result ? TALLY.green : (r.group || r.bucket || r.sub || r.costCentre) ? TALLY.head : '#1a1a1a';
    const pad = r.component ? 64 : r.ledgerHead ? 46 : r.leaf ? 50 : r.costCentre ? 42 : r.sub ? 34 : r.bucket ? 24 : 14;
    // Refund rows carry a PRE-SIGNED contribution (net − Σheads); on the COGS side
    // flip the sign (not the magnitude) so it reduces cost, while normal rows keep the
    // magnitude-flip. Keeps the gross heads + refund footing to the net total.
    const amt = r.refund ? (neg ? -r.amount : r.amount) : (neg ? -Math.abs(r.amount) : r.amount);
    const structural = !!(r.group || r.bucket || r.sub || r.module) && !r.component;
    return (
      <tr style={{ borderBottom: '1px solid #dfe2e7', background: r.group ? '#fbfcfe' : '#fff' }}>
        <td {...(clickable ? keyActivate(() => onRowClick(r)) : {})} className={clickable ? 'cl-drill' : undefined}
          style={{ padding: '3px 12px', paddingLeft: pad, color, fontWeight: bold ? 700 : 400, fontSize: r.component ? 12 : 13, fontStyle: r.component ? 'italic' : 'normal', textDecoration: r.group ? 'underline' : 'none', cursor: clickable ? 'pointer' : 'default', whiteSpace: 'nowrap', ...mono }}>
          {r.expandable ? <span onClick={(e) => { e.stopPropagation(); toggle(r); }} style={{ color: TALLY.gold, marginRight: 4, cursor: 'pointer' }}>{r.open ? '▾' : '▸'}</span> : null}
          {r.icon ? <span style={{ marginRight: 5 }}>{r.icon}</span> : null}{r.label}{r.module ? <span onClick={(e) => { e.stopPropagation(); setDrillModule(r.module); }} style={{ color: TALLY.gold, fontWeight: 700, cursor: 'pointer' }} title="Show booking files → vouchers"> ›</span> : r.ledger ? <span style={{ color: TALLY.gold, fontWeight: 700 }}> ›</span> : null}
        </td>
        <td style={{ padding: '3px 12px', textAlign: 'right', color, fontWeight: bold ? 700 : 400, fontSize: r.component ? 12 : 13, fontStyle: r.component ? 'italic' : 'normal', ...mono }}>{inr(amt)}</td>
        {r.component ? <td /> : pctCell(r.amount, bold)}
        <td style={{ padding: '3px 14px 3px 6px' }}>{structural ? <MiniBar pct={share(r.amount, nett)} tone={neg ? 'cogs' : 'sales'} /> : null}</td>
      </tr>
    );
  };
  const Head = ({ txt }) => (
    <tr style={{ background: '#f0f4fa', color: TALLY.head, borderBottom: `2px solid ${TALLY.head}` }}>
      <td style={{ padding: '7px 12px', fontWeight: 800, letterSpacing: 0.4, ...mono }}>{txt}</td>
      <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, ...mono }}>Amount</td>
      <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, fontSize: 11, ...mono }}>% Rev</td>
      <td />
    </tr>
  );
  const Sub = ({ txt, val, neg }) => (
    <tr style={{ borderTop: '1px solid #cdd1d8', background: '#fafbfe' }}>
      <td style={{ padding: '6px 12px', fontWeight: 700, color: TALLY.head, ...mono }}>{txt}</td>
      <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, ...mono }}>{inr(neg ? -Math.abs(val) : val)}</td>
      {pctCell(val, true)}
      <td />
    </tr>
  );
  const Result = ({ txt, val }) => (
    <tr style={{ borderTop: `2px solid ${TALLY.head}`, borderBottom: `3px double ${TALLY.head}`, background: '#f0f4fa' }}>
      <td style={{ padding: '8px 12px', fontWeight: 800, color: TALLY.head, ...mono }}>{txt}</td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: TALLY.green, ...mono }}>{inr(val)}</td>
      {pctCell(val, true)}
      <td />
    </tr>
  );

  const netProfit = d.bridge?.netProfit ?? 0;
  const npm = nett ? (netProfit / nett) * 100 : 0;
  const indOfGp = grossProfit ? (d.indirect.expense / grossProfit) * 100 : 0;
  const top = topByGP(modules, 5);
  const lo = lowestGp(modules);
  return (
    <div>
      <style>{STMT_GRID_CSS}</style>
      <KpiGrid>
        <Kpi tone="blue" label="Total Sales" value={compact(cur, d.totals.sales)} sub={`${modules.length} modules`} />
        <Kpi tone="red" label="Total COGS" value={compact(cur, d.totals.cogs)} sub={`${pctTxt(share(d.totals.cogs, d.totals.sales))} of sales`} />
        <Kpi tone="green" label="Gross Profit" value={compact(cur, grossProfit)} sub={`GP ${pctTxt(d.totals.gpPct)}`} />
        <Kpi tone="orange" label="Indirect Exp." value={compact(cur, d.indirect.expense)} sub={`${pctTxt(share(d.indirect.expense, d.totals.sales))} of sales`} />
        <Kpi tone="teal" label="Net Profit" value={compact(cur, netProfit)} sub={`NPM ${pctTxt(npm)}`} />
      </KpiGrid>
      <div className="stmt-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 18, alignItems: 'start' }}>
        <div className="tally-print-doc" style={{ background: '#fff', border: '1px solid #b0b0b0', borderRadius: 4, overflow: 'hidden', boxShadow: SHADOW, ...mono }}>
          <style>{`.cl-drill:hover{background:#eef4fb;text-decoration:underline}
@media print {
  @page { size: A4 portrait; margin: 8mm; }
  body * { visibility: hidden !important; }
  .tally-print-doc, .tally-print-doc * { visibility: visible !important; }
  .tally-print-doc { position: absolute !important; left: 0; top: 0; width: 100% !important; max-width: none !important; margin: 0 !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; }
  .tally-print-doc .cl-noprint { display: none !important; }
}`}</style>
          <div style={{ background: TALLY.titlebar, color: TALLY.head, padding: '5px 12px', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #a9c2e0' }}>
            <span>KBiz360 Books — {company}</span><span style={{ color: TALLY.gold }}>Profit &amp; Loss A/c · Vertical</span>
          </div>
          <div style={{ textAlign: 'center', padding: '10px 8px 8px', borderBottom: `2px solid ${TALLY.head}` }}>
            <div style={{ color: TALLY.head, fontSize: 16, fontWeight: 700 }}>{company}</div>
            <div style={{ fontSize: 13 }}>Profit &amp; Loss A/c (Vertical)</div>
            <div style={{ color: TALLY.gold, fontSize: 11, fontWeight: 700 }}>{periodTxt}</div>
          </div>
          {allKeys.length > 0 && (
            <div className="cl-noprint" style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '6px 12px', borderBottom: '1px solid #cdd1d8', background: '#fafbfe' }}>
              <button onClick={expandAll} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${TALLY.head}`, borderRadius: 5, background: '#fff', color: TALLY.head }}>⊞ Expand all</button>
              <button onClick={collapseAll} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${TALLY.head}`, borderRadius: 5, background: '#fff', color: TALLY.head }}>⊟ Collapse all</button>
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <colgroup><col /><col style={{ width: 150 }} /><col style={{ width: 64 }} /><col style={{ width: 210 }} /></colgroup>
            <tbody>
              <Head txt="Income" />
              <Row r={{ label: 'Revenue from Operations (Sales)', amount: d.totals.sales, group: true }} />
              {modules.flatMap((m) => moduleBlock(m, 'sales')).map((r, i) => <Row key={'s' + i} r={r} />)}
              {directIncome ? directBlock(d.totals.directIncomeGroups, directIncome, 'Direct Income', 'di').map((r, i) => <Row key={'di' + i} r={r} />) : null}
              <Sub txt="Total Revenue (Trading)" val={revenueTrading} />
              <Head txt="Less: Cost of Sales (COGS)" />
              <Row r={{ label: 'Purchase Accounts (COGS)', amount: d.totals.cogs, group: true }} neg />
              {modules.flatMap((m) => moduleBlock(m, 'cogs')).map((r, i) => <Row key={'c' + i} r={r} neg />)}
              <Sub txt="Total Cost of Sales" val={d.totals.cogs} neg />
              {directExpense ? directBlock(d.totals.directExpenseGroups, directExpense, 'Direct Expenses', 'de').map((r, i) => <Row key={'de' + i} r={r} neg />) : null}
              <Result txt="Gross Profit" val={grossProfit} />
              {!!indIncome && (oneIncomeLedger
                ? <Row r={{ label: 'Add: Other Income (Indirect Income)', amount: indIncome, ledger: allIncomeLedgers[0].name, leaf: true }} />
                : incomeGroups.length
                  ? <>
                      <Head txt="Add: Other Income (Indirect Income)" />
                      {incomeRows.map((r, i) => <Row key={'ii' + i} r={r} />)}
                    </>
                  : <Row r={{ label: 'Add: Other Income (Indirect Income)', amount: indIncome, ledger: 'Indirect Income', leaf: true }} />)}
              <Head txt="Less: Indirect Expenses" />
              <Row r={{ label: 'Indirect Expenses', amount: d.indirect.expense, group: true }} neg />
              {expenseRows.map((r, i) => <Row key={'e' + i} r={r} neg />)}
              <Result txt="Net Profit (to Capital A/c)" val={netProfit} />
            </tbody>
          </table>
          <div style={{ background: TALLY.titlebar, color: TALLY.head, fontSize: 11, fontWeight: 700, padding: '4px 12px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, borderTop: `2px solid ${TALLY.head}`, ...mono }}>
            <span>Gross Profit : <span style={{ color: TALLY.green }}>{inr(grossProfit)} ({pctTxt(d.totals.gpPct)})</span></span>
            <span>Net Profit : <span style={{ color: TALLY.green }}>{inr(netProfit)} ({pctTxt(npm)})</span></span>
            <span>Nett Sales : {inr(nett)}</span>
          </div>
        </div>

        <aside className="stmt-rail" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <RailCard title="Profitability">
            <Stat label="Gross margin" value={pctTxt(d.totals.gpPct)} tone={d.totals.gpPct >= 0 ? 'pos' : 'neg'} />
            <Stat label="Net margin" value={pctTxt(npm)} tone={npm >= 0 ? 'pos' : 'neg'} />
            <Stat label="Indirect exp / GP" value={grossProfit ? pctTxt(indOfGp) : '—'} />
            <Stat label="Break-even GP needed" value={compact(cur, d.indirect.expense)} last />
          </RailCard>
          {top.length > 0 && (
            <RailCard title="Top GP contributors">
              {top.map((m, i) => (
                <div key={i} style={{ fontSize: 12, padding: '5px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: SAP.text }}>{m.icon ? m.icon + ' ' : ''}{m.name}</span>
                    <b style={{ color: SAP.greenDk }}>{compact(cur, m.gp)} <span style={{ color: gpColor(m.gpPct) }}>({pctTxt(m.gpPct)})</span></b>
                  </div>
                  <MiniBar pct={m.bar} />
                </div>
              ))}
            </RailCard>
          )}
          <RailCard title="Watchlist">
            {lo ? <Stat label={`Lowest GP% · ${lo.name}`} value={pctTxt(lo.gpPct)} tone="warn" /> : null}
            <Stat label="Net profit" value={compact(cur, netProfit)} tone={netProfit >= 0 ? 'pos' : 'neg'} last />
          </RailCard>
        </aside>
      </div>
      {drillModule && <ModuleVoucherDrill module={drillModule} cur={cur} mobile={mobile} onClose={() => setDrillModule(null)} />}
    </div>
  );
}

/* ── Drill (stepped-tree) P&L view ────────────────────────────────────────────
   The hierarchy the user asked for, each level stepped into its OWN column:
     SALES / PURCHASE ACCOUNTS → Module → Int'l/Domestic → GL Ledger → Component
   Shown for BOTH sides and ALL modules. Clicking a GL ledger (Base Fare, Taxes,
   Land Package, Sales Return …) opens its full Ledger Account; inside that, a
   sale invoice opens the Sales Register and a purchase invoice the Purchase
   Register (wired via openLedgerModal's `invoiceToRegister`). Reuses the same
   modulePL data + pnlDetail helpers as Classic/Vertical, so the drill is identical. */
function DrillPnL({ d, cur, branch, periodTxt }) {
  const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(localeOf(cur)) : '—'; };
  const [openSub, setOpenSub] = useState({});
  const isOpen = (key, defOpen) => (openSub[key] === undefined ? defOpen : openSub[key]);
  const mono = { fontFamily: "'Courier New', Courier, monospace" };
  const company = (branch && branch !== 'ALL') ? (branch.code || branch) : 'All Branches — Consolidated';
  const modules = [...(d.modules || [])].sort((a, b) => azByName(a.name, b.name));
  const grossProfit = d.bridge?.grossProfit ?? d.totals.gp;

  const allKeys = moduleExpandKeys(modules);
  const expandAll = () => setOpenSub(Object.fromEntries(allKeys.map((k) => [k, true])));
  const collapseAll = () => setOpenSub(Object.fromEntries(allKeys.map((k) => [k, false])));
  const toggle = (r) => setOpenSub((s) => ({ ...s, [r.ekey]: !isOpen(r.ekey, false) }));
  // Row click: a GL ledger leaf → its Ledger Account (invoices inside route to the
  // Sales/Purchase Register); anything else expandable → toggle inline.
  const onRowClick = (r) => {
    if (r.ledgerHead && r.ledger) openLedgerModal(r.ledger, { invoiceToRegister: true });
    else if (r.expandable) toggle(r);
  };

  // One stepped row — its label sits in the column for its depth (0..3), amount
  // always in the last column. A caret (when expandable) toggles without drilling.
  const LABEL_COLS = 4;
  const Row = ({ r, neg }) => {
    const lvl = r.level || 0;
    const isLedger = !!(r.ledgerHead && r.ledger);
    const clickable = isLedger || r.expandable;
    const bold = lvl === 0 || r.costCentre;
    const color = r.component ? '#6a6a6a' : (lvl === 0 || r.costCentre) ? TALLY.head : isLedger ? '#1f3a8a' : '#1a1a1a';
    // Refund rows carry a PRE-SIGNED contribution (net − Σheads); on the COGS side
    // flip the sign (not the magnitude) so it reduces cost, while normal rows keep the
    // magnitude-flip. Keeps the gross heads + refund footing to the net total.
    const amt = r.refund ? (neg ? -r.amount : r.amount) : (neg ? -Math.abs(r.amount) : r.amount);
    return (
      <tr style={{ borderBottom: '1px solid #dfe2e7' }}>
        {Array.from({ length: LABEL_COLS }).map((_, c) => (
          <td key={c} {...(c === lvl && clickable ? keyActivate(() => onRowClick(r)) : {})}
            className={c === lvl && clickable ? 'cl-drill' : undefined}
            style={{ padding: '3px 8px', whiteSpace: 'nowrap', cursor: c === lvl && clickable ? 'pointer' : 'default', ...mono }}>
            {c === lvl && (
              <span style={{ color, fontWeight: bold ? 700 : 400, fontSize: r.component ? 11.5 : 12.5, fontStyle: r.component ? 'italic' : 'normal' }}>
                {r.expandable ? <span onClick={(e) => { e.stopPropagation(); toggle(r); }} style={{ color: TALLY.gold, marginRight: 4, cursor: 'pointer' }}>{isOpen(r.ekey, false) ? '▾' : '▸'}</span> : null}
                {r.icon ? <span style={{ marginRight: 4 }}>{r.icon}</span> : null}
                {r.component ? '• ' : ''}{r.label}
                {isLedger ? <span style={{ color: TALLY.gold, fontWeight: 700 }}> ›</span> : null}
              </span>
            )}
          </td>
        ))}
        <td style={{ padding: '3px 12px', textAlign: 'right', color, fontWeight: bold ? 700 : 400, fontSize: r.component ? 11.5 : 12.5, ...mono }}>{inr(amt)}</td>
      </tr>
    );
  };
  const GroupHead = ({ txt, val, neg }) => (
    <tr style={{ background: '#f0f4fa', borderBottom: `2px solid ${TALLY.head}`, borderTop: `2px solid ${TALLY.head}` }}>
      <td colSpan={LABEL_COLS} style={{ padding: '7px 10px', fontWeight: 800, color: TALLY.head, letterSpacing: 0.4, textTransform: 'uppercase', ...mono }}>{txt}</td>
      <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 800, color: TALLY.head, ...mono }}>{inr(neg ? -Math.abs(val) : val)}</td>
    </tr>
  );
  const Result = ({ txt, val }) => (
    <tr style={{ borderTop: `2px solid ${TALLY.head}`, borderBottom: `3px double ${TALLY.head}`, background: '#f0f4fa' }}>
      <td colSpan={LABEL_COLS} style={{ padding: '8px 10px', fontWeight: 800, color: TALLY.head, ...mono }}>{txt}</td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: TALLY.green, ...mono }}>{inr(val)}</td>
    </tr>
  );

  const salesRows = moduleSideRows(modules, 'sales', isOpen);
  const cogsRows = moduleSideRows(modules, 'cogs', isOpen);

  return (
    <div className="tally-print-doc" style={{ background: '#fff', border: '1px solid #b0b0b0', borderRadius: 4, overflow: 'hidden', margin: 12, ...mono }}>
      <style>{`.cl-drill:hover{background:#eef4fb;text-decoration:underline}
@media print { @page { size: A4 portrait; margin: 8mm; }
  body * { visibility: hidden !important; }
  .tally-print-doc, .tally-print-doc * { visibility: visible !important; }
  .tally-print-doc { position: absolute !important; left: 0; top: 0; width: 100% !important; margin: 0 !important; border: none !important; }
  .tally-print-doc .cl-noprint { display: none !important; } }`}</style>
      <div style={{ background: TALLY.titlebar, color: TALLY.head, padding: '5px 12px', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #a9c2e0' }}>
        <span>KBiz360 Books — {company}</span><span style={{ color: TALLY.gold }}>Profit &amp; Loss A/c · Drill</span>
      </div>
      <div style={{ textAlign: 'center', padding: '10px 8px 8px', borderBottom: `2px solid ${TALLY.head}` }}>
        <div style={{ color: TALLY.head, fontSize: 16, fontWeight: 700 }}>{company}</div>
        <div style={{ fontSize: 13 }}>Profit &amp; Loss A/c — drill (Group → Module → Int'l/Domestic → Ledger → Component)</div>
        <div style={{ color: TALLY.gold, fontSize: 11, fontWeight: 700 }}>{periodTxt}</div>
      </div>
      {allKeys.length > 0 && (
        <div className="cl-noprint" style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '6px 12px', borderBottom: '1px solid #cdd1d8', background: '#fafbfe' }}>
          <button onClick={expandAll} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${TALLY.head}`, borderRadius: 5, background: '#fff', color: TALLY.head }}>⊞ Expand all</button>
          <button onClick={collapseAll} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${TALLY.head}`, borderRadius: 5, background: '#fff', color: TALLY.head }}>⊟ Collapse all</button>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, maxWidth: 1600, margin: '0 auto', ...mono }}>
        <colgroup><col style={{ width: 28 }} /><col style={{ width: 200 }} /><col style={{ width: 220 }} /><col /><col style={{ width: 130 }} /></colgroup>
        <tbody>
          <GroupHead txt="Sales Accounts" val={d.totals.sales} />
          {salesRows.map((r, i) => <Row key={'s' + i} r={r} />)}
          <GroupHead txt="Purchase Accounts (COGS)" val={d.totals.cogs} neg />
          {cogsRows.map((r, i) => <Row key={'c' + i} r={r} neg />)}
          <Result txt="Gross Profit (Sales − COGS)" val={grossProfit} />
        </tbody>
      </table>
      <div style={{ background: '#d4d4d4', color: TALLY.head, fontSize: 11, fontWeight: 700, padding: '4px 12px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, borderTop: '1px solid #b0b0b0', ...mono }}>
        <span>Tap ▸ to step in (Module → Int'l/Domestic → Ledger → fares) · click a ledger (›) → its Ledger Account → an invoice opens the Sales / Purchase Register</span>
        <span>KBiz360 · live double-entry</span>
      </div>
    </div>
  );
}

/* ════════════════════════ BALANCE SHEET (Classic ⇄ Fiori) ══════════════ */
const CURRENT_ASSETS = new Set(['Current Assets', 'Bank Accounts', 'Cash-in-Hand', 'Deposits (Asset)', 'Loans & Advances (Asset)', 'Stock-in-Hand', 'Sundry Debtors']);
const CURRENT_LIABS = new Set(['Current Liabilities', 'Duties & Taxes', 'Provisions', 'Sundry Creditors', 'Bank OD Accounts']);
// Capital & reserves only — the P&L A/c is added via the signed `netProfit` so
// Net Worth stays correct regardless of which side a profit/loss is shown on
// (a net loss parks the P&L A/c on the Assets side, Tally-style).
const CAPITAL_RESERVES = new Set(['Capital Account', 'Reserves & Surplus']);
const sumGroups = (rows, set) => (rows || []).filter((g) => set.has(g.group)).reduce((s, g) => s + (g.amount || 0), 0);
const netWorthOf = (d) => sumGroups(d?.liabilities, CAPITAL_RESERVES) + (d?.netProfit || 0);

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
function BSToolbar({ mode, setMode, quick, setQuick, customDate, setCustomDate, rangeFrom, setRangeFrom, rangeTo, setRangeTo, cmp, setCmp, detail, setDetail, showZero, setShowZero, to, toPrev }) {
  const lbl = { fontSize: 10, fontWeight: 700, color: SAP.label, textTransform: 'uppercase', letterSpacing: 0.4 };
  const sel = { ...inp, width: 'auto', minHeight: 30, fontSize: 11.5, cursor: 'pointer' };
  const di = { ...inp, width: 'auto', minHeight: 30, fontSize: 11.5 };
  const fw = { display: 'flex', alignItems: 'center', gap: 6 };
  return (
    <div className="noprint" style={{ background: '#fff', border: `1px solid ${SAP.border}`, borderTop: 'none', padding: '10px 16px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
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
      {typeof setShowZero === 'function' && (
        <label style={{ ...fw, fontSize: 11.5, color: SAP.sec, cursor: 'pointer' }} title="Show every account in the chart, including those with a zero balance / no entries">
          <input type="checkbox" checked={!!showZero} onChange={(e) => setShowZero(e.target.checked)} /> Show zero-balance accounts
        </label>
      )}
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
function DiffCells({ cur, prev, showPY, dark, loc = 'en-IN' }) {
  const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(loc) : '—'; };
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

// ── Export: Excel (flatten to rows). PDF/Print now go through the in-app A4 preview. ──
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

export function ReportBSLive({ branch, forceView, hideSwitcher }) {
  const cur = curOf(branch);
  const mobile = useMobile();
  const [viewState, setView] = useState('fiori');      // 'fiori' | 'classic' | 'vertical'
  const view = forceView || viewState;                 // merged screen can pin the view
  const [mode, setMode] = useState('asOn');            // 'asOn' | 'range' — default As On Date
  const [quick, setQuick] = useState('today');         // default cut-off = current date
  const [customDate, setCustomDate] = useState(todayISO());
  const [rangeFrom, setRangeFrom] = useState(CUR_FY.startISO);
  const [rangeTo, setRangeTo] = useState(todayISO());
  const [cmp, setCmp] = useState('none');              // comparison (As On mode only)
  const [detail, setDetail] = useState('detailed');    // 'summary' | 'detailed'
  const [showZero, setShowZero] = useState(false);     // include zero-balance accounts

  // Every mode collapses to a primary as-on date + an optional comparison date.
  const to = mode === 'range' ? rangeTo : bsQuickDate(quick, customDate);
  const toPrev = mode === 'range' ? rangeFrom : bsCompareDate(cmp, to);
  const showPY = !!toPrev;

  const q = useBalanceSheet(branch, { to, includeZero: showZero });
  const qP = useBalanceSheet(branch, { to: toPrev, includeZero: showZero });
  const d = q.data;
  const prev = showPY ? qP.data : null;
  const prevMap = useMemo(() => {
    const m = {}; [...(prev?.liabilities || []), ...(prev?.assets || [])].forEach((g) => { m[g.group] = g.amount; }); return m;
  }, [prev]);

  const curLabel = `as at ${asOn(to)}`;
  const prevLabel = `as at ${asOn(toPrev)}`;

  // Consolidated = all-branches scope: render each branch as its own Balance Sheet
  // section in its OWN currency — never a merged cross-currency total. Driven by the
  // BE `byBranch` slice that carries the same shape as the merged top-level payload.
  const isAll = !branch || branch === 'ALL' || branch?.code === 'ALL';

  const doExcel = () => {
    if (!d) return;
    const cols = [{ key: 'side', label: 'Side' }, { key: 'level', label: 'Level' }, { key: 'name', label: 'Particulars' }, { key: 'amount', label: `Amount ${curLabel} (${cur})` }];
    if (showPY) cols.push({ key: 'prev', label: `Previous ${prevLabel} (${cur})` }, { key: 'diff', label: `Difference (${cur})` }, { key: 'pct', label: '% Change' });
    exportToExcel(`Balance-Sheet_${branchLabel(branch)}_${to || 'latest'}`, cols, bsExportRows({ d, prev, prevMap, showPY, detail }));
  };
  const doPrint = () => { if (d) { toast('Opening print view…', 'info'); openPrintPreview({ selector: 'main', title: 'Balance Sheet', recommend: 'landscape' }); } };
  const expBtn = (dis) => ({ padding: '6px 11px', fontSize: 11, fontWeight: 600, border: '1px solid rgba(255,255,255,0.3)', borderRadius: 5, cursor: dis ? 'default' : 'pointer', background: 'rgba(255,255,255,0.1)', color: '#fff', opacity: dis ? 0.45 : 1 });

  // One branch's Balance Sheet body (the chosen view), in that branch's currency.
  // `sd` is a byBranch slice (or the merged top-level `d` in single-branch mode).
  const renderBody = (sd, sPrev, sBranch, sCur) => {
    const sPrevMap = {}; [...(sPrev?.liabilities || []), ...(sPrev?.assets || [])].forEach((g) => { sPrevMap[g.group] = g.amount; });
    return view === 'fiori'
      ? <FioriBS d={sd} prev={sPrev} prevMap={sPrevMap} cur={sCur} showPY={showPY} curLabel={curLabel} prevLabel={prevLabel} branch={sBranch} to={to} mobile={mobile} detail={detail} />
      : view === 'vertical'
      ? <VerticalBS d={sd} cur={sCur} curLabel={curLabel} detail={detail} branch={sBranch} to={to} mobile={mobile} />
      : <ClassicBS d={sd} cur={sCur} curLabel={curLabel} detail={detail} branch={sBranch} to={to} mobile={mobile} />;
  };

  return (
    <Wrap wide>
      <FioriHead
        system="KBiz360 · Finance"
        title={`Balance Sheet — ${curLabel}`}
        sub={isAll
          ? <><strong>{branchLabel(branch)}</strong> &nbsp;|&nbsp; each branch in its own currency · <strong>no cross-currency total</strong> &nbsp;|&nbsp; Tally 28-Group Master &nbsp;|&nbsp; balances up to {asOn(to)}</>
          : <><strong>{branchLabel(branch)}</strong> &nbsp;|&nbsp; {cur} INR (excl. GST) &nbsp;|&nbsp; Tally 28-Group Master &nbsp;|&nbsp; balances from inception up to {asOn(to)}</>}
        right={<>
          {!hideSwitcher && <Segmented dark value={view} onChange={setView} options={[['fiori', '▪ Fiori'], ['classic', '▭ Classic'], ['vertical', '▤ Vertical']]} />}
          <button onClick={doPrint} disabled={!d} style={expBtn(!d)}>⤓ PDF</button>
          <button onClick={doExcel} disabled={!d} style={expBtn(!d)}>⤓ Excel</button>
          <button onClick={doPrint} disabled={!d} style={expBtn(!d)}>🖨 Print</button>
        </>}
      />
      <BSToolbar
        mode={mode} setMode={setMode} quick={quick} setQuick={setQuick}
        customDate={customDate} setCustomDate={setCustomDate}
        rangeFrom={rangeFrom} setRangeFrom={setRangeFrom} rangeTo={rangeTo} setRangeTo={setRangeTo}
        cmp={cmp} setCmp={setCmp} detail={detail} setDetail={setDetail}
        showZero={showZero} setShowZero={setShowZero} to={to} toPrev={toPrev}
      />
      <div style={{ background: SAP.pageBg, padding: (view === 'classic' || view === 'vertical') ? 0 : 16, border: `1px solid ${SAP.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
        <StateBox q={q} empty={!d}>
          {d && isAll && Array.isArray(d.byBranch)
            ? (d.byBranch.length === 0
              ? <div style={{ padding: 20, textAlign: 'center', color: SAP.label }}>No balances in any branch.</div>
              : d.byBranch.map((b) => {
                const sPrev = Array.isArray(prev?.byBranch) ? prev.byBranch.find((x) => x.branch === b.branch) : null;
                return (
                  <div key={b.branch} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: (view === 'classic' || view === 'vertical') ? '12px 12px 4px' : '2px 2px 10px', borderBottom: `2px solid ${SAP.blue}`, paddingBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: SAP.text }}>{branchLabel(b.branch)}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: SAP.sec }}>· {curOf(b.branch)}</span>
                    </div>
                    {renderBody(b, sPrev, b.branch, curOf(b.branch))}
                  </div>
                );
              }))
            : (d && renderBody(d, prev, branch, cur))}
        </StateBox>
      </div>
    </Wrap>
  );
}

/* ── Fiori "Expand all / Collapse all" control — shared by the Fiori P&L and
   Balance Sheet so all three views (Fiori · Classic · Vertical) offer the same
   bulk expand/collapse. Classic & Vertical carry their own equivalent buttons. */
function FioriExpandBar({ onExpand, onCollapse }) {
  const btn = { padding: '5px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', border: `1px solid ${SAP.blue}`, borderRadius: 6, background: '#fff', color: SAP.blue };
  return (
    <div className="noprint" style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 12 }}>
      <button type="button" onClick={onExpand} style={btn}>⊞ Expand all</button>
      <button type="button" onClick={onCollapse} style={btn}>⊟ Collapse all</button>
    </div>
  );
}

/* ── Fiori vertical view ─────────────────────────────────────────────── */
function FioriBS({ d, prev, prevMap, cur, showPY, curLabel, prevLabel, branch, to, mobile, detail }) {
  const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(localeOf(cur)) : '—'; };
  const netWorth = netWorthOf(d);
  const ca = sumGroups(d.assets, CURRENT_ASSETS), cl = sumGroups(d.liabilities, CURRENT_LIABS);
  const workingCap = ca - cl;
  const ratio = cl > 0 ? (ca / cl).toFixed(2) : '—';
  const [drillLedger, setDrillLedger] = useState(null);
  // Shared expand state for BOTH side cards, so one control expands/collapses the
  // whole statement (Liabilities + Assets) — mirroring Classic/Vertical.
  const [open, setOpen] = useState({});
  const [openSub, setOpenSub] = useState({});
  const summary = detail === 'summary';
  const { groupKeys, subKeys } = bsFioriExpandKeys(d, summary);
  const expandAll = () => { setOpen(Object.fromEntries(groupKeys.map((k) => [k, true]))); setOpenSub(Object.fromEntries(subKeys.map((k) => [k, true]))); };
  const collapseAll = () => { setOpen({}); setOpenSub({}); };
  return (
    <>
      <div style={{ background: d.balanced ? SAP.greenBg : '#fff3f3', border: `1px solid ${d.balanced ? '#b8ecb8' : '#ffb3b3'}`, borderRadius: 8, padding: '11px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, fontWeight: 600, color: d.balanced ? SAP.greenDk : SAP.red }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: d.balanced ? SAP.green : SAP.red, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{d.balanced ? '✓' : '!'}</span>
        {d.balanced ? 'Balanced' : 'Out of balance'} — Total Assets {cur}{inr(d.totalAssets)} {d.balanced ? '=' : '≠'} Total Liabilities {cur}{inr(d.totalLiabilities)} &nbsp;|&nbsp; Net Profit {cur}{inr(d.netProfit)} from P&amp;L A/c
      </div>

      <KpiGrid>
        <Kpi tone="blue" label="Balance Sheet Total" value={compact(cur, d.totalAssets)} sub="Assets = Liabilities" />
        <Kpi tone="green" label="Net Worth" value={compact(cur, netWorth)} sub="Capital + P&L A/c" trend={prev && <Trend cur={netWorth} prev={netWorthOf(prev)} />} />
        <Kpi tone="teal" label="Working Capital" value={compact(cur, workingCap)} sub="CA − CL" />
        <Kpi tone="purple" label="Current Ratio" value={ratio} sub={`CA ${compact(cur, ca)} / CL ${compact(cur, cl)}`} />
      </KpiGrid>

      {!summary && groupKeys.length > 0 && <FioriExpandBar onExpand={expandAll} onCollapse={collapseAll} />}

      <BSSideCard title="Liabilities — Tally Groups" rows={d.liabilities} total={d.totalLiabilities} totalLabel="TOTAL LIABILITIES"
        prevMap={prevMap} prevTotal={prev?.totalLiabilities} cur={cur} showPY={showPY} curLabel={curLabel} prevLabel={prevLabel} detail={detail} onPickLedger={detail === 'detailed' ? setDrillLedger : null}
        open={open} setOpen={setOpen} openSub={openSub} setOpenSub={setOpenSub} />
      <BSSideCard title="Assets — Tally Groups" rows={d.assets} total={d.totalAssets} totalLabel="TOTAL ASSETS"
        prevMap={prevMap} prevTotal={prev?.totalAssets} cur={cur} showPY={showPY} curLabel={curLabel} prevLabel={prevLabel} detail={detail} onPickLedger={detail === 'detailed' ? setDrillLedger : null}
        open={open} setOpen={setOpen} openSub={openSub} setOpenSub={setOpenSub} />

      <div style={{ background: '#fff', border: `1px solid ${SAP.border}`, borderRadius: 8, padding: '10px 18px', fontSize: 11, color: SAP.sec, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, boxShadow: SHADOW }}>
        <span><strong style={{ color: SAP.text }}>Group Master:</strong> Tally Default 28 Groups &nbsp;|&nbsp; <strong style={{ color: SAP.text }}>Net Profit:</strong> {cur}{inr(d.netProfit)} (from P&amp;L A/c) &nbsp;|&nbsp; <strong style={{ color: SAP.text }}>Tax:</strong> Excl. GST</span>
      </div>
      {drillLedger && <LedgerVoucherDrill ledger={drillLedger} branch={branch} to={to} cur={cur} mobile={mobile} onClose={() => setDrillLedger(null)} />}
    </>
  );
}
// A single leaf-ledger row (tap → drill into its postings → voucher → edit).
function bsLedgerRow(l, i, indent, onPickLedger, showPY, loc = 'en-IN') {
  const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(loc) : '—'; };
  return (
    <tr key={`${indent}-${i}-${l.name}`} {...keyActivate(() => onPickLedger && onPickLedger(l.name))}
      style={{ background: i % 2 ? SAP.rowAlt : '#fff', borderBottom: `1px solid ${SAP.borderLt}`, cursor: onPickLedger ? 'pointer' : 'default' }}>
      <td style={{ padding: `5px 16px 5px ${indent}px`, color: SAP.text }}>{l.name}{onPickLedger ? <span style={{ color: SAP.blue, fontWeight: 700, marginLeft: 6 }}>›</span> : null}</td>
      <td style={num}>{inr(l.amount)}</td>
      <DiffCells cur={l.amount} prev={null} showPY={showPY} loc={loc} />
    </tr>
  );
}

function BSSideCard({ title, rows, total, totalLabel, prevMap, prevTotal, cur, showPY, curLabel, prevLabel, onPickLedger, detail, open: openProp, setOpen: setOpenProp, openSub: openSubProp, setOpenSub: setOpenSubProp }) {
  const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(localeOf(cur)) : '—'; };
  // Controlled by FioriBS (shared across both side cards) when props are passed;
  // otherwise self-managed, so the card still works standalone.
  const [openLocal, setOpenLocal] = useState({});
  const [openSubLocal, setOpenSubLocal] = useState({});
  const open = openProp || openLocal;
  const setOpen = setOpenProp || setOpenLocal;
  const openSub = openSubProp || openSubLocal;
  const setOpenSub = setOpenSubProp || setOpenSubLocal;
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
                  <tr {...keyActivate(() => hasChildren && setOpen((s) => ({ ...s, [g.group]: !s[g.group] })))}
                    style={{ background: rowBg, color: rowColor, cursor: hasChildren ? 'pointer' : 'default', borderTop: '2px solid #b3ccf5', fontWeight: 700 }}>
                    <td style={{ padding: '9px 16px' }}>{hasChildren ? <Toggle open={isOpen} /> : <span style={{ marginRight: 7 }}>{g.isResult ? '●' : '•'}</span>}{g.group}</td>
                    <td style={num}>{inr(g.amount)}</td>
                    <DiffCells cur={g.amount} prev={pv} showPY={showPY} loc={localeOf(cur)} />
                  </tr>
                  {/* Sub-groups (if the ledgers carry one) → expand to their ledgers; A→Z within the group */}
                  {!summary && isOpen && [...subs].sort((a, b) => azByName(a.name, b.name)).map((sg) => {
                    const sk = `${g.group}|${sg.name}`;
                    const so = !!openSub[sk];
                    return (
                      <React.Fragment key={sk}>
                        <tr {...keyActivate(() => setOpenSub((s) => ({ ...s, [sk]: !s[sk] })))}
                          style={{ background: SAP.subBg, color: SAP.subText, cursor: 'pointer', borderBottom: `1px solid ${SAP.borderLt}`, fontWeight: 600 }}>
                          <td style={{ padding: '6px 16px 6px 38px' }}><Toggle open={so} />{sg.name}<span style={{ fontSize: 9, color: SAP.label, marginLeft: 6 }}>· {sg.ledgers.length} ledger{sg.ledgers.length > 1 ? 's' : ''}</span></td>
                          <td style={{ ...num, fontWeight: 600 }}>{inr(sg.amount)}</td>
                          <DiffCells cur={sg.amount} prev={null} showPY={showPY} loc={localeOf(cur)} />
                        </tr>
                        {so && [...sg.ledgers].sort((a, b) => azByName(a.name, b.name)).map((l, i) => bsLedgerRow(l, i, 62, onPickLedger, showPY, localeOf(cur)))}
                      </React.Fragment>
                    );
                  })}
                  {/* Ledgers with no sub-group hang directly under the 28-group head; A→Z within the group */}
                  {!summary && isOpen && [...direct].sort((a, b) => azByName(a.name, b.name)).map((l, i) => bsLedgerRow(l, i, 48, onPickLedger, showPY, localeOf(cur)))}
                </React.Fragment>
              );
            })}
            <tr style={{ background: SAP.shell, color: '#fff', fontWeight: 700, borderTop: `2px solid ${SAP.blue}` }}>
              <td style={{ padding: '11px 16px' }}>{totalLabel}</td>
              <td style={num}>{inr(total)}</td>
              <DiffCells cur={total} prev={showPY ? (prevTotal ?? null) : null} showPY={showPY} dark loc={localeOf(cur)} />
            </tr>
          </tbody>
        </table>
      </div>
    </FCard>
  );
}

/* ── Tally Classic (white) view ──────────────────────────────────────── */
// PRIMARY groups keep the backend's Tally-tree order (liabilities/assets arrive
// pre-sorted via BS_LIAB_ORDER / BS_ASSET_ORDER) — same as the Fiori view — so
// the Balance Sheet reads Capital → Loans → Current Liabilities / Fixed Assets →
// Investments → Current Assets, NOT alphabetically. Sub-Groups and Ledgers below
// each group still sort A→Z (azByName), which is normal Tally behaviour.
const sideRows = (groups, summary, isOpen = () => true, side = '') => [...(groups || [])].flatMap((g) => {
  if (summary) return [{ label: g.group, amount: g.amount, group: true, result: g.isResult }];
  const { subs, direct } = splitSubGroups(g.ledgers);
  return [
    { label: g.group, amount: g.amount, group: true, result: g.isResult },
    ...[...subs].sort((a, b) => azByName(a.name, b.name)).flatMap((s) => {
      const k = side + ':' + g.group + '/' + s.name;
      const open = isOpen(k, false); // sub-group collapsed by default → click to reveal ledgers
      const head = { label: s.name, amount: s.amount, sub: true, expandable: true, ekey: k, open };
      const ledgers = [...s.ledgers].sort((a, b) => azByName(a.name, b.name));
      return open ? [head, ...ledgers.map((l) => ({ label: l.name, amount: l.amount, ledger: l.name, leaf: true }))] : [head];
    }),
    ...[...direct].sort((a, b) => azByName(a.name, b.name)).map((l) => ({ label: l.name, amount: l.amount, ledger: l.name })),
  ];
});
function ClassicBS({ d, cur, curLabel, detail, branch, to, mobile }) {
  const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(localeOf(cur)) : '—'; };
  const summary = detail === 'summary';
  const [openSub, setOpenSub] = useState({});
  const [drillLedger, setDrillLedger] = useState(null);
  const isOpen = (k, def) => (openSub[k] === undefined ? def : openSub[k]);
  const left = sideRows(d.liabilities, summary, isOpen, 'L'), right = sideRows(d.assets, summary, isOpen, 'A');
  const n = Math.max(left.length, right.length);
  const mono = { fontFamily: "'Courier New', Courier, monospace" };

  // Expand / Collapse all — every sub-group key across both sides.
  const allKeys = [];
  if (!summary) {
    const collect = (groups, side) => (groups || []).forEach((g) => { splitSubGroups(g.ledgers).subs.forEach((s) => allKeys.push(side + ':' + g.group + '/' + s.name)); });
    collect(d.liabilities, 'L'); collect(d.assets, 'A');
  }
  const expandAll = () => setOpenSub(Object.fromEntries(allKeys.map((k) => [k, true])));
  const collapseAll = () => setOpenSub(Object.fromEntries(allKeys.map((k) => [k, false])));
  const onRowClick = (r) => { if (r.ledger) setDrillLedger(r.ledger); else if (r.expandable) setOpenSub((s) => ({ ...s, [r.ekey]: !r.open })); };

  const divCol = { borderLeft: '2px solid #cdd1d8' };
  const base = Math.abs(d.totalAssets || d.totalLiabilities || 0);
  const Cell = ({ r, divider }) => {
    if (!r) return (<><td style={divider ? divCol : undefined} /><td /><td /></>);
    const clickable = !!(r.ledger || r.expandable);
    const bold = !!(r.group || r.sub);
    const color = (r.group || r.sub) ? TALLY.head : '#444';
    const pad = r.group ? 12 : r.sub ? 28 : 44;
    return (
      <>
        <td {...(clickable ? keyActivate(() => onRowClick(r)) : {})} className={clickable ? 'cl-drill' : undefined}
          style={{ padding: '2px 14px', paddingLeft: pad, color, fontWeight: bold ? 700 : 400, textDecoration: r.group ? 'underline' : 'none', cursor: clickable ? 'pointer' : 'default', whiteSpace: 'nowrap', ...(divider ? divCol : {}), ...mono }}>
          {r.expandable ? <span style={{ color: TALLY.gold, marginRight: 4 }}>{r.open ? '▾' : '▸'}</span> : null}{r.label}{r.ledger ? <span style={{ color: TALLY.gold, fontWeight: 700 }}> ›</span> : null}
        </td>
        <td style={{ padding: '2px 14px', textAlign: 'right', color: r.result ? TALLY.green : '#1a1a1a', fontWeight: (r.result || r.sub) ? 700 : 400, ...mono }}>{inr(r.amount)}</td>
        <td style={{ padding: '2px 10px', textAlign: 'right', color: SAP.sec, fontSize: 11, ...mono }}>{share(r.amount, base) >= 0.05 ? `${share(r.amount, base).toFixed(1)}%` : ''}</td>
      </>
    );
  };
  const ca = sumGroups(d.assets, CURRENT_ASSETS), cl = sumGroups(d.liabilities, CURRENT_LIABS);
  return (
    <div className="tally-print-doc" style={{ background: '#fff', border: '1px solid #b0b0b0', borderRadius: 4, overflow: 'hidden', ...mono, margin: 12 }}>
      <style>{`.cl-drill:hover{background:#eef4fb;text-decoration:underline}
@media print {
  @page { size: A4 landscape; margin: 8mm; }
  body * { visibility: hidden !important; }
  .tally-print-doc, .tally-print-doc * { visibility: visible !important; }
  .tally-print-doc { position: absolute !important; left: 0; top: 0; width: 100% !important; margin: 0 !important; border: none !important; border-radius: 0 !important; overflow: visible !important; box-shadow: none !important; }
  .tally-print-doc .cl-noprint { display: none !important; }
  .tally-print-doc table { page-break-inside: auto; width: 100% !important; }
  .tally-print-doc tr, .tally-print-doc td { page-break-inside: avoid; }
}`}</style>
      <div style={{ background: TALLY.titlebar, color: TALLY.head, padding: '5px 12px', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #a9c2e0' }}>
        <span>KBiz360 Books — {branchLabelClassic(d)}</span><span style={{ color: TALLY.gold }}>Balance Sheet</span>
      </div>
      <div style={{ textAlign: 'center', padding: '10px 8px 8px', borderBottom: `2px solid ${TALLY.head}` }}>
        <div style={{ color: TALLY.head, fontSize: 16, fontWeight: 700 }}>{branchLabelClassic(d)}</div>
        <div style={{ fontSize: 13 }}>Balance Sheet</div>
        <div style={{ color: TALLY.gold, fontSize: 11, fontWeight: 700 }}>{curLabel}</div>
      </div>
      {allKeys.length > 0 && (
        <div className="cl-noprint" style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '6px 12px', borderBottom: '1px solid #cdd1d8', background: '#fafbfe' }}>
          <button onClick={expandAll} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${TALLY.head}`, borderRadius: 5, background: '#fff', color: TALLY.head }}>⊞ Expand all</button>
          <button onClick={collapseAll} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${TALLY.head}`, borderRadius: 5, background: '#fff', color: TALLY.head }}>⊟ Collapse all</button>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <colgroup><col /><col style={{ width: 130 }} /><col style={{ width: 56 }} /><col /><col style={{ width: 130 }} /><col style={{ width: 56 }} /></colgroup>
        <tbody>
          <tr style={{ color: TALLY.head, fontWeight: 700, background: '#f0f4fa', borderBottom: `2px solid ${TALLY.head}` }}>
            <td style={{ padding: '6px 14px', ...mono }}>Liabilities</td><td style={{ padding: '6px 14px', textAlign: 'right', ...mono }}>{curLabel}</td><td style={{ padding: '6px 10px', textAlign: 'right', fontSize: 11, ...mono }}>% Tot</td>
            <td style={{ padding: '6px 14px', ...divCol, ...mono }}>Assets</td><td style={{ padding: '6px 14px', textAlign: 'right', ...mono }}>{curLabel}</td><td style={{ padding: '6px 10px', textAlign: 'right', fontSize: 11, ...mono }}>% Tot</td>
          </tr>
          {Array.from({ length: n }).map((_, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #dfe2e7', background: i % 2 ? '#fbfcfe' : '#fff' }}><Cell r={left[i]} /><Cell r={right[i]} divider /></tr>
          ))}
          <tr style={{ color: TALLY.head, fontWeight: 700, borderTop: `2px solid ${TALLY.head}`, borderBottom: `3px double ${TALLY.head}`, background: '#f0f4fa' }}>
            <td style={{ padding: '7px 14px', ...mono }}>Total</td><td style={{ padding: '7px 14px', textAlign: 'right', color: TALLY.gold, ...mono }}>{inr(d.totalLiabilities)}</td><td style={{ padding: '7px 10px', ...mono }} />
            <td style={{ padding: '7px 14px', ...divCol, ...mono }}>Total</td><td style={{ padding: '7px 14px', textAlign: 'right', color: TALLY.gold, ...mono }}>{inr(d.totalAssets)}</td><td style={{ padding: '7px 10px', ...mono }} />
          </tr>
        </tbody>
      </table>
      <div style={{ background: TALLY.titlebar, color: TALLY.head, fontSize: 11, fontWeight: 700, padding: '4px 12px', display: 'flex', justifyContent: 'space-between', borderTop: `2px solid ${TALLY.head}`, ...mono }}>
        <span>Working Capital : <span style={{ color: TALLY.green }}>{inr(ca - cl)}</span></span>
        <span>Net Profit : <span style={{ color: TALLY.green }}>{inr(d.netProfit)}</span></span>
        <span>Diff in Op Balance : <span style={{ color: TALLY.green }}>{d.balanced ? '0.00' : inr(d.totalLiabilities - d.totalAssets)}</span></span>
      </div>
      {drillLedger && <LedgerVoucherDrill ledger={drillLedger} branch={branch} to={to} cur={cur} mobile={mobile} onClose={() => setDrillLedger(null)} />}
    </div>
  );
}
const branchLabelClassic = (d) => (d?.filter?.branch && d.filter.branch !== 'ALL' ? d.filter.branch : 'All Branches — Consolidated');

/* ── Vertical (single-column, statutory-style) Balance Sheet view ─────────────
   Renders the SAME `d` as Fiori/Classic (same groups via sideRows/splitSubGroups,
   same totals d.totalLiabilities/d.totalAssets) — just stacked top-to-bottom:
   Equity & Liabilities above Assets. Fully drillable like Classic. */
function VerticalBS({ d, cur, curLabel, detail, branch, to, mobile }) {
  const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(localeOf(cur)) : '—'; };
  const summary = detail === 'summary';
  const [openSub, setOpenSub] = useState({});
  const [drillLedger, setDrillLedger] = useState(null);
  const isOpen = (k, def) => (openSub[k] === undefined ? def : openSub[k]);
  const left = sideRows(d.liabilities, summary, isOpen, 'L');
  const right = sideRows(d.assets, summary, isOpen, 'A');
  const mono = { fontFamily: "'Courier New', Courier, monospace" };

  const allKeys = [];
  if (!summary) {
    const collect = (groups, side) => (groups || []).forEach((g) => { splitSubGroups(g.ledgers).subs.forEach((s) => allKeys.push(side + ':' + g.group + '/' + s.name)); });
    collect(d.liabilities, 'L'); collect(d.assets, 'A');
  }
  const expandAll = () => setOpenSub(Object.fromEntries(allKeys.map((k) => [k, true])));
  const collapseAll = () => setOpenSub(Object.fromEntries(allKeys.map((k) => [k, false])));
  const onRowClick = (r) => { if (r.ledger) setDrillLedger(r.ledger); else if (r.expandable) setOpenSub((s) => ({ ...s, [r.ekey]: !r.open })); };

  const ca = sumGroups(d.assets, CURRENT_ASSETS), cl = sumGroups(d.liabilities, CURRENT_LIABS);
  const netWorth = netWorthOf(d);
  const ratio = cl > 0 ? (ca / cl).toFixed(2) : '—';
  const base = Math.abs(d.totalAssets || d.totalLiabilities || 0);
  const bsTop = [...(d.assets || [])].filter((g) => Math.abs(g.amount) > 0).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 5);
  const bsMax = Math.abs(bsTop[0]?.amount) || 1;
  const pctCell = (v, bold) => <td style={{ padding: '4px 10px', textAlign: 'right', color: SAP.sec, fontSize: 11.5, fontWeight: bold ? 700 : 400, ...mono }}>{share(v, base) >= 0.05 ? `${share(v, base).toFixed(1)}%` : ''}</td>;
  const Row = ({ r }) => {
    if (!r) return null;
    const clickable = !!(r.ledger || r.expandable);
    const bold = !!(r.group || r.sub);
    const color = (r.group || r.sub) ? TALLY.head : '#444';
    const pad = r.group ? 16 : r.sub ? 32 : 50;
    const structural = !!(r.group || r.sub);
    return (
      <tr style={{ borderBottom: '1px solid #dfe2e7', background: r.group ? '#fbfcfe' : '#fff' }}>
        <td {...(clickable ? keyActivate(() => onRowClick(r)) : {})} className={clickable ? 'cl-drill' : undefined}
          style={{ padding: '4px 14px', paddingLeft: pad, color, fontWeight: bold ? 700 : 400, textDecoration: r.group ? 'underline' : 'none', cursor: clickable ? 'pointer' : 'default', whiteSpace: 'nowrap', ...mono }}>
          {r.expandable ? <span style={{ color: TALLY.gold, marginRight: 4 }}>{r.open ? '▾' : '▸'}</span> : null}{r.label}{r.ledger ? <span style={{ color: TALLY.gold, fontWeight: 700 }}> ›</span> : null}
        </td>
        <td style={{ padding: '4px 14px', textAlign: 'right', color: r.result ? TALLY.green : '#1a1a1a', fontWeight: (r.result || r.sub) ? 700 : 400, ...mono }}>{inr(r.amount)}</td>
        {pctCell(r.amount, r.sub)}
        <td style={{ padding: '4px 14px 4px 6px' }}>{structural ? <MiniBar pct={share(r.amount, base)} tone="sales" /> : null}</td>
      </tr>
    );
  };
  const sectionHead = (txt) => (
    <tr style={{ background: '#f0f4fa', color: TALLY.head, borderBottom: `2px solid ${TALLY.head}` }}>
      <td style={{ padding: '7px 14px', fontWeight: 800, letterSpacing: 0.4, ...mono }}>{txt}</td>
      <td style={{ padding: '7px 14px', textAlign: 'right', fontWeight: 700, ...mono }}>Amount ({cur})</td>
      <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, fontSize: 11, ...mono }}>% Tot</td>
      <td />
    </tr>
  );
  const totalRow = (txt, val) => (
    <tr style={{ color: TALLY.head, fontWeight: 700, borderTop: `2px solid ${TALLY.head}`, borderBottom: `3px double ${TALLY.head}`, background: '#f0f4fa' }}>
      <td style={{ padding: '8px 14px', ...mono }}>{txt}</td>
      <td style={{ padding: '8px 14px', textAlign: 'right', color: TALLY.gold, ...mono }}>{inr(val)}</td>
      <td style={{ padding: '8px 10px', textAlign: 'right', color: SAP.sec, fontSize: 11.5, fontWeight: 700, ...mono }}>{share(val, base) >= 0.05 ? `${share(val, base).toFixed(1)}%` : ''}</td>
      <td />
    </tr>
  );
  return (
    <div>
      <style>{STMT_GRID_CSS}</style>
      <KpiGrid>
        <Kpi tone="blue" label="Balance Sheet Total" value={compact(cur, d.totalAssets)} sub="Assets = Liabilities" />
        <Kpi tone="green" label="Net Worth" value={compact(cur, netWorth)} sub="Capital + P&L A/c" />
        <Kpi tone="teal" label="Working Capital" value={compact(cur, ca - cl)} sub="CA − CL" />
        <Kpi tone="purple" label="Current Ratio" value={ratio} sub={`CA ${compact(cur, ca)} / CL ${compact(cur, cl)}`} />
      </KpiGrid>
      <div className="stmt-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 18, alignItems: 'start' }}>
        <div className="tally-print-doc" style={{ background: '#fff', border: '1px solid #b0b0b0', borderRadius: 4, overflow: 'hidden', boxShadow: SHADOW, ...mono }}>
          <style>{`.cl-drill:hover{background:#eef4fb;text-decoration:underline}
@media print {
  @page { size: A4 portrait; margin: 8mm; }
  body * { visibility: hidden !important; }
  .tally-print-doc, .tally-print-doc * { visibility: visible !important; }
  .tally-print-doc { position: absolute !important; left: 0; top: 0; width: 100% !important; max-width: none !important; margin: 0 !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; }
  .tally-print-doc .cl-noprint { display: none !important; }
}`}</style>
          <div style={{ background: TALLY.titlebar, color: TALLY.head, padding: '5px 12px', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #a9c2e0' }}>
            <span>KBiz360 Books — {branchLabelClassic(d)}</span><span style={{ color: TALLY.gold }}>Balance Sheet · Vertical</span>
          </div>
          <div style={{ textAlign: 'center', padding: '10px 8px 8px', borderBottom: `2px solid ${TALLY.head}` }}>
            <div style={{ color: TALLY.head, fontSize: 16, fontWeight: 700 }}>{branchLabelClassic(d)}</div>
            <div style={{ fontSize: 13 }}>Balance Sheet (Vertical)</div>
            <div style={{ color: TALLY.gold, fontSize: 11, fontWeight: 700 }}>{curLabel}</div>
          </div>
          {allKeys.length > 0 && (
            <div className="cl-noprint" style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '6px 12px', borderBottom: '1px solid #cdd1d8', background: '#fafbfe' }}>
              <button onClick={expandAll} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${TALLY.head}`, borderRadius: 5, background: '#fff', color: TALLY.head }}>⊞ Expand all</button>
              <button onClick={collapseAll} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${TALLY.head}`, borderRadius: 5, background: '#fff', color: TALLY.head }}>⊟ Collapse all</button>
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <colgroup><col /><col style={{ width: 150 }} /><col style={{ width: 64 }} /><col style={{ width: 210 }} /></colgroup>
            <tbody>
              {sectionHead('I.  Equity & Liabilities')}
              {left.map((r, i) => <Row key={'L' + i} r={r} />)}
              {totalRow('Total — Equity & Liabilities', d.totalLiabilities)}
              <tr><td colSpan={4} style={{ height: 10, background: '#fff' }} /></tr>
              {sectionHead('II. Assets')}
              {right.map((r, i) => <Row key={'A' + i} r={r} />)}
              {totalRow('Total — Assets', d.totalAssets)}
            </tbody>
          </table>
          <div style={{ background: TALLY.titlebar, color: TALLY.head, fontSize: 11, fontWeight: 700, padding: '4px 12px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, borderTop: `2px solid ${TALLY.head}`, ...mono }}>
            <span>Working Capital : <span style={{ color: TALLY.green }}>{inr(ca - cl)}</span></span>
            <span>Net Profit : <span style={{ color: TALLY.green }}>{inr(d.netProfit)}</span></span>
            <span>Diff in Op Balance : <span style={{ color: TALLY.green }}>{d.balanced ? '0.00' : inr(d.totalLiabilities - d.totalAssets)}</span></span>
          </div>
        </div>

        <aside className="stmt-rail" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <RailCard title="Composition">
            <Stat label="Current Assets" value={compact(cur, ca)} />
            <Stat label="Current Liabilities" value={compact(cur, cl)} />
            <Stat label="Net Worth" value={compact(cur, netWorth)} tone="pos" />
            <Stat label="Net Profit (P&L)" value={compact(cur, d.netProfit)} tone={d.netProfit >= 0 ? 'pos' : 'neg'} last />
          </RailCard>
          {bsTop.length > 0 && (
            <RailCard title="Largest asset groups">
              {bsTop.map((g, i) => (
                <div key={i} style={{ fontSize: 12, padding: '5px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: SAP.text }}>{g.group}</span><b>{compact(cur, g.amount)}</b>
                  </div>
                  <MiniBar pct={(Math.abs(g.amount) / bsMax) * 100} />
                </div>
              ))}
            </RailCard>
          )}
          <RailCard title="Health">
            <Stat label="Current ratio" value={ratio} tone={cl > 0 && ca / cl >= 1 ? 'pos' : 'warn'} />
            <Stat label="Working capital" value={compact(cur, ca - cl)} tone={ca - cl >= 0 ? 'pos' : 'neg'} />
            <Stat label="Status" value={d.balanced ? 'Balanced ✓' : 'Out of balance'} tone={d.balanced ? 'pos' : 'neg'} last />
          </RailCard>
        </aside>
      </div>
      {drillLedger && <LedgerVoucherDrill ledger={drillLedger} branch={branch} to={to} cur={cur} mobile={mobile} onClose={() => setDrillLedger(null)} />}
    </div>
  );
}

/* ════════════════════════ AR / AP AGEING (Phase 2, live) ═══════════════════ */
/* Receivables / Payables are now 2-tab workbenches sharing ONE bill-wise truth:
 *   • Ageing                  → monitor: open bills bucketed by age + on-account
 *   • Open Bills & On-Account  → act:     settle bills bill-wise (the Settle modal)
 * Both read the same no-FIFO source, so the numbers always agree. The old combined
 * /finance/outstanding screen is retired in favour of these side-scoped tabs.     */
function ArApScreen({ branch, side, setRoute, initialTab }) {
  const isRec = side === 'receivables';
  const [tab, setTab] = useState(initialTab || 'ageing'); // 'ageing' | 'settle' | 'net'
  // "Adjust advance" deep-link from an ageing row: jump to the Settle tab focused on
  // that party's on-account advances (supplier payments / customer receipts) so they
  // can be allocated to an open bill. Works symmetrically on both AR and AP.
  const [advFocus, setAdvFocus] = useState(''); // party whose advances to focus
  const adjustAdvance = (party) => { setAdvFocus(party); setTab('settle'); };
  // The "Net" tab is the same-party Debtors − Creditors view (replaces the old
  // standalone Net Ageing screen). It's offered on both AR and AP workbenches.
  const TABS = [['ageing', 'Ageing'], ['settle', 'Open Bills & On-Account ▸ Settle'], ['net', 'Net (Debtors − Creditors)']];
  const tabBtn = (active) => ({
    padding: '8px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
    border: `1px solid ${SAP.border}`, borderBottom: 'none', borderRadius: '8px 8px 0 0',
    background: active ? SAP.blue : '#fff', color: active ? '#fff' : SAP.sec,
  });
  return (
    <>
      <div className="noprint" style={{ maxWidth: 1600, margin: '0 auto', padding: '8px 6px 0', display: 'flex', gap: 6 }}>
        {TABS.map(([id, label]) => <button key={id} onClick={() => setTab(id)} style={tabBtn(tab === id)}>{label}</button>)}
      </div>
      {tab === 'ageing'
        ? <AgeingReport branch={branch} side={side} setRoute={setRoute} onAdjustAdvance={adjustAdvance} />
        : tab === 'net'
          ? <NetAgeingView branch={branch} setRoute={setRoute} />
          : <OutstandingOnAccount branch={branch} side={isRec ? 'customer' : 'supplier'}
              initialTab={advFocus ? (isRec ? 'recAdv' : 'payAdv') : undefined} initialParty={advFocus || undefined} />}
    </>
  );
}
export function ReceivablesLive({ branch, setRoute, initialTab }) { return <ArApScreen branch={branch} side="receivables" setRoute={setRoute} initialTab={initialTab} />; }
export function PayablesLive({ branch, setRoute, initialTab }) { return <ArApScreen branch={branch} side="payables" setRoute={setRoute} initialTab={initialTab} />; }

const BUCKETS = [['d0', '0–30'], ['d30', '31–60'], ['d60', '61–90'], ['d90', '90+']];
const bucketColor = (k) => ({ d0: SAP.greenDk, d30: SAP.gold, d60: SAP.orange, d90: SAP.red }[k] || SAP.text);

function AgeingReport({ branch, side, setRoute, onAdjustAdvance, embedded, asOfProp }) {
  const cur = curOf(branch);
  // Branch-aware number grouping for this operational AR/AP screen — the file-level
  // `inr`/`compact` are en-IN (shared with P&L/BS); here amounts follow the branch's
  // currency locale so a USD branch reads $1,234.56-style grouping. Value unchanged.
  const loc = localeOf(cur);
  const inrL = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(loc) : '—'; };
  const compactL = (n) => compactCur(cur, n);
  const mobile = useMobile();
  // `embedded` = a per-branch section inside the consolidated view: it hides the big
  // header + date control and takes the as-of cut-off from the parent (asOfProp).
  const [asOfState, setAsOf] = useState(''); // '' = today; otherwise YYYY-MM-DD cut-off
  const asOf = embedded ? (asOfProp || '') : asOfState;
  const q = useAgeing(branch, asOf);
  const d = q.data;
  const data = d ? d[side] : null;
  const rows = data?.rows || [];
  const totals = data?.totals || { d0: 0, d30: 0, d60: 0, d90: 0, total: 0 };
  const [drillLedger, setDrillLedger] = useState(null);

  const isRec = side === 'receivables';
  // Consolidated = the all-branches scope. Render branch-wise (never merge currencies),
  // but only at the top level — an embedded per-branch section is always single-branch.
  const isAll = !embedded && (!branch || branch === 'ALL' || branch?.code === 'ALL');
  const partyLabel = isRec ? 'Customer' : 'Supplier';
  const overdue = totals.d30 + totals.d60 + totals.d90;
  const share = (x) => (totals.total > 0 ? (x / totals.total) * 100 : 0);
  // On-account advances are unapplied credits (no FIFO) — surfaced separately,
  // never netted into the age buckets. Net = gross open bills − on-account.
  const netTotal = totals.net != null ? totals.net : (totals.total - (totals.onAccount || 0));
  const rowNet = (r) => (r.net != null ? r.net : (r.total - (r.onAccount || 0)));

  // The KPIs + party-wise ageing table for THIS scope, in THIS branch's currency.
  const body = (
    <StateBox q={q} empty={!data || rows.length === 0}>
      <KpiGrid>
        <Kpi tone="blue" label="Open Bills (gross)" value={compactL(totals.total)} sub={`${rows.length} ${partyLabel.toLowerCase()}s`} />
        <Kpi tone="green" label="Current (0–30)" value={compactL(totals.d0)} sub={pctTxt(share(totals.d0))} />
        <Kpi tone="orange" label="Overdue (>30 days)" value={compactL(overdue)} sub={pctTxt(share(overdue))} />
        <Kpi tone="red" label="Critical (90+ days)" value={compactL(totals.d90)} sub={pctTxt(share(totals.d90))} />
        <Kpi tone="purple" label="On-Account (unapplied)" value={compactL(totals.onAccount || 0)} sub={`${isRec ? 'advances in' : 'advances out'} · settle bill-wise`} />
        <Kpi tone="teal" label="Net Exposure" value={compactL(netTotal)} sub="open bills − on-account" />
      </KpiGrid>

      <FCard title={`${partyLabel}-wise Ageing`} sub="Tap a row to drill into the ledger and edit its vouchers"
        badge={<Badge bg={SAP.blueBg} c={SAP.blue} bd="#b8d6ff">{rows.length} {partyLabel.toLowerCase()}s</Badge>}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead><tr><Th w="22%">{partyLabel}</Th>{BUCKETS.map(([, lbl]) => <Th key={lbl} right>{lbl}</Th>)}<Th right>Open Bills</Th><Th right>On-Account</Th><Th right>Net</Th><Th right w="13%">Share of Open</Th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.party + i} {...keyActivate(() => openLedgerModal(r.party))}
                  style={{ background: i % 2 ? SAP.rowAlt : '#fff', borderBottom: `1px solid ${SAP.borderLt}`, cursor: 'pointer' }}>
                  <td style={{ padding: '7px 16px', color: SAP.text, fontWeight: 600 }}>{r.party}<span style={{ color: SAP.blue, fontWeight: 700, marginLeft: 6 }}>›</span>
                    {setRoute && (
                      <button className="noprint" title={`Open ${partyLabel} 360° View`}
                        onClick={(e) => { e.stopPropagation(); setRoute(`/reports/${isRec ? 'customer' : 'supplier'}-360?party=${encodeURIComponent(r.party)}`); }}
                        style={{ marginLeft: 8, padding: '1px 7px', fontSize: 10.5, fontWeight: 700, border: `1px solid ${SAP.border}`, borderRadius: 10, background: SAP.blueBg, color: SAP.blue, cursor: 'pointer' }}>360°</button>
                    )}
                  </td>
                  {BUCKETS.map(([k]) => <td key={k} style={{ ...num, color: r[k] ? bucketColor(k) : SAP.label }}>{inrL(r[k])}</td>)}
                  <td style={{ ...num, fontWeight: 700, color: SAP.text }}>{inrL(r.total)}</td>
                  <td style={{ ...num, color: r.onAccount ? SAP.purple : SAP.label }}>{inrL(r.onAccount || 0)}
                    {onAdjustAdvance && r.onAccount > 0.01 && (
                      <button className="noprint" title="Adjust this advance against an open bill"
                        onClick={(e) => { e.stopPropagation(); onAdjustAdvance(r.party); }}
                        style={{ marginLeft: 6, padding: '1px 6px', fontSize: 10, fontWeight: 700, border: `1px solid ${SAP.border}`, borderRadius: 9, background: '#fff', color: SAP.purple, cursor: 'pointer' }}>Adjust ▸</button>
                    )}
                  </td>
                  <td style={{ ...num, fontWeight: 700, color: SAP.text }}>{inrL(rowNet(r))}</td>
                  <td style={{ padding: '7px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: SAP.sec, width: 42, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{pctTxt(share(r.total))}</span>
                      <div style={{ flex: 1, minWidth: 36 }}><MiniBar pct={share(r.total)} /></div>
                    </div>
                  </td>
                </tr>
              ))}
              <tr style={{ background: SAP.shell, color: '#fff', fontWeight: 700, borderTop: `2px solid ${SAP.blue}` }}>
                <td style={{ padding: '10px 16px' }}>TOTAL</td>
                {BUCKETS.map(([k]) => <td key={k} style={num}>{inrL(totals[k])}</td>)}
                <td style={num}>{inrL(totals.total)}</td>
                <td style={num}>{inrL(totals.onAccount || 0)}</td>
                <td style={num}>{inrL(netTotal)}</td>
                <td style={num}>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </FCard>
    </StateBox>
  );

  // Embedded per-branch section (inside the consolidated view): just the body — the
  // parent owns the header + date control + the per-branch label.
  if (embedded) {
    return <>{body}{drillLedger && <LedgerVoucherDrill ledger={drillLedger} branch={branch} to="" cur={cur} mobile={mobile} onClose={() => setDrillLedger(null)} />}</>;
  }

  const dateControl = (
    <div className="noprint" style={{ maxWidth: 1600, margin: '6px auto 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
      <span style={{ color: SAP.sec, fontWeight: 600 }}>Age as on</span>
      <input type="date" value={asOfState} onChange={(e) => setAsOf(e.target.value)}
        style={{ padding: '4px 8px', border: `1px solid ${SAP.border}`, borderRadius: 6, fontSize: 12 }} />
      {asOfState && <button onClick={() => setAsOf('')} style={{ padding: '4px 10px', border: `1px solid ${SAP.border}`, borderRadius: 6, background: '#fff', color: SAP.blue, fontWeight: 700, cursor: 'pointer' }}>Today</button>}
      <span style={{ color: SAP.label }}>{asOfState ? 'historic snapshot' : 'live · today'}</span>
    </div>
  );

  // Consolidated (all-branches): show each branch SEPARATELY in its own currency —
  // never a merged cross-branch / cross-currency total. Driven by the BE `byBranch`.
  if (isAll && Array.isArray(d?.byBranch)) {
    return (
      <Wrap wide>
        <FioriHead system="KBiz360 · Finance"
          title={isRec ? 'Accounts Receivable — Ageing · All Branches' : 'Accounts Payable — Ageing · All Branches'}
          sub={<>Consolidated — each branch shown separately in its own currency · <strong>no cross-currency total</strong> &nbsp;|&nbsp; as of {d?.asOf || '—'}</>}
        />
        {dateControl}
        <div style={{ background: SAP.pageBg, padding: 16, border: `1px solid ${SAP.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
          {d.byBranch.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: SAP.label }}>Nothing outstanding in any branch.</div>}
          {d.byBranch.map((b) => (
            <div key={b.branch} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '2px 2px 8px', borderBottom: `2px solid ${SAP.blue}`, paddingBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: SAP.text }}>{branchLabel(b.branch)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: SAP.sec }}>· {curOf(b.branch)}</span>
              </div>
              <AgeingReport branch={b.branch} side={side} setRoute={setRoute} onAdjustAdvance={onAdjustAdvance} embedded asOfProp={asOf} />
            </div>
          ))}
        </div>
      </Wrap>
    );
  }

  return (
    <Wrap wide>
      <FioriHead
        system="KBiz360 · Finance"
        title={isRec ? 'Accounts Receivable — Ageing' : 'Accounts Payable — Ageing'}
        sub={<><strong>{branchLabel(branch)}</strong> &nbsp;|&nbsp; {cur} incl. GST &nbsp;|&nbsp; as of {d?.asOf || '—'} &nbsp;|&nbsp; bill-wise · no FIFO · live double-entry</>}
      />
      {dateControl}
      <div style={{ background: SAP.pageBg, padding: 16, border: `1px solid ${SAP.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
        {body}
        {drillLedger && <LedgerVoucherDrill ledger={drillLedger} branch={branch} to="" cur={cur} mobile={mobile} onClose={() => setDrillLedger(null)} />}
      </div>
    </Wrap>
  );
}

function NetAgeingView({ branch }) {
  const cur = curOf(branch);
  const [asOf, setAsOf] = useState('');
  const q = useAgeing(branch, asOf);
  const d = q.data;
  // Consolidated = all-branches: render branch-wise, never merge currencies.
  const isAll = !branch || branch === 'ALL' || branch?.code === 'ALL';

  // Net-exposure KPIs + by-party table for ONE scope's data, in `sCur`. Net Ageing is
  // same-party only (never cross-party / cross-branch), so each branch nets within itself.
  const section = (data, sCur) => {
    const loc = localeOf(sCur);
    const inrL = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(loc) : '—'; };
    const compactL = (n) => compactCur(sCur, n);
    const { rows, totals } = computeNetAgeing(data);
    const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.net)));
    return (
      <>
        <KpiGrid>
          <Kpi tone="green" label="Total Receivable" value={compactL(totals.receivable)} sub="net of advances in" />
          <Kpi tone="orange" label="Total Payable" value={compactL(totals.payable)} sub="net of advances out" />
          <Kpi tone={totals.net >= 0 ? 'blue' : 'red'} label="Net Position" value={compactL(totals.net)} sub={totals.net >= 0 ? 'net receivable' : 'net payable'} />
        </KpiGrid>
        <FCard title="Net exposure by party" sub="Tap a row to drill into the ledger · positive = they owe us, negative = we owe them"
          badge={<Badge bg={SAP.blueBg} c={SAP.blue} bd="#b8d6ff">{rows.length} parties</Badge>}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead><tr><Th w="34%">Party</Th><Th right>Receivable</Th><Th right>Payable</Th><Th right>Net</Th><Th right w="22%">Direction</Th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.party + i} {...keyActivate(() => openLedgerModal(r.party))}
                    style={{ background: i % 2 ? SAP.rowAlt : '#fff', borderBottom: `1px solid ${SAP.borderLt}`, cursor: 'pointer' }}>
                    <td style={{ padding: '7px 16px', color: SAP.text, fontWeight: 600 }}>{r.party}<span style={{ color: SAP.blue, fontWeight: 700, marginLeft: 6 }}>›</span></td>
                    <td style={{ ...num, color: r.receivable ? SAP.greenDk : SAP.label }}>{inrL(r.receivable)}</td>
                    <td style={{ ...num, color: r.payable ? SAP.orange : SAP.label }}>{inrL(r.payable)}</td>
                    <td style={{ ...num, fontWeight: 700, color: r.net >= 0 ? SAP.greenDk : SAP.red }}>{inrL(r.net)}</td>
                    <td style={{ padding: '7px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: r.net >= 0 ? SAP.greenDk : SAP.red, width: 38, flexShrink: 0 }}>{r.net >= 0 ? 'owes us' : 'we owe'}</span>
                        <div style={{ flex: 1, minWidth: 36 }}><MiniBar pct={(Math.abs(r.net) / maxAbs) * 100} color={r.net >= 0 ? 'linear-gradient(90deg,#22c55e,#15803d)' : 'linear-gradient(90deg,#f87171,#bb0000)'} /></div>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: SAP.shell, color: '#fff', fontWeight: 700, borderTop: `2px solid ${SAP.blue}` }}>
                  <td style={{ padding: '10px 16px' }}>TOTAL</td>
                  <td style={num}>{inrL(totals.receivable)}</td>
                  <td style={num}>{inrL(totals.payable)}</td>
                  <td style={num}>{inrL(totals.net)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </FCard>
      </>
    );
  };

  const dateControl = (
    <div className="noprint" style={{ maxWidth: 1600, margin: '6px auto 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
      <span style={{ color: SAP.sec, fontWeight: 600 }}>Age as on</span>
      <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)}
        style={{ padding: '4px 8px', border: `1px solid ${SAP.border}`, borderRadius: 6, fontSize: 12 }} />
      {asOf && <button onClick={() => setAsOf('')} style={{ padding: '4px 10px', border: `1px solid ${SAP.border}`, borderRadius: 6, background: '#fff', color: SAP.blue, fontWeight: 700, cursor: 'pointer' }}>Today</button>}
    </div>
  );

  // Consolidated: each branch netted within itself, shown separately in its own currency.
  if (isAll && Array.isArray(d?.byBranch)) {
    return (
      <Wrap wide>
        <FioriHead system="KBiz360 · Finance"
          title="Net Ageing — Debtors − Creditors · All Branches"
          sub={<>Consolidated — each branch netted within itself, in its own currency · <strong>no cross-currency total</strong> &nbsp;|&nbsp; as of {d?.asOf || '—'}</>}
        />
        {dateControl}
        <div style={{ background: SAP.pageBg, padding: 16, border: `1px solid ${SAP.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
          {d.byBranch.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: SAP.label }}>Nothing to net in any branch.</div>}
          {d.byBranch.map((b) => (
            <div key={b.branch} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '2px 2px 8px', borderBottom: `2px solid ${SAP.blue}`, paddingBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: SAP.text }}>{branchLabel(b.branch)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: SAP.sec }}>· {curOf(b.branch)}</span>
              </div>
              {section(b, curOf(b.branch))}
            </div>
          ))}
        </div>
      </Wrap>
    );
  }

  return (
    <Wrap wide>
      <FioriHead
        system="KBiz360 · Finance"
        title="Net Ageing — Debtors − Creditors (same party)"
        sub={<><strong>{branchLabel(branch)}</strong> &nbsp;|&nbsp; {cur} &nbsp;|&nbsp; as of {d?.asOf || '—'} &nbsp;|&nbsp; net of on-account · same-party only</>}
      />
      {dateControl}
      <div style={{ background: SAP.pageBg, padding: 16, border: `1px solid ${SAP.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
        <StateBox q={q} empty={!d || computeNetAgeing(d).rows.length === 0}>
          {section(d, cur)}
        </StateBox>
      </div>
    </Wrap>
  );
}
