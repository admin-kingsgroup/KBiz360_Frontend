/* ══════════════════════════════════════════════════════════════════
   3. REIMBURSEMENT CLAIM WORKFLOW (/hr/reimbursement)
   ══════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { Line } from 'recharts';
import { fmtINR } from '../../../core/format';
import { MY_CLAIMS_DATA, cardStyle } from '../../../core/helpers';
import { RPT_tdStyle, RPT_thStyle, inp } from '../../../core/styles';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';

export function ReimbursementClaim(){
  const [items,setItems]=useState([{id:1,date:"2026-05-20",cat:"Stationery",desc:"",amount:0}]);
  const [nextId,setNextId]=useState(2);
  const addItem=()=>{setItems(it=>[...it,{id:nextId,date:"2026-05-20",cat:"Travel",desc:"",amount:0}]);setNextId(n=>n+1);};
  const removeItem=id=>setItems(it=>it.filter(x=>x.id!==id));
  const total=items.reduce((s,x)=>s+x.amount,0);
  const inp={padding:"6px 8px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:11.5,width:"100%"};
  const cats=["Travel","Meals","Stationery","Internet","Mobile","Equipment","Training","Other"];
  return(
    <PHASE2_Page title="Reimbursement Claim" subtitle="Submit expense claims for approval and payment">
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={cardStyle}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Claim Line Items</p>
              <button onClick={addItem} style={{padding:"5px 12px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:5,fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add Row</button>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Date</th><th style={RPT_thStyle}>Category</th><th style={RPT_thStyle}>Description</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th><th style={RPT_thStyle}>Receipt</th><th style={RPT_thStyle}/></tr></thead>
              <tbody>
                {items.map(it=>(
                  <tr key={it.id} style={{borderBottom:"1px solid #dfe2e7"}}>
                    <td style={{padding:"6px 8px"}}><input type="date" defaultValue={it.date} style={{...inp,width:120}}/></td>
                    <td style={{padding:"6px 8px"}}><select style={inp}>{cats.map(c=><option key={c} selected={c===it.cat}>{c}</option>)}</select></td>
                    <td style={{padding:"6px 8px"}}><input placeholder="Brief description…" style={inp}/></td>
                    <td style={{padding:"6px 8px"}}><input type="number" defaultValue={it.amount||""} onChange={e=>{const v=+e.target.value;setItems(a=>a.map(x=>x.id===it.id?{...x,amount:v}:x));}} placeholder="0" style={{...inp,textAlign:"right",fontFamily:"monospace",fontWeight:700,width:90}}/></td>
                    <td style={{padding:"6px 8px",textAlign:"center"}}><button style={{padding:"3px 8px",background:"#f7f8fb",border:"1px dashed #cbd0dc",borderRadius:4,fontSize:10,cursor:"pointer",color:"#5a6691"}}>📎 Upload</button></td>
                    <td style={{padding:"6px 8px"}}>{items.length>1&&<button onClick={()=>removeItem(it.id)} style={{padding:"3px 6px",background:"transparent",border:"none",color:"#A32D2D",fontSize:14,cursor:"pointer"}}>×</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,padding:"10px 8px",background:"#f7f8fb",borderRadius:6}}>
              <span style={{fontSize:12,fontWeight:700,color:"#0d1326"}}>Total Claim</span>
              <span style={{fontSize:16,fontWeight:700,color:"#0d1326",fontFamily:"monospace"}}>{fmtINR(total)}</span>
            </div>
            <div style={{marginTop:10}}><label style={{fontSize:11,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.4px"}}>Additional Notes</label><textarea rows={2} style={{...inp,fontFamily:"inherit",resize:"none",fontSize:12}} placeholder="Any context or special instructions…"/></div>
            <div style={{marginTop:12,display:"flex",justifyContent:"flex-end"}}><button style={{padding:"9px 22px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer"}}>Submit Claim — {fmtINR(total)}</button></div>
          </div>
          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>My Claims History</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Claim ID</th><th style={RPT_thStyle}>Date</th><th style={RPT_thStyle}>Category</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th><th style={RPT_thStyle}>Paid On</th></tr></thead>
              <tbody>{MY_CLAIMS_DATA.map(c=>(<tr key={c.id} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5}}>{c.id}</td><td style={RPT_tdStyle}>{c.date}</td><td style={RPT_tdStyle}>{c.category}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(c.amount)}</td><td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:700,background:c.status==="Paid"||c.status==="Approved"?"#d4edda":"#fff3cd",color:c.status==="Paid"||c.status==="Approved"?"#155724":"#856404"}}>{c.status}</span></td><td style={{...RPT_tdStyle,fontSize:11,color:"#5a6691"}}>{c.paid}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
        <div style={{padding:14,background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,height:"fit-content"}}>
          <p style={{margin:"0 0 10px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Policy Limits</p>
          {[{cat:"Travel",limit:"₹2,000/trip"},  {cat:"Meals",limit:"₹500/day"},{cat:"Stationery",limit:"₹1,500/month"},{cat:"Internet",limit:"₹500/month"},{cat:"Equipment",limit:"Mgr approval"},{cat:"Training",limit:"₹10,000/year"}].map(p=>(
            <div key={p.cat} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #dfe2e7",fontSize:11.5}}>
              <span style={{color:"#5a6691"}}>{p.cat}</span><span style={{fontWeight:700,color:"#0d1326"}}>{p.limit}</span>
            </div>
          ))}
          <p style={{margin:"10px 0 0",fontSize:10.5,color:"#5a6691"}}>Original receipts required for claims &gt; ₹500. Approved within 3 working days.</p>
        </div>
      </div>
    </PHASE2_Page>
  );
}
