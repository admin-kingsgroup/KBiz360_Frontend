/* ── Employee Master, tabbed view (/hr/employee-tabs) ─────────── */

import { useState } from 'react';
import { TAB_Page, cardStyle, tabPanel } from '../../../core/helpers';
import { FL, inpStd, tabBtnStyle } from '../../../core/styles';

export function EmployeeMasterTabbed(){
  const [tab,setTab]=useState("basic");
  const tabs=[{id:"basic",label:"1. Basic Info"},{id:"address",label:"2. Address"},{id:"bank",label:"3. Bank Details"},{id:"tax",label:"4. Tax Info"},{id:"salary",label:"5. Salary Components"},{id:"leave",label:"6. Leave Balance"},{id:"attend",label:"7. Attendance"},{id:"perf",label:"8. Performance"},{id:"docs",label:"9. Documents"},{id:"notes",label:"10. Notes"}];
  return TAB_Page("Employee Master", "10-tab structure",
    {user:"AD",date:"2026-05-19 11:30",created:"2017-06-01 09:00"},
    <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,overflow:"hidden"}}>
      <div style={{display:"flex",borderBottom:"1px solid #cdd1d8",overflowX:"auto",background:"#fafbfd"}}>{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={tabBtnStyle(tab===t.id)}>{t.label}</button>)}</div>
      {tab==="basic"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
          <FL label="Full Name"><input defaultValue="" style={inpStd}/></FL>
          <FL label="Employee ID"><input defaultValue="" readOnly style={{...inpStd,fontFamily:"monospace",background:"#fafbfd"}}/></FL>
          <FL label="Date of Birth"><input type="date" defaultValue="1985-03-22" style={inpStd}/></FL>
          <FL label="Designation"><input defaultValue="Senior Finance Manager (CFO-equivalent)" style={inpStd}/></FL>
          <FL label="Department"><select style={inpStd}><option>Finance</option><option>Operations</option><option>HR</option><option>IT</option></select></FL>
          <FL label="Branch"><select style={inpStd}><option>BOMMB</option><option>BOM</option><option>AMD</option></select></FL>
          <FL label="Date of Joining"><input type="date" defaultValue="2017-06-01" style={inpStd}/></FL>
          <FL label="Years of Service"><input defaultValue="9 years" readOnly style={{...inpStd,background:"#fafbfd"}}/></FL>
          <FL label="Reporting To"><select style={inpStd}><option value="">— Select —</option></select></FL>
          <FL label="Email (Official)"><input defaultValue="faiz.fm@travkings.com" style={{...inpStd,fontFamily:"monospace",fontSize:11}}/></FL>
          <FL label="Phone"><input defaultValue="+91 98201 47892" style={inpStd}/></FL>
          <FL label="Status"><span style={{display:"inline-block",padding:"6px 12px",background:"#d4edda",color:"#155724",borderRadius:5,fontSize:12,fontWeight:700}}>✓ Active · Permanent</span></FL>
        </div>
      )}
      {tab==="address"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={{padding:12,background:"#fafbfd",borderRadius:6,border:"1px solid #cdd1d8"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase"}}>🏠 Current Address</p>
            <textarea defaultValue="Flat 1402, Sapphire Heights, Andheri West, Mumbai 400053, Maharashtra, India" rows={3} style={{...inpStd,marginTop:6,fontFamily:"inherit",resize:"vertical"}}/>
          </div>
          <div style={{padding:12,background:"#fafbfd",borderRadius:6,border:"1px solid #cdd1d8"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase"}}>🏡 Permanent Address</p>
            <textarea defaultValue="Patel Niwas, Khambhalia Gate, Jamnagar 361001, Gujarat, India" rows={3} style={{...inpStd,marginTop:6,fontFamily:"inherit",resize:"vertical"}}/>
          </div>
          <div style={{padding:12,background:"#fafbfd",borderRadius:6,border:"1px solid #cdd1d8",gridColumn:"1 / -1"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase"}}>📞 Emergency Contact</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:6}}>
              <FL label="Name"><input defaultValue="Rukhsana Patel" style={inpStd}/></FL>
              <FL label="Relationship"><input defaultValue="Spouse" style={inpStd}/></FL>
              <FL label="Phone"><input defaultValue="+91 98201 11223" style={inpStd}/></FL>
            </div>
          </div>
        </div>
      )}
      {tab==="bank"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FL label="Bank Name"><input defaultValue="HDFC Bank" style={inpStd}/></FL>
          <FL label="Account Number"><input defaultValue="50100123456789" style={{...inpStd,fontFamily:"monospace"}}/></FL>
          <FL label="IFSC"><input defaultValue="HDFC0000182" style={{...inpStd,fontFamily:"monospace"}}/></FL>
          <FL label="Account Type"><select style={inpStd}><option>Savings</option><option>Salary</option><option>Current</option></select></FL>
          <FL label="Beneficiary Name"><input defaultValue="FAIZ AHMED PATEL" style={inpStd}/></FL>
          <FL label="Branch"><input defaultValue="HDFC Andheri West" style={inpStd}/></FL>
          <div style={{gridColumn:"1 / -1",padding:10,background:"#fff3cd",border:"1px solid #ffe69a",borderRadius:6}}>
            <p style={{margin:0,fontSize:11.5,color:"#856404"}}><b>⚠ Bank account changes require approval</b> from the employee's reporting manager and HR Manager, and a void cheque/bank statement attachment.</p>
          </div>
        </div>
      )}
      {tab==="tax"&&tabPanel(
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:14}}>
            <FL label="PAN"><input defaultValue="ABCPF1234D" style={{...inpStd,fontFamily:"monospace"}}/></FL>
            <FL label="Aadhaar"><input defaultValue="XXXX XXXX 4521" style={{...inpStd,fontFamily:"monospace"}}/></FL>
            <FL label="Tax Regime"><select style={inpStd}><option>New Regime (FY 25-26)</option><option>Old Regime</option></select></FL>
          </div>
          <div style={cardStyle}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>Investment Declaration (FY 2025-26)</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead style={{background:"#f7f8fb"}}><tr><th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#5a6691",fontWeight:700}}>Section</th><th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#5a6691",fontWeight:700}}>Investment Type</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Declared</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Proof Received</th></tr></thead>
              <tbody>{[{s:"80C",t:"PPF + ELSS",d:150000,p:150000},{s:"80D",t:"Health Insurance",d:25000,p:25000},{s:"80CCD(1B)",t:"NPS",d:50000,p:0},{s:"24(b)",t:"Home Loan Interest",d:200000,p:200000}].map(r=>(<tr key={r.s} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"8px 12px",fontFamily:"monospace",fontWeight:600}}>{r.s}</td><td style={{padding:"8px 12px"}}>{r.t}</td><td style={{padding:"8px 12px",textAlign:"right"}}>₹{r.d.toLocaleString("en-IN")}</td><td style={{padding:"8px 12px",textAlign:"right",color:r.p===r.d?"#22c55e":r.p>0?"#d4a437":"#A32D2D",fontWeight:700}}>₹{r.p.toLocaleString("en-IN")}</td></tr>))}</tbody>
            </table>
          </div>
        </>
      )}
      {tab==="salary"&&tabPanel(
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead style={{background:"#f7f8fb"}}><tr><th style={{padding:"9px 12px",textAlign:"left",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Component</th><th style={{padding:"9px 12px",textAlign:"right",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Monthly (₹)</th><th style={{padding:"9px 12px",textAlign:"right",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Annual (₹)</th><th style={{padding:"9px 12px",textAlign:"center",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Type</th></tr></thead>
          <tbody>{[{c:"Basic Salary",m:80000,t:"Earning"},{c:"House Rent Allowance (HRA)",m:32000,t:"Earning"},{c:"Conveyance Allowance",m:6000,t:"Earning"},{c:"Special Allowance",m:24000,t:"Earning"},{c:"Medical Allowance",m:1250,t:"Earning"},{c:"Provident Fund (Employee)",m:-9600,t:"Deduction"},{c:"Professional Tax",m:-200,t:"Deduction"},{c:"Income Tax (TDS)",m:-12500,t:"Deduction"}].map(r=>(<tr key={r.c} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"9px 12px",fontWeight:r.c==="Basic Salary"?700:400}}>{r.c}</td><td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:r.m<0?"#A32D2D":"#0d1326",fontWeight:600}}>{r.m<0?"(":""}₹{Math.abs(r.m).toLocaleString("en-IN")}{r.m<0?")":""}</td><td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:r.m<0?"#A32D2D":"#0d1326"}}>{r.m<0?"(":""}₹{Math.abs(r.m*12).toLocaleString("en-IN")}{r.m<0?")":""}</td><td style={{padding:"9px 12px",textAlign:"center"}}><span style={{padding:"2px 8px",background:r.t==="Earning"?"#d4edda":"#f8d7da",color:r.t==="Earning"?"#155724":"#721c24",borderRadius:3,fontSize:10,fontWeight:700}}>{r.t}</span></td></tr>))}
          <tr style={{background:"#0d1326",color:"#d4a437"}}><td style={{padding:"10px 12px",fontWeight:700,letterSpacing:"0.3px"}}>NET TAKE-HOME (per month)</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,fontFamily:"monospace",fontSize:14}}>₹1,20,950</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,fontFamily:"monospace",fontSize:14}}>₹14,51,400</td><td></td></tr></tbody>
        </table>
      )}
      {tab==="leave"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {[{type:"Casual Leave (CL)",entitled:12,used:4,color:"#d4a437"},{type:"Sick Leave (SL)",entitled:8,used:2,color:"#A32D2D"},{type:"Earned Leave (EL)",entitled:24,used:2,color:"#22c55e"}].map(l=>{const pct=l.used/l.entitled*100;return (<div key={l.type} style={{padding:14,background:"#fafbfd",borderRadius:6,border:"1px solid #cdd1d8",borderTop:"3px solid "+l.color}}><p style={{margin:0,fontSize:11.5,fontWeight:700,color:"#0d1326"}}>{l.type}</p><div style={{display:"flex",alignItems:"baseline",gap:6,marginTop:8}}><span style={{fontSize:26,fontWeight:700,color:"#0d1326"}}>{l.entitled-l.used}</span><span style={{fontSize:12,color:"#5a6691"}}>/ {l.entitled} days left</span></div><div style={{marginTop:8,height:6,background:"#f0f2f7",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:l.color,borderRadius:3}}/></div><p style={{margin:"6px 0 0",fontSize:10.5,color:"#5a6691"}}>{l.used} used · {l.entitled-l.used} remaining</p></div>);})}
        </div>
      )}
      {tab==="attend"&&tabPanel(
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:14}}>Monthly Attendance Summary</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead style={{background:"#f7f8fb"}}><tr><th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#5a6691",fontWeight:700}}>Month</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Working Days</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Present</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Absent</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Leave</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>%</th></tr></thead>
            <tbody>{[{m:"May-26",w:22,p:21,a:0,l:1,pct:95.5},{m:"Apr-26",w:21,p:20,a:0,l:1,pct:95.2},{m:"Mar-26",w:23,p:23,a:0,l:0,pct:100},{m:"Feb-26",w:20,p:19,a:0,l:1,pct:95.0}].map(r=>(<tr key={r.m} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"8px 12px",fontWeight:600}}>{r.m}</td><td style={{padding:"8px 12px",textAlign:"right"}}>{r.w}</td><td style={{padding:"8px 12px",textAlign:"right",color:"#22c55e",fontWeight:700}}>{r.p}</td><td style={{padding:"8px 12px",textAlign:"right",color:r.a>0?"#A32D2D":"#5a6691"}}>{r.a}</td><td style={{padding:"8px 12px",textAlign:"right",color:"#d4a437"}}>{r.l}</td><td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:r.pct>=95?"#22c55e":"#d4a437"}}>{r.pct.toFixed(1)}%</td></tr>))}</tbody>
          </table>
        </div>
      )}
      {tab==="perf"&&tabPanel(
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
            {[{l:"Last Review",v:"Mar 2026",c:"#0d1326"},{l:"Rating",v:"4.5 / 5 ⭐",c:"#22c55e"},{l:"Next Review",v:"Mar 2027",c:"#d4a437"}].map(k=>(<div key={k.l} style={{padding:12,background:"#fafbfd",borderRadius:6,border:"1px solid #cdd1d8",borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"3px 0 0",fontSize:18,fontWeight:700,color:"#0d1326"}}>{k.v}</p></div>))}
          </div>
          <div style={cardStyle}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>Performance History</p>
            {[{p:"FY 2025-26",r:4.5,k:"Exceeded all targets · Led GST automation project · Clean audit"},{p:"FY 2024-25",r:4.2,k:"Met all targets · Successfully managed branch expansion"},{p:"FY 2023-24",r:4.0,k:"Met all targets · Process improvements in receivables management"}].map(p=>(<div key={p.p} style={{padding:"10px 12px",background:"#fafbfd",borderRadius:6,marginBottom:6,border:"1px solid #cdd1d8"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>{p.p}</p><span style={{padding:"2px 8px",background:p.r>=4.5?"#d4edda":p.r>=4?"#fff3cd":"#f8d7da",color:p.r>=4.5?"#155724":p.r>=4?"#856404":"#721c24",borderRadius:3,fontSize:11,fontWeight:700}}>⭐ {p.r}</span></div><p style={{margin:0,fontSize:11,color:"#5a6691"}}>{p.k}</p></div>))}
          </div>
        </>
      )}
      {tab==="docs"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>{["Offer Letter","Employment Contract","Background Verification","Educational Certificates","CA Membership Certificate","PAN Card Copy","Aadhaar Card Copy"].map(d=>(<div key={d} style={{padding:14,background:"#fafbfd",border:"1px solid #cdd1d8",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:32}}>📄</p><p style={{margin:"6px 0 2px",fontSize:11.5,color:"#0d1326",fontWeight:600}}>{d}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>2017-06-01</p><button style={{marginTop:6,padding:"3px 10px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:4,fontSize:10,cursor:"pointer",fontWeight:600}}>View</button></div>))}<button style={{padding:24,background:"transparent",border:"2px dashed #d4a437",color:"#d4a437",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>+ Upload</button></div>
      )}
      {tab==="notes"&&tabPanel(
        <div>{[].map((n,i)=>(<div key={i} style={{padding:"10px 12px",background:"#fafbfd",borderRadius:6,marginBottom:8,borderLeft:"3px solid #d4a437"}}><p style={{margin:0,fontSize:12,color:"#0d1326",lineHeight:1.5}}>{n.txt}</p><p style={{margin:"4px 0 0",fontSize:10,color:"#5a6691"}}>{n.u} · {n.ts}</p></div>))}</div>
      )}
    </div>
  );
}
