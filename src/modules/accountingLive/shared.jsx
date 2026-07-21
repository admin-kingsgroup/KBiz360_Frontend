/* ════════════════════════════════════════════════════════════════════
   ACCOUNTINGLIVE — SHARED UI KIT
   Extracted from legacy.jsx (business sub-module reorg, 2026-07-13): the
   common page scaffold, table chrome, date/format helpers and register
   pivot-column building blocks used by BOTH the screens that moved to
   modules/accounts/ (DayBookLive, LedgerAcLive, CashBookLive, RegisterLive)
   and the screens that stayed here (VoucherEditor, ReportPnLLive, ReportBSLive,
   InvoiceGPLive, buildCaptureSheet) — so neither side needs a duplicate copy.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { card, inp, bc } from '../../core/styles';
import { localeOf, activeCurrency } from '../../core/format';
import { toast } from '../../core/ux/toast';
import { CONSOLIDATED_LABEL } from '../../core/data';
import { PeriodBar } from '../../core/period';
import { usePager, Pager } from '../../core/ux/pager';
import { PageLayout } from '../../shell/PageLayout';
import { SkeletonTable } from '../../shell/primitives';

export const DARK = '#1a1c22', GOLD = '#c2a04a', DIM = '#5b616e', BLUE = '#2563eb', RED = '#dc2626', GREEN = '#16a34a';
export const curOf = (branch) => bc(branch).cur;
export const money = (cur, n) => { const v = Math.round(Number(n) || 0); return v ? cur + v.toLocaleString(localeOf(cur)) : '—'; };
export const branchLabel = (branch) => (!branch || branch === 'ALL' ? CONSOLIDATED_LABEL : (branch.code || branch));

/* ── shared chrome ──────────────────────────────────────────────────── */
// Premium page scaffold — uses the shared PageLayout (breadcrumb · title ·
// wrapping actions · responsive padding) so every accounting screen matches the
// rest of KBiz360 Pro. `wide` drops the max-width for the full-bleed registers.
export function Page({ title, sub, right, children, wide }) {
  return (
    <PageLayout title={title} subtitle={sub} actions={right} maxWidth={wide ? 'max-w-none' : 'mx-auto max-w-[1200px]'}>
      {children}
    </PageLayout>
  );
}

// ── tolerant date handling ─────────────────────────────────────────────────
// Tally-imported voucher dates arrive as mixed strings ("16-Mar-26",
// "06-12-2025", "23-02-2026", ISO). Parse them all so the filter actually works.
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
export function parseAnyDate(s) {
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
export function dateInRange(value, fromISO, toISO) {
  const d = parseAnyDate(value); if (!d) return true;
  const f = parseAnyDate(fromISO); if (f && d < f) return false;
  const t = parseAnyDate(toISO); if (t && d > t) return false;
  return true;
}
export const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const monthStartISO = () => { const t = new Date(); return isoDate(new Date(t.getFullYear(), t.getMonth(), 1)); };
export const todayISO = () => isoDate(new Date());

export function Banner({ tone = 'info', children }) {
  const T = {
    ok: { bg: '#e8f6ed', bd: '#bfe6cd', c: GREEN },
    err: { bg: '#fbe9e9', bd: '#f3c9c9', c: RED },
    info: { bg: '#e8f0ff', bd: '#cfe0f8', c: BLUE },
  }[tone] || { bg: '#e8f0ff', bd: '#cfe0f8', c: BLUE };
  return <div style={{ marginBottom: 10, padding: '8px 14px', borderRadius: 8, background: T.bg, border: `1px solid ${T.bd}`, fontSize: 10.5, color: T.c, fontWeight: 600 }}>{children}</div>;
}

export function State({ q, empty, children }) {
  // Premium loading skeleton from the shared foundation (no card-in-card).
  if (q.isLoading) return <SkeletonTable rows={8} cols={6} />;
  if (q.isError) return (
    <Banner tone="err">
      <span style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        ⚠ {q.error?.message || 'Failed to load from backend'}
        {q.refetch && (
          <button onClick={() => { toast('Retrying…', 'info'); q.refetch(); }} className="max-tablet:min-h-[44px]"
            style={{ ...inp, width: 'auto', minHeight: 28, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: RED, borderColor: RED, background: '#fff' }}>↻ Retry</button>
        )}
      </span>
    </Banner>
  );
  if (empty) return <div style={{ ...card, padding: 28, textAlign: 'center', color: DIM, fontSize: 12 }}>No data for this selection.</div>;
  return children;
}

// "Export to Excel" button — CSV that opens straight into Excel columns.
export function ExportBtn({ onClick, disabled, label = 'Export to Excel' }) {
  // User-triggered action → confirm with a toast (and surface any failure).
  const handle = () => { try { onClick && onClick(); toast('Downloading Excel export…', 'success'); } catch (e) { toast('Export failed: ' + (e?.message || e), 'error'); } };
  return (
    <button onClick={handle} disabled={disabled} className="max-tablet:min-h-[44px]"
      style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        background: GREEN, color: '#fff', borderColor: GREEN }}
      title="Download all rows with the full bifurcation as a CSV that opens in Excel">
      ⬇ {label}
    </button>
  );
}

export const Table = ({ children, maxHeight, pager }) => (
  <div className="kb-sticky" style={{ ...card, padding: 0, '--stick-head': DARK, '--stick-foot': DARK, ...(maxHeight ? { maxHeight } : null) }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>{children}</table>
    {/* infinite-scroll sentinel lives INSIDE this scroll box so it only fires at the bottom */}
    {pager && <Pager pager={pager} />}
  </div>
);
export const Th = ({ children, right }) => (
  <th style={{ padding: '9px 14px', textAlign: right ? 'right' : 'left', color: GOLD, fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}>{children}</th>
);
export const headRow = { background: DARK };
export const rowBg = (i) => ({ borderBottom: '1px solid #dfe2e7', background: i % 2 === 0 ? '#fff' : '#fafafa' });
export const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

// Voucher type → product bucket (for the register's product filter).
export const PRODUCT = {
  SF: 'Flight', PF: 'Flight', SHT: 'Hotel', PHT: 'Hotel', SH: 'Holiday', PH: 'Holiday',
  SV: 'Visa', PV: 'Visa', SI: 'Insurance', PI: 'Insurance', SC: 'Car', PC: 'Car', SM: 'Misc', PM: 'Misc',
  SDN: 'Debit Note', RF: 'Refund', RI: 'Reissue',
};
export const productOf = (v) => PRODUCT[v.type] || v.type;
export const MODULE_ORDER = ['Flight', 'Hotel', 'Holiday', 'Visa', 'Insurance', 'Car', 'Misc', 'Refund', 'Reissue'];

// Voucher category → colour tag (Day Book / Cash Book category chips).
export const TYPE_CLR = { sale: BLUE, purchase: '#d97706', receipt: GREEN, payment: RED, journal: '#2e323c', contra: '#6b21a8', 'debit-note': '#d97706' };

export function cellFmt(v) {
  if (v == null || v === '') return { text: '', num: false };
  const s = String(v).trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return { text: Number(s).toLocaleString(localeOf(activeCurrency()), { maximumFractionDigits: 2 }), num: true };
  return { text: String(v), num: false };
}

export function DetailedTable({ columns, rows }) {
  const topRef = React.useRef(null);
  const bodyRef = React.useRef(null);
  const [scrollW, setScrollW] = useState(0);
  React.useEffect(() => {
    const measure = () => { if (bodyRef.current) setScrollW(bodyRef.current.scrollWidth); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [columns, rows]);
  const fromTop = () => { if (bodyRef.current && topRef.current) bodyRef.current.scrollLeft = topRef.current.scrollLeft; };
  const fromBody = () => { if (bodyRef.current && topRef.current) topRef.current.scrollLeft = bodyRef.current.scrollLeft; };
  // Page the rows so the DOM stays bounded; Excel export still runs over the full set.
  const pg = usePager(rows);
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      {/* mirrored top scrollbar */}
      <div ref={topRef} onScroll={fromTop} style={{ overflowX: 'auto', overflowY: 'hidden', height: 14, borderBottom: '1px solid #dfe2e7' }}>
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
            {pg.pageRows.map((r, i) => (
              <tr key={i} style={rowBg(i)}>
                {columns.map((c) => {
                  const f = cellFmt(r[c.key]);
                  return <td key={c.key} style={{ padding: '7px 12px', whiteSpace: 'nowrap', color: DARK, textAlign: f.num ? 'right' : 'left', fontVariantNumeric: f.num ? 'tabular-nums' : 'normal' }}>{f.text || '—'}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {/* sentinel lives INSIDE the scroll box so it only fires at the bottom */}
        <Pager pager={pg} />
      </div>
    </div>
  );
}

export function ModeToggle({ view, setView, modes }) {
  return <>{modes.map((m) => (
    <button key={m.id} onClick={() => setView(m.id)} className="max-tablet:min-h-[44px]" style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, cursor: 'pointer', fontWeight: 700, background: view === m.id ? DARK : '#fff', color: view === m.id ? GOLD : DIM, borderColor: view === m.id ? DARK : '#cdd1d8' }}>{m.label}</button>
  ))}</>;
}

export function RangeBar({ from, to, setFrom, setTo, onChange, full, branch }) {
  return <PeriodBar branch={branch} compact defaultPreset="all" onChange={(r) => { setFrom(r.from); setTo(r.to); onChange && onChange(); }} />;
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <span className="max-tablet:w-full" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="max-tablet:w-full max-tablet:min-h-[44px]"
        style={{ ...inp, width: 200, minHeight: 32, fontSize: 11, paddingRight: value ? 26 : 10 }} />
      {value && <button onClick={() => onChange('')} title="Clear" style={{ position: 'absolute', right: 6, background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 14, lineHeight: 1 }}>✕</button>}
    </span>
  );
}

const PAGE_SIZES = [50, 100, 250, 1000];

export function Pagination({ total, page, setPage, pageSize, setPageSize, unit = 'rows' }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= PAGE_SIZES[0]) return null;
  const cur = Math.min(page, pages - 1);
  const Btn = ({ label, to, disabled }) => (
    <button disabled={disabled} onClick={() => setPage(to)} className="max-tablet:min-h-[44px]" style={{ ...inp, width: 'auto', minHeight: 30, fontSize: 11, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, fontWeight: 700, color: DIM }}>{label}</button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: 10, fontSize: 11, color: DIM }}>
      <span>{(cur * pageSize + 1).toLocaleString('en-IN')}–{Math.min((cur + 1) * pageSize, total).toLocaleString('en-IN')} of {total.toLocaleString('en-IN')} {unit}</span>
      <Btn label="« First" to={0} disabled={cur === 0} />
      <Btn label="‹ Prev" to={cur - 1} disabled={cur === 0} />
      <span style={{ fontWeight: 700, color: DARK }}>Page {cur + 1} / {pages}</span>
      <Btn label="Next ›" to={cur + 1} disabled={cur >= pages - 1} />
      <Btn label="Last »" to={pages - 1} disabled={cur >= pages - 1} />
      <select value={pageSize} onChange={(e) => { setPageSize(+e.target.value); setPage(0); }} className="max-tablet:min-h-[44px]" style={{ ...inp, width: 'auto', minHeight: 30, fontSize: 11, cursor: 'pointer' }}>
        {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
      </select>
    </div>
  );
}

// Plain number for export/print (no currency symbol; blank when zero).
export const nfmt = (n, loc = 'en-IN') => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(loc) : ''; };

// Open a print-ready window for the report (Print, or "Save as PDF" in the
// dialog). Builds a clean B/W table from the same columns/rows used for export.
export function openReportPrint(title, sub, columns, rows, totalRow) {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const cell = (c, v) => `<td style="text-align:${c.num ? 'right' : 'left'}">${esc(v)}</td>`;
  const head = columns.map((c) => `<th style="text-align:${c.num ? 'right' : 'left'}">${esc(c.label)}</th>`).join('');
  const body = rows.map((r) => '<tr>' + columns.map((c) => cell(c, r[c.key])).join('') + '</tr>').join('');
  const foot = totalRow ? '<tfoot><tr>' + columns.map((c) => cell(c, totalRow[c.key])).join('') + '</tr></tfoot>' : '';
  const win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) { toast('Please allow pop-ups to Print / Save as PDF.', 'error'); return; }
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#222;padding:14px;margin:0}
    h1{font-size:15pt;margin:0;color:#0d1326} .sub{font-size:9pt;color:#5a6691;margin:2px 0 12px}
    table{width:100%;border-collapse:collapse;font-size:8.5pt}
    th{background:#0d1326;color:#d4a437;padding:6px 8px;border:1px solid #0d1326;white-space:nowrap}
    td{padding:4px 8px;border:1px solid #cdd1d8}
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
  toast('Print view opened — choose your printer or Save as PDF.', 'info');
  setTimeout(() => { try { win.print(); } catch (e) { /* user can print manually */ } }, 400);
}

// "Print / PDF" toolbar button (mirrors ExportBtn styling).
export function PrintBtn({ onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className="max-tablet:min-h-[44px]"
      style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, background: '#fff', color: DARK, borderColor: '#cdd1d8' }}
      title="Open a print view — choose your printer or Save as PDF">🖨 Print / PDF</button>
  );
}

// Breadcrumb trail used by the ledger/voucher drill-down modals on both sides.
export function Crumb({ items }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, fontSize: 12, minWidth: 0 }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {i > 0 && <span style={{ color: '#9197a3' }}>▸</span>}
          {it.onClick
            ? <button onClick={it.onClick} className="inline-flex items-center max-tablet:min-h-[44px]" style={{ background: 'none', border: 'none', cursor: 'pointer', color: BLUE, fontWeight: 600, padding: 0, fontSize: 12 }}>{it.label}</button>
            : <span style={{ color: DARK, fontWeight: 700 }}>{it.label}</span>}
        </span>
      ))}
    </div>
  );
}
