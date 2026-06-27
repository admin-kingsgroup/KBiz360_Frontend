// ───────────────────────────────────────────────────────────────────────────
// UNIFIED FINANCIAL STATEMENTS — one Profit & Loss screen and one Balance Sheet
// screen, each with a single view switcher. No more duplicate menu entries.
//
//   Profit & Loss   : Fiori · Classic · Vertical · Tally · TKF
//   Balance Sheet   : Fiori · Classic · Vertical · Tally · TKF · Schedule III · Consolidated
//
// Fiori/Classic/Vertical reuse ReportPnLLive / ReportBSLive (pinned via forceView,
// internal switcher hidden). Tally reuses the T-account screens. TKF is a new
// TravKings-branded vertical statement in the SAME cream/gold theme as the unified
// Ledger UI — so Ledger, P&L and Balance Sheet share one visual language. EVERY
// ledger click everywhere opens the one unified ledger modal (openLedgerModal),
// scoped to the top-right global branch.
// ───────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import { bc } from '../core/styles';
import { localeOf } from '../core/format';
import { PeriodBar } from '../core/period';
import { useModulePL, useBalanceSheet } from '../core/useAccounting';
import { LEDGER_CSS } from '../core/ledgerUI';
import { openLedgerModal } from '../core/LedgerModalHost';
import { clickable } from '../core/ux/clickable';
import { ReportPnLLive, ReportBSLive } from './reportsFinancial';
import { PnLTallyLive } from './pnlTally';
import { BalanceSheetTallyLive } from './balanceSheetTally';
import { ScheduleIIIBS, ConsolidatedBS } from './reports';
import { CONSOLIDATED_LABEL } from '../core/data';

const GOLD = '#A07828';
const branchLabelOf = (b) => (!b || b === 'ALL' ? CONSOLIDATED_LABEL : (b.code || b));
// Grouping locale follows the branch currency symbol (Indian lakh/crore for ₹,
// Western thousands for USD branches); the symbol is rendered separately by the
// caller. Default ₹ keeps consolidated/ALL views (bc → ₹) on en-IN, unchanged.
const fmt = (n, cur = '₹') => (n ? Number(n).toLocaleString(localeOf(cur), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
const fmtB = (n, cur = '₹') => Math.abs(Number(n) || 0).toLocaleString(localeOf(cur), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dmy = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('-') : '');

/* ── shared view switcher (segmented, cream/gold) ──────────────────────────
   The `.seg` control is inline-flex with overflow:hidden, so with 6-7 views it
   would clip on a phone. The outer wrapper lets it scroll horizontally instead
   (min-w-0 so it can shrink inside the flex toolbar). Theme is untouched. */
function StmtSwitcher({ value, onChange, options }) {
  return (
    <div className="min-w-0 max-w-full overflow-x-auto [scrollbar-width:thin]">
      <div className="kbled" style={{ display: 'inline-block' }}>
        <style>{LEDGER_CSS}</style>
        <div className="seg" style={{ borderColor: '#DEDBD4' }}>
          {options.map(([id, label]) => (
            <button key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   TKF — TravKings vertical statement, cream/gold (same theme as Ledger UI).
   Renders structured sections; ledger rows are clickable → unified modal.
   ════════════════════════════════════════════════════════════════════════ */
function TkfStatement({ title, badge, branch, period, kpis = [], sections, result }) {
  const cur = bc(branch).cur;
  return (
    <div className="kbled">
      <style>{LEDGER_CSS}</style>
      <div className="sheet">
        <div className="hdr">
          <div className="brand"><div className="logo">TRAVKINGS</div><div className="sub">TOURS &amp; TRAVELS PVT. LTD.</div></div>
          <div className="doc-title"><h1>{title}</h1><div className="accent" /><span className="badge">{badge}</span></div>
        </div>
        <div className="ledhead">
          <div><div className="nm">{title}</div><div className="grp">Branch: <b>{branchLabelOf(branch)}</b></div></div>
          <div className="period">{period}</div>
        </div>
        {kpis.length > 0 && (
          <div className="summary">
            {kpis.map((k, i) => (
              <div className={'scard ' + (k.tone || '')} key={i}><div className="k">{k.label}</div><div className="v">{k.value}</div></div>
            ))}
          </div>
        )}
        <div className="tblwrap">
          <table>
            <thead><tr><th className="l">Particulars</th><th>Amount</th></tr></thead>
            <tbody>
              {sections.map((sec, si) => (
                <React.Fragment key={si}>
                  <tr className="brband"><td className="l" colSpan={2}><span className="bc">{sec.title}</span></td></tr>
                  {sec.rows.length === 0 && <tr><td className="l" colSpan={2} style={{ textAlign: 'center', padding: 18, color: '#9A9A9A' }}>—</td></tr>}
                  {sec.rows.map((r, ri) => (
                    <tr key={ri} className={r.subtotal ? 'brsub' : undefined}>
                      <td className="l part" style={{ paddingLeft: 10 + (r.indent || 0) * 16, fontWeight: r.subtotal || r.bold ? 800 : (r.ledger ? 400 : 600) }}>
                        {r.ledger
                          ? <span className="vlink" {...clickable(() => openLedgerModal(r.ledger, { invoiceToRegister: true }))} title="Open Ledger Account — an invoice inside opens its Sales/Purchase Register">{r.label}</span>
                          : r.label}
                      </td>
                      <td className="num">{fmt(r.amount, cur)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
            {result && (
              <tfoot><tr className="close-row">
                <td className="l" style={{ color: GOLD, textTransform: 'uppercase', fontSize: 12, letterSpacing: '.4px' }}>{result.label}</td>
                <td className="bal">{fmtB(result.amount, cur)}<span className="sd">{result.note || ''}</span></td>
              </tr></tfoot>
            )}
          </table>
        </div>
        <div className="hint">TravKings (TKF) statement · live double-entry · click any ledger to open its full account. Branch is set by the top-right selector.</div>
      </div>
    </div>
  );
}

/* ── TKF Profit & Loss (vertical) ────────────────────────────────────────── */
// Per-branch currency helper + label (consolidated path renders each branch in
// its OWN currency — never a merged cross-currency money total).
const curOf = (br) => bc(br).cur;

// Build the TKF P&L statement props (kpis / sections / result) for ONE data
// slice in its OWN currency. `sd` is a byBranch slice when consolidated, or the
// merged top-level `d` in single-branch mode — both carry the same shape.
function tkfPnLStatement(sd, sCur) {
  const c = (n) => sCur + fmt(n, sCur);
  const buckets = (Array.isArray(sd.indirect?.buckets) && sd.indirect.buckets.length)
    ? sd.indirect.buckets
    : [{ name: 'Indirect Expenses', amount: sd.indirect?.expense || 0, groups: sd.indirect?.groups || [] }];

  // Each module, then the GL ledgers it posts to (clickable → ledger modal) and
  // the fare/charge components captured on the entry (Base Fare, K3, Taxes …).
  // TKF is a full printed statement, so the ledger-wise detail renders inline.
  const moduleStmtRows = (m, side) => {
    const rows = [{ label: m.name, amount: side === 'sales' ? m.sales : m.cogs }];
    for (const h of ((m.heads && m.heads[side]) || [])) {
      rows.push({ label: h.ledger, amount: h.amount, ledger: h.ledger, indent: 1 });
      for (const comp of (h.components || [])) rows.push({ label: comp.label, amount: comp.amount, indent: 2 });
    }
    return rows;
  };
  const incomeRows = [
    ...(sd.modules || []).flatMap((m) => moduleStmtRows(m, 'sales')),
    { label: 'Total Revenue (Sales)', amount: sd.totals.sales, subtotal: true },
  ];
  // Module rows foot to the operating GP (Sales − COGS); the full Tally Gross
  // Profit also adds Direct Income (and other trading items). Show that bridge so
  // the statement foots: Operating GP + Direct Income = GROSS PROFIT.
  const operatingGP = sd.totals.operatingGP != null ? sd.totals.operatingGP : (sd.totals.sales - sd.totals.cogs);
  const cogsRows = [
    ...(sd.modules || []).flatMap((m) => moduleStmtRows(m, 'cogs')),
    { label: 'Total Direct Cost (COGS)', amount: sd.totals.cogs, subtotal: true },
    ...(sd.totals.tradingOther
      ? [
        { label: 'Operating Gross Profit (Sales − COGS)', amount: operatingGP, subtotal: true },
        { label: 'Add: Direct Income', amount: sd.totals.tradingOther },
      ]
      : []),
    { label: 'GROSS PROFIT', amount: sd.totals.gp, subtotal: true, bold: true },
  ];
  const expRows = [];
  buckets.forEach((b) => {
    expRows.push({ label: b.name, amount: b.amount, bold: true });
    (b.groups || []).forEach((g) => {
      expRows.push({ label: g.name, amount: g.amount, indent: 1 });
      (g.ledgers || []).forEach((l) => expRows.push({ label: l.name, amount: l.amount, ledger: l.name, indent: 2 }));
    });
  });
  expRows.push({ label: 'Total Indirect Expenses', amount: sd.indirect?.expense || 0, subtotal: true });
  const otherRows = [];
  const incomeGroups = sd.indirect?.incomeGroups || [];
  const allIncomeLedgers = incomeGroups.flatMap((g) => g.ledgers || []);
  const indIncomeTotal = sd.indirect?.income || sd.bridge?.indirectIncome || 0;
  if (allIncomeLedgers.length === 1) {
    // One income ledger → the "Indirect Income" line opens it directly.
    otherRows.push({ label: 'Indirect Income', amount: indIncomeTotal, ledger: allIncomeLedgers[0].name });
  } else if (incomeGroups.length) {
    incomeGroups.forEach((g) => {
      otherRows.push({ label: g.name, amount: g.amount, bold: true });
      (g.ledgers || []).forEach((l) => otherRows.push({ label: l.name, amount: l.amount, ledger: l.name, indent: 1 }));
    });
    otherRows.push({ label: 'Total Indirect Income', amount: indIncomeTotal, subtotal: true });
  } else if (sd.bridge?.indirectIncome) {
    otherRows.push({ label: 'Indirect Income', amount: sd.bridge.indirectIncome, ledger: 'Indirect Income' });
  }

  const sections = [
    { title: 'Income', rows: incomeRows },
    { title: 'Less: Direct Cost', rows: cogsRows },
    { title: 'Less: Indirect Expenses', rows: expRows },
  ];
  if (otherRows.length) sections.push({ title: 'Add: Indirect Income', rows: otherRows });

  return {
    kpis: [
      { label: 'Total Sales', value: c(sd.totals.sales) },
      { label: 'Gross Profit', tone: 'dr', value: c(sd.totals.gp) },
      { label: 'Indirect Exp.', tone: 'cr', value: c(sd.indirect?.expense || 0) },
      { label: 'Net Profit', tone: 'bal', value: c(sd.bridge?.netProfit || 0) },
    ],
    sections,
    result: { label: sd.bridge?.netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS', amount: sd.bridge?.netProfit || 0 },
  };
}

function TkfPnL({ branch, from, to }) {
  const cur = bc(branch).cur;
  // The TKF statement reads only totals + indirect + per-module fare-component `heads`
  // (never the per-booking file drill), so use the fast summary+heads mode — heads are
  // computed server-side via aggregation instead of scanning every voucher.
  const q = useModulePL(branch, { from, to, summary: true, withHeads: true });
  const d = q.data;
  // Consolidated = all-branches scope: render each branch as its own TKF P&L
  // section in its OWN currency — never a merged cross-currency total. Driven by
  // the BE `byBranch` slice that carries the same shape as the merged top-level.
  const isAll = !branch || branch === 'ALL' || branch?.code === 'ALL';
  if (q.isLoading) return <div className="kbled"><style>{LEDGER_CSS}</style><div style={{ padding: 16 }}>{Array.from({ length: 9 }).map((_, r) => <div key={r} className="kb-skeleton" style={{ height: 16, borderRadius: 6, marginBottom: 8, opacity: Math.max(0.4, 1 - r * 0.08) }} />)}</div></div>;
  if (!d) return <div className="kbled"><style>{LEDGER_CSS}</style><div className="loading">No data for this period.</div></div>;

  const period = <>Profit &amp; Loss A/c<br />From <b>{from ? dmy(from) : '…'}</b> to <b>{to ? dmy(to) : '…'}</b></>;

  if (isAll && Array.isArray(d.byBranch)) {
    if (d.byBranch.length === 0) return <div className="kbled"><style>{LEDGER_CSS}</style><div className="loading">No data for any branch this period.</div></div>;
    return (
      <>
        {d.byBranch.map((b) => {
          const sCur = curOf(b.branch);
          const st = tkfPnLStatement(b, sCur);
          return (
            <div key={b.branch} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '2px 2px 10px', borderBottom: `2px solid ${GOLD}`, paddingBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: GOLD }}>{branchLabelOf(b.branch)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#9A9A9A' }}>· {sCur}</span>
              </div>
              <TkfStatement title="PROFIT &amp; LOSS" badge="TKF Statement" branch={b.branch} period={period} kpis={st.kpis} sections={st.sections} result={st.result} />
            </div>
          );
        })}
      </>
    );
  }

  const st = tkfPnLStatement(d, cur);
  return (
    <TkfStatement
      title="PROFIT &amp; LOSS" badge="TKF Statement" branch={branch}
      period={period}
      kpis={st.kpis}
      sections={st.sections}
      result={st.result}
    />
  );
}

/* ── TKF Balance Sheet (vertical) ────────────────────────────────────────── */
function TkfBS({ branch, to }) {
  const cur = bc(branch).cur;
  const q = useBalanceSheet(branch, { to });
  const d = q.data;
  const c = (n) => cur + fmt(n, cur);
  if (q.isLoading) return <div className="kbled"><style>{LEDGER_CSS}</style><div style={{ padding: 16 }}>{Array.from({ length: 9 }).map((_, r) => <div key={r} className="kb-skeleton" style={{ height: 16, borderRadius: 6, marginBottom: 8, opacity: Math.max(0.4, 1 - r * 0.08) }} />)}</div></div>;
  if (!d) return <div className="kbled"><style>{LEDGER_CSS}</style><div className="loading">No data as on this date.</div></div>;

  const sideRows = (groups) => {
    const rows = [];
    (groups || []).forEach((g) => {
      rows.push({ label: g.group, amount: g.amount, bold: true });
      (g.ledgers || []).forEach((l) => rows.push({ label: l.name, amount: l.amount, ledger: l.name, indent: 1 }));
    });
    return rows;
  };
  // The backend already injects the Profit & Loss A/c into d.liabilities (a net
  // profit, Cr) or d.assets (a net loss, Dr) and folds it into d.totalLiabilities /
  // d.totalAssets — so sideRows() renders it once on the correct side. Do NOT add it
  // again here, or a profit double-counts on Liabilities and a loss shows as a bogus
  // negative liability (the statement stops footing).
  const liabRows = sideRows(d.liabilities);
  liabRows.push({ label: 'TOTAL LIABILITIES', amount: d.totalLiabilities, subtotal: true });
  const assetRows = sideRows(d.assets);
  assetRows.push({ label: 'TOTAL ASSETS', amount: d.totalAssets, subtotal: true });

  return (
    <TkfStatement
      title="BALANCE SHEET" badge="TKF Statement" branch={branch}
      period={<>Balance Sheet<br />As on <b>{to ? dmy(to) : 'latest'}</b></>}
      kpis={[
        { label: 'Total Liabilities', tone: 'cr', value: c(d.totalLiabilities) },
        { label: 'Total Assets', tone: 'dr', value: c(d.totalAssets) },
        { label: 'Net Profit', tone: 'bal', value: c(d.netProfit) },
        { label: 'Status', value: d.balanced ? 'Balanced' : 'Out of balance' },
      ]}
      sections={[{ title: 'Liabilities', rows: liabRows }, { title: 'Assets', rows: assetRows }]}
    />
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MERGED SCREENS — one P&L, one Balance Sheet, with a single switcher.
   ════════════════════════════════════════════════════════════════════════ */
const WRAP_CLS = 'mx-auto max-w-[1320px] px-2.5 pb-10 pt-2.5 tablet:px-4';
const BAR_CLS = 'flex flex-wrap items-center gap-3 px-1 pb-3 pt-2';

export function ProfitAndLossUnified({ branch }) {
  // Drill / Tally / TKF views removed — P&L keeps Fiori · Classic · Vertical.
  const [view, setView] = useState('fiori');
  return (
    <div className={WRAP_CLS}>
      <div className={BAR_CLS}>
        <StmtSwitcher value={view} onChange={setView} options={[['fiori', '▪ Fiori'], ['classic', '▭ Classic'], ['vertical', '▤ Vertical']]} />
      </div>
      <ReportPnLLive branch={branch} forceView={view} hideSwitcher />
    </div>
  );
}

export function BalanceSheetUnified({ branch }) {
  const [view, setView] = useState('tkf');
  const [tkfTo, setTkfTo] = useState('');
  return (
    <div className={WRAP_CLS}>
      <div className={BAR_CLS}>
        <StmtSwitcher value={view} onChange={setView} options={[['fiori', '▪ Fiori'], ['classic', '▭ Classic'], ['vertical', '▤ Vertical'], ['tally', '𝚺 Tally'], ['tkf', '◆ TKF'], ['schedule3', '§ Schedule III'], ['consolidated', '⛁ Consolidated']]} />
        {view === 'tkf' && <PeriodBar branch={branch} compact defaultPreset="all" onChange={(r) => setTkfTo(r.to)} />}
      </div>
      {view === 'tally' ? <BalanceSheetTallyLive branch={branch} />
        : view === 'tkf' ? <TkfBS branch={branch} to={tkfTo} />
          : view === 'schedule3' ? <ScheduleIIIBS branch={branch} setRoute={() => {}} />
            : view === 'consolidated' ? <ConsolidatedBS />
              : <ReportBSLive branch={branch} forceView={view} hideSwitcher />}
    </div>
  );
}
