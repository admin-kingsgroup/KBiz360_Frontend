// ─── TK GROUP CENTRAL · investment / capital (pure) ──────────────────────────
// BRANCHWISE — each branch's capital & investment in its own currency; never summed.

/** One branch's investment row from a capital-analysis payload. */
export function investmentRow(branch, cap) {
  const c = cap || {};
  const n = (k) => Number(c[k]) || 0;
  return {
    code: branch.code, cur: branch.currency, flag: branch.flag, city: branch.city,
    capitalInvested: n('capitalInvested'),
    investments: n('investments'),
    loans: n('loans'),
    capitalEmployed: n('capitalEmployed'),
    profit: n('profit'),
  };
}
