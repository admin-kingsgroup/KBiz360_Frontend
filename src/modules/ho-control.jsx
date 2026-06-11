/* ════════════════════════════════════════════════════════════════════
   MODULES/HO-CONTROL.JSX
   Auto-generated from KBiz360_v2.jsx · 1428 lines · 16 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Check, Download, Lock, Plus, Save, Settings } from 'lucide-react';
import { Legend, Line } from 'recharts';
import { BRANCHES, EXP_ACTUALS, FX_RATES, GP_BILLS } from '../core/data';
import { fmt, fmtINR } from '../core/format';
import { ACTIVE_DELEGATIONS, AUDIT_QUEUE_DATA, AUTH_INITIAL_MASTER, AUTH_INITIAL_TXN, GROUP_BOOKINGS, GROUP_DASH_DATA, PERIOD_LOCK_DATA, PERIOD_LOCK_STATE, STATUTORY_FILINGS, cardStyle } from '../core/helpers';
import { useMobile } from '../core/hooks';
import { B, FL, RPT_tdStyle, RPT_thStyle, btnG, btnGh, card, inp, tabBtnStyle } from '../core/styles';
import { CUR_MONTH, MONTH_OPTIONS, monthLabel, rangeNote } from '../core/dates';
import { Dashboard } from './dashboard';
import { useQueries, useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/api';

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
    return { code: b.code, flag: b.flag, city: b.city, cur: b.cur, rate, rev, cost, gp, exp, np, gpPct: rev > 0 ? +(gp / rev * 100).toFixed(1) : 0, books: ((inv.rows) || []).length, revINR: rev * rate, costINR: cost * rate, gpINR: gp * rate, npINR: np * rate };
  });
  const totals = rows.reduce((a, r) => ({ rev: a.rev + r.revINR, cost: a.cost + r.costINR, gp: a.gp + r.gpINR, np: a.np + r.npINR, books: a.books + r.books }), { rev: 0, cost: 0, gp: 0, np: 0, books: 0 });
  totals.gpPct = totals.rev > 0 ? +(totals.gp / totals.rev * 100).toFixed(1) : 0;
  const tbRows = (tb.data && tb.data.rows) || [];
  const cash = Math.round(tbRows.filter((r) => /bank|cash/i.test(r.group || '')).reduce((s, r) => s + ((r.closingDebit || 0) - (r.closingCredit || 0)), 0));
  const recv = (ag.data && ag.data.receivables) || { rows: [], totals: {} };
  const overdue = { amount: Math.round(recv.totals.total || 0), count: (recv.rows || []).length, over90: Math.round(recv.totals.d90 || 0) };
  const cmap = {}; ((invAll.data && invAll.data.rows) || []).forEach((r) => { cmap[r.party || '—'] = (cmap[r.party || '—'] || 0) + (r.sale || 0); });
  const topCustomers = Object.entries(cmap).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  const loading = pq.some((q) => q.isLoading) || tb.isLoading || ag.isLoading;
  return { rows, totals, cash, overdue, topCustomers, loading };
}
import { PHASE2_Page } from '../shell/PHASE2_Page';

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
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#0d1326,#185FA5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🌍</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Group Executive Dashboard</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>All branches · INR-normalised · {monthLabel(period)}</p>
            <p style={{margin:"3px 0 0",fontSize:11,color:"#185FA5",fontWeight:600}}>📅 {rangeNote('month',{month:period})} · use the period selector to change</p>
          </div>
        </div>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
      </div>

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
              <tr key={b.code} style={{borderBottom:"1px solid #f3f4f8",background:"#fff"}}>
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
              <tr key={ri} style={{borderBottom:"1px solid #f3f4f8",background:row.bold?"#f9fafb":"#fff"}}>
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
  const [modal,setModal]=useState(false);
  const STATUS_CLR={"Quote Sent":"#854F0B","Deposit Paid":"#185FA5",Confirmed:"#27500A",Completed:"#5a6691",Cancelled:"#A32D2D"};
  const STATUS_BG ={"Quote Sent":"#FAEEDA","Deposit Paid":"#E6F1FB",Confirmed:"#EAF3DE",Completed:"#f3f4f8",Cancelled:"#FCEBEB"};
  const TYPE_CLR={MICE:"#A32D2D","FIT Group":"#185FA5","GIT":"#854F0B"};
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const selGrp=sel?groups.find(g=>g.id===sel):null;

  return(
    <div style={{padding:"12px 10px",maxWidth:1300,margin:"0 auto"}}>
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
          <div key={g.id} onClick={()=>setSel(g.id)} style={{...card,cursor:"pointer",borderLeft:`4px solid ${STATUS_CLR[g.status]||"#384677"}`,transition:"transform 0.1s"}}
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
                <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
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
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between"}}>
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
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8}}>
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
  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
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
                <tr key={i} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
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
  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1300,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>🏦 Banking API Integration</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Real-time bank balance · Auto-reconciliation · Bulk NEFT/RTGS initiation</p>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Connected Banks</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{connected}</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Pending</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{BANK_INTEGRATIONS.filter(b=>b.status==="Pending").length}</p></div>
        <div style={{...card,borderTop:"3px solid #5a6691"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Manual Only</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#5a6691"}}>{BANK_INTEGRATIONS.filter(b=>b.status==="Manual").length}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Live Balance Total</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>11.7M</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>Aggregated INR</p></div>
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
                <tr key={i} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
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


export const HO_ASSET_REQUESTS = [];


export const HO_LOCKED_VENDORS = [];


export const HO_BANK_CONTROL = [];


export function HOAssetProcurement(){
  const [filter,setFilter]=useState("ALL");
  const [showForm,setShowForm]=useState(false);
  const stages=["Sughra Review","Faiz Review","Pending Director","Approved","Ordered","Delivered"];
  const stageColors={"Sughra Review":"#6B4C8B","Faiz Review":"#0d1326","Pending Director":"#A32D2D","Approved":"#22c55e","Ordered":"#3b82f6","Delivered":"#22c55e"};
  const filtered=filter==="ALL"?HO_ASSET_REQUESTS:HO_ASSET_REQUESTS.filter(r=>r.stage===filter);
  const totalPending=HO_ASSET_REQUESTS.filter(r=>!["Approved","Ordered","Delivered"].includes(r.stage)).reduce((s,r)=>s+r.amount,0);
  const totalGSTRecoverable=HO_ASSET_REQUESTS.reduce((s,r)=>s+r.gst,0);
  const inp={padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%"};

  return(
    <PHASE2_Page title="HO Asset Procurement — Central Workflow"
      subtitle="All high-value assets routed through HO · consolidated GST input credit · vendor discount leverage"
      toolbar={<>
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,background:"#fff"}}>
          <option value="ALL">All stages</option>{stages.map(s=><option key={s}>{s}</option>)}
        </select>
        <button onClick={()=>setShowForm(!showForm)} style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ New Asset Request</button>
      </>}>

      {/* KPI tiles */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Pending Approval",v:HO_ASSET_REQUESTS.filter(r=>!["Approved","Ordered","Delivered"].includes(r.stage)).length,c:"#f97316"},{l:"Pending ₹ Value",v:fmtINR(totalPending),c:"#A32D2D"},{l:"GST Input Recoverable",v:fmtINR(totalGSTRecoverable),c:"#22c55e"},{l:"YTD Asset Capex",v:fmtINR(HO_ASSET_REQUESTS.reduce((s,r)=>s+r.amount,0)),c:"#0d1326"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"4px 0 0",fontSize:18,fontWeight:700,color:"#0d1326"}}>{k.v}</p></div>
        ))}
      </div>

      {/* New request form */}
      {showForm&&(
        <div style={{...cardStyle,marginBottom:14,borderTop:"3px solid #d4a437"}}>
          <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>New Asset Procurement Request</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Requesting Branch</label><select style={inp}><option>BOM</option><option>AMD</option></select></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Category</label><select style={inp}><option>IT Equipment</option><option>Furniture</option><option>Software</option><option>Vehicle</option><option>Capex / Renovation</option><option>Equipment</option></select></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Estimated Amount (₹)</label><input type="number" placeholder="0" style={{...inp,fontFamily:"monospace",fontWeight:700}}/></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Priority</label><select style={inp}><option>Normal</option><option>High</option><option>Urgent</option></select></div>
          </div>
          <div style={{marginBottom:10}}><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Item Description</label><input style={inp} placeholder="e.g. Dell Laptops × 5 — Latitude 5430"/></div>
          <div style={{marginBottom:10}}><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Business Justification</label><textarea rows={2} style={{...inp,fontFamily:"inherit",resize:"none"}} placeholder="Why is this required? Impact if not procured?"/></div>
          <div style={{padding:10,background:"#e8f0fe",border:"1px solid #b8d0f8",borderRadius:5,fontSize:11.5,color:"#1e3a5f",marginBottom:10}}>
            <b>Approval routing:</b> Up to ₹2L → Sughra Sayed · ₹2L-₹25L → Faiz Patel · Above ₹25L → Director Afshin Dhanani approval mandatory
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
            <button onClick={()=>setShowForm(false)} style={{padding:"8px 16px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
            <button style={{padding:"8px 18px",background:"#0d1326",color:"#d4a437",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>Submit Request</button>
          </div>
        </div>
      )}

      {/* Request table */}
      <div style={cardStyle}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#f7f8fb"}}>
              <th style={RPT_thStyle}>Request ID</th><th style={RPT_thStyle}>Branch</th>
              <th style={RPT_thStyle}>Requested By</th><th style={RPT_thStyle}>Item</th>
              <th style={RPT_thStyle}>Category</th>
              <th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th>
              <th style={{...RPT_thStyle,textAlign:"right"}}>GST</th>
              <th style={RPT_thStyle}>Supplier</th>
              <th style={{...RPT_thStyle,textAlign:"center"}}>Stage</th>
              <th style={{...RPT_thStyle,textAlign:"center"}}>Action</th>
            </tr></thead>
            <tbody>{filtered.map(r=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f0f2f7"}}>
                <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5,color:"#5a6691"}}>{r.id}</td>
                <td style={RPT_tdStyle}><span style={{padding:"2px 7px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{r.branch}</span></td>
                <td style={{...RPT_tdStyle,fontSize:11}}>{r.requestedBy}</td>
                <td style={{...RPT_tdStyle,fontWeight:600}}>{r.item}</td>
                <td style={{...RPT_tdStyle,fontSize:11,color:"#5a6691"}}>{r.category}</td>
                <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(r.amount)}</td>
                <td style={{...RPT_tdStyle,textAlign:"right",fontSize:11,color:"#22c55e",fontWeight:600}}>{r.gst>0?fmtINR(r.gst):"—"}</td>
                <td style={{...RPT_tdStyle,fontSize:11}}>{r.supplier}</td>
                <td style={{...RPT_tdStyle,textAlign:"center"}}>
                  <span style={{padding:"3px 9px",borderRadius:3,fontSize:10,fontWeight:700,background:(stageColors[r.stage]||"#5a6691")+"22",color:stageColors[r.stage]||"#0d1326"}}>{r.stage}</span>
                </td>
                <td style={{padding:"6px 12px",textAlign:"center",borderBottom:"1px solid #f0f2f7"}}>
                  <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                    {!["Approved","Ordered","Delivered"].includes(r.stage)&&<button style={{padding:"3px 8px",background:"#22c55e",color:"#fff",border:"none",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>Approve</button>}
                    <button style={{padding:"3px 8px",background:"transparent",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:3,fontSize:10,cursor:"pointer"}}>View</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* GST input optimization callout */}
      <div style={{marginTop:14,padding:14,background:"#fff8e8",border:"1px solid #fde68a",borderRadius:8,fontSize:11.5,color:"#856404"}}>
        <p style={{margin:"0 0 4px",fontWeight:700,fontSize:12,color:"#0d1326"}}>💡 Why route everything through HO?</p>
        <p style={{margin:0,lineHeight:1.5}}>(i) Consolidated GST input credit at HO (₹{(totalGSTRecoverable/100000).toFixed(1)}L YTD recoverable) — easier to track and claim. (ii) Volume discounts from vendors when negotiating across all branches. (iii) Cleaner asset register — assets "leased" to branches via monthly recharge. (iv) Single point of warranty/service contract management.</p>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   2. CENTRALIZED VENDOR MASTER LOCK  (Point D — vendor master)
   ════════════════════════════════════════════════════════════════════ */

export function HOVendorMasterLock(){
  return(
    <PHASE2_Page title="Centralized Vendor Master — HO Lock Control"
      subtitle="Critical vendor master data locked at HO · branches read-only on PAN, Bank A/c & Credit Terms"
      toolbar={<><button style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Lock New Vendor</button><button style={{padding:"7px 12px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>📥 Export Locked List</button></>}>

      <div style={{padding:14,background:"#fff5f5",border:"1px solid #fecaca",borderLeft:"3px solid #A32D2D",borderRadius:6,marginBottom:14,fontSize:11.5,color:"#721c24"}}>
        <p style={{margin:"0 0 4px",fontWeight:700,fontSize:12.5,color:"#A32D2D"}}>🔒 Why these vendors are locked at HO</p>
        <p style={{margin:0,lineHeight:1.5}}>The single biggest fraud vector in multi-branch ERP is a rogue branch staffer changing a supplier's bank account number to divert payments. Locking PAN, Bank A/c and Credit Terms at HO eliminates this risk. Branches use these vendors freely for transactions but cannot modify the locked fields. Every change attempt is logged.</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Locked Vendors",v:HO_LOCKED_VENDORS.length,c:"#0d1326"},{l:"Change Attempts (90d)",v:2,c:"#A32D2D"},{l:"Attempts Denied",v:2,c:"#22c55e"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:k.c}}>{k.v}</p></div>
        ))}
      </div>

      <div style={cardStyle}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#f7f8fb"}}>
              <th style={RPT_thStyle}>Vendor</th>
              <th style={RPT_thStyle}>Category</th>
              <th style={{...RPT_thStyle,textAlign:"center"}}>🔒 PAN</th>
              <th style={{...RPT_thStyle,textAlign:"center"}}>🔒 GSTIN</th>
              <th style={{...RPT_thStyle,textAlign:"center"}}>🔒 Bank A/c</th>
              <th style={{...RPT_thStyle,textAlign:"center"}}>🔒 Credit Terms</th>
              <th style={RPT_thStyle}>Locked By</th>
              <th style={RPT_thStyle}>Last Change Attempt</th>
            </tr></thead>
            <tbody>{HO_LOCKED_VENDORS.map(v=>(
              <tr key={v.id} style={{borderBottom:"1px solid #f0f2f7"}}>
                <td style={{...RPT_tdStyle,fontWeight:700}}>{v.name}</td>
                <td style={{...RPT_tdStyle,fontSize:11,color:"#5a6691"}}>{v.category}</td>
                <td style={{...RPT_tdStyle,textAlign:"center",fontFamily:"monospace",fontSize:11}}>{v.pan!=="-"?v.pan:<span style={{color:"#5a6691"}}>—</span>}</td>
                <td style={{...RPT_tdStyle,textAlign:"center",fontFamily:"monospace",fontSize:10}}>{v.gstin!=="-"?v.gstin:<span style={{color:"#5a6691"}}>—</span>}</td>
                <td style={{...RPT_tdStyle,textAlign:"center",fontFamily:"monospace",fontSize:11,fontWeight:700}}>{v.bank}</td>
                <td style={{...RPT_tdStyle,textAlign:"center",fontWeight:600}}>{v.credit}</td>
                <td style={{...RPT_tdStyle,fontSize:11}}>{v.lockedBy}<p style={{margin:0,fontSize:10,color:"#5a6691"}}>since {v.lockedSince}</p></td>
                <td style={{...RPT_tdStyle,fontSize:10.5,color:v.lastAttempt.includes("DENIED")?"#A32D2D":"#5a6691",fontWeight:v.lastAttempt.includes("DENIED")?700:400}}>{v.lastAttempt}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* Recent denied attempts log */}
      <div style={{...cardStyle,marginTop:14}}>
        <p style={{margin:"0 0 10px",fontSize:13,fontWeight:700,color:"#0d1326"}}>🚨 Recent Change-Attempt Log</p>
        {[].map((log,i)=>(
          <div key={i} style={{padding:"10px 12px",background:"#fff5f5",borderLeft:"3px solid #A32D2D",borderRadius:5,marginBottom:6,fontSize:11.5}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontWeight:700,color:"#0d1326"}}>{log.user}</span>
              <span style={{color:"#5a6691",fontSize:10.5}}>{log.date}</span>
            </div>
            <p style={{margin:"0 0 4px",color:"#0d1326"}}>Vendor: <b>{log.vendor}</b></p>
            <p style={{margin:"0 0 4px",color:"#5a6691"}}>Attempted: {log.attempted}</p>
            <p style={{margin:0,color:"#A32D2D",fontSize:10.5,fontWeight:700}}>🚫 {log.action} — {log.denyReason}</p>
          </div>
        ))}
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   3. BANKING RELATIONSHIP CONTROL  (Point D — banking)
   ════════════════════════════════════════════════════════════════════ */

export function HOBankingControl(){
  const totalHO=HO_BANK_CONTROL.filter(b=>b.controlLevel==="HO-Locked").reduce((s,b)=>s+b.balance,0);
  const totalOps=HO_BANK_CONTROL.filter(b=>b.controlLevel==="Branch-Op").reduce((s,b)=>s+b.balance,0);
  return(
    <PHASE2_Page title="Banking Relationship Control — HO Ownership"
      subtitle="HO finance team owns all banking relationships · branches transact only · cannot open/close accounts">
      <div style={{padding:14,background:"#e8f0fe",border:"1px solid #b8d0f8",borderLeft:"3px solid #3b82f6",borderRadius:6,marginBottom:14,fontSize:11.5,color:"#1e3a5f"}}>
        <p style={{margin:"0 0 4px",fontWeight:700,fontSize:12.5}}>🏦 Banking Control Model</p>
        <p style={{margin:0,lineHeight:1.5}}><b>HO-Locked accounts</b> (Treasury, Forex, Asset Procurement) — only HO finance (Faiz/Sughra) can transact. <b>Branch-Operational accounts</b> — branch AE can post day-to-day transactions but cannot change signatories, open new accounts, or close accounts. All bank relationship management (KYC updates, signatory changes, account opening) sits with Faiz Patel.</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        <div style={{...cardStyle,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>HO-Locked Accounts</p><p style={{margin:"4px 0 0",fontSize:18,fontWeight:700,color:"#0d1326"}}>{HO_BANK_CONTROL.filter(b=>b.controlLevel==="HO-Locked").length}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>{fmtINR(totalHO)} balance</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #22c55e"}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Branch-Operational</p><p style={{margin:"4px 0 0",fontSize:18,fontWeight:700,color:"#0d1326"}}>{HO_BANK_CONTROL.filter(b=>b.controlLevel==="Branch-Op").length}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>{fmtINR(totalOps)} balance</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #d4a437"}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Joint Signatories</p><p style={{margin:"4px 0 0",fontSize:18,fontWeight:700,color:"#0d1326"}}>{HO_BANK_CONTROL.length} of {HO_BANK_CONTROL.length}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>100% dual-control</p></div>
      </div>

      <div style={cardStyle}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr>
              <th style={RPT_thStyle}>Bank Account</th>
              <th style={RPT_thStyle}>Branch</th>
              <th style={RPT_thStyle}>Currency</th>
              <th style={{...RPT_thStyle,textAlign:"center"}}>Control Level</th>
              <th style={RPT_thStyle}>Signatories</th>
              <th style={RPT_thStyle}>Purpose</th>
              <th style={{...RPT_thStyle,textAlign:"right"}}>Balance</th>
            </tr></thead>
            <tbody>{HO_BANK_CONTROL.map((b,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #f0f2f7",background:b.controlLevel==="HO-Locked"?"#fff5f5":"#fff"}}>
                <td style={RPT_tdStyle}><p style={{margin:0,fontWeight:700}}>{b.bank}</p><p style={{margin:0,fontSize:10,fontFamily:"monospace",color:"#5a6691"}}>{b.acct}</p></td>
                <td style={RPT_tdStyle}><span style={{padding:"2px 7px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{b.branch}</span></td>
                <td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:700}}>{b.currency}</td>
                <td style={{...RPT_tdStyle,textAlign:"center"}}>
                  <span style={{padding:"3px 10px",borderRadius:3,fontSize:10.5,fontWeight:700,background:b.controlLevel==="HO-Locked"?"#f8d7da":"#d4edda",color:b.controlLevel==="HO-Locked"?"#721c24":"#155724"}}>
                    {b.controlLevel==="HO-Locked"?"🔒 HO-Locked":"✓ Branch-Op"}
                  </span>
                </td>
                <td style={{...RPT_tdStyle,fontSize:11}}>{b.signatory}</td>
                <td style={{...RPT_tdStyle,fontSize:11,color:"#5a6691"}}>{b.purpose}</td>
                <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,fontFamily:"monospace"}}>{fmtINR(b.balance)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   4. GROUP MONTHLY DASHBOARD  (Point E — 5th-of-month deliverable)
   ════════════════════════════════════════════════════════════════════ */

export function GroupMonthlyDashboard(){
  const [period,setPeriod]=useState(CUR_MONTH);
  const g=useGroupLive(period);
  const pnlByBranch=g.rows.map(r=>({branch:r.code,revenue:r.revINR,cost:r.costINR,gp:r.gpINR,gpPct:r.gpPct,bookings:r.books}));
  const totalRev=g.totals.rev, totalCost=g.totals.cost, totalGP=g.totals.gp;
  const gpPct=(g.totals.gpPct||0).toFixed(1);
  const today=new Date().toISOString().slice(0,10);
  return(
    <PHASE2_Page title="Group Monthly Dashboard — Travkings Group"
      subtitle={`🟢 Live · all branches (INR-normalised) · ${monthLabel(period)} · generated ${today}`}
      toolbar={<><select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>{MONTH_OPTIONS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}</select><button style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>📥 Export PDF</button></>}>

      {/* Group KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...cardStyle,borderTop:"3px solid #22c55e"}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Group Revenue</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:700,color:"#0d1326"}}>{fmtINR(totalRev)}</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #d4a437"}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Gross Profit</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:700,color:"#22c55e"}}>{fmtINR(totalGP)}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>{gpPct}% margin</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #3b82f6"}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Group Cash & Bank</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:700,color:"#0d1326"}}>{fmtINR(g.cash)}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>INR · live</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Overdue Receivables</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:700,color:"#A32D2D"}}>{fmtINR(g.overdue.amount)}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>{g.overdue.count} invoices · {fmtINR(g.overdue.over90)} 90d+</p></div>
      </div>

      {/* P&L by branch */}
      <div style={{...cardStyle,marginBottom:14}}>
        <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>1️⃣ P&L by Branch — {monthLabel(period)}</p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Branch</th><th style={{...RPT_thStyle,textAlign:"right"}}>Revenue</th><th style={{...RPT_thStyle,textAlign:"right"}}>Cost</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP %</th><th style={{...RPT_thStyle,textAlign:"right"}}>Bookings</th></tr></thead>
          <tbody>{pnlByBranch.map(b=>(
            <tr key={b.branch} style={{borderBottom:"1px solid #f0f2f7",background:"#fff"}}>
              <td style={{...RPT_tdStyle,fontWeight:700}}><span style={{padding:"2px 7px",background:"#0d1326",color:"#d4a437",borderRadius:3,fontSize:10.5,fontWeight:700}}>{b.branch}</span></td>
              <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(b.revenue)}</td>
              <td style={{...RPT_tdStyle,textAlign:"right",color:"#5a6691"}}>{fmtINR(b.cost)}</td>
              <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:b.gp>=0?"#22c55e":"#A32D2D"}}>{fmtINR(b.gp)}</td>
              <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:b.gpPct>=20?"#22c55e":b.gpPct>=10?"#d4a437":"#A32D2D"}}>{b.gpPct.toFixed(1)}%</td>
              <td style={{...RPT_tdStyle,textAlign:"right"}}>{b.bookings}</td>
            </tr>
          ))}
          <tr style={{borderTop:"2px solid #0d1326",background:"#fff8e8",fontWeight:700}}>
            <td style={{...RPT_tdStyle,fontWeight:700}}>GROUP TOTAL</td>
            <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,fontFamily:"monospace"}}>{fmtINR(totalRev)}</td>
            <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,fontFamily:"monospace"}}>{fmtINR(totalCost)}</td>
            <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#22c55e",fontFamily:"monospace"}}>{fmtINR(totalGP)}</td>
            <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{gpPct}%</td>
            <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{pnlByBranch.reduce((s,b)=>s+b.bookings,0)}</td>
          </tr>
          </tbody>
        </table>
      </div>

      {/* Two-column: Consultants & Customers */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div style={cardStyle}>
          <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>2️⃣ GP by Branch (live)</p>
          {g.rows.slice().sort((a,b)=>b.gpINR-a.gpINR).map((c,i)=>(
            <div key={c.code} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #f0f2f7"}}>
              <div><span style={{fontSize:11,color:"#5a6691",fontWeight:700,marginRight:8}}>#{i+1}</span><span style={{fontSize:12,fontWeight:600,color:"#0d1326"}}>{c.flag} {c.code} · {c.city}</span></div>
              <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:12,fontWeight:700,color:c.gpINR>=0?"#22c55e":"#A32D2D"}}>{fmtINR(c.gpINR)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{c.books} bookings</p></div>
            </div>
          ))}
          {!g.rows.length&&<p style={{fontSize:11,color:"#5a6691"}}>No data yet.</p>}
        </div>
        <div style={cardStyle}>
          <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>3️⃣ Top Customers (Revenue · live)</p>
          {g.topCustomers.map((c,i)=>(
            <div key={c.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #f0f2f7"}}>
              <div><span style={{fontSize:11,color:"#5a6691",fontWeight:700,marginRight:8}}>#{i+1}</span><span style={{fontSize:12,fontWeight:600,color:"#0d1326"}}>{c.name}</span></div>
              <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>{fmtINR(c.revenue)}</p></div>
            </div>
          ))}
          {!g.topCustomers.length&&<p style={{fontSize:11,color:"#5a6691"}}>No invoiced customers in this period yet.</p>}
        </div>
      </div>

      {/* Cash position + statutory dues */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={cardStyle}>
          <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>4️⃣ Group Cash Position</p>
          {[{cur:"INR",amt:g.cash,sym:"₹"}].map(c=>(
            <div key={c.cur} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f0f2f7"}}>
              <span style={{fontSize:12,color:"#0d1326",fontWeight:600}}>{c.cur}</span>
              <span style={{fontSize:12,fontWeight:700,color:"#0d1326",fontFamily:"monospace"}}>{c.sym} {c.amt.toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>
        <div style={cardStyle}>
          <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>5️⃣ Statutory Dues — Next 30 days</p>
          {[
            {label:"GSTR-3B (Apr)",   due:"2026-05-20",amt:1579300},
            {label:"PF/ESI Challan",  due:"2026-05-31",amt:60700},
            {label:"TDS Q4 Returns",  due:"2026-05-31",amt:0},
            {label:"Adv Tax Q1",      due:"2026-06-15",amt:1850000},
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f0f2f7"}}>
              <span style={{fontSize:11.5,color:"#0d1326"}}>{s.label}<span style={{marginLeft:8,fontSize:10,color:"#A32D2D"}}>{s.due}</span></span>
              <span style={{fontSize:12,fontWeight:700,color:"#A32D2D",fontFamily:"monospace"}}>{s.amt>0?fmtINR(s.amt):"—"}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{marginTop:14,padding:12,background:"#0d1326",borderRadius:8,color:"#fff",textAlign:"center",fontSize:11}}>
        <p style={{margin:0,color:"#d4a437",fontWeight:700}}>Published Monthly · Standing Distribution List: Director · Senior Finance Manager · Internal Audit · External Auditor</p>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   5. STATUTORY FILING REGISTER  (Point E — HO owns all filings)
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
    <PHASE2_Page title="Statutory Filing Register — HO Ownership"
      subtitle="All statutory filings owned & filed by HO finance · branches contribute data, HO files · single source of truth"
      toolbar={<><select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,background:"#fff"}}><option value="ALL">All statuses</option>{statuses.map(s=><option key={s}>{s}</option>)}</select><button style={{padding:"7px 12px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>📥 Export Register</button></>}>

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
            <tr key={f.id} style={{borderBottom:"1px solid #f0f2f7",background:f.status==="Due Today"?"#fff8e8":"#fff"}}>
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
                  <button style={{padding:"3px 8px",background:"transparent",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:3,fontSize:10,cursor:"pointer"}}>View</button>:
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
   6. PERIOD LOCK CONTROL  (Point F)
   ════════════════════════════════════════════════════════════════════ */

export function PeriodLockControl(){
  const [periods,setPeriods]=useState(PERIOD_LOCK_STATE);
  const months=["2026-01","2026-02","2026-03","2026-04","2026-05"];
  const branches=["BOM","AMD"];
  const cycle=(branch,month)=>{
    const cur=periods[branch][month];
    const next={open:"soft",soft:"hard",hard:"open"}[cur];
    setPeriods(p=>({...p,[branch]:{...p[branch],[month]:next}}));
  };
  const counts={open:0,soft:0,hard:0};
  branches.forEach(b=>months.forEach(m=>counts[periods[b][m]]++));
  return(
    <PHASE2_Page title="Period Lock Control — HO Authority"
      subtitle="Only Faiz Patel & Sughra Sayed can lock/unlock periods · branches frozen after 7th of following month">
      <div style={{padding:14,background:"#fff5f5",border:"1px solid #fecaca",borderLeft:"3px solid #A32D2D",borderRadius:6,marginBottom:14,fontSize:11.5,color:"#721c24"}}>
        <p style={{margin:"0 0 4px",fontWeight:700,fontSize:12.5,color:"#A32D2D"}}>🔒 Period Lock Discipline</p>
        <p style={{margin:0,lineHeight:1.5}}>After the 7th of each month, prior-month periods auto soft-lock (yellow). 30 days later, they hard-lock (red). After hard-lock, NO entries can be made without Faiz/Afshin written approval. This forces month-end discipline and prevents retro-active P&L manipulation. Override requests are logged in the Period Override Register.</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        <div style={{...cardStyle,borderTop:"3px solid #22c55e"}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>🟢 Open Periods</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#22c55e"}}>{counts.open}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>Entries freely allowed</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #d4a437"}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>🟡 Soft-Locked</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#d4a437"}}>{counts.soft}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>Sughra approval required</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>🔴 Hard-Locked</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#A32D2D"}}>{counts.hard}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>Faiz/Afshin override needed</p></div>
      </div>

      {/* Lock matrix */}
      <div style={cardStyle}>
        <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Period Lock Matrix — Click any cell to cycle Open → Soft → Hard</p>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr><th style={RPT_thStyle}>Branch</th>{months.map(m=><th key={m} style={{...RPT_thStyle,textAlign:"center"}}>{m}</th>)}</tr></thead>
            <tbody>{branches.map(b=>(
              <tr key={b} style={{borderBottom:"1px solid #f0f2f7"}}>
                <td style={{...RPT_tdStyle,fontWeight:700}}><span style={{padding:"2px 7px",background:"#0d1326",color:"#d4a437",borderRadius:3,fontSize:10.5,fontWeight:700}}>{b}</span></td>
                {months.map(m=>{
                  const state=periods[b][m];
                  const bg=state==="open"?"#d4edda":state==="soft"?"#fff3cd":"#f8d7da";
                  const col=state==="open"?"#155724":state==="soft"?"#856404":"#721c24";
                  const lbl=state==="open"?"🟢 Open":state==="soft"?"🟡 Soft":"🔴 Hard";
                  return(<td key={m} style={{padding:"6px 12px",textAlign:"center",borderBottom:"1px solid #f0f2f7",cursor:"pointer"}} onClick={()=>cycle(b,m)}>
                    <span style={{padding:"4px 12px",background:bg,color:col,borderRadius:4,fontSize:10.5,fontWeight:700,display:"inline-block",minWidth:70}}>{lbl}</span>
                  </td>);
                })}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* Override register */}
      <div style={{...cardStyle,marginTop:14}}>
        <p style={{margin:"0 0 10px",fontSize:13,fontWeight:700,color:"#0d1326"}}>📋 Period Override Register</p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Override Date</th><th style={RPT_thStyle}>Branch</th><th style={RPT_thStyle}>Period</th><th style={RPT_thStyle}>Requested By</th><th style={RPT_thStyle}>Reason</th><th style={RPT_thStyle}>Approved By</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
          <tbody>{[].map((o,i)=>(
            <tr key={i} style={{borderBottom:"1px solid #f0f2f7"}}>
              <td style={{...RPT_tdStyle,fontFamily:"monospace"}}>{o.date}</td>
              <td style={RPT_tdStyle}><span style={{padding:"1px 6px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{o.branch}</span></td>
              <td style={{...RPT_tdStyle,fontFamily:"monospace"}}>{o.period}</td>
              <td style={RPT_tdStyle}>{o.requestedBy}</td>
              <td style={{...RPT_tdStyle,fontSize:11,color:"#5a6691"}}>{o.reason}</td>
              <td style={{...RPT_tdStyle,fontWeight:600}}>{o.approvedBy}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",background:"#d4edda",color:"#155724",borderRadius:3,fontSize:10,fontWeight:700}}>✓ {o.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   7. CENTRAL AUDIT REVIEW QUEUE  (Point G — 100% voucher audit)
   ════════════════════════════════════════════════════════════════════ */

export function CentralAuditQueue(){
  const [filter,setFilter]=useState("ALL");
  const [audited,setAudited]=useState({});
  const statuses=["Pending Review","Reviewed","Flagged"];
  const filtered=filter==="ALL"?AUDIT_QUEUE_DATA:AUDIT_QUEUE_DATA.filter(v=>v.status===filter);
  const pending=AUDIT_QUEUE_DATA.filter(v=>v.status==="Pending Review").length;
  const flagged=AUDIT_QUEUE_DATA.filter(v=>v.status==="Flagged").length;
  const reviewed=AUDIT_QUEUE_DATA.filter(v=>v.status==="Reviewed").length;
  const completion=Math.round((reviewed/(AUDIT_QUEUE_DATA.length))*100);
  const statusStyle={"Pending Review":{bg:"#fff3cd",color:"#856404"},"Reviewed":{bg:"#d4edda",color:"#155724"},"Flagged":{bg:"#f8d7da",color:"#721c24"}};
  const riskStyle={Low:{bg:"#d4edda",color:"#155724"},Medium:{bg:"#fff3cd",color:"#856404"},High:{bg:"#f8d7da",color:"#721c24"}};
  return(
    <PHASE2_Page title="Central Audit Review Queue — 100% Voucher Audit"
      subtitle="HO finance reviews 100% of branch vouchers · risk-based prioritization · findings discussed in monthly branch-leads call"
      toolbar={<><select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,background:"#fff"}}><option value="ALL">All statuses</option>{statuses.map(s=><option key={s}>{s}</option>)}</select><button style={{padding:"7px 12px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>📥 Export Findings</button></>}>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...cardStyle,borderTop:"3px solid #f97316"}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Pending Review</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#f97316"}}>{pending}</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Flagged</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#A32D2D"}}>{flagged}</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #22c55e"}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Reviewed</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#22c55e"}}>{reviewed}</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #d4a437"}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Audit Coverage</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#d4a437"}}>{completion}%</p><p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>of {AUDIT_QUEUE_DATA.length} vouchers</p></div>
      </div>

      {/* Progress bar */}
      <div style={{...cardStyle,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:12,fontWeight:700,color:"#0d1326"}}>Audit Cycle Progress — May 2026</span>
          <span style={{fontSize:12,fontWeight:700,color:"#0d1326"}}>{reviewed}/{AUDIT_QUEUE_DATA.length} vouchers reviewed</span>
        </div>
        <div style={{height:14,background:"#f0f2f7",borderRadius:7,overflow:"hidden",display:"flex"}}>
          <div style={{height:"100%",width:(reviewed/AUDIT_QUEUE_DATA.length*100)+"%",background:"#22c55e"}}/>
          <div style={{height:"100%",width:(flagged/AUDIT_QUEUE_DATA.length*100)+"%",background:"#A32D2D"}}/>
          <div style={{height:"100%",width:(pending/AUDIT_QUEUE_DATA.length*100)+"%",background:"#f97316"}}/>
        </div>
        <div style={{display:"flex",gap:14,marginTop:6,fontSize:10.5}}>
          <span><span style={{color:"#22c55e",fontWeight:700}}>■</span> Reviewed ({reviewed})</span>
          <span><span style={{color:"#A32D2D",fontWeight:700}}>■</span> Flagged ({flagged})</span>
          <span><span style={{color:"#f97316",fontWeight:700}}>■</span> Pending ({pending})</span>
        </div>
      </div>

      {/* Audit queue table */}
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#f7f8fb"}}>
            <th style={RPT_thStyle}>Voucher</th>
            <th style={RPT_thStyle}>Branch</th>
            <th style={RPT_thStyle}>Date</th>
            <th style={RPT_thStyle}>Posted By</th>
            <th style={RPT_thStyle}>Party</th>
            <th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th>
            <th style={RPT_thStyle}>Type</th>
            <th style={{...RPT_thStyle,textAlign:"center"}}>Risk</th>
            <th style={{...RPT_thStyle,textAlign:"center"}}>Status / Reviewer</th>
            <th style={{...RPT_thStyle,textAlign:"center"}}>Action</th>
          </tr></thead>
          <tbody>{filtered.map(v=>{
            const isAudited=audited[v.id]||v.status==="Reviewed";
            return(
              <tr key={v.id} style={{borderBottom:"1px solid #f0f2f7",background:v.status==="Flagged"?"#fff5f5":(audited[v.id]?"#f0fff4":"#fff")}}>
                <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5,color:"#d4a437",fontWeight:600}}>{v.vno}</td>
                <td style={RPT_tdStyle}><span style={{padding:"2px 7px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{v.branch}</span></td>
                <td style={{...RPT_tdStyle,fontSize:11}}>{v.date}</td>
                <td style={{...RPT_tdStyle,fontSize:11}}>{v.postedBy}</td>
                <td style={{...RPT_tdStyle,fontWeight:600}}>{v.party}</td>
                <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(v.amount)}</td>
                <td style={{...RPT_tdStyle,fontSize:11}}>{v.type}</td>
                <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:700,background:(riskStyle[v.risk]||{}).bg,color:(riskStyle[v.risk]||{}).color}}>{v.risk}</span></td>
                <td style={{...RPT_tdStyle,textAlign:"center"}}>
                  <span style={{padding:"3px 9px",borderRadius:3,fontSize:10,fontWeight:700,background:(statusStyle[isAudited?"Reviewed":v.status]||{}).bg,color:(statusStyle[isAudited?"Reviewed":v.status]||{}).color}}>{isAudited?"Reviewed":v.status}</span>
                  {v.reviewedBy&&<p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691"}}>by {v.reviewedBy}</p>}
                  {v.note&&<p style={{margin:"2px 0 0",fontSize:10,color:"#A32D2D",fontStyle:"italic"}}>{v.note}</p>}
                </td>
                <td style={{padding:"6px 12px",textAlign:"center",borderBottom:"1px solid #f0f2f7"}}>
                  {v.status==="Pending Review"&&!audited[v.id]&&(
                    <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                      <button onClick={()=>setAudited(p=>({...p,[v.id]:true}))} style={{padding:"3px 8px",background:"#22c55e",color:"#fff",border:"none",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>✓ Clear</button>
                      <button style={{padding:"3px 8px",background:"#A32D2D",color:"#fff",border:"none",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>🚩 Flag</button>
                    </div>
                  )}
                  {v.status==="Flagged"&&<button style={{padding:"3px 8px",background:"#0d1326",color:"#d4a437",border:"none",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>Escalate to Faiz</button>}
                  {(v.status==="Reviewed"||audited[v.id])&&<span style={{fontSize:10.5,color:"#22c55e",fontWeight:700}}>✓ Cleared</span>}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   AUTHORITY CONFIGURATION CENTER — Faiz's command panel
   3 screens: Authority Config (5 tabs) · Delegations · Master Change Queue
   ════════════════════════════════════════════════════════════════════ */

/* ── Seed data for authority matrix ──────────────────────────────── */


export function AuthorityConfigCenter(){
  const [tab,setTab]=useState("txn");
  const [txn,setTxn]=useState(AUTH_INITIAL_TXN);
  const [master,setMaster]=useState(AUTH_INITIAL_MASTER);
  const [exceptions,setExceptions]=useState({
    softLockDay:10,
    hardLockDays:30,
    dualThreshold:1000000,
    dualApprover:"Afshin only",
    weekendFlag:true,
    afterHoursTime:"23:00",
    afterHoursReviewer:"Sughra Sayed",
  });
  const [branchRules,setBranchRules]=useState({
    crossBranchAudit:true,
    interbranchJournal:true,
    twoBranchReason:true,
    consolidatedAccess:{director:true,srFm:true,srAe:false,ae:false,hrMgr:false},
  });
  const [saved,setSaved]=useState(false);

  const tabs=[
    {k:"txn",     l:"A · Transactional Limits"},
    {k:"master",  l:"C · Master Data Permissions"},
    {k:"branch",  l:"D · Branch Isolation"},
    {k:"except",  l:"E · Time-Based Controls"},
    {k:"deleg",   l:"Delegations"},
  ];

  const ROLE_HEADERS = [
    {key:"ae",     name:"Accounts Exec",   tier:"Maker",   color:"#2F7A8E"},
    {key:"sughra", name:"Sughra (Sr. AE)", tier:"Checker", color:"#6B4C8B"},
    {key:"faiz",   name:"Faiz (Sr. FM)",   tier:"Approver",color:"#0d1326"},
    {key:"afshin", name:"Afshin (Director)",tier:"Final", color:"#3C1B14"},
  ];

  const inp={padding:"6px 8px",border:"1px solid #e1e3ec",borderRadius:4,fontSize:11.5,width:"100%",fontFamily:"monospace",textAlign:"right"};

  const updateTxn = (i, field, value) => {
    setTxn(t => t.map((r, idx) => idx === i ? {...r, [field]: value} : r));
    setSaved(false);
  };
  const toggleMaster = (i, action, role) => {
    setMaster(m => m.map((r, idx) => idx === i ? {...r, [action]: {...r[action], [role]: !r[action][role]}} : r));
    setSaved(false);
  };

  return(
    <PHASE2_Page title="Authority Configuration Center"
      subtitle="Faiz Patel · Sr. Finance Manager · Configure approval limits · master-data permissions · branch isolation · time-based controls"
      toolbar={<>
        {saved && <span style={{padding:"5px 12px",background:"#d4edda",color:"#155724",borderRadius:4,fontSize:11,fontWeight:700}}>✓ Saved · Effective immediately</span>}
        <button style={{padding:"7px 14px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>📥 Export Matrix</button>
        <button onClick={()=>setSaved(true)} style={{padding:"7px 16px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>💾 Save All Changes</button>
      </>}>

      {/* Big policy callout */}
      <div style={{padding:14,background:"#0d1326",borderRadius:8,color:"#fff",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div>
            <p style={{margin:"0 0 4px",fontSize:13,fontWeight:700,color:"#d4a437"}}>4-Tier Approval Hierarchy</p>
            <p style={{margin:0,fontSize:11.5,color:"#c8cfe0"}}>Principle: Maker → Checker → Approver → Final Approver · with voucher-type-specific limits, master-data segregation, time-based controls</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {ROLE_HEADERS.map(r=>(
              <div key={r.key} style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                <div style={{width:34,height:34,borderRadius:"50%",background:r.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",marginBottom:3}}>{r.name.split(" ")[0].substring(0,2).toUpperCase()}</div>
                <span style={{fontSize:9.5,color:"#d4a437",fontWeight:700}}>{r.tier}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"1px solid #e1e3ec",marginBottom:14,background:"#fff",border:"1px solid #e1e3ec",borderRadius:"8px 8px 0 0",overflow:"hidden",flexWrap:"wrap"}}>
        {tabs.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={tabBtnStyle(tab===t.k)}>{t.l}</button>
        ))}
      </div>

      {/* TAB A — Transactional Limits */}
      {tab==="txn"&&(
        <div style={cardStyle}>
          <p style={{margin:"0 0 4px",fontSize:13,fontWeight:700,color:"#0d1326"}}>A · Transactional Approval Ladder — Per Voucher Type</p>
          <p style={{margin:"0 0 14px",fontSize:11,color:"#5a6691"}}>All amounts in ₹. "Above" = mandatory Director approval. "Any" = no upper limit. Edit any cell to update.</p>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5,minWidth:760}}>
              <thead>
                <tr style={{background:"#0d1326",color:"#fff"}}>
                  <th style={{padding:"10px",textAlign:"left",fontSize:11,fontWeight:700,letterSpacing:"0.3px"}}>Voucher Type</th>
                  {ROLE_HEADERS.map(r=>(
                    <th key={r.key} style={{padding:"10px",textAlign:"center",fontSize:11,fontWeight:700,letterSpacing:"0.3px"}}>
                      <p style={{margin:0,color:"#d4a437"}}>{r.name}</p>
                      <p style={{margin:0,fontSize:9.5,color:"#c8cfe0",fontWeight:600,textTransform:"uppercase"}}>{r.tier}</p>
                      <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{r.key==="ae"?"Post limit":"Approve up to"}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txn.map((r,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #f0f2f7"}}>
                    <td style={{...RPT_tdStyle,fontWeight:700,fontSize:12}}>{r.type}</td>
                    <td style={{padding:"6px 12px",borderBottom:"1px solid #f0f2f7"}}>
                      <input type="number" value={r.ae} onChange={e=>updateTxn(i,"ae",+e.target.value)} style={inp}/>
                    </td>
                    <td style={{padding:"6px 12px",borderBottom:"1px solid #f0f2f7"}}>
                      <input type="number" value={r.sughra} onChange={e=>updateTxn(i,"sughra",+e.target.value)} style={inp}/>
                    </td>
                    <td style={{padding:"6px 12px",borderBottom:"1px solid #f0f2f7"}}>
                      <input type="number" value={r.faiz} onChange={e=>updateTxn(i,"faiz",+e.target.value)} style={inp}/>
                    </td>
                    <td style={{padding:"6px 12px",borderBottom:"1px solid #f0f2f7",textAlign:"center"}}>
                      <select value={r.afshin} onChange={e=>updateTxn(i,"afshin",e.target.value)} style={{padding:"6px 8px",border:"1px solid #e1e3ec",borderRadius:4,fontSize:11.5,fontWeight:700,color:"#3C1B14",background:"#fff8e8",cursor:"pointer"}}>
                        <option>Above</option>
                        <option>Any</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:14,padding:12,background:"#fff8e8",border:"1px solid #fde68a",borderRadius:6,fontSize:11.5,color:"#856404"}}>
            <p style={{margin:"0 0 4px",fontWeight:700,color:"#0d1326"}}>💡 Legend</p>
            <p style={{margin:0,lineHeight:1.5}}><b>AE column</b> = max voucher amount AE can post and auto-approve. Above this goes to checker queue. <b>Sughra column</b> = max amount Sughra can approve. <b>Faiz column</b> = max amount Faiz can approve. <b>Afshin "Above"</b> = anything beyond Faiz's limit needs Director approval.</p>
          </div>
        </div>
      )}

      {/* TAB B — Master Data Permissions */}
      {tab==="master"&&(
        <div style={cardStyle}>
          <p style={{margin:"0 0 4px",fontSize:13,fontWeight:700,color:"#0d1326"}}>C · Master Data Change Permissions</p>
          <p style={{margin:"0 0 14px",fontSize:11,color:"#5a6691"}}>Toggle checkboxes to grant request/approve rights. Master changes are highest-risk — vendor bank a/c change can cause more damage than payment voucher.</p>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5,minWidth:900}}>
              <thead>
                <tr style={{background:"#0d1326",color:"#fff"}}>
                  <th rowSpan={2} style={{padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:700,borderRight:"1px solid #2a3550"}}>Master Change Type</th>
                  <th colSpan={3} style={{padding:"8px 10px",textAlign:"center",fontSize:11,fontWeight:700,borderBottom:"1px solid #2a3550",borderRight:"1px solid #2a3550",color:"#3b82f6"}}>📝 Can REQUEST</th>
                  <th colSpan={3} style={{padding:"8px 10px",textAlign:"center",fontSize:11,fontWeight:700,borderBottom:"1px solid #2a3550",color:"#22c55e"}}>✓ Can APPROVE</th>
                </tr>
                <tr style={{background:"#1a2340",color:"#d4a437"}}>
                  {["AE","Sughra","Faiz"].map(r=><th key={"r"+r} style={{padding:"6px 8px",textAlign:"center",fontSize:10,fontWeight:600,borderRight:r==="Faiz"?"1px solid #2a3550":"none"}}>{r}</th>)}
                  {["Sughra","Faiz","Afshin"].map(r=><th key={"a"+r} style={{padding:"6px 8px",textAlign:"center",fontSize:10,fontWeight:600}}>{r}</th>)}
                </tr>
              </thead>
              <tbody>
                {master.map((row,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #f0f2f7",background:row.change.includes("Bank A/c")||row.change.includes("Approval Matrix")?"#fff5f5":"#fff"}}>
                    <td style={{...RPT_tdStyle,fontWeight:700,fontSize:12}}>{row.change}<p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691",fontStyle:"italic",fontWeight:400}}>{row.note}</p></td>
                    {["ae","sughra","faiz"].map(role=>(
                      <td key={"req"+role} style={{padding:"6px 8px",textAlign:"center",borderBottom:"1px solid #f0f2f7",background:"#f0f7ff"}}>
                        <input type="checkbox" checked={row.req[role]} onChange={()=>toggleMaster(i,"req",role)} style={{width:18,height:18,cursor:"pointer",accentColor:"#3b82f6"}}/>
                      </td>
                    ))}
                    {["sughra","faiz","afshin"].map(role=>(
                      <td key={"appr"+role} style={{padding:"6px 8px",textAlign:"center",borderBottom:"1px solid #f0f2f7",background:"#f0fff4"}}>
                        <input type="checkbox" checked={row.appr[role]} onChange={()=>toggleMaster(i,"appr",role)} style={{width:18,height:18,cursor:"pointer",accentColor:"#22c55e"}}/>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB C — Branch Isolation */}
      {tab==="branch"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={cardStyle}>
            <p style={{margin:"0 0 4px",fontSize:13,fontWeight:700,color:"#0d1326"}}>D · Branch Isolation & Cross-Branch Rules</p>
            <p style={{margin:"0 0 14px",fontSize:11,color:"#5a6691"}}>The 5 branch AEs each see only their own branch. These rules govern cross-branch activity by higher tiers.</p>
            {[
              {key:"crossBranchAudit",   label:"Sughra/Faiz cross-branch posts are tagged 'Cross-Branch' in audit trail", desc:"Default ON. Helps detect unusual cross-branch activity."},
              {key:"interbranchJournal", label:"Inter-branch journals: AE initiates, Sughra approves", desc:"Per your spec — AE can initiate inter-branch entries, but Sughra must approve before posting."},
              {key:"twoBranchReason",    label:"Transactions touching 2+ branches require 'Reason' field", desc:"Reason text visible in consolidated reports."},
            ].map(r=>(
              <label key={r.key} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 0",borderBottom:"1px solid #f0f2f7",cursor:"pointer"}}>
                <input type="checkbox" checked={branchRules[r.key]} onChange={()=>{setBranchRules(b=>({...b,[r.key]:!b[r.key]}));setSaved(false);}} style={{width:18,height:18,marginTop:2,cursor:"pointer",accentColor:"#d4a437"}}/>
                <div style={{flex:1}}>
                  <p style={{margin:0,fontSize:12.5,fontWeight:600,color:"#0d1326"}}>{r.label}</p>
                  <p style={{margin:"2px 0 0",fontSize:11,color:"#5a6691"}}>{r.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <div style={cardStyle}>
            <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Consolidated Report — Who Can View Cross-Branch Data</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px,1fr))",gap:10}}>
              {[
                {key:"director", label:"Director (Afshin)",   default:true},
                {key:"srFm",     label:"Sr. FM (Faiz)",       default:true},
                {key:"srAe",     label:"Sr. AE (Sughra)",     default:false},
                {key:"ae",       label:"Accounts Executive",  default:false},
                {key:"hrMgr",    label:"HR Manager",          default:false},
              ].map(r=>(
                <label key={r.key} style={{display:"flex",alignItems:"center",gap:8,padding:"10px",border:"1px solid #e1e3ec",borderRadius:5,cursor:"pointer",background:branchRules.consolidatedAccess[r.key]?"#fff8e8":"#fff"}}>
                  <input type="checkbox" checked={branchRules.consolidatedAccess[r.key]} onChange={()=>{setBranchRules(b=>({...b,consolidatedAccess:{...b.consolidatedAccess,[r.key]:!b.consolidatedAccess[r.key]}}));setSaved(false);}} style={{width:16,height:16,cursor:"pointer",accentColor:"#d4a437"}}/>
                  <span style={{fontSize:11.5,fontWeight:600,color:"#0d1326"}}>{r.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB D — Time-Based & Exception Controls */}
      {tab==="except"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={cardStyle}>
            <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>E · Period Lock Settings</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div>
                <label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Soft-Lock Day (of following month)</label>
                <input type="number" min="1" max="31" value={exceptions.softLockDay} onChange={e=>{setExceptions({...exceptions,softLockDay:+e.target.value});setSaved(false);}} style={{padding:"8px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:13,fontWeight:700,width:100,fontFamily:"monospace"}}/>
                <p style={{margin:"4px 0 0",fontSize:10.5,color:"#5a6691"}}>After this day, prior period soft-locks. Sughra approval needed for entries.</p>
              </div>
              <div>
                <label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Hard-Lock After (days post period-end)</label>
                <input type="number" min="1" value={exceptions.hardLockDays} onChange={e=>{setExceptions({...exceptions,hardLockDays:+e.target.value});setSaved(false);}} style={{padding:"8px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:13,fontWeight:700,width:100,fontFamily:"monospace"}}/>
                <p style={{margin:"4px 0 0",fontSize:10.5,color:"#5a6691"}}>After {exceptions.hardLockDays} days, period hard-locks. Only Faiz/Afshin override.</p>
              </div>
            </div>
          </div>
          <div style={cardStyle}>
            <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Dual-Control Threshold</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div>
                <label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Dual-Control Triggered Above (₹)</label>
                <input type="number" value={exceptions.dualThreshold} onChange={e=>{setExceptions({...exceptions,dualThreshold:+e.target.value});setSaved(false);}} style={{padding:"8px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:13,fontWeight:700,width:160,fontFamily:"monospace"}}/>
                <p style={{margin:"4px 0 0",fontSize:10.5,color:"#5a6691"}}>= {fmtINR(exceptions.dualThreshold)}. Vouchers above this need extra approval.</p>
              </div>
              <div>
                <label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Extra Approver Required</label>
                <select value={exceptions.dualApprover} onChange={e=>{setExceptions({...exceptions,dualApprover:e.target.value});setSaved(false);}} style={{padding:"8px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12.5,width:200,background:"#fff"}}>
                  <option>Afshin only</option>
                  <option>Sughra OR Afshin</option>
                  <option>Both Sughra AND Afshin</option>
                </select>
                <p style={{margin:"4px 0 0",fontSize:10.5,color:"#5a6691"}}>Per your spec — Afshin only between ₹10L-₹25L.</p>
              </div>
            </div>
          </div>
          <div style={cardStyle}>
            <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Weekend / After-Hours Controls</p>
            <label style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 0",borderBottom:"1px solid #f0f2f7",cursor:"pointer"}}>
              <input type="checkbox" checked={exceptions.weekendFlag} onChange={()=>{setExceptions({...exceptions,weekendFlag:!exceptions.weekendFlag});setSaved(false);}} style={{width:18,height:18,marginTop:2,cursor:"pointer",accentColor:"#d4a437"}}/>
              <div style={{flex:1}}>
                <p style={{margin:0,fontSize:12.5,fontWeight:600,color:"#0d1326"}}>Flag vouchers posted on Sundays, public holidays, or after-hours for next-day review</p>
                <p style={{margin:"2px 0 0",fontSize:11,color:"#5a6691"}}>Catches legitimate emergencies AND unauthorized activity. Reviewed by Sughra.</p>
              </div>
            </label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginTop:12}}>
              <div>
                <label style={{fontSize:11,color:"#5a6691",fontWeight:700,display:"block",marginBottom:4}}>After-Hours Cutoff Time</label>
                <input type="time" value={exceptions.afterHoursTime} onChange={e=>{setExceptions({...exceptions,afterHoursTime:e.target.value});setSaved(false);}} style={{padding:"8px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:13,fontWeight:700,width:140,fontFamily:"monospace"}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:"#5a6691",fontWeight:700,display:"block",marginBottom:4}}>Reviewed By</label>
                <select value={exceptions.afterHoursReviewer} onChange={e=>{setExceptions({...exceptions,afterHoursReviewer:e.target.value});setSaved(false);}} style={{padding:"8px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12.5,width:200,background:"#fff"}}>
                  <option>Sughra Sayed</option>
                  <option>Faiz Patel</option>
                </select>
              </div>
            </div>
          </div>
          <div style={{padding:14,background:"#fff8e8",border:"1px solid #fde68a",borderRadius:8,fontSize:11.5,color:"#856404"}}>
            <p style={{margin:"0 0 4px",fontWeight:700,fontSize:12,color:"#0d1326"}}>⏰ Quarterly Access Review (automated)</p>
            <p style={{margin:0,lineHeight:1.5}}>Every quarter on the 15th of Jul/Oct/Jan/Apr, an automated email goes to <b>Afshin Dhanani</b> with all user permissions for review. Inactive users (no login &gt; 60 days) are auto-flagged for disabling. Next review: <b>2026-07-15</b>.</p>
          </div>
        </div>
      )}

      {/* TAB E — Vacation Delegations */}
      {tab==="deleg"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{padding:14,background:"#e8f0fe",border:"1px solid #b8d0f8",borderLeft:"3px solid #3b82f6",borderRadius:6,fontSize:11.5,color:"#1e3a5f"}}>
            <p style={{margin:"0 0 4px",fontWeight:700,fontSize:12.5}}>🏖️ Vacation Back-up Authority</p>
            <p style={{margin:0,lineHeight:1.5}}>When Faiz is on leave, his approval authority must be explicitly delegated — not implicit. Up to ₹10L → Sughra, above ₹10L → Afshin. Same applies when Sughra or any approver goes on leave.</p>
          </div>
          <div style={cardStyle}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Active & Scheduled Delegations</p>
              <button style={{padding:"6px 12px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>+ New Delegation</button>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#f7f8fb"}}>
                <th style={RPT_thStyle}>From</th>
                <th style={RPT_thStyle}>To (Delegatee)</th>
                <th style={RPT_thStyle}>Scope</th>
                <th style={RPT_thStyle}>Period</th>
                <th style={RPT_thStyle}>Reason</th>
                <th style={{...RPT_thStyle,textAlign:"center"}}>Status</th>
                <th style={{...RPT_thStyle,textAlign:"center"}}>Action</th>
              </tr></thead>
              <tbody>
                {ACTIVE_DELEGATIONS.map(d=>(
                  <tr key={d.id} style={{borderBottom:"1px solid #f0f2f7"}}>
                    <td style={{...RPT_tdStyle,fontWeight:700}}>{d.delegator}</td>
                    <td style={{...RPT_tdStyle,fontWeight:700,color:"#d4a437"}}>→ {d.delegatee}</td>
                    <td style={{...RPT_tdStyle,fontSize:11}}>{d.scope}</td>
                    <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:11}}>{d.from} → {d.to}</td>
                    <td style={{...RPT_tdStyle,fontSize:11,color:"#5a6691"}}>{d.reason}</td>
                    <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"3px 9px",borderRadius:3,fontSize:10,fontWeight:700,background:d.status==="Approved"?"#d4edda":"#fff3cd",color:d.status==="Approved"?"#155724":"#856404"}}>{d.status}</span></td>
                    <td style={{...RPT_tdStyle,textAlign:"center"}}>
                      <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                        <button style={{padding:"3px 8px",background:"transparent",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:3,fontSize:10,cursor:"pointer"}}>Edit</button>
                        <button style={{padding:"3px 8px",background:"#A32D2D",color:"#fff",border:"none",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>Revoke</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={cardStyle}>
            <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Create New Delegation</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
              <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Delegator (you)</label><select style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%",background:"#fff"}}><option>Faiz Patel</option><option>Sughra Sayed</option><option>Afshin Dhanani</option></select></div>
              <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Delegatee</label><select style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%",background:"#fff"}}><option>Sughra Sayed</option><option>Afshin Dhanani</option></select></div>
              <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>From Date</label><input type="date" style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%"}}/></div>
              <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>To Date</label><input type="date" style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%"}}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10,marginBottom:10}}>
              <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Authority Scope</label><select style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%",background:"#fff"}}><option>Approvals up to ₹10L</option><option>All checker duties</option><option>Full Sr. FM authority (Afshin must approve)</option></select></div>
              <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Reason</label><input style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%"}} placeholder="e.g. Annual leave / sick / training"/></div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end"}}>
              <button style={{padding:"8px 18px",background:"#0d1326",color:"#d4a437",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>Submit for Approval</button>
            </div>
          </div>
        </div>
      )}
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
        {[{l:"Active Delegations",v:active,c:"#22c55e"},{l:"Completed (YTD)",v:2,c:"#5a6691"},{l:"Avg Duration",v:"6 days",c:"#3b82f6"},{l:"Pending Approval",v:0,c:"#f97316"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"4px 0 0",fontSize:18,fontWeight:700,color:k.c}}>{k.v}</p></div>
        ))}
      </div>
      <div style={cardStyle}>
        <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>All Delegations (Active + Historical)</p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>ID</th><th style={RPT_thStyle}>From</th><th style={RPT_thStyle}>To</th><th style={RPT_thStyle}>Scope</th><th style={RPT_thStyle}>Period</th><th style={RPT_thStyle}>Reason</th><th style={RPT_thStyle}>Approved By</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
          <tbody>{all.map(d=>(
            <tr key={d.id} style={{borderBottom:"1px solid #f0f2f7"}}>
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

/* ════════════════════════════════════════════════════════════════════
   3. MASTER CHANGE REQUEST QUEUE
   ════════════════════════════════════════════════════════════════════ */
