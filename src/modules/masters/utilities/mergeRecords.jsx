/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Merge Records Utility (any master)
   ════════════════════════════════════════════════════════════════════
   Moved out of legacy.jsx (strangler-fig masters reorg — grouped under
   utilities/). Logic unchanged.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { RPT_tdStyle, RPT_thStyle } from '../../../core/styles';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';
import { isViewOnly, VIEW_ONLY_REASON } from '../../../core/api';

export function MergeRecordsUtility(){
  // View-only accounts cannot merge records — the confirm action is disabled with a reason.
  const vo = isViewOnly();
  const [masterType, setMasterType] = useState("Customers");
  const [source, setSource] = useState("L T Group (CUST-AMD-00012)");
  const [target, setTarget] = useState("");
  const inp = {padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,width:"100%"};

  return (
    <PHASE2_Page title="Merge Records Utility"
      subtitle="Combine duplicate master records · all transactions reassigned · source record marked inactive · audit-tracked">
      <div style={{padding:14,background:"#fbeedb",border:"1px solid #ffeaa7",borderLeft:"3px solid #d97706",borderRadius:6,marginBottom:14}}>
        <p style={{margin:0,fontSize:12,color:"#d97706",fontWeight:700}}>⚠ Merge is permanent</p>
        <p style={{margin:"3px 0 0",fontSize:11,color:"#d97706"}}>All transactions, addresses, contacts, and documents from the Source record will be transferred to the Target record. The Source record will be marked inactive but kept for audit. Only Director or Senior Finance Manager can perform merge.</p>
      </div>

      <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,padding:20,marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:14,marginBottom:18}}>
          <div>
            <label style={{fontSize:11,color:"#5b616e",fontWeight:700,textTransform:"uppercase",marginBottom:4,display:"block"}}>Master Type</label>
            <select value={masterType} onChange={e=>setMasterType(e.target.value)} style={inp}>
              {["Customers","Suppliers","Sub-Agents","Employees","Chart of Accounts","Tax Codes"].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,color:"#dc2626",fontWeight:700,textTransform:"uppercase",marginBottom:4,display:"block"}}>Source (will be merged out)</label>
            <select value={source} onChange={e=>setSource(e.target.value)} style={{...inp,borderColor:"#dc2626"}}>
              <option value="">Select customer…</option>
            </select>
          </div>
          <div>
            <label style={{fontSize:11,color:"#16a34a",fontWeight:700,textTransform:"uppercase",marginBottom:4,display:"block"}}>Target (will keep)</label>
            <select value={target} onChange={e=>setTarget(e.target.value)} style={{...inp,borderColor:"#16a34a"}}>
              <option value="">Select customer…</option>
            </select>
          </div>
        </div>

        {/* Comparison preview */}
        <div style={{border:"1px solid #cdd1d8",borderRadius:6,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",background:"#1a1c22",color:"#fff",fontSize:12,fontWeight:700}}>Comparison Preview</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Field</th><th style={{...RPT_thStyle,color:"#dc2626"}}>Source (out)</th><th style={{...RPT_thStyle,color:"#16a34a"}}>Target (kept)</th><th style={{...RPT_thStyle,textAlign:"center"}}>After Merge</th></tr></thead>
            <tbody>
              {[
                {field:"Name",src:"",tgt:"",result:""},
                {field:"GSTIN",src:"24AAACL0140P1ZH (AMD)",tgt:"27AAACL0140P1ZW (BOM)",result:"Both kept as alternate GSTINs"},
                {field:"Credit Limit",src:"₹10L",tgt:"₹50L",result:"₹50L (higher)"},
                {field:"Address Count",src:"1",tgt:"3",result:"4 (combined)"},
                {field:"Contact Persons",src:"2",tgt:"3",result:"5 (combined)"},
                {field:"Documents",src:"2",tgt:"4",result:"6 (combined)"},
                {field:"Linked Transactions",src:"18 vouchers (₹4.8L)",tgt:"142 vouchers (₹2.85Cr)",result:"160 vouchers (₹2.90Cr) → all under Target"},
                {field:"Created",src:"2022-06-08",tgt:"2024-04-10",result:"Target's date kept"},
              ].map((row,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #dfe2e7"}}>
                  <td style={{...RPT_tdStyle,fontWeight:700}}>{row.field}</td>
                  <td style={{...RPT_tdStyle,color:"#dc2626",textDecoration:"line-through",opacity:0.7}}>{row.src}</td>
                  <td style={{...RPT_tdStyle,color:"#16a34a"}}>{row.tgt}</td>
                  <td style={{...RPT_tdStyle,textAlign:"center",fontWeight:600}}>{row.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{marginTop:18,padding:12,background:"#fafbfd",borderRadius:6}}>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#1a1c22",cursor:"pointer"}}>
            <input type="checkbox"/>
            <span>I understand that all 18 transactions from the Source will be reassigned to the Target, and this action cannot be undone.</span>
          </label>
        </div>

        <div style={{marginTop:18,display:"flex",justifyContent:"flex-end",gap:8}}>
          <button style={{padding:"9px 18px",background:"#fff",border:"1px solid #cdd1d8",color:"#5b616e",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button disabled={vo} title={vo?VIEW_ONLY_REASON:undefined} style={{padding:"9px 22px",background:vo?"#e69a9a":"#dc2626",color:"#fff",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:vo?"not-allowed":"pointer"}}>⚠ Confirm Merge</button>
        </div>
      </div>

      {/* Recent merges */}
      <div style={{padding:14,background:"#fff",border:"1px solid #cdd1d8",borderRadius:8}}>
        <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#1a1c22"}}>Recent merges (audit history)</p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Date</th><th style={RPT_thStyle}>Type</th><th style={RPT_thStyle}>Source → Target</th><th style={RPT_thStyle}>By</th><th style={{...RPT_thStyle,textAlign:"right"}}>Txns Moved</th></tr></thead>
          <tbody>{[].map((m,i)=>(<tr key={i}><td style={RPT_tdStyle}>{m.date}</td><td style={RPT_tdStyle}>{m.type}</td><td style={RPT_tdStyle}>{m.merge}</td><td style={RPT_tdStyle}>{m.user}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{m.txns}</td></tr>))}</tbody>
        </table>
      </div>
    </PHASE2_Page>
  );
}
