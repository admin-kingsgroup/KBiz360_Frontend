/* ════════════════════════════════════════════════════════════════════
   AUTO-LINKED VOUCHERS (Sale ↔ Receipt, Purchase ↔ Payment)
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of transactions/legacy.jsx
   into its business sub-module folder — MENU_FINANCE ▸ Tools & Calculators
   ▸ "Auto-linked Vouchers" (href /finance/auto-linked). transactions/
   index.js re-exports AutoLinkedVouchers from here so App.jsx's barrel
   import needed zero changes.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { fmtINR } from '../../../core/format';
import { RPT_thStyle, RPT_tdStyle } from '../../../core/styles';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';

/* ════════════════════════════════════════════════════════════════════
   5. AUTO-LINKED VOUCHERS (Sale ↔ Receipt, Purchase ↔ Payment)
   ════════════════════════════════════════════════════════════════════ */

export function AutoLinkedVouchers(){
  const [cycle,setCycle]=useState("sale");
  const SALE_CYCLE=[];
  const PUR_CYCLE=[
    {step:1,voucher:"PUR-BOM/2026/3214",type:"Purchase Invoice",party:"Air India BSP",amount:285000,date:"2026-05-12",status:"Unpaid",color:"#dc2626"},
    {step:2,voucher:"PV-BOM/2026/0892",type:"Payment Voucher",party:"Air India BSP",amount:285000,date:"2026-05-17",status:"Approved",color:"#c2a04a"},
    {step:3,voucher:"PUR-BOM/2026/3214",type:"Purchase Invoice (auto-updated)",party:"Air India BSP",amount:285000,date:"2026-05-12",status:"PAID ✓",color:"#16a34a"},
  ];
  const steps=cycle==="sale"?SALE_CYCLE:PUR_CYCLE;
  const LINK_TABLE=[]; // populated from live linked sale/receipt vouchers

  return (
    <PHASE2_Page title="Auto-link Related Vouchers" subtitle="Sale Invoice ↔ Receipt · Purchase Invoice ↔ Payment — auto-matched on party + amount + date proximity">
      <div style={{padding:12,background:"#e8f0ff",border:"1px solid #cfe0f8",borderLeft:"3px solid #2563eb",borderRadius:6,marginBottom:14,fontSize:11.5,color:"#2e323c"}}>
        <b>Auto-link logic:</b> When a Receipt is posted for a party, KBiz360 automatically looks for an outstanding Sales Invoice with the same party and amount (±5% tolerance). If found, the invoice is marked as Paid and the two vouchers are bi-directionally linked. Same for Purchase ↔ Payment.
      </div>

      {/* Cycle selector */}
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {[{k:"sale",label:"Sale ↔ Receipt cycle"},{k:"purchase",label:"Purchase ↔ Payment cycle"}].map(b=>(
          <button key={b.k} onClick={()=>setCycle(b.k)} style={{padding:"8px 18px",border:cycle===b.k?"2px solid #1a1c22":"1px solid #cdd1d8",background:cycle===b.k?"#1a1c22":"#fff",color:cycle===b.k?"#c2a04a":"#5b616e",borderRadius:6,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{b.label}</button>
        ))}
      </div>

      {/* Flow visualization */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:0,marginBottom:18,padding:"24px 20px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,overflowX:"auto"}}>
        {steps.map((s,i)=>(
          <div key={s.step} style={{display:"flex",alignItems:"center"}}>
            <div style={{width:200,padding:14,background:"#fff",border:"2px solid "+s.color,borderRadius:8,textAlign:"center",position:"relative"}}>
              <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:s.color,color:"#fff",borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>{s.step}</div>
              <p style={{margin:"6px 0 4px",fontSize:11,fontWeight:700,color:s.color,textTransform:"uppercase",letterSpacing:"0.4px"}}>{s.type}</p>
              <p style={{margin:0,fontSize:10.5,fontFamily:"monospace",color:"#1a1c22",fontWeight:700}}>{s.voucher}</p>
              <p style={{margin:"3px 0",fontSize:11,color:"#1a1c22"}}>{s.party}</p>
              <p style={{margin:"3px 0 0",fontSize:13,fontWeight:700,color:"#1a1c22"}}>{fmtINR(s.amount)}</p>
              <span style={{display:"inline-block",marginTop:6,padding:"2px 8px",background:s.status.includes("PAID")||s.status==="Posted"?"#e8f6ed":s.status==="Approved"?"#fbeedb":"#fbe9e9",color:s.status.includes("PAID")||s.status==="Posted"?"#16a34a":s.status==="Approved"?"#d97706":"#dc2626",borderRadius:3,fontSize:10.5,fontWeight:700}}>{s.status}</span>
            </div>
            {i<steps.length-1&&(
              <div style={{width:60,display:"flex",flexDirection:"column",alignItems:"center",padding:"0 4px"}}>
                <div style={{fontSize:20,color:"#c2a04a",fontWeight:700}}>→</div>
                <p style={{margin:0,fontSize:9,color:"#5b616e",textAlign:"center",lineHeight:1.3}}>auto-<br/>linked</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Linked vouchers table */}
      <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",borderBottom:"1px solid #cdd1d8",background:"#fafbfd",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <p style={{margin:0,fontSize:12.5,fontWeight:700,color:"#1a1c22"}}>Linked Voucher Register</p>
          <button style={{padding:"5px 12px",background:"#fff",border:"1px solid #cdd1d8",color:"#5b616e",borderRadius:5,fontSize:11,fontWeight:600,cursor:"pointer"}}>📤 Export</button>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Invoice / Purchase</th><th style={RPT_thStyle}>Receipt / Payment</th><th style={RPT_thStyle}>Party</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th><th style={RPT_thStyle}>Settled On</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
          <tbody>{LINK_TABLE.map((r,i)=>(
            <tr key={i} style={{borderBottom:"1px solid #dfe2e7"}}>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:600,fontSize:11}}>{r.sale}</td>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",color:r.receipt==="—"?"#dc2626":"#16a34a",fontWeight:r.receipt==="—"?400:600,fontSize:11}}>{r.receipt}</td>
              <td style={RPT_tdStyle}>{r.party}</td>
              <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(r.amount)}</td>
              <td style={{...RPT_tdStyle,color:r.date==="—"?"#dc2626":"#5b616e"}}>{r.date}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:3,fontSize:10.5,fontWeight:700,background:r.receipt!=="—"?"#e8f6ed":"#fbeedb",color:r.receipt!=="—"?"#16a34a":"#d97706"}}>{r.receipt!=="—"?"Linked ✓":"Pending"}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </PHASE2_Page>
  );
}
