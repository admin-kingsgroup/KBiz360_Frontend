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
import { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Coins, Scale, Snowflake, Lock, PenLine } from 'lucide-react';
import { bc } from '../../../core/styles';
import { toast } from '../../../core/ux/toast';
import { confirmDialog } from '../../../core/ux/confirm';
import { useInterBranchReco, useInterBranchLinks } from '../../../core/useInterBranchReco';
import { C, card, money, Shell, th, td, rnum, Table, Tile, Row, aBtn } from '../../accountantWorkspace/shared';
import { wbBadge } from './shared';
import { getIbFreezeAll, ibFreeze, ibFreezeSign, ibUnfreeze, ibFreezeReopen } from '../api';

const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const pairKey = (a, b) => [a, b].sort().join('::');
// Currency symbol per book currency — a cross-currency pair (INR-branch ↔ USD-branch)
// shows each side in its OWN currency, so a single top-bar symbol isn't enough.
const CCY_SYM = { INR: '₹', USD: '$' };
const symOf = (ccy, fallback) => CCY_SYM[ccy] || fallback;
// Book currency per branch (mirror of backend taxRegime.BOOK_CCY) — an INB link's `total`
// is in the SELLER (fromBranch) currency, so it must be shown in that currency, not the
// viewer's. India → INR, Africa → USD.
const BOOK_CCY = { BOM: 'INR', AMD: 'INR', BOMMB: 'INR', NBO: 'USD', DAR: 'USD', FBM: 'USD' };
const bookCcyOf = (b) => BOOK_CCY[b] || 'INR';

export function InterBranchReco({ branch }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const [period, setPeriod] = useState(thisMonth());
  // Freeze state for EVERY pair this month in ONE reconcile (not N× per cell).
  const [freezeAll, setFreezeAll] = useState([]);
  const loadFreeze = useCallback(async () => { setFreezeAll(await getIbFreezeAll({ period })); }, [period]);
  useEffect(() => { loadFreeze(); }, [loadFreeze]);
  const freezeMap = useMemo(() => { const m = {}; for (const s of freezeAll) m[s.pairId] = s; return m; }, [freezeAll]);
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
        matched: pairs.filter((p) => p.matched === true).length,
        mismatched: pairs.filter((p) => p.matched === false).length,
        unrated: pairs.filter((p) => p.matched === null).length, // cross-currency, rate not set
        totalDifference: pairs.reduce((s, p) => s + Math.abs(Number(p.difference) || 0), 0),
      },
    }
    : raw;
  return (
    <Shell title="Inter-branch Reconciliation" sub="every branch pair's two directional current accounts — they should net to zero"
      right={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: C.dim }}>Freeze month</span>
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ border: `1px solid ${C.border}`, borderRadius: 5, padding: '3px 7px', fontSize: 12 }} />
        <div style={{ ...card, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: data.totals?.mismatched ? C.red : C.green }}>{data.totals?.mismatched || 0} mismatched · {data.totals?.matched || 0} matched</div>
      </div>}>
      <Row>
        <Tile icon={<Scale size={13} />} label="Branch Pairs" value={data.totals?.pairs || 0} sub="with activity" tone={C.dark} loading={q.isLoading} />
        <Tile icon={<CheckCircle2 size={13} />} label="Reconciled" value={data.totals?.matched || 0} sub="net to zero" tone={C.green} loading={q.isLoading} />
        <Tile icon={<AlertTriangle size={13} />} label="Mismatched" value={data.totals?.mismatched || 0} sub="one-sided / unequal" tone={C.red} loading={q.isLoading} />
        <Tile icon={<Coins size={13} />} label="Total Difference" value={money(cur, data.totals?.totalDifference)} sub="sum of |differences|" tone={C.gold} loading={q.isLoading} />
      </Row>
      <Table>
        <thead><tr>
          {['Branch A', 'Branch B', 'A receivable from B', 'B receivable from A', 'Difference', 'Status', `Freeze · ${period}`].map((h, i) =>
            <th key={h} style={{ ...th, ...(i >= 2 && i <= 4 ? rnum : {}) }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {q.isLoading && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>Loading…</td></tr>}
          {!q.isLoading && data.pairs.length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.green, padding: 20 }}>✓ No inter-branch balances to reconcile.</td></tr>}
          {data.pairs.map((p, i) => {
            // Cross-currency pair → each side in its own currency; the difference (and the
            // reference rate used to translate) sit in branch A's currency.
            const symA = p.crossCurrency ? symOf(p.currencyA, cur) : cur;
            const symB = p.crossCurrency ? symOf(p.currencyB, cur) : cur;
            const unrated = p.matched === null;
            const bg = p.matched === true ? '#f4fbf4' : unrated ? '#fff7e0' : '#fdf6f4';
            return (
            <tr key={i} style={{ background: bg }}>
              <td style={{ ...td, fontWeight: 700, color: C.dark }}>{p.branchA}</td>
              <td style={{ ...td, fontWeight: 700, color: C.dark }}>{p.branchB}</td>
              <td style={{ ...td, ...rnum }}>{money(symA, p.aReceivableFromB)}</td>
              <td style={{ ...td, ...rnum }}>{money(symB, p.bReceivableFromA)}</td>
              <td style={{ ...td, ...rnum, fontWeight: 700, color: p.matched === true ? C.dim : unrated ? '#8a6d00' : C.red }}>
                {unrated ? '—' : money(symA, Math.abs(p.difference))}
                {p.crossCurrency && p.fxRate ? <div style={{ fontSize: 10, color: C.dim, fontWeight: 400 }}>@ 1 USD = ₹{Number(p.fxRate).toLocaleString()}</div> : null}
              </td>
              <td style={td}><span style={wbBadge(p.matched === true ? 'reconciled' : unrated ? 'open' : 'differences')}>{p.matched === true ? 'reconciled' : unrated ? 'set FX rate' : 'mismatch'}</span></td>
              <td style={td}><IbFreezeCell branchA={p.branchA} branchB={p.branchB} period={period} st={freezeMap[pairKey(p.branchA, p.branchB)]} onChanged={loadFreeze} /></td>
            </tr>
            );
          })}
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

// Per-pair FREEZE control — renders from the parent's ONE month reconcile (`st`) and
// mutates via the parent's `onChanged` refresh. Freeze is gated on the MONTH-scoped
// agreement (`st.agrees`), not the all-time pair status. Frozen (not certified) →
// soft Un-freeze (whoever froze); Certified → Director/Owner Re-open (reason).
function IbFreezeCell({ branchA, branchB, period, st, onChanged }) {
  const [busy, setBusy] = useState(false);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); toast(okMsg, 'success'); await onChanged(); }
    catch (e) { toast(e?.message || 'Action failed', 'error'); }
    finally { setBusy(false); }
  };
  const doFreeze = () => run(() => ibFreeze({ branchA, branchB, period }), `Frozen ${branchA}↔${branchB} · ${period}`);
  const doSign = () => run(() => ibFreezeSign({ branchA, branchB, period }), `Signed ${branchA}↔${branchB}`);
  const doUnfreeze = () => run(() => ibUnfreeze({ branchA, branchB, period }), `Un-frozen ${branchA}↔${branchB}`);
  const doReopen = async () => {
    const { confirmed, reason } = await confirmDialog({ title: `Re-open ${branchA}↔${branchB}?`, message: 'Releases the certified freeze so this month can change again.', reasonRequired: true, reasonLabel: 'Reason', confirmLabel: 'Re-open' });
    if (!confirmed) return;
    run(() => ibFreezeReopen({ branchA, branchB, period, reason }), `Re-opened ${branchA}↔${branchB}`);
  };

  // No month-scoped state for this pair (no activity + no freeze record) → nothing to freeze.
  if (!st) return <span style={{ fontSize: 10, color: C.dim }} title="no inter-branch activity this month">—</span>;
  const { frozen, certified, agrees, signatures, nextSigner } = st;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
      {certified
        ? <span style={{ fontSize: 10, fontWeight: 800, color: '#0f2f5c' }}><Lock size={10} style={{ verticalAlign: -1 }} /> Certified</span>
        : frozen
          ? <span style={{ fontSize: 10, fontWeight: 800, color: '#185FA5' }}><Snowflake size={10} style={{ verticalAlign: -1 }} /> Frozen{signatures ? ` · ${signatures} signed` : ''}</span>
          : <span style={{ fontSize: 10, color: C.dim }}>Open</span>}
      {!frozen && !certified && (
        <button onClick={doFreeze} disabled={!agrees || busy} title={agrees ? '' : 'the two branches must agree this month first'}
          style={{ ...aBtn(C.blue), opacity: (agrees && !busy) ? 1 : 0.5 }}>Freeze</button>
      )}
      {frozen && !certified && (<>
        {nextSigner && <button onClick={doSign} disabled={busy} style={{ ...aBtn(C.green), opacity: busy ? 0.6 : 1 }}><PenLine size={11} style={{ verticalAlign: -2 }} /> Sign as {nextSigner}</button>}
        <button onClick={doUnfreeze} disabled={busy} style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}` }}>Un-freeze</button>
      </>)}
      {certified && <button onClick={doReopen} disabled={busy} style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}` }}>Re-open</button>}
    </div>
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
  // The backend openAmount sums link totals across currencies — meaningless when INR and USD
  // legs mix. Re-total on the FE grouped by the SELLER's currency so each figure is honest.
  const openByCcy = {};
  for (const l of (data.unbooked || [])) { const c = bookCcyOf(l.fromBranch); openByCcy[c] = (openByCcy[c] || 0) + (Number(l.total) || 0); }
  const openAmtStr = Object.entries(openByCcy).map(([c, v]) => `${CCY_SYM[c] || ''}${(Math.round(v * 100) / 100).toLocaleString(c === 'USD' ? undefined : undefined)}`).join(' + ');
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.dark, marginBottom: 6 }}>
        Line level — by INB Link No
        <span style={{ marginLeft: 10, fontSize: 11.5, fontWeight: 700, color: (data.totals?.open || 0) ? C.red : C.green }}>
          {data.totals?.open || 0} open · {data.totals?.booked || 0} booked{(data.totals?.open || 0) ? ` · ${openAmtStr} unbooked` : ''}
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
