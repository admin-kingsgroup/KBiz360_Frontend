import { useState } from 'react';
import { ReportDateBar, resolveReportRange } from '../../../core/reportDateBar';
import { useYearOverYear } from '../../../core/useAccounting';
import { cardStyle } from '../../../core/helpers';
import { RPT_thStyle, RPT_tdStyle, bc } from '../../../core/styleTokens';
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

  // CONSOLIDATED (ALL / Group scope): the BE returns `byBranch` = one YoY slice per
  // branch ([{ branch, rows, current, prior } | { branch, _error }]). Each branch is
  // rendered as its OWN table in its OWN currency — India ₹ and Africa $ lines are NEVER
  // summed into one figure. Falls through to the single-branch table when there is no
  // byBranch (old backend, or a non-ALL scope) — guarded via Array.isArray.
  const isAll = !branch || branch === 'ALL' || branch?.code === 'ALL';
  const byBranch = Array.isArray(q.data?.byBranch) ? q.data.byBranch : null;
  const showConsolidated = isAll && !!byBranch;

  // The SAME YoY table, driven by one scope's rows. `moneyArg` picks the currency:
  // single-branch passes the `branch` prop; a consolidated slice passes { code: <branch> }
  // so cmoney → bc resolves THAT branch's own currency. A bare code string would have no
  // `.code` and fall back to BOM/₹ in bc — which is exactly the merge bug being fixed —
  // so per branch we ALWAYS wrap it as { code: b.branch }.
  const yoyTable = (rows, moneyArg, curL, priorL) => (
    <div style={{...cardStyle,overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr><th style={RPT_thStyle}>Particulars</th><th style={{...RPT_thStyle,textAlign:"right"}}>{curL}</th><th style={{...RPT_thStyle,textAlign:"right"}}>{priorL}</th><th style={{...RPT_thStyle,textAlign:"right"}}>Variance</th><th style={{...RPT_thStyle,textAlign:"right"}}>%Δ</th></tr></thead>
        <tbody>{rows.map((l,i)=>{const variance=l.cy-l.ly;const pct=l.ly!==0?variance/Math.abs(l.ly)*100:0;const nav=rrow(setRoute,"/reports/pnl");const{style:navStyle,...navRest}=nav;return (<tr key={i} {...navRest} style={{...(l.bold?{background:"#fafbfd",fontWeight:700}:{}),...navStyle}}><td style={{...RPT_tdStyle,fontWeight:l.bold?700:400,fontSize:l.bold?12.5:12}}>{l.line}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",fontWeight:l.bold?700:500}}>{cmoney(moneyArg, l.cy)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:"#5a6691"}}>{cmoney(moneyArg, l.ly)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:variance>=0?(l.group==="Costs"?"#A32D2D":"#22c55e"):(l.group==="Costs"?"#22c55e":"#A32D2D"),fontWeight:700}}>{variance>=0?"+":""}{cmoney(moneyArg, Math.abs(variance))}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:pct>=0?(l.group==="Costs"?"#A32D2D":"#22c55e"):(l.group==="Costs"?"#22c55e":"#A32D2D")}}>{pct>=0?"+":""}{pct.toFixed(1)}%</td></tr>);})}</tbody>
      </table>
    </div>
  );

  return (
    <RPT_Page title="Year-over-Year Comparison" subtitle={`${curLabel}  vs  ${priorLabel} · same window, prior year`}
      toolbar={<ReportDateBar value={range} onChange={setRange}/>}>
      <RptState q={q} empty={showConsolidated ? byBranch.length===0 : lines.length===0} label="P&L data">
      {showConsolidated ? (
        <>
          <p style={{margin:"0 0 12px",fontSize:11.5,color:"#5a6691"}}>Consolidated — each branch in its own currency · no cross-currency total.</p>
          {byBranch.map((b)=>{const cLbl=b.current?.label||curLabel,pLbl=b.prior?.label||priorLabel;return (
            <section key={b.branch} style={{marginBottom:22}}>
              <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:8,paddingBottom:6,borderBottom:"2px solid #0d1326"}}>
                <span style={{fontSize:14.5,fontWeight:800,color:"#0d1326"}}>{b.branch}</span>
                <span style={{fontSize:12,fontWeight:700,color:"#5a6691"}}>· {bc({code:b.branch}).cur}</span>
              </div>
              {b._error
                ? <div style={{...cardStyle,background:"#FCEBEB",border:"1px solid #E8B4B4"}}><p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>Couldn’t load {b.branch}</p><p style={{margin:"3px 0 0",fontSize:11,color:"#A32D2D"}}>{b._error}</p></div>
                : (b.rows||[]).length===0
                  ? <div style={{...cardStyle,background:"#FFF8E8",border:"1px solid #F0D98A"}}><p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>No P&L data for {b.branch} in this window</p><p style={{margin:"3px 0 0",fontSize:11,color:"#5a6691"}}>Nothing posted for this branch in the selected window — widen the range or check the branch books.</p></div>
                  : yoyTable(b.rows, {code:b.branch}, cLbl, pLbl)}
            </section>
          );})}
        </>
      ) : yoyTable(lines, branch, curLabel, priorLabel)}
      </RptState>
    </RPT_Page>
  );
}
