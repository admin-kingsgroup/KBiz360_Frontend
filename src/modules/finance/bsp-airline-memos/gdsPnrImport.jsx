/* ════════════════════════════════════════════════════════════════════
   GDS PNR IMPORT
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of transactions/legacy.jsx
   into its business sub-module folder — MENU_FINANCE ▸ BSP & Airline Memos
   ▸ "GDS / PNR Import" (href /purchase/gds-import). transactions/index.js
   re-exports GdsPnrImport from here so App.jsx's barrel import needed zero
   changes.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { useMobile } from '../../../core/hooks';
import { FL, card, inp, btnG, btnGh, bc } from '../../../core/styles';

export function GdsPnrImport({branch,setRoute}){
  const mob=useMobile();
  const [pnr,setPnr]=useState("");
  const [gds,setGds]=useState("Amadeus");
  const [parsed,setParsed]=useState(null);
  const [loading,setLoading]=useState(false);

  const parsePnr=()=>{
    if(!pnr.trim())return;
    setLoading(true);
    setTimeout(()=>{
      /* Simulate GDS PNR parse */
      setParsed({
        pnr:pnr.trim().toUpperCase(),gds,airline:"Air India",
        sectors:[{from:"BOM",to:"DXB",date:"2026-07-15",flight:"AI-131",class:"Y",dep:"09:30",arr:"11:30"}],
        pax:[{name:"SHARMA RAJIV MR",type:"ADT",ticket:"098-2156789099"}],
        fare:41000,taxes:8200,total:49200,currency:"INR",
        status:"Ticketed",fareClass:"Y",fareBasis:"YOWUS",
      });
      setLoading(false);
    },800);
  };

  const createVoucher=()=>{
    setRoute&&setRoute("/purchase/flight");
  };

  return (
    <div style={{padding:"12px 10px",maxWidth:800,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#e8f6ed",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>✈</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>GDS PNR Import</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>Paste PNR from Amadeus / Sabre / Galileo → auto-fill ticket details</p>
        </div>
      </div>

      <div style={{...card,marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"auto 1fr auto",gap:10,alignItems:"flex-end"}}>
          <FL label="GDS System"><select value={gds} onChange={e=>setGds(e.target.value)} style={{...inp,minWidth:130}}><option>Amadeus</option><option>Sabre</option><option>Galileo</option><option>Direct Airline</option></select></FL>
          <FL label="PNR / Booking Reference"><input value={pnr} onChange={e=>setPnr(e.target.value.toUpperCase())} style={{...inp,fontFamily:"monospace",textTransform:"uppercase",fontSize:14,fontWeight:700,letterSpacing:2}} placeholder="ABCDE1" maxLength={8}/></FL>
          <div style={{paddingBottom:2}}><button onClick={parsePnr} disabled={!pnr.trim()||loading} className="max-tablet:min-h-[44px] max-tablet:w-full" style={{...btnG,padding:"10px 16px",fontSize:12,opacity:!pnr.trim()||loading?0.6:1}}>{loading?"Fetching...":"Fetch PNR →"}</button></div>
        </div>
      </div>

      {parsed&&(
        <div style={{...card}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22"}}>PNR: <span style={{fontFamily:"monospace",color:"#2563eb"}}>{parsed.pnr}</span> — {parsed.gds}</p>
            <span style={{fontSize:11,padding:"3px 10px",borderRadius:999,background:"#e8f6ed",color:"#16a34a",fontWeight:700}}>{parsed.status}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:12,marginBottom:12}}>
            {[{l:"Airline",v:parsed.airline},{l:"Fare Class",v:`${parsed.fareClass} (${parsed.fareBasis})`},
              {l:"Base Fare",v:`${bc(branch).cur}${parsed.fare.toLocaleString()}`},{l:"Taxes & Fees",v:`${bc(branch).cur}${parsed.taxes.toLocaleString()}`},
              {l:"Total",v:`${bc(branch).cur}${parsed.total.toLocaleString()}`},{l:"Currency",v:parsed.currency},
            ].map((k,i)=>(
              <div key={i} style={{padding:"8px 12px",borderRadius:8,background:"#f4f5f7"}}>
                <p style={{margin:0,fontSize:9,color:"#5b616e",textTransform:"uppercase"}}>{k.l}</p>
                <p style={{margin:"2px 0 0",fontSize:13,fontWeight:700,color:"#1a1c22"}}>{k.v}</p>
              </div>
            ))}
          </div>
          <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#1a1c22"}}>Sectors</p>
          {parsed.sectors.map((s,i)=>(
            <div key={i} style={{padding:"10px 14px",borderRadius:9,background:"#e8f0ff",marginBottom:8,display:"flex",gap:16,alignItems:"center"}}>
              <span style={{fontSize:18,fontWeight:800,color:"#2563eb"}}>{s.from}</span>
              <span style={{fontSize:14,color:"#5b616e"}}>✈ {s.flight} · {s.date}</span>
              <span style={{fontSize:18,fontWeight:800,color:"#2563eb"}}>{s.to}</span>
              <span style={{fontSize:11,color:"#5b616e"}}>{s.dep} → {s.arr} · {s.class}</span>
            </div>
          ))}
          <p style={{margin:"12px 0 6px",fontSize:11,fontWeight:700,color:"#1a1c22"}}>Passengers</p>
          {parsed.pax.map((p,i)=>(
            <div key={i} style={{padding:"8px 12px",borderRadius:8,background:"#f4f5f7",display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontWeight:600,color:"#1a1c22"}}>{p.name}</span>
              <span style={{fontFamily:"monospace",fontSize:10,color:"#2563eb"}}>{p.ticket}</span>
            </div>
          ))}
          <div style={{marginTop:14,display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={()=>setParsed(null)} style={btnGh}>Clear</button>
            <button onClick={createVoucher} style={{...btnG,background:"#16a34a"}}>📋 Create Purchase Voucher</button>
          </div>
        </div>
      )}
    </div>
  );
}
