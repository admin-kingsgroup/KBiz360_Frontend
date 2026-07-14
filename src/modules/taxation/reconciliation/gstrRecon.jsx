/* BUSINESS SUB-MODULE REORG (2026-07-14): moved out of taxation/legacy.jsx into
   its business sub-module folder — Taxation Reconciliation group (href /tax/gstr2b).
   taxation/index.js re-exports GstrRecon from here so App.jsx's barrel import
   needed zero changes. */

import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Calendar, ChevronDown, Download, Plus, Settings, Users } from 'lucide-react';
import { Menu as DropdownMenu } from '../../../core/ux/Menu';
import { useGpBills, useRcmLiability, useProfitAndLoss, useTaxSummary, useConfigValue, useSaveConfigValue } from '../../../core/useAccounting';
import { useTaxCalendar } from '../../../core/useReference';
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

export function GstrRecon({branch}){
  const brCode=branch==="ALL"?null:(branch?.code||null);   // null = consolidated (all branches)
  const [period,setPeriod]=useState(CUR_MONTH);
  const PERIODS=MONTH_OPTIONS;

  /* A TRUE GSTR-2B reconciliation needs the taxpayer's DOWNLOADED 2B JSON imported,
     which the ERP doesn't yet hold. So we do NOT fabricate the 2B side (the old code
     simulated a 1-in-3 mismatch and raised a bogus "reverse ITC before filing"
     warning off invented numbers). The books-side ITC below is a real estimate from
     posted purchase bills; the 2B column stays blank until a 2B import lands. */
  const GP=useGpBills(branch).data||[];   // live booking bills (/api/accounting/gp-bills)
  const bills=GP.filter(b=>(!brCode||b.branch===brCode)&&(b.date||'').startsWith(period)&&(+b.cost||0)>0);
  const recon=bills.map((b)=>({
    supplier:b.supplier||'—', gstin:'—', invoiceNo:b.id, period:b.date,
    itcBooks:Math.round((+b.cost||0)/(1+0.18)*0.18), gstr2bAmt:null, diff:null,
    status:'2B not imported',
  }));
  const itcBooksTotal=recon.reduce((s,r)=>s+r.itcBooks,0);
  const f=n=>"₹"+Number(Math.round(n||0)).toLocaleString("en-IN");

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔄</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>GSTR-2B Reconciliation</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{brCode||"All branches"} ·ITC in books vs ITC available in GSTR-2B · {PERIODS.find(p=>p.v===period)?.l}</p>
          </div>
        </div>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
      </div>

      <div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:10.5,color:"#854F0B",fontWeight:600,display:"flex",gap:8}}>
        <AlertTriangle size={15}/> GSTR-2B is not yet imported, so this is NOT a reconciliation — the “ITC in 2B” / difference / match columns are blank. The “ITC in books” below is an estimate from posted purchase bills. Import the downloaded 2B JSON to reconcile.
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[{l:"Purchase Bills (period)",v:String(recon.length),c:"#384677",bg:"#f3f4f8"},
          {l:"ITC in Books (est.)",v:f(itcBooksTotal),c:"#27500A",bg:"#EAF3DE"},
          {l:"ITC in GSTR-2B",v:"— import 2B",c:"#5a6691",bg:"#f3f4f8"},
          {l:"Reconciliation",v:"Pending 2B import",c:"#854F0B",bg:"#FAEEDA"},
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
            {["Supplier","GSTIN","Invoice Ref","Date","ITC in Books","ITC in GSTR-2B","Difference","Status","Action"].map((h,i)=>(
              <th key={i} style={{padding:"9px 11px",textAlign:i>=4&&i<=6?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{recon.map((r,i)=>(
            <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:r.status!=="Matched"?"#fff9f0":i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 11px",fontWeight:600,color:"#0d1326"}}>{r.supplier}</td>
              <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:9.5,color:"#5a6691"}}>{r.gstin}</td>
              <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:9.5,color:"#185FA5"}}>{r.invoiceNo}</td>
              <td style={{padding:"8px 11px",color:"#5a6691"}}>{r.period}</td>
              <td style={{padding:"8px 11px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(r.itcBooks)}</td>
              <td style={{padding:"8px 11px",textAlign:"right",color:"#5a6691"}}>—</td>
              <td style={{padding:"8px 11px",textAlign:"right",color:"#5a6691"}}>—</td>
              <td style={{padding:"8px 11px"}}>
                <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:"#f3f4f8",color:"#5a6691"}}>{r.status}</span>
              </td>
              <td style={{padding:"8px 11px",color:"#5a6691",fontSize:9.5}}>—</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{marginTop:12,...card,background:"#E6F1FB",border:"1px solid #B5D4F4",fontSize:10,color:"#185FA5"}}>
        GSTR-2B is auto-populated from suppliers' GSTR-1. ITC can only be claimed to the extent visible in GSTR-2B. Excess claims create audit risk and must be reversed in GSTR-3B Table 4(B)(2) before filing.
      </div>
    </div>
  );
}

/* ── ITEM 14: TDS CERTIFICATE REGISTER  /tax/tds-certs ────────── */

