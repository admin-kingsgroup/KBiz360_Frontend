import React from 'react';
import { consolidateLegs } from './ui';

// ────────────────────────────────────────────────────────────────────────────
// JvBlock — the ONE shared JV renderer for the whole app. A side-by-side T-account:
// all Debit legs in the left pane, all Credit legs in the right, each ledger netted
// to a single line, with Total Dr / Total Cr and a balance flag. Used identically by
// every voucher (VoucherShell), the Refund/Reissue split view, the SO/PO/GP booking
// JV, and the Finance / Approvals voucher views — so the journal looks the same
// everywhere. A two-sided voucher (booking, refund) just renders two JvBlocks.
//
//   postings : [{ ledger, group, debit, credit }]
//   title/sub: optional header line (e.g. "Sales voucher · BOM/0626/SF00495")
//   net      : consolidate duplicate ledgers (default true)
//   empty    : message when there are no legs yet
// ────────────────────────────────────────────────────────────────────────────
const num = (v) => (Number(v) || 0);
const fmtN = (v) => num(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;

const HEAD = { padding: '3px 8px', fontSize: 9.5, fontWeight: 700, color: '#5a6691', background: '#eef1f7', letterSpacing: '0.3px' };
const FOOT = { borderTop: '1px solid #cdd1d8', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, background: '#fafbfd' };
const DR = '#1A7A42', CR = '#C0392B';

function Leg({ p, side }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '3px 8px', borderBottom: '1px solid #dfe2e7' }}>
      <span style={{ minWidth: 0 }}>
        <span style={{ fontWeight: 600, color: '#14161a' }}>{p.ledger}</span>
        <span style={{ display: 'block', fontSize: 9, color: '#9197a3' }}>{p.group || ''}</span>
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: side === 'dr' ? DR : CR }}>
        {fmtN(side === 'dr' ? p.debit : p.credit)}
      </span>
    </div>
  );
}

export function JvBlock({ postings, title, sub, color = '#14161a', net = true, empty = 'Pick ledgers / amounts to see the journal effect.' }) {
  const list = net
    ? consolidateLegs(postings)
    : (postings || []).filter((p) => num(p && p.debit) || num(p && p.credit));
  if (!list.length) return <div style={{ fontSize: 11, color: '#9197a3', padding: 12, textAlign: 'center' }}>{empty}</div>;

  const dr = list.filter((p) => num(p.debit)), cr = list.filter((p) => num(p.credit));
  const totDr = r2(dr.reduce((s, p) => s + num(p.debit), 0));
  const totCr = r2(cr.reduce((s, p) => s + num(p.credit), 0));
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
          {dr.map((p, i) => <Leg key={'d' + i} p={p} side="dr" />)}
        </div>
        <div>
          <div style={HEAD}>Cr · Credit</div>
          {cr.map((p, i) => <Leg key={'c' + i} p={p} side="cr" />)}
        </div>
        <div style={{ ...FOOT, borderRight: '1px solid #cdd1d8', color: DR }}><span>Total Dr</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtN(totDr)}</span></div>
        <div style={{ ...FOOT, color: CR }}><span>Total Cr</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtN(totCr)}</span></div>
      </div>
    </div>
  );
}
