/* BUSINESS SUB-MODULE REORG (2026-07-14): moved out of taxation/legacy.jsx into
   its business sub-module folder — Taxation Auto-Prep Tools group
   (href /tax/form-16a). taxation/index.js re-exports Form16AGenerator from
   here so App.jsx's barrel import needed zero changes. */

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

export function Form16AGenerator({branch}){
  const [fy,setFy]=useState(CUR_FY.label);
  const [quarter,setQuarter]=useState(fyQuarterOfISO(todayISO()));
  const [selVendor,setSelVendor]=useState(0);
  const {from,to}=fyRange(fy);

  const q=useTdsLedgerStatements('payable',branch,{from,to});
  const statements=q.data?.statements||[];
  const entries=tdsAccrualEntries(statements,'Cr').filter(e=>quarter==="ALL"||e.quarter===quarter);
  const vendors=[...entries.reduce((m,e)=>{
    if(!m.has(e.party))m.set(e.party,{vendor:e.party,tds:0,count:0,sections:new Set(),entries:[]});
    const r=m.get(e.party);r.tds+=e.amount;r.count++;r.sections.add(e.section);r.entries.push(e);return m;
  },new Map()).values()].sort((a,b)=>b.tds-a.tds);
  const idx=Math.min(selVendor,Math.max(0,vendors.length-1));
  const v=vendors[idx];
  const deposited=tdsReliefTotal(statements,'Cr'); // FY deposits to government (lump-sum, not vendor-tagged)

  const entity=(branch&&branch!=="ALL"&&branch.entity)||bc(branch)?.entity||"";
  const startYear=parseInt(fy,10);
  const ay=`${startYear+1}-${String(startYear+2).slice(2)}`;
  const qLabel=quarter==="ALL"?`FY ${fy}`:`${quarter} FY ${fy}`;
  const blank=<span style={{color:"#8b94b3",fontStyle:"italic",fontWeight:400}}>____________ (fill in)</span>;

  return(
    <PHASE2_Page title="TDS Certificate — Form 16A Generator" subtitle={`Per-vendor TDS certificate · ${qLabel} · live from the TDS Payable ledger postings`}
      toolbar={<>
        <select value={fy} onChange={e=>{setFy(e.target.value);setSelVendor(0);}} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}>{fyOptions().map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>
        <select value={quarter} onChange={e=>{setQuarter(e.target.value);setSelVendor(0);}} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}>{["Q1","Q2","Q3","Q4","ALL"].map(qq=><option key={qq} value={qq}>{qq==="ALL"?"Full FY":qq}</option>)}</select>
        <button onClick={()=>{if(v)openPrintPreview({selector:'#form16a-cert',title:`Form 16A — ${v.vendor} — ${qLabel}`,recommend:'portrait'});}} disabled={!v} style={{padding:"7px 14px",background:v?"#d4a437":"#e6e8f1",color:v?"#0d1326":"#8b94b3",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:v?"pointer":"not-allowed"}}>📥 Download / Print</button>
      </>}>
      {vendors.length===0&&!q.isLoading&&(
        <div style={{...cardStyle,padding:"28px",textAlign:"center",color:"#5a6691",fontSize:12}}>
          No TDS deducted in {qLabel} — certificates appear here once purchase / payment vouchers withhold TDS (posted to the TDS Payable ledgers).
        </div>
      )}
      {vendors.length>0&&(
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:14}}>
        {/* Vendor list — live per-deductee totals */}
        <div style={cardStyle} onKeyDown={listKeyNav()}>
          <p style={{margin:"0 0 10px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Deductees — {qLabel} · {vendors.length}</p>
          {vendors.map((vv,i)=>(
            <div key={vv.vendor} {...clickable(()=>setSelVendor(i),{role:'option'})} style={{padding:"10px",border:idx===i?"2px solid #d4a437":"1px solid #cdd1d8",borderRadius:6,marginBottom:6,cursor:"pointer",background:idx===i?"#fff8e8":"#fff"}}>
              <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>{vv.vendor}</p>
              <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{[...vv.sections].join(", ")} · {fmtINR(Math.round(vv.tds))} TDS · {vv.count} deduction{vv.count>1?"s":""}</p>
            </div>
          ))}
          <p style={{margin:"10px 0 0",fontSize:10,color:"#5a6691"}}>TDS deposited to government (FY, all vendors): <b>{fmtINR(Math.round(deposited))}</b> — deposits are lump-sum challans, not vendor-tagged in the books.</p>
        </div>
        {/* Certificate preview — printable via openPrintPreview('#form16a-cert') */}
        {v&&(
        <div id="form16a-cert" style={{background:"#fff",border:"2px solid #0d1326",borderRadius:6,overflow:"hidden",fontSize:11.5}}>
          <div style={{padding:"12px 18px",background:"#0d1326",color:"#fff",textAlign:"center"}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,letterSpacing:"0.8px"}}>FORM 16A</p>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#d4a437"}}>Certificate under Section 203 of the Income-tax Act, 1961 · {qLabel}</p>
          </div>
          <div style={{padding:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {[
                {l:"Deductor Name",v:entity||blank},
                {l:"Deductor TAN",v:blank},
                {l:"Deductor PAN",v:blank},
                {l:"Deductee Name",v:v.vendor},
                {l:"Deductee PAN",v:blank},
                {l:"Section(s)",v:[...v.sections].join(", ")},
                {l:"Quarter",v:qLabel},
                {l:"Assessment Year",v:ay},
              ].map(fld=>(
                <div key={fld.l} style={{display:"flex",gap:6,padding:"3px 0",borderBottom:"1px solid #dfe2e7"}}>
                  <span style={{color:"#5a6691",minWidth:130}}>{fld.l}</span><b>{fld.v}</b>
                </div>
              ))}
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",marginBottom:14}}>
              <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Date</th><th style={RPT_thStyle}>Voucher</th><th style={RPT_thStyle}>Section</th><th style={RPT_thStyle}>Nature (narration)</th><th style={{...RPT_thStyle,textAlign:"right"}}>TDS (₹)</th></tr></thead>
              <tbody>
                {v.entries.map((e,i)=>(
                  <tr key={e.vno+i} style={{borderBottom:"1px solid #dfe2e7"}}>
                    <td style={{...RPT_tdStyle,whiteSpace:"nowrap"}}>{e.date}</td>
                    <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5,color:"#185FA5"}}>{e.vno}</td>
                    <td style={RPT_tdStyle}>{e.section}</td>
                    <td style={{...RPT_tdStyle,fontSize:10.5,color:"#5a6691"}}>{e.narration||"—"}</td>
                    <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",fontWeight:700,color:"#A32D2D"}}>{Math.round(e.amount).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
                <tr style={{borderTop:"2px solid #0d1326",background:"#fafbfd"}}>
                  <td colSpan={4} style={{...RPT_tdStyle,fontWeight:700}}>Total tax deducted — {v.count} deduction{v.count>1?"s":""}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",fontWeight:800}}>{Math.round(v.tds).toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>
            <div style={{padding:10,background:"#FAEEDA",borderRadius:6,marginBottom:14}}>
              <p style={{margin:0,fontSize:10.5,fontWeight:600,color:"#854F0B"}}>Challan details (BSR code, challan serial no., deposit date u/s 200) are not tracked in this system — fill them from the bank challans / OLTAS before issuing. Verify against the filed 26Q/27Q before signing.</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:20,paddingTop:12,borderTop:"1px solid #cdd1d8"}}>
              {["Signature of Deductor","Date"].map(s=>(
                <div key={s}><div style={{height:28,borderBottom:"1px solid #0d1326",marginBottom:4}}/><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{s}</p></div>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>
      )}
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   13. TAX CALENDAR WITH REMINDERS
   ════════════════════════════════════════════════════════════════════ */

