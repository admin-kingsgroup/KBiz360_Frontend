/* ════════════════════════════════════════════════════════════════════
   TALLY RECONCILIATION — LEDGER MATCHER (DAY BOOK)  /accounts/tally-reco
   Reconcile ANY ERP ledger against an imported Tally ledger export — the
   in-app version of the per-bank Tally↔ERP recon scripts. Pick a ledger,
   paste its Tally export, then auto/manual match against the live ERP
   postings.

   BUSINESS SUB-MODULE REORG (2026-07-13): moved out of
   accountantWorkspace/accountantWorkspace.jsx (MENU_TALLY_RECON ▸ Vouchers ▸
   "Ledger Matcher (Day Book)").
   ════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from 'react';
import { AlertTriangle, CheckSquare, Plus, ReceiptText, Scale } from 'lucide-react';
import { bc } from '../../../core/styles';
import { confirmDialog } from '../../../core/ux/confirm';
import { matchVarianceSigned } from '../../../core/matchVariance';
import { usePager } from '../../../core/ux/pager';
import { useTrialBalance } from '../../../core/useAccounting';
import {
  useTallyBook, useTallyRows, useTallyRecoSummary, useImportTally, useTallyAutoMatch,
  useTallyManualMatch, useTallyGroupMatch, useTallyUnmatch, useSetTallyRecoStatus, useClearTally, useDeleteTallyLine,
} from '../../../core/useTallyReco';
import { parseTallyStatement } from '../../../core/tallyStatementParse';
import { C, card, money, brLabel, Shell, th, td, rnum, Table, aBtn, Tile, SecTitle, Row } from '../../accountantWorkspace/shared';
import { recoBadge } from '../../reconciliation/statement-matching/shared';
import { isViewOnly, VIEW_ONLY_REASON } from '../../../shell/primitives';

// Shared "Match / Action" cell for every Statement Matching tab (client/supplier/tally).
// Builds a match from ONE OR MORE book legs (N:1 split): pick legs from the dropdown,
// see the running sum tie out (or the residual), then Match. 1 leg → onManual, N → onGroup.
// A non-tying selection warns before saving a partial, so a split never silently looks done.
function ReconMatchCell({ line, book, cur, bookSign = 1, onManual, onGroup, onUnmatch, onDispute, onDelete }) {
  const [legs, setLegs] = useState([]);
  const vo = isViewOnly();
  if (line.status === 'reconciled' || line.status === 'partial') {
    return <td style={{ ...td, whiteSpace: 'nowrap' }}><button onClick={onUnmatch} disabled={vo} title={vo ? VIEW_ONLY_REASON : undefined} style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}`, ...(vo ? { background: '#cfd6e4', color: '#6b7280', cursor: 'not-allowed' } : {}) }}>Unmatch</button></td>;
  }
  const chosen = new Set(legs.map((l) => l.bookKey));
  const available = book.filter((b) => !chosen.has(b.bookKey));
  const amt = (b) => Math.abs((Number(b.debit) || 0) - (Number(b.credit) || 0)); // magnitude, for the running Σ display
  const sum = legs.reduce((t, b) => t + amt(b), 0);
  // Signed variance per this module's convention (bookSign): so wrong-DIRECTION legs
  // never read as a tie even when their magnitudes add up to the line.
  const variance = matchVarianceSigned(line, legs, bookSign);
  const tie = Math.abs(variance) <= 0.01;
  const addLeg = (bookKey) => { const b = book.find((x) => x.bookKey === bookKey); if (b) setLegs((p) => [...p, b]); };
  const commit = async () => {
    if (!legs.length) return;
    if (!tie) {
      const { confirmed } = await confirmDialog({
        title: 'Amounts don’t match — is this a split?',
        message: `The selected book ${legs.length > 1 ? 'entries' : 'entry'} and the statement line differ by ${money(cur, Math.abs(variance))}.\n\nA single line is often several book entries combined (a split). Add all the legs so they sum to the line, or match now as a PARTIAL.`,
        confirmLabel: 'Match as partial', cancelLabel: 'Cancel',
      });
      if (!confirmed) return;
    }
    if (legs.length === 1) onManual(legs[0]); else onGroup(legs);
    setLegs([]);
  };
  return (
    <td style={{ ...td, whiteSpace: 'nowrap' }}>
      {legs.length > 0 && (
        <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700, color: tie ? C.green : C.amber }}>
          {legs.length} leg{legs.length > 1 ? 's' : ''} · Σ {money(cur, sum)} {tie ? '· ties out ✓' : `· Δ ${money(cur, variance)}`}
          <button onClick={() => setLegs([])} title="Clear legs" style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}`, marginLeft: 6, padding: '1px 6px' }}>✕</button>
        </div>
      )}
      <select value="" onChange={(e) => e.target.value && addLeg(e.target.value)}
        style={{ padding: '4px 6px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, maxWidth: 200 }}>
        <option value="">{legs.length ? 'Add another leg…' : 'Match to book…'}</option>
        {available.map((b) => <option key={b.bookKey} value={b.bookKey}>{b.vno} · {b.date} · {money(cur, amt(b))}</option>)}
      </select>
      {legs.length > 0 && <button onClick={commit} disabled={vo} title={vo ? VIEW_ONLY_REASON : undefined} style={{ ...aBtn(C.green), marginLeft: 5, ...(vo ? { background: '#cfd6e4', color: '#6b7280', cursor: 'not-allowed' } : {}) }}>Match{legs.length > 1 ? ` ${legs.length}` : ''}</button>}
      <button onClick={onDispute} disabled={vo} title={vo ? VIEW_ONLY_REASON : undefined} style={{ ...aBtn(C.red), marginLeft: 5, ...(vo ? { background: '#cfd6e4', color: '#6b7280', cursor: 'not-allowed' } : {}) }}>Dispute</button>
      <button onClick={onDelete} disabled={vo} title={vo ? VIEW_ONLY_REASON : 'Delete this line'} style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}`, marginLeft: 5, ...(vo ? { background: '#cfd6e4', color: '#6b7280', cursor: 'not-allowed' } : {}) }}>✕</button>
    </td>
  );
}

export function TallyReco({ branch }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const tb = useTrialBalance(branch).data || {};
  const ledgers = useMemo(() => (tb.rows || []).map((r) => r.ledger).filter(Boolean), [tb]);
  const [ledger, setLedger] = useState('');
  const sel = ledger || ledgers[0] || '';

  const bookQ = useTallyBook(sel, branch);
  const tallyQ = useTallyRows(sel, branch);
  const sumQ = useTallyRecoSummary(sel, branch);
  const book = bookQ.data || { lines: [] };
  const rows = tallyQ.data || [];
  const rowsPager = usePager(rows); // page the Tally rows; count/totals read full `rows`
  const sum = sumQ.data || {};

  const imp = useImportTally();
  const auto = useTallyAutoMatch();
  const manual = useTallyManualMatch();
  const group = useTallyGroupMatch();
  const unmatch = useTallyUnmatch();
  const setStatus = useSetTallyRecoStatus();
  const del = useDeleteTallyLine();
  const clear = useClearTally();
  const vo = isViewOnly();

  const [paste, setPaste] = useState('');
  const parsed = useMemo(() => parseTallyStatement(paste), [paste]);
  const unreconciledBook = (book.lines || []).filter((l) => !l.reconciled);
  const diff = Number(sum.differenceAmount || 0);

  const doImport = () => { if (!sel || !parsed.length) return; imp.mutate({ ledger: sel, branch: branch?.code || branch, rows: parsed, fileName: 'pasted' }, { onSuccess: () => setPaste('') }); };

  return (
    <Shell title="Tally Reconciliation" sub={`${brLabel(branch)} · import a ledger's Tally export, then match it against the ERP books`}
      right={
        <>
          <select value={sel} onChange={(e) => setLedger(e.target.value)} style={{ padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12.5, minWidth: 220 }}>
            {!ledgers.length && <option value="">No ledgers</option>}
            {ledgers.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button disabled={!sel || auto.isPending || vo} title={vo ? VIEW_ONLY_REASON : undefined} onClick={() => auto.mutate({ ledger: sel, branch: branch?.code || branch })} style={{ ...aBtn(C.blue), opacity: !sel || auto.isPending ? 0.6 : 1, ...(vo ? { background: '#cfd6e4', color: '#6b7280', cursor: 'not-allowed' } : {}) }}>{auto.isPending ? 'Matching…' : 'Auto-match'}</button>
        </>
      }>
      {!sel ? (
        <div style={{ ...card, padding: 20, color: C.dim, fontSize: 13 }}>Select a ledger to reconcile against Tally.</div>
      ) : (
        <>
          <Row>
            <Tile icon={<Scale size={13} />} label="Per ERP Books" value={money(cur, sum.bookBalance)} sub="ledger closing" tone={C.dark} loading={sumQ.isLoading} />
            <Tile icon={<ReceiptText size={13} />} label="Per Tally" value={money(cur, sum.tallyBalance)} sub={sum.tallyBalanceDerived ? 'derived' : 'as imported'} tone={C.blue} loading={sumQ.isLoading} />
            <Tile icon={<AlertTriangle size={13} />} label="Difference" value={money(cur, Math.abs(diff))} sub={Math.abs(diff) <= 0.01 ? '✓ reconciled' : 'ERP vs Tally gap'} tone={Math.abs(diff) <= 0.01 ? C.green : C.red} loading={sumQ.isLoading} />
            <Tile icon={<CheckSquare size={13} />} label="Matched / Open" value={`${sum.counts?.tallyReconciled || 0} / ${sum.counts?.tallyUnreconciled || 0}`} sub={`${sum.counts?.tallyException || 0} exceptions`} tone={C.gold} loading={sumQ.isLoading} />
          </Row>

          <div style={{ ...card, padding: 12, marginBottom: 12 }}>
            <SecTitle>Import Tally export (paste CSV / Excel rows: date, voucher no, debit, credit, narration)</SecTitle>
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={3} placeholder={'2026-05-01, RCP-1, 1000, 0, deposit\n2026-05-04, PMT-1, 0, 300, cheque 5001'}
              style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${C.border}`, borderRadius: 6, padding: 8, fontSize: 12, fontFamily: 'monospace' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <button disabled={!parsed.length || imp.isPending || vo} title={vo ? VIEW_ONLY_REASON : undefined} onClick={doImport} style={{ ...aBtn(C.green), opacity: !parsed.length || imp.isPending ? 0.6 : 1, ...(vo ? { background: '#cfd6e4', color: '#6b7280', cursor: 'not-allowed' } : {}) }}><Plus size={12} /> {imp.isPending ? 'Importing…' : `Import ${parsed.length} row${parsed.length === 1 ? '' : 's'}`}</button>
              {rows.length > 0 && <button onClick={() => clear.mutate({ ledger: sel, branch })} disabled={vo} title={vo ? VIEW_ONLY_REASON : undefined} style={{ ...aBtn(C.red), background: '#fff', color: C.red, border: `1px solid ${C.red}`, ...(vo ? { background: '#cfd6e4', color: '#6b7280', cursor: 'not-allowed' } : {}) }}>Clear all imported</button>}
              <span style={{ fontSize: 11, color: C.dim }}>Duplicates and blank rows are skipped automatically.</span>
            </div>
          </div>

          <SecTitle>Tally rows ({rows.length}) — match each to an ERP posting</SecTitle>
          <Table pager={rowsPager}>
            <thead><tr>{['Date', 'Voucher', 'Narration', 'Debit', 'Credit', 'Status', 'Match / Action'].map((h, i) => <th key={h} style={{ ...th, ...(i >= 3 && i <= 4 ? rnum : {}) }}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>No Tally rows imported yet for {sel}.</td></tr>}
              {rowsPager.pageRows.map((t) => (
                <tr key={t.id} style={{ background: t.status === 'reconciled' ? '#f4fbf4' : t.status === 'exception' ? '#fdf4f4' : '#fff' }}>
                  <td style={td}>{t.date}</td>
                  <td style={{ ...td, fontWeight: 600, color: C.blue }}>{t.vno || t.reference || '—'}</td>
                  <td style={{ ...td, color: C.dim }}>{t.description || '—'}</td>
                  <td style={{ ...td, ...rnum }}>{t.debit ? money(cur, t.debit) : '—'}</td>
                  <td style={{ ...td, ...rnum }}>{t.credit ? money(cur, t.credit) : '—'}</td>
                  <td style={td}><span style={recoBadge(t.status)}>{t.status}{t.variance ? ` · Δ${money(cur, Math.abs(t.variance))}` : ''}</span>{t.matchedVno ? <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{t.matchedVno}</div> : null}</td>
                  <ReconMatchCell line={t} book={unreconciledBook} cur={cur}
                    onManual={(leg) => manual.mutate({ id: t.id, bookKey: leg.bookKey, vno: leg.vno, bookDebit: leg.debit, bookCredit: leg.credit })}
                    onGroup={(legs) => group.mutate({ id: t.id, books: legs.map((b) => ({ bookKey: b.bookKey, vno: b.vno, debit: b.debit, credit: b.credit })) })}
                    onUnmatch={() => unmatch.mutate({ id: t.id })}
                    onDispute={() => setStatus.mutate({ id: t.id, status: 'exception' })}
                    onDelete={() => del.mutate({ id: t.id })} />
                </tr>
              ))}
            </tbody>
          </Table>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
            A Tally <b>debit</b> matches an ERP book <b>debit</b> and a credit a credit (same ledger convention on both sides). Unmatched rows are the ERP↔Tally differences — usually an entry posted in one system but not the other.
          </div>
        </>
      )}
    </Shell>
  );
}
