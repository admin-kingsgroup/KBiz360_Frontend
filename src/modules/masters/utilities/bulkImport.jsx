/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Bulk Import Master Data
   ════════════════════════════════════════════════════════════════════
   Moved out of legacy.jsx (strangler-fig masters reorg — grouped under
   utilities/). Direct-URL utility, not in the nav menu, but same masters
   domain. Logic unchanged.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { RPT_tdStyle, RPT_thStyle } from '../../../core/styles';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';

export function BulkImportMaster(){
  const [step, setStep] = useState(1);
  const [importType, setImportType] = useState("Customers");
  const types = ["Customers","Suppliers","Sub-Agents","Employees","Chart of Accounts","Tax Codes","Forex Rates","Numbering Series"];

  return (
    <PHASE2_Page title="Bulk Import Master Data" subtitle="Upload Excel/CSV files to create master records in bulk — works for any master type">
      {/* Stepper */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18,padding:"14px 18px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:8}}>
        {[{n:1,label:"Select Type"},{n:2,label:"Download Template / Upload File"},{n:3,label:"Preview & Validate"}].map((s,i,arr)=>(
          <div key={s.n} style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:step>=s.n?"#c2a04a":"#e6e8ec",color:step>=s.n?"#1a1c22":"#5b616e",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13}}>{step>s.n?"✓":s.n}</div>
            <div><p style={{margin:0,fontSize:11.5,fontWeight:700,color:"#1a1c22"}}>{s.label}</p><p style={{margin:0,fontSize:10,color:"#5b616e"}}>Step {s.n} of 3</p></div>
            {i<arr.length-1&&<div style={{flex:1,height:2,background:step>s.n?"#c2a04a":"#e6e8ec",marginLeft:6}}/>}
          </div>
        ))}
      </div>

      {step===1 && (
        <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,padding:20}}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#1a1c22"}}>Which master are you importing?</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:10}}>
            {types.map(t=>(
              <label key={t} style={{padding:14,border:importType===t?"2px solid #c2a04a":"1px solid #cdd1d8",borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:importType===t?"#fff8e8":"#fff"}}>
                <input type="radio" checked={importType===t} onChange={()=>setImportType(t)}/>
                <span style={{fontSize:12,fontWeight:600,color:"#1a1c22"}}>{t}</span>
              </label>
            ))}
          </div>
          <div style={{marginTop:20,display:"flex",justifyContent:"flex-end"}}>
            <button onClick={()=>setStep(2)} style={{padding:"9px 22px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer"}}>Next →</button>
          </div>
        </div>
      )}

      {step===2 && (
        <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,padding:20}}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#1a1c22"}}>Importing: <span style={{color:"#c2a04a"}}>{importType}</span></p>
          <div style={{padding:16,background:"#fafbfd",border:"1px dashed #cbd0dc",borderRadius:6,marginBottom:14}}>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:"#1a1c22"}}>📥 Download Template First</p>
            <p style={{margin:"4px 0 10px",fontSize:11,color:"#5b616e"}}>Get the Excel template with the right columns and sample rows for {importType}</p>
            <button style={{padding:"7px 14px",background:"#fff",border:"1px solid #c2a04a",color:"#c2a04a",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>📥 Download {importType}_Template.xlsx</button>
          </div>
          <div style={{padding:30,background:"#fff",border:"2px dashed #cbd0dc",borderRadius:8,textAlign:"center"}}>
            <p style={{margin:0,fontSize:32}}>📤</p>
            <p style={{margin:"6px 0 4px",fontSize:13,fontWeight:700,color:"#1a1c22"}}>Drag &amp; drop your file here, or click to browse</p>
            <p style={{margin:0,fontSize:11,color:"#5b616e"}}>Supports .xlsx, .xls, .csv · Max 10 MB · Max 5000 rows</p>
            <button style={{marginTop:12,padding:"8px 16px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>📁 Browse Files</button>
          </div>
          <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}>
            <button onClick={()=>setStep(1)} style={{padding:"9px 18px",background:"#fff",border:"1px solid #cdd1d8",color:"#5b616e",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>← Back</button>
            <button onClick={()=>setStep(3)} style={{padding:"9px 22px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer"}}>Preview & Validate →</button>
          </div>
        </div>
      )}

      {step===3 && (
        <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,padding:20}}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#1a1c22"}}>Validation Preview</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,150px),1fr))",gap:10,marginBottom:14}}>
            <div style={{padding:12,background:"#e8f6ed",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:24,fontWeight:700,color:"#16a34a"}}>48</p><p style={{margin:0,fontSize:11,color:"#16a34a",fontWeight:600}}>Valid rows</p></div>
            <div style={{padding:12,background:"#fbeedb",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:24,fontWeight:700,color:"#d97706"}}>3</p><p style={{margin:0,fontSize:11,color:"#d97706",fontWeight:600}}>Warnings (duplicates)</p></div>
            <div style={{padding:12,background:"#fbe9e9",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:24,fontWeight:700,color:"#dc2626"}}>2</p><p style={{margin:0,fontSize:11,color:"#dc2626",fontWeight:600}}>Errors (will skip)</p></div>
            <div style={{padding:12,background:"#e6e8ec",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:24,fontWeight:700,color:"#1a1c22"}}>53</p><p style={{margin:0,fontSize:11,color:"#1a1c22",fontWeight:600}}>Total in file</p></div>
          </div>
          <div style={{maxHeight:280,overflowY:"auto",border:"1px solid #cdd1d8",borderRadius:6}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead style={{background:"#f7f8fb",position:"sticky",top:0}}><tr><th style={RPT_thStyle}>Row</th><th style={RPT_thStyle}>Code</th><th style={RPT_thStyle}>Name</th><th style={RPT_thStyle}>GSTIN</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
              <tbody>
                {[].map(row=>(
                  <tr key={row.r} style={{background:row.status==="error"?"#fff5f5":row.status==="warning"?"#fffbed":"#fff",borderBottom:"1px solid #dfe2e7"}}>
                    <td style={{...RPT_tdStyle,color:"#5b616e"}}>{row.r}</td>
                    <td style={{...RPT_tdStyle,fontFamily:"monospace"}}>{row.code}</td>
                    <td style={RPT_tdStyle}>{row.name||<span style={{color:"#dc2626"}}>—</span>}</td>
                    <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5}}>{row.gst}</td>
                    <td style={{padding:"6px 12px",textAlign:"center",borderBottom:"1px solid #dfe2e7"}}>
                      {row.status==="valid"&&<span style={{padding:"2px 8px",background:"#e8f6ed",color:"#16a34a",borderRadius:3,fontSize:10,fontWeight:700}}>✓ Valid</span>}
                      {row.status==="warning"&&<span title={row.msg} style={{padding:"2px 8px",background:"#fbeedb",color:"#d97706",borderRadius:3,fontSize:10,fontWeight:700}}>⚠ {row.msg}</span>}
                      {row.status==="error"&&<span title={row.msg} style={{padding:"2px 8px",background:"#fbe9e9",color:"#dc2626",borderRadius:3,fontSize:10,fontWeight:700}}>✗ {row.msg}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}>
            <button onClick={()=>setStep(2)} style={{padding:"9px 18px",background:"#fff",border:"1px solid #cdd1d8",color:"#5b616e",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>← Back</button>
            <div style={{display:"flex",gap:8}}>
              <button style={{padding:"9px 18px",background:"#fff",border:"1px solid #cdd1d8",color:"#5b616e",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>📥 Download Error Report</button>
              <button style={{padding:"9px 22px",background:"#16a34a",color:"#fff",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ Import 48 Valid Rows</button>
            </div>
          </div>
        </div>
      )}

      {/* Recent imports */}
      <div style={{marginTop:18,padding:14,background:"#fff",border:"1px solid #cdd1d8",borderRadius:8}}>
        <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#1a1c22"}}>Recent imports</p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Date</th><th style={RPT_thStyle}>Type</th><th style={RPT_thStyle}>By</th><th style={{...RPT_thStyle,textAlign:"right"}}>Rows</th><th style={{...RPT_thStyle,textAlign:"right"}}>Imported</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
          <tbody>{[].map((r,i)=>(<tr key={i}><td style={RPT_tdStyle}>{r.date}</td><td style={RPT_tdStyle}>{r.type}</td><td style={RPT_tdStyle}>{r.user}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{r.rows}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#16a34a"}}>{r.imported}</td><td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",background:"#e8f6ed",color:"#16a34a",borderRadius:3,fontSize:10,fontWeight:700}}>{r.status}</span></td></tr>))}</tbody>
        </table>
      </div>
    </PHASE2_Page>
  );
}
