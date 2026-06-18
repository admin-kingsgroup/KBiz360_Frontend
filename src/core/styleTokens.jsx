import React, { useState } from 'react';
import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { branchCfg } from './referenceCache';
import { useMobile } from './hooks';

/* ════════════════════════════════════════════════════════════════════
   styleTokens — lightweight, dependency-free UI primitives
   ════════════════════════════════════════════════════════════════════
   Extracted from the ~1180-line styles.jsx so the EAGER shell/core files
   (SideNav, NotifPanel, GlobalSearch, Placeholder, UserMenu, LedgerModalHost,
   reportDateBar, …) can use these tokens WITHOUT statically importing
   styles.jsx — which pulls in recharts (~530 KB) and several heavy feature
   modules and would otherwise nail the whole forest into the initial bundle.

   styles.jsx re-exports everything here under the original names, so its other
   (lazy) consumers keep importing from './styles' unchanged. Only dependency:
   referenceCache (already eager). NO recharts, NO feature-module imports. */

/* ── Branch config proxy + helpers ── */
export const B = new Proxy({}, {
  get: (_t, code) => branchCfg(code === "ALL" ? "ALL" : String(code)),
  has: () => true,
});
export function bc(branch){ return branch==="ALL"?B.ALL:B[branch?.code]||B.BOM; }
export function bcfmt(branch,n){ const b=bc(branch); return b.cur+Number(n).toLocaleString("en-IN",{maximumFractionDigits:0}); }

/* ── Form / control style objects ── */
export const inp={
  width:"100%",padding:"7px 10px",border:"1px solid #e1e3ec",
  borderRadius:7,fontSize:11.5,outline:"none",
  boxSizing:"border-box",background:"#fff",
};

export const card={
  background:"#fff",border:"1px solid #e1e3ec",
  borderRadius:12,padding:"14px 16px",
};

export const btnG={
  display:"flex",alignItems:"center",justifyContent:"center",gap:6,
  padding:"8px 18px",background:"#0d1326",color:"#fff",
  border:"none",borderRadius:8,fontSize:12,fontWeight:700,
  cursor:"pointer",whiteSpace:"nowrap",
};

export const btnGh={
  display:"flex",alignItems:"center",justifyContent:"center",gap:6,
  padding:"7px 16px",background:"transparent",color:"#0d1326",
  border:"1px solid #e1e3ec",borderRadius:8,fontSize:12,fontWeight:600,
  cursor:"pointer",whiteSpace:"nowrap",
};

/* ── Icon chip ── */
export function Icon({children,bg="#E6F1FB",c="#185FA5",size=36}){
  return (
    <div style={{width:size,height:size,borderRadius:Math.round(size*0.25),
      background:bg,color:c,display:"flex",alignItems:"center",
      justifyContent:"center",flexShrink:0,fontSize:size*0.45}}>
      {children}
    </div>
  );
}

/* ── Form-field label wrapper ── */
export function FL({label,children}){
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <label style={{fontSize:10,color:"#5a6691",fontWeight:600,
        letterSpacing:"0.4px",textTransform:"uppercase"}}>
        {label}
      </label>
      {children}
    </div>
  );
}

/* ── Report table cell styles ── */
export const RPT_thStyle={padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase",background:"#f7f8fb"};
export const RPT_tdStyle={padding:"8px 12px",fontSize:12,color:"#0d1326",borderBottom:"1px solid #f0f2f7"};

/* ── KPI summary card ── */
export function KpiCard({label,value,subtitle,trend,Icon,accent="neutral",onClick}){
  const mob=useMobile();
  const [pressed,setPressed]=useState(false);
  const ac={
    info:   {bg:"#E6F1FB",c:"#185FA5",b:"#B5D4F4"},
    success:{bg:"#EAF3DE",c:"#3B6D11",b:"#C0DD97"},
    warning:{bg:"#FAEEDA",c:"#854F0B",b:"#FAC775"},
    danger: {bg:"#FCEBEB",c:"#A32D2D",b:"#F7C1C1"},
    neutral:{bg:"#f3f4f8",c:"#384677",b:"#e1e3ec"},
  }[accent]||{bg:"#f3f4f8",c:"#384677",b:"#e1e3ec"};
  const clickable=!!onClick;
  return (
    <div onClick={onClick}
      onMouseDown={()=>clickable&&setPressed(true)}
      onMouseUp={()=>setPressed(false)}
      onTouchStart={()=>clickable&&setPressed(true)}
      onTouchEnd={()=>setPressed(false)}
      style={{background:pressed?"#f0f4ff":"#fff",border:`1px solid ${ac.b}`,
        borderRadius:10,padding:mob?"10px 12px":"12px 14px",
        borderTop:`3px solid ${ac.c}`,display:"flex",flexDirection:"column",gap:4,
        minWidth:0,overflow:"hidden",cursor:clickable?"pointer":"default",
        transform:pressed?"scale(0.97)":"scale(1)",
        transition:"transform 0.12s,background 0.12s",userSelect:"none",
        WebkitTapHighlightColor:"transparent"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <p style={{margin:0,fontSize:mob?9:9.5,fontWeight:700,color:ac.c,
          textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</p>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:mob?26:30,height:mob?26:30,borderRadius:8,
            background:ac.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {Icon&&<Icon size={mob?13:15} style={{color:ac.c}}/>}
          </div>
          {clickable&&<ChevronRight size={12} style={{color:ac.c,opacity:0.6}}/>}
        </div>
      </div>
      <p style={{margin:0,fontSize:mob?19:22,fontWeight:800,color:"#0d1326",
        letterSpacing:"-0.02em",lineHeight:1.1,fontVariantNumeric:"tabular-nums"}}>{value}</p>
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        {trend!=null&&(
          <span style={{display:"flex",alignItems:"center",gap:2,fontSize:mob?9.5:10.5,
            fontWeight:600,color:trend>=0?"#27500A":"#A32D2D"}}>
            {trend>=0?<TrendingUp size={10}/>:<TrendingDown size={10}/>}
            {trend>=0?"+":""}{trend}%
          </span>
        )}
        <p style={{margin:0,fontSize:mob?9:10,color:"#5a6691"}}>{subtitle}</p>
      </div>
    </div>
  );
}
