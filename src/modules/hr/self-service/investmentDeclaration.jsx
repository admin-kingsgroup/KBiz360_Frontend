/* ════════════════════════════════════════════════════════════════════
   INVESTMENT DECLARATION (tax-saving investments, FY)
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of finance/legacy.jsx —
   MENU_HR ▸ Self-Service (href /hr/investment-declaration), not a
   Finance-menu item. finance/index.js re-exports InvestmentDeclaration from
   here so App.jsx's barrel import needed zero changes.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { fmtINR } from '../../../core/format';
import { cardStyle, INVESTMENT_SECTIONS } from '../../../core/helpers';
import { RPT_thStyle, RPT_tdStyle } from '../../../core/styles';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';

export function InvestmentDeclaration(){
  const [vals,setVals]=useState(Object.fromEntries(INVESTMENT_SECTIONS.map(s=>[s.section,s.declared])));
  const totalDeclared=Object.values(vals).reduce((s,v)=>s+v,0);
  const estimatedTax=Math.max(0,Math.round((totalDeclared>500000?(totalDeclared-500000)*0.2:0)-totalDeclared*0.05));
  const inp={padding:"7px 8px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,textAlign:"right",fontFamily:"monospace",width:120};
  return(
    <PHASE2_Page title="Investment Declaration — FY 2026-27" subtitle="Declare your tax-saving investments · used for TDS calculation">
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
        <div style={cardStyle}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Declare Investments (FY 2026-27)</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Section & Description</th><th style={{...RPT_thStyle,textAlign:"right"}}>Max Limit</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount Declared</th><th style={RPT_thStyle}>Proof Required</th></tr></thead>
            <tbody>{INVESTMENT_SECTIONS.map(s=>(
              <tr key={s.section} style={{borderBottom:"1px solid #dfe2e7"}}>
                <td style={{...RPT_tdStyle,fontWeight:600}}>{s.label}</td>
                <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:"#5a6691"}}>{s.limit>0?fmtINR(s.limit):"No limit"}</td>
                <td style={{padding:"6px 12px",borderBottom:"1px solid #dfe2e7",textAlign:"right"}}>
                  <input type="number" value={vals[s.section]||""} onChange={e=>setVals(v=>({...v,[s.section]:+e.target.value}))} style={{...inp,borderColor:s.limit>0&&(vals[s.section]||0)>s.limit?"#A32D2D":"#e1e3ec"}}/>
                  {s.limit>0&&(vals[s.section]||0)>s.limit&&<p style={{margin:"2px 0 0",fontSize:9.5,color:"#A32D2D"}}>Exceeds limit</p>}
                </td>
                <td style={{...RPT_tdStyle,fontSize:10.5,color:"#5a6691"}}>{s.proof}</td>
              </tr>
            ))}</tbody>
          </table>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14}}>
            <button style={{padding:"8px 16px",background:"#fff",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>Save Draft</button>
            <button style={{padding:"8px 18px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>Submit Declaration</button>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{padding:16,background:"#0d1326",borderRadius:8,color:"#fff"}}>
            <p style={{margin:"0 0 10px",fontSize:11,color:"#d4a437",fontWeight:700,textTransform:"uppercase"}}>Tax Summary (estimate)</p>
            {[{l:"Gross Salary",v:"₹5,76,000"},{l:"Total Deductions",v:fmtINR(totalDeclared)},{l:"Taxable Income",v:fmtINR(Math.max(0,576000-totalDeclared))}].map(r=>(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #ffffff15",fontSize:12}}>
                <span style={{color:"#5a6691"}}>{r.l}</span><span style={{fontWeight:700,fontFamily:"monospace"}}>{r.v}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,fontSize:14,fontWeight:700}}>
              <span style={{color:"#d4a437"}}>Tax Saved</span>
              <span style={{color:"#22c55e",fontFamily:"monospace"}}>{fmtINR(Math.round(totalDeclared*0.2))}</span>
            </div>
          </div>
          <div style={{padding:12,background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,fontSize:11,color:"#5a6691"}}>
            <p style={{margin:"0 0 6px",fontWeight:700,color:"#0d1326",fontSize:12}}>⚠ Important</p>
            <p style={{margin:0}}>• Submit actual proof documents by 31-Jan-2027<br/>• Declarations must be submitted by 15-Apr-2026<br/>• False declarations attract tax + penalty<br/>• Consult your CA for complex scenarios</p>
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}
