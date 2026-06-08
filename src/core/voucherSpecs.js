// ─── SO / PO / GP Voucher — per-module column specs + GST-inclusive math ──────
// Generalises the Travkings flight "SO/PO/GP Voucher" mock-up across all seven
// ERP modules (Flight / Holiday / Hotel / Visa / Insurance / Car / Misc).
//
// Each booking line carries:
//   • identity columns (passenger / guest name + module refs — Ticket/PNR/etc.)
//   • purchase "fare" columns (the supplier cost, pass-through, NOT separately
//     taxed — K3/taxes are already tax figures) — entered in the Purchase Order
//   • psvc  — Supplier Service charge (purchase side, GST @18% input credit)
//   • markup — agency markup, GST-INCLUSIVE (GST = markup × 18 ÷ 118)
//   • ssvc  — agency Service Charge (sales side, GST @18% output, added on top)
//
// The Sales side = the whole purchase cost (fares + supplier service) passed
// through, plus markup + service charge (+ their GST). Gross Profit excludes GST
// on both sides, so GP = net markup + service charge.  (Matches the mock-up.)

export const GST_RATE = 0.18;

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);
const isIntl = (pt) => String(pt || '').toLowerCase().startsWith('int');

// Does this module collect TCS for the given package type? (Intl Holiday → yes.)
export function tcsApplies(spec, packageType) {
  if (!spec || !spec.tcs) return false;
  return spec.tcs.intlOnly ? isIntl(packageType) : true;
}

// ── Per-module column specs ──────────────────────────────────────────────────
// idCols[0]/[1] are always the name pair (editable on both grids); idCols[2…] are
// the module reference fields (editable on the Sales grid, shown read-only on the
// Purchase grid). fareCols are the numeric pass-through cost columns.
export const VSPECS = {
  SF: {
    code: 'SF', name: 'Flight', icon: '✈', headerLabel: 'Sector / Airline',
    idCols: [
      { key: 'fn', label: 'First Name' }, { key: 'sn', label: 'Surname' },
      { key: 'tkt', label: 'Ticket No', kind: 'tkt' }, { key: 'pnr', label: 'PNR', kind: 'pnr' },
    ],
    fareCols: [{ key: 'base', label: 'Base Fare' }, { key: 'k3', label: 'K3' }, { key: 'tax', label: 'Taxes' }],
    seed: [
      { fn: 'KUNAL', sn: 'CHAUHAN', tkt: '0981234567801', pnr: 'TJ1021', base: 4000, k3: 800, tax: 287, psvc: 50, markup: 500, ssvc: 100 },
      { fn: 'MUNAL', sn: 'CHAUHAN', tkt: '0981234567802', pnr: 'TJ1021', base: 4000, k3: 800, tax: 287, psvc: 50, markup: 500, ssvc: 100 },
    ],
  },
  SH: {
    code: 'SH', name: 'Holiday Package', icon: '🌴', headerLabel: 'Destination / Package',
    // TCS u/s 206C(1G) — 2% collected from the customer on an International package.
    tcs: { rate: 2, intlOnly: true },
    idCols: [
      { key: 'fn', label: 'First Name' }, { key: 'sn', label: 'Surname' },
      { key: 'pkg', label: 'Package', kind: 'tkt' }, { key: 'ref', label: 'Ref', kind: 'pnr' },
    ],
    fareCols: [{ key: 'base', label: 'Land / Air' }, { key: 'tax', label: 'Taxes' }],
    seed: [
      { fn: 'RAHUL', sn: 'MEHTA', pkg: 'Bali 5N', ref: 'HL2201', base: 85000, tax: 4250, psvc: 1000, markup: 12000, ssvc: 1500 },
    ],
  },
  SHT: {
    code: 'SHT', name: 'Hotel', icon: '🏨', headerLabel: 'Hotel / City',
    idCols: [
      { key: 'fn', label: 'Guest First' }, { key: 'sn', label: 'Surname' },
      { key: 'htl', label: 'Hotel', kind: 'tkt' }, { key: 'conf', label: 'Conf. No', kind: 'pnr' },
    ],
    fareCols: [{ key: 'base', label: 'Room / Basic' }, { key: 'tax', label: 'Taxes' }],
    seed: [
      { fn: 'PRIYA', sn: 'NAIR', htl: 'Taj Lands End', conf: 'HT5567', base: 18000, tax: 900, psvc: 500, markup: 2000, ssvc: 300 },
    ],
  },
  SV: {
    code: 'SV', name: 'Visa', icon: '🛂', headerLabel: 'Country / Embassy',
    idCols: [
      { key: 'fn', label: 'First Name' }, { key: 'sn', label: 'Surname' },
      { key: 'country', label: 'Country', kind: 'tkt' }, { key: 'pp', label: 'Passport', kind: 'pnr' },
    ],
    fareCols: [{ key: 'base', label: 'Visa Fee' }, { key: 'tax', label: 'Taxes' }],
    seed: [
      { fn: 'AMIT', sn: 'SHAH', country: 'UAE', pp: 'P1234567', base: 4500, tax: 0, psvc: 250, markup: 800, ssvc: 200 },
    ],
  },
  SI: {
    code: 'SI', name: 'Insurance', icon: '🛡', headerLabel: 'Plan / Insurer',
    idCols: [
      { key: 'fn', label: 'First Name' }, { key: 'sn', label: 'Surname' },
      { key: 'plan', label: 'Plan', kind: 'tkt' }, { key: 'pol', label: 'Policy No', kind: 'pnr' },
    ],
    fareCols: [{ key: 'base', label: 'Premium' }, { key: 'tax', label: 'Taxes' }],
    seed: [
      { fn: 'SARA', sn: 'KHAN', plan: 'Schengen 30D', pol: 'INS8890', base: 1800, tax: 0, psvc: 0, markup: 400, ssvc: 100 },
    ],
  },
  SC: {
    code: 'SC', name: 'Car Rental', icon: '🚗', headerLabel: 'Route / Vendor',
    idCols: [
      { key: 'fn', label: 'First Name' }, { key: 'sn', label: 'Surname' },
      { key: 'veh', label: 'Vehicle', kind: 'tkt' }, { key: 'route', label: 'Route', kind: 'pnr' },
    ],
    fareCols: [{ key: 'base', label: 'Basic' }, { key: 'tax', label: 'Taxes' }],
    seed: [
      { fn: 'VIKRAM', sn: 'RAO', veh: 'Innova', route: 'BOM-Pune', base: 2800, tax: 0, psvc: 0, markup: 500, ssvc: 100 },
    ],
  },
  SM: {
    code: 'SM', name: 'Miscellaneous', icon: '📦', headerLabel: 'Service / Vendor',
    idCols: [
      { key: 'fn', label: 'First Name' }, { key: 'sn', label: 'Surname' },
      { key: 'svc', label: 'Service', kind: 'tkt' }, { key: 'ref', label: 'Ref No', kind: 'pnr' },
    ],
    fareCols: [{ key: 'base', label: 'Basic' }, { key: 'tax', label: 'Taxes' }],
    seed: [
      { fn: 'NEHA', sn: 'JOSHI', svc: 'Documentation', ref: 'MS1102', base: 900, tax: 0, psvc: 0, markup: 200, ssvc: 100 },
    ],
  },
};

export const VMODULE_LIST = Object.values(VSPECS);

// A blank booking line for a module: all numbers 0, all texts ''.
export function blankLine(spec) {
  const l = {};
  spec.idCols.forEach((c) => { l[c.key] = ''; });
  spec.fareCols.forEach((c) => { l[c.key] = 0; });
  l.psvc = 0; l.markup = 0; l.ssvc = 0;
  return l;
}

export const seedLines = (spec) => (spec.seed || []).map((s) => ({ ...blankLine(spec), ...s }));

// ── Per-line money math (the GST-inclusive engine) ───────────────────────────
export const fareSum = (spec, l) => r2(spec.fareCols.reduce((s, c) => s + num(l[c.key]), 0));
export const gstSvc = (l) => r2(num(l.ssvc) * GST_RATE);                    // GST on agency service charge
export const gstMk  = (l) => r2(num(l.markup) * GST_RATE / (1 + GST_RATE)); // GST embedded in GST-incl markup
export const gstPur = (l) => r2(num(l.psvc) * GST_RATE);                    // input GST on supplier service

export const finalPurchase = (spec, l) => r2(fareSum(spec, l) + num(l.psvc) + gstPur(l));
export const finalSales = (spec, l) => r2(fareSum(spec, l) + num(l.psvc) + num(l.markup) + num(l.ssvc) + gstSvc(l));
export const salesGST = (l) => r2(gstSvc(l) + gstMk(l));
export const gpOf = (spec, l) => r2((finalSales(spec, l) - salesGST(l)) - (finalPurchase(spec, l) - gstPur(l)));
export const gpPctOf = (spec, l) => { const fs = finalSales(spec, l); return fs > 0 ? r2((gpOf(spec, l) / fs) * 100) : 0; };

// All computed figures for one line — handy for the read-only voucher view.
export function lineCalc(spec, l) {
  return {
    pass: r2(fareSum(spec, l) + num(l.psvc)),
    gstSvc: gstSvc(l), gstMk: gstMk(l), gstPur: gstPur(l),
    finalSales: finalSales(spec, l), finalPurchase: finalPurchase(spec, l),
    salesGST: salesGST(l), gp: gpOf(spec, l), gpPct: gpPctOf(spec, l),
  };
}

// ── Booking-level rollup → the po / so / gp snapshots the backend expects ─────
// po/so carry { lineTotal (net, ex tax), serviceCharge, gst, tcs, total, lines }.
// gp = sales net − purchase net (= net markup + service charge). The per-line
// `lines` detail is preserved for the read-only voucher view + voucher meta.
export function bookingTotals(spec, lines, { packageType = '' } = {}) {
  const po = { lineTotal: 0, serviceCharge: 0, gst: 0, tcs: 0, total: 0, lines: [] };
  const so = { lineTotal: 0, serviceCharge: 0, gst: 0, tcs: 0, total: 0, lines: [] };
  // Per-component ledger heads (ex-GST). Every SO/PO field posts to its OWN ledger
  // under the Sales / Purchase group — pass-through fares + supplier service mirror
  // on both sides; Markup & Service Charge are sale-only (their GST → Output GST).
  const sH = {}, pH = {};
  const addH = (bag, key, label, amt) => { (bag[key] || (bag[key] = { key, label, amt: 0 })).amt += num(amt); };
  (lines || []).forEach((l) => {
    const c = lineCalc(spec, l);
    const id = {}; spec.idCols.forEach((col) => { id[col.key] = l[col.key]; });
    const fares = {}; spec.fareCols.forEach((col) => { fares[col.key] = num(l[col.key]); });
    po.lineTotal += r2(c.finalPurchase - c.gstPur);
    po.serviceCharge += num(l.psvc);
    po.gst += c.gstPur; po.total += c.finalPurchase;
    po.lines.push({ ...id, ...fares, psvc: num(l.psvc), gst: c.gstPur, total: c.finalPurchase });
    so.lineTotal += r2(c.finalSales - c.salesGST);
    so.serviceCharge += num(l.ssvc);
    so.gst += c.salesGST; so.total += c.finalSales;
    so.lines.push({ ...id, ...fares, pass: c.pass, markup: num(l.markup), ssvc: num(l.ssvc), gstMk: c.gstMk, gstSvc: c.gstSvc, gst: c.salesGST, total: c.finalSales });
    // heads — pass-through fares (sale = purchase), supplier service (both),
    // then sale-only markup (net of its embedded GST) + service charge.
    spec.fareCols.forEach((col) => { addH(sH, col.key, col.label, num(l[col.key])); addH(pH, col.key, col.label, num(l[col.key])); });
    addH(sH, 'psvc', 'Supplier Service', num(l.psvc)); addH(pH, 'psvc', 'Supplier Service', num(l.psvc));
    addH(sH, 'markup', 'Markup', r2(num(l.markup) - c.gstMk));
    addH(sH, 'ssvc', 'Service Charge', num(l.ssvc));
  });
  ['lineTotal', 'serviceCharge', 'gst', 'tcs', 'total'].forEach((k) => { po[k] = r2(po[k]); so[k] = r2(so[k]); });
  // TCS u/s 206C(1G) — collected from the customer on the sale value (incl GST),
  // on top of the invoice. It's a Balance-Sheet liability, NOT income, so it never
  // enters the net and the GP is unchanged.
  if (tcsApplies(spec, packageType)) {
    so.tcs = r2(so.total * spec.tcs.rate / 100);
    so.total = r2(so.total + so.tcs);
  }
  const saleNet = r2(so.total - so.gst - so.tcs);
  const costNet = r2(po.total - po.gst - po.tcs);
  // Finalise the head lists in display order, drop zero heads, and snap each list
  // to sum EXACTLY to its net (adjust the largest head) so the JV always balances.
  const order = [...spec.fareCols.map((c) => c.key), 'psvc', 'markup', 'ssvc'];
  const finalise = (bag, keys, net) => {
    const heads = keys.map((k) => bag[k]).filter((h) => h && Math.abs(r2(h.amt)) > 0.005).map((h) => ({ ...h, amt: r2(h.amt) }));
    if (!heads.length) return heads;
    const diff = r2(net - heads.reduce((s, h) => s + h.amt, 0));
    if (diff !== 0) { let i = 0; heads.forEach((h, j) => { if (Math.abs(h.amt) > Math.abs(heads[i].amt)) i = j; }); heads[i] = { ...heads[i], amt: r2(heads[i].amt + diff) }; }
    return heads;
  };
  so.heads = finalise(sH, order, saleNet);
  po.heads = finalise(pH, order.filter((k) => k !== 'markup' && k !== 'ssvc'), costNet);
  const total = r2(saleNet - costNet);
  const pct = so.total > 0 ? r2((total / so.total) * 100) : 0;
  return { po, so, gp: { total, pct, saleNet, costNet } };
}
