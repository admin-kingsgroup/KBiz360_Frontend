/* ── HR Self-Service Portal (/hr/portal) ──────────────────────── */

import { cardStyle } from '../../../core/helpers';
import { useMasterList } from '../../../core/useMasters';
import { fromLeaveDTO, fromLeaveBalanceDTO, takenFor } from '../hrMaps';
import { usePayslips, useMyEmployee } from '../usePayroll';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';
import { SelfServiceGate, SS_MONTH_LABEL, SS_DEFAULT_ENT } from './selfServiceGate';

export function HRPortal({setRoute}){
  const my=useMyEmployee();
  return (
    <SelfServiceGate title="Employee Self-Service Portal" subtitle="" my={my}>
      {(emp)=><HRPortalBody emp={emp} setRoute={setRoute}/>}
    </SelfServiceGate>
  );
}

function HRPortalBody({emp,setRoute}){
  const tiles=[
    {icon:"📋",title:"Leave Application",sub:"Apply / check balance",route:"/hr/leave-apply",color:"#3b82f6"},
    {icon:"💰",title:"Reimbursement Claim",sub:"Submit expense claims",route:"/hr/reimbursement",color:"#22c55e"},
    {icon:"🧾",title:"My Payslip",sub:"View & download payslips",route:"/hr/my-payslip",color:"#d4a437"},
    {icon:"📑",title:"Investment Declaration",sub:"Submit IT investments",route:"/hr/investment-declaration",color:"#6B4C8B"},
    {icon:"📃",title:"Form 16",sub:"Annual salary certificate",route:"/hr/form-16",color:"#0d1326"},
    {icon:"⭐",title:"Performance Review",sub:"View & submit reviews",route:"/hr/performance",color:"#f97316"},
    {icon:"🔄",title:"360° Feedback",sub:"Give & receive feedback",route:"/hr/feedback-360",color:"#A32D2D"},
    {icon:"🎓",title:"Skill Matrix",sub:"My skills & development",route:"/hr/skills",color:"#2F7A8E"},
  ];
  /* MY quick stats — all from live sources scoped to the resolved employee.
     (Claims and tax declarations have no data source yet → honest "None yet".) */
  const year=String(new Date().getFullYear());
  const myReqs=((useMasterList('leave-requests',{empId:emp.id}).data)||[]).map(fromLeaveDTO);
  const ent=(((useMasterList('leave-balances',{year}).data)||[]).map(fromLeaveBalanceDTO).find(b=>b.empId===emp.id))||SS_DEFAULT_ENT;
  const taken=takenFor(myReqs,emp.id,year);
  const remaining=(ent.annual-taken.annual)+(ent.sick-taken.sick)+(ent.casual-taken.casual);
  const pendingCount=myReqs.filter(r=>r.status==="Pending").length;
  const lastSlip=usePayslips(emp.id).slips[0]||null;
  return(
    <PHASE2_Page title="Employee Self-Service Portal" subtitle={`${emp.name} (${emp.id}) · ${emp.branch}${emp.desig?` · ${emp.desig}`:""}`}>
      {/* Quick stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginBottom:18}}>
        {[{l:"Leave Balance",v:`${remaining} days`,c:"#22c55e"},
          {l:"Pending Leave Requests",v:String(pendingCount),c:"#f97316"},
          {l:"Last Payslip",v:lastSlip?SS_MONTH_LABEL(lastSlip.month):"None yet",c:"#d4a437"},
          {l:"Pending Claims",v:"None yet",c:"#6B4C8B"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"5px 0 0",fontSize:20,fontWeight:700,color:"#0d1326"}}>{k.v}</p></div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12}}>
        {tiles.map(t=>(
          <button key={t.route} onClick={()=>setRoute(t.route)}
            style={{padding:20,background:"#fff",border:"1px solid #cdd1d8",borderRadius:10,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:16,boxShadow:"0 2px 8px rgba(0,0,0,0.04)",borderLeft:"4px solid "+t.color}}>
            <span style={{fontSize:30}}>{t.icon}</span>
            <div><p style={{margin:0,fontSize:13.5,fontWeight:700,color:"#0d1326"}}>{t.title}</p><p style={{margin:"2px 0 0",fontSize:11,color:"#5a6691"}}>{t.sub}</p></div>
          </button>
        ))}
      </div>
    </PHASE2_Page>
  );
}
