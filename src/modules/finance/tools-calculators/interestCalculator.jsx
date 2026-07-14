/* ════════════════════════════════════════════════════════════════════
   INTEREST CALCULATOR (delayed payments)
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of finance/legacy.jsx
   into its business sub-module folder — MENU_FINANCE ▸ Tools & Calculators
   ▸ "Interest Calculator" (href /finance/interest-calc). finance/index.js
   re-exports InterestCalculator from here so App.jsx's barrel import
   needed zero changes.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { cardStyle } from '../../../core/helpers';
import { RPT_thStyle, RPT_tdStyle } from '../../../core/styles';
import { fmtINR } from '../../../core/format';
import { todayISO } from '../../../core/dates';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';

export function InterestCalculator(){
  const [principal,setPrincipal]=useState(500000);
  const [rate,setRate]=useState(18);
  const [dueDate,setDueDate]=useState("2026-04-01");
  const [calcDate,setCalcDate]=useState(todayISO());
  const [mode,setMode]=useState("simple");
  const inp={padding:"8px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12.5,width:"100%"};

  const msPerDay=86400000;
  const days=Math.max(0,Math.round((new Date(calcDate)-new Date(dueDate))/msPerDay));
  const simpleInt=Math.round(principal*rate/100*days/365);
  const compInt=Math.round(principal*(Math.pow(1+rate/100/12,days/30.44)-1));
  const interest=mode==="simple"?simpleInt:compInt;
  const total=principal+interest;

  const monthly=[];
  let rem=principal,runInt=0;
  const monthRate=rate/100/12;
  for(let m=1;m<=Math.min(Math.ceil(days/30),12);m++){
    const mInt=Math.round(rem*monthRate);
    runInt+=mInt;
    monthly.push({m,opening:rem,interest:mInt,cumInt:runInt});
  }

  return(
    <PHASE2_Page title="Interest Calculator — Delayed Payments"
      subtitle="Calculate interest on overdue invoices · simple or compound · per-day granularity">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={cardStyle}>
          <p style={{margin:"0 0 16px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Input Parameters</p>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Outstanding Amount (Principal)</label>
              <input type="number" value={principal} onChange={e=>setPrincipal(+e.target.value)} style={{...inp,fontFamily:"monospace",fontSize:14,fontWeight:700}}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Due Date</label>
                <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={inp}/></div>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Calculate As Of</label>
                <input type="date" value={calcDate} onChange={e=>setCalcDate(e.target.value)} style={inp}/></div>
            </div>
            <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Interest Rate (% p.a.)</label>
              <input type="number" step="0.5" value={rate} onChange={e=>setRate(+e.target.value)} style={{...inp,fontFamily:"monospace",fontSize:14,fontWeight:700}}/></div>
            <div style={{display:"flex",gap:8}}>
              {["simple","compound"].map(m=>(
                <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"9px",border:mode===m?"2px solid #d4a437":"1px solid #cdd1d8",background:mode===m?"#fff8e8":"#fff",color:mode===m?"#0d1326":"#5a6691",borderRadius:6,fontSize:12,fontWeight:mode===m?700:500,cursor:"pointer",textTransform:"capitalize"}}>{m} Interest</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{padding:18,background:"#0d1326",borderRadius:8,color:"#fff",textAlign:"center"}}>
            <p style={{margin:0,fontSize:11,color:"#d4a437",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Delay — {days} days</p>
            <p style={{margin:"8px 0 4px",fontSize:11,color:"#5a6691"}}>Principal</p>
            <p style={{margin:"0 0 8px",fontSize:20,fontWeight:700,fontFamily:"monospace",color:"#fff"}}>{fmtINR(principal)}</p>
            <div style={{borderTop:"1px solid #ffffff20",paddingTop:8,marginTop:4}}>
              <p style={{margin:0,fontSize:11,color:"#f97316",fontWeight:700,textTransform:"uppercase"}}>Interest ({mode})</p>
              <p style={{margin:"4px 0 8px",fontSize:28,fontWeight:700,fontFamily:"monospace",color:"#f97316"}}>+ {fmtINR(interest)}</p>
            </div>
            <div style={{borderTop:"1px solid #ffffff20",paddingTop:8}}>
              <p style={{margin:0,fontSize:11,color:"#d4a437",fontWeight:700,textTransform:"uppercase"}}>Total Recoverable</p>
              <p style={{margin:"4px 0 0",fontSize:30,fontWeight:700,fontFamily:"monospace",color:"#d4a437"}}>{fmtINR(total)}</p>
            </div>
          </div>

          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Monthly Breakup</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#f7f8fb"}}>
                <th style={RPT_thStyle}>Month</th>
                <th style={{...RPT_thStyle,textAlign:"right"}}>Opening</th>
                <th style={{...RPT_thStyle,textAlign:"right"}}>Interest</th>
                <th style={{...RPT_thStyle,textAlign:"right"}}>Cumul. Int.</th>
              </tr></thead>
              <tbody>{monthly.map(r=>(
                <tr key={r.m} style={{borderBottom:"1px solid #dfe2e7"}}>
                  <td style={{...RPT_tdStyle,fontWeight:600}}>Month {r.m}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{fmtINR(r.opening)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",color:"#f97316",fontWeight:700,fontFamily:"monospace"}}>{fmtINR(r.interest)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{fmtINR(r.cumInt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}
