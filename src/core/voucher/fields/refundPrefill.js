// Pure mapping: a fetched SO/PO/GP booking → the Refund-form fields to auto-fill.
// Kept in its own dependency-light module (only ./ui) so it is unit-testable without
// dragging in the styles/useReference/api import chain the JSX component needs.
//
// Deliberately OMITS our service charge + its GST (we retain them — never refunded
// to the client) and the supplier service charge + its GST (the supplier keeps them
// — never returned to us); those stay blank. Everything else carries over: the
// airline-refundable fare (PO total less the supplier service fee & its GST), our
// Other-Taxes margin (from the original sale), and the commission reversal
// (clawback / GST / TDS). `state` is the current form so we never clobber a
// customer / supplier / GST-mode the preparer already chose.
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
    else if (/service charge income|markup income/.test(l)) side = 'sale'; // retained income
    else side = 'sale';                                         // fallback (keeps the leg visible)
    (side === 'sale' ? sale : purchase).push(p);
  }
  return { sale, purchase };
}

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

export function refundPrefillFromBooking(b, state = {}) {
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
    markup: blank(markupTotal),                            // Our Other Taxes ← original SO markup
    incentiveAmt: reverse ? blank(r2(num(po.incentiveAmt))) : '',   // Commission clawback ← PO incentive
    incentiveGst: reverse ? blank(r2(num(po.incentiveGst))) : '',
    incentiveTds: reverse ? blank(r2(num(po.incentiveTds))) : '',
    ...(state.party ? {} : { party: b?.customer?.ledgerName || b?.customer?.name || '' }),
    ...(state.counterParty ? {} : { counterParty: b?.supplier?.ledgerName || b?.supplier?.name || '' }),
    ...(state.gstMode ? {} : { gstMode: so.gstMode || b?.gstMode || '' }),
  };
}
