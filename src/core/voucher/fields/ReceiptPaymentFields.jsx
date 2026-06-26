import React, { useEffect } from 'react';
import { FL, inp, btnGh } from '../../styles';
import { todayISO } from '../../dates';
import { SmartDateInput } from '../../ux/SmartDateInput';
import { useOpenBills } from '../../useAccounting';
import { useLedgerRegistry } from '../../useReference';
import { BillAllocPanel } from '../../../modules/transactions';
import { LedgerPicker } from '../LedgerPicker';
import { useVoucherRef } from '../useVoucherRef';
import { allocSummary, money2, GREEN, RED } from '../ui';

/**
 * Receipt (money IN from a debtor) / Payment (money OUT to a creditor) body.
 * `side` ('customer' | 'supplier') flips party type, labels and the open-bills
 * direction. Shared by create and edit via VoucherShell; operates on the shell's
 * form state. Bill-wise allocation reuses the existing BillAllocPanel.
 */
export function ReceiptPaymentFields({ state, setState, ctx, side }) {
  const { branch, cur } = ctx;
  const isReceipt = side === 'customer';
  const accent = isReceipt ? GREEN : RED;
  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const { tdsSections: TDS_SECTIONS, paymentModes: PMT_MODES_V } = useVoucherRef();

  // The "other side" can be ANY ledger (customer, supplier, expense, loan, tax…).
  // Bill-wise allocation + TDS apply ONLY when it's a true party ledger:
  //   receipt → Debtor, payment → Creditor. Anything else posts as a plain
  //   Dr/Cr pair (Tally-style direct entry). otherType is mirrored into state so
  //   the registry's toBody/validate can branch without the chart.
  const chart = useLedgerRegistry(branch).data || [];
  const otherType = (chart.find((l) => l.name === state.party) || {}).type || '';
  const isParty = otherType === (isReceipt ? 'Debtor' : 'Creditor');
  useEffect(() => {
    if (state.party && otherType && state.otherType !== otherType) setState((s) => ({ ...s, otherType }));
  }, [otherType, state.party]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live open bills for the chosen party. When editing, exclude this voucher's own
  // settlement so the bills it already cleared reappear and stay re-allocatable.
  const billsQ = useOpenBills(isParty ? state.party : '', branch, side, ctx.editId);

  // Keep billVno→billId in sync as bills load, so toBody can carry billId.
  useEffect(() => {
    const m = {};
    (billsQ.data?.bills || []).forEach((b) => { m[b.billVno] = b.billId; });
    if (Object.keys(m).length) setState((s) => ({ ...s, _billIds: { ...s._billIds, ...m } }));
  }, [billsQ.data, setState]);

  const net = +state.amount || 0;
  const tds = state.tds ? (+state.tdsAmt || 0) : 0;
  const gross = Math.round((net + tds) * 100) / 100;
  const sum = allocSummary(state.alloc, gross, state.parkOnAcc, state.applyMode);

  const setAllocFor = (vno, val, out) => {
    let v = +val || 0; if (v < 0) v = 0; if (v > out) v = out;
    setState((s) => ({ ...s, alloc: { ...s.alloc, [vno]: v } }));
  };
  const fullAlloc = (vno, out) => {
    const others = Object.entries(state.alloc || {}).reduce((s, [k, v]) => (k === vno ? s : s + (+v || 0)), 0);
    const remain = Math.max(0, Math.round((gross - others) * 100) / 100);
    setState((s) => ({ ...s, alloc: { ...s.alloc, [vno]: gross > 0 ? Math.min(out, remain) : out } }));
  };
  const tdsRate = (TDS_SECTIONS[state.tdsSection] || {}).rate || 0;
  const autoTds = () => {
    if (tdsRate) patch({ tdsAmt: Math.round(net * tdsRate / (100 - tdsRate)) });
  };
  // Reset the bill allocation whenever the party changes.
  const onParty = (name) => setState((s) => ({ ...s, party: name, alloc: {}, parkOnAcc: false, applyMode: 'bills', _billIds: {} }));

  const mob = false;
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 14, paddingTop: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <FL label="Date"><SmartDateInput max={todayISO()} value={state.date || ''} onChange={(iso) => patch({ date: iso })} style={inp} /></FL>
          <FL label={isReceipt ? 'Received from (account credited — Cr)' : 'Paid to (account debited — Dr)'}>
            <LedgerPicker branch={branch} value={state.party} onChange={onParty} filter={(l) => l.type !== 'Bank' && l.type !== 'Cash'} placeholder={isReceipt ? 'Customer, loan, income, any account…' : 'Supplier, expense, salary, tax, any account…'} />
          </FL>
          <FL label={isReceipt ? 'Received in (Bank / Cash — Dr)' : 'Paid from (Bank / Cash — Cr)'}>
            <LedgerPicker branch={branch} value={state.bankRef} onChange={(v) => patch({ bankRef: v })} filter={(l) => l.type === 'Bank' || l.type === 'Cash'} placeholder="Select bank / cash account..." />
          </FL>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <FL label="Payment mode">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PMT_MODES_V.map((m) => (
                <button key={m} onClick={() => patch({ paymentMode: m })} style={{
                  padding: '5px 11px', borderRadius: 6, fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                  background: state.paymentMode === m ? '#0d1326' : '#f3f4f8', color: state.paymentMode === m ? '#d4a437' : '#384677',
                  border: '1.5px solid ' + (state.paymentMode === m ? '#d4a437' : '#e1e3ec'),
                }}>{m}</button>
              ))}
            </div>
          </FL>
          {state.paymentMode !== 'Cash' && <FL label="UTR / Reference"><input value={state.utr || ''} onChange={(e) => patch({ utr: e.target.value })} style={{ ...inp, fontFamily: 'monospace' }} placeholder="UTR / cheque / txn ref" /></FL>}
          <FL label={isReceipt ? 'Amount received (net of TDS)' : 'Amount paid (net of TDS)'}>
            <input type="number" value={state.amount} onChange={(e) => patch({ amount: e.target.value })} placeholder="0.00" style={{ ...inp, fontSize: 16, fontWeight: 700, color: accent }} />
          </FL>
        </div>
      </div>

      {/* Direct (non-party) entry note — e.g. an expense paid or income received */}
      {state.party && !isParty && (
        <div style={{ padding: '9px 12px', borderRadius: 9, background: '#EAF1FB', border: '1px solid #B9D6F2', margin: '12px 0', fontSize: 10.5, color: '#185FA5', fontWeight: 600 }}>
          Direct entry — posts <b>{isReceipt ? `Dr ${state.bankRef || 'Bank'} · Cr ${state.party}` : `Dr ${state.party} · Cr ${state.bankRef || 'Bank'}`}</b>. {otherType ? `“${state.party}” is ${otherType}, not a party — ` : ''}no bill-wise / TDS. For a credit GST bill use Purchase-Expense; for a split entry use Journal.
        </div>
      )}

      {/* TDS (party receipts/payments only) */}
      {isParty && (
      <div style={{ padding: '10px 12px', borderRadius: 9, background: '#FAEEDA', border: '1px solid #FAC775', margin: '12px 0' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: state.tds ? 8 : 0 }}>
          <input type="checkbox" checked={!!state.tds} onChange={(e) => patch({ tds: e.target.checked })} style={{ cursor: 'pointer', accentColor: '#854F0B' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#854F0B' }}>{isReceipt ? 'Party has deducted TDS before paying' : 'Deduct TDS at source before paying'}</span>
        </label>
        {state.tds && (
          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
            <FL label="TDS Section"><select value={state.tdsSection} onChange={(e) => patch({ tdsSection: e.target.value })} style={inp}>{Object.entries(TDS_SECTIONS).filter(([k]) => k !== 'None').map(([k, s]) => <option key={k} value={k}>{k} ({s.rate}%)</option>)}</select></FL>
            <FL label="Rate"><div style={{ ...inp, background: '#f9fafb', color: '#854F0B', fontWeight: 700, display: 'flex', alignItems: 'center' }}>{tdsRate}%</div></FL>
            <FL label="TDS amount"><input type="number" value={state.tdsAmt || ''} onChange={(e) => patch({ tdsAmt: +e.target.value || 0 })} style={inp} /></FL>
            <button onClick={autoTds} style={{ ...btnGh, fontSize: 10, padding: '7px 10px' }}>Auto-calc</button>
          </div>
        )}
        {state.tds && tds > 0 && <p style={{ margin: '6px 0 0', fontSize: 10, color: '#854F0B' }}>Gross settlement <b>{money2(cur, gross)}</b> · {isReceipt ? 'TDS receivable' : 'TDS payable'} <b>{money2(cur, tds)}</b> · {isReceipt ? 'Net received' : 'Net paid'} <b>{money2(cur, net)}</b></p>}
      </div>
      )}

      {/* Bill-wise allocation (party ledgers only) */}
      {isParty && (
      <BillAllocPanel
        side={side} party={state.party} q={billsQ} amount={gross}
        alloc={state.alloc} onSetAlloc={setAllocFor} onFull={fullAlloc}
        mode={state.applyMode} onMode={(m) => patch({ applyMode: m })}
        parkOnAcc={state.parkOnAcc} onParkOnAcc={(v) => patch({ parkOnAcc: v })} cur={cur}
      />
      )}

      <div style={{ marginTop: 11 }}><FL label="Narration"><textarea value={state.remarks || ''} onChange={(e) => patch({ remarks: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder={state.party ? `Being ${isReceipt ? 'receipt from' : 'payment to'} ${state.party}` : 'Accounting narration...'} /></FL></div>
    </>
  );
}
