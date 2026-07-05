// ─── Accounts ▸ Branch Accountant Workspace ───────────────────────────────────
// Six screens that let a branch accountant operate their whole day from one place.
// All data is REUSED from existing endpoints (ageing, registers, approvals, trial
// balance, tax) — these screens compose & focus that data; they post nothing new.
// Branch-scoped via the top-right selector (the `branch` prop), exactly like every
// other live screen. Cards/links jump into the existing working screens via setRoute.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { clickable } from '../../core/ux/clickable';
import { usePager, Pager } from '../../core/ux/pager';
import { bc } from '../../core/styles';
import { apiGet } from '../../core/api';
import { CONSOLIDATED_LABEL } from '../../core/data';
import { periodRange, useInception } from '../../core/period';
import { CUR_FY } from '../../core/dates';
import {
  branchCode, useAgeing, useTaxSummary, useTrialBalance, useVoucherApprovals,
  useBookingOrders, useConfigValue, useSaveConfigValue,
  useOutstanding, useDayBook, useAlerts, useCashForecast, useModulePL, useRcmLiability,
  useBudgetVsActual,
} from '../../core/useAccounting';
import { usePDCSummary } from '../../core/usePDC';
import { useMasterHealth } from '../../core/useMasters';
import { useTaxCalendar, useExpenseBudgets } from '../../core/useReference';
import { useBankLedgers, useBankReconSummary, useBankReconAggregate } from '../../core/useBankReco';
import {
  useSupplierBook, useSupplierStatement, useSupplierReconSummary,
  useImportSupplierStatement, useSupplierAutoMatch, useSupplierManualMatch,
  useSupplierUnmatch, useSetSupplierReconStatus, useClearSupplierStatement,
  useDeleteSupplierStatementLine,
} from '../../core/useSupplierReco';
import { parseSupplierStatement } from '../../core/supplierStatementParse';
import {
  useClientList, useClientBook, useClientStatement, useClientAllocation, useClientReconSummary,
  useImportClientStatement, useClientAutoMatch, useClientAutoMatchAll, useClientManualMatch,
  useClientUnmatch, useSetClientReconStatus, useClearClientStatement, useDeleteClientStatementLine,
} from '../../core/useClientReco';
import { parseClientStatement } from '../../core/clientStatementParse';
import { useInterBranchReco } from '../../core/useInterBranchReco';
import {
  useTallyBook, useTallyRows, useTallyRecoSummary, useImportTally, useTallyAutoMatch,
  useTallyManualMatch, useTallyUnmatch, useSetTallyRecoStatus, useClearTally, useDeleteTallyLine,
} from '../../core/useTallyReco';
import { parseTallyStatement } from '../../core/tallyStatementParse';
import { useCollectionsBoard, useUpsertFollowup, useAddContact, useReminderRun } from '../../core/useCollections';
import {
  Wallet, Landmark, CheckSquare, TrendingUp, TrendingDown, ReceiptText, AlertTriangle,
  ListChecks, ArrowRight, Plus, RefreshCw, Calendar, History, AlertCircle, CheckCircle2,
  Scale, Coins, CreditCard, ChevronDown, Check,
} from 'lucide-react';
import { PageLayout } from '../../shell/PageLayout';

const C = { dark: '#1a1c22', gold: '#c2a04a', blue: '#2563eb', red: '#dc2626', green: '#16a34a', dim: '#5b616e', border: '#cdd1d8', amber: '#d97706' };
// Design-system card values (brand radius + soft elevation + subtle border), so every
// `{...card}` surface in this workspace adopts the premium look without structural change.
const card = { background: '#fff', border: '1px solid #cdd1d8', borderRadius: 12, boxShadow: '0 1px 2px rgba(16,18,22,0.04), 0 6px 20px -10px rgba(16,18,22,0.12)' };
const money = (cur, n) => cur + Math.round(Number(n) || 0).toLocaleString((cur === '₹' || cur === '₨' || cur === 'Rs') ? 'en-IN' : 'en-US');
const brLabel = (b) => (b === 'ALL' || !b ? CONSOLIDATED_LABEL : (b.name || b.code || b));

// Year-month of a voucher date — handles ISO (YYYY-MM-DD) and DD/MM/YYYY (migrated).
export function ymOf(d) {
  const s = String(d || '');
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}` : '';
}
const thisYM = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

// Cash / Bank closing balance from the trial-balance rows (Dr − Cr over the matched
// GROUP only). Matching the group — not the ledger — avoids pulling in look-alike
// ledgers like "Bank Charges" (an expense) into the bank balance. Pure → unit-testable.
export function groupBalance(rows, re) {
  return (rows || []).filter((r) => re.test(String(r.group || '')))
    .reduce((s, r) => s + ((Number(r.closingDebit ?? r.debit) || 0) - (Number(r.closingCredit ?? r.credit) || 0)), 0);
}

// ── shared UI bits ───────────────────────────────────────────────────────────
const Shell = ({ title, sub, right, children }) => (
  <PageLayout title={title} subtitle={sub} actions={right}>
    {children}
  </PageLayout>
);
const th = { padding: '8px 12px', background: C.dark, color: C.gold, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'left', whiteSpace: 'nowrap' };
const td = { padding: '8px 12px', borderBottom: '1px solid #dfe2e7', fontSize: 12.5 };
const rnum = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
// `pager` (from usePager) renders the infinite-scroll sentinel INSIDE this scroll
// box, right after the table — so it only triggers a load when you scroll to the
// bottom of the box (not the moment the table mounts).
const Table = ({ children, pager }) => (
  <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
    <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>{children}</table>
      {pager && <Pager pager={pager} />}
    </div>
  </div>
);
const aBtn = (bg) => ({ padding: '5px 11px', fontSize: 11, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', color: '#fff', background: bg, display: 'inline-flex', alignItems: 'center', gap: 5 });

// ════════════════════════ 1) DASHBOARD ACCOUNTANT ════════════════════════════
// Module-level so they don't remount each render.
const Tile = ({ icon, label, value, sub, tone = C.dark, onClick, loading }) => (
  <div {...(onClick ? clickable(onClick) : {})} style={{ ...card, padding: 14, cursor: onClick ? 'pointer' : 'default', minWidth: 180, flex: '1 1 180px', borderLeft: `4px solid ${tone}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.dim, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>{icon}{label}</div>
    {loading
      ? <div className="kb-skeleton" style={{ height: 22, width: '68%', marginTop: 8, borderRadius: 6 }} />
      : <div style={{ fontSize: 21, fontWeight: 800, color: tone, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{value}</div>}
    {sub && (loading
      ? <div className="kb-skeleton" style={{ height: 10, width: '42%', marginTop: 7, borderRadius: 5 }} />
      : <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{sub} {onClick && <ArrowRight size={11} style={{ verticalAlign: 'middle' }} />}</div>)}
  </div>
);
const SecTitle = ({ children }) => <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 2px 8px' }}>{children}</div>;
const Row = ({ children }) => <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>{children}</div>;

// Period-over-period delta chip: ▲ up (green) / ▼ down (red) / — when the prior
// window is empty so the % is meaningless. Pure presentation; `cur`/`prev` are numbers.
const Delta = ({ cur, prev }) => {
  const p = Number(prev) || 0;
  if (!p) return <span style={{ fontSize: 10.5, color: C.dim, fontWeight: 700 }}>—</span>;
  const pct = ((Number(cur) || 0) - p) / Math.abs(p) * 100;
  const up = pct >= 0;
  return <span style={{ fontSize: 10.5, fontWeight: 800, color: up ? C.green : C.red }}>{up ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}%</span>;
};

// One ageing row (Debtors or Creditors): the four buckets + total, clickable to its full report.
function AgeBucketRow({ label, totals = {}, cur, tone, onClick }) {
  const cell = (v, red) => <td style={{ padding: '7px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: red && v > 0 ? C.red : C.dark, whiteSpace: 'nowrap' }}>{v ? money(cur, v) : '—'}</td>;
  return (
    <tr {...(onClick ? clickable(onClick) : {})} style={{ cursor: onClick ? 'pointer' : 'default', borderTop: '1px solid #dfe2e7' }}>
      <td style={{ padding: '7px 10px', fontWeight: 700, color: tone, whiteSpace: 'nowrap' }}>{label}</td>
      {cell(totals.d0)}{cell(totals.d30)}{cell(totals.d60)}{cell(totals.d90, true)}
      <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: tone, fontVariantNumeric: 'tabular-nums' }}>{money(cur, totals.total || 0)}{onClick && <ArrowRight size={11} style={{ verticalAlign: 'middle', marginLeft: 4 }} />}</td>
    </tr>
  );
}

// Top-N named parties (overdue debtors / creditors-to-pay) with a one-click action.
function MiniList({ title, rows, cur, valueKey, tone, actionLabel, onAction }) {
  return (
    <div style={{ ...card, padding: 12, flex: '1 1 320px', minWidth: 300 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.dark, marginBottom: 8 }}>{title}</div>
      {rows.length === 0 && <div style={{ fontSize: 11.5, color: C.green }}>✓ Nothing here.</div>}
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: i ? '1px solid #dfe2e7' : 'none' }}>
          <span style={{ flex: 1, fontSize: 12, color: C.dark, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.party}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: tone, fontVariantNumeric: 'tabular-nums' }}>{money(cur, r[valueKey])}</span>
          {onAction && <button onClick={() => onAction(r)} style={{ ...aBtn(tone), padding: '3px 8px', fontSize: 10 }}>{actionLabel}</button>}
        </div>
      ))}
    </div>
  );
}

// Settlement panel: per-party "bills vs receipts/payments" — gross billed, gross
// received/paid, what's still on account (unapplied advance) and the net balance
// due. Sourced from the SAME bill-wise ageing engine as the rest of the workspace
// (rows now carry `billed`/`settled`), so every figure ties back to the registers.
// Shows the top parties by net balance; the header links to the full report.
// `drill360` + `go` make each party row tappable → that party's 360° worktop, so the
// accountant lands on the exact account from the dashboard (works on touch & keyboard).
function SettlementPanel({ title, sub, rows, cur, tone, partyLabel, settleLabel, drillLabel, onDrill, drill360, go }) {
  const top = [...(rows || [])].sort((a, b) => Math.abs(b.net || 0) - Math.abs(a.net || 0)).slice(0, 12);
  const t = (rows || []).reduce((a, r) => ({
    billed: a.billed + (r.billed || 0), settled: a.settled + (r.settled || 0),
    total: a.total + (r.total || 0), net: a.net + (r.net || 0),
  }), { billed: 0, settled: 0, total: 0, net: 0 });
  const sh = { ...th, background: 'transparent' };
  const num = { ...td, ...rnum };
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden', flex: '1 1 480px', minWidth: 340 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: `1px solid ${C.border}` }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.dark }}>{title}</div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{sub}</div>
        </div>
        {onDrill && <button onClick={onDrill} style={{ ...aBtn(tone), padding: '4px 9px', fontSize: 10.5 }}>{drillLabel} <ArrowRight size={11} /></button>}
      </div>
      <div style={{ maxHeight: 360, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ background: C.dark }}>
            <th style={sh}>{partyLabel}</th>
            <th style={{ ...sh, ...rnum }}>Bills</th>
            <th style={{ ...sh, ...rnum }}>{settleLabel}</th>
            <th style={{ ...sh, ...rnum }}>Unsettled</th>
            <th style={{ ...sh, ...rnum }}>Net Due</th>
          </tr></thead>
          <tbody>
            {top.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: C.green, padding: 18 }}>✓ Nothing unsettled.</td></tr>}
            {top.map((r, i) => {
              const rowDrill = (drill360 && go && r.party) ? clickable(() => go(`${drill360}?party=${encodeURIComponent(r.party)}`)) : {};
              return (
              <tr key={i} {...rowDrill} style={{ background: i % 2 ? '#fafbff' : '#fff', cursor: rowDrill.onClick ? 'pointer' : 'default' }}>
                <td style={{ ...td, fontWeight: 600, color: C.dark, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.party}{rowDrill.onClick && <span style={{ color: tone, fontWeight: 800, marginLeft: 5 }}>›</span>}</td>
                <td style={num}>{money(cur, r.billed || 0)}</td>
                <td style={{ ...num, color: C.green }}>{money(cur, r.settled || 0)}</td>
                <td style={{ ...num, color: (r.total || 0) > 0.5 ? tone : C.dim, fontWeight: 700 }}>{money(cur, r.total || 0)}</td>
                <td style={{ ...num, fontWeight: 800, color: (r.net || 0) >= 0 ? C.dark : C.green }}>{money(cur, r.net || 0)}</td>
              </tr>
            ); })}
          </tbody>
          {top.length > 0 && (
            <tfoot><tr style={{ position: 'sticky', bottom: 0 }}>
              <td style={{ ...td, background: C.dark, color: C.gold, fontWeight: 800 }}>TOTAL · {(rows || []).length}</td>
              <td style={{ ...td, ...rnum, background: C.dark, color: '#fff', fontWeight: 800 }}>{money(cur, t.billed)}</td>
              <td style={{ ...td, ...rnum, background: C.dark, color: '#fff', fontWeight: 800 }}>{money(cur, t.settled)}</td>
              <td style={{ ...td, ...rnum, background: C.dark, color: '#fff', fontWeight: 800 }}>{money(cur, t.total)}</td>
              <td style={{ ...td, ...rnum, background: C.dark, color: '#fff', fontWeight: 800 }}>{money(cur, t.net)}</td>
            </tr></tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ── Unsettled bills — bill-wise (not party-level) ─────────────────────────────
// The open documents themselves: every unsettled sales / purchase bill with its age
// and outstanding amount, sourced from the SAME outstanding engine as Finance ▸
// Receivables/Payables (`salesBills` / `purchaseBills`). Party-level settlement tells
// you WHO; this tells you WHICH BILL — so the accountant acts on the exact invoice.
// Each row taps through to that party's 360° worktop; the action opens receipt/payment.
function UnsettledBills({ title, bills, cur, tone, drill360, actionLabel, actionRoute, onDrillAll, go }) {
  const top = [...(bills || [])].sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0)).slice(0, 12);
  const tot = (bills || []).reduce((s, b) => s + (Number(b.outstanding) || 0), 0);
  const sh = { ...th, background: 'transparent' };
  const num = { ...td, ...rnum };
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden', flex: '1 1 480px', minWidth: 320 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: `1px solid ${C.border}` }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.dark }}>{title}</div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{(bills || []).length} open bill(s) · {money(cur, tot)} outstanding</div>
        </div>
        {onDrillAll && <button onClick={onDrillAll} style={{ ...aBtn(tone), padding: '4px 9px', fontSize: 10.5 }}>View all <ArrowRight size={11} /></button>}
      </div>
      <div style={{ maxHeight: 360, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ background: C.dark }}>
            <th style={sh}>Party</th>
            <th style={sh}>Bill No</th>
            <th style={{ ...sh, ...rnum }}>Age</th>
            <th style={{ ...sh, ...rnum }}>Outstanding</th>
            <th style={{ ...sh, textAlign: 'center' }}>Action</th>
          </tr></thead>
          <tbody>
            {top.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: C.green, padding: 18 }}>✓ Nothing unsettled.</td></tr>}
            {top.map((b, i) => (
              <tr key={b.billVno || i} {...clickable(() => go(`${drill360}?party=${encodeURIComponent(b.party)}`))} style={{ cursor: 'pointer', background: i % 2 ? '#fafbff' : '#fff' }}>
                <td style={{ ...td, fontWeight: 600, color: C.dark, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.party}<span style={{ color: tone, fontWeight: 800, marginLeft: 5 }}>›</span></td>
                <td style={{ ...td, fontFamily: 'monospace', color: tone, fontWeight: 700, whiteSpace: 'nowrap' }}>{b.billVno || '—'}</td>
                <td style={{ ...num, color: (b.ageDays || 0) > 90 ? C.red : C.dim }}>{b.ageDays != null ? `${b.ageDays}d` : '—'}</td>
                <td style={{ ...num, fontWeight: 800, color: tone }}>{money(cur, b.outstanding || 0)}</td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <button onClick={(e) => { e.stopPropagation(); go(actionRoute); }} style={{ ...aBtn(tone), padding: '3px 8px', fontSize: 10 }}>{actionLabel}</button>
                </td>
              </tr>
            ))}
          </tbody>
          {top.length > 0 && (
            <tfoot><tr style={{ position: 'sticky', bottom: 0 }}>
              <td colSpan={3} style={{ ...td, background: C.dark, color: C.gold, fontWeight: 800 }}>TOTAL · {(bills || []).length} bill(s)</td>
              <td style={{ ...td, ...rnum, background: C.dark, color: '#fff', fontWeight: 800 }}>{money(cur, tot)}</td>
              <td style={{ background: C.dark }} />
            </tr></tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// Month-to-date window (ISO) — shared by the live snapshot panels below.
const mtdWindow = () => { const ym = thisYM(); return { from: `${ym}-01`, to: new Date().toISOString().slice(0, 10) }; };

// ── Tier 1.1 · Short-term cash outlook ───────────────────────────────────────
// Forward view (the rest of Daily Ops is backward-looking): expected inflows vs
// outflows and the projected closing for the coming weeks, from the same cash-flow
// forecast engine as Finance ▸ Cash-flow Forecast. A projected NEGATIVE closing is
// flagged red — the branch can't cover that week's commitments.
export function CashOutlookCard({ branch, cur, go }) {
  const q = useCashForecast(branch);
  // The forecast endpoint returns an OBJECT { opening, rows } — NOT a bare array.
  // Reading `q.data || []` then `.slice` threw "(…).slice is not a function" because
  // the truthy object skipped the `|| []` fallback. The weekly series lives in `.rows`.
  const weeks = (q.data?.rows || []).slice(0, 4);
  return (
    <>
      <SecTitle>Cash-flow Outlook — next {weeks.length || 4} weeks</SecTitle>
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ background: C.dark }}>
            <th style={{ ...th, background: 'transparent' }}>Week</th>
            <th style={{ ...th, background: 'transparent', ...rnum }}>Expected In</th>
            <th style={{ ...th, background: 'transparent', ...rnum }}>Expected Out</th>
            <th style={{ ...th, background: 'transparent', ...rnum }}>Net</th>
            <th style={{ ...th, background: 'transparent', ...rnum }}>Proj. Closing</th>
          </tr></thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: C.dim, padding: 16 }}>Loading forecast…</td></tr>}
            {!q.isLoading && weeks.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: C.dim, padding: 16 }}>No upcoming due-dated bills to forecast.</td></tr>}
            {weeks.map((w, i) => {
              const net = (w.inflow || 0) - (w.outflow || 0);
              return (
                <tr key={i} style={{ background: i % 2 ? '#fafbff' : '#fff' }}>
                  <td style={{ ...td, fontWeight: 700 }}>{w.week || `W${i + 1}`}</td>
                  <td style={{ ...td, ...rnum, color: C.green }}>{money(cur, w.inflow || 0)}</td>
                  <td style={{ ...td, ...rnum, color: C.amber }}>{money(cur, w.outflow || 0)}</td>
                  <td style={{ ...td, ...rnum, fontWeight: 700, color: net >= 0 ? C.dark : C.red }}>{money(cur, net)}</td>
                  <td style={{ ...td, ...rnum, fontWeight: 800, color: (w.closing || 0) >= 0 ? C.dark : C.red }}>{money(cur, w.closing || 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => go('/reports/cashflow-forecast')} style={{ ...aBtn(C.blue), padding: '4px 9px', fontSize: 10.5 }}>13-Week Forecast <ArrowRight size={11} /></button>
        </div>
      </div>
    </>
  );
}

// ── Tier 1.2 · Post-dated cheque (PDC) tracker ───────────────────────────────
// Cheques received (inbound) and issued (outbound), from the PDC register. Surfaces
// what's due to bank, on-hand pending and — most importantly — bounced cheques that
// need re-presentation or follow-up. Manage on the Bank Reco screen's PDC tab.
function PdcTracker({ branch, cur, go }) {
  const inb = usePDCSummary(branch, { direction: 'inbound' }).data;
  const out = usePDCSummary(branch, { direction: 'outbound' }).data;
  const ic = inb?.counts || {}, ia = inb?.amounts || {};
  const oc = out?.counts || {}, oa = out?.amounts || {};
  const bouncedN = (ic.bounced || 0) + (oc.bounced || 0);
  const bouncedAmt = (ia.bounced || 0) + (oa.bounced || 0);
  return (
    <>
      <SecTitle>Post-Dated Cheques (PDC)</SecTitle>
      <Row>
        <Tile icon={<ReceiptText size={13} />} label="Received — Pending" value={money(cur, ia.pending || 0)} sub={`${ic.pending || 0} cheque(s)${inb?.dueToDeposit ? ` · ${inb.dueToDeposit} due to bank` : ''}`} tone={C.green} onClick={() => go('/bank-reco')} />
        <Tile icon={<CreditCard size={13} />} label="Issued — Pending" value={money(cur, oa.pending || 0)} sub={`${oc.pending || 0} cheque(s)${out?.dueToDeposit ? ` · ${out.dueToDeposit} due` : ''}`} tone={C.amber} onClick={() => go('/bank-reco')} />
        <Tile icon={<Landmark size={13} />} label="Deposited (in clearing)" value={money(cur, (ia.deposited || 0) + (oa.deposited || 0))} sub={`${(ic.deposited || 0) + (oc.deposited || 0)} awaiting clearance`} tone={C.blue} onClick={() => go('/bank-reco')} />
        <Tile icon={<AlertTriangle size={13} />} label="Bounced" value={bouncedN} sub={bouncedN ? `${money(cur, bouncedAmt)} · re-present / follow up` : 'none dishonoured'} tone={bouncedN ? C.red : C.green} onClick={() => go('/bank-reco')} />
      </Row>
    </>
  );
}

// ── Tier 1.3 · Approval worklist split ───────────────────────────────────────
// A single branch accountant needs to know what they can clear NOW vs what is stuck.
// Split the pending queue by the verification gate: `postable` entries are ready to
// approve & post; the rest are blocked and carry the reason (missing ledger, unbalanced,
// future date…). Blocked items are listed with their first error so they can be fixed.
function ApprovalSplit({ branch, cur, go, currentUser }) {
  const q = useVoucherApprovals(branch, 'pending');
  const entries = q.data?.entries || [];
  const sum = (arr) => arr.reduce((s, e) => s + (Number(e.total) || 0), 0);
  // Maker ≠ checker: a voucher this accountant entered can't be self-approved — it
  // needs another approver (Director). Match the entry's submittedBy to the current
  // user (name / email / id). No user → everything postable counts as actionable.
  const me = [currentUser?.name, currentUser?.email, currentUser?.id].filter(Boolean).map((s) => String(s).toLowerCase());
  const isMine = (e) => !!e.submittedBy && me.includes(String(e.submittedBy).toLowerCase());
  const postable = entries.filter((e) => e.postable);
  const mine = postable.filter(isMine);                 // I entered it → blocked on another approver
  const ready = postable.filter((e) => !isMine(e));     // I may approve & post
  const blocked = entries.filter((e) => !e.postable);   // fails a verification check
  return (
    <>
      <SecTitle>Approve &amp; Post — worklist</SecTitle>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ ...card, padding: 12, flex: '1 1 260px', minWidth: 240, borderLeft: `4px solid ${C.green}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: C.dark }}>I can approve · {ready.length}</span>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: C.green }}>{money(cur, sum(ready))}</span>
          </div>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>Passes every check &amp; entered by someone else — approve &amp; post.</div>
          <button onClick={() => go('/transactions/approvals')} style={{ ...aBtn(C.green), padding: '4px 10px', fontSize: 11 }} disabled={!ready.length}>Open approvals <ArrowRight size={11} /></button>
        </div>
        <div style={{ ...card, padding: 12, flex: '1 1 260px', minWidth: 240, borderLeft: `4px solid ${mine.length ? C.amber : C.green}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: C.dark }}>My own — needs approver · {mine.length}</span>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: mine.length ? C.amber : C.green }}>{money(cur, sum(mine))}</span>
          </div>
          {mine.length === 0
            ? <div style={{ fontSize: 11.5, color: C.green }}>✓ None of yours awaiting another approver.</div>
            : <div style={{ fontSize: 11, color: C.dim }}>You entered these — a second person (Director) must approve. Maker ≠ checker.</div>}
        </div>
        <div style={{ ...card, padding: 12, flex: '1 1 320px', minWidth: 280, borderLeft: `4px solid ${blocked.length ? C.red : C.green}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: C.dark }}>Blocked — needs fixing · {blocked.length}</span>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: blocked.length ? C.red : C.green }}>{money(cur, sum(blocked))}</span>
          </div>
          {blocked.length === 0 && <div style={{ fontSize: 11.5, color: C.green }}>✓ Nothing blocked.</div>}
          {blocked.slice(0, 3).map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: i ? '1px solid #dfe2e7' : 'none' }}>
              <span style={{ flex: 1, fontSize: 11.5, color: C.dark, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <b style={{ fontFamily: 'monospace' }}>{e.vno || 'Draft'}</b> {e.party || e.category}
                <span style={{ color: C.red, fontWeight: 600 }}> · {(e.errors && e.errors[0]) || e.error || 'cannot post'}</span>
              </span>
            </div>
          ))}
          {blocked.length > 0 && <button onClick={() => go('/transactions/approvals')} style={{ ...aBtn(C.red), padding: '4px 10px', fontSize: 11, marginTop: 8 }}>Fix &amp; clear <ArrowRight size={11} /></button>}
        </div>
      </div>
    </>
  );
}

// ── Tier 2.4 · GST / Input-Tax-Credit position ───────────────────────────────
// Output tax vs claimable Input Tax Credit (ITC) → net liability for the month, live
// from the books (same source as the Tax Summary report). The "ITC match" drill opens
// GSTR-2B reconciliation, where 2B is matched against the purchase register.
function GstItcPanel({ branch, cur, go, from, to }) {
  const w = mtdWindow();
  const f = from || w.from, t2 = to || w.to;
  const tax = useTaxSummary(branch, { from: f, to: t2 }).data || {};
  const rcm = useRcmLiability(branch, { from: f, to: t2 }).data || {};
  const regime = (tax.regime || 'GST');
  const output = tax.output?.total || 0;
  const input = tax.input?.total || 0;     // claimable ITC
  const net = (typeof tax.netPayable === 'number') ? tax.netPayable : (output - input);
  const rcmIgst = rcm.igst || 0;
  return (
    <>
      <SecTitle>{regime} / Input-Tax-Credit position{from ? '' : ' (this month)'}</SecTitle>
      <Row>
        <Tile icon={<TrendingUp size={13} />} label="Output Tax (on sales)" value={money(cur, output)} sub="Open tax summary" tone={C.blue} onClick={() => go('/reports/tax-summary')} />
        <Tile icon={<TrendingDown size={13} />} label="Input Credit (ITC)" value={money(cur, input)} sub="claimable on purchases" tone={C.green} onClick={() => go('/reports/tax-summary')} />
        <Tile icon={<Scale size={13} />} label={net >= 0 ? 'Net Payable' : 'Net Refundable'} value={money(cur, Math.abs(net))} sub="due 20th · cash to pay" tone={net > 0 ? C.amber : C.green} onClick={() => go('/reports/tax-summary')} />
        {/* Reverse charge on foreign-supplier purchases — pay in cash (3.1(d)) + claim ITC (4A) */}
        <Tile icon={<ReceiptText size={13} />} label="RCM (Reverse Charge)" value={money(cur, rcmIgst)} sub={rcm.count ? `${rcm.count} foreign bill(s) · pay + claim ITC` : 'no foreign-supplier purchases'} tone={rcmIgst > 0 ? C.amber : C.green} onClick={() => go('/tax/rcm')} />
      </Row>
      {/* GSTR-2B ITC match is a true reconciliation against downloaded 2B — open the
          2B screen to match it line-wise against the purchase register. */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4, marginBottom: 12 }}>
        <button onClick={() => go('/tax/gstr2b')} style={{ ...aBtn(C.dark), padding: '4px 9px', fontSize: 10.5 }}>Match ITC vs GSTR-2B <ArrowRight size={11} /></button>
      </div>
    </>
  );
}

// ── Tier 2.5 · Refunds & adjustments worklist ────────────────────────────────
// Travel-specific adjustment vouchers (Refund / Reissue / ADM / ACM) still pending
// approval. These reverse or amend a booking and must be posted promptly so AR/AP
// reflects reality. Listed straight from the pending approval queue.
const ADJ_CATS = ['refund', 'reissue', 'adm', 'acm'];
const ADJ_LABEL = { refund: 'Refund', reissue: 'Reissue', adm: 'ADM', acm: 'ACM' };
function RefundsWorklist({ branch, cur, go }) {
  // INB refunds route to the INB pipeline, so exclude them here (this tile links to the
  // SO/PO/GP approvals queue, which no longer lists them).
  const q = useVoucherApprovals(branch, 'pending', { refundScope: 'sopogp' });
  const rows = (q.data?.entries || []).filter((e) => ADJ_CATS.includes(e.category));
  const total = rows.reduce((s, e) => s + (Number(e.total) || 0), 0);
  return (
    <div style={{ ...card, padding: 12, flex: '1 1 360px', minWidth: 300 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.dark, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Refunds &amp; adjustments pending</span>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: rows.length ? C.amber : C.green }}>{rows.length} · {money(cur, total)}</span>
      </div>
      {rows.length === 0 && <div style={{ fontSize: 12, color: C.green, padding: 8 }}>✓ No RF / RI / ADM / ACM pending.</div>}
      {rows.slice(0, 8).map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: i ? '1px solid #dfe2e7' : 'none' }}>
          <span style={{ padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', color: C.dim }}>{ADJ_LABEL[e.category] || e.category}</span>
          <span style={{ flex: 1, fontSize: 12, color: C.dark, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.party || e.vno}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: C.dark, fontVariantNumeric: 'tabular-nums' }}>{money(cur, e.total || 0)}</span>
          {!e.postable && <span style={{ fontSize: 9.5, fontWeight: 800, color: C.red }}>blocked</span>}
        </div>
      ))}
      {rows.length > 0 && <button onClick={() => go('/transactions/approvals')} style={{ ...aBtn(C.blue), padding: '4px 9px', fontSize: 10.5, marginTop: 8 }}>Open approvals <ArrowRight size={11} /></button>}
    </div>
  );
}

// ── Tier 2.6 · Advances & unapplied credits (both sides) ─────────────────────
// Money sitting on account that hasn't been settled bill-wise: customer receipts not
// yet applied to invoices, and supplier advances not yet applied to bills. Both must
// be cleared so the ageing is real and prepaid money isn't lost. Settle from the
// receivables / payables screens.
// `side` scopes the panel to one ledger side so it can live under the AR or AP
// sub-tab: 'rec' → customer credits only, 'pay' → supplier advances only, 'both'
// → the original two-up layout (kept as the default so any other caller is unchanged).
function AdvancesPanel({ branch, cur, go, side = 'both' }) {
  const out = useOutstanding(branch).data || {};
  const recs = out.onAccountReceipts || [];
  const pays = out.onAccountPayments || [];
  const recTot = out.totals?.onAccountReceipts ?? recs.reduce((s, r) => s + (Number(r.onAccount) || 0), 0);
  const payTot = out.totals?.onAccountPayments ?? pays.reduce((s, r) => s + (Number(r.onAccount) || 0), 0);
  // `drill360` makes each on-account row tap through to that party's 360° worktop,
  // so the accountant can allocate the advance against the party's open bills.
  const block = (title, list, tot, tone, route, drill360) => (
    <div style={{ ...card, padding: 12, flex: '1 1 340px', minWidth: 300 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.dark, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        <span>{title}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: tone }}>{money(cur, tot)}</span>
      </div>
      {list.length === 0 && <div style={{ fontSize: 12, color: C.green, padding: 6 }}>✓ Nothing unapplied.</div>}
      {list.slice(0, 6).map((r, i) => (
        <div key={i} {...clickable(() => go(`${drill360}?party=${encodeURIComponent(r.party)}`))} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: i ? '1px solid #dfe2e7' : 'none' }}>
          <span style={{ flex: 1, fontSize: 12, color: C.dark, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.party}<span style={{ color: tone, fontWeight: 800, marginLeft: 4 }}>›</span>{r.vno ? <span style={{ color: C.dim, fontWeight: 500 }}> · {r.vno}</span> : ''}</span>
          {r.ageDays != null && <span style={{ fontSize: 10.5, color: C.dim }}>{r.ageDays}d</span>}
          <span style={{ fontSize: 12, fontWeight: 800, color: tone, fontVariantNumeric: 'tabular-nums' }}>{money(cur, r.onAccount || 0)}</span>
        </div>
      ))}
      {list.length > 0 && <button onClick={() => go(route)} style={{ ...aBtn(tone), padding: '4px 9px', fontSize: 10.5, marginTop: 8 }}>Settle bill-wise <ArrowRight size={11} /></button>}
    </div>
  );
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
      {side !== 'pay' && block('Customer credits — unapplied receipts', recs, recTot, C.blue, '/reports/rec', '/reports/customer-360')}
      {side !== 'rec' && block('Supplier advances — unapplied payments', pays, payTot, C.amber, '/reports/pay', '/reports/supplier-360')}
    </div>
  );
}

// ── Tier 3.7 · Branch P&L snapshot ───────────────────────────────────────────
// One health read for the month: revenue, purchase (COGS), gross profit (with %),
// indirect expenses and the net profit — live from the module-wise P&L engine.
function BranchPnlSnapshot({ branch, cur, go, from, to, prior }) {
  const w = mtdWindow();
  const f = from || w.from, t2 = to || w.to;
  const q = useModulePL(branch, { from: f, to: t2, summary: true });
  const t = q.data?.totals || {}; const ind = q.data?.indirect || {}; const br = q.data?.bridge || {};
  const np = br.netProfit || 0;
  // Prior-window totals (passed in) → period-over-period delta chips on the three
  // headline figures (revenue · gross profit · net profit).
  const pt = prior?.totals || {}; const pbr = prior?.bridge || {};
  return (
    <>
      <SecTitle>Branch P&amp;L snapshot{from ? '' : ' (this month)'}</SecTitle>
      <Row>
        <Tile icon={<TrendingUp size={13} />} label="Revenue" value={money(cur, t.sales || 0)} sub={prior ? <>vs prior <Delta cur={t.sales || 0} prev={pt.sales || 0} /></> : 'Open P&L'} tone={C.green} onClick={() => go('/reports/pnl')} loading={q.isLoading} />
        <Tile icon={<TrendingDown size={13} />} label="Purchase (COGS)" value={money(cur, t.cogs || 0)} sub="cost of sales" tone={C.amber} onClick={() => go('/reports/pnl')} loading={q.isLoading} />
        <Tile icon={<Coins size={13} />} label="Gross Profit" value={money(cur, t.gp || 0)} sub={prior ? <>{(t.gpPct || 0).toFixed(1)}% · <Delta cur={t.gp || 0} prev={pt.gp || 0} /></> : `${(t.gpPct || 0).toFixed(1)}% margin`} tone={C.blue} onClick={() => go('/reports/invoice-gp')} loading={q.isLoading} />
        <Tile icon={<ReceiptText size={13} />} label="Expenses" value={money(cur, ind.expense || 0)} sub="indirect expenses" tone={C.dim} onClick={() => go('/reports/pnl')} loading={q.isLoading} />
        <Tile icon={<Scale size={13} />} label="Net Profit" value={money(cur, np)} sub={prior ? <><Delta cur={np} prev={pbr.netProfit || 0} /></> : (np >= 0 ? 'profit' : 'loss')} tone={np >= 0 ? C.green : C.red} onClick={() => go('/reports/pnl')} loading={q.isLoading} />
      </Row>
    </>
  );
}

// ── Tier 3.8 · All-banks reconciliation roll-up ──────────────────────────────
// One row per bank ledger so nothing slips: book balance, unreconciled difference and
// open unmatched counts at a glance (vs the single-bank detail card). Each row queries
// its own reco summary (deduped with the detail card by React-Query key).
function BankRecoRow({ ledger, branch, cur, go }) {
  const w = mtdWindow();
  const s = useBankReconSummary(ledger, branch, { from: w.from, to: w.to }).data;
  const diff = s?.differenceAmount ?? null;
  const open = (s?.counts?.bookUnreconciled || 0) + (s?.counts?.statementUnreconciled || 0);
  return (
    <tr {...clickable(() => go('/bank-reco'))} style={{ cursor: 'pointer', borderTop: '1px solid #dfe2e7' }}>
      <td style={{ ...td, fontWeight: 600 }}>{ledger}</td>
      <td style={{ ...td, ...rnum }}>{s ? money(cur, s.bookBalance || 0) : '…'}</td>
      <td style={{ ...td, ...rnum }}>{s ? money(cur, s.bankBalance || 0) : '…'}</td>
      <td style={{ ...td, ...rnum, fontWeight: 800, color: diff == null ? C.dim : (Math.abs(diff) < 1 ? C.green : C.red) }}>{diff == null ? '…' : money(cur, diff)}</td>
      <td style={{ ...td, ...rnum, fontWeight: 700, color: open > 0 ? C.amber : C.green }}>{s ? open : '…'}</td>
    </tr>
  );
}
function BankRecoRollup({ branch, cur, go }) {
  const ledgers = useBankLedgers(branch).data || [];
  if (!ledgers.length) return null;
  return (
    <>
      <SecTitle>Bank Reconciliation — all accounts</SecTitle>
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ background: C.dark }}>
            <th style={{ ...th, background: 'transparent' }}>Bank Ledger</th>
            <th style={{ ...th, background: 'transparent', ...rnum }}>Book Bal</th>
            <th style={{ ...th, background: 'transparent', ...rnum }}>Statement</th>
            <th style={{ ...th, background: 'transparent', ...rnum }}>Difference</th>
            <th style={{ ...th, background: 'transparent', ...rnum }}>Open Lines</th>
          </tr></thead>
          <tbody>
            {ledgers.map((lg) => <BankRecoRow key={lg.name} ledger={lg.name} branch={branch} cur={cur} go={go} />)}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Tier 3.9 · Master-data health ────────────────────────────────────────────
// Tax-relevant gaps in the customer / supplier masters that silently drive WRONG GST
// or TDS: an Indian supplier with no GSTIN can't pass on ITC; no PAN means TDS at the
// higher default rate. Foreign suppliers (country ≠ India) are correctly NOT flagged
// for GSTIN. Counts only — drill into the master to fix.
function MasterHealth({ branch, go }) {
  const sup = useMasterHealth('suppliers', branch).data || {};
  const cust = useMasterHealth('customers', branch).data || {};
  const item = (label, n, route, hint) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderTop: '1px solid #dfe2e7' }}>
      <span style={{ width: 22, textAlign: 'center', fontWeight: 800, color: n ? C.red : C.green }}>{n || '✓'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.dark }}>{label}</div>
        <div style={{ fontSize: 11, color: C.dim }}>{hint}</div>
      </div>
      <button onClick={() => go(route)} style={{ ...aBtn(n ? C.amber : C.blue), padding: '3px 8px', fontSize: 10 }}>Open</button>
    </div>
  );
  return (
    <>
      <SecTitle>Master-data health (tax readiness)</SecTitle>
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        {item('Indian suppliers missing GSTIN', sup.noGstin || 0, '/masters/suppliers', 'Cannot claim input tax credit on their bills')}
        {item('Indian suppliers missing PAN', sup.noPan || 0, '/masters/suppliers', 'TDS deducted at the higher default rate')}
        {item('Suppliers missing place-of-supply (state)', sup.noState || 0, '/masters/suppliers', 'CGST/SGST vs IGST cannot be decided')}
        {item('Customers missing GSTIN & PAN', cust.noTaxId || 0, '/masters/customers', 'Incomplete tax identity on the invoice')}
        {item('Customers missing place-of-supply (state)', cust.noState || 0, '/masters/customers', 'Place of supply unknown on the invoice')}
      </div>
    </>
  );
}

// ── ISO date math (string in → string out, no timezone drift) ────────────────
const addDaysISO = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);

// ── Inline SVG sparkline ──────────────────────────────────────────────────────
// Renders a tiny trend line for a numeric series; harmless (empty box) when the
// series is empty or all-zero, so the component never crashes on missing data.
function Sparkline({ values = [], color = C.blue, w = 150, h = 34 }) {
  const nums = (values || []).map((v) => Number(v) || 0);
  const max = Math.max(1, ...nums), min = Math.min(0, ...nums);
  const span = (max - min) || 1;
  const pts = nums.map((v, i) => {
    const x = nums.length > 1 ? (i / (nums.length - 1)) * (w - 4) + 2 : w / 2;
    const y = h - 2 - ((v - min) / span) * (h - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {pts.length > 1 && <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
      {pts.map((p, i) => { const [x, y] = p.split(','); return <circle key={i} cx={x} cy={y} r={1.6} fill={color} />; })}
    </svg>
  );
}

// ── Performance · 6-month P&L trend ───────────────────────────────────────────
// Last 6 calendar-month windows, each fetched from the module-PL engine, drawn as
// three sparklines (sales · gross profit · net profit). Only mounts when the
// Performance tab is active. Renders harmlessly when every window returns empty.
function PnlTrend({ branch }) {
  const code = branchCode(branch);
  const months = useMemo(() => {
    const out = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const to = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
      out.push({ label: from.slice(0, 7), from, to });
    }
    return out;
  }, []);
  const results = useQueries({
    queries: months.map((m) => ({
      queryKey: ['accounting', 'module-pl', code || 'all', m.from, m.to, false, true, false],
      queryFn: () => apiGet('/api/accounting/module-pl', { branch: code, from: m.from, to: m.to, summary: 1 }),
      staleTime: 60_000,
    })),
  });
  const sales = results.map((r) => r.data?.totals?.sales || 0);
  const gp = results.map((r) => r.data?.totals?.gp || 0);
  const np = results.map((r) => r.data?.bridge?.netProfit || 0);
  const cur = (bc(branch) || {}).cur || '₹';
  const block = (label, vals, color) => (
    <div style={{ ...card, padding: 12, flex: '1 1 220px', minWidth: 200 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>{label} — 6 mo</div>
      <Sparkline values={vals} color={color} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10.5, color: C.dim }}>
        <span>{months[0]?.label}</span><span style={{ fontWeight: 800, color }}>{money(cur, vals[vals.length - 1] || 0)}</span>
      </div>
    </div>
  );
  return (
    <>
      <SecTitle>Trend — last 6 months</SecTitle>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {block('Sales', sales, C.green)}
        {block('Gross Profit', gp, C.blue)}
        {block('Net Profit', np, C.dark)}
      </div>
    </>
  );
}

// ── Performance · Targets vs Actual (FY) ─────────────────────────────────────
// Director-set yearly targets (Sales / GP / NP) vs the FY-to-date actuals, as three
// progress bars. Targets persist in app-config (key targets:<branch>:<fy>) via the
// generic config hooks — NO new backend. Actuals come from the module-PL engine over
// the whole current financial year (inception-of-FY → today), independent of the
// dashboard's selected period, so the bars always read "FY-to-date vs FY target".
// An inline editor writes the three numbers; a role-gated PUT surfaces a message,
// never crashes. Unset / 0 target → an honest "no target set".
function TargetsVsActual({ branch, cur, fyActual, fyModules = [] }) {
  const code = branchCode(branch);
  const fyKey = `targets:${code || 'ALL'}:${CUR_FY.label}`;
  const saved = useConfigValue(fyKey).data || {};
  const saveCfg = useSaveConfigValue();
  const [draft, setDraft] = useState(null);            // null → show saved; object → editing
  const [err, setErr] = useState('');
  const t = draft || saved;
  const sales = Number(saved.salesYearly) || 0;
  const gp = Number(saved.gpYearly) || 0;
  const np = Number(saved.npYearly) || 0;
  const savedMods = saved.modules || {};
  // FY actual sales per module (cost-centre P&L pivot), biggest first.
  const mods = [...(fyModules || [])].sort((a, b) => (b.sales || 0) - (a.sales || 0));

  const save = () => {
    setErr('');
    const value = {
      salesYearly: Number(t.salesYearly) || 0,
      gpYearly: Number(t.gpYearly) || 0,
      npYearly: Number(t.npYearly) || 0,
      // Per-module Sales targets (only non-zero kept), keyed by module key.
      modules: Object.fromEntries(Object.entries(t.modules || {})
        .map(([k, v]) => [k, Number(v) || 0]).filter(([, v]) => v > 0)),
    };
    saveCfg.mutate(
      { key: fyKey, value, description: `FY targets ${CUR_FY.label} · ${code || 'ALL'}` },
      { onSuccess: () => setDraft(null), onError: (e) => setErr(e?.message || 'Could not save (permission?)') },
    );
  };

  const bar = (label, actual, target, tone) => {
    const has = target > 0;
    const pct = has ? (actual / target) * 100 : 0;
    const met = has && actual >= target;
    const toGo = Math.max(0, target - actual);
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: C.dark }}>{label}</span>
          {has
            ? <span style={{ fontSize: 11.5, color: C.dim }}><b style={{ color: tone }}>{money(cur, actual)}</b> of <b>{money(cur, target)}</b> · <b style={{ color: met ? C.green : C.dark }}>{pct.toFixed(0)}%</b></span>
            : <span style={{ fontSize: 11.5, color: C.dim }}>no target set</span>}
        </div>
        <div style={{ height: 12, borderRadius: 6, background: '#eef0f4', overflow: 'hidden', marginTop: 6 }}>
          <div style={{ height: '100%', width: `${has ? Math.min(100, Math.max(0, pct)) : 0}%`, background: met ? C.green : tone, borderRadius: 6 }} />
        </div>
        <div style={{ fontSize: 10.5, color: met ? C.green : C.dim, marginTop: 3, fontWeight: 700 }}>
          {has ? (met ? 'target met' : `${money(cur, toGo)} to go`) : 'set a target below'}
        </div>
      </div>
    );
  };
  const nInp = (k) => (
    <input type="number" value={t[k] ?? ''} placeholder="0"
      onChange={(e) => setDraft({ ...t, [k]: e.target.value })}
      style={{ width: 120, padding: '5px 8px', fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none' }} />
  );
  // Per-module target input edits t.modules[key] (preserved across the draft).
  const mInp = (key) => {
    const m = t.modules || {};
    return (
      <input type="number" value={m[key] ?? ''} placeholder="0"
        onChange={(e) => setDraft({ ...t, modules: { ...m, [key]: e.target.value } })}
        style={{ width: 110, padding: '4px 7px', fontSize: 11.5, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', textAlign: 'right' }} />
    );
  };

  return (
    <>
      <SecTitle>Targets vs Actual (FY {CUR_FY.label})</SecTitle>
      <div style={{ ...card, padding: 14, marginBottom: 16 }}>
        {bar('Sales', fyActual.sales, sales, C.green)}
        {bar('Gross Profit', fyActual.gp, gp, C.blue)}
        {bar('Net Profit', fyActual.np, np, C.dark)}

        {/* Per-module Sales target vs FY actual — set a target per Flight / Holiday /
            Hotel … so the branch can steer each line, not just the top line. */}
        {mods.length > 0 && (
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 6, paddingTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Module-wise Sales targets (FY)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>
                <th style={{ ...th, background: 'transparent', color: C.dim }}>Module</th>
                <th style={{ ...th, background: 'transparent', color: C.dim, ...rnum }}>FY Actual</th>
                <th style={{ ...th, background: 'transparent', color: C.dim, ...rnum }}>Target</th>
                <th style={{ ...th, background: 'transparent', color: C.dim, ...rnum }}>%</th>
                <th style={{ ...th, background: 'transparent', color: C.dim, width: 130 }}>Set target</th>
              </tr></thead>
              <tbody>
                {mods.map((m) => {
                  const act = m.sales || 0;
                  const tgt = Number(savedMods[m.key]) || 0;
                  const has = tgt > 0;
                  const pct = has ? (act / tgt) * 100 : 0;
                  const met = has && act >= tgt;
                  return (
                    <tr key={m.key} style={{ borderTop: '1px solid #eef0f4' }}>
                      <td style={{ ...td, fontWeight: 600 }}>{m.icon ? `${m.icon} ` : ''}{m.name || m.key}</td>
                      <td style={{ ...td, ...rnum, fontWeight: 700 }}>{money(cur, act)}</td>
                      <td style={{ ...td, ...rnum, color: C.dim }}>{has ? money(cur, tgt) : '—'}</td>
                      <td style={{ ...td, ...rnum, fontWeight: 800, color: !has ? C.dim : (met ? C.green : C.amber) }}>{has ? `${pct.toFixed(0)}%` : '—'}</td>
                      <td style={{ ...td }}>{mInp(m.key)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 10, paddingTop: 10, display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.dim }}>Sales target<br />{nInp('salesYearly')}</label>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.dim }}>GP target<br />{nInp('gpYearly')}</label>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.dim }}>NP target<br />{nInp('npYearly')}</label>
          <button onClick={save} disabled={!draft || saveCfg.isPending} style={{ ...aBtn(C.blue), opacity: (!draft || saveCfg.isPending) ? 0.6 : 1 }}>{saveCfg.isPending ? 'Saving…' : 'Save targets'}</button>
          {err && <span style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>{err}</span>}
        </div>
      </div>
    </>
  );
}

// ── Performance · Budget vs Actual (indirect expenses) ───────────────────────
// Actual indirect spend (budget-vs-actual engine) against the branch's monthly
// expense budgets scaled to the selected period. A simple utilisation bar; empty
// budgets → an honest "no budget set" instead of a misleading 0%.
function BudgetVsActual({ branch, cur, go, from, to }) {
  const bva = useBudgetVsActual(branch, { from, to }).data || {};
  const budgets = useExpenseBudgets().data || [];
  const code = branchCode(branch);
  const actual = (bva.rows || []).reduce((s, r) => s + (Number(r.actual) || 0), 0);
  // Calendar months spanned by [from,to] inclusive, from the YYYY-MM parts —
  // e.g. 2026-04-01 → 2026-06-27 = 3 months (not ~88/30 ≈ 3, but exact across
  // any day-of-month). Clamp to >= 1 so a same-month window still bills 1 month.
  const monthSpan = (a, b) => {
    const [ya, ma] = String(a || '').split('-').map(Number);
    const [yb, mb] = String(b || '').split('-').map(Number);
    if (!ya || !ma || !yb || !mb) return 1;
    return Math.max(1, (yb - ya) * 12 + (mb - ma) + 1);
  };
  const months = monthSpan(from, to);
  const monthlyBudget = (budgets || [])
    .filter((b) => !code || !b.branch || String(b.branch) === String(code))
    .reduce((s, b) => s + (Number(b.monthly) || 0), 0);
  const budget = monthlyBudget * months;
  const hasBudget = budget > 0;
  const util = hasBudget ? (actual / budget) * 100 : 0;
  const over = util > 100;
  return (
    <>
      <SecTitle>Budget vs Actual — indirect expenses{from ? '' : ' (this month)'}</SecTitle>
      <div style={{ ...card, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.dark }}>
            Actual <b style={{ color: C.amber }}>{money(cur, actual)}</b>{hasBudget ? <> of budget <b>{money(cur, budget)}</b> <span style={{ fontSize: 11, color: C.dim }}>({months} mo)</span></> : <span style={{ color: C.dim }}> · no budget set</span>}
          </div>
          {hasBudget && <span style={{ fontSize: 13, fontWeight: 800, color: over ? C.red : C.green }}>{util.toFixed(0)}% used</span>}
        </div>
        {hasBudget && (
          <div style={{ height: 12, borderRadius: 6, background: '#eef0f4', overflow: 'hidden', marginTop: 8 }}>
            <div style={{ height: '100%', width: `${Math.min(100, util)}%`, background: over ? C.red : C.green, borderRadius: 6 }} />
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={() => go('/reports/expense-budget')} style={{ ...aBtn(C.blue), padding: '4px 9px', fontSize: 10.5 }}>View by head <ArrowRight size={11} /></button>
        </div>
      </div>
    </>
  );
}

// ── Overview · Branch Health traffic-light rollup ────────────────────────────
// One green/amber/red verdict from four sub-checks (approvals clear · TB balanced ·
// GP healthy · compliance ok). Red if any CRITICAL check fails, amber on a minor
// miss, green when all pass. Each sub-check shows its own tick/cross.
function BranchHealth({ checks }) {
  const fails = checks.filter((c) => !c.ok);
  const critFail = fails.some((c) => c.critical);
  const tone = critFail ? C.red : (fails.length ? C.amber : C.green);
  const verdict = critFail ? 'Needs attention' : (fails.length ? 'Minor issues' : 'Healthy');
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 16, borderLeft: `4px solid ${tone}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ width: 14, height: 14, borderRadius: 999, background: tone, flexShrink: 0 }} />
        <div style={{ fontSize: 14, fontWeight: 800, color: C.dark }}>Branch Health — {verdict}</div>
        <div style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: C.dim }}>{checks.length - fails.length}/{checks.length} checks pass</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {checks.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', flex: '1 1 240px', minWidth: 220, borderTop: '1px solid #eef0f4' }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 11, background: c.ok ? C.green : (c.critical ? C.red : C.amber) }}>{c.ok ? '✓' : '✕'}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Overview · Exception Radar ───────────────────────────────────────────────
// Aggregated "things that are wrong right now": only the rows with a non-zero count
// show, each with a one-click drill; a green "all clear" when nothing fires.
function ExceptionRadar({ rows, go }) {
  const live = (rows || []).filter((r) => (r.n || 0) > 0);
  return (
    <>
      <SecTitle>Exception Radar</SecTitle>
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        {live.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', color: C.green }}>
            <CheckCircle2 size={16} /><span style={{ fontSize: 12.5, fontWeight: 700 }}>All clear — no exceptions detected.</span>
          </div>
        )}
        {live.map((r, i) => (
          <div key={i} {...(r.route ? clickable(() => go(r.route)) : {})} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: i ? '1px solid #eef0f4' : 'none', cursor: r.route ? 'pointer' : 'default' }}>
            <span style={{ width: 26, textAlign: 'center', fontWeight: 800, color: C.red, fontVariantNumeric: 'tabular-nums' }}>{r.n}</span>
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: C.dark }}>{r.label}</span>
            {r.route && <button onClick={(e) => { e.stopPropagation(); go(r.route); }} style={{ ...aBtn(C.amber), padding: '3px 8px', fontSize: 10 }}>Open <ArrowRight size={10} /></button>}
          </div>
        ))}
      </div>
    </>
  );
}

// ── R&P · DSO / DPO / CCC strip ──────────────────────────────────────────────
// Working-capital velocity: Days Sales Outstanding, Days Payables Outstanding and
// the Cash Conversion Cycle. Guards divide-by-zero (no sales/cogs → "—").
function DsoDpoStrip({ cur, rec, pay, periodSales, periodCogs }) {
  const dso = periodSales > 0 ? (rec.total || 0) / (periodSales / 365) : null;
  const dpo = periodCogs > 0 ? (pay.total || 0) / (periodCogs / 365) : null;
  const ccc = (dso != null && dpo != null) ? dso - dpo : null;
  const tile = (label, v, hint, tone) => (
    <div style={{ ...card, padding: 14, flex: '1 1 200px', minWidth: 180, borderLeft: `4px solid ${tone}` }}>
      <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 800, color: tone, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{v == null ? '—' : `${Math.round(v)} d`}</div>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{hint}</div>
    </div>
  );
  return (
    <>
      <SecTitle>Working-capital velocity</SecTitle>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {tile('DSO — days sales outstanding', dso, 'avg days to collect a sale', C.blue)}
        {tile('DPO — days payables outstanding', dpo, 'avg days we take to pay', C.amber)}
        {tile('CCC — cash conversion cycle', ccc, 'DSO − DPO · lower is better', (ccc != null && ccc <= 0) ? C.green : C.dark)}
      </div>
    </>
  );
}

// ── R&P · stacked ageing bars ────────────────────────────────────────────────
// Horizontal stacked bar of the four ageing buckets for one side, with a legend.
const AGE_SEGMENTS = [['d0', '0–30', C.green], ['d30', '31–60', C.blue], ['d60', '61–90', C.amber], ['d90', '90+', C.red]];
function AgeingBars({ cur, rec, pay }) {
  const bar = (label, t, tone) => {
    const total = (t.d0 || 0) + (t.d30 || 0) + (t.d60 || 0) + (t.d90 || 0);
    return (
      <div style={{ ...card, padding: 14, flex: '1 1 360px', minWidth: 320 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: C.dark }}>{label}</span>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: tone }}>{money(cur, total)}</span>
        </div>
        <div style={{ display: 'flex', height: 16, borderRadius: 6, overflow: 'hidden', background: '#eef0f4' }}>
          {total > 0 && AGE_SEGMENTS.map(([k, , col]) => (t[k] || 0) > 0 ? <div key={k} title={`${k}: ${money(cur, t[k])}`} style={{ width: `${((t[k] || 0) / total) * 100}%`, background: col }} /> : null)}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          {AGE_SEGMENTS.map(([k, lbl, col]) => (
            <span key={k} style={{ fontSize: 10.5, color: C.dim, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: col }} />{lbl}: <b style={{ color: C.dark }}>{money(cur, t[k] || 0)}</b>
            </span>
          ))}
        </div>
      </div>
    );
  };
  return (
    <>
      <SecTitle>Ageing distribution — Debtors vs Creditors</SecTitle>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {bar('Debtors ageing', rec, C.blue)}
        {bar('Creditors ageing', pay, C.amber)}
      </div>
    </>
  );
}

export function DashboardAccountant({ branch: branchProp, setRoute, currentUser }) {
  // One accountant per branch: never a consolidated ALL view — coerce to the
  // accountant's own branch (from their profile) so every figure is theirs to act on.
  // Falls back to the selector value when the user carries no branch (e.g. an admin).
  const ownCode = currentUser?.branches?.[0];
  const branch = (branchProp && branchProp !== 'ALL') ? branchProp : (ownCode || branchProp);
  const cur = (bc(branch) || {}).cur || '₹';
  const go = (r) => setRoute && setRoute(r);
  const ym = thisYM();
  const monthFrom = `${ym}-01`;
  const today = new Date().toISOString().slice(0, 10);

  // ── Global period control ───────────────────────────────────────────────────
  // Drives FLOW figures (P&L, tax, collected/paid) only; balances & ageing stay
  // as-of `to`, the pending-approval worklist stays live. Custom range overrides
  // the preset; CM is the 'mtd' preset.
  const [pp, setPp] = useState('cfy');
  const [customRange, setCustomRange] = useState(null);
  const inc = useInception(branch).data?.from;
  const range = customRange?.from && customRange?.to ? { ...customRange, label: 'Custom' } : periodRange(pp, { branch, inception: inc });
  const from = range.from, to = range.to;
  // Prior comparable window (same length, ending the day before `from`).
  const priorTo = addDaysISO(from, -1);
  const priorFrom = addDaysISO(priorTo, -Math.max(0, daysBetween(from, to)));

  // Keep the query objects (not just .data) so tiles can show a skeleton while their
  // source query is loading instead of flashing a 0 / blank number.
  const ageQ = useAgeing(branch, to); const age = ageQ.data || {};
  // GST is a PERIODIC return — scope to the selected period (a bare call is inception-to-date).
  const taxQ = useTaxSummary(branch, { from, to }); const tax = taxQ.data || {};
  // Period P&L headline + the prior-window comparison for the delta chips.
  const plQ = useModulePL(branch, { from, to, summary: true }); const pl = plQ.data || {};
  const priorPl = useModulePL(branch, { from: priorFrom, to: priorTo, summary: true }).data || {};
  // FY-to-date actuals for the Targets-vs-Actual panel — always the WHOLE current
  // financial year (CFY start → today), regardless of the selected period, so the
  // target bars read true FY progress. Same module-PL engine as the snapshot above.
  const cfyFrom = periodRange('cfy', { branch, inception: inc }).from;
  const cfyPl = useModulePL(branch, { from: cfyFrom, to: today, summary: true }).data || {};
  const fyActual = { sales: cfyPl.totals?.sales || 0, gp: cfyPl.totals?.gp || 0, np: cfyPl.bridge?.netProfit || 0 };
  const tbQ = useTrialBalance(branch); const tb = tbQ.data?.rows || []; // bare = cumulative closing = current balance
  const bookingsQ = useBookingOrders(branch, { status: 'pending' }); const bookings = bookingsQ.data || []; // only pending is used here (stuck/suspense/counts)
  // /api/vouchers/approvals returns an OBJECT { counts, entries } — NOT an array. Reading
  // `.data || []` then `.length` yielded undefined → pendCount became NaN (tile showed
  // "NaN" and the "all posted" check never went green). Use the entries[] array.
  const pendVQ = useVoucherApprovals(branch, 'pending'); const pendVouchers = pendVQ.data?.entries || [];
  // Month sales/purchase + GP/net-profit now come from the richer Branch P&L snapshot
  // (BranchPnlSnapshot · module-PL engine) on the compliance tab — no separate
  // register-summary round-trips needed here.
  // R&P unsettled/total snapshot follows the selected period end (the labels say
  // "as on <to>"); passing the period `to` ages the outstanding to that cut-off.
  const outQ = useOutstanding(branch, { asOf: to }); const out = outQ.data || {};
  const dayQ = useDayBook(branch, { from: today, to: today }); const day = dayQ.data || [];
  // Collected / Paid follow the selected PERIOD (the "Posted Today" feed stays today-only).
  const periodDayQ = useDayBook(branch, { from, to }); const periodDay = periodDayQ.data || [];
  // True only during an actual fetch with no data yet (React Query v5: isPending && isFetching),
  // so skeletons show on first load / branch switch but not on background refetches.
  const txnLoading = bookingsQ.isLoading || pendVQ.isLoading;
  const savedTicks = useConfigValue(`month-end:${branchCode(branch) || 'ALL'}:${ym}`).data || {};
  
  // Custom additions for dashboard
  const { data: alertsRes } = useAlerts(branch);
  const { data: bankLedgers } = useBankLedgers(branch);
  const { data: taxEvents } = useTaxCalendar();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedBank, setSelectedBank] = useState('');

  // Auto-select first bank ledger once loaded
  useEffect(() => {
    if (bankLedgers && bankLedgers.length > 0 && !selectedBank) {
      setSelectedBank(bankLedgers[0].name);
    }
  }, [bankLedgers, selectedBank]);

  const recoQ = useBankReconSummary(selectedBank, branch, { from: monthFrom, to: today });
  const recoSummary = recoQ.data;

  const savedNotes = useConfigValue(`followup-notes:${branchCode(branch) || 'ALL'}`).data || {};
  const saveNoteMutation = useSaveConfigValue();
  const [editingNotes, setEditingNotes] = useState({});

  const pendBookings = bookings.filter((b) => b.status === 'pending');
  const pendCount = pendBookings.length + pendVouchers.length;
  const suspense = pendBookings.filter((b) => b.validation?.hasErrors);
  const cash = groupBalance(tb, /cash/i);
  const banks = tb.filter((r) => /bank/i.test(String(r.group || '')))
    .map((r) => ({ name: r.ledger, bal: (Number(r.closingDebit ?? r.debit) || 0) - (Number(r.closingCredit ?? r.credit) || 0) }))
    .filter((b) => Math.abs(b.bal) > 0.5);
  const bankTotal = banks.reduce((s, b) => s + b.bal, 0);
  const rec = age.receivables?.totals || {};
  const pay = age.payables?.totals || {};
  const recNet = (rec.total || 0) - (pay.total || 0);
  const top5rec = (age.receivables?.rows || [])
    .map((r) => ({ ...r, overdue: (r.d30 || 0) + (r.d60 || 0) + (r.d90 || 0) }))
    .filter((r) => r.overdue > 0.5).sort((a, b) => b.overdue - a.overdue).slice(0, 5);
  const top5pay = [...(age.payables?.rows || [])].sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, 5);
  const netGst = (typeof tax.netPayable === 'number') ? tax.netPayable : null;
  // Tax summary exposes withholding under `withholding` (the Tax Summary report reads
  // the same key); the old `tax.wht` was always undefined → the TDS tile showed 0.
  const tds = tax.withholding?.payable || 0;
  const tcs = tax.tcs?.payable || 0;
  const onAcct = out.onAccountReceipts || [];
  const onAcctSum = onAcct.reduce((s, r) => s + (Number(r.onAccount) || 0), 0);
  const collectedToday = periodDay.filter((j) => j.category === 'receipt').reduce((s, j) => s + (Number(j.totalDebit) || 0), 0);
  const paidToday = periodDay.filter((j) => j.category === 'payment').reduce((s, j) => s + (Number(j.totalDebit) || 0), 0);
  const tbDr = tb.reduce((s, r) => s + (Number(r.closingDebit ?? r.debit) || 0), 0);
  const tbCr = tb.reduce((s, r) => s + (Number(r.closingCredit ?? r.credit) || 0), 0);
  const tbBalanced = tb.length > 0 && Math.abs(tbDr - tbCr) < 1;
  const qa = (label, route, bg = C.blue) => <button key={route} onClick={() => go(route)} style={aBtn(bg)}><Plus size={13} />{label}</button>;

  // ── Single hero worklist: every "needs action" signal aggregated into one number,
  // so the accountant's day starts from one figure with a one-click jump to each.
  const overdueDebtorsCount = (age.receivables?.rows || []).filter((r) => ((r.d30 || 0) + (r.d60 || 0) + (r.d90 || 0)) > 0.5).length;
  const refundsPendingCount = pendVouchers.filter((e) => ADJ_CATS.includes(e.category)).length;
  const heroItems = [
    { n: pendCount, label: 'to approve & post', onClick: () => go('/transactions/approvals') },
    { n: suspense.length, label: 'in suspense', onClick: () => go('/accounts/suspense') },
    { n: onAcct.length, label: 'receipts to allocate', onClick: () => go('/reports/rec') },
    { n: overdueDebtorsCount, label: 'overdue debtors', onClick: () => setActiveTab('rp') },
    { n: refundsPendingCount, label: 'refunds pending', onClick: () => setActiveTab('rp') },
  ];
  const heroTotal = heroItems.reduce((s, it) => s + it.n, 0);

  // ── Period P&L figures (FLOW) + approval status split (LIVE) ────────────────
  const periodSales = pl.totals?.sales || 0;
  const periodGp = pl.totals?.gp || 0;
  const periodNp = pl.bridge?.netProfit || 0;
  const periodCogs = pl.totals?.cogs || 0;
  const blockedCount = pendVouchers.filter((e) => !e.postable).length;
  const supHealth = useMasterHealth('suppliers', branch).data || {};
  const bouncedPdc = (usePDCSummary(branch, { direction: 'inbound' }).data?.counts?.bounced || 0)
    + (usePDCSummary(branch, { direction: 'outbound' }).data?.counts?.bounced || 0);
  const gpNegative = pendBookings.filter((b) => (Number(b.gp ?? b.grossProfit) || 0) <= 0 && (b.gp != null || b.grossProfit != null)).length;
  // Branch Health rollup — approvals clear & TB balanced are CRITICAL.
  const healthChecks = [
    { label: 'Approvals clear', ok: pendCount === 0, critical: true },
    { label: 'Trial Balance balanced', ok: tbBalanced, critical: true },
    { label: 'Gross profit healthy', ok: periodGp > 0, critical: false },
    // Overdue tax = any ACTIVE statutory-calendar event whose due date is strictly
    // before today (live from the tax calendar). No events / none past-due → ok.
    { label: 'Compliance — no overdue tax', ok: !taxEvents?.some((e) => e.active && e.date && e.date < today), critical: false },
  ];
  // Exception Radar — only non-zero rows render (handled inside the component).
  // Bank reco differences are aggregated across EVERY bank ledger of the branch (not
  // just the one selected on the Cash & Bank tab), so a stray difference on any account
  // surfaces here. The per-ledger queries dedupe with the all-accounts roll-up.
  const bankRecoAgg = useBankReconAggregate(branch, { from: monthFrom, to: today });
  const exceptionRows = [
    { n: blockedCount, label: 'Blocked vouchers — needs fixing', route: '/transactions/approvals' },
    { n: suspense.length, label: 'Bookings in suspense', route: '/accounts/suspense' },
    { n: (supHealth.noGstin || 0) + (supHealth.noPan || 0), label: 'Suppliers missing GSTIN / PAN', route: '/masters/suppliers' },
    { n: bouncedPdc, label: 'Bounced cheques (PDC)', route: '/bank-reco' },
    { n: gpNegative, label: 'Bookings with GP ≤ 0', route: '/transactions/approvals' },
    { n: bankRecoAgg.diffCount, label: `Bank accounts with a reconciliation difference${bankRecoAgg.diffCount ? ` · ${money(cur, bankRecoAgg.diffAmount)}` : ''}`, route: '/bank-reco' },
  ];

  // Checklist handler inside compliance tab
  const period = thisYM();
  const cfgKey = `month-end:${branchCode(branch) || 'ALL'}:${period}`;
  const [manualChecklist, setManualChecklist] = useState({});
  const savedChecklistJson = JSON.stringify(savedTicks || {});
  useEffect(() => { setManualChecklist(JSON.parse(savedChecklistJson)); }, [savedChecklistJson]);

  const toggleManualCheck = (k) => {
    const next = { ...manualChecklist, [k]: !manualChecklist[k] };
    setManualChecklist(next);
    saveNoteMutation.mutate({ key: cfgKey, value: next, description: `Month-end checklist ${period}` });
  };

  const checklistItems = [
    { key: 'post', auto: pendCount === 0, label: 'All vouchers approved & posted', detail: pendCount ? `${pendCount} still pending` : 'nothing pending', route: '/transactions/approvals' },
    { key: 'suspense', auto: suspense.length === 0, label: 'Suspense cleared', detail: suspense.length ? `${suspense.length} stuck` : 'none', route: '/accounts/suspense' },
    { key: 'tb', auto: tbBalanced, label: 'Trial Balance balanced (Dr = Cr)', detail: tbBalanced ? 'balanced' : `out by ${money(cur, Math.abs(tbDr - tbCr))}`, route: '/finance/trial-balance' },
    { key: 'bankreco', manualOnly: true, label: 'Bank reconciliation done', detail: 'tick when reconciled', route: '/bank-reco' },
    { key: 'debtors', manualOnly: true, label: 'Debtors & creditors reviewed', detail: 'tick when followed up', route: '/accounts/net-ageing' },
    { key: 'cash', manualOnly: true, label: 'Cash counted vs Cash Book', detail: 'tick at day-close', route: '/finance/cash-book' },
  ];
  const checklistDone = checklistItems.filter((it) => it.manualOnly ? manualChecklist[it.key] : it.auto).length;

  const tabStyle = (active) => ({
    padding: '10px 18px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '12.5px',
    color: active ? C.gold : C.dim,
    // Use side longhands (not the `border` shorthand) so toggling `active` never
    // mixes shorthand `border` with longhand `borderBottom` — that combination
    // triggers React's "Removing a style property during rerender" warning.
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: active ? `3px solid ${C.gold}` : '3px solid transparent',
    background: active ? '#1a1c22' : 'transparent',
    borderTopLeftRadius: '6px',
    borderTopRightRadius: '6px',
    transition: 'all 0.2s ease',
    marginRight: '6px',
    outline: 'none',
  });

  const alerts = alertsRes?.alerts || [];

  // ── Receivable vs Payable comparison metrics ──────────────────────────────
  // Both sides computed from the SAME live engines (ageing totals carry billed &
  // settled; outstanding carries open-bill & on-account totals) so the two columns
  // are directly comparable. Falls back to summing the row arrays if a totals field
  // is absent, so the receivable column never goes blank when the data is present.
  const recBilled = age.receivables?.totals?.billed || 0;
  const recSettled = age.receivables?.totals?.settled || 0;
  const payBilled = age.payables?.totals?.billed || 0;
  const paySettled = age.payables?.totals?.settled || 0;
  const recOpenBills = out.totals?.salesOutstanding ?? (out.salesBills || []).reduce((s, b) => s + (Number(b.outstanding) || 0), 0);
  const payOpenBills = out.totals?.purchaseOutstanding ?? (out.purchaseBills || []).reduce((s, b) => s + (Number(b.outstanding) || 0), 0);
  const recOnAccount = out.totals?.onAccountReceipts ?? (out.onAccountReceipts || []).reduce((s, r) => s + (Number(r.onAccount) || 0), 0);
  const payOnAccount = out.totals?.onAccountPayments ?? (out.onAccountPayments || []).reduce((s, r) => s + (Number(r.onAccount) || 0), 0);
  const compareRows = [
    { label: 'Total Billed', sub: 'gross sales vs purchases', r: recBilled, p: payBilled },
    { label: 'Settled', sub: 'received vs paid', r: recSettled, p: paySettled },
    { label: 'Unsettled Bills (open)', sub: 'bill-wise outstanding', r: recOpenBills, p: payOpenBills },
    { label: 'Unallocated / On-Account', sub: 'receipts vs payments not yet applied', r: recOnAccount, p: payOnAccount },
    { label: 'Net Outstanding', sub: 'debtors vs creditors', r: rec.total || 0, p: pay.total || 0, strong: true },
  ];

  return (
    <Shell
      title="Branch Accountant Portal"
      sub={`${brLabel(branch)} · workspace and accounts control${age.asOf ? ` · as on ${age.asOf}` : ''}`}
      right={<>{qa('Receipt', '/receipts')}{qa('Payment', '/payments', C.amber)}{qa('Contra', '/contra', '#6b4c8b')}{qa('Journal', '/journal', C.dark)}{qa('Purchase Expense', '/purchase-expense', C.amber)}<button key="print" onClick={() => window.print()} style={aBtn('#475569')}><ReceiptText size={13} />Print / PDF</button></>}
    >
      {/* Workspace Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${C.border}`, marginBottom: 10, flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('overview')} style={tabStyle(activeTab === 'overview')}>1. Overview</button>
        <button onClick={() => setActiveTab('performance')} style={tabStyle(activeTab === 'performance')}>2. Performance</button>
        <button onClick={() => setActiveTab('cash')} style={tabStyle(activeTab === 'cash')}>3. Cash &amp; Bank</button>
        <button onClick={() => setActiveTab('rp')} style={tabStyle(activeTab === 'rp')}>4. Receivable &amp; Payable</button>
        <button onClick={() => setActiveTab('compliance')} style={tabStyle(activeTab === 'compliance')}>5. Compliance</button>
      </div>

      {/* Global period bar — drives FLOW figures (P&L · tax · collected/paid). Balances
          and ageing stay as-of the period `to`; the approval worklist stays live. */}
      {(() => {
        const pBtn = (active) => ({ padding: '4px 11px', fontSize: 11.5, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', background: active ? C.dark : 'transparent', color: active ? C.gold : C.dim });
        const isCustom = !!(customRange?.from && customRange?.to);
        const dInp = { padding: '4px 7px', fontSize: 11.5, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none' };
        const setPreset = (p) => { setCustomRange(null); setPp(p); };
        const setDate = (k, v) => setCustomRange((c) => ({ from: k === 'from' ? v : (c?.from || from), to: k === 'to' ? v : (c?.to || to) }));
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16, padding: '8px 12px', borderRadius: 10, background: C.dark }}>
            <div style={{ display: 'inline-flex', gap: 3, background: '#fff', borderRadius: 8, padding: 3 }}>
              {[['all', 'All'], ['lfy', 'LFY'], ['cfy', 'CFY'], ['mtd', 'CM']].map(([k, l]) => (
                <button key={k} onClick={() => setPreset(k)} style={pBtn(pp === k && !isCustom)}>{l}</button>
              ))}
            </div>
            <input type="date" value={from || ''} onChange={(e) => setDate('from', e.target.value)} style={dInp} />
            <span style={{ color: C.gold }}>→</span>
            <input type="date" value={to || ''} onChange={(e) => setDate('to', e.target.value)} style={dInp} />
            <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 800, color: C.gold }}>{range.label} · {from} → {to}</span>
          </div>
        );
      })()}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <>
          {/* (a) Branch Health traffic-light rollup */}
          <BranchHealth checks={healthChecks} />

          {/* (b) Approval STATUS — four stat cards */}
          <SecTitle>Approval &amp; posting status (live)</SecTitle>
          <Row>
            <Tile icon={<CheckCircle2 size={13} />} label="Approved & Posted" value={periodDay.length} sub={`posted in ${range.label}`} tone={C.green} onClick={() => go('/finance/day-book')} loading={periodDayQ.isLoading} />
            <Tile icon={<CheckSquare size={13} />} label="Pending" value={pendCount} sub="awaiting approval" tone={C.amber} onClick={() => go('/transactions/approvals')} loading={txnLoading} />
            <Tile icon={<AlertTriangle size={13} />} label="Blocked" value={blockedCount} sub="fails a check" tone={blockedCount ? C.red : C.green} onClick={() => go('/transactions/approvals')} loading={txnLoading} />
            <Tile icon={<AlertCircle size={13} />} label="Suspense" value={suspense.length} sub="missing ledger / data" tone={suspense.length ? C.red : C.green} onClick={() => go('/accounts/suspense')} loading={bookingsQ.isLoading} />
          </Row>

          {/* Actionable breakdown of the queue: I-can-approve vs my-own vs blocked (maker ≠ checker) */}
          <ApprovalSplit branch={branch} cur={cur} go={go} currentUser={currentUser} />

          {/* (c) Performance headline — Sales / GP / NP with period-over-period delta */}
          <SecTitle>Performance ({range.label})</SecTitle>
          <Row>
            <Tile icon={<TrendingUp size={13} />} label="Sales" value={money(cur, periodSales)} sub={<>vs prior <Delta cur={periodSales} prev={priorPl.totals?.sales || 0} /></>} tone={C.green} onClick={() => go('/reports/pnl')} loading={plQ.isLoading} />
            <Tile icon={<Coins size={13} />} label="Gross Profit" value={money(cur, periodGp)} sub={<>vs prior <Delta cur={periodGp} prev={priorPl.totals?.gp || 0} /></>} tone={C.blue} onClick={() => go('/reports/invoice-gp')} loading={plQ.isLoading} />
            <Tile icon={<Scale size={13} />} label="Net Profit" value={money(cur, periodNp)} sub={<>vs prior <Delta cur={periodNp} prev={priorPl.bridge?.netProfit || 0} /></>} tone={periodNp >= 0 ? C.green : C.red} onClick={() => go('/reports/pnl')} loading={plQ.isLoading} />
          </Row>

          {/* (d) Money & working capital */}
          <SecTitle>Money &amp; working capital (as on {to})</SecTitle>
          <Row>
            <Tile icon={<Wallet size={13} />} label="Cash + Bank" value={money(cur, cash + bankTotal)} sub="liquid balances" tone={C.green} onClick={() => go('/finance/bank-balance')} loading={tbQ.isLoading} />
            <Tile icon={<TrendingUp size={13} />} label="Receivable" value={money(cur, rec.total || 0)} sub="open debtors" tone={C.blue} onClick={() => go('/reports/rec')} loading={ageQ.isLoading} />
            <Tile icon={<TrendingDown size={13} />} label="Payable" value={money(cur, pay.total || 0)} sub="open creditors" tone={C.amber} onClick={() => go('/reports/pay')} loading={ageQ.isLoading} />
            <Tile icon={<Scale size={13} />} label="Net Position" value={money(cur, recNet)} sub={recNet >= 0 ? 'net receivable' : 'net payable'} tone={recNet >= 0 ? C.green : C.red} onClick={() => go('/accounts/net-ageing')} loading={ageQ.isLoading} />
          </Row>

          {/* (e) Exception Radar */}
          <ExceptionRadar rows={exceptionRows} go={go} />

          {/* (f) Single hero worklist — the one number to start the day */}
          <SecTitle>Worklist — needs action (live)</SecTitle>
          <div style={{ ...card, padding: '12px 16px', marginBottom: 16, borderLeft: `4px solid ${heroTotal ? C.amber : C.green}`, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: heroTotal ? C.amber : C.green, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{heroTotal}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.dim }}>{heroTotal ? <>items need<br />your action</> : <>all clear —<br />nothing pending</>}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
              {heroItems.filter((it) => it.n > 0).map((it, i) => (
                <button key={i} {...clickable(it.onClick)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: C.dark }}>
                  <span style={{ fontWeight: 800, color: C.amber }}>{it.n}</span> {it.label} <ArrowRight size={11} style={{ color: C.dim }} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* TAB 2: PERFORMANCE */}
      {activeTab === 'performance' && (
        <>
          <BranchPnlSnapshot branch={branch} cur={cur} go={go} from={from} to={to} prior={priorPl} />
          <TargetsVsActual branch={branch} cur={cur} fyActual={fyActual} fyModules={cfyPl.modules || []} />
          <PnlTrend branch={branch} />
          <BudgetVsActual branch={branch} cur={cur} go={go} from={from} to={to} />
        </>
      )}

      {/* TAB 3: CASH & BANK */}
      {activeTab === 'cash' && (
        <>
          <SecTitle>Money Position</SecTitle>
          <Row>
            <Tile icon={<Wallet size={13} />} label="Cash in Hand" value={money(cur, cash)} sub="Open Cash Book" tone={C.green} onClick={() => go('/finance/cash-book')} loading={tbQ.isLoading} />
            <Tile icon={<Landmark size={13} />} label={`Bank Balance${banks.length > 1 ? ` (${banks.length} a/c)` : ''}`} value={money(cur, bankTotal)} sub="Open bank balances" tone={C.blue} onClick={() => go('/finance/bank-balance')} loading={tbQ.isLoading} />
            <Tile icon={<TrendingUp size={13} />} label="Collected" value={money(cur, collectedToday)} sub={`receipts · ${range.label}`} tone={C.green} onClick={() => go('/finance/receipt-register')} loading={periodDayQ.isLoading} />
            <Tile icon={<TrendingDown size={13} />} label="Paid" value={money(cur, paidToday)} sub={`payments · ${range.label}`} tone={C.amber} onClick={() => go('/finance/payment-register')} loading={periodDayQ.isLoading} />
          </Row>
          {banks.length > 1 && (
            <div style={{ ...card, padding: '8px 12px', marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              {banks.map((b, i) => <span key={i} style={{ fontSize: 11.5, color: C.dim }}>{b.name}: <b style={{ color: b.bal >= 0 ? C.dark : C.red }}>{money(cur, b.bal)}</b></span>)}
            </div>
          )}

          {/* Tier 1.1 — forward cash outlook (the tiles above are backward-looking) */}
          <CashOutlookCard branch={branch} cur={cur} go={go} />

          {/* Tier 1.2 — post-dated cheque tracker */}
          <PdcTracker branch={branch} cur={cur} go={go} />

          {/* New Bank Reconciliation summary card */}
          <SecTitle>Bank Reconciliation status</SecTitle>
          <div style={{ ...card, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Landmark size={14} style={{ color: C.blue }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: C.dark }}>Select Bank Ledger:</span>
                {bankLedgers && bankLedgers.length > 0 ? (
                  <select 
                    value={selectedBank} 
                    onChange={(e) => setSelectedBank(e.target.value)} 
                    style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, outline: 'none', fontWeight: 600 }}
                  >
                    {bankLedgers.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
                  </select>
                ) : (
                  <span style={{ fontSize: 11.5, color: C.dim }}>No bank accounts found in trial balance.</span>
                )}
              </div>
              <button onClick={() => go('/bank-reco')} style={aBtn(C.blue)}>Open Bank Reco Matcher <ArrowRight size={12} /></button>
            </div>

            {recoQ.isLoading && selectedBank ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
                {['ERP Ledger Balance', 'Statement Balance', 'Unreconciled Difference', 'Unmatched Lines'].map((lbl) => (
                  <div key={lbl} style={{ padding: '8px 10px', background: '#fafbff', border: `1px solid ${C.border}`, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>{lbl}</div>
                    <div className="kb-skeleton" style={{ height: 16, width: '70%', marginTop: 6, borderRadius: 5 }} />
                  </div>
                ))}
              </div>
            ) : recoSummary ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
                <div style={{ padding: '8px 10px', background: '#fafbff', border: `1px solid ${C.border}`, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>ERP Ledger Balance</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginTop: 4 }}>{money(cur, recoSummary.bookBalance)}</div>
                </div>
                <div style={{ padding: '8px 10px', background: '#fafbff', border: `1px solid ${C.border}`, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>Statement Balance {recoSummary.bankBalanceDerived && <span style={{fontSize: 9, color: C.dim}}>(derived)</span>}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginTop: 4 }}>{money(cur, recoSummary.bankBalance)}</div>
                </div>
                <div style={{ padding: '8px 10px', background: '#fafbff', border: `1px solid ${C.border}`, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>Unreconciled Difference</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: recoSummary.differenceAmount === 0 ? C.green : C.red, marginTop: 4 }}>{money(cur, recoSummary.differenceAmount)}</div>
                </div>
                <div style={{ padding: '8px 10px', background: '#fafbff', border: `1px solid ${C.border}`, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>Unmatched Lines</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.dark, marginTop: 4 }}>
                    Books: <b style={{ color: recoSummary.counts.bookUnreconciled > 0 ? C.amber : C.green }}>{recoSummary.counts.bookUnreconciled}</b> | Stmt: <b style={{ color: recoSummary.counts.statementUnreconciled > 0 ? C.amber : C.green }}>{recoSummary.counts.statementUnreconciled}</b>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: C.dim, padding: '10px 0' }}>Select a bank account above to query statement reconciliation status.</div>
            )}
          </div>

          {/* Tier 3.8 — every bank's reco status at a glance (vs the single-bank detail above) */}
          <BankRecoRollup branch={branch} cur={cur} go={go} />

          {/* Today's posted transactions book feed */}
          <SecTitle>Posted Today ({day.length})</SecTitle>
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            {day.length === 0 ? (
              <div style={{ padding: 18, textAlign: 'center', fontSize: 12.5, color: C.dim }}>No vouchers posted at {brLabel(branch)} today.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.dark, color: C.gold }}>
                    <th style={{ ...th, background: 'transparent' }}>Voucher No</th>
                    <th style={{ ...th, background: 'transparent' }}>Type</th>
                    <th style={{ ...th, background: 'transparent' }}>Party / Account</th>
                    <th style={{ ...th, background: 'transparent', ...rnum }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {day.map((j, i) => (
                    <tr key={i} style={{ background: i % 2 ? '#fafbff' : '#fff' }}>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>{j.vno || 'Draft'}</td>
                      <td style={{ ...td, textTransform: 'capitalize', color: j.category === 'receipt' ? C.green : (j.category === 'payment' ? C.amber : C.dark) }}>{j.category}</td>
                      <td style={{ ...td }}>{j.party || j.narration || 'General Entry'}</td>
                      <td style={{ ...td, ...rnum, fontWeight: 700 }}>{money(cur, j.totalDebit || j.totalCredit || j.total || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* TAB 4: RECEIVABLE & PAYABLE — Receivable & Payable side-by-side for comparison */}
      {activeTab === 'rp' && (
        <>
          {/* Working-capital velocity (DSO / DPO / CCC) — period sales/cogs from P&L */}
          <DsoDpoStrip cur={cur} rec={rec} pay={pay} periodSales={periodSales} periodCogs={periodCogs} />

          {/* Stacked ageing distribution bars — debtors vs creditors */}
          <AgeingBars cur={cur} rec={rec} pay={pay} />

          {/* Headline snapshot: both sides + net, each card drilling to its register */}
          <SecTitle>Net Working Position ({age.asOf ? `as on ${age.asOf}` : 'live'})</SecTitle>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div {...clickable(() => go('/reports/rec'))} style={{ ...card, padding: 14, borderLeft: `4px solid ${C.blue}`, flex: '1 1 220px', minWidth: 200, cursor: 'pointer' }}>
              <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>Accounts Receivable (Debtors)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.blue, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{money(cur, rec.total || 0)}</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{overdueDebtorsCount} overdue · open receivables <ArrowRight size={11} style={{ verticalAlign: 'middle' }} /></div>
            </div>
            <div {...clickable(() => go('/reports/pay'))} style={{ ...card, padding: 14, borderLeft: `4px solid ${C.amber}`, flex: '1 1 220px', minWidth: 200, cursor: 'pointer' }}>
              <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>Accounts Payable (Creditors)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.amber, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{money(cur, pay.total || 0)}</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{(age.payables?.rows || []).length} supplier(s) · open payables <ArrowRight size={11} style={{ verticalAlign: 'middle' }} /></div>
            </div>
            <div {...clickable(() => go('/accounts/net-ageing'))} style={{ ...card, padding: 14, borderLeft: `4px solid ${recNet >= 0 ? C.green : C.red}`, flex: '1 1 220px', minWidth: 200, cursor: 'pointer' }}>
              <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>Net Working Position</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: recNet >= 0 ? C.green : C.red, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{money(cur, recNet)}</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{recNet >= 0 ? 'net receivable' : 'net payable'} · full net ageing <ArrowRight size={11} style={{ verticalAlign: 'middle' }} /></div>
            </div>
          </div>

          {/* ── Receivable vs Payable — one comparison table, every metric side by side.
              This is what the separate AR/AP tabs made impossible: read both columns at
              once. The Receivable column shows total billed, settled, open bills and
              unallocated receipts next to the Payable equivalents. */}
          <SecTitle>Receivable vs Payable — side-by-side comparison ({age.asOf ? `as on ${age.asOf}` : 'live'})</SecTitle>
          <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 18 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead><tr style={{ background: C.dark }}>
                <th style={{ ...th, background: 'transparent' }}>Metric</th>
                <th style={{ ...th, background: 'transparent', ...rnum }}>Receivable (Customers)</th>
                <th style={{ ...th, background: 'transparent', ...rnum }}>Payable (Suppliers)</th>
                <th style={{ ...th, background: 'transparent', ...rnum }}>Net (R − P)</th>
              </tr></thead>
              <tbody>
                {compareRows.map((m, i) => {
                  const net = (m.r || 0) - (m.p || 0);
                  return (
                    <tr key={m.label} style={{ borderTop: '1px solid #dfe2e7', background: m.strong ? '#fafbff' : (i % 2 ? '#fafbff' : '#fff') }}>
                      <td style={{ ...td, fontWeight: m.strong ? 800 : 700, color: C.dark }}>{m.label}<div style={{ fontSize: 10.5, color: C.dim, fontWeight: 500 }}>{m.sub}</div></td>
                      <td {...clickable(() => go('/reports/rec'))} style={{ ...td, ...rnum, cursor: 'pointer', color: C.blue, fontWeight: m.strong ? 800 : 700 }}>{money(cur, m.r || 0)}</td>
                      <td {...clickable(() => go('/reports/pay'))} style={{ ...td, ...rnum, cursor: 'pointer', color: C.amber, fontWeight: m.strong ? 800 : 700 }}>{money(cur, m.p || 0)}</td>
                      <td style={{ ...td, ...rnum, fontWeight: 800, color: net >= 0 ? C.green : C.red }}>{money(cur, net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Ageing buckets — debtors AND creditors in ONE table so the buckets line up */}
          <SecTitle>Ageing — Debtors vs Creditors</SecTitle>
          <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 18 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>
                <th style={th}>Ageing</th><th style={{ ...th, ...rnum }}>0–30</th><th style={{ ...th, ...rnum }}>31–60</th><th style={{ ...th, ...rnum }}>61–90</th><th style={{ ...th, ...rnum }}>90+</th><th style={{ ...th, ...rnum }}>Total</th>
              </tr></thead>
              <tbody>
                <AgeBucketRow label="Debtors (Receivable)" totals={rec} cur={cur} tone={C.blue} onClick={() => go('/reports/rec')} />
                <AgeBucketRow label="Creditors (Payable)" totals={pay} cur={cur} tone={C.amber} onClick={() => go('/reports/pay')} />
                <tr {...clickable(() => go('/accounts/net-ageing'))} style={{ borderTop: `2px solid ${C.border}`, background: '#fafbff', cursor: 'pointer' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 800, color: C.dark }}>Net Working Position</td>
                  <td colSpan={4} />
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: recNet >= 0 ? C.green : C.red, fontVariantNumeric: 'tabular-nums' }}>{money(cur, recNet)} <ArrowRight size={11} style={{ verticalAlign: 'middle' }} /></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bill-wise open documents — sales bills | purchase bills, side by side */}
          <SecTitle>Unsettled Bills (bill-wise) — Client vs Supplier</SecTitle>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
            <UnsettledBills
              title="Open sales bills — awaiting receipt"
              bills={out.salesBills || []}
              cur={cur} tone={C.blue} drill360="/reports/customer-360"
              actionLabel="Receipt" actionRoute="/receipts"
              onDrillAll={() => go('/reports/rec')} go={go}
            />
            <UnsettledBills
              title="Open purchase bills — awaiting payment"
              bills={out.purchaseBills || []}
              cur={cur} tone={C.amber} drill360="/reports/supplier-360"
              actionLabel="Pay" actionRoute="/payments"
              onDrillAll={() => go('/reports/pay')} go={go}
            />
          </div>

          {/* Client headline totals — Sales Bills vs Receipts. Summed from the SAME
              bill-wise receivables rows that feed the party-wise panel below, so the
              four tiles tie back exactly to that table's TOTAL footer. */}
          <SecTitle>Clients — Sales Bills vs Receipts</SecTitle>
          {(() => {
            const rr = age.receivables?.rows || [];
            const rt = rr.reduce((a, r) => ({
              billed: a.billed + (r.billed || 0),
              settled: a.settled + (r.settled || 0),
              unsettled: a.unsettled + (r.total || 0),
              net: a.net + (r.net || 0),
            }), { billed: 0, settled: 0, unsettled: 0, net: 0 });
            const lbl = { fontSize: 11, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 };
            const big = { fontSize: 22, fontWeight: 800, marginTop: 4, fontVariantNumeric: 'tabular-nums' };
            const sub = { fontSize: 11, color: C.dim, marginTop: 2 };
            const tile = (border) => ({ ...card, padding: 14, borderLeft: `4px solid ${border}`, flex: '1 1 220px', minWidth: 200, cursor: 'pointer' });
            return (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <div {...clickable(() => go('/reports/sreg'))} style={tile(C.dark)}>
                  <div style={lbl}>Total Sales Bills</div>
                  <div style={{ ...big, color: C.dark }}>{money(cur, rt.billed)}</div>
                  <div style={sub}>{rr.length} client(s) · gross billed <ArrowRight size={11} style={{ verticalAlign: 'middle' }} /></div>
                </div>
                <div {...clickable(() => go('/finance/receipt-register'))} style={tile(C.green)}>
                  <div style={lbl}>Total Receipts</div>
                  <div style={{ ...big, color: C.green }}>{money(cur, rt.settled)}</div>
                  <div style={sub}>received against bills <ArrowRight size={11} style={{ verticalAlign: 'middle' }} /></div>
                </div>
                <div {...clickable(() => go('/reports/rec'))} style={tile(C.blue)}>
                  <div style={lbl}>Total Unsettled Sales Bills</div>
                  <div style={{ ...big, color: C.blue }}>{money(cur, rt.unsettled)}</div>
                  <div style={sub}>open bill value <ArrowRight size={11} style={{ verticalAlign: 'middle' }} /></div>
                </div>
                <div {...clickable(() => go('/reports/rec'))} style={tile(rt.net >= 0 ? C.blue : C.red)}>
                  <div style={lbl}>Client Net Due Receivable</div>
                  <div style={{ ...big, color: rt.net >= 0 ? C.blue : C.red }}>{money(cur, rt.net)}</div>
                  <div style={sub}>{rt.net >= 0 ? 'net to collect' : 'net advance held'} · open receivables <ArrowRight size={11} style={{ verticalAlign: 'middle' }} /></div>
                </div>
              </div>
            );
          })()}

          {/* Supplier headline totals — Purchase Bills vs Payments. Summed from the
              SAME bill-wise payables rows that feed the party-wise panel below, so the
              four tiles tie back exactly to that table's TOTAL footer. */}
          <SecTitle>Suppliers — Purchase Bills vs Payments</SecTitle>
          {(() => {
            const pr = age.payables?.rows || [];
            const pt = pr.reduce((a, r) => ({
              billed: a.billed + (r.billed || 0),
              settled: a.settled + (r.settled || 0),
              unsettled: a.unsettled + (r.total || 0),
              net: a.net + (r.net || 0),
            }), { billed: 0, settled: 0, unsettled: 0, net: 0 });
            const lbl = { fontSize: 11, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 };
            const big = { fontSize: 22, fontWeight: 800, marginTop: 4, fontVariantNumeric: 'tabular-nums' };
            const sub = { fontSize: 11, color: C.dim, marginTop: 2 };
            const tile = (border) => ({ ...card, padding: 14, borderLeft: `4px solid ${border}`, flex: '1 1 220px', minWidth: 200, cursor: 'pointer' });
            return (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <div {...clickable(() => go('/reports/preg'))} style={tile(C.dark)}>
                  <div style={lbl}>Total Purchase Bills</div>
                  <div style={{ ...big, color: C.dark }}>{money(cur, pt.billed)}</div>
                  <div style={sub}>{pr.length} supplier(s) · gross billed <ArrowRight size={11} style={{ verticalAlign: 'middle' }} /></div>
                </div>
                <div {...clickable(() => go('/finance/payment-register'))} style={tile(C.green)}>
                  <div style={lbl}>Total Payments</div>
                  <div style={{ ...big, color: C.green }}>{money(cur, pt.settled)}</div>
                  <div style={sub}>paid against bills <ArrowRight size={11} style={{ verticalAlign: 'middle' }} /></div>
                </div>
                <div {...clickable(() => go('/reports/pay'))} style={tile(C.amber)}>
                  <div style={lbl}>Total Unsettled Purchase Bills</div>
                  <div style={{ ...big, color: C.amber }}>{money(cur, pt.unsettled)}</div>
                  <div style={sub}>open bill value <ArrowRight size={11} style={{ verticalAlign: 'middle' }} /></div>
                </div>
                <div {...clickable(() => go('/reports/pay'))} style={tile(pt.net >= 0 ? C.red : C.green)}>
                  <div style={lbl}>Supplier Net Due Payable</div>
                  <div style={{ ...big, color: pt.net >= 0 ? C.red : C.green }}>{money(cur, pt.net)}</div>
                  <div style={sub}>{pt.net >= 0 ? 'net to pay' : 'net advance'} · open payables <ArrowRight size={11} style={{ verticalAlign: 'middle' }} /></div>
                </div>
              </div>
            );
          })()}

          {/* Party-wise settlement — clients | suppliers, side by side */}
          <SecTitle>Settlement — Bills vs Receipts &amp; Payments (party-wise)</SecTitle>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
            <SettlementPanel
              title="Clients — unsettled bills vs receipts"
              sub="Billed to customer vs received · net to collect · tap a row to open the client"
              rows={age.receivables?.rows || []}
              cur={cur} tone={C.blue} partyLabel="Customer" settleLabel="Receipts"
              drillLabel="Receivables" onDrill={() => go('/reports/rec')}
              drill360="/reports/customer-360" go={go}
            />
            <SettlementPanel
              title="Suppliers — unsettled bills vs payments"
              sub="Billed by supplier vs paid · net to pay · tap a row to open the supplier"
              rows={age.payables?.rows || []}
              cur={cur} tone={C.amber} partyLabel="Supplier" settleLabel="Payments"
              drillLabel="Payables" onDrill={() => go('/reports/pay')}
              drill360="/reports/supplier-360" go={go}
            />
          </div>

          {/* On-account / unallocated — receipts | payments, side by side */}
          <SecTitle>On-Account / Unallocated — Receipts vs Payments</SecTitle>
          <AdvancesPanel branch={branch} cur={cur} go={go} side="both" />

          {/* Refunds / reissues / ADM / ACM awaiting posting */}
          <SecTitle>Refunds &amp; Adjustments</SecTitle>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
            <RefundsWorklist branch={branch} cur={cur} go={go} />
          </div>

          {/* Action boards — overdue debtors (collect) | top creditors (pay), side by side */}
          <SecTitle>Worklist — Collect vs Pay</SecTitle>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ ...card, padding: 12, flex: '1 1 400px', minWidth: 320 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.dark, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Top overdue debtors — collections followup</span>
                <button onClick={() => go('/accounts/collections')} style={{ ...aBtn(C.blue), padding: '3px 8px', fontSize: 10 }}>View All Tracker</button>
              </div>
              {top5rec.length === 0 && <div style={{ fontSize: 12, color: C.green, padding: 10 }}>✓ No overdue debtors outstanding.</div>}
              {top5rec.map((r, i) => (
                <div key={i} style={{ padding: '8px 0', borderTop: i ? '1px solid #dfe2e7' : 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span {...clickable(() => go(`/reports/customer-360?party=${encodeURIComponent(r.party)}`))} style={{ fontSize: 12, color: C.dark, fontWeight: 700, cursor: 'pointer' }}>{r.party}<span style={{ color: C.blue, fontWeight: 800, marginLeft: 4 }}>›</span></span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: C.red }}>{money(cur, r.overdue)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      value={editingNotes[r.party] !== undefined ? editingNotes[r.party] : (savedNotes[r.party] || '')}
                      onChange={(e) => setEditingNotes({ ...editingNotes, [r.party]: e.target.value })}
                      onBlur={() => {
                        const val = editingNotes[r.party];
                        if (val !== undefined && val !== (savedNotes[r.party] || '')) {
                          const next = { ...savedNotes, [r.party]: val };
                          saveNoteMutation.mutate({ key: `followup-notes:${branchCode(branch) || 'ALL'}`, value: next, description: `Save note for ${r.party}` });
                        }
                      }}
                      placeholder="Add follow-up notes (auto-saves on focus out)..."
                      style={{ flex: 1, padding: '4px 8px', fontSize: 11.5, borderRadius: 4, border: `1px solid ${C.border}`, outline: 'none' }}
                    />
                    <button onClick={() => go('/receipts')} style={{ ...aBtn(C.green), padding: '3px 8px', fontSize: 10 }}>Receipt</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...card, padding: 12, flex: '1 1 350px', minWidth: 300 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.dark, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Top creditors — reconcile &amp; pay</span>
                <button onClick={() => go('/accounts/supplier-reco')} style={{ ...aBtn(C.amber), padding: '3px 8px', fontSize: 10 }}>Supplier Reco</button>
              </div>
              {top5pay.length === 0 && <div style={{ fontSize: 12, color: C.green, padding: 10 }}>✓ No outstanding bills to pay.</div>}
              {top5pay.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: i ? '1px solid #dfe2e7' : 'none' }}>
                  <span {...clickable(() => go(`/reports/supplier-360?party=${encodeURIComponent(r.party)}`))} style={{ flex: 1, fontSize: 12, color: C.dark, fontWeight: 600, cursor: 'pointer' }}>{r.party}<span style={{ color: C.amber, fontWeight: 800, marginLeft: 4 }}>›</span></span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.amber, fontVariantNumeric: 'tabular-nums' }}>{money(cur, r.total)}</span>
                  <button onClick={() => go('/payments')} style={{ ...aBtn(C.amber), padding: '3px 8px', fontSize: 10 }}>Pay</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* TAB 5: COMPLIANCE */}
      {activeTab === 'compliance' && (
        <>
          {/* New Live Self-Audit Warning Alerts */}
          <SecTitle>Ledger Health &amp; Audit Integrity Alerts</SecTitle>
          {alerts && alerts.length === 0 ? (
            <div style={{ ...card, padding: '12px 14px', background: '#f0fdf4', borderLeft: `4px solid ${C.green}`, color: C.green, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <CheckCircle2 size={16} />
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>No audit exceptions found. Branch trial balance and ledger parameters are healthy!</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {(alerts || []).slice(0, 5).map((a, i) => {
                const isError = a.severity === 'error';
                const isWarn = a.severity === 'warn';
                const bg = isError ? '#fef2f2' : (isWarn ? '#fffbeb' : '#eff6ff');
                const border = isError ? C.red : (isWarn ? C.amber : C.blue);
                return (
                  <div key={i} style={{ ...card, padding: '10px 12px', background: bg, borderLeft: `4px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertCircle size={16} style={{ color: border }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.dark }}>{a.title}</div>
                      <div style={{ fontSize: 11.5, color: C.dim }}>{a.detail}</div>
                    </div>
                    {a.link && (
                      <button onClick={() => go(a.link)} style={{ ...aBtn(border), padding: '4px 8px', fontSize: 10.5 }}>
                        Fix Exception
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <SecTitle>Statutory compliance &amp; Balances</SecTitle>
          <Row>
            <Tile icon={<ReceiptText size={13} />} label="GST / VAT (this month)" value={netGst == null ? 'View' : money(cur, Math.abs(netGst))} sub={`${netGst == null ? 'open tax summary' : (netGst >= 0 ? 'net payable' : 'refundable')} · due 20th`} tone={netGst != null && netGst > 0 ? C.amber : C.blue} onClick={() => go('/reports/tax-summary')} loading={taxQ.isLoading} />
            <Tile icon={<ReceiptText size={13} />} label="TDS Payable" value={money(cur, tds)} sub="due 7th · TDS calculator" tone={tds > 0 ? C.amber : C.blue} onClick={() => go('/finance/tds-calculator')} loading={taxQ.isLoading} />
            <Tile icon={<ReceiptText size={13} />} label="TCS Payable" value={money(cur, tcs)} sub="statutory dues calendar" tone={tcs > 0 ? C.amber : C.blue} onClick={() => go('/reports/statutory-dues')} loading={taxQ.isLoading} />
            <Tile icon={<CheckSquare size={13} />} label="Trial Balance" value={tbBalanced ? '✓ Balanced' : (tb.length ? '✗ Out' : '—')} sub={tb.length && !tbBalanced ? `out by ${money(cur, Math.abs(tbDr - tbCr))}` : 'open trial balance'} tone={tbBalanced ? C.green : (tb.length ? C.red : C.dim)} onClick={() => go('/finance/trial-balance')} loading={tbQ.isLoading} />
          </Row>

          {/* Tier 2.4 — output tax vs input credit → net liability + 2B match */}
          <GstItcPanel branch={branch} cur={cur} go={go} from={from} to={to} />

          {/* New tax events compliance list */}
          {taxEvents && taxEvents.length > 0 && (
            <>
              <SecTitle>Upcoming Statutory Calendar Deadlines</SecTitle>
              <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 14 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: C.dark, color: C.gold }}>
                      <th style={{ ...th, background: 'transparent' }}>Due Date</th>
                      <th style={{ ...th, background: 'transparent' }}>Tax Type</th>
                      <th style={{ ...th, background: 'transparent' }}>Filing Event Description</th>
                      <th style={{ ...th, background: 'transparent', ...rnum }}>Est. Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxEvents.filter(e => e.active).slice(0, 5).map((e, idx) => (
                      <tr key={idx} style={{ background: idx % 2 ? '#fafbff' : '#fff' }}>
                        <td style={{ ...td, fontWeight: 700 }}>{e.date}</td>
                        <td style={{ ...td }}><span style={{ padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{e.type}</span></td>
                        <td style={{ ...td }}>{e.title}</td>
                        <td style={{ ...td, ...rnum, fontWeight: 700 }}>{e.amount ? money(cur, e.amount) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Tier 3.7 — full P&L snapshot (revenue · COGS · GP · expenses · net profit) */}
          <BranchPnlSnapshot branch={branch} cur={cur} go={go} />

          {/* Tier 3.9 — tax-readiness gaps in the customer / supplier masters */}
          <MasterHealth branch={branch} go={go} />

          {/* Month-End Close progress checklist embedded */}
          <SecTitle>Month-End Checklist / Close Verification</SecTitle>
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #dfe2e7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbff' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: C.dark }}>Auto and manual checks for month closing ({period})</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: checklistDone === checklistItems.length ? C.green : C.amber }}>{checklistDone}/{checklistItems.length} tasks completed</span>
            </div>
            {checklistItems.map((it, i) => {
              const ok = it.manualOnly ? !!manualChecklist[it.key] : it.auto;
              return (
                <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i ? '1px solid #dfe2e7' : 'none' }}>
                  <span {...(it.manualOnly ? clickable(() => toggleManualCheck(it.key)) : {})}
                    style={{ width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', cursor: it.manualOnly ? 'pointer' : 'default', background: ok ? C.green : (it.manualOnly ? '#cbd0db' : C.amber), fontSize: 11 }}>
                    {ok ? '✓' : (it.manualOnly ? '' : '!')}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.dark }}>{it.label} {it.manualOnly && <span style={{ fontSize: 9.5, color: C.dim, fontWeight: 600 }}>(manual)</span>}</div>
                    <div style={{ fontSize: 11, color: ok ? C.green : C.dim }}>{it.detail}</div>
                  </div>
                  <button onClick={() => go(it.route)} style={{ ...aBtn(C.blue), padding: '3px 8px', fontSize: 10 }}>Open Module</button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Shell>
  );
}

// Bucket columns shared by the ageing screens.
const AGE_COLS = [['d0', '0–30'], ['d30', '31–60'], ['d60', '61–90'], ['d90', '90+']];
function AgeingTable({ side = {}, cur, tone, partyLabel = 'Party', onAct, actLabel, actBg }) {
  const rows = side.rows || [];
  const t = side.totals || {};
  // Render one page of rows (DOM stays bounded); the tfoot totals + count below still
  // reflect the FULL set (they read `t`/`rows.length`, not the page).
  const pg = usePager(rows);
  return (
    <Table pager={pg}>
      <thead><tr>
        <th style={th}>{partyLabel}</th>
        {AGE_COLS.map(([, l]) => <th key={l} style={{ ...th, ...rnum }}>{l}</th>)}
        <th style={{ ...th, ...rnum }}>Total</th>
        {onAct && <th style={{ ...th, textAlign: 'center' }}>Action</th>}
      </tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={onAct ? 7 : 6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>Nothing outstanding.</td></tr>}
        {pg.pageRows.map((r, i) => (
          <tr key={i} style={{ background: i % 2 ? '#fafbff' : '#fff' }}>
            <td style={{ ...td, fontWeight: 600, color: C.dark }}>{r.party}</td>
            {AGE_COLS.map(([k]) => <td key={k} style={{ ...td, ...rnum, color: k === 'd90' && r[k] > 0 ? C.red : C.dark }}>{r[k] ? money(cur, r[k]) : '—'}</td>)}
            <td style={{ ...td, ...rnum, fontWeight: 800, color: tone }}>{money(cur, r.total)}</td>
            {onAct && <td style={{ ...td, textAlign: 'center' }}><button onClick={() => onAct(r)} style={aBtn(actBg || C.blue)}>{actLabel}</button></td>}
          </tr>
        ))}
      </tbody>
      {rows.length > 0 && (
        <tfoot><tr style={{ position: 'sticky', bottom: 0 }}>
          <td style={{ ...td, background: C.dark, color: C.gold, fontWeight: 800 }}>TOTAL · {rows.length}</td>
          {AGE_COLS.map(([k]) => <td key={k} style={{ ...td, ...rnum, background: C.dark, color: '#fff', fontWeight: 800 }}>{money(cur, t[k] || 0)}</td>)}
          <td style={{ ...td, ...rnum, background: C.dark, color: '#fff', fontWeight: 800 }}>{money(cur, t.total || 0)}</td>
          {onAct && <td style={{ background: C.dark }} />}
        </tr></tfoot>
      )}
    </Table>
  );
}

// ════════════════════════ 2) NET AGEING (Debtors + Creditors) ═════════════════
export function NetAgeing({ branch }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const q = useAgeing(branch);
  const age = q.data || {};
  const rec = age.receivables?.totals?.total || 0;
  const pay = age.payables?.totals?.total || 0;
  const net = rec - pay;
  const skel = <span className="kb-skeleton" style={{ display: 'inline-block', height: 18, width: 96, borderRadius: 5, verticalAlign: 'middle' }} />;
  return (
    <Shell title="Net Ageing — Debtors + Creditors" sub={`${brLabel(branch)}${age.asOf ? ` · as on ${age.asOf}` : ''} · receivable vs payable, with net working-capital position`}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ ...card, padding: 14, borderLeft: `4px solid ${C.blue}`, minWidth: 220 }}><div style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>RECEIVABLE (Debtors)</div><div style={{ fontSize: 20, fontWeight: 800, color: C.blue }}>{q.isLoading ? skel : money(cur, rec)}</div></div>
        <div style={{ ...card, padding: 14, borderLeft: `4px solid ${C.amber}`, minWidth: 220 }}><div style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>PAYABLE (Creditors)</div><div style={{ fontSize: 20, fontWeight: 800, color: C.amber }}>{q.isLoading ? skel : money(cur, pay)}</div></div>
        <div style={{ ...card, padding: 14, borderLeft: `4px solid ${net >= 0 ? C.green : C.red}`, minWidth: 220 }}><div style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>NET POSITION</div><div style={{ fontSize: 20, fontWeight: 800, color: net >= 0 ? C.green : C.red }}>{q.isLoading ? skel : money(cur, net)}</div><div style={{ fontSize: 10.5, color: C.dim }}>{net >= 0 ? 'net receivable' : 'net payable'}</div></div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, margin: '0 0 6px' }}>Debtors (Receivables) ageing</div>
      <AgeingTable side={age.receivables} cur={cur} tone={C.blue} partyLabel="Customer" />
      <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, margin: '14px 0 6px' }}>Creditors (Payables) ageing</div>
      <AgeingTable side={age.payables} cur={cur} tone={C.amber} partyLabel="Supplier" />
    </Shell>
  );
}

// ════════════════════════ 3) COLLECTIONS FOLLOW-UP (DUNNING WORKSPACE) ═════════
// Real collections workspace: live overdue receivables (from the ageing engine)
// merged with persisted follow-up state — status, promise-to-pay, contact log,
// reminder count and dunning level. Batch "Send reminders" logs a dunning run.
const DUN_STATUS = ['open', 'promised', 'escalated', 'closed'];
const STATUS_C = { open: C.dim, promised: C.green, escalated: C.red, closed: C.blue };
const dunBadge = (s) => ({ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 800, color: '#fff', background: STATUS_C[s] || C.dim, textTransform: 'capitalize' });
const fmtWhen = (d) => (d ? String(d).slice(0, 10) : '');

// Custom status picker — a native <select>'s dropdown can't be themed (square
// corners, OS-default option rows), so this renders the same DUN_STATUS choices
// as a small rounded popover with colour-dot options instead.
function StatusMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        style={{ ...dunBadge(value), border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {value}
        <ChevronDown size={10} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div role="menu" style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50, minWidth: 130,
          background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`,
          boxShadow: '0 10px 28px rgba(13,19,38,0.16)', padding: 5, overflow: 'hidden',
        }}>
          {DUN_STATUS.map((s) => (
            <button key={s} type="button" onClick={() => { onChange(s); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                padding: '7px 9px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: s === value ? '#EEF3FF' : 'transparent',
                fontSize: 12, fontWeight: s === value ? 700 : 500, color: C.dark, textTransform: 'capitalize',
              }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_C[s] || C.dim, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{s}</span>
              {s === value && <Check size={12} color={C.blue} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CollectionsFollowup({ branch, setRoute }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const boardQ = useCollectionsBoard(branch);
  const board = boardQ.data || { rows: [], totals: {} };
  const rows = board.rows || [];
  const t = board.totals || {};

  const upsert = useUpsertFollowup();
  const contact = useAddContact();
  const remind = useReminderRun();
  const brCode = branch?.code || branch;

  const [openLog, setOpenLog] = useState(null);   // party whose contact log/form is expanded
  const [draft, setDraft] = useState({ channel: 'call', note: '', outcome: '' });

  const save = (party, patch) => upsert.mutate({ party, branch: brCode, ...patch });
  const logContact = (party) => {
    if (!draft.note && !draft.outcome) return;
    contact.mutate({ party, branch: brCode, ...draft }, { onSuccess: () => setDraft({ channel: 'call', note: '', outcome: '' }) });
  };

  return (
    <Shell title="Collections Follow-up" sub={`${brLabel(branch)} · overdue customers (>30d) with promise-to-pay, contact log & dunning`}
      right={
        <>
          <div style={{ ...card, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: C.red }}>Overdue {money(cur, t.overdue || 0)} · {t.customers || 0} customers</div>
          <button disabled={!rows.length || remind.isPending} onClick={() => remind.mutate({ branch: brCode, channel: 'whatsapp' })}
            style={{ ...aBtn(C.amber), opacity: !rows.length || remind.isPending ? 0.6 : 1 }}>
            <ReceiptText size={12} /> {remind.isPending ? 'Sending…' : 'Send reminders to all'}</button>
        </>
      }>
      {remind.data && <div style={{ ...card, padding: 10, marginBottom: 10, color: C.green, fontWeight: 700, fontSize: 12 }}>✓ Dunning run logged — {remind.data.reminded} reminder(s) via {remind.data.channel}.</div>}
      <Table>
        <thead><tr>
          <th style={th}>Customer</th>
          {AGE_COLS.map(([, l]) => <th key={l} style={{ ...th, ...rnum }}>{l}</th>)}
          <th style={{ ...th, ...rnum }}>Overdue</th>
          <th style={th}>Status</th><th style={th}>Promise</th><th style={{ ...th, ...rnum }}>Remind</th>
          <th style={{ ...th, textAlign: 'center' }}>Action</th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={10} style={{ ...td, textAlign: 'center', color: C.green, padding: 20 }}>✓ Nothing overdue — all current.</td></tr>}
          {rows.map((r) => {
            const f = r.followup || {};
            const isOpen = openLog === r.party;
            return (
              <React.Fragment key={r.party}>
                <tr style={{ background: isOpen ? '#f4f8ff' : '#fff' }}>
                  <td style={{ ...td, fontWeight: 600, color: C.dark }}>{r.party}
                    {f.dunningLevel > 0 && <span style={{ marginLeft: 6, fontSize: 10, color: C.red, fontWeight: 800 }}>L{f.dunningLevel}</span>}
                    <div style={{ fontSize: 10.5, color: C.dim }}>Total due {money(cur, r.total)}{f.lastContactAt ? ` · last contact ${fmtWhen(f.lastContactAt)}` : ''}</div>
                  </td>
                  {AGE_COLS.map(([k]) => <td key={k} style={{ ...td, ...rnum, color: k === 'd90' && r[k] > 0 ? C.red : C.dark }}>{r[k] ? money(cur, r[k]) : '—'}</td>)}
                  <td style={{ ...td, ...rnum, fontWeight: 800, color: C.red }}>{money(cur, r.overdue)}</td>
                  <td style={td}>
                    <StatusMenu value={f.status || 'open'} onChange={(s) => save(r.party, { status: s })} />
                  </td>
                  <td style={td}>
                    <input type="date" value={fmtWhen(f.promisedDate)} onChange={(e) => save(r.party, { promisedDate: e.target.value, status: e.target.value ? 'promised' : (f.status || 'open') })}
                      style={{ padding: '3px 6px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }} />
                  </td>
                  <td style={{ ...td, ...rnum }}>
                    <span style={{ fontWeight: 700 }}>{f.remindersSent || 0}</span>
                    <button title="Send one reminder" onClick={() => remind.mutate({ branch: brCode, parties: [r.party], channel: 'whatsapp' })} style={{ ...aBtn(C.amber), marginLeft: 6, padding: '3px 7px' }}>Remind</button>
                  </td>
                  <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {setRoute && <button title="Customer 360°" onClick={() => setRoute(`/reports/customer-360?party=${encodeURIComponent(r.party)}`)} style={{ ...aBtn(C.blue), marginRight: 4 }}>360°</button>}
                    {setRoute && <button onClick={() => setRoute(`/reports/client-statement?party=${encodeURIComponent(r.party)}`)} style={{ ...aBtn(C.dark), marginRight: 4 }}>Statement</button>}
                    {setRoute && <button onClick={() => setRoute('/receipts')} style={{ ...aBtn(C.green), marginRight: 4 }}>Receipt</button>}
                    <button onClick={() => { setOpenLog(isOpen ? null : r.party); setDraft({ channel: 'call', note: '', outcome: '' }); }} style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}` }}>{isOpen ? 'Hide' : `Log (${(f.contactLog || []).length})`}</button>
                  </td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={10} style={{ ...td, background: '#f7f9ff' }}>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 320px' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, marginBottom: 6 }}>LOG A CONTACT</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <select value={draft.channel} onChange={(e) => setDraft((d) => ({ ...d, channel: e.target.value }))} style={{ padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }}>
                              {['call', 'email', 'whatsapp', 'sms', 'visit', 'other'].map((c) => <option key={c}>{c}</option>)}
                            </select>
                            <input placeholder="Note (what was said)" value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} style={{ flex: 1, minWidth: 160, padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }} />
                            <input placeholder="Outcome (e.g. promised 5th)" value={draft.outcome} onChange={(e) => setDraft((d) => ({ ...d, outcome: e.target.value }))} style={{ width: 180, padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }} />
                            <button onClick={() => logContact(r.party)} style={aBtn(C.green)}>Save</button>
                          </div>
                          <textarea placeholder="Account notes (auto-saves)" defaultValue={f.notes || ''} onBlur={(e) => { if (e.target.value !== (f.notes || '')) save(r.party, { notes: e.target.value }); }}
                            rows={2} style={{ width: '100%', boxSizing: 'border-box', marginTop: 8, border: `1px solid ${C.border}`, borderRadius: 6, padding: 6, fontSize: 12 }} />
                        </div>
                        <div style={{ flex: '1 1 320px' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, marginBottom: 6 }}>CONTACT HISTORY ({(f.contactLog || []).length})</div>
                          {(f.contactLog || []).length === 0 ? <div style={{ fontSize: 12, color: C.dim }}>No contact logged yet.</div> :
                            (f.contactLog || []).map((c, j) => (
                              <div key={j} style={{ fontSize: 11.5, padding: '4px 0', borderBottom: '1px solid #dfe2e7' }}>
                                <b style={{ color: C.dark }}>{fmtWhen(c.at)}</b> · {c.channel} · {c.by} {c.note ? `— ${c.note}` : ''} {c.outcome ? <span style={{ color: C.green }}>({c.outcome})</span> : null}
                              </div>
                            ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </Table>
    </Shell>
  );
}

// ════════════════════════ 4) SUPPLIER RECONCILIATION ══════════════════════════
// Real statement reconciliation: import the vendor's statement of account, then
// match it line-by-line against OUR creditor ledger (the book). Mirrors Bank
// Reconciliation. Book side comes from the double-entry engine; statement side
// from the imported rows. Differences surface a missing bill / unposted payment.
const STATUS_TONE = { reconciled: C.green, partial: C.gold, exception: C.red, unreconciled: C.dim };
const recoBadge = (s) => ({ padding: '2px 7px', borderRadius: 10, fontSize: 10, fontWeight: 800, color: '#fff', background: STATUS_TONE[s] || C.dim, textTransform: 'capitalize' });

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
  const stmtPager = usePager(stmt); // page the statement rows; count/badges read full `stmt`
  const sum = sumQ.data || {};

  const imp = useImportSupplierStatement();
  const auto = useSupplierAutoMatch();
  const manual = useSupplierManualMatch();
  const unmatch = useSupplierUnmatch();
  const setStatus = useSetSupplierReconStatus();
  const del = useDeleteSupplierStatementLine();
  const clear = useClearSupplierStatement();

  const [paste, setPaste] = useState('');
  const parsed = useMemo(() => parseSupplierStatement(paste), [paste]);
  const unreconciledBook = (book.lines || []).filter((l) => !l.reconciled);

  const doImport = () => {
    if (!sel || !parsed.length) return;
    imp.mutate({ supplier: sel, branch: branch?.code || branch, rows: parsed, fileName: 'pasted' },
      { onSuccess: () => setPaste('') });
  };

  const diff = Number(sum.differenceAmount || 0);
  const matchTo = (s, bookKey) => {
    const b = (book.lines || []).find((x) => x.bookKey === bookKey);
    if (!b) return;
    manual.mutate({ id: s.id, bookKey: b.bookKey, vno: b.vno, bookDebit: b.debit, bookCredit: b.credit });
  };

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

          {/* Statement lines */}
          <SecTitle>Vendor statement ({stmt.length}) — match each to a book entry</SecTitle>
          <Table pager={stmtPager}>
            <thead><tr>
              {['Date', 'Invoice / Ref', 'Description', 'Debit', 'Credit', 'Status', 'Match / Action'].map((h, i) =>
                <th key={h} style={{ ...th, ...(i >= 3 && i <= 4 ? rnum : {}) }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {stmt.length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>No statement imported yet for {sel}.</td></tr>}
              {stmtPager.pageRows.map((s) => (
                <tr key={s.id} style={{ background: s.status === 'reconciled' ? '#f4fbf4' : s.status === 'exception' ? '#fdf4f4' : '#fff' }}>
                  <td style={td}>{s.date}</td>
                  <td style={{ ...td, fontWeight: 600, color: C.blue }}>{s.invoiceNo || s.reference || '—'}</td>
                  <td style={{ ...td, color: C.dim }}>{s.description || '—'}</td>
                  <td style={{ ...td, ...rnum }}>{s.debit ? money(cur, s.debit) : '—'}</td>
                  <td style={{ ...td, ...rnum }}>{s.credit ? money(cur, s.credit) : '—'}</td>
                  <td style={td}><span style={recoBadge(s.status)}>{s.status}{s.variance ? ` · Δ${money(cur, Math.abs(s.variance))}` : ''}</span>{s.matchedVno ? <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{s.matchedVno}</div> : null}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    {s.status === 'reconciled' || s.status === 'partial' ? (
                      <button onClick={() => unmatch.mutate({ id: s.id })} style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}` }}>Unmatch</button>
                    ) : (
                      <>
                        <select defaultValue="" onChange={(e) => e.target.value && matchTo(s, e.target.value)}
                          style={{ padding: '4px 6px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, maxWidth: 200 }}>
                          <option value="">Match to book…</option>
                          {unreconciledBook.map((b) => <option key={b.bookKey} value={b.bookKey}>{b.vno} · {b.date} · {money(cur, b.credit - b.debit)}</option>)}
                        </select>
                        <button onClick={() => setStatus.mutate({ id: s.id, status: 'exception' })} style={{ ...aBtn(C.red), marginLeft: 5 }}>Dispute</button>
                        <button onClick={() => del.mutate({ id: s.id })} title="Delete this line" style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}`, marginLeft: 5 }}>✕</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
            A statement <b>debit</b> (they billed us) matches a book <b>credit</b> (a bill we posted); a statement <b>credit</b> (our payment) matches a book <b>debit</b>. Unmatched items on either side are the reconciling differences — usually a missing bill, an unposted payment, or an ADM/ACM not captured.
          </div>
        </>
      )}
    </Shell>
  );
}

// ════════════════════════ 4b) CLIENT RECONCILIATION ═══════════════════════════
// Receivable-side reconciliation, the mirror of Supplier Reco. Two levels:
//   • Workbench — a grid of every client (debtor) ledger with its recon status.
//   • Drill-in  — one client, with BOTH internal allocation (FIFO receipts↔
//     invoices, no statement needed) AND external statement matching.
const WB_TONE = { reconciled: C.green, differences: C.red, 'not-started': C.dim };
const wbBadge = (s) => ({ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 800, color: '#fff', background: WB_TONE[s] || C.dim, textTransform: 'capitalize', whiteSpace: 'nowrap' });

// Download an array of flat objects as a CSV file (reconciliation statement export).
function downloadCSV(filename, rows) {
  if (!rows || !rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

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
  const unmatch = useClientUnmatch();
  const setStatus = useSetClientReconStatus();
  const del = useDeleteClientStatementLine();
  const clear = useClearClientStatement();

  const parsed = useMemo(() => parseClientStatement(paste), [paste]);
  const unreconciledBook = (book.lines || []).filter((l) => !l.reconciled);

  const filtered = useMemo(() => (list.rows || []).filter((r) =>
    (!q || r.client.toLowerCase().includes(q.toLowerCase())) &&
    (!onlyDiff || r.status === 'differences')), [list.rows, q, onlyDiff]);
  // Page the long lists; KPI totals/badges and the empty-states read the full sets.
  const wbPager = usePager(filtered);   // workbench: every client ledger
  const stmtPager = usePager(stmt);     // drill-in: imported statement rows

  const doImport = () => {
    if (!client || !parsed.length) return;
    imp.mutate({ client, branch: branch?.code || branch, rows: parsed, fileName: 'pasted' }, { onSuccess: () => setPaste('') });
  };
  const matchTo = (s, bookKey) => {
    const b = (book.lines || []).find((x) => x.bookKey === bookKey);
    if (!b) return;
    manual.mutate({ id: s.id, bookKey: b.bookKey, vno: b.vno, bookDebit: b.debit, bookCredit: b.credit });
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

          <SecTitle>Client statement ({stmt.length}) — match each to a book entry</SecTitle>
          <Table pager={stmtPager}>
            <thead><tr>
              {['Date', 'Invoice / Ref', 'Description', 'Debit', 'Credit', 'Status', 'Match / Action'].map((h, i) =>
                <th key={h} style={{ ...th, ...(i >= 3 && i <= 4 ? rnum : {}) }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {stmt.length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>No statement imported yet for {client}. Use the internal tab to reconcile against our own books.</td></tr>}
              {stmtPager.pageRows.map((s) => (
                <tr key={s.id} style={{ background: s.status === 'reconciled' ? '#f4fbf4' : s.status === 'exception' ? '#fdf4f4' : '#fff' }}>
                  <td style={td}>{s.date}</td>
                  <td style={{ ...td, fontWeight: 600, color: C.blue }}>{s.invoiceNo || s.reference || '—'}</td>
                  <td style={{ ...td, color: C.dim }}>{s.description || '—'}</td>
                  <td style={{ ...td, ...rnum }}>{s.debit ? money(cur, s.debit) : '—'}</td>
                  <td style={{ ...td, ...rnum }}>{s.credit ? money(cur, s.credit) : '—'}</td>
                  <td style={td}><span style={recoBadge(s.status)}>{s.status}{s.variance ? ` · Δ${money(cur, Math.abs(s.variance))}` : ''}</span>{s.matchedVno ? <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{s.matchedVno}</div> : null}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    {s.status === 'reconciled' || s.status === 'partial' ? (
                      <button onClick={() => unmatch.mutate({ id: s.id })} style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}` }}>Unmatch</button>
                    ) : (
                      <>
                        <select defaultValue="" onChange={(e) => e.target.value && matchTo(s, e.target.value)}
                          style={{ padding: '4px 6px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, maxWidth: 200 }}>
                          <option value="">Match to book…</option>
                          {unreconciledBook.map((b) => <option key={b.bookKey} value={b.bookKey}>{b.vno} · {b.date} · {money(cur, b.debit - b.credit)}</option>)}
                        </select>
                        <button onClick={() => setStatus.mutate({ id: s.id, status: 'exception' })} style={{ ...aBtn(C.red), marginLeft: 5 }}>Dispute</button>
                        <button onClick={() => del.mutate({ id: s.id })} title="Delete this line" style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}`, marginLeft: 5 }}>✕</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
            A statement <b>debit</b> (an invoice) matches a book <b>debit</b> (a sale); a statement <b>credit</b> (their payment) matches a book <b>credit</b> (a receipt) — same direction, since a client is a debtor. Unmatched items are the reconciling differences.
          </div>
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

// ════════════════════════ 4c) INTER-BRANCH RECONCILIATION ═════════════════════
// Branches are independent books; a transaction between two must be booked on BOTH
// sides via their directional current accounts ("TK- {other} Branch"). This screen
// pairs the two sides per branch pair and flags any that don't net to zero — a
// one-sided or mismatched inter-branch entry.
export function InterBranchReco({ branch }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const q = useInterBranchReco();
  const data = q.data || { pairs: [], totals: {} };
  return (
    <Shell title="Inter-branch Reconciliation" sub="every branch pair's two directional current accounts — they should net to zero"
      right={<div style={{ ...card, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: data.totals?.mismatched ? C.red : C.green }}>{data.totals?.mismatched || 0} mismatched · {data.totals?.matched || 0} matched</div>}>
      <Row>
        <Tile icon={<Scale size={13} />} label="Branch Pairs" value={data.totals?.pairs || 0} sub="with activity" tone={C.dark} loading={q.isLoading} />
        <Tile icon={<CheckCircle2 size={13} />} label="Reconciled" value={data.totals?.matched || 0} sub="net to zero" tone={C.green} loading={q.isLoading} />
        <Tile icon={<AlertTriangle size={13} />} label="Mismatched" value={data.totals?.mismatched || 0} sub="one-sided / unequal" tone={C.red} loading={q.isLoading} />
        <Tile icon={<Coins size={13} />} label="Total Difference" value={money(cur, data.totals?.totalDifference)} sub="sum of |differences|" tone={C.gold} loading={q.isLoading} />
      </Row>
      <Table>
        <thead><tr>
          {['Branch A', 'Branch B', 'A receivable from B', 'B receivable from A', 'Difference', 'Status'].map((h, i) =>
            <th key={h} style={{ ...th, ...(i >= 2 && i <= 4 ? rnum : {}) }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {q.isLoading && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>Loading…</td></tr>}
          {!q.isLoading && data.pairs.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.green, padding: 20 }}>✓ No inter-branch balances to reconcile.</td></tr>}
          {data.pairs.map((p, i) => (
            <tr key={i} style={{ background: p.matched ? '#f4fbf4' : '#fdf6f4' }}>
              <td style={{ ...td, fontWeight: 700, color: C.dark }}>{p.branchA}</td>
              <td style={{ ...td, fontWeight: 700, color: C.dark }}>{p.branchB}</td>
              <td style={{ ...td, ...rnum }}>{money(cur, p.aReceivableFromB)}</td>
              <td style={{ ...td, ...rnum }}>{money(cur, p.bReceivableFromA)}</td>
              <td style={{ ...td, ...rnum, fontWeight: 700, color: p.matched ? C.dim : C.red }}>{money(cur, Math.abs(p.difference))}</td>
              <td style={td}><span style={wbBadge(p.matched ? 'reconciled' : 'differences')}>{p.matched ? 'reconciled' : 'mismatch'}</span></td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
        Each pair compares branch A's "Travkings Tours and Travels B" ledger against branch B's "Travkings Tours and Travels A" ledger (sub-group <b>Inter Branch</b>). The selling branch books a debtor and the buying branch a creditor, so the two should be equal and opposite (net zero). A non-zero difference means one branch booked the deal and the other hasn't, or the amounts disagree — an agreement check, not an elimination.
      </div>
    </Shell>
  );
}

// ════════════════════════ 4d) TALLY RECONCILIATION ════════════════════════════
// Reconcile ANY ERP ledger against an imported Tally ledger export — the in-app
// version of the per-bank Tally↔ERP recon scripts. Pick a ledger, paste its Tally
// export, then auto/manual match against the live ERP postings.
export function TallyReco({ branch }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const tb = useTrialBalance(branch).data || {};
  const ledgers = useMemo(() => (tb.rows || []).map((r) => r.ledger).filter(Boolean), [tb]);
  const [ledger, setLedger] = useState('');
  const sel = ledger || ledgers[0] || '';

  const bookQ = useTallyBook(sel, branch);
  const tallyQ = useTallyRows(sel, branch);
  const sumQ = useTallyRecoSummary(sel, branch);
  const book = bookQ.data || { lines: [] };
  const rows = tallyQ.data || [];
  const rowsPager = usePager(rows); // page the Tally rows; count/totals read full `rows`
  const sum = sumQ.data || {};

  const imp = useImportTally();
  const auto = useTallyAutoMatch();
  const manual = useTallyManualMatch();
  const unmatch = useTallyUnmatch();
  const setStatus = useSetTallyRecoStatus();
  const del = useDeleteTallyLine();
  const clear = useClearTally();

  const [paste, setPaste] = useState('');
  const parsed = useMemo(() => parseTallyStatement(paste), [paste]);
  const unreconciledBook = (book.lines || []).filter((l) => !l.reconciled);
  const diff = Number(sum.differenceAmount || 0);

  const doImport = () => { if (!sel || !parsed.length) return; imp.mutate({ ledger: sel, branch: branch?.code || branch, rows: parsed, fileName: 'pasted' }, { onSuccess: () => setPaste('') }); };
  const matchTo = (t, bookKey) => { const b = (book.lines || []).find((x) => x.bookKey === bookKey); if (!b) return; manual.mutate({ id: t.id, bookKey: b.bookKey, vno: b.vno, bookDebit: b.debit, bookCredit: b.credit }); };

  return (
    <Shell title="Tally Reconciliation" sub={`${brLabel(branch)} · import a ledger's Tally export, then match it against the ERP books`}
      right={
        <>
          <select value={sel} onChange={(e) => setLedger(e.target.value)} style={{ padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12.5, minWidth: 220 }}>
            {!ledgers.length && <option value="">No ledgers</option>}
            {ledgers.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button disabled={!sel || auto.isPending} onClick={() => auto.mutate({ ledger: sel, branch: branch?.code || branch })} style={{ ...aBtn(C.blue), opacity: !sel || auto.isPending ? 0.6 : 1 }}>{auto.isPending ? 'Matching…' : 'Auto-match'}</button>
        </>
      }>
      {!sel ? (
        <div style={{ ...card, padding: 20, color: C.dim, fontSize: 13 }}>Select a ledger to reconcile against Tally.</div>
      ) : (
        <>
          <Row>
            <Tile icon={<Scale size={13} />} label="Per ERP Books" value={money(cur, sum.bookBalance)} sub="ledger closing" tone={C.dark} loading={sumQ.isLoading} />
            <Tile icon={<ReceiptText size={13} />} label="Per Tally" value={money(cur, sum.tallyBalance)} sub={sum.tallyBalanceDerived ? 'derived' : 'as imported'} tone={C.blue} loading={sumQ.isLoading} />
            <Tile icon={<AlertTriangle size={13} />} label="Difference" value={money(cur, Math.abs(diff))} sub={Math.abs(diff) <= 0.01 ? '✓ reconciled' : 'ERP vs Tally gap'} tone={Math.abs(diff) <= 0.01 ? C.green : C.red} loading={sumQ.isLoading} />
            <Tile icon={<CheckSquare size={13} />} label="Matched / Open" value={`${sum.counts?.tallyReconciled || 0} / ${sum.counts?.tallyUnreconciled || 0}`} sub={`${sum.counts?.tallyException || 0} exceptions`} tone={C.gold} loading={sumQ.isLoading} />
          </Row>

          <div style={{ ...card, padding: 12, marginBottom: 12 }}>
            <SecTitle>Import Tally export (paste CSV / Excel rows: date, voucher no, debit, credit, narration)</SecTitle>
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={3} placeholder={'2026-05-01, RCP-1, 1000, 0, deposit\n2026-05-04, PMT-1, 0, 300, cheque 5001'}
              style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${C.border}`, borderRadius: 6, padding: 8, fontSize: 12, fontFamily: 'monospace' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <button disabled={!parsed.length || imp.isPending} onClick={doImport} style={{ ...aBtn(C.green), opacity: !parsed.length || imp.isPending ? 0.6 : 1 }}><Plus size={12} /> {imp.isPending ? 'Importing…' : `Import ${parsed.length} row${parsed.length === 1 ? '' : 's'}`}</button>
              {rows.length > 0 && <button onClick={() => clear.mutate({ ledger: sel, branch })} style={{ ...aBtn(C.red), background: '#fff', color: C.red, border: `1px solid ${C.red}` }}>Clear all imported</button>}
              <span style={{ fontSize: 11, color: C.dim }}>Duplicates and blank rows are skipped automatically.</span>
            </div>
          </div>

          <SecTitle>Tally rows ({rows.length}) — match each to an ERP posting</SecTitle>
          <Table pager={rowsPager}>
            <thead><tr>{['Date', 'Voucher', 'Narration', 'Debit', 'Credit', 'Status', 'Match / Action'].map((h, i) => <th key={h} style={{ ...th, ...(i >= 3 && i <= 4 ? rnum : {}) }}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>No Tally rows imported yet for {sel}.</td></tr>}
              {rowsPager.pageRows.map((t) => (
                <tr key={t.id} style={{ background: t.status === 'reconciled' ? '#f4fbf4' : t.status === 'exception' ? '#fdf4f4' : '#fff' }}>
                  <td style={td}>{t.date}</td>
                  <td style={{ ...td, fontWeight: 600, color: C.blue }}>{t.vno || t.reference || '—'}</td>
                  <td style={{ ...td, color: C.dim }}>{t.description || '—'}</td>
                  <td style={{ ...td, ...rnum }}>{t.debit ? money(cur, t.debit) : '—'}</td>
                  <td style={{ ...td, ...rnum }}>{t.credit ? money(cur, t.credit) : '—'}</td>
                  <td style={td}><span style={recoBadge(t.status)}>{t.status}{t.variance ? ` · Δ${money(cur, Math.abs(t.variance))}` : ''}</span>{t.matchedVno ? <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{t.matchedVno}</div> : null}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    {t.status === 'reconciled' || t.status === 'partial' ? (
                      <button onClick={() => unmatch.mutate({ id: t.id })} style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}` }}>Unmatch</button>
                    ) : (
                      <>
                        <select defaultValue="" onChange={(e) => e.target.value && matchTo(t, e.target.value)} style={{ padding: '4px 6px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, maxWidth: 200 }}>
                          <option value="">Match to ERP…</option>
                          {unreconciledBook.map((b) => <option key={b.bookKey} value={b.bookKey}>{b.vno} · {b.date} · {money(cur, b.debit - b.credit)}</option>)}
                        </select>
                        <button onClick={() => setStatus.mutate({ id: t.id, status: 'exception' })} style={{ ...aBtn(C.red), marginLeft: 5 }}>Exception</button>
                        <button onClick={() => del.mutate({ id: t.id })} title="Delete" style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}`, marginLeft: 5 }}>✕</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
            A Tally <b>debit</b> matches an ERP book <b>debit</b> and a credit a credit (same ledger convention on both sides). Unmatched rows are the ERP↔Tally differences — usually an entry posted in one system but not the other.
          </div>
        </>
      )}
    </Shell>
  );
}

// ════════════════════════ 5) SUSPENSE / UNSPECIFIED CLEARING ═══════════════════
export function SuspenseClearing({ branch, setRoute }) {
  const bookings = useBookingOrders(branch, { status: 'pending' }).data || []; // only pending is used here (stuck/suspense/counts)
  // /api/vouchers/approvals returns { counts, entries } — use the entries[] array.
  const pendVouchers = useVoucherApprovals(branch, 'pending').data?.entries || [];
  // Suspense = pending items the books can't accept yet: a booking failing the
  // verification gate (missing ledger / out of balance), or a pending voucher.
  const stuck = useMemo(() => bookings
    .filter((b) => b.status === 'pending' && b.validation?.hasErrors)
    .map((b) => ({ ref: b.bookingNo, branch: b.branch, kind: b.module || 'SO/PO/GP', issue: (b.validation?.errors || []).join(' · ') || 'Verification failed' })), [bookings]);
  return (
    <Shell title="Suspense / Unspecified Clearing" sub={`${brLabel(branch)} · items the books can't post until fixed — clear these before month-end`}
      right={<div style={{ ...card, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: stuck.length ? C.red : C.green }}>{stuck.length} to fix · {pendVouchers.length} pending vouchers</div>}>
      <Table>
        <thead><tr><th style={th}>Reference</th><th style={th}>Branch</th><th style={th}>Type</th><th style={th}>Why it's stuck</th><th style={{ ...th, textAlign: 'center' }}>Action</th></tr></thead>
        <tbody>
          {stuck.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: C.green, padding: 20 }}>✓ No suspense — every pending item passes the verification gate.</td></tr>}
          {stuck.map((s, i) => (
            <tr key={i} style={{ background: i % 2 ? '#fafbff' : '#fff' }}>
              <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>{s.ref}</td>
              <td style={{ ...td }}>{s.branch}</td>
              <td style={{ ...td }}>{s.kind}</td>
              <td style={{ ...td, color: C.red }}>{s.issue}</td>
              <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                <button onClick={() => setRoute && setRoute('/masters/ledgers')} style={{ ...aBtn(C.green), marginRight: 5 }}>Create Ledger</button>
                <button onClick={() => setRoute && setRoute('/transactions/approvals')} style={aBtn(C.blue)}>Open &amp; Fix</button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>Most fixes: create the missing ledger in Masters, then re-approve. The Unspecified cost-centre bucket must stay empty — tag any untagged sale/purchase to its module.</div>
    </Shell>
  );
}

// ════════════════════════ 6) MONTH-END CHECKLIST / DAY-CLOSE ═══════════════════
export function MonthEndChecklist({ branch, setRoute }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const bookings = useBookingOrders(branch, { status: 'pending' }).data || []; // only pending is used here (stuck/suspense/counts)
  // /api/vouchers/approvals returns { counts, entries } — use the entries[] array.
  const pendVouchers = useVoucherApprovals(branch, 'pending').data?.entries || [];
  const tbData = useTrialBalance(branch).data || {};
  const tb = tbData.rows || [];

  // Manual ticks persist per branch × month in the generic app-config store, so they
  // survive reloads and are shared across the branch's accountants.
  const period = thisYM();
  const cfgKey = `month-end:${branchCode(branch) || 'ALL'}:${period}`;
  const savedQ = useConfigValue(cfgKey);
  const saver = useSaveConfigValue();
  const [manual, setManual] = useState({});
  // Hydrate from the saved ticks. Key the effect on the STRINGIFIED value (a stable
  // primitive) so a new-but-equal object reference can't trigger a re-render loop.
  const savedJson = JSON.stringify(savedQ.data || {});
  useEffect(() => { setManual(JSON.parse(savedJson)); }, [savedJson]);
  const toggleManual = (k) => setManual((m) => {
    const next = { ...m, [k]: !m[k] };
    saver.mutate({ key: cfgKey, value: next, description: `Month-end checklist ${period}` });
    return next;
  });

  const pendCount = bookings.filter((b) => b.status === 'pending').length + pendVouchers.length;
  const suspenseCount = bookings.filter((b) => b.status === 'pending' && b.validation?.hasErrors).length;
  const tbDr = tb.reduce((s, r) => s + (Number(r.closingDebit ?? r.debit) || 0), 0);
  const tbCr = tb.reduce((s, r) => s + (Number(r.closingCredit ?? r.credit) || 0), 0);
  const tbBalanced = Math.abs(tbDr - tbCr) < 1;

  // auto = derived from live data · manual = accountant ticks (this session)
  const items = [
    { key: 'post', auto: pendCount === 0, label: 'All vouchers approved & posted', detail: pendCount ? `${pendCount} still pending` : 'nothing pending', route: '/transactions/approvals' },
    { key: 'suspense', auto: suspenseCount === 0, label: 'Suspense cleared', detail: suspenseCount ? `${suspenseCount} stuck` : 'none', route: '/accounts/suspense' },
    { key: 'tb', auto: tbBalanced, label: 'Trial Balance balanced (Dr = Cr)', detail: tbBalanced ? 'balanced' : `out by ${money(cur, Math.abs(tbDr - tbCr))}`, route: '/finance/trial-balance' },
    { key: 'bankreco', manualOnly: true, label: 'Bank reconciliation done', detail: 'tick when reconciled', route: '/bank-reco' },
    { key: 'debtors', manualOnly: true, label: 'Debtors & creditors reviewed', detail: 'tick when followed up', route: '/accounts/net-ageing' },
    { key: 'cash', manualOnly: true, label: 'Cash counted vs Cash Book', detail: 'tick at day-close', route: '/finance/cash-book' },
  ];
  const done = items.filter((it) => it.manualOnly ? manual[it.key] : it.auto).length;

  return (
    <Shell title="Month-End Checklist / Day-Close" sub={`${brLabel(branch)} · close the books cleanly — auto-checks update live; tick the manual ones`}
      right={<div style={{ ...card, padding: '6px 12px', fontSize: 12, fontWeight: 800, color: done === items.length ? C.green : C.amber }}>{done}/{items.length} done</div>}>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {items.map((it, i) => {
          const ok = it.manualOnly ? !!manual[it.key] : it.auto;
          return (
            <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderTop: i ? '1px solid #dfe2e7' : 'none' }}>
              <span {...(it.manualOnly ? clickable(() => toggleManual(it.key)) : {})}
                style={{ width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', cursor: it.manualOnly ? 'pointer' : 'default', background: ok ? C.green : (it.manualOnly ? '#cbd0db' : C.amber) }}>
                {ok ? '✓' : (it.manualOnly ? '' : '!')}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{it.label} {it.manualOnly && <span style={{ fontSize: 10, color: C.dim, fontWeight: 600 }}>(manual)</span>}</div>
                <div style={{ fontSize: 11, color: ok ? C.green : C.dim }}>{it.detail}</div>
              </div>
              <button onClick={() => setRoute && setRoute(it.route)} style={aBtn(C.blue)}>Open</button>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>Auto-checks (post · suspense · trial balance) reflect live data. Manual ticks are saved per branch &amp; month{saver.isPending ? ' · saving…' : ''}.</div>
    </Shell>
  );
}
