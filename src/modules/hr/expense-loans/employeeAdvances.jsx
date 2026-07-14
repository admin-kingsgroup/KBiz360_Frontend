/* ── Employee Advances / Loans (/hr/loans-advances) ───────────── */

import { useState } from 'react';
import { BRANCHES } from '../../../core/data';
import { fmt } from '../../../core/format';
import { useMobile } from '../../../core/hooks';
import { useModalEsc } from '../../../core/ux/useModalEsc';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { fromLoanDTO, toLoanPayload } from '../hrMaps';
import { todayISO } from '../../../core/dates';
import { toast } from '../../../core/ux/toast';
import { FL, bc, btnG, btnGh, card, inp } from '../../../core/styles';

export function EmployeeAdvances({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brScope=branch==="ALL"?"":(branch?.code||"");
  const [filter,setFilter]=useState("Active");
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const blankLoan={name:"",empCode:"",designation:"",branch:brScope||"BOM",type:"Salary Advance",principal:0,emi:0,emiCount:0,paid:0,disbursedDate:todayISO()};
  const [form,setForm]=useState(blankLoan);

  /* Live, branch-scoped employee-loan register; outstanding is derived. */
  const loansQ=useMasterList('employee-loans', brScope?{branch:brScope}:{});
  const all=((loansQ.data)||[]).map(fromLoanDTO);
  const {create}=useMasterMutations('employee-loans');
  const disburse=()=>{
    if(!form.name||!(+form.principal)){toast("Employee name and principal are required","error");return;}
    create.mutate(toLoanPayload(form),{onSuccess:()=>{toast("Loan disbursed");setModal(false);setForm(blankLoan);},onError:e=>toast(e?.message||"Could not disburse","error")});
  };
  const visible=filter==="Active"?all.filter(l=>l.outstanding>0):filter==="Closed"?all.filter(l=>l.outstanding===0):all;

  const totDisbursed=visible.reduce((s,l)=>s+l.principal,0);
  const totOutstanding=visible.reduce((s,l)=>s+l.outstanding,0);
  const totEmi=visible.reduce((s,l)=>s+(l.outstanding>0?l.emi:0),0);
  const activeCount=visible.filter(l=>l.outstanding>0).length;
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>👤 Employee Loans &amp; Salary Advances</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>Loan disbursement · EMI deduction schedule · Auto-recovery from payroll</p>
        </div>
        <button onClick={()=>{setForm(blankLoan);setModal(true);}} style={{padding:"7px 14px",border:"none",background:"#d4a437",color:"#0d1326",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"}}>＋ Disburse Loan</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Total Disbursed</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{cur+fmt(totDisbursed)}</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Outstanding</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{cur+fmt(totOutstanding)}</p></div>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Active Loans</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{activeCount}</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Monthly EMI Recovery</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{cur+fmt(totEmi)}</p></div>
      </div>

      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        {["Active","Closed","All"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"4px 12px",border:"1px solid "+(filter===f?"#0d1326":"#e1e3ec"),background:filter===f?"#0d1326":"#fff",color:filter===f?"#d4a437":"#5a6691",borderRadius:14,fontSize:11,fontWeight:600,cursor:"pointer"}}>{f}</button>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Loan ID</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Employee</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Type</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Principal</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Disbursed</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>EMI</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Paid/Total</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Outstanding</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Status</th>
            </tr></thead>
            <tbody>
              {visible.length===0&&(<tr><td colSpan={9} style={{padding:"18px 8px",textAlign:"center",color:"#8b94b3",fontSize:11.5}}>{loansQ.isLoading?"Loading…":"No loans for this filter. Use “Disburse Loan” to add one."}</td></tr>)}
              {visible.map((l,i)=>(
                <tr key={l.id} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{(l.id||"").slice(-6)}</td>
                  <td style={{padding:"7px 8px",fontWeight:600}}>{l.name}<div style={{fontSize:9.5,color:"#5a6691",fontWeight:400}}>{l.empCode} · {l.designation} · {l.branch}</div></td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:l.type==="Salary Advance"?"#FAEEDA":l.type==="Education Loan"?"#E6F1FB":"#FCEBEB",color:l.type==="Salary Advance"?"#854F0B":l.type==="Education Loan"?"#185FA5":"#A32D2D"}}>{l.type}</span></td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600}}>{cur+fmt(l.principal)}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{l.disbursedDate}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(l.emi)}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{l.paid}/{l.emiCount}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,color:l.outstanding>0?"#A32D2D":"#27500A"}}>{cur+fmt(l.outstanding)}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:l.outstanding>0?"#FAEEDA":"#EAF3DE",color:l.outstanding>0?"#854F0B":"#27500A"}}>{l.outstanding>0?"Active":"Closed"}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{background:"#FAEEDA",fontWeight:700,fontSize:11.5}}>
              <tr><td colSpan={3} style={{padding:"9px 8px",textAlign:"right"}}>TOTAL</td>
              <td style={{padding:"9px 8px",textAlign:"right"}}>{cur+fmt(totDisbursed)}</td>
              <td></td>
              <td style={{padding:"9px 8px",textAlign:"right"}}>{cur+fmt(totEmi)}</td>
              <td></td>
              <td style={{padding:"9px 8px",textAlign:"right",color:"#A32D2D"}}>{cur+fmt(totOutstanding)}</td>
              <td></td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p style={{marginTop:12,fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>
        💡 EMI auto-deducted from monthly payroll · Interest on staff loans &lt; SBI lending rate is treated as perquisite (Sec 17(2))
      </p>

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:520,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Disburse Employee Loan / Advance</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <FL label="Employee name"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp}/></FL>
              <FL label="Employee code"><input value={form.empCode} onChange={e=>setForm(f=>({...f,empCode:e.target.value}))} style={inp}/></FL>
              <FL label="Designation"><input value={form.designation} onChange={e=>setForm(f=>({...f,designation:e.target.value}))} style={inp}/></FL>
              <FL label="Branch"><select value={form.branch} onChange={e=>setForm(f=>({...f,branch:e.target.value}))} style={inp}>{BRANCHES.map(b=><option key={b.code} value={b.code}>{b.code}</option>)}</select></FL>
              <FL label="Loan type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}>{["Salary Advance","Education Loan","Personal Loan"].map(t=><option key={t}>{t}</option>)}</select></FL>
              <FL label="Principal"><input type="number" value={form.principal} onChange={e=>setForm(f=>({...f,principal:e.target.value}))} style={inp}/></FL>
              <FL label="EMI amount"><input type="number" value={form.emi} onChange={e=>setForm(f=>({...f,emi:e.target.value}))} style={inp}/></FL>
              <FL label="No. of EMIs"><input type="number" value={form.emiCount} onChange={e=>setForm(f=>({...f,emiCount:e.target.value}))} style={inp}/></FL>
              <FL label="EMIs already paid"><input type="number" value={form.paid} onChange={e=>setForm(f=>({...f,paid:e.target.value}))} style={inp}/></FL>
              <FL label="Disbursed on"><input type="date" value={form.disbursedDate} onChange={e=>setForm(f=>({...f,disbursedDate:e.target.value}))} style={inp}/></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={disburse} disabled={create.isPending} style={btnG}>{create.isPending?"Saving…":"Disburse"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
