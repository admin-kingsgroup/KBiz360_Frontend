import React, { useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { FL, inp, btnGh, card } from '../../styles';
import { todayISO } from '../../dates';
import { SmartDateInput } from '../../ux/SmartDateInput';
import { useOpenBills } from '../../useAccounting';
import { useLedgerRegistry } from '../../useReference';
import { BillAllocPanel } from '../../../modules/transactions';
import { LedgerPicker } from '../LedgerPicker';
import { useVoucherRef } from '../useVoucherRef';
import { isVatBranch } from '../../voucherSpecs';
import { allocSummary, money2, GREEN, RED, settleSpec, DARK } from '../ui';

/**
 * Receipt (money IN from a debtor) / Payment (money OUT to a creditor) body.
 * `side` ('customer' | 'supplier') flips party type, labels and the open-bills
 * direction. Shared by create and edit via VoucherShell; operates on the shell's
 * form state. Bill-wise allocation reuses the existing BillAllocPanel.
 *
 * Two entry shapes:
 *   • Single account (default) — one party/expense leg + one bank leg. A true party
 *     (Debtor/Creditor) keeps bill-wise + TDS; any other ledger posts a plain Dr/Cr pair.
 *   • Split (`state.split`) — several expense/income heads (each its OWN ledger) settled
 *     by ONE bank/cash leg. No party / bill-wise / TDS. Posts N Dr (payment) / Cr
 *     (receipt) legs + one bank leg for the sum.
 */
export function ReceiptPaymentFields({ state, setState, ctx, side }) {
  const { branch, cur, branchCode } = ctx;
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
  // Does the counter-account settle bill-wise, and against what? A Debtor on a PAYMENT
  // is a client refund — it settles the client's open RECEIPTS (advances mode).
  const spec = settleSpec(side, otherType);
  const isParty = !state.split && spec.party;
  const isRefund = spec.mode === 'advances'; // Payment → Debtor: returning on-account money
  // Withholding is India TDS (statute section-driven) vs Africa/VAT-branch WHT (flat rate). A DAR
  // (VAT) receipt/payment must show "WHT" + a flat rate, never Indian 194x sections — the posting
  // engine already routes it to the branch's "WHT Payable/Receivable [DAR]" head regardless.
  // Use branchCode (the resolved code STRING) — ctx.branch is the branch OBJECT in create mode, and
  // isVatBranch stringifies its arg, so isVatBranch(object) is always false. Mirrors PurchaseExpenseFields.
  const isVat = isVatBranch(branchCode);
  const whtLabel = isVat ? 'WHT' : 'TDS';
  useEffect(() => {
    if (!state.split && state.party && otherType && state.otherType !== otherType) setState((s) => ({ ...s, otherType }));
  }, [otherType, state.party, state.split]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live open items for the chosen party. When editing, exclude this voucher's own
  // settlement so what it cleared reappears and stays re-allocatable. In refund mode the
  // rows are the client's open receipts (leftover each); otherwise their open bills —
  // over-settled ones included (useOpenBills defaults includeOverpaid), so the party's
  // Overpaid credit that the ledger bill-wise shows is visible here too while allocating.
  const billsQ = useOpenBills(isParty ? state.party : '', branch, spec.obSide, ctx.editId, false, spec.mode);

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

  // `out` is the row's allocatable bound: positive = the bill's outstanding;
  // NEGATIVE = an Overpaid row's adjust-credit limit (−overpaidAmt) — the entry is
  // clamped to [out, 0] there, un-applying the excess instead of adding to it.
  const setAllocFor = (vno, val, out) => {
    let v = +val || 0;
    if (out >= 0) { if (v < 0) v = 0; if (v > out) v = out; }
    else { if (v > 0) v = 0; if (v < out) v = out; }
    setState((s) => ({ ...s, alloc: { ...s.alloc, [vno]: v } }));
  };
  const fullAlloc = (vno, out) => {
    // Adjust-credit rows take their full (negative) bound — a credit ADDS settling
    // capacity, so it is never limited by the voucher's remaining amount.
    if (out < 0) { setState((s) => ({ ...s, alloc: { ...s.alloc, [vno]: out } })); return; }
    const others = Object.entries(state.alloc || {}).reduce((s, [k, v]) => (k === vno ? s : s + (+v || 0)), 0);
    const remain = Math.max(0, Math.round((gross - others) * 100) / 100);
    setState((s) => ({ ...s, alloc: { ...s.alloc, [vno]: gross > 0 ? Math.min(out, remain) : out } }));
  };
  const tdsRate = isVat ? (+state.whtRate || 2) : ((TDS_SECTIONS[state.tdsSection] || {}).rate || 0);
  const autoTds = () => {
    if (tdsRate) patch({ tdsAmt: Math.round(net * tdsRate / (100 - tdsRate)) });
  };
  // Reset the bill allocation whenever the party changes.
  const onParty = (name) => setState((s) => ({ ...s, party: name, alloc: {}, parkOnAcc: false, applyMode: 'bills', _billIds: {} }));

  // ── Split (multi-leg) rows ────────────────────────────────────────────────────
  const splitRef = useRef(7000);
  const splitLines = state.splitLines || [];
  const blankSplit = () => ({ _k: splitRef.current++, ledger: '', amt: '', desc: '' });
  const updSplit = (i, k, v) => setState((s) => ({ ...s, splitLines: (s.splitLines || []).map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));
  const addSplit = () => setState((s) => ({ ...s, splitLines: [...(s.splitLines || []), blankSplit()] }));
  const delSplit = (i) => setState((s) => { const next = (s.splitLines || []).filter((_, j) => j !== i); return { ...s, splitLines: next.length ? next : [blankSplit()] }; });
  const splitTotal = splitLines.reduce((a, l) => a + (+l.amt || 0), 0);
  const splitValidLegs = splitLines.filter((l) => l.ledger && +l.amt > 0).length;
  // Toggling ON clears the single-entry fields (party/amount/TDS/bill-wise) and seeds
  // two blank rows; toggling OFF just hides the grid (rows kept until the form resets).
  const toggleSplit = (on) => setState((s) => on
    ? {
        ...s, split: true, party: '', otherType: '', amount: '', tds: false, alloc: {}, parkOnAcc: false,
        splitLines: (s.splitLines && s.splitLines.length) ? s.splitLines : [blankSplit(), blankSplit()],
      }
    : { ...s, split: false });

  // ── Additive charge legs (SUPPLIER payment only) ─────────────────────────────
  // Extra costs paid together with the supplier settlement (bank charge, courier,
  // stamp duty…). Each is an added Dr expense leg; the bank parts with the supplier
  // amount PLUS these. Available only on a genuine supplier (Creditor) payment.
  const canCharge = !isReceipt && isParty && !isRefund;
  const chargeRef = useRef(9000);
  const charges = state.charges || [];
  const blankCharge = () => ({ _k: chargeRef.current++, ledger: '', amt: '', desc: '' });
  const updCharge = (i, k, v) => setState((s) => ({ ...s, charges: (s.charges || []).map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));
  const addCharge = () => setState((s) => ({ ...s, charges: [...(s.charges || []), blankCharge()] }));
  const delCharge = (i) => setState((s) => { const next = (s.charges || []).filter((_, j) => j !== i); return { ...s, charges: next.length ? next : [blankCharge()] }; });
  const chargesTotal = charges.reduce((a, l) => a + (+l.amt || 0), 0);
  const toggleCharges = (on) => setState((s) => on
    ? { ...s, hasCharges: true, charges: (s.charges && s.charges.length) ? s.charges : [blankCharge()] }
    : { ...s, hasCharges: false });

  const mob = false;

  // Fields shared by both entry shapes.
  const dateFL = <FL label="Date"><SmartDateInput max={todayISO()} value={state.date || ''} onChange={(iso) => patch({ date: iso })} style={inp} /></FL>;
  const bankFL = (
    <FL label={isReceipt ? 'Received in (Bank / Cash — Dr)' : 'Paid from (Bank / Cash — Cr)'}>
      <LedgerPicker branch={branch} value={state.bankRef} onChange={(v) => patch({ bankRef: v })} filter={(l) => l.type === 'Bank' || l.type === 'Cash'} placeholder="Select bank / cash account..." />
    </FL>
  );
  const modeFL = (
    <FL label="Payment mode">
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PMT_MODES_V.map((m) => (
          <button key={m} onClick={() => patch({ paymentMode: m })} style={{
            padding: '5px 11px', borderRadius: 6, fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
            background: state.paymentMode === m ? '#141414' : '#f3f4f8', color: state.paymentMode === m ? '#A07828' : '#384677',
            border: '1.5px solid ' + (state.paymentMode === m ? '#A07828' : '#e1e3ec'),
          }}>{m}</button>
        ))}
      </div>
    </FL>
  );
  const utrFL = state.paymentMode !== 'Cash'
    ? <FL label="UTR / Reference"><input value={state.utr || ''} onChange={(e) => patch({ utr: e.target.value })} style={{ ...inp, fontFamily: 'monospace' }} placeholder="UTR / cheque / txn ref" /></FL>
    : null;
  const narrationFL = (
    <div style={{ marginTop: 11 }}>
      <FL label="Narration"><textarea value={state.remarks || ''} onChange={(e) => patch({ remarks: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder={state.party ? `Being ${isReceipt ? 'receipt from' : 'payment to'} ${state.party}` : 'Accounting narration...'} /></FL>
    </div>
  );

  return (
    <>
      {/* Single account ↔ split across multiple heads */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingTop: 10, fontSize: 11, fontWeight: 700, color: '#384677' }}>
        <input type="checkbox" checked={!!state.split} onChange={(e) => toggleSplit(e.target.checked)} style={{ cursor: 'pointer', accentColor: accent }} />
        Split across multiple {isReceipt ? 'heads' : 'expense heads'} — one {isReceipt ? 'credit' : 'debit'} leg per ledger, settled by a single bank / cash leg
      </label>

      {state.split ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 14, paddingTop: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{dateFL}{bankFL}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{modeFL}{utrFL}</div>
          </div>

          <p style={{ margin: '14px 0 7px', fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: '#A07828', textTransform: 'uppercase' }}>
            {isReceipt ? 'Credit Legs — one head per line' : 'Debit Legs — one expense head per line'}
          </p>
          <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 580 }}>
                <thead><tr style={{ background: DARK }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#A07828', fontWeight: 700, fontSize: 9.5 }}>{isReceipt ? 'Income / Ledger Account' : 'Expense / Ledger Account'}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#A07828', fontWeight: 700, fontSize: 9.5 }}>Narration</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: '#A07828', fontWeight: 700, fontSize: 9.5, width: 150 }}>Amount ({cur})</th>
                  <th style={{ width: 38 }} />
                </tr></thead>
                <tbody>
                  {splitLines.map((l, i) => (
                    <tr key={l._k ?? i} style={{ borderBottom: '1px solid #dfe2e7' }}>
                      <td style={{ padding: '4px 8px', minWidth: 220 }}>
                        <LedgerPicker branch={branch} value={l.ledger} onChange={(v) => updSplit(i, 'ledger', v)} filter={(x) => x.type !== 'Bank' && x.type !== 'Cash'} placeholder={isReceipt ? 'Income, loan, any account…' : 'Rent, salary, tax, any expense…'} style={{ minHeight: 30, fontSize: 11 }} />
                      </td>
                      <td style={{ padding: '4px 8px', minWidth: 160 }}>
                        <input value={l.desc || ''} onChange={(e) => updSplit(i, 'desc', e.target.value)} placeholder="Line narration (optional)" style={{ ...inp, minHeight: 30, fontSize: 11 }} />
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <input type="number" min="0" step="0.01" value={l.amt} onChange={(e) => updSplit(i, 'amt', e.target.value)} placeholder="0.00" style={{ ...inp, textAlign: 'right', minHeight: 30, fontWeight: 600, color: accent }} />
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                        <button onClick={() => delSplit(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9A9A9A', fontSize: 16, lineHeight: 1 }} title="Remove line">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f3f4f8', borderTop: '2px solid #cdd1d8' }}>
                    <td style={{ padding: '8px 10px' }} colSpan={2}><button onClick={addSplit} style={{ ...btnGh, fontSize: 10.5, padding: '4px 12px' }}><Plus size={12} /> Add Line</button></td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: DARK }}>{money2(cur, splitTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div style={{ padding: '9px 12px', borderRadius: 9, background: '#EAF1FB', border: '1px solid #B9D6F2', margin: '8px 0', fontSize: 10.5, color: '#185FA5', fontWeight: 600 }}>
            Posts one {isReceipt ? 'Debit' : 'Credit'} to <b>{state.bankRef || 'Bank / Cash'}</b> of <b>{money2(cur, splitTotal)}</b> against <b>{splitValidLegs}</b> {isReceipt ? 'credit' : 'debit'} leg(s) — each its own ledger. No bill-wise / TDS: for a supplier bill use single-account mode; for a credit GST bill use Purchase-Expense.
          </div>

          {narrationFL}
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 14, paddingTop: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dateFL}
              <FL label={isReceipt ? 'Received from (account credited — Cr)' : 'Paid to (account debited — Dr)'}>
                <LedgerPicker branch={branch} value={state.party} onChange={onParty} filter={(l) => l.type !== 'Bank' && l.type !== 'Cash'} placeholder={isReceipt ? 'Customer, loan, income, any account…' : 'Supplier, expense, salary, tax, any account…'} />
              </FL>
              {bankFL}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {modeFL}
              {utrFL}
              <FL label={isReceipt ? 'Amount received (net of TDS)' : 'Amount paid (net of TDS)'}>
                <input type="number" value={state.amount} onChange={(e) => patch({ amount: e.target.value })} placeholder="0.00" style={{ ...inp, fontSize: 16, fontWeight: 700, color: accent }} />
              </FL>
            </div>
          </div>

          {/* Direct (non-party) entry note — e.g. an expense paid or income received */}
          {state.party && !isParty && (
            <div style={{ padding: '9px 12px', borderRadius: 9, background: '#EAF1FB', border: '1px solid #B9D6F2', margin: '12px 0', fontSize: 10.5, color: '#185FA5', fontWeight: 600 }}>
              Direct entry — posts <b>{isReceipt ? `Dr ${state.bankRef || 'Bank'} · Cr ${state.party}` : `Dr ${state.party} · Cr ${state.bankRef || 'Bank'}`}</b>. {otherType ? `“${state.party}” is ${otherType}, not a party — ` : ''}no bill-wise / TDS. For a credit GST bill use Purchase-Expense; for a split entry tick “Split across multiple heads” above.
            </div>
          )}

          {/* TDS (genuine supplier payment / customer receipt only — never a client refund) */}
          {isParty && !isRefund && (
          <div style={{ padding: '10px 12px', borderRadius: 9, background: '#FAEEDA', border: '1px solid #FAC775', margin: '12px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: state.tds ? 8 : 0 }}>
              <input type="checkbox" checked={!!state.tds} onChange={(e) => patch({ tds: e.target.checked, ...(isVat && e.target.checked ? { tdsSection: '' } : {}) })} style={{ cursor: 'pointer', accentColor: '#854F0B' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#854F0B' }}>{isReceipt ? `Party has deducted ${whtLabel} before paying` : `Deduct ${whtLabel} at source before paying`}</span>
            </label>
            {state.tds && (isVat ? (
              <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                <FL label="WHT rate (%)"><input type="number" value={state.whtRate ?? 2} onChange={(e) => patch({ whtRate: +e.target.value || 0 })} style={inp} /></FL>
                <FL label="WHT amount"><input type="number" value={state.tdsAmt || ''} onChange={(e) => patch({ tdsAmt: +e.target.value || 0 })} style={inp} /></FL>
                <button onClick={autoTds} style={{ ...btnGh, fontSize: 10, padding: '7px 10px' }}>Auto-calc</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                <FL label="TDS Section"><select value={state.tdsSection} onChange={(e) => patch({ tdsSection: e.target.value })} style={inp}>{Object.entries(TDS_SECTIONS).filter(([k]) => k !== 'None').map(([k, s]) => <option key={k} value={k}>{k} ({s.rate}%)</option>)}</select></FL>
                <FL label="Rate"><div style={{ ...inp, background: '#f9fafb', color: '#854F0B', fontWeight: 700, display: 'flex', alignItems: 'center' }}>{tdsRate}%</div></FL>
                <FL label="TDS amount"><input type="number" value={state.tdsAmt || ''} onChange={(e) => patch({ tdsAmt: +e.target.value || 0 })} style={inp} /></FL>
                <button onClick={autoTds} style={{ ...btnGh, fontSize: 10, padding: '7px 10px' }}>Auto-calc</button>
              </div>
            ))}
            {state.tds && tds > 0 && <p style={{ margin: '6px 0 0', fontSize: 10, color: '#854F0B' }}>Gross settlement <b>{money2(cur, gross)}</b> · {isReceipt ? `${whtLabel} receivable` : `${whtLabel} payable`} <b>{money2(cur, tds)}</b> · {isReceipt ? 'Net received' : 'Net paid'} <b>{money2(cur, net)}</b></p>}
          </div>
          )}

          {/* Additive charges paid with a supplier settlement (bank charge, courier…) */}
          {canCharge && (
          <div style={{ padding: '10px 12px', borderRadius: 9, background: '#EEF6EF', border: '1px solid #BFE0C4', margin: '12px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: state.hasCharges ? 8 : 0 }}>
              <input type="checkbox" checked={!!state.hasCharges} onChange={(e) => toggleCharges(e.target.checked)} style={{ cursor: 'pointer', accentColor: '#2E7D46' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#276238' }}>Also paid bank charges / other costs with this payment (bank parts with the extra)</span>
            </label>
            {state.hasCharges && (
              <>
                <div style={{ ...card, padding: 0, overflow: 'hidden', margin: '4px 0 6px' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                      <thead><tr style={{ background: DARK }}>
                        <th style={{ padding: '7px 10px', textAlign: 'left', color: '#A07828', fontWeight: 700, fontSize: 9.5 }}>Charge / Expense Account</th>
                        <th style={{ padding: '7px 10px', textAlign: 'left', color: '#A07828', fontWeight: 700, fontSize: 9.5 }}>Narration</th>
                        <th style={{ padding: '7px 10px', textAlign: 'right', color: '#A07828', fontWeight: 700, fontSize: 9.5, width: 140 }}>Amount ({cur})</th>
                        <th style={{ width: 34 }} />
                      </tr></thead>
                      <tbody>
                        {charges.map((l, i) => (
                          <tr key={l._k ?? i} style={{ borderBottom: '1px solid #dfe2e7' }}>
                            <td style={{ padding: '4px 8px', minWidth: 200 }}>
                              <LedgerPicker branch={branch} value={l.ledger} onChange={(v) => updCharge(i, 'ledger', v)} filter={(x) => x.type !== 'Bank' && x.type !== 'Cash'} placeholder="Bank Charges, Courier, Stamp Duty…" style={{ minHeight: 30, fontSize: 11 }} />
                            </td>
                            <td style={{ padding: '4px 8px', minWidth: 150 }}>
                              <input value={l.desc || ''} onChange={(e) => updCharge(i, 'desc', e.target.value)} placeholder="Optional" style={{ ...inp, minHeight: 30, fontSize: 11 }} />
                            </td>
                            <td style={{ padding: '4px 8px' }}>
                              <input type="number" min="0" step="0.01" value={l.amt} onChange={(e) => updCharge(i, 'amt', e.target.value)} placeholder="0.00" style={{ ...inp, textAlign: 'right', minHeight: 30, fontWeight: 600, color: accent }} />
                            </td>
                            <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                              <button onClick={() => delCharge(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9A9A9A', fontSize: 16, lineHeight: 1 }} title="Remove charge">×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f3f4f8', borderTop: '2px solid #cdd1d8' }}>
                          <td style={{ padding: '7px 10px' }} colSpan={2}><button onClick={addCharge} style={{ ...btnGh, fontSize: 10.5, padding: '4px 12px' }}><Plus size={12} /> Add Charge</button></td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: DARK }}>{money2(cur, chargesTotal)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#276238', fontWeight: 600 }}>
                  Bank / Cash outflow <b>{money2(cur, net + chargesTotal)}</b> = paid to {state.party || 'supplier'} <b>{money2(cur, net)}</b> + charges <b>{money2(cur, chargesTotal)}</b>{tds > 0 ? ` (TDS ${money2(cur, tds)} withheld separately)` : ''}.
                </p>
              </>
            )}
          </div>
          )}

          {/* Bill-wise allocation — open bills, or (client refund) the client's open receipts */}
          {isParty && (
          <BillAllocPanel
            side={side} party={state.party} q={billsQ} amount={gross} vDate={state.date}
            alloc={state.alloc} onSetAlloc={setAllocFor} onFull={fullAlloc}
            mode={state.applyMode} onMode={(m) => patch({ applyMode: m })}
            parkOnAcc={state.parkOnAcc} onParkOnAcc={(v) => patch({ parkOnAcc: v })} cur={cur}
            heading={isRefund ? 'Refund Against Received Payments' : undefined}
            itemLabel={isRefund ? 'Receipt No.' : undefined}
            isRefund={isRefund}
            emptyHint={isRefund ? `No open receipts with a leftover balance for ${state.party || 'this client'}. Use “On Account” to pay it as an advance.` : undefined}
          />
          )}

          {narrationFL}
        </>
      )}
    </>
  );
}
