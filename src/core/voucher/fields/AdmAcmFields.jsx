import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Menu as DropdownMenu } from '../../ux/Menu';
import { FL, inp } from '../../styles';
import { todayISO } from '../../dates';
import { SmartDateInput } from '../../ux/SmartDateInput';
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
        <FL label="Date"><SmartDateInput max={todayISO()} value={state.date || ''} onChange={(iso) => patch({ date: iso })} style={inp} /></FL>
        <FL label="Ticket / reference (optional)"><input value={state.againstInvoice || ''} onChange={(e) => patch({ againstInvoice: e.target.value })} style={inp} placeholder="Ticket / ADM no." /></FL>
        <FL label="Reason code">
          <DropdownMenu
            ariaLabel="Reason code"
            menuRole="listbox"
            items={[{ key: '', label: 'select', selected: !state.reasonCode, onSelect: () => patch({ reasonCode: '' }) },
              ...reasonList.map((r) => ({ key: r.code, label: `${r.code} — ${r.label}`, selected: state.reasonCode === r.code, onSelect: () => patch({ reasonCode: r.code }) }))]}
            renderTrigger={({ ref, toggle, triggerProps }) => (
              <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                  {state.reasonCode ? `${state.reasonCode} — ${reasonCodes[state.reasonCode]?.label || ''}` : 'select'}
                </span>
                <ChevronDown size={14} style={{ color: '#5b616e', flexShrink: 0 }} />
              </button>
            )}
          />
        </FL>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 5 }}>
        <FL label="Airline / BSP (Creditor)">
          <LedgerPicker branch={branch} value={state.counterParty} onChange={(v) => patch({ counterParty: v })} filter={(l) => l.type === 'Creditor'} placeholder="Select airline / BSP..." />
        </FL>
        <FL label={`${isAdm ? 'ADM' : 'ACM'} amount (${cur})`}>
          <input type="number" value={state.amount} onChange={(e) => patch({ amount: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right', fontWeight: 700 }} />
        </FL>
        <FL label={`GST on memo (${isAdm ? 'input' : 'output'} credit)`}>
          <DropdownMenu
            ariaLabel="GST on memo"
            menuRole="listbox"
            items={GST_SLABS.map((r) => ({ key: r, label: `${r}%`, selected: state.gstPct === r, onSelect: () => patch({ gstPct: r }) }))}
            renderTrigger={({ ref, toggle, triggerProps }) => (
              <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{state.gstPct}%</span>
                <ChevronDown size={14} style={{ color: '#5b616e', flexShrink: 0 }} />
              </button>
            )}
          />
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
