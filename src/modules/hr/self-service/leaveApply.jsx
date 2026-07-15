/* ══════════════════════════════════════════════════════════════════
   2. LEAVE APPLICATION WORKFLOW (/hr/leave-apply)
   ══════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { cardStyle } from '../../../core/helpers';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { fromLeaveDTO, toLeavePayload, leaveDays, fromLeaveBalanceDTO, takenFor } from '../hrMaps';
import { useMyEmployee } from '../usePayroll';
import { todayISO } from '../../../core/dates';
import { toast } from '../../../core/ux/toast';
import { RPT_tdStyle, RPT_thStyle, inp } from '../../../core/styles';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';
import { Skeleton } from '../../../shell/primitives';
import { SelfServiceGate, SS_DEFAULT_ENT } from './selfServiceGate';

export function LeaveApply(){
  const my=useMyEmployee();
  return (
    <SelfServiceGate title="Leave Application" subtitle="Apply for leave" my={my}>
      {(emp)=><LeaveApplyBody emp={emp}/>}
    </SelfServiceGate>
  );
}

function LeaveApplyBody({emp}){
  const [type,setType]=useState("Casual Leave");
  const [from,setFrom]=useState(todayISO());
  const [to,setTo]=useState(todayISO());
  const [reason,setReason]=useState("");
  const [submitted,setSubmitted]=useState(false);
  const inp={padding:"8px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12.5,width:"100%"};
  const days=leaveDays(from,to);

  /* MY live balances + history: entitlement master − approved requests this
     year (same derivation as HrLeave's Balances tab, scoped to me). */
  const year=String(new Date().getFullYear());
  const reqQ=useMasterList('leave-requests',{empId:emp.id});
  const myReqs=((reqQ.data)||[]).map(fromLeaveDTO);
  const ent=(((useMasterList('leave-balances',{year}).data)||[]).map(fromLeaveBalanceDTO).find(b=>b.empId===emp.id))||SS_DEFAULT_ENT;
  const taken=takenFor(myReqs,emp.id,year);
  const balances=[
    {type:"Annual Leave",balance:ent.annual-taken.annual,ent:ent.annual},
    {type:"Sick Leave",balance:ent.sick-taken.sick,ent:ent.sick},
    {type:"Casual Leave",balance:ent.casual-taken.casual,ent:ent.casual},
    {type:"LWP",balance:null},
  ];
  const bal=balances.find(b=>b.type===type);
  const history=myReqs.slice().sort((a,b)=>String(b.from).localeCompare(String(a.from)));
  const HIST_CLR={Pending:{bg:"#fff3cd",c:"#856404"},Approved:{bg:"#d4edda",c:"#155724"},Rejected:{bg:"#f8d7da",c:"#721c24"},Cancelled:{bg:"#f3f4f8",c:"#5a6691"}};

  /* Submit a REAL request to /api/leave-requests, attributed to the resolved
     employee — it lands in HR's Leave Management queue as Pending. */
  const {create}=useMasterMutations('leave-requests');
  const submit=()=>{
    if(!reason.length||create.isPending) return;
    create.mutate(toLeavePayload({empId:emp.id,empName:emp.name,branch:emp.branch,type,from,to,days,reason,status:"Pending"}),{
      onSuccess:()=>{setSubmitted(true);setReason("");},
      onError:e=>toast(e?.message||"Could not submit leave request","error")});
  };
  return(
    <PHASE2_Page title="Leave Application" subtitle={`Apply for leave · ${emp.name} (${emp.id}) · ${emp.branch}`}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {submitted?(
            <div style={{padding:24,background:"#d4edda",border:"1px solid #bbf7d0",borderRadius:8,textAlign:"center"}}>
              <p style={{margin:0,fontSize:32}}>✅</p>
              <p style={{margin:"10px 0 4px",fontSize:15,fontWeight:700,color:"#155724"}}>Leave application submitted!</p>
              <p style={{margin:0,fontSize:12,color:"#155724"}}>Sent to HR's Leave Management queue · Awaiting approval</p>
              <button onClick={()=>setSubmitted(false)} style={{marginTop:14,padding:"8px 18px",background:"#155724",color:"#fff",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>Apply Another</button>
            </div>
          ):(
            <div style={cardStyle}>
              <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>New Leave Application</p>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Leave Type</label>
                  <select value={type} onChange={e=>setType(e.target.value)} style={inp}>{balances.map(b=><option key={b.type}>{b.type}</option>)}</select></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>From</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={inp}/></div>
                  <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>To</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} style={inp}/></div>
                </div>
                <div style={{padding:10,background:"#fff8e8",border:"1px solid #fde68a",borderRadius:6,display:"flex",justifyContent:"space-between",fontSize:12}}>
                  <span>Duration: <b>{days} day{days!==1?"s":""}</b></span>
                  {bal?.balance!=null&&<span>Balance after: <b style={{color:bal.balance-days<0?"#A32D2D":"#22c55e"}}>{bal.balance-days} day{bal.balance-days!==1?"s":""}</b></span>}
                  {bal?.balance==null&&<span style={{color:"#5a6691"}}>LOP — salary deducted</span>}
                </div>
                <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Reason</label><textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} style={{...inp,fontFamily:"inherit",resize:"vertical"}} placeholder="Brief reason for leave…"/></div>
                <button onClick={submit} disabled={create.isPending} style={{padding:"10px",background:reason.length>0?"#d4a437":"#e1e3ec",color:reason.length>0?"#0d1326":"#5a6691",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:reason.length>0?"pointer":"not-allowed"}}>{create.isPending?"Submitting…":"Submit Application"}</button>
              </div>
            </div>
          )}
          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>My Leave History</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Dates</th><th style={RPT_thStyle}>Type</th><th style={{...RPT_thStyle,textAlign:"center"}}>Days</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
              <tbody>{reqQ.isLoading&&Array.from({length:3}).map((_,i)=>(
                <tr key={`sk-${i}`}><td colSpan={4} style={{...RPT_tdStyle,padding:"10px 8px"}}><Skeleton className="h-3.5 w-full" style={{opacity:Math.max(0.4,1-i*0.15)}} /></td></tr>
              ))}{!reqQ.isLoading&&history.length===0&&(
                <tr><td colSpan={4} style={{...RPT_tdStyle,textAlign:"center",color:"#8b94b3",padding:"16px 8px"}}>No leave requests yet.</td></tr>
              )}{history.map((h,i)=>{const sc=HIST_CLR[h.status]||HIST_CLR.Pending;return(
                <tr key={h.id||i} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{...RPT_tdStyle,fontSize:10.5}}>{h.from} → {h.to}</td><td style={RPT_tdStyle}>{h.type}</td><td style={{...RPT_tdStyle,textAlign:"center"}}>{h.days}</td><td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 7px",background:sc.bg,color:sc.c,borderRadius:3,fontSize:10,fontWeight:700}}>{h.status}</span></td></tr>
              );})}</tbody>
            </table>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={cardStyle}>
            <p style={{margin:"0 0 12px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Leave Balance</p>
            {balances.filter(b=>b.balance!=null).map(b=>(
              <div key={b.type} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:11.5,color:"#0d1326"}}>{b.type}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#0d1326"}}>{b.balance} days</span>
                </div>
                <div style={{height:6,background:"#f0f2f7",borderRadius:3}}><div style={{height:"100%",width:Math.max(0,Math.min(100,(b.balance/(b.ent||12))*100))+"%",background:b.balance<=2?"#A32D2D":b.balance<=5?"#d4a437":"#22c55e",borderRadius:3}}/></div>
              </div>
            ))}
          </div>
          <div style={{padding:14,background:"#fafbfd",border:"1px solid #cdd1d8",borderRadius:8,fontSize:11.5,color:"#5a6691"}}>
            <p style={{margin:"0 0 6px",fontWeight:700,color:"#0d1326",fontSize:12}}>Approval chain</p>
            <p style={{margin:0}}>1. Reporting Manager — primary approver</p>
            <p style={{margin:"3px 0 0"}}>2. Department Head — for leaves &gt; 5 days</p>
            <p style={{margin:"8px 0 0",fontSize:10.5}}>Approved within 1 working day</p>
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}
