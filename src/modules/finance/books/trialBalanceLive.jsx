/* ════════════════════════════════════════════════════════════════════
   TRIAL BALANCE (live) + ledger drill-down
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of accountingLive/legacy.jsx
   into finance's business sub-module folder — MENU_FINANCE ▸ Books ▸
   "Trial Balance" (href /trial-balance). accountingLive/index.js re-exports
   TrialBalanceLive from here so App.jsx's barrel import needed zero changes.
   LedgerDrill (the group → ledger → voucher drill-down) is exclusive to this
   screen and moved with it. VoucherEditor stays in accountingLive/legacy.jsx
   (shared by 6+ modules) — imported directly from that file (not the
   accountingLive barrel) since the barrel re-exports TrialBalanceLive from
   HERE, and going through it would be a circular import.
   ════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo, useState } from 'react';
import { localeOf } from '../../../core/format';
import { exportToExcel } from '../../../core/exportExcel';
import { useReportExport } from '../../../core/reportExportContext';
import { pushModal } from '../../../core/ux/modalStore';
import { clickable } from '../../../core/ux/clickable';
import { card } from '../../../core/styles';
import { useTrialBalance } from '../../../core/useAccounting';
import { LedgerVouchers } from '../../reportsFinancial/pnlTally.jsx';
import { VoucherEditor } from '../../accountingLive/legacy.jsx';
import {
  DARK, GOLD, DIM, BLUE, RED, curOf, money, branchLabel, Page, Banner, State, ExportBtn,
  Table, Th, headRow, rowBg, num, ModeToggle, RangeBar, SearchInput,
  Pagination, nfmt, openReportPrint, PrintBtn, Crumb, todayISO,
} from '../../accountingLive/shared';

function LedgerDrill({ branch, ledger, from, to, onClose }) {
  const cur = curOf(branch);
  const [voucher, setVoucher] = useState(null);
  useEffect(() => pushModal(onClose), []); // Esc closes (topmost-first)
  const crumbs = [
    { label: ledger, onClick: voucher ? () => setVoucher(null) : null },
    ...(voucher ? [{ label: voucher.vno }] : []),
  ];
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(16,18,22,0.5)', zIndex: 800, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '4vh 2vw' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 'min(960px, 96vw)', maxHeight: '92vh', overflowY: 'auto', padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #cdd1d8', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <Crumb items={crumbs} />
          <button onClick={onClose} className="inline-flex items-center justify-center max-tablet:min-h-[44px] max-tablet:min-w-[44px]" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 18, flexShrink: 0 }}>✕</button>
        </div>
        {voucher
          ? <VoucherEditor voucherId={voucher.id} cur={cur} onBack={() => setVoucher(null)} />
          : <LedgerVouchers name={ledger} branch={branch} from={from} to={to} onPick={(f) => f?.kind === 'voucher' && setVoucher({ id: f.id, vno: f.vno })} />}
      </div>
    </div>
  );
}

/* ════════════════════ TRIAL BALANCE ════════════════════════════════ */
export function TrialBalanceLive({ branch }) {
  const cur = curOf(branch);
  const [from, setFrom] = useState(todayISO);
  const [to, setTo] = useState(todayISO);
  const [view, setView] = useState('detailed'); // detailed (4-col) | summary (closing only)
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(1000); // show the whole ledger by default; pager still kicks in past 1000
  const [drill, setDrill] = useState(null); // ledger name
  const q = useTrialBalance(branch, { from, to });

  // Normalise: a not-yet-redeployed backend returns only debit/credit (= closing
  // on side). Map that onto the new columns so the screen still works.
  const rows = useMemo(() => (q.data?.rows || []).map((r) => (
    r.closingDebit != null || r.closingCredit != null
      ? r
      : { ...r, openingDebit: 0, openingCredit: 0, closingDebit: r.debit || 0, closingCredit: r.credit || 0, debit: 0, credit: 0 }
  )), [q.data]);

  const term = search.trim().toLowerCase();
  const filtered = useMemo(() => (term
    ? rows.filter((r) => `${r.ledger} ${r.group} ${r.code || ''}`.toLowerCase().includes(term))
    : rows), [rows, term]);

  const T = useMemo(() => {
    const s = (k) => Math.round(filtered.reduce((a, r) => a + (r[k] || 0), 0));
    return { openDr: s('openingDebit'), openCr: s('openingCredit'), dr: s('debit'), cr: s('credit'), clDr: s('closingDebit'), clCr: s('closingCredit') };
  }, [filtered]);
  const groupTotals = useMemo(() => {
    const m = new Map();
    for (const r of filtered) {
      if (!m.has(r.group)) m.set(r.group, { clDr: 0, clCr: 0, n: 0 });
      const g = m.get(r.group); g.clDr += r.closingDebit || 0; g.clCr += r.closingCredit || 0; g.n += 1;
    }
    return m;
  }, [filtered]);

  // Balanced banner reflects the FULL trial balance, not the searched subset —
  // otherwise a search that hides one side would falsely read "out of balance".
  const fullClDr = q.data?.totalClosingDebit != null ? q.data.totalClosingDebit : (q.data?.totalDebit || 0);
  const fullClCr = q.data?.totalClosingCredit != null ? q.data.totalClosingCredit : (q.data?.totalCredit || 0);
  const balanced = q.data ? Math.abs(fullClDr - fullClCr) < 1 : true;
  const pageRows = useMemo(() => filtered.slice(page * pageSize, page * pageSize + pageSize), [filtered, page, pageSize]);

  // Export / print share one column+row set (raw numbers, group on each row).
  const expColumns = view === 'summary'
    ? [{ key: 'group', label: 'Group' }, { key: 'ledger', label: 'Ledger' }, { key: 'closingDebit', label: `Closing Dr (${cur})`, num: true }, { key: 'closingCredit', label: `Closing Cr (${cur})`, num: true }]
    : [{ key: 'group', label: 'Group' }, { key: 'code', label: 'Code' }, { key: 'ledger', label: 'Ledger' },
       { key: 'openingDebit', label: `Opening Dr`, num: true }, { key: 'openingCredit', label: `Opening Cr`, num: true },
       { key: 'debit', label: `Debit`, num: true }, { key: 'credit', label: `Credit`, num: true },
       { key: 'closingDebit', label: `Closing Dr`, num: true }, { key: 'closingCredit', label: `Closing Cr`, num: true }];
  const expRows = filtered.map((r) => ({ ...r, code: r.code || '' }));
  const printRows = filtered.map((r) => { const o = { group: r.group, code: r.code || '', ledger: r.ledger }; for (const c of expColumns) if (c.num) o[c.key] = nfmt(r[c.key], localeOf(cur)); return o; });
  const totalRow = view === 'summary'
    ? { group: 'TOTAL', ledger: '', closingDebit: nfmt(T.clDr, localeOf(cur)), closingCredit: nfmt(T.clCr, localeOf(cur)) }
    : { group: 'TOTAL', code: '', ledger: '', openingDebit: nfmt(T.openDr, localeOf(cur)), openingCredit: nfmt(T.openCr, localeOf(cur)), debit: nfmt(T.dr, localeOf(cur)), credit: nfmt(T.cr, localeOf(cur)), closingDebit: nfmt(T.clDr, localeOf(cur)), closingCredit: nfmt(T.clCr, localeOf(cur)) };
  const sub = `${branchLabel(branch)} · ${filtered.length} ledgers · Closing Dr ${money(cur, T.clDr)} / Cr ${money(cur, T.clCr)}`;
  const exportNow = () => filtered.length && exportToExcel(`trial-balance-${branchLabel(branch)}`, expColumns, expRows);
  const printNow = () => filtered.length && openReportPrint('Trial Balance', sub, expColumns, printRows, totalRow);
  // Feed the global Tally Export bar each ledger's closing balance (Dr/Cr → sign).
  const tallyLedgers = useMemo(() => filtered.map((r) => {
    const dr = Math.round(r.closingDebit || 0), crv = Math.round(r.closingCredit || 0);
    return { name: r.ledger, parent: r.group, amount: dr >= crv ? dr : crv, drCr: dr >= crv ? 'Dr' : 'Cr' };
  }), [filtered]);
  useReportExport({ title: 'Trial Balance', kind: 'ledgers', rows: tallyLedgers, recommend: 'portrait' }, [tallyLedgers]);

  // group-header bookkeeping while rendering the page slice
  let lastGroup = null;

  return (
    <Page
      wide={view === 'detailed'}
      title="Trial Balance"
      sub={sub}
      right={<>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Ledger / group…" />
        <ModeToggle view={view} setView={setView} modes={[{ id: 'detailed', label: 'Detailed' }, { id: 'summary', label: 'Summary' }]} />
        <RangeBar from={from} to={to} setFrom={setFrom} setTo={setTo} onChange={() => setPage(0)} branch={branch} />
        <ExportBtn onClick={exportNow} disabled={!filtered.length} />
        <PrintBtn onClick={printNow} disabled={!filtered.length} />
      </>}
    >
      {q.data && (balanced
        ? <Banner tone="ok">✔ Trial Balance tallied — Closing Dr {money(cur, fullClDr)} = Cr {money(cur, fullClCr)}{term ? ' (full set)' : ''}</Banner>
        : <Banner tone="err">⚠ Out of balance — Closing Dr {money(cur, fullClDr)} ≠ Cr {money(cur, fullClCr)}</Banner>)}
      <State q={q} empty={filtered.length === 0}>
        <Table>
          <thead><tr style={headRow}>
            <Th>Ledger Account</Th>
            {view === 'detailed' && <><Th right>Opening Dr</Th><Th right>Opening Cr</Th><Th right>Debit</Th><Th right>Credit</Th></>}
            <Th right>Closing Dr ({cur})</Th><Th right>Closing Cr ({cur})</Th>
          </tr></thead>
          <tbody>
            {pageRows.map((l, i) => {
              const showGroup = l.group !== lastGroup;
              lastGroup = l.group;
              const gt = groupTotals.get(l.group);
              return (
                <React.Fragment key={(l.code || '') + l.ledger + i}>
                  {showGroup && (
                    <tr style={{ background: '#eef1f7' }}>
                      <td style={{ padding: '7px 14px', fontWeight: 800, color: DARK, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{l.group} <span style={{ color: DIM, fontWeight: 600 }}>· {gt?.n} ledger(s)</span></td>
                      {view === 'detailed' && <td colSpan={4} />}
                      <td style={{ padding: '7px 14px', ...num, fontWeight: 700, color: DIM, fontSize: 10.5 }}>{money(cur, gt?.clDr)}</td>
                      <td style={{ padding: '7px 14px', ...num, fontWeight: 700, color: DIM, fontSize: 10.5 }}>{money(cur, gt?.clCr)}</td>
                    </tr>
                  )}
                  <tr style={{ ...rowBg(i), cursor: 'pointer' }}
                    {...clickable(() => setDrill(l.ledger))}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'; }}>
                    <td style={{ padding: '8px 14px 8px 26px', color: BLUE, fontWeight: 600 }}>{l.ledger}{l.code ? <span style={{ color: '#9197a3', fontSize: 9.5, marginLeft: 6 }}>{l.code}</span> : null} <span style={{ color: '#9197a3', fontSize: 10 }}>›</span></td>
                    {view === 'detailed' && <>
                      <td style={{ padding: '8px 14px', ...num, color: l.openingDebit > 0 ? DARK : '#9197a3' }}>{money(cur, l.openingDebit)}</td>
                      <td style={{ padding: '8px 14px', ...num, color: l.openingCredit > 0 ? DARK : '#9197a3' }}>{money(cur, l.openingCredit)}</td>
                      <td style={{ padding: '8px 14px', ...num, color: l.debit > 0 ? BLUE : '#9197a3' }}>{money(cur, l.debit)}</td>
                      <td style={{ padding: '8px 14px', ...num, color: l.credit > 0 ? RED : '#9197a3' }}>{money(cur, l.credit)}</td>
                    </>}
                    <td style={{ padding: '8px 14px', ...num, fontWeight: 700, color: l.closingDebit > 0 ? DARK : '#9197a3' }}>{money(cur, l.closingDebit)}</td>
                    <td style={{ padding: '8px 14px', ...num, fontWeight: 700, color: l.closingCredit > 0 ? DARK : '#9197a3' }}>{money(cur, l.closingCredit)}</td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
            <td style={{ padding: '10px 14px', fontWeight: 700, color: GOLD, fontSize: 12 }}>TOTAL — {filtered.length} ledgers</td>
            {view === 'detailed' && <>
              <td style={{ padding: '10px 14px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, T.openDr)}</td>
              <td style={{ padding: '10px 14px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, T.openCr)}</td>
              <td style={{ padding: '10px 14px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, T.dr)}</td>
              <td style={{ padding: '10px 14px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, T.cr)}</td>
            </>}
            <td style={{ padding: '10px 14px', ...num, fontWeight: 800, color: '#fff', fontSize: 13 }}>{money(cur, T.clDr)}</td>
            <td style={{ padding: '10px 14px', ...num, fontWeight: 800, color: GOLD, fontSize: 13 }}>{money(cur, T.clCr)}</td>
          </tr></tfoot>
        </Table>
        <Pagination total={filtered.length} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} unit="ledgers" />
      </State>
      {drill && <LedgerDrill branch={branch} ledger={drill} from={from} to={to} onClose={() => setDrill(null)} />}
    </Page>
  );
}
