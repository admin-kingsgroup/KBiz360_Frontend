// ───────────────────────────────────────────────────────────────────────────
// UNIFIED FINANCIAL STATEMENTS — one Profit & Loss screen and one Balance Sheet
// screen, each with a single view switcher. No more duplicate menu entries.
//
//   Profit & Loss   : Fiori · Classic · Vertical
//   Balance Sheet   : Fiori · Classic · Vertical
//
// Both screens reuse ReportPnLLive / ReportBSLive (pinned via forceView, internal
// switcher hidden). EVERY ledger click everywhere opens the one unified ledger
// modal (openLedgerModal), scoped to the top-right global branch.
// ───────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import { bc } from '../core/styles';
import { localeOf } from '../core/format';
import { useModulePL } from '../core/useAccounting';
import { LEDGER_CSS } from '../core/ledgerUI';
import { openLedgerModal } from '../core/LedgerModalHost';
import { clickable } from '../core/ux/clickable';
import { ReportPnLLive, ReportBSLive } from './reportsFinancial';
import { PnLTallyLive } from './pnlTally';
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
    const heads = (m.heads && m.heads[side]) || [];
    for (const h of heads) {
      rows.push({ label: h.ledger, amount: h.amount, ledger: h.ledger, indent: 1 });
      for (const comp of (h.components || [])) rows.push({ label: comp.label, amount: comp.amount, indent: 2 });
    }
    // "Less: Refunds / Reissues" — foots the gross heads to the module's net total
    // (signed contribution; refunds reduce). Only when there's refund movement.
    const rf = Number(m.refunds && m.refunds[side]);
    if (heads.length && Math.abs(rf || 0) > 0.5) rows.push({ label: 'Less: Refunds / Reissues', amount: rf, indent: 1 });
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
  // Direct Income (Commission, Discount Received …) and Direct Expenses are trading items
  // beyond module Sales/COGS — shown as their OWN lines bridging operating GP → full Gross
  // Profit, exactly where the Tally Trading account places them.
  const directIncome = sd.totals.directIncome || 0;
  const directExpense = sd.totals.directExpense || 0;
  // Direct Income / Direct Expenses as a group ▸ sub-group ▸ ledger tree (matching how
  // Indirect Expenses renders below), not a single flat line. sign: income +1, expense −1.
  const directRows = (gs, total, label, sign) => {
    const cats = gs || [];
    const head = { label: (sign < 0 ? 'Less: ' : 'Add: ') + label, amount: sign * total, bold: true };
    if (!cats.length) return [{ ...head, ledger: label }];
    return [head, ...cats.flatMap((g) => {
      const led = (g.ledgers || []).map((l) => ({ label: l.name, amount: sign * l.amount, ledger: l.name, indent: 2 }));
      if (g.name === label) return led.map((r) => ({ ...r, indent: 1 })); // ledgers directly under the group
      return [{ label: g.name, amount: sign * g.amount, indent: 1 }, ...led];
    })];
  };
  const cogsRows = [
    ...(sd.modules || []).flatMap((m) => moduleStmtRows(m, 'cogs')),
    { label: 'Total Direct Cost (COGS)', amount: sd.totals.cogs, subtotal: true },
    ...((directIncome || directExpense)
      ? [
        { label: 'Operating Gross Profit (Sales − COGS)', amount: operatingGP, subtotal: true },
        ...(directIncome ? directRows(sd.totals.directIncomeGroups, directIncome, 'Direct Income', 1) : []),
        ...(directExpense ? directRows(sd.totals.directExpenseGroups, directExpense, 'Direct Expenses', -1) : []),
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

/* ════════════════════════════════════════════════════════════════════════
   MERGED SCREENS — one P&L, one Balance Sheet, with a single switcher.
   ════════════════════════════════════════════════════════════════════════ */
const WRAP_CLS = 'mx-auto max-w-[1640px] px-2.5 pb-10 pt-2.5 tablet:px-4';
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
  // Balance Sheet keeps the same three views as P&L — Fiori · Classic · Vertical.
  const [view, setView] = useState('fiori');
  return (
    <div className={WRAP_CLS}>
      <div className={BAR_CLS}>
        <StmtSwitcher value={view} onChange={setView} options={[['fiori', '▪ Fiori'], ['classic', '▭ Classic'], ['vertical', '▤ Vertical']]} />
      </div>
      <ReportBSLive branch={branch} forceView={view} hideSwitcher />
    </div>
  );
}
