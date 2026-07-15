/* ════════════════════════════════════════════════════════════════════
   GROUP EXECUTIVE DASHBOARD  /group-dashboard
   Live, consolidated across all branches (INR-normalised): per-branch P&L +
   invoice GP, group cash (Trial Balance), overdue receivables (Ageing) and
   top customers.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Menu as DropdownMenu } from '../../../core/ux/Menu';
import { BRANCHES, FX_RATES } from '../../../core/data';
import { useMobile } from '../../../core/hooks';
import { inp, card } from '../../../core/styles';
import { CUR_MONTH, MONTH_OPTIONS, monthLabel, rangeNote } from '../../../core/dates';
import { useQueries, useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../core/api';
import { Skeleton } from '../../../shell/primitives';

// ── Live consolidated group data (all branches, INR-normalised) ──────────────
// Per-branch P&L + invoice GP, plus group cash (Trial Balance) + overdue
// receivables (Ageing) + top customers.
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

      {loading&&<div style={{margin:"0 0 12px",padding:"9px 14px",borderRadius:9,background:"#E6F1FB",border:"1px solid #B5D4F4",display:"flex",alignItems:"center",gap:8}}>⏳ <Skeleton className="inline-block h-3 w-40 align-middle" /></div>}

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
