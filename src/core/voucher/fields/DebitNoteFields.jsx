import React, { useRef } from 'react';
import { Plus } from 'lucide-react';
import { FL, inp, btnGh, card } from '../../styles';
import { todayISO } from '../../dates';
import { SmartDateInput } from '../../ux/SmartDateInput';
import { LedgerPicker } from '../LedgerPicker';
import { V_DR, V_CR, DARK, DIM, money2, dnTotals } from '../ui';

/**
 * Debit-Note body — a PURCHASE RETURN to a supplier (goods/services sent back, or
 * a supplier over-billing reversed). It is the mirror of a purchase:
 *   Supplier A/c (Sundry Creditor)  Dr   net        (we owe the supplier less)
 *   To Purchase ledger(s)           Cr   Σ returns  (cost reversed — default side)
 *   To Input CGST/SGST or IGST      Cr   Σ tax lines (input credit reversed)
 *   Charge/adjustment ledger(s)     Dr   Σ Dr lines (a charge / tax retained)
 * The line grid is the COMPLETE itemisation — like a journal, every leg (the
 * purchase ledgers, the input CGST/SGST/IGST being reversed, any TDS/charge) is
 * entered as its own line with a per-line Dr/Cr toggle (defaulting to Cr = cost
 * reversed). The backend's debitNoteLines posts each line on its own side and
 * debits/credits the supplier with the balancing net. There is deliberately NO
 * separate "auto GST" add-on: GST is reversed by entering the CGST/SGST/IGST Input
 * ledgers as lines, so it can never be double-counted on top of those lines. The
 * shell renders the live JV effect below the form.
 */
export function DebitNoteFields({ state, setState, ctx }) {
  const { branch, cur } = ctx;
  const idRef = useRef(1000);
  const lines = state.lines || [];
  const patch = (p) => setState((s) => ({ ...s, ...p }));

  const updLine = (i, k, v) => setState((s) => ({ ...s, lines: s.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));
  const addLine = () => setState((s) => ({ ...s, lines: [...s.lines, { _k: idRef.current++, ledger: '', drCr: 'Cr', amt: '', desc: '' }] }));
  const delLine = (i) => setState((s) => {
    const next = s.lines.filter((_, j) => j !== i);
    return { ...s, lines: next.length ? next : [{ _k: idRef.current++, ledger: '', drCr: 'Cr', amt: '', desc: '' }] };
  });

  const t = dnTotals(state);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <FL label="Voucher date"><SmartDateInput max={todayISO()} value={state.date || ''} onChange={(iso) => patch({ date: iso })} style={inp} /></FL>
        <FL label="Against purchase bill (optional)"><input value={state.billNo || ''} onChange={(e) => patch({ billNo: e.target.value })} style={inp} placeholder="PI/BOM/2026/0042" /></FL>
      </div>

      <FL label="Supplier / Vendor (party ledger — Dr, balancing leg · optional if Dr = Cr)">
        <LedgerPicker branch={branch} value={state.party} onChange={(v) => patch({ party: v })} filter={(l) => l.type === 'Creditor'} placeholder="Sundry Creditors / Supplier..." />
      </FL>

      {/* Purchase-return lines — Cr (default) reverses cost / input GST · Dr books a retained charge or TDS */}
      <p style={{ margin: '14px 0 6px', fontSize: 9, fontWeight: 700, color: '#A07828', textTransform: 'uppercase', letterSpacing: '1px' }}>Purchase Ledgers &amp; Input GST Returned (Cr) · Charges / TDS (Dr)</p>
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

      {/* Debit Note total — the supplier leg balances to the net of the lines above.
          Input GST is reversed by entering the CGST/SGST/IGST Input ledgers as lines,
          so there is no separate GST add-on that could double-count on top of them. */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <div style={{ flex: '0 0 220px', padding: '8px 12px', borderRadius: 9, background: '#185FA5', border: '1px solid #185FA5' }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.5px', color: '#cfe0f3', textTransform: 'uppercase' }}>Debit Note Total {t.subtotal < 0 ? '(supplier credited)' : ''}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{money2(cur, Math.abs(t.subtotal))}</div>
        </div>
      </div>

      <FL label="Narration"><textarea value={state.remarks || ''} onChange={(e) => patch({ remarks: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder={state.party ? `Being purchase return to ${state.party}` : 'Accounting narration...'} /></FL>
    </>
  );
}
