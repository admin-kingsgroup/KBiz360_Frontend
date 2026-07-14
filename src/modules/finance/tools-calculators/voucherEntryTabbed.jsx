/* ════════════════════════════════════════════════════════════════════
   RECEIPT VOUCHER — 8-TAB VIEW (demo layout)
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of transactions/legacy.jsx
   into its business sub-module folder — MENU_FINANCE ▸ Tools & Calculators
   ▸ "Voucher Entry (8-Tab View)" (href /transactions/voucher-tabs).
   transactions/index.js re-exports VoucherEntryTabbed from here so
   App.jsx's barrel import needed zero changes.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { todayISO } from '../../../core/dates';
import { TAB_Page, tabPanel, cardStyle } from '../../../core/helpers';
import { FL, inpStd, tabBtnStyle } from '../../../core/styles';

export function VoucherEntryTabbed(){
  const [tab,setTab]=useState("entry");
  const tabs=[{id:"entry",label:"1. Entry"},{id:"lines",label:"2. Line Items"},{id:"tax",label:"3. Tax Computation"},{id:"attach",label:"4. Attachments"},{id:"approval",label:"5. Approvals"},{id:"audit",label:"6. Audit Trail"},{id:"related",label:"7. Related Vouchers"},{id:"notes",label:"8. Notes"}];
  return TAB_Page("Receipt Voucher", "Standardised 8-tab structure",
    {user:"",date:"",created:""},
    <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,overflow:"hidden"}}>
      <div style={{display:"flex",borderBottom:"1px solid #cdd1d8",overflowX:"auto",background:"#fafbfd"}}>{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={tabBtnStyle(tab===t.id)}>{t.label}</button>)}</div>
      {tab==="entry"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:14}}>
          <FL label="Voucher No."><input defaultValue="RV-BOM/2026/4521" readOnly style={{...inpStd,fontFamily:"monospace",background:"#fafbfd"}}/></FL>
          <FL label="Voucher Date"><input type="date" defaultValue={todayISO()} style={inpStd}/></FL>
          <FL label="Branch"><select style={inpStd}><option>BOM (Mumbai)</option></select></FL>
          <FL label="Customer"><select style={inpStd}><option value="">— Select —</option></select></FL>
          <FL label="Bank/Cash A/c"><select style={inpStd}><option>HDFC BOM Operational — XXXX4321</option><option>SBI BOM — XXXX2255</option></select></FL>
          <FL label="Payment Mode"><select style={inpStd}><option>NEFT</option><option>RTGS</option><option>Cheque</option><option>UPI</option></select></FL>
          <FL label="Amount (₹)"><input type="number" defaultValue="485000" style={{...inpStd,fontWeight:700,fontSize:14}}/></FL>
          <FL label="Reference No."><input defaultValue="UTR123456789" style={{...inpStd,fontFamily:"monospace"}}/></FL>
          <FL label="Currency"><input defaultValue="INR" readOnly style={{...inpStd,background:"#fafbfd"}}/></FL>
          <div style={{gridColumn:"1 / -1"}}><FL label="Narration"><textarea defaultValue="Receipt against Invoice INV-BOM/2026/8721 dt 15-May-2026" rows={2} style={{...inpStd,fontFamily:"inherit",resize:"vertical"}}/></FL></div>
        </div>
      )}
      {tab==="lines"&&tabPanel(
        <>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead style={{background:"#f7f8fb"}}><tr>{["#","Invoice Ref","Invoice Date","Invoice Amt","Outstanding","Allocated","Balance"].map((h,i)=><th key={h} style={{padding:"9px 12px",textAlign:i<2?"left":"right",fontSize:10.5,color:"#5b616e",fontWeight:700,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
            <tbody>
              <tr style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"10px 12px"}}>1</td><td style={{padding:"10px 12px",fontFamily:"monospace",fontWeight:600}}>INV-BOM/2026/8721</td><td style={{padding:"10px 12px",textAlign:"right",color:"#5b616e"}}>2026-05-15</td><td style={{padding:"10px 12px",textAlign:"right"}}>₹3,25,000</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700}}>₹3,25,000</td><td style={{padding:"10px 12px",textAlign:"right"}}><input defaultValue="325000" type="number" style={{...inpStd,textAlign:"right",fontWeight:700,maxWidth:120,marginLeft:"auto"}}/></td><td style={{padding:"10px 12px",textAlign:"right",color:"#16a34a",fontWeight:700}}>₹0</td></tr>
              <tr style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"10px 12px"}}>2</td><td style={{padding:"10px 12px",fontFamily:"monospace",fontWeight:600}}>INV-BOM/2026/8688</td><td style={{padding:"10px 12px",textAlign:"right",color:"#5b616e"}}>2026-05-08</td><td style={{padding:"10px 12px",textAlign:"right"}}>₹1,85,000</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700}}>₹1,85,000</td><td style={{padding:"10px 12px",textAlign:"right"}}><input defaultValue="160000" type="number" style={{...inpStd,textAlign:"right",fontWeight:700,maxWidth:120,marginLeft:"auto"}}/></td><td style={{padding:"10px 12px",textAlign:"right",color:"#dc2626",fontWeight:700}}>₹25,000</td></tr>
              <tr style={{background:"#1a1c22",color:"#c2a04a"}}><td colSpan={5} style={{padding:"10px 12px",fontWeight:700,textAlign:"right"}}>TOTAL ALLOCATED</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,fontSize:13,fontFamily:"monospace"}}>₹4,85,000</td><td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace"}}>₹25,000</td></tr>
            </tbody>
          </table>
          <button style={{marginTop:8,padding:"7px 14px",background:"transparent",border:"1px dashed #c2a04a",color:"#c2a04a",borderRadius:5,fontSize:11.5,cursor:"pointer",fontWeight:600}}>+ Add another invoice to allocate against</button>
        </>
      )}
      {tab==="tax"&&tabPanel(
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22",marginBottom:10}}>Tax Computation (for Receipt Voucher — typically nil)</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <tbody>
              <tr style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"9px 12px",color:"#5b616e"}}>Gross Receipt</td><td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace"}}>₹4,85,000</td></tr>
              <tr style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"9px 12px",color:"#5b616e"}}>Less: TDS u/s 194C (deducted by L&T)</td><td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:"#dc2626"}}>(–) ₹9,700</td></tr>
              <tr style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"9px 12px",color:"#5b616e"}}>Net Receipt</td><td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700}}>₹4,75,300</td></tr>
              <tr style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"9px 12px",color:"#5b616e"}}>TDS Certificate Received?</td><td style={{padding:"9px 12px",textAlign:"right"}}><span style={{padding:"2px 8px",background:"#fbeedb",color:"#d97706",borderRadius:3,fontSize:10,fontWeight:700}}>Pending — Q1 26-27</span></td></tr>
              <tr><td style={{padding:"9px 12px",color:"#5b616e"}}>GST Impact</td><td style={{padding:"9px 12px",textAlign:"right",color:"#5b616e"}}>Nil (Receipt — already accounted at invoice stage)</td></tr>
            </tbody>
          </table>
        </div>
      )}
      {tab==="attach"&&tabPanel(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:14}}>{[{n:"NEFT Confirmation",sz:"245 KB",ty:"pdf"},{n:"Customer Email Confirmation",sz:"82 KB",ty:"eml"}].map((f,i)=>(<div key={i} style={{padding:14,background:"#fafbfd",border:"1px solid #cdd1d8",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:30}}>{f.ty==="pdf"?"📄":"📧"}</p><p style={{margin:"6px 0 2px",fontSize:11,color:"#1a1c22",fontWeight:600}}>{f.n}</p><p style={{margin:0,fontSize:10,color:"#5b616e"}}>{f.sz} · {f.ty.toUpperCase()}</p><button style={{marginTop:6,padding:"3px 10px",background:"transparent",border:"1px solid #c2a04a",color:"#c2a04a",borderRadius:4,fontSize:10,cursor:"pointer",fontWeight:600}}>↓ Download</button></div>))}</div>
          <div style={{padding:30,border:"2px dashed #c2a04a",borderRadius:8,textAlign:"center",background:"#fafbfd"}}><p style={{margin:0,fontSize:36}}>📂</p><p style={{margin:"6px 0 2px",fontSize:13,fontWeight:700,color:"#1a1c22"}}>Drag & drop or browse</p><p style={{margin:0,fontSize:11,color:"#5b616e"}}>PDF, image, eml — max 10 MB per file</p></div>
        </div>
      )}
      {tab==="approval"&&tabPanel(
        <div>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#1a1c22"}}>Approval Workflow</p>
          {[].map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",background:"#fafbfd",borderRadius:6,marginBottom:8,border:"1px solid #cdd1d8"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:s.status==="done"?"#16a34a":s.status==="skip"?"#cbd0dc":"#c2a04a",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14}}>{s.status==="done"?"✓":s.status==="skip"?"⊘":"○"}</div>
              <div style={{flex:1}}><p style={{margin:0,fontSize:12.5,fontWeight:700,color:"#1a1c22"}}>{s.step}</p><p style={{margin:"2px 0 0",fontSize:11,color:"#5b616e"}}>by {s.by} · {s.ts}</p></div>
              <span style={{padding:"3px 10px",background:s.status==="done"?"#e8f6ed":s.status==="skip"?"#e2e3e5":"#fbeedb",color:s.status==="done"?"#16a34a":s.status==="skip"?"#383d41":"#d97706",borderRadius:3,fontSize:10,fontWeight:700,letterSpacing:"0.3px"}}>{s.status.toUpperCase()}</span>
            </div>))}
        </div>
      )}
      {tab==="audit"&&tabPanel(
        <div>{[].map((h,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",borderBottom:"1px solid #dfe2e7"}}><span style={{fontFamily:"monospace",fontSize:10.5,color:"#5b616e",minWidth:130}}>{h.ts}</span><span style={{fontSize:11.5,color:"#1a1c22",fontWeight:600,minWidth:110}}>{h.u}</span><span style={{padding:"2px 8px",background:h.a==="POSTED"||h.a==="APPROVED"?"#e8f6ed":h.a==="CREATED"?"#cfe2ff":"#fbeedb",color:h.a==="POSTED"||h.a==="APPROVED"?"#16a34a":h.a==="CREATED"?"#004085":"#d97706",borderRadius:3,fontSize:9.5,fontWeight:700,minWidth:80,textAlign:"center"}}>{h.a}</span><span style={{fontSize:11.5,color:"#5b616e"}}>{h.d}</span></div>))}</div>
      )}
      {tab==="related"&&tabPanel(
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead style={{background:"#f7f8fb"}}><tr>{["Voucher","Type","Date","Amount","Relationship"].map((h,i)=><th key={h} style={{padding:"9px 12px",textAlign:i===3?"right":"left",fontSize:10.5,color:"#5b616e",fontWeight:700,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>{[{v:"INV-BOM/2026/8721",t:"Tax Invoice",d:"2026-05-15",a:325000,r:"Settled (full)"},{v:"INV-BOM/2026/8688",t:"Tax Invoice",d:"2026-05-08",a:185000,r:"Partially settled (₹1.60L of ₹1.85L)"}].map(r=>(<tr key={r.v} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"10px 12px",fontFamily:"monospace",fontWeight:600}}>{r.v}</td><td style={{padding:"10px 12px"}}>{r.t}</td><td style={{padding:"10px 12px",color:"#5b616e"}}>{r.d}</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700}}>₹{r.a.toLocaleString("en-IN")}</td><td style={{padding:"10px 12px",fontSize:11.5,color:"#5b616e"}}>{r.r}</td></tr>))}</tbody>
        </table>
      )}
      {tab==="notes"&&tabPanel(
        <div>
          {[].map((c,i)=>(<div key={i} style={{display:"flex",gap:10,marginBottom:10,flexDirection:c.me?"row-reverse":"row"}}><div style={{width:32,height:32,borderRadius:"50%",background:c.me?"#2F7A8E":"#6B4C8B",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11,flexShrink:0}}>{c.u.substring(0,2).toUpperCase()}</div><div style={{maxWidth:"70%",padding:"8px 12px",background:c.me?"#1a1c22":"#fafbfd",color:c.me?"#fff":"#1a1c22",borderRadius:c.me?"8px 8px 2px 8px":"8px 8px 8px 2px",border:c.me?"none":"1px solid #cdd1d8"}}><p style={{margin:0,fontSize:11,opacity:0.7,fontWeight:600}}>{c.u}</p><p style={{margin:"3px 0",fontSize:12,lineHeight:1.45}}>{c.txt}</p><p style={{margin:0,fontSize:9.5,opacity:0.6}}>{c.ts}</p></div></div>))}
          <div style={{marginTop:10,display:"flex",gap:8}}><input placeholder="Add comment..." style={{flex:1,padding:9,border:"1px solid #cdd1d8",borderRadius:6,fontSize:12}}/><button style={{padding:"9px 18px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:6,fontSize:12,cursor:"pointer",fontWeight:700}}>Send</button></div>
        </div>
      )}
    </div>
  );
}
