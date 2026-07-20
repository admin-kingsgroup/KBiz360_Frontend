// Pure, dependency-light model for the Inter-Branch Elimination report — extracted from the
// page so the currency-partition + mirror-matching logic is unit-testable WITHOUT rendering
// (the page's deps pull in import.meta). `curOf(code)` supplies a branch's book-currency symbol
// (₹ India / $ Africa), injected so the model needs no styleTokens dependency.
import { BRANCHES } from '../../../core/data';
import { isInterBranch } from '../../interbranch/interbranch';

// Resolve the COUNTER branch a ledger points at (the branch named in the ledger), excluding
// the ledger's own owning branch.
export function counterBranchOf(name, owningCode) {
  const low = (name || '').toLowerCase();
  for (const b of BRANCHES) {
    if (b.code === owningCode) continue;
    const tokens = [b.code, b.city].filter(Boolean).map((s) => String(s).toLowerCase());
    if (tokens.some((t) => t.length >= 2 && low.includes(t))) return b;
  }
  return null;
}

// Classify inter-branch Sundry Debtor/Creditor balances, match each receivable against its
// mirror payable ONLY within the same book currency, and total per currency. ₹ and $ are never
// added together — a blended "grand total" of India ₹ + Africa $ balances is meaningless, and a
// cross-border pair settles at its deal's own frozen FX rate, not by netting closing balances.
export function buildElimModel(tbRows, ledgers, curOf) {
  const regByName = new Map((ledgers || []).map((l) => [String(l.name).toLowerCase(), l]));

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
      cur: curOf(owning),                          // the OWNING branch's own book currency
      side: isDebtor ? 'receivable' : 'payable',
      debit: row.debit || 0, credit: row.credit || 0,
      outstanding: isDebtor ? (row.closingDebit || 0) : (row.closingCredit || 0),
    };
  };

  const all = (tbRows || []).map(classify).filter(Boolean);
  const receivables = all.filter((c) => c.side === 'receivable');
  const payables    = all.filter((c) => c.side === 'payable');

  const payByKey = new Map(payables.map((p) => [`${p.owning || '?'}|${p.counterCode || '?'}`, p]));
  receivables.forEach((r) => {
    const mirror = payByKey.get(`${r.counterCode || '?'}|${r.owning || '?'}`);
    if (mirror && mirror.cur === r.cur) {
      // Same book currency → the overlap can be auto-eliminated.
      const elim = Math.min(r.outstanding, mirror.outstanding);
      const status = Math.abs(r.outstanding - mirror.outstanding) < 1 ? 'Matched' : 'Partial';
      r.matched = true;  r.elim = elim;  r.status = status;  r.mirror = mirror.ledger;
      mirror.matched = true; mirror.elim = elim; mirror.status = status; mirror.mirror = r.ledger;
    } else if (mirror) {
      // A genuine counter-party, but in a DIFFERENT book currency (₹ ⇄ $) — flag, never blend.
      r.matched = false; r.elim = 0; r.status = 'Cross-Currency'; r.mirror = mirror.ledger;
      if (mirror.status === undefined) { mirror.matched = false; mirror.elim = 0; mirror.status = 'Cross-Currency'; mirror.mirror = r.ledger; }
    } else {
      r.matched = false; r.elim = 0; r.status = 'Unmatched';
    }
  });
  payables.forEach((p) => { if (p.status === undefined) { p.matched = false; p.elim = 0; p.status = 'Unmatched'; } });

  const sum = (arr, k) => arr.reduce((s, x) => s + (x[k] || 0), 0);

  // Totals PER book currency — ₹ and $ are never added together.
  const currencies = [...new Set([...receivables, ...payables].map((x) => x.cur))].sort();
  const byCcy = currencies.map((cur) => {
    const rec = receivables.filter((r) => r.cur === cur);
    const pay = payables.filter((p) => p.cur === cur);
    const totalRec = sum(rec, 'outstanding');
    const totalPay = sum(pay, 'outstanding');
    const totalElim = sum(rec, 'elim');            // each pair counted once (on the receivable)
    return {
      cur, totalRec, totalPay, totalElim,
      unmatchedRec: Math.max(0, totalRec - totalElim),
      unmatchedPay: Math.max(0, totalPay - totalElim),
      netDiff: totalRec - totalPay,
    };
  });

  // Branch-wise rollup (by owning branch) — each branch carries its own currency.
  const branchMap = new Map();
  const bump = (code, cur, key, amt) => {
    const k = code || '—';
    if (!branchMap.has(k)) branchMap.set(k, { branch: k, cur, rec: 0, pay: 0, elim: 0 });
    branchMap.get(k)[key] += amt;
  };
  receivables.forEach((r) => { bump(r.owning, r.cur, 'rec', r.outstanding); bump(r.owning, r.cur, 'elim', r.elim); });
  payables.forEach((p) => { bump(p.owning, p.cur, 'pay', p.outstanding); bump(p.owning, p.cur, 'elim', p.elim); });
  const branchSummary = [...branchMap.values()].sort((a, b) => (b.rec + b.pay) - (a.rec + a.pay));

  return { receivables, payables, byCcy, currencies, branchSummary };
}
