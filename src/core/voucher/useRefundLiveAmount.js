// The Amount shown for a refund/reissue row in an approvals queue must match the
// Edit modal's "Live JV" EXACTLY — so it rebuilds the same voucher body from the
// saved voucher doc and runs it through the same live preview, instead of trusting
// the bulk /api/vouchers/approvals preview. The two can diverge when the bulk
// preview's original-sale lookup doesn't resolve (DB latency) and silently falls
// back to the simpler net-settlement model — see the RF00063 "client amount
// differs" report. Falls back to the bulk entry's own net figure (or its raw
// total) until the live preview resolves, so the cell never renders blank.
//
// Deliberately does NOT import ../voucher/registry — that pulls in every voucher
// field component (LedgerPicker, JournalFields, …) just for an amount column, which
// breaks lighter-weight test mocks that don't stub that whole graph. The small
// fromVoucher/toBody mapping for refund/reissue (+ its refund-partial variant) is
// mirrored locally instead; registry.jsx's makeRefundReissue/makeRefundPartial
// remain the source of truth for the actual edit form.
import { useVoucher, useVoucherPreview } from '../useAccounting';
import { clientNetFromJv } from './fields/refundPrefill';
import { buildRefundReissueBody } from './fields/refundBody';
import { r2 } from './ui';

const lineAmt = (v, ledger) => {
  const l = ((v && v.lines) || []).find((x) => x.ledger === ledger);
  return l ? (l.amt ?? '') : '';
};

function refundBodyFromSaved(v, kind) {
  const state = {
    date: v.date || '', againstInvoice: v.againstInvoice || v.linkNo || '', againstPurchase: v.againstPurchase || '', gstMode: v.gstMode || 'intra',
    party: v.party || '', counterParty: v.counterParty || '', supplierAmt: v.supplierAmt ?? '',
    serviceCharge: lineAmt(v, 'SVF Income') || lineAmt(v, 'Service Charge Income'), markup: lineAmt(v, 'SVC2 Income') || lineAmt(v, 'Markup Income'),
    gstPct: v.gstPct != null && +v.gstPct ? +v.gstPct : 18,
    supplierSvc: v.supplierSvc ?? '', supplierGst: v.supplierGst ?? '',
    supplierCancel: v.supplierCancel ?? '', supplierCancelGst: v.supplierCancelGst ?? '', cancelRecover: v.cancelRecover !== false,
    incentiveAmt: v.incentiveAmt ?? '', incentiveGst: v.incentiveGst ?? '', incentiveTds: v.incentiveTds ?? '', remarks: v.remarks || '',
  };
  const ctx = { branch: v.branch, branchCode: v.branch, cur: '' };
  return { party: state.party, body: { ...buildRefundReissueBody(state, ctx, kind), sourceRef: v.sourceRef || '' } };
}

// Mirrors registry.jsx's makeRefundPartial().toBody — a partial refund reverses
// only the entered amount, no service-charge/GST split.
function partialRefundBodyFromSaved(v) {
  const amt = r2(+v.partialAmount || 0);
  return {
    party: v.party || '',
    body: {
      type: 'RF', category: 'refund', branch: v.branch, date: v.date,
      party: v.party || '', partyType: 'customer',
      counterParty: v.counterParty || '', counterPartyGroup: 'Sundry Creditors',
      partialAmount: amt, supplierAmt: amt, lines: [], subtotal: 0, taxAmt: 0,
      gstMode: v.gstMode || 'intra', gstPct: 0, total: amt,
      againstInvoice: v.againstInvoice || v.linkNo || '', againstPurchase: v.againstPurchase || '', linkNo: v.againstInvoice || v.linkNo || '',
      remarks: v.remarks || `Being partial refund of ${amt}`,
      status: 'saved', sourceRef: v.sourceRef || '',
    },
  };
}

export function useRefundLiveAmount(entry) {
  const vq = useVoucher(entry && entry.id);
  const v = vq.data;
  const isPartial = !!(entry && entry.category === 'refund' && +(v && v.partialAmount) > 0);
  const built = v ? (isPartial ? partialRefundBodyFromSaved(v) : refundBodyFromSaved(v, entry.category)) : null;
  const pv = useVoucherPreview(built && built.body).data || {};

  const isRefund = !entry || entry.category !== 'reissue';
  const bulkFallback = clientNetFromJv(entry && entry.postings, entry && entry.party, isRefund, (entry && entry.total) || 0);
  const livePostings = pv.postings;
  return (livePostings && livePostings.length)
    ? clientNetFromJv(livePostings, (built && built.party) || (entry && entry.party), isRefund, bulkFallback)
    : bulkFallback;
}
