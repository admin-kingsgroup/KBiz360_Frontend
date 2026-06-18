/* ════════════════════════════════════════════════════════════════════
   MODULES/ACCOUNTING-LIVE.JSX

   Tally-style books & financial reports rendered from the LIVE double-entry
   engine in the backend (kbiz360-erp-backend → /api/accounting, /api/vouchers,
   /api/ledgers). Every voucher saved in the ERP posts a balanced journal
   (Debit = Credit); these screens aggregate those postings in real time:

     Day Book · Ledger A/c · Trial Balance · Profit & Loss · Balance Sheet
     Sales / Purchase Register · 28 Tally Groups · Chart of Accounts

   The look matches the existing Books reports (dark #0d1326 header, gold
   #d4a437 accents). No demo data — empty in, empty out.
   ════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo, useState } from 'react';
import { card, inp, bc } from '../core/styles';
import { exportToExcel, vouchersToSheet } from '../core/exportExcel';
import { voucherHaystack, bookingTravelDetail } from '../core/registerSearch';
import { isVatBranch } from '../core/voucherSpecs';
import { openPrintPreview } from '../core/PrintPreview';
import { buildBookingInvoice } from '../core/invoiceHtml';
import { useReportExport } from '../core/reportExportContext';
import { LedgerAccountView } from '../core/ledgerUI';
import { openLedgerModal } from '../core/LedgerModalHost';
import { usePrefs } from '../core/prefs';
import { pushModal } from '../core/ux/modalStore';
import { toast } from '../core/ux/toast';
import { CUR_QUARTER, CUR_FY } from '../core/dates';
import { PeriodBar } from '../core/period';
import { CONSOLIDATED_LABEL } from '../core/data';
import {
  useTrialBalance, useProfitAndLoss, useBalanceSheet, useDayBook,
  useLedgerStatement, useLedgerGroups, useChartOfAccounts, useGroupTree,
  useSalesRegister, usePurchaseRegister, useRefundReissue, useInvoiceGP, useBookingOrders,
  useVoucher, useUpdateVoucher, useCostCenters, useVoucherPreview,
} from '../core/useAccounting';
import { LedgerVouchers } from './pnlTally.jsx';
import { VoucherShell } from '../core/voucher/VoucherShell';
import { hasRegistry } from '../core/voucher/registry';

const DARK = '#0d1326', GOLD = '#d4a437', DIM = '#5a6691', BLUE = '#185FA5', RED = '#A32D2D', GREEN = '#27500A';
const curOf = (branch) => bc(branch).cur;
const money = (cur, n) => { const v = Math.round(Number(n) || 0); return v ? cur + v.toLocaleString('en-IN') : '—'; };
const branchLabel = (branch) => (!branch || branch === 'ALL' ? CONSOLIDATED_LABEL : (branch.code || branch));

/* ── shared chrome ──────────────────────────────────────────────────── */
function Page({ title, sub, right, children, wide }) {
  return (
    <div style={{ padding: wide ? '10px 8px' : '12px 10px', maxWidth: wide ? 'none' : 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: DARK }}>{title}</h2>
          {sub && <p style={{ margin: '2px 0 0', fontSize: 10.5, color: DIM }}>{sub}</p>}
        </div>
        {right && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{right}</div>}
      </div>
      {children}
    </div>
  );
}

const DateInput = (props) => <input type="date" {...props} style={{ ...inp, width: 140, minHeight: 32, fontSize: 11 }} />;

// ── tolerant date handling ─────────────────────────────────────────────────
// Tally-imported voucher dates arrive as mixed strings ("16-Mar-26",
// "06-12-2025", "23-02-2026", ISO). Parse them all so the filter actually works.
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function parseAnyDate(s) {
  if (!s) return null;
  const str = String(s).trim();
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);          // ISO  2026-06-01
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = str.match(/^(\d{1,2})[-/]([A-Za-z]{3,})[-/](\d{2,4})$/); // 16-Mar-26
  if (m) { const mo = MONTHS[m[2].slice(0, 3).toLowerCase()]; if (mo == null) return null; let y = +m[3]; if (y < 100) y += 2000; return new Date(y, mo, +m[1]); }
  m = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);      // 06-12-2025 (DD-MM-YYYY, Tally/Indian)
  if (m) { let y = +m[3]; if (y < 100) y += 2000; return new Date(y, +m[2] - 1, +m[1]); }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}
// Keep rows whose date falls in [fromISO, toISO]; empty bound = open-ended.
// Unparseable dates are kept so data is never silently dropped.
function dateInRange(value, fromISO, toISO) {
  const d = parseAnyDate(value); if (!d) return true;
  const f = parseAnyDate(fromISO); if (f && d < f) return false;
  const t = parseAnyDate(toISO); if (t && d > t) return false;
  return true;
}
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthStartISO = () => { const t = new Date(); return isoDate(new Date(t.getFullYear(), t.getMonth(), 1)); };
const todayISO = () => isoDate(new Date());
// Rolling window start = N days back from today (negative day index is normalised by Date).
const daysAgoISO = (n) => { const t = new Date(); return isoDate(new Date(t.getFullYear(), t.getMonth(), t.getDate() - n)); };

// From/to date inputs with quick presets. The shared report date filter — every
// report (current and future) imports this so the date-range UX is identical
// everywhere. `from`/`to` are ISO strings; '' on both = open-ended ("All").
// Defaults are owned by each caller (most seed `monthStartISO()`→`todayISO()`).
// Uniform period selector (All/Today/Week/MTD/QTD/LFY/CFY + dates, per-branch FY).
export function DateRange({ from, to, setFrom, setTo, branch }) {
  return <PeriodBar branch={branch} compact defaultPreset="all" onChange={(r) => { setFrom(r.from); setTo(r.to); }} />;
}

function Banner({ tone = 'info', children }) {
  const T = {
    ok: { bg: '#EAF3DE', bd: '#C0DD97', c: GREEN },
    err: { bg: '#FCEBEB', bd: '#F7C1C1', c: RED },
    info: { bg: '#E6F1FB', bd: '#BcdAF2', c: BLUE },
  }[tone] || { bg: '#E6F1FB', bd: '#cfe0f5', c: BLUE };
  return <div style={{ marginBottom: 10, padding: '8px 14px', borderRadius: 8, background: T.bg, border: `1px solid ${T.bd}`, fontSize: 10.5, color: T.c, fontWeight: 600 }}>{children}</div>;
}

function State({ q, empty, children }) {
  if (q.isLoading) return <div style={{ ...card, padding: 28, textAlign: 'center', color: DIM, fontSize: 12 }}>Loading live data…</div>;
  if (q.isError) return <Banner tone="err">⚠ {q.error?.message || 'Failed to load from backend'}</Banner>;
  if (empty) return <div style={{ ...card, padding: 28, textAlign: 'center', color: DIM, fontSize: 12 }}>No data for this selection.</div>;
  return children;
}

// "Export to Excel" button — CSV that opens straight into Excel columns.
function ExportBtn({ onClick, disabled, label = 'Export to Excel' }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        background: '#15803d', color: '#fff', borderColor: '#15803d' }}
      title="Download all rows with the full bifurcation as a CSV that opens in Excel">
      ⬇ {label}
    </button>
  );
}

// Reusable per-voucher detail: header chips + every line's full meta breakup
// (base fare, K3, taxes, service charge, CGST/SGST/IGST, markup, TCS …).
export function VoucherLines({ voucher: v, cur }) {
  // Full-JV preview: the SAME engine the edit screen uses, so the popup shows the
  // COMPLETE balanced journal (party Dr, every component head, GST, TCS/TDS) for both
  // Sales and Purchase — not just the captured component lines. The hook must run
  // unconditionally (rules of hooks); it's gated to a real voucher with a category.
  const pv = useVoucherPreview(v && v.category ? v : null).data || {};
  if (!v) return null;
  // The shared `money` renders 0 as '—'; the JV must show a real ₹0 on the empty side
  // so EVERY ledger is visible with an explicit amount.
  const money0 = (n) => cur + Math.round(Number(n) || 0).toLocaleString('en-IN');
  const F = ({ label, val }) => (
    <div style={{ minWidth: 110 }}>
      <div style={{ fontSize: 9, color: DIM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
      <div style={{ fontSize: 12, color: DARK, fontWeight: 600 }}>{val || '—'}</div>
    </div>
  );
  const jvTh = { textAlign: 'left', padding: '5px 8px', color: DIM, fontSize: 10, whiteSpace: 'nowrap' };
  const lockedByBooking = v.locked && v.source === 'booking';
  const postings = pv.postings || [];
  return (
    <>
      {lockedByBooking && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: '#FAEEDA', border: '1px solid #FAC775', color: '#854F0B', fontSize: 11.5, fontWeight: 600 }}>
          🔒 Locked — driven by booking <b>{v.bookingId}</b>. Edit it on the SO / PO / GP booking (this Sales/Purchase voucher is read-only).
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 12 }}>
        <F label="Voucher" val={v.vno} /><F label="Date" val={v.date} /><F label="Branch" val={v.branch} />
        <F label={v.category === 'purchase' ? 'Supplier' : 'Customer'} val={v.party} />
        <F label="Link No" val={v.linkNo} /><F label="Taxable" val={money(cur, v.subtotal)} />
        <F label="GST" val={money(cur, v.taxAmt)} /><F label="Total" val={money(cur, v.total)} />
      </div>
      {postings.length > 0 ? (
        // Full journal — every ledger, both sides; a zero side shows ₹0 (dimmed), never hidden.
        <div style={{ ...card, padding: 10, marginBottom: 10, boxShadow: 'none', border: '1px solid #eef1f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 700, color: DARK, fontSize: 12 }}>Full Journal Entry — every ledger this hits</div>
            {typeof pv.balanced === 'boolean' && <span style={{ fontSize: 11, fontWeight: 800, color: pv.balanced ? GREEN : RED }}>{pv.balanced ? '✓ Balanced' : `✗ Out by ${money0(pv.diff)}`}</span>}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead><tr><th style={jvTh}>Ledger</th><th style={jvTh}>Group</th><th style={{ ...jvTh, textAlign: 'right' }}>Debit</th><th style={{ ...jvTh, textAlign: 'right' }}>Credit</th></tr></thead>
            <tbody>
              {postings.map((p, i) => {
                const zeroD = !(Number(p.debit) > 0), zeroC = !(Number(p.credit) > 0);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f2f4f8' }}>
                    <td style={{ padding: '5px 8px', fontWeight: 600, color: DARK }}>{p.ledger}</td>
                    <td style={{ padding: '5px 8px', color: DIM }}>{p.group || '—'}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: zeroD ? '#9aa3bd' : BLUE }}>{money0(p.debit)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: zeroC ? '#9aa3bd' : RED }}>{money0(p.credit)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr style={{ fontWeight: 800, background: '#f3f5f9' }}><td style={{ padding: '6px 8px' }} colSpan={2}>Total</td><td style={{ padding: '6px 8px', textAlign: 'right', color: BLUE }}>{money0(pv.totalDebit)}</td><td style={{ padding: '6px 8px', textAlign: 'right', color: RED }}>{money0(pv.totalCredit)}</td></tr></tfoot>
          </table>
        </div>
      ) : (
        // Fallback when the preview is unavailable: the captured component-head lines.
        // Skip object-valued meta so internal detail never renders as "[object Object]".
        (v.lines || []).map((ln, i) => {
          const meta = ln.meta && typeof ln.meta === 'object' ? ln.meta : {};
          const entries = Object.entries(meta).filter(([, val]) => val !== '' && val != null && typeof val !== 'object');
          return (
            <div key={i} style={{ ...card, padding: 12, marginBottom: 10, boxShadow: 'none', border: '1px solid #eef1f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: entries.length ? 8 : 0 }}>
                <span style={{ fontWeight: 700, color: DARK, fontSize: 12.5 }}>{ln.ledger || `Line ${i + 1}`}</span>
                <span style={{ fontWeight: 700, color: BLUE, fontVariantNumeric: 'tabular-nums' }}>{money0(ln.amt)}</span>
              </div>
              {entries.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '4px 14px' }}>
                  {entries.map(([k, val]) => (
                    <div key={k} style={{ fontSize: 11 }}>
                      <span style={{ color: DIM }}>{k}: </span><span style={{ color: DARK, fontWeight: 600 }}>{String(val)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
      {v.remarks && <div style={{ fontSize: 11, color: DIM }}>Remarks: {v.remarks}</div>}
    </>
  );
}

const Table = ({ children, maxHeight }) => (
  <div className="kb-sticky" style={{ ...card, padding: 0, '--stick-head': DARK, '--stick-foot': DARK, ...(maxHeight ? { maxHeight } : null) }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>{children}</table>
  </div>
);
const Th = ({ children, right }) => (
  <th style={{ padding: '9px 14px', textAlign: right ? 'right' : 'left', color: GOLD, fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}>{children}</th>
);
const headRow = { background: DARK };
const rowBg = (i) => ({ borderBottom: '1px solid #f3f4f8', background: i % 2 === 0 ? '#fff' : '#fafafa' });
const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

// Voucher type → product bucket (for the register's product filter).
const PRODUCT = {
  SF: 'Flight', PF: 'Flight', SHT: 'Hotel', PHT: 'Hotel', SH: 'Holiday', PH: 'Holiday',
  SV: 'Visa', PV: 'Visa', SI: 'Insurance', PI: 'Insurance', SC: 'Car', PC: 'Car', SM: 'Misc', PM: 'Misc',
  SCN: 'Credit Note', SDN: 'Debit Note', RF: 'Refund', RI: 'Reissue',
};
const productOf = (v) => PRODUCT[v.type] || v.type;
// The module filter ALWAYS offers this full set (even when the current period/branch
// has no rows for a module), so every module is selectable — the list is not limited
// to what happens to be loaded. Extra values found in the data are appended.
const MODULE_ORDER = ['Flight', 'Hotel', 'Holiday', 'Visa', 'Insurance', 'Car', 'Misc', 'Refund', 'Reissue'];

// International vs Domestic for a register row. Prefer the joined booking's
// packageType; else infer from the posted component-head ledger prefixes (IT- =
// International, DT- = Domestic). Blank when the module carries no INT/DOM split.
const intDomOf = (v, booking) => {
  const pt = booking?.packageType || '';
  if (/int/i.test(pt)) return 'INT';
  if (/dom/i.test(pt)) return 'DOM';
  const ld = (v.lines || []).map((l) => l.ledger || '').join(' ');
  if (/(^|\s)IT-|International/i.test(ld)) return 'INT';
  if (/(^|\s)DT-|Domestic/i.test(ld)) return 'DOM';
  return '';
};

// Format a cell: numeric strings/numbers get Indian grouping + right align;
// everything else (PNR, ticket no, dates, names) stays left-aligned text.
function cellFmt(v) {
  if (v == null || v === '') return { text: '', num: false };
  const s = String(v).trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return { text: Number(s).toLocaleString('en-IN', { maximumFractionDigits: 2 }), num: true };
  return { text: String(v), num: false };
}

// Wide, horizontally-scrollable table that shows EVERY column inline — the same
// columns/rows produced for the Excel export, so the UI mirrors the export 1:1.
// A second scrollbar is mirrored at the TOP so you can scroll sideways without
// hunting for the bottom of a long list; the two stay in sync.
function DetailedTable({ columns, rows }) {
  const topRef = React.useRef(null);
  const bodyRef = React.useRef(null);
  const [scrollW, setScrollW] = useState(0);
  useEffect(() => {
    const measure = () => { if (bodyRef.current) setScrollW(bodyRef.current.scrollWidth); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [columns, rows]);
  const fromTop = () => { if (bodyRef.current && topRef.current) bodyRef.current.scrollLeft = topRef.current.scrollLeft; };
  const fromBody = () => { if (bodyRef.current && topRef.current) topRef.current.scrollLeft = bodyRef.current.scrollLeft; };
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      {/* mirrored top scrollbar */}
      <div ref={topRef} onScroll={fromTop} style={{ overflowX: 'auto', overflowY: 'hidden', height: 14, borderBottom: '1px solid #eef1f6' }}>
        <div style={{ width: scrollW || '100%', height: 1 }} />
      </div>
      {/* the table itself — scrolls vertically inside a bounded height so the header pins */}
      <div ref={bodyRef} onScroll={fromBody} className="kb-sticky" style={{ '--stick-head': DARK, maxHeight: 'calc(100vh - 220px)' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: '100%' }}>
          <thead><tr>
            {columns.map((c) => (
              <th key={c.key} style={{ padding: '8px 12px', textAlign: 'left', color: GOLD, fontWeight: 700, fontSize: 9.5, whiteSpace: 'nowrap', position: 'sticky', top: 0, background: DARK, zIndex: 1 }}>{c.label}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={rowBg(i)}>
                {columns.map((c) => {
                  const f = cellFmt(r[c.key]);
                  return <td key={c.key} style={{ padding: '7px 12px', whiteSpace: 'nowrap', color: DARK, textAlign: f.num ? 'right' : 'left', fontVariantNumeric: f.num ? 'tabular-nums' : 'normal' }}>{f.text || '—'}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Small Summary/Detailed view switch.
function ViewToggle({ view, setView }) {
  const B = ({ id, label }) => (
    <button onClick={() => setView(id)} style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, cursor: 'pointer', fontWeight: 700, background: view === id ? DARK : '#fff', color: view === id ? GOLD : DIM, borderColor: view === id ? DARK : '#e1e3ec' }}>{label}</button>
  );
  return <><B id="summary" label="Summary" /><B id="detailed" label="Detailed" /></>;
}

// Two-mode view switch with custom labels (Detailed / Minimal).
function ModeToggle({ view, setView, modes }) {
  return <>{modes.map((m) => (
    <button key={m.id} onClick={() => setView(m.id)} style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, cursor: 'pointer', fontWeight: 700, background: view === m.id ? DARK : '#fff', color: view === m.id ? GOLD : DIM, borderColor: view === m.id ? DARK : '#e1e3ec' }}>{m.label}</button>
  ))}</>;
}

// Indian-FY start (1 Apr). Used by the report range presets.
const fyStartISO = () => { const t = new Date(); const y = t.getMonth() >= 3 ? t.getFullYear() : t.getFullYear() - 1; return isoDate(new Date(y, 3, 1)); };
// Yesterday and start-of-week (Monday) — extra quick presets for full books.
const yesterdayISO = () => { const t = new Date(); t.setDate(t.getDate() - 1); return isoDate(t); };
const weekStartISO = () => { const t = new Date(); const back = (t.getDay() + 6) % 7; t.setDate(t.getDate() - back); return isoDate(t); };

// From/To range with quick presets. Defaults are seeded by each report (today),
// but the presets make it one tap to widen to month / financial year / all.
// Pass `full` for the complete accounting-book preset row (Today · Yesterday ·
// This Week · This Month · This Quarter · YTD · Current FY · All) — used by the
// Cash Book and other primary Finance books.
function RangeBar({ from, to, setFrom, setTo, onChange, full, branch }) {
  return <PeriodBar branch={branch} compact defaultPreset="all" onChange={(r) => { setFrom(r.from); setTo(r.to); onChange && onChange(); }} />;
}

// Search box — filters the current report by any free text (narration, ledger,
// voucher no, party). Controlled; clears the page back to 1 via onChange.
function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ ...inp, width: 200, minHeight: 32, fontSize: 11, paddingRight: value ? 26 : 10 }} />
      {value && <button onClick={() => onChange('')} title="Clear" style={{ position: 'absolute', right: 6, background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 14, lineHeight: 1 }}>✕</button>}
    </span>
  );
}

const PAGE_SIZES = [50, 100, 250, 1000];
// Client-side pager. `total` is the full filtered count; the table renders only
// the current page's slice while the sticky footer keeps the full-set totals.
function Pagination({ total, page, setPage, pageSize, setPageSize, unit = 'rows' }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= PAGE_SIZES[0]) return null;
  const cur = Math.min(page, pages - 1);
  const Btn = ({ label, to, disabled }) => (
    <button disabled={disabled} onClick={() => setPage(to)} style={{ ...inp, width: 'auto', minHeight: 30, fontSize: 11, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, fontWeight: 700, color: DIM }}>{label}</button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: 10, fontSize: 11, color: DIM }}>
      <span>{(cur * pageSize + 1).toLocaleString('en-IN')}–{Math.min((cur + 1) * pageSize, total).toLocaleString('en-IN')} of {total.toLocaleString('en-IN')} {unit}</span>
      <Btn label="« First" to={0} disabled={cur === 0} />
      <Btn label="‹ Prev" to={cur - 1} disabled={cur === 0} />
      <span style={{ fontWeight: 700, color: DARK }}>Page {cur + 1} / {pages}</span>
      <Btn label="Next ›" to={cur + 1} disabled={cur >= pages - 1} />
      <Btn label="Last »" to={pages - 1} disabled={cur >= pages - 1} />
      <select value={pageSize} onChange={(e) => { setPageSize(+e.target.value); setPage(0); }} style={{ ...inp, width: 'auto', minHeight: 30, fontSize: 11, cursor: 'pointer' }}>
        {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
      </select>
    </div>
  );
}

// Narration cell with expand/collapse for long text.
function NarrationCell({ text, clamp = 55 }) {
  const [open, setOpen] = useState(false);
  if (!text) return <span style={{ color: '#cfd3e0' }}>—</span>;
  const long = String(text).length > clamp;
  if (!long) return <span style={{ color: '#384677' }}>{text}</span>;
  return (
    <span style={{ color: '#384677' }}>
      {open ? text : String(text).slice(0, clamp) + '… '}
      <button onClick={() => setOpen((o) => !o)} style={{ background: 'none', border: 'none', color: BLUE, cursor: 'pointer', fontWeight: 700, fontSize: 10, padding: 0 }}>{open ? 'less' : 'more'}</button>
    </span>
  );
}

// Plain number for export/print (no currency symbol; blank when zero).
const nfmt = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString('en-IN') : ''; };

// Open a print-ready window for the report (Print, or "Save as PDF" in the
// dialog). Builds a clean B/W table from the same columns/rows used for export.
function openReportPrint(title, sub, columns, rows, totalRow) {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const cell = (c, v) => `<td style="text-align:${c.num ? 'right' : 'left'}">${esc(v)}</td>`;
  const head = columns.map((c) => `<th style="text-align:${c.num ? 'right' : 'left'}">${esc(c.label)}</th>`).join('');
  const body = rows.map((r) => '<tr>' + columns.map((c) => cell(c, r[c.key])).join('') + '</tr>').join('');
  const foot = totalRow ? '<tfoot><tr>' + columns.map((c) => cell(c, totalRow[c.key])).join('') + '</tr></tfoot>' : '';
  const win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) { alert('Please allow pop-ups to Print / Save as PDF.'); return; }
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#222;padding:14px;margin:0}
    h1{font-size:15pt;margin:0;color:#0d1326} .sub{font-size:9pt;color:#5a6691;margin:2px 0 12px}
    table{width:100%;border-collapse:collapse;font-size:8.5pt}
    th{background:#0d1326;color:#d4a437;padding:6px 8px;border:1px solid #0d1326;white-space:nowrap}
    td{padding:4px 8px;border:1px solid #e1e3ec}
    tbody tr:nth-child(even) td{background:#fafafa}
    tfoot td{font-weight:700;background:#0d1326;color:#fff;border-color:#0d1326}
    @media print{.np{display:none}}
    .np{margin-bottom:12px;padding:8px;background:#f3f4f8;border-radius:6px;font-size:9pt;text-align:center}
  </style></head><body>
  <div class="np">Press <b>Ctrl/Cmd + P</b> → choose <b>Save as PDF</b> or your printer.</div>
  <h1>${esc(title)}</h1><div class="sub">${esc(sub)}</div>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table>
  </body></html>`);
  win.document.close(); win.focus();
  setTimeout(() => { try { win.print(); } catch (e) { /* user can print manually */ } }, 400);
}

// "Print / PDF" toolbar button (mirrors ExportBtn styling).
function PrintBtn({ onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, background: '#fff', color: DARK, borderColor: '#d6dbe6' }}
      title="Open a print view — choose your printer or Save as PDF">🖨 Print / PDF</button>
  );
}

/* ════════════════════ LEDGER DRILL (TB → ledger statement → voucher) ═══ */
// Opened from the Trial Balance: shows the selected ledger's statement for the
// SAME date range, every line tappable down to the editable voucher.
function LedgerDrill({ branch, ledger, from, to, onClose }) {
  const cur = curOf(branch);
  const [voucher, setVoucher] = useState(null);
  useEffect(() => pushModal(onClose), []); // Esc closes (topmost-first)
  const crumbs = [
    { label: ledger, onClick: voucher ? () => setVoucher(null) : null },
    ...(voucher ? [{ label: voucher.vno }] : []),
  ];
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.5)', zIndex: 800, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '4vh 2vw' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 'min(960px, 96vw)', maxHeight: '92vh', overflowY: 'auto', padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #e5e9f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <Crumb items={crumbs} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 18, flexShrink: 0 }}>✕</button>
        </div>
        {voucher
          ? <VoucherEditor voucherId={voucher.id} cur={cur} onBack={() => setVoucher(null)} />
          : <LedgerVouchers name={ledger} branch={branch} from={from} to={to} onPick={(f) => f?.kind === 'voucher' && setVoucher({ id: f.id, vno: f.vno })} />}
      </div>
    </div>
  );
}

// Standalone voucher viewer modal — opened from the Day Book (and reusable).
function VoucherModal({ branch, voucher, onClose }) {
  const cur = curOf(branch);
  useEffect(() => pushModal(onClose), []); // Esc closes
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.5)', zIndex: 800, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '4vh 2vw' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 'min(840px, 96vw)', maxHeight: '92vh', overflowY: 'auto', padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #e5e9f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <Crumb items={[{ label: voucher.vno }]} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 18, flexShrink: 0 }}>✕</button>
        </div>
        <VoucherEditor voucherId={voucher.id} cur={cur} onBack={onClose} />
      </div>
    </div>
  );
}

/* ════════════════════ TRIAL BALANCE ════════════════════════════════ */
export function TrialBalanceLive({ branch }) {
  const cur = curOf(branch);
  const [from, setFrom] = useState(todayISO);
  const [to, setTo] = useState(todayISO);
  const [view, setView] = useState('detailed'); // detailed (4-col) | summary (closing only)
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [drill, setDrill] = useState(null); // ledger name
  const q = useTrialBalance(branch, { from, to });

  // Normalise: a not-yet-redeployed backend returns only debit/credit (= closing
  // on side). Map that onto the new columns so the screen still works.
  const rows = useMemo(() => (q.data?.rows || []).map((r) => (
    r.closingDebit != null || r.closingCredit != null
      ? r
      : { ...r, openingDebit: 0, openingCredit: 0, closingDebit: r.debit || 0, closingCredit: r.credit || 0, debit: 0, credit: 0 }
  )), [q.data]);

  const term = search.trim().toLowerCase();
  const filtered = useMemo(() => (term
    ? rows.filter((r) => `${r.ledger} ${r.group} ${r.code || ''}`.toLowerCase().includes(term))
    : rows), [rows, term]);

  const T = useMemo(() => {
    const s = (k) => Math.round(filtered.reduce((a, r) => a + (r[k] || 0), 0));
    return { openDr: s('openingDebit'), openCr: s('openingCredit'), dr: s('debit'), cr: s('credit'), clDr: s('closingDebit'), clCr: s('closingCredit') };
  }, [filtered]);
  const groupTotals = useMemo(() => {
    const m = new Map();
    for (const r of filtered) {
      if (!m.has(r.group)) m.set(r.group, { clDr: 0, clCr: 0, n: 0 });
      const g = m.get(r.group); g.clDr += r.closingDebit || 0; g.clCr += r.closingCredit || 0; g.n += 1;
    }
    return m;
  }, [filtered]);

  // Balanced banner reflects the FULL trial balance, not the searched subset —
  // otherwise a search that hides one side would falsely read "out of balance".
  const fullClDr = q.data?.totalClosingDebit != null ? q.data.totalClosingDebit : (q.data?.totalDebit || 0);
  const fullClCr = q.data?.totalClosingCredit != null ? q.data.totalClosingCredit : (q.data?.totalCredit || 0);
  const balanced = q.data ? Math.abs(fullClDr - fullClCr) < 1 : true;
  const pageRows = useMemo(() => filtered.slice(page * pageSize, page * pageSize + pageSize), [filtered, page, pageSize]);

  // Export / print share one column+row set (raw numbers, group on each row).
  const expColumns = view === 'summary'
    ? [{ key: 'group', label: 'Group' }, { key: 'ledger', label: 'Ledger' }, { key: 'closingDebit', label: `Closing Dr (${cur})`, num: true }, { key: 'closingCredit', label: `Closing Cr (${cur})`, num: true }]
    : [{ key: 'group', label: 'Group' }, { key: 'code', label: 'Code' }, { key: 'ledger', label: 'Ledger' },
       { key: 'openingDebit', label: `Opening Dr`, num: true }, { key: 'openingCredit', label: `Opening Cr`, num: true },
       { key: 'debit', label: `Debit`, num: true }, { key: 'credit', label: `Credit`, num: true },
       { key: 'closingDebit', label: `Closing Dr`, num: true }, { key: 'closingCredit', label: `Closing Cr`, num: true }];
  const expRows = filtered.map((r) => ({ ...r, code: r.code || '' }));
  const printRows = filtered.map((r) => { const o = { group: r.group, code: r.code || '', ledger: r.ledger }; for (const c of expColumns) if (c.num) o[c.key] = nfmt(r[c.key]); return o; });
  const totalRow = view === 'summary'
    ? { group: 'TOTAL', ledger: '', closingDebit: nfmt(T.clDr), closingCredit: nfmt(T.clCr) }
    : { group: 'TOTAL', code: '', ledger: '', openingDebit: nfmt(T.openDr), openingCredit: nfmt(T.openCr), debit: nfmt(T.dr), credit: nfmt(T.cr), closingDebit: nfmt(T.clDr), closingCredit: nfmt(T.clCr) };
  const sub = `${branchLabel(branch)} · ${filtered.length} ledgers · Closing Dr ${money(cur, T.clDr)} / Cr ${money(cur, T.clCr)}`;
  const exportNow = () => filtered.length && exportToExcel(`trial-balance-${branchLabel(branch)}`, expColumns, expRows);
  const printNow = () => filtered.length && openReportPrint('Trial Balance', sub, expColumns, printRows, totalRow);
  // Feed the global Tally Export bar each ledger's closing balance (Dr/Cr → sign).
  const tallyLedgers = useMemo(() => filtered.map((r) => {
    const dr = Math.round(r.closingDebit || 0), crv = Math.round(r.closingCredit || 0);
    return { name: r.ledger, parent: r.group, amount: dr >= crv ? dr : crv, drCr: dr >= crv ? 'Dr' : 'Cr' };
  }), [filtered]);
  useReportExport({ title: 'Trial Balance', kind: 'ledgers', rows: tallyLedgers, recommend: 'portrait' }, [tallyLedgers]);

  // group-header bookkeeping while rendering the page slice
  let lastGroup = null;

  return (
    <Page
      wide={view === 'detailed'}
      title="Trial Balance"
      sub={sub}
      right={<>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Ledger / group…" />
        <ModeToggle view={view} setView={setView} modes={[{ id: 'detailed', label: 'Detailed' }, { id: 'summary', label: 'Summary' }]} />
        <RangeBar from={from} to={to} setFrom={setFrom} setTo={setTo} onChange={() => setPage(0)} branch={branch} />
        <ExportBtn onClick={exportNow} disabled={!filtered.length} />
        <PrintBtn onClick={printNow} disabled={!filtered.length} />
      </>}
    >
      {q.data && (balanced
        ? <Banner tone="ok">✔ Trial Balance tallied — Closing Dr {money(cur, fullClDr)} = Cr {money(cur, fullClCr)}{term ? ' (full set)' : ''}</Banner>
        : <Banner tone="err">⚠ Out of balance — Closing Dr {money(cur, fullClDr)} ≠ Cr {money(cur, fullClCr)}</Banner>)}
      <State q={q} empty={filtered.length === 0}>
        <Table>
          <thead><tr style={headRow}>
            <Th>Ledger Account</Th>
            {view === 'detailed' && <><Th right>Opening Dr</Th><Th right>Opening Cr</Th><Th right>Debit</Th><Th right>Credit</Th></>}
            <Th right>Closing Dr ({cur})</Th><Th right>Closing Cr ({cur})</Th>
          </tr></thead>
          <tbody>
            {pageRows.map((l, i) => {
              const showGroup = l.group !== lastGroup;
              lastGroup = l.group;
              const gt = groupTotals.get(l.group);
              return (
                <React.Fragment key={(l.code || '') + l.ledger + i}>
                  {showGroup && (
                    <tr style={{ background: '#eef1f7' }}>
                      <td style={{ padding: '7px 14px', fontWeight: 800, color: DARK, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{l.group} <span style={{ color: DIM, fontWeight: 600 }}>· {gt?.n} ledger(s)</span></td>
                      {view === 'detailed' && <td colSpan={4} />}
                      <td style={{ padding: '7px 14px', ...num, fontWeight: 700, color: DIM, fontSize: 10.5 }}>{money(cur, gt?.clDr)}</td>
                      <td style={{ padding: '7px 14px', ...num, fontWeight: 700, color: DIM, fontSize: 10.5 }}>{money(cur, gt?.clCr)}</td>
                    </tr>
                  )}
                  <tr style={{ ...rowBg(i), cursor: 'pointer' }}
                    onClick={() => setDrill(l.ledger)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'; }}>
                    <td style={{ padding: '8px 14px 8px 26px', color: BLUE, fontWeight: 600 }}>{l.ledger}{l.code ? <span style={{ color: '#b9bed4', fontSize: 9.5, marginLeft: 6 }}>{l.code}</span> : null} <span style={{ color: '#cfd3e0', fontSize: 10 }}>›</span></td>
                    {view === 'detailed' && <>
                      <td style={{ padding: '8px 14px', ...num, color: l.openingDebit > 0 ? DARK : '#cfd3e0' }}>{money(cur, l.openingDebit)}</td>
                      <td style={{ padding: '8px 14px', ...num, color: l.openingCredit > 0 ? DARK : '#cfd3e0' }}>{money(cur, l.openingCredit)}</td>
                      <td style={{ padding: '8px 14px', ...num, color: l.debit > 0 ? BLUE : '#cfd3e0' }}>{money(cur, l.debit)}</td>
                      <td style={{ padding: '8px 14px', ...num, color: l.credit > 0 ? RED : '#cfd3e0' }}>{money(cur, l.credit)}</td>
                    </>}
                    <td style={{ padding: '8px 14px', ...num, fontWeight: 700, color: l.closingDebit > 0 ? DARK : '#cfd3e0' }}>{money(cur, l.closingDebit)}</td>
                    <td style={{ padding: '8px 14px', ...num, fontWeight: 700, color: l.closingCredit > 0 ? DARK : '#cfd3e0' }}>{money(cur, l.closingCredit)}</td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
            <td style={{ padding: '10px 14px', fontWeight: 700, color: GOLD, fontSize: 12 }}>TOTAL — {filtered.length} ledgers</td>
            {view === 'detailed' && <>
              <td style={{ padding: '10px 14px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, T.openDr)}</td>
              <td style={{ padding: '10px 14px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, T.openCr)}</td>
              <td style={{ padding: '10px 14px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, T.dr)}</td>
              <td style={{ padding: '10px 14px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, T.cr)}</td>
            </>}
            <td style={{ padding: '10px 14px', ...num, fontWeight: 800, color: '#fff', fontSize: 13 }}>{money(cur, T.clDr)}</td>
            <td style={{ padding: '10px 14px', ...num, fontWeight: 800, color: GOLD, fontSize: 13 }}>{money(cur, T.clCr)}</td>
          </tr></tfoot>
        </Table>
        <Pagination total={filtered.length} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} unit="ledgers" />
      </State>
      {drill && <LedgerDrill branch={branch} ledger={drill} from={from} to={to} onClose={() => setDrill(null)} />}
    </Page>
  );
}

/* ════════════════════ DAY BOOK ═════════════════════════════════════ */
const TYPE_CLR = { sale: BLUE, purchase: '#854F0B', receipt: GREEN, payment: RED, journal: '#384677', contra: '#6b21a8', 'credit-note': RED, 'debit-note': '#854F0B' };
// Normalise any date string to ISO for stable day-grouping (Tally dates vary).
const dayKey = (d) => { const p = parseAnyDate(d); return p ? isoDate(p) : String(d || ''); };

export function DayBookLive({ branch }) {
  const cur = curOf(branch);
  const [from, setFrom] = useState(todayISO);
  const [to, setTo] = useState(todayISO);
  const [view, setView] = useState('minimal'); // minimal | detailed
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [voucher, setVoucher] = useState(null); // clicked Day Book line → voucher modal
  // Fetch all journals; date filtering is client-side (Tally dates are mixed-format strings).
  const q = useDayBook(branch);
  const allJournals = q.data || [];

  const term = search.trim().toLowerCase();
  const sorted = useMemo(() => {
    const f = allJournals
      .filter((j) => dateInRange(j.date, from, to))
      .filter((j) => !term || (`${j.vno} ${j.type} ${j.category} ${j.party} ${j.narration} ${(j.postings || []).map((p) => p.ledger).join(' ')}`.toLowerCase().includes(term)));
    return f.sort((a, b) => { const ta = parseAnyDate(a.date)?.getTime() || 0, tb = parseAnyDate(b.date)?.getTime() || 0; return ta - tb || String(a.vno).localeCompare(String(b.vno)); });
  }, [allJournals, from, to, term]);

  const dayTotals = useMemo(() => {
    const m = new Map();
    for (const j of sorted) { const k = dayKey(j.date); if (!m.has(k)) m.set(k, { label: j.date, dr: 0, cr: 0, n: 0 }); const g = m.get(k); g.dr += j.totalDebit || 0; g.cr += j.totalCredit || 0; g.n += 1; }
    return m;
  }, [sorted]);

  const postingRows = useMemo(() => sorted.flatMap((j) => (j.postings || []).map((p) => ({
    dateKey: dayKey(j.date), date: j.date, vno: j.vno, voucherId: j.voucherId, type: j.type, category: j.category, branch: j.branch || '',
    ledger: p.ledger, group: p.group, debit: p.debit, credit: p.credit,
    narration: p.narration || j.narration || '', party: j.party || '',
  }))), [sorted]);

  const gDr = Math.round(sorted.reduce((s, j) => s + (j.totalDebit || 0), 0));
  const gCr = Math.round(sorted.reduce((s, j) => s + (j.totalCredit || 0), 0));
  const pageRows = useMemo(() => postingRows.slice(page * pageSize, page * pageSize + pageSize), [postingRows, page, pageSize]);

  const expColumns = view === 'minimal'
    ? [{ key: 'date', label: 'Date' }, { key: 'vno', label: 'Voucher No' }, { key: 'ledger', label: 'Ledger' }, { key: 'debit', label: `Debit (${cur})`, num: true }, { key: 'credit', label: `Credit (${cur})`, num: true }]
    : [{ key: 'date', label: 'Date' }, { key: 'vno', label: 'Voucher No' }, { key: 'type', label: 'Type' }, { key: 'category', label: 'Category' }, { key: 'branch', label: 'Branch' }, { key: 'ledger', label: 'Ledger' }, { key: 'group', label: 'Group' }, { key: 'debit', label: `Debit (${cur})`, num: true }, { key: 'credit', label: `Credit (${cur})`, num: true }, { key: 'narration', label: 'Narration' }];
  const printRows = postingRows.map((r) => ({ ...r, debit: nfmt(r.debit), credit: nfmt(r.credit) }));
  const totalRow = { date: 'TOTAL', vno: `${sorted.length} vouchers`, debit: nfmt(gDr), credit: nfmt(gCr) };
  const sub = `${branchLabel(branch)} · ${sorted.length} vouchers · ${postingRows.length} lines · Dr ${money(cur, gDr)} = Cr ${money(cur, gCr)}`;
  const exportNow = () => postingRows.length && exportToExcel(`day-book-${branchLabel(branch)}`, expColumns, postingRows);
  const printNow = () => postingRows.length && openReportPrint('Day Book', sub, expColumns, printRows, totalRow);

  const colCount = view === 'detailed' ? 8 : 5;
  let lastKey = null;

  return (
    <Page
      wide={view === 'detailed'}
      title="Day Book"
      sub={sub}
      right={<>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Narration / voucher / ledger…" />
        <ModeToggle view={view} setView={setView} modes={[{ id: 'minimal', label: 'Minimal' }, { id: 'detailed', label: 'Detailed' }]} />
        <RangeBar from={from} to={to} setFrom={setFrom} setTo={setTo} onChange={() => setPage(0)} branch={branch} />
        <ExportBtn onClick={exportNow} disabled={!postingRows.length} />
        <PrintBtn onClick={printNow} disabled={!postingRows.length} />
      </>}
    >
      <State q={q} empty={postingRows.length === 0}>
        <Table>
          <thead><tr style={headRow}>
            <Th>Date</Th><Th>Voucher</Th>
            {view === 'detailed' && <><Th>Type</Th><Th>Branch</Th></>}
            <Th>Ledger Account</Th><Th right>Dr</Th><Th right>Cr</Th>
            {view === 'detailed' && <Th>Narration</Th>}
          </tr></thead>
          <tbody>
            {pageRows.map((r, i) => {
              const showDay = r.dateKey !== lastKey;
              lastKey = r.dateKey;
              const dt = dayTotals.get(r.dateKey);
              return (
                <React.Fragment key={r.vno + '-' + r.ledger + '-' + i}>
                  {showDay && (
                    <tr style={{ background: '#eef1f7' }}>
                      <td colSpan={colCount} style={{ padding: '7px 12px', fontWeight: 800, color: DARK, fontSize: 10.5 }}>
                        📅 {dt?.label || r.date} <span style={{ color: DIM, fontWeight: 600 }}>· {dt?.n} voucher(s) · Dr {money(cur, dt?.dr)} = Cr {money(cur, dt?.cr)}</span>
                      </td>
                    </tr>
                  )}
                  <tr style={{ ...rowBg(i), cursor: r.voucherId ? 'pointer' : 'default' }}
                    onClick={() => r.voucherId && setVoucher({ id: r.voucherId, vno: r.vno })}
                    onMouseEnter={(e) => { if (r.voucherId) e.currentTarget.style.background = '#eff6ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'; }}>
                    <td style={{ padding: '7px 12px', color: DIM, whiteSpace: 'nowrap' }}>{r.date}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 10, color: BLUE, whiteSpace: 'nowrap' }}>{r.vno}</td>
                    {view === 'detailed' && <>
                      <td style={{ padding: '7px 12px' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 700, background: (TYPE_CLR[r.category] || '#384677') + '22', color: TYPE_CLR[r.category] || '#384677' }}>{r.category}</span></td>
                      <td style={{ padding: '7px 12px', color: DIM, whiteSpace: 'nowrap' }}>{r.branch || '—'}</td>
                    </>}
                    <td style={{ padding: '7px 12px', color: '#0d1326', paddingLeft: r.debit > 0 ? 12 : 26 }}>{r.ledger}{view === 'detailed' && <span style={{ color: '#b9bed4', fontSize: 9.5, marginLeft: 6 }}>{r.group}</span>}</td>
                    <td style={{ padding: '7px 12px', ...num, color: r.debit > 0 ? BLUE : '#dfe2ee' }}>{money(cur, r.debit)}</td>
                    <td style={{ padding: '7px 12px', ...num, color: r.credit > 0 ? RED : '#dfe2ee' }}>{money(cur, r.credit)}</td>
                    {view === 'detailed' && <td style={{ padding: '7px 12px', maxWidth: 320 }}><NarrationCell text={r.narration} /></td>}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
            <td colSpan={view === 'detailed' ? 5 : 3} style={{ padding: '9px 12px', fontWeight: 700, color: GOLD, fontSize: 12 }}>TOTAL — {sorted.length} vouchers</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, gDr)}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{money(cur, gCr)}</td>
            {view === 'detailed' && <td />}
          </tr></tfoot>
        </Table>
        <Pagination total={postingRows.length} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} unit="lines" />
      </State>
      {voucher && <VoucherModal branch={branch} voucher={voucher} onClose={() => setVoucher(null)} />}
    </Page>
  );
}

/* ════════════════════ LEDGER ACCOUNT ═══════════════════════════════
   Full-page host for the UNIFIED ledger UI (src/core/ledgerUI). The SAME
   <LedgerAccountView/> renders here, in the Ctrl+L full-screen modal, and in
   every drill — one design, live data, identical print. */
export function LedgerAcLive({ branch }) {
  const cur = curOf(branch);
  const chart = useChartOfAccounts(branch);
  const ledgers = chart.data || [];
  const { prefs, setPref } = usePrefs();
  const [name, setName] = useState('');
  // Selection priority: explicit pick → last-opened (per-user pref) → first ledger.
  const selected = name || prefs.lastLedger || ledgers[0]?.name || '';
  const pickLedger = (n) => { setName(n); if (n) setPref('lastLedger', n); };
  // "Open ledger" from any screen (legacy in-page event) switches the ledger live.
  useEffect(() => {
    const onOpen = (e) => { const n = e.detail?.name; if (n) { setName(n); setPref('lastLedger', n); } };
    window.addEventListener('kb:open-ledger', onOpen);
    return () => window.removeEventListener('kb:open-ledger', onOpen);
  }, [setPref]);
  const [voucher, setVoucher] = useState(null); // clicked Voucher No → editable voucher modal
  const closeVoucher = () => setVoucher(null);
  useEffect(() => (voucher ? pushModal(closeVoucher) : undefined), [voucher]); // Esc closes the voucher modal

  return (
    <Page
      title="Ledger Account"
      sub={selected}
      wide
      right={<>
        <select value={selected} onChange={(e) => pickLedger(e.target.value)} style={{ ...inp, width: 240, minHeight: 32, fontSize: 11 }}>
          {ledgers.length === 0 && <option>Loading…</option>}
          {ledgers.map((l) => <option key={l.code || l.name} value={l.name}>{l.name}</option>)}
        </select>
      </>}
    >
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <LedgerAccountView name={selected} branch={branch} cur={cur} showPeriod onPickVoucher={setVoucher} maxHeight="calc(100vh - 330px)" />
      </div>
      {voucher && (
        <div onClick={closeVoucher} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.5)', zIndex: 800, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '4vh 2vw' }}>
          <div onClick={(ev) => ev.stopPropagation()} style={{ ...card, width: 'min(820px, 96vw)', maxHeight: '92vh', overflowY: 'auto', padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #e5e9f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <Crumb items={[{ label: selected || 'Ledger', onClick: closeVoucher }, { label: voucher.vno }]} />
              <button onClick={closeVoucher} title="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 18, flexShrink: 0 }}>✕</button>
            </div>
            <VoucherEditor voucherId={voucher.id} cur={cur} onBack={closeVoucher} onClose={closeVoucher} />
          </div>
        </div>
      )}
    </Page>
  );
}

/* ════════════════════ DRILL-DOWN: group → ledger → voucher (editable) ═══ */
const tapRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 14px', minHeight: 44, cursor: 'pointer', borderBottom: '1px solid #f1f3f8', WebkitTapHighlightColor: 'transparent' };

function Crumb({ items }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, fontSize: 12, minWidth: 0 }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {i > 0 && <span style={{ color: '#b9bed4' }}>▸</span>}
          {it.onClick
            ? <button onClick={it.onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: BLUE, fontWeight: 600, padding: 0, fontSize: 12 }}>{it.label}</button>
            : <span style={{ color: DARK, fontWeight: 700 }}>{it.label}</span>}
        </span>
      ))}
    </div>
  );
}

// Editable voucher view (the last drill step). Saving re-posts the journal.
export function VoucherEditor({ voucherId, cur, onBack, onClose }) {
  const vq = useVoucher(voucherId);
  const upd = useUpdateVoucher();
  const v = vq.data;
  // Cost centres are branch-wise — only offer THIS voucher's branch's centres
  // (e.g. BOM-FLT-INT), never another branch's, so the tag can't be mismatched.
  const ccq = useCostCenters(v && v.branch);
  const chart = useChartOfAccounts(v && v.branch);
  const ledgerNames = (chart.data || []).map((l) => l.name).filter(Boolean);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false); // after a successful save → show the entry preview
  const dismiss = () => (onClose || onBack || (() => {}))();
  useEffect(() => {
    if (v) {
      setForm({
        date: v.date || '', branch: v.branch || '', party: v.party || '',
        taxAmt: v.taxAmt ?? 0, tdsAmt: v.tdsAmt ?? 0, tcsAmt: v.tcsAmt ?? 0, linkNo: v.linkNo || '', costCenter: v.costCenter || '', remarks: v.remarks || '',
        lines: (v.lines && v.lines.length ? v.lines : [{ ledger: '', amt: 0, drCr: 'Dr' }]).map((l) => ({ ...l, ledger: l.ledger || '', amt: Number(l.amt) || 0, drCr: l.drCr || 'Dr' })),
      });
      setMsg('');
    }
  }, [v]);
  // computed with optional chaining so the JV-preview hook runs before the early return (rules of hooks)
  // Credit lines (e.g. Discount Received) subtract from the payable; debit lines add.
  const subtotal = r2((form?.lines || []).reduce((s, l) => s + (l.drCr === 'Cr' ? -1 : 1) * (Number(l.amt) || 0), 0));
  // TCS is collected from the customer on a sale (raises the receivable) and paid to
  // the supplier on a purchase (raises the recoverable asset) — either way it RIDES
  // INSIDE total. The posting builder credits TCS Payable / debits TCS Receivable and
  // balances it against this total, so the figure must carry it or the journal is out
  // by exactly the TCS amount. TDS is NOT added: on a sale it posts only when the
  // customer withholds at receipt time, so it never affects the bill total here.
  const total = r2(subtotal + (Number(form?.taxAmt) || 0) + (Number(form?.tcsAmt) || 0));
  const previewBody = (v && form) ? {
    ...v, branch: form.branch, party: form.party, taxAmt: Number(form.taxAmt) || 0,
    tdsAmt: Number(form.tdsAmt) || 0, tcsAmt: Number(form.tcsAmt) || 0, subtotal, total,
    lines: form.lines.filter((l) => l.ledger).map((l) => ({ ...l, amt: Number(l.amt) || 0 })),
  } : null;
  const pv = useVoucherPreview(previewBody).data || {};
  if (vq.isLoading || !form) return <div style={{ padding: 24, textAlign: 'center', color: DIM }}>Loading voucher...</div>;
  if (vq.isError) return <div style={{ padding: 16, color: RED }}>! {vq.error?.message}</div>;
  // Option C: categories with a registry entry render through the unified shell so
  // editing matches the create screen. Others fall back to this generic editor.
  if (hasRegistry(v.category)) {
    return <VoucherShell category={v.category} mode="edit" voucher={v} voucherId={voucherId} cur={cur} onBack={onBack} onClose={onClose} />;
  }
  const set = (k, val) => setForm((f) => ({ ...f, [k]: val }));
  const setLine = (i, k, val) => setForm((f) => ({ ...f, lines: f.lines.map((l, j) => (j === i ? { ...l, [k]: val } : l)) }));
  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, { ledger: '', amt: 0, drCr: 'Dr' }] }));
  const delLine = (i) => setForm((f) => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }));
  const dlId = 'vl-' + voucherId;
  const lab = { fontSize: 10, color: DIM, fontWeight: 700, marginBottom: 3 };
  const fld = { ...inp, fontSize: 12.5 };
  const save = () => {
    setMsg('');
    const lines = form.lines.filter((l) => l.ledger).map((l) => ({ ...l, amt: Number(l.amt) || 0, ledger: l.ledger, drCr: l.drCr || 'Dr' }));
    const body = { ...v, date: form.date, branch: form.branch, party: form.party, linkNo: form.linkNo, costCenter: form.costCenter, remarks: form.remarks, taxAmt: Number(form.taxAmt) || 0, tdsAmt: Number(form.tdsAmt) || 0, tcsAmt: Number(form.tcsAmt) || 0, subtotal, total, lines, status: v.status || 'saved' };
    delete body.id; delete body.createdAt; delete body.updatedAt;
    upd.mutate({ id: voucherId, body }, {
      onSuccess: () => { setMsg('saved'); setDone(true); toast(`Voucher ${v.vno} saved`); },
      onError: (e) => { setMsg('err:' + e.message); toast(`Could not save — ${e.message}`, 'error'); },
    });
  };
  // Build a printable A4 view of the full journal entry and hand it to the print preview.
  const printEntry = () => {
    const fmt = (n) => { const x = Math.round(Number(n) || 0); return x ? cur + x.toLocaleString('en-IN') : ''; };
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const rows = (pv.postings || []).map((p) => `<tr>
      <td>${esc(p.ledger)}</td><td>${esc(p.group || '')}</td>
      <td class="r">${fmt(p.debit)}</td><td class="r">${fmt(p.credit)}</td></tr>`).join('');
    const html = `<style>
      .ve{font-family:'Segoe UI',Arial,sans-serif;color:#0d1326}
      .ve h1{font-size:16px;margin:0 0 2px}
      .ve .meta{font-size:10.5px;color:#5a6691;margin:0 0 4px}
      .ve table{width:100%;border-collapse:collapse;font-size:10.5px;margin-top:8px}
      .ve th{background:#0d1326;color:#d4a437;text-align:left;padding:6px 8px;font-size:9.5px}
      .ve th.r,.ve td.r{text-align:right}
      .ve td{padding:5px 8px;border-bottom:1px solid #eceef4}
      .ve tfoot td{background:#f3f5f9;font-weight:800;border-top:2px solid #0d1326}
    </style>
    <div class="ve">
      <h1>Voucher — ${esc(v.vno)}</h1>
      <p class="meta">${esc(v.type)} · ${esc(v.category)} · ${esc(form.date)} · ${esc(form.branch)}${form.party ? ' · ' + esc(form.party) : ''}</p>
      ${form.remarks ? `<p class="meta">${esc(form.remarks)}</p>` : ''}
      <table>
        <thead><tr><th>Ledger</th><th>Group</th><th class="r">Debit</th><th class="r">Credit</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="2">Total</td><td class="r">${fmt(pv.totalDebit)}</td><td class="r">${fmt(pv.totalCredit)}</td></tr></tfoot>
      </table>
    </div>`;
    openPrintPreview({ title: `Voucher — ${v.vno}`, recommend: 'portrait', html });
  };
  // Post-save: show the full journal entry with Print / Close. Close dismisses the modal.
  if (done) {
    return (
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 800, color: GREEN, fontSize: 14 }}>✓ Saved — {v.vno}</div>
          <button onClick={dismiss} title="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 18 }}>✕</button>
        </div>
        <div style={{ fontSize: 11.5, color: DIM, marginBottom: 10 }}>
          {v.type} · {v.category} · {form.date} · {form.branch}{form.party ? ` · ${form.party}` : ''}
        </div>
        <div style={{ ...card, padding: 10, boxShadow: 'none', border: '1px solid #eef1f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 700, color: DARK, fontSize: 12 }}>Full Journal Entry</div>
            <span style={{ fontSize: 11, fontWeight: 800, color: pv.balanced ? GREEN : RED }}>{pv.balanced ? '✓ Balanced' : `✗ Out by ${money(cur, pv.diff)}`}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead><tr><th style={{ textAlign: 'left', padding: '5px 8px', color: DIM }}>Ledger</th><th style={{ textAlign: 'left', padding: '5px 8px', color: DIM }}>Group</th><th style={{ textAlign: 'right', padding: '5px 8px', color: DIM }}>Debit</th><th style={{ textAlign: 'right', padding: '5px 8px', color: DIM }}>Credit</th></tr></thead>
            <tbody>
              {(pv.postings || []).map((p, i) => (<tr key={i} style={{ borderBottom: '1px solid #f2f4f8' }}><td style={{ padding: '5px 8px', fontWeight: 600, color: DARK }}>{p.ledger}</td><td style={{ padding: '5px 8px', color: DIM }}>{p.group}</td><td style={{ padding: '5px 8px', textAlign: 'right', color: BLUE }}>{p.debit ? money(cur, p.debit) : ''}</td><td style={{ padding: '5px 8px', textAlign: 'right', color: RED }}>{p.credit ? money(cur, p.credit) : ''}</td></tr>))}
            </tbody>
            <tfoot><tr style={{ fontWeight: 800, background: '#f3f5f9' }}><td style={{ padding: '6px 8px' }} colSpan={2}>Total</td><td style={{ padding: '6px 8px', textAlign: 'right', color: BLUE }}>{money(cur, pv.totalDebit)}</td><td style={{ padding: '6px 8px', textAlign: 'right', color: RED }}>{money(cur, pv.totalCredit)}</td></tr></tfoot>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button onClick={printEntry} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: BLUE, color: '#fff' }}>🖨 Print</button>
          <button onClick={dismiss} style={{ padding: '10px 18px', borderRadius: 7, border: '1px solid #d6dbe6', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: '#fff', color: DARK }}>Close</button>
        </div>
      </div>
    );
  }
  // Passenger / traveller detail rides on each saved line (passenger, ticket, sector,
  // pnr, travelDate…) — shown read-only here so the edit screen isn't "passenger
  // details not available". Editing those fields stays in the booking/CRM source; the
  // spread on save preserves them, this panel just surfaces what was recorded.
  const paxRows = (v.lines || [])
    .map((l) => ({
      passenger: l.passenger || l.meta?.guest || '',
      ticket: l.ticket || '',
      airline: l.airline || '',
      sector: l.sector || '',
      cls: l.cls || '',
      pnr: l.pnr || '',
      travelDate: l.travelDate || '',
    }))
    .filter((p) => p.passenger || p.ticket || p.pnr || p.sector);
  return (
    <div style={{ padding: 14 }}>
      <datalist id={dlId}>{ledgerNames.map((n) => <option key={n} value={n} />)}</datalist>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 800, color: DARK, fontSize: 14 }}>{v.vno} <span style={{ fontSize: 10, color: DIM, fontWeight: 600 }}>{v.type} - {v.category}</span></div>
        <button onClick={onBack} style={{ ...inp, width: 'auto', minHeight: 34, fontSize: 11.5, cursor: 'pointer' }}>Back</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 10 }}>
        <div><div style={lab}>Date</div><input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} style={fld} /></div>
        <div><div style={lab}>Branch</div><input value={form.branch} onChange={(e) => set('branch', e.target.value)} style={fld} /></div>
        <div><div style={lab}>{v.category === 'purchase' || v.category === 'purchase-expense' ? 'Supplier (party ledger)' : 'Customer / Party ledger'}</div><input list={dlId} value={form.party} onChange={(e) => set('party', e.target.value)} style={fld} /></div>
        <div><div style={lab}>Link No</div><input value={form.linkNo} onChange={(e) => set('linkNo', e.target.value)} style={fld} /></div>
        {(v.category === 'sale' || v.category === 'purchase') && (
          <div><div style={lab}>Cost Centre (module)</div>
            <select value={form.costCenter || ''} onChange={(e) => set('costCenter', e.target.value)} style={{ ...fld, cursor: 'pointer' }}>
              <option value="">- Unspecified -</option>
              {(ccq.data?.costCenters || []).map((c) => <option key={c.code} value={c.code}>{c.module} - {c.name}</option>)}
            </select>
          </div>
        )}
        <div><div style={lab}>GST / Tax</div><input type="number" value={form.taxAmt} onChange={(e) => set('taxAmt', e.target.value)} style={fld} /></div>
        <div><div style={lab}>TDS</div><input type="number" value={form.tdsAmt} onChange={(e) => set('tdsAmt', e.target.value)} style={fld} /></div>
        <div><div style={lab}>TCS</div><input type="number" value={form.tcsAmt} onChange={(e) => set('tcsAmt', e.target.value)} style={fld} /></div>
        <div><div style={lab}>Total (auto)</div><div style={{ ...fld, background: '#f3f5f9', color: DARK, fontWeight: 700 }}>{money(cur, total)}</div></div>
        <div><div style={lab}>Remarks</div><input value={form.remarks} onChange={(e) => set('remarks', e.target.value)} style={fld} /></div>
      </div>
      {paxRows.length > 0 && (
        <div style={{ ...card, padding: 10, marginTop: 12, boxShadow: 'none', border: '1px solid #eef1f6' }}>
          <div style={{ fontWeight: 700, color: DARK, fontSize: 12, marginBottom: 8 }}>Passenger / Traveller Details</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead><tr>
              {['Passenger', 'Ticket', 'Airline', 'Sector', 'Class', 'PNR', 'Travel Date'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '5px 8px', color: DIM }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {paxRows.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f2f4f8' }}>
                  <td style={{ padding: '5px 8px', fontWeight: 600, color: DARK }}>{p.passenger || '—'}</td>
                  <td style={{ padding: '5px 8px', color: DIM }}>{p.ticket || '—'}</td>
                  <td style={{ padding: '5px 8px', color: DIM }}>{p.airline || '—'}</td>
                  <td style={{ padding: '5px 8px', color: DIM }}>{p.sector || '—'}</td>
                  <td style={{ padding: '5px 8px', color: DIM }}>{p.cls || '—'}</td>
                  <td style={{ padding: '5px 8px', color: DIM }}>{p.pnr || '—'}</td>
                  <td style={{ padding: '5px 8px', color: DIM }}>{p.travelDate || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ ...card, padding: 10, marginTop: 12, boxShadow: 'none', border: '1px solid #eef1f6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 700, color: DARK, fontSize: 12 }}>Lines — pick ledger from Books (Dr / Cr)</div>
          <button onClick={addLine} style={{ ...inp, width: 'auto', minHeight: 28, fontSize: 11, cursor: 'pointer' }}>+ Add line</button>
        </div>
        {form.lines.map((ln, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 28px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <input list={dlId} value={ln.ledger} placeholder="Ledger (from Books)" onChange={(e) => setLine(i, 'ledger', e.target.value)} style={{ ...inp, fontSize: 12 }} />
            <select value={ln.drCr || 'Dr'} onChange={(e) => setLine(i, 'drCr', e.target.value)} style={{ ...inp, fontSize: 12, cursor: 'pointer' }}><option value="Dr">Dr</option><option value="Cr">Cr</option></select>
            <input type="number" value={ln.amt} placeholder="Amount" onChange={(e) => setLine(i, 'amt', e.target.value)} style={{ ...inp, fontSize: 12, textAlign: 'right' }} />
            <button onClick={() => delLine(i)} title="Remove line" style={{ background: 'none', border: 'none', color: RED, cursor: 'pointer', fontWeight: 700 }}>x</button>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 18, marginTop: 6, fontSize: 12 }}>
          <span style={{ color: DIM }}>Lines subtotal: <b style={{ color: DARK }}>{money(cur, subtotal)}</b></span>
          <span style={{ color: DIM }}>+ Tax: <b style={{ color: DARK }}>{money(cur, Number(form.taxAmt) || 0)}</b></span>
          {(Number(form.tcsAmt) || 0) > 0 && <span style={{ color: DIM }}>+ TCS: <b style={{ color: DARK }}>{money(cur, Number(form.tcsAmt) || 0)}</b></span>}
          <span style={{ color: DIM }}>= Total: <b style={{ color: DARK }}>{money(cur, total)}</b></span>
        </div>
      </div>
      <div style={{ ...card, padding: 10, marginTop: 12, boxShadow: 'none', border: '1px solid #eef1f6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 700, color: DARK, fontSize: 12 }}>Accounting Effect — Full Journal (where this hits the books)</div>
          <span style={{ fontSize: 11, fontWeight: 800, color: pv.balanced ? GREEN : RED }}>{pv.error ? '⚠ ' + pv.error : pv.balanced ? '✓ Balanced' : `✗ Out by ${money(cur, pv.diff)}`}</span>
        </div>
        {pv.missing?.length > 0 && (
          <div style={{ margin: '0 0 8px', padding: '6px 9px', borderRadius: 6, background: '#FCEBEB', border: '1px solid #F7C1C1', color: '#854F0B', fontSize: 11, fontWeight: 600 }}>
            ⚠ Ledger not in Chart of Accounts: <b>{pv.missing.join(', ')}</b>. Create it in Masters first — this voucher cannot be approved and stays <b>pending</b>. No ledger/sub-group/group is auto-created.
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead><tr><th style={{ textAlign: 'left', padding: '5px 8px', color: DIM }}>Ledger</th><th style={{ textAlign: 'left', padding: '5px 8px', color: DIM }}>Group</th><th style={{ textAlign: 'right', padding: '5px 8px', color: DIM }}>Debit</th><th style={{ textAlign: 'right', padding: '5px 8px', color: DIM }}>Credit</th></tr></thead>
          <tbody>
            {(pv.postings || []).map((p, i) => (<tr key={i} style={{ borderBottom: '1px solid #f2f4f8' }}><td style={{ padding: '5px 8px', fontWeight: 600, color: DARK }}>{p.ledger}</td><td style={{ padding: '5px 8px', color: DIM }}>{p.group}</td><td style={{ padding: '5px 8px', textAlign: 'right', color: BLUE }}>{p.debit ? money(cur, p.debit) : ''}</td><td style={{ padding: '5px 8px', textAlign: 'right', color: RED }}>{p.credit ? money(cur, p.credit) : ''}</td></tr>))}
            {!(pv.postings || []).length && <tr><td colSpan={4} style={{ padding: 12, textAlign: 'center', color: DIM }}>Pick ledgers / amounts to see the journal effect.</td></tr>}
          </tbody>
          <tfoot><tr style={{ fontWeight: 800, background: '#f3f5f9' }}><td style={{ padding: '6px 8px' }} colSpan={2}>Total</td><td style={{ padding: '6px 8px', textAlign: 'right', color: BLUE }}>{money(cur, pv.totalDebit)}</td><td style={{ padding: '6px 8px', textAlign: 'right', color: RED }}>{money(cur, pv.totalCredit)}</td></tr></tfoot>
        </table>
        <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 11, color: DIM }}>
          <span>GST: <b style={{ color: DARK }}>{money(cur, pv.tax?.gst || 0)}</b></span>
          <span>TDS: <b style={{ color: DARK }}>{money(cur, pv.tax?.tds || 0)}</b></span>
          <span>TCS: <b style={{ color: DARK }}>{money(cur, pv.tax?.tcs || 0)}</b></span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
        {/* Block Save only when the preview KNOWS it's unbalanced (=== false), so a
            slow/failed preview never locks the user out — the backend enforces balance too. */}
        {(() => {
          const blocked = pv.balanced === false;
          return (
            <button disabled={upd.isPending || blocked} onClick={save}
              title={blocked ? `Cannot save — debit and credit must match (out by ${money(cur, pv.diff)})` : 'Save voucher'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 7, border: 'none', cursor: (upd.isPending || blocked) ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 700, background: blocked ? '#9bbfa0' : GREEN, color: '#fff', opacity: blocked ? 0.75 : 1 }}>
              {upd.isPending ? 'Saving...' : 'Save'}
            </button>
          );
        })()}
        {pv.balanced === false && <span style={{ color: RED, fontSize: 11.5, fontWeight: 600 }}>Debit ≠ Credit — balance the entry to save (out by {money(cur, pv.diff)})</span>}
        {msg === 'saved' && <span style={{ color: GREEN, fontSize: 12, fontWeight: 700 }}>Saved & re-checked</span>}
        {msg.startsWith('err:') && <span style={{ color: RED, fontSize: 11.5 }}>! {msg.slice(4)}</span>}
      </div>
    </div>
  );
}

function DrillDown({ branch, group, onClose }) {
  const cur = curOf(branch);
  const [ledger, setLedger] = useState(null);
  const [voucher, setVoucher] = useState(null); // { id, vno }
  const tb = useTrialBalance(branch);
  const stmt = useLedgerStatement(ledger, branch);
  const groupLedgers = (tb.data?.rows || []).filter((r) => r.group === group);

  const crumbs = [
    { label: group, onClick: (ledger || voucher) ? () => { setLedger(null); setVoucher(null); } : null },
    ...(ledger ? [{ label: ledger, onClick: voucher ? () => setVoucher(null) : null }] : []),
    ...(voucher ? [{ label: voucher.vno }] : []),
  ];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.5)', zIndex: 800, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '4vh 2vw' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 'min(780px, 96vw)', maxHeight: '92vh', overflowY: 'auto', padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #e5e9f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <Crumb items={crumbs} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 18, flexShrink: 0 }}>✕</button>
        </div>

        {voucher && <VoucherEditor voucherId={voucher.id} cur={cur} onBack={() => setVoucher(null)} onClose={onClose} />}

        {!voucher && ledger && (
          <div>
            {stmt.isLoading && <div style={{ padding: 24, textAlign: 'center', color: DIM }}>Loading…</div>}
            {stmt.data && <>
              <div style={{ padding: '8px 14px', background: '#f3f5f9', fontSize: 11, color: DIM, display: 'flex', justifyContent: 'space-between' }}>
                <span>Opening {money(cur, stmt.data.openingBalance)} {stmt.data.openingSide}</span>
                <span style={{ fontWeight: 700, color: DARK }}>Closing {money(cur, stmt.data.closingBalance)} {stmt.data.closingSide}</span>
              </div>
              {(stmt.data.lines || []).length === 0 && <div style={{ padding: 24, textAlign: 'center', color: DIM }}>No entries.</div>}
              {(stmt.data.lines || []).map((ln, i) => (
                <div key={i} style={tapRow} onClick={() => ln.voucherId && setVoucher({ id: ln.voucherId, vno: ln.vno })}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: BLUE, fontWeight: 600 }}>{ln.vno} <span style={{ color: DIM, fontWeight: 400 }}>· {ln.date}</span></div>
                    <div style={{ fontSize: 10.5, color: DIM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ln.narration || ln.party || ln.category}</div>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: ln.debit ? BLUE : RED }}>{ln.debit ? `Dr ${money(cur, ln.debit)}` : `Cr ${money(cur, ln.credit)}`}</div>
                    <div style={{ fontSize: 10, color: DIM }}>bal {money(cur, Math.abs(ln.balance))} {ln.balanceSide}</div>
                  </div>
                </div>
              ))}
            </>}
          </div>
        )}

        {!voucher && !ledger && (
          <div>
            <div style={{ padding: '8px 14px', fontSize: 11, color: DIM, background: '#f3f5f9' }}>{groupLedgers.length} ledger(s) in {group} — tap to open</div>
            {tb.isLoading && <div style={{ padding: 24, textAlign: 'center', color: DIM }}>Loading…</div>}
            {!tb.isLoading && groupLedgers.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: DIM }}>No ledgers in this group.</div>}
            {groupLedgers.map((r, i) => {
              // TB rows now expose closingDebit/closingCredit; fall back to the
              // legacy debit/credit shape if the backend isn't redeployed yet.
              const clDr = r.closingDebit != null ? r.closingDebit : r.debit;
              const clCr = r.closingCredit != null ? r.closingCredit : r.credit;
              return (
                <div key={i} style={tapRow} onClick={() => setLedger(r.ledger)}>
                  <span style={{ fontSize: 12.5, color: DARK, fontWeight: 600 }}>{r.ledger}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: clDr ? BLUE : RED, whiteSpace: 'nowrap' }}>{money(cur, clDr || clCr)} {clDr ? 'Dr' : 'Cr'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════ Tally two-column (Dr | Cr) T-account ═════════ */
const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
function TAccount({ leftHead = 'Particulars', rightHead = 'Particulars', left, right, leftTotal, rightTotal, cur, onPick }) {
  const n = Math.max(left.length, right.length, 1);
  const Label = ({ row }) => (row.group && onPick)
    ? <button onClick={() => onPick(row.group)} title="Drill into group" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: BLUE, fontWeight: row.bold ? 700 : 600, fontSize: 11.5, textAlign: 'left' }}>{row.label} ›</button>
    : <span style={{ color: '#384677', fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>;
  const Cell = ({ row }) => row
    ? (<><td style={{ padding: '9px 14px' }}><Label row={row} /></td>
          <td style={{ padding: '9px 14px', ...num, color: DARK, fontWeight: row.bold ? 700 : 400 }}>{row.amount != null ? money(cur, row.amount) : ''}</td></>)
    : (<><td style={{ padding: '9px 14px' }} /><td style={{ padding: '9px 14px' }} /></>);
  return (
    <div className="kb-sticky" style={{ ...card, padding: 0, '--stick-head': DARK, '--stick-foot': DARK }}>
      <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontSize: 11.5, tableLayout: 'fixed' }}>
        <thead><tr style={headRow}>
          <Th>{leftHead}</Th><Th right>Amount</Th><Th>{rightHead}</Th><Th right>Amount</Th>
        </tr></thead>
        <tbody>
          {Array.from({ length: n }).map((_, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f8', borderLeft: i === 0 ? 'none' : 'none' }}>
              <Cell row={left[i]} /><Cell row={right[i]} />
            </tr>
          ))}
        </tbody>
        <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
          <td style={{ padding: '9px 14px', fontWeight: 700, color: GOLD }}>Total</td>
          <td style={{ padding: '9px 14px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, leftTotal)}</td>
          <td style={{ padding: '9px 14px', fontWeight: 700, color: GOLD }}>Total</td>
          <td style={{ padding: '9px 14px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, rightTotal)}</td>
        </tr></tfoot>
      </table>
    </div>
  );
}

/* ════════════════════ PROFIT & LOSS (Tally horizontal) ═════════════ */
export function ReportPnLLive({ branch }) {
  const cur = curOf(branch);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [drill, setDrill] = useState(null);
  const q = useProfitAndLoss(branch, { from, to });
  const d = q.data;
  const G = (g) => ({ label: g.group, amount: g.amount, group: g.group });

  let trade = null, pl = null;
  if (d) {
    const gp = d.grossProfit, np = d.netProfit;
    // Trading account → Gross Profit
    const tL = d.trading.debit.map(G), tR = d.trading.credit.map(G);
    if (gp >= 0) tL.push({ label: 'Gross Profit c/d', amount: gp, bold: true });
    else tR.push({ label: 'Gross Loss c/d', amount: -gp, bold: true });
    trade = { left: tL, right: tR, lt: r2(d.trading.debitTotal + Math.max(gp, 0)), rt: r2(d.trading.creditTotal + Math.max(-gp, 0)) };
    // Profit & Loss account → Net Profit
    const pL = d.indirect.debit.map(G); let pR = [];
    if (gp >= 0) pR.push({ label: 'Gross Profit b/d', amount: gp, bold: true });
    else pL.push({ label: 'Gross Loss b/d', amount: -gp, bold: true });
    pR = [...pR, ...d.indirect.credit.map(G)];
    if (np >= 0) pL.push({ label: 'Net Profit', amount: np, bold: true });
    else pR.push({ label: 'Net Loss', amount: -np, bold: true });
    pl = { left: pL, right: pR, lt: r2(d.indirect.debitTotal + Math.max(-gp, 0) + Math.max(np, 0)), rt: r2(Math.max(gp, 0) + d.indirect.creditTotal + Math.max(-np, 0)) };
  }

  return (
    <Page
      title="Profit & Loss Account"
      sub={`${branchLabel(branch)}${from || to ? ` · ${from || '…'} → ${to || '…'}` : ' · all periods'}`}
      right={<>
        <PeriodBar branch={branch} compact defaultPreset="all" onChange={(r) => { setFrom(r.from); setTo(r.to); }} />
      </>}
    >
      <State q={q} empty={!d}>
        {d && (
          <Banner tone={d.netProfit >= 0 ? 'ok' : 'err'}>
            {d.grossResult}: {money(cur, Math.abs(d.grossProfit))} · {d.result}: {money(cur, Math.abs(d.netProfit))}
          </Banner>
        )}
        {trade && <>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', color: BLUE, margin: '4px 0 6px' }}>Trading Account</div>
          <div style={{ marginBottom: 14 }}><TAccount left={trade.left} right={trade.right} leftTotal={trade.lt} rightTotal={trade.rt} cur={cur} onPick={setDrill} /></div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', color: BLUE, margin: '4px 0 6px' }}>Profit &amp; Loss Account</div>
          <TAccount left={pl.left} right={pl.right} leftTotal={pl.lt} rightTotal={pl.rt} cur={cur} onPick={setDrill} />
        </>}
      </State>
      {drill && <DrillDown branch={branch} group={drill} onClose={() => setDrill(null)} />}
    </Page>
  );
}

/* ════════════════════ BALANCE SHEET (Tally horizontal) ═════════════ */
export function ReportBSLive({ branch }) {
  const cur = curOf(branch);
  const [to, setTo] = useState('');
  const [drill, setDrill] = useState(null);
  const q = useBalanceSheet(branch, { to });
  const d = q.data;
  // Synthetic rows (P&L A/c, difference) aren't real groups → not drillable.
  const G = (g) => ({ label: g.group, amount: g.amount, bold: g.isResult, group: (g.isResult || g.group === 'Difference in Opening Balances') ? null : g.group });
  return (
    <Page
      title="Balance Sheet"
      sub={`${branchLabel(branch)}${to ? ` · as on ${to}` : ' · as on date'}`}
      right={<><span style={{ lineHeight: '32px', color: DIM, fontSize: 11 }}>As on</span><DateInput value={to} onChange={(e) => setTo(e.target.value)} /></>}
    >
      <State q={q} empty={!d}>
        {d && <Banner tone={d.balanced ? 'ok' : 'err'}>{d.balanced ? '✔ Balanced' : '⚠ Out of balance'} — Liabilities {money(cur, d.totalLiabilities)} {d.balanced ? '=' : '≠'} Assets {money(cur, d.totalAssets)}</Banner>}
        {d && <TAccount leftHead="Liabilities" rightHead="Assets" left={d.liabilities.map(G)} right={d.assets.map(G)} leftTotal={d.totalLiabilities} rightTotal={d.totalAssets} cur={cur} onPick={setDrill} />}
      </State>
      {drill && <DrillDown branch={branch} group={drill} onClose={() => setDrill(null)} />}
    </Page>
  );
}

/* ════════════════════ SALES / PURCHASE REGISTER ════════════════════ */
/* Read-only voucher detail — shows every imported field (PNR, ticket, fare
   breakup, etc.) captured on the line `meta`, plus the header + Link No. */
function VoucherDetail({ voucher, cur, onClose }) {
  if (!voucher) return null;
  const v = voucher;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.45)', zIndex: 700, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '6vh' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 660, maxWidth: '94vw', maxHeight: '84vh', overflowY: 'auto', padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderBottom: '1px solid #e5e9f0', position: 'sticky', top: 0, background: '#fff' }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: DARK }}>{v.vno} <span style={{ fontSize: 10, color: DIM, fontWeight: 600 }}>{v.type} · {v.category}</span></div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: 16 }}>
          <VoucherLines voucher={v} cur={cur} />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════ SALES / PURCHASE REGISTER ════════════════════ */
// "SO/PO/GP Capture" view — a wide, horizontal register that lays out every figure
// captured on the booking at SO/PO/GP time, ONE LINE PER INVOICE:
//   SPG/Link No · Sales Inv · Purchase Inv · Client Type · Client Ledger · Pax ·
//   PNR · Ticket No · Final Invoice Value · each component head (IT-Base Fare /
//   IT-K3-Taxes / IT-Taxes / IT-Other Taxes / IT-Service Charges …) · CGST/SGST/IGST
//   Output · Other Taxes CGST/SGST Output · TCS.
// The component-head columns are derived dynamically from the posted voucher lines —
// their ledger names ARE "IT-Base Fare" etc. — so the SAME layout auto-adapts to
// every module (Flight/Hotel/Visa/…), Domestic (DT-) or International (IT-), and the
// Purchase Register mirrors it (heads carry the [Pur] suffix; GST shows as Input).
// (`r2` — round to 2dp — is defined once above and reused here.)
const numOf = (n) => { const v = Number(n); return Number.isFinite(v) ? v : 0; };

// Split a GST amount into the heads that actually post: VAT branches → one VAT leg;
// inter-state → IGST; otherwise CGST + SGST halves (paise kept balanced — mirrors the
// backend posting builder's gstPostings()).
function splitGst(amt, gstMode, brCode) {
  const a = r2(amt);
  if (!a) return { cgst: 0, sgst: 0, igst: 0, vat: 0 };
  if (isVatBranch(brCode)) return { cgst: 0, sgst: 0, igst: 0, vat: a };
  if (gstMode === 'inter') return { cgst: 0, sgst: 0, igst: a, vat: 0 };
  const half = r2(a / 2);
  return { cgst: half, sgst: r2(a - half), igst: 0, vat: 0 };
}

// Rank a component-head ledger so the head columns sit in a natural reading order
// (fares → K3 → taxes → other taxes → service charge → supplier service), regardless
// of the DT-/IT- prefix or the [Pur] suffix. Tested in order so "Other Taxes" and
// "K3-Taxes" don't collide with the generic "Taxes" match.
const HEAD_RANK = [
  [/base\s*fare/i, 0], [/land/i, 1], [/room|basic|visa\s*fee|premium|fare/i, 2],
  [/k3/i, 3], [/other\s*tax/i, 5], [/service\s*charge/i, 6], [/supplier\s*service/i, 7],
  [/tax/i, 4], [/incentive/i, 8], [/tds/i, 9],
];
const headRank = (ledger) => { for (const [re, rk] of HEAD_RANK) if (re.test(ledger)) return rk; return 50; };

// Flatten one voucher's passenger / ticket / PNR detail. Prefer the joined booking
// (booking-spawned voucher lines are aggregate heads with NO pax); else fall back to
// the voucher's own per-line pax (CRM / imported invoices carry it on the lines).
function captureTravel(v, booking) {
  if (booking) return bookingTravelDetail(booking);
  const names = [], tkts = [], pnrs = [];
  const push = (arr, x) => { const s = String(x == null ? '' : x).trim(); if (s && !arr.includes(s)) arr.push(s); };
  for (const p of (v.pax || [])) { push(names, p.name); push(tkts, p.ticket); push(pnrs, p.pnr); }
  for (const ln of (v.lines || [])) { push(names, ln.passenger); push(tkts, ln.ticket); push(pnrs, ln.pnr); }
  return { passengers: names.join(', '), tickets: tkts.join(', '), pnrs: pnrs.join(', ') };
}

// Build the wide "capture" sheet ({columns, rows, totals}) for the Sales/Purchase
// Register. `tab` = 'sales' | 'purchase'. `tag` (branch code, or '' for All-Branch)
// suffixes the tax-head labels to match the posted ledger names (e.g. "CGST Output
// [BOM]"). `linkIndex` cross-references the sale ↔ purchase invoice numbers, and
// `bookingByLink` joins each invoice to its booking for the travel detail.
export function buildCaptureSheet(vouchers, { tab, tag, linkIndex, bookingByLink, showType }) {
  const isSale = tab !== 'purchase';
  const taxWord = isSale ? 'Output' : 'Input';
  const sfx = tag ? ` [${tag}]` : '';
  const list = vouchers || [];

  // 1) Dynamic component-head columns = the union of every voucher line's ledger.
  const headSet = new Set();
  let anyInter = false, anyVat = false, anyIndia = false, anyOther = false, anyTcs = false, anyTds = false;
  for (const v of list) {
    for (const ln of (v.lines || [])) { if (ln && ln.ledger) headSet.add(ln.ledger); }
    if (isVatBranch(v.branch)) anyVat = true; else anyIndia = true;
    if (v.gstMode === 'inter') anyInter = true;
    if (numOf(v.otherTaxesGst) > 0) anyOther = true;
    if (numOf(v.tcsAmt) > 0) anyTcs = true;
    if (numOf(v.tdsAmt) > 0) anyTds = true;
  }
  const headLedgers = [...headSet].sort((a, b) => (headRank(a) - headRank(b)) || a.localeCompare(b));

  // 2) Assemble columns: fixed lead → component heads → taxes → final value.
  const columns = [];
  const col = (key, label, isNum) => columns.push({ key, label, num: !!isNum });
  col('linkNo', 'SPG / Link No');
  col('saleDate', isSale ? 'Sale Date' : 'Purchase Date');
  col('saleVno', 'Sales Invoice No');
  col('saleTallyRef', 'Sales Tally Ref');
  col('purVno', 'Purchase Invoice No');
  col('purTallyRef', 'Purchase Tally Ref');
  if (!tag) col('branch', 'Branch');
  // When viewing All modules together, surface which module each row belongs to —
  // shown immediately before Client/Vendor Type so the mixed list stays readable.
  if (showType) col('salesType', isSale ? 'Sales Type' : 'Purchase Type');
  if (showType) col('intDom', 'INT / DOM'); // International vs Domestic, beside Sales Type
  col('clientType', isSale ? 'Client Type' : 'Vendor Type');
  col('clientLedger', isSale ? 'Client Ledger' : 'Vendor Ledger');
  col('pax', 'Pax Details');
  col('pnr', 'PNR');
  col('ticket', 'Ticket No');
  col('finalValue', isSale ? 'Final Invoice Value' : 'Final Bill Value', true);
  for (const lg of headLedgers) col(`head:${lg}`, lg, true);
  if (anyIndia) { col('cgst', `CGST ${taxWord}${sfx}`, true); col('sgst', `SGST ${taxWord}${sfx}`, true); }
  if (anyInter) col('igst', `IGST ${taxWord}${sfx}`, true);
  if (anyVat) col('vat', `VAT ${taxWord}${sfx}`, true);
  if (isSale && anyOther) {
    if (anyIndia) { col('ocgst', `Other Taxes CGST Output${sfx}`, true); col('osgst', `Other Taxes SGST Output${sfx}`, true); }
    if (anyInter) col('oigst', `Other Taxes IGST Output${sfx}`, true);
    if (anyVat) col('ovat', `Other Taxes VAT Output${sfx}`, true);
  }
  if (isSale && anyTcs) col('tcs', 'TCS', true);
  if (!isSale && anyTds) col('tds', 'TDS', true);
  // Per-row printable invoice (Sales Invoice / Purchase Invoice) at the far end.
  col('invoice', isSale ? 'Sales Invoice' : 'Purchase Invoice');

  // 3) One row per voucher — pivot the lines into their head columns.
  const rows = list.map((v) => {
    const link = v.linkNo || '';
    const booking = (link && bookingByLink[link]) || null;
    const tv = captureTravel(v, booking);
    const g = splitGst(v.taxAmt, v.gstMode, v.branch);
    const og = splitGst(v.otherTaxesGst, v.gstMode, v.branch);
    const row = {
      _v: v,             // back-reference: Final Invoice Value → open this voucher's JV
      _booking: booking, // back-reference: print the Sales / Purchase invoice for this row
      linkNo: link || '—',
      saleVno: isSale ? v.vno : (linkIndex.saleByLink[link] || ''),
      saleTallyRef: isSale ? (v.sourceRef || '') : ((linkIndex.saleRefByLink || {})[link] || ''),
      purVno: isSale ? (linkIndex.purByLink[link] || '') : v.vno,
      purTallyRef: isSale ? ((linkIndex.purRefByLink || {})[link] || '') : (v.sourceRef || ''),
      saleDate: v.date || '',
      branch: v.branch || '',
      salesType: productOf(v),
      intDom: intDomOf(v, booking),
      clientType: v.partyGroup || '',
      clientLedger: v.party || v.billTo || '',
      pax: tv.passengers || '', pnr: tv.pnrs || '', ticket: tv.tickets || '',
      finalValue: r2(v.total),
      cgst: g.cgst, sgst: g.sgst, igst: g.igst, vat: g.vat,
      ocgst: og.cgst, osgst: og.sgst, oigst: og.igst, ovat: og.vat,
      tcs: r2(v.tcsAmt), tds: r2(v.tdsAmt),
    };
    for (const ln of (v.lines || [])) {
      if (!ln || !ln.ledger) continue;
      const k = `head:${ln.ledger}`;
      row[k] = r2(numOf(row[k]) + numOf(ln.amt));
    }
    return row;
  });

  // 4) Footer column totals for every numeric column.
  const totals = {};
  for (const c of columns) if (c.num) totals[c.key] = r2(rows.reduce((s, r) => s + numOf(r[c.key]), 0));
  return { columns, rows, totals };
}

// Wide, horizontally-scrollable register table — sticky header AND sticky totals
// footer. Numeric columns (flagged `num`) right-align, Indian-group, and sum in the
// footer; text columns (Link No, Pax, PNR …) stay left-aligned. A mirrored top
// scrollbar keeps sideways scrolling reachable on long lists.
function CaptureTable({ columns, rows, totals, onOpenJV, onPrintInvoice }) {
  const topRef = React.useRef(null);
  const bodyRef = React.useRef(null);
  const [scrollW, setScrollW] = useState(0);
  useEffect(() => {
    const measure = () => { if (bodyRef.current) setScrollW(bodyRef.current.scrollWidth); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [columns, rows]);
  const fromTop = () => { if (bodyRef.current && topRef.current) bodyRef.current.scrollLeft = topRef.current.scrollLeft; };
  const fromBody = () => { if (bodyRef.current && topRef.current) topRef.current.scrollLeft = bodyRef.current.scrollLeft; };
  const cellNum = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString('en-IN') : '—'; };
  const mono = (k) => k === 'linkNo' || k === 'saleVno' || k === 'purVno';
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <div ref={topRef} onScroll={fromTop} style={{ overflowX: 'auto', overflowY: 'hidden', height: 14, borderBottom: '1px solid #eef1f6' }}>
        <div style={{ width: scrollW || '100%', height: 1 }} />
      </div>
      <div ref={bodyRef} onScroll={fromBody} className="kb-sticky" style={{ '--stick-head': DARK, '--stick-foot': DARK, maxHeight: 'calc(100vh - 230px)', overflow: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: '100%' }}>
          <thead><tr>
            {columns.map((c) => (
              <th key={c.key} style={{ padding: '8px 12px', textAlign: c.num ? 'right' : 'left', color: GOLD, fontWeight: 700, fontSize: 9.5, whiteSpace: 'nowrap', position: 'sticky', top: 0, background: DARK, zIndex: 1 }}>{c.label}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={rowBg(i)}>
                {columns.map((c) => {
                  // Final Invoice / Bill Value → green + clickable, opens the voucher's JV.
                  if (c.key === 'finalValue') {
                    return (
                      <td key={c.key} onClick={() => onOpenJV && r._v && onOpenJV(r._v)} title="Open journal voucher (JV)"
                        style={{ padding: '7px 12px', whiteSpace: 'nowrap', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: GREEN, fontWeight: 800, cursor: onOpenJV && r._v ? 'pointer' : 'default', textDecoration: onOpenJV && r._v ? 'underline' : 'none' }}>
                        {cellNum(r[c.key])}
                      </td>
                    );
                  }
                  // Trailing per-row printable invoice button.
                  if (c.key === 'invoice') {
                    return (
                      <td key={c.key} style={{ padding: '6px 12px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                        {r._booking
                          ? <button onClick={() => onPrintInvoice && onPrintInvoice(r)} style={{ padding: '4px 9px', fontSize: 10, fontWeight: 700, border: `1px solid ${BLUE}`, color: BLUE, background: '#fff', borderRadius: 5, cursor: 'pointer' }}>🧾 {c.label}</button>
                          : <span style={{ color: DIM }}>—</span>}
                      </td>
                    );
                  }
                  return (
                    <td key={c.key} style={{ padding: '7px 12px', whiteSpace: 'nowrap', color: mono(c.key) ? BLUE : DARK, textAlign: c.num ? 'right' : 'left', fontVariantNumeric: c.num ? 'tabular-nums' : 'normal', ...(mono(c.key) ? { fontFamily: 'monospace', fontSize: 10 } : null) }}>
                      {c.num ? cellNum(r[c.key]) : (r[c.key] || '—')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {totals && rows.length > 0 && (
            <tfoot><tr>
              {columns.map((c, idx) => (
                <td key={c.key} style={{ padding: '8px 12px', whiteSpace: 'nowrap', textAlign: c.num ? 'right' : 'left', fontWeight: 800, color: c.num ? '#fff' : GOLD, background: DARK, position: 'sticky', bottom: 0, fontVariantNumeric: c.num ? 'tabular-nums' : 'normal' }}>
                  {c.num ? cellNum(totals[c.key]) : (idx === 0 ? `TOTAL · ${rows.length}` : '')}
                </td>
              ))}
            </tr></tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

export function RegisterLive({ branch, initial = 'sales' }) {
  const cur = curOf(branch);
  // Locked per menu: the Sales Register shows ONLY sales, the Purchase Register ONLY
  // purchase — no cross-tab toggle (so each register is its own dataset).
  const tab = initial === 'purchase' ? 'purchase' : 'sales';
  const [view, setView] = useState('capture'); // capture (SO/PO/GP horizontal) | summary | detailed
  const [product, setProduct] = useState('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState(monthStartISO);
  const [to, setTo] = useState(todayISO);
  const [detail, setDetail] = useState(null);
  // Fetch all (date filtering is done client-side because Tally dates are mixed-format strings).
  const sales = useSalesRegister(branch);
  const purch = usePurchaseRegister(branch);
  const refReissue = useRefundReissue(branch); // RF/RI folded into BOTH registers' All-modules view
  const bookingsQ = useBookingOrders(branch); // joins each invoice → its SO/PO/GP for Pax/PNR/Ticket
  const q = tab === 'sales' ? sales : purch;
  // Sales register = sale + reissue + refund; Purchase register = purchase + the same
  // RF/RI vouchers (their cost reversal lives in the one combined voucher). They show
  // labelled 'Refund'/'Reissue' in the Sales/Purchase Type column — never as a sale.
  const allRows = useMemo(() => [...(q.data || []), ...(refReissue.data || [])], [q.data, refReissue.data]);
  const products = useMemo(() => {
    const present = new Set(allRows.map(productOf).filter(Boolean));
    const extras = [...present].filter((p) => !MODULE_ORDER.includes(p)).sort();
    return [...MODULE_ORDER, ...extras]; // always selectable, plus anything else in the data
  }, [allRows]);
  const needle = search.trim().toLowerCase();
  const rows = useMemo(() => allRows
    .filter((v) => product === 'all' || productOf(v) === product)
    // While a search term is active, ignore the date window so a match is found
    // regardless of period (otherwise the default month silently hides older vouchers).
    .filter((v) => !!needle || dateInRange(v.date, from, to))
    .filter((v) => !needle || voucherHaystack(v).includes(needle)), [allRows, product, from, to, needle]);
  const sum = (k) => rows.reduce((s, v) => s + (v[k] || 0), 0);
  const sheet = useMemo(() => vouchersToSheet(rows), [rows]);

  // Sale ↔ purchase invoice numbers share a booking's Link No — index both sides so
  // the capture row can show its counterpart invoice. Booking index (by Link No,
  // approved/posted preferred) supplies the per-passenger travel detail.
  const linkIndex = useMemo(() => {
    const saleByLink = {}, purByLink = {}, saleRefByLink = {}, purRefByLink = {};
    for (const v of (sales.data || [])) if (v.linkNo) { saleByLink[v.linkNo] = v.vno; saleRefByLink[v.linkNo] = v.sourceRef || ''; }
    for (const v of (purch.data || [])) if (v.linkNo) { purByLink[v.linkNo] = v.vno; purRefByLink[v.linkNo] = v.sourceRef || ''; }
    return { saleByLink, purByLink, saleRefByLink, purRefByLink };
  }, [sales.data, purch.data]);
  const bookingByLink = useMemo(() => {
    const m = {};
    for (const b of (bookingsQ.data || [])) {
      if (!b || !b.linkNo) continue;
      const isApproved = b.status === 'approved' || b.status === 'posted';
      if (!m[b.linkNo] || isApproved) m[b.linkNo] = b;
    }
    return m;
  }, [bookingsQ.data]);
  const brTag = (!branch || branch === 'ALL') ? '' : (branch.code || branch);
  const showType = product === 'all'; // All modules → add the Sales/Purchase Type column
  const captureSheet = useMemo(
    () => buildCaptureSheet(rows, { tab, tag: brTag, linkIndex, bookingByLink, showType }),
    [rows, tab, brTag, linkIndex, bookingByLink, showType],
  );
  // Final Invoice Value → open the voucher's journal (JV). Per-row Invoice → print PDF.
  const openJV = (v) => { if (v) setDetail(v); };
  const printInvoice = (r) => {
    const b = r && r._booking;
    if (!b) return;
    openPrintPreview({
      title: `${tab === 'sales' ? 'Sales Invoice' : 'Purchase Invoice'} · ${b.bookingNo || b.linkNo || ''}`,
      recommend: 'portrait',
      html: buildBookingInvoice(b, tab === 'sales' ? 'sale' : 'purchase', branch),
    });
  };

  const exportNow = () => {
    if (!rows.length) return;
    const name = `${tab}-register-${product === 'all' ? 'all' : product}-${branchLabel(branch)}`;
    if (view === 'capture') {
      const cols = captureSheet.columns.filter((c) => c.key !== 'invoice'); // button column, no data to export
      const totalRow = { ...captureSheet.totals, linkNo: `TOTAL · ${captureSheet.rows.length}` };
      exportToExcel(name, cols, [...captureSheet.rows, totalRow]);
    } else {
      exportToExcel(name, sheet.columns, sheet.rows);
    }
  };
  // Feed the global Tally Export bar balanced Sales/Purchase vouchers. Only true
  // sale/purchase rows go to Tally — refund/reissue are shown in the register view
  // but excluded here so they can't export as a mis-typed Sales/Purchase voucher.
  const tallyVouchers = useMemo(() => rows.filter((v) => v.category === (tab === 'sales' ? 'sale' : 'purchase')).map((v) => {
    const total = Math.round(v.total || 0), gst = Math.round(v.taxAmt || 0), net = Math.round(v.subtotal || (total - gst));
    const party = v.party || (tab === 'sales' ? 'Sundry Debtors' : 'Sundry Creditors');
    const base = { date: v.date, vno: v.vno, narration: v.linkNo ? `Link ${v.linkNo}` : '' };
    return tab === 'sales'
      ? { ...base, vchType: 'Sales', entries: [
          { ledger: party, amount: total, drCr: 'Dr' },
          { ledger: 'Sales Account', amount: net, drCr: 'Cr' },
          ...(gst ? [{ ledger: 'Output GST', amount: gst, drCr: 'Cr' }] : []),
        ] }
      : { ...base, vchType: 'Purchase', entries: [
          { ledger: 'Purchase Account', amount: net, drCr: 'Dr' },
          ...(gst ? [{ ledger: 'Input GST', amount: gst, drCr: 'Dr' }] : []),
          { ledger: party, amount: total, drCr: 'Cr' },
        ] };
  }), [rows, tab]);
  useReportExport({ title: tab === 'sales' ? 'Sales Register' : 'Purchase Register', kind: 'vouchers', rows: tallyVouchers, recommend: 'landscape' }, [tallyVouchers, tab]);
  const subHint = view === 'capture' ? 'every SO/PO/GP figure, module-wise — scroll right'
    : view === 'detailed' ? 'every Tally column shown — scroll right'
      : 'click a row for full detail';
  return (
    <Page
      wide={view !== 'summary'}
      title={tab === 'sales' ? 'Sales Register' : 'Purchase Register'}
      sub={`${branchLabel(branch)} · ${rows.length} vouchers · Total ${money(cur, sum('total'))} · ${needle ? 'searching all dates' : subHint}`}
      right={<>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search passenger / party / ticket / link no / voucher…"
          style={{ ...inp, width: 280, minHeight: 32, fontSize: 11 }} />
        <select value={product} onChange={(e) => setProduct(e.target.value)} title="Filter the register by module" style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, cursor: 'pointer' }}>
          <option value="all">All modules</option>
          {products.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <ModeToggle view={view} setView={setView} modes={[{ id: 'capture', label: 'SO/PO/GP Capture' }, { id: 'summary', label: 'Summary' }, { id: 'detailed', label: 'All Columns' }]} />
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} branch={branch} />
        <ExportBtn onClick={exportNow} disabled={!rows.length} />
      </>}
    >
      <State q={q} empty={rows.length === 0}>
        {view === 'capture' ? (
          <CaptureTable columns={captureSheet.columns} rows={captureSheet.rows} totals={captureSheet.totals} onOpenJV={openJV} onPrintInvoice={printInvoice} />
        ) : view === 'detailed' ? (
          <DetailedTable columns={sheet.columns} rows={sheet.rows} />
        ) : (
          <Table>
            <thead><tr style={headRow}>
              <Th>Date</Th><Th>Voucher</Th><Th>Type</Th><Th>{tab === 'sales' ? 'Customer' : 'Supplier'}</Th><Th>Link No</Th>
              <Th right>Taxable</Th><Th right>GST</Th><Th right>Total</Th>
            </tr></thead>
            <tbody>
              {rows.map((v, i) => (
                <tr key={v.id || v.vno} style={{ ...rowBg(i), cursor: 'pointer' }} onClick={() => setDetail(v)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'; }}>
                  <td style={{ padding: '8px 12px', color: DIM, whiteSpace: 'nowrap' }}>{v.date}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, color: BLUE, whiteSpace: 'nowrap' }}>
                    {v.locked && v.source === 'booking' && <span title={`Locked — driven by booking ${v.bookingId}`} style={{ marginRight: 4 }}>🔒</span>}
                    {v.vno}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#384677' }}>{v.type}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: DARK }}>{v.party || '—'}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, color: '#6b21a8' }}>{v.linkNo || '—'}</td>
                  <td style={{ padding: '8px 12px', ...num }}>{money(cur, v.subtotal)}</td>
                  <td style={{ padding: '8px 12px', ...num, color: '#854F0B' }}>{money(cur, v.taxAmt)}</td>
                  <td style={{ padding: '8px 12px', ...num, fontWeight: 700 }}>{money(cur, v.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
              <td colSpan={5} style={{ padding: '9px 12px', fontWeight: 700, color: GOLD }}>TOTAL — {rows.length}</td>
              <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, sum('subtotal'))}</td>
              <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{money(cur, sum('taxAmt'))}</td>
              <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, sum('total'))}</td>
            </tr></tfoot>
          </Table>
        )}
      </State>
      <VoucherDetail voucher={detail} cur={cur} onClose={() => setDetail(null)} />
    </Page>
  );
}

/* ════════════════════ INVOICE-WISE GP (by Link No) ═════════════════ */
export function InvoiceGPLive({ branch }) {
  const cur = curOf(branch);
  const [from, setFrom] = useState(monthStartISO);
  const [to, setTo] = useState(todayISO);
  const [open, setOpen] = useState(null);     // expanded row index
  const [view, setView] = useState('summary'); // summary | detailed
  // Fetch all; date filtering is client-side (Tally dates are mixed-format strings).
  const q = useInvoiceGP(branch);
  // Underlying vouchers (with full Tally bifurcation in line.meta) → drill + export.
  const salesQ = useSalesRegister(branch);
  const purchQ = usePurchaseRegister(branch);
  const salesRows = salesQ.data || [];
  const purchRows = purchQ.data || [];
  const d = q.data;
  const allGpRows = d?.rows || [];
  const STATUS = {
    matched: { c: GREEN, t: 'matched' }, 'no-cost': { c: '#854F0B', t: 'no cost' }, 'no-sale': { c: RED, t: 'no sale' },
    'sale (no link)': { c: BLUE, t: 'sale · no link' }, 'purchase (no link)': { c: '#854F0B', t: 'purchase · no link' },
  };

  // Index underlying vouchers by Link No and by voucher no.
  const byLink = useMemo(() => {
    const m = new Map();
    const add = (v, side) => {
      const k = (v.linkNo || '').trim(); if (!k) return;
      if (!m.has(k)) m.set(k, { sales: [], purchases: [] });
      m.get(k)[side].push(v);
    };
    salesRows.forEach((v) => add(v, 'sales'));
    purchRows.forEach((v) => add(v, 'purchases'));
    return m;
  }, [salesRows, purchRows]);
  const byVno = useMemo(() => {
    const m = new Map();
    [...salesRows, ...purchRows].forEach((v) => m.set(v.vno, v));
    return m;
  }, [salesRows, purchRows]);
  const underlyingFor = (r) => {
    if (r.linked && r.linkNo) return byLink.get(r.linkNo) || { sales: [], purchases: [] };
    const v = byVno.get(r.ref);
    if (!v) return { sales: [], purchases: [] };
    return v.category === 'sale' ? { sales: [v], purchases: [] } : { sales: [], purchases: [v] };
  };
  // Fall back to underlying voucher fields so the table is fully populated even
  // against an older backend that didn't return date on the GP rows.
  const fields = (r) => {
    const u = underlyingFor(r);
    return {
      u,
      ref: r.ref || r.linkNo || (Array.isArray(r.vnos) ? r.vnos.join(' · ') : '') || '—',
      date: r.date || u.sales[0]?.date || u.purchases[0]?.date || '—',
      customer: r.customer || u.sales[0]?.party || '—',
      supplier: r.supplier || u.purchases[0]?.party || '—',
    };
  };

  // Date-filter the GP rows client-side (resolve the file's date from the row or
  // its underlying voucher), then recompute the totals for the filtered set.
  const gpDate = (r) => { const u = underlyingFor(r); return r.date || u.sales[0]?.date || u.purchases[0]?.date || ''; };
  const rows = useMemo(() => allGpRows.filter((r) => dateInRange(gpDate(r), from, to)), [allGpRows, from, to, byLink, byVno]);
  const linkedCount = rows.filter((r) => r.linked).length;
  const unlinked = { sales: rows.filter((r) => r.status === 'sale (no link)').length, purchases: rows.filter((r) => r.status === 'purchase (no link)').length };
  const totals = useMemo(() => {
    const sale = Math.round(rows.reduce((s, r) => s + (r.sale || 0), 0) * 100) / 100;
    const cost = Math.round(rows.reduce((s, r) => s + (r.cost || 0), 0) * 100) / 100;
    const gp = Math.round((sale - cost) * 100) / 100;
    return { sale, cost, gp, gpPct: sale > 0 ? Math.round((gp / sale) * 10000) / 100 : 0 };
  }, [rows]);

  const exportSummary = () => {
    if (!rows.length) return;
    const columns = [
      { key: 'ref', label: 'Link No / Voucher' }, { key: 'date', label: 'Date' },
      { key: 'customer', label: 'Customer' }, { key: 'supplier', label: 'Supplier' },
      { key: 'sale', label: 'Sale' }, { key: 'cost', label: 'Cost' },
      { key: 'gp', label: 'Gross Profit' }, { key: 'gpPct', label: 'GP %' },
      { key: 'status', label: 'Status' }, { key: 'vouchers', label: 'Vouchers' },
    ];
    const sheet = rows.map((r) => {
      const f = fields(r);
      return {
        ref: f.ref, date: f.date, customer: f.customer === '—' ? '' : f.customer, supplier: f.supplier === '—' ? '' : f.supplier,
        sale: r.sale, cost: r.cost, gp: r.gp, gpPct: r.gpPct, status: r.status,
        vouchers: Array.isArray(r.vnos) ? r.vnos.join(' · ') : '',
      };
    });
    exportToExcel(`gross-profit-${branchLabel(branch)}`, columns, sheet);
  };
  // Flatten every GP file into its underlying sale & purchase vouchers, tagged
  // with the file's GP — drives both the inline Detailed table and the export.
  const detailSheet = useMemo(() => {
    const list = [];
    rows.forEach((r) => {
      const u = r.linked && r.linkNo ? (byLink.get(r.linkNo) || { sales: [], purchases: [] })
        : (() => { const v = byVno.get(r.ref); return v ? (v.category === 'sale' ? { sales: [v], purchases: [] } : { sales: [], purchases: [v] }) : { sales: [], purchases: [] }; })();
      u.sales.forEach((v) => list.push({ ...v, __lead: { gpFile: r.ref || r.linkNo, side: 'Sale', fileGP: r.gp, fileGPpct: r.gpPct } }));
      u.purchases.forEach((v) => list.push({ ...v, __lead: { gpFile: r.ref || r.linkNo, side: 'Cost', fileGP: r.gp, fileGPpct: r.gpPct } }));
    });
    const lead = [
      { key: 'gpFile', label: 'GP File / Link No' }, { key: 'side', label: 'Side' },
      { key: 'fileGP', label: 'File GP' }, { key: 'fileGPpct', label: 'File GP %' },
    ];
    return vouchersToSheet(list, lead);
  }, [rows, byLink, byVno]);
  const exportDetailed = () => {
    if (!detailSheet.rows.length) return;
    exportToExcel(`gross-profit-detailed-${branchLabel(branch)}`, detailSheet.columns, detailSheet.rows);
  };

  const detailReady = !salesQ.isLoading && !purchQ.isLoading;
  const SideTag = ({ tone, children }) => (
    <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.5px', padding: '2px 8px', borderRadius: 4, marginBottom: 8, display: 'inline-block',
      background: (tone === 'sale' ? BLUE : '#854F0B') + '18', color: tone === 'sale' ? BLUE : '#854F0B' }}>{children}</span>
  );

  return (
    <Page
      wide={view === 'detailed'}
      title="Invoice-wise Gross Profit"
      sub={`${branchLabel(branch)} · ${rows.length} rows (${linkedCount} linked files) · ${view === 'detailed' ? 'every sale & purchase with full base-fare / tax bifurcation — scroll right' : 'click a row for the full base-fare / tax bifurcation'}`}
      right={<>
        <ViewToggle view={view} setView={setView} />
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} branch={branch} />
        <ExportBtn onClick={exportSummary} disabled={!rows.length} label="Export GP" />
        <ExportBtn onClick={exportDetailed} disabled={!detailSheet.rows.length || !detailReady} label="Export Full Detail" />
      </>}
    >
      {(unlinked.sales > 0 || unlinked.purchases > 0) && (
        <Banner tone="info">{unlinked.sales} sale(s) and {unlinked.purchases} purchase(s) have no Link No — shown individually below. Give a sale and its purchase the same Link No to pair them into one file.</Banner>
      )}
      <State q={q} empty={rows.length === 0}>
        {view === 'detailed' ? (
          !detailReady ? <div style={{ ...card, padding: 28, textAlign: 'center', color: DIM, fontSize: 12 }}>Loading full detail…</div>
            : <DetailedTable columns={detailSheet.columns} rows={detailSheet.rows} />
        ) : (
        <Table>
          <thead><tr style={headRow}>
            <Th>Link No / Voucher</Th><Th>Date</Th><Th>Customer</Th><Th>Supplier</Th><Th right>Sale</Th><Th right>Cost</Th><Th right>GP</Th><Th right>GP %</Th><Th>Status</Th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const s = STATUS[r.status] || { c: DIM, t: r.status };
              const f = fields(r);
              const isOpen = open === i;
              return (
                <React.Fragment key={r.ref + '-' + i}>
                  <tr style={{ ...rowBg(i), cursor: 'pointer', background: isOpen ? '#eef4ff' : rowBg(i).background }} onClick={() => setOpen(isOpen ? null : i)}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10.5, color: r.linked ? '#6b21a8' : '#64748b', fontWeight: 700 }}>
                      <span style={{ color: DIM, marginRight: 5 }}>{isOpen ? '▾' : '▸'}</span>{f.ref}
                    </td>
                    <td style={{ padding: '8px 12px', color: DIM, whiteSpace: 'nowrap' }}>{f.date}</td>
                    <td style={{ padding: '8px 12px', color: DARK }}>{f.customer}</td>
                    <td style={{ padding: '8px 12px', color: DARK }}>{f.supplier}</td>
                    <td style={{ padding: '8px 12px', ...num }}>{money(cur, r.sale)}</td>
                    <td style={{ padding: '8px 12px', ...num, color: '#854F0B' }}>{money(cur, r.cost)}</td>
                    <td style={{ padding: '8px 12px', ...num, fontWeight: 700, color: r.gp >= 0 ? GREEN : RED }}>{money(cur, r.gp)}</td>
                    <td style={{ padding: '8px 12px', ...num, fontWeight: 700, color: r.gp >= 0 ? GREEN : RED }}>{r.gpPct}%</td>
                    <td style={{ padding: '8px 12px' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 700, background: s.c + '22', color: s.c }}>{s.t}</span></td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={9} style={{ padding: 0, background: '#f7f9fc', borderBottom: '2px solid #e1e3ec' }}>
                        <div style={{ padding: 16 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: DARK, marginBottom: 12 }}>
                            File {f.ref} — Sale {money(cur, r.sale)} − Cost {money(cur, r.cost)} = GP <span style={{ color: r.gp >= 0 ? GREEN : RED }}>{money(cur, r.gp)}</span> ({r.gpPct}%)
                          </div>
                          {f.u.sales.length === 0 && f.u.purchases.length === 0 && (
                            <div style={{ fontSize: 11, color: DIM }}>{detailReady ? 'No underlying voucher detail found.' : 'Loading detail…'}</div>
                          )}
                          {f.u.sales.map((v) => (
                            <div key={v.id || v.vno} style={{ marginBottom: 14 }}><SideTag tone="sale">SALE</SideTag><VoucherLines voucher={v} cur={cur} /></div>
                          ))}
                          {f.u.purchases.map((v) => (
                            <div key={v.id || v.vno} style={{ marginBottom: 14 }}><SideTag tone="cost">PURCHASE / COST</SideTag><VoucherLines voucher={v} cur={cur} /></div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
            <td colSpan={4} style={{ padding: '9px 12px', fontWeight: 700, color: GOLD }}>TOTAL — {rows.length} rows</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, totals.sale)}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, totals.cost)}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{money(cur, totals.gp)}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{totals.gpPct}%</td>
            <td />
          </tr></tfoot>
        </Table>
        )}
      </State>
    </Page>
  );
}

/* ════════════════════ 28 TALLY GROUPS ══════════════════════════════ */
export function LedgerGroupsLive() {
  const q = useLedgerGroups();
  const groups = q.data || [];
  const NAT = { asset: BLUE, liability: RED, income: GREEN, expense: '#854F0B' };
  const Section = ({ title, list }) => (
    <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: '9px 14px', background: DARK, color: GOLD, fontWeight: 700, fontSize: 12 }}>{title} — {list.length} groups</div>
      <div className="kb-sticky" style={{ '--stick-head': '#f3f4f8', maxHeight: '60vh' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead><tr style={{ background: '#f3f4f8' }}><Th>#</Th><Th>Group</Th><Th>Nature</Th><Th>Golden-Rule Class</Th><Th>Natural Side</Th><Th>Under</Th></tr></thead>
        <tbody>
          {list.map((g, i) => (
            <tr key={g.id} style={rowBg(i)}>
              <td style={{ padding: '8px 14px', color: DIM }}>{g.id}</td>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: DARK }}>{g.name}</td>
              <td style={{ padding: '8px 14px' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 700, background: (NAT[g.nature] || DIM) + '22', color: NAT[g.nature] || DIM }}>{g.nature}</span></td>
              <td style={{ padding: '8px 14px', color: '#384677' }}>{g.cls}</td>
              <td style={{ padding: '8px 14px', fontWeight: 700, color: g.naturalSide === 'Cr' ? RED : BLUE }}>{g.naturalSide}</td>
              <td style={{ padding: '8px 14px', color: DIM }}>{g.parent || '— primary —'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
  return (
    <Page title="Ledger Groups — Tally's 28 Pre-Defined Groups" sub="Every ledger belongs to one of these groups; the group fixes whether it lands in the Balance Sheet or P&L."
      right={<button onClick={() => exportToExcel('ledger-groups', [{ key: 'id', label: '#' }, { key: 'name', label: 'Group' }, { key: 'nature', label: 'Nature' }, { key: 'cls', label: 'Golden-Rule Class' }, { key: 'naturalSide', label: 'Natural Side' }, { key: 'statement', label: 'Statement' }, { key: 'parent', label: 'Under' }], groups)} disabled={groups.length === 0} title="Export to Excel"
        style={{ padding: '7px 13px', background: '#fff', color: DARK, border: '1px solid #d6dbe6', borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: groups.length === 0 ? 'not-allowed' : 'pointer', opacity: groups.length === 0 ? 0.5 : 1 }}>📤 Export</button>}>
      <State q={q} empty={groups.length === 0}>
        <Section title="Balance Sheet" list={groups.filter((g) => g.statement === 'BS')} />
        <Section title="Profit & Loss Account" list={groups.filter((g) => g.statement === 'PL')} />
      </State>
    </Page>
  );
}

/* ════════════════════ CHART OF ACCOUNTS ════════════════════════════ */
export function ChartOfAccountsLive({ branch }) {
  const cur = curOf(branch);
  const q = useChartOfAccounts(branch);
  const ledgers = q.data || [];
  const groups = useMemo(() => [...new Set(ledgers.map((l) => l.group))].sort(), [ledgers]);
  return (
    <Page title="Chart of Accounts" sub={`${branchLabel(branch)} · ${ledgers.length} ledgers across ${groups.length} groups`}
      right={<button onClick={() => exportToExcel(`chart-of-accounts-${branchLabel(branch)}`, [{ key: 'group', label: 'Group' }, { key: 'code', label: 'Code' }, { key: 'name', label: 'Ledger' }, { key: 'nature', label: 'Nature' }, { key: 'statement', label: 'Statement' }, { key: 'openingBalance', label: 'Opening Balance' }, { key: 'drCr', label: 'Dr/Cr' }], ledgers)} disabled={ledgers.length === 0} title="Export to Excel"
        style={{ padding: '7px 13px', background: '#fff', color: DARK, border: '1px solid #d6dbe6', borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: ledgers.length === 0 ? 'not-allowed' : 'pointer', opacity: ledgers.length === 0 ? 0.5 : 1 }}>📤 Export</button>}>
      <State q={q} empty={ledgers.length === 0}>
        <Table>
          <thead><tr style={headRow}><Th>Group</Th><Th>Code</Th><Th>Ledger</Th><Th>Nature</Th><Th>Statement</Th><Th right>Opening</Th></tr></thead>
          <tbody>
            {groups.map((grp) => {
              const gl = ledgers.filter((l) => l.group === grp);
              return gl.map((l, i) => (
                <tr key={l.id || l.code} style={rowBg(i)}>
                  {i === 0 && <td rowSpan={gl.length} style={{ padding: '9px 14px', fontWeight: 700, color: DARK, borderRight: '2px solid #e1e3ec', verticalAlign: 'top', fontSize: 10.5, background: '#f9fafb' }}>{grp}</td>}
                  <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 10, color: BLUE }}>{l.code}</td>
                  <td style={{ padding: '9px 14px', fontWeight: 600 }}>
                    <button onClick={() => openLedgerModal(l.name)} title="Open ledger account" style={{ background: 'none', border: 'none', padding: 0, color: BLUE, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, fontSize: 'inherit' }}>{l.name}</button>
                  </td>
                  <td style={{ padding: '9px 14px', color: '#384677' }}>{l.nature || '—'}</td>
                  <td style={{ padding: '9px 14px', color: DIM }}>{l.statement === 'PL' ? 'P&L' : l.statement === 'BS' ? 'Balance Sheet' : '—'}</td>
                  <td style={{ padding: '9px 14px', ...num }}>{l.openingBalance ? `${money(cur, l.openingBalance)} ${l.drCr}` : '—'}</td>
                </tr>
              ));
            })}
          </tbody>
        </Table>
      </State>
    </Page>
  );
}

/* ════════════════════ ACCOUNTS INFO — CHART (tree + side-by-side) ═══════════
   Authoritative Chart-of-Accounts hierarchy from /groups/tree:
   Primary group → Tally group → custom sub-group → ledger. Two views:
   • Grouped hierarchy : the full nested tree (collapsible)
   • Side-by-side       : Groups (Tally) | Sub-Groups (custom) | Ledgers          */
export function AccountsChartLive({ branch }) {
  const tq = useGroupTree(branch);
  const roots = tq.data || [];
  const [view, setView] = useState('tree');
  const [open, setOpen] = useState({});
  const isOpen = (k, def) => (open[k] === undefined ? def : open[k]);

  const countLedgers = (n) => (n.ledgers || []).length + (n.children || []).reduce((s, c) => s + countLedgers(c), 0);

  // Walk the tree → flat Groups (Tally system) / Sub-Groups (custom) / Ledgers.
  const { groups, subGroups, ledgers, allKeys, totalLedgers } = useMemo(() => {
    const groups = [], subGroups = [], ledgers = [], allKeys = [];
    const walk = (node, sysAncestor, statement) => {
      const isSystem = node.system !== false;          // the 28 Tally groups
      const stmt = node.statement || statement;
      const myTop = isSystem ? node.name : sysAncestor;
      allKeys.push('n:' + (node.id || node.name));
      if (isSystem) groups.push({ name: node.name, statement: stmt, count: countLedgers(node) });
      else subGroups.push({ name: node.name, parent: sysAncestor, count: countLedgers(node) });
      (node.ledgers || []).forEach((l) => ledgers.push({ ...l, topGroup: myTop, subGroup: isSystem ? '' : node.name }));
      (node.children || []).forEach((c) => walk(c, myTop, stmt));
    };
    roots.forEach((r) => walk(r, r.name, r.statement));
    return {
      groups: groups.sort((a, b) => a.name.localeCompare(b.name)),
      subGroups: subGroups.sort((a, b) => a.name.localeCompare(b.name)),
      ledgers: ledgers.sort((a, b) => (a.name || '').localeCompare(b.name || '')),
      allKeys, totalLedgers: ledgers.length,
    };
  }, [roots]);

  const setAll = (v) => setOpen(Object.fromEntries(allKeys.map((k) => [k, v])));
  const stmtBadge = (s) => <span style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 999, fontWeight: 700, background: (s === 'PL' ? GREEN : BLUE) + '1e', color: s === 'PL' ? GREEN : BLUE }}>{s === 'PL' ? 'P&L' : s === 'BS' ? 'Balance Sheet' : '—'}</span>;
  const seg = (active) => ({ padding: '5px 12px', fontSize: 11.5, fontWeight: 700, border: `1px solid ${active ? DARK : '#d6dbe6'}`, background: active ? DARK : '#fff', color: active ? GOLD : DIM, cursor: 'pointer' });
  const Col = ({ title, count, children }) => (
    <div style={{ ...card, padding: 0, overflow: 'hidden', flex: 1, minWidth: 220 }}>
      <div style={{ padding: '8px 12px', background: DARK, color: GOLD, fontWeight: 700, fontSize: 11.5 }}>{title} — {count}</div>
      <div className="kb-sticky" style={{ maxHeight: '64vh', overflowY: 'auto' }}>{children}</div>
    </div>
  );

  // Recursive node renderer for the hierarchy view.
  const Node = ({ node, depth }) => {
    const key = 'n:' + (node.id || node.name);
    const isSystem = node.system !== false;
    const kids = node.children || [];
    const leds = (node.ledgers || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const opened = isOpen(key, depth < 2);            // top two levels open by default
    const lc = countLedgers(node);
    return (
      <div>
        <div onClick={() => setOpen((s) => ({ ...s, [key]: !opened }))}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `7px 12px 7px ${12 + depth * 18}px`, background: isSystem ? '#eef3fb' : '#f6f9fd', borderTop: '1px solid #e4ebf5', cursor: 'pointer', fontWeight: isSystem ? 700 : 600, color: isSystem ? DARK : '#1a3a6e' }}>
          <span style={{ color: GOLD, width: 12 }}>{(kids.length || leds.length) ? (opened ? '▾' : '▸') : ''}</span>
          <span style={{ textDecoration: isSystem ? 'underline' : 'none' }}>{node.name}</span>
          {!isSystem && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#e7eef9', color: DIM, fontWeight: 700 }}>sub-group</span>}
          {isSystem && node.statement && stmtBadge(node.statement)}
          <span style={{ marginLeft: 'auto', color: DIM, fontWeight: 600, fontSize: 11 }}>{lc} ledger{lc !== 1 ? 's' : ''}</span>
        </div>
        {opened && (
          <>
            {kids.map((c) => <Node key={c.id || c.name} node={c} depth={depth + 1} />)}
            {leds.map((l) => (
              <div key={l.id || l.code || l.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: `5px 12px 5px ${12 + (depth + 1) * 18 + 14}px`, borderBottom: '1px solid #f4f6fa', fontSize: 12 }}>
                <span onClick={() => openLedgerModal(l.name)} title="Open ledger account" style={{ fontWeight: 600, color: BLUE, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>{l.name}</span>
                {l.code ? <span style={{ fontFamily: 'monospace', fontSize: 10, color: BLUE }}>{l.code}</span> : null}
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <Page title="Accounts Info — Chart of Accounts" sub={`${branchLabel(branch)} · ${totalLedgers} ledgers · ${subGroups.length} sub-groups · ${groups.length} groups`}
      right={<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden' }}>
          <button onClick={() => setView('tree')} style={{ ...seg(view === 'tree'), borderRight: 'none' }}>Grouped hierarchy</button>
          <button onClick={() => setView('split')} style={seg(view === 'split')}>Side-by-side</button>
        </span>
        <button onClick={() => exportToExcel(`chart-of-accounts-${branchLabel(branch)}`, [{ key: 'topGroup', label: 'Group' }, { key: 'subGroup', label: 'Sub-Group' }, { key: 'code', label: 'Code' }, { key: 'name', label: 'Ledger' }], ledgers)} disabled={ledgers.length === 0}
          style={{ padding: '7px 13px', background: '#fff', color: DARK, border: '1px solid #d6dbe6', borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: ledgers.length === 0 ? 'not-allowed' : 'pointer', opacity: ledgers.length === 0 ? 0.5 : 1 }}>📤 Export</button>
      </div>}>
      <State q={tq} empty={roots.length === 0}>
        {view === 'tree' ? (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '6px 12px', borderBottom: '1px solid #eef1f6', background: '#fafbfe' }}>
              <button onClick={() => setAll(true)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${DARK}`, borderRadius: 5, background: '#fff', color: DARK, cursor: 'pointer' }}>⊞ Expand all</button>
              <button onClick={() => setAll(false)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${DARK}`, borderRadius: 5, background: '#fff', color: DARK, cursor: 'pointer' }}>⊟ Collapse all</button>
            </div>
            <div className="kb-sticky" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {roots.map((r) => <Node key={r.id || r.name} node={r} depth={0} />)}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Col title="Groups (Tally)" count={groups.length}>
              {groups.map((g, i) => (
                <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', ...rowBg(i), fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: DARK }}>{g.name}</span>{stmtBadge(g.statement)}
                  <span style={{ marginLeft: 'auto', color: DIM, fontSize: 11 }}>{g.count}</span>
                </div>
              ))}
            </Col>
            <Col title="Sub-Groups (Custom)" count={subGroups.length}>
              {subGroups.length === 0 ? <div style={{ padding: 14, color: DIM, fontSize: 12 }}>No custom sub-groups.</div> : subGroups.map((s, i) => (
                <div key={s.name} style={{ padding: '7px 12px', ...rowBg(i), fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontWeight: 600, color: '#1a3a6e' }}>{s.name}</span><span style={{ marginLeft: 'auto', color: DIM, fontSize: 11 }}>{s.count}</span></div>
                  <div style={{ color: DIM, fontSize: 10.5 }}>under {s.parent}</div>
                </div>
              ))}
            </Col>
            <Col title="Ledgers" count={ledgers.length}>
              {ledgers.map((l, i) => (
                <div key={l.id || l.code || l.name} style={{ padding: '7px 12px', ...rowBg(i), fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span onClick={() => openLedgerModal(l.name)} title="Open ledger account" style={{ fontWeight: 600, color: BLUE, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>{l.name}</span>{l.code ? <span style={{ fontFamily: 'monospace', fontSize: 9.5, color: BLUE }}>{l.code}</span> : null}</div>
                  <div style={{ color: DIM, fontSize: 10.5 }}>{l.topGroup}{l.subGroup ? ` › ${l.subGroup}` : ''}</div>
                </div>
              ))}
            </Col>
          </div>
        )}
      </State>
    </Page>
  );
}

/* ════════════════════ CASH BOOK (live) ═════════════════════════════
   A true Tally Cash Book: the ledger account of a Cash-in-Hand ledger.
   Opening b/d → every receipt (Dr) / payment (Cr) with a running balance →
   closing balance. Derived live from the ledger statement (full history fetched
   so the period opening is exact for any from/to), no demo data.            */
export function CashBookLive({ branch }) {
  const cur = curOf(branch);
  const [from, setFrom] = useState(todayISO);
  const [to, setTo] = useState(todayISO);
  const [view, setView] = useState('detailed'); // detailed | minimal
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [ledger, setLedger] = useState('');
  const [voucher, setVoucher] = useState(null); // { id, vno } — drill-down to the voucher

  const chart = useChartOfAccounts(branch);
  const cashLedgers = useMemo(() => (chart.data || []).filter((l) => /cash/i.test(l.group || '')).sort((a, b) => a.name.localeCompare(b.name)), [chart.data]);
  const selected = ledger || cashLedgers[0]?.name || '';
  // Full history (no date filter) → period opening is computed exactly client-side.
  const q = useLedgerStatement(selected, branch);
  const d = q.data;

  const signedOpen = (v) => (v.openingSide === 'Cr' ? -1 : 1) * (v.openingBalance || 0);
  const masterOpen = d ? signedOpen(d) : 0;
  const allLines = d?.lines || [];
  // Period opening = master opening + movement strictly before `from`.
  const periodOpen = useMemo(() => {
    if (!from) return masterOpen;
    const f = parseAnyDate(from);
    let bal = masterOpen;
    for (const ln of allLines) { const dt = parseAnyDate(ln.date); if (dt && f && dt < f) bal += (ln.debit || 0) - (ln.credit || 0); }
    return Math.round(bal * 100) / 100;
  }, [allLines, masterOpen, from]);

  // In-range lines with a running balance carried from the period opening.
  const rowsFull = useMemo(() => {
    let run = periodOpen;
    return allLines.filter((ln) => dateInRange(ln.date, from, to)).map((ln) => {
      run = Math.round((run + (ln.debit || 0) - (ln.credit || 0)) * 100) / 100;
      return { date: ln.date, vno: ln.vno, category: ln.category, voucherId: ln.voucherId, debit: ln.debit || 0, credit: ln.credit || 0, particulars: ln.narration || ln.party || ln.category || '', running: run };
    });
  }, [allLines, periodOpen, from, to]);

  const receipts = Math.round(rowsFull.reduce((s, r) => s + r.debit, 0));
  const payments = Math.round(rowsFull.reduce((s, r) => s + r.credit, 0));
  const closing = Math.round(periodOpen + receipts - payments);

  const term = search.trim().toLowerCase();
  const rowsShown = useMemo(() => (term ? rowsFull.filter((r) => `${r.vno} ${r.particulars} ${r.category}`.toLowerCase().includes(term)) : rowsFull), [rowsFull, term]);
  const pageRows = useMemo(() => rowsShown.slice(page * pageSize, page * pageSize + pageSize), [rowsShown, page, pageSize]);

  const expColumns = view === 'minimal'
    ? [{ key: 'date', label: 'Date' }, { key: 'vno', label: 'Voucher No' }, { key: 'particulars', label: 'Particulars' }, { key: 'debit', label: `Receipt (${cur})`, num: true }, { key: 'credit', label: `Payment (${cur})`, num: true }]
    : [{ key: 'date', label: 'Date' }, { key: 'vno', label: 'Voucher No' }, { key: 'category', label: 'Type' }, { key: 'particulars', label: 'Particulars' }, { key: 'debit', label: `Receipt (${cur})`, num: true }, { key: 'credit', label: `Payment (${cur})`, num: true }, { key: 'running', label: `Balance (${cur})`, num: true }];
  const printRows = rowsFull.map((r) => ({ ...r, debit: nfmt(r.debit), credit: nfmt(r.credit), running: nfmt(r.running) }));
  const totalRow = { date: 'CLOSING', vno: '', particulars: '', debit: nfmt(receipts), credit: nfmt(payments), running: nfmt(closing) };
  const sub = `${selected || 'Cash account'} · ${branchLabel(branch)} · ${rowsFull.length} entries · Closing ${money(cur, closing)}`;
  const exportNow = () => rowsFull.length && exportToExcel(`cash-book-${branchLabel(branch)}`, expColumns, rowsFull);
  const printNow = () => rowsFull.length && openReportPrint(`Cash Book — ${selected}`, sub, expColumns, printRows, totalRow);

  const colCount = view === 'detailed' ? 7 : 5;
  const summary = [
    { l: 'Opening Balance', v: money(cur, Math.abs(periodOpen)) + (periodOpen < 0 ? ' Cr' : ''), c: BLUE, bg: '#E6F1FB' },
    { l: 'Total Receipts (Dr)', v: money(cur, receipts), c: GREEN, bg: '#EAF3DE' },
    { l: 'Total Payments (Cr)', v: money(cur, payments), c: RED, bg: '#FCEBEB' },
    { l: 'Closing Balance', v: money(cur, Math.abs(closing)) + (closing < 0 ? ' Cr' : ''), c: closing >= 0 ? GREEN : RED, bg: closing >= 0 ? '#EAF3DE' : '#FCEBEB' },
    { l: 'Entries', v: String(rowsFull.length), c: '#384677', bg: '#f3f4f8' },
  ];

  return (
    <Page
      wide={view === 'detailed'}
      title="Cash Book"
      sub={sub}
      right={<>
        <select value={selected} onChange={(e) => { setLedger(e.target.value); setPage(0); }} style={{ ...inp, width: 200, minHeight: 32, fontSize: 11, cursor: 'pointer' }}>
          {cashLedgers.length === 0 && <option value="">No cash ledger</option>}
          {cashLedgers.map((l) => <option key={l.code || l.name} value={l.name}>{l.name}</option>)}
        </select>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Particulars / voucher…" />
        <ModeToggle view={view} setView={setView} modes={[{ id: 'detailed', label: 'Detailed' }, { id: 'minimal', label: 'Minimal' }]} />
        <RangeBar from={from} to={to} setFrom={setFrom} setTo={setTo} onChange={() => setPage(0)} full branch={branch} />
        <ExportBtn onClick={exportNow} disabled={!rowsFull.length} />
        <PrintBtn onClick={printNow} disabled={!rowsFull.length} />
      </>}
    >
      {!chart.isLoading && cashLedgers.length === 0 && <Banner tone="info">No ledger found under the “Cash-in-Hand” group yet. Cash receipts/payments will appear here once posted.</Banner>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 14 }}>
        {summary.map((k, i) => (
          <div key={i} style={{ ...card, borderTop: `3px solid ${k.c}`, padding: '10px 12px', background: k.bg }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: k.c, textTransform: 'uppercase' }}>{k.l}</p>
            <p style={{ margin: '3px 0 0', fontSize: 17, fontWeight: 800, color: DARK }}>{k.v}</p>
          </div>
        ))}
      </div>
      <State q={q} empty={!selected ? false : rowsFull.length === 0}>
        <Table>
          <thead><tr style={headRow}>
            <Th>Date</Th><Th>Voucher</Th>
            {view === 'detailed' && <Th>Type</Th>}
            <Th>Particulars</Th><Th right>Receipt (Dr)</Th><Th right>Payment (Cr)</Th>
            {view === 'detailed' && <Th right>Balance</Th>}
          </tr></thead>
          <tbody>
            {page === 0 && !term && (
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f8' }}>
                <td colSpan={colCount - 1} style={{ padding: '8px 12px', fontWeight: 700, color: BLUE }}>Opening Balance b/d</td>
                <td style={{ padding: '8px 12px', ...num, fontWeight: 700 }}>{money(cur, Math.abs(periodOpen))} {periodOpen < 0 ? 'Cr' : 'Dr'}</td>
              </tr>
            )}
            {pageRows.map((r, i) => (
              <tr key={r.vno + '-' + i} title={r.voucherId ? 'Open voucher' : ''} onClick={() => r.voucherId && setVoucher({ id: r.voucherId, vno: r.vno })} style={{ ...rowBg(i), background: r.debit > 0 ? '#f4fbf4' : (i % 2 === 0 ? '#fff' : '#fafafa'), cursor: r.voucherId ? 'pointer' : 'default' }}>
                <td style={{ padding: '7px 12px', color: DIM, whiteSpace: 'nowrap' }}>{r.date}</td>
                <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 10, color: BLUE, whiteSpace: 'nowrap' }}>{r.vno}</td>
                {view === 'detailed' && <td style={{ padding: '7px 12px' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 700, background: (TYPE_CLR[r.category] || '#384677') + '22', color: TYPE_CLR[r.category] || '#384677' }}>{r.category || '—'}</span></td>}
                <td style={{ padding: '7px 12px', maxWidth: 360 }}><NarrationCell text={r.particulars} /></td>
                <td style={{ padding: '7px 12px', ...num, fontWeight: 600, color: r.debit > 0 ? GREEN : '#dfe2ee' }}>{money(cur, r.debit)}</td>
                <td style={{ padding: '7px 12px', ...num, fontWeight: 600, color: r.credit > 0 ? RED : '#dfe2ee' }}>{money(cur, r.credit)}</td>
                {view === 'detailed' && <td style={{ padding: '7px 12px', ...num, fontWeight: 700, color: r.running >= 0 ? DARK : RED }}>{money(cur, Math.abs(r.running))} {r.running < 0 ? 'Cr' : ''}</td>}
              </tr>
            ))}
          </tbody>
          <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
            <td colSpan={view === 'detailed' ? 4 : 3} style={{ padding: '9px 12px', fontWeight: 700, color: GOLD, fontSize: 12 }}>CLOSING BALANCE</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#5ab84b' }}>{money(cur, receipts)}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#F7C1C1' }}>{money(cur, payments)}</td>
            {view === 'detailed' && <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, Math.abs(closing))} {closing < 0 ? 'Cr' : 'Dr'}</td>}
          </tr></tfoot>
        </Table>
        <Pagination total={rowsShown.length} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} unit="entries" />
      </State>
      {closing < 0 && <Banner tone="err">⚠ Cash book shows a negative (credit) balance. Verify all entries — a physical cash count is required.</Banner>}
      {voucher && (
        <div onClick={() => setVoucher(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.5)', zIndex: 800, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '4vh 2vw' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 'min(840px, 96vw)', maxHeight: '92vh', overflowY: 'auto', padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #e5e9f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <Crumb items={[{ label: selected || 'Cash Book', onClick: () => setVoucher(null) }, { label: voucher.vno }]} />
              <button onClick={() => setVoucher(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 18, flexShrink: 0 }}>✕</button>
            </div>
            <VoucherEditor voucherId={voucher.id} cur={cur} onBack={() => setVoucher(null)} />
          </div>
        </div>
      )}
    </Page>
  );
}
