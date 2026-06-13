// ───────────────────────────────────────────────────────────────────────────
// P&L "expand all" drill — module → [Int'l/Domestic sub-centre →] GL ledger →
// fare/charge component.
//
// modulePL() attaches a per-module breakdown `m.heads = { sales:[…], cogs:[…] }`,
// each side an array of GL ledger heads:
//     { ledger, amount, components:[{ label, amount }] }   (e.g. Base Fare, K3, Taxes)
// Multi-leaf modules (Flights / Holiday Packages, `m.hasSubs`) ALSO carry
// `m.subs = [{ code, name, sales, cogs, heads }]`, one per cost-centre
// (International / Domestic / Unspecified). For those we drill the sub-centre
// level FIRST so the fares are no longer mixed across Int'l & Domestic; the
// module-level `m.heads` (a merged roll-up) is only used for single-leaf modules.
//
// These pure helpers turn that into flat row descriptors the Classic / Vertical /
// Fiori / TKF renderers map to table rows, and collect every expand key so the
// "Expand all" button opens modules AND their sub-centres AND ledgers in one shot.
// Keeping them here (framework-free) lets the logic be unit-tested without a DOM.
// ───────────────────────────────────────────────────────────────────────────

/** The ledger heads for one side ('sales' | 'cogs') of a module, or []. */
export function moduleHeads(m, side) {
  return (m && m.heads && Array.isArray(m.heads[side])) ? m.heads[side] : [];
}

/** The Int'l/Domestic sub-centres of a multi-leaf module, or []. */
export function moduleSubs(m) {
  return (m && m.hasSubs && Array.isArray(m.subs)) ? m.subs : [];
}

/** Does a module split into Int'l/Domestic sub-centres? */
export const moduleHasSubs = (m) => moduleSubs(m).length > 0;

/** The ledger heads for one side of a single sub-centre, or []. */
function subHeads(s, side) {
  return (s && s.heads && Array.isArray(s.heads[side])) ? s.heads[side] : [];
}

/** A sub-centre's amount on one side ('sales' | 'cogs'). */
const subAmount = (s, side) => (side === 'cogs' ? (s && s.cogs) : (s && s.sales)) || 0;

/** Does a sub-centre carry anything to show on this side (heads or an amount)? */
const subHasDetail = (s, side) => subHeads(s, side).length > 0 || Math.abs(subAmount(s, side)) > 0.005;

/**
 * Does a module carry any detail to drill into on this side? True when it has
 * ledger heads, or (for multi-leaf modules) any sub-centre with activity — so the
 * Int'l/Domestic split is reachable even when no fare components were captured.
 */
export const moduleHasDetail = (m, side) =>
  moduleHeads(m, side).length > 0 || moduleSubs(m).some((s) => subHasDetail(s, side));

/** Expand key for a whole module's drill (one side). */
export const moduleDetailKey = (m, side, keyPrefix = '') => `${keyPrefix}m:${side}:${m.key}`;

/** Expand key for a single sub-centre's ledger list within a module (one side). */
export const subDetailKey = (m, side, subCode, keyPrefix = '') => `${keyPrefix}s:${side}:${m.key}:${subCode}`;

/** Expand key for a single ledger's component list (one side, module level). */
export const ledgerDetailKey = (m, side, ledger, keyPrefix = '') => `${keyPrefix}l:${side}:${m.key}:${ledger}`;

/** Expand key for a ledger's component list nested under a sub-centre. */
export const subLedgerDetailKey = (m, side, subCode, ledger, keyPrefix = '') => `${keyPrefix}l:${side}:${m.key}:${subCode}:${ledger}`;

/**
 * Strip a leaf cost-centre prefix (e.g. "IT-", "DT-", "HP-") from a ledger name
 * for display UNDER its Int'l/Domestic head, where the prefix is redundant
 * ("IT-Base Fare" → "Base Fare"). Only the leading short uppercase token is
 * removed, so internal tokens like "DT-K3-Taxes" → "K3-Taxes" are preserved. The
 * real ledger name is kept on the row's `ledger` field for drill-through.
 */
export const stripLeafPrefix = (name) => String(name || '').replace(/^[A-Z]{1,3}-/, '');

/**
 * Turn an array of ledger heads into ledgerHead (+ component) rows. `keyOf(ledger)`
 * builds each ledger row's expand key so the same routine serves both the module
 * level and the nested sub-centre level. `labelOf(ledger)` formats the displayed
 * label (defaults to the raw ledger name; the sub-centre drill strips the prefix).
 *   ledgerHead row → { label, amount, ledger, ledgerHead, expandable, ekey, open }
 *   component row  → { label, amount, component: true }
 */
function headRows(heads, isOpen, keyOf, labelOf = (s) => s) {
  return (heads || []).flatMap((h) => {
    const comps = Array.isArray(h.components) ? h.components : [];
    const hasComps = comps.length > 0;
    const ekey = keyOf(h.ledger);
    const open = hasComps && isOpen(ekey, false);
    const head = { label: labelOf(h.ledger), amount: h.amount, ledger: h.ledger, ledgerHead: true, expandable: hasComps, ekey, open };
    return open ? [head, ...comps.map((c) => ({ label: c.label, amount: c.amount, component: true }))] : [head];
  });
}

/** Rows shown UNDER an open SINGLE-LEAF module, one side (ledger → components). */
export function moduleDetailRows(m, side, isOpen, keyPrefix = '') {
  return headRows(moduleHeads(m, side), isOpen, (ledger) => ledgerDetailKey(m, side, ledger, keyPrefix));
}

/**
 * Rows shown UNDER an open MULTI-LEAF module, one side: one Int'l/Domestic
 * sub-centre row each, expandable to that sub-centre's own ledger → component
 * rows (so fares are split, not merged). Sub-centres with no activity on this
 * side are skipped; the "Unspecified" bucket is shown like any other.
 *   sub-centre row → { label, amount, costCentre, subCode, expandable, ekey, open }
 */
export function moduleSubDetailRows(m, side, isOpen, keyPrefix = '') {
  return moduleSubs(m).flatMap((s) => {
    if (!subHasDetail(s, side)) return [];
    const heads = subHeads(s, side);
    const ekey = subDetailKey(m, side, s.code, keyPrefix);
    const expandable = heads.length > 0;
    const open = expandable && isOpen(ekey, false);
    const row = { label: s.name, amount: subAmount(s, side), costCentre: true, subCode: s.code, expandable, ekey, open };
    if (!open) return [row];
    return [row, ...headRows(heads, isOpen, (ledger) => subLedgerDetailKey(m, side, s.code, ledger, keyPrefix), stripLeafPrefix)];
  });
}

/**
 * Rows under an open module, choosing the sub-centre drill for multi-leaf modules
 * (Flights / Holiday) and the flat ledger drill for single-leaf modules.
 */
export function moduleDrillRows(m, side, isOpen, keyPrefix = '') {
  return moduleHasSubs(m)
    ? moduleSubDetailRows(m, side, isOpen, keyPrefix)
    : moduleDetailRows(m, side, isOpen, keyPrefix);
}

/**
 * Every expand key (module + each sub-centre + each ledger, for the requested
 * sides) across a module list — feed this to "Expand all" so it opens the entire
 * drill, and to "Collapse all" (mapped to false) to close it.
 */
export function moduleExpandKeys(modules, keyPrefix = '', sides = ['sales', 'cogs']) {
  const keys = [];
  for (const m of (modules || [])) {
    for (const side of sides) {
      if (!moduleHasDetail(m, side)) continue;
      keys.push(moduleDetailKey(m, side, keyPrefix));
      if (moduleHasSubs(m)) {
        for (const s of moduleSubs(m)) {
          if (!subHasDetail(s, side)) continue;
          keys.push(subDetailKey(m, side, s.code, keyPrefix));
          for (const h of subHeads(s, side)) keys.push(subLedgerDetailKey(m, side, s.code, h.ledger, keyPrefix));
        }
      } else {
        for (const h of moduleHeads(m, side)) keys.push(ledgerDetailKey(m, side, h.ledger, keyPrefix));
      }
    }
  }
  return keys;
}
