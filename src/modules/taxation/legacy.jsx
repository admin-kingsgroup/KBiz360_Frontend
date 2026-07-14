/* ════════════════════════════════════════════════════════════════════
   MODULES/TAXATION.JSX
   Auto-generated from KBiz360_v2.jsx · 1627 lines · 24 declarations
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { todayISO, CUR_FY, fyOptions } from '../../core/dates';
import { card } from '../../core/styles';
import { useMobile } from '../../core/hooks';
import { PHASE2_Page } from '../../shell/PHASE2_Page';
import { openPrintPreview } from '../../core/PrintPreview';
import { SampleBanner } from '../../core/ux/SampleBanner';

export function TaxCalendar(){
  const mob=useMobile();
  const TODAY=todayISO();

  const deadlines=[
    {date:"2026-05-20",title:"GSTR-3B — Apr 2026",auth:"GSTIN BOM+AMD",type:"GST",branch:"BOM+AMD",desc:"Pay CGST+SGST for April. Interest 18% p.a. if late."},
    {date:"2026-06-07",title:"TDS Deposit — May 2026",auth:"Income Tax Dept",type:"TDS",branch:"BOM+AMD",desc:"TDS u/s 194C, 194H, 194J for May. 7th or 30th Apr for March."},
    {date:"2026-06-11",title:"GSTR-1 — May 2026",auth:"GSTIN BOM+AMD",type:"GST",branch:"BOM+AMD",desc:"All outward supplies. File before GSTR-3B for ITC flow to buyers."},
    {date:"2026-06-15",title:"Advance Tax — Q1 FY27",auth:"Income Tax Dept",type:"IT",branch:"All",desc:"15% of annual advance tax estimate due by 15 June."},
    {date:"2026-06-20",title:"GSTR-3B — May 2026",auth:"GSTIN BOM+AMD",type:"GST",branch:"BOM+AMD",desc:"Pay net GST (Output – ITC) for May 2026."},
    {date:"2026-06-30",title:"TDS Form 16A — Q4 FY26",auth:"Income Tax Dept",type:"TDS",branch:"BOM+AMD",desc:"Issue TDS certificates (Form 16A) to all vendors for Q4 FY 2025-26"},
    {date:"2026-07-07",title:"TDS Deposit — Jun 2026",auth:"Income Tax Dept",type:"TDS",branch:"BOM+AMD",desc:"TDS for June 2026"},
    {date:"2026-07-15",title:"TCS Return Q1 — 27EQ",auth:"Income Tax Dept",type:"TCS",branch:"BOM+AMD",desc:"TCS collected on overseas packages u/s 206C(1G) for Q1 FY27"},
    {date:"2026-09-15",title:"Advance Tax — Q2 FY27",auth:"Income Tax Dept",type:"IT",branch:"All",desc:"45% cumulative advance tax by 15 September."},
  ];

  const TYPE_CLR={GST:"#185FA5",VAT:"#27500A",TDS:"#854F0B",TCS:"#A32D2D",IT:"#1D9E75",WHT:"#384677"};
  const TYPE_BG ={GST:"#E6F1FB",VAT:"#EAF3DE",TDS:"#FAEEDA",TCS:"#FCEBEB",IT:"#EAF3DE",WHT:"#f3f4f8"};

  const daysLeft=d=>Math.ceil((new Date(d)-new Date(TODAY))/(1000*60*60*24));
  const overdue=deadlines.filter(d=>daysLeft(d.date)<0);
  const due7   =deadlines.filter(d=>daysLeft(d.date)>=0&&daysLeft(d.date)<=7);
  const upcoming=deadlines.filter(d=>daysLeft(d.date)>7);

  const DeadlineCard=({d})=>{
    const dl=daysLeft(d.date);
    return (
      <div style={{...card,borderLeft:`4px solid ${TYPE_CLR[d.type]||"#384677"}`,padding:"11px 14px",marginBottom:8,
        background:dl<0?"#FCEBEB":dl<=7?"#FFFAF0":"#fff"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,
                background:TYPE_BG[d.type]||"#f3f4f8",color:TYPE_CLR[d.type]||"#384677"}}>{d.type}</span>
              <span style={{fontSize:10,color:"#5a6691"}}>{d.branch}</span>
            </div>
            <p style={{margin:"0 0 2px",fontWeight:700,color:"#0d1326",fontSize:12}}>{d.title}</p>
            <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{d.desc}</p>
            <p style={{margin:"3px 0 0",fontSize:10,color:"#8b94b3"}}>{d.auth}</p>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <p style={{margin:0,fontWeight:700,color:dl<0?"#A32D2D":dl<=7?"#854F0B":"#27500A",fontSize:11}}>
              {dl<0?`${Math.abs(dl)}d OVERDUE`:dl===0?"TODAY":dl<=7?`${dl} days`:d.date}
            </p>
            <p style={{margin:"2px 0 0",fontSize:9.5,color:"#5a6691"}}>{d.date}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📅</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Tax Compliance Calendar</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>All compliance deadlines — India GST · TDS/TCS · Advance Tax</p>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:14}}>
        {[{l:"Overdue",v:String(overdue.length),c:"#A32D2D",bg:"#FCEBEB"},
          {l:"Due in 7 Days",v:String(due7.length),c:"#854F0B",bg:"#FAEEDA"},
          {l:"Upcoming",v:String(upcoming.length),c:"#27500A",bg:"#EAF3DE"},
          {l:"Total Tracked",v:String(deadlines.length),c:"#185FA5",bg:"#E6F1FB"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:22,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      {overdue.length>0&&<div>
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#A32D2D"}}>🔴 OVERDUE — Action Required Immediately</p>
        {overdue.map((d,i)=><DeadlineCard key={i} d={d}/>)}
        <div style={{marginBottom:14}}/>
      </div>}

      {due7.length>0&&<div>
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#854F0B"}}>⚠ DUE IN 7 DAYS</p>
        {due7.map((d,i)=><DeadlineCard key={i} d={d}/>)}
        <div style={{marginBottom:14}}/>
      </div>}

      <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#27500A"}}>✔ UPCOMING</p>
      {upcoming.map((d,i)=><DeadlineCard key={i} d={d}/>)}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PHASE 6 — LEAVE MANAGEMENT  /hr/leave
   ════════════════════════════════════════════════════════════════ */

export const GSTR_FILING_STATUS = [];


export function Form16Generator(){
  const [selEmp,setSelEmp]=useState("");
  const [fy,setFy]=useState(CUR_FY.label);
  return(
    <PHASE2_Page title="Form 16 Generator — India" subtitle="Annual salary certificate for income tax filing · generated from payroll data"
      toolbar={<><select value={selEmp} onChange={e=>setSelEmp(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}>{[].map(e=><option key={e}>{e}</option>)}</select><select value={fy} onChange={e=>setFy(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}>{fyOptions().map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select><button onClick={()=>openPrintPreview({ selector: 'main', title: 'Taxation', recommend: 'portrait' })} style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>📥 Download Form 16</button></>}>
      <SampleBanner note="Form 16 figures are sample data, not an issued certificate." />
      <div style={{maxWidth:760,margin:"0 auto",background:"#fff",border:"2px solid #0d1326",borderRadius:6,overflow:"hidden",fontSize:12}}>
        {/* Header */}
        <div style={{padding:"12px 20px",background:"#0d1326",color:"#fff",textAlign:"center"}}>
          <p style={{margin:0,fontSize:14,fontWeight:700,letterSpacing:"1px"}}>FORM 16</p>
          <p style={{margin:"3px 0 0",fontSize:11,color:"#d4a437"}}>Certificate under section 203 of the Income-tax Act, 1961 · FY {fy}</p>
        </div>
        {/* Part A */}
        <div style={{padding:"14px 20px",borderBottom:"2px solid #0d1326"}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,background:"#0d1326",color:"#d4a437",padding:"4px 10px",display:"inline-block"}}>PART A — TDS Details</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11.5}}>
            {[{l:"Employer (Deductor) Name",v:"Travkings Tours & Travels Pvt. Ltd."},{l:"Employer PAN",v:"AAACT1234A"},{l:"Employer TAN",v:"MUMA12345B"},{l:"Employee Name",v:""},{l:"Employee PAN",v:""},{l:"Assessment Year",v:fy==="2025-26"?"2026-27":"2025-26"},{l:"Period of Employment",v:"01-Apr-2025 to 31-Mar-2026"},{l:"TDS Deposited",v:""}].map(f=>(
              <div key={f.l} style={{display:"flex",gap:6,padding:"4px 0",borderBottom:"1px solid #dfe2e7"}}><span style={{color:"#5a6691",minWidth:180}}>{f.l}</span><b>{f.v}</b></div>
            ))}
          </div>
        </div>
        {/* Part B */}
        <div style={{padding:"14px 20px"}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,background:"#0d1326",color:"#d4a437",padding:"4px 10px",display:"inline-block"}}>PART B — Computation of Income</p>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <tbody>{[
              {desc:"Gross Salary (12 months)",         amount:576000},
              {desc:"Less: HRA Exemption (Sec 10(13A))",amount:-89600},
              {desc:"Less: Transport Allowance",         amount:-19200},
              {desc:"Net Salary",                        amount:467200, bold:true},
              {desc:"Less: 80C (PPF + LIC)",             amount:-120000},
              {desc:"Less: 80D (Health Insurance)",      amount:-18000},
              {desc:"Less: 80G (Donations)",             amount:-5000},
              {desc:"Taxable Income",                    amount:324200, bold:true},
              {desc:"Tax on Income (5% slab up to ₹5L)",amount:7210},
              {desc:"Rebate u/s 87A",                   amount:-7210},
              {desc:"Net Tax Payable",                   amount:0, bold:true},
              {desc:"Education Cess (4%)",               amount:0},
              {desc:"Total TDS Deducted",                amount:22200, bold:true},
            ].map((r,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:r.bold?"#fafbfd":"#fff"}}>
                <td style={{padding:"5px 8px",fontWeight:r.bold?700:400,paddingLeft:r.amount<0?20:8}}>{r.desc}</td>
                <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"monospace",fontWeight:r.bold?700:400,color:r.amount<0?"#A32D2D":r.bold?"#0d1326":"#5a6691"}}>₹{Math.abs(r.amount).toLocaleString("en-IN")}</td>
              </tr>
            ))}</tbody>
          </table>
          <div style={{marginTop:20,paddingTop:14,borderTop:"2px solid #0d1326",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20}}>
            {["Prepared & Signed by (Employer)","Employee Signature","Date"].map(s=>(
              <div key={s} style={{textAlign:"center"}}><div style={{height:32,borderBottom:"1px solid #0d1326",marginBottom:4}}/><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{s}</p></div>
            ))}
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   7. PERFORMANCE REVIEW MODULE
   ════════════════════════════════════════════════════════════════════ */

// GSTR-1 B2B is generated from real sale vouchers — no bundled demo invoices.
export const GSTR1_B2B = [];


export const GSTR1_B2C = [];


export const GSTR3B_SUMMARY = {
  period:"April 2026",
  outwardSupplies:{taxable:12500000,exempt:450000,nilRated:0,nonGST:0,igst:1845000,cgst:972000,sgst:972000,cess:0},
  inwardRCM:{taxable:85000,igst:15300,cgst:0,sgst:0},
  itcAvailable:{igst:1240000,cgst:485000,sgst:485000,total:2210000},
  itcReversed:{igst:0,cgst:45000,sgst:45000,total:90000},
  netITC:2120000,
  taxPayable:{igst:605300,cgst:487000,sgst:487000,cess:0,total:1579300},
  taxFromITC:{igst:605300,cgst:487000,sgst:487000,total:1579300},
  cashPayable:0,
  interestPenalty:0,
};


