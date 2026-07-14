/* ════════════════════════════════════════════════════════════════════
   REFUND TRACKING  /purchase/refunds
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of transactions/legacy.jsx
   into its business sub-module folder — MENU_FINANCE ▸ BSP & Airline Memos
   ▸ "Purchase Refunds". transactions/index.js re-exports PurchaseRefunds from
   here so App.jsx's barrel import needed zero changes.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { SampleBanner } from '../../../core/ux/SampleBanner';
import { bc, card } from '../../../core/styles';

/* ════════════════════════════════════════════════════════════════
   REFUND TRACKING  /purchase/refunds
   ════════════════════════════════════════════════════════════════ */

export function PurchaseRefunds({branch}){
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [refunds]=useState([
    {id:"REF-BOM-001",date:"2026-05-13",supplier:"BSP India",module:"Flight",origVno:"BOM/0826/PF00041",tickets:2,refundReq:51000,refundRec:48500,tds:0,status:"Received",notes:"Partial — airline penalty deducted"},
    {id:"REF-BOM-002",date:"2026-05-10",supplier:"Bali Tours DMC",module:"Holiday",origVno:"BOM/0826/PH00016",tickets:1,refundReq:128000,refundRec:0,tds:0,status:"Applied",notes:"Awaiting DMC confirmation"},
    {id:"REF-AMD-001",date:"2026-05-08",supplier:"VFS Global",module:"Visa",origVno:"AMD/0826/PV00003",tickets:2,refundReq:17800,refundRec:17800,tds:0,status:"Received",notes:"Full refund — visa rejected"},
  ]);
  const totReq=refunds.reduce((s,r)=>s+r.refundReq,0);
  const totRec=refunds.reduce((s,r)=>s+r.refundRec,0);
  const pending=refunds.filter(r=>r.status==="Applied").reduce((s,r)=>s+r.refundReq,0);

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <SampleBanner note="purchase refunds shown here are sample data, not live." />
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:36,height:36,borderRadius:9,background:"#e8f0ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>💫</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>Refund Tracking</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>Track airline, DMC, hotel refunds against purchase vouchers</p>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Total Requested",v:cur+totReq.toLocaleString(),c:"#2563eb",bg:"#e8f0ff"},
          {l:"Total Received",v:cur+totRec.toLocaleString(),c:"#16a34a",bg:"#e8f6ed"},
          {l:"Pending",v:cur+pending.toLocaleString(),c:"#dc2626",bg:"#fbe9e9"},
          {l:"Recovery %",v:`${totReq>0?Math.round(totRec/totReq*100):0}%`,c:"#d97706",bg:"#fbeedb"},
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
            {["Ref No.","Date","Supplier","Module","Original Voucher","Requested","Received","Pending","Status","Notes"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=5&&i<=7?"right":"left",color:"#c2a04a",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{refunds.map((r,i)=>(
            <tr key={r.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:10,color:"#2563eb"}}>{r.id}</td>
              <td style={{padding:"9px 12px",fontSize:10.5,color:"#5b616e"}}>{r.date}</td>
              <td style={{padding:"9px 12px",fontWeight:600,color:"#1a1c22"}}>{r.supplier}</td>
              <td style={{padding:"9px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:700,background:"#e8f0ff",color:"#2563eb"}}>{r.module}</span></td>
              <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:10,color:"#d97706"}}>{r.origVno}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{cur}{r.refundReq.toLocaleString()}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:r.refundRec>0?"#16a34a":"#cbd0db"}}>{r.refundRec>0?cur+r.refundRec.toLocaleString():"—"}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:r.refundReq-r.refundRec>0?"#dc2626":"#16a34a"}}>{r.refundReq-r.refundRec>0?cur+(r.refundReq-r.refundRec).toLocaleString():"Nil"}</td>
              <td style={{padding:"9px 12px"}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,background:r.status==="Received"?"#e8f6ed":"#fbeedb",color:r.status==="Received"?"#16a34a":"#d97706"}}>{r.status}</span></td>
              <td style={{padding:"9px 12px",fontSize:10,color:"#5b616e",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.notes}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
