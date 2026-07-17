// ════════════════════════════════════════════════════════════════════════
//  NOTES-TO-FINANCIAL-STATEMENTS ENGINE  (pure — no React, no fetch)
//
//  Builds the disclosure "Notes" from the LIVE accounting statements so every
//  figure reconciles to the Balance Sheet / P&L *by construction*:
//
//   · Balance-sheet notes are built from the /balance-sheet response, which the
//     engine has already resolved to the Tally 28-group master with ledger-level
//     detail (name, amount = closing, subGroup). Summed, they equal totalAssets /
//     totalLiabilities exactly.
//   · P&L notes are built from the /profit-and-loss response (group totals that
//     net to netProfit). TB group names match P&L group names, so each group is
//     expanded to its ledgers from the trial balance.
//   · Per-ledger Opening / Additions / Withdrawals / Closing movement (Notes for
//     Capital, Reserves, Fixed Assets) is enriched from the trial balance, matched
//     by ledger name — closing stays the balance-sheet anchor.
//   · Trade Receivables / Payables notes embed the live ageing buckets + parties.
//
//  Any group without a predefined note mapping is routed to an "Other …" note by
//  nature, so the schedule is never blank as long as the books carry any data.
// ════════════════════════════════════════════════════════════════════════

import { localeOf } from '../../core/format';

const N = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const norm = (s) => String(s || '').trim().toLowerCase();

// Resolved Balance-Sheet group → { no, title }. `no` orders the schedule.
const LIAB_NOTE = (group) => {
  switch (group) {
    case 'Capital Account': return { no: 1, title: 'Share Capital / Capital Account' };
    case 'Reserves & Surplus':
    case 'Profit & Loss A/c': return { no: 2, title: 'Reserves & Surplus' };
    case 'Loans (Liability)':
    case 'Secured Loans':
    case 'Unsecured Loans':
    case 'Bank OD Accounts': return { no: 3, title: 'Loans & Borrowings' };
    case 'Sundry Creditors': return { no: 5, title: 'Trade Payables' };
    case 'Current Liabilities':
    case 'Duties & Taxes':
    case 'Provisions': return { no: 11, title: 'Other Current Liabilities & Provisions' };
    default: return { no: 90, title: 'Other Liabilities' };
  }
};
const ASSET_NOTE = (group) => {
  switch (group) {
    case 'Fixed Assets': return { no: 6, title: 'Fixed Assets' };
    case 'Sundry Debtors': return { no: 4, title: 'Trade Receivables' };
    case 'Investments': return { no: 12, title: 'Investments' };
    case 'Current Assets':
    case 'Bank Accounts':
    case 'Cash-in-Hand':
    case 'Stock-in-Hand':
    case 'Deposits (Asset)':
    case 'Loans & Advances (Asset)': return { no: 7, title: 'Cash, Bank & Other Current Assets' };
    default: return { no: 91, title: 'Other Assets' };
  }
};
const INCOME_NOTE = (group) =>
  (group === 'Sales Accounts' || group === 'Direct Income')
    ? { no: 8, title: 'Revenue from Operations' }
    : { no: 13, title: 'Other Income' };
const EXPENSE_NOTE = (group) =>
  (group === 'Purchase Accounts' || group === 'Direct Expenses' || group === 'Opening Stock')
    ? { no: 9, title: 'Direct Expenses (Cost of Services)' }
    : { no: 10, title: 'Indirect Expenses' };

// Column model per note: movement notes show Opening/Additions/Withdrawals/Closing;
// balance notes show only Closing; flow notes (P&L) show only Amount.
const KIND_OF = (no) => (no === 1 || no === 2 || no === 6 ? 'movement' : no >= 8 && no <= 13 ? 'flow' : 'balance');

// Opening / Additions / Withdrawals from the TB row, oriented to the note's side.
// `closing` is supplied by the caller (the balance-sheet anchor amount).
function movement(tbRow, side, closing) {
  if (!tbRow) return { opening: 0, additions: closing, withdrawals: 0, closing };
  const dr = (a, b) => N(a) - N(b);
  if (side === 'Dr') { // assets / expenses
    return { opening: dr(tbRow.openingDebit, tbRow.openingCredit), additions: N(tbRow.debit), withdrawals: N(tbRow.credit), closing };
  }
  return { opening: dr(tbRow.openingCredit, tbRow.openingDebit), additions: N(tbRow.credit), withdrawals: N(tbRow.debit), closing }; // liabilities / income
}

// Accumulator: fetch-or-create a note by number.
function noteOf(map, no, title, section, side, reconcilesTo) {
  if (!map.has(no)) map.set(no, { no, title, section, side, reconcilesTo, kind: KIND_OF(no), total: 0, groups: [] });
  return map.get(no);
}
// Fetch-or-create a group bucket within a note.
function groupOf(note, group) {
  let g = note.groups.find((x) => x.group === group);
  if (!g) { g = { group, total: 0, subGroups: [], direct: [] }; note.groups.push(g); }
  return g;
}
function pushLedger(g, subGroup, line) {
  g.total += line.closing;
  const s = String(subGroup || '').trim();
  if (!s) { g.direct.push(line); return; }
  let sg = g.subGroups.find((x) => x.name === s);
  if (!sg) { sg = { name: s, total: 0, ledgers: [] }; g.subGroups.push(sg); }
  sg.total += line.closing;
  sg.ledgers.push(line);
}

// One balance-sheet side (liabilities or assets) → notes.
function buildBsSide(groups, side, mapper, tbByName, notes) {
  const section = side === 'Cr' ? 'Equity & Liabilities' : 'Assets';
  for (const grp of groups || []) {
    const { no, title } = mapper(grp.group);
    const note = noteOf(notes, no, title, section, side, 'Balance Sheet');
    const g = groupOf(note, grp.group);
    const ledgers = grp.ledgers || [];
    if (ledgers.length) {
      for (const l of ledgers) {
        const mv = movement(tbByName.get(norm(l.name)), side, N(l.amount));
        pushLedger(g, l.subGroup, { ledger: l.name, ...mv });
      }
    } else {
      // computed groups (e.g. 'Profit & Loss A/c') carry only an amount.
      pushLedger(g, '', { ledger: grp.group, opening: 0, additions: N(grp.amount), withdrawals: 0, closing: N(grp.amount), isResult: !!grp.isResult });
    }
    note.total += N(grp.amount);
  }
}

// One P&L side (income or expense) → notes, expanded to ledgers from the TB.
function buildPlSide(items, kind, mapper, tbByGroup, notes) {
  const side = kind === 'income' ? 'Cr' : 'Dr';
  const section = kind === 'income' ? 'Income' : 'Expenses';
  for (const it of items || []) {
    // Classify by the group's PRIMARY (system) head, not its leaf name. INCOME_NOTE /
    // EXPENSE_NOTE test for 'Sales Accounts' / 'Direct Income' / 'Purchase Accounts' …,
    // but the P&L payload is keyed by the POSTING's group — so every module leaf
    // ('Insurance', 'Flights', 'Hotels', …) matched neither branch and silently fell
    // through to "Other Income" / "Other Expenses". The backend already ships `primary`
    // (= topSystemGroup) alongside `group` for exactly this, and the sibling statutory
    // screens (taxAudit3cd, gstr9c) both read `(g.primary || g.group)` off the same
    // payload. `it.group` stays the row LABEL below — only the note choice moves.
    const { no, title } = mapper(it.primary || it.group);
    const note = noteOf(notes, no, title, section, side, 'Profit & Loss');
    const g = groupOf(note, it.group);
    const rows = tbByGroup.get(it.group) || [];
    if (rows.length) {
      for (const r of rows) {
        const flow = kind === 'income' ? (N(r.credit) - N(r.debit)) : (N(r.debit) - N(r.credit));
        g.direct.push({ ledger: r.ledger, opening: 0, additions: flow, withdrawals: 0, closing: flow, amount: flow });
      }
    } else {
      g.direct.push({ ledger: it.group, opening: 0, additions: N(it.amount), withdrawals: 0, closing: N(it.amount), amount: N(it.amount) });
    }
    g.total += N(it.amount);   // P&L group amount is authoritative for reconciliation
    note.total += N(it.amount);
  }
}

const sum = (arr, f) => (arr || []).reduce((s, x) => s + f(x), 0);

/**
 * @param {object} bs       /api/accounting/balance-sheet response
 * @param {object} pl       /api/accounting/profit-and-loss response
 * @param {object} tb       /api/accounting/trial-balance response
 * @param {object} ageing   /api/accounting/ageing response
 * @returns {{ notes: object[], recon: object }}
 */
export function buildNotes({ bs, pl, tb, ageing, cur = '₹' } = {}) {
  const tbRows = (tb && tb.rows) || [];
  const tbByName = new Map();
  const tbByGroup = new Map();
  for (const r of tbRows) {
    tbByName.set(norm(r.ledger), r);
    if (!tbByGroup.has(r.group)) tbByGroup.set(r.group, []);
    tbByGroup.get(r.group).push(r);
  }

  const notes = new Map();
  if (bs) {
    buildBsSide(bs.liabilities, 'Cr', LIAB_NOTE, tbByName, notes);
    buildBsSide(bs.assets, 'Dr', ASSET_NOTE, tbByName, notes);
  }
  if (pl) {
    buildPlSide(pl.trading && pl.trading.credit, 'income', INCOME_NOTE, tbByGroup, notes);
    buildPlSide(pl.indirect && pl.indirect.credit, 'income', INCOME_NOTE, tbByGroup, notes);
    buildPlSide(pl.trading && pl.trading.debit, 'expense', EXPENSE_NOTE, tbByGroup, notes);
    buildPlSide(pl.indirect && pl.indirect.debit, 'expense', EXPENSE_NOTE, tbByGroup, notes);
  }

  // Attach live ageing to Trade Receivables (4) and Trade Payables (5).
  if (ageing) {
    const r = notes.get(4), p = notes.get(5);
    if (r && ageing.receivables) r.ageing = { totals: ageing.receivables.totals, rows: ageing.receivables.rows || [] };
    if (p && ageing.payables) p.ageing = { totals: ageing.payables.totals, rows: ageing.payables.rows || [] };
  }

  const list = [...notes.values()].sort((a, b) => a.no - b.no);
  for (const n of list) {
    n.groups.forEach((g) => { g.subGroups.sort((a, b) => Math.abs(b.total) - Math.abs(a.total)); });
    n.narrative = narrate(n, cur);
  }

  // ── Reconciliation against the face of the statements ─────────────────
  const assetNotes = list.filter((n) => n.section === 'Assets');
  const liabNotes = list.filter((n) => n.section === 'Equity & Liabilities');
  const incomeNotes = list.filter((n) => n.section === 'Income');
  const expenseNotes = list.filter((n) => n.section === 'Expenses');

  const incomeStmt = pl ? sum(pl.trading && pl.trading.credit, (x) => N(x.amount)) + sum(pl.indirect && pl.indirect.credit, (x) => N(x.amount)) : 0;
  const expenseStmt = pl ? sum(pl.trading && pl.trading.debit, (x) => N(x.amount)) + sum(pl.indirect && pl.indirect.debit, (x) => N(x.amount)) : 0;
  const notesIncome = sum(incomeNotes, (n) => n.total);
  const notesExpense = sum(expenseNotes, (n) => n.total);

  const line = (notesVal, stmtVal) => ({ notes: notesVal, statement: stmtVal, diff: notesVal - stmtVal, ok: Math.abs(notesVal - stmtVal) < 1 });
  const recon = {
    hasBs: !!bs, hasPl: !!pl,
    balanced: bs ? !!bs.balanced : null,
    assets: line(sum(assetNotes, (n) => n.total), bs ? N(bs.totalAssets) : 0),
    liabilities: line(sum(liabNotes, (n) => n.total), bs ? N(bs.totalLiabilities) : 0),
    income: line(notesIncome, incomeStmt),
    expenses: line(notesExpense, expenseStmt),
    netProfit: {
      notes: notesIncome - notesExpense,
      plStatement: pl ? N(pl.netProfit) : 0,
      bsStatement: bs ? N(bs.netProfit) : 0,
    },
  };

  return { notes: list, recon };
}

// Short auto-narrative per note (so even a collapsed note reads meaningfully).
function narrate(n, cur = '₹') {
  const groups = n.groups.map((g) => g.group).join(', ');
  const amt = (v) => `${cur}${Math.round(v).toLocaleString(localeOf(cur))}`;
  if (n.no === 4 && n.ageing) {
    const t = n.ageing.totals || {};
    return `Trade receivables under ${groups}; ${amt(N(t.d60) + N(t.d90))} outstanding beyond 60 days. Reconciles to the Balance Sheet.`;
  }
  if (n.no === 5 && n.ageing) {
    const t = n.ageing.totals || {};
    return `Trade payables under ${groups}; ${amt(N(t.d60) + N(t.d90))} outstanding beyond 60 days. Reconciles to the Balance Sheet.`;
  }
  if (n.no === 2) return `Reserves, surplus and the carried-forward Profit & Loss balance. Reconciles to the Balance Sheet.`;
  if (n.no === 6) return `Fixed assets at cost less depreciation/deletions, with opening → closing movement. Reconciles to the Balance Sheet.`;
  if (n.section === 'Income') return `Income recognised under ${groups}. Reconciles to the Profit & Loss A/c.`;
  if (n.section === 'Expenses') return `Costs charged under ${groups}. Reconciles to the Profit & Loss A/c.`;
  return `Comprises ${groups}. Reconciles to the ${n.reconcilesTo}.`;
}
