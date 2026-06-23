import React from 'react';
import { FL, inp } from '../../styles';
import { todayISO } from '../../dates';
import { SmartDateInput } from '../../ux/SmartDateInput';
import { VPlaceOfSupply } from '../../../modules/transactions';
import { LedgerPicker } from '../LedgerPicker';
import { useVoucherRef } from '../useVoucherRef';
import { money2, r2 } from '../ui';

/**
 * Refund (RF) / Reissue (RI) body — two-party, raised against a sales invoice.
 * `kind` ('refund' | 'reissue') flips the customer/supplier direction:
 *   refund  → supplier (airline) refunds us; we refund the balance to the customer.
 *   reissue → supplier charges a fee + fare difference; we bill the customer.
 * Our retained service charge + Other Taxes (margin) post as income; any charge the
 * supplier levies on us posts as our own cost. The customer figure is derived so
 * the voucher always balances (see posting.builder refundLines/reissueLines).
 */
export function RefundReissueFields({ state, setState, ctx, kind }) {
  const { branch, cur } = ctx;
  const isRefund = kind === 'refund';
  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const ref = useVoucherRef();
  const GST_SLABS = ref.gstSlabs;

  const supplierAmt = r2(+state.supplierAmt || 0);   // airline refund receivable (RF) / payable (RI)
  const svc = r2(+state.serviceCharge || 0);
  const markup = r2(+state.markup || 0);
  const ourIncome = r2(svc + markup);
  const taxAmt = r2(ourIncome * (+state.gstPct || 0) / 100);
  const supSvc = r2(+state.supplierSvc || 0);
  const supGst = r2(+state.supplierGst || 0);
  // Customer refund payable (RF) / amount billed (RI).
  const total = isRefund
    ? r2(supplierAmt + supSvc + supGst - ourIncome - taxAmt)
    : r2(supplierAmt - supSvc - supGst + ourIncome + taxAmt);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <FL label="Date"><SmartDateInput max={todayISO()} value={state.date || ''} onChange={(iso) => patch({ date: iso })} style={inp} /></FL>
        <FL label="Against sales invoice"><input value={state.againstInvoice || ''} onChange={(e) => patch({ againstInvoice: e.target.value })} style={inp} placeholder="SF/BOM/26/0001" /></FL>
        <FL label="Related purchase invoice"><input value={state.againstPurchase || ''} onChange={(e) => patch({ againstPurchase: e.target.value })} style={inp} placeholder="PF/BOM/26/0001" /></FL>
        <VPlaceOfSupply mode={state.gstMode} onChange={(m) => patch({ gstMode: m })} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <FL label="Customer (Debtor)">
          <LedgerPicker branch={branch} value={state.party} onChange={(v) => patch({ party: v })} filter={(l) => l.type === 'Debtor'} placeholder="Select customer / debtor..." />
        </FL>
        <FL label="Supplier / Airline (Creditor)">
          <LedgerPicker branch={branch} value={state.counterParty} onChange={(v) => patch({ counterParty: v })} filter={(l) => l.type === 'Creditor'} placeholder="Select airline / supplier..." />
        </FL>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 6 }}>
        <FL label={isRefund ? `Supplier refund (${cur})` : `Supplier fee + fare diff (${cur})`}>
          <input type="number" value={state.supplierAmt} onChange={(e) => patch({ supplierAmt: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right', fontWeight: 700 }} />
        </FL>
        <FL label={`Our service charge (${cur})`}><input type="number" value={state.serviceCharge} onChange={(e) => patch({ serviceCharge: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
        <FL label={`Our Other Taxes (${cur})`}><input type="number" value={state.markup} onChange={(e) => patch({ markup: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 6 }}>
        <FL label="GST on our charges"><select value={state.gstPct} onChange={(e) => patch({ gstPct: +e.target.value })} style={inp}>{GST_SLABS.map((r) => <option key={r} value={r}>{r}%</option>)}</select></FL>
        <FL label={`Supplier service charge (${cur}, our cost)`}><input type="number" value={state.supplierSvc} onChange={(e) => patch({ supplierSvc: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
        <FL label={`Supplier GST (${cur}, input credit)`}><input type="number" value={state.supplierGst} onChange={(e) => patch({ supplierGst: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
      </div>

      {isRefund && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 6 }}>
            <FL label={`Airline cancellation fee (${cur}, supplier kept)`}><input type="number" value={state.supplierCancel} onChange={(e) => patch({ supplierCancel: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
            <FL label={`Cancellation GST (${cur})`}><input type="number" value={state.supplierCancelGst} onChange={(e) => patch({ supplierCancelGst: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
            <FL label="Recover cancellation from customer"><label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, height: 34 }}><input type="checkbox" checked={state.cancelRecover !== false} onChange={(e) => patch({ cancelRecover: e.target.checked })} /> charge it to the client (pass-through)</label></FL>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 6 }}>
            <FL label={`Commission clawback (${cur})`}><input type="number" value={state.incentiveAmt} onChange={(e) => patch({ incentiveAmt: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
            <FL label={`Commission GST (${cur})`}><input type="number" value={state.incentiveGst} onChange={(e) => patch({ incentiveGst: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
            <FL label={`TDS reversed (${cur})`}><input type="number" value={state.incentiveTds} onChange={(e) => patch({ incentiveTds: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
          </div>
        </>
      )}

      <p style={{ margin: '2px 0 12px', fontSize: 10.5, color: '#5a6691' }}>
        Our income <b>{money2(cur, ourIncome)}</b> · GST <b>{money2(cur, taxAmt)}</b> ·
        {isRefund ? ' Refund payable to customer ' : ' Billed to customer '}
        <b style={{ color: total < 0 ? '#A32D2D' : '#185FA5' }}>{money2(cur, total)}</b>
        {total < 0 && ' — our charges exceed the supplier amount'}
      </p>
      {isRefund && (
        <p style={{ margin: '-6px 0 12px', fontSize: 10.5, color: '#A07828' }}>
          The linked sale (and purchase, if referenced) is <b>reversed in full</b> on posting; the customer is refunded the original invoice less the cancellation charge above. The net refund is finalised from the original invoice when posted.
        </p>
      )}

      <FL label="Narration"><textarea value={state.remarks || ''} onChange={(e) => patch({ remarks: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder={`Being ${kind}${state.againstInvoice ? ` against ${state.againstInvoice}` : ''}`} /></FL>
    </>
  );
}
