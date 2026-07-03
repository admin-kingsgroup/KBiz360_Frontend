import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Menu as DropdownMenu } from '../../ux/Menu';
import { FL, inp } from '../../styles';
import { todayISO } from '../../dates';
import { SmartDateInput } from '../../ux/SmartDateInput';
import { useAdmReasonCodes } from '../../useReference';
import { money2, r2 } from '../ui';

// ADM/ACM are BSP-ONLY memos: NO tax, NO markup, NO Sales/customer leg. The airline
// leg is always IATA BSP (locked); the cost/credit posts to ADM Charges / ACM Recovery
// (Direct Expenses). See posting.builder admLines/acmLines.
const BSP_LEDGER = 'IATA-BSP [Stock]';

/**
 * ADM (Agent Debit Memo) / ACM (Agent Credit Memo) body.
 *   ADM: Dr ADM Charges (Direct Expenses)  · Cr IATA BSP (Sundry Creditor)
 *   ACM: Dr IATA BSP (Sundry Creditor)      · Cr ACM Recovery (Direct Expenses, contra)
 */
export function AdmAcmFields({ state, setState, ctx, kind }) {
  const { cur } = ctx;
  const isAdm = kind === 'adm';
  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const reasonCodes = useAdmReasonCodes().data || {};
  const reasonList = Object.values(reasonCodes);
  const amount = r2(+state.amount || 0);          // the BSP memo value (no tax)

  // BSP-only + tax-free: pin the counterparty to IATA BSP and clear any GST once.
  React.useEffect(() => {
    if (state.counterParty !== BSP_LEDGER || state.gstPct || state.taxAmt) {
      patch({ counterParty: BSP_LEDGER, gstPct: 0, taxAmt: 0 });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 5 }}>
        <FL label="Airline / BSP (Creditor)">
          <input value={BSP_LEDGER} readOnly disabled title="ADM/ACM are BSP-only — locked to IATA BSP"
            style={{ ...inp, background: '#f4f5f7', color: '#334155', fontWeight: 700, cursor: 'not-allowed' }} />
        </FL>
        <FL label={`${isAdm ? 'ADM' : 'ACM'} amount (${cur})`}>
          <input type="number" value={state.amount} onChange={(e) => patch({ amount: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right', fontWeight: 700 }} />
        </FL>
      </div>

      <p style={{ margin: '2px 0 12px', fontSize: 10.5, color: '#5a6691' }}>
        {isAdm ? 'Booked as ADM Charges (Direct Expenses)' : 'Booked as ACM Recovery (Direct Expenses, contra)'} · {isAdm ? 'payable to' : 'credit from'} <b>IATA BSP</b> {money2(cur, amount)} · <b>no tax</b>
      </p>

      <FL label="Narration"><textarea value={state.remarks || ''} onChange={(e) => patch({ remarks: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder={`Being ${isAdm ? 'Agent Debit' : 'Agent Credit'} Memo${state.reasonCode ? ` (${state.reasonCode})` : ''}`} /></FL>
    </>
  );
}
