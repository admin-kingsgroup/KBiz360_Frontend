import React, { useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { FL, inp, btnGh, card } from '../../styles';
import { VPlaceOfSupply } from '../../../modules/transactions';
import { LedgerPicker } from '../LedgerPicker';
import { useVoucherRef } from '../useVoucherRef';
import { V_DR, V_CR, DARK, DIM, money2, dnTotals, r2 } from '../ui';

/**
 * Debit-Note body — a PURCHASE RETURN to a supplier (goods/services sent back, or
 * a supplier over-billing reversed). It is the mirror of a purchase:
 *   Supplier A/c (Sundry Creditor)  Dr   net        (we owe the supplier less)
 *   To Purchase ledger(s)           Cr   Σ returns  (cost reversed — default side)
 *   Charge/adjustment ledger(s)     Dr   Σ Dr lines (a charge the supplier retains)
 *   To Input CGST/SGST or IGST      Cr   gstAmt     (input credit reversed)
 * Like a journal/purchase voucher, every line carries a per-line Dr/Cr toggle
 * (defaulting to Cr = cost reversed); the backend's debitNoteLines posts each line
 * on its own side and debits the supplier with the balancing net. GST is
 * amount-canonical (the % just auto-fills an editable amount), so edit round-trips
 * exactly. The shell renders the live JV effect below the form.
 */
export function DebitNoteFields({ state, setState, ctx }) {
  const { branch, cur } = ctx;
  const idRef = useRef(1000);
  const lines = state.lines || [];
  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const { gstSlabs: GST_SLABS } = useVoucherRef();

  const updLine = (i, k, v) => setState((s) => ({ ...s, lines: s.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));
  const addLine = () => setState((s) => ({ ...s, lines: [...s.lines, { _k: idRef.current++, ledger: '', drCr: 'Cr', amt: '', desc: '' }] }));
  const delLine = (i) => setState((s) => {
    const next = s.lines.filter((_, j) => j !== i);
    return { ...s, lines: next.length ? next : [{ _k: idRef.current++, ledger: '', drCr: 'Cr', amt: '', desc: '' }] };
  });

  const t = dnTotals(state);
  // GST auto-calculates from the taxable value × rate so the CGST/SGST or IGST split
  // appears automatically once GST is applicable — the Place-of-Supply toggle then
  // shows the correct components per state (intra → CGST+SGST, inter → IGST). The
  // amount stays editable: typing a custom value (gstManual) stops auto-recompute.
  useEffect(() => {
    if (!state.gstApplicable || state.gstManual) return;
    const want = r2(t.subtotal * (+state.gstPct || 0) / 100);
    if (r2(+state.gstAmt || 0) !== want) patch({ gstAmt: want });
  }, [state.gstApplicable, state.gstManual, state.gstPct, t.subtotal]); // eslint-disable-line react-hooks/exhaustive-deps
  const autoGst = () => patch({ gstAmt: r2(t.subtotal * (+state.gstPct || 0) / 100), gstManual: false });
  const cgst = state.gstMode === 'inter' ? 0 : r2(t.gstAmt / 2);
  const sgst = state.gstMode === 'inter' ? 0 : r2(t.gstAmt - cgst);
  const igst = state.gstMode === 'inter' ? t.gstAmt : 0;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <FL label="Voucher date"><input type="date" value={state.date || ''} onChange={(e) => patch({ date: e.target.value })} style={inp} /></FL>
        <FL label="Against purchase bill (optional)"><input value={state.billNo || ''} onChange={(e) => patch({ billNo: e.target.value })} style={inp} placeholder="PI/BOM/2026/0042" /></FL>
        {state.gstApplicable ? <VPlaceOfSupply mode={state.gstMode} onChange={(m) => patch({ gstMode: m })} /> : <div />}
      </div>

      <FL label="Supplier / Vendor (party ledger — Dr, balancing leg · optional if Dr = Cr)">
        <LedgerPicker branch={branch} value={state.party} onChange={(v) => patch({ party: v })} filter={(l) => l.type === 'Creditor'} placeholder="Sundry Creditors / Supplier..." />
      </FL>

      {/* Purchase-return lines — Cr (default) reverses cost · Dr books a retained charge */}
      <p style={{ margin: '14px 0 6px', fontSize: 9, fontWeight: 700, color: '#A07828', textTransform: 'uppercase', letterSpacing: '1px' }}>Purchase Ledgers Returned (Cr) · Charges / Adjustments (Dr)</p>
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
            <thead><tr style={{ background: DARK }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#d4a437', fontWeight: 700, fontSize: 9.5, width: 30 }}>#</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#d4a437', fontWeight: 700, fontSize: 9.5 }}>Ledger</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', color: '#d4a437', fontWeight: 700, fontSize: 9.5, width: 70 }}>Dr / Cr</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#d4a437', fontWeight: 700, fontSize: 9.5 }}>Description</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', color: '#d4a437', fontWeight: 700, fontSize: 9.5, width: 130 }}>Amount ({cur})</th>
              <th style={{ width: 32 }} />
            </tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l._k ?? i} style={{ borderBottom: '1px solid #f3f4f8', background: l.drCr === 'Dr' ? '#f0fbf5' : ((+l.amt || 0) > 0 ? '#fdf3f3' : '#fff') }}>
                  <td style={{ padding: '4px 8px', textAlign: 'center', fontSize: 10.5, color: DIM }}>{i + 1}</td>
                  <td style={{ padding: '3px 6px', minWidth: 220 }}>
                    <LedgerPicker branch={branch} value={l.ledger} onChange={(v) => updLine(i, 'ledger', v)} placeholder="Purchase — Air Ticket / Hotel..." style={{ minHeight: 30, fontSize: 10.5 }} />
                  </td>
                  <td style={{ padding: '3px 6px' }}>
                    <div style={{ display: 'flex', border: '1px solid #e1e3ec', borderRadius: 5, overflow: 'hidden', width: 60, margin: '0 auto' }}>
                      {['Dr', 'Cr'].map((d) => (
                        <button key={d} onClick={() => updLine(i, 'drCr', d)} style={{ flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 9.5, fontWeight: 800, padding: '6px 0', background: (l.drCr === 'Dr' ? 'Dr' : 'Cr') === d ? (d === 'Dr' ? V_DR : V_CR) : '#fff', color: (l.drCr === 'Dr' ? 'Dr' : 'Cr') === d ? '#fff' : '#9A9A9A' }}>{d.toUpperCase()}</button>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '3px 6px' }}>
                    <input value={l.desc || ''} onChange={(e) => updLine(i, 'desc', e.target.value)} style={{ ...inp, minHeight: 30, fontSize: 10.5 }} placeholder="e.g. cancelled PNR refund" />
                  </td>
                  <td style={{ padding: '3px 6px' }}>
                    <input type="number" value={l.amt} onChange={(e) => updLine(i, 'amt', e.target.value)} placeholder="0.00" style={{ ...inp, textAlign: 'right', minHeight: 30, fontSize: 11, fontWeight: 600 }} />
                  </td>
                  <td style={{ padding: '3px 6px', textAlign: 'center' }}>
                    <button onClick={() => delLine(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9A9A9A', fontSize: 16, lineHeight: 1 }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f3f4f8', borderTop: '2px solid #e1e3ec' }}>
                <td colSpan={3} style={{ padding: '8px 10px' }}><button onClick={addLine} style={{ ...btnGh, fontSize: 10.5, padding: '4px 12px' }}><Plus size={12} /> Add line</button></td>
                <td style={{ padding: '8px 6px', textAlign: 'right', fontSize: 9, fontWeight: 700, color: DIM }}>RETURNED (NET)</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, fontSize: 13, color: DARK }}>{money2(cur, t.subtotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* GST (input credit reversed) */}
      <div style={{ padding: '10px 12px', borderRadius: 9, background: '#E6F1FB', border: '1px solid #B9D6F2', marginBottom: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: state.gstApplicable ? 8 : 0 }}>
          <input type="checkbox" checked={!!state.gstApplicable} onChange={(e) => patch({ gstApplicable: e.target.checked })} style={{ cursor: 'pointer', accentColor: '#185FA5' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#185FA5' }}>GST applicable (input credit reversed)</span>
        </label>
        {state.gstApplicable && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
              <FL label="GST rate"><select value={state.gstPct} onChange={(e) => patch({ gstPct: +e.target.value, gstManual: false })} style={inp}>{GST_SLABS.map((r) => <option key={r} value={r}>{r}%</option>)}</select></FL>
              <FL label="GST amount"><input type="number" value={state.gstAmt || ''} onChange={(e) => patch({ gstAmt: +e.target.value || 0, gstManual: true })} style={inp} /></FL>
              <button onClick={autoGst} style={{ ...btnGh, fontSize: 10, padding: '7px 10px' }}>Auto-calc</button>
            </div>
            {/* Tax components — always shown per Place of Supply: intra → CGST + SGST,
                inter → IGST. The columns switch live when the Place of Supply toggles. */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {(state.gstMode === 'inter'
                ? [['IGST', igst]]
                : [['CGST', cgst], ['SGST', sgst]]
              ).map(([lab, val]) => (
                <div key={lab} style={{ flex: '1 1 90px', minWidth: 90, padding: '6px 10px', borderRadius: 7, background: '#fff', border: '1px solid #B9D6F2' }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.5px', color: '#5a6691', textTransform: 'uppercase' }}>{lab}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: '#185FA5' }}>{money2(cur, val)}</div>
                </div>
              ))}
              <div style={{ flex: '1 1 120px', minWidth: 120, padding: '6px 10px', borderRadius: 7, background: '#185FA5', border: '1px solid #185FA5' }}>
                <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.5px', color: '#cfe0f3', textTransform: 'uppercase' }}>Debit Note Total</div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#fff' }}>{money2(cur, t.total)}</div>
              </div>
            </div>
          </>
        )}
      </div>

      <FL label="Narration"><textarea value={state.remarks || ''} onChange={(e) => patch({ remarks: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder={state.party ? `Being purchase return to ${state.party}` : 'Accounting narration...'} /></FL>
    </>
  );
}
