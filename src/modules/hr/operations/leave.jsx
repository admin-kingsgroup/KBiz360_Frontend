/* ── Leave (/hr/leave) ─────────────────────────────────────────── */

import { useState } from 'react';
import { AlertTriangle, Plus, Save } from 'lucide-react';
import { useMobile } from '../../../core/hooks';
import { useModalEsc } from '../../../core/ux/useModalEsc';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { fromEmpDTO } from '../employeeMap';
import { fromLeaveDTO, toLeavePayload, leaveDays, fromLeaveBalanceDTO, toLeaveBalancePayload, takenFor } from '../hrMaps';
import { toast } from '../../../core/ux/toast';
import { FL, btnG, btnGh, card, inp } from '../../../core/styles';
import { Skeleton } from '../../../shell/primitives';

export function HrLeave({branch}){
  const mob=useMobile();
  const brScope=branch==="ALL"?"":(branch?.code||"");
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [tab,setTab]=useState("requests"); // requests | balances
  const [form,setForm]=useState({empId:"",empName:"",type:"Casual Leave",from:"",to:"",reason:""});
  const [balForm,setBalForm]=useState(null); // {empId,empName,branch,annual,sick,casual,id} when editing entitlement
  useModalEsc(()=>setBalForm(null),!!balForm);

  /* Live, branch-scoped employees (for the apply dropdown + balances) and the
     live leave-request register. */
  const emps=((useMasterList('employees', brScope?{branch:brScope}:{}).data)||[]).map(fromEmpDTO);
  const leaveQ=useMasterList('leave-requests', brScope?{branch:brScope}:{});
  const filtered=((leaveQ.data)||[]).map(fromLeaveDTO);
  const {create,update}=useMasterMutations('leave-requests');

  /* Live leave-balance ENTITLEMENT master for the current year; "taken" is derived from
     the approved requests above so the two never drift. Editable per employee. */
  const year=String(new Date().getFullYear());
  const balQ=useMasterList('leave-balances', brScope?{branch:brScope,year}:{year});
  const balByEmp=Object.fromEntries(((balQ.data)||[]).map(b=>{const x=fromLeaveBalanceDTO(b);return [x.empId,x];}));
  const {create:createBal,update:updateBal}=useMasterMutations('leave-balances');
  const saveBal=()=>{
    if(!balForm)return;
    const body=toLeaveBalancePayload({...balForm,year});
    const onDone={onSuccess:()=>{toast("Entitlement saved");setBalForm(null);},onError:e=>toast(e?.message||"Save failed","error")};
    if(balForm.id) updateBal.mutate({id:balForm.id,body},onDone); else createBal.mutate(body,onDone);
  };

  const pending =filtered.filter(l=>l.status==="Pending");
  const approved=filtered.filter(l=>l.status==="Approved");
  const STATUS_CLR={Pending:"#854F0B",Approved:"#27500A",Rejected:"#A32D2D",Cancelled:"#5a6691"};
  const STATUS_BG ={Pending:"#FAEEDA",Approved:"#EAF3DE",Rejected:"#FCEBEB",Cancelled:"#f3f4f8"};
  const TYPE_ICON ={"Annual Leave":"🏖","Sick Leave":"🏥","Casual Leave":"🎯","LWP":"❌","Earned":"🏖","Unpaid":"❌","Casual":"🎯","Sick":"🏥"};

  const approve=(l)=>update.mutate({id:l.id,body:toLeavePayload({...l,status:"Approved"})},{onError:e=>toast(e?.message||"Could not approve","error")});
  const reject =(l)=>update.mutate({id:l.id,body:toLeavePayload({...l,status:"Rejected"})},{onError:e=>toast(e?.message||"Could not reject","error")});

  const submit=()=>{
    if(!form.empName||!form.from||!form.to){toast("Employee, from and to dates are required","error");return;}
    const days=leaveDays(form.from,form.to);
    const emp=emps.find(e=>e.id===form.empId);
    create.mutate(toLeavePayload({...form,branch:emp?.branch||brScope,days,status:"Pending"}),{
      onSuccess:()=>{toast("Leave request submitted");setModal(false);setForm({empId:"",empName:"",type:"Casual Leave",from:"",to:"",reason:""});},
      onError:e=>toast(e?.message||"Submit failed","error")});
  };

  return (
    <div style={{padding:"20px 32px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🌴</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Leave Management</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{pending.length} pending approval · Annual / Sick / Casual / LWP</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {["requests","balances"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{...tab===t?btnG:btnGh,fontSize:11,textTransform:"capitalize"}}>{t}</button>
          ))}
          <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Apply</button>
        </div>
      </div>

      {pending.length>0&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:10.5,color:"#854F0B",fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
        <AlertTriangle size={14}/> {pending.length} leave request{pending.length>1?"s":""} pending your approval
      </div>}

      {tab==="requests"&&(
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["ID","Employee","Leave Type","From","To","Days","Reason","Status","Actions"].map((h,i)=>(
                <th key={i} style={{padding:"9px 12px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{leaveQ.isLoading&&Array.from({length:5}).map((_,i)=>(
              <tr key={`sk-${i}`}><td colSpan={9} style={{padding:"10px 12px"}}><Skeleton className="h-4 w-full" style={{opacity:Math.max(0.4,1-i*0.15)}} /></td></tr>
            ))}{!leaveQ.isLoading&&filtered.length===0&&(
              <tr><td colSpan={9} style={{padding:"20px 12px",textAlign:"center",color:"#8b94b3",fontSize:11.5}}>
                No leave requests for this branch yet. Use “Apply” to add one.
              </td></tr>
            )}{filtered.map((l,i)=>(
              <tr key={l.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10,color:"#5a6691"}}>{(l.id||"").slice(-6)}</td>
                <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{l.empName}</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:10}}>{TYPE_ICON[l.type]||"📋"} {l.type}</span></td>
                <td style={{padding:"8px 12px",color:"#5a6691",whiteSpace:"nowrap"}}>{l.from}</td>
                <td style={{padding:"8px 12px",color:"#5a6691",whiteSpace:"nowrap"}}>{l.to}</td>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:"#185FA5"}}>{l.days}</td>
                <td style={{padding:"8px 12px",color:"#384677",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.reason}</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[l.status],color:STATUS_CLR[l.status]}}>{l.status}</span></td>
                <td style={{padding:"8px 12px"}}>
                  {l.status==="Pending"&&<div style={{display:"flex",gap:4}}>
                    <button onClick={()=>approve(l)} disabled={update.isPending} style={{...btnG,padding:"2px 7px",fontSize:9,background:"#27500A"}}>✓ Approve</button>
                    <button onClick={()=>reject(l)}  disabled={update.isPending} style={{...btnGh,padding:"2px 7px",fontSize:9,color:"#A32D2D"}}>✗ Reject</button>
                  </div>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab==="balances"&&(
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Employee","Branch","Annual (rem/ent)","Sick (rem/ent)","Casual (rem/ent)","Total Remaining",""].map((h,i)=>(
                <th key={i} style={{padding:"9px 14px",textAlign:i>=2&&i<6?"right":"left",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{balQ.isLoading&&Array.from({length:5}).map((_,i)=>(
              <tr key={`sk-${i}`}><td colSpan={7} style={{padding:"10px 14px"}}><Skeleton className="h-4 w-full" style={{opacity:Math.max(0.4,1-i*0.15)}} /></td></tr>
            ))}{!balQ.isLoading&&emps.length===0&&(
              <tr><td colSpan={7} style={{padding:"20px 12px",textAlign:"center",color:"#8b94b3",fontSize:11.5}}>
                No employees for this branch.
              </td></tr>
            )}{emps.map((e,i)=>{
              const ent=balByEmp[e.id]||{annual:18,sick:12,casual:6,id:null};
              const taken=takenFor(filtered,e.id,year);
              const rem={annual:ent.annual-taken.annual,sick:ent.sick-taken.sick,casual:ent.casual-taken.casual};
              const cell=(val,ceil,warn,clr)=>(<td style={{padding:"9px 14px",textAlign:"right"}}>
                <span style={{fontSize:13,fontWeight:800,color:val<=warn?"#A32D2D":clr}}>{val}</span>
                <span style={{fontSize:10,color:"#5a6691"}}> / {ceil}</span></td>);
              return (
                <tr key={e.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"9px 14px",fontWeight:600,color:"#0d1326"}}>{e.name}</td>
                  <td style={{padding:"9px 14px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{e.branch}</span></td>
                  {cell(rem.annual,ent.annual,4,"#27500A")}
                  {cell(rem.sick,ent.sick,2,"#1D9E75")}
                  {cell(rem.casual,ent.casual,1,"#185FA5")}
                  <td style={{padding:"9px 14px",textAlign:"right",fontWeight:800,fontSize:15,color:"#0d1326"}}>{rem.annual+rem.sick+rem.casual}</td>
                  <td style={{padding:"9px 14px",textAlign:"right"}}>
                    <button onClick={()=>setBalForm({empId:e.id,empName:e.name,branch:e.branch,annual:ent.annual,sick:ent.sick,casual:ent.casual,id:ent.id})}
                      style={{...btnGh,padding:"3px 9px",fontSize:9.5}} title="Set entitlement">✎ Edit</button>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
          <p style={{margin:0,padding:"8px 14px",fontSize:10,color:"#8b94b3",borderTop:"1px solid #dfe2e7"}}>
            Entitlement = annual allotment ({year}); remaining = entitlement − approved leave taken this year. Edit sets the allotment.
          </p>
        </div>
      )}

      {balForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Leave entitlement · {balForm.empName} · {year}</p>
              <button onClick={()=>setBalForm(null)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <FL label="Annual"><input type="number" min={0} value={balForm.annual} onChange={e=>setBalForm(f=>({...f,annual:e.target.value}))} style={inp}/></FL>
              <FL label="Sick"><input type="number" min={0} value={balForm.sick} onChange={e=>setBalForm(f=>({...f,sick:e.target.value}))} style={inp}/></FL>
              <FL label="Casual"><input type="number" min={0} value={balForm.casual} onChange={e=>setBalForm(f=>({...f,casual:e.target.value}))} style={inp}/></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setBalForm(null)} style={btnGh}>Cancel</button>
              <button onClick={saveBal} disabled={createBal.isPending||updateBal.isPending} style={btnG}>{createBal.isPending||updateBal.isPending?"Saving…":"Save"}</button>
            </div>
          </div>
        </div>
      )}

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:460,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Apply for Leave</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <FL label="Employee"><select value={form.empId} onChange={e=>{const emp=emps.find(x=>x.id===e.target.value);setForm(f=>({...f,empId:e.target.value,empName:emp?.name||""}));}} style={inp}>
                <option value="">Select employee…</option>
                {emps.map(e=><option key={e.id} value={e.id}>{e.name} ({e.branch})</option>)}
              </select></FL>
              <FL label="Leave type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}>
                {["Annual Leave","Sick Leave","Casual Leave","LWP"].map(t=><option key={t}>{t}</option>)}
              </select></FL>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="From"><input type="date" value={form.from} onChange={e=>setForm(f=>({...f,from:e.target.value}))} style={inp}/></FL>
                <FL label="To"><input type="date" value={form.to} onChange={e=>setForm(f=>({...f,to:e.target.value}))} style={inp}/></FL>
              </div>
              <FL label="Reason"><textarea value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}}/></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={submit} disabled={create.isPending} style={btnG}>{create.isPending?"Submitting…":"📨 Submit Request"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
