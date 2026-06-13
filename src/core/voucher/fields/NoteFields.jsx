import React from 'react';
import { FL, inp } from '../../styles';
import { VPlaceOfSupply } from '../../../modules/transactions';
import { LedgerPicker } from '../LedgerPicker';
import { useVoucherRef } from '../useVoucherRef';
import { money2, r2 } from '../ui';

/**
 * Credit Note (sales return) / Debit Note (purchase return) body. `kind` flips the
 * party side, the reasons list and the GST direction. The base return ledger is
 * fixed; the user supplies party, reason, taxable, GST % and optional TCS reversal.
 * Shared by create and edit via VoucherShell.
 */
export function NoteFields({ state, setState, ctx, kind, reasons }) {
  const { branch, cur } = ctx;
  const isCredit = kind === 'credit';
  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const ref = useVoucherRef();
  const GST_SLABS = ref.gstSlabs;
  // Reasons: live config (per kind) wins, else the registry-passed fallback list.
  const reasonList = (ref.noteReasons && ref.noteReasons[kind]) || reasons || [];

  const taxable = r2(+state.taxable || 0);
  const gstAmt = r2(taxable * (+state.gstPct || 0) / 100);
  const tcs = r2(+state.tcs || 0);
  const total = r2(taxable + gstAmt + tcs);
  const cgst = state.gstMode === 'inter' ? 0 : r2(gstAmt / 2);
  const sgst = state.gstMode === 'inter' ? 0 : r2(gstAmt - cgst);
  const igst = state.gstMode === 'inter' ? gstAmt : 0;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <FL label="Date"><input type="date" value={state.date || ''} onChange={(e) => patch({ date: e.target.value })} style={inp} /></FL>
        <FL label="Against invoice"><input value={state.againstInvoice || ''} onChange={(e) => patch({ againstInvoice: e.target.value })} style={inp} placeholder="DS/32/26-27" /></FL>
        <VPlaceOfSupply mode={state.gstMode} onChange={(m) => patch({ gstMode: m })} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <FL label={isCredit ? 'Credit To (Customer / Debtor)' : 'Debit To (Supplier / Creditor)'}>
          <LedgerPicker branch={branch} value={state.party} onChange={(v) => patch({ party: v })} filter={(l) => l.type === (isCredit ? 'Debtor' : 'Creditor')} placeholder={isCredit ? 'Select customer / debtor...' : 'Select supplier / creditor...'} />
        </FL>
        <FL label="Reason"><select value={state.reason} onChange={(e) => patch({ reason: e.target.value })} style={inp}>{reasonList.map((r) => <option key={r}>{r}</option>)}</select></FL>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 6 }}>
        <FL label={`Taxable amount (${cur})`}><input type="number" value={state.taxable} onChange={(e) => patch({ taxable: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right', fontWeight: 700 }} /></FL>
        <FL label="GST rate"><select value={state.gstPct} onChange={(e) => patch({ gstPct: +e.target.value })} style={inp}>{GST_SLABS.map((r) => <option key={r} value={r}>{r}%</option>)}</select></FL>
        <FL label={`TCS reversed (${cur}, optional)`}><input type="number" value={state.tcs} onChange={(e) => patch({ tcs: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
      </div>
      {(gstAmt > 0 || total > 0) && (
        <p style={{ margin: '2px 0 12px', fontSize: 10, color: '#5a6691' }}>
          {gstAmt > 0 && (state.gstMode === 'inter' ? <>IGST <b>{money2(cur, igst)}</b> · </> : <>CGST <b>{money2(cur, cgst)}</b> · SGST <b>{money2(cur, sgst)}</b> · </>)}
          Note total <b>{money2(cur, total)}</b>
        </p>
      )}

      <FL label="Narration"><textarea value={state.remarks || ''} onChange={(e) => patch({ remarks: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder={`Being ${isCredit ? 'credit' : 'debit'} note for ${(state.reason || '').toLowerCase()}${state.againstInvoice ? ` against ${state.againstInvoice}` : ''}`} /></FL>
    </>
  );
}
