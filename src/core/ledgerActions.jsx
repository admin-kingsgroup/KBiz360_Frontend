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
import { printLedgerUI } from './ledgerUI';

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

// ── Print / Save-as-PDF: the UNIFIED ledger template (screen == paper) ────────
// Delegates to the single source of truth in ledgerUI so every screen prints the
// exact same Tally-style ledger it shows. `bills` (optional) prints bill-wise.
export function printLedgerStatement(d, { cur = '₹', branchLabel = '', from = '', to = '', bills = [], view = 'ledger', showNarr = false, showDetail = false } = {}) {
  if (!d) return;
  printLedgerUI({ d, bills, view, group: d.group, cur, branchLabel, from, to, showNarr, showDetail });
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
