/* ════════════════════════════════════════════════════════════════════
   CORE/STYLES.JS
   Auto-generated from KBiz360_v2.jsx · 1176 lines · 44 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Calendar, ChevronDown, ChevronRight, Clock, Download, Plus, Save, Search, Trash2, TrendingDown, TrendingUp, User } from 'lucide-react';
import { Menu as DropdownMenu } from './ux/Menu';
import { Bar, BarChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getUnmatchedTickets, settlePurchaseEntry } from './business-logic';
import { FX_RATES, PURCHASE_REGISTRY } from './data';
import { branchCfg } from './referenceCache';
import { useSalespeople } from './useReference';
import { useQuery } from '@tanstack/react-query';
import { apiGet, getAuthToken } from './api';
import { useMasterList } from './useMasters';
import { fromEmpDTO } from '../modules/hr/employeeMap';
import { fromLeaveDTO } from '../modules/hr/hrMaps';
import { buildLeaveUtilization, buildAttrition, lastMonths } from '../modules/hr/hrReports';
import { fmt, fmtINR } from './format';
import { todayISO, nowLabel, CUR_FY } from './dates';
import { openPrintPreview } from './PrintPreview';
import { AUDIT_TRAIL_DATA, BANK_ACCOUNTS_DATA, CUSTOMER_LTV_DATA, FS_NOTES, TOP_SUPPLIERS_DATA, abcOf, cardStyle } from './helpers';
import { useGpBills, useProfitAndLoss, useYieldByDestination, useCustomerLtv, useAbcAnalysis, useYearOverYear, useFxExposure } from './useAccounting';
import { useTaxFilingBoard, useStatutoryDues } from './useTaxReco';
import { ReportDateBar, resolveReportRange } from './reportDateBar';
import { triggerSaveRefresh, useMobile } from './hooks';
import { openPrintWindow } from './voucher-print';
/* PurchaseLinkField is lazy-loaded (used only inside the sales voucher form),
   so styles.jsx no longer STATICALLY imports the transactions feature —
   completing the break of the styles ↔ feature-modules cycle. The old
   UserSwitcher import was dead (referenced only in a comment) and is removed. */
const PurchaseLinkField = React.lazy(() =>
  import('../modules/transactions').then(m => ({ default: m.PurchaseLinkField })));
/* Lightweight UI tokens were moved to ./styleTokens so eager shell/core files
   can import them WITHOUT pulling this (recharts-heavy) file. Import for local
   use here AND re-export under the original names so lazy './styles' consumers
   keep working unchanged. */
import { B, bc, bcfmt, inp, card, btnG, btnGh, Icon, FL, KpiCard, RPT_thStyle, RPT_tdStyle } from './styleTokens';
export { B, bc, bcfmt, inp, card, btnG, btnGh, Icon, FL, KpiCard, RPT_thStyle, RPT_tdStyle };

/* ── Per-branch config — now DB-backed ──────────────────────────────
   The per-branch config (currency symbol, tax type, GST rates, place-of-supply
   options, voucher prefix) used to be hardcoded here together with demo KPIs /
   bookings / customers / alerts. The demo data is gone (screens read live data);
   the config now comes from /api/company-profile via the synchronous reference
   cache. `B` is a Proxy so legacy `B[code].cur` / `bc(branch)` keep working. */
/* B, bc, bcfmt moved to ./styleTokens (imported + re-exported at top). */

/* ── Voucher number generator ───────────────────────────────────────
   Pattern: BRANCH/DDYY/MODULE + SEQ
   e.g.  AMD/1726/SF00042   BOM/1726/SH00019   AMD/1726/PF00008
   DDYY = day (DD) + year last 2 digits (YY) on date of entry
   17 May 2026 → "1726"
   ─────────────────────────────────────────────────────────────────*/
/* ── Voucher numbering system ───────────────────────────────────────
   Format: BRANCH / DDYY / MODULE + 5-digit running sequence
   e.g.  AMD/1726/SF00001   BOM/1726/SH00019   AMD/1726/PF00042
   Each branch maintains its OWN independent counter per module.
   Branch prefix guarantees zero duplicacy across all branches.
   ─────────────────────────────────────────────────────────────── */

/* Date-stamp: DD (day) + YY (year last 2 digits)  → "1726" */

export function vDate(){
  const d=new Date();
  return String(d.getDate()).padStart(2,"0")+String(d.getFullYear()).slice(-2);
}

/* Branch-module running counters — persists within React session */

/* inp, card, btnG, btnGh moved to ./styleTokens (re-exported at top). */

/* Module icons */

export const ST={
  Paid:    {bg:"#EAF3DE",color:"#27500A"},
  Partial: {bg:"#FAEEDA",color:"#854F0B"},
  Pending: {bg:"#FCEBEB",color:"#A32D2D"},
  Confirmed:{bg:"#E6F1FB",color:"#185FA5"},
};

/* FL moved to ./styleTokens (re-exported at top). */

/* Salesperson — read-only, comes from CRM (SALESPEOPLE in data.js).
   Shown on every sale/purchase voucher so the booking can be matched
   back to a CRM owner. Not editable: CRM is the source of truth. */
export function SalespersonField({branch,label="Salesperson (CRM)",name}){
  const SALESPEOPLE=useSalespeople().data||[];   // DB-backed (/api/salespeople)
  const branchCode=branch?.code;
  const resolved=name||SALESPEOPLE.find(p=>p.branch===branchCode)?.name||SALESPEOPLE[0]?.name||"";
  return (
    <FL label={label}>
      <input value={resolved} readOnly title="Synced from CRM"
        style={{...inp,background:"#f3f4f8",color:"#5a6691",fontWeight:600,cursor:"not-allowed"}}/>
    </FL>
  );
}


/* Keep getUnmatchedTickets for backwards compat (flights only) */



/* ══════════════════════════════════════════════════════════════════
   LINK PURCHASE SELECTOR
   Mandatory on every sales voucher. Opens a dropdown showing all
   available (unsettled) purchase vouchers for that module.
   Turns green when a purchase is selected.
   Shows GP calculation immediately on selection.
   ════════════════════════════════════════════════════════════════ */
/* ══ PURCHASE REGISTRY — all branches × 7 modules ══════════════ */

export function VLinked({branch,type,vNo,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const isSale=type==="sales";

  /* Map sale prefix to purchase module key */
  const pfxToMod={SF:"PF",SH:"PH",SHT:"PHT",SC:"PC",SV:"PV",SI:"PI",SM:"PM"};
  const pfxToPurchRoute={
    SF:"/purchase/flight",SH:"/purchase/holiday",SHT:"/purchase/hotel",
    SC:"/purchase/car",SV:"/purchase/visa",SI:"/purchase/insurance",SM:"/purchase/misc",
  };

  /* Extract module prefix from voucher number — e.g. "BOM/1726/SF00042" → "SF" */
  const extractPfx=vno=>{
    const part=(vno||"").split("/")[2]||"";
    return part.replace(/\d+$/,"");
  };
  const salePfx=extractPfx(vNo);
  const purchMod=pfxToMod[salePfx]||"PF";

  /* Find settled PURCHASE_REGISTRY entries for this sale's voucher number */
  const matchedPurchases=isSale
    ? (PURCHASE_REGISTRY[purchMod]||[]).filter(e=>e.settled&&e.branch===(branch?.code||"BOM"))
    : [];

  /* For purchase side — find settled entries matching this purchase voucher */
  const thisEntry=!isSale
    ? Object.values(PURCHASE_REGISTRY).flat().find(e=>e.vno===vNo&&e.settled)
    : null;

  if(!matchedPurchases.length && !thisEntry) return null;

  return (
    <div style={{padding:"10px 16px",borderTop:"1px solid #cdd1d8",
      background:"#f9fafb"}}>
      <p style={{margin:"0 0 7px",fontSize:9.5,color:"#5a6691",fontWeight:700,
        textTransform:"uppercase",letterSpacing:"0.4px"}}>
        {isSale?"Settled Purchase Entries":"Linked To Sales"}
      </p>
      {isSale?(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {matchedPurchases.slice(0,3).map((p,i)=>{
            const gp=(p.amt||0);
            return (
              <div key={i} style={{display:"flex",alignItems:"center",
                justifyContent:"space-between",padding:"7px 10px",
                background:"#EAF3DE",border:"1px solid #C0DD97",borderRadius:8}}>
                <div>
                  <p style={{margin:0,fontSize:11,fontFamily:"monospace",
                    fontWeight:700,color:"#185FA5"}}>{p.vno}</p>
                  <p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691"}}>
                    {p.supplier} · {p.date}
                  </p>
                  <p style={{margin:"1px 0 0",fontSize:10,color:"#5a6691",
                    fontStyle:"italic"}}>{p.desc}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{margin:0,fontSize:13,fontWeight:800,color:"#27500A",
                    fontVariantNumeric:"tabular-nums"}}>{cur+p.amt?.toLocaleString()}</p>
                  <span style={{fontSize:9,padding:"2px 7px",borderRadius:999,
                    background:"#EAF3DE",color:"#27500A",fontWeight:700}}>
                    Settled ✔
                  </span>
                </div>
              </div>
            );
          })}
          {setRoute&&(
            <button onClick={()=>setRoute(pfxToPurchRoute[salePfx]||"/purchase/flight")}
              style={{...btnGh,fontSize:10.5,alignSelf:"flex-start"}}>
              View Purchase Module
            </button>
          )}
        </div>
      ):(
        thisEntry&&(
          <div style={{padding:"7px 10px",background:"#EAF3DE",
            border:"1px solid #C0DD97",borderRadius:8}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#27500A"}}>
              ✔ Settled — linked to a sales voucher
            </p>
            <p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691"}}>
              Ref: {thisEntry.ref} · {thisEntry.supplier}
            </p>
          </div>
        )
      )}
    </div>
  );
}


/* Live "current date & time" stamp — shown on every voucher as it is opened,
   so the entry always reflects the moment of data entry. Ticks each minute. */
export function LiveDateTime({compact=false}){
  const [now,setNow]=useState(()=>nowLabel());
  useEffect(()=>{
    const id=setInterval(()=>setNow(nowLabel()),30000);
    return ()=>clearInterval(id);
  },[]);
  return (
    <span title="Current date & time" style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,color:"#5a6691",fontWeight:600,background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,padding:compact?"3px 8px":"5px 10px"}}>
      <Clock size={13}/> {now}
    </span>
  );
}

export function VWrap({title,icon,vNo,branch,children,type,setRoute,saleMod,saleAmt}){
  const printRef=useRef(null);
  const [linkedPurch,setLinkedPurch]=useState(null);  /* selected purchase entry */
  const isLinkedRequired=type==="sales";
  const canSave=!isLinkedRequired||!!linkedPurch;
  const cfg=bc(branch);
  const isIndia=cfg.taxType==="GST";
  const taxBadge=isIndia?"GST":"VAT "+cfg.vatRate+"%";
  const brFlag=branch==="ALL"?"🌐":branch?.flag||"🇮🇳";
  const brCode=branch==="ALL"?"ALL":branch?.code||"BOM";
  return (
    <div style={{padding:"12px 10px",maxWidth:1160,margin:"0 auto",paddingBottom:80,fontFamily:"'Helvetica Neue',Helvetica,Arial,sans-serif",color:"#1F2328",WebkitFontSmoothing:"antialiased"}}>
      <div style={{background:"#fff",border:"1px solid #dfe2e7",borderLeft:"4px solid #A07828",borderRadius:4,overflow:"hidden",boxShadow:"0 3px 16px rgba(0,0,0,.10)"}}>

        {/* Voucher header bar */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",background:"#141414",borderBottom:"3px solid #A07828",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <div style={{width:38,height:38,borderRadius:9,background:"rgba(160,120,40,0.18)",color:"#A07828",border:"1px solid rgba(160,120,40,0.40)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19}}>{icon}</div>
            <div>
              <p style={{margin:0,fontSize:15,fontWeight:800,letterSpacing:"0.3px",color:"#fff"}}>{title}</p>
              <p style={{margin:0,fontSize:10.5,color:"#8A8A84",letterSpacing:"0.3px"}}>{"Voucher · "+brCode+" · "+vNo}</p>
            </div>
          </div>
          <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
            <LiveDateTime/>
            {/* Branch tax badge */}
            <span style={{fontSize:10,padding:"3px 9px",borderRadius:999,background:"#FBF3DE",color:"#6B4E0F",fontWeight:800,border:"1px solid #E8D9A8",letterSpacing:"0.04em"}}>
              {brFlag} {cfg.curCode} · {taxBadge}
            </span>
            <button onClick={()=>openPrintWindow(branch,vNo,title,printRef.current)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",border:"1px solid #3a3a36",borderRadius:8,fontSize:11.5,background:"#1f1f1f",cursor:"pointer",color:"#e7d9ad"}}><Download size={13}/> Download PDF</button>
            <button style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",border:"1px solid #3a3a36",borderRadius:8,fontSize:11.5,background:"#1f1f1f",cursor:"pointer",color:"#e7d9ad"}}><Save size={13}/> Draft</button>
          </div>
        </div>

        <div ref={printRef}>
          {/* ── Purchase Link — inline, first field in every sales voucher ── */}
          {type==="sales"&&(
            <Suspense fallback={null}>
              <PurchaseLinkField
                branch={branch}
                saleMod={saleMod}
                saleAmt={saleAmt||0}
                selected={linkedPurch}
                onSelect={setLinkedPurch}
              />
            </Suspense>
          )}
          {children}
        </div>
      {type&&<VLinked branch={branch} type={type} vNo={vNo} setRoute={setRoute}/>}
      </div>

      {/* Sticky footer */}
      <div style={{position:"sticky",bottom:0,background:"#FAFAF8",borderTop:"1px solid #dfe2e7",padding:"12px 0",marginTop:14,display:"flex",gap:9,justifyContent:"flex-end"}}>
        <button style={{...btnGh,background:"#FBF3DE",color:"#6B4E0F",borderColor:"#E8D9A8"}}>Cancel</button>
        <button
          disabled={!canSave}
          style={{...btnG,
            background:canSave?"#A07828":"#9ca3af",
            cursor:canSave?"pointer":"not-allowed",
            opacity:canSave?1:0.6,
            userSelect:"none",
          }}
          onClick={()=>{
            if(!canSave)return;
            if(type==="sales"&&linkedPurch){
              settlePurchaseEntry(linkedPurch);
              triggerSaveRefresh();
            } else if(type!=="sales"){
              /* non-sales vouchers save normally */
            }
          }}
          title={canSave?"Save voucher":"Link a purchase entry first — mandatory"}
        >
          {canSave?"Accept & save ✔":"Link Purchase to Enable Save"}
        </button>
      </div>
    </div>
  );
}



export function VHead({vNo,branch,salesperson=true}){
  const cfg=bc(branch);
  const isIndia=cfg.taxType==="GST";
  const invoiceOptions=isIndia?["Tax Invoice","Bill of Supply","Proforma"]:["VAT Invoice","Receipt","Proforma"];
  const [invoiceType,setInvoiceType]=useState(invoiceOptions[0]);
  useEffect(()=>{ if(!invoiceOptions.includes(invoiceType)) setInvoiceType(invoiceOptions[0]); },[isIndia]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:11}}>
          <FL label="Voucher no.">
            <input value={vNo} readOnly style={{...inp,background:"#f3f4f8",color:"#5a6691",fontFamily:"monospace",fontWeight:700}}/>
          </FL>
          <FL label="Date">
            <input type="date" defaultValue={todayISO()} style={inp}/>
          </FL>
          <FL label={isIndia?"Invoice type":"Document type"}>
            <DropdownMenu
              ariaLabel={isIndia?"Invoice type":"Document type"}
              menuRole="listbox"
              items={invoiceOptions.map(o=>({key:o,label:o,selected:invoiceType===o,onSelect:()=>setInvoiceType(o)}))}
              renderTrigger={({ref,toggle,triggerProps})=>(
                <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                  style={{...inp,display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,cursor:"pointer",textAlign:"left"}}>
                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{invoiceType}</span>
                  <ChevronDown size={14} style={{color:"#5b616e",flexShrink:0}}/>
                </button>
              )}
            />
          </FL>
          <FL label="Currency">
            <input value={cfg.curCode} readOnly style={{...inp,background:"#f3f4f8",color:"#5a6691",fontWeight:600}}/>
          </FL>
          <FL label="Reference">
            <input placeholder="Optional ref." style={inp}/>
          </FL>
          {salesperson&&<SalespersonField branch={branch}/>}
        </div>
    </div>
  );
}





export function VParty({label,name,gstin,branch:branchProp,onGstinChange}){
  const cfg=bc(branchProp);
  const isIndia=cfg.taxType==="GST";
  const controlled=typeof onGstinChange==="function";
  return (
    <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8"}}>
      <p style={{margin:"0 0 9px",fontSize:10,color:"#5a6691",letterSpacing:"0.5px",textTransform:"uppercase"}}>{label||"Customer"} details</p>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:11}}>
        <FL label="Party A/c">
          <input defaultValue={name||""} style={inp}/>
        </FL>
        <FL label={isIndia?"GSTIN":"Tax ID / VAT no."}>
          {controlled
            ?<input value={gstin||""} onChange={e=>onGstinChange(e.target.value.toUpperCase())} style={{...inp,fontFamily:"monospace"}} placeholder={isIndia?"27AABCS1234L1Z5":"VAT-123456"}/>
            :<input defaultValue={gstin||""} style={{...inp,fontFamily:"monospace"}} placeholder={isIndia?"27AABCS1234L1Z5":"VAT-123456"}/>}
        </FL>
        <FL label={isIndia?"Place of supply":"Country / region"}>
          <select style={inp}>
            {(cfg.psOptions||["Overseas"]).map(o=><option key={o}>{o}</option>)}
          </select>
        </FL>
      </div>
    </div>
  );
}



export function VTot({lines,gstLbl,gst,tcs,tcsAmt,total,branch}){
  const cfg=bc(branch);
  const cur=cfg.cur;
  const isIndia=cfg.taxType==="GST";
  const tcsLabel=isIndia?"TCS 5%":"Withholding tax";
  return (
    <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:10,padding:14}}>
      {(lines||[]).map((r,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:11}}>
          <span style={{color:"#5a6691"}}>{r.l}</span>
          <span style={{fontVariantNumeric:"tabular-nums"}}>{r.v}</span>
        </div>
      ))}
      {gst>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:11}}>
        <span style={{color:"#5a6691"}}>{gstLbl||(isIndia?"GST":"VAT "+cfg.vatRate+"%")}</span>
        <span>{cur+fmt(gst)}</span>
      </div>}
      {tcs&&tcsAmt>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:11}}>
        <span style={{color:"#5a6691"}}>{tcsLabel}</span>
        <span>{cur+fmt(tcsAmt)}</span>
      </div>}
      <div style={{borderTop:"1px solid #cdd1d8",margin:"8px 0"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:600}}>Invoice total</span>
        <span style={{fontSize:18,fontWeight:700,color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>{cur+fmt(total||0)}</span>
      </div>
    </div>
  );
}



export function VNarr({def,children}){
  return (
    <div style={{padding:"12px 16px",background:"#f9fafb"}}>
      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:14}}>
        <FL label="Narration"><textarea rows={3} defaultValue={def} style={{...inp,resize:"vertical",minHeight:68}}/></FL>
        {children}
      </div>
    </div>
  );
}


export function ARow({label,onAdd,children}){
  return (
    <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
        <p style={{margin:0,fontSize:10,color:"#5a6691",letterSpacing:"0.5px",textTransform:"uppercase"}}>{label}</p>
        <button onClick={onAdd} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",border:"1px solid #cdd1d8",borderRadius:7,fontSize:11,background:"#fff",cursor:"pointer"}}><Plus size={12}/> Add row</button>
      </div>
      <div style={{overflowX:"auto"}}>{children}</div>
    </div>
  );
}


export function DBtn({fn,label="Delete row"}){return <td style={{padding:"4px 7px",textAlign:"center"}}><button type="button" onClick={fn} aria-label={label} title={label} style={{background:"transparent",border:"none",color:"#8b94b3",cursor:"pointer",padding:3}}><Trash2 size={13}/></button></td>;}

/* ── SALES: HOLIDAY PACKAGES ─────────────────────────────── */

export function AgeTable({data}){
  const tot=k=>data.reduce((s,r)=>s+(r[k]||0),0);
  return (
    <div style={{...card,padding:0,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",fontSize:11.5,borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#f3f4f8",borderBottom:"2px solid #cdd1d8"}}>
            <th style={{textAlign:"left",padding:"9px 11px",fontWeight:600,color:"#384677",fontSize:11}}>Party</th>
            <th style={{textAlign:"right",padding:"9px 11px",fontWeight:600,color:"#384677",fontSize:11}}>{"Total ₹"}</th>
            {AGE_H.map((h,i)=><th key={i} style={{textAlign:"right",padding:"9px 11px",fontWeight:600,color:AGE_C[i],fontSize:11}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {data.map((r,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #cdd1d8"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{padding:"9px 11px",fontWeight:500}}>{r.party}</td>
                <td style={{padding:"9px 11px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{fmt(r.total)}</td>
                {AGE_COLS.map((c,ci)=><td key={ci} style={{padding:"9px 11px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:r[c]>0?AGE_C[ci]:"#bfc3d6"}}>{r[c]>0?fmt(r[c]):"—"}</td>)}
              </tr>
            ))}
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #cdd1d8"}}>
              <td style={{padding:"9px 11px",fontWeight:700}}>Total</td>
              <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{fmt(data.reduce((s,r)=>s+r.total,0))}</td>
              {AGE_COLS.map((c,ci)=><td key={ci} style={{padding:"9px 11px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:AGE_C[ci]}}>{fmt(tot(c))}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── RECEIVABLES AGEING ──────────────────────────────────── */

/* Icon moved to ./styleTokens (re-exported at top). */


/* ═══════════════════════════════════════════════════════════════
   TOPBAR
   ═══════════════════════════════════════════════════════════════ */

/* KpiCard moved to ./styleTokens (re-exported at top). */

/* ── UserSwitcher (demo simulator — switch viewing identity) ── */

const PREMIUM_CARD={...cardStyle,border:"1px solid #cdd1d8",borderRadius:12,boxShadow:"0 1px 2px rgba(16,18,22,0.04), 0 6px 20px -10px rgba(16,18,22,0.12)"};

export function WidgetCard({title,subtitle,children,onPin,pinned,onDrill}){
  return (
    <div style={PREMIUM_CARD}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,gap:8}}>
        <div style={{minWidth:0}}>
          <h3 style={{margin:0,fontSize:11,color:"#5b616e",letterSpacing:"0.4px",textTransform:"uppercase",fontWeight:700}}>{title}</h3>
          {subtitle&&<p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>{subtitle}</p>}
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0}}>
          {onPin&&<button onClick={onPin} title={pinned?"Unpin":"Pin"} className="inline-flex items-center justify-center max-tablet:min-h-[44px] max-tablet:min-w-[44px]" style={{padding:"3px 6px",background:"transparent",border:"none",cursor:"pointer",color:pinned?"#c2a04a":"#cdd1d8",fontSize:14}}>★</button>}
          {onDrill&&<button onClick={onDrill} className="inline-flex items-center justify-center max-tablet:min-h-[44px]" style={{padding:"4px 9px",background:"transparent",border:"1px solid #cdd1d8",borderRadius:6,color:"#5b616e",cursor:"pointer",fontSize:10,fontWeight:600}}>Drill ↗</button>}
        </div>
      </div>
      {children}
    </div>
  );
}


export function KPICard({label,value,delta,color,onClick}){
  /* Delta colour is SIGNED, not "anything-without-a-plus-is-red":
       leading "+" → positive (green), leading "-" → negative (red),
       everything else (e.g. "to pay", "5 awaiting", "not tracked yet") → neutral.
     The old `delta.includes("+")` test also mis-greened strings like
     "₹2L overdue 90+" (a "+" inside the text). */
  const d=String(delta||"").trim();
  const deltaColor=d.startsWith("+")?"#16a34a":d.startsWith("-")?"#dc2626":"#5b616e";
  return (
    <div onClick={onClick} style={{...PREMIUM_CARD,cursor:onClick?"pointer":"default",borderTop:"3px solid "+(color||"#c2a04a")}}>
      <p style={{margin:0,fontSize:10.5,color:"#5b616e",letterSpacing:"0.4px",textTransform:"uppercase",fontWeight:700}}>{label}</p>
      <p style={{margin:"5px 0 2px",fontSize:22,fontWeight:800,color:"#14161a",fontVariantNumeric:"tabular-nums"}}>{value}</p>
      {delta&&<p style={{margin:0,fontSize:11,color:deltaColor,fontWeight:600}}>{delta}</p>}
    </div>
  );
}


// Standard widescreen page/report container width. Registers, reports and list
// screens center their content at this cap so wide monitors aren't wasted on
// empty gutters (matches the SO/PO/GP booking screens, already on 1600). The
// P&L / Balance Sheet statements run slightly wider (1640) to fit their rail.
export const PAGE_MAX = 1600;

export function RPT_Page({title,subtitle,toolbar,children}){
  return (
    <div style={{padding:18,maxWidth:PAGE_MAX,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:14,marginBottom:14,paddingBottom:12,borderBottom:"1px solid #cdd1d8"}}>
        <div>
          <h2 style={{margin:0,fontSize:20,color:"#0d1326",fontWeight:700}}>{title}</h2>
          <p style={{margin:"3px 0 0",fontSize:12,color:"#5a6691"}}>{subtitle}</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {toolbar}
          <button onClick={()=>openPrintPreview({ selector: 'main', title: 'Report', recommend: 'portrait' })} style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,fontSize:11.5,cursor:"pointer",fontWeight:600,color:"#5a6691"}}>📄 PDF</button>
          <button style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,fontSize:11.5,cursor:"pointer",fontWeight:600,color:"#5a6691"}}>📊 Excel</button>
          <button style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,fontSize:11.5,cursor:"pointer",fontWeight:600,color:"#5a6691"}}>📋 CSV</button>
        </div>
      </div>
      {children}
    </div>
  );
}


/* RPT_thStyle, RPT_tdStyle moved to ./styleTokens (re-exported at top). */

/* ── Seed data ────────────────────────────────────────────────────── */


export function RPT_CashPosition({branch}){
  const groupByBranch={};
  BANK_ACCOUNTS_DATA.forEach(b=>{
    if(!groupByBranch[b.branch]) groupByBranch[b.branch]=[];
    groupByBranch[b.branch].push(b);
  });
  // Each currency/branch balance is shown in its OWN native currency only — no
  // cross-currency conversion and no INR-equivalent grand total (a sum across
  // currencies is meaningless and is intentionally not shown here).
  const groupByCurrency={};
  BANK_ACCOUNTS_DATA.forEach(b=>{
    if(!groupByCurrency[b.currency]) groupByCurrency[b.currency]={total:0,count:0};
    groupByCurrency[b.currency].total+=b.openingBal;
    groupByCurrency[b.currency].count+=1;
  });
  // Per-branch native balances per currency it holds (branches are usually single-
  // currency; mixed branches list each currency on its own line — never summed).
  const branchCurTotals=(accts)=>{const m={};accts.forEach(a=>{m[a.currency]=(m[a.currency]||0)+a.openingBal;});return m;};
  return (
    <RPT_Page title="Cash Position Summary" subtitle="All bank balances + petty cash · real-time · each branch in its own currency">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:14}}>
        <div className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{borderTopColor:"#2563eb"}}><p className="text-[10.5px] font-bold uppercase tracking-wide" style={{color:"#2563eb"}}>Bank Accounts</p><p className="mt-1 text-xl font-extrabold tabular-nums text-navy">{BANK_ACCOUNTS_DATA.filter(b=>b.type!=="Cash").length}</p></div>
        <div className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{borderTopColor:"#16a34a"}}><p className="text-[10.5px] font-bold uppercase tracking-wide" style={{color:"#16a34a"}}>Currencies</p><p className="mt-1 text-xl font-extrabold tabular-nums text-navy">{Object.keys(groupByCurrency).length}</p></div>
        <div className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{borderTopColor:"#d97706"}}><p className="text-[10.5px] font-bold uppercase tracking-wide" style={{color:"#d97706"}}>Branches</p><p className="mt-1 text-xl font-extrabold tabular-nums text-navy">{Object.keys(groupByBranch).length}</p></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>By Currency</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Currency</th><th style={{...RPT_thStyle,textAlign:"right"}}>Balance</th></tr></thead>
            <tbody>{Object.entries(groupByCurrency).map(([cur,d])=>(<tr key={cur}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:700}}>{cur} <span style={{color:"#5a6691",fontWeight:400,fontSize:10}}>({d.count})</span></td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{cur} {d.total.toLocaleString("en-IN")}</td></tr>))}</tbody>
          </table>
        </div>
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>By Branch</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Branch</th><th style={{...RPT_thStyle,textAlign:"center"}}>A/cs</th><th style={{...RPT_thStyle,textAlign:"right"}}>Balance (native)</th></tr></thead>
            <tbody>{Object.entries(groupByBranch).map(([br,accts])=>{const cm=branchCurTotals(accts);return (<tr key={br}><td style={{...RPT_tdStyle,fontWeight:700}}>{br}</td><td style={{...RPT_tdStyle,textAlign:"center"}}>{accts.length}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",fontWeight:700}}>{Object.entries(cm).map(([cur,v])=>`${cur} ${v.toLocaleString("en-IN")}`).join(" · ")}</td></tr>);})}</tbody>
          </table>
        </div>
      </div>
      <div style={cardStyle}>
        <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>Detail — All Accounts</p>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Branch</th><th style={RPT_thStyle}>Bank · Account</th><th style={RPT_thStyle}>Type</th><th style={RPT_thStyle}>Currency</th><th style={{...RPT_thStyle,textAlign:"right"}}>Balance</th><th style={{...RPT_thStyle,textAlign:"right"}}>% of Limit</th></tr></thead>
          <tbody>{BANK_ACCOUNTS_DATA.map(b=>{const pct=Math.round(b.openingBal/b.limit*100);return (<tr key={b.id}><td style={RPT_tdStyle}>{b.branch}</td><td style={RPT_tdStyle}>{b.bank} · <span style={{fontFamily:"monospace",color:"#5a6691"}}>...{b.accountNo.slice(-6)}</span></td><td style={RPT_tdStyle}>{b.type}</td><td style={{...RPT_tdStyle,fontFamily:"monospace"}}>{b.currency}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{b.currency} {b.openingBal.toLocaleString("en-IN")}</td><td style={{...RPT_tdStyle,textAlign:"right",color:pct>80?"#A32D2D":"#0d1326",fontWeight:600}}>{pct}%</td></tr>);})}</tbody>
        </table></div>
      </div>
    </RPT_Page>
  );
}

/* 2. Inter-branch Elimination — moved to ../modules/interbranch.jsx
   (RPT_InterbranchElim), now a live group-consolidation report wired to the
   double-entry engine instead of the static INTERBRANCH_ELIMINATIONS array. */

/* 3. Note to Financial Statements */

export function RPT_FSNotes(){
  return (
    <RPT_Page title="Notes to Financial Statements" subtitle="Auto-prepared from voucher data · for FY 2025-26 financial statements">
      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12}}>
        {FS_NOTES.map(n=>(
          <div key={n.note} style={{...cardStyle,borderLeft:"3px solid #d4a437"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
              <div style={{minWidth:38,height:38,borderRadius:"50%",background:"#0d1326",color:"#d4a437",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{n.note}</div>
              <div style={{flex:1}}>
                <p style={{margin:0,fontSize:14,fontWeight:700,color:"#0d1326"}}>{n.title}</p>
                {n.autoSource&&<p style={{margin:"2px 0 6px",fontSize:10,color:"#22c55e",fontFamily:"monospace"}}>↻ Auto-sourced from {n.autoSource}</p>}
                <p style={{margin:n.autoSource?0:"6px 0 0",fontSize:12,color:"#5a6691",lineHeight:1.55}}>{n.body}</p>
              </div>
              <button style={{padding:"4px 9px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:4,fontSize:10.5,cursor:"pointer",fontWeight:600}}>Edit</button>
            </div>
          </div>
        ))}
      </div>
    </RPT_Page>
  );
}

/* 4. Audit Trail Report */

export function RPT_AuditTrail(){
  const [filterUser,setFilterUser]=useState("ALL");
  const [filterAction,setFilterAction]=useState("ALL");
  const [search,setSearch]=useState("");
  const users=[...new Set(AUDIT_TRAIL_DATA.map(a=>a.user))];
  const actions=[...new Set(AUDIT_TRAIL_DATA.map(a=>a.action))];
  const filtered=AUDIT_TRAIL_DATA.filter(a=>{
    if(filterUser!=="ALL"&&a.user!==filterUser) return false;
    if(filterAction!=="ALL"&&a.action!==filterAction) return false;
    if(search&&!a.desc.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const colorOf=act=>act==="DELETE"?"#A32D2D":act==="CREATE"?"#22c55e":act==="APPROVE"?"#d4a437":act==="EDIT"?"#f97316":"#5a6691";
  return (
    <RPT_Page title="Audit Trail Report" subtitle="Who changed what, when · filterable by user, action, module">
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-brand border border-surface-border bg-surface px-3 py-2.5 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px]">🔍</span>
          <input placeholder="Search description..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-md border border-surface-border bg-surface py-2 pl-7 pr-3 text-[12px] outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/15"/>
        </div>
        <select value={filterUser} onChange={e=>setFilterUser(e.target.value)} className="rounded-md border border-surface-border bg-surface px-3 py-2 text-[12px] outline-none transition focus:border-navy"><option value="ALL">All users</option>{users.map(u=><option key={u} value={u}>{u}</option>)}</select>
        <select value={filterAction} onChange={e=>setFilterAction(e.target.value)} className="rounded-md border border-surface-border bg-surface px-3 py-2 text-[12px] outline-none transition focus:border-navy"><option value="ALL">All actions</option>{actions.map(a=><option key={a} value={a}>{a}</option>)}</select>
      </div>
      <div className="rounded-brand border border-surface-border bg-surface p-3.5 shadow-card">
        <p className="mb-2.5 inline-block rounded-full bg-surface-alt px-2.5 py-1 text-[10.5px] font-bold text-ink-muted">{filtered.length} entries</p>
        <div className="kb-sticky overflow-x-auto" style={{'--stick-head':'#1a1c22',maxHeight:'calc(100vh - 320px)'}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Timestamp</th><th style={RPT_thStyle}>User</th><th style={RPT_thStyle}>Branch</th><th style={RPT_thStyle}>Action</th><th style={RPT_thStyle}>Module</th><th style={RPT_thStyle}>Description</th><th style={RPT_thStyle}>IP Address</th></tr></thead>
          <tbody>{filtered.map((a,i)=>(<tr key={i} className={`transition hover:bg-[#eef1f6] ${i%2===0?'bg-surface':'bg-surface-alt/40'}`}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5,color:"#5a6691"}}>{a.ts}</td><td style={{...RPT_tdStyle,fontWeight:600}}>{a.user}</td><td style={RPT_tdStyle}><span style={{padding:"2px 6px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{a.branch}</span></td><td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:colorOf(a.action)+"22",color:colorOf(a.action),borderRadius:3,fontSize:10,fontWeight:700,letterSpacing:"0.3px"}}>{a.action}</span></td><td style={{...RPT_tdStyle,fontSize:11}}>{a.module}</td><td style={{...RPT_tdStyle,fontSize:11}}>{a.desc}</td><td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10,color:"#5a6691"}}>{a.ip}</td></tr>))}</tbody>
        </table></div>
      </div>
    </RPT_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PROFITABILITY REPORTS (6)
   ════════════════════════════════════════════════════════════════════ */

/* ─── Live profitability helpers ──────────────────────────────────────────
   The reports below aggregate the LIVE per-file GP list (GET /api/accounting/
   gp-bills) client-side — one row per booking file, branch-scoped server-side
   and date-scoped by the shared <ReportDateBar/>. `cost` is net of supplier
   incentive, so revenue − cost = file GP (ties to invoice-GP / module-PL).   */
function aggBills(bills, keyOf, fallback = 'Unspecified') {
  const m = new Map();
  for (const b of bills || []) {
    const k = String(keyOf(b) ?? '').trim() || fallback;
    if (!m.has(k)) m.set(k, { key: k, bookings: 0, revenue: 0, cost: 0, branches: new Set(), firstDate: '', lastDate: '' });
    const g = m.get(k);
    g.bookings += 1; g.revenue += b.sell || 0; g.cost += b.cost || 0;
    if (b.branch) g.branches.add(b.branch);
    const d = b.date || '';
    if (d) { if (!g.firstDate || d < g.firstDate) g.firstDate = d; if (!g.lastDate || d > g.lastDate) g.lastDate = d; }
  }
  return [...m.values()].map((g) => {
    const gp = Math.round((g.revenue - g.cost) * 100) / 100;
    return { ...g, branches: [...g.branches], gp, gpPct: g.revenue > 0 ? +((gp / g.revenue) * 100).toFixed(1) : 0 };
  });
}

/* Standard loading / error / empty cards for the live reports (mirrors
   Supplier 360). Renders `children` only once data is ready & non-empty. */
function RptState({ q, empty, label = 'data', children }) {
  if (q.isError) return (
    <div style={{ ...cardStyle, background: '#FCEBEB', border: '1px solid #E8B4B4' }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0d1326' }}>Couldn’t load {label}</p>
      <p style={{ margin: '3px 0 0', fontSize: 11, color: '#A32D2D' }}>{q.error?.message || 'Request failed.'} — check you’re signed in and the ERP API is reachable.</p>
    </div>
  );
  if (q.isLoading) return <div style={{ ...cardStyle, textAlign: 'center', color: '#5a6691', fontSize: 12 }}>Loading {label}…</div>;
  if (empty) return (
    <div style={{ ...cardStyle, background: '#FFF8E8', border: '1px solid #F0D98A' }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0d1326' }}>No {label} for the selected period</p>
      <p style={{ margin: '3px 0 0', fontSize: 11, color: '#5a6691' }}>This report aggregates posted sale/purchase bills. Widen the date range (try “All”) or bill some vouchers and they’ll appear here.</p>
    </div>
  );
  return children;
}

/* 5. Yield per Destination */

export function RPT_YieldDestination({ branch }){
  const [range,setRange]=useState(()=>({mode:'all',...resolveReportRange('all')}));
  const q=useYieldByDestination(branch,{from:range.from||undefined,to:range.to||undefined});
  const sorted=q.data?.rows||[];   // server already groups by destination, GP-desc
  const totalRev=sorted.reduce((s,d)=>s+d.revenue,0);
  const totalGP=sorted.reduce((s,d)=>s+d.gp,0);
  const avgGpPct=totalRev>0?(totalGP/totalRev*100).toFixed(1):"0.0";
  return (
    <RPT_Page title="Yield by Destination" subtitle="Margin % by destination — live from posted bills"
      toolbar={<ReportDateBar value={range} onChange={setRange}/>}>
      <RptState q={q} empty={sorted.length===0} label="destination bookings">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Total Revenue</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{fmtINR(totalRev)}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Total GP</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#22c55e"}}>{fmtINR(totalGP)}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Avg GP %</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{avgGpPct}%</p></div>
      </div>
      <div style={cardStyle}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={sorted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7"/>
            <XAxis dataKey="destination" tick={{fontSize:9,fill:"#5a6691"}} angle={-25} textAnchor="end" height={70}/>
            <YAxis yAxisId="left" tick={{fontSize:10,fill:"#5a6691"}} tickFormatter={v=>(v/100000).toFixed(0)+"L"}/>
            <YAxis yAxisId="right" orientation="right" tick={{fontSize:10,fill:"#5a6691"}} tickFormatter={v=>v+"%"}/>
            <Tooltip formatter={(v,n)=>n==="gpPct"?v+"%":fmtINR(v)}/>
            <Legend wrapperStyle={{fontSize:11}}/>
            <Bar yAxisId="left" dataKey="revenue" fill="#0d1326" name="Revenue"/>
            <Bar yAxisId="left" dataKey="gp" fill="#d4a437" name="GP"/>
            <Line yAxisId="right" type="monotone" dataKey="gpPct" stroke="#A32D2D" strokeWidth={2} name="GP %"/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{...cardStyle,marginTop:14}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Destination</th><th style={{...RPT_thStyle,textAlign:"right"}}>Bookings</th><th style={{...RPT_thStyle,textAlign:"right"}}>Revenue</th><th style={{...RPT_thStyle,textAlign:"right"}}>Cost</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP %</th></tr></thead>
          <tbody>{sorted.map(d=>(<tr key={d.destination}><td style={{...RPT_tdStyle,fontWeight:600}}>{d.destination}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{d.bookings}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(d.revenue)}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{fmtINR(d.cost)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e",fontWeight:700}}>{fmtINR(d.gp)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:d.gpPct>=25?"#22c55e":d.gpPct>=18?"#d4a437":"#A32D2D"}}>{d.gpPct.toFixed(1)}%</td></tr>))}</tbody>
        </table>
      </div>
      </RptState>
    </RPT_Page>
  );
}

/* 6. Yield per Consultant */

export function RPT_YieldConsultant({ branch }){
  const [range,setRange]=useState(()=>({mode:'all',...resolveReportRange('all')}));
  const q=useGpBills(branch,{from:range.from||undefined,to:range.to||undefined});
  const rows=aggBills(q.data,b=>b.consultant,'Unassigned').map(g=>({consultant:g.key,branch:g.branches[0]||'—',bookings:g.bookings,revenue:g.revenue,avgBookingValue:g.bookings>0?Math.round(g.revenue/g.bookings):0,gp:g.gp,gpPct:g.gpPct})).sort((a,b)=>b.revenue-a.revenue);
  return (
    <RPT_Page title="Yield by Consultant" subtitle="Margin earned per consultant — live from posted bills"
      toolbar={<ReportDateBar value={range} onChange={setRange}/>}>
      <RptState q={q} empty={rows.length===0} label="consultant bookings">
      <div style={cardStyle}>
        <ResponsiveContainer width="100%" height={Math.max(240,rows.length*32)}>
          <BarChart data={rows} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7"/>
            <XAxis type="number" tick={{fontSize:10,fill:"#5a6691"}} tickFormatter={v=>(v/100000).toFixed(0)+"L"}/>
            <YAxis dataKey="consultant" type="category" tick={{fontSize:11,fill:"#0d1326"}} width={90}/>
            <Tooltip formatter={v=>fmtINR(v)}/>
            <Legend wrapperStyle={{fontSize:11}}/>
            <Bar dataKey="revenue" fill="#0d1326" name="Revenue"/>
            <Bar dataKey="gp" fill="#d4a437" name="GP"/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{...cardStyle,marginTop:14}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Consultant</th><th style={RPT_thStyle}>Branch</th><th style={{...RPT_thStyle,textAlign:"right"}}>Bookings</th><th style={{...RPT_thStyle,textAlign:"right"}}>Revenue</th><th style={{...RPT_thStyle,textAlign:"right"}}>Avg Basket</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP %</th></tr></thead>
          <tbody>{rows.map(c=>(<tr key={c.consultant}><td style={{...RPT_tdStyle,fontWeight:700}}>{c.consultant}</td><td style={RPT_tdStyle}><span style={{padding:"2px 6px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{c.branch}</span></td><td style={{...RPT_tdStyle,textAlign:"right"}}>{c.bookings}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(c.revenue)}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{fmtINR(c.avgBookingValue)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e",fontWeight:700}}>{fmtINR(c.gp)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:c.gpPct>=25?"#22c55e":c.gpPct>=18?"#d4a437":"#A32D2D"}}>{c.gpPct.toFixed(1)}%</td></tr>))}</tbody>
        </table>
      </div>
      </RptState>
    </RPT_Page>
  );
}

/* 7. Yield per Supplier */

export function RPT_YieldSupplier({ branch }){
  // NOTE: the books store ACTUAL supplier cost only (no "expected cost" source),
  // so this is reframed from expected-vs-actual variance to real spend / margin
  // contribution per supplier. Wire an expected-cost feed to restore variance.
  const [range,setRange]=useState(()=>({mode:'all',...resolveReportRange('all')}));
  const q=useGpBills(branch,{from:range.from||undefined,to:range.to||undefined});
  const rows=aggBills(q.data,b=>b.supplier,'No supplier').map(g=>({supplier:g.key,bookings:g.bookings,cost:g.cost,revenue:g.revenue,gp:g.gp,gpPct:g.gpPct})).sort((a,b)=>b.cost-a.cost);
  const totalCost=rows.reduce((s,x)=>s+x.cost,0);
  const totalRev=rows.reduce((s,x)=>s+x.revenue,0);
  const totalGP=rows.reduce((s,x)=>s+x.gp,0);
  return (
    <RPT_Page title="Yield by Supplier" subtitle="Spend, revenue & margin contribution per supplier — live from posted bills"
      toolbar={<ReportDateBar value={range} onChange={setRange}/>}>
      <RptState q={q} empty={rows.length===0} label="supplier purchases">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Total Supplier Cost</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{fmtINR(totalCost)}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Revenue Booked</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{fmtINR(totalRev)}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>GP Generated</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#22c55e"}}>{fmtINR(totalGP)}</p></div>
      </div>
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Supplier</th><th style={{...RPT_thStyle,textAlign:"right"}}>Bookings</th><th style={{...RPT_thStyle,textAlign:"right"}}>Cost (Spend)</th><th style={{...RPT_thStyle,textAlign:"right"}}>Revenue</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP %</th><th style={{...RPT_thStyle,textAlign:"right"}}>Cost Share</th></tr></thead>
          <tbody>{rows.map(s=>{const share=totalCost>0?(s.cost/totalCost*100):0;return (<tr key={s.supplier}><td style={{...RPT_tdStyle,fontWeight:600}}>{s.supplier}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{s.bookings}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(s.cost)}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{fmtINR(s.revenue)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e",fontWeight:700}}>{fmtINR(s.gp)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:s.gpPct>=18?"#22c55e":s.gpPct>=10?"#d4a437":"#A32D2D"}}>{s.gpPct.toFixed(1)}%</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#5a6691"}}>{share.toFixed(1)}%</td></tr>);})}</tbody>
        </table>
      </div>
      </RptState>
    </RPT_Page>
  );
}

/* 8. YoY Comparison */

export function RPT_YoY({ branch }){
  // Compares the selected period against the SAME dates one year earlier
  // (two P&L runs against the live double-entry engine). Default YTD so there's
  // a bounded period to shift; "All" falls back to current FY vs prior FY.
  const [range,setRange]=useState(()=>({mode:'ytd',...resolveReportRange('ytd')}));
  const q=useYearOverYear(branch,{from:range.from||undefined,to:range.to||undefined});
  const lines=q.data?.rows||[];                      // [{line,group,cy,ly,bold}] from /yoy (two module-PL runs)
  const curLabel=q.data?.current?.label||'Current', priorLabel=q.data?.prior?.label||'Prior Year';
  return (
    <RPT_Page title="Year-over-Year Comparison" subtitle={`${curLabel}  vs  ${priorLabel} · same window, prior year`}
      toolbar={<ReportDateBar value={range} onChange={setRange}/>}>
      <RptState q={q} empty={lines.length===0} label="P&L data">
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr><th style={RPT_thStyle}>Particulars</th><th style={{...RPT_thStyle,textAlign:"right"}}>{curLabel}</th><th style={{...RPT_thStyle,textAlign:"right"}}>{priorLabel}</th><th style={{...RPT_thStyle,textAlign:"right"}}>Variance</th><th style={{...RPT_thStyle,textAlign:"right"}}>%Δ</th></tr></thead>
          <tbody>{lines.map((l,i)=>{const variance=l.cy-l.ly;const pct=l.ly!==0?variance/Math.abs(l.ly)*100:0;return (<tr key={i} style={l.bold?{background:"#fafbfd",fontWeight:700}:{}}><td style={{...RPT_tdStyle,fontWeight:l.bold?700:400,fontSize:l.bold?12.5:12}}>{l.line}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",fontWeight:l.bold?700:500}}>{fmtINR(l.cy)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:"#5a6691"}}>{fmtINR(l.ly)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:variance>=0?(l.group==="Costs"?"#A32D2D":"#22c55e"):(l.group==="Costs"?"#22c55e":"#A32D2D"),fontWeight:700}}>{variance>=0?"+":""}{fmtINR(Math.abs(variance))}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:pct>=0?(l.group==="Costs"?"#A32D2D":"#22c55e"):(l.group==="Costs"?"#22c55e":"#A32D2D")}}>{pct>=0?"+":""}{pct.toFixed(1)}%</td></tr>);})}</tbody>
        </table>
      </div>
      </RptState>
    </RPT_Page>
  );
}

/* 9. Customer LTV */

export function RPT_CustomerLTV({ branch }){
  const [range,setRange]=useState(()=>({mode:'all',...resolveReportRange('all')}));
  const q=useCustomerLtv(branch,{from:range.from||undefined,to:range.to||undefined});
  const sorted=q.data?.rows||[];   // server computes LTV, basket, active span & recency
  return (
    <RPT_Page title="Customer Lifetime Value (LTV)" subtitle="Cumulative value per customer — live from posted sales"
      toolbar={<ReportDateBar value={range} onChange={setRange}/>}>
      <RptState q={q} empty={sorted.length===0} label="customer sales">
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Customer</th><th style={RPT_thStyle}>First Booking</th><th style={RPT_thStyle}>Last Booking</th><th style={{...RPT_thStyle,textAlign:"right"}}>Bookings</th><th style={{...RPT_thStyle,textAlign:"right"}}>LTV</th><th style={{...RPT_thStyle,textAlign:"right"}}>Avg Basket</th><th style={{...RPT_thStyle,textAlign:"center"}}>Active</th><th style={{...RPT_thStyle,textAlign:"center"}}>Recency</th></tr></thead>
          <tbody>{sorted.map(c=>(<tr key={c.name}><td style={{...RPT_tdStyle,fontWeight:600}}>{c.name}</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>{c.firstBooking}</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>{c.lastBooking}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{c.totalBookings}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(c.ltv)}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{fmtINR(c.avgBasket)}</td><td style={{...RPT_tdStyle,textAlign:"center"}}>{c.monthsActive}m</td><td style={{...RPT_tdStyle,textAlign:"center",color:c.recencyDays<=30?"#22c55e":c.recencyDays<=90?"#d4a437":"#A32D2D",fontWeight:700}}>{c.recencyDays}d ago</td></tr>))}</tbody>
        </table>
      </div>
      </RptState>
    </RPT_Page>
  );
}

/* 10. ABC Analysis */

export function RPT_ABCAnalysis({ branch }){
  const [range,setRange]=useState(()=>({mode:'all',...resolveReportRange('all')}));
  const [dim,setDim]=useState("customers");
  const by=dim==="customers"?"customer":dim==="suppliers"?"supplier":"destination";
  const q=useAbcAnalysis(branch,{from:range.from||undefined,to:range.to||undefined,by});
  const data=q.data?.rows||[];                       // [{name,value,bookings,gp,share,cumPct,class}], ranked
  const EMPTY_CLS={count:0,value:0,share:0};
  const classes=q.data?.classes||{A:EMPTY_CLS,B:EMPTY_CLS,C:EMPTY_CLS};
  const grpStyle=cls=>({background:cls==="A"?"#fae7ad":cls==="B"?"#cfe2ff":"#e2e3e5",color:cls==="A"?"#664700":cls==="B"?"#004085":"#383d41"});
  return (
    <RPT_Page title="ABC Analysis (Pareto)"
      subtitle="80/15/5 split based on contribution to value — live from posted bills"
      toolbar={<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><ReportDateBar value={range} onChange={setRange}/><select value={dim} onChange={e=>setDim(e.target.value)} style={{padding:"7px 11px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:11.5,background:"#fff"}}><option value="customers">By Customer (LTV)</option><option value="suppliers">By Supplier (Spend)</option><option value="destinations">By Destination (Revenue)</option></select></div>}>
      <RptState q={q} empty={data.length===0} label="contribution data">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {["A","B","C"].map(c=>{const cl=classes[c]||{count:0,value:0,share:0};return (<div key={c} style={{...cardStyle,borderTop:"4px solid "+(c==="A"?"#d4a437":c==="B"?"#3b82f6":"#5a6691")}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{padding:"4px 10px",borderRadius:4,fontSize:13,fontWeight:700,letterSpacing:"0.5px",...grpStyle(c)}}>CLASS {c}</span><span style={{fontSize:11,color:"#5a6691"}}>{cl.count} items · {cl.share}% of total</span></div><p style={{margin:0,fontSize:22,fontWeight:700,color:"#0d1326"}}>{fmtINR(cl.value)}</p><p style={{margin:"3px 0 0",fontSize:10.5,color:"#5a6691"}}>{c==="A"?"Top contributors — focus & nurture":c==="B"?"Mid-tier — opportunity to grow":"Long tail — automate / rationalise"}</p></div>);})}
      </div>
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Rank</th><th style={RPT_thStyle}>Name</th><th style={{...RPT_thStyle,textAlign:"right"}}>Value</th><th style={{...RPT_thStyle,textAlign:"right"}}>Share</th><th style={{...RPT_thStyle,textAlign:"right"}}>Cumulative</th><th style={{...RPT_thStyle,textAlign:"center"}}>Class</th></tr></thead>
          <tbody>{data.map((d,i)=>{const val=d.value;return (<tr key={(d.name||d.destination)+i}><td style={{...RPT_tdStyle,color:"#5a6691"}}>{i+1}</td><td style={{...RPT_tdStyle,fontWeight:600}}>{d.name||d.destination}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(val)}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{d.share}%</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{d.cumPct}%</td><td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 9px",borderRadius:3,fontSize:10.5,fontWeight:700,letterSpacing:"0.3px",...grpStyle(d.class)}}>{d.class}</span></td></tr>);})}</tbody>
        </table>
      </div>
      </RptState>
    </RPT_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   HR REPORTS (3)
   ════════════════════════════════════════════════════════════════════ */

/* 11. Attrition Rate */

export function RPT_Attrition(){
  /* Live from the employee master: joiners by joinDate, leavers by exitDate, and a
     running headcount over the last 12 months. */
  const emps=((useMasterList('employees').data)||[]).map(fromEmpDTO);
  const months=lastMonths(todayISO().slice(0,7),12);
  const {rows:ATTRITION_DATA,ttlJoiners,ttlLeavers,annualAttrition:annualAttritionN}=buildAttrition(emps,months);
  const annualAttrition=(annualAttritionN||0).toFixed(1);
  return (
    <RPT_Page title="Attrition Rate Report" subtitle="Monthly joiners vs leavers · FY 2025-26">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Joiners YTD</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#22c55e"}}>{ttlJoiners}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Leavers YTD</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#A32D2D"}}>{ttlLeavers}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Net Add</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>+{ttlJoiners-ttlLeavers}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Annual Attrition</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:Number(annualAttrition)>20?"#A32D2D":"#0d1326"}}>{annualAttrition}%</p></div>
      </div>
      <div style={cardStyle}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={ATTRITION_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7"/>
            <XAxis dataKey="month" tick={{fontSize:10,fill:"#5a6691"}}/>
            <YAxis tick={{fontSize:10,fill:"#5a6691"}}/>
            <Tooltip/>
            <Legend wrapperStyle={{fontSize:11}}/>
            <Bar dataKey="joiners" fill="#22c55e" name="Joiners"/>
            <Bar dataKey="leavers" fill="#A32D2D" name="Leavers"/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{...cardStyle,marginTop:14}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Month</th><th style={{...RPT_thStyle,textAlign:"right"}}>Opening HC</th><th style={{...RPT_thStyle,textAlign:"right"}}>Joiners</th><th style={{...RPT_thStyle,textAlign:"right"}}>Leavers</th><th style={{...RPT_thStyle,textAlign:"right"}}>Closing HC</th><th style={{...RPT_thStyle,textAlign:"right"}}>Attrition %</th></tr></thead>
          <tbody>{ATTRITION_DATA.map(m=>(<tr key={m.month}><td style={{...RPT_tdStyle,fontWeight:600}}>{m.month}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{m.openingHc}</td><td style={{...RPT_tdStyle,textAlign:"right",color:m.joiners>0?"#22c55e":"#5a6691",fontWeight:m.joiners>0?700:400}}>{m.joiners||"—"}</td><td style={{...RPT_tdStyle,textAlign:"right",color:m.leavers>0?"#A32D2D":"#5a6691",fontWeight:m.leavers>0?700:400}}>{m.leavers||"—"}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{m.closingHc}</td><td style={{...RPT_tdStyle,textAlign:"right",color:m.attritionRate>0?"#A32D2D":"#5a6691"}}>{m.attritionRate>0?m.attritionRate.toFixed(1)+"%":"—"}</td></tr>))}</tbody>
        </table>
      </div>
    </RPT_Page>
  );
}

/* 12. Leave Utilization */

export function RPT_LeaveUtilization(){
  /* Live: approved leave days per employee from the leave register, against a
     policy entitlement. Consolidated across branches. */
  const emps=((useMasterList('employees').data)||[]).map(fromEmpDTO);
  const leaves=((useMasterList('leave-requests').data)||[]).map(fromLeaveDTO);
  const LEAVE_UTILIZATION=buildLeaveUtilization(emps,leaves);
  return (
    <RPT_Page title="Leave Utilization Report" subtitle="% of entitlement used per employee · current FY">
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Employee</th><th style={RPT_thStyle}>Branch</th><th style={{...RPT_thStyle,textAlign:"right"}}>Entitled</th><th style={{...RPT_thStyle,textAlign:"right"}}>Used</th><th style={{...RPT_thStyle,textAlign:"right"}}>Balance</th><th style={{...RPT_thStyle,textAlign:"right"}}>CL</th><th style={{...RPT_thStyle,textAlign:"right"}}>SL</th><th style={{...RPT_thStyle,textAlign:"right"}}>EL</th><th style={{...RPT_thStyle,textAlign:"center"}}>Utilization</th></tr></thead>
          <tbody>{LEAVE_UTILIZATION.length===0&&(<tr><td colSpan={9} style={{...RPT_tdStyle,textAlign:"center",color:"#8b94b3"}}>No employees yet.</td></tr>)}{LEAVE_UTILIZATION.map(l=>(<tr key={l.empId}><td style={{...RPT_tdStyle,fontWeight:600}}>{l.name}</td><td style={RPT_tdStyle}><span style={{padding:"2px 6px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{l.branch}</span></td><td style={{...RPT_tdStyle,textAlign:"right"}}>{l.entitled}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{l.used}</td><td style={{...RPT_tdStyle,textAlign:"right",color:l.balance<5?"#A32D2D":"#0d1326"}}>{l.balance}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{l.casual}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{l.sick}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{l.earned}</td><td style={{padding:"6px 12px",borderBottom:"1px solid #dfe2e7"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{flex:1,height:6,background:"#f0f2f7",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:l.utilPct+"%",background:l.utilPct>75?"#A32D2D":l.utilPct>50?"#d4a437":"#22c55e",borderRadius:3}}/></div><span style={{fontSize:10.5,fontWeight:700,color:l.utilPct>75?"#A32D2D":"#0d1326",minWidth:36,textAlign:"right"}}>{l.utilPct.toFixed(0)}%</span></div></td></tr>))}</tbody>
        </table>
      </div>
    </RPT_Page>
  );
}

/* 13. Birthday & Anniversary Calendar */

export function RPT_BirthdayCalendar(){
  /* Live from the employee master — the backend /stats endpoint derives upcoming
     birthdays + work anniversaries from each employee's dob / joinDate, scoped to
     the caller's branch(es). */
  const statsQ=useQuery({queryKey:['employees','stats'],queryFn:()=>apiGet('/api/employees/stats'),enabled:!!getAuthToken(),staleTime:60_000});
  const stats=statsQ.data||{birthdays:[],anniversaries:[]};
  return (
    <RPT_Page title="Birthday &amp; Anniversary Calendar" subtitle="Engagement events for HR &amp; team celebrations">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:14,fontWeight:700,color:"#0d1326",marginBottom:12}}>🎂 Upcoming Birthdays</p>
          {(stats.birthdays||[]).length===0&&<p style={{color:"#5a6691",fontSize:12}}>{statsQ.isLoading?"Loading…":"No upcoming birthdays"}</p>}
          {(stats.birthdays||[]).map(b=>(<div key={b.name} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #dfe2e7"}}><div style={{width:44,height:44,borderRadius:"50%",background:"#d4a437",display:"flex",alignItems:"center",justifyContent:"center",color:"#0d1326",fontSize:14,fontWeight:700}}>{b.name.substring(0,2).toUpperCase()}</div><div style={{flex:1}}><p style={{margin:0,fontSize:13,color:"#0d1326",fontWeight:700}}>{b.name}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>{b.branch} · {b.date}</p></div><button style={{padding:"5px 12px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:4,fontSize:11,fontWeight:700,cursor:"pointer"}}>Send wish</button></div>))}
        </div>
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:14,fontWeight:700,color:"#0d1326",marginBottom:12}}>🎉 Work Anniversaries</p>
          {(stats.anniversaries||[]).length===0&&<p style={{color:"#5a6691",fontSize:12}}>{statsQ.isLoading?"Loading…":"No upcoming anniversaries"}</p>}
          {(stats.anniversaries||[]).map(a=>(<div key={a.name} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #dfe2e7"}}><div style={{width:44,height:44,borderRadius:"50%",background:"#6B4C8B",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,fontWeight:700}}>{a.years}</div><div style={{flex:1}}><p style={{margin:0,fontSize:13,color:"#0d1326",fontWeight:700}}>{a.name}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>{a.branch} · {a.years} year{a.years!==1?"s":""} on {a.date}</p></div><button style={{padding:"5px 12px",background:"#6B4C8B",color:"#fff",border:"none",borderRadius:4,fontSize:11,fontWeight:700,cursor:"pointer"}}>Acknowledge</button></div>))}
        </div>
      </div>
    </RPT_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   COMPLIANCE & RISK REPORTS (3)
   ════════════════════════════════════════════════════════════════════ */

/* 14. Statutory Dues Calendar */

export function RPT_StatutoryDues(){
  // Live from the compliance calendar (GET /api/tax-calendar/dues); status +
  // days-left are derived server-side so they match the dashboard alerts.
  const q=useStatutoryDues();
  const rows=q.data?.rows||[];
  const t=q.data?.totals||{overdue:0,pending:0,upcoming:0,dueValue:0};
  return (
    <RPT_Page title="Statutory Dues Calendar" subtitle="All compliance dates · filing status &amp; reminders">
      <RptState q={q} empty={rows.length===0} label="statutory dues">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Overdue</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#A32D2D"}}>{t.overdue}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Pending</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#f97316"}}>{t.pending}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Upcoming</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#d4a437"}}>{t.upcoming}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Total Due Value</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{fmtINR(t.dueValue)}</p></div>
      </div>
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Due Date</th><th style={RPT_thStyle}>Authority</th><th style={RPT_thStyle}>Filing</th><th style={RPT_thStyle}>Entity</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th><th style={{...RPT_thStyle,textAlign:"center"}}>Days Left</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
          <tbody>{rows.map((d,i)=>(<tr key={d.id||i}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:600}}>{d.due}</td><td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700,color:"#0d1326"}}>{d.authority}</span></td><td style={{...RPT_tdStyle,fontWeight:600}}>{d.filing}</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>{d.entity}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{d.amount>0?fmtINR(d.amount):"—"}</td><td style={{...RPT_tdStyle,textAlign:"center",fontWeight:700,color:d.daysLeft<=0?"#A32D2D":d.daysLeft<=7?"#f97316":d.daysLeft<=30?"#d4a437":"#5a6691"}}>{d.status==="Filed"?"—":d.daysLeft<=0?"DUE NOW":d.daysLeft+"d"}</td><td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"3px 10px",borderRadius:3,fontSize:10,fontWeight:700,letterSpacing:"0.3px",background:d.status==="Filed"?"#d4edda":d.status==="Pending"?"#f8d7da":d.status==="Upcoming"?"#fff3cd":"#f8d7da",color:d.status==="Filed"?"#155724":d.status==="Pending"?"#721c24":d.status==="Upcoming"?"#856404":"#721c24"}}>{d.status}</span></td></tr>))}</tbody>
        </table>
      </div>
      </RptState>
    </RPT_Page>
  );
}

/* 15. Tax Filing Status Board */

export function RPT_TaxFilingBoard({ branch }){
  // Filed/Pending is derived live from entered return figures (no static data).
  const [period,setPeriod]=useState(()=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return d.toISOString().slice(0,7);});
  const q=useTaxFilingBoard(branch,period);
  const entities=q.data?.entities||[];
  const allTaxes=[...new Set(entities.flatMap(e=>Object.keys(e.taxes)))];
  const t=q.data?.totals||{filed:0,pending:0,returns:0};
  return (
    <RPT_Page title="Tax Filing Status Board" subtitle="GSTR / TDS / VAT — filed vs pending per branch, derived live from entered return figures"
      toolbar={<label style={{display:"flex",alignItems:"center",gap:6,fontSize:11.5,color:"#5a6691",fontWeight:600}}>Period
        <input type="month" value={period} onChange={e=>setPeriod(e.target.value)} style={{padding:"4px 8px",border:"1px solid #cdd1d8",borderRadius:4,fontSize:12}}/></label>}>
      <RptState q={q} empty={entities.length===0} label="branches">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Returns Tracked</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{t.returns}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Filed</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#155724"}}>{t.filed}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Pending</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#A32D2D"}}>{t.pending}</p></div>
      </div>
      <div style={cardStyle}>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={{...RPT_thStyle,minWidth:180}}>Entity</th>{allTaxes.map(t=><th key={t} style={{...RPT_thStyle,textAlign:"center",minWidth:100}}>{t}</th>)}</tr></thead>
          <tbody>{entities.map(e=>(<tr key={e.entity}><td style={{...RPT_tdStyle,fontWeight:700}}>{e.entity}</td>{allTaxes.map(t=>{const tax=e.taxes[t];if(!tax) return <td key={t} style={{...RPT_tdStyle,textAlign:"center",color:"#cbd0dc"}}>—</td>;return (<td key={t} style={{padding:"8px 6px",textAlign:"center",borderBottom:"1px solid #dfe2e7"}}><span style={{display:"inline-block",padding:"3px 10px",borderRadius:3,fontSize:10,fontWeight:700,letterSpacing:"0.3px",background:tax.status==="Filed"?"#d4edda":"#f8d7da",color:tax.status==="Filed"?"#155724":"#721c24"}}>{tax.status==="Filed"?"✓ Filed":"○ Pending"}</span>{tax.date!=="—"&&<p style={{margin:"3px 0 0",fontSize:9,color:"#5a6691",fontFamily:"monospace"}}>{tax.date}</p>}</td>);})}</tr>))}</tbody>
        </table></div>
      </div>
      </RptState>
    </RPT_Page>
  );
}

/* 16. Currency Exposure */

export function RPT_CurrencyExposure({ branch }){
  // Live foreign-currency exposure (GET /api/accounting/fx-exposure): each non-INR
  // branch's receivables/payables/cash, grouped by currency, converted to INR at the
  // latest forex rate. Hedge columns are intentionally absent — the system has no FX
  // hedge/forward data, so showing them would be fabricated.
  const q=useFxExposure(branch);
  const rows=q.data?.rows||[];
  const t=q.data?.totals||{currencies:0,inrEquivalent:0,missingRates:0};
  const n=(v)=>Number(v||0).toLocaleString("en-IN");
  return (
    <RPT_Page title="Currency Exposure Report" subtitle="Open foreign-currency positions per currency · net exposure & INR equivalent (live from posted books)">
      <RptState q={q} empty={rows.length===0} label="foreign-currency exposure">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Currencies in Use</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{t.currencies}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Net INR Equivalent</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{fmtINR(t.inrEquivalent)}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Currencies w/o Rate</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:t.missingRates>0?"#A32D2D":"#155724"}}>{t.missingRates}</p></div>
      </div>
      <div style={cardStyle}>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Currency</th><th style={RPT_thStyle}>Branches</th><th style={{...RPT_thStyle,textAlign:"right"}}>Receivables</th><th style={{...RPT_thStyle,textAlign:"right"}}>Payables</th><th style={{...RPT_thStyle,textAlign:"right"}}>Cash Held</th><th style={{...RPT_thStyle,textAlign:"right"}}>Net Exposure</th><th style={{...RPT_thStyle,textAlign:"right"}}>Rate → INR</th><th style={{...RPT_thStyle,textAlign:"right"}}>INR Equivalent</th></tr></thead>
          <tbody>{rows.map(c=>(<tr key={c.currency}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:700}}>{c.currency}</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>{(c.branches||[]).join(", ")}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{n(c.receivables)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{n(c.payables)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{n(c.cashHeld)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",fontWeight:700}}>{n(c.netExposure)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:c.rateStale?"#A32D2D":"#5a6691"}}>{c.rateStale?"no rate":c.rate}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:c.inrEquivalent==null?"#A32D2D":"#0d1326"}}>{c.inrEquivalent==null?"rate missing":fmtINR(c.inrEquivalent)}</td></tr>))}</tbody>
        </table></div>
      </div>
      <p style={{margin:"10px 2px 0",fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>Amounts shown in each foreign currency; INR equivalent uses the latest forex rate on file. Hedged/unhedged positions are not shown — the system does not yet track FX hedges or forward contracts, so this reflects open exposure only.</p>
      </RptState>
    </RPT_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   5 STANDARDIZED TABBED SCREENS
   Customer Master (12 tabs) · Supplier Master (12 tabs) ·
   Voucher Entry (8 tabs) · Report Viewer (9 tabs) · Employee Master (10 tabs)
   ════════════════════════════════════════════════════════════════════ */

/* ── Shared helpers ─────────────────────────────────────────────── */


export const tabBtnStyle = (active) => ({
  padding:"10px 16px",border:"none",
  borderBottom: active?"2px solid #c2a04a":"2px solid transparent",
  background:"transparent",
  color: active?"#14161a":"#5b616e",
  fontWeight: active?700:500,
  fontSize:12.5,cursor:"pointer",whiteSpace:"nowrap"
});


export const inpStd = {padding:"8px 10px",width:"100%",border:"1px solid #cdd1d8",borderRadius:8,fontSize:12,boxSizing:"border-box",color:"#14161a"};

/* ════════════════════════════════════════════════════════════════════
   1. CUSTOMER MASTER (12 tabs) — L&T Limited demo
   ════════════════════════════════════════════════════════════════════ */

