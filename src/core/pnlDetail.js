// ───────────────────────────────────────────────────────────────────────────
// P&L "expand all" drill — module → GL ledger → fare/charge component.
//
// modulePL() attaches a per-module breakdown `m.heads = { sales:[…], cogs:[…] }`,
// each side an array of GL ledger heads:
//     { ledger, amount, components:[{ label, amount }] }   (e.g. Base Fare, K3, Taxes)
//
// These pure helpers turn that into flat row descriptors the Classic / Vertical /
// Fiori / TKF renderers map to table rows, and collect every expand key so the
// "Expand all" button opens modules AND their ledgers in one shot. Keeping them
// here (framework-free) lets the logic be unit-tested without a DOM.
// ───────────────────────────────────────────────────────────────────────────

/** The ledger heads for one side ('sales' | 'cogs') of a module, or []. */
export function moduleHeads(m, side) {
  return (m && m.heads && Array.isArray(m.heads[side])) ? m.heads[side] : [];
}

/** Does a module carry any ledger detail to drill into on this side? */
export const moduleHasDetail = (m, side) => moduleHeads(m, side).length > 0;

/** Expand key for a whole module's ledger list (one side). */
export const moduleDetailKey = (m, side, keyPrefix = '') => `${keyPrefix}m:${side}:${m.key}`;

/** Expand key for a single ledger's component list (one side). */
export const ledgerDetailKey = (m, side, ledger, keyPrefix = '') => `${keyPrefix}l:${side}:${m.key}:${ledger}`;

/**
 * Rows shown UNDER an open module, one side. `isOpen(key, def)` reads the view's
 * expand state. A ledger row is itself expandable when it has components; when
 * open it is followed by its component rows.
 *   ledgerHead row → { label, amount, ledger, ledgerHead, expandable, ekey, open }
 *   component row  → { label, amount, component: true }
 */
export function moduleDetailRows(m, side, isOpen, keyPrefix = '') {
  return moduleHeads(m, side).flatMap((h) => {
    const comps = Array.isArray(h.components) ? h.components : [];
    const hasComps = comps.length > 0;
    const ekey = ledgerDetailKey(m, side, h.ledger, keyPrefix);
    const open = hasComps && isOpen(ekey, false);
    const head = { label: h.ledger, amount: h.amount, ledger: h.ledger, ledgerHead: true, expandable: hasComps, ekey, open };
    return open ? [head, ...comps.map((c) => ({ label: c.label, amount: c.amount, component: true }))] : [head];
  });
}

/**
 * Every expand key (module + each ledger, for the requested sides) across a
 * module list — feed this to "Expand all" so it opens the entire drill, and to
 * "Collapse all" (mapped to false) to close it.
 */
export function moduleExpandKeys(modules, keyPrefix = '', sides = ['sales', 'cogs']) {
  const keys = [];
  for (const m of (modules || [])) {
    for (const side of sides) {
      if (!moduleHasDetail(m, side)) continue;
      keys.push(moduleDetailKey(m, side, keyPrefix));
      for (const h of moduleHeads(m, side)) keys.push(ledgerDetailKey(m, side, h.ledger, keyPrefix));
    }
  }
  return keys;
}
