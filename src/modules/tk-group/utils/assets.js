// ─── TK GROUP CENTRAL · fixed assets (pure) ──────────────────────────────────
// BRANCHWISE — each branch's fixed-asset register in its OWN currency; never summed
// into a group total. Reuses /api/fixed-assets?branch=X (the instance register).
import { curSym } from './currency';

/** Net book value of one asset. Disposed → 0. Active → its written-down value when set,
 *  else its cost (a freshly-added asset not yet depreciated). Never negative. */
export function assetNbv(a) {
  const o = a || {};
  if (o.status === 'Disposed') return 0;
  const cost = Number(o.cost) || 0;
  const wdv = Number(o.wdv) || 0;
  const nbv = wdv > 0 ? wdv : cost;
  return nbv < 0 ? 0 : nbv;
}

/** Accumulated depreciation on one asset = cost − NBV (Disposed → full cost written off). */
export function assetDepreciation(a) {
  const cost = Number((a || {}).cost) || 0;
  return Math.max(0, cost - assetNbv(a));
}

/** Fold one branch's asset list into a branchwise register row. Active assets drive the
 *  money columns; disposed ones are counted separately (they carry no book value). */
export function assetBranchRow(branch, list) {
  const arr = Array.isArray(list) ? list : [];
  const active = arr.filter((a) => a && a.status !== 'Disposed');
  const gross = active.reduce((s, a) => s + (Number(a.cost) || 0), 0);
  const nbv = active.reduce((s, a) => s + assetNbv(a), 0);
  const depreciation = active.reduce((s, a) => s + assetDepreciation(a), 0);
  return {
    code: branch.code, cur: curSym(branch.currency), flag: branch.flag, city: branch.city,
    count: active.length,
    disposed: arr.length - active.length,
    gross, depreciation, nbv,
  };
}

/** Group a branch's ACTIVE assets by category (block) code → [{ code, count, gross, nbv }],
 *  richest book value first. For an optional category breakdown. */
export function assetsByCategory(list) {
  const arr = Array.isArray(list) ? list : [];
  const map = new Map();
  for (const a of arr) {
    if (!a || a.status === 'Disposed') continue;
    const key = a.code || '—';
    const g = map.get(key) || { code: key, count: 0, gross: 0, nbv: 0 };
    g.count += 1; g.gross += Number(a.cost) || 0; g.nbv += assetNbv(a);
    map.set(key, g);
  }
  return [...map.values()].sort((x, y) => y.nbv - x.nbv);
}
