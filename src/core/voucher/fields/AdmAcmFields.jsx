import React from 'react';
import { FL, inp } from '../../styles';
import { todayISO } from '../../dates';
import { VPlaceOfSupply } from '../../../modules/transactions';
import { LedgerPicker } from '../LedgerPicker';
import { useVoucherRef } from '../useVoucherRef';
import { useAdmReasonCodes } from '../../useReference';
import { money2, r2 } from '../ui';

/**
 * ADM (Agent Debit Memo) / ACM (Agent Credit Memo) body. These are BSP-only memos
 * with NO markup and NO Sales/customer involvement — they always post straight to
 * Direct Expenses vs the BSP/airline creditor (ADM = a cost Dr; ACM = a contra Cr).
 * Optional GST on the memo posts as input (ADM) / output (ACM) credit. See
 * posting.builder admLines/acmLines.
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
  const gstPct = +state.gstPct || 0;
  const taxAmt = r2(amount * gstPct / 100);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <FL label="Date"><input type="date" max={todayISO()} value={state.date || ''} onChange={(e) => patch({ date: e.target.value })} style={inp} /></FL>
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
        <FL label={`GST on memo (${isAdm ? 'input' : 'output'} credit)`}>
          <select value={state.gstPct} onChange={(e) => patch({ gstPct: +e.target.value })} style={inp}>{GST_SLABS.map((r) => <option key={r} value={r}>{r}%</option>)}</select>
        </FL>
      </div>

      {taxAmt > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <VPlaceOfSupply mode={state.gstMode} onChange={(m) => patch({ gstMode: m })} />
        </div>
      )}

      <p style={{ margin: '2px 0 12px', fontSize: 10.5, color: '#5a6691' }}>
        {isAdm ? 'Booked as ADM Charges (Direct Expenses)' : 'Booked as ACM Recovery (Direct Expenses, contra)'} · {isAdm ? 'payable to' : 'credit from'} airline <b>{money2(cur, r2(amount + taxAmt))}</b>{taxAmt > 0 && <> (incl. GST {money2(cur, taxAmt)})</>}
      </p>

      <FL label="Narration"><textarea value={state.remarks || ''} onChange={(e) => patch({ remarks: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder={`Being ${isAdm ? 'Agent Debit' : 'Agent Credit'} Memo${state.reasonCode ? ` (${state.reasonCode})` : ''}`} /></FL>
    </>
  );
}
