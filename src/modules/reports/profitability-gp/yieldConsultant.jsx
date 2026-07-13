import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ReportDateBar, resolveReportRange } from '../../../core/reportDateBar';
import { useGpBills } from '../../../core/useAccounting';
import { cardStyle } from '../../../core/helpers';
import { RPT_thStyle, RPT_tdStyle } from '../../../core/styleTokens';
import { RPT_Page, RptState } from '../../../core/reportPage';
import { cmoney, rrow, aggBills } from './analyticsShared';

/* 6. Yield per Consultant */

export function RPT_YieldConsultant({ branch, setRoute }){
  const [range,setRange]=useState(()=>({mode:'all',...resolveReportRange('all')}));
  const q=useGpBills(branch,{from:range.from||undefined,to:range.to||undefined});
  const rows=aggBills(q.data,b=>b.consultant,'Unassigned').map(g=>({consultant:g.key,branch:g.branches[0]||'—',bookings:g.bookings,revenue:g.revenue,avgBookingValue:g.bookings>0?Math.round(g.revenue/g.bookings):0,gp:g.gp,gpPct:g.gpPct})).sort((a,b)=>b.revenue-a.revenue);
  return (
    <RPT_Page title="Yield by Consultant" subtitle="Margin earned per consultant — live from posted bills"
      toolbar={<ReportDateBar value={range} onChange={setRange}/>}>
      <RptState q={q} empty={rows.length===0} label="consultant bookings">
      <div style={cardStyle}>
        <ResponsiveContainer width="100%" height={Math.max(240,rows.length*32)}>
          <BarChart data={rows} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7"/>
            <XAxis type="number" tick={{fontSize:10,fill:"#5a6691"}} tickFormatter={v=>(v/100000).toFixed(0)+"L"}/>
            <YAxis dataKey="consultant" type="category" tick={{fontSize:11,fill:"#0d1326"}} width={90}/>
            <Tooltip formatter={v=>cmoney(branch, v)}/>
            <Legend wrapperStyle={{fontSize:11}}/>
            <Bar dataKey="revenue" fill="#0d1326" name="Revenue"/>
            <Bar dataKey="gp" fill="#d4a437" name="GP"/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{...cardStyle,marginTop:14,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Consultant</th><th style={RPT_thStyle}>Branch</th><th style={{...RPT_thStyle,textAlign:"right"}}>Bookings</th><th style={{...RPT_thStyle,textAlign:"right"}}>Revenue</th><th style={{...RPT_thStyle,textAlign:"right"}}>Avg Basket</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP %</th></tr></thead>
          <tbody>{rows.map(c=>(<tr key={c.consultant} {...rrow(setRoute, "/reports/consultant")}><td style={{...RPT_tdStyle,fontWeight:700}}>{c.consultant}</td><td style={RPT_tdStyle}><span style={{padding:"2px 6px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{c.branch}</span></td><td style={{...RPT_tdStyle,textAlign:"right"}}>{c.bookings}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{cmoney(branch, c.revenue)}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{cmoney(branch, c.avgBookingValue)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e",fontWeight:700}}>{cmoney(branch, c.gp)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:c.gpPct>=25?"#22c55e":c.gpPct>=18?"#d4a437":"#A32D2D"}}>{c.gpPct.toFixed(1)}%</td></tr>))}</tbody>
        </table>
      </div>
      </RptState>
    </RPT_Page>
  );
}
