/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Passport & Document Manager
   ════════════════════════════════════════════════════════════════════
   Moved out of legacy.jsx (strangler-fig masters reorg — grouped under
   utilities/). Live register from /api/passports. Logic unchanged.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { todayISO } from '../../../core/dates';
import { confirmDialog } from '../../../core/ux/confirm';
import { BRANCH_CODES } from '../../../core/data';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { useMobile } from '../../../core/hooks';
import { card, inp, btnG, btnGh, FL } from '../../../core/styles';
import { ExportBtn } from '../shared/exportBtn';

export function PassportManager({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:branch?.code;
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({client:"",person:"",passport:"",nationality:"Indian",issued:"",expiry:"",branch:"BOM"});
  // Live register from /api/passports (was a local-state _PASSPORTS array, so records
  // saved here never reached the DB and the Tower's passports milestone never cleared).
  const { data: passports = [] } = useMasterList('passports');
  const { create } = useMasterMutations('passports');
  const TODAY=todayISO();

  const filtered=passports.filter(p=>(
    (!brCode||p.branch===brCode)&&
    (!search||(p.person||"").toLowerCase().includes(search.toLowerCase())||(p.client||"").toLowerCase().includes(search.toLowerCase())||(p.passport||"").includes(search))
  ));

  const daysToExpiry=d=>Math.ceil((new Date(d)-new Date(TODAY))/(1000*60*60*24));
  const expStatus=d=>{const dl=daysToExpiry(d);return dl<0?"Expired":dl<90?"Expiring Soon":dl<180?"Expiring in 6mo":"Valid";};
  const STATUS_CLR={"Valid":"#16a34a","Expiring in 6mo":"#3fb7a3","Expiring Soon":"#d97706","Expired":"#dc2626","Visa Expiring":"#d97706"};
  const STATUS_BG={"Valid":"#e8f6ed","Expiring in 6mo":"#e8f6ed","Expiring Soon":"#fbeedb","Expired":"#fbe9e9","Visa Expiring":"#fbeedb"};

  const expiringSoon=filtered.filter(p=>daysToExpiry(p.expiry)<180&&daysToExpiry(p.expiry)>0);

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#e8f6ed",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🛂</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>Passport & Document Manager</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>Client passports · Visa stamps · Expiry alerts</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name / passport / client..." style={{...inp,width:220,minHeight:32,fontSize:11}}/>
          <ExportBtn name="passports" rows={filtered} columns={[{key:"person",label:"Person"},{key:"client",label:"Client"},{key:"passport",label:"Passport No."},{key:"nationality",label:"Nationality"},{key:"issued",label:"Issued"},{key:"expiry",label:"Expiry"},{key:"visas",label:"Visas in Passport"},{key:"branch",label:"Branch"}]}/>
          <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Add Passport</button>
        </div>
      </div>

      {expiringSoon.length>0&&(
        <div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#fbeedb",border:"1px solid #f3d9a8",fontSize:10.5,color:"#d97706",fontWeight:600,display:"flex",gap:8,alignItems:"center"}}>
          <AlertTriangle size={15}/>
          {expiringSoon.length} passport{expiringSoon.length>1?"s":""} expiring within 6 months:
          {expiringSoon.map(p=><span key={p.id} style={{marginLeft:6,padding:"1px 7px",borderRadius:999,background:"#d97706",color:"#fff",fontSize:9.5}}>{p.person} ({daysToExpiry(p.expiry)}d)</span>)}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,150px),1fr))",gap:10,marginBottom:14}}>
        {[{l:"Total Passports",v:String(filtered.length),c:"#2e323c",bg:"#f3f4f8"},
          {l:"Valid",v:String(filtered.filter(p=>daysToExpiry(p.expiry)>=180).length),c:"#16a34a",bg:"#e8f6ed"},
          {l:"Expiring <6mo",v:String(filtered.filter(p=>daysToExpiry(p.expiry)<180&&daysToExpiry(p.expiry)>0).length),c:"#d97706",bg:"#fbeedb"},
          {l:"Expired",v:String(filtered.filter(p=>daysToExpiry(p.expiry)<=0).length),c:"#dc2626",bg:"#fbe9e9"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:"#1a1c22"}}>{k.v}</p>
          </div>
        ))}
      </div>

      <div style={{...card,padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#1a1c22"}}>
            {["Person","Client","Passport No.","Nationality","Issued","Expiry","Days Left","Visas in Passport","Branch","Status"].map((h,i)=>(
              <th key={i} style={{padding:"9px 11px",textAlign:"left",color:"#c2a04a",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((p,i)=>{
            const dl=daysToExpiry(p.expiry);
            const st=expStatus(p.expiry);
            return (
              <tr key={p.id} style={{borderBottom:"1px solid #dfe2e7",background:dl<0?"#fff5f5":dl<90?"#fffaf0":i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 11px",fontWeight:600,color:"#1a1c22"}}>{p.person}</td>
                <td style={{padding:"8px 11px",color:"#2e323c"}}>{p.client}</td>
                <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:10,color:"#2563eb",fontWeight:700}}>{p.passport}</td>
                <td style={{padding:"8px 11px",color:"#5b616e"}}>{p.nationality}</td>
                <td style={{padding:"8px 11px",color:"#5b616e",whiteSpace:"nowrap"}}>{p.issued}</td>
                <td style={{padding:"8px 11px",color:dl<90?"#dc2626":dl<180?"#d97706":"#5b616e",fontWeight:dl<180?700:400,whiteSpace:"nowrap"}}>{p.expiry}</td>
                <td style={{padding:"8px 11px",fontWeight:700,color:dl<0?"#dc2626":dl<90?"#d97706":"#16a34a"}}>{dl<0?`${Math.abs(dl)}d EXPIRED`:`${dl}d`}</td>
                <td style={{padding:"8px 11px",fontSize:10,color:"#5b616e",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis"}}>{(p.visas||[]).length>0?p.visas.join(" · "):"None"}</td>
                <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 6px",borderRadius:999,background:"#e8f0ff",color:"#2563eb",fontWeight:700}}>{p.branch}</span></td>
                <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[st]||"#f3f4f8",color:STATUS_CLR[st]||"#5b616e"}}>{st}</span></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22"}}>Add Passport Record</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5b616e"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
                <FL label="Person name"><input value={form.person} onChange={e=>setForm(f=>({...f,person:e.target.value}))} style={inp}/></FL>
                <FL label="Client account"><input value={form.client} onChange={e=>setForm(f=>({...f,client:e.target.value}))} style={inp}/></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
                <FL label="Passport number"><input value={form.passport} onChange={e=>setForm(f=>({...f,passport:e.target.value}))} style={{...inp,fontFamily:"monospace",textTransform:"uppercase"}}/></FL>
                <FL label="Nationality"><input value={form.nationality} onChange={e=>setForm(f=>({...f,nationality:e.target.value}))} style={inp}/></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
                <FL label="Issue date"><input type="date" value={form.issued} onChange={e=>setForm(f=>({...f,issued:e.target.value}))} style={inp}/></FL>
                <FL label="Expiry date"><input type="date" value={form.expiry} onChange={e=>setForm(f=>({...f,expiry:e.target.value}))} style={inp}/></FL>
              </div>
              <FL label="Branch"><select value={form.branch} onChange={e=>setForm(f=>({...f,branch:e.target.value}))} style={inp}>{BRANCH_CODES.map(b=><option key={b}>{b}</option>)}</select></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={async()=>{
                if(create.isPending) return; // ignore double-clicks while the POST is in flight
                if(!form.person.trim()||!form.passport.trim()){
                  await confirmDialog({title:"Missing details",message:"Person name and passport number are required.",confirmLabel:"OK",cancelLabel:"Close"});
                  return;
                }
                create.mutate({...form,passport:form.passport.toUpperCase(),visas:[]},{
                  onSuccess:()=>{setModal(false);setForm({client:"",person:"",passport:"",nationality:"Indian",issued:"",expiry:"",branch:"BOM"});},
                  onError:(e)=>confirmDialog({title:"Save failed",message:`Could not save the passport — ${e?.message||'unknown error'}.`,confirmLabel:"OK",cancelLabel:"Close"}),
                });
              }} style={btnG}>💾 Save Passport</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
