// ─── SO / PO / GP Voucher — per-module column specs + GST-inclusive math ──────
// Generalises the Travkings flight "SO/PO/GP Voucher" mock-up across all seven
// ERP modules (Flight / Holiday / Hotel / Visa / Insurance / Car / Misc).
//
// Each booking line carries:
//   • identity columns (passenger / guest name + module refs — Ticket/PNR/etc.)
//   • purchase "fare" columns (the supplier cost, pass-through, NOT separately
//     taxed — K3/taxes are already tax figures) — entered in the Purchase Order
//   • psvc  — Supplier Service charge (purchase side, GST @18% input credit) — an
//             agency cost, NOT billed to the customer, so it reduces GP
//   • markup — agency markup, GST-INCLUSIVE (GST = markup × 18 ÷ 118)
//   • ssvc  — agency Service Charge (sales side, GST @18% output, added on top)
//
// The Sales side = the purchase FARES passed through, plus markup + service charge
// (+ their GST). The Supplier Service charge is an agency cost that is NOT billed to
// the customer, so it sits only on the purchase side and REDUCES GP. Gross Profit
// excludes GST on both sides:  GP = net markup + service charge − supplier service.

export const GST_RATE = 0.18;
// Tour-operator (Holiday package) GST: 5% output on the gross package value, no ITC.
export const PKG_GST = 0.05;

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);
const isIntl = (pt) => String(pt || '').toLowerCase().startsWith('int');
const isPkg = (spec) => !!spec && spec.model === 'package';

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
    tax: { kind: 'service', rate: 18 },
    // Flight bookings capture travel detail PER SECTOR (a passenger's ticket can
    // span several segments). Sectors are entered on the Purchase grid and shown
    // LOCKED on the Sales grid. Fares stay PER PASSENGER (one ticket = one fare),
    // so the GP/GST math is unchanged.
    sectors: true,
    sectorCols: [
      { key: 'sector', label: 'Sector' }, { key: 'airline', label: 'Airline' },
      { key: 'flightNo', label: 'Flight No' }, { key: 'ticketNo', label: 'Ticket No', kind: 'tkt' },
      { key: 'pnr', label: 'PNR', kind: 'pnr' }, { key: 'travelDate', label: 'Travel Date', type: 'date' },
    ],
    idCols: [
      { key: 'fn', label: 'First Name' }, { key: 'sn', label: 'Surname' },
    ],
    fareCols: [{ key: 'base', label: 'Base Fare' }, { key: 'k3', label: 'K3' }, { key: 'tax', label: 'Taxes' }],
    seed: [
      { fn: 'KUNAL', sn: 'CHAUHAN', base: 4000, k3: 800, tax: 287, psvc: 50, markup: 500, ssvc: 100,
        sectors: [{ sector: 'BOM-DXB', airline: 'Emirates', flightNo: 'EK 501', ticketNo: '0981234567801', pnr: 'TJ1021', travelDate: '' }] },
    ],
  },
  SH: {
    code: 'SH', name: 'Holiday Package', icon: '🌴', headerLabel: 'Destination / Package',
    // Tour-operator package model: 5% GST on the gross package value (no service
    // charge), + 5% TCS u/s 206C(1G) on International packages.
    model: 'package', gstRate: PKG_GST,
    tax: { kind: 'holiday', rate: 5, tcsRate: 5 },
    tcs: { rate: 5, intlOnly: true },
    idCols: [
      { key: 'fn', label: 'First Name' }, { key: 'sn', label: 'Surname' },
      { key: 'pkg', label: 'Package', kind: 'tkt' }, { key: 'ref', label: 'Ref', kind: 'pnr' },
    ],
    fareCols: [{ key: 'base', label: 'Land Package' }],
    seed: [
      { fn: 'RAHUL', sn: 'MEHTA', pkg: 'Bali 5N', ref: 'HL2201', base: 85000, psvc: 1000, psvcGst: 180, markup: 12000 },
    ],
  },
  SHT: {
    code: 'SHT', name: 'Hotel', icon: '🏨', headerLabel: 'Hotel / City',
    tax: { kind: 'service', rate: 18 },
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
    tax: { kind: 'service', rate: 18 },
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
    tax: { kind: 'all', rate: 18 },
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
    tax: { kind: 'all', rate: 5 },
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
    tax: { kind: 'perRow' },
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

// A blank travel sector (Flight): all text, entered on the Purchase grid.
export function blankSector() {
  return { sector: '', airline: '', flightNo: '', ticketNo: '', pnr: '', travelDate: '' };
}

// A blank booking line for a module: all numbers 0, all texts ''.
export function blankLine(spec) {
  const l = {};
  // Reversal modules (RF/RI) have no fare-grid spec — guard so a missing spec yields
  // an empty line instead of throwing "Cannot read properties of undefined (idCols)".
  if (!spec) return l;
  spec.idCols.forEach((c) => { l[c.key] = ''; });
  spec.fareCols.forEach((c) => { l[c.key] = ''; });
  l.psvc = ''; l.markup = ''; l.ssvc = ''; l.psvcGst = '';
  l.incentive = ''; l.tds = '';
  if (spec.sectors) l.sectors = [blankSector()];
  return l;
}

// Coerce a saved/legacy line into the spec's shape. For sector modules (Flight),
// guarantees a sectors[] array, migrating any legacy line-level Ticket/PNR into a
// single sector so older bookings still load, render and edit.
export function normalizeLine(spec, line) {
  if (!spec || !spec.sectors) return { ...line };
  let sectors = Array.isArray(line.sectors) ? line.sectors.map((s) => ({ ...blankSector(), ...s })) : [];
  if (!sectors.length) sectors = [{ ...blankSector(), ticketNo: line.tkt || '', pnr: line.pnr || '' }];
  return { ...line, sectors };
}

// Mirror the first sector's Ticket/PNR back onto the line so name-keyed views
// (invoice, registers) that read line.tkt / line.pnr keep working unchanged.
export function syncLineRefs(spec, line) {
  if (!spec || !spec.sectors) return line;
  const first = Array.isArray(line.sectors) && line.sectors[0];
  return first ? { ...line, tkt: first.ticketNo || '', pnr: first.pnr || '' } : line;
}

export const seedLines = (spec) => (spec.seed || []).map((s) => ({ ...blankLine(spec), ...s }));

// Rebuild the per-line entry grid from a booking's so/po snapshots. Bulk-imported /
// migrated bookings (e.g. Tally summaries) can carry the so/po/gp totals with an
// EMPTY `rows` grid — opening Edit then showed a blank form (every figure on the
// voucher appeared to vanish). The snapshots still hold per-line detail: so.lines
// carry the fares + markup + service charge, po.lines carry the supplier service.
// Zip them back into editable rows; GST is recomputed from these fares on save.
// Returns [] when there is no per-line detail in either snapshot.
export function rowsFromSnapshots(booking) {
  const soL = (booking && booking.so && Array.isArray(booking.so.lines)) ? booking.so.lines : [];
  const poL = (booking && booking.po && Array.isArray(booking.po.lines)) ? booking.po.lines : [];
  const n = Math.max(soL.length, poL.length);
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = soL[i] || {}, p = poL[i] || {};
    // so line: { ...ids, ...fares, markup, ssvc, … }; po line carries psvc, incentive, tds.
    out.push({ ...p, ...s, psvc: num(p.psvc), markup: num(s.markup), ssvc: num(s.ssvc), incentive: num(p.incentive), tds: num(p.tds) });
  }
  return out;
}

// ── Per-line money math (the GST-inclusive engine) ───────────────────────────
// Each GST honours an explicit per-line override (l.svcGst / l.mkGst / l.psvcGst,
// e.g. from a bulk import) and otherwise auto-computes; blank/missing → auto.
const ovr = (v) => { if (v === undefined || v === null || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
export const fareSum = (spec, l) => r2(spec.fareCols.reduce((s, c) => s + num(l[c.key]), 0));
export const gstSvc = (l, rate = GST_RATE) => { const o = ovr(l.svcGst);  return r2(o !== null ? o : num(l.ssvc) * rate); };       // GST on agency service charge
export const gstMk  = (l, rate = GST_RATE) => { const o = ovr(l.mkGst);   return r2(o !== null ? o : num(l.markup) * rate / (1 + rate)); }; // GST embedded in GST-incl markup
// Input GST honours the module tax rule (mirrors backend voucherSpecs.gstPur). An
// override wins; else 'all' modules (Insurance / Car) tax the WHOLE cost (fare +
// supplier service), 'service' modules tax only the supplier service. Fixes insurance
// premiums that used to auto-compute 0 GST (psvc-only) instead of rate × premium.
const moduleRate = (spec) => ((spec && spec.tax && spec.tax.rate != null) ? num(spec.tax.rate) / 100 : GST_RATE);
export const gstPur = (spec, l, rate = moduleRate(spec)) => {
  const o = ovr(l.psvcGst);
  if (o !== null) return r2(o);
  if (spec && spec.tax && spec.tax.kind === 'all') return r2((fareSum(spec, l) + num(l.psvc)) * rate);
  return r2(num(l.psvc) * rate);
};

// Booking tax context (mirrors backend voucherSpecs). India → per-module rule.
// Africa (VAT) branches → branch VAT rate; noVat → tax forced to 0. Default = India.
const VAT_RATE = { NBO: 16, DAR: 18, FBM: 16 };
const isVatBranch = (b) => ['NBO', 'DAR', 'FBM'].includes(String(b || '').toUpperCase());
const vatRateOf = (b) => num(VAT_RATE[String(b || '').toUpperCase()]) / 100;
export const isTaxable = (ctx) => !(ctx && ctx.noVat);
const svcRateOf = (ctx) => { if (ctx && ctx.noVat) return 0; if (ctx && isVatBranch(ctx.branch)) return vatRateOf(ctx.branch); return GST_RATE; };
const purRateOf = (spec, ctx) => { if (ctx && ctx.noVat) return 0; if (ctx && isVatBranch(ctx.branch)) return vatRateOf(ctx.branch); return moduleRate(spec); };
const pkgRateOf = (spec, ctx) => { if (ctx && ctx.noVat) return 0; if (ctx && isVatBranch(ctx.branch)) return vatRateOf(ctx.branch); return spec.gstRate || PKG_GST; };
export { isVatBranch };

export const finalPurchase = (spec, l) => r2(fareSum(spec, l) + num(l.psvc) + gstPur(spec, l) - num(l.incentive) + r2(num(l.incentive) * 0.02));
// Supplier service is NOT passed through to the customer (it's an agency cost), so
// the sale excludes psvc — that's what makes it reduce GP.
export const finalSales = (spec, l) => r2(fareSum(spec, l) + num(l.markup) + num(l.ssvc) + gstSvc(l));
export const salesGST = (l) => r2(gstSvc(l) + gstMk(l));
export const gpOf = (spec, l) => r2((finalSales(spec, l) - salesGST(l)) - (finalPurchase(spec, l) - gstPur(spec, l) - r2(num(l.incentive) * 0.02)));
export const gpPctOf = (spec, l) => { const fs = finalSales(spec, l); return fs > 0 ? r2((gpOf(spec, l) / fs) * 100) : 0; };

// Holiday "package" model (tour-operator): no service charge; Supplier Service GST
// is entered; Markup is the net agency margin. Tour-operator 5% scheme (no ITC):
// a SINGLE 5% output GST on the full package consideration (taxable) =
// Land + Supplier Service + Supplier Service GST + Markup. The markup is taxed ONCE
// here as part of the taxable value — NOT booked as a separate markup GST AND
// re-taxed inside the base (the old double-count that made GST ~5.41%). TCS (Intl)
// added at booking level on (taxable + GST). Cost = Land + Supplier Service +
// Supplier Service GST (no ITC). GP = Markup (net) only.
export function lineCalcPackage(spec, l, ctx) {
  const rate = pkgRateOf(spec, ctx);
  const land = num(l.base);
  const psvc = num(l.psvc);
  const psvcGst = num(l.psvcGst);          // Supplier Service GST — entered
  const markup = num(l.markup);            // net markup (agency margin = GP)
  const incentive = num(l.incentive);
  const tds = r2(incentive * 0.02);
  const taxable = r2(land + psvc + psvcGst + markup); // full package consideration
  const outGst = r2(taxable * rate);       // single 5% output GST
  const finalSales = r2(taxable + outGst); // TCS added at booking level
  const finalPurchase = r2(land + psvc + psvcGst); // GROSS cost; incentive netted via incentivePostings on post
  const salesGST = outGst;
  return {
    pass: land, gstSvc: 0, gstMk: r2(markup * rate), gstPur: 0, psvcGst, markup, asp: taxable, outGst,
    incentive, tds,
    finalSales, finalPurchase, salesGST, gp: r2(markup + incentive),
    gpPct: finalSales > 0 ? r2(((markup + incentive) / finalSales) * 100) : 0,
  };
}

// All computed figures for one line — handy for the read-only voucher view.
// `ctx` = { branch, noVat }: India → per-module rule (default); Africa/VAT → branch
// VAT rate; noVat → tax 0. Backward compatible when ctx is omitted.
export function lineCalc(spec, l, ctx) {
  if (isPkg(spec)) return lineCalcPackage(spec, l, ctx);
  const taxable = isTaxable(ctx);
  const sr = svcRateOf(ctx), pr = purRateOf(spec, ctx);
  const gSvc = taxable ? gstSvc(l, sr) : 0;
  const gMk  = taxable ? gstMk(l, sr) : 0;
  const gPur = taxable ? gstPur(spec, l, pr) : 0;
  const incentive = num(l.incentive);
  const tds = r2(incentive * 0.02);
  const fSales = r2(fareSum(spec, l) + num(l.markup) + num(l.ssvc) + gSvc);
  const fPur   = r2(fareSum(spec, l) + num(l.psvc) + gPur); // GROSS cost; incentive netted via incentivePostings on post
  const sGST = r2(gSvc + gMk);
  // GP credits the commission (income, netted off the payable); the 2% TDS is a
  // balance-sheet withholding asset, not income, so it never affects GP.
  const gp = r2((fSales - sGST) - (fPur - gPur - incentive));
  return {
    pass: r2(fareSum(spec, l)),
    gstSvc: gSvc, gstMk: gMk, gstPur: gPur,
    incentive, tds,
    finalSales: fSales, finalPurchase: fPur,
    salesGST: sGST, gp, gpPct: fSales > 0 ? r2((gp / fSales) * 100) : 0,
  };
}

// ── Booking-level rollup → the po / so / gp snapshots the backend expects ─────
// po/so carry { lineTotal (net, ex tax), serviceCharge, gst, tcs, total, lines }.
// gp = sales net − purchase net (= net markup + service charge). The per-line
// `lines` detail is preserved for the read-only voucher view + voucher meta.
export function bookingTotals(spec, lines, { packageType = '', noSupplier = false, branch = '', noVat = false } = {}) {
  const ctx = { branch, noVat: !!noVat };
  const po = { lineTotal: 0, serviceCharge: 0, gst: 0, tcs: 0, incentiveAmt: 0, incentiveGst: 0, incentiveTds: 0, total: 0, lines: [] };
  // `otherTaxesGst` = GST carved out of the Other Taxes margin (GST-inclusive, so the
  // customer total is unchanged); kept OUT of `gst` so it posts to the dedicated
  // per-branch "Other Taxes [C/S/I]GST Output" ledgers, separate from the regular GST.
  const so = { lineTotal: 0, serviceCharge: 0, gst: 0, otherTaxesGst: 0, tcs: 0, total: 0, lines: [] };
  // Per-component ledger heads (ex-GST). Every SO/PO field posts to its OWN ledger
  // under the Sales / Purchase group — pass-through fares + supplier service mirror
  // on both sides; Markup & Service Charge are sale-only (their GST → Output GST).
  const sH = {}, pH = {};
  const addH = (bag, key, label, amt) => { (bag[key] || (bag[key] = { key, label, amt: 0 })).amt += num(amt); };
  (lines || []).forEach((l) => {
    const c = lineCalc(spec, l, ctx);
    const id = {}; spec.idCols.forEach((col) => { id[col.key] = l[col.key]; });
    const fares = {}; spec.fareCols.forEach((col) => { fares[col.key] = num(l[col.key]); });
    po.lineTotal += r2(c.finalPurchase - c.gstPur);
    po.serviceCharge += num(l.psvc);
    po.gst += c.gstPur;
    po.incentiveAmt += c.incentive;
    po.incentiveTds += c.tds;
    po.total += c.finalPurchase;
    po.lines.push({ ...id, ...fares, psvc: num(l.psvc), incentive: num(l.incentive), tds: c.tds, gst: c.gstPur, total: c.finalPurchase });
    so.lineTotal += r2(c.finalSales - c.salesGST);
    so.serviceCharge += num(l.ssvc);
    so.gst += r2(c.salesGST - c.gstMk);   // regular output GST (fares / service charge)
    so.otherTaxesGst += c.gstMk;          // GST on the Other Taxes margin → separate ledgers
    so.total += c.finalSales;
    so.lines.push({ ...id, ...fares, pass: c.pass, markup: num(l.markup), ssvc: num(l.ssvc), gstMk: c.gstMk, gstSvc: c.gstSvc, gst: c.salesGST, total: c.finalSales });
    // heads — pass-through fares (sale = purchase). Package model: Land + Supplier
    // Service + Supplier Service GST are pass-through (both sides), Markup is sale-only
    // income (= GP). Fare model: Supplier Service is purchase-only (agency cost),
    // Markup (net of embedded GST) + Service Charge are sale-only.
    spec.fareCols.forEach((col) => { addH(sH, col.key, col.label, num(l[col.key])); addH(pH, col.key, col.label, num(l[col.key])); });
    if (isPkg(spec)) {
      addH(sH, 'psvc', 'Supplier Service', num(l.psvc)); addH(pH, 'psvc', 'Supplier Service', num(l.psvc));
      addH(sH, 'psvcGst', 'Supplier Service GST', num(l.psvcGst)); addH(pH, 'psvcGst', 'Supplier Service GST', num(l.psvcGst));
      addH(sH, 'markup', 'Other Taxes', num(l.markup));
    } else {
      addH(pH, 'psvc', 'Supplier Service', num(l.psvc));
      addH(sH, 'markup', 'Other Taxes', r2(num(l.markup) - c.gstMk));
      addH(sH, 'ssvc', 'Service Charge', num(l.ssvc));
    }
    // NOTE: supplier incentive + 2% TDS are NOT posted as cost heads — they ride on
    // po.incentiveAmt / po.incentiveTds and post via the engine's incentivePostings
    // (Cr Commission/Incentive Received, Dr TDS Receivable, supplier payable netted).
  });
  ['lineTotal', 'serviceCharge', 'gst', 'tcs', 'incentiveAmt', 'incentiveGst', 'incentiveTds', 'total'].forEach((k) => { po[k] = r2(po[k]); });
  ['lineTotal', 'serviceCharge', 'gst', 'tcs', 'total'].forEach((k) => { so[k] = r2(so[k]); });
  so.otherTaxesGst = r2(so.otherTaxesGst);
  // TCS u/s 206C(1G) — collected from the customer on the sale value (incl GST),
  // on top of the invoice. It's a Balance-Sheet liability, NOT income, so it never
  // enters the net and the GP is unchanged. India-only — never on Africa/VAT
  // branches (and moot under Without-VAT).
  if (!ctx.noVat && !isVatBranch(ctx.branch) && tcsApplies(spec, packageType)) {
    so.tcs = r2(so.total * spec.tcs.rate / 100);
    so.total = r2(so.total + so.tcs);
  }
  const saleNet = r2(so.total - so.gst - so.otherTaxesGst - so.tcs);
  const costNet = r2(po.total - po.gst - po.tcs);
  // Finalise the head lists in display order, drop zero heads, and snap each list
  // to sum EXACTLY to its net (adjust the largest head) so the JV always balances.
  const order = isPkg(spec)
    ? [...spec.fareCols.map((c) => c.key), 'psvc', 'psvcGst', 'markup']
    : [...spec.fareCols.map((c) => c.key), 'psvc', 'markup', 'ssvc'];
  const finalise = (bag, keys, net) => {
    const heads = keys.map((k) => bag[k]).filter((h) => h && Math.abs(r2(h.amt)) > 0.005).map((h) => ({ ...h, amt: r2(h.amt) }));
    if (!heads.length) return heads;
    const diff = r2(net - heads.reduce((s, h) => s + h.amt, 0));
    if (diff !== 0) { let i = 0; heads.forEach((h, j) => { if (Math.abs(h.amt) > Math.abs(heads[i].amt)) i = j; }); heads[i] = { ...heads[i], amt: r2(heads[i].amt + diff) }; }
    return heads;
  };
  so.heads = finalise(sH, order, saleNet);
  const poOrder = order.filter((k) => k !== 'markup' && k !== 'ssvc');
  po.heads = finalise(pH, poOrder, costNet);
  // No-supplier (Misc): a sale with no purchase leg — the entire sale net is profit.
  // Zero the cost side so nothing posts to Purchase Accounts and GP = 100% margin.
  if (noSupplier) {
    ['lineTotal', 'serviceCharge', 'gst', 'tcs', 'incentiveAmt', 'incentiveGst', 'incentiveTds', 'total'].forEach((k) => { po[k] = 0; });
    po.lines = []; po.heads = [];
    const pct0 = so.total > 0 ? r2((saleNet / so.total) * 100) : 0;
    return { po, so, gp: { total: saleNet, pct: pct0, saleNet, costNet: 0 } };
  }
  // Commission (our income, netted off the payable) ADDS to GP → off the cost; the 2%
  // TDS is a balance-sheet asset, not income, so it never affects GP. Mirrors backend.
  const costNetForGp = r2(costNet - po.incentiveAmt);
  const total = r2(saleNet - costNetForGp);
  const pct = so.total > 0 ? r2((total / so.total) * 100) : 0;
  return { po, so, gp: { total, pct, saleNet, costNet: costNetForGp } };
}
