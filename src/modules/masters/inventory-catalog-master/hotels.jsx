/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Hotels & DMCs
   ════════════════════════════════════════════════════════════════════
   Moved out of legacy.jsx (strangler-fig masters reorg — grouped under
   inventory-catalog-master/). Logic unchanged.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { ACTIVE_CURRENCIES } from '../../../core/data';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { useModalEsc } from '../../../core/ux/useModalEsc';
import { FL, btnG, btnGh, card, inp } from '../../../core/styles';
import { MstrShell, MstrModal } from '../components/mstr';
import { ExportBtn } from '../shared/exportBtn';

const HOTEL_BLANK={name:"",city:"",chain:"",stars:"5",tariff:"",gstSlab:"18",contract:"No"};
const DMC_BLANK={name:"",country:"",speciality:"",currency:"INR",commPct:"",contract:"No"};

export function MastersHotels(){
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [tab,setTab]=useState("hotels");
  const [search,setSearch]=useState("");
  // Live hotel & DMC master — ONE /api/hotels collection, split by `kind` into the
  // two tabs. Create/Edit persist via the mutations (editId null = New).
  const [form,setForm]=useState(HOTEL_BLANK);
  const [editId,setEditId]=useState(null);
  const setF=(p)=>setForm(f=>({...f,...p}));
  const {data:rows=[]}=useMasterList('hotels');
  const {create,update}=useMasterMutations('hotels');
  const hotels=rows.filter(r=>r.kind!=="DMC");
  const dmcs=rows.filter(r=>r.kind==="DMC");
  const openNew=()=>{setForm(tab==="hotels"?HOTEL_BLANK:DMC_BLANK);setEditId(null);setModal(true);};
  const openEdit=(r)=>{
    setForm(tab==="hotels"
      ?{name:r.name||"",city:r.city||"",chain:r.chain||"",stars:String(r.stars||5),tariff:r.tariff??"",gstSlab:String(r.gstSlab??18),contract:r.contract?"Yes":"No"}
      :{name:r.name||"",country:r.country||"",speciality:r.speciality||"",currency:r.currency||"INR",commPct:r.commPct??"",contract:r.contract?"Yes":"No"});
    setEditId(r.id);setModal(true);
  };
  const saveRow=()=>{
    if(!(form.name||"").trim())return;
    const body=tab==="hotels"
      ?{kind:"Hotel",name:form.name.trim(),city:form.city.trim(),chain:form.chain.trim(),stars:+form.stars||0,tariff:+form.tariff||0,gstSlab:+form.gstSlab||0,contract:form.contract==="Yes"}
      :{kind:"DMC",name:form.name.trim(),country:form.country.trim(),speciality:form.speciality.trim(),currency:form.currency,commPct:+form.commPct||0,contract:form.contract==="Yes"};
    const done={onSuccess:()=>{setModal(false);setEditId(null);setForm(tab==="hotels"?HOTEL_BLANK:DMC_BLANK);}};
    editId?update.mutate({id:editId,body},done):create.mutate(body,done);
  };
  const filt_h=hotels.filter(h=>!search||(h.name||"").toLowerCase().includes(search.toLowerCase())||(h.city||"").toLowerCase().includes(search.toLowerCase()));
  const filt_d=dmcs.filter(d=>!search||(d.name||"").toLowerCase().includes(search.toLowerCase())||(d.country||"").toLowerCase().includes(search.toLowerCase()));
  const gstColor={0:"#cbd0db",12:"#d97706",16:"#2563eb",18:"#dc2626"};
  const gstBg   ={0:"#f3f4f8",12:"#fbeedb",16:"#e8f0ff",18:"#fbe9e9"};
  return (
    <MstrShell title="Hotels & DMCs" icon="🏨"
      actions={[
        <div key="tabs" style={{display:"flex",borderRadius:8,overflow:"hidden",border:"1px solid #cdd1d8"}}>
          {["hotels","dmcs"].map(t=><button key={t} onClick={()=>setTab(t)}
            style={{padding:"6px 14px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab===t?700:400,
              background:tab===t?"#1a1c22":"#fff",color:tab===t?"#c2a04a":"#5b616e"}}>
            {t==="hotels"?`Hotels (${hotels.length})`:`DMCs (${dmcs.length})`}
          </button>)}
        </div>,
        <input key="s" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search..." style={{...inp,width:180,minHeight:32,fontSize:11}}/>,
        tab==="hotels"
          ? <ExportBtn key="x" name="hotels" rows={filt_h} columns={[{key:"name",label:"Hotel Name"},{key:"city",label:"City"},{key:"stars",label:"Stars"},{key:"gstSlab",label:"GST Slab %"},{key:"tariff",label:"Rack Rate"},{key:"chain",label:"Chain"},{key:"contract",label:"Contract"}]}/>
          : <ExportBtn key="x" name="dmcs" rows={filt_d} columns={[{key:"name",label:"DMC Name"},{key:"country",label:"Country"},{key:"speciality",label:"Speciality"},{key:"currency",label:"Currency"},{key:"commPct",label:"Commission %"},{key:"contract",label:"Contract"}]}/>,
        <button key="a" onClick={openNew} style={{...btnG,fontSize:11}}>
          <Plus size={13}/> {tab==="hotels"?"New Hotel":"New DMC"}
        </button>
      ]}>
      {tab==="hotels"?(
        <div style={{...card,padding:0,overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#1a1c22"}}>
              {["Hotel Name","City","Stars","GST Slab","Rack Rate","Chain","Contract",""].map((h,i)=>(
                <th key={i} style={{padding:"9px 12px",textAlign:i>=2?"center":"left",
                  color:"#c2a04a",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filt_h.map((h,i)=>(
              <tr key={h.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",fontWeight:600,color:"#1a1c22"}}>{h.name}</td>
                <td style={{padding:"8px 12px",color:"#5b616e"}}>{h.city}</td>
                <td style={{padding:"8px 12px",textAlign:"center",color:"#c2a04a",fontSize:13}}>
                  {"★".repeat(h.stars)}
                </td>
                <td style={{padding:"8px 12px",textAlign:"center"}}>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,
                    background:gstBg[h.gstSlab]||"#f3f4f8",color:gstColor[h.gstSlab]||"#5b616e"}}>
                    {h.gstSlab}%
                  </span>
                </td>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:600,
                  fontVariantNumeric:"tabular-nums"}}>
                  {h.tariff>1000?`₹${(h.tariff/1000).toFixed(1)}K`:`₹${h.tariff}`}
                </td>
                <td style={{padding:"8px 12px",color:"#5b616e",fontSize:11}}>{h.chain}</td>
                <td style={{padding:"8px 12px",textAlign:"center"}}>
                  <span style={{fontSize:10,fontWeight:700,color:h.contract?"#16a34a":"#cbd0db"}}>
                    {h.contract?"✔ Yes":"—"}
                  </span>
                </td>
                <td style={{padding:"8px 12px"}}>
                  <button onClick={()=>openEdit(h)} style={{...btnGh,padding:"3px 8px",fontSize:10}}>Edit</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ):(
        <div style={{...card,padding:0,overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#1a1c22"}}>
              {["DMC Name","Country","Speciality","Currency","Commission","Contract",""].map((h,i)=>(
                <th key={i} style={{padding:"9px 12px",textAlign:i>=3?"center":"left",
                  color:"#c2a04a",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filt_d.map((d,i)=>(
              <tr key={d.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",fontWeight:600,color:"#1a1c22"}}>{d.name}</td>
                <td style={{padding:"8px 12px",color:"#5b616e"}}>{d.country}</td>
                <td style={{padding:"8px 12px"}}>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:700,
                    background:"#e8f0ff",color:"#2563eb"}}>{d.speciality}</span>
                </td>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:"#2e323c"}}>{d.currency}</td>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:"#16a34a"}}>{d.commPct}%</td>
                <td style={{padding:"8px 12px",textAlign:"center"}}>
                  <span style={{fontSize:10,fontWeight:700,color:d.contract?"#16a34a":"#cbd0db"}}>
                    {d.contract?"✔ Yes":"—"}
                  </span>
                </td>
                <td style={{padding:"8px 12px"}}>
                  <button onClick={()=>openEdit(d)} style={{...btnGh,padding:"3px 8px",fontSize:10}}>Edit</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {modal&&<MstrModal title={tab==="hotels"?(editId?"Edit Hotel":"New Hotel"):(editId?"Edit DMC":"New DMC")} onClose={()=>setModal(false)} onSave={saveRow} saving={create.isPending||update.isPending}>
        {tab==="hotels"?(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <FL label="Hotel name"><input value={form.name} onChange={e=>setF({name:e.target.value})} style={inp}/></FL>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
              <FL label="City"><input value={form.city} onChange={e=>setF({city:e.target.value})} style={inp}/></FL>
              <FL label="Chain/Brand"><input value={form.chain} onChange={e=>setF({chain:e.target.value})} style={inp}/></FL>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
              <FL label="Star rating"><select value={form.stars} onChange={e=>setF({stars:e.target.value})} style={inp}><option>5</option><option>4</option><option>3</option><option>2</option></select></FL>
              <FL label="Rack rate (per night)"><input type="number" value={form.tariff} onChange={e=>setF({tariff:e.target.value})} style={inp}/></FL>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
              <FL label="GST slab"><select value={form.gstSlab} onChange={e=>setF({gstSlab:e.target.value})} style={inp}><option value="18">18% (above ₹7,500/night)</option><option value="12">12% (₹1,000–₹7,500)</option><option value="0">0% (below ₹1,000)</option></select></FL>
              <FL label="Contracted rate?"><select value={form.contract} onChange={e=>setF({contract:e.target.value})} style={inp}><option>No</option><option>Yes</option></select></FL>
            </div>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <FL label="DMC name"><input value={form.name} onChange={e=>setF({name:e.target.value})} style={inp}/></FL>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
              <FL label="Country"><input value={form.country} onChange={e=>setF({country:e.target.value})} style={inp}/></FL>
              <FL label="Speciality"><input value={form.speciality} onChange={e=>setF({speciality:e.target.value})} style={inp}/></FL>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
              <FL label="Settlement currency"><select value={form.currency} onChange={e=>setF({currency:e.target.value})} style={inp}>{ACTIVE_CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></FL>
              <FL label="Commission %"><input type="number" value={form.commPct} onChange={e=>setF({commPct:e.target.value})} style={inp} placeholder="10"/></FL>
            </div>
            <FL label="Contracted rate?"><select value={form.contract} onChange={e=>setF({contract:e.target.value})} style={inp}><option>No</option><option>Yes</option></select></FL>
          </div>
        )}
      </MstrModal>}
    </MstrShell>
  );
}
