/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Airlines & Consolidators
   ════════════════════════════════════════════════════════════════════
   Moved out of legacy.jsx (strangler-fig masters reorg — grouped under
   inventory-catalog-master/). Logic unchanged.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { useModalEsc } from '../../../core/ux/useModalEsc';
import { FL, btnG, btnGh, card, inp } from '../../../core/styles';
import { MstrShell, MstrModal } from '../components/mstr';
import { ExportBtn } from '../shared/exportBtn';

const AIRLINE_BLANK={iata:"",name:"",country:"",hub:"",type:"Full Service",alliance:"None",bsp:"No",commPct:""};

export function MastersAirlines(){
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [search,setSearch]=useState("");
  // Live airline master (/api/airlines). Create/Edit persist via the mutations;
  // editId tracks which row the modal is editing (null = New Airline).
  const [form,setForm]=useState(AIRLINE_BLANK);
  const [editId,setEditId]=useState(null);
  const setF=(p)=>setForm(f=>({...f,...p}));
  const {data:airlines=[]}=useMasterList('airlines');
  const {create,update}=useMasterMutations('airlines');
  const openNew=()=>{setForm(AIRLINE_BLANK);setEditId(null);setModal(true);};
  const openEdit=(a)=>{setForm({iata:a.iata||"",name:a.name||"",country:a.country||"",hub:a.hub||"",type:a.type||"Full Service",alliance:a.alliance||"None",bsp:a.bsp?"Yes":"No",commPct:a.commPct??""});setEditId(a.id);setModal(true);};
  const saveAirline=()=>{
    const body={iata:form.iata.trim().toUpperCase(),name:form.name.trim(),country:form.country.trim(),hub:form.hub.trim().toUpperCase(),type:form.type,alliance:form.alliance==="None"?"":form.alliance,bsp:form.bsp==="Yes",commPct:+form.commPct||0};
    if(!body.iata||!body.name)return;
    const done={onSuccess:()=>{setModal(false);setEditId(null);setForm(AIRLINE_BLANK);}};
    editId?update.mutate({id:editId,body},done):create.mutate(body,done);
  };
  const filtered=airlines.filter(a=>!search||
    (a.name||"").toLowerCase().includes(search.toLowerCase())||
    (a.iata||"").toLowerCase().includes(search.toLowerCase())||
    (a.country||"").toLowerCase().includes(search.toLowerCase())
  );
  return (
    <MstrShell title="Airlines & Consolidators" icon="✈" badge={`${airlines.length} airlines`}
      actions={[
        <input key="s" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search airline, IATA..." style={{...inp,width:210,minHeight:32,fontSize:11}}/>,
        <ExportBtn key="x" name="airlines" rows={filtered} columns={[{key:"iata",label:"IATA"},{key:"name",label:"Airline Name"},{key:"country",label:"Country"},{key:"type",label:"Type"},{key:"hub",label:"Hub"},{key:"bsp",label:"BSP"},{key:"alliance",label:"Alliance"},{key:"gds",label:"GDS"},{key:"commPct",label:"Comm %"}]}/>,
        <button key="a" onClick={openNew} style={{...btnG,fontSize:11}}>
          <Plus size={13}/> New Airline
        </button>
      ]}>
      <div style={{...card,padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#1a1c22"}}>
            {["IATA","Airline Name","Country","Type","Hub","BSP","Alliance","GDS","Comm %",""].map((h,i)=>(
              <th key={i} style={{padding:"9px 10px",textAlign:"left",
                color:"#c2a04a",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((a,i)=>(
            <tr key={a.id} style={{borderBottom:"1px solid #dfe2e7",
              background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 10px",fontFamily:"monospace",fontWeight:800,
                color:"#2563eb",fontSize:13}}>{a.iata}</td>
              <td style={{padding:"8px 10px",fontWeight:600,color:"#1a1c22"}}>{a.name}</td>
              <td style={{padding:"8px 10px",color:"#5b616e",fontSize:11}}>{a.country}</td>
              <td style={{padding:"8px 10px"}}>
                <span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,
                  background:a.type==="Low Cost"?"#fbeedb":"#e8f0ff",
                  color:a.type==="Low Cost"?"#d97706":"#2563eb"}}>{a.type}</span>
              </td>
              <td style={{padding:"8px 10px",fontFamily:"monospace",fontWeight:600,color:"#2e323c"}}>{a.hub}</td>
              <td style={{padding:"8px 10px",textAlign:"center"}}>
                <span style={{fontSize:10,fontWeight:700,color:a.bsp?"#16a34a":"#cbd0db"}}>{a.bsp?"✔ BSP":"—"}</span>
              </td>
              <td style={{padding:"8px 10px",fontSize:10.5,color:"#5b616e"}}>{a.alliance||"—"}</td>
              <td style={{padding:"8px 10px",fontSize:10,fontFamily:"monospace",color:"#5b616e"}}>{a.gds||"—"}</td>
              <td style={{padding:"8px 10px",textAlign:"center",fontWeight:700,
                color:a.commPct>0?"#16a34a":"#cbd0db"}}>{a.commPct>0?`${a.commPct}%`:"—"}</td>
              <td style={{padding:"8px 10px"}}>
                <button onClick={()=>openEdit(a)} style={{...btnGh,padding:"3px 8px",fontSize:10}}>Edit</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {modal&&<MstrModal title={editId?"Edit Airline":"New Airline"} onClose={()=>setModal(false)} onSave={saveAirline} saving={create.isPending||update.isPending}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:10}}>
            <FL label="IATA code"><input value={form.iata} onChange={e=>setF({iata:e.target.value.toUpperCase()})} style={inp} placeholder="AI"/></FL>
            <FL label="Airline name"><input value={form.name} onChange={e=>setF({name:e.target.value})} style={inp}/></FL>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
            <FL label="Country"><input value={form.country} onChange={e=>setF({country:e.target.value})} style={inp}/></FL>
            <FL label="Hub airport"><input value={form.hub} onChange={e=>setF({hub:e.target.value.toUpperCase()})} style={inp} placeholder="DEL"/></FL>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
            <FL label="Type"><select value={form.type} onChange={e=>setF({type:e.target.value})} style={inp}><option>Full Service</option><option>Low Cost</option><option>Regional</option></select></FL>
            <FL label="Alliance"><select value={form.alliance} onChange={e=>setF({alliance:e.target.value})} style={inp}><option>None</option><option>Star Alliance</option><option>Oneworld</option><option>SkyTeam</option></select></FL>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
            <FL label="BSP participant?"><select value={form.bsp} onChange={e=>setF({bsp:e.target.value})} style={inp}><option>Yes</option><option>No</option></select></FL>
            <FL label="Commission %"><input type="number" value={form.commPct} onChange={e=>setF({commPct:e.target.value})} style={inp} placeholder="0"/></FL>
          </div>
        </div>
      </MstrModal>}
    </MstrShell>
  );
}
