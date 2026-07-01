/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Balance Sheet — Schedule III (Companies Act 2013 format).
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. Same live source as the main Balance Sheet
   (useBalanceSheet): Tally-group balances rolled into Schedule III line
   items, all math unchanged. A prescribed statement format, so it keeps
   custom two-column table rendering on the responsive scaffold.

   Consolidated (branch='ALL'): the hook returns a `data.byBranch` slice per
   branch (same shape as the merged top-level). We render EACH branch's
   Schedule III statement as its own pair of panels in its OWN currency —
   never a merged cross-branch / cross-currency total.
   ──────────────────────────────────────────────────────────────────── */

import React from 'react';
import { useBalanceSheet } from '../../../core/useAccounting';
import { bc } from '../../../core/styles';
import { CONSOLIDATED_LABEL } from '../../../core/data';
import { fmt } from '../../../core/format';
import { fmtDate, todayISO } from '../../../core/dates';
import { ResponsiveGrid, StatusPill, LoadingState, ErrorState, EmptyState, PageSection } from '../../../shell/primitives';
import { RptShell } from '../components/scaffold';

const round2 = (n) => Math.round((n || 0) * 100) / 100;

// Consolidated helpers — resolve a branch CODE STRING (the `byBranch` slice's
// `branch`) to its own currency / display label (bc() expects a {code} shape).
const curOf = (br) => bc({ code: br }).cur;
const branchLabel = (br) => (!br || br === 'ALL' ? CONSOLIDATED_LABEL : br);

const Row = ({ head, value, total, bold, cur }) => (
  <tr className={`border-b border-surface-border ${bold ? 'bg-[#fbeedb]' : ''}`}>
    <td className={`whitespace-pre px-2.5 py-1.5 text-navy ${bold ? 'text-[11.5px] font-bold' : 'text-[11px]'}`}>{head}</td>
    <td className="px-2.5 py-1.5 text-right tabular-nums" style={{ fontWeight: bold ? 700 : 400, color: bold ? '#1a1c22' : '#5b616e' }}>{value !== undefined ? (value ? cur + fmt(value) : '—') : ''}</td>
    <td className="px-2.5 py-1.5 text-right font-bold tabular-nums text-[#2563eb]">{total !== undefined ? cur + fmt(total) : ''}</td>
  </tr>
);

const Panel = ({ title, rows, total, cur }) => (
  <div className="overflow-hidden rounded-brand border border-surface-border bg-surface shadow-sm">
    <h3 className="bg-navy px-3 py-2.5 text-[13px] font-bold text-gold">{title}</h3>
    <table className="w-full border-collapse text-[11px]">
      <tbody>
        {rows.map((r, i) => <Row key={i} {...r} cur={cur} />)}
        <tr className="bg-navy text-gold">
          <td className="px-2.5 py-2.5 text-xs font-bold">TOTAL</td>
          <td />
          <td className="px-2.5 py-2.5 text-right text-xs font-bold tabular-nums">{cur + fmt(total)}</td>
        </tr>
      </tbody>
    </table>
  </div>
);

// One scope's full Schedule III statement (the two prescribed panels), in `cur`,
// computed from ONLY that scope's Balance-Sheet payload `d` — never merged across
// branches / currencies.
function renderBody(d, cur) {
  const sideMap = (rows) => { const m = {}; (rows || []).forEach((g) => { m[g.group] = (m[g.group] || 0) + (g.amount || 0); }); return m; };
  const liab = sideMap(d && d.liabilities);
  const asset = sideMap(d && d.assets);
  const pick = (map, names) => names.reduce((s, n) => s + (map[n] || 0), 0);

  // ── I. EQUITY & LIABILITIES ──
  const shareCapital = pick(liab, ['Capital Account']);
  const reserves = pick(liab, ['Reserves & Surplus', 'Profit & Loss A/c']);
  const shareholders = shareCapital + reserves;
  const ltBorrowings = pick(liab, ['Loans (Liability)', 'Secured Loans', 'Unsecured Loans']);
  const stBorrowings = pick(liab, ['Bank OD Accounts']);
  const tradePayables = pick(liab, ['Sundry Creditors']);
  const dutiesTaxes = pick(liab, ['Duties & Taxes', 'Current Liabilities']);
  const stProvisions = pick(liab, ['Provisions']);
  const totLiab = d ? round2(d.totalLiabilities || 0) : 0;
  const otherCurrLiab = round2(totLiab - (shareholders + ltBorrowings + stBorrowings + tradePayables + dutiesTaxes + stProvisions));
  const currLiab = stBorrowings + tradePayables + dutiesTaxes + otherCurrLiab + stProvisions;

  const EQUITY_LIABILITIES = [
    { head: "(1) Shareholders' Funds", bold: true, total: shareholders },
    { head: '    (a) Share Capital', value: shareCapital },
    { head: '    (b) Reserves and Surplus', value: reserves },
    { head: '(2) Share Application Money Pending Allotment', value: 0, bold: true },
    { head: '(3) Non-Current Liabilities', bold: true, total: ltBorrowings },
    { head: '    (a) Long-term Borrowings', value: ltBorrowings },
    { head: '(4) Current Liabilities', bold: true, total: currLiab },
    { head: '    (a) Short-term Borrowings', value: stBorrowings },
    { head: '    (b) Trade Payables', value: tradePayables },
    { head: '    (c) Other Current Liabilities', value: round2(dutiesTaxes + otherCurrLiab) },
    { head: '    (d) Short-term Provisions', value: stProvisions },
  ];

  // ── II. ASSETS ──
  const fixedAssets = pick(asset, ['Fixed Assets']);
  const investmentsNC = pick(asset, ['Investments']);
  const ltLoansAdv = pick(asset, ['Deposits (Asset)']);
  const otherNCAssets = pick(asset, ['Misc. Expenses (Asset)']);
  const nonCurrAssets = fixedAssets + investmentsNC + ltLoansAdv + otherNCAssets;
  const inventories = pick(asset, ['Stock-in-Hand']);
  const tradeRecv = pick(asset, ['Sundry Debtors']);
  const cashBank = pick(asset, ['Bank Accounts', 'Cash-in-Hand']);
  const stLoansAdv = pick(asset, ['Loans & Advances (Asset)']);
  const totAssets = d ? round2(d.totalAssets || 0) : 0;
  const otherCurrAsset = round2(totAssets - (nonCurrAssets + inventories + tradeRecv + cashBank + stLoansAdv));
  const currAssets = inventories + tradeRecv + cashBank + stLoansAdv + otherCurrAsset;

  const ASSETS = [
    { head: '(1) Non-Current Assets', bold: true, total: nonCurrAssets },
    { head: '    (a) Fixed Assets', value: fixedAssets },
    { head: '    (b) Non-current Investments', value: investmentsNC },
    { head: '    (c) Long-term Loans and Advances', value: ltLoansAdv },
    { head: '    (d) Other Non-current Assets', value: otherNCAssets },
    { head: '(2) Current Assets', bold: true, total: currAssets },
    { head: '    (a) Inventories', value: inventories },
    { head: '    (b) Trade Receivables', value: tradeRecv },
    { head: '    (c) Cash and Cash Equivalents', value: cashBank },
    { head: '    (d) Short-term Loans and Advances', value: stLoansAdv },
    { head: '    (e) Other Current Assets', value: otherCurrAsset },
  ];

  return (
    <ResponsiveGrid cols={2} gap="md">
      <Panel title="I. EQUITY AND LIABILITIES" rows={EQUITY_LIABILITIES} total={totLiab} cur={cur} />
      <Panel title="II. ASSETS" rows={ASSETS} total={totAssets} cur={cur} />
    </ResponsiveGrid>
  );
}

// Whether a Balance-Sheet payload carries any balances worth showing.
const scopeHasData = (d) => !!d && (Math.abs(round2(d?.totalLiabilities || 0)) > 0.01 || Math.abs(round2(d?.totalAssets || 0)) > 0.01);

export function ScheduleIIIBS({ branch }) {
  const cur = bc(branch).cur;
  const q = useBalanceSheet(branch, { to: '' });
  const d = q.data;
  // Consolidated = all-branches scope: render each branch's Schedule III statement
  // in its OWN currency, never a merged cross-currency total.
  const isAll = !branch || branch === 'ALL' || branch?.code === 'ALL';

  const totLiab = d ? round2(d.totalLiabilities || 0) : 0;
  const totAssets = d ? round2(d.totalAssets || 0) : 0;
  const hasData = scopeHasData(d);

  const byBranch = isAll && Array.isArray(d?.byBranch) ? d.byBranch : null;

  return (
    <RptShell title="Balance Sheet — Schedule III" subtitle={byBranch
      ? `Companies Act 2013 prescribed format · As at ${fmtDate(todayISO())} · Consolidated — each branch in its own currency · no cross-currency total`
      : `Companies Act 2013 prescribed format · As at ${fmtDate(todayISO())} · Live from posted vouchers`}>
      {hasData && !byBranch && (
        <div className="mb-3">
          {d.balanced
            ? <StatusPill tone="success">✓ Balanced</StatusPill>
            : <StatusPill tone="danger">⚠ Out by {cur + fmt(Math.abs(totAssets - totLiab))}</StatusPill>}
        </div>
      )}

      {q.isLoading && <LoadingState label="Loading live books…" />}
      {q.isError && <ErrorState message={`Could not load accounting data${q.error?.message ? ` — ${q.error.message}` : ''}.`} onRetry={q.refetch} />}

      {!q.isLoading && !q.isError && byBranch && (
        byBranch.filter(scopeHasData).length === 0
          ? <PageSection><EmptyState title="No transactions found" hint="The Schedule III Balance Sheet is generated from posted vouchers and opening balances. Record transactions to populate this statement." /></PageSection>
          : byBranch.filter(scopeHasData).map((b) => {
            const bCur = curOf(b.branch);
            const bLiab = round2(b.totalLiabilities || 0), bAssets = round2(b.totalAssets || 0);
            return (
              <div key={b.branch} className="mb-6">
                <div className="mb-3 flex items-baseline gap-2 border-b-2 border-[#2563eb] pb-1">
                  <span className="text-[14px] font-extrabold text-navy">{branchLabel(b.branch)}</span>
                  <span className="text-[12px] font-bold text-ink-muted">· {bCur}</span>
                  <span className="ml-1">
                    {b.balanced
                      ? <StatusPill tone="success" size="sm">✓ Balanced</StatusPill>
                      : <StatusPill tone="danger" size="sm">⚠ Out by {bCur + fmt(Math.abs(bAssets - bLiab))}</StatusPill>}
                  </span>
                </div>
                {renderBody(b, bCur)}
              </div>
            );
          })
      )}

      {!q.isLoading && !q.isError && !byBranch && !hasData && (
        <PageSection><EmptyState title="No transactions found" hint="The Schedule III Balance Sheet is generated from posted vouchers and opening balances. Record transactions to populate this statement." /></PageSection>
      )}

      {!q.isLoading && !q.isError && !byBranch && hasData && renderBody(d, cur)}

      <p className="mt-3.5 text-[10.5px] italic text-ink-muted">
        💡 As per Division I of Schedule III of Companies Act, 2013 · Figures derived live from the Tally 28-group double-entry books · Reproduce with Notes 1–30 for full statutory compliance
      </p>
    </RptShell>
  );
}

export default ScheduleIIIBS;
