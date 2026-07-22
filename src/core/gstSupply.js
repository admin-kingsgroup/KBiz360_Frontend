// ─────────────────────────────────────────────────────────────────────────────
// GST place-of-supply helpers — frontend mirror of the backend's single source
// of truth (src/shared/util/gstSupplyType.js). Used by the party masters AND the
// SO/PO/GP booking screen to AUTO-pick the per-leg GST mode:
//   • SALE leg     — the CUSTOMER's state vs the branch's home state
//   • PURCHASE leg — the SUPPLIER's state vs the branch's home state
//   • foreign party → no Indian GST at all on that leg
// ─────────────────────────────────────────────────────────────────────────────
import { IN_STATES } from './partyEnums';

// GST registration state of each INDIA branch (its place of business). India-only by nature —
// a GST state is meaningless for NBO/DAR/FBM, and supplyTypeOf now returns before reaching this
// for a non-India branch. MHUB is listed explicitly rather than riding the default: it is
// Mumbai, so it was right only by luck.
export const HOME_STATE_BY_BRANCH = { BOM: '27', AMD: '24', MHUB: '27' }; // Maharashtra, Gujarat, Maharashtra
const DEFAULT_HOME_STATE = '27';                              // HO — Maharashtra
export const homeStateForBranch = (branch) =>
  HOME_STATE_BY_BRANCH[String(branch || '').trim().toUpperCase()] || DEFAULT_HOME_STATE;
export const homeStateNameForBranch = (branch) => stateNameOf(homeStateForBranch(branch));

// ── Branch → country (ISO 3166-1 alpha-2) ────────────────────────────────────
// A branch operates in ONE country and taxes/withholds under THAT country's law. Mirror of
// the backend's taxRegime.BRANCH_COUNTRY and of inb.service.COUNTRY (the INB jurisdiction
// map, which had this right all along) — keep the three in step. The FE/BE pair MUST agree:
// approvalChecks recomputes foreignSupplier server-side and rejects a booking whose purchase
// GST disagrees with its own recompute.
export const BRANCH_COUNTRY = { BOM: 'IN', AMD: 'IN', MHUB: 'IN', NBO: 'KE', DAR: 'TZ', FBM: 'CD' };
export const homeCountryOf = (branch) => BRANCH_COUNTRY[String(branch || '').trim().toUpperCase()] || 'IN';

// Free-text country NAME/alias → ISO code; '' when unmapped (→ treated as foreign, fail safe).
const COUNTRY_CODE = {
  india: 'IN', in: 'IN', bharat: 'IN',
  kenya: 'KE', ke: 'KE',
  tanzania: 'TZ', tz: 'TZ',
  'dr congo': 'CD', drc: 'CD', congo: 'CD', cd: 'CD',
  'democratic republic of congo': 'CD', 'democratic republic of the congo': 'CD',
};
export const countryCodeOf = (c) => COUNTRY_CODE[String(c || '').trim().toLowerCase()] || '';

/**
 * Is this party DOMESTIC to the given branch — in the same country the branch operates in?
 * This is the question `isIndiaCountry` was standing in for, and getting wrong off India.
 *   blank   → YES (a legacy/derived row is local to its own branch; blank on FBM = Congolese)
 *   known   → its code === the branch's country
 *   unknown → NO ('Singapore', 'Other') — fail safe, never invent a domestic credit
 */
export const isDomesticFor = (country, branch) => {
  const c = String(country || '').trim();
  if (!c) return true;
  const code = countryCodeOf(c);
  return code ? code === homeCountryOf(branch) : false;
};

// DEPRECATED for the "does our tax apply?" question — use isDomesticFor(country, branch).
// Correct ONLY for an India branch. Kept for needsState-style checks that genuinely mean India.
// Blank country is treated as India, so legacy rows without a country still classify.
export const isIndiaCountry = (c) => {
  const x = String(c || '').trim().toLowerCase();
  return x === '' || x === 'india' || x === 'in' || x === 'bharat';
};
export const isExplicitIndiaCountry = (c) => {
  const x = String(c || '').trim().toLowerCase();
  return x === 'india' || x === 'in' || x === 'bharat';
};

// Resolve a 2-digit GST state code from an explicit code, a state name, or a GSTIN.
export const stateCodeOf = ({ stateCode, state, gstin } = {}) => {
  const sc = String(stateCode || '').trim();
  if (IN_STATES.some(([c]) => c === sc)) return sc;
  const byName = IN_STATES.find(([, n]) => n.toLowerCase() === String(state || '').trim().toLowerCase());
  if (byName) return byName[0];
  const g = String(gstin || '').trim().match(/^\d{2}/);
  return g && IN_STATES.some(([c]) => c === g[0]) ? g[0] : '';
};
export const stateNameOf = (code) => {
  const row = IN_STATES.find(([c]) => c === String(code || '').trim());
  return row ? row[1] : '';
};

// 'foreign' | 'intra' | 'inter' | '' (domestic, but no Indian state split applies/captured).
//
// FOREIGN is relative to the BRANCH's country, not to India — it was `!isIndiaCountry(...)`,
// which inverted on every Africa branch (a Congolese vendor on FBM read 'foreign'; an Indian
// vendor on FBM read domestic). Mirrors the backend's resolveSupplyType exactly.
export function supplyTypeOf(party = {}, branchCode) {
  const branch = branchCode || party.branch;
  if (!isDomesticFor(party.country, branch)) return 'foreign';
  // The intra/inter split is an INDIAN place-of-supply concept; a VAT branch has none, so
  // return '' (the existing "no split" value) rather than comparing against an Indian state.
  if (homeCountryOf(branch) !== 'IN') return '';
  const sc = stateCodeOf(party);
  if (!sc) return '';
  return sc === homeStateForBranch(branch) ? 'intra' : 'inter';
}
