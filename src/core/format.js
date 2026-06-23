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
export function compactAmt(n, { currency = '₹', dash = false } = {}) {
  const v = Number(n);
  if (n == null || n === '' || isNaN(v) || v === 0) return dash ? '—' : `${currency}0`;
  const a = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (a >= 1e7) return `${currency}${sign}${(a / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${currency}${sign}${(a / 1e5).toFixed(2)}L`;
  return `${currency}${sign}${Math.round(a).toLocaleString('en-IN')}`; // rounded rupees — no paise on tiles
}

// Back-compat ₹ wrapper — delegates to the canonical formatter so the rules stay in one place.
export const fmtINR = n => compactAmt(n, { currency: '₹' });

/* ════════════════════════════════════════════════════════════════════
   A. DIRECTOR DASHBOARD
   ════════════════════════════════════════════════════════════════════ */

