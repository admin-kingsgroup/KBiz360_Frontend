// ─── Outstanding & On-Account dashboard ──────────────────────────────────────
// Four buckets the finance team must action: unsettled Sales bills, unsettled
// Purchase bills, on-account Receipts (advances in), on-account Payments (advances
// out). Bills are settled ONLY by an explicit bill-wise allocation — there is NO
// FIFO auto-settle. On-account amounts sit here until you settle them bill-wise.
import React, { useState } from 'react';
import { card, bc } from '../core/styles';
import { useOutstanding, useOpenBills, useSettleAdvance } from '../core/useAccounting';

const DARK = '#0d1326', DIM = '#5a6691', BLUE = '#185FA5', RED = '#A32D2D', GREEN = '#27500A', GOLD = '#A07828';
const money = (cur, n) => { const v = Math.round(Number(n) || 0); return (v < 0 ? '-' : '') + cur + Math.abs(v).toLocaleString('en-IN'); };
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const ageColor = (d) => (d > 90 ? RED : d > 30 ? '#854F0B' : DIM);

// Settle an on-account advance against the party's open bills (bill-wise).
function SettleModal({ adv, side, branch, cur, onClose }) {
  const bq = useOpenBills(adv.party, branch, side);
  const settle = useSettleAdvance();
  const [amts, setAmts] = useState({});
  const open = bq.data?.bills || [];
  const entered = r2(Object.values(amts).reduce((t, v) => t + (Number(v) || 0), 0));
  const remaining = r2(adv.onAccount - entered);
  const set = (vno, val) => setAmts((a) => ({ ...a, [vno]: val }));
  const over = remaining < -0.01;
  const save = () => {
    const adds = open.filter((b) => Number(amts[b.billVno]) > 0).map((b) => ({ billId: b.billId, billVno: b.billVno, amount: Number(amts[b.billVno]) }));
    const allocations = [...(adv.allocations || []), ...adds];
    settle.mutate({ id: adv.id, allocations }, { onSuccess: onClose });
  };
  const td = { padding: '7px 9px', borderBottom: '1px solid #f3f5f9', fontSize: 12 };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 'min(680px, 96vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef1f6' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: DARK }}>Settle bill-wise — {adv.vno}</h3>
          <p style={{ margin: '3px 0 0', fontSize: 11.5, color: DIM }}>{adv.party} · advance {money(cur, adv.total)} · <strong style={{ color: GOLD }}>on-account {money(cur, adv.onAccount)}</strong> — allocate it across open bills.</p>
        </div>
        <div style={{ overflow: 'auto', padding: '4px 18px' }}>
          {bq.isLoading && <div style={{ padding: 18, textAlign: 'center', color: DIM, fontSize: 12 }}>Loading open bills…</div>}
          {!bq.isLoading && open.length === 0 && <div style={{ padding: 18, textAlign: 'center', color: DIM, fontSize: 12 }}>No open bills for {adv.party}.</div>}
          {open.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={{ ...td, textAlign: 'left', fontWeight: 700, color: DIM }}>Bill No</th><th style={{ ...td, textAlign: 'left', fontWeight: 700, color: DIM }}>Date</th>
                <th style={{ ...td, textAlign: 'right', fontWeight: 700, color: DIM }}>Outstanding</th><th style={{ ...td, textAlign: 'right', fontWeight: 700, color: DIM }}>Settle now</th><th style={td}></th>
              </tr></thead>
              <tbody>
                {open.map((b) => {
                  const max = r2(Math.min(b.outstanding, (Number(amts[b.billVno]) || 0) + Math.max(0, remaining)));
                  return (
                    <tr key={b.billVno}>
                      <td style={{ ...td, fontWeight: 600, color: BLUE }}>{b.billVno}</td>
                      <td style={td}>{b.date}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{money(cur, b.outstanding)}</td>
                      <td style={{ ...td, textAlign: 'right' }}><input type="number" value={amts[b.billVno] || ''} onChange={(e) => set(b.billVno, e.target.value)} style={{ width: 110, padding: '5px 7px', border: '1px solid #d6dbe6', borderRadius: 5, fontSize: 12, textAlign: 'right' }} /></td>
                      <td style={td}><button onClick={() => set(b.billVno, String(max))} style={{ fontSize: 10, padding: '3px 7px', border: '1px solid #d6dbe6', borderRadius: 4, background: '#f7f8fb', color: DIM, cursor: 'pointer' }}>Max</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {settle.isError && <div style={{ color: RED, fontSize: 11.5, marginTop: 8 }}>⚠ {settle.error?.message}</div>}
        </div>
        <div style={{ padding: '12px 18px', borderTop: '1px solid #eef1f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: over ? RED : DIM, fontWeight: 700 }}>{over ? `Over-allocated by ${money(cur, -remaining)}` : `Remaining on-account: ${money(cur, remaining)}`}</span>
          <span style={{ display: 'inline-flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #d6dbe6', background: '#fff', color: DIM, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button disabled={entered <= 0 || over || settle.isPending} onClick={save} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: (entered <= 0 || over) ? '#9bb0c9' : GREEN, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: (entered <= 0 || over) ? 'default' : 'pointer' }}>{settle.isPending ? 'Settling…' : `Settle ${money(cur, entered)}`}</button>
          </span>
        </div>
      </div>
    </div>
  );
}

export function OutstandingOnAccount({ branch }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const q = useOutstanding(branch);
  const d = q.data || {};
  const t = d.totals || {};
  const [tab, setTab] = useState('sales');
  const [settleAdv, setSettleAdv] = useState(null); // { adv, side }

  const KPIS = [
    { k: 'sales', label: 'Unsettled Sales Bills', amt: t.salesOutstanding, n: (d.salesBills || []).length, color: BLUE },
    { k: 'purchase', label: 'Unsettled Purchase Bills', amt: t.purchaseOutstanding, n: (d.purchaseBills || []).length, color: RED },
    { k: 'recAdv', label: 'On-Account Receipts', amt: t.onAccountReceipts, n: (d.onAccountReceipts || []).length, color: GREEN },
    { k: 'payAdv', label: 'On-Account Payments', amt: t.onAccountPayments, n: (d.onAccountPayments || []).length, color: GOLD },
  ];

  const th = { padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: DIM, textTransform: 'uppercase', borderBottom: '2px solid #e7eaf2', position: 'sticky', top: 0, background: '#fff', whiteSpace: 'nowrap' };
  const td = { padding: '7px 10px', borderBottom: '1px solid #f3f5f9', fontSize: 12, whiteSpace: 'nowrap' };
  const tdR = { ...td, textAlign: 'right' };

  const billTable = (rows, who) => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>
        <th style={th}>{who}</th><th style={th}>Bill No</th><th style={th}>Date</th>
        <th style={{ ...th, textAlign: 'right' }}>Bill Total</th><th style={{ ...th, textAlign: 'right' }}>Settled</th><th style={{ ...th, textAlign: 'right' }}>Outstanding</th><th style={{ ...th, textAlign: 'right' }}>Age (d)</th>
      </tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td style={{ ...td, fontWeight: 600, color: DARK }}>{r.party || '—'}</td>
            <td style={{ ...td, color: BLUE, fontWeight: 600 }}>{r.billVno}</td>
            <td style={td}>{r.date}</td>
            <td style={tdR}>{money(cur, r.total)}</td>
            <td style={{ ...tdR, color: DIM }}>{r.settled ? money(cur, r.settled) : '—'}</td>
            <td style={{ ...tdR, fontWeight: 800, color: DARK }}>{money(cur, r.outstanding)}</td>
            <td style={{ ...tdR, color: ageColor(r.ageDays), fontWeight: 700 }}>{r.ageDays}</td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: DIM, fontSize: 12 }}>Nothing unsettled here. 🎉</td></tr>}
      </tbody>
    </table>
  );

  const advTable = (rows, who, side) => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>
        <th style={th}>{who}</th><th style={th}>Voucher</th><th style={th}>Date</th>
        <th style={{ ...th, textAlign: 'right' }}>Amount</th><th style={{ ...th, textAlign: 'right' }}>Settled bill-wise</th><th style={{ ...th, textAlign: 'right' }}>On-Account</th><th style={{ ...th, textAlign: 'right' }}>Age (d)</th><th style={{ ...th, textAlign: 'center' }}>Action</th>
      </tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td style={{ ...td, fontWeight: 600, color: DARK }}>{r.party || '—'}</td>
            <td style={{ ...td, color: BLUE, fontWeight: 600 }}>{r.vno}</td>
            <td style={td}>{r.date}</td>
            <td style={tdR}>{money(cur, r.total)}</td>
            <td style={{ ...tdR, color: DIM }}>{r.allocated ? money(cur, r.allocated) : '—'}</td>
            <td style={{ ...tdR, fontWeight: 800, color: GOLD }}>{money(cur, r.onAccount)}</td>
            <td style={{ ...tdR, color: ageColor(r.ageDays), fontWeight: 700 }}>{r.ageDays}</td>
            <td style={{ ...td, textAlign: 'center' }}><button onClick={() => setSettleAdv({ adv: r, side })} style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 5, border: `1px solid ${GREEN}`, background: '#fff', color: GREEN, cursor: 'pointer' }}>Settle bill-wise</button></td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: DIM, fontSize: 12 }}>No on-account amounts awaiting settlement.</td></tr>}
      </tbody>
    </table>
  );

  return (
    <div style={{ padding: '12px 14px', maxWidth: 1150, margin: '0 auto' }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DARK }}>Outstanding &amp; On-Account</h2>
        <p style={{ margin: '3px 0 0', fontSize: 11.5, color: DIM }}>
          Unsettled bills + on-account advances awaiting <strong>bill-wise settlement</strong>. Bills clear only by an explicit allocation — nothing is auto-settled.
        </p>
      </div>

      {q.isLoading && <div style={{ ...card, padding: 28, textAlign: 'center', color: DIM, fontSize: 12 }}>Loading…</div>}
      {q.isError && <div style={{ ...card, padding: 16, color: RED, fontSize: 12, fontWeight: 600 }}>⚠ {q.error?.message || 'Failed to load'}</div>}

      {!q.isLoading && !q.isError && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
            {KPIS.map((c) => (
              <div key={c.k} onClick={() => setTab(c.k)} style={{ ...card, padding: 14, cursor: 'pointer', borderLeft: `4px solid ${c.color}`, outline: tab === c.k ? `2px solid ${c.color}55` : 'none' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: DIM, textTransform: 'uppercase' }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.color, marginTop: 4 }}>{money(cur, c.amt)}</div>
                <div style={{ fontSize: 11, color: DIM, marginTop: 2 }}>{c.n} item{c.n === 1 ? '' : 's'}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {KPIS.map((c) => (
              <button key={c.k} onClick={() => setTab(c.k)} style={{ padding: '7px 13px', borderRadius: 7, border: `1px solid ${tab === c.k ? c.color : '#d6dbe6'}`, background: tab === c.k ? c.color : '#fff', color: tab === c.k ? '#fff' : DIM, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                {c.label} ({c.n})
              </button>
            ))}
          </div>

          <div style={{ ...card, padding: 0, overflow: 'auto', maxHeight: '62vh' }}>
            {tab === 'sales' && billTable(d.salesBills || [], 'Customer')}
            {tab === 'purchase' && billTable(d.purchaseBills || [], 'Supplier')}
            {tab === 'recAdv' && advTable(d.onAccountReceipts || [], 'Customer', 'customer')}
            {tab === 'payAdv' && advTable(d.onAccountPayments || [], 'Supplier', 'supplier')}
          </div>
        </>
      )}

      {settleAdv && <SettleModal adv={settleAdv.adv} side={settleAdv.side} branch={branch} cur={cur} onClose={() => setSettleAdv(null)} />}
    </div>
  );
}
