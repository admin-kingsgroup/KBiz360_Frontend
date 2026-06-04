/* ════════════════════════════════════════════════════════════════════
   CORE/REFERENCE-CACHE.JS
   Synchronous, module-level cache for reference data that the app reads
   SYNCHRONOUSLY (inside render / reduce loops): FX rates, currency metadata,
   per-branch config, the branch list, and roles.

   The real data is fetched once at bootstrap from the API (see
   ReferenceProvider.jsx) and pushed in via the setX() functions. Only MINIMAL
   bootstrap fallbacks live here — just enough for first paint / offline
   resilience — NOT the full business dataset (that lives in MongoDB).
   ════════════════════════════════════════════════════════════════════ */

/* ── Minimal bootstrap fallbacks (replaced by API data on hydration) ── */
const FALLBACK_CURRENCY = { INR: { symbol: '₹', name: 'Indian Rupee', toINR: 1 } };
const FALLBACK_BRANCHES = [
  { code: 'TKHO', city: 'Head Office',   country: 'India',    flag: '🇮🇳', currency: 'INR', currencies: ['INR'],        isHO: true  },
  { code: 'BOM',  city: 'Mumbai',        country: 'India',    flag: '🇮🇳', currency: 'INR', currencies: ['INR']                     },
  { code: 'AMD',  city: 'Ahmedabad',     country: 'India',    flag: '🇮🇳', currency: 'INR', currencies: ['INR']                     },
  { code: 'NBO',  city: 'Nairobi',       country: 'Kenya',    flag: '🇰🇪', currency: 'USD', currencies: ['USD', 'KES']              },
  { code: 'DAR',  city: 'Dar es Salaam', country: 'Tanzania', flag: '🇹🇿', currency: 'USD', currencies: ['USD', 'TZS']              },
  { code: 'FBM',  city: 'Lubumbashi',    country: 'DR Congo', flag: '🇨🇩', currency: 'USD', currencies: ['USD', 'CDF']              },
];
const FALLBACK_CFG = { cur: '₹', curCode: 'INR', taxType: 'GST', vatRate: null, gstRates: [5, 12, 18], hasIGST: true, psOptions: [], voucherPrefix: 'BOM' };
const FALLBACK_CFG_ALL = { cur: '₹', curCode: 'INR', taxType: 'MULTI', vatRate: null, gstRates: [5, 12, 18], hasIGST: true, psOptions: [], voucherPrefix: 'TKHO' };
// Minimal Super-Admin fallback so an admin is never locked out if /api/roles fails.
const FALLBACK_ROLES = { 'Super Admin': { name: 'Super Admin', branches: 'ALL', perms: {}, special: {}, _fullAccess: true } };

/* ── Internal state ── */
let _currency = { ...FALLBACK_CURRENCY };
let _branchCfg = {};   // code → config (mapped from company-profile)
let _profiles = {};    // code → full company-profile doc (legal/bank/address)
let _roles = { ...FALLBACK_ROLES };
let _permModules = [];
let _permActions = ['view', 'create', 'edit', 'delete', 'approve', 'print', 'export'];
let _permToggles = [];

// Live, in-place-mutated exports so existing `import { BRANCHES } from './data'`
// call-sites keep a stable reference and see updated data after hydration.
export const BRANCHES = [...FALLBACK_BRANCHES];
export const BRANCH_CODES = FALLBACK_BRANCHES.map((b) => b.code);
export const ACTIVE_CURRENCIES = Object.keys(FALLBACK_CURRENCY);

/* ── Currency / FX ── */
export function setCurrencyMeta(map) {
  if (map && typeof map === 'object' && Object.keys(map).length) {
    _currency = { ...map };
    ACTIVE_CURRENCIES.splice(0, ACTIVE_CURRENCIES.length, ...Object.keys(_currency));
  }
}
export function currencyMeta(code) { return code ? (_currency[code] || { symbol: code, name: code, toINR: 1 }) : _currency; }
export function fxToINR(code) { return _currency[code]?.toINR ?? 1; }
export function currencySymbolOf(code) { return _currency[code]?.symbol || code || ''; }

// Proxies so legacy `FX_RATES[code]` and `CURRENCY_META[code].symbol` /
// `Object.keys(CURRENCY_META)` keep working against the live cache, untouched.
export const FX_RATES = new Proxy({}, {
  get: (_t, k) => fxToINR(String(k)),
  has: (_t, k) => String(k) in _currency,
  ownKeys: () => Reflect.ownKeys(_currency),
  getOwnPropertyDescriptor: (_t, k) => ({ enumerable: true, configurable: true, value: fxToINR(String(k)) }),
});
export const CURRENCY_META = new Proxy({}, {
  get: (_t, k) => _currency[k],
  has: (_t, k) => k in _currency,
  ownKeys: () => Reflect.ownKeys(_currency),
  getOwnPropertyDescriptor: (_t, k) => ({ enumerable: true, configurable: true, value: _currency[k] }),
});

/* ── Branches ── */
export function setBranches(arr) {
  if (Array.isArray(arr) && arr.length) {
    BRANCHES.splice(0, BRANCHES.length, ...arr);
    BRANCH_CODES.splice(0, BRANCH_CODES.length, ...arr.map((b) => b.code));
  }
}
export function getBranches() { return BRANCHES; }

/* ── Per-branch config (from company-profile) ── */
function profileToCfg(p) {
  return {
    cur: p.cur_sym || (p.currency === 'USD' ? '$' : '₹'),
    curCode: p.currency || 'INR',
    taxType: p.taxType || 'GST',
    vatRate: p.vatRate ?? null,
    gstRates: p.gstRates || [],
    hasIGST: !!p.hasIGST,
    psOptions: p.psOptions || [],
    voucherPrefix: p.voucherPrefix || p.code,
    secondaryCur: p.secondaryCurSym || '',
    secondaryCurCode: p.secondaryCurrency || '',
    isHO: !!p.isHO,
  };
}
export function setBranchCfg(profiles) {
  const map = {}, raw = {};
  (profiles || []).forEach((p) => { if (p && p.code) { map[p.code] = profileToCfg(p); raw[p.code] = p; } });
  if (Object.keys(map).length) { _branchCfg = map; _profiles = raw; }
}
export function branchCfg(code) {
  if (code === 'ALL') return _branchCfg.ALL || FALLBACK_CFG_ALL;
  return _branchCfg[code] || _branchCfg.BOM || FALLBACK_CFG;
}
// Full company-profile doc (legal/bank/address) for printed documents, etc.
export function companyProfile(code) { return _profiles[code] || _profiles.BOM || {}; }

/* ── Roles / permissions ── */
export function setRoles(arr) {
  const map = {};
  (arr || []).forEach((r) => { if (r && r.name) map[r.name] = r; });
  if (Object.keys(map).length) _roles = map;
}
export function getRole(name) { return _roles[name] || null; }
export function getRolesMap() { return _roles; }
export function setPermMeta({ modules, actions, toggles } = {}) {
  if (Array.isArray(modules) && modules.length) _permModules = modules;
  if (Array.isArray(actions) && actions.length) _permActions = actions;
  if (Array.isArray(toggles) && toggles.length) _permToggles = toggles;
}
export function getPermModules() { return _permModules; }
export function getPermActions() { return _permActions; }
export function getPermToggles() { return _permToggles; }
