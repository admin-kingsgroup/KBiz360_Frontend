/* ══════════════════════════════════════════════════════════════════
   4. PAYSLIP SELF-DOWNLOAD (/hr/my-payslip)
   ══════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { Download } from 'lucide-react';
import { openPrintPreview } from '../../../core/PrintPreview';
import { BRANCHES } from '../../../core/data';
import { localeOf } from '../../../core/format';
import { usePayslips, useMyEmployee } from '../usePayroll';
import { isIndiaRegime as isIndiaRegimeCode, regimeName as regimeNameOf } from '../payrollMaps';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';
import { SelfServiceGate, SS_MONTH_LABEL } from './selfServiceGate';
import { SkeletonText } from '../../../shell/primitives';

export function MyPayslip(){
  const my=useMyEmployee();
  return (
    <SelfServiceGate title="My Payslip" subtitle="View and download your monthly salary statement" my={my}>
      {(emp)=><MyPayslipBody emp={emp}/>}
    </SelfServiceGate>
  );
}

function MyPayslipBody({emp}){
  /* MY persisted payslips (server-side payroll engine) — months offered are the
     months actually processed; nothing is recomputed or invented here. */
  const {slips,isLoading}=usePayslips(emp.id);
  const [selMonth,setSelMonth]=useState("");
  const months=slips.map(s=>s.month);
  const curMonth=months.includes(selMonth)?selMonth:months[0]||"";
  const slip=slips.find(s=>s.month===curMonth)||null;
  const brCfg=BRANCHES.find(b=>b.code===emp.branch)||{entity:"Travkings Tours & Travels"};
  // Branch-currency aware payslip: a foreign (USD) branch employee must see their pay in $ with
  // Western grouping, not a hardcoded ₹ + Indian lakh/crore. `brCfg.cur` is the branch currency.
  const c=brCfg.cur||'₹';
  const fm=n=>c+Number(n||0).toLocaleString(localeOf(c));
  // Indian PF/ESI/PT/TDS apply to India branches only; a foreign branch's payslip carries zero of
  // them (its own statute is handled manually) — so show ONLY the deductions that actually apply,
  // never a misleading "Provident Fund ₹0" row, and surface a one-line note explaining net = gross.
  const indiaRegime=isIndiaRegimeCode(slip?.statutoryRegime);
  const earnings=slip?[["Basic Salary",slip.basic],["HRA",slip.hra],["Dearness Allowance",slip.da],["Travel Allowance",slip.travel],["Medical Allowance",slip.medical]]:[];
  const deductions=slip
    ?(indiaRegime
      ?[["Provident Fund",slip.empPF],["ESI",slip.empESI],["Professional Tax",slip.profTax],...(slip.lwpDed>0?[["LWP Deduction",slip.lwpDed]]:[]),["Income Tax (TDS)",slip.tds]]
      :(slip.lwpDed>0?[["LWP Deduction",slip.lwpDed]]:[]))
    :[];
  return(
    <PHASE2_Page title="My Payslip" subtitle={`${emp.name} (${emp.id}) · ${emp.branch}`}
      toolbar={<><select value={curMonth} onChange={e=>setSelMonth(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}>{months.length===0&&<option value="">No payslips</option>}{months.map(m=><option key={m} value={m}>{SS_MONTH_LABEL(m)}</option>)}</select>{slip&&<button onClick={()=>openPrintPreview({ selector:'main', title:'Payslip', recommend:'portrait' })} style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>📥 Download PDF</button>}</>}>
      <div style={{maxWidth:680,margin:"0 auto"}}>
        {!slip?(
          <div style={{padding:"48px 24px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,textAlign:"center",color:"#8b94b3",fontSize:12.5}}>
            {isLoading?<SkeletonText lines={2} className="mx-auto max-w-xs" />:(<>
              <p style={{margin:0,fontSize:30}}>🧾</p>
              <p style={{margin:"10px 0 4px",fontSize:13.5,fontWeight:700,color:"#0d1326"}}>No payslips yet</p>
              <p style={{margin:0,lineHeight:1.6}}>Payslips appear here after HR processes payroll for your branch.</p>
            </>)}
          </div>
        ):(<>
        {!indiaRegime&&(
          <div role="note" style={{marginBottom:12,padding:"9px 13px",borderRadius:8,background:"#FFF7E6",border:"1px solid #E7C877",fontSize:11,color:"#7A5B12",lineHeight:1.5}}>
            🌍 <b>{regimeNameOf(slip.statutoryRegime)} payroll.</b> Indian PF, ESI, Professional Tax and TDS don't apply to your branch, so your net pay equals your gross earnings (less any LWP). Local statutory deductions, where applicable, are handled separately by HR.
          </div>
        )}
        <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,overflow:"hidden"}}>
          {/* Header */}
          <div style={{padding:"18px 22px",background:"#0d1326",color:"#fff"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><p style={{margin:0,fontSize:18,fontWeight:700,color:"#d4a437",letterSpacing:"0.5px"}}>{brCfg.entity||"Travkings Tours & Travels"}</p><p style={{margin:"3px 0 0",fontSize:11,color:"#5a6691"}}>{emp.branch} branch</p></div>
              <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:14,fontWeight:700}}>Payslip</p><p style={{margin:"2px 0 0",fontSize:12,color:"#d4a437"}}>{SS_MONTH_LABEL(curMonth)}</p></div>
            </div>
          </div>
          {/* Employee info */}
          <div style={{padding:"14px 22px",background:"#fafbfd",borderBottom:"1px solid #cdd1d8",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11.5}}>
            {[{l:"Employee",v:emp.name},{l:"Employee ID",v:emp.id},{l:"Branch",v:emp.branch},{l:"Department",v:emp.dept||"—"}].map(f=>(
              <div key={f.l} style={{display:"flex",gap:8}}><span style={{color:"#5a6691",minWidth:90}}>{f.l}:</span><b>{f.v}</b></div>
            ))}
          </div>
          {/* Earnings / Deductions */}
          <div style={{padding:"0 22px",display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid #cdd1d8"}}>
            <div style={{paddingRight:16,borderRight:"1px solid #cdd1d8"}}>
              <p style={{margin:"12px 0 8px",fontSize:11,fontWeight:700,color:"#155724",textTransform:"uppercase",letterSpacing:"0.4px"}}>Earnings</p>
              {earnings.map(([desc,amount])=>(
                <div key={desc} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #dfe2e7",fontSize:11.5}}>
                  <span style={{color:"#0d1326"}}>{desc}</span><span style={{fontFamily:"monospace",fontWeight:600}}>{fm(amount)}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderTop:"2px solid #0d1326",marginTop:4,fontWeight:700}}>
                <span>Gross Earnings</span><span style={{fontFamily:"monospace",color:"#22c55e"}}>{fm(slip.gross)}</span>
              </div>
            </div>
            <div style={{paddingLeft:16}}>
              <p style={{margin:"12px 0 8px",fontSize:11,fontWeight:700,color:"#A32D2D",textTransform:"uppercase",letterSpacing:"0.4px"}}>Deductions</p>
              {deductions.map(([desc,amount])=>(
                <div key={desc} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #dfe2e7",fontSize:11.5}}>
                  <span style={{color:"#0d1326"}}>{desc}</span><span style={{fontFamily:"monospace",fontWeight:600}}>{fm(amount)}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderTop:"2px solid #0d1326",marginTop:4,fontWeight:700}}>
                <span>Total Deductions</span><span style={{fontFamily:"monospace",color:"#A32D2D"}}>{fm(slip.totalDeductions)}</span>
              </div>
            </div>
          </div>
          {/* Net pay */}
          <div style={{padding:"16px 22px",background:"#fff8e8",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Net Pay</p><p style={{margin:"2px 0 0",fontSize:11,color:"#5a6691"}}>{SS_MONTH_LABEL(curMonth)} · {emp.branch}</p></div>
            <p style={{margin:0,fontSize:26,fontWeight:700,color:"#0d1326",fontFamily:"monospace"}}>{fm(slip.net)}</p>
          </div>
        </div>
        </>)}
      </div>
    </PHASE2_Page>
  );
}
