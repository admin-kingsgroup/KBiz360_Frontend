// Demo-invoice generator — renders REAL buildBookingInvoice() output with sample
// data for SEVERAL modules so the per-module SO/PO breakdown columns, the logo
// header, and the spacing can be eyeballed/printed. Bundled via esbuild then run in
// Node. Output: public/invoice-demo.html → open http://localhost:5173/invoice-demo.html
import fs from 'node:fs';
import { buildBookingInvoice } from '../src/core/invoiceHtml.js';
import { setBranchCfg } from '../src/core/referenceCache.js';
import { VSPECS, bookingTotals } from '../src/core/voucherSpecs.js';

// Seed the BOM company profile so the demo header matches the live app.
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
    { bankName: 'ICICI Bank', acName: 'Travkings Tours & Travels Private Limited', branch: 'Versova Link Road Branch, Andheri West', acNo: '333805003566', ifsc: 'ICIC0003338', swift: 'ICICINBBCTS', type: 'Current', primary: true },
  ],
}]);

// A real B2B buyer with billing details, so the "Billed To" block is populated.
const customer = { name: 'NeuIQ Technologies Private Limited', ledgerName: 'NeuIQ Technologies Private Limited', ledgerGroup: 'B2E', gstin: '27AABCN1234Q1Z5', address: 'Lvl 7, Cyber Tower, BKC, Mumbai 400051', email: 'accounts@neuiq.com', contact: '+91 22 4000 1234' };
const supplier = { name: 'Emirates Airlines', ledgerName: 'Emirates Airlines', ledgerGroup: 'Supplier Air Lines', gstin: '27AAACE1234F1Z9', address: 'BKC, Mumbai', email: 'gsa@emirates-in.com', contact: '+91 22 5000 9000' };

const secs = (tkt) => ([
  { sector: 'BOM → DXB', airline: 'Emirates (EK)', flightNo: 'EK-501', ticketNo: tkt[0], pnr: 'ABC123', travelDate: '12 Jul 2026' },
  { sector: 'DXB → BOM', airline: 'Emirates (EK)', flightNo: 'EK-504', ticketNo: tkt[1], pnr: 'ABC123', travelDate: '20 Jul 2026' },
]);

// One booking per module. so/po snapshots are computed by bookingTotals() so the
// summary + the breakdown TOTAL row tie exactly to the per-line math.
const MODULES = [
  {
    module: 'SF', packageType: '', headerRef: 'Dubai Corporate Travel — 2 Pax',
    rows: [
      { fn: 'Farhan', sn: 'Shaikh', base: 18000, k3: 1200, tax: 3500, psvc: 0, markup: 1500, ssvc: 200, incentive: 800, sectors: secs(['176-1234567890', '176-1234567891']) },
      { fn: 'Sara', sn: 'Khan', base: 18000, k3: 1200, tax: 3500, psvc: 0, markup: 1500, ssvc: 200, incentive: 800, sectors: secs(['176-1234567892', '176-1234567893']) },
    ],
  },
  {
    module: 'SHT', packageType: '', headerRef: 'Mumbai Hotel Stay — 3N',
    rows: [
      { fn: 'Priya', sn: 'Nair', htl: 'Taj Lands End', conf: 'HT5567', base: 18000, tax: 900, psvc: 500, markup: 2000, ssvc: 300, incentive: 0 },
      { fn: 'Rohit', sn: 'Verma', htl: 'Taj Lands End', conf: 'HT5568', base: 18000, tax: 900, psvc: 500, markup: 2000, ssvc: 300, incentive: 0 },
    ],
  },
  {
    module: 'SH', packageType: 'International', headerRef: 'Bali Holiday Package — 5N / 6D',
    rows: [
      { fn: 'Rahul', sn: 'Mehta', pkg: 'Bali 5N', ref: 'HL2201', base: 85000, psvc: 1000, psvcGst: 180, markup: 12000, incentive: 500 },
    ],
  },
  {
    module: 'SV', packageType: '', headerRef: 'UAE Visa — 2 Pax',
    rows: [
      { fn: 'Amit', sn: 'Shah', country: 'UAE', pp: 'P1234567', base: 4500, tax: 0, psvc: 250, markup: 800, ssvc: 200, incentive: 0 },
      { fn: 'Neha', sn: 'Shah', country: 'UAE', pp: 'P1234568', base: 4500, tax: 0, psvc: 250, markup: 800, ssvc: 200, incentive: 0 },
    ],
  },
  {
    module: 'SC', packageType: '', headerRef: 'Mumbai – Pune Car Rental',
    rows: [
      { fn: 'Vikram', sn: 'Rao', veh: 'Innova Crysta', route: 'BOM – Pune', base: 2800, tax: 0, psvc: 0, markup: 500, ssvc: 100, incentive: 0 },
    ],
  },
  {
    module: 'SI', packageType: '', headerRef: 'Schengen Travel Insurance — 2 Pax',
    rows: [
      { fn: 'Sara', sn: 'Khan', plan: 'Schengen 30D', pol: 'INS8890', base: 1800, tax: 0, psvc: 0, markup: 400, ssvc: 100, incentive: 0 },
      { fn: 'Imran', sn: 'Khan', plan: 'Schengen 30D', pol: 'INS8891', base: 1800, tax: 0, psvc: 0, markup: 400, ssvc: 100, incentive: 0 },
    ],
  },
  {
    module: 'SM', packageType: '', headerRef: 'Documentation & Misc Services',
    rows: [
      { fn: 'Neha', sn: 'Joshi', svc: 'Documentation', ref: 'MS1102', base: 900, tax: 0, psvc: 0, markup: 200, ssvc: 100, incentive: 0 },
    ],
  },
];

const sheets = [];
for (const m of MODULES) {
  const spec = VSPECS[m.module];
  const t = bookingTotals(spec, m.rows, { packageType: m.packageType, branch: 'BOM' });
  const booking = {
    date: '18 Jun 2026', branch: 'BOM', module: m.module, headerRef: m.headerRef,
    linkNo: 'BOM-LNK-2026-0142', saleVno: 'BOM/INV/26/0042', purchaseVno: 'BOM/PINV/26/0042',
    gstMode: 'intra', packageType: m.packageType, customer, supplier, rows: m.rows, so: t.so, po: t.po,
  };
  const branch = { code: 'BOM' };
  sheets.push({ label: `${spec.name} — Sales`, html: buildBookingInvoice(booking, 'sale', branch, {}) });
  sheets.push({ label: `${spec.name} — Purchase`, html: buildBookingInvoice(booking, 'purchase', branch, {}) });
}

// Inline the brand PNGs so the demo is self-contained / openable via file://; fall
// back to a labelled SVG placeholder when a file is missing.
const dataSvg = (w, h, inner) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${inner}</svg>`);
const tkHolder = dataSvg(210, 52, `<rect width="210" height="52" rx="6" fill="#FDFAF4" stroke="#C49A3C"/><text x="105" y="25" text-anchor="middle" font-family="Arial" font-size="16" font-weight="800" fill="#111" letter-spacing="2">TRAVKINGS</text><text x="105" y="41" text-anchor="middle" font-family="Arial" font-size="6.5" font-weight="700" fill="#6A6A6A" letter-spacing="2">TOURS &amp; TRAVELS PVT. LTD.</text>`);
const iataHolder = dataSvg(50, 30, `<rect width="50" height="30" rx="4" fill="#eee" stroke="#bbb"/><text x="25" y="20" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#111">IATA</text>`);
const upiHolder = dataSvg(96, 96, `<rect width="96" height="96" fill="#fff" stroke="#bbb"/><text x="48" y="50" text-anchor="middle" font-family="Arial" font-size="9" fill="#999">UPI QR</text>`);
const dataUri = (p) => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
const wire = (html) => {
  let out = html;
  out = out.split('/travkings-logo.png').join(fs.existsSync('public/travkings-logo.png') ? dataUri('public/travkings-logo.png') : tkHolder);
  out = out.split('/iata-logo.png').join(fs.existsSync('public/iata-logo.png') ? dataUri('public/iata-logo.png') : iataHolder);
  out = out.split('/upi-qr.png').join(fs.existsSync('public/upi-qr.png') ? dataUri('public/upi-qr.png') : upiHolder);
  return out;
};

const body = sheets.map((s, i) => `<div class="sheetwrap${i ? ' pb' : ''}"><div class="tag">${s.label}</div>${wire(s.html)}</div>`).join('\n');

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KBiz360 — Demo Invoices (per module)</title>
<style>
  html,body{margin:0;padding:0;background:#9aa0ad;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-family:Arial,Helvetica,sans-serif}
  .bar{position:sticky;top:0;z-index:10;background:#0d1326;color:#fff;padding:10px 16px;font-size:13px;display:flex;gap:10px;align-items:center;justify-content:center}
  .bar b{color:#d4a437}
  .sheetwrap{position:relative;max-width:820px;margin:18px auto;background:#fff;box-shadow:0 0 18px rgba(0,0,0,.32)}
  .tag{position:absolute;top:-13px;left:14px;background:#d4a437;color:#0d1326;font-size:11px;font-weight:800;padding:3px 10px;border-radius:5px;letter-spacing:.4px}
  @media print{
    body{background:#fff}
    .bar,.tag{display:none}
    .sheetwrap{box-shadow:none;margin:0;max-width:100%}
    .pb{page-break-before:always}
    @page{size:A4 portrait;margin:9mm}
  }
</style></head><body>
  <div class="bar">Demo invoices — Flight · Hotel · Holiday (each Sales + Purchase). Press <b>&nbsp;Ctrl / Cmd + P&nbsp;</b> → <b>&nbsp;Save as PDF</b> (Portrait).</div>
  ${body}
</body></html>`;

fs.writeFileSync('public/invoice-demo.html', page);
console.log('Wrote public/invoice-demo.html (' + page.length + ' bytes) · ' + sheets.length + ' sheets');
console.log('Logos: travkings-logo.png ' + (fs.existsSync('public/travkings-logo.png') ? 'FOUND' : 'placeholder') + ' · iata-logo.png ' + (fs.existsSync('public/iata-logo.png') ? 'FOUND' : 'placeholder'));
