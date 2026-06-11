/* ════════════════════════════════════════════════════════════════════════
   NOTES TO FINANCIAL STATEMENTS  (live, auto-generated)

   Replaces the old static blank RPT_FSNotes. The schedule is generated from the
   live double-entry engine and reconciles to the financial statements by
   construction (see ./notesEngine.js):

     Balance Sheet   GET /api/accounting/balance-sheet   → BS notes (1-7, 11-12)
     Profit & Loss   GET /api/accounting/profit-and-loss → P&L notes (8-10, 13)
     Trial Balance   GET /api/accounting/trial-balance   → opening→closing movement
     Ageing          GET /api/accounting/ageing          → Trade AR/AP ageing

   Features: FY / YTD / Quarter / Month / All period filters, Summary ⇄ Detailed
   views, expand/collapse hierarchy (Note → Group → Sub-group → Ledger → Voucher),
   a reconciliation panel vs TB/P&L/BS, and Excel + Print export.
   ════════════════════════════════════════════════════════════════════════ */
import React, { useMemo, useState } from 'react';
import { card, bc, RPT_thStyle, RPT_tdStyle } from '../core/styles';
import { fmtINR } from '../core/format';
import { CUR_FY, CUR_QUARTER, CUR_MONTH, MONTH_OPTIONS, todayISO, monthLabel, fyOptions, fyRange, fmtDate } from '../core/dates';
import { useBalanceSheet, useProfitAndLoss, useTrialBalance, useAgeing, useLedgerStatement } from '../core/useAccounting';
import { VoucherEditor } from './accountingLive';
import { exportToExcel } from '../core/exportExcel';
import { buildNotes } from './notesEngine';
import { PeriodBar, periodRange } from '../core/period';

const INK = '#0d1326', GOLD = '#d4a437', MUTE = '#5a6691', LINE = '#e1e3ec';
const OK = '#1D9E75', WARN = '#A32D2D';
const cell = (v) => { const x = Math.round(Number(v) || 0); return x ? x.toLocaleString('en-IN') : '—'; };
const ctrl = { padding: '7px 10px', border: `1px solid ${LINE}`, borderRadius: 6, fontSize: 11.5, background: '#fff', color: INK, cursor: 'pointer', fontWeight: 600 };

function lastDayISO(ym) { const [y, m] = String(ym).split('-').map(Number); const last = new Date(y, m, 0).getDate(); return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`; }
function periodOf(mode, fy, month) {
  if (mode === 'fy') { const r = fyRange(fy); return { from: r.from, to: r.to, label: `FY ${fy}` }; }
  if (mode === 'ytd') return { from: CUR_FY.startISO, to: todayISO(), label: `YTD · FY ${CUR_FY.label}` };
  if (mode === 'quarter') return { from: CUR_QUARTER.startISO, to: CUR_QUARTER.endISO, label: CUR_QUARTER.label };
  if (mode === 'month') return { from: `${month}-01`, to: lastDayISO(month), label: monthLabel(month) };
  return { from: '', to: '', label: 'All periods · since inception' };
}
const branchLabel = (branch) => (!branch || branch === 'ALL' ? 'All branches — Consolidated' : (branch.code || branch));

const EXPORT_COLS = [
  { key: 'note', label: 'Note' }, { key: 'section', label: 'Section' }, { key: 'group', label: 'Group' },
  { key: 'subGroup', label: 'Sub-Group' }, { key: 'ledger', label: 'Ledger' },
  { key: 'opening', label: 'Opening' }, { key: 'additions', label: 'Additions' },
  { key: 'withdrawals', label: 'Withdrawals/Deductions' }, { key: 'closing', label: 'Closing/Amount' },
];
function notesToRows(notes) {
  const out = [];
  for (const n of notes) for (const g of n.groups) {
    const emit = (l, sg) => out.push({
      note: `${n.no} — ${n.title}`, section: n.section, group: g.group, subGroup: sg || '', ledger: l.ledger,
      opening: Math.round(l.opening || 0), additions: Math.round(l.additions || 0),
      withdrawals: Math.round(l.withdrawals || 0), closing: Math.round(l.closing ?? l.amount ?? 0),
    });
    g.subGroups.forEach((sg) => sg.ledgers.forEach((l) => emit(l, sg.name)));
    g.direct.forEach((l) => emit(l, ''));
  }
  return out;
}

/* ── reconciliation panel ─────────────────────────────────────────────── */
function ReconRow({ label, line, cur }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: line.ok ? OK : WARN, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{line.ok ? '✓' : '!'}</span>
      <span style={{ minWidth: 150, color: MUTE, fontWeight: 600 }}>{label}</span>
      <span style={{ color: INK }}>Notes <strong>{cur}{cell(line.notes)}</strong> {line.ok ? '=' : '≠'} Statement <strong>{cur}{cell(line.statement)}</strong>{!line.ok && <span style={{ color: WARN, marginLeft: 6 }}>(Δ {cur}{cell(line.diff)})</span>}</span>
    </div>
  );
}
function ReconPanel({ recon, cur }) {
  const allOk = recon.assets.ok && recon.liabilities.ok && recon.income.ok && recon.expenses.ok && recon.balanced !== false;
  return (
    <div style={{ ...card, borderLeft: `4px solid ${allOk ? OK : WARN}`, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: INK }}>Reconciliation — every note ties back to the statements</p>
        <span style={{ fontSize: 11, fontWeight: 700, color: allOk ? OK : WARN }}>{allOk ? '✓ All schedules reconcile' : '⚠ Review highlighted differences'}{recon.balanced != null && ` · Balance Sheet ${recon.balanced ? 'balanced' : 'OUT OF BALANCE'}`}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 8 }}>
        {recon.hasBs && <ReconRow label="Total Assets" line={recon.assets} cur={cur} />}
        {recon.hasBs && <ReconRow label="Total Equity & Liabilities" line={recon.liabilities} cur={cur} />}
        {recon.hasPl && <ReconRow label="Total Income" line={recon.income} cur={cur} />}
        {recon.hasPl && <ReconRow label="Total Expenses" line={recon.expenses} cur={cur} />}
      </div>
      {recon.hasPl && (
        <p style={{ margin: '10px 0 0', fontSize: 11, color: MUTE }}>
          Net Profit per notes <strong style={{ color: INK }}>{cur}{cell(recon.netProfit.notes)}</strong> · per P&amp;L A/c <strong style={{ color: INK }}>{cur}{cell(recon.netProfit.plStatement)}</strong>
          {recon.hasBs && <> · carried to Balance Sheet <strong style={{ color: INK }}>{cur}{cell(recon.netProfit.bsStatement)}</strong></>}
        </p>
      )}
    </div>
  );
}

/* ── ageing block embedded in Trade Receivables / Payables notes ──────── */
const AGE_BUCKETS = [['d0', '0–30', OK], ['d30', '31–60', GOLD], ['d60', '61–90', '#e9730c'], ['d90', '90+', WARN]];
function AgeingBlock({ ageing, cur, onDrill }) {
  const t = ageing.totals || {};
  const rows = (ageing.rows || []).filter((r) => (r.total || 0) !== 0);
  return (
    <div style={{ margin: '10px 0', padding: 10, background: '#fafbfd', border: `1px solid ${LINE}`, borderRadius: 6 }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: MUTE, textTransform: 'uppercase', letterSpacing: 0.4 }}>Ageing Analysis</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 6, marginBottom: 10 }}>
        {AGE_BUCKETS.map(([k, lbl, c]) => (
          <div key={k} style={{ border: `1px solid ${LINE}`, borderRadius: 5, padding: '6px 8px', background: '#fff' }}>
            <p style={{ margin: 0, fontSize: 9.5, color: MUTE, fontWeight: 700 }}>{lbl} days</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: c }}>{cur}{cell(t[k])}</p>
          </div>
        ))}
      </div>
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead><tr><th style={RPT_thStyle}>Party</th>{AGE_BUCKETS.map(([, l]) => <th key={l} style={{ ...RPT_thStyle, textAlign: 'right' }}>{l}</th>)}<th style={{ ...RPT_thStyle, textAlign: 'right' }}>Total</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.party + i} onClick={() => onDrill(r.party)} style={{ cursor: 'pointer' }}>
                <td style={{ ...RPT_tdStyle, fontWeight: 600 }}>{r.party} <span style={{ color: GOLD }}>›</span></td>
                {AGE_BUCKETS.map(([k, , c]) => <td key={k} style={{ ...RPT_tdStyle, textAlign: 'right', color: r[k] ? c : '#b8bdd0' }}>{cell(r[k])}</td>)}
                <td style={{ ...RPT_tdStyle, textAlign: 'right', fontWeight: 700 }}>{cell(r.total)}</td>
              </tr>
            ))}
            <tr style={{ background: INK, color: GOLD, fontWeight: 700 }}>
              <td style={{ padding: '8px 12px' }}>TOTAL</td>
              {AGE_BUCKETS.map(([k]) => <td key={k} style={{ padding: '8px 12px', textAlign: 'right' }}>{cell(t[k])}</td>)}
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{cell(t.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── one note's group→subgroup→ledger table ───────────────────────────── */
function NoteTable({ note, cur, openG, toggleG, detailed, onDrill }) {
  const cols = note.kind === 'movement'
    ? ['Opening', 'Additions', note.no === 6 ? 'Deductions / Depn' : 'Withdrawals', 'Closing']
    : note.kind === 'flow' ? ['Amount'] : ['Closing'];
  const vals = (l) => note.kind === 'movement'
    ? [l.opening, l.additions, l.withdrawals, l.closing]
    : note.kind === 'flow' ? [l.amount ?? l.closing] : [l.closing];
  const multi = note.groups.length > 1;
  const ledgerRow = (l, indent, sg) => (
    <tr key={`${sg}-${l.ledger}`} onClick={() => onDrill(l.ledger)} style={{ cursor: 'pointer' }}>
      <td style={{ ...RPT_tdStyle, paddingLeft: indent }}>{l.ledger}{sg ? <span style={{ color: MUTE, fontSize: 10 }}> · {sg}</span> : null} <span style={{ color: GOLD }}>›</span></td>
      {vals(l).map((v, i) => <td key={i} style={{ ...RPT_tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{cell(v)}</td>)}
    </tr>
  );
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr><th style={RPT_thStyle}>Group / Sub-group / Ledger</th>{cols.map((c) => <th key={c} style={{ ...RPT_thStyle, textAlign: 'right' }}>{c} ({cur})</th>)}</tr></thead>
        <tbody>
          {note.groups.map((g) => {
            const gk = `${note.no}:${g.group}`;
            const gOpen = detailed || openG[gk] !== false; // default open
            const span = (
              <React.Fragment key={gk}>
                {multi && (
                  <tr onClick={() => toggleG(gk)} style={{ background: '#f2f4fa', cursor: 'pointer', fontWeight: 700 }}>
                    <td style={{ ...RPT_tdStyle, color: INK }}>{gOpen ? '▾' : '▸'} {g.group}</td>
                    {cols.map((c, i) => <td key={i} style={{ ...RPT_tdStyle, textAlign: 'right', color: INK }}>{i === cols.length - 1 ? cell(g.total) : ''}</td>)}
                  </tr>
                )}
                {gOpen && g.subGroups.map((sg) => (
                  <React.Fragment key={sg.name}>
                    <tr style={{ background: '#f8f9fc' }}>
                      <td style={{ ...RPT_tdStyle, paddingLeft: 26, color: MUTE, fontWeight: 600 }}>{sg.name} <span style={{ fontSize: 10 }}>· {sg.ledgers.length} ledger{sg.ledgers.length > 1 ? 's' : ''}</span></td>
                      {cols.map((c, i) => <td key={i} style={{ ...RPT_tdStyle, textAlign: 'right', color: MUTE, fontWeight: 600 }}>{i === cols.length - 1 ? cell(sg.total) : ''}</td>)}
                    </tr>
                    {sg.ledgers.map((l) => ledgerRow(l, 40, sg.name))}
                  </React.Fragment>
                ))}
                {gOpen && g.direct.map((l) => ledgerRow(l, multi ? 26 : 16, ''))}
              </React.Fragment>
            );
            return span;
          })}
          <tr style={{ background: INK, color: GOLD, fontWeight: 700 }}>
            <td style={{ padding: '9px 12px' }}>TOTAL — Note {note.no}</td>
            {cols.map((c, i) => <td key={i} style={{ padding: '9px 12px', textAlign: 'right' }}>{i === cols.length - 1 ? `${cur}${cell(note.total)}` : ''}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ── ledger → voucher drill modal ─────────────────────────────────────── */
function DrillModal({ ledger, branch, to, cur, onClose }) {
  const [vid, setVid] = useState(null);
  const q = useLedgerStatement(ledger, branch, { to });
  const lines = q.data?.lines || [];
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 10, width: 'min(720px,100%)', maxHeight: '86vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${LINE}`, position: 'sticky', top: 0, background: '#fff' }}>
          <strong style={{ color: INK, fontSize: 14 }}>{vid ? 'Voucher' : ledger}</strong>
          <button onClick={onClose} style={{ ...ctrl, padding: '4px 9px' }}>✕ Close</button>
        </div>
        <div style={{ padding: 14 }}>
          {vid ? <VoucherEditor voucherId={vid} cur={cur} onBack={() => setVid(null)} /> : (
            <>
              {q.isLoading && <div style={{ padding: 20, textAlign: 'center', color: MUTE }}>Loading ledger…</div>}
              {q.isError && <div style={{ padding: 14, color: WARN, fontSize: 12 }}>⚠ {q.error?.message}</div>}
              {!q.isLoading && !lines.length && <div style={{ padding: 20, textAlign: 'center', color: MUTE, fontSize: 12 }}>No postings for this period.</div>}
              {lines.map((ln, i) => (
                <div key={i} onClick={() => ln.voucherId && setVid(ln.voucherId)} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 10px', borderBottom: `1px solid ${LINE}`, cursor: ln.voucherId ? 'pointer' : 'default' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: GOLD, fontWeight: 600, fontSize: 12 }}>{ln.vno} <span style={{ color: MUTE, fontWeight: 400 }}>· {fmtDate(ln.date)}</span></div>
                    <div style={{ fontSize: 11, color: MUTE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ln.narration || ln.party || ln.category}</div>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: ln.debit ? '#0070f2' : WARN }}>{ln.debit ? `Dr ${cell(ln.debit)}` : `Cr ${cell(ln.credit)}`}</div>
                    {ln.voucherId ? <div style={{ fontSize: 10, color: MUTE }}>open ›</div> : null}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── main report ──────────────────────────────────────────────────────── */
export function NotesToFinancials({ branch }) {
  const cur = (bc(branch) && bc(branch).cur) || '₹';
  const [range, setRange] = useState(() => periodRange('all', { branch }));
  const [view, setView] = useState('summary');
  const [open, setOpen] = useState({});
  const [openG, setOpenG] = useState({});
  const [drill, setDrill] = useState(null);

  const period = range;
  const { from, to } = period;
  const detailed = view === 'detailed';

  const qBs = useBalanceSheet(branch, { to });
  const qPl = useProfitAndLoss(branch, { from, to });
  const qTb = useTrialBalance(branch, { from, to });
  const qAg = useAgeing(branch);

  const { notes, recon } = useMemo(
    () => buildNotes({ bs: qBs.data, pl: qPl.data, tb: qTb.data, ageing: qAg.data }),
    [qBs.data, qPl.data, qTb.data, qAg.data],
  );

  const loading = qBs.isLoading || qPl.isLoading || qTb.isLoading;
  const err = qBs.error || qPl.error || qTb.error;
  const empty = !loading && !qBs.data && !qPl.data;

  const doExcel = () => exportToExcel(`notes-to-financials-${period.label}`.replace(/\s+/g, '-'), EXPORT_COLS, notesToRows(notes));
  const toggleG = (k) => setOpenG((s) => ({ ...s, [k]: s[k] === false ? true : false }));
  const isOpen = (no) => detailed || !!open[no];

  return (
    <div style={{ padding: 18, maxWidth: 1280, margin: '0 auto' }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${LINE}` }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: INK }}>Notes to Financial Statements</h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: MUTE }}><strong>{branchLabel(branch)}</strong> · {period.label} · auto-generated & reconciled to the live books · {cur} (excl. internal GST control)</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <PeriodBar branch={branch} compact defaultPreset="all" onChange={setRange} />
          <div style={{ display: 'inline-flex', border: `1px solid ${LINE}`, borderRadius: 6, overflow: 'hidden' }}>
            {[['summary', 'Summary'], ['detailed', 'Detailed']].map(([id, l]) => (
              <button key={id} onClick={() => setView(id)} style={{ ...ctrl, border: 'none', borderRadius: 0, background: view === id ? INK : '#fff', color: view === id ? '#fff' : MUTE }}>{l}</button>
            ))}
          </div>
          <button onClick={doExcel} style={ctrl}>📊 Excel</button>
          <button onClick={() => window.print()} style={ctrl}>🖨 Print / PDF</button>
        </div>
      </div>

      {loading && <div style={{ ...card, textAlign: 'center', color: MUTE, padding: 30 }}>Loading the books…</div>}
      {err && !loading && <div style={{ ...card, color: WARN, fontWeight: 600 }}>⚠ {err.message || 'Failed to load accounting data'}</div>}
      {empty && <div style={{ ...card, textAlign: 'center', color: MUTE, padding: 30 }}>No posted books for this selection yet — record vouchers to generate the notes.</div>}

      {!loading && !err && !empty && (
        <>
          <ReconPanel recon={recon} cur={cur} />

          {!notes.length && <div style={{ ...card, textAlign: 'center', color: MUTE, padding: 24 }}>No ledger balances in this period.</div>}

          {notes.map((n) => {
            const expanded = isOpen(n.no);
            return (
              <div key={n.no} style={{ ...card, marginBottom: 12, borderLeft: `3px solid ${n.section === 'Income' || n.section === 'Expenses' ? GOLD : INK}` }}>
                <div onClick={() => setOpen((s) => ({ ...s, [n.no]: !s[n.no] }))} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <span style={{ minWidth: 34, height: 34, borderRadius: '50%', background: INK, color: GOLD, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{n.no}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: INK }}>{detailed ? '' : expanded ? '▾ ' : '▸ '}{n.title}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: MUTE }}>{n.narrative}</p>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: INK }}>{fmtINR(n.total)} <span style={{ fontSize: 10, color: MUTE }}>{n.side}</span></p>
                    <span style={{ fontSize: 9.5, color: MUTE, background: '#f2f4fa', border: `1px solid ${LINE}`, borderRadius: 3, padding: '1px 6px' }}>↺ {n.reconcilesTo}</span>
                  </div>
                </div>
                {expanded && (
                  <div style={{ marginTop: 10 }}>
                    {n.ageing && <AgeingBlock ageing={n.ageing} cur={cur} onDrill={setDrill} />}
                    <NoteTable note={n} cur={cur} openG={openG} toggleG={toggleG} detailed={detailed} onDrill={setDrill} />
                  </div>
                )}
              </div>
            );
          })}

          <p style={{ fontSize: 10.5, color: MUTE, marginTop: 14, lineHeight: 1.6 }}>
            Notes are generated from the live double-entry engine and tie back to the Trial Balance, Profit &amp; Loss and Balance Sheet for the selected period. Balance-sheet figures are shown as at {to ? fmtDate(to) : 'the latest posting'}; income &amp; expense figures cover {period.label.toLowerCase()}. Click any ledger to drill into its vouchers.
          </p>
        </>
      )}

      {drill && <DrillModal ledger={drill} branch={branch} to={to} cur={cur} onClose={() => setDrill(null)} />}
    </div>
  );
}
