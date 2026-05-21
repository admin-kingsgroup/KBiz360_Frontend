/* ════════════════════════════════════════════════════════════════════
   SHELL/TOPBAR.JSX
   Auto-generated from KBiz360_v2.jsx · 71 lines · 1 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Bell, Menu, Search } from 'lucide-react';
import { KBIZ_LOGO } from '../core/brand';
import { getUnreadCount } from '../core/business-logic';
import { useMobile, useNotifRefresh } from '../core/hooks';
import { NotifPanel } from './NotifPanel';
import { UserMenu } from './UserMenu';

export function TopBar({onToggle,setRoute,currentUser,setCurrentUser}){
  const [showNotif,setShowNotif]=useState(false);
  const mob=useMobile();
  useNotifRefresh();
  const unread=getUnreadCount();
  return (
    <>
      <div style={{
        height:52,display:"flex",alignItems:"center",
        justifyContent:"space-between",padding:"0 16px",
        background:"#0d1326",borderBottom:"1px solid #1a2340",
        boxShadow:"0 2px 8px rgba(0,0,0,0.3)",flexShrink:0,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onToggle}
            style={{background:"transparent",border:"none",color:"#8b94b3",
              cursor:"pointer",padding:6,lineHeight:1,display:"flex",alignItems:"center"}}>
            <Menu size={20}/>
          </button>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src={KBIZ_LOGO} alt="KBiz360" style={{width:34,height:34,borderRadius:7,
              display:"block",objectFit:"contain",flexShrink:0}}/>
            <div style={{display:"flex",flexDirection:"column",lineHeight:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"baseline",gap:7}}>
                <span style={{fontSize:15,fontWeight:800,color:"#fff",letterSpacing:"-0.02em"}}>
                  <span style={{color:"#d4a437"}}>KBiz</span>360
                </span>
                {!mob && <span style={{fontSize:10,color:"#8b94b3",fontWeight:600,whiteSpace:"nowrap"}}>Smart Travel ERP</span>}
              </div>
              <span style={{fontSize:8,color:"#d4a437",fontWeight:700,letterSpacing:"1.4px",marginTop:3,whiteSpace:"nowrap"}}>THE BUSINESS ENGINE</span>
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {/* Search button */}
          <button onClick={()=>setRoute&&setRoute("/search")}
            style={{background:"transparent",border:"none",color:"#8b94b3",
              cursor:"pointer",padding:6,display:"flex",alignItems:"center"}}
            title="Global Search">
            <Search size={17}/>
          </button>
          {/* Notification bell */}
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowNotif(s=>!s)}
              style={{background:"transparent",border:"none",color:"#8b94b3",
                cursor:"pointer",padding:6,display:"flex",alignItems:"center"}}>
              <Bell size={18}/>
            </button>
            {unread>0&&(
              <span style={{position:"absolute",top:4,right:4,
                minWidth:16,height:16,borderRadius:"50%",
                background:"#A32D2D",border:"1.5px solid #0d1326",
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
