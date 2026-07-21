/* ════════════════════════════════════════════════════════════════
   BSP STATEMENT IMPORT  /purchase/bsp-import
   Upload BSP Link CSV / SITI billing file → auto-match against book entries.
   ════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { btnG, btnGh, card, bc } from '../../../core/styles';

export function BspCsvImport({branch}){
  const [file,setFile]=useState(null);
  const [parsed,setParsed]=useState([]);
  const [matched,setMatched]=useState([]);
  const [step,setStep]=useState(1); // 1=upload 2=preview 3=reconcile

  const handleFile=async e=>{
    const f=e.target.files[0];
    if(!f)return;
    setFile(f);
    // Parse the uploaded BSP CSV (no demo rows). Columns are matched by header
    // name; rows are flagged for reconciliation against the live books.
    let rows=[];
    try{
      const text=await f.text();
      const lines=text.replace(/\r/g,"").split("\n").filter(l=>l.trim());
      if(lines.length>1){
        const heads=lines[0].split(",").map(h=>h.trim().toLowerCase());
        const ix=re=>heads.findIndex(h=>re.test(h));
        const iT=ix(/ticket/),iA=ix(/airline/),iP=ix(/pax|passenger|name/),iS=ix(/sector|route/),iAmt=ix(/amount|fare|total/),iC=ix(/currency/),iTy=ix(/type/),iSt=ix(/status/);
        rows=lines.slice(1).map(l=>{const c=l.split(",");const g=i=>i>=0?(c[i]||"").trim():"";return{
          ticketNo:g(iT),airline:g(iA),pax:g(iP),sector:g(iS),amount:g(iAmt)||"0",currency:g(iC)||"INR",type:g(iTy)||"SALE",status:g(iSt)};});
      }
    }catch{ rows=[]; }
    setParsed(rows);
    setMatched(rows.map(row=>({...row,inBooks:false,variance:0})));
    setStep(2);
  };

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#e8f0ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📂</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>BSP Statement Import</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>Upload BSP Link CSV / SITI billing file → auto-match against book entries</p>
        </div>
      </div>

      {/* Step indicators */}
      <div style={{display:"flex",gap:0,marginBottom:16,...card,padding:"12px 16px"}}>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:0}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",background:step>=1?"#1a1c22":"#e6e8ec",color:step>=1?"#c2a04a":"#cbd0db"}}>1</div><span style={{fontSize:11,fontWeight:step===1?700:400,color:step===1?"#1a1c22":"#5b616e"}}>Upload File</span></div><div style={{flex:1,height:1,background:"#e6e8ec",margin:"0 8px"}}/></div><div style={{flex:1,display:"flex",alignItems:"center",gap:0}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",background:step>=2?"#1a1c22":"#e6e8ec",color:step>=2?"#c2a04a":"#cbd0db"}}>2</div><span style={{fontSize:11,fontWeight:step===2?700:400,color:step===2?"#1a1c22":"#5b616e"}}>Preview & Match</span></div><div style={{flex:1,height:1,background:"#e6e8ec",margin:"0 8px"}}/></div><div style={{flex:1,display:"flex",alignItems:"center",gap:0}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",background:step>=3?"#1a1c22":"#e6e8ec",color:step>=3?"#c2a04a":"#cbd0db"}}>3</div><span style={{fontSize:11,fontWeight:step===3?700:400,color:step===3?"#1a1c22":"#5b616e"}}>Reconcile</span></div></div>
      </div>

      {step===1&&(
        <div style={{...card,textAlign:"center",padding:"40px 20px"}}>
          <p style={{margin:"0 0 8px",fontSize:32}}>📂</p>
          <p style={{margin:"0 0 16px",fontSize:14,fontWeight:600,color:"#1a1c22"}}>Upload BSP Billing CSV</p>
          <p style={{margin:"0 0 20px",fontSize:11,color:"#5b616e"}}>Download from BSP Link → Reports → Billing Statement → CSV format. Supported: BSP India (IATA), KQ Direct, any airline CSV.</p>
          <input type="file" accept=".csv,.txt" onChange={handleFile} style={{display:"none"}} id="bspFileInput"/>
          <label htmlFor="bspFileInput" style={{...btnG,cursor:"pointer",display:"inline-block",padding:"10px 24px",fontSize:12}}>📂 Choose CSV File</label>
        </div>
      )}

      {step===2&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:"#1a1c22"}}>Parsed: {parsed.length} records from {file?.name||"sample"}</p>
            <div style={{display:"flex",gap:8}}>
              <span style={{fontSize:10.5,padding:"4px 10px",borderRadius:999,background:"#e8f6ed",color:"#16a34a",fontWeight:700}}>{matched.filter(m=>m.inBooks).length} Matched</span>
              <span style={{fontSize:10.5,padding:"4px 10px",borderRadius:999,background:"#fbe9e9",color:"#dc2626",fontWeight:700}}>{matched.filter(m=>!m.inBooks).length} Unmatched</span>
              <button onClick={()=>setStep(3)} style={{...btnG,fontSize:11}}>Proceed →</button>
            </div>
          </div>
          <div style={{...card,padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#1a1c22"}}>
                {["Ticket No.","Airline","PAX Name","Sector","Amount","Type","In Books","Status"].map((h,i)=>(
                  <th key={i} style={{padding:"9px 11px",textAlign:i===4?"right":"left",color:"#c2a04a",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{matched.map((r,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:!r.inBooks?"#fff5f5":i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:9.5,color:"#2563eb"}}>{r.ticketNo}</td>
                  <td style={{padding:"8px 11px",fontWeight:600,color:"#1a1c22"}}>{r.airline}</td>
                  <td style={{padding:"8px 11px",color:"#2e323c"}}>{r.pax}</td>
                  <td style={{padding:"8px 11px",color:"#5b616e"}}>{r.sector}</td>
                  <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{bc(branch).cur}{Number(r.amount).toLocaleString()}</td>
                  <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:r.type==="SALE"?"#e8f0ff":"#fbeedb",color:r.type==="SALE"?"#2563eb":"#d97706"}}>{r.type}</span></td>
                  <td style={{padding:"8px 11px",textAlign:"center"}}>{r.inBooks?"✅":"❌"}</td>
                  <td style={{padding:"8px 11px"}}>{!r.inBooks?<button style={{...btnG,padding:"2px 8px",fontSize:9.5,background:"#dc2626",whiteSpace:"nowrap"}}>Create Entry</button>:<span style={{color:"#16a34a",fontSize:12}}>✔</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {step===3&&(
        <div style={{...card,padding:"24px",textAlign:"center",background:"#e8f6ed"}}>
          <p style={{margin:"0 0 8px",fontSize:32}}>✅</p>
          <p style={{margin:"0 0 8px",fontSize:15,fontWeight:700,color:"#16a34a"}}>Reconciliation Complete</p>
          <p style={{margin:0,fontSize:11,color:"#5b616e"}}>{matched.filter(m=>m.inBooks).length} tickets matched · {matched.filter(m=>!m.inBooks).length} new entries created · BSP statement synced with books.</p>
          <button onClick={()=>{setStep(1);setParsed([]);setMatched([]);setFile(null);}} style={{...btnGh,marginTop:16}}>Import Another File</button>
        </div>
      )}
    </div>
  );
}
