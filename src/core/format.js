/* ════════════════════════════════════════════════════════════════════
   CORE/FORMAT.JS
   Auto-generated from KBiz360_v2.jsx · 16 lines · 2 declarations
   ════════════════════════════════════════════════════════════════════ */



export function fmt(n){
  if(n==null||isNaN(n))return "0";
  const abs=Math.abs(n);
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

export function compactAmt(n, { currency = '₹', dash = false } = {}) {
  const v = Number(n);
  if (n == null || n === '' || isNaN(v) || v === 0) return dash ? '—' : `${currency}0`;
  const a = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (a >= 1e7) return `${currency}${sign}${(a / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${currency}${sign}${(a / 1e5).toFixed(2)}L`;
  // Sub-lakh amounts print grouped: Indian grouping for ₹, Western for other currencies.
  return `${currency}${sign}${Math.round(a).toLocaleString(localeOf(currency))}`;
}

// Back-compat ₹ wrapper — delegates to the canonical formatter so the rules stay in one place.
export const fmtINR = n => compactAmt(n, { currency: '₹' });

// Canonical FULL amount (no Cr/L abbreviation), branch-currency aware. The single
// source for screens that print exact figures (registers, vouchers, statements):
// ₹ + Indian lakh/crore grouping for India branches, $/other + Western thousands
// grouping for USD branches (NBO/DAR/FBM). Pass the branch currency symbol as `cur`.
export const money = (n, cur = '₹') => cur + Math.round(Number(n) || 0).toLocaleString(localeOf(cur));

/* ════════════════════════════════════════════════════════════════════
   A. DIRECTOR DASHBOARD
   ════════════════════════════════════════════════════════════════════ */

