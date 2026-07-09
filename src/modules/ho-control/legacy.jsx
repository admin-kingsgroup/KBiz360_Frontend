/* ════════════════════════════════════════════════════════════════════
   MODULES/HO-CONTROL.JSX
   NOTE: the "HO Control Center" prototype was removed (no Head Office in the
   TK Group model — six equal peer branches). What remains here are the real,
   non-HO screens that happened to live in this file: Group Dashboard/Bookings,
   Period Locking, Banking API, Statutory Filing Register, Delegations Manager.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Check, ChevronDown, Download, Lock, Plus, Save, Settings } from 'lucide-react';
import { Menu as DropdownMenu } from '../../core/ux/Menu';
import { Legend, Line } from 'recharts';
import { BRANCHES, EXP_ACTUALS, FX_RATES, GP_BILLS } from '../../core/data';
import { fmt, fmtINR } from '../../core/format';
import { ACTIVE_DELEGATIONS, GROUP_BOOKINGS, GROUP_DASH_DATA, PERIOD_LOCK_DATA, STATUTORY_FILINGS, cardStyle } from '../../core/helpers';
import { useMobile } from '../../core/hooks';
import { useModalEsc } from '../../core/ux/useModalEsc';
import { B, FL, RPT_tdStyle, RPT_thStyle, btnG, btnGh, card, inp, tabBtnStyle } from '../../core/styles';
import { CUR_MONTH, MONTH_OPTIONS, monthLabel, rangeNote } from '../../core/dates';
import { Dashboard } from '../dashboard';
import { useQueries, useQuery } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { clickable } from '../../core/ux/clickable';

// ── Live consolidated group data (all branches, INR-normalised) ──────────────
// Replaces the old GROUP_DASH_DATA / GP_BILLS seed: per-branch P&L + invoice GP,
// plus group cash (Trial Balance) + overdue receivables (Ageing) + top customers.
function useGroupLive(period) {
  const from = `${period}-01`, to = `${period}-31`;
  const brs = BRANCHES.filter((b) => b.code && b.code !== 'ALL');
  const pq = useQueries({ queries: brs.map((b) => ({ queryKey: ['accounting', 'pnl', b.code, from, to], queryFn: () => apiGet('/api/accounting/profit-and-loss', { branch: b.code, from, to }) })) });
  const iq = useQueries({ queries: brs.map((b) => ({ queryKey: ['accounting', 'invoice-gp', b.code, from, to], queryFn: () => apiGet('/api/accounting/invoice-gp', { branch: b.code, from, to }) })) });
  const tb = useQuery({ queryKey: ['accounting', 'tb', 'ALL', from, to], queryFn: () => apiGet('/api/accounting/trial-balance', { from, to }) });
  const ag = useQuery({ queryKey: ['accounting', 'ageing', 'ALL'], queryFn: () => apiGet('/api/accounting/ageing', {}) });
  const invAll = useQuery({ queryKey: ['accounting', 'invoice-gp', 'ALL', from, to], queryFn: () => apiGet('/api/accounting/invoice-gp', { from, to }) });

  const rows = brs.map((b, i) => {
    const p = pq[i].data || {}, inv = iq[i].data || {};
    const rev = (p.trading && p.trading.creditTotal) || 0;
    const cost = (p.trading && p.trading.debitTotal) || 0;
    const gp = p.grossProfit || 0;
    const exp = (p.indirect && p.indirect.debitTotal) || 0;
    const np = p.netProfit || 0;
    const rate = FX_RATES[b.currency] || 1;
    return { code: b.code, flag: b.flag, city: b.city, cur: b.currency, rate, rev, cost, gp, exp, np, gpPct: rev > 0 ? +(gp / rev * 100).toFixed(1) : 0, books: ((inv.rows) || []).length, revINR: rev * rate, costINR: cost * rate, gpINR: gp * rate, npINR: np * rate };
  });
  const totals = rows.reduce((a, r) => ({ rev: a.rev + r.revINR, cost: a.cost + r.costINR, gp: a.gp + r.gpINR, np: a.np + r.npINR, books: a.books + r.books }), { rev: 0, cost: 0, gp: 0, np: 0, books: 0 });
  totals.gpPct = totals.rev > 0 ? +(totals.gp / totals.rev * 100).toFixed(1) : 0;
  const tbRows = (tb.data && tb.data.rows) || [];
  const cash = Math.round(tbRows.filter((r) => /bank|cash/i.test(r.group || '')).reduce((s, r) => s + ((r.closingDebit || 0) - (r.closingCredit || 0)), 0));
  const recv = (ag.data && ag.data.receivables) || { rows: [], totals: {} };
  const overdue = { amount: Math.round(recv?.totals?.total || 0), count: (recv.rows || []).length, over90: Math.round(recv?.totals?.d90 || 0) };
  const cmap = {}; ((invAll.data && invAll.data.rows) || []).forEach((r) => { cmap[r.party || '—'] = (cmap[r.party || '—'] || 0) + (r.sale || 0); });
  const topCustomers = Object.entries(cmap).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  const loading = pq.some((q) => q.isLoading) || iq.some((q) => q.isLoading) || tb.isLoading || ag.isLoading || invAll.isLoading;
  return { rows, totals, cash, overdue, topCustomers, loading };
}
import { PHASE2_Page } from '../../shell/PHASE2_Page';

export function GroupDashboard(){
  const mob=useMobile();
  const [period,setPeriod]=useState(CUR_MONTH);
  const PERIODS=MONTH_OPTIONS;

  // Live, consolidated across all branches (INR-normalised) — no seed.
  const { rows: branchData, totals, loading } = useGroupLive(period);
  const groupRevINR=totals.rev;
  const groupGPINR =totals.gp;
  const groupNPINR =totals.np;
  const groupGPPct =totals.gpPct;

  const fmt=n=>"₹"+Number(Math.round(n/1000)).toLocaleString()+"K";
  const fmtL=n=>"₹"+(n/100000).toFixed(1)+"L";

  const METRICS=[
    {k:"gpPct",l:"GP%",hi:v=>v>=15,lo:v=>v<10,fmt:v=>`${v}%`},
    {k:"books",l:"Bookings",hi:v=>v>=5,lo:v=>v<2,fmt:v=>String(v)},
    {k:"revINR",l:"Rev (INR)",hi:v=>v>=500000,lo:v=>v<100000,fmt:v=>fmtL(v)},
    {k:"npINR",l:"Net Profit",hi:v=>v>0,lo:v=>v<0,fmt:v=>fmtL(v)},
  ];

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#0d1326,#185FA5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🌍</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Group Executive Dashboard</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>All branches · INR-normalised · {monthLabel(period)}</p>
            <p style={{margin:"3px 0 0",fontSize:11,color:"#185FA5",fontWeight:600}}>📅 {rangeNote('month',{month:period})} · use the period selector to change</p>
          </div>
        </div>
        <DropdownMenu
          ariaLabel="Period"
          menuRole="listbox"
          items={PERIODS.map(p=>({key:p.v,label:p.l,selected:period===p.v,onSelect:()=>setPeriod(p.v)}))}
          renderTrigger={({ref,toggle,triggerProps})=>(
            <button ref={ref} {...triggerProps} onClick={toggle} type="button"
              style={{...inp,display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,width:"auto",minHeight:32,fontSize:11,cursor:"pointer",textAlign:"left"}}>
              {monthLabel(period)}
              <ChevronDown size={14} style={{color:"#5b616e",flexShrink:0}}/>
            </button>
          )}
        />
      </div>

      {loading&&<div style={{margin:"0 0 12px",padding:"9px 14px",borderRadius:9,background:"#E6F1FB",border:"1px solid #B5D4F4",fontSize:11,color:"#185FA5",fontWeight:600}}>⏳ Loading live group data…</div>}

      {/* Group KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10,marginBottom:16}}>
        {[
          {l:"Group Revenue (INR)",v:fmtL(groupRevINR),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Group Gross Profit",v:fmtL(groupGPINR),c:"#27500A",bg:"#EAF3DE"},
          {l:"Group GP%",v:`${groupGPPct}%`,c:groupGPPct>=12?"#27500A":"#A32D2D",bg:groupGPPct>=12?"#EAF3DE":"#FCEBEB"},
          {l:"Group Net Profit",v:fmtL(groupNPINR),c:"#854F0B",bg:"#FAEEDA"},
          {l:"Total Bookings",v:String(branchData.reduce((s,b)=>s+b.books,0)),c:"#384677",bg:"#f3f4f8"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"12px 14px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase",letterSpacing:"0.4px"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:mob?18:24,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Branch Heat Map */}
      <p style={{margin:"0 0 8px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Branch Performance Heat Map</p>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:16}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead>
            <tr style={{background:"#0d1326"}}>
              <th style={{padding:"9px 14px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:10}}>Branch</th>
              {METRICS.map(m=><th key={m.k} style={{padding:"9px 14px",textAlign:"center",color:"#d4a437",fontWeight:700,fontSize:10}}>{m.l}</th>)}
              <th style={{padding:"9px 14px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:10}}>Local Revenue</th>
              <th style={{padding:"9px 14px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:10}}>INR Equiv.</th>
              <th style={{padding:"9px 14px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:10}}>Contribution</th>
            </tr>
          </thead>
          <tbody>
            {branchData.map((b,i)=>(
              <tr key={b.code} style={{borderBottom:"1px solid #dfe2e7",background:"#fff"}}>
                <td style={{padding:"11px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:20}}>{b.flag}</span>
                    <div>
                      <p style={{margin:0,fontWeight:800,color:"#0d1326",fontSize:13}}>{b.code}</p>
                      <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{b.city}</p>
                    </div>
                  </div>
                </td>
                {METRICS.map(m=>{
                  const v=b[m.k];
                  const hi=m.hi(v),lo=m.lo(v);
                  return (
                    <td key={m.k} style={{padding:"11px 14px",textAlign:"center"}}>
                      <span style={{padding:"4px 12px",borderRadius:999,fontWeight:700,fontSize:12,
                        background:hi?"#EAF3DE":lo?"#FCEBEB":"#FAEEDA",
                        color:hi?"#27500A":lo?"#A32D2D":"#854F0B"}}>
                        {m.fmt(v)}
                      </span>
                    </td>
                  );
                })}
                <td style={{padding:"11px 14px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:600}}>
                  {b.cur}{Number(Math.round(b.rev)).toLocaleString()}
                </td>
                <td style={{padding:"11px 14px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:700}}>
                  ₹{Number(Math.round(b.revINR/1000)).toLocaleString()}K
                </td>
                <td style={{padding:"11px 14px",textAlign:"right"}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
                    <span style={{fontWeight:700,fontSize:12}}>{groupRevINR>0?Math.round(b.revINR/groupRevINR*100):0}%</span>
                    <div style={{width:60,height:4,borderRadius:2,background:"#e1e3ec",overflow:"hidden"}}>
                      <div style={{width:`${groupRevINR>0?Math.round(b.revINR/groupRevINR*100):0}%`,height:"100%",background:"#185FA5",borderRadius:2}}/>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
              <td style={{padding:"11px 14px",fontWeight:700,color:"#d4a437",fontSize:12}}>GROUP TOTAL</td>
              {METRICS.map(m=><td key={m.k} style={{padding:"11px 14px",textAlign:"center",color:"#8b94b3"}}>—</td>)}
              <td style={{padding:"11px 14px",textAlign:"right",color:"#8b94b3"}}>INR</td>
              <td style={{padding:"11px 14px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>
                ₹{Number(Math.round(groupRevINR/1000)).toLocaleString()}K
              </td>
              <td style={{padding:"11px 14px",textAlign:"right",fontWeight:800,color:"#d4a437"}}>100%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Consolidated P&L */}
      <p style={{margin:"0 0 8px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Consolidated P&L — INR Equivalent</p>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:16}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead>
            <tr style={{background:"#0d1326"}}>
              <th style={{padding:"9px 12px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:10}}>P&L Line</th>
              {branchData.map(b=><th key={b.code} style={{padding:"9px 12px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:10}}>{b.flag} {b.code}</th>)}
              <th style={{padding:"9px 12px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:10,background:"rgba(212,164,55,0.15)"}}>GROUP</th>
            </tr>
          </thead>
          <tbody>
            {[
              {l:"Revenue",key:"revINR",bold:false},
              {l:"Cost of Sales",key:"cost",bold:false,rate:true},
              {l:"GROSS PROFIT",key:"gpINR",bold:true},
              {l:"GP%",key:"gpPct",bold:false,pct:true},
              {l:"Indirect Expenses",key:"exp",bold:false,rate:true},
              {l:"NET PROFIT",key:"npINR",bold:true},
            ].map((row,ri)=>(
              <tr key={ri} style={{borderBottom:"1px solid #dfe2e7",background:row.bold?"#f9fafb":"#fff"}}>
                <td style={{padding:"9px 12px",fontWeight:row.bold?700:400,color:row.bold?"#0d1326":"#384677",fontSize:row.bold?12:11.5}}>{row.l}</td>
                {branchData.map(b=>{
                  const v=row.pct?b[row.key]:(row.rate?Math.round(b[row.key]*b.rate):Math.round(b[row.key]));
                  return (
                    <td key={b.code} style={{padding:"9px 12px",textAlign:"right",fontWeight:row.bold?700:400,
                      fontVariantNumeric:"tabular-nums",fontSize:row.bold?12:11,
                      color:row.pct?(v>=12?"#27500A":"#A32D2D"):row.key==="npINR"?(v>0?"#27500A":"#A32D2D"):"#384677"}}>
                      {row.pct?`${v}%`:`₹${Number(Math.abs(v)/1000).toFixed(0)}K`}
                    </td>
                  );
                })}
                <td style={{padding:"9px 12px",textAlign:"right",fontWeight:row.bold?800:500,
                  fontVariantNumeric:"tabular-nums",fontSize:row.bold?14:11.5,
                  background:"rgba(212,164,55,0.05)",
                  color:row.key==="npINR"?(groupNPINR>0?"#27500A":"#A32D2D"):row.key==="gpINR"?"#185FA5":"#384677"}}>
                  {row.pct?`${groupGPPct}%`:row.key==="gpINR"?fmtL(groupGPINR):row.key==="npINR"?fmtL(groupNPINR):`₹${Number(Math.abs(branchData.reduce((s,b)=>s+(row.rate?b[row.key.replace("INR","")]*b.rate:b[row.key]),0))/1000).toFixed(0)}K`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PHASE 4 — TAX COMPLIANCE CALENDAR  /tax/calendar
   ════════════════════════════════════════════════════════════════ */

export function GroupBookings({branch,setRoute}){
  const mob=useMobile();
  const [groups,setGroups]=useState(GROUP_BOOKINGS);
  const [sel,setSel]=useState(null);
  const [tab,setTab]=useState("list"); // list | detail
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const STATUS_CLR={"Quote Sent":"#854F0B","Deposit Paid":"#185FA5",Confirmed:"#27500A",Completed:"#5a6691",Cancelled:"#A32D2D"};
  const STATUS_BG ={"Quote Sent":"#FAEEDA","Deposit Paid":"#E6F1FB",Confirmed:"#EAF3DE",Completed:"#f3f4f8",Cancelled:"#FCEBEB"};
  const TYPE_CLR={MICE:"#A32D2D","FIT Group":"#185FA5","GIT":"#854F0B"};
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const selGrp=sel?groups.find(g=>g.id===sel):null;

  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>👨‍👩‍👧‍👦</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Group Booking Manager</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{groups.length} groups · {groups.reduce((s,g)=>s+g.pax,0)} total pax · GIT / MICE / FIT Groups</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> New Group</button>
          <button onClick={()=>setRoute("/sales/holiday")} style={{...btnGh,fontSize:11}}>→ Holiday Invoice</button>
        </div>
      </div>

      {/* Group cards */}
      {!selGrp&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(350px,1fr))",gap:12,marginBottom:12}}>
        {groups.map(g=>(
          <div key={g.id} {...clickable(()=>setSel(g.id))} style={{...card,cursor:"pointer",borderLeft:`4px solid ${STATUS_CLR[g.status]||"#384677"}`,transition:"transform 0.1s"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)"}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                  <span style={{fontFamily:"monospace",fontSize:9,padding:"1px 6px",borderRadius:4,background:"#0d1326",color:"#d4a437"}}>{g.id}</span>
                  <span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:STATUS_BG[g.status],color:STATUS_CLR[g.status]}}>{g.status}</span>
                  <span style={{fontSize:9,padding:"1px 6px",borderRadius:999,fontWeight:700,background:(TYPE_CLR[g.type]||"#384677")+"22",color:TYPE_CLR[g.type]||"#384677"}}>{g.type}</span>
                </div>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>{g.name}</p>
                <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>📍 {g.dest} · ✈ {g.airline} · 🏨 {g.hotel}</p>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{margin:0,fontSize:14,fontWeight:800,color:"#0d1326"}}>{g.pax} pax</p>
                <p style={{margin:"1px 0 0",fontSize:9.5,color:"#5a6691"}}>✈ {g.travel}</p>
              </div>
            </div>
            {/* Rooms */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              {g.rooms.map((r,ri)=><span key={ri} style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,background:"#f3f4f8",color:"#384677"}}>{r.qty}× {r.type} ({r.pax} pax)</span>)}
            </div>
            {/* Financials */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <div style={{textAlign:"center",flex:1}}><div style={{fontSize:10,color:"#5a6691"}}>Total Value</div><div style={{fontWeight:700,fontSize:13}}>{f(g.total)}</div></div><div style={{textAlign:"center",flex:1}}><div style={{fontSize:10,color:"#5a6691"}}>Deposit Paid</div><div style={{fontWeight:700,fontSize:13}}>{f(g.deposit)}</div></div><div style={{textAlign:"center",flex:1}}><div style={{fontSize:10,color:"#A32D2D"}}>Outstanding</div><div style={{fontWeight:700,fontSize:13,color:"#A32D2D"}}>{f(g.total-g.deposit)}</div></div>
            </div>
            <div style={{marginTop:10,display:"flex",gap:6}}>
              <button onClick={e=>{e.stopPropagation();setSel(g.id);}} style={{...btnG,fontSize:10,padding:"4px 12px",flex:1}}>📋 Rooming List</button>
              <button onClick={e=>{e.stopPropagation();setRoute("/sales/holiday");}} style={{...btnGh,fontSize:10,padding:"4px 10px"}}>📄 Invoice</button>
            </div>
          </div>
        ))}
      </div>}

      {/* Detail view */}
      {selGrp&&(
        <div style={{...card}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                <button onClick={()=>setSel(null)} style={{...btnGh,padding:"3px 10px",fontSize:10}}>← Back</button>
                <span style={{fontWeight:700,fontSize:14,color:"#0d1326"}}>{selGrp.name}</span>
                <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[selGrp.status],color:STATUS_CLR[selGrp.status]}}>{selGrp.status}</span>
              </div>
              <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{selGrp.dest} · {selGrp.travel} · {selGrp.pax} pax · Leader: {selGrp.leader}</p>
            </div>
            <button onClick={()=>setRoute("/sales/holiday")} style={{...btnG,fontSize:11}}>📄 Generate Invoice</button>
          </div>
          {/* Rooming list */}
          <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Rooming List</p>
          <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{background:"#0d1326"}}>{["#","Guest Name","Room Type","Check-in","Check-out","Notes"].map((h,i)=><th key={i} style={{padding:"7px 12px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>{h}</th>)}</tr></thead>
              <tbody>{Array.from({length:Math.min(selGrp.pax,6)}).map((_,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"7px 12px",color:"#5a6691"}}>{i+1}</td>
                  <td style={{padding:"7px 12px"}}><input defaultValue={`Guest ${i+1}`} style={{...inp,minHeight:28,fontSize:10.5,padding:"3px 8px"}}/></td>
                  <td style={{padding:"7px 12px"}}><select style={{...inp,minHeight:28,fontSize:10.5}}>{selGrp.rooms.map(r=><option key={r.type}>{r.type}</option>)}</select></td>
                  <td style={{padding:"7px 12px"}}><input type="date" defaultValue={selGrp.travel} style={{...inp,minHeight:28,fontSize:10.5}}/></td>
                  <td style={{padding:"7px 12px"}}><input type="date" style={{...inp,minHeight:28,fontSize:10.5}}/></td>
                  <td style={{padding:"7px 12px"}}><input placeholder="Dietary, birthday..." style={{...inp,minHeight:28,fontSize:10.5}}/></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={{...btnG,fontSize:11}}>💾 Save Rooming List</button>
            <button style={{...btnGh,fontSize:11}}>📧 Email to Hotel</button>
            <button style={{...btnGh,fontSize:11}}><Download size={12}/> Excel Manifest</button>
          </div>
        </div>
      )}

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>New Group Booking</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Group name"><input style={inp} placeholder="e.g. Sharma Family Trip"/></FL>
                <FL label="Type"><select style={inp}><option>FIT Group</option><option>GIT</option><option>MICE</option></select></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <FL label="Destination"><input style={inp}/></FL>
                <FL label="Pax count"><input type="number" defaultValue={10} style={inp}/></FL>
                <FL label="Travel date"><input type="date" style={inp}/></FL>
              </div>
              <FL label="Group leader / contact"><input style={inp}/></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={()=>setModal(false)} style={btnG}>Create Group</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── DESTINATION INTELLIGENCE ────────────────────────────────── */

export function PeriodLocking({branch,setRoute}){
  const mob=useMobile();

  const locked=PERIOD_LOCK_DATA.filter(p=>p.status==="Locked").length;
  const open=PERIOD_LOCK_DATA.filter(p=>p.status==="Open").length;
  const soft=PERIOD_LOCK_DATA.filter(p=>p.status==="Soft Lock").length;
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>🔒 Period Locking</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Prevent backdated postings into closed accounting periods · Per-branch · Admin-only unlock</p>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Locked Periods</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{locked}</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Soft Locks</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{soft}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>Warning only</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Open Periods</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{open}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Branches</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>2</p></div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Branch</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Period</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Status</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Locked By</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Locked On</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Reason</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Action</th>
            </tr></thead>
            <tbody>
              {PERIOD_LOCK_DATA.map((p,i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
                  <td style={{padding:"7px 8px",textAlign:"center",fontWeight:700}}>{p.branch}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontFamily:"monospace"}}>{p.period}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}>
                    <span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:p.status==="Locked"?"#FCEBEB":p.status==="Soft Lock"?"#FAEEDA":"#EAF3DE",color:p.status==="Locked"?"#A32D2D":p.status==="Soft Lock"?"#854F0B":"#27500A"}}>
                      {p.status==="Locked"?"🔒 ":p.status==="Soft Lock"?"⚠ ":"🔓 "}{p.status}
                    </span>
                  </td>
                  <td style={{padding:"7px 8px",fontSize:10}}>{p.lockedBy}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{p.lockedOn}</td>
                  <td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>{p.reason}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}>
                    {p.status==="Open"?<button style={{padding:"3px 10px",border:"none",background:"#A32D2D",color:"#fff",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer"}}>Lock</button>:<button style={{padding:"3px 10px",border:"1px solid #185FA5",background:"#fff",color:"#185FA5",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer"}}>Unlock</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{marginTop:12,fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>
        💡 Hard Lock — no posting/editing allowed · Soft Lock — admin warning shown but posting permitted · Open — free editing
      </p>
    </div>
  );
}


export function BankingApiSettings({branch,setRoute}){
  const mob=useMobile();
  const BANK_INTEGRATIONS=[];
  const connected=BANK_INTEGRATIONS.filter(b=>b.status==="Connected").length;
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>🏦 Banking API Integration</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Real-time bank balance · Auto-reconciliation · Bulk NEFT/RTGS initiation</p>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Connected Banks</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{connected}</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Pending</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{BANK_INTEGRATIONS.filter(b=>b.status==="Pending").length}</p></div>
        <div style={{...card,borderTop:"3px solid #5a6691"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Manual Only</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#5a6691"}}>{BANK_INTEGRATIONS.filter(b=>b.status==="Manual").length}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Live Balance Total</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}} title="Live bank-balance aggregation isn’t wired on this screen yet">—</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>Aggregated INR</p></div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Bank / Integration</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Branch</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Account #</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Status</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Last Sync</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Features</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Action</th>
            </tr></thead>
            <tbody>
              {BANK_INTEGRATIONS.map((b,i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
                  <td style={{padding:"7px 8px",fontWeight:600}}>{b.bank}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{b.branch}</td>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#5a6691"}}>{b.account}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:b.status==="Connected"?"#EAF3DE":b.status==="Pending"?"#FAEEDA":"#f3f4f8",color:b.status==="Connected"?"#27500A":b.status==="Pending"?"#854F0B":"#5a6691"}}>{b.status==="Connected"?"●":b.status==="Pending"?"⏱":"○"} {b.status}</span></td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{b.lastSync}</td>
                  <td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>{b.features.join(" · ")}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><button style={{padding:"3px 10px",border:b.status==="Connected"?"1px solid #185FA5":"none",background:b.status==="Connected"?"#fff":"#d4a437",color:b.status==="Connected"?"#185FA5":"#0d1326",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer"}}>{b.status==="Connected"?"⚙ Configure":"+ Connect"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
/* ════════════════════════════════════════════════════════════════════
   STATUTORY FILING REGISTER  (compliance filings register)
   ════════════════════════════════════════════════════════════════════ */

export function StatutoryFilingRegister(){
  const [filter,setFilter]=useState("ALL");
  const statuses=["Filed","In Progress","Due Today","Pending","Overdue"];
  const filtered=filter==="ALL"?STATUTORY_FILINGS:STATUTORY_FILINGS.filter(f=>f.status===filter);
  const filed=STATUTORY_FILINGS.filter(f=>f.status==="Filed").length;
  const pending=STATUTORY_FILINGS.filter(f=>f.status==="Pending"||f.status==="In Progress").length;
  const dueToday=STATUTORY_FILINGS.filter(f=>f.status==="Due Today").length;
  const statusStyle={Filed:{bg:"#d4edda",color:"#155724"},"In Progress":{bg:"#cfe2ff",color:"#004085"},"Due Today":{bg:"#f8d7da",color:"#721c24"},Pending:{bg:"#fff3cd",color:"#856404"},Overdue:{bg:"#f8d7da",color:"#721c24"}};
  return(
    <PHASE2_Page title="Statutory Filing Register"
      subtitle="Central register of statutory filings across the group · single source of truth"
      toolbar={<><select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}><option value="ALL">All statuses</option>{statuses.map(s=><option key={s}>{s}</option>)}</select><button style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>📥 Export Register</button></>}>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Filed (Month)",v:filed,c:"#22c55e"},{l:"In Progress",v:pending,c:"#3b82f6"},{l:"Due Today",v:dueToday,c:"#A32D2D"},{l:"Filing Owner",v:"Faiz / Sughra",c:"#0d1326",small:true}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"4px 0 0",fontSize:k.small?14:22,fontWeight:700,color:k.c}}>{k.v}</p></div>
        ))}
      </div>

      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#f7f8fb"}}>
            <th style={RPT_thStyle}>Filing ID</th>
            <th style={RPT_thStyle}>Type</th>
            <th style={RPT_thStyle}>Entity</th>
            <th style={RPT_thStyle}>Period</th>
            <th style={RPT_thStyle}>Due Date</th>
            <th style={{...RPT_thStyle,textAlign:"center"}}>Status</th>
            <th style={RPT_thStyle}>Filed By</th>
            <th style={RPT_thStyle}>Acknowledgment</th>
            <th style={{...RPT_thStyle,textAlign:"center"}}>Action</th>
          </tr></thead>
          <tbody>{filtered.map(f=>(
            <tr key={f.id} style={{borderBottom:"1px solid #dfe2e7",background:f.status==="Due Today"?"#fff8e8":"#fff"}}>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5,color:"#5a6691"}}>{f.id}</td>
              <td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:"#e6e8f1",borderRadius:3,fontSize:10.5,fontWeight:700}}>{f.type}</span></td>
              <td style={{...RPT_tdStyle,fontWeight:600}}>{f.entity}</td>
              <td style={RPT_tdStyle}>{f.period}</td>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",color:f.dueDate<="2026-05-20"?"#A32D2D":"#0d1326",fontWeight:600}}>{f.dueDate}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"3px 10px",borderRadius:3,fontSize:10,fontWeight:700,background:(statusStyle[f.status]||{}).bg,color:(statusStyle[f.status]||{}).color}}>{f.status}</span></td>
              <td style={{...RPT_tdStyle,fontSize:11}}>{f.filedBy!=="-"?f.filedBy:<span style={{color:"#5a6691"}}>—</span>}</td>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5,color:f.ack!=="-"?"#22c55e":"#5a6691",fontWeight:600}}>{f.ack}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}>
                {f.status==="Filed"?
                  <button style={{padding:"3px 8px",background:"transparent",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:3,fontSize:10,cursor:"pointer"}}>View</button>:
                  <button style={{padding:"3px 10px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>File Now</button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   2. DELEGATIONS MANAGER  (full-page view)
   ════════════════════════════════════════════════════════════════════ */

export function DelegationsManager(){
  const all=[
    ...ACTIVE_DELEGATIONS,
    {id:"DG-003",delegator:"Faiz Patel",delegatee:"Sughra Sayed",scope:"Approvals up to ₹5L",from:"2026-03-12",to:"2026-03-19",reason:"Health · 1 week medical leave",status:"Completed",approvedBy:"Afshin Dhanani"},
    {id:"DG-004",delegator:"Afshin Dhanani",delegatee:"Faiz Patel",scope:"All Director approvals (with notification)",from:"2026-02-05",to:"2026-02-12",reason:"International travel — UAE business",status:"Completed",approvedBy:"Self (Director)"},
  ];
  const active=all.filter(d=>d.status==="Approved"||d.status==="Scheduled").length;
  return(
    <PHASE2_Page title="Delegations Manager"
      subtitle="All vacation back-up & temporary authority delegations · explicit, time-bound, fully logged"
      toolbar={<button style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Create Delegation</button>}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Active Delegations",v:active,c:"#22c55e"},{l:"Completed (YTD)",v:all.filter(d=>d.status==="Completed").length,c:"#5a6691"},{l:"Avg Duration",v:"—",c:"#3b82f6"},{l:"Pending Approval",v:all.filter(d=>d.status==="Pending Approval"||d.status==="Pending").length,c:"#f97316"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"4px 0 0",fontSize:18,fontWeight:700,color:k.c}}>{k.v}</p></div>
        ))}
      </div>
      <div style={cardStyle}>
        <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>All Delegations (Active + Historical)</p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>ID</th><th style={RPT_thStyle}>From</th><th style={RPT_thStyle}>To</th><th style={RPT_thStyle}>Scope</th><th style={RPT_thStyle}>Period</th><th style={RPT_thStyle}>Reason</th><th style={RPT_thStyle}>Approved By</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
          <tbody>{all.map(d=>(
            <tr key={d.id} style={{borderBottom:"1px solid #dfe2e7"}}>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5,color:"#5a6691"}}>{d.id}</td>
              <td style={{...RPT_tdStyle,fontWeight:700}}>{d.delegator}</td>
              <td style={{...RPT_tdStyle,fontWeight:700,color:"#d4a437"}}>→ {d.delegatee}</td>
              <td style={{...RPT_tdStyle,fontSize:11}}>{d.scope}</td>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:11}}>{d.from} → {d.to}</td>
              <td style={{...RPT_tdStyle,fontSize:11,color:"#5a6691"}}>{d.reason}</td>
              <td style={{...RPT_tdStyle,fontSize:11}}>{d.approvedBy}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"3px 9px",borderRadius:3,fontSize:10,fontWeight:700,background:d.status==="Approved"?"#d4edda":d.status==="Scheduled"?"#cfe2ff":d.status==="Completed"?"#e2e3e5":"#fff3cd",color:d.status==="Approved"?"#155724":d.status==="Scheduled"?"#004085":d.status==="Completed"?"#383d41":"#856404"}}>{d.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </PHASE2_Page>
  );
}
