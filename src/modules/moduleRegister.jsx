import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/api';
import { branchCode } from '../core/useAccounting';
import { VSPECS } from '../core/voucherSpecs';
import { filterBookingsForRegister, bookingTravelDetail } from '../core/registerSearch';
import { consumePendingRegisterSearch } from '../core/registerNav';
import { companyProfile } from '../core/referenceCache';
import { bc } from '../core/styles';
import { localeOf } from '../core/format';
import { PeriodBar, periodRange } from '../core/period';
import { printBookingInvoice } from '../core/printInvoice';
import { useReportExport } from '../core/reportExportContext';
import { Search, X, Receipt, FileText } from 'lucide-react';
import { PageLayout } from '../shell/PageLayout';
import { DataTable } from '../shell/DataTable';
import { Button, Select, Input } from '../shell/primitives';

const money = (cur, n) => cur + Math.round(Number(n) || 0).toLocaleString(localeOf(cur));
const MODS = ['SF', 'SH', 'SHT', 'SV', 'SI', 'SC', 'SM'];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
  const net = Math.round((snap.total || 0) - (snap.gst || 0) - (snap.otherTaxesGst || 0) - (snap.tcs || 0)); // taxable value
  const rows = heads.length
    ? heads.map((h) => `<tr><td>${esc(h.label)}</td><td class="r">${money(cur, h.amt)}</td></tr>`).join('')
    : `<tr><td>${esc(spec.name)} — ${esc(b.headerRef || '')}</td><td class="r">${money(cur, net)}</td></tr>`;
  const taxRows = `${snap.gst ? `<tr><td class="lbl">SVF GST</td><td class="r">${money(cur, snap.gst)}</td></tr>` : ''}${snap.otherTaxesGst ? `<tr><td class="lbl">SVC2 GST</td><td class="r">${money(cur, snap.otherTaxesGst)}</td></tr>` : ''}${(isSale && snap.tcs) ? `<tr><td class="lbl">TCS</td><td class="r">${money(cur, snap.tcs)}</td></tr>` : ''}`;
  const css = `
  .inv *{box-sizing:border-box;margin:0;padding:0}
  .inv{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#222}
  .inv .bar{background:#0d1326;color:#d4a437;padding:8px 14px;display:flex;justify-content:space-between;font-weight:700}
  .inv .bar span{color:#fff;font-weight:400;font-size:9pt}
  .inv .lh{display:flex;justify-content:space-between;padding:12px 14px;border-bottom:2px solid #0d1326}
  .inv .co{font-size:18pt;font-weight:900;color:#0d1326}
  .inv .addr{font-size:8.5pt;color:#5a6691;text-align:right;line-height:1.5}
  .inv .meta{display:flex;justify-content:space-between;padding:8px 14px;background:#f3f4f8;border-bottom:1px solid #cdd1d8;font-size:9.5pt}
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

function useBookingsReg(brCode, range) {
  const from = range?.from || '', to = range?.to || '';
  return useQuery({
    queryKey: ['booking-orders', brCode, from, to],
    queryFn: () => apiGet('/api/booking-orders', { branch: brCode === 'ALL' ? '' : brCode, from, to }),
  });
}


export function ModuleRegister({ branch, mode = 'both' }) {
  const [mod, setMod] = useState('ALL');
  
  const [q, setQ] = useState(() => consumePendingRegisterSearch() || '');
  const brCode = branchCode(branch) || 'ALL';
 
  const [range, setRange] = useState(() => periodRange('mtd', { branch }));
  const { data = [], isLoading } = useBookingsReg(brCode, range);
  const spec = VSPECS[mod] || {};
  const needle = q.trim().toLowerCase();
  const rows = useMemo(
    () => filterBookingsForRegister(data, { mod, from: range.from, to: range.to, needle }),
    [data, mod, range.from, range.to, needle],
  );
  const cur = bc(branch)?.cur || '₹';
  const fmt = (n) => cur + Math.round(Number(n) || 0).toLocaleString(localeOf(cur));
  const custs = useQuery({ queryKey: ['customers'], queryFn: () => apiGet('/api/customers') }).data || [];
  const sups = useQuery({ queryKey: ['suppliers'], queryFn: () => apiGet('/api/suppliers') }).data || [];
  const byName = (arr) => { const m = {}; (arr || []).forEach((x) => { if (x && x.name) m[String(x.name).toLowerCase().trim()] = x; }); return m; };
  const custMap = byName(custs), supMap = byName(sups);
  const print = (b, side) => {
    const master = side === 'sale' ? custMap[String(b.customer?.name || '').toLowerCase().trim()] : supMap[String(b.supplier?.name || '').toLowerCase().trim()];
    printBookingInvoice({ booking: b, side, branch, master, title: `${side === 'sale' ? 'Sales Invoice' : 'Purchase Invoice'} · ${b.bookingNo}` });
  };
  const showSale = mode !== 'purchase', showPur = mode !== 'sales';
  const heading = mode === 'sales' ? 'Module Sales Register' : mode === 'purchase' ? 'Module Purchase Register' : 'Module Sales & Purchase Register';

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

  const columns = useMemo(() => {
    const ledgerCol = mode === 'purchase'
      ? { key: 'supplier.name', header: 'Ledger Name', render: (r) => (r.noSupplier ? '—' : (r.supplier?.name || '—')) }
      : { key: 'customer.name', header: 'Ledger Name', render: (r) => r.customer?.name || '—' };
    const otherPartyCol = mode === 'purchase'
      ? { key: 'customer.name', header: 'Customer', render: (r) => r.customer?.name || '—' }
      : { key: 'supplier.name', header: 'Service / Vendor', render: (r) => (r.noSupplier ? '—' : (r.supplier?.name || '—')) };
    return [
      { key: 'date', header: 'Date', className: 'whitespace-nowrap text-ink-muted' },
      { key: 'module', header: 'Sales Type', className: 'whitespace-nowrap', render: (r) => `${VSPECS[r.module]?.icon || ''} ${VSPECS[r.module]?.name || r.module}` },
      ledgerCol,
      ...(showSale ? [{ key: 'so.total', header: mode === 'both' ? 'Sale (incl GST)' : 'Invoice Value', num: true, render: (r) => fmt(r.so?.total) }] : []),
      ...(showPur ? [{ key: 'po.total', header: mode === 'both' ? 'Purchase (incl GST)' : 'Invoice Value', num: true, render: (r) => (r.noSupplier ? '—' : fmt(r.po?.total)) }] : []),
      { key: 'linkNo', header: 'Link No', className: 'font-mono text-[#185FA5]', render: (r) => r.linkNo || '—' },
      { key: 'saleVno', header: 'Sales Invoice No', className: 'font-mono text-[11px] text-ink-muted', render: (r) => r.saleVno || '—' },
      { key: 'purchaseVno', header: 'Purchase Invoice No', className: 'font-mono text-[11px] text-ink-muted', render: (r) => (r.noSupplier ? '—' : (r.purchaseVno || '—')) },
      // ── the rest ──
      { key: 'bookingNo', header: 'Booking No', className: 'font-mono font-semibold whitespace-nowrap' },
      otherPartyCol,
      { key: '__pax', header: 'Passenger / Name', sortable: false, render: (r) => bookingTravelDetail(r).passengers || '—' },
      { key: '__tkt', header: 'Ticket No', sortable: false, className: 'font-mono text-[11px]', render: (r) => bookingTravelDetail(r).tickets || '—' },
      { key: '__pnr', header: 'PNR', sortable: false, className: 'font-mono text-[11px] text-gold-dark', render: (r) => bookingTravelDetail(r).pnrs || '—' },
      { key: '__sector', header: 'Sector', sortable: false, className: 'whitespace-nowrap', render: (r) => bookingTravelDetail(r).sectors || '—' },
      ...(showSale ? [
        { key: 'so.gst', header: 'SVF GST', num: true, className: 'text-[#854F0B]', render: (r) => fmt(r.so?.gst) },
        { key: 'so.otherTaxesGst', header: 'SVC2 GST', num: true, className: 'text-[#854F0B]', render: (r) => fmt(r.so?.otherTaxesGst) },
      ] : []),
      ...(showPur ? [
        { key: 'po.gst', header: 'Purchase GST', num: true, className: 'text-[#854F0B]', render: (r) => (r.noSupplier ? '—' : fmt(r.po?.gst)) },
      ] : []),
      { key: 'gp.total', header: 'Gross Profit', num: true, className: 'font-bold text-success', render: (r) => <>{fmt(r.gp?.total)} <span className="font-semibold text-ink-muted">({r.gp?.pct ?? 0}%)</span></> },
      {
        key: '__inv', header: 'Invoice', align: 'center', sortable: false, hideable: false,
        render: (r) => (
          <div className="flex justify-center gap-1.5 whitespace-nowrap">
            {showSale && <Button variant="secondary" size="xs" icon={Receipt} onClick={() => print(r, 'sale')}>Sales</Button>}
            {showPur && !r.noSupplier && <Button variant="secondary" size="xs" icon={FileText} onClick={() => print(r, 'purchase')}>Purchase</Button>}
          </div>
        ),
      },
    ];
    
  }, [mode, showSale, showPur, branch]);

  const emptyMsg = needle
    ? `No deals match “${q.trim()}”.`
    : `No approved ${mod === 'ALL' ? '' : (spec.name || mod) + ' '}deals. Create one in SO/PO/GP Voucher → approve it.`;

  return (
    <PageLayout
      title={<>{heading} <span className="text-xs font-semibold text-ink-muted">(view-only)</span></>}
      subtitle={`Approved SO/PO/GP deals — one line per booking with full sale / purchase / GST / GP detail. All entry is via Finance ▸ Vouchers ▸ SO/PO/GP Voucher. ${mode === 'sales' ? 'Print the Sales Invoice (give to customer)' : mode === 'purchase' ? 'Print the Purchase Invoice (internal filing)' : 'Print the Sales Invoice (customer) or Purchase Invoice (filing)'} — Link No stamped.`}
      filters={
        <>
          <PeriodBar branch={branch} compact defaultPreset="mtd" onChange={setRange} />
          <div className="w-52"><Select value={mod} onChange={(e) => setMod(e.target.value)} className="font-semibold">
            <option value="ALL">📋 All modules</option>
            {MODS.map((m) => <option key={m} value={m}>{(VSPECS[m]?.icon || '') + ' ' + (VSPECS[m]?.name || m)}</option>)}
          </Select></div>
          {/* Search across everything captured on the SO/PO — passenger, ticket, PNR, sector, customer, supplier… */}
          <div className="relative w-full max-w-[460px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search passenger / guest / ticket / PNR / sector / customer / supplier / link no…"
              className="pl-9 pr-9"
            />
            {q && (
              <button onClick={() => setQ('')} title="Clear" className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-subtle transition-colors hover:text-ink">
                <X size={15} />
              </button>
            )}
          </div>
        </>
      }
    >
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(b) => b.id}
        loading={isLoading}
        emptyMessage={emptyMsg}
        initialSort={{ key: 'date', dir: 'asc' }}
        stickyHeader
        stickyFirstColumn
        showColumnToggle
        maxHeight="72vh"
        minWidth="80rem"
      />
    </PageLayout>
  );
}
