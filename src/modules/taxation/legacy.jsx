/* ════════════════════════════════════════════════════════════════════
   MODULES/TAXATION.JSX
   Auto-generated from KBiz360_v2.jsx · 1627 lines · 24 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Calendar, ChevronDown, Download, Plus, Settings, Users } from 'lucide-react';
import { Menu as DropdownMenu } from '../../core/ux/Menu';
import { useGpBills, useRcmLiability, useProfitAndLoss, useTaxSummary, useConfigValue, useSaveConfigValue } from '../../core/useAccounting';
import { useTaxCalendar } from '../../core/useReference';
import { useMasterMutations } from '../../core/useMasters';
import { toast } from '../../core/ux/toast';
import { CUR_MONTH, MONTH_OPTIONS, monthLabel, monthLabelLong, todayISO, CUR_FY, fyOptions, fyRange, rangeNote } from '../../core/dates';
import { fmt, fmtINR } from '../../core/format';
import { _TCS_ENTRIES, _TDS_ENTRIES, cardStyle } from '../../core/helpers';
import { useTdsLedgerStatements, tdsAccrualEntries, tdsReliefTotal, taxableOf, gstOf, saleBills, fyQuarterOfISO } from './taxLive';
import { useMobile } from '../../core/hooks';
import { useModalEsc } from '../../core/ux/useModalEsc';
import { clickable } from '../../core/ux/clickable';
import { listKeyNav } from '../../core/ux/listKeys';
import { B, FL, RPT_tdStyle, RPT_thStyle, bc, btnG, btnGh, card, inp, tabBtnStyle } from '../../core/styles';
import { MiniBar, share, pctText } from '../../core/insightsUI';
import { TDS_SECTIONS } from '../finance';
import { PHASE2_Page } from '../../shell/PHASE2_Page';
import { openPrintPreview } from '../../core/PrintPreview';
import { SampleBanner } from '../../core/ux/SampleBanner';

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

export function TaxGstr1({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:(branch?.code||null);   // null = consolidated (all branches)
  const [period,setPeriod]=useState(CUR_MONTH);
  const PERIODS=MONTH_OPTIONS;

  const GP=useGpBills(branch).data||[];   // live booking bills (/api/accounting/gp-bills)
  const bills=GP.filter(b=>(!brCode||b.branch===brCode)&&(b.date||'').startsWith(period));
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

export function TaxGstr3b({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:(branch?.code||null);   // null = consolidated (all branches)
  const [period,setPeriod]=useState(CUR_MONTH);
  const PERIODS=MONTH_OPTIONS;

  const GP=useGpBills(branch).data||[];   // live booking bills (/api/accounting/gp-bills)
  // NOTE (needs-confirmation): gp-bills returns ONE row per booking file carrying both the
  // sale side (b.sell) and the supplier/purchase side (b.cost). There is no type/voucher-kind
  // field to split sale vs purchase rows, so `sales` and `purch` are intentionally the same set;
  // ITC below correctly draws from b.cost (purchase amount). If a dedicated purchase voucher
  // source is added later, repoint `purch` to it.
  const sales=GP.filter(b=>(!brCode||b.branch===brCode)&&(b.date||'').startsWith(period));
  const purch=GP.filter(b=>(!brCode||b.branch===brCode)&&(b.date||'').startsWith(period));
  const rcm=GP.filter(b=>(!brCode||b.branch===brCode)&&(b.date||'').startsWith(period)&&(b.supplier||'').includes("BSP")); // GDS as RCM proxy

  const gstRate=mod=>mod==="Holiday"?5:18;
  const totOutward =sales.reduce((s,b)=>s+b.sell/(1+gstRate(b.mod)/100)*(gstRate(b.mod)/100),0);
  const totITC     =purch.reduce((s,b)=>s+b.cost/(1+0.18)*0.18*0.6,0); // 60% ITC eligible
  const totRCM     =rcm.reduce((s,b)=>s+b.cost/(1+0.18)*0.18*0.2,0);
  const netPayable =totOutward+totRCM-totITC;
  const cgst=netPayable/2;
  const sgst=netPayable/2;
  const f=n=>"₹"+Number(Math.round(Math.abs(n))).toLocaleString("en-IN");

  const rows=[
    {section:"3.1 — OUTWARD SUPPLIES",items:[
      {l:"(a) Taxable outward supplies",v:totOutward,note:"Sum of CGST+SGST on all B2B+B2C sales"},
      {l:"(d) Inward supplies under RCM",v:totRCM,note:"GDS charges from overseas suppliers"},
      {l:"Total Output Tax",v:totOutward+totRCM,bold:true},
    ]},
    {section:"4 — ELIGIBLE ITC",items:[
      {l:"(A) ITC available — Inputs",v:totITC,note:"60% of purchase GST (rest blocked — insurance, personal)"},
      {l:"(D) ITC reversal (Rule 42)",v:totITC*0.05,note:"5% reversal for exempt/non-business use"},
      {l:"Net ITC",v:totITC-totITC*0.05,bold:true},
    ]},
    {section:"TAX PAYABLE",items:[
      {l:"CGST payable",v:cgst,note:"Debit CGST electronic cash ledger"},
      {l:"SGST payable",v:sgst,note:"Debit SGST electronic cash ledger"},
      {l:"NET TAX PAYABLE",v:netPayable,bold:true},
    ]},
  ];

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>GSTR-3B — Monthly Summary</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{brCode||"All branches"} · {monthLabel(period)} · Due: 20th of following month</p>
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
          <button style={{...btnG,fontSize:11,background:"#A32D2D"}}>💳 Pay & File</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #A32D2D",padding:"11px 13px",background:"#FCEBEB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#A32D2D",textTransform:"uppercase"}}>Output GST</p><p style={{margin:"4px 0 0",fontSize:19,fontWeight:800,color:"#0d1326"}}>{f(totOutward+totRCM)}</p></div>
        <div style={{...card,borderTop:"3px solid #27500A",padding:"11px 13px",background:"#EAF3DE"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#27500A",textTransform:"uppercase"}}>Input ITC</p><p style={{margin:"4px 0 0",fontSize:19,fontWeight:800,color:"#0d1326"}}>{f(totITC)}</p></div>
        <div style={{...card,borderTop:`3px solid ${netPayable>0?"#A32D2D":"#27500A"}`,padding:"11px 13px",background:netPayable>0?"#FCEBEB":"#EAF3DE"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:netPayable>0?"#A32D2D":"#27500A",textTransform:"uppercase"}}>Net Payable</p><p style={{margin:"4px 0 0",fontSize:19,fontWeight:800,color:"#0d1326"}}>{f(netPayable)}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5",padding:"11px 13px",background:"#E6F1FB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#185FA5",textTransform:"uppercase"}}>CGST</p><p style={{margin:"4px 0 0",fontSize:19,fontWeight:800,color:"#0d1326"}}>{f(cgst)}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5",padding:"11px 13px",background:"#E6F1FB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#185FA5",textTransform:"uppercase"}}>SGST</p><p style={{margin:"4px 0 0",fontSize:19,fontWeight:800,color:"#0d1326"}}>{f(sgst)}</p></div>
      </div>
      {rows.map((sec,si)=>{
        const secTotal=sec.items.find(x=>x.bold)?.v||sec.items.reduce((s,x)=>s+(x.v||0),0);
        return (
        <div key={si} style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"9px 14px",background:"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#384677"}}>{sec.section}</p>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <tbody>{sec.items.map((r,ri)=>(
              <tr key={ri} style={{borderBottom:"1px solid #dfe2e7",background:r.bold?"#f9fafb":"#fff"}}>
                <td style={{padding:"9px 14px",fontWeight:r.bold?700:400,color:"#0d1326"}}>{r.l}</td>
                <td style={{padding:"9px 14px",fontSize:10,color:"#5a6691"}}>{r.note||""}</td>
                <td style={{padding:"9px 14px",textAlign:"right",fontWeight:r.bold?800:500,
                  fontVariantNumeric:"tabular-nums",color:r.bold?"#A32D2D":"#384677",
                  fontSize:r.bold?13:11.5}}>₹{Number(Math.round(r.v)).toLocaleString("en-IN")}</td>
                <td style={{padding:"9px 14px",width:160}}>{!r.bold&&secTotal?(
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:10,color:"#5a6691",width:38,textAlign:"right",flexShrink:0,fontVariantNumeric:"tabular-nums"}}>{pctText(share(r.v,secTotal))}</span>
                    <div style={{flex:1,minWidth:30}}><MiniBar pct={share(r.v,secTotal)} tone="cogs"/></div>
                  </div>
                ):null}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        );
      })}
      <div style={{...card,background:"#E6F1FB",border:"1px solid #B5D4F4",fontSize:10,color:"#185FA5"}}>
        Interest 18% p.a. if payment is late. Penalty ₹50/day per return (CGST+SGST) for late filing.
        Ensure GSTR-1 is filed before GSTR-3B so buyers&apos; ITC is auto-populated in their GSTR-2B.
      </div>
    </div>
  );
}
/* TaxTdsTcs — see rebuilt version below */

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
        const f=n=>ab.cur+" "+Number(Math.round(n)).toLocaleString("en-IN");
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

export function TaxCalendar(){
  const mob=useMobile();
  const TODAY=todayISO();

  const deadlines=[
    {date:"2026-05-20",title:"GSTR-3B — Apr 2026",auth:"GSTIN BOM+AMD",type:"GST",branch:"BOM+AMD",desc:"Pay CGST+SGST for April. Interest 18% p.a. if late."},
    {date:"2026-06-07",title:"TDS Deposit — May 2026",auth:"Income Tax Dept",type:"TDS",branch:"BOM+AMD",desc:"TDS u/s 194C, 194H, 194J for May. 7th or 30th Apr for March."},
    {date:"2026-06-11",title:"GSTR-1 — May 2026",auth:"GSTIN BOM+AMD",type:"GST",branch:"BOM+AMD",desc:"All outward supplies. File before GSTR-3B for ITC flow to buyers."},
    {date:"2026-06-15",title:"Advance Tax — Q1 FY27",auth:"Income Tax Dept",type:"IT",branch:"All",desc:"15% of annual advance tax estimate due by 15 June."},
    {date:"2026-06-20",title:"GSTR-3B — May 2026",auth:"GSTIN BOM+AMD",type:"GST",branch:"BOM+AMD",desc:"Pay net GST (Output – ITC) for May 2026."},
    {date:"2026-06-30",title:"TDS Form 16A — Q4 FY26",auth:"Income Tax Dept",type:"TDS",branch:"BOM+AMD",desc:"Issue TDS certificates (Form 16A) to all vendors for Q4 FY 2025-26"},
    {date:"2026-07-07",title:"TDS Deposit — Jun 2026",auth:"Income Tax Dept",type:"TDS",branch:"BOM+AMD",desc:"TDS for June 2026"},
    {date:"2026-07-15",title:"TCS Return Q1 — 27EQ",auth:"Income Tax Dept",type:"TCS",branch:"BOM+AMD",desc:"TCS collected on overseas packages u/s 206C(1G) for Q1 FY27"},
    {date:"2026-09-15",title:"Advance Tax — Q2 FY27",auth:"Income Tax Dept",type:"IT",branch:"All",desc:"45% cumulative advance tax by 15 September."},
  ];

  const TYPE_CLR={GST:"#185FA5",VAT:"#27500A",TDS:"#854F0B",TCS:"#A32D2D",IT:"#1D9E75",WHT:"#384677"};
  const TYPE_BG ={GST:"#E6F1FB",VAT:"#EAF3DE",TDS:"#FAEEDA",TCS:"#FCEBEB",IT:"#EAF3DE",WHT:"#f3f4f8"};

  const daysLeft=d=>Math.ceil((new Date(d)-new Date(TODAY))/(1000*60*60*24));
  const overdue=deadlines.filter(d=>daysLeft(d.date)<0);
  const due7   =deadlines.filter(d=>daysLeft(d.date)>=0&&daysLeft(d.date)<=7);
  const upcoming=deadlines.filter(d=>daysLeft(d.date)>7);

  const DeadlineCard=({d})=>{
    const dl=daysLeft(d.date);
    return (
      <div style={{...card,borderLeft:`4px solid ${TYPE_CLR[d.type]||"#384677"}`,padding:"11px 14px",marginBottom:8,
        background:dl<0?"#FCEBEB":dl<=7?"#FFFAF0":"#fff"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,
                background:TYPE_BG[d.type]||"#f3f4f8",color:TYPE_CLR[d.type]||"#384677"}}>{d.type}</span>
              <span style={{fontSize:10,color:"#5a6691"}}>{d.branch}</span>
            </div>
            <p style={{margin:"0 0 2px",fontWeight:700,color:"#0d1326",fontSize:12}}>{d.title}</p>
            <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{d.desc}</p>
            <p style={{margin:"3px 0 0",fontSize:10,color:"#8b94b3"}}>{d.auth}</p>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <p style={{margin:0,fontWeight:700,color:dl<0?"#A32D2D":dl<=7?"#854F0B":"#27500A",fontSize:11}}>
              {dl<0?`${Math.abs(dl)}d OVERDUE`:dl===0?"TODAY":dl<=7?`${dl} days`:d.date}
            </p>
            <p style={{margin:"2px 0 0",fontSize:9.5,color:"#5a6691"}}>{d.date}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📅</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Tax Compliance Calendar</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>All compliance deadlines — India GST · TDS/TCS · Advance Tax</p>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:14}}>
        {[{l:"Overdue",v:String(overdue.length),c:"#A32D2D",bg:"#FCEBEB"},
          {l:"Due in 7 Days",v:String(due7.length),c:"#854F0B",bg:"#FAEEDA"},
          {l:"Upcoming",v:String(upcoming.length),c:"#27500A",bg:"#EAF3DE"},
          {l:"Total Tracked",v:String(deadlines.length),c:"#185FA5",bg:"#E6F1FB"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:22,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      {overdue.length>0&&<div>
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#A32D2D"}}>🔴 OVERDUE — Action Required Immediately</p>
        {overdue.map((d,i)=><DeadlineCard key={i} d={d}/>)}
        <div style={{marginBottom:14}}/>
      </div>}

      {due7.length>0&&<div>
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#854F0B"}}>⚠ DUE IN 7 DAYS</p>
        {due7.map((d,i)=><DeadlineCard key={i} d={d}/>)}
        <div style={{marginBottom:14}}/>
      </div>}

      <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#27500A"}}>✔ UPCOMING</p>
      {upcoming.map((d,i)=><DeadlineCard key={i} d={d}/>)}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PHASE 6 — LEAVE MANAGEMENT  /hr/leave
   ════════════════════════════════════════════════════════════════ */

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

export function TallyExport({branch}){
  const cfg=bc(branch);
  const brCode=branch==="ALL"?null:branch?.code;
  const [period,setPeriod]=useState(CUR_MONTH);
  const [exportType,setExportType]=useState("trial-balance");
  const PERIODS=MONTH_OPTIONS;
  const GP=useGpBills(branch).data||[];   // live booking bills (/api/accounting/gp-bills)

  const generateXML=()=>{
    const bills=GP.filter(b=>(!brCode||b.branch===brCode)&&(b.date||'').startsWith(period));
    const totRev=bills.reduce((s,b)=>s+b.sell,0);
    const totCost=bills.reduce((s,b)=>s+b.cost,0);

    const xml=`<?xml version="1.0" encoding="UTF-8"?>
<!-- KBiz360 Tally Export — ${exportType} — ${period} -->
<!-- Generated: ${new Date().toISOString()} -->
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${branch?.entity||"Travkings Tours &amp; Travels"}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <!-- Trial Balance Ledgers -->
          <GROUP NAME="Sales Revenue" RESERVEDNAME="">
            <PARENT>Primary</PARENT>
          </GROUP>
          <LEDGER NAME="Sales - Flight Tickets">
            <PARENT>Sales Revenue</PARENT>
            <OPENINGBALANCE>${bills.filter(b=>b.mod==="Flight").reduce((s,b)=>s+b.sell,0)}</OPENINGBALANCE>
          </LEDGER>
          <LEDGER NAME="Sales - Holiday Packages">
            <PARENT>Sales Revenue</PARENT>
            <OPENINGBALANCE>${bills.filter(b=>b.mod==="Holiday").reduce((s,b)=>s+b.sell,0)}</OPENINGBALANCE>
          </LEDGER>
          <LEDGER NAME="Cost of Sales">
            <PARENT>Direct Expenses</PARENT>
            <OPENINGBALANCE>${totCost}</OPENINGBALANCE>
          </LEDGER>
          <!-- GP: ${totRev - totCost} | Bookings: ${bills.length} -->
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    const blob=new Blob([xml],{type:"text/xml;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`KBiz360_Tally_Export_${exportType}_${period}_${brCode||"ALL"}.xml`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  };

  return (
    <div style={{padding:"12px 10px",maxWidth:800,margin:"0 auto"}}>
      <SampleBanner note="The generated Tally XML is a SUMMARY of sales/cost ledgers (derived from live GP bills) for the period — it does NOT yet emit full ledger masters, individual vouchers, or party balances. The export-type selector affects the label only; use the accounting reports for full detail until the complete Tally export is built." />
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📤</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Tally XML Export</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Export KBiz360 data as Tally-compatible XML for statutory accounting</p>
        </div>
      </div>

      <div style={{...card,marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <FL label="Export type"><select value={exportType} onChange={e=>setExportType(e.target.value)} style={inp}>
            <option value="trial-balance">Trial Balance</option>
            <option value="ledgers">Ledger Accounts</option>
            <option value="vouchers">All Vouchers</option>
            <option value="party-masters">Party Masters (Debtors/Creditors)</option>
          </select></FL>
          <FL label="Period"><select value={period} onChange={e=>setPeriod(e.target.value)} style={inp}>
            {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select></FL>
        </div>
        <div style={{padding:"12px 14px",borderRadius:9,background:"#f3f4f8",marginBottom:16}}>
          <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#0d1326"}}>What will be exported:</p>
          {exportType==="trial-balance"&&<p style={{margin:0,fontSize:11,color:"#5a6691"}}>All ledger closing balances for {period} in Tally XML format. Import into Tally: Gateway → Import → XML.</p>}
          {exportType==="ledgers"&&<p style={{margin:0,fontSize:11,color:"#5a6691"}}>Full ledger transaction list for {period}. Creates ledger masters + all Dr/Cr entries.</p>}
          {exportType==="vouchers"&&<p style={{margin:0,fontSize:11,color:"#5a6691"}}>All vouchers (sales, purchase, receipts, payments) for {period} as Tally voucher XML.</p>}
          {exportType==="party-masters"&&<p style={{margin:0,fontSize:11,color:"#5a6691"}}>All client and supplier masters with opening balances — for Tally party master creation.</p>}
        </div>
        <button onClick={generateXML} style={{...btnG,width:"100%",fontSize:12,padding:"11px"}}>⬇ Generate & Download Tally XML</button>
      </div>

      <div style={{...card,background:"#E6F1FB",border:"1px solid #B5D4F4",fontSize:10,color:"#185FA5"}}>
        <b>How to import in Tally:</b> Open Tally ERP 9 or Tally Prime → Gateway of Tally → Import → XML → Browse to downloaded file → Import. Ensure company name matches exactly. Recommended: import into a test company first to verify data before the live company.
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   PRIORITY 1 — FINANCE VOUCHERS (Complete Rebuild)
   Receipt · Payment · Journal · Contra
   With: ledger autocomplete · TDS auto-calc · Dr=Cr validation
   ════════════════════════════════════════════════════════════════ */

/* ── GLOBAL LEDGER REGISTRY (used by all finance vouchers) ──── */

export function TaxTdsTcs({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:(branch?.code||null);   // null = consolidated (all branches)
  const [tab,setTab]=useState("tds"); // tds | tcs | challan
  const [period,setPeriod]=useState(CUR_MONTH);
  const PERIODS=MONTH_OPTIONS;
  const [tdsEntries,setTdsEntries]=useState(_TDS_ENTRIES);
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [form,setForm]=useState({payee:"",pan:"",section:"194C",nature:"",gross:0,date:""});

  const tFiltered=tdsEntries.filter(t=>(t.date||'').startsWith(period));
  const totTds=tFiltered.reduce((s,t)=>s+t.tds,0);
  const totPending=tFiltered.filter(t=>t.status!=="Deposited").reduce((s,t)=>s+t.tds,0);
  const totTcs=_TCS_ENTRIES.filter(t=>(t.date||'').startsWith(period)).reduce((s,t)=>s+t.tcs,0);
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");

  const markDeposited=(id)=>setTdsEntries(ts=>ts.map(t=>t.id===id?{...t,status:"Deposited",challanDate:"2026-05-"+new Date().getDate().toString().padStart(2,"0"),challanBsr:"0600115",challanSerial:String(Math.floor(Math.random()*90000)+10000)}:t));

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📋</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>TDS / TCS Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{brCode||"All branches"} · {PERIODS.find(p=>p.v===period)?.l} · TDS due 7th · Form 26Q / 27EQ data</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          {tab==="tds"&&<button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Add TDS Entry</button>}
        </div>
      </div>

      {totPending>0&&<div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600,display:"flex",gap:8}}>
        <AlertTriangle size={14}/> {f(totPending)} TDS pending deposit — deposit by 7th of next month to avoid interest (1.5%/mo) and penalty
      </div>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[{l:"TDS Deducted",v:f(totTds),c:"#854F0B",bg:"#FAEEDA"},
          {l:"TDS Pending Deposit",v:f(totPending),c:"#A32D2D",bg:"#FCEBEB"},
          {l:"TCS Collected",v:f(totTcs),c:"#185FA5",bg:"#E6F1FB"},
          {l:"TDS Entries",v:String(tFiltered.length),c:"#384677",bg:"#f3f4f8"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:mob?17:21,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,background:"#f3f4f8",borderRadius:"9px 9px 0 0",border:"1px solid #cdd1d8",overflow:"hidden",marginBottom:0}}>
        <button onClick={()=>setTab("tds")} style={{padding:"8px 14px",border:"none",cursor:"pointer",fontWeight:tab==="tds"?700:500,background:tab==="tds"?"#fff":"transparent",borderRadius:6,fontSize:11}}>TDS Register (194C/H/J/D)</button><button onClick={()=>setTab("tcs")} style={{padding:"8px 14px",border:"none",cursor:"pointer",fontWeight:tab==="tcs"?700:500,background:tab==="tcs"?"#fff":"transparent",borderRadius:6,fontSize:11}}>TCS Register (206C 1G)</button><button onClick={()=>setTab("lower")} style={{padding:"8px 14px",border:"none",cursor:"pointer",fontWeight:tab==="lower"?700:500,background:tab==="lower"?"#fff":"transparent",borderRadius:6,fontSize:11}}>Lower Deduction Certs</button>
      </div>

      {tab==="tds"&&(
        <div style={{...card,padding:0,overflow:"hidden",borderTop:"none",borderRadius:"0 0 9px 9px"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Date","Payee","PAN","Section","Nature","Gross","Rate","TDS Amt","Net Paid","Challan/Status","Action"].map((h,i)=>(
                <th key={i} style={{padding:"8px 10px",textAlign:i>=5&&i<=7?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{tFiltered.map((t,i)=>(
              <tr key={t.id} style={{borderBottom:"1px solid #dfe2e7",background:t.status!=="Deposited"?"#fffaf0":i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"7px 10px",color:"#5a6691",whiteSpace:"nowrap"}}>{t.date}</td>
                <td style={{padding:"7px 10px",fontWeight:600,color:"#0d1326"}}>{t.payee}</td>
                <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:9.5,color:"#5a6691"}}>{t.pan}</td>
                <td style={{padding:"7px 10px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#FAEEDA",color:"#854F0B",fontWeight:700}}>{t.section}</span></td>
                <td style={{padding:"7px 10px",fontSize:10.5,color:"#384677"}}>{t.nature}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(t.gross)}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:"#854F0B"}}>{t.rate}%</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{f(t.tds)}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(t.net)}</td>
                <td style={{padding:"7px 10px"}}>
                  {t.status==="Deposited"
                    ?<div>
                      <p style={{margin:0,fontSize:9.5,color:"#27500A",fontWeight:700}}>✔ Deposited</p>
                      <p style={{margin:0,fontSize:8.5,color:"#5a6691"}}>{t.challanDate} · BSR {t.challanBsr}</p>
                    </div>
                    :<span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,background:"#FCEBEB",color:"#A32D2D",fontWeight:700}}>Pending</span>
                  }
                </td>
                <td style={{padding:"7px 10px"}}>
                  {t.status!=="Deposited"&&<button onClick={()=>markDeposited(t.id)} style={{...btnG,padding:"2px 8px",fontSize:9.5,background:"#27500A",whiteSpace:"nowrap"}}>Mark Paid</button>}
                </td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
              <td colSpan={5} style={{padding:"8px 10px",fontWeight:700,color:"#d4a437",fontSize:11}}>TOTAL — {tFiltered.length} entries · 26Q basis</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(tFiltered.reduce((s,t)=>s+t.gross,0))}</td>
              <td style={{padding:"8px 10px",textAlign:"right",color:"#8b94b3"}}/>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totTds)}</td>
              <td colSpan={3}/>
            </tr></tfoot>
          </table>
        </div>
      )}

      {tab==="tcs"&&(
        <div style={{...card,padding:0,overflow:"hidden",borderTop:"none",borderRadius:"0 0 9px 9px"}}>
          <div style={{padding:"10px 14px",background:"#E6F1FB",borderBottom:"1px solid #B5D4F4",fontSize:10.5,color:"#185FA5"}}>
            <b>TCS u/s 206C(1G)</b> — TCS must be collected from buyer when booking international holiday packages &gt; ₹7,00,000. Rate: 5% (PAN provided) / 10% (No PAN). Deposit by 7th of next month. Quarterly return: Form 27EQ.
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Date","Client","PAN","Section","Nature","Package Value","Rate","TCS Collected","Deposit Due","Status"].map((h,i)=>(
                <th key={i} style={{padding:"8px 10px",textAlign:i>=5&&i<=7?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{_TCS_ENTRIES.filter(t=>(t.date||'').startsWith(period)).map((t,i)=>(
              <tr key={t.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"7px 10px",color:"#5a6691"}}>{t.date}</td>
                <td style={{padding:"7px 10px",fontWeight:600,color:"#0d1326"}}>{t.collector}</td>
                <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:9.5}}>{t.pan}</td>
                <td style={{padding:"7px 10px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{t.section}</span></td>
                <td style={{padding:"7px 10px",fontSize:10.5,color:"#384677"}}>{t.nature}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>₹{t.gross.toLocaleString()}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:"#185FA5"}}>{t.rate}%</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>₹{t.tcs.toLocaleString()}</td>
                <td style={{padding:"7px 10px",color:"#5a6691",whiteSpace:"nowrap"}}>{t.depositDue}</td>
                <td style={{padding:"7px 10px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,background:"#EAF3DE",color:"#27500A",fontWeight:700}}>{t.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab==="challan"&&(
        <div style={{...card,borderTop:"none",borderRadius:"0 0 9px 9px"}}>
          <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Challan Summary — {PERIODS.find(p=>p.v===period)?.l}</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:12}}>
            {Object.entries(TDS_SECTIONS).filter(([k])=>k!=="None").map(([sec,def])=>{
              const secEntries=tFiltered.filter(t=>t.section===sec);
              const secTotal=secEntries.reduce((s,t)=>s+t.tds,0);
              if(secEntries.length===0)return null;
              return (
                <div key={sec} style={{padding:"12px 14px",borderRadius:9,border:"1px solid #cdd1d8",background:"#f9fafb"}}>
                  <p style={{margin:"0 0 4px",fontSize:12,fontWeight:700,color:"#0d1326"}}>{sec}</p>
                  <p style={{margin:"0 0 8px",fontSize:10.5,color:"#5a6691"}}>{def.label.split("—")[1]?.trim()||def.label}</p>
                  <p style={{margin:"0 0 4px",fontSize:16,fontWeight:800,color:"#854F0B"}}>₹{secTotal.toLocaleString()}</p>
                  <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{secEntries.length} deductions · Due: 7th Jun 2026</p>
                  <div style={{marginTop:8}}>
                    <div style={{display:"flex",gap:8,fontSize:9.5,color:"#5a6691"}}>
                      <span>BSR Code:</span><input style={{flex:1,border:"1px solid #cdd1d8",borderRadius:4,padding:"2px 6px",fontSize:10,fontFamily:"monospace"}} placeholder="BSRXXX"/>
                      <span>S.No.:</span><input style={{width:60,border:"1px solid #cdd1d8",borderRadius:4,padding:"2px 6px",fontSize:10,fontFamily:"monospace"}} placeholder="00000"/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Record TDS Deduction</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Date"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={inp}/></FL>
                <FL label="TDS Section"><select value={form.section} onChange={e=>setForm(f=>({...f,section:e.target.value}))} style={inp}>
                  {Object.entries(TDS_SECTIONS).filter(([k])=>k!=="None").map(([k,v])=><option key={k} value={k}>{k} — {v.rate}%</option>)}
                </select></FL>
              </div>
              <FL label="Payee name"><input value={form.payee} onChange={e=>setForm(f=>({...f,payee:e.target.value}))} style={inp}/></FL>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Payee PAN"><input value={form.pan} onChange={e=>setForm(f=>({...f,pan:e.target.value.toUpperCase()}))} style={{...inp,fontFamily:"monospace"}} maxLength={10}/></FL>
                <FL label="Nature of payment"><input value={form.nature} onChange={e=>setForm(f=>({...f,nature:e.target.value}))} style={inp}/></FL>
              </div>
              <FL label="Gross amount"><input type="number" value={form.gross} onChange={e=>{const g=+e.target.value;setForm(f=>({...f,gross:g}));}} style={inp}/></FL>
              {form.gross>0&&TDS_SECTIONS[form.section]&&<div style={{padding:"8px 12px",borderRadius:8,background:"#FAEEDA",fontSize:10,color:"#854F0B"}}>
                TDS @ {TDS_SECTIONS[form.section].rate}% = ₹{Math.round(form.gross*TDS_SECTIONS[form.section].rate/100).toLocaleString()} · Net payable: ₹{Math.round(form.gross*(1-TDS_SECTIONS[form.section].rate/100)).toLocaleString()}
              </div>}
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={()=>{
                const tds=Math.round(form.gross*(TDS_SECTIONS[form.section]?.rate||0)/100);
                const id=`TDS${String(tdsEntries.length+1).padStart(3,"0")}`;
                setTdsEntries(ts=>[...ts,{...form,id,tds,net:form.gross-tds,status:"Pending",quarter:"Q1 FY27",challanBsr:"",challanDate:"",challanSerial:""}]);
                setModal(false);
              }} style={{...btnG,background:"#854F0B"}}>Record TDS</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SALES HOLIDAY — ENHANCED with GST scheme + component breakout
   ════════════════════════════════════════════════════════════════ */

/* Form 26AS — TDS-receivable view, LIVE from the books: the TDS Receivable
   chart ledgers' Dr accruals (a customer/supplier withheld tax on us), grouped
   by deductor × section. The 26AS side itself lives on TRACES and is NOT in the
   system — that column stays honestly blank until a 26AS import exists (same
   stance as the GSTR-2B reconciliation). */
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

export function EWayBill({branch}){
  const brCode=branch==="ALL"?null:(branch?.code||null);   // null = consolidated (all branches)
  const [period,setPeriod]=useState(CUR_MONTH);
  const EWB_THRESHOLD=50000; // e-way bill required for goods movement ≥ ₹50,000
  const GP=useGpBills(branch).data||[];   // live booking bills (/api/accounting/gp-bills)
  // Candidates: posted sale invoices ≥ ₹50,000 for the period. Most of the book is
  // services (no e-way bill needed) — this register flags the invoices that COULD
  // need one (MICE materials / tour kits / merchandise) so nothing slips by value.
  const candidates=saleBills(GP,brCode,{from:`${period}-01`,to:`${period}-31`}).filter(b=>(+b.sell||0)>=EWB_THRESHOLD);
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");

  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📦</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>E-Way Bill Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{brCode||"All branches"} · {monthLabel(period)} · invoices ≥ ₹50,000 from the live books · ewaybillgst.gov.in</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {MONTH_OPTIONS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <button disabled title={GSP_NOTE} aria-disabled="true" style={{...btnG,fontSize:11,opacity:0.5,cursor:"not-allowed"}}><Plus size={13}/> Generate E-Way Bill</button>
        </div>
      </div>

      <div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:10.5,color:"#854F0B",fontWeight:600}}>
        🔌 {GSP_NOTE}. Candidate invoices below are live from the books; EWB numbers fill in once the provider is connected.
      </div>
      <div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#E6F1FB",border:"1px solid #B5D4F4",fontSize:10.5,color:"#185FA5"}}>
        <b>When required:</b> Movement of goods valued ≥ ₹50,000 between states or within state (Maharashtra). Applicable for MICE materials, tour kits, and promotional goods — NOT for pure service invoices. Validity: 200 km/day; expires at midnight.
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Invoice / file ref","Date","Party","Module","Invoice value","EWB No.","Status"].map((h,i)=>(
              <th key={i} style={{padding:"8px 10px",textAlign:i===4?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {candidates.length===0&&<tr><td colSpan={7} style={{padding:"24px",textAlign:"center",color:"#5a6691"}}>No sale invoices ≥ ₹50,000 for {monthLabel(period)} — nothing needs an e-way bill this period.</td></tr>}
            {candidates.map((b,i)=>(
              <tr key={b.id+i} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:9.5,color:"#185FA5"}}>{b.id}</td>
                <td style={{padding:"7px 10px",color:"#5a6691",whiteSpace:"nowrap"}}>{b.date}</td>
                <td style={{padding:"7px 10px",fontWeight:600,color:"#0d1326"}}>{b.client}</td>
                <td style={{padding:"7px 10px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{b.mod}</span></td>
                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(b.sell)}</td>
                <td style={{padding:"7px 10px",fontSize:10,color:"#8b94b3",whiteSpace:"nowrap"}}>— awaiting GSP provider</td>
                <td style={{padding:"7px 10px"}}><span title={GSP_NOTE} style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:"#f3f4f8",color:"#5a6691"}}>Not generated</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   FIXED ASSETS MODULE — Register, Depreciation, Disposal, Blocks
   ════════════════════════════════════════════════════════════════ */


/* GSTR-9C — LIVE books-vs-returns reconciliation.
   · Turnover per books  = Sales Accounts total from /api/accounting/profit-and-loss
   · Turnover per GSTR   = GST base of the posted sale invoices (/api/accounting/gp-bills,
                           the same source the GSTR-1 screen files from)
   · Tax per books       = /api/accounting/tax-summary (Output − ITC from the tax ledgers)
   Adjustments that live OUTSIDE the system (unbilled revenue, post-FY credit notes,
   audited-FS adjustments, figures actually filed) are explicit MANUAL rows that
   default 0 and persist per branch × FY via /api/app-config. */
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
    <input type="number" value={mVal(k)} placeholder="0"
      onChange={e=>setEdits(s=>({...s,[k]:e.target.value}))} onBlur={commitManual}
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
export const GSTR_FILING_STATUS = [];


export function Form16Generator(){
  const [selEmp,setSelEmp]=useState("");
  const [fy,setFy]=useState(CUR_FY.label);
  return(
    <PHASE2_Page title="Form 16 Generator — India" subtitle="Annual salary certificate for income tax filing · generated from payroll data"
      toolbar={<><select value={selEmp} onChange={e=>setSelEmp(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}>{[].map(e=><option key={e}>{e}</option>)}</select><select value={fy} onChange={e=>setFy(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}>{fyOptions().map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select><button onClick={()=>openPrintPreview({ selector: 'main', title: 'Taxation', recommend: 'portrait' })} style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>📥 Download Form 16</button></>}>
      <SampleBanner note="Form 16 figures are sample data, not an issued certificate." />
      <div style={{maxWidth:760,margin:"0 auto",background:"#fff",border:"2px solid #0d1326",borderRadius:6,overflow:"hidden",fontSize:12}}>
        {/* Header */}
        <div style={{padding:"12px 20px",background:"#0d1326",color:"#fff",textAlign:"center"}}>
          <p style={{margin:0,fontSize:14,fontWeight:700,letterSpacing:"1px"}}>FORM 16</p>
          <p style={{margin:"3px 0 0",fontSize:11,color:"#d4a437"}}>Certificate under section 203 of the Income-tax Act, 1961 · FY {fy}</p>
        </div>
        {/* Part A */}
        <div style={{padding:"14px 20px",borderBottom:"2px solid #0d1326"}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,background:"#0d1326",color:"#d4a437",padding:"4px 10px",display:"inline-block"}}>PART A — TDS Details</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11.5}}>
            {[{l:"Employer (Deductor) Name",v:"Travkings Tours & Travels Pvt. Ltd."},{l:"Employer PAN",v:"AAACT1234A"},{l:"Employer TAN",v:"MUMA12345B"},{l:"Employee Name",v:""},{l:"Employee PAN",v:""},{l:"Assessment Year",v:fy==="2025-26"?"2026-27":"2025-26"},{l:"Period of Employment",v:"01-Apr-2025 to 31-Mar-2026"},{l:"TDS Deposited",v:""}].map(f=>(
              <div key={f.l} style={{display:"flex",gap:6,padding:"4px 0",borderBottom:"1px solid #dfe2e7"}}><span style={{color:"#5a6691",minWidth:180}}>{f.l}</span><b>{f.v}</b></div>
            ))}
          </div>
        </div>
        {/* Part B */}
        <div style={{padding:"14px 20px"}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,background:"#0d1326",color:"#d4a437",padding:"4px 10px",display:"inline-block"}}>PART B — Computation of Income</p>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <tbody>{[
              {desc:"Gross Salary (12 months)",         amount:576000},
              {desc:"Less: HRA Exemption (Sec 10(13A))",amount:-89600},
              {desc:"Less: Transport Allowance",         amount:-19200},
              {desc:"Net Salary",                        amount:467200, bold:true},
              {desc:"Less: 80C (PPF + LIC)",             amount:-120000},
              {desc:"Less: 80D (Health Insurance)",      amount:-18000},
              {desc:"Less: 80G (Donations)",             amount:-5000},
              {desc:"Taxable Income",                    amount:324200, bold:true},
              {desc:"Tax on Income (5% slab up to ₹5L)",amount:7210},
              {desc:"Rebate u/s 87A",                   amount:-7210},
              {desc:"Net Tax Payable",                   amount:0, bold:true},
              {desc:"Education Cess (4%)",               amount:0},
              {desc:"Total TDS Deducted",                amount:22200, bold:true},
            ].map((r,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:r.bold?"#fafbfd":"#fff"}}>
                <td style={{padding:"5px 8px",fontWeight:r.bold?700:400,paddingLeft:r.amount<0?20:8}}>{r.desc}</td>
                <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"monospace",fontWeight:r.bold?700:400,color:r.amount<0?"#A32D2D":r.bold?"#0d1326":"#5a6691"}}>₹{Math.abs(r.amount).toLocaleString("en-IN")}</td>
              </tr>
            ))}</tbody>
          </table>
          <div style={{marginTop:20,paddingTop:14,borderTop:"2px solid #0d1326",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20}}>
            {["Prepared & Signed by (Employer)","Employee Signature","Date"].map(s=>(
              <div key={s} style={{textAlign:"center"}}><div style={{height:32,borderBottom:"1px solid #0d1326",marginBottom:4}}/><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{s}</p></div>
            ))}
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   7. PERFORMANCE REVIEW MODULE
   ════════════════════════════════════════════════════════════════════ */

// GSTR-1 B2B is generated from real sale vouchers — no bundled demo invoices.
export const GSTR1_B2B = [];


export const GSTR1_B2C = [];


export const GSTR3B_SUMMARY = {
  period:"April 2026",
  outwardSupplies:{taxable:12500000,exempt:450000,nilRated:0,nonGST:0,igst:1845000,cgst:972000,sgst:972000,cess:0},
  inwardRCM:{taxable:85000,igst:15300,cgst:0,sgst:0},
  itcAvailable:{igst:1240000,cgst:485000,sgst:485000,total:2210000},
  itcReversed:{igst:0,cgst:45000,sgst:45000,total:90000},
  netITC:2120000,
  taxPayable:{igst:605300,cgst:487000,sgst:487000,cess:0,total:1579300},
  taxFromITC:{igst:605300,cgst:487000,sgst:487000,total:1579300},
  cashPayable:0,
  interestPenalty:0,
};


export function GSTR1Prep(){
  const [period,setPeriod]=useState(CUR_MONTH);
  const [entity,setEntity]=useState("Head Office — 27AAACT1234A1ZF");
  const [tab,setTab]=useState("b2b");
  const totalB2BTaxable=GSTR1_B2B.reduce((s,r)=>s+r.taxable,0);
  const totalB2BTax=GSTR1_B2B.reduce((s,r)=>s+r.igst+r.cgst+r.sgst,0);
  const totalB2CTaxable=GSTR1_B2C.reduce((s,r)=>s+r.taxable,0);
  return(
    <PHASE2_Page title="GSTR-1 Auto-Prep" subtitle="Outward supplies auto-aggregated from sales vouchers · ready for JSON download"
      toolbar={<><select value={period} onChange={e=>setPeriod(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}>{MONTH_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select><select value={entity} onChange={e=>setEntity(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}><option>Head Office — 27AAACT1234A1ZF</option><option>BOM — 27AAACT5678B1ZG</option><option>AMD — 24AAACT9012C1ZH</option></select><button style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>📥 Download JSON</button><button style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>📤 File on GST Portal</button></>}>
      {/* Summary tiles */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Total Invoices",v:GSTR1_B2B.reduce((s,r)=>s+r.invoices,0)+GSTR1_B2C.length,c:"#0d1326"},{l:"B2B Taxable",v:fmtINR(totalB2BTaxable),c:"#3b82f6"},{l:"B2C Taxable",v:fmtINR(totalB2CTaxable),c:"#22c55e"},{l:"Total Tax",v:fmtINR(totalB2BTax),c:"#d4a437"},{l:"GSTR-1 Status",v:"Draft",c:"#f97316"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"4px 0 0",fontSize:16,fontWeight:700,color:"#0d1326"}}>{k.v}</p></div>
        ))}
      </div>
      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"1px solid #cdd1d8",background:"#fff",border:"1px solid #cdd1d8",borderRadius:"8px 8px 0 0",overflow:"hidden",marginBottom:0}}>
        {[{k:"b2b",l:"B2B Supplies"},{k:"b2c",l:"B2C Supplies"},{k:"hsn",l:"HSN Summary"}].map(t=><button key={t.k} onClick={()=>setTab(t.k)} style={tabBtnStyle(tab===t.k)}>{t.l}</button>)}
      </div>
      <div style={{background:"#fff",border:"1px solid #cdd1d8",borderTop:"none",borderRadius:"0 0 8px 8px",overflow:"hidden"}}>
        {tab==="b2b"&&(
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>GSTIN</th><th style={RPT_thStyle}>Recipient</th><th style={{...RPT_thStyle,textAlign:"center"}}>Invoices</th><th style={{...RPT_thStyle,textAlign:"right"}}>Taxable</th><th style={{...RPT_thStyle,textAlign:"right"}}>IGST</th><th style={{...RPT_thStyle,textAlign:"right"}}>CGST</th><th style={{...RPT_thStyle,textAlign:"right"}}>SGST</th><th style={{...RPT_thStyle,textAlign:"right"}}>Total</th></tr></thead>
            <tbody>{GSTR1_B2B.map(r=>(<tr key={r.gstin} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5}}>{r.gstin}</td><td style={{...RPT_tdStyle,fontWeight:600}}>{r.name}</td><td style={{...RPT_tdStyle,textAlign:"center"}}>{r.invoices}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{fmtINR(r.taxable)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#3b82f6"}}>{r.igst>0?fmtINR(r.igst):"—"}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e"}}>{r.cgst>0?fmtINR(r.cgst):"—"}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e"}}>{r.sgst>0?fmtINR(r.sgst):"—"}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(r.total)}</td></tr>))}
            <tr style={{background:"#fafbfd",fontWeight:700,borderTop:"2px solid #0d1326"}}><td style={{...RPT_tdStyle,fontWeight:700}} colSpan={2}>TOTAL B2B</td><td style={{...RPT_tdStyle,textAlign:"center",fontWeight:700}}>{GSTR1_B2B.reduce((s,r)=>s+r.invoices,0)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(totalB2BTaxable)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(GSTR1_B2B.reduce((s,r)=>s+r.igst,0))}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(GSTR1_B2B.reduce((s,r)=>s+r.cgst,0))}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(GSTR1_B2B.reduce((s,r)=>s+r.sgst,0))}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(GSTR1_B2B.reduce((s,r)=>s+r.total,0))}</td></tr></tbody>
          </table>
        )}
        {tab==="b2c"&&(
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Place of Supply</th><th style={{...RPT_thStyle,textAlign:"right"}}>Taxable</th><th style={{...RPT_thStyle,textAlign:"right"}}>Rate</th><th style={{...RPT_thStyle,textAlign:"right"}}>IGST</th><th style={{...RPT_thStyle,textAlign:"right"}}>CGST</th><th style={{...RPT_thStyle,textAlign:"right"}}>SGST</th></tr></thead>
            <tbody>{GSTR1_B2C.map(r=>(<tr key={r.place} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{...RPT_tdStyle,fontWeight:600}}>{r.place}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{fmtINR(r.taxable)}</td><td style={{...RPT_tdStyle,textAlign:"center"}}>{r.rate}%</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#3b82f6"}}>{r.igst>0?fmtINR(r.igst):"—"}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e"}}>{r.cgst>0?fmtINR(r.cgst):"—"}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e"}}>{r.sgst>0?fmtINR(r.sgst):"—"}</td></tr>))}</tbody>
          </table>
        )}
        {tab==="hsn"&&(
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>HSN/SAC</th><th style={RPT_thStyle}>Description</th><th style={{...RPT_thStyle,textAlign:"right"}}>Qty</th><th style={{...RPT_thStyle,textAlign:"right"}}>Taxable</th><th style={{...RPT_thStyle,textAlign:"right"}}>IGST</th><th style={{...RPT_thStyle,textAlign:"right"}}>CGST</th><th style={{...RPT_thStyle,textAlign:"right"}}>SGST</th></tr></thead>
            <tbody>{[{hsn:"996411",desc:"Air transport services",qty:284,taxable:8500000,igst:540000,cgst:405000,sgst:405000},{hsn:"996312",desc:"Hotel accommodation",qty:98,taxable:3200000,igst:192000,cgst:144000,sgst:144000},{hsn:"996519",desc:"Tour operator services",qty:142,taxable:2400000,igst:90000,cgst:90000,sgst:90000},{hsn:"999799",desc:"Visa facilitation",qty:412,taxable:520000,igst:0,cgst:46800,sgst:46800}].map(r=>(<tr key={r.hsn} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:700}}>{r.hsn}</td><td style={RPT_tdStyle}>{r.desc}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{r.qty}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{fmtINR(r.taxable)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#3b82f6"}}>{fmtINR(r.igst)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e"}}>{fmtINR(r.cgst)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e"}}>{fmtINR(r.sgst)}</td></tr>))}</tbody>
          </table>
        )}
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   11. GSTR-3B AUTO-PREP
   ════════════════════════════════════════════════════════════════════ */

export function GSTR3BPrep(){
  const d=GSTR3B_SUMMARY;
  const Section=({no,title,rows,highlight})=>(
    <div style={{...cardStyle,marginBottom:12}}>
      <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#fff",background:"#0d1326",padding:"6px 10px",borderRadius:4}}>Table {no} — {title}</p>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
        {rows.map((row,i)=>(
          <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:row.bold?"#fafbfd":"#fff"}}>
            <td style={{...RPT_tdStyle,fontWeight:row.bold?700:400,paddingLeft:row.sub?24:12}}>{row.label}</td>
            <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:highlight==="gst"?"#3b82f6":"#0d1326",fontWeight:row.bold?700:500}}>{row.igst!==undefined?fmtINR(row.igst):"—"}</td>
            <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:highlight==="gst"?"#22c55e":"#0d1326",fontWeight:row.bold?700:500}}>{row.cgst!==undefined?fmtINR(row.cgst):"—"}</td>
            <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:highlight==="gst"?"#22c55e":"#0d1326",fontWeight:row.bold?700:500}}>{row.sgst!==undefined?fmtINR(row.sgst):"—"}</td>
            {row.total!==undefined&&<td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,fontFamily:"monospace"}}>{fmtINR(row.total)}</td>}
          </tr>
        ))}
      </table>
    </div>
  );
  return(
    <PHASE2_Page title="GSTR-3B Auto-Prep" subtitle="Summary return auto-built from vouchers · April 2026 · 27AAACT1234A1ZF (Head Office)"
      toolbar={<><button style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>📥 Download JSON</button><button style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>📤 File on GST Portal</button></>}>
      <SampleBanner note="this GSTR-3B summary is sample data, not a live return." />
      {/* Liability summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Outward Tax",v:fmtINR(d.outwardSupplies.igst+d.outwardSupplies.cgst+d.outwardSupplies.sgst),c:"#A32D2D"},{l:"ITC Available",v:fmtINR(d.itcAvailable.total),c:"#22c55e"},{l:"Net ITC Applied",v:fmtINR(d.netITC),c:"#d4a437"},{l:"Cash Payment",v:fmtINR(d.cashPayable),c:"#22c55e"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"4px 0 0",fontSize:18,fontWeight:700,color:"#0d1326"}}>{k.v}</p></div>
        ))}
      </div>
      <Section no="3.1" title="Details of outward supplies" highlight="gst" rows={[
        {label:"Taxable supplies (other than zero rated)",igst:d.outwardSupplies.igst,cgst:d.outwardSupplies.cgst,sgst:d.outwardSupplies.sgst,total:d.outwardSupplies.igst+d.outwardSupplies.cgst+d.outwardSupplies.sgst},
        {label:"Exempt / nil rated / non-GST supplies",igst:0,cgst:0,sgst:0,total:d.outwardSupplies.exempt,sub:true},
      ]}/>
      <Section no="4" title="Eligible ITC" highlight="itc" rows={[
        {label:"ITC Available — IGST",igst:d.itcAvailable.igst,cgst:0,sgst:0,bold:false},
        {label:"ITC Available — CGST/SGST",igst:0,cgst:d.itcAvailable.cgst,sgst:d.itcAvailable.sgst},
        {label:"ITC Reversed",igst:0,cgst:d.itcReversed.cgst,sgst:d.itcReversed.sgst},
        {label:"Net ITC Available",igst:d.itcAvailable.igst,cgst:d.itcAvailable.cgst-d.itcReversed.cgst,sgst:d.itcAvailable.sgst-d.itcReversed.sgst,total:d.netITC,bold:true},
      ]}/>
      <Section no="6" title="Payment of tax" rows={[
        {label:"Tax payable",igst:d.taxPayable.igst,cgst:d.taxPayable.cgst,sgst:d.taxPayable.sgst,total:d.taxPayable.total,bold:true},
        {label:"Paid through ITC",igst:d.taxFromITC.igst,cgst:d.taxFromITC.cgst,sgst:d.taxFromITC.sgst,total:d.taxFromITC.total},
        {label:"Paid through Cash",igst:0,cgst:0,sgst:0,total:0,bold:true},
      ]}/>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   12. TDS CERTIFICATE FORM 16A GENERATOR
   ════════════════════════════════════════════════════════════════════ */

/* Form 16A — TDS certificates per deductee, LIVE from the TDS Payable chart
   ledgers: each Cr accrual (TDS withheld on a purchase/payment voucher) is a
   deduction entry, grouped per vendor for the selected FY quarter. Download
   renders the printable certificate (openPrintPreview) with the live figures.
   PAN/TAN/challan details are not tracked in the system — the certificate
   shows explicit fill-in blanks for them (no invented identifiers). */
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

export function TaxCalendarV2(){
  const [filter,setFilter]=useState("ALL");
  const TAX_CALENDAR_EVENTS=useTaxCalendar().data||[];   // DB-backed (/api/tax-calendar)
  // Add Due Date persists via /api/tax-calendar (admin-write CRUD) — the calendar
  // starts empty on a fresh db, so the team must be able to feed it from here.
  const qc=useQueryClient();
  const { create }=useMasterMutations('tax-calendar');
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [form,setForm]=useState({date:"",type:"GST",title:"",entity:"",amount:0});
  const saveEvent=()=>{
    if(create.isPending) return;
    if(!form.date||!form.title.trim()){toast('Due date and filing title are required','error');return;}
    create.mutate({...form,amount:+form.amount||0,status:'Upcoming',active:true},{
      onSuccess:()=>{qc.invalidateQueries({queryKey:['ref','tax-calendar']});toast('Due date added');setModal(false);setForm({date:"",type:"GST",title:"",entity:"",amount:0});},
      onError:(e)=>toast('Could not save — '+(e?.message||'unknown error'),'error'),
    });
  };
  const types=[...new Set(TAX_CALENDAR_EVENTS.map(e=>e.type))];
  const filtered=filter==="ALL"?TAX_CALENDAR_EVENTS:TAX_CALENDAR_EVENTS.filter(e=>e.type===filter);
  const overdue=TAX_CALENDAR_EVENTS.filter(e=>e.status==="Overdue").length;
  const dueToday=TAX_CALENDAR_EVENTS.filter(e=>e.status==="Due Today").length;
  const upcoming7=TAX_CALENDAR_EVENTS.filter(e=>e.status==="Upcoming"&&new Date(e.date)<=new Date("2026-05-27")).length;
  return(
    <PHASE2_Page title="Tax Calendar — Reminders" subtitle="All compliance filing dates · GST · TDS · PF · ESI · Advance Tax · VAT · ROC"
      toolbar={<><select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}><option value="ALL">All types</option>{types.map(t=><option key={t}>{t}</option>)}</select><button onClick={()=>setModal(true)} style={{padding:"7px 12px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>＋ Add Due Date</button><button style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>📅 Export to Calendar</button></>}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Overdue",v:overdue,c:"#A32D2D"},{l:"Due Today",v:dueToday,c:"#f97316"},{l:"Due This Week",v:upcoming7,c:"#d4a437"},{l:"Total Upcoming",v:TAX_CALENDAR_EVENTS.length,c:"#0d1326"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:k.c}}>{k.v}</p></div>
        ))}
      </div>
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Due Date</th><th style={RPT_thStyle}>Type</th><th style={RPT_thStyle}>Filing / Payment</th><th style={RPT_thStyle}>Entity</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th><th style={{...RPT_thStyle,textAlign:"center"}}>Days</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th><th style={{...RPT_thStyle,textAlign:"center"}}>Action</th></tr></thead>
          <tbody>{filtered.map((e,i)=>{
            const days=Math.round((new Date(e.date)-new Date("2026-05-20"))/86400000);
            return(
              <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:e.status==="Due Today"?"#fff8e8":"#fff"}}>
                <td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:600,color:days<=0?"#A32D2D":days<=7?"#f97316":"#0d1326"}}>{e.date}</td>
                <td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{e.type}</span></td>
                <td style={{...RPT_tdStyle,fontWeight:600}}>{e.title}</td>
                <td style={{...RPT_tdStyle,color:"#5a6691",fontSize:11}}>{e.entity}</td>
                <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:e.amount>0?700:400,color:e.amount>0?"#A32D2D":"#5a6691"}}>{e.amount>0?fmtINR(e.amount):"—"}</td>
                <td style={{...RPT_tdStyle,textAlign:"center",fontWeight:700,color:days<=0?"#A32D2D":days<=7?"#f97316":"#5a6691"}}>{days<=0?"DUE":days+"d"}</td>
                <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"3px 9px",borderRadius:3,fontSize:10,fontWeight:700,background:e.status==="Due Today"?"#f8d7da":e.status==="Filed"?"#d4edda":"#fff3cd",color:e.status==="Due Today"?"#721c24":e.status==="Filed"?"#155724":"#856404"}}>{e.status}</span></td>
                <td style={{...RPT_tdStyle,textAlign:"center"}}>
                  <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                    <button style={{padding:"3px 7px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>File</button>
                    <button style={{padding:"3px 7px",background:"#fff",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:3,fontSize:10,fontWeight:600,cursor:"pointer"}}>⏰</button>
                  </div>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22"}}>Add Statutory Due Date</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5b616e"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:10}}>
                <FL label="Due date"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={inp}/></FL>
                <FL label="Type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}>{["GST","TDS","TCS","PF","ESI","Advance Tax","VAT","ROC","IT Return","Other"].map(t=><option key={t}>{t}</option>)}</select></FL>
              </div>
              <FL label="Filing / payment"><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. GSTR-3B — June 2026" style={inp}/></FL>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:10}}>
                <FL label="Entity / branch"><input value={form.entity} onChange={e=>setForm(f=>({...f,entity:e.target.value}))} placeholder="e.g. Travkings BOM" style={inp}/></FL>
                <FL label="Amount (₹, optional)"><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} style={inp}/></FL>
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={saveEvent} style={btnG}>💾 Save Due Date</button>
            </div>
          </div>
        </div>
      )}
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SETTINGS — ADMIN POWER (8 screens)
   Doc Templates · Email/SMS Templates · Approval Matrix Builder
   Custom Fields · Field Access · Bulk Users · Permissions Matrix · Branding
   ════════════════════════════════════════════════════════════════════ */

/* ── Settings seed data ───────────────────────────────────────────── */

