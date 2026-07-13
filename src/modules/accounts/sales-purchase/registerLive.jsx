/* ════════════════════ SALES / PURCHASE REGISTER  /reports/sreg, /reports/preg ════════════════════ */

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Menu as DropdownMenu } from '../../../core/ux/Menu';
import { card, inp } from '../../../core/styles';
import { localeOf } from '../../../core/format';
import { exportToExcel, vouchersToSheet } from '../../../core/exportExcel';
import { voucherHaystack } from '../../../core/registerSearch';
import { printBookingInvoice } from '../../../core/printInvoice';
import { useReportExport } from '../../../core/reportExportContext';
import { clickable } from '../../../core/ux/clickable';
import { usePager, Pager } from '../../../core/ux/pager';
import { PeriodBar } from '../../../core/period';
import { useSalesRegister, usePurchaseRegister, useRefundReissue, useBookingOrders } from '../../../core/useAccounting';
import { apiGet } from '../../../core/api';
import { VoucherLines, buildCaptureSheet } from '../../accountingLive';
import {
  DARK, GOLD, DIM, BLUE, GREEN, curOf, money, branchLabel, Page, State, ExportBtn, DetailedTable,
  Table, Th, headRow, rowBg, num, ModeToggle, dateInRange, parseAnyDate, monthStartISO, todayISO,
  productOf, MODULE_ORDER,
} from '../../accountingLive/shared';

// Uniform period selector (All/Today/Week/MTD/QTD/LFY/CFY + dates, per-branch FY).
function DateRange({ from, to, setFrom, setTo, branch }) {
  return <PeriodBar branch={branch} compact defaultPreset="all" onChange={(r) => { setFrom(r.from); setTo(r.to); }} />;
}

/* Read-only voucher detail — shows every imported field (PNR, ticket, fare
   breakup, etc.) captured on the line `meta`, plus the header + Link No. */
function VoucherDetail({ voucher, cur, onClose }) {
  if (!voucher) return null;
  const v = voucher;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.45)', zIndex: 700, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '6vh' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 660, maxWidth: '94vw', maxHeight: '84vh', overflowY: 'auto', padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderBottom: '1px solid #cdd1d8', position: 'sticky', top: 0, background: '#fff' }}>
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

function CaptureTable({ columns, rows, totals, onOpenJV, onPrintInvoice, cur = '₹' }) {
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
  const cellNum = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString(localeOf(cur)) : '—'; };
  const mono = (k) => k === 'linkNo' || k === 'saleVno' || k === 'purVno';
  // Render only one page of rows so the DOM stays bounded; the tfoot totals + count
  // below still reflect the FULL set (totals/rows.length are unchanged).
  const pg = usePager(rows);
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <div ref={topRef} onScroll={fromTop} style={{ overflowX: 'auto', overflowY: 'hidden', height: 14, borderBottom: '1px solid #dfe2e7' }}>
        <div style={{ width: scrollW || '100%', height: 1 }} />
      </div>
      <div ref={bodyRef} onScroll={fromBody} className="kb-sticky" style={{ '--stick-head': DARK, '--stick-foot': DARK, maxHeight: 'calc(100vh - 230px)', overflow: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: '100%' }}>
          <thead><tr>
            {columns.map((c, ci) => (
              <th key={c.key} style={{ padding: '8px 12px', textAlign: c.num ? 'right' : 'left', color: GOLD, fontWeight: 700, fontSize: 9.5, whiteSpace: 'nowrap', position: 'sticky', top: 0, background: DARK, zIndex: ci === 0 ? 3 : 2, ...(ci === 0 ? { left: 0, boxShadow: '6px 0 8px -6px rgba(13,19,38,0.45)' } : null) }}>{c.label}</th>
            ))}
          </tr></thead>
          <tbody>
            {pg.pageRows.map((r, i) => (
              <tr key={i} style={rowBg(i)}>
                {columns.map((c, ci) => {
                  // Final Invoice / Bill Value → green + clickable, opens the voucher's JV.
                  if (c.key === 'finalValue') {
                    return (
                      <td key={c.key} {...clickable(() => onOpenJV && r._v && onOpenJV(r._v))} title="Open journal voucher (JV)"
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
                    <td key={c.key} style={{ padding: '7px 12px', whiteSpace: 'nowrap', color: mono(c.key) ? BLUE : DARK, textAlign: c.num ? 'right' : 'left', fontVariantNumeric: c.num ? 'tabular-nums' : 'normal', ...(mono(c.key) ? { fontFamily: 'monospace', fontSize: 10 } : null), ...(ci === 0 ? { position: 'sticky', left: 0, zIndex: 1, background: i % 2 === 0 ? '#fff' : '#fafafa', boxShadow: '6px 0 8px -6px rgba(13,19,38,0.12)' } : null) }}>
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
                <td key={c.key} style={{ padding: '8px 12px', whiteSpace: 'nowrap', textAlign: c.num ? 'right' : 'left', fontWeight: 800, color: c.num ? '#fff' : GOLD, background: DARK, position: 'sticky', bottom: 0, zIndex: idx === 0 ? 3 : 2, ...(idx === 0 ? { left: 0, boxShadow: '6px 0 8px -6px rgba(13,19,38,0.45)' } : null), fontVariantNumeric: c.num ? 'tabular-nums' : 'normal' }}>
                  {c.num ? cellNum(totals[c.key]) : (idx === 0 ? `TOTAL · ${rows.length}` : '')}
                </td>
              ))}
            </tr></tfoot>
          )}
        </table>
        {/* sentinel INSIDE the scroll box → only fires at the bottom (not on mount) */}
        <Pager pager={pg} />
      </div>
    </div>
  );
}

// An inter-branch row: a sale raised as an INB voucher, or a purchase whose party
// is an inter-branch branch ledger ("Travkings Tours and Travels <BR>").
const INB_PARTY_RE = /travkings tours and travels\s+(bommb|bom|amd|nbo|dar|fbm)\b/i; // BOMMB before BOM (shared prefix); TKHO renamed → BOMMB
const isInbRow = (v, tab) => (tab === 'sales' ? v.type === 'INB' : INB_PARTY_RE.test(String(v.party || '')));

export function RegisterLive({ branch, initial = 'sales', inbOnly = false }) {
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

  const XREF_FIELDS = 'vno,linkNo,sourceRef';
  const sales = useSalesRegister(branch, tab === 'sales' ? undefined : { fields: XREF_FIELDS });
  const purch = usePurchaseRegister(branch, tab === 'purchase' ? undefined : { fields: XREF_FIELDS });
  const refReissue = useRefundReissue(branch); // RF/RI folded into BOTH registers' All-modules view

  const bookingsQ = useBookingOrders(branch, { fields: 'linkNo,status,bookingNo,packageType,rows' });
  const q = tab === 'sales' ? sales : purch;

  const allRows = useMemo(() => [...(q.data || []), ...(refReissue.data || [])], [q.data, refReissue.data]);
  const products = useMemo(() => {
    const present = new Set(allRows.map(productOf).filter(Boolean));
    const extras = [...present].filter((p) => !MODULE_ORDER.includes(p)).sort();
    return [...MODULE_ORDER, ...extras]; // always selectable, plus anything else in the data
  }, [allRows]);
  const needle = search.trim().toLowerCase();
  const rows = useMemo(() => allRows
    .filter((v) => !inbOnly || isInbRow(v, tab)) // INB register → inter-branch rows only
    .filter((v) => product === 'all' || productOf(v) === product)

    .filter((v) => !!needle || dateInRange(v.date, from, to))
    .filter((v) => !needle || voucherHaystack(v).includes(needle))

    .sort((a, b) => {
      const da = parseAnyDate(a.date), db = parseAnyDate(b.date);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da - db;
    }), [allRows, product, from, to, needle, inbOnly, tab]);
  const sum = (k) => rows.reduce((s, v) => s + (v[k] || 0), 0);
  const summaryPager = usePager(rows); // Summary view paging — sum() above still totals the full set
  const sheet = useMemo(() => vouchersToSheet(rows), [rows]);

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
  const printInvoice = async (r) => {
    const b = r && r._booking;
    if (!b) return;
    // The booking list is slim (no so/po/gp) — fetch the full booking on demand so the
    // printed invoice has its financial detail. Fall back to the slim row if it fails.
    let full = b;
    if (b.id) { try { full = await apiGet(`/api/booking-orders/${b.id}`); } catch { full = b; } }
    await printBookingInvoice({
      booking: full,
      side: tab === 'sales' ? 'sale' : 'purchase',
      branch,
      title: `${tab === 'sales' ? 'Sales Invoice' : 'Purchase Invoice'} · ${full.bookingNo || full.linkNo || ''}`,
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
  const regTitle = inbOnly ? (tab === 'sales' ? 'INB Sales Register' : 'INB Purchase Register') : (tab === 'sales' ? 'Sales Register' : 'Purchase Register');
  useReportExport({ title: regTitle, kind: 'vouchers', rows: tallyVouchers, recommend: 'landscape' }, [tallyVouchers, regTitle]);
  const subHint = view === 'capture' ? 'every SO/PO/GP figure, module-wise — scroll right'
    : view === 'detailed' ? 'every Tally column shown — scroll right'
      : 'click a row for full detail';
  return (
    <Page
      wide={view !== 'summary'}
      title={regTitle}
      sub={`${branchLabel(branch)} · ${rows.length} vouchers · Total ${money(cur, sum('total'))} · ${needle ? 'searching all dates' : subHint}`}
      right={<>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search passenger / party / ticket / link no / voucher…"
          className="max-tablet:w-full max-tablet:min-h-[44px]" style={{ ...inp, width: 280, minHeight: 32, fontSize: 11 }} />
        <DropdownMenu
          ariaLabel="Filter the register by module"
          menuRole="listbox"
          items={[
            { key: 'all', label: 'All modules', selected: product === 'all', onSelect: () => setProduct('all') },
            ...products.map((p) => ({ key: p, label: p, selected: product === p, onSelect: () => setProduct(p) })),
          ]}
          renderTrigger={({ ref, toggle, triggerProps }) => (
            <button ref={ref} {...triggerProps} onClick={toggle} type="button" title="Filter the register by module"
              className="max-tablet:min-h-[44px] max-tablet:flex-1"
              style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {product === 'all' ? 'All modules' : product}
              <ChevronDown size={13} style={{ color: '#5b616e', flexShrink: 0 }} />
            </button>
          )}
        />
        <ModeToggle view={view} setView={setView} modes={[{ id: 'capture', label: 'SO/PO/GP Capture' }, { id: 'summary', label: 'Summary' }, { id: 'detailed', label: 'All Columns' }]} />
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} branch={branch} />
        <ExportBtn onClick={exportNow} disabled={!rows.length} />
      </>}
    >
      <State q={q} empty={rows.length === 0}>
        {view === 'capture' ? (
          <CaptureTable columns={captureSheet.columns} rows={captureSheet.rows} totals={captureSheet.totals} onOpenJV={openJV} onPrintInvoice={printInvoice} cur={cur} />
        ) : view === 'detailed' ? (
          <DetailedTable columns={sheet.columns} rows={sheet.rows} />
        ) : (
          <Table pager={summaryPager}>
            <thead><tr style={headRow}>
              <Th>Date</Th><Th>Voucher</Th><Th>Type</Th><Th>{tab === 'sales' ? 'Customer' : 'Supplier'}</Th><Th>Link No</Th>
              <Th right>Taxable</Th><Th right>{tab === 'sales' ? 'SVF GST' : 'GST'}</Th>{tab === 'sales' && <Th right>SVC2 GST</Th>}<Th right>Total</Th>
            </tr></thead>
            <tbody>
              {summaryPager.pageRows.map((v, i) => (
                <tr key={v.id || v.vno} style={{ ...rowBg(i), cursor: 'pointer' }} {...clickable(() => setDetail(v))}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'; }}>
                  <td style={{ padding: '8px 12px', color: DIM, whiteSpace: 'nowrap' }}>{v.date}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, color: BLUE, whiteSpace: 'nowrap' }}>
                    {v.locked && v.source === 'booking' && <span title={`Locked — driven by booking ${v.bookingId}`} style={{ marginRight: 4 }}>🔒</span>}
                    {v.vno}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#2e323c' }}>{v.type}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: DARK }}>{v.party || '—'}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, color: '#6b21a8' }}>{v.linkNo || '—'}</td>
                  <td style={{ padding: '8px 12px', ...num }}>{money(cur, v.subtotal)}</td>
                  <td style={{ padding: '8px 12px', ...num, color: '#d97706' }}>{money(cur, v.taxAmt)}</td>
                  {tab === 'sales' && <td style={{ padding: '8px 12px', ...num, color: '#d97706' }}>{money(cur, v.otherTaxesGst)}</td>}
                  <td style={{ padding: '8px 12px', ...num, fontWeight: 700 }}>{money(cur, v.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
              <td colSpan={5} style={{ padding: '9px 12px', fontWeight: 700, color: GOLD }}>TOTAL — {rows.length}</td>
              <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, sum('subtotal'))}</td>
              <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{money(cur, sum('taxAmt'))}</td>
              {tab === 'sales' && <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{money(cur, sum('otherTaxesGst'))}</td>}
              <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, sum('total'))}</td>
            </tr></tfoot>
          </Table>
        )}
      </State>
      <VoucherDetail voucher={detail} cur={cur} onClose={() => setDetail(null)} />
    </Page>
  );
}
