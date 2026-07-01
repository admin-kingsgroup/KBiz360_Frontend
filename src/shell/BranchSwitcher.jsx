/* ════════════════════════════════════════════════════════════════════
   SHELL/BRANCHSWITCHER.JSX — accessible branch picker (button + listbox).
   Keyboard: Enter/Space/↓ open (focus selected); ↑/↓ move, Home/End jump,
   type-ahead by branch code, Enter/Space select, Esc close + return focus.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BRANCHES, CONSOLIDATED_LABEL } from '../core/data';
import { rovingNextIndex } from '../core/ux/focus';

export function BranchSwitcher({branch,setBranch,currentUser,light}){
  const [open,setOpen]=useState(false);
  const [activeIndex,setActiveIndex]=useState(-1);
  const triggerRef=useRef(null);
  const listRef=useRef(null);
  const itemRefs=useRef([]);
  const typeahead=useRef({buffer:'',timer:null});
  const [pos,setPos]=useState(null);
  // Measure the trigger so the menu can be portaled to <body> and shown on top of
  // EVERYTHING. The app-bar that hosts this switcher sets its own stacking context
  // (z-40 + backdrop-blur), which otherwise traps the dropdown beneath page content.
  const place=useCallback(()=>{ const el=triggerRef.current; if(!el) return; const r=el.getBoundingClientRect(); setPos({top:r.bottom+4,left:r.left,width:r.width}); },[]);

  const isAll=branch==="ALL";
  const brFlag=isAll?"🌐":branch?.flag||"🇮🇳";
  const brLabel=isAll?CONSOLIDATED_LABEL:(branch?.code||"BOM")+(branch?.city?" — "+branch.city:"");
  const brTagLabel=isAll?"Consolidated":(branch?.isHO?"Main Branch":"Branch");

  // The branches this user may switch to, plus a Consolidated (ALL) row.
  const list=useMemo(()=>{
    const FULL_SCOPE=["Super Admin","Director","Senior Finance Manager","Sr. Accounts Executive"];
    const userBranches = Array.isArray(currentUser?.branches) ? currentUser.branches : null;
    const isFull = !currentUser || FULL_SCOPE.includes(currentUser.role);
    const allowed = (isFull || !userBranches) ? BRANCHES : BRANCHES.filter(b=>userBranches.includes(b.code));
    const includeAll = isFull && allowed.length>1;
    return includeAll ? [...allowed,{code:"ALL",city:CONSOLIDATED_LABEL,country:"Consolidated",flag:"🌐",currency:"INR",tax:"MULTI"}] : allowed;
  },[currentUser]);

  const isSel=useCallback((b)=> branch==="ALL"?b.code==="ALL":branch?.code===b.code,[branch]);
  const selectedIndex=list.findIndex(isSel);

  const close=useCallback((restoreFocus=true)=>{ setOpen(false); setActiveIndex(-1); if(restoreFocus&&triggerRef.current){ try{triggerRef.current.focus();}catch{/* ignore */} } },[]);
  const openMenu=useCallback(()=>{ place(); setOpen(true); setActiveIndex(selectedIndex>=0?selectedIndex:0); },[place,selectedIndex]);
  const choose=useCallback((b)=>{ setBranch(b.code==="ALL"?"ALL":b); close(true); },[setBranch,close]);

  // Focus the active option as roving focus moves.
  useEffect(()=>{ if(open&&activeIndex>=0){ const el=itemRefs.current[activeIndex]; if(el){ try{el.focus();}catch{/* ignore */} } } },[open,activeIndex]);

  // Outside-click + Esc + reposition while open.
  useEffect(()=>{
    if(!open) return undefined;
    place();
    const onPointer=(e)=>{
      if(triggerRef.current&&triggerRef.current.contains(e.target)) return;
      if(listRef.current&&listRef.current.contains(e.target)) return;
      close(false);
    };
    const onKey=(e)=>{ if(e.key==='Escape') close(true); };
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
  },[open,place,close]);

  const onTriggerKey=(e)=>{
    if(e.key==='ArrowDown'||e.key==='Enter'||e.key===' '){ e.preventDefault(); openMenu(); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); place(); setOpen(true); setActiveIndex(list.length-1); }
  };
  const onListKey=(e)=>{
    if(e.key==='Tab'){ e.preventDefault(); close(true); return; }
    if(e.key==='Enter'||e.key===' '){ e.preventDefault(); choose(list[activeIndex]); return; }
    const next=rovingNextIndex(e.key,activeIndex,list.length,{orientation:'vertical'});
    if(next!=null){ e.preventDefault(); setActiveIndex(next); return; }
    if(e.key.length===1&&/\S/.test(e.key)){
      const ta=typeahead.current; ta.buffer+=e.key.toLowerCase();
      if(ta.timer) clearTimeout(ta.timer); ta.timer=setTimeout(()=>{ta.buffer='';},600);
      const i=list.findIndex(b=>String(b.code||'').toLowerCase().startsWith(ta.buffer));
      if(i>=0){ setActiveIndex(i); e.preventDefault(); }
    }
  };

  // Fiori Light vs Dark colors
  const bgColor = light ? "#eff4f9" : "rgba(255,255,255,0.07)";
  const borderColor = light ? "#dbe0eb" : "rgba(255,255,255,0.1)";
  const labelColor = light ? "#2563eb" : "#c2a04a";
  const labelText = light ? "#14161a" : "#fff";
  const caretColor = light ? "#556b82" : "#5a6691";
  const panelBg = light ? "#ffffff" : "#1a1c22";
  const panelBorder = light ? "#cbd5e1" : "#1a2340";
  const panelShadow = light ? "0 8px 32px rgba(29, 45, 62, 0.15)" : "0 8px 24px rgba(0,0,0,0.4)";
  const itemBorder = light ? "1px solid #dfe2e7" : "1px solid #1a2340";

  return (
    <div style={{position:"relative"}}>
      <button type="button"
        ref={triggerRef}
        onClick={()=>{ open?close(true):openMenu(); }}
        onKeyDown={onTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Branch: ${brLabel}. Change branch`}
        className="max-desktop:min-h-[44px]"
        style={{display:"flex",alignItems:"center",gap:8,padding:"7.5px 10px",width:"100%",textAlign:"left",
          borderRadius:6,background:bgColor,cursor:"pointer",
          border:"1px solid "+borderColor,transition:"all 0.15s ease-in-out"}}
        onMouseEnter={(e)=>{ if(light) e.currentTarget.style.background = "#e5effa"; }}
        onMouseLeave={(e)=>{ if(light) e.currentTarget.style.background = bgColor; }}>
        <span style={{fontSize:16}} aria-hidden="true">{brFlag}</span>
        <div style={{flex:1,minWidth:0}}>
          <p style={{margin:0,fontSize:9,color:labelColor,fontWeight:700,
            letterSpacing:"0.3px",textTransform:"uppercase"}}>{brTagLabel}</p>
          <p style={{margin:0,fontSize:11.5,color:labelText,fontWeight:600,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{brLabel}</p>
        </div>
        <span style={{color:caretColor,fontSize:11}} aria-hidden="true">▾</span>
      </button>
      {open&&pos&&createPortal(
        <div ref={listRef} role="listbox" aria-label="Select branch" onKeyDown={onListKey}
          style={{position:"fixed",top:pos.top,left:pos.left,width:pos.width,
          background:panelBg,border:"1px solid "+panelBorder,borderRadius:6,
          zIndex:99999,overflow:"hidden",boxShadow:panelShadow}}>
          {list.map((b,i)=>{
            const sel=isSel(b);
            const optBg = sel ? (light ? "rgba(0,112,242,0.08)" : "rgba(212,164,55,0.12)") : "transparent";
            const optColor = sel ? (light ? "#2563eb" : "#c2a04a") : (light ? "#334155" : "#fff");
            return (
              <button key={b.code||"ALL"} type="button"
                ref={(el)=>{ itemRefs.current[i]=el; }}
                role="option" aria-selected={sel} tabIndex={-1}
                onClick={()=>choose(b)}
                onMouseEnter={()=>setActiveIndex(i)}
                style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",width:"100%",textAlign:"left",
                  background:activeIndex===i?(light?"#f1f5f9":"rgba(255,255,255,0.05)"):optBg,cursor:"pointer",
                  border:"none",borderBottom:itemBorder}}>
                <span style={{fontSize:16}} aria-hidden="true">{b.flag}</span>
                <div>
                  <p style={{margin:0,fontSize:11.5,fontWeight:sel?700:400,
                    color:optColor}}>
                    {b.code==="ALL"?CONSOLIDATED_LABEL:b.code+(b.city?" — "+b.city:"")}
                  </p>
                  <p style={{margin:0,fontSize:9.5,color:"#64748b"}}>
                    {b.code==="ALL"?"Consolidated":b.isHO?"Main Branch":"Branch"} · {b.currency||b.cur} · {b.tax||b.taxType||""}
                  </p>
                </div>
                {sel&&<span style={{marginLeft:"auto",color:optColor,fontSize:12}} aria-hidden="true">✔</span>}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── Dashboard ── */
