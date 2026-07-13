/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Vendor Credit Terms
   ════════════════════════════════════════════════════════════════════
   Moved out of legacy.jsx (strangler-fig masters reorg — grouped under
   supplier-master/). LIVE (2026-07-11): bulk credit-terms grid over the
   SUPPLIER MASTER — the fields (creditDays / creditLimit / settlementCycle /
   paymentMethod) live on erpsuppliers, so this edits them in place via
   PUT /api/suppliers/:id. Field-access rules may 403 a restricted column for
   some roles — surfaced as toasts. Logic unchanged.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { toast } from '../../../core/ux/toast';
import { localeOf } from '../../../core/format';
import { SETTLE_CYCLES, PAY_METHODS } from '../../../core/partyEnums';
import { bc, btnG, card, inp } from '../../../core/styles';
import { ExportBtn } from '../shared/exportBtn';

export function VendorTermsMaster({branch}){
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brc=branch==="ALL"?"":(branch?.code||"");
  const { data: suppliers = [] } = useMasterList('suppliers');
  const { update } = useMasterMutations('suppliers');
  const [search,setSearch]=useState("");
  const [draft,setDraft]=useState({}); // id → {creditDays,creditLimit,settlementCycle,paymentMethod}
  const rows=(suppliers||[])
    .filter(s=>!s.derived&&s.active!==false)
    .filter(s=>!brc||!s.branch||s.branch==="ALL"||s.branch===brc)
    .filter(s=>!search||String(s.name||"").toLowerCase().includes(search.toLowerCase()));
  const valOf=(s,k)=>draft[s.id]?.[k]!==undefined?draft[s.id][k]:(s[k]??"");
  const setVal=(s,k,v)=>setDraft(d=>({...d,[s.id]:{...(d[s.id]||{}),[k]:v}}));
  const dirty=(s)=>!!draft[s.id]&&Object.entries(draft[s.id]).some(([k,v])=>String(v)!==String(s[k]??""));
  const saveRow=(s)=>{
    const patch={};
    for(const k of ["creditDays","creditLimit","settlementCycle","paymentMethod"]){
      const v=valOf(s,k);
      patch[k]=k==="creditDays"||k==="creditLimit"?(Number(v)||0):v;
    }
    update.mutate({id:s.id,body:patch},{
      onSuccess:()=>{toast(`${s.name} — credit terms saved`);setDraft(d=>{const n={...d};delete n[s.id];return n;});},
      onError:(e)=>toast(e?.message||"Save failed (field access?)","error"),
    });
  };
  const f=n=>cur+Number(Math.round(n)||0).toLocaleString(localeOf(cur));
  const inpS={padding:"5px 8px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:11,width:"100%"};
  return (
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#fbeedb",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>⏰</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>Vendor Credit Terms</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>{rows.length} suppliers · edits save to the supplier master (single source of truth)</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search supplier…" style={{...inp,width:200,minHeight:32,fontSize:11}}/>
          <ExportBtn name="vendor-credit-terms" rows={rows.map(s=>({supplier:s.name,branch:s.branch||"ALL",creditDays:s.creditDays??"",creditLimit:s.creditLimit??"",settlementCycle:s.settlementCycle||"",paymentMethod:s.paymentMethod||""}))} columns={[{key:"supplier",label:"Supplier"},{key:"branch",label:"Branch"},{key:"creditDays",label:"Credit Days"},{key:"creditLimit",label:"Credit Limit"},{key:"settlementCycle",label:"Settlement Cycle"},{key:"paymentMethod",label:"Payment Method"}]}/>
        </div>
      </div>
      <div style={{...card,padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#1a1c22"}}>
            {["Supplier","Branch","Credit Days","Credit Limit","Settlement Cycle","Payment Method",""].map((h,i)=>(
              <th key={i} style={{padding:"9px 11px",textAlign:"left",color:"#c2a04a",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{rows.map((s,i)=>(
            <tr key={s.id} style={{borderBottom:"1px solid #dfe2e7",background:dirty(s)?"#fffaf0":i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 11px",fontWeight:600,color:"#1a1c22"}}>{s.name}<div style={{fontSize:9.5,color:"#5b616e",fontWeight:400}}>{s.category||""}</div></td>
              <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#e8f0ff",color:"#2563eb",fontWeight:700}}>{s.branch||"ALL"}</span></td>
              <td style={{padding:"6px 11px",width:100}}><input type="number" value={valOf(s,"creditDays")} onChange={e=>setVal(s,"creditDays",e.target.value)} style={{...inpS,textAlign:"right",fontFamily:"monospace"}}/></td>
              <td style={{padding:"6px 11px",width:130}}><input type="number" value={valOf(s,"creditLimit")} onChange={e=>setVal(s,"creditLimit",e.target.value)} title={f(valOf(s,"creditLimit"))} style={{...inpS,textAlign:"right",fontFamily:"monospace"}}/></td>
              <td style={{padding:"6px 11px",width:150}}><select value={valOf(s,"settlementCycle")} onChange={e=>setVal(s,"settlementCycle",e.target.value)} style={inpS}><option value="">—</option>{SETTLE_CYCLES.filter(Boolean).map(x=><option key={x} value={x}>{x}</option>)}</select></td>
              <td style={{padding:"6px 11px",width:140}}><select value={valOf(s,"paymentMethod")} onChange={e=>setVal(s,"paymentMethod",e.target.value)} style={inpS}><option value="">—</option>{PAY_METHODS.filter(Boolean).map(x=><option key={x} value={x}>{x}</option>)}</select></td>
              <td style={{padding:"6px 11px",width:80}}>
                {dirty(s)&&<button onClick={()=>saveRow(s)} disabled={update.isPending} style={{...btnG,padding:"3px 10px",fontSize:10}}>{update.isPending?"…":"Save"}</button>}
              </td>
            </tr>
          ))}
          {rows.length===0&&<tr><td colSpan={7} style={{padding:20,textAlign:"center",color:"#5b616e",fontSize:11.5}}>No suppliers{search?" match the search":" in the master yet — add them under Masters ▸ Suppliers"}.</td></tr>}
          </tbody>
        </table>
      </div>
      <p style={{marginTop:10,fontSize:10.5,color:"#5b616e",fontStyle:"italic"}}>💡 These fields live on the supplier master itself — the Task List, ageing and payment screens all read the same values. Bill-wise DUES live in Payables Ageing, not here.</p>
    </div>
  );
}
