/* ════════════════════════════════════════════════════════════════════
   SHELL/GLOBALSEARCH.JSX
   Auto-generated from KBiz360_v2.jsx · 86 lines · 1 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { BRANCHES, GP_BILLS } from '../core/data';
import { btnGh, card, inp } from '../core/styles';

export function GlobalSearch({setRoute}){
  const [q,setQ]=useState("");
  const [results,setResults]=useState([]);
  const MOD_ROUTES={Flight:"/sales/flight",Holiday:"/sales/holiday",Hotel:"/sales/hotel",
    Car:"/sales/car",Visa:"/sales/visa",Insurance:"/sales/insurance",Misc:"/sales/misc"};

  useEffect(()=>{
    if(!q||q.length<2){setResults([]);return;}
    const lower=q.toLowerCase();
    const hits=GP_BILLS.filter(b=>
      b.id.toLowerCase().includes(lower)||
      b.client.toLowerCase().includes(lower)||
      b.dest.toLowerCase().includes(lower)||
      b.supplier.toLowerCase().includes(lower)||
      b.consultant.toLowerCase().includes(lower)||
      b.airline.toLowerCase().includes(lower)
    ).slice(0,20).map(b=>({...b,gp:b.sell-b.cost,gpPct:+((b.sell-b.cost)/b.sell*100).toFixed(1)}));
    setResults(hits);
  },[q]);

  const cfg2=b=>BRANCHES.find(x=>x.code===b)||{cur:"₹"};

  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:36,height:36,borderRadius:9,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center"}}><Search size={18} style={{color:"#185FA5"}}/></div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Global Search</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Search across all vouchers — voucher no., client, destination, airline, consultant</p>
        </div>
      </div>
      <input autoFocus value={q} onChange={e=>setQ(e.target.value)}
        placeholder="Type voucher number, client name, destination, airline..."
        style={{...inp,width:"100%",fontSize:14,padding:"12px 16px",marginBottom:12}}/>
      {q.length>=2&&results.length===0&&<p style={{textAlign:"center",color:"#5a6691",padding:"24px"}}>No results for "{q}"</p>}
      {results.length>0&&(
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <div style={{padding:"8px 14px",background:"#f3f4f8",fontSize:10,color:"#5a6691",fontWeight:600}}>{results.length} result{results.length!==1?"s":""} for "{q}"</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Voucher No.","Date","Module","Client","Destination","Airline/Supplier","Consultant","Branch","Revenue","GP%","Open"].map((h,i)=>(
                <th key={i} style={{padding:"8px 10px",textAlign:i>=8&&i<=9?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{results.map((r,i)=>{
              const bc2=cfg2(r.branch);
              return (
                <tr key={r.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa",cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f0f4ff"}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#fafafa"}
                  onClick={()=>setRoute(MOD_ROUTES[r.mod]||"/sales/flight")}>
                  <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:9.5,color:"#185FA5"}}>{r.id}</td>
                  <td style={{padding:"8px 10px",fontSize:10,color:"#5a6691"}}>{r.date}</td>
                  <td style={{padding:"8px 10px"}}><span style={{fontSize:9.5,padding:"2px 6px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{r.mod}</span></td>
                  <td style={{padding:"8px 10px",fontWeight:600,color:"#0d1326"}}>{r.client}</td>
                  <td style={{padding:"8px 10px",color:"#384677"}}>{r.dest}</td>
                  <td style={{padding:"8px 10px",fontSize:10,color:"#5a6691"}}>{r.airline||r.supplier}</td>
                  <td style={{padding:"8px 10px",fontSize:10,color:"#5a6691"}}>{r.consultant}</td>
                  <td style={{padding:"8px 10px"}}><span style={{fontSize:9.5,padding:"2px 6px",borderRadius:999,background:"#EAF3DE",color:"#27500A",fontWeight:700}}>{r.branch}</span></td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{bc2.cur}{Number(r.sell).toLocaleString()}</td>
                  <td style={{padding:"8px 10px",textAlign:"right"}}><span style={{fontSize:9.5,padding:"2px 6px",borderRadius:999,fontWeight:800,background:r.gpPct>=12?"#EAF3DE":"#FAEEDA",color:r.gpPct>=12?"#27500A":"#854F0B"}}>{r.gpPct}%</span></td>
                  <td style={{padding:"8px 10px"}}><button onClick={()=>setRoute(MOD_ROUTES[r.mod]||"/sales/flight")} style={{...btnGh,padding:"2px 8px",fontSize:9}}>Open</button></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
      {!q&&(
        <div style={{...card,padding:"24px",textAlign:"center"}}>
          <p style={{margin:"0 0 8px",fontSize:14,color:"#5a6691"}}>🔍 Start typing to search</p>
          <p style={{margin:0,fontSize:11,color:"#bfc3d6"}}>Searches across {GP_BILLS.length}+ vouchers — voucher numbers, clients, destinations, airlines, consultants</p>
        </div>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   ADM / ACM SYSTEM
   Agent Debit Memos (airline debits agency via BSP)
   Agent Credit Memos (airline credits agency via BSP)
   ════════════════════════════════════════════════════════════════ */

/* ── IATA ADM Reason Codes ── */
