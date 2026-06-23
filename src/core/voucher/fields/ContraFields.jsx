import React from 'react';
import { FL, inp } from '../../styles';
import { todayISO } from '../../dates';
import { SmartDateInput } from '../../ux/SmartDateInput';
import { LedgerPicker } from '../LedgerPicker';
import { V_DR, V_CR, RED } from '../ui';

/**
 * Contra voucher body — a transfer between the firm's own Cash/Bank accounts.
 * DR = "Transferred To" (destination, posts as lines[0].ledger),
 * CR = "Transferred From" (source, posts as bankRef). One amount, entered once.
 * Shared by create and edit via VoucherShell.
 */
export function ContraFields({ state, setState, ctx }) {
  const { branch } = ctx;
  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const isSame = !!state.drLedger && state.drLedger === state.crLedger;
  const amtBox = { ...inp, textAlign: 'right', fontSize: 15, fontWeight: 700 };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <FL label="Date"><SmartDateInput max={todayISO()} value={state.date || ''} onChange={(iso) => patch({ date: iso })} style={inp} /></FL>
        <FL label="Reference (UTR / cash receipt no.)"><input value={state.ref || ''} onChange={(e) => patch({ ref: e.target.value })} style={inp} placeholder="Optional" /></FL>
      </div>

      {/* DR — transferred to */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.5px', padding: '3px 10px', borderRadius: 4, color: '#fff', background: V_DR }}>DR</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#5a6691' }}>Transferred To (Cash / Bank)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 12 }}>
          <LedgerPicker branch={branch} value={state.drLedger} onChange={(v) => patch({ drLedger: v })} filter={(l) => l.type === 'Bank' || l.type === 'Cash'} placeholder="Select bank / cash account..." />
          <input type="number" value={state.amount} onChange={(e) => patch({ amount: e.target.value })} placeholder="0.00" style={{ ...amtBox, borderLeft: `3px solid ${V_DR}` }} />
        </div>
      </div>

      {/* CR — transferred from */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.5px', padding: '3px 10px', borderRadius: 4, color: '#fff', background: V_CR }}>CR</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#5a6691' }}>Transferred From (Cash / Bank)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 12 }}>
          <LedgerPicker branch={branch} value={state.crLedger} onChange={(v) => patch({ crLedger: v })} filter={(l) => (l.type === 'Bank' || l.type === 'Cash') && l.name !== state.drLedger} placeholder="Select bank / cash account..." />
          <input type="number" value={state.amount} onChange={(e) => patch({ amount: e.target.value })} placeholder="0.00" style={{ ...amtBox, borderLeft: `3px solid ${V_CR}` }} />
        </div>
      </div>

      {isSame && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FCEBEB', fontSize: 10.5, color: RED, fontWeight: 600, marginBottom: 10 }}>⚠ The two accounts must be different.</div>}

      <FL label="Narration"><textarea value={state.remarks || ''} onChange={(e) => patch({ remarks: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder={state.crLedger && state.drLedger ? `Being contra — transfer from ${state.crLedger} to ${state.drLedger}` : 'Being cash withdrawn / deposited between own accounts'} /></FL>
    </>
  );
}
