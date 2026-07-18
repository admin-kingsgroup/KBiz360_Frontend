/* ════════════════════════════════════════════════════════════════════
   STATEMENT MATCHING — SHARED RECONCILIATION UI
   Extracted from accountantWorkspace/accountantWorkspace.jsx (business
   sub-module reorg, 2026-07-13): the status badge helpers and the shared
   two-pane matcher used by Supplier / Client / Inter-Branch reconciliation
   (matching MENU_RECONCILIATION ▸ Statement Matching).
   ════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from 'react';
import { confirmDialog } from '../../../core/ux/confirm';
import { matchVarianceSigned } from '../../../core/matchVariance';
import { usePager } from '../../../core/ux/pager';
import { useMobile } from '../../../core/hooks';
import { clickable } from '../../../core/ux/clickable';
import { C, card, money, th, td, rnum, Table, aBtn, SecTitle } from '../../accountantWorkspace/shared';
import { isViewOnly, VIEW_ONLY_REASON } from '../../../core/api';

export const STATUS_TONE = { reconciled: C.green, partial: C.gold, exception: C.red, unreconciled: C.dim };
export const recoBadge = (s) => ({ padding: '2px 7px', borderRadius: 10, fontSize: 10, fontWeight: 800, color: '#fff', background: STATUS_TONE[s] || C.dim, textTransform: 'capitalize' });

export const WB_TONE = { reconciled: C.green, differences: C.red, 'not-started': C.dim };
export const wbBadge = (s) => ({ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 800, color: '#fff', background: WB_TONE[s] || C.dim, textTransform: 'capitalize', whiteSpace: 'nowrap' });

export function downloadCSV(filename, rows) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Shared two-pane reconciliation matcher (Supplier + Client) ────────────────
// The side-by-side matcher used by Supplier and Client reconciliation, mirroring
// the Bank Reconciliation layout so all three screens read the same way: OUR Book
// Entries on the LEFT, THEIR Statement on the RIGHT, both visible at once for easy
// side-by-side comparison. Select one or more book legs + one statement line, watch
// the running variance tie out (a wrong-direction or short leg never reads as a
// tie), then Match. `bookSign` follows each module's convention: −1 for a creditor/
// supplier (their debit = our credit), +1 for a debtor/client (same direction).
export function ReconMatcher({ cur, book, stmt, bookSign, statementTitle, matchHint,
  onMatch, onGroup, onUnmatch, onDispute, onClearException, onDelete, busy }) {
  const mob = useMobile();
  const vo = isViewOnly();   // view-only user: write actions disabled with a reason
  const [selBooks, setSelBooks] = useState([]);   // book legs → one line (N:1 split)
  const [selStmt, setSelStmt] = useState(null);   // one statement line
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();

  const bookRows = useMemo(() => (book || []).filter((l) =>
    !q || `${l.date} ${l.vno} ${l.narration} ${l.party}`.toLowerCase().includes(q)), [book, q]);
  const stmtRows = useMemo(() => (stmt || []).filter((l) =>
    !q || `${l.date} ${l.invoiceNo || ''} ${l.reference || ''} ${l.description || ''}`.toLowerCase().includes(q)), [stmt, q]);
  const bookPager = usePager(bookRows);
  const stmtPager = usePager(stmtRows);

  const toggleBook = (l) => setSelBooks((p) => p.some((x) => x.bookKey === l.bookKey)
    ? p.filter((x) => x.bookKey !== l.bookKey)
    : [...p, { bookKey: l.bookKey, vno: l.vno, debit: l.debit, credit: l.credit }]);
  const clearSel = () => { setSelBooks([]); setSelStmt(null); };

  const mag = (x) => Math.abs((Number(x.debit) || 0) - (Number(x.credit) || 0));
  const bookMag = selBooks.reduce((t, b) => t + mag(b), 0);
  const variance = selStmt ? matchVarianceSigned(selStmt, selBooks, bookSign) : 0;
  const tie = Math.abs(variance) <= 0.01;
  const canMatch = selBooks.length > 0 && !!selStmt && !busy;

  const commit = async () => {
    if (!selBooks.length || !selStmt) return;
    // Guardrail: a match that doesn't tie is usually a SPLIT (one line = several book
    // entries). Warn before saving a partial — otherwise add the remaining legs.
    if (!tie) {
      const { confirmed } = await confirmDialog({
        title: 'Amounts don’t match — is this a split?',
        message: `The selected book ${selBooks.length > 1 ? 'entries' : 'entry'} and the statement line differ by ${money(cur, Math.abs(variance))}.\n\nA single line is often several book entries combined (a split). Add all the legs so they sum to the line, or match now as a PARTIAL.`,
        confirmLabel: 'Match as partial', cancelLabel: 'Cancel',
      });
      if (!confirmed) return;
    }
    if (selBooks.length === 1) onMatch(selStmt, selBooks[0]); else onGroup(selStmt, selBooks);
    clearSel();
  };

  const bookBg = (l, sel) => (sel ? '#fff7e0' : l.reconciled ? '#f4fbf4' : '#fff');
  const stmtBg = (l, sel) => (sel ? '#fff7e0'
    : l.status === 'reconciled' ? '#f4fbf4'
    : l.status === 'partial' ? '#eef4ff'
    : l.status === 'exception' ? '#fdf4f4' : '#fff');

  return (
    <>
      {/* Toolbar — one search filters BOTH panes, like Bank Reco */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, margin: '0 2px 10px' }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search date / ref / narration…"
          style={{ padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12.5, minWidth: 240 }} />
        <span style={{ fontSize: 11, color: C.dim }}>Select book entr{selBooks.length === 1 ? 'y' : 'ies'} + one statement line, then Match. Several legs that sum to one line = a split.</span>
      </div>

      {/* Manual-match action bar */}
      {(selBooks.length > 0 || selStmt) && (
        <div style={{ ...card, padding: '8px 12px', marginBottom: 10, background: '#eef4ff', border: '1px solid #b9d0f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 12, color: C.blue }}>
            <b>Manual match —</b> Book: {selBooks.length > 0 ? `${selBooks.length} ${selBooks.length > 1 ? 'entries' : 'entry'} (Σ ${money(cur, bookMag)})` : <i>select one or more book entries</i>} ↔ Statement: {selStmt ? `${selStmt.date} (${money(cur, mag(selStmt))})` : <i>select a statement line</i>}
            {selBooks.length > 1 && <span style={{ fontWeight: 700 }}> · {selBooks.length}-way split</span>}
            {canMatch && (tie
              ? <span style={{ color: C.green, fontWeight: 700 }}> · ties out ✓</span>
              : <span style={{ color: C.red, fontWeight: 700 }}> · Δ {money(cur, Math.abs(variance))} → Partial</span>)}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={commit} disabled={!canMatch || vo} title={vo ? VIEW_ONLY_REASON : undefined} style={{ ...aBtn(C.green), opacity: (canMatch && !vo) ? 1 : 0.5, ...(vo ? { cursor: 'not-allowed' } : {}) }}>Match{selBooks.length > 1 ? ` ${selBooks.length}` : ''}</button>
            <button onClick={clearSel} style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}` }}>Clear</button>
          </div>
        </div>
      )}

      {/* Two panes: OUR books (left) | THEIR statement (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 12 }}>
        {/* Book side */}
        <div>
          <SecTitle>Our Book Entries (ledger) · {bookRows.length}</SecTitle>
          <Table pager={bookPager}>
            <thead><tr>
              {['Date', 'Voucher', 'Narration', 'Debit', 'Credit', 'Status'].map((h, i) =>
                <th key={h} style={{ ...th, ...(i >= 3 && i <= 4 ? rnum : {}) }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {bookRows.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>No book entries in our ledger for this period.</td></tr>}
              {bookPager.pageRows.map((l) => {
                const sel = selBooks.some((b) => b.bookKey === l.bookKey);
                return (
                  <tr key={l.bookKey} {...(!l.reconciled ? clickable(() => toggleBook(l)) : {})}
                    style={{ cursor: l.reconciled ? 'default' : 'pointer', background: bookBg(l, sel) }}>
                    <td style={td}>{l.date}</td>
                    <td style={{ ...td, fontWeight: 600, color: C.blue }}>{l.vno}</td>
                    <td style={{ ...td, color: C.dim, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.narration || l.party}>{l.narration || l.party || '—'}</td>
                    <td style={{ ...td, ...rnum }}>{l.debit ? money(cur, l.debit) : '—'}</td>
                    <td style={{ ...td, ...rnum }}>{l.credit ? money(cur, l.credit) : '—'}</td>
                    <td style={td}><span style={recoBadge(l.reconciled ? l.status : 'unreconciled')}>{l.reconciled ? l.status : 'open'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>

        {/* Statement side */}
        <div>
          <SecTitle>{statementTitle} · {stmtRows.length}</SecTitle>
          <Table pager={stmtPager}>
            <thead><tr>
              {['Date', 'Invoice / Ref', 'Description', 'Debit', 'Credit', 'Status', ''].map((h, i) =>
                <th key={h || 'act'} style={{ ...th, ...(i >= 3 && i <= 4 ? rnum : {}) }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {stmtRows.length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>No statement imported yet.</td></tr>}
              {stmtPager.pageRows.map((s) => {
                const sel = selStmt?.id === s.id;
                const open = s.status === 'unreconciled' || s.status === 'exception';
                return (
                  <tr key={s.id} {...(open ? clickable(() => setSelStmt(sel ? null : s)) : {})}
                    style={{ cursor: open ? 'pointer' : 'default', background: stmtBg(s, sel) }}>
                    <td style={td}>{s.date}</td>
                    <td style={{ ...td, fontWeight: 600, color: C.blue }}>{s.invoiceNo || s.reference || '—'}</td>
                    <td style={{ ...td, color: C.dim, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.description}>{s.description || '—'}</td>
                    <td style={{ ...td, ...rnum }}>{s.debit ? money(cur, s.debit) : '—'}</td>
                    <td style={{ ...td, ...rnum }}>{s.credit ? money(cur, s.credit) : '—'}</td>
                    <td style={td}><span style={recoBadge(s.status)}>{s.status}{s.variance ? ` · Δ${money(cur, Math.abs(s.variance))}` : ''}</span>{s.matchedVno ? <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{s.matchedVno}</div> : null}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {(s.status === 'reconciled' || s.status === 'partial')
                        ? <button onClick={(e) => { e.stopPropagation(); onUnmatch(s); }} disabled={vo} title={vo ? VIEW_ONLY_REASON : undefined} style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}`, ...(vo ? { cursor: 'not-allowed', opacity: 0.5 } : {}) }}>Unmatch</button>
                        : (<>
                            {s.status === 'exception'
                              ? <button onClick={(e) => { e.stopPropagation(); onClearException(s); }} disabled={vo} title={vo ? VIEW_ONLY_REASON : 'Clear dispute'} style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}`, ...(vo ? { cursor: 'not-allowed', opacity: 0.5 } : {}) }}>↺</button>
                              : <button onClick={(e) => { e.stopPropagation(); onDispute(s); }} disabled={vo} title={vo ? VIEW_ONLY_REASON : undefined} style={{ ...aBtn(C.red), ...(vo ? { cursor: 'not-allowed', opacity: 0.5 } : {}) }}>Dispute</button>}
                            <button onClick={(e) => { e.stopPropagation(); onDelete(s); }} disabled={vo} title={vo ? VIEW_ONLY_REASON : 'Delete this line'} style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}`, marginLeft: 5, ...(vo ? { cursor: 'not-allowed', opacity: 0.5 } : {}) }}>✕</button>
                          </>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </div>
      {matchHint && <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>{matchHint}</div>}
    </>
  );
}
