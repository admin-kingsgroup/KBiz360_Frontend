/* ════════════════════════════════════════════════════════════════════
   SHELL/TOPBAR.JSX
   Auto-generated from KBiz360_v2.jsx · 71 lines · 1 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Bell, Printer } from 'lucide-react';
import { openPrintPreview } from '../core/PrintPreview';
import { KBIZ_LOGO } from '../core/brand';
import { getUnreadCount } from '../core/business-logic';
import { useMobile, useNotifRefresh } from '../core/hooks';
import { NotifPanel } from './NotifPanel';
import { UserMenu } from './UserMenu';
import { ModuleSearch } from './ModuleSearch';

export function TopBar({setRoute,currentUser,setCurrentUser,branch}){
  const [showNotif,setShowNotif]=useState(false);
  const mob=useMobile();
  useNotifRefresh();
  const unread=getUnreadCount();
  return (
    <>
      <div style={{
        height:52,display:"flex",alignItems:"center",
        justifyContent:"space-between",padding:"0 16px",
        background:"#ffffff",borderBottom:"1px solid #e5e5e5",
        boxShadow:"0 2px 8px rgba(0,0,0,0.04)",flexShrink:0,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src={KBIZ_LOGO} alt="KBiz360" style={{width:34,height:34,borderRadius:7,
              display:"block",objectFit:"contain",flexShrink:0}}/>
            <div style={{display:"flex",flexDirection:"column",lineHeight:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"baseline",gap:7}}>
                <span style={{fontSize:16,fontWeight:800,color:"#24272a",letterSpacing:"-0.02em"}}>
                  <span style={{color:"#0070f2"}}>KBiz</span>360
                </span>
                {!mob && <span style={{fontSize:10,color:"#5a6691",fontWeight:600,whiteSpace:"nowrap"}}>Smart Travel ERP</span>}
              </div>
              <span style={{fontSize:8,color:"#0070f2",fontWeight:700,letterSpacing:"1.4px",marginTop:3,whiteSpace:"nowrap"}}>THE BUSINESS ENGINE</span>
            </div>
          </div>
        </div>

        {/* Module / page search — type any module or sub-module to jump there */}
        <ModuleSearch branch={branch} currentUser={currentUser} setRoute={setRoute}/>

        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {/* Global Print / Save-as-PDF — opens the in-app A4 preview of the current screen */}
          <button title="Print / Save as PDF" onClick={()=>openPrintPreview({ selector:'main', title:'Document', recommend:'portrait' })}
            style={{background:"transparent",border:"none",color:"#5a6691",cursor:"pointer",padding:6,display:"flex",alignItems:"center",borderRadius:4,transition:"all 0.15s ease-in-out"}}
            onMouseEnter={e=>{e.currentTarget.style.color="#0070f2";e.currentTarget.style.background="rgba(0,112,242,0.05)"}}
            onMouseLeave={e=>{e.currentTarget.style.color="#5a6691";e.currentTarget.style.background="transparent"}}>
            <Printer size={18}/>
          </button>
          {/* Notification bell */}
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowNotif(s=>!s)}
              style={{background:"transparent",border:"none",color:"#5a6691",
                cursor:"pointer",padding:6,display:"flex",alignItems:"center",
                borderRadius:4,transition:"all 0.15s ease-in-out"}}
              onMouseEnter={e=>{e.currentTarget.style.color="#0070f2";e.currentTarget.style.background="rgba(0,112,242,0.05)"}}
              onMouseLeave={e=>{e.currentTarget.style.color="#5a6691";e.currentTarget.style.background="transparent"}}>
              <Bell size={18}/>
            </button>
            {unread>0&&(
              <span style={{position:"absolute",top:4,right:4,
                minWidth:16,height:16,borderRadius:"50%",
                background:"#e01a1a",border:"1.5px solid #ffffff",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:9,fontWeight:800,color:"#fff",padding:"0 3px"}}>
                {unread>9?"9+":unread}
              </span>
            )}
          </div>
          <UserMenu currentUser={currentUser} setCurrentUser={setCurrentUser} setRoute={setRoute}/>
        </div>
      </div>
      {/* Notification panel overlay */}
      {showNotif&&(
        <>
          <div style={{position:"fixed",inset:0,zIndex:599}} onClick={()=>setShowNotif(false)}/>
          <NotifPanel onClose={()=>setShowNotif(false)} setRoute={r=>{setRoute&&setRoute(r);setShowNotif(false);}}/>
        </>
      )}
    </>
  );
}
