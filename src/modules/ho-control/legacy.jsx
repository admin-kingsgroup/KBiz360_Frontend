/* ════════════════════════════════════════════════════════════════════
   MODULES/HO-CONTROL.JSX
   NOTE: the "HO Control Center" prototype was removed (no Head Office in the
   TK Group model — six equal peer branches). What remains here is dead code
   (GroupBookings, PeriodLocking — not referenced by App.jsx, no live route).

   BUSINESS SUB-MODULE REORG (2026-07-13): the live, routed screens that used
   to share this file moved to their business sub-module folders:
     - GroupDashboard          → modules/reports/profitability-gp/groupDashboard.jsx
     - BankingApiSettings      → modules/settings/integrations/bankingApi.jsx
     - StatutoryFilingRegister → modules/settings/compliance-workflow/statutoryFilingRegister.jsx
     - DelegationsManager      → modules/settings/compliance-workflow/delegationsManager.jsx
   (all re-exported from ./index.js so App.jsx's direct chunk import of this
   module needed zero changes).
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { GROUP_BOOKINGS, PERIOD_LOCK_DATA } from '../../core/helpers';
import { useMobile } from '../../core/hooks';
import { useModalEsc } from '../../core/ux/useModalEsc';
import { FL, btnG, btnGh, card, inp } from '../../core/styles';
import { clickable } from '../../core/ux/clickable';

/* ════════════════════════════════════════════════════════════════
   GROUP BOOKING MANAGER — dead code, unrouted (not in App.jsx)
   ════════════════════════════════════════════════════════════════ */

export function GroupBookings({branch,setRoute}){
  const mob=useMobile();
  const [groups,setGroups]=useState(GROUP_BOOKINGS);
  const [sel,setSel]=useState(null);
  const [tab,setTab]=useState("list"); // list | detail
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const STATUS_CLR={"Quote Sent":"#854F0B","Deposit Paid":"#185FA5",Confirmed:"#27500A",Completed:"#5a6691",Cancelled:"#A32D2D"};
  const STATUS_BG ={"Quote Sent":"#FAEEDA","Deposit Paid":"#E6F1FB",Confirmed:"#EAF3DE",Completed:"#f3f4f8",Cancelled:"#FCEBEB"};
  const TYPE_CLR={MICE:"#A32D2D","FIT Group":"#185FA5","GIT":"#854F0B"};
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const selGrp=sel?groups.find(g=>g.id===sel):null;

  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>👨‍👩‍👧‍👦</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Group Booking Manager</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{groups.length} groups · {groups.reduce((s,g)=>s+g.pax,0)} total pax · GIT / MICE / FIT Groups</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> New Group</button>
          <button onClick={()=>setRoute("/sales/holiday")} style={{...btnGh,fontSize:11}}>→ Holiday Invoice</button>
        </div>
      </div>

      {/* Group cards */}
      {!selGrp&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(350px,1fr))",gap:12,marginBottom:12}}>
        {groups.map(g=>(
          <div key={g.id} {...clickable(()=>setSel(g.id))} style={{...card,cursor:"pointer",borderLeft:`4px solid ${STATUS_CLR[g.status]||"#384677"}`,transition:"transform 0.1s"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)"}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                  <span style={{fontFamily:"monospace",fontSize:9,padding:"1px 6px",borderRadius:4,background:"#0d1326",color:"#d4a437"}}>{g.id}</span>
                  <span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:STATUS_BG[g.status],color:STATUS_CLR[g.status]}}>{g.status}</span>
                  <span style={{fontSize:9,padding:"1px 6px",borderRadius:999,fontWeight:700,background:(TYPE_CLR[g.type]||"#384677")+"22",color:TYPE_CLR[g.type]||"#384677"}}>{g.type}</span>
                </div>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>{g.name}</p>
                <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>📍 {g.dest} · ✈ {g.airline} · 🏨 {g.hotel}</p>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{margin:0,fontSize:14,fontWeight:800,color:"#0d1326"}}>{g.pax} pax</p>
                <p style={{margin:"1px 0 0",fontSize:9.5,color:"#5a6691"}}>✈ {g.travel}</p>
              </div>
            </div>
            {/* Rooms */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              {g.rooms.map((r,ri)=><span key={ri} style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,background:"#f3f4f8",color:"#384677"}}>{r.qty}× {r.type} ({r.pax} pax)</span>)}
            </div>
            {/* Financials */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <div style={{textAlign:"center",flex:1}}><div style={{fontSize:10,color:"#5a6691"}}>Total Value</div><div style={{fontWeight:700,fontSize:13}}>{f(g.total)}</div></div><div style={{textAlign:"center",flex:1}}><div style={{fontSize:10,color:"#5a6691"}}>Deposit Paid</div><div style={{fontWeight:700,fontSize:13}}>{f(g.deposit)}</div></div><div style={{textAlign:"center",flex:1}}><div style={{fontSize:10,color:"#A32D2D"}}>Outstanding</div><div style={{fontWeight:700,fontSize:13,color:"#A32D2D"}}>{f(g.total-g.deposit)}</div></div>
            </div>
            <div style={{marginTop:10,display:"flex",gap:6}}>
              <button onClick={e=>{e.stopPropagation();setSel(g.id);}} style={{...btnG,fontSize:10,padding:"4px 12px",flex:1}}>📋 Rooming List</button>
              <button onClick={e=>{e.stopPropagation();setRoute("/sales/holiday");}} style={{...btnGh,fontSize:10,padding:"4px 10px"}}>📄 Invoice</button>
            </div>
          </div>
        ))}
      </div>}

      {/* Detail view */}
      {selGrp&&(
        <div style={{...card}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                <button onClick={()=>setSel(null)} style={{...btnGh,padding:"3px 10px",fontSize:10}}>← Back</button>
                <span style={{fontWeight:700,fontSize:14,color:"#0d1326"}}>{selGrp.name}</span>
                <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[selGrp.status],color:STATUS_CLR[selGrp.status]}}>{selGrp.status}</span>
              </div>
              <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{selGrp.dest} · {selGrp.travel} · {selGrp.pax} pax · Leader: {selGrp.leader}</p>
            </div>
            <button onClick={()=>setRoute("/sales/holiday")} style={{...btnG,fontSize:11}}>📄 Generate Invoice</button>
          </div>
          {/* Rooming list */}
          <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Rooming List</p>
          <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{background:"#0d1326"}}>{["#","Guest Name","Room Type","Check-in","Check-out","Notes"].map((h,i)=><th key={i} style={{padding:"7px 12px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>{h}</th>)}</tr></thead>
              <tbody>{Array.from({length:Math.min(selGrp.pax,6)}).map((_,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"7px 12px",color:"#5a6691"}}>{i+1}</td>
                  <td style={{padding:"7px 12px"}}><input defaultValue={`Guest ${i+1}`} style={{...inp,minHeight:28,fontSize:10.5,padding:"3px 8px"}}/></td>
                  <td style={{padding:"7px 12px"}}><select style={{...inp,minHeight:28,fontSize:10.5}}>{selGrp.rooms.map(r=><option key={r.type}>{r.type}</option>)}</select></td>
                  <td style={{padding:"7px 12px"}}><input type="date" defaultValue={selGrp.travel} style={{...inp,minHeight:28,fontSize:10.5}}/></td>
                  <td style={{padding:"7px 12px"}}><input type="date" style={{...inp,minHeight:28,fontSize:10.5}}/></td>
                  <td style={{padding:"7px 12px"}}><input placeholder="Dietary, birthday..." style={{...inp,minHeight:28,fontSize:10.5}}/></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={{...btnG,fontSize:11}}>💾 Save Rooming List</button>
            <button style={{...btnGh,fontSize:11}}>📧 Email to Hotel</button>
            <button style={{...btnGh,fontSize:11}}><Download size={12}/> Excel Manifest</button>
          </div>
        </div>
      )}

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>New Group Booking</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Group name"><input style={inp} placeholder="e.g. Sharma Family Trip"/></FL>
                <FL label="Type"><select style={inp}><option>FIT Group</option><option>GIT</option><option>MICE</option></select></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <FL label="Destination"><input style={inp}/></FL>
                <FL label="Pax count"><input type="number" defaultValue={10} style={inp}/></FL>
                <FL label="Travel date"><input type="date" style={inp}/></FL>
              </div>
              <FL label="Group leader / contact"><input style={inp}/></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={()=>setModal(false)} style={btnG}>Create Group</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PERIOD LOCKING — dead code, unrouted (not in App.jsx)
   ════════════════════════════════════════════════════════════════ */

export function PeriodLocking({branch,setRoute}){
  const mob=useMobile();

  const locked=PERIOD_LOCK_DATA.filter(p=>p.status==="Locked").length;
  const open=PERIOD_LOCK_DATA.filter(p=>p.status==="Open").length;
  const soft=PERIOD_LOCK_DATA.filter(p=>p.status==="Soft Lock").length;
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>🔒 Period Locking</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Prevent backdated postings into closed accounting periods · Per-branch · Admin-only unlock</p>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Locked Periods</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{locked}</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Soft Locks</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{soft}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>Warning only</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Open Periods</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{open}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Branches</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>2</p></div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Branch</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Period</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Status</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Locked By</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Locked On</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Reason</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Action</th>
            </tr></thead>
            <tbody>
              {PERIOD_LOCK_DATA.map((p,i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
                  <td style={{padding:"7px 8px",textAlign:"center",fontWeight:700}}>{p.branch}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontFamily:"monospace"}}>{p.period}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}>
                    <span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:p.status==="Locked"?"#FCEBEB":p.status==="Soft Lock"?"#FAEEDA":"#EAF3DE",color:p.status==="Locked"?"#A32D2D":p.status==="Soft Lock"?"#854F0B":"#27500A"}}>
                      {p.status==="Locked"?"🔒 ":p.status==="Soft Lock"?"⚠ ":"🔓 "}{p.status}
                    </span>
                  </td>
                  <td style={{padding:"7px 8px",fontSize:10}}>{p.lockedBy}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{p.lockedOn}</td>
                  <td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>{p.reason}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}>
                    {p.status==="Open"?<button style={{padding:"3px 10px",border:"none",background:"#A32D2D",color:"#fff",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer"}}>Lock</button>:<button style={{padding:"3px 10px",border:"1px solid #185FA5",background:"#fff",color:"#185FA5",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer"}}>Unlock</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{marginTop:12,fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>
        💡 Hard Lock — no posting/editing allowed · Soft Lock — admin warning shown but posting permitted · Open — free editing
      </p>
    </div>
  );
}
