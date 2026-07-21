/* BUSINESS SUB-MODULE REORG (2026-07-14): moved out of taxation/legacy.jsx into
   its business sub-module folder — Taxation GST Returns group (href /tax/gstr3b).
   taxation/index.js re-exports TaxGstr3b from here so App.jsx's barrel import
   needed zero changes. */

import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Calendar, ChevronDown, Download, Plus, Settings, Users } from 'lucide-react';
import { Menu as DropdownMenu } from '../../../core/ux/Menu';
import { useGpBills, useRcmLiability, useProfitAndLoss, useTaxSummary, useConfigValue, useSaveConfigValue } from '../../../core/useAccounting';
import { useTaxCalendar } from '../../../core/useReference';
import { isVatBranch } from '../../../core/voucherSpecs';
import { useMasterMutations } from '../../../core/useMasters';
import { toast } from '../../../core/ux/toast';
import { CUR_MONTH, MONTH_OPTIONS, monthLabel, monthLabelLong, todayISO, CUR_FY, fyOptions, fyRange, rangeNote } from '../../../core/dates';
import { fmt, fmtINR } from '../../../core/format';
import { _TCS_ENTRIES, _TDS_ENTRIES, cardStyle } from '../../../core/helpers';
import { useTdsLedgerStatements, tdsAccrualEntries, tdsReliefTotal, taxableOf, gstOf, saleBills, fyQuarterOfISO } from '../taxLive';
import { useMobile } from '../../../core/hooks';
import { useModalEsc } from '../../../core/ux/useModalEsc';
import { clickable } from '../../../core/ux/clickable';
import { listKeyNav } from '../../../core/ux/listKeys';
import { B, FL, RPT_tdStyle, RPT_thStyle, bc, btnG, btnGh, card, inp, tabBtnStyle } from '../../../core/styles';
import { MiniBar, share, pctText } from '../../../core/insightsUI';
import { TDS_SECTIONS } from '../../../core/taxSections';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';
import { openPrintPreview } from '../../../core/PrintPreview';
import { SampleBanner } from '../../../core/ux/SampleBanner';

export function TaxGstr3b({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:(branch?.code||null);   // null = consolidated (all branches)
  const [period,setPeriod]=useState(CUR_MONTH);
  const PERIODS=MONTH_OPTIONS;

  const GP=useGpBills(branch).data||[];   // live booking bills (/api/accounting/gp-bills)
  // NOTE (needs-confirmation): gp-bills returns ONE row per booking file carrying both the
  // sale side (b.sell) and the supplier/purchase side (b.cost). There is no type/voucher-kind
  // field to split sale vs purchase rows, so `sales` and `purch` are intentionally the same set;
  // ITC below correctly draws from b.cost (purchase amount). If a dedicated purchase voucher
  // source is added later, repoint `purch` to it.
  // India GST return — EXCLUDE Africa/VAT branches (NBO/DAR/FBM): they book in USD and have their own
  // VAT Return, so at ALL/consolidated scope their bills must never enter an India ₹ GST recompute.
  const sales=GP.filter(b=>!isVatBranch(b.branch)&&(!brCode||b.branch===brCode)&&(b.date||'').startsWith(period));
  const purch=GP.filter(b=>!isVatBranch(b.branch)&&(!brCode||b.branch===brCode)&&(b.date||'').startsWith(period));
  const rcm=GP.filter(b=>!isVatBranch(b.branch)&&(!brCode||b.branch===brCode)&&(b.date||'').startsWith(period)&&(b.supplier||'').includes("BSP")); // GDS as RCM proxy

  const gstRate=mod=>mod==="Holiday"?5:18;
  const totOutward =sales.reduce((s,b)=>s+b.sell/(1+gstRate(b.mod)/100)*(gstRate(b.mod)/100),0);
  const totITC     =purch.reduce((s,b)=>s+b.cost/(1+0.18)*0.18*0.6,0); // 60% ITC eligible
  const totRCM     =rcm.reduce((s,b)=>s+b.cost/(1+0.18)*0.18*0.2,0);
  const netPayable =totOutward+totRCM-totITC;
  const cgst=netPayable/2;
  const sgst=netPayable/2;
  const f=n=>"₹"+Number(Math.round(Math.abs(n))).toLocaleString("en-IN");

  const rows=[
    {section:"3.1 — OUTWARD SUPPLIES",items:[
      {l:"(a) Taxable outward supplies",v:totOutward,note:"Sum of CGST+SGST on all B2B+B2C sales"},
      {l:"(d) Inward supplies under RCM",v:totRCM,note:"GDS charges from overseas suppliers"},
      {l:"Total Output Tax",v:totOutward+totRCM,bold:true},
    ]},
    {section:"4 — ELIGIBLE ITC",items:[
      {l:"(A) ITC available — Inputs",v:totITC,note:"60% of purchase GST (rest blocked — insurance, personal)"},
      {l:"(D) ITC reversal (Rule 42)",v:totITC*0.05,note:"5% reversal for exempt/non-business use"},
      {l:"Net ITC",v:totITC-totITC*0.05,bold:true},
    ]},
    {section:"TAX PAYABLE",items:[
      {l:"CGST payable",v:cgst,note:"Debit CGST electronic cash ledger"},
      {l:"SGST payable",v:sgst,note:"Debit SGST electronic cash ledger"},
      {l:"NET TAX PAYABLE",v:netPayable,bold:true},
    ]},
  ];

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>GSTR-3B — Monthly Summary</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{brCode||"All branches"} · {monthLabel(period)} · Due: 20th of following month</p>
          <p style={{margin:"3px 0 0",fontSize:11,color:"#185FA5",fontWeight:600}}>📅 {rangeNote('month',{month:period})} · use the period selector to change</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <DropdownMenu
            ariaLabel="Period"
            menuRole="listbox"
            items={PERIODS.map(p=>({key:p.v,label:p.l,selected:period===p.v,onSelect:()=>setPeriod(p.v)}))}
            renderTrigger={({ref,toggle,triggerProps})=>(
              <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                style={{...inp,width:"auto",minHeight:32,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                {PERIODS.find(p=>p.v===period)?.l||period}
                <ChevronDown size={13} style={{color:"#5b616e",flexShrink:0}}/>
              </button>
            )}
          />
          <button style={{...btnG,fontSize:11,background:"#A32D2D"}}>💳 Pay & File</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #A32D2D",padding:"11px 13px",background:"#FCEBEB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#A32D2D",textTransform:"uppercase"}}>Output GST</p><p style={{margin:"4px 0 0",fontSize:19,fontWeight:800,color:"#0d1326"}}>{f(totOutward+totRCM)}</p></div>
        <div style={{...card,borderTop:"3px solid #27500A",padding:"11px 13px",background:"#EAF3DE"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#27500A",textTransform:"uppercase"}}>Input ITC</p><p style={{margin:"4px 0 0",fontSize:19,fontWeight:800,color:"#0d1326"}}>{f(totITC)}</p></div>
        <div style={{...card,borderTop:`3px solid ${netPayable>0?"#A32D2D":"#27500A"}`,padding:"11px 13px",background:netPayable>0?"#FCEBEB":"#EAF3DE"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:netPayable>0?"#A32D2D":"#27500A",textTransform:"uppercase"}}>Net Payable</p><p style={{margin:"4px 0 0",fontSize:19,fontWeight:800,color:"#0d1326"}}>{f(netPayable)}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5",padding:"11px 13px",background:"#E6F1FB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#185FA5",textTransform:"uppercase"}}>CGST</p><p style={{margin:"4px 0 0",fontSize:19,fontWeight:800,color:"#0d1326"}}>{f(cgst)}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5",padding:"11px 13px",background:"#E6F1FB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#185FA5",textTransform:"uppercase"}}>SGST</p><p style={{margin:"4px 0 0",fontSize:19,fontWeight:800,color:"#0d1326"}}>{f(sgst)}</p></div>
      </div>
      {rows.map((sec,si)=>{
        const secTotal=sec.items.find(x=>x.bold)?.v||sec.items.reduce((s,x)=>s+(x.v||0),0);
        return (
        <div key={si} style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"9px 14px",background:"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#384677"}}>{sec.section}</p>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <tbody>{sec.items.map((r,ri)=>(
              <tr key={ri} style={{borderBottom:"1px solid #dfe2e7",background:r.bold?"#f9fafb":"#fff"}}>
                <td style={{padding:"9px 14px",fontWeight:r.bold?700:400,color:"#0d1326"}}>{r.l}</td>
                <td style={{padding:"9px 14px",fontSize:10,color:"#5a6691"}}>{r.note||""}</td>
                <td style={{padding:"9px 14px",textAlign:"right",fontWeight:r.bold?800:500,
                  fontVariantNumeric:"tabular-nums",color:r.bold?"#A32D2D":"#384677",
                  fontSize:r.bold?13:11.5}}>₹{Number(Math.round(r.v)).toLocaleString("en-IN")}</td>
                <td style={{padding:"9px 14px",width:160}}>{!r.bold&&secTotal?(
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:10,color:"#5a6691",width:38,textAlign:"right",flexShrink:0,fontVariantNumeric:"tabular-nums"}}>{pctText(share(r.v,secTotal))}</span>
                    <div style={{flex:1,minWidth:30}}><MiniBar pct={share(r.v,secTotal)} tone="cogs"/></div>
                  </div>
                ):null}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        );
      })}
      <div style={{...card,background:"#E6F1FB",border:"1px solid #B5D4F4",fontSize:10,color:"#185FA5"}}>
        Interest 18% p.a. if payment is late. Penalty ₹50/day per return (CGST+SGST) for late filing.
        Ensure GSTR-1 is filed before GSTR-3B so buyers&apos; ITC is auto-populated in their GSTR-2B.
      </div>
    </div>
  );
}
/* TaxTdsTcs — see rebuilt version below */

