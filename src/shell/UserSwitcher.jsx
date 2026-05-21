/* ════════════════════════════════════════════════════════════════════
   SHELL/USERSWITCHER.JSX
   Auto-generated from KBiz360_v2.jsx · 66 lines · 1 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { _USERS_DATA } from '../core/data';
import { BranchSwitcher } from './BranchSwitcher';

export function UserSwitcher({currentUser, switchUser}){
  const [open,setOpen]=useState(false);
  const roleColor = {
    "Super Admin":"#A32D2D","Director":"#3C1B14",
    "Senior Finance Manager":"#0d1326","Sr. Accounts Executive":"#6B4C8B",
    "Accounts Executive":"#2F7A8E","HR Manager":"#384677",
  };
  const col = roleColor[currentUser.role] || "#5a6691";
  return (
    <div style={{position:"relative",marginBottom:7}}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",
          borderRadius:7,background:"rgba(212,164,55,0.08)",cursor:"pointer",
          border:"1px solid rgba(212,164,55,0.3)"}}>
        <div style={{width:24,height:24,borderRadius:"50%",background:col,
          display:"flex",alignItems:"center",justifyContent:"center",
          color:"#fff",fontSize:10,fontWeight:700}}>
          {currentUser.name.substring(0,2).toUpperCase()}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <p style={{margin:0,fontSize:9,color:"#d4a437",fontWeight:700,
            letterSpacing:"0.3px",textTransform:"uppercase"}}>Viewing as</p>
          <p style={{margin:0,fontSize:11,color:"#fff",fontWeight:600,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {currentUser.name} — {currentUser.role}
          </p>
        </div>
        <span style={{color:"#5a6691",fontSize:11}}>▾</span>
      </div>
      {open&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:4,
          background:"#0d1326",border:"1px solid #1a2340",borderRadius:9,
          zIndex:500,overflow:"hidden",maxHeight:380,overflowY:"auto",
          boxShadow:"0 8px 24px rgba(0,0,0,0.5)"}}>
          {_USERS_DATA.filter(u=>u.active).map(u=>{
            const sel = u.id===currentUser.id;
            const ucol = roleColor[u.role] || "#5a6691";
            return (
              <div key={u.id}
                onClick={()=>{switchUser({id:u.id,name:u.name,role:u.role,branches:u.branches});setOpen(false);}}
                style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",
                  background:sel?"rgba(212,164,55,0.12)":"transparent",cursor:"pointer",
                  borderBottom:"1px solid #1a2340"}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:ucol,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:"#fff",fontSize:9.5,fontWeight:700,flexShrink:0}}>
                  {u.name.substring(0,2).toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontSize:11,fontWeight:sel?700:500,
                    color:sel?"#d4a437":"#fff"}}>{u.name}</p>
                  <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>
                    {u.role} · {u.branches.length>3?u.branches.length+" branches":u.branches.join(",")}
                  </p>
                </div>
                {sel&&<span style={{color:"#d4a437",fontSize:11}}>✔</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── BranchSwitcher ── */
