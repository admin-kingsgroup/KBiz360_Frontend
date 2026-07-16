/* ── Shift Master (/hr/shifts) ────────────────────────────────── */

import { useState } from 'react';
import { Plus, Save } from 'lucide-react';
import { BRANCHES } from '../../../core/data';
import { useModalEsc } from '../../../core/ux/useModalEsc';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { fromShiftDTO, toShiftPayload } from '../hrMaps';
import { toast } from '../../../core/ux/toast';
import { FL, btnG, btnGh, card, inp } from '../../../core/styles';
import { Skeleton } from '../../../shell/primitives';

export function HrShifts({branch}){
  const brScope=branch==="ALL"?"":(branch?.code||"");
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const blank={name:"",code:"",branch:brScope||"BOM",startTime:"09:30",endTime:"18:30",breakMins:60,graceMins:10,weeklyOff:[0],nightShift:false,active:true,id:null};
  const [form,setForm]=useState(blank);
  const DOW=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const shiftsQ=useMasterList('shifts', brScope?{branch:brScope}:{});
  const shifts=((shiftsQ.data)||[]).map(fromShiftDTO);
  const {create,update,remove}=useMasterMutations('shifts');

  const openNew=()=>{setForm({...blank,branch:brScope||"BOM"});setModal(true);};
  const openEdit=(s)=>{setForm({...s});setModal(true);};
  const toggleWO=(d)=>setForm(f=>({...f,weeklyOff:f.weeklyOff.includes(d)?f.weeklyOff.filter(x=>x!==d):[...f.weeklyOff,d].sort((a,b)=>a-b)}));
  const save=()=>{
    if(!form.name){toast("Shift name is required","error");return;}
    const body=toShiftPayload(form);
    const onDone={onSuccess:()=>{toast("Shift saved");setModal(false);},onError:e=>toast(e?.message||"Save failed","error")};
    if(form.id) update.mutate({id:form.id,body},onDone); else create.mutate(body,onDone);
  };
  const del=(s)=>{ if(!window.confirm(`Delete shift "${s.name}"? Employees on it fall back to the branch default.`))return;
    remove.mutate(s.id,{onSuccess:()=>toast("Shift deleted"),onError:e=>toast(e?.message||"Delete failed","error")}); };
  /* Safe alternative to Delete: an inactive shift keeps past attendance intact but
     leaves the employee assignment picker (it fetches active:true only). Reversible. */
  const toggleShift=(s)=>{
    if(s.active&&!window.confirm(`Deactivate shift "${s.name}"? Past attendance stays; it leaves the assignment picker until reactivated.`))return;
    update.mutate({id:s.id,body:{active:!s.active}},{
      onSuccess:()=>toast(s.active?"Shift deactivated":"Shift reactivated"),
      onError:e=>toast(e?.message||"Update failed","error")}); };

  return (
    <div style={{padding:"20px 32px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🕘</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Shift Master</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{shiftsQ.isLoading?<Skeleton className="inline-block h-3 w-16 align-middle" />:`${shifts.length} shift${shifts.length===1?"":"s"}`} · {branch==="ALL"?"All branches":(branch?.code||brScope||"—")} · weekly-off drives the attendance Week-Off default</p>
          </div>
        </div>
        <button onClick={openNew} style={{...btnG,fontSize:11}}><Plus size={13}/> New Shift</button>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Name","Code","Branch","Timing","Break","Grace","Weekly Off","Active",""].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{shiftsQ.isLoading&&Array.from({length:5}).map((_,i)=>(
            <tr key={`sk-${i}`}><td colSpan={9} style={{padding:"10px 12px"}}><Skeleton className="h-4 w-full" style={{opacity:Math.max(0.4,1-i*0.15)}} /></td></tr>
          ))}{!shiftsQ.isLoading&&shifts.length===0&&(
            <tr><td colSpan={9} style={{padding:"20px 12px",textAlign:"center",color:"#8b94b3",fontSize:11.5}}>
              No shifts yet. Use “New Shift” to add one (e.g. General 09:30–18:30, weekly-off Sun).
            </td></tr>
          )}{shifts.map((s,i)=>(
            <tr key={s.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa",cursor:"pointer"}} onClick={()=>openEdit(s)}>
              <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{s.name}{s.nightShift?" 🌙":""}</td>
              <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{s.code||"—"}</td>
              <td style={{padding:"8px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{s.branch||"All"}</span></td>
              <td style={{padding:"8px 12px",color:"#384677",whiteSpace:"nowrap"}}>{s.startTime}–{s.endTime}</td>
              <td style={{padding:"8px 12px",color:"#5a6691"}}>{s.breakMins}m</td>
              <td style={{padding:"8px 12px",color:"#5a6691"}}>{s.graceMins}m</td>
              <td style={{padding:"8px 12px",color:"#5a6691",fontSize:10}}>{s.weeklyOff.length?s.weeklyOff.map(d=>DOW[d]).join(", "):"—"}</td>
              <td style={{padding:"8px 12px"}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,background:s.active?"#EAF3DE":"#f3f4f8",color:s.active?"#27500A":"#5a6691"}}>{s.active?"Active":"Inactive"}</span></td>
              <td style={{padding:"8px 12px",whiteSpace:"nowrap"}}>
                <button onClick={ev=>{ev.stopPropagation();toggleShift(s);}} title="Keeps past attendance — use instead of Delete"
                  style={{...btnGh,padding:"2px 8px",fontSize:9,color:s.active?"#854F0B":"#27500A",marginRight:6}}>{s.active?"Deactivate":"Reactivate"}</button>
                <button onClick={ev=>{ev.stopPropagation();del(s);}} style={{...btnGh,padding:"2px 8px",fontSize:9,color:"#A32D2D"}}>Delete</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:520,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>{form.id?"Edit shift":"New shift"}</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <FL label="Shift name"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="General" style={inp}/></FL>
              <FL label="Code"><input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))} placeholder="GEN" style={inp}/></FL>
              <FL label="Branch"><select value={form.branch} onChange={e=>setForm(f=>({...f,branch:e.target.value}))} style={inp}>
                <option value="">All branches</option>
                {BRANCHES.map(b=><option key={b.code} value={b.code}>{b.code}</option>)}</select></FL>
              <FL label="Status"><select value={form.active?"Active":"Inactive"} onChange={e=>setForm(f=>({...f,active:e.target.value==="Active"}))} style={inp}><option>Active</option><option>Inactive</option></select></FL>
              <FL label="Start time"><input type="time" value={form.startTime} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))} style={inp}/></FL>
              <FL label="End time"><input type="time" value={form.endTime} onChange={e=>setForm(f=>({...f,endTime:e.target.value}))} style={inp}/></FL>
              <FL label="Break (min)"><input type="number" min={0} value={form.breakMins} onChange={e=>setForm(f=>({...f,breakMins:e.target.value}))} style={inp}/></FL>
              <FL label="Grace (min)"><input type="number" min={0} value={form.graceMins} onChange={e=>setForm(f=>({...f,graceMins:e.target.value}))} style={inp}/></FL>
              <div style={{gridColumn:"1/-1"}}><FL label="Weekly off">
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{DOW.map((d,idx)=>(
                  <button key={d} type="button" onClick={()=>toggleWO(idx)}
                    style={{fontSize:10,padding:"4px 10px",borderRadius:999,fontWeight:700,cursor:"pointer",border:"1px solid #cdd1d8",
                    background:form.weeklyOff.includes(idx)?"#185FA5":"#fff",color:form.weeklyOff.includes(idx)?"#fff":"#5a6691"}}>{d}</button>
                ))}</div></FL></div>
              <label style={{gridColumn:"1/-1",display:"flex",alignItems:"center",gap:8,fontSize:11,color:"#384677"}}>
                <input type="checkbox" checked={form.nightShift} onChange={e=>setForm(f=>({...f,nightShift:e.target.checked}))}/> Night shift (spans midnight)
              </label>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={save} disabled={create.isPending||update.isPending} style={btnG}>{create.isPending||update.isPending?"Saving…":"Save shift"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
