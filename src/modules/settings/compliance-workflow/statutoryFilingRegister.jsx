/* ════════════════════════════════════════════════════════════════════
   STATUTORY FILING REGISTER  /settings/filing-register
   LIVE: reads /api/tax-calendar (the same statutory compliance calendar the
   Task List gates on); "Mark Filed" persists filedDate/filedBy/ack. Status is
   derived from filedDate vs due date — never stored guesswork.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { toast } from '../../../core/ux/toast';
import { cardStyle } from '../../../core/helpers';
import { RPT_tdStyle, RPT_thStyle } from '../../../core/styles';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';

export function StatutoryFilingRegister(){
  const [filter,setFilter]=useState("ALL");
  const { data: events = [] } = useMasterList('tax-calendar', { active: true });
  const { update } = useMasterMutations('tax-calendar');
  const TODAY=new Date().toISOString().slice(0,10);
  const statusOf=(f)=>f.filedDate?"Filed":f.date<TODAY?"Overdue":f.date===TODAY?"Due Today":"Pending";
  const rows=events.map(e=>({...e,status:statusOf(e)})).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const statuses=["Filed","Due Today","Pending","Overdue"];
  const filtered=filter==="ALL"?rows:rows.filter(f=>f.status===filter);
  const filed=rows.filter(f=>f.status==="Filed").length;
  const pending=rows.filter(f=>f.status==="Pending").length;
  const dueToday=rows.filter(f=>f.status==="Due Today").length;
  const overdue=rows.filter(f=>f.status==="Overdue").length;
  const statusStyle={Filed:{bg:"#d4edda",color:"#155724"},"Due Today":{bg:"#f8d7da",color:"#721c24"},Pending:{bg:"#fff3cd",color:"#856404"},Overdue:{bg:"#f8d7da",color:"#721c24"}};
  const markFiled=(f)=>{
    const ack=window.prompt(`Mark "${f.title}" as filed.\nAcknowledgment / ARN number (optional):`,"");
    if(ack===null)return;
    let user=""; try{user=(JSON.parse(localStorage.getItem("kb360-user")||"null")||{}).name||"";}catch{/* ignore */}
    update.mutate({id:f.id,body:{filedDate:TODAY,filedBy:user,ack:ack.trim()}},{
      onSuccess:()=>toast(`${f.title} marked filed`),
      onError:(e)=>toast(e?.message||"Could not mark filed","error")});
  };
  return(
    <PHASE2_Page title="Statutory Filing Register"
      subtitle="Central register of statutory filings across the group — live from the compliance calendar (/api/tax-calendar)"
      toolbar={<select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}><option value="ALL">All statuses</option>{statuses.map(st=><option key={st}>{st}</option>)}</select>}>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Filed",v:filed,c:"#22c55e"},{l:"Pending",v:pending,c:"#3b82f6"},{l:"Due Today",v:dueToday,c:"#A32D2D"},{l:"Overdue",v:overdue,c:"#7B1F1F"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:k.c}}>{k.v}</p></div>
        ))}
      </div>

      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#f7f8fb"}}>
            <th style={RPT_thStyle}>Type</th>
            <th style={RPT_thStyle}>Filing</th>
            <th style={RPT_thStyle}>Entity</th>
            <th style={RPT_thStyle}>Due Date</th>
            <th style={{...RPT_thStyle,textAlign:"center"}}>Status</th>
            <th style={RPT_thStyle}>Filed By</th>
            <th style={RPT_thStyle}>Acknowledgment</th>
            <th style={{...RPT_thStyle,textAlign:"center"}}>Action</th>
          </tr></thead>
          <tbody>{filtered.map(f=>(
            <tr key={f.id} style={{borderBottom:"1px solid #dfe2e7",background:f.status==="Due Today"?"#fff8e8":f.status==="Overdue"?"#fff5f5":"#fff"}}>
              <td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:"#e6e8f1",borderRadius:3,fontSize:10.5,fontWeight:700}}>{f.type||"—"}</span></td>
              <td style={{...RPT_tdStyle,fontWeight:600}}>{f.title}</td>
              <td style={RPT_tdStyle}>{f.entity||"—"}</td>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",color:!f.filedDate&&f.date<=TODAY?"#A32D2D":"#0d1326",fontWeight:600}}>{f.date}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"3px 10px",borderRadius:3,fontSize:10,fontWeight:700,background:(statusStyle[f.status]||{}).bg,color:(statusStyle[f.status]||{}).color}}>{f.status}</span></td>
              <td style={{...RPT_tdStyle,fontSize:11}}>{f.filedBy||<span style={{color:"#5a6691"}}>—</span>}</td>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5,color:f.ack?"#22c55e":"#5a6691",fontWeight:600}}>{f.ack||(f.filedDate?"filed "+f.filedDate:"—")}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}>
                {!f.filedDate&&<button onClick={()=>markFiled(f)} disabled={update.isPending} style={{padding:"3px 10px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>Mark Filed</button>}
              </td>
            </tr>
          ))}
          {filtered.length===0&&<tr><td colSpan={8} style={{padding:20,textAlign:"center",color:"#5a6691",fontSize:11.5}}>No filings{filter!=="ALL"?" with this status":" on the compliance calendar yet — add them under the Tax Calendar"}.</td></tr>}
          </tbody>
        </table>
      </div>
    </PHASE2_Page>
  );
}
