/* ── Attendance (/hr/attendance) ──────────────────────────────── */

import { useState, useEffect } from 'react';
import { Legend } from 'recharts';
import { BRANCHES, HR_BRANCHES_F } from '../../../core/data';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { fromEmpDTO } from '../employeeMap';
import { fromShiftDTO, weeklyOffForShift, isLate, punctualityPct } from '../hrMaps';
import { toast } from '../../../core/ux/toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut, getAuthToken } from '../../../core/api';
import { btnG, btnGh, card, inp } from '../../../core/styles';
import { Skeleton, isViewOnly, VIEW_ONLY_REASON } from '../../../shell/primitives';

export function HrAttendance({branch}){
  const vo=isViewOnly();
  // Last 6 months through the current one, derived from the live clock (was hard-coded to
  // Mar–May 2026, so the current month — where marks & the dashboard KPI live — couldn't
  // even be selected). Default to the current month.
  const MONTHS=(()=>{const out=[];const d=new Date();for(let i=0;i<6;i++){const dt=new Date(d.getFullYear(),d.getMonth()-i,1);out.push({v:`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`,l:dt.toLocaleString("en",{month:"short"})+" "+dt.getFullYear()});}return out;})();
  const [month,setMonth]=useState(MONTHS[0].v);
  const [brFilter,setBrFilter]=useState(branch==="ALL"?"All":branch?.code||"All");
  const [punchDay,setPunchDay]=useState(0); // 0 = punch panel closed; else the day being timed
  const qc=useQueryClient();
  const STATUS_CLR={P:{bg:"#EAF3DE",c:"#27500A",l:"Present"},A:{bg:"#FCEBEB",c:"#A32D2D",l:"Absent"},
    L:{bg:"#FAEEDA",c:"#854F0B",l:"Leave"},H:{bg:"#E6F1FB",c:"#185FA5",l:"Holiday"},
    WO:{bg:"#f3f4f8",c:"#5a6691",l:"Week Off"}};
  // Click a cell to cycle through the statuses (then back to unmarked).
  const CYCLE=["P","A","L","H","WO"];

  const getDaysInMonth=m=>{const [y,mo]=m.split("-").map(Number);return new Date(y,mo,0).getDate();};
  const getDay=d=>new Date(month+"-"+String(d).padStart(2,"0")).getDay();

  useEffect(()=>{ setBrFilter(branch==="ALL"?"All":branch?.code||"All"); },[branch]);

  /* Live, branch-scoped employee rows (from the now-live Employee Master) + the
     live monthly attendance register. ALL → every branch. */
  const brScope=branch==="ALL"?"":(branch?.code||"");
  const emps=((useMasterList('employees', brScope?{branch:brScope}:{}).data)||[]).map(fromEmpDTO)
    .filter(e=>(brFilter==="All"||e.branch===brFilter));
  /* Shift master → each employee's weekly-off drives the WO default (was hard-coded Sat+Sun).
     Load ALL shifts (not active-only) so late-mark & punctuality resolve an employee's shift
     even if it was later deactivated — matching the backend KPI (getStats loads all shifts). */
  const shiftsById=Object.fromEntries(((useMasterList('shifts',{}).data)||[]).map(s=>{const x=fromShiftDTO(s);return [x.id,x];}));
  const woFor=(emp)=>weeklyOffForShift(emp.shiftId,shiftsById);
  /* Public-holiday calendar (LIVE 2026-07-10, /api/holidays): holidays matching the
     employee's branch (or 'ALL') auto-render 'H'; a hand-marked status still WINS so
     corrections stay possible. Bulk fills skip holiday dates like weekly-offs. */
  const { create: holidayCreate, remove: holidayRemove } = useMasterMutations('holidays');
  const holidayRows=((useMasterList('holidays',{active:true}).data)||[]).filter(h=>String(h.date||"").startsWith(month));
  const isoOf=(day)=>`${month}-${String(day).padStart(2,"0")}`;
  const holidayFor=(emp,day)=>holidayRows.some(h=>h.date===isoOf(day)&&(h.branch==="ALL"||h.branch===emp.branch));
  const [holModal,setHolModal]=useState(false);
  const [holForm,setHolForm]=useState({date:"",name:"",branch:"ALL"});
  const attQ=useQuery({
    queryKey:['attendance',brScope||'ALL',month],
    queryFn:()=>apiGet('/api/attendance',{branch:brScope||'ALL',month}),
    enabled:!!getAuthToken(),
    staleTime:15_000,
  });
  // empId → days map ({ '1':'P', ... }) + times map ({ '1':{in,out} }) for this month.
  // apiGet already unwraps the { success, data } envelope, so attQ.data is the rows array.
  const attByEmp=Object.fromEntries(((attQ.data)||[]).map(r=>[r.empId,r.days||{}]));
  const timeByEmp=Object.fromEntries(((attQ.data)||[]).map(r=>[r.empId,r.times||{}]));
  // Late = the day's in-time is after the employee's shift start + grace (derived, never stored).
  const lateFor=(emp,day)=>{
    const t=timeByEmp[emp.id]?.[String(day)]; if(!t||!t.in) return false;
    const sh=shiftsById[emp.shiftId]; return sh?isLate(t.in,sh.startTime,sh.graceMins):false;
  };

  const markMut=useMutation({
    mutationFn:(body)=>apiPut('/api/attendance/mark',body),
    onSuccess:()=>qc.invalidateQueries({queryKey:['attendance',brScope||'ALL',month]}),
    onError:(err)=>toast(err?.message||"Could not save attendance","error"),
  });
  const timeMut=useMutation({
    mutationFn:(body)=>apiPut('/api/attendance/time',body),
    onSuccess:()=>qc.invalidateQueries({queryKey:['attendance',brScope||'ALL',month]}),
    onError:(err)=>toast(err?.message||"Could not save punch time","error"),
  });

  const days=getDaysInMonth(month);

  /* Bulk "mark all present" — one round-trip per weekly-off GROUP. Needs a single concrete
     branch (all-scope + no branch filter → disabled). "Working days" respects EACH employee's
     assigned-shift weekly-off (grouped so a Friday-off Gulf shift and a Sunday-off General
     shift each get their own correct day list), never a hard-coded Sun/Sat rule. */
  const bulkBranch=brScope||(brFilter!=="All"?brFilter:"");
  const curMonth=MONTHS[0].v; const isCurMonth=month===curMonth;
  const upTo=isCurMonth?new Date().getDate():days;
  const bulkMut=useMutation({
    mutationFn:(body)=>apiPut('/api/attendance/mark-days',body),
    onSuccess:(d)=>{qc.invalidateQueries({queryKey:['attendance',brScope||'ALL',month]});toast(`Marked ${d?.employees||0} employee(s) present`);},
    onError:(err)=>toast(err?.message||"Bulk mark failed","error"),
  });
  const canBulk=!!bulkBranch&&emps.length>0&&!bulkMut.isPending;
  // Group employees by their weekly-off signature so each group gets its own working-day list.
  const bulkGroups=(dayFilter)=>{
    const groups=new Map();
    for(const e of emps){
      const wo=woFor(e); const key=wo.join(",");
      if(!groups.has(key)) groups.set(key,{wo,list:[]});
      groups.get(key).list.push({empId:e.id,empName:e.name});
    }
    const plan=[];
    // Holidays are skipped like weekly-offs. Group-wide ('ALL') and the bulk branch's
    // holidays both apply (the bulk always targets ONE branch, so this is exact).
    const isHoliday=(d)=>holidayRows.some(h=>h.date===isoOf(d)&&(h.branch==="ALL"||h.branch===bulkBranch));
    for(const {wo,list} of groups.values()){
      const daysArr=dayFilter.filter(d=>!wo.includes(getDay(d))&&!isHoliday(d));
      if(daysArr.length&&list.length) plan.push({days:daysArr,employees:list});
    }
    return plan;
  };
  const markToday=()=>{
    if(!canBulk||!isCurMonth)return;
    const plan=bulkGroups([new Date().getDate()]);
    if(!plan.length){toast("Everyone listed is on weekly-off today","info");return;}
    for(const p of plan) bulkMut.mutate({branch:bulkBranch,month,days:p.days,status:"P",employees:p.employees});
  };
  const fillWorking=()=>{
    if(!canBulk)return;
    const allDays=Array.from({length:upTo},(_,i)=>i+1);
    const plan=bulkGroups(allDays);
    const cells=plan.reduce((s,p)=>s+p.days.length*p.employees.length,0);
    if(!cells)return;
    if(!window.confirm(`Mark ${cells} present cell(s) for ${emps.length} employee(s) in ${bulkBranch}, respecting each one's shift weekly-off? (existing marks on those days are overwritten)`))return;
    for(const p of plan) bulkMut.mutate({branch:bulkBranch,month,days:p.days,status:"P",employees:p.employees});
  };

  /* Phase-2 punch capture: save one employee-day's in/out, and per-employee month
     punctuality (on-time present-with-punch ÷ present-with-punch). */
  // Send ONLY the field that changed — the backend merges per-field (times.<d>.in/.out), so
  // editing In can't clobber a just-saved Out even if the refetch hasn't landed yet.
  const saveTime=(emp,day,fields)=>{ timeMut.mutate({branch:emp.branch,empId:emp.id,empName:emp.name,month,day,...fields}); };
  // Per-employee month punctuality via the shared pure helper (identical rule to the backend KPI).
  const punctualityOf=(emp)=>punctualityPct(attByEmp[emp.id]||{},timeByEmp[emp.id]||{},shiftsById[emp.shiftId]);
  const openPunch=()=>setPunchDay(isCurMonth?new Date().getDate():1);

  /* Live status for a cell: an explicit mark wins; otherwise the employee's assigned-shift
     weekly-off days default to Week Off and other unmarked days show "—" — we never invent
     Present. Unassigned employees fall back to Sunday-only off (weeklyOffForShift default). */
  const getAtt=(emp,day)=>{
    const marked=attByEmp[emp.id]?.[String(day)];
    if(marked) return marked;                       // a hand-marked status always wins
    if(holidayFor(emp,day)) return "H";              // holiday calendar → auto-'H'
    return woFor(emp).includes(getDay(day))?"WO":"";
  };
  const cycleCell=(emp,day)=>{
    const cur=attByEmp[emp.id]?.[String(day)]||"";
    const next=CYCLE[(CYCLE.indexOf(cur)+1)%(CYCLE.length+1)]||""; // …→WO→unmarked
    markMut.mutate({branch:emp.branch,empId:emp.id,empName:emp.name,month,day,status:next});
  };

  const summary=emp=>{
    const att=Array.from({length:days},(_,i)=>getAtt(emp,i+1));
    return {P:att.filter(a=>a==="P").length,A:att.filter(a=>a==="A").length,
            L:att.filter(a=>a==="L").length,WO:att.filter(a=>a==="WO").length,H:att.filter(a=>a==="H").length};
  };

  return (
    <div style={{padding:"20px 32px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#EAF3DE",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📅</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Attendance Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>
              {MONTHS.find(m2=>m2.v===month)?.l} · {branch==="ALL"?"All branches":(branch?.code||brScope||"—")} · {attQ.isLoading?<Skeleton className="inline-block h-3 w-20 align-middle" />:`${emps.length} employees`} · click a cell to mark
            </p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <select value={month} onChange={e=>setMonth(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {MONTHS.map(m2=><option key={m2.v} value={m2.v}>{m2.l}</option>)}
          </select>
          <select value={brFilter} onChange={e=>setBrFilter(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {HR_BRANCHES_F.map(b=><option key={b}>{b}</option>)}
          </select>
          {isCurMonth&&<button onClick={markToday} disabled={!canBulk||vo} title={vo?VIEW_ONLY_REASON:(bulkBranch?"Mark every listed employee Present today (respecting weekly-off)":"Pick a single branch to bulk-mark")}
            style={{...btnG,fontSize:11,minHeight:32,opacity:canBulk?1:0.5,cursor:canBulk?"pointer":"not-allowed",...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>✓ All present today</button>}
          <button onClick={fillWorking} disabled={!canBulk||vo} title={vo?VIEW_ONLY_REASON:(bulkBranch?"Mark all working days up to date as Present (per each shift's weekly-off)":"Pick a single branch to bulk-mark")}
            style={{...btnGh,fontSize:11,minHeight:32,opacity:canBulk?1:0.5,cursor:canBulk?"pointer":"not-allowed",...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>Fill working days →</button>
          <button onClick={openPunch} disabled={emps.length===0} title="Record in/out punch times and see late marks"
            style={{...btnGh,fontSize:11,minHeight:32,opacity:emps.length?1:0.5,cursor:emps.length?"pointer":"not-allowed"}}>🕒 Punch times</button>
          <button onClick={()=>{setHolForm({date:month+"-01",name:"",branch:brScope||"ALL"});setHolModal(true);}} title="Manage the public-holiday calendar (auto-marks H on the grid)"
            style={{...btnGh,fontSize:11,minHeight:32}}>🎉 Holidays ({holidayRows.length})</button>
        </div>
      </div>

      {/* Public-holiday calendar admin (LIVE — /api/holidays) */}
      {holModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:520,maxHeight:"85vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Public Holidays — {MONTHS.find(m2=>m2.v===month)?.l}</p>
              <button onClick={()=>setHolModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"14px 18px"}}>
              {holidayRows.length===0&&<p style={{fontSize:11.5,color:"#5a6691",margin:"0 0 10px"}}>No holidays entered for this month — the grid only knows shift weekly-offs until you add them.</p>}
              {holidayRows.map(h=>(
                <div key={h.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid #dfe2e7",fontSize:11.5}}>
                  <span style={{fontFamily:"monospace",fontWeight:700,color:"#185FA5"}}>{h.date}</span>
                  <span style={{flex:1,color:"#0d1326",fontWeight:600}}>{h.name}</span>
                  <span style={{fontSize:10,padding:"1px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{h.branch}</span>
                  <button onClick={()=>holidayRemove.mutate(h.id)} disabled={vo} title={vo?VIEW_ONLY_REASON:"Remove holiday"} style={{background:"#fbe9e9",border:"1px solid #f3c9c9",color:"#dc2626",borderRadius:3,fontSize:10.5,padding:"2px 8px",cursor:"pointer",fontWeight:700,...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>✕</button>
                </div>
              ))}
              <div style={{marginTop:14,padding:12,background:"#fafbfd",border:"1px solid #cdd1d8",borderRadius:8}}>
                <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Add holiday</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr 0.8fr",gap:8}}>
                  <input type="date" value={holForm.date} onChange={e=>setHolForm(f=>({...f,date:e.target.value}))} style={{...inp,minHeight:32,fontSize:11}}/>
                  <input value={holForm.name} onChange={e=>setHolForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Independence Day" style={{...inp,minHeight:32,fontSize:11}}/>
                  <select value={holForm.branch} onChange={e=>setHolForm(f=>({...f,branch:e.target.value}))} style={{...inp,minHeight:32,fontSize:11}}>
                    <option value="ALL">ALL</option>
                    {BRANCHES.map(b=><option key={b.code} value={b.code}>{b.code}</option>)}
                  </select>
                </div>
                <button disabled={!holForm.date||!holForm.name.trim()||holidayCreate.isPending||vo} title={vo?VIEW_ONLY_REASON:undefined}
                  onClick={()=>holidayCreate.mutate({date:holForm.date,name:holForm.name.trim(),branch:holForm.branch,active:true},
                    {onSuccess:()=>{toast("Holiday added — the grid now auto-marks H.");setHolForm(f=>({...f,name:""}));},
                     onError:(e)=>toast(e?.message||"Add failed (duplicate date for this branch?)","error")})}
                  style={{...btnG,fontSize:11,marginTop:8,opacity:!holForm.date||!holForm.name.trim()?0.5:1,...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>
                  {holidayCreate.isPending?"Adding…":"+ Add holiday"}
                </button>
                <p style={{margin:"8px 0 0",fontSize:10,color:"#5a6691"}}>A hand-marked cell still wins over the auto-H, and bulk "Fill working days" skips holidays like weekly-offs.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        {Object.entries(STATUS_CLR).map(([k,v])=>(
          <span key={k} style={{fontSize:10,padding:"3px 10px",borderRadius:999,fontWeight:700,background:v.bg,color:v.c}}>
            {k} = {v.l}
          </span>
        ))}
      </div>

      {/* Attendance grid */}
      <div style={{...card,padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:10.5,minWidth:900}}>
          <thead>
            <tr style={{background:"#0d1326"}}>
              <th style={{padding:"9px 12px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:10,
                position:"sticky",left:0,background:"#0d1326",minWidth:160}}>Employee</th>
              {Array.from({length:days},(_,i)=>{
                const dow=getDay(i+1);
                const isWk=dow===0||dow===6;
                return (
                  <th key={i} style={{padding:"6px 4px",textAlign:"center",width:28,
                    color:isWk?"#5a6691":"#d4a437",fontWeight:700,fontSize:9}}>
                    <div>{i+1}</div>
                    <div style={{fontSize:8,fontWeight:400}}>{"SMTWTFS"[dow]}</div>
                  </th>
                );
              })}
              <th style={{padding:"9px 10px",color:"#d4a437",fontWeight:700,fontSize:9,textAlign:"center"}}>P</th>
              <th style={{padding:"9px 10px",color:"#d4a437",fontWeight:700,fontSize:9,textAlign:"center"}}>A</th>
              <th style={{padding:"9px 10px",color:"#d4a437",fontWeight:700,fontSize:9,textAlign:"center"}}>L</th>
              <th style={{padding:"9px 10px",color:"#d4a437",fontWeight:700,fontSize:9,textAlign:"center"}} title="On-time ÷ present days with a punch">Punc%</th>
            </tr>
          </thead>
          <tbody>{attQ.isLoading&&Array.from({length:5}).map((_,i)=>(
            <tr key={`sk-${i}`}><td colSpan={days+5} style={{padding:"10px 12px"}}><Skeleton className="h-4 w-full" style={{opacity:Math.max(0.4,1-i*0.15)}} /></td></tr>
          ))}{!attQ.isLoading&&emps.length===0&&(
            <tr><td colSpan={days+5} style={{padding:"20px 12px",textAlign:"center",color:"#8b94b3",fontSize:11.5}}>
              No employees for this branch — add them in Employee Master first.
            </td></tr>
          )}{emps.map((emp,ei)=>{
            const s=summary(emp);
            const punc=punctualityOf(emp);
            return (
              <tr key={emp.id} style={{borderBottom:"1px solid #dfe2e7",
                background:ei%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"7px 12px",position:"sticky",left:0,
                  background:ei%2===0?"#fff":"#fafafa",borderRight:"1px solid #cdd1d8"}}>
                  <p style={{margin:0,fontWeight:600,color:"#0d1326",fontSize:11}}>{emp.name}</p>
                  <p style={{margin:0,fontSize:9,color:"#5a6691"}}>{emp.branch} · {emp.dept}{emp.shiftCode?` · ${emp.shiftCode}`:""}</p>
                </td>
                {Array.from({length:days},(_,i)=>{
                  const att=getAtt(emp,i+1);
                  const ac=STATUS_CLR[att]||{bg:"#fff",c:"#cbd2e0"};
                  const late=lateFor(emp,i+1);
                  return (
                    <td key={i} style={{padding:"4px 2px",textAlign:"center"}}>
                      <span onClick={()=>!vo&&cycleCell(emp,i+1)} title={vo?VIEW_ONLY_REASON:(late?"Late arrival — click to change":"Click to change")}
                        style={{display:"inline-block",width:20,height:20,borderRadius:4,
                        lineHeight:"20px",fontSize:8.5,fontWeight:700,cursor:vo?"not-allowed":"pointer",
                        border:att?"none":"1px dashed #e1e3ec",
                        boxShadow:late?"inset 0 -3px 0 #dc2626":undefined,
                        background:ac.bg,color:ac.c}}>
                        {att||"·"}
                      </span>
                    </td>
                  );
                })}
                <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700,color:"#27500A"}}>{s.P}</td>
                <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700,color:"#A32D2D"}}>{s.A}</td>
                <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700,color:"#854F0B"}}>{s.L}</td>
                <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700,color:punc==null?"#8b94b3":punc<80?"#A32D2D":"#27500A"}}>{punc==null?"—":`${punc}%`}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <p style={{margin:"8px 2px 0",fontSize:9.5,color:"#8b94b3"}}>A red underline on a Present cell = late arrival (in-time after the employee's shift start + grace). Punc% = on-time ÷ present days that have a recorded punch.</p>

      {/* Punch in/out panel — record arrival/leaving times for a single day; Late is derived */}
      {punchDay>0&&(
        <div style={{...card,padding:0,marginTop:14,overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:"1px solid #dfe2e7",background:"#f7f9fc"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:12,fontWeight:700,color:"#0d1326"}}>🕒 Punch times</span>
              <select value={punchDay} onChange={e=>setPunchDay(+e.target.value)} style={{...inp,width:"auto",minHeight:30,fontSize:11}}>
                {Array.from({length:days},(_,i)=>i+1).map(d=><option key={d} value={d}>{MONTHS.find(m2=>m2.v===month)?.l} {d}</option>)}
              </select>
            </div>
            <button onClick={()=>setPunchDay(0)} style={{...btnGh,fontSize:11}}>Close</button>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Employee","Shift","In","Out","Status"].map((h,i)=>(
                <th key={i} style={{padding:"8px 12px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{emps.map((emp,ei)=>{
              const t=timeByEmp[emp.id]?.[String(punchDay)]||{};
              const sh=shiftsById[emp.shiftId];
              const late=lateFor(emp,punchDay);
              return (
                <tr key={emp.id} style={{borderBottom:"1px solid #dfe2e7",background:ei%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"7px 12px",fontWeight:600,color:"#0d1326"}}>{emp.name}</td>
                  <td style={{padding:"7px 12px",color:"#5a6691",fontSize:10}}>{sh?`${sh.code||sh.name} ${sh.startTime}–${sh.endTime}`:"— default —"}</td>
                  <td style={{padding:"6px 12px"}}><input key={`in-${emp.id}-${punchDay}-${t.in||""}`} type="time" defaultValue={t.in||""} disabled={vo} title={vo?VIEW_ONLY_REASON:undefined} onBlur={e=>{if(!vo&&(e.target.value||"")!==(t.in||""))saveTime(emp,punchDay,{in:e.target.value});}} style={{...inp,width:110,minHeight:30}}/></td>
                  <td style={{padding:"6px 12px"}}><input key={`out-${emp.id}-${punchDay}-${t.out||""}`} type="time" defaultValue={t.out||""} disabled={vo} title={vo?VIEW_ONLY_REASON:undefined} onBlur={e=>{if(!vo&&(e.target.value||"")!==(t.out||""))saveTime(emp,punchDay,{out:e.target.value});}} style={{...inp,width:110,minHeight:30}}/></td>
                  <td style={{padding:"7px 12px"}}>{t.in?(late?<span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,background:"#FCEBEB",color:"#A32D2D"}}>Late</span>:<span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,background:"#EAF3DE",color:"#27500A"}}>On time</span>):<span style={{fontSize:10,color:"#8b94b3"}}>—</span>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
