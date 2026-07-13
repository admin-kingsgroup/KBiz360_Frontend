import { useState } from 'react';
import { Truck, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import { ReportDateBar, resolveReportRange } from '../../../core/reportDateBar';
import { useGpBills } from '../../../core/useAccounting';
import { cardStyle } from '../../../core/helpers';
import { KpiCard, RPT_thStyle, RPT_tdStyle } from '../../../core/styleTokens';
import { RPT_Page, RptState } from '../../../core/reportPage';
import { cmoney, rrow, partyLink, aggBills } from './analyticsShared';

/* 7. Yield per Supplier */

export function RPT_YieldSupplier({ branch, setRoute }){
  // NOTE: the books store ACTUAL supplier cost only (no "expected cost" source),
  // so this is reframed from expected-vs-actual variance to real spend / margin
  // contribution per supplier. Wire an expected-cost feed to restore variance.
  const [range,setRange]=useState(()=>({mode:'all',...resolveReportRange('all')}));
  const q=useGpBills(branch,{from:range.from||undefined,to:range.to||undefined});
  const rows=aggBills(q.data,b=>b.supplier,'No supplier').map(g=>({supplier:g.key,bookings:g.bookings,cost:g.cost,revenue:g.revenue,gp:g.gp,gpPct:g.gpPct})).sort((a,b)=>b.cost-a.cost);
  const totalCost=rows.reduce((s,x)=>s+x.cost,0);
  const totalRev=rows.reduce((s,x)=>s+x.revenue,0);
  const totalGP=rows.reduce((s,x)=>s+x.gp,0);
  return (
    <RPT_Page title="Yield by Supplier" subtitle="Spend, revenue & margin contribution per supplier — live from posted bills"
      toolbar={<ReportDateBar value={range} onChange={setRange}/>}>
      <RptState q={q} empty={rows.length===0} label="supplier purchases">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        <KpiCard label="Total Supplier Cost" value={cmoney(branch, totalCost)} Icon={Truck} accent="warning" />
        <KpiCard label="Revenue Booked" value={cmoney(branch, totalRev)} Icon={TrendingUp} accent="info" />
        <KpiCard label="GP Generated" value={cmoney(branch, totalGP)} Icon={PieChartIcon} accent="success" />
      </div>
      <div style={{...cardStyle,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Supplier</th><th style={{...RPT_thStyle,textAlign:"right"}}>Bookings</th><th style={{...RPT_thStyle,textAlign:"right"}}>Cost (Spend)</th><th style={{...RPT_thStyle,textAlign:"right"}}>Revenue</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP</th><th style={{...RPT_thStyle,textAlign:"right"}}>GP %</th><th style={{...RPT_thStyle,textAlign:"right"}}>Cost Share</th></tr></thead>
          <tbody>{rows.map(s=>{const share=totalCost>0?(s.cost/totalCost*100):0;return (<tr key={s.supplier} {...rrow(setRoute, partyLink("/reports/supplier-360", s.supplier))}><td style={{...RPT_tdStyle,fontWeight:600}}>{s.supplier}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{s.bookings}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{cmoney(branch, s.cost)}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{cmoney(branch, s.revenue)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e",fontWeight:700}}>{cmoney(branch, s.gp)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:s.gpPct>=18?"#22c55e":s.gpPct>=10?"#d4a437":"#A32D2D"}}>{s.gpPct.toFixed(1)}%</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#5a6691"}}>{share.toFixed(1)}%</td></tr>);})}</tbody>
        </table>
      </div>
      </RptState>
    </RPT_Page>
  );
}
