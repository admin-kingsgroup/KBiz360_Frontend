import { useState } from 'react';
import { useTaxFilingBoard } from '../../core/useTaxReco';
import { cardStyle } from '../../core/helpers';
import { RPT_thStyle, RPT_tdStyle } from '../../core/styleTokens';
import { RPT_Page, RptState } from '../../core/reportPage';

/* 15. Tax Filing Status Board */

export function RPT_TaxFilingBoard({ branch }){
  // Filed/Pending is derived live from entered return figures (no static data).
  const [period,setPeriod]=useState(()=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return d.toISOString().slice(0,7);});
  const q=useTaxFilingBoard(branch,period);
  const entities=q.data?.entities||[];
  const allTaxes=[...new Set(entities.flatMap(e=>Object.keys(e.taxes)))];
  const t=q.data?.totals||{filed:0,pending:0,returns:0};
  return (
    <RPT_Page title="Tax Filing Status Board" subtitle="GSTR / TDS / VAT — filed vs pending per branch, derived live from entered return figures"
      toolbar={<label style={{display:"flex",alignItems:"center",gap:6,fontSize:11.5,color:"#5a6691",fontWeight:600}}>Period
        <input type="month" value={period} onChange={e=>setPeriod(e.target.value)} style={{padding:"4px 8px",border:"1px solid #cdd1d8",borderRadius:4,fontSize:12}}/></label>}>
      <RptState q={q} empty={entities.length===0} label="branches">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Returns Tracked</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{t.returns}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Filed</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#155724"}}>{t.filed}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Pending</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#A32D2D"}}>{t.pending}</p></div>
      </div>
      <div style={cardStyle}>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={{...RPT_thStyle,minWidth:180}}>Entity</th>{allTaxes.map(t=><th key={t} style={{...RPT_thStyle,textAlign:"center",minWidth:100}}>{t}</th>)}</tr></thead>
          <tbody>{entities.map(e=>(<tr key={e.entity}><td style={{...RPT_tdStyle,fontWeight:700}}>{e.entity}</td>{allTaxes.map(t=>{const tax=e.taxes[t];if(!tax) return <td key={t} style={{...RPT_tdStyle,textAlign:"center",color:"#cbd0dc"}}>—</td>;return (<td key={t} style={{padding:"8px 6px",textAlign:"center",borderBottom:"1px solid #dfe2e7"}}><span style={{display:"inline-block",padding:"3px 10px",borderRadius:3,fontSize:10,fontWeight:700,letterSpacing:"0.3px",background:tax.status==="Filed"?"#d4edda":"#f8d7da",color:tax.status==="Filed"?"#155724":"#721c24"}}>{tax.status==="Filed"?"✓ Filed":"○ Pending"}</span>{tax.date!=="—"&&<p style={{margin:"3px 0 0",fontSize:9,color:"#5a6691",fontFamily:"monospace"}}>{tax.date}</p>}</td>);})}</tr>))}</tbody>
        </table></div>
      </div>
      </RptState>
    </RPT_Page>
  );
}
