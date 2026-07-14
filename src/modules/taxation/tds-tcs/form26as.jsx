/* BUSINESS SUB-MODULE REORG (2026-07-14): moved out of taxation/legacy.jsx into
   its business sub-module folder — Taxation TDS/TCS group (href /tax/form26as).
   taxation/index.js re-exports Form26AS from here so App.jsx's barrel import
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

export function Form26AS({branch}){
  const brCode=branch==="ALL"?null:(branch?.code||null);
  const [fy,setFy]=useState(CUR_FY.label);
  const [quarter,setQuarter]=useState("ALL");
  const {from,to}=fyRange(fy);

  const q=useTdsLedgerStatements('receivable',branch,{from,to});
  const statements=q.data?.statements||[];
  const all=tdsAccrualEntries(statements,'Dr');
  const entries=all.filter(e=>quarter==="ALL"||e.quarter===quarter);
  const claimed=tdsReliefTotal(statements,'Dr'); // FY claims / adjustments (Cr side)

  const rows=[...entries.reduce((m,e)=>{
    const k=e.party+"|"+e.section;
    if(!m.has(k))m.set(k,{party:e.party,section:e.section,count:0,books:0,quarters:new Set()});
    const r=m.get(k);r.count++;r.books+=e.amount;r.quarters.add(e.quarter);return m;
  },new Map()).values()].sort((a,b)=>b.books-a.books);
  const totBooks=rows.reduce((s,r)=>s+r.books,0);
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");

  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📑</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Form 26AS Reconciliation</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{brCode||"All branches"} · FY {fy} · {quarter==="ALL"?"all quarters":quarter} · TDS credits per the books (TDS Receivable ledgers)</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <select value={fy} onChange={e=>setFy(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {fyOptions().map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <select value={quarter} onChange={e=>setQuarter(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {["ALL","Q1","Q2","Q3","Q4"].map(qq=><option key={qq} value={qq}>{qq==="ALL"?"All quarters":qq}</option>)}
          </select>
          <a href="https://www.tdscpc.gov.in/" target="_blank" rel="noreferrer" style={{...btnG,fontSize:11,display:"inline-flex",alignItems:"center",gap:5,textDecoration:"none"}}><Download size={12}/> Get 26AS (TRACES)</a>
        </div>
      </div>

      <div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#E6F1FB",border:"1px solid #B5D4F4",fontSize:10.5,color:"#185FA5",fontWeight:600}}>
        The “TDS in books” column is live from the TDS Receivable ledger postings. The actual Form 26AS lives on TRACES and is not imported yet — the 26AS column stays blank (no reconciliation is claimed) until it is. Compare the downloaded statement against these figures deductor-by-deductor.
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[{l:"TDS in Books (accrued)",v:f(totBooks),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Deduction entries",v:String(entries.length),c:"#384677",bg:"#f3f4f8"},
          {l:"Deductors",v:String(new Set(entries.map(e=>e.party)).size),c:"#854F0B",bg:"#FAEEDA"},
          {l:"Claimed / adjusted (FY)",v:f(claimed),c:"#27500A",bg:"#EAF3DE"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:19,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Deductor","Section","Entries","Quarters","TDS in Books","TDS in 26AS","Difference","Status"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=4&&i<=6?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {!q.isLoading&&rows.length===0&&<tr><td colSpan={8} style={{padding:"24px",textAlign:"center",color:"#5a6691"}}>No TDS-receivable postings for {quarter==="ALL"?`FY ${fy}`:`${quarter} FY ${fy}`} — credits appear here when a party withholds TDS on a receipt or on our commission.</td></tr>}
            {rows.map((r,i)=>(
              <tr key={r.party+r.section} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{r.party}</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#FAEEDA",color:"#854F0B",fontWeight:700}}>{r.section}</span></td>
                <td style={{padding:"8px 12px"}}>{r.count}</td>
                <td style={{padding:"8px 12px",fontSize:10,color:"#5a6691"}}>{[...r.quarters].sort().join(", ")}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:600}}>{f(r.books)}</td>
                <td style={{padding:"8px 12px",textAlign:"right",color:"#8b94b3"}}>—</td>
                <td style={{padding:"8px 12px",textAlign:"right",color:"#8b94b3"}}>—</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:"#f3f4f8",color:"#5a6691"}}>Awaiting 26AS</span></td>
              </tr>
            ))}
          </tbody>
          {rows.length>0&&<tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={4} style={{padding:"9px 12px",fontWeight:700,color:"#d4a437"}}>TOTAL — {rows.length} deductor-section rows</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(totBooks)}</td>
            <td colSpan={3} style={{padding:"9px 12px",textAlign:"right",fontWeight:600,color:"#8b94b3"}}>26AS not imported</td>
          </tr></tfoot>}
        </table>
      </div>
    </div>
  );
}

/* ── API KEY SETTINGS ─────────────────────────────────────────── */

