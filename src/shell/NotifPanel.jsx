/* ════════════════════════════════════════════════════════════════════
   SHELL/NOTIFPANEL.JSX
   Auto-generated from KBiz360_v2.jsx · 149 lines · 2 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { getUnreadCount } from '../core/business-logic';
import { ADM_DATA } from '../core/data';
import { _NOTIFS, _PASSPORTS, _TDS_ENTRIES, _VENDOR_TERMS, markAllRead, markNotifRead } from '../core/notifStore';
import { useMobile, useNotifRefresh } from '../core/hooks';
import { btnG, btnGh, card } from '../core/styleTokens';
import { useFocusTrap } from '../core/ux/focus';
import { pushModal } from '../core/ux/modalStore';

export function NotifPanel({onClose,setRoute}){
  useNotifRefresh();
  const panelRef = useRef(null);
  const TYPE_CLR={info:"#185FA5",warning:"#854F0B",danger:"#A32D2D",success:"#27500A"};
  const TYPE_BG ={info:"#E6F1FB",warning:"#FAEEDA",danger:"#FCEBEB",success:"#EAF3DE"};
  const TYPE_ICON={info:"ℹ",warning:"⚠",danger:"🔴",success:"✔"};
  const unread=getUnreadCount();
  // Esc closes (via the modal stack); focus moves into the panel and returns to
  // the Bell trigger on close. top:60 clears the 64px app-bar.
  React.useEffect(() => pushModal(onClose), [onClose]);
  useFocusTrap(panelRef);

  return (
    <div ref={panelRef} role="dialog" aria-label="Notifications"
      style={{position:"fixed",top:60,right:8,width:340,maxHeight:"calc(100vh - 78px)",overflowY:"auto",
      background:"#fff",borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,0.18)",
      zIndex:600,border:"1px solid #e1e3ec"}}>
      <div style={{padding:"12px 14px",borderBottom:"1px solid #e1e3ec",position:"sticky",top:0,background:"#fff",
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Notifications</p>
          {unread>0&&<p style={{margin:0,fontSize:10,color:"#A32D2D",fontWeight:600}}>{unread} unread</p>}
        </div>
        <div style={{display:"flex",gap:6}}>
          {unread>0&&<button onClick={markAllRead} style={{...btnGh,padding:"3px 9px",fontSize:10}}>Mark all read</button>}
          <button onClick={onClose} aria-label="Close notifications" style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:"#5a6691"}}>✕</button>
        </div>
      </div>
      {_NOTIFS.map(n=>(
        <button key={n.id} type="button" onClick={()=>{markNotifRead(n.id);if(n.route)setRoute(n.route);onClose();}}
          style={{display:"block",width:"100%",textAlign:"left",padding:"10px 14px",borderBottom:"1px solid #f3f4f8",cursor:"pointer",
            border:"none",borderLeft:`3px solid ${n.read?"transparent":TYPE_CLR[n.type]||"#185FA5"}`,
            background:n.read?"#fff":"#fafffe"}}
          onMouseEnter={e=>e.currentTarget.style.background="#f0f4ff"}
          onMouseLeave={e=>e.currentTarget.style.background=n.read?"#fff":"#fafffe"}>
          <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
            <div style={{width:28,height:28,borderRadius:7,flexShrink:0,
              background:TYPE_BG[n.type]||"#f3f4f8",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}} aria-hidden="true">
              {TYPE_ICON[n.type]||"ℹ"}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <p style={{margin:0,fontSize:11,fontWeight:n.read?500:700,color:"#0d1326"}}>{n.title}</p>
              <p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691",lineHeight:1.4}}>{n.body}</p>
              <p style={{margin:"3px 0 0",fontSize:9,color:"#bfc3d6"}}>{n.ts}</p>
            </div>
            {!n.read&&<div style={{width:8,height:8,borderRadius:"50%",background:TYPE_CLR[n.type]||"#185FA5",flexShrink:0,marginTop:3}} aria-hidden="true"/>}
          </div>
        </button>
      ))}
      {_NOTIFS.length===0&&<p style={{padding:"20px",textAlign:"center",color:"#bfc3d6",fontSize:11}}>No notifications</p>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   GLOBAL SEARCH  /search
   ════════════════════════════════════════════════════════════════ */

export function NotificationCentre({branch,setRoute}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:branch?.code;
  const TODAY="2026-05-19";
  const [filter,setFilter]=useState("All");
  const [readIds,setReadIds]=useState(new Set());
  const go=r=>setRoute(r);

  const notifications=useMemo(()=>{
    const n=[];
    // ADMs near deadline
    (ADM_DATA||[]).filter(a=>(!brCode||a.branch===brCode)&&!["Settled","Waived"].includes(a.status)).forEach(a=>{
      const dl=Math.ceil((new Date(a.responseDeadline)-new Date(TODAY))/86400000);
      if(dl<=14)n.push({id:`ADM-${a.id}`,type:"Finance",priority:"High",icon:"📩",title:`ADM dispute deadline`,body:`${a.id} — ${a.airline} — ${a.currency}${a.amount.toLocaleString()} — ${dl}d left`,route:"/purchase/adm",time:a.responseDeadline});
    });
    // TDS pending
    (_TDS_ENTRIES||[]).filter(t=>t.status==="Pending").forEach(t=>{
      n.push({id:`TDS-${t.id}`,type:"Tax",priority:"High",icon:"📋",title:"TDS deposit pending",body:`${t.section} — ${t.payee} — ₹${t.tds.toLocaleString()} — Due 7th`,route:"/tax/tds",time:TODAY});
    });
    // Passport expiry
    (_PASSPORTS||[]).filter(p=>(!brCode||p.branch===brCode)).forEach(p=>{
      const dl=Math.ceil((new Date(p.expiry)-new Date(TODAY))/86400000);
      if(dl<90&&dl>0)n.push({id:`PASS-${p.id||p.person}`,type:"Operations",priority:dl<30?"Urgent":"Medium",icon:"🛂",title:"Passport expiring soon",body:`${p.person} — expires ${p.expiry} (${dl} days)`,route:"/masters/passports",time:p.expiry});
    });
    // Vendor payments due
    (_VENDOR_TERMS||[]).filter(v=>v.status==="Due Today"||v.status==="Due Soon").forEach(v=>{
      n.push({id:`PAY-${v.id}`,type:"Finance",priority:v.status==="Due Today"?"Urgent":"Medium",icon:"💸",title:`Supplier payment ${v.status.toLowerCase()}`,body:`${v.supplier} — ₹${v.dueAmt.toLocaleString()} due ${v.dueDate}`,route:"/masters/vendor-terms",time:v.dueDate});
    });
    return n.sort((a,b)=>{
      const PO={Urgent:0,High:1,Medium:2,Low:3};
      return (PO[a.priority]||2)-(PO[b.priority]||2);
    });
  },[brCode]);

  const types=["All",...new Set(notifications.map(n=>n.type))];
  const filtered=notifications.filter(n=>filter==="All"||n.type===filter);
  const unread=notifications.filter(n=>!readIds.has(n.id)).length;
  const PRIO_CLR={Urgent:"#A32D2D",High:"#854F0B",Medium:"#185FA5",Low:"#5a6691"};
  const PRIO_BG ={Urgent:"#FCEBEB",High:"#FAEEDA",Medium:"#E6F1FB",Low:"#f3f4f8"};
  const TYPE_CLR={Finance:"#185FA5",Tax:"#854F0B",Operations:"#1D9E75",CRM:"#A32D2D"};

  return(
    <div style={{padding:"12px 10px",maxWidth:900,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔔</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Notification Centre</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{unread} unread · {notifications.length} total · Live from system data</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setReadIds(new Set(notifications.map(n=>n.id)))} style={{...btnGh,fontSize:11}}>Mark all read</button>
        </div>
      </div>

      {/* Type filter */}
      <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",paddingBottom:4}}>
        {types.map(t=>(
          <button key={t} onClick={()=>setFilter(t)} style={{...filter===t?btnG:btnGh,fontSize:10.5,padding:"4px 12px",flexShrink:0}}>
            {t} ({t==="All"?notifications.length:notifications.filter(n=>n.type===t).length})
          </button>
        ))}
      </div>

      {filtered.length===0&&<div style={{...card,padding:"24px",textAlign:"center",color:"#27500A",fontSize:13}}>✔ All clear! No notifications</div>}
      {filtered.map(n=>(
        <button key={n.id} type="button" onClick={()=>{setReadIds(s=>new Set([...s,n.id]));go(n.route);}}
          style={{...card,display:"block",width:"100%",textAlign:"left",marginBottom:8,cursor:"pointer",
            background:readIds.has(n.id)?"#fafafa":"#fff",
            borderLeft:`4px solid ${PRIO_CLR[n.priority]||"#384677"}`,
            opacity:readIds.has(n.id)?0.7:1,transition:"all 0.15s"}}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateX(2px)"}}
          onMouseLeave={e=>{e.currentTarget.style.transform="none"}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{fontSize:20,flexShrink:0}}>{n.icon}</span>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2,flexWrap:"wrap"}}>
                <span style={{fontWeight:700,fontSize:11.5,color:"#0d1326"}}>{n.title}</span>
                <span style={{fontSize:9.5,padding:"1px 7px",borderRadius:999,fontWeight:700,background:PRIO_BG[n.priority],color:PRIO_CLR[n.priority]}}>{n.priority}</span>
                <span style={{fontSize:9.5,padding:"1px 7px",borderRadius:999,background:(TYPE_CLR[n.type]||"#384677")+"22",color:TYPE_CLR[n.type]||"#384677"}}>{n.type}</span>
                {!readIds.has(n.id)&&<span style={{width:8,height:8,borderRadius:"50%",background:"#185FA5",flexShrink:0}}/>}
              </div>
              <p style={{margin:0,fontSize:10.5,color:"#384677"}}>{n.body}</p>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{n.time}</p>
              <ChevronRight size={14} style={{color:"#bfc3d6",marginTop:4}} aria-hidden="true"/>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── FORM 26AS RECONCILIATION ─────────────────────────────────── */
