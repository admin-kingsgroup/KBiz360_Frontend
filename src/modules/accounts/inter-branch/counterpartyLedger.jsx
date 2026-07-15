// ─── Inter-Branch (INB) Counterparty Ledger ──────────────────────────────────
// A date-ordered STATEMENT of inter-branch dealings with each counterparty branch,
// from the INB Link registry. For the selected branch, each other branch gets its
// own statement: SALE rows = it sold to them (receivable), PURCHASE rows = it bought
// from them (payable); the net is the inter-branch position with that branch. Read
// only — complements the Trade Matrix (pivot) and Register & P&L Breakdown.
// Driven by /api/inter-branch/counterparty.
import { useMemo, useState } from 'react';
import { bc } from '../../../core/styleTokens';
import { localeOf } from '../../../core/format';
import { useInbCounterparty } from '../../../core/useInterBranchVoucher';
import { Skeleton } from '../../../shell/primitives';

const C = { dark: '#0d1326', gold: '#d4a437', blue: '#185FA5', red: '#A32D2D', green: '#27500A', dim: '#5a6691', border: '#cdd1d8' };
const money = (cur, n) => cur + Math.round(Number(n) || 0).toLocaleString(localeOf(cur));
const brLabel = (b) => (b === 'ALL' || !b ? 'All Branches' : (b.name || b.code || b));
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (s) => {
  if (!s) return '';
  const iso = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dmy = String(s).match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (iso) return `${iso[3]} ${MON[+iso[2] - 1] || iso[2]} ${iso[1]}`;
  if (dmy) return `${dmy[1]} ${MON[+dmy[2] - 1] || dmy[2]} ${dmy[3]}`;
  return String(s);
};
const badge = (s) => ({ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 800, color: '#fff', background: s === 'booked' ? C.green : s === 'open' ? C.gold : C.dim, textTransform: 'capitalize' });

export function InterBranchCounterpartyLedger({ branch }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const q = useInbCounterparty(branch);
  const data = q.data || { groups: [], totals: {} };
  const [open, setOpen] = useState({});

  const groups = data.groups || [];
  const totals = data.totals || { count: 0, sales: 0, purchases: 0, net: 0 };
  const branchSelected = branch && branch !== 'ALL';

  const card = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 9 };
  const th = { padding: '8px 12px', background: C.dark, color: C.gold, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'left', whiteSpace: 'nowrap' };
  const td = { padding: '7px 12px', borderBottom: '1px solid #dfe2e7', fontSize: 12.5 };
  const rnum = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
  const tile = (label, value, tone, sub) => (
    <div style={{ ...card, flex: 1, minWidth: 150, padding: '14px 16px', borderTop: `3px solid ${tone}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: tone, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: C.dim, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  const sumLabel = useMemo(() => groups.map((g) => g.counterparty).join(', '), [groups]);

  return (
    <div style={{ margin: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>Inter-Branch Counterparty Ledger</div>
        <div style={{ fontSize: 12, color: C.dim }}>{brLabel(branch)} · per-counterparty statement of inter-branch deals (INB Link registry){branchSelected ? ' · Sale = sold to them, Purchase = bought from them' : ''}</div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        {tile('Counterparties', String(groups.length), C.blue)}
        {tile('Sales (to them)', money(cur, totals.sales), C.green)}
        {tile('Purchases (from them)', money(cur, totals.purchases), C.red)}
        {tile('Net position', money(cur, totals.net), C.gold, `${totals.count || 0} deals`)}
      </div>

      {q.isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`sk-${i}`} style={{ ...card, padding: 14 }}>
              <Skeleton className="h-4 w-1/3" style={{ marginBottom: 10, opacity: Math.max(0.4, 1 - i * 0.15) }} />
              <Skeleton className="h-3 w-full" style={{ marginBottom: 6, opacity: Math.max(0.4, 1 - i * 0.15) }} />
              <Skeleton className="h-3 w-full" style={{ opacity: Math.max(0.4, 1 - i * 0.15) }} />
            </div>
          ))}
        </div>
      )
        : groups.length === 0 ? <div style={{ ...card, padding: 24, textAlign: 'center', color: C.dim }}>No inter-branch deals for {brLabel(branch)}.</div>
        : groups.map((g) => {
          const isOpen = open[g.counterparty] !== false; // default expanded
          return (
            <div key={g.counterparty} style={{ ...card, marginBottom: 12, overflow: 'hidden' }}>
              <button onClick={() => setOpen((o) => ({ ...o, [g.counterparty]: !isOpen }))}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f3f5fa', border: 'none', borderBottom: isOpen ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}>
                <span style={{ fontWeight: 800, color: C.dark, fontSize: 14 }}>{isOpen ? '▾' : '▸'} {g.counterparty} <span style={{ fontSize: 11, color: C.dim, fontWeight: 600 }}>· {g.rows.length} deal(s)</span></span>
                <span style={{ fontSize: 12 }}>
                  <span style={{ color: C.green, marginRight: 12 }}>Sale {money(cur, g.sales)}</span>
                  <span style={{ color: C.red, marginRight: 12 }}>Pur {money(cur, g.purchases)}</span>
                  <b style={{ color: C.gold }}>Net {money(cur, g.net)}</b>
                </span>
              </button>
              {isOpen && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>Date</th><th style={th}>INB Link No</th><th style={th}>Module</th><th style={th}>Dir</th>
                        <th style={{ ...th, textAlign: 'right' }}>Fares</th><th style={{ ...th, textAlign: 'right' }}>SVF</th>
                        <th style={{ ...th, textAlign: 'right' }}>Tax</th><th style={{ ...th, textAlign: 'right' }}>Total</th>
                        <th style={th}>Sale Vno</th><th style={th}>Purchase Vno</th><th style={th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r, i) => (
                        <tr key={r.inbLinkNo + i} style={{ background: r.direction === 'purchase' ? '#fcf6f6' : '#fff' }}>
                          <td style={td}>{fmtDate(r.date)}</td>
                          <td style={{ ...td, fontFamily: 'monospace', color: C.blue }}>{r.inbLinkNo}</td>
                          <td style={td}>{r.module}{r.packageType ? ` · ${r.packageType}` : ''}</td>
                          <td style={{ ...td, color: r.direction === 'purchase' ? C.red : C.green, fontWeight: 700, textTransform: 'capitalize' }}>{r.direction}</td>
                          <td style={{ ...td, ...rnum }}>{money(cur, r.fares)}</td>
                          <td style={{ ...td, ...rnum }}>{money(cur, r.serviceFee)}</td>
                          <td style={{ ...td, ...rnum }}>{money(cur, r.taxAmt)}</td>
                          <td style={{ ...td, ...rnum, fontWeight: 700 }}>{money(cur, r.total)}</td>
                          <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>{r.saleVno || '—'}</td>
                          <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>{r.purchaseVno || '—'}</td>
                          <td style={td}><span style={badge(r.status)}>{r.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>Read-only — from the INB Link registry. No elimination; branches stay independent. {sumLabel ? `Counterparties: ${sumLabel}.` : ''}</div>
    </div>
  );
}
