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
// Hard symbol fallbacks so a branch's currency renders correctly even before the
// live currency metadata hydrates (or if it has no entry for that code). Without
// this, a USD/Africa branch whose company-profile omits cur_sym fell through to ₹.
const SYMBOL_FALLBACK = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', KES: 'KSh', TZS: 'TSh', CDF: 'FC' };
const FALLBACK_BRANCHES = [
  { code: 'MHUB', city: 'Mumbai',        country: 'India',    flag: '🇮🇳', currency: 'INR', currencies: ['INR']                     },
  { code: 'BOM',  city: 'Mumbai',        country: 'India',    flag: '🇮🇳', currency: 'INR', currencies: ['INR']                     },
  { code: 'AMD',  city: 'Ahmedabad',     country: 'India',    flag: '🇮🇳', currency: 'INR', currencies: ['INR']                     },
  { code: 'NBO',  city: 'Nairobi',       country: 'Kenya',    flag: '🇰🇪', currency: 'USD', currencies: ['USD', 'KES']              },
  { code: 'DAR',  city: 'Dar es Salaam', country: 'Tanzania', flag: '🇹🇿', currency: 'USD', currencies: ['USD', 'TZS']              },
  { code: 'FBM',  city: 'Lubumbashi',    country: 'DR Congo', flag: '🇨🇩', currency: 'USD', currencies: ['USD']                     },
];
const FALLBACK_CFG = { cur: '₹', curCode: 'INR', taxType: 'GST', vatRate: null, gstRates: [5, 12, 18], hasIGST: true, psOptions: [], voucherPrefix: 'BOM' };
const FALLBACK_CFG_ALL = { cur: '₹', curCode: 'INR', taxType: 'MULTI', vatRate: null, gstRates: [5, 12, 18], hasIGST: true, psOptions: [], voucherPrefix: 'MHUB' };
// Minimal Super-Admin fallback so an admin is never locked out if /api/roles fails.
const FALLBACK_ROLES = { 'Super Admin': { name: 'Super Admin', branches: 'ALL', perms: {}, special: {}, _fullAccess: true } };

/* ── Internal state ── */
let _currency = { ...FALLBACK_CURRENCY };
let _branchCfg = {};   // code → config (mapped from company-profile)
let _profiles = {};    // code → full company-profile doc (legal/bank/address)
let _hsnByModule = {}; // lowercased module name → HSN/SAC code (from Tax · HSN-SAC master)
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
/** Allowed currency codes for a branch CODE (main first); [] when unknown. A length
 *  of 1 means single-currency (India ₹, or the USD-only FBM) — no FX chip / local print. */
export function branchCurrenciesOf(code) {
  const b = BRANCHES.find((x) => x.code === code);
  if (!b) return [];
  return (b.currencies && b.currencies.length) ? b.currencies : (b.currency ? [b.currency] : []);
}

/* ── Per-branch config (from company-profile) ── */
// Resolve a currency CODE → display symbol: prefer the live currency metadata,
// then the hard fallback map, then the code itself. Never silently collapses a
// non-INR currency to ₹ (the old `=== 'USD' ? '$' : '₹'` bug).
function resolveCurSym(code) {
  if (!code) return '';
  const meta = currencySymbolOf(code);
  if (meta && meta !== code) return meta;
  return SYMBOL_FALLBACK[code] || code;
}
function profileToCfg(p) {
  // Fall back to the branch record's currency when the profile omits it, so a
  // USD/Africa branch stays USD even if its seeded profile has no currency field.
  const code = p.currency || BRANCHES.find((b) => b.code === p.code)?.currency || 'INR';
  return {
    cur: p.cur_sym || resolveCurSym(code),
    curCode: code,
    taxType: p.taxType || 'GST',
    vatRate: p.vatRate ?? null,
    gstRates: p.gstRates || [],
    hasIGST: !!p.hasIGST,
    psOptions: p.psOptions || [],
    voucherPrefix: p.voucherPrefix || p.code,
    secondaryCur: p.secondaryCurSym || '',
    secondaryCurCode: p.secondaryCurrency || '',
  };
}
export function setBranchCfg(profiles) {
  const map = {}, raw = {};
  (profiles || []).forEach((p) => { if (p && p.code) { map[p.code] = profileToCfg(p); raw[p.code] = p; } });
  if (Object.keys(map).length) { _branchCfg = map; _profiles = raw; }
}

// Africa branches run VAT (Kenya/DR Congo 16%, Tanzania 18%); mirrors the backend
// shared/constants/taxRegime.js. The single frontend source of truth for which
// branches are VAT — also used by the import templates' regime toggle.
export const VAT_RATE = { NBO: 16, DAR: 18, FBM: 16 };

// Amended VAT-master rates (branch code → %), hydrated once from /api/vat-rates by the
// ReferenceProvider. Lets the no-company-profile fallback below follow an Owner amendment,
// mirroring the backend's registerVatRates — so no frontend path bills the hardcoded VAT_RATE
// constant when the VAT master says otherwise. (Branches WITH a profile already get the master
// rate via the company-profile DTO → profileToCfg; this covers the unseeded-branch corner.)
let _vatOverrides = {};
export function setVatRateOverrides(rows) {
  const m = {};
  (rows || []).forEach((r) => { if (r && r.branch && r.active !== false && r.rate != null && r.rate !== '') m[String(r.branch).toUpperCase()] = Number(r.rate); });
  _vatOverrides = m;
}

// Derive a branch's tax/currency config from the branch record when no
// company-profile doc exists. Without this every branch fell back to BOM's
// GST/INR config, so the Africa branches never showed VAT in the voucher forms.
function deriveCfgFromBranch(code) {
  const b = BRANCHES.find((x) => x.code === code);
  if (!b) return null;
  const taxStr = String(b.tax || '');
  const isVat = _vatOverrides[code] != null || VAT_RATE[code] != null || /vat/i.test(taxStr);
  const vr = _vatOverrides[code] ?? VAT_RATE[code] ?? (parseFloat((taxStr.match(/(\d+(?:\.\d+)?)\s*%/) || [])[1]) || null);
  return {
    cur: resolveCurSym(b.currency),
    curCode: b.currency || 'INR',
    taxType: isVat ? 'VAT' : 'GST',
    vatRate: isVat ? vr : null,
    gstRates: isVat ? [] : [5, 12, 18],
    hasIGST: !isVat,
    psOptions: [],
    voucherPrefix: code,
    secondaryCur: '',
    secondaryCurCode: (b.currencies && b.currencies[1]) || '',
  };
}

export function branchCfg(code) {
  if (code === 'ALL') return _branchCfg.ALL || FALLBACK_CFG_ALL;
  // company-profile (if seeded) wins; else derive from the branch record so a
  // VAT/USD branch is correct out of the box; else the minimal BOM/GST fallback.
  return _branchCfg[code] || deriveCfgFromBranch(code) || _branchCfg.BOM || FALLBACK_CFG;
}
// Full company-profile doc (legal/bank/address) for printed documents, etc.
// For an EXPLICIT branch code, never cross-fall-back to BOM's profile — that would print
// BOM's Mumbai address / 27-GSTIN / BOM banks on another branch's (e.g. AMD, MHUB) invoices
// and vouchers. Return {} so each caller's own branch-aware fallback (ISSUER_FALLBACK) engages.
// Only a blank/omitted code (generic default) keeps the BOM default.
export function companyProfile(code) { return _profiles[code] || (code ? {} : (_profiles.BOM || {})); }

// HSN/SAC master (Masters › Tax & Currency › Tax / HSN-SAC Codes), keyed by module
// name. A module can hold several codes across rate slabs — we keep the first active
// code per module for the printed invoice's HSN/SAC column.
export function setHsnCodes(list) {
  const map = {};
  (list || []).forEach((h) => {
    if (h && h.module && h.code && h.active !== false) {
      const k = String(h.module).toLowerCase().trim();
      if (!map[k]) map[k] = String(h.code);
    }
  });
  if (Object.keys(map).length) _hsnByModule = map;
}
export function hsnSacFor(moduleName) { return _hsnByModule[String(moduleName || '').toLowerCase().trim()] || ''; }

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
