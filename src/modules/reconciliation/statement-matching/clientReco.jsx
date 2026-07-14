/* ════════════════════════════════════════════════════════════════════
   CLIENT RECONCILIATION  /accounts/client-reco
   Receivable-side reconciliation, the mirror of Supplier Reco. Two levels:
     • Workbench — a grid of every client (debtor) ledger with its recon status.
     • Drill-in  — one client, with BOTH internal allocation (FIFO receipts↔
       invoices, no statement needed) AND external statement matching.

   BUSINESS SUB-MODULE REORG (2026-07-13): moved out of
   accountantWorkspace/accountantWorkspace.jsx (MENU_RECONCILIATION ▸
   Statement Matching ▸ "Client Reconciliation").
   ════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Coins, ListChecks, Plus, ReceiptText, Scale } from 'lucide-react';
import { bc } from '../../../core/styles';
import { usePager } from '../../../core/ux/pager';
import {
  useClientList, useClientBook, useClientStatement, useClientAllocation, useClientReconSummary,
  useImportClientStatement, useClientAutoMatch, useClientAutoMatchAll, useClientManualMatch, useClientGroupMatch,
  useClientUnmatch, useSetClientReconStatus, useClearClientStatement, useDeleteClientStatementLine,
} from '../../../core/useClientReco';
import { parseClientStatement } from '../../../core/clientStatementParse';
import { C, card, money, brLabel, Shell, th, td, rnum, Table, aBtn, Tile, SecTitle, Row } from '../../accountantWorkspace/shared';
import { ReconMatcher, wbBadge, downloadCSV } from './shared';

export function ClientReco({ branch, setRoute }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const [client, setClient] = useState('');           // '' = workbench view
  const [tab, setTab] = useState('statement');        // 'statement' | 'internal'
  const [q, setQ] = useState('');
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [paste, setPaste] = useState('');

  const listQ = useClientList(branch);
  const list = listQ.data || { rows: [], totals: {} };

  const bookQ = useClientBook(client, branch);
  const stmtQ = useClientStatement(client, branch);
  const sumQ = useClientReconSummary(client, branch);
  const allocQ = useClientAllocation(client, branch);
  const book = bookQ.data || { lines: [] };
  const stmt = stmtQ.data || [];
  const sum = sumQ.data || {};
  const alloc = allocQ.data || { invoices: [], receipts: [], openInvoices: [], unappliedReceipts: [], totals: {} };

  const imp = useImportClientStatement();
  const auto = useClientAutoMatch();
  const autoAll = useClientAutoMatchAll();
  const manual = useClientManualMatch();
  const group = useClientGroupMatch();
  const unmatch = useClientUnmatch();
  const setStatus = useSetClientReconStatus();
  const del = useDeleteClientStatementLine();
  const clear = useClearClientStatement();

  const parsed = useMemo(() => parseClientStatement(paste), [paste]);

  const filtered = useMemo(() => (list.rows || []).filter((r) =>
    (!q || r.client.toLowerCase().includes(q.toLowerCase())) &&
    (!onlyDiff || r.status === 'differences')), [list.rows, q, onlyDiff]);
  // Page the long workbench list; KPI totals/badges and the empty-states read the full set.
  const wbPager = usePager(filtered);   // workbench: every client ledger

  const doImport = () => {
    if (!client || !parsed.length) return;
    imp.mutate({ client, branch: branch?.code || branch, rows: parsed, fileName: 'pasted' }, { onSuccess: () => setPaste('') });
  };
  const exportStatement = () => downloadCSV(`client-reco-${client}.csv`,
    stmt.map((s) => ({ date: s.date, invoice: s.invoiceNo || s.reference, description: s.description, debit: s.debit, credit: s.credit, status: s.status, matchedVoucher: s.matchedVno, variance: s.variance })));

  // ── Level 1: Workbench grid ──────────────────────────────────────────────
  if (!client) {
    return (
      <Shell title="Client Reconciliation" sub={`${brLabel(branch)} · pick a client to reconcile — or scan every account's status below`}
        right={
          <>
            <button disabled={autoAll.isPending} onClick={() => autoAll.mutate({ branch: branch?.code || branch })}
              style={{ ...aBtn(C.blue), opacity: autoAll.isPending ? 0.6 : 1 }} title="Auto-match every client with open lines">
              {autoAll.isPending ? 'Matching all…' : 'Auto-match all'}</button>
            <div style={{ ...card, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: C.dark }}>{list.totals?.clients || 0} clients · {money(cur, list.totals?.bookOwed)} receivable</div>
          </>
        }>
        <Row>
          <Tile icon={<CheckCircle2 size={13} />} label="Reconciled" value={list.totals?.reconciled || 0} sub="fully matched" tone={C.green} loading={listQ.isLoading} />
          <Tile icon={<AlertTriangle size={13} />} label="With Differences" value={list.totals?.differences || 0} sub="need attention" tone={C.red} loading={listQ.isLoading} />
          <Tile icon={<ListChecks size={13} />} label="Not Started" value={list.totals?.notStarted || 0} sub="no statement yet" tone={C.dim} loading={listQ.isLoading} />
          <Tile icon={<Scale size={13} />} label="Total Receivable" value={money(cur, list.totals?.bookOwed)} sub="per our books" tone={C.dark} loading={listQ.isLoading} />
        </Row>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 2px 10px' }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client…"
            style={{ padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12.5, minWidth: 220 }} />
          <label style={{ fontSize: 12, color: C.dim, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} /> Only show differences
          </label>
        </div>
        <Table pager={wbPager}>
          <thead><tr>
            {['Client', 'Per Our Books', 'Per Statement', 'Difference', 'Matched / Open', 'Last Reconciled', 'Status', ''].map((h, i) =>
              <th key={h} style={{ ...th, ...(i >= 1 && i <= 3 ? rnum : {}) }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {listQ.isLoading && <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>Loading…</td></tr>}
            {!listQ.isLoading && filtered.length === 0 && <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>No client ledgers found for {brLabel(branch)}.</td></tr>}
            {wbPager.pageRows.map((r) => (
              <tr key={r.client} style={{ background: r.status === 'reconciled' ? '#f4fbf4' : r.status === 'differences' ? '#fdf6f4' : '#fff' }}>
                <td style={{ ...td, fontWeight: 700, color: C.dark }}>{r.client}</td>
                <td style={{ ...td, ...rnum }}>{money(cur, r.bookOwed)}</td>
                <td style={{ ...td, ...rnum }}>{r.statementOwed == null ? '—' : money(cur, r.statementOwed)}</td>
                <td style={{ ...td, ...rnum, color: Math.abs(r.difference || 0) > 0.01 ? C.red : C.dim }}>{r.difference == null ? '—' : money(cur, Math.abs(r.difference))}</td>
                <td style={{ ...td, ...rnum }}>{r.counts.reconciled} / {r.counts.open + r.counts.exception}</td>
                <td style={{ ...td, color: C.dim }}>{r.lastReconciledAt ? String(r.lastReconciledAt).slice(0, 10) : '—'}</td>
                <td style={td}><span style={wbBadge(r.status)}>{r.status === 'not-started' ? 'not started' : r.status}</span></td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <button onClick={() => { setClient(r.client); setTab('statement'); }} style={aBtn(C.blue)}>Reconcile <ArrowRight size={11} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Shell>
    );
  }

  // ── Level 2: Drill-in for one client ─────────────────────────────────────
  const diff = Number(sum.differenceAmount || 0);
  return (
    <Shell title={`Client Reconciliation · ${client}`}
      sub={`${brLabel(branch)} · internal receipts↔invoices and external statement matching`}
      right={
        <>
          <button onClick={() => setClient('')} style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}` }}>← All clients</button>
          {tab === 'statement' && <button disabled={auto.isPending} onClick={() => auto.mutate({ client, branch: branch?.code || branch })} style={{ ...aBtn(C.blue), opacity: auto.isPending ? 0.6 : 1 }}>{auto.isPending ? 'Matching…' : 'Auto-match'}</button>}
          {tab === 'statement' && stmt.length > 0 && <button onClick={exportStatement} style={aBtn(C.dark)}>Export CSV</button>}
          {setRoute && <button onClick={() => setRoute('/receipts')} style={aBtn(C.amber)}>Record Receipt</button>}
        </>
      }>
      {/* Summary KPIs */}
      <Row>
        <Tile icon={<Scale size={13} />} label="Per Our Books" value={money(cur, sum.bookOwed)} sub="they owe us (ledger)" tone={C.dark} loading={sumQ.isLoading} />
        <Tile icon={<ReceiptText size={13} />} label="Per Their Statement" value={money(cur, sum.statementOwed)} sub={sum.statementOwedDerived ? 'derived' : 'as stated'} tone={C.blue} loading={sumQ.isLoading} />
        <Tile icon={<AlertTriangle size={13} />} label="Difference" value={money(cur, Math.abs(diff))} sub={Math.abs(diff) <= 0.01 ? '✓ reconciled' : (diff > 0 ? 'books higher than statement' : 'books lower than statement')} tone={Math.abs(diff) <= 0.01 ? C.green : C.red} loading={sumQ.isLoading} />
        <Tile icon={<Coins size={13} />} label="Open / Unapplied" value={`${alloc.totals?.openInvoiceCount || 0} / ${alloc.totals?.unappliedReceiptCount || 0}`} sub="open invoices · unapplied receipts" tone={C.gold} loading={allocQ.isLoading} />
      </Row>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, margin: '0 2px 12px' }}>
        {[['statement', '📑 Statement matching'], ['internal', '🔁 Internal (receipts↔invoices)']].map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, borderRadius: 6, cursor: 'pointer', border: `1px solid ${tab === k ? C.blue : C.border}`, background: tab === k ? C.blue : '#fff', color: tab === k ? '#fff' : C.dim }}>{lbl}</button>
        ))}
      </div>

      {tab === 'statement' ? (
        <>
          <div style={{ ...card, padding: 12, marginBottom: 12 }}>
            <SecTitle>Import client statement (paste CSV / Excel rows: date, invoiceNo, debit, credit, description)</SecTitle>
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={3} placeholder={'2026-05-01, INV-77, 1000, 0, May tour invoice\n2026-05-10, , 0, 400, payment received'}
              style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${C.border}`, borderRadius: 6, padding: 8, fontSize: 12, fontFamily: 'monospace' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <button disabled={!parsed.length || imp.isPending} onClick={doImport} style={{ ...aBtn(C.green), opacity: !parsed.length || imp.isPending ? 0.6 : 1 }}>
                <Plus size={12} /> {imp.isPending ? 'Importing…' : `Import ${parsed.length} row${parsed.length === 1 ? '' : 's'}`}</button>
              {stmt.length > 0 && <button onClick={() => clear.mutate({ client, branch })} style={{ ...aBtn(C.red), background: '#fff', color: C.red, border: `1px solid ${C.red}` }}>Clear all imported</button>}
              <span style={{ fontSize: 11, color: C.dim }}>Duplicates and blank rows are skipped automatically.</span>
            </div>
          </div>

          {/* Side-by-side matcher — our debtor ledger vs their statement */}
          <ReconMatcher
            cur={cur} book={book.lines || []} stmt={stmt} bookSign={1}
            statementTitle="Their Statement (client SOA)"
            busy={manual.isPending || group.isPending}
            onMatch={(s, leg) => manual.mutate({ id: s.id, bookKey: leg.bookKey, vno: leg.vno, bookDebit: leg.debit, bookCredit: leg.credit })}
            onGroup={(s, legs) => group.mutate({ id: s.id, books: legs.map((b) => ({ bookKey: b.bookKey, vno: b.vno, debit: b.debit, credit: b.credit })) })}
            onUnmatch={(s) => unmatch.mutate({ id: s.id })}
            onDispute={(s) => setStatus.mutate({ id: s.id, status: 'exception' })}
            onClearException={(s) => setStatus.mutate({ id: s.id, status: 'unreconciled' })}
            onDelete={(s) => del.mutate({ id: s.id })}
            matchHint={<>A statement <b>debit</b> (an invoice) matches a book <b>debit</b> (a sale); a statement <b>credit</b> (their payment) matches a book <b>credit</b> (a receipt) — same direction, since a client is a debtor. Unmatched items are the reconciling differences.</>}
          />
        </>
      ) : (
        <>
          <SecTitle>Open invoices ({alloc.openInvoices?.length || 0}) — receipts auto-applied oldest-first (FIFO)</SecTitle>
          <Table>
            <thead><tr>{['Date', 'Voucher', 'Narration', 'Invoice', 'Received', 'Outstanding'].map((h, i) =>
              <th key={h} style={{ ...th, ...(i >= 3 ? rnum : {}) }}>{h}</th>)}</tr></thead>
            <tbody>
              {(alloc.invoices || []).length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>No invoices in this period for {client}.</td></tr>}
              {(alloc.invoices || []).map((i, idx) => (
                <tr key={idx} style={{ background: i.settled ? '#f4fbf4' : '#fff' }}>
                  <td style={td}>{i.date}</td>
                  <td style={{ ...td, fontWeight: 600, color: C.blue }}>{i.vno}</td>
                  <td style={{ ...td, color: C.dim }}>{i.narration || '—'}</td>
                  <td style={{ ...td, ...rnum }}>{money(cur, i.amount)}</td>
                  <td style={{ ...td, ...rnum }}>{money(cur, i.allocated)}</td>
                  <td style={{ ...td, ...rnum, fontWeight: 700, color: i.settled ? C.green : C.red }}>{i.settled ? '✓ settled' : money(cur, i.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div style={{ height: 12 }} />
          <SecTitle>Unapplied receipts ({alloc.unappliedReceipts?.length || 0}) — money on account, not yet against an invoice</SecTitle>
          <Table>
            <thead><tr>{['Date', 'Voucher', 'Narration', 'Receipt', 'Applied', 'Unapplied'].map((h, i) =>
              <th key={h} style={{ ...th, ...(i >= 3 ? rnum : {}) }}>{h}</th>)}</tr></thead>
            <tbody>
              {(alloc.unappliedReceipts || []).length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.green, padding: 20 }}>✓ Every receipt is fully applied to invoices.</td></tr>}
              {(alloc.unappliedReceipts || []).map((r, idx) => (
                <tr key={idx}>
                  <td style={td}>{r.date}</td>
                  <td style={{ ...td, fontWeight: 600, color: C.blue }}>{r.vno}</td>
                  <td style={{ ...td, color: C.dim }}>{r.narration || '—'}</td>
                  <td style={{ ...td, ...rnum }}>{money(cur, r.amount)}</td>
                  <td style={{ ...td, ...rnum }}>{money(cur, r.applied)}</td>
                  <td style={{ ...td, ...rnum, fontWeight: 700, color: C.gold }}>{money(cur, r.unapplied)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
            Internal reconciliation needs no external file — it matches the client's own receipts against their open invoices to show what's still <b>outstanding</b> and any receipt money sitting <b>unapplied</b> (on account). Total outstanding {money(cur, alloc.totals?.totalOutstanding)} · unapplied {money(cur, alloc.totals?.totalUnapplied)}.
          </div>
        </>
      )}
    </Shell>
  );
}
