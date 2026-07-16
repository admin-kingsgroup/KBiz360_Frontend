import React, { useRef } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import { Menu as DropdownMenu } from '../../ux/Menu';
import { FL, inp, btnGh, card, bc } from '../../styles';
import { todayISO } from '../../dates';
import { SmartDateInput } from '../../ux/SmartDateInput';
import { VPlaceOfSupply } from '../../../modules/transactions';
import { LedgerPicker } from '../LedgerPicker';
import { useVoucherRef } from '../useVoucherRef';
import { isVatBranch } from '../../voucherSpecs';
import { VAT_RATE } from '../../referenceCache';   // per-branch seeded VAT % (NBO 16 / DAR 18 / FBM 16)
import { V_DR, V_CR, DARK, DIM, money2, pxpTotals, r2 } from '../ui';

/**
 * Purchase-Expense body — supplier expenses / asset purchases on credit. India (GST)
 * branches capture GST input credit (CGST/SGST/IGST + Place of Supply) + TDS section;
 * Africa (VAT) branches capture a single VAT input + a flat WHT rate (no CGST/SGST split,
 * no India TDS sections). GST/VAT/TDS/WHT are amount-canonical: the % just auto-fills an
 * editable amount (posting routes it to VAT Input / WHT by regime), so edits round-trip.
 */
export function PurchaseExpenseFields({ state, setState, ctx }) {
  const { branch, cur, branchCode } = ctx;
  const isVat = isVatBranch(branchCode);
  const brVatRate = (bc({ code: branchCode }) || {}).vatRate;   // live VAT % (Africa), else null
  const taxLabel = isVat ? 'VAT' : 'GST';
  const whtLabel = isVat ? 'WHT' : 'TDS';
  const idRef = useRef(1000);
  const lines = state.lines || [];
  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const { tdsSections: TDS_SECTIONS, gstSlabs: GST_SLABS } = useVoucherRef();

  const updLine = (i, k, v) => setState((s) => ({ ...s, lines: s.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));
  const addLine = () => setState((s) => ({ ...s, lines: [...s.lines, { _k: idRef.current++, ledger: '', drCr: 'Dr', amt: '', desc: '' }] }));
  const delLine = (i) => setState((s) => {
    const next = s.lines.filter((_, j) => j !== i);
    return { ...s, lines: next.length ? next : [{ _k: idRef.current++, ledger: '', drCr: 'Dr', amt: '', desc: '' }] };
  });

  const t = pxpTotals(state);
  // Withholding rate: India = the chosen TDS section's rate; Africa = a flat WHT rate
  // (editable, defaults to the common 2%).
  const rate = isVat ? (+state.whtRate || 2) : ((TDS_SECTIONS[state.tdsSection] || {}).rate || 0);
  // Effective input-tax rate: India = the picked GST slab; Africa = the branch's single VAT
  // rate. Fall back PER BRANCH (not a flat 16) when the live cfg rate hasn't hydrated yet —
  // a flat 16 would silently under-rate DAR (18%). Mirrors RefundReissueFields' fallback.
  const effGstRate = isVat ? (brVatRate != null ? brVatRate : (VAT_RATE[String(branchCode || '').toUpperCase()] ?? 16)) : (+state.gstPct || 0);
  const autoGst = () => patch(isVat ? { gstPct: effGstRate, gstAmt: r2(t.taxable * effGstRate / 100) } : { gstAmt: r2(t.taxable * effGstRate / 100) });
  const autoTds = () => patch({ tdsAmt: r2(t.taxable * rate / 100) });
  const cgst = state.gstMode === 'inter' ? 0 : r2(t.gstAmt / 2);
  const sgst = state.gstMode === 'inter' ? 0 : r2(t.gstAmt - cgst);
  const igst = state.gstMode === 'inter' ? t.gstAmt : 0;

  // attachments
  const addAtt = () => { const n = (state._attName || '').trim(); if (n) patch({ attachments: [...(state.attachments || []), { name: n }], _attName: '' }); };
  const rmAtt = (i) => patch({ attachments: (state.attachments || []).filter((_, j) => j !== i) });

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <FL label="Voucher date"><SmartDateInput max={todayISO()} value={state.date || ''} onChange={(iso) => patch({ date: iso })} style={inp} /></FL>
        <FL label="Bill / Invoice no."><input value={state.billNo || ''} onChange={(e) => patch({ billNo: e.target.value })} style={inp} placeholder="VEND-4471" /></FL>
        {!isVat && state.gstApplicable ? <VPlaceOfSupply mode={state.gstMode} onChange={(m) => patch({ gstMode: m })} /> : <div />}
      </div>

      <FL label="Supplier / Vendor (party ledger — Cr)">
        <LedgerPicker branch={branch} value={state.party} onChange={(v) => patch({ party: v })} filter={(l) => l.type === 'Creditor'} placeholder="Sundry Creditors / Supplier..." />
      </FL>

      {/* Debit / Credit expense lines */}
      <p style={{ margin: '14px 0 6px', fontSize: 9, fontWeight: 700, color: '#A07828', textTransform: 'uppercase', letterSpacing: '1px' }}>Expense / Asset Ledgers (Dr) · Discounts / Income (Cr)</p>
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
            <thead><tr style={{ background: DARK }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#A07828', fontWeight: 700, fontSize: 9.5, width: 30 }}>No</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#A07828', fontWeight: 700, fontSize: 9.5 }}>Ledger</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', color: '#A07828', fontWeight: 700, fontSize: 9.5, width: 70 }}>Dr / Cr</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#A07828', fontWeight: 700, fontSize: 9.5 }}>Description</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', color: '#A07828', fontWeight: 700, fontSize: 9.5, width: 130 }}>Amount ({cur})</th>
              <th style={{ width: 32 }} />
            </tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l._k ?? i} style={{ borderBottom: '1px solid #dfe2e7', background: l.drCr === 'Cr' ? '#fdf3f3' : ((+l.amt || 0) > 0 ? '#f0fbf5' : '#fff') }}>
                  <td style={{ padding: '10px', textAlign: 'center', fontSize: 10.5, color: DIM }}>{i + 1}</td>
                  <td style={{ padding: '8px', minWidth: 220 }}>
                    <LedgerPicker branch={branch} value={l.ledger} onChange={(v) => updLine(i, 'ledger', v)} placeholder="Office Rent / Discount Received..." style={{ minHeight: 30, fontSize: 10.5 }} />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ display: 'flex', border: '1px solid #cdd1d8', borderRadius: 5, overflow: 'hidden', width: 60, margin: '0 auto' }}>
                      {['Dr', 'Cr'].map((d) => (
                        <button key={d} onClick={() => updLine(i, 'drCr', d)} style={{ flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 9.5, fontWeight: 800, padding: '6px 0', background: l.drCr === d ? (d === 'Dr' ? V_DR : V_CR) : '#fff', color: l.drCr === d ? '#fff' : '#9A9A9A' }}>{d.toUpperCase()}</button>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input value={l.desc || ''} onChange={(e) => updLine(i, 'desc', e.target.value)} style={{ ...inp, minHeight: 30, fontSize: 10.5 }} placeholder="e.g. June office rent" />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input type="number" value={l.amt} onChange={(e) => updLine(i, 'amt', e.target.value)} placeholder="0.00" style={{ ...inp, textAlign: 'right', minHeight: 30, fontSize: 11, fontWeight: 600 }} />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <button onClick={() => delLine(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9A9A9A', fontSize: 16, lineHeight: 1 }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f3f4f8', borderTop: '2px solid #cdd1d8' }}>
                <td colSpan={3} style={{ padding: '8px 10px' }}><button onClick={addLine} style={{ ...btnGh, fontSize: 10.5, padding: '4px 12px' }}><Plus size={12} /> Add line</button></td>
                <td style={{ padding: '8px 6px', textAlign: 'right', fontSize: 9, fontWeight: 700, color: DIM }}>TAXABLE</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, fontSize: 13, color: DARK }}>{money2(cur, t.taxable)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* GST */}
      <div style={{ padding: '10px 12px', borderRadius: 9, background: '#E6F1FB', border: '1px solid #B9D6F2', marginBottom: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: state.gstApplicable ? 8 : 0 }}>
          <input type="checkbox" checked={!!state.gstApplicable} onChange={(e) => patch({ gstApplicable: e.target.checked })} style={{ cursor: 'pointer', accentColor: '#185FA5' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#185FA5' }}>{taxLabel} applicable (input credit)</span>
        </label>
        {state.gstApplicable && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
              <FL label={`${taxLabel} rate`}>
                {isVat ? (
                  <div style={{ ...inp, background: '#f9fafb', color: '#185FA5', fontWeight: 700, display: 'flex', alignItems: 'center' }}>{effGstRate}%</div>
                ) : (
                  <DropdownMenu
                    ariaLabel={`${taxLabel} rate`}
                    menuRole="listbox"
                    items={GST_SLABS.map((r) => ({ key: r, label: `${r}%`, selected: state.gstPct === r, onSelect: () => patch({ gstPct: r, gstAmt: r2(t.taxable * r / 100) }) }))}
                    renderTrigger={({ ref, toggle, triggerProps }) => (
                      <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                        style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{state.gstPct}%</span>
                        <ChevronDown size={14} style={{ color: '#5b616e', flexShrink: 0 }} />
                      </button>
                    )}
                  />
                )}
              </FL>
              <FL label={`${taxLabel} amount`}><input type="number" value={state.gstAmt || ''} onChange={(e) => patch({ gstAmt: +e.target.value || 0 })} style={inp} /></FL>
              <button onClick={autoGst} style={{ ...btnGh, fontSize: 10, padding: '7px 10px' }}>Auto-calc</button>
            </div>
            {t.gstAmt > 0 && <p style={{ margin: '6px 0 0', fontSize: 10, color: '#185FA5' }}>{isVat ? <>VAT <b>{money2(cur, t.gstAmt)}</b></> : (state.gstMode === 'inter' ? <>IGST <b>{money2(cur, igst)}</b></> : <>CGST <b>{money2(cur, cgst)}</b> · SGST <b>{money2(cur, sgst)}</b></>)} · Invoice total <b>{money2(cur, t.total)}</b></p>}
          </>
        )}
      </div>

      {/* Withholding — India TDS (section-driven) / Africa WHT (flat rate) */}
      <div style={{ padding: '10px 12px', borderRadius: 9, background: '#FAEEDA', border: '1px solid #FAC775', marginBottom: 12 }}>
        {isVat ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
            <FL label="WHT rate (%)"><input type="number" value={state.whtRate ?? 2} onChange={(e) => patch({ whtRate: +e.target.value || 0 })} style={inp} /></FL>
            <FL label="WHT amount"><input type="number" value={state.tdsAmt || ''} onChange={(e) => patch({ tdsAmt: +e.target.value || 0 })} style={inp} /></FL>
            <button onClick={autoTds} style={{ ...btnGh, fontSize: 10, padding: '7px 10px' }}>Auto-calc</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
            <FL label="TDS Section">
              <DropdownMenu
                ariaLabel="TDS Section"
                menuRole="listbox"
                items={Object.entries(TDS_SECTIONS).map(([k, s]) => ({ key: k, label: s.label, selected: state.tdsSection === k, onSelect: () => patch({ tdsSection: k }) }))}
                renderTrigger={({ ref, toggle, triggerProps }) => (
                  <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                    style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{TDS_SECTIONS[state.tdsSection]?.label}</span>
                    <ChevronDown size={14} style={{ color: '#5b616e', flexShrink: 0 }} />
                  </button>
                )}
              />
            </FL>
            <FL label="Rate"><div style={{ ...inp, background: '#f9fafb', color: '#854F0B', fontWeight: 700, display: 'flex', alignItems: 'center' }}>{rate}%</div></FL>
            <FL label="TDS amount"><input type="number" value={state.tdsAmt || ''} onChange={(e) => patch({ tdsAmt: +e.target.value || 0 })} style={inp} /></FL>
            <button onClick={autoTds} style={{ ...btnGh, fontSize: 10, padding: '7px 10px' }}>Auto-calc</button>
          </div>
        )}
        {t.tds > 0 && <p style={{ margin: '6px 0 0', fontSize: 10, color: '#854F0B' }}>Supplier credited net of {whtLabel} · payable <b>{money2(cur, r2(t.total - t.tds))}</b></p>}
      </div>

      {/* Attachments */}
      <FL label="Attachments (file name reference)">
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={state._attName || ''} onChange={(e) => patch({ _attName: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAtt(); } }} style={inp} placeholder="invoice.pdf" />
          <button onClick={addAtt} style={{ ...btnGh, whiteSpace: 'nowrap' }}>+ Add</button>
        </div>
      </FL>
      {(state.attachments || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0 10px' }}>
          {(state.attachments || []).map((a, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 999, background: '#eef1f6', fontSize: 10.5, color: DARK }}>{a.name}<button onClick={() => rmAtt(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9A9A9A', fontSize: 13 }}>×</button></span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <FL label="Narration"><textarea value={state.remarks || ''} onChange={(e) => patch({ remarks: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder={state.party ? `Being expense/asset purchase from ${state.party}` : 'Accounting narration...'} /></FL>
      </div>
    </>
  );
}
