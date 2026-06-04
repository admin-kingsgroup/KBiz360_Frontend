/* ════════════════════════════════════════════════════════════════════
   MODULES/FINANCE.JSX
   Auto-generated from KBiz360_v2.jsx · 1893 lines · 20 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Download, Lock, Plus, Printer, Save } from 'lucide-react';
import { exportToCSV } from '../core/business-logic';
import { BRANCH_CODES, CASH, EXP_ACTUALS, FX_RATES, GP_BILLS, LOAN_REGISTER } from '../core/data';
import { fmt, fmtINR } from '../core/format';
import { CUR_MONTH, MONTH_OPTIONS, FY_MONTHS, monthLabel, todayISO, fmtDate, CUR_FY, rangeNote } from '../core/dates';
import { BANK_ACCOUNTS_DATA, GratuityRegister, INVESTMENT_DATA, INVESTMENT_SECTIONS, RECO_QUEUE_DATA, _ADVANCES, cardStyle } from '../core/helpers';
import { useMobile } from '../core/hooks';
import { useChartOfAccounts } from '../core/useAccounting';
import { B, FL, RPT_tdStyle, RPT_thStyle, bc, btnG, btnGh, card, inp } from '../core/styles';
import { Dashboard } from './dashboard';
import { PfEsiChallan } from './hr';
import { ForexReport } from './reports';
import { EWayBill, Form26AS } from './taxation';
import { RecurringVouchers } from './transactions';
import { PHASE2_Page } from '../shell/PHASE2_Page';

export function BankReco({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=(branch==="ALL"?"BOM":branch?.code)||"BOM";
  const [period,setPeriod]=useState(CUR_MONTH);
  const [tab,setTab]=useState("reco"); // reco | pdc | bounce
  const PERIODS=MONTH_OPTIONS;
  const [matchedIds,setMatchedIds]=useState(new Set([0,1,2,3,4]));
  const toggleMatch=id=>setMatchedIds(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});

  /* PDC Register — no bundled demo cheques (empty until a PDC backend is added) */
  const [pdcs,setPdcs]=useState([]);
  const depositPDC=id=>setPdcs(ps=>ps.map(p=>p.id===id?{...p,status:"Deposited",depositDate:"2026-05-19"}:p));
  const bouncePDC=id=>setPdcs(ps=>ps.map(p=>p.id===id?{...p,status:"Bounced"}:p));

  /* Book entries */
  const bookEntries=useMemo(()=>{
    const bills=GP_BILLS.filter(b=>b.branch===brCode&&b.date.startsWith(period));
    return bills.slice(0,8).map((b,i)=>({id:i,date:b.date,vno:b.id.replace('/SF','/RV').replace('/SH','/RV'),desc:`Receipt — ${b.client}`,amt:Math.round(b.sell*0.75),type:"CR"}));
  },[brCode,period]);

  const stmtEntries=useMemo(()=>[
    ...bookEntries.map((e,i)=>({id:i,date:e.date,utr:`UTR${(9000000+i)}`,desc:`NEFT CR ${e.desc}`,amt:e.amt,type:"CR",matched:matchedIds.has(i)})),
    {id:90,date:period+"-05",utr:"UTR9999001",desc:"Bank charges Q1",amt:850,type:"DR",matched:false},
    {id:91,date:period+"-15",utr:"UTR9999002",desc:"Interest credit",amt:4200,type:"CR",matched:false},
  ],[bookEntries,matchedIds,period]);

  const bookBal=bookEntries.reduce((s,e)=>s+e.amt,0);
  const stmtBal=stmtEntries.filter(e=>e.type==="CR").reduce((s,e)=>s+e.amt,0)-stmtEntries.filter(e=>e.type==="DR").reduce((s,e)=>s+e.amt,0);
  const unmatched=stmtEntries.filter(e=>!e.matched).length;
  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");
  const PDC_CLR={Pending:"#185FA5",Deposited:"#27500A",Bounced:"#A32D2D"};
  const PDC_BG ={Pending:"#E6F1FB",Deposited:"#EAF3DE",Bounced:"#FCEBEB"};

  return (
    <div style={{padding:"12px 10px",maxWidth:1300,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🏦</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Bank Reconciliation</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{brCode} · {PERIODS.find(p=>p.v===period)?.l} · Click to match · PDC Register · Bounce tracking</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <button style={{...btnG,fontSize:11}}><Download size={12}/> Import CSV</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[{l:"Bank Statement Bal",v:f(stmtBal),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Book Balance",v:f(bookBal),c:"#27500A",bg:"#EAF3DE"},
          {l:"Difference",v:f(Math.abs(stmtBal-bookBal)),c:Math.abs(stmtBal-bookBal)<100?"#27500A":"#A32D2D",bg:Math.abs(stmtBal-bookBal)<100?"#EAF3DE":"#FCEBEB"},
          {l:"Unmatched",v:String(unmatched),c:unmatched>0?"#A32D2D":"#27500A",bg:unmatched>0?"#FCEBEB":"#EAF3DE"},
          {l:"PDC Pending",v:String(pdcs.filter(p=>p.status==="Pending").length),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Bounced Cheques",v:String(pdcs.filter(p=>p.status==="Bounced").length),c:"#A32D2D",bg:"#FCEBEB"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"10px 12px",background:k.bg}}>
            <p style={{margin:0,fontSize:8.5,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"3px 0 0",fontSize:18,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,background:"#f3f4f8",borderRadius:"9px 9px 0 0",border:"1px solid #e1e3ec"}}>
        <button onClick={()=>setTab("reco")} style={{padding:"7px 12px",border:"none",cursor:"pointer",fontWeight:tab==="reco"?700:500,background:tab==="reco"?"#fff":"transparent",borderRadius:6,fontSize:11}}>🔄 Bank Reconciliation</button><button onClick={()=>setTab("pdc")} style={{padding:"7px 12px",border:"none",cursor:"pointer",fontWeight:tab==="pdc"?700:500,background:tab==="pdc"?"#fff":"transparent",borderRadius:6,fontSize:11}}>📑 PDC Register</button><button onClick={()=>setTab("bounce")} style={{padding:"7px 12px",border:"none",cursor:"pointer",fontWeight:tab==="bounce"?700:500,background:tab==="bounce"?"#fff":"transparent",borderRadius:6,fontSize:11}}>🔴 Bounce / Returns</button>
      </div>

      {tab==="reco"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,padding:12,border:"1px solid #e1e3ec",borderTop:"none",borderRadius:"0 0 9px 9px",background:"#fff"}}>
          {/* Bank Statement */}
          <div>
            <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Bank Statement</p>
            <div style={{...card,padding:0,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr style={{background:"#0d1326"}}>{["Date","UTR","Description","Amount","✓"].map((h,i)=><th key={i} style={{padding:"7px 9px",textAlign:i===3?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>{h}</th>)}</tr></thead>
                <tbody>{stmtEntries.map((e,i)=>(
                  <tr key={e.id} onClick={()=>toggleMatch(e.id)} style={{borderBottom:"1px solid #f3f4f8",cursor:"pointer",background:e.matched?"#EAF3DE":i%2===0?"#fff":"#fafafa"}}
                    onMouseEnter={ev=>{if(!e.matched)ev.currentTarget.style.background="#f0f8ff";}}
                    onMouseLeave={ev=>{ev.currentTarget.style.background=e.matched?"#EAF3DE":i%2===0?"#fff":"#fafafa";}}>
                    <td style={{padding:"6px 9px",color:"#5a6691",fontSize:10}}>{e.date}</td>
                    <td style={{padding:"6px 9px",fontFamily:"monospace",fontSize:9.5,color:"#185FA5"}}>{e.utr}</td>
                    <td style={{padding:"6px 9px",fontSize:10.5,color:"#384677",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.desc}</td>
                    <td style={{padding:"6px 9px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",color:e.type==="CR"?"#27500A":"#A32D2D"}}>{e.type==="DR"?"-":"+"}₹{e.amt.toLocaleString()}</td>
                    <td style={{padding:"6px 9px",textAlign:"center"}}>{e.matched?"✅":"⭕"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
          {/* Book Entries */}
          <div>
            <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Book Entries (Ledger)</p>
            <div style={{...card,padding:0,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr style={{background:"#0d1326"}}>{["Date","Voucher","Narration","Amount","✓"].map((h,i)=><th key={i} style={{padding:"7px 9px",textAlign:i===3?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>{h}</th>)}</tr></thead>
                <tbody>{bookEntries.map((e,i)=>(
                  <tr key={e.id} onClick={()=>toggleMatch(e.id)} style={{borderBottom:"1px solid #f3f4f8",cursor:"pointer",background:matchedIds.has(e.id)?"#EAF3DE":i%2===0?"#fff":"#fafafa"}}
                    onMouseEnter={ev=>{if(!matchedIds.has(e.id))ev.currentTarget.style.background="#f0f8ff";}}
                    onMouseLeave={ev=>{ev.currentTarget.style.background=matchedIds.has(e.id)?"#EAF3DE":i%2===0?"#fff":"#fafafa";}}>
                    <td style={{padding:"6px 9px",color:"#5a6691",fontSize:10}}>{e.date}</td>
                    <td style={{padding:"6px 9px",fontFamily:"monospace",fontSize:9.5,color:"#185FA5"}}>{e.vno}</td>
                    <td style={{padding:"6px 9px",fontSize:10.5,color:"#384677",maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.desc}</td>
                    <td style={{padding:"6px 9px",textAlign:"right",fontWeight:600,color:"#27500A",fontVariantNumeric:"tabular-nums"}}>₹{e.amt.toLocaleString()}</td>
                    <td style={{padding:"6px 9px",textAlign:"center"}}>{matchedIds.has(e.id)?"✅":"⭕"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab==="pdc"&&(
        <div style={{...card,borderTop:"none",borderRadius:"0 0 9px 9px",padding:0,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",background:"#E6F1FB",borderBottom:"1px solid #B5D4F4",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{margin:0,fontSize:11,color:"#185FA5"}}>PDC Register — Post-Dated Cheques received from clients. Deposit on or after cheque date.</p>
            <span style={{fontSize:10.5,fontWeight:700,color:"#185FA5"}}>Due soon: {pdcs.filter(p=>p.status==="Pending"&&p.date<="2026-05-30").length}</span>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["PDC ID","Client","Cheque No.","Bank","Cheque Date","Amount","Status","Action"].map((h,i)=>(
                <th key={i} style={{padding:"9px 12px",textAlign:i===5?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{pdcs.map((p,i)=>(
              <tr key={p.id} style={{borderBottom:"1px solid #f3f4f8",background:p.status==="Bounced"?"#fff5f5":i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{p.id}</td>
                <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{p.client}</td>
                <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10.5}}>{p.chqNo}</td>
                <td style={{padding:"8px 12px",color:"#5a6691"}}>{p.bank}</td>
                <td style={{padding:"8px 12px",color:"#5a6691",whiteSpace:"nowrap"}}>{p.date}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>₹{p.amount.toLocaleString()}</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:PDC_BG[p.status],color:PDC_CLR[p.status]}}>{p.status}</span></td>
                <td style={{padding:"8px 12px"}}>
                  {p.status==="Pending"&&<div style={{display:"flex",gap:4}}>
                    <button onClick={()=>depositPDC(p.id)} style={{...btnG,padding:"2px 8px",fontSize:9.5,background:"#27500A"}}>Deposit</button>
                    <button onClick={()=>bouncePDC(p.id)} style={{...btnGh,padding:"2px 8px",fontSize:9.5,color:"#A32D2D"}}>Bounce</button>
                  </div>}
                  {p.status==="Deposited"&&<span style={{fontSize:10,color:"#27500A"}}>✔ {p.depositDate}</span>}
                  {p.status==="Bounced"&&<button style={{...btnG,padding:"2px 8px",fontSize:9.5,background:"#A32D2D"}}>Notify Client</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab==="bounce"&&(
        <div style={{...card,borderTop:"none",borderRadius:"0 0 9px 9px"}}>
          <div style={{padding:"10px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",marginBottom:12}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#A32D2D"}}>⚠ Bounced Cheque Workflow</p>
            <p style={{margin:"4px 0 0",fontSize:10.5,color:"#A32D2D"}}>When a cheque bounces: (1) Reverse the receipt entry in books · (2) Charge bank bounce fee (₹350-500) · (3) Notify client · (4) Issue demand notice · (5) Re-present or collect NEFT</p>
          </div>
          {pdcs.filter(p=>p.status==="Bounced").map(p=>(
            <div key={p.id} style={{...card,marginBottom:8,borderLeft:"4px solid #A32D2D",padding:"12px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:"#A32D2D"}}>{p.client} — Cheque #{p.chqNo}</p>
                  <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{p.bank} · Date: {p.date} · ₹{p.amount.toLocaleString()}</p>
                </div>
                <span style={{fontSize:10.5,padding:"3px 10px",borderRadius:999,background:"#FCEBEB",color:"#A32D2D",fontWeight:700}}>BOUNCED</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8,marginBottom:10}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 0",borderBottom:"1px solid #f3f4f8"}}><span style={{fontSize:14}}>✅</span><div><div style={{fontWeight:600,fontSize:11}}>Action</div><div style={{fontSize:10.5}}>Reverse Receipt Voucher</div></div></div><div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 0",borderBottom:"1px solid #f3f4f8"}}><span style={{fontSize:14}}>⬜</span><div><div style={{fontWeight:600,fontSize:11}}>Bank Bounce Fee</div><div style={{fontSize:10.5}}>₹350 debit to customer</div></div></div><div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 0"}}><span style={{fontSize:14}}>⬜</span><div><div style={{fontWeight:600,fontSize:11}}>Notify Customer</div><div style={{fontSize:10.5}}>Send bounce notice</div></div></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button style={{...btnGh,fontSize:10.5,padding:"4px 12px"}}>💬 WhatsApp Client</button>
                <button style={{...btnG,fontSize:10.5,padding:"4px 12px",background:"#A32D2D"}}>📋 Issue Demand Notice</button>
                <button style={{...btnG,fontSize:10.5,padding:"4px 12px"}}>🔄 Re-present Cheque</button>
              </div>
            </div>
          ))}
          {pdcs.filter(p=>p.status==="Bounced").length===0&&<p style={{fontSize:11,color:"#27500A"}}>✔ No bounced cheques</p>}
        </div>
      )}
    </div>
  );
}

export function DayBook({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [date,setDate]=useState(todayISO());
  const [typeFilter,setTypeFilter]=useState("All");

  /* Build entries from GP_BILLS, EXP_ACTUALS, ADMs, ACMs */
  const entries=useMemo(()=>{
    const out=[];
    /* Sales from GP_BILLS */
    GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&b.date===date).forEach(b=>{
      const pfx={Flight:"SF",Holiday:"SH",Hotel:"SHT",Car:"SC",Visa:"SV",Insurance:"SI",Misc:"SM"}[b.mod]||"SM";
      out.push({vno:b.id,type:"Sales",mod:b.mod,party:b.client,dr:b.sell,cr:0,narr:`${b.mod} sale — ${b.dest}`,branch:b.branch});
      out.push({vno:b.id,type:"Sales",mod:b.mod,party:"COGS "+b.mod,dr:0,cr:b.cost,narr:`Cost of ${b.mod.toLowerCase()}`,branch:b.branch});
    });
    /* Expense actuals */
    EXP_ACTUALS.filter(a=>(!brCode||a.br===brCode)&&a.m===date.slice(0,7)&&a.a>0).slice(0,4).forEach(a=>{
      const NAMES={SAL:"Salaries & Wages",RNT:"Office Rent",TEL:"Telephone",ADV:"Advertising",GDS:"GDS Charges",SFT:"Software",BNK:"Bank Charges",DEP:"Depreciation"};
      out.push({vno:`JV-${a.br}-${a.m}`,type:"Journal",mod:"Expense",party:NAMES[a.id]||a.id,dr:a.a,cr:0,narr:`${NAMES[a.id]||a.id} for ${a.m}`,branch:a.br});
    });
    return out.filter(e=>typeFilter==="All"||e.type===typeFilter);
  },[brCode,date,typeFilter]);

  const totDr=entries.reduce((s,e)=>s+e.dr,0);
  const totCr=entries.reduce((s,e)=>s+e.cr,0);
  const f=n=>n>0?cur+Number(Math.round(n)).toLocaleString("en-IN"):"—";
  const TYPE_CLR={Sales:"#185FA5",Journal:"#854F0B",Receipt:"#27500A",Payment:"#A32D2D"};

  return (
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Day Book</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>
            All entries for {date} · {entries.length} entries · Dr {f(totDr)} = Cr {f(totCr)}
          </p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...inp,minHeight:32,fontSize:11}}/>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {["All","Sales","Purchase","Journal","Receipt","Payment"].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      {totDr!==totCr&&entries.length>0&&<div style={{marginBottom:10,padding:"8px 14px",borderRadius:8,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600}}>⚠ Day does not balance — Dr {f(totDr)} ≠ Cr {f(totCr)}</div>}
      {totDr===totCr&&entries.length>0&&<div style={{marginBottom:10,padding:"8px 14px",borderRadius:8,background:"#EAF3DE",border:"1px solid #C0DD97",fontSize:10.5,color:"#27500A",fontWeight:600}}>✔ Day balanced — Total {f(totDr)}</div>}
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Voucher No.","Type","Party / Account","Narration","Dr Amount","Cr Amount"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=4?"right":"left",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {entries.length===0&&<tr><td colSpan={6} style={{padding:"28px",textAlign:"center",color:"#5a6691",fontSize:12}}>No entries for {date}. Try a date like 2026-05-05 or 2026-05-07.</td></tr>}
            {entries.map((e,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{e.vno}</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:700,background:(TYPE_CLR[e.type]||"#384677")+"22",color:TYPE_CLR[e.type]||"#384677"}}>{e.type}</span></td>
                <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{e.party}</td>
                <td style={{padding:"8px 12px",fontSize:10.5,color:"#5a6691"}}>{e.narr}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",color:"#185FA5"}}>{f(e.dr)}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",color:"#A32D2D"}}>{f(e.cr)}</td>
              </tr>
            ))}
          </tbody>
          {entries.length>0&&<tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={4} style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL — {entries.length} entries</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(totDr)}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totCr)}</td>
          </tr></tfoot>}
        </table>
      </div>
    </div>
  );
}

export function LedgerAc({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [ledger,setLedger]=useState("");
  const [dateFrom,setDateFrom]=useState(CUR_FY.startISO);
  const [dateTo,setDateTo]=useState(todayISO());

  // Account list from the live chart of accounts (this legacy view is superseded
  // by LedgerAcLive; no bundled demo names).
  const LEDGERS=(useChartOfAccounts(branch).data||[]).map(l=>l.name);

  const entries=useMemo(()=>{
    const isClient=false, isSupplier=false, isBank=false, isExpense=false;

    const rows=[];
    if(isClient){
      GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&b.client===ledger&&b.date>=dateFrom&&b.date<=dateTo)
        .forEach(b=>rows.push({date:b.date,vno:b.id,narr:`Sales — ${b.mod} to ${b.client}`,dr:b.sell,cr:0}));
      // Simulated receipts (75% collected)
      GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&b.client===ledger&&b.date>=dateFrom&&b.date<=dateTo)
        .forEach(b=>rows.push({date:b.date,vno:b.id.replace('/SF','/RV').replace('/SH','/RV').replace('/SHT','/RV'),narr:`Receipt from ${b.client}`,dr:0,cr:Math.round(b.sell*0.75)}));
    } else if(isSupplier){
      GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&b.supplier===ledger&&b.date>=dateFrom&&b.date<=dateTo)
        .forEach(b=>rows.push({date:b.date,vno:b.id.replace('/SF','/PF').replace('/SH','/PH'),narr:`Purchase — ${b.mod} from ${b.supplier}`,dr:0,cr:b.cost}));
      GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&b.supplier===ledger&&b.date>=dateFrom&&b.date<=dateTo)
        .forEach(b=>rows.push({date:b.date,vno:b.id.replace('/SF','/PMT').replace('/SH','/PMT'),narr:`Payment to ${b.supplier}`,dr:Math.round(b.cost*0.8),cr:0}));
    } else if(isExpense){
      const MAP={"Salaries & Wages":"SAL","Office Rent":"RNT","Advertising":"ADV"};
      EXP_ACTUALS.filter(a=>(!brCode||a.br===brCode)&&a.id===MAP[ledger]&&a.m>=dateFrom.slice(0,7)&&a.m<=dateTo.slice(0,7))
        .forEach(a=>rows.push({date:a.m+"-01",vno:`JV-${a.br}-${a.m}`,narr:`${ledger} — ${a.m}`,dr:a.a,cr:0}));
    }
    return rows.sort((a,b)=>a.date.localeCompare(b.date));
  },[ledger,brCode,dateFrom,dateTo]);

  const openingBal=0;
  let running=openingBal;
  const enriched=entries.map(e=>{running+=e.dr-e.cr;return{...e,balance:running};});
  const closingBal=running;
  const f=n=>n>0?cur+Number(Math.round(n)).toLocaleString("en-IN"):"—";

  return (
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Ledger Account</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{ledger} · {entries.length} entries</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <select value={ledger} onChange={e=>setLedger(e.target.value)} style={{...inp,width:200,minHeight:32,fontSize:11}}>
            {LEDGERS.map(l=><option key={l}>{l}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{...inp,width:130,minHeight:32,fontSize:11}}/>
          <span style={{lineHeight:"32px",color:"#5a6691",fontSize:11}}>to</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{...inp,width:130,minHeight:32,fontSize:11}}/>
        </div>
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",background:"#f3f4f8",borderBottom:"1px solid #e1e3ec",
          display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:11,color:"#5a6691"}}>Opening balance: {f(Math.abs(openingBal))} {openingBal>=0?"Dr":"Cr"}</span>
          <span style={{fontSize:11,fontWeight:700,color:closingBal>=0?"#185FA5":"#A32D2D"}}>
            Closing: {f(Math.abs(closingBal))} {closingBal>=0?"Dr":"Cr"}
          </span>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Date","Voucher No.","Narration","Dr Amount","Cr Amount","Balance"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=3?"right":"left",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {enriched.length===0&&<tr><td colSpan={6} style={{padding:"28px",textAlign:"center",color:"#5a6691"}}>No entries found. Select a different ledger or date range.</td></tr>}
            {enriched.map((e,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",color:"#5a6691",whiteSpace:"nowrap"}}>{e.date}</td>
                <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{e.vno}</td>
                <td style={{padding:"8px 12px",color:"#384677"}}>{e.narr}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:e.dr>0?"#185FA5":"#bfc3d6"}}>{f(e.dr)}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:e.cr>0?"#A32D2D":"#bfc3d6"}}>{f(e.cr)}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:e.balance>=0?"#185FA5":"#A32D2D"}}>{f(Math.abs(e.balance))} {e.balance>=0?"Dr":"Cr"}</td>
              </tr>
            ))}
          </tbody>
          {enriched.length>0&&<tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={3} style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",fontSize:12}}>CLOSING BALANCE — {ledger}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(enriched.reduce((s,e)=>s+e.dr,0))}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(enriched.reduce((s,e)=>s+e.cr,0))}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:closingBal>=0?"#fff":"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(Math.abs(closingBal))} {closingBal>=0?"Dr":"Cr"}</td>
          </tr></tfoot>}
        </table>
      </div>
    </div>
  );
}

export function TrialBalance({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [period,setPeriod]=useState(CUR_MONTH);
  const PERIODS=MONTH_OPTIONS;

  /* ── Compute from real data ── */
  const ytdMonths=FY_MONTHS.filter(m=>m<=period);

  const bills=GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&b.date.slice(0,7)<=period);
  const ytdBills=GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&ytdMonths.includes(b.date.slice(0,7)));
  const actuals=EXP_ACTUALS.filter(a=>(!brCode||a.br===brCode)&&ytdMonths.includes(a.m));

  const totalSales=bills.reduce((s,b)=>s+b.sell,0);
  const totalPurch=bills.reduce((s,b)=>s+b.cost,0);
  const totalExp  =actuals.reduce((s,a)=>s+a.a,0);
  const grossProfit=totalSales-totalPurch;
  const netProfit =grossProfit-totalExp;

  const debtors   =totalSales*0.25;
  const creditors =totalPurch*0.18;
  const bankBal   =netProfit*0.6+totalSales*0.15;
  const cash      =totalExp*0.08;
  const gstOut    =totalSales*0.04;
  const gstIn     =totalPurch*0.02;
  const gstNet    =gstOut-gstIn;
  const capital   =bankBal+debtors+cash-creditors-gstNet+50000;

  const ledgers=[
    /* CAPITAL & LIABILITIES (Cr balances) */
    {grp:"Capital & Reserves",   name:"Capital Account",           dr:0,        cr:Math.max(capital,0),   type:"C"},
    {grp:"Capital & Reserves",   name:"Retained Earnings (FY)",    dr:0,        cr:Math.max(netProfit,0), type:"C"},
    {grp:"Current Liabilities",  name:"Accounts Payable — Suppliers",dr:0,      cr:creditors,             type:"C"},
    {grp:"Current Liabilities",  name:"Output GST/VAT Payable",    dr:0,        cr:gstOut,                type:"C"},
    {grp:"Current Liabilities",  name:"Advance from Customers",    dr:0,        cr:totalSales*0.04,       type:"C"},
    {grp:"Current Liabilities",  name:"TDS Payable",               dr:0,        cr:totalExp*0.02,         type:"C"},
    /* ASSETS (Dr balances) */
    {grp:"Current Assets",       name:"Bank Accounts",             dr:bankBal,  cr:0,                     type:"D"},
    {grp:"Current Assets",       name:"Cash in Hand",              dr:cash,     cr:0,                     type:"D"},
    {grp:"Current Assets",       name:"Accounts Receivable — Clients",dr:debtors,cr:0,                    type:"D"},
    {grp:"Current Assets",       name:"Input GST/VAT Credit",      dr:gstIn,    cr:0,                     type:"D"},
    {grp:"Current Assets",       name:"Advance to Suppliers",      dr:totalPurch*0.03,cr:0,               type:"D"},
    /* INCOME (Cr) */
    {grp:"Sales Revenue",        name:"Sales — Flight Tickets",    dr:0,        cr:bills.filter(b=>b.mod==="Flight").reduce((s,b)=>s+b.sell,0),   type:"C"},
    {grp:"Sales Revenue",        name:"Sales — Holiday Packages",  dr:0,        cr:bills.filter(b=>b.mod==="Holiday").reduce((s,b)=>s+b.sell,0),  type:"C"},
    {grp:"Sales Revenue",        name:"Sales — Hotels",            dr:0,        cr:bills.filter(b=>b.mod==="Hotel").reduce((s,b)=>s+b.sell,0),    type:"C"},
    {grp:"Sales Revenue",        name:"Sales — Visas & Others",    dr:0,        cr:bills.filter(b=>!["Flight","Holiday","Hotel"].includes(b.mod)).reduce((s,b)=>s+b.sell,0), type:"C"},
    /* COST OF SALES (Dr) */
    {grp:"Direct Costs",         name:"Purchase — Air Tickets",    dr:bills.filter(b=>b.mod==="Flight").reduce((s,b)=>s+b.cost,0),   cr:0, type:"D"},
    {grp:"Direct Costs",         name:"Purchase — Land Packages",  dr:bills.filter(b=>b.mod==="Holiday").reduce((s,b)=>s+b.cost,0),  cr:0, type:"D"},
    {grp:"Direct Costs",         name:"Purchase — Hotel Costs",    dr:bills.filter(b=>b.mod==="Hotel").reduce((s,b)=>s+b.cost,0),    cr:0, type:"D"},
    {grp:"Direct Costs",         name:"Purchase — Other Services", dr:bills.filter(b=>!["Flight","Holiday","Hotel"].includes(b.mod)).reduce((s,b)=>s+b.cost,0), cr:0, type:"D"},
    /* EXPENSES (Dr) */
    {grp:"Indirect Expenses",    name:"Salaries & Wages",          dr:actuals.filter(a=>a.id==="SAL").reduce((s,a)=>s+a.a,0), cr:0, type:"D"},
    {grp:"Indirect Expenses",    name:"Office Rent",               dr:actuals.filter(a=>a.id==="RNT").reduce((s,a)=>s+a.a,0), cr:0, type:"D"},
    {grp:"Indirect Expenses",    name:"Advertising & Marketing",   dr:actuals.filter(a=>a.id==="ADV").reduce((s,a)=>s+a.a,0), cr:0, type:"D"},
    {grp:"Indirect Expenses",    name:"GDS / System Charges",      dr:actuals.filter(a=>a.id==="GDS").reduce((s,a)=>s+a.a,0), cr:0, type:"D"},
    {grp:"Indirect Expenses",    name:"Other Expenses",            dr:actuals.filter(a=>!["SAL","RNT","ADV","GDS"].includes(a.id)).reduce((s,a)=>s+a.a,0), cr:0, type:"D"},
  ];

  const totDr=ledgers.reduce((s,l)=>s+l.dr,0);
  const totCr=ledgers.reduce((s,l)=>s+l.cr,0);
  const diff=Math.abs(totDr-totCr);
  const f=n=>n>0?cur+Number(Math.round(n)).toLocaleString("en-IN"):"—";

  const groups=[...new Set(ledgers.map(l=>l.grp))];

  return (
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Trial Balance</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>
            {brCode||"Travkings Group"} · YTD to {monthLabel(period)} · Dr = Cr = {cur}{Number(Math.round(totDr)).toLocaleString()}
          </p>
          <p style={{margin:"3px 0 0",fontSize:11,color:"#185FA5",fontWeight:600}}>📅 FY {CUR_FY.label} year-to-date · {fmtDate(CUR_FY.startISO)} → end of {monthLabel(period)} · use selector to change</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
        </div>
      </div>
      {diff>1&&<div style={{marginBottom:10,padding:"8px 14px",borderRadius:8,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600}}>⚠ Rounding difference: {cur}{Math.round(diff)} — Adjust capital account</div>}
      {diff<=1&&<div style={{marginBottom:10,padding:"8px 14px",borderRadius:8,background:"#EAF3DE",border:"1px solid #C0DD97",fontSize:10.5,color:"#27500A",fontWeight:600}}>✔ Trial Balance tallied — Dr {cur}{Number(Math.round(totDr)).toLocaleString()} = Cr {cur}{Number(Math.round(totCr)).toLocaleString()}</div>}
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            <th style={{padding:"9px 14px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:10}}>Group</th>
            <th style={{padding:"9px 14px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:10}}>Ledger Account</th>
            <th style={{padding:"9px 14px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:10}}>Debit ({cur})</th>
            <th style={{padding:"9px 14px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:10}}>Credit ({cur})</th>
          </tr></thead>
          <tbody>
            {groups.map(grp=>{
              const grpLedgers=ledgers.filter(l=>l.grp===grp);
              const grpDr=grpLedgers.reduce((s,l)=>s+l.dr,0);
              const grpCr=grpLedgers.reduce((s,l)=>s+l.cr,0);
              return grpLedgers.map((l,i)=>(
                <tr key={l.name} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                  {i===0&&<td rowSpan={grpLedgers.length} style={{padding:"9px 14px",fontWeight:700,color:"#0d1326",borderRight:"2px solid #e1e3ec",verticalAlign:"top",fontSize:10.5,background:"#f9fafb"}}>{grp}</td>}
                  <td style={{padding:"9px 14px",color:"#384677"}}>{l.name}</td>
                  <td style={{padding:"9px 14px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:l.dr>0?"#0d1326":"#bfc3d6"}}>{f(l.dr)}</td>
                  <td style={{padding:"9px 14px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:l.cr>0?"#0d1326":"#bfc3d6"}}>{f(l.cr)}</td>
                </tr>
              ));
            })}
          </tbody>
          <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={2} style={{padding:"10px 14px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL</td>
            <td style={{padding:"10px 14px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums",fontSize:13}}>{cur}{Number(Math.round(totDr)).toLocaleString()}</td>
            <td style={{padding:"10px 14px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums",fontSize:13}}>{cur}{Number(Math.round(totCr)).toLocaleString()}</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

export function AdvanceDepositLedger({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [advances,setAdvances]=useState(_ADVANCES);
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({client:"",fileId:"",received:0,type:"Advance",mode:"NEFT",utr:""});

  const filtered=advances.filter(a=>!brCode||a.id.includes(brCode));
  const totReceived=filtered.reduce((s,a)=>s+a.received,0);
  const totAdjusted=filtered.reduce((s,a)=>s+a.adjustedAmt,0);
  const totPending=totReceived-totAdjusted;

  const STATUS_CLR={"Unadjusted":"#A32D2D","Partially Adjusted":"#854F0B","Fully Adjusted":"#27500A","No File Linked":"#5a6691"};
  const STATUS_BG ={"Unadjusted":"#FCEBEB","Partially Adjusted":"#FAEEDA","Fully Adjusted":"#EAF3DE","No File Linked":"#f3f4f8"};
  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");

  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>💵</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Advance / Deposit Ledger</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Track client advances per booking file · adjust on final invoice</p>
          </div>
        </div>
        <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Record Advance</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[{l:"Total Received",v:f(totReceived),c:"#27500A",bg:"#EAF3DE"},
          {l:"Adjusted vs Invoice",v:f(totAdjusted),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Pending Adjustment",v:f(totPending),c:"#A32D2D",bg:"#FCEBEB"},
          {l:"No File Linked",v:String(filtered.filter(a=>!a.fileId).length),c:"#854F0B",bg:"#FAEEDA"},
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
            {["Advance ID","Date","Client","Booking File","Type","Mode","Amount","Adjusted","Balance","Status"].map((h,i)=>(
              <th key={i} style={{padding:"9px 11px",textAlign:i>=6&&i<=8?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((a,i)=>(
            <tr key={a.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{a.id}</td>
              <td style={{padding:"8px 11px",color:"#5a6691",whiteSpace:"nowrap"}}>{a.date}</td>
              <td style={{padding:"8px 11px",fontWeight:600,color:"#0d1326"}}>{a.client}</td>
              <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:9.5,color:a.fileId?"#27500A":"#A32D2D"}}>{a.fileId||"⚠ Not linked"}</td>
              <td style={{padding:"8px 11px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{a.type}</span></td>
              <td style={{padding:"8px 11px",fontSize:10.5,color:"#5a6691"}}>{a.mode}</td>
              <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(a.received)}</td>
              <td style={{padding:"8px 11px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#185FA5"}}>{f(a.adjustedAmt)}</td>
              <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:a.received-a.adjustedAmt>0?"#A32D2D":"#27500A"}}>{f(a.received-a.adjustedAmt)}</td>
              <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[a.status]||"#f3f4f8",color:STATUS_CLR[a.status]||"#5a6691"}}>{a.status}</span></td>
            </tr>
          ))}</tbody>
          <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={6} style={{padding:"9px 11px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL — {filtered.length} entries</td>
            <td style={{padding:"9px 11px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(totReceived)}</td>
            <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totAdjusted)}</td>
            <td style={{padding:"9px 11px",textAlign:"right",fontWeight:800,color:"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(totPending)}</td>
            <td/>
          </tr></tfoot>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:460,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Record Client Advance</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <FL label="Client name"><input value={form.client} onChange={e=>setForm(f=>({...f,client:e.target.value}))} style={inp}/></FL>
              <FL label="Booking File ID (optional)"><input value={form.fileId} onChange={e=>setForm(f=>({...f,fileId:e.target.value}))} style={{...inp,fontFamily:"monospace"}} placeholder="TK-BOM-2026-0401"/></FL>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}><option>Advance</option><option>Booking Deposit</option><option>Full Payment</option></select></FL>
                <FL label="Mode"><select value={form.mode} onChange={e=>setForm(f=>({...f,mode:e.target.value}))} style={inp}><option>NEFT</option><option>RTGS</option><option>UPI</option><option>Cheque</option><option>Cash</option></select></FL>
              </div>
              <FL label="Amount received"><input type="number" value={form.received} onChange={e=>setForm(f=>({...f,received:+e.target.value}))} style={inp}/></FL>
              <FL label="UTR / Reference no."><input value={form.utr} onChange={e=>setForm(f=>({...f,utr:e.target.value}))} style={inp}/></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={()=>{
                const id=`ADV-${(branch?.code||"BOM")}-${String(_ADVANCES.length+1).padStart(3,"0")}`;
                const rec={...form,id,adjustedAmt:0,status:form.fileId?"Unadjusted":"No File Linked"};
                _ADVANCES.push(rec);setAdvances([..._ADVANCES]);setModal(false);
              }} style={btnG}>💾 Record Advance</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   BATCH B — OPERATIONAL (Items 7–11)
   7. Passport & Document Manager
   8. Air Ticket Control Register
   9. Markup / Net Rate Sheet
   10. Vendor Payment Terms Master
   11. Supplier 360° View
   ════════════════════════════════════════════════════════════════ */

/* ── ITEM 7: PASSPORT & DOCUMENT MANAGER  /masters/passports ──── */

export function CashFlowForecast({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const TODAY=todayISO();

  /* Build 90-day forecast */
  const bills=GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&b.date>="2026-04-01");
  const acts=EXP_ACTUALS.filter(a=>(!brCode||a.br===brCode)&&a.m>="2026-04");

  const monthlyRev=bills.reduce((s,b)=>s+b.sell,0)/2; // avg 2 months
  const monthlyBurn=acts.reduce((s,a)=>s+a.a,0)/2;
  const openingBank=monthlyRev*0.35;

  /* Inflows: receivables collection schedule */
  // No bundled demo forecast — a real 13-week cash-flow engine feeds this later.
  const inflows=[];

  /* Outflows: scheduled payments — no bundled demo data */
  const outflows=[];

  /* Build running balance */
  const allEvents=[
    ...inflows.map(e=>({...e,isInflow:true})),
    ...outflows.map(e=>({...e,isInflow:false})),
  ].sort((a,b)=>a.date.localeCompare(b.date));

  let running=openingBank;
  const enriched=allEvents.map(e=>{
    running+=e.isInflow?e.amt:-e.amt;
    return{...e,balance:running};
  });

  const minBalance=Math.min(...enriched.map(e=>e.balance));
  const f=n=>n>=1000000?cur+(n/100000).toFixed(1)+"L":cur+Number(Math.round(n)).toLocaleString("en-IN");
  const TYPE_CLR={Receipt:"#27500A",BSP:"#A32D2D",Fixed:"#854F0B",Salary:"#185FA5",Supplier:"#854F0B",Tax:"#A32D2D"};
  const TYPE_BG={Receipt:"#EAF3DE",BSP:"#FCEBEB",Fixed:"#FAEEDA",Salary:"#E6F1FB",Supplier:"#FAEEDA",Tax:"#FCEBEB"};
  const maxAbs=Math.max(Math.abs(openingBank),Math.max(...enriched.map(e=>Math.abs(e.balance))));

  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔮</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Cash Flow Forecast — 90 Days</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Projected bank balance · Inflows vs scheduled outflows · Opening: {f(openingBank)}</p>
          </div>
        </div>
      </div>

      {minBalance<0&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600,display:"flex",gap:8}}>
        <AlertTriangle size={15}/> Cash deficit projected — minimum balance {f(minBalance)} on {enriched.find(e=>e.balance===minBalance)?.date||"—"}. Review collections or defer payments.
      </div>}

      {minBalance>=0&&<div style={{marginBottom:12,padding:"8px 14px",borderRadius:9,background:"#EAF3DE",border:"1px solid #C0DD97",fontSize:10.5,color:"#27500A",fontWeight:600}}>
        ✔ Positive cash position throughout 90-day forecast · Minimum balance: {f(minBalance)}
      </div>}

      {/* Visual balance chart */}
      <div style={{...card,marginBottom:12,padding:"14px"}}>
        <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Projected Balance Timeline</p>
        <div style={{display:"flex",gap:4,alignItems:"flex-end",height:80}}>
          {enriched.map((e,i)=>{
            const h=maxAbs>0?Math.abs(e.balance/maxAbs*70):2;
            return <div key={i} title={`${e.date}: ${f(e.balance)}`} style={{flex:1,height:h,minHeight:2,borderRadius:"2px 2px 0 0",background:e.balance>=0?"#185FA5":"#A32D2D",opacity:0.8}}/>;
          })}
        </div>
        <p style={{margin:"4px 0 0",fontSize:9,color:"#5a6691",textAlign:"center"}}>Each bar = one event (hover for date/amount) · Blue = positive · Red = negative</p>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Date","Description","Type","In","Out","Running Balance"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=3?"right":"left",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            <tr style={{background:"#f3f4f8"}}>
              <td style={{padding:"9px 12px",color:"#5a6691"}}>{TODAY}</td>
              <td colSpan={4} style={{padding:"9px 12px",fontWeight:600,color:"#0d1326"}}>Opening Balance (estimated)</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#185FA5",fontSize:13,fontVariantNumeric:"tabular-nums"}}>{f(openingBank)}</td>
            </tr>
            {enriched.map((e,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:e.balance<0?"#fff5f5":i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",color:"#5a6691",whiteSpace:"nowrap"}}>{e.date}</td>
                <td style={{padding:"8px 12px",color:"#384677"}}>{e.desc}</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:TYPE_BG[e.type]||"#f3f4f8",color:TYPE_CLR[e.type]||"#5a6691"}}>{e.type}</span></td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,color:"#27500A",fontVariantNumeric:"tabular-nums"}}>{e.isInflow?f(e.amt):"—"}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{!e.isInflow?f(e.amt):"—"}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontSize:12,fontVariantNumeric:"tabular-nums",color:e.balance>=0?"#185FA5":"#A32D2D"}}>{f(e.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── ITEM 13: GSTR-2B RECONCILIATION  /tax/gstr2b ─────────────── */

export const TDS_SECTIONS={
  "194C":{label:"194C — Contractors/DMC",rate:2,   threshold:30000,  payable:"tds_pay_c"},
  "194H":{label:"194H — Commission/BSP", rate:5,   threshold:15000,  payable:"tds_pay_h"},
  "194J":{label:"194J — Professional Svc",rate:10, threshold:30000,  payable:"tds_pay_j"},
  "194D":{label:"194D — Insurance",       rate:5,  threshold:15000,  payable:"tds_pay_d"},
  "None": {label:"No TDS",               rate:0,   threshold:0,      payable:null},
};

/* ── LEDGER AUTOCOMPLETE COMPONENT ─────────────────────────── */

export function CashBookReport({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?"BOM":branch?.code||"BOM";
  const [date,setDate]=useState(todayISO());
  const [cashAccount,setCashAccount]=useState("Cash in Hand — BOM");

  const entries=useMemo(()=>{
    const bills=GP_BILLS.filter(b=>b.branch===brCode&&b.date===date);
    const recpts=bills.slice(0,Math.ceil(bills.length*0.6)).map((b,i)=>({id:`CR-${i+1}`,type:"Receipt",ref:b.id.replace("/SF","/RV"),narration:`Receipt from ${b.client} — ${b.mod}`,dr:Math.round(b.sell*0.3),cr:0,mode:"Cash"}));
    const pmts=[
      {id:"CP-01",type:"Payment",ref:"PMT/CASH/001",narration:"Petty cash — Office supplies",dr:0,cr:2400,mode:"Cash"},
      {id:"CP-02",type:"Payment",ref:"PMT/CASH/002",narration:"Staff lunch — client meeting",dr:0,cr:1800,mode:"Cash"},
      {id:"CP-03",type:"Payment",ref:"PMT/CASH/003",narration:"Courier charges — passport delivery",dr:0,cr:350,mode:"Cash"},
    ];
    return [...recpts,...pmts].sort((a,b)=>(a.type>b.type?1:-1));
  },[date,brCode]);

  const OPEN_BAL=18500;
  const totDr=entries.reduce((s,e)=>s+e.dr,0);
  const totCr=entries.reduce((s,e)=>s+e.cr,0);
  const closeBal=OPEN_BAL+totDr-totCr;
  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");
  let running=OPEN_BAL;

  return(
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>💵</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Cash Book</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{cashAccount} · {date} · {brCode}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}/>
          <button onClick={()=>window.print()} style={{...btnGh,fontSize:11}}><Printer size={12}/> Print</button>
          <button onClick={()=>exportToCSV(entries,["id","type","ref","narration","dr","cr"],"cashbook.csv")} style={{...btnGh,fontSize:11}}><Download size={12}/> CSV</button>
        </div>
      </div>

      {/* Balance summary strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Opening Balance",v:f(OPEN_BAL),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Total Receipts (Dr)",v:f(totDr),c:"#27500A",bg:"#EAF3DE"},
          {l:"Total Payments (Cr)",v:f(totCr),c:"#A32D2D",bg:"#FCEBEB"},
          {l:"Closing Balance",v:f(closeBal),c:closeBal>=0?"#27500A":"#A32D2D",bg:closeBal>=0?"#EAF3DE":"#FCEBEB"},
          {l:"Transactions",v:String(entries.length),c:"#384677",bg:"#f3f4f8"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"10px 12px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"3px 0 0",fontSize:mob?15:18,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["#","Type","Voucher Ref","Narration","Receipts (Dr)","Payments (Cr)","Balance"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=4?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {/* Opening balance row */}
            <tr style={{background:"#f9fafb",borderBottom:"1px solid #f3f4f8"}}>
              <td style={{padding:"8px 12px",color:"#5a6691",fontSize:10}}>—</td>
              <td colSpan={4} style={{padding:"8px 12px",fontWeight:700,color:"#185FA5"}}>Opening Balance b/d</td>
              <td style={{padding:"8px 12px",textAlign:"right"}}/>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(OPEN_BAL)}</td>
            </tr>
            {entries.map((e,i)=>{
              running+=e.dr-e.cr;
              return(
                <tr key={e.id} style={{borderBottom:"1px solid #f3f4f8",background:e.type==="Receipt"?"#f0fff4":i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"7px 12px",color:"#5a6691",fontSize:10}}>{i+1}</td>
                  <td style={{padding:"7px 12px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:e.type==="Receipt"?"#EAF3DE":"#FCEBEB",color:e.type==="Receipt"?"#27500A":"#A32D2D"}}>{e.type}</span></td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{e.ref}</td>
                  <td style={{padding:"7px 12px",color:"#384677"}}>{e.narration}</td>
                  <td style={{padding:"7px 12px",textAlign:"right",fontWeight:600,color:"#27500A",fontVariantNumeric:"tabular-nums"}}>{e.dr>0?f(e.dr):"—"}</td>
                  <td style={{padding:"7px 12px",textAlign:"right",fontWeight:600,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{e.cr>0?f(e.cr):"—"}</td>
                  <td style={{padding:"7px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:running>0?"#0d1326":"#A32D2D"}}>{f(running)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
              <td colSpan={4} style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",fontSize:12}}>CLOSING BALANCE</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#5ab84b",fontVariantNumeric:"tabular-nums"}}>{f(OPEN_BAL+totDr)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(totCr)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(closeBal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {closeBal<0&&<div style={{marginTop:10,padding:"9px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600}}>⚠ Cash book shows negative balance. Verify all entries — physical cash count required.</div>}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   BATCH B — PRIORITY 2: COMPLIANCE + FINANCE
   PfEsiChallan · YearEndClose · RecurringVouchers
   ForexReport · Form26AS · EWayBill · GratuityRegister
   ════════════════════════════════════════════════════════════════ */

/* ── PF / ESI CHALLAN REGISTER ───────────────────────────────── */

export function YearEndClose({branch}){
  const mob=useMobile();
  const [step,setStep]=useState(0);
  const [confirmed,setConfirmed]=useState({});
  const FY=`${CUR_FY.startYear-1}-${String(CUR_FY.startYear).slice(2)}`;
  const NEW_FY=CUR_FY.label;
  const CLOSE_DATE=`${CUR_FY.startYear}-03-31`;

  const steps=[
    {title:"Pre-closing checklist",icon:"📋",items:[
      {label:"All bank reconciliations completed",done:true},
      {label:"TDS returns filed (Q4 26Q/27EQ)",done:true},
      {label:"GST annual reconciliation (GSTR-9) filed",done:false},
      {label:"All purchase bills entered",done:true},
      {label:"All salary payable cleared",done:true},
      {label:"ADM provisions reviewed",done:true},
      {label:"Physical cash count done",done:true},
    ]},
    {title:"Generate closing entries",icon:"📒",desc:"These journal entries will be auto-posted to close FY 2025-26",entries:[
      {dr:"Retained Earnings",cr:"Profit & Loss A/c",amt:2840000,narr:"Transfer net profit FY 2025-26 to retained earnings"},
      {dr:"Output CGST",cr:"Electronic Cash Ledger",amt:892400,narr:"GST payment after ITC offset — FY closing"},
      {dr:"Output SGST",cr:"Electronic Cash Ledger",amt:892400,narr:"GST payment after ITC offset — FY closing"},
      {dr:"TDS Payable 194H",cr:"HDFC Bank",amt:312000,narr:"Final TDS deposit before FY close — 194H"},
    ]},
    {title:"Carry opening balances",icon:"📂",desc:"Opening balances for FY 2026-27 will be auto-computed",accounts:[
      {name:"Sundry Debtors",balance:"₹28.4L Dr",type:"Asset"},
      {name:"Bank — HDFC",balance:"₹12.8L Dr",type:"Asset"},
      {name:"BSP India Payable",balance:"₹6.2L Cr",type:"Liability"},
      {name:"Capital Account",balance:"₹45.0L Cr",type:"Capital"},
    ]},
    {title:"Lock FY and reset sequences",icon:"🔒",desc:"After this step, no vouchers can be posted to FY 2025-26"},
  ];

  return(
    <div style={{padding:"12px 10px",maxWidth:900,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📅</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Year-End Closing — FY {FY}</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Step {step+1} of {steps.length} · Lock date: {CLOSE_DATE} · New FY: {NEW_FY}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{marginBottom:16,display:"flex",gap:0}}>
        {steps.map((s,i)=>(
          <div key={i} onClick={()=>setStep(i)} style={{flex:1,cursor:"pointer",textAlign:"center",padding:"8px 4px",borderBottom:`3px solid ${step===i?"#d4a437":i<step?"#27500A":"#e1e3ec"}`,background:step===i?"#f9fafb":"transparent"}}>
            <span style={{fontSize:16}}>{s.icon}</span>
            {!mob&&<p style={{margin:"2px 0 0",fontSize:9.5,fontWeight:step===i?700:400,color:step===i?"#0d1326":i<step?"#27500A":"#5a6691"}}>{s.title}</p>}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={{...card}}>
        <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>{steps[step].icon} {steps[step].title}</p>

        {step===0&&(
          <div>
            <p style={{margin:"0 0 12px",fontSize:10.5,color:"#5a6691"}}>Complete all items before proceeding to closing entries</p>
            {steps[0].items.map((it,i)=>(
              <label key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #f3f4f8",cursor:"pointer"}}>
                <input type="checkbox" defaultChecked={it.done} style={{cursor:"pointer",accentColor:"#27500A"}}/>
                <span style={{fontSize:11,color:it.done?"#27500A":"#A32D2D",fontWeight:it.done?400:600}}>{it.label}</span>
                {it.done&&<span style={{fontSize:9.5,color:"#27500A"}}>✔</span>}
              </label>
            ))}
          </div>
        )}

        {step===1&&(
          <div>
            <p style={{margin:"0 0 12px",fontSize:10.5,color:"#5a6691"}}>{steps[1].desc}</p>
            {steps[1].entries.map((e,i)=>(
              <div key={i} style={{marginBottom:10,padding:"10px 12px",borderRadius:8,background:"#f3f4f8",border:"1px solid #e1e3ec"}}>
                <div style={{display:"flex",gap:10,marginBottom:4,fontSize:11}}>
                  <span style={{color:"#185FA5",fontWeight:700,fontFamily:"monospace",width:24}}>Dr</span>
                  <span style={{flex:1,color:"#0d1326"}}>{e.dr}</span>
                  <span style={{fontWeight:700,color:"#185FA5"}}>₹{e.amt.toLocaleString()}</span>
                </div>
                <div style={{display:"flex",gap:10,marginBottom:4,fontSize:11}}>
                  <span style={{color:"#27500A",fontWeight:700,fontFamily:"monospace",width:24}}>Cr</span>
                  <span style={{flex:1,color:"#0d1326"}}>{e.cr}</span>
                  <span style={{fontWeight:700,color:"#27500A"}}>₹{e.amt.toLocaleString()}</span>
                </div>
                <p style={{margin:0,fontSize:9.5,color:"#5a6691",fontStyle:"italic"}}>{e.narr}</p>
              </div>
            ))}
          </div>
        )}

        {step===2&&(
          <div>
            <p style={{margin:"0 0 12px",fontSize:10.5,color:"#5a6691"}}>{steps[2].desc}</p>
            {steps[2].accounts.map((a,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f3f4f8",fontSize:11}}>
                <span style={{color:"#0d1326",fontWeight:500}}>{a.name}</span>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{fontSize:9.5,padding:"1px 6px",borderRadius:999,background:"#E6F1FB",color:"#185FA5"}}>{a.type}</span>
                  <span style={{fontWeight:700,color:"#0d1326"}}>{a.balance}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {step===3&&(
          <div>
            <p style={{margin:"0 0 16px",fontSize:10.5,color:"#5a6691"}}>{steps[3].desc}</p>
            <div style={{padding:"14px 16px",borderRadius:9,background:"#FCEBEB",border:"2px solid #F7C1C1",marginBottom:14}}>
              <p style={{margin:0,fontSize:11,fontWeight:700,color:"#A32D2D"}}>⚠ WARNING — Irreversible Action</p>
              <p style={{margin:"4px 0 0",fontSize:10.5,color:"#A32D2D"}}>After locking FY {FY}, no voucher dated ≤ {CLOSE_DATE} can be modified. Voucher sequences will reset for {NEW_FY}. This action cannot be undone.</p>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:14}}>
              <input type="checkbox" id="confirm-lock" style={{cursor:"pointer",accentColor:"#A32D2D"}}/>
              <span style={{fontSize:11,fontWeight:600,color:"#A32D2D"}}>I confirm that all accounts for FY {FY} are complete and I want to lock the financial year</span>
            </label>
            <button onClick={()=>alert("FY "+FY+" locked. New vouchers will use FY "+NEW_FY+" numbering.")} style={{...btnG,background:"#A32D2D",fontSize:12}}>🔒 Lock FY {FY} and Open {NEW_FY}</button>
          </div>
        )}

        <div style={{marginTop:16,display:"flex",justifyContent:"space-between"}}>
          <button onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0} style={{...btnGh,opacity:step===0?0.4:1}}>← Back</button>
          <button onClick={()=>setStep(s=>Math.min(steps.length-1,s+1))} disabled={step===steps.length-1} style={{...btnG,opacity:step===steps.length-1?0.4:1}}>Next Step →</button>
        </div>
      </div>
    </div>
  );
}

/* ── RECURRING VOUCHER TEMPLATES ─────────────────────────────── */

export function LoanEmiRegister({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;

  const loans=LOAN_REGISTER.filter(l=>!brCode||l.branch===brCode);
  const totPrincipal=loans.reduce((s,l)=>s+l.principal,0);
  const totBalance=loans.reduce((s,l)=>s+l.balance,0);
  const totEmi=loans.reduce((s,l)=>s+l.emi,0);
  const totPaid=totPrincipal-totBalance;

  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>🏦 Loan &amp; EMI Register</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Term loans · Vehicle loans · Working capital · Amortization with principal/interest split</p>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Total Borrowed</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{cur+fmt(totPrincipal)}</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Outstanding</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{cur+fmt(totBalance)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{((totBalance/totPrincipal)*100||0).toFixed(0)}% remaining</p></div>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Repaid</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{cur+fmt(totPaid)}</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Monthly EMI</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{cur+fmt(totEmi)}</p></div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Loan ID</th><th style={{padding:"9px 8px",textAlign:"left"}}>Lender / Type</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Principal</th><th style={{padding:"9px 8px",textAlign:"center"}}>Rate</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Tenure</th><th style={{padding:"9px 8px",textAlign:"right"}}>EMI</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Paid/Remain</th><th style={{padding:"9px 8px",textAlign:"right"}}>Balance</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Next Due</th>
            </tr></thead>
            <tbody>
              {loans.map((l,i)=>(
                <tr key={l.id} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{l.id}</td>
                  <td style={{padding:"7px 8px",fontWeight:600}}>{l.lender}<div style={{fontSize:9.5,color:"#5a6691",fontWeight:400}}>{l.type} · {l.purpose}</div></td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600}}>{cur+fmt(l.principal)}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",color:"#854F0B"}}>{l.rate}%</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{l.tenure>0?l.tenure+" m":"OD"}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{l.emi>0?cur+fmt(l.emi):"—"}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{l.tenure>0?`${l.paid}/${l.paid+l.remaining}`:"—"}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,color:"#A32D2D"}}>{cur+fmt(l.balance)}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{l.nextDue}</td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{background:"#FAEEDA",fontWeight:700,fontSize:11.5}}>
              <tr><td colSpan={2} style={{padding:"9px 8px",textAlign:"right"}}>TOTAL</td>
              <td style={{padding:"9px 8px",textAlign:"right"}}>{cur+fmt(totPrincipal)}</td>
              <td colSpan={2}></td>
              <td style={{padding:"9px 8px",textAlign:"right"}}>{cur+fmt(totEmi)}</td>
              <td></td>
              <td style={{padding:"9px 8px",textAlign:"right",color:"#A32D2D"}}>{cur+fmt(totBalance)}</td>
              <td></td></tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}


export function WorkingCapitalDashboard({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;

  const TREND=[
    {month:"Dec'25",ar:18500000,inv:850000,ap:14200000,wc:5150000,dso:48,dpo:42},
    {month:"Jan'26",ar:19200000,inv:920000,ap:15850000,wc:4270000,dso:46,dpo:45},
    {month:"Feb'26",ar:20100000,inv:880000,ap:16500000,wc:4480000,dso:45,dpo:46},
    {month:"Mar'26",ar:21500000,inv:950000,ap:17800000,wc:4650000,dso:42,dpo:48},
    {month:"Apr'26",ar:22000000,inv:920000,ap:18100000,wc:4820000,dso:40,dpo:50},
    {month:"May'26",ar:22500000,inv:850000,ap:18250000,wc:5100000,dso:38,dpo:52},
  ];
  const curr=TREND[TREND.length-1];
  const prev=TREND[TREND.length-2];

  const cycle=curr.dso-curr.dpo;
  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>💼 Working Capital Dashboard</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Receivables + Inventory − Payables · Cash conversion cycle · 6-month trend</p>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Trade Receivables</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{cur+fmt(curr.ar)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>DSO {curr.dso} days</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Inventory</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{cur+fmt(curr.inv)}</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Trade Payables</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{cur+fmt(curr.ap)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>DPO {curr.dpo} days</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Net Working Capital</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{cur+fmt(curr.wc)}</p><p style={{margin:0,fontSize:10,color:curr.wc>prev.wc?"#27500A":"#A32D2D"}}>{curr.wc>prev.wc?"↑":"↓"} vs prev</p></div>
      </div>

      <div style={{...card,marginBottom:14}}>
        <h3 style={{margin:"0 0 8px",fontSize:12,color:"#0d1326"}}>Cash Conversion Cycle</h3>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <div style={{background:"#E6F1FB",padding:"8px 12px",borderRadius:6,minWidth:140,textAlign:"center"}}>
            <div style={{fontSize:10,color:"#185FA5",fontWeight:700,textTransform:"uppercase"}}>DSO</div>
            <div style={{fontSize:18,fontWeight:800,color:"#185FA5"}}>{curr.dso}d</div>
          </div>
          <span style={{fontSize:18,color:"#5a6691"}}>＋</span>
          <div style={{background:"#FAEEDA",padding:"8px 12px",borderRadius:6,minWidth:140,textAlign:"center"}}>
            <div style={{fontSize:10,color:"#854F0B",fontWeight:700,textTransform:"uppercase"}}>Inventory Days</div>
            <div style={{fontSize:18,fontWeight:800,color:"#854F0B"}}>3d</div>
          </div>
          <span style={{fontSize:18,color:"#5a6691"}}>－</span>
          <div style={{background:"#FCEBEB",padding:"8px 12px",borderRadius:6,minWidth:140,textAlign:"center"}}>
            <div style={{fontSize:10,color:"#A32D2D",fontWeight:700,textTransform:"uppercase"}}>DPO</div>
            <div style={{fontSize:18,fontWeight:800,color:"#A32D2D"}}>{curr.dpo}d</div>
          </div>
          <span style={{fontSize:18,color:"#5a6691"}}>＝</span>
          <div style={{background:cycle<0?"#EAF3DE":"#f3f4f8",padding:"8px 14px",borderRadius:6,minWidth:160,textAlign:"center",border:"2px solid "+(cycle<0?"#27500A":"#5a6691")}}>
            <div style={{fontSize:10,color:cycle<0?"#27500A":"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Cash Cycle</div>
            <div style={{fontSize:20,fontWeight:800,color:cycle<0?"#27500A":"#5a6691"}}>{cycle}d</div>
          </div>
        </div>
        <p style={{margin:"10px 0 0",fontSize:10.5,color:"#5a6691"}}>
          {cycle<0?"✓ Negative cycle — suppliers fund your operations":"You finance operations for "+cycle+" days before getting paid"}
        </p>
      </div>

      <h3 style={{margin:"8px 0 6px",fontSize:13,color:"#0d1326"}}>6-Month Trend</h3>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Month</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Receivables</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Inventory</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Payables</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Working Capital</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>DSO</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>DPO</th>
            </tr></thead>
            <tbody>
              {TREND.map((r,i)=>(
                <tr key={r.month} style={{background:i===TREND.length-1?"#FAEEDA":i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec",fontWeight:i===TREND.length-1?700:400}}>
                  <td style={{padding:"7px 8px"}}>{r.month}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(r.ar)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(r.inv)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(r.ap)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",color:"#854F0B",fontWeight:700}}>{cur+fmt(r.wc)}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}>{r.dso}d</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}>{r.dpo}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


export function CashFlowDirect({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;

  const OPERATING=[
    {label:"Receipts from customers",value:118500000},
    {label:"Receipts from sub-agents",value:4200000},
    {label:"Other operating receipts",value:850000},
    {label:"Total operating inflows",value:123550000,subtotal:true},
    {label:"Payments to airlines (BSP & non-BSP)",value:-72500000},
    {label:"Payments to DMCs & hotels",value:-28500000},
    {label:"Payments to other suppliers",value:-5850000},
    {label:"Payments to employees",value:-8450000},
    {label:"Taxes paid (GST, TDS, Income Tax)",value:-4500000},
    {label:"Other operating payments",value:-2850000},
    {label:"Total operating outflows",value:-122650000,subtotal:true},
    {label:"Net cash from operating activities",value:900000,total:true},
  ];
  const INVESTING=[
    {label:"Purchase of fixed assets",value:-3850000},
    {label:"Sale of fixed assets",value:185000},
    {label:"Purchase of investments",value:-2500000},
    {label:"Interest received",value:425000},
    {label:"Net cash from investing activities",value:-5740000,total:true},
  ];
  const FINANCING=[
    {label:"Long-term borrowings raised",value:5000000},
    {label:"Repayment of borrowings (principal)",value:-1850000},
    {label:"Interest paid",value:-1450000},
    {label:"Dividend paid",value:-500000},
    {label:"Net cash from financing activities",value:1200000,total:true},
  ];

  const netCash=900000-5740000+1200000;
  const openingCash=22850000;
  const closingCash=openingCash+netCash;

  const Section=({title,rows,color})=>(
    <div style={{marginBottom:14}}>
      <h3 style={{margin:"0 0 6px",fontSize:13,color}}>{title}</h3>
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} style={{background:r.total?"#FAEEDA":r.subtotal?"#f3f4f8":"#fff",borderBottom:"1px solid #e1e3ec"}}>
                <td style={{padding:"8px 10px",fontWeight:r.total?700:r.subtotal?600:400}}>{r.label}</td>
                <td style={{padding:"8px 10px",textAlign:"right",fontWeight:r.total?700:r.subtotal?600:400,color:r.value<0?"#A32D2D":r.value>0?(r.total?color:"#27500A"):"#5a6691"}}>{r.value<0?`(${cur+fmt(Math.abs(r.value))})`:cur+fmt(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return(
    <div style={{padding:"12px 10px",maxWidth:900,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>💧 Cash Flow Statement — Direct Method</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>For the year ended 31 March 2026 · AS 3 / Ind AS 7 · RBI-preferred format</p>

      <Section title="A. Cash Flows from Operating Activities" rows={OPERATING} color="#185FA5"/>
      <Section title="B. Cash Flows from Investing Activities" rows={INVESTING} color="#854F0B"/>
      <Section title="C. Cash Flows from Financing Activities" rows={FINANCING} color="#A32D2D"/>

      <div style={{background:"#0d1326",color:"#d4a437",borderRadius:10,padding:"14px 16px"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <tbody>
            <tr><td style={{padding:"4px 0"}}>Net increase / (decrease) in cash (A + B + C)</td><td style={{padding:"4px 0",textAlign:"right",fontWeight:700}}>{netCash<0?`(${cur+fmt(Math.abs(netCash))})`:cur+fmt(netCash)}</td></tr>
            <tr><td style={{padding:"4px 0"}}>Cash and cash equivalents — Opening</td><td style={{padding:"4px 0",textAlign:"right"}}>{cur+fmt(openingCash)}</td></tr>
            <tr style={{borderTop:"1px solid #d4a437"}}><td style={{padding:"6px 0",fontWeight:700,fontSize:13}}>Cash and cash equivalents — Closing</td><td style={{padding:"6px 0",textAlign:"right",fontWeight:700,fontSize:13}}>{cur+fmt(closingCash)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}


export const TDS_SECTIONS_TABLE = [
  {section:"194A",description:"Interest (other than securities)",threshold:40000,rateWithPAN:10,rateWithoutPAN:20,category:"Interest"},
  {section:"194C",description:"Payment to contractors/sub-contractors",threshold:30000,rateWithPAN:1,rateWithoutPAN:20,rateCompany:2,category:"Contract"},
  {section:"194H",description:"Commission or brokerage",threshold:15000,rateWithPAN:5,rateWithoutPAN:20,category:"Commission"},
  {section:"194I(a)",description:"Rent — plant & machinery",threshold:240000,rateWithPAN:2,rateWithoutPAN:20,category:"Rent"},
  {section:"194I(b)",description:"Rent — land, building, furniture",threshold:240000,rateWithPAN:10,rateWithoutPAN:20,category:"Rent"},
  {section:"194J",description:"Fees for professional/technical services",threshold:30000,rateWithPAN:10,rateWithoutPAN:20,category:"Professional"},
  {section:"194Q",description:"Purchase of goods",threshold:5000000,rateWithPAN:0.1,rateWithoutPAN:5,category:"Purchase"},
  {section:"206C(1H)",description:"TCS on sale of goods > ₹50L",threshold:5000000,rateWithPAN:0.1,rateWithoutPAN:1,category:"TCS"},
];

/* ════════════════════════════════════════════════════════════════════
   1. BANK BALANCE DASHBOARD
   ════════════════════════════════════════════════════════════════════ */

export function BankBalanceDashboard(){
  const [filterBranch,setFilterBranch]=useState("ALL");
  const FX=FX_RATES;
  const toINR=(amt,cur)=>amt*(FX[cur]||1);

  const filtered=BANK_ACCOUNTS_DATA.filter(b=>filterBranch==="ALL"||b.branch===filterBranch);
  const totalINR=filtered.reduce((s,b)=>s+toINR(b.openingBal,b.currency),0);
  const totalLimit=filtered.reduce((s,b)=>s+toINR(b.limit,b.currency),0);

  const byBranch=["BOM","AMD"].map(br=>{
    const accts=BANK_ACCOUNTS_DATA.filter(b=>b.branch===br);
    const balINR=accts.reduce((s,b)=>s+toINR(b.openingBal,b.currency),0);
    return {branch:br,balINR,accts:accts.length};
  });
  const chartMax=Math.max(...byBranch.map(b=>b.balINR));
  const byCurrency={};
  BANK_ACCOUNTS_DATA.forEach(b=>{byCurrency[b.currency]=(byCurrency[b.currency]||0)+b.openingBal;});

  const statusColor=b=>{const p=b.openingBal/b.limit;return p>0.8?"#A32D2D":p>0.5?"#d4a437":"#22c55e";};

  return(
    <PHASE2_Page title="Bank Balance Dashboard"
      subtitle="Real-time balances across all accounts · all branches · all currencies"
      toolbar={<>
        <select value={filterBranch} onChange={e=>setFilterBranch(e.target.value)} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,background:"#fff"}}>
          <option value="ALL">All branches</option>
          {BRANCH_CODES.map(b=><option key={b}>{b}</option>)}
        </select>
        <button style={{padding:"7px 12px",background:"#fff",border:"1px solid #d4a437",color:"#d4a437",borderRadius:6,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>↻ Refresh</button>
        <button style={{padding:"7px 12px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>📤 Export</button>
      </>}>

      {/* KPI row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:14}}>
        <div style={{...cardStyle,borderTop:"3px solid #22c55e"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>Total Cash (INR Equiv)</p><p style={{margin:"5px 0 2px",fontSize:22,fontWeight:700,color:"#0d1326"}}>{fmtINR(totalINR)}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>{filtered.length} accounts</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #d4a437"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>Limit Utilised</p><p style={{margin:"5px 0 2px",fontSize:22,fontWeight:700,color:"#0d1326"}}>{Math.round(totalINR/totalLimit*100)}%</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>{fmtINR(totalLimit)} total limit</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #3b82f6"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>Currencies</p><p style={{margin:"5px 0 2px",fontSize:22,fontWeight:700,color:"#0d1326"}}>{Object.keys(byCurrency).length}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>{Object.keys(byCurrency).join(", ")}</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>Pending Reconciliation</p><p style={{margin:"5px 0 2px",fontSize:22,fontWeight:700,color:"#A32D2D"}}>32</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>transactions unmatched</p></div>
      </div>

      {/* Branch bar chart + currency summary */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
        <div style={cardStyle}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Balance by Branch (INR Equivalent)</p>
          {byBranch.map(b=>(
            <div key={b.branch} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:700,color:"#0d1326"}}>{b.branch}</span>
                <span style={{fontSize:12,fontWeight:700,color:"#0d1326"}}>{fmtINR(b.balINR)}</span>
              </div>
              <div style={{height:10,background:"#f0f2f7",borderRadius:5,overflow:"hidden"}}>
                <div style={{height:"100%",width:(b.balINR/chartMax*100)+"%",background:"#d4a437",borderRadius:5,minWidth:b.balINR>0?4:0}}/>
              </div>
              <p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691"}}>{b.accts} account{b.accts!==1?"s":""}</p>
            </div>
          ))}
        </div>
        <div style={cardStyle}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Balance by Currency</p>
          {Object.entries(byCurrency).map(([cur,amt])=>(
            <div key={cur} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #f0f2f7"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{padding:"2px 7px",background:"#e6e8f1",borderRadius:3,fontSize:10.5,fontWeight:700,color:"#0d1326",fontFamily:"monospace"}}>{cur}</span>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326",fontFamily:"monospace"}}>{amt.toLocaleString("en-IN")}</p>
                <p style={{margin:0,fontSize:10,color:"#5a6691"}}>≈ {fmtINR(toINR(amt,cur))}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Account-level table */}
      <div style={{...cardStyle}}>
        <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>All Accounts — Detail</p>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr>
              <th style={RPT_thStyle}>Branch</th><th style={RPT_thStyle}>Bank · A/c</th>
              <th style={RPT_thStyle}>Type</th><th style={RPT_thStyle}>Currency</th>
              <th style={{...RPT_thStyle,textAlign:"right"}}>Balance</th>
              <th style={{...RPT_thStyle,textAlign:"right"}}>INR Equiv</th>
              <th style={{...RPT_thStyle,textAlign:"right"}}>Limit</th>
              <th style={{...RPT_thStyle,textAlign:"center"}}>Utilisation</th>
              <th style={{...RPT_thStyle,textAlign:"center"}}>Status</th>
            </tr></thead>
            <tbody>{filtered.map(b=>{
              const balINR=toINR(b.openingBal,b.currency);
              const limINR=toINR(b.limit,b.currency);
              const pct=Math.round(b.openingBal/b.limit*100);
              return(
                <tr key={b.id} style={{borderBottom:"1px solid #f0f2f7"}}>
                  <td style={RPT_tdStyle}><span style={{padding:"2px 6px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{b.branch}</span></td>
                  <td style={RPT_tdStyle}><p style={{margin:0,fontSize:12,fontWeight:600,color:"#0d1326"}}>{b.bank}</p><p style={{margin:0,fontSize:10,fontFamily:"monospace",color:"#5a6691"}}>...{b.accountNo.slice(-6)}</p></td>
                  <td style={{...RPT_tdStyle,fontSize:11}}>{b.type}</td>
                  <td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:700}}>{b.currency}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",fontWeight:600}}>{b.openingBal.toLocaleString("en-IN")}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(balINR)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",color:"#5a6691"}}>{fmtINR(limINR)}</td>
                  <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f2f7",textAlign:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{flex:1,height:6,background:"#f0f2f7",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:statusColor(b),borderRadius:3}}/></div>
                      <span style={{fontSize:10.5,fontWeight:700,color:statusColor(b),minWidth:30}}>{pct}%</span>
                    </div>
                  </td>
                  <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",background:"#d4edda",color:"#155724",borderRadius:3,fontSize:10,fontWeight:700}}>{b.status}</span></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        <p style={{margin:"10px 0 0",fontSize:10.5,color:"#5a6691"}}>Last refreshed: 2026-05-20 11:58 IST · Auto-refreshes every 15 minutes</p>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   2. TDS AUTO-CALCULATOR
   ════════════════════════════════════════════════════════════════════ */

export function TDSCalculator(){
  const [section,setSection]=useState("194C");
  const [amount,setAmount]=useState(500000);
  const [hasPAN,setHasPAN]=useState(true);
  const [isCompany,setIsCompany]=useState(false);
  const [pan,setPan]=useState("AAACL0140P");

  const sec=TDS_SECTIONS_TABLE.find(s=>s.section===section)||TDS_SECTIONS_TABLE[0];
  const rate=hasPAN?(isCompany&&sec.rateCompany?sec.rateCompany:sec.rateWithPAN):sec.rateWithoutPAN;
  const tdsAmt=Math.round(amount*rate/100);
  const netPayable=amount-tdsAmt;
  const aboveThreshold=amount>sec.threshold;
  const inp={padding:"8px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12.5,width:"100%"};

  return(
    <PHASE2_Page title="TDS Auto-Calculator" subtitle="Section auto-selected · rate auto-applied based on PAN availability · threshold check">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {/* Inputs */}
        <div style={cardStyle}>
          <p style={{margin:"0 0 16px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Voucher Details</p>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Payment Nature / Section</label>
              <select value={section} onChange={e=>setSection(e.target.value)} style={inp}>
                {TDS_SECTIONS_TABLE.map(s=><option key={s.section} value={s.section}>{s.section} — {s.description}</option>)}
              </select></div>
            <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Gross Payment Amount (₹)</label>
              <input type="number" value={amount} onChange={e=>setAmount(+e.target.value)} style={{...inp,fontFamily:"monospace",fontSize:14,fontWeight:700}}/></div>
            <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Vendor PAN</label>
              <div style={{display:"flex",gap:8}}>
                <input value={pan} onChange={e=>setPan(e.target.value)} style={{...inp,fontFamily:"monospace"}} placeholder="AAACL0140P"/>
                <span style={{padding:"8px 12px",background:pan.length===10?"#d4edda":"#f8d7da",color:pan.length===10?"#155724":"#721c24",borderRadius:5,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{pan.length===10?"✓ Valid":"✗ Invalid"}</span>
              </div></div>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,cursor:"pointer"}}>
              <input type="checkbox" checked={hasPAN} onChange={e=>setHasPAN(e.target.checked)}/>
              <span>Vendor has submitted PAN</span>
            </label>
            {section==="194C"&&<label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,cursor:"pointer"}}>
              <input type="checkbox" checked={isCompany} onChange={e=>setIsCompany(e.target.checked)}/>
              <span>Vendor is a Company (2% rate applies)</span>
            </label>}
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,cursor:"pointer"}}>
              <input type="checkbox"/>
              <span>15G / 15H declaration received</span>
            </label>
          </div>
        </div>

        {/* Results */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Threshold check */}
          <div style={{padding:14,background:aboveThreshold?"#fff8e8":"#f0fff4",border:"1px solid "+(aboveThreshold?"#fde68a":"#bbf7d0"),borderRadius:8}}>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:aboveThreshold?"#856404":"#155724"}}>
              {aboveThreshold?"✓ Above threshold — TDS applicable":"○ Below threshold — TDS not applicable"}
            </p>
            <p style={{margin:"3px 0 0",fontSize:11,color:"#5a6691"}}>{sec.section} threshold: ₹{sec.threshold.toLocaleString("en-IN")} | Payment: ₹{amount.toLocaleString("en-IN")}</p>
          </div>

          {/* Calculation breakdown */}
          <div style={cardStyle}>
            <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>TDS Calculation</p>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[
                {label:"Section",val:sec.section+" — "+sec.description,mono:false},
                {label:"TDS Rate",val:rate+"% "+(hasPAN?"(with PAN)":"(NO PAN — higher rate)"),mono:false,color:!hasPAN?"#A32D2D":"#0d1326"},
                {label:"Gross Amount",val:"₹ "+amount.toLocaleString("en-IN"),mono:true},
                {label:"TDS Amount",val:"₹ "+tdsAmt.toLocaleString("en-IN"),mono:true,bold:true,color:"#A32D2D"},
                {label:"Net Payable to Vendor",val:"₹ "+netPayable.toLocaleString("en-IN"),mono:true,bold:true,color:"#22c55e"},
              ].map((r,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f0f2f7"}}>
                  <span style={{fontSize:11.5,color:"#5a6691"}}>{r.label}</span>
                  <span style={{fontSize:r.bold?14:12,fontWeight:r.bold?700:500,color:r.color||"#0d1326",fontFamily:r.mono?"monospace":"inherit"}}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{padding:14,background:"#0d1326",borderRadius:8,color:"#fff"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><p style={{margin:0,fontSize:11,color:"#d4a437",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>Pay to Vendor</p><p style={{margin:"4px 0 0",fontSize:26,fontWeight:700,fontFamily:"monospace",color:"#fff"}}>{fmtINR(netPayable)}</p></div>
              <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:11,color:"#d4a437",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>Deposit TDS to Govt</p><p style={{margin:"4px 0 0",fontSize:26,fontWeight:700,fontFamily:"monospace",color:"#d4a437"}}>{fmtINR(tdsAmt)}</p></div>
            </div>
            <p style={{margin:"10px 0 0",fontSize:10.5,color:"#5a6691",borderTop:"1px solid #ffffff20",paddingTop:8}}>Challan 281 · Due by 7th of following month · Credit to TRACES within 30 days</p>
          </div>

          {/* TDS rates reference */}
          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Quick rate reference — {sec.section}</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#f7f8fb"}}><th style={{...RPT_thStyle,textAlign:"left"}}>Condition</th><th style={{...RPT_thStyle,textAlign:"right"}}>Rate</th></tr></thead>
              <tbody>
                <tr><td style={RPT_tdStyle}>With valid PAN{sec.rateCompany?" (Individual/HUF)":""}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{sec.rateWithPAN}%</td></tr>
                {sec.rateCompany&&<tr><td style={RPT_tdStyle}>With valid PAN (Company)</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{sec.rateCompany}%</td></tr>}
                <tr><td style={RPT_tdStyle}>Without PAN / invalid PAN</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#A32D2D"}}>{sec.rateWithoutPAN}%</td></tr>
                <tr><td style={RPT_tdStyle}>Threshold (per transaction)</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{fmtINR(sec.threshold)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   3. INTEREST CALCULATOR (delayed payments)
   ════════════════════════════════════════════════════════════════════ */

export function InterestCalculator(){
  const [principal,setPrincipal]=useState(500000);
  const [rate,setRate]=useState(18);
  const [dueDate,setDueDate]=useState("2026-04-01");
  const [calcDate,setCalcDate]=useState(todayISO());
  const [mode,setMode]=useState("simple");
  const inp={padding:"8px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12.5,width:"100%"};

  const msPerDay=86400000;
  const days=Math.max(0,Math.round((new Date(calcDate)-new Date(dueDate))/msPerDay));
  const simpleInt=Math.round(principal*rate/100*days/365);
  const compInt=Math.round(principal*(Math.pow(1+rate/100/12,days/30.44)-1));
  const interest=mode==="simple"?simpleInt:compInt;
  const total=principal+interest;

  const monthly=[];
  let rem=principal,runInt=0;
  const monthRate=rate/100/12;
  for(let m=1;m<=Math.min(Math.ceil(days/30),12);m++){
    const mInt=Math.round(rem*monthRate);
    runInt+=mInt;
    monthly.push({m,opening:rem,interest:mInt,cumInt:runInt});
  }

  return(
    <PHASE2_Page title="Interest Calculator — Delayed Payments"
      subtitle="Calculate interest on overdue invoices · simple or compound · per-day granularity">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={cardStyle}>
          <p style={{margin:"0 0 16px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Input Parameters</p>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Outstanding Amount (Principal)</label>
              <input type="number" value={principal} onChange={e=>setPrincipal(+e.target.value)} style={{...inp,fontFamily:"monospace",fontSize:14,fontWeight:700}}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Due Date</label>
                <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={inp}/></div>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Calculate As Of</label>
                <input type="date" value={calcDate} onChange={e=>setCalcDate(e.target.value)} style={inp}/></div>
            </div>
            <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Interest Rate (% p.a.)</label>
              <input type="number" step="0.5" value={rate} onChange={e=>setRate(+e.target.value)} style={{...inp,fontFamily:"monospace",fontSize:14,fontWeight:700}}/></div>
            <div style={{display:"flex",gap:8}}>
              {["simple","compound"].map(m=>(
                <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"9px",border:mode===m?"2px solid #d4a437":"1px solid #e1e3ec",background:mode===m?"#fff8e8":"#fff",color:mode===m?"#0d1326":"#5a6691",borderRadius:6,fontSize:12,fontWeight:mode===m?700:500,cursor:"pointer",textTransform:"capitalize"}}>{m} Interest</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{padding:18,background:"#0d1326",borderRadius:8,color:"#fff",textAlign:"center"}}>
            <p style={{margin:0,fontSize:11,color:"#d4a437",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Delay — {days} days</p>
            <p style={{margin:"8px 0 4px",fontSize:11,color:"#5a6691"}}>Principal</p>
            <p style={{margin:"0 0 8px",fontSize:20,fontWeight:700,fontFamily:"monospace",color:"#fff"}}>{fmtINR(principal)}</p>
            <div style={{borderTop:"1px solid #ffffff20",paddingTop:8,marginTop:4}}>
              <p style={{margin:0,fontSize:11,color:"#f97316",fontWeight:700,textTransform:"uppercase"}}>Interest ({mode})</p>
              <p style={{margin:"4px 0 8px",fontSize:28,fontWeight:700,fontFamily:"monospace",color:"#f97316"}}>+ {fmtINR(interest)}</p>
            </div>
            <div style={{borderTop:"1px solid #ffffff20",paddingTop:8}}>
              <p style={{margin:0,fontSize:11,color:"#d4a437",fontWeight:700,textTransform:"uppercase"}}>Total Recoverable</p>
              <p style={{margin:"4px 0 0",fontSize:30,fontWeight:700,fontFamily:"monospace",color:"#d4a437"}}>{fmtINR(total)}</p>
            </div>
          </div>

          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Monthly Breakup</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#f7f8fb"}}>
                <th style={RPT_thStyle}>Month</th>
                <th style={{...RPT_thStyle,textAlign:"right"}}>Opening</th>
                <th style={{...RPT_thStyle,textAlign:"right"}}>Interest</th>
                <th style={{...RPT_thStyle,textAlign:"right"}}>Cumul. Int.</th>
              </tr></thead>
              <tbody>{monthly.map(r=>(
                <tr key={r.m} style={{borderBottom:"1px solid #f0f2f7"}}>
                  <td style={{...RPT_tdStyle,fontWeight:600}}>Month {r.m}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{fmtINR(r.opening)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",color:"#f97316",fontWeight:700,fontFamily:"monospace"}}>{fmtINR(r.interest)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{fmtINR(r.cumInt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   4. INVESTMENT REGISTER
   ════════════════════════════════════════════════════════════════════ */

export function InvestmentRegister(){
  const [filter,setFilter]=useState("ALL");
  const filtered=filter==="ALL"?INVESTMENT_DATA:INVESTMENT_DATA.filter(i=>i.type===filter);
  const active=INVESTMENT_DATA.filter(i=>i.status==="Active");
  const totalInvested=active.reduce((s,i)=>s+i.amount,0);
  const totalMaturity=active.reduce((s,i)=>s+i.maturityValue,0);
  const totalReturn=totalMaturity-totalInvested;
  const typeColor={FD:"#3b82f6",MF:"#22c55e",GOI:"#d4a437",NCD:"#6B4C8B"};

  return(
    <PHASE2_Page title="Investment Register"
      subtitle="Fixed Deposits · Mutual Funds · Govt Securities · all treasury investments"
      toolbar={<>
        {["ALL","FD","MF","GOI"].map(t=>(
          <button key={t} onClick={()=>setFilter(t)} style={{padding:"6px 14px",border:filter===t?"2px solid #0d1326":"1px solid #e1e3ec",background:filter===t?"#0d1326":"#fff",color:filter===t?"#d4a437":"#5a6691",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>{t==="ALL"?"All Types":t}</button>
        ))}
        <button style={{padding:"7px 12px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>+ Add Investment</button>
      </>}>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,marginBottom:14}}>
        <div style={{...cardStyle,borderTop:"3px solid #3b82f6"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Total Invested</p><p style={{margin:"5px 0 2px",fontSize:20,fontWeight:700,color:"#0d1326"}}>{fmtINR(totalInvested)}</p><p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{active.length} active investments</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #22c55e"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Expected Returns</p><p style={{margin:"5px 0 2px",fontSize:20,fontWeight:700,color:"#22c55e"}}>+{fmtINR(totalReturn)}</p><p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{((totalReturn/totalInvested)*100).toFixed(1)}% overall yield</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #f97316"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Maturing Soon</p><p style={{margin:"5px 0 2px",fontSize:20,fontWeight:700,color:"#f97316"}}>2</p><p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>within 60 days</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #d4a437"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Maturity Value</p><p style={{margin:"5px 0 2px",fontSize:20,fontWeight:700,color:"#0d1326"}}>{fmtINR(totalMaturity)}</p><p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>at projected rates</p></div>
      </div>

      <div style={cardStyle}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr>
              <th style={RPT_thStyle}>ID</th><th style={RPT_thStyle}>Type</th>
              <th style={RPT_thStyle}>Institution</th><th style={RPT_thStyle}>Branch</th>
              <th style={{...RPT_thStyle,textAlign:"right"}}>Invested</th>
              <th style={{...RPT_thStyle,textAlign:"right"}}>Rate %</th>
              <th style={RPT_thStyle}>Start</th><th style={RPT_thStyle}>Maturity</th>
              <th style={RPT_thStyle}>Tenure</th>
              <th style={{...RPT_thStyle,textAlign:"right"}}>Mat. Value</th>
              <th style={{...RPT_thStyle,textAlign:"center"}}>Auto-Renew</th>
              <th style={{...RPT_thStyle,textAlign:"center"}}>Status</th>
            </tr></thead>
            <tbody>{filtered.map(inv=>(
              <tr key={inv.id} style={{borderBottom:"1px solid #f0f2f7",background:inv.status==="Matured"?"#f7f8fb":"#fff"}}>
                <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5,color:"#5a6691"}}>{inv.id}</td>
                <td style={RPT_tdStyle}><span style={{padding:"2px 8px",borderRadius:3,fontSize:10.5,fontWeight:700,background:(typeColor[inv.type]||"#e1e3ec")+"22",color:typeColor[inv.type]||"#0d1326"}}>{inv.type}</span></td>
                <td style={{...RPT_tdStyle,fontWeight:600}}>{inv.institution}</td>
                <td style={RPT_tdStyle}><span style={{padding:"1px 6px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{inv.branch}</span></td>
                <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(inv.amount)}</td>
                <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#22c55e"}}>{inv.rate}%</td>
                <td style={{...RPT_tdStyle,fontSize:11}}>{inv.startDate}</td>
                <td style={{...RPT_tdStyle,fontSize:11,color:inv.maturityDate!=="—"&&inv.maturityDate<="2026-07-20"?"#f97316":"#5a6691"}}>{inv.maturityDate}</td>
                <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:11}}>{inv.tenure}</td>
                <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#22c55e"}}>{fmtINR(inv.maturityValue)}</td>
                <td style={{...RPT_tdStyle,textAlign:"center"}}>{inv.autoRenew?"✓":"—"}</td>
                <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:700,background:inv.status==="Active"?"#d4edda":"#e2e3e5",color:inv.status==="Active"?"#155724":"#383d41"}}>{inv.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   5. LOAN AMORTIZATION SCHEDULE GENERATOR
   ════════════════════════════════════════════════════════════════════ */

export function LoanAmortization(){
  const [principal,setPrincipal]=useState(5000000);
  const [annualRate,setAnnualRate]=useState(10.5);
  const [tenureMonths,setTenureMonths]=useState(60);
  const [startDate,setStartDate]=useState("2026-06-01");
  const [showAll,setShowAll]=useState(false);
  const inp={padding:"8px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12.5,width:"100%"};

  const r=annualRate/100/12;
  const emi=principal>0&&r>0&&tenureMonths>0
    ?Math.round(principal*r*Math.pow(1+r,tenureMonths)/(Math.pow(1+r,tenureMonths)-1))
    :0;
  const totalPayment=emi*tenureMonths;
  const totalInterest=totalPayment-principal;

  const schedule=[];
  let bal=principal;
  const start=new Date(startDate);
  for(let m=1;m<=tenureMonths;m++){
    const intComp=Math.round(bal*r);
    const princComp=emi-intComp;
    bal=Math.max(0,bal-princComp);
    const d=new Date(start);
    d.setMonth(d.getMonth()+m-1);
    schedule.push({m,date:d.toISOString().slice(0,7),opening:bal+princComp,emi,interest:intComp,principal:princComp,closing:bal});
  }
  const display=showAll?schedule:schedule.slice(0,12);

  return(
    <PHASE2_Page title="Loan Amortization Schedule" subtitle="Full EMI breakup · month-by-month principal vs interest split">
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:14}}>
        {/* Inputs */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={cardStyle}>
            <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Loan Parameters</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Loan Amount (Principal)</label>
                <input type="number" value={principal} onChange={e=>setPrincipal(+e.target.value)} style={{...inp,fontFamily:"monospace",fontSize:14,fontWeight:700}}/></div>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Annual Interest Rate (%)</label>
                <input type="number" step="0.25" value={annualRate} onChange={e=>setAnnualRate(+e.target.value)} style={{...inp,fontFamily:"monospace",fontSize:14,fontWeight:700}}/></div>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Tenure (months)</label>
                <input type="number" value={tenureMonths} onChange={e=>setTenureMonths(+e.target.value)} style={{...inp,fontFamily:"monospace",fontSize:14,fontWeight:700}}/>
                <p style={{margin:"3px 0 0",fontSize:10.5,color:"#5a6691"}}>{Math.floor(tenureMonths/12)}y {tenureMonths%12}m</p></div>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>First EMI Date</label>
                <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={inp}/></div>
            </div>
          </div>

          {/* EMI summary */}
          <div style={{padding:16,background:"#0d1326",borderRadius:8,color:"#fff"}}>
            <p style={{margin:"0 0 10px",fontSize:11,color:"#d4a437",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Monthly EMI</p>
            <p style={{margin:"0 0 12px",fontSize:30,fontWeight:700,fontFamily:"monospace",color:"#fff"}}>{fmtINR(emi)}</p>
            {[{l:"Principal",v:fmtINR(principal),c:"#fff"},{l:"Total Interest",v:fmtINR(totalInterest),c:"#f97316"},{l:"Total Payment",v:fmtINR(totalPayment),c:"#d4a437"}].map(r=>(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderTop:"1px solid #ffffff15"}}>
                <span style={{fontSize:11,color:"#5a6691"}}>{r.l}</span>
                <span style={{fontSize:12,fontWeight:700,color:r.c,fontFamily:"monospace"}}>{r.v}</span>
              </div>
            ))}
          </div>

          {/* Interest ratio bar */}
          <div style={cardStyle}>
            <p style={{margin:"0 0 8px",fontSize:11.5,fontWeight:700,color:"#0d1326"}}>Principal vs Interest breakdown</p>
            <div style={{height:14,borderRadius:5,overflow:"hidden",display:"flex"}}>
              <div style={{background:"#22c55e",flex:principal}} title={`Principal: ${fmtINR(principal)}`}/>
              <div style={{background:"#f97316",flex:totalInterest}} title={`Interest: ${fmtINR(totalInterest)}`}/>
            </div>
            <div style={{display:"flex",gap:14,marginTop:6,fontSize:10.5}}>
              <span><span style={{color:"#22c55e",fontWeight:700}}>■</span> Principal {Math.round(principal/totalPayment*100)}%</span>
              <span><span style={{color:"#f97316",fontWeight:700}}>■</span> Interest {Math.round(totalInterest/totalPayment*100)}%</span>
            </div>
          </div>
        </div>

        {/* Schedule table */}
        <div style={cardStyle}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Amortization Schedule</p>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowAll(!showAll)} style={{padding:"5px 12px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:5,fontSize:11,fontWeight:600,cursor:"pointer"}}>{showAll?"Show first 12":"Show all "+tenureMonths}</button>
              <button style={{padding:"5px 12px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:5,fontSize:11,fontWeight:600,cursor:"pointer"}}>📥 Excel</button>
            </div>
          </div>
          <div style={{maxHeight:480,overflowY:"auto",border:"1px solid #e1e3ec",borderRadius:6}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead style={{background:"#f7f8fb",position:"sticky",top:0}}>
                <tr><th style={RPT_thStyle}>#</th><th style={RPT_thStyle}>Date</th><th style={{...RPT_thStyle,textAlign:"right"}}>Opening</th><th style={{...RPT_thStyle,textAlign:"right"}}>EMI</th><th style={{...RPT_thStyle,textAlign:"right",color:"#f97316"}}>Interest</th><th style={{...RPT_thStyle,textAlign:"right",color:"#22c55e"}}>Principal</th><th style={{...RPT_thStyle,textAlign:"right"}}>Closing</th></tr>
              </thead>
              <tbody>{display.map(r=>(
                <tr key={r.m} style={{borderBottom:"1px solid #f0f2f7",background:r.m%2===0?"#fafbfd":"#fff"}}>
                  <td style={{...RPT_tdStyle,color:"#5a6691"}}>{r.m}</td>
                  <td style={{...RPT_tdStyle,fontFamily:"monospace"}}>{r.date}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{fmtINR(r.opening)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,fontFamily:"monospace"}}>{fmtINR(r.emi)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",color:"#f97316",fontFamily:"monospace"}}>{fmtINR(r.interest)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e",fontFamily:"monospace"}}>{fmtINR(r.principal)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{fmtINR(r.closing)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {!showAll&&tenureMonths>12&&<p style={{margin:"8px 0 0",fontSize:10.5,color:"#5a6691",textAlign:"center"}}>Showing 12 of {tenureMonths} instalments · click "Show all" to expand</p>}
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   6. RECONCILIATION QUEUE
   ════════════════════════════════════════════════════════════════════ */

export function ReconciliationQueue(){
  const [filterBank,setFilterBank]=useState("ALL");
  const [filterStatus,setFilterStatus]=useState("ALL");
  const [matched,setMatched]=useState({});
  const banks=[...new Set(RECO_QUEUE_DATA.map(r=>r.bank))];
  const filtered=RECO_QUEUE_DATA.filter(r=>{
    if(filterBank!=="ALL"&&r.bank!==filterBank) return false;
    if(filterStatus!=="ALL"&&r.matchStatus!==filterStatus) return false;
    return true;
  });
  const pending=RECO_QUEUE_DATA.filter(r=>r.matchStatus==="pending").length;
  const autoMatched=RECO_QUEUE_DATA.filter(r=>r.matchStatus==="auto_matched").length;
  const partial=RECO_QUEUE_DATA.filter(r=>r.matchStatus==="partial").length;

  const statusLabel={auto_matched:"Auto-matched",pending:"Pending",partial:"Partial match"};
  const statusStyle={
    auto_matched:{background:"#d4edda",color:"#155724"},
    pending:{background:"#fff3cd",color:"#856404"},
    partial:{background:"#cfe2ff",color:"#004085"},
  };

  return(
    <PHASE2_Page title="Reconciliation Queue"
      subtitle="Bank transactions awaiting voucher match · auto-matched · pending manual review"
      toolbar={<>
        <select value={filterBank} onChange={e=>setFilterBank(e.target.value)} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:11.5,background:"#fff"}}>
          <option value="ALL">All banks</option>{banks.map(b=><option key={b}>{b}</option>)}
        </select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:11.5,background:"#fff"}}>
          <option value="ALL">All statuses</option><option value="pending">Pending</option><option value="auto_matched">Auto-matched</option><option value="partial">Partial match</option>
        </select>
        <button style={{padding:"7px 12px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>↻ Refresh Statement</button>
      </>}>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
        <div style={{...cardStyle,borderTop:"3px solid #22c55e"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Auto-matched</p><p style={{margin:"5px 0 2px",fontSize:22,fontWeight:700,color:"#22c55e"}}>{autoMatched}</p><p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>no action needed</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #f97316"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Pending Review</p><p style={{margin:"5px 0 2px",fontSize:22,fontWeight:700,color:"#f97316"}}>{pending}</p><p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>manual action required</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #3b82f6"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Partial Match</p><p style={{margin:"5px 0 2px",fontSize:22,fontWeight:700,color:"#3b82f6"}}>{partial}</p><p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>review &amp; confirm</p></div>
        <div style={{...cardStyle,borderTop:"3px solid #d4a437"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Total Transactions</p><p style={{margin:"5px 0 2px",fontSize:22,fontWeight:700,color:"#0d1326"}}>{RECO_QUEUE_DATA.length}</p><p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>this statement period</p></div>
      </div>

      <div style={cardStyle}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr>
              <th style={RPT_thStyle}>Date</th><th style={RPT_thStyle}>Bank</th>
              <th style={RPT_thStyle}>Description</th>
              <th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th>
              <th style={RPT_thStyle}>Matched Voucher</th>
              <th style={{...RPT_thStyle,textAlign:"center"}}>Confidence</th>
              <th style={{...RPT_thStyle,textAlign:"center"}}>Status</th>
              <th style={{...RPT_thStyle,textAlign:"center"}}>Action</th>
            </tr></thead>
            <tbody>{filtered.map(r=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f0f2f7",background:matched[r.id]?"#f0fff4":"#fff"}}>
                <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:11}}>{r.date}</td>
                <td style={{...RPT_tdStyle,fontSize:11,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.bank}</td>
                <td style={{...RPT_tdStyle,maxWidth:220}}>
                  <p style={{margin:0,fontSize:11.5,color:"#0d1326"}}>{r.desc}</p>
                  <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{r.type==="credit"?"Cr":"Dr"} · {r.id}</p>
                </td>
                <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:r.type==="credit"?"#22c55e":"#A32D2D",fontFamily:"monospace"}}>
                  {r.type==="credit"?"+":"-"}{fmtINR(r.amount)}
                </td>
                <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:11,color:r.matchedVoucher?"#0d1326":"#5a6691"}}>
                  {r.matchedVoucher||"—"}
                </td>
                <td style={{...RPT_tdStyle,textAlign:"center"}}>
                  {r.confidence>0?(
                    <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
                      <div style={{width:50,height:5,background:"#f0f2f7",borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:r.confidence+"%",background:r.confidence>90?"#22c55e":r.confidence>60?"#d4a437":"#f97316",borderRadius:3}}/>
                      </div>
                      <span style={{fontSize:10.5,fontWeight:700}}>{r.confidence}%</span>
                    </div>
                  ):<span style={{color:"#5a6691"}}>—</span>}
                </td>
                <td style={{...RPT_tdStyle,textAlign:"center"}}>
                  <span style={{padding:"3px 9px",borderRadius:3,fontSize:10,fontWeight:700,...(statusStyle[r.matchStatus]||{})}}>{statusLabel[r.matchStatus]}</span>
                </td>
                <td style={{padding:"6px 12px",textAlign:"center",borderBottom:"1px solid #f0f2f7"}}>
                  {r.matchStatus==="auto_matched"&&<span style={{fontSize:10.5,color:"#22c55e",fontWeight:700}}>✓ Confirmed</span>}
                  {r.matchStatus==="pending"&&(
                    <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                      <button onClick={()=>setMatched(p=>({...p,[r.id]:true}))} style={{padding:"3px 8px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>Match</button>
                      <button style={{padding:"3px 8px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:3,fontSize:10,fontWeight:600,cursor:"pointer"}}>New</button>
                      <button style={{padding:"3px 8px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:3,fontSize:10,fontWeight:600,cursor:"pointer"}}>Skip</button>
                    </div>
                  )}
                  {r.matchStatus==="partial"&&(
                    <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                      <button style={{padding:"3px 8px",background:"#3b82f6",color:"#fff",border:"none",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>Confirm</button>
                      <button style={{padding:"3px 8px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:3,fontSize:10,fontWeight:600,cursor:"pointer"}}>Review</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p style={{margin:"10px 0 0",fontSize:10.5,color:"#5a6691"}}>Auto-match runs on: same bank account · ±1% amount tolerance · ±3 day date window · party name fuzzy match</p>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PHASE 2 — REPORTS META CAPABILITIES (4 screens, 7 features)
   Custom Builder · Saved Views · Scheduled Reports · Meta Demo
   ════════════════════════════════════════════════════════════════════ */

/* ── Seed data ────────────────────────────────────────────────────── */


export function InvestmentDeclaration(){
  const [vals,setVals]=useState(Object.fromEntries(INVESTMENT_SECTIONS.map(s=>[s.section,s.declared])));
  const totalDeclared=Object.values(vals).reduce((s,v)=>s+v,0);
  const estimatedTax=Math.max(0,Math.round((totalDeclared>500000?(totalDeclared-500000)*0.2:0)-totalDeclared*0.05));
  const inp={padding:"7px 8px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,textAlign:"right",fontFamily:"monospace",width:120};
  return(
    <PHASE2_Page title="Investment Declaration — FY 2026-27" subtitle="Declare your tax-saving investments · used for TDS calculation">
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
        <div style={cardStyle}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Declare Investments (FY 2026-27)</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Section & Description</th><th style={{...RPT_thStyle,textAlign:"right"}}>Max Limit</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount Declared</th><th style={RPT_thStyle}>Proof Required</th></tr></thead>
            <tbody>{INVESTMENT_SECTIONS.map(s=>(
              <tr key={s.section} style={{borderBottom:"1px solid #f0f2f7"}}>
                <td style={{...RPT_tdStyle,fontWeight:600}}>{s.label}</td>
                <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:"#5a6691"}}>{s.limit>0?fmtINR(s.limit):"No limit"}</td>
                <td style={{padding:"6px 12px",borderBottom:"1px solid #f0f2f7",textAlign:"right"}}>
                  <input type="number" value={vals[s.section]||""} onChange={e=>setVals(v=>({...v,[s.section]:+e.target.value}))} style={{...inp,borderColor:s.limit>0&&(vals[s.section]||0)>s.limit?"#A32D2D":"#e1e3ec"}}/>
                  {s.limit>0&&(vals[s.section]||0)>s.limit&&<p style={{margin:"2px 0 0",fontSize:9.5,color:"#A32D2D"}}>Exceeds limit</p>}
                </td>
                <td style={{...RPT_tdStyle,fontSize:10.5,color:"#5a6691"}}>{s.proof}</td>
              </tr>
            ))}</tbody>
          </table>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14}}>
            <button style={{padding:"8px 16px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>Save Draft</button>
            <button style={{padding:"8px 18px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>Submit Declaration</button>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{padding:16,background:"#0d1326",borderRadius:8,color:"#fff"}}>
            <p style={{margin:"0 0 10px",fontSize:11,color:"#d4a437",fontWeight:700,textTransform:"uppercase"}}>Tax Summary (estimate)</p>
            {[{l:"Gross Salary",v:"₹5,76,000"},{l:"Total Deductions",v:fmtINR(totalDeclared)},{l:"Taxable Income",v:fmtINR(Math.max(0,576000-totalDeclared))}].map(r=>(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #ffffff15",fontSize:12}}>
                <span style={{color:"#5a6691"}}>{r.l}</span><span style={{fontWeight:700,fontFamily:"monospace"}}>{r.v}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,fontSize:14,fontWeight:700}}>
              <span style={{color:"#d4a437"}}>Tax Saved</span>
              <span style={{color:"#22c55e",fontFamily:"monospace"}}>{fmtINR(Math.round(totalDeclared*0.2))}</span>
            </div>
          </div>
          <div style={{padding:12,background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,fontSize:11,color:"#5a6691"}}>
            <p style={{margin:"0 0 6px",fontWeight:700,color:"#0d1326",fontSize:12}}>⚠ Important</p>
            <p style={{margin:0}}>• Submit actual proof documents by 31-Jan-2027<br/>• Declarations must be submitted by 15-Apr-2026<br/>• False declarations attract tax + penalty<br/>• Consult your CA for complex scenarios</p>
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   6. FORM 16 GENERATOR
   ════════════════════════════════════════════════════════════════════ */
