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
  const v = Number(n) || 0;  // tolerate undefined/null/NaN → ₹0
  return "₹"+(v>=10000000?(v/10000000).toFixed(2)+"Cr":v>=100000?(v/100000).toFixed(2)+"L":v.toLocaleString("en-IN"));
};

/* ════════════════════════════════════════════════════════════════════
   A. DIRECTOR DASHBOARD
   ════════════════════════════════════════════════════════════════════ */

