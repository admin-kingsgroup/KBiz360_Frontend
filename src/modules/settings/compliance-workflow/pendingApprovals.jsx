import { useState } from 'react';
import { useMobile } from '../../../core/hooks';
import { bc } from '../../../core/styleTokens';
import { fmt } from '../../../core/format';

export const PENDING_APPROVALS_DATA = [];

export function PendingApprovals({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [filter,setFilter]=useState("All");

  const visible=filter==="All"?PENDING_APPROVALS_DATA:PENDING_APPROVALS_DATA.filter(p=>p.priority===filter);
  const totValue=visible.filter(p=>p.amount>0).reduce((s,p)=>s+p.amount,0);
  const high=PENDING_APPROVALS_DATA.filter(p=>p.priority==="High").length;
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>📋 Pending Approvals Queue</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Vouchers awaiting checker approval · SLA-tracked · Approve/Reject/Return for revision</p>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Pending Total</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{PENDING_APPROVALS_DATA.length}</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>High Priority</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{high}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Value at Stake</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{cur+fmt(totValue)}</p></div>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Within SLA</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{PENDING_APPROVALS_DATA.filter(p=>p.ageHours<24).length}/{PENDING_APPROVALS_DATA.length}</p></div>
      </div>

      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        {["All","High","Medium","Low"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"4px 12px",border:"1px solid "+(filter===f?"#0d1326":"#e1e3ec"),background:filter===f?"#0d1326":"#fff",color:filter===f?"#d4a437":"#5a6691",borderRadius:14,fontSize:11,fontWeight:600,cursor:"pointer"}}>{f}</button>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Voucher</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Type</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Amount</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Vendor/Party</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Posted By</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Approver</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Age</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Priority</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Action</th>
            </tr></thead>
            <tbody>
              {visible.map((p,i)=>(
                <tr key={p.id} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{p.id}</td>
                  <td style={{padding:"7px 8px",fontSize:10.5}}>{p.type}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600}}>{p.amount>0?cur+fmt(p.amount):"—"}</td>
                  <td style={{padding:"7px 8px"}}>{p.vendor}<div style={{fontSize:9.5,color:"#5a6691"}}>{p.notes}</div></td>
                  <td style={{padding:"7px 8px",fontSize:10}}>{p.postedBy}</td>
                  <td style={{padding:"7px 8px",fontSize:10,color:"#185FA5",fontWeight:600}}>{p.approver}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontWeight:600,fontSize:10,color:p.ageHours>4?"#A32D2D":p.ageHours>2?"#854F0B":"#27500A"}}>{p.ageHours}h</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:p.priority==="High"?"#FCEBEB":p.priority==="Medium"?"#FAEEDA":"#E6F1FB",color:p.priority==="High"?"#A32D2D":p.priority==="Medium"?"#854F0B":"#185FA5"}}>{p.priority}</span></td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}>
                    <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                      <button style={{padding:"3px 8px",border:"none",background:"#27500A",color:"#fff",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>✓</button>
                      <button style={{padding:"3px 8px",border:"none",background:"#A32D2D",color:"#fff",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>✗</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
