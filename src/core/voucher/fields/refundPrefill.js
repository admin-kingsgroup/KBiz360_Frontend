// Pure mapping: a fetched SO/PO/GP booking → the Refund-form fields to auto-fill.
// Kept in its own dependency-light module (only ./ui) so it is unit-testable without
// dragging in the styles/useReference/api import chain the JSX component needs.
//
// On a REFUND, the Fetch adopts the ORIGINAL sale's retained charges (Owner's rule
// 2026-07-22): "Our Service Fee" ← the SO's service fee (e.g. ₹300, so the refund
// invoice prints the same fee + its GST) and "Our Service Charge - 2" ← the SO's NET
// SVC2 (e.g. ₹30 → ₹35.40 with GST, exactly re-retaining the margin the sale reversal
// would otherwise hand back) — the client is refunded ONLY the airline fare. Fetch is
// an explicit action, so both fields are overwritten like Supplier Refund is; they
// stay editable afterwards. Deliberately OMITS the supplier service charge + its GST
// (the supplier keeps them — never returned to us); those stay blank. Everything else
// carries over: the airline-refundable fare (PO total less the supplier service fee &
// its GST) and the commission reversal (clawback / GST / TDS).
//
// The original SO SVC2 (margin) is handled by `isRefund`: on a REFUND it is refunded
// to the client IN FULL (the sale reversal returns it), so we must NOT pre-load it as
// our retained refund-markup — doing so would re-bill the same amount and net the
// refund to zero. On a REISSUE the original margin carries over to the amendment.
// `state` is the current form so we never clobber a customer / supplier / GST-mode the
// preparer already chose.
import { r2 } from '../ui';

const num = (v) => (Number(v) || 0);
// Recognised Indian GST slabs (mirrors the backend GST_SLABS in approvalChecks).
const GST_SLABS = [0, 5, 12, 18, 28];

// Recover the GST RATE the original sale was booked at, from its SO snapshot — so a
// refund defaults to the SAME rate the sale used (a holiday sale at 5% refunds at 5%,
// not a blanket 18%). The snapshot stores GST as amounts, not a rate, so we back it out
// from the per-line components: the Service-Fee GST (gstSvc) over the service-fee base
// (ssvc), falling back to the SVC2 margin GST (otherTaxesGst) over the net SVC2. The
// result is snapped to the nearest recognised slab to absorb float-division noise
// (17.998 → 18). Returns null when the sale carries no taxable retained income to
// derive from — the caller then keeps the current/default rate.
export function gstPctFromSo(so) {
  const lines = Array.isArray(so && so.lines) ? so.lines : [];
  const svcBase = num(so && so.serviceCharge) || lines.reduce((s, l) => s + num(l && l.ssvc), 0);
  const svcGst  = lines.reduce((s, l) => s + num(l && l.gstSvc), 0);
  const svc2Base = lines.reduce((s, l) => s + (num(l && l.markup) - num(l && l.gstMk)), 0);
  const svc2Gst  = num(so && so.otherTaxesGst);
  let rate = null;
  if (svcBase > 0 && svcGst > 0) rate = (svcGst / svcBase) * 100;
  else if (svc2Base > 0 && svc2Gst > 0) rate = (svc2Gst / svc2Base) * 100;
  if (rate == null) return null;
  return GST_SLABS.reduce((best, s) => (Math.abs(s - rate) < Math.abs(best - rate) ? s : best), GST_SLABS[0]);
}

// PO snapshot for the read-only fetch view, with the Supplier Incentive surfaced as
// a per-line column (+ its 2% TDS). The stored `po.lines` snapshot doesn't keep
// incentive per-line — it's aggregated into the `incentiveAmt` scalar — while the
// per-line value lives in the booking's `rows` grid. We merge it back so the PO grid
// matches the booking-entry form (which has a "Supplier Incentive" column). Falls
// back to the scalar when there's a single line and no rows detail.
// Split a refund/reissue journal's flat legs into the sale-reversal side and the
// purchase-reversal side, by what each leg reverses — so the JV can render as two
// balanced T-blocks (like the original Sales / Purchase vouchers). `party` is the
// customer (Sundry Debtor), `counterParty` the supplier (Sundry Creditor).
export function splitRefundJv(postings = [], opts = {}) {
  const party = opts.party || '', counterParty = opts.counterParty || '';
  const sale = [], purchase = [];
  for (const p of postings || []) {
    const led = String(p && p.ledger || '');
    const grp = String(p && p.group || '').toLowerCase();
    const l = led.toLowerCase();
    let side;
    if (party && led === party) side = 'sale';                  // the customer
    else if (counterParty && led === counterParty) side = 'purchase'; // the supplier
    else if (/sales account/.test(grp)) side = 'sale';
    else if (/purchase account/.test(grp)) side = 'purchase';
    else if (/recovered/.test(l)) side = 'sale';                // cancellation recovered from customer
    else if (/cancellation/.test(l)) side = 'purchase';         // airline cancellation fee (our cost)
    else if (/output/.test(l)) side = 'sale';                   // output GST → sell side
    else if (/input/.test(l)) side = 'purchase';                // input-credit GST → cost side
    else if (/commission|incentive/.test(l)) side = 'purchase'; // supplier commission reversal
    else if (/tds/.test(l)) side = 'purchase';
    else if (/svf income|service charge income|svc2 income|markup income/.test(l)) side = 'sale'; // retained income
    else side = 'sale';                                         // fallback (keeps the leg visible)
    (side === 'sale' ? sale : purchase).push(p);
  }
  return { sale, purchase };
}

// The customer figure to DISPLAY on a refund/reissue must equal what actually POSTS —
// the customer leg of the live (full-reversal) JV, net of the airline cancellation
// recovered from the client. This replaces the old net-settlement `total` caption, which
// pre-dated the full-reversal model and over-stated the refund payable. `party` is the
// customer (Sundry Debtor). Refund → client is Cr (payable); reissue → Dr (billed). Falls
// back to `fallback` (the local total) until the preview resolves / no party is picked.
export function clientNetFromJv(postings = [], party = '', isRefund = true, fallback = 0) {
  const ps = Array.isArray(postings) ? postings : [];
  if (!ps.length || !party) return fallback;
  const net = ps.filter((p) => p && p.ledger === party).reduce((s, p) => s + num(p && p.credit) - num(p && p.debit), 0);
  return r2(isRefund ? net : -net);
}

// consolidateLegs now lives in ../ui (shared by the one JvBlock renderer used app-wide).
// Re-exported here for back-compat with existing imports/tests.
export { consolidateLegs } from '../ui';

export function poSnapForView(po = {}, rows = []) {
  const lines = Array.isArray(po && po.lines) ? po.lines : [];
  const r = Array.isArray(rows) ? rows : [];
  const single = lines.length === 1;
  const merged = lines.map((l, i) => {
    const inc = num(r[i] && r[i].incentive) || (single ? num(po.incentiveAmt) : 0);
    if (!inc) return l;
    const tds = single ? (num(po.incentiveTds) || r2(inc * 0.02)) : r2(inc * 0.02);
    return { ...l, incentive: r2(inc), incentiveTds: tds };
  });
  return { ...po, lines: merged };
}

// ── Ticket / sector traceability ──────────────────────────────────────────────
// Every PO carries its tickets' sectors (primary PO → booking.rows, an N-PO Flight
// leg → leg.rows). A refund/reissue targets ONE PO, so surfacing that PO's segments
// lets the preparer pick BY TICKET, and the same snapshot is stamped onto the
// reversal (`sectors` + `sectorRef`) so the voucher records exactly what it reverses.
export function ticketSectors(rows = []) {
  const out = [];
  (Array.isArray(rows) ? rows : []).forEach((r, rowIdx) => (Array.isArray(r && r.sectors) ? r.sectors : []).forEach((s) => {
    // skip the blank seed row a fresh grid line carries
    if (!String((s && (s.sector || s.ticketNo || s.pnr || s.flightNo)) || '').trim()) return;
    out.push({ rowIdx, fn: (r && r.fn) || '', sn: (r && r.sn) || '', sector: s.sector || '', airline: s.airline || '', flightNo: s.flightNo || '', ticketNo: s.ticketNo || '', pnr: s.pnr || '', travelDate: s.travelDate || '' });
  }));
  return out;
}
// Compact one-line reference ("BOM-DXB EK 501 TKT 0981… + DXB-NBO KQ 311 …") for the
// default narration and the stored reversal stamp.
export const sectorRefOf = (secs = []) => secs
  .map((s) => [s.sector, s.flightNo || s.airline, s.ticketNo ? `TKT ${s.ticketNo}` : ''].filter(Boolean).join(' '))
  .filter(Boolean).join(' + ');

// N-PO (Phase 4): prefill a refund against ONE additional purchase leg of a folder.
// Mirrors refundPrefillFromBooking but sourced from the leg: the supplier-refundable
// amount + the commission clawback come from the LEG's po, the supplier is the leg's
// supplier, and againstPurchase points at the leg's own Purchase voucher. The folder
// SALE (againstInvoice) is shared. A leg carries no separate sale margin in this model
// (it's billed pass-through, e.g. a Misc in SO Taxes, or part of a package), so the
// retained SVC2 `markup` defaults to 0 — the preparer can still type a retained fee.
export function refundPrefillFromLeg(leg, b, state = {}) {
  const po = leg?.po || {};
  const blank = (n) => (n ? n : '');
  const supplierRefund = r2(num(po.total) - num(po.serviceCharge) - num(po.gst));
  const reverse = state.commissionReversal !== false;
  const sup = leg?.supplier || {};
  const secs = ticketSectors(leg?.rows);
  return {
    againstInvoice: b?.saleVno || '',
    againstPurchase: leg?.purchaseVno || '',
    sectors: secs, sectorRef: sectorRefOf(secs),
    supplierAmt: supplierRefund,
    markup: '',                                            // leg has no separate sale margin (pass-through)
    incentiveAmt: reverse ? blank(r2(num(po.incentiveAmt))) : '',
    incentiveGst: reverse ? blank(r2(num(po.incentiveGst))) : '',
    incentiveTds: reverse ? blank(r2(num(po.incentiveTds))) : '',
    ...(state.party ? {} : { party: b?.customer?.ledgerName || b?.customer?.name || '' }),
    ...(state.counterParty ? {} : { counterParty: sup.ledgerName || sup.name || '' }),
    ...(state.gstMode ? {} : { gstMode: leg?.gstMode || b?.gstMode || '' }),
    // Adopt the folder sale's GST rate (leg is pass-through, no separate rate of its own).
    ...((() => { const p = gstPctFromSo(b?.so); return p != null ? { gstPct: p } : {}; })()),
  };
}

export function refundPrefillFromBooking(b, state = {}, isRefund = true) {
  const po = b?.po || {}, so = b?.so || {};
  const soLines = Array.isArray(so.lines) ? so.lines : [];
  const blank = (n) => (n ? n : '');                       // keep the 0.00 placeholder for empty values
  const supplierRefund = r2(num(po.total) - num(po.serviceCharge) - num(po.gst));
  const markupTotal = r2(soLines.reduce((s, l) => s + num(l && l.markup), 0));
  // Commission Reversal toggle (refund only): when explicitly OFF the original
  // commission / its GST / TDS are NOT reversed on the refund, so never fill them.
  const reverse = state.commissionReversal !== false;
  const secs = ticketSectors(b?.rows);
  return {
    againstInvoice: b?.saleVno || '',
    againstPurchase: b?.purchaseVno || '',
    sectors: secs, sectorRef: sectorRefOf(secs),
    supplierAmt: supplierRefund,
    // REFUND → retain the ORIGINAL sale's SVC2: fill the NET margin (heads-first — the
    // per-line `markup` is stored GST-inclusive) so the form's GST-on-top reproduces the
    // sale's exact SVC2 (+GST), cancelling what the sale reversal returns — the client
    // is refunded only the airline fare. REISSUE → carries the SO margin as before.
    markup: isRefund
      ? blank((() => {
        const heads = Array.isArray(so.heads) ? so.heads : [];
        const h = heads.find((x) => x && x.key === 'markup');
        if (h) return r2(num(h.amt));
        return r2(soLines.reduce((s, l) => s + (num(l && l.markup) - num(l && l.gstMk)), 0));
      })())
      : blank(markupTotal),                                // Our Service Charge - 2
    // REFUND → Our Service Fee ← the ORIGINAL sale's service fee (see the module note),
    // so the refund invoice shows the same retained fee the sale billed.
    ...(isRefund
      ? (() => { const f = r2(num(so.serviceCharge) || soLines.reduce((s, l) => s + num(l && l.ssvc), 0)); return f ? { serviceCharge: f } : {}; })()
      : {}),
    incentiveAmt: reverse ? blank(r2(num(po.incentiveAmt))) : '',   // Commission clawback ← PO incentive
    incentiveGst: reverse ? blank(r2(num(po.incentiveGst))) : '',
    incentiveTds: reverse ? blank(r2(num(po.incentiveTds))) : '',
    ...(state.party ? {} : { party: b?.customer?.ledgerName || b?.customer?.name || '' }),
    ...(state.counterParty ? {} : { counterParty: b?.supplier?.ledgerName || b?.supplier?.name || '' }),
    ...(state.gstMode ? {} : { gstMode: so.gstMode || b?.gstMode || '' }),
    // Default the refund's GST rate to the rate the original sale used (falls through to
    // the form's existing/initial rate when the sale has no taxable income to derive from).
    ...((() => { const p = gstPctFromSo(so); return p != null ? { gstPct: p } : {}; })()),
  };
}
