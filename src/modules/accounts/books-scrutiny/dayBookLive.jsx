/* ════════════════════════════════════════════════════════════════
   DAY BOOK  /day-book
   ════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from 'react';
import { useDayBook } from '../../../core/useAccounting';
import { localeOf } from '../../../core/format';
import { exportToExcel } from '../../../core/exportExcel';
import { clickable } from '../../../core/ux/clickable';
import { isBookingLegRow } from '../../../core/ledgerUI';
import { openBookingFolder } from '../../../core/BookingFolderHost';
import { VoucherEditor } from '../../accountingLive';
import {
  DARK, GOLD, DIM, BLUE, RED, curOf, money, branchLabel, Page, State, ExportBtn, PrintBtn,
  Table, Th, headRow, rowBg, num, ModeToggle, RangeBar, SearchInput, Pagination, nfmt,
  openReportPrint, todayISO, parseAnyDate, dateInRange, Crumb,
} from '../../accountingLive/shared';
import { card } from '../../../core/styles';
import { pushModal } from '../../../core/ux/modalStore';

// Voucher category → colour tag for the Type chip (detailed view).
const TYPE_CLR = { sale: BLUE, purchase: '#d97706', receipt: '#16a34a', payment: RED, journal: '#2e323c', contra: '#6b21a8', 'debit-note': '#d97706' };

// Normalise any date string to ISO for stable day-grouping (Tally dates vary).
const dayKey = (d) => { const p = parseAnyDate(d); return p ? `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}-${String(p.getDate()).padStart(2, '0')}` : String(d || ''); };

// Narration cell with expand/collapse for long text.
function NarrationCell({ text, clamp = 55 }) {
  const [open, setOpen] = useState(false);
  if (!text) return <span style={{ color: '#9197a3' }}>—</span>;
  const long = String(text).length > clamp;
  if (!long) return <span style={{ color: '#2e323c' }}>{text}</span>;
  return (
    <span style={{ color: '#2e323c' }}>
      {open ? text : String(text).slice(0, clamp) + '… '}
      <button onClick={() => setOpen((o) => !o)} style={{ background: 'none', border: 'none', color: BLUE, cursor: 'pointer', fontWeight: 700, fontSize: 10, padding: 0 }}>{open ? 'less' : 'more'}</button>
    </span>
  );
}

// Standalone voucher viewer modal — opened from the Day Book.
function VoucherModal({ branch, voucher, onClose }) {
  const cur = curOf(branch);
  React.useEffect(() => pushModal(onClose), []); // Esc closes
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(16,18,22,0.5)', zIndex: 800, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '4vh 2vw' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 'min(840px, 96vw)', maxHeight: '92vh', overflowY: 'auto', padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #cdd1d8', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <Crumb items={[{ label: voucher.vno }]} />
          <button onClick={onClose} className="inline-flex items-center justify-center max-tablet:min-h-[44px] max-tablet:min-w-[44px]" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 18, flexShrink: 0 }}>✕</button>
        </div>
        <VoucherEditor voucherId={voucher.id} cur={cur} onBack={onClose} />
      </div>
    </div>
  );
}

export function DayBookLive({ branch }) {
  const cur = curOf(branch);
  const [from, setFrom] = useState(todayISO);
  const [to, setTo] = useState(todayISO);
  const [view, setView] = useState('minimal'); // minimal | detailed
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(1000); // show the whole ledger by default; pager still kicks in past 1000
  const [voucher, setVoucher] = useState(null); // clicked Day Book line → voucher modal

  const q = useDayBook(branch, { from, to });
  const allJournals = q.data || [];

  const term = search.trim().toLowerCase();
  const sorted = useMemo(() => {
    const f = allJournals
      .filter((j) => dateInRange(j.date, from, to))
      .filter((j) => !term || (`${j.vno} ${j.type} ${j.category} ${j.party} ${j.narration} ${(j.postings || []).map((p) => p.ledger).join(' ')}`.toLowerCase().includes(term)));
    return f.sort((a, b) => { const ta = parseAnyDate(a.date)?.getTime() || 0, tb = parseAnyDate(b.date)?.getTime() || 0; return ta - tb || String(a.vno).localeCompare(String(b.vno)); });
  }, [allJournals, from, to, term]);

  const dayTotals = useMemo(() => {
    const m = new Map();
    for (const j of sorted) { const k = dayKey(j.date); if (!m.has(k)) m.set(k, { label: j.date, dr: 0, cr: 0, n: 0 }); const g = m.get(k); g.dr += j.totalDebit || 0; g.cr += j.totalCredit || 0; g.n += 1; }
    return m;
  }, [sorted]);

  const postingRows = useMemo(() => sorted.flatMap((j) => (j.postings || []).map((p, pi) => ({
    dateKey: dayKey(j.date), date: j.date, vno: j.vno, tallyRef: j.sourceRef || '', voucherId: j.voucherId, type: j.type, category: j.category, branch: j.branch || '',
    ledger: p.ledger, group: p.group, debit: p.debit, credit: p.credit,
    narration: p.narration || j.narration || '', party: j.party || '',
    // Bills this voucher settled — shown once (on its first leg) so the line isn't repeated per posting.
    alloc: pi === 0 ? (j.allocations || []) : [],
  }))), [sorted]);

  const gDr = Math.round(sorted.reduce((s, j) => s + (j.totalDebit || 0), 0));
  const gCr = Math.round(sorted.reduce((s, j) => s + (j.totalCredit || 0), 0));
  const pageRows = useMemo(() => postingRows.slice(page * pageSize, page * pageSize + pageSize), [postingRows, page, pageSize]);

  const expColumns = view === 'minimal'
    ? [{ key: 'date', label: 'Date' }, { key: 'vno', label: 'Voucher No' }, { key: 'tallyRef', label: 'Tally Ref' }, { key: 'ledger', label: 'Ledger' }, { key: 'debit', label: `Debit (${cur})`, num: true }, { key: 'credit', label: `Credit (${cur})`, num: true }]
    : [{ key: 'date', label: 'Date' }, { key: 'vno', label: 'Voucher No' }, { key: 'tallyRef', label: 'Tally Ref' }, { key: 'type', label: 'Type' }, { key: 'category', label: 'Category' }, { key: 'branch', label: 'Branch' }, { key: 'ledger', label: 'Ledger' }, { key: 'group', label: 'Group' }, { key: 'debit', label: `Debit (${cur})`, num: true }, { key: 'credit', label: `Credit (${cur})`, num: true }, { key: 'narration', label: 'Narration' }];
  const printRows = postingRows.map((r) => ({ ...r, debit: nfmt(r.debit, localeOf(cur)), credit: nfmt(r.credit, localeOf(cur)) }));
  const totalRow = { date: 'TOTAL', vno: `${sorted.length} vouchers`, debit: nfmt(gDr, localeOf(cur)), credit: nfmt(gCr, localeOf(cur)) };
  const sub = `${branchLabel(branch)} · ${sorted.length} vouchers · ${postingRows.length} lines · Dr ${money(cur, gDr)} = Cr ${money(cur, gCr)}`;
  const exportNow = () => postingRows.length && exportToExcel(`day-book-${branchLabel(branch)}`, expColumns, postingRows);
  const printNow = () => postingRows.length && openReportPrint('Day Book', sub, expColumns, printRows, totalRow);

  const colCount = view === 'detailed' ? 8 : 5;
  let lastKey = null;

  return (
    <Page
      wide={view === 'detailed'}
      title="Day Book"
      sub={sub}
      right={<>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Narration / voucher / ledger…" />
        <ModeToggle view={view} setView={setView} modes={[{ id: 'minimal', label: 'Minimal' }, { id: 'detailed', label: 'Detailed' }]} />
        <RangeBar from={from} to={to} setFrom={setFrom} setTo={setTo} onChange={() => setPage(0)} branch={branch} />
        <ExportBtn onClick={exportNow} disabled={!postingRows.length} />
        <PrintBtn onClick={printNow} disabled={!postingRows.length} />
      </>}
    >
      <State q={q} empty={postingRows.length === 0}>
        <Table>
          <thead><tr style={headRow}>
            <Th>Date</Th><Th>Voucher</Th>
            {view === 'detailed' && <><Th>Type</Th><Th>Branch</Th></>}
            <Th>Ledger Account</Th><Th right>Dr</Th><Th right>Cr</Th>
            {view === 'detailed' && <Th>Narration</Th>}
          </tr></thead>
          <tbody>
            {pageRows.map((r, i) => {
              const showDay = r.dateKey !== lastKey;
              lastKey = r.dateKey;
              const dt = dayTotals.get(r.dateKey);
              return (
                <React.Fragment key={r.vno + '-' + r.ledger + '-' + i}>
                  {showDay && (
                    <tr style={{ background: '#eef1f7' }}>
                      <td colSpan={colCount} style={{ padding: '7px 12px', fontWeight: 800, color: DARK, fontSize: 10.5 }}>
                        📅 {dt?.label || r.date} <span style={{ color: DIM, fontWeight: 600 }}>· {dt?.n} voucher(s) · Dr {money(cur, dt?.dr)} = Cr {money(cur, dt?.cr)}</span>
                      </td>
                    </tr>
                  )}
                  <tr style={{ ...rowBg(i), cursor: r.voucherId ? 'pointer' : 'default' }}
                    {...clickable(() => { if (!r.voucherId) return; if (isBookingLegRow(r)) openBookingFolder(r.vno, { branch, voucherId: r.voucherId, vno: r.vno }); else setVoucher({ id: r.voucherId, vno: r.vno }); })}
                    onMouseEnter={(e) => { if (r.voucherId) e.currentTarget.style.background = '#eff6ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'; }}>
                    <td style={{ padding: '7px 12px', color: DIM, whiteSpace: 'nowrap' }}>{r.date}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 10, color: BLUE, whiteSpace: 'nowrap' }}>{r.vno}</td>
                    {view === 'detailed' && <>
                      <td style={{ padding: '7px 12px' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 700, background: (TYPE_CLR[r.category] || '#2e323c') + '22', color: TYPE_CLR[r.category] || '#2e323c' }}>{r.category}</span></td>
                      <td style={{ padding: '7px 12px', color: DIM, whiteSpace: 'nowrap' }}>{r.branch || '—'}</td>
                    </>}
                    <td style={{ padding: '7px 12px', color: '#1a1c22', paddingLeft: r.debit > 0 ? 12 : 26 }}>{r.ledger}{view === 'detailed' && <span style={{ color: '#9197a3', fontSize: 9.5, marginLeft: 6 }}>{r.group}</span>}
                      {r.alloc && r.alloc.length > 0 && (
                        <div style={{ marginTop: 3, fontSize: 9.5, color: '#16a34a', fontWeight: 600 }}>↳ Settled against: {r.alloc.map((a) => `${a.billVno} (${money(cur, a.amount)})`).join(', ')}</div>
                      )}
                    </td>
                    <td style={{ padding: '7px 12px', ...num, color: r.debit > 0 ? BLUE : '#dfe2ee' }}>{money(cur, r.debit)}</td>
                    <td style={{ padding: '7px 12px', ...num, color: r.credit > 0 ? RED : '#dfe2ee' }}>{money(cur, r.credit)}</td>
                    {view === 'detailed' && <td style={{ padding: '7px 12px', maxWidth: 320 }}><NarrationCell text={r.narration} /></td>}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
            <td colSpan={view === 'detailed' ? 5 : 3} style={{ padding: '9px 12px', fontWeight: 700, color: GOLD, fontSize: 12 }}>TOTAL — {sorted.length} vouchers</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, gDr)}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{money(cur, gCr)}</td>
            {view === 'detailed' && <td />}
          </tr></tfoot>
        </Table>
        <Pagination total={postingRows.length} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} unit="lines" />
      </State>
      {voucher && <VoucherModal branch={branch} voucher={voucher} onClose={() => setVoucher(null)} />}
    </Page>
  );
}
