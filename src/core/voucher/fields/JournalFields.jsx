import React, { useRef } from 'react';
import { Plus } from 'lucide-react';
import { FL, inp, btnGh, card } from '../../styles';
import { LedgerPicker } from '../LedgerPicker';
import { V_DR, V_CR, money2, DIM, DARK } from '../ui';

/**
 * Journal voucher body — multi-line Dr/Cr grid with ledger autocomplete.
 * Shared by both create and edit through VoucherShell; operates on the shell's
 * form state ({ date, remarks, lines:[{ledger, drCr, amt}] }).
 */
export function JournalFields({ state, setState, ctx }) {
  const { branch, cur } = ctx;
  const idRef = useRef(1000);
  const lines = state.lines || [];

  const upd = (i, k, v) => setState((s) => ({ ...s, lines: s.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));
  const add = () => setState((s) => ({ ...s, lines: [...s.lines, { _k: idRef.current++, ledger: '', drCr: 'Dr', amt: '' }] }));
  const del = (i) => setState((s) => {
    const next = s.lines.filter((_, j) => j !== i);
    return { ...s, lines: next.length ? next : [{ _k: idRef.current++, ledger: '', drCr: 'Dr', amt: '' }] };
  });

  const tDr = lines.reduce((a, l) => a + (l.drCr !== 'Cr' ? (+l.amt || 0) : 0), 0);
  const tCr = lines.reduce((a, l) => a + (l.drCr === 'Cr' ? (+l.amt || 0) : 0), 0);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 14 }}>
        <FL label="Journal date"><input type="date" value={state.date || ''} onChange={(e) => setState((s) => ({ ...s, date: e.target.value }))} style={inp} /></FL>
        <FL label="Master narration"><input value={state.remarks || ''} onChange={(e) => setState((s) => ({ ...s, remarks: e.target.value }))} style={inp} placeholder="Being adjustment entry passed" /></FL>
      </div>

      <p style={{ margin: '0 0 7px', fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: '#A07828', textTransform: 'uppercase' }}>Account Entries</p>
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
            <thead><tr style={{ background: DARK }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#d4a437', fontWeight: 700, fontSize: 9.5 }}>Ledger Account</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', color: '#d4a437', fontWeight: 700, fontSize: 9.5, width: 74 }}>Dr / Cr</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', color: '#d4a437', fontWeight: 700, fontSize: 9.5, width: 150 }}>Amount ({cur})</th>
              <th style={{ width: 38 }} />
            </tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l._k ?? i} style={{ borderBottom: '1px solid #f3f4f8', background: l.drCr === 'Cr' ? '#fdf3f3' : '#f0fbf5' }}>
                  <td style={{ padding: '4px 8px', minWidth: 240 }}>
                    <LedgerPicker branch={branch} value={l.ledger} onChange={(v) => upd(i, 'ledger', v)} placeholder="Select ledger..." style={{ minHeight: 30, fontSize: 11 }} />
                  </td>
                  <td style={{ padding: '4px 8px' }}>
                    <div style={{ display: 'flex', border: '1px solid #e1e3ec', borderRadius: 5, overflow: 'hidden', width: 64, margin: '0 auto' }}>
                      {['Dr', 'Cr'].map((t) => (
                        <button key={t} onClick={() => upd(i, 'drCr', t)} style={{
                          flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 9.5, fontWeight: 800, padding: '6px 0',
                          background: l.drCr === t ? (t === 'Dr' ? V_DR : V_CR) : '#fff', color: l.drCr === t ? '#fff' : '#9A9A9A',
                        }}>{t.toUpperCase()}</button>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '4px 8px' }}>
                    <input type="number" min="0" step="0.01" value={l.amt} onChange={(e) => upd(i, 'amt', e.target.value)} placeholder="0.00" style={{ ...inp, textAlign: 'right', minHeight: 30, fontWeight: 600 }} />
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                    <button onClick={() => del(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9A9A9A', fontSize: 16, lineHeight: 1 }} title="Remove line">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f3f4f8', borderTop: '2px solid #e1e3ec' }}>
                <td style={{ padding: '8px 10px' }}><button onClick={add} style={{ ...btnGh, fontSize: 10.5, padding: '4px 12px' }}><Plus size={12} /> Add Entry Line</button></td>
                <td style={{ padding: '8px 6px', textAlign: 'right', fontSize: 9, fontWeight: 700, color: DIM }}>TOTAL</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: DARK }}>{money2(cur, tDr)} / {money2(cur, tCr)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
