// ───────────────────────────────────────────────────────────────────────────
// Shared Print / PDF / Export-to-Excel actions for ANY ledger-statement view.
//
// Every ledger screen in the app (Ledger A/c, the Trial-Balance & P&L drill,
// the Fiori ledger modal, the BSP supplier ledger…) renders the SAME shape
// returned by the accounting `/ledger/:name` endpoint (useLedgerStatement):
//
//   d = { ledger, group, openingBalance, openingSide, closingBalance,
//         closingSide, totalDebit, totalCredit,
//         lines: [{ date, vno, narration, party, category, particulars,
//                   debit, credit, balance, balanceSide }] }
//
// Drop <LedgerActions d=… /> into the screen's toolbar to get all three
// options. Print / PDF open the unified in-app A4 preview in PORTRAIT.
// ───────────────────────────────────────────────────────────────────────────
import React from 'react';
import { exportToExcel } from './exportExcel';
import { openPrintPreview } from './PrintPreview';

const DARK = '#0d1326', GOLD = '#d4a437';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// Best-effort "Particulars" text for a posting line. Each screen labels the
// contra account slightly differently; this covers all the shapes in use.
export function ledgerParticulars(ln) {
  const ps = ln.particulars;
  if (Array.isArray(ps) && ps.length) {
    const names = ps.map((p) => (p && p.ledger) || p).filter(Boolean);
    if (names.length) return names.length === 1 ? String(names[0]) : `${names[0]} (+${names.length - 1} more)`;
  }
  return ln.narration || ln.party || ln.category || '';
}

const hasLines = (d) => !!(d && Array.isArray(d.lines) && d.lines.length);

// ── Export to Excel: opening row → every posting → closing total ──────────────
export function exportLedgerExcel(d, { branchLabel = '', particulars = ledgerParticulars } = {}) {
  if (!d) return;
  const cols = [
    { key: 'date', label: 'Date' }, { key: 'vno', label: 'Voucher' }, { key: 'particulars', label: 'Particulars' },
    { key: 'category', label: 'Type' }, { key: 'debit', label: 'Debit' }, { key: 'credit', label: 'Credit' },
    { key: 'balance', label: 'Balance' }, { key: 'side', label: 'Dr/Cr' },
  ];
  const rows = [
    { particulars: 'Opening Balance', balance: Math.abs(d.openingBalance || 0), side: d.openingSide || '' },
    ...(d.lines || []).map((e) => ({
      date: e.date, vno: e.vno, particulars: particulars(e), category: e.category || '',
      debit: e.debit || 0, credit: e.credit || 0, balance: Math.abs(e.balance || 0), side: e.balanceSide || '',
    })),
    { particulars: `Closing Balance — ${d.ledger || ''}`.trim(), debit: d.totalDebit || 0, credit: d.totalCredit || 0, balance: Math.abs(d.closingBalance || 0), side: d.closingSide || '' },
  ];
  exportToExcel(`ledger-${d.ledger || 'statement'}${branchLabel ? '-' + branchLabel : ''}`, cols, rows);
}

// ── Print / Save-as-PDF: portrait A4 via the shared in-app preview ────────────
export function printLedgerStatement(d, { cur = '₹', branchLabel = '', from = '', to = '', particulars = ledgerParticulars } = {}) {
  if (!d) return;
  const fmt = (n) => { const v = Math.round(Number(n) || 0); return v ? cur + v.toLocaleString('en-IN') : ''; };
  const period = (from || to) ? `${from || '…'} to ${to || '…'}` : 'All dates';
  const body = (d.lines || []).map((e) => `<tr>
    <td>${esc(e.date)}</td>
    <td class="mono">${esc(e.vno)}</td>
    <td>${esc(particulars(e))}</td>
    <td class="r">${fmt(e.debit)}</td>
    <td class="r">${fmt(e.credit)}</td>
    <td class="r b">${fmt(Math.abs(e.balance || 0))} ${esc(e.balanceSide || '')}</td>
  </tr>`).join('');
  const html = `<style>
    .lg{font-family:'Segoe UI',Arial,sans-serif;color:#0d1326}
    .lg h1{font-size:16px;margin:0 0 2px}
    .lg .meta{font-size:10px;color:#5a6691;margin:0 0 10px}
    .lg .op{display:flex;justify-content:space-between;font-size:10.5px;background:#f3f4f8;border:1px solid #e1e3ec;padding:6px 9px;margin-bottom:6px}
    .lg table{width:100%;border-collapse:collapse;font-size:10px}
    .lg th{background:#0d1326;color:#d4a437;text-align:left;padding:6px 8px;font-size:9.5px}
    .lg th.r,.lg td.r{text-align:right}
    .lg td{padding:5px 8px;border-bottom:1px solid #eceef4}
    .lg td.mono{font-family:'Courier New',monospace;font-size:9px;color:#185FA5}
    .lg td.b{font-weight:700}
    .lg tfoot td{background:#0d1326;color:#fff;font-weight:800;border-top:2px solid #d4a437}
    .lg tfoot td.gold{color:#d4a437}
  </style>
  <div class="lg">
    <h1>Ledger Account — ${esc(d.ledger || '')}</h1>
    <p class="meta">${esc(d.group || '')}${d.group ? ' · ' : ''}${esc(branchLabel)}${branchLabel ? ' · ' : ''}${esc(period)}</p>
    <div class="op"><span>Opening Balance: ${fmt(d.openingBalance)} ${esc(d.openingSide || '')}</span>
      <span>Closing Balance: ${fmt(d.closingBalance)} ${esc(d.closingSide || '')}</span></div>
    <table>
      <thead><tr><th>Date</th><th>Voucher</th><th>Particulars</th><th class="r">Debit</th><th class="r">Credit</th><th class="r">Balance</th></tr></thead>
      <tbody>${body || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#5a6691">No postings in range.</td></tr>'}</tbody>
      <tfoot><tr>
        <td colspan="3" class="gold">CLOSING — ${esc(d.ledger || '')}</td>
        <td class="r">${fmt(d.totalDebit)}</td>
        <td class="r gold">${fmt(d.totalCredit)}</td>
        <td class="r">${fmt(d.closingBalance)} ${esc(d.closingSide || '')}</td>
      </tr></tfoot>
    </table>
  </div>`;
  openPrintPreview({ title: `Ledger — ${d.ledger || 'Statement'}`, recommend: 'portrait', html });
}

// ── Toolbar button group: 🖨 Print · 📄 PDF · 📤 Excel ────────────────────────
// variant 'light' (default) suits white toolbars; 'dark' suits the dark
// gold-on-navy report headers (BSP ledger, embedded drills).
export function LedgerActions({ d, cur, branchLabel = '', from = '', to = '', particulars = ledgerParticulars, variant = 'light' }) {
  const disabled = !hasLines(d);
  const dark = variant === 'dark';
  const btn = {
    padding: '6px 11px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
    border: dark ? '1px solid #2a3556' : '1px solid #d6dbe6',
    background: dark ? 'rgba(255,255,255,0.08)' : '#fff',
    color: dark ? '#e7ecfb' : DARK,
  };
  const doPrint = () => printLedgerStatement(d, { cur, branchLabel, from, to, particulars });
  const doExcel = () => exportLedgerExcel(d, { branchLabel, particulars });
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      <button type="button" onClick={doPrint} disabled={disabled} title="Print (portrait A4)" style={btn}>🖨 Print</button>
      <button type="button" onClick={doPrint} disabled={disabled} title="Save as PDF (portrait A4)" style={btn}>📄 PDF</button>
      <button type="button" onClick={doExcel} disabled={disabled} title="Export to Excel" style={btn}>📤 Excel</button>
    </span>
  );
}
