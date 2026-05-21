/* ════════════════════════════════════════════════════════════════════
   SHELL/BRANCHSWITCHER.JSX
   Auto-generated from KBiz360_v2.jsx · 61 lines · 1 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { BRANCHES } from '../core/data';
import { Dashboard } from '../modules/dashboard';

export function BranchSwitcher({branch,setBranch,currentUser}){
  const [open,setOpen]=useState(false);
  const isAll=branch==="ALL";
  const brFlag=isAll?"🌐":branch?.flag||"🇮🇳";
  const brLabel=isAll?"Travkings Group":(branch?.code||"BOM")+" — "+(branch?.city||"");
  const brTagLabel=isAll?"Consolidated":(branch?.isHO?"Main Branch":"Branch");
  return (
    <div style={{position:"relative"}}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",
          borderRadius:8,background:"rgba(255,255,255,0.07)",cursor:"pointer",
          border:"1px solid rgba(255,255,255,0.1)"}}>
        <span style={{fontSize:16}}>{brFlag}</span>
        <div style={{flex:1,minWidth:0}}>
          <p style={{margin:0,fontSize:10,color:"#d4a437",fontWeight:700,
            letterSpacing:"0.3px",textTransform:"uppercase"}}>{brTagLabel}</p>
          <p style={{margin:0,fontSize:11.5,color:"#fff",fontWeight:600,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{brLabel}</p>
        </div>
        <span style={{color:"#5a6691",fontSize:11}}>▾</span>
      </div>
      {open&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:4,
          background:"#0d1326",border:"1px solid #1a2340",borderRadius:9,
          zIndex:400,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
          {(()=>{
            const FULL_SCOPE=["Super Admin","Director","Senior Finance Manager","Sr. Accounts Executive"];
            const isFull = !currentUser || FULL_SCOPE.includes(currentUser.role);
            const allowed = currentUser ? BRANCHES.filter(b=>currentUser.branches.includes(b.code)) : BRANCHES;
            const includeAll = isFull && currentUser?.branches?.length>1;
            const list = includeAll ? [...allowed,{code:"ALL",city:"Travkings Group",country:"Consolidated",flag:"🌐",currency:"INR",tax:"MULTI"}] : allowed;
            return list;
          })().map(b=>{
            const sel=branch==="ALL"?b.code==="ALL":branch?.code===b.code;
            return (
              <div key={b.code||"ALL"}
                onClick={()=>{setBranch(b.code==="ALL"?"ALL":b);setOpen(false);}}
                style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",
                  background:sel?"rgba(212,164,55,0.12)":"transparent",cursor:"pointer",
                  borderBottom:"1px solid #1a2340"}}>
                <span style={{fontSize:16}}>{b.flag}</span>
                <div>
                  <p style={{margin:0,fontSize:11.5,fontWeight:sel?700:400,
                    color:sel?"#d4a437":"#fff"}}>
                    {b.code==="ALL"?"Travkings Group":b.code+" — "+b.city}
                  </p>
                  <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>
                    {b.code==="ALL"?"Consolidated":b.isHO?"Main Branch":"Branch"} · {b.currency||b.cur} · {b.tax||b.taxType||""}
                  </p>
                </div>
                {sel&&<span style={{marginLeft:"auto",color:"#d4a437",fontSize:12}}>✔</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Dashboard ── */
