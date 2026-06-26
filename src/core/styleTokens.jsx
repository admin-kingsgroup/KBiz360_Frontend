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

/* ── Form / control style objects (KBiz360 Pro tokens) ── */
export const inp={
  width:"100%",padding:"8px 11px",border:"1px solid #cdd1d8",
  borderRadius:8,fontSize:12,outline:"none",color:"#14161a",
  boxSizing:"border-box",background:"#fff",
};

export const card={
  background:"#fff",border:"1px solid #cdd1d8",
  borderRadius:12,padding:"14px 16px",
  boxShadow:"0 1px 2px rgba(16,18,22,0.04), 0 6px 20px -10px rgba(16,18,22,0.12)",
};

export const btnG={
  display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,
  padding:"8px 16px",background:"#1a1c22",color:"#fff",
  border:"none",borderRadius:8,fontSize:12.5,fontWeight:600,
  cursor:"pointer",whiteSpace:"nowrap",letterSpacing:"0.01em",
};

export const btnGh={
  display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,
  padding:"7px 15px",background:"#fff",color:"#1a1c22",
  border:"1px solid #cdd1d8",borderRadius:8,fontSize:12.5,fontWeight:600,
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
export const RPT_thStyle={padding:"10px 12px",textAlign:"left",fontWeight:600,color:"#5b616e",borderBottom:"1px solid #cdd1d8",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase",background:"#f4f5f7"};
export const RPT_tdStyle={padding:"8px 12px",fontSize:12,color:"#14161a",borderBottom:"1px solid #dfe2e7"};

/* ── KPI summary card ── */
export function KpiCard({label,value,subtitle,trend,Icon,accent="neutral",onClick}){
  const mob=useMobile();
  const [pressed,setPressed]=useState(false);
  const ac={
    info:   {bg:"#e8f0ff",c:"#2563eb",b:"#cfe0ff"},
    success:{bg:"#e8f6ed",c:"#16a34a",b:"#bfe6cc"},
    warning:{bg:"#fbeedb",c:"#b45309",b:"#f5d9a8"},
    danger: {bg:"#fbe9e9",c:"#dc2626",b:"#f3c0c0"},
    neutral:{bg:"#f4f5f7",c:"#5b616e",b:"#e6e8ec"},
  }[accent]||{bg:"#f4f5f7",c:"#5b616e",b:"#e6e8ec"};
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
