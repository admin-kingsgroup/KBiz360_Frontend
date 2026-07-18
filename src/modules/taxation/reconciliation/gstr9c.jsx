/* BUSINESS SUB-MODULE REORG (2026-07-14): moved out of taxation/legacy.jsx into
   its business sub-module folder — Taxation Reconciliation group (href /tax/gstr9c).
   taxation/index.js re-exports Gstr9c from here so App.jsx's barrel import
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
import { isViewOnly } from '../../../shell/primitives';

export function Gstr9c({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:(branch?.code||null);
  const [fy,setFy]=useState(CUR_FY.label);
  const {from,to}=fyRange(fy);

  const plQ=useProfitAndLoss(branch,{from,to});
  const gpQ=useGpBills(branch,{from,to});
  const taxQ=useTaxSummary(branch,{from,to});
  const pl=plQ.data, tax=taxQ.data;
  const bills=saleBills(gpQ.data||[],brCode);

  // ── live figures ──────────────────────────────────────────────────
  const salesGroups=((pl?.trading?.credit)||[]).filter(g=>((g.primary||g.group)==="Sales Accounts"));
  const turnoverBooks=salesGroups.reduce((s,g)=>s+(+g.amount||0),0);
  const turnoverGstr=bills.reduce((s,b)=>s+taxableOf(b),0);
  const gstOnBills=bills.reduce((s,b)=>s+gstOf(b),0);
  const outputTaxBooks=tax?.output?.total||0;
  const itcBooks=tax?.input?.total||0;
  const netPayableBooks=tax?.netPayable??(outputTaxBooks-itcBooks);

  // ── manual figures (not in the system) — persisted per branch × FY ─
  const cfgKey=`taxation.gstr9c.${brCode||'ALL'}.${fy}`;
  const saved=useConfigValue(cfgKey).data||{};
  const saveCfg=useSaveConfigValue();
  const [edits,setEdits]=useState({});
  const mVal=(k)=>edits[k]!==undefined?edits[k]:(saved[k]!==undefined&&saved[k]!==0?String(saved[k]):"");
  const mNum=(k)=>Number(edits[k]!==undefined?edits[k]:saved[k])||0;
  const commitManual=()=>{
    const changed=Object.keys(edits);
    if(!changed.length)return;
    const value={...saved,...Object.fromEntries(changed.map(k=>[k,Number(edits[k])||0]))};
    saveCfg.mutate({key:cfgKey,value,description:'GSTR-9C manual reconciliation figures (per branch × FY)'},{
      onSuccess:()=>{setEdits({});toast('Manual figure saved');},
      onError:(e)=>toast('Could not save — '+(e?.message||'unknown error'),'error'),
    });
  };
  // Plain render helper (NOT a nested component — a nested component would
  // remount on every keystroke and drop the input focus).
  const manualInput=(k)=>(
    <input type="number" value={mVal(k)} placeholder="0" disabled={isViewOnly()}
      onChange={e=>setEdits(s=>({...s,[k]:e.target.value}))} onBlur={()=>!isViewOnly()&&commitManual()}
      style={{width:110,padding:"3px 6px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:10.5,textAlign:"right"}}/>
  );

  // Table 5 — turnover reconciliation. sign +1 adds to, −1 reduces, the adjusted turnover.
  const MANUAL_ROWS=[
    {sn:"5B",k:"adj5B",sign:+1,label:"Unbilled revenue at the end of FY",note:"Manual — not tracked in the system"},
    {sn:"5C",k:"adj5C",sign:+1,label:"Unadjusted advances at the end of FY",note:"Manual — advances aren't revenue in the books yet"},
    {sn:"5D",k:"adj5D",sign:+1,label:"Deemed supplies u/s 7 Schedule I",note:"Manual — enter if any"},
    {sn:"5E",k:"adj5E",sign:-1,label:"Credit notes issued after FY end (relating to FY)",note:"Manual — reduces turnover"},
    {sn:"5F",k:"adj5F",sign:-1,label:"Trade discounts not part of value of supply",note:"Manual — per Sec 15(3)"},
    {sn:"5O",k:"adj5O",sign:+1,label:"Other adjustments incl. audited-FS differences (±)",note:"Manual — enter signed amount"},
  ];
  const adjustments=MANUAL_ROWS.reduce((s,r)=>s+r.sign*mNum(r.k),0);
  const adjustedTurnover=turnoverBooks+adjustments;
  const turnoverDiff=adjustedTurnover-turnoverGstr;

  const taxPaidReturns=mNum('taxPaidReturns');
  const taxDiff=netPayableBooks-taxPaidReturns;
  const itcReturns=mNum('itcReturns');
  const itcDiff=itcBooks-itcReturns;

  const loading=plQ.isLoading||gpQ.isLoading||taxQ.isLoading;
  const empty=!loading&&turnoverBooks===0&&bills.length===0;
  const f=n=>cur+fmt(Math.round(Math.abs(n)));
  const sf=n=>(n<0?"−":"")+f(n);
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};
  const liveTag=<span style={{fontSize:8.5,padding:"1px 6px",borderRadius:999,background:"#EAF3DE",color:"#27500A",fontWeight:700,marginLeft:6}}>LIVE</span>;
  const manualTag=<span style={{fontSize:8.5,padding:"1px 6px",borderRadius:999,background:"#FAEEDA",color:"#854F0B",fontWeight:700,marginLeft:6}}>MANUAL</span>;

  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>📑 GSTR-9C — Audit Reconciliation</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>{brCode||"All branches"} · FY {fy} · computed live from the books · Required if turnover &gt; ₹5 cr · Self-certified (Notification 30/2021)</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select value={fy} onChange={e=>{setFy(e.target.value);setEdits({});}} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:7,fontSize:11.5}}>
            {fyOptions().map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <button onClick={()=>openPrintPreview({selector:'main',title:`GSTR-9C — FY ${fy}`,recommend:'portrait'})} style={{padding:"7px 14px",border:"none",background:"#d4a437",color:"#0d1326",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"}}>🖨 Print / PDF</button>
        </div>
      </div>

      {empty&&<div style={{...card,padding:"24px",textAlign:"center",color:"#5a6691",fontSize:11.5,marginBottom:14}}>
        No posted sales in the books for FY {fy} — the reconciliation appears once sale vouchers are posted.
      </div>}

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Books Turnover (P&amp;L Sales)</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{f(turnoverBooks)}</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Turnover per GSTR (GST base)</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{f(turnoverGstr)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{bills.length} sale invoices</p></div>
        <div style={{...card,borderTop:"3px solid "+(Math.round(turnoverDiff)===0?"#27500A":"#A32D2D")}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Un-reconciled Turnover</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:Math.round(turnoverDiff)===0?"#27500A":"#A32D2D"}}>{sf(turnoverDiff)}</p></div>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Net Tax Payable (books)</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{sf(netPayableBooks)}</p></div>
      </div>

      <h3 style={{margin:"8px 0 6px",fontSize:13,color:"#0d1326"}}>Part II — Reconciliation of Turnover (Table 5)</h3>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:14}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"center"}}>SN</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Description</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Amount</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Source</th>
            </tr></thead>
            <tbody>
              <tr style={{background:"#fff",borderBottom:"1px solid #cdd1d8"}}>
                <td style={{padding:"7px 8px",textAlign:"center",fontWeight:700,color:"#185FA5"}}>5A</td>
                <td style={{padding:"7px 8px",fontSize:10.5}}>Turnover as per the books (Sales Accounts, P&amp;L){liveTag}</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600}}>{f(turnoverBooks)}</td>
                <td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>/api/accounting/profit-and-loss</td>
              </tr>
              {MANUAL_ROWS.map((r,i)=>(
                <tr key={r.sn} style={{background:i%2===0?"#f3f4f8":"#fff",borderBottom:"1px solid #cdd1d8"}}>
                  <td style={{padding:"7px 8px",textAlign:"center",fontWeight:700,color:"#185FA5"}}>{r.sn}</td>
                  <td style={{padding:"7px 8px",fontSize:10.5}}>{r.label} {r.sign<0?"(−)":"(+)"}{manualTag}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{manualInput(r.k)}</td>
                  <td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>{r.note}</td>
                </tr>
              ))}
              <tr style={{background:"#fafbfd",borderBottom:"1px solid #cdd1d8",borderTop:"2px solid #0d1326"}}>
                <td style={{padding:"7px 8px",textAlign:"center",fontWeight:700,color:"#185FA5"}}>5P</td>
                <td style={{padding:"7px 8px",fontSize:10.5,fontWeight:700}}>Annual turnover after adjustments (5A ± 5B…5O)</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800}}>{sf(adjustedTurnover)}</td>
                <td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>computed</td>
              </tr>
              <tr style={{background:"#fff",borderBottom:"1px solid #cdd1d8"}}>
                <td style={{padding:"7px 8px",textAlign:"center",fontWeight:700,color:"#185FA5"}}>5Q</td>
                <td style={{padding:"7px 8px",fontSize:10.5}}>Turnover as declared in GSTR (GST base of posted sale invoices){liveTag}</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600}}>{f(turnoverGstr)}</td>
                <td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>/api/accounting/gp-bills — GSTR-1 source</td>
              </tr>
              <tr style={{background:Math.round(turnoverDiff)===0?"#EAF3DE":"#FCEBEB"}}>
                <td style={{padding:"7px 8px",textAlign:"center",fontWeight:700,color:"#185FA5"}}>5R</td>
                <td style={{padding:"7px 8px",fontSize:10.5,fontWeight:700}}>Un-reconciled turnover (5P − 5Q)</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:Math.round(turnoverDiff)===0?"#27500A":"#A32D2D"}}>{sf(turnoverDiff)}</td>
                <td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>{Math.round(turnoverDiff)===0?"Reconciled":"Explain line-wise before certifying"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <h3 style={{margin:"8px 0 6px",fontSize:13,color:"#0d1326"}}>Part III — Reconciliation of Tax Paid (Table 9)</h3>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:14}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Description</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Amount</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Source</th>
            </tr></thead>
            <tbody>
              <tr style={{borderBottom:"1px solid #cdd1d8"}}><td style={{padding:"7px 8px"}}>Output tax per books (GST output ledgers){liveTag}</td><td style={{padding:"7px 8px",textAlign:"right",fontWeight:600}}>{sf(outputTaxBooks)}</td><td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>/api/accounting/tax-summary</td></tr>
              <tr style={{background:"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}><td style={{padding:"7px 8px"}}>ITC per books (GST input ledgers){liveTag}</td><td style={{padding:"7px 8px",textAlign:"right",fontWeight:600}}>{sf(itcBooks)}</td><td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>/api/accounting/tax-summary</td></tr>
              <tr style={{borderBottom:"1px solid #cdd1d8"}}><td style={{padding:"7px 8px",fontWeight:700}}>Net tax payable per books{liveTag}</td><td style={{padding:"7px 8px",textAlign:"right",fontWeight:800}}>{sf(netPayableBooks)}</td><td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>Output − ITC</td></tr>
              <tr style={{background:"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}><td style={{padding:"7px 8px"}}>Tax paid as per filed returns (GSTR-3B cash + credit){manualTag}</td><td style={{padding:"7px 8px",textAlign:"right"}}>{manualInput("taxPaidReturns")}</td><td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>Manual — from the filed 3Bs</td></tr>
              <tr style={{background:Math.round(taxDiff)===0?"#EAF3DE":"#FCEBEB"}}><td style={{padding:"7px 8px",fontWeight:700}}>Difference (books − returns)</td><td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:Math.round(taxDiff)===0?"#27500A":"#A32D2D"}}>{sf(taxDiff)}</td><td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>{Math.round(taxDiff)===0?"Reconciled":"Reconciling item — additional liability payable via DRC-03 if short-paid"}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <h3 style={{margin:"8px 0 6px",fontSize:13,color:"#0d1326"}}>Part IV — Reconciliation of Input Tax Credit (Table 12)</h3>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Description</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Amount</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Source</th>
            </tr></thead>
            <tbody>
              <tr style={{borderBottom:"1px solid #cdd1d8"}}><td style={{padding:"7px 8px"}}>ITC availed as per books (GST input ledgers){liveTag}</td><td style={{padding:"7px 8px",textAlign:"right",fontWeight:600}}>{sf(itcBooks)}</td><td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>/api/accounting/tax-summary</td></tr>
              <tr style={{background:"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}><td style={{padding:"7px 8px"}}>ITC availed in returns (3B Table 4A){manualTag}</td><td style={{padding:"7px 8px",textAlign:"right"}}>{manualInput("itcReturns")}</td><td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>Manual — from the filed 3Bs</td></tr>
              <tr style={{background:Math.round(itcDiff)===0?"#EAF3DE":"#FCEBEB"}}><td style={{padding:"7px 8px",fontWeight:700}}>Difference (books − returns)</td><td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:Math.round(itcDiff)===0?"#27500A":"#A32D2D"}}>{sf(itcDiff)}</td><td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>{Math.round(itcDiff)===0?"Reconciled":"Un-reconciled ITC — reverse or explain before certifying"}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{padding:"9px 14px",borderRadius:9,background:"#E6F1FB",border:"1px solid #B5D4F4",fontSize:10,color:"#185FA5"}}>
        GST on posted invoices this FY (per gp-bills): <b>{f(gstOnBills)}</b>. Manual rows persist per branch × FY (app-config <code>{cfgKey}</code>) and default to 0 — they cover data the system doesn't hold (audited-FS adjustments, filed-return figures).
      </div>
    </div>
  );
}


/* Form 3CD working papers — the clauses that ARE derivable from the books are
   computed live (turnover, GP/NP ratios from /profit-and-loss; TDS deducted
   summary from the real TDS Payable chart ledgers). Clauses that need data the
   system doesn't hold (cash-payment mode, MSME ageing by udyam status, 269SS…)
   are explicit MANUAL placeholders — no fabricated flags. */
