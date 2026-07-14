/* ════════════════════════════════════════════════════════════════
   CASH BOOK  /finance/cash-book
   ════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useChartOfAccounts, useLedgerStatement } from '../../../core/useAccounting';
import { localeOf } from '../../../core/format';
import { exportToExcel } from '../../../core/exportExcel';
import { contraLedgerName, lineNarration } from '../../../core/cashBookRows';
import { clickable } from '../../../core/ux/clickable';
import { card, inp } from '../../../core/styles';
import { VoucherEditor } from '../../accountingLive';
import {
  DARK, GOLD, DIM, BLUE, RED, GREEN, curOf, money, branchLabel, Page, Banner, State, ExportBtn,
  PrintBtn, Table, Th, headRow, rowBg, num, ModeToggle, RangeBar, SearchInput, Pagination, nfmt,
  openReportPrint, todayISO, parseAnyDate, dateInRange, Crumb,
} from '../../accountingLive/shared';

// Cash ledger picker — a small custom dropdown (not the generic StatusMenu) so it
// can show "no cash ledger" placeholder text and disable itself when empty.
function LedgerSelectMenu({ value, options, onChange, placeholder = 'No cash ledger', width = 200 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div ref={ref} className="max-tablet:w-full" style={{ position: 'relative', display: 'inline-block', gap: '10px'}}>
      <button type="button" onClick={() => options.length > 0 && setOpen((o) => !o)}
        className="max-tablet:min-h-[44px] max-tablet:w-full"
        style={{ ...inp, width, minHeight: 32, fontSize: 11, cursor: options.length ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || placeholder}</span>
        <span style={{ fontSize: 13, lineHeight: 1, color: DIM, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
      </button>
      {open && options.length > 0 && (
        <div role="menu" style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50, minWidth: '100%', maxHeight: 260, overflowY: 'auto',
          background: '#fff', borderRadius: 12, border: '1px solid #cdd1d8', boxShadow: '0 10px 28px rgba(13,19,38,0.16)', padding: 5,
        }}>
          {options.map((o) => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                padding: '7px 9px', borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: o === value ? '#e8f0ff' : 'transparent',
                fontSize: 11.5, fontWeight: o === value ? 700 : 500, color: DARK,
              }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{o}</span>
              {o === value && <span style={{ color: BLUE, fontWeight: 800 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Voucher category → colour tag for the Type chip (detailed view).
const TYPE_CLR = { sale: BLUE, purchase: '#d97706', receipt: GREEN, payment: RED, journal: '#2e323c', contra: '#6b21a8', 'debit-note': '#d97706' };

export function CashBookLive({ branch }) {
  const cur = curOf(branch);
  const [from, setFrom] = useState(todayISO);
  const [to, setTo] = useState(todayISO);
  const [view, setView] = useState('detailed'); // detailed | minimal
  const [expandAll, setExpandAll] = useState(false); // show narration under each ledger name
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(1000); // show the whole ledger by default; pager still kicks in past 1000
  const [ledger, setLedger] = useState('');
  const [voucher, setVoucher] = useState(null); // { id, vno } — drill-down to the voucher

  const chart = useChartOfAccounts(branch);
  const cashLedgers = useMemo(() => (chart.data || []).filter((l) => /cash/i.test(l.group || '')).sort((a, b) => a.name.localeCompare(b.name)), [chart.data]);
  const selected = ledger || cashLedgers[0]?.name || '';
  // Full history (no date filter) → period opening is computed exactly client-side.
  const q = useLedgerStatement(selected, branch);
  const d = q.data;

  const signedOpen = (v) => (v.openingSide === 'Cr' ? -1 : 1) * (v.openingBalance || 0);
  const masterOpen = d ? signedOpen(d) : 0;
  const allLines = d?.lines || [];
  // Period opening = master opening + movement strictly before `from`.
  const periodOpen = useMemo(() => {
    if (!from) return masterOpen;
    const f = parseAnyDate(from);
    let bal = masterOpen;
    for (const ln of allLines) { const dt = parseAnyDate(ln.date); if (dt && f && dt < f) bal += (ln.debit || 0) - (ln.credit || 0); }
    return Math.round(bal * 100) / 100;
  }, [allLines, masterOpen, from]);

  // In-range lines with a running balance carried from the period opening.
  // "Particulars" is the contra ledger NAME; the narration shows under it on Expand all.
  const rowsFull = useMemo(() => {
    let run = periodOpen;
    return allLines.filter((ln) => dateInRange(ln.date, from, to)).map((ln) => {
      run = Math.round((run + (ln.debit || 0) - (ln.credit || 0)) * 100) / 100;
      const ledgerName = contraLedgerName(ln);
      return { date: ln.date, vno: ln.vno, category: ln.category, voucherId: ln.voucherId, debit: ln.debit || 0, credit: ln.credit || 0, ledgerName, narration: lineNarration(ln), particulars: ledgerName, running: run };
    });
  }, [allLines, periodOpen, from, to]);

  const receipts = Math.round(rowsFull.reduce((s, r) => s + r.debit, 0));
  const payments = Math.round(rowsFull.reduce((s, r) => s + r.credit, 0));
  const closing = Math.round(periodOpen + receipts - payments);

  const term = search.trim().toLowerCase();
  const rowsShown = useMemo(() => (term ? rowsFull.filter((r) => `${r.vno} ${r.ledgerName} ${r.narration} ${r.category}`.toLowerCase().includes(term)) : rowsFull), [rowsFull, term]);
  const pageRows = useMemo(() => rowsShown.slice(page * pageSize, page * pageSize + pageSize), [rowsShown, page, pageSize]);

  const expColumns = view === 'minimal'
    ? [{ key: 'date', label: 'Date' }, { key: 'vno', label: 'Voucher No' }, { key: 'ledgerName', label: 'Ledger Name' }, { key: 'narration', label: 'Narration' }, { key: 'debit', label: `Receipt (${cur})`, num: true }, { key: 'credit', label: `Payment (${cur})`, num: true }]
    : [{ key: 'date', label: 'Date' }, { key: 'vno', label: 'Voucher No' }, { key: 'category', label: 'Type' }, { key: 'ledgerName', label: 'Ledger Name' }, { key: 'narration', label: 'Narration' }, { key: 'debit', label: `Receipt (${cur})`, num: true }, { key: 'credit', label: `Payment (${cur})`, num: true }, { key: 'running', label: `Balance (${cur})`, num: true }];
  const printRows = rowsFull.map((r) => ({ ...r, debit: nfmt(r.debit, localeOf(cur)), credit: nfmt(r.credit, localeOf(cur)), running: nfmt(r.running, localeOf(cur)) }));
  const totalRow = { date: 'CLOSING', vno: '', particulars: '', debit: nfmt(receipts, localeOf(cur)), credit: nfmt(payments, localeOf(cur)), running: nfmt(closing, localeOf(cur)) };
  const sub = `${selected || 'Cash account'} · ${branchLabel(branch)} · ${rowsFull.length} entries · Closing ${money(cur, closing)}`;
  const exportNow = () => rowsFull.length && exportToExcel(`cash-book-${branchLabel(branch)}`, expColumns, rowsFull);
  const printNow = () => rowsFull.length && openReportPrint(`Cash Book — ${selected}`, sub, expColumns, printRows, totalRow);

  const colCount = view === 'detailed' ? 7 : 5;
  const summary = [
    { l: 'Opening Balance', v: money(cur, Math.abs(periodOpen)) + (periodOpen < 0 ? ' Cr' : ''), c: BLUE, bg: '#e8f0ff' },
    { l: 'Total Receipts (Dr)', v: money(cur, receipts), c: GREEN, bg: '#e8f6ed' },
    { l: 'Total Payments (Cr)', v: money(cur, payments), c: RED, bg: '#fbe9e9' },
    { l: 'Closing Balance', v: money(cur, Math.abs(closing)) + (closing < 0 ? ' Cr' : ''), c: closing >= 0 ? GREEN : RED, bg: closing >= 0 ? '#e8f6ed' : '#fbe9e9' },
    { l: 'Entries', v: String(rowsFull.length), c: '#2e323c', bg: '#f3f4f8' },
  ];

  return (
    <Page
      wide={view === 'detailed'}
      title="Cash Book"
      sub={sub}
      right={<>
        <LedgerSelectMenu value={selected} options={cashLedgers.map((l) => l.name)} onChange={(v) => { setLedger(v); setPage(0); }} />
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Ledger / narration / voucher…" />
        <button
          onClick={() => setExpandAll((x) => !x)}
          title={expandAll ? 'Hide narration under each ledger' : 'Show narration under each ledger'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 32, padding: '0 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', borderRadius: 7, border: `1px solid ${expandAll ? BLUE : '#d3d8e4'}`, background: expandAll ? BLUE : '#fff', color: expandAll ? '#fff' : '#384677' }}
        >
          {expandAll ? '▾ Collapse all' : '▸ Expand all'}
        </button>
        <ModeToggle view={view} setView={setView} modes={[{ id: 'detailed', label: 'Detailed' }, { id: 'minimal', label: 'Minimal' }]} />
        <RangeBar from={from} to={to} setFrom={setFrom} setTo={setTo} onChange={() => setPage(0)} full branch={branch} />
        <ExportBtn onClick={exportNow} disabled={!rowsFull.length} />
        <PrintBtn onClick={printNow} disabled={!rowsFull.length} />
      </>}
    >
      {!chart.isLoading && cashLedgers.length === 0 && <Banner tone="info">No ledger found under the “Cash-in-Hand” group yet. Cash receipts/payments will appear here once posted.</Banner>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 14 }}>
        {summary.map((k, i) => (
          <div key={i} style={{ ...card, borderTop: `3px solid ${k.c}`, padding: '10px 12px', background: k.bg }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: k.c, textTransform: 'uppercase' }}>{k.l}</p>
            <p style={{ margin: '3px 0 0', fontSize: 17, fontWeight: 800, color: DARK }}>{k.v}</p>
          </div>
        ))}
      </div>
      <State q={q} empty={!selected ? false : rowsFull.length === 0}>
        <Table>
          <thead><tr style={headRow}>
            <Th>Date</Th><Th>Voucher</Th>
            {view === 'detailed' && <Th>Type</Th>}
            <Th>Ledger Name</Th><Th right>Receipt (Dr)</Th><Th right>Payment (Cr)</Th>
            {view === 'detailed' && <Th right>Balance</Th>}
          </tr></thead>
          <tbody>
            {page === 0 && !term && (
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #dfe2e7' }}>
                <td colSpan={colCount - 1} style={{ padding: '8px 12px', fontWeight: 700, color: BLUE }}>Opening Balance b/d</td>
                <td style={{ padding: '8px 12px', ...num, fontWeight: 700 }}>{money(cur, Math.abs(periodOpen))} {periodOpen < 0 ? 'Cr' : 'Dr'}</td>
              </tr>
            )}
            {pageRows.map((r, i) => (
              <tr key={r.vno + '-' + i} title={r.voucherId ? 'Open voucher' : ''} {...clickable(() => r.voucherId && setVoucher({ id: r.voucherId, vno: r.vno }))} style={{ ...rowBg(i), background: r.debit > 0 ? '#f4fbf4' : (i % 2 === 0 ? '#fff' : '#fafafa'), cursor: r.voucherId ? 'pointer' : 'default' }}>
                <td style={{ padding: '7px 12px', color: DIM, whiteSpace: 'nowrap' }}>{r.date}</td>
                <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 10, color: BLUE, whiteSpace: 'nowrap' }}>{r.vno}</td>
                {view === 'detailed' && <td style={{ padding: '7px 12px' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 700, background: (TYPE_CLR[r.category] || '#2e323c') + '22', color: TYPE_CLR[r.category] || '#2e323c' }}>{r.category || '—'}</span></td>}
                <td style={{ padding: '7px 12px', maxWidth: 360 }}>
                  <span style={{ color: '#2e323c', fontWeight: 600 }}>{r.ledgerName || '—'}</span>
                  {expandAll && r.narration && (
                    <div style={{ marginTop: 2, fontSize: 10, color: DIM, fontStyle: 'italic', whiteSpace: 'normal' }}>{r.narration}</div>
                  )}
                </td>
                <td style={{ padding: '7px 12px', ...num, fontWeight: 600, color: r.debit > 0 ? GREEN : '#dfe2ee' }}>{money(cur, r.debit)}</td>
                <td style={{ padding: '7px 12px', ...num, fontWeight: 600, color: r.credit > 0 ? RED : '#dfe2ee' }}>{money(cur, r.credit)}</td>
                {view === 'detailed' && <td style={{ padding: '7px 12px', ...num, fontWeight: 700, color: r.running >= 0 ? DARK : RED }}>{money(cur, Math.abs(r.running))} {r.running < 0 ? 'Cr' : ''}</td>}
              </tr>
            ))}
          </tbody>
          <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
            <td colSpan={view === 'detailed' ? 4 : 3} style={{ padding: '9px 12px', fontWeight: 700, color: GOLD, fontSize: 12 }}>CLOSING BALANCE</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#5ab84b' }}>{money(cur, receipts)}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#f08c8c' }}>{money(cur, payments)}</td>
            {view === 'detailed' && <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, Math.abs(closing))} {closing < 0 ? 'Cr' : 'Dr'}</td>}
          </tr></tfoot>
        </Table>
        <Pagination total={rowsShown.length} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} unit="entries" />
      </State>
      {closing < 0 && <Banner tone="err">⚠ Cash book shows a negative (credit) balance. Verify all entries — a physical cash count is required.</Banner>}
      {voucher && (
        <div onClick={() => setVoucher(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(16,18,22,0.5)', zIndex: 800, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '4vh 2vw' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 'min(840px, 96vw)', maxHeight: '92vh', overflowY: 'auto', padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #cdd1d8', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <Crumb items={[{ label: selected || 'Cash Book', onClick: () => setVoucher(null) }, { label: voucher.vno }]} />
              <button onClick={() => setVoucher(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 18, flexShrink: 0 }}>✕</button>
            </div>
            <VoucherEditor voucherId={voucher.id} cur={cur} onBack={() => setVoucher(null)} />
          </div>
        </div>
      )}
    </Page>
  );
}
