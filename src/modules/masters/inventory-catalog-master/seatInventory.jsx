import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useMobile } from '../../../core/hooks';
import { todayISO } from '../../../core/dates';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { FL, btnG, btnGh, card, inp } from '../../../core/styleTokens';
import { HExportBtn } from '../shared/hExportBtn';
import { isViewOnly, VIEW_ONLY_REASON } from '../../../shell/primitives';

const SEAT_BLOCK_BLANK=()=>({flight:"",airline:"",route:"",date:todayISO(),dep:"",aircraft:"",status:"Open",classConfig:[{cls:"Economy",total:"",held:"",sold:""}]});

export function SeatInventory({branch}){
  const mob=useMobile();
  const [search,setSearch]=useState("");
  const [date,setDate]=useState(todayISO());
  /* Live seat-block master (/api/seat-blocks). available is DERIVED per cabin
     (total − held − sold, floored at 0) — never stored. editId null = new block. */
  const {data:blocks=[]}=useMasterList('seat-blocks');
  const {create,update}=useMasterMutations('seat-blocks');
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState(SEAT_BLOCK_BLANK());
  const vo=isViewOnly();
  const setF=(p)=>setForm(f=>({...f,...p}));
  const setCls=(i,key,val)=>setForm(f=>({...f,classConfig:f.classConfig.map((c,idx)=>idx===i?{...c,[key]:val}:c)}));
  const addCls=()=>setForm(f=>({...f,classConfig:[...f.classConfig,{cls:"Business",total:"",held:"",sold:""}]}));
  const delCls=(i)=>setForm(f=>({...f,classConfig:f.classConfig.length>1?f.classConfig.filter((_,idx)=>idx!==i):f.classConfig}));
  const openNew=()=>{setForm(SEAT_BLOCK_BLANK());setEditId(null);setModal(true);};
  const openEdit=(s)=>{setForm({flight:s.flight||"",airline:s.airline||"",route:s.route||"",date:s.date||todayISO(),dep:s.dep||"",aircraft:s.aircraft||"",status:s.status||"Open",classConfig:(s.classConfig||[]).length?s.classConfig.map(c=>({cls:c.cls||"",total:c.total??"",held:c.held??"",sold:c.sold??""})):[{cls:"Economy",total:"",held:"",sold:""}]});setEditId(s.id);setModal(true);};
  const saveBlock=()=>{
    if(!(form.flight||"").trim())return;
    const body={flight:form.flight.trim().toUpperCase(),airline:form.airline.trim(),route:form.route.trim().toUpperCase(),date:form.date,dep:form.dep.trim(),aircraft:form.aircraft.trim(),status:form.status,
      classConfig:form.classConfig.filter(c=>(c.cls||"").trim()).map(c=>({cls:c.cls.trim(),total:+c.total||0,held:+c.held||0,sold:+c.sold||0}))};
    const done={onSuccess:()=>{setModal(false);setEditId(null);setForm(SEAT_BLOCK_BLANK());}};
    editId?update.mutate({id:editId,body},done):create.mutate(body,done);
  };
  /* Release every held seat on a flight — a real write, not a stub button. */
  const releaseHeld=(s)=>update.mutate({id:s.id,body:{classConfig:(s.classConfig||[]).map(({avail,...c})=>({...c,held:0}))}});
  const SEATS=blocks.map(s=>({...s,classConfig:(s.classConfig||[]).map(c=>({...c,avail:Math.max(0,(+c.total||0)-(+c.held||0)-(+c.sold||0))}))}));
  const filtered=SEATS.filter(s=>!search||((s.flight||"")+(s.route||"")).toLowerCase().includes(search.toLowerCase()));
  // Flatten the per-flight class config into one row per flight × cabin class for export.
  const seatRows=filtered.flatMap(s=>s.classConfig.map(c=>({flight:s.flight,route:s.route,date:s.date,dep:s.dep,aircraft:s.aircraft,status:s.status,cls:c.cls,total:c.total,sold:c.sold,held:c.held,avail:c.avail})));
  const STATUS_CLR={"Near Full":"#A32D2D",Open:"#27500A",Closed:"#5a6691"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>💺</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Seat Inventory</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Seats held by Travkings · Monitor allocation vs availability</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Flight / route..." style={{...inp,width:160,minHeight:32,fontSize:11}}/>
          <HExportBtn name="seat-inventory" rows={seatRows} columns={[{key:"flight",label:"Flight"},{key:"route",label:"Route"},{key:"date",label:"Date"},{key:"dep",label:"Departure"},{key:"aircraft",label:"Aircraft"},{key:"status",label:"Status"},{key:"cls",label:"Class"},{key:"total",label:"Total Seats"},{key:"sold",label:"Sold"},{key:"held",label:"Held"},{key:"avail",label:"Available"}]}/>
          <button onClick={openNew} style={{...btnG,fontSize:11}}><Plus size={13}/> Reserve Seats</button>
        </div>
      </div>

      {filtered.map(s=>(
        <div key={s.id} style={{...card,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{width:42,height:42,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>✈</div>
              <div>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
                  <span style={{fontWeight:800,fontSize:14,color:"#0d1326"}}>{s.flight}</span>
                  <span style={{fontSize:10.5,color:"#5a6691"}}>{s.route}</span>
                  <span style={{fontSize:9,padding:"1px 6px",borderRadius:999,fontWeight:700,background:(STATUS_CLR[s.status]||"#384677")+"22",color:STATUS_CLR[s.status]||"#384677"}}>{s.status}</span>
                </div>
                <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{s.date} · Dep {s.dep} · {s.aircraft}</p>
              </div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>openEdit(s)} style={{...btnG,fontSize:10,padding:"4px 12px"}}>✎ Edit / Reserve</button>
              <button onClick={()=>releaseHeld(s)} disabled={update.isPending||vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...btnGh,fontSize:10,padding:"4px 10px",...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>Release Held</button>
            </div>
          </div>
          {/* Class config */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {s.classConfig.map((cls,ci)=>{
              const soldPct=cls.total>0?Math.round(cls.sold/cls.total*100):0;
              const heldPct=cls.total>0?Math.round(cls.held/cls.total*100):0;
              return(
                <div key={cls.cls} style={{flex:1,minWidth:160,padding:"10px 12px",borderRadius:9,border:"1px solid #cdd1d8",background:"#fafafa"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontWeight:700,fontSize:11,color:"#0d1326"}}>{cls.cls}</span>
                    <span style={{fontSize:10.5,fontWeight:600,color:cls.avail===0?"#A32D2D":cls.avail<=10?"#854F0B":"#27500A"}}>{cls.avail} avail</span>
                  </div>
                  {/* Visual bar */}
                  <div style={{height:10,borderRadius:5,background:"#e1e3ec",overflow:"hidden",marginBottom:6,display:"flex"}}>
                    <div style={{width:`${soldPct}%`,background:"#185FA5",borderRadius:"5px 0 0 5px"}}/>
                    <div style={{width:`${heldPct}%`,background:"#d4a437"}}/>
                    <div style={{flex:1,background:"#EAF3DE"}}/>
                  </div>
                  <div style={{display:"flex",gap:8,fontSize:9.5}}>
                    <span style={{color:"#185FA5"}}>■ Sold: {cls.sold}</span>
                    <span style={{color:"#d4a437"}}>■ Held: {cls.held}</span>
                    <span style={{color:"#27500A"}}>■ Free: {cls.avail}</span>
                  </div>
                  <p style={{margin:"4px 0 0",fontSize:8.5,color:"#5a6691"}}>Total: {cls.total} · Load {soldPct+heldPct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>{editId?"Edit Seat Block":"Reserve Seats"}</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Flight No"><input value={form.flight} onChange={e=>setF({flight:e.target.value.toUpperCase()})} style={inp} placeholder="AI-144"/></FL>
                <FL label="Airline"><input value={form.airline} onChange={e=>setF({airline:e.target.value})} style={inp} placeholder="Air India"/></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Sector / Route"><input value={form.route} onChange={e=>setF({route:e.target.value.toUpperCase()})} style={inp} placeholder="BOM-DXB"/></FL>
                <FL label="Travel date"><input type="date" value={form.date} onChange={e=>setF({date:e.target.value})} style={inp}/></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <FL label="Departure"><input value={form.dep} onChange={e=>setF({dep:e.target.value})} style={inp} placeholder="14:20"/></FL>
                <FL label="Aircraft"><input value={form.aircraft} onChange={e=>setF({aircraft:e.target.value})} style={inp} placeholder="B787"/></FL>
                <FL label="Status"><select value={form.status} onChange={e=>setF({status:e.target.value})} style={inp}><option>Open</option><option>Near Full</option><option>Closed</option></select></FL>
              </div>
              <div>
                <p style={{margin:"0 0 6px",fontSize:10.5,fontWeight:700,color:"#5a6691"}}>Cabin blocks (available = blocked − held − sold)</p>
                {form.classConfig.map((c,i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr 1fr auto",gap:8,marginBottom:6,alignItems:"end"}}>
                    <FL label={i===0?"Class":""}><select value={c.cls} onChange={e=>setCls(i,"cls",e.target.value)} style={inp}><option>Economy</option><option>Premium Economy</option><option>Business</option><option>First</option></select></FL>
                    <FL label={i===0?"Blocked":""}><input type="number" min="0" value={c.total} onChange={e=>setCls(i,"total",e.target.value)} style={inp} placeholder="0"/></FL>
                    <FL label={i===0?"Held":""}><input type="number" min="0" value={c.held} onChange={e=>setCls(i,"held",e.target.value)} style={inp} placeholder="0"/></FL>
                    <FL label={i===0?"Sold":""}><input type="number" min="0" value={c.sold} onChange={e=>setCls(i,"sold",e.target.value)} style={inp} placeholder="0"/></FL>
                    <button onClick={()=>delCls(i)} title="Remove cabin" style={{background:"transparent",border:"none",cursor:"pointer",color:"#A32D2D",fontSize:13,paddingBottom:8}}>✕</button>
                  </div>
                ))}
                <button onClick={addCls} style={{...btnGh,fontSize:10,padding:"4px 10px"}}>+ Add cabin</button>
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={saveBlock} disabled={create.isPending||update.isPending||vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...btnG,...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>💾 {create.isPending||update.isPending?"Saving…":editId?"Save Block":"Reserve Seats"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
