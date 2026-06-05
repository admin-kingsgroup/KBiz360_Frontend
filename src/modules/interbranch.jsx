/* ════════════════════════════════════════════════════════════════════
   INTER-BRANCH ELIMINATION REPORT  ·  /reports/interbranch
   ────────────────────────────────────────────────────────────────────
   A TRUE group-consolidation report. It reads the LIVE double-entry books
   (no demo arrays) and reconciles the two sides of every inter-branch
   relationship:

     · Inter-Branch Sundry Debtors   → "due FROM <branch>"  (Receivable)
     · Inter-Branch Sundry Creditors → "due TO   <branch>"  (Payable)

   A receivable booked in branch A "due from B" must be mirrored by a
   payable in branch B "due to A". During consolidation those mirror
   balances cancel (eliminate); anything left over is an UNMATCHED balance
   that needs investigating before the group accounts can be signed off.

   Data sources (all live):
     · GET /api/accounting/trial-balance → per-ledger Dr/Cr + closing balance
     · GET /api/ledgers                  → owning branch + group per ledger
     · GET /api/accounting/ledger?name=  → voucher-wise drill-down (on demand)
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from 'react';
import { useTrialBalance, useLedgerStatement } from '../core/useAccounting';
import { useLedgerRegistry } from '../core/useReference';
import { BRANCHES } from '../core/data';
import { fmtINR } from '../core/format';
import { CUR_FY, todayISO, fmtDate } from '../core/dates';
import { cardStyle } from '../core/helpers';
import { RPT_thStyle, RPT_tdStyle } from '../core/styles';
import { exportToExcel } from '../core/exportExcel';
import { exportToCSV } from '../core/business-logic';
import { VoucherEditor } from './accountingLive';

/* ── inter-branch ledger detector ──────────────────────────────────────
   Only fires INSIDE the Sundry Debtors / Sundry Creditors groups (checked
   by the caller), so false positives are unlikely. Recognises the common
   Tally naming styles plus any "<Branch>/<City> Branch" control account. */
const IB_KEYWORDS = /inter[\s\-/]?branch|branch\s*a\/?c|branch\s*current|due\s+(to|from)|head\s*office\s*(current|a\/?c)|h\.?o\.?\s*current/i;
export function isInterBranch(name) {
  const n = name || '';
  if (IB_KEYWORDS.test(n)) return true;
  if (/branch/i.test(n)) {
    const low = n.toLowerCase();
    return BRANCHES.some((b) => low.includes(String(b.code).toLowerCase()) || (b.city && low.includes(String(b.city).toLowerCase())));
  }
  return false;
}

// Resolve the COUNTER branch a ledger points at (the branch named in the
// ledger), excluding the ledger's own owning branch.
function counterBranchOf(name, owningCode) {
  const low = (name || '').toLowerCase();
  for (const b of BRANCHES) {
    if (b.code === owningCode) continue;
    const tokens = [b.code, b.city].filter(Boolean).map((s) => String(s).toLowerCase());
    if (tokens.some((t) => t.length >= 2 && low.includes(t))) return b;
  }
  return null;
}

export const brName = (code) => {
  const b = BRANCHES.find((x) => x.code === code);
  return b ? `${b.code} · ${b.city}` : (code || '—');
};

/* ── status palette ── */
const STATUS = {
  Matched:    { c: '#1D9E75', bg: '#EAF3DE', label: 'Matched' },
  Eliminated: { c: '#185FA5', bg: '#E6F1FB', label: 'Eliminated' },
  Partial:    { c: '#854F0B', bg: '#FAEEDA', label: 'Partial' },
  Unmatched:  { c: '#A32D2D', bg: '#FCEBEB', label: 'Unmatched' },
};
function Badge({ status }) {
  const s = STATUS[status] || STATUS.Unmatched;
  return <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: s.bg, color: s.c, whiteSpace: 'nowrap' }}>{s.label}</span>;
}

const tBtn = (active) => ({ padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${active ? '#0d1326' : '#e1e3ec'}`, background: active ? '#0d1326' : '#fff', color: active ? '#d4a437' : '#5a6691' });
const xBtn = { padding: '7px 12px', background: '#fff', border: '1px solid #e1e3ec', borderRadius: 6, fontSize: 11.5, cursor: 'pointer', fontWeight: 600, color: '#5a6691' };

/* ══════════════════════════════════════════════════════════════════════
   MAIN REPORT
   ════════════════════════════════════════════════════════════════════ */
export function RPT_InterbranchElim() {
  const [view, setView] = useState('summary');               // 'summary' | 'detailed'
  const [from, setFrom] = useState(CUR_FY.startISO);          // FY start → cumulative balances
  const [to, setTo]     = useState(todayISO());               // as-on current date
  const [open, setOpen] = useState('');                       // expanded "side:ledger" in detailed view
  const [voucher, setVoucher] = useState(null);              // drill target { id }

  // Consolidated (ALL branches) — elimination is inherently group-level.
  const tbQ  = useTrialBalance(undefined, { from, to });
  const regQ = useLedgerRegistry();
  const tbRows = tbQ.data?.rows || [];
  const ledgers = regQ.data || [];

  const model = useMemo(() => {
    const regByName = new Map(ledgers.map((l) => [String(l.name).toLowerCase(), l]));

    const classify = (row) => {
      const reg = regByName.get(String(row.ledger).toLowerCase());
      const group = row.group || reg?.group || '';
      const isDebtor   = /sundry debtors/i.test(group);
      const isCreditor = /sundry creditors/i.test(group);
      if (!isDebtor && !isCreditor) return null;
      if (!isInterBranch(row.ledger)) return null;
      const owning = reg && reg.branch && reg.branch !== 'ALL' ? reg.branch : null;
      const counter = counterBranchOf(row.ledger, owning);
      return {
        ledger: row.ledger, group, owning,
        counterCode: counter?.code || null,
        side: isDebtor ? 'receivable' : 'payable',
        debit: row.debit || 0, credit: row.credit || 0,
        // Outstanding = closing balance on the ledger's natural side.
        outstanding: isDebtor ? (row.closingDebit || 0) : (row.closingCredit || 0),
      };
    };

    const all = tbRows.map(classify).filter(Boolean);
    const receivables = all.filter((c) => c.side === 'receivable');
    const payables    = all.filter((c) => c.side === 'payable');

    // Match a receivable (owning A → counter B) against the mirror payable
    // (owning B → counter A) and compute the eliminable overlap.
    const payByKey = new Map(payables.map((p) => [`${p.owning || '?'}|${p.counterCode || '?'}`, p]));
    receivables.forEach((r) => {
      const mirror = payByKey.get(`${r.counterCode || '?'}|${r.owning || '?'}`);
      if (mirror) {
        const elim = Math.min(r.outstanding, mirror.outstanding);
        const status = Math.abs(r.outstanding - mirror.outstanding) < 1 ? 'Matched' : 'Partial';
        r.matched = true;  r.elim = elim;  r.status = status;  r.mirror = mirror.ledger;
        mirror.matched = true; mirror.elim = elim; mirror.status = status; mirror.mirror = r.ledger;
      } else {
        r.matched = false; r.elim = 0; r.status = 'Unmatched';
      }
    });
    payables.forEach((p) => { if (p.matched === undefined) { p.matched = false; p.elim = 0; p.status = 'Unmatched'; } });

    const sum = (arr, k) => arr.reduce((s, x) => s + (x[k] || 0), 0);
    const totalRec  = sum(receivables, 'outstanding');
    const totalPay  = sum(payables, 'outstanding');
    const totalElim = sum(receivables, 'elim');               // each pair counted once
    const totals = {
      totalRec, totalPay, totalElim,
      unmatchedRec: Math.max(0, totalRec - totalElim),
      unmatchedPay: Math.max(0, totalPay - totalElim),
      netDiff: totalRec - totalPay,
    };

    // Branch-wise rollup (by owning branch).
    const branchMap = new Map();
    const bump = (code, key, amt) => {
      const k = code || '—';
      if (!branchMap.has(k)) branchMap.set(k, { branch: k, rec: 0, pay: 0, elim: 0 });
      branchMap.get(k)[key] += amt;
    };
    receivables.forEach((r) => { bump(r.owning, 'rec', r.outstanding); bump(r.owning, 'elim', r.elim); });
    payables.forEach((p) => { bump(p.owning, 'pay', p.outstanding); bump(p.owning, 'elim', p.elim); });
    const branchSummary = [...branchMap.values()].sort((a, b) => (b.rec + b.pay) - (a.rec + a.pay));

    return { receivables, payables, totals, branchSummary };
  }, [tbRows, ledgers]);

  const { receivables, payables, totals, branchSummary } = model;
  const hasData = receivables.length > 0 || payables.length > 0;
  const loading = tbQ.isLoading || regQ.isLoading;

  /* ── exports ── */
  const exportRows = useMemo(() => ([
    ...receivables.map((r) => ({ type: 'Receivable', branch: r.owning || '—', counter: r.counterCode || '—', ledger: r.ledger, debit: r.debit, credit: 0, outstanding: r.outstanding, eliminated: r.elim, status: r.status })),
    ...payables.map((p) => ({ type: 'Payable', branch: p.owning || '—', counter: p.counterCode || '—', ledger: p.ledger, debit: 0, credit: p.credit, outstanding: p.outstanding, eliminated: p.elim, status: p.status })),
  ]), [receivables, payables]);
  const exportCols = [
    { key: 'type', label: 'Type' }, { key: 'branch', label: 'Branch' }, { key: 'counter', label: 'Counter Branch' },
    { key: 'ledger', label: 'Ledger' }, { key: 'debit', label: 'Debit' }, { key: 'credit', label: 'Credit' },
    { key: 'outstanding', label: 'Outstanding' }, { key: 'eliminated', label: 'Eliminated' }, { key: 'status', label: 'Status' },
  ];
  const fname = `inter-branch-elimination_${from}_to_${to}`;
  const doExcel = () => exportToExcel(fname, exportCols, exportRows);
  const doCsv   = () => exportToCSV(exportRows, exportCols.map((c) => c.key), `${fname}.csv`);

  /* ── voucher drill overlay ── */
  if (voucher) {
    return (
      <div style={{ padding: 18, maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontSize: 12, color: '#5a6691', marginBottom: 8 }}>
          <button onClick={() => setVoucher(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#185FA5', fontWeight: 600, padding: 0 }}>Inter-Branch Report</button>
          <span style={{ color: '#b9bed4' }}> ▸ </span><span style={{ color: '#0d1326', fontWeight: 700 }}>Voucher</span>
        </div>
        <div style={cardStyle}><VoucherEditor voucherId={voucher.id} cur="₹" onBack={() => setVoucher(null)} /></div>
      </div>
    );
  }

  return (
    <div style={{ padding: 18, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #e1e3ec' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: '#0d1326', fontWeight: 700 }}>Inter-Branch Elimination Report</h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#5a6691' }}>Group consolidation · Inter-Branch Sundry Debtors ⇄ Sundry Creditors · reconciled & auto-eliminated</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 11, color: '#5a6691', fontWeight: 600 }}>From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...xBtn, cursor: 'text' }} />
          <label style={{ fontSize: 11, color: '#5a6691', fontWeight: 600 }}>To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ ...xBtn, cursor: 'text' }} />
          <button onClick={() => window.print()} style={xBtn}>📄 PDF</button>
          <button onClick={() => window.print()} style={xBtn}>🖨 Print</button>
          <button onClick={doExcel} style={xBtn}>📊 Excel</button>
          <button onClick={doCsv} style={xBtn}>📋 CSV</button>
        </div>
      </div>

      {/* Dashboard summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 14 }}>
        {[
          { l: 'Total Receivables', v: totals.totalRec, c: '#185FA5', bg: '#E6F1FB' },
          { l: 'Total Payables', v: totals.totalPay, c: '#854F0B', bg: '#FAEEDA' },
          { l: 'Total Eliminated', v: totals.totalElim, c: '#1D9E75', bg: '#EAF3DE' },
          { l: 'Unmatched Receivables', v: totals.unmatchedRec, c: '#A32D2D', bg: '#FCEBEB' },
          { l: 'Unmatched Payables', v: totals.unmatchedPay, c: '#A32D2D', bg: '#FCEBEB' },
          { l: 'Net Difference', v: totals.netDiff, c: Math.abs(totals.netDiff) < 1 ? '#1D9E75' : '#A32D2D', bg: Math.abs(totals.netDiff) < 1 ? '#EAF3DE' : '#FCEBEB' },
        ].map((k, i) => (
          <div key={i} style={{ ...cardStyle, borderTop: `3px solid ${k.c}`, background: k.bg }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: k.c, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{k.l}</p>
            <p style={{ margin: '4px 0 0', fontSize: 19, fontWeight: 800, color: '#0d1326' }}>{fmtINR(k.v)}</p>
          </div>
        ))}
      </div>

      {/* Validation banner */}
      {hasData && (
        <div style={{ ...cardStyle, marginBottom: 14, borderLeft: `4px solid ${Math.abs(totals.netDiff) < 1 && totals.unmatchedRec < 1 && totals.unmatchedPay < 1 ? '#1D9E75' : '#A32D2D'}`, background: Math.abs(totals.netDiff) < 1 && totals.unmatchedRec < 1 && totals.unmatchedPay < 1 ? '#f4faf0' : '#fdf3f3' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: Math.abs(totals.netDiff) < 1 && totals.unmatchedRec < 1 && totals.unmatchedPay < 1 ? '#27500A' : '#A32D2D' }}>
            {Math.abs(totals.netDiff) < 1 && totals.unmatchedRec < 1 && totals.unmatchedPay < 1
              ? '✔ All inter-branch balances reconcile — receivables fully match payables. Safe to eliminate on consolidation.'
              : `⚠ ${fmtINR(Math.abs(totals.netDiff))} net difference · ${fmtINR(totals.unmatchedRec)} unmatched receivables · ${fmtINR(totals.unmatchedPay)} unmatched payables. Resolve before signing off group accounts.`}
          </p>
        </div>
      )}

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={() => setView('summary')} style={tBtn(view === 'summary')}>Summary</button>
        <button onClick={() => setView('detailed')} style={tBtn(view === 'detailed')}>Detailed</button>
      </div>

      {loading && <div style={{ ...cardStyle, textAlign: 'center', color: '#5a6691', padding: 28 }}>Loading inter-branch ledgers…</div>}

      {!loading && !hasData && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 36 }}>
          <p style={{ margin: 0, fontSize: 32 }}>🏢↔🏢</p>
          <p style={{ margin: '8px 0 4px', fontSize: 14, fontWeight: 700, color: '#0d1326' }}>No inter-branch ledgers found for this period</p>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5a6691', maxWidth: 620, marginInline: 'auto', lineHeight: 1.6 }}>
            This report reconciles ledgers under <b>Sundry Debtors</b> &amp; <b>Sundry Creditors</b> whose names mark them as inter-branch control accounts
            (e.g. <i>"Inter-Branch — Nairobi"</i>, <i>"BOM Branch A/c"</i>, <i>"Due to DAR"</i>). Create those ledgers and post the inter-branch journals,
            then the receivable in one branch and the payable in its counter-branch will appear here, match up, and eliminate automatically.
          </p>
        </div>
      )}

      {!loading && hasData && view === 'summary' && (
        <SummaryView branchSummary={branchSummary} receivables={receivables} payables={payables} />
      )}

      {!loading && hasData && view === 'detailed' && (
        <DetailedView
          receivables={receivables} payables={payables}
          open={open} setOpen={setOpen}
          from={from} to={to} onVoucher={setVoucher}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SUMMARY VIEW — branch-wise totals + ledger-wise receivables / payables
   ════════════════════════════════════════════════════════════════════ */
function SummaryView({ branchSummary, receivables, payables }) {
  return (
    <>
      {/* Branch-wise totals */}
      <div style={{ ...cardStyle, marginBottom: 14 }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#0d1326' }}>Branch-wise Summary</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead><tr>
              <th style={RPT_thStyle}>Branch</th>
              <th style={{ ...RPT_thStyle, textAlign: 'right' }}>Receivables</th>
              <th style={{ ...RPT_thStyle, textAlign: 'right' }}>Payables</th>
              <th style={{ ...RPT_thStyle, textAlign: 'right' }}>Eliminated</th>
              <th style={{ ...RPT_thStyle, textAlign: 'right' }}>Net</th>
            </tr></thead>
            <tbody>
              {branchSummary.map((b) => (
                <tr key={b.branch}>
                  <td style={{ ...RPT_tdStyle, fontWeight: 600 }}>{brName(b.branch)}</td>
                  <td style={{ ...RPT_tdStyle, textAlign: 'right', color: '#185FA5' }}>{fmtINR(b.rec)}</td>
                  <td style={{ ...RPT_tdStyle, textAlign: 'right', color: '#854F0B' }}>{fmtINR(b.pay)}</td>
                  <td style={{ ...RPT_tdStyle, textAlign: 'right', color: '#1D9E75' }}>{fmtINR(b.elim)}</td>
                  <td style={{ ...RPT_tdStyle, textAlign: 'right', fontWeight: 700, color: Math.abs(b.rec - b.pay) < 1 ? '#1D9E75' : '#A32D2D' }}>{fmtINR(b.rec - b.pay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <LedgerTable title="Inter-Branch Receivables" side="receivable" rows={receivables} amountLabel="Debit Amount" amountKey="debit" />
      <LedgerTable title="Inter-Branch Payables" side="payable" rows={payables} amountLabel="Credit Amount" amountKey="credit" />
    </>
  );
}

function LedgerTable({ title, side, rows, amountLabel, amountKey }) {
  const accent = side === 'receivable' ? '#185FA5' : '#854F0B';
  const totAmt = rows.reduce((s, r) => s + (r[amountKey] || 0), 0);
  const totOut = rows.reduce((s, r) => s + (r.outstanding || 0), 0);
  return (
    <div style={{ ...cardStyle, marginBottom: 14 }}>
      <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: accent }}>{title} <span style={{ color: '#5a6691', fontWeight: 500 }}>· {rows.length} ledgers</span></p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead><tr>
            <th style={RPT_thStyle}>Branch</th>
            <th style={RPT_thStyle}>Counter Branch</th>
            <th style={RPT_thStyle}>Ledger</th>
            <th style={{ ...RPT_thStyle, textAlign: 'right' }}>{amountLabel}</th>
            <th style={{ ...RPT_thStyle, textAlign: 'right' }}>Outstanding</th>
            <th style={RPT_thStyle}>Status</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} style={{ ...RPT_tdStyle, textAlign: 'center', color: '#5a6691' }}>None</td></tr>}
            {rows.map((r) => (
              <tr key={r.ledger}>
                <td style={{ ...RPT_tdStyle, fontWeight: 600 }}>{r.owning ? brName(r.owning) : '—'}</td>
                <td style={RPT_tdStyle}>{r.counterCode ? brName(r.counterCode) : '—'}</td>
                <td style={RPT_tdStyle}>{r.ledger}</td>
                <td style={{ ...RPT_tdStyle, textAlign: 'right' }}>{fmtINR(r[amountKey])}</td>
                <td style={{ ...RPT_tdStyle, textAlign: 'right', fontWeight: 700, color: accent }}>{fmtINR(r.outstanding)}</td>
                <td style={RPT_tdStyle}><Badge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && <tfoot><tr style={{ background: '#0d1326' }}>
            <td colSpan={3} style={{ padding: '9px 12px', fontWeight: 700, color: '#d4a437' }}>TOTAL</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#fff' }}>{fmtINR(totAmt)}</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#d4a437' }}>{fmtINR(totOut)}</td>
            <td />
          </tr></tfoot>}
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   DETAILED VIEW — ledger rows expand to voucher-wise postings (drill-down)
   Report ▸ Branch ▸ Ledger ▸ Voucher ▸ Voucher View/Edit
   ════════════════════════════════════════════════════════════════════ */
function DetailedView({ receivables, payables, open, setOpen, from, to, onVoucher }) {
  return (
    <>
      <DetailGroup title="Inter-Branch Receivables (Sundry Debtors)" accent="#185FA5" side="receivable" rows={receivables} open={open} setOpen={setOpen} from={from} to={to} onVoucher={onVoucher} />
      <DetailGroup title="Inter-Branch Payables (Sundry Creditors)" accent="#854F0B" side="payable" rows={payables} open={open} setOpen={setOpen} from={from} to={to} onVoucher={onVoucher} />
    </>
  );
}

function DetailGroup({ title, accent, side, rows, open, setOpen, from, to, onVoucher }) {
  return (
    <div style={{ ...cardStyle, marginBottom: 14 }}>
      <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: accent }}>{title}</p>
      {rows.length === 0 && <p style={{ margin: 0, fontSize: 11.5, color: '#5a6691' }}>No inter-branch {side}s this period.</p>}
      {rows.map((r) => {
        const key = `${side}:${r.ledger}`;
        const isOpen = open === key;
        return (
          <div key={r.ledger} style={{ border: '1px solid #eef1f6', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
            <div onClick={() => setOpen(isOpen ? '' : key)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', cursor: 'pointer', background: isOpen ? '#f7f8fb' : '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ color: '#b9bed4', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▸</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#0d1326' }}>{r.ledger}</p>
                  <p style={{ margin: '1px 0 0', fontSize: 10, color: '#5a6691' }}>{r.owning ? brName(r.owning) : '—'} <span style={{ color: '#b9bed4' }}>→</span> {r.counterCode ? brName(r.counterCode) : '—'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums' }}>{fmtINR(r.outstanding)}</span>
                <Badge status={r.status} />
              </div>
            </div>
            {isOpen && <IBLedgerDrill ledger={r.ledger} status={r.status} from={from} to={to} onVoucher={onVoucher} />}
          </div>
        );
      })}
    </div>
  );
}

// Voucher-wise drill for ONE ledger — live ledger statement (own hook instance).
function IBLedgerDrill({ ledger, status, from, to, onVoucher }) {
  const q = useLedgerStatement(ledger, undefined, { from, to });
  const d = q.data;
  const lines = d?.lines || [];
  if (q.isLoading) return <div style={{ padding: 16, fontSize: 11.5, color: '#5a6691' }}>Loading postings…</div>;
  if (q.isError) return <div style={{ padding: 16, fontSize: 11.5, color: '#A32D2D' }}>⚠ {q.error?.message || 'Could not load postings'}</div>;
  return (
    <div style={{ overflowX: 'auto', borderTop: '1px solid #eef1f6' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead><tr style={{ background: '#f3f4f8' }}>
          {['Date', 'Voucher', 'Narration', 'Reference', 'Dr', 'Cr', 'Balance', 'Status'].map((h, i) => (
            <th key={i} style={{ padding: '7px 10px', textAlign: i >= 4 && i <= 6 ? 'right' : 'left', color: '#5a6691', fontWeight: 700, fontSize: 9.5, whiteSpace: 'nowrap' }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {lines.length === 0 && <tr><td colSpan={8} style={{ padding: 18, textAlign: 'center', color: '#5a6691' }}>No postings in range.</td></tr>}
          {lines.map((e, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f8' }}>
              <td style={{ padding: '7px 10px', color: '#5a6691', whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</td>
              <td style={{ padding: '7px 10px' }}>
                {e.voucherId
                  ? <button onClick={() => onVoucher({ id: e.voucherId })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#185FA5', fontWeight: 700, fontFamily: 'monospace', fontSize: 10, padding: 0 }}>{e.vno || '(view)'}</button>
                  : <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#5a6691' }}>{e.vno}</span>}
              </td>
              <td style={{ padding: '7px 10px', color: '#384677' }}>{e.narration || e.party || e.category || '—'}</td>
              <td style={{ padding: '7px 10px', color: '#5a6691', fontFamily: 'monospace', fontSize: 10 }}>{e.party || '—'}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', color: e.debit > 0 ? '#185FA5' : '#cfd3e2', fontVariantNumeric: 'tabular-nums' }}>{e.debit > 0 ? fmtINR(e.debit) : '—'}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', color: e.credit > 0 ? '#A32D2D' : '#cfd3e2', fontVariantNumeric: 'tabular-nums' }}>{e.credit > 0 ? fmtINR(e.credit) : '—'}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: e.balanceSide === 'Cr' ? '#A32D2D' : '#185FA5', fontVariantNumeric: 'tabular-nums' }}>{fmtINR(Math.abs(e.balance))} {e.balanceSide}</td>
              <td style={{ padding: '7px 10px' }}><Badge status={status === 'Matched' ? 'Eliminated' : status} /></td>
            </tr>
          ))}
        </tbody>
        {d && <tfoot><tr style={{ background: '#fafbfd', borderTop: '1px solid #e1e3ec' }}>
          <td colSpan={4} style={{ padding: '7px 10px', fontWeight: 700, color: '#0d1326' }}>Closing</td>
          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700 }}>{fmtINR(d.totalDebit)}</td>
          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700 }}>{fmtINR(d.totalCredit)}</td>
          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: d.closingSide === 'Cr' ? '#A32D2D' : '#185FA5' }}>{fmtINR(d.closingBalance)} {d.closingSide}</td>
          <td />
        </tr></tfoot>}
      </table>
    </div>
  );
}
