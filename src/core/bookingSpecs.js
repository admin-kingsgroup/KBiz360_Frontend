// ─── SO/PO/GP booking — per-module column specs + tax math ────────────────────
// Mirrors the CRM moduleVoucherSpecs (and the aligned KBiz transaction vouchers)
// but is keyed by the ERP voucher MODULE CODES (SF/SH/SHT/SC/SV/SI/SM). Drives the
// single "SO / PO / GP" booking screen: the user fills the Purchase grid + a
// markup %, the Sales side auto-derives, and Gross Profit = the margin (ex-tax).
//
// tax.kind (same rules both sides):
//   'service' → GST rate% on the agency margin (service charge) only — pass-through cost untaxed
//   'all'     → GST rate% on (cost + margin)
//   'holiday' → GST 5% on (basic + service) + TCS 2% on (…+GST) when International
//   'perRow'  → each line carries its own gstPct

const HOTEL_COLS = [
  { key: 'passenger', label: 'PAX Name',     type: 'text' },
  { key: 'ci',        label: 'Check-in',     type: 'date' },
  { key: 'co',        label: 'Check-out',    type: 'date' },
  { key: 'rtype',     label: 'Room Type',    type: 'text' },
  { key: 'meal',      label: 'Meal',         type: 'select', options: ['EP', 'CP', 'MAP', 'AP'] },
  { key: 'basic',     label: 'Base Fare',    type: 'number', money: true },
  { key: 'taxes',     label: 'Taxes',        type: 'number', money: true },
  { key: 'otherTax',  label: 'Other Taxes',  type: 'number', money: true },
];

const VISA_COLS = [
  { key: 'name',     label: 'PAX Name',     type: 'text' },
  { key: 'pp',       label: 'Passport',     type: 'text' },
  { key: 'country',  label: 'Visa Country', type: 'text' },
  { key: 'vtype',    label: 'Visa Type',    type: 'text' },
  { key: 'vfsFee',   label: 'Base Fare',    type: 'number', money: true },
  { key: 'taxes',    label: 'Taxes',        type: 'number', money: true },
  { key: 'otherTax', label: 'Other Taxes',  type: 'number', money: true },
];

const CAR_COLS = [
  { key: 'vehicle',   label: 'Vehicle',    type: 'text' },
  { key: 'pickup',    label: 'Pickup',     type: 'text' },
  { key: 'drop',      label: 'Drop',       type: 'text' },
  { key: 'days',      label: 'Days',       type: 'number' },
  { key: 'basic',     label: 'Base Fare',  type: 'number', money: true },
  { key: 'otherFare', label: 'Other Fare', type: 'number', money: true },
];

const INSURANCE_COLS = [
  { key: 'name',     label: 'PAX Name',       type: 'text' },
  { key: 'pp',       label: 'Passport',       type: 'text' },
  { key: 'dest',     label: 'Destination',    type: 'text' },
  { key: 'basic',    label: 'Base Fare',      type: 'number', money: true },
  { key: 'otherTax', label: 'Other Taxes',    type: 'number', money: true },
];

const HOLIDAY_COLS = [
  { key: 'desc', label: 'Description', type: 'text' },
  { key: 'sac',  label: 'SAC',         type: 'text' },
  { key: 'amt',  label: 'Amount',      type: 'number', money: true },
];

const MISC_COLS = [
  { key: 'gl',     label: 'G.L Name', type: 'text' },
  { key: 'sac',    label: 'SAC',      type: 'text' },
  { key: 'amt',    label: 'Amount',   type: 'number', money: true },
  { key: 'gstPct', label: 'GST %',    type: 'select', options: ['0', '5', '12', '18'] },
];

const FLIGHT_COLS = [
  { key: 'passenger', label: 'PAX Name',  type: 'text' },
  { key: 'ticket',    label: 'Ticket no.', type: 'text' },
  { key: 'airline',   label: 'Airline',   type: 'text' },
  { key: 'sector',    label: 'Sector',    type: 'text' },
  { key: 'cls',       label: 'Class',     type: 'select', options: ['Economy', 'Premium Economy', 'Business', 'First'] },
  { key: 'base',      label: 'Base Fare', type: 'number', money: true },
  { key: 'k3',        label: 'K3 Tax',    type: 'number', money: true },
  { key: 'otherTax',  label: 'Other Taxes', type: 'number', money: true },
];

export const BOOKING_SPECS = {
  SF:  { code: 'SF',  name: 'Flight',    icon: '✈', columns: FLIGHT_COLS,    tax: { kind: 'service', rate: 18 },           packageTypeField: true },
  SH:  { code: 'SH',  name: 'Holiday',   icon: '🌴', columns: HOLIDAY_COLS,   tax: { kind: 'holiday', rate: 5, tcsRate: 2 }, packageTypeField: true,
         defaultRows: [{ desc: 'Land / air package', sac: '998552', amt: '' }] },
  SHT: { code: 'SHT', name: 'Hotel',     icon: '🏨', columns: HOTEL_COLS,     tax: { kind: 'service', rate: 18 } },
  SC:  { code: 'SC',  name: 'Car',       icon: '🚗', columns: CAR_COLS,       tax: { kind: 'all', rate: 5 } },
  SV:  { code: 'SV',  name: 'Visa',      icon: '🛂', columns: VISA_COLS,      tax: { kind: 'service', rate: 18 } },
  SI:  { code: 'SI',  name: 'Insurance', icon: '🛡', columns: INSURANCE_COLS, tax: { kind: 'all', rate: 18 } },
  SM:  { code: 'SM',  name: 'Misc',      icon: '📦', columns: MISC_COLS,      tax: { kind: 'perRow' } },
};

export const BOOKING_MODULE_LIST = Object.values(BOOKING_SPECS);

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (n) => (Number(n) || 0);
const isIntl = (pt) => String(pt || '').toLowerCase().startsWith('int');

// A blank row for a column set (numbers blank, selects → first option).
export function blankRow(columns) {
  const r = {};
  columns.forEach((c) => {
    r[c.key] = c.type === 'number' ? ''
      : (c.type === 'select' && c.options) ? c.options[0] : '';
  });
  return r;
}

export const seedRows = (spec) => (spec.defaultRows
  ? spec.defaultRows.map((r) => ({ ...blankRow(spec.columns), ...r }))
  : [blankRow(spec.columns)]);

// Financial totals for one side. serviceCharge carries the agency margin (taxed
// per the module's tax kind). Returns { lineTotal, serviceCharge, gst, tcs, total }.
export function computeTotals(spec, lines, { serviceCharge = 0, packageType = 'Domestic' } = {}) {
  const moneyKeys = spec.columns.filter((c) => c.money).map((c) => c.key);
  const lineTotal = round2((lines || []).reduce(
    (s, l) => s + moneyKeys.reduce((a, k) => a + num(l[k]), 0), 0));
  const svc = round2(serviceCharge);
  const tax = spec.tax || {};
  let gst = 0, tcs = 0;
  if (tax.kind === 'service') gst = round2(svc * tax.rate / 100);
  else if (tax.kind === 'all') gst = round2((lineTotal + svc) * tax.rate / 100);
  else if (tax.kind === 'holiday') {
    gst = round2(lineTotal * tax.rate / 100);
    if (isIntl(packageType)) tcs = round2((lineTotal + gst) * tax.tcsRate / 100);
  } else if (tax.kind === 'perRow') {
    gst = round2((lines || []).reduce((s, l) => s + num(l.amt) * (num(l.gstPct) / 100), 0));
  }
  const total = round2(lineTotal + svc + gst + tcs);
  return { lineTotal, serviceCharge: svc, gst, tcs, total };
}

// Derive the Sales side from the Purchase grid + markup % (option A).
//   margin M = PO line total × markup%; injected into the module's taxable margin:
//   service/all → service charge; holiday → a "Service" row; misc → per-row uplift.
// Returns { lines, serviceCharge, totals, margin }.
export function deriveSales(spec, poLines, markupPct, { packageType = 'Domestic' } = {}) {
  const poTotals = computeTotals(spec, poLines, { serviceCharge: 0, packageType });
  const margin = round2(poTotals.lineTotal * (num(markupPct) / 100));

  if (spec.tax.kind === 'holiday') {
    const sac = (poLines[0] && poLines[0].sac) || '998552';
    const lines = [
      { desc: 'Land / air package (cost)', sac, amt: poTotals.lineTotal },
      { desc: 'Service / agent margin',    sac: '998555', amt: margin },
    ];
    return { lines, serviceCharge: 0, totals: computeTotals(spec, lines, { serviceCharge: 0, packageType }), margin };
  }
  if (spec.tax.kind === 'perRow') {
    const f = 1 + num(markupPct) / 100;
    const lines = (poLines || []).map((l) => ({ ...l, amt: round2(num(l.amt) * f) }));
    return { lines, serviceCharge: 0, totals: computeTotals(spec, lines, { serviceCharge: 0, packageType }), margin };
  }
  // service / all → copy pass-through cost lines, margin rides on service charge.
  const lines = (poLines || []).map((l) => ({ ...l }));
  return { lines, serviceCharge: margin, totals: computeTotals(spec, lines, { serviceCharge: margin, packageType }), margin };
}

// Gross profit = sale net − cost net (both ex GST/TCS) = the agency margin.
export function grossProfit(poTotals, soTotals) {
  const saleNet = round2(soTotals.total - soTotals.gst - soTotals.tcs);
  const costNet = round2(poTotals.total - poTotals.gst - poTotals.tcs);
  const total = round2(saleNet - costNet);
  const pct = soTotals.total > 0 ? round2((total / soTotals.total) * 100) : 0;
  return { saleNet, costNet, total, pct };
}
