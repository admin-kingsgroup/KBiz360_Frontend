/* ════════════════════════════════════════════════════════════════════
   MODULES/REPORTS.JSX
   Auto-generated from KBiz360_v2.jsx · 3434 lines · 29 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from 'react';
import { Download, Printer, Save, Search } from 'lucide-react';
import { Bar, Legend, Line } from 'recharts';
import { exportToCSV } from '../core/business-logic';
import { BRANCHES, CASH, EXP_ACTUALS, EXP_LEDGERS, FY_LIST, GP_BILLS, HR_EMPLOYEES_DATA, MODULE_ICONS } from '../core/data';
import { fmt, fmtINR } from '../core/format';
import { BUILDER_FIELD_CATALOG, DEMO_REPORT_DATA, DrillModal, ExportDropdown, GRP_COLORS, PKG_D, PKG_SC, PackagePnL, SAVED_VIEWS_DATA, SCHEDULED_REPORTS_DATA, Sparkline, SubAgentStatement, TAB_Page, cardStyle, getExpenseBudget, tabPanel } from '../core/helpers';
import { useBgtRefresh, useMobile } from '../core/hooks';
import { B, FL, KpiCard, RPT_tdStyle, RPT_thStyle, bc, btnG, btnGh, card, inp, inpStd, tabBtnStyle } from '../core/styles';
import { Dashboard } from './dashboard';
import { NotifPanel } from '../shell/NotifPanel';
import { PHASE2_Page } from '../shell/PHASE2_Page';

export function RptShell({title,subtitle,children,filters}){
  return (
    <div style={{padding:"12px 10px",maxWidth:1260,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div>
          <p style={{margin:0,fontSize:9.5,color:"#5a6691",letterSpacing:"0.5px",textTransform:"uppercase"}}>Reports</p>
          <h1 style={{margin:"3px 0 0",fontSize:21,fontWeight:700,color:"#0d1326",letterSpacing:"-0.02em"}}>{title}</h1>
          {subtitle&&<p style={{margin:"2px 0 0",fontSize:11,color:"#5a6691"}}>{subtitle}</p>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {filters}
          <button style={{...btnG,display:"flex",alignItems:"center",gap:5}}><Download size={13}/> Export</button>
        </div>
      </div>
      {children}
    </div>
  );
}


export function ReportPnL({branch}){
  const mob=useMobile();
  const cur=bc(branch).cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [period,setPeriod]=useState("2026-05");
  const [view,setView]=useState("pnl");
  const PERIODS=[{v:"2026-03",l:"Mar 2026"},{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"},{v:"YTD",l:"YTD 2026"}];
  const FY=["2026-04","2026-05"];
  const filt=p=>GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&(p==="YTD"?FY.includes(b.date.slice(0,7)):b.date.startsWith(p)));
  const filtA=p=>EXP_ACTUALS.filter(a=>(!brCode||a.br===brCode)&&(p==="YTD"?FY.includes(a.m):a.m===p));
  const bills=filt(period);
  const billsPrev=filt(period==="2026-05"?"2026-04":period==="2026-04"?"2026-03":"2026-02");
  const acts=filtA(period);
  const hr=HR_EMPLOYEES_DATA.filter(e=>!brCode||e.branch===brCode);
  const revenue=bills.reduce((s,b)=>s+b.sell,0);
  const cost   =bills.reduce((s,b)=>s+b.cost,0);
  const gp     =revenue-cost;
  const gpPct  =revenue>0?+(gp/revenue*100).toFixed(1):0;
  const SAL=acts.filter(a=>a.id==="SAL").reduce((s,a)=>s+a.a,0)||hr.reduce((s,e)=>s+e.basic+e.hra,0);
  const RNT=acts.filter(a=>a.id==="RNT").reduce((s,a)=>s+a.a,0)||60000;
  const GDS=acts.filter(a=>a.id==="GDS").reduce((s,a)=>s+a.a,0)||45000;
  const TEL=acts.filter(a=>a.id==="TEL").reduce((s,a)=>s+a.a,0)||18000;
  const ADV=acts.filter(a=>a.id==="ADV").reduce((s,a)=>s+a.a,0)||32000;
  const SOFT=acts.filter(a=>a.id==="SFT").reduce((s,a)=>s+a.a,0)||28000;
  const BNK=acts.filter(a=>a.id==="BNK").reduce((s,a)=>s+a.a,0)||8500;
  const DEPN=5000;
  const totalExp=SAL+RNT+GDS+TEL+ADV+SOFT+BNK+DEPN;
  const netPft=gp-totalExp;
  const netPct=revenue>0?+(netPft/revenue*100).toFixed(1):0;
  const prevRev=billsPrev.reduce((s,b)=>s+b.sell,0);
  const prevGP=billsPrev.reduce((s,b)=>s+b.sell-b.cost,0);
  const modMap={};
  bills.forEach(b=>{
    if(!modMap[b.mod])modMap[b.mod]={rev:0,cost:0};
    modMap[b.mod].rev+=b.sell;
    modMap[b.mod].cost+=b.cost;
  });
  const modRows=Object.entries(modMap).map(([mod,d])=>({
    mod,rev:d.rev,cost:d.cost,gp:d.rev-d.cost,
    gpPct:d.rev>0?+((d.rev-d.cost)/d.rev*100).toFixed(1):0
  })).sort((a,b)=>b.gp-a.gp);
  const f=n=>{
    const abs=Math.abs(n);
    const s=abs>=10000000?cur+(abs/10000000).toFixed(1)+"Cr":abs>=100000?cur+(abs/100000).toFixed(1)+"L":cur+Math.round(abs).toLocaleString("en-IN");
    return n<0?"("+s+")":s;
  };
  const periodLabel=(PERIODS.find(p=>p.v===period)||{l:period}).l;
  const Kpi=({label,value,sub,color,bg})=>(
    <div style={{background:bg,borderTop:"3px solid "+color,borderRadius:10,padding:"11px 13px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
      <p style={{margin:0,fontSize:9,fontWeight:700,color:color,textTransform:"uppercase"}}>{label}</p>
      <p style={{margin:"4px 0 2px",fontSize:mob?17:21,fontWeight:800,color:"#0d1326"}}>{value}</p>
      <p style={{margin:0,fontSize:10,color:"#5a6691"}}>{sub}</p>
    </div>
  );
  const expRows=[
    {label:"Salaries and Wages",value:SAL},
    {label:"Office Rent",value:RNT},
    {label:"GDS and Tech Charges",value:GDS},
    {label:"Telephone and Internet",value:TEL},
    {label:"Advertising",value:ADV},
    {label:"Software Subscriptions",value:SOFT},
    {label:"Bank Charges",value:BNK},
    {label:"Depreciation",value:DEPN},
  ];
  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Profit and Loss Statement</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{(brCode||"Travkings Group")+" · "+periodLabel+" · Live from voucher data"}</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <button onClick={()=>setView("pnl")} style={{...(view==="pnl"?btnG:btnGh),fontSize:11}}>Summary</button>
          <button onClick={()=>setView("module")} style={{...(view==="module"?btnG:btnGh),fontSize:11}}>By Module</button>
          <button style={{...btnGh,fontSize:11}}><Download size={12}/> Export</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        <Kpi label="Revenue" value={f(revenue)} sub={"Prev: "+f(prevRev)} color="#185FA5" bg="#E6F1FB"/>
        <Kpi label="Gross Profit" value={f(gp)} sub={"GP "+gpPct+"%"} color="#27500A" bg="#EAF3DE"/>
        <Kpi label="Total Expenses" value={f(totalExp)} sub={(revenue>0?Math.round(totalExp/revenue*100):0)+"% of rev"} color="#A32D2D" bg="#FCEBEB"/>
        <Kpi label="Net Profit" value={f(netPft)} sub={"Margin "+netPct+"%"} color={netPft>=0?"#1D9E75":"#A32D2D"} bg={netPft>=0?"#EAF3DE":"#FCEBEB"}/>
        <Kpi label="Bookings" value={String(bills.length)} sub={"Prev: "+String(billsPrev.length)} color="#384677" bg="#f3f4f8"/>
      </div>
      {view==="pnl"&&(
        <div style={{background:"#fff",borderRadius:10,boxShadow:"0 1px 6px rgba(0,0,0,0.06)",overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead>
              <tr style={{background:"#0d1326"}}>
                <th style={{padding:"10px 16px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:10}}>Item</th>
                <th style={{padding:"10px 12px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:10}}>Current</th>
                {prevRev>0&&<th style={{padding:"10px 12px",textAlign:"right",color:"#8b94b3",fontWeight:700,fontSize:10}}>Previous</th>}
                <th style={{padding:"10px 12px",textAlign:"right",color:"#8b94b3",fontWeight:700,fontSize:10}}>of Rev</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{borderBottom:"1px solid #f3f4f8"}}>
                <td style={{padding:"8px 16px",color:"#384677"}}>Revenue — Net Sales</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(revenue)}</td>
                {prevRev>0&&<td style={{padding:"8px 12px",textAlign:"right",color:"#bfc3d6",fontVariantNumeric:"tabular-nums"}}>{f(prevRev)}</td>}
                <td style={{padding:"8px 12px",textAlign:"right",color:"#5a6691"}}>100%</td>
              </tr>
              <tr style={{borderBottom:"1px solid #f3f4f8"}}>
                <td style={{padding:"8px 16px",color:"#A32D2D"}}>Less: Cost of Sales</td>
                <td style={{padding:"8px 12px",textAlign:"right",color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{f(-cost)}</td>
                {prevRev>0&&<td style={{padding:"8px 12px",textAlign:"right",color:"#bfc3d6",fontVariantNumeric:"tabular-nums"}}>{prevRev>0?f(-billsPrev.reduce((s,b)=>s+b.cost,0)):"—"}</td>}
                <td style={{padding:"8px 12px",textAlign:"right",color:"#5a6691"}}>{revenue>0?Math.round(cost/revenue*100):0}%</td>
              </tr>
              <tr style={{background:"#f9fafb",borderBottom:"2px solid #e1e3ec"}}>
                <td style={{padding:"11px 16px",fontWeight:700,color:"#27500A",fontSize:12}}>GROSS PROFIT</td>
                <td style={{padding:"11px 12px",textAlign:"right",fontWeight:800,color:"#27500A",fontSize:14,fontVariantNumeric:"tabular-nums"}}>{f(gp)}</td>
                {prevRev>0&&<td style={{padding:"11px 12px",textAlign:"right",color:"#bfc3d6",fontVariantNumeric:"tabular-nums"}}>{f(prevGP)}</td>}
                <td style={{padding:"11px 12px",textAlign:"right",fontWeight:700,color:"#27500A"}}>{gpPct}%</td>
              </tr>
              <tr style={{background:"#f3f4f8"}}>
                <td colSpan={4} style={{padding:"6px 16px",fontSize:9.5,fontWeight:800,color:"#384677",textTransform:"uppercase"}}>Indirect Expenses</td>
              </tr>
              {expRows.map((row,i)=>(
                <tr key={row.label} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"8px 16px 8px 24px",color:"#384677"}}>{row.label}</td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#A32D2D"}}>{f(-row.value)}</td>
                  {prevRev>0&&<td style={{padding:"8px 12px",textAlign:"right",color:"#bfc3d6"}}>—</td>}
                  <td style={{padding:"8px 12px",textAlign:"right",color:"#5a6691"}}>{revenue>0?Math.round(row.value/revenue*100):0}%</td>
                </tr>
              ))}
              <tr style={{background:"#f9fafb",borderBottom:"2px solid #e1e3ec"}}>
                <td style={{padding:"9px 16px",fontWeight:700,color:"#A32D2D"}}>Total Expenses</td>
                <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{f(-totalExp)}</td>
                {prevRev>0&&<td/>}
                <td style={{padding:"9px 12px",textAlign:"right",color:"#5a6691"}}>{revenue>0?Math.round(totalExp/revenue*100):0}%</td>
              </tr>
              <tr style={{background:"#fff"}}>
                <td style={{padding:"11px 16px",fontWeight:700,color:netPft>=0?"#27500A":"#A32D2D",fontSize:12}}>NET PROFIT / (LOSS)</td>
                <td style={{padding:"11px 12px",textAlign:"right",fontWeight:800,fontSize:14,fontVariantNumeric:"tabular-nums",color:netPft>=0?"#27500A":"#A32D2D"}}>{f(netPft)}</td>
                {prevRev>0&&<td/>}
                <td style={{padding:"11px 12px",textAlign:"right",fontWeight:700,color:netPct>=0?"#27500A":"#A32D2D"}}>{netPct}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {view==="module"&&(
        <div style={{background:"#fff",borderRadius:10,boxShadow:"0 1px 6px rgba(0,0,0,0.06)",overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead>
              <tr style={{background:"#0d1326"}}>
                <th style={{padding:"9px 12px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>Module</th>
                <th style={{padding:"9px 12px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:9.5}}>Revenue</th>
                <th style={{padding:"9px 12px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:9.5}}>Cost</th>
                <th style={{padding:"9px 12px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:9.5}}>GP</th>
                <th style={{padding:"9px 12px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:9.5}}>GP%</th>
              </tr>
            </thead>
            <tbody>
              {modRows.map((m,i)=>(
                <tr key={m.mod} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{m.mod}</td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(m.rev)}</td>
                  <td style={{padding:"8px 12px",textAlign:"right",color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{f(m.cost)}</td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#27500A",fontVariantNumeric:"tabular-nums"}}>{f(m.gp)}</td>
                  <td style={{padding:"8px 12px",textAlign:"right"}}>
                    <span style={{fontSize:10.5,padding:"2px 7px",borderRadius:999,fontWeight:800,background:m.gpPct>=15?"#EAF3DE":m.gpPct>=8?"#FAEEDA":"#FCEBEB",color:m.gpPct>=15?"#27500A":m.gpPct>=8?"#854F0B":"#A32D2D"}}>{m.gpPct}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
                <td style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL</td>
                <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(revenue)}</td>
                <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(cost)}</td>
                <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(gp)}</td>
                <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:gpPct>=12?"#5ab84b":"#FAC775"}}>{gpPct}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export function ReportBS({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [period,setPeriod]=useState("2026-05");
  const PERIODS=[{v:"2025-12",l:"Dec 2025"},{v:"2026-01",l:"Jan 2026"},{v:"2026-02",l:"Feb 2026"},
    {v:"2026-03",l:"Mar 2026"},{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"}];

  const FY_MONTHS=["2025-04","2025-05","2025-06","2025-07","2025-08","2025-09",
    "2025-10","2025-11","2025-12","2026-01","2026-02","2026-03"];
  const ytdMonths=FY_MONTHS.filter(m=>m<=period);
  const bills=GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&ytdMonths.includes(b.date.slice(0,7)));
  const actuals=EXP_ACTUALS.filter(a=>(!brCode||a.br===brCode)&&ytdMonths.includes(a.m));
  const hr=HR_EMPLOYEES_DATA.filter(e=>!brCode||e.branch===brCode);

  const revenue=bills.reduce((s,b)=>s+b.sell,0);
  const cogs=bills.reduce((s,b)=>s+b.cost,0);
  const expenses=actuals.reduce((s,a)=>s+a.a,0);
  const netProfit=revenue-cogs-expenses;
  const debtors=revenue*0.25;
  const creditors=cogs*0.18;
  const bank=Math.max(netProfit*0.6+revenue*0.15,0);
  const cash=expenses*0.08;
  const gstPayable=revenue*0.04-cogs*0.02;
  const advanceFromClients=revenue*0.04;
  const capital=250000;
  const retained=netProfit;
  const fixedAssets=120000;
  const deposits=30000;
  const tdsPayable=expenses*0.02;

  const ASSETS=[
    {section:"Fixed Assets",items:[
      {name:"Fixed Assets (net of depreciation)",amt:fixedAssets},
      {name:"Security Deposits & Advances",amt:deposits},
    ]},
    {section:"Current Assets",items:[
      {name:"Bank Accounts (all)",amt:bank,bold:false},
      {name:"Cash in Hand",amt:cash},
      {name:"Trade Receivables (clients)",amt:debtors},
      {name:"Advance to Suppliers",amt:cogs*0.03},
      {name:"Input GST/VAT Credit",amt:cogs*0.02},
      {name:"TDS Receivable",amt:expenses*0.01},
    ]},
  ];
  const LIABILITIES=[
    {section:"Capital & Reserves",items:[
      {name:"Proprietor's Capital",amt:capital},
      {name:"Retained Earnings (FY)",amt:Math.max(retained,0)},
    ]},
    {section:"Current Liabilities",items:[
      {name:"Trade Payables (suppliers)",amt:creditors},
      {name:"Advance from Clients",amt:advanceFromClients},
      {name:"GST / VAT Payable (net)",amt:Math.max(gstPayable,0)},
      {name:"TDS Payable",amt:tdsPayable},
      {name:"Salary Payable",amt:hr.reduce((s,e)=>s+(e.basic+e.hra+e.da)*0.05,0)},
    ]},
  ];

  const totAssets=ASSETS.flatMap(s=>s.items).reduce((s,i)=>s+i.amt,0);
  const totLiab  =LIABILITIES.flatMap(s=>s.items).reduce((s,i)=>s+i.amt,0);
  const f=n=>n>0?cur+Number(Math.round(n)).toLocaleString("en-IN"):"—";

  const Side=({title,sections,tot,accent})=>(
    <div style={{flex:1,minWidth:0}}>
      <div style={{background:accent,padding:"10px 14px",borderRadius:"9px 9px 0 0"}}>
        <p style={{margin:0,fontSize:13,fontWeight:800,color:"#fff"}}>{title}</p>
        <p style={{margin:"1px 0 0",fontSize:10,color:"rgba(255,255,255,0.7)"}}>{PERIODS.find(p=>p.v===period)?.l} · {brCode||"Travkings Group"}</p>
      </div>
      <div style={{border:`1px solid ${accent}40`,borderTop:"none",borderRadius:"0 0 9px 9px",overflow:"hidden"}}>
        {sections.map((sec,si)=>(
          <div key={si}>
            <div style={{background:"#f3f4f8",padding:"7px 14px",borderBottom:"1px solid #e1e3ec"}}>
              <p style={{margin:0,fontSize:10,fontWeight:700,color:"#384677",textTransform:"uppercase",letterSpacing:"0.5px"}}>{sec.section}</p>
            </div>
            {sec.items.map((item,ii)=>(
              <div key={ii} style={{display:"flex",justifyContent:"space-between",padding:"9px 14px",
                borderBottom:"1px solid #f3f4f8",background:"#fff"}}>
                <span style={{fontSize:11,color:"#384677"}}>{item.name}</span>
                <span style={{fontSize:11,fontWeight:600,fontVariantNumeric:"tabular-nums",color:accent}}>{f(item.amt)}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",padding:"11px 14px",
          background:accent,borderRadius:"0 0 9px 9px"}}>
          <span style={{fontWeight:800,color:"#fff",fontSize:13}}>TOTAL {title.toUpperCase()}</span>
          <span style={{fontWeight:800,color:"#fff",fontSize:15,fontVariantNumeric:"tabular-nums"}}>{f(tot)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Balance Sheet</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>
            Financial position as at end of {PERIODS.find(p=>p.v===period)?.l} · {brCode||"Travkings Group"}
          </p>
        </div>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
      </div>
      {Math.abs(totAssets-totLiab)>100
        ?<div style={{marginBottom:10,padding:"8px 14px",borderRadius:8,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600}}>⚠ Balance Sheet does not tally — difference: {f(Math.abs(totAssets-totLiab))}</div>
        :<div style={{marginBottom:10,padding:"8px 14px",borderRadius:8,background:"#EAF3DE",border:"1px solid #C0DD97",fontSize:10.5,color:"#27500A",fontWeight:600}}>✔ Balance Sheet tallied — Assets = Liabilities = {f(totAssets)}</div>
      }
      <div style={{display:"flex",gap:14,flexWrap:mob?"wrap":"nowrap"}}>
        <Side title="Assets"      sections={ASSETS}      tot={totAssets} accent="#185FA5"/>
        <Side title="Liabilities" sections={LIABILITIES} tot={totLiab}   accent="#0d1326"/>
      </div>
    </div>
  );
}

export function ReportCF({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [period,setPeriod]=useState("2026-05");
  const PERIODS=[{v:"2026-03",l:"Mar 2026"},{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"}];

  const bills=GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&b.date.startsWith(period));
  const actuals=EXP_ACTUALS.filter(a=>(!brCode||a.br===brCode)&&a.m===period);
  const hr=HR_EMPLOYEES_DATA.filter(e=>!brCode||e.branch===brCode);

  const revenue=bills.reduce((s,b)=>s+b.sell,0);
  const cogs=bills.reduce((s,b)=>s+b.cost,0);
  const expenses=actuals.reduce((s,a)=>s+a.a,0);
  const salaries=hr.reduce((s,e)=>s+(e.basic+e.hra+e.da+e.travel+e.medical-e.pf-e.esi-e.tds),0);
  const netProfit=revenue-cogs-expenses;
  const depn=actuals.filter(a=>a.id==="DEP").reduce((s,a)=>s+a.a,0);
  const debtorIncrease=revenue*0.08;
  const creditorDecrease=cogs*0.05;
  const advanceReceived=revenue*0.04;

  const operatingCF=netProfit+depn-debtorIncrease+creditorDecrease+advanceReceived;
  const investingCF=-15000; // minor asset purchase
  const financingCF=-salaries*0.03; // loan repayment equivalent
  const netCF=operatingCF+investingCF+financingCF;
  const openingCash=Math.abs(netProfit)*3.2;
  const closingCash=openingCash+netCF;

  const sections=[
    {title:"A. OPERATING ACTIVITIES",color:"#185FA5",bg:"#E6F1FB",rows:[
      {l:"Net Profit before tax",v:netProfit,bold:false},
      {l:"Add: Depreciation (non-cash)",v:depn,bold:false},
      {l:"Add: Advance from clients",v:advanceReceived,bold:false},
      {l:"Less: Increase in trade receivables"  ,v:-debtorIncrease,bold:false},
      {l:"Less: Decrease in trade payables",v:-creditorDecrease,bold:false},
      {l:"Net Cash from Operating Activities",v:operatingCF,bold:true,border:true},
    ]},
    {title:"B. INVESTING ACTIVITIES",color:"#27500A",bg:"#EAF3DE",rows:[
      {l:"Purchase of fixed assets / equipment",v:investingCF,bold:false},
      {l:"Net Cash from Investing Activities",v:investingCF,bold:true,border:true},
    ]},
    {title:"C. FINANCING ACTIVITIES",color:"#854F0B",bg:"#FAEEDA",rows:[
      {l:"Loan repayments / drawings",v:financingCF,bold:false},
      {l:"Net Cash from Financing Activities",v:financingCF,bold:true,border:true},
    ]},
  ];

  const f=n=>{const abs=Math.abs(Math.round(n));const fmt=cur+abs.toLocaleString("en-IN");return n<0?`(${fmt})`:fmt;};
  const clr=n=>n>=0?"#27500A":"#A32D2D";

  return (
    <div style={{padding:"12px 10px",maxWidth:900,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Cash Flow Statement</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Indirect method · {PERIODS.find(p=>p.v===period)?.l} · {brCode||"Travkings Group"}</p>
        </div>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
      </div>
      {sections.map((sec,si)=>(
        <div key={si} style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"10px 14px",background:sec.color}}>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:"#fff"}}>{sec.title}</p>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <tbody>{sec.rows.map((r,ri)=>(
              <tr key={ri} style={{background:r.border?"#f3f4f8":"#fff",borderTop:r.border?"2px solid #e1e3ec":"none",
                borderBottom:"1px solid #f3f4f8"}}>
                <td style={{padding:"9px 14px",fontWeight:r.bold?700:400,color:"#0d1326"}}>{r.l}</td>
                <td style={{padding:"9px 14px",textAlign:"right",fontWeight:r.bold?800:500,
                  fontVariantNumeric:"tabular-nums",color:r.bold?clr(r.v):r.v<0?"#A32D2D":"#384677",
                  fontSize:r.bold?13:11.5}}>{f(r.v)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ))}
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <tbody>
            <tr key="op" style={{background:"#fff",borderBottom:"1px solid #f3f4f8"}}>
                <td style={{padding:"11px 14px",fontWeight:400,color:"#0d1326"}}>Opening Cash &amp; Bank Balance</td>
                <td style={{padding:"11px 14px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#384677"}}>{f(openingCash)}</td>
              </tr>
              <tr key="nc" style={{background:"#fff",borderBottom:"1px solid #f3f4f8"}}>
                <td style={{padding:"11px 14px",fontWeight:400,color:"#0d1326"}}>Net Change in Cash (A+B+C)</td>
                <td style={{padding:"11px 14px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:clr(netCF)}}>{f(netCF)}</td>
              </tr>
              <tr key="cl" style={{background:"#0d1326",borderBottom:"1px solid #f3f4f8"}}>
                <td style={{padding:"11px 14px",fontWeight:800,color:"#d4a437",fontSize:16}}>Closing Cash &amp; Bank Balance</td>
                <td style={{padding:"11px 14px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#fff",fontSize:16,fontWeight:800}}>{f(closingCash)}</td>
              </tr>
          </tbody>
        </table>
      </div>
      <div style={{...card,background:"#E6F1FB",border:"1px solid #B5D4F4",fontSize:10,color:"#185FA5"}}>
        Cash Flow computed using indirect method: Net Profit + non-cash items ± working capital changes.
        Positive = cash generated, Negative (in brackets) = cash used.
      </div>
    </div>
  );
}

export function ReportReceivables({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [search,setSearch]=useState("");
  const TODAY="2026-05-19";

  /* Aggregate by client from GP_BILLS — simulate 75% collected, 25% outstanding */
  const clientMap={};
  GP_BILLS.filter(b=>!brCode||b.branch===brCode).forEach(b=>{
    if(!clientMap[b.client])clientMap[b.client]={client:b.client,branch:b.branch,invoices:[]};
    const outstanding=Math.round(b.sell*0.25);
    const daysOld=Math.floor((new Date(TODAY)-new Date(b.date))/(1000*60*60*24));
    if(outstanding>0)clientMap[b.client].invoices.push({vno:b.id,date:b.date,amount:b.sell,outstanding,daysOld});
  });

  const rows=Object.values(clientMap)
    .map(c=>{
      const tot=c.invoices.reduce((s,i)=>s+i.outstanding,0);
      const d0=c.invoices.filter(i=>i.daysOld<=30).reduce((s,i)=>s+i.outstanding,0);
      const d30=c.invoices.filter(i=>i.daysOld>30&&i.daysOld<=60).reduce((s,i)=>s+i.outstanding,0);
      const d60=c.invoices.filter(i=>i.daysOld>60&&i.daysOld<=90).reduce((s,i)=>s+i.outstanding,0);
      const d90=c.invoices.filter(i=>i.daysOld>90).reduce((s,i)=>s+i.outstanding,0);
      return {client:c.client,branch:c.branch,total:tot,d0:d0,d30:d30,d60:d60,d90:d90,invoices:c.invoices.length};
    })
    .filter(r=>r.total>0&&(!search||r.client.toLowerCase().includes(search.toLowerCase())))
    .sort((a,b)=>b.d90-a.d90||b.total-a.total);

  const totals=rows.reduce((s,r)=>({total:s.total+r.total,d0:s.d0+r.d0,d30:s.d30+r.d30,d60:s.d60+r.d60,d90:s.d90+r.d90}),{total:0,d0:0,d30:0,d60:0,d90:0});
  const f=n=>n>0?cur+Number(Math.round(n)).toLocaleString("en-IN"):"—";
  const ageBg=d=>d.d90>0?"#FCEBEB":d.d60>0?"#FAEEDA":"#fff";

  return (
    <div style={{padding:"12px 10px",maxWidth:1260,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Receivables Ageing</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>As on {TODAY} · {brCode||"Travkings Group"} · {rows.length} debtors</p>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search client..." style={{...inp,width:220,minHeight:32,fontSize:11}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #185FA5",padding:"11px 13px",background:"#E6F1FB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#185FA5",textTransform:"uppercase"}}>Total Outstanding</p><p style={{margin:"4px 0 0",fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>{f(totals.total)}</p></div>
          <div style={{...card,borderTop:"3px solid #27500A",padding:"11px 13px",background:"#EAF3DE"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#27500A",textTransform:"uppercase"}}>0–30 Days (current)</p><p style={{margin:"4px 0 0",fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>{f(totals.d0)}</p></div>
          <div style={{...card,borderTop:"3px solid #854F0B",padding:"11px 13px",background:"#FAEEDA"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#854F0B",textTransform:"uppercase"}}>31–60 Days</p><p style={{margin:"4px 0 0",fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>{f(totals.d30)}</p></div>
          <div style={{...card,borderTop:"3px solid #A32D2D",padding:"11px 13px",background:"#FCEBEB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#A32D2D",textTransform:"uppercase"}}>61–90 Days</p><p style={{margin:"4px 0 0",fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>{f(totals.d60)}</p></div>
          <div style={{...card,borderTop:"3px solid #7B1F1F",padding:"11px 13px",background:"#FCEBEB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#7B1F1F",textTransform:"uppercase"}}>90+ Days (overdue)</p><p style={{margin:"4px 0 0",fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>{f(totals.d90)}</p></div>
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Client","Branch","Invoices","Total Outstanding","0–30 Days","31–60 Days","61–90 Days","90+ Days","Status"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=2?"right":"left",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{rows.map((r,i)=>(
            <tr key={r.client} style={{borderBottom:"1px solid #f3f4f8",background:ageBg(r)}}>
              <td style={{padding:"9px 12px",fontWeight:600,color:"#0d1326"}}>{r.client}</td>
              <td style={{padding:"9px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:700,background:"#E6F1FB",color:"#185FA5"}}>{r.branch}</span></td>
              <td style={{padding:"9px 12px",textAlign:"right",color:"#5a6691"}}>{r.invoices}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(r.total)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:r.d0>0?"#27500A":"#bfc3d6"}}>{f(r.d0)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:r.d30>0?"#854F0B":"#bfc3d6"}}>{f(r.d30)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:r.d60>0?"#A32D2D":"#bfc3d6"}}>{f(r.d60)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:r.d90>0?"#7B1F1F":"#bfc3d6"}}>{f(r.d90)}</td>
              <td style={{padding:"9px 12px"}}>
                <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,
                  background:r.d90>0?"#FCEBEB":r.d60>0?"#FAEEDA":"#EAF3DE",
                  color:r.d90>0?"#A32D2D":r.d60>0?"#854F0B":"#27500A"}}>
                  {r.d90>0?"Overdue":r.d60>0?"At risk":"Current"}
                </span>
              </td>
            </tr>
          ))}</tbody>
          <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={3} style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL — {rows.length} clients</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(totals.total)}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totals.d0)}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totals.d30)}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totals.d60)}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(totals.d90)}</td>
            <td/>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

export function ReportPayables({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [search,setSearch]=useState("");
  const TODAY="2026-05-19";

  const suppMap={};
  GP_BILLS.filter(b=>!brCode||b.branch===brCode).forEach(b=>{
    if(!suppMap[b.supplier])suppMap[b.supplier]={supplier:b.supplier,branch:b.branch,items:[]};
    const owed=Math.round(b.cost*0.20);
    const daysOld=Math.floor((new Date(TODAY)-new Date(b.date))/(1000*60*60*24));
    if(owed>0)suppMap[b.supplier].items.push({vno:b.id,date:b.date,cost:b.cost,owed,daysOld,mod:b.mod});
  });

  const rows=Object.values(suppMap)
    .map(s=>{
      const tot=s.items.reduce((x,i)=>x+i.owed,0);
      const d0 =s.items.filter(i=>i.daysOld<=7 ).reduce((x,i)=>x+i.owed,0); // BSP is weekly
      const d30=s.items.filter(i=>i.daysOld>7&&i.daysOld<=30).reduce((x,i)=>x+i.owed,0);
      const d60=s.items.filter(i=>i.daysOld>30&&i.daysOld<=60).reduce((x,i)=>x+i.owed,0);
      const d90=s.items.filter(i=>i.daysOld>60).reduce((x,i)=>x+i.owed,0);
      const mods=[...new Set(s.items.map(i=>i.mod))];
      return {supplier:s.supplier,branch:s.branch,tot:tot,d0:d0,d30:d30,d60:d60,d90:d90,mods:mods};
    })
    .filter(r=>r.tot>0&&(!search||r.supplier.toLowerCase().includes(search.toLowerCase())))
    .sort((a,b)=>b.d90-a.d90||b.tot-a.tot);

  const totals=rows.reduce((s,r)=>({tot:s.tot+r.tot,d0:s.d0+r.d0,d30:s.d30+r.d30,d60:s.d60+r.d60,d90:s.d90+r.d90}),{tot:0,d0:0,d30:0,d60:0,d90:0});
  const f=n=>n>0?cur+Number(Math.round(n)).toLocaleString("en-IN"):"—";

  return (
    <div style={{padding:"12px 10px",maxWidth:1260,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Payables Ageing</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>As on {TODAY} · {brCode||"Travkings Group"} · {rows.length} creditors</p>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search supplier..." style={{...inp,width:220,minHeight:32,fontSize:11}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #185FA5",padding:"11px 13px",background:"#E6F1FB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#185FA5",textTransform:"uppercase"}}>Total Payable</p><p style={{margin:"4px 0 0",fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>{f(totals.tot)}</p></div>
          <div style={{...card,borderTop:"3px solid #A32D2D",padding:"11px 13px",background:"#FCEBEB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#A32D2D",textTransform:"uppercase"}}>Due ≤7 Days (BSP)</p><p style={{margin:"4px 0 0",fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>{f(totals.d0)}</p></div>
          <div style={{...card,borderTop:"3px solid #854F0B",padding:"11px 13px",background:"#FAEEDA"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#854F0B",textTransform:"uppercase"}}>8–30 Days</p><p style={{margin:"4px 0 0",fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>{f(totals.d30)}</p></div>
          <div style={{...card,borderTop:"3px solid #854F0B",padding:"11px 13px",background:"#FAEEDA"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#854F0B",textTransform:"uppercase"}}>31–60 Days</p><p style={{margin:"4px 0 0",fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>{f(totals.d60)}</p></div>
          <div style={{...card,borderTop:"3px solid #7B1F1F",padding:"11px 13px",background:"#FCEBEB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#7B1F1F",textTransform:"uppercase"}}>60+ Days Overdue</p><p style={{margin:"4px 0 0",fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>{f(totals.d90)}</p></div>
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Supplier","Branch","Modules","Total Payable","Due ≤7d","8–30d","31–60d","60+d","Status"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=3?"right":"left",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{rows.map((r,i)=>(
            <tr key={r.supplier} style={{borderBottom:"1px solid #f3f4f8",background:r.d90>0?"#fff9f9":i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"9px 12px",fontWeight:600,color:"#0d1326"}}>{r.supplier}</td>
              <td style={{padding:"9px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:700,background:"#E6F1FB",color:"#185FA5"}}>{r.branch}</span></td>
              <td style={{padding:"9px 12px",fontSize:10,color:"#5a6691"}}>{r.mods.join(", ")}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(r.tot)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:r.d0>0?"#A32D2D":"#bfc3d6",fontWeight:r.d0>0?700:400}}>{f(r.d0)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:r.d30>0?"#854F0B":"#bfc3d6"}}>{f(r.d30)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:r.d60>0?"#854F0B":"#bfc3d6"}}>{f(r.d60)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:r.d90>0?"#7B1F1F":"#bfc3d6"}}>{f(r.d90)}</td>
              <td style={{padding:"9px 12px"}}>
                <button style={{...btnG,padding:"3px 10px",fontSize:10,background:r.d0>0?"#A32D2D":"#0d1326"}}>Pay</button>
              </td>
            </tr>
          ))}</tbody>
          <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={3} style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL — {rows.length} suppliers</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(totals.tot)}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(totals.d0)}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totals.d30)}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totals.d60)}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(totals.d90)}</td>
            <td/>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

export function ReportSalesReg({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [modFilter,setModFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [dateFrom,setDateFrom]=useState("2025-12-01");
  const [dateTo,setDateTo]=useState("2026-05-31");
  const [sortKey,setSortKey]=useState("date");
  const [sortDir,setSortDir]=useState("desc");

  const MODS=["All","Flight","Holiday","Hotel","Car","Visa","Insurance","Misc"];
  const MOD_CLR={Flight:"#185FA5",Holiday:"#27500A",Hotel:"#854F0B",Car:"#384677",Visa:"#1D9E75",Insurance:"#A32D2D",Misc:"#5a6691"};
  const MOD_BG ={Flight:"#E6F1FB",Holiday:"#EAF3DE",Hotel:"#FAEEDA",Car:"#f3f4f8",Visa:"#EAF3DE",Insurance:"#FCEBEB",Misc:"#f3f4f8"};

  const rows=useMemo(()=>{
    let r=GP_BILLS
      .filter(b=>(!brCode||b.branch===brCode)&&(modFilter==="All"||b.mod===modFilter)&&b.date>=dateFrom&&b.date<=dateTo)
      .filter(b=>!search||b.id.toLowerCase().includes(search.toLowerCase())||b.client.toLowerCase().includes(search.toLowerCase())||b.dest.toLowerCase().includes(search.toLowerCase()))
      .map(b=>({...b,gp:b.sell-b.cost,gpPct:+((b.sell-b.cost)/b.sell*100).toFixed(1)}));
    r.sort((a,b2)=>{
      const av=a[sortKey]||0, bv=b2[sortKey]||0;
      return sortDir==="asc"?(av>bv?1:-1):(av<bv?1:-1);
    });
    return r;
  },[branch,modFilter,search,dateFrom,dateTo,sortKey,sortDir]);

  const totSell=rows.reduce((s,r)=>s+r.sell,0);
  const totGP  =rows.reduce((s,r)=>s+r.gp,0);
  const totGPPct=totSell>0?+(totGP/totSell*100).toFixed(1):0;
  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");

  const SH=({k,children})=>(
    <th onClick={()=>{if(sortKey===k)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortKey(k);setSortDir("desc");}}}
      style={{padding:"9px 10px",textAlign:["sell","cost","gp","gpPct"].includes(k)?"right":"left",
        color:"#d4a437",fontWeight:700,fontSize:10,cursor:"pointer",whiteSpace:"nowrap",userSelect:"none"}}>
      {children} {sortKey===k?(sortDir==="desc"?"▼":"▲"):""}
    </th>
  );

  return (
    <div style={{padding:"12px 10px",maxWidth:1360,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Sales Register</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{rows.length} bookings · {f(totSell)} revenue · {totGPPct}% GP</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <select value={modFilter} onChange={e=>setModFilter(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>{MODS.map(m=><option key={m}>{m}</option>)}</select>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{...inp,width:130,minHeight:32,fontSize:11}}/>
          <span style={{fontSize:11,color:"#5a6691"}}>to</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{...inp,width:130,minHeight:32,fontSize:11}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Voucher / client / dest..." style={{...inp,width:200,minHeight:32,fontSize:11}}/>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #384677",padding:"11px 13px",background:"#f3f4f8"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#384677",textTransform:"uppercase"}}>Bookings</p><p style={{margin:"4px 0 0",fontSize:mob?17:20,fontWeight:800,color:"#0d1326"}}>{String(rows.length)}</p></div>
          <div style={{...card,borderTop:"3px solid #185FA5",padding:"11px 13px",background:"#E6F1FB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#185FA5",textTransform:"uppercase"}}>Revenue</p><p style={{margin:"4px 0 0",fontSize:mob?17:20,fontWeight:800,color:"#0d1326"}}>{f(totSell)}</p></div>
          <div style={{...card,borderTop:"3px solid #27500A",padding:"11px 13px",background:"#EAF3DE"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#27500A",textTransform:"uppercase"}}>Gross Profit</p><p style={{margin:"4px 0 0",fontSize:mob?17:20,fontWeight:800,color:"#0d1326"}}>{f(totGP)}</p></div>
          <div style={{...card,borderTop:`3px solid ${totGPPct>=12?"#27500A":"#A32D2D"}`,padding:"11px 13px",background:totGPPct>=12?"#EAF3DE":"#FCEBEB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:totGPPct>=12?"#27500A":"#A32D2D",textTransform:"uppercase"}}>GP%</p><p style={{margin:"4px 0 0",fontSize:mob?17:20,fontWeight:800,color:"#0d1326"}}>{`${totGPPct}%`}</p></div>
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:900}}>
            <thead><tr style={{background:"#0d1326"}}>
              <SH k="id">Voucher No.</SH><SH k="date">Date</SH>
              <th style={{padding:"9px 10px",color:"#d4a437",fontWeight:700,fontSize:10}}>Module</th>
              <th style={{padding:"9px 10px",color:"#d4a437",fontWeight:700,fontSize:10}}>Client</th>
              <th style={{padding:"9px 10px",color:"#d4a437",fontWeight:700,fontSize:10}}>Destination</th>
              <th style={{padding:"9px 10px",color:"#d4a437",fontWeight:700,fontSize:10}}>Consultant</th>
              <SH k="sell">Revenue</SH><SH k="gp">GP</SH><SH k="gpPct">GP%</SH>
            </tr></thead>
            <tbody>{rows.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:10,color:"#185FA5",whiteSpace:"nowrap"}}>{r.id}</td>
                <td style={{padding:"7px 10px",fontSize:10,color:"#5a6691",whiteSpace:"nowrap"}}>{r.date}</td>
                <td style={{padding:"7px 10px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:MOD_BG[r.mod]||"#f3f4f8",color:MOD_CLR[r.mod]||"#384677"}}>{r.mod}</span></td>
                <td style={{padding:"7px 10px",fontWeight:600,color:"#0d1326",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.client}</td>
                <td style={{padding:"7px 10px",color:"#384677"}}>{r.dest}</td>
                <td style={{padding:"7px 10px",fontSize:10,color:"#5a6691"}}>{r.consultant}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{cur+Number(r.sell).toLocaleString()}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:r.gpPct>=12?"#27500A":"#A32D2D"}}>{cur+Number(r.gp).toLocaleString()}</td>
                <td style={{padding:"7px 10px",textAlign:"right"}}>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:800,background:r.gpPct>=12?"#EAF3DE":r.gpPct>=8?"#FAEEDA":"#FCEBEB",color:r.gpPct>=12?"#27500A":r.gpPct>=8?"#854F0B":"#A32D2D"}}>{r.gpPct}%</span>
                </td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
              <td colSpan={6} style={{padding:"9px 10px",fontWeight:700,color:"#d4a437",fontSize:11}}>TOTAL — {rows.length} bookings</td>
              <td style={{padding:"9px 10px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(totSell)}</td>
              <td style={{padding:"9px 10px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totGP)}</td>
              <td style={{padding:"9px 10px",textAlign:"right"}}><span style={{fontSize:11,padding:"3px 9px",borderRadius:999,fontWeight:800,background:"#FAEEDA",color:"#854F0B"}}>{totGPPct}%</span></td>
            </tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ReportBranch(){
  const maxR=Math.max(...BR_D.map(b=>b.rev));
  const totR=BR_D.reduce((s,b)=>s+b.rev,0);
  return (
    <RptShell title="Branch Comparison" subtitle="FY 2026-27 (Apr–May) · All branches">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:14}}>
        {BR_D.map((b,i)=>(
          <div key={i} style={{background:"#f9fafb",border:"1px solid #e1e3ec",borderTop:"3px solid "+b.color,borderRadius:10,padding:"11px 13px"}}>
            <p style={{margin:0,fontSize:10.5,fontWeight:600,color:"#384677"}}>{b.branch}</p>
            <p style={{margin:"4px 0 1px",fontSize:16,fontWeight:700,color:"#0d1326",fontVariantNumeric:"tabular-nums"}}>{"₹ "+fmt(b.rev/100000)+"L"}</p>
            <p style={{margin:0,fontSize:11,color:"#27500A",fontWeight:600}}>{"GP: "+b.gpPct+"%"}</p>
          </div>
        ))}
      </div>
      <div style={{...card,padding:14,marginBottom:14}}>
        <p style={{margin:"0 0 12px",fontSize:12.5,fontWeight:600}}>Revenue vs Gross Profit</p>
        {BR_D.map((b,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11.5,marginBottom:5}}>
              <span style={{color:"#384677",fontWeight:500}}>{b.branch}</span>
              <span style={{fontWeight:600,color:"#0d1326",fontVariantNumeric:"tabular-nums"}}>{"₹ "+fmt(b.rev)}</span>
            </div>
            <div style={{height:10,background:"#f3f4f8",borderRadius:999,overflow:"hidden",marginBottom:3}}>
              <div style={{height:"100%",width:(b.rev/maxR*100)+"%",background:b.color,borderRadius:999}}/>
            </div>
            <div style={{height:6,background:"#f3f4f8",borderRadius:999,overflow:"hidden"}}>
              <div style={{height:"100%",width:(b.gp/maxR*100)+"%",background:b.color,borderRadius:999,opacity:0.45}}/>
            </div>
          </div>
        ))}
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",fontSize:11.5,borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f3f4f8",borderBottom:"2px solid #e1e3ec"}}>
              {["Branch","Revenue ₹","Gross Profit ₹","GP %","Revenue share"].map((h,i)=>(
                <th key={i} style={{textAlign:i>=1?"right":"left",padding:"9px 11px",fontWeight:600,color:"#384677",fontSize:11}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{BR_D.map((b,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #e1e3ec"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{padding:"9px 11px",fontWeight:500}}>
                  <span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:b.color,marginRight:8,verticalAlign:"middle"}}/>
                  {b.branch}
                </td>
                <td style={{padding:"9px 11px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:600}}>{fmt(b.rev)}</td>
                <td style={{padding:"9px 11px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#27500A"}}>{fmt(b.gp)}</td>
                <td style={{padding:"9px 11px",textAlign:"right",fontWeight:600,color:"#27500A"}}>{b.gpPct+"%"}</td>
                <td style={{padding:"9px 11px",textAlign:"right",color:"#384677"}}>{((b.rev/totR)*100).toFixed(1)+"%"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </RptShell>
  );
}

/* ── PACKAGE P&L ─────────────────────────────────────────── */

export function ReportPackagePnL(){
  const [q,setQ]=useState("");
  const rows=PKG_D.filter(r=>!q||r.cust.toLowerCase().includes(q.toLowerCase())||r.pkg.toLowerCase().includes(q.toLowerCase())||r.file.toLowerCase().includes(q.toLowerCase()));
  return (
    <RptShell title="Package P&amp;L" subtitle="File-wise profitability">
      <div style={{position:"relative",marginBottom:12}}>
        <Search size={13} style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#8b94b3"}}/>
        <input placeholder="Search file no., customer, package..." value={q} onChange={e=>setQ(e.target.value)} style={{...inp,paddingLeft:32,fontSize:12}}/>
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",fontSize:11.5,borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f3f4f8",borderBottom:"2px solid #e1e3ec"}}>
              {["File no.","Customer","Package","Dept.","Sale ₹","Cost ₹","GST ₹","Net Profit ₹","Margin %","Status"].map((h,i)=>(
                <th key={i} style={{textAlign:i>=4&&i<=8?"right":"left",padding:"9px 11px",fontWeight:600,color:"#384677",fontSize:11}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{rows.map((r,i)=>{
              const sc=PKG_SC[r.status]||PKG_SC.Tentative;
              return (
                <tr key={i} style={{borderBottom:"1px solid #e1e3ec",opacity:r.status==="Cancelled"?0.5:1}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"9px 11px",fontFamily:"monospace",fontSize:11,color:"#185FA5"}}>{r.file}</td>
                  <td style={{padding:"9px 11px",fontWeight:500}}>{r.cust}</td>
                  <td style={{padding:"9px 11px",color:"#384677"}}>{r.pkg}</td>
                  <td style={{padding:"9px 11px",color:"#5a6691"}}>{r.dept}</td>
                  <td style={{padding:"9px 11px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmt(r.sale)}</td>
                  <td style={{padding:"9px 11px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#854F0B"}}>{fmt(r.cost)}</td>
                  <td style={{padding:"9px 11px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#5a6691"}}>{fmt(r.gst)}</td>
                  <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:r.net>0?"#27500A":"#e24b4a"}}>{fmt(r.net)}</td>
                  <td style={{padding:"9px 11px",textAlign:"right",fontWeight:600,color:r.margin>40?"#27500A":"#854F0B"}}>{r.margin+"%"}</td>
                  <td style={{padding:"9px 11px"}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:999,background:sc.bg,color:sc.c,fontWeight:600}}>{r.status}</span></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
    </RptShell>
  );
}


/* ── PURCHASE: CAR RENTALS ───────────────────────────────── */

/* ══════════════════════════════════════════════════════════════════
   GROSS PROFIT REPORTS — Multi-tab GP analytics
   Bill-wise · Module-wise · Airline-wise · Destination-wise ·
   Client-wise · Supplier-wise · Period-wise · Summary
   ════════════════════════════════════════════════════════════════ */

/* ══ GP BILLS — 6-month sample data (Dec 2025 – May 2026) ═══════ */

export function ReportGP({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [tab,setTab]=useState("summary");
  const [search,setSearch]=useState("");
  const [dateFrom,setDateFrom]=useState("2025-12-01");
  const [dateTo,setDateTo]=useState("2026-05-31");
  const [modFilter,setModFilter]=useState("All");
  const [sortCol,setSortCol]=useState("gp");
  const [sortDir,setSortDir]=useState("desc");

  /* ── Filter + enrich bills ── */
  const bills=useMemo(()=>{
    const brCode=branch==="ALL"?null:branch?.code;
    return GP_BILLS
      .filter(b=>(
        (!brCode||b.branch===brCode)&&
        b.date>=dateFrom&&b.date<=dateTo&&
        (modFilter==="All"||b.mod===modFilter)&&
        (!search||b.id.toLowerCase().includes(search.toLowerCase())||
         b.client.toLowerCase().includes(search.toLowerCase())||
         b.dest.toLowerCase().includes(search.toLowerCase())||
         b.airline.toLowerCase().includes(search.toLowerCase())||
         b.supplier.toLowerCase().includes(search.toLowerCase()))
      ))
      .map(b=>({...b,gp:b.sell-b.cost,gpPct:+((b.sell-b.cost)/b.sell*100).toFixed(1)}));
  },[branch,dateFrom,dateTo,modFilter,search]);

  const totSell=bills.reduce((s,b)=>s+b.sell,0);
  const totCost=bills.reduce((s,b)=>s+b.cost,0);
  const totGP  =bills.reduce((s,b)=>s+b.gp,0);
  const totGPPct=totSell>0?+(totGP/totSell*100).toFixed(1):0;

  /* ── Group helper ── */
  const group=(data,key)=>{
    const m={};
    data.forEach(b=>{const k=b[key]||"Other";if(!m[k])m[k]={key:k,count:0,sell:0,cost:0,gp:0};m[k].count++;m[k].sell+=b.sell;m[k].cost+=b.cost;m[k].gp+=b.gp;});
    return Object.values(m).map(r=>({...r,gpPct:r.sell>0?+(r.gp/r.sell*100).toFixed(1):0}));
  };

  /* ── Monthly data ── */
  const monthly=useMemo(()=>{
    const months=["Dec'25","Jan'26","Feb'26","Mar'26","Apr'26","May'26"];
    const keys=["2025-12","2026-01","2026-02","2026-03","2026-04","2026-05"];
    return months.map((m,i)=>{
      const rows=bills.filter(b=>b.date.startsWith(keys[i]));
      const sell=rows.reduce((s,b)=>s+b.sell,0);
      const cost=rows.reduce((s,b)=>s+b.cost,0);
      const gp=sell-cost;
      return {m:m,sell:sell,cost:cost,gp:gp,gpPct:sell>0?+(gp/sell*100).toFixed(1):0,count:rows.length};
    });
  },[bills]);

  /* ── Sorted grouped table helper ── */
  const sort=(data,col,dir)=>[...data].sort((a,b)=>dir==="asc"?a[col]-b[col]:b[col]-a[col]);
  const sortGrp=(data)=>sort(data,sortCol,sortDir);
  const toggleSort=col=>{if(sortCol===col)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortCol(col);setSortDir("desc");}};
  const SH=({col,children})=>(
    <th onClick={()=>toggleSort(col)}
      style={{padding:"9px 12px",textAlign:col==="key"?"left":"right",color:"#d4a437",
        fontWeight:700,fontSize:10,cursor:"pointer",whiteSpace:"nowrap",userSelect:"none"}}>
      {children} {sortCol===col?(sortDir==="desc"?"▼":"▲"):""}
    </th>
  );

  /* ── GP% colour ── */
  const gpClr=pct=>pct>=20?"#27500A":pct>=12?"#1D9E75":pct>=8?"#854F0B":"#A32D2D";
  const gpBg =pct=>pct>=20?"#EAF3DE":pct>=12?"#EAF3DE":pct>=8?"#FAEEDA":"#FCEBEB";

  /* ── Fmt ── */
  const f=n=>n>=10000000?(n/10000000).toFixed(2)+"Cr":n>=100000?(n/100000).toFixed(2)+"L":n>=1000?(n/1000).toFixed(1)+"K":String(Math.round(n));
  const fPct=p=>`${p}%`;

  /* ── Grouped table component ── */
  const GrpTable=({data,nameKey="key",nameLbl="Name",extraCol,extraVal,icon=""})=>{
    const rows=sortGrp(data);
    const tot=rows.reduce((s,r)=>({sell:s.sell+r.sell,cost:s.cost+r.cost,gp:s.gp+r.gp,count:s.count+r.count}),{sell:0,cost:0,gp:0,count:0});
    return (
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            <th style={{padding:"9px 12px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:10}}>{nameLbl}</th>
            {extraCol&&<th style={{padding:"9px 12px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:10}}>{extraCol}</th>}
            <SH col="count">Bookings</SH>
            <SH col="sell">Revenue</SH>
            <SH col="cost">Cost</SH>
            <SH col="gp">Gross Profit</SH>
            <SH col="gpPct">GP%</SH>
          </tr></thead>
          <tbody>{rows.map((r,i)=>(
            <tr key={r[nameKey]} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>
                {icon&&<span style={{marginRight:5}}>{icon}</span>}{r[nameKey]}
              </td>
              {extraCol&&<td style={{padding:"8px 12px",fontSize:10.5,color:"#5a6691"}}>{extraVal?extraVal(r):""}</td>}
              <td style={{padding:"8px 12px",textAlign:"right",color:"#5a6691"}}>{r.count}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,color:"#384677",fontVariantNumeric:"tabular-nums"}}>{cur}{f(r.sell)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",color:"#5a6691",fontVariantNumeric:"tabular-nums"}}>{cur}{f(r.cost)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:gpClr(r.gpPct),fontVariantNumeric:"tabular-nums"}}>{cur}{f(r.gp)}</td>
              <td style={{padding:"8px 12px",textAlign:"right"}}>
                <span style={{fontSize:11,padding:"3px 9px",borderRadius:999,fontWeight:800,
                  background:gpBg(r.gpPct),color:gpClr(r.gpPct)}}>{fPct(r.gpPct)}</span>
              </td>
            </tr>
          ))}</tbody>
          <tfoot><tr style={{background:"#f3f4f8",borderTop:"2px solid #0d1326"}}>
            <td colSpan={extraCol?2:1} style={{padding:"8px 12px",fontWeight:700,color:"#0d1326",fontSize:11}}>
              TOTAL — {rows.length} {nameLbl.toLowerCase()}{rows.length!==1?"s":""}
            </td>
            <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700}}>{tot.count}</td>
            <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#0d1326",fontVariantNumeric:"tabular-nums"}}>{cur}{f(tot.sell)}</td>
            <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{cur}{f(tot.cost)}</td>
            <td style={{padding:"8px 12px",textAlign:"right",fontWeight:800,color:gpClr(totGPPct),fontVariantNumeric:"tabular-nums"}}>{cur}{f(tot.gp)}</td>
            <td style={{padding:"8px 12px",textAlign:"right"}}>
              <span style={{fontSize:12,padding:"3px 10px",borderRadius:999,fontWeight:800,
                background:gpBg(+(tot.gp/tot.sell*100).toFixed(1)),
                color:gpClr(+(tot.gp/tot.sell*100).toFixed(1))}}>{fPct(+(tot.gp/tot.sell*100).toFixed(1))}</span>
            </td>
          </tr></tfoot>
        </table>
      </div>
    );
  };

  const TABS=[
    {k:"summary",     l:"📊 Summary"},
    {k:"bill",        l:"🧾 Bill-wise"},
    {k:"module",      l:"📦 Module"},
    {k:"airline",     l:"✈ Airline"},
    {k:"destination", l:"🌍 Destination"},
    {k:"client",      l:"👥 Client"},
    {k:"supplier",    l:"🏢 Supplier"},
    {k:"consultant",  l:"👤 Consultant"},
    {k:"branch",      l:"🏦 Branch"},
    {k:"period",      l:"📅 Monthly"},
    {k:"top10",       l:"🏆 Top 10"},
  ];

  const MODS=["All","Flight","Holiday","Hotel","Car","Visa","Insurance","Misc"];

  const kpi=(label,value,sub,accent="info")=>{
    const ac={info:{bg:"#E6F1FB",c:"#185FA5"},success:{bg:"#EAF3DE",c:"#27500A"},
              warning:{bg:"#FAEEDA",c:"#854F0B"},danger:{bg:"#FCEBEB",c:"#A32D2D"}};
    const a=ac[accent]||ac.info;
    return (
      <div style={{...card,borderTop:`3px solid ${a.c}`,padding:"12px 14px"}}>
        <p style={{margin:0,fontSize:9.5,fontWeight:700,color:a.c,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</p>
        <p style={{margin:"4px 0 1px",fontSize:mob?20:24,fontWeight:800,color:"#0d1326",
          fontVariantNumeric:"tabular-nums",letterSpacing:"-0.02em"}}>{value}</p>
        <p style={{margin:0,fontSize:10,color:"#5a6691"}}>{sub}</p>
      </div>
    );
  };

  return (
    <div style={{padding:"12px 10px",maxWidth:1360,margin:"0 auto"}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
        flexWrap:"wrap",gap:8,marginBottom:12}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326",letterSpacing:"-0.02em"}}>
            GP Reports — {branch==="ALL"?"Travkings Group":branch?.code+" "+branch?.city}
          </h2>
          <p style={{margin:"3px 0 0",fontSize:10.5,color:"#5a6691"}}>
            {bills.length} bookings · {cur}{f(totSell)} revenue · {totGPPct}% GP
          </p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <select value={modFilter} onChange={e=>setModFilter(e.target.value)}
            style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {MODS.map(m=><option key={m}>{m}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            style={{...inp,width:130,minHeight:32,fontSize:11}}/>
          <span style={{fontSize:11,color:"#5a6691"}}>to</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
            style={{...inp,width:130,minHeight:32,fontSize:11}}/>
        </div>
      </div>

      {/* KPI row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",
        gap:mob?8:10,marginBottom:12}}>
        {kpi("Total Revenue",  cur+f(totSell), `${bills.length} bookings`,  "info")}
        {kpi("Total Cost",     cur+f(totCost), "Purchase cost total",        "warning")}
        {kpi("Gross Profit",   cur+f(totGP),   "Revenue minus cost",         totGPPct>=15?"success":"danger")}
        {kpi("GP%",            fPct(totGPPct), "Average gross margin",       totGPPct>=15?"success":totGPPct>=10?"warning":"danger")}
        {kpi("Best Module",    (group(bills,"mod").sort((a,b)=>b.gpPct-a.gpPct)[0]||{key:"—"}).key,
          `GP ${(group(bills,"mod").sort((a,b)=>b.gpPct-a.gpPct)[0]||{gpPct:0}).gpPct}%`, "success")}
        {kpi("Top Client",     (group(bills,"client").sort((a,b)=>b.gp-a.gp)[0]||{key:"—"}).key.split(" ")[0]+"...",
          `GP ${cur}${f((group(bills,"client").sort((a,b)=>b.gp-a.gp)[0]||{gp:0}).gp)}`, "info")}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10,
        padding:"8px",background:"#f3f4f8",borderRadius:10}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)}
            style={{padding:"6px 12px",borderRadius:7,border:"none",cursor:"pointer",
              fontSize:mob?10:11,fontWeight:tab===t.k?700:400,whiteSpace:"nowrap",
              background:tab===t.k?"#0d1326":"transparent",
              color:tab===t.k?"#d4a437":"#5a6691",
              transition:"all 0.15s"}}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Search (for bill tab) */}
      {tab==="bill"&&(
        <div style={{marginBottom:10}}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search voucher no., client, destination, airline..."
            style={{...inp,maxWidth:420}}/>
        </div>
      )}

      {/* ── SUMMARY ── */}
      {tab==="summary"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Monthly trend bars */}
          <div style={{...card}}>
            <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Monthly GP Trend</p>
            <div style={{display:"flex",gap:8,alignItems:"flex-end",overflowX:"auto",paddingBottom:4}}>
              {monthly.map((m,i)=>{
                const maxSell=Math.max(...monthly.map(x=>x.sell),1);
                const barH=Math.max(4,Math.round(m.sell/maxSell*120));
                const gpBarH=m.sell>0?Math.round(m.gp/m.sell*barH):0;
                return (
                  <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",
                    gap:4,minWidth:mob?40:56,flex:1}}>
                    <p style={{margin:0,fontSize:mob?8:9,fontWeight:700,
                      color:gpClr(m.gpPct)}}>{m.gpPct}%</p>
                    <div style={{width:"100%",position:"relative",height:120,
                      display:"flex",alignItems:"flex-end"}}>
                      <div style={{width:"100%",height:barH,background:"#E6F1FB",
                        borderRadius:"4px 4px 0 0",position:"relative",overflow:"hidden"}}>
                        <div style={{position:"absolute",bottom:0,width:"100%",
                          height:gpBarH,background:"#185FA5",borderRadius:"3px 3px 0 0"}}/>
                      </div>
                    </div>
                    <p style={{margin:0,fontSize:mob?8:9.5,color:"#5a6691",fontWeight:600}}>{m.m}</p>
                    {m.count>0&&<p style={{margin:0,fontSize:8,color:"#bfc3d6"}}>{m.count} bkgs</p>}
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",gap:12,marginTop:8,fontSize:10,color:"#5a6691",flexWrap:"wrap"}}>
              <span style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:10,height:10,background:"#E6F1FB",borderRadius:2}}/> Total Revenue
              </span>
              <span style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:10,height:10,background:"#185FA5",borderRadius:2}}/> Gross Profit
              </span>
            </div>
          </div>
          {/* Module snapshot */}
          <p style={{margin:"4px 0 4px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Module-wise Snapshot</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8}}>
            {group(bills,"mod").sort((a,b)=>b.gp-a.gp).map(m=>(
              <div key={m.key} style={{...card,padding:"10px 12px",
                borderTop:`3px solid ${gpClr(m.gpPct)}`}}>
                <p style={{margin:0,fontSize:11,fontWeight:700,color:"#0d1326"}}>{MODULE_ICONS[m.key]||"📦"} {m.key}</p>
                <p style={{margin:"4px 0 1px",fontSize:16,fontWeight:800,color:gpClr(m.gpPct)}}>{fPct(m.gpPct)}</p>
                <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{m.count} bookings · {cur}{f(m.gp)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BILL-WISE ── */}
      {tab==="bill"&&(
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:820}}>
              <thead><tr style={{background:"#0d1326"}}>
                {["Voucher No.","Date","Module","Client","Destination","Airline / Supplier","Consultant","Sell","Cost","GP","GP%"].map((h,i)=>(
                  <th key={i} style={{padding:"9px 10px",textAlign:i>=7?"right":"left",
                    color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[...bills].sort((a,b)=>b.gp-a.gp).map((b,i)=>(
                  <tr key={b.id} style={{borderBottom:"1px solid #f3f4f8",
                    background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:10,
                      color:"#185FA5",whiteSpace:"nowrap"}}>{b.id}</td>
                    <td style={{padding:"7px 10px",fontSize:10,color:"#5a6691",whiteSpace:"nowrap"}}>{b.date}</td>
                    <td style={{padding:"7px 10px"}}>
                      <span style={{fontSize:9.5,padding:"2px 6px",borderRadius:999,fontWeight:700,
                        background:"#E6F1FB",color:"#185FA5"}}>{b.mod}</span>
                    </td>
                    <td style={{padding:"7px 10px",fontWeight:600,color:"#0d1326",maxWidth:130,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.client}</td>
                    <td style={{padding:"7px 10px",color:"#384677"}}>{b.dest}</td>
                    <td style={{padding:"7px 10px",fontSize:10.5,color:"#5a6691"}}>
                      {b.airline||b.supplier}
                    </td>
                    <td style={{padding:"7px 10px",fontSize:10,color:"#5a6691"}}>{b.consultant}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",
                      fontWeight:600,color:"#384677"}}>{cur}{f(b.sell)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",
                      color:"#5a6691"}}>{cur}{f(b.cost)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,
                      fontVariantNumeric:"tabular-nums",color:gpClr(b.gpPct)}}>{cur}{f(b.gp)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}>
                      <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:800,
                        background:gpBg(b.gpPct),color:gpClr(b.gpPct)}}>{fPct(b.gpPct)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==="module"     &&<GrpTable data={group(bills,"mod")}        nameKey="key" nameLbl="Module"      icon="📦"/>}
      {tab==="airline"    &&<GrpTable data={group(bills,"airline").filter(r=>r.key)} nameKey="key" nameLbl="Airline"     icon="✈"/>}
      {tab==="destination"&&<GrpTable data={group(bills,"dest")}       nameKey="key" nameLbl="Destination"  icon="🌍"/>}
      {tab==="client"     &&<GrpTable data={group(bills,"client")}     nameKey="key" nameLbl="Client"       icon="👥"/>}
      {tab==="supplier"   &&<GrpTable data={group(bills,"supplier")}   nameKey="key" nameLbl="Supplier"     icon="🏢"/>}
      {tab==="consultant" &&<GrpTable data={group(bills,"consultant")} nameKey="key" nameLbl="Consultant"   icon="👤"/>}
      {tab==="branch"     &&<GrpTable data={group(bills,"branch")}     nameKey="key" nameLbl="Branch"       icon="🏦"/>}

      {/* ── MONTHLY ── */}
      {tab==="period"&&(
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Month","Bookings","Revenue","Cost","Gross Profit","GP%","vs Prior"].map((h,i)=>(
                <th key={i} style={{padding:"9px 12px",textAlign:i>=2?"right":"left",
                  color:"#d4a437",fontWeight:700,fontSize:10}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{monthly.map((m,i)=>{
              const prev=monthly[i-1];
              const delta=prev&&prev.gpPct>0?+(m.gpPct-prev.gpPct).toFixed(1):null;
              return (
                <tr key={m.m} style={{borderBottom:"1px solid #f3f4f8",
                  background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"9px 12px",fontWeight:700,color:"#0d1326"}}>{m.m}</td>
                  <td style={{padding:"9px 12px",color:"#5a6691"}}>{m.count}</td>
                  <td style={{padding:"9px 12px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{m.sell>0?cur+f(m.sell):"—"}</td>
                  <td style={{padding:"9px 12px",textAlign:"right",color:"#5a6691",fontVariantNumeric:"tabular-nums"}}>{m.cost>0?cur+f(m.cost):"—"}</td>
                  <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,
                    color:gpClr(m.gpPct),fontVariantNumeric:"tabular-nums"}}>{m.gp>0?cur+f(m.gp):"—"}</td>
                  <td style={{padding:"9px 12px",textAlign:"right"}}>
                    {m.gpPct>0&&<span style={{fontSize:11,padding:"3px 9px",borderRadius:999,fontWeight:800,
                      background:gpBg(m.gpPct),color:gpClr(m.gpPct)}}>{fPct(m.gpPct)}</span>}
                  </td>
                  <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,
                    color:delta===null?"#bfc3d6":delta>0?"#27500A":delta<0?"#A32D2D":"#5a6691"}}>
                    {delta===null?"—":delta>0?"+"+delta+"%":delta+"%"}
                  </td>
                </tr>
              );
            })}</tbody>
            <tfoot><tr style={{background:"#f3f4f8",borderTop:"2px solid #0d1326"}}>
              <td style={{padding:"8px 12px",fontWeight:700,color:"#0d1326"}}>6-Month Total</td>
              <td style={{padding:"8px 12px",fontWeight:700}}>{bills.length}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{cur}{f(totSell)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{cur}{f(totCost)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:800,color:gpClr(totGPPct),fontVariantNumeric:"tabular-nums"}}>{cur}{f(totGP)}</td>
              <td style={{padding:"8px 12px",textAlign:"right"}}>
                <span style={{fontSize:12,padding:"3px 10px",borderRadius:999,fontWeight:800,
                  background:gpBg(totGPPct),color:gpClr(totGPPct)}}>{fPct(totGPPct)}</span>
              </td>
              <td/>
            </tr></tfoot>
          </table>
        </div>
      )}

      {/* ── TOP 10 ── */}
      {tab==="top10"&&(
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
          {[
            {title:"Top 10 Clients by GP",      data:group(bills,"client").sort((a,b)=>b.gp-a.gp).slice(0,10),   icon:"👥"},
            {title:"Top 10 Destinations by GP",  data:group(bills,"dest").sort((a,b)=>b.gp-a.gp).slice(0,10),     icon:"🌍"},
            {title:"Top 10 Suppliers by Revenue",data:group(bills,"supplier").sort((a,b)=>b.sell-a.sell).slice(0,10),icon:"🏢"},
            {title:"Consultants by GP",          data:group(bills,"consultant").sort((a,b)=>b.gp-a.gp),           icon:"👤"},
          ].map(({title,data,icon})=>(
            <div key={title} style={{...card,padding:0,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",background:"#0d1326",borderBottom:"1px solid #1a2340"}}>
                <p style={{margin:0,fontSize:12,fontWeight:700,color:"#d4a437"}}>{title}</p>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr style={{background:"#f3f4f8"}}>
                  <th style={{padding:"7px 12px",textAlign:"left",color:"#5a6691",fontWeight:700,fontSize:10}}>#</th>
                  <th style={{padding:"7px 12px",textAlign:"left",color:"#5a6691",fontWeight:700,fontSize:10}}>Name</th>
                  <th style={{padding:"7px 12px",textAlign:"right",color:"#5a6691",fontWeight:700,fontSize:10}}>GP</th>
                  <th style={{padding:"7px 12px",textAlign:"right",color:"#5a6691",fontWeight:700,fontSize:10}}>GP%</th>
                </tr></thead>
                <tbody>{data.map((r,i)=>(
                  <tr key={r.key} style={{borderBottom:"1px solid #f3f4f8",
                    background:i===0?"#f9fff4":i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"7px 12px",color:i===0?"#d4a437":"#bfc3d6",
                      fontWeight:700,fontSize:i===0?13:11}}>{i===0?"🏆":i+1}</td>
                    <td style={{padding:"7px 12px",fontWeight:i===0?700:500,color:"#0d1326",
                      maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {icon} {r.key}
                    </td>
                    <td style={{padding:"7px 12px",textAlign:"right",fontWeight:700,
                      color:gpClr(r.gpPct),fontVariantNumeric:"tabular-nums"}}>{cur}{f(r.gp)}</td>
                    <td style={{padding:"7px 12px",textAlign:"right"}}>
                      <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:800,
                        background:gpBg(r.gpPct),color:gpClr(r.gpPct)}}>{fPct(r.gpPct)}</span>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


export function ReportExpenseBgt({branch,setRoute}){
  const mob=useMobile();
  useBgtRefresh();
  const [fy,setFy]=useState("2025-26");
  const [selMonth,setSelMonth]=useState("2026-05");
  const [view,setView]=useState("mtd");   /* mtd | ytd | annual */
  const [groupFilter,setGroupFilter]=useState("All");
  const [activeBr,setActiveBr]=useState(null);

  const isAll=branch==="ALL";
  const brObj=isAll?(activeBr||BRANCHES[1]):(branch||BRANCHES[1]);
  const brCode=brObj?.code||"BOM";
  const cfg=bc(brObj);
  const cur=cfg.cur;
  const fyObj=FY_LIST.find(f=>f.v===fy)||FY_LIST[1];
  const budget=getExpenseBudget(brObj,fy);
  const ytdMonths=fyObj.keys.filter(k=>k<=selMonth);

  /* Actuals helper */
  const getAct=(id,months)=>EXP_ACTUALS.filter(a=>a.id===id&&a.br===brCode&&months.includes(a.m)).reduce((s,a)=>s+a.a,0);
  const getTotAct=(months)=>EXP_LEDGERS.reduce((s,l)=>s+getAct(l.id,months),0);
  const getTotBgt=()=>EXP_LEDGERS.reduce((s,l)=>s+(budget[l.id]?.monthly||0),0);

  /* Per-view bgt/act */
  const getViewData=(id)=>{
    if(view==="mtd")  return {bgt:budget[id]?.monthly||0,     act:getAct(id,[selMonth])};
    if(view==="ytd")  return {bgt:(budget[id]?.monthly||0)*ytdMonths.length, act:getAct(id,ytdMonths)};
    return {bgt:budget[id]?.yearly||0, act:getAct(id,fyObj.keys)};
  };

  const pctColor=p=>p===null?"#bfc3d6":p<=80?"#27500A":p<=100?"#1D9E75":p<=120?"#854F0B":"#A32D2D";
  const pctBg=   p=>p===null?"#f3f4f8":p<=80?"#EAF3DE":p<=100?"#EAF3DE":p<=120?"#FAEEDA":"#FCEBEB";
  const pctLabel=p=>p===null?"No budget":p<=80?"Under budget":p<=100?"On budget":p<=120?"Slightly over":"Over budget";
  const vColor=v=>v>=0?"#27500A":"#A32D2D";

  const visLedgers=EXP_LEDGERS.filter(l=>groupFilter==="All"||l.group===groupFilter);
  const rows=visLedgers.map(l=>{const{bgt:bgt,act:act}=getViewData(l.id);const variance=bgt-act;const pct=bgt>0?+(act/bgt*100).toFixed(1):null;return {...l,bgt:bgt,act:act,variance:variance,pct:pct};});
  const totBgt=rows.reduce((s,r)=>s+r.bgt,0);
  const totAct=rows.reduce((s,r)=>s+r.act,0);
  const totVar=totBgt-totAct;
  const totPct=totBgt>0?+(totAct/totBgt*100).toFixed(1):null;

  const f=n=>n>=1000000?(n/100000).toFixed(1)+"L":n>=1000?(n/1000).toFixed(0)+"K":n>0?String(Math.round(n)):"—";
  const ff=n=>n>0?cur+Number(n).toLocaleString("en-IN"):"—";

  const Bar=({pct,h=8})=>(
    <div style={{background:"#f3f4f8",borderRadius:999,height:h,overflow:"hidden",minWidth:50}}>
      <div style={{height:"100%",width:`${Math.min(pct||0,100)}%`,background:pctColor(pct),borderRadius:999,transition:"width 0.4s"}}/>
    </div>
  );

  /* All-branches summary */
  const allBranchSummary=isAll?BRANCHES.map(b=>{
    const bBgt=getExpenseBudget(b,fy);
    const bCur=bc(b).cur;
    const months=view==="mtd"?[selMonth]:view==="ytd"?ytdMonths:fyObj.keys;
    const totB=EXP_LEDGERS.reduce((s,l)=>s+(view==="annual"?bBgt[l.id]?.yearly||0:(bBgt[l.id]?.monthly||0)*(view==="ytd"?ytdMonths.length:1)),0);
    const totA=EXP_ACTUALS.filter(a=>a.br===b.code&&months.includes(a.m)).reduce((s,a)=>s+a.a,0);
    const pct=totB>0?+(totA/totB*100).toFixed(1):null;
    return {b:b,bCur:bCur,totB:totB,totA:totA,var:totB-totA,pct:pct};
  }):null;

  const viewLabel=view==="mtd"?`MTD — ${fyObj.months[fyObj.keys.indexOf(selMonth)]||selMonth}`:view==="ytd"?`YTD — ${ytdMonths.length} months to ${fyObj.months[fyObj.keys.indexOf(selMonth)]||selMonth}`:`Full Year — ${fyObj.l}`;

  return (
    <div style={{padding:"12px 10px",maxWidth:1260,margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>💰</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Expense BGT vs Actual</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{isAll?`Travkings Group`:brCode} · {viewLabel}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <select value={fy} onChange={e=>setFy(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>{FY_LIST.map(f=><option key={f.v} value={f.v}>{f.l}</option>)}</select>
          {(view==="mtd"||view==="ytd")&&<select value={selMonth} onChange={e=>setSelMonth(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>{fyObj.keys.map((k,i)=><option key={k} value={k}>{fyObj.months[i]}</option>)}</select>}
          <select value={groupFilter} onChange={e=>setGroupFilter(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {["All",...new Set(EXP_LEDGERS.map(l=>l.group))].map(g=><option key={g}>{g}</option>)}
          </select>
          <button onClick={()=>setRoute("/expense/budget")} style={{...btnGh,fontSize:11}}>✏ Edit Budget</button>
        </div>
      </div>

      {/* View toggle */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <button onClick={()=>setPeriod("mtd")} style={{padding:"6px 12px",border:"none",cursor:"pointer",fontSize:11,fontWeight:period==="mtd"?700:500,background:period==="mtd"?"#0d1326":"transparent",color:period==="mtd"?"#d4a437":"#5a6691",borderRadius:6}}>MTD</button><button onClick={()=>setPeriod("ytd")} style={{padding:"6px 12px",border:"none",cursor:"pointer",fontSize:11,fontWeight:period==="ytd"?700:500,background:period==="ytd"?"#0d1326":"transparent",color:period==="ytd"?"#d4a437":"#5a6691",borderRadius:6}}>YTD</button><button onClick={()=>setPeriod("custom")} style={{padding:"6px 12px",border:"none",cursor:"pointer",fontSize:11,fontWeight:period==="custom"?700:500,background:period==="custom"?"#0d1326":"transparent",color:period==="custom"?"#d4a437":"#5a6691",borderRadius:6}}>Custom Range</button>
      </div>

      {/* Travkings Group Overview */}
      {isAll&&allBranchSummary&&(
        <>
          {/* Branch tabs */}
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
            <p style={{margin:"auto 6px auto 0",fontSize:10.5,color:"#5a6691",fontWeight:600}}>Detailed view:</p>
            {BRANCHES.map(b=>(
              <button key={b.code} onClick={()=>setActiveBr(b)}
                style={{padding:"5px 12px",borderRadius:7,border:"1px solid #e1e3ec",fontSize:11,cursor:"pointer",
                  fontWeight:brCode===b.code?700:400,
                  background:brCode===b.code?"#0d1326":"#fff",
                  color:brCode===b.code?"#d4a437":"#5a6691"}}>
                {b.flag} {b.code}<span style={{marginLeft:5,padding:"1px 6px",background:b.isHO?"#d4a437":"#e1e3ec",color:b.isHO?"#0d1326":"#5a6691",borderRadius:3,fontSize:8.5,fontWeight:700,letterSpacing:"0.3px"}}>{b.isHO?"Main Branch":"Branch"}</span>
              </button>
            ))}
          </div>

          {/* All branches summary grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10,marginBottom:14}}>
            {allBranchSummary.map(({b,bCur,totB,totA,var:v,pct})=>(
              <div key={b.code} onClick={()=>setActiveBr(b)}
                style={{...card,cursor:"pointer",borderTop:`3px solid ${pctColor(pct)}`,
                  background:brCode===b.code?"#f0f4ff":"#fff",
                  border:brCode===b.code?"2px solid #0d1326":"1px solid #e1e3ec",
                  padding:"12px 14px",transition:"all 0.15s"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#0d1326"}}>{b.flag} {b.code}<span style={{marginLeft:5,padding:"1px 6px",background:b.isHO?"#d4a437":"#e1e3ec",color:b.isHO?"#0d1326":"#5a6691",borderRadius:3,fontSize:8.5,fontWeight:700,letterSpacing:"0.3px"}}>{b.isHO?"Main Branch":"Branch"}</span> — {b.city}</span>
                  {pct!==null&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:800,background:pctBg(pct),color:pctColor(pct)}}>{pct}%</span>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:8,fontSize:10.5}}>
                  <div><p style={{margin:0,color:"#5a6691"}}>Budget</p><p style={{margin:0,fontWeight:700,color:"#384677"}}>{bCur}{f(totB)}</p></div>
                  <div><p style={{margin:0,color:"#5a6691"}}>Actual</p><p style={{margin:0,fontWeight:700,color:totA>totB?"#A32D2D":"#27500A"}}>{bCur}{f(totA)}</p></div>
                </div>
                <Bar pct={pct} h={8}/>
                <p style={{margin:"5px 0 0",fontSize:9.5,fontWeight:700,color:v>=0?"#27500A":"#A32D2D"}}>
                  {v>=0?"Under":"Over"} by {bCur}{f(Math.abs(v))}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* KPI cards for active branch */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #185FA5",padding:"12px 14px",background:"#E6F1FB"}}><p style={{margin:0,fontSize:9.5,fontWeight:700,color:"#185FA5",textTransform:"uppercase",letterSpacing:"0.4px"}}>Budget</p><p style={{margin:"4px 0 2px",fontSize:mob?16:20,fontWeight:800,color:"#0d1326"}}>{ff(totBgt)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{viewLabel}</p></div>
          <div style={{...card,borderTop:`3px solid ${totAct>totBgt?"#A32D2D":"#27500A"}`,padding:"12px 14px",background:totAct>totBgt?"#FCEBEB":"#EAF3DE"}}><p style={{margin:0,fontSize:9.5,fontWeight:700,color:totAct>totBgt?"#A32D2D":"#27500A",textTransform:"uppercase",letterSpacing:"0.4px"}}>Actual</p><p style={{margin:"4px 0 2px",fontSize:mob?16:20,fontWeight:800,color:"#0d1326"}}>{ff(totAct)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>expenses incurred</p></div>
          <div style={{...card,borderTop:`3px solid ${totVar>=0?"#27500A":"#A32D2D"}`,padding:"12px 14px",background:totVar>=0?"#EAF3DE":"#FCEBEB"}}><p style={{margin:0,fontSize:9.5,fontWeight:700,color:totVar>=0?"#27500A":"#A32D2D",textTransform:"uppercase",letterSpacing:"0.4px"}}>Variance</p><p style={{margin:"4px 0 2px",fontSize:mob?16:20,fontWeight:800,color:"#0d1326"}}>{(totVar>=0?"+":"")+ff(Math.abs(totVar))}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{totVar>=0?"Under budget":"OVER BUDGET"}</p></div>
          <div style={{...card,borderTop:`3px solid ${pctColor(totPct)}`,padding:"12px 14px",background:pctBg(totPct)}}><p style={{margin:0,fontSize:9.5,fontWeight:700,color:pctColor(totPct),textTransform:"uppercase",letterSpacing:"0.4px"}}>Utilisation</p><p style={{margin:"4px 0 2px",fontSize:mob?16:20,fontWeight:800,color:"#0d1326"}}>{totPct===null?"—":`${totPct}%`}</p><p style={{margin:0,fontSize:10,color:pctColor(totPct),fontWeight:600}}>{pctLabel(totPct)}</p></div>
          <div style={{...card,borderTop:"3px solid #A32D2D",padding:"12px 14px",background:"#FCEBEB"}}><p style={{margin:0,fontSize:9.5,fontWeight:700,color:"#A32D2D",textTransform:"uppercase",letterSpacing:"0.4px"}}>Over budget</p><p style={{margin:"4px 0 2px",fontSize:mob?16:20,fontWeight:800,color:"#0d1326"}}>{String(rows.filter(r=>r.pct!==null&&r.pct>100).length)+" ledgers"}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>review needed</p></div>
      </div>

      {/* Main ledger table */}
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            <th style={{padding:"10px 14px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:10}}>Expense Ledger</th>
            <th style={{padding:"10px 14px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:10}}>Group</th>
            <th style={{padding:"10px 14px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:10}}>{view==="mtd"?"MTD Budget":view==="ytd"?"YTD Budget":"Annual Budget"}</th>
            <th style={{padding:"10px 14px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:10}}>{view==="mtd"?"MTD Actual":view==="ytd"?"YTD Actual":"Annual Actual"}</th>
            <th style={{padding:"10px 12px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:10,minWidth:80}}>Utilisation</th>
            <th style={{padding:"10px 14px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:10}}>Util %</th>
            <th style={{padding:"10px 14px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:10}}>Variance</th>
            <th style={{padding:"10px 14px",textAlign:"center",color:"#d4a437",fontWeight:700,fontSize:10}}>Status</th>
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const gc=GRP_COLORS[r.group]||"#384677";
            const overrun=r.pct!==null&&r.pct>100;
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f8",background:overrun?"#fff9f9":i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"10px 14px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>{r.icon}</span><span style={{fontWeight:600,color:"#0d1326"}}>{r.name}</span></div></td>
                <td style={{padding:"10px 14px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:gc+"22",color:gc}}>{r.group}</span></td>
                <td style={{padding:"10px 14px",textAlign:"right",color:"#5a6691",fontVariantNumeric:"tabular-nums"}}>{r.bgt>0?ff(r.bgt):<span style={{fontSize:10,color:"#bfc3d6"}}>Not set</span>}</td>
                <td style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:r.act>0?"#0d1326":"#bfc3d6",fontVariantNumeric:"tabular-nums"}}>{r.act>0?ff(r.act):"—"}</td>
                <td style={{padding:"10px 12px"}}>{r.bgt>0&&r.act>0&&<Bar pct={r.pct} h={10}/>}</td>
                <td style={{padding:"10px 14px",textAlign:"right"}}>{r.pct!==null&&<span style={{fontSize:11,padding:"3px 9px",borderRadius:999,fontWeight:800,background:pctBg(r.pct),color:pctColor(r.pct)}}>{r.pct}%</span>}</td>
                <td style={{padding:"10px 14px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:vColor(r.variance)}}>{r.bgt>0?(r.variance>=0?"+":"")+ff(Math.abs(r.variance)):"—"}</td>
                <td style={{padding:"10px 14px",textAlign:"center"}}>{r.bgt>0?<span style={{fontSize:9.5,padding:"3px 9px",borderRadius:999,fontWeight:700,background:pctBg(r.pct),color:pctColor(r.pct)}}>{pctLabel(r.pct)}</span>:<span style={{fontSize:9.5,color:"#bfc3d6"}}>—</span>}</td>
              </tr>
            );
          })}</tbody>
          <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={2} style={{padding:"10px 14px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL — {brCode} · {viewLabel}</td>
            <td style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{ff(totBgt)}</td>
            <td style={{padding:"10px 14px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{ff(totAct)}</td>
            <td style={{padding:"10px 12px"}}><div style={{background:"rgba(255,255,255,0.15)",borderRadius:999,height:10,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(totPct||0,100)}%`,background:pctColor(totPct),borderRadius:999}}/></div></td>
            <td style={{padding:"10px 14px",textAlign:"right"}}><span style={{fontSize:12,padding:"3px 10px",borderRadius:999,fontWeight:800,background:pctBg(totPct),color:pctColor(totPct)}}>{totPct}%</span></td>
            <td style={{padding:"10px 14px",textAlign:"right",fontWeight:800,color:totVar>=0?"#d4a437":"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{(totVar>=0?"+":"")+ff(Math.abs(totVar))}</td>
            <td style={{padding:"10px 14px",textAlign:"center"}}><span style={{fontSize:10,padding:"3px 9px",borderRadius:999,fontWeight:700,background:pctBg(totPct),color:pctColor(totPct)}}>{pctLabel(totPct)}</span></td>
          </tr></tfoot>
        </table>
      </div>

      {/* Monthly trend strip */}
      <div style={{...card}}>
        <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Monthly Trend — {fyObj.l} · {brCode}</p>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:6}}>
          {fyObj.keys.map((k,ki)=>{
            const mAct=EXP_ACTUALS.filter(a=>a.m===k&&a.br===brCode).reduce((s,a)=>s+a.a,0);
            const mBgt=EXP_LEDGERS.reduce((s,l)=>s+(budget[l.id]?.monthly||0),0);
            const mPct=mBgt>0?+(mAct/mBgt*100).toFixed(0):null;
            const isSelected=k===selMonth;
            return (
              <div key={k} onClick={()=>{setSelMonth(k);if(view==="annual")setView("mtd");}}
                style={{flex:1,minWidth:58,padding:"8px 6px",borderRadius:9,cursor:"pointer",textAlign:"center",
                  border:`2px solid ${isSelected?"#0d1326":"#e1e3ec"}`,background:isSelected?"#0d1326":pctBg(mPct)}}>
                <p style={{margin:"0 0 2px",fontSize:9,fontWeight:700,color:isSelected?"#d4a437":"#384677"}}>{fyObj.months[ki]}</p>
                <p style={{margin:"0 0 4px",fontSize:16,fontWeight:800,color:isSelected?"#fff":pctColor(mPct)}}>{mPct!==null?`${mPct}%`:"—"}</p>
                <Bar pct={mPct} h={5}/>
                <p style={{margin:"3px 0 0",fontSize:8,color:isSelected?"#8b94b3":"#bfc3d6"}}>{mAct>0?cur+f(mAct):"no data"}</p>
              </div>
            );
          })}
        </div>
        <div style={{marginTop:10,display:"flex",gap:10,fontSize:10,color:"#5a6691",flexWrap:"wrap"}}>
          <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,background:"#EAF3DE",borderRadius:2,border:"1px solid #e1e3ec"}}/>≤80% — Under budget</span>
            <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,background:"#EAF3DE",borderRadius:2,border:"1px solid #e1e3ec"}}/>80-100% — On budget</span>
            <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,background:"#FAEEDA",borderRadius:2,border:"1px solid #e1e3ec"}}/>100-120% — Slightly over</span>
            <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,background:"#FCEBEB",borderRadius:2,border:"1px solid #e1e3ec"}}/>120%+ — Over budget</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HR & PAYROLL — 4 Screens
   Employee Master · Attendance · Salary Run · Payslips
   ════════════════════════════════════════════════════════════════ */


export function ReportCommission({branch}){
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [period,setPeriod]=useState("2026-05");
  const PERIODS=[{v:"2026-03",l:"Mar 2026"},{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"}];

  const rows=useMemo(()=>{
    const bills=GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&b.date.startsWith(period));
    const suppMap={};
    bills.forEach(b=>{
      if(!suppMap[b.supplier])suppMap[b.supplier]={supplier:b.supplier,mod:b.mod,bookings:0,revenue:0,commRate:0,commission:0};
      const rate=b.mod==="Insurance"?15:b.mod==="Flight"?2:b.mod==="Holiday"?3:1;
      const comm=Math.round(b.sell*rate/100);
      suppMap[b.supplier].bookings++;
      suppMap[b.supplier].revenue+=b.sell;
      suppMap[b.supplier].commRate=rate;
      suppMap[b.supplier].commission+=comm;
    });
    return Object.values(suppMap).sort((a,b2)=>b2.commission-a.commission);
  },[brCode,period]);

  const totComm=rows.reduce((s,r)=>s+r.commission,0);
  const totRev =rows.reduce((s,r)=>s+r.revenue,0);
  const tds    =rows.filter(r=>r.commission>15000).reduce((s,r)=>s+Math.round(r.commission*0.05),0);
  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");

  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>💼</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Commission Income Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Override commission from airlines, insurers, hotels · TDS 194H on payout</p>
          </div>
        </div>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Total Commission",v:f(totComm),c:"#27500A",bg:"#EAF3DE"},
          {l:"On Revenue",v:f(totRev),c:"#185FA5",bg:"#E6F1FB"},
          {l:"TDS 194H (5%)",v:f(tds),c:"#A32D2D",bg:"#FCEBEB"},
          {l:"Net Receivable",v:f(totComm-tds),c:"#1D9E75",bg:"#EAF3DE"},
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
            {["Supplier / Principal","Module","Bookings","Revenue","Comm %","Commission Earned","TDS 194H","Net Payable"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=3?"right":"left",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const tdsAmt=r.commission>15000?Math.round(r.commission*0.05):0;
            return (
              <tr key={r.supplier} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"9px 12px",fontWeight:600,color:"#0d1326"}}>{r.supplier}</td>
                <td style={{padding:"9px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{r.mod}</span></td>
                <td style={{padding:"9px 12px",textAlign:"right",color:"#5a6691"}}>{r.bookings}</td>
                <td style={{padding:"9px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(r.revenue)}</td>
                <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:"#27500A"}}>{r.commRate}%</td>
                <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:"#27500A"}}>{f(r.commission)}</td>
                <td style={{padding:"9px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:tdsAmt>0?"#A32D2D":"#bfc3d6"}}>{tdsAmt>0?f(tdsAmt):"—"}</td>
                <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(r.commission-tdsAmt)}</td>
              </tr>
            );
          })}</tbody>
          <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={5} style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL — {rows.length} principals</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totComm)}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(tds)}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(totComm-tds)}</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   NOTIFICATIONS PANEL (wired to bell icon via NotifPanel)
   ════════════════════════════════════════════════════════════════ */

export function MisReport({branch}){
  const mob=useMobile();
  const [period,setPeriod]=useState("2026-05");
  const PERIODS=[{v:"2026-03",l:"Mar 2026"},{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"}];
  const brCode=branch==="ALL"?null:branch?.code;
  const cfg=bc(branch);
  const cur=cfg.cur;

  /* Current period */
  const bills  =GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&b.date.startsWith(period));
  const prev   =GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&b.date.startsWith(period==="2026-05"?"2026-04":period==="2026-04"?"2026-03":"2026-02"));
  const acts   =EXP_ACTUALS.filter(a=>(!brCode||a.br===brCode)&&a.m===period);
  const tgt    =null; /* sales targets module removed — CRM app now owns this */

  const rev    =bills.reduce((s,b)=>s+b.sell,0);
  const cost   =bills.reduce((s,b)=>s+b.cost,0);
  const gp     =rev-cost;
  const gpPct  =rev>0?+(gp/rev*100).toFixed(1):0;
  const exp    =acts.reduce((s,a)=>s+a.a,0);
  const netPft =gp-exp;
  const prevRev=prev.reduce((s,b)=>s+b.sell,0);
  const prevGP =prev.reduce((s,b)=>s+b.sell-b.cost,0);
  const tgtRev =tgt?Object.values(tgt).reduce((s,t)=>s+(t.sell||0),0):0;
  const tgtGP  =tgt?Object.values(tgt).reduce((s,t)=>s+(t.gp||0),0):0;
  const revAchv=tgtRev>0?Math.round(rev/tgtRev*100):null;
  const gpAchv =tgtGP>0?Math.round(gp/tgtGP*100):null;
  const revGrowth=prevRev>0?+(( rev-prevRev)/prevRev*100).toFixed(1):null;
  const gpGrowth =prevGP>0?+((gp-prevGP)/prevGP*100).toFixed(1):null;

  /* Top consultants */
  const consultMap={};
  bills.forEach(b=>{if(!consultMap[b.consultant])consultMap[b.consultant]={rev:0,gp:0,bks:0};consultMap[b.consultant].rev+=b.sell;consultMap[b.consultant].gp+=b.sell-b.cost;consultMap[b.consultant].bks++;});
  const topConsult=Object.entries(consultMap).sort((a,b)=>b[1].gp-a[1].gp).slice(0,3);

  /* Top clients */
  const clientMap={};
  bills.forEach(b=>{if(!clientMap[b.client])clientMap[b.client]={rev:0,gp:0};clientMap[b.client].rev+=b.sell;clientMap[b.client].gp+=b.sell-b.cost;});
  const topClients=Object.entries(clientMap).sort((a,b)=>b[1].rev-a[1].rev).slice(0,3);

  /* Overdue receivables */
  const overdueClients=Object.entries(clientMap).filter(([,v])=>v.rev>50000).map(([k,v])=>({client:k,outstanding:Math.round(v.rev*0.25)}));

  /* Monthly trend (last 5 months) */
  const trendMonths=["2025-12","2026-01","2026-02","2026-03","2026-04","2026-05"].filter(m=>m<=period).slice(-5);
  const trendData=trendMonths.map(m=>{
    const mb=GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&b.date.startsWith(m));
    const mr=mb.reduce((s,b)=>s+b.sell,0);
    const mg=mb.reduce((s,b)=>s+b.sell-b.cost,0);
    return {m:m,rev:mr,gp:mg,gpPct:mr>0?+(mg/mr*100).toFixed(1):0};
  });
  const maxRev=Math.max(...trendData.map(t=>t.rev),1);

  const f=n=>n>=10000000?cur+(n/10000000).toFixed(1)+"Cr":n>=100000?cur+(n/100000).toFixed(1)+"L":n>=1000?cur+(n/1000).toFixed(0)+"K":cur+n.toFixed(0);
  const pct=(val,total)=>total>0?Math.round(val/total*100):0;

  const KPI=({label,value,sub,achv,growth,color})=>(
    <div style={{...card,borderTop:`3px solid ${color||"#185FA5"}`,padding:"11px 14px",background:"#fff"}}>
      <p style={{margin:0,fontSize:9,fontWeight:700,color:color||"#185FA5",textTransform:"uppercase",letterSpacing:"0.4px"}}>{label}</p>
      <p style={{margin:"4px 0 2px",fontSize:mob?18:22,fontWeight:800,color:"#0d1326"}}>{value}</p>
      {sub&&<p style={{margin:0,fontSize:10,color:"#5a6691"}}>{sub}</p>}
      <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
        {achv!=null&&<span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:achv>=90?"#EAF3DE":achv>=70?"#FAEEDA":"#FCEBEB",color:achv>=90?"#27500A":achv>=70?"#854F0B":"#A32D2D"}}>{achv}% of target</span>}
        {growth!=null&&<span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:growth>=0?"#EAF3DE":"#FCEBEB",color:growth>=0?"#27500A":"#A32D2D"}}>{growth>=0?"+":""}{growth}% MoM</span>}
      </div>
    </div>
  );

  return (
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#0d1326,#185FA5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:"#d4a437",fontWeight:800}}>MIS</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Management Information System</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{PERIODS.find(p=>p.v===period)?.l} · {brCode||"Travkings Group"} · Monday Morning Report</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <button style={{...btnG,fontSize:11}}><Download size={13}/> Export</button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:14}}>
        <KPI label="Revenue" value={f(rev)} sub={`${bills.length} bookings`} achv={revAchv} growth={revGrowth} color="#185FA5"/>
        <KPI label="Gross Profit" value={f(gp)} sub={`GP% ${gpPct}%`} achv={gpAchv} growth={gpGrowth} color="#27500A"/>
        <KPI label="Net Profit" value={f(netPft)} sub={`After expenses ${f(exp)}`} color={netPft>0?"#1D9E75":"#A32D2D"}/>
        <KPI label="GP%" value={`${gpPct}%`} sub={`Prev: ${prevRev>0?+(prevGP/prevRev*100).toFixed(1):0}%`} color={gpPct>=12?"#27500A":gpPct>=8?"#854F0B":"#A32D2D"}/>
        <KPI label="Bookings" value={String(bills.length)} sub={`Prev period: ${prev.length}`} color="#384677"/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"2fr 1fr",gap:12,marginBottom:12}}>
        {/* Revenue Waterfall / Bar Chart */}
        <div style={{...card}}>
          <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>📊 Revenue Trend vs GP — Last 5 Months</p>
          <div style={{display:"flex",gap:6,alignItems:"flex-end",height:140,paddingBottom:20,position:"relative"}}>
            {trendData.map((t,i)=>{
              const barH=maxRev>0?Math.round(t.rev/maxRev*120):0;
              const gpH =maxRev>0?Math.round(t.gp/maxRev*120):0;
              const isCurrentPeriod=t.m===period;
              return (
                <div key={t.m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                  <p style={{margin:"0 0 2px",fontSize:8.5,fontWeight:600,color:isCurrentPeriod?"#185FA5":"#5a6691",textAlign:"center"}}>{f(t.rev)}</p>
                  <div style={{width:"100%",display:"flex",gap:1,alignItems:"flex-end",height:120}}>
                    <div style={{flex:1,background:isCurrentPeriod?"#185FA5":"#B5D4F4",borderRadius:"3px 3px 0 0",height:barH,minHeight:2,transition:"height 0.3s"}}/>
                    <div style={{flex:1,background:isCurrentPeriod?"#27500A":"#C0DD97",borderRadius:"3px 3px 0 0",height:gpH,minHeight:2,transition:"height 0.3s"}}/>
                  </div>
                  <p style={{margin:0,fontSize:8,color:isCurrentPeriod?"#0d1326":"#5a6691",fontWeight:isCurrentPeriod?700:400,textAlign:"center"}}>{t.m.slice(5)}</p>
                  <p style={{margin:0,fontSize:7.5,color:"#854F0B"}}>{t.gpPct}%</p>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center",fontSize:9.5,color:"#5a6691"}}>
            <span><span style={{display:"inline-block",width:10,height:10,background:"#185FA5",borderRadius:2,marginRight:4}}/>Revenue</span>
            <span><span style={{display:"inline-block",width:10,height:10,background:"#27500A",borderRadius:2,marginRight:4}}/>GP</span>
          </div>
        </div>

        {/* Top consultants */}
        <div style={{...card}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>🏆 Top Consultants — {PERIODS.find(p=>p.v===period)?.l}</p>
          {topConsult.length===0&&<p style={{fontSize:11,color:"#5a6691"}}>No data for this period/branch</p>}
          {topConsult.map(([name,d],i)=>(
            <div key={name} style={{padding:"8px 0",borderBottom:"1px solid #f3f4f8"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:14}}>{["🥇","🥈","🥉"][i]}</span>
                  <span style={{fontWeight:600,color:"#0d1326",fontSize:11}}>{name}</span>
                </div>
                <span style={{fontSize:11,fontWeight:700,color:"#27500A"}}>{f(d.gp)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9.5,color:"#5a6691"}}>
                <span>{d.bks} bookings · Rev {f(d.rev)}</span>
                <span>{rev>0?pct(d.rev,rev):0}% of total</span>
              </div>
              <div style={{marginTop:4,height:4,borderRadius:2,background:"#e1e3ec",overflow:"hidden"}}>
                <div style={{width:`${pct(d.rev,rev)}%`,height:"100%",background:"#27500A",borderRadius:2}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:12}}>
        {/* Top clients */}
        <div style={{...card}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>👥 Top Clients</p>
          {topClients.map(([name,d],i)=>(
            <div key={name} style={{padding:"7px 0",borderBottom:"1px solid #f3f4f8"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:11,fontWeight:600,color:"#0d1326"}}>{name}</span>
                <span style={{fontSize:11,fontWeight:700,color:"#185FA5"}}>{f(d.rev)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9.5,color:"#5a6691",marginTop:1}}>
                <span>GP: {f(d.gp)} ({rev>0?pct(d.gp,gp):0}% of total GP)</span>
              </div>
            </div>
          ))}
        </div>

        {/* Overdue receivables */}
        <div style={{...card,borderTop:"3px solid #A32D2D"}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#A32D2D"}}>⚠ Overdue Receivables</p>
          {overdueClients.slice(0,4).map(c=>(
            <div key={c.client} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f3f4f8"}}>
              <span style={{fontSize:10.5,color:"#0d1326"}}>{c.client}</span>
              <span style={{fontSize:11,fontWeight:700,color:"#A32D2D"}}>{f(c.outstanding)}</span>
            </div>
          ))}
          {overdueClients.length===0&&<p style={{fontSize:11,color:"#27500A"}}>✔ No overdue receivables</p>}
          <div style={{marginTop:8,padding:"7px 10px",borderRadius:7,background:"#FCEBEB",fontSize:9.5,color:"#A32D2D",fontWeight:600}}>
            Total: {f(overdueClients.reduce((s,c)=>s+c.outstanding,0))}
          </div>
        </div>

        {/* Action items */}
        <div style={{...card,borderTop:"3px solid #854F0B"}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#854F0B"}}>📋 Action Items This Week</p>
          {[
            {icon:"💳",text:`BSP payment due Monday — check BSP Summary`,urgent:true},
            {icon:"📋",text:`GSTR-3B filing — ${period === "2026-05"?"20 Jun 2026":"20 May 2026"}`,urgent:false},
            {icon:"📞",text:`Follow up: ${overdueClients[0]?.client||"—"} overdue`,urgent:overdueClients.length>0},
            {icon:"🎯",text:`Target review — ${revAchv!=null?`${revAchv}% achieved`:"No target set"}`,urgent:revAchv!=null&&revAchv<80},
            {icon:"👥",text:`${prev.length} bookings in pipeline from last month`,urgent:false},
          ].map((item,i)=>(
            <div key={i} style={{display:"flex",gap:6,padding:"5px 0",borderBottom:"1px solid #f3f4f8",alignItems:"flex-start"}}>
              <span>{item.icon}</span>
              <span style={{fontSize:10.5,color:item.urgent?"#A32D2D":"#384677",fontWeight:item.urgent?600:400,lineHeight:1.4}}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── ITEM 2: CLIENT CONCENTRATION RISK  /reports/concentration ── */

export function ClientConcentration({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [period,setPeriod]=useState("2026-05");
  const PERIODS=[{v:"2026-03",l:"Mar 2026"},{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"},{v:"ALL",l:"All Time"}];

  const bills=GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&(period==="ALL"||b.date.startsWith(period)));
  const totalRev=bills.reduce((s,b)=>s+b.sell,0);

  const clientMap={};
  bills.forEach(b=>{
    if(!clientMap[b.client])clientMap[b.client]={client:b.client,rev:0,gp:0,books:0,branch:b.branch};
    clientMap[b.client].rev+=b.sell;clientMap[b.client].gp+=b.sell-b.cost;clientMap[b.client].books++;
  });
  const clients=Object.values(clientMap).sort((a,b)=>b.rev-a.rev);
  const top10Rev=clients.slice(0,10).reduce((s,c)=>s+c.rev,0);
  const top1Rev=clients[0]?.rev||0;
  const top3Rev=clients.slice(0,3).reduce((s,c)=>s+c.rev,0);
  const herfindahl=clients.reduce((s,c)=>s+Math.pow(totalRev>0?c.rev/totalRev:0,2),0);
  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");
  const pct=n=>totalRev>0?(n/totalRev*100).toFixed(1):0;

  const COLORS=["#185FA5","#27500A","#854F0B","#1D9E75","#A32D2D","#384677","#d4a437","#5a6691","#0d1326","#1a2340"];

  const risk=top1Rev/totalRev>0.4?"HIGH":top3Rev/totalRev>0.6?"MEDIUM":"LOW";
  const RISK_CLR={HIGH:"#A32D2D",MEDIUM:"#854F0B",LOW:"#27500A"};
  const RISK_BG ={HIGH:"#FCEBEB",MEDIUM:"#FAEEDA",LOW:"#EAF3DE"};

  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🥧</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Client Concentration Risk</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Revenue dependency by client — diversification analysis</p>
          </div>
        </div>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
      </div>

      {/* Risk alerts */}
      <div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,
        background:RISK_BG[risk],border:`1px solid ${RISK_CLR[risk]}40`,
        display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div>
          <span style={{fontSize:13,fontWeight:800,color:RISK_CLR[risk]}}>Concentration Risk: {risk}</span>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:RISK_CLR[risk]}}>
            Top client: {pct(top1Rev)}% · Top 3: {pct(top3Rev)}% · Top 10: {pct(top10Rev)}% of revenue
          </p>
        </div>
        <div style={{textAlign:"right"}}>
          <p style={{margin:0,fontSize:10,color:"#5a6691"}}>Herfindahl Index: {herfindahl.toFixed(3)}</p>
          <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{"<0.15 = healthy · 0.15–0.25 = moderate · >0.25 = concentrated"}</p>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
        {/* Visual concentration chart */}
        <div style={{...card}}>
          <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Revenue Concentration — Top {Math.min(10,clients.length)} Clients</p>
          {/* Stacked bar */}
          <div style={{height:28,borderRadius:6,overflow:"hidden",display:"flex",marginBottom:12}}>
            {clients.slice(0,10).map((c,i)=>(
              <div key={c.client} style={{width:`${pct(c.rev)}%`,background:COLORS[i],minWidth:2}} title={`${c.client}: ${pct(c.rev)}%`}/>
            ))}
            <div style={{flex:1,background:"#e1e3ec"}}/>
          </div>
          {/* Legend */}
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {clients.slice(0,10).map((c,i)=>(
              <div key={c.client} style={{display:"flex",alignItems:"center",gap:4,fontSize:9.5,color:"#384677"}}>
                <div style={{width:10,height:10,borderRadius:2,background:COLORS[i],flexShrink:0}}/>
                <span style={{maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.client}</span>
                <span style={{fontWeight:700,color:COLORS[i]}}>{pct(c.rev)}%</span>
              </div>
            ))}
          </div>
          <div style={{marginTop:10,padding:"8px 12px",borderRadius:8,background:"#f3f4f8",fontSize:10,color:"#5a6691"}}>
            Ideal: No single client {">"}20% · Top 3 {"<"}40% · Spread across {">"}15 clients
          </div>
        </div>

        {/* Table */}
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["#","Client","Revenue","GP","Share","Risk"].map((h,i)=>(
                <th key={i} style={{padding:"8px 10px",textAlign:i>=2&&i<=4?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{clients.slice(0,12).map((c,i)=>{
              const share=totalRev>0?c.rev/totalRev:0;
              const riskLevel=share>0.3?"HIGH":share>0.15?"MEDIUM":"LOW";
              return (
                <tr key={c.client} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"7px 10px",textAlign:"center"}}>
                    <div style={{width:12,height:12,borderRadius:3,background:COLORS[i]||"#bfc3d6",display:"inline-block"}}/>
                  </td>
                  <td style={{padding:"7px 10px",fontWeight:600,color:"#0d1326",maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.client}</td>
                  <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(c.rev)}</td>
                  <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#27500A"}}>{f(c.gp)}</td>
                  <td style={{padding:"7px 10px",textAlign:"right"}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
                      <span style={{fontWeight:700,color:COLORS[i]||"#5a6691"}}>{(share*100).toFixed(1)}%</span>
                      <div style={{width:50,height:4,borderRadius:2,background:"#e1e3ec",overflow:"hidden"}}>
                        <div style={{width:`${Math.min(share*100,100)}%`,height:"100%",background:COLORS[i]||"#bfc3d6"}}/>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:"7px 10px"}}>
                    <span style={{fontSize:9,padding:"2px 6px",borderRadius:999,fontWeight:700,
                      background:RISK_BG[riskLevel],color:RISK_CLR[riskLevel]}}>{riskLevel}</span>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── ITEM 3: CASH RUNWAY added as KpiCard in Dashboard (as component) ── */

export function CashRunwayCard({branch}){
  const brCode=branch==="ALL"?null:branch?.code;
  const cfg=bc(branch);
  const cur=cfg.cur;

  const bills=GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&b.date.startsWith("2026-05"));
  const acts =EXP_ACTUALS.filter(a=>(!brCode||a.br===brCode)&&a.m==="2026-05");
  const monthlyBurn=acts.reduce((s,a)=>s+a.a,0);
  const monthlyRev=bills.reduce((s,b)=>s+b.sell,0);
  const cashBalance=monthlyRev*0.35; // estimated bank balance
  const runway=monthlyBurn>0?Math.round(cashBalance/monthlyBurn*30):999;
  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");
  const clr=runway>60?"#27500A":runway>30?"#854F0B":"#A32D2D";
  const bg=runway>60?"#EAF3DE":runway>30?"#FAEEDA":"#FCEBEB";

  return (
    <div style={{...card,borderTop:`3px solid ${clr}`,padding:"12px 14px",background:bg}}>
      <p style={{margin:0,fontSize:9,fontWeight:700,color:clr,textTransform:"uppercase"}}>Cash Runway</p>
      <p style={{margin:"4px 0 2px",fontSize:24,fontWeight:800,color:"#0d1326"}}>{runway > 365 ? ">1yr" : `${runway}d`}</p>
      <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>Bank est. {f(cashBalance)} · Burn {f(monthlyBurn)}/mo</p>
    </div>
  );
}

/* ── ITEM 4: CONSOLIDATED BALANCE SHEET  /reports/consolidated-bs ── */

export function ConsolidatedBS(){
  const mob=useMobile();
  const [period,setPeriod]=useState("2026-05");
  const PERIODS=[{v:"2026-03",l:"Mar 2026"},{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"}];
  const FX={KES:0.65,TZS:0.03,USD:83.42,INR:1};

  const getBranchBS=(code)=>{
    const br=BRANCHES.find(b=>b.code===code)||{currency:"INR"};
    const rate=FX[br.currency]||1;
    const FY_MONTHS=["2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03"].filter(m=>m<=period);
    const bills=GP_BILLS.filter(b=>b.branch===code&&FY_MONTHS.includes(b.date.slice(0,7)));
    const acts=EXP_ACTUALS.filter(a=>a.br===code&&FY_MONTHS.includes(a.m));
    const rev=bills.reduce((s,b)=>s+b.sell,0)*rate;
    const cost=bills.reduce((s,b)=>s+b.cost,0)*rate;
    const exp=acts.reduce((s,a)=>s+a.a,0)*rate;
    const gp=rev-cost;const np=gp-exp;
    const debtors=rev*0.25;const creditors=cost*0.18;
    const bank=Math.max(np*0.6+rev*0.15,0);
    return {code,rev,gp,np,debtors,creditors,bank,capital:250000*rate,retained:Math.max(np,0),
      fixedAssets:120000*rate,gstPayable:Math.max(rev*0.04-cost*0.02,0),advance:rev*0.04};
  };

  const branches=["TKHO","BOM","AMD","NBO","DAR","FBM"].map(getBranchBS);

  /* Group sums (eliminating intercompany - simplified: 5% of creditors are intercompany) */
  const sumKey=(key)=>branches.reduce((s,b)=>s+b[key],0);
  const group={
    fixedAssets: sumKey("fixedAssets"),
    bank:        sumKey("bank"),
    debtors:     sumKey("debtors")*0.95, // 5% elimination
    capital:     sumKey("capital"),
    retained:    sumKey("retained"),
    creditors:   sumKey("creditors")*0.95,
    gstPayable:  sumKey("gstPayable"),
    advance:     sumKey("advance"),
  };
  const totalAssets=group.fixedAssets+group.bank+group.debtors+20000;
  const totalLiab  =group.capital+group.retained+group.creditors+group.gstPayable+group.advance;
  const f=n=>"₹"+Number(Math.round(n/1000)).toLocaleString()+"K";

  const Row=({label,val,sub,bold,indent})=>(
    <div style={{display:"flex",justifyContent:"space-between",padding:`${bold?"10px":"7px"} 14px`,
      borderBottom:"1px solid #f3f4f8",background:bold?"#f3f4f8":"#fff"}}>
      <span style={{fontSize:11,fontWeight:bold?700:400,color:"#0d1326",paddingLeft:indent?12:0}}>{label}</span>
      <div style={{textAlign:"right"}}>
        <p style={{margin:0,fontWeight:bold?800:500,color:bold?"#0d1326":"#384677",fontVariantNumeric:"tabular-nums",fontSize:bold?13:11}}>{f(val)}</p>
        {sub&&<p style={{margin:0,fontSize:9,color:"#5a6691"}}>{sub}</p>}
      </div>
    </div>
  );

  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📊</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Consolidated Balance Sheet</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>All branches · INR-equivalent · 5% intercompany elimination</p>
          </div>
        </div>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
      </div>

      {/* Branch forex legend */}
      <div style={{...card,padding:"10px 14px",marginBottom:12,background:"#f3f4f8",fontSize:10,color:"#5a6691"}}>
        <b>FX Rates applied:</b> KES 0.65 → INR · TZS 0.03 → INR · USD 83.42 → INR · BOM/AMD native INR
      </div>

      {Math.abs(totalAssets-totalLiab)<totalAssets*0.05
        ?<div style={{marginBottom:10,padding:"8px 14px",borderRadius:8,background:"#EAF3DE",border:"1px solid #C0DD97",fontSize:10.5,color:"#27500A",fontWeight:600}}>✔ Consolidated Balance Sheet tallied (within 5% rounding) · Total: {f(totalAssets)}</div>
        :<div style={{marginBottom:10,padding:"8px 14px",borderRadius:8,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:10.5,color:"#854F0B",fontWeight:600}}>⚠ Difference: {f(Math.abs(totalAssets-totalLiab))} — adjustment entry required</div>
      }

      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
        {/* Assets */}
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <div style={{background:"#185FA5",padding:"10px 14px"}}><p style={{margin:0,fontSize:13,fontWeight:800,color:"#fff"}}>ASSETS</p></div>
          <Row label="Fixed Assets (net)" val={group.fixedAssets} sub="Equipment, furniture across all branches"/>
          <Row label="Bank Accounts (all branches)" val={group.bank} sub="Converted to INR at current FX"/>
          <Row label="Trade Receivables" val={group.debtors} sub="Post 5% intercompany elimination"/>
          <Row label="Other Assets" val={20000} sub="Deposits, advances"/>
          <Row label="TOTAL ASSETS" val={totalAssets} bold/>
        </div>
        {/* Liabilities */}
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <div style={{background:"#0d1326",padding:"10px 14px"}}><p style={{margin:0,fontSize:13,fontWeight:800,color:"#fff"}}>LIABILITIES & CAPITAL</p></div>
          <Row label="Capital — all entities" val={group.capital} sub="₹2.5L equivalent per branch"/>
          <Row label="Retained Earnings (FY)" val={group.retained} sub="Cumulative net profit"/>
          <Row label="Trade Payables" val={group.creditors} sub="Post 5% intercompany elimination"/>
          <Row label="GST/VAT Payable (net)" val={group.gstPayable} sub="Output minus input credit"/>
          <Row label="Advance from Clients" val={group.advance} sub="Booking deposits"/>
          <Row label="TOTAL LIABILITIES" val={totalLiab} bold/>
        </div>
      </div>

      {/* Branch breakdown */}
      <div style={{...card,padding:0,overflow:"hidden",marginTop:12}}>
        <div style={{padding:"10px 14px",background:"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
          <p style={{margin:0,fontSize:11,fontWeight:700,color:"#384677"}}>Branch Contribution — INR Equivalent</p>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Branch","Revenue (INR)","Gross Profit","Net Profit","Bank Balance","Receivables"].map((h,i)=>(
              <th key={i} style={{padding:"8px 12px",textAlign:i>=1?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{branches.map((b,i)=>(
            <tr key={b.code} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px",fontWeight:700,color:"#0d1326"}}>{BRANCHES.find(br=>br.code===b.code)?.flag||""} {b.code}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(b.rev)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#27500A"}}>{f(b.gp)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",color:b.np>0?"#1D9E75":"#A32D2D"}}>{f(b.np)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(b.bank)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(b.debtors)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ── ITEM 5: INTER-BRANCH TRANSACTION TAGGER (component shown in BookingFiles) ── */
/* Inter-branch flag is added as a field in BookingFiles — "type" can be "Intercompany" */
/* This is handled by the intercompany flag in Booking File records */

/* ── ITEM 6: ADVANCE / DEPOSIT LEDGER  /bookings/advances ─────── */

export function ConsultantReport({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:branch?.code;
  const [period,setPeriod]=useState("2026-05");
  const [view,setView]=useState("table"); // table | trend
  const PERIODS=[{v:"2026-03",l:"Mar 2026"},{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"},{v:"YTD",l:"YTD 2026"}];
  const FY_MONTHS=["2026-04","2026-05"];

  const bills=useMemo(()=>GP_BILLS.filter(b=>
    (!brCode||b.branch===brCode)&&
    (period==="YTD"?FY_MONTHS.includes(b.date.slice(0,7)):b.date.startsWith(period))
  ),[brCode,period]);

  const billsPrev=useMemo(()=>GP_BILLS.filter(b=>
    (!brCode||b.branch===brCode)&&b.date.startsWith("2026-04")
  ),[brCode]);

  // Build per-consultant stats
  const stats=useMemo(()=>{
    const m={};
    bills.forEach(b=>{
      if(!m[b.consultant])m[b.consultant]={name:b.consultant,rev:0,cost:0,bks:0,mods:{}};
      m[b.consultant].rev+=b.sell;m[b.consultant].cost+=b.cost;m[b.consultant].bks++;
      m[b.consultant].mods[b.mod]=(m[b.consultant].mods[b.mod]||0)+1;
    });
    return Object.values(m).map(c=>({
      ...c,
      gp:c.rev-c.cost,
      gpPct:c.rev>0?+(( c.rev-c.cost)/c.rev*100).toFixed(1):0,
      avgTicket:c.bks>0?Math.round(c.rev/c.bks):0,
      topMod:Object.entries(c.mods).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—",
    })).sort((a,b)=>b.gp-a.gp);
  },[bills]);

  const prevMap=useMemo(()=>{
    const m={};
    billsPrev.forEach(b=>{if(!m[b.consultant])m[b.consultant]={rev:0,gp:0,bks:0};
      m[b.consultant].rev+=b.sell;m[b.consultant].gp+=b.sell-b.cost;m[b.consultant].bks++;});
    return m;
  },[billsPrev]);

  // Month-by-month for trend view
  const trendData=useMemo(()=>{
    const months=["2026-03","2026-04","2026-05"];
    const consults=[...new Set(GP_BILLS.filter(b=>!brCode||b.branch===brCode).map(b=>b.consultant))];
    return consults.slice(0,5).map(name=>({
      name,
      data:months.map(m=>{
        const mb=GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&b.consultant===name&&b.date.startsWith(m));
        return{m:m,gp:mb.reduce((s,b)=>s+b.sell-b.cost,0),bks:mb.length};
      }),
    }));
  },[brCode]);

  const totRev=stats.reduce((s,c)=>s+c.rev,0);
  const totGP =stats.reduce((s,c)=>s+c.gp,0);
  const totBks=stats.reduce((s,c)=>s+c.bks,0);
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const RANK_CLR=["#FFD700","#C0C0C0","#CD7F32"];
  const MOD_CLR={Flight:"#378ADD",Holiday:"#1D9E75",Hotel:"#BA7517",Visa:"#D4537E",Car:"#7F77DD",Insurance:"#5F9EA0",Misc:"#888"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1300,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🏆</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Consultant Productivity</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{stats.length} consultants · {totBks} bookings · Total GP {f(totGP)}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <button onClick={()=>setView("table")} style={{padding:"7px 14px",border:"none",cursor:"pointer",fontWeight:view==="table"?700:500,background:view==="table"?"#fff":"transparent",borderRadius:6}}>📊 Table</button><button onClick={()=>setView("trend")} style={{padding:"7px 14px",border:"none",cursor:"pointer",fontWeight:view==="trend"?700:500,background:view==="trend"?"#fff":"transparent",borderRadius:6}}>📈 Trend</button>
          <button onClick={()=>exportToCSV(stats,["name","rev","cost","gp","gpPct","bks","avgTicket","topMod"],"consultants.csv")} style={{...btnGh,fontSize:11}}><Download size={12}/> CSV</button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Consultants",v:String(stats.length),c:"#384677",bg:"#f3f4f8"},
          {l:"Total Revenue",v:f(totRev),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Total GP",v:f(totGP),c:"#27500A",bg:"#EAF3DE"},
          {l:"Avg GP/Consultant",v:stats.length>0?f(Math.round(totGP/stats.length)):"—",c:"#1D9E75",bg:"#EAF3DE"},
          {l:"Avg Ticket Value",v:totBks>0?f(Math.round(totRev/totBks)):"—",c:"#854F0B",bg:"#FAEEDA"},
          {l:"Total Bookings",v:String(totBks),c:"#384677",bg:"#f3f4f8"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:mob?17:21,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      {view==="table"&&(
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Rank","Consultant","Revenue","Cost","Gross Profit","GP%","Bookings","Avg Ticket","Top Module","vs Prev Month"].map((h,i)=>(
                <th key={i} style={{padding:"9px 11px",textAlign:i>=2&&i<=8?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{stats.map((c,i)=>{
              const prev=prevMap[c.name];
              const gpDelta=prev?c.gp-prev.gp:null;
              return(
                <tr key={c.name} style={{borderBottom:"1px solid #f3f4f8",background:i<3?"#fffdf5":i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"9px 11px",textAlign:"center"}}>
                    <span style={{fontSize:i<3?20:12,color:RANK_CLR[i]||"#5a6691",fontWeight:800}}>{i<3?"⭐":i+1}</span>
                  </td>
                  <td style={{padding:"9px 11px",fontWeight:700,color:"#0d1326"}}>{c.name}</td>
                  <td style={{padding:"9px 11px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(c.rev)}</td>
                  <td style={{padding:"9px 11px",textAlign:"right",color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{f(c.cost)}</td>
                  <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,color:"#27500A",fontVariantNumeric:"tabular-nums"}}>{f(c.gp)}</td>
                  <td style={{padding:"9px 11px",textAlign:"right"}}>
                    <span style={{fontSize:10.5,padding:"2px 7px",borderRadius:999,fontWeight:800,
                      background:c.gpPct>=15?"#EAF3DE":c.gpPct>=8?"#FAEEDA":"#FCEBEB",
                      color:c.gpPct>=15?"#27500A":c.gpPct>=8?"#854F0B":"#A32D2D"}}>{c.gpPct}%</span>
                  </td>
                  <td style={{padding:"9px 11px",textAlign:"right",fontWeight:600}}>{c.bks}</td>
                  <td style={{padding:"9px 11px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#384677"}}>{f(c.avgTicket)}</td>
                  <td style={{padding:"9px 11px",textAlign:"right"}}>
                    <span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:(MOD_CLR[c.topMod]||"#384677")+"22",color:MOD_CLR[c.topMod]||"#384677"}}>{c.topMod}</span>
                  </td>
                  <td style={{padding:"9px 11px",textAlign:"right"}}>
                    {gpDelta!=null?<span style={{fontSize:10,fontWeight:700,color:gpDelta>=0?"#27500A":"#A32D2D"}}>{gpDelta>=0?"+":""}{f(gpDelta)}</span>:<span style={{color:"#bfc3d6",fontSize:10}}>—</span>}
                  </td>
                </tr>
              );
            })}</tbody>
            <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
              <td colSpan={2} style={{padding:"9px 11px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL</td>
              <td style={{padding:"9px 11px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(totRev)}</td>
              <td style={{padding:"9px 11px",textAlign:"right",color:"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(stats.reduce((s,c)=>s+c.cost,0))}</td>
              <td style={{padding:"9px 11px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totGP)}</td>
              <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,color:totRev>0?"#5ab84b":"#8b94b3"}}>{totRev>0?+(totGP/totRev*100).toFixed(1):0}%</td>
              <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,color:"#fff"}}>{totBks}</td>
              <td colSpan={3}/>
            </tr></tfoot>
          </table>
        </div>
      )}

      {view==="trend"&&(
        <div style={{...card}}>
          <p style={{margin:"0 0 14px",fontSize:12,fontWeight:700,color:"#0d1326"}}>GP Trend — Mar/Apr/May 2026 (Top 5 Consultants)</p>
          {trendData.map((c,ci)=>(
            <div key={c.name} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontWeight:700,fontSize:11,color:"#0d1326"}}>{c.name}</span>
                <span style={{fontSize:10.5,color:"#5a6691"}}>{c.data.reduce((s,d)=>s+d.bks,0)} bookings total</span>
              </div>
              <div style={{display:"flex",gap:6}}>
                {c.data.map((d,di)=>{
                  const maxGP=Math.max(...trendData.flatMap(x=>x.data).map(x=>x.gp),1);
                  const h=Math.round(d.gp/maxGP*60);
                  return(
                    <div key={d.m} style={{flex:1,textAlign:"center"}}>
                      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",height:64,marginBottom:2}}>
                        <div style={{width:"60%",height:Math.max(h,2),background:["#185FA5","#27500A","#854F0B"][ci%3]||"#384677",borderRadius:"3px 3px 0 0",transition:"height 0.3s"}}/>
                      </div>
                      <p style={{margin:0,fontSize:8.5,color:"#5a6691"}}>{d.m.slice(5)}</p>
                      <p style={{margin:0,fontSize:9.5,fontWeight:700,color:"#0d1326"}}>₹{Math.round(d.gp/1000)}K</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── CLIENT ACCOUNT STATEMENT ────────────────────────────────── */

export function ClientStatement({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [client,setClient]=useState("Sharma Enterprises");
  const [period,setPeriod]=useState("2026-05");
  const [showModal,setShowModal]=useState(false);
  const PERIODS=[{v:"2026-03",l:"Mar 2026"},{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"},{v:"ALL",l:"All Time"}];
  const clients=[...new Set(GP_BILLS.filter(b=>!brCode||b.branch===brCode).map(b=>b.client))].sort();

  const txns=useMemo(()=>{
    const b=GP_BILLS.filter(x=>x.client===client&&(!brCode||x.branch===brCode)&&(period==="ALL"||x.date.startsWith(period)));
    // Invoices (Dr the client)
    const invs=b.map(x=>({date:x.date,type:"Invoice",ref:x.id,desc:`${x.mod} — ${x.dest||""}`,dr:x.sell,cr:0}));
    // Simulated receipts (Cr the client)
    const recs=b.filter((_,i)=>i%3!==0).map(x=>({date:x.date.replace(/-\d\d$/,"-"+String(parseInt(x.date.slice(8))+5).padStart(2,"0")),type:"Receipt",ref:x.id.replace("/SF","/RV").replace("/SH","/RV"),desc:"Payment received — NEFT",dr:0,cr:Math.round(x.sell*0.85)}));
    return [...invs,...recs].sort((a,z)=>a.date.localeCompare(z.date));
  },[client,period,brCode]);

  let running=0;
  const txnsWithBal=txns.map(t=>{running+=t.dr-t.cr;return{...t,bal:running};});
  const totDr=txns.reduce((s,t)=>s+t.dr,0);
  const totCr=txns.reduce((s,t)=>s+t.cr,0);
  const outstanding=totDr-totCr;

  // Ageing buckets (0-30, 31-60, 61-90, >90)
  const today=new Date("2026-05-19");
  const ageing={a0:0,a30:0,a60:0,a90:0};
  txnsWithBal.filter(t=>t.type==="Invoice"&&t.bal>0).forEach(t=>{
    const days=Math.ceil((today-new Date(t.date))/(86400000));
    if(days<=30)ageing.a0+=t.dr;
    else if(days<=60)ageing.a30+=t.dr;
    else if(days<=90)ageing.a60+=t.dr;
    else ageing.a90+=t.dr;
  });

  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");
  return(
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📄</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Client Account Statement</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{client} · {PERIODS.find(p=>p.v===period)?.l}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <select value={client} onChange={e=>setClient(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {clients.map(c=><option key={c}>{c}</option>)}
          </select>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <button onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent(`Hi! Your account statement for ${period === "ALL" ? "all time" : period} — Outstanding: ${f(outstanding)}. Please contact us to settle the balance.`)}`, "_blank","noopener")} style={{...btnG,fontSize:11,background:"#25D366"}}>💬 WhatsApp</button>
          <button onClick={()=>window.print()} style={{...btnGh,fontSize:11}}><Printer size={12}/> Print</button>
        </div>
      </div>

      {/* Ageing Summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Total Invoiced",v:f(totDr),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Total Received",v:f(totCr),c:"#27500A",bg:"#EAF3DE"},
          {l:"Outstanding",v:f(outstanding),c:outstanding>0?"#A32D2D":"#27500A",bg:outstanding>0?"#FCEBEB":"#EAF3DE"},
          {l:"0–30 days",v:f(ageing.a0),c:"#27500A",bg:"#EAF3DE"},
          {l:"31–60 days",v:f(ageing.a30),c:"#854F0B",bg:"#FAEEDA"},
          {l:"61–90 days",v:f(ageing.a60),c:"#A32D2D",bg:"#FCEBEB"},
          {l:">90 days",v:f(ageing.a90),c:"#7B1F1F",bg:"#FCEBEB"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"10px 12px",background:k.bg}}>
            <p style={{margin:0,fontSize:8.5,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"3px 0 0",fontSize:mob?15:18,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Statement Table */}
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",background:"#f3f4f8",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <p style={{margin:0,fontSize:11,fontWeight:700,color:"#0d1326"}}>Account Ledger — {client}</p>
          <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{txns.length} transactions</p>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5,minWidth:700}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Date","Type","Reference","Description","Dr (₹)","Cr (₹)","Balance"].map((h,i)=>(
                <th key={i} style={{padding:"8px 12px",textAlign:i>=4?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{txnsWithBal.map((t,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:t.type==="Receipt"?"#f0fff4":i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"7px 12px",color:"#5a6691",whiteSpace:"nowrap"}}>{t.date}</td>
                <td style={{padding:"7px 12px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:t.type==="Invoice"?"#E6F1FB":"#EAF3DE",color:t.type==="Invoice"?"#185FA5":"#27500A"}}>{t.type}</span></td>
                <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{t.ref}</td>
                <td style={{padding:"7px 12px",color:"#384677"}}>{t.desc}</td>
                <td style={{padding:"7px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#A32D2D",fontWeight:t.dr>0?600:400}}>{t.dr>0?f(t.dr):"—"}</td>
                <td style={{padding:"7px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#27500A",fontWeight:t.cr>0?600:400}}>{t.cr>0?f(t.cr):"—"}</td>
                <td style={{padding:"7px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:t.bal>0?"#A32D2D":t.bal<0?"#27500A":"#5a6691"}}>{f(Math.abs(t.bal))}{t.bal>0?" Dr":t.bal<0?" Cr":""}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
              <td colSpan={4} style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",fontSize:12}}>CLOSING BALANCE</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(totDr)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#5ab84b",fontVariantNumeric:"tabular-nums"}}>{f(totCr)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:outstanding>0?"#d4a437":"#5ab84b",fontVariantNumeric:"tabular-nums"}}>{f(outstanding)}{outstanding>0?" Dr":"Cr"}</td>
            </tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── TOUR CODE / PACKAGE MASTER ──────────────────────────────── */

export function ForexReport({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:branch?.code;
  const [period,setPeriod]=useState("2026-05");
  const PERIODS=[{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"},{v:"YTD",l:"YTD 2026"}];
  const FOREX_DATA=[
    {date:"2026-05-07",ccy:"USD",type:"Payment",party:"Bali Tours DMC",fcAmt:1200,rate:83.40,inrAmt:100080,settleRate:83.60,settleInr:100320,gain:240,status:"Settled"},
    {date:"2026-05-10",ccy:"USD",type:"Payment",party:"Island Escapes",fcAmt:950,rate:83.45,inrAmt:79278,settleRate:83.52,settleInr:79344,gain:66,status:"Settled"},
    {date:"2026-05-12",ccy:"KES",type:"Receipt",party:"Mujeet",fcAmt:85000,rate:0.6185,inrAmt:52573,settleRate:0.6210,settleInr:52785,gain:212,status:"Settled"},
    {date:"2026-05-15",ccy:"USD",type:"Payment",party:"Euro DMC Spain",fcAmt:2400,rate:83.40,inrAmt:200160,settleRate:0,settleInr:0,gain:0,status:"Unsettled"},
    {date:"2026-05-17",ccy:"TZS",type:"Payment",party:"CRDB Bank — DAR",fcAmt:2400000,rate:0.032,inrAmt:76800,settleRate:0.0318,settleInr:76320,gain:-480,status:"Settled"},
  ];
  const filtered=FOREX_DATA.filter(r=>r.date.startsWith(period)||period==="YTD");
  const realized=filtered.filter(r=>r.status==="Settled");
  const totalGain=realized.reduce((s,r)=>s+r.gain,0);
  const totalUnreal=filtered.filter(r=>r.status==="Unsettled").length;
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const CCY_CLR={USD:"#185FA5",KES:"#27500A",TZS:"#854F0B",EUR:"#1D9E75"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>💱</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Forex Gain / Loss Report</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Currency: USD · KES · TZS · Realized + Unrealized</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <button onClick={()=>exportToCSV(filtered,["date","ccy","type","party","fcAmt","rate","gain","status"],"forex.csv")} style={{...btnGh,fontSize:11}}><Download size={12}/> CSV</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Realized Gain/(Loss)",v:f(totalGain),c:totalGain>=0?"#27500A":"#A32D2D",bg:totalGain>=0?"#EAF3DE":"#FCEBEB"},
          {l:"Gain Transactions",v:String(realized.filter(r=>r.gain>0).length),c:"#27500A",bg:"#EAF3DE"},
          {l:"Loss Transactions",v:String(realized.filter(r=>r.gain<0).length),c:"#A32D2D",bg:"#FCEBEB"},
          {l:"Unsettled (Unrealized)",v:String(totalUnreal),c:"#854F0B",bg:"#FAEEDA"},
          {l:"Total FCY Volume",v:`${filtered.filter(r=>r.ccy==="USD").reduce((s,r)=>s+r.fcAmt,0).toLocaleString()} USD`,c:"#185FA5",bg:"#E6F1FB"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"10px 12px",background:k.bg}}>
            <p style={{margin:0,fontSize:8.5,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"3px 0 0",fontSize:mob?15:18,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Date","CCY","Type","Party","FCY Amount","Rate Booked","INR Booked","Rate Settled","INR Settled","Gain/(Loss)","Status"].map((h,i)=>(
              <th key={i} style={{padding:"8px 10px",textAlign:i>=4&&i<=9?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((r,i)=>(
            <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:r.gain<0?"#fff5f5":r.status==="Unsettled"?"#fffaf0":i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"7px 10px",color:"#5a6691",whiteSpace:"nowrap"}}>{r.date}</td>
              <td style={{padding:"7px 10px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:800,background:(CCY_CLR[r.ccy]||"#384677")+"22",color:CCY_CLR[r.ccy]||"#384677"}}>{r.ccy}</span></td>
              <td style={{padding:"7px 10px",fontSize:10.5,color:"#384677"}}>{r.type}</td>
              <td style={{padding:"7px 10px",fontWeight:600,color:"#0d1326"}}>{r.party}</td>
              <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{r.fcAmt.toLocaleString()}</td>
              <td style={{padding:"7px 10px",textAlign:"right",fontFamily:"monospace",fontSize:10}}>{r.rate}</td>
              <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(r.inrAmt)}</td>
              <td style={{padding:"7px 10px",textAlign:"right",fontFamily:"monospace",fontSize:10}}>{r.settleRate||"—"}</td>
              <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{r.settleInr?f(r.settleInr):"—"}</td>
              <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:r.gain>0?"#27500A":r.gain<0?"#A32D2D":"#5a6691"}}>{r.gain?f(r.gain):"—"}</td>
              <td style={{padding:"7px 10px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:r.status==="Settled"?"#EAF3DE":"#FAEEDA",color:r.status==="Settled"?"#27500A":"#854F0B"}}>{r.status}</span></td>
            </tr>
          ))}</tbody>
          <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={9} style={{padding:"8px 10px",fontWeight:700,color:"#d4a437",fontSize:11}}>NET REALIZED FOREX GAIN/(LOSS)</td>
            <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,fontSize:13,fontVariantNumeric:"tabular-nums",color:totalGain>=0?"#5ab84b":"#F7C1C1"}}>{f(totalGain)}</td>
            <td/>
          </tr></tfoot>
        </table>
      </div>
      <div style={{marginTop:10,...card,background:"#E6F1FB",border:"1px solid #B5D4F4",fontSize:10,color:"#185FA5"}}>
        Forex Gain/Loss is posted to GL via Journal Entry. Rate booked = rate at time of invoice. Rate settled = rate at time of payment. Unrealized: open positions at period-end rated at closing rate. Affects Africa branches NBO (KES), DAR (TZS), FBM (USD) significantly.
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   BATCH C — PRIORITY 3: OPERATIONS + CRM + INTELLIGENCE
   GroupBookings · CorporateAccounts · DestinationIntelligence
   PackagePnL · SubAgentStatement · RefundTracker
   ════════════════════════════════════════════════════════════════ */

/* ── GROUP BOOKING MANAGER ───────────────────────────────────── */

export function DestinationIntelligence({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:branch?.code;
  const [period,setPeriod]=useState("YTD");
  const PERIODS=[{v:"2026-03",l:"Mar 2026"},{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"},{v:"YTD",l:"YTD 2026"}];
  const FY_MONTHS=["2026-04","2026-05"];

  const bills=useMemo(()=>GP_BILLS.filter(b=>
    (!brCode||b.branch===brCode)&&
    (period==="YTD"?FY_MONTHS.includes(b.date.slice(0,7)):b.date.startsWith(period))
  ),[brCode,period]);

  // Aggregate by destination
  const destMap={};
  bills.forEach(b=>{
    const d=b.dest||"Other";
    if(!destMap[d])destMap[d]={dest:d,rev:0,cost:0,bks:0,mods:{},months:{}};
    destMap[d].rev+=b.sell;destMap[d].cost+=b.cost;destMap[d].bks++;
    destMap[d].mods[b.mod]=(destMap[d].mods[b.mod]||0)+1;
    const m=b.date.slice(0,7);destMap[d].months[m]=(destMap[d].months[m]||0)+b.sell-b.cost;
  });
  const destRows=Object.values(destMap).map(d=>({
    ...d,gp:d.rev-d.cost,gpPct:d.rev>0?+(( d.rev-d.cost)/d.rev*100).toFixed(1):0,
    topMod:Object.entries(d.mods).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—",
    avgTicket:d.bks>0?Math.round(d.rev/d.bks):0,
  })).sort((a,b)=>b.gp-a.gp);

  const maxGP=Math.max(...destRows.map(d=>d.gp),1);
  const totRev=destRows.reduce((s,d)=>s+d.rev,0);
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const DEST_EMOJIS={Dubai:"🇦🇪",Bali:"🇮🇩",Singapore:"🇸🇬",Maldives:"🇲🇻",Bangkok:"🇹🇭",Europe:"🌍",London:"🇬🇧",Paris:"🇫🇷","Masai Mara":"🇰🇪","Nairobi":"🇰🇪"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1300,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🗺</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Destination Intelligence</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{destRows.length} destinations · {bills.length} bookings · Revenue & GP breakdown</p>
          </div>
        </div>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
      </div>

      {/* Destination cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12,marginBottom:14}}>
        {destRows.slice(0,6).map((d,i)=>(
          <div key={d.dest} style={{...card,borderTop:`3px solid ${i<3?"#d4a437":"#e1e3ec"}`,padding:"12px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:22}}>{DEST_EMOJIS[d.dest]||"🌍"}</span>
                <div>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>{d.dest}</p>
                  <p style={{margin:"1px 0 0",fontSize:9.5,color:"#5a6691"}}>{d.bks} bookings · Top: {d.topMod}</p>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{margin:0,fontSize:14,fontWeight:800,color:"#27500A"}}>{f(d.gp)}</p>
                <p style={{margin:"1px 0 0",fontSize:9.5,color:d.gpPct>=12?"#27500A":"#854F0B"}}>GP {d.gpPct}%</p>
              </div>
            </div>
            {/* GP bar */}
            <div style={{height:6,borderRadius:3,background:"#e1e3ec",overflow:"hidden",marginBottom:8}}>
              <div style={{width:`${Math.round(d.gp/maxGP*100)}%`,height:"100%",borderRadius:3,background:i<3?"#d4a437":"#27500A"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{padding:"5px 8px",borderRadius:6,background:"#f3f4f8",textAlign:"center"}}>
                <p style={{margin:0,fontSize:8.5,color:"#5a6691"}}>Revenue</p>
                <p style={{margin:"1px 0 0",fontSize:11,fontWeight:700,color:"#185FA5"}}>{f(d.rev)}</p>
              </div>
              <div style={{padding:"5px 8px",borderRadius:6,background:"#f3f4f8",textAlign:"center"}}>
                <p style={{margin:0,fontSize:8.5,color:"#5a6691"}}>Avg Ticket</p>
                <p style={{margin:"1px 0 0",fontSize:11,fontWeight:700,color:"#384677"}}>{f(d.avgTicket)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full table */}
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",background:"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
          <p style={{margin:0,fontSize:11,fontWeight:700,color:"#0d1326"}}>All Destinations — Revenue & Profitability Ranking</p>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Rank","Destination","Bookings","Revenue","Cost","Gross Profit","GP%","Avg Ticket","Rev Share"].map((h,i)=>(
              <th key={i} style={{padding:"8px 12px",textAlign:i>=2?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{destRows.map((d,i)=>(
            <tr key={d.dest} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"7px 12px",fontWeight:i<3?800:400,color:i<3?"#d4a437":"#5a6691",textAlign:"right"}}>{i+1}</td>
              <td style={{padding:"7px 12px",fontWeight:600,color:"#0d1326"}}>{DEST_EMOJIS[d.dest]||"🌍"} {d.dest}</td>
              <td style={{padding:"7px 12px",textAlign:"right"}}>{d.bks}</td>
              <td style={{padding:"7px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(d.rev)}</td>
              <td style={{padding:"7px 12px",textAlign:"right",color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{f(d.cost)}</td>
              <td style={{padding:"7px 12px",textAlign:"right",fontWeight:700,color:"#27500A",fontVariantNumeric:"tabular-nums"}}>{f(d.gp)}</td>
              <td style={{padding:"7px 12px",textAlign:"right"}}><span style={{fontSize:10.5,padding:"2px 7px",borderRadius:999,fontWeight:800,background:d.gpPct>=15?"#EAF3DE":d.gpPct>=8?"#FAEEDA":"#FCEBEB",color:d.gpPct>=15?"#27500A":d.gpPct>=8?"#854F0B":"#A32D2D"}}>{d.gpPct}%</span></td>
              <td style={{padding:"7px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#384677"}}>{f(d.avgTicket)}</td>
              <td style={{padding:"7px 12px",textAlign:"right"}}>{totRev>0?Math.round(d.rev/totRev*100):0}%</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ── PACKAGE P&L BY TOUR CODE ────────────────────────────────── */

export function IntercompanyBilling({branch}){
  const mob=useMobile();
  const [tab,setTab]=useState("list"); // list | new
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const IC_ENTRIES=[
    {id:"IC/BOM-NBO/001",from:"BOM",to:"NBO",desc:"BOM processed Kenya safari booking on behalf of NBO",amount:85000,currency:"INR",markup:5,date:"2026-05-08",status:"Invoiced",ref:"BOM/1726/SH00015"},
    {id:"IC/BOM-DAR/001",from:"BOM",to:"DAR",desc:"BOM managed Zanzibar holiday — DAR client",amount:142000,currency:"INR",markup:5,date:"2026-05-12",status:"Invoiced",ref:"BOM/1726/SH00018"},
    {id:"IC/NBO-BOM/001",from:"NBO",to:"BOM",desc:"NBO arranged India pilgrimage — BOM client forwarded",amount:6200,currency:"USD",markup:3,date:"2026-04-28",status:"Settled",ref:"NBO/1726/SH00011"},
    {id:"IC/AMD-BOM/001",from:"AMD",to:"BOM",desc:"AMD client group — BOM issued tickets",amount:220000,currency:"INR",markup:4,date:"2026-05-15",status:"Pending",ref:"AMD/1726/SF00022"},
  ];
  const STATUS_CLR={Invoiced:"#185FA5",Settled:"#27500A",Pending:"#854F0B"};
  const STATUS_BG ={Invoiced:"#E6F1FB",Settled:"#EAF3DE",Pending:"#FAEEDA"};
  const BRANCH_CLR={BOM:"#185FA5",AMD:"#854F0B",NBO:"#27500A",DAR:"#1D9E75",FBM:"#A32D2D"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔄</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Intercompany Billing</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Cross-branch transactions · BOM ↔ NBO ↔ DAR ↔ AMD ↔ FBM · Auto markup {IC_ENTRIES[0].markup}%</p>
          </div>
        </div>
        <button onClick={()=>setTab(t=>t==="list"?"new":"list")} style={{...btnG,fontSize:11}}>{tab==="list"?"+ New IC Entry":"← Back to List"}</button>
      </div>

      {tab==="list"&&(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
            {[
              {l:"Total IC Volume",v:f(IC_ENTRIES.reduce((s,e)=>s+e.amount,0)),c:"#185FA5",bg:"#E6F1FB"},
              {l:"Settled",v:String(IC_ENTRIES.filter(e=>e.status==="Settled").length),c:"#27500A",bg:"#EAF3DE"},
              {l:"Invoiced",v:String(IC_ENTRIES.filter(e=>e.status==="Invoiced").length),c:"#185FA5",bg:"#E6F1FB"},
              {l:"Pending",v:String(IC_ENTRIES.filter(e=>e.status==="Pending").length),c:"#854F0B",bg:"#FAEEDA"},
            ].map((k,i)=>(
              <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"10px 12px",background:k.bg}}>
                <p style={{margin:0,fontSize:8.5,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
                <p style={{margin:"3px 0 0",fontSize:18,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
              </div>
            ))}
          </div>

          <div style={{...card,padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#0d1326"}}>
                {["IC Ref","From","To","Description","Amount","Markup","Date","Status"].map((h,i)=>(
                  <th key={i} style={{padding:"9px 11px",textAlign:i>=4&&i<=5?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{IC_ENTRIES.map((e,i)=>(
                <tr key={e.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{e.id}</td>
                  <td style={{padding:"8px 11px"}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:800,background:(BRANCH_CLR[e.from]||"#384677")+"22",color:BRANCH_CLR[e.from]||"#384677"}}>{e.from}</span></td>
                  <td style={{padding:"8px 11px"}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:800,background:(BRANCH_CLR[e.to]||"#384677")+"22",color:BRANCH_CLR[e.to]||"#384677"}}>{e.to}</span></td>
                  <td style={{padding:"8px 11px",color:"#384677",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.desc}</td>
                  <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{e.currency} {e.amount.toLocaleString()}</td>
                  <td style={{padding:"8px 11px",textAlign:"right",color:"#27500A",fontWeight:700}}>{e.markup}%</td>
                  <td style={{padding:"8px 11px",color:"#5a6691",whiteSpace:"nowrap"}}>{e.date}</td>
                  <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[e.status],color:STATUS_CLR[e.status]}}>{e.status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}

      {tab==="new"&&(
        <div style={{...card}}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>New Intercompany Entry</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <FL label="From branch"><select style={inp}>{["TKHO","BOM","AMD","NBO","DAR","FBM"].map(b=><option key={b}>{b}</option>)}</select></FL>
            <FL label="To branch"><select style={inp}>{["TKHO","BOM","AMD","NBO","DAR","FBM"].map(b=><option key={b}>{b}</option>)}</select></FL>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
            <FL label="Amount"><input type="number" style={inp} placeholder="0"/></FL>
            <FL label="Currency"><select style={inp}><option>INR</option><option>USD</option><option>KES</option><option>TZS</option></select></FL>
            <FL label="Intercompany Markup %"><input type="number" defaultValue={5} style={inp}/></FL>
          </div>
          <FL label="Description"><input style={inp} placeholder="e.g. BOM processed Kenya safari for NBO client"/></FL>
          <FL label="Linked booking ref"><input style={{...inp,marginTop:10,fontFamily:"monospace"}} placeholder="NBO/1726/SH00001"/></FL>
          <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
            <button onClick={()=>setTab("list")} style={btnGh}>Cancel</button>
            <button onClick={()=>setTab("list")} style={btnG}>Post IC Entry</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── SEAT INVENTORY ──────────────────────────────────────────── */

export function RatioAnalysis({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [period,setPeriod]=useState("2026-05");

  // Sample ratios with trend (last 6 months)
  const RATIOS=[
    {category:"Liquidity",name:"Current Ratio",current:1.85,prev:1.72,benchmark:"≥ 1.5",ideal:2.0,fmt:"x",trend:[1.45,1.52,1.68,1.71,1.72,1.85],good:true},
    {category:"Liquidity",name:"Quick Ratio (Acid Test)",current:1.42,prev:1.38,benchmark:"≥ 1.0",ideal:1.5,fmt:"x",trend:[1.18,1.22,1.30,1.35,1.38,1.42],good:true},
    {category:"Liquidity",name:"Cash Ratio",current:0.52,prev:0.48,benchmark:"≥ 0.3",ideal:0.75,fmt:"x",trend:[0.35,0.38,0.42,0.45,0.48,0.52],good:true},
    {category:"Activity",name:"DSO (Days Sales Outstanding)",current:38,prev:42,benchmark:"≤ 45",ideal:30,fmt:"d",trend:[55,52,48,45,42,38],good:true},
    {category:"Activity",name:"DPO (Days Payables Outstanding)",current:52,prev:48,benchmark:"≥ 40",ideal:60,fmt:"d",trend:[38,42,45,46,48,52],good:true},
    {category:"Activity",name:"Asset Turnover",current:3.4,prev:3.2,benchmark:"≥ 2.0",ideal:4.0,fmt:"x",trend:[2.8,2.9,3.0,3.1,3.2,3.4],good:true},
    {category:"Leverage",name:"Debt-Equity Ratio",current:0.38,prev:0.42,benchmark:"≤ 1.0",ideal:0.3,fmt:"x",trend:[0.55,0.52,0.48,0.45,0.42,0.38],good:true},
    {category:"Leverage",name:"Interest Coverage Ratio",current:8.5,prev:7.2,benchmark:"≥ 3.0",ideal:10,fmt:"x",trend:[5.8,6.2,6.8,7.0,7.2,8.5],good:true},
    {category:"Profitability",name:"Gross Profit Margin",current:13.8,prev:13.2,benchmark:"≥ 10%",ideal:18,fmt:"%",trend:[11.5,11.8,12.3,12.8,13.2,13.8],good:true},
    {category:"Profitability",name:"Net Profit Margin",current:4.2,prev:3.8,benchmark:"≥ 3%",ideal:7,fmt:"%",trend:[2.8,3.0,3.4,3.6,3.8,4.2],good:true},
    {category:"Profitability",name:"Return on Assets (ROA)",current:12.5,prev:11.2,benchmark:"≥ 8%",ideal:15,fmt:"%",trend:[9.5,9.8,10.5,10.8,11.2,12.5],good:true},
    {category:"Profitability",name:"Return on Equity (ROE)",current:18.5,prev:16.8,benchmark:"≥ 12%",ideal:20,fmt:"%",trend:[14.2,14.8,15.5,16.2,16.8,18.5],good:true},
  ];

  const catColor={Liquidity:"#185FA5",Activity:"#854F0B",Leverage:"#A32D2D",Profitability:"#27500A"};
  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  // Mini sparkline
  const Spark=({data,color})=>{
    const max=Math.max(...data),min=Math.min(...data),range=max-min||1;
    const W=80,H=24;
    const pts=data.map((v,i)=>`${(i/(data.length-1))*W},${H-((v-min)/range)*H}`).join(" ");
    return(<svg width={W} height={H} style={{verticalAlign:"middle"}}><polyline points={pts} fill="none" stroke={color} strokeWidth={1.5}/></svg>);
  };

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>📊 Financial Ratio Analysis</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>Liquidity · Activity · Leverage · Profitability ratios with 6-month trend</p>
        </div>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:7,fontSize:11.5}}>
          <option value="2026-05">May 2026</option><option value="2026-04">Apr 2026</option><option value="2026-03">Mar 2026</option>
        </select>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {Object.entries(catColor).map(([cat,col])=>{
          const ratios=RATIOS.filter(r=>r.category===cat);
          const goodCount=ratios.filter(r=>r.good).length;
          return(
            <div key={cat} style={{...card,borderTop:`3px solid ${col}`}}>
              <p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>{cat}</p>
              <p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:col}}>{goodCount}/{ratios.length}</p>
              <p style={{margin:0,fontSize:10,color:"#5a6691"}}>healthy ratios</p>
            </div>
          );
        })}
      </div>

      {Object.keys(catColor).map(cat=>(
        <div key={cat} style={{marginBottom:14}}>
          <h3 style={{margin:"8px 0 6px",fontSize:13,color:catColor[cat]}}>{cat}</h3>
          <div style={{...card,padding:0,overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
                  <th style={{padding:"9px 8px",textAlign:"left"}}>Ratio</th>
                  <th style={{padding:"9px 8px",textAlign:"right"}}>Current</th>
                  <th style={{padding:"9px 8px",textAlign:"right"}}>Previous</th>
                  <th style={{padding:"9px 8px",textAlign:"center"}}>Change</th>
                  <th style={{padding:"9px 8px",textAlign:"center"}}>Benchmark</th>
                  <th style={{padding:"9px 8px",textAlign:"center"}}>6-month Trend</th>
                  <th style={{padding:"9px 8px",textAlign:"center"}}>Status</th>
                </tr></thead>
                <tbody>
                  {RATIOS.filter(r=>r.category===cat).map((r,i)=>{
                    const change=r.current-r.prev;
                    return(
                      <tr key={i} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
                        <td style={{padding:"7px 8px",fontWeight:600}}>{r.name}</td>
                        <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,color:catColor[cat]}}>{r.current.toFixed(2)}{r.fmt}</td>
                        <td style={{padding:"7px 8px",textAlign:"right",color:"#5a6691"}}>{r.prev.toFixed(2)}{r.fmt}</td>
                        <td style={{padding:"7px 8px",textAlign:"center",fontWeight:600,color:(change>0&&r.fmt!=="d")||(change<0&&r.fmt==="d")?"#27500A":"#A32D2D"}}>
                          {change>0?"+":""}{change.toFixed(2)}
                        </td>
                        <td style={{padding:"7px 8px",textAlign:"center",fontSize:10,color:"#5a6691"}}>{r.benchmark}</td>
                        <td style={{padding:"7px 8px",textAlign:"center"}}><Spark data={r.trend} color={catColor[cat]}/></td>
                        <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:r.good?"#EAF3DE":"#FCEBEB",color:r.good?"#27500A":"#A32D2D"}}>{r.good?"✓ Healthy":"⚠ Watch"}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


export function ScheduleIIIBS({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;

  const EQUITY_LIABILITIES=[
    {head:"(1) Shareholders' Funds",bold:true,total:48500000},
    {head:"    (a) Share Capital",value:5000000},
    {head:"    (b) Reserves and Surplus",value:43500000},
    {head:"(2) Share Application Money Pending Allotment",value:0,bold:true},
    {head:"(3) Non-Current Liabilities",bold:true,total:18500000},
    {head:"    (a) Long-term Borrowings",value:14250000},
    {head:"    (b) Deferred Tax Liabilities (Net)",value:1850000},
    {head:"    (c) Other Long-term Liabilities",value:1200000},
    {head:"    (d) Long-term Provisions",value:1200000},
    {head:"(4) Current Liabilities",bold:true,total:34850000},
    {head:"    (a) Short-term Borrowings",value:8500000},
    {head:"    (b) Trade Payables",value:18250000},
    {head:"    (c) Other Current Liabilities",value:5850000},
    {head:"    (d) Short-term Provisions",value:2250000},
  ];
  const ASSETS=[
    {head:"(1) Non-Current Assets",bold:true,total:42850000},
    {head:"    (a) Fixed Assets",value:0,sub:true},
    {head:"        (i) Tangible Assets",value:18500000},
    {head:"        (ii) Intangible Assets",value:850000},
    {head:"        (iii) Capital Work-in-Progress",value:2500000},
    {head:"    (b) Non-current Investments",value:8500000},
    {head:"    (c) Deferred Tax Assets (Net)",value:0},
    {head:"    (d) Long-term Loans and Advances",value:8500000},
    {head:"    (e) Other Non-current Assets",value:4000000},
    {head:"(2) Current Assets",bold:true,total:59000000},
    {head:"    (a) Current Investments",value:5000000},
    {head:"    (b) Inventories",value:850000},
    {head:"    (c) Trade Receivables",value:22500000},
    {head:"    (d) Cash and Cash Equivalents",value:18500000},
    {head:"    (e) Short-term Loans and Advances",value:8500000},
    {head:"    (f) Other Current Assets",value:3650000},
  ];

  const totEqLiab=101850000;
  const totAssets=101850000;
  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  const Row=({head,value,total,bold,sub})=>(
    <tr style={{borderBottom:"1px solid #e1e3ec",background:bold?"#FAEEDA":sub?"#f3f4f8":"#fff"}}>
      <td style={{padding:"7px 10px",fontWeight:bold?700:sub?500:400,fontSize:bold?11.5:11,color:bold?"#0d1326":"#0d1326"}}>{head}</td>
      <td style={{padding:"7px 10px",textAlign:"right",fontWeight:bold?700:400,color:bold?"#0d1326":"#5a6691"}}>{value!==undefined&&value>0?cur+fmt(value):value===0?"—":""}</td>
      <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:"#185FA5"}}>{total!==undefined?cur+fmt(total):""}</td>
    </tr>
  );

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>📜 Balance Sheet — Schedule III</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>Companies Act 2013 prescribed format · As at 31 March 2026 · Required for Pvt Ltd entities</p>
        </div>
        <button style={{padding:"7px 14px",border:"none",background:"#d4a437",color:"#0d1326",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"}}>📄 Export PDF</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <h3 style={{margin:0,padding:"10px 12px",fontSize:13,background:"#0d1326",color:"#d4a437"}}>I. EQUITY AND LIABILITIES</h3>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <tbody>
              {EQUITY_LIABILITIES.map((r,i)=><Row key={i} {...r}/>)}
              <tr style={{background:"#0d1326",color:"#d4a437"}}>
                <td style={{padding:"10px",fontWeight:700,fontSize:12}}>TOTAL</td>
                <td></td>
                <td style={{padding:"10px",textAlign:"right",fontWeight:700,fontSize:12}}>{cur+fmt(totEqLiab)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{...card,padding:0,overflow:"hidden"}}>
          <h3 style={{margin:0,padding:"10px 12px",fontSize:13,background:"#0d1326",color:"#d4a437"}}>II. ASSETS</h3>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <tbody>
              {ASSETS.map((r,i)=><Row key={i} {...r}/>)}
              <tr style={{background:"#0d1326",color:"#d4a437"}}>
                <td style={{padding:"10px",fontWeight:700,fontSize:12}}>TOTAL</td>
                <td></td>
                <td style={{padding:"10px",textAlign:"right",fontWeight:700,fontSize:12}}>{cur+fmt(totAssets)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p style={{marginTop:14,fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>
        💡 As per Division I of Schedule III of Companies Act, 2013 · Reproduce with Notes 1-30 for full statutory compliance
      </p>
    </div>
  );
}


export function VarianceAnalysis({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [period,setPeriod]=useState("2026-05");

  const VARIANCES=[
    {head:"Revenue",actual:9850000,budget:9500000,forecast:9650000,priorYear:8500000},
    {head:"  Flight Tickets",actual:5500000,budget:5200000,forecast:5350000,priorYear:4800000},
    {head:"  Holiday Packages",actual:2800000,budget:2700000,forecast:2750000,priorYear:2400000},
    {head:"  Hotel Bookings",actual:850000,budget:900000,forecast:880000,priorYear:780000},
    {head:"  Other Services",actual:700000,budget:700000,forecast:670000,priorYear:520000},
    {head:"Direct Costs",actual:8485000,budget:8250000,forecast:8350000,priorYear:7395000},
    {head:"Gross Profit",actual:1365000,budget:1250000,forecast:1300000,priorYear:1105000},
    {head:"Operating Expenses",actual:412500,budget:425000,forecast:418000,priorYear:385000},
    {head:"  Salary & Wages",actual:185000,budget:180000,forecast:185000,priorYear:165000},
    {head:"  Office Rent",actual:82000,budget:82000,forecast:82000,priorYear:80000},
    {head:"  Marketing",actual:38000,budget:50000,forecast:42000,priorYear:35000},
    {head:"  Other Opex",actual:107500,budget:113000,forecast:109000,priorYear:105000},
    {head:"EBITDA",actual:952500,budget:825000,forecast:882000,priorYear:720000},
  ];

  const totalRev=VARIANCES[0];
  const totalEbitda=VARIANCES[VARIANCES.length-1];
  const revVarPct=((totalRev.actual-totalRev.budget)/totalRev.budget*100);
  const ebVarPct=((totalEbitda.actual-totalEbitda.budget)/totalEbitda.budget*100);
  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>📈 Variance Analysis Report</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>Actual vs Budget vs Forecast vs Prior Year · Ranked by largest swing</p>
        </div>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:7,fontSize:11.5}}>
          <option value="2026-05">May 2026</option><option value="2026-04">Apr 2026</option>
        </select>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Revenue vs Budget</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:revVarPct>=0?"#27500A":"#A32D2D"}}>{revVarPct>=0?"+":""}{revVarPct.toFixed(1)}%</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{cur+fmt(totalRev.actual-totalRev.budget)}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>EBITDA vs Budget</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:ebVarPct>=0?"#27500A":"#A32D2D"}}>{ebVarPct>=0?"+":""}{ebVarPct.toFixed(1)}%</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{cur+fmt(totalEbitda.actual-totalEbitda.budget)}</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Revenue YoY</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>+{((totalRev.actual-totalRev.priorYear)/totalRev.priorYear*100).toFixed(1)}%</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>EBITDA YoY</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>+{((totalEbitda.actual-totalEbitda.priorYear)/totalEbitda.priorYear*100).toFixed(1)}%</p></div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Line Item</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Actual</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Budget</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>vs Budget</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Forecast</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>vs FC</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Prior Year</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>YoY %</th>
            </tr></thead>
            <tbody>
              {VARIANCES.map((r,i)=>{
                const isSub=r.head.startsWith("  ");
                const isTotal=!isSub;
                const vBgt=r.actual-r.budget;
                const vFc=r.actual-r.forecast;
                const vYoY=((r.actual-r.priorYear)/r.priorYear*100);
                return(
                  <tr key={i} style={{background:isTotal?"#FAEEDA":i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec",fontWeight:isTotal?700:400}}>
                    <td style={{padding:"7px 8px",paddingLeft:isSub?22:10}}>{r.head.trim()}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",fontWeight:isTotal?700:500}}>{cur+fmt(r.actual)}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",color:"#5a6691"}}>{cur+fmt(r.budget)}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,color:vBgt>=0?"#27500A":"#A32D2D"}}>{vBgt>=0?"+":""}{cur+fmt(vBgt)}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",color:"#5a6691"}}>{cur+fmt(r.forecast)}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,color:vFc>=0?"#27500A":"#A32D2D"}}>{vFc>=0?"+":""}{cur+fmt(vFc)}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",color:"#5a6691"}}>{cur+fmt(r.priorYear)}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,color:vYoY>=0?"#27500A":"#A32D2D"}}>{vYoY>=0?"+":""}{vYoY.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


export function ReportViewerTabbed(){
  const [tab,setTab]=useState("view");
  const tabs=[{id:"view",label:"1. View"},{id:"filter",label:"2. Filter"},{id:"group",label:"3. Group By"},{id:"sort",label:"4. Sort"},{id:"compare",label:"5. Compare"},{id:"format",label:"6. Format"},{id:"export",label:"7. Export"},{id:"schedule",label:"8. Schedule"},{id:"share",label:"9. Share"}];
  return TAB_Page("Profit & Loss Statement — May 2026", "Generic 9-tab Report Viewer · applies to any report in the system",
    {user:"Faiz Patel",date:"2026-05-20 09:00",created:"Auto-generated"},
    <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
      <div style={{display:"flex",borderBottom:"1px solid #e1e3ec",overflowX:"auto",background:"#fafbfd"}}>{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={tabBtnStyle(tab===t.id)}>{t.label}</button>)}</div>
      {tab==="view"&&tabPanel(
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead style={{background:"#f7f8fb"}}><tr><th style={{padding:"9px 12px",textAlign:"left",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Particulars</th><th style={{padding:"9px 12px",textAlign:"right",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>May 2026</th></tr></thead>
          <tbody>{[{l:"Revenue from Operations",v:26800000,b:true},{l:"  Flight Sales",v:14250000},{l:"  Holiday Sales",v:6450000},{l:"  Hotel Sales",v:3850000},{l:"  Other Revenue",v:2250000},{l:"Total Revenue",v:26800000,b:true,bg:true},{l:"Cost of Sales",v:-22550000},{l:"Gross Profit",v:4250000,b:true,bg:true},{l:"Operating Expenses",v:-1450000},{l:"Net Profit",v:2800000,b:true,bg:true}].map((r,i)=>(<tr key={i} style={{borderBottom:"1px solid #f0f2f7",background:r.bg?"#fafbfd":"#fff",fontWeight:r.b?700:400}}><td style={{padding:"9px 12px",paddingLeft:r.l.startsWith(" ")?28:12}}>{r.l.trim()}</td><td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:r.v<0?"#A32D2D":"#0d1326"}}>{r.v<0?"(":""}₹{Math.abs(r.v).toLocaleString("en-IN")}{r.v<0?")":""}</td></tr>))}</tbody>
        </table>
      )}
      {tab==="filter"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
          <FL label="Period"><select style={inpStd}><option>Today</option><option>This Week</option><option selected>This Month</option><option>This Quarter</option><option>YTD</option><option>Custom...</option></select></FL>
          <FL label="Date From"><input type="date" defaultValue="2026-05-01" style={inpStd}/></FL>
          <FL label="Date To"><input type="date" defaultValue="2026-05-31" style={inpStd}/></FL>
          <FL label="Branch"><select multiple size={4} style={{...inpStd,height:90}}><option>All Branches</option><option>TKHO</option><option>BOM</option><option>AMD</option><option>NBO</option><option>DAR</option><option>FBM</option></select></FL>
          <FL label="Customer Type"><select style={inpStd}><option>All</option><option>Corporate Premium</option><option>Corporate Standard</option><option>Individual</option><option>Travel Agent</option></select></FL>
          <FL label="Product Line"><select style={inpStd}><option>All</option><option>Flight</option><option>Holiday</option><option>Hotel</option><option>Visa</option><option>Insurance</option></select></FL>
          <FL label="Cost Center"><select style={inpStd}><option>All</option><option>TK-OPS</option><option>TK-MKT</option></select></FL>
          <FL label="Currency"><select style={inpStd}><option>All — show in INR equivalent</option><option>INR only</option><option>USD only</option></select></FL>
          <FL label="Min Amount"><input type="number" placeholder="0" style={inpStd}/></FL>
        </div>
      )}
      {tab==="group"&&tabPanel(
        <>
          <p style={{margin:"0 0 12px",fontSize:11.5,color:"#5a6691"}}>Drag fields to columns to pivot the report</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div style={{padding:14,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec"}}>
              <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase"}}>Available Fields</p>
              <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>{["Branch","Product","Customer","Consultant","Month","Quarter","Cost Center","Currency"].map(f=><span key={f} style={{padding:"5px 10px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:4,fontSize:11,cursor:"grab"}}>⋮⋮ {f}</span>)}</div>
            </div>
            <div style={{padding:14,background:"#0d1326",borderRadius:6}}>
              <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase"}}>Active Group Columns (in order)</p>
              <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>{["Branch","Product"].map((f,i)=><span key={f} style={{padding:"5px 10px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:4,fontSize:11,fontWeight:700,cursor:"grab"}}>{i+1}. {f} ×</span>)}</div>
              <p style={{margin:"14px 0 0",fontSize:10.5,color:"#fff",opacity:0.7}}>Report will be grouped: <b style={{color:"#d4a437"}}>Branch → Product</b></p>
            </div>
          </div>
        </>
      )}
      {tab==="sort"&&tabPanel(
        <div>
          {[{c:"Revenue",d:"DESC",p:1},{c:"Branch",d:"ASC",p:2}].map((s,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"40px 1fr 120px 80px",gap:10,alignItems:"center",padding:"10px 12px",background:"#fafbfd",borderRadius:6,marginBottom:8,border:"1px solid #e1e3ec"}}><span style={{padding:"4px 10px",background:"#d4a437",color:"#0d1326",borderRadius:3,fontSize:11,fontWeight:700,textAlign:"center"}}>{s.p}</span><select defaultValue={s.c} style={inpStd}><option>Revenue</option><option>Branch</option><option>Customer</option><option>Date</option><option>Amount</option></select><select defaultValue={s.d} style={inpStd}><option>ASC</option><option>DESC</option></select><button style={{padding:"6px 10px",background:"transparent",border:"1px solid #A32D2D",color:"#A32D2D",borderRadius:4,fontSize:11,cursor:"pointer",fontWeight:600}}>Remove</button></div>))}
          <button style={{padding:"7px 14px",background:"transparent",border:"1px dashed #d4a437",color:"#d4a437",borderRadius:5,fontSize:11.5,cursor:"pointer",fontWeight:600}}>+ Add sort level</button>
        </div>
      )}
      {tab==="compare"&&tabPanel(
        <>
          <div style={{padding:14,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec",marginBottom:14}}>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}><input type="checkbox" defaultChecked/><span style={{fontSize:12.5,fontWeight:600}}>Show comparison column</span></label>
            <div style={{marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <FL label="Compare to"><select style={inpStd}><option>Previous Period (Apr 2026)</option><option>Same period last year (May 2025)</option><option>Budget</option><option>Forecast</option><option>Custom period</option></select></FL>
              <FL label="Show variance as"><select style={inpStd}><option>Both Absolute &amp; %</option><option>Absolute only</option><option>% only</option></select></FL>
            </div>
          </div>
          <div style={cardStyle}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>Preview with Comparison</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead style={{background:"#f7f8fb"}}><tr><th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#5a6691",fontWeight:700}}>Particulars</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>May 2026</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Apr 2026</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Δ</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>%Δ</th></tr></thead>
              <tbody><tr><td style={{padding:"8px 12px",fontWeight:600}}>Revenue</td><td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace"}}>₹268L</td><td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace",color:"#5a6691"}}>₹242L</td><td style={{padding:"8px 12px",textAlign:"right",color:"#22c55e",fontWeight:700}}>+₹26L</td><td style={{padding:"8px 12px",textAlign:"right",color:"#22c55e",fontWeight:700}}>+10.7%</td></tr></tbody>
            </table>
          </div>
        </>
      )}
      {tab==="format"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={{padding:14,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase"}}>Visible Columns</p>
            <div style={{marginTop:10}}>{["Particulars","Amount","% of Revenue","Variance","Notes","Last Updated"].map(c=>(<label key={c} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",cursor:"pointer"}}><input type="checkbox" defaultChecked={["Particulars","Amount","Variance"].includes(c)}/><span style={{fontSize:11.5}}>{c}</span></label>))}</div>
          </div>
          <div style={{padding:14,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase"}}>Number Format</p>
            <div style={{marginTop:10,display:"grid",gap:10}}>
              <FL label="Display Unit"><select style={inpStd}><option>Lakhs (L)</option><option>Crores (Cr)</option><option>Actual</option><option>Thousands (K)</option></select></FL>
              <FL label="Decimals"><select style={inpStd}><option>0</option><option>1</option><option>2</option></select></FL>
              <FL label="Currency Symbol"><select style={inpStd}><option>₹ (Rupee)</option><option>INR</option><option>None</option></select></FL>
              <FL label="Negative Display"><select style={inpStd}><option>(brackets)</option><option>-prefix</option><option>red color</option></select></FL>
            </div>
          </div>
        </div>
      )}
      {tab==="export"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          {[{n:"PDF",ic:"📄",d:"Print-ready report with letterhead",c:"#A32D2D"},{n:"Excel",ic:"📊",d:"Editable with formulas preserved",c:"#22c55e"},{n:"CSV",ic:"📋",d:"Plain tabular for analysis tools",c:"#5a6691"},{n:"JSON",ic:"{ }",d:"For API/integration consumption",c:"#6B4C8B"},{n:"Word",ic:"📝",d:"Formatted report for editing",c:"#0d1326"},{n:"HTML",ic:"🌐",d:"Email-friendly with styling",c:"#d4a437"},{n:"Image (PNG)",ic:"🖼️",d:"Snapshot of chart/table",c:"#f97316"},{n:"ZIP",ic:"📦",d:"Multi-format bundle",c:"#2F7A8E"}].map(f=>(<button key={f.n} style={{padding:18,background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,borderTop:"3px solid "+f.c}}><span style={{fontSize:30}}>{f.ic}</span><span style={{fontWeight:700,fontSize:12.5,color:"#0d1326"}}>{f.n}</span><span style={{fontSize:10,color:"#5a6691",textAlign:"center"}}>{f.d}</span></button>))}
        </div>
      )}
      {tab==="schedule"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
          <div style={{padding:14,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase"}}>Setup Auto-Email</p>
            <div style={{marginTop:14,display:"grid",gap:10}}>
              <FL label="Frequency"><select style={inpStd}><option>Daily (9 AM)</option><option>Weekly (Monday 9 AM)</option><option>Monthly (1st of month)</option><option>Quarterly</option><option>Custom CRON</option></select></FL>
              <FL label="Recipients (comma-separated)"><input defaultValue="afshin@travkings.com, faiz.fm@travkings.com" style={inpStd}/></FL>
              <FL label="Format"><div style={{display:"flex",gap:8}}>{["PDF","Excel","Both"].map(f=><label key={f} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",border:"1px solid #e1e3ec",borderRadius:5,cursor:"pointer"}}><input type="radio" name="fmt" defaultChecked={f==="PDF"}/><span style={{fontSize:11.5}}>{f}</span></label>)}</div></FL>
              <FL label="Subject Template"><input defaultValue="P&L Report — {{period}} — Travkings" style={{...inpStd,fontFamily:"monospace",fontSize:11}}/></FL>
              <button style={{marginTop:6,padding:"9px 18px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Schedule This Report</button>
            </div>
          </div>
          <div style={cardStyle}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>Active Schedules</p>
            {[{n:"Monthly P&L",f:"Monthly",r:"Director, Sr.FM"},{n:"Weekly Cash",f:"Weekly",r:"Sr.FM"}].map(s=>(<div key={s.n} style={{padding:"8px 0",borderBottom:"1px solid #f0f2f7"}}><p style={{margin:0,fontSize:11.5,fontWeight:600,color:"#0d1326"}}>{s.n}</p><p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691"}}>{s.f} · to {s.r}</p></div>))}
          </div>
        </div>
      )}
      {tab==="share"&&tabPanel(
        <div style={{maxWidth:600}}>
          <p style={{margin:"0 0 14px",fontSize:11.5,color:"#5a6691"}}>Generate a shareable link to this report view. Recipients can view but not edit. Link expires per policy.</p>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <input defaultValue="https://kbiz360.travkings.com/share/PL-202605-x8aN2qP" readOnly style={{...inpStd,fontFamily:"monospace",fontSize:11,background:"#fafbfd"}}/>
            <button style={{padding:"9px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:11.5,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>📋 Copy</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <FL label="Expires in"><select style={inpStd}><option>24 hours</option><option>7 days</option><option>30 days</option><option>Never</option></select></FL>
            <FL label="Access"><select style={inpStd}><option>View only</option><option>View + Comment</option><option>Password-protected</option></select></FL>
          </div>
          <div style={{marginTop:14,padding:10,background:"#fff3cd",border:"1px solid #ffe69a",borderRadius:6}}><p style={{margin:0,fontSize:11,color:"#856404"}}><b>Note:</b> Shared links honor data scope of the user creating them. External recipients will see only what you can see.</p></div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   5. EMPLOYEE MASTER (10 tabs) — Faiz Patel demo
   ════════════════════════════════════════════════════════════════════ */


export function CustomReportBuilder(){
  const [selected,setSelected]=useState(["Branch","Revenue","GP","GP %","Bookings"]);
  const [filters,setFilters]=useState([
    {id:1,field:"Period (Month)",op:"=",val:"May 2026"},
    {id:2,field:"Branch",op:"≠",val:"TKHO"},
  ]);
  const [viewName,setViewName]=useState("My Custom Report");
  const [saved,setSaved]=useState(false);
  const [nextFid,setNextFid]=useState(3);
  const allFields=Object.values(BUILDER_FIELD_CATALOG).flat();
  const ops=["=","≠",">","<","≥","≤","contains","starts with"];

  const addField=f=>{if(!selected.includes(f))setSelected(s=>[...s,f]);};
  const removeField=f=>setSelected(s=>s.filter(x=>x!==f));
  const moveField=(f,dir)=>{
    setSelected(s=>{const i=s.indexOf(f);if(i<0)return s;const n=[...s];const j=i+dir;if(j<0||j>=n.length)return s;[n[i],n[j]]=[n[j],n[i]];return n;});
  };
  const addFilter=()=>{setFilters(f=>[...f,{id:nextFid,field:"Branch",op:"=",val:""}]);setNextFid(n=>n+1);};
  const removeFilter=id=>setFilters(f=>f.filter(x=>x.id!==id));

  const previewData=[
    {Branch:"BOM",Revenue:"₹3.85Cr",GP:"₹68.5L","GP %":"17.8%",Bookings:182},
    {Branch:"NBO",Revenue:"₹1.85Cr",GP:"₹42.0L","GP %":"22.7%",Bookings:62},
    {Branch:"AMD",Revenue:"₹1.42Cr",GP:"₹24.8L","GP %":"17.5%",Bookings:84},
    {Branch:"DAR",Revenue:"₹98.0L", GP:"₹26.8L","GP %":"27.3%",Bookings:38},
    {Branch:"FBM",Revenue:"₹64.0L", GP:"₹18.5L","GP %":"28.9%",Bookings:28},
  ];

  return(
    <PHASE2_Page title="Custom Report Builder"
      subtitle="Select fields · add filters · reorder columns · save as a named view">
      <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:14,marginBottom:14}}>
        {/* Field catalog */}
        <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden",maxHeight:520,overflowY:"auto"}}>
          <p style={{margin:0,padding:"10px 12px",fontSize:12,fontWeight:700,color:"#0d1326",borderBottom:"1px solid #e1e3ec",background:"#fafbfd"}}>Available Fields</p>
          {Object.entries(BUILDER_FIELD_CATALOG).map(([cat,fields])=>(
            <div key={cat}>
              <p style={{margin:0,padding:"6px 12px",fontSize:10,fontWeight:700,color:"#5a6691",textTransform:"uppercase",letterSpacing:"0.4px",background:"#f7f8fb"}}>{cat}</p>
              {fields.map(f=>(
                <div key={f} onClick={()=>addField(f)} style={{padding:"7px 12px",fontSize:11.5,cursor:"pointer",color:selected.includes(f)?"#5a6691":"#0d1326",background:selected.includes(f)?"#f0f2f7":"#fff",borderBottom:"1px solid #f7f8fb",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                  onMouseEnter={e=>{if(!selected.includes(f))e.currentTarget.style.background="#fff8e8";}}
                  onMouseLeave={e=>{if(!selected.includes(f))e.currentTarget.style.background="#fff";}}>
                  {f}
                  {selected.includes(f)?<span style={{fontSize:9,color:"#5a6691"}}>added</span>:<span style={{fontSize:13,color:"#d4a437"}}>+</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Builder canvas */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Selected columns */}
          <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
            <p style={{margin:0,padding:"10px 14px",fontSize:12,fontWeight:700,color:"#0d1326",borderBottom:"1px solid #e1e3ec",background:"#fafbfd"}}>Selected Columns ({selected.length}) — click + to add from catalog, drag to reorder</p>
            <div style={{padding:12,display:"flex",flexWrap:"wrap",gap:8,minHeight:52}}>
              {selected.map((f,i)=>(
                <div key={f} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 8px",background:"#0d1326",borderRadius:5,fontSize:11.5,color:"#fff",fontWeight:600}}>
                  <span style={{cursor:"pointer",color:"#5a6691",fontSize:12}} onClick={()=>moveField(f,-1)}>◀</span>
                  <span>{f}</span>
                  <span style={{cursor:"pointer",color:"#5a6691",fontSize:12}} onClick={()=>moveField(f,1)}>▶</span>
                  <span onClick={()=>removeField(f)} style={{cursor:"pointer",color:"#f97316",marginLeft:4,fontSize:13,fontWeight:700}}>×</span>
                </div>
              ))}
              {selected.length===0&&<p style={{margin:0,fontSize:11.5,color:"#5a6691"}}>Click fields from the catalog to add them here →</p>}
            </div>
          </div>

          {/* Filters */}
          <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
            <div style={{padding:"10px 14px",borderBottom:"1px solid #e1e3ec",background:"#fafbfd",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>Filters ({filters.length})</p>
              <button onClick={addFilter} style={{padding:"4px 10px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:4,fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add Filter</button>
            </div>
            <div style={{padding:12,display:"flex",flexDirection:"column",gap:8}}>
              {filters.map(f=>(
                <div key={f.id} style={{display:"flex",alignItems:"center",gap:8}}>
                  <select defaultValue={f.field} style={{padding:"6px 8px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:11.5,flex:2}}>
                    {Object.values(BUILDER_FIELD_CATALOG).flat().map(x=><option key={x}>{x}</option>)}
                  </select>
                  <select defaultValue={f.op} style={{padding:"6px 8px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:11.5,flex:1}}>
                    {ops.map(o=><option key={o}>{o}</option>)}
                  </select>
                  <input defaultValue={f.val} style={{padding:"6px 8px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:11.5,flex:2}} placeholder="Value…"/>
                  <button onClick={()=>removeFilter(f.id)} style={{padding:"5px 8px",background:"transparent",border:"1px solid #f8d7da",color:"#A32D2D",borderRadius:4,fontSize:12,fontWeight:700,cursor:"pointer"}}>✕</button>
                </div>
              ))}
              {filters.length===0&&<p style={{margin:0,fontSize:11.5,color:"#5a6691"}}>No filters — report will show all data</p>}
            </div>
          </div>

          {/* Save bar */}
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input value={viewName} onChange={e=>{setViewName(e.target.value);setSaved(false);}} placeholder="Name this report view…" style={{flex:1,padding:"8px 11px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12.5}}/>
            <button onClick={()=>setSaved(true)} style={{padding:"8px 18px",background:"#0d1326",color:"#d4a437",border:"none",borderRadius:6,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>💾 Save View</button>
            {saved&&<span style={{fontSize:11.5,color:"#22c55e",fontWeight:700}}>✓ Saved to My Views</span>}
          </div>
        </div>
      </div>

      {/* Preview */}
      {selected.length>0&&(
        <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:"1px solid #e1e3ec",background:"#fafbfd",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>Preview — {viewName} (sample data)</p>
            <ExportDropdown/>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr>{selected.map(f=><th key={f} style={RPT_thStyle}>{f}</th>)}</tr></thead>
              <tbody>{previewData.map((row,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #f0f2f7"}}>
                  {selected.map(f=><td key={f} style={RPT_tdStyle}>{row[f]??<span style={{color:"#5a6691"}}>—</span>}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   2. SAVED REPORT VIEWS
   ════════════════════════════════════════════════════════════════════ */

export function SavedReportViews(){
  const [filter,setFilter]=useState("ALL");
  const types=["ALL","Profitability","Financial","Operational","Compliance"];
  const filtered=filter==="ALL"?SAVED_VIEWS_DATA:SAVED_VIEWS_DATA.filter(v=>v.type===filter);
  return(
    <PHASE2_Page title="Saved Report Views"
      subtitle="Your saved custom reports · quick-launch · clone · schedule"
      toolbar={<button style={{padding:"8px 16px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ New Report</button>}>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {types.map(t=>(
          <button key={t} onClick={()=>setFilter(t)} style={{padding:"6px 14px",border:filter===t?"2px solid #0d1326":"1px solid #e1e3ec",background:filter===t?"#0d1326":"#fff",color:filter===t?"#d4a437":"#5a6691",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>{t}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:12}}>
        {filtered.map(v=>(
          <div key={v.id} style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:14}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:22}}>{v.icon}</span>
                <div>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>{v.name}</p>
                  <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{v.type} · {v.fields.length} columns</p>
                </div>
              </div>
              {v.scheduled&&<span style={{padding:"2px 8px",background:"#d4edda",color:"#155724",borderRadius:3,fontSize:10,fontWeight:700}}>⏰ {v.schedFreq}</span>}
            </div>
            <div style={{marginBottom:10}}>
              <p style={{margin:"0 0 4px",fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.3px"}}>Fields</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {v.fields.map(f=><span key={f} style={{padding:"2px 7px",background:"#e6e8f1",borderRadius:3,fontSize:10.5,color:"#0d1326"}}>{f}</span>)}
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <p style={{margin:"0 0 4px",fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.3px"}}>Filters</p>
              {v.filters.map((f,i)=><p key={i} style={{margin:0,fontSize:10.5,color:"#5a6691"}}>• {f}</p>)}
            </div>
            <div style={{fontSize:10.5,color:"#5a6691",marginBottom:12,display:"flex",justifyContent:"space-between"}}>
              <span>By {v.owner}</span>
              <span>Last run {v.lastRun.split(" ")[0]}</span>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button style={{flex:1,padding:"6px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>▶ Run</button>
              <button style={{padding:"6px 10px",background:"transparent",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:5,fontSize:11,cursor:"pointer"}}>Edit</button>
              <button style={{padding:"6px 10px",background:"transparent",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:5,fontSize:11,cursor:"pointer"}}>Clone</button>
              <button style={{padding:"6px 10px",background:"transparent",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:5,fontSize:11,cursor:"pointer"}}>⏰</button>
            </div>
          </div>
        ))}
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   3. SCHEDULED EMAIL REPORTS
   ════════════════════════════════════════════════════════════════════ */

export function ScheduledReports(){
  const [schedules,setSchedules]=useState(SCHEDULED_REPORTS_DATA);
  const toggleStatus=id=>setSchedules(s=>s.map(r=>r.id===id?{...r,status:r.status==="Active"?"Paused":"Active"}:r));
  const activeCount=schedules.filter(s=>s.status==="Active").length;
  const inp={padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%"};

  return(
    <PHASE2_Page title="Scheduled Email Reports"
      subtitle="Auto-send reports by email · daily, weekly, monthly · PDF or Excel"
      toolbar={<button style={{padding:"8px 16px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ New Schedule</button>}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
        {[{l:"Active Schedules",v:activeCount,c:"#22c55e"},{l:"Paused",v:schedules.length-activeCount,c:"#5a6691"},{l:"Emails Sent Today",v:3,c:"#d4a437"},{l:"Total Recipients",v:7,c:"#3b82f6"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"5px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{k.v}</p></div>
        ))}
      </div>

      <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden",marginBottom:14}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr>
            <th style={RPT_thStyle}>Report</th><th style={RPT_thStyle}>Frequency</th>
            <th style={RPT_thStyle}>Send Time</th><th style={RPT_thStyle}>Recipients</th>
            <th style={RPT_thStyle}>Format</th><th style={RPT_thStyle}>Last Sent</th>
            <th style={RPT_thStyle}>Next Run</th>
            <th style={{...RPT_thStyle,textAlign:"center"}}>Status</th>
            <th style={{...RPT_thStyle,textAlign:"center"}}>Action</th>
          </tr></thead>
          <tbody>{schedules.map(s=>(
            <tr key={s.id} style={{borderBottom:"1px solid #f0f2f7",opacity:s.status==="Paused"?0.65:1}}>
              <td style={{...RPT_tdStyle,fontWeight:700}}>{s.report}</td>
              <td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:"#e6e8f1",borderRadius:3,fontSize:10.5,fontWeight:700}}>{s.freq}</span></td>
              <td style={{...RPT_tdStyle,fontSize:11}}>{s.day} · {s.time}</td>
              <td style={RPT_tdStyle}>
                <p style={{margin:0,fontSize:11}}>{s.recipients[0]}</p>
                {s.recipients.length>1&&<p style={{margin:0,fontSize:10,color:"#5a6691"}}>+{s.recipients.length-1} more</p>}
              </td>
              <td style={RPT_tdStyle}><span style={{padding:"2px 7px",background:"#e6e8f1",borderRadius:3,fontSize:10.5,fontWeight:600}}>{s.format}</span></td>
              <td style={{...RPT_tdStyle,fontSize:11,color:"#5a6691"}}>{s.lastSent.split(" ")[0]}</td>
              <td style={{...RPT_tdStyle,fontSize:11,color:"#d4a437",fontWeight:600}}>{s.nextRun.split(" ")[0]}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}>
                <span style={{padding:"3px 10px",borderRadius:3,fontSize:10.5,fontWeight:700,background:s.status==="Active"?"#d4edda":"#e2e3e5",color:s.status==="Active"?"#155724":"#383d41"}}>{s.status}</span>
              </td>
              <td style={{padding:"6px 12px",textAlign:"center",borderBottom:"1px solid #f0f2f7"}}>
                <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                  <button onClick={()=>toggleStatus(s.id)} style={{padding:"3px 8px",background:"transparent",border:"1px solid "+(s.status==="Active"?"#f97316":"#22c55e"),color:s.status==="Active"?"#f97316":"#22c55e",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>{s.status==="Active"?"Pause":"Resume"}</button>
                  <button style={{padding:"3px 8px",background:"transparent",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:3,fontSize:10,fontWeight:600,cursor:"pointer"}}>Edit</button>
                  <button style={{padding:"3px 8px",background:"#d4a437",border:"none",color:"#0d1326",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>▶ Now</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {/* Add new schedule form */}
      <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:16}}>
        <p style={{margin:"0 0 12px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Add New Schedule</p>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
          <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Report</label><select style={inp}>{SAVED_VIEWS_DATA.map(v=><option key={v.id}>{v.name}</option>)}</select></div>
          <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Frequency</label><select style={inp}><option>Daily</option><option>Weekly</option><option>Monthly</option></select></div>
          <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Send Time</label><input type="time" defaultValue="08:00" style={inp}/></div>
          <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Format</label><select style={inp}><option>PDF</option><option>Excel</option><option>CSV</option></select></div>
        </div>
        <div style={{marginBottom:10}}><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Recipients (comma-separated emails)</label><input style={inp} placeholder="faiz.fm@travkings.com, afshin@travkings.com"/></div>
        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <button style={{padding:"8px 18px",background:"#0d1326",color:"#d4a437",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Create Schedule</button>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   4. REPORTS META FEATURES DEMO
   Shows: Comparative columns · Sparklines · Drill-down · Multi-format export
   All working together in one sample Branch Revenue report
   ════════════════════════════════════════════════════════════════════ */

export function ReportsMetaDemo(){
  const [showComparative,setShowComparative]=useState(true);
  const [showSparklines,setShowSparklines]=useState(true);
  const [drillData,setDrillData]=useState(null);

  return(
    <PHASE2_Page title="Reports Meta Features — Live Demo"
      subtitle="All 4 meta features working together: comparative columns · sparklines · drill-down · multi-format export">

      {drillData&&<DrillModal branch={drillData.branch} metric={drillData.metric} value={drillData.value} onClose={()=>setDrillData(null)}/>}

      {/* Feature toggles */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"12px 16px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,flexWrap:"wrap"}}>
        <p style={{margin:0,fontSize:11.5,fontWeight:700,color:"#0d1326",marginRight:4}}>Active features:</p>
        {[{key:"comp",label:"Comparative columns",state:showComparative,toggle:()=>setShowComparative(v=>!v)},
          {key:"spark",label:"Sparkline charts",state:showSparklines,toggle:()=>setShowSparklines(v=>!v)},
        ].map(f=>(
          <label key={f.key} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",padding:"5px 10px",borderRadius:5,background:f.state?"#fff8e8":"#f7f8fb",border:"1px solid "+(f.state?"#d4a437":"#e1e3ec")}}>
            <input type="checkbox" checked={f.state} onChange={f.toggle}/>
            <span style={{fontSize:11.5,fontWeight:600,color:f.state?"#0d1326":"#5a6691"}}>{f.label}</span>
          </label>
        ))}
        <span style={{padding:"5px 10px",background:"#d4edda",border:"1px solid #bbf7d0",borderRadius:5,fontSize:11.5,fontWeight:600,color:"#155724"}}>✓ Drill-down on (click any ₹ value)</span>
        <div style={{marginLeft:"auto"}}><ExportDropdown/></div>
      </div>

      {/* The report */}
      <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",background:"#0d1326",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{margin:0,fontSize:13,fontWeight:700}}>Branch Revenue Report</p>
            <p style={{margin:"1px 0 0",fontSize:10.5,color:"#d4a437"}}>May 2026 {showComparative?"· vs May 2025":""}</p>
          </div>
          <span style={{fontSize:10.5,color:"#5a6691"}}>Click any highlighted value to drill down ↗</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#f7f8fb"}}>
                <th style={RPT_thStyle}>Branch</th>
                <th style={{...RPT_thStyle,textAlign:"right"}}>Revenue (May-26)</th>
                {showComparative&&<><th style={{...RPT_thStyle,textAlign:"right",color:"#5a6691"}}>Revenue (May-25)</th><th style={{...RPT_thStyle,textAlign:"right"}}>Variance</th><th style={{...RPT_thStyle,textAlign:"right"}}>YoY %</th></>}
                <th style={{...RPT_thStyle,textAlign:"right"}}>Gross Profit</th>
                {showComparative&&<><th style={{...RPT_thStyle,textAlign:"right",color:"#5a6691"}}>GP (May-25)</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP Var %</th></>}
                {showSparklines&&<th style={{...RPT_thStyle,textAlign:"center"}}>12m Trend</th>}
              </tr>
            </thead>
            <tbody>
              {DEMO_REPORT_DATA.filter(r=>r.cy_rev>0).map((r,i)=>{
                const revVar=r.cy_rev-r.ly_rev;
                const revPct=r.ly_rev>0?((revVar/r.ly_rev)*100).toFixed(1):"—";
                const gpVar=r.cy_gp-r.ly_gp;
                const gpPct=r.ly_gp>0?((gpVar/r.ly_gp)*100).toFixed(1):"—";
                return(
                  <tr key={r.branch} style={{borderBottom:"1px solid #f0f2f7"}}>
                    <td style={{...RPT_tdStyle,fontWeight:700}}><span style={{padding:"2px 7px",background:"#0d1326",color:"#d4a437",borderRadius:3,fontSize:10.5,fontWeight:700}}>{r.branch}</span></td>
                    <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>
                      <span onClick={()=>setDrillData({branch:r.branch,metric:"Revenue",value:r.cy_rev})}
                        style={{cursor:"pointer",color:"#0d1326",textDecoration:"underline",textDecorationStyle:"dotted",textDecorationColor:"#d4a437"}}>
                        {fmtINR(r.cy_rev)}
                      </span>
                    </td>
                    {showComparative&&<>
                      <td style={{...RPT_tdStyle,textAlign:"right",color:"#5a6691"}}>{fmtINR(r.ly_rev)}</td>
                      <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:revVar>=0?"#22c55e":"#A32D2D"}}>{revVar>=0?"+":""}{fmtINR(Math.abs(revVar))}</td>
                      <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:parseFloat(revPct)>=0?"#22c55e":"#A32D2D"}}>{revPct!=="—"?(revPct>=0?"+":"")+revPct+"%":"—"}</td>
                    </>}
                    <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>
                      <span onClick={()=>setDrillData({branch:r.branch,metric:"Gross Profit",value:r.cy_gp})}
                        style={{cursor:"pointer",color:"#22c55e",textDecoration:"underline",textDecorationStyle:"dotted",textDecorationColor:"#22c55e"}}>
                        {fmtINR(r.cy_gp)}
                      </span>
                    </td>
                    {showComparative&&<>
                      <td style={{...RPT_tdStyle,textAlign:"right",color:"#5a6691"}}>{fmtINR(r.ly_gp)}</td>
                      <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:parseFloat(gpPct)>=0?"#22c55e":"#A32D2D"}}>{gpPct!=="—"?(gpPct>=0?"+":"")+gpPct+"%":"—"}</td>
                    </>}
                    {showSparklines&&(
                      <td style={{...RPT_tdStyle,textAlign:"center"}}>
                        <Sparkline values={r.sparkline} color={i%2===0?"#d4a437":"#22c55e"}/>
                      </td>
                    )}
                  </tr>
                );
              })}
              {/* Totals row */}
              {(()=>{
                const totCY=DEMO_REPORT_DATA.reduce((s,r)=>s+r.cy_rev,0);
                const totLY=DEMO_REPORT_DATA.reduce((s,r)=>s+r.ly_rev,0);
                const totGPCY=DEMO_REPORT_DATA.reduce((s,r)=>s+r.cy_gp,0);
                const totGPLY=DEMO_REPORT_DATA.reduce((s,r)=>s+r.ly_gp,0);
                const totVar=totCY-totLY;
                const totPct=totLY>0?((totVar/totLY)*100).toFixed(1):"—";
                const gpVar=totGPCY-totGPLY;
                const gpPct=totGPLY>0?((gpVar/totGPLY)*100).toFixed(1):"—";
                return(
                  <tr style={{background:"#fafbfd",borderTop:"2px solid #0d1326",fontWeight:700}}>
                    <td style={{...RPT_tdStyle,fontWeight:700,fontSize:12.5}}>TOTAL</td>
                    <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,fontSize:13,fontFamily:"monospace"}}>{fmtINR(totCY)}</td>
                    {showComparative&&<>
                      <td style={{...RPT_tdStyle,textAlign:"right",color:"#5a6691"}}>{fmtINR(totLY)}</td>
                      <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#22c55e"}}>+{fmtINR(totVar)}</td>
                      <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#22c55e"}}>+{totPct}%</td>
                    </>}
                    <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,fontSize:13,fontFamily:"monospace",color:"#22c55e"}}>{fmtINR(totGPCY)}</td>
                    {showComparative&&<>
                      <td style={{...RPT_tdStyle,textAlign:"right",color:"#5a6691"}}>{fmtINR(totGPLY)}</td>
                      <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#22c55e"}}>+{gpPct}%</td>
                    </>}
                    {showSparklines&&<td style={RPT_tdStyle}/>}
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
        <div style={{padding:"8px 14px",background:"#fafbfd",borderTop:"1px solid #e1e3ec",fontSize:10.5,color:"#5a6691",display:"flex",gap:16}}>
          {showComparative&&<span>📊 Comparative mode ON — showing May-26 vs May-25</span>}
          {showSparklines&&<span>✦ Sparklines show 12-month revenue trend (Jun-25 to May-26)</span>}
          <span>↗ Dotted-underline values are drill-down enabled</span>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   HR & PAYROLL — SELF-SERVICE (9 screens)
   ════════════════════════════════════════════════════════════════════ */

/* ── HR seed data ─────────────────────────────────────────────────── */

