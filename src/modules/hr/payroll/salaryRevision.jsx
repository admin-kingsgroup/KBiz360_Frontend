/* ── Salary Revision (/hr/salary-revision) ────────────────────── */

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useMobile } from '../../../core/hooks';
import { useModalEsc } from '../../../core/ux/useModalEsc';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { fromEmpDTO } from '../employeeMap';
import { fromRevisionDTO, toRevisionPayload } from '../hrMaps';
import { buildRevisionDue } from '../hrReports';
import { todayISO } from '../../../core/dates';
import { toast } from '../../../core/ux/toast';
import { FL, btnG, btnGh, card, inp } from '../../../core/styles';
import { Skeleton, isViewOnly, VIEW_ONLY_REASON } from '../../../shell/primitives';

export function SalaryRevision({branch}){
  const mob=useMobile();
  const brScope=branch==="ALL"?"":(branch?.code||"");
  const [tab,setTab]=useState("due"); // due | history
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [form,setForm]=useState(null);

  /* Live, branch-scoped employees + revision events. The "due" schedule and the
     per-employee history are both derived from these. */
  const emps=((useMasterList('employees', brScope?{branch:brScope}:{}).data)||[]).map(fromEmpDTO);
  const revQ=useMasterList('salary-revisions', brScope?{branch:brScope}:{});
  const revisions=((revQ.data)||[]).map(fromRevisionDTO);
  const {create}=useMasterMutations('salary-revisions');
  const vo=isViewOnly();

  const dueFiltered=buildRevisionDue(emps,revisions,todayISO());
  const overdue=dueFiltered.filter(e=>e.status==="OVERDUE");

  // Per-employee revision history, grouped from the live events.
  const history=Object.values(revisions.reduce((acc,r)=>{
    const g=acc[r.empId]||(acc[r.empId]={empId:r.empId,empName:r.empName,joined:(emps.find(e=>e.id===r.empId)?.joined)||"",revisions:[]});
    g.revisions.push({date:r.date,basic:r.basic,incr:r.increment,pct:r.pct,reason:r.reason});
    return acc;
  },{})).map(h=>({...h,revisions:h.revisions.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)))}));

  const openRevise=(e)=>{setForm({empId:e.empId,empName:e.empName,branch:e.branch,currentBasic:e.currentBasic,newBasic:e.currentBasic,reason:""});setModal(true);};
  const saveRevision=()=>{
    const newBasic=+form.newBasic||0, increment=Math.round(newBasic-(form.currentBasic||0));
    const pct=form.currentBasic>0?+((increment/form.currentBasic)*100).toFixed(1):0;
    create.mutate(toRevisionPayload({empId:form.empId,empName:form.empName,branch:form.branch,date:todayISO(),basic:newBasic,increment,pct,reason:form.reason}),
      {onSuccess:()=>{toast("Revision recorded");setModal(false);},onError:e=>toast(e?.message||"Could not save revision","error")});
  };

  return (
    <div style={{padding:"20px 32px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📈</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Salary Revision Tracker</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{overdue.length} overdue · Next due dates · Full revision history</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {["due","history"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{...tab===t?btnG:btnGh,fontSize:11,textTransform:"capitalize"}}>{t==="due"?"Due Reviews":"History"}</button>
          ))}
        </div>
      </div>

      {overdue.length>0&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600,display:"flex",gap:8}}>
        <AlertTriangle size={15}/> {overdue.length} salary revision{overdue.length>1?"s":""} overdue: {overdue.map(e=>`${e.empName} (${e.daysPast}d)`).join(", ")}
      </div>}

      {tab==="due"&&(
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Employee","Branch","Current Basic","Last Revised","Next Due","Status","Suggested Incr. (10%)","Action"].map((h,i)=>(
                <th key={i} style={{padding:"9px 12px",textAlign:i>=2&&i<=2?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{dueFiltered.map((e,i)=>{
              const suggested=Math.round(e.currentBasic*0.10);
              return (
                <tr key={e.empId} style={{borderBottom:"1px solid #dfe2e7",background:e.status==="OVERDUE"?"#fff5f5":i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{e.empName}</td>
                  <td style={{padding:"8px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{e.branch}</span></td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>₹{e.currentBasic.toLocaleString()}</td>
                  <td style={{padding:"8px 12px",color:"#5a6691",whiteSpace:"nowrap"}}>{e.lastRevision}</td>
                  <td style={{padding:"8px 12px",color:e.status==="OVERDUE"?"#A32D2D":"#5a6691",fontWeight:e.status==="OVERDUE"?700:400,whiteSpace:"nowrap"}}>{e.nextDue}</td>
                  <td style={{padding:"8px 12px"}}>
                    <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,
                      background:e.status==="OVERDUE"?"#FCEBEB":"#FAEEDA",
                      color:e.status==="OVERDUE"?"#A32D2D":"#854F0B"}}>
                      {e.status==="OVERDUE"?`${e.daysPast}d OVERDUE`:`Due in ${Math.abs(e.daysPast)}d`}
                    </span>
                  </td>
                  <td style={{padding:"8px 12px",fontWeight:700,color:"#27500A"}}>+₹{suggested.toLocaleString()}/mo → ₹{(e.currentBasic+suggested).toLocaleString()}</td>
                  <td style={{padding:"8px 12px"}}><button onClick={()=>openRevise(e)} style={{...btnG,padding:"3px 10px",fontSize:9.5,background:"#27500A",whiteSpace:"nowrap"}}>Process Revision</button></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      {tab==="history"&&(
        <div>
          {revQ.isLoading&&(
            <div style={{...card,marginBottom:12,padding:16}}>
              <Skeleton className="mb-3 h-3 w-1/3" />
              <Skeleton className="mb-1.5 h-3 w-full" />
              <Skeleton className="mb-1.5 h-3 w-full" style={{opacity:0.7}} />
              <Skeleton className="h-3 w-full" style={{opacity:0.5}} />
            </div>
          )}
          {!revQ.isLoading&&history.length===0&&<div style={{...card,padding:"22px",textAlign:"center",color:"#8b94b3",fontSize:12}}>No revisions recorded yet. Process one from the Due Reviews tab.</div>}
          {history.map(h=>(
            <div key={h.empId} style={{...card,marginBottom:12}}>
              <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>{h.empName} — Salary History (Joined: {h.joined})</p>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr style={{background:"#f3f4f8"}}>
                  {["Effective Date","Basic Salary","Increment","Increment %","Reason"].map((col,i)=>(
                    <th key={i} style={{padding:"7px 10px",textAlign:i>=1&&i<=3?"right":"left",fontSize:9.5,fontWeight:700,color:"#384677"}}>{col}</th>
                  ))}
                </tr></thead>
                <tbody>{h.revisions.map((r,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"7px 10px",color:"#5a6691",whiteSpace:"nowrap"}}>{r.date}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>₹{r.basic.toLocaleString()}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:r.incr>0?"#27500A":"#5a6691"}}>{r.incr>0?`+₹${r.incr.toLocaleString()}`:"Nil"}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:r.pct>0?"#27500A":"#5a6691"}}>{r.pct>0?`${r.pct}%`:"—"}</td>
                    <td style={{padding:"7px 10px",color:"#384677"}}>{r.reason}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {modal&&form&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:440,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Process Revision — {form.empName}</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <FL label="Current basic"><input value={"₹"+(form.currentBasic||0).toLocaleString()} disabled style={{...inp,background:"#f3f4f8",color:"#5a6691"}}/></FL>
              <FL label="New basic"><input type="number" value={form.newBasic} onChange={e=>setForm(f=>({...f,newBasic:e.target.value}))} style={inp}/></FL>
              <div style={{fontSize:11,color:"#27500A",fontWeight:700}}>Increment: +₹{Math.max(0,Math.round((+form.newBasic||0)-(form.currentBasic||0))).toLocaleString()} ({form.currentBasic>0?(((+form.newBasic||0)-form.currentBasic)/form.currentBasic*100).toFixed(1):0}%)</div>
              <FL label="Reason"><input value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} placeholder="Annual review / promotion" style={inp}/></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={saveRevision} disabled={create.isPending||vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...btnG,...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>{create.isPending?"Saving…":"Record Revision"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
