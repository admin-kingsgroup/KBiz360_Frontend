// Demo-invoice generator — renders REAL buildBookingInvoice() output with sample
// data so the logo header, B2C pax-name billing, and the description spacing can be
// eyeballed/printed. Bundled via esbuild (deps contain JSX) then run in Node.
// Output: public/invoice-demo.html  → open http://localhost:5173/invoice-demo.html
import fs from 'node:fs';
import { buildBookingInvoice } from '../src/core/invoiceHtml.js';
import { setBranchCfg } from '../src/core/referenceCache.js';

// Seed the BOM company profile from the backend reference seed
// (kbiz360-erp-backend/scripts/migrate-reference-data.js) so the demo header matches
// what the real app shows. NOTE: these are the seed's placeholder registration values
// — the live invoice reads the real profile from the DB at runtime.
setBranchCfg([{
  code: 'BOM',
  entity: 'Travkings Tours & Travels',
  pan: 'AAMCT1096J', gstin: '27AAMCT1096J1ZU', tan: 'MUMT12345A',
  operAddr: 'Venus Tower, B 603, Veera Desai Rd, Azad Nagar 2, Mhada Colony, Jeevan Nagar, Andheri West, Mumbai, Maharashtra 400053',
  regAddr: 'Venus Tower, B 603, Veera Desai Rd, Azad Nagar 2, Mhada Colony, Jeevan Nagar, Andheri West, Mumbai, Maharashtra 400053', pin: '400053',
  state: 'Maharashtra', stateCode: '27',
  cur_sym: '₹', currency: 'INR',
  phone: '+91 88280 06599', email: 'accounts.bom@travkings.com', website: 'www.travkings.com',
  authSignatory: 'Afshin Dhanani', authDesignation: 'Founder & Director',
  banks: [
    { bankName: 'HDFC Bank', branch: 'Nariman Point', acNo: '50100123456789', ifsc: 'HDFC0001234', swift: '', type: 'Current', primary: true },
    { bankName: 'ICICI Bank', branch: 'Fort', acNo: '123456789012', ifsc: 'ICIC0001234', swift: '', type: 'Current', primary: false },
  ],
}]);

const secs = (tkt) => ([
  { sector: 'BOM → DXB', airline: 'Emirates (EK)', flightNo: 'EK-501', ticketNo: tkt[0], pnr: 'ABC123', travelDate: '12 Jul 2026' },
  { sector: 'DXB → BOM', airline: 'Emirates (EK)', flightNo: 'EK-504', ticketNo: tkt[1], pnr: 'ABC123', travelDate: '20 Jul 2026' },
]);

const rows = [
  { fn: 'Farhan', sn: 'Shaikh', base: 18000, k3: 1200, tax: 3500, markup: 1500, psvc: 0, incentive: 800, tds: 16, sectors: secs(['176-1234567890', '176-1234567891']) },
  { fn: 'Sara',   sn: 'Khan',   base: 18000, k3: 1200, tax: 3500, markup: 1500, psvc: 0, incentive: 800, tds: 16, sectors: secs(['176-1234567892', '176-1234567893']) },
];

const booking = {
  date: '18 Jun 2026',
  branch: 'BOM',
  headerRef: 'Dubai Family Holiday — 8N / 9D',
  linkNo: 'BOM-LNK-2026-0142',
  saleVno: 'BOM/INV/26/0042',
  purchaseVno: 'BOM/PINV/26/0042',
  gstMode: 'intra',
  // B2C: pooled ledger "B2C Ref Farhan" — the Billed-To should resolve to the first
  // passenger (Farhan Shaikh), NOT the ledger.
  customer: { name: 'B2C Ref Farhan', ledgerName: 'B2C Ref Farhan', ledgerGroup: 'B2C Ref', group: 'B2C Ref', gstin: '', address: 'Bandra West, Mumbai 400050', email: 'farhan@example.com', contact: '+91 98200 11223' },
  supplier: { name: 'Emirates Airlines', ledgerName: 'Emirates Airlines', ledgerGroup: 'Supplier Air Lines', gstin: '27AAACE1234F1Z9', address: 'BKC, Mumbai', email: 'gsa@emirates-in.com', contact: '+91 22 5000 9000' },
  rows,
  so: { lineTotal: 48400, serviceCharge: 0, gst: 457.63, tcs: 0, total: 48857.63 },
  po: { lineTotal: 45400, serviceCharge: 0, gst: 0, incentiveAmt: 1600, incentiveTds: 32, total: 45400 },
};

const branch = { code: 'BOM' };
let saleHtml = buildBookingInvoice(booking, 'sale', branch, {});
let purHtml = buildBookingInvoice(booking, 'purchase', branch, {});

// If the brand PNGs aren't in /public yet, swap the <img> src for a labelled SVG
// placeholder so the demo still renders (real logos appear once the files exist).
const dataSvg = (w, h, inner) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${inner}</svg>`);
const tkHolder = dataSvg(210, 52, `<rect width="210" height="52" rx="6" fill="#FDFAF4" stroke="#C49A3C"/><text x="105" y="25" text-anchor="middle" font-family="Arial" font-size="16" font-weight="800" fill="#111" letter-spacing="2">TRAVKINGS</text><text x="105" y="41" text-anchor="middle" font-family="Arial" font-size="6.5" font-weight="700" fill="#6A6A6A" letter-spacing="2">TOURS &amp; TRAVELS PVT. LTD.</text>`);
const iataHolder = dataSvg(50, 30, `<rect width="50" height="30" rx="4" fill="#eee" stroke="#bbb"/><text x="25" y="20" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#111">IATA</text>`);
// Inline the real PNGs (so the demo is self-contained / openable via file://); fall
// back to a labelled placeholder when a file is missing.
const dataUri = (p) => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
const wire = (html) => {
  let out = html;
  out = out.split('/travkings-logo.png').join(fs.existsSync('public/travkings-logo.png') ? dataUri('public/travkings-logo.png') : tkHolder);
  out = out.split('/iata-logo.png').join(fs.existsSync('public/iata-logo.png') ? dataUri('public/iata-logo.png') : iataHolder);
  return out;
};
saleHtml = wire(saleHtml);
purHtml = wire(purHtml);

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KBiz360 — Demo Invoice (Sales + Purchase)</title>
<style>
  html,body{margin:0;padding:0;background:#9aa0ad;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-family:Arial,Helvetica,sans-serif}
  .bar{position:sticky;top:0;z-index:10;background:#0d1326;color:#fff;padding:10px 16px;font-size:13px;display:flex;gap:10px;align-items:center;justify-content:center}
  .bar b{color:#d4a437}
  .sheetwrap{max-width:900px;margin:18px auto;background:#fff;box-shadow:0 0 18px rgba(0,0,0,.32)}
  @media print{
    body{background:#fff}
    .bar{display:none}
    .sheetwrap{box-shadow:none;margin:0;max-width:100%}
    .pb{page-break-before:always}
    @page{size:A4 portrait;margin:9mm}
  }
</style></head><body>
  <div class="bar">Demo invoice — press <b>&nbsp;Ctrl / Cmd + P&nbsp;</b> → <b>&nbsp;Save as PDF</b>. Page 1 = Sales · Page 2 = Purchase.</div>
  <div class="sheetwrap">${saleHtml}</div>
  <div class="sheetwrap pb">${purHtml}</div>
</body></html>`;

fs.writeFileSync('public/invoice-demo.html', page);
console.log('Wrote public/invoice-demo.html (' + page.length + ' bytes)');
console.log('Logos: travkings-logo.png ' + (fs.existsSync('public/travkings-logo.png') ? 'FOUND' : 'placeholder') + ' · iata-logo.png ' + (fs.existsSync('public/iata-logo.png') ? 'FOUND' : 'placeholder'));
