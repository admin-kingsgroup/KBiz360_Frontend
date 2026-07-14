/* ══════════════════════════════════════════════════════════════════
   FORM 16 — SELF-SERVICE (/hr/form-16, scoped to the logged-in employee)
   Replaces the demo Form16Generator on /hr/form-16: every figure below is a
   sum over MY persisted payroll register lines for the chosen FY. What Books
   does not have (TRACES Part A, Chapter VI-A declarations) is said outright.
   ══════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { Download } from 'lucide-react';
import { openPrintPreview } from '../../../core/PrintPreview';
import { BRANCHES } from '../../../core/data';
import { usePayslips, useMyEmployee } from '../usePayroll';
import { fyOfMonth, form16Summary } from '../payrollMaps';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';
import { SelfServiceGate } from './selfServiceGate';

export function MyForm16(){
  const my=useMyEmployee();
  return (
    <SelfServiceGate title="Form 16 — My TDS Summary" subtitle="Salary & TDS drawn from processed payroll runs" my={my}>
      {(emp)=><MyForm16Body emp={emp}/>}
    </SelfServiceGate>
  );
}

function MyForm16Body({emp}){
  const {slips,isLoading}=usePayslips(emp.id);
  const fys=[...new Set(slips.map(s=>fyOfMonth(s.month)))];
  const [selFy,setSelFy]=useState("");
  const fy=fys.includes(selFy)?selFy:fys[0]||"";
  const sum=form16Summary(slips,fy);
  const brCfg=BRANCHES.find(b=>b.code===emp.branch)||{entity:"Travkings Tours & Travels"};
  const rows=[
    {desc:`Gross Salary (${sum.months} processed month${sum.months===1?"":"s"})`,amount:sum.gross,bold:true},
    {desc:"Provident Fund deducted (employee share)",amount:sum.pf},
    {desc:"Professional Tax deducted",amount:sum.profTax},
    {desc:"Total TDS deducted on salary",amount:sum.tds,bold:true},
    {desc:"Net salary paid",amount:sum.net,bold:true},
  ];
  return(
    <PHASE2_Page title="Form 16 — My TDS Summary" subtitle={`${emp.name} (${emp.id}) · ${emp.branch}`}
      toolbar={<>{fys.length>0&&<select value={fy} onChange={e=>setSelFy(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}>{fys.map(o=><option key={o} value={o}>FY {o}</option>)}</select>}{sum.months>0&&<button onClick={()=>openPrintPreview({ selector:'main', title:'Form 16 Summary', recommend:'portrait' })} style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>📥 Download</button>}</>}>
      <div style={{maxWidth:720,margin:"0 auto"}}>
        {!isLoading&&sum.months===0?(
          <div style={{padding:"48px 24px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,textAlign:"center",color:"#8b94b3",fontSize:12.5}}>
            <p style={{margin:0,fontSize:30}}>📃</p>
            <p style={{margin:"10px 0 4px",fontSize:13.5,fontWeight:700,color:"#0d1326"}}>No processed payroll data yet</p>
            <p style={{margin:0,lineHeight:1.6}}>Form 16 figures appear here once payroll runs have been processed for you.</p>
          </div>
        ):(
        <div style={{background:"#fff",border:"2px solid #0d1326",borderRadius:6,overflow:"hidden",fontSize:12}}>
          <div style={{padding:"12px 20px",background:"#0d1326",color:"#fff",textAlign:"center"}}>
            <p style={{margin:0,fontSize:14,fontWeight:700,letterSpacing:"1px"}}>FORM 16 — SALARY &amp; TDS SUMMARY</p>
            <p style={{margin:"3px 0 0",fontSize:11,color:"#d4a437"}}>From processed payroll runs · FY {fy}</p>
          </div>
          <div style={{padding:"14px 20px",borderBottom:"2px solid #0d1326"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11.5}}>
              {[{l:"Employer (Deductor)",v:brCfg.entity||"Travkings Tours & Travels"},{l:"Branch",v:emp.branch},{l:"Employee Name",v:emp.name},{l:"Employee ID",v:emp.id},{l:"Financial Year",v:fy},{l:"Months Processed",v:String(sum.months)}].map(f=>(
                <div key={f.l} style={{display:"flex",gap:6,padding:"4px 0",borderBottom:"1px solid #dfe2e7"}}><span style={{color:"#5a6691",minWidth:150}}>{f.l}</span><b>{f.v}</b></div>
              ))}
            </div>
          </div>
          <div style={{padding:"14px 20px"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <tbody>{rows.map((r,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:r.bold?"#fafbfd":"#fff"}}>
                  <td style={{padding:"6px 8px",fontWeight:r.bold?700:400}}>{r.desc}</td>
                  <td style={{padding:"6px 8px",textAlign:"right",fontFamily:"monospace",fontWeight:r.bold?700:400}}>₹{Number(r.amount).toLocaleString("en-IN")}</td>
                </tr>
              ))}</tbody>
            </table>
            <div style={{marginTop:14,padding:"10px 12px",borderRadius:6,background:"#fff8e8",border:"1px solid #fde68a",fontSize:10.5,color:"#856404",lineHeight:1.6}}>
              This is a summary computed from your processed payroll register lines in Books — not an issued certificate.
              Part A (TRACES quarterly TDS certificate), HRA / Chapter VI-A exemptions and the final tax computation are
              issued by HR and are not available in Books yet.
            </div>
          </div>
        </div>
        )}
      </div>
    </PHASE2_Page>
  );
}
