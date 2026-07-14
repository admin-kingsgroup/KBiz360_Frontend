/* ════════════════════════════════════════════════════════════════════
   SUPPLIER RECONCILIATION  /accounts/supplier-reco
   Real statement reconciliation: import the vendor's statement of account,
   then match it line-by-line against OUR creditor ledger (the book). Mirrors
   Bank Reconciliation. Book side comes from the double-entry engine;
   statement side from the imported rows. Differences surface a missing
   bill / unposted payment.

   BUSINESS SUB-MODULE REORG (2026-07-13): moved out of
   accountantWorkspace/accountantWorkspace.jsx (MENU_RECONCILIATION ▸
   Statement Matching ▸ "Supplier Reconciliation").
   ════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from 'react';
import { AlertTriangle, CheckSquare, Plus, ReceiptText, Scale } from 'lucide-react';
import { bc } from '../../../core/styles';
import { useAgeing } from '../../../core/useAccounting';
import {
  useSupplierBook, useSupplierStatement, useSupplierReconSummary,
  useImportSupplierStatement, useSupplierAutoMatch, useSupplierManualMatch, useSupplierGroupMatch,
  useSupplierUnmatch, useSetSupplierReconStatus, useClearSupplierStatement,
  useDeleteSupplierStatementLine,
} from '../../../core/useSupplierReco';
import { parseSupplierStatement } from '../../../core/supplierStatementParse';
import { C, card, money, brLabel, Shell, aBtn, Tile, SecTitle, Row } from '../../accountantWorkspace/shared';
import { ReconMatcher } from './shared';

export function SupplierReco({ branch, setRoute }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const age = useAgeing(branch).data || {};
  const suppliers = useMemo(() => (age.payables?.rows || []).map((r) => r.party).filter(Boolean), [age]);
  const [supplier, setSupplier] = useState('');
  const sel = supplier || suppliers[0] || '';

  const bookQ = useSupplierBook(sel, branch);
  const stmtQ = useSupplierStatement(sel, branch);
  const sumQ = useSupplierReconSummary(sel, branch);
  const book = bookQ.data || { lines: [] };
  const stmt = stmtQ.data || [];
  const sum = sumQ.data || {};

  const imp = useImportSupplierStatement();
  const auto = useSupplierAutoMatch();
  const manual = useSupplierManualMatch();
  const group = useSupplierGroupMatch();
  const unmatch = useSupplierUnmatch();
  const setStatus = useSetSupplierReconStatus();
  const del = useDeleteSupplierStatementLine();
  const clear = useClearSupplierStatement();

  const [paste, setPaste] = useState('');
  const parsed = useMemo(() => parseSupplierStatement(paste), [paste]);

  const doImport = () => {
    if (!sel || !parsed.length) return;
    imp.mutate({ supplier: sel, branch: branch?.code || branch, rows: parsed, fileName: 'pasted' },
      { onSuccess: () => setPaste('') });
  };

  const diff = Number(sum.differenceAmount || 0);

  return (
    <Shell title="Supplier Reconciliation"
      sub={`${brLabel(branch)} · import the vendor statement, then match it against our ledger`}
      right={
        <>
          <select value={sel} onChange={(e) => setSupplier(e.target.value)}
            style={{ padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12.5, minWidth: 200 }}>
            {!suppliers.length && <option value="">No suppliers with open balances</option>}
            {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button disabled={!sel || auto.isPending} onClick={() => auto.mutate({ supplier: sel, branch: branch?.code || branch })}
            style={{ ...aBtn(C.blue), opacity: !sel || auto.isPending ? 0.6 : 1 }}>{auto.isPending ? 'Matching…' : 'Auto-match'}</button>
          {setRoute && <button onClick={() => setRoute('/payments')} style={aBtn(C.amber)}>Record Payment</button>}
        </>
      }>
      {!sel ? (
        <div style={{ ...card, padding: 20, color: C.dim, fontSize: 13 }}>Select a supplier to begin reconciling.</div>
      ) : (
        <>
          {/* Summary KPIs */}
          <Row>
            <Tile icon={<Scale size={13} />} label="Per Our Books" value={money(cur, sum.bookOwed)} sub="we owe (ledger)" tone={C.dark} loading={sumQ.isLoading} />
            <Tile icon={<ReceiptText size={13} />} label="Per Their Statement" value={money(cur, sum.statementOwed)} sub={sum.statementOwedDerived ? 'derived' : 'as stated'} tone={C.blue} loading={sumQ.isLoading} />
            <Tile icon={<AlertTriangle size={13} />} label="Difference" value={money(cur, Math.abs(diff))} sub={Math.abs(diff) <= 0.01 ? '✓ reconciled' : (diff < 0 ? 'books lower than statement' : 'books higher than statement')} tone={Math.abs(diff) <= 0.01 ? C.green : C.red} loading={sumQ.isLoading} />
            <Tile icon={<CheckSquare size={13} />} label="Matched / Open" value={`${sum.counts?.statementReconciled || 0} / ${sum.counts?.statementUnreconciled || 0}`} sub={`${sum.counts?.statementException || 0} disputed · ${sum.counts?.statementPartial || 0} partial`} tone={C.gold} loading={sumQ.isLoading} />
          </Row>

          {/* Import box */}
          <div style={{ ...card, padding: 12, marginBottom: 12 }}>
            <SecTitle>Import vendor statement (paste CSV / Excel rows: date, invoiceNo, debit, credit, description)</SecTitle>
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={3} placeholder={'2026-05-01, INV-77, 1000, 0, May airfare\n2026-05-10, , 0, 400, payment recd'}
              style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${C.border}`, borderRadius: 6, padding: 8, fontSize: 12, fontFamily: 'monospace' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <button disabled={!parsed.length || imp.isPending} onClick={doImport}
                style={{ ...aBtn(C.green), opacity: !parsed.length || imp.isPending ? 0.6 : 1 }}>
                <Plus size={12} /> {imp.isPending ? 'Importing…' : `Import ${parsed.length} row${parsed.length === 1 ? '' : 's'}`}</button>
              {stmt.length > 0 && <button onClick={() => clear.mutate({ supplier: sel })} style={{ ...aBtn(C.red), background: '#fff', color: C.red, border: `1px solid ${C.red}` }}>Clear all imported</button>}
              <span style={{ fontSize: 11, color: C.dim }}>Duplicates and blank rows are skipped automatically.</span>
            </div>
          </div>

          {/* Side-by-side matcher — our creditor ledger vs their statement */}
          <ReconMatcher
            cur={cur} book={book.lines || []} stmt={stmt} bookSign={-1}
            statementTitle="Their Statement (vendor SOA)"
            busy={manual.isPending || group.isPending}
            onMatch={(s, leg) => manual.mutate({ id: s.id, bookKey: leg.bookKey, vno: leg.vno, bookDebit: leg.debit, bookCredit: leg.credit })}
            onGroup={(s, legs) => group.mutate({ id: s.id, books: legs.map((b) => ({ bookKey: b.bookKey, vno: b.vno, debit: b.debit, credit: b.credit })) })}
            onUnmatch={(s) => unmatch.mutate({ id: s.id })}
            onDispute={(s) => setStatus.mutate({ id: s.id, status: 'exception' })}
            onClearException={(s) => setStatus.mutate({ id: s.id, status: 'unreconciled' })}
            onDelete={(s) => del.mutate({ id: s.id })}
            matchHint={<>A statement <b>debit</b> (they billed us) matches a book <b>credit</b> (a bill we posted); a statement <b>credit</b> (our payment) matches a book <b>debit</b>. Unmatched items on either side are the reconciling differences — usually a missing bill, an unposted payment, or an ADM/ACM not captured.</>}
          />
        </>
      )}
    </Shell>
  );
}
