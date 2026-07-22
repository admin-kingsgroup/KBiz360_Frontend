// ─── TK GROUP · FE · branch-wise limits helpers (pure) ───────────────────────
// Support for the Control Panel's branch-wise Thresholds editor. The store shape
// mirrors the backend: { default: {..}, branches: { <code>: {..overrides} } }.
// Effective value for a branch = branch override → group default → built-in default.

// Branch chips for the editor. Order mirrors the backend CANONICAL_ORDER; 'default' is
// the group-wide baseline every branch inherits. `ccy` drives the money-field symbol.
export const LIMIT_BRANCHES = [
  { code: 'default', label: 'Group default', hint: 'all branches', ccy: '₹' },
  { code: 'MHUB', label: 'MHUB', hint: 'Mumbai', ccy: '₹' },
  { code: 'BOM', label: 'BOM', hint: 'Mumbai', ccy: '₹' },
  { code: 'AMD', label: 'AMD', hint: 'Ahmedabad', ccy: '₹' },
  { code: 'NBO', label: 'NBO', hint: 'Nairobi', ccy: '$' },
  { code: 'DAR', label: 'DAR', hint: 'Dar es Salaam', ccy: '$' },
  { code: 'FBM', label: 'FBM', hint: 'Africa', ccy: '$' },
];

// Money fields shown in the selected branch's currency; the two decision-threshold
// fields keep their fixed ₹/$; non-money units (days / x / %) are unchanged.
const GENERIC_MONEY = new Set(['voucherEscalate', 'voucherDual', 'cashMaxPayment', 'cashMaxOnHand']);

export function symbolFor(fieldKey, fieldUnit, branchCcy) {
  return GENERIC_MONEY.has(fieldKey) ? (branchCcy || fieldUnit) : fieldUnit;
}

// USD (Africa) branches — mirrors backend bookCurrencyOf. Drives the …USD cap-variant pick.
const USD_BRANCHES = new Set(['NBO', 'DAR', 'FBM']);
export const isUsdBranch = (branch) => USD_BRANCHES.has(String(branch || '').toUpperCase());

/** Currency-aware cap read — mirrors backend limits.capForBranch: a USD branch reads the
 *  `<base>USD` variant when it is set, else the base. Keeps FE previews (e.g. the approval
 *  StageTracker) in step with the server's per-branch-currency ceilings. */
export function capForBranch(lim, baseKey, branch) {
  if (!lim) return undefined;
  if (isUsdBranch(branch) && lim[baseKey + 'USD'] != null) return lim[baseKey + 'USD'];
  return lim[baseKey];
}

const isDefaultBranch = (b) => !b || b === 'default' || b === 'ALL';

/** The EFFECTIVE value a branch would use for a field (for placeholder display):
 *  branch override → group default → built-in default. */
export function effectiveValue(store, defaults, branch, key) {
  const s = store || {};
  if (!isDefaultBranch(branch)) {
    const o = s.branches && s.branches[branch];
    if (o && o[key] != null && o[key] !== '') return o[key];
  }
  if (s.default && s.default[key] != null && s.default[key] !== '') return s.default[key];
  return defaults ? defaults[key] : undefined;
}

/** The raw override the branch has EXPLICITLY set for a field (or '' if it inherits). */
export function overrideValue(store, branch, key) {
  const s = store || {};
  const src = isDefaultBranch(branch) ? (s.default || {}) : ((s.branches && s.branches[branch]) || {});
  return src[key] != null ? String(src[key]) : '';
}

/** True when the branch has an explicit override for this field (not the group default). */
export function hasOverride(store, branch, key) {
  if (isDefaultBranch(branch)) return false;
  const o = store && store.branches && store.branches[branch];
  return !!(o && o[key] != null);
}

/** How many fields a branch (or the group default) explicitly overrides. */
export function overrideCount(store, branch) {
  const s = store || {};
  const src = isDefaultBranch(branch) ? (s.default || {}) : ((s.branches && s.branches[branch]) || {});
  return Object.keys(src).length;
}

/** Validate + clean editor values for submit. Blank = inherit (cleared → ''); a filled
 *  field must be a non-negative number. Returns { clean, bad:[labels] }. */
export function cleanLimitValues(fields, values) {
  const clean = {}; const bad = [];
  (fields || []).forEach((f) => {
    const raw = values[f.key];
    if (raw == null || raw === '') { clean[f.key] = ''; return; }   // inherit / clear
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) { bad.push(f.label); return; }
    clean[f.key] = n;
  });
  return { clean, bad };
}
