/* ════════════════════════════════════════════════════════════════════
   SHELL/USERSWITCHER.JSX
   Auto-generated from KBiz360_v2.jsx · 66 lines · 1 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { useUsersAdmin } from '../core/useReference';
import { BranchSwitcher } from './BranchSwitcher';

export function UserSwitcher({currentUser, switchUser, light}){
  const [open,setOpen]=useState(false);
  const _USERS_DATA=useUsersAdmin().data||[];   // DB-backed (/api/auth/users)
  if(!currentUser) return null;
  const roleColor = {
    "Super Admin":"#A32D2D","Director":"#3C1B14",
    "Senior Finance Manager":"#0d1326","Sr. Accounts Executive":"#6B4C8B",
    "Accounts Executive":"#2F7A8E","HR Manager":"#384677",
  };
  const col = roleColor[currentUser.role] || "#5a6691";
  const initials2 = (name) => String(name || "U").substring(0,2).toUpperCase();

  // Fiori Light vs Dark colors
  const bgColor = light ? "#eff4f9" : "rgba(212,164,55,0.08)";
  const borderColor = light ? "#dbe0eb" : "rgba(212,164,55,0.3)";
  const labelColor = light ? "#556b82" : "#d4a437";
  const nameColor = light ? "#24272a" : "#fff";
  const panelBg = light ? "#ffffff" : "#0d1326";
  const panelBorder = light ? "#cbd5e1" : "#1a2340";
  const panelShadow = light ? "0 8px 32px rgba(29, 45, 62, 0.15)" : "0 8px 24px rgba(0,0,0,0.5)";
  const itemBorder = light ? "1px solid #f1f5f9" : "1px solid #1a2340";
  const caretColor = light ? "#556b82" : "#5a6691";

  return (
    <div style={{position:"relative",marginBottom:light?0:7}}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",
          borderRadius:6,background:bgColor,cursor:"pointer",
          border:"1px solid "+borderColor,transition:"all 0.15s ease-in-out"}}
        onMouseEnter={(e)=>{ if(light) e.currentTarget.style.background = "#e5effa"; }}
        onMouseLeave={(e)=>{ if(light) e.currentTarget.style.background = bgColor; }}>
        <div style={{width:24,height:24,borderRadius:"50%",background:col,
          display:"flex",alignItems:"center",justifyContent:"center",
          color:"#fff",fontSize:10,fontWeight:700}}>
          {initials2(currentUser.name || currentUser.email)}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <p style={{margin:0,fontSize:9,color:labelColor,fontWeight:700,
            letterSpacing:"0.3px",textTransform:"uppercase"}}>Viewing as</p>
          <p style={{margin:0,fontSize:11,color:nameColor,fontWeight:600,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {currentUser.name}
          </p>
        </div>
        <span style={{color:caretColor,fontSize:11}}>▾</span>
      </div>
      {open&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:4,
          background:panelBg,border:"1px solid "+panelBorder,borderRadius:6,
          zIndex:500,overflow:"hidden",maxHeight:380,overflowY:"auto",
          boxShadow:panelShadow}}>
          {_USERS_DATA.filter(u=>u.active).map(u=>{
            const sel = u.id===currentUser.id;
            const ucol = roleColor[u.role] || "#5a6691";
            const optBg = sel ? (light ? "rgba(0,112,242,0.08)" : "rgba(212,164,55,0.12)") : "transparent";
            const optColor = sel ? (light ? "#0070f2" : "#d4a437") : (light ? "#334155" : "#fff");
            return (
              <div key={u.id}
                onClick={()=>{switchUser({id:u.id,name:u.name,role:u.role,branches:u.branches});setOpen(false);}}
                style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",
                  background:optBg,cursor:"pointer",
                  borderBottom:itemBorder}}
                onMouseEnter={(e)=>{ if(!sel) e.currentTarget.style.background = light ? "#f1f5f9" : "rgba(255,255,255,0.05)"; }}
                onMouseLeave={(e)=>{ if(!sel) e.currentTarget.style.background = "transparent"; }}>
                <div style={{width:22,height:22,borderRadius:"50%",background:ucol,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:"#fff",fontSize:9.5,fontWeight:700,flexShrink:0}}>
                  {initials2(u.name)}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontSize:11,fontWeight:sel?700:500,
                    color:optColor}}>{u.name}</p>
                  <p style={{margin:0,fontSize:9.5,color:"#64748b"}}>
                    {u.role} · {u.branches.length>3?u.branches.length+" branches":u.branches.join(",")}
                  </p>
                </div>
                {sel&&<span style={{color:optColor,fontSize:11}}>✔</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── BranchSwitcher ── */
