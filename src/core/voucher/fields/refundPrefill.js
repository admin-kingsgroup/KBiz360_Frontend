// Pure mapping: a fetched SO/PO/GP booking → the Refund-form fields to auto-fill.
// Kept in its own dependency-light module (only ./ui) so it is unit-testable without
// dragging in the styles/useReference/api import chain the JSX component needs.
//
// Deliberately OMITS our service charge + its GST (we retain them — never refunded
// to the client) and the supplier service charge + its GST (the supplier keeps them
// — never returned to us); those stay blank. Everything else carries over: the
// airline-refundable fare (PO total less the supplier service fee & its GST) and the
// commission reversal (clawback / GST / TDS).
//
// The original SO SVC2 (margin) is handled by `isRefund`: on a REFUND it is refunded
// to the client IN FULL (the sale reversal returns it), so we must NOT pre-load it as
// our retained refund-markup — doing so would re-bill the same amount and net the
// refund to zero. On a REISSUE the original margin carries over to the amendment.
// `state` is the current form so we never clobber a customer / supplier / GST-mode the
// preparer already chose.
import { r2 } from '../ui';

const num = (v) => (Number(v) || 0);

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
  return {
    againstInvoice: b?.saleVno || '',
    againstPurchase: leg?.purchaseVno || '',
    supplierAmt: supplierRefund,
    markup: '',                                            // leg has no separate sale margin (pass-through)
    incentiveAmt: reverse ? blank(r2(num(po.incentiveAmt))) : '',
    incentiveGst: reverse ? blank(r2(num(po.incentiveGst))) : '',
    incentiveTds: reverse ? blank(r2(num(po.incentiveTds))) : '',
    ...(state.party ? {} : { party: b?.customer?.ledgerName || b?.customer?.name || '' }),
    ...(state.counterParty ? {} : { counterParty: sup.ledgerName || sup.name || '' }),
    ...(state.gstMode ? {} : { gstMode: leg?.gstMode || b?.gstMode || '' }),
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
  return {
    againstInvoice: b?.saleVno || '',
    againstPurchase: b?.purchaseVno || '',
    supplierAmt: supplierRefund,
    // REFUND → blank: the original SO SVC2 is refunded to the client in full by the
    // sale reversal, so it is NOT retained as our refund-markup (that would re-charge
    // it and net it to zero). REISSUE → carries over the original SO margin.
    markup: isRefund ? '' : blank(markupTotal),            // Our Service Charge - 2
    incentiveAmt: reverse ? blank(r2(num(po.incentiveAmt))) : '',   // Commission clawback ← PO incentive
    incentiveGst: reverse ? blank(r2(num(po.incentiveGst))) : '',
    incentiveTds: reverse ? blank(r2(num(po.incentiveTds))) : '',
    ...(state.party ? {} : { party: b?.customer?.ledgerName || b?.customer?.name || '' }),
    ...(state.counterParty ? {} : { counterParty: b?.supplier?.ledgerName || b?.supplier?.name || '' }),
    ...(state.gstMode ? {} : { gstMode: so.gstMode || b?.gstMode || '' }),
  };
}
