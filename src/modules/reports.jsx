/* ════════════════════════════════════════════════════════════════════
   MODULES/REPORTS.JSX
   Auto-generated from KBiz360_v2.jsx · 3434 lines · 29 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from 'react';
import { Download, Printer, Save, Search } from 'lucide-react';
import { Bar, Legend, Line } from 'recharts';
import { exportToCSV } from '../core/business-logic';
import { exportToExcel } from '../core/exportExcel';
import { ACTIVE_CURRENCIES, BRANCHES, BRANCH_CODES, CURRENCY_META, MODULE_ICONS, CONSOLIDATED_LABEL } from '../core/data';
import { useExpenseLedgers, useFiscalYears, useExpenseBudgets } from '../core/useReference';
import { useBalanceSheet, useGpBills, useModulePL, useAgeing, useTaxSummary, useLedgerStatement, useBudgetVsActual } from '../core/useAccounting';
import { fmt, fmtINR } from '../core/format';
import { CUR_MONTH, CUR_FY, MONTH_OPTIONS, PERIOD_OPTIONS, FY_MONTHS, FY_YTD_MONTHS, ALL_TIME_FROM, todayISO, fmtDate, rangeNote, monthLabel, prevMonthKey, presetRange, fyQuarterKey } from '../core/dates';
import { periodRange } from '../core/period';
import { ReportDateBar, ReportSearch, matchNeedle, resolveReportRange, priorYearRange } from '../core/reportDateBar';
import { BUILDER_FIELD_CATALOG, DEMO_REPORT_DATA, DrillModal, ExportDropdown, GRP_COLORS, PKG_D, PKG_SC, PackagePnL, SAVED_VIEWS_DATA, SCHEDULED_REPORTS_DATA, Sparkline, TAB_Page, cardStyle, tabPanel } from '../core/helpers';
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
          <button onClick={()=>window.print()} style={{...btnG,display:"flex",alignItems:"center",gap:5}}><Download size={13}/> Export</button>
        </div>
      </div>
      {children}
    </div>
  );
}

/* Honest placeholder for report screens that have no live backend yet. Shown
   instead of hardcoded/fabricated demo figures, so the books are never
   misrepresented. The original prototype body is retained below each as a
   dead `_*_legacy` function for future wiring. */
export function NotWired({title,note}){
  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"46px 22px",textAlign:"center"}}>
        <div style={{fontSize:38,marginBottom:10}}>🚧</div>
        <h2 style={{margin:"0 0 8px",fontSize:16,fontWeight:800,color:"#0d1326"}}>{title}</h2>
        <p style={{margin:"0 auto",fontSize:12,color:"#5a6691",maxWidth:480,lineHeight:1.55}}>{note}</p>
      </div>
    </div>
  );
}

export function ReportCF({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [period,setPeriod]=useState(CUR_MONTH);
  const PERIODS=MONTH_OPTIONS;

  // LIVE indirect cash flow — derived from two double-entry Balance Sheet
  // snapshots (opening = end of prior month, closing = end of selected month)
  // plus the period's Module P&L. No fabricated ratios; empty books → empty state.
  const monthEnd=(key)=>{const[y,m]=String(key).split("-").map(Number);const last=new Date(y,m,0).getDate();return `${key}-${String(last).padStart(2,"0")}`;};
  const to=monthEnd(period);
  const openTo=monthEnd(prevMonthKey(period));
  const qPL=useModulePL(branch,{from:`${period}-01`,to});
  const qC=useBalanceSheet(branch,{to});
  const qO=useBalanceSheet(branch,{to:openTo});
  const loading=qPL.isLoading||qC.isLoading||qO.isLoading;
  const errored=qPL.isError||qC.isError||qO.isError;

  const gmap=d=>{const m={};[...(d?.assets||[]),...(d?.liabilities||[])].forEach(x=>{m[x.group]=(m[x.group]||0)+(x.amount||0);});return m;};
  const C=gmap(qC.data), O=gmap(qO.data);
  const g=(m,k)=>m[k]||0;
  const cashOf=m=>g(m,"Bank Accounts")+g(m,"Cash-in-Hand");

  const netProfit=qPL.data?qPL.data.bridge.netProfit||0:0;
  const depn=qPL.data?(((qPL.data.indirect&&qPL.data.indirect.groups)||[]).filter(x=>/deprec|amortis|amortiz/i.test(x.name)).reduce((s,x)=>s+(x.amount||0),0)):0;

  const dRecv=g(C,"Sundry Debtors")-g(O,"Sundry Debtors");
  const dPay =g(C,"Sundry Creditors")-g(O,"Sundry Creditors");
  const dInv =g(C,"Stock-in-Hand")-g(O,"Stock-in-Hand");
  const dFA  =(g(C,"Fixed Assets")+g(C,"Investments"))-(g(O,"Fixed Assets")+g(O,"Investments"));
  const dCap =g(C,"Capital Account")-g(O,"Capital Account");
  const dBorrow=(g(C,"Loans (Liability)")+g(C,"Bank OD Accounts"))-(g(O,"Loans (Liability)")+g(O,"Bank OD Accounts"));

  const operatingCF=netProfit+depn-dRecv+dPay-dInv;
  const investingCF=-dFA;
  const financingCF=dCap+dBorrow;
  const openingCash=cashOf(O);
  const closingCash=cashOf(C);
  const netCF=closingCash-openingCash;                     // actual cash movement (reconciles to the BS)
  const other=netCF-(operatingCF+investingCF+financingCF); // unclassified balancing line

  const sections=[
    {title:"A. OPERATING ACTIVITIES",color:"#185FA5",rows:[
      {l:"Net Profit before tax",v:netProfit},
      {l:"Add: Depreciation & amortisation (non-cash)",v:depn},
      {l:"(Increase) / decrease in trade receivables",v:-dRecv},
      {l:"Increase / (decrease) in trade payables",v:dPay},
      {l:"(Increase) / decrease in inventories",v:-dInv},
      {l:"Net Cash from Operating Activities",v:operatingCF,bold:true,border:true},
    ]},
    {title:"B. INVESTING ACTIVITIES",color:"#27500A",rows:[
      {l:"Net (purchase) / sale of fixed assets & investments",v:investingCF},
      {l:"Net Cash from Investing Activities",v:investingCF,bold:true,border:true},
    ]},
    {title:"C. FINANCING ACTIVITIES",color:"#854F0B",rows:[
      {l:"Change in share / capital account",v:dCap},
      {l:"Change in borrowings",v:dBorrow},
      {l:"Net Cash from Financing Activities",v:financingCF,bold:true,border:true},
    ]},
  ];
  if(Math.abs(other)>=1) sections.push({title:"D. OTHER MOVEMENTS",color:"#5a6691",rows:[
    {l:"Unclassified / other balance movements",v:other,bold:true,border:true},
  ]});

  const f=n=>{const abs=Math.abs(Math.round(n));const s=cur+abs.toLocaleString("en-IN");return n<0?`(${s})`:s;};
  const clr=n=>n>=0?"#27500A":"#A32D2D";
  const hasData=!!qC.data && (Math.abs(closingCash)>0.01||Math.abs(openingCash)>0.01||Math.abs(netProfit)>0.01);

  return (
    <div style={{padding:"12px 10px",maxWidth:900,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Cash Flow Statement</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Indirect method · {monthLabel(period)} · {brCode||CONSOLIDATED_LABEL} · live double-entry</p>
        </div>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
      </div>

      {loading && <div style={{...card,textAlign:"center",color:"#5a6691",fontSize:12.5,padding:"40px 14px"}}>Loading live books…</div>}
      {!loading && errored && <div style={{...card,textAlign:"center",color:"#A32D2D",fontSize:12.5,padding:"40px 14px"}}>Could not load accounting data.</div>}
      {!loading && !errored && !hasData && (
        <div style={{...card,textAlign:"center",padding:"44px 14px"}}>
          <div style={{fontSize:34,marginBottom:8}}>📭</div>
          <h3 style={{margin:"0 0 6px",fontSize:15,color:"#0d1326"}}>No transactions found</h3>
          <p style={{margin:0,fontSize:12,color:"#5a6691"}}>Cash flow is derived from posted vouchers for {monthLabel(period)}. Record transactions to populate this statement.</p>
        </div>
      )}

      {!loading && !errored && hasData && (<>
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
                <td style={{padding:"11px 14px",fontWeight:400,color:"#0d1326"}}>Net Change in Cash</td>
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
        Indirect method from live double-entry: opening vs closing Balance Sheet (Bank + Cash), Net Profit + non-cash items ± working-capital changes.
        Positive = cash generated, Negative (in brackets) = cash used.
      </div>
      </>)}
    </div>
  );
}

export function ReportBranch(){
  const PALETTE=["#185FA5","#854F0B","#27500A","#A32D2D","#5B21B6","#0d7a6b"];
  // LIVE — one row per booking file from the double-entry engine, grouped by
  // branch. No hardcoded branch figures; empty books → empty state.
  const q=useGpBills("ALL",{});
  const bills=q.data||[];
  const BR_D=useMemo(()=>{
    const m={};
    bills.forEach(b=>{const code=b.branch||"—";if(!m[code])m[code]={branch:code,rev:0,gp:0};m[code].rev+=(+b.sell||0);m[code].gp+=((+b.sell||0)-(+b.cost||0));});
    return Object.values(m).map((r,i)=>({...r,gpPct:r.rev>0?+(r.gp/r.rev*100).toFixed(1):0,color:PALETTE[i%PALETTE.length]})).sort((a,b)=>b.rev-a.rev);
  },[bills]);
  const hasData=BR_D.length>0;
  const maxR=Math.max(...BR_D.map(b=>b.rev),1);
  const totR=BR_D.reduce((s,b)=>s+b.rev,0)||1;
  if(q.isLoading) return <RptShell title="Branch Comparison" subtitle="All branches · live double-entry"><div style={{...card,textAlign:"center",color:"#5a6691",fontSize:12.5,padding:"40px 14px"}}>Loading live data…</div></RptShell>;
  if(!hasData) return <RptShell title="Branch Comparison" subtitle="All branches · live double-entry"><div style={{...card,textAlign:"center",padding:"44px 14px"}}><div style={{fontSize:34,marginBottom:8}}>📭</div><h3 style={{margin:"0 0 6px",fontSize:15,color:"#0d1326"}}>No transactions found</h3><p style={{margin:0,fontSize:12,color:"#5a6691"}}>Branch revenue and gross profit appear here once sale/purchase vouchers are posted.</p></div></RptShell>;
  return (
    <RptShell title="Branch Comparison" subtitle="All branches · live from the books">
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
  return <NotWired title="Package P&L" note="File-wise package profitability isn't connected to a live source yet. Once tour packages are linked to their booking files, real P&L per file will appear here."/>;
}
function _ReportPackagePnL_legacy(){
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
  const [periodMode,setPeriodMode]=useState("cfy");        // all|today|week|mtd|qtd|cfy|lfy|month|quarter|custom
  const [periodGran,setPeriodGran]=useState("month");      // month | quarter (Monthly / Quarterly view)
  const [dateFrom,setDateFrom]=useState(CUR_FY.startISO);  // default: FY start → today (year-to-date)
  const [dateTo,setDateTo]=useState(todayISO());
  const [modFilter,setModFilter]=useState("All");
  const [sortCol,setSortCol]=useState("gp");
  const [sortDir,setSortDir]=useState("desc");

  /* ── Live booking-file GP list from the double-entry engine (real data) ──
       One row per file (vouchers sharing a Link No) with module / airline /
       destination / client / supplier / consultant / branch, so every tab below
       is a pure client-side pivot. Empty in → "no data" message (not zeros). */
  const gpQuery=useGpBills(branch,{from:dateFrom||undefined,to:dateTo||undefined});
  const GP_DATA=gpQuery.data||[];

  /* ── Period presets — one shared window map (All / Monthly / Quarterly / YTD) ── */
  const setPeriod=(mode)=>{
    setPeriodMode(mode);
    if(mode==="custom")return;                             // user edits From / To directly
    if(['today','week','mtd','qtd','cfy','lfy'].includes(mode)){ // uniform presets (per-branch FY)
      const r=periodRange(mode,{branch}); setDateFrom(r.from); setDateTo(r.to); setTab("summary"); return;
    }
    const r=presetRange(mode);                             // month | quarter | ytd | all
    setDateFrom(r.from); setDateTo(r.to);
    if(mode==="month"){setPeriodGran("month");setTab("period");}
    else if(mode==="quarter"){setPeriodGran("quarter");setTab("period");}
    else setTab("summary");                                // ytd / all → overview
  };
  const onDate=(setter)=>(e)=>{setter(e.target.value);setPeriodMode("custom");};

  /* ── Filter + enrich bills (server scopes branch+date; client adds module /
       search and a defensive date guard so empty bounds = "no limit") ── */
  const bills=useMemo(()=>{
    const brCode=branch==="ALL"?null:branch?.code;
    const q=search.trim().toLowerCase();
    return GP_DATA
      .filter(b=>(
        (!brCode||b.branch===brCode)&&
        (!dateFrom||b.date>=dateFrom)&&(!dateTo||b.date<=dateTo)&&
        (modFilter==="All"||b.mod===modFilter)&&
        (!q||[b.id,b.client,b.dest,b.airline,b.supplier].some(x=>String(x||"").toLowerCase().includes(q)))
      ))
      .map(b=>({...b,gp:b.sell-b.cost,gpPct:b.sell>0?+((b.sell-b.cost)/b.sell*100).toFixed(1):0}));
  },[GP_DATA,branch,dateFrom,dateTo,modFilter,search]);

  const hasData=!gpQuery.isLoading&&!gpQuery.error&&bills.length>0;

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

  /* ── Monthly buckets — derived from the data in range (no hard-coded months) ── */
  const monthly=useMemo(()=>{
    const map=new Map();
    bills.forEach(b=>{
      const k=String(b.date).slice(0,7);                   // YYYY-MM
      if(!/^\d{4}-\d{2}$/.test(k))return;
      if(!map.has(k))map.set(k,{sell:0,cost:0,count:0});
      const r=map.get(k);r.sell+=b.sell;r.cost+=b.cost;r.count++;
    });
    return [...map.keys()].sort().map(k=>{
      const r=map.get(k),gp=r.sell-r.cost;
      return {key:k,m:monthLabel(k),sell:r.sell,cost:r.cost,gp,gpPct:r.sell>0?+(gp/r.sell*100).toFixed(1):0,count:r.count};
    });
  },[bills]);

  /* ── Quarterly buckets — month rows folded into FY quarters Q1–Q4 ── */
  const quarterly=useMemo(()=>{
    const map=new Map();
    bills.forEach(b=>{
      const k=String(b.date).slice(0,7);
      if(!/^\d{4}-\d{2}$/.test(k))return;
      const q=fyQuarterKey(k);
      if(!map.has(q.label))map.set(q.label,{m:q.label,sort:q.sortKey,sell:0,cost:0,count:0});
      const r=map.get(q.label);r.sell+=b.sell;r.cost+=b.cost;r.count++;
    });
    return [...map.values()].sort((a,b)=>a.sort-b.sort).map(r=>{
      const gp=r.sell-r.cost;
      return {...r,gp,gpPct:r.sell>0?+(gp/r.sell*100).toFixed(1):0};
    });
  },[bills]);

  /* ── Export the current (filtered) bills to Excel / CSV ── */
  const exportBills=()=>{
    exportToExcel(`GP-Report-${dateFrom||"all"}_to_${dateTo||todayISO()}`,
      [{key:"id",label:"Voucher / File"},{key:"date",label:"Date"},{key:"mod",label:"Module"},
       {key:"client",label:"Client"},{key:"dest",label:"Destination"},{key:"airline",label:"Airline"},
       {key:"supplier",label:"Supplier"},{key:"consultant",label:"Consultant"},
       {key:"sell",label:"Revenue"},{key:"cost",label:"Cost"},{key:"gp",label:"Gross Profit"},{key:"gpPct",label:"GP %"}],
      [...bills].sort((a,b)=>b.gp-a.gp));
  };

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
            GP Reports — {branch==="ALL"?CONSOLIDATED_LABEL:branch?.code+" "+branch?.city}
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
          <input type="date" value={dateFrom} onChange={onDate(setDateFrom)}
            style={{...inp,width:130,minHeight:32,fontSize:11}}/>
          <span style={{fontSize:11,color:"#5a6691"}}>to</span>
          <input type="date" value={dateTo} onChange={onDate(setDateTo)}
            style={{...inp,width:130,minHeight:32,fontSize:11}}/>
          <button onClick={exportBills} title="Export to Excel / CSV"
            style={{...btnGh,minHeight:32,fontSize:11,display:"flex",alignItems:"center",gap:5}}>
            <Download size={13}/> Export
          </button>
          <button onClick={()=>window.print()} title="Print / Save as PDF"
            style={{...btnGh,minHeight:32,fontSize:11,display:"flex",alignItems:"center",gap:5}}>
            <Printer size={13}/> Print
          </button>
        </div>
      </div>

      {/* Period presets — All · Monthly · Quarterly · YTD · Custom */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        {[{k:"all",l:"All"},{k:"today",l:"Today"},{k:"week",l:"Week"},{k:"mtd",l:"MTD"},{k:"qtd",l:"QTD"},{k:"cfy",l:"CFY"},{k:"lfy",l:"LFY"},{k:"month",l:"Monthly"},{k:"quarter",l:"Quarterly"},{k:"custom",l:"Custom"}].map(p=>(
          <button key={p.k} onClick={()=>setPeriod(p.k)}
            style={{padding:"5px 13px",borderRadius:999,cursor:"pointer",fontSize:11,
              border:"1px solid "+(periodMode===p.k?"#0d1326":"#e1e3ec"),
              fontWeight:periodMode===p.k?700:500,
              background:periodMode===p.k?"#0d1326":"#fff",
              color:periodMode===p.k?"#d4a437":"#5a6691"}}>
            {p.l}
          </button>
        ))}
        <span style={{fontSize:10.5,color:"#8a92b2",marginLeft:4}}>
          {periodMode==="custom"?rangeNote("range",{from:dateFrom,to:dateTo}):presetRange(periodMode).label}
        </span>
      </div>

      {/* Loading / error / empty states — never show hard-coded zeros */}
      {gpQuery.isLoading&&(
        <div style={{...card,textAlign:"center",padding:"48px 20px",color:"#5a6691",fontSize:13}}>Loading GP data…</div>
      )}
      {gpQuery.error&&!gpQuery.isLoading&&(
        <div style={{...card,textAlign:"center",padding:"40px 20px"}}>
          <p style={{margin:0,fontSize:14,fontWeight:700,color:"#A32D2D"}}>Couldn't load GP data</p>
          <p style={{margin:"6px 0 0",fontSize:11,color:"#5a6691"}}>{String(gpQuery.error?.message||gpQuery.error)}</p>
        </div>
      )}
      {!gpQuery.isLoading&&!gpQuery.error&&bills.length===0&&(
        <div style={{...card,textAlign:"center",padding:"48px 20px"}}>
          <p style={{margin:0,fontSize:30}}>📊</p>
          <p style={{margin:"8px 0 0",fontSize:14,fontWeight:700,color:"#0d1326"}}>No GP data available for the selected period</p>
          <p style={{margin:"6px 0 0",fontSize:11,color:"#5a6691"}}>Try widening the date range, or changing the branch / module filter.</p>
        </div>
      )}

      {hasData&&(<>

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

      {/* ── MONTHLY / QUARTERLY ── */}
      {tab==="period"&&(()=>{
        const rows=periodGran==="quarter"?quarterly:monthly;
        const colLbl=periodGran==="quarter"?"Quarter":"Month";
        return (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",gap:6}}>
            {[{k:"month",l:"📅 Monthly"},{k:"quarter",l:"🗓 Quarterly"}].map(g=>(
              <button key={g.k} onClick={()=>setPeriodGran(g.k)}
                style={{padding:"5px 13px",borderRadius:7,border:"none",cursor:"pointer",fontSize:11,
                  fontWeight:periodGran===g.k?700:500,
                  background:periodGran===g.k?"#0d1326":"#eef0f6",
                  color:periodGran===g.k?"#d4a437":"#5a6691"}}>{g.l}</button>
            ))}
          </div>
          <div style={{...card,padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#0d1326"}}>
                {[colLbl,"Bookings","Revenue","Cost","Gross Profit","GP%","vs Prior"].map((h,i)=>(
                  <th key={i} style={{padding:"9px 12px",textAlign:i>=2?"right":"left",
                    color:"#d4a437",fontWeight:700,fontSize:10}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{rows.map((m,i)=>{
                const prev=rows[i-1];
                const delta=prev&&prev.gpPct>0?+(m.gpPct-prev.gpPct).toFixed(1):null;
                return (
                  <tr key={m.m} style={{borderBottom:"1px solid #f3f4f8",
                    background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"9px 12px",fontWeight:700,color:"#0d1326"}}>{m.m}</td>
                    <td style={{padding:"9px 12px",color:"#5a6691"}}>{m.count}</td>
                    <td style={{padding:"9px 12px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{m.sell>0?cur+f(m.sell):"—"}</td>
                    <td style={{padding:"9px 12px",textAlign:"right",color:"#5a6691",fontVariantNumeric:"tabular-nums"}}>{m.cost>0?cur+f(m.cost):"—"}</td>
                    <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,
                      color:gpClr(m.gpPct),fontVariantNumeric:"tabular-nums"}}>{m.gp!==0?cur+f(m.gp):"—"}</td>
                    <td style={{padding:"9px 12px",textAlign:"right"}}>
                      {m.sell>0&&<span style={{fontSize:11,padding:"3px 9px",borderRadius:999,fontWeight:800,
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
                <td style={{padding:"8px 12px",fontWeight:700,color:"#0d1326"}}>{rows.length} {colLbl.toLowerCase()}{rows.length!==1?"s":""}</td>
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
        </div>
        );
      })()}

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
      </>)}
    </div>
  );
}


export function ReportExpenseBgt({branch,setRoute}){
  const mob=useMobile();
  useBgtRefresh();
  const EXP_LEDGERS=useExpenseLedgers().data||[];          // DB-backed (/api/expense-ledgers)
  const FY_LIST=useFiscalYears().data||[];                 // DB-backed (/api/fiscal-years)
  const budgetRows=useExpenseBudgets().data;               // DB-backed (/api/expense-budgets)
  const bgtFor=(brc,fyv)=>Object.fromEntries((budgetRows||[]).filter(r=>r.branch===brc&&r.fy===fyv).map(r=>[r.ledgerCode,{monthly:r.monthly,yearly:r.yearly}]));
  const [fy,setFy]=useState(CUR_FY.label);
  const [selMonth,setSelMonth]=useState(CUR_MONTH);
  const [view,setView]=useState("mtd");   /* mtd | ytd | annual */
  const [groupFilter,setGroupFilter]=useState("All");
  const [activeBr,setActiveBr]=useState(null);

  const isAll=branch==="ALL";
  const brObj=isAll?(activeBr||BRANCHES[1]):(branch||BRANCHES[1]);
  const brCode=brObj?.code||"BOM";
  const cfg=bc(brObj);
  const cur=cfg.cur;
  const fyObj=FY_LIST.find(f=>f.v===fy||f.l===fy)||FY_LIST[1]||{l:fy,v:fy,keys:[],months:[]};
  const budget=bgtFor(brCode,fyObj.v);
  const fyKeys=fyObj.keys||[];
  const ytdMonths=fyKeys.filter(k=>k<=selMonth);

  /* LIVE actuals — from /api/accounting/budget-vs-actual for the active branch and
     the current view's period. Actuals are real expense-ledger debit movement
     (no hardcoded EXP_ACTUALS). Keyed by ledger code (= expense-ledger id). */
  const mEnd=(key)=>{const[y,m]=String(key).split("-").map(Number);return `${key}-${String(new Date(y,m,0).getDate()).padStart(2,"0")}`;};
  const viewFrom=view==="mtd"?`${selMonth}-01`:`${fyKeys[0]||selMonth}-01`;
  const viewTo=view==="annual"?mEnd(fyKeys[fyKeys.length-1]||selMonth):mEnd(selMonth);
  const bvaQ=useBudgetVsActual(brObj,{from:viewFrom,to:viewTo,fy:fyObj.v});
  const actByCode=Object.fromEntries((bvaQ.data?.rows||[]).map(r=>[r.code,r.actual||0]));
  const getAct=(id)=>actByCode[id]||0;

  /* Per-view bgt/act — actual already scoped to the view's period by the query. */
  const getViewData=(id)=>{
    if(view==="mtd")  return {bgt:budget[id]?.monthly||0,     act:getAct(id)};
    if(view==="ytd")  return {bgt:(budget[id]?.monthly||0)*ytdMonths.length, act:getAct(id)};
    return {bgt:budget[id]?.yearly||0, act:getAct(id)};
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
  /* Per-branch budget is live; per-branch ACTUALS need that branch's own query,
     so only the active branch shows live actuals here — others prompt to open
     the branch (no fabricated cross-branch actuals). */
  const allBranchSummary=isAll?BRANCHES.map(b=>{
    const bBgt=bgtFor(b.code,fyObj.v);
    const bCur=bc(b).cur;
    const totB=EXP_LEDGERS.reduce((s,l)=>s+(view==="annual"?bBgt[l.id]?.yearly||0:(bBgt[l.id]?.monthly||0)*(view==="ytd"?ytdMonths.length:1)),0);
    const isActive=b.code===brCode;
    const totA=isActive?totAct:null;
    const pct=isActive&&totB>0?+(totA/totB*100).toFixed(1):null;
    return {b:b,bCur:bCur,totB:totB,totA:totA,var:totA==null?null:totB-totA,pct:pct,isActive};
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
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{isAll?CONSOLIDATED_LABEL:brCode} · {viewLabel}</p>
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
        <button onClick={()=>setView("mtd")} style={{padding:"6px 12px",border:"none",cursor:"pointer",fontSize:11,fontWeight:view==="mtd"?700:500,background:view==="mtd"?"#0d1326":"transparent",color:view==="mtd"?"#d4a437":"#5a6691",borderRadius:6}}>MTD</button><button onClick={()=>setView("ytd")} style={{padding:"6px 12px",border:"none",cursor:"pointer",fontSize:11,fontWeight:view==="ytd"?700:500,background:view==="ytd"?"#0d1326":"transparent",color:view==="ytd"?"#d4a437":"#5a6691",borderRadius:6}}>YTD</button><button onClick={()=>setView("annual")} style={{padding:"6px 12px",border:"none",cursor:"pointer",fontSize:11,fontWeight:view==="annual"?700:500,background:view==="annual"?"#0d1326":"transparent",color:view==="annual"?"#d4a437":"#5a6691",borderRadius:6}}>Annual</button>
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
                  <div><p style={{margin:0,color:"#5a6691"}}>Actual</p><p style={{margin:0,fontWeight:700,color:totA==null?"#bfc3d6":totA>totB?"#A32D2D":"#27500A"}}>{totA==null?"—":bCur+f(totA)}</p></div>
                </div>
                <Bar pct={pct} h={8}/>
                <p style={{margin:"5px 0 0",fontSize:9.5,fontWeight:700,color:v==null?"#5a6691":v>=0?"#27500A":"#A32D2D"}}>
                  {v==null?"Open this branch for actuals":`${v>=0?"Under":"Over"} by ${bCur}${f(Math.abs(v))}`}
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
            // Live actual only for the month currently queried (MTD view); other
            // months show "no data" rather than a fabricated figure.
            const mAct=(view==="mtd"&&k===selMonth)?totAct:null;
            const mBgt=EXP_LEDGERS.reduce((s,l)=>s+(budget[l.id]?.monthly||0),0);
            const mPct=(mBgt>0&&mAct!=null)?+(mAct/mBgt*100).toFixed(0):null;
            const isSelected=k===selMonth;
            return (
              <div key={k} onClick={()=>{setSelMonth(k);if(view==="annual")setView("mtd");}}
                style={{flex:1,minWidth:58,padding:"8px 6px",borderRadius:9,cursor:"pointer",textAlign:"center",
                  border:`2px solid ${isSelected?"#0d1326":"#e1e3ec"}`,background:isSelected?"#0d1326":pctBg(mPct)}}>
                <p style={{margin:"0 0 2px",fontSize:9,fontWeight:700,color:isSelected?"#d4a437":"#384677"}}>{fyObj.months[ki]}</p>
                <p style={{margin:"0 0 4px",fontSize:16,fontWeight:800,color:isSelected?"#fff":pctColor(mPct)}}>{mPct!==null?`${mPct}%`:"—"}</p>
                <Bar pct={mPct} h={5}/>
                <p style={{margin:"3px 0 0",fontSize:8,color:isSelected?"#8b94b3":"#bfc3d6"}}>{mAct!=null&&mAct>0?cur+f(mAct):"no data"}</p>
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
  // Live per-file GP — branch + date scoped server-side.
  const [range,setRange]=useState(()=>({mode:'all',...resolveReportRange('all')}));
  const q=useGpBills(branch,{from:range.from||undefined,to:range.to||undefined});
  const bills=q.data||[];

  const rows=useMemo(()=>{
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
  },[bills]);

  const [search,setSearch]=useState('');
  const needle=search.trim().toLowerCase();
  const filtered=useMemo(()=>rows.filter(r=>matchNeedle([r.supplier,r.mod],needle)),[rows,needle]);

  const totComm=filtered.reduce((s,r)=>s+r.commission,0);
  const totRev =filtered.reduce((s,r)=>s+r.revenue,0);
  const tds    =filtered.filter(r=>r.commission>15000).reduce((s,r)=>s+Math.round(r.commission*0.05),0);
  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");

  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>💼</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Commission Income (estimated)</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Revenue is live from the books; commission is estimated at standard rates (Insurance 15%, Flight 2%, Holiday 3%, other 1%) with TDS 194H @5% — not actual booked commission.</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <ReportSearch value={search} onChange={setSearch} placeholder="Supplier / module…"/>
          <ReportDateBar value={range} onChange={setRange} branch={branch}/>
        </div>
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
          <tbody>{filtered.map((r,i)=>{
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
            <td colSpan={5} style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL — {filtered.length} principals</td>
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
  const [period,setPeriod]=useState(CUR_MONTH);
  const PERIODS=MONTH_OPTIONS;
  const brCode=branch==="ALL"?null:branch?.code;
  const cfg=bc(branch);
  const cur=cfg.cur;

  /* LIVE — booking-file GP from the double-entry engine (no demo arrays).
     Fetched wide (all-time → today) and pivoted client-side by period, exactly
     like the GP Report. Expenses from Module P&L; overdue from AR ageing.
     Empty in → zeros (never fabricated). */
  const monthEnd=(key)=>{const[y,m]=String(key).split("-").map(Number);const last=new Date(y,m,0).getDate();return `${key}-${String(last).padStart(2,"0")}`;};
  const gpQ=useGpBills(branch,{from:ALL_TIME_FROM,to:todayISO()});
  const GP_DATA=gpQ.data||[];
  const plQ=useModulePL(branch,{from:`${period}-01`,to:monthEnd(period)});
  const agQ=useAgeing(branch);

  const inBr=b=>(!brCode||b.branch===brCode);
  const bills  =GP_DATA.filter(b=>inBr(b)&&String(b.date).startsWith(period));
  const prev   =GP_DATA.filter(b=>inBr(b)&&String(b.date).startsWith(prevMonthKey(period)));
  const tgt    =null; /* sales targets module removed — CRM app now owns this */

  const rev    =bills.reduce((s,b)=>s+(+b.sell||0),0);
  const cost   =bills.reduce((s,b)=>s+(+b.cost||0),0);
  const gp     =rev-cost;
  const gpPct  =rev>0?+(gp/rev*100).toFixed(1):0;
  const exp    =plQ.data?((plQ.data.indirect&&plQ.data.indirect.expense)||0):0;
  const netPft =gp-exp;
  const prevRev=prev.reduce((s,b)=>s+(+b.sell||0),0);
  const prevGP =prev.reduce((s,b)=>s+((+b.sell||0)-(+b.cost||0)),0);
  const tgtRev =tgt?Object.values(tgt).reduce((s,t)=>s+(t.sell||0),0):0;
  const tgtGP  =tgt?Object.values(tgt).reduce((s,t)=>s+(t.gp||0),0):0;
  const revAchv=tgtRev>0?Math.round(rev/tgtRev*100):null;
  const gpAchv =tgtGP>0?Math.round(gp/tgtGP*100):null;
  const revGrowth=prevRev>0?+(( rev-prevRev)/prevRev*100).toFixed(1):null;
  const gpGrowth =prevGP>0?+((gp-prevGP)/prevGP*100).toFixed(1):null;

  /* Top consultants */
  const consultMap={};
  bills.forEach(b=>{const k=b.consultant||"—";if(!consultMap[k])consultMap[k]={rev:0,gp:0,bks:0};consultMap[k].rev+=(+b.sell||0);consultMap[k].gp+=((+b.sell||0)-(+b.cost||0));consultMap[k].bks++;});
  const topConsult=Object.entries(consultMap).sort((a,b)=>b[1].gp-a[1].gp).slice(0,3);

  /* Top clients */
  const clientMap={};
  bills.forEach(b=>{const k=b.client||"—";if(!clientMap[k])clientMap[k]={rev:0,gp:0};clientMap[k].rev+=(+b.sell||0);clientMap[k].gp+=((+b.sell||0)-(+b.cost||0));});
  const topClients=Object.entries(clientMap).sort((a,b)=>b[1].rev-a[1].rev).slice(0,3);

  /* Overdue receivables — LIVE AR ageing (>60 days outstanding), not a % of revenue */
  const overdueClients=((agQ.data&&agQ.data.receivables&&agQ.data.receivables.rows)||[])
    .map(r=>({client:r.party,outstanding:(r.d60||0)+(r.d90||0)}))
    .filter(c=>c.outstanding>0)
    .sort((a,b)=>b.outstanding-a.outstanding);

  /* Monthly trend — last 5 months up to the selected period */
  const trendMonths=Array.from({length:5},(_,i)=>{const[y,m]=period.split("-").map(Number);const d=new Date(y,m-1-(4-i),1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;});
  const trendData=trendMonths.map(m=>{
    const mb=GP_DATA.filter(b=>inBr(b)&&String(b.date).startsWith(m));
    const mr=mb.reduce((s,b)=>s+(+b.sell||0),0);
    const mg=mb.reduce((s,b)=>s+((+b.sell||0)-(+b.cost||0)),0);
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
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{PERIODS.find(p=>p.v===period)?.l} · {brCode||CONSOLIDATED_LABEL} · Monday Morning Report</p>
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
  // Live per-file GP — branch + date scoped server-side.
  const [range,setRange]=useState(()=>({mode:'all',...resolveReportRange('all')}));
  const q=useGpBills(branch,{from:range.from||undefined,to:range.to||undefined});
  const bills=q.data||[];
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
        <ReportDateBar value={range} onChange={setRange} branch={branch}/>
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

/* ── ITEM 4: CONSOLIDATED BALANCE SHEET  /reports/consolidated-bs ── */

export function ConsolidatedBS(){
  const mob=useMobile();
  // LIVE — consolidated balance sheet across ALL branches from the double-entry
  // engine + per-branch revenue/GP contribution. No synthesised ratios / FX
  // guesses; empty books → empty state.
  const qBS=useBalanceSheet("ALL",{to:""});
  const qGP=useGpBills("ALL",{});
  const d=qBS.data;
  const loading=qBS.isLoading;
  const errored=qBS.isError;

  const sideMap=rows=>{const m={};(rows||[]).forEach(g=>{m[g.group]=(m[g.group]||0)+(g.amount||0);});return m;};
  const A=sideMap(d&&d.assets), L=sideMap(d&&d.liabilities);
  const r2=n=>Math.round((n||0)*100)/100;

  const fixedAssets=A["Fixed Assets"]||0;
  const investments=A["Investments"]||0;
  const bank=(A["Bank Accounts"]||0)+(A["Cash-in-Hand"]||0);
  const debtors=A["Sundry Debtors"]||0;
  const totalAssets=d?r2(d.totalAssets):0;
  const otherAssets=r2(totalAssets-(fixedAssets+investments+bank+debtors));

  const capital=L["Capital Account"]||0;
  const reserves=(L["Reserves & Surplus"]||0)+(L["Profit & Loss A/c"]||0);
  const creditors=L["Sundry Creditors"]||0;
  const gst=L["Duties & Taxes"]||0;
  const borrowings=(L["Loans (Liability)"]||0)+(L["Bank OD Accounts"]||0);
  const totalLiab=d?r2(d.totalLiabilities):0;
  const otherLiab=r2(totalLiab-(capital+reserves+creditors+gst+borrowings));

  const branchRows=useMemo(()=>{
    const m={};(qGP.data||[]).forEach(b=>{const code=b.branch||"—";if(!m[code])m[code]={code,rev:0,gp:0};m[code].rev+=(+b.sell||0);m[code].gp+=((+b.sell||0)-(+b.cost||0));});
    return Object.values(m).map(x=>({...x,gpPct:x.rev>0?+(x.gp/x.rev*100).toFixed(1):0})).sort((a,b)=>b.rev-a.rev);
  },[qGP.data]);

  const f=n=>"₹"+Math.round(n||0).toLocaleString("en-IN");
  const hasData=!!d && Math.abs(totalAssets)>0.01;

  const Row=({label,val,sub,bold,indent})=>(
    <div style={{display:"flex",justifyContent:"space-between",padding:`${bold?"10px":"7px"} 14px`,
      borderBottom:"1px solid #f3f4f8",background:bold?"#f3f4f8":"#fff"}}>
      <span style={{fontSize:11,fontWeight:bold?700:400,color:"#0d1326",paddingLeft:indent?12:0}}>{label}</span>
      <div style={{textAlign:"right"}}>
        <p style={{margin:0,fontWeight:bold?800:500,color:bold?"#0d1326":"#384677",fontVariantNumeric:"tabular-nums",fontSize:bold?13:11}}>{val?f(val):"—"}</p>
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
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>All branches · live double-entry · as at {fmtDate(todayISO())}</p>
          </div>
        </div>
      </div>

      {loading && <div style={{...card,textAlign:"center",color:"#5a6691",fontSize:12.5,padding:"40px 14px"}}>Loading live books…</div>}
      {!loading && errored && <div style={{...card,textAlign:"center",color:"#A32D2D",fontSize:12.5,padding:"40px 14px"}}>Could not load accounting data.</div>}
      {!loading && !errored && !hasData && (
        <div style={{...card,textAlign:"center",padding:"44px 14px"}}>
          <div style={{fontSize:34,marginBottom:8}}>📭</div>
          <h3 style={{margin:"0 0 6px",fontSize:15,color:"#0d1326"}}>No transactions found</h3>
          <p style={{margin:0,fontSize:12,color:"#5a6691"}}>The consolidated balance sheet is built from posted vouchers across all branches. Record transactions to populate it.</p>
        </div>
      )}

      {!loading && !errored && hasData && (<>
      {d.balanced
        ?<div style={{marginBottom:10,padding:"8px 14px",borderRadius:8,background:"#EAF3DE",border:"1px solid #C0DD97",fontSize:10.5,color:"#27500A",fontWeight:600}}>✔ Consolidated Balance Sheet balanced · Total: {f(totalAssets)}</div>
        :<div style={{marginBottom:10,padding:"8px 14px",borderRadius:8,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:10.5,color:"#854F0B",fontWeight:600}}>⚠ Difference: {f(Math.abs(totalAssets-totalLiab))} — review postings</div>
      }

      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
        {/* Assets */}
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <div style={{background:"#185FA5",padding:"10px 14px"}}><p style={{margin:0,fontSize:13,fontWeight:800,color:"#fff"}}>ASSETS</p></div>
          <Row label="Fixed Assets (net)" val={fixedAssets} sub="Tangible + intangible across all branches"/>
          <Row label="Non-current Investments" val={investments}/>
          <Row label="Bank & Cash" val={bank} sub="All branches"/>
          <Row label="Trade Receivables" val={debtors} sub="Sundry Debtors"/>
          <Row label="Other Assets" val={otherAssets} sub="Deposits, advances, current assets"/>
          <Row label="TOTAL ASSETS" val={totalAssets} bold/>
        </div>
        {/* Liabilities */}
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <div style={{background:"#0d1326",padding:"10px 14px"}}><p style={{margin:0,fontSize:13,fontWeight:800,color:"#fff"}}>LIABILITIES & CAPITAL</p></div>
          <Row label="Capital Account" val={capital}/>
          <Row label="Reserves & Surplus (incl. P&L)" val={reserves} sub="Cumulative net profit"/>
          <Row label="Borrowings" val={borrowings} sub="Loans + bank OD"/>
          <Row label="Trade Payables" val={creditors} sub="Sundry Creditors"/>
          <Row label="Duties & Taxes (GST/VAT/TDS)" val={gst}/>
          <Row label="Other Liabilities" val={otherLiab} sub="Provisions, current liabilities"/>
          <Row label="TOTAL LIABILITIES" val={totalLiab} bold/>
        </div>
      </div>

      {/* Branch breakdown */}
      <div style={{...card,padding:0,overflow:"hidden",marginTop:12}}>
        <div style={{padding:"10px 14px",background:"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
          <p style={{margin:0,fontSize:11,fontWeight:700,color:"#384677"}}>Branch Contribution — Revenue &amp; Gross Profit (live)</p>
        </div>
        {branchRows.length===0
          ?<div style={{padding:"18px 14px",textAlign:"center",fontSize:11,color:"#5a6691"}}>No sale/purchase vouchers posted yet.</div>
          :<table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Branch","Revenue","Gross Profit","GP %"].map((h,i)=>(
              <th key={i} style={{padding:"8px 12px",textAlign:i>=1?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{branchRows.map((b,i)=>(
            <tr key={b.code} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px",fontWeight:700,color:"#0d1326"}}>{BRANCHES.find(br=>br.code===b.code)?.flag||""} {b.code}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(b.rev)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#27500A"}}>{f(b.gp)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",color:"#27500A"}}>{b.gpPct}%</td>
            </tr>
          ))}</tbody>
        </table>}
      </div>
      </>)}
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
  // Unified date control (Monthly/Quarterly/YTD/All + back-dated From/To) instead
  // of the old fixed month dropdown that couldn't reach historical periods.
  // Default to All so the historical book shows immediately (the current month
  // is usually empty); live per-file GP from the double-entry engine,
  // branch- and date-scoped server-side.
  const [range,setRange]=useState(()=>({mode:'all',...resolveReportRange('all')}));
  const [view,setView]=useState("table"); // table | trend

  const q=useGpBills(branch,{from:range.from||undefined,to:range.to||undefined});
  const bills=q.data||[];

  // Year-over-year: the same window shifted exactly 12 months back.
  const prevRange=priorYearRange(range);
  const qPrev=useGpBills(branch,{from:prevRange.from||undefined,to:prevRange.to||undefined});
  const billsPrev=qPrev.data||[];

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

  // Month-by-month for trend view — the last 3 months present in the live data.
  const trendData=useMemo(()=>{
    const months=[...new Set(bills.map(b=>String(b.date||"").slice(0,7)).filter(Boolean))].sort().slice(-3);
    const consults=[...new Set(bills.map(b=>b.consultant).filter(Boolean))];
    return consults.slice(0,5).map(name=>({
      name,
      data:months.map(m=>{
        const mb=bills.filter(b=>b.consultant===name&&String(b.date||"").startsWith(m));
        return{m:m,gp:mb.reduce((s,b)=>s+b.sell-b.cost,0),bks:mb.length};
      }),
    }));
  },[bills]);

  const [search,setSearch]=useState('');
  const needle=search.trim().toLowerCase();
  const filtered=useMemo(()=>stats.filter(c=>matchNeedle([c.name,c.topMod],needle)),[stats,needle]);

  const totRev=filtered.reduce((s,c)=>s+c.rev,0);
  const totGP =filtered.reduce((s,c)=>s+c.gp,0);
  const totBks=filtered.reduce((s,c)=>s+c.bks,0);
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
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{filtered.length} consultants · {totBks} bookings · Total GP {f(totGP)}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <ReportSearch value={search} onChange={setSearch} placeholder="Consultant / module…"/>
          <ReportDateBar value={range} onChange={setRange} branch={branch}/>
          <button onClick={()=>setView("table")} style={{padding:"7px 14px",border:"none",cursor:"pointer",fontWeight:view==="table"?700:500,background:view==="table"?"#fff":"transparent",borderRadius:6}}>📊 Table</button><button onClick={()=>setView("trend")} style={{padding:"7px 14px",border:"none",cursor:"pointer",fontWeight:view==="trend"?700:500,background:view==="trend"?"#fff":"transparent",borderRadius:6}}>📈 Trend</button>
          <button onClick={()=>exportToCSV(stats,["name","rev","cost","gp","gpPct","bks","avgTicket","topMod"],"consultants.csv")} style={{...btnGh,fontSize:11}}><Download size={12}/> CSV</button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Consultants",v:String(filtered.length),c:"#384677",bg:"#f3f4f8"},
          {l:"Total Revenue",v:f(totRev),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Total GP",v:f(totGP),c:"#27500A",bg:"#EAF3DE"},
          {l:"Avg GP/Consultant",v:filtered.length>0?f(Math.round(totGP/filtered.length)):"—",c:"#1D9E75",bg:"#EAF3DE"},
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
              {["Rank","Consultant","Revenue","Cost","Gross Profit","GP%","Bookings","Avg Ticket","Top Module","vs 1 Yr Ago"].map((h,i)=>(
                <th key={i} style={{padding:"9px 11px",textAlign:i>=2&&i<=8?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filtered.length===0&&(
              <tr><td colSpan={10} style={{padding:"26px 11px",textAlign:"center",color:"#5a6691",fontSize:12}}>{needle?`No consultant matches “${search}”.`:"No bookings in this date range. Widen the range (try “All”) or check that sale vouchers are posted for this branch."}</td></tr>
            )}{filtered.map((c,i)=>{
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
              <td style={{padding:"9px 11px",textAlign:"right",color:"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(filtered.reduce((s,c)=>s+c.cost,0))}</td>
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
          <p style={{margin:"0 0 14px",fontSize:12,fontWeight:700,color:"#0d1326"}}>GP Trend — recent months (Top 5 Consultants)</p>
          {trendData.filter(c=>matchNeedle([c.name],needle)).map((c,ci)=>(
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
  const [client,setClient]=useState("");
  const [range,setRange]=useState(()=>({mode:'all',...resolveReportRange('all')}));
  const [showModal,setShowModal]=useState(false);
  const [search,setSearch]=useState('');
  const needle=search.trim().toLowerCase();
  // Live per-file GP — used ONLY to populate the client selector (the set of parties
  // that have sales). The statement itself is the party's real account ledger.
  const q=useGpBills(branch,{});
  const allBills=q.data||[];
  const clients=[...new Set(allBills.map(b=>b.client).filter(Boolean))].sort();
  const rangeLabel=range.mode==='all'?'All Time':`${range.from||'start'} → ${range.to||'today'}`;

  // LIVE account statement: the client's own ledger (real invoices Dr + real receipts Cr).
  // No simulated receipts — every Dr/Cr row is a posted voucher line from the books.
  const stmtQ=useLedgerStatement(client,branch,{from:range.from||undefined,to:range.to||undefined});
  const stmt=stmtQ.data;

  const txnsWithBal=(stmt?.lines||[]).map(p=>({
    date:p.date,
    type:p.debit>0?"Invoice":"Receipt",
    ref:p.vno,
    desc:p.narration||p.entryNarration||(p.particulars&&p.particulars[0]?.ledger)||p.category||"—",
    dr:p.debit||0,cr:p.credit||0,
    bal:p.balanceSide==="Cr"?-(p.balance||0):(p.balance||0),
  }));
  const filteredTxns=txnsWithBal.filter(t=>matchNeedle([t.date,t.type,t.ref,t.desc],needle));
  const totDr=stmt?.totalDebit||0;
  const totCr=stmt?.totalCredit||0;
  const outstanding=stmt?(stmt.closingSide==="Cr"?-(stmt.closingBalance||0):(stmt.closingBalance||0)):0;

  // Ageing buckets (0-30, 31-60, 61-90, >90) — from real open invoice (Dr) lines vs today.
  const today=new Date();
  const ageing={a0:0,a30:0,a60:0,a90:0};
  txnsWithBal.filter(t=>t.dr>0).forEach(t=>{
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
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{client||'Select a client'} · {rangeLabel}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <ReportSearch value={search} onChange={setSearch} placeholder="Ref / type / description…"/>
          <select value={client} onChange={e=>setClient(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            <option value="">— Select client —</option>
            {clients.map(c=><option key={c}>{c}</option>)}
          </select>
          <ReportDateBar value={range} onChange={setRange} branch={branch}/>
          <button onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent(`Hi! Your account statement for ${rangeLabel} — Outstanding: ${f(outstanding)}. Please contact us to settle the balance.`)}`, "_blank","noopener")} style={{...btnG,fontSize:11,background:"#25D366"}}>💬 WhatsApp</button>
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
          <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{filteredTxns.length} transactions</p>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5,minWidth:700}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Date","Type","Reference","Description","Dr (₹)","Cr (₹)","Balance"].map((h,i)=>(
                <th key={i} style={{padding:"8px 12px",textAlign:i>=4?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{!client?(
                <tr><td colSpan={7} style={{padding:"22px 12px",textAlign:"center",color:"#5a6691",fontSize:11.5}}>Select a client to view their live account statement.</td></tr>
              ):stmtQ.isLoading?(
                <tr><td colSpan={7} style={{padding:"22px 12px",textAlign:"center",color:"#5a6691",fontSize:11.5}}>Loading statement…</td></tr>
              ):filteredTxns.length===0?(
                <tr><td colSpan={7} style={{padding:"22px 12px",textAlign:"center",color:"#5a6691",fontSize:11.5}}>{needle?`No transactions match “${search}”.`:`No posted transactions for ${client} in this period.`}</td></tr>
              ):filteredTxns.map((t,i)=>(
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
  const [period,setPeriod]=useState(CUR_MONTH);
  const [search,setSearch]=useState('');
  const needle=search.trim().toLowerCase();
  const PERIODS=PERIOD_OPTIONS;
  /* India-only / INR base — no foreign-currency settlements. */
  const FOREX_DATA=[];
  const filtered=FOREX_DATA.filter(r=>(r.date.startsWith(period)||period==="YTD")&&matchNeedle([r.date,r.ccy,r.type,r.party,r.status],needle));
  const realized=filtered.filter(r=>r.status==="Settled");
  const totalGain=realized.reduce((s,r)=>s+r.gain,0);
  const totalUnreal=filtered.filter(r=>r.status==="Unsettled").length;
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const CCY_CLR={};

  return(
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>💱</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Forex Gain / Loss Report</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Foreign currency settlements · Realized + Unrealized</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <ReportSearch value={search} onChange={setSearch} placeholder="Party / currency / type…"/>
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
          {l:"Total FCY Volume",v:`${filtered.reduce((s,r)=>s+r.fcAmt,0).toLocaleString()} FCY`,c:"#185FA5",bg:"#E6F1FB"},
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
        Forex Gain/Loss is posted to GL via Journal Entry. Rate booked = rate at time of invoice. Rate settled = rate at time of payment. Unrealized: open positions at period-end rated at closing rate.
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
  // Live per-file GP from the double-entry engine — branch + date scoped server-side.
  const [range,setRange]=useState(()=>({mode:'all',...resolveReportRange('all')}));
  const q=useGpBills(branch,{from:range.from||undefined,to:range.to||undefined});
  const bills=q.data||[];

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

  const [search,setSearch]=useState('');
  const needle=search.trim().toLowerCase();
  const filtered=useMemo(()=>destRows.filter(d=>matchNeedle([d.dest,d.topMod],needle)),[destRows,needle]);

  const maxGP=Math.max(...filtered.map(d=>d.gp),1);
  const totRev=filtered.reduce((s,d)=>s+d.rev,0);
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const DEST_EMOJIS={Dubai:"🇦🇪",Bali:"🇮🇩",Singapore:"🇸🇬",Maldives:"🇲🇻",Bangkok:"🇹🇭",Europe:"🌍",London:"🇬🇧",Paris:"🇫🇷","Masai Mara":"🇰🇪","Nairobi":"🇰🇪"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1300,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🗺</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Destination Intelligence</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{filtered.length} destinations · {bills.length} bookings · Revenue & GP breakdown</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <ReportSearch value={search} onChange={setSearch} placeholder="Destination / module…"/>
          <ReportDateBar value={range} onChange={setRange} branch={branch}/>
        </div>
      </div>

      {/* Destination cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12,marginBottom:14}}>
        {filtered.slice(0,6).map((d,i)=>(
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
          <tbody>{filtered.map((d,i)=>(
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
  const STATUS_CLR={Invoiced:"#185FA5",Settled:"#27500A",Pending:"#854F0B"};
  const STATUS_BG ={Invoiced:"#E6F1FB",Settled:"#EAF3DE",Pending:"#FAEEDA"};
  const BRANCH_CLR={BOM:"#185FA5",AMD:"#854F0B"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔄</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Intercompany Billing</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Cross-branch transactions · BOM ↔ AMD · Auto markup {IC_ENTRIES[0].markup}%</p>
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
            <FL label="From branch"><select style={inp}>{BRANCH_CODES.map(b=><option key={b}>{b}</option>)}</select></FL>
            <FL label="To branch"><select style={inp}>{BRANCH_CODES.map(b=><option key={b}>{b}</option>)}</select></FL>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
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

export function RatioAnalysis({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  // LIVE — ratios computed from the double-entry Balance Sheet + Module P&L.
  // No hardcoded ratios / fabricated trends; empty books → empty state.
  const qBS=useBalanceSheet(branch,{to:""});
  const qPL=useModulePL(branch,{});
  const bs=qBS.data, pl=qPL.data;
  const loading=qBS.isLoading||qPL.isLoading;
  const errored=qBS.isError||qPL.isError;

  const sideMap=rows=>{const m={};(rows||[]).forEach(g=>{m[g.group]=(m[g.group]||0)+(g.amount||0);});return m;};
  const A=sideMap(bs&&bs.assets), L=sideMap(bs&&bs.liabilities);
  const sum=(map,keys)=>keys.reduce((s,k)=>s+(map[k]||0),0);
  const CA=sum(A,["Current Assets","Bank Accounts","Cash-in-Hand","Deposits (Asset)","Loans & Advances (Asset)","Stock-in-Hand","Sundry Debtors"]);
  const CL=sum(L,["Current Liabilities","Duties & Taxes","Provisions","Sundry Creditors","Bank OD Accounts"]);
  const inv=A["Stock-in-Hand"]||0;
  const cash=(A["Bank Accounts"]||0)+(A["Cash-in-Hand"]||0);
  const recv=A["Sundry Debtors"]||0;
  const pay=L["Sundry Creditors"]||0;
  const totA=bs?bs.totalAssets||0:0;
  const equity=sum(L,["Capital Account","Reserves & Surplus","Profit & Loss A/c"]);
  const debt=sum(L,["Loans (Liability)","Secured Loans","Unsecured Loans","Bank OD Accounts"]);
  const rev=pl?pl.totals.sales||0:0;
  const cogs=pl?pl.totals.cogs||0:0;
  const gp=pl?pl.totals.gp||0:0;
  const net=pl?pl.bridge.netProfit||0:0;
  const safe=(a,b)=>b?a/b:null;

  const RATIOS=[
    {category:"Liquidity",name:"Current Ratio",value:safe(CA,CL),fmt:"x",bench:1.5,dir:"up"},
    {category:"Liquidity",name:"Quick Ratio (Acid Test)",value:safe(CA-inv,CL),fmt:"x",bench:1.0,dir:"up"},
    {category:"Liquidity",name:"Cash Ratio",value:safe(cash,CL),fmt:"x",bench:0.3,dir:"up"},
    {category:"Activity",name:"DSO — Days Sales Outstanding (annualised)",value:rev?recv/rev*365:null,fmt:"d",bench:45,dir:"down"},
    {category:"Activity",name:"DPO — Days Payables Outstanding (annualised)",value:cogs?pay/cogs*365:null,fmt:"d",bench:40,dir:"up"},
    {category:"Activity",name:"Asset Turnover",value:safe(rev,totA),fmt:"x",bench:2.0,dir:"up"},
    {category:"Leverage",name:"Debt-Equity Ratio",value:safe(debt,equity),fmt:"x",bench:1.0,dir:"down"},
    {category:"Profitability",name:"Gross Profit Margin",value:rev?gp/rev*100:null,fmt:"%",bench:10,dir:"up"},
    {category:"Profitability",name:"Net Profit Margin",value:rev?net/rev*100:null,fmt:"%",bench:3,dir:"up"},
    {category:"Profitability",name:"Return on Assets (ROA)",value:totA?net/totA*100:null,fmt:"%",bench:8,dir:"up"},
    {category:"Profitability",name:"Return on Equity (ROE)",value:equity?net/equity*100:null,fmt:"%",bench:12,dir:"up"},
  ];
  RATIOS.forEach(r=>{ r.good = r.value==null?false:(r.dir==="up"?r.value>=r.bench:r.value<=r.bench); });

  const catColor={Liquidity:"#185FA5",Activity:"#854F0B",Leverage:"#A32D2D",Profitability:"#27500A"};
  const sfx=r=>r.fmt==="%"?"%":r.fmt==="d"?"d":"x";
  const benchTxt=r=>(r.dir==="up"?"≥ ":"≤ ")+r.bench+sfx(r);
  const valTxt=r=>r.value==null?"—":r.value.toFixed(r.fmt==="d"?0:2)+sfx(r);
  const hasData=!!bs && (Math.abs(totA)>0.01 || rev>0);

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>📊 Financial Ratio Analysis</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>Liquidity · Activity · Leverage · Profitability — live from the double-entry books</p>
        </div>
      </div>

      {loading && <div style={{...card,textAlign:"center",color:"#5a6691",fontSize:12.5,padding:"40px 14px"}}>Loading live books…</div>}
      {!loading && errored && <div style={{...card,textAlign:"center",color:"#A32D2D",fontSize:12.5,padding:"40px 14px"}}>Could not load accounting data.</div>}
      {!loading && !errored && !hasData && (
        <div style={{...card,textAlign:"center",padding:"44px 14px"}}>
          <div style={{fontSize:34,marginBottom:8}}>📭</div>
          <h3 style={{margin:"0 0 6px",fontSize:15,color:"#0d1326"}}>No transactions found</h3>
          <p style={{margin:0,fontSize:12,color:"#5a6691"}}>Financial ratios are derived from posted vouchers. Record transactions to populate this analysis.</p>
        </div>
      )}

      {!loading && !errored && hasData && (<>
      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {Object.entries(catColor).map(([cat,col])=>{
          const ratios=RATIOS.filter(r=>r.category===cat&&r.value!=null);
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
                  <th style={{padding:"9px 8px",textAlign:"right"}}>Value</th>
                  <th style={{padding:"9px 8px",textAlign:"center"}}>Benchmark</th>
                  <th style={{padding:"9px 8px",textAlign:"center"}}>Status</th>
                </tr></thead>
                <tbody>
                  {RATIOS.filter(r=>r.category===cat).map((r,i)=>(
                    <tr key={i} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
                      <td style={{padding:"7px 8px",fontWeight:600}}>{r.name}</td>
                      <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,color:catColor[cat]}}>{valTxt(r)}</td>
                      <td style={{padding:"7px 8px",textAlign:"center",fontSize:10,color:"#5a6691"}}>{benchTxt(r)}</td>
                      <td style={{padding:"7px 8px",textAlign:"center"}}>{r.value==null?<span style={{fontSize:10,color:"#5a6691"}}>—</span>:<span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:r.good?"#EAF3DE":"#FCEBEB",color:r.good?"#27500A":"#A32D2D"}}>{r.good?"✓ Healthy":"⚠ Watch"}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
      </>)}
    </div>
  );
}


export function ScheduleIIIBS({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};
  const round2=n=>Math.round((n||0)*100)/100;

  // LIVE double-entry data — NO hardcoded figures. Same source as the main
  // Balance Sheet (/reports/bs): GET /api/accounting/balance-sheet, which
  // aggregates every posted voucher's journal + opening balances by Tally group.
  // Empty books → zero/empty state (never fabricated balances).
  const q=useBalanceSheet(branch,{to:""});
  const d=q.data;

  // Roll the live Tally-group balances up into Schedule III line items. Each
  // group's `amount` is already signed positive on its natural side.
  const sideMap=rows=>{const m={};(rows||[]).forEach(g=>{m[g.group]=(m[g.group]||0)+(g.amount||0);});return m;};
  const liab=sideMap(d&&d.liabilities);
  const asset=sideMap(d&&d.assets);
  const pick=(map,names)=>names.reduce((s,n)=>s+(map[n]||0),0);

  // ── I. EQUITY & LIABILITIES ──
  const shareCapital   = pick(liab,["Capital Account"]);
  const reserves       = pick(liab,["Reserves & Surplus","Profit & Loss A/c"]);
  const shareholders   = shareCapital+reserves;
  const ltBorrowings   = pick(liab,["Loans (Liability)","Secured Loans","Unsecured Loans"]);
  const stBorrowings   = pick(liab,["Bank OD Accounts"]);
  const tradePayables  = pick(liab,["Sundry Creditors"]);
  const dutiesTaxes    = pick(liab,["Duties & Taxes","Current Liabilities"]);
  const stProvisions   = pick(liab,["Provisions"]);
  const totLiab        = d? round2(d.totalLiabilities||0) : 0;
  // Any liability group not explicitly mapped above lands in Other Current
  // Liabilities, so the statement always reconciles to the live total.
  const otherCurrLiab  = round2(totLiab-(shareholders+ltBorrowings+stBorrowings+tradePayables+dutiesTaxes+stProvisions));
  const currLiab       = stBorrowings+tradePayables+dutiesTaxes+otherCurrLiab+stProvisions;

  const EQUITY_LIABILITIES=[
    {head:"(1) Shareholders' Funds",bold:true,total:shareholders},
    {head:"    (a) Share Capital",value:shareCapital},
    {head:"    (b) Reserves and Surplus",value:reserves},
    {head:"(2) Share Application Money Pending Allotment",value:0,bold:true},
    {head:"(3) Non-Current Liabilities",bold:true,total:ltBorrowings},
    {head:"    (a) Long-term Borrowings",value:ltBorrowings},
    {head:"(4) Current Liabilities",bold:true,total:currLiab},
    {head:"    (a) Short-term Borrowings",value:stBorrowings},
    {head:"    (b) Trade Payables",value:tradePayables},
    {head:"    (c) Other Current Liabilities",value:round2(dutiesTaxes+otherCurrLiab)},
    {head:"    (d) Short-term Provisions",value:stProvisions},
  ];

  // ── II. ASSETS ──
  const fixedAssets    = pick(asset,["Fixed Assets"]);
  const investmentsNC  = pick(asset,["Investments"]);
  const ltLoansAdv     = pick(asset,["Deposits (Asset)"]);
  const otherNCAssets  = pick(asset,["Misc. Expenses (Asset)"]);
  const nonCurrAssets  = fixedAssets+investmentsNC+ltLoansAdv+otherNCAssets;
  const inventories    = pick(asset,["Stock-in-Hand"]);
  const tradeRecv      = pick(asset,["Sundry Debtors"]);
  const cashBank       = pick(asset,["Bank Accounts","Cash-in-Hand"]);
  const stLoansAdv     = pick(asset,["Loans & Advances (Asset)"]);
  const totAssets      = d? round2(d.totalAssets||0) : 0;
  const otherCurrAsset = round2(totAssets-(nonCurrAssets+inventories+tradeRecv+cashBank+stLoansAdv));
  const currAssets     = inventories+tradeRecv+cashBank+stLoansAdv+otherCurrAsset;

  const ASSETS=[
    {head:"(1) Non-Current Assets",bold:true,total:nonCurrAssets},
    {head:"    (a) Fixed Assets",value:fixedAssets},
    {head:"    (b) Non-current Investments",value:investmentsNC},
    {head:"    (c) Long-term Loans and Advances",value:ltLoansAdv},
    {head:"    (d) Other Non-current Assets",value:otherNCAssets},
    {head:"(2) Current Assets",bold:true,total:currAssets},
    {head:"    (a) Inventories",value:inventories},
    {head:"    (b) Trade Receivables",value:tradeRecv},
    {head:"    (c) Cash and Cash Equivalents",value:cashBank},
    {head:"    (d) Short-term Loans and Advances",value:stLoansAdv},
    {head:"    (e) Other Current Assets",value:otherCurrAsset},
  ];

  const Row=({head,value,total,bold})=>(
    <tr style={{borderBottom:"1px solid #e1e3ec",background:bold?"#FAEEDA":"#fff"}}>
      <td style={{padding:"7px 10px",fontWeight:bold?700:400,fontSize:bold?11.5:11,color:"#0d1326"}}>{head}</td>
      <td style={{padding:"7px 10px",textAlign:"right",fontWeight:bold?700:400,color:bold?"#0d1326":"#5a6691"}}>{value!==undefined?(value?cur+fmt(value):"—"):""}</td>
      <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:"#185FA5"}}>{total!==undefined?cur+fmt(total):""}</td>
    </tr>
  );

  const hasData = !!d && (Math.abs(totLiab)>0.01 || Math.abs(totAssets)>0.01);

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>📜 Balance Sheet — Schedule III</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>Companies Act 2013 prescribed format · As at {fmtDate(todayISO())} · Live from posted vouchers</p>
        </div>
        {hasData && (d.balanced
          ? <span style={{padding:"6px 12px",borderRadius:7,fontSize:11,fontWeight:700,background:"#EAF3DE",color:"#27500A"}}>✓ Balanced</span>
          : <span style={{padding:"6px 12px",borderRadius:7,fontSize:11,fontWeight:700,background:"#FCEBEB",color:"#A32D2D"}}>⚠ Out by {cur+fmt(Math.abs(totAssets-totLiab))}</span>)}
      </div>

      {q.isLoading && <div style={{...card,textAlign:"center",color:"#5a6691",fontSize:12.5,padding:"40px 14px"}}>Loading live books…</div>}
      {q.isError && <div style={{...card,textAlign:"center",color:"#A32D2D",fontSize:12.5,padding:"40px 14px"}}>Could not load accounting data{q.error?.message?` — ${q.error.message}`:""}.</div>}
      {!q.isLoading && !q.isError && !hasData && (
        <div style={{...card,textAlign:"center",padding:"44px 14px"}}>
          <div style={{fontSize:34,marginBottom:8}}>📭</div>
          <h3 style={{margin:"0 0 6px",fontSize:15,color:"#0d1326"}}>No transactions found</h3>
          <p style={{margin:0,fontSize:12,color:"#5a6691"}}>The Schedule III Balance Sheet is generated from posted vouchers and opening balances. Record transactions to populate this statement.</p>
        </div>
      )}

      {!q.isLoading && !q.isError && hasData && (
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <h3 style={{margin:0,padding:"10px 12px",fontSize:13,background:"#0d1326",color:"#d4a437"}}>I. EQUITY AND LIABILITIES</h3>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <tbody>
              {EQUITY_LIABILITIES.map((r,i)=><Row key={i} {...r}/>)}
              <tr style={{background:"#0d1326",color:"#d4a437"}}>
                <td style={{padding:"10px",fontWeight:700,fontSize:12}}>TOTAL</td>
                <td></td>
                <td style={{padding:"10px",textAlign:"right",fontWeight:700,fontSize:12}}>{cur+fmt(totLiab)}</td>
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
      )}

      <p style={{marginTop:14,fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>
        💡 As per Division I of Schedule III of Companies Act, 2013 · Figures derived live from the Tally 28-group double-entry books · Reproduce with Notes 1-30 for full statutory compliance
      </p>
    </div>
  );
}


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
  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>📈 Variance Analysis Report</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>Actual vs Budget vs Forecast vs Prior Year · Ranked by largest swing</p>
        </div>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:7,fontSize:11.5}}>
          {MONTH_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
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
  return <NotWired title="Report Viewer" note="This tabbed report viewer is a layout preview and isn't connected to live data, filters, scheduling or sharing yet."/>;
}
function _ReportViewerTabbed_legacy(){
  const [tab,setTab]=useState("view");
  const tabs=[{id:"view",label:"1. View"},{id:"filter",label:"2. Filter"},{id:"group",label:"3. Group By"},{id:"sort",label:"4. Sort"},{id:"compare",label:"5. Compare"},{id:"format",label:"6. Format"},{id:"export",label:"7. Export"},{id:"schedule",label:"8. Schedule"},{id:"share",label:"9. Share"}];
  return TAB_Page("Profit & Loss Statement — May 2026", "Generic 9-tab Report Viewer · applies to any report in the system",
    {user:"",date:"",created:""},
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
              <FL label="Currency Symbol"><select style={inpStd}>{ACTIVE_CURRENCIES.map(c=><option key={c}>{`${CURRENCY_META[c].symbol} (${c})`}</option>)}<option>None</option></select></FL>
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
  return <NotWired title="Saved Report Views" note="Saved report views aren't available yet — there's no saved-views service connected to store or run them."/>;
}
function _SavedReportViews_legacy(){
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
  return <NotWired title="Scheduled Reports" note="Scheduled report delivery isn't available yet — no scheduling or email service is connected. Email/recipient counts are not shown until it's live."/>;
}
function _ScheduledReports_legacy(){
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
   TAX SUMMARY — GST / VAT RETURN VIEW (live, branch-regime-aware)
   Output − Input tax (net payable to the authority) + withholding (WHT/TDS)
   + TCS, from the double-entry engine. VAT branches (Africa) show VAT;
   India branches show GST. GET /api/accounting/tax-summary.
   ════════════════════════════════════════════════════════════════════ */
export function RPT_TaxSummary({ branch }) {
  const [range, setRange] = useState(() => ({ mode: 'all', ...resolveReportRange('all') }));
  const q = useTaxSummary(branch, { from: range.from || undefined, to: range.to || undefined });
  const d = q.data || null;
  const cfg = bc(branch);
  const cur = cfg.cur || '₹';
  const regime = d?.regime || (cfg.taxType === 'VAT' ? 'VAT' : 'GST');
  const isVat = regime === 'VAT';
  const f = (n) => cur + ' ' + Number(Math.round(n || 0)).toLocaleString('en-IN');
  const brLabel = (!branch || branch === 'ALL') ? CONSOLIDATED_LABEL : (branch.code || branch);

  const out = d?.output || { total: 0, lines: [] };
  const inp = d?.input || { total: 0, lines: [] };
  const wh  = d?.withholding || { payable: 0, receivable: 0, payableLines: [], receivableLines: [] };
  const tcs = d?.tcs || { payable: 0, receivable: 0 };
  const net = d?.netPayable ?? (out.total - inp.total);

  const exportRows = [
    ...out.lines.map((l) => ({ section: 'Output Tax', ledger: l.ledger, amount: l.amount })),
    ...inp.lines.map((l) => ({ section: 'Input Tax', ledger: l.ledger, amount: l.amount })),
    ...wh.payableLines.map((l) => ({ section: 'Withholding Payable', ledger: l.ledger, amount: l.amount })),
    ...wh.receivableLines.map((l) => ({ section: 'Withholding Receivable', ledger: l.ledger, amount: l.amount })),
  ];

  const kpis = [
    { l: 'Output ' + (isVat ? 'VAT' : 'GST'), v: f(out.total), c: '#185FA5', bg: '#E6F1FB' },
    { l: 'Input ' + (isVat ? 'VAT' : 'GST'), v: f(inp.total), c: '#854F0B', bg: '#FAEEDA' },
    { l: 'Net ' + (net >= 0 ? 'Payable' : 'Refundable'), v: f(Math.abs(net)), c: net >= 0 ? '#A32D2D' : '#27500A', bg: net >= 0 ? '#FBEAEA' : '#EAF3DE' },
    { l: (isVat ? 'WHT' : 'TDS') + ' Payable', v: f(wh.payable), c: '#384677', bg: '#f3f4f8' },
    { l: (isVat ? 'WHT' : 'TDS') + ' Receivable', v: f(wh.receivable), c: '#1D9E75', bg: '#EAF3DE' },
    ...(!isVat ? [{ l: 'TCS Payable', v: f(tcs.payable), c: '#7F77DD', bg: '#EFEEFB' }] : []),
  ];

  const Section = ({ title, lines }) => (
    <div style={{ ...card, padding: 0, marginBottom: 14, overflow: 'hidden' }}>
      <div style={{ padding: '9px 13px', background: '#f3f5f9', fontSize: 11, fontWeight: 800, color: '#384677', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{title}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <tbody>
          {(lines || []).length === 0 && <tr><td style={{ padding: '10px 13px', color: '#9aa2c0' }}>No movement in this period.</td></tr>}
          {(lines || []).map((l, i) => (
            <tr key={i} style={{ borderTop: '1px solid #f1f3f8' }}>
              <td style={{ padding: '8px 13px', color: '#0d1326' }}>{l.ledger}</td>
              <td style={{ padding: '8px 13px', textAlign: 'right', fontWeight: 600, color: '#0d1326' }}>{f(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ padding: '12px 10px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: isVat ? '#EAF3DE' : '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧾</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0d1326' }}>{isVat ? 'VAT Return' : 'GST Summary'} · {brLabel}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#5a6691' }}>{regime}{d?.vatRate ? ' ' + d.vatRate + '%' : ''} · live from the double-entry engine · {cur}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <ReportDateBar value={range} onChange={setRange}  branch={branch}/>
          <button onClick={() => exportToCSV(exportRows, ['section', 'ledger', 'amount'], 'tax-summary.csv')} style={{ ...btnGh, fontSize: 11 }} disabled={!exportRows.length}><Download size={12} /> CSV</button>
        </div>
      </div>

      {q.isLoading && <div style={{ ...card, padding: 24, textAlign: 'center', color: '#5a6691' }}>Loading…</div>}
      {q.isError && <div style={{ ...card, padding: 16, color: '#A32D2D', fontWeight: 600 }}>⚠ {q.error?.message || 'Failed to load'} — is the backend running and are you logged in?</div>}

      {!q.isLoading && !q.isError && (<>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 16 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ ...card, borderTop: `3px solid ${k.c}`, padding: '11px 13px', background: k.bg }}>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: k.c, textTransform: 'uppercase' }}>{k.l}</p>
              <p style={{ margin: '4px 0 0', fontSize: 19, fontWeight: 800, color: '#0d1326' }}>{k.v}</p>
            </div>
          ))}
        </div>

        <div style={{ ...card, padding: '12px 14px', marginBottom: 14, background: net >= 0 ? '#FBEAEA' : '#EAF3DE', borderLeft: `4px solid ${net >= 0 ? '#A32D2D' : '#27500A'}` }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0d1326' }}>
            Net {isVat ? 'VAT' : 'GST'} {net >= 0 ? 'payable to' : 'refundable from'} the authority: {f(Math.abs(net))}
          </span>
          <span style={{ fontSize: 11, color: '#5a6691', marginLeft: 8 }}>= Output {f(out.total)} − Input {f(inp.total)}</span>
        </div>

        <Section title={`Output ${isVat ? 'VAT' : 'GST'} (on sales)`} lines={out.lines} />
        <Section title={`Input ${isVat ? 'VAT' : 'GST'} (on purchases)`} lines={inp.lines} />
        <Section title={`${isVat ? 'WHT' : 'TDS'} Payable (we withheld)`} lines={wh.payableLines} />
        <Section title={`${isVat ? 'WHT' : 'TDS'} Receivable (withheld from us)`} lines={wh.receivableLines} />
      </>)}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   HR & PAYROLL — SELF-SERVICE (9 screens)
   ════════════════════════════════════════════════════════════════════ */

/* ── HR seed data ─────────────────────────────────────────────────── */

