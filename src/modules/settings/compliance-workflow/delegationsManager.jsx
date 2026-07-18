/* ════════════════════════════════════════════════════════════════════
   DELEGATIONS MANAGER  /settings/delegations
   LIVE: delegations persist via /api/delegations (buildCrudRouter).
   INFORMATIONAL register for now — the auth layer does not yet re-route
   approvals to the delegate (that wiring is a separate product decision);
   the register is the explicit, time-bound, logged record the policy
   requires.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { toast } from '../../../core/ux/toast';
import { cardStyle } from '../../../core/helpers';
import { FL, RPT_tdStyle, RPT_thStyle, btnG, btnGh, inp } from '../../../core/styles';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';
import { isViewOnly, VIEW_ONLY_REASON } from '../../../shell/primitives';

export function DelegationsManager(){
  const { data: all = [] } = useMasterList('delegations');
  const { create, update } = useMasterMutations('delegations');
  const vo=isViewOnly(); // view-only: record/end delegation are disabled with a reason
  const [modal,setModal]=useState(false);
  const TODAY=new Date().toISOString().slice(0,10);
  const blank={fromUser:"",toUser:"",scope:"",fromDate:TODAY,toDate:"",reason:""};
  const [form,setForm]=useState(blank);
  const statusOf=(d)=>d.active===false?"Ended":d.toDate&&d.toDate<TODAY?"Completed":d.fromDate>TODAY?"Scheduled":"Active";
  const rows=(all||[]).map(d=>({...d,status:statusOf(d)})).sort((a,b)=>String(b.fromDate).localeCompare(String(a.fromDate)));
  const active=rows.filter(d=>d.status==="Active").length;
  const saveNew=()=>{
    create.mutate({...form,active:true},{
      onSuccess:()=>{toast("Delegation recorded.");setModal(false);setForm(blank);},
      onError:(e)=>toast(e?.message||"Save failed","error")});
  };
  return(
    <PHASE2_Page title="Delegations Manager"
      subtitle="Vacation back-up & temporary authority delegations — explicit, time-bound, logged (informational register; approvals are not auto re-routed yet)"
      toolbar={<button onClick={()=>setModal(true)} style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Create Delegation</button>}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Active",v:active,c:"#22c55e"},{l:"Scheduled",v:rows.filter(d=>d.status==="Scheduled").length,c:"#3b82f6"},{l:"Completed",v:rows.filter(d=>d.status==="Completed").length,c:"#5a6691"},{l:"Ended Early",v:rows.filter(d=>d.status==="Ended").length,c:"#f97316"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"4px 0 0",fontSize:18,fontWeight:700,color:k.c}}>{k.v}</p></div>
        ))}
      </div>
      <div style={cardStyle}>
        <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>All Delegations (Active + Historical)</p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>From</th><th style={RPT_thStyle}>To</th><th style={RPT_thStyle}>Scope</th><th style={RPT_thStyle}>Period</th><th style={RPT_thStyle}>Reason</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th><th style={{...RPT_thStyle,textAlign:"center"}}>Action</th></tr></thead>
          <tbody>{rows.map(d=>(
            <tr key={d.id} style={{borderBottom:"1px solid #dfe2e7"}}>
              <td style={{...RPT_tdStyle,fontWeight:700}}>{d.fromUser}</td>
              <td style={{...RPT_tdStyle,fontWeight:700,color:"#d4a437"}}>→ {d.toUser}</td>
              <td style={{...RPT_tdStyle,fontSize:11}}>{d.scope}</td>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:11}}>{d.fromDate} → {d.toDate||"open"}</td>
              <td style={{...RPT_tdStyle,fontSize:11,color:"#5a6691"}}>{d.reason}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"3px 9px",borderRadius:3,fontSize:10,fontWeight:700,background:d.status==="Active"?"#d4edda":d.status==="Scheduled"?"#cfe2ff":d.status==="Completed"?"#e2e3e5":"#fff3cd",color:d.status==="Active"?"#155724":d.status==="Scheduled"?"#004085":d.status==="Completed"?"#383d41":"#856404"}}>{d.status}</span></td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}>
                {(d.status==="Active"||d.status==="Scheduled")&&<button disabled={vo} title={vo?VIEW_ONLY_REASON:undefined} onClick={()=>update.mutate({id:d.id,body:{active:false}},{onSuccess:()=>toast("Delegation ended."),onError:(e)=>toast(e?.message||"Failed","error")})} style={{padding:"3px 8px",background:"transparent",border:"1px solid #cdd1d8",color:"#A32D2D",borderRadius:3,fontSize:10,cursor:vo?"not-allowed":"pointer",fontWeight:700,opacity:vo?0.5:1}}>End now</button>}
              </td>
            </tr>
          ))}
          {rows.length===0&&<tr><td colSpan={7} style={{padding:20,textAlign:"center",color:"#5a6691",fontSize:11.5}}>No delegations recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Create Delegation</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <FL label="Delegating from"><input value={form.fromUser} onChange={e=>setForm(f=>({...f,fromUser:e.target.value}))} placeholder="e.g. Faiz Patel" style={inp}/></FL>
              <FL label="Delegating to"><input value={form.toUser} onChange={e=>setForm(f=>({...f,toUser:e.target.value}))} placeholder="e.g. Sughra Sayed" style={inp}/></FL>
              <div style={{gridColumn:"1 / -1"}}><FL label="Scope of authority"><input value={form.scope} onChange={e=>setForm(f=>({...f,scope:e.target.value}))} placeholder="e.g. Approvals up to ₹5L" style={inp}/></FL></div>
              <FL label="From"><input type="date" value={form.fromDate} onChange={e=>setForm(f=>({...f,fromDate:e.target.value}))} style={inp}/></FL>
              <FL label="To"><input type="date" value={form.toDate} onChange={e=>setForm(f=>({...f,toDate:e.target.value}))} style={inp}/></FL>
              <div style={{gridColumn:"1 / -1"}}><FL label="Reason"><input value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} placeholder="e.g. Annual leave — 1 week" style={inp}/></FL></div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={saveNew} disabled={!form.fromUser.trim()||!form.toUser.trim()||!form.scope.trim()||create.isPending||vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...btnG,opacity:(!form.fromUser.trim()||!form.toUser.trim()||!form.scope.trim()||vo)?0.5:1}}>{create.isPending?"Saving…":"Create"}</button>
            </div>
          </div>
        </div>
      )}
    </PHASE2_Page>
  );
}
