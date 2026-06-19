// ─── Accounts ▸ Branch Accountant Workspace ───────────────────────────────────
// Six screens that let a branch accountant operate their whole day from one place.
// All data is REUSED from existing endpoints (ageing, registers, approvals, trial
// balance, tax) — these screens compose & focus that data; they post nothing new.
// Branch-scoped via the top-right selector (the `branch` prop), exactly like every
// other live screen. Cards/links jump into the existing working screens via setRoute.
import React, { useEffect, useMemo, useState } from 'react';
import { card } from '../core/styles';
import { bc } from '../core/styles';
import {
  branchCode, useAgeing, useTaxSummary, useTrialBalance, useVoucherApprovals,
  useBookingOrders, useSalesRegister, usePurchaseRegister, useConfigValue, useSaveConfigValue,
  useOutstanding, useDayBook, useAlerts,
} from '../core/useAccounting';
import { useTaxCalendar } from '../core/useReference';
import { useBankLedgers, useBankReconSummary } from '../core/useBankReco';
import {
  Wallet, Landmark, CheckSquare, TrendingUp, TrendingDown, ReceiptText, AlertTriangle,
  ListChecks, ArrowRight, Plus, RefreshCw, Calendar, History, AlertCircle, CheckCircle2,
  Scale, Coins, CreditCard,
} from 'lucide-react';

const C = { dark: '#0d1326', gold: '#d4a437', blue: '#185FA5', red: '#A32D2D', green: '#27500A', dim: '#5a6691', border: '#e1e3ec', amber: '#854F0B' };
const money = (cur, n) => cur + Math.round(Number(n) || 0).toLocaleString('en-IN');
const brLabel = (b) => (b === 'ALL' || !b ? 'All Branches' : (b.name || b.code || b));

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
  <div style={{ margin: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
      <div>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: C.dim }}>{sub}</div>}
      </div>
      {right && <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>{right}</div>}
    </div>
    {children}
  </div>
);
const th = { padding: '8px 12px', background: C.dark, color: C.gold, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'left', whiteSpace: 'nowrap' };
const td = { padding: '8px 12px', borderBottom: '1px solid #f0f2f7', fontSize: 12.5 };
const rnum = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const Table = ({ children }) => (
  <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
    <div style={{ maxHeight: '70vh', overflow: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>{children}</table></div>
  </div>
);
const aBtn = (bg) => ({ padding: '5px 11px', fontSize: 11, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', color: '#fff', background: bg, display: 'inline-flex', alignItems: 'center', gap: 5 });

// ════════════════════════ 1) DASHBOARD ACCOUNTANT ════════════════════════════
// Module-level so they don't remount each render.
const Tile = ({ icon, label, value, sub, tone = C.dark, onClick }) => (
  <div onClick={onClick} style={{ ...card, padding: 14, cursor: onClick ? 'pointer' : 'default', minWidth: 180, flex: '1 1 180px', borderLeft: `4px solid ${tone}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.dim, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>{icon}{label}</div>
    <div style={{ fontSize: 21, fontWeight: 800, color: tone, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{sub} {onClick && <ArrowRight size={11} style={{ verticalAlign: 'middle' }} />}</div>}
  </div>
);
const SecTitle = ({ children }) => <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 2px 8px' }}>{children}</div>;
const Row = ({ children }) => <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>{children}</div>;

// One ageing row (Debtors or Creditors): the four buckets + total, clickable to its full report.
function AgeBucketRow({ label, totals = {}, cur, tone, onClick }) {
  const cell = (v, red) => <td style={{ padding: '7px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: red && v > 0 ? C.red : C.dark, whiteSpace: 'nowrap' }}>{v ? money(cur, v) : '—'}</td>;
  return (
    <tr onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', borderTop: '1px solid #f0f2f7' }}>
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
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: i ? '1px solid #f3f4f8' : 'none' }}>
          <span style={{ flex: 1, fontSize: 12, color: C.dark, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.party}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: tone, fontVariantNumeric: 'tabular-nums' }}>{money(cur, r[valueKey])}</span>
          {onAction && <button onClick={() => onAction(r)} style={{ ...aBtn(tone), padding: '3px 8px', fontSize: 10 }}>{actionLabel}</button>}
        </div>
      ))}
    </div>
  );
}

export function DashboardAccountant({ branch, setRoute }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const go = (r) => setRoute && setRoute(r);
  const ym = thisYM();
  const monthFrom = `${ym}-01`;
  const today = new Date().toISOString().slice(0, 10);
  const age = useAgeing(branch).data || {};
  // GST is a PERIODIC return — scope to the current month (a bare call is inception-to-date).
  const tax = useTaxSummary(branch, { from: monthFrom, to: today }).data || {};
  const tb = useTrialBalance(branch).data?.rows || []; // bare = cumulative closing = current balance
  const bookings = useBookingOrders(branch).data || [];
  const pendVouchers = useVoucherApprovals(branch, 'pending').data || [];
  const sales = useSalesRegister(branch).data || [];
  const purch = usePurchaseRegister(branch).data || [];
  const out = useOutstanding(branch).data || {};
  const day = useDayBook(branch, { from: today, to: today }).data || [];
  const savedTicks = useConfigValue(`month-end:${branchCode(branch) || 'ALL'}:${ym}`).data || {};
  
  // Custom additions for dashboard
  const { data: alertsRes } = useAlerts(branch);
  const { data: bankLedgers } = useBankLedgers(branch);
  const { data: taxEvents } = useTaxCalendar();

  const [activeTab, setActiveTab] = useState('daily');
  const [selectedBank, setSelectedBank] = useState('');

  // Auto-select first bank ledger once loaded
  useEffect(() => {
    if (bankLedgers && bankLedgers.length > 0 && !selectedBank) {
      setSelectedBank(bankLedgers[0].name);
    }
  }, [bankLedgers, selectedBank]);

  const { data: recoSummary } = useBankReconSummary(selectedBank, branch, { from: monthFrom, to: today });

  const savedNotes = useConfigValue(`followup-notes:${branchCode(branch) || 'ALL'}`).data || {};
  const saveNoteMutation = useSaveConfigValue();
  const [editingNotes, setEditingNotes] = useState({});

  const inMonth = (v) => ymOf(v.date) === ym;
  const sumTot = (arr) => arr.reduce((s, v) => s + (Number(v.total) || 0), 0);
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
  const tds = tax.wht?.payable || 0;
  const tcs = tax.tcs?.payable || 0;
  const onAcct = out.onAccountReceipts || [];
  const onAcctSum = onAcct.reduce((s, r) => s + (Number(r.onAccount) || 0), 0);
  const collectedToday = day.filter((j) => j.category === 'receipt').reduce((s, j) => s + (Number(j.totalDebit) || 0), 0);
  const paidToday = day.filter((j) => j.category === 'payment').reduce((s, j) => s + (Number(j.totalDebit) || 0), 0);
  const tbDr = tb.reduce((s, r) => s + (Number(r.closingDebit ?? r.debit) || 0), 0);
  const tbCr = tb.reduce((s, r) => s + (Number(r.closingCredit ?? r.credit) || 0), 0);
  const tbBalanced = tb.length > 0 && Math.abs(tbDr - tbCr) < 1;
  const meDone = [pendCount === 0, suspense.length === 0, tbBalanced].filter(Boolean).length
    + ['bankreco', 'debtors', 'cash'].filter((k) => savedTicks[k]).length;
  const qa = (label, route, bg = C.blue) => <button key={route} onClick={() => go(route)} style={aBtn(bg)}><Plus size={13} />{label}</button>;

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
    borderBottom: active ? `3px solid ${C.gold}` : '3px solid transparent',
    background: active ? '#1a2238' : 'transparent',
    borderTopLeftRadius: '6px',
    borderTopRightRadius: '6px',
    transition: 'all 0.2s ease',
    marginRight: '6px',
    border: 'none',
    outline: 'none',
  });

  const alerts = alertsRes?.alerts || [];

  return (
    <Shell
      title="Branch Accountant Portal"
      sub={`${brLabel(branch)} · workspace and accounts control${age.asOf ? ` · as on ${age.asOf}` : ''}`}
      right={<>{qa('Receipt', '/receipts')}{qa('Payment', '/payments', C.amber)}{qa('Contra', '/contra', '#6b21a8')}{qa('Journal', '/journal', C.dark)}{qa('Purchase Expense', '/purchase-expense', C.amber)}</>}
    >
      {/* Workspace Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${C.border}`, marginBottom: 16 }}>
        <button onClick={() => setActiveTab('daily')} style={tabStyle(activeTab === 'daily')}>1. Daily Operations</button>
        <button onClick={() => setActiveTab('collections')} style={tabStyle(activeTab === 'collections')}>2. Collections &amp; Payables</button>
        <button onClick={() => setActiveTab('compliance')} style={tabStyle(activeTab === 'compliance')}>3. Month-End &amp; Compliance</button>
      </div>

      {/* TAB 1: DAILY OPERATIONS */}
      {activeTab === 'daily' && (
        <>
          <SecTitle>Money Position</SecTitle>
          <Row>
            <Tile icon={<Wallet size={13} />} label="Cash in Hand" value={money(cur, cash)} sub="Open Cash Book" tone={C.green} onClick={() => go('/finance/cash-book')} />
            <Tile icon={<Landmark size={13} />} label={`Bank Balance${banks.length > 1 ? ` (${banks.length} a/c)` : ''}`} value={money(cur, bankTotal)} sub="Open bank balances" tone={C.blue} onClick={() => go('/finance/bank-balance')} />
            <Tile icon={<TrendingUp size={13} />} label="Collected Today" value={money(cur, collectedToday)} sub="Receipts posted today" tone={C.green} onClick={() => go('/finance/receipt-register')} />
            <Tile icon={<TrendingDown size={13} />} label="Paid Today" value={money(cur, paidToday)} sub="Payments posted today" tone={C.amber} onClick={() => go('/finance/payment-register')} />
          </Row>
          {banks.length > 1 && (
            <div style={{ ...card, padding: '8px 12px', marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              {banks.map((b, i) => <span key={i} style={{ fontSize: 11.5, color: C.dim }}>{b.name}: <b style={{ color: b.bal >= 0 ? C.dark : C.red }}>{money(cur, b.bal)}</b></span>)}
            </div>
          )}

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

            {recoSummary ? (
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

          <SecTitle>Worklist — needs action</SecTitle>
          <Row>
            <Tile icon={<CheckSquare size={13} />} label="Pending to Approve & Post" value={pendCount} sub="Open approvals" tone={C.amber} onClick={() => go('/transactions/approvals')} />
            <Tile icon={<ReceiptText size={13} />} label="Unallocated Receipts" value={money(cur, onAcctSum)} sub={`${onAcct.length} on-account · settle bills`} tone={C.blue} onClick={() => go('/finance/outstanding')} />
            <Tile icon={<AlertTriangle size={13} />} label="Suspense / To Fix" value={suspense.length} sub="Clear suspense" tone={C.red} onClick={() => go('/accounts/suspense')} />
            <Tile icon={<ListChecks size={13} />} label="Month-End Progress" value={`${checklistDone}/6`} sub="Open close checklist" tone={checklistDone === 6 ? C.green : C.dark} onClick={() => setActiveTab('compliance')} />
          </Row>

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

      {/* TAB 2: COLLECTIONS & PAYABLES */}
      {activeTab === 'collections' && (
        <>
          <SecTitle>Ageing Position &amp; Net Capital ({age.asOf ? `as on ${age.asOf}` : 'live'})</SecTitle>
          <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>
                <th style={th}>Ageing</th><th style={{ ...th, ...rnum }}>0–30</th><th style={{ ...th, ...rnum }}>31–60</th><th style={{ ...th, ...rnum }}>61–90</th><th style={{ ...th, ...rnum }}>90+</th><th style={{ ...th, ...rnum }}>Total</th>
              </tr></thead>
              <tbody>
                <AgeBucketRow label="Debtors (Receivable)" totals={rec} cur={cur} tone={C.blue} onClick={() => go('/reports/rec')} />
                <AgeBucketRow label="Creditors (Payable)" totals={pay} cur={cur} tone={C.amber} onClick={() => go('/reports/pay')} />
                <tr onClick={() => go('/accounts/net-ageing')} style={{ borderTop: `2px solid ${C.border}`, background: '#fafbff', cursor: 'pointer' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 800, color: C.dark }}>Net Working Position</td>
                  <td colSpan={4} />
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: recNet >= 0 ? C.green : C.red, fontVariantNumeric: 'tabular-nums' }}>{money(cur, recNet)} <ArrowRight size={11} style={{ verticalAlign: 'middle' }} /></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {/* Top overdue debtors collection board with INLINE notes */}
            <div style={{ ...card, padding: 12, flex: '1 1 400px', minWidth: 320 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.dark, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Top overdue debtors — collections followup</span>
                <button onClick={() => go('/accounts/collections')} style={{ ...aBtn(C.blue), padding: '3px 8px', fontSize: 10 }}>View All Tracker</button>
              </div>
              {top5rec.length === 0 && <div style={{ fontSize: 12, color: C.green, padding: 10 }}>✓ No overdue debtors outstanding.</div>}
              {top5rec.map((r, i) => (
                <div key={i} style={{ padding: '8px 0', borderTop: i ? '1px solid #f3f4f8' : 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: C.dark, fontWeight: 700 }}>{r.party}</span>
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

            {/* Top creditors to reconcile and pay */}
            <div style={{ ...card, padding: 12, flex: '1 1 350px', minWidth: 300 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.dark, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Top creditors — reconcile &amp; pay</span>
                <button onClick={() => go('/accounts/supplier-reco')} style={{ ...aBtn(C.amber), padding: '3px 8px', fontSize: 10 }}>Supplier Reco</button>
              </div>
              {top5pay.length === 0 && <div style={{ fontSize: 12, color: C.green, padding: 10 }}>✓ No outstanding bills to pay.</div>}
              {top5pay.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: i ? '1px solid #f3f4f8' : 'none' }}>
                  <span style={{ flex: 1, fontSize: 12, color: C.dark, fontWeight: 600 }}>{r.party}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.amber, fontVariantNumeric: 'tabular-nums' }}>{money(cur, r.total)}</span>
                  <button onClick={() => go('/payments')} style={{ ...aBtn(C.amber), padding: '3px 8px', fontSize: 10 }}>Pay</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* TAB 3: MONTH-END & COMPLIANCE */}
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
            <Tile icon={<ReceiptText size={13} />} label="GST / VAT (this month)" value={netGst == null ? 'View' : money(cur, Math.abs(netGst))} sub={`${netGst == null ? 'open tax summary' : (netGst >= 0 ? 'net payable' : 'refundable')} · due 20th`} tone={netGst != null && netGst > 0 ? C.amber : C.blue} onClick={() => go('/reports/tax-summary')} />
            <Tile icon={<ReceiptText size={13} />} label="TDS Payable" value={money(cur, tds)} sub="due 7th · TDS calculator" tone={tds > 0 ? C.amber : C.blue} onClick={() => go('/finance/tds-calculator')} />
            <Tile icon={<ReceiptText size={13} />} label="TCS Payable" value={money(cur, tcs)} sub="statutory dues calendar" tone={tcs > 0 ? C.amber : C.blue} onClick={() => go('/reports/statutory-dues')} />
            <Tile icon={<CheckSquare size={13} />} label="Trial Balance" value={tbBalanced ? '✓ Balanced' : (tb.length ? '✗ Out' : '—')} sub={tb.length && !tbBalanced ? `out by ${money(cur, Math.abs(tbDr - tbCr))}` : 'open trial balance'} tone={tbBalanced ? C.green : (tb.length ? C.red : C.dim)} onClick={() => go('/finance/trial-balance')} />
          </Row>

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

          <SecTitle>Performance Metrics (This Month)</SecTitle>
          <Row>
            <Tile icon={<TrendingUp size={13} />} label="Sales (this month)" value={money(cur, sumTot(sales.filter(inMonth)))} sub="Open Sales Register" tone={C.green} onClick={() => go('/reports/sreg')} />
            <Tile icon={<TrendingDown size={13} />} label="Purchase (this month)" value={money(cur, sumTot(purch.filter(inMonth)))} sub="Open Purchase Register" tone={C.amber} onClick={() => go('/reports/preg')} />
            <Tile icon={<ReceiptText size={13} />} label="Invoice-wise GP" value="View" sub="Open GP report" tone={C.dark} onClick={() => go('/reports/invoice-gp')} />
          </Row>

          {/* Month-End Close progress checklist embedded */}
          <SecTitle>Month-End Checklist / Close Verification</SecTitle>
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbff' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: C.dark }}>Auto and manual checks for month closing ({period})</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: checklistDone === checklistItems.length ? C.green : C.amber }}>{checklistDone}/{checklistItems.length} tasks completed</span>
            </div>
            {checklistItems.map((it, i) => {
              const ok = it.manualOnly ? !!manualChecklist[it.key] : it.auto;
              return (
                <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i ? '1px solid #f0f2f7' : 'none' }}>
                  <span onClick={() => it.manualOnly && toggleManualCheck(it.key)}
                    style={{ width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', cursor: it.manualOnly ? 'pointer' : 'default', background: ok ? C.green : (it.manualOnly ? '#c7ccdb' : C.amber), fontSize: 11 }}>
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
  return (
    <Table>
      <thead><tr>
        <th style={th}>{partyLabel}</th>
        {AGE_COLS.map(([, l]) => <th key={l} style={{ ...th, ...rnum }}>{l}</th>)}
        <th style={{ ...th, ...rnum }}>Total</th>
        {onAct && <th style={{ ...th, textAlign: 'center' }}>Action</th>}
      </tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={onAct ? 7 : 6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>Nothing outstanding.</td></tr>}
        {rows.map((r, i) => (
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
  return (
    <Shell title="Net Ageing — Debtors + Creditors" sub={`${brLabel(branch)}${age.asOf ? ` · as on ${age.asOf}` : ''} · receivable vs payable, with net working-capital position`}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ ...card, padding: 14, borderLeft: `4px solid ${C.blue}`, minWidth: 220 }}><div style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>RECEIVABLE (Debtors)</div><div style={{ fontSize: 20, fontWeight: 800, color: C.blue }}>{money(cur, rec)}</div></div>
        <div style={{ ...card, padding: 14, borderLeft: `4px solid ${C.amber}`, minWidth: 220 }}><div style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>PAYABLE (Creditors)</div><div style={{ fontSize: 20, fontWeight: 800, color: C.amber }}>{money(cur, pay)}</div></div>
        <div style={{ ...card, padding: 14, borderLeft: `4px solid ${net >= 0 ? C.green : C.red}`, minWidth: 220 }}><div style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>NET POSITION</div><div style={{ fontSize: 20, fontWeight: 800, color: net >= 0 ? C.green : C.red }}>{money(cur, net)}</div><div style={{ fontSize: 10.5, color: C.dim }}>{net >= 0 ? 'net receivable' : 'net payable'}</div></div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, margin: '0 0 6px' }}>Debtors (Receivables) ageing</div>
      <AgeingTable side={age.receivables} cur={cur} tone={C.blue} partyLabel="Customer" />
      <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, margin: '14px 0 6px' }}>Creditors (Payables) ageing</div>
      <AgeingTable side={age.payables} cur={cur} tone={C.amber} partyLabel="Supplier" />
    </Shell>
  );
}

// ════════════════════════ 3) COLLECTIONS FOLLOW-UP ════════════════════════════
export function CollectionsFollowup({ branch, setRoute }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const age = useAgeing(branch).data || {};
  // Overdue = anything older than 30 days; sort the worst payers first.
  const overdue = useMemo(() => (age.receivables?.rows || [])
    .map((r) => ({ ...r, overdue: (r.d30 || 0) + (r.d60 || 0) + (r.d90 || 0) }))
    .filter((r) => r.overdue > 0.5)
    .sort((a, b) => b.overdue - a.overdue), [age]);
  const total = overdue.reduce((s, r) => s + r.overdue, 0);
  return (
    <Shell title="Collections Follow-up" sub={`${brLabel(branch)} · customers overdue > 30 days · chase the worst first`}
      right={<div style={{ ...card, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: C.red }}>Overdue {money(cur, total)} · {overdue.length} customers</div>}>
      <Table>
        <thead><tr>
          <th style={th}>Customer</th>
          {AGE_COLS.map(([, l]) => <th key={l} style={{ ...th, ...rnum }}>{l}</th>)}
          <th style={{ ...th, ...rnum }}>Overdue</th><th style={{ ...th, ...rnum }}>Total Due</th>
          <th style={{ ...th, textAlign: 'center' }}>Action</th>
        </tr></thead>
        <tbody>
          {overdue.length === 0 && <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: C.green, padding: 20 }}>✓ Nothing overdue — all current.</td></tr>}
          {overdue.map((r, i) => (
            <tr key={i} style={{ background: i % 2 ? '#fafbff' : '#fff' }}>
              <td style={{ ...td, fontWeight: 600, color: C.dark }}>{r.party}</td>
              {AGE_COLS.map(([k]) => <td key={k} style={{ ...td, ...rnum, color: k === 'd90' && r[k] > 0 ? C.red : C.dark }}>{r[k] ? money(cur, r[k]) : '—'}</td>)}
              <td style={{ ...td, ...rnum, fontWeight: 800, color: C.red }}>{money(cur, r.overdue)}</td>
              <td style={{ ...td, ...rnum, fontWeight: 700 }}>{money(cur, r.total)}</td>
              <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                <button onClick={() => setRoute && setRoute('/reports/client-statement')} style={{ ...aBtn(C.dark), marginRight: 5 }}>Statement</button>
                <button onClick={() => setRoute && setRoute('/receipts')} style={aBtn(C.green)}>Record Receipt</button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Shell>
  );
}

// ════════════════════════ 4) SUPPLIER RECONCILIATION ══════════════════════════
export function SupplierReco({ branch, setRoute }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const age = useAgeing(branch).data || {};
  return (
    <Shell title="Supplier Reconciliation" sub={`${brLabel(branch)} · creditor balances by ageing — reconcile each against the supplier statement, then pay`}>
      <AgeingTable side={age.payables} cur={cur} tone={C.amber} partyLabel="Supplier"
        onAct={() => setRoute && setRoute('/payments')} actLabel="Record Payment" actBg={C.amber} />
      <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
        Tip: open each supplier's <b>Ledger Account</b> to match line-by-line against their statement; differences usually mean a missing bill, an unposted payment, or an ADM/ACM not captured.
      </div>
    </Shell>
  );
}

// ════════════════════════ 5) SUSPENSE / UNSPECIFIED CLEARING ═══════════════════
export function SuspenseClearing({ branch, setRoute }) {
  const bookings = useBookingOrders(branch).data || [];
  const pendVouchers = useVoucherApprovals(branch, 'pending').data || [];
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
  const bookings = useBookingOrders(branch).data || [];
  const pendVouchers = useVoucherApprovals(branch, 'pending').data || [];
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
            <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderTop: i ? '1px solid #f0f2f7' : 'none' }}>
              <span onClick={() => it.manualOnly && toggleManual(it.key)}
                style={{ width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', cursor: it.manualOnly ? 'pointer' : 'default', background: ok ? C.green : (it.manualOnly ? '#c7ccdb' : C.amber) }}>
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
