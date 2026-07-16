import { useState } from 'react';
import { TrendingUp, PieChart as PieChartIcon, Percent } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ReportDateBar, resolveReportRange } from '../../../core/reportDateBar';
import { useYieldByDestination } from '../../../core/useAccounting';
import { cardStyle } from '../../../core/helpers';
import { currencySplit, curRegion } from '../../../core/format';
import { KpiCard, RPT_thStyle, RPT_tdStyle } from '../../../core/styleTokens';
import { RPT_Page, RptState } from '../../../core/reportPage';
import { cmoney, cmoneyOf, rrow } from './analyticsShared';

/* 5. Yield per Destination */

// One destination block (KPI tiles + chart + table) rendered in a single currency.
// Reused for the single-branch view (branch currency) and, in the consolidated ALL
// view, once per currency (each in its OWN symbol) so ₹ and $ never blend.
function YieldBlock({ rows, sym, m, setRoute }){
  const totalRev=rows.reduce((s,d)=>s+d.revenue,0);
  const totalGP=rows.reduce((s,d)=>s+d.gp,0);
  const avgGpPct=totalRev>0?(totalGP/totalRev*100).toFixed(1):"0.0";
  return (
    <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        <KpiCard label="Total Revenue" value={m(totalRev)} Icon={TrendingUp} accent="info" />
        <KpiCard label="Total GP" value={m(totalGP)} Icon={PieChartIcon} accent="success" />
        <KpiCard label="Avg GP %" value={`${avgGpPct}%`} Icon={Percent} accent="neutral" />
      </div>
      <div style={cardStyle}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7"/>
            <XAxis dataKey="destination" tick={{fontSize:9,fill:"#5a6691"}} angle={-25} textAnchor="end" height={70}/>
            <YAxis yAxisId="left" tick={{fontSize:10,fill:"#5a6691"}} tickFormatter={v=>(v/100000).toFixed(0)+"L"}/>
            <YAxis yAxisId="right" orientation="right" tick={{fontSize:10,fill:"#5a6691"}} tickFormatter={v=>v+"%"}/>
            <Tooltip formatter={(v,n)=>n==="gpPct"?v+"%":m(v)}/>
            <Legend wrapperStyle={{fontSize:11}}/>
            <Bar yAxisId="left" dataKey="revenue" fill="#0d1326" name="Revenue"/>
            <Bar yAxisId="left" dataKey="gp" fill="#d4a437" name="GP"/>
            <Line yAxisId="right" type="monotone" dataKey="gpPct" stroke="#A32D2D" strokeWidth={2} name="GP %"/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{...cardStyle,marginTop:14,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Destination</th><th style={{...RPT_thStyle,textAlign:"right"}}>Bookings</th><th style={{...RPT_thStyle,textAlign:"right"}}>Revenue</th><th style={{...RPT_thStyle,textAlign:"right"}}>Cost</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP %</th></tr></thead>
          <tbody>{rows.map(d=>(<tr key={(sym||'')+d.destination} {...rrow(setRoute, "/reports/destination")}><td style={{...RPT_tdStyle,fontWeight:600}}>{d.destination}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{d.bookings}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{m(d.revenue)}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{m(d.cost)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e",fontWeight:700}}>{m(d.gp)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:d.gpPct>=25?"#22c55e":d.gpPct>=18?"#d4a437":"#A32D2D"}}>{d.gpPct.toFixed(1)}%</td></tr>))}</tbody>
        </table>
      </div>
    </>
  );
}

export function RPT_YieldDestination({ branch, setRoute }){
  const [range,setRange]=useState(()=>({mode:'all',...resolveReportRange('all')}));
  const q=useYieldByDestination(branch,{from:range.from||undefined,to:range.to||undefined});
  const sorted=q.data?.rows||[];   // server already groups by destination, GP-desc
  // Consolidated ALL view mixing currencies → India (₹) & Africa ($) kept separate.
  const split=currencySplit(q.data);
  // Destination/sector isn't captured on bookings yet → the server returns a single
  // "Unspecified" bucket. Flag it honestly rather than showing one bar as real analysis.
  const uncaptured=sorted.length>0&&sorted.every(d=>!d.destination||/^unspecified$/i.test(d.destination));
  return (
    <RPT_Page title="Yield by Destination" subtitle="Margin % by destination — live from posted bills"
      toolbar={<ReportDateBar value={range} onChange={setRange}/>}>
      <RptState q={q} empty={sorted.length===0} label="destination bookings">
      {uncaptured&&<div role="note" style={{margin:"0 0 12px",padding:"8px 12px",background:"#FAEEDA",border:"1px solid #f0d28a",borderRadius:8,fontSize:11.5,color:"#854F0B",fontWeight:600}}>⚠ Destination / sector isn’t captured on bookings yet — all revenue groups under “Unspecified”. Figures are live; the destination split becomes meaningful once bookings carry a destination.</div>}
      {split
        ? split.map((c)=>(
            <section key={c.currency} style={{marginBottom:22}}>
              <h3 style={{margin:"0 0 10px",fontSize:13,fontWeight:800,color:"#0d1326"}}>{c.symbol} <span style={{color:"#5a6691",fontWeight:600}}>({curRegion(c.symbol,c.currency)})</span></h3>
              <YieldBlock rows={c.rows||[]} sym={c.symbol} m={(n)=>cmoneyOf(c.symbol,n)} setRoute={setRoute}/>
            </section>
          ))
        : <YieldBlock rows={sorted} m={(n)=>cmoney(branch,n)} setRoute={setRoute}/>}
      </RptState>
    </RPT_Page>
  );
}
