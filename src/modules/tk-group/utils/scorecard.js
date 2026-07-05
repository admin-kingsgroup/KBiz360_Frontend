// ─── TK GROUP CENTRAL · branch scorecard shaping (pure) ──────────────────────
// BRANCHWISE ONLY — each branch stands on its own, in its own currency. Amounts are
// never blended or consolidated into a group total (per the control model).

/** One branch's scorecard from its P&L + invoice-GP payloads. */
export function scorecardRow(branch, pnl, invoiceGp) {
  const rows = (invoiceGp && invoiceGp.rows) || [];
  const sales = rows.reduce((s, r) => s + (Number(r && r.sale) || 0), 0);
  const gp = (pnl && pnl.grossProfit) || 0;
  const np = (pnl && pnl.netProfit) || 0;
  return {
    code: branch.code,
    city: branch.city,
    flag: branch.flag,
    cur: branch.currency,
    sales,
    gp,
    np,
    bookings: rows.length,
    gpPct: sales > 0 ? +(gp / sales * 100).toFixed(1) : 0,
  };
}

/** Current financial year (Apr–Mar) range up to `now`. `now` is injected for tests.
 *  Uses local date components so the window doesn't shift across time zones. */
export function fyRange(now) {
  const y = now.getFullYear();
  const start = now.getMonth() >= 3 ? `${y}-04-01` : `${y - 1}-04-01`;
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return { from: start, to: `${y}-${mm}-${dd}` };
}
