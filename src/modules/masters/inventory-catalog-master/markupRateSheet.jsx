import { useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { FL, btnG, btnGh, card, inp } from '../../../core/styleTokens';
import { HExportBtn } from '../shared/hExportBtn';

const MARKUP_RULE_BLANK={client:"ALL B2C",type:"B2C",module:"Flight",markupType:"Percentage",value:12,floor:8,note:""};

export function MarkupRateSheet({branch}){
  /* Live rule master (/api/markup-rules) — rules persist via the CRUD mutations and
     feed the SO/PO/GP booking screen's markup prefill. editId null = Add Rule. */
  const {data:rules=[]}=useMasterList('markup-rules');
  const {create,update,remove}=useMasterMutations('markup-rules');
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState(MARKUP_RULE_BLANK);
  const openNew=()=>{setForm(MARKUP_RULE_BLANK);setEditId(null);setModal(true);};
  const openEdit=(r)=>{setForm({client:r.client||"ALL",type:r.type||"ALL",module:r.module||"ALL",markupType:r.markupType||"Percentage",value:r.value??0,floor:r.floor??0,note:r.note||""});setEditId(r.id);setModal(true);};
  const saveRule=()=>{
    const body={...form,value:+form.value||0,floor:+form.floor||0};
    const done={onSuccess:()=>{setModal(false);setEditId(null);setForm(MARKUP_RULE_BLANK);}};
    editId?update.mutate({id:editId,body},done):create.mutate(body,done);
  };

  /* GP floor alert checker */
  const alertCount=rules.filter(r=>r.floor>0&&r.value<r.floor).length;

  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📐</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Service Charge - 2 / Net Rate Sheet</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Per-client Service Charge - 2 rules · GP floor alerts · All modules</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <HExportBtn name="other-taxes-rules" rows={rules} columns={[{key:"id",label:"ID"},{key:"client",label:"Client / Segment"},{key:"type",label:"Type"},{key:"module",label:"Module"},{key:"markupType",label:"Service Charge - 2 Type"},{key:"value",label:"Service Charge - 2 Value"},{key:"floor",label:"GP Floor %"},{key:"note",label:"Notes"}]}/>
          <button onClick={openNew} style={{...btnG,fontSize:11}}><Plus size={13}/> Add Rule</button>
        </div>
      </div>

      {alertCount>0&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600,display:"flex",gap:8}}>
        <AlertTriangle size={14}/> {alertCount} Service Charge - 2 rule{alertCount>1?"s":""} below the GP floor — review pricing immediately
      </div>}

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["ID","Client / Segment","Type","Module","Service Charge - 2 Type","Service Charge - 2","GP Floor","Alert","Notes",""].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=5&&i<=6?"right":"left",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{rules.map((r,i)=>(
            <tr key={r.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10,color:"#5a6691"}}>{String(r.id||"").slice(-6).toUpperCase()}</td>
              <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{r.client}</td>
              <td style={{padding:"8px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{r.type}</span></td>
              <td style={{padding:"8px 12px",color:"#384677"}}>{r.module}</td>
              <td style={{padding:"8px 12px",color:"#5a6691"}}>{r.markupType}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:800,fontSize:14,color:"#27500A"}}>{r.markupType==="Percentage"?`${r.value}%`:`₹${r.value}`}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,color:r.value<r.floor?"#A32D2D":"#5a6691"}}>{r.floor>0?`${r.floor}% min`:"None"}</td>
              <td style={{padding:"8px 12px"}}>{r.value<r.floor?<span style={{fontSize:10,padding:"2px 8px",borderRadius:999,background:"#FCEBEB",color:"#A32D2D",fontWeight:700}}>Below Floor!</span>:<span style={{color:"#27500A",fontSize:14}}>✔</span>}</td>
              <td style={{padding:"8px 12px",fontSize:10,color:"#5a6691"}}>{r.note}</td>
              <td style={{padding:"8px 12px",whiteSpace:"nowrap"}}>
                <button onClick={()=>openEdit(r)} title="Edit rule" style={{background:"transparent",border:"none",cursor:"pointer",color:"#185FA5",fontSize:13,marginRight:6}}>✎</button>
                <button onClick={()=>remove.mutate(r.id)} title="Delete rule" style={{background:"transparent",border:"none",cursor:"pointer",color:"#A32D2D",fontSize:13}}>✕</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:460,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>{editId?"Edit Service Charge - 2 Rule":"Add Service Charge - 2 Rule"}</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Client / ALL B2B / ALL B2C"><input value={form.client} onChange={e=>setForm(f=>({...f,client:e.target.value}))} style={inp} placeholder="ALL B2C"/></FL>
                <FL label="Type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}><option>ALL</option><option>B2B</option><option>B2C</option><option>B2E</option></select></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Module"><select value={form.module} onChange={e=>setForm(f=>({...f,module:e.target.value}))} style={inp}>{["ALL","Flight","Holiday","Hotel","Car","Visa","Insurance","Misc"].map(m=><option key={m}>{m}</option>)}</select></FL>
                <FL label="Service Charge - 2 type"><select value={form.markupType} onChange={e=>setForm(f=>({...f,markupType:e.target.value}))} style={inp}><option>Percentage</option><option value="Flat">Fixed Fee</option></select></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label={form.markupType==="Percentage"?"Service Charge - 2 %":"Fixed fee (₹)"}><input type="number" value={form.value} onChange={e=>setForm(f=>({...f,value:+e.target.value}))} style={inp}/></FL>
                <FL label="GP floor % (0 = no floor)"><input type="number" value={form.floor} onChange={e=>setForm(f=>({...f,floor:+e.target.value}))} style={inp}/></FL>
              </div>
              <FL label="Note"><input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} style={inp}/></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={saveRule} disabled={create.isPending||update.isPending} style={btnG}>💾 {create.isPending||update.isPending?"Saving…":"Save Rule"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
