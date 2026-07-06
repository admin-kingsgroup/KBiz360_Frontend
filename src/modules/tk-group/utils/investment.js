// ─── TK GROUP CENTRAL · investment / capital (pure) ──────────────────────────
// BRANCHWISE — each branch's capital & investment in its own currency; never summed.

// The "fix first" auto-flag: an investment is flagged if its ROI is too low, or the
// branch's overdue-AR or budget-overrun is too high — thresholds are Owner-configured
// (Thresholds & Limits). Returns the list of breaches ([] = clear to invest).
export function fixFirstFlags(m, limits) {
  const L = limits || {};
  const flags = [];
  const roi = Number(m && m.roi);
  const overdue = Number(m && m.overduePct);
  const budgetOver = Number(m && m.budgetOverPct);
  const minRoi = L.investmentMinRoi != null ? Number(L.investmentMinRoi) : 1.5;
  const maxOverdue = L.investmentMaxOverduePct != null ? Number(L.investmentMaxOverduePct) : 15;
  const maxBudget = L.investmentMaxBudgetOverPct != null ? Number(L.investmentMaxBudgetOverPct) : 10;
  if (!Number.isNaN(roi) && roi < minRoi) flags.push(`ROI ${roi}× is below the ${minRoi}× minimum`);
  if (!Number.isNaN(overdue) && overdue > maxOverdue) flags.push(`Overdue AR ${overdue}% exceeds ${maxOverdue}%`);
  if (!Number.isNaN(budgetOver) && budgetOver > maxBudget) flags.push(`Budget over by ${budgetOver}% (limit ${maxBudget}%)`);
  return flags;
}

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
