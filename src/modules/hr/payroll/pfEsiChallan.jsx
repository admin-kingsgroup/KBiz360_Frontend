/* ── PF/ESI Challan (/hr/pf-esi) ──────────────────────────────── */

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useMobile } from '../../../core/hooks';
import { usePayrollRegister, useChallans, useMarkChallanPaid } from '../usePayroll';
import { challanDueDate, isIndiaRegime as isIndiaRegimeCode, regimeName as regimeNameOf } from '../payrollMaps';
import { toast } from '../../../core/ux/toast';
import { FL, btnG, card, inp } from '../../../core/styles';
import { Skeleton, isViewOnly, VIEW_ONLY_REASON } from '../../../shell/primitives';

export function PfEsiChallan({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?"BOM":branch?.code||"BOM";
  // Rolling last-6-months from the live clock (was frozen at Mar–May 2026).
  const MONTHS=(()=>{const out=[];const d=new Date();for(let i=0;i<6;i++){const dt=new Date(d.getFullYear(),d.getMonth()-i,1);out.push({v:`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`,l:dt.toLocaleString("en",{month:"short"})+" "+dt.getFullYear()});}return out;})();
  const [month,setMonth]=useState(MONTHS[0].v);
  const [tab,setTab]=useState("pf"); // pf | esi | pt
  /* Server-side payroll register for this branch × month (persisted lines when
     the run is processed, else a live preview): the challan figures mirror the
     payroll register — never a second client-side computation with its own rates. */
  const regC=usePayrollRegister(brCode,month);
  const lines=regC.rows;
  const rates=regC.rates;
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const DUE_DATE=challanDueDate(month);
  // PF/ESI/Professional Tax are INDIAN statutory remittances — this whole screen is India-only.
  // A foreign (Africa) branch has none, so tell the user plainly instead of showing empty challans.
  const isIndiaRegime=isIndiaRegimeCode(regC.statutoryRegime);
  const regimeName=regimeNameOf(regC.statutoryRegime);

  // PF register rows (UAN/ESIC numbers aren't on the employee master yet — display placeholders)
  const pfData=lines.map((e,i)=>({
    name:e.name,uan:"100"+String(i+123456789).slice(-9),
    basic:e.basic,empPF:e.empPF,emplPF:e.empPFr,empEPS:e.eps,emplEPS:e.eps,
  }));
  const totEmpPF=regC.totals.empPF;
  const totEmplPF=regC.totals.empPFr;
  const totEPS=regC.totals.eps;
  const totalPFChallan=totEmpPF+totEmplPF;

  // ESI register rows (server-side eligibility: gross ≤ configured ceiling)
  const esiData=lines.filter(e=>e.esiEligible).map((e,i)=>({
    name:e.name,esic:"31"+String(i+10000000).slice(-8),
    gross:e.gross,empESI:e.empESI,emplESI:e.empESIr,
  }));
  const totEmpESI=regC.totals.empESI;
  const totEmplESI=regC.totals.empESIr;

  // PT register rows (configured slab, applied server-side)
  const ptData=lines.filter(e=>e.profTax>0).map(e=>({name:e.name,gross:e.gross,pt:e.profTax}));
  const totPT=regC.totals.profTax;

  /* PERSISTED challan payment records — "Mark Paid" upserts one record per
     (month, branch, type) via PUT /api/payroll-runs/challans; the local state
     below is just the entry form, hydrated from the saved record. */
  const challansQ=useChallans(brCode,month);
  const markPaid=useMarkChallanPaid();
  const vo=isViewOnly();
  const savedPF=challansQ.byType.PF||null;
  const savedESI=challansQ.byType.ESI||null;
  const [challanPF,setChallanPF]=useState({bsr:"",date:"",trn:""});
  const [challanESI,setChallanESI]=useState({bsr:"",date:"",trn:""});
  useEffect(()=>{ setChallanPF({bsr:savedPF?.bsr||"",date:savedPF?.paidDate||"",trn:savedPF?.trn||""}); },[savedPF?.id,savedPF?.updatedAt,month,brCode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{ setChallanESI({bsr:savedESI?.bsr||"",date:savedESI?.paidDate||"",trn:savedESI?.trn||""}); },[savedESI?.id,savedESI?.updatedAt,month,brCode]); // eslint-disable-line react-hooks/exhaustive-deps
  const recordChallan=(type,form,amount)=>{
    if(markPaid.isPending) return;
    markPaid.mutate({month,branch:brCode,type,bsr:form.bsr,trn:form.trn,paidDate:form.date,amount:Math.round(amount),status:"Paid"},{
      onSuccess:()=>toast(`${type} challan marked paid — ${month}`),
      onError:e=>toast(e?.message||"Could not record challan payment","error")});
  };

  return(
    <div style={{padding:"20px 32px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📋</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>PF / ESI Challan Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{MONTHS.find(m=>m.v===month)?.l} · Due by {DUE_DATE} · OLTAS Challan</p>
          </div>
        </div>
        <select value={month} onChange={e=>setMonth(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {MONTHS.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
      </div>

      {/* Non-India notice — PF/ESI/PT don't exist for a foreign branch (never a silent empty screen). */}
      {!regC.isLoading&&!isIndiaRegime&&(
        <div role="note" style={{marginBottom:12,padding:"11px 14px",borderRadius:9,background:"#FFF7E6",border:"1px solid #E7C877",fontSize:11.5,color:"#7A5B12",lineHeight:1.55}}>
          🌍 <b>Not applicable to the {regimeName} branch.</b> PF, ESI and Professional Tax are Indian statutory remittances — they don't apply here, so there are no challans to file. {regimeName}'s own statutory contributions (e.g. NSSF / NHIF / PAYE) are handled outside this India-specific screen.
        </div>
      )}

      {/* Alert */}
      {isIndiaRegime&&(
        <div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:10.5,color:"#854F0B",fontWeight:600}}>
          <AlertTriangle size={14} style={{display:"inline",marginRight:6}}/> PF challan due: <b>{DUE_DATE}</b> · Late filing: 1% simple interest per month + penalty up to ₹10,000 per day
        </div>
      )}

      {/* Summary KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Total PF Challan",v:f(totalPFChallan),c:"#854F0B",bg:"#FAEEDA"},
          {l:"Employee PF (12%)",v:f(totEmpPF),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Employer PF (12%)",v:f(totEmplPF),c:"#185FA5",bg:"#E6F1FB"},
          {l:"ESI Challan",v:f(totEmpESI+totEmplESI),c:"#1D9E75",bg:"#EAF3DE"},
          {l:"Prof. Tax (PT)",v:f(totPT),c:"#384677",bg:"#f3f4f8"},
          {l:"Eligible EPS emps",v:String(pfData.length),c:"#5a6691",bg:"#f3f4f8"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"10px 12px",background:k.bg}}>
            <p style={{margin:0,fontSize:8.5,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"3px 0 0",fontSize:mob?15:18,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,background:"#f3f4f8",borderRadius:"9px 9px 0 0",border:"1px solid #cdd1d8"}}>
        <button onClick={()=>setTab("pf")} style={{flex:1,padding:"8px",border:"none",cursor:"pointer",fontWeight:tab==="pf"?700:500,background:tab==="pf"?"#fff":"transparent",borderRadius:6}}>🏦 PF Register</button><button onClick={()=>setTab("esi")} style={{flex:1,padding:"8px",border:"none",cursor:"pointer",fontWeight:tab==="esi"?700:500,background:tab==="esi"?"#fff":"transparent",borderRadius:6}}>🏥 ESI Register</button><button onClick={()=>setTab("pt")} style={{flex:1,padding:"8px",border:"none",cursor:"pointer",fontWeight:tab==="pt"?700:500,background:tab==="pt"?"#fff":"transparent",borderRadius:6}}>📋 Prof. Tax</button>
      </div>

      {tab==="pf"&&(
        <div style={{...card,borderTop:"none",borderRadius:"0 0 9px 9px",padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Employee","UAN","Basic","Emp PF (12%)","Empl PF (12%)","EPS","Total PF"].map((h,i)=>(
                <th key={i} style={{padding:"8px 12px",textAlign:i>=2?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{regC.isLoading?(
              Array.from({length:5}).map((_,i)=>(
                <tr key={`sk-${i}`}><td colSpan={7} style={{padding:10}}><Skeleton className="h-4 w-full" style={{opacity:Math.max(0.4,1-i*0.15)}} /></td></tr>
              ))
            ):pfData.length===0&&(
              <tr><td colSpan={7} style={{padding:"20px",textAlign:"center",color:"#5a6691",fontSize:11}}>
                No payroll lines for this month — add employees or process the run.
              </td></tr>
            )}{pfData.map((e,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"7px 12px",fontWeight:600,color:"#0d1326"}}>{e.name}</td>
                <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:10,color:"#5a6691"}}>{e.uan}</td>
                <td style={{padding:"7px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(e.basic)}</td>
                <td style={{padding:"7px 12px",textAlign:"right",color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{f(e.empPF)}</td>
                <td style={{padding:"7px 12px",textAlign:"right",color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>{f(e.emplPF)}</td>
                <td style={{padding:"7px 12px",textAlign:"right",color:"#5a6691",fontVariantNumeric:"tabular-nums"}}>{f(e.emplEPS)}</td>
                <td style={{padding:"7px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(e.empPF+e.emplPF)}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
              <td colSpan={3} style={{padding:"8px 12px",fontWeight:700,color:"#d4a437",fontSize:11}}>TOTAL PF CHALLAN</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(totEmpPF)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#B5D4F4",fontVariantNumeric:"tabular-nums"}}>{f(totEmplPF)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",color:"#8b94b3",fontVariantNumeric:"tabular-nums"}}>{f(totEPS)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totalPFChallan)}</td>
            </tr></tfoot>
          </table>
          {/* Challan entry — persisted per (month, branch, type) */}
          <div style={{padding:"12px 14px",background:"#f9fafb",borderTop:"1px solid #cdd1d8"}}>
            <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Record PF Challan Payment</p>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
              <FL label="BSR Code"><input value={challanPF.bsr} onChange={e=>setChallanPF(c=>({...c,bsr:e.target.value}))} style={{...inp,fontFamily:"monospace",width:120}} placeholder="0600115"/></FL>
              <FL label="Challan Date"><input type="date" value={challanPF.date} onChange={e=>setChallanPF(c=>({...c,date:e.target.value}))} style={{...inp,width:150}}/></FL>
              <FL label="TRN / Ref No."><input value={challanPF.trn} onChange={e=>setChallanPF(c=>({...c,trn:e.target.value}))} style={{...inp,fontFamily:"monospace",width:160}} placeholder="CRN123456"/></FL>
              <button onClick={()=>recordChallan("PF",challanPF,totalPFChallan)} disabled={markPaid.isPending||vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...btnG,background:"#27500A",fontSize:11,marginBottom:4,...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>{markPaid.isPending?"Saving…":`✔ Mark PF Paid — ${f(totalPFChallan)}`}</button>
            </div>
            {savedPF?.status==="Paid"&&<p style={{margin:"8px 0 0",fontSize:11,color:"#27500A",fontWeight:700}}>✅ PF Challan marked as paid · BSR {savedPF.bsr||"—"} · {savedPF.paidDate||"—"} · {f(savedPF.amount||0)}</p>}
          </div>
        </div>
      )}

      {tab==="esi"&&(
        <div style={{...card,borderTop:"none",borderRadius:"0 0 9px 9px",padding:0,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",background:"#EAF3DE",borderBottom:"1px solid #C0DD97",fontSize:10.5,color:"#27500A"}}>
            ESI applicable for employees with gross salary ≤ ₹{Number(rates?.esi?.grossCeiling??21000).toLocaleString("en-IN")}/month. Employee: {rates?.esi?.employeePct??0.75}% · Employer: {rates?.esi?.employerPct??3.25}% · Due by 15th of following month
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Employee","ESIC No.","Gross","Emp ESI (0.75%)","Empl ESI (3.25%)","Total ESI"].map((h,i)=>(
                <th key={i} style={{padding:"8px 12px",textAlign:i>=2?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{esiData.map((e,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"7px 12px",fontWeight:600,color:"#0d1326"}}>{e.name}</td>
                <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:10,color:"#5a6691"}}>{e.esic}</td>
                <td style={{padding:"7px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(e.gross)}</td>
                <td style={{padding:"7px 12px",textAlign:"right",color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{f(e.empESI)}</td>
                <td style={{padding:"7px 12px",textAlign:"right",color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>{f(e.emplESI)}</td>
                <td style={{padding:"7px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(e.empESI+e.emplESI)}</td>
              </tr>
            ))}
            {esiData.length===0&&<tr><td colSpan={6} style={{padding:"20px",textAlign:"center",color:"#5a6691"}}>No employees eligible for ESI (all earning &gt;₹{Number(rates?.esi?.grossCeiling??21000).toLocaleString("en-IN")})</td></tr>}
            </tbody>
            <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
              <td colSpan={3} style={{padding:"8px 12px",fontWeight:700,color:"#d4a437",fontSize:11}}>TOTAL ESI CHALLAN</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(totEmpESI)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#B5D4F4",fontVariantNumeric:"tabular-nums"}}>{f(totEmplESI)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totEmpESI+totEmplESI)}</td>
            </tr></tfoot>
          </table>
          {/* Challan entry — persisted per (month, branch, type) */}
          <div style={{padding:"12px 14px",background:"#f9fafb",borderTop:"1px solid #cdd1d8"}}>
            <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Record ESI Challan Payment</p>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
              <FL label="BSR Code"><input value={challanESI.bsr} onChange={e=>setChallanESI(c=>({...c,bsr:e.target.value}))} style={{...inp,fontFamily:"monospace",width:120}} placeholder="0600115"/></FL>
              <FL label="Challan Date"><input type="date" value={challanESI.date} onChange={e=>setChallanESI(c=>({...c,date:e.target.value}))} style={{...inp,width:150}}/></FL>
              <FL label="TRN / Ref No."><input value={challanESI.trn} onChange={e=>setChallanESI(c=>({...c,trn:e.target.value}))} style={{...inp,fontFamily:"monospace",width:160}} placeholder="CRN123456"/></FL>
              <button onClick={()=>recordChallan("ESI",challanESI,totEmpESI+totEmplESI)} disabled={markPaid.isPending||vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...btnG,background:"#27500A",fontSize:11,marginBottom:4,...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>{markPaid.isPending?"Saving…":`✔ Mark ESI Paid — ${f(totEmpESI+totEmplESI)}`}</button>
            </div>
            {savedESI?.status==="Paid"&&<p style={{margin:"8px 0 0",fontSize:11,color:"#27500A",fontWeight:700}}>✅ ESI Challan marked as paid · BSR {savedESI.bsr||"—"} · {savedESI.paidDate||"—"} · {f(savedESI.amount||0)}</p>}
          </div>
        </div>
      )}

      {tab==="pt"&&(
        <div style={{...card,borderTop:"none",borderRadius:"0 0 9px 9px",padding:0,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",background:"#E6F1FB",borderBottom:"1px solid #B5D4F4",fontSize:10.5,color:"#185FA5"}}>
            Professional Tax (Maharashtra) slab: {(rates?.pt?.slabs||[]).slice().reverse().map(s=>`>₹${Number(s.above).toLocaleString("en-IN")} → ₹${s.amount}`).join(" · ")||"—"} · Paid to state govt via mahagst.gov.in · Monthly challan
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#0d1326"}}>{["Employee","Gross Salary","PT Applicable","PT Amount"].map((h,i)=><th key={i} style={{padding:"8px 12px",textAlign:i>=1?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>{h}</th>)}</tr></thead>
            <tbody>{ptData.map((e,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"7px 12px",fontWeight:600,color:"#0d1326"}}>{e.name}</td>
                <td style={{padding:"7px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(e.gross)}</td>
                <td style={{padding:"7px 12px",textAlign:"right"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#EAF3DE",color:"#27500A",fontWeight:700}}>Yes</span></td>
                <td style={{padding:"7px 12px",textAlign:"right",fontWeight:700,color:"#384677",fontVariantNumeric:"tabular-nums"}}>{f(e.pt)}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
              <td colSpan={3} style={{padding:"8px 12px",fontWeight:700,color:"#d4a437",fontSize:11}}>TOTAL PT — {ptData.length} employees</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totPT)}</td>
            </tr></tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
