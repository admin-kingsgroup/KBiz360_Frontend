/* BUSINESS SUB-MODULE REORG (2026-07-14): moved out of taxation/legacy.jsx into
   its business sub-module folder — Taxation TDS/TCS group (href /tax/rcm).
   taxation/index.js re-exports TaxRcm from here so App.jsx's barrel import
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

export function TaxRcm({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:(branch?.code||null);   // null = consolidated (all branches)
  const [period,setPeriod]=useState(CUR_MONTH);
  const PERIODS=MONTH_OPTIONS;

  /* LIVE: reverse-charge liability on foreign-supplier purchases, from the books
     (/api/accounting/rcm). Foreign suppliers are identified by their master country
     (!= India) — replacing the old non-functional OVERSEAS_SUPPLIERS=[] stub. */
  const monthEnd=(k)=>{const[y,m]=String(k).split('-').map(Number);return`${k}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`;};
  const rcm=useRcmLiability(branch,{from:`${period}-01`,to:monthEnd(period)}).data||{};
  const rcmEntries=(rcm.entries||[]).map(e=>({
    date:e.date,party:e.party,desc:e.country,taxable:e.taxable,igst:e.igst,status:"Liability",vno:e.vno,
  }));

  const tot=rcm.igst||0;
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>RCM Register — Reverse Charge</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{brCode||"All branches"} · {PERIODS.find(p=>p.v===period)?.l} · Pay in cash + claim ITC same month</p>
        </div>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
      </div>
      <div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:10.5,color:"#854F0B",fontWeight:600}}>
        ⚠ RCM liability: <b>{f(tot)}</b> — payable in cash through GSTR-3B Table 3.1(d). ITC can then be claimed in Table 4A. Both must be in the same return month.
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Date","Voucher No.","Overseas Supplier","Description","Taxable (₹)","IGST RCM (18%)","ITC Claimable","Status","Share of RCM"].map((h,i)=>(
              <th key={i} style={{padding:"9px 11px",textAlign:i>=4&&i<=5?"right":"left",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rcmEntries.length===0&&<tr><td colSpan={9} style={{padding:"24px",textAlign:"center",color:"#5a6691"}}>No RCM entries for this period</td></tr>}
            {rcmEntries.map((r,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"9px 11px",color:"#5a6691"}}>{r.date}</td>
                <td style={{padding:"9px 11px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{r.vno}</td>
                <td style={{padding:"9px 11px",fontWeight:500,color:"#384677"}}>{r.party}</td>
                <td style={{padding:"9px 11px",color:"#5a6691"}}>{r.desc}</td>
                <td style={{padding:"9px 11px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(r.taxable)}</td>
                <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{f(r.igst)}</td>
                <td style={{padding:"9px 11px"}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:999,background:"#EAF3DE",color:"#27500A",fontWeight:700}}>Yes</span></td>
                <td style={{padding:"9px 11px"}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:999,background:"#EAF3DE",color:"#27500A",fontWeight:700}}>{r.status}</span></td>
                <td style={{padding:"9px 11px",minWidth:130}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:10,color:"#5a6691",width:40,textAlign:"right",flexShrink:0,fontVariantNumeric:"tabular-nums"}}>{pctText(share(r.igst,tot))}</span>
                    <div style={{flex:1,minWidth:36}}><MiniBar pct={share(r.igst,tot)} tone="cogs"/></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {rcmEntries.length>0&&<tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={4} style={{padding:"9px 11px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL RCM — {rcmEntries.length} entries</td>
            <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(rcmEntries.reduce((s,r)=>s+r.taxable,0))}</td>
            <td style={{padding:"9px 11px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(tot)}</td>
            <td colSpan={2}/>
            <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,color:"#d4a437"}}>100%</td>
          </tr></tfoot>}
        </table>
      </div>
    </div>
  );
}

