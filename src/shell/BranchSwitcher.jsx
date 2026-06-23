/* ════════════════════════════════════════════════════════════════════
   SHELL/BRANCHSWITCHER.JSX
   Auto-generated from KBiz360_v2.jsx · 61 lines · 1 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BRANCHES, CONSOLIDATED_LABEL } from '../core/data';
/* (Removed dead `import { Dashboard } from '../modules/dashboard'` — only a
   comment referenced it. This shell component is eager, so the import was
   dragging the whole dashboard feature + recharts into the initial bundle.) */

export function BranchSwitcher({branch,setBranch,currentUser,light}){
  const [open,setOpen]=useState(false);
  const triggerRef=useRef(null);
  const [pos,setPos]=useState(null);
  // Measure the trigger so the menu can be portaled to <body> and shown on top of
  // EVERYTHING. The app-bar that hosts this switcher sets its own stacking context
  // (z-40 + backdrop-blur), which otherwise traps the dropdown beneath page content
  // no matter how high its local z-index is. A portal + fixed positioning escapes it.
  const place=()=>{ const el=triggerRef.current; if(!el) return; const r=el.getBoundingClientRect(); setPos({top:r.bottom+4,left:r.left,width:r.width}); };
  useEffect(()=>{
    if(!open) return;
    place();
    const onPointer=(e)=>{
      if(triggerRef.current&&triggerRef.current.contains(e.target)) return;
      if(e.target.closest&&e.target.closest('[data-branch-menu]')) return;
      setOpen(false);
    };
    const onKey=(e)=>{ if(e.key==='Escape') setOpen(false); };
    const reflow=()=>place();
    document.addEventListener('mousedown',onPointer);
    document.addEventListener('keydown',onKey);
    window.addEventListener('resize',reflow);
    window.addEventListener('scroll',reflow,true);
    return ()=>{
      document.removeEventListener('mousedown',onPointer);
      document.removeEventListener('keydown',onKey);
      window.removeEventListener('resize',reflow);
      window.removeEventListener('scroll',reflow,true);
    };
  },[open]);
  const isAll=branch==="ALL";
  const brFlag=isAll?"🌐":branch?.flag||"🇮🇳";
  const brLabel=isAll?CONSOLIDATED_LABEL:(branch?.code||"BOM")+(branch?.city?" — "+branch.city:"");
  const brTagLabel=isAll?"Consolidated":(branch?.isHO?"Main Branch":"Branch");

  // Fiori Light vs Dark colors
  const bgColor = light ? "#eff4f9" : "rgba(255,255,255,0.07)";
  const borderColor = light ? "#dbe0eb" : "rgba(255,255,255,0.1)";
  const labelColor = light ? "#2563eb" : "#c2a04a";
  const labelText = light ? "#14161a" : "#fff";
  const caretColor = light ? "#556b82" : "#5a6691";
  const panelBg = light ? "#ffffff" : "#1a1c22";
  const panelBorder = light ? "#cbd5e1" : "#1a2340";
  const panelShadow = light ? "0 8px 32px rgba(29, 45, 62, 0.15)" : "0 8px 24px rgba(0,0,0,0.4)";
  const itemBorder = light ? "1px solid #f1f5f9" : "1px solid #1a2340";

  return (
    <div ref={triggerRef} style={{position:"relative"}}>
      <div onClick={()=>{ place(); setOpen(o=>!o); }}
        role="button" tabIndex={0} aria-haspopup="listbox" aria-expanded={open}
        onKeyDown={(e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); place(); setOpen(o=>!o); } }}
        className="max-desktop:min-h-[44px]"
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
      {open&&pos&&createPortal(
        <div data-branch-menu style={{position:"fixed",top:pos.top,left:pos.left,width:pos.width,
          background:panelBg,border:"1px solid "+panelBorder,borderRadius:6,
          zIndex:99999,overflow:"hidden",boxShadow:panelShadow}}>
          {(()=>{
            const FULL_SCOPE=["Super Admin","Director","Senior Finance Manager","Sr. Accounts Executive"];
            const userBranches = Array.isArray(currentUser?.branches) ? currentUser.branches : null;
            const isFull = !currentUser || FULL_SCOPE.includes(currentUser.role);
            // Full-scope roles always see every branch (incl. any newly added, e.g.
            // TKHO) even if their stored list is stale; others are filtered to theirs.
            const allowed = (isFull || !userBranches) ? BRANCHES : BRANCHES.filter(b=>userBranches.includes(b.code));
            const includeAll = isFull && allowed.length>1;
            const list = includeAll ? [...allowed,{code:"ALL",city:CONSOLIDATED_LABEL,country:"Consolidated",flag:"🌐",currency:"INR",tax:"MULTI"}] : allowed;
            return list;
          })().map(b=>{
            const sel=branch==="ALL"?b.code==="ALL":branch?.code===b.code;
            const optBg = sel ? (light ? "rgba(0,112,242,0.08)" : "rgba(212,164,55,0.12)") : "transparent";
            const optColor = sel ? (light ? "#2563eb" : "#c2a04a") : (light ? "#334155" : "#fff");
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
                    {b.code==="ALL"?CONSOLIDATED_LABEL:b.code+(b.city?" — "+b.city:"")}
                  </p>
                  <p style={{margin:0,fontSize:9.5,color:"#64748b"}}>
                    {b.code==="ALL"?"Consolidated":b.isHO?"Main Branch":"Branch"} · {b.currency||b.cur} · {b.tax||b.taxType||""}
                  </p>
                </div>
                {sel&&<span style={{marginLeft:"auto",color:optColor,fontSize:12}}>✔</span>}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── Dashboard ── */
