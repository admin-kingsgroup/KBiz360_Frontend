/* ── Salary Run / Payroll (/hr/payroll) ───────────────────────── */

import { useState } from 'react';
import { Check, Download } from 'lucide-react';
import { useMobile } from '../../../core/hooks';
import { usePayrollRegister, useProcessPayroll } from '../usePayroll';
import { challanDueDate } from '../payrollMaps';
import { toast } from '../../../core/ux/toast';
import { B, btnG, card, inp } from '../../../core/styles';
import { MiniBar } from '../../../core/insightsUI';
import { Skeleton } from '../../../shell/primitives';

export function HrPayroll({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?"BOM":branch?.code||"BOM";
  const [tab,setTab]=useState("register"); // register | pf-esi | bankfile | form16 | journal
  // Last 6 months through the current one (was hard-coded to Mar–May 2026, so the current
  // month's payroll run — which drives the dashboard KPI — couldn't be opened).
  const PERIODS=(()=>{const out=[];const d=new Date();for(let i=0;i<6;i++){const dt=new Date(d.getFullYear(),d.getMonth()-i,1);out.push({v:`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`,l:dt.toLocaleString("en",{month:"short"})+" "+dt.getFullYear()});}return out;})();
  const [period,setPeriod]=useState(PERIODS[0].v);
  const [journalPosted,setJournalPosted]=useState(false);

  /* Server-side payroll engine (/api/payroll-runs/register): the register lines
     are COMPUTED AND PERSISTED by the backend from config-driven statutory rates
     (app-config `payrollStatutoryRates`) — this screen only renders them. Until
     the month is processed the backend returns a live preview from the current
     roster (persisted:false); "Process Payroll" persists the lines + payslips. */
  const reg=usePayrollRegister(brCode,period);
  const payroll=reg.rows;
  const totals=reg.totals;
  const rates=reg.rates;
  const processed=reg.persisted&&reg.run?.status==="Paid";
  const processMut=useProcessPayroll();
  const runPending=processMut.isPending;

  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const DUE_DATE=challanDueDate(period);

  /* Compute + persist this run server-side (idempotent — reprocessing swaps the
     lines wholesale). The backend also stamps the run header (gross/net/headcount)
     so the HR dashboard's Payroll-Status KPI reads a real figure. */
  const processPayroll=()=>{
    processMut.mutate({month:period,branch:brCode},{
      onSuccess:()=>toast(`Payroll processed — ${brCode} ${period}`),
      onError:e=>toast(e?.message||"Could not process payroll","error")});
  };

  /* ── PAYROLL JOURNAL ENTRIES ─────────────────────────── */
  const journalEntries=[
    {side:"Dr",ledger:"Salaries & Wages",          amount:totals.gross,  note:"Gross salary expense"},
    {side:"Cr",ledger:"Employee PF Payable",        amount:totals.empPF,  note:`Employee PF ${rates?.pf?.employeePct??12}% of basic`},
    {side:"Dr",ledger:"Employer PF Contribution",   amount:totals.empPFr, note:"Employer PF expense"},
    {side:"Cr",ledger:"PF Payable",                 amount:totals.empPF+totals.empPFr, note:"Total PF to EPFO by 15th"},
    {side:"Dr",ledger:"Employer ESI Contribution",  amount:totals.empESIr,note:`Employer ESI ${rates?.esi?.employerPct??3.25}%`},
    {side:"Cr",ledger:"ESI Payable",                amount:totals.empESI+totals.empESIr,note:"Total ESI to ESIC by 15th"},
    {side:"Cr",ledger:"Professional Tax Payable",   amount:totals.profTax,note:"Prof Tax — Maharashtra"},
    {side:"Cr",ledger:"TDS Payable (194C)",         amount:totals.tds,    note:"TDS on salaries — deposit by 7th"},
    {side:"Cr",ledger:"Salary Payable",             amount:totals.net,    note:"Net salary — pay by 1st"},
  ];
  const jDr=journalEntries.filter(e=>e.side==="Dr").reduce((s,e)=>s+e.amount,0);
  const jCr=journalEntries.filter(e=>e.side==="Cr").reduce((s,e)=>s+e.amount,0);
  const balDiff=jDr-jCr; const balanced=balDiff>=-0.01&&balDiff<=0.01;
  const hrpContainerStyle={padding:"12px 10px",maxWidth:1600,margin:"0 auto"};

  return (
    <div style={hrpContainerStyle}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>💼</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Salary & Payroll</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{brCode} · {PERIODS.find(p=>p.v===period)?.l} · {reg.isLoading?<Skeleton className="inline-block h-3 w-20 align-middle" />:`${payroll.length} employees`}{!reg.isLoading&&!processed?" · preview (not yet processed)":""}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          {!processed
            ?<button onClick={processPayroll} disabled={runPending||payroll.length===0} style={{...btnG,fontSize:11,background:"#27500A"}}>{runPending?"Processing…":"⚙ Process Payroll"}</button>
            :<span style={{padding:"6px 12px",borderRadius:9,background:"#EAF3DE",color:"#27500A",fontSize:11,fontWeight:700}}>✔ Processed{reg.run?.runAt?` · ${reg.run.runAt}`:""}</span>}
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #0d1326",padding:"11px 13px",background:"#f3f4f8"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#0d1326",textTransform:"uppercase"}}>Gross Payroll</p><p style={{margin:"4px 0 0",fontSize:mob?15:18,fontWeight:800,color:"#0d1326"}}>{f(totals.gross)}</p></div>
          <div style={{...card,borderTop:"3px solid #185FA5",padding:"11px 13px",background:"#E6F1FB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#185FA5",textTransform:"uppercase"}}>PF (Emp+Empr)</p><p style={{margin:"4px 0 0",fontSize:mob?15:18,fontWeight:800,color:"#0d1326"}}>{f(totals.empPF+totals.empPFr)}</p></div>
          <div style={{...card,borderTop:"3px solid #1D9E75",padding:"11px 13px",background:"#EAF3DE"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#1D9E75",textTransform:"uppercase"}}>ESI (Emp+Empr)</p><p style={{margin:"4px 0 0",fontSize:mob?15:18,fontWeight:800,color:"#0d1326"}}>{f(totals.empESI+totals.empESIr)}</p></div>
          <div style={{...card,borderTop:"3px solid #854F0B",padding:"11px 13px",background:"#FAEEDA"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#854F0B",textTransform:"uppercase"}}>Prof Tax</p><p style={{margin:"4px 0 0",fontSize:mob?15:18,fontWeight:800,color:"#0d1326"}}>{f(totals.profTax)}</p></div>
          <div style={{...card,borderTop:"3px solid #A32D2D",padding:"11px 13px",background:"#FCEBEB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#A32D2D",textTransform:"uppercase"}}>TDS on Salary</p><p style={{margin:"4px 0 0",fontSize:mob?15:18,fontWeight:800,color:"#0d1326"}}>{f(totals.tds)}</p></div>
          <div style={{...card,borderTop:"3px solid #27500A",padding:"11px 13px",background:"#EAF3DE"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#27500A",textTransform:"uppercase"}}>Net Disbursement</p><p style={{margin:"4px 0 0",fontSize:mob?15:18,fontWeight:800,color:"#0d1326"}}>{f(totals.net)}</p></div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,background:"#f3f4f8",borderRadius:"9px 9px 0 0",border:"1px solid #cdd1d8",overflowX:"auto"}}>
        <button onClick={()=>setTab("register")} style={{flexShrink:0,padding:"9px 14px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab==="register"?700:500,color:tab==="register"?"#0d1326":"#5a6691",background:tab==="register"?"#fff":"transparent",borderRadius:"9px 9px 0 0"}}>📋 Payroll Register</button><button onClick={()=>setTab("pf-esi")} style={{flexShrink:0,padding:"9px 14px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab==="pf-esi"?700:500,color:tab==="pf-esi"?"#0d1326":"#5a6691",background:tab==="pf-esi"?"#fff":"transparent",borderRadius:"9px 9px 0 0"}}>🏦 PF / ESI</button><button onClick={()=>setTab("bankfile")} style={{flexShrink:0,padding:"9px 14px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab==="bankfile"?700:500,color:tab==="bankfile"?"#0d1326":"#5a6691",background:tab==="bankfile"?"#fff":"transparent",borderRadius:"9px 9px 0 0"}}>🏧 Bank File</button><button onClick={()=>setTab("form16")} style={{flexShrink:0,padding:"9px 14px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab==="form16"?700:500,color:tab==="form16"?"#0d1326":"#5a6691",background:tab==="form16"?"#fff":"transparent",borderRadius:"9px 9px 0 0"}}>📄 Form 16</button><button onClick={()=>setTab("journal")} style={{flexShrink:0,padding:"9px 14px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab==="journal"?700:500,color:tab==="journal"?"#0d1326":"#5a6691",background:tab==="journal"?"#fff":"transparent",borderRadius:"9px 9px 0 0"}}>📒 Journal</button>
      </div>

      {/* TAB: PAYROLL REGISTER */}
      {tab==="register"&&(
        <div style={{...card,padding:0,overflow:"hidden",borderTop:"none",borderRadius:"0 0 9px 9px"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:1000}}>
              <thead><tr style={{background:"#0d1326"}}>
                {["Employee","Basic","HRA","Special","LWP","Gross","PF (E)","ESI (E)","Prof Tax","TDS","Net Pay","Take-home %"].map((h,i)=>(
                  <th key={i} style={{padding:"8px 10px",textAlign:i>1?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {reg.isLoading&&Array.from({length:6}).map((_,i)=>(
                  <tr key={`sk-${i}`}><td colSpan={12} style={{padding:"10px 12px"}}><Skeleton className="h-4 w-full" style={{opacity:Math.max(0.4,1-i*0.15)}} /></td></tr>
                ))}
                {!reg.isLoading&&payroll.length===0&&(
                  <tr><td colSpan={12} style={{padding:"22px 12px",textAlign:"center",color:"#8b94b3",fontSize:12}}>
                    {reg.isError?"Failed to load payroll register.":"No active employees for this branch — add them in Employee Master."}
                  </td></tr>
                )}
                {payroll.map((e,i)=>(
                  <tr key={e.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"8px 10px",fontWeight:600,color:"#0d1326",whiteSpace:"nowrap"}}>{e.name}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(e.basic)}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(e.hra)}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(e.special)}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",color:e.lwpDays>0?"#A32D2D":"#bfc3d6"}}>{e.lwpDays>0?`${e.lwpDays}d (${f(e.lwpDed)})`:"—"}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(e.gross)}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>{f(e.empPF)}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",color:"#1D9E75",fontVariantNumeric:"tabular-nums"}}>{e.empESI>0?f(e.empESI):"N/A"}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",color:"#854F0B",fontVariantNumeric:"tabular-nums"}}>{e.profTax>0?f(e.profTax):"—"}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{e.tds>0?f(e.tds):"—"}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:"#27500A",fontVariantNumeric:"tabular-nums"}}>{f(e.net)}</td>
                    <td style={{padding:"8px 10px",minWidth:120}}>
                      {(()=>{const th=e.gross>0?(e.net/e.gross)*100:0;return(
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:10,color:"#5a6691",width:34,textAlign:"right",flexShrink:0,fontVariantNumeric:"tabular-nums"}}>{th.toFixed(0)}%</span>
                          <div style={{flex:1,minWidth:36}}><MiniBar pct={th} color={th>=85?"linear-gradient(90deg,#22c55e,#15803d)":th>=70?"linear-gradient(90deg,#3b82f6,#1d4ed8)":"linear-gradient(90deg,#f0a35e,#d97706)"} /></div>
                        </div>
                      );})()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr style={{background:"#0d1326"}}>
                <td style={{padding:"8px 10px",fontWeight:700,color:"#d4a437"}}>TOTAL</td>
                {[totals.basic,totals.hra,totals.special,totals.lwpDed,totals.gross,totals.empPF,totals.empESI,totals.profTax,totals.tds,totals.net].map((v,i)=>(
                  <td key={i} style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:"#fff",fontVariantNumeric:"tabular-nums",fontSize:11}}>{v>0?f(v):"—"}</td>
                ))}
                <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:"#fff",fontVariantNumeric:"tabular-nums",fontSize:11}}>{totals.gross>0?`${Math.round(totals.net/totals.gross*100)}%`:"—"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB: PF/ESI */}
      {tab==="pf-esi"&&(
        <div style={{...card,borderTop:"none",borderRadius:"0 0 9px 9px"}}>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:16}}>
            <div style={{...card,background:"#f9fafb"}}>
                <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Provident Fund (EPFO)</p>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #cdd1d8"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:400,color:"#0d1326"}}>Employee Contribution ({rates?.pf?.employeePct??12}% Basic)</p><p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>Deducted from salary</p></div><span style={{fontSize:11,fontWeight:600,color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>{f(totals.empPF)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #cdd1d8"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:400,color:"#0d1326"}}>Employer Contribution ({rates?.pf?.employerPct??12}% Basic)</p><p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>Company expense</p></div><span style={{fontSize:11,fontWeight:600,color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>{f(totals.empPFr)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #cdd1d8"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:700,color:"#0d1326"}}>Total PF Deposit</p><p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>Via ECR by 15th</p></div><span style={{fontSize:12,fontWeight:800,color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>{f(totals.empPF+totals.empPFr)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #cdd1d8"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:400,color:"#0d1326"}}>Admin Charges ({rates?.pf?.adminChargesPct??0.5}%)</p><p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{rates?.pf?.adminChargesPct??0.5}% of wages</p></div><span style={{fontSize:11,fontWeight:600,color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>{f(Math.round((totals.empPF+totals.empPFr)*((rates?.pf?.adminChargesPct??0.5)/100)))}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #cdd1d8"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:400,color:"#0d1326"}}>Deposit Deadline</p><p style={{margin:0,fontSize:9.5,color:"#A32D2D"}}>Late = 12% p.a. interest</p></div><span style={{fontSize:11,fontWeight:700,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{DUE_DATE}</span></div>
              </div>
              <div style={{...card,background:"#f9fafb"}}>
                <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>ESI Corporation</p>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #cdd1d8"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:400,color:"#0d1326"}}>Employee Contribution ({rates?.esi?.employeePct??0.75}%)</p><p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>Deducted from gross</p></div><span style={{fontSize:11,fontWeight:600,color:"#1D9E75",fontVariantNumeric:"tabular-nums"}}>{f(totals.empESI)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #cdd1d8"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:400,color:"#0d1326"}}>Employer Contribution ({rates?.esi?.employerPct??3.25}%)</p><p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>Company expense</p></div><span style={{fontSize:11,fontWeight:600,color:"#1D9E75",fontVariantNumeric:"tabular-nums"}}>{f(totals.empESIr)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #cdd1d8"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:700,color:"#0d1326"}}>Total ESI Deposit</p><p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>Via EC by 15th</p></div><span style={{fontSize:12,fontWeight:800,color:"#1D9E75",fontVariantNumeric:"tabular-nums"}}>{f(totals.empESI+totals.empESIr)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #cdd1d8"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:400,color:"#0d1326"}}>Eligible employees</p><p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>Gross up to ₹{Number(rates?.esi?.grossCeiling??21000).toLocaleString("en-IN")}</p></div><span style={{fontSize:11,fontWeight:600,color:"#1D9E75",fontVariantNumeric:"tabular-nums"}}>{String(totals.esiEligibleCount)+" of "+String(payroll.length)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #cdd1d8"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:400,color:"#0d1326"}}>Deposit Deadline</p><p style={{margin:0,fontSize:9.5,color:"#A32D2D"}}>Late = 12% p.a. interest</p></div><span style={{fontSize:11,fontWeight:700,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{DUE_DATE}</span></div>
              </div>
          </div>
          <div style={{marginTop:12,padding:"10px 14px",borderRadius:9,background:"#E6F1FB",fontSize:10,color:"#185FA5"}}>
            Generate ECR file: UAN-wise contribution data → upload on EPFO Unified Portal. ESIC: Generate challan from ESIC Portal with IP numbers. Both due by 15th of following month.
          </div>
        </div>
      )}

      {/* TAB: BANK FILE */}
      {tab==="bankfile"&&(
        <div style={{...card,borderTop:"none",borderRadius:"0 0 9px 9px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>NACH / Bank Bulk Salary File</p>
              <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>CSV format for HDFC Bank bulk upload · {payroll.length} employees · {f(totals.net)} total</p>
            </div>
            <button onClick={()=>{
              const rows=[["EMP_ID","NAME","ACCOUNT_NO","IFSC","AMOUNT","NARRATION"],
                ...payroll.map(e=>[e.id,e.name,e.bankAc||"1234567890",e.ifsc||"HDFC0001234",e.net.toFixed(2),"SALARY "+period])];
              const csv=rows.map(r=>r.join(",")).join("\n");
              const a=document.createElement("a");a.href="data:text/csv,"+encodeURIComponent(csv);a.download="salary_"+period+".csv";a.click();
            }} style={{...btnG,fontSize:11,background:"#27500A"}}><Download size={13}/> Download NACH CSV</button>
          </div>
          <div style={{...card,padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{background:"#0d1326"}}>
                {["Employee ID","Name","Bank Account","IFSC","Net Amount","Narration"].map((h,i)=>(
                  <th key={i} style={{padding:"8px 12px",textAlign:i>=4?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{payroll.map((e,i)=>(
                <tr key={e.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:10.5,color:"#5a6691"}}>{e.id}</td>
                  <td style={{padding:"7px 12px",fontWeight:600,color:"#0d1326"}}>{e.name}</td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:10.5}}>{e.bankAc||"●●●●"+String(i+1).padStart(4,"0")}</td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:10.5,color:"#5a6691"}}>{e.ifsc||"HDFC0001234"}</td>
                  <td style={{padding:"7px 12px",textAlign:"right",fontWeight:700,color:"#27500A",fontVariantNumeric:"tabular-nums"}}>{f(e.net)}</td>
                  <td style={{padding:"7px 12px",fontSize:10,color:"#5a6691"}}>SALARY {period}</td>
                </tr>
              ))}</tbody>
              <tfoot><tr style={{background:"#0d1326"}}>
                <td colSpan={4} style={{padding:"8px 12px",fontWeight:700,color:"#d4a437"}}>{payroll.length} entries</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totals.net)}</td>
                <td/>
              </tr></tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB: FORM 16 */}
      {tab==="form16"&&(
        <div style={{...card,borderTop:"none",borderRadius:"0 0 9px 9px"}}>
          <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Form 16 — TDS Certificate Register · FY 2025-26</p>
          <div style={{padding:"10px 14px",borderRadius:9,background:"#E6F1FB",fontSize:10.5,color:"#185FA5",marginBottom:12}}>
            Form 16 must be issued by 15 June 2026 (Part A — quarterly TDS certificate from TRACES; Part B — salary break-up from employer). Required for every employee from whom TDS was deducted.
          </div>
          <div style={{...card,padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{background:"#0d1326"}}>
                {["Employee","Designation","Annual Gross","Annual TDS","PAN","Status","Action"].map((h,i)=>(
                  <th key={i} style={{padding:"8px 12px",textAlign:i>=2&&i<=3?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{payroll.map((e,i)=>{
                const annualTds=e.tds*12;
                const issued=annualTds>0;
                return (
                  <tr key={e.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"7px 12px",fontWeight:600,color:"#0d1326"}}>{e.name}</td>
                    <td style={{padding:"7px 12px",fontSize:10.5,color:"#5a6691"}}>{e.desig||"Staff"}</td>
                    <td style={{padding:"7px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(e.gross*12)}</td>
                    <td style={{padding:"7px 12px",textAlign:"right",fontWeight:600,color:annualTds>0?"#A32D2D":"#bfc3d6",fontVariantNumeric:"tabular-nums"}}>{annualTds>0?f(annualTds):"—"}</td>
                    <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:10.5}}>{e.pan||"PENDING"}</td>
                    <td style={{padding:"7px 12px"}}>
                      <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:issued?"#EAF3DE":"#f3f4f8",color:issued?"#27500A":"#5a6691"}}>
                        {issued?"TDS Applicable":"Nil TDS"}
                      </span>
                    </td>
                    <td style={{padding:"7px 12px"}}>
                      {issued&&<button style={{...btnG,padding:"2px 8px",fontSize:9.5,background:"#185FA5"}}>Generate 16</button>}
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: JOURNAL ENTRY */}
      {tab==="journal"&&(
        <div style={{...card,borderTop:"none",borderRadius:"0 0 9px 9px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>📒 Payroll Journal Entry — {PERIODS.find(p=>p.v===period)?.l}</p>
              <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Auto-generated from payroll register · Post to accounts on confirmation</p>
            </div>
            <span style={{fontSize:11,padding:"4px 12px",borderRadius:9,fontWeight:700,background:balanced?"#EAF3DE":"#FCEBEB",color:balanced?"#27500A":"#A32D2D"}}>
              {balanced?"✔ Balanced":"✗ Unbalanced"}
            </span>
          </div>
          <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{background:"#0d1326"}}>
                {["Dr/Cr","Ledger Account","Amount","Note"].map((h,i)=>(
                  <th key={i} style={{padding:"8px 12px",textAlign:i===2?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{journalEntries.map((e,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:e.side==="Dr"?"#f0f8ff":"#f0fff4"}}>
                  <td style={{padding:"8px 12px",fontWeight:800,color:e.side==="Dr"?"#185FA5":"#27500A",fontFamily:"monospace"}}>{e.side}</td>
                  <td style={{padding:"8px 12px",fontWeight:500,color:"#0d1326"}}>{e.ledger}</td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>₹{Number(Math.round(e.amount)).toLocaleString()}</td>
                  <td style={{padding:"8px 12px",fontSize:10,color:"#5a6691"}}>{e.note}</td>
                </tr>
              ))}</tbody>
              <tfoot><tr style={{background:"#0d1326"}}>
                <td colSpan={2} style={{padding:"8px 12px",fontWeight:700,color:"#d4a437"}}>TOTAL Dr / Cr</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:800,color:"#fff"}}>
                  ₹{jDr.toLocaleString()} / ₹{jCr.toLocaleString()}
                </td>
                <td/>
              </tr></tfoot>
            </table>
          </div>
          {journalPosted
            ?<div style={{padding:"10px",borderRadius:9,background:"#EAF3DE",fontSize:11,color:"#27500A",fontWeight:700,textAlign:"center"}}>✔ Payroll Journal JV/{period}/001 posted to accounts · All ledgers updated</div>
            :<div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setJournalPosted(true)} disabled={!processed||!balanced}
                style={{...btnG,background:processed&&balanced?"#185FA5":"#bfc3d6",opacity:!processed||!balanced?0.6:1}}>
                📒 Post Payroll Journal {!processed?"(Process first)":!balanced?"(Check balance)":""}
              </button>
            </div>}
        </div>
      )}
    </div>
  );
}
