/* ════════════════════════════════════════════════════════════════════
   CANCELLATION REGISTER  /sales/cancellation
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of transactions/legacy.jsx
   into its business sub-module folder — MENU_FINANCE ▸ BSP & Airline Memos
   ▸ "Sales Cancellations". transactions/index.js re-exports SalesCancellation
   from here so App.jsx's barrel import needed zero changes.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useModalEsc } from '../../../core/ux/useModalEsc';
import { bc, btnG, card } from '../../../core/styles';

/* ════════════════════════════════════════════════════════════════
   CANCELLATION WORKFLOW  /sales/cancellation
   ════════════════════════════════════════════════════════════════ */

export function SalesCancellation({branch}){
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [cancellations]=useState([]);
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);

  const totCancCharge=cancellations.reduce((s,c)=>s+c.cancCharge,0);
  const totRefund    =cancellations.reduce((s,c)=>s+c.refundToClient,0);

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#fbe9e9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>❌</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>Cancellation Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>Track cancellations, charges, and client refunds</p>
          </div>
        </div>
        <button onClick={()=>setModal(true)} style={{...btnG,background:"#dc2626",fontSize:11}}><Plus size={13}/> New Cancellation</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Total Cancellations",v:String(cancellations.length),  c:"#dc2626",bg:"#fbe9e9"},
          {l:"Cancellation Charges",v:cur+totCancCharge.toLocaleString(),c:"#16a34a",bg:"#e8f6ed"},
          {l:"Refunds to Clients",  v:cur+totRefund.toLocaleString(),    c:"#d97706",bg:"#fbeedb"},
          {l:"Pending Refunds",     v:String(cancellations.filter(c=>c.status==="Refund Pending").length),c:"#dc2626",bg:"#fbe9e9"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:"#1a1c22"}}>{k.v}</p>
          </div>
        ))}
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#1a1c22"}}>
            {["Ref","Date","Original Voucher","Client","Module","Orig Amt","Canc. Charge","Client Refund","Supplier Refund","Net Loss","Status"].map((h,i)=>(
              <th key={i} style={{padding:"9px 10px",textAlign:i>=5?"right":"left",color:"#c2a04a",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{cancellations.map((c,i)=>(
            <tr key={c.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:9.5,color:"#dc2626"}}>{c.id}</td>
              <td style={{padding:"8px 10px",fontSize:10,color:"#5b616e"}}>{c.date}</td>
              <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:9.5,color:"#d97706"}}>{c.origVno}</td>
              <td style={{padding:"8px 10px",fontWeight:600,color:"#1a1c22"}}>{c.client}</td>
              <td style={{padding:"8px 10px"}}><span style={{fontSize:9.5,padding:"2px 6px",borderRadius:999,background:"#e8f0ff",color:"#2563eb",fontWeight:700}}>{c.module}</span></td>
              <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{cur}{c.origAmt.toLocaleString()}</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:"#16a34a"}}>{cur}{c.cancCharge.toLocaleString()}</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#dc2626"}}>{cur}{c.refundToClient.toLocaleString()}</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#2563eb"}}>{cur}{c.supplierRefund.toLocaleString()}</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:c.netLoss>0?"#dc2626":"#16a34a"}}>{c.netLoss>0?`-${cur}${c.netLoss.toLocaleString()}`:"Nil"}</td>
              <td style={{padding:"8px 10px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:c.status==="Completed"?"#e8f6ed":c.status==="Refund Paid"?"#e8f6ed":"#fbeedb",color:c.status==="Completed"?"#16a34a":c.status==="Refund Paid"?"#3fb7a3":"#d97706"}}>{c.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
