import React from 'react';
import { FL, inp } from '../../styles';
import { todayISO } from '../../dates';
import { SmartDateInput } from '../../ux/SmartDateInput';
import { VPlaceOfSupply } from '../../../modules/transactions';
import { LedgerPicker } from '../LedgerPicker';
import { isVatBranch } from '../../voucherSpecs';
import { money2, r2 } from '../ui';

/**
 * Refund PARTIAL (RF) body — cancellation of only PART of a booking. Raised against
 * a sales invoice (and its related purchase). Instead of unwinding the whole booking
 * like a full Refund, it reverses only the entered amount off the booking's BASIC
 * fare/cost head, refunds the customer and recovers the same from the supplier — the
 * rest of the booking stays intact and the net P&L impact is nil. See
 * posting.builder refundPartialLines (triggered by partialAmount > 0).
 */
export function RefundPartialFields({ state, setState, ctx }) {
  const { branch, branchCode, cur } = ctx;
  // Place of Supply is India-GST only (intra = CGST+SGST / inter = IGST); an Africa (VAT)
  // branch has a single VAT rate and no such split. Mirrors PXP / RefundReissueFields.
  const isVatBr = isVatBranch(branchCode || (branch && (branch.code || branch)) || '');
  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const amt = r2(+state.partialAmount || 0);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <FL label="Date"><SmartDateInput max={todayISO()} value={state.date || ''} onChange={(iso) => patch({ date: iso })} style={inp} /></FL>
        <FL label="Against sales invoice"><input value={state.againstInvoice || ''} onChange={(e) => patch({ againstInvoice: e.target.value })} style={inp} placeholder="BOM/0626/SF00495" /></FL>
        <FL label="Related purchase invoice"><input value={state.againstPurchase || ''} onChange={(e) => patch({ againstPurchase: e.target.value })} style={inp} placeholder="BOM/0626/PF00495" /></FL>
        {!isVatBr ? <VPlaceOfSupply mode={state.gstMode} onChange={(m) => patch({ gstMode: m })} /> : <div />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <FL label="Customer (Debtor)">
          <LedgerPicker branch={branch} value={state.party} onChange={(v) => patch({ party: v })} filter={(l) => l.type === 'Debtor'} placeholder="Select customer / debtor..." />
        </FL>
        <FL label="Supplier / Airline (Creditor)">
          <LedgerPicker branch={branch} value={state.counterParty} onChange={(v) => patch({ counterParty: v })} filter={(l) => l.type === 'Creditor'} placeholder="Select airline / supplier..." />
        </FL>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 6 }}>
        <FL label={`Amount to refund (${cur})`}>
          <input type="number" value={state.partialAmount} onChange={(e) => patch({ partialAmount: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right', fontWeight: 700 }} />
        </FL>
      </div>

      <p style={{ margin: '2px 0 12px', fontSize: 10.5, color: '#A07828' }}>
        Reverses <b style={{ color: '#185FA5' }}>{money2(cur, amt)}</b> off the linked booking's basic fare/cost only —
        customer refunded {money2(cur, amt)}, supplier recovered {money2(cur, amt)}. The rest of the booking is untouched (P&amp;L-neutral).
      </p>

      <FL label="Narration"><textarea value={state.remarks || ''} onChange={(e) => patch({ remarks: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder={`Being partial refund${state.againstInvoice ? ` against ${state.againstInvoice}` : ''}`} /></FL>
    </>
  );
}
