/* ════════════════════════════════════════════════════════════════════
   SHELL/USERMENU.JSX — accessible account menu (button + menu).
   Keyboard: Enter/Space/↓ open (focus first); ↑/↓ move, Home/End jump,
   Enter/Space activate, Esc/Tab close + return focus. Dropdown is anchored
   to the trigger (no hardcoded header offset).
   ════════════════════════════════════════════════════════════════════ */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { confirmDialog } from '../core/ux/confirm';
import { toast } from '../core/ux/toast';
import { createPortal } from 'react-dom';
import { Bell, Lock, LogOut, Settings, User } from 'lucide-react';
import { rovingNextIndex } from '../core/ux/focus';

export function UserMenu({currentUser, setCurrentUser, setRoute, onOpenNotifications}){
  const [open, setOpen] = useState(false);
  const [triggerHover, setTriggerHover] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
  }, []);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false); setActiveIndex(-1);
    if (restoreFocus && triggerRef.current) { try { triggerRef.current.focus(); } catch { /* ignore */ } }
  }, []);

  const handleSignOut = useCallback(async () => {
    close(false);
    const { confirmed } = await confirmDialog({ title: "Sign out of KBiz360?", confirmLabel: "Sign out", danger: true });
    if (confirmed) setCurrentUser(null);
  }, [close, setCurrentUser]);

  // Action list — order matters for roving focus.
  const actions = [
    { icon: User, label: 'My Profile', onSelect: () => { close(false); setRoute && setRoute('/settings/profile'); } },
    { icon: Bell, label: 'My Notifications', onSelect: () => { close(false); onOpenNotifications ? onOpenNotifications() : (setRoute && setRoute('/dashboard')); } },
    { icon: Settings, label: 'Preferences', onSelect: () => { close(false); setRoute && setRoute('/settings/preferences'); } },
    { icon: Lock, label: 'Change Password', onSelect: () => { close(false); toast("Password change isn't available yet.", 'info'); } },
    { icon: LogOut, label: 'Sign Out', danger: true, onSelect: handleSignOut },
  ];

  const openMenu = useCallback((edge = 'first') => {
    place(); setOpen(true);
    setActiveIndex(edge === 'last' ? actions.length - 1 : 0);
  }, [place]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (open && activeIndex >= 0) { const el = itemRefs.current[activeIndex]; if (el) { try { el.focus(); } catch { /* ignore */ } } } }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      close(false);
    };
    const reflow = () => place();
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('resize', reflow);
    window.addEventListener('scroll', reflow, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('resize', reflow);
      window.removeEventListener('scroll', reflow, true);
    };
  }, [open, place, close]);

  if(!currentUser) return null;
  const initials = String(currentUser.name || currentUser.email || "U")
    .split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();
  const roleColor = {
    "Super Admin":"#A32D2D", "Director":"#3C1B14",
    "Senior Finance Manager":"#1a1c22", "Sr. Accounts Executive":"#6B4C8B",
    "Accounts Executive":"#2F7A8E", "HR Manager":"#384677",
  };
  const ringColor = roleColor[currentUser.role] || "#c2a04a";

  const onTriggerKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMenu('first'); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); openMenu('last'); }
  };
  const onMenuKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
    if (e.key === 'Tab') { e.preventDefault(); close(true); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); actions[activeIndex]?.onSelect(); return; }
    const next = rovingNextIndex(e.key, activeIndex, actions.length, { orientation: 'vertical' });
    if (next != null) { e.preventDefault(); setActiveIndex(next); }
  };

  return (
    <>
      <div style={{position:"relative",marginLeft:4}}>
        <button type="button"
          ref={triggerRef}
          onClick={()=> open ? close(true) : openMenu('first')}
          onKeyDown={onTriggerKey}
          onMouseEnter={()=>setTriggerHover(true)}
          onMouseLeave={()=>setTriggerHover(false)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`${currentUser.name} — account menu`}
          title={currentUser.name+" — menu"}
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
        </button>
      </div>
      {open && pos && createPortal(
        <>
          <style>{`
            @keyframes userMenuFadeIn {
              from { opacity: 0; transform: translateY(-8px) scale(0.96); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .user-menu-dropdown { animation: userMenuFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards; transform-origin: top right; }
          `}</style>
          <div ref={menuRef} role="menu" aria-label="Account menu" onKeyDown={onMenuKey}
            className="user-menu-dropdown" style={{position:"fixed",top:pos.top,right:pos.right,
            background:"rgba(255, 255, 255, 0.98)",
            backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
            borderRadius:12,minWidth:240,zIndex:99999,
            boxShadow:"0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 16px -6px rgba(0,0,0,0.05)",
            border:"1px solid rgba(225, 227, 236, 0.8)",overflow:"hidden"}}>
            {/* Profile header */}
            <div style={{ padding: "16px 16px 12px 16px", background: "#f8fafc", borderBottom: "1px solid #dfe2e7" }}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:40,height:40,borderRadius:"50%",
                  background:"linear-gradient(135deg,#c2a04a,#9a6810)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,fontWeight:800,color:"#fff",flexShrink:0,
                  boxShadow: "0 2px 4px rgba(212, 164, 55, 0.2)"}} aria-hidden="true">
                  {initials}
                </div>
                <div style={{minWidth:0, display:"flex", flexDirection:"column", gap:1}}>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0f172a",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {currentUser.name}
                  </p>
                  <p style={{margin:0,fontSize:11,color:"#64748b",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap", lineHeight: "1.2"}}>
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
              {actions.map((a, i) => (
                <React.Fragment key={a.label}>
                  {a.danger && <div style={{height:1,background:"#f1f5f9",margin:"6px 0"}}/>}
                  <MenuItem
                    ref={(el)=>{ itemRefs.current[i]=el; }}
                    icon={a.icon} label={a.label} danger={a.danger}
                    active={activeIndex===i}
                    onMouseEnter={()=>setActiveIndex(i)}
                    onClick={a.onSelect}
                  />
                </React.Fragment>
              ))}
            </div>
            {/* Footer */}
            <div style={{ padding: "10px 16px", background: "#f8fafc", borderTop: "1px solid #dfe2e7",
              fontSize: 9, fontWeight: 600, color: "#94a3b8", textAlign: "center", letterSpacing: "0.5px" }}>
              KBIZ360 V1.0 • THE BUSINESS ENGINE
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}


export const MenuItem = React.forwardRef(function MenuItem({icon:Icon, label, onClick, onMouseEnter, danger, active}, ref){
  const activeBg = danger ? "#fef2f2" : "#f1f5f9";
  const activeFg = danger ? "#ef4444" : "#0f172a";
  const normalFg = danger ? "#b91c1c" : "#334155";
  const iconColor = danger ? (active ? "#ef4444" : "#b91c1c") : (active ? "#2563eb" : "#64748b");

  return (
    <button type="button" role="menuitem" tabIndex={-1}
      ref={ref}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        display:"flex",alignItems:"center",gap:8, width:"100%", textAlign:"left",
        padding:"8px 12px",cursor:"pointer",minHeight:36, border:"none",
        borderRadius: 6,
        background: active ? activeBg : "transparent",
        color: active ? activeFg : normalFg,
        transform: active ? "translateX(2px)" : "translateX(0)",
        transition: "all 0.15s ease",
        WebkitTapHighlightColor:"transparent",userSelect:"none", touchAction:"manipulation"
      }}>
      {Icon && <Icon size={14} style={{color: iconColor, transition: "color 0.15s ease"}} aria-hidden="true"/>}
      <span style={{fontSize:12,fontWeight: danger ? 600 : 500}}>{label}</span>
    </button>
  );
});

/* ════════════════════════════════════════════════════════════════════
   LOGIN SCREEN  —  Travkings + KBiz360 dual branding
   ════════════════════════════════════════════════════════════════════ */
