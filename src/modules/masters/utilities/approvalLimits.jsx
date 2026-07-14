/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Approval Limits Master
   ════════════════════════════════════════════════════════════════════
   Moved out of legacy.jsx (strangler-fig masters reorg — grouped under
   utilities/). Live approval thresholds (GET /api/approval-limits). Logic
   unchanged.
   ──────────────────────────────────────────────────────────────────── */

import React from 'react';
import { useApprovalLimits } from '../../../core/useReference';
import { MASTER_PAGE } from '../../../core/helpers';
import { ExportBtn } from '../shared/exportBtn';

export function ApprovalLimitsMaster(){
  // Live approval thresholds (GET /api/approval-limits). Was hardcoded APPROVAL_LIMITS_DATA.
  const rows=useApprovalLimits().data||[];
  const groupByType={};
  rows.forEach(a=>{
    if(!groupByType[a.voucherType])groupByType[a.voucherType]=[];
    groupByType[a.voucherType].push(a);
  });
  const fmt=n=>n>=999999999?"Unlimited":"₹"+n.toLocaleString("en-IN");
  return MASTER_PAGE("Approval Limits Master","Per-role × per-voucher-type thresholds. Defines automatic escalation in voucher workflow",
    <>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <p style={{margin:0,fontSize:12,color:"#5b616e"}}>{rows.length} rules configured across {Object.keys(groupByType).length} voucher types</p>
        <div style={{flex:1}}/>
        <ExportBtn name="approval-limits" label="📤 Export Matrix" rows={rows} columns={[{key:"voucherType",label:"Voucher Type"},{key:"role",label:"Approver Role"},{key:"minAmount",label:"From (>=)"},{key:"maxAmount",label:"To (<=)"},{key:"backup",label:"Backup Approver"}]}/>
        <button style={{padding:"8px 16px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:6,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>+ Add Limit Rule</button>
      </div>
      {Object.entries(groupByType).map(([type,rules])=>(
        <div key={type} style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"10px 14px",background:"#1a1c22",color:"#fff"}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,letterSpacing:"0.3px"}}>{type}</p>
            <p style={{margin:"2px 0 0",fontSize:11,color:"#c2a04a"}}>{rules.length} threshold tier{rules.length!==1?"s":""}</p>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead style={{background:"#f7f8fb"}}>
              <tr>
                <th style={{padding:"10px 14px",textAlign:"left",fontWeight:700,color:"#5b616e",borderBottom:"1px solid #cdd1d8",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Approver Role</th>
                <th style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:"#5b616e",borderBottom:"1px solid #cdd1d8",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>From (≥)</th>
                <th style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:"#5b616e",borderBottom:"1px solid #cdd1d8",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>To (≤)</th>
                <th style={{padding:"10px 14px",textAlign:"left",fontWeight:700,color:"#5b616e",borderBottom:"1px solid #cdd1d8",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Backup Approver</th>
                <th style={{padding:"10px 14px",textAlign:"center",fontWeight:700,color:"#5b616e",borderBottom:"1px solid #cdd1d8",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r=>(
                <tr key={r.id} style={{borderBottom:"1px solid #dfe2e7"}}>
                  <td style={{padding:"9px 14px",fontWeight:600,color:"#1a1c22"}}>{r.role}</td>
                  <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"monospace",color:"#1a1c22"}}>{fmt(r.minAmount)}</td>
                  <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"monospace",color:"#1a1c22"}}>{fmt(r.maxAmount)}</td>
                  <td style={{padding:"9px 14px",color:"#5b616e"}}>{r.backup}</td>
                  <td style={{padding:"9px 14px",textAlign:"center"}}>
                    <button style={{padding:"3px 8px",background:"transparent",border:"1px solid #c2a04a",color:"#c2a04a",borderRadius:4,fontSize:10.5,cursor:"pointer",fontWeight:600}}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}
