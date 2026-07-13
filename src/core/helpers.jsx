/* ════════════════════════════════════════════════════════════════════
   CORE/HELPERS.JS
   Auto-generated from KBiz360_v2.jsx · 2516 lines · 161 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lazyModule } from './lazyModule';
import { useModalEsc } from './ux/useModalEsc';
import { Menu as DropdownMenu } from './ux/Menu';
import { AlertTriangle, ChevronDown, ChevronRight, Download, Lock, Plus, Printer, Save, Search, Settings, User } from 'lucide-react';
import { Cell } from 'recharts';
import { exportToCSV } from './business-logic';
import { exportToExcel } from './exportExcel';
import { ADM_DATA, CASH, CONSOLIDATED_LABEL, FY_TARGETS_DATA, GP_BILLS, HR_EMPLOYEES_DATA, NOTIFICATIONS_DATA, SUBAGENTS, _EXP_BGT_LISTENERS, _EXP_BUDGETS } from './data';
import { useLedgerRegistry, useDocumentTypes } from './useReference';
import { useMasterList, useMasterMutations } from './useMasters';
import { toast } from './ux/toast';
import { fromJobDTO, toJobPayload, JOB_NEXT_STATUS } from '../modules/hr/hrMaps';
import { fromEmpDTO } from '../modules/hr/employeeMap';
import { pickLedgers } from './ledgerPick';
import { useGpBills } from './useAccounting';
import { fmt, fmtINR } from './format';
import { todayISO, CUR_MONTH, MONTH_OPTIONS, PERIOD_OPTIONS as MONTH_PERIOD_OPTIONS, FY_YTD_MONTHS } from './dates';
import { useMobile } from './hooks';
import { clickable } from './ux/clickable';
import { listKeyNav } from './ux/listKeys';
import { SampleBanner } from './ux/SampleBanner';
/* Import style primitives from the lightweight token module (NOT ./styles) so
   helpers no longer depends on styles.jsx — breaking the styles↔helpers cycle
   that was forcing both (and recharts) into the initial bundle. vDate was an
   unused import here and is dropped. */
import { B, FL, KpiCard, RPT_tdStyle, RPT_thStyle, bc, btnG, btnGh, card, inp } from './styleTokens';
/* Shared notification + demo-record state and the TRow primitive were moved
   to ./notifStore and ./ui (so eager modules don't pull helpers). Import them
   for this file's own use AND re-export under the original names so the many
   existing './helpers' consumers keep working unchanged. */
import { _NOTIFS, _NOTIF_LISTENERS, triggerNotifRefresh, markNotifRead, markAllRead, _PASSPORTS, _VENDOR_TERMS, _TDS_ENTRIES } from './notifStore';
import { TRow } from './ui';
export { _NOTIFS, _NOTIF_LISTENERS, triggerNotifRefresh, markNotifRead, markAllRead, _PASSPORTS, _VENDOR_TERMS, _TDS_ENTRIES, TRow };
/* BUSINESS SUB-MODULE REORG (2026-07-13): these 11 screens moved to their
   business sub-module folders (matching the nav menu groups); re-exported
   here under their original names because App.jsx dynamically imports them
   directly from './core/helpers' as one lazy-loaded chunk. */
import { MarkupRateSheet } from '../modules/masters/inventory-catalog-master/markupRateSheet';
import { SeatInventory } from '../modules/masters/inventory-catalog-master/seatInventory';
import { DocumentTypeMaster } from '../modules/masters/utilities/documentTypeMaster';
import { TdsCertRegister } from '../modules/taxation/tdsCertRegister';
import { MsmeTracker } from '../modules/taxation/msmeTracker';
import { Recruitment } from '../modules/hr/operations/recruitment';
import { BudgetPlanning } from '../modules/reports/compliance-tax/budgetVsActual';
import { PackagePnL } from '../modules/reports/profitability-gp/packagePnLLive';
import { FxRevaluation } from '../modules/finance/fxRevaluation';
import { PendingApprovals } from '../modules/settings/compliance-workflow/pendingApprovals';
import { UxPreferences } from '../modules/settings/tools/uxPreferences';
export { MarkupRateSheet, SeatInventory, DocumentTypeMaster, TdsCertRegister, MsmeTracker, Recruitment, BudgetPlanning, PackagePnL, FxRevaluation, PendingApprovals, UxPreferences };
/* Dashboards render lazily inside DashboardRouter (under App's <Suspense>), so
   helpers no longer STATICALLY imports the dashboard feature. This is the
   keystone that breaks the helpers ↔ feature-modules ↔ styles dependency cycle
   and lets recharts + styles + helpers defer out of the initial bundle.
   (VendorTermsMaster / IntercompanyBilling / EWayBill / ContraVoucher /
   PaymentVoucher / ReceiptVoucher were dead imports — referenced only in
   "see rebuilt version below" comments — and are removed.) */
const { AcctsExecDashboard, Dashboard, DirectorDashboard, HrMgrDashboard, SrAeDashboard, SrFmDashboard } = lazyModule(() => import('../modules/dashboard'));

export const VTH=({c,r})=><th style={{textAlign:r?"right":"left",padding:"6px 8px",fontWeight:500,color:"#5a6691",fontSize:10.5,whiteSpace:"nowrap",background:"#f3f4f8"}}>{c}</th>;

export const VTD=({c,r})=><td style={{padding:"4px 7px",textAlign:r?"right":"left",fontSize:11,fontVariantNumeric:r?"tabular-nums":"normal"}}>{c}</td>;

// HExportBtn moved to modules/masters/shared/hExportBtn.jsx (business
// sub-module reorg) — it was only used by the 3 masters screens below,
// all now split out into their own files too.

export const BANK_LIST_V=[
  "HDFC Bank CA — Nariman Point","HDFC Bank CA — Ahmedabad","ICICI Bank CA — Fort",
  "Cash in Hand","Petty Cash",
];


export const PMT_MODES_V=[
  "NEFT","RTGS","IMPS","UPI","Cheque","DD","Cash","SWIFT","Card",
];


/* ReceiptVoucher — see rebuilt version below */
/* PaymentVoucher — see rebuilt version below */
/* ContraVoucher — see rebuilt version below */
/* ════ FIX 5: BANK RECONCILIATION — PDC Register + Cheque Bounce ═ */

/* Day Book and Ledger statements are read live from the accounting engine
   (useDayBook / useLedgerStatement). The former hardcoded demo rows
   (getDbRows / getLtx) have been removed — no bundled fake transactions. */

export const DB_CLR={Sales:{bg:"#E6F1FB",c:"#185FA5"},Receipt:{bg:"#EAF3DE",c:"#27500A"},Purchase:{bg:"#FAEEDA",c:"#854F0B"},Payment:{bg:"#FCEBEB",c:"#A32D2D"},Journal:{bg:"#f3f4f8",c:"#5a6691"},Contra:{bg:"#F3E8FF",c:"#5B21B6"}};

export const B2B_D=[];

export const PNL_D=[];
/* ── MODULE-WISE GP DATA (branch-aware) ──────────────────────── */

export const MODULE_GP={ BOM:[], AMD:[] };
/* Consolidated — sum all branches */
MODULE_GP.ALL=(()=>{
  const mods=["Flight","Holiday","Hotel","Car","Visa","Insurance","Misc"];
  return mods.map((mod,mi)=>{
    const branches=["BOM","AMD"];
    const rev=branches.reduce((s,b)=>s+(MODULE_GP[b].find(m=>m.mod===mod)?.rev||0),0);
    const cost=branches.reduce((s,b)=>s+(MODULE_GP[b].find(m=>m.mod===mod)?.cost||0),0);
    const gp=rev-cost;
    return {mod:mod,icon:MODULE_GP.BOM[mi]?.icon,color:MODULE_GP.BOM[mi]?.color,
      rev:rev,cost:cost,gp:gp,gpPct:rev>0?+(gp/rev*100).toFixed(1):0};
  });
})();


export const PKG_D=[];

export const PKG_SC={Confirmed:{bg:"#EAF3DE",c:"#27500A"},Tentative:{bg:"#FAEEDA",c:"#854F0B"},Cancelled:{bg:"#FCEBEB",c:"#A32D2D"}};

export const GRP_COLORS={"Staff Costs":"#185FA5","Premises":"#27500A","Communication":"#854F0B",
  "Marketing":"#A32D2D","Operations":"#384677","Finance":"#1D9E75","Non-cash":"#5a6691"};


export function triggerBgtRefresh(){_EXP_BGT_LISTENERS.forEach(fn=>fn());}

export function getBgtKey(br,fy){return `${br?.code||br||"BOM"}_${fy}`;}

export function getExpenseBudget(br,fy){return _EXP_BUDGETS[getBgtKey(br,fy)]||{};}

export function saveExpenseBudget(br,fy,data){_EXP_BUDGETS[getBgtKey(br,fy)]=data;triggerBgtRefresh();}

/* ── Sample actuals Dec 2025 – May 2026 — all branches ── */


/* ── ROLE TEMPLATES ───────────────────────────────────────────── */

export const SUB_AGENTS_DATA=[];

/* ── Forex rates ─── */

export const _PROFORMAS=[];

/* Notifications + demo registers (_NOTIFS, _PASSPORTS, _VENDOR_TERMS,
   _TDS_ENTRIES, markNotifRead, …) moved to ./notifStore and re-exported at the
   top of this file so eager modules don't drag helpers (+ recharts) into the
   initial bundle. TRow moved to ./ui. */

export const ACM_REASON_CODES={
  RC:{code:"RC",label:"Refund Credit",         desc:"Credit for refunded ticket through BSP"},
  CA:{code:"CA",label:"Commission Adjustment", desc:"Additional commission or incentive awarded"},
  AR:{code:"AR",label:"ADM Reversal",          desc:"Reversal of a previously raised ADM"},
  IC:{code:"IC",label:"Incentive Credit",      desc:"Volume incentive or override commission"},
  TC:{code:"TC",label:"Tax Credit",            desc:"Credit for excess tax collected"},
  MS:{code:"MS",label:"Miscellaneous",         desc:"Other credit — see remarks"},
};

/* ── ADM Sample Data ── */

export const ACM_DATA=[];

/* ── ADM/ACM store (mutable for new entries) ── */

export const _ADM_LIST=[...ADM_DATA];

export const _ACM_LIST=[...ACM_DATA];

/* ════════════════════════════════════════════════════════════════
   ADM REGISTER  /purchase/adm
   Agent Debit Memos — airline debits via BSP
   ════════════════════════════════════════════════════════════════ */

export const _BOOKING_FILES={};
let _bfSeq={BOM:12,AMD:6};

export const BOOKING_FILES_SEED=[];
BOOKING_FILES_SEED.forEach(f=>{_BOOKING_FILES[f.id]=f;});

/* ── LEAVE DATA ── */

export const _LEAVES=[];

export const _LEAVE_BALANCES={};



// Dark-mode + table-density preference state moved to
// modules/settings/tools/uxPreferences.jsx (its only consumer, before this
// business sub-module reorg) — not re-exported here, nothing else used them.
/* ── EXPORT TO CSV UTILITY ── */

// UxPreferences moved to modules/settings/tools/uxPreferences.jsx (business
// sub-module reorg); re-exported below for App.jsx's direct chunk import.


/* ══════════════════════════════════════════════════════════════════
   BATCH A — EAGLE EYE / EXECUTIVE (Items 1–6)
   1. MIS One-Pager + Revenue Waterfall
   2. Client Concentration Risk
   3. Cash Runway metric (added to dashboard)
   4. Consolidated Balance Sheet
   5. Inter-branch elimination flag
   6. Advance / Deposit Ledger
   ════════════════════════════════════════════════════════════════ */

/* ── ITEM 1: MIS ONE-PAGER  /reports/mis ─────────────────────── */

export const _ADVANCES=[];


/* _PASSPORTS now lives in ./notifStore (re-exported at top). */


export const _TICKET_CTRL=[];


// MarkupRateSheet moved to modules/masters/inventory-catalog-master/markupRateSheet.jsx
// (business sub-module reorg); re-exported below for App.jsx's direct chunk import.

/* ── ITEM 10: VENDOR PAYMENT TERMS  /masters/vendor-terms ─────── */

/* _VENDOR_TERMS now lives in ./notifStore (re-exported at top). */

/* VendorTermsMaster — see rebuilt version below */

// TdsCertRegister moved to modules/taxation/tdsCertRegister.jsx (business
// sub-module reorg); re-exported below for App.jsx's direct chunk import.

/* ── ITEM 15: SALARY REVISION TRACKER  /hr/salary-revision ─────── */

export const _SALARY_HISTORY=[];

export const _REVISION_DUE=[];


export const _COL_VISIBILITY={};

export const _COL_LISTENERS=new Set();

export function getColVisibility(tableId,cols){if(!_COL_VISIBILITY[tableId])_COL_VISIBILITY[tableId]=cols.reduce((o,c)=>({...o,[c]:true}),{});return _COL_VISIBILITY[tableId];}

export function toggleCol(tableId,col){if(_COL_VISIBILITY[tableId])_COL_VISIBILITY[tableId][col]=!_COL_VISIBILITY[tableId][col];_COL_LISTENERS.forEach(fn=>fn());}

export function useColVisibility(tableId,cols){const [t,setT]=useState(0);useEffect(()=>{const fn=()=>setT(x=>x+1);_COL_LISTENERS.add(fn);return()=>_COL_LISTENERS.delete(fn);},[]);return getColVisibility(tableId,cols);}

/* ── GLOBAL PINNED ROUTES ── */
let _PINNED_ROUTES=JSON.parse('[]');

export const _PINNED_LISTENERS=new Set();

export function togglePin(route,label){const idx=_PINNED_ROUTES.findIndex(r=>r.route===route);if(idx>=0)_PINNED_ROUTES.splice(idx,1);else _PINNED_ROUTES.push({route,label});_PINNED_LISTENERS.forEach(fn=>fn());}

export function getPinned(){return[..._PINNED_ROUTES];}

export function usePinned(){const [t,setT]=useState(0);useEffect(()=>{const fn=()=>setT(x=>x+1);_PINNED_LISTENERS.add(fn);return()=>_PINNED_LISTENERS.delete(fn);},[]);return _PINNED_ROUTES;}

/* ── RECENT PAGES TRACKER ── */

export const _RECENT_PAGES=[];

export const _RECENT_LISTENERS=new Set();

export function trackPage(route,title){const existing=_RECENT_PAGES.findIndex(p=>p.route===route);if(existing>=0)_RECENT_PAGES.splice(existing,1);_RECENT_PAGES.unshift({route,title,ts:new Date().toLocaleTimeString()});if(_RECENT_PAGES.length>10)_RECENT_PAGES.pop();_RECENT_LISTENERS.forEach(fn=>fn());}

export function getRecent(){return[..._RECENT_PAGES];}

export function useRecent(){const [t,setT]=useState(0);useEffect(()=>{const fn=()=>setT(x=>x+1);_RECENT_LISTENERS.add(fn);return()=>_RECENT_LISTENERS.delete(fn);},[]);return _RECENT_PAGES;}

/* ── BREADCRUMB COMPONENT ── */

export function Breadcrumb({route}){
  const crumbs=[{l:"Dashboard",r:"/dashboard"}];
  const seg=route.split("/").filter(Boolean);
  seg.forEach((s,i)=>{
    const path="/"+seg.slice(0,i+1).join("/");
    const label=s.charAt(0).toUpperCase()+s.slice(1).replace(/-/g," ");
    crumbs.push({l:label,r:path});
  });
  if(crumbs.length<=1)return null;
  return (
    <div style={{display:"flex",alignItems:"center",gap:4,padding:"4px 0 8px",flexWrap:"wrap"}}>
      {crumbs.map((c,i)=>(
        <span key={i} style={{display:"flex",alignItems:"center",gap:4}}>
          {i>0&&<ChevronRight size={12} style={{color:"#bfc3d6"}}/>}
          <span style={{fontSize:10.5,color:i===crumbs.length-1?"#0d1326":"#5a6691",
            fontWeight:i===crumbs.length-1?600:400}}>{c.l}</span>
        </span>
      ))}
    </div>
  );
}

/* ── COLUMN VISIBILITY TOGGLE COMPONENT ── */

export function ColVisToggle({tableId,columns,style:{}}){
  const [open,setOpen]=useState(false);
  useColVisibility(tableId,columns);
  const vis=getColVisibility(tableId,columns);
  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{...btnGh,padding:"4px 10px",fontSize:10.5,display:"flex",alignItems:"center",gap:4}}>
        <Settings size={12}/> Columns
      </button>
      {open&&(
        <>
          <div style={{position:"fixed",inset:0,zIndex:498}} onClick={()=>setOpen(false)}/>
          <div style={{position:"absolute",right:0,top:36,zIndex:499,background:"#fff",borderRadius:10,
            boxShadow:"0 8px 24px rgba(0,0,0,0.15)",border:"1px solid #cdd1d8",padding:"8px 0",minWidth:160}}>
            {columns.map(col=>(
              <label key={col} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",cursor:"pointer",fontSize:11,color:"#384677"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f3f4f8"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <input type="checkbox" checked={vis[col]!==false} onChange={()=>toggleCol(tableId,col)} style={{cursor:"pointer"}}/>
                {col}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── QUICK CREATE FLOATING BUTTON ── */

export function PinnedRecentSection({setRoute}){
  const pinned=usePinned();
  const recent=useRecent();
  const [showPinned,setShowPinned]=useState(true);
  const [showRecent,setShowRecent]=useState(true);

  if(pinned.length===0&&recent.length===0)return null;
  return (
    <div style={{borderBottom:"1px solid #1a2340",paddingBottom:6,marginBottom:6}}>
      {pinned.length>0&&(
        <div style={{marginBottom:4}}>
          <button onClick={()=>setShowPinned(s=>!s)} style={{background:"transparent",border:"none",color:"#5a6691",fontSize:9.5,fontWeight:700,padding:"4px 12px",cursor:"pointer",width:"100%",textAlign:"left",display:"flex",alignItems:"center",gap:4}}>
            📌 PINNED {showPinned?"▾":"▸"}
          </button>
          {showPinned&&pinned.map((p,i)=>(
            <button key={i} onClick={()=>setRoute&&setRoute(p.route)} style={{background:"transparent",border:"none",color:"#d4a437",fontSize:10.5,padding:"4px 16px",cursor:"pointer",width:"100%",textAlign:"left",display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:10}}>⭐</span>{p.label}
            </button>
          ))}
        </div>
      )}
      {recent.length>0&&(
        <div>
          <button onClick={()=>setShowRecent(s=>!s)} style={{background:"transparent",border:"none",color:"#5a6691",fontSize:9.5,fontWeight:700,padding:"4px 12px",cursor:"pointer",width:"100%",textAlign:"left",display:"flex",alignItems:"center",gap:4}}>
            🕐 RECENT {showRecent?"▾":"▸"}
          </button>
          {showRecent&&recent.slice(0,5).map((p,i)=>(
            <button key={i} onClick={()=>setRoute&&setRoute(p.route)} style={{background:"transparent",border:"none",color:"#8b94b3",fontSize:10,padding:"3px 16px",cursor:"pointer",width:"100%",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center",gap:4}}
              onMouseEnter={e=>e.currentTarget.style.color="#fff"}
              onMouseLeave={e=>e.currentTarget.style.color="#8b94b3"}>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title||p.route}</span>
              <span style={{fontSize:8.5,color:"#5a6691",flexShrink:0}}>{p.ts}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ITEM 21: BSP CSV IMPORT  /purchase/bsp-import
   ════════════════════════════════════════════════════════════════ */

// Ledger picker. `branch` MUST be passed by branch-scoped vouchers so the dropdown
// lists the SAME chart the voucher resolves names from — otherwise a ledger picked
// from the global (all-branch) list isn't found by the voucher's branch-scoped
// getLedgerName and the raw id leaks into the journal/preview. The menu renders in
// a portal so a table's overflow:auto/hidden can't clip it (it used to open behind
// the scroll container and look like it "wasn't opening").
export function LedgerSelect({value,onChange,filter,placeholder,style={},branch,rawValue}){
  const [q,setQ]=useState("");
  const [open,setOpen]=useState(false);
  const [rect,setRect]=useState(null);
  const ref=useRef(null);
  const menuRef=useRef(null);
  const LEDGER_REGISTRY=useLedgerRegistry(branch).data||[];   // live chart of accounts (/api/ledgers), branch-scoped
  const {matches,shown:filtered}=pickLedgers(LEDGER_REGISTRY,q,filter);
  const selected=LEDGER_REGISTRY.find(l=>l.id===value);
  const place=()=>{ if(ref.current) setRect(ref.current.getBoundingClientRect()); };
  const openMenu=()=>{ place(); setQ(""); setOpen(true); };
  useEffect(()=>{
    if(!open)return;
    // Treat clicks inside the trigger OR the portalled menu as "inside".
    const onDoc=e=>{ if(ref.current?.contains(e.target)||menuRef.current?.contains(e.target))return; setOpen(false); };
    const reposition=()=>place();   // keep the menu pinned to the field on scroll/resize
    document.addEventListener("mousedown",onDoc);
    window.addEventListener("scroll",reposition,true);
    window.addEventListener("resize",reposition);
    return()=>{ document.removeEventListener("mousedown",onDoc); window.removeEventListener("scroll",reposition,true); window.removeEventListener("resize",reposition); };
  },[open]);
  const menu = open && rect && createPortal(
    // ↑/↓ roam the options (focus auto-scrolls each into view), Home/End jump, Enter/Space
    // pick (via clickable), Esc closes — ↓ from the search input lands on the first option.
    <div ref={menuRef} onKeyDown={listKeyNav({ onEscape:()=>setOpen(false) })}
      style={{position:"fixed",top:rect.bottom+4,left:rect.left,width:rect.width,zIndex:4000,background:"#fff",
      border:"1px solid #cdd1d8",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.18)",overflow:"hidden"}}>
      <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Type to search..."
        style={{width:"100%",border:"none",borderBottom:"1px solid #cdd1d8",padding:"8px 12px",
          fontSize:11,outline:"none",boxSizing:"border-box"}}/>
      <div style={{maxHeight:220,overflowY:"auto"}}>
        {filtered.map(l=>(
          <div key={l.id} {...clickable(()=>{onChange(l.id);setOpen(false);},{role:'option'})}
            style={{padding:"7px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",fontSize:11,outline:"none"}}
            onMouseEnter={e=>e.currentTarget.style.background="#f0f4ff"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}
            onFocus={e=>e.currentTarget.style.background="#f0f4ff"}
            onBlur={e=>e.currentTarget.style.background="transparent"}>
            <span style={{color:"#0d1326",fontWeight:500}}>{l.name}</span>
            <span style={{fontSize:9.5,color:"#5a6691",marginLeft:8,flexShrink:0}}>{l.group}</span>
          </div>
        ))}
        {filtered.length===0&&<div style={{padding:"10px 12px",fontSize:11,color:"#5a6691"}}>No ledger found</div>}
      </div>
      <div style={{padding:"6px 10px",borderTop:"1px solid #dfe2e7",fontSize:9.5,color:"#5a6691"}}>
        {matches.length>filtered.length
          ? `Showing ${filtered.length} of ${matches.length} matches · Type to narrow`
          : `${LEDGER_REGISTRY.length} ledgers · Type to filter`}
      </div>
    </div>, document.body);
  return (
    <div ref={ref} style={{position:"relative"}}>
      <div {...clickable(()=>open?setOpen(false):openMenu())} style={{...inp,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",minHeight:32,...style}}>
        {selected
          ?<span style={{fontSize:11,color:"#0d1326",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selected.name}</span>
          :rawValue
            // A stored ledger NAME with no match in the current chart (imported / merged /
            // renamed): show it verbatim so the field never looks empty, flagged so the
            // accountant re-picks before re-approving. The name stays in form state.
            ?<span style={{fontSize:11,color:"#854F0B",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title="Not in the current chart of accounts — re-pick to confirm before approving">{rawValue} <span style={{fontSize:8.5,fontWeight:700,color:"#854F0B",background:"#FAEEDA",border:"1px solid #FAC775",borderRadius:5,padding:"1px 5px",marginLeft:4,whiteSpace:"nowrap"}}>not in chart</span></span>
            :<span style={{fontSize:11,color:"#bfc3d6"}}>{placeholder||"Select ledger..."}</span>
        }
        <ChevronDown size={12} style={{color:"#5a6691",flexShrink:0}}/>
      </div>
      {menu}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   RECEIPT VOUCHER — COMPLETE REBUILD
   Dr Bank / Cash  |  Cr Debtor (with TDS deduction)
   ════════════════════════════════════════════════════════════════ */

/* _TDS_ENTRIES now lives in ./notifStore (re-exported at top). */

export const _TCS_ENTRIES=[];


export function MstrShell({title,icon,badge,badgeBg,badgeC,actions,children}){
  return (
    <div style={{padding:"12px 10px",maxWidth:1260,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#E6F1FB",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
            {icon}
          </div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326",letterSpacing:"-0.02em"}}>{title}</h2>
            {badge&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,
              background:badgeBg||"#E6F1FB",color:badgeC||"#185FA5"}}>{badge}</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{actions}</div>
      </div>
      {children}
    </div>
  );
}

/* ── Modal wrapper ────────────────────────────────────────────── */

export function MstrModal({title,onClose,children}){
  useModalEsc(onClose);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",
      zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:560,
        maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"14px 18px",borderBottom:"1px solid #cdd1d8",position:"sticky",top:0,
          background:"#fff",zIndex:1}}>
          <p style={{margin:0,fontSize:14,fontWeight:700,color:"#0d1326"}}>{title}</p>
          <button onClick={onClose} style={{background:"transparent",border:"none",
            cursor:"pointer",fontSize:20,color:"#5a6691",lineHeight:1}}>✕</button>
        </div>
        <div style={{padding:"16px 18px"}}>{children}</div>
        <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",
          display:"flex",justifyContent:"flex-end",gap:8,position:"sticky",bottom:0,background:"#fff"}}>
          <button onClick={onClose} style={btnGh}>Cancel</button>
          <button onClick={onClose} style={btnG}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   1. CHART OF ACCOUNTS
   ════════════════════════════════════════════════════════════════ */

/* TRow moved to ./ui (re-exported at top). */

/* ── Chip ── */

export function Chip({name,bg="#E6F1FB",c="#185FA5"}){
  return (
    <span style={{display:"inline-block",padding:"2px 8px",borderRadius:999,
      fontSize:10,fontWeight:600,background:bg,color:c,whiteSpace:"nowrap"}}>
      {name}
    </span>
  );
}

/* ── KpiCard ── */

export const TOUR_CODES_DATA=[];


export const RECURRING_DATA=[];


export const GROUP_BOOKINGS=[];


// PackagePnL moved to modules/reports/profitability-gp/packagePnLLive.jsx
// (business sub-module reorg); re-exported below for App.jsx's direct chunk import.

/* ── REFUND TRACKER ──────────────────────────────────────────── */

export const REFUNDS_DATA=[];

export const STATUS_FLOW=["Cancellation Requested","BSP Filed","Airline Refund Received","Client Refund Done","Closed"];

// Recruitment moved to modules/hr/operations/recruitment.jsx (business
// sub-module reorg); re-exported below for App.jsx's direct chunk import.



/* ── DOCUMENT MANAGER ─────────────────────────────────────────── */

// BudgetPlanning moved to modules/reports/compliance-tax/budgetVsActual.jsx
// (business sub-module reorg); re-exported below for App.jsx's direct chunk import.


/* ══════════════════════════════════════════════════════════════════
   BATCH E — FINAL 4 MISSING SCREENS
   IntercompanyBilling · SeatInventory · ClientAccount360 · GratuityRegister · EWayBill
   ════════════════════════════════════════════════════════════════ */

// SeatInventory moved to modules/masters/inventory-catalog-master/seatInventory.jsx
// (business sub-module reorg); re-exported below for App.jsx's direct chunk import.
// GratuityRegister moved to modules/hr/payroll/gratuityRegister.jsx (business
// sub-module reorg) — its only live consumer, hr/payroll/gratuity.jsx, now
// imports it from there directly; no re-export needed here.

/* ── E-WAY BILL ──────────────────────────────────────────────── */

export const ASSET_CATEGORIES = []; /* moved to DB — fetch via API/hook */


export const FIXED_ASSETS_DATA = [];


export const VENDOR_ADVANCES_DATA = [];

// FxRevaluation moved to modules/finance/fxRevaluation.jsx (business
// sub-module reorg); re-exported below for App.jsx's direct chunk import.

/* ══════════════════════════════════════════════════════════════════
   TAXATION ADDITIONS — GSTR-9C, 3CD Tax Audit, GSTR-2A Reconciliation
   ════════════════════════════════════════════════════════════════ */


// MsmeTracker moved to modules/taxation/msmeTracker.jsx (business sub-module
// reorg); re-exported below for App.jsx's direct chunk import.

/* ══════════════════════════════════════════════════════════════════
   HR ADDITIONS — Employee Loans & Salary Advances
   ════════════════════════════════════════════════════════════════ */


export const PERIOD_LOCK_DATA = [];


export const APPROVAL_RULES = []; /* moved to DB — fetch via API/hook */


// PendingApprovals moved to modules/settings/compliance-workflow/pendingApprovals.jsx
// (business sub-module reorg); re-exported below for App.jsx's direct chunk import.


export const BANK_ACCOUNTS_DATA = [];


export const CURRENCY_DATA = [
  {code:"INR",name:"Indian Rupee",      symbol:"₹",  dailyRate:1.0000,    lastUpdated:"2026-05-20 09:00",isBase:true, active:true},
  {code:"USD",name:"US Dollar",         symbol:"$",  dailyRate:84.5000,   lastUpdated:"2026-05-20 09:00",isBase:false,active:true},
  {code:"KES",name:"Kenyan Shilling",   symbol:"KSh",dailyRate:0.6500,    lastUpdated:"2026-05-20 09:00",isBase:false,active:true},
  {code:"TZS",name:"Tanzanian Shilling",symbol:"TSh",dailyRate:0.0340,    lastUpdated:"2026-05-20 09:00",isBase:false,active:true},
  {code:"CDF",name:"Congolese Franc",   symbol:"FC", dailyRate:0.0300,    lastUpdated:"2026-05-20 09:00",isBase:false,active:true},
];


export const COST_CENTERS_DATA = [];


export const PROJECTS_DATA = [];


// DOCUMENT_TYPES_DATA moved to DB — fetch via useDocumentTypes() (/api/document-types).


// APPROVAL_LIMITS_DATA moved to DB — fetch via useApprovalLimits() (/api/approval-limits).


export const MASTER_PAGE = (title, subtitle, children) => (
  <div style={{padding:18,maxWidth:1320,margin:"0 auto"}}>
    <div style={{marginBottom:16}}>
      <h2 style={{margin:0,fontSize:20,color:"#0d1326",fontWeight:700}}>{title}</h2>
      <p style={{margin:"3px 0 0",fontSize:12,color:"#5a6691"}}>{subtitle}</p>
    </div>
    {children}
  </div>
);

/* ════════════════════════════════════════════════════════════════════
   1. BANK ACCOUNT MASTER
   ════════════════════════════════════════════════════════════════════ */


// DocumentTypeMaster moved to modules/masters/utilities/documentTypeMaster.jsx
// (business sub-module reorg); re-exported below for App.jsx's direct chunk import.

/* ════════════════════════════════════════════════════════════════════
   6. APPROVAL LIMITS MASTER
   ════════════════════════════════════════════════════════════════════ */


export const REVENUE_TREND_12M = [];


export const BRANCH_PL_HEATMAP = [];


export const TOP_CUSTOMERS_DATA = [];


export const TOP_SUPPLIERS_DATA = [];


export const PERIOD_CLOSE_DATA = [];


export const AR_AGEING_SUMMARY = [];


export const AP_AGEING_SUMMARY = [];


export const RECON_STATUS_DATA = [];


export const TODAY_VOUCHERS_BY_BR = {
  BOMMB: [],
  BOM: [],
  AMD: [],
};


export const RECENT_ACTIVITY_FEED = [];


export const VARIANCE_FLAGS_DATA = [];

/* ── Shared dashboard primitives ─────────────────────────────────── */


export const PERIOD_OPTIONS = ["Today","Week","Month","Quarter","YTD","Custom"];

export function PeriodSelector({period,setPeriod}){
  return (
    <div className="max-tablet:w-full max-tablet:flex-wrap" style={{display:"flex",gap:4,padding:3,background:"#f4f5f7",borderRadius:7,border:"1px solid #cdd1d8"}}>
      {PERIOD_OPTIONS.map(p=>(
        <button key={p} onClick={()=>setPeriod(p)}
          className="max-tablet:flex-1 max-tablet:min-h-[44px]"
          style={{padding:"5px 11px",border:"none",borderRadius:5,fontSize:11,fontWeight:600,cursor:"pointer",
            background:period===p?"#1a1c22":"transparent",
            color:period===p?"#c2a04a":"#5b616e"}}>{p}</button>
      ))}
    </div>
  );
}


export function DashboardHeader({title,subtitle,user,period,setPeriod,onExport}){
  return (
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:14,marginBottom:18,paddingBottom:14,borderBottom:"1px solid #cdd1d8"}}>
      <div style={{minWidth:0}}>
        <h2 style={{margin:0,fontSize:20,letterSpacing:"-0.02em",color:"#14161a",fontWeight:700}}>{title}</h2>
        <p style={{margin:"3px 0 0",fontSize:12.5,color:"#5b616e"}}>{subtitle} · <span style={{color:"#98792c",fontWeight:600}}>{user.name}</span></p>
      </div>
      <div className="max-tablet:w-full" style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        {period && setPeriod && <PeriodSelector period={period} setPeriod={setPeriod}/>}
        <button onClick={onExport} className="inline-flex items-center max-tablet:min-h-[44px]" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,fontSize:12,cursor:"pointer",fontWeight:600,color:"#5b616e"}}>📄 Export PDF</button>
      </div>
    </div>
  );
}


export const cardStyle={background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,padding:14,position:"relative"};

export function DashboardRouter({branch,setBranch,setRoute,currentUser}){
  const role = currentUser?.role || "Super Admin";
  if(role==="Director" || role==="Super Admin") return <DirectorDashboard currentUser={currentUser} setRoute={setRoute} setBranch={setBranch} branch={branch}/>;
  if(role==="Senior Finance Manager")          return <SrFmDashboard currentUser={currentUser} setRoute={setRoute} branch={branch}/>;
  if(role==="Sr. Accounts Executive")          return <SrAeDashboard currentUser={currentUser} setRoute={setRoute} branch={branch}/>;
  if(role==="Accounts Executive")              return <AcctsExecDashboard currentUser={currentUser} setRoute={setRoute} branch={branch}/>;
  if(role==="HR Manager")                      return <HrMgrDashboard currentUser={currentUser} setRoute={setRoute} branch={branch}/>;
  /* Fallback to existing branch dashboard */
  return <Dashboard branch={branch} setRoute={setRoute}/>;
}

/* ════════════════════════════════════════════════════════════════════
   16 NEW REPORTS — Financial · Profitability · HR · Compliance & Risk
   ════════════════════════════════════════════════════════════════════ */

/* ── Shared report-page wrapper ──────────────────────────────────── */


export const FS_NOTES = [];


export const AUDIT_TRAIL_DATA = [];


export const CUSTOMER_LTV_DATA = [];

/* ABC analysis derived from TOP_CUSTOMERS_DATA in dashboards */

export function abcOf(items, valueKey){
  const sorted=[...items].sort((a,b)=>b[valueKey]-a[valueKey]);
  const total=sorted.reduce((s,x)=>s+x[valueKey],0);
  let cum=0;
  return sorted.map(x=>{
    cum+=x[valueKey];
    const cumPct=cum/total*100;
    let cls="C";
    if(cumPct<=80) cls="A";
    else if(cumPct<=95) cls="B";
    return {...x,cumPct:cumPct.toFixed(1),class:cls,share:(x[valueKey]/total*100).toFixed(2)};
  });
}


export const ATTRITION_DATA = [];


/* STATUTORY_DUES removed — the Statutory Dues Calendar is now live:
   useStatutoryDues → GET /api/tax-calendar/dues */


/* FX_EXPOSURE removed — the Currency Exposure report is now live:
   useFxExposure → GET /api/accounting/fx-exposure */

/* ════════════════════════════════════════════════════════════════════
   FINANCIAL REPORTS (4)
   ════════════════════════════════════════════════════════════════════ */

/* 1. Cash Position Summary */

export const TAB_Page = (title, subtitle, audit, children) => (
  <div style={{padding:18,maxWidth:1400,margin:"0 auto"}}>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:14,marginBottom:14,paddingBottom:12,borderBottom:"1px solid #cdd1d8"}}>
      <div>
        <h2 style={{margin:0,fontSize:20,color:"#0d1326",fontWeight:700}}>{title}</h2>
        <p style={{margin:"3px 0 0",fontSize:12,color:"#5a6691"}}>{subtitle}</p>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button style={{padding:"7px 14px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,fontSize:11.5,fontWeight:600,color:"#5a6691",cursor:"pointer"}}>← Back</button>
        <button style={{padding:"7px 14px",background:"#fff",border:"1px solid #d4a437",borderRadius:6,fontSize:11.5,fontWeight:600,color:"#d4a437",cursor:"pointer"}}>📋 Duplicate</button>
        <button style={{padding:"7px 14px",background:"#d4a437",border:"none",borderRadius:6,fontSize:11.5,fontWeight:700,color:"#0d1326",cursor:"pointer"}}>💾 Save</button>
      </div>
    </div>
    {children}
    {audit&&<div style={{padding:"10px 18px",marginTop:14,background:"#fafbfd",border:"1px solid #cdd1d8",borderRadius:6,fontSize:10.5,color:"#5a6691",textAlign:"center"}}>
      Last modified by <b style={{color:"#0d1326"}}>{audit.user}</b> on <b style={{color:"#0d1326"}}>{audit.date}</b> · Record created on <b style={{color:"#0d1326"}}>{audit.created}</b>
    </div>}
  </div>
);


export const tabPanel = (children) => <div style={{padding:18,minHeight:380}}>{children}</div>;
/* FL helper defined as function at top of file */

export const INVESTMENT_DATA = [];


export const RECO_QUEUE_DATA = [];


export const SAVED_VIEWS_DATA = [];


export const SCHEDULED_REPORTS_DATA = [];


export const BUILDER_FIELD_CATALOG = {
  "Date & Period":["Invoice Date","Booking Date","Payment Date","Due Date","Period (Month)","Period (Quarter)","Financial Year"],
  "Party":["Customer Name","Supplier Name","Branch","Sub-Agent","Consultant","Country","City"],
  "Amount":["Revenue","Cost","Gross Profit","GP %","TDS Amount","Tax Amount","Net Amount","Advance","Outstanding"],
  "Status":["Payment Status","Approval Status","Filing Status","Voucher Type","Category"],
  "Reference":["Voucher No.","Invoice No.","PNR","Booking Ref","Project Code","Cost Center"],
};


export const DEMO_REPORT_DATA = [];

/* ── Sparkline SVG component ─────────────────────────────────────── */

export function Sparkline({values,color="#d4a437",w=80,h=28}){
  if(!values||values.length<2) return <span style={{color:"#5a6691",fontSize:10}}>—</span>;
  const max=Math.max(...values)||1;
  const min=Math.min(...values);
  const range=max-min||1;
  const pts=values.map((v,i)=>`${(i/(values.length-1))*(w-4)+2},${h-2-((v-min)/range)*(h-4)}`).join(" ");
  return(
    <svg width={w} height={h} style={{display:"block",overflow:"visible"}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round"/>
      {values.map((v,i)=>i===values.length-1?(
        <circle key={i} cx={(i/(values.length-1))*(w-4)+2} cy={h-2-((v-min)/range)*(h-4)} r={2.5} fill={color}/>
      ):null)}
    </svg>
  );
}

/* ── Drill-down modal ────────────────────────────────────────────── */

export function DrillModal({branch,metric,value,onClose}){
  const rows=[]; // drill-down rows come from the live ledger/voucher data (no demo)
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(13,19,38,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:10,padding:22,width:580,maxHeight:"80vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <p style={{margin:0,fontSize:14,fontWeight:700,color:"#0d1326"}}>Drill-down: {branch} — {metric}</p>
            <p style={{margin:"2px 0 0",fontSize:11.5,color:"#5a6691"}}>Total: <b style={{color:"#d4a437"}}>{fmtINR(value)}</b> · May 2026 · click any row to open voucher</p>
          </div>
          <button onClick={onClose} style={{width:28,height:28,borderRadius:"50%",border:"1px solid #cdd1d8",background:"#f7f8fb",cursor:"pointer",fontSize:14,fontWeight:700,color:"#5a6691"}}>✕</button>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Voucher</th><th style={RPT_thStyle}>Date</th><th style={RPT_thStyle}>Party</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th></tr></thead>
          <tbody>{rows.map((r,i)=>(
            <tr key={i} style={{borderBottom:"1px solid #dfe2e7",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#fff8e8"} onMouseLeave={e=>e.currentTarget.style.background=""}>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5,color:"#d4a437",fontWeight:600}}>{r.vno}</td>
              <td style={RPT_tdStyle}>{r.date}</td>
              <td style={{...RPT_tdStyle,fontWeight:600}}>{r.party}</td>
              <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(r.amount)}</td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{marginTop:12,display:"flex",justifyContent:"flex-end",gap:8}}>
          <button style={{padding:"7px 14px",background:"#fff",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>📊 Full Report</button>
          <button onClick={onClose} style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ── Export dropdown ─────────────────────────────────────────────── */

export function ExportDropdown(){
  const [open,setOpen]=useState(false);
  const formats=[
    {fmt:"PDF",icon:"📄",desc:"Formatted printable report"},
    {fmt:"Excel (.xlsx)",icon:"📊",desc:"Full data with formulas"},
    {fmt:"CSV",icon:"📋",desc:"Flat data for analysis"},
    {fmt:"JSON",icon:"{ }",desc:"Machine-readable"},
    {fmt:"HTML",icon:"🌐",desc:"Email-embeddable"},
  ];
  return(
    <div style={{position:"relative",display:"inline-block"}}>
      <button onClick={()=>setOpen(!open)} style={{padding:"7px 14px",background:"#0d1326",color:"#d4a437",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
        📤 Export ▾
      </button>
      {open&&(
        <div style={{position:"absolute",top:"110%",right:0,background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",width:220,zIndex:100}} onMouseLeave={()=>setOpen(false)}>
          <p style={{margin:0,padding:"8px 14px",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",borderBottom:"1px solid #cdd1d8"}}>Export as</p>
          {formats.map(f=>(
            <button key={f.fmt} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",background:"transparent",border:"none",width:"100%",textAlign:"left",cursor:"pointer",fontSize:12}} onMouseEnter={e=>e.currentTarget.style.background="#f7f8fb"} onMouseLeave={e=>e.currentTarget.style.background=""} onClick={()=>setOpen(false)}>
              <span style={{fontSize:16,width:22}}>{f.icon}</span>
              <div><p style={{margin:0,fontWeight:700,color:"#0d1326"}}>{f.fmt}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{f.desc}</p></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   1. CUSTOM REPORT BUILDER
   ════════════════════════════════════════════════════════════════════ */

export const MY_PAYSLIP_DATA = {
  employee:"", empId:"", branch:"",
  month:"", dept:"",
  earnings:[],
  deductions:[],
};


export const INVESTMENT_SECTIONS = [
  {section:"80C",limit:150000,label:"80C — PPF, ELSS, LIC, EPF, Home Loan Principal",declared:120000,proof:"PPF passbook, LIC receipt"},
  {section:"80D",limit:25000, label:"80D — Health Insurance Premium",               declared:18000, proof:"Insurance premium receipt"},
  {section:"80E",limit:0,     label:"80E — Education Loan Interest",                declared:0,     proof:"Bank statement"},
  {section:"80G",limit:0,     label:"80G — Donations",                              declared:5000,  proof:"Donation receipt 80G cert"},
  {section:"HRA",limit:0,     label:"HRA Exemption",                                declared:89600, proof:"Rent receipts, landlord PAN"},
  {section:"LTA",limit:0,     label:"LTA — Leave Travel Allowance",                 declared:12000, proof:"Travel tickets"},
];


export const PERFORMANCE_REVIEWS = [];


export const SKILLS_DATA = [];


export const FEEDBACK_360_DATA = [];


export const MY_CLAIMS_DATA = [];

/* ════════════════════════════════════════════════════════════════════
   1. EMPLOYEE SELF-SERVICE PORTAL (hub)
   ════════════════════════════════════════════════════════════════════ */

export const FORM16A_DATA = [];


// EMAIL_TEMPLATES_DATA moved to DB — fetch via useEmailTemplates() (/api/email-templates).


// CUSTOM_FIELDS_DATA moved to DB — fetch via useCustomFields() (/api/custom-fields).


// FIELD_ACCESS_DATA moved to DB — fetch via useFieldAccess() (/api/field-access).


export const PERM_ROLES = ["Super Admin","Director","Senior Finance Manager","Sr. Accounts Executive","Accounts Executive","HR Manager"];

export const PERM_ACTIONS = ["View","Create","Edit","Delete","Approve","Export"];

/* ════════════════════════════════════════════════════════════════════
   14. DOCUMENT TEMPLATE EDITOR
   ════════════════════════════════════════════════════════════════════ */

export const STATUTORY_FILINGS = [];


export const PERIOD_LOCK_STATE = {
  "BOMMB": {},
  "BOM": {},
  "AMD": {},
};


export const AUDIT_QUEUE_DATA = [];


export const GROUP_DASH_DATA = {
  monthEnded:"",
  publishedOn:"",
  publishedBy:"",
  pnlByBranch:[],
  topConsultants:[],
  topCustomers:[],
  cash:{total:0,inr:0},
  overdue:{count:0,amount:0,over90:0,over90amt:0},
};

/* ════════════════════════════════════════════════════════════════════
   1. HO ASSET PROCUREMENT WORKFLOW  (Point C)
   ════════════════════════════════════════════════════════════════════ */

export const AUTH_INITIAL_TXN = [];


export const AUTH_INITIAL_MASTER = [];


export const ACTIVE_DELEGATIONS = [];


export const MASTER_CHANGE_QUEUE = [];

/* ════════════════════════════════════════════════════════════════════
   1. AUTHORITY CONFIGURATION CENTER (5 tabs)
   ════════════════════════════════════════════════════════════════════ */
