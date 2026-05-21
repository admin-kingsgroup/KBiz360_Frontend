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

export const fmtINR = n => "₹"+(n>=10000000?(n/10000000).toFixed(2)+"Cr":n>=100000?(n/100000).toFixed(2)+"L":n.toLocaleString("en-IN"));

/* ════════════════════════════════════════════════════════════════════
   A. DIRECTOR DASHBOARD
   ════════════════════════════════════════════════════════════════════ */

