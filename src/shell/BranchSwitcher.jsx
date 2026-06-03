/* ════════════════════════════════════════════════════════════════════
   SHELL/BRANCHSWITCHER.JSX
   Auto-generated from KBiz360_v2.jsx · 61 lines · 1 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { BRANCHES } from '../core/data';
import { Dashboard } from '../modules/dashboard';

export function BranchSwitcher({branch,setBranch,currentUser,light}){
  const [open,setOpen]=useState(false);
  const isAll=branch==="ALL";
  const brFlag=isAll?"🌐":branch?.flag||"🇮🇳";
  const brLabel=isAll?"Travkings Group":(branch?.code||"BOM")+" — "+(branch?.city||"");
  const brTagLabel=isAll?"Consolidated":(branch?.isHO?"Main Branch":"Branch");

  // Fiori Light vs Dark colors
  const bgColor = light ? "#eff4f9" : "rgba(255,255,255,0.07)";
  const borderColor = light ? "#dbe0eb" : "rgba(255,255,255,0.1)";
  const labelColor = light ? "#0070f2" : "#d4a437";
  const labelText = light ? "#24272a" : "#fff";
  const caretColor = light ? "#556b82" : "#5a6691";
  const panelBg = light ? "#ffffff" : "#0d1326";
  const panelBorder = light ? "#cbd5e1" : "#1a2340";
  const panelShadow = light ? "0 8px 32px rgba(29, 45, 62, 0.15)" : "0 8px 24px rgba(0,0,0,0.4)";
  const itemBorder = light ? "1px solid #f1f5f9" : "1px solid #1a2340";

  return (
    <div style={{position:"relative"}}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{display:"flex",alignItems:"center",gap:8,padding:"7.5px 10px",
          borderRadius:6,background:bgColor,cursor:"pointer",
          border:"1px solid "+borderColor,transition:"all 0.15s ease-in-out"}}
        onMouseEnter={(e)=>{ if(light) e.currentTarget.style.background = "#e5effa"; }}
        onMouseLeave={(e)=>{ if(light) e.currentTarget.style.background = bgColor; }}>
        <span style={{fontSize:16}}>{brFlag}</span>
        <div style={{flex:1,minWidth:0}}>
          <p style={{margin:0,fontSize:9,color:labelColor,fontWeight:700,
            letterSpacing:"0.3px",textTransform:"uppercase"}}>{brTagLabel}</p>
          <p style={{margin:0,fontSize:11.5,color:labelText,fontWeight:600,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{brLabel}</p>
        </div>
        <span style={{color:caretColor,fontSize:11}}>▾</span>
      </div>
      {open&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:4,
          background:panelBg,border:"1px solid "+panelBorder,borderRadius:6,
          zIndex:400,overflow:"hidden",boxShadow:panelShadow}}>
          {(()=>{
            const FULL_SCOPE=["Super Admin","Director","Senior Finance Manager","Sr. Accounts Executive"];
            const userBranches = Array.isArray(currentUser?.branches) ? currentUser.branches : null;
            const isFull = !currentUser || FULL_SCOPE.includes(currentUser.role);
            // No branch list on the user → show all branches (don't crash / blank).
            const allowed = userBranches ? BRANCHES.filter(b=>userBranches.includes(b.code)) : BRANCHES;
            const includeAll = isFull && (userBranches ? userBranches.length>1 : true);
            const list = includeAll ? [...allowed,{code:"ALL",city:"Travkings Group",country:"Consolidated",flag:"🌐",currency:"INR",tax:"MULTI"}] : allowed;
            return list;
          })().map(b=>{
            const sel=branch==="ALL"?b.code==="ALL":branch?.code===b.code;
            const optBg = sel ? (light ? "rgba(0,112,242,0.08)" : "rgba(212,164,55,0.12)") : "transparent";
            const optColor = sel ? (light ? "#0070f2" : "#d4a437") : (light ? "#334155" : "#fff");
            return (
              <div key={b.code||"ALL"}
                onClick={()=>{setBranch(b.code==="ALL"?"ALL":b);setOpen(false);}}
                style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",
                  background:optBg,cursor:"pointer",
                  borderBottom:itemBorder}}
                onMouseEnter={(e)=>{ if(!sel) e.currentTarget.style.background = light ? "#f1f5f9" : "rgba(255,255,255,0.05)"; }}
                onMouseLeave={(e)=>{ if(!sel) e.currentTarget.style.background = "transparent"; }}>
                <span style={{fontSize:16}}>{b.flag}</span>
                <div>
                  <p style={{margin:0,fontSize:11.5,fontWeight:sel?700:400,
                    color:optColor}}>
                    {b.code==="ALL"?"Travkings Group":b.code+" — "+b.city}
                  </p>
                  <p style={{margin:0,fontSize:9.5,color:"#64748b"}}>
                    {b.code==="ALL"?"Consolidated":b.isHO?"Main Branch":"Branch"} · {b.currency||b.cur} · {b.tax||b.taxType||""}
                  </p>
                </div>
                {sel&&<span style={{marginLeft:"auto",color:optColor,fontSize:12}}>✔</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Dashboard ── */
