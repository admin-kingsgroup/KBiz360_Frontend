/* ════════════════════════════════════════════════════════════════════
   CORE/HELPERS.JS
   Auto-generated from KBiz360_v2.jsx · 2516 lines · 161 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lazyModule } from './lazyModule';
import { useModalEsc } from './ux/useModalEsc';
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

// "Export to Excel" toolbar button for the masters defined in this file. Pass the
// rows array + {key,label} columns; greys out when there's nothing to export.
export const HExportBtn=({name,columns,rows,label="📤 Export"})=>{
  const empty=!rows||rows.length===0;
  return <button onClick={()=>exportToExcel(name,columns,rows||[])} disabled={empty} title="Export to Excel"
    style={{padding:"8px 14px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,fontSize:11,cursor:empty?"not-allowed":"pointer",opacity:empty?0.5:1}}>{label}</button>;
};

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

/* ── EXPENSE CLAIMS DATA ── */

export const _EXPENSE_CLAIMS=[];

export const _DM_LISTENERS=new Set();

export function toggleDarkMode(){_DARK_MODE=!_DARK_MODE;_DM_LISTENERS.forEach(fn=>fn(_DARK_MODE));}

export function useDarkMode(){
  const [dark,setDark]=useState(_DARK_MODE);
  useEffect(()=>{_DM_LISTENERS.add(setDark);return()=>_DM_LISTENERS.delete(setDark);},[]);
  return [dark,toggleDarkMode];
}

/* ── TABLE ROW DENSITY ── */
let _DENSITY="comfortable"; // compact | comfortable | spacious

export const _DENSITY_LISTENERS=new Set();

export function setDensity(d){_DENSITY=d;_DENSITY_LISTENERS.forEach(fn=>fn(d));}

export function useDensity(){
  const [d,setD]=useState(_DENSITY);
  useEffect(()=>{_DENSITY_LISTENERS.add(setD);return()=>_DENSITY_LISTENERS.delete(setD);},[]);
  const pad={compact:"4px 8px",comfortable:"8px 12px",spacious:"13px 16px"}[d]||"8px 12px";
  const fs={compact:10.5,comfortable:11.5,spacious:12.5}[d]||11.5;
  return {density:d,pad:pad,fs:fs};
}

/* ── EXPORT TO CSV UTILITY ── */

export function UxPreferences(){
  const [dark,toggleDark]=useDarkMode();
  const {density}=useDensity();

  return (
    <div style={{padding:"12px 10px",maxWidth:700,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>⚙</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Display Preferences</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Personalise your KBiz360 experience</p>
        </div>
      </div>

      <div style={{...card,marginBottom:12}}>
        <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>🌙 Dark Mode</p>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{margin:0,fontSize:12,color:"#384677"}}>Dark theme for low-light environments</p>
            <p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691"}}>Currently: <b>{dark?"Dark":"Light"}</b></p>
          </div>
          <div {...clickable(toggleDark)} style={{width:48,height:26,borderRadius:13,background:dark?"#0d1326":"#e1e3ec",cursor:"pointer",
            position:"relative",transition:"background 0.2s",border:`2px solid ${dark?"#d4a437":"#bfc3d6"}`}}>
            <div style={{position:"absolute",top:2,left:dark?22:2,width:18,height:18,borderRadius:"50%",
              background:dark?"#d4a437":"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
          </div>
        </div>
      </div>

      <div style={{...card,marginBottom:12}}>
        <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>📏 Table Density</p>
        <div style={{display:"flex",gap:8}}>
          {["compact","comfortable","spacious"].map(d=>(
            <button key={d} onClick={()=>setDensity(d)} style={{
              flex:1,padding:"10px",borderRadius:8,cursor:"pointer",fontWeight:600,
              textTransform:"capitalize",fontSize:11,
              background:density===d?"#0d1326":"#f3f4f8",
              color:density===d?"#d4a437":"#384677",
              border:`2px solid ${density===d?"#d4a437":"#e1e3ec"}`
            }}>{d}</button>
          ))}
        </div>
        <p style={{margin:"8px 0 0",fontSize:10,color:"#5a6691"}}>Compact = more rows visible. Spacious = easier reading. Currently: <b style={{textTransform:"capitalize"}}>{density}</b></p>
      </div>

      <div style={{...card,marginBottom:12}}>
        <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>⌨ Keyboard Shortcuts</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Ctrl+K","Global Search / Command Palette"],["Ctrl+S","Save current voucher"],["Ctrl+N","New voucher (current module)"],["Esc","Close modal / cancel"],["Alt+D","Jump to Dashboard"],["Alt+S","Jump to Sales → Flight"],["Alt+P","Jump to Purchase → Flight"],["Alt+R","Jump to GP Reports"],].map(([k,v])=>(
            <div key={k} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 8px",borderRadius:7,background:"#f3f4f8"}}>
              <kbd style={{padding:"2px 8px",borderRadius:4,background:"#0d1326",color:"#d4a437",fontFamily:"monospace",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{k}</kbd>
              <span style={{fontSize:10.5,color:"#384677"}}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{...card}}>
        <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>📊 Export Options</p>
        <p style={{margin:0,fontSize:11,color:"#5a6691"}}>Every report and table has an Export CSV button. Click it to download data to Excel. For PDF exports, use the Print button and select "Save as PDF" in the print dialog. The Itinerary Builder has direct HTML export.</p>
      </div>
    </div>
  );
}


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


export const _MARKUP_RULES=[];


export function MarkupRateSheet({branch}){
  const [rules,setRules]=useState(_MARKUP_RULES);
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({client:"ALL B2C",type:"B2C",module:"Flight",markupType:"Percentage",value:12,floor:8,note:""});

  /* GP floor alert checker */
  const alertCount=rules.filter(r=>r.floor>0&&r.value<r.floor).length;

  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📐</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Service Charge - 2 / Net Rate Sheet</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Per-client Service Charge - 2 rules · GP floor alerts · All modules</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <HExportBtn name="other-taxes-rules" rows={rules} columns={[{key:"id",label:"ID"},{key:"client",label:"Client / Segment"},{key:"type",label:"Type"},{key:"module",label:"Module"},{key:"markupType",label:"Service Charge - 2 Type"},{key:"value",label:"Service Charge - 2 Value"},{key:"floor",label:"GP Floor %"},{key:"note",label:"Notes"}]}/>
          <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Add Rule</button>
        </div>
      </div>

      {alertCount>0&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600,display:"flex",gap:8}}>
        <AlertTriangle size={14}/> {alertCount} Service Charge - 2 rule{alertCount>1?"s":""} below the GP floor — review pricing immediately
      </div>}

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["ID","Client / Segment","Type","Module","Service Charge - 2 Type","Service Charge - 2","GP Floor","Alert","Notes",""].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=5&&i<=6?"right":"left",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{rules.map((r,i)=>(
            <tr key={r.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10,color:"#5a6691"}}>{r.id}</td>
              <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{r.client}</td>
              <td style={{padding:"8px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{r.type}</span></td>
              <td style={{padding:"8px 12px",color:"#384677"}}>{r.module}</td>
              <td style={{padding:"8px 12px",color:"#5a6691"}}>{r.markupType}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:800,fontSize:14,color:"#27500A"}}>{r.markupType==="Percentage"?`${r.value}%`:`₹${r.value}`}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,color:r.value<r.floor?"#A32D2D":"#5a6691"}}>{r.floor>0?`${r.floor}% min`:"None"}</td>
              <td style={{padding:"8px 12px"}}>{r.value<r.floor?<span style={{fontSize:10,padding:"2px 8px",borderRadius:999,background:"#FCEBEB",color:"#A32D2D",fontWeight:700}}>Below Floor!</span>:<span style={{color:"#27500A",fontSize:14}}>✔</span>}</td>
              <td style={{padding:"8px 12px",fontSize:10,color:"#5a6691"}}>{r.note}</td>
              <td style={{padding:"8px 12px"}}><button onClick={()=>setRules(rs=>rs.filter(x=>x.id!==r.id))} style={{background:"transparent",border:"none",cursor:"pointer",color:"#A32D2D",fontSize:13}}>✕</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:460,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Add Service Charge - 2 Rule</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Client / ALL B2B / ALL B2C"><input value={form.client} onChange={e=>setForm(f=>({...f,client:e.target.value}))} style={inp} placeholder="ALL B2C"/></FL>
                <FL label="Type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}><option>B2B</option><option>B2C</option><option>B2E</option></select></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Module"><select value={form.module} onChange={e=>setForm(f=>({...f,module:e.target.value}))} style={inp}>{["ALL","Flight","Holiday","Hotel","Car","Visa","Insurance","Misc"].map(m=><option key={m}>{m}</option>)}</select></FL>
                <FL label="Service Charge - 2 type"><select value={form.markupType} onChange={e=>setForm(f=>({...f,markupType:e.target.value}))} style={inp}><option>Percentage</option><option>Fixed Fee</option></select></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label={form.markupType==="Percentage"?"Service Charge - 2 %":"Fixed fee (₹)"}><input type="number" value={form.value} onChange={e=>setForm(f=>({...f,value:+e.target.value}))} style={inp}/></FL>
                <FL label="GP floor % (0 = no floor)"><input type="number" value={form.floor} onChange={e=>setForm(f=>({...f,floor:+e.target.value}))} style={inp}/></FL>
              </div>
              <FL label="Note"><input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} style={inp}/></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={()=>{
                const id=`MR${String(rules.length+1).padStart(3,"0")}`;
                setRules(rs=>[...rs,{...form,id}]);setModal(false);
              }} style={btnG}>💾 Save Rule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── ITEM 10: VENDOR PAYMENT TERMS  /masters/vendor-terms ─────── */

/* _VENDOR_TERMS now lives in ./notifStore (re-exported at top). */

/* VendorTermsMaster — see rebuilt version below */

export const _TDS_CERTS=[];


export function TdsCertRegister({branch}){
  const [certs,setCerts]=useState(_TDS_CERTS);
  const [quarter,setQuarter]=useState("All");
  const QUARTERS=["All","Q4 FY25-26","Q3 FY25-26","Q2 FY25-26","Q1 FY25-26"];
  const STATUS_CLR={Pending:"#A32D2D",Issued:"#185FA5",Acknowledged:"#27500A"};
  const STATUS_BG={Pending:"#FCEBEB",Issued:"#E6F1FB",Acknowledged:"#EAF3DE"};
  const TODAY=todayISO();
  const daysLeft=d=>d?Math.ceil((new Date(d)-new Date(TODAY))/(1000*60*60*24)):null;

  const filtered=certs.filter(c=>quarter==="All"||c.quarter===quarter);
  const pending=filtered.filter(c=>c.status==="Pending").length;
  const totTds=filtered.reduce((s,c)=>s+c.tdsAmt,0);

  return (
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📜</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>TDS Certificate Register — Form 16A</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Track certificates issued to vendors · Quarterly · Section 194C/H/J/D</p>
          </div>
        </div>
        <select value={quarter} onChange={e=>setQuarter(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {QUARTERS.map(q=><option key={q}>{q}</option>)}
        </select>
      </div>

      {pending>0&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600,display:"flex",gap:8}}>
        <AlertTriangle size={15}/> {pending} Form 16A certificate{pending>1?"s":""} pending issuance. Due by quarter-end — failure to issue attracts penalty ₹100/day.
      </div>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[{l:"Total Certs",v:String(filtered.length),c:"#384677",bg:"#f3f4f8"},
          {l:"Pending Issue",v:String(pending),c:"#A32D2D",bg:"#FCEBEB"},
          {l:"Issued",v:String(filtered.filter(c=>c.status==="Issued").length),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Acknowledged",v:String(filtered.filter(c=>c.status==="Acknowledged").length),c:"#27500A",bg:"#EAF3DE"},
          {l:"Total TDS Covered",v:"₹"+totTds.toLocaleString(),c:"#854F0B",bg:"#FAEEDA"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Certificate ID","Vendor","PAN","Section","Quarter","TDS Amount","Cert No.","Issued On","Due Date","Status","Action"].map((h,i)=>(
              <th key={i} style={{padding:"9px 11px",textAlign:i===5?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((c,i)=>{
            const dl=daysLeft(c.dueDate);
            return (
              <tr key={c.id} style={{borderBottom:"1px solid #dfe2e7",background:c.status==="Pending"&&dl&&dl<14?"#fff5f5":i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:9.5,color:"#185FA5"}}>{c.id}</td>
                <td style={{padding:"8px 11px",fontWeight:600,color:"#0d1326"}}>{c.vendor}</td>
                <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:9.5,color:"#5a6691"}}>{c.pan}</td>
                <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{c.section}</span></td>
                <td style={{padding:"8px 11px",color:"#384677"}}>{c.quarter} ({c.period})</td>
                <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>₹{c.tdsAmt.toLocaleString()}</td>
                <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:9.5,color:c.certNo?"#27500A":"#bfc3d6"}}>{c.certNo||"Pending"}</td>
                <td style={{padding:"8px 11px",color:"#5a6691",whiteSpace:"nowrap"}}>{c.issued||"—"}</td>
                <td style={{padding:"8px 11px",color:dl&&dl<14?"#A32D2D":"#5a6691",fontWeight:dl&&dl<14?700:400,whiteSpace:"nowrap"}}>{c.dueDate}</td>
                <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[c.status]||"#f3f4f8",color:STATUS_CLR[c.status]||"#5a6691"}}>{c.status}</span></td>
                <td style={{padding:"8px 11px"}}>
                  {c.status==="Pending"&&<button onClick={()=>setCerts(cs=>cs.map(x=>x.id===c.id?{...x,status:"Issued",issued:TODAY,certNo:`CERT-${c.quarter.replace(/ /g,"-")}-${String(Math.floor(Math.random()*900)+100)}`}:x))} style={{...btnG,padding:"2px 8px",fontSize:9.5,background:"#185FA5",whiteSpace:"nowrap"}}>Issue 16A</button>}
                  {c.status==="Issued"&&<button onClick={()=>setCerts(cs=>cs.map(x=>x.id===c.id?{...x,status:"Acknowledged"}:x))} style={{...btnGh,padding:"2px 8px",fontSize:9.5,whiteSpace:"nowrap"}}>Acknowledged</button>}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

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
export function LedgerSelect({value,onChange,filter,placeholder,style={},branch}){
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


export function PackagePnL({branch}){
  const mob=useMobile();
  const [period,setPeriod]=useState("YTD");
  const PERIODS=MONTH_PERIOD_OPTIONS;
  const FY_MONTHS=FY_YTD_MONTHS;
  // LIVE: per-booking GP list (GET /api/accounting/gp-bills, branch-scoped server-side),
  // filtered to Holiday/MICE packages. Previously read the empty GP_BILLS seed (always blank).
  const gpQ=useGpBills(branch);
  const bills=useMemo(()=>(gpQ.data||[]).filter(b=>(b.mod==="Holiday"||b.mod==="MICE")&&(period==="YTD"?FY_MONTHS.includes(String(b.date||"").slice(0,7)):String(b.date||"").startsWith(period))),[gpQ.data,period]);

  // Group by tour code (falls back to a destination-derived code when the booking
  // carries no explicit tour code).
  const pkgMap={};
  bills.forEach(b=>{
    const tourCode=b.tourCode||`TC-${b.dest?.slice(0,3).toUpperCase()||"OTH"}`;
    if(!pkgMap[tourCode])pkgMap[tourCode]={code:tourCode,dest:b.dest||"Various",rev:0,cost:0,bks:0,pax:0};
    pkgMap[tourCode].rev+=(b.sell||0);pkgMap[tourCode].cost+=(b.cost||0);pkgMap[tourCode].bks++;pkgMap[tourCode].pax+=b.pax||2;
  });
  const rows=Object.values(pkgMap).map(p=>({...p,gp:p.rev-p.cost,gpPct:p.rev>0?+(( p.rev-p.cost)/p.rev*100).toFixed(1):0,gpPerPax:p.pax>0?Math.round((p.rev-p.cost)/p.pax):0})).sort((a,b)=>b.gp-a.gp);
  const cur=(bc(branch)||{}).cur||"₹";
  const f=n=>cur+Number(Math.round(n||0)).toLocaleString((cur==="₹"||cur==="₨"||cur==="Rs")?"en-IN":"en-US");

  return(
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📦</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Package P&L by Tour Code</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{rows.length} tour codes · {bills.length} holiday bookings · GP per package</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <button onClick={()=>exportToCSV(rows,["code","dest","bks","pax","rev","cost","gp","gpPct"],"package-pnl.csv")} style={{...btnGh,fontSize:11}}><Download size={12}/> CSV</button>
        </div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Tour Code","Destination","Bookings","Pax","Revenue","Cost","Gross Profit","GP%","GP/Pax","Rating"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=2?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{rows.map((r,i)=>(
            <tr key={r.code} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px",fontFamily:"monospace",fontWeight:700,color:"#185FA5"}}>{r.code}</td>
              <td style={{padding:"8px 12px",fontWeight:500,color:"#0d1326"}}>{r.dest}</td>
              <td style={{padding:"8px 12px",textAlign:"right"}}>{r.bks}</td>
              <td style={{padding:"8px 12px",textAlign:"right"}}>{r.pax}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(r.rev)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{f(r.cost)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#27500A",fontVariantNumeric:"tabular-nums"}}>{f(r.gp)}</td>
              <td style={{padding:"8px 12px",textAlign:"right"}}><span style={{fontSize:10.5,padding:"2px 7px",borderRadius:999,fontWeight:800,background:r.gpPct>=15?"#EAF3DE":r.gpPct>=8?"#FAEEDA":"#FCEBEB",color:r.gpPct>=15?"#27500A":r.gpPct>=8?"#854F0B":"#A32D2D"}}>{r.gpPct}%</span></td>
              <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#384677"}}>{f(r.gpPerPax)}</td>
              <td style={{padding:"8px 12px",textAlign:"right"}}>{r.gpPct>=15?"⭐⭐⭐":r.gpPct>=10?"⭐⭐":"⭐"}</td>
            </tr>
          ))}
          {rows.length===0&&<tr><td colSpan={10} style={{padding:"24px",textAlign:"center",color:"#5a6691"}}>{gpQ.isLoading?"Loading holiday bookings…":"No holiday bookings for this period"}</td></tr>}
          </tbody>
          {rows.length>0&&<tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={4} style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(rows.reduce((s,r)=>s+r.rev,0))}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(rows.reduce((s,r)=>s+r.cost,0))}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(rows.reduce((s,r)=>s+r.gp,0))}</td>
            <td colSpan={3}/>
          </tr></tfoot>}
        </table>
      </div>
    </div>
  );
}

/* ── REFUND TRACKER ──────────────────────────────────────────── */

export const REFUNDS_DATA=[];

export const STATUS_FLOW=["Cancellation Requested","BSP Filed","Airline Refund Received","Client Refund Done","Closed"];

export function Recruitment({branch}){
  const mob=useMobile();
  const brScope=branch==="ALL"?"":(branch?.code||"");
  const jobsQ=useMasterList('job-openings', brScope?{branch:brScope}:{});
  const jobs=((jobsQ.data)||[]).map(fromJobDTO);
  const {create,update}=useMasterMutations('job-openings');
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const blank={title:"",dept:"",branch:brScope||"BOM",location:"",type:"Full-time",salary:"",skills:"",applicants:0,posted:todayISO(),status:"Open"};
  const [form,setForm]=useState(blank);
  const STATUS_CLR={Open:"#185FA5",Interviewing:"#854F0B",Hired:"#27500A","On-hold":"#854F0B",Closed:"#5a6691"};
  const STATUS_BG ={Open:"#E6F1FB",Interviewing:"#FAEEDA",Hired:"#EAF3DE","On-hold":"#FAEEDA",Closed:"#f3f4f8"};

  const advance=(j)=>update.mutate({id:j.id,body:toJobPayload({...j,status:JOB_NEXT_STATUS[j.status]||"Closed"})},
    {onError:e=>toast(e?.message||"Could not update","error")});
  const postJob=()=>{
    if(!form.title){toast("Job title is required","error");return;}
    create.mutate(toJobPayload(form),{
      onSuccess:()=>{toast("Job posted");setModal(false);setForm(blank);},
      onError:e=>toast(e?.message||"Could not post job","error")});
  };

  return(
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>👔</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Recruitment</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{jobsQ.isLoading?"Loading…":`${jobs.filter(j=>j.status==="Open").length} open positions`} · {jobs.reduce((s,j)=>s+j.applicants,0)} total applicants · {branch==="ALL"?"All branches":(branch?.code||brScope||"—")}</p>
          </div>
        </div>
        <button onClick={()=>{setForm(blank);setModal(true);}} style={{...btnG,fontSize:11}}><Plus size={13}/> Post Job</button>
      </div>

      {jobs.length===0&&!jobsQ.isLoading&&(
        <div style={{...card,padding:"24px",textAlign:"center",color:"#8b94b3",fontSize:12}}>No job openings for this branch. Use “Post Job” to add one.</div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:12}}>
        {jobs.map(j=>(
          <div key={j.id} style={{...card,borderTop:`3px solid ${STATUS_CLR[j.status]||"#384677"}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>{j.title}</p>
                <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{j.dept} · {j.location} · {j.type}</p>
              </div>
              <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[j.status],color:STATUS_CLR[j.status]}}>{j.status}</span>
            </div>
            <div style={{display:"flex",gap:10,marginBottom:8}}>
              <div style={{flex:1,padding:"6px 10px",borderRadius:7,background:"#f3f4f8",textAlign:"center"}}>
                <p style={{margin:0,fontSize:8.5,color:"#5a6691"}}>Applicants</p>
                <p style={{margin:"1px 0 0",fontSize:16,fontWeight:800,color:"#0d1326"}}>{j.applicants}</p>
              </div>
              <div style={{flex:2,padding:"6px 10px",borderRadius:7,background:"#f3f4f8"}}>
                <p style={{margin:0,fontSize:8.5,color:"#5a6691"}}>Salary range</p>
                <p style={{margin:"1px 0 0",fontSize:11,fontWeight:700,color:"#27500A"}}>{j.salary}</p>
              </div>
            </div>
            <p style={{margin:"0 0 10px",fontSize:10.5,color:"#5a6691"}}><b>Skills:</b> {j.skills}</p>
            <div style={{display:"flex",gap:6}}>
              <button style={{...btnG,fontSize:10,padding:"4px 12px",flex:1}}>View Applicants</button>
              <button onClick={()=>advance(j)} disabled={update.isPending} style={{...btnGh,fontSize:10,padding:"4px 10px"}}>{j.status==="Open"?"→ Interview":j.status==="Interviewing"?"→ Hire":j.status==="Hired"?"Close":"Close"}</button>
            </div>
          </div>
        ))}
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:520,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Post a Job Opening</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <FL label="Job title"><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={inp}/></FL>
              <FL label="Department"><input value={form.dept} onChange={e=>setForm(f=>({...f,dept:e.target.value}))} style={inp}/></FL>
              <FL label="Branch"><input value={form.branch} onChange={e=>setForm(f=>({...f,branch:e.target.value}))} style={inp}/></FL>
              <FL label="Location"><input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} style={inp}/></FL>
              <FL label="Employment type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}>{["Full-time","Part-time","Contract"].map(t=><option key={t}>{t}</option>)}</select></FL>
              <FL label="Salary range"><input value={form.salary} onChange={e=>setForm(f=>({...f,salary:e.target.value}))} placeholder="₹35K–50K/mo" style={inp}/></FL>
              <FL label="Applicants"><input type="number" value={form.applicants} onChange={e=>setForm(f=>({...f,applicants:e.target.value}))} style={inp}/></FL>
              <FL label="Opened on"><input type="date" value={form.posted} onChange={e=>setForm(f=>({...f,posted:e.target.value}))} style={inp}/></FL>
              <div style={{gridColumn:"1/-1"}}><FL label="Skills"><input value={form.skills} onChange={e=>setForm(f=>({...f,skills:e.target.value}))} placeholder="GDS, ticketing, holiday packages" style={inp}/></FL></div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={postJob} disabled={create.isPending} style={btnG}>{create.isPending?"Posting…":"Post Job"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── TRAINING RECORDS ─────────────────────────────────────────── */

export function TrainingRecords({branch}){
  const mob=useMobile();
  const emps=HR_EMPLOYEES_DATA.filter(e=>branch==="ALL"||e.branch===branch?.code||true).slice(0,8);
  const TRAININGS=[
    {title:"Amadeus GDS Certification",provider:"Amadeus",type:"Technical",validity:24,mandatory:true},
    {title:"IATA Travel & Tourism",provider:"IATA",type:"Professional",validity:36,mandatory:true},
    {title:"GST for Travel Agents",provider:"CA Firm",type:"Compliance",validity:12,mandatory:true},
    {title:"Anti-Money Laundering",provider:"Internal",type:"Compliance",validity:12,mandatory:true},
    {title:"Sales & Communication",provider:"Internal",type:"Soft Skills",validity:0,mandatory:false},
  ];
  const TYPE_CLR={Technical:"#185FA5",Professional:"#854F0B",Compliance:"#A32D2D","Soft Skills":"#1D9E75"};
  const TYPE_BG ={Technical:"#E6F1FB",Professional:"#FAEEDA",Compliance:"#FCEBEB","Soft Skills":"#EAF3DE"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🎓</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Training Records</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{TRAININGS.filter(t=>t.mandatory).length} mandatory certifications · Track compliance for all staff</p>
        </div>
      </div>

      {/* Training matrix */}
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:800}}>
            <thead><tr style={{background:"#0d1326"}}>
              <th style={{padding:"9px 12px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5,minWidth:160}}>Employee</th>
              {TRAININGS.map((t,i)=>(
                <th key={i} style={{padding:"8px 10px",textAlign:"center",color:"#d4a437",fontWeight:700,fontSize:9,minWidth:100}}>
                  <div style={{marginBottom:2}}>{t.title.split(" ").slice(0,2).join(" ")}</div>
                  {t.mandatory&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:999,background:"#A32D2D33",color:"#d4a437"}}>Required</span>}
                </th>
              ))}
            </tr>
            </thead>
            <tbody>{emps.map((e,i)=>{
              const scores=[true,i<6,true,i<7,i<4]; // simulate completion
              return(
                <tr key={e.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{e.name}<br/><span style={{fontSize:9,color:"#5a6691"}}>{e.branch}</span></td>
                  {TRAININGS.map((t,j)=>(
                    <td key={j} style={{padding:"8px 10px",textAlign:"center"}}>
                      <span style={{fontSize:14}}>{scores[j]?"✅":"❌"}</span>
                    </td>
                  ))}
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
      <div style={{marginTop:10,display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button style={{...btnG,fontSize:11}}>📅 Schedule Training</button>
        <button style={{...btnGh,fontSize:11}}><Download size={12}/> Compliance Report</button>
      </div>
    </div>
  );
}

/* ── DOCUMENT MANAGER ─────────────────────────────────────────── */

export function BudgetPlanning({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:branch?.code;
  const [fy,setFy]=useState("FY 2026-27");
  const BUDGET_HEADS=[
    {cat:"Income",gl:"Revenue — All Modules",budget:120000000,actual:23180000,var:0},
    {cat:"Income",gl:"Commission Income",budget:8000000,actual:1480000,var:0},
    {cat:"Direct Cost",gl:"Airline & Hotel Purchase",budget:95000000,actual:18200000,var:0},
    {cat:"Expenses",gl:"Salaries & Wages",budget:12000000,actual:2080000,var:0},
    {cat:"Expenses",gl:"Office Rent",budget:1440000,actual:240000,var:0},
    {cat:"Expenses",gl:"GDS Charges",budget:540000,actual:90000,var:0},
    {cat:"Expenses",gl:"Advertising",budget:600000,actual:64000,var:0},
    {cat:"Expenses",gl:"Software Subscriptions",budget:336000,actual:56000,var:0},
    {cat:"Expenses",gl:"Other Expenses",budget:800000,actual:138000,var:0},
  ];
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const MONTHS=2; // Apr + May done
  const pct=n=>MONTHS>0?+(n/MONTHS/12*100).toFixed(1):0;

  return(
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <SampleBanner note="budget figures and actuals are sample data, not live." />
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📊</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Budget vs Actual</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{fy} · {MONTHS}/12 months elapsed · {brCode||CONSOLIDATED_LABEL}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <select value={fy} onChange={e=>setFy(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}><option>FY 2026-27</option><option>FY 2025-26</option></select>
          <button style={{...btnGh,fontSize:11}}><Download size={12}/> Export</button>
        </div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Category","GL Account","Annual Budget","YTD Actual","YTD Expected","Variance","Utilisation"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=2?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{BUDGET_HEADS.map((r,i)=>{
            const expected=Math.round(r.budget*MONTHS/12);
            const variance=r.actual-expected;
            const utilPct=r.budget>0?Math.round(r.actual/r.budget*100):0;
            const expectedPct=Math.round(MONTHS/12*100);
            const good=(r.cat==="Income"&&variance>=0)||(r.cat!=="Income"&&variance<=0);
            return(
              <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:r.cat==="Income"?"#E6F1FB":r.cat==="Direct Cost"?"#FCEBEB":"#f3f4f8",color:r.cat==="Income"?"#185FA5":r.cat==="Direct Cost"?"#A32D2D":"#384677"}}>{r.cat}</span></td>
                <td style={{padding:"8px 12px",fontWeight:500,color:"#0d1326"}}>{r.gl}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(r.budget)}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{f(r.actual)}</td>
                <td style={{padding:"8px 12px",textAlign:"right",color:"#5a6691",fontVariantNumeric:"tabular-nums"}}>{f(expected)}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:good?"#27500A":"#A32D2D"}}>{variance>=0?"+":""}{f(variance)}</td>
                <td style={{padding:"8px 12px",textAlign:"right"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
                    <div style={{width:50,height:6,borderRadius:3,background:"#e1e3ec",overflow:"hidden"}}>
                      <div style={{width:`${Math.min(utilPct,100)}%`,height:"100%",background:good?"#27500A":"#A32D2D",borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:10.5,fontWeight:700,color:good?"#27500A":"#A32D2D"}}>{utilPct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   BATCH E — FINAL 4 MISSING SCREENS
   IntercompanyBilling · SeatInventory · ClientAccount360 · GratuityRegister · EWayBill
   ════════════════════════════════════════════════════════════════ */

/* ── INTERCOMPANY BILLING ────────────────────────────────────── */

export function SeatInventory({branch}){
  const mob=useMobile();
  const [search,setSearch]=useState("");
  const [date,setDate]=useState(todayISO());
  const SEATS=[
    {id:"SI001",flight:"AI-144",route:"BOM-DXB",date:"2026-06-15",aircraft:"B787",classConfig:[{cls:"Economy",total:250,held:18,sold:196,avail:36},{cls:"Business",total:30,held:2,sold:21,avail:7}],status:"Open",dep:"14:20"},
    {id:"SI002",flight:"EK-506",route:"BOM-DXB",date:"2026-06-15",aircraft:"A380",classConfig:[{cls:"Economy",total:420,held:22,sold:398,avail:0},{cls:"Business",total:58,held:3,sold:45,avail:10},{cls:"First",total:14,held:0,sold:12,avail:2}],status:"Near Full",dep:"03:30"},
    {id:"SI003",flight:"6E-1754",route:"BOM-DEL",date:"2026-06-15",aircraft:"A320",classConfig:[{cls:"Economy",total:186,held:8,sold:142,avail:36}],status:"Open",dep:"09:15"},
    {id:"SI004",flight:"AI-101",route:"DEL-LHR",date:"2026-06-16",aircraft:"B777",classConfig:[{cls:"Economy",total:240,held:14,sold:220,avail:6},{cls:"Business",total:48,held:1,sold:40,avail:7}],status:"Open",dep:"01:45"},
  ];
  const filtered=SEATS.filter(s=>!search||(s.flight+s.route).toLowerCase().includes(search.toLowerCase()));
  // Flatten the per-flight class config into one row per flight × cabin class for export.
  const seatRows=filtered.flatMap(s=>s.classConfig.map(c=>({flight:s.flight,route:s.route,date:s.date,dep:s.dep,aircraft:s.aircraft,status:s.status,cls:c.cls,total:c.total,sold:c.sold,held:c.held,avail:c.avail})));
  const STATUS_CLR={"Near Full":"#A32D2D",Open:"#27500A",Closed:"#5a6691"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div role="note" style={{margin:"0 0 12px",padding:"8px 12px",background:"#FAEEDA",border:"1px solid #f0d28a",borderRadius:8,fontSize:11.5,color:"#854F0B",fontWeight:600}}>⚠ Sample data — seat inventory isn’t wired to a live source yet.</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>💺</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Seat Inventory</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Seats held by Travkings · Monitor allocation vs availability</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Flight / route..." style={{...inp,width:160,minHeight:32,fontSize:11}}/>
          <HExportBtn name="seat-inventory" rows={seatRows} columns={[{key:"flight",label:"Flight"},{key:"route",label:"Route"},{key:"date",label:"Date"},{key:"dep",label:"Departure"},{key:"aircraft",label:"Aircraft"},{key:"status",label:"Status"},{key:"cls",label:"Class"},{key:"total",label:"Total Seats"},{key:"sold",label:"Sold"},{key:"held",label:"Held"},{key:"avail",label:"Available"}]}/>
          <button style={{...btnG,fontSize:11}}><Plus size={13}/> Reserve Seats</button>
        </div>
      </div>

      {filtered.map(s=>(
        <div key={s.id} style={{...card,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{width:42,height:42,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>✈</div>
              <div>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
                  <span style={{fontWeight:800,fontSize:14,color:"#0d1326"}}>{s.flight}</span>
                  <span style={{fontSize:10.5,color:"#5a6691"}}>{s.route}</span>
                  <span style={{fontSize:9,padding:"1px 6px",borderRadius:999,fontWeight:700,background:(STATUS_CLR[s.status]||"#384677")+"22",color:STATUS_CLR[s.status]||"#384677"}}>{s.status}</span>
                </div>
                <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{s.date} · Dep {s.dep} · {s.aircraft}</p>
              </div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button style={{...btnG,fontSize:10,padding:"4px 12px"}}>+ Reserve More</button>
              <button style={{...btnGh,fontSize:10,padding:"4px 10px"}}>Release Held</button>
            </div>
          </div>
          {/* Class config */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {s.classConfig.map((cls,ci)=>{
              const soldPct=Math.round(cls.sold/cls.total*100);
              const heldPct=Math.round(cls.held/cls.total*100);
              return(
                <div key={cls.cls} style={{flex:1,minWidth:160,padding:"10px 12px",borderRadius:9,border:"1px solid #cdd1d8",background:"#fafafa"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontWeight:700,fontSize:11,color:"#0d1326"}}>{cls.cls}</span>
                    <span style={{fontSize:10.5,fontWeight:600,color:cls.avail===0?"#A32D2D":cls.avail<=10?"#854F0B":"#27500A"}}>{cls.avail} avail</span>
                  </div>
                  {/* Visual bar */}
                  <div style={{height:10,borderRadius:5,background:"#e1e3ec",overflow:"hidden",marginBottom:6,display:"flex"}}>
                    <div style={{width:`${soldPct}%`,background:"#185FA5",borderRadius:"5px 0 0 5px"}}/>
                    <div style={{width:`${heldPct}%`,background:"#d4a437"}}/>
                    <div style={{flex:1,background:"#EAF3DE"}}/>
                  </div>
                  <div style={{display:"flex",gap:8,fontSize:9.5}}>
                    <span style={{color:"#185FA5"}}>■ Sold: {cls.sold}</span>
                    <span style={{color:"#d4a437"}}>■ Held: {cls.held}</span>
                    <span style={{color:"#27500A"}}>■ Free: {cls.avail}</span>
                  </div>
                  <p style={{margin:"4px 0 0",fontSize:8.5,color:"#5a6691"}}>Total: {cls.total} · Load {soldPct+heldPct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── GRATUITY REGISTER ───────────────────────────────────────── */

export function GratuityRegister({branch}){
  const mob=useMobile();
  const brScope=branch==="ALL"?"":(branch?.code||"");
  /* Live, branch-scoped employees; gratuity provision is computed from Basic+DA
     and length of service per the Payment of Gratuity Act. */
  const emps=((useMasterList('employees', brScope?{branch:brScope}:{}).data)||[]).map(fromEmpDTO);
  const DOJ_TO_YEARS=doj=>{const d=new Date(doj);const n=new Date();return+((n-d)/(365.25*86400000)).toFixed(2);};
  const GRATUITY=e=>{
    const yrs=DOJ_TO_YEARS(e.joined||"2021-04-01");
    if(yrs<5)return{eligible:false,yrs:yrs,amount:0,note:"<5 years service"};
    const basic=e.basic+(e.da||0);
    const amt=Math.round(basic*yrs*15/26);
    return{eligible:true,yrs,amount:amt,note:`${yrs.toFixed(1)} yrs × 15/26`};
  };
  const data=emps.map(e=>({...e,...GRATUITY(e)}));
  const eligible=data.filter(e=>e.eligible);
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const totProvision=data.reduce((s,e)=>{const g=GRATUITY(e);const basic=(e.basic||0)+(e.da||0);return s+Math.round(basic*g.yrs*15/26);},0);

  return(
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🎁</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Gratuity Register</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>As per Payment of Gratuity Act 1972 · 15/26 × Basic+DA × Years · {eligible.length} eligible employees</p>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Total Employees",v:String(data.length),c:"#384677",bg:"#f3f4f8"},
          {l:"Eligible (≥5 yrs)",v:String(eligible.length),c:"#27500A",bg:"#EAF3DE"},
          {l:"Not Yet Eligible",v:String(data.length-eligible.length),c:"#854F0B",bg:"#FAEEDA"},
          {l:"Total Gratuity Provision",v:f(totProvision),c:"#185FA5",bg:"#E6F1FB"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"10px 12px",background:k.bg}}>
            <p style={{margin:0,fontSize:8.5,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"3px 0 0",fontSize:mob?15:18,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      <div style={{padding:"9px 14px",borderRadius:9,background:"#E6F1FB",border:"1px solid #B5D4F4",marginBottom:12,fontSize:10.5,color:"#185FA5"}}>
        Formula: <b>Gratuity = (Last drawn Basic+DA) × Years × 15 ÷ 26</b> · Maximum: ₹20,00,000 (₹20L) · Payable on resignation, retirement, or death/disability after 5 years of continuous service.
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Employee","Branch","DOJ","Service","Basic+DA","Gratuity Provision","Eligible","Note"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=4&&i<=5?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{data.map((e,i)=>{
            const g=GRATUITY(e);
            return(
              <tr key={e.id} style={{borderBottom:"1px solid #dfe2e7",background:g.eligible?"#f0fff4":i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{e.name}</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 6px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{e.branch}</span></td>
                <td style={{padding:"8px 12px",color:"#5a6691",whiteSpace:"nowrap"}}>{e.joined||"2021-04-01"}</td>
                <td style={{padding:"8px 12px",fontWeight:600,color:g.yrs>=5?"#27500A":"#854F0B"}}>{g.yrs.toFixed(1)} yrs</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f((e.basic||0)+(e.da||0))}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:g.eligible?"#27500A":"#5a6691"}}>{g.eligible?f(g.amount):"—"}</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:g.eligible?"#EAF3DE":"#f3f4f8",color:g.eligible?"#27500A":"#5a6691"}}>{g.eligible?"Yes":"No"}</span></td>
                <td style={{padding:"8px 12px",fontSize:10,color:"#5a6691"}}>{g.note}</td>
              </tr>
            );
          })}</tbody>
          <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={5} style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL GRATUITY PROVISION (ALL EMPLOYEES)</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totProvision)}</td>
            <td colSpan={2}/>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

/* ── E-WAY BILL ──────────────────────────────────────────────── */

export const ASSET_CATEGORIES = []; /* moved to DB — fetch via API/hook */


export const FIXED_ASSETS_DATA = [];


export const VENDOR_ADVANCES_DATA = [];


export const FX_REVAL_DATA = [];


export function FxRevaluation({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [period,setPeriod]=useState(CUR_MONTH);

  const rows=FX_REVAL_DATA.filter(r=>!brCode||r.branch===brCode);
  const totGain=rows.reduce((s,r)=>s+(r.fxGain>0?r.fxGain:0),0);
  const totLoss=rows.reduce((s,r)=>s+(r.fxGain<0?Math.abs(r.fxGain):0),0);
  const net=totGain-totLoss;

  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>💱 Period-End FX Revaluation</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>Mark foreign-currency balances to month-end rate · Auto-posts FX gain/loss JV · AS 11 / Ind AS 21</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:7,fontSize:11.5}}>
            {MONTH_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <button style={{padding:"7px 14px",border:"none",background:"#d4a437",color:"#0d1326",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"}}>📒 Post Revaluation JV</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Unrealised Gain</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{cur+fmt(totGain)}</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Unrealised Loss</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{cur+fmt(totLoss)}</p></div>
        <div style={{...card,borderTop:"3px solid "+(net>=0?"#27500A":"#A32D2D")}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Net Impact</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:net>=0?"#27500A":"#A32D2D"}}>{cur+fmt(net)}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Ledgers to Revalue</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{rows.length}</p></div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Ledger</th><th style={{padding:"9px 8px",textAlign:"center"}}>Ccy</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>FCY Amount</th><th style={{padding:"9px 8px",textAlign:"right"}}>Book Rate</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Month-End Rate</th><th style={{padding:"9px 8px",textAlign:"right"}}>Book Value</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Revalued</th><th style={{padding:"9px 8px",textAlign:"right"}}>FX Gain/(Loss)</th>
            </tr></thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
                  <td style={{padding:"7px 8px",fontWeight:600}}>{r.ledger}<div style={{fontSize:9.5,color:"#5a6691",fontWeight:400}}>{r.branch}</div></td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:"#E6F1FB",color:"#185FA5"}}>{r.ccy}</span></td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{fmt(r.origAmt)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontSize:10,color:"#5a6691"}}>{r.bookRate.toFixed(2)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontSize:10,color:"#854F0B",fontWeight:600}}>{r.monthEndRate.toFixed(2)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(r.bookValue)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(r.revalued)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,color:r.fxGain>0?"#27500A":"#A32D2D"}}>{r.fxGain>0?"+":""}{cur+fmt(r.fxGain)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{background:"#FAEEDA",fontWeight:700,fontSize:11.5}}>
              <tr><td colSpan={7} style={{padding:"9px 8px",textAlign:"right"}}>NET FX REVALUATION</td>
              <td style={{padding:"9px 8px",textAlign:"right",color:net>=0?"#27500A":"#A32D2D"}}>{net>=0?"+":""}{cur+fmt(net)}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p style={{marginTop:14,fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>
        💡 Posts JV: Dr/Cr Exchange Rate Difference vs each foreign-currency ledger. Reverses on next period close (AS 11).
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TAXATION ADDITIONS — GSTR-9C, 3CD Tax Audit, GSTR-2A Reconciliation
   ════════════════════════════════════════════════════════════════ */


export const MSME_OVERDUE_DATA = [];


export function MsmeTracker({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;

  const bills=MSME_OVERDUE_DATA.filter(b=>!brCode||b.branch===brCode);
  const critical=bills.filter(b=>b.ageDays>=45);
  const high=bills.filter(b=>b.ageDays>=30&&b.ageDays<45);
  const watch=bills.filter(b=>b.ageDays<30);
  const totalAtRisk=critical.reduce((s,b)=>s+b.outstanding,0);
  const totalDisallow=Math.round(totalAtRisk*0.3); // potential income-tax disallowance
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>⚠️ MSME 45-Day Compliance Tracker</h2>
      <p style={{margin:"4px 0 10px",fontSize:11.5,color:"#5a6691"}}>Section 43B(h) of Income Tax Act · Pay MSME suppliers within 45 days or lose tax deduction</p>
      <SampleBanner note="MSME supplier registration (UDYAM) is not yet captured on supplier masters — 43B(h) exposure cannot be computed from the live books. The figures below are NOT a clean bill of health; flag MSME suppliers first." />

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Critical (&gt; 45 days)</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{critical.length}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{cur+fmt(totalAtRisk)} at risk</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>High (30-45)</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{high.length}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Watch (&lt; 30)</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{watch.length}</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Potential Tax Hit</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{cur+fmt(totalDisallow)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>30% IT disallowance</p></div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Bill #</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>MSME Supplier</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>UDYAM Number</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Bill Date</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Due Date</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Age</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Outstanding</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Risk</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Action</th>
            </tr></thead>
            <tbody>
              {bills.sort((a,b)=>b.ageDays-a.ageDays).map((b,i)=>(
                <tr key={b.id} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{b.id}</td>
                  <td style={{padding:"7px 8px",fontWeight:600}}>{b.supplier}</td>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#5a6691"}}>{b.msmeNo}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{b.billDate}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10,fontWeight:b.ageDays>=45?700:400,color:b.ageDays>=45?"#A32D2D":"#5a6691"}}>{b.dueDate}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontWeight:700,color:b.ageDays>=45?"#A32D2D":b.ageDays>=30?"#854F0B":"#185FA5"}}>{b.ageDays}d</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700}}>{cur+fmt(b.outstanding)}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:b.risk==="Critical"?"#FCEBEB":b.risk==="High"?"#FAEEDA":b.risk==="Medium"?"#E6F1FB":"#f3f4f8",color:b.risk==="Critical"?"#A32D2D":b.risk==="High"?"#854F0B":b.risk==="Medium"?"#185FA5":"#5a6691"}}>{b.risk}</span></td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><button style={{padding:"3px 10px",border:"none",background:"#d4a437",color:"#0d1326",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer"}}>Pay Now</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{marginTop:12,padding:"10px 14px",background:"#FCEBEB",borderLeft:"4px solid #A32D2D",borderRadius:6}}>
        <p style={{margin:0,fontSize:11,color:"#A32D2D",fontWeight:700}}>⚠️ Statutory Alert — Section 43B(h)</p>
        <p style={{margin:"4px 0 0",fontSize:10.5,color:"#0d1326"}}>If MSME suppliers are not paid within 45 days (or as agreed, whichever is earlier), the expense becomes disallowable in the year of incurrence. Tax deduction is only available in the year of actual payment. Tag MSME flag in Supplier Master.</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HR ADDITIONS — Employee Loans & Salary Advances
   ════════════════════════════════════════════════════════════════ */


export const PERIOD_LOCK_DATA = [];


export const APPROVAL_RULES = []; /* moved to DB — fetch via API/hook */


export const PENDING_APPROVALS_DATA = [];


export function PendingApprovals({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [filter,setFilter]=useState("All");

  const visible=filter==="All"?PENDING_APPROVALS_DATA:PENDING_APPROVALS_DATA.filter(p=>p.priority===filter);
  const totValue=visible.filter(p=>p.amount>0).reduce((s,p)=>s+p.amount,0);
  const high=PENDING_APPROVALS_DATA.filter(p=>p.priority==="High").length;
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>📋 Pending Approvals Queue</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Vouchers awaiting checker approval · SLA-tracked · Approve/Reject/Return for revision</p>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Pending Total</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{PENDING_APPROVALS_DATA.length}</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>High Priority</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{high}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Value at Stake</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{cur+fmt(totValue)}</p></div>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Within SLA</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{PENDING_APPROVALS_DATA.filter(p=>p.ageHours<24).length}/{PENDING_APPROVALS_DATA.length}</p></div>
      </div>

      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        {["All","High","Medium","Low"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"4px 12px",border:"1px solid "+(filter===f?"#0d1326":"#e1e3ec"),background:filter===f?"#0d1326":"#fff",color:filter===f?"#d4a437":"#5a6691",borderRadius:14,fontSize:11,fontWeight:600,cursor:"pointer"}}>{f}</button>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Voucher</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Type</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Amount</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Vendor/Party</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Posted By</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Approver</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Age</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Priority</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Action</th>
            </tr></thead>
            <tbody>
              {visible.map((p,i)=>(
                <tr key={p.id} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{p.id}</td>
                  <td style={{padding:"7px 8px",fontSize:10.5}}>{p.type}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600}}>{p.amount>0?cur+fmt(p.amount):"—"}</td>
                  <td style={{padding:"7px 8px"}}>{p.vendor}<div style={{fontSize:9.5,color:"#5a6691"}}>{p.notes}</div></td>
                  <td style={{padding:"7px 8px",fontSize:10}}>{p.postedBy}</td>
                  <td style={{padding:"7px 8px",fontSize:10,color:"#185FA5",fontWeight:600}}>{p.approver}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontWeight:600,fontSize:10,color:p.ageHours>4?"#A32D2D":p.ageHours>2?"#854F0B":"#27500A"}}>{p.ageHours}h</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:p.priority==="High"?"#FCEBEB":p.priority==="Medium"?"#FAEEDA":"#E6F1FB",color:p.priority==="High"?"#A32D2D":p.priority==="Medium"?"#854F0B":"#185FA5"}}>{p.priority}</span></td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}>
                    <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                      <button style={{padding:"3px 8px",border:"none",background:"#27500A",color:"#fff",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>✓</button>
                      <button style={{padding:"3px 8px",border:"none",background:"#A32D2D",color:"#fff",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>✗</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


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


export function DocumentTypeMaster(){
  // Live print-template master (GET /api/document-types). Was hardcoded DOCUMENT_TYPES_DATA.
  const rows = useDocumentTypes().data || [];
  return MASTER_PAGE("Document Type Master","Configurable templates for invoices, receipts, certificates — header, footer, logo, numbering",
    <>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <p style={{margin:0,fontSize:12,color:"#5a6691"}}>{rows.length} document templates configured · {rows.filter(d=>d.active).length} active</p>
        <div style={{flex:1}}/>
        <button style={{padding:"8px 14px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,cursor:"pointer"}}>📥 Import</button>
        <HExportBtn name="document-types" rows={rows} columns={[{key:"type",label:"Document Type"},{key:"layout",label:"Layout"},{key:"header",label:"Header"},{key:"footer",label:"Footer"},{key:"numberingSeries",label:"Numbering Series"},{key:"active",label:"Active"}]}/>
        <button style={{padding:"8px 16px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>+ Add Document Type</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))",gap:12}}>
        {rows.map(d=>(
          <div key={d.id} style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,padding:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <p style={{margin:0,fontSize:13.5,fontWeight:700,color:"#0d1326"}}>{d.type}</p>
              <span style={{padding:"2px 7px",background:d.active?"#d4edda":"#f8d7da",color:d.active?"#155724":"#721c24",borderRadius:3,fontSize:10.5,fontWeight:600}}>{d.active?"Active":"Inactive"}</span>
            </div>
            <div style={{fontSize:11.5,lineHeight:1.6,color:"#5a6691",marginBottom:10}}>
              <p style={{margin:0}}><span style={{fontWeight:700,color:"#0d1326"}}>Layout:</span> {d.layout}</p>
              <p style={{margin:0}}><span style={{fontWeight:700,color:"#0d1326"}}>Header:</span> {d.header}</p>
              <p style={{margin:0}}><span style={{fontWeight:700,color:"#0d1326"}}>Footer:</span> {d.footer}</p>
              <p style={{margin:0,fontFamily:"monospace"}}><span style={{fontWeight:700,color:"#0d1326",fontFamily:"sans-serif"}}>Numbering:</span> {d.numberingSeries}</p>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button style={{padding:"5px 10px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:4,fontSize:11,cursor:"pointer",fontWeight:600,flex:1}}>Edit Layout</button>
              <button style={{padding:"5px 10px",background:"transparent",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:4,fontSize:11,cursor:"pointer",fontWeight:600}}>Preview</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

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
