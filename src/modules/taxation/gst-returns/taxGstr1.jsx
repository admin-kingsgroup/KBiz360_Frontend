/* BUSINESS SUB-MODULE REORG (2026-07-14): moved out of taxation/legacy.jsx into
   its business sub-module folder — Taxation GST Returns group (href /tax/gstr1).
   taxation/index.js re-exports TaxGstr1 from here so App.jsx's barrel import
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

export function TaxGstr1({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:(branch?.code||null);   // null = consolidated (all branches)
  const [period,setPeriod]=useState(CUR_MONTH);
  const PERIODS=MONTH_OPTIONS;

  const GP=useGpBills(branch).data||[];   // live booking bills (/api/accounting/gp-bills)
  // India GST return — EXCLUDE Africa/VAT branches (USD, own VAT Return) so their bills never enter an India ₹ GSTR.
  const bills=GP.filter(b=>!isVatBranch(b.branch)&&(!brCode||b.branch===brCode)&&(b.date||'').startsWith(period));
  const B2B_CLIENTS=[]; // TODO: derive B2B/B2C split from the customer master's GST-registration flag

  const b2b=bills.filter(b=>B2B_CLIENTS.includes(b.client));
  const b2c=bills.filter(b=>!B2B_CLIENTS.includes(b.client));

  const gstRate=(mod)=>mod==="Holiday"?5:18;
  const taxable=b=>b.sell/(1+gstRate(b.mod)/100);
  const gstAmt =b=>b.sell-taxable(b);

  const totB2bTaxable=b2b.reduce((s,b)=>s+taxable(b),0);
  const totB2bGST    =b2b.reduce((s,b)=>s+gstAmt(b),0);
  const totB2cTaxable=b2c.reduce((s,b)=>s+taxable(b),0);
  const totB2cGST    =b2c.reduce((s,b)=>s+gstAmt(b),0);
  const totTaxable=totB2bTaxable+totB2cTaxable;
  const totGST    =totB2bGST+totB2cGST;

  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>GSTR-1 — Outward Supplies</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{brCode||"All branches"} · {monthLabel(period)} · Due: 11th of following month</p>
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
          <button style={{...btnG,fontSize:11,background:"#27500A"}}>📤 File on GST Portal</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #185FA5",padding:"11px 13px",background:"#E6F1FB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#185FA5",textTransform:"uppercase"}}>B2B Invoices</p><p style={{margin:"4px 0 0",fontSize:19,fontWeight:800,color:"#0d1326"}}>{String(b2b.length)}</p></div>
          <div style={{...card,borderTop:"3px solid #185FA5",padding:"11px 13px",background:"#E6F1FB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#185FA5",textTransform:"uppercase"}}>B2B Taxable</p><p style={{margin:"4px 0 0",fontSize:19,fontWeight:800,color:"#0d1326"}}>{f(totB2bTaxable)}</p></div>
          <div style={{...card,borderTop:"3px solid #854F0B",padding:"11px 13px",background:"#FAEEDA"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#854F0B",textTransform:"uppercase"}}>B2C Invoices</p><p style={{margin:"4px 0 0",fontSize:19,fontWeight:800,color:"#0d1326"}}>{String(b2c.length)}</p></div>
          <div style={{...card,borderTop:"3px solid #854F0B",padding:"11px 13px",background:"#FAEEDA"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#854F0B",textTransform:"uppercase"}}>B2C Taxable</p><p style={{margin:"4px 0 0",fontSize:19,fontWeight:800,color:"#0d1326"}}>{f(totB2cTaxable)}</p></div>
          <div style={{...card,borderTop:"3px solid #A32D2D",padding:"11px 13px",background:"#FCEBEB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#A32D2D",textTransform:"uppercase"}}>Total GST Collected</p><p style={{margin:"4px 0 0",fontSize:19,fontWeight:800,color:"#0d1326"}}>{f(totGST)}</p></div>
      </div>
      <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Table 4A/4B — B2B Invoices (with buyer GSTIN)</p>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:14}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Invoice No.","Date","Client","GSTIN (Deemed)","Module","Rate","Taxable","CGST","SGST","Total GST"].map((h,i)=>(
              <th key={i} style={{padding:"8px 10px",textAlign:i>=6?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{b2b.map((b,i)=>{
            const tv=taxable(b),ga=gstAmt(b);
            return (
              <tr key={b.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:9.5,color:"#185FA5"}}>{b.id}</td>
                <td style={{padding:"7px 10px",color:"#5a6691",whiteSpace:"nowrap"}}>{b.date}</td>
                <td style={{padding:"7px 10px",fontWeight:600,color:"#0d1326"}}>{b.client}</td>
                <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:9,color:"#5a6691"}}>27AABCX****Z5</td>
                <td style={{padding:"7px 10px"}}><span style={{fontSize:9,padding:"2px 6px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{b.mod}</span></td>
                <td style={{padding:"7px 10px",color:"#854F0B",fontWeight:700}}>{gstRate(b.mod)}%</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>₹{Math.round(tv).toLocaleString()}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#A32D2D"}}>₹{Math.round(ga/2).toLocaleString()}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#A32D2D"}}>₹{Math.round(ga/2).toLocaleString()}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:"#A32D2D"}}>₹{Math.round(ga).toLocaleString()}</td>
              </tr>
            );
          })}</tbody>
          {b2b.length===0&&<tbody><tr><td colSpan={10} style={{padding:"20px",textAlign:"center",color:"#5a6691"}}>No B2B invoices for this period</td></tr></tbody>}
        </table>
      </div>
      <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Table 7 — B2C Aggregate (without GSTIN)</p>
      <div style={{...card,padding:"12px 16px",background:"#f9fafb"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
          <div key="b2c-cnt"><p style={{margin:0,fontSize:10,color:"#5a6691"}}>B2C invoices count</p><p style={{margin:"2px 0 0",fontSize:13,fontWeight:700,color:"#0d1326"}}>{String(b2c.length)}</p></div>
            <div key="b2c-tax"><p style={{margin:0,fontSize:10,color:"#5a6691"}}>Taxable value</p><p style={{margin:"2px 0 0",fontSize:13,fontWeight:700,color:"#0d1326"}}>{f(totB2cTaxable)}</p></div>
            <div key="b2c-cgst"><p style={{margin:0,fontSize:10,color:"#5a6691"}}>CGST (9%)</p><p style={{margin:"2px 0 0",fontSize:13,fontWeight:700,color:"#0d1326"}}>{f(totB2cGST/2)}</p></div>
            <div key="b2c-sgst"><p style={{margin:0,fontSize:10,color:"#5a6691"}}>SGST (9%)</p><p style={{margin:"2px 0 0",fontSize:13,fontWeight:700,color:"#0d1326"}}>{f(totB2cGST/2)}</p></div>
            <div key="b2c-tot"><p style={{margin:0,fontSize:10,color:"#5a6691"}}>Total GST</p><p style={{margin:"2px 0 0",fontSize:13,fontWeight:700,color:"#0d1326"}}>{f(totB2cGST)}</p></div>
        </div>
      </div>
    </div>
  );
}

