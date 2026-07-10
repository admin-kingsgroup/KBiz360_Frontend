// ─────────────────────────────────────────────────────────────────────────────
// GST place-of-supply helpers — frontend mirror of the backend's single source
// of truth (src/shared/util/gstSupplyType.js). Used by the party masters AND the
// SO/PO/GP booking screen to AUTO-pick the per-leg GST mode:
//   • SALE leg     — the CUSTOMER's state vs the branch's home state
//   • PURCHASE leg — the SUPPLIER's state vs the branch's home state
//   • foreign party → no Indian GST at all on that leg
// ─────────────────────────────────────────────────────────────────────────────
import { IN_STATES } from './partyEnums';

// GST registration state of each Indian branch (its place of business).
export const HOME_STATE_BY_BRANCH = { BOM: '27', AMD: '24' }; // Maharashtra, Gujarat
const DEFAULT_HOME_STATE = '27';                              // HO — Maharashtra
export const homeStateForBranch = (branch) =>
  HOME_STATE_BY_BRANCH[String(branch || '').trim().toUpperCase()] || DEFAULT_HOME_STATE;
export const homeStateNameForBranch = (branch) => stateNameOf(homeStateForBranch(branch));

// Blank country is treated as India (the overwhelming default for this book), so
// legacy rows without a country still classify.
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

// 'foreign' | 'intra' | 'inter' | '' (India but state not yet captured).
export function supplyTypeOf(party = {}, branchCode) {
  if (!isIndiaCountry(party.country)) return 'foreign';
  const sc = stateCodeOf(party);
  if (!sc) return '';
  return sc === homeStateForBranch(branchCode || party.branch) ? 'intra' : 'inter';
}
