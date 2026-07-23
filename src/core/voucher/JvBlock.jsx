import React from 'react';
import { consolidateLegs } from './ui';
import { localeOf, activeCurrency } from '../format';

// ────────────────────────────────────────────────────────────────────────────
// JvBlock — the ONE shared JV renderer for the whole app. A side-by-side T-account:
// BOTH panes list EVERY ledger of the entry in the same order (row-for-row mirror),
// each ledger netted to a single line — the amount prints on its real side and the
// empty side shows an explicit dimmed 0.00, never a missing row. So the Debit pane
// always reads exactly like the Credit pane ("every ledger this hits", both sides),
// with Total Dr / Total Cr and a balance flag. Used identically by every voucher
// (VoucherShell), the Refund/Reissue split view, the SO/PO/GP booking JV, and the
// Finance / Approvals voucher views — so the journal looks the same everywhere.
// A two-sided voucher (booking, refund) just renders two JvBlocks.
//
//   postings : [{ ledger, group, debit, credit }]
//   title/sub: optional header line (e.g. "Sales voucher · BOM/0626/SF00495")
//   net      : consolidate duplicate ledgers (default true)
//   empty    : message when there are no legs yet
// ────────────────────────────────────────────────────────────────────────────
const num = (v) => (Number(v) || 0);
// Branch-currency-aware digit grouping: Indian lakh/crore for ₹, Western thousands for
// USD branches (NBO/DAR/FBM). Follows the active branch currency (set in App.jsx) so a
// USD voucher's JV legs read "485,000.00", not "4,85,000.00".
const fmtN = (v) => num(v).toLocaleString(localeOf(activeCurrency()), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;

const HEAD = { padding: '3px 8px', fontSize: 9.5, fontWeight: 700, color: '#5a6691', background: '#eef1f7', letterSpacing: '0.3px' };
const FOOT = { borderTop: '1px solid #cdd1d8', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, background: '#fafbfd' };
const DR = '#1A7A42', CR = '#C0392B';

// Dimmed for a ledger's EMPTY side — the row still renders (with an explicit 0.00)
// so the Dr and Cr panes stay row-aligned mirrors; only the real leg is emphasised.
const ZERO = '#9aa3bd';

function Leg({ p, side }) {
  const amt = num(side === 'dr' ? p.debit : p.credit);
  const zero = !amt;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '3px 8px', borderBottom: '1px solid #dfe2e7' }}>
      <span style={{ minWidth: 0 }}>
        <span style={{ fontWeight: 600, color: zero ? ZERO : '#14161a' }}>{p.ledger}</span>
        <span style={{ display: 'block', fontSize: 9, color: '#9197a3' }}>{p.group || ''}</span>
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: zero ? ZERO : (side === 'dr' ? DR : CR) }}>
        {fmtN(amt)}
      </span>
    </div>
  );
}

export function JvBlock({ postings, title, sub, color = '#14161a', net = true, empty = 'Pick ledgers / amounts to see the journal effect.' }) {
  const list = net
    ? consolidateLegs(postings)
    : (postings || []).filter((p) => num(p && p.debit) || num(p && p.credit));
  if (!list.length) return <div style={{ fontSize: 11, color: '#9197a3', padding: 12, textAlign: 'center' }}>{empty}</div>;

  const totDr = r2(list.reduce((s, p) => s + num(p.debit), 0));
  const totCr = r2(list.reduce((s, p) => s + num(p.credit), 0));
  const bal = Math.abs(totDr - totCr) < 0.01;

  return (
    <div style={{ marginBottom: 10 }}>
      {(title || sub) && (
        <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4 }}>
          {title}{sub ? ` · ${sub}` : ''}
          {!bal && <span style={{ color: CR, fontWeight: 700 }}>  (out by {fmtN(totDr - totCr)})</span>}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #cdd1d8', borderRadius: 6, overflow: 'hidden', fontSize: 10.5 }}>
        <div style={{ borderRight: '1px solid #cdd1d8' }}>
          <div style={HEAD}>Dr · Debit</div>
          {list.map((p, i) => <Leg key={'d' + i} p={p} side="dr" />)}
        </div>
        <div>
          <div style={HEAD}>Cr · Credit</div>
          {list.map((p, i) => <Leg key={'c' + i} p={p} side="cr" />)}
        </div>
        <div style={{ ...FOOT, borderRight: '1px solid #cdd1d8', color: DR }}><span>Total Dr</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtN(totDr)}</span></div>
        <div style={{ ...FOOT, color: CR }}><span>Total Cr</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtN(totCr)}</span></div>
      </div>
    </div>
  );
}
