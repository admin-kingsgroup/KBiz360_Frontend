/* ════════════════════════════════════════════════════════════════════
   LOAN AMORTIZATION SCHEDULE
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of finance/legacy.jsx
   into its business sub-module folder — MENU_FINANCE ▸ Tools & Calculators
   ▸ "Loan Amortization Schedule" (href /finance/loan-amort). finance/index.js
   re-exports LoanAmortization from here so App.jsx's barrel import needed
   zero changes.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { cardStyle } from '../../../core/helpers';
import { RPT_thStyle, RPT_tdStyle } from '../../../core/styles';
import { fmtINR } from '../../../core/format';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';

export function LoanAmortization(){
  const [principal,setPrincipal]=useState(5000000);
  const [annualRate,setAnnualRate]=useState(10.5);
  const [tenureMonths,setTenureMonths]=useState(60);
  const [startDate,setStartDate]=useState("2026-06-01");
  const [showAll,setShowAll]=useState(false);
  const inp={padding:"8px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12.5,width:"100%"};

  const r=annualRate/100/12;
  const emi=principal>0&&r>0&&tenureMonths>0
    ?Math.round(principal*r*Math.pow(1+r,tenureMonths)/(Math.pow(1+r,tenureMonths)-1))
    :0;
  const totalPayment=emi*tenureMonths;
  const totalInterest=totalPayment-principal;

  const schedule=[];
  let bal=principal;
  const start=new Date(startDate);
  for(let m=1;m<=tenureMonths;m++){
    const intComp=Math.round(bal*r);
    const princComp=emi-intComp;
    bal=Math.max(0,bal-princComp);
    const d=new Date(start);
    d.setMonth(d.getMonth()+m-1);
    schedule.push({m,date:d.toISOString().slice(0,7),opening:bal+princComp,emi,interest:intComp,principal:princComp,closing:bal});
  }
  const display=showAll?schedule:schedule.slice(0,12);

  return(
    <PHASE2_Page title="Loan Amortization Schedule" subtitle="Full EMI breakup · month-by-month principal vs interest split">
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:14}}>
        {/* Inputs */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={cardStyle}>
            <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Loan Parameters</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Loan Amount (Principal)</label>
                <input type="number" value={principal} onChange={e=>setPrincipal(+e.target.value)} style={{...inp,fontFamily:"monospace",fontSize:14,fontWeight:700}}/></div>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Annual Interest Rate (%)</label>
                <input type="number" step="0.25" value={annualRate} onChange={e=>setAnnualRate(+e.target.value)} style={{...inp,fontFamily:"monospace",fontSize:14,fontWeight:700}}/></div>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Tenure (months)</label>
                <input type="number" value={tenureMonths} onChange={e=>setTenureMonths(+e.target.value)} style={{...inp,fontFamily:"monospace",fontSize:14,fontWeight:700}}/>
                <p style={{margin:"3px 0 0",fontSize:10.5,color:"#5a6691"}}>{Math.floor(tenureMonths/12)}y {tenureMonths%12}m</p></div>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>First EMI Date</label>
                <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={inp}/></div>
            </div>
          </div>

          {/* EMI summary */}
          <div style={{padding:16,background:"#0d1326",borderRadius:8,color:"#fff"}}>
            <p style={{margin:"0 0 10px",fontSize:11,color:"#d4a437",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Monthly EMI</p>
            <p style={{margin:"0 0 12px",fontSize:30,fontWeight:700,fontFamily:"monospace",color:"#fff"}}>{fmtINR(emi)}</p>
            {[{l:"Principal",v:fmtINR(principal),c:"#fff"},{l:"Total Interest",v:fmtINR(totalInterest),c:"#f97316"},{l:"Total Payment",v:fmtINR(totalPayment),c:"#d4a437"}].map(r=>(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderTop:"1px solid #ffffff15"}}>
                <span style={{fontSize:11,color:"#5a6691"}}>{r.l}</span>
                <span style={{fontSize:12,fontWeight:700,color:r.c,fontFamily:"monospace"}}>{r.v}</span>
              </div>
            ))}
          </div>

          {/* Interest ratio bar */}
          <div style={cardStyle}>
            <p style={{margin:"0 0 8px",fontSize:11.5,fontWeight:700,color:"#0d1326"}}>Principal vs Interest breakdown</p>
            <div style={{height:14,borderRadius:5,overflow:"hidden",display:"flex"}}>
              <div style={{background:"#22c55e",flex:principal}} title={`Principal: ${fmtINR(principal)}`}/>
              <div style={{background:"#f97316",flex:totalInterest}} title={`Interest: ${fmtINR(totalInterest)}`}/>
            </div>
            <div style={{display:"flex",gap:14,marginTop:6,fontSize:10.5}}>
              <span><span style={{color:"#22c55e",fontWeight:700}}>■</span> Principal {Math.round(principal/totalPayment*100)}%</span>
              <span><span style={{color:"#f97316",fontWeight:700}}>■</span> Interest {Math.round(totalInterest/totalPayment*100)}%</span>
            </div>
          </div>
        </div>

        {/* Schedule table */}
        <div style={cardStyle}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Amortization Schedule</p>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowAll(!showAll)} style={{padding:"5px 12px",background:"#fff",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:5,fontSize:11,fontWeight:600,cursor:"pointer"}}>{showAll?"Show first 12":"Show all "+tenureMonths}</button>
              <button style={{padding:"5px 12px",background:"#fff",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:5,fontSize:11,fontWeight:600,cursor:"pointer"}}>📥 Excel</button>
            </div>
          </div>
          <div style={{maxHeight:480,overflowY:"auto",border:"1px solid #cdd1d8",borderRadius:6}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead style={{background:"#f7f8fb",position:"sticky",top:0}}>
                <tr><th style={RPT_thStyle}>#</th><th style={RPT_thStyle}>Date</th><th style={{...RPT_thStyle,textAlign:"right"}}>Opening</th><th style={{...RPT_thStyle,textAlign:"right"}}>EMI</th><th style={{...RPT_thStyle,textAlign:"right",color:"#f97316"}}>Interest</th><th style={{...RPT_thStyle,textAlign:"right",color:"#22c55e"}}>Principal</th><th style={{...RPT_thStyle,textAlign:"right"}}>Closing</th></tr>
              </thead>
              <tbody>{display.map(r=>(
                <tr key={r.m} style={{borderBottom:"1px solid #dfe2e7",background:r.m%2===0?"#fafbfd":"#fff"}}>
                  <td style={{...RPT_tdStyle,color:"#5a6691"}}>{r.m}</td>
                  <td style={{...RPT_tdStyle,fontFamily:"monospace"}}>{r.date}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{fmtINR(r.opening)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,fontFamily:"monospace"}}>{fmtINR(r.emi)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",color:"#f97316",fontFamily:"monospace"}}>{fmtINR(r.interest)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e",fontFamily:"monospace"}}>{fmtINR(r.principal)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{fmtINR(r.closing)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {!showAll&&tenureMonths>12&&<p style={{margin:"8px 0 0",fontSize:10.5,color:"#5a6691",textAlign:"center"}}>Showing 12 of {tenureMonths} instalments · click "Show all" to expand</p>}
        </div>
      </div>
    </PHASE2_Page>
  );
}
