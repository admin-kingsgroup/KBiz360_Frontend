// ───────────────────────────────────────────────────────────────────────────
// UNIFIED LEDGER ACCOUNT UI  (on-screen + print — one design, one source)
//
// Every ledger in the ERP — opened from the Ledger A/c screen, the Ctrl+L
// switcher, a party list, the Outstanding dashboard, the P&L / Balance-Sheet
// drill, the chart of accounts… — renders through THIS component and prints
// through the SAME markup + CSS, so the screen and the paper are identical.
//
// It is fed entirely by the LIVE backend:
//   • Ledger statement  GET /api/accounting/ledger   (useLedgerStatement)
//   • Bill-wise / ageing GET /api/vouchers/open-bills (useOpenBills)
// No static data — empty in, empty out.
// ───────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import { bc } from './styles';
import { PeriodBar } from './period';
import { useLedgerStatement, useOpenBills, useLedgerSplit, useLedgerComponents, branchCode } from './useAccounting';
import { openPrintPreview } from './PrintPreview';
import {
  esc, fmt, fmtB, dmy, vtLabel, billwiseSide, isBillwiseLedger,
  mapLedger, mapBills, groupByBranch, branchSeg, AGE_BUCKETS, AGE_COLORS, ageingOf,
} from './ledgerMath';

export { billwiseSide, isBillwiseLedger } from './ledgerMath';

/* ── palette (the Tally "paper" ledger look) ─────────────────────────────── */
const GOLD = '#A07828';

// One CSS block, scoped under `.kbled`, shared by the React view AND the print
// template. Ported verbatim from the approved ledger design so screen == print.
export const LEDGER_CSS = `
.kbled{--gold:#A07828;--gold-l:#C49A3C;--dark:#111111;--ink:#1A1A1A;--ink2:#3A3A3A;--ink3:#6A6A6A;--ink4:#9A9A9A;
  --rule:#DEDBD4;--bg-lt:#F7F4EF;--hi:#FDFAF4;--paper:#FFFFFF;--canvas:#EFEBE3;--dr:#1B6B4C;--cr:#9B2C2C;--amber:#B7791F;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}
.kbled *{box-sizing:border-box}
.kbled .sheet{background:var(--paper);border-left:4px solid var(--gold);position:relative}
.kbled .sheet::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--gold)}
.kbled .hdr{padding:18px 30px 14px;border-bottom:1.5px solid var(--dark);display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:14px}
.kbled .brand .logo{font-size:23px;font-weight:800;letter-spacing:3px;color:var(--ink)}
.kbled .brand .sub{font-size:8.5px;letter-spacing:3px;color:var(--ink4);font-weight:700}
.kbled .doc-title{text-align:right}
.kbled .doc-title h1{font-size:17px;font-weight:800;letter-spacing:.5px;margin:0}
.kbled .doc-title .accent{height:3px;width:100%;background:var(--gold);margin-top:4px}
.kbled .doc-title .badge{display:inline-block;margin-top:6px;font-size:9px;font-weight:800;letter-spacing:1.2px;color:var(--gold);text-transform:uppercase}
.kbled .picker{display:grid;grid-template-columns:2fr 1fr 1fr;gap:14px;padding:14px 30px 12px;border-bottom:1px solid var(--rule);background:var(--bg-lt)}
.kbled .picker label{display:block;font-size:9px;font-weight:700;letter-spacing:1px;color:var(--gold);text-transform:uppercase;margin-bottom:5px}
.kbled .picker select,.kbled .picker input{width:100%;padding:9px 11px;font-size:13px;border:1px solid var(--rule);border-radius:4px;background:var(--paper);color:var(--ink);font-family:inherit}
.kbled .picker select:focus,.kbled .picker input:focus{outline:none;border-color:var(--gold)}
.kbled .toolbar{display:flex;align-items:center;gap:18px;padding:10px 30px;background:var(--hi);border-bottom:1px solid var(--rule);flex-wrap:wrap}
.kbled .seg{display:inline-flex;border:1px solid var(--rule);border-radius:6px;overflow:hidden}
.kbled .seg button{border:none;background:var(--paper);color:var(--ink3);font-size:11.5px;font-weight:700;letter-spacing:.3px;padding:7px 16px;cursor:pointer;font-family:inherit}
.kbled .seg button.active{background:var(--dark);color:#fff}
.kbled .seg button:not(.active):hover{background:var(--bg-lt)}
.kbled .toggles{display:flex;gap:16px}
.kbled .tg{display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:600;color:var(--ink2);cursor:pointer;user-select:none}
.kbled .tg input{width:15px;height:15px;accent-color:var(--gold);cursor:pointer}
.kbled .tg.disabled{opacity:.4;pointer-events:none}
.kbled .toolbar .vlabel{font-size:9px;font-weight:700;letter-spacing:1px;color:var(--gold);text-transform:uppercase;margin-right:-8px}
.kbled .toolbar .spacer{flex:1}
.kbled .brchip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid var(--rule);border-radius:6px;background:var(--bg-lt)}
.kbled .brchip .bk{font-size:9px;font-weight:700;letter-spacing:1px;color:var(--gold);text-transform:uppercase}
.kbled .brchip .bv{font-size:12px;font-weight:700;color:var(--ink)}
.kbled .printbtns{display:flex;gap:8px}
.kbled .printbtns button{border:1px solid var(--rule);background:var(--paper);color:var(--ink2);font-size:11px;font-weight:700;padding:6px 12px;border-radius:6px;cursor:pointer;font-family:inherit}
.kbled .printbtns button:hover{background:var(--bg-lt);border-color:var(--gold)}
.kbled .ledhead{padding:14px 30px 6px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px}
.kbled .ledhead .nm{font-size:18px;font-weight:800;color:var(--ink)}
.kbled .ledhead .grp{font-size:11px;color:var(--ink3);margin-top:3px}
.kbled .ledhead .grp b{color:var(--gold);font-weight:700}
.kbled .ledhead .period{text-align:right;font-size:11px;color:var(--ink3);line-height:1.7}
.kbled .ledhead .period b{color:var(--ink)}
.kbled .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:8px 30px 10px}
.kbled .scard{border:1px solid var(--rule);border-radius:8px;padding:11px 14px;background:var(--bg-lt)}
.kbled .scard .k{font-size:9px;font-weight:700;letter-spacing:.5px;color:var(--ink4);text-transform:uppercase}
.kbled .scard .v{font-size:16px;font-weight:800;margin-top:4px;color:var(--ink)}
.kbled .scard.dr .v{color:var(--dr)}
.kbled .scard.cr .v{color:var(--cr)}
.kbled .scard.bal .v{color:var(--gold)}
.kbled .tblwrap{padding:4px 24px 8px;overflow-x:auto}
.kbled table{width:100%;border-collapse:collapse;min-width:760px}
.kbled thead th{font-size:9px;font-weight:700;letter-spacing:.4px;color:var(--ink3);text-transform:uppercase;text-align:right;padding:9px 10px;background:var(--bg-lt);border-top:2px solid var(--dark);border-bottom:1.5px solid var(--dark);white-space:nowrap}
.kbled thead th.l{text-align:left}
.kbled tbody td{padding:8px 10px;border-bottom:.5px solid var(--rule);font-size:12px;text-align:right;vertical-align:top}
.kbled tbody td.l{text-align:left}
.kbled .dt{color:var(--ink3);white-space:nowrap;font-variant-numeric:tabular-nums}
.kbled .part{font-weight:700;color:var(--ink)}
.kbled .part .by{color:var(--ink4);font-weight:400;font-style:italic;margin-right:4px}
.kbled .part .vlink{color:var(--gold);cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.kbled .narr{font-size:10.5px;color:var(--ink4);font-style:italic;font-weight:400;margin-top:3px}
.kbled .detail{margin-top:5px;padding-left:14px;border-left:2px solid var(--rule)}
.kbled .detail .dl{display:flex;justify-content:space-between;gap:14px;font-size:10.5px;color:var(--ink3);padding:2px 0;max-width:430px}
.kbled .detail .dl .dnm{font-weight:400}
.kbled .detail .dl .dnm b{color:var(--ink2);font-weight:700}
.kbled .detail .dl .damt{font-variant-numeric:tabular-nums;font-weight:600}
.kbled .vt{display:inline-block;font-size:9px;font-weight:700;letter-spacing:.3px;padding:2px 7px;border-radius:4px;background:var(--hi);color:var(--gold);border:1px solid #ece2cc;text-transform:uppercase}
.kbled .vno{color:var(--ink3);font-size:11px;white-space:nowrap}
.kbled .vno .vlink{color:var(--gold);cursor:pointer;text-decoration:underline;text-underline-offset:2px;font-weight:700}
.kbled td.num{font-variant-numeric:tabular-nums;font-weight:600}
.kbled td.num.drc{color:var(--dr)}
.kbled td.num.crc{color:var(--cr)}
.kbled td.bal{font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}
.kbled td.bal .sd{font-size:9px;color:var(--ink4);font-weight:700;margin-left:3px}
.kbled .open-row td{background:var(--hi);font-weight:700}
.kbled .open-row td.l{color:var(--gold);text-transform:uppercase;font-size:11px;letter-spacing:.4px}
.kbled .brband td{background:var(--dark);color:#fff;font-weight:800;font-size:10.5px;letter-spacing:.5px;text-transform:uppercase;padding:7px 12px;border-top:2px solid var(--gold)}
.kbled .brband td .bc{color:var(--gold)}
.kbled .brband td .bn{color:#cbb27a;font-weight:600;text-transform:none;letter-spacing:0;margin-left:8px}
.kbled .brsub td{background:var(--bg-lt);font-weight:800;font-size:11px;border-top:1px solid var(--ink3);border-bottom:1.5px solid var(--ink3)}
.kbled .brsub td.l{text-transform:uppercase;letter-spacing:.4px;color:var(--ink2)}
.kbled tfoot td{padding:10px;border-top:2px solid var(--dark);border-bottom:none;font-weight:800;font-size:12.5px;text-align:right;background:var(--bg-lt)}
.kbled tfoot td.l{text-align:left;text-transform:uppercase;letter-spacing:.5px}
.kbled .close-row td{background:var(--hi)}
.kbled .bw-status{display:inline-block;font-size:9px;font-weight:800;letter-spacing:.3px;padding:2px 8px;border-radius:20px;text-transform:uppercase}
.kbled .bw-status.paid{background:#eaf5ef;color:var(--dr)}
.kbled .bw-status.part{background:#fbf0db;color:var(--amber)}
.kbled .bw-status.over{background:#fbeaea;color:var(--cr)}
.kbled .bw-status.curr{background:#eef2f8;color:#2C5C8F}
.kbled td.over{color:var(--cr);font-weight:700}
.kbled td.pend{font-weight:800;color:var(--gold)}
.kbled .notmaintained{padding:30px;text-align:center;color:var(--ink4);font-size:12.5px;font-style:italic}
.kbled .ageing{margin:4px 6px 14px;border:1px solid var(--rule);border-radius:9px;padding:14px 16px;background:var(--bg-lt)}
.kbled .age-title{font-size:10px;font-weight:800;letter-spacing:.5px;color:var(--ink);text-transform:uppercase;margin-bottom:10px}
.kbled .age-title span{font-weight:400;color:var(--ink4);text-transform:none;font-size:10px;letter-spacing:0}
.kbled .agebar{display:flex;height:22px;border-radius:5px;overflow:hidden;border:1px solid var(--rule);margin-bottom:12px;background:#fff}
.kbled .agebar .aseg{display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff}
.kbled .agecards{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.kbled .agecard{background:#fff;border:1px solid var(--rule);border-radius:7px;padding:9px 11px;text-align:center}
.kbled .agecard .ak{font-size:9px;font-weight:800;letter-spacing:.3px;text-transform:uppercase}
.kbled .agecard .av{font-size:14px;font-weight:800;color:var(--ink);margin-top:4px;font-variant-numeric:tabular-nums}
.kbled .agecard .apc{font-size:9.5px;color:var(--ink4);font-weight:700;margin-top:1px}
.kbled .hint{padding:8px 30px 18px;font-size:10px;color:var(--ink4);font-style:italic;line-height:1.6}
.kbled .loading{padding:40px;text-align:center;color:var(--ink4);font-size:12.5px}
@media(max-width:680px){.kbled .picker{grid-template-columns:1fr}.kbled .summary{grid-template-columns:1fr 1fr}.kbled .agecards{grid-template-columns:1fr 1fr 1fr}}
`;

/* Pure formatting / mapping / ageing helpers live in ./ledgerMath (unit-tested). */

/* ════════════════════════════════════════════════════════════════════════
   <LedgerAccountView/> — the one on-screen ledger, fed by live data.
   Props:
     name      ledger name to show (required to load)
     branch    branch object / "ALL"
     from,to   period (optional; if showPeriod, an internal PeriodBar drives it)
     cur       currency symbol (defaults from branch)
     showPeriod  render the period picker in the toolbar (default true)
     onPickVoucher  ({id,vno}) => void   — clicking a voucher number
     maxHeight   scroll height for the table area (default 'calc(100vh - 360px)')
   ════════════════════════════════════════════════════════════════════════ */
export function LedgerAccountView({
  name, branch, from: fromProp, to: toProp,
  showPeriod = true, onPickVoucher, onPickInvoice, maxHeight = 'calc(100vh - 320px)',
}) {
  // Branch is controlled SOLELY by the top-right global selector (the `branch`
  // prop). BOM selected ⇒ only BOM data; consolidated (TK HO Group) ⇒ all
  // branches. Never an in-view override — branch data is never mixed.
  const cur = bc(branch).cur || '₹';

  const [period, setPeriod] = useState({ from: fromProp || '', to: toProp || '' });
  const from = showPeriod ? period.from : (fromProp || '');
  const to = showPeriod ? period.to : (toProp || '');

  const [view, setView] = useState('ledger');   // 'ledger' | 'bill'
  const [showNarr, setShowNarr] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const q = useLedgerStatement(name, branch, { from, to });
  const d = useMemo(() => mapLedger(q.data), [q.data]);
  const group = d?.group || q.data?.group || '';
  const side = billwiseSide(group);

  // Analytical tabs (Cost-Centre DOM/INT split + fare Components) apply only to
  // trading ledgers (Sales/Purchase/Direct). Fetch lazily, show the tab only when
  // there's data — so option B keeps the P&L analysis without a separate screen.
  const analytical = /sales|purchase|direct\s*(income|expense)/i.test(group);
  const splitQ = useLedgerSplit(name, branch, { from, to }, analytical);
  const compQ = useLedgerComponents(name, branch, { from, to }, analytical);
  const splitRows = Array.isArray(splitQ.data) ? splitQ.data : [];
  const compRows = (compQ.data && compQ.data.rows) || [];
  const hasSplit = splitRows.length > 1;        // a real DOM/INT split (not a single bucket)
  const hasComp = compRows.length > 0;

  // Bill-wise needs a real party + a concrete branch (a bill belongs to a branch).
  // Only party ledgers (debtors/creditors) carry bills — skip the query otherwise.
  const bw = useOpenBills(side ? name : null, branch, side || 'customer');
  const bills = useMemo(() => mapBills(bw.data), [bw.data]);
  const hasBranch = !!branchCode(branch);

  const printNow = (mode) => printLedgerUI({
    d: q.data, bills, view: mode === 'bill' ? 'bill' : view, group, side,
    cur, branchLabel: branchLabelOf(branch), from, to, showNarr, showDetail,
  });

  return (
    <div className="kbled">
      <style>{LEDGER_CSS}</style>
      <div className="sheet">
        <div className="hdr">
          <div className="brand"><div className="logo">LEDGER</div><div className="sub">ACCOUNT STATEMENT</div></div>
          <div className="doc-title"><h1>{name || 'LEDGER ACCOUNT'}</h1><div className="accent" /><span className="badge">Account Statement</span></div>
        </div>

        <div className="toolbar">
          <span className="vlabel">View</span>
          <div className="seg">
            <button className={view === 'ledger' ? 'active' : ''} onClick={() => setView('ledger')}>Ledger</button>
            <button className={view === 'bill' ? 'active' : ''} onClick={() => setView('bill')}>Bill-wise</button>
            {hasSplit && <button className={view === 'cc' ? 'active' : ''} onClick={() => setView('cc')}>Cost-Centre</button>}
            {hasComp && <button className={view === 'comp' ? 'active' : ''} onClick={() => setView('comp')}>Components</button>}
          </div>
          <div className={'toggles' + (view !== 'ledger' ? ' disabled' : '')}>
            <label className="tg"><input type="checkbox" checked={showNarr} onChange={(e) => setShowNarr(e.target.checked)} /> Show Narration</label>
            <label className="tg"><input type="checkbox" checked={showDetail} onChange={(e) => setShowDetail(e.target.checked)} /> Detailed (full voucher)</label>
          </div>
          <span className="spacer" />
          {showPeriodBranchHint(branch)}
          {showPeriod && <PeriodBar branch={branch} compact defaultPreset="all" onChange={(r) => setPeriod({ from: r.from, to: r.to })} />}
          <div className="printbtns">
            <button onClick={() => printNow()} title="Print / Save as PDF">🖨 Print</button>
          </div>
        </div>

        <div className="ledhead">
          <div>
            <div className="nm">{name}</div>
            <div className="grp">Under: <b>{group || '—'}</b>{d?.code ? ` · ${d.code}` : ''} &nbsp;·&nbsp; Branch: <b>{branchLabelOf(branch)}</b></div>
          </div>
          <div className="period">{view === 'bill' ? 'Bills Outstanding' : 'Ledger Account'}<br />
            From <b>{from ? dmy(from) : '…'}</b> to <b>{to ? dmy(to) : '…'}</b></div>
        </div>

        {q.isLoading && <div className="loading">Loading ledger…</div>}
        {!q.isLoading && view === 'ledger' && d && <LedgerBody d={d} cur={cur} segmented={!hasBranch} showNarr={showNarr} showDetail={showDetail} onPickVoucher={onPickVoucher} onPickInvoice={onPickInvoice} maxHeight={maxHeight} />}
        {!q.isLoading && view === 'bill' && (
          <BillwiseBody side={side} bills={bills} loading={bw.isLoading} hasBranch={hasBranch} group={group} name={name} maxHeight={maxHeight} />
        )}
        {view === 'cc' && <BreakdownBody title="Cost-Centre Split (Domestic / International)" rows={splitRows} loading={splitQ.isLoading} maxHeight={maxHeight} hint="Module cost-centre split of this ledger (Tally sub-ledger level). Drill the full statement from the Ledger tab." />}
        {view === 'comp' && <BreakdownBody title="Fare / Charge Components" rows={compRows} loading={compQ.isLoading} maxHeight={maxHeight} hint="Component breakup (Base Fare, K3, Taxes, Service Charge…) summed from each voucher's fare detail." />}
      </div>
    </div>
  );
}

/* ── Ledger (T-account) body ─────────────────────────────────────────────── */
function LedgerBody({ d, cur, segmented, showNarr, showDetail, onPickVoucher, onPickInvoice, maxHeight }) {
  const opSigned = d.opening.side === 'Dr' ? d.opening.amt : -d.opening.amt;
  let bal = opSigned;
  const closing = d.closing;
  const opDr = d.opening.side === 'Dr' ? d.opening.amt : 0;
  const opCr = d.opening.side === 'Cr' ? d.opening.amt : 0;
  const closeOnCr = (closing.side === 'Cr');
  const grand = closeOnCr ? (opCr + d.totalCredit) : (opDr + d.totalDebit);
  // Segment by branch only in the consolidated (Group) view AND only when the
  // postings actually span more than one branch.
  const segments = segmented ? groupByBranch(d.rows) : null;
  const doSegment = !!(segments && segments.length > 1);

  // One posting row, drawn at the current running-balance value.
  const postingRow = (r, key) => (
    <tr key={key}>
      <td className="l dt">{r.date}</td>
      <td className="l part">
        <span className="by">{r.toBy}</span>{r.part}
        {showNarr && r.narr && <div className="narr">{r.narr}</div>}
        {showDetail && r.detail.length > 0 && (
          <div className="detail">{r.detail.map((dd, j) => (
            <div className="dl" key={j}><span className="dnm">{dd.side} <b>{dd.n}</b></span><span className="damt">{fmt(dd.amt)}</span></div>
          ))}</div>
        )}
      </td>
      <td className="l"><span className="vt">{r.vt}</span></td>
      <td className="l vno">
        {r.voucherId && onPickInvoice && /sale|purchase/i.test(r.category || '')
          ? <span className="vlink" onClick={() => onPickInvoice({ id: r.voucherId, vno: r.vno, category: r.category })} title={/purchase/i.test(r.category) ? 'Open in Purchase Register' : 'Open in Sales Register'}>{r.vno}</span>
          : r.voucherId && onPickVoucher
            ? <span className="vlink" onClick={() => onPickVoucher({ id: r.voucherId, vno: r.vno })} title="Open voucher">{r.vno}</span>
            : r.vno}
      </td>
      <td className="num drc">{fmt(r.dr)}</td>
      <td className="num crc">{fmt(r.cr)}</td>
      <td className="bal">{fmtB(bal)}<span className="sd">{bal >= 0 ? 'Dr' : 'Cr'}</span></td>
    </tr>
  );

  const bodyRows = [];
  if (doSegment) {
    segments.forEach((g, gi) => {
      let gDr = 0, gCr = 0;
      bodyRows.push(
        <tr className="brband" key={`h${gi}`}><td className="l" colSpan={7}>
          🏢 <span className="bc">{branchSeg(g.branch)}</span><span className="bn">{g.rows.length} entr{g.rows.length === 1 ? 'y' : 'ies'}</span>
        </td></tr>,
      );
      g.rows.forEach((r, ri) => { bal += r.dr - r.cr; gDr += r.dr; gCr += r.cr; bodyRows.push(postingRow(r, `${gi}-${ri}`)); });
      bodyRows.push(
        <tr className="brsub" key={`s${gi}`}>
          <td className="l" colSpan={4}>Subtotal — {branchSeg(g.branch)}</td>
          <td className="num">{fmt(gDr)}</td><td className="num">{fmt(gCr)}</td>
          <td className="bal">{fmtB(bal)}<span className="sd">{bal >= 0 ? 'Dr' : 'Cr'}</span></td>
        </tr>,
      );
    });
  } else {
    d.rows.forEach((r, i) => { bal += r.dr - r.cr; bodyRows.push(postingRow(r, i)); });
  }

  return (
    <>
      <div className="summary">
        <div className="scard"><div className="k">Opening Balance</div><div className="v">{fmtB(opSigned)} <span style={{ fontSize: 11, color: '#9A9A9A' }}>{d.opening.side}</span></div></div>
        <div className="scard dr"><div className="k">Total Debit</div><div className="v">{fmt(d.totalDebit) || '0.00'}</div></div>
        <div className="scard cr"><div className="k">Total Credit</div><div className="v">{fmt(d.totalCredit) || '0.00'}</div></div>
        <div className="scard bal"><div className="k">Closing Balance</div><div className="v">{fmtB(closing.amt)} <span style={{ fontSize: 11, color: '#9A9A9A' }}>{closing.side}</span></div></div>
      </div>

      <div className="tblwrap" style={{ maxHeight, overflowY: 'auto' }}>
        <table>
          <thead><tr><th className="l">Date</th><th className="l">Particulars</th><th className="l">Vch Type</th><th className="l">Vch No</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
          <tbody>
            <tr className="open-row">
              <td className="l" colSpan={4}>Opening Balance{doSegment ? ' (Group)' : ''}</td>
              <td className="num">{d.opening.side === 'Dr' ? fmt(d.opening.amt) : ''}</td>
              <td className="num">{d.opening.side === 'Cr' ? fmt(d.opening.amt) : ''}</td>
              <td className="bal">{fmtB(opSigned)}<span className="sd">{opSigned >= 0 ? 'Dr' : 'Cr'}</span></td>
            </tr>
            {d.rows.length === 0 && <tr><td className="l" colSpan={7} style={{ textAlign: 'center', padding: 26, color: '#9A9A9A' }}>No postings in range.</td></tr>}
            {bodyRows}
          </tbody>
          <tfoot>
            <tr className="close-row">
              <td className="l" style={{ color: GOLD, textTransform: 'uppercase', fontSize: 11, letterSpacing: '.4px' }} colSpan={4}>Closing Balance{doSegment ? ' (Group)' : ''}</td>
              <td className="num">{!closeOnCr ? fmtB(closing.amt) : ''}</td>
              <td className="num">{closeOnCr ? fmtB(closing.amt) : ''}</td>
              <td className="bal">{fmtB(closing.amt)}<span className="sd">{closing.side}</span></td>
            </tr>
            <tr><td className="l">Grand Total</td><td /><td /><td /><td>{fmt(grand)}</td><td>{fmt(grand)}</td><td /></tr>
          </tfoot>
        </table>
      </div>
      <div className="hint">{doSegment
        ? <>Consolidated <b>TK HO Group</b> view — postings are <b>segmented by branch</b> with per-branch subtotals; branch books are never blended. Select a branch top-right for that branch only.</>
        : <>Tally-style ledger. <b>To/By</b> shows the contra account. Toggle <b>Narration</b> for the voucher note, or <b>Detailed</b> to expand each voucher into its full double-entry. Switch to <b>Bill-wise</b> for outstanding bills.</>}</div>
    </>
  );
}

/* ── Bill-wise + ageing body ─────────────────────────────────────────────── */
function BillwiseBody({ side, bills, loading, hasBranch, group, name, maxHeight }) {
  if (!side) {
    return (
      <>
        <div className="tblwrap"><div className="notmaintained">This ledger (<b>{name}</b>, under {group || '—'}) is not maintained <b>bill-by-bill</b>.<br />Bill-wise view applies to Sundry Debtors &amp; Sundry Creditors.</div></div>
        <div className="hint">Bill-wise outstanding is tracked only for party ledgers (debtors / creditors).</div>
      </>
    );
  }
  if (!hasBranch) {
    return (
      <>
        <div className="tblwrap"><div className="notmaintained">Select a <b>specific branch</b> (not “All branches”) to view bill-wise outstanding — each bill belongs to one branch.</div></div>
      </>
    );
  }
  if (loading) return <div className="loading">Loading bills…</div>;

  let totAmt = 0, totSet = 0, totPend = 0, overdueCount = 0;
  bills.forEach((b) => { totAmt += b.amt; totSet += b.settled; totPend += b.pend; if (b.pend > 0 && b.age > 0) overdueCount++; });
  const { age, totPend: agePend } = ageingOf(bills);
  const ageTotal = agePend || 1;

  return (
    <>
      <div className="summary">
        <div className="scard"><div className="k">Bills Raised</div><div className="v">{fmt(totAmt) || '0.00'}</div></div>
        <div className="scard dr"><div className="k">Settled</div><div className="v">{fmt(totSet) || '0.00'}</div></div>
        <div className="scard bal"><div className="k">Pending (Outstanding)</div><div className="v">{fmt(totPend) || '0.00'}</div></div>
        <div className="scard cr"><div className="k">Overdue Bills</div><div className="v">{overdueCount}</div></div>
      </div>
      <div className="tblwrap" style={{ maxHeight, overflowY: 'auto' }}>
        <div className="ageing">
          <div className="age-title">Ageing of Outstanding <span>(by days outstanding)</span></div>
          <div className="agebar">
            {AGE_BUCKETS.map((k) => { const a = age[k]; const pct = a / ageTotal * 100; return a > 0 ? <div key={k} className="aseg" style={{ width: pct + '%', background: AGE_COLORS[k] }} title={`${k}: ${fmt(a)}`}>{pct >= 9 ? pct.toFixed(0) + '%' : ''}</div> : null; })}
          </div>
          <div className="agecards">
            {AGE_BUCKETS.map((k) => { const a = age[k]; const pct = a / ageTotal * 100; return (
              <div className="agecard" key={k}><div className="ak" style={{ color: AGE_COLORS[k] }}>{k === 'Not Due' ? 'Not Due' : k + ' days'}</div><div className="av">{a ? fmt(a) : '—'}</div><div className="apc">{a ? pct.toFixed(0) + '%' : ''}</div></div>
            ); })}
          </div>
        </div>
        <table>
          <thead><tr><th className="l">Bill Ref</th><th className="l">Bill Date</th><th>Bill Amount</th><th>Settled</th><th>Pending</th><th>Age</th><th className="l">Status</th></tr></thead>
          <tbody>
            {bills.length === 0 && <tr><td className="l" colSpan={7} style={{ textAlign: 'center', padding: 26, color: '#9A9A9A' }}>No outstanding bills.</td></tr>}
            {bills.map((b, i) => {
              let status, scls;
              if (b.pend <= 0) { status = 'Settled'; scls = 'paid'; }
              else if (b.age > 0) { status = b.age + 'd overdue'; scls = 'over'; }
              else if (b.settled > 0) { status = 'Part-paid'; scls = 'part'; }
              else { status = 'Current'; scls = 'curr'; }
              return (
                <tr key={i}>
                  <td className="l part">{b.ref}</td>
                  <td className="l dt">{b.bdate}</td>
                  <td className="num">{fmt(b.amt)}</td>
                  <td className="num drc">{fmt(b.settled)}</td>
                  <td className="num pend">{fmt(b.pend)}</td>
                  <td className={b.age > 0 && b.pend > 0 ? 'over' : ''}>{b.pend > 0 && b.age > 0 ? b.age + ' d' : '—'}</td>
                  <td className="l"><span className={'bw-status ' + scls}>{status}</span></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr><td className="l">Total</td><td /><td>{fmt(totAmt)}</td><td>{fmt(totSet)}</td><td className="pend">{fmt(totPend)}</td><td /><td /></tr></tfoot>
        </table>
      </div>
      <div className="hint">Bill-wise outstanding. Pending total ties to the ledger closing balance. Age = days the bill has been outstanding.</div>
    </>
  );
}

/* ── Cost-Centre / Components breakdown body (Dr/Cr table, cream-gold theme) ── */
function BreakdownBody({ title, rows, loading, maxHeight, hint }) {
  if (loading) return <div className="loading">Loading…</div>;
  const list = rows || [];
  const grand = list.reduce((s, r) => s + (r.side === 'Cr' ? r.amount : -r.amount), 0);
  return (
    <>
      <div className="tblwrap" style={{ maxHeight, overflowY: 'auto' }}>
        <table>
          <thead><tr><th className="l">{title}</th><th>Debit</th><th>Credit</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td className="l" colSpan={3} style={{ textAlign: 'center', padding: 26, color: '#9A9A9A' }}>No breakdown for this ledger / period.</td></tr>}
            {list.map((r, i) => (
              <tr key={i}>
                <td className="l part">{r.label}</td>
                <td className="num drc">{r.side === 'Dr' ? fmt(r.amount) : ''}</td>
                <td className="num crc">{r.side === 'Cr' ? fmt(r.amount) : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td className="l">Grand Total</td><td className="num">{grand < 0 ? fmt(-grand) : ''}</td><td className="num">{grand >= 0 ? fmt(grand) : ''}</td></tr></tfoot>
        </table>
      </div>
      {hint && <div className="hint">{hint}</div>}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PRINT / PDF — same markup + same CSS as the screen, so paper == screen.
   ════════════════════════════════════════════════════════════════════════ */
function branchLabelOf(branch) { return (!branch || branch === 'ALL') ? 'All branches' : (branch.code || branch); }

// A read-only chip echoing the branch chosen in the top-right global selector —
// the ledger always shows that branch's data only (consolidated = TK HO Group).
function showPeriodBranchHint(branch) {
  const isAll = (!branch || branch === 'ALL');
  return (
    <span className="brchip" title="Branch is set by the top-right selector. Consolidated (TK HO Group) shows all branches.">
      <span className="bk">{isAll ? 'Group' : 'Branch'}</span>
      <span className="bv">{isAll ? 'TK HO — All branches' : branchLabelOf(branch)}</span>
    </span>
  );
}

export function printLedgerUI({ d, bills = [], view = 'ledger', group, side, cur = '₹', branchLabel = '', from = '', to = '', showNarr = false, showDetail = false }) {
  if (!d) return;
  const m = mapLedger(d);
  const period = `From <b>${from ? dmy(from) : '…'}</b> to <b>${to ? dmy(to) : '…'}</b>`;
  const inner = (view === 'bill')
    ? billwisePrintHTML({ side, bills, group, name: m.name })
    : ledgerPrintHTML({ m, showNarr, showDetail });

  const html = `<style>${LEDGER_CSS}</style><div class="kbled"><div class="sheet">
    <div class="hdr">
      <div class="brand"><div class="logo">LEDGER</div><div class="sub">ACCOUNT STATEMENT</div></div>
      <div class="doc-title"><h1>${esc(m.name || '')}</h1><div class="accent"></div><span class="badge">Account Statement</span></div>
    </div>
    <div class="ledhead">
      <div><div class="nm">${esc(m.name || '')}</div><div class="grp">Under: <b>${esc(group || '—')}</b>${m.code ? ' · ' + esc(m.code) : ''}${branchLabel ? ' · ' + esc(branchLabel) : ''}</div></div>
      <div class="period">${view === 'bill' ? 'Bills Outstanding' : 'Ledger Account'}<br>${period}</div>
    </div>
    ${inner}
  </div></div>`;

  openPrintPreview({ title: `Ledger — ${m.name || 'Statement'}`, recommend: view === 'bill' ? 'landscape' : 'portrait', html });
}

function ledgerPrintHTML({ m, showNarr, showDetail }) {
  const opSigned = m.opening.side === 'Dr' ? m.opening.amt : -m.opening.amt;
  let bal = opSigned;
  const closing = m.closing;
  const closeOnCr = closing.side === 'Cr';
  const opDr = m.opening.side === 'Dr' ? m.opening.amt : 0;
  const opCr = m.opening.side === 'Cr' ? m.opening.amt : 0;
  const grand = closeOnCr ? (opCr + m.totalCredit) : (opDr + m.totalDebit);

  // Auto-segment by branch when the postings span more than one (consolidated).
  const segs = groupByBranch(m.rows);
  const doSegment = segs.length > 1;

  const rowHTML = (r) => {
    const detail = (showDetail && r.detail.length)
      ? `<div class="detail">${r.detail.map((dd) => `<div class="dl"><span class="dnm">${esc(dd.side)} <b>${esc(dd.n)}</b></span><span class="damt">${fmt(dd.amt)}</span></div>`).join('')}</div>` : '';
    const narr = (showNarr && r.narr) ? `<div class="narr">${esc(r.narr)}</div>` : '';
    return `<tr>
      <td class="l dt">${esc(r.date)}</td>
      <td class="l part"><span class="by">${esc(r.toBy)}</span>${esc(r.part)}${narr}${detail}</td>
      <td class="l"><span class="vt">${esc(r.vt)}</span></td>
      <td class="l vno">${esc(r.vno)}</td>
      <td class="num drc">${fmt(r.dr)}</td>
      <td class="num crc">${fmt(r.cr)}</td>
      <td class="bal">${fmtB(bal)}<span class="sd">${bal >= 0 ? 'Dr' : 'Cr'}</span></td>
    </tr>`;
  };

  let body;
  if (doSegment) {
    body = segs.map((g) => {
      let gDr = 0, gCr = 0;
      const head = `<tr class="brband"><td class="l" colspan="7">🏢 <span class="bc">${esc(branchSeg(g.branch))}</span><span class="bn">${g.rows.length} entries</span></td></tr>`;
      const rs = g.rows.map((r) => { bal += r.dr - r.cr; gDr += r.dr; gCr += r.cr; return rowHTML(r); }).join('');
      const sub = `<tr class="brsub"><td class="l" colspan="4">Subtotal — ${esc(branchSeg(g.branch))}</td><td class="num">${fmt(gDr)}</td><td class="num">${fmt(gCr)}</td><td class="bal">${fmtB(bal)}<span class="sd">${bal >= 0 ? 'Dr' : 'Cr'}</span></td></tr>`;
      return head + rs + sub;
    }).join('');
  } else {
    body = m.rows.map((r) => { bal += r.dr - r.cr; return rowHTML(r); }).join('');
  }
  const opLabel = doSegment ? 'Opening Balance (Group)' : 'Opening Balance';
  const clLabel = doSegment ? 'Closing Balance (Group)' : 'Closing Balance';

  return `<div class="summary">
      <div class="scard"><div class="k">Opening Balance</div><div class="v">${fmtB(opSigned)} <span style="font-size:11px;color:#9A9A9A">${esc(m.opening.side)}</span></div></div>
      <div class="scard dr"><div class="k">Total Debit</div><div class="v">${fmt(m.totalDebit) || '0.00'}</div></div>
      <div class="scard cr"><div class="k">Total Credit</div><div class="v">${fmt(m.totalCredit) || '0.00'}</div></div>
      <div class="scard bal"><div class="k">Closing Balance</div><div class="v">${fmtB(closing.amt)} <span style="font-size:11px;color:#9A9A9A">${esc(closing.side)}</span></div></div>
    </div>
    <div class="tblwrap"><table>
      <thead><tr><th class="l">Date</th><th class="l">Particulars</th><th class="l">Vch Type</th><th class="l">Vch No</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
      <tbody>
        <tr class="open-row"><td class="l" colspan="4">${opLabel}</td>
          <td class="num">${m.opening.side === 'Dr' ? fmt(m.opening.amt) : ''}</td>
          <td class="num">${m.opening.side === 'Cr' ? fmt(m.opening.amt) : ''}</td>
          <td class="bal">${fmtB(opSigned)}<span class="sd">${opSigned >= 0 ? 'Dr' : 'Cr'}</span></td></tr>
        ${body || '<tr><td class="l" colspan="7" style="text-align:center;padding:26px;color:#9A9A9A">No postings in range.</td></tr>'}
      </tbody>
      <tfoot>
        <tr class="close-row"><td class="l" style="color:#A07828;text-transform:uppercase;font-size:11px;letter-spacing:.4px" colspan="4">${clLabel}</td>
          <td class="num">${!closeOnCr ? fmtB(closing.amt) : ''}</td><td class="num">${closeOnCr ? fmtB(closing.amt) : ''}</td>
          <td class="bal">${fmtB(closing.amt)}<span class="sd">${esc(closing.side)}</span></td></tr>
        <tr><td class="l">Grand Total</td><td></td><td></td><td></td><td>${fmt(grand)}</td><td>${fmt(grand)}</td><td></td></tr>
      </tfoot>
    </table></div>`;
}

function billwisePrintHTML({ side, bills, group, name }) {
  if (!side) return `<div class="tblwrap"><div class="notmaintained">This ledger (<b>${esc(name)}</b>, under ${esc(group || '—')}) is not maintained <b>bill-by-bill</b>.</div></div>`;
  let totAmt = 0, totSet = 0, totPend = 0;
  const rows = bills.map((b) => {
    totAmt += b.amt; totSet += b.settled; totPend += b.pend;
    let status, scls;
    if (b.pend <= 0) { status = 'Settled'; scls = 'paid'; }
    else if (b.age > 0) { status = b.age + 'd overdue'; scls = 'over'; }
    else if (b.settled > 0) { status = 'Part-paid'; scls = 'part'; }
    else { status = 'Current'; scls = 'curr'; }
    return `<tr>
      <td class="l part">${esc(b.ref)}</td><td class="l dt">${esc(b.bdate)}</td>
      <td class="num">${fmt(b.amt)}</td><td class="num drc">${fmt(b.settled)}</td><td class="num pend">${fmt(b.pend)}</td>
      <td class="${b.age > 0 && b.pend > 0 ? 'over' : ''}">${b.pend > 0 && b.age > 0 ? b.age + ' d' : '—'}</td>
      <td class="l"><span class="bw-status ${scls}">${esc(status)}</span></td></tr>`;
  }).join('');
  const { age, totPend: agePend } = ageingOf(bills);
  const ageTotal = agePend || 1;
  const bar = AGE_BUCKETS.map((k) => { const a = age[k]; const pct = a / ageTotal * 100; return a > 0 ? `<div class="aseg" style="width:${pct}%;background:${AGE_COLORS[k]}">${pct >= 9 ? pct.toFixed(0) + '%' : ''}</div>` : ''; }).join('');
  const cards = AGE_BUCKETS.map((k) => { const a = age[k]; const pct = a / ageTotal * 100; return `<div class="agecard"><div class="ak" style="color:${AGE_COLORS[k]}">${k === 'Not Due' ? 'Not Due' : k + ' days'}</div><div class="av">${a ? fmt(a) : '—'}</div><div class="apc">${a ? pct.toFixed(0) + '%' : ''}</div></div>`; }).join('');
  return `<div class="tblwrap">
    <div class="ageing"><div class="age-title">Ageing of Outstanding <span>(by days outstanding)</span></div><div class="agebar">${bar}</div><div class="agecards">${cards}</div></div>
    <table>
      <thead><tr><th class="l">Bill Ref</th><th class="l">Bill Date</th><th>Bill Amount</th><th>Settled</th><th>Pending</th><th>Age</th><th class="l">Status</th></tr></thead>
      <tbody>${rows || '<tr><td class="l" colspan="7" style="text-align:center;padding:26px;color:#9A9A9A">No outstanding bills.</td></tr>'}</tbody>
      <tfoot><tr><td class="l">Total</td><td></td><td>${fmt(totAmt)}</td><td>${fmt(totSet)}</td><td class="pend">${fmt(totPend)}</td><td></td><td></td></tr></tfoot>
    </table></div>`;
}
