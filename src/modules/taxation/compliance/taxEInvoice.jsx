/* BUSINESS SUB-MODULE REORG (2026-07-14): moved out of taxation/legacy.jsx into
   its business sub-module folder — Taxation Compliance group (href /tax/einvoice).
   taxation/index.js re-exports TaxEInvoice from here so App.jsx's barrel import
   needed zero changes. TaxShell (the shared header/subtitle shell) is exclusive
   to this screen and moved with it.
   */

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

export function TaxShell({title,subtitle,children,action}){
  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div>
          <p style={{margin:0,fontSize:9.5,color:"#5a6691",letterSpacing:"0.5px",textTransform:"uppercase"}}>Taxation</p>
          <h1 style={{margin:"3px 0 0",fontSize:21,fontWeight:700,color:"#0d1326",letterSpacing:"-0.02em"}}>{title}</h1>
          {subtitle&&<p style={{margin:"2px 0 0",fontSize:11,color:"#5a6691"}}>{subtitle}</p>}
        </div>
        {action||<button style={{...btnG,display:"flex",alignItems:"center",gap:5}}><Download size={13}/> Export</button>}
      </div>
      {children}
    </div>
  );
}

/* ── GSTR-1 ──────────────────────────────────────────────── */


const GSP_NOTE = 'Awaiting GSP/IRP provider credentials — configure under Settings ▸ GSP-IRP';

export function TaxEInvoice({branch}){
  const brCode=branch==="ALL"?null:(branch?.code||null);   // null = consolidated (all branches)
  const [period,setPeriod]=useState(CUR_MONTH);
  const GP=useGpBills(branch).data||[];   // live booking bills (/api/accounting/gp-bills) — same source as GSTR-1
  const bills=saleBills(GP,brCode,{from:`${period}-01`,to:`${period}-31`});
  const totTaxable=bills.reduce((s,b)=>s+taxableOf(b),0);
  const totGST=bills.reduce((s,b)=>s+gstOf(b),0);
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  return (
    <TaxShell title="E-Invoice &amp; IRN Log" subtitle={`${brCode||"All branches"} · ${monthLabel(period)} · live sale invoices from the books`}
      action={<div style={{display:"flex",gap:8,alignItems:"center"}}>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {MONTH_OPTIONS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
        <button disabled title={GSP_NOTE} aria-disabled="true" style={{...btnG,fontSize:11,opacity:0.5,cursor:"not-allowed"}}>⚡ Generate IRN</button>
      </div>}>
      <div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:10.5,color:"#854F0B",fontWeight:600}}>
        🔌 {GSP_NOTE}. The invoices below are live from the books — IRN &amp; Ack. numbers fill in once the provider is connected.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        <div style={{background:"#f3f4f8",borderRadius:9,padding:"9px 13px"}}><p style={{margin:0,fontSize:9.5,color:"#384677",fontWeight:600,textTransform:"uppercase"}}>E-invoice candidates</p><p style={{margin:"2px 0 0",fontSize:16,fontWeight:700,color:"#384677"}}>{bills.length}</p></div>
        <div style={{background:"#E6F1FB",borderRadius:9,padding:"9px 13px"}}><p style={{margin:0,fontSize:9.5,color:"#185FA5",fontWeight:600,textTransform:"uppercase"}}>Taxable value</p><p style={{margin:"2px 0 0",fontSize:16,fontWeight:700,color:"#185FA5"}}>{f(totTaxable)}</p></div>
        <div style={{background:"#FCEBEB",borderRadius:9,padding:"9px 13px"}}><p style={{margin:0,fontSize:9.5,color:"#A32D2D",fontWeight:600,textTransform:"uppercase"}}>GST</p><p style={{margin:"2px 0 0",fontSize:16,fontWeight:700,color:"#A32D2D"}}>{f(totGST)}</p></div>
        <div style={{background:"#FAEEDA",borderRadius:9,padding:"9px 13px"}}><p style={{margin:0,fontSize:9.5,color:"#854F0B",fontWeight:600,textTransform:"uppercase"}}>IRN generated</p><p style={{margin:"2px 0 0",fontSize:16,fontWeight:700,color:"#854F0B"}}>0 <span style={{fontSize:9,fontWeight:600}}>· awaiting GSP</span></p></div>
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",fontSize:11.5,borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f3f4f8",borderBottom:"2px solid #cdd1d8"}}>
              {["Date","Invoice / file no.","Party","GSTIN","Module","Taxable ₹","GST ₹","IRN","Status"].map((h,i)=>(
                <th key={i} style={{textAlign:i===5||i===6?"right":"left",padding:"9px 11px",fontWeight:600,color:"#384677",fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {bills.length===0&&<tr><td colSpan={9} style={{padding:"24px",textAlign:"center",color:"#5a6691"}}>No posted sale invoices for {monthLabel(period)} — e-invoice candidates appear here as sales are booked.</td></tr>}
              {bills.map((b,i)=>(
                <tr key={b.id+i} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"8px 11px",color:"#5a6691",whiteSpace:"nowrap"}}>{b.date}</td>
                  <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:10.5,color:"#185FA5"}}>{b.id}</td>
                  <td style={{padding:"8px 11px",fontWeight:600,color:"#0d1326"}}>{b.client}</td>
                  <td style={{padding:"8px 11px",color:"#8b94b3",fontSize:10}} title="Party GSTIN is not captured in the customer master yet">—</td>
                  <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{b.mod}</span></td>
                  <td style={{padding:"8px 11px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(taxableOf(b))}</td>
                  <td style={{padding:"8px 11px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#A32D2D"}}>{f(gstOf(b))}</td>
                  <td style={{padding:"8px 11px",fontSize:10,color:"#8b94b3",whiteSpace:"nowrap"}}>— awaiting GSP provider</td>
                  <td style={{padding:"8px 11px"}}><span title={GSP_NOTE} style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,background:"#f3f4f8",color:"#5a6691",fontWeight:700}}>Not generated</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </TaxShell>
  );
}


/* ── P&L ─────────────────────────────────────────────────── */

