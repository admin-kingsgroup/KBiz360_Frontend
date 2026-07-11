// ─── TK GROUP · FE · Enforcement Matrix helpers (pure) ───────────────────────
// Client mirror of the backend voucherPolicy resolver. Store shape:
//   { default: { <cat>: {enforce,threshold,effectiveDate} }, branches: { <code>: {...} } }
// Effective cell for (branch, category) = builtin ← group default ← branch override.

export const BUILTIN_CELL = { enforce: false, threshold: 0, effectiveDate: '' };

const isDefaultBranch = (b) => !b || b === 'default' || b === 'ALL';

function clean(raw) {
  const out = {};
  if (raw && typeof raw === 'object') {
    if (typeof raw.enforce === 'boolean') out.enforce = raw.enforce;
    if (raw.threshold != null && raw.threshold !== '' && !Number.isNaN(Number(raw.threshold))) out.threshold = Number(raw.threshold);
    if (typeof raw.effectiveDate === 'string' && raw.effectiveDate) out.effectiveDate = raw.effectiveDate;
  }
  return out;
}

/** Effective policy for (branch, category): builtin ← group default ← branch override. */
export function resolveCell(store, branch, category) {
  const s = store || {};
  const out = { ...BUILTIN_CELL };
  Object.assign(out, clean((s.default || {})[category]));
  if (!isDefaultBranch(branch) && s.branches && s.branches[branch]) {
    Object.assign(out, clean(s.branches[branch][category]));
  }
  return out;
}

/** Does the branch explicitly override this category (vs inheriting the group default)? */
export function hasCellOverride(store, branch, category) {
  if (isDefaultBranch(branch)) return false;
  const o = store && store.branches && store.branches[branch] && store.branches[branch][category];
  return !!(o && Object.keys(clean(o)).length);
}

/** Count of voucher types a branch (or the group default) has turned Enforce ON for. */
export function enforcedCount(store, branch, categoryKeys) {
  return (categoryKeys || []).filter((c) => resolveCell(store, branch, c).enforce === true).length;
}
