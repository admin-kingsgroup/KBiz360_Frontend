import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Menu as DropdownMenu } from '../../../core/ux/Menu';
import { useModulePL, useBalanceSheet } from '../../../core/useAccounting';
import { bc } from '../../../core/styles';
import { localeOf } from '../../../core/format';
import { CUR_MONTH, MONTH_OPTIONS, monthLabel, prevMonthKey } from '../../../core/dates';
import { CONSOLIDATED_LABEL } from '../../../core/data';
import { LoadingState, ErrorState, EmptyState, PageSection } from '../../../shell/primitives';
import { RptShell } from '../components/scaffold';

// Pure derivation of ONE cash-flow statement from a single slice of the three
// sources — modulePL (`pl`) + closing Balance Sheet (`closing`) + opening
// Balance Sheet (`opening`). Called once for single-branch scope, and once PER
// BRANCH in consolidated (ALL) scope on that branch's own byBranch slices — so
// no figure here is ever summed across branches / currencies. Returns the render
// model (sections + the cash reconciliation figures). Currency is applied later
// at render time, never inside this math.
function computeCF({ pl, closing, opening }) {
  const gmap = (d) => { const m = {}; [...(d?.assets || []), ...(d?.liabilities || [])].forEach((x) => { m[x.group] = (m[x.group] || 0) + (x.amount || 0); }); return m; };
  const C = gmap(closing), O = gmap(opening);
  const g = (m, k) => m[k] || 0;
  const cashOf = (m) => g(m, 'Bank Accounts') + g(m, 'Cash-in-Hand');

  const netProfit = pl && pl.bridge ? pl.bridge.netProfit || 0 : 0;
  const depn = pl ? (((pl.indirect && pl.indirect.groups) || []).filter((x) => /deprec|amortis|amortiz/i.test(x.name)).reduce((s, x) => s + (x.amount || 0), 0)) : 0;
  const dRecv = g(C, 'Sundry Debtors') - g(O, 'Sundry Debtors');
  const dPay = g(C, 'Sundry Creditors') - g(O, 'Sundry Creditors');
  const dInv = g(C, 'Stock-in-Hand') - g(O, 'Stock-in-Hand');
  const dFA = (g(C, 'Fixed Assets') + g(C, 'Investments')) - (g(O, 'Fixed Assets') + g(O, 'Investments'));
  const dCap = g(C, 'Capital Account') - g(O, 'Capital Account');
  const dBorrow = (g(C, 'Loans (Liability)') + g(C, 'Bank OD Accounts')) - (g(O, 'Loans (Liability)') + g(O, 'Bank OD Accounts'));

  const operatingCF = netProfit + depn - dRecv + dPay - dInv;
  const investingCF = -dFA;
  const financingCF = dCap + dBorrow;
  const openingCash = cashOf(O);
  const closingCash = cashOf(C);
  const netCF = closingCash - openingCash;
  const other = netCF - (operatingCF + investingCF + financingCF);

  const sections = [
    { title: 'A. OPERATING ACTIVITIES', color: '#2563eb', rows: [
      { l: 'Net Profit before tax', v: netProfit },
      { l: 'Add: Depreciation & amortisation (non-cash)', v: depn },
      { l: '(Increase) / decrease in trade receivables', v: -dRecv },
      { l: 'Increase / (decrease) in trade payables', v: dPay },
      { l: '(Increase) / decrease in inventories', v: -dInv },
      { l: 'Net Cash from Operating Activities', v: operatingCF, bold: true, border: true },
    ] },
    { title: 'B. INVESTING ACTIVITIES', color: '#16a34a', rows: [
      { l: 'Net (purchase) / sale of fixed assets & investments', v: investingCF },
      { l: 'Net Cash from Investing Activities', v: investingCF, bold: true, border: true },
    ] },
    { title: 'C. FINANCING ACTIVITIES', color: '#d97706', rows: [
      { l: 'Change in share / capital account', v: dCap },
      { l: 'Change in borrowings', v: dBorrow },
      { l: 'Net Cash from Financing Activities', v: financingCF, bold: true, border: true },
    ] },
  ];
  if (Math.abs(other) >= 1) sections.push({ title: 'D. OTHER MOVEMENTS', color: '#5b616e', rows: [{ l: 'Unclassified / other balance movements', v: other, bold: true, border: true }] });

  const hasData = !!closing && (Math.abs(closingCash) > 0.01 || Math.abs(openingCash) > 0.01 || Math.abs(netProfit) > 0.01);
  return { sections, openingCash, closingCash, netCF, hasData };
}

export function ReportCF({ branch, setRoute }) {
  // Cash-flow lines are derived from Balance-Sheet movements (+ net profit) → drill to the
  // detailed Balance Sheet, which itself drills group → ledger → voucher. Inert if no setRoute.
  const cfNav = setRoute ? { onClick: () => setRoute('/reports/bs'), role: 'button', tabIndex: 0, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setRoute('/reports/bs'); } }, style: { cursor: 'pointer' }, title: 'Open source: Balance Sheet →' } : {};
  const cur = bc(branch).cur;
  const brCode = branch === 'ALL' ? null : branch?.code;
  const [period, setPeriod] = useState(CUR_MONTH);

  const monthEnd = (key) => { const [y, m] = String(key).split('-').map(Number); const last = new Date(y, m, 0).getDate(); return `${key}-${String(last).padStart(2, '0')}`; };
  const to = monthEnd(period);
  const openTo = monthEnd(prevMonthKey(period));
  const qPL = useModulePL(branch, { from: `${period}-01`, to });
  const qC = useBalanceSheet(branch, { to });
  const qO = useBalanceSheet(branch, { to: openTo });
  const loading = qPL.isLoading || qC.isLoading || qO.isLoading;
  const errored = qPL.isError || qC.isError || qO.isError;

  // Consolidated (ALL / Group) scope: render EACH branch as its OWN cash-flow statement in its
  // OWN currency, never one merged ₹ statement blending ₹+$ balance-sheet movements. This screen
  // STITCHES three sources per branch, so we join the three `byBranch` arrays on the branch code
  // and run the SAME `computeCF` derivation per slice. Fall through to the single-branch render
  // if any source lacks a `byBranch` array (guarded with Array.isArray).
  const isAll = !branch || branch === 'ALL' || branch?.code === 'ALL';
  const consolidated = isAll && Array.isArray(qPL.data?.byBranch) && Array.isArray(qC.data?.byBranch) && Array.isArray(qO.data?.byBranch);

  // Single-branch (and the non-byBranch consolidated fallback) model — computed from the merged
  // top-level payloads exactly as before, so single-branch output is byte-for-byte unchanged.
  const single = computeCF({ pl: qPL.data, closing: qC.data, opening: qO.data });

  // Per-branch models: join the three byBranch arrays by code, feed each branch's own three
  // slices into computeCF, resolve that branch's currency, and surface any per-branch `_error`.
  const findSlice = (arr, code) => (Array.isArray(arr) ? arr.find((x) => x && x.branch === code) : null) || null;
  const branchModels = consolidated ? (() => {
    const plBB = qPL.data.byBranch, cBB = qC.data.byBranch, oBB = qO.data.byBranch;
    const codes = [...new Set([...plBB, ...cBB, ...oBB].map((x) => x && x.branch))].filter(Boolean).sort();
    return codes.map((code) => {
      const pl = findSlice(plBB, code), closing = findSlice(cBB, code), opening = findSlice(oBB, code);
      const failed = [];
      if (pl && pl._error) failed.push(`P&L (${pl._error})`);
      if (closing && closing._error) failed.push(`closing balance sheet (${closing._error})`);
      if (opening && opening._error) failed.push(`opening balance sheet (${opening._error})`);
      const err = failed.length ? failed.join('; ') : null;
      // An errored slice is treated as missing in the math — but we surface `err` so the branch
      // shows its own load-failure note instead of a misleading part-computed statement.
      const model = computeCF({
        pl: pl && !pl._error ? pl : null,
        closing: closing && !closing._error ? closing : null,
        opening: opening && !opening._error ? opening : null,
      });
      return { code, cur: (bc({ code }) || {}).cur || '₹', model, err };
    });
  })() : [];

  const hasData = consolidated
    ? branchModels.some((b) => b.model.hasData || b.err)
    : single.hasData;

  const clr = (n) => (n >= 0 ? '#16a34a' : '#dc2626');

  // Render ONE branch's (or the single merged) statement body, formatted entirely in that
  // slice's own currency `cur`. Identical DOM to the original single-branch statement.
  const renderBody = (model, curBr) => {
    const { sections, openingCash, closingCash, netCF } = model;
    const f = (n) => { const abs = Math.abs(Math.round(n)); const s = curBr + abs.toLocaleString(localeOf(curBr)); return n < 0 ? `(${s})` : s; };
    return (
      <div className="mx-auto max-w-3xl">
        {sections.map((sec, si) => (
          <div key={si} className="mb-3 overflow-hidden rounded-brand border border-surface-border bg-surface shadow-sm">
            <div className="px-3.5 py-2.5" style={{ background: sec.color }}><p className="text-xs font-bold text-white">{sec.title}</p></div>
            <table className="w-full border-collapse text-[11.5px]">
              <tbody>
                {sec.rows.map((r, ri) => (
                  <tr key={ri} {...cfNav} className={`border-b border-surface-alt ${r.border ? 'border-t-2 border-t-surface-border bg-surface-alt' : ''} ${setRoute ? 'hover:bg-surface-alt' : ''}`}>
                    <td className={`px-3.5 py-2.5 text-navy ${r.bold ? 'font-bold' : ''}`}>{r.l}</td>
                    <td className="px-3.5 py-2.5 text-right tabular-nums" style={{ color: r.bold ? clr(r.v) : r.v < 0 ? '#dc2626' : '#2e323c', fontWeight: r.bold ? 800 : 500, fontSize: r.bold ? 13 : 11.5 }}>{f(r.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div className="mb-3 overflow-hidden rounded-brand border border-surface-border bg-surface shadow-sm">
          <table className="w-full border-collapse text-[11.5px]">
            <tbody>
              <tr className="border-b border-surface-alt"><td className="px-3.5 py-3 text-navy">Opening Cash &amp; Bank Balance</td><td className="px-3.5 py-3 text-right tabular-nums text-role-hr">{f(openingCash)}</td></tr>
              <tr className="border-b border-surface-alt"><td className="px-3.5 py-3 text-navy">Net Change in Cash</td><td className="px-3.5 py-3 text-right tabular-nums" style={{ color: clr(netCF) }}>{f(netCF)}</td></tr>
              <tr className="bg-navy"><td className="px-3.5 py-3 text-base font-extrabold text-gold">Closing Cash &amp; Bank Balance</td><td className="px-3.5 py-3 text-right text-base font-extrabold tabular-nums text-white">{f(closingCash)}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-brand border border-[#cfe0f8] bg-[#e8f0ff] px-3.5 py-2.5 text-[10px] leading-relaxed text-[#2563eb]">
          Indirect method from live double-entry: opening vs closing Balance Sheet (Bank + Cash), Net Profit + non-cash items ± working-capital changes. Positive = cash generated, Negative (in brackets) = cash used.
        </div>
      </div>
    );
  };

  const subtitle = consolidated
    ? `Indirect method · ${monthLabel(period)} · ${CONSOLIDATED_LABEL} · each branch in its own currency · no cross-currency total · live double-entry`
    : `Indirect method · ${monthLabel(period)} · ${brCode || CONSOLIDATED_LABEL} · live double-entry`;

  const periodSelect = (
    <DropdownMenu
      ariaLabel="Period"
      menuRole="listbox"
      width={180}
      items={MONTH_OPTIONS.map((p) => ({ key: p.v, label: p.l, selected: period === p.v, onSelect: () => setPeriod(p.v) }))}
      renderTrigger={({ ref, toggle, triggerProps }) => (
        <button ref={ref} {...triggerProps} onClick={toggle} type="button"
          className="flex h-9 items-center gap-1.5 rounded-md border border-surface-border bg-surface px-3 text-[13px] font-medium text-ink hover:bg-surface-alt">
          {monthLabel(period)}
          <ChevronDown size={13} className="text-ink-subtle" />
        </button>
      )}
    />
  );

  return (
    <RptShell title="Cash Flow Statement" subtitle={subtitle} actions={periodSelect}>
      {loading && <LoadingState label="Loading live books…" />}
      {!loading && errored && <ErrorState message="Could not load accounting data." onRetry={() => { qPL.refetch(); qC.refetch(); qO.refetch(); }} />}
      {!loading && !errored && !hasData && (
        <PageSection className="mx-auto max-w-3xl"><EmptyState title="No transactions found" hint={`Cash flow is derived from posted vouchers for ${monthLabel(period)}. Record transactions to populate this statement.`} /></PageSection>
      )}

      {!loading && !errored && hasData && (
        consolidated ? (
          <>
            <div className="mx-auto mb-3 max-w-3xl rounded-brand border border-[#cfe0f8] bg-[#e8f0ff] px-3.5 py-2.5 text-[11px] font-semibold text-[#2563eb]">
              Consolidated — each branch in its own currency · no cross-currency total.
            </div>
            {branchModels.map(({ code, cur: curBr, model, err }) => (
              <div key={code}>
                <div className="mx-auto mb-1.5 mt-4 flex max-w-3xl items-baseline gap-2 border-b-2 border-[#2563eb] pb-1">
                  <span className="text-sm font-extrabold text-navy">{code}</span>
                  <span className="text-xs font-bold text-ink-subtle">· {curBr}</span>
                </div>
                {err ? (
                  <div className="mx-auto max-w-3xl rounded-brand border border-[#f2c7c7] bg-[#fdeaea] px-3.5 py-2.5 text-[11px] font-semibold text-[#dc2626]">
                    Couldn’t load {code} — {err}. (Load error for this branch, not an empty result.)
                  </div>
                ) : model.hasData ? (
                  renderBody(model, curBr)
                ) : (
                  <div className="mx-auto max-w-3xl rounded-brand border border-surface-border bg-surface px-3.5 py-2.5 text-[11px] text-ink-subtle">
                    No posted transactions for {code} in {monthLabel(period)}.
                  </div>
                )}
              </div>
            ))}
          </>
        ) : (
          renderBody(single, cur)
        )
      )}
    </RptShell>
  );
}

export default ReportCF;
