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

// Absorb the GST double-rounding paise on the invoice total. A GST-exclusive service
// charge is often back-derived from a round gross by ÷1.18, so `base + round(base×18%)`
// misses that round gross by ≤ a couple of paise (e.g. supplier service 84.75 + GST
// 15.26 = 100.01 → purchase total 7,100.01). When the total lands within EPS of a whole
// rupee we snap it there and stamp the ±paise as `roundOff` (→ the branch "Round Off"
// ledger); a total with GENUINE paise (a 5% GST + TCS holiday value like 378857.13) is
// left untouched, so it never disturbs the ERP↔Tally tie-out. Applied AFTER GP / saleNet
// / costNet / heads (on the TRUE net), so round-off never moves gross profit. Legacy
// snapshots without `roundOff` read 0 → unchanged.
const ROUND_OFF_EPS = 0.05;
// Whole-UNIT snap is a rupee (INR) convention that absorbs GST paise noise. A USD-book
// (Africa/VAT) branch bills to the CENT, so snapping to a whole dollar would throw away
// real cents; for a non-INR book keep 2dp and no roundOff plug. Mirrors the backend.
// `ccy` defaults to INR so every legacy call site stays byte-for-byte unchanged.
const applyRoundOff = (side, ccy = 'INR') => {
  const raw = num(side.total);
  if (String(ccy || 'INR').toUpperCase() !== 'INR') { side.total = r2(raw); side.roundOff = 0; return; }
  const off = r2(Math.round(raw) - raw);
  if (off !== 0 && Math.abs(off) <= ROUND_OFF_EPS) { side.total = Math.round(raw); side.roundOff = off; }
  else side.roundOff = 0;
};
const isIntl = (pt) => String(pt || '').toLowerCase().startsWith('int');
const isPkg = (spec) => !!spec && spec.model === 'package';

// Does this module collect TCS for the given package type? (Intl Holiday → yes.)
export function tcsApplies(spec, packageType) {
  if (!spec || !spec.tcs) return false;
  return spec.tcs.intlOnly ? isIntl(packageType) : true;
}

// TCS u/s 206C(1G) rate for a booking DATE. The statutory rate on overseas tour
// packages was 5% up to 31-03-2026; the Finance Act cut it to 2% from 01-04-2026.
// A booking is taxed at the rate in force on its booking date, so the module's
// spec.tcs.rate (the current 2%) is used from 01-04-2026 onward, and 5% before.
// No/blank date → fall back to the module default (safe: never guesses upward).
export const TCS_206C_CUTOVER = '2026-04-01'; // first day the 2% rate applies
export function tcs206cRate(spec, date) {
  const base = (spec && spec.tcs && spec.tcs.rate) || 0;
  const d = String(date || '').slice(0, 10);
  return (d && d < TCS_206C_CUTOVER) ? 5 : base;
}

// A B2B buyer (another agent / tour operator) is NOT charged TCS u/s 206C(1G) — they
// resell and collect it from their own client. Identified by the customer's Sundry
// Debtors sub-group (e.g. "B2B" / "B2B Clients"). B2C and B2E still attract TCS.
export const isB2B = (clientType) => /\bb2b\b/i.test(String(clientType || ''));

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
    fareCols: [{ key: 'base', label: 'Base Fare' }, { key: 'k3', label: 'K3 Tax' }, { key: 'tax', label: 'Taxes' }],
    seed: [
      { fn: 'KUNAL', sn: 'CHAUHAN', base: 4000, k3: 800, tax: 287, psvc: 50, markup: 500, ssvc: 100,
        sectors: [{ sector: 'BOM-DXB', airline: 'Emirates', flightNo: 'EK 501', ticketNo: '0981234567801', pnr: 'TJ1021', travelDate: '' }] },
    ],
  },
  SH: {
    code: 'SH', name: 'Holiday Package', icon: '🌴', headerLabel: 'Destination / Package',
    // Tour-operator package model: 5% GST on the gross package value (no service
    // charge), + 2% TCS u/s 206C(1G) on International packages.
    model: 'package', gstRate: PKG_GST,
    tax: { kind: 'holiday', rate: 5, tcsRate: 2 },
    tcs: { rate: 2, intlOnly: true },
    idCols: [
      { key: 'fn', label: 'First Name' }, { key: 'sn', label: 'Surname' },
      { key: 'pkg', label: 'Package', kind: 'tkt' }, { key: 'ref', label: 'Ref', kind: 'pnr' },
    ],
    fareCols: [{ key: 'base', label: 'Base Fare' }],
    seed: [
      { fn: 'RAHUL', sn: 'MEHTA', pkg: 'Bali 5N', ref: 'HL2201', base: 85000, psvc: 1000, psvcGst: 180, markup: 12000 },
    ],
  },
  SHT: {
    code: 'SHT', name: 'Hotel', icon: '🏨', headerLabel: 'Hotel / City',
    tax: { kind: 'service', rate: 18 },
    idCols: [
      { key: 'fn', label: 'First Name' }, { key: 'sn', label: 'Surname' },
      { key: 'htl', label: 'Hotel', kind: 'tkt' }, { key: 'conf', label: 'Conf. No', kind: 'pnr' },
    ],
    fareCols: [{ key: 'base', label: 'Base Fare' }, { key: 'tax', label: 'Taxes' }],
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
    fareCols: [{ key: 'base', label: 'Base Fare' }, { key: 'tax', label: 'Taxes' }],
    seed: [
      { fn: 'AMIT', sn: 'SHAH', country: 'UAE', pp: 'P1234567', base: 4500, tax: 0, psvc: 250, markup: 800, ssvc: 200 },
    ],
  },
  SI: {
    code: 'SI', name: 'Insurance', icon: '🛡', headerLabel: 'Plan / Insurer',
    // Agent/service-provider model: GST 18% on the agency's service only (Service Fee +
    // SVC2 on sale, Supplier Service on purchase) — NOT on the pass-through premium.
    tax: { kind: 'service', rate: 18 },
    idCols: [
      { key: 'fn', label: 'First Name' }, { key: 'sn', label: 'Surname' },
      { key: 'plan', label: 'Plan', kind: 'tkt' }, { key: 'pol', label: 'Policy No', kind: 'pnr' },
    ],
    // Owner's call (2026-07-18): the premium is NOT entered on the grid — insurance
    // books service-only (SVC2 + Service Fee on sale; Supplier Service + incentive on
    // purchase). No fare columns. Legacy bookings' stored Base Fare/Taxes heads still
    // post fine (heads are stored on the booking, and their seeded ledgers remain).
    fareCols: [],
    seed: [
      { fn: 'SARA', sn: 'KHAN', plan: 'Schengen 30D', pol: 'INS8890', base: 1800, tax: 0, psvc: 0, markup: 400, ssvc: 100 },
    ],
  },
  SC: {
    code: 'SC', name: 'Car Rental', icon: '🚗', headerLabel: 'Route / Vendor',
    // Agent/service-provider model: GST 18% on the agency's service only (not the fare).
    tax: { kind: 'service', rate: 18 },
    idCols: [
      { key: 'fn', label: 'First Name' }, { key: 'sn', label: 'Surname' },
      { key: 'veh', label: 'Vehicle', kind: 'tkt' }, { key: 'route', label: 'Route', kind: 'pnr' },
    ],
    fareCols: [{ key: 'base', label: 'Base Fare' }, { key: 'tax', label: 'Taxes' }],
    seed: [
      { fn: 'VIKRAM', sn: 'RAO', veh: 'Innova', route: 'BOM-Pune', base: 2800, tax: 0, psvc: 0, markup: 500, ssvc: 100 },
    ],
  },
  SM: {
    code: 'SM', name: 'Miscellaneous', icon: '📦', headerLabel: 'Service / Vendor',
    // Agent/service-provider model: GST 18% on the agency's service only.
    tax: { kind: 'service', rate: 18 },
    idCols: [
      { key: 'fn', label: 'First Name' }, { key: 'sn', label: 'Surname' },
      { key: 'svc', label: 'Service', kind: 'tkt' }, { key: 'ref', label: 'Ref No', kind: 'pnr' },
    ],
    fareCols: [{ key: 'base', label: 'Base Fare' }, { key: 'tax', label: 'Taxes' }],
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
// .trim() as well as .toUpperCase() — the BACKEND is authoritative and folds both
// (taxRegime.norm = upper+trim). Without the trim, a padded ' FBM ' typed false here while the
// server typed it VAT: the screen showed IGST 18% for a posting that lands as VAT 16%. Reachable
// because inb.updateDeal takes fromBranch with no assertKnownBranch guard.
const isVatBranch = (b) => ['NBO', 'DAR', 'FBM'].includes(String(b || '').trim().toUpperCase());
// Effective VAT fraction for a VAT branch — prefers the LIVE rate threaded on the ctx
// (ctx.vatRate, a percent sourced from the branch config / VAT master), falling back to
// the static VAT_RATE constant. This keeps the manual SO/PO/GP screen in step with a
// Super-Admin rate amendment (and with the backend, which reads the same master override).
const vatRateOf = (ctx) => {
  const live = ctx && ctx.vatRate;
  const pct = (live !== undefined && live !== null && live !== '')
    ? Number(live)
    : VAT_RATE[String((ctx && ctx.branch) || '').trim().toUpperCase()];   // trim: mirror the BE's norm()
  return num(pct) / 100;
};
// TWO distinct "no tax" gates — keep them separate:
//   • `noVat` — the Africa "Without VAT" toggle. Owner's rule (2026-07-21): a Without-VAT booking
//     is VAT-free on the WHOLE voucher ("no VAT until someone physically ticks With VAT") — it
//     zeroes BOTH the sale-side OUTPUT VAT and the purchase-side INPUT VAT/ITC. India never sets it.
//   • `saleZeroRated` — a zero-rated INTER-BRANCH EXPORT (server: cross-border + tick off ⇒ taxRate
//     0, ANY seller). Gates the SALE side ONLY: the branch still incurred input VAT on its costs, so
//     isInputTaxable/purRateOf below deliberately never read it.
export const isTaxable = (ctx) => !(ctx && (ctx.noVat || ctx.saleZeroRated));
// Input (purchase) VAT: killed by `noVat` (whole booking VAT-free) but NOT by `saleZeroRated`
// (an INB export still records the input VAT it was actually charged).
const isInputTaxable = (ctx) => !(ctx && ctx.noVat);
const svcRateOf = (ctx) => { if (ctx && (ctx.noVat || ctx.saleZeroRated)) return 0; if (ctx && isVatBranch(ctx.branch)) return vatRateOf(ctx); return GST_RATE; };
// `noVat` ⇒ 0 (no input VAT either), checked BEFORE the branch rate so it wins on a VAT branch.
// Must NOT read saleZeroRated — a zero-rated sale says nothing about what the supplier charged us.
const purRateOf = (spec, ctx) => { if (ctx && ctx.noVat) return 0; if (ctx && isVatBranch(ctx.branch)) return vatRateOf(ctx); return moduleRate(spec); };
const pkgRateOf = (spec, ctx) => { if (ctx && (ctx.noVat || ctx.saleZeroRated)) return 0; if (ctx && isVatBranch(ctx.branch)) return vatRateOf(ctx); return spec.gstRate || PKG_GST; };
export { isVatBranch };
// Withholding on the supplier incentive/commission — the RATE follows the BRANCH's own
// country, because a branch withholds under the law of where it operates.
//   • India (BOM/AMD/BOMMB) → 194H at the statutory 2%.
//   • Africa (NBO/DAR/FBM)  → that country's WHT, which is per-supplier and already has a
//     home on the supplier master: `whtRate` / `whtSection` (added as "the VAT-world
//     counterparts of gstin/tdsSection") — fields that were built for exactly this and
//     never read by the calc.
// Unset rate → 0 → nothing withheld. That is the SAFE default and strictly better than the
// old behaviour, which applied India's 2% in Kenya/Tanzania/DR Congo: a real WHT-receivable
// asset and a supplier payable overstated by 2% of commission, at a foreign statutory rate.
// It also needs no data migration — populate whtRate per supplier and it starts working.
// NB: `foreignSupplier` still zeroes it entirely (an overseas vendor withholds nothing for
// us either way); this decides the rate only when a withholding does apply.
export const INCENTIVE_TDS_RATE = 0.02;
const whtRateOf = (ctx) => (isVatBranch(ctx && ctx.branch)
  ? num(ctx && ctx.supplierWhtRate) / 100
  : INCENTIVE_TDS_RATE);
// The branch's VAT rate as a PERCENT (16 / 18) rather than the fraction every rate helper above
// returns — for UI captions that STATE the rate. Reads the same live-then-static source as the
// math (vatRateOf), so a caption can't drift from the amount it labels. Africa branches only.
export const vatPctOf = (ctx) => r2(vatRateOf(ctx) * 100);
// What the SELLER's regime bills on an inter-branch Service Fee WHEN tax is billed: an India
// seller → IGST 18%; an Africa seller → its OWN branch rate (NBO/FBM 16, DAR 18), never a flat
// 18%. Mirrors the backend's rate pick in inb.service.inbTaxTreatment — keep the two in step.
// The name is IGST, not the generic "GST" caption: an inter-branch India supply is inter-state.
// SINGLE SOURCE (was a known gap) — an amended rate reaches the posting engine via the VatRate
// master (registerVatRates → vatRateOf), and it reaches this ctx via the branch config's
// `vatRate`, which GET /api/company-profile now SERVES from that same vatRateOf
// (companyProfile.route.js). So both bill the identical rate — amend it in Masters ▸ Tax and
// both sides follow. (Amend it in Company Profile and it's read-only, pointing there.)
// NB: this is the rate billed WHEN taxable — callers must not use it to decide IF tax applies
// (a zero-rated export bills nothing; that's isTaxable/saleZeroRated).
export const inbTaxOf = (ctx) => (isVatBranch(ctx && ctx.branch)
  ? { name: 'VAT', rate: vatPctOf(ctx) }
  : { name: 'IGST', rate: r2(GST_RATE * 100) });

export const finalPurchase = (spec, l) => r2(fareSum(spec, l) + num(l.psvc) + gstPur(spec, l) - num(l.incentive) + r2(num(l.incentive) * 0.02));
// Supplier service is NOT passed through to the customer (it's an agency cost), so
// the sale excludes psvc — that's what makes it reduce GP.
export const finalSales = (spec, l) => r2(fareSum(spec, l) + num(l.markup) + num(l.ssvc) + gstSvc(l));
export const salesGST = (l) => r2(gstSvc(l) + gstMk(l));
export const gpOf = (spec, l) => r2((finalSales(spec, l) - salesGST(l)) - (finalPurchase(spec, l) - gstPur(spec, l) - r2(num(l.incentive) * 0.02)));
export const gpPctOf = (spec, l) => { const fs = finalSales(spec, l); return fs > 0 ? r2((gpOf(spec, l) / fs) * 100) : 0; };

// Holiday "package" model (tour-operator): no service charge; Supplier Service GST
// is entered; SVC2 is the net agency margin. Tour-operator 5% scheme (no ITC):
// a SINGLE 5% output GST on the SALES consideration (taxable) = Base Fare + SVC2.
// The SVC2 margin is taxed ONCE here as part of the taxable value — NOT booked as a
// separate SVC2 GST AND re-taxed inside the base (the old double-count that made GST
// ~5.41%). The supplier service charge is a PURCHASE-side cost only — it is NOT
// billed to the customer and is NOT in the GST base. TCS (Intl) added at booking
// level on (taxable + GST). Cost = Land + Supplier Service + Supplier Service GST
// (GST claimed as ITC). GP = SVC2 − Supplier Service Charge (margin net of the
// supplier service we absorb).
export function lineCalcPackage(spec, l, ctx) {
  const rate = pkgRateOf(spec, ctx);
  const land = num(l.base);
  const psvc = num(l.psvc);
  // A FOREIGN supplier (master country ≠ India, e.g. a UAE DMC) charges no Indian
  // GST — import of service. Any entered Supplier Service GST is ignored: it never
  // loads into the cost and there is no ITC to claim on the purchase leg.
  const psvcGst = (ctx && ctx.foreignSupplier) ? 0 : num(l.psvcGst); // Supplier Service GST — entered
  const markup = num(l.markup);            // net markup (agency margin = SVC2)
  const incentive = num(l.incentive);
  // A FOREIGN supplier (master country ≠ India, e.g. IATA-BSP / Singapore) cannot
  // withhold Indian 194H TDS — drop it so the grid matches what the books post. The RATE
  // itself follows the branch's country (whtRateOf), not a hardcoded Indian 2%.
  const tds = (ctx && ctx.foreignSupplier) ? 0 : r2(incentive * whtRateOf(ctx));
  // Taxable SALES value = Base Fare + SVC2 only. The supplier service charge (psvc)
  // is a purchase-side cost we absorb — never billed to the customer, never in the
  // GST base. The supplier's GST is recovered as Input credit (ITC), not re-billed.
  const taxable = r2(land + markup);
  const outGst = r2(taxable * rate);       // 5% output GST on (Base Fare + SVC2)
  const finalSales = r2(taxable + outGst); // TCS added at booking level
  const finalPurchase = r2(land + psvc + psvcGst); // GROSS payable to supplier (ITC split below)
  const salesGST = outGst;
  // The supplier (a GST-registered tour operator, e.g. a Delhi DMC) charges 5% GST,
  // which we ALWAYS claim as Input GST (ITC) — allowed even under the 5% scheme for a
  // tour operator's input from another tour operator. It never loads onto the sale.
  const gstPur = psvcGst;
  // GP = SVC2 − supplier service charge (we recover the markup but absorb the supplier
  // service charge as a cost) + any supplier incentive (our income). Mirrors bookingTotals.
  const gp = r2(markup - psvc + incentive);
  return {
    pass: land, gstSvc: 0, gstMk: r2(markup * rate), gstPur, psvcGst, markup, asp: taxable, outGst,
    incentive, tds,
    finalSales, finalPurchase, salesGST, gp,
    gpPct: finalSales > 0 ? r2((gp / finalSales) * 100) : 0,
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
  // Input VAT follows the supplier, not the Without-VAT sale choice (decoupled).
  // A FOREIGN supplier (master country ≠ India) charges no Indian GST at all —
  // import of service — so the purchase leg carries ZERO input GST.
  const gPur = (ctx && ctx.foreignSupplier) ? 0 : (isInputTaxable(ctx) ? gstPur(spec, l, pr) : 0);
  const incentive = num(l.incentive);
  // A FOREIGN supplier (master country ≠ India, e.g. IATA-BSP / Singapore) cannot
  // withhold Indian 194H TDS — drop it so the grid matches what the books post. The RATE
  // itself follows the branch's country (whtRateOf), not a hardcoded Indian 2%.
  const tds = (ctx && ctx.foreignSupplier) ? 0 : r2(incentive * whtRateOf(ctx));
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
// NB: the options are destructured to named params and `ctx` below is rebuilt from that whitelist
// — a key not named here is SILENTLY DROPPED before any rate/gate helper sees it. Add new ctx
// inputs in BOTH places.
export function bookingTotals(spec, lines, { packageType = '', noSupplier = false, branch = '', noVat = false, saleZeroRated = false, availItc = false, foreignSupplier = false, clientType = '', interBranch = false, date = '', vatRate = null, supplierWhtRate = 0 } = {}) {
  const ctx = { branch, noVat: !!noVat, saleZeroRated: !!saleZeroRated, availItc: !!availItc, foreignSupplier: !!foreignSupplier, clientType, interBranch: !!interBranch, vatRate, supplierWhtRate };
  // A USD-book (Africa/VAT) branch bills to the cent → no whole-unit round-off snap.
  const bookCcy = isVatBranch(branch) ? 'USD' : 'INR';
  const po = { lineTotal: 0, serviceCharge: 0, gst: 0, tcs: 0, incentiveAmt: 0, incentiveGst: 0, incentiveTds: 0, total: 0, lines: [] };
  // `otherTaxesGst` = GST carved out of the SVC2 margin (GST-inclusive, so the
  // customer total is unchanged); kept OUT of `gst` so it posts to the dedicated
  // per-branch "SVC2 [C/S/I]GST Output" ledgers, separate from the regular GST.
  const so = { lineTotal: 0, serviceCharge: 0, gst: 0, otherTaxesGst: 0, tcs: 0, total: 0, lines: [] };
  // Per-component ledger heads (ex-GST). Every SO/PO field posts to its OWN ledger
  // under the Sales / Purchase group — pass-through fares + supplier service mirror
  // on both sides; SVC2 & Service Charge are sale-only (their GST → Output GST).
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
    so.otherTaxesGst += c.gstMk;          // GST on the SVC2 margin → separate ledgers
    so.total += c.finalSales;
    so.lines.push({ ...id, ...fares, pass: c.pass, markup: num(l.markup), ssvc: num(l.ssvc), gstMk: c.gstMk, gstSvc: c.gstSvc, gst: c.salesGST, total: c.finalSales });
    // heads — pass-through fares (sale = purchase). Package model: Land + Supplier
    // Service + Supplier Service GST are pass-through (both sides), SVC2 is sale-only
    // income (= GP). Fare model: Supplier Service is purchase-only (agency cost),
    // SVC2 (net of embedded GST) + Service Charge are sale-only.
    spec.fareCols.forEach((col) => { addH(sH, col.key, col.label, num(l[col.key])); addH(pH, col.key, col.label, num(l[col.key])); });
    if (isPkg(spec)) {
      // Supplier service charge is a PURCHASE-side cost only (Option A) — it is NOT
      // billed to the customer, so it never becomes a SALE head.
      addH(pH, 'psvc', 'Supp SVCHG', num(l.psvc));
      // Supplier Service GST is NEITHER a sale head NOR a purchase cost head — it is
      // claimed as Input GST (ITC) and posts via po.gst → Input GST ledgers.
      addH(sH, 'markup', 'SVC2', num(l.markup));
    } else {
      addH(pH, 'psvc', 'Supp SVCHG', num(l.psvc));
      addH(sH, 'markup', 'SVC2', r2(num(l.markup) - c.gstMk));
      addH(sH, 'ssvc', 'SVF', num(l.ssvc));
    }
    // NOTE: supplier incentive + 2% TDS are NOT posted as cost heads — they ride on
    // po.incentiveAmt / po.incentiveTds and post via the engine's incentivePostings
    // (Cr the commission income head, Dr TDS Receivable, supplier payable netted).
    // The income head is module-resolved BACKEND-side (posting.builder.commissionHead):
    // Insurance → "IN-Commission" (Sales Accounts · Insurance), every other module →
    // the shared "Commission / Incentive A/c.". Nothing to mirror here — the FE never
    // names that ledger, it only carries the scalars.
  });
  ['lineTotal', 'serviceCharge', 'gst', 'tcs', 'incentiveAmt', 'incentiveGst', 'incentiveTds', 'total'].forEach((k) => { po[k] = r2(po[k]); });
  ['lineTotal', 'serviceCharge', 'gst', 'tcs', 'total'].forEach((k) => { so[k] = r2(so[k]); });
  so.otherTaxesGst = r2(so.otherTaxesGst);
  // TCS u/s 206C(1G) — collected from the customer on the sale value (incl GST),
  // on top of the invoice. It's a Balance-Sheet liability, NOT income, so it never
  // enters the net and the GP is unchanged. India-only — never on Africa/VAT
  // branches (and moot under Without-VAT).
  // NEVER on an inter-branch deal. 206C(1G) is collected from a BUYER remitting for an overseas
  // tour; an INB counterparty is our OWN branch, so there is no such buyer. The server agrees and
  // pins tcsAmt 0 on every INB leg (inb.service: "for an INB sale net = total − IGST (no TCS)")
  // and derives the INSO total from fareLines + serviceFee alone — so without this gate the screen
  // quoted a TCS, and an inflated total, that the books never posted.
  // This CANNOT ride on clientType: 'INTER BRANCH' is its own sub-group, distinct from 'B2B'
  // (wiredSubGroups.PARTY), so isB2B() is false for it and TCS would still switch on.
  if (!ctx.noVat && !ctx.interBranch && !isVatBranch(ctx.branch) && !isB2B(ctx.clientType) && tcsApplies(spec, packageType)) {
    so.tcs = r2(so.total * tcs206cRate(spec, date) / 100);
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
    applyRoundOff(so, bookCcy); po.roundOff = 0;
    return { po, so, gp: { total: saleNet, pct: pct0, saleNet, costNet: 0 } };
  }
  // Commission (our income, netted off the payable) ADDS to GP → off the cost; the 2%
  // TDS is a balance-sheet asset, not income, so it never affects GP. Mirrors backend.
  const costNetForGp = r2(costNet - po.incentiveAmt);
  const total = r2(saleNet - costNetForGp);
  const pct = so.total > 0 ? r2((total / so.total) * 100) : 0;
  // Snap each side's invoice total to a whole unit (residue → `roundOff`) — INR-book only;
  // a USD-book (Africa) branch bills to the cent (no snap). Done last, so pct and every
  // net/head above stay on the un-rounded value → GP is untouched.
  applyRoundOff(so, bookCcy);
  applyRoundOff(po, bookCcy);
  return { po, so, gp: { total, pct, saleNet, costNet: costNetForGp } };
}
