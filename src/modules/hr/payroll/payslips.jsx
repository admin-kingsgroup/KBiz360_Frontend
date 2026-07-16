import { useState } from 'react';
import { Download } from 'lucide-react';
import { BRANCHES, HR_BRANCHES_F } from '../../../core/data';
import { useMasterList } from '../../../core/useMasters';
import { fromEmpDTO } from '../employeeMap';
import { usePayslips } from '../usePayroll';
import { btnG, card, inp } from '../../../core/styles';
import { SkeletonText } from '../../../shell/primitives';

export function HrPayslips({branch}){
  // Rolling last-6-months from the live clock (was frozen at Mar–May 2026, hiding the
  // current month) — same fix already applied to HrAttendance / HrPayroll.
  const MONTHS=(()=>{const out=[];const d=new Date();for(let i=0;i<6;i++){const dt=new Date(d.getFullYear(),d.getMonth()-i,1);out.push({v:`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`,l:dt.toLocaleString("en",{month:"short"})+" "+dt.getFullYear()});}return out;})();
  const [month,setMonth]=useState(MONTHS[0].v);
  const [empId,setEmpId]=useState("");
  const [brFilter,setBrFilter]=useState(branch==="ALL"?"All":branch?.code||"All");

  /* Live, branch-scoped employees from the Employee Master; the payslip itself is
     computed from each employee's salary structure. */
  const brScope=branch==="ALL"?"":(branch?.code||"");
  const empsAll=((useMasterList('employees', brScope?{branch:brScope}:{}).data)||[]).map(fromEmpDTO);
  const filtEmps=empsAll.filter(e=>brFilter==="All"||e.branch===brFilter);
  const emp=empsAll.find(e=>e.id===empId)||filtEmps[0]||empsAll[0];
  /* The payslip is the PERSISTED payroll register line for (employee, month) —
     written by "Process Payroll" (server-side engine), never recomputed here. */
  const slipQ=usePayslips(emp?.id,month);
  const slip=slipQ.slips[0]||null;
  if(!emp) return (
    <div style={{padding:"40px 16px",textAlign:"center",color:"#8b94b3",fontSize:13}}>
      No employees for this branch yet — add them in <b>Employee Master</b> to generate payslips.
    </div>
  );
  const brCfg=BRANCHES.find(b=>b.code===emp.branch)||{cur:"₹",entity:"Travkings Tours & Travels"};
  const c=brCfg.cur;
  const gross=slip?.gross||0;
  const deductions=slip?.totalDeductions||0;
  const net=slip?.net||0;

  return (
    <div style={{padding:"20px 32px",maxWidth:1600,margin:"0 auto"}}>
      {/* Controls */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        flexWrap:"wrap",gap:10,marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#f3f4f8",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🧾</div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Payslips</h2>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <select value={month} onChange={e=>setMonth(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {MONTHS.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
          <select value={brFilter} onChange={e=>{setBrFilter(e.target.value);}} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {HR_BRANCHES_F.map(b=><option key={b}>{b}</option>)}
          </select>
          <select value={empId} onChange={e=>setEmpId(e.target.value)} style={{...inp,width:200,minHeight:32,fontSize:11}}>
            {filtEmps.map(e=><option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
          </select>
        </div>
      </div>

      {/* Payslip card */}
      <div id="payslip-content" style={{...card,overflow:"hidden",boxShadow:"0 4px 24px rgba(0,0,0,0.1)"}}>
        {/* Header */}
        <div style={{background:"#0d1326",padding:"20px 24px",display:"flex",
          justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{margin:0,fontSize:20,fontWeight:800,color:"#d4a437",letterSpacing:"-0.02em"}}>
              TRAVKINGS
            </p>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#8b94b3"}}>{brCfg.entity||"Travkings Tours & Travels"}</p>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#fff"}}>PAYSLIP</p>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#d4a437"}}>{MONTHS.find(m=>m.v===month)?.l}</p>
          </div>
        </div>

        {/* Employee info */}
        <div style={{padding:"16px 24px",borderBottom:"1px solid #cdd1d8",
          display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,background:"#f9fafb"}}>
          {[
            ["Employee Name",emp.name],["Employee ID",emp.id],
            ["Designation",emp.desig],["Department",emp.dept],
            ["Branch",emp.branch],["Date of Joining",emp.joined],
            ["Bank",emp.bank],["A/c No.",emp.ac],
          ].map(([l,v],i)=>(
            <div key={i} style={{display:"flex",gap:6}}>
              <span style={{fontSize:10.5,color:"#5a6691",minWidth:110}}>{l}:</span>
              <span style={{fontSize:10.5,fontWeight:600,color:"#0d1326"}}>{v}</span>
            </div>
          ))}
        </div>

        {/* No persisted payslip for this month → honest empty state (never recompute here) */}
        {!slip&&(
          <div style={{padding:"36px 24px",textAlign:"center",color:"#8b94b3",fontSize:12.5}}>
            {slipQ.isLoading?<SkeletonText lines={2} className="mx-auto max-w-xs" />:(<>
              No processed payroll for <b>{MONTHS.find(m=>m.v===month)?.l}</b> — run <b>⚙ Process Payroll</b> in Salary &amp; Payroll to generate this payslip.
            </>)}
          </div>
        )}
        {/* Earnings & Deductions */}
        {slip&&(<>
        <div style={{padding:"16px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          {/* Earnings */}
          <div>
            <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:"#27500A",textTransform:"uppercase",letterSpacing:"0.5px"}}>Earnings</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#EAF3DE"}}>
                <th style={{padding:"6px 10px",textAlign:"left",color:"#27500A",fontWeight:700,fontSize:10}}>Component</th>
                <th style={{padding:"6px 10px",textAlign:"right",color:"#27500A",fontWeight:700,fontSize:10}}>Amount</th>
              </tr></thead>
              <tbody>
                {[["Basic Salary",slip.basic],["HRA",slip.hra],["Dearness Allowance",slip.da],["Travel Allowance",slip.travel],["Medical Allowance",slip.medical]].map(([l,v],i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #dfe2e7"}}>
                    <td style={{padding:"6px 10px",color:"#384677"}}>{l}</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{c}{v.toLocaleString()}</td>
                  </tr>
                ))}
                <tr style={{background:"#EAF3DE",borderTop:"2px solid #27500A"}}>
                  <td style={{padding:"8px 10px",fontWeight:700}}>Gross Earnings</td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,color:"#27500A",fontVariantNumeric:"tabular-nums"}}>{c}{gross.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deductions */}
          <div>
            <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:"#A32D2D",textTransform:"uppercase",letterSpacing:"0.5px"}}>Deductions</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#FCEBEB"}}>
                <th style={{padding:"6px 10px",textAlign:"left",color:"#A32D2D",fontWeight:700,fontSize:10}}>Component</th>
                <th style={{padding:"6px 10px",textAlign:"right",color:"#A32D2D",fontWeight:700,fontSize:10}}>Amount</th>
              </tr></thead>
              <tbody>
                {[["Provident Fund",slip.empPF],["ESI",slip.empESI],["Professional Tax",slip.profTax],...(slip.lwpDed>0?[["LWP Deduction",slip.lwpDed]]:[]),["Income Tax (TDS)",slip.tds]].map(([l,v],i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #dfe2e7"}}>
                    <td style={{padding:"6px 10px",color:"#384677"}}>{l}</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{v>0?c+v.toLocaleString():"—"}</td>
                  </tr>
                ))}
                <tr style={{background:"#FCEBEB",borderTop:"2px solid #A32D2D"}}>
                  <td style={{padding:"8px 10px",fontWeight:700}}>Total Deductions</td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{c}{deductions.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Net Pay */}
        <div style={{margin:"0 24px 20px",padding:"14px 18px",
          background:"#0d1326",borderRadius:10,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{margin:0,fontSize:10.5,color:"#8b94b3"}}>Net Take-home Pay</p>
            <p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691"}}>{MONTHS.find(m=>m.v===month)?.l} · Credited to {emp.bank}</p>
          </div>
          <p style={{margin:0,fontSize:28,fontWeight:900,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>
            {c}{net.toLocaleString()}
          </p>
        </div>
        </>)}

        {/* Footer */}
        {slip&&<div style={{padding:"12px 24px",borderTop:"1px solid #cdd1d8",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <p style={{margin:0,fontSize:9.5,color:"#bfc3d6"}}>
            This is a computer-generated payslip. No signature required.
          </p>
          <button onClick={()=>{
            const html=document.getElementById("payslip-content")?.innerHTML||"";
            const blob=new Blob([`<html><body style="font-family:Arial;padding:20mm">${html}</body></html>`],{type:"text/html"});
            const url=URL.createObjectURL(blob);const a=document.createElement("a");
            a.href=url;a.download=`Payslip_${emp.id}_${month}.html`;
            document.body.appendChild(a);a.click();document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }} style={{...btnG,fontSize:11,display:"flex",alignItems:"center",gap:5}}>
            <Download size={13}/> Download Payslip
          </button>
        </div>}
      </div>
    </div>
  );
}
