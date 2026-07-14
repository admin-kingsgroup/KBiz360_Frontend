/* ════════════════════════════════════════════════════════════════════
   INTER-BRANCH RECONCILIATION  /accounts/interbranch-reco
   Branches are independent books; a transaction between two must be booked
   on BOTH sides via their directional current accounts ("TK- {other}
   Branch"). This screen pairs the two sides per branch pair and flags any
   that don't net to zero — a one-sided or mismatched inter-branch entry.

   BUSINESS SUB-MODULE REORG (2026-07-13): moved out of
   accountantWorkspace/accountantWorkspace.jsx (MENU_RECONCILIATION ▸
   Statement Matching ▸ "Inter-Branch Reconciliation").
   ════════════════════════════════════════════════════════════════════ */
import { AlertTriangle, CheckCircle2, Coins, Scale } from 'lucide-react';
import { bc } from '../../../core/styles';
import { useInterBranchReco, useInterBranchLinks } from '../../../core/useInterBranchReco';
import { C, card, money, Shell, th, td, rnum, Table, Tile, Row } from '../../accountantWorkspace/shared';
import { wbBadge } from './shared';

export function InterBranchReco({ branch }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const q = useInterBranchReco();
  const raw = q.data || { pairs: [], totals: {} };
  // A specific top-bar branch scopes the reco to pairs INVOLVING that branch;
  // unrelated pairs (and their totals) only show in the ALL view.
  const code = branch && branch !== 'ALL' ? (branch.code || branch) : '';
  const pairs = (raw.pairs || []).filter((p) => !code || p.branchA === code || p.branchB === code);
  const data = code
    ? {
      pairs,
      totals: {
        pairs: pairs.length,
        matched: pairs.filter((p) => p.matched).length,
        mismatched: pairs.filter((p) => !p.matched).length,
        totalDifference: pairs.reduce((s, p) => s + Math.abs(Number(p.difference) || 0), 0),
      },
    }
    : raw;
  return (
    <Shell title="Inter-branch Reconciliation" sub="every branch pair's two directional current accounts — they should net to zero"
      right={<div style={{ ...card, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: data.totals?.mismatched ? C.red : C.green }}>{data.totals?.mismatched || 0} mismatched · {data.totals?.matched || 0} matched</div>}>
      <Row>
        <Tile icon={<Scale size={13} />} label="Branch Pairs" value={data.totals?.pairs || 0} sub="with activity" tone={C.dark} loading={q.isLoading} />
        <Tile icon={<CheckCircle2 size={13} />} label="Reconciled" value={data.totals?.matched || 0} sub="net to zero" tone={C.green} loading={q.isLoading} />
        <Tile icon={<AlertTriangle size={13} />} label="Mismatched" value={data.totals?.mismatched || 0} sub="one-sided / unequal" tone={C.red} loading={q.isLoading} />
        <Tile icon={<Coins size={13} />} label="Total Difference" value={money(cur, data.totals?.totalDifference)} sub="sum of |differences|" tone={C.gold} loading={q.isLoading} />
      </Row>
      <Table>
        <thead><tr>
          {['Branch A', 'Branch B', 'A receivable from B', 'B receivable from A', 'Difference', 'Status'].map((h, i) =>
            <th key={h} style={{ ...th, ...(i >= 2 && i <= 4 ? rnum : {}) }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {q.isLoading && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>Loading…</td></tr>}
          {!q.isLoading && data.pairs.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.green, padding: 20 }}>✓ No inter-branch balances to reconcile.</td></tr>}
          {data.pairs.map((p, i) => (
            <tr key={i} style={{ background: p.matched ? '#f4fbf4' : '#fdf6f4' }}>
              <td style={{ ...td, fontWeight: 700, color: C.dark }}>{p.branchA}</td>
              <td style={{ ...td, fontWeight: 700, color: C.dark }}>{p.branchB}</td>
              <td style={{ ...td, ...rnum }}>{money(cur, p.aReceivableFromB)}</td>
              <td style={{ ...td, ...rnum }}>{money(cur, p.bReceivableFromA)}</td>
              <td style={{ ...td, ...rnum, fontWeight: 700, color: p.matched ? C.dim : C.red }}>{money(cur, Math.abs(p.difference))}</td>
              <td style={td}><span style={wbBadge(p.matched ? 'reconciled' : 'differences')}>{p.matched ? 'reconciled' : 'mismatch'}</span></td>
            </tr>
          ))}
        </tbody>
      </Table>
      {/* Line level — the exact deal behind a pair mismatch, by INB Link No. */}
      <InterBranchLinkLevel branch={branch} cur={cur} />
      <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
        Each pair compares branch A's "Travkings Tours and Travels B" ledger against branch B's "Travkings Tours and Travels A" ledger (sub-group <b>Inter Branch</b>). The selling branch books a debtor and the buying branch a creditor, so the two should be equal and opposite (net zero). A non-zero difference means one branch booked the deal and the other hasn't, or the amounts disagree — an agreement check, not an elimination.
      </div>
    </Shell>
  );
}

// Line-level inter-branch: every INB deal by Link No from the registry — an
// OPEN link names the exact voucher one side hasn't booked yet, which is the
// line-level answer behind a non-zero pair difference above.
function InterBranchLinkLevel({ branch, cur }) {
  const code = branch && branch !== 'ALL' ? (branch.code || branch) : '';
  const q = useInterBranchLinks({ branch: code || undefined });
  const data = q.data || { links: [], totals: {} };
  const open = (data.unbooked || []).slice(0, 50);
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.dark, marginBottom: 6 }}>
        Line level — by INB Link No
        <span style={{ marginLeft: 10, fontSize: 11.5, fontWeight: 700, color: (data.totals?.open || 0) ? C.red : C.green }}>
          {data.totals?.open || 0} open · {data.totals?.booked || 0} booked{(data.totals?.open || 0) ? ` · ${money(cur, data.totals?.openAmount)} unbooked` : ''}
        </span>
      </div>
      <Table>
        <thead><tr>{['Link No', 'Date', 'From → To', 'Module', 'Total', 'Status'].map((h, i) => <th key={h} style={{ ...th, ...(i === 4 ? rnum : {}) }}>{h}</th>)}</tr></thead>
        <tbody>
          {q.isLoading && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 16 }}>Loading…</td></tr>}
          {!q.isLoading && open.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.green, padding: 16 }}>✓ Every INB link is booked on both sides.</td></tr>}
          {open.map((l) => (
            <tr key={l.inbLinkNo} style={{ background: '#fdf6f4' }}>
              <td style={{ ...td, fontWeight: 700 }}>{l.inbLinkNo}</td>
              <td style={td}>{l.date}</td>
              <td style={td}>{l.fromBranch} → {l.toBranch}</td>
              <td style={td}>{l.module || '—'}</td>
              <td style={{ ...td, ...rnum, fontWeight: 700 }}>{money(cur, l.total)}</td>
              <td style={td}><span style={wbBadge('differences')}>open — one side unbooked</span></td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>An <b>open</b> link = the selling branch pushed the deal but the buying branch hasn't booked its purchase leg (or vice-versa) — book the missing leg and the pair above nets to zero. Showing up to 50.</div>
    </div>
  );
}
