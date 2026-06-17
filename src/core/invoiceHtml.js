// ─── Final-print invoice renderer (Sales + Purchase) ─────────────────────────
// Builds the Travkings invoice HTML (matching invoice-templates/*.html) from a
// LIVE approved booking. Used by Module Registers + SO/PO/GP Approvals.
import { bc } from './styles';
import { companyProfile } from './referenceCache';

const GST_STATES = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand',
  '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
  '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya',
  '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
  '24': 'Gujarat', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
};
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n2 = (n) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function inWords(num) {
  num = Math.round(num); if (num === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const seg = (x) => { let s = ''; if (x > 99) { s += a[Math.floor(x / 100)] + ' Hundred '; x %= 100; } if (x > 19) { s += b[Math.floor(x / 10)] + ' '; x %= 10; } if (x > 0) s += a[x] + ' '; return s; };
  let out = '', cr = Math.floor(num / 10000000); num %= 10000000;
  const lk = Math.floor(num / 100000); num %= 100000; const th = Math.floor(num / 1000); num %= 1000;
  if (cr) out += seg(cr) + 'Crore '; if (lk) out += seg(lk) + 'Lakh '; if (th) out += seg(th) + 'Thousand '; if (num) out += seg(num);
  return out.trim();
}

const CSS = `
  .iv{--gold:#A07828;--gold-l:#C49A3C;--dark:#111;--ink:#1A1A1A;--ink2:#3A3A3A;--ink3:#6A6A6A;--ink4:#9A9A9A;--rule:#DEDBD4;--bg-lt:#F2EFE9;--paper:#FFF;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:var(--ink);background:var(--paper)}
  .iv *{box-sizing:border-box;margin:0;padding:0}
  .iv .sheet{max-width:860px;margin:0 auto;background:var(--paper);padding:30px 40px}
  .iv .title{text-align:center;font-size:30px;font-weight:800;letter-spacing:2px}
  .iv .title-rule{height:1px;background:var(--gold);margin:9px 0 22px}
  .iv .tophead{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
  .iv .logo-wrap{display:flex;align-items:center;gap:12px}
  .iv .crest{width:48px;height:55px;flex-shrink:0}
  .iv .lg{font-size:27px;font-weight:800;letter-spacing:4px;line-height:1}
  .iv .sb{font-size:8px;font-weight:700;letter-spacing:3.5px;color:var(--ink3);margin-top:3px}
  .iv .inv-meta{text-align:right;min-width:260px}
  .iv .inv-meta .row{display:flex;justify-content:flex-end;gap:18px;align-items:baseline;padding:3px 0}
  .iv .inv-meta .k{font-size:9px;letter-spacing:1px;color:var(--ink4);text-transform:uppercase}
  .iv .inv-meta .v{font-size:12.5px;font-weight:700;min-width:120px;text-align:right}
  .iv .inv-meta .v.big{font-size:17px;font-weight:800}
  .iv .inv-meta .firstline{border-bottom:1px solid var(--rule);padding-bottom:6px;margin-bottom:4px}
  .iv .blackrule{height:2.5px;background:var(--dark);margin:16px 0 20px}
  .iv .parties{display:flex;margin-bottom:22px}
  .iv .party{flex:1;padding-right:24px}
  .iv .party+.party{padding-left:24px;border-left:1px solid var(--rule)}
  .iv .party .lab{font-size:9.5px;font-weight:700;letter-spacing:1.2px;color:var(--gold);text-transform:uppercase;margin-bottom:8px}
  .iv .party .nm{font-size:16px;font-weight:800;margin-bottom:8px}
  .iv .party .ln{font-size:11px;color:var(--ink3);line-height:1.8}
  .iv .fb-label{font-size:9.5px;font-weight:700;letter-spacing:1.2px;color:var(--gold);text-transform:uppercase;margin-bottom:8px}
  .iv table{width:100%;border-collapse:collapse}
  .iv thead th{font-size:9px;font-weight:700;color:var(--ink3);text-transform:uppercase;text-align:right;padding:8px;background:var(--bg-lt);border-top:2px solid var(--dark);border-bottom:2px solid var(--dark)}
  .iv thead th.l{text-align:left}
  .iv tbody td{padding:9px 8px;border-bottom:1px solid var(--rule);font-size:11.5px;text-align:right;vertical-align:top}
  .iv tbody td.l{text-align:left}
  .iv .desc .nm{font-size:12px;font-weight:800}
  .iv .desc .sub{font-size:9.5px;color:var(--ink4);line-height:1.5;margin-top:2px}
  .iv td.tf{font-weight:800}
  .iv .summary{display:flex;justify-content:flex-end;margin-top:4px}
  .iv .sumtbl{width:360px}
  .iv .sumtbl .r{display:flex;justify-content:space-between;padding:8px 4px;font-size:12px;border-bottom:1px solid var(--rule)}
  .iv .sumtbl .r .k{color:var(--ink2)} .iv .sumtbl .r .v{font-weight:800}
  .iv .sumtbl .net{display:flex;justify-content:space-between;align-items:center;background:var(--dark);color:#fff;padding:12px 16px;margin-top:4px}
  .iv .sumtbl .net .k{font-size:11.5px;font-weight:700;letter-spacing:1px}
  .iv .sumtbl .net .v{font-size:19px;font-weight:800;color:var(--gold-l)}
  .iv .botrule{height:1px;background:var(--rule);margin:20px 0 14px}
  .iv .botgrid{display:flex;justify-content:space-between;gap:30px}
  .iv .botleft{flex:1}
  .iv .lab2{font-size:9.5px;font-weight:700;letter-spacing:1.1px;color:var(--gold);text-transform:uppercase;margin-bottom:6px}
  .iv .words{font-size:11.5px;font-style:italic;color:var(--ink2);margin-bottom:16px}
  .iv .pay{font-size:11px;color:var(--ink2);line-height:1.8}
  .iv .botright{width:280px;text-align:right}
  .iv .botright .for{font-size:11px;font-weight:700;color:var(--gold)}
  .iv .botright .sigline{margin-top:48px;border-top:1px solid var(--ink3);padding-top:6px}
  .iv .botright .sigline .a{font-size:11.5px;font-weight:700}
  .iv .botright .sigline .b{font-size:9.5px;color:var(--ink4)}
  .iv .terms{margin-top:20px;font-size:9px;color:var(--ink4);line-height:1.7;border-top:1px solid var(--rule);padding-top:11px}
  @media print{@page{size:A4 portrait;margin:9mm} .iv .sheet{padding:0;max-width:100%} .iv *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;

const CREST = `<svg class="crest" viewBox="0 0 52 60" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 19 L26 14 L43 19 L43 36 Q43 49 26 55 Q9 49 9 36 Z" stroke="#A07828" stroke-width="1.6" fill="#FDFAF4"/><path d="M18 33 l8 -9 l8 9 M26 24 l0 15" stroke="#A07828" stroke-width="1.6" fill="none"/></svg>`;

const partyBlock = (lab, p, cur) => `<div class="party"><div class="lab">${esc(lab)}</div><div class="nm">${esc(p.name || '—')}</div><div class="ln">${[p.address, p.gstin ? `GSTIN : ${esc(p.gstin)}` : '', p.email ? `Email : ${esc(p.email)}` : '', p.contact ? `Contact : ${esc(p.contact)}` : ''].filter(Boolean).map(esc).join('<br>')}</div></div>`;

// side: 'sale' | 'purchase'. `master` = the resolved customer/supplier master record
// (optional) — used to back-fill blank party fields on older bookings.
export function buildBookingInvoice(booking = {}, side = 'sale', branch, master = {}) {
  const isSale = side === 'sale';
  const prof = companyProfile(branch?.code || booking.branch || 'BOM') || {};
  const cur = prof.cur_sym || (bc(branch) || {}).cur || '₹';
  const company = { name: prof.entity || 'Travkings Tours & Travels Pvt. Ltd.', address: prof.operAddr || '', gstin: prof.gstin || '', email: prof.email || '', contact: prof.phone || '' };
  const raw = isSale ? (booking.customer || {}) : (booking.supplier || {});
  const m = master || {};
  const mAddr = m.address || [m.city, m.country].filter(Boolean).join(', ');
  const party = {
    name: raw.name || m.name || '',
    gstin: raw.gstin || m.gstin || '',
    address: raw.address || mAddr || '',
    email: raw.email || m.email || '',
    contact: raw.contact || m.contact || m.phone || '',
  };
  const snap = (isSale ? booking.so : booking.po) || {};
  const rows = Array.isArray(booking.rows) ? booking.rows : [];
  const headerRef = booking.headerRef || '';
  const vno = isSale ? (booking.saleVno || '') : (booking.purchaseVno || '');
  const psCode = (party.gstin || prof.gstin || '').slice(0, 2);
  const placeOfSupply = GST_STATES[psCode] ? `${GST_STATES[psCode]} — ${psCode}` : (prof.state ? `${prof.state} — ${prof.stateCode || ''}` : '');

  // per-line breakdown
  const fareRows = rows.map((p) => {
    const base = Number(p.base) || 0, k3 = Number(p.k3) || 0, tax = Number(p.tax) || 0, markup = Number(p.markup) || 0, psvc = Number(p.psvc) || 0;
    const incentive = Number(p.incentive) || 0, tds = Number(p.tds) || 0;
    const pax = [p.fn, p.sn].filter(Boolean).join(' ');
    // Flight bookings carry per-sector travel detail; list each sector under the
    // passenger. Other modules keep the single TKT/PNR line.
    const secs = Array.isArray(p.sectors) ? p.sectors.filter((s) => s && (s.sector || s.airline || s.flightNo || s.ticketNo || s.pnr || s.travelDate)) : [];
    const secLines = secs.map((s) => {
      const parts = [s.sector, s.airline, s.flightNo, s.ticketNo ? `TKT ${s.ticketNo}` : '', s.pnr ? `PNR ${s.pnr}` : '', s.travelDate].filter(Boolean).map(esc).join(' &nbsp;·&nbsp; ');
      return parts ? `<div class="sub">${parts}</div>` : '';
    }).join('');
    const idline = secs.length
      ? (pax ? `PAX: ${esc(pax)}` : '')
      : [pax ? `PAX: ${esc(pax)}` : '', (p.tkt || p.pkg || p.htl) ? `TKT: ${esc(p.tkt || p.pkg || p.htl)}` : '', (p.pnr || p.ref || p.conf) ? `PNR: ${esc(p.pnr || p.ref || p.conf)}` : ''].filter(Boolean).join(' &nbsp;|&nbsp; ');
    const desc = `<td class="l desc"><div class="nm">${esc(headerRef || 'Booking')}</div><div class="sub">${idline}</div>${secLines}</td>`;
    if (isSale) {
      const totalFare = base + k3 + tax + markup;
      // Taxes (YQ/YR) = the pass-through fare taxes; Other Taxes = the agency margin
      // (hidden income), shown as its own column per the customer-facing layout.
      return `<tr>${desc}<td>${n2(base)}</td><td>${n2(k3)}</td><td>${n2(tax)}</td><td>${n2(markup)}</td><td class="tf">${cur}${n2(totalFare)}</td></tr>`;
    }
    const totalCost = base + k3 + tax + psvc - incentive + tds;
    return `<tr>${desc}<td>${n2(base)}</td><td>${n2(k3)}</td><td>${n2(tax)}</td><td>${n2(psvc)}</td><td>${n2(incentive)}</td><td>${n2(tds)}</td><td class="tf">${cur}${n2(totalCost)}</td></tr>`;
  }).join('');
  const emptyRow = `<tr><td class="l" colSpan="${isSale ? 6 : 8}" style="text-align:center;color:#9A9A9A;padding:16px">No line detail captured for this booking.</td></tr>`;

  // summary from the booked snapshot (ties to the books)
  const subTotal = r2(snap.lineTotal || 0), service = r2(snap.serviceCharge || 0), gst = r2(snap.gst || 0), tcs = r2(snap.tcs || 0), incentive = r2(snap.incentive || 0), tds = r2(snap.tds || 0), net = r2(snap.total || (subTotal + service + gst + tcs));
  const inter = booking.gstMode === 'inter';
  const half = r2(gst / 2);
  const gstRows = inter
    ? `<div class="r"><span class="k">IGST</span><span class="v">${cur}${n2(gst)}</span></div>`
    : `<div class="r"><span class="k">CGST</span><span class="v">${cur}${n2(half)}</span></div><div class="r"><span class="k">SGST</span><span class="v">${cur}${n2(r2(gst - half))}</span></div>`;
  const tcsRow = tcs ? `<div class="r"><span class="k">TCS</span><span class="v">${cur}${n2(tcs)}</span></div>` : '';
  const sumtbl = isSale
    ? `
    <div class="r"><span class="k">Sub Total</span><span class="v">${cur}${n2(subTotal)}</span></div>
    ${service ? `<div class="r"><span class="k">Service Charges</span><span class="v">${cur}${n2(service)}</span></div>` : ''}
    ${gst ? gstRows : ''}${tcsRow}
    <div class="net"><span class="k">NET TOTAL (${esc(cur)})</span><span class="v">${cur}${n2(net)}</span></div>`
    : `
    <div class="r"><span class="k">Sub Total (Fares + Svc)</span><span class="v">${cur}${n2(subTotal + incentive)}</span></div>
    ${incentive ? `<div class="r" style="color:#A32D2D"><span class="k">Supplier Incentive</span><span class="v">-${cur}${n2(incentive)}</span></div>` : ''}
    ${gst ? gstRows : ''}
    ${tds ? `<div class="r" style="color:#A07828"><span class="k">TDS (2%)</span><span class="v">${cur}${n2(tds)}</span></div>` : ''}
    <div class="net"><span class="k">NET COST (${esc(cur)})</span><span class="v">${cur}${n2(net)}</span></div>`;

  // bank (sales) from company-profile
  const bank = (prof.banks || []).find((b) => b.primary) || (prof.banks || [])[0] || {};
  const payBlock = isSale
    ? `<div class="lab2">Payment Details</div><div class="pay">${[bank.bankName ? `Bank: ${esc(bank.bankName)}` : '', bank.acNo ? `A/c: ${esc(bank.acNo)}` : '', bank.ifsc ? `IFSC: ${esc(bank.ifsc)}` : '', bank.swift ? `SWIFT: ${esc(bank.swift)}` : '', bank.branch ? `Branch: ${esc(bank.branch)}` : ''].filter(Boolean).join('<br>') || 'Bank details on file.'}</div>`
    : `<div class="lab2">Settlement</div><div class="pay">Payable to supplier per agreed credit terms.<br>Input GST credit claimed against supplier GSTIN.<br>Link No referenced for invoice-wise GP.</div>`;

  const headCols = isSale
    ? `<th class="l">Description</th><th>Basic Fare</th><th>K3 Tax</th><th>Taxes (YQ/YR)</th><th>Other Taxes</th><th>Total Fare</th>`
    : `<th class="l">Description</th><th>Basic Fare</th><th>K3 Tax</th><th>Taxes (YQ/YR)</th><th>Supplier Svc</th><th>Incentive</th><th>TDS (2%)</th><th>Total Cost</th>`;

  const sheet = `<div class="iv"><div class="sheet">
    <div class="title">${isSale ? 'INVOICE' : 'PURCHASE INVOICE'}</div><div class="title-rule"></div>
    <div class="tophead">
      <div class="logo-wrap">${CREST}<div><div class="lg">TRAVKINGS</div><div class="sb">TOURS &amp; TRAVELS PVT. LTD.</div></div></div>
      <div class="inv-meta">
        <div class="row firstline"><span class="k">${isSale ? 'Invoice No.' : 'Purchase Inv No.'}</span><span class="v big">${esc(vno || '(on approval)')}</span></div>
        <div class="row"><span class="k">Date</span><span class="v">${esc(booking.date || '')}</span></div>
        ${placeOfSupply ? `<div class="row"><span class="k">Place of Supply</span><span class="v">${esc(placeOfSupply)}</span></div>` : ''}
        <div class="row"><span class="k">Link No.</span><span class="v" style="color:var(--gold)">${esc(booking.linkNo || '—')}</span></div>
      </div>
    </div>
    <div class="blackrule"></div>
    <div class="parties">${isSale
      ? partyBlock('Billed To', party, cur) + partyBlock('Issued By', company, cur)
      : partyBlock('Supplier', party, cur) + partyBlock('Billed To (Buyer)', company, cur)}</div>
    <div class="fb-label">${isSale ? 'Fare Breakdown' : 'Cost Breakdown'}</div>
    <table><thead><tr>${headCols}</tr></thead><tbody>${fareRows || emptyRow}</tbody></table>
    <div class="summary"><div class="sumtbl">${sumtbl}</div></div>
    <div class="botrule"></div>
    <div class="botgrid">
      <div class="botleft"><div class="lab2">Amount in Words</div><div class="words">INR ${esc(inWords(net))} Only</div>${payBlock}</div>
      <div class="botright"><div class="for">For ${esc(company.name)}</div><div class="sigline"><div class="a">${esc(prof.authSignatory || 'Authorised Signatory')}</div><div class="b">${esc(prof.authDesignation || company.name)}</div></div></div>
    </div>
    <div class="terms">${isSale
      ? 'Terms &amp; Conditions: 1. Payment due as per agreed terms; delay attracts 18% p.a. 2. Service charges non-refundable; cancellations per supplier policy. 3. We act as intermediary; not liable for third-party delays/cancellations. E.&amp;O.E.'
      : 'Internal purchase record for accounting &amp; ITC. Cost net of supplier incentive per the GP working. Subject to reconciliation with the supplier statement / BSP. E.&amp;O.E.'}</div>
  </div></div>`;
  return `<style>${CSS}</style>${sheet}`;
}
