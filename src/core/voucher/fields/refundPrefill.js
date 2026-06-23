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

export function refundPrefillFromBooking(b, state = {}) {
  const po = b?.po || {}, so = b?.so || {};
  const soLines = Array.isArray(so.lines) ? so.lines : [];
  const blank = (n) => (n ? n : '');                       // keep the 0.00 placeholder for empty values
  const supplierRefund = r2(num(po.total) - num(po.serviceCharge) - num(po.gst));
  const markupTotal = r2(soLines.reduce((s, l) => s + num(l && l.markup), 0));
  return {
    againstInvoice: b?.saleVno || '',
    againstPurchase: b?.purchaseVno || '',
    supplierAmt: supplierRefund,
    markup: blank(markupTotal),                            // Our Other Taxes ← original SO markup
    incentiveAmt: blank(r2(num(po.incentiveAmt))),         // Commission clawback ← PO incentive
    incentiveGst: blank(r2(num(po.incentiveGst))),
    incentiveTds: blank(r2(num(po.incentiveTds))),
    ...(state.party ? {} : { party: b?.customer?.ledgerName || b?.customer?.name || '' }),
    ...(state.counterParty ? {} : { counterParty: b?.supplier?.ledgerName || b?.supplier?.name || '' }),
    ...(state.gstMode ? {} : { gstMode: so.gstMode || b?.gstMode || '' }),
  };
}
