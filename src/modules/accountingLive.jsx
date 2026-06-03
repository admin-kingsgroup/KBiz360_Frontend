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
import {
  useTrialBalance, useProfitAndLoss, useBalanceSheet, useDayBook,
  useLedgerStatement, useLedgerGroups, useChartOfAccounts,
  useSalesRegister, usePurchaseRegister, useInvoiceGP,
  useVoucher, useUpdateVoucher, useCostCenters,
} from '../core/useAccounting';

const DARK = '#0d1326', GOLD = '#d4a437', DIM = '#5a6691', BLUE = '#185FA5', RED = '#A32D2D', GREEN = '#27500A';
const curOf = (branch) => bc(branch).cur;
const money = (cur, n) => { const v = Math.round(Number(n) || 0); return v ? cur + v.toLocaleString('en-IN') : '—'; };
const branchLabel = (branch) => (!branch || branch === 'ALL' ? 'All branches' : (branch.code || branch));

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

// From/to date inputs with quick presets. Defaults to the current month.
function DateRange({ from, to, setFrom, setTo }) {
  const Preset = ({ label, f, t }) => (
    <button onClick={() => { setFrom(f); setTo(t); }} style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 10.5, cursor: 'pointer', fontWeight: 700, color: DIM }}>{label}</button>
  );
  return (
    <>
      <Preset label="This Month" f={monthStartISO()} t={todayISO()} />
      <Preset label="All" f="" t="" />
      <DateInput value={from} onChange={(e) => setFrom(e.target.value)} />
      <span style={{ lineHeight: '32px', color: DIM, fontSize: 11 }}>to</span>
      <DateInput value={to} onChange={(e) => setTo(e.target.value)} />
    </>
  );
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
function VoucherLines({ voucher: v, cur }) {
  if (!v) return null;
  const F = ({ label, val }) => (
    <div style={{ minWidth: 110 }}>
      <div style={{ fontSize: 9, color: DIM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
      <div style={{ fontSize: 12, color: DARK, fontWeight: 600 }}>{val || '—'}</div>
    </div>
  );
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 12 }}>
        <F label="Voucher" val={v.vno} /><F label="Date" val={v.date} /><F label="Branch" val={v.branch} />
        <F label={v.category === 'purchase' ? 'Supplier' : 'Customer'} val={v.party} />
        <F label="Link No" val={v.linkNo} /><F label="Taxable" val={money(cur, v.subtotal)} />
        <F label="GST" val={money(cur, v.taxAmt)} /><F label="Total" val={money(cur, v.total)} />
      </div>
      {(v.lines || []).map((ln, i) => {
        const meta = ln.meta && typeof ln.meta === 'object' ? ln.meta : {};
        const entries = Object.entries(meta).filter(([, val]) => val !== '' && val != null);
        return (
          <div key={i} style={{ ...card, padding: 12, marginBottom: 10, boxShadow: 'none', border: '1px solid #eef1f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: entries.length ? 8 : 0 }}>
              <span style={{ fontWeight: 700, color: DARK, fontSize: 12.5 }}>{ln.ledger || `Line ${i + 1}`}</span>
              <span style={{ fontWeight: 700, color: BLUE, fontVariantNumeric: 'tabular-nums' }}>{money(cur, ln.amt)}</span>
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
      })}
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
  SF: 'Tickets', PF: 'Tickets', SHT: 'Hotel', PHT: 'Hotel', SH: 'Holiday', PH: 'Holiday',
  SV: 'Visa', PV: 'Visa', SI: 'Insurance', PI: 'Insurance', SC: 'Car', PC: 'Car', SM: 'Misc', PM: 'Misc',
  SCN: 'Credit Note', SDN: 'Debit Note',
};
const productOf = (v) => PRODUCT[v.type] || v.type;

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

/* ════════════════════ TRIAL BALANCE ════════════════════════════════ */
export function TrialBalanceLive({ branch }) {
  const cur = curOf(branch);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const q = useTrialBalance(branch, { from, to });
  const rows = q.data?.rows || [];
  const totDr = q.data?.totalDebit || 0, totCr = q.data?.totalCredit || 0;
  const balanced = q.data ? q.data.balanced : true;
  const groups = useMemo(() => [...new Set(rows.map((r) => r.group))], [rows]);

  return (
    <Page
      title="Trial Balance"
      sub={`${branchLabel(branch)} · ${rows.length} ledgers · Dr ${money(cur, totDr)} / Cr ${money(cur, totCr)}`}
      right={<>
        <span style={{ lineHeight: '32px', fontSize: 11, color: DIM }}>From</span>
        <DateInput value={from} onChange={(e) => setFrom(e.target.value)} />
        <span style={{ lineHeight: '32px', fontSize: 11, color: DIM }}>to</span>
        <DateInput value={to} onChange={(e) => setTo(e.target.value)} />
      </>}
    >
      {q.data && (balanced
        ? <Banner tone="ok">✔ Trial Balance tallied — Dr {money(cur, totDr)} = Cr {money(cur, totCr)}</Banner>
        : <Banner tone="err">⚠ Out of balance — Dr {money(cur, totDr)} ≠ Cr {money(cur, totCr)}</Banner>)}
      <State q={q} empty={rows.length === 0}>
        <Table>
          <thead><tr style={headRow}><Th>Group</Th><Th>Ledger Account</Th><Th right>Debit ({cur})</Th><Th right>Credit ({cur})</Th></tr></thead>
          <tbody>
            {groups.map((grp) => {
              const gl = rows.filter((r) => r.group === grp);
              return gl.map((l, i) => (
                <tr key={(l.code || '') + l.ledger} style={rowBg(i)}>
                  {i === 0 && <td rowSpan={gl.length} style={{ padding: '9px 14px', fontWeight: 700, color: DARK, borderRight: '2px solid #e1e3ec', verticalAlign: 'top', fontSize: 10.5, background: '#f9fafb' }}>{grp}</td>}
                  <td style={{ padding: '9px 14px', color: '#384677' }}>{l.ledger}{l.code ? <span style={{ color: '#b9bed4', fontSize: 9.5, marginLeft: 6 }}>{l.code}</span> : null}</td>
                  <td style={{ padding: '9px 14px', ...num, color: l.debit > 0 ? DARK : '#bfc3d6' }}>{money(cur, l.debit)}</td>
                  <td style={{ padding: '9px 14px', ...num, color: l.credit > 0 ? DARK : '#bfc3d6' }}>{money(cur, l.credit)}</td>
                </tr>
              ));
            })}
          </tbody>
          <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
            <td colSpan={2} style={{ padding: '10px 14px', fontWeight: 700, color: GOLD, fontSize: 12 }}>TOTAL</td>
            <td style={{ padding: '10px 14px', ...num, fontWeight: 800, color: '#fff', fontSize: 13 }}>{money(cur, totDr)}</td>
            <td style={{ padding: '10px 14px', ...num, fontWeight: 800, color: GOLD, fontSize: 13 }}>{money(cur, totCr)}</td>
          </tr></tfoot>
        </Table>
      </State>
    </Page>
  );
}

/* ════════════════════ DAY BOOK ═════════════════════════════════════ */
export function DayBookLive({ branch }) {
  const cur = curOf(branch);
  const [date, setDate] = useState('');
  const range = date ? { from: date, to: date } : {};
  const q = useDayBook(branch, range);
  const journals = q.data || [];
  const totDr = journals.reduce((s, j) => s + (j.totalDebit || 0), 0);
  const totCr = journals.reduce((s, j) => s + (j.totalCredit || 0), 0);
  const TYPE_CLR = { sale: BLUE, purchase: '#854F0B', receipt: GREEN, payment: RED, journal: '#384677', contra: '#6b21a8', 'credit-note': RED, 'debit-note': '#854F0B' };

  return (
    <Page
      title="Day Book"
      sub={`${branchLabel(branch)} · ${journals.length} vouchers · Dr ${money(cur, totDr)} = Cr ${money(cur, totCr)}`}
      right={<>
        <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
        {date && <button onClick={() => setDate('')} style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, cursor: 'pointer' }}>All dates</button>}
      </>}
    >
      <State q={q} empty={journals.length === 0}>
        <Table>
          <thead><tr style={headRow}>
            <Th>Date</Th><Th>Voucher</Th><Th>Type</Th><Th>Ledger Account</Th><Th right>Dr</Th><Th right>Cr</Th>
          </tr></thead>
          <tbody>
            {journals.map((j) => j.postings.map((p, pi) => (
              <tr key={j.vno + '-' + pi} style={{ borderBottom: pi === j.postings.length - 1 ? '1px solid #e1e3ec' : '1px solid #f6f7fa', background: '#fff' }}>
                {pi === 0 && <td rowSpan={j.postings.length} style={{ padding: '8px 12px', color: DIM, whiteSpace: 'nowrap', verticalAlign: 'top', borderRight: '1px solid #f3f4f8' }}>{j.date}</td>}
                {pi === 0 && <td rowSpan={j.postings.length} style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, color: BLUE, verticalAlign: 'top' }}>{j.vno}</td>}
                {pi === 0 && <td rowSpan={j.postings.length} style={{ padding: '8px 12px', verticalAlign: 'top' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 700, background: (TYPE_CLR[j.category] || '#384677') + '22', color: TYPE_CLR[j.category] || '#384677' }}>{j.category}</span></td>}
                <td style={{ padding: '6px 12px', color: '#0d1326', paddingLeft: p.debit > 0 ? 12 : 28 }}>{p.ledger}<span style={{ color: '#b9bed4', fontSize: 9.5, marginLeft: 6 }}>{p.group}</span></td>
                <td style={{ padding: '6px 12px', ...num, color: p.debit > 0 ? BLUE : '#dfe2ee' }}>{money(cur, p.debit)}</td>
                <td style={{ padding: '6px 12px', ...num, color: p.credit > 0 ? RED : '#dfe2ee' }}>{money(cur, p.credit)}</td>
              </tr>
            )))}
          </tbody>
          <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
            <td colSpan={4} style={{ padding: '9px 12px', fontWeight: 700, color: GOLD, fontSize: 12 }}>TOTAL — {journals.length} vouchers</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, totDr)}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{money(cur, totCr)}</td>
          </tr></tfoot>
        </Table>
      </State>
    </Page>
  );
}

/* ════════════════════ LEDGER ACCOUNT ═══════════════════════════════ */
export function LedgerAcLive({ branch }) {
  const cur = curOf(branch);
  const chart = useChartOfAccounts(branch);
  const ledgers = chart.data || [];
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const selected = name || ledgers[0]?.name || '';
  const q = useLedgerStatement(selected, branch, { from, to });
  const d = q.data;

  return (
    <Page
      title="Ledger Account"
      sub={d ? `${d.ledger} · ${d.group || ''} · ${d.lines?.length || 0} entries` : selected}
      right={<>
        <select value={selected} onChange={(e) => setName(e.target.value)} style={{ ...inp, width: 220, minHeight: 32, fontSize: 11 }}>
          {ledgers.length === 0 && <option>Loading…</option>}
          {ledgers.map((l) => <option key={l.code || l.name} value={l.name}>{l.name}</option>)}
        </select>
        <DateInput value={from} onChange={(e) => setFrom(e.target.value)} />
        <span style={{ lineHeight: '32px', color: DIM, fontSize: 11 }}>to</span>
        <DateInput value={to} onChange={(e) => setTo(e.target.value)} />
      </>}
    >
      <State q={q} empty={!d}>
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: '#f3f4f8', borderBottom: '1px solid #e1e3ec', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: DIM }}>Opening: {money(cur, d?.openingBalance)} {d?.openingSide}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: d?.closingSide === 'Cr' ? RED : BLUE }}>Closing: {money(cur, d?.closingBalance)} {d?.closingSide}</span>
          </div>
          <div className="kb-sticky" style={{ '--stick-head': DARK, '--stick-foot': DARK, maxHeight: 'calc(100vh - 250px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead><tr style={headRow}><Th>Date</Th><Th>Voucher</Th><Th>Particulars</Th><Th right>Dr</Th><Th right>Cr</Th><Th right>Balance</Th></tr></thead>
            <tbody>
              {(d?.lines || []).length === 0 && <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: DIM }}>No postings in range.</td></tr>}
              {(d?.lines || []).map((e, i) => (
                <tr key={i} style={rowBg(i)}>
                  <td style={{ padding: '8px 12px', color: DIM, whiteSpace: 'nowrap' }}>{e.date}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, color: BLUE }}>{e.vno}</td>
                  <td style={{ padding: '8px 12px', color: '#384677' }}>{e.narration || e.party || e.category}</td>
                  <td style={{ padding: '8px 12px', ...num, color: e.debit > 0 ? BLUE : '#dfe2ee' }}>{money(cur, e.debit)}</td>
                  <td style={{ padding: '8px 12px', ...num, color: e.credit > 0 ? RED : '#dfe2ee' }}>{money(cur, e.credit)}</td>
                  <td style={{ padding: '8px 12px', ...num, fontWeight: 700, color: e.balanceSide === 'Cr' ? RED : BLUE }}>{money(cur, Math.abs(e.balance))} {e.balanceSide}</td>
                </tr>
              ))}
            </tbody>
            {d && <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
              <td colSpan={3} style={{ padding: '9px 12px', fontWeight: 700, color: GOLD }}>CLOSING — {d.ledger}</td>
              <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, d.totalDebit)}</td>
              <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{money(cur, d.totalCredit)}</td>
              <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, d.closingBalance)} {d.closingSide}</td>
            </tr></tfoot>}
          </table>
          </div>
        </div>
      </State>
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
export function VoucherEditor({ voucherId, cur, onBack }) {
  const vq = useVoucher(voucherId);
  const upd = useUpdateVoucher();
  const ccq = useCostCenters();
  const v = vq.data;
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (v) { setForm({ date: v.date || '', branch: v.branch || '', party: v.party || '', subtotal: v.subtotal ?? 0, taxAmt: v.taxAmt ?? 0, linkNo: v.linkNo || '', costCenter: v.costCenter || '', remarks: v.remarks || '' }); setMsg(''); }
  }, [v]);
  if (vq.isLoading || !form) return <div style={{ padding: 24, textAlign: 'center', color: DIM }}>Loading voucher…</div>;
  if (vq.isError) return <div style={{ padding: 16, color: RED }}>⚠ {vq.error?.message}</div>;
  const set = (k, val) => setForm((f) => ({ ...f, [k]: val }));
  const total = r2((Number(form.subtotal) || 0) + (Number(form.taxAmt) || 0));
  const save = () => {
    setMsg('');
    const lines = (v.lines && v.lines.length === 1) ? [{ ...v.lines[0], amt: Number(form.subtotal) || 0 }] : v.lines;
    const body = { ...v, ...form, subtotal: Number(form.subtotal) || 0, taxAmt: Number(form.taxAmt) || 0, total, lines, status: v.status || 'saved' };
    delete body.id; delete body.createdAt; delete body.updatedAt;
    upd.mutate({ id: voucherId, body }, { onSuccess: () => setMsg('saved'), onError: (e) => setMsg('err:' + e.message) });
  };
  const Field = ({ label, k, type = 'text' }) => (
    <div>
      <div style={{ fontSize: 10, color: DIM, fontWeight: 700, marginBottom: 3 }}>{label}</div>
      <input type={type} value={form[k]} onChange={(e) => set(k, e.target.value)} style={{ ...inp, fontSize: 12.5 }} />
    </div>
  );
  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 800, color: DARK, fontSize: 14 }}>{v.vno} <span style={{ fontSize: 10, color: DIM, fontWeight: 600 }}>{v.type} · {v.category}</span></div>
        <button onClick={onBack} style={{ ...inp, width: 'auto', minHeight: 34, fontSize: 11.5, cursor: 'pointer' }}>← Back</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 10 }}>
        <Field label="Date" k="date" /><Field label="Branch" k="branch" />
        <Field label={v.category === 'purchase' ? 'Supplier' : 'Customer'} k="party" />
        <Field label="Link No" k="linkNo" />
        {(v.category === 'sale' || v.category === 'purchase') && (
          <div>
            <div style={{ fontSize: 10, color: DIM, fontWeight: 700, marginBottom: 3 }}>Cost Centre (module)</div>
            <select value={form.costCenter || ''} onChange={(e) => set('costCenter', e.target.value)} style={{ ...inp, fontSize: 12.5, cursor: 'pointer' }}>
              <option value="">— Unspecified —</option>
              {(ccq.data?.costCenters || []).map((c) => <option key={c.code} value={c.code}>{c.module} · {c.name}</option>)}
            </select>
          </div>
        )}
        <Field label="Taxable" k="subtotal" type="number" /><Field label="GST" k="taxAmt" type="number" />
        <div><div style={{ fontSize: 10, color: DIM, fontWeight: 700, marginBottom: 3 }}>Total (auto)</div><div style={{ ...inp, fontSize: 12.5, background: '#f3f5f9', color: DARK, fontWeight: 700 }}>{money(cur, total)}</div></div>
        <Field label="Remarks" k="remarks" />
      </div>
      {(v.lines || []).map((ln, i) => {
        const meta = ln.meta && typeof ln.meta === 'object' ? ln.meta : {};
        const ent = Object.entries(meta).filter(([, x]) => x !== '' && x != null);
        return (
          <div key={i} style={{ ...card, padding: 10, marginTop: 10, boxShadow: 'none', border: '1px solid #eef1f6' }}>
            <div style={{ fontWeight: 700, color: DARK, fontSize: 12 }}>{ln.ledger} · {money(cur, ln.amt)}</div>
            {ent.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '3px 12px', marginTop: 6 }}>{ent.map(([k, x]) => <div key={k} style={{ fontSize: 10.5 }}><span style={{ color: DIM }}>{k}: </span><span style={{ color: DARK }}>{String(x)}</span></div>)}</div>}
          </div>
        );
      })}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
        <button disabled={upd.isPending} onClick={save} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: GREEN, color: '#fff' }}>{upd.isPending ? 'Saving…' : 'Save'}</button>
        {msg === 'saved' && <span style={{ color: GREEN, fontSize: 12, fontWeight: 700 }}>✓ Saved &amp; re-posted</span>}
        {msg.startsWith('err:') && <span style={{ color: RED, fontSize: 11.5 }}>⚠ {msg.slice(4)}</span>}
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

        {voucher && <VoucherEditor voucherId={voucher.id} cur={cur} onBack={() => setVoucher(null)} />}

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
            {groupLedgers.map((r, i) => (
              <div key={i} style={tapRow} onClick={() => setLedger(r.ledger)}>
                <span style={{ fontSize: 12.5, color: DARK, fontWeight: 600 }}>{r.ledger}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: r.debit ? BLUE : RED, whiteSpace: 'nowrap' }}>{money(cur, r.debit || r.credit)} {r.debit ? 'Dr' : 'Cr'}</span>
              </div>
            ))}
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
        <DateInput value={from} onChange={(e) => setFrom(e.target.value)} />
        <span style={{ lineHeight: '32px', color: DIM, fontSize: 11 }}>to</span>
        <DateInput value={to} onChange={(e) => setTo(e.target.value)} />
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

export function RegisterLive({ branch, initial = 'sales' }) {
  const cur = curOf(branch);
  const [tab, setTab] = useState(initial === 'purchase' ? 'purchase' : 'sales'); // sales | purchase
  const [view, setView] = useState('summary'); // summary | detailed
  const [product, setProduct] = useState('all');
  const [from, setFrom] = useState(monthStartISO);
  const [to, setTo] = useState(todayISO);
  const [detail, setDetail] = useState(null);
  // Fetch all (date filtering is done client-side because Tally dates are mixed-format strings).
  const sales = useSalesRegister(branch);
  const purch = usePurchaseRegister(branch);
  const q = tab === 'sales' ? sales : purch;
  const allRows = q.data || [];
  const products = useMemo(() => [...new Set(allRows.map(productOf))].sort(), [allRows]);
  const rows = useMemo(() => allRows
    .filter((v) => product === 'all' || productOf(v) === product)
    .filter((v) => dateInRange(v.date, from, to)), [allRows, product, from, to]);
  const sum = (k) => rows.reduce((s, v) => s + (v[k] || 0), 0);
  const sheet = useMemo(() => vouchersToSheet(rows), [rows]);
  const exportNow = () => {
    if (!rows.length) return;
    exportToExcel(`${tab}-register-${product === 'all' ? 'all' : product}-${branchLabel(branch)}`, sheet.columns, sheet.rows);
  };
  const Tab = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, cursor: 'pointer', fontWeight: 700, background: tab === id ? DARK : '#fff', color: tab === id ? GOLD : DIM, borderColor: tab === id ? DARK : '#e1e3ec' }}>{label}</button>
  );
  return (
    <Page
      wide={view === 'detailed'}
      title={tab === 'sales' ? 'Sales Register' : 'Purchase Register'}
      sub={`${branchLabel(branch)} · ${rows.length} vouchers · Total ${money(cur, sum('total'))} · ${view === 'detailed' ? 'every Tally column shown — scroll right' : 'click a row for full detail'}`}
      right={<>
        <Tab id="sales" label="Sales" /><Tab id="purchase" label="Purchase" />
        <select value={product} onChange={(e) => setProduct(e.target.value)} style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, cursor: 'pointer' }}>
          <option value="all">All products</option>
          {products.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <ViewToggle view={view} setView={setView} />
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <ExportBtn onClick={exportNow} disabled={!rows.length} />
      </>}
    >
      <State q={q} empty={rows.length === 0}>
        {view === 'detailed' ? (
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
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, color: BLUE }}>{v.vno}</td>
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
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
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
    <Page title="Ledger Groups — Tally's 28 Pre-Defined Groups" sub="Every ledger belongs to one of these groups; the group fixes whether it lands in the Balance Sheet or P&L.">
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
    <Page title="Chart of Accounts" sub={`${branchLabel(branch)} · ${ledgers.length} ledgers across ${groups.length} groups`}>
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
                  <td style={{ padding: '9px 14px', fontWeight: 600, color: DARK }}>{l.name}</td>
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
