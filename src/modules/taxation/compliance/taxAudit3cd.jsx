/* BUSINESS SUB-MODULE REORG (2026-07-14): moved out of taxation/legacy.jsx into
   its business sub-module folder — Taxation Compliance group (href /tax/audit-3cd).
   taxation/index.js re-exports TaxAudit3CD from here so App.jsx's barrel import
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

export function TaxAudit3CD({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:(branch?.code||null);
  const [fy,setFy]=useState(CUR_FY.label);
  const {from,to}=fyRange(fy);
  const prevFy=`${parseInt(fy,10)-1}-${String(parseInt(fy,10)).slice(2)}`;
  const prevRange=fyRange(prevFy);

  const plQ=useProfitAndLoss(branch,{from,to});
  const plPrevQ=useProfitAndLoss(branch,{from:prevRange.from,to:prevRange.to});
  const tdsQ=useTdsLedgerStatements('payable',branch,{from,to});

  const pl=plQ.data, plPrev=plPrevQ.data;
  const turnoverOf=(p)=>(((p?.trading?.credit)||[]).filter(g=>((g.primary||g.group)==="Sales Accounts")).reduce((s,g)=>s+(+g.amount||0),0));
  const turnover=turnoverOf(pl), turnoverPrev=turnoverOf(plPrev);
  const gp=pl?.grossProfit||0, np=pl?.netProfit||0;
  const gpPrev=plPrev?.grossProfit||0, npPrev=plPrev?.netProfit||0;
  const pct=(a,b)=>b?((a/b)*100).toFixed(1)+"%":"—";

  const indirectHeads=((pl?.indirect?.debit)||[]).slice().sort((a,b)=>(b.amount||0)-(a.amount||0));
  const indirectTotal=pl?.indirect?.debitTotal||0;

  // Clause 34(a): TDS deducted (Cr accruals on the TDS Payable ledgers) by section.
  const statements=tdsQ.data?.statements||[];
  const tdsEntries=tdsAccrualEntries(statements,'Cr');
  const tdsDeducted=tdsEntries.reduce((s,e)=>s+e.amount,0);
  const tdsDeposited=tdsReliefTotal(statements,'Cr');
  const tdsClosing=statements.reduce((s,st)=>s+(st.closingSide==='Cr'?(st.closingBalance||0):-(st.closingBalance||0)),0);
  const bySection=[...tdsEntries.reduce((m,e)=>{
    if(!m.has(e.section))m.set(e.section,{section:e.section,count:0,tds:0});
    const r=m.get(e.section);r.count++;r.tds+=e.amount;return m;
  },new Map()).values()].sort((a,b)=>b.tds-a.tds);

  // Clauses NOT derivable from the double-entry books — explicit manual work.
  const MANUAL_CLAUSES=[
    {clause:"14",title:"Method of valuation of closing stock",note:"Service business — confirm N/A with the auditor"},
    {clause:"17",title:"Land/building transferred below stamp value (43CA/50C)",note:"Asset transfer details are not tracked in the system"},
    {clause:"18",title:"Particulars of depreciation u/s 32 (blocks, additions, deletions)",note:"Compile from the Fixed Asset Register"},
    {clause:"20",title:"Bonus / PF / ESI — due-date-wise deposits (36(1)(va), 43B)",note:"Payroll statutory challan dates are not in the books"},
    {clause:"21(d)",title:"Cash payments > ₹10,000 u/s 40A(3)",note:"Payment MODE (cash vs bank) per voucher is not captured — review the Cash Book"},
    {clause:"22",title:"MSME dues beyond 45 days (43B(h))",note:"Supplier Udyam/MSME status is not captured in the supplier master"},
    {clause:"26",title:"43B items paid after the due date",note:"Requires challan/payment due-date evidence"},
    {clause:"31",title:"Loans/deposits accepted or repaid in cash (269SS/269T)",note:"Requires payment-mode detail"},
    {clause:"32",title:"Brought-forward losses / depreciation",note:"From prior ITRs, outside the books"},
    {clause:"36A",title:"Cash receipts > ₹2 lakh u/s 269ST",note:"Requires payment-mode detail"},
  ];

  const f=n=>cur+fmt(Math.round(Math.abs(n)));
  const sf=n=>(n<0?"−":"")+f(n);
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};
  const empty=!plQ.isLoading&&turnover===0&&tdsEntries.length===0;

  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>📋 Tax Audit Working Papers — Form 3CD</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>{brCode||"All branches"} · Section 44AB · FY {fy} · derivable clauses computed live from the books</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select value={fy} onChange={e=>setFy(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:7,fontSize:11.5}}>
            {fyOptions().map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <button onClick={()=>openPrintPreview({selector:'main',title:`Form 3CD working papers — FY ${fy}`,recommend:'portrait'})} style={{padding:"7px 14px",border:"none",background:"#d4a437",color:"#0d1326",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"}}>🖨 Print for CA</button>
        </div>
      </div>

      {empty&&<div style={{...card,padding:"24px",textAlign:"center",color:"#5a6691",fontSize:11.5,marginBottom:14}}>
        No posted books for FY {fy} — the computed clauses fill in once vouchers are posted.
      </div>}

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Turnover (P&amp;L Sales)</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{f(turnover)}</p></div>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Net Profit / Turnover</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{pct(np,turnover)}</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>TDS Deducted (FY)</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{f(tdsDeducted)}</p></div>
        <div style={{...card,borderTop:"3px solid "+(tdsClosing>0.5?"#A32D2D":"#27500A")}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>TDS Payable (closing)</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:tdsClosing>0.5?"#A32D2D":"#27500A"}}>{sf(tdsClosing)}</p></div>
      </div>

      <h3 style={{margin:"8px 0 6px",fontSize:13,color:"#0d1326"}}>Clause 40 — Accounting Ratios <span style={{fontSize:9,padding:"1px 6px",borderRadius:999,background:"#EAF3DE",color:"#27500A",fontWeight:700}}>LIVE</span></h3>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:14}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Particulars</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>FY {fy}</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>FY {prevFy} (preceding)</th>
            </tr></thead>
            <tbody>
              {[
                {l:"Turnover (Sales Accounts)",a:sf(turnover),b:sf(turnoverPrev)},
                {l:"Gross Profit",a:sf(gp),b:sf(gpPrev)},
                {l:"Gross Profit / Turnover",a:pct(gp,turnover),b:pct(gpPrev,turnoverPrev)},
                {l:"Net Profit",a:sf(np),b:sf(npPrev)},
                {l:"Net Profit / Turnover",a:pct(np,turnover),b:pct(npPrev,turnoverPrev)},
              ].map((r,i)=>(
                <tr key={r.l} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
                  <td style={{padding:"7px 8px",fontWeight:600}}>{r.l}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{r.a}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#5a6691"}}>{r.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h3 style={{margin:"8px 0 6px",fontSize:13,color:"#0d1326"}}>Clause 34(a) — TDS Deducted by Section <span style={{fontSize:9,padding:"1px 6px",borderRadius:999,background:"#EAF3DE",color:"#27500A",fontWeight:700}}>LIVE — TDS Payable ledgers</span></h3>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:14}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Section</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Deduction entries</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>TDS deducted</th>
            </tr></thead>
            <tbody>
              {bySection.length===0&&<tr><td colSpan={3} style={{padding:"20px",textAlign:"center",color:"#5a6691"}}>No TDS withheld in the books for FY {fy}.</td></tr>}
              {bySection.map((r,i)=>(
                <tr key={r.section} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
                  <td style={{padding:"7px 8px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#FAEEDA",color:"#854F0B",fontWeight:700}}>{r.section}</span>{r.section==="—"&&<span style={{marginLeft:6,fontSize:9.5,color:"#8b94b3"}}>section not stated on the posting narration</span>}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}>{r.count}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(r.tds)}</td>
                </tr>
              ))}
              {bySection.length>0&&<tr style={{background:"#fafbfd",borderTop:"2px solid #0d1326"}}>
                <td style={{padding:"7px 8px",fontWeight:700}}>TOTAL — deducted {f(tdsDeducted)} · deposited {f(tdsDeposited)}</td>
                <td style={{padding:"7px 8px",textAlign:"center",fontWeight:700}}>{tdsEntries.length}</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:tdsClosing>0.5?"#A32D2D":"#27500A"}}>{sf(tdsClosing)} payable</td>
              </tr>}
            </tbody>
          </table>
        </div>
      </div>

      <h3 style={{margin:"8px 0 6px",fontSize:13,color:"#0d1326"}}>Indirect Expense Heads (P&amp;L) <span style={{fontSize:9,padding:"1px 6px",borderRadius:999,background:"#EAF3DE",color:"#27500A",fontWeight:700}}>LIVE</span></h3>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:14}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Expense head (group)</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Amount</th>
              <th style={{padding:"9px 8px",textAlign:"left",width:180}}>Share</th>
            </tr></thead>
            <tbody>
              {indirectHeads.length===0&&<tr><td colSpan={3} style={{padding:"20px",textAlign:"center",color:"#5a6691"}}>No indirect expenses posted for FY {fy}.</td></tr>}
              {indirectHeads.map((g,i)=>(
                <tr key={g.group||i} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
                  <td style={{padding:"7px 8px",fontWeight:600}}>{g.group}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{sf(g.amount||0)}</td>
                  <td style={{padding:"7px 8px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:10,color:"#5a6691",width:40,textAlign:"right",flexShrink:0,fontVariantNumeric:"tabular-nums"}}>{pctText(share(g.amount||0,indirectTotal))}</span>
                      <div style={{flex:1,minWidth:36}}><MiniBar pct={share(g.amount||0,indirectTotal)} tone="cogs"/></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h3 style={{margin:"8px 0 6px",fontSize:13,color:"#0d1326"}}>Clauses Requiring Manual Compilation <span style={{fontSize:9,padding:"1px 6px",borderRadius:999,background:"#FAEEDA",color:"#854F0B",fontWeight:700}}>MANUAL</span></h3>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"center",width:70}}>Clause</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Particulars</th>
              <th style={{padding:"9px 8px",textAlign:"center",width:90}}>Status</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Why it can't be computed here</th>
            </tr></thead>
            <tbody>
              {MANUAL_CLAUSES.map((c,i)=>(
                <tr key={c.clause} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
                  <td style={{padding:"7px 8px",textAlign:"center",fontWeight:700,color:"#185FA5"}}>{c.clause}</td>
                  <td style={{padding:"7px 8px"}}>{c.title}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:"#FAEEDA",color:"#854F0B"}}>Manual</span></td>
                  <td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{padding:"9px 14px",borderRadius:9,background:"#E6F1FB",border:"1px solid #B5D4F4",fontSize:10,color:"#185FA5"}}>
        Computed sections read /api/accounting/profit-and-loss (this FY + preceding FY) and the TDS Payable chart ledgers (trial-balance discovery → per-ledger statements). Manual clauses are listed WITHOUT figures — no sample data — compile them with the auditor from source records.
      </div>
    </div>
  );
}


