/* ════════════════════════════════════════════════════════════════════
   CORE/FORMAT.JS
   Auto-generated from KBiz360_v2.jsx · 16 lines · 2 declarations
   ════════════════════════════════════════════════════════════════════ */



// ── Active branch currency ───────────────────────────────────────────────────
// The default currency the symbol-less / ₹-defaulting formatters (fmt, fmtINR, money's
// default) print in. Set ONCE when the operating branch changes (App.jsx) so the whole
// branch app follows the branch: ₹ + lakh/crore for India, $ + K/M/B + Western grouping
// for the Africa USD branches (NBO/DAR/FBM). Default '₹' → byte-identical to before, so
// nothing changes until a USD branch is selected. Callers that pass an explicit currency
// (money(n, cur) / compactAmt(n,{currency})) are unaffected — the explicit value wins.
let _activeCur = '₹';
export function setActiveCurrency(sym) { _activeCur = (sym && String(sym).trim()) || '₹'; }
export function activeCurrency() { return _activeCur; }
const isUsdSym = (s) => { const t = String(s).trim().toUpperCase(); return t === '$' || t === 'US$' || t === 'USD'; };

export function fmt(n){
  if(n==null||isNaN(n))return "0";
  const abs=Math.abs(n);
  if(isUsdSym(_activeCur)){
    if(abs>=1e9) return (n/1e9).toFixed(2)+" B";
    if(abs>=1e6) return (n/1e6).toFixed(2)+" M";
    if(abs>=1e3) return (n/1e3).toFixed(1)+" K";
    return String(n);
  }
  if(abs>=10000000)return (n/10000000).toFixed(2)+" Cr";
  if(abs>=100000) return (n/100000).toFixed(2)+" L";
  if(abs>=1000)   return Number(n).toLocaleString("en-IN");
  return String(n);
}

/* Responsive hook */

/**
 * Canonical CURRENCY-AWARE compact money formatter (Indian lakh/crore).
 * Single source of truth for summary tiles / trend strips so every screen abbreviates
 * the same way regardless of branch currency. Correct thresholds: ≥1 Cr → "Cr",
 * ≥1 L → "L" (the common bug is gating "L" at 10,00,000 while dividing by 1,00,000,
 * which mislabels 1–10 lakh as "K"). `dash` renders an em-dash for zero/blank.
 */
// Digit-grouping locale for a currency symbol: Indian lakh/crore grouping for ₹,
// Western thousands grouping for everything else (USD/VAT branches). Without this a
// USD amount printed `$1,23,456` (Indian grouping) instead of `$123,456`.
export const localeOf = (currency) => (currency === '₹' || currency === '₨' || currency === 'Rs' ? 'en-IN' : 'en-US');

// ── D2 · Consolidated-view currency split ────────────────────────────────────
// The consolidated (ALL / Consolidated branch) analytics responses carry an OPTIONAL
// `byCurrency: [{ currency, symbol, ... }]` — India (₹/INR) and Africa ($/USD) subtotals
// kept SEPARATE (no FX, no blended cross-currency total). It is present ONLY when the ALL
// view actually mixes currencies; single-branch / single-currency responses omit it and
// MUST render exactly as before. `currencySplit(data)` returns that array when non-empty,
// else null — so `const split = currencySplit(data); if (split) …` is the whole gate.
export const currencySplit = (data) => {
  const arr = data && Array.isArray(data.byCurrency) ? data.byCurrency : null;
  return arr && arr.length ? arr : null;
};
// Human region label for a currency-split section header — ₹ → India, $ → Africa, else
// the raw currency code. Pair with the entry's own `symbol` (e.g. "₹ (India)").
export const curRegion = (symbol, currency) => {
  const s = String(symbol || '').trim();
  if (s === '₹' || s === '₨' || currency === 'INR') return 'India';
  if (s === '$' || s === 'US$' || currency === 'USD') return 'Africa';
  return currency || s || '';
};

export function compactAmt(n, { currency = '₹', dash = false } = {}) {
  const v = Number(n);
  if (n == null || n === '' || isNaN(v) || v === 0) return dash ? '—' : `${currency}0`;
  const a = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  // USD (the currency the Africa branches — NBO/DAR/FBM — keep their books & dashboards
  // in) abbreviates on the Western K/M/B scale; ₹ and every other symbol keep the Indian
  // lakh/crore scale. Previously Cr/L was applied to ALL currencies, so a $ branch KPI
  // printed "$1.50Cr" instead of "$1.50M".
  const sym = String(currency).trim();
  const usd = sym === '$' || sym === 'US$' || sym.toUpperCase() === 'USD';
  if (usd) {
    if (a >= 1e9) return `${currency}${sign}${(a / 1e9).toFixed(2)}B`;
    if (a >= 1e6) return `${currency}${sign}${(a / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `${currency}${sign}${(a / 1e3).toFixed(1)}K`;
  } else {
    if (a >= 1e7) return `${currency}${sign}${(a / 1e7).toFixed(2)}Cr`;
    if (a >= 1e5) return `${currency}${sign}${(a / 1e5).toFixed(2)}L`;
  }
  // Sub-threshold amounts print grouped: Indian grouping for ₹, Western for other currencies.
  return `${currency}${sign}${Math.round(a).toLocaleString(localeOf(currency))}`;
}

// Branch-aware wrapper (kept the name for back-compat) — abbreviates in the ACTIVE branch
// currency. India branches / consolidated default → ₹ + Cr/L (unchanged); a selected USD
// branch → $ + K/M/B. Delegates to the canonical formatter so the rules stay in one place.
export const fmtINR = n => compactAmt(n, { currency: _activeCur });

// Canonical FULL amount (no Cr/L abbreviation), branch-currency aware. The single
// source for screens that print exact figures (registers, vouchers, statements):
// ₹ + Indian lakh/crore grouping for India branches, $/other + Western thousands
// grouping for USD branches (NBO/DAR/FBM). Pass the branch currency symbol as `cur`.
export const money = (n, cur = _activeCur) => cur + Math.round(Number(n) || 0).toLocaleString(localeOf(cur));

/* ════════════════════════════════════════════════════════════════════
   A. DIRECTOR DASHBOARD
   ════════════════════════════════════════════════════════════════════ */

