// ─── Inter-Branch (INB) Register + Reconciliation ─────────────────────────────
// Every inter-branch leg by INB Link No: from/to branch, amount, and status
// (open = seller raised it, buyer hasn't booked · booked = matched both sides).
// The "open" rows are the unbooked-legs worklist — what each branch still owes an
// entry for. Driven by /api/inter-branch/reconcile (no consolidation/elimination).
import React, { useMemo, useState } from 'react';
import { bc } from '../../core/styles';
import { localeOf } from '../../core/format';
import { useInbReconcile, useInbPnlBreakdown } from '../../core/useInterBranchVoucher';

const C = { dark: '#0d1326', gold: '#d4a437', blue: '#185FA5', red: '#A32D2D', green: '#27500A', dim: '#5a6691', border: '#cdd1d8' };
const money = (cur, n) => cur + Math.round(Number(n) || 0).toLocaleString(localeOf(cur));
const brLabel = (b) => (b === 'ALL' || !b ? 'All Branches' : (b.name || b.code || b));
const badge = (s) => ({ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 800, color: '#fff', background: s === 'booked' ? C.green : s === 'open' ? C.gold : C.dim, textTransform: 'capitalize' });

export function InterBranchRegister({ branch }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const q = useInbReconcile(branch);
  const data = q.data || { links: [], totals: {}, unbooked: [] };
  const pnlQ = useInbPnlBreakdown(branch);
  const pnl = pnlQ.data || { sales: [], purchases: [], totals: {} };
  const [onlyOpen, setOnlyOpen] = useState(false);
  const rows = useMemo(() => (data.links || []).filter((l) => !onlyOpen || l.status === 'open'), [data.links, onlyOpen]);

  const card = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 9 };
  const th = { padding: '8px 12px', background: C.dark, color: C.gold, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'left', whiteSpace: 'nowrap' };
  const td = { padding: '8px 12px', borderBottom: '1px solid #dfe2e7', fontSize: 12.5 };
  const rnum = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
  const tile = (label, value, tone, sub) => (
    <div style={{ ...card, flex: 1, minWidth: 150, padding: '14px 16px', borderTop: `3px solid ${tone}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: tone, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: C.dim, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ margin: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>Inter-Branch Register</div>
        <div style={{ fontSize: 12, color: C.dim }}>{brLabel(branch)} · every inter-branch leg by INB Link No · open legs are awaiting the other branch's booking</div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 }}>
        {tile('Total Legs', data.totals?.total || 0, C.dark)}
        {tile('Matched (booked)', data.totals?.booked || 0, C.green, 'both sides entered')}
        {tile('Open (unbooked)', data.totals?.open || 0, C.gold, 'awaiting buyer PO')}
        {tile('Open Amount', money(cur, data.totals?.openAmount), C.red)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 2px 10px' }}>
        <label style={{ fontSize: 12, color: C.dim, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> Only show open (unbooked)
        </label>
      </div>

      <div style={{ ...card, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {['INB Link No', 'From', 'To', 'Date', 'Passenger', 'Total', 'Sale Vno', 'Purchase Vno', 'Status'].map((h, i) =>
              <th key={h} style={{ ...th, ...(i === 5 ? rnum : {}) }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>Loading…</td></tr>}
            {!q.isLoading && rows.length === 0 && <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>No inter-branch legs{onlyOpen ? ' open' : ''}.</td></tr>}
            {rows.map((l) => (
              <tr key={l.inbLinkNo} style={{ background: l.status === 'open' ? '#fdfaf0' : '#fff' }}>
                <td style={{ ...td, fontFamily: 'monospace', color: C.blue }}>{l.inbLinkNo}</td>
                <td style={td}>{l.fromBranch}</td>
                <td style={td}>{l.toBranch}</td>
                <td style={td}>{l.date}</td>
                <td style={{ ...td, color: C.dim }}>{l.passenger || '—'}</td>
                <td style={{ ...td, ...rnum, fontWeight: 700 }}>{money(cur, l.total)}</td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>{l.saleVno || '—'}</td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>{l.purchaseVno || '—'}</td>
                <td style={td}><span style={badge(l.status)}>{l.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
        Each leg ties the seller's INB sale to the buyer's PO by <b>INB Link No</b>. <b>Open</b> = the buying branch hasn't fetched it into a SO/PO/GP yet (Daily Entry ▸ SO/PO/GP ▸ "Fetch open INB"). <b>Booked</b> = both sides entered. No elimination — branches stay independent.
      </div>

      {/* P&L breakdown — counterparty branch → module → component */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.dark, marginBottom: 8 }}>
          Inter-Branch P&amp;L Breakdown <span style={{ fontWeight: 500, color: C.dim, fontSize: 11 }}>· counterparty branch → module → component</span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[['Inter-Branch Sales', pnl.sales, pnl.totals?.sales, C.green], ['Inter-Branch Purchases', pnl.purchases, pnl.totals?.purchases, C.red]].map(([title, rows, tot, tone]) => (
            <div key={title} style={{ ...card, padding: 14, flex: 1, minWidth: 320 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: tone, marginBottom: 8 }}>{title} · {money(cur, tot)}</div>
              {(!rows || rows.length === 0) && <div style={{ fontSize: 12, color: C.dim }}>—</div>}
              {(rows || []).map((b) => (
                <div key={b.branch} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: C.dark, fontSize: 12.5 }}>{b.branch} · {money(cur, b.total)}</div>
                  {b.modules.map((md) => (
                    <div key={md.module} style={{ marginLeft: 12, marginTop: 2 }}>
                      <div style={{ fontSize: 12, color: C.blue }}>{md.module} · {money(cur, md.total)}</div>
                      {md.components.map((c) => (
                        <div key={c.label} style={{ marginLeft: 14, fontSize: 11.5, color: C.dim, display: 'flex', justifyContent: 'space-between', maxWidth: 300 }}>
                          <span>{c.label}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(cur, c.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>
          Read-only analysis from the INB registry — mirrors how it reads in each branch's P&L (the heads already show as P&L lines). Sales = legs this branch sold; Purchases = legs it bought.
        </div>
      </div>
    </div>
  );
}
