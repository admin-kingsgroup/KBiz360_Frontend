import React from 'react';
import { FL, inp } from '../../styles';
import { VPlaceOfSupply } from '../../../modules/transactions';
import { LedgerPicker } from '../LedgerPicker';
import { useVoucherRef } from '../useVoucherRef';
import { useAdmReasonCodes } from '../../useReference';
import { money2, r2 } from '../ui';

/**
 * ADM (Agent Debit Memo) / ACM (Agent Credit Memo) body. `kind` ('adm' | 'acm')
 * flips the direction; the "Pass on to customer" toggle flips the posting model:
 *   absorb  → single-party vs the BSP/airline creditor (the agency bears/keeps it).
 *   pass-on → two-party (ADM ≈ reissue: customer billed; ACM ≈ refund: credited),
 *             with our retained service charge + markup (+GST) on the customer leg.
 * See posting.builder admLines/acmLines.
 */
export function AdmAcmFields({ state, setState, ctx, kind }) {
  const { branch, cur } = ctx;
  const isAdm = kind === 'adm';
  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const ref = useVoucherRef();
  const GST_SLABS = ref.gstSlabs;
  const reasonCodes = useAdmReasonCodes().data || {};
  const reasonList = Object.values(reasonCodes);

  const amount = r2(+state.amount || 0);          // the airline memo value
  const passOn = !!state.passOn;
  const svc = r2(+state.serviceCharge || 0);
  const markup = r2(+state.markup || 0);
  const ourIncome = r2(svc + markup);
  const taxAmt = passOn ? r2(ourIncome * (+state.gstPct || 0) / 100) : 0;
  // Pass-on customer figure: ADM bills (memo + our charges + GST); ACM credits
  // (memo − our charges − GST). Absorb has no customer leg.
  const custTotal = !passOn ? 0
    : isAdm ? r2(amount + ourIncome + taxAmt) : r2(amount - ourIncome - taxAmt);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <FL label="Date"><input type="date" value={state.date || ''} onChange={(e) => patch({ date: e.target.value })} style={inp} /></FL>
        <FL label="Ticket / reference (optional)"><input value={state.againstInvoice || ''} onChange={(e) => patch({ againstInvoice: e.target.value })} style={inp} placeholder="Ticket / ADM no." /></FL>
        <FL label="Reason code">
          <select value={state.reasonCode || ''} onChange={(e) => patch({ reasonCode: e.target.value })} style={inp}>
            <option value="">— select —</option>
            {reasonList.map((r) => <option key={r.code} value={r.code}>{r.code} — {r.label}</option>)}
          </select>
        </FL>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <FL label="Airline / BSP (Creditor)">
          <LedgerPicker branch={branch} value={state.counterParty} onChange={(v) => patch({ counterParty: v })} filter={(l) => l.type === 'Creditor'} placeholder="Select airline / BSP..." />
        </FL>
        <FL label={`${isAdm ? 'ADM' : 'ACM'} amount (${cur})`}>
          <input type="number" value={state.amount} onChange={(e) => patch({ amount: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right', fontWeight: 700 }} />
        </FL>
        <FL label="Treatment">
          <select value={passOn ? 'pass' : 'absorb'} onChange={(e) => patch({ passOn: e.target.value === 'pass' })} style={inp}>
            <option value="absorb">Agency {isAdm ? 'absorbs' : 'keeps'}</option>
            <option value="pass">Pass to customer</option>
          </select>
        </FL>
      </div>

      {passOn && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <FL label="Customer (Debtor)">
              <LedgerPicker branch={branch} value={state.party} onChange={(v) => patch({ party: v })} filter={(l) => l.type === 'Debtor'} placeholder="Select customer / debtor..." />
            </FL>
            <VPlaceOfSupply mode={state.gstMode} onChange={(m) => patch({ gstMode: m })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 6 }}>
            <FL label={`Our service charge (${cur})`}><input type="number" value={state.serviceCharge} onChange={(e) => patch({ serviceCharge: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
            <FL label={`Our markup (${cur})`}><input type="number" value={state.markup} onChange={(e) => patch({ markup: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
            <FL label="GST on our charges"><select value={state.gstPct} onChange={(e) => patch({ gstPct: +e.target.value })} style={inp}>{GST_SLABS.map((r) => <option key={r} value={r}>{r}%</option>)}</select></FL>
          </div>
        </>
      )}

      <p style={{ margin: '2px 0 12px', fontSize: 10.5, color: '#5a6691' }}>
        {!passOn
          ? <>{isAdm ? 'Booked as ADM Charges (cost)' : 'Booked as ACM Recovery (income)'} · {isAdm ? 'payable to' : 'credit from'} airline <b>{money2(cur, amount)}</b></>
          : <>Our income <b>{money2(cur, ourIncome)}</b> · GST <b>{money2(cur, taxAmt)}</b> · {isAdm ? 'Billed to customer ' : 'Credited to customer '}<b style={{ color: custTotal < 0 ? '#A32D2D' : '#185FA5' }}>{money2(cur, custTotal)}</b>{custTotal < 0 && ' — charges exceed memo'}</>}
      </p>

      <FL label="Narration"><textarea value={state.remarks || ''} onChange={(e) => patch({ remarks: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder={`Being ${isAdm ? 'Agent Debit' : 'Agent Credit'} Memo${state.reasonCode ? ` (${state.reasonCode})` : ''}`} /></FL>
    </>
  );
}
