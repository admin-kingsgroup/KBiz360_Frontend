// Renders the REAL Sales (client version) + Purchase invoice HTML for ONE live DB
// booking via the app's buildBookingInvoice(), PLUS a SO/PO/GP working statement built
// from the same booking snapshot. Input: backend scripts/_one-invoice.json.
// Output: public/invoice-db.html (3 pages).
import fs from 'node:fs';
import { buildBookingInvoice } from '../src/core/invoiceHtml.js';
import { setBranchCfg } from '../src/core/referenceCache.js';

const SRC = '../kbiz360-erp-backend/scripts/_one-invoice.json';
const { booking, customerMaster = {}, supplierMaster = {} } = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const code = String(booking.branch || 'BOM').toUpperCase();

setBranchCfg([{
  code: 'BOM',
  entity: 'Travkings Tours & Travels',
  pan: 'AAMCT1096J', gstin: '27AAMCT1096J1ZU', tan: 'MUMT12345A',
  operAddr: 'Venus Tower, B 603, Veera Desai Rd, Azad Nagar 2, Mhada Colony, Jeevan Nagar, Andheri West, Mumbai, Maharashtra 400053',
  state: 'Maharashtra', stateCode: '27', cur_sym: '₹', currency: 'INR',
  phone: '+91 88280 06599', email: 'accounts.bom@travkings.com', website: 'www.travkings.com',
  authSignatory: 'Afshin Dhanani', authDesignation: 'Founder & Director',
  banks: [{ bankName: 'ICICI Bank', acName: 'Travkings Tours & Travels Private Limited', branch: 'Versova Link Road Branch, Andheri West', acNo: '333805003566', ifsc: 'ICIC0003338', swift: 'ICICINBBCTS', type: 'Current', primary: true }],
}]);

const branch = { code };
// Sales invoice = the CLIENT version (SVC2 margin already hidden/folded by the renderer).
let saleHtml = buildBookingInvoice(booking, 'sale', branch, customerMaster);
let purHtml = buildBookingInvoice(booking, 'purchase', branch, supplierMaster);

// ─── SO/PO/GP working statement (internal) ───────────────────────────────────
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n2 = (n) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const so = booking.so || {}, po = booking.po || {}, gp = booking.gp || {};
const soLines = Array.isArray(so.lines) ? so.lines : [];
const poLines = Array.isArray(po.lines) ? po.lines : [];
const paxName = (l) => [l.fn, l.sn].filter(Boolean).join(' ') || '—';

const soBody = soLines.map((l) => `<tr>
  <td class="l">${esc(paxName(l))}</td>
  <td>${n2(l.base)}</td><td>${n2(l.k3)}</td><td>${n2(l.tax)}</td>
  <td>${n2(l.markup)}</td><td>${n2(l.ssvc)}</td><td>${n2(l.gst != null ? l.gst : (Number(l.gstMk||0)+Number(l.gstSvc||0)))}</td>
  <td class="tf">${n2(l.total)}</td></tr>`).join('') || '<tr><td class="l" colspan="8" style="text-align:center;color:#9A9A9A;padding:14px">No SO lines.</td></tr>';

const poBody = poLines.map((l) => `<tr>
  <td class="l">${esc(paxName(l))}</td>
  <td>${n2(l.base)}</td><td>${n2(l.k3)}</td><td>${n2(l.tax)}</td>
  <td>${n2(l.psvc)}</td><td>${n2(l.incentive)}</td><td>${n2(l.tds)}</td><td>${n2(l.gst)}</td>
  <td class="tf">${n2(l.total)}</td></tr>`).join('') || '<tr><td class="l" colspan="9" style="text-align:center;color:#9A9A9A;padding:14px">No PO lines.</td></tr>';

const sumRow = (k, v, cls = '') => `<div class="r ${cls}"><span class="k">${esc(k)}</span><span class="v">₹${n2(v)}</span></div>`;
const saleTot = Number(so.total) || 0, costTot = Number(po.total) || 0;
const gpAmt = gp.total != null ? Number(gp.total) : (saleTot - costTot);
const gpPct = gp.pct != null ? Number(gp.pct) : (saleTot ? (gpAmt / saleTot) * 100 : 0);

const STMT_CSS = `
  .st{--gold:#A07828;--gold-l:#C49A3C;--dark:#111;--ink:#1A1A1A;--ink2:#3A3A3A;--ink3:#6A6A6A;--ink4:#9A9A9A;--rule:#DEDBD4;--bg-lt:#F2EFE9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:var(--ink);background:#fff}
  .st *{box-sizing:border-box;margin:0;padding:0}
  .st .sheet{max-width:860px;margin:0 auto;padding:30px 40px}
  .st .title{text-align:center;font-size:26px;font-weight:800;letter-spacing:2px}
  .st .title-rule{height:1px;background:var(--gold);margin:9px 0 18px}
  .st .meta{display:flex;flex-wrap:wrap;gap:6px 28px;margin-bottom:14px}
  .st .meta .m{font-size:11px;color:var(--ink3)} .st .meta .m b{color:var(--ink);font-weight:700}
  .st .blackrule{height:2.5px;background:var(--dark);margin:8px 0 18px}
  .st .sec{font-size:10px;font-weight:700;letter-spacing:1.2px;color:var(--gold);text-transform:uppercase;margin:18px 0 8px}
  .st table{width:100%;border-collapse:collapse;margin-bottom:6px}
  .st thead th{font-size:8.5px;font-weight:700;color:var(--ink3);text-transform:uppercase;text-align:right;padding:7px 8px;background:var(--bg-lt);border-top:2px solid var(--dark);border-bottom:2px solid var(--dark)}
  .st thead th.l{text-align:left}
  .st tbody td{padding:9px 8px;border-bottom:1px solid var(--rule);font-size:11px;text-align:right}
  .st tbody td.l{text-align:left}
  .st td.tf{font-weight:800}
  .st .tt{display:flex;justify-content:flex-end;margin:4px 0 2px}
  .st .sumtbl{width:330px}
  .st .sumtbl .r{display:flex;justify-content:space-between;padding:6px 4px;font-size:11.5px;border-bottom:1px solid var(--rule)}
  .st .sumtbl .r .k{color:var(--ink2)} .st .sumtbl .r .v{font-weight:800}
  .st .sumtbl .r.dim .k,.st .sumtbl .r.dim .v{color:var(--ink4);font-weight:600}
  .st .gpcard{display:flex;gap:14px;margin-top:18px}
  .st .gpcard .box{flex:1;border:1px solid var(--rule);border-radius:8px;padding:14px 16px;text-align:center}
  .st .gpcard .box .lab{font-size:9px;letter-spacing:1px;color:var(--ink4);text-transform:uppercase;margin-bottom:6px}
  .st .gpcard .box .val{font-size:18px;font-weight:800}
  .st .gpcard .box.net{background:var(--dark);border-color:var(--dark)} .st .gpcard .box.net .lab{color:#cbb994} .st .gpcard .box.net .val{color:var(--gold-l)}
  @media print{@page{size:A4 portrait;margin:9mm} .st .sheet{padding:0;max-width:100%} .st *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;

const stmtHtml = `<style>${STMT_CSS}</style><div class="st"><div class="sheet">
  <div class="title">SO / PO / GP WORKING</div><div class="title-rule"></div>
  <div class="meta">
    <div class="m">Booking <b>${esc(booking.bookingNo || '')}</b></div>
    <div class="m">Link No <b style="color:#A07828">${esc(booking.linkNo || '—')}</b></div>
    <div class="m">Module <b>${esc(booking.module || '')}</b></div>
    <div class="m">Date <b>${esc(booking.date || '')}</b></div>
    <div class="m">GST Mode <b>${esc(booking.gstMode || '')}</b></div>
    <div class="m">Customer <b>${esc(booking.customer?.name || '')}</b></div>
    <div class="m">Supplier <b>${esc(booking.supplier?.name || '')}</b></div>
    <div class="m">SO Vno <b>${esc(booking.saleVno || '')}</b></div>
    <div class="m">PO Vno <b>${esc(booking.purchaseVno || '')}</b></div>
  </div>
  <div class="blackrule"></div>

  <div class="sec">Sales Order (SO) — what the client is billed</div>
  <table><thead><tr><th class="l">Passenger</th><th>Base Fare</th><th>K3</th><th>Taxes</th><th>SVC2 (margin)</th><th>SVF (svc fee)</th><th>GST</th><th>Line Total</th></tr></thead>
    <tbody>${soBody}</tbody></table>
  <div class="tt"><div class="sumtbl">
    ${sumRow('Line Total', so.lineTotal)}
    ${sumRow('Service Fee (SVF)', so.serviceCharge)}
    ${sumRow('GST (SVF)', so.gst)}
    ${sumRow('GST on SVC2 margin (folded)', so.otherTaxesGst, 'dim')}
    ${Number(so.tcs) ? sumRow('TCS', so.tcs) : ''}
    <div class="r" style="border-bottom:none;background:#111;color:#fff;padding:10px 12px;margin-top:4px"><span class="k" style="color:#fff;font-weight:700">SO TOTAL</span><span class="v" style="color:#C49A3C;font-size:15px">₹${n2(so.total)}</span></div>
  </div></div>

  <div class="sec">Purchase Order (PO) — what we pay the supplier</div>
  <table><thead><tr><th class="l">Passenger</th><th>Base Fare</th><th>K3</th><th>Taxes</th><th>Supp Svc Chg</th><th>Incentive</th><th>TDS</th><th>GST</th><th>Line Total</th></tr></thead>
    <tbody>${poBody}</tbody></table>
  <div class="tt"><div class="sumtbl">
    ${sumRow('Line Total', po.lineTotal)}
    ${sumRow('Supplier Service Charge', po.serviceCharge)}
    ${Number(po.incentiveAmt) ? sumRow('Supplier Incentive', po.incentiveAmt) : ''}
    ${Number(po.gst) ? sumRow('GST', po.gst) : ''}
    ${Number(po.incentiveTds) ? sumRow('Incentive TDS', po.incentiveTds) : ''}
    <div class="r" style="border-bottom:none;background:#111;color:#fff;padding:10px 12px;margin-top:4px"><span class="k" style="color:#fff;font-weight:700">PO TOTAL</span><span class="v" style="color:#C49A3C;font-size:15px">₹${n2(po.total)}</span></div>
  </div></div>

  <div class="sec">Gross Profit (GP)</div>
  <div class="gpcard">
    <div class="box"><div class="lab">Sale (SO Total)</div><div class="val">₹${n2(saleTot)}</div></div>
    <div class="box"><div class="lab">Cost (PO Total)</div><div class="val">₹${n2(costTot)}</div></div>
    <div class="box net"><div class="lab">Gross Profit</div><div class="val">₹${n2(gpAmt)}</div></div>
    <div class="box net"><div class="lab">GP %</div><div class="val">${n2(gpPct)}%</div></div>
  </div>
</div></div>`;

// Inline real brand PNGs so the file opens via file://; placeholder if absent.
const dataSvg = (w, h, inner) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${inner}</svg>`);
const tkHolder = dataSvg(210, 52, `<rect width="210" height="52" rx="6" fill="#FDFAF4" stroke="#C49A3C"/><text x="105" y="25" text-anchor="middle" font-family="Arial" font-size="16" font-weight="800" fill="#111" letter-spacing="2">TRAVKINGS</text><text x="105" y="41" text-anchor="middle" font-family="Arial" font-size="6.5" font-weight="700" fill="#6A6A6A" letter-spacing="2">TOURS &amp; TRAVELS PVT. LTD.</text>`);
const iataHolder = dataSvg(50, 30, `<rect width="50" height="30" rx="4" fill="#eee" stroke="#bbb"/><text x="25" y="20" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#111">IATA</text>`);
const dataUri = (p) => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
const wire = (html) => {
  let out = html;
  out = out.split('/travkings-logo.png').join(fs.existsSync('public/travkings-logo.png') ? dataUri('public/travkings-logo.png') : tkHolder);
  out = out.split('/iata-logo.png').join(fs.existsSync('public/iata-logo.png') ? dataUri('public/iata-logo.png') : iataHolder);
  return out;
};
saleHtml = wire(saleHtml);
purHtml = wire(purHtml);

const meta = `${booking.bookingNo || ''} · ${booking.linkNo || ''} · ${booking.module || ''} · ${code}`;
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KBiz360 — ${esc(meta)}</title>
<style>
  html,body{margin:0;padding:0;background:#9aa0ad;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-family:Arial,Helvetica,sans-serif}
  .bar{position:sticky;top:0;z-index:10;background:#0d1326;color:#fff;padding:10px 16px;font-size:12.5px;display:flex;gap:10px;align-items:center;justify-content:center;text-align:center}
  .bar b{color:#d4a437}
  .sheetwrap{max-width:900px;margin:18px auto;background:#fff;box-shadow:0 0 18px rgba(0,0,0,.32)}
  @media print{ body{background:#fff} .bar{display:none} .sheetwrap{box-shadow:none;margin:0;max-width:100%} .pb{page-break-before:always} @page{size:A4 portrait;margin:9mm} }
</style></head><body>
  <div class="bar">LIVE DB · <b>&nbsp;${esc(meta)}&nbsp;</b> · Ctrl/Cmd + P → Save as PDF · P1 Sales Invoice (client) · P2 Purchase Invoice · P3 SO/PO/GP</div>
  <div class="sheetwrap">${saleHtml}</div>
  <div class="sheetwrap pb">${purHtml}</div>
  <div class="sheetwrap pb">${stmtHtml}</div>
</body></html>`;

fs.writeFileSync('public/invoice-db.html', page);
console.log('Wrote public/invoice-db.html (' + page.length + ' bytes) for', booking.bookingNo, booking.linkNo);
