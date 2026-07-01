// ─── Final-print invoice renderer (Sales + Purchase) ─────────────────────────
// Builds the Travkings invoice HTML (matching invoice-templates/*.html) from a
// LIVE approved booking. Used by Module Registers + SO/PO/GP Approvals.
import { bc } from './styleTokens';
import { companyProfile, hsnSacFor } from './referenceCache';
import { VSPECS, lineCalc, isVatBranch } from './voucherSpecs';

// Booking module code → HSN/SAC master module name (the master is keyed by name).
const MODULE_NAME = {
  SF: 'Flight', RF: 'Flight', RI: 'Flight', SH: 'Hotel', SHT: 'Holiday', HP: 'Holiday',
  SC: 'Car', SV: 'Visa', SI: 'Insurance', SM: 'Misc', MS: 'Misc',
};

const GST_STATES = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand',
  '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
  '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya',
  '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
  '24': 'Gujarat', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
};
// SAC (Service Accounting Code) per booking module — used ONLY as a fallback when the
// live HSN/SAC master (Masters › Tax & Currency › Tax / HSN-SAC Codes) hasn't loaded.
const SAC_BY_MODULE = {
  SF: '996421', RF: '996421', RI: '996421',       // air ticketing / refund / reissue
  SH: '996311',                                    // hotel accommodation
  SHT: '998555', HP: '998555',                     // holiday / tour package
  SC: '996601', SV: '998212', SI: '997131',        // car rental / visa / travel insurance
  SM: '998599', MS: '998599',                      // misc travel arrangement
};

// Seeded issuer (Issued By) + bank fallback for the India GST branches. The invoice's
// issuer/bank/place-of-supply all read from the live company-profile cache; when that
// cache is empty at print time (profiles not yet hydrated, or the collection unseeded
// after a data reset) these keep the printed invoice complete. Live DB values always
// win field-by-field (see the merge in buildBookingInvoice).
const ISSUER_FALLBACK = {
  BOM: {
    entity: 'Travkings Tours & Travels', gstin: '27AAMCT1096J1ZU', state: 'Maharashtra', stateCode: '27',
    operAddr: 'Venus Tower, B 603, Veera Desai Rd, Azad Nagar 2, Mhada Colony, Jeevan Nagar, Andheri West, Mumbai, Maharashtra 400053',
    phone: '+91 88280 06599', email: 'accounts.bom@travkings.com', cur_sym: '₹',
    authSignatory: 'Afshin Dhanani', authDesignation: 'Founder & Director',
    banks: [
      { bankName: 'ICICI Bank', acName: 'Travkings Tours & Travels Private Limited', branch: 'Versova Link Road Branch, Andheri West', acNo: '333805003566', ifsc: 'ICIC0003338', swift: 'ICICINBBCTS', type: 'Current', primary: true },
    ],
  },
  AMD: {
    entity: 'Travkings Tours & Travels', gstin: '24AABCT1234H1Z2', state: 'Gujarat', stateCode: '24',
    operAddr: '202, Shapath IV, SG Highway, Ahmedabad 380 054',
    phone: '+91 79 4000 5678', email: 'ahmedabad@travkings.com', cur_sym: '₹',
    authSignatory: 'Afshin Dhanani', authDesignation: 'Founder & Director',
    banks: [{ bankName: 'ICICI Bank', branch: 'CG Road', acNo: '987654321098', ifsc: 'ICIC0005678', type: 'Current', primary: true }],
  },
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
  .iv .sheet{max-width:820px;margin:0 auto;background:var(--paper);padding:14px 26px}
  .iv .title{text-align:center;font-size:23px;font-weight:800;letter-spacing:2px}
  .iv .title-rule{height:1px;background:var(--gold);margin:6px 0 11px}
  .iv .tophead{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
  .iv .brandcol{display:flex;flex-direction:column;align-items:flex-start}
  .iv .tk-logo{height:66px;width:auto;display:block;image-rendering:-webkit-optimize-contrast}
  .iv .titlebar{position:relative;display:flex;align-items:center;justify-content:center}
  .iv .iata-box{position:absolute;right:0;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:flex-end;gap:3px}
  .iv .iata-badge{height:26px;width:auto;display:block}
  .iv .iata-no{font-size:8.5px;font-weight:700;letter-spacing:.4px;color:var(--ink3);white-space:nowrap}
  .iv .inv-meta{display:grid;grid-template-columns:auto auto;column-gap:16px;row-gap:6px;justify-content:end;align-items:baseline;min-width:260px}
  .iv .inv-meta .k{font-size:9px;letter-spacing:1px;color:var(--ink4);text-transform:uppercase;text-align:right;white-space:nowrap}
  .iv .inv-meta .v{font-size:12.5px;font-weight:700;text-align:right;white-space:nowrap}
  .iv .inv-meta .v.big{font-size:17px;font-weight:800}
  .iv .inv-meta .divider{grid-column:1/-1;height:1px;background:var(--rule);margin:2px 0}
  .iv .blackrule{height:2.5px;background:var(--dark);margin:9px 0 11px}
  .iv .parties{display:flex;margin-bottom:11px}
  .iv .party{flex:1;padding-right:24px}
  .iv .party+.party{padding-left:24px;border-left:1px solid var(--rule)}
  .iv .party .lab{font-size:9.5px;font-weight:700;letter-spacing:1.2px;color:var(--gold);text-transform:uppercase;margin-bottom:5px}
  .iv .party .nm{font-size:15px;font-weight:800;margin-bottom:5px}
  .iv .party .ln{font-size:10.5px;color:var(--ink3);line-height:1.5}
  .iv .fb-label{font-size:9.5px;font-weight:700;letter-spacing:1.2px;color:var(--gold);text-transform:uppercase;margin-bottom:5px}
  .iv .fb-ref{font-size:11px;font-weight:600;letter-spacing:0;color:var(--ink3);text-transform:none}
  .iv table{width:100%;border-collapse:collapse}
  .iv thead th{font-size:7.5px;font-weight:700;color:var(--ink3);text-transform:uppercase;text-align:right;padding:6px 4px;line-height:1.25;background:var(--bg-lt);border-top:2px solid var(--dark);border-bottom:2px solid var(--dark)}
  .iv thead th.l{text-align:left}
  .iv tbody td{padding:6px 4px;border-bottom:1px solid var(--rule);font-size:8.5px;text-align:right;vertical-align:top;white-space:nowrap}
  .iv tbody td.l{text-align:left;white-space:normal}
  .iv td.gold{color:var(--gold);font-weight:700}
  .iv tfoot td{padding:7px 4px;font-size:8.5px;font-weight:800;text-align:right;background:var(--bg-lt);border-top:2px solid var(--dark)}
  .iv tfoot td.l{text-align:left}
  .iv .secrow td{background:#FAF7EF;padding:5px 8px 7px}
  .iv .secrow .seclab{font-size:8px;font-weight:700;letter-spacing:.6px;color:var(--ink4);text-transform:uppercase;margin-right:10px;vertical-align:top}
  .iv .secrow .secs{margin-top:3px;display:flex;flex-direction:column;gap:3px}
  .iv .secrow .sub.sec{color:var(--ink3);padding-left:12px;position:relative;white-space:nowrap;font-size:8.5px}
  .iv .secrow .sub.sec::before{content:"›";position:absolute;left:0;color:var(--gold);font-weight:700}
  .iv .desc .nm{font-size:12.5px;font-weight:800;line-height:1.35;margin-bottom:5px}
  .iv .desc .sub{font-size:10px;line-height:1.6}
  .iv .desc .idl{color:var(--ink2)}
  .iv .desc .secs{margin-top:6px;display:flex;flex-direction:column;gap:4px}
  .iv .desc .sub.sec{color:var(--ink4);padding-left:12px;position:relative;white-space:nowrap;font-size:9px}
  .iv .desc .sub.sec::before{content:"›";position:absolute;left:0;color:var(--gold);font-weight:700}
  .iv td.tf{font-weight:800}
  .iv .summary{display:flex;justify-content:space-between;align-items:flex-end;gap:30px;margin-top:9px}
  .iv .sumtbl{width:360px;flex:0 0 360px}
  .iv .sumleft{padding-bottom:8px;min-width:140px}
  .iv .hsnval{font-size:15px;font-weight:800;color:var(--ink);letter-spacing:.5px}
  .iv .sumtbl .r{display:flex;justify-content:space-between;padding:5px 4px;font-size:11px;border-bottom:1px solid var(--rule)}
  .iv .sumtbl .r .k{color:var(--ink2)} .iv .sumtbl .r .v{font-weight:800}
  .iv .sumtbl .net{display:flex;justify-content:space-between;align-items:center;background:var(--dark);color:#fff;padding:9px 14px;margin-top:3px}
  .iv .sumtbl .net .k{font-size:11px;font-weight:700;letter-spacing:1px}
  .iv .sumtbl .net .v{font-size:16px;font-weight:800;color:var(--gold-l)}
  .iv .botrule{height:1px;background:var(--rule);margin:10px 0 8px}
  .iv .botgrid{display:flex;justify-content:space-between;gap:30px}
  .iv .botleft{flex:1}
  .iv .lab2{font-size:9.5px;font-weight:700;letter-spacing:1.1px;color:var(--gold);text-transform:uppercase;margin-bottom:4px}
  .iv .words{font-size:10.5px;font-style:italic;color:var(--ink2);margin-bottom:8px}
  .iv .pay{font-size:10px;color:var(--ink2);line-height:1.55}
  .iv .paygrid{display:flex;gap:26px;align-items:flex-start;margin-top:2px}
  .iv .bankcol{flex:1}
  .iv .upicol{flex:0 0 auto;text-align:center}
  .iv .upi-qr{width:78px;height:78px;display:block;margin:2px auto 3px;border:1px solid var(--rule);padding:3px;background:#fff}
  .iv .upi-id{font-size:7.5px;font-weight:700;color:var(--ink2);max-width:140px;word-break:break-all;line-height:1.35}
  .iv .botright{width:280px;text-align:right}
  .iv .botright .for{font-size:11px;font-weight:700;color:var(--gold)}
  .iv .botright .sigline{margin-top:26px;border-top:1px solid var(--ink3);padding-top:6px}
  .iv .botright .sigline .a{font-size:11.5px;font-weight:700}
  .iv .botright .sigline .b{font-size:9.5px;color:var(--ink4)}
  .iv .terms{margin-top:10px;font-size:8.5px;color:var(--ink4);line-height:1.5}
  @media print{.iv .sheet{padding:0;max-width:100%} .iv tr,.iv .parties,.iv .summary,.iv .botgrid{page-break-inside:avoid} .iv *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;

const partyBlock = (lab, p, cur, idLabel = 'GSTIN') => `<div class="party"><div class="lab">${esc(lab)}</div><div class="nm">${esc(p.name || '—')}</div><div class="ln">${[p.address, p.gstin ? `${idLabel} : ${esc(p.gstin)}` : '', p.email ? `Email : ${esc(p.email)}` : '', p.contact ? `Contact : ${esc(p.contact)}` : ''].filter(Boolean).map(esc).join('<br>')}</div></div>`;

// side: 'sale' | 'purchase'. `master` = the resolved customer/supplier master record
// (optional) — used to back-fill blank party fields on older bookings.
export function buildBookingInvoice(booking = {}, side = 'sale', branch, master = {}, opts = {}) {
  const isSale = side === 'sale';
  // Holiday (package) client invoice hides the SVC2 margin: it's folded into the Base
  // Fare line and its GST is folded into the regular GST — the books keep them separate.
  const isPkg = String(booking.module || '') === 'SH';
  const code = String(branch?.code || booking.branch || 'BOM').toUpperCase();
  // Prefer the live company-profile, but fall back to the seeded issuer/bank constants
  // field-by-field, so the Issued-By block, Place of Supply and Bank details always
  // render even when the profile cache is empty at print time.
  const live = companyProfile(code) || {};
  const fb = ISSUER_FALLBACK[code] || {};
  const pv = (k) => (live[k] != null && live[k] !== '' ? live[k] : fb[k]);
  const prof = {
    ...fb, ...live,
    entity: pv('entity'), operAddr: pv('operAddr'), gstin: pv('gstin'), email: pv('email'), phone: pv('phone'),
    state: pv('state'), stateCode: pv('stateCode'), cur_sym: pv('cur_sym'),
    authSignatory: pv('authSignatory'), authDesignation: pv('authDesignation'),
    banks: (Array.isArray(live.banks) && live.banks.length) ? live.banks : (fb.banks || []),
  };
  // Branch regime → the VAT presentation + hidden-margin rules.
  const isVat = ['NBO', 'DAR', 'FBM'].includes(code);
  const taxLabel = isVat ? 'VAT' : 'GST';
  const idLabel = isVat ? 'VAT Reg No' : 'GSTIN';
  // Hidden-margin rule (EVERYWHERE): the SVC2 margin is never a visible invoice line.
  // Its full (tax-inclusive) amount folds into a visible bucket so the row still foots —
  // Africa, and Holiday packages (no Taxes column), fold it into Base Fare; India folds
  // it into Taxes. The displayed tax line stays the SVF/regular tax only; SVC2's own tax
  // is absorbed into the Sub Total. The books keep SVC2 separate, so GP is unchanged.
  const foldSvc2IntoBase = isVat || isPkg;
  // Optional local-currency print: convert every amount at the daily branch FX rate and
  // switch the currency symbol. The books never move — this is display-only.
  const fx = (opts && Number(opts.fxRate) > 0) ? Number(opts.fxRate) : 1;
  const localCcy = (opts && opts.localCurrency) || '';
  const converting = fx !== 1 && !!localCcy;
  const LOCAL_SYM = { KES: 'KSh ', TZS: 'TSh ', CDF: 'FC ' };
  const baseCur = prof.cur_sym || (bc(branch) || {}).cur || '₹';
  const cur = converting ? (LOCAL_SYM[localCcy] || `${localCcy} `) : baseCur;
  const curCode = converting ? localCcy : (isVat ? 'USD' : 'INR');
  // fx-aware money formatter — shadows the module n2 so EVERY amount in this invoice
  // converts at the branch FX rate when printing in local currency (1× otherwise).
  const n2 = (n) => (Number(n || 0) * fx).toLocaleString(curCode === 'INR' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const company = { name: prof.entity || 'Travkings Tours & Travels Pvt. Ltd.', address: prof.operAddr || '', gstin: prof.gstin || '', email: prof.email || '', contact: prof.phone || '' };
  // HSN/SAC for the booked travel service — fetched from the live HSN/SAC master by
  // module, falling back to the built-in map (then a generic SAC) if it hasn't loaded.
  const sac = hsnSacFor(MODULE_NAME[booking.module] || '') || SAC_BY_MODULE[booking.module] || '998599';
  // Brand logo + IATA accreditation badge live in /public, referenced by ABSOLUTE URL
  // so they also resolve inside the print-preview iframe (doc.write'd, no base href).
  const assetBase = (typeof window !== 'undefined' && window.location ? window.location.origin : '') + '/';
  const TK_LOGO = assetBase + 'travkings-logo.png';
  const IATA_LOGO = assetBase + 'iata-logo.png';
  // IATA accreditation number — printed under the IATA badge. Reads the live profile
  // (prof.iataNo) when present, else the registered Travkings BOM IATA number.
  const iataNo = prof.iataNo || '14037951';
  // UPI "Scan & Pay" — QR (public/upi-qr.png, absolute URL so it resolves inside the
  // print-preview iframe) + VPA; both overridable from the live company-profile.
  const UPI_QR = prof.upiQr || (assetBase + 'upi-qr.png');
  const upiId = prof.upiId || 'MSTRAVKINGSTOURSTRAVELSPRIVATELIMITED.eazypay@icici';
  const raw = isSale ? (booking.customer || {}) : (booking.supplier || {});
  const m = master || {};
  const mAddr = m.address || [m.city, m.country].filter(Boolean).join(', ');
  const snap = (isSale ? booking.so : booking.po) || {};
  const rows = Array.isArray(booking.rows) ? booking.rows : [];

  // Bill-To name. For a pooled B2C debtor ledger (e.g. "B2C Ref Farhan") the ledger
  // is NOT the real customer — the passenger is — so bill the first passenger by name
  // (the first line that carries one). B2B/B2E clients ARE the ledger, so they are
  // left exactly as-is. Purchase invoices (Supplier party) are never remapped.
  const isB2C = isSale && /b2c/i.test(raw.ledgerGroup || raw.group || '');
  const firstPax = rows.map((p) => [p.fn, p.sn].filter(Boolean).join(' ').trim()).find(Boolean) || '';
  const freeName = raw.name && raw.name !== raw.ledgerName ? raw.name : ''; // a real, typed end-customer name
  const billToName = isB2C
    ? (firstPax || freeName || m.name || raw.ledgerName || raw.name || '')
    : (raw.name || m.name || '');

  const party = {
    name: billToName || '',
    gstin: raw.gstin || m.gstin || '',
    address: raw.address || mAddr || '',
    email: raw.email || m.email || '',
    contact: raw.contact || m.contact || m.phone || '',
  };
  const headerRef = booking.headerRef || '';
  const vno = isSale ? (booking.saleVno || '') : (booking.purchaseVno || '');
  const psCode = (party.gstin || prof.gstin || '').slice(0, 2);
  const placeOfSupply = GST_STATES[psCode] ? `${GST_STATES[psCode]} — ${psCode}` : (prof.state ? `${prof.state} — ${prof.stateCode || ''}` : '');

  // ── Per-module breakdown — mirrors the SO (sale) / PO (purchase) voucher grids ──
  // Columns, labels and the GST math are driven entirely by VSPECS[module] + lineCalc,
  // exactly like the SO/PO/GP Voucher entry, so each module renders its own fields and
  // the printed figures tie to the books line-for-line.
  const moduleCode = String(booking.module || 'SF').toUpperCase();
  const spec = VSPECS[moduleCode] || VSPECS.SF;   // reversal/unknown modules fall back to the Flight layout
  const pkg = spec.model === 'package';            // Holiday tour-operator model (5% GST, supplier-service GST entered)
  const refKeys = spec.idCols.slice(2);            // module reference fields (Ticket/PNR, Hotel/Conf, Country/Passport…)
  const isVatBr = isVatBranch(code);
  const effNoVat = isVatBr && !!booking.noVat;      // noVat only bites on Africa/VAT branches
  const ctx = { branch: code, noVat: effNoVat };
  // The GST rate shown in column headers — mirrors the voucher's getGstRate().
  const activeRate = effNoVat ? 0
    : isVatBr ? (code === 'NBO' ? 16 : code === 'DAR' ? 18 : code === 'FBM' ? 16 : 18)
      : pkg ? (spec.gstRate ? spec.gstRate * 100 : 5)
        : (spec.tax && spec.tax.rate != null ? spec.tax.rate : 18);
  // Flight sectors → one sub-row spanning the whole table, one chip-line per segment.
  const sectorRow = (l, cols) => {
    if (!spec.sectors) return '';
    const secs = (Array.isArray(l.sectors) ? l.sectors : []).filter((s) => s && (s.sector || s.airline || s.flightNo || s.ticketNo || s.pnr || s.travelDate));
    if (!secs.length) return '';
    const items = secs.map((s) => {
      const parts = [s.sector, s.airline, s.flightNo, s.ticketNo ? `TKT ${s.ticketNo}` : '', s.pnr ? `PNR ${s.pnr}` : '', s.travelDate].filter(Boolean).map(esc).join(' · ');
      return parts ? `<div class="sub sec">${parts}</div>` : '';
    }).join('');
    return `<tr class="secrow"><td class="l" colspan="${cols}"><span class="seclab">Sectors</span><div class="secs">${items}</div></td></tr>`;
  };
  const idCell = (l, col) => `<td class="l${col.kind === 'pnr' ? ' gold' : ''}">${esc(l[col.key] || '—')}</td>`;

  const saleCols = spec.idCols.length + spec.fareCols.length + 1 + (pkg ? 0 : 2) + 1 + 1; // ids + fares + OtherTax + (Svc+GST/Svc) + GST/OthTax + Total
  const purCols = 2 + refKeys.length + spec.fareCols.length + 5;                          // fn+sn + refs + fares + (SupSvc,GST,Incentive,TDS,Total)
  const cols = isSale ? saleCols : purCols;

  let bkHead, bkBody;
  if (isSale) {
    bkHead = [
      ...spec.idCols.map((c) => `<th class="l">${esc(c.label)}</th>`),
      ...spec.fareCols.map((c) => `<th>${esc(c.label)}</th>`),
      '<th>Other Taxes</th>',
      pkg ? '' : '<th>Service Chg</th>',
      pkg ? '' : `<th>GST/Service (${activeRate}%)</th>`,
      `<th>GST/Other Taxes (${pkg ? 5 : activeRate}%)</th>`,
      '<th>Total</th>',
    ].join('');
    bkBody = rows.map((l) => {
      const c = lineCalc(spec, l, ctx);
      const cells = [
        ...spec.idCols.map((col) => idCell(l, col)),
        ...spec.fareCols.map((col) => `<td>${n2(l[col.key])}</td>`),
        `<td>${n2(l.markup)}</td>`,
        pkg ? '' : `<td>${n2(l.ssvc)}</td>`,
        pkg ? '' : `<td>${n2(c.gstSvc)}</td>`,
        `<td>${n2(c.gstMk)}</td>`,
        `<td class="tf">${cur}${n2(c.finalSales)}</td>`,
      ].join('');
      return `<tr>${cells}</tr>${sectorRow(l, cols)}`;
    }).join('');
  } else {
    bkHead = [
      `<th class="l">${esc(spec.idCols[0].label)}</th>`,
      `<th class="l">${esc(spec.idCols[1].label)}</th>`,
      ...refKeys.map((c) => `<th class="l">${esc(c.label)}</th>`),
      ...spec.fareCols.map((c) => `<th>${esc(c.label)}</th>`),
      '<th>Supplier Service</th>',
      pkg ? '<th>Supplier Service GST (18%)</th>' : `<th>GST (${activeRate}%)</th>`,
      '<th>Supplier Incentive</th>',
      '<th>TDS (2%)</th>',
      '<th>Total</th>',
    ].join('');
    bkBody = rows.map((l) => {
      const c = lineCalc(spec, l, ctx);
      const cells = [
        `<td class="l">${esc(l.fn || '—')}</td>`,
        `<td class="l">${esc(l.sn || '')}</td>`,
        ...refKeys.map((col) => idCell(l, col)),
        ...spec.fareCols.map((col) => `<td>${n2(l[col.key])}</td>`),
        `<td>${n2(l.psvc)}</td>`,
        `<td>${n2(pkg ? l.psvcGst : c.gstPur)}</td>`,
        `<td>${n2(l.incentive)}</td>`,
        `<td>${n2(c.tds)}</td>`,
        `<td class="tf">${cur}${n2(c.finalPurchase)}</td>`,
      ].join('');
      return `<tr>${cells}</tr>${sectorRow(l, cols)}`;
    }).join('');
  }
  const emptyRow = `<tr><td class="l" colspan="${cols}" style="text-align:center;color:#9A9A9A;padding:16px">No line detail captured for this booking.</td></tr>`;

  // summary from the booked snapshot (ties to the books)
  const otGst = r2(snap.otherTaxesGst || 0); // tax on the hidden SVC2 margin — never shown
  const gst = r2(snap.gst || 0), tcs = r2(snap.tcs || 0), incentive = r2(snap.incentiveAmt || 0), tds = r2(snap.incentiveTds || 0);
  // Hidden-margin rule: the SVC2 margin's own tax (otGst) is folded into the Sub Total so
  // it never appears as its own line, and the displayed tax line shows the SVF/regular tax
  // ONLY. Still foots to NET because NET already contains otGst.
  const subTotal = r2(r2(snap.lineTotal || 0) + otGst), service = r2(snap.serviceCharge || 0);
  const net = r2(snap.total || (r2(snap.lineTotal || 0) + service + gst + otGst + tcs));
  // VAT (Africa) → a single tax line, no place-of-supply split. India → CGST/SGST (intra)
  // or IGST (inter). The SVC2 margin tax is NOT shown (folded into Sub Total above).
  const inter = booking.gstMode === 'inter';
  const half = r2(gst / 2);
  const gstRows = isVat
    ? `<div class="r"><span class="k">${taxLabel}</span><span class="v">${cur}${n2(gst)}</span></div>`
    : (inter
      ? `<div class="r"><span class="k">IGST</span><span class="v">${cur}${n2(gst)}</span></div>`
      : `<div class="r"><span class="k">CGST</span><span class="v">${cur}${n2(half)}</span></div><div class="r"><span class="k">SGST</span><span class="v">${cur}${n2(r2(gst - half))}</span></div>`);
  const tcsRow = tcs ? `<div class="r"><span class="k">TCS</span><span class="v">${cur}${n2(tcs)}</span></div>` : '';
  const sumtbl = isSale
    ? `
    <div class="r"><span class="k">Sub Total</span><span class="v">${cur}${n2(subTotal)}</span></div>
    ${service ? `<div class="r"><span class="k">Service Fee</span><span class="v">${cur}${n2(service)}</span></div>` : ''}
    ${gst ? gstRows : ''}${tcsRow}
    <div class="net"><span class="k">NET TOTAL (${esc(curCode)})</span><span class="v">${cur}${n2(net)}</span></div>`
    : `
    <div class="r"><span class="k">Sub Total (Fares + Svc)</span><span class="v">${cur}${n2(subTotal)}</span></div>
    ${incentive ? `<div class="r" style="color:#A32D2D"><span class="k">Supplier Incentive</span><span class="v">-${cur}${n2(incentive)}</span></div>` : ''}
    ${gst ? gstRows : ''}
    ${tds ? `<div class="r" style="color:#A07828"><span class="k">${isVat ? 'WHT' : 'TDS (2%)'}</span><span class="v">${cur}${n2(tds)}</span></div>` : ''}
    <div class="net"><span class="k">NET COST (${esc(curCode)})</span><span class="v">${cur}${n2(r2(net - incentive + tds))}</span></div>`;

  // bank (sales) from company-profile
  const bank = (prof.banks || []).find((b) => b.primary) || (prof.banks || [])[0] || {};
  const bankLines = [
    bank.bankName ? `Bank: ${esc(bank.bankName)}` : '',
    bank.acName ? `A/c Name: ${esc(bank.acName)}` : '',
    bank.acNo ? `A/c No: ${esc(bank.acNo)}` : '',
    bank.ifsc ? `IFSC: ${esc(bank.ifsc)}` : '',
    bank.swift ? `SWIFT: ${esc(bank.swift)}` : '',
    bank.branch ? `Branch: ${esc(bank.branch)}` : '',
  ].filter(Boolean).join('<br>') || 'Bank details on file.';
  const upiBlock = `<div class="upicol"><div class="lab2">UPI · Scan &amp; Pay</div><img class="upi-qr" src="${UPI_QR}" alt="UPI QR — ${esc(upiId)}" /><div class="upi-id">${esc(upiId)}</div></div>`;
  const payBlock = isSale
    ? `<div class="paygrid"><div class="bankcol"><div class="lab2">Bank Details</div><div class="pay">${bankLines}</div></div>${upiBlock}</div>`
    : `<div class="lab2">Settlement</div><div class="pay">Payable to supplier per agreed credit terms.<br>Input ${taxLabel} credit claimed against supplier ${idLabel}.<br>Link No referenced for invoice-wise GP.</div>`;

  const sheet = `<div class="iv"><div class="sheet">
    <div class="titlebar"><div class="title">${isSale ? 'INVOICE' : 'PURCHASE INVOICE'}</div><div class="iata-box"><img class="iata-badge" src="${IATA_LOGO}" alt="IATA Accredited Agent" /><div class="iata-no">IATA No: ${esc(iataNo)}</div></div></div><div class="title-rule"></div>
    <div class="tophead">
      <div class="brandcol">
        <img class="tk-logo" src="${TK_LOGO}" alt="${esc(company.name)}" />
      </div>
      <div class="inv-meta">
        <div class="k">${isSale ? 'Invoice No.' : 'Purchase Inv No.'}</div><div class="v big">${esc(vno || '(on approval)')}</div>
        <div class="divider"></div>
        <div class="k">Invoice Date</div><div class="v">${esc(booking.date || '')}</div>
        ${(!isVat && placeOfSupply) ? `<div class="k">Place of Supply</div><div class="v">${esc(placeOfSupply)}</div>` : ''}
        <div class="k">Link No.</div><div class="v" style="color:var(--gold)">${esc(booking.linkNo || '—')}</div>
      </div>
    </div>
    <div class="blackrule"></div>
    <div class="parties">${isSale
      ? partyBlock('Billed To', party, cur, idLabel) + partyBlock('Issued By', company, cur, idLabel)
      : partyBlock('Supplier', party, cur, idLabel) + partyBlock('Billed To (Buyer)', company, cur, idLabel)}</div>
    <div class="fb-label">${isSale ? 'Fare Breakdown' : 'Cost Breakdown'}${headerRef ? ` <span class="fb-ref">· ${esc(headerRef)}</span>` : ''}</div>
    <table class="bk"><thead><tr>${bkHead}</tr></thead><tbody>${bkBody || emptyRow}</tbody></table>
    <div class="summary">
      <div class="sumleft"><div class="lab2">HSN / SAC</div><div class="hsnval">${esc(sac)}</div></div>
      <div class="sumtbl">${sumtbl}</div>
    </div>
    <div class="botrule"></div>
    <div class="botgrid">
      <div class="botleft"><div class="lab2">Amount in Words</div><div class="words">${esc(curCode)} ${esc(inWords(Math.round(net * fx)))} Only</div>${converting ? `<div class="pay" style="margin-bottom:12px;font-style:italic">Converted at 1 USD = ${esc(Number(opts.fxRate).toFixed(2))} ${esc(localCcy)} (${esc(opts.fxDate || booking.date || '')})</div>` : ''}${payBlock}</div>
      <div class="botright"><div class="for">For ${esc(company.name)}</div><div class="sigline"><div class="a">Authorised Signatory</div></div></div>
    </div>
    <div class="terms">${isSale
      ? 'Terms &amp; Conditions: 1. Payment due as per agreed terms; delay attracts 18% p.a. 2. Service charges non-refundable; cancellations per supplier policy. 3. We act as intermediary; not liable for third-party delays/cancellations. E.&amp;O.E.'
      : 'Internal purchase record for accounting &amp; ITC. Cost net of supplier incentive per the GP working. Subject to reconciliation with the supplier statement / BSP. E.&amp;O.E.'}</div>
  </div></div>`;
  return `<style>${CSS}</style>${sheet}`;
}
