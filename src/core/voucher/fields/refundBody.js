// Single source of truth for the Refund (RF) / Reissue (RI) voucher body. Used by
// the registry's toBody (on save) AND by the field component's live JV preview, so
// the journal the accountant sees while editing is built from the exact same payload
// that gets posted. Pure + dependency-light (only ./ui) → unit-testable.
import { r2 } from '../ui';

export function buildRefundReissueBody(s, ctx, kind) {
  const isRefund = kind === 'refund';
  const supplierAmt = r2(+s.supplierAmt || 0);
  const svc = r2(+s.serviceCharge || 0), markup = r2(+s.markup || 0);
  const ourIncome = r2(svc + markup);
  const rate = (+s.gstPct || 0) / 100;
  // GST is split by component so each posts to its own ledgers: the Service Fee GST →
  // regular CGST/SGST/IGST Output (taxAmt); the Service Charge-2 (SVC2) margin GST →
  // the dedicated "SVC2 [C/S/I]GST Output" ledgers (otherTaxesGst). The backend splits
  // each into CGST/SGST (intra) or IGST (inter) by gstMode.
  const taxAmt = r2(svc * rate);
  const otherTaxesGst = r2(markup * rate);
  const supSvc = r2(+s.supplierSvc || 0), supGst = r2(+s.supplierGst || 0);
  // Refund-only: the airline's cancellation fee the supplier keeps (passed through to
  // the customer when cancelRecover) and the commission/TDS we clawed back.
  const supCancel = isRefund ? r2(+s.supplierCancel || 0) : 0;
  const supCancelGst = isRefund ? r2(+s.supplierCancelGst || 0) : 0;
  const incentiveAmt = isRefund ? r2(+s.incentiveAmt || 0) : 0;
  const incentiveGst = isRefund ? r2(+s.incentiveGst || 0) : 0;
  const incentiveTds = isRefund ? r2(+s.incentiveTds || 0) : 0;
  const total = isRefund
    ? r2(supplierAmt + supSvc + supGst - ourIncome - taxAmt - otherTaxesGst)
    : r2(supplierAmt - supSvc - supGst + ourIncome + taxAmt + otherTaxesGst);
  const lines = [];
  if (svc > 0) lines.push({ ledger: 'SVF Income', amt: svc, desc: 'Service Fee' });
  if (markup > 0) lines.push({ ledger: 'SVC2 Income', amt: markup, desc: 'Service Charge - 2' });
  return {
    type: isRefund ? 'RF' : 'RI', category: kind, branch: ctx.branchCode, date: s.date,
    party: s.party, partyType: 'customer',
    counterParty: s.counterParty, counterPartyGroup: 'Sundry Creditors',
    supplierAmt, supplierSvc: supSvc, supplierGst: supGst,
    supplierCancel: supCancel, supplierCancelGst: supCancelGst, cancelRecover: s.cancelRecover !== false,
    incentiveAmt, incentiveGst, incentiveTds,
    lines, subtotal: ourIncome, taxAmt, otherTaxesGst, gstMode: s.gstMode, gstPct: +s.gstPct || 0, total,
    // A FULL refund/reissue is never partial — clear partialAmount EXPLICITLY so the
    // posting engine (which takes the partial path when partialAmount>0) can never be
    // hijacked by a stale value lingering from a prior shape (a partial $set update
    // wouldn't clear an omitted key). Same stale-field class as the party-edit bug.
    partialAmount: 0,
    againstInvoice: s.againstInvoice, againstPurchase: s.againstPurchase || '', linkNo: s.againstInvoice,
    remarks: s.remarks || `Being ${kind}${s.againstInvoice ? ` against ${s.againstInvoice}` : ''}`,
    status: 'saved',
  };
}
