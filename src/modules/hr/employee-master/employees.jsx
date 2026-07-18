/* ── Employee Master (/hr/employees) ─────────────────────────── */

import { useState, useEffect } from 'react';
import { Plus, Save, Search } from 'lucide-react';
import { BRANCHES, HR_BRANCHES_F, HR_DEPTS } from '../../../core/data';
import { useMobile } from '../../../core/hooks';
import { useModalEsc } from '../../../core/ux/useModalEsc';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { fromEmpDTO, toEmpPayload, BLANK_EMP } from '../employeeMap';
import { fromShiftDTO } from '../hrMaps';
import { toast } from '../../../core/ux/toast';
import { FL, btnG, btnGh, card, inp } from '../../../core/styles';
import { Skeleton, isViewOnly, VIEW_ONLY_REASON } from '../../../shell/primitives';

export function HrEmployees({branch}){
  const vo=isViewOnly();
  const mob=useMobile();
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [selected,setSelected]=useState(null);
  const [form,setForm]=useState(BLANK_EMP);
  const [search,setSearch]=useState("");
  const [deptFilter,setDeptFilter]=useState("All");
  const [brFilter,setBrFilter]=useState(branch==="ALL"?"All":branch?.code||"All");

  /* Live, branch-scoped employee master. ALL → every branch; a specific branch →
     server-filtered to that branch (?branch=CODE). Re-scope when the top-bar
     branch changes so the page never shows another branch's people. */
  const brScope=branch==="ALL"?"":(branch?.code||"");
  const empQ=useMasterList('employees', brScope?{branch:brScope}:{});
  const emps=(empQ.data||[]).map(fromEmpDTO);
  const {create,update,remove}=useMasterMutations('employees');
  /* Active shifts for the assignment picker: those for the form's branch + the all-branch ('') ones. */
  const shifts=((useMasterList('shifts', {active:true}).data)||[]).map(fromShiftDTO).filter(s=>s.active);
  // HR org masters (LIVE 2026-07-10) — departments/designations/grades drive the
  // job-detail selects; an employee's legacy free-text value not in the master
  // renders as an extra "(current)" option so old rows never blank on save.
  const orgDepts=((useMasterList('departments',{active:true}).data)||[]).map(d=>d.name).filter(Boolean);
  const orgDesigs=((useMasterList('designations',{active:true}).data)||[]).map(d=>d.name).filter(Boolean);
  const orgGrades=(useMasterList('grades',{active:true}).data)||[];
  const shiftOpts=shifts.filter(s=>!s.branch||s.branch===(form.branch||brScope));
  const saving=create.isPending||update.isPending;
  useEffect(()=>{ setBrFilter(branch==="ALL"?"All":branch?.code||"All"); },[branch]);

  const openNew=()=>{ setSelected(null); setForm({...BLANK_EMP,branch:brScope||"BOM"}); setModal(true); };
  const openEdit=(e)=>{ setSelected(e); setForm(e); setModal(true); };
  const closeModal=()=>{ setModal(false); setSelected(null); };
  const setF=(k,v)=>setForm(f=>({...f,[k]:v}));
  const saveEmp=()=>{
    if(!form.id||!form.name||!form.branch){ toast("Employee ID, name and branch are required","error"); return; }
    const payload=toEmpPayload(form);
    const opts={ onSuccess:()=>{ toast(selected?"Employee updated":"Employee added"); closeModal(); },
      onError:(err)=>toast(err?.message||"Save failed","error") };
    if(selected&&form._id) update.mutate({id:form._id,body:payload},opts);
    else create.mutate(payload,opts);
  };
  const deleteEmp=()=>{
    if(!form._id) return;
    if(!window.confirm(`Delete ${form.name}? This cannot be undone.`)) return;
    remove.mutate(form._id,{ onSuccess:()=>{ toast("Employee deleted"); closeModal(); },
      onError:(err)=>toast(err?.message||"Delete failed","error") });
  };
  /* Safe alternative to Delete: flips the employee to Inactive (full payload — the
     backend validator needs empId/name/branch on every PUT). Record, payroll and
     attendance history stay; Reactivate reverses it. */
  const toggleEmpStatus=()=>{
    if(!form._id) return;
    const next=form.status==="Inactive"?"Active":"Inactive";
    if(next==="Inactive"&&!window.confirm(`Deactivate ${form.name}? The record and payroll history stay — you can reactivate any time.`)) return;
    update.mutate({id:form._id,body:toEmpPayload({...form,status:next})},{
      onSuccess:()=>{ toast(next==="Inactive"?"Employee deactivated":"Employee reactivated"); closeModal(); },
      onError:(err)=>toast(err?.message||"Update failed","error") });
  };

  const filtered=emps.filter(e=>(
    (deptFilter==="All"||e.dept===deptFilter)&&
    (brFilter==="All"||e.branch===brFilter)&&
    (!search||e.name.toLowerCase().includes(search.toLowerCase())||
     (e.id||"").toLowerCase().includes(search.toLowerCase())||
     (e.desig||"").toLowerCase().includes(search.toLowerCase()))
  ));

  const DEPT_CLR={"Operations":"#185FA5","Sales":"#27500A","Accounts":"#854F0B","IT":"#384677","HR & Admin":"#A32D2D"};
  const brCfg=e=>BRANCHES.find(b=>b.code===e.branch)||{cur:"₹",curCode:"INR"};

  const gross=e=>(+e.basic||0)+(+e.hra||0)+(+e.da||0)+(+e.travel||0)+(+e.medical||0);
  const deductions=e=>(+e.pf||0)+(+e.esi||0)+(+e.tds||0);
  const net=e=>gross(e)-deductions(e);

  return (
    <div style={{padding:"20px 32px",maxWidth:1600,margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
        flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#E6F1FB",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>👥</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Employee Master</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>
              {empQ.isLoading?<Skeleton className="inline-block h-3 w-20 align-middle" />:`${filtered.length} employees`} · {branch==="ALL"?"All branches":(branch?.code||brScope||"—")} · {new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"})}
            </p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <select value={brFilter} onChange={e=>setBrFilter(e.target.value)}
            style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {HR_BRANCHES_F.map(b=><option key={b}>{b}</option>)}
          </select>
          <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}
            style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {HR_DEPTS.map(d=><option key={d}>{d}</option>)}
          </select>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search name, ID, designation..." style={{...inp,width:220,minHeight:32,fontSize:11}}/>
          <button onClick={openNew}
            style={{...btnG,fontSize:11}}><Plus size={13}/> New Employee</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #185FA5",padding:"11px 14px",background:"#E6F1FB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#185FA5",textTransform:"uppercase",letterSpacing:"0.5px"}}>Total Employees</p><p style={{margin:"4px 0 0",fontSize:24,fontWeight:800,color:"#0d1326"}}>{String(emps.length)}</p></div>
          <div style={{...card,borderTop:"3px solid #27500A",padding:"11px 14px",background:"#EAF3DE"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#27500A",textTransform:"uppercase",letterSpacing:"0.5px"}}>Active</p><p style={{margin:"4px 0 0",fontSize:24,fontWeight:800,color:"#0d1326"}}>{String(emps.filter(e=>e.status==="Active").length)}</p></div>
          <div style={{...card,borderTop:"3px solid #854F0B",padding:"11px 14px",background:"#FAEEDA"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#854F0B",textTransform:"uppercase",letterSpacing:"0.5px"}}>Branches</p><p style={{margin:"4px 0 0",fontSize:24,fontWeight:800,color:"#0d1326"}}>{String(new Set(emps.map(e=>e.branch).filter(Boolean)).size)}</p></div>
          <div style={{...card,borderTop:"3px solid #384677",padding:"11px 14px",background:"#f3f4f8"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#384677",textTransform:"uppercase",letterSpacing:"0.5px"}}>Departments</p><p style={{margin:"4px 0 0",fontSize:24,fontWeight:800,color:"#0d1326"}}>{String(new Set(emps.map(e=>e.dept)).size)}</p></div>
      </div>

      {/* Employee table */}
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Emp ID","Employee Name","Branch","Department","Designation","Gross Salary","Net Salary","Status",""].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=5&&i<=6?"right":"left",
                color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{empQ.isLoading&&Array.from({length:6}).map((_,i)=>(
            <tr key={`sk-${i}`}><td colSpan={9} style={{padding:"10px 12px"}}><Skeleton className="h-4 w-full" style={{opacity:Math.max(0.4,1-i*0.15)}} /></td></tr>
          ))}{!empQ.isLoading&&filtered.length===0&&(
            <tr><td colSpan={9} style={{padding:"22px 12px",textAlign:"center",color:"#8b94b3",fontSize:12}}>
              {empQ.isError?"Failed to load employees.":"No employees found for this branch. Use “New Employee” to add one."}
            </td></tr>
          )}{filtered.map((e,i)=>{
            const bc2=brCfg(e);
            const c=DEPT_CLR[e.dept]||"#384677";
            return (
              <tr key={e._id||e.id} style={{borderBottom:"1px solid #dfe2e7",
                background:i%2===0?"#fff":"#fafafa",cursor:"pointer"}}
                onMouseEnter={ev=>ev.currentTarget.style.background="#f0f4ff"}
                onMouseLeave={ev=>ev.currentTarget.style.background=i%2===0?"#fff":"#fafafa"}
                onClick={()=>openEdit(e)}>
                <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:10.5,
                  fontWeight:700,color:"#185FA5"}}>{e.id}</td>
                <td style={{padding:"9px 12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,
                      background:c+"22",display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:12,fontWeight:700,color:c}}>
                      {e.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                    </div>
                    <div>
                      <p style={{margin:0,fontWeight:600,color:"#0d1326"}}>{e.name}</p>
                      <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{e.email}</p>
                    </div>
                  </div>
                </td>
                <td style={{padding:"9px 12px"}}>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:700,
                    background:"#E6F1FB",color:"#185FA5"}}>{e.branch}</span>
                </td>
                <td style={{padding:"9px 12px"}}>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:600,
                    background:c+"18",color:c}}>{e.dept}</span>
                </td>
                <td style={{padding:"9px 12px",color:"#384677"}}>{e.desig}</td>
                <td style={{padding:"9px 12px",textAlign:"right",fontWeight:600,
                  fontVariantNumeric:"tabular-nums",color:"#384677"}}>
                  {bc2.cur}{gross(e).toLocaleString()}
                </td>
                <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,
                  fontVariantNumeric:"tabular-nums",color:"#27500A"}}>
                  {bc2.cur}{net(e).toLocaleString()}
                </td>
                <td style={{padding:"9px 12px"}}>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,
                    background:e.status==="Active"?"#EAF3DE":"#f3f4f8",
                    color:e.status==="Active"?"#27500A":"#9ca3af"}}>{e.status}</span>
                </td>
                <td style={{padding:"9px 12px"}}>
                  <button onClick={ev=>{ev.stopPropagation();openEdit(e);}}
                    style={{...btnGh,padding:"3px 10px",fontSize:10}}>Edit</button>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>

      {/* Employee detail modal */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",
          zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:600,
            maxHeight:"92vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            {/* Modal header */}
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",
              position:"sticky",top:0,background:"#0d1326",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#d4a437"}}>
                {selected?`Edit — ${selected.name}`:"New Employee"}
              </p>
              <button onClick={closeModal}
                style={{background:"transparent",border:"none",cursor:"pointer",
                  fontSize:20,color:"#8b94b3"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px"}}>
              {/* Basic info */}
              <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:"#0d1326",
                textTransform:"uppercase",letterSpacing:"0.5px"}}>Personal & Job Details</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <FL label="Employee ID"><input value={form.id} onChange={e=>setF("id",e.target.value)} placeholder="BOM-EMP-007" disabled={!!selected} style={{...inp,fontFamily:"monospace",...(selected?{background:"#f3f4f8",color:"#5a6691"}:{})}}/></FL>
                <FL label="Full name"><input value={form.name} onChange={e=>setF("name",e.target.value)} style={inp}/></FL>
                <FL label="Branch"><select value={form.branch} onChange={e=>setF("branch",e.target.value)} style={inp}>
                  <option value="" disabled>Select branch…</option>
                  {BRANCHES.map(b=><option key={b.code} value={b.code}>{b.code}</option>)}</select></FL>
                <FL label="Department"><select value={form.dept} onChange={e=>setF("dept",e.target.value)} style={inp}>
                  <option value="">—</option>
                  {form.dept&&!orgDepts.includes(form.dept)&&!HR_DEPTS.includes(form.dept)&&<option value={form.dept}>{form.dept} (current)</option>}
                  {(orgDepts.length?orgDepts:HR_DEPTS.filter(d=>d!=="All")).map(d=><option key={d} value={d}>{d}</option>)}</select></FL>
                <FL label="Designation"><select value={form.desig} onChange={e=>setF("desig",e.target.value)} style={inp}>
                  <option value="">—</option>
                  {form.desig&&!orgDesigs.includes(form.desig)&&<option value={form.desig}>{form.desig} (current)</option>}
                  {orgDesigs.map(d=><option key={d} value={d}>{d}</option>)}
                  {!orgDesigs.length&&!form.desig&&<option value="" disabled>Define designations under the HR org masters</option>}</select></FL>
                <FL label="Grade (salary band)"><select value={form.grade||""} onChange={e=>setF("grade",e.target.value)} style={inp}>
                  <option value="">—</option>
                  {form.grade&&!orgGrades.some(g=>g.name===form.grade)&&<option value={form.grade}>{form.grade} (current)</option>}
                  {orgGrades.map(g=><option key={g.id||g.name} value={g.name}>{g.name}{g.minSalary||g.maxSalary?` (₹${g.minSalary||0}–${g.maxSalary||"∞"})`:""}</option>)}</select></FL>
                <FL label="Shift"><select value={form.shiftId||""} onChange={e=>{const s=shiftOpts.find(x=>x.id===e.target.value);setForm(f=>({...f,shiftId:e.target.value,shiftCode:s?.code||""}));}} style={inp}>
                  <option value="">— branch default —</option>
                  {/* Keep the current assignment visible even if that shift is inactive or from
                      another branch, so the select never blanks out (and a save can't wipe it). */}
                  {form.shiftId&&!shiftOpts.some(s=>s.id===form.shiftId)&&<option value={form.shiftId}>{form.shiftCode||"Assigned shift"} (current)</option>}
                  {shiftOpts.map(s=><option key={s.id} value={s.id}>{s.name}{s.code?` (${s.code})`:""} · {s.startTime}–{s.endTime}</option>)}</select></FL>
                <FL label="Date of joining"><input type="date" value={form.joined} onChange={e=>setF("joined",e.target.value)} style={inp}/></FL>
                <FL label="Date of birth"><input type="date" value={form.dob} onChange={e=>setF("dob",e.target.value)} style={inp}/></FL>
                <FL label="Mobile"><input value={form.mobile} onChange={e=>setF("mobile",e.target.value)} style={inp}/></FL>
                <FL label="Email"><input value={form.email} onChange={e=>setF("email",e.target.value)} style={inp}/></FL>
                <FL label="Status"><select value={form.status} onChange={e=>setF("status",e.target.value)} style={inp}><option>Active</option><option>Inactive</option></select></FL>
                {form.status==="Inactive"&&<FL label="Exit date"><input type="date" value={form.exit} onChange={e=>setF("exit",e.target.value)} style={inp}/></FL>}
              </div>

              {/* Salary structure — editable */}
              <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:"#0d1326",
                textTransform:"uppercase",letterSpacing:"0.5px"}}>Salary Structure</p>
              <div style={{...card,padding:"12px 14px",background:"#f9fafb",marginBottom:14}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[["basic","Basic"],["hra","HRA"],["da","DA"],["travel","Travel Allowance"],["medical","Medical"]].map(([k,l])=>(
                    <FL key={k} label={l}><input type="number" value={form[k]} onChange={e=>setF(k,e.target.value)} style={{...inp,textAlign:"right",fontVariantNumeric:"tabular-nums"}}/></FL>
                  ))}
                  <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",padding:"6px 0",
                    borderTop:"2px solid #0d1326",gridColumn:"1/-1",fontWeight:800,fontSize:12}}>
                    <span>Gross Salary</span>
                    <span style={{color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>
                      {BRANCHES.find(b=>b.code===form.branch)?.cur||"₹"}{gross(form).toLocaleString()}
                    </span>
                  </div>
                </div>
                <p style={{margin:"10px 0 6px",fontSize:11,fontWeight:700,color:"#A32D2D"}}>Deductions</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[["pf","PF"],["esi","ESI"],["tds","TDS"]].map(([k,l])=>(
                    <FL key={k} label={l}><input type="number" value={form[k]} onChange={e=>setF(k,e.target.value)} style={{...inp,textAlign:"right",fontVariantNumeric:"tabular-nums"}}/></FL>
                  ))}
                  <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",padding:"6px 0",
                    borderTop:"2px solid #A32D2D",gridColumn:"1/-1",fontWeight:800,fontSize:12}}>
                    <span>Net Take-home</span>
                    <span style={{color:"#27500A",fontVariantNumeric:"tabular-nums"}}>
                      {BRANCHES.find(b=>b.code===form.branch)?.cur||"₹"}{net(form).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",
              display:"flex",justifyContent:"space-between",gap:8,position:"sticky",bottom:0,background:"#fff"}}>
              <div style={{display:"flex",gap:8}}>{selected&&(<>
                <button onClick={toggleEmpStatus} disabled={update.isPending||vo}
                  style={{...btnGh,color:form.status==="Inactive"?"#27500A":"#854F0B",borderColor:form.status==="Inactive"?"#27500A":"#854F0B",...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}
                  title={vo?VIEW_ONLY_REASON:"Keeps the record and its payroll/attendance history — use instead of Delete"}>
                  {update.isPending?"Saving…":form.status==="Inactive"?"Reactivate":"Deactivate"}</button>
                <button onClick={deleteEmp} disabled={remove.isPending||vo} title={vo?VIEW_ONLY_REASON:undefined}
                  style={{...btnGh,color:"#A32D2D",borderColor:"#A32D2D",...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>{remove.isPending?"Deleting…":"Delete"}</button>
              </>)}</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={closeModal} style={btnGh}>Cancel</button>
                <button onClick={saveEmp} disabled={saving||vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...btnG,...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>{saving?"Saving…":"Save Employee"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
