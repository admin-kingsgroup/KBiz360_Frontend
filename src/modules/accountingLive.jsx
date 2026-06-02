/* ════════════════════════════════════════════════════════════════════
   MODULES/ACCOUNTING-LIVE.JSX

   Tally-style books & financial reports rendered from the LIVE double-entry
   engine in the backend (kbiz360-erp-backend → /api/accounting, /api/vouchers,
   /api/ledgers). Every voucher saved in the ERP posts a balanced journal
   (Debit = Credit); these screens aggregate those postings in real time:

     Day Book · Ledger A/c · Trial Balance · Profit & Loss · Balance Sheet
     Sales / Purchase Register · 28 Tally Groups · Chart of Accounts

   The look matches the existing Books reports (dark #0d1326 header, gold
   #d4a437 accents). No demo data — empty in, empty out.
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from 'react';
import { card, inp, bc } from '../core/styles';
import {
  useTrialBalance, useProfitAndLoss, useBalanceSheet, useDayBook,
  useLedgerStatement, useLedgerGroups, useChartOfAccounts,
  useSalesRegister, usePurchaseRegister, useInvoiceGP,
} from '../core/useAccounting';

const DARK = '#0d1326', GOLD = '#d4a437', DIM = '#5a6691', BLUE = '#185FA5', RED = '#A32D2D', GREEN = '#27500A';
const curOf = (branch) => bc(branch).cur;
const money = (cur, n) => { const v = Math.round(Number(n) || 0); return v ? cur + v.toLocaleString('en-IN') : '—'; };
const branchLabel = (branch) => (!branch || branch === 'ALL' ? 'All branches' : (branch.code || branch));

/* ── shared chrome ──────────────────────────────────────────────────── */
function Page({ title, sub, right, children }) {
  return (
    <div style={{ padding: '12px 10px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: DARK }}>{title}</h2>
          {sub && <p style={{ margin: '2px 0 0', fontSize: 10.5, color: DIM }}>{sub}</p>}
        </div>
        {right && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{right}</div>}
      </div>
      {children}
    </div>
  );
}

const DateInput = (props) => <input type="date" {...props} style={{ ...inp, width: 140, minHeight: 32, fontSize: 11 }} />;

function Banner({ tone = 'info', children }) {
  const T = {
    ok: { bg: '#EAF3DE', bd: '#C0DD97', c: GREEN },
    err: { bg: '#FCEBEB', bd: '#F7C1C1', c: RED },
    info: { bg: '#E6F1FB', bd: '#BcdAF2', c: BLUE },
  }[tone] || { bg: '#E6F1FB', bd: '#cfe0f5', c: BLUE };
  return <div style={{ marginBottom: 10, padding: '8px 14px', borderRadius: 8, background: T.bg, border: `1px solid ${T.bd}`, fontSize: 10.5, color: T.c, fontWeight: 600 }}>{children}</div>;
}

function State({ q, empty, children }) {
  if (q.isLoading) return <div style={{ ...card, padding: 28, textAlign: 'center', color: DIM, fontSize: 12 }}>Loading live data…</div>;
  if (q.isError) return <Banner tone="err">⚠ {q.error?.message || 'Failed to load from backend'}</Banner>;
  if (empty) return <div style={{ ...card, padding: 28, textAlign: 'center', color: DIM, fontSize: 12 }}>No data for this selection.</div>;
  return children;
}

const Table = ({ children }) => (
  <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>{children}</table>
  </div>
);
const Th = ({ children, right }) => (
  <th style={{ padding: '9px 14px', textAlign: right ? 'right' : 'left', color: GOLD, fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}>{children}</th>
);
const headRow = { background: DARK };
const rowBg = (i) => ({ borderBottom: '1px solid #f3f4f8', background: i % 2 === 0 ? '#fff' : '#fafafa' });
const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

/* ════════════════════ TRIAL BALANCE ════════════════════════════════ */
export function TrialBalanceLive({ branch }) {
  const cur = curOf(branch);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const q = useTrialBalance(branch, { from, to });
  const rows = q.data?.rows || [];
  const totDr = q.data?.totalDebit || 0, totCr = q.data?.totalCredit || 0;
  const balanced = q.data ? q.data.balanced : true;
  const groups = useMemo(() => [...new Set(rows.map((r) => r.group))], [rows]);

  return (
    <Page
      title="Trial Balance"
      sub={`${branchLabel(branch)} · ${rows.length} ledgers · Dr ${money(cur, totDr)} / Cr ${money(cur, totCr)}`}
      right={<>
        <span style={{ lineHeight: '32px', fontSize: 11, color: DIM }}>From</span>
        <DateInput value={from} onChange={(e) => setFrom(e.target.value)} />
        <span style={{ lineHeight: '32px', fontSize: 11, color: DIM }}>to</span>
        <DateInput value={to} onChange={(e) => setTo(e.target.value)} />
      </>}
    >
      {q.data && (balanced
        ? <Banner tone="ok">✔ Trial Balance tallied — Dr {money(cur, totDr)} = Cr {money(cur, totCr)}</Banner>
        : <Banner tone="err">⚠ Out of balance — Dr {money(cur, totDr)} ≠ Cr {money(cur, totCr)}</Banner>)}
      <State q={q} empty={rows.length === 0}>
        <Table>
          <thead><tr style={headRow}><Th>Group</Th><Th>Ledger Account</Th><Th right>Debit ({cur})</Th><Th right>Credit ({cur})</Th></tr></thead>
          <tbody>
            {groups.map((grp) => {
              const gl = rows.filter((r) => r.group === grp);
              return gl.map((l, i) => (
                <tr key={(l.code || '') + l.ledger} style={rowBg(i)}>
                  {i === 0 && <td rowSpan={gl.length} style={{ padding: '9px 14px', fontWeight: 700, color: DARK, borderRight: '2px solid #e1e3ec', verticalAlign: 'top', fontSize: 10.5, background: '#f9fafb' }}>{grp}</td>}
                  <td style={{ padding: '9px 14px', color: '#384677' }}>{l.ledger}{l.code ? <span style={{ color: '#b9bed4', fontSize: 9.5, marginLeft: 6 }}>{l.code}</span> : null}</td>
                  <td style={{ padding: '9px 14px', ...num, color: l.debit > 0 ? DARK : '#bfc3d6' }}>{money(cur, l.debit)}</td>
                  <td style={{ padding: '9px 14px', ...num, color: l.credit > 0 ? DARK : '#bfc3d6' }}>{money(cur, l.credit)}</td>
                </tr>
              ));
            })}
          </tbody>
          <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
            <td colSpan={2} style={{ padding: '10px 14px', fontWeight: 700, color: GOLD, fontSize: 12 }}>TOTAL</td>
            <td style={{ padding: '10px 14px', ...num, fontWeight: 800, color: '#fff', fontSize: 13 }}>{money(cur, totDr)}</td>
            <td style={{ padding: '10px 14px', ...num, fontWeight: 800, color: GOLD, fontSize: 13 }}>{money(cur, totCr)}</td>
          </tr></tfoot>
        </Table>
      </State>
    </Page>
  );
}

/* ════════════════════ DAY BOOK ═════════════════════════════════════ */
export function DayBookLive({ branch }) {
  const cur = curOf(branch);
  const [date, setDate] = useState('');
  const range = date ? { from: date, to: date } : {};
  const q = useDayBook(branch, range);
  const journals = q.data || [];
  const totDr = journals.reduce((s, j) => s + (j.totalDebit || 0), 0);
  const totCr = journals.reduce((s, j) => s + (j.totalCredit || 0), 0);
  const TYPE_CLR = { sale: BLUE, purchase: '#854F0B', receipt: GREEN, payment: RED, journal: '#384677', contra: '#6b21a8', 'credit-note': RED, 'debit-note': '#854F0B' };

  return (
    <Page
      title="Day Book"
      sub={`${branchLabel(branch)} · ${journals.length} vouchers · Dr ${money(cur, totDr)} = Cr ${money(cur, totCr)}`}
      right={<>
        <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
        {date && <button onClick={() => setDate('')} style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, cursor: 'pointer' }}>All dates</button>}
      </>}
    >
      <State q={q} empty={journals.length === 0}>
        <Table>
          <thead><tr style={headRow}>
            <Th>Date</Th><Th>Voucher</Th><Th>Type</Th><Th>Ledger Account</Th><Th right>Dr</Th><Th right>Cr</Th>
          </tr></thead>
          <tbody>
            {journals.map((j) => j.postings.map((p, pi) => (
              <tr key={j.vno + '-' + pi} style={{ borderBottom: pi === j.postings.length - 1 ? '1px solid #e1e3ec' : '1px solid #f6f7fa', background: '#fff' }}>
                {pi === 0 && <td rowSpan={j.postings.length} style={{ padding: '8px 12px', color: DIM, whiteSpace: 'nowrap', verticalAlign: 'top', borderRight: '1px solid #f3f4f8' }}>{j.date}</td>}
                {pi === 0 && <td rowSpan={j.postings.length} style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, color: BLUE, verticalAlign: 'top' }}>{j.vno}</td>}
                {pi === 0 && <td rowSpan={j.postings.length} style={{ padding: '8px 12px', verticalAlign: 'top' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 700, background: (TYPE_CLR[j.category] || '#384677') + '22', color: TYPE_CLR[j.category] || '#384677' }}>{j.category}</span></td>}
                <td style={{ padding: '6px 12px', color: '#0d1326', paddingLeft: p.debit > 0 ? 12 : 28 }}>{p.ledger}<span style={{ color: '#b9bed4', fontSize: 9.5, marginLeft: 6 }}>{p.group}</span></td>
                <td style={{ padding: '6px 12px', ...num, color: p.debit > 0 ? BLUE : '#dfe2ee' }}>{money(cur, p.debit)}</td>
                <td style={{ padding: '6px 12px', ...num, color: p.credit > 0 ? RED : '#dfe2ee' }}>{money(cur, p.credit)}</td>
              </tr>
            )))}
          </tbody>
          <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
            <td colSpan={4} style={{ padding: '9px 12px', fontWeight: 700, color: GOLD, fontSize: 12 }}>TOTAL — {journals.length} vouchers</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, totDr)}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{money(cur, totCr)}</td>
          </tr></tfoot>
        </Table>
      </State>
    </Page>
  );
}

/* ════════════════════ LEDGER ACCOUNT ═══════════════════════════════ */
export function LedgerAcLive({ branch }) {
  const cur = curOf(branch);
  const chart = useChartOfAccounts(branch);
  const ledgers = chart.data || [];
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const selected = name || ledgers[0]?.name || '';
  const q = useLedgerStatement(selected, branch, { from, to });
  const d = q.data;

  return (
    <Page
      title="Ledger Account"
      sub={d ? `${d.ledger} · ${d.group || ''} · ${d.lines?.length || 0} entries` : selected}
      right={<>
        <select value={selected} onChange={(e) => setName(e.target.value)} style={{ ...inp, width: 220, minHeight: 32, fontSize: 11 }}>
          {ledgers.length === 0 && <option>Loading…</option>}
          {ledgers.map((l) => <option key={l.code || l.name} value={l.name}>{l.name}</option>)}
        </select>
        <DateInput value={from} onChange={(e) => setFrom(e.target.value)} />
        <span style={{ lineHeight: '32px', color: DIM, fontSize: 11 }}>to</span>
        <DateInput value={to} onChange={(e) => setTo(e.target.value)} />
      </>}
    >
      <State q={q} empty={!d}>
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: '#f3f4f8', borderBottom: '1px solid #e1e3ec', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: DIM }}>Opening: {money(cur, d?.openingBalance)} {d?.openingSide}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: d?.closingSide === 'Cr' ? RED : BLUE }}>Closing: {money(cur, d?.closingBalance)} {d?.closingSide}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead><tr style={headRow}><Th>Date</Th><Th>Voucher</Th><Th>Particulars</Th><Th right>Dr</Th><Th right>Cr</Th><Th right>Balance</Th></tr></thead>
            <tbody>
              {(d?.lines || []).length === 0 && <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: DIM }}>No postings in range.</td></tr>}
              {(d?.lines || []).map((e, i) => (
                <tr key={i} style={rowBg(i)}>
                  <td style={{ padding: '8px 12px', color: DIM, whiteSpace: 'nowrap' }}>{e.date}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, color: BLUE }}>{e.vno}</td>
                  <td style={{ padding: '8px 12px', color: '#384677' }}>{e.narration || e.party || e.category}</td>
                  <td style={{ padding: '8px 12px', ...num, color: e.debit > 0 ? BLUE : '#dfe2ee' }}>{money(cur, e.debit)}</td>
                  <td style={{ padding: '8px 12px', ...num, color: e.credit > 0 ? RED : '#dfe2ee' }}>{money(cur, e.credit)}</td>
                  <td style={{ padding: '8px 12px', ...num, fontWeight: 700, color: e.balanceSide === 'Cr' ? RED : BLUE }}>{money(cur, Math.abs(e.balance))} {e.balanceSide}</td>
                </tr>
              ))}
            </tbody>
            {d && <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
              <td colSpan={3} style={{ padding: '9px 12px', fontWeight: 700, color: GOLD }}>CLOSING — {d.ledger}</td>
              <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, d.totalDebit)}</td>
              <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{money(cur, d.totalCredit)}</td>
              <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, d.closingBalance)} {d.closingSide}</td>
            </tr></tfoot>}
          </table>
        </div>
      </State>
    </Page>
  );
}

/* ════════════════════ Tally two-column (Dr | Cr) T-account ═════════ */
const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
function TAccount({ leftHead = 'Particulars', rightHead = 'Particulars', left, right, leftTotal, rightTotal, cur }) {
  const n = Math.max(left.length, right.length, 1);
  const Cell = ({ row }) => row
    ? (<><td style={{ padding: '7px 14px', color: '#384677', fontWeight: row.bold ? 700 : 400 }}>{row.label}</td>
          <td style={{ padding: '7px 14px', ...num, color: DARK, fontWeight: row.bold ? 700 : 400 }}>{row.amount != null ? money(cur, row.amount) : ''}</td></>)
    : (<><td style={{ padding: '7px 14px' }} /><td style={{ padding: '7px 14px' }} /></>);
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, tableLayout: 'fixed' }}>
        <thead><tr style={headRow}>
          <Th>{leftHead}</Th><Th right>Amount</Th><Th>{rightHead}</Th><Th right>Amount</Th>
        </tr></thead>
        <tbody>
          {Array.from({ length: n }).map((_, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f8', borderLeft: i === 0 ? 'none' : 'none' }}>
              <Cell row={left[i]} /><Cell row={right[i]} />
            </tr>
          ))}
        </tbody>
        <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
          <td style={{ padding: '9px 14px', fontWeight: 700, color: GOLD }}>Total</td>
          <td style={{ padding: '9px 14px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, leftTotal)}</td>
          <td style={{ padding: '9px 14px', fontWeight: 700, color: GOLD }}>Total</td>
          <td style={{ padding: '9px 14px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, rightTotal)}</td>
        </tr></tfoot>
      </table>
    </div>
  );
}

/* ════════════════════ PROFIT & LOSS (Tally horizontal) ═════════════ */
export function ReportPnLLive({ branch }) {
  const cur = curOf(branch);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const q = useProfitAndLoss(branch, { from, to });
  const d = q.data;
  const G = (g) => ({ label: g.group, amount: g.amount });

  let trade = null, pl = null;
  if (d) {
    const gp = d.grossProfit, np = d.netProfit;
    // Trading account → Gross Profit
    const tL = d.trading.debit.map(G), tR = d.trading.credit.map(G);
    if (gp >= 0) tL.push({ label: 'Gross Profit c/d', amount: gp, bold: true });
    else tR.push({ label: 'Gross Loss c/d', amount: -gp, bold: true });
    trade = { left: tL, right: tR, lt: r2(d.trading.debitTotal + Math.max(gp, 0)), rt: r2(d.trading.creditTotal + Math.max(-gp, 0)) };
    // Profit & Loss account → Net Profit
    const pL = d.indirect.debit.map(G); let pR = [];
    if (gp >= 0) pR.push({ label: 'Gross Profit b/d', amount: gp, bold: true });
    else pL.push({ label: 'Gross Loss b/d', amount: -gp, bold: true });
    pR = [...pR, ...d.indirect.credit.map(G)];
    if (np >= 0) pL.push({ label: 'Net Profit', amount: np, bold: true });
    else pR.push({ label: 'Net Loss', amount: -np, bold: true });
    pl = { left: pL, right: pR, lt: r2(d.indirect.debitTotal + Math.max(-gp, 0) + Math.max(np, 0)), rt: r2(Math.max(gp, 0) + d.indirect.creditTotal + Math.max(-np, 0)) };
  }

  return (
    <Page
      title="Profit & Loss Account"
      sub={`${branchLabel(branch)}${from || to ? ` · ${from || '…'} → ${to || '…'}` : ' · all periods'}`}
      right={<>
        <DateInput value={from} onChange={(e) => setFrom(e.target.value)} />
        <span style={{ lineHeight: '32px', color: DIM, fontSize: 11 }}>to</span>
        <DateInput value={to} onChange={(e) => setTo(e.target.value)} />
      </>}
    >
      <State q={q} empty={!d}>
        {d && (
          <Banner tone={d.netProfit >= 0 ? 'ok' : 'err'}>
            {d.grossResult}: {money(cur, Math.abs(d.grossProfit))} · {d.result}: {money(cur, Math.abs(d.netProfit))}
          </Banner>
        )}
        {trade && <>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', color: BLUE, margin: '4px 0 6px' }}>Trading Account</div>
          <div style={{ marginBottom: 14 }}><TAccount left={trade.left} right={trade.right} leftTotal={trade.lt} rightTotal={trade.rt} cur={cur} /></div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', color: BLUE, margin: '4px 0 6px' }}>Profit &amp; Loss Account</div>
          <TAccount left={pl.left} right={pl.right} leftTotal={pl.lt} rightTotal={pl.rt} cur={cur} />
        </>}
      </State>
    </Page>
  );
}

/* ════════════════════ BALANCE SHEET (Tally horizontal) ═════════════ */
export function ReportBSLive({ branch }) {
  const cur = curOf(branch);
  const [to, setTo] = useState('');
  const q = useBalanceSheet(branch, { to });
  const d = q.data;
  const G = (g) => ({ label: g.group, amount: g.amount, bold: g.isResult });
  return (
    <Page
      title="Balance Sheet"
      sub={`${branchLabel(branch)}${to ? ` · as on ${to}` : ' · as on date'}`}
      right={<><span style={{ lineHeight: '32px', color: DIM, fontSize: 11 }}>As on</span><DateInput value={to} onChange={(e) => setTo(e.target.value)} /></>}
    >
      <State q={q} empty={!d}>
        {d && <Banner tone={d.balanced ? 'ok' : 'err'}>{d.balanced ? '✔ Balanced' : '⚠ Out of balance'} — Liabilities {money(cur, d.totalLiabilities)} {d.balanced ? '=' : '≠'} Assets {money(cur, d.totalAssets)}</Banner>}
        {d && <TAccount leftHead="Liabilities" rightHead="Assets" left={d.liabilities.map(G)} right={d.assets.map(G)} leftTotal={d.totalLiabilities} rightTotal={d.totalAssets} cur={cur} />}
      </State>
    </Page>
  );
}

/* ════════════════════ SALES / PURCHASE REGISTER ════════════════════ */
/* Read-only voucher detail — shows every imported field (PNR, ticket, fare
   breakup, etc.) captured on the line `meta`, plus the header + Link No. */
function VoucherDetail({ voucher, cur, onClose }) {
  if (!voucher) return null;
  const v = voucher;
  const F = ({ label, val }) => (
    <div style={{ minWidth: 110 }}>
      <div style={{ fontSize: 9, color: DIM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
      <div style={{ fontSize: 12, color: DARK, fontWeight: 600 }}>{val || '—'}</div>
    </div>
  );
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.45)', zIndex: 700, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '6vh' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 660, maxWidth: '94vw', maxHeight: '84vh', overflowY: 'auto', padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderBottom: '1px solid #e5e9f0', position: 'sticky', top: 0, background: '#fff' }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: DARK }}>{v.vno} <span style={{ fontSize: 10, color: DIM, fontWeight: 600 }}>{v.type} · {v.category}</span></div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
            <F label="Date" val={v.date} /><F label="Branch" val={v.branch} />
            <F label={v.category === 'purchase' ? 'Supplier' : 'Customer'} val={v.party} />
            <F label="Link No" val={v.linkNo} /><F label="Taxable" val={money(cur, v.subtotal)} />
            <F label="GST" val={money(cur, v.taxAmt)} /><F label="Total" val={money(cur, v.total)} />
          </div>
          {(v.lines || []).map((ln, i) => {
            const meta = ln.meta && typeof ln.meta === 'object' ? ln.meta : {};
            const entries = Object.entries(meta).filter(([, val]) => val !== '' && val != null);
            return (
              <div key={i} style={{ ...card, padding: 12, marginBottom: 10, boxShadow: 'none', border: '1px solid #eef1f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: entries.length ? 8 : 0 }}>
                  <span style={{ fontWeight: 700, color: DARK, fontSize: 12.5 }}>{ln.ledger || `Line ${i + 1}`}</span>
                  <span style={{ fontWeight: 700, color: BLUE, fontVariantNumeric: 'tabular-nums' }}>{money(cur, ln.amt)}</span>
                </div>
                {entries.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '4px 14px' }}>
                    {entries.map(([k, val]) => (
                      <div key={k} style={{ fontSize: 11 }}>
                        <span style={{ color: DIM }}>{k}: </span><span style={{ color: DARK, fontWeight: 600 }}>{String(val)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {v.remarks && <div style={{ fontSize: 11, color: DIM }}>Remarks: {v.remarks}</div>}
        </div>
      </div>
    </div>
  );
}

export function RegisterLive({ branch, initial = 'sales' }) {
  const cur = curOf(branch);
  const [tab, setTab] = useState(initial === 'purchase' ? 'purchase' : 'sales'); // sales | purchase
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [detail, setDetail] = useState(null);
  const sales = useSalesRegister(branch, { from, to });
  const purch = usePurchaseRegister(branch, { from, to });
  const q = tab === 'sales' ? sales : purch;
  const rows = q.data || [];
  const sum = (k) => rows.reduce((s, v) => s + (v[k] || 0), 0);
  const Tab = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, cursor: 'pointer', fontWeight: 700, background: tab === id ? DARK : '#fff', color: tab === id ? GOLD : DIM, borderColor: tab === id ? DARK : '#e1e3ec' }}>{label}</button>
  );
  return (
    <Page
      title={tab === 'sales' ? 'Sales Register' : 'Purchase Register'}
      sub={`${branchLabel(branch)} · ${rows.length} vouchers · Total ${money(cur, sum('total'))} · click a row for full detail`}
      right={<>
        <Tab id="sales" label="Sales" /><Tab id="purchase" label="Purchase" />
        <DateInput value={from} onChange={(e) => setFrom(e.target.value)} />
        <span style={{ lineHeight: '32px', color: DIM, fontSize: 11 }}>to</span>
        <DateInput value={to} onChange={(e) => setTo(e.target.value)} />
      </>}
    >
      <State q={q} empty={rows.length === 0}>
        <Table>
          <thead><tr style={headRow}>
            <Th>Date</Th><Th>Voucher</Th><Th>Type</Th><Th>{tab === 'sales' ? 'Customer' : 'Supplier'}</Th><Th>Link No</Th>
            <Th right>Taxable</Th><Th right>GST</Th><Th right>Total</Th>
          </tr></thead>
          <tbody>
            {rows.map((v, i) => (
              <tr key={v.id || v.vno} style={{ ...rowBg(i), cursor: 'pointer' }} onClick={() => setDetail(v)}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'; }}>
                <td style={{ padding: '8px 12px', color: DIM, whiteSpace: 'nowrap' }}>{v.date}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, color: BLUE }}>{v.vno}</td>
                <td style={{ padding: '8px 12px', color: '#384677' }}>{v.type}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600, color: DARK }}>{v.party || '—'}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, color: '#6b21a8' }}>{v.linkNo || '—'}</td>
                <td style={{ padding: '8px 12px', ...num }}>{money(cur, v.subtotal)}</td>
                <td style={{ padding: '8px 12px', ...num, color: '#854F0B' }}>{money(cur, v.taxAmt)}</td>
                <td style={{ padding: '8px 12px', ...num, fontWeight: 700 }}>{money(cur, v.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
            <td colSpan={5} style={{ padding: '9px 12px', fontWeight: 700, color: GOLD }}>TOTAL — {rows.length}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, sum('subtotal'))}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{money(cur, sum('taxAmt'))}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, sum('total'))}</td>
          </tr></tfoot>
        </Table>
      </State>
      <VoucherDetail voucher={detail} cur={cur} onClose={() => setDetail(null)} />
    </Page>
  );
}

/* ════════════════════ INVOICE-WISE GP (by Link No) ═════════════════ */
export function InvoiceGPLive({ branch }) {
  const cur = curOf(branch);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const q = useInvoiceGP(branch, { from, to });
  const d = q.data;
  const rows = d?.rows || [];
  const STATUS = { matched: { c: GREEN, t: 'matched' }, 'no-cost': { c: '#854F0B', t: 'no cost' }, 'no-sale': { c: RED, t: 'no sale' } };
  return (
    <Page
      title="Invoice-wise Gross Profit"
      sub={`${branchLabel(branch)} · grouped by Link No · ${rows.length} files`}
      right={<>
        <DateInput value={from} onChange={(e) => setFrom(e.target.value)} />
        <span style={{ lineHeight: '32px', color: DIM, fontSize: 11 }}>to</span>
        <DateInput value={to} onChange={(e) => setTo(e.target.value)} />
      </>}
    >
      {d && (d.unlinked.sales > 0 || d.unlinked.purchases > 0) && (
        <Banner tone="info">{d.unlinked.sales} sale(s) and {d.unlinked.purchases} purchase(s) have no Link No — add one on import to include them here.</Banner>
      )}
      <State q={q} empty={rows.length === 0}>
        <Table>
          <thead><tr style={headRow}>
            <Th>Link No</Th><Th>Customer</Th><Th>Supplier</Th><Th right>Sale</Th><Th right>Cost</Th><Th right>GP</Th><Th right>GP %</Th><Th>Status</Th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const s = STATUS[r.status] || { c: DIM, t: r.status };
              return (
                <tr key={r.linkNo} style={rowBg(i)}>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10.5, color: '#6b21a8', fontWeight: 700 }}>{r.linkNo}</td>
                  <td style={{ padding: '8px 12px', color: DARK }}>{r.customer || '—'}</td>
                  <td style={{ padding: '8px 12px', color: DARK }}>{r.supplier || '—'}</td>
                  <td style={{ padding: '8px 12px', ...num }}>{money(cur, r.sale)}</td>
                  <td style={{ padding: '8px 12px', ...num, color: '#854F0B' }}>{money(cur, r.cost)}</td>
                  <td style={{ padding: '8px 12px', ...num, fontWeight: 700, color: r.gp >= 0 ? GREEN : RED }}>{money(cur, r.gp)}</td>
                  <td style={{ padding: '8px 12px', ...num, fontWeight: 700, color: r.gp >= 0 ? GREEN : RED }}>{r.gpPct}%</td>
                  <td style={{ padding: '8px 12px' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 700, background: s.c + '22', color: s.c }}>{s.t}</span></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
            <td colSpan={3} style={{ padding: '9px 12px', fontWeight: 700, color: GOLD }}>TOTAL — {rows.length} files</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, d?.totals.sale)}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, d?.totals.cost)}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{money(cur, d?.totals.gp)}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{d?.totals.gpPct}%</td>
            <td />
          </tr></tfoot>
        </Table>
      </State>
    </Page>
  );
}

/* ════════════════════ 28 TALLY GROUPS ══════════════════════════════ */
export function LedgerGroupsLive() {
  const q = useLedgerGroups();
  const groups = q.data || [];
  const NAT = { asset: BLUE, liability: RED, income: GREEN, expense: '#854F0B' };
  const Section = ({ title, list }) => (
    <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: '9px 14px', background: DARK, color: GOLD, fontWeight: 700, fontSize: 12 }}>{title} — {list.length} groups</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead><tr style={{ background: '#f3f4f8' }}><Th>#</Th><Th>Group</Th><Th>Nature</Th><Th>Golden-Rule Class</Th><Th>Natural Side</Th><Th>Under</Th></tr></thead>
        <tbody>
          {list.map((g, i) => (
            <tr key={g.id} style={rowBg(i)}>
              <td style={{ padding: '8px 14px', color: DIM }}>{g.id}</td>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: DARK }}>{g.name}</td>
              <td style={{ padding: '8px 14px' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 700, background: (NAT[g.nature] || DIM) + '22', color: NAT[g.nature] || DIM }}>{g.nature}</span></td>
              <td style={{ padding: '8px 14px', color: '#384677' }}>{g.cls}</td>
              <td style={{ padding: '8px 14px', fontWeight: 700, color: g.naturalSide === 'Cr' ? RED : BLUE }}>{g.naturalSide}</td>
              <td style={{ padding: '8px 14px', color: DIM }}>{g.parent || '— primary —'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <Page title="Ledger Groups — Tally's 28 Pre-Defined Groups" sub="Every ledger belongs to one of these groups; the group fixes whether it lands in the Balance Sheet or P&L.">
      <State q={q} empty={groups.length === 0}>
        <Section title="Balance Sheet" list={groups.filter((g) => g.statement === 'BS')} />
        <Section title="Profit & Loss Account" list={groups.filter((g) => g.statement === 'PL')} />
      </State>
    </Page>
  );
}

/* ════════════════════ CHART OF ACCOUNTS ════════════════════════════ */
export function ChartOfAccountsLive({ branch }) {
  const cur = curOf(branch);
  const q = useChartOfAccounts(branch);
  const ledgers = q.data || [];
  const groups = useMemo(() => [...new Set(ledgers.map((l) => l.group))].sort(), [ledgers]);
  return (
    <Page title="Chart of Accounts" sub={`${branchLabel(branch)} · ${ledgers.length} ledgers across ${groups.length} groups`}>
      <State q={q} empty={ledgers.length === 0}>
        <Table>
          <thead><tr style={headRow}><Th>Group</Th><Th>Code</Th><Th>Ledger</Th><Th>Nature</Th><Th>Statement</Th><Th right>Opening</Th></tr></thead>
          <tbody>
            {groups.map((grp) => {
              const gl = ledgers.filter((l) => l.group === grp);
              return gl.map((l, i) => (
                <tr key={l.id || l.code} style={rowBg(i)}>
                  {i === 0 && <td rowSpan={gl.length} style={{ padding: '9px 14px', fontWeight: 700, color: DARK, borderRight: '2px solid #e1e3ec', verticalAlign: 'top', fontSize: 10.5, background: '#f9fafb' }}>{grp}</td>}
                  <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 10, color: BLUE }}>{l.code}</td>
                  <td style={{ padding: '9px 14px', fontWeight: 600, color: DARK }}>{l.name}</td>
                  <td style={{ padding: '9px 14px', color: '#384677' }}>{l.nature || '—'}</td>
                  <td style={{ padding: '9px 14px', color: DIM }}>{l.statement === 'PL' ? 'P&L' : l.statement === 'BS' ? 'Balance Sheet' : '—'}</td>
                  <td style={{ padding: '9px 14px', ...num }}>{l.openingBalance ? `${money(cur, l.openingBalance)} ${l.drCr}` : '—'}</td>
                </tr>
              ));
            })}
          </tbody>
        </Table>
      </State>
    </Page>
  );
}
