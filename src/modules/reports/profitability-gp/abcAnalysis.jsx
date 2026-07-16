import { useState } from 'react';
import { ReportDateBar, resolveReportRange } from '../../../core/reportDateBar';
import { useAbcAnalysis } from '../../../core/useAccounting';
import { cardStyle } from '../../../core/helpers';
import { currencySplit, curRegion } from '../../../core/format';
import { RPT_thStyle, RPT_tdStyle } from '../../../core/styleTokens';
import { RPT_Page, RptState } from '../../../core/reportPage';
import { cmoney, cmoneyOf, rrow, partyLink } from './analyticsShared';

/* 10. ABC Analysis */

const EMPTY_CLS={count:0,value:0,share:0};
const grpStyle=cls=>({background:cls==="A"?"#fae7ad":cls==="B"?"#cfe2ff":"#e2e3e5",color:cls==="A"?"#664700":cls==="B"?"#004085":"#383d41"});

// One ABC block (class A/B/C summary cards + ranked table) in a single currency. Reused
// for the single-branch view and, in the consolidated ALL view, once per currency.
function AbcBlock({ rows, classes, m, by, setRoute }){
  return (
    <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {["A","B","C"].map(c=>{const cl=classes[c]||EMPTY_CLS;return (<div key={c} style={{...cardStyle,borderTop:"4px solid "+(c==="A"?"#d4a437":c==="B"?"#3b82f6":"#5a6691")}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{padding:"4px 10px",borderRadius:4,fontSize:13,fontWeight:700,letterSpacing:"0.5px",...grpStyle(c)}}>CLASS {c}</span><span style={{fontSize:11,color:"#5a6691"}}>{cl.count} items · {cl.share}% of total</span></div><p style={{margin:0,fontSize:22,fontWeight:700,color:"#0d1326"}}>{m(cl.value)}</p><p style={{margin:"3px 0 0",fontSize:10.5,color:"#5a6691"}}>{c==="A"?"Top contributors — focus & nurture":c==="B"?"Mid-tier — opportunity to grow":"Long tail — automate / rationalise"}</p></div>);})}
      </div>
      <div style={{...cardStyle,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Rank</th><th style={RPT_thStyle}>Name</th><th style={{...RPT_thStyle,textAlign:"right"}}>Value</th><th style={{...RPT_thStyle,textAlign:"right"}}>Share</th><th style={{...RPT_thStyle,textAlign:"right"}}>Cumulative</th><th style={{...RPT_thStyle,textAlign:"center"}}>Class</th></tr></thead>
          <tbody>{rows.map((d,i)=>{const val=d.value;return (<tr key={(d.name||d.destination)+i} {...rrow(setRoute, by==="customer"?partyLink("/reports/customer-360",d.name||d.destination):by==="supplier"?partyLink("/reports/supplier-360",d.name||d.destination):"/reports/destination")}><td style={{...RPT_tdStyle,color:"#5a6691"}}>{i+1}</td><td style={{...RPT_tdStyle,fontWeight:600}}>{d.name||d.destination}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{m(val)}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{d.share}%</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{d.cumPct}%</td><td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 9px",borderRadius:3,fontSize:10.5,fontWeight:700,letterSpacing:"0.3px",...grpStyle(d.class)}}>{d.class}</span></td></tr>);})}</tbody>
        </table>
      </div>
    </>
  );
}

export function RPT_ABCAnalysis({ branch, setRoute }){
  const [range,setRange]=useState(()=>({mode:'all',...resolveReportRange('all')}));
  const [dim,setDim]=useState("customers");
  const by=dim==="customers"?"customer":dim==="suppliers"?"supplier":"destination";
  const q=useAbcAnalysis(branch,{from:range.from||undefined,to:range.to||undefined,by});
  const data=q.data?.rows||[];                       // [{name,value,bookings,gp,share,cumPct,class}], ranked
  const classes=q.data?.classes||{A:EMPTY_CLS,B:EMPTY_CLS,C:EMPTY_CLS};
  // Consolidated ALL view mixing currencies → India (₹) & Africa ($) Pareto kept separate.
  const split=currencySplit(q.data);
  return (
    <RPT_Page title="ABC Analysis (Pareto)"
      subtitle="80/15/5 split based on contribution to value — live from posted bills"
      toolbar={<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><ReportDateBar value={range} onChange={setRange}/><select value={dim} onChange={e=>setDim(e.target.value)} style={{padding:"7px 11px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:11.5,background:"#fff"}}><option value="customers">By Customer (LTV)</option><option value="suppliers">By Supplier (Spend)</option><option value="destinations">By Destination (Revenue)</option></select></div>}>
      <RptState q={q} empty={data.length===0} label="contribution data">
      {split
        ? split.map((c)=>(
            <section key={c.currency} style={{marginBottom:22}}>
              <h3 style={{margin:"0 0 10px",fontSize:13,fontWeight:800,color:"#0d1326"}}>{c.symbol} <span style={{color:"#5a6691",fontWeight:600}}>({curRegion(c.symbol,c.currency)})</span></h3>
              <AbcBlock rows={c.rows||[]} classes={c.classes||{}} m={(n)=>cmoneyOf(c.symbol,n)} by={by} setRoute={setRoute}/>
            </section>
          ))
        : <AbcBlock rows={data} classes={classes} m={(n)=>cmoney(branch,n)} by={by} setRoute={setRoute}/>}
      </RptState>
    </RPT_Page>
  );
}
