// ─── TK GROUP CENTRAL · receivables & payables (pure) ────────────────────────
// BRANCHWISE outstanding — each branch in its own currency; never consolidated.

/** One branch's AR/AP row from an ageing payload. */
export function arapRow(branch, ageing) {
  const a = ageing || {};
  const recv = a.receivables || { totals: {}, rows: [] };
  const pay = a.payables || { totals: {}, rows: [] };
  const receivables = Number(recv.totals && recv.totals.total) || 0;
  const payables = Number(pay.totals && pay.totals.total) || 0;
  return {
    code: branch.code, cur: branch.currency, flag: branch.flag, city: branch.city,
    receivables,
    over90: Number(recv.totals && recv.totals.d90) || 0,
    payables,
    net: receivables - payables,
    debtors: (recv.rows || []).length,
    creditors: (pay.rows || []).length,
  };
}
