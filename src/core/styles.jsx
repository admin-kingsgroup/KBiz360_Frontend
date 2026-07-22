/* ════════════════════════════════════════════════════════════════════
   CORE/STYLES.JS
   Auto-generated from KBiz360_v2.jsx · 1176 lines · 44 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Calendar, ChevronDown, ChevronRight, Clock, Download, PieChart as PieChartIcon, Percent, Plus, Save, Search, Trash2, TrendingDown, TrendingUp, Truck, User } from 'lucide-react';
import { Menu as DropdownMenu } from './ux/Menu';
import { Bar, BarChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getUnmatchedTickets, settlePurchaseEntry } from './business-logic';
import { FX_RATES, PURCHASE_REGISTRY } from './data';
import { branchCfg } from './referenceCache';
import { useSalespeople } from './useReference';
import { guardExport } from './exportGuard';
import { useQuery } from '@tanstack/react-query';
import { apiGet, getAuthToken } from './api';
import { useMasterList } from './useMasters';
import { fromEmpDTO } from '../modules/hr/employeeMap';
import { fromLeaveDTO } from '../modules/hr/hrMaps';
import { buildLeaveUtilization, buildAttrition, lastMonths } from '../modules/hr/hrReports';
import { fmt, fmtINR, compactAmt } from './format';
import { todayISO, nowLabel, CUR_FY } from './dates';
import { openPrintPreview } from './PrintPreview';
import { cardStyle } from './helpers';
import { useGpBills, useProfitAndLoss, useYieldByDestination, useCustomerLtv, useAbcAnalysis, useYearOverYear, useTrialBalance, useAuditTrail } from './useAccounting';
import { isLiquidRow, liquidityKind } from './ledgerKind';
import { useTaxFilingBoard, useStatutoryDues } from './useTaxReco';
import { ReportDateBar, resolveReportRange } from './reportDateBar';
import { triggerSaveRefresh, useMobile } from './hooks';
import { openPrintWindow } from './voucher-print';
import { Skeleton } from '../shell/primitives';

const PurchaseLinkField = React.lazy(() =>
  import('../modules/transactions').then(m => ({ default: m.PurchaseLinkField })));

import { B, bc, bcfmt, inp, card, btnG, btnGh, Icon, FL, KpiCard, RPT_thStyle, RPT_tdStyle } from './styleTokens';
export { B, bc, bcfmt, inp, card, btnG, btnGh, Icon, FL, KpiCard, RPT_thStyle, RPT_tdStyle };
// cmoney/rrow/partyLink moved to modules/reports/profitability-gp/analyticsShared.js
// (business sub-module reorg) — their only consumers moved there too.
/* BUSINESS SUB-MODULE REORG (2026-07-13): these 12 report screens moved to their
   business sub-module folders (matching the nav menu groups); re-exported here
   under their original names because App.jsx dynamically imports them directly
   from './core/styles' as one lazy-loaded chunk. RPT_CashPosition and
   RPT_AuditTrail stay in this file (Accounts-menu items, not Reports/HR/Tax). */
import { RPT_YieldDestination } from '../modules/reports/profitability-gp/yieldDestination';
import { RPT_YieldConsultant } from '../modules/reports/profitability-gp/yieldConsultant';
import { RPT_YieldSupplier } from '../modules/reports/profitability-gp/yieldSupplier';
import { RPT_YoY } from '../modules/reports/profitability-gp/yoyComparison';
import { RPT_CustomerLTV } from '../modules/reports/profitability-gp/customerLtv';
import { RPT_ABCAnalysis } from '../modules/reports/profitability-gp/abcAnalysis';
import { RPT_Attrition } from '../modules/hr/hr-reports/attrition';
import { RPT_LeaveUtilization } from '../modules/hr/hr-reports/leaveUtilization';
import { RPT_BirthdayCalendar } from '../modules/hr/hr-reports/birthdayCalendar';
import { RPT_StatutoryDues } from '../modules/taxation/statutoryDues';
import { RPT_TaxFilingBoard } from '../modules/taxation/taxFilingBoard';
export { RPT_YieldDestination, RPT_YieldConsultant, RPT_YieldSupplier, RPT_YoY, RPT_CustomerLTV, RPT_ABCAnalysis, RPT_Attrition, RPT_LeaveUtilization, RPT_BirthdayCalendar, RPT_StatutoryDues, RPT_TaxFilingBoard };


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
    ? (PURCHASE_REGISTRY[purchMod]||[]).filter(e=>e.settled&&e.branch===(branch?.code||""))
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
  const brCode=branch==="ALL"?"ALL":branch?.code||"ALL";
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
            <input value={vNo} readOnly title="Provisional — the final, guaranteed-unique number is assigned atomically when you save (so simultaneous entries never clash)." style={{...inp,background:"#f3f4f8",color:"#5a6691",fontFamily:"monospace",fontWeight:700}}/>
            {vNo && vNo!=="Auto" && <div style={{fontSize:9.5,color:"#8A8A84",marginTop:3,letterSpacing:"0.2px"}}>Provisional · final no. assigned on save</div>}
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


const PREMIUM_CARD={...cardStyle,border:"1px solid #cdd1d8",borderRadius:12,boxShadow:"0 1px 2px rgba(16,18,22,0.04), 0 6px 20px -10px rgba(16,18,22,0.12)"};

export function WidgetCard({title,subtitle,children,onPin,pinned,onDrill,color}){
  const accent = color || "#8a93a6";
  return (
    <div style={PREMIUM_CARD}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,
        margin:"-14px -14px 10px -14px",padding:"10px 14px",
        background:`${accent}1A`,borderBottom:`1px solid ${accent}40`,
        borderRadius:"11px 11px 0 0"}}>
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

  const d=String(delta||"").trim();
  const deltaColor=d.startsWith("+")?"#16a34a":d.startsWith("-")?"#dc2626":"#5b616e";
  // When clickable, the card is a real button to AT/keyboard: role+tabIndex+Enter/Space
  // activation, an aria-label, and a min touch height (≥44px) for mobile tap targets.
  const interactive=!!onClick;
  const onKeyDown=interactive?(e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); onClick(e); } }:undefined;
  return (
    <div onClick={onClick}
      role={interactive?"button":undefined} tabIndex={interactive?0:undefined} onKeyDown={onKeyDown}
      aria-label={interactive?`${label}: ${value}`:undefined}
      style={{...PREMIUM_CARD,cursor:interactive?"pointer":"default",borderTop:"3px solid "+(color||"#c2a04a"),...(interactive?{minHeight:64}:{})}}>
      <p style={{margin:0,fontSize:10.5,color:"#5b616e",letterSpacing:"0.4px",textTransform:"uppercase",fontWeight:700}}>{label}</p>
      <p style={{margin:"5px 0 2px",fontSize:22,fontWeight:800,color:"#14161a",fontVariantNumeric:"tabular-nums"}}>{value}</p>
      {delta&&<p style={{margin:0,fontSize:11,color:deltaColor,fontWeight:600}}>{delta}</p>}
    </div>
  );
}


export const PAGE_MAX = 1600;

// Generic client-side export for RPT_Page reports: scrapes the rendered detail table
// (the one with the most body rows) from the page container and downloads it as CSV or a
// simple Excel-openable .xls (HTML table). Works for ANY RPT_ report with no per-report
// plumbing — mirrors the DOM-based PDF/print button. (These buttons were previously dead.)
function exportRptTable(pageEl, title, kind) {
  const toast = (msg) => { try { window.dispatchEvent(new CustomEvent('kb:toast', { detail: { id: `exp-${kind}-${Date.now()}`, msg, kind: 'error', ttl: 2600 } })); } catch { /* ignore */ } };
  if (!pageEl) return;
  const tables = [...pageEl.querySelectorAll('table')];
  if (!tables.length) { toast('Nothing to export on this report.'); return; }
  const table = tables.slice().sort((a, b) => b.querySelectorAll('tbody tr').length - a.querySelectorAll('tbody tr').length)[0];
  const cellsOf = (tr) => [...tr.querySelectorAll('th,td')].map((c) => (c.textContent || '').replace(/\s+/g, ' ').trim());
  const matrix = [...table.querySelectorAll('tr')].map(cellsOf).filter((r) => r.length);
  if (!matrix.length) { toast('Nothing to export on this report.'); return; }
  const slug = String(title || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report';
  // Report/Export controls chokepoint — dormant unless the Owner engages the export
  // policy, then a restricted export is blocked (and logged) instead of downloading.
  guardExport({ report: title || slug, scope: 'branch', format: kind === 'xls' ? 'xls' : 'csv', rowCount: Math.max(0, matrix.length - 1) }, () => {
    let blob, ext;
    if (kind === 'xls') {
      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const html = `<table border="1">${matrix.map((r, i) => `<tr>${r.map((c) => `<t${i === 0 ? 'h' : 'd'}>${esc(c)}</t${i === 0 ? 'h' : 'd'}>`).join('')}</tr>`).join('')}</table>`;
      blob = new Blob([`﻿<html><head><meta charset="utf-8"></head><body>${html}</body></html>`], { type: 'application/vnd.ms-excel' }); ext = 'xls';
    } else {
      const q = (s) => (/[",\n\r]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : s);
      blob = new Blob([`﻿${matrix.map((r) => r.map(q).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' }); ext = 'csv';
    }
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `${slug}.${ext}`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  });
}

export function RPT_Page({title,subtitle,toolbar,children}){
  const pageRef=useRef(null);
  return (
    <div ref={pageRef} style={{padding:18,maxWidth:PAGE_MAX,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:14,marginBottom:14,paddingBottom:12,borderBottom:"1px solid #cdd1d8"}}>
        <div>
          <h2 style={{margin:0,fontSize:20,color:"#0d1326",fontWeight:700}}>{title}</h2>
          <p style={{margin:"3px 0 0",fontSize:12,color:"#5a6691"}}>{subtitle}</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {toolbar}
          <button onClick={()=>openPrintPreview({ selector: 'main', title: title||'Report', recommend: 'portrait' })} style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,fontSize:11.5,cursor:"pointer",fontWeight:600,color:"#5a6691"}}>📄 PDF</button>
          <button onClick={()=>exportRptTable(pageRef.current, title, 'xls')} title="Export the table to Excel" style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,fontSize:11.5,cursor:"pointer",fontWeight:600,color:"#5a6691"}}>📊 Excel</button>
          <button onClick={()=>exportRptTable(pageRef.current, title, 'csv')} title="Export the table to CSV" style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,fontSize:11.5,cursor:"pointer",fontWeight:600,color:"#5a6691"}}>📋 CSV</button>
        </div>
      </div>
      {children}
    </div>
  );
}




export function RPT_CashPosition({branch}){
  // LIVE cash & bank position — the same trial-balance liquid ledgers the dashboard's
  // "Cash & Bank" KPI sums (no `from` bound → closing = opening + all movement). Each
  // branch's balances stay in its OWN native currency; there is NO cross-currency total
  // (summing ₹ + $ is meaningless), matching the interbranch-FX-manual policy.
  // A position is an as-of balance → only the `to` (as-of date) matters; `from` is
  // ignored. Default preset 'all' → to:'' → as of today; the date bar back-dates the snapshot.
  const [range,setRange]=useState(()=>({mode:'all',...resolveReportRange('all')}));
  const q = useTrialBalance(branch, { to: range.to });
  const data = q.data || {};
  const bal = (r) => (r.closingDebit || 0) - (r.closingCredit || 0); // Dr +ve
  const locOf = (cur) => (cur === "₹" || cur === "₨" || cur === "Rs") ? "en-IN" : "en-US";
  const fmtCur = (cur, n) => `${cur} ${Math.round(Number(n) || 0).toLocaleString(locOf(cur))}`;
  // Normalise to a flat list of liquid ledgers. Consolidated (ALL) scope uses the
  // per-branch breakdown so each row carries its branch's currency; a single-branch call
  // uses that branch's rows + currency.
  const rows = [];
  const pushRow = (brCode, cur, r) => rows.push({
    branch: brCode || "—", ledger: r.ledger || r.name || "—", group: r.group || "",
    type: liquidityKind(r) === "cash" ? "Cash" : "Bank", currency: cur, balance: bal(r),
  });
  if (Array.isArray(data.byBranch) && data.byBranch.length) {
    data.byBranch.forEach((b) => {
      const cur = (bc({ code: b.branch }) || {}).cur || "₹";
      (b.rows || []).filter(isLiquidRow).forEach((r) => pushRow(b.branch, cur, r));
    });
  } else {
    const cur = (bc(branch) || {}).cur || "₹";
    const brCode = (branch === "ALL" || !branch) ? "" : (branch.code || branch);
    (data.rows || []).filter(isLiquidRow).forEach((r) => pushRow(brCode, cur, r));
  }
  rows.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

  const groupByCurrency = {};
  rows.forEach((r) => { if (!groupByCurrency[r.currency]) groupByCurrency[r.currency] = { total: 0, count: 0 }; groupByCurrency[r.currency].total += r.balance; groupByCurrency[r.currency].count += 1; });
  const groupByBranch = {};
  rows.forEach((r) => { if (!groupByBranch[r.branch]) groupByBranch[r.branch] = []; groupByBranch[r.branch].push(r); });
  const branchCurTotals = (accts) => { const m = {}; accts.forEach((a) => { m[a.currency] = (m[a.currency] || 0) + a.balance; }); return m; };
  const bankCount = rows.filter((r) => r.type === "Bank").length;
  const cashCount = rows.filter((r) => r.type === "Cash").length;

  return (
    <RPT_Page title="Cash Position Summary" subtitle={`Live cash + bank ledger balances · as of ${range.to || 'today'} · each branch in its own currency`} toolbar={<ReportDateBar value={range} onChange={setRange}/>}>
      {q.isLoading && <div style={{padding:"14px 2px",fontSize:12.5,color:"#5a6691"}}><Skeleton className="h-3 w-40" /></div>}
      {!q.isLoading && !rows.length && <div style={{padding:"14px 2px",fontSize:12.5,color:"#5a6691"}}>No cash or bank ledgers found for this scope.</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:14}}>
        <div className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{borderTopColor:"#2563eb"}}><p className="text-[10.5px] font-bold uppercase tracking-wide" style={{color:"#2563eb"}}>Bank Ledgers</p><p className="mt-1 text-xl font-extrabold tabular-nums text-navy">{bankCount}</p></div>
        <div className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{borderTopColor:"#16a34a"}}><p className="text-[10.5px] font-bold uppercase tracking-wide" style={{color:"#16a34a"}}>Cash Ledgers</p><p className="mt-1 text-xl font-extrabold tabular-nums text-navy">{cashCount}</p></div>
        <div className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{borderTopColor:"#7c3aed"}}><p className="text-[10.5px] font-bold uppercase tracking-wide" style={{color:"#7c3aed"}}>Currencies</p><p className="mt-1 text-xl font-extrabold tabular-nums text-navy">{Object.keys(groupByCurrency).length}</p></div>
        <div className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{borderTopColor:"#d97706"}}><p className="text-[10.5px] font-bold uppercase tracking-wide" style={{color:"#d97706"}}>Branches</p><p className="mt-1 text-xl font-extrabold tabular-nums text-navy">{Object.keys(groupByBranch).length}</p></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14,marginBottom:14}}>
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>By Currency</p>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Currency</th><th style={{...RPT_thStyle,textAlign:"right"}}>Balance</th></tr></thead>
            <tbody>{Object.entries(groupByCurrency).map(([cur,d])=>(<tr key={cur}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:700}}>{cur} <span style={{color:"#5a6691",fontWeight:400,fontSize:10}}>({d.count})</span></td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:d.total<0?"#A32D2D":"#0d1326"}}>{fmtCur(cur,d.total)}</td></tr>))}
              {!rows.length && <tr><td colSpan={2} style={{...RPT_tdStyle,textAlign:"center",color:"#5a6691"}}>—</td></tr>}</tbody>
          </table></div>
        </div>
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>By Branch</p>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Branch</th><th style={{...RPT_thStyle,textAlign:"center"}}>Ledgers</th><th style={{...RPT_thStyle,textAlign:"right"}}>Balance (native)</th></tr></thead>
            <tbody>{Object.entries(groupByBranch).map(([br,accts])=>{const cm=branchCurTotals(accts);return (<tr key={br}><td style={{...RPT_tdStyle,fontWeight:700}}>{br}</td><td style={{...RPT_tdStyle,textAlign:"center"}}>{accts.length}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",fontWeight:700}}>{Object.entries(cm).map(([cur,v])=>fmtCur(cur,v)).join(" · ")}</td></tr>);})}
              {!rows.length && <tr><td colSpan={3} style={{...RPT_tdStyle,textAlign:"center",color:"#5a6691"}}>—</td></tr>}</tbody>
          </table></div>
        </div>
      </div>
      <div style={cardStyle}>
        <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>Detail — Cash &amp; Bank Ledgers</p>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Branch</th><th style={RPT_thStyle}>Ledger</th><th style={RPT_thStyle}>Group</th><th style={RPT_thStyle}>Type</th><th style={{...RPT_thStyle,textAlign:"right"}}>Balance</th></tr></thead>
          <tbody>{rows.map((r,i)=>(<tr key={i}><td style={RPT_tdStyle}>{r.branch}</td><td style={{...RPT_tdStyle,fontWeight:600}}>{r.ledger}</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>{r.group}</td><td style={RPT_tdStyle}>{r.type}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",fontWeight:600,color:r.balance<0?"#A32D2D":"#0d1326"}}>{fmtCur(r.currency,r.balance)}</td></tr>))}
            {q.isLoading && Array.from({length:5}).map((_,i)=>(
              <tr key={`sk-${i}`}><td colSpan={5} style={{...RPT_tdStyle,padding:10}}><Skeleton className="h-4 w-full" style={{opacity:Math.max(0.4,1-i*0.15)}} /></td></tr>
            ))}
            {!q.isLoading && !rows.length && <tr><td colSpan={5} style={{...RPT_tdStyle,textAlign:"center",color:"#5a6691",padding:16}}>No cash/bank ledgers.</td></tr>}</tbody>
        </table></div>
      </div>
    </RPT_Page>
  );
}

// RPT_FSNotes was dead code (superseded by reportsFinancial/reportsNotes.jsx;
// not imported by App.jsx) — dropped rather than moved.

/* 4. Audit Trail Report */

export function RPT_AuditTrail({ branch }){
  const [filterUser,setFilterUser]=useState("ALL");
  const [filterAction,setFilterAction]=useState("ALL");
  const [search,setSearch]=useState("");
  // LIVE: every voucher/booking create/edit/approve/revoke/delete is recorded to the
  // AuditLog collection; this reads GET /api/audit (branch-scoped, newest 500).
  const q=useAuditTrail(branch);
  const rows=q.data||[];
  const users=[...new Set(rows.map(a=>a.user).filter(Boolean))].sort();
  const actions=[...new Set(rows.map(a=>a.action).filter(Boolean))].sort();
  const filtered=rows.filter(a=>{
    if(filterUser!=="ALL"&&a.user!==filterUser) return false;
    if(filterAction!=="ALL"&&a.action!==filterAction) return false;
    if(search&&!String(a.desc||"").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const colorOf=act=>act==="DELETE"?"#A32D2D":act==="CREATE"?"#22c55e":act==="APPROVE"?"#d4a437":act==="EDIT"?"#f97316":act==="REVOKE"?"#7c3aed":"#5a6691";
  const fmtTs=ts=>{ if(!ts) return "—"; try{ return String(ts).replace("T"," ").slice(0,19); }catch{ return String(ts); } };
  return (
    <RPT_Page title="Audit Trail Report" subtitle="Who changed what, when · live from posted vouchers & bookings · filterable by user, action, module">
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-brand border border-surface-border bg-surface px-3 py-2.5 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px]">🔍</span>
          <input placeholder="Search description / ref..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-md border border-surface-border bg-surface py-2 pl-7 pr-3 text-[12px] outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/15"/>
        </div>
        <select value={filterUser} onChange={e=>setFilterUser(e.target.value)} className="rounded-md border border-surface-border bg-surface px-3 py-2 text-[12px] outline-none transition focus:border-navy"><option value="ALL">All users</option>{users.map(u=><option key={u} value={u}>{u}</option>)}</select>
        <select value={filterAction} onChange={e=>setFilterAction(e.target.value)} className="rounded-md border border-surface-border bg-surface px-3 py-2 text-[12px] outline-none transition focus:border-navy"><option value="ALL">All actions</option>{actions.map(a=><option key={a} value={a}>{a}</option>)}</select>
      </div>
      <div className="rounded-brand border border-surface-border bg-surface p-3.5 shadow-card">
        {q.isLoading
          ? <Skeleton className="mb-2.5 h-5 w-24 rounded-full" />
          : <p className="mb-2.5 inline-block rounded-full bg-surface-alt px-2.5 py-1 text-[10.5px] font-bold text-ink-muted">{`${filtered.length} entries`}</p>}
        <div className="kb-sticky overflow-x-auto" style={{'--stick-head':'#1a1c22',maxHeight:'calc(100vh - 320px)'}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Timestamp</th><th style={RPT_thStyle}>User</th><th style={RPT_thStyle}>Branch</th><th style={RPT_thStyle}>Action</th><th style={RPT_thStyle}>Module</th><th style={RPT_thStyle}>Description</th><th style={RPT_thStyle}>Ref</th></tr></thead>
          <tbody>{filtered.map((a,i)=>(<tr key={a.id||i} className={`transition hover:bg-[#eef1f6] ${i%2===0?'bg-surface':'bg-surface-alt/40'}`}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5,color:"#5a6691"}}>{fmtTs(a.ts)}</td><td style={{...RPT_tdStyle,fontWeight:600}}>{a.user}</td><td style={RPT_tdStyle}><span style={{padding:"2px 6px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{a.branch||"—"}</span></td><td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:colorOf(a.action)+"22",color:colorOf(a.action),borderRadius:3,fontSize:10,fontWeight:700,letterSpacing:"0.3px"}}>{a.action}</span></td><td style={{...RPT_tdStyle,fontSize:11}}>{a.module}</td><td style={{...RPT_tdStyle,fontSize:11}}>{a.desc}</td><td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5,color:"#5a6691"}}>{a.ref}</td></tr>))}
            {!q.isLoading&&!filtered.length&&<tr><td colSpan={7} style={{...RPT_tdStyle,textAlign:"center",color:"#5a6691",padding:18}}>{rows.length?"No entries match the filters.":"No audit events recorded yet."}</td></tr>}</tbody>
        </table></div>
      </div>
    </RPT_Page>
  );
}

// aggBills/RptState/RPT_YieldDestination/RPT_YieldConsultant/RPT_YieldSupplier/
// RPT_YoY/RPT_CustomerLTV/RPT_ABCAnalysis moved to modules/reports/profitability-gp/
// (aggBills/cmoney/rrow/partyLink -> analyticsShared.js); RPT_Attrition/
// RPT_LeaveUtilization/RPT_BirthdayCalendar moved to modules/hr/hr-reports/;
// RPT_StatutoryDues/RPT_TaxFilingBoard moved to modules/taxation/;
// All business sub-module reorg. RptState + RPT_Page moved together to core/reportPage.jsx
// since they're shared across the reports/hr/taxation destinations. Re-exported
// below for App.jsx's direct chunk import.

export const tabBtnStyle = (active) => ({
  padding:"10px 16px",border:"none",
  borderBottom: active?"2px solid #c2a04a":"2px solid transparent",
  background:"transparent",
  color: active?"#14161a":"#5b616e",
  fontWeight: active?700:500,
  fontSize:12.5,cursor:"pointer",whiteSpace:"nowrap"
});


export const inpStd = {padding:"8px 10px",width:"100%",border:"1px solid #cdd1d8",borderRadius:8,fontSize:12,boxSizing:"border-box",color:"#14161a"};


