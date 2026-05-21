/* ════════════════════════════════════════════════════════════════════
   SHELL/PLACEHOLDER.JSX
   Auto-generated from KBiz360_v2.jsx · 19 lines · 1 declarations
   ════════════════════════════════════════════════════════════════════ */

import React from 'react';
import { ArrowLeft, Wrench } from 'lucide-react';
import { ROUTE_TITLES } from '../core/data';
import { btnG, card } from '../core/styles';

export function Placeholder({route,setRoute}){
  const title=ROUTE_TITLES[route]||route;
  return <div style={{padding:"40px 20px",maxWidth:680,margin:"0 auto"}}>
    <div style={{...card,padding:"46px 32px",textAlign:"center"}}>
      <div style={{width:56,height:56,margin:"0 auto 16px",borderRadius:"50%",background:"#fdf8ec",color:"#b08319",display:"flex",alignItems:"center",justifyContent:"center"}}><Wrench size={26}/></div>
      <h2 style={{margin:0,fontSize:19,fontWeight:700,color:"#0d1326",letterSpacing:"-0.02em"}}>{title}</h2>
      <p style={{margin:"10px auto 0",maxWidth:380,fontSize:13,color:"#5a6691",lineHeight:1.6}}>This module follows the same pattern as Sales — Flight Tickets. All 7 sales/purchase modules are in the Next.js project zip.</p>
      <button onClick={()=>setRoute("/dashboard")} style={{...btnG,marginTop:20,display:"inline-flex",alignItems:"center",gap:7}}><ArrowLeft size={14}/> Back to dashboard</button>
    </div>
  </div>;
}


/* ══════════════════════════════════════════════════════════════════
   MASTERS — 7 Screens
   Full implementations with sample data, search, add/edit modals.
   ════════════════════════════════════════════════════════════════ */

/* ── Shared masters shell ─────────────────────────────────────── */
