// ─── TK GROUP CENTRAL · profitability (pure) ─────────────────────────────────
// BRANCHWISE P&L — each branch in its own currency; never summed into a group total.

/** One branch's P&L row from a profit-and-loss payload. */
export function profitabilityRow(branch, pnl) {
  const p = pnl || {};
  const rev = (p.trading && Number(p.trading.creditTotal)) || 0;
  const cost = (p.trading && Number(p.trading.debitTotal)) || 0;
  const gp = Number(p.grossProfit) || 0;
  const exp = (p.indirect && Number(p.indirect.debitTotal)) || 0;
  const np = Number(p.netProfit) || 0;
  return {
    code: branch.code, cur: branch.currency, flag: branch.flag, city: branch.city,
    rev, cost, gp, exp, np,
    gpPct: rev > 0 ? +(gp / rev * 100).toFixed(1) : 0,
    npPct: rev > 0 ? +(np / rev * 100).toFixed(1) : 0,
  };
}
