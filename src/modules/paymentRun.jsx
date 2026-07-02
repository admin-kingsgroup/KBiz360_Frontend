import React, { useMemo, useState } from 'react';
import { bc, card } from '../core/styles';
import { localeOf } from '../core/format';
import { useOutstanding, usePaymentRun } from '../core/useAccounting';
import { buildPaymentRunPayload, paymentRunSummary } from './paymentRunPayload';
import { Wallet, CheckSquare, Square, ArrowRight } from 'lucide-react';

const C = { dark: '#0d1326', gold: '#d4a437', blue: '#185FA5', red: '#A32D2D', green: '#27500A', dim: '#5a6691', border: '#cdd1d8', amber: '#854F0B' };
const money = (cur, n) => cur + Math.round(Number(n) || 0).toLocaleString(localeOf(cur));
const brLabel = (b) => (b === 'ALL' || !b ? 'All Branches' : (b.name || b.code || b));
const th = { padding: '8px 12px', background: C.dark, color: C.gold, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'left', whiteSpace: 'nowrap' };
const td = { padding: '8px 12px', borderBottom: '1px solid #dfe2e7', fontSize: 12.5 };
const rnum = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const fld = { padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12.5 };

const todayISO = () => new Date().toISOString().slice(0, 10);

export function PaymentRun({ branch, setRoute }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const outQ = useOutstanding(branch);
  // JV/Contra legs age as payables on the Outstanding dashboard, but they are NOT swept
  // into the bulk bank payment — a journal-booked liability is settled deliberately via a
  // Payment Voucher, not a batch pay. Exclude them here (they carry kind 'journal'/'contra').
  const bills = useMemo(() => (outQ.data?.purchaseBills || []).filter((b) => b.kind !== 'journal' && b.kind !== 'contra'), [outQ.data]);
  const run = usePaymentRun();

  // Per-bill UI state keyed by billVno (or billId): { selected, amount }.
  const [sel, setSel] = useState({});
  const [bankRef, setBankRef] = useState('');
  const [paymentMode, setPaymentMode] = useState('NEFT');
  const [date, setDate] = useState(todayISO());
  const [result, setResult] = useState(null);

  const keyOf = (b) => b.billVno || b.billId;
  const rows = bills.map((b) => {
    const k = keyOf(b);
    const s = sel[k] || {};
    return { ...b, key: k, selected: !!s.selected, amount: s.amount != null ? s.amount : b.outstanding };
  });
  const summary = paymentRunSummary(rows);

  const toggle = (k, b) => setSel((p) => ({ ...p, [k]: { selected: !(p[k]?.selected), amount: p[k]?.amount != null ? p[k].amount : b.outstanding } }));
  // Editing the Pay Amount must NOT auto-select a row — the checkbox is the only
  // way to add a bill to the run. (Was `?? true`, which silently selected any
  // untouched row the moment its amount field was edited.)
  const setAmt = (k, v) => setSel((p) => ({ ...p, [k]: { selected: !!p[k]?.selected, amount: v } }));
  const allSelected = rows.length > 0 && rows.every((r) => r.selected);
  const toggleAll = () => { const next = {}; rows.forEach((r) => { next[r.key] = { selected: !allSelected, amount: sel[r.key]?.amount != null ? sel[r.key].amount : r.outstanding }; }); setSel(next); };

  const submit = () => {
    const payments = buildPaymentRunPayload(rows);
    if (!payments.length) return;
    run.mutate(
      { branch: branch?.code || branch, date, paymentMode, bankRef, payments },
      { onSuccess: (data) => { setResult(data); setSel({}); } },
    );
  };

  return (
    <div style={{ margin: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.dark, display: 'flex', alignItems: 'center', gap: 7 }}><Wallet size={17} /> Payment Run / Batch Pay</div>
          <div style={{ fontSize: 12, color: C.dim }}>{brLabel(branch)} · select outstanding bills, then post one pending payment per supplier for approval</div>
        </div>
      </div>

      {result && (
        <div style={{ ...card, padding: 14, marginBottom: 12, borderLeft: `4px solid ${C.green}` }}>
          <div style={{ fontWeight: 800, color: C.green }}>✓ Payment run created — {result.count} voucher{result.count === 1 ? '' : 's'} · {money(cur, result.totalAmount)} (status: {result.status})</div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>
            {(result.vouchers || []).map((v) => `${v.vno} · ${v.supplier} · ${money(cur, v.total)}`).join('   ·   ')}
          </div>
          {setRoute && <button onClick={() => setRoute('/transactions/approvals')} style={{ marginTop: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', color: '#fff', background: C.blue }}>Go to Approvals <ArrowRight size={12} style={{ verticalAlign: 'middle' }} /></button>}
        </div>
      )}

      {/* Run settings */}
      <div style={{ ...card, padding: 12, marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>Date<br /><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fld} /></label>
        <label style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>Pay from (bank/cash ledger)<br /><input value={bankRef} onChange={(e) => setBankRef(e.target.value)} placeholder="HDFC Bank" style={{ ...fld, minWidth: 180 }} /></label>
        <label style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>Mode<br />
          <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} style={fld}>
            {['NEFT', 'RTGS', 'UPI', 'Cheque', 'Cash'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 18 }}>
          {outQ.isLoading ? (
            <>
              <div className="kb-skeleton" style={{ height: 30, width: 130, borderRadius: 6 }} />
              <div className="kb-skeleton" style={{ height: 40, width: 150, borderRadius: 8 }} />
            </>
          ) : (
            <>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>{summary.bills} bills · {summary.suppliers} supplier{summary.suppliers === 1 ? '' : 's'}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.dark }}>{money(cur, summary.total)}</div>
              </div>
              <button disabled={!summary.bills || run.isPending} onClick={submit}
                style={{
                  padding: '11px 22px', fontSize: 13.5, fontWeight: 800, border: 'none', borderRadius: 8,
                  cursor: summary.bills ? 'pointer' : 'not-allowed', color: '#fff', background: C.amber,
                  opacity: !summary.bills || run.isPending ? 0.6 : 1,
                  boxShadow: summary.bills && !run.isPending ? '0 3px 10px rgba(133,79,11,0.35)' : 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap', transition: 'transform .1s, box-shadow .1s',
                }}>
                {run.isPending ? 'Posting…' : <>Post {summary.suppliers} payment{summary.suppliers === 1 ? '' : 's'} <ArrowRight size={14} /></>}
              </button>
            </>
          )}
        </div>
      </div>

      {run.isError && <div style={{ ...card, padding: 12, marginBottom: 12, color: C.red, fontSize: 12.5 }}>Payment run failed: {run.error?.message || 'unknown error'}</div>}

      {/* Bill selection */}
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ maxHeight: '64vh', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={{ ...th, cursor: 'pointer' }} onClick={toggleAll}>{allSelected ? '☑' : '☐'} All</th>
              <th style={th}>Supplier</th><th style={th}>Bill No</th><th style={th}>Date</th>
              <th style={{ ...th, ...rnum }}>Outstanding</th><th style={{ ...th, ...rnum }}>Age (d)</th><th style={{ ...th, ...rnum }}>Pay Amount</th>
            </tr></thead>
            <tbody>
              {outQ.isLoading && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>Loading outstanding bills…</td></tr>}
              {!outQ.isLoading && rows.length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.green, padding: 20 }}>✓ No outstanding supplier bills.</td></tr>}
              {rows.map((r) => (
                <tr key={r.key} style={{ background: r.selected ? '#f4f8ff' : '#fff' }}>
                  <td style={{ ...td, cursor: 'pointer' }} onClick={() => toggle(r.key, r)}>{r.selected ? <CheckSquare size={15} color={C.blue} /> : <Square size={15} color={C.dim} />}</td>
                  <td style={{ ...td, fontWeight: 600, color: C.dark }}>{r.party}</td>
                  <td style={{ ...td, color: C.blue, fontWeight: 600 }}>{r.billVno}</td>
                  <td style={td}>{r.date}</td>
                  <td style={{ ...td, ...rnum }}>{money(cur, r.outstanding)}</td>
                  <td style={{ ...td, ...rnum, color: r.ageDays > 60 ? C.red : C.dark }}>{r.ageDays ?? '—'}</td>
                  <td style={{ ...td, ...rnum }}>
                    <input type="number" min="0" max={r.outstanding} value={r.amount}
                      onChange={(e) => setAmt(r.key, e.target.value)}
                      style={{ ...fld, width: 110, textAlign: 'right', padding: '4px 8px' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
        Each supplier's selected bills are merged into one payment voucher (the bills become its allocations). Vouchers are created as <b>Pending</b> and must be approved before they hit the books.
      </div>
    </div>
  );
}

export default PaymentRun;
