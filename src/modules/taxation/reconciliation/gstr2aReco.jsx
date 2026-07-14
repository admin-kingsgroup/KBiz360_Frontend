/* BUSINESS SUB-MODULE REORG (2026-07-14): moved out of taxation/legacy.jsx into
   its business sub-module folder — Taxation Reconciliation group (href /tax/gstr2a).
   taxation/index.js re-exports Gstr2aReco from here so App.jsx's barrel import
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

export function Gstr2aReco({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [period,setPeriod]=useState(CUR_MONTH);

  const SUPPLIER_2A=[
    {gstin:"27AAACA1681K1Z3",supplier:"Air India Ltd.",books:128500,gstr2a:128500,match:128500,diff:0,status:"Matched",invCount:8},
    {gstin:"24AAACI8302G1Z5",supplier:"IndiGo Airlines",books:84200,gstr2a:84200,match:84200,diff:0,status:"Matched",invCount:5},
    {gstin:"27AAACE6321P1Z9",supplier:"Emirates Airlines BSP",books:42500,gstr2a:0,match:0,diff:42500,status:"Missing in 2A",invCount:2},
    {gstin:"27AAACN1234R1Z2",supplier:"NIC Travel Solutions",books:18500,gstr2a:21800,match:18500,diff:-3300,status:"2A higher",invCount:3},
    {gstin:"06AAFCB5678L1Z4",supplier:"Big Booking Software",books:54000,gstr2a:54000,match:54000,diff:0,status:"Matched",invCount:1},
    {gstin:"27AABCV9012M1Z6",supplier:"Visa Facilitation Svc",books:28500,gstr2a:28500,match:28500,diff:0,status:"Matched",invCount:6},
    {gstin:"27AABCS1234N1Z5",supplier:"Stationery Mart Pvt",books:8500,gstr2a:0,match:0,diff:8500,status:"Missing in 2A",invCount:4},
  ];

  const totBooks=SUPPLIER_2A.reduce((s,r)=>s+r.books,0);
  const tot2A=SUPPLIER_2A.reduce((s,r)=>s+r.gstr2a,0);
  const totMatch=SUPPLIER_2A.reduce((s,r)=>s+r.match,0);
  const missing=SUPPLIER_2A.filter(r=>r.status==="Missing in 2A").length;
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <SampleBanner note="GSTR-2A / 2B ITC matching isn’t wired to live data yet." />
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>🔁 GSTR-2A vs Purchase Register</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>Supplier-by-supplier reconciliation (sample — not yet wired) · Chase missing ITC · Pre-filing check</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:7,fontSize:11.5}}>
            {MONTH_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <button style={{padding:"7px 14px",border:"1px solid #185FA5",background:"#fff",color:"#185FA5",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer"}}>⬇ Import 2A</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>ITC in Books</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{cur+fmt(totBooks)}</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>ITC in GSTR-2A</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{cur+fmt(tot2A)}</p></div>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Matched</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{cur+fmt(totMatch)}</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Missing in 2A</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{missing}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{cur+fmt(totBooks-tot2A)} unconfirmed</p></div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Supplier</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>GSTIN</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Inv #</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Books ITC</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>GSTR-2A ITC</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Difference</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Status</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Action</th>
            </tr></thead>
            <tbody>
              {SUPPLIER_2A.map((r,i)=>(
                <tr key={r.gstin} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
                  <td style={{padding:"7px 8px",fontWeight:600}}>{r.supplier}</td>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#5a6691"}}>{r.gstin}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}>{r.invCount}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(r.books)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(r.gstr2a)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,color:r.diff===0?"#5a6691":r.diff>0?"#A32D2D":"#854F0B"}}>{r.diff!==0?(r.diff>0?"+":"")+cur+fmt(r.diff):"—"}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}>
                    <span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:r.status==="Matched"?"#EAF3DE":r.status==="Missing in 2A"?"#FCEBEB":"#FAEEDA",color:r.status==="Matched"?"#27500A":r.status==="Missing in 2A"?"#A32D2D":"#854F0B"}}>{r.status}</span>
                  </td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}>
                    {r.status==="Missing in 2A"?<button style={{padding:"3px 8px",border:"1px solid #A32D2D",background:"#fff",color:"#A32D2D",borderRadius:6,fontSize:10,cursor:"pointer"}}>Chase</button>:r.status!=="Matched"?<button style={{padding:"3px 8px",border:"1px solid #854F0B",background:"#fff",color:"#854F0B",borderRadius:6,fontSize:10,cursor:"pointer"}}>Review</button>:<span style={{fontSize:9.5,color:"#27500A"}}>✓</span>}
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

/* ══════════════════════════════════════════════════════════════════
   REPORTS ADDITIONS — Ratio, Schedule III BS, Working Capital,
                       Variance Analysis, Cash Flow (Direct), MSME
   ════════════════════════════════════════════════════════════════ */


// GST return-filing status per registered entity. There is no live backend feed for
// actual GSTR-1/GSTR-3B filing status yet, so this is intentionally EMPTY rather than
// showing fabricated GSTINs/statuses. Consumers (GstrFilingPanel, sr-fm-dashboard KPI)
// render an honest empty state until a taxation filing service is wired up.
