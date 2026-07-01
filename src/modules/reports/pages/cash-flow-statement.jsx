/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Cash Flow Statement (indirect) — LIVE from two BS snapshots.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. All cash-flow math is unchanged: opening vs
   closing Balance Sheet (Bank + Cash) + the period's Module P&L, indirect
   method, with an unclassified balancing line. A structured statement (not
   a sortable grid), so it keeps custom section rendering on the scaffold.
   ──────────────────────────────────────────────────────────────────── */

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

export function ReportCF({ branch }) {
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

  const gmap = (d) => { const m = {}; [...(d?.assets || []), ...(d?.liabilities || [])].forEach((x) => { m[x.group] = (m[x.group] || 0) + (x.amount || 0); }); return m; };
  const C = gmap(qC.data), O = gmap(qO.data);
  const g = (m, k) => m[k] || 0;
  const cashOf = (m) => g(m, 'Bank Accounts') + g(m, 'Cash-in-Hand');

  const netProfit = qPL.data ? qPL.data.bridge.netProfit || 0 : 0;
  const depn = qPL.data ? (((qPL.data.indirect && qPL.data.indirect.groups) || []).filter((x) => /deprec|amortis|amortiz/i.test(x.name)).reduce((s, x) => s + (x.amount || 0), 0)) : 0;
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

  const f = (n) => { const abs = Math.abs(Math.round(n)); const s = cur + abs.toLocaleString(localeOf(cur)); return n < 0 ? `(${s})` : s; };
  const clr = (n) => (n >= 0 ? '#16a34a' : '#dc2626');
  const hasData = !!qC.data && (Math.abs(closingCash) > 0.01 || Math.abs(openingCash) > 0.01 || Math.abs(netProfit) > 0.01);

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
    <RptShell title="Cash Flow Statement" subtitle={`Indirect method · ${monthLabel(period)} · ${brCode || CONSOLIDATED_LABEL} · live double-entry`} actions={periodSelect}>
      {loading && <LoadingState label="Loading live books…" />}
      {!loading && errored && <ErrorState message="Could not load accounting data." onRetry={() => { qPL.refetch(); qC.refetch(); qO.refetch(); }} />}
      {!loading && !errored && !hasData && (
        <PageSection className="mx-auto max-w-3xl"><EmptyState title="No transactions found" hint={`Cash flow is derived from posted vouchers for ${monthLabel(period)}. Record transactions to populate this statement.`} /></PageSection>
      )}

      {!loading && !errored && hasData && (
        <div className="mx-auto max-w-3xl">
          {sections.map((sec, si) => (
            <div key={si} className="mb-3 overflow-hidden rounded-brand border border-surface-border bg-surface shadow-sm">
              <div className="px-3.5 py-2.5" style={{ background: sec.color }}><p className="text-xs font-bold text-white">{sec.title}</p></div>
              <table className="w-full border-collapse text-[11.5px]">
                <tbody>
                  {sec.rows.map((r, ri) => (
                    <tr key={ri} className={`border-b border-surface-alt ${r.border ? 'border-t-2 border-t-surface-border bg-surface-alt' : ''}`}>
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
      )}
    </RptShell>
  );
}

export default ReportCF;
