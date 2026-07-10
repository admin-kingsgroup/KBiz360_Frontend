// Magnitude difference between a statement line and a book entry, used by the
// reconciliation "is this a split?" guardrail on manual 1:1 matches. Sign-agnostic
// (|debit| + |credit| per side), so it works regardless of each module's debit/credit
// convention. 0 = ties out; a positive value means the book entry is smaller than the
// line — the classic "one line = several book entries" split.
const amt = (x) => Math.abs(Number(x?.debit) || 0) + Math.abs(Number(x?.credit) || 0);

export function matchVariance(stmtLine, bookLine) {
  return Math.round((amt(stmtLine) - amt(bookLine)) * 100) / 100;
}

// Group (N:1) variance — the line vs the SUM of several book legs. 0 = the legs
// together tie out the line (a clean split); non-zero = still short/over.
export function matchVarianceGroup(stmtLine, bookLines = []) {
  return Math.round((amt(stmtLine) - bookLines.reduce((t, b) => t + amt(b), 0)) * 100) / 100;
}

// SIGNED group variance, matching each reconciliation module's backend convention.
// Statement signed is debit − credit; bookSign is +1 when the book side is debit − credit
// (debtor / tally) or −1 when credit − debit (creditor / supplier). 0 ⇒ the legs settle the
// line in BOTH amount AND direction (a real split); non-zero ⇒ short / over / wrong-direction.
// Unlike the magnitude version, picking opposite-direction legs will NOT read as a tie.
export function matchVarianceSigned(stmtLine, bookLines = [], bookSign = 1) {
  const sStmt = (Number(stmtLine?.debit) || 0) - (Number(stmtLine?.credit) || 0);
  const sBook = bookLines.reduce((t, b) => t + bookSign * ((Number(b.debit) || 0) - (Number(b.credit) || 0)), 0);
  return Math.round((sStmt - sBook) * 100) / 100;
}
