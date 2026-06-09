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

export const fmtINR = n => {
  const v = Number(n) || 0;            // tolerate undefined/null/NaN → ₹0
  const a = Math.abs(v);               // threshold on magnitude so negatives abbreviate too
  const sign = v < 0 ? '-' : '';       // keep the sign outside the abbreviation
  if (a >= 10000000) return `₹${sign}${(a / 10000000).toFixed(2)}Cr`;
  if (a >= 100000)   return `₹${sign}${(a / 100000).toFixed(2)}L`;
  return `₹${sign}${Math.round(a).toLocaleString('en-IN')}`; // rounded rupees — no paise on summary tiles
};

/* ════════════════════════════════════════════════════════════════════
   A. DIRECTOR DASHBOARD
   ════════════════════════════════════════════════════════════════════ */

