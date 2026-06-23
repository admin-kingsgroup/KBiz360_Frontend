/* ════════════════════════════════════════════════════════════════════
   MODULES/REPORTS.JSX
   Auto-generated from KBiz360_v2.jsx · 3434 lines · 29 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from 'react';
import { Download, Printer, Save, Search } from 'lucide-react';
import { Bar, Legend, Line } from 'recharts';
import { exportToCSV } from '../../core/business-logic';
import { exportToExcel } from '../../core/exportExcel';
import { ACTIVE_CURRENCIES, BRANCHES, BRANCH_CODES, CURRENCY_META, MODULE_ICONS, CONSOLIDATED_LABEL } from '../../core/data';
import { useExpenseLedgers, useFiscalYears, useExpenseBudgets } from '../../core/useReference';
import { useBalanceSheet, useGpBills, useModulePL, useAgeing, useTaxSummary, useLedgerStatement, useBudgetVsActual } from '../../core/useAccounting';
import { fmt, fmtINR } from '../../core/format';
import { CUR_MONTH, CUR_FY, MONTH_OPTIONS, PERIOD_OPTIONS, FY_MONTHS, FY_YTD_MONTHS, ALL_TIME_FROM, todayISO, fmtDate, rangeNote, monthLabel, prevMonthKey, presetRange, fyQuarterKey } from '../../core/dates';
import { periodRange } from '../../core/period';
import { ReportDateBar, ReportSearch, matchNeedle, resolveReportRange, priorYearRange } from '../../core/reportDateBar';
import { BUILDER_FIELD_CATALOG, DEMO_REPORT_DATA, DrillModal, ExportDropdown, GRP_COLORS, PKG_D, PKG_SC, PackagePnL, SAVED_VIEWS_DATA, SCHEDULED_REPORTS_DATA, Sparkline, TAB_Page, cardStyle, tabPanel } from '../../core/helpers';
import { useBgtRefresh, useMobile } from '../../core/hooks';
import { B, FL, KpiCard, RPT_tdStyle, RPT_thStyle, bc, btnG, btnGh, card, inp, inpStd, tabBtnStyle } from '../../core/styles';
import { Dashboard } from '../dashboard';
import { NotifPanel } from '../../shell/NotifPanel';
import { PHASE2_Page } from '../../shell/PHASE2_Page';

// RptShell + NotWired now live in ./components/scaffold (rebuilt on the shared
// responsive primitives). Imported here for the many in-file report screens that
// use them; the barrel re-exports them so the public names are unchanged.
import { RptShell, NotWired } from './components/scaffold';
import { clickable } from '../../core/ux/clickable';


// ReportBranch migrated → ./pages/branch-comparison.jsx (primitives + DataTable).
// Re-exported from the feature barrel under its original name.

/* ── PACKAGE P&L ─────────────────────────────────────────── */

export function ReportPackagePnL(){
  return <NotWired title="Package P&L" note="File-wise package profitability isn't connected to a live source yet. Once tour packages are linked to their booking files, real P&L per file will appear here."/>;
}
function _ReportPackagePnL_legacy(){
  const [q,setQ]=useState("");
  const rows=PKG_D.filter(r=>!q||r.cust.toLowerCase().includes(q.toLowerCase())||r.pkg.toLowerCase().includes(q.toLowerCase())||r.file.toLowerCase().includes(q.toLowerCase()));
  return (
    <RptShell title="Package P&amp;L" subtitle="File-wise profitability">
      <div style={{position:"relative",marginBottom:12}}>
        <Search size={13} style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#9197a3"}}/>
        <input placeholder="Search file no., customer, package..." value={q} onChange={e=>setQ(e.target.value)} style={{...inp,paddingLeft:32,fontSize:12}}/>
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",fontSize:11.5,borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f3f4f8",borderBottom:"2px solid #e6e8ec"}}>
              {["File no.","Customer","Package","Dept.","Sale ₹","Cost ₹","GST ₹","Net Profit ₹","Margin %","Status"].map((h,i)=>(
                <th key={i} style={{textAlign:i>=4&&i<=8?"right":"left",padding:"9px 11px",fontWeight:600,color:"#2e323c",fontSize:11}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{rows.map((r,i)=>{
              const sc=PKG_SC[r.status]||PKG_SC.Tentative;
              return (
                <tr key={i} style={{borderBottom:"1px solid #e6e8ec",opacity:r.status==="Cancelled"?0.5:1}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"9px 11px",fontFamily:"monospace",fontSize:11,color:"#2563eb"}}>{r.file}</td>
                  <td style={{padding:"9px 11px",fontWeight:500}}>{r.cust}</td>
                  <td style={{padding:"9px 11px",color:"#2e323c"}}>{r.pkg}</td>
                  <td style={{padding:"9px 11px",color:"#5b616e"}}>{r.dept}</td>
                  <td style={{padding:"9px 11px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmt(r.sale)}</td>
                  <td style={{padding:"9px 11px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#d97706"}}>{fmt(r.cost)}</td>
                  <td style={{padding:"9px 11px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#5b616e"}}>{fmt(r.gst)}</td>
                  <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:r.net>0?"#16a34a":"#e24b4a"}}>{fmt(r.net)}</td>
                  <td style={{padding:"9px 11px",textAlign:"right",fontWeight:600,color:r.margin>40?"#16a34a":"#d97706"}}>{r.margin+"%"}</td>
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




/* ══════════════════════════════════════════════════════════════════
   HR & PAYROLL — 4 Screens
   Employee Master · Attendance · Salary Run · Payslips
   ════════════════════════════════════════════════════════════════ */



/* ════════════════════════════════════════════════════════════════
   NOTIFICATIONS PANEL (wired to bell icon via NotifPanel)
   ════════════════════════════════════════════════════════════════ */



/* ── ITEM 4: CONSOLIDATED BALANCE SHEET  /reports/consolidated-bs ── */


/* ── ITEM 5: INTER-BRANCH TRANSACTION TAGGER (component shown in BookingFiles) ── */
/* Inter-branch flag is added as a field in BookingFiles — "type" can be "Intercompany" */
/* This is handled by the intercompany flag in Booking File records */

/* ── ITEM 6: ADVANCE / DEPOSIT LEDGER  /bookings/advances ─────── */


/* ── CLIENT ACCOUNT STATEMENT ────────────────────────────────── */


/* ── TOUR CODE / PACKAGE MASTER ──────────────────────────────── */



/* ══════════════════════════════════════════════════════════════════
   BATCH C — PRIORITY 3: OPERATIONS + CRM + INTELLIGENCE
   GroupBookings · CorporateAccounts · DestinationIntelligence
   PackagePnL · SubAgentStatement · RefundTracker
   ════════════════════════════════════════════════════════════════ */

/* ── GROUP BOOKING MANAGER ───────────────────────────────────── */


/* ── PACKAGE P&L BY TOUR CODE ────────────────────────────────── */

export function IntercompanyBilling(){
  return <NotWired title="Intercompany Billing" note="Cross-branch billing isn't wired to live data yet. Once the inter-branch billing voucher flow is connected, real IC transactions and markup will appear here — no sample entries are shown in the meantime."/>;
}
function _IntercompanyBilling_legacy({branch}){
  const mob=useMobile();
  const [tab,setTab]=useState("list"); // list | new
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const IC_ENTRIES=[
    {id:"IC/BOM-AMD/001",from:"BOM",to:"AMD",desc:"BOM issued tickets for AMD client group",amount:142000,currency:"INR",markup:5,date:"2026-05-12",status:"Invoiced",ref:"BOM/1726/SH00018"},
    {id:"IC/AMD-BOM/001",from:"AMD",to:"BOM",desc:"AMD client group — BOM issued tickets",amount:220000,currency:"INR",markup:4,date:"2026-05-15",status:"Pending",ref:"AMD/1726/SF00022"},
  ];
  const STATUS_CLR={Invoiced:"#2563eb",Settled:"#16a34a",Pending:"#d97706"};
  const STATUS_BG ={Invoiced:"#e8f0ff",Settled:"#e8f6ed",Pending:"#fbeedb"};
  const BRANCH_CLR={BOM:"#2563eb",AMD:"#d97706"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#e8f0ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔄</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>Intercompany Billing</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>Cross-branch transactions · BOM ↔ AMD · Auto markup {IC_ENTRIES[0].markup}%</p>
          </div>
        </div>
        <button onClick={()=>setTab(t=>t==="list"?"new":"list")} style={{...btnG,fontSize:11}}>{tab==="list"?"+ New IC Entry":"← Back to List"}</button>
      </div>

      {tab==="list"&&(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,150px),1fr))",gap:10,marginBottom:14}}>
            {[
              {l:"Total IC Volume",v:f(IC_ENTRIES.reduce((s,e)=>s+e.amount,0)),c:"#2563eb",bg:"#e8f0ff"},
              {l:"Settled",v:String(IC_ENTRIES.filter(e=>e.status==="Settled").length),c:"#16a34a",bg:"#e8f6ed"},
              {l:"Invoiced",v:String(IC_ENTRIES.filter(e=>e.status==="Invoiced").length),c:"#2563eb",bg:"#e8f0ff"},
              {l:"Pending",v:String(IC_ENTRIES.filter(e=>e.status==="Pending").length),c:"#d97706",bg:"#fbeedb"},
            ].map((k,i)=>(
              <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"10px 12px",background:k.bg}}>
                <p style={{margin:0,fontSize:8.5,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
                <p style={{margin:"3px 0 0",fontSize:18,fontWeight:800,color:"#1a1c22"}}>{k.v}</p>
              </div>
            ))}
          </div>

          <div style={{...card,padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#1a1c22"}}>
                {["IC Ref","From","To","Description","Amount","Markup","Date","Status"].map((h,i)=>(
                  <th key={i} style={{padding:"9px 11px",textAlign:i>=4&&i<=5?"right":"left",color:"#c2a04a",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{IC_ENTRIES.map((e,i)=>(
                <tr key={e.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:10,color:"#2563eb"}}>{e.id}</td>
                  <td style={{padding:"8px 11px"}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:800,background:(BRANCH_CLR[e.from]||"#2e323c")+"22",color:BRANCH_CLR[e.from]||"#2e323c"}}>{e.from}</span></td>
                  <td style={{padding:"8px 11px"}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:800,background:(BRANCH_CLR[e.to]||"#2e323c")+"22",color:BRANCH_CLR[e.to]||"#2e323c"}}>{e.to}</span></td>
                  <td style={{padding:"8px 11px",color:"#2e323c",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.desc}</td>
                  <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{e.currency} {e.amount.toLocaleString()}</td>
                  <td style={{padding:"8px 11px",textAlign:"right",color:"#16a34a",fontWeight:700}}>{e.markup}%</td>
                  <td style={{padding:"8px 11px",color:"#5b616e",whiteSpace:"nowrap"}}>{e.date}</td>
                  <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[e.status],color:STATUS_CLR[e.status]}}>{e.status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}

      {tab==="new"&&(
        <div style={{...card}}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#1a1c22"}}>New Intercompany Entry</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10,marginBottom:12}}>
            <FL label="From branch"><select style={inp}>{BRANCH_CODES.map(b=><option key={b}>{b}</option>)}</select></FL>
            <FL label="To branch"><select style={inp}>{BRANCH_CODES.map(b=><option key={b}>{b}</option>)}</select></FL>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:10,marginBottom:12}}>
            <FL label="Amount"><input type="number" style={inp} placeholder="0"/></FL>
            <FL label="Currency"><select style={inp}>{ACTIVE_CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></FL>
            <FL label="Intercompany Markup %"><input type="number" defaultValue={5} style={inp}/></FL>
          </div>
          <FL label="Description"><input style={inp} placeholder="e.g. BOM issued tickets for AMD client"/></FL>
          <FL label="Linked booking ref"><input style={{...inp,marginTop:10,fontFamily:"monospace"}} placeholder="BOM/1726/SH00001"/></FL>
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





export function VarianceAnalysis(){
  return <NotWired title="Variance Analysis" note="Actual-vs-Budget-vs-Forecast variance needs budget and forecast figures that aren't configured yet. Once they're entered, actuals will be compared live from the double-entry books — no sample numbers are shown in the meantime."/>;
}
function _VarianceAnalysis_legacy({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [period,setPeriod]=useState(CUR_MONTH);

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
  const card={background:"#fff",borderRadius:10,border:"1px solid #e6e8ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#1a1c22"}}>📈 Variance Analysis Report</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5b616e"}}>Actual vs Budget vs Forecast vs Prior Year · Ranked by largest swing</p>
        </div>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{padding:"7px 10px",border:"1px solid #e6e8ec",borderRadius:7,fontSize:11.5}}>
          {MONTH_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #16a34a"}}><p style={{margin:0,fontSize:10,color:"#5b616e",textTransform:"uppercase"}}>Revenue vs Budget</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:revVarPct>=0?"#16a34a":"#dc2626"}}>{revVarPct>=0?"+":""}{revVarPct.toFixed(1)}%</p><p style={{margin:0,fontSize:10,color:"#5b616e"}}>{cur+fmt(totalRev.actual-totalRev.budget)}</p></div>
        <div style={{...card,borderTop:"3px solid #2563eb"}}><p style={{margin:0,fontSize:10,color:"#5b616e",textTransform:"uppercase"}}>EBITDA vs Budget</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:ebVarPct>=0?"#16a34a":"#dc2626"}}>{ebVarPct>=0?"+":""}{ebVarPct.toFixed(1)}%</p><p style={{margin:0,fontSize:10,color:"#5b616e"}}>{cur+fmt(totalEbitda.actual-totalEbitda.budget)}</p></div>
        <div style={{...card,borderTop:"3px solid #d97706"}}><p style={{margin:0,fontSize:10,color:"#5b616e",textTransform:"uppercase"}}>Revenue YoY</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#d97706"}}>+{((totalRev.actual-totalRev.priorYear)/totalRev.priorYear*100).toFixed(1)}%</p></div>
        <div style={{...card,borderTop:"3px solid #dc2626"}}><p style={{margin:0,fontSize:10,color:"#5b616e",textTransform:"uppercase"}}>EBITDA YoY</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#dc2626"}}>+{((totalEbitda.actual-totalEbitda.priorYear)/totalEbitda.priorYear*100).toFixed(1)}%</p></div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#1a1c22",color:"#c2a04a"}}><tr>
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
                  <tr key={i} style={{background:isTotal?"#fbeedb":i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e6e8ec",fontWeight:isTotal?700:400}}>
                    <td style={{padding:"7px 8px",paddingLeft:isSub?22:10}}>{r.head.trim()}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",fontWeight:isTotal?700:500}}>{cur+fmt(r.actual)}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",color:"#5b616e"}}>{cur+fmt(r.budget)}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,color:vBgt>=0?"#16a34a":"#dc2626"}}>{vBgt>=0?"+":""}{cur+fmt(vBgt)}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",color:"#5b616e"}}>{cur+fmt(r.forecast)}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,color:vFc>=0?"#16a34a":"#dc2626"}}>{vFc>=0?"+":""}{cur+fmt(vFc)}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",color:"#5b616e"}}>{cur+fmt(r.priorYear)}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,color:vYoY>=0?"#16a34a":"#dc2626"}}>{vYoY>=0?"+":""}{vYoY.toFixed(1)}%</td>
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
  return <NotWired title="Report Viewer" note="This tabbed report viewer is a layout preview and isn't connected to live data, filters, scheduling or sharing yet."/>;
}
function _ReportViewerTabbed_legacy(){
  const [tab,setTab]=useState("view");
  const tabs=[{id:"view",label:"1. View"},{id:"filter",label:"2. Filter"},{id:"group",label:"3. Group By"},{id:"sort",label:"4. Sort"},{id:"compare",label:"5. Compare"},{id:"format",label:"6. Format"},{id:"export",label:"7. Export"},{id:"schedule",label:"8. Schedule"},{id:"share",label:"9. Share"}];
  return TAB_Page("Profit & Loss Statement — May 2026", "Generic 9-tab Report Viewer · applies to any report in the system",
    {user:"",date:"",created:""},
    <div style={{background:"#fff",border:"1px solid #e6e8ec",borderRadius:8,overflow:"hidden"}}>
      <div style={{display:"flex",borderBottom:"1px solid #e6e8ec",overflowX:"auto",background:"#fafbfd"}}>{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={tabBtnStyle(tab===t.id)}>{t.label}</button>)}</div>
      {tab==="view"&&tabPanel(
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead style={{background:"#f7f8fb"}}><tr><th style={{padding:"9px 12px",textAlign:"left",fontSize:10.5,color:"#5b616e",fontWeight:700,textTransform:"uppercase"}}>Particulars</th><th style={{padding:"9px 12px",textAlign:"right",fontSize:10.5,color:"#5b616e",fontWeight:700,textTransform:"uppercase"}}>May 2026</th></tr></thead>
          <tbody>{[{l:"Revenue from Operations",v:26800000,b:true},{l:"  Flight Sales",v:14250000},{l:"  Holiday Sales",v:6450000},{l:"  Hotel Sales",v:3850000},{l:"  Other Revenue",v:2250000},{l:"Total Revenue",v:26800000,b:true,bg:true},{l:"Cost of Sales",v:-22550000},{l:"Gross Profit",v:4250000,b:true,bg:true},{l:"Operating Expenses",v:-1450000},{l:"Net Profit",v:2800000,b:true,bg:true}].map((r,i)=>(<tr key={i} style={{borderBottom:"1px solid #f0f2f7",background:r.bg?"#fafbfd":"#fff",fontWeight:r.b?700:400}}><td style={{padding:"9px 12px",paddingLeft:r.l.startsWith(" ")?28:12}}>{r.l.trim()}</td><td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:r.v<0?"#dc2626":"#1a1c22"}}>{r.v<0?"(":""}₹{Math.abs(r.v).toLocaleString("en-IN")}{r.v<0?")":""}</td></tr>))}</tbody>
        </table>
      )}
      {tab==="filter"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:14}}>
          <FL label="Period"><select style={inpStd}><option>Today</option><option>This Week</option><option selected>This Month</option><option>This Quarter</option><option>YTD</option><option>Custom...</option></select></FL>
          <FL label="Date From"><input type="date" defaultValue="2026-05-01" style={inpStd}/></FL>
          <FL label="Date To"><input type="date" defaultValue="2026-05-31" style={inpStd}/></FL>
          <FL label="Branch"><select multiple size={4} style={{...inpStd,height:90}}><option>All Branches</option><option>TKHO</option><option>BOM</option><option>AMD</option></select></FL>
          <FL label="Customer Type"><select style={inpStd}><option>All</option><option>Corporate Premium</option><option>Corporate Standard</option><option>Individual</option><option>Travel Agent</option></select></FL>
          <FL label="Product Line"><select style={inpStd}><option>All</option><option>Flight</option><option>Holiday</option><option>Hotel</option><option>Visa</option><option>Insurance</option></select></FL>
          <FL label="Cost Center"><select style={inpStd}><option>All</option><option>TK-OPS</option><option>TK-MKT</option></select></FL>
          <FL label="Currency"><select style={inpStd}>{ACTIVE_CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></FL>
          <FL label="Min Amount"><input type="number" placeholder="0" style={inpStd}/></FL>
        </div>
      )}
      {tab==="group"&&tabPanel(
        <>
          <p style={{margin:"0 0 12px",fontSize:11.5,color:"#5b616e"}}>Drag fields to columns to pivot the report</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:14}}>
            <div style={{padding:14,background:"#fafbfd",borderRadius:6,border:"1px solid #e6e8ec"}}>
              <p style={{margin:0,fontSize:11,fontWeight:700,color:"#c2a04a",textTransform:"uppercase"}}>Available Fields</p>
              <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>{["Branch","Product","Customer","Consultant","Month","Quarter","Cost Center","Currency"].map(f=><span key={f} style={{padding:"5px 10px",background:"#fff",border:"1px solid #e6e8ec",borderRadius:4,fontSize:11,cursor:"grab"}}>⋮⋮ {f}</span>)}</div>
            </div>
            <div style={{padding:14,background:"#1a1c22",borderRadius:6}}>
              <p style={{margin:0,fontSize:11,fontWeight:700,color:"#c2a04a",textTransform:"uppercase"}}>Active Group Columns (in order)</p>
              <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>{["Branch","Product"].map((f,i)=><span key={f} style={{padding:"5px 10px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:4,fontSize:11,fontWeight:700,cursor:"grab"}}>{i+1}. {f} ×</span>)}</div>
              <p style={{margin:"14px 0 0",fontSize:10.5,color:"#fff",opacity:0.7}}>Report will be grouped: <b style={{color:"#c2a04a"}}>Branch → Product</b></p>
            </div>
          </div>
        </>
      )}
      {tab==="sort"&&tabPanel(
        <div>
          {[{c:"Revenue",d:"DESC",p:1},{c:"Branch",d:"ASC",p:2}].map((s,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"40px 1fr 120px 80px",gap:10,alignItems:"center",padding:"10px 12px",background:"#fafbfd",borderRadius:6,marginBottom:8,border:"1px solid #e6e8ec"}}><span style={{padding:"4px 10px",background:"#c2a04a",color:"#1a1c22",borderRadius:3,fontSize:11,fontWeight:700,textAlign:"center"}}>{s.p}</span><select defaultValue={s.c} style={inpStd}><option>Revenue</option><option>Branch</option><option>Customer</option><option>Date</option><option>Amount</option></select><select defaultValue={s.d} style={inpStd}><option>ASC</option><option>DESC</option></select><button style={{padding:"6px 10px",background:"transparent",border:"1px solid #dc2626",color:"#dc2626",borderRadius:4,fontSize:11,cursor:"pointer",fontWeight:600}}>Remove</button></div>))}
          <button style={{padding:"7px 14px",background:"transparent",border:"1px dashed #c2a04a",color:"#c2a04a",borderRadius:5,fontSize:11.5,cursor:"pointer",fontWeight:600}}>+ Add sort level</button>
        </div>
      )}
      {tab==="compare"&&tabPanel(
        <>
          <div style={{padding:14,background:"#fafbfd",borderRadius:6,border:"1px solid #e6e8ec",marginBottom:14}}>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}><input type="checkbox" defaultChecked/><span style={{fontSize:12.5,fontWeight:600}}>Show comparison column</span></label>
            <div style={{marginTop:10,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
              <FL label="Compare to"><select style={inpStd}><option>Previous Period (Apr 2026)</option><option>Same period last year (May 2025)</option><option>Budget</option><option>Forecast</option><option>Custom period</option></select></FL>
              <FL label="Show variance as"><select style={inpStd}><option>Both Absolute &amp; %</option><option>Absolute only</option><option>% only</option></select></FL>
            </div>
          </div>
          <div style={cardStyle}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22",marginBottom:10}}>Preview with Comparison</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead style={{background:"#f7f8fb"}}><tr><th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#5b616e",fontWeight:700}}>Particulars</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5b616e",fontWeight:700}}>May 2026</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5b616e",fontWeight:700}}>Apr 2026</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5b616e",fontWeight:700}}>Δ</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5b616e",fontWeight:700}}>%Δ</th></tr></thead>
              <tbody><tr><td style={{padding:"8px 12px",fontWeight:600}}>Revenue</td><td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace"}}>₹268L</td><td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace",color:"#5b616e"}}>₹242L</td><td style={{padding:"8px 12px",textAlign:"right",color:"#16a34a",fontWeight:700}}>+₹26L</td><td style={{padding:"8px 12px",textAlign:"right",color:"#16a34a",fontWeight:700}}>+10.7%</td></tr></tbody>
            </table>
          </div>
        </>
      )}
      {tab==="format"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:14}}>
          <div style={{padding:14,background:"#fafbfd",borderRadius:6,border:"1px solid #e6e8ec"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#c2a04a",textTransform:"uppercase"}}>Visible Columns</p>
            <div style={{marginTop:10}}>{["Particulars","Amount","% of Revenue","Variance","Notes","Last Updated"].map(c=>(<label key={c} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",cursor:"pointer"}}><input type="checkbox" defaultChecked={["Particulars","Amount","Variance"].includes(c)}/><span style={{fontSize:11.5}}>{c}</span></label>))}</div>
          </div>
          <div style={{padding:14,background:"#fafbfd",borderRadius:6,border:"1px solid #e6e8ec"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#c2a04a",textTransform:"uppercase"}}>Number Format</p>
            <div style={{marginTop:10,display:"grid",gap:10}}>
              <FL label="Display Unit"><select style={inpStd}><option>Lakhs (L)</option><option>Crores (Cr)</option><option>Actual</option><option>Thousands (K)</option></select></FL>
              <FL label="Decimals"><select style={inpStd}><option>0</option><option>1</option><option>2</option></select></FL>
              <FL label="Currency Symbol"><select style={inpStd}>{ACTIVE_CURRENCIES.map(c=><option key={c}>{`${CURRENCY_META[c].symbol} (${c})`}</option>)}<option>None</option></select></FL>
              <FL label="Negative Display"><select style={inpStd}><option>(brackets)</option><option>-prefix</option><option>red color</option></select></FL>
            </div>
          </div>
        </div>
      )}
      {tab==="export"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,150px),1fr))",gap:12}}>
          {[{n:"PDF",ic:"📄",d:"Print-ready report with letterhead",c:"#dc2626"},{n:"Excel",ic:"📊",d:"Editable with formulas preserved",c:"#16a34a"},{n:"CSV",ic:"📋",d:"Plain tabular for analysis tools",c:"#5b616e"},{n:"JSON",ic:"{ }",d:"For API/integration consumption",c:"#6B4C8B"},{n:"Word",ic:"📝",d:"Formatted report for editing",c:"#1a1c22"},{n:"HTML",ic:"🌐",d:"Email-friendly with styling",c:"#c2a04a"},{n:"Image (PNG)",ic:"🖼️",d:"Snapshot of chart/table",c:"#d97706"},{n:"ZIP",ic:"📦",d:"Multi-format bundle",c:"#2F7A8E"}].map(f=>(<button key={f.n} style={{padding:18,background:"#fff",border:"1px solid #e6e8ec",borderRadius:8,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,borderTop:"3px solid "+f.c}}><span style={{fontSize:30}}>{f.ic}</span><span style={{fontWeight:700,fontSize:12.5,color:"#1a1c22"}}>{f.n}</span><span style={{fontSize:10,color:"#5b616e",textAlign:"center"}}>{f.d}</span></button>))}
        </div>
      )}
      {tab==="schedule"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:14}}>
          <div style={{padding:14,background:"#fafbfd",borderRadius:6,border:"1px solid #e6e8ec"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#c2a04a",textTransform:"uppercase"}}>Setup Auto-Email</p>
            <div style={{marginTop:14,display:"grid",gap:10}}>
              <FL label="Frequency"><select style={inpStd}><option>Daily (9 AM)</option><option>Weekly (Monday 9 AM)</option><option>Monthly (1st of month)</option><option>Quarterly</option><option>Custom CRON</option></select></FL>
              <FL label="Recipients (comma-separated)"><input defaultValue="afshin@travkings.com, faiz.fm@travkings.com" style={inpStd}/></FL>
              <FL label="Format"><div style={{display:"flex",gap:8}}>{["PDF","Excel","Both"].map(f=><label key={f} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",border:"1px solid #e6e8ec",borderRadius:5,cursor:"pointer"}}><input type="radio" name="fmt" defaultChecked={f==="PDF"}/><span style={{fontSize:11.5}}>{f}</span></label>)}</div></FL>
              <FL label="Subject Template"><input defaultValue="P&L Report — {{period}} — Travkings" style={{...inpStd,fontFamily:"monospace",fontSize:11}}/></FL>
              <button style={{marginTop:6,padding:"9px 18px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Schedule This Report</button>
            </div>
          </div>
          <div style={cardStyle}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22",marginBottom:10}}>Active Schedules</p>
            {[{n:"Monthly P&L",f:"Monthly",r:"Director, Sr.FM"},{n:"Weekly Cash",f:"Weekly",r:"Sr.FM"}].map(s=>(<div key={s.n} style={{padding:"8px 0",borderBottom:"1px solid #f0f2f7"}}><p style={{margin:0,fontSize:11.5,fontWeight:600,color:"#1a1c22"}}>{s.n}</p><p style={{margin:"2px 0 0",fontSize:10,color:"#5b616e"}}>{s.f} · to {s.r}</p></div>))}
          </div>
        </div>
      )}
      {tab==="share"&&tabPanel(
        <div style={{maxWidth:600}}>
          <p style={{margin:"0 0 14px",fontSize:11.5,color:"#5b616e"}}>Generate a shareable link to this report view. Recipients can view but not edit. Link expires per policy.</p>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <input defaultValue="https://kbiz360.travkings.com/share/PL-202605-x8aN2qP" readOnly style={{...inpStd,fontFamily:"monospace",fontSize:11,background:"#fafbfd"}}/>
            <button style={{padding:"9px 14px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:6,fontSize:11.5,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>📋 Copy</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
            <FL label="Expires in"><select style={inpStd}><option>24 hours</option><option>7 days</option><option>30 days</option><option>Never</option></select></FL>
            <FL label="Access"><select style={inpStd}><option>View only</option><option>View + Comment</option><option>Password-protected</option></select></FL>
          </div>
          <div style={{marginTop:14,padding:10,background:"#fbeedb",border:"1px solid #fde68a",borderRadius:6}}><p style={{margin:0,fontSize:11,color:"#d97706"}}><b>Note:</b> Shared links honor data scope of the user creating them. External recipients will see only what you can see.</p></div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   5. EMPLOYEE MASTER (10 tabs) — Faiz Patel demo
   ════════════════════════════════════════════════════════════════════ */


export function CustomReportBuilder(){
  return <NotWired title="Custom Report Builder" note="The custom report builder isn't connected to a live query engine yet, so it can't run against the books. It will be enabled once the report-builder service is available."/>;
}
function _CustomReportBuilder_legacy(){
  const [selected,setSelected]=useState(["Branch","Revenue","GP","GP %","Bookings"]);
  const [filters,setFilters]=useState([
    {id:1,field:"Period (Month)",op:"=",val:"May 2026"},
    {id:2,field:"Branch",op:"=",val:"BOM"},
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
    {Branch:"AMD",Revenue:"₹1.42Cr",GP:"₹24.8L","GP %":"17.5%",Bookings:84},
  ];

  return(
    <PHASE2_Page title="Custom Report Builder"
      subtitle="Select fields · add filters · reorder columns · save as a named view">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:14,marginBottom:14}}>
        {/* Field catalog */}
        <div style={{background:"#fff",border:"1px solid #e6e8ec",borderRadius:8,overflow:"hidden",maxHeight:520,overflowY:"auto"}}>
          <p style={{margin:0,padding:"10px 12px",fontSize:12,fontWeight:700,color:"#1a1c22",borderBottom:"1px solid #e6e8ec",background:"#fafbfd"}}>Available Fields</p>
          {Object.entries(BUILDER_FIELD_CATALOG).map(([cat,fields])=>(
            <div key={cat}>
              <p style={{margin:0,padding:"6px 12px",fontSize:10,fontWeight:700,color:"#5b616e",textTransform:"uppercase",letterSpacing:"0.4px",background:"#f7f8fb"}}>{cat}</p>
              {fields.map(f=>(
                <div key={f} {...clickable(()=>addField(f))} style={{padding:"7px 12px",fontSize:11.5,cursor:"pointer",color:selected.includes(f)?"#5b616e":"#1a1c22",background:selected.includes(f)?"#f0f2f7":"#fff",borderBottom:"1px solid #f7f8fb",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                  onMouseEnter={e=>{if(!selected.includes(f))e.currentTarget.style.background="#fff8e8";}}
                  onMouseLeave={e=>{if(!selected.includes(f))e.currentTarget.style.background="#fff";}}>
                  {f}
                  {selected.includes(f)?<span style={{fontSize:9,color:"#5b616e"}}>added</span>:<span style={{fontSize:13,color:"#c2a04a"}}>+</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Builder canvas */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Selected columns */}
          <div style={{background:"#fff",border:"1px solid #e6e8ec",borderRadius:8,overflow:"hidden"}}>
            <p style={{margin:0,padding:"10px 14px",fontSize:12,fontWeight:700,color:"#1a1c22",borderBottom:"1px solid #e6e8ec",background:"#fafbfd"}}>Selected Columns ({selected.length}) — click + to add from catalog, drag to reorder</p>
            <div style={{padding:12,display:"flex",flexWrap:"wrap",gap:8,minHeight:52}}>
              {selected.map((f,i)=>(
                <div key={f} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 8px",background:"#1a1c22",borderRadius:5,fontSize:11.5,color:"#fff",fontWeight:600}}>
                  <span style={{cursor:"pointer",color:"#5b616e",fontSize:12}} {...clickable(()=>moveField(f,-1))}>◀</span>
                  <span>{f}</span>
                  <span style={{cursor:"pointer",color:"#5b616e",fontSize:12}} {...clickable(()=>moveField(f,1))}>▶</span>
                  <span {...clickable(()=>removeField(f))} style={{cursor:"pointer",color:"#d97706",marginLeft:4,fontSize:13,fontWeight:700}}>×</span>
                </div>
              ))}
              {selected.length===0&&<p style={{margin:0,fontSize:11.5,color:"#5b616e"}}>Click fields from the catalog to add them here →</p>}
            </div>
          </div>

          {/* Filters */}
          <div style={{background:"#fff",border:"1px solid #e6e8ec",borderRadius:8,overflow:"hidden"}}>
            <div style={{padding:"10px 14px",borderBottom:"1px solid #e6e8ec",background:"#fafbfd",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <p style={{margin:0,fontSize:12,fontWeight:700,color:"#1a1c22"}}>Filters ({filters.length})</p>
              <button onClick={addFilter} style={{padding:"4px 10px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:4,fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add Filter</button>
            </div>
            <div style={{padding:12,display:"flex",flexDirection:"column",gap:8}}>
              {filters.map(f=>(
                <div key={f.id} style={{display:"flex",alignItems:"center",gap:8}}>
                  <select defaultValue={f.field} style={{padding:"6px 8px",border:"1px solid #e6e8ec",borderRadius:5,fontSize:11.5,flex:2}}>
                    {Object.values(BUILDER_FIELD_CATALOG).flat().map(x=><option key={x}>{x}</option>)}
                  </select>
                  <select defaultValue={f.op} style={{padding:"6px 8px",border:"1px solid #e6e8ec",borderRadius:5,fontSize:11.5,flex:1}}>
                    {ops.map(o=><option key={o}>{o}</option>)}
                  </select>
                  <input defaultValue={f.val} style={{padding:"6px 8px",border:"1px solid #e6e8ec",borderRadius:5,fontSize:11.5,flex:2}} placeholder="Value…"/>
                  <button onClick={()=>removeFilter(f.id)} style={{padding:"5px 8px",background:"transparent",border:"1px solid #fbe9e9",color:"#dc2626",borderRadius:4,fontSize:12,fontWeight:700,cursor:"pointer"}}>✕</button>
                </div>
              ))}
              {filters.length===0&&<p style={{margin:0,fontSize:11.5,color:"#5b616e"}}>No filters — report will show all data</p>}
            </div>
          </div>

          {/* Save bar */}
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input value={viewName} onChange={e=>{setViewName(e.target.value);setSaved(false);}} placeholder="Name this report view…" style={{flex:1,padding:"8px 11px",border:"1px solid #e6e8ec",borderRadius:6,fontSize:12.5}}/>
            <button onClick={()=>setSaved(true)} style={{padding:"8px 18px",background:"#1a1c22",color:"#c2a04a",border:"none",borderRadius:6,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>💾 Save View</button>
            {saved&&<span style={{fontSize:11.5,color:"#16a34a",fontWeight:700}}>✓ Saved to My Views</span>}
          </div>
        </div>
      </div>

      {/* Preview */}
      {selected.length>0&&(
        <div style={{background:"#fff",border:"1px solid #e6e8ec",borderRadius:8,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:"1px solid #e6e8ec",background:"#fafbfd",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:"#1a1c22"}}>Preview — {viewName} (sample data)</p>
            <ExportDropdown/>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr>{selected.map(f=><th key={f} style={RPT_thStyle}>{f}</th>)}</tr></thead>
              <tbody>{previewData.map((row,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #f0f2f7"}}>
                  {selected.map(f=><td key={f} style={RPT_tdStyle}>{row[f]??<span style={{color:"#5b616e"}}>—</span>}</td>)}
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
  return <NotWired title="Saved Report Views" note="Saved report views aren't available yet — there's no saved-views service connected to store or run them."/>;
}
function _SavedReportViews_legacy(){
  const [filter,setFilter]=useState("ALL");
  const types=["ALL","Profitability","Financial","Operational","Compliance"];
  const filtered=filter==="ALL"?SAVED_VIEWS_DATA:SAVED_VIEWS_DATA.filter(v=>v.type===filter);
  return(
    <PHASE2_Page title="Saved Report Views"
      subtitle="Your saved custom reports · quick-launch · clone · schedule"
      toolbar={<button style={{padding:"8px 16px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ New Report</button>}>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {types.map(t=>(
          <button key={t} onClick={()=>setFilter(t)} style={{padding:"6px 14px",border:filter===t?"2px solid #1a1c22":"1px solid #e6e8ec",background:filter===t?"#1a1c22":"#fff",color:filter===t?"#c2a04a":"#5b616e",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>{t}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,340px),1fr))",gap:12}}>
        {filtered.map(v=>(
          <div key={v.id} style={{background:"#fff",border:"1px solid #e6e8ec",borderRadius:8,padding:14}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:22}}>{v.icon}</span>
                <div>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22"}}>{v.name}</p>
                  <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>{v.type} · {v.fields.length} columns</p>
                </div>
              </div>
              {v.scheduled&&<span style={{padding:"2px 8px",background:"#e8f6ed",color:"#16a34a",borderRadius:3,fontSize:10,fontWeight:700}}>⏰ {v.schedFreq}</span>}
            </div>
            <div style={{marginBottom:10}}>
              <p style={{margin:"0 0 4px",fontSize:10,color:"#5b616e",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.3px"}}>Fields</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {v.fields.map(f=><span key={f} style={{padding:"2px 7px",background:"#e6e8ec",borderRadius:3,fontSize:10.5,color:"#1a1c22"}}>{f}</span>)}
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <p style={{margin:"0 0 4px",fontSize:10,color:"#5b616e",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.3px"}}>Filters</p>
              {v.filters.map((f,i)=><p key={i} style={{margin:0,fontSize:10.5,color:"#5b616e"}}>• {f}</p>)}
            </div>
            <div style={{fontSize:10.5,color:"#5b616e",marginBottom:12,display:"flex",justifyContent:"space-between"}}>
              <span>By {v.owner}</span>
              <span>Last run {v.lastRun.split(" ")[0]}</span>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button style={{flex:1,padding:"6px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>▶ Run</button>
              <button style={{padding:"6px 10px",background:"transparent",border:"1px solid #e6e8ec",color:"#5b616e",borderRadius:5,fontSize:11,cursor:"pointer"}}>Edit</button>
              <button style={{padding:"6px 10px",background:"transparent",border:"1px solid #e6e8ec",color:"#5b616e",borderRadius:5,fontSize:11,cursor:"pointer"}}>Clone</button>
              <button style={{padding:"6px 10px",background:"transparent",border:"1px solid #e6e8ec",color:"#5b616e",borderRadius:5,fontSize:11,cursor:"pointer"}}>⏰</button>
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
  return <NotWired title="Scheduled Reports" note="Scheduled report delivery isn't available yet — no scheduling or email service is connected. Email/recipient counts are not shown until it's live."/>;
}
function _ScheduledReports_legacy(){
  const [schedules,setSchedules]=useState(SCHEDULED_REPORTS_DATA);
  const toggleStatus=id=>setSchedules(s=>s.map(r=>r.id===id?{...r,status:r.status==="Active"?"Paused":"Active"}:r));
  const activeCount=schedules.filter(s=>s.status==="Active").length;
  const inp={padding:"7px 10px",border:"1px solid #e6e8ec",borderRadius:5,fontSize:12,width:"100%"};

  return(
    <PHASE2_Page title="Scheduled Email Reports"
      subtitle="Auto-send reports by email · daily, weekly, monthly · PDF or Excel"
      toolbar={<button style={{padding:"8px 16px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ New Schedule</button>}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,150px),1fr))",gap:12,marginBottom:14}}>
        {[{l:"Active Schedules",v:activeCount,c:"#16a34a"},{l:"Paused",v:schedules.length-activeCount,c:"#5b616e"},{l:"Emails Sent Today",v:3,c:"#c2a04a"},{l:"Total Recipients",v:7,c:"#2563eb"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10.5,color:"#5b616e",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"5px 0 0",fontSize:22,fontWeight:700,color:"#1a1c22"}}>{k.v}</p></div>
        ))}
      </div>

      <div style={{background:"#fff",border:"1px solid #e6e8ec",borderRadius:8,overflow:"hidden",marginBottom:14}}>
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
              <td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:"#e6e8ec",borderRadius:3,fontSize:10.5,fontWeight:700}}>{s.freq}</span></td>
              <td style={{...RPT_tdStyle,fontSize:11}}>{s.day} · {s.time}</td>
              <td style={RPT_tdStyle}>
                <p style={{margin:0,fontSize:11}}>{s.recipients[0]}</p>
                {s.recipients.length>1&&<p style={{margin:0,fontSize:10,color:"#5b616e"}}>+{s.recipients.length-1} more</p>}
              </td>
              <td style={RPT_tdStyle}><span style={{padding:"2px 7px",background:"#e6e8ec",borderRadius:3,fontSize:10.5,fontWeight:600}}>{s.format}</span></td>
              <td style={{...RPT_tdStyle,fontSize:11,color:"#5b616e"}}>{s.lastSent.split(" ")[0]}</td>
              <td style={{...RPT_tdStyle,fontSize:11,color:"#c2a04a",fontWeight:600}}>{s.nextRun.split(" ")[0]}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}>
                <span style={{padding:"3px 10px",borderRadius:3,fontSize:10.5,fontWeight:700,background:s.status==="Active"?"#e8f6ed":"#e2e3e5",color:s.status==="Active"?"#16a34a":"#383d41"}}>{s.status}</span>
              </td>
              <td style={{padding:"6px 12px",textAlign:"center",borderBottom:"1px solid #f0f2f7"}}>
                <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                  <button onClick={()=>toggleStatus(s.id)} style={{padding:"3px 8px",background:"transparent",border:"1px solid "+(s.status==="Active"?"#d97706":"#16a34a"),color:s.status==="Active"?"#d97706":"#16a34a",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>{s.status==="Active"?"Pause":"Resume"}</button>
                  <button style={{padding:"3px 8px",background:"transparent",border:"1px solid #e6e8ec",color:"#5b616e",borderRadius:3,fontSize:10,fontWeight:600,cursor:"pointer"}}>Edit</button>
                  <button style={{padding:"3px 8px",background:"#c2a04a",border:"none",color:"#1a1c22",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>▶ Now</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {/* Add new schedule form */}
      <div style={{background:"#fff",border:"1px solid #e6e8ec",borderRadius:8,padding:16}}>
        <p style={{margin:"0 0 12px",fontSize:12.5,fontWeight:700,color:"#1a1c22"}}>Add New Schedule</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,140px),1fr))",gap:10,marginBottom:10}}>
          <div><label style={{fontSize:10.5,color:"#5b616e",fontWeight:700,display:"block",marginBottom:3}}>Report</label><select style={inp}>{SAVED_VIEWS_DATA.map(v=><option key={v.id}>{v.name}</option>)}</select></div>
          <div><label style={{fontSize:10.5,color:"#5b616e",fontWeight:700,display:"block",marginBottom:3}}>Frequency</label><select style={inp}><option>Daily</option><option>Weekly</option><option>Monthly</option></select></div>
          <div><label style={{fontSize:10.5,color:"#5b616e",fontWeight:700,display:"block",marginBottom:3}}>Send Time</label><input type="time" defaultValue="08:00" style={inp}/></div>
          <div><label style={{fontSize:10.5,color:"#5b616e",fontWeight:700,display:"block",marginBottom:3}}>Format</label><select style={inp}><option>PDF</option><option>Excel</option><option>CSV</option></select></div>
        </div>
        <div style={{marginBottom:10}}><label style={{fontSize:10.5,color:"#5b616e",fontWeight:700,display:"block",marginBottom:3}}>Recipients (comma-separated emails)</label><input style={inp} placeholder="faiz.fm@travkings.com, afshin@travkings.com"/></div>
        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <button style={{padding:"8px 18px",background:"#1a1c22",color:"#c2a04a",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Create Schedule</button>
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
  return <NotWired title="Report Meta Features" note="This screen demonstrates report meta-features (comparatives, sparklines, drill-downs) and isn't wired to live data."/>;
}
function _ReportsMetaDemo_legacy(){
  const [showComparative,setShowComparative]=useState(true);
  const [showSparklines,setShowSparklines]=useState(true);
  const [drillData,setDrillData]=useState(null);

  return(
    <PHASE2_Page title="Reports Meta Features — Live Demo"
      subtitle="All 4 meta features working together: comparative columns · sparklines · drill-down · multi-format export">

      {drillData&&<DrillModal branch={drillData.branch} metric={drillData.metric} value={drillData.value} onClose={()=>setDrillData(null)}/>}

      {/* Feature toggles */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"12px 16px",background:"#fff",border:"1px solid #e6e8ec",borderRadius:8,flexWrap:"wrap"}}>
        <p style={{margin:0,fontSize:11.5,fontWeight:700,color:"#1a1c22",marginRight:4}}>Active features:</p>
        {[{key:"comp",label:"Comparative columns",state:showComparative,toggle:()=>setShowComparative(v=>!v)},
          {key:"spark",label:"Sparkline charts",state:showSparklines,toggle:()=>setShowSparklines(v=>!v)},
        ].map(f=>(
          <label key={f.key} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",padding:"5px 10px",borderRadius:5,background:f.state?"#fff8e8":"#f7f8fb",border:"1px solid "+(f.state?"#c2a04a":"#e6e8ec")}}>
            <input type="checkbox" checked={f.state} onChange={f.toggle}/>
            <span style={{fontSize:11.5,fontWeight:600,color:f.state?"#1a1c22":"#5b616e"}}>{f.label}</span>
          </label>
        ))}
        <span style={{padding:"5px 10px",background:"#e8f6ed",border:"1px solid #bbf7d0",borderRadius:5,fontSize:11.5,fontWeight:600,color:"#16a34a"}}>✓ Drill-down on (click any ₹ value)</span>
        <div style={{marginLeft:"auto"}}><ExportDropdown/></div>
      </div>

      {/* The report */}
      <div style={{background:"#fff",border:"1px solid #e6e8ec",borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",background:"#1a1c22",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{margin:0,fontSize:13,fontWeight:700}}>Branch Revenue Report</p>
            <p style={{margin:"1px 0 0",fontSize:10.5,color:"#c2a04a"}}>May 2026 {showComparative?"· vs May 2025":""}</p>
          </div>
          <span style={{fontSize:10.5,color:"#5b616e"}}>Click any highlighted value to drill down ↗</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#f7f8fb"}}>
                <th style={RPT_thStyle}>Branch</th>
                <th style={{...RPT_thStyle,textAlign:"right"}}>Revenue (May-26)</th>
                {showComparative&&<><th style={{...RPT_thStyle,textAlign:"right",color:"#5b616e"}}>Revenue (May-25)</th><th style={{...RPT_thStyle,textAlign:"right"}}>Variance</th><th style={{...RPT_thStyle,textAlign:"right"}}>YoY %</th></>}
                <th style={{...RPT_thStyle,textAlign:"right"}}>Gross Profit</th>
                {showComparative&&<><th style={{...RPT_thStyle,textAlign:"right",color:"#5b616e"}}>GP (May-25)</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP Var %</th></>}
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
                    <td style={{...RPT_tdStyle,fontWeight:700}}><span style={{padding:"2px 7px",background:"#1a1c22",color:"#c2a04a",borderRadius:3,fontSize:10.5,fontWeight:700}}>{r.branch}</span></td>
                    <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>
                      <span {...clickable(()=>setDrillData({branch:r.branch,metric:"Revenue",value:r.cy_rev}))}
                        style={{cursor:"pointer",color:"#1a1c22",textDecoration:"underline",textDecorationStyle:"dotted",textDecorationColor:"#c2a04a"}}>
                        {fmtINR(r.cy_rev)}
                      </span>
                    </td>
                    {showComparative&&<>
                      <td style={{...RPT_tdStyle,textAlign:"right",color:"#5b616e"}}>{fmtINR(r.ly_rev)}</td>
                      <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:revVar>=0?"#16a34a":"#dc2626"}}>{revVar>=0?"+":""}{fmtINR(Math.abs(revVar))}</td>
                      <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:parseFloat(revPct)>=0?"#16a34a":"#dc2626"}}>{revPct!=="—"?(revPct>=0?"+":"")+revPct+"%":"—"}</td>
                    </>}
                    <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>
                      <span {...clickable(()=>setDrillData({branch:r.branch,metric:"Gross Profit",value:r.cy_gp}))}
                        style={{cursor:"pointer",color:"#16a34a",textDecoration:"underline",textDecorationStyle:"dotted",textDecorationColor:"#16a34a"}}>
                        {fmtINR(r.cy_gp)}
                      </span>
                    </td>
                    {showComparative&&<>
                      <td style={{...RPT_tdStyle,textAlign:"right",color:"#5b616e"}}>{fmtINR(r.ly_gp)}</td>
                      <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:parseFloat(gpPct)>=0?"#16a34a":"#dc2626"}}>{gpPct!=="—"?(gpPct>=0?"+":"")+gpPct+"%":"—"}</td>
                    </>}
                    {showSparklines&&(
                      <td style={{...RPT_tdStyle,textAlign:"center"}}>
                        <Sparkline values={r.sparkline} color={i%2===0?"#c2a04a":"#16a34a"}/>
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
                  <tr style={{background:"#fafbfd",borderTop:"2px solid #1a1c22",fontWeight:700}}>
                    <td style={{...RPT_tdStyle,fontWeight:700,fontSize:12.5}}>TOTAL</td>
                    <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,fontSize:13,fontFamily:"monospace"}}>{fmtINR(totCY)}</td>
                    {showComparative&&<>
                      <td style={{...RPT_tdStyle,textAlign:"right",color:"#5b616e"}}>{fmtINR(totLY)}</td>
                      <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#16a34a"}}>+{fmtINR(totVar)}</td>
                      <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#16a34a"}}>+{totPct}%</td>
                    </>}
                    <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,fontSize:13,fontFamily:"monospace",color:"#16a34a"}}>{fmtINR(totGPCY)}</td>
                    {showComparative&&<>
                      <td style={{...RPT_tdStyle,textAlign:"right",color:"#5b616e"}}>{fmtINR(totGPLY)}</td>
                      <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#16a34a"}}>+{gpPct}%</td>
                    </>}
                    {showSparklines&&<td style={RPT_tdStyle}/>}
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
        <div style={{padding:"8px 14px",background:"#fafbfd",borderTop:"1px solid #e6e8ec",fontSize:10.5,color:"#5b616e",display:"flex",gap:16}}>
          {showComparative&&<span>📊 Comparative mode ON — showing May-26 vs May-25</span>}
          {showSparklines&&<span>✦ Sparklines show 12-month revenue trend (Jun-25 to May-26)</span>}
          <span>↗ Dotted-underline values are drill-down enabled</span>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAX SUMMARY — GST / VAT RETURN VIEW (live, branch-regime-aware)
   Output − Input tax (net payable to the authority) + withholding (WHT/TDS)
   + TCS, from the double-entry engine. VAT branches (Africa) show VAT;
   India branches show GST. GET /api/accounting/tax-summary.
   ════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════
   HR & PAYROLL — SELF-SERVICE (9 screens)
   ════════════════════════════════════════════════════════════════════ */

/* ── HR seed data ─────────────────────────────────────────────────── */

