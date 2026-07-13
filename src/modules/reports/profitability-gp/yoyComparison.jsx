import { useState } from 'react';
import { ReportDateBar, resolveReportRange } from '../../../core/reportDateBar';
import { useYearOverYear } from '../../../core/useAccounting';
import { cardStyle } from '../../../core/helpers';
import { RPT_thStyle, RPT_tdStyle } from '../../../core/styleTokens';
import { RPT_Page, RptState } from '../../../core/reportPage';
import { cmoney, rrow } from './analyticsShared';

/* 8. YoY Comparison */

export function RPT_YoY({ branch, setRoute }){
  // Compares the selected period against the SAME dates one year earlier
  // (two P&L runs against the live double-entry engine). Default YTD so there's
  // a bounded period to shift; "All" falls back to current FY vs prior FY.
  const [range,setRange]=useState(()=>({mode:'ytd',...resolveReportRange('ytd')}));
  const q=useYearOverYear(branch,{from:range.from||undefined,to:range.to||undefined});
  const lines=q.data?.rows||[];                      // [{line,group,cy,ly,bold}] from /yoy (two module-PL runs)
  const curLabel=q.data?.current?.label||'Current', priorLabel=q.data?.prior?.label||'Prior Year';
  return (
    <RPT_Page title="Year-over-Year Comparison" subtitle={`${curLabel}  vs  ${priorLabel} · same window, prior year`}
      toolbar={<ReportDateBar value={range} onChange={setRange}/>}>
      <RptState q={q} empty={lines.length===0} label="P&L data">
      <div style={{...cardStyle,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr><th style={RPT_thStyle}>Particulars</th><th style={{...RPT_thStyle,textAlign:"right"}}>{curLabel}</th><th style={{...RPT_thStyle,textAlign:"right"}}>{priorLabel}</th><th style={{...RPT_thStyle,textAlign:"right"}}>Variance</th><th style={{...RPT_thStyle,textAlign:"right"}}>%Δ</th></tr></thead>
          <tbody>{lines.map((l,i)=>{const variance=l.cy-l.ly;const pct=l.ly!==0?variance/Math.abs(l.ly)*100:0;const nav=rrow(setRoute,"/reports/pnl");const{style:navStyle,...navRest}=nav;return (<tr key={i} {...navRest} style={{...(l.bold?{background:"#fafbfd",fontWeight:700}:{}),...navStyle}}><td style={{...RPT_tdStyle,fontWeight:l.bold?700:400,fontSize:l.bold?12.5:12}}>{l.line}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",fontWeight:l.bold?700:500}}>{cmoney(branch, l.cy)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:"#5a6691"}}>{cmoney(branch, l.ly)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:variance>=0?(l.group==="Costs"?"#A32D2D":"#22c55e"):(l.group==="Costs"?"#22c55e":"#A32D2D"),fontWeight:700}}>{variance>=0?"+":""}{cmoney(branch, Math.abs(variance))}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:pct>=0?(l.group==="Costs"?"#A32D2D":"#22c55e"):(l.group==="Costs"?"#22c55e":"#A32D2D")}}>{pct>=0?"+":""}{pct.toFixed(1)}%</td></tr>);})}</tbody>
        </table>
      </div>
      </RptState>
    </RPT_Page>
  );
}
