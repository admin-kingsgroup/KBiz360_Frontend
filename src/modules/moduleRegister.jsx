// ─── Finance ▸ Module Register (read-only) ────────────────────────────────────
// All product entry now happens in SO/PO/GP. This screen is a VIEW: pick a module
// (Flight/Holiday/Hotel/Visa/Insurance/Car/Misc) and see its approved deals — Sale,
// Purchase, GP, by Link No — and print the Sales Invoice (give to the customer) or
// the Purchase Invoice (internal filing), both stamped with the Link No.
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/api';
import { branchCode } from '../core/useAccounting';
import { VSPECS } from '../core/voucherSpecs';
import { filterBookingsForRegister, bookingTravelDetail } from '../core/registerSearch';
import { consumePendingRegisterSearch } from '../core/registerNav';
import { companyProfile } from '../core/referenceCache';
import { bc } from '../core/styles';
import { PeriodBar, periodRange } from '../core/period';
import { openPrintPreview } from '../core/PrintPreview';
import { buildBookingInvoice } from '../core/invoiceHtml';
import { useReportExport } from '../core/reportExportContext';

const C = { dark: '#0d1326', gold: '#d4a437', blue: '#185FA5', red: '#A32D2D', green: '#27500A', dim: '#5a6691', border: '#e1e3ec' };
const money = (cur, n) => cur + Math.round(Number(n) || 0).toLocaleString('en-IN');
const MODS = ['SF', 'SH', 'SHT', 'SV', 'SI', 'SC', 'SM'];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Build a printable invoice (Sale → customer Tax Invoice · Purchase → filing voucher)
// straight from the approved booking's so/po snapshot. Link No is stamped on it.
function invoiceHtml(b, side, branch) {
  const cfg = bc(branch) || {}; const cur = cfg.cur || '₹';
  const prof = companyProfile(branch?.code || 'BOM') || {};
  const spec = VSPECS[b.module] || { name: b.module };
  const isSale = side === 'sale';
  const snap = (isSale ? b.so : b.po) || {};
  const partyName = isSale ? (b.customer?.name || '—') : (b.supplier?.name || '—');
  const partyLedger = isSale ? (b.customer?.ledgerName || '') : (b.supplier?.ledgerName || '');
  const vno = isSale ? (b.saleVno || '') : (b.purchaseVno || '');
  const title = isSale ? 'TAX INVOICE' : 'PURCHASE VOUCHER';
  const heads = (snap.heads || []).filter((h) => Math.abs(Number(h.amt) || 0) > 0);
  const net = Math.round((snap.total || 0) - (snap.gst || 0) - (snap.tcs || 0)); // taxable value
  const rows = heads.length
    ? heads.map((h) => `<tr><td>${esc(h.label)}</td><td class="r">${money(cur, h.amt)}</td></tr>`).join('')
    : `<tr><td>${esc(spec.name)} — ${esc(b.headerRef || '')}</td><td class="r">${money(cur, net)}</td></tr>`;
  const taxRows = `${snap.gst ? `<tr><td class="lbl">GST</td><td class="r">${money(cur, snap.gst)}</td></tr>` : ''}${(isSale && snap.tcs) ? `<tr><td class="lbl">TCS</td><td class="r">${money(cur, snap.tcs)}</td></tr>` : ''}`;
  const css = `
  .inv *{box-sizing:border-box;margin:0;padding:0}
  .inv{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#222}
  .inv .bar{background:#0d1326;color:#d4a437;padding:8px 14px;display:flex;justify-content:space-between;font-weight:700}
  .inv .bar span{color:#fff;font-weight:400;font-size:9pt}
  .inv .lh{display:flex;justify-content:space-between;padding:12px 14px;border-bottom:2px solid #0d1326}
  .inv .co{font-size:18pt;font-weight:900;color:#0d1326}
  .inv .addr{font-size:8.5pt;color:#5a6691;text-align:right;line-height:1.5}
  .inv .meta{display:flex;justify-content:space-between;padding:8px 14px;background:#f3f4f8;border-bottom:1px solid #e1e3ec;font-size:9.5pt}
  .inv .ttl{font-size:13pt;font-weight:800;color:#0d1326}
  .inv .lk{font-family:Courier New,monospace;font-weight:700;color:#185FA5;background:#E6F1FB;padding:2px 8px;border-radius:5px}
  .inv .billto{padding:10px 14px;font-size:9.5pt}
  .inv table{width:100%;border-collapse:collapse;margin:0 0 8px}
  .inv th,.inv td{padding:6px 14px;border-bottom:1px solid #eee;text-align:left;font-size:10pt}
  .inv th{background:#0d1326;color:#fff}
  .inv .r{text-align:right;font-variant-numeric:tabular-nums}
  .inv .lbl{color:#5a6691}
  .inv .tot td{background:#0d1326;color:#fff;font-weight:800}
  .inv .ft{padding:10px 14px;font-size:8pt;color:#5a6691;border-top:2px solid #0d1326;display:flex;justify-content:space-between}`;
  const body = `<div class="inv">
    <div class="bar"><span style="color:#d4a437;font-size:11pt">TRAVKINGS · KBiz360</span><span>${esc(b.date || '')}</span></div>
    <div class="lh"><div><div class="co">${esc(prof.entity || 'Travkings Tours & Travels')}</div><div style="font-size:9pt;color:#5a6691">${esc(cur)} · ${esc(spec.name)}</div></div><div class="addr">${esc(prof.operAddr || '')}${prof.gstin ? `<br/>GSTIN: ${esc(prof.gstin)}` : ''}</div></div>
    <div class="meta"><div class="ttl">${title}</div><div>No: <b>${esc(vno || '(on approval)')}</b> &nbsp; Link: <span class="lk">${esc(b.linkNo || '—')}</span> &nbsp; Booking: ${esc(b.bookingNo || '')}</div></div>
    <div class="billto"><b>${isSale ? 'Bill To (Customer)' : 'Supplier'}:</b> ${esc(partyName)}${partyLedger && partyLedger !== partyName ? ` &nbsp;<span style="color:#5a6691">(ledger: ${esc(partyLedger)})</span>` : ''}</div>
    <table><thead><tr><th>Particulars</th><th class="r">Amount</th></tr></thead><tbody>
      ${rows}
      <tr><td class="lbl">Taxable Value</td><td class="r">${money(cur, net)}</td></tr>
      ${taxRows}
      <tr class="tot"><td>Total ${esc(cur)}</td><td class="r">${money(cur, snap.total)}</td></tr>
    </tbody></table>
    <div class="ft"><div>${isSale ? 'Subject to GST as applicable. E.&amp;O.E. Computer-generated invoice.' : 'Internal purchase record — for filing. E.&amp;O.E.'} &nbsp; Link No: ${esc(b.linkNo || '—')}</div><div>For ${esc(prof.entity || 'Travkings')}<br/>Authorised Signatory</div></div>
  </div>`;
  return `<style>${css}</style>${body}`;
}

function useBookingsReg(brCode) {
  return useQuery({ queryKey: ['booking-orders', brCode], queryFn: () => apiGet('/api/booking-orders', { branch: brCode === 'ALL' ? '' : brCode }) });
}


// mode: 'sales' (Sales Invoice only) · 'purchase' (Purchase Invoice only) · 'both'
export function ModuleRegister({ branch, mode = 'both' }) {
  const [mod, setMod] = useState('ALL');
  // Seed the search when opened from a drill (P&L Ledger Account → invoice), so the
  // register lands on that one booking; normal navigation starts blank.
  const [q, setQ] = useState(() => consumePendingRegisterSearch() || '');
  const brCode = branchCode(branch) || 'ALL';
  const { data = [], isLoading } = useBookingsReg(brCode);
  const spec = VSPECS[mod] || {};
  const [range, setRange] = useState(() => periodRange('all', { branch })); // default All = inception→today
  const needle = q.trim().toLowerCase();
  const rows = useMemo(
    () => filterBookingsForRegister(data, { mod, from: range.from, to: range.to, needle }),
    [data, mod, range.from, range.to, needle],
  );
  const fmt = (n) => (bc(branch).cur) + Math.round(Number(n) || 0).toLocaleString('en-IN');
  const custs = useQuery({ queryKey: ['customers'], queryFn: () => apiGet('/api/customers') }).data || [];
  const sups = useQuery({ queryKey: ['suppliers'], queryFn: () => apiGet('/api/suppliers') }).data || [];
  const byName = (arr) => { const m = {}; (arr || []).forEach((x) => { if (x && x.name) m[String(x.name).toLowerCase().trim()] = x; }); return m; };
  const custMap = byName(custs), supMap = byName(sups);
  const print = (b, side) => {
    const master = side === 'sale' ? custMap[String(b.customer?.name || '').toLowerCase().trim()] : supMap[String(b.supplier?.name || '').toLowerCase().trim()];
    openPrintPreview({ title: `${side === 'sale' ? 'Sales Invoice' : 'Purchase Invoice'} · ${b.bookingNo}`, recommend: 'portrait', html: buildBookingInvoice(b, side, branch, master) });
  };
  const showSale = mode !== 'purchase', showPur = mode !== 'sales';
  const heading = mode === 'sales' ? 'Module Sales Register' : mode === 'purchase' ? 'Module Purchase Register' : 'Module Sales & Purchase Register';

  // Feed the global Tally Export / Print / PDF bar real, balanced vouchers built
  // from the visible bookings (party Dr, sales/purchase + GST on the other side).
  const tallyVouchers = useMemo(() => {
    const out = [];
    const n = (x) => Math.round(Number(x) || 0);
    for (const b of rows) {
      if (showSale && b.so && n(b.so.total)) {
        const cust = b.customer?.ledgerName || b.customer?.name || 'Sundry Debtors';
        const gst = n(b.so.gst); const net = n(b.so.total) - gst;
        out.push({
          date: b.date, vno: b.saleVno || b.bookingNo, vchType: 'Sales', narration: `${b.bookingNo} · ${b.linkNo || ''}`.trim(),
          entries: [
            { ledger: cust, amount: n(b.so.total), drCr: 'Dr' },
            { ledger: `Sales - ${VSPECS[b.module]?.name || b.module}`, amount: net, drCr: 'Cr' },
            ...(gst ? [{ ledger: 'Output GST', amount: gst, drCr: 'Cr' }] : []),
          ],
        });
      }
      if (showPur && !b.noSupplier && b.po && n(b.po.total)) {
        const sup = b.supplier?.ledgerName || b.supplier?.name || 'Sundry Creditors';
        const gst = n(b.po.gst); const net = n(b.po.total) - gst;
        out.push({
          date: b.date, vno: b.purchaseVno || b.bookingNo, vchType: 'Purchase', narration: `${b.bookingNo} · ${b.linkNo || ''}`.trim(),
          entries: [
            { ledger: `Purchase - ${VSPECS[b.module]?.name || b.module}`, amount: net, drCr: 'Dr' },
            ...(gst ? [{ ledger: 'Input GST', amount: gst, drCr: 'Dr' }] : []),
            { ledger: sup, amount: n(b.po.total), drCr: 'Cr' },
          ],
        });
      }
    }
    return out;
  }, [rows, showSale, showPur]);
  useReportExport({ title: heading, kind: 'vouchers', rows: tallyVouchers, recommend: 'landscape' }, [tallyVouchers, heading]);
  const showMod = mod === 'ALL';
  // every datum is now a column on the single row → colSpan for loading/empty spans
  const colSpan = 3 /* bkg·link·date */ + (showMod ? 1 : 0) + 2 /* customer·supplier */
    + 4 /* passenger·ticket·pnr·sector */
    + (showSale ? 2 : 0) /* sale·saleGST */ + (showPur ? 2 : 0) /* purchase·purGST */
    + 1 /* GP */ + (showSale ? 1 : 0) /* saleInv */ + (showPur ? 1 : 0) /* purInv */ + 1 /* invoice */;

  const th = { padding: '9px 12px', background: C.dark, color: C.gold, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'left', whiteSpace: 'nowrap' };
  const td = { padding: '8px 12px', borderBottom: '1px solid #f0f2f7', fontSize: 12.5 };
  const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
  const ibtn = (bg, bd) => ({ padding: '4px 9px', fontSize: 10.5, fontWeight: 700, border: `1px solid ${bd}`, color: bd === C.green ? '#fff' : bd, background: bg, borderRadius: 5, cursor: 'pointer', marginRight: 5 });

  return (
    <div style={{ margin: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>{heading} <span style={{ fontSize: 12, fontWeight: 600, color: C.dim }}>(view-only)</span></div>
          <div style={{ fontSize: 12, color: C.dim }}>Approved SO/PO/GP deals — <b>one line per booking</b> with full sale / purchase / GST / GP detail. All entry is via <b>Finance ▸ Vouchers ▸ SO/PO/GP Voucher</b>. {mode === 'sales' ? 'Print the Sales Invoice (give to customer)' : mode === 'purchase' ? 'Print the Purchase Invoice (internal filing)' : 'Print the Sales Invoice (customer) or Purchase Invoice (filing)'} — Link No stamped.</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <PeriodBar branch={branch} compact defaultPreset="all" onChange={setRange} />
          <select value={mod} onChange={(e) => setMod(e.target.value)} style={{ padding: '8px 12px', fontSize: 13, fontWeight: 700, border: `1px solid ${C.border}`, borderRadius: 6, background: '#fff', color: C.dark }}>
            <option value="ALL">📋 All modules</option>
            {MODS.map((m) => <option key={m} value={m}>{(VSPECS[m]?.icon || '') + ' ' + (VSPECS[m]?.name || m)}</option>)}
          </select>
        </div>
      </div>
      {/* Search across everything captured on the SO/PO — passenger name, ticket, PNR, sector, customer, supplier… */}
      <div style={{ position: 'relative', marginBottom: 10, maxWidth: 460 }}>
        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.dim, fontSize: 13, pointerEvents: 'none' }}>🔍</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search passenger / guest / ticket / PNR / sector / customer / supplier / link no…"
          style={{ width: '100%', padding: '9px 30px 9px 32px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 8, background: '#fff', color: C.dark, boxSizing: 'border-box' }}
        />
        {q && <button onClick={() => setQ('')} title="Clear" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: C.dim, fontSize: 15 }}>✕</button>}
      </div>
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ maxHeight: '72vh', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Booking No</th><th style={th}>Link No</th><th style={th}>Date</th>
              {showMod && <th style={th}>Module</th>}
              <th style={th}>Customer</th>
              <th style={th}>Service / Vendor</th>
              <th style={th}>Passenger / Name</th>
              <th style={th}>Ticket No</th>
              <th style={th}>PNR</th>
              <th style={th}>Sector</th>
              {showSale && <th style={{ ...th, ...num }}>Sale (incl GST)</th>}
              {showSale && <th style={{ ...th, ...num }}>Sale GST</th>}
              {showPur && <th style={{ ...th, ...num }}>Purchase (incl GST)</th>}
              {showPur && <th style={{ ...th, ...num }}>Purchase GST</th>}
              <th style={{ ...th, ...num }}>Gross Profit</th>
              {showSale && <th style={th}>Sales Invoice</th>}
              {showPur && <th style={th}>Purchase Invoice</th>}
              <th style={{ ...th, textAlign: 'center' }}>Invoice</th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={colSpan} style={{ ...td, textAlign: 'center', color: C.dim, padding: 22 }}>Loading…</td></tr>}
              {!isLoading && rows.length === 0 && <tr><td colSpan={colSpan} style={{ ...td, textAlign: 'center', color: C.dim, padding: 22 }}>{needle ? `No deals match “${q.trim()}”.` : `No approved ${mod === 'ALL' ? '' : (spec.name || mod) + ' '}deals. Create one in SO/PO/GP Voucher → approve it.`}</td></tr>}
              {rows.map((b, i) => {
                const tv = bookingTravelDetail(b);
                return (
                <tr key={b.id} style={{ background: i % 2 ? '#fafbff' : '#fff' }}>
                  <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>{b.bookingNo}</td>
                  <td style={{ ...td, fontFamily: 'monospace', color: C.blue }}>{b.linkNo || '—'}</td>
                  <td style={{ ...td, color: C.dim, whiteSpace: 'nowrap' }}>{b.date}</td>
                  {showMod && <td style={{ ...td, whiteSpace: 'nowrap' }}>{(VSPECS[b.module]?.icon || '') + ' ' + (VSPECS[b.module]?.name || b.module)}</td>}
                  <td style={{ ...td }}>{b.customer?.name || '—'}</td>
                  <td style={{ ...td }}>{b.noSupplier ? '—' : (b.supplier?.name || '—')}</td>
                  <td style={{ ...td, minWidth: 140 }}>{tv.passengers || '—'}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>{tv.tickets || '—'}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: C.gold }}>{tv.pnrs || '—'}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{tv.sectors || '—'}</td>
                  {showSale && <td style={{ ...td, ...num }}>{fmt(b.so?.total)}</td>}
                  {showSale && <td style={{ ...td, ...num, color: '#854F0B' }}>{fmt(b.so?.gst)}</td>}
                  {showPur && <td style={{ ...td, ...num }}>{b.noSupplier ? '—' : fmt(b.po?.total)}</td>}
                  {showPur && <td style={{ ...td, ...num, color: '#854F0B' }}>{b.noSupplier ? '—' : fmt(b.po?.gst)}</td>}
                  <td style={{ ...td, ...num, fontWeight: 700, color: C.green }}>{fmt(b.gp?.total)} <span style={{ fontWeight: 600, color: C.dim }}>({b.gp?.pct ?? 0}%)</span></td>
                  {showSale && <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: C.dim }}>{b.saleVno || '—'}</td>}
                  {showPur && <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: C.dim }}>{b.noSupplier ? '—' : (b.purchaseVno || '—')}</td>}
                  <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {showSale && <button onClick={() => print(b, 'sale')} style={ibtn('#fff', C.blue)}>🧾 Sales Invoice</button>}
                    {showPur && !b.noSupplier && <button onClick={() => print(b, 'purchase')} style={ibtn('#fff', C.dark)}>📄 Purchase Invoice</button>}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
