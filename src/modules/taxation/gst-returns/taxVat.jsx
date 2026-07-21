/* BUSINESS SUB-MODULE REORG (2026-07-14): moved out of taxation/legacy.jsx into
   its business sub-module folder — Taxation GST Returns group (href /tax/vat,
   Africa VAT regime). taxation/index.js re-exports TaxVat from here so
   App.jsx's barrel import needed zero changes. */

import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Calendar, ChevronDown, Download, Plus, Settings, Users } from 'lucide-react';
import { Menu as DropdownMenu } from '../../../core/ux/Menu';
import { useGpBills, useRcmLiability, useProfitAndLoss, useTaxSummary, useConfigValue, useSaveConfigValue } from '../../../core/useAccounting';
import { useTaxCalendar } from '../../../core/useReference';
import { useMasterMutations } from '../../../core/useMasters';
import { toast } from '../../../core/ux/toast';
import { CUR_MONTH, MONTH_OPTIONS, monthLabel, monthLabelLong, todayISO, CUR_FY, fyOptions, fyRange, rangeNote } from '../../../core/dates';
import { fmt, fmtINR, localeOf } from '../../../core/format';
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

export function TaxVat({branch}){
  const mob=useMobile();
  const [period,setPeriod]=useState(CUR_MONTH);
  const PERIODS=MONTH_OPTIONS;
  const GP=useGpBills(branch).data||[];   // live booking bills (/api/accounting/gp-bills)

  const AFRICA_BRANCHES=[];

  const getBranchData=(brCode,rate)=>{
    const bills=GP.filter(b=>(!brCode||b.branch===brCode)&&(b.date||'').startsWith(period));
    const sales=bills.reduce((s,b)=>s+b.sell,0);
    const taxable=sales/(1+rate/100);
    const outputVAT=taxable*(rate/100);
    const inputCredit=bills.reduce((s,b)=>s+b.cost,0)/(1+rate/100)*(rate/100)*0.55;
    const netVAT=outputVAT-inputCredit;
    return {bills:bills.length,sales:sales,taxable:taxable,outputVAT:outputVAT,inputCredit:inputCredit,netVAT:netVAT};
  };

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>VAT Returns</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>India is GST-only — no VAT jurisdictions configured · {PERIODS.find(p=>p.v===period)?.l}</p>
        </div>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
      </div>
      {AFRICA_BRANCHES.length===0&&<div style={{...card,padding:"24px",textAlign:"center",color:"#5a6691",fontSize:11.5}}>No VAT jurisdictions — this entity operates under India GST only.</div>}
      {AFRICA_BRANCHES.map(ab=>{
        const d=getBranchData(ab.code,ab.rate);
        const f=n=>ab.cur+" "+Number(Math.round(n)).toLocaleString(localeOf(ab.cur));
        return (
          <div key={ab.code} style={{...card,padding:0,overflow:"hidden",marginBottom:14}}>
            <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto",background:"#0d1326"}}>
              <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRight:"1px solid #1a2340",minWidth:90}}>
                <p style={{margin:0,fontSize:28}}>{ab.flag}</p>
                <p style={{margin:"4px 0 0",fontSize:22,fontWeight:800,color:"#d4a437"}}>{ab.rate}%</p>
                <p style={{margin:"1px 0 0",fontSize:8.5,color:"rgba(255,255,255,0.5)"}}>VAT</p>
              </div>
              <div style={{padding:"14px 16px"}}>
                <p style={{margin:"0 0 10px",fontSize:13,fontWeight:700,color:"#fff"}}>{ab.name} <span style={{fontSize:10,color:"#5a6691"}}>· {ab.auth} · {ab.portal} · Due {ab.due}</span></p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8}}>
                  <div style={{background:"rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 10px"}}><p style={{margin:0,fontSize:9,color:"rgba(255,255,255,0.6)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Bookings</p><p style={{margin:"2px 0 0",fontSize:13,fontWeight:800,color:"#fff"}}>{String(d.bills)}</p></div>
                    <div style={{background:"rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 10px"}}><p style={{margin:0,fontSize:9,color:"rgba(255,255,255,0.6)",textTransform:"uppercase"}}>Total Sales</p><p style={{margin:"2px 0 0",fontSize:13,fontWeight:800,color:"#fff"}}>{f(d.sales)}</p></div>
                    <div style={{background:"rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 10px"}}><p style={{margin:0,fontSize:9,color:"rgba(255,255,255,0.6)",textTransform:"uppercase"}}>Taxable Value</p><p style={{margin:"2px 0 0",fontSize:13,fontWeight:800,color:"#fff"}}>{f(d.taxable)}</p></div>
                    <div style={{background:"rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 10px"}}><p style={{margin:0,fontSize:9,color:"rgba(255,255,255,0.6)",textTransform:"uppercase"}}>Output VAT</p><p style={{margin:"2px 0 0",fontSize:13,fontWeight:800,color:"#fff"}}>{f(d.outputVAT)}</p></div>
                    <div style={{background:"rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 10px"}}><p style={{margin:0,fontSize:9,color:"rgba(255,255,255,0.6)",textTransform:"uppercase"}}>Input Credit</p><p style={{margin:"2px 0 0",fontSize:13,fontWeight:800,color:"#fff"}}>{f(d.inputCredit)}</p></div>
                    <div style={{background:"#d4a437",borderRadius:8,padding:"8px 10px"}}><p style={{margin:0,fontSize:9,color:"#0d1326",textTransform:"uppercase"}}>Net Payable</p><p style={{margin:"2px 0 0",fontSize:13,fontWeight:800,color:"#0d1326"}}>{f(d.netVAT)}</p></div>
                </div>
              </div>
              <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:6,justifyContent:"center",borderLeft:"1px solid #1a2340"}}>
                <span style={{fontSize:10,padding:"3px 10px",borderRadius:999,fontWeight:700,
                  background:"#FAEEDA",color:"#854F0B",textAlign:"center"}}>Pending</span>
                <button style={{...btnG,fontSize:10,padding:"4px 12px",background:"#27500A"}}>File →</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// GSP/IRP integration is blocked on a provider contract — the register below is
// LIVE (every posted GST sale invoice from gp-bills is an e-invoice candidate),
// but IRN generation stays disabled until credentials exist.
