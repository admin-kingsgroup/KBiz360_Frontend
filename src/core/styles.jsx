/* ════════════════════════════════════════════════════════════════════
   CORE/STYLES.JS
   Auto-generated from KBiz360_v2.jsx · 1176 lines · 44 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useRef, useState, useEffect } from 'react';
import { Calendar, ChevronRight, Clock, Download, Plus, Save, Search, Trash2, TrendingDown, TrendingUp, User } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getUnmatchedTickets, settlePurchaseEntry } from './business-logic';
import { FX_RATES, HR_STATS_DATA, INTERBRANCH_ELIMINATIONS, LEAVE_UTILIZATION, PURCHASE_REGISTRY, TAX_FILING_BOARD, YIELD_BY_CONSULTANT, YIELD_BY_DESTINATION, YIELD_BY_SUPPLIER, YOY_PL } from './data';
import { branchCfg } from './referenceCache';
import { useSalespeople } from './useReference';
import { fmt, fmtINR } from './format';
import { todayISO, nowLabel } from './dates';
import { ATTRITION_DATA, AUDIT_TRAIL_DATA, BANK_ACCOUNTS_DATA, CUSTOMER_LTV_DATA, FS_NOTES, FX_EXPOSURE, STATUTORY_DUES, TOP_SUPPLIERS_DATA, abcOf, cardStyle } from './helpers';
import { triggerSaveRefresh, useMobile } from './hooks';
import { openPrintWindow } from './voucher-print';
import { PurchaseLinkField } from '../modules/transactions';
import { UserSwitcher } from '../shell/UserSwitcher';

/* ── Per-branch config — now DB-backed ──────────────────────────────
   The per-branch config (currency symbol, tax type, GST rates, place-of-supply
   options, voucher prefix) used to be hardcoded here together with demo KPIs /
   bookings / customers / alerts. The demo data is gone (screens read live data);
   the config now comes from /api/company-profile via the synchronous reference
   cache. `B` is a Proxy so legacy `B[code].cur` / `bc(branch)` keep working. */
export const B = new Proxy({}, {
  get: (_t, code) => branchCfg(code === "ALL" ? "ALL" : String(code)),
  has: () => true,
});

/* Helper — get branch config */

export function bc(branch){return branch==="ALL"?B.ALL:B[branch?.code]||B.BOM;}
/* Helper — format amount with branch currency */

export function bcfmt(branch,n){const b=bc(branch);return b.cur+Number(n).toLocaleString("en-IN",{maximumFractionDigits:0});}

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

export const inp={
  width:"100%",padding:"7px 10px",border:"1px solid #e1e3ec",
  borderRadius:7,fontSize:11.5,outline:"none",
  boxSizing:"border-box",background:"#fff",
};

export const card={
  background:"#fff",border:"1px solid #e1e3ec",
  borderRadius:12,padding:"14px 16px",
};

export const btnG={
  display:"flex",alignItems:"center",justifyContent:"center",gap:6,
  padding:"8px 18px",background:"#0d1326",color:"#fff",
  border:"none",borderRadius:8,fontSize:12,fontWeight:700,
  cursor:"pointer",whiteSpace:"nowrap",
};

export const btnGh={
  display:"flex",alignItems:"center",justifyContent:"center",gap:6,
  padding:"7px 16px",background:"transparent",color:"#0d1326",
  border:"1px solid #e1e3ec",borderRadius:8,fontSize:12,fontWeight:600,
  cursor:"pointer",whiteSpace:"nowrap",
};

/* Module icons */

export const ST={
  Paid:    {bg:"#EAF3DE",color:"#27500A"},
  Partial: {bg:"#FAEEDA",color:"#854F0B"},
  Pending: {bg:"#FCEBEB",color:"#A32D2D"},
  Confirmed:{bg:"#E6F1FB",color:"#185FA5"},
};

/* Form-field label wrapper */

export function FL({label,children}){
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <label style={{fontSize:10,color:"#5a6691",fontWeight:600,
        letterSpacing:"0.4px",textTransform:"uppercase"}}>
        {label}
      </label>
      {children}
    </div>
  );
}

/* Salesperson — read-only, comes from CRM (SALESPEOPLE in data.js).
   Shown on every sale/purchase voucher so the booking can be matched
   back to a CRM owner. Not editable: CRM is the source of truth. */
export function SalespersonField({branch,label="Salesperson (CRM)",name}){
  const SALESPEOPLE=useSalespeople().data||[];   // DB-backed (/api/salespeople)
  const branchCode=branch?.code;
  const resolved=name||SALESPEOPLE.find(p=>p.branch===branchCode)?.name||SALESPEOPLE[0]?.name||"—";
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
    <div style={{padding:"10px 16px",borderTop:"1px solid #e1e3ec",
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
    <span title="Current date & time" style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,color:"#5a6691",fontWeight:600,background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:compact?"3px 8px":"5px 10px"}}>
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
  const taxBg=isIndia?"#E6F1FB":"#EAF3DE";
  const taxC=isIndia?"#185FA5":"#27500A";
  const brFlag=branch==="ALL"?"🌐":branch?.flag||"🇮🇳";
  const brCode=branch==="ALL"?"ALL":branch?.code||"BOM";
  return (
    <div style={{padding:"12px 10px",maxWidth:1160,margin:"0 auto",paddingBottom:80}}>
      <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:12,overflow:"hidden"}}>

        {/* Voucher header bar */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:"#f3f4f8",borderBottom:"1px solid #e1e3ec",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <div style={{width:38,height:38,borderRadius:9,background:"#E6F1FB",color:"#185FA5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19}}>{icon}</div>
            <div>
              <p style={{margin:0,fontSize:15,fontWeight:700,color:"#0d1326"}}>{title}</p>
              <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{"Voucher · "+brCode+" · "+vNo}</p>
            </div>
          </div>
          <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
            <LiveDateTime/>
            {/* Branch tax badge */}
            <span style={{fontSize:10,padding:"3px 9px",borderRadius:999,background:taxBg,color:taxC,fontWeight:700,border:"1px solid "+taxBg,letterSpacing:"0.04em"}}>
              {brFlag} {cfg.curCode} · {taxBadge}
            </span>
            <button onClick={()=>openPrintWindow(branch,vNo,title,printRef.current)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",border:"1px solid #e1e3ec",borderRadius:8,fontSize:11.5,background:"#fff",cursor:"pointer",color:"#0d1326"}}><Download size={13}/> Download PDF</button>
            <button style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",border:"1px solid #e1e3ec",borderRadius:8,fontSize:11.5,background:"#fff",cursor:"pointer"}}><Save size={13}/> Draft</button>
          </div>
        </div>

        <div ref={printRef}>
          {/* ── Purchase Link — inline, first field in every sales voucher ── */}
          {type==="sales"&&(
            <PurchaseLinkField
              branch={branch}
              saleMod={saleMod}
              saleAmt={saleAmt||0}
              selected={linkedPurch}
              onSelect={setLinkedPurch}
            />
          )}
          {children}
        </div>
      {type&&<VLinked branch={branch} type={type} vNo={vNo} setRoute={setRoute}/>}
      </div>

      {/* Sticky footer */}
      <div style={{position:"sticky",bottom:0,background:"#f3f4f8",borderTop:"1px solid #e1e3ec",padding:"12px 0",marginTop:14,display:"flex",gap:9,justifyContent:"flex-end"}}>
        <button style={btnGh}>Cancel</button>
        <button
          disabled={!canSave}
          style={{...btnG,
            background:canSave?"#0d1326":"#9ca3af",
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
  return (
    <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:11}}>
          <FL label="Voucher no.">
            <input value={vNo} readOnly style={{...inp,background:"#f3f4f8",color:"#5a6691",fontFamily:"monospace",fontWeight:700}}/>
          </FL>
          <FL label="Date">
            <input type="date" defaultValue={todayISO()} style={inp}/>
          </FL>
          <FL label={isIndia?"Invoice type":"Document type"}>
            <select style={inp}>
              {isIndia
                ?<><option>Tax Invoice</option><option>Bill of Supply</option><option>Proforma</option></>
                :<><option>VAT Invoice</option><option>Receipt</option><option>Proforma</option></>
              }
            </select>
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
    <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
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
    <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:10,padding:14}}>
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
      <div style={{borderTop:"1px solid #e1e3ec",margin:"8px 0"}}/>
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
    <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
        <p style={{margin:0,fontSize:10,color:"#5a6691",letterSpacing:"0.5px",textTransform:"uppercase"}}>{label}</p>
        <button onClick={onAdd} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",border:"1px solid #e1e3ec",borderRadius:7,fontSize:11,background:"#fff",cursor:"pointer"}}><Plus size={12}/> Add row</button>
      </div>
      <div style={{overflowX:"auto"}}>{children}</div>
    </div>
  );
}


export function DBtn({fn}){return <td style={{padding:"4px 7px",textAlign:"center"}}><button onClick={fn} style={{background:"transparent",border:"none",color:"#8b94b3",cursor:"pointer",padding:3}}><Trash2 size={13}/></button></td>;}

/* ── SALES: HOLIDAY PACKAGES ─────────────────────────────── */

export function AgeTable({data}){
  const tot=k=>data.reduce((s,r)=>s+(r[k]||0),0);
  return (
    <div style={{...card,padding:0,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",fontSize:11.5,borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#f3f4f8",borderBottom:"2px solid #e1e3ec"}}>
            <th style={{textAlign:"left",padding:"9px 11px",fontWeight:600,color:"#384677",fontSize:11}}>Party</th>
            <th style={{textAlign:"right",padding:"9px 11px",fontWeight:600,color:"#384677",fontSize:11}}>{"Total ₹"}</th>
            {AGE_H.map((h,i)=><th key={i} style={{textAlign:"right",padding:"9px 11px",fontWeight:600,color:AGE_C[i],fontSize:11}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {data.map((r,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #e1e3ec"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{padding:"9px 11px",fontWeight:500}}>{r.party}</td>
                <td style={{padding:"9px 11px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{fmt(r.total)}</td>
                {AGE_COLS.map((c,ci)=><td key={ci} style={{padding:"9px 11px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:r[c]>0?AGE_C[ci]:"#bfc3d6"}}>{r[c]>0?fmt(r[c]):"—"}</td>)}
              </tr>
            ))}
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
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

export function Icon({children,bg="#E6F1FB",c="#185FA5",size=36}){
  return (
    <div style={{width:size,height:size,borderRadius:Math.round(size*0.25),
      background:bg,color:c,display:"flex",alignItems:"center",
      justifyContent:"center",flexShrink:0,fontSize:size*0.45}}>
      {children}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   TOPBAR
   ═══════════════════════════════════════════════════════════════ */

export function KpiCard({label,value,subtitle,trend,Icon,accent="neutral",onClick}){
  const mob=useMobile();
  const [pressed,setPressed]=useState(false);
  const ac={
    info:   {bg:"#E6F1FB",c:"#185FA5",b:"#B5D4F4"},
    success:{bg:"#EAF3DE",c:"#3B6D11",b:"#C0DD97"},
    warning:{bg:"#FAEEDA",c:"#854F0B",b:"#FAC775"},
    danger: {bg:"#FCEBEB",c:"#A32D2D",b:"#F7C1C1"},
    neutral:{bg:"#f3f4f8",c:"#384677",b:"#e1e3ec"},
  }[accent]||{bg:"#f3f4f8",c:"#384677",b:"#e1e3ec"};
  const clickable=!!onClick;
  return (
    <div onClick={onClick}
      onMouseDown={()=>clickable&&setPressed(true)}
      onMouseUp={()=>setPressed(false)}
      onTouchStart={()=>clickable&&setPressed(true)}
      onTouchEnd={()=>setPressed(false)}
      style={{background:pressed?"#f0f4ff":"#fff",border:`1px solid ${ac.b}`,
        borderRadius:10,padding:mob?"10px 12px":"12px 14px",
        borderTop:`3px solid ${ac.c}`,display:"flex",flexDirection:"column",gap:4,
        minWidth:0,overflow:"hidden",cursor:clickable?"pointer":"default",
        transform:pressed?"scale(0.97)":"scale(1)",
        transition:"transform 0.12s,background 0.12s",userSelect:"none",
        WebkitTapHighlightColor:"transparent"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <p style={{margin:0,fontSize:mob?9:9.5,fontWeight:700,color:ac.c,
          textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</p>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:mob?26:30,height:mob?26:30,borderRadius:8,
            background:ac.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {Icon&&<Icon size={mob?13:15} style={{color:ac.c}}/>}
          </div>
          {clickable&&<ChevronRight size={12} style={{color:ac.c,opacity:0.6}}/>}
        </div>
      </div>
      <p style={{margin:0,fontSize:mob?19:22,fontWeight:800,color:"#0d1326",
        letterSpacing:"-0.02em",lineHeight:1.1,fontVariantNumeric:"tabular-nums"}}>{value}</p>
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        {trend!=null&&(
          <span style={{display:"flex",alignItems:"center",gap:2,fontSize:mob?9.5:10.5,
            fontWeight:600,color:trend>=0?"#27500A":"#A32D2D"}}>
            {trend>=0?<TrendingUp size={10}/>:<TrendingDown size={10}/>}
            {trend>=0?"+":""}{trend}%
          </span>
        )}
        <p style={{margin:0,fontSize:mob?9:10,color:"#5a6691"}}>{subtitle}</p>
      </div>
    </div>
  );
}

/* ── UserSwitcher (demo simulator — switch viewing identity) ── */

export function WidgetCard({title,subtitle,children,onPin,pinned,onDrill}){
  return (
    <div style={cardStyle}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div>
          <p style={{margin:0,fontSize:11,color:"#5a6691",letterSpacing:"0.5px",textTransform:"uppercase",fontWeight:700}}>{title}</p>
          {subtitle&&<p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{subtitle}</p>}
        </div>
        <div style={{display:"flex",gap:6}}>
          {onPin&&<button onClick={onPin} title={pinned?"Unpin":"Pin"} style={{padding:"3px 6px",background:"transparent",border:"none",cursor:"pointer",color:pinned?"#d4a437":"#cbd0dc",fontSize:14}}>★</button>}
          {onDrill&&<button onClick={onDrill} style={{padding:"3px 8px",background:"transparent",border:"1px solid #e1e3ec",borderRadius:4,color:"#5a6691",cursor:"pointer",fontSize:10,fontWeight:600}}>Drill ↗</button>}
        </div>
      </div>
      {children}
    </div>
  );
}


export function KPICard({label,value,delta,color,onClick}){
  return (
    <div onClick={onClick} style={{...cardStyle,cursor:onClick?"pointer":"default",borderTop:"3px solid "+(color||"#d4a437")}}>
      <p style={{margin:0,fontSize:10.5,color:"#5a6691",letterSpacing:"0.5px",textTransform:"uppercase",fontWeight:700}}>{label}</p>
      <p style={{margin:"5px 0 2px",fontSize:22,fontWeight:700,color:"#0d1326"}}>{value}</p>
      {delta&&<p style={{margin:0,fontSize:11,color:delta.includes("+")?"#22c55e":"#A32D2D",fontWeight:600}}>{delta}</p>}
    </div>
  );
}


export function RPT_Page({title,subtitle,toolbar,children}){
  return (
    <div style={{padding:18,maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:14,marginBottom:14,paddingBottom:12,borderBottom:"1px solid #e1e3ec"}}>
        <div>
          <h2 style={{margin:0,fontSize:20,color:"#0d1326",fontWeight:700}}>{title}</h2>
          <p style={{margin:"3px 0 0",fontSize:12,color:"#5a6691"}}>{subtitle}</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {toolbar}
          <button onClick={()=>window.print()} style={{padding:"7px 12px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:11.5,cursor:"pointer",fontWeight:600,color:"#5a6691"}}>📄 PDF</button>
          <button style={{padding:"7px 12px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:11.5,cursor:"pointer",fontWeight:600,color:"#5a6691"}}>📊 Excel</button>
          <button style={{padding:"7px 12px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:11.5,cursor:"pointer",fontWeight:600,color:"#5a6691"}}>📋 CSV</button>
        </div>
      </div>
      {children}
    </div>
  );
}


export const RPT_thStyle={padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase",background:"#f7f8fb"};

export const RPT_tdStyle={padding:"8px 12px",fontSize:12,color:"#0d1326",borderBottom:"1px solid #f0f2f7"};

/* ── Seed data ────────────────────────────────────────────────────── */


export function RPT_CashPosition({branch}){
  const groupByBranch={};
  BANK_ACCOUNTS_DATA.forEach(b=>{
    if(!groupByBranch[b.branch]) groupByBranch[b.branch]=[];
    groupByBranch[b.branch].push(b);
  });
  const groupByCurrency={};
  BANK_ACCOUNTS_DATA.forEach(b=>{
    if(!groupByCurrency[b.currency]) groupByCurrency[b.currency]={total:0,count:0,inINR:0};
    const rate=FX_RATES[b.currency]||1;
    groupByCurrency[b.currency].total+=b.openingBal;
    groupByCurrency[b.currency].count+=1;
    groupByCurrency[b.currency].inINR+=b.openingBal*rate;
  });
  const grandTotal=Object.values(groupByCurrency).reduce((s,c)=>s+c.inINR,0);
  return (
    <RPT_Page title="Cash Position Summary" subtitle="All bank balances + petty cash · real-time · all branches">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:14}}>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>Grand Total (INR equiv)</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{fmtINR(grandTotal)}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>Bank Accounts</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{BANK_ACCOUNTS_DATA.filter(b=>b.type!=="Cash").length}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>Currencies</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{Object.keys(groupByCurrency).length}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>Branches</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{Object.keys(groupByBranch).length}</p></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>By Currency</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Currency</th><th style={{...RPT_thStyle,textAlign:"right"}}>Balance</th><th style={{...RPT_thStyle,textAlign:"right"}}>INR Equiv</th></tr></thead>
            <tbody>{Object.entries(groupByCurrency).map(([cur,d])=>(<tr key={cur}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:700}}>{cur} <span style={{color:"#5a6691",fontWeight:400,fontSize:10}}>({d.count})</span></td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{cur} {d.total.toLocaleString("en-IN")}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(d.inINR)}</td></tr>))}</tbody>
          </table>
        </div>
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>By Branch</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Branch</th><th style={{...RPT_thStyle,textAlign:"center"}}>A/cs</th><th style={{...RPT_thStyle,textAlign:"right"}}>Total INR Equiv</th></tr></thead>
            <tbody>{Object.entries(groupByBranch).map(([br,accts])=>{const total=accts.reduce((s,a)=>{const rate=1;return s+a.openingBal*rate;},0);return (<tr key={br}><td style={{...RPT_tdStyle,fontWeight:700}}>{br}</td><td style={{...RPT_tdStyle,textAlign:"center"}}>{accts.length}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(total)}</td></tr>);})}</tbody>
          </table>
        </div>
      </div>
      <div style={cardStyle}>
        <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>Detail — All Accounts</p>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Branch</th><th style={RPT_thStyle}>Bank · Account</th><th style={RPT_thStyle}>Type</th><th style={RPT_thStyle}>Currency</th><th style={{...RPT_thStyle,textAlign:"right"}}>Balance</th><th style={{...RPT_thStyle,textAlign:"right"}}>INR Equiv</th><th style={{...RPT_thStyle,textAlign:"right"}}>% of Limit</th></tr></thead>
          <tbody>{BANK_ACCOUNTS_DATA.map(b=>{const rate=FX_RATES[b.currency]||1;const pct=Math.round(b.openingBal/b.limit*100);return (<tr key={b.id}><td style={RPT_tdStyle}>{b.branch}</td><td style={RPT_tdStyle}>{b.bank} · <span style={{fontFamily:"monospace",color:"#5a6691"}}>...{b.accountNo.slice(-6)}</span></td><td style={RPT_tdStyle}>{b.type}</td><td style={{...RPT_tdStyle,fontFamily:"monospace"}}>{b.currency}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{b.openingBal.toLocaleString("en-IN")}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(b.openingBal*rate)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:pct>80?"#A32D2D":"#0d1326",fontWeight:600}}>{pct}%</td></tr>);})}</tbody>
        </table></div>
      </div>
    </RPT_Page>
  );
}

/* 2. Inter-branch Elimination */

export function RPT_InterbranchElim(){
  const total=INTERBRANCH_ELIMINATIONS.reduce((s,t)=>s+t.amount,0);
  return (
    <RPT_Page title="Inter-branch Elimination Report" subtitle="Internal transactions eliminated in Travkings Group consolidation">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>Total Eliminated</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{fmtINR(total)}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>Transactions</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{INTERBRANCH_ELIMINATIONS.length}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>Avg Value</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{fmtINR(total/INTERBRANCH_ELIMINATIONS.length)}</p></div>
      </div>
      <div style={cardStyle}>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Voucher</th><th style={RPT_thStyle}>Date</th><th style={RPT_thStyle}>From</th><th style={RPT_thStyle}>To</th><th style={RPT_thStyle}>Ledger</th><th style={RPT_thStyle}>Nature</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th></tr></thead>
          <tbody>{INTERBRANCH_ELIMINATIONS.map(t=>(<tr key={t.voucher}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:600}}>{t.voucher}</td><td style={RPT_tdStyle}>{t.date}</td><td style={RPT_tdStyle}><span style={{padding:"2px 7px",background:"#e6e8f1",borderRadius:3,fontSize:10.5,fontWeight:700}}>{t.from}</span></td><td style={RPT_tdStyle}><span style={{padding:"2px 7px",background:"#e6e8f1",borderRadius:3,fontSize:10.5,fontWeight:700}}>{t.to}</span></td><td style={RPT_tdStyle}>{t.ledger}</td><td style={{...RPT_tdStyle,color:"#5a6691",fontSize:11}}>{t.nature}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(t.amount)}</td></tr>))}
          <tr style={{background:"#0d1326",color:"#d4a437"}}><td colSpan={6} style={{padding:"10px 12px",fontWeight:700,letterSpacing:"0.3px"}}>TOTAL ELIMINATIONS</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,fontSize:13}}>{fmtINR(total)}</td></tr></tbody>
        </table></div>
      </div>
    </RPT_Page>
  );
}

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
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <input placeholder="Search description..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:"1 1 250px",padding:"8px 11px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12}}/>
        <select value={filterUser} onChange={e=>setFilterUser(e.target.value)} style={{padding:"8px 11px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,background:"#fff"}}><option value="ALL">All users</option>{users.map(u=><option key={u} value={u}>{u}</option>)}</select>
        <select value={filterAction} onChange={e=>setFilterAction(e.target.value)} style={{padding:"8px 11px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,background:"#fff"}}><option value="ALL">All actions</option>{actions.map(a=><option key={a} value={a}>{a}</option>)}</select>
      </div>
      <div style={cardStyle}>
        <p style={{margin:0,fontSize:11,color:"#5a6691",marginBottom:10}}>{filtered.length} entries</p>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Timestamp</th><th style={RPT_thStyle}>User</th><th style={RPT_thStyle}>Branch</th><th style={RPT_thStyle}>Action</th><th style={RPT_thStyle}>Module</th><th style={RPT_thStyle}>Description</th><th style={RPT_thStyle}>IP Address</th></tr></thead>
          <tbody>{filtered.map((a,i)=>(<tr key={i}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5,color:"#5a6691"}}>{a.ts}</td><td style={{...RPT_tdStyle,fontWeight:600}}>{a.user}</td><td style={RPT_tdStyle}><span style={{padding:"2px 6px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{a.branch}</span></td><td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:colorOf(a.action)+"22",color:colorOf(a.action),borderRadius:3,fontSize:10,fontWeight:700,letterSpacing:"0.3px"}}>{a.action}</span></td><td style={{...RPT_tdStyle,fontSize:11}}>{a.module}</td><td style={{...RPT_tdStyle,fontSize:11}}>{a.desc}</td><td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10,color:"#5a6691"}}>{a.ip}</td></tr>))}</tbody>
        </table></div>
      </div>
    </RPT_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PROFITABILITY REPORTS (6)
   ════════════════════════════════════════════════════════════════════ */

/* 5. Yield per Destination */

export function RPT_YieldDestination(){
  const sorted=[...YIELD_BY_DESTINATION].sort((a,b)=>b.revenue-a.revenue);
  const totalRev=sorted.reduce((s,d)=>s+d.revenue,0);
  const totalGP=sorted.reduce((s,d)=>s+d.gp,0);
  return (
    <RPT_Page title="Yield by Destination" subtitle="Margin % by destination · FY 2025-26">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Total Revenue</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{fmtINR(totalRev)}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Total GP</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#22c55e"}}>{fmtINR(totalGP)}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Avg GP %</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{(totalGP/totalRev*100).toFixed(1)}%</p></div>
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
          <thead><tr><th style={RPT_thStyle}>Destination</th><th style={RPT_thStyle}>Country</th><th style={{...RPT_thStyle,textAlign:"right"}}>Bookings</th><th style={{...RPT_thStyle,textAlign:"right"}}>Revenue</th><th style={{...RPT_thStyle,textAlign:"right"}}>Cost</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP %</th></tr></thead>
          <tbody>{sorted.map(d=>(<tr key={d.destination}><td style={{...RPT_tdStyle,fontWeight:600}}>{d.destination}</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>{d.country}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{d.bookings}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(d.revenue)}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{fmtINR(d.cost)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e",fontWeight:700}}>{fmtINR(d.gp)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:d.gpPct>=25?"#22c55e":d.gpPct>=18?"#d4a437":"#A32D2D"}}>{d.gpPct.toFixed(1)}%</td></tr>))}</tbody>
        </table>
      </div>
    </RPT_Page>
  );
}

/* 6. Yield per Consultant */

export function RPT_YieldConsultant(){
  return (
    <RPT_Page title="Yield by Consultant" subtitle="Margin earned per consultant · FY 2025-26">
      <div style={cardStyle}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={YIELD_BY_CONSULTANT} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7"/>
            <XAxis type="number" tick={{fontSize:10,fill:"#5a6691"}} tickFormatter={v=>(v/100000).toFixed(0)+"L"}/>
            <YAxis dataKey="consultant" type="category" tick={{fontSize:11,fill:"#0d1326"}} width={80}/>
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
          <tbody>{YIELD_BY_CONSULTANT.map(c=>(<tr key={c.consultant}><td style={{...RPT_tdStyle,fontWeight:700}}>{c.consultant}</td><td style={RPT_tdStyle}><span style={{padding:"2px 6px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{c.branch}</span></td><td style={{...RPT_tdStyle,textAlign:"right"}}>{c.bookings}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(c.revenue)}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{fmtINR(c.avgBookingValue)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e",fontWeight:700}}>{fmtINR(c.gp)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:c.gpPct>=25?"#22c55e":c.gpPct>=18?"#d4a437":"#A32D2D"}}>{c.gpPct.toFixed(1)}%</td></tr>))}</tbody>
        </table>
      </div>
    </RPT_Page>
  );
}

/* 7. Yield per Supplier */

export function RPT_YieldSupplier(){
  const totalExp=YIELD_BY_SUPPLIER.reduce((s,x)=>s+x.expectedCost,0);
  const totalAct=YIELD_BY_SUPPLIER.reduce((s,x)=>s+x.actualCost,0);
  return (
    <RPT_Page title="Yield by Supplier — Cost Variance" subtitle="Expected vs actual cost per supplier · variance tracking">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Expected Cost</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{fmtINR(totalExp)}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Actual Cost</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{fmtINR(totalAct)}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Net Variance</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:totalAct>totalExp?"#A32D2D":"#22c55e"}}>{fmtINR(Math.abs(totalAct-totalExp))} {totalAct>totalExp?"over":"under"}</p></div>
      </div>
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Supplier</th><th style={RPT_thStyle}>Category</th><th style={{...RPT_thStyle,textAlign:"right"}}>Expected</th><th style={{...RPT_thStyle,textAlign:"right"}}>Actual</th><th style={{...RPT_thStyle,textAlign:"right"}}>Variance</th><th style={{...RPT_thStyle,textAlign:"right"}}>Var %</th><th style={{...RPT_thStyle,textAlign:"center"}}>Reliability</th></tr></thead>
          <tbody>{YIELD_BY_SUPPLIER.map(s=>(<tr key={s.supplier}><td style={{...RPT_tdStyle,fontWeight:600}}>{s.supplier}</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>{s.category}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{fmtINR(s.expectedCost)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(s.actualCost)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:s.variance>0?"#A32D2D":s.variance<0?"#22c55e":"#5a6691",fontWeight:700}}>{s.variance>=0?"+":""}{fmtINR(Math.abs(s.variance))}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:s.variancePct>5?"#A32D2D":s.variancePct>2?"#f97316":"#22c55e"}}>{s.variancePct>=0?"+":""}{s.variancePct.toFixed(1)}%</td><td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:700,background:s.reliability==="Excellent"?"#d4edda":s.reliability==="Good"?"#fff3cd":"#f8d7da",color:s.reliability==="Excellent"?"#155724":s.reliability==="Good"?"#856404":"#721c24"}}>{s.reliability}</span></td></tr>))}</tbody>
        </table>
      </div>
    </RPT_Page>
  );
}

/* 8. YoY Comparison */

export function RPT_YoY(){
  return (
    <RPT_Page title="Year-over-Year Comparison" subtitle="FY 2025-26 vs FY 2024-25 · every P&L line">
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr><th style={RPT_thStyle}>Particulars</th><th style={{...RPT_thStyle,textAlign:"right"}}>FY 2025-26</th><th style={{...RPT_thStyle,textAlign:"right"}}>FY 2024-25</th><th style={{...RPT_thStyle,textAlign:"right"}}>Variance</th><th style={{...RPT_thStyle,textAlign:"right"}}>%Δ</th></tr></thead>
          <tbody>{YOY_PL.map((l,i)=>{const variance=l.cy-l.ly;const pct=l.ly!==0?variance/Math.abs(l.ly)*100:0;return (<tr key={i} style={l.bold?{background:"#fafbfd",fontWeight:700}:{}}><td style={{...RPT_tdStyle,fontWeight:l.bold?700:400,fontSize:l.bold?12.5:12}}>{l.line}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",fontWeight:l.bold?700:500}}>{fmtINR(l.cy)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:"#5a6691"}}>{fmtINR(l.ly)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:variance>=0?(l.group==="Costs"?"#A32D2D":"#22c55e"):(l.group==="Costs"?"#22c55e":"#A32D2D"),fontWeight:700}}>{variance>=0?"+":""}{fmtINR(Math.abs(variance))}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:pct>=0?(l.group==="Costs"?"#A32D2D":"#22c55e"):(l.group==="Costs"?"#22c55e":"#A32D2D")}}>{pct>=0?"+":""}{pct.toFixed(1)}%</td></tr>);})}</tbody>
        </table>
      </div>
    </RPT_Page>
  );
}

/* 9. Customer LTV */

export function RPT_CustomerLTV(){
  const sorted=[...CUSTOMER_LTV_DATA].sort((a,b)=>b.ltv-a.ltv);
  return (
    <RPT_Page title="Customer Lifetime Value (LTV)" subtitle="Cumulative value per customer · retention &amp; recency tracking">
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Customer</th><th style={RPT_thStyle}>First Booking</th><th style={RPT_thStyle}>Last Booking</th><th style={{...RPT_thStyle,textAlign:"right"}}>Bookings</th><th style={{...RPT_thStyle,textAlign:"right"}}>LTV</th><th style={{...RPT_thStyle,textAlign:"right"}}>Avg Basket</th><th style={{...RPT_thStyle,textAlign:"center"}}>Active</th><th style={{...RPT_thStyle,textAlign:"center"}}>Recency</th></tr></thead>
          <tbody>{sorted.map(c=>(<tr key={c.name}><td style={{...RPT_tdStyle,fontWeight:600}}>{c.name}</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>{c.firstBooking}</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>{c.lastBooking}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{c.totalBookings}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(c.ltv)}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{fmtINR(c.avgBasket)}</td><td style={{...RPT_tdStyle,textAlign:"center"}}>{c.monthsActive}m</td><td style={{...RPT_tdStyle,textAlign:"center",color:c.recencyDays<=30?"#22c55e":c.recencyDays<=90?"#d4a437":"#A32D2D",fontWeight:700}}>{c.recencyDays}d ago</td></tr>))}</tbody>
        </table>
      </div>
    </RPT_Page>
  );
}

/* 10. ABC Analysis */

export function RPT_ABCAnalysis(){
  const [dim,setDim]=useState("customers");
  const data=dim==="customers"?abcOf(CUSTOMER_LTV_DATA,"ltv"):dim==="suppliers"?abcOf(TOP_SUPPLIERS_DATA,"spend"):abcOf(YIELD_BY_DESTINATION,"revenue");
  const grp={A:data.filter(d=>d.class==="A"),B:data.filter(d=>d.class==="B"),C:data.filter(d=>d.class==="C")};
  const grpStyle=cls=>({background:cls==="A"?"#fae7ad":cls==="B"?"#cfe2ff":"#e2e3e5",color:cls==="A"?"#664700":cls==="B"?"#004085":"#383d41"});
  return (
    <RPT_Page title="ABC Analysis (Pareto)"
      subtitle="80/15/5 split based on contribution to value"
      toolbar={<select value={dim} onChange={e=>setDim(e.target.value)} style={{padding:"7px 11px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:11.5,background:"#fff"}}><option value="customers">By Customer (LTV)</option><option value="suppliers">By Supplier (Spend)</option><option value="destinations">By Destination (Revenue)</option></select>}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {["A","B","C"].map(c=>{const total=grp[c].reduce((s,x)=>s+(x.ltv||x.spend||x.revenue),0);const grandTotal=data.reduce((s,x)=>s+(x.ltv||x.spend||x.revenue),0);const sharePct=(total/grandTotal*100).toFixed(1);return (<div key={c} style={{...cardStyle,borderTop:"4px solid "+(c==="A"?"#d4a437":c==="B"?"#3b82f6":"#5a6691")}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{padding:"4px 10px",borderRadius:4,fontSize:13,fontWeight:700,letterSpacing:"0.5px",...grpStyle(c)}}>CLASS {c}</span><span style={{fontSize:11,color:"#5a6691"}}>{grp[c].length} items · {sharePct}% of total</span></div><p style={{margin:0,fontSize:22,fontWeight:700,color:"#0d1326"}}>{fmtINR(total)}</p><p style={{margin:"3px 0 0",fontSize:10.5,color:"#5a6691"}}>{c==="A"?"Top contributors — focus & nurture":c==="B"?"Mid-tier — opportunity to grow":"Long tail — automate / rationalise"}</p></div>);})}
      </div>
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Rank</th><th style={RPT_thStyle}>Name</th><th style={{...RPT_thStyle,textAlign:"right"}}>Value</th><th style={{...RPT_thStyle,textAlign:"right"}}>Share</th><th style={{...RPT_thStyle,textAlign:"right"}}>Cumulative</th><th style={{...RPT_thStyle,textAlign:"center"}}>Class</th></tr></thead>
          <tbody>{data.map((d,i)=>{const val=d.ltv||d.spend||d.revenue;return (<tr key={d.name||d.destination}><td style={{...RPT_tdStyle,color:"#5a6691"}}>{i+1}</td><td style={{...RPT_tdStyle,fontWeight:600}}>{d.name||d.destination}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(val)}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{d.share}%</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{d.cumPct}%</td><td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 9px",borderRadius:3,fontSize:10.5,fontWeight:700,letterSpacing:"0.3px",...grpStyle(d.class)}}>{d.class}</span></td></tr>);})}</tbody>
        </table>
      </div>
    </RPT_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   HR REPORTS (3)
   ════════════════════════════════════════════════════════════════════ */

/* 11. Attrition Rate */

export function RPT_Attrition(){
  const ttlJoiners=ATTRITION_DATA.reduce((s,m)=>s+m.joiners,0);
  const ttlLeavers=ATTRITION_DATA.reduce((s,m)=>s+m.leavers,0);
  const avgHc=ATTRITION_DATA.reduce((s,m)=>s+m.closingHc,0)/ATTRITION_DATA.length;
  const annualAttrition=(ttlLeavers/avgHc*100).toFixed(1);
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
  return (
    <RPT_Page title="Leave Utilization Report" subtitle="% of entitlement used per employee · current FY">
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Employee</th><th style={RPT_thStyle}>Branch</th><th style={{...RPT_thStyle,textAlign:"right"}}>Entitled</th><th style={{...RPT_thStyle,textAlign:"right"}}>Used</th><th style={{...RPT_thStyle,textAlign:"right"}}>Balance</th><th style={{...RPT_thStyle,textAlign:"right"}}>CL</th><th style={{...RPT_thStyle,textAlign:"right"}}>SL</th><th style={{...RPT_thStyle,textAlign:"right"}}>EL</th><th style={{...RPT_thStyle,textAlign:"center"}}>Utilization</th></tr></thead>
          <tbody>{LEAVE_UTILIZATION.map(l=>(<tr key={l.empId}><td style={{...RPT_tdStyle,fontWeight:600}}>{l.name}</td><td style={RPT_tdStyle}><span style={{padding:"2px 6px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{l.branch}</span></td><td style={{...RPT_tdStyle,textAlign:"right"}}>{l.entitled}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{l.used}</td><td style={{...RPT_tdStyle,textAlign:"right",color:l.balance<5?"#A32D2D":"#0d1326"}}>{l.balance}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{l.casual}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{l.sick}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{l.earned}</td><td style={{padding:"6px 12px",borderBottom:"1px solid #f0f2f7"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{flex:1,height:6,background:"#f0f2f7",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:l.utilPct+"%",background:l.utilPct>75?"#A32D2D":l.utilPct>50?"#d4a437":"#22c55e",borderRadius:3}}/></div><span style={{fontSize:10.5,fontWeight:700,color:l.utilPct>75?"#A32D2D":"#0d1326",minWidth:36,textAlign:"right"}}>{l.utilPct.toFixed(0)}%</span></div></td></tr>))}</tbody>
        </table>
      </div>
    </RPT_Page>
  );
}

/* 13. Birthday & Anniversary Calendar */

export function RPT_BirthdayCalendar(){
  return (
    <RPT_Page title="Birthday &amp; Anniversary Calendar" subtitle="Engagement events for HR &amp; team celebrations">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:14,fontWeight:700,color:"#0d1326",marginBottom:12}}>🎂 Upcoming Birthdays</p>
          {HR_STATS_DATA.birthdays.length===0&&<p style={{color:"#5a6691",fontSize:12}}>No birthdays in the next 7 days</p>}
          {HR_STATS_DATA.birthdays.map(b=>(<div key={b.name} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #f0f2f7"}}><div style={{width:44,height:44,borderRadius:"50%",background:"#d4a437",display:"flex",alignItems:"center",justifyContent:"center",color:"#0d1326",fontSize:14,fontWeight:700}}>{b.name.substring(0,2).toUpperCase()}</div><div style={{flex:1}}><p style={{margin:0,fontSize:13,color:"#0d1326",fontWeight:700}}>{b.name}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>{b.branch} · {b.date}</p></div><button style={{padding:"5px 12px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:4,fontSize:11,fontWeight:700,cursor:"pointer"}}>Send wish</button></div>))}
        </div>
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:14,fontWeight:700,color:"#0d1326",marginBottom:12}}>🎉 Work Anniversaries</p>
          {HR_STATS_DATA.anniversaries.map(a=>(<div key={a.name} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #f0f2f7"}}><div style={{width:44,height:44,borderRadius:"50%",background:"#6B4C8B",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,fontWeight:700}}>{a.years}</div><div style={{flex:1}}><p style={{margin:0,fontSize:13,color:"#0d1326",fontWeight:700}}>{a.name}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>{a.branch} · {a.years} year{a.years!==1?"s":""} on {a.date}</p></div><button style={{padding:"5px 12px",background:"#6B4C8B",color:"#fff",border:"none",borderRadius:4,fontSize:11,fontWeight:700,cursor:"pointer"}}>Acknowledge</button></div>))}
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
  const overdue=STATUTORY_DUES.filter(d=>d.status==="Overdue");
  const pending=STATUTORY_DUES.filter(d=>d.status==="Pending");
  const upcoming=STATUTORY_DUES.filter(d=>d.status==="Upcoming");
  return (
    <RPT_Page title="Statutory Dues Calendar" subtitle="All compliance dates · filing status &amp; reminders">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Overdue</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#A32D2D"}}>{overdue.length}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Pending</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#f97316"}}>{pending.length}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Upcoming</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#d4a437"}}>{upcoming.length}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Total Due Value</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{fmtINR(STATUTORY_DUES.reduce((s,d)=>s+d.amount,0))}</p></div>
      </div>
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Due Date</th><th style={RPT_thStyle}>Authority</th><th style={RPT_thStyle}>Filing</th><th style={RPT_thStyle}>Entity</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th><th style={{...RPT_thStyle,textAlign:"center"}}>Days Left</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
          <tbody>{STATUTORY_DUES.map((d,i)=>(<tr key={i}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:600}}>{d.due}</td><td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700,color:"#0d1326"}}>{d.authority}</span></td><td style={{...RPT_tdStyle,fontWeight:600}}>{d.filing}</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>{d.entity}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{d.amount>0?fmtINR(d.amount):"—"}</td><td style={{...RPT_tdStyle,textAlign:"center",fontWeight:700,color:d.daysLeft<=0?"#A32D2D":d.daysLeft<=7?"#f97316":d.daysLeft<=30?"#d4a437":"#5a6691"}}>{d.daysLeft<=0?"DUE NOW":d.daysLeft+"d"}</td><td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"3px 10px",borderRadius:3,fontSize:10,fontWeight:700,letterSpacing:"0.3px",background:d.status==="Filed"?"#d4edda":d.status==="Pending"?"#f8d7da":d.status==="Upcoming"?"#fff3cd":"#f8d7da",color:d.status==="Filed"?"#155724":d.status==="Pending"?"#721c24":d.status==="Upcoming"?"#856404":"#721c24"}}>{d.status}</span></td></tr>))}</tbody>
        </table>
      </div>
    </RPT_Page>
  );
}

/* 15. Tax Filing Status Board */

export function RPT_TaxFilingBoard(){
  const allTaxes=[...new Set(TAX_FILING_BOARD.flatMap(e=>Object.keys(e.taxes)))];
  return (
    <RPT_Page title="Tax Filing Status Board" subtitle="GSTR / TDS / VAT / WHT / Income Tax — all entities at a glance">
      <div style={cardStyle}>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={{...RPT_thStyle,minWidth:180}}>Entity</th>{allTaxes.map(t=><th key={t} style={{...RPT_thStyle,textAlign:"center",minWidth:100}}>{t}</th>)}</tr></thead>
          <tbody>{TAX_FILING_BOARD.map(e=>(<tr key={e.entity}><td style={{...RPT_tdStyle,fontWeight:700}}>{e.entity}</td>{allTaxes.map(t=>{const tax=e.taxes[t];if(!tax) return <td key={t} style={{...RPT_tdStyle,textAlign:"center",color:"#cbd0dc"}}>—</td>;return (<td key={t} style={{padding:"8px 6px",textAlign:"center",borderBottom:"1px solid #f0f2f7"}}><span style={{display:"inline-block",padding:"3px 10px",borderRadius:3,fontSize:10,fontWeight:700,letterSpacing:"0.3px",background:tax.status==="Filed"?"#d4edda":"#f8d7da",color:tax.status==="Filed"?"#155724":"#721c24"}}>{tax.status==="Filed"?"✓ Filed":"○ Pending"}</span>{tax.date!=="—"&&<p style={{margin:"3px 0 0",fontSize:9,color:"#5a6691",fontFamily:"monospace"}}>{tax.date}</p>}</td>);})}</tr>))}</tbody>
        </table></div>
      </div>
    </RPT_Page>
  );
}

/* 16. Currency Exposure */

export function RPT_CurrencyExposure(){
  const totalUnhedged=FX_EXPOSURE.reduce((s,c)=>s+c.unhedgedINR,0);
  return (
    <RPT_Page title="Currency Exposure Report" subtitle="Open positions per currency · hedged vs unhedged · INR equivalent at-risk">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Currencies in Use</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{FX_EXPOSURE.length}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Total Unhedged INR Eq.</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#A32D2D"}}>{fmtINR(totalUnhedged)}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Hedge Coverage</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#d4a437"}}>{((FX_EXPOSURE.reduce((s,c)=>s+c.hedged,0)/FX_EXPOSURE.reduce((s,c)=>s+c.netExposure,0))*100).toFixed(0)}%</p></div>
      </div>
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Currency</th><th style={{...RPT_thStyle,textAlign:"right"}}>Receivables</th><th style={{...RPT_thStyle,textAlign:"right"}}>Payables</th><th style={{...RPT_thStyle,textAlign:"right"}}>Cash Held</th><th style={{...RPT_thStyle,textAlign:"right"}}>Net Exposure</th><th style={{...RPT_thStyle,textAlign:"right"}}>Hedged</th><th style={{...RPT_thStyle,textAlign:"right"}}>Unhedged</th><th style={{...RPT_thStyle,textAlign:"right"}}>Unhedged INR Eq</th><th style={{...RPT_thStyle,textAlign:"center"}}>Risk</th></tr></thead>
          <tbody>{FX_EXPOSURE.map(c=>{const hedgePct=c.netExposure>0?c.hedged/c.netExposure*100:100;const risk=hedgePct>=80?"Low":hedgePct>=40?"Medium":"High";return (<tr key={c.currency}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:700}}>{c.currency}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{c.receivables.toLocaleString("en-IN")}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{c.payables.toLocaleString("en-IN")}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{c.cashHeld.toLocaleString("en-IN")}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",fontWeight:700}}>{c.netExposure.toLocaleString("en-IN")}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:"#22c55e"}}>{c.hedged.toLocaleString("en-IN")}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:"#A32D2D",fontWeight:700}}>{c.unhedged.toLocaleString("en-IN")}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#A32D2D"}}>{fmtINR(c.unhedgedINR)}</td><td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"3px 10px",borderRadius:3,fontSize:10,fontWeight:700,background:risk==="Low"?"#d4edda":risk==="Medium"?"#fff3cd":"#f8d7da",color:risk==="Low"?"#155724":risk==="Medium"?"#856404":"#721c24"}}>{risk}</span></td></tr>);})}</tbody>
        </table>
      </div>
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
  borderBottom: active?"3px solid #d4a437":"3px solid transparent",
  background:"transparent",
  color: active?"#0d1326":"#5a6691",
  fontWeight: active?700:500,
  fontSize:12.5,cursor:"pointer",whiteSpace:"nowrap"
});


export const inpStd = {padding:8,width:"100%",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,boxSizing:"border-box"};

/* ════════════════════════════════════════════════════════════════════
   1. CUSTOMER MASTER (12 tabs) — L&T Limited demo
   ════════════════════════════════════════════════════════════════════ */

