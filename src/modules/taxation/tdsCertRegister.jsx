import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { todayISO } from '../../core/dates';
import { card, btnG, btnGh, inp } from '../../core/styleTokens';

export const _TDS_CERTS=[];

export function TdsCertRegister({branch}){
  const [certs,setCerts]=useState(_TDS_CERTS);
  const [quarter,setQuarter]=useState("All");
  const QUARTERS=["All","Q4 FY25-26","Q3 FY25-26","Q2 FY25-26","Q1 FY25-26"];
  const STATUS_CLR={Pending:"#A32D2D",Issued:"#185FA5",Acknowledged:"#27500A"};
  const STATUS_BG={Pending:"#FCEBEB",Issued:"#E6F1FB",Acknowledged:"#EAF3DE"};
  const TODAY=todayISO();
  const daysLeft=d=>d?Math.ceil((new Date(d)-new Date(TODAY))/(1000*60*60*24)):null;

  const filtered=certs.filter(c=>quarter==="All"||c.quarter===quarter);
  const pending=filtered.filter(c=>c.status==="Pending").length;
  const totTds=filtered.reduce((s,c)=>s+c.tdsAmt,0);

  return (
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📜</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>TDS Certificate Register — Form 16A</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Track certificates issued to vendors · Quarterly · Section 194C/H/J/D</p>
          </div>
        </div>
        <select value={quarter} onChange={e=>setQuarter(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {QUARTERS.map(q=><option key={q}>{q}</option>)}
        </select>
      </div>

      {pending>0&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600,display:"flex",gap:8}}>
        <AlertTriangle size={15}/> {pending} Form 16A certificate{pending>1?"s":""} pending issuance. Due by quarter-end — failure to issue attracts penalty ₹100/day.
      </div>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[{l:"Total Certs",v:String(filtered.length),c:"#384677",bg:"#f3f4f8"},
          {l:"Pending Issue",v:String(pending),c:"#A32D2D",bg:"#FCEBEB"},
          {l:"Issued",v:String(filtered.filter(c=>c.status==="Issued").length),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Acknowledged",v:String(filtered.filter(c=>c.status==="Acknowledged").length),c:"#27500A",bg:"#EAF3DE"},
          {l:"Total TDS Covered",v:"₹"+totTds.toLocaleString(),c:"#854F0B",bg:"#FAEEDA"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Certificate ID","Vendor","PAN","Section","Quarter","TDS Amount","Cert No.","Issued On","Due Date","Status","Action"].map((h,i)=>(
              <th key={i} style={{padding:"9px 11px",textAlign:i===5?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((c,i)=>{
            const dl=daysLeft(c.dueDate);
            return (
              <tr key={c.id} style={{borderBottom:"1px solid #dfe2e7",background:c.status==="Pending"&&dl&&dl<14?"#fff5f5":i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:9.5,color:"#185FA5"}}>{c.id}</td>
                <td style={{padding:"8px 11px",fontWeight:600,color:"#0d1326"}}>{c.vendor}</td>
                <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:9.5,color:"#5a6691"}}>{c.pan}</td>
                <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{c.section}</span></td>
                <td style={{padding:"8px 11px",color:"#384677"}}>{c.quarter} ({c.period})</td>
                <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>₹{c.tdsAmt.toLocaleString()}</td>
                <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:9.5,color:c.certNo?"#27500A":"#bfc3d6"}}>{c.certNo||"Pending"}</td>
                <td style={{padding:"8px 11px",color:"#5a6691",whiteSpace:"nowrap"}}>{c.issued||"—"}</td>
                <td style={{padding:"8px 11px",color:dl&&dl<14?"#A32D2D":"#5a6691",fontWeight:dl&&dl<14?700:400,whiteSpace:"nowrap"}}>{c.dueDate}</td>
                <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[c.status]||"#f3f4f8",color:STATUS_CLR[c.status]||"#5a6691"}}>{c.status}</span></td>
                <td style={{padding:"8px 11px"}}>
                  {c.status==="Pending"&&<button onClick={()=>setCerts(cs=>cs.map(x=>x.id===c.id?{...x,status:"Issued",issued:TODAY,certNo:`CERT-${c.quarter.replace(/ /g,"-")}-${String(Math.floor(Math.random()*900)+100)}`}:x))} style={{...btnG,padding:"2px 8px",fontSize:9.5,background:"#185FA5",whiteSpace:"nowrap"}}>Issue 16A</button>}
                  {c.status==="Issued"&&<button onClick={()=>setCerts(cs=>cs.map(x=>x.id===c.id?{...x,status:"Acknowledged"}:x))} style={{...btnGh,padding:"2px 8px",fontSize:9.5,whiteSpace:"nowrap"}}>Acknowledged</button>}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}
