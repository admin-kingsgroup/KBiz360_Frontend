/* ════════════════════════════════════════════════════════════════════
   SHELL/USERMENU.JSX
   Auto-generated from KBiz360_v2.jsx · 127 lines · 2 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Bell, Lock, LogOut, Menu, Settings, User } from 'lucide-react';
import { Icon } from '../core/styles';

export function UserMenu({currentUser, setCurrentUser, setRoute}){
  const [open, setOpen] = useState(false);
  if(!currentUser) return null;
  const initials = String(currentUser.name || currentUser.email || "U")
    .split(" ")
    .map(s => s[0])
    .slice(0,2)
    .join("")
    .toUpperCase();
  const roleColor = {
    "Super Admin":"#A32D2D", "Director":"#3C1B14",
    "Senior Finance Manager":"#0d1326", "Sr. Accounts Executive":"#6B4C8B",
    "Accounts Executive":"#2F7A8E", "HR Manager":"#384677",
  };
  const ringColor = roleColor[currentUser.role] || "#d4a437";

  const handleSignOut = () => {
    setOpen(false);
    if(window.confirm("Sign out of KBiz360?")) {
      setCurrentUser(null);
    }
  };

  return (
    <>
      <div style={{position:"relative",marginLeft:4}}>
        <div onClick={()=>setOpen(o=>!o)}
          title={currentUser.name+" — Click for menu"}
          style={{width:32,height:32,borderRadius:"50%",
            background:"linear-gradient(135deg,#d4a437,#9a6810)",
            border:"2px solid "+ringColor,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:11.5,fontWeight:800,color:"#fff",cursor:"pointer",
            WebkitTapHighlightColor:"transparent",userSelect:"none",
            transition:"transform 0.15s",
            transform:open?"scale(1.05)":"scale(1)"}}>
          {initials}
        </div>
      </div>
      {open && (
        <>
          <div onClick={()=>setOpen(false)}
            style={{position:"fixed",inset:0,zIndex:599}}/>
          <div style={{position:"absolute",top:54,right:12,
            background:"#fff",borderRadius:8,minWidth:240,zIndex:600,
            boxShadow:"0 8px 24px rgba(0,0,0,0.25)",
            border:"1px solid #e1e3ec",overflow:"hidden"}}>
            {/* Profile header */}
            <div style={{padding:"14px 14px",background:"#0d1326",color:"#fff"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:38,height:38,borderRadius:"50%",
                  background:"linear-gradient(135deg,#d4a437,#9a6810)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:13,fontWeight:800,color:"#fff",flexShrink:0}}>
                  {initials}
                </div>
                <div style={{minWidth:0}}>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:"#fff",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {currentUser.name}
                  </p>
                  <p style={{margin:0,fontSize:10,color:"#d4a437",fontWeight:600}}>
                    {currentUser.role}
                  </p>
                </div>
              </div>
              <p style={{margin:"8px 0 0",fontSize:10,color:"#8b94b3",
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {currentUser.email}
              </p>
            </div>
            {/* Menu actions */}
            <div style={{padding:"6px 0"}}>
              <MenuItem icon={User} label="My Profile" onClick={()=>{setOpen(false);setRoute&&setRoute("/settings/profile");}}/>
              <MenuItem icon={Bell} label="My Notifications" onClick={()=>{setOpen(false);setRoute&&setRoute("/dashboard");}}/>
              <MenuItem icon={Settings} label="Preferences" onClick={()=>{setOpen(false);setRoute&&setRoute("/settings/preferences");}}/>
              <MenuItem icon={Lock} label="Change Password" onClick={()=>{setOpen(false);alert("Password change form would open here");}}/>
              <div style={{height:1,background:"#e1e3ec",margin:"6px 0"}}/>
              {/* Sign Out — prominent red */}
              <div onClick={handleSignOut}
                style={{display:"flex",alignItems:"center",gap:10,
                  padding:"11px 14px",cursor:"pointer",minHeight:44,
                  background:"#fff",color:"#A32D2D",fontWeight:700,
                  WebkitTapHighlightColor:"transparent",userSelect:"none",
                  touchAction:"manipulation"}}
                onMouseOver={e=>e.currentTarget.style.background="#fff5f5"}
                onMouseOut={e=>e.currentTarget.style.background="#fff"}>
                <LogOut size={16} style={{color:"#A32D2D"}}/>
                <span style={{fontSize:12.5,fontWeight:700}}>Sign Out</span>
              </div>
            </div>
            {/* Footer */}
            <div style={{padding:"8px 14px",background:"#f7f8fb",
              borderTop:"1px solid #e1e3ec",fontSize:9.5,color:"#5a6691",
              textAlign:"center"}}>
              KBiz360 v1.0 · THE BUSINESS ENGINE
            </div>
          </div>
        </>
      )}
    </>
  );
}


export function MenuItem({icon:Icon, label, onClick}){
  return (
    <div onClick={onClick}
      style={{display:"flex",alignItems:"center",gap:10,
        padding:"10px 14px",cursor:"pointer",minHeight:42,
        background:"#fff",color:"#0d1326",
        WebkitTapHighlightColor:"transparent",userSelect:"none",
        touchAction:"manipulation"}}
      onMouseOver={e=>e.currentTarget.style.background="#f7f8fb"}
      onMouseOut={e=>e.currentTarget.style.background="#fff"}>
      {Icon && <Icon size={15} style={{color:"#5a6691"}}/>}
      <span style={{fontSize:12.5,fontWeight:500}}>{label}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   LOGIN SCREEN  —  Travkings + KBiz360 dual branding
   - Split-screen layout (Travkings story on left · login form on right)
   - Cosmetic email/password form
   - One-click demo access via 9 real user profiles
   - Fully mobile-responsive (stacks vertically on phones)
   ════════════════════════════════════════════════════════════════════ */
