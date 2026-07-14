// Pure helpers behind the statement views' proportion bars and insights rail.
// Dependency-free so the math is unit-testable on its own.

// A row's share of a base, as a percentage (always non-negative magnitude).
export const share = (amount, base) => {
  const b = Math.abs(Number(base) || 0);
  return b ? (Math.abs(Number(amount) || 0) / b) * 100 : 0;
};

// Top gross-profit contributors (positive GP only), each with a bar width
// relative to the biggest contributor — drives the "Top GP contributors" rail.
export function topByGP(modules, n = 5) {
  const list = [...(modules || [])].filter((m) => (Number(m.gp) || 0) > 0).sort((a, b) => b.gp - a.gp).slice(0, n);
  const max = list[0]?.gp || 1;
  return list.map((m) => ({ name: m.name, icon: m.icon, gp: m.gp, gpPct: m.gpPct, bar: (m.gp / max) * 100 }));
}

// Lowest-margin module that actually traded (for the watchlist).
export const lowestGp = (modules) =>
  [...(modules || [])].filter((m) => (Number(m.sales) || 0) > 0).sort((a, b) => a.gpPct - b.gpPct)[0] || null;
