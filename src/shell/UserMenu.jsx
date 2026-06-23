/* ════════════════════════════════════════════════════════════════════
   SHELL/USERMENU.JSX
   Auto-generated from KBiz360_v2.jsx · 127 lines · 2 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { confirmDialog } from '../core/ux/confirm';
import { toast } from '../core/ux/toast';
import { createPortal } from 'react-dom';
import { Bell, Lock, LogOut, Menu, Settings, User } from 'lucide-react';
import { Icon } from '../core/styleTokens';

export function UserMenu({currentUser, setCurrentUser, setRoute}){
  const [open, setOpen] = useState(false);
  const [triggerHover, setTriggerHover] = useState(false);
  if(!currentUser) return null;
  const initials = String(currentUser.name || currentUser.email || "U")
    .split(" ")
    .map(s => s[0])
    .slice(0,2)
    .join("")
    .toUpperCase();
  const roleColor = {
    "Super Admin":"#A32D2D", "Director":"#3C1B14",
    "Senior Finance Manager":"#1a1c22", "Sr. Accounts Executive":"#6B4C8B",
    "Accounts Executive":"#2F7A8E", "HR Manager":"#384677",
  };
  const ringColor = roleColor[currentUser.role] || "#c2a04a";

  const handleSignOut = async () => {
    setOpen(false);
    const { confirmed } = await confirmDialog({ title: "Sign out of KBiz360?", confirmLabel: "Sign out", danger: true });
    if (confirmed) setCurrentUser(null);
  };

  return (
    <>
      <div style={{position:"relative",marginLeft:4}}>
        <div onClick={()=>setOpen(o=>!o)}
          onMouseEnter={()=>setTriggerHover(true)}
          onMouseLeave={()=>setTriggerHover(false)}
          role="button" tabIndex={0} aria-haspopup="menu" aria-expanded={open}
          aria-label={currentUser.name+" — account menu"}
          onKeyDown={(e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); setOpen(o=>!o); } }}
          title={currentUser.name+" — Click for menu"}
          className="max-desktop:min-h-[44px] max-desktop:min-w-[44px]"
          style={{width:32,height:32,borderRadius:"50%",
            background:"linear-gradient(135deg,#c2a04a,#9a6810)",
            border:"2px solid "+ringColor,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:11.5,fontWeight:800,color:"#fff",cursor:"pointer",
            WebkitTapHighlightColor:"transparent",userSelect:"none",
            boxShadow: open || triggerHover ? `0 0 0 3px ${ringColor}33` : "none",
            transition:"all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            transform:open?"scale(1.05)":"scale(1)"}}>
          {initials}
        </div>
      </div>
      {open && createPortal(
        <>
          <style>{`
            @keyframes userMenuFadeIn {
              from {
                opacity: 0;
                transform: translateY(-8px) scale(0.96);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
            .user-menu-dropdown {
              animation: userMenuFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              transform-origin: top right;
            }
          `}</style>
          <div onClick={()=>setOpen(false)}
            style={{position:"fixed",inset:0,zIndex:99998}}/>
          <div className="user-menu-dropdown" style={{position:"fixed",top:54,right:12,
            background:"rgba(255, 255, 255, 0.98)",
            backdropFilter:"blur(12px)",
            WebkitBackdropFilter:"blur(12px)",
            borderRadius:12,minWidth:240,zIndex:99999,
            boxShadow:"0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 16px -6px rgba(0,0,0,0.05)",
            border:"1px solid rgba(225, 227, 236, 0.8)",overflow:"hidden"}}>
            {/* Profile header */}
            <div style={{
              padding: "16px 16px 12px 16px",
              background: "#f8fafc",
              borderBottom: "1px solid #f1f5f9"
            }}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:40,height:40,borderRadius:"50%",
                  background:"linear-gradient(135deg,#c2a04a,#9a6810)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,fontWeight:800,color:"#fff",flexShrink:0,
                  boxShadow: "0 2px 4px rgba(212, 164, 55, 0.2)"}}>
                  {initials}
                </div>
                <div style={{minWidth:0, display:"flex", flexDirection:"column", gap:1}}>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0f172a",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {currentUser.name}
                  </p>
                  <p style={{margin:0,fontSize:11,color:"#64748b",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                    lineHeight: "1.2"}}>
                    {currentUser.email}
                  </p>
                  <div style={{marginTop: 3}}>
                    <span style={{
                      display: "inline-block",
                      fontSize: 8.5,
                      fontWeight: 700,
                      color: ringColor === "#1a1c22" ? "#334155" : ringColor,
                      background: (ringColor === "#1a1c22" ? "#334155" : ringColor) + "15",
                      padding: "1.5px 5px",
                      borderRadius: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      {currentUser.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* Menu actions */}
            <div style={{padding:"6px"}}>
              <MenuItem icon={User} label="My Profile" onClick={()=>{setOpen(false);setRoute&&setRoute("/settings/profile");}}/>
              <MenuItem icon={Bell} label="My Notifications" onClick={()=>{setOpen(false);setRoute&&setRoute("/dashboard");}}/>
              <MenuItem icon={Settings} label="Preferences" onClick={()=>{setOpen(false);setRoute&&setRoute("/settings/preferences");}}/>
              <MenuItem icon={Lock} label="Change Password" onClick={()=>{setOpen(false);toast("Password change isn't available yet.","info");}}/>
              <div style={{height:1,background:"#f1f5f9",margin:"6px 0"}}/>
              <MenuItem icon={LogOut} label="Sign Out" onClick={handleSignOut} danger={true}/>
            </div>
            {/* Footer */}
            <div style={{
              padding: "10px 16px",
              background: "#f8fafc",
              borderTop: "1px solid #f1f5f9",
              fontSize: 9,
              fontWeight: 600,
              color: "#94a3b8",
              textAlign: "center",
              letterSpacing: "0.5px"
            }}>
              KBIZ360 V1.0 • THE BUSINESS ENGINE
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}


export function MenuItem({icon:Icon, label, onClick, danger}){
  const [hovered, setHovered] = useState(false);
  const activeBg = danger ? "#fef2f2" : "#f1f5f9";
  const activeFg = danger ? "#ef4444" : "#0f172a";
  const normalFg = danger ? "#b91c1c" : "#334155";
  const iconColor = danger ? (hovered ? "#ef4444" : "#b91c1c") : (hovered ? "#2563eb" : "#64748b");

  return (
    <div onClick={onClick}
      onMouseEnter={()=>setHovered(true)}
      onMouseLeave={()=>setHovered(false)}
      style={{
        display:"flex",alignItems:"center",gap:8,
        padding:"8px 12px",cursor:"pointer",minHeight:36,
        borderRadius: 6,
        background: hovered ? activeBg : "transparent",
        color: hovered ? activeFg : normalFg,
        transform: hovered ? "translateX(2px)" : "translateX(0)",
        transition: "all 0.15s ease",
        WebkitTapHighlightColor:"transparent",userSelect:"none",
        touchAction:"manipulation"
      }}>
      {Icon && <Icon size={14} style={{color: iconColor, transition: "color 0.15s ease"}}/>}
      <span style={{fontSize:12,fontWeight: danger ? 600 : 500}}>{label}</span>
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
