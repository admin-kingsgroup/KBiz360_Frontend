/* ════════════════════════════════════════════════════════════════════
   MODULES/MASTERS.JSX
   Auto-generated from KBiz360_v2.jsx · 2884 lines · 25 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import { confirmDialog } from '../../core/ux/confirm';
import { AlertTriangle, Check, Download, Pencil, Plus, Save, Search, Settings, Trash2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ACTIVE_CURRENCIES, ADM_DATA, BRANCH_CODES, CASH, CUSTOMERS, FOREX_RATES_DATA, GP_BILLS, SUBAGENTS } from '../../core/data';
import { useNumberingSeries, useApprovalLimits } from '../../core/useReference';
import { useMasterList, useMasterMutations } from '../../core/useMasters';
import { apiPost, apiPut } from '../../core/api';
import { fmt, fmtINR } from '../../core/format';
import { exportToExcel } from '../../core/exportExcel';
import { ACM_DATA, BANK_ACCOUNTS_DATA, COST_CENTERS_DATA, DashboardRouter, MASTER_CHANGE_QUEUE, MASTER_PAGE, PROJECTS_DATA, TAB_Page, TOUR_CODES_DATA, VENDOR_ADVANCES_DATA, _PASSPORTS, cardStyle, tabPanel } from '../../core/helpers';
// MstrShell / MstrModal modernized (responsive header + shared Modal) — same props.
import { MstrShell, MstrModal } from './components/mstr';
import { useMobile } from '../../core/hooks';
import { useGpBills } from '../../core/useAccounting';
import { useModalEsc } from '../../core/ux/useModalEsc';
import { ReportDateBar, ReportSearch, matchNeedle, resolveReportRange } from '../../core/reportDateBar';
import { B, FL, RPT_tdStyle, RPT_thStyle, bc, btnG, btnGh, card, inp, inpStd, tabBtnStyle } from '../../core/styles';
import { PHASE2_Page } from '../../shell/PHASE2_Page';
import { TopBar } from '../../shell/TopBar';

// Shared "Export to Excel" toolbar button — wires a master's visible rows to the
// dependency-free CSV exporter. Pass the rows array + {key,label} columns. The
// button greys out when there's nothing to export.
export function ExportBtn({ name, columns, rows, label = "📤 Export" }) {
  const empty = !rows || rows.length === 0;
  return (
    <button onClick={() => exportToExcel(name, columns, rows || [])} disabled={empty} title="Export to Excel"
      style={{ padding: "8px 14px", background: "#fff", border: "1px solid #e1e3ec", borderRadius: 6, fontSize: 12, cursor: empty ? "not-allowed" : "pointer", opacity: empty ? 0.5 : 1 }}>
      {label}
    </button>
  );
}

export function MastersForex(){
  // Live forex rates from /api/forex-rates (date/from/to/rate/source). Add Rate
  // persists via the create mutation, so the table reflects the live collection.
  const { data: rates = [] } = useMasterList('forex-rates');
  const { create } = useMasterMutations('forex-rates');
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [form,setForm]=useState({from:"INR",to:"INR",rate:0,source:"Manual"});
  const CURRENCIES=ACTIVE_CURRENCIES;

  const save=async()=>{
    if(+form.rate<=0){
      await confirmDialog({title:"Invalid exchange rate",message:"Exchange rate must be greater than 0.",confirmLabel:"OK",cancelLabel:"Close"});
      return;
    }
    if(form.from===form.to){
      await confirmDialog({title:"Invalid currency pair",message:"From and To currency must differ (e.g. INR → INR is not a valid rate).",confirmLabel:"OK",cancelLabel:"Close"});
      return;
    }
    const rec={...form,date:new Date().toISOString().slice(0,10)};
    create.mutate(rec,{ onSuccess:()=>setModal(false) });
  };

  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>💱</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Forex Exchange Rates</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Used in foreign currency vouchers for INR conversion · Source: RBI / CBK / BOT</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <ExportBtn name="forex-rates" rows={rates} columns={[{key:"date",label:"Date"},{key:"from",label:"From Currency"},{key:"to",label:"To Currency"},{key:"rate",label:"Exchange Rate"},{key:"source",label:"Source"}]}/>
          <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Add Rate</button>
        </div>
      </div>
      <div style={{...card,padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Date","From Currency","To Currency","Exchange Rate","Source","Implied (1 INR)"].map((h,i)=>(
              <th key={i} style={{padding:"9px 14px",textAlign:i===3||i===5?"right":"left",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{rates.map((r,i)=>(
            <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"9px 14px",fontFamily:"monospace",fontSize:10.5,color:"#5a6691"}}>{r.date}</td>
              <td style={{padding:"9px 14px"}}>
                <span style={{fontSize:13,fontWeight:800,color:"#185FA5",background:"#E6F1FB",padding:"3px 10px",borderRadius:999}}>{r.from}</span>
              </td>
              <td style={{padding:"9px 14px"}}>
                <span style={{fontSize:13,fontWeight:800,color:"#27500A",background:"#EAF3DE",padding:"3px 10px",borderRadius:999}}>{r.to}</span>
              </td>
              <td style={{padding:"9px 14px",textAlign:"right",fontWeight:800,fontSize:15,fontVariantNumeric:"tabular-nums",color:"#0d1326"}}>{r.rate.toFixed(2)}</td>
              <td style={{padding:"9px 14px",fontSize:10.5,color:"#5a6691"}}>{r.source}</td>
              <td style={{padding:"9px 14px",textAlign:"right",fontSize:10.5,color:"#5a6691",fontVariantNumeric:"tabular-nums"}}>1 {r.to} = {r.rate>0?(1/r.rate).toFixed(4):"—"} {r.from}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:420,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Add Exchange Rate</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="From currency"><select value={form.from} onChange={e=>setForm(f=>({...f,from:e.target.value}))} style={inp}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></FL>
                <FL label="To currency"><select value={form.to} onChange={e=>setForm(f=>({...f,to:e.target.value}))} style={inp}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></FL>
              </div>
              <FL label="Exchange rate"><input type="number" step="0.01" value={form.rate} onChange={e=>setForm(f=>({...f,rate:+e.target.value}))} style={inp} placeholder="e.g. 83.42"/></FL>
              <FL label="Source"><select value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value}))} style={inp}><option>RBI</option><option>CBK</option><option>BOT</option><option>DGI</option><option>Manual</option><option>Bank Rate</option></select></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={save} style={btnG}>💾 Save Rate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



/* ══════════════════════════════════════════════════════════════════
   BATCH C — REPORTS / TAX / HR (Items 12–16)
   12. Cash Flow Forecast 30/60/90d
   13. GSTR-2B Reconciliation
   14. TDS Certificate Register (Form 16A)
   15. Salary Revision Tracker
   ════════════════════════════════════════════════════════════════ */

/* ── ITEM 12: CASH FLOW FORECAST  /reports/cashflow-forecast ──── */


/* ════════════════════════════════════════════════════════════════
   TDS / TCS REGISTER — COMPLETE REBUILD  /tax/tds
   Full register with 26Q/27EQ data preparation
   ════════════════════════════════════════════════════════════════ */

export function VendorTermsMaster({branch}){
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [terms,setTerms]=useState([]);   // demo data removed — populate from live vendor terms
  const TODAY="2026-05-19";
  const daysLeft=d=>Math.ceil((new Date(d)-new Date(TODAY))/(1000*60*60*24));
  const totDue=terms.filter(t=>daysLeft(t.dueDate)<=7).reduce((s,t)=>s+t.dueAmt,0);
  const totTds=terms.filter(t=>t.tds!=="None").reduce((s,t)=>s+Math.round(t.dueAmt*t.tdsRate/100),0);
  const STATUS_CLR={"Due Today":"#A32D2D","Due Soon":"#854F0B","Upcoming":"#27500A","Overdue":"#7B1F1F"};
  const STATUS_BG={"Due Today":"#FCEBEB","Due Soon":"#FAEEDA","Upcoming":"#EAF3DE","Overdue":"#FCEBEB"};
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>⏰</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Vendor Payment Terms</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{f(totDue)} due in 7 days · TDS to deduct: {f(totTds)}</p>
          </div>
        </div>
        <ExportBtn name="vendor-payment-terms" rows={terms} columns={[{key:"supplier",label:"Supplier"},{key:"type",label:"Type"},{key:"terms",label:"Terms"},{key:"dueAmt",label:"Amount Due"},{key:"dueDate",label:"Due Date"},{key:"tds",label:"TDS Section"},{key:"tdsRate",label:"TDS Rate %"}]}/>
      </div>
      {terms.filter(t=>daysLeft(t.dueDate)<=0).length>0&&(
        <div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600,display:"flex",gap:8}}>
          <AlertTriangle size={14}/> Overdue payments — process immediately to avoid supplier suspension
        </div>
      )}
      <div style={{...card,padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Supplier","Type","Terms","Amount Due","TDS Section","TDS to Hold","Net Pay","Due Date","Days","Status","Pay"].map((h,i)=>(
              <th key={i} style={{padding:"9px 11px",textAlign:i>=3&&i<=6?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{terms.map((t,i)=>{
            const dl=daysLeft(t.dueDate);
            const st=dl<0?"Overdue":dl===0?"Due Today":dl<=7?"Due Soon":"Upcoming";
            const tdsHold=t.tds!=="None"?Math.round(t.dueAmt*t.tdsRate/100):0;
            const netPay=t.dueAmt-tdsHold;
            return (
              <tr key={t.id} style={{borderBottom:"1px solid #f3f4f8",background:dl<=0?"#fff5f5":dl<=7?"#fffaf0":i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 11px",fontWeight:600,color:"#0d1326"}}>{t.supplier}</td>
                <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{t.type}</span></td>
                <td style={{padding:"8px 11px",color:"#5a6691",fontSize:10.5}}>{t.terms}</td>
                <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(t.dueAmt)}</td>
                <td style={{padding:"8px 11px"}}>{t.tds!=="None"?<span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#FAEEDA",color:"#854F0B",fontWeight:700}}>{t.tds} ({t.tdsRate}%)</span>:<span style={{fontSize:10,color:"#bfc3d6"}}>—</span>}</td>
                <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:tdsHold>0?"#854F0B":"#bfc3d6"}}>{tdsHold>0?f(tdsHold):"—"}</td>
                <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:"#0d1326"}}>{f(netPay)}</td>
                <td style={{padding:"8px 11px",color:dl<=0?"#A32D2D":dl<=7?"#854F0B":"#5a6691",fontWeight:dl<=7?700:400,whiteSpace:"nowrap"}}>{t.dueDate}</td>
                <td style={{padding:"8px 11px",fontWeight:700,color:STATUS_CLR[st]||"#5a6691"}}>{dl<0?`${Math.abs(dl)}d OD`:dl===0?"TODAY":`${dl}d`}</td>
                <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[st]||"#f3f4f8",color:STATUS_CLR[st]||"#5a6691"}}>{st}</span></td>
                <td style={{padding:"8px 11px"}}><button style={{...btnG,padding:"3px 10px",fontSize:9.5,background:dl<=7?"#A32D2D":"#0d1326",whiteSpace:"nowrap"}}>Pay {f(netPay)} →</button></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <div style={{marginTop:12,...card,background:"#E6F1FB",border:"1px solid #B5D4F4",fontSize:10,color:"#185FA5"}}>
        TDS column shows amount to HOLD before paying supplier. Pay net amount to supplier, deposit TDS to Govt by 7th. BSP payments are direct debit — ensure sufficient bank balance on settlement day.
      </div>
    </div>
  );
}



export function ChartOfAccounts(){
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [form,setForm]=useState({name:"",type:"Asset",parent:"Current Assets"});

  const COA_GROUPS=[
    {id:1, name:"Capital Account",         type:"Liability", parent:"Primary",
     sub:["Proprietor's Capital","Partner Capital A","Partner Capital B","Retained Earnings","Reserve & Surplus","Share Application Money"]},
    {id:2, name:"Loans (Liability)",        type:"Liability", parent:"Primary",
     sub:["Bank Overdraft / CC Limit","Secured Loans","Unsecured Loans — Directors","Vehicle Loan","Equipment Finance Lease"]},
    {id:3, name:"Fixed Assets",             type:"Asset",     parent:"Primary",
     sub:["Computers & Laptops","Servers & Networking","Furniture & Fixtures","Office Equipment","Vehicles","Software Licenses (Perpetual)","Leasehold Improvements"]},
    {id:4, name:"Accumulated Depreciation", type:"Asset",     parent:"Primary",
     sub:["Accum. Depn — Computers","Accum. Depn — Furniture","Accum. Depn — Vehicles","Accum. Depn — Equipment"]},
    {id:5, name:"Investments",              type:"Asset",     parent:"Primary",
     sub:["Fixed Deposits (Short-term)","Fixed Deposits (Long-term)","Mutual Funds","Government Securities"]},
    {id:6, name:"Current Assets",           type:"Asset",     parent:"Primary",
     sub:["Sundry Debtors","Advance to Suppliers","Advance to Staff","Staff Loans Receivable",
          "TDS Receivable","TCS Receivable","Commission Receivable — Airlines","PLACI Incentive Receivable",
          "Input CGST","Input SGST","Input IGST","GST ITC on Capital Goods",
          "Prepaid Rent","Prepaid Insurance","Prepaid Subscriptions",
          "Security Deposit — Office Lease","Security Deposit — Others",
          "HDFC Bank CA — BOM","ICICI Bank CA — BOM","ICICI Bank CA — AMD",
          "Cash in Hand — BOM","Cash in Hand — AMD","Petty Cash — Travkings Group"]},
    {id:7, name:"Sundry Debtors",           type:"Asset",     parent:"Current Assets",
     sub:["Auto-created per client from Clients master"]},
    {id:8, name:"Current Liabilities",      type:"Liability", parent:"Primary",
     sub:["Sundry Creditors","BSP India Payable","Advance from Clients","Salary Payable",
          "PF Payable (Employee + Employer)","ESI Payable","Professional Tax Payable",
          "ADM Provision Account","TCS Payable — 206C(1G)"]},
    {id:9, name:"Sundry Creditors",         type:"Liability", parent:"Current Liabilities",
     sub:["Auto-created per supplier from Suppliers master"]},
    {id:10,name:"Duties & Taxes",           type:"Liability", parent:"Primary",
     sub:["Output CGST","Output SGST","Output IGST",
          "TDS Payable — 194C (Contractors)","TDS Payable — 194H (Commission)",
          "TDS Payable — 194J (Professional)","TDS Payable — 194D (Insurance)",
          "TCS Payable — 206C(1G) LRS / Foreign Travel",
          "Service Tax Old Regime (pre-GST balance if any)"]},
    {id:11,name:"Sales Accounts",           type:"Income",    parent:"Primary",
     sub:["Flight Ticket Sales — Domestic","Flight Ticket Sales — International",
          "Holiday Package Sales — Domestic","Holiday Package Sales — International",
          "Hotel Sales","Car Rental Income","Visa Service Fee Income",
          "Insurance Premium Income","Miscellaneous Service Income",
          "Commission Income — Air India","Commission Income — Emirates","Commission Income — Other Airlines",
          "PLACI / Override Commission Income","Service Charge Income","Documentation Fee Income",
          "Cancellation Charge Income","No-Show Charge Income",
          "Forex Gain on Settlement","Interest Income","Late Payment Surcharge"]},
    {id:12,name:"Purchase Accounts",        type:"Expense",   parent:"Primary",
     sub:["Flight Ticket Purchase — BSP","Flight Ticket Purchase — Direct Airline",
          "Holiday Package Purchase — DMC","Hotel Accommodation Cost",
          "Car Hire Cost","Visa Fee — Embassy","VFS / BLS Processing Charges",
          "Insurance Premium Cost","Miscellaneous Service Cost",
          "Commission Payable — Sub-Agents","ADM Losses (Settled)"]},
    {id:13,name:"Direct Expenses",          type:"Expense",   parent:"Primary",
     sub:["GDS Charges (Amadeus / Sabre / Galileo)","BSP Service Charge (0.25%)",
          "Bank Charges on Forex","Forex Loss on Settlement",
          "Credit Card Merchant Charges","Payment Gateway Charges"]},
    {id:14,name:"Indirect Expenses",        type:"Expense",   parent:"Primary",
     sub:["Salaries & Wages","Employer PF Contribution","Employer ESI Contribution",
          "Office Rent","Electricity & Utilities","Telephone & Internet",
          "Software Subscriptions (SaaS)","GDS Annual Fee","ERP Subscription",
          "Advertising & Marketing","Social Media Marketing","Website & SEO",
          "Printing & Stationery","Postage & Courier",
          "Professional Fees (CA / Lawyer)","Audit Fees","Consulting Fees",
          "Travel & Conveyance (Staff)","Fuel & Vehicle Maintenance",
          "Staff Training & Development","Staff Welfare & Recreation",
          "Office Maintenance & Repairs","Housekeeping & Security",
          "Depreciation Expense","Bad Debts Written Off","Provision for Bad Debts",
          "Miscellaneous Expenses"]},
  ];

  const TYPE_CLR={Asset:"#185FA5",Liability:"#A32D2D",Income:"#27500A",Expense:"#854F0B"};
  const TYPE_BG ={Asset:"#E6F1FB",Liability:"#FCEBEB",Income:"#EAF3DE",Expense:"#FAEEDA"};
  const filtered=COA_GROUPS.filter(g=>!search||
    g.name.toLowerCase().includes(search.toLowerCase())||
    g.sub.some(s=>s.toLowerCase().includes(search.toLowerCase())));
  const totalLedgers=COA_GROUPS.reduce((s,g)=>s+g.sub.length,0);

  return (
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🗄</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Chart of Accounts</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{COA_GROUPS.length} account groups · {totalLedgers} ledger accounts · Travel agency standard structure</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search groups or ledgers..." style={{...inp,width:240,minHeight:32,fontSize:11}}/>
          <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Add Group</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(350px,1fr))",gap:12}}>
        {filtered.map(g=>(
          <div key={g.id} style={{...card,padding:0,overflowX:"auto"}}>
            <div style={{padding:"10px 14px",background:TYPE_BG[g.type],borderBottom:"1px solid "+TYPE_CLR[g.type]+"30",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <p style={{margin:0,fontSize:12,fontWeight:700,color:TYPE_CLR[g.type]}}>{g.name}</p>
                <p style={{margin:"1px 0 0",fontSize:9.5,color:TYPE_CLR[g.type]}}>{g.parent} → {g.type}</p>
              </div>
              <span style={{fontSize:11,fontWeight:800,color:TYPE_CLR[g.type]}}>{g.sub.length}</span>
            </div>
            <div style={{padding:"8px 14px"}}>
              {g.sub.map((s,i)=>(
                <div key={i} style={{padding:"4px 0",borderBottom:i<g.sub.length-1?"1px solid #f3f4f8":"none",
                  fontSize:10.5,color:s.startsWith("Auto-created")?"#bfc3d6":s.startsWith("Accum")?"#854F0B":"#384677",
                  fontStyle:s.startsWith("Auto-created")?"italic":"normal",
                  ...(search&&s.toLowerCase().includes(search.toLowerCase())?{background:"#fffdf0",fontWeight:700}:{})}}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:440,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Add Account Group</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <FL label="Group name"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp}/></FL>
              <FL label="Type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}><option>Asset</option><option>Liability</option><option>Income</option><option>Expense</option></select></FL>
              <FL label="Parent group"><select value={form.parent} onChange={e=>setForm(f=>({...f,parent:e.target.value}))} style={inp}>
                {["Primary","Capital Account","Current Assets","Current Liabilities","Sales Accounts","Purchase Accounts","Indirect Expenses"].map(p=><option key={p}>{p}</option>)}
              </select></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={()=>setModal(false)} style={btnG}>Add Group</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MastersLedgers(){
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("All");
  // Superseded by the live LedgersMaster (/api/ledgers). No bundled demo ledgers.
  const ledgers=[];
  const groups=["All",...new Set(ledgers.map(l=>l.group))];
  const filtered=ledgers.filter(l=>
    (filter==="All"||l.group===filter)&&
    (!search||l.name.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <MstrShell title="Ledgers" icon="📒" badge={`${ledgers.length} ledgers`}
      actions={[
        <select key="f" value={filter} onChange={e=>setFilter(e.target.value)}
          style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {groups.map(g=><option key={g}>{g}</option>)}
        </select>,
        <input key="s" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search ledgers..." style={{...inp,width:190,minHeight:32,fontSize:11}}/>,
        <button key="a" onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}>
          <Plus size={13}/> New Ledger
        </button>
      ]}>
      <div style={{...card,padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Ledger Name","Group","Nature","Opening Balance","Currency","Status",""].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=2?"center":"left",
                color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((l,i)=>(
            <tr key={l.id} style={{borderBottom:"1px solid #f3f4f8",
              background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{l.name}</td>
              <td style={{padding:"8px 12px",color:"#5a6691",fontSize:11}}>{l.group}</td>
              <td style={{padding:"8px 12px",textAlign:"center"}}>
                <span style={{padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:700,
                  background:l.nature==="Dr"?"#E6F1FB":"#EAF3DE",
                  color:l.nature==="Dr"?"#185FA5":"#27500A"}}>{l.nature}</span>
              </td>
              <td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace",
                fontWeight:600,color:l.ob>0?"#0d1326":"#bfc3d6"}}>
                {l.ob>0?l.ob.toLocaleString("en-IN"):"—"}
              </td>
              <td style={{padding:"8px 12px",textAlign:"center",fontSize:10,
                color:"#5a6691",fontWeight:600}}>{l.currency}</td>
              <td style={{padding:"8px 12px",textAlign:"center"}}>
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,
                  background:l.active?"#EAF3DE":"#f3f4f8",
                  color:l.active?"#27500A":"#9ca3af"}}>{l.active?"Active":"Inactive"}</span>
              </td>
              <td style={{padding:"8px 12px",textAlign:"center"}}>
                <button style={{...btnGh,padding:"3px 10px",fontSize:10}}>Edit</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {modal&&<MstrModal title="New Ledger" onClose={()=>setModal(false)}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <FL label="Ledger name"><input style={inp} placeholder="e.g. HDFC Savings Account"/></FL>
          <FL label="Group"><select style={inp}><option>Current Assets</option><option>Sales Accounts</option><option>Purchase Accounts</option><option>Sundry Debtors</option><option>Sundry Creditors</option><option>Duties & Taxes</option></select></FL>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <FL label="Nature"><select style={inp}><option>Dr</option><option>Cr</option></select></FL>
            <FL label="Currency"><select style={inp}>{ACTIVE_CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></FL>
          </div>
          <FL label="Opening balance"><input type="number" style={inp} placeholder="0.00"/></FL>
          <FL label="GSTIN (if party ledger)"><input style={inp} placeholder="15-digit GSTIN"/></FL>
        </div>
      </MstrModal>}
    </MstrShell>
  );
}

/* ══════════════════════════════════════════════════════════════════
   3. CUSTOMERS
   ════════════════════════════════════════════════════════════════ */

export function MastersCustomers(){
  const mob=useMobile();
  const [tab,setTab]=useState("B2B");
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [editRec,setEditRec]=useState(null);

  /* ══ SEPARATE DATA STORES — never mixed ══════════════════════════
     B2B : Registered businesses with GSTIN
     B2C : Individuals / unregistered buyers
     B2E : Corporate employee travel accounts
     ═══════════════════════════════════════════════════════════════ */

  // Superseded by the live CustomersMaster (/api/customers). No bundled demo data.
  const [b2bData,setB2bData]=useState([]);

  const [b2cData,setB2cData]=useState([]);

  const [b2eData,setB2eData]=useState([]);

  /* ══ Tab config ════════════════════════════════════════════════ */
  const TABS={
    B2B:{label:"B2B — Registered Business",icon:"🏢",color:"#185FA5",bg:"#E6F1FB",
      rule:"Tax Invoice issued with buyer GSTIN. Buyer can claim Input Tax Credit. Reported invoice-wise in GSTR-1 B2B table.",
      cols:["Company Name","GSTIN","State / City","Credit","Outstanding","Contact",""]},
    B2C:{label:"B2C — Individual / Unregistered",icon:"👤",color:"#27500A",bg:"#EAF3DE",
      rule:"Tax Invoice without buyer GSTIN (or Bill of Supply if exempt). No ITC to buyer. Reported aggregate in GSTR-1 B2C table.",
      cols:["Customer Name","Country / City","Passport No.","Credit","Outstanding","Contact",""]},
    B2E:{label:"B2E — Corporate Employee Travel",icon:"💼",color:"#854F0B",bg:"#FAEEDA",
      rule:"Employee travel booked under company account. Tax Invoice with parent company GSTIN. ITC claimed by employer. Separate ledger per company.",
      cols:["Account Name","Parent Company","Dept","Credit","Outstanding","Admin Contact",""]},
  };

  const sets={B2B:{data:b2bData,setData:setB2bData},
               B2C:{data:b2cData,setData:setB2cData},
               B2E:{data:b2eData,setData:setB2eData}};

  const cur=sets[tab];
  const cfg=TABS[tab];
  const filtered=cur.data.filter(r=>{
    const s=search.toLowerCase();
    return !s||(tab==="B2B"
      ?r.name.toLowerCase().includes(s)||r.gstin.toLowerCase().includes(s)||r.city.toLowerCase().includes(s)
      :tab==="B2C"
      ?r.name.toLowerCase().includes(s)||r.country.toLowerCase().includes(s)||r.passport.toLowerCase().includes(s)
      :r.empAcct.toLowerCase().includes(s)||r.company.toLowerCase().includes(s)||r.dept.toLowerCase().includes(s));
  });

  const blank={
    B2B:{id:0,name:"",gstin:"",state:"",city:"",credit:100000,out:0,contact:"",mobile:"",email:"",pan:"",active:true},
    B2C:{id:0,name:"",country:"India",city:"",passport:"",mobile:"",email:"",dob:"",credit:50000,out:0,active:true},
    B2E:{id:0,empAcct:"",company:"",compGstin:"",dept:"",city:"",credit:500000,out:0,adminContact:"",mobile:"",email:"",active:true},
  };

  const openNew=()=>{setEditRec({...blank[tab],id:Date.now()});setModal(true);};
  const openEdit=r=>{setEditRec({...r});setModal(true);};
  const saveRec=()=>{
    if(!editRec)return;
    cur.setData(ds=>ds.some(d=>d.id===editRec.id)?ds.map(d=>d.id===editRec.id?editRec:d):[...ds,editRec]);
    setModal(false);setEditRec(null);
  };
  const set=f=>setEditRec(r=>({...r,...f}));

  const totCredit=cur.data.reduce((s,d)=>s+d.credit,0);
  const totOut   =cur.data.reduce((s,d)=>s+d.out,0);
  const outFmt=n=>n>=100000?(n/100000).toFixed(1)+"L":n>=1000?(n/1000).toFixed(0)+"K":n>0?String(n):"Nil";

  return (
    <div style={{padding:"12px 10px",maxWidth:1260,margin:"0 auto"}}>

      {/* Page header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
        marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Customer Master</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>
            Three separate registers — B2B · B2C · B2E — maintained independently
          </p>
        </div>
      </div>

      {/* Tab selector — 3 large cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
        {Object.entries(TABS).map(([t,c])=>{
          const count=sets[t].data.length;
          const active=tab===t;
          const outAmt=sets[t].data.reduce((s,d)=>s+d.out,0);
          return (
            <div key={t} onClick={()=>{setTab(t);setSearch("");}}
              style={{padding:"12px 14px",borderRadius:10,cursor:"pointer",
                border:`2px solid ${active?c.color:"#e1e3ec"}`,
                background:active?c.bg:"#fff",
                transition:"all 0.15s",
                boxShadow:active?"0 4px 12px rgba(0,0,0,0.08)":"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <span style={{fontSize:20}}>{c.icon}</span>
                <span style={{fontSize:22,fontWeight:800,color:c.color,lineHeight:1}}>{count}</span>
              </div>
              <p style={{margin:"0 0 2px",fontSize:11.5,fontWeight:700,color:"#0d1326"}}>{t}</p>
              <p style={{margin:"0 0 6px",fontSize:9.5,color:"#5a6691",lineHeight:1.3}}>
                {c.label.split("—")[1]?.trim()}
              </p>
              {outAmt>0&&(
                <p style={{margin:0,fontSize:9.5,fontWeight:700,color:c.color}}>
                  Outstanding: {outFmt(outAmt)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Active tab header + actions */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        marginBottom:10,padding:"10px 14px",borderRadius:9,
        background:cfg.bg,border:`1px solid ${cfg.color}44`,flexWrap:"wrap",gap:8}}>
        <div>
          <p style={{margin:0,fontSize:12,fontWeight:700,color:cfg.color}}>
            {cfg.icon} {cfg.label}
          </p>
          <p style={{margin:"2px 0 0",fontSize:9.5,color:cfg.color,opacity:0.8}}>{cfg.rule}</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder={`Search ${tab} customers...`}
            style={{...inp,width:210,minHeight:32,fontSize:11}}/>
          <button onClick={openNew}
            style={{...btnG,background:cfg.color,fontSize:11,whiteSpace:"nowrap"}}>
            <Plus size={13}/> New {tab} Customer
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{...card,padding:0,overflowX:"auto",marginBottom:4}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead>
            <tr style={{background:"#0d1326"}}>
              {cfg.cols.map((h,i)=>(
                <th key={i} style={{padding:"9px 12px",
                  textAlign:(tab==="B2B"&&i>=3&&i<=4)||(tab==="B2C"&&i>=3&&i<=4)||(tab==="B2E"&&i>=3&&i<=4)?"right":"left",
                  color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0?(
              <tr><td colSpan={cfg.cols.length}
                style={{padding:"32px",textAlign:"center",color:"#5a6691",fontSize:12}}>
                No {tab} customers found. {search&&"Try clearing your search."}
              </td></tr>
            ):filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f8",
                background:i%2===0?"#fff":"#fafafa",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f0f4ff"}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#fafafa"}>

                {tab==="B2B"&&<>
                  <td style={{padding:"8px 12px"}}>
                    <p style={{margin:0,fontWeight:600,color:"#0d1326"}}>{r.name}</p>
                    <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{r.email}</p>
                  </td>
                  <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10.5,color:"#185FA5"}}>{r.gstin}</td>
                  <td style={{padding:"8px 12px",fontSize:11}}>
                    <p style={{margin:0,color:"#384677"}}>{r.state}</p>
                    <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{r.city}</p>
                  </td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,color:"#384677"}}>{outFmt(r.credit)}</td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,
                    color:r.out>r.credit*0.8?"#A32D2D":r.out>0?"#854F0B":"#27500A"}}>{outFmt(r.out)}</td>
                  <td style={{padding:"8px 12px"}}>
                    <p style={{margin:0,fontSize:11,color:"#384677"}}>{r.contact}</p>
                    <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{r.mobile}</p>
                  </td>
                </>}

                {tab==="B2C"&&<>
                  <td style={{padding:"8px 12px"}}>
                    <p style={{margin:0,fontWeight:600,color:"#0d1326"}}>{r.name}</p>
                    <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{r.email}</p>
                  </td>
                  <td style={{padding:"8px 12px",fontSize:11}}>
                    <p style={{margin:0,color:"#384677"}}>{r.country}</p>
                    <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{r.city}</p>
                  </td>
                  <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:11,
                    color:"#185FA5",fontWeight:600}}>{r.passport||"—"}</td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,color:"#384677"}}>{outFmt(r.credit)}</td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,
                    color:r.out>0?"#854F0B":"#27500A"}}>{outFmt(r.out)}</td>
                  <td style={{padding:"8px 12px"}}>
                    <p style={{margin:0,fontSize:11,color:"#384677"}}>{r.name}</p>
                    <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{r.mobile}</p>
                  </td>
                </>}

                {tab==="B2E"&&<>
                  <td style={{padding:"8px 12px"}}>
                    <p style={{margin:0,fontWeight:600,color:"#0d1326"}}>{r.empAcct}</p>
                    <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{r.email}</p>
                  </td>
                  <td style={{padding:"8px 12px"}}>
                    <p style={{margin:0,fontSize:11,color:"#384677",fontWeight:600}}>{r.company}</p>
                    <p style={{margin:0,fontSize:9,fontFamily:"monospace",color:"#185FA5"}}>{r.compGstin}</p>
                  </td>
                  <td style={{padding:"8px 12px",color:"#5a6691",fontSize:11}}>{r.dept}</td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,color:"#384677"}}>{outFmt(r.credit)}</td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,
                    color:r.out>r.credit*0.5?"#A32D2D":r.out>0?"#854F0B":"#27500A"}}>{outFmt(r.out)}</td>
                  <td style={{padding:"8px 12px"}}>
                    <p style={{margin:0,fontSize:11,color:"#384677"}}>{r.adminContact}</p>
                    <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{r.mobile}</p>
                  </td>
                </>}

                <td style={{padding:"8px 12px"}}>
                  <button onClick={()=>openEdit(r)}
                    style={{...btnGh,padding:"3px 10px",fontSize:10}}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length>0&&(
            <tfoot><tr style={{background:"#f9fafb",borderTop:"2px solid #e1e3ec"}}>
              <td colSpan={3} style={{padding:"8px 12px",fontWeight:700,fontSize:11,color:"#384677"}}>
                {filtered.length} {tab} customer{filtered.length!==1?"s":""}
                {search&&` matching "${search}"`}
              </td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#384677"}}>
                {outFmt(filtered.reduce((s,r)=>s+r.credit,0))}
              </td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,
                color:filtered.some(r=>r.out>0)?"#854F0B":"#27500A"}}>
                {outFmt(filtered.reduce((s,r)=>s+r.out,0))}
              </td>
              <td colSpan={2}/>
            </tr></tfoot>
          )}
        </table>
      </div>

      {/* ADD / EDIT MODAL */}
      {modal&&editRec&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",
          zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:520,
            maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>

            {/* Modal header */}
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",
              position:"sticky",top:0,background:"#fff",zIndex:1,
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:10.5,padding:"3px 9px",borderRadius:999,
                  fontWeight:800,background:cfg.bg,color:cfg.color}}>{tab}</span>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>
                  {cur.data.some(d=>d.id===editRec.id)?"Edit":"New"} {cfg.label.split("—")[0].trim()} Customer
                </p>
              </div>
              <button onClick={()=>{setModal(false);setEditRec(null);}}
                style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>

            {/* B2B FORM */}
            {tab==="B2B"&&(
              <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
                <FL label="Company / Business name"><input value={editRec.name||""} onChange={e=>set({name:e.target.value})} style={inp} placeholder="e.g. Sharma Enterprises Pvt. Ltd."/></FL>
                <FL label="GSTIN (mandatory for B2B)">
                  <input value={editRec.gstin||""} onChange={e=>set({gstin:e.target.value.toUpperCase()})}
                    style={{...inp,fontFamily:"monospace",letterSpacing:"1px"}} placeholder="27AABCX1234Y1Z5" maxLength={15}/>
                </FL>
                <FL label="PAN"><input value={editRec.pan||""} onChange={e=>set({pan:e.target.value.toUpperCase()})} style={{...inp,fontFamily:"monospace"}} placeholder="AABCX1234Y" maxLength={10}/></FL>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <FL label="State"><input value={editRec.state||""} onChange={e=>set({state:e.target.value})} style={inp} placeholder="Maharashtra"/></FL>
                  <FL label="City"><input value={editRec.city||""} onChange={e=>set({city:e.target.value})} style={inp} placeholder="Mumbai"/></FL>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <FL label="Contact person"><input value={editRec.contact||""} onChange={e=>set({contact:e.target.value})} style={inp}/></FL>
                  <FL label="Mobile"><input value={editRec.mobile||""} onChange={e=>set({mobile:e.target.value})} style={inp}/></FL>
                </div>
                <FL label="Email"><input type="email" value={editRec.email||""} onChange={e=>set({email:e.target.value})} style={inp}/></FL>
                <FL label="Credit limit (INR)"><input type="number" value={editRec.credit||0} onChange={e=>set({credit:+e.target.value})} style={inp}/></FL>
                <div style={{padding:"9px 12px",borderRadius:8,background:"#E6F1FB",
                  border:"1px solid #B5D4F4",fontSize:9.5,color:"#185FA5",fontWeight:600}}>
                  B2B Invoice rule: Tax Invoice must carry buyer GSTIN. Filed invoice-wise in GSTR-1 B2B table. Buyer can claim ITC.
                </div>
              </div>
            )}

            {/* B2C FORM */}
            {tab==="B2C"&&(
              <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
                <FL label="Customer full name"><input value={editRec.name||""} onChange={e=>set({name:e.target.value})} style={inp} placeholder="e.g. ABC Corp"/></FL>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <FL label="Country"><input value={editRec.country||""} onChange={e=>set({country:e.target.value})} style={inp} placeholder="India"/></FL>
                  <FL label="City"><input value={editRec.city||""} onChange={e=>set({city:e.target.value})} style={inp}/></FL>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <FL label="Passport number"><input value={editRec.passport||""} onChange={e=>set({passport:e.target.value.toUpperCase()})} style={{...inp,fontFamily:"monospace"}} placeholder="Z1234567"/></FL>
                  <FL label="Date of birth"><input type="date" value={editRec.dob||""} onChange={e=>set({dob:e.target.value})} style={inp}/></FL>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <FL label="Mobile"><input value={editRec.mobile||""} onChange={e=>set({mobile:e.target.value})} style={inp}/></FL>
                  <FL label="Email"><input type="email" value={editRec.email||""} onChange={e=>set({email:e.target.value})} style={inp}/></FL>
                </div>
                <FL label="Credit limit"><input type="number" value={editRec.credit||0} onChange={e=>set({credit:+e.target.value})} style={inp}/></FL>
                <div style={{padding:"9px 12px",borderRadius:8,background:"#EAF3DE",
                  border:"1px solid #C0DD97",fontSize:9.5,color:"#27500A",fontWeight:600}}>
                  B2C Invoice rule: No GSTIN required. Tax Invoice or Bill of Supply (if exempt). Filed as aggregate in GSTR-1 B2C table. Buyer cannot claim ITC.
                </div>
              </div>
            )}

            {/* B2E FORM */}
            {tab==="B2E"&&(
              <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
                <FL label="Account name (descriptive)">
                  <input value={editRec.empAcct||""} onChange={e=>set({empAcct:e.target.value})} style={inp} placeholder="e.g. TechCorp — Employee Travel A/c"/>
                </FL>
                <FL label="Parent company name">
                  <input value={editRec.company||""} onChange={e=>set({company:e.target.value})} style={inp} placeholder="TechCorp Solutions Pvt. Ltd."/>
                </FL>
                <FL label="Parent company GSTIN">
                  <input value={editRec.compGstin||""} onChange={e=>set({compGstin:e.target.value.toUpperCase()})}
                    style={{...inp,fontFamily:"monospace",letterSpacing:"1px"}} placeholder="27AABCT2345E1Z6" maxLength={15}/>
                </FL>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <FL label="Department / Division">
                    <input value={editRec.dept||""} onChange={e=>set({dept:e.target.value})} style={inp} placeholder="All Departments"/>
                  </FL>
                  <FL label="City / Location">
                    <input value={editRec.city||""} onChange={e=>set({city:e.target.value})} style={inp}/>
                  </FL>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <FL label="Admin contact person">
                    <input value={editRec.adminContact||""} onChange={e=>set({adminContact:e.target.value})} style={inp}/>
                  </FL>
                  <FL label="Admin mobile">
                    <input value={editRec.mobile||""} onChange={e=>set({mobile:e.target.value})} style={inp}/>
                  </FL>
                </div>
                <FL label="Admin email">
                  <input type="email" value={editRec.email||""} onChange={e=>set({email:e.target.value})} style={inp}/>
                </FL>
                <FL label="Credit limit (employee travel budget)">
                  <input type="number" value={editRec.credit||0} onChange={e=>set({credit:+e.target.value})} style={inp}/>
                </FL>
                <div style={{padding:"9px 12px",borderRadius:8,background:"#FAEEDA",
                  border:"1px solid #FAC775",fontSize:9.5,color:"#854F0B",fontWeight:600}}>
                  B2E Invoice rule: Tax Invoice with parent company GSTIN. ITC claimed by employer. Maintain separate employee-wise travel ledger under this account.
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",
              display:"flex",justifyContent:"flex-end",gap:8,
              position:"sticky",bottom:0,background:"#fff"}}>
              <button onClick={()=>{setModal(false);setEditRec(null);}} style={btnGh}>Cancel</button>
              <button onClick={saveRec}
                style={{...btnG,background:cfg.color}}>
                Save {tab} Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MastersSuppliers(){
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [search,setSearch]=useState("");
  const [typeFilter,setTypeFilter]=useState("All");
  const supps=[];
  const types=["All",...new Set(supps.map(s=>s.type))];
  const filtered=supps.filter(s=>
    (typeFilter==="All"||s.type===typeFilter)&&
    (!search||s.name.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <MstrShell title="Suppliers" icon="🏢" badge={`${supps.length} suppliers`}
      actions={[
        <select key="t" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
          style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {types.map(t=><option key={t}>{t}</option>)}
        </select>,
        <input key="s" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search suppliers..." style={{...inp,width:200,minHeight:32,fontSize:11}}/>,
        <button key="a" onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}>
          <Plus size={13}/> New Supplier
        </button>
      ]}>
      <div style={{...card,padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Supplier Name","Type","GSTIN","Currency","TDS Section","Commission",""].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=4?"center":"left",
                color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((s,i)=>(
            <tr key={s.id} style={{borderBottom:"1px solid #f3f4f8",
              background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{s.name}</td>
              <td style={{padding:"8px 12px"}}>
                <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:700,
                  background:"#E6F1FB",color:"#185FA5"}}>{s.type}</span>
              </td>
              <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10,
                color:s.gstin?"#185FA5":"#bfc3d6"}}>{s.gstin||"Overseas"}</td>
              <td style={{padding:"8px 12px",textAlign:"center",fontSize:11,
                fontWeight:700,color:"#384677"}}>{s.currency}</td>
              <td style={{padding:"8px 12px",textAlign:"center",fontSize:10.5,
                color:s.tds?"#854F0B":"#bfc3d6"}}>{s.tds||"—"}</td>
              <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,
                color:s.commPct>0?"#27500A":"#bfc3d6"}}>
                {s.commPct>0?`${s.commPct}%`:"—"}
              </td>
              <td style={{padding:"8px 12px"}}>
                <button style={{...btnGh,padding:"3px 10px",fontSize:10}}>Edit</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {modal&&<MstrModal title="New Supplier" onClose={()=>setModal(false)}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <FL label="Supplier / Vendor name"><input style={inp}/></FL>
          <FL label="Type"><select style={inp}><option>Airline/BSP</option><option>DMC/Operator</option><option>Hotel</option><option>Car/Transport</option><option>Visa Agency</option><option>Insurance</option><option>Other</option></select></FL>
          <FL label="GSTIN (leave blank for overseas)"><input style={inp}/></FL>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <FL label="Settlement currency"><select style={inp}>{ACTIVE_CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></FL>
            <FL label="TDS section"><select style={inp}><option>None</option><option>194C</option><option>194H</option><option>194D</option><option>194J</option></select></FL>
          </div>
          <FL label="Commission % (if applicable)"><input type="number" style={inp} placeholder="0"/></FL>
        </div>
      </MstrModal>}
    </MstrShell>
  );
}

/* ══════════════════════════════════════════════════════════════════
   5. AIRLINES & CONSOLIDATORS
   ════════════════════════════════════════════════════════════════ */

export function MastersAirlines(){
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [search,setSearch]=useState("");
  const airlines=[];
  const filtered=airlines.filter(a=>!search||
    a.name.toLowerCase().includes(search.toLowerCase())||
    a.iata.toLowerCase().includes(search.toLowerCase())||
    a.country.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <MstrShell title="Airlines & Consolidators" icon="✈" badge={`${airlines.length} airlines`}
      actions={[
        <input key="s" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search airline, IATA..." style={{...inp,width:210,minHeight:32,fontSize:11}}/>,
        <ExportBtn key="x" name="airlines" rows={filtered} columns={[{key:"iata",label:"IATA"},{key:"name",label:"Airline Name"},{key:"country",label:"Country"},{key:"type",label:"Type"},{key:"hub",label:"Hub"},{key:"bsp",label:"BSP"},{key:"alliance",label:"Alliance"},{key:"gds",label:"GDS"},{key:"commPct",label:"Comm %"}]}/>,
        <button key="a" onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}>
          <Plus size={13}/> New Airline
        </button>
      ]}>
      <div style={{...card,padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["IATA","Airline Name","Country","Type","Hub","BSP","Alliance","GDS","Comm %",""].map((h,i)=>(
              <th key={i} style={{padding:"9px 10px",textAlign:"left",
                color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((a,i)=>(
            <tr key={a.id} style={{borderBottom:"1px solid #f3f4f8",
              background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 10px",fontFamily:"monospace",fontWeight:800,
                color:"#185FA5",fontSize:13}}>{a.iata}</td>
              <td style={{padding:"8px 10px",fontWeight:600,color:"#0d1326"}}>{a.name}</td>
              <td style={{padding:"8px 10px",color:"#5a6691",fontSize:11}}>{a.country}</td>
              <td style={{padding:"8px 10px"}}>
                <span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,
                  background:a.type==="Low Cost"?"#FAEEDA":"#E6F1FB",
                  color:a.type==="Low Cost"?"#854F0B":"#185FA5"}}>{a.type}</span>
              </td>
              <td style={{padding:"8px 10px",fontFamily:"monospace",fontWeight:600,color:"#384677"}}>{a.hub}</td>
              <td style={{padding:"8px 10px",textAlign:"center"}}>
                <span style={{fontSize:10,fontWeight:700,color:a.bsp?"#27500A":"#bfc3d6"}}>{a.bsp?"✔ BSP":"—"}</span>
              </td>
              <td style={{padding:"8px 10px",fontSize:10.5,color:"#5a6691"}}>{a.alliance||"—"}</td>
              <td style={{padding:"8px 10px",fontSize:10,fontFamily:"monospace",color:"#5a6691"}}>{a.gds||"—"}</td>
              <td style={{padding:"8px 10px",textAlign:"center",fontWeight:700,
                color:a.commPct>0?"#27500A":"#bfc3d6"}}>{a.commPct>0?`${a.commPct}%`:"—"}</td>
              <td style={{padding:"8px 10px"}}>
                <button style={{...btnGh,padding:"3px 8px",fontSize:10}}>Edit</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {modal&&<MstrModal title="New Airline" onClose={()=>setModal(false)}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10}}>
            <FL label="IATA code"><input style={inp} placeholder="AI"/></FL>
            <FL label="Airline name"><input style={inp}/></FL>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <FL label="Country"><input style={inp}/></FL>
            <FL label="Hub airport"><input style={inp} placeholder="DEL"/></FL>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <FL label="Type"><select style={inp}><option>Full Service</option><option>Low Cost</option><option>Regional</option></select></FL>
            <FL label="Alliance"><select style={inp}><option>None</option><option>Star Alliance</option><option>Oneworld</option><option>SkyTeam</option></select></FL>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <FL label="BSP participant?"><select style={inp}><option>Yes</option><option>No</option></select></FL>
            <FL label="Commission %"><input type="number" style={inp} placeholder="0"/></FL>
          </div>
        </div>
      </MstrModal>}
    </MstrShell>
  );
}

/* ══════════════════════════════════════════════════════════════════
   6. HOTELS & DMCs
   ════════════════════════════════════════════════════════════════ */

export function MastersHotels(){
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [tab,setTab]=useState("hotels");
  const [search,setSearch]=useState("");
  const hotels=[];
  const dmcs=[];
  const filt_h=hotels.filter(h=>!search||h.name.toLowerCase().includes(search.toLowerCase())||h.city.toLowerCase().includes(search.toLowerCase()));
  const filt_d=dmcs.filter(d=>!search||d.name.toLowerCase().includes(search.toLowerCase())||d.country.toLowerCase().includes(search.toLowerCase()));
  const gstColor={0:"#bfc3d6",12:"#854F0B",16:"#185FA5",18:"#A32D2D"};
  const gstBg   ={0:"#f3f4f8",12:"#FAEEDA",16:"#E6F1FB",18:"#FCEBEB"};
  return (
    <MstrShell title="Hotels & DMCs" icon="🏨"
      actions={[
        <div key="tabs" style={{display:"flex",borderRadius:8,overflow:"hidden",border:"1px solid #e1e3ec"}}>
          {["hotels","dmcs"].map(t=><button key={t} onClick={()=>setTab(t)}
            style={{padding:"6px 14px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab===t?700:400,
              background:tab===t?"#0d1326":"#fff",color:tab===t?"#d4a437":"#5a6691"}}>
            {t==="hotels"?`Hotels (${hotels.length})`:`DMCs (${dmcs.length})`}
          </button>)}
        </div>,
        <input key="s" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search..." style={{...inp,width:180,minHeight:32,fontSize:11}}/>,
        tab==="hotels"
          ? <ExportBtn key="x" name="hotels" rows={filt_h} columns={[{key:"name",label:"Hotel Name"},{key:"city",label:"City"},{key:"stars",label:"Stars"},{key:"gstSlab",label:"GST Slab %"},{key:"tariff",label:"Rack Rate"},{key:"chain",label:"Chain"},{key:"contract",label:"Contract"}]}/>
          : <ExportBtn key="x" name="dmcs" rows={filt_d} columns={[{key:"name",label:"DMC Name"},{key:"country",label:"Country"},{key:"speciality",label:"Speciality"},{key:"currency",label:"Currency"},{key:"commPct",label:"Commission %"},{key:"contract",label:"Contract"}]}/>,
        <button key="a" onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}>
          <Plus size={13}/> {tab==="hotels"?"New Hotel":"New DMC"}
        </button>
      ]}>
      {tab==="hotels"?(
        <div style={{...card,padding:0,overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Hotel Name","City","Stars","GST Slab","Rack Rate","Chain","Contract",""].map((h,i)=>(
                <th key={i} style={{padding:"9px 12px",textAlign:i>=2?"center":"left",
                  color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filt_h.map((h,i)=>(
              <tr key={h.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{h.name}</td>
                <td style={{padding:"8px 12px",color:"#5a6691"}}>{h.city}</td>
                <td style={{padding:"8px 12px",textAlign:"center",color:"#d4a437",fontSize:13}}>
                  {"★".repeat(h.stars)}
                </td>
                <td style={{padding:"8px 12px",textAlign:"center"}}>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,
                    background:gstBg[h.gstSlab]||"#f3f4f8",color:gstColor[h.gstSlab]||"#5a6691"}}>
                    {h.gstSlab}%
                  </span>
                </td>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:600,
                  fontVariantNumeric:"tabular-nums"}}>
                  {h.tariff>1000?`₹${(h.tariff/1000).toFixed(1)}K`:h.tariff<500?`$${h.tariff}`:`₹${h.tariff}`}
                </td>
                <td style={{padding:"8px 12px",color:"#5a6691",fontSize:11}}>{h.chain}</td>
                <td style={{padding:"8px 12px",textAlign:"center"}}>
                  <span style={{fontSize:10,fontWeight:700,color:h.contract?"#27500A":"#bfc3d6"}}>
                    {h.contract?"✔ Yes":"—"}
                  </span>
                </td>
                <td style={{padding:"8px 12px"}}>
                  <button style={{...btnGh,padding:"3px 8px",fontSize:10}}>Edit</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ):(
        <div style={{...card,padding:0,overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["DMC Name","Country","Speciality","Currency","Commission","Contract",""].map((h,i)=>(
                <th key={i} style={{padding:"9px 12px",textAlign:i>=3?"center":"left",
                  color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filt_d.map((d,i)=>(
              <tr key={d.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{d.name}</td>
                <td style={{padding:"8px 12px",color:"#5a6691"}}>{d.country}</td>
                <td style={{padding:"8px 12px"}}>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:700,
                    background:"#E6F1FB",color:"#185FA5"}}>{d.speciality}</span>
                </td>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:"#384677"}}>{d.currency}</td>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:"#27500A"}}>{d.commPct}%</td>
                <td style={{padding:"8px 12px",textAlign:"center"}}>
                  <span style={{fontSize:10,fontWeight:700,color:d.contract?"#27500A":"#bfc3d6"}}>
                    {d.contract?"✔ Yes":"—"}
                  </span>
                </td>
                <td style={{padding:"8px 12px"}}>
                  <button style={{...btnGh,padding:"3px 8px",fontSize:10}}>Edit</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {modal&&<MstrModal title={tab==="hotels"?"New Hotel":"New DMC"} onClose={()=>setModal(false)}>
        {tab==="hotels"?(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <FL label="Hotel name"><input style={inp}/></FL>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <FL label="City"><input style={inp}/></FL>
              <FL label="Chain/Brand"><input style={inp}/></FL>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <FL label="Star rating"><select style={inp}><option>5</option><option>4</option><option>3</option><option>2</option></select></FL>
              <FL label="Rack rate (per night)"><input type="number" style={inp}/></FL>
            </div>
            <FL label="GST slab"><select style={inp}><option>18% (above ₹7,500/night)</option><option>12% (₹1,000–₹7,500)</option><option>0% (below ₹1,000)</option></select></FL>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <FL label="DMC name"><input style={inp}/></FL>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <FL label="Country"><input style={inp}/></FL>
              <FL label="Speciality"><input style={inp}/></FL>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <FL label="Settlement currency"><select style={inp}>{ACTIVE_CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></FL>
              <FL label="Commission %"><input type="number" style={inp} placeholder="10"/></FL>
            </div>
          </div>
        )}
      </MstrModal>}
    </MstrShell>
  );
}

/* ══════════════════════════════════════════════════════════════════
   7. TAX RATES
   ════════════════════════════════════════════════════════════════ */




/* ── CASH BOOK REPORT ────────────────────────────────────────── */




/* ════════════════════════════════════════════════════════════════════
   2. CURRENCY MASTER
   ════════════════════════════════════════════════════════════════════ */



/* ════════════════════════════════════════════════════════════════════
   3. COST CENTER MASTER
   ════════════════════════════════════════════════════════════════════ */


export function CostCenterMaster(){
  const [search,setSearch]=useState("");
  const filtered=COST_CENTERS_DATA.filter(c=>{
    if(!search) return true;
    const q=search.toLowerCase();
    return c.code.toLowerCase().includes(q)||c.name.toLowerCase().includes(q)||c.manager.toLowerCase().includes(q);
  });
  const parents=COST_CENTERS_DATA.filter(c=>c.parent==="—");
  return MASTER_PAGE("Cost Center Master","Departmental P&L allocation — assign vouchers to a cost center for sliced reporting",
    <>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <input type="text" placeholder="Search code, name, manager..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:"1 1 280px",minWidth:200,padding:"8px 11px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12.5}}/>
        <button style={{padding:"8px 14px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,cursor:"pointer"}}>📥 Import</button>
        <ExportBtn name="cost-centers" rows={filtered} columns={[{key:"code",label:"Code"},{key:"name",label:"Name"},{key:"parent",label:"Parent"},{key:"manager",label:"Manager"},{key:"desc",label:"Description"},{key:"active",label:"Active"}]}/>
        <button style={{padding:"8px 16px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>+ Add Cost Center</button>
      </div>
      <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead style={{background:"#f7f8fb"}}>
            <tr>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Code</th>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Name</th>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Parent</th>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Manager</th>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Description</th>
              <th style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Status</th>
              <th style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c=>(
              <tr key={c.code} style={{borderBottom:"1px solid #f0f2f7",background:c.parent==="—"?"#fafbfd":"#fff"}}>
                <td style={{padding:"9px 12px",fontFamily:"monospace",fontWeight:600,color:"#0d1326"}}>{c.code}</td>
                <td style={{padding:"9px 12px",color:"#0d1326",fontWeight:c.parent==="—"?700:400,paddingLeft:c.parent==="—"?12:28}}>{c.name}</td>
                <td style={{padding:"9px 12px",color:"#5a6691",fontFamily:"monospace"}}>{c.parent}</td>
                <td style={{padding:"9px 12px",color:"#0d1326"}}>{c.manager}</td>
                <td style={{padding:"9px 12px",color:"#5a6691",fontSize:11.5}}>{c.desc}</td>
                <td style={{padding:"9px 12px",textAlign:"center"}}><span style={{padding:"2px 7px",background:c.active?"#d4edda":"#f8d7da",color:c.active?"#155724":"#721c24",borderRadius:3,fontSize:10.5,fontWeight:600}}>{c.active?"Active":"Inactive"}</span></td>
                <td style={{padding:"9px 12px",textAlign:"center"}}>
                  <button style={{padding:"3px 8px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:4,fontSize:10.5,cursor:"pointer",fontWeight:600}}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
   4. PROJECT / TOUR CODE MASTER
   ════════════════════════════════════════════════════════════════════ */



/* ════════════════════════════════════════════════════════════════════
   5. DOCUMENT TYPE MASTER
   ════════════════════════════════════════════════════════════════════ */


export function ApprovalLimitsMaster(){
  // Live approval thresholds (GET /api/approval-limits). Was hardcoded APPROVAL_LIMITS_DATA.
  const rows=useApprovalLimits().data||[];
  const groupByType={};
  rows.forEach(a=>{
    if(!groupByType[a.voucherType])groupByType[a.voucherType]=[];
    groupByType[a.voucherType].push(a);
  });
  const fmt=n=>n>=999999999?"Unlimited":"₹"+n.toLocaleString("en-IN");
  return MASTER_PAGE("Approval Limits Master","Per-role × per-voucher-type thresholds. Defines automatic escalation in voucher workflow",
    <>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <p style={{margin:0,fontSize:12,color:"#5a6691"}}>{rows.length} rules configured across {Object.keys(groupByType).length} voucher types</p>
        <div style={{flex:1}}/>
        <ExportBtn name="approval-limits" label="📤 Export Matrix" rows={rows} columns={[{key:"voucherType",label:"Voucher Type"},{key:"role",label:"Approver Role"},{key:"minAmount",label:"From (>=)"},{key:"maxAmount",label:"To (<=)"},{key:"backup",label:"Backup Approver"}]}/>
        <button style={{padding:"8px 16px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>+ Add Limit Rule</button>
      </div>
      {Object.entries(groupByType).map(([type,rules])=>(
        <div key={type} style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"10px 14px",background:"#0d1326",color:"#fff"}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,letterSpacing:"0.3px"}}>{type}</p>
            <p style={{margin:"2px 0 0",fontSize:11,color:"#d4a437"}}>{rules.length} threshold tier{rules.length!==1?"s":""}</p>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead style={{background:"#f7f8fb"}}>
              <tr>
                <th style={{padding:"10px 14px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Approver Role</th>
                <th style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>From (≥)</th>
                <th style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>To (≤)</th>
                <th style={{padding:"10px 14px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Backup Approver</th>
                <th style={{padding:"10px 14px",textAlign:"center",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r=>(
                <tr key={r.id} style={{borderBottom:"1px solid #f0f2f7"}}>
                  <td style={{padding:"9px 14px",fontWeight:600,color:"#0d1326"}}>{r.role}</td>
                  <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"monospace",color:"#0d1326"}}>{fmt(r.minAmount)}</td>
                  <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"monospace",color:"#0d1326"}}>{fmt(r.maxAmount)}</td>
                  <td style={{padding:"9px 14px",color:"#5a6691"}}>{r.backup}</td>
                  <td style={{padding:"9px 14px",textAlign:"center"}}>
                    <button style={{padding:"3px 8px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:4,fontSize:10.5,cursor:"pointer",fontWeight:600}}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
   7. NUMBERING SERIES MASTER
   ════════════════════════════════════════════════════════════════════ */



/* ════════════════════════════════════════════════════════════════════
   5 ROLE-SPECIFIC DASHBOARDS
   Routes to specific dashboard via DashboardRouter based on currentUser.role
   ════════════════════════════════════════════════════════════════════ */

/* ── Shared seed data (demo) ──────────────────────────────────────── */


/* CustomerMasterTabbed + SupplierMasterTabbed moved to ./mastersParties.jsx (live, backend-wired). */

/* ════════════════════════════════════════════════════════════════════
   3. VOUCHER ENTRY (8 tabs) — Receipt voucher demo
   ════════════════════════════════════════════════════════════════════ */


export function CustomerMasterDetail(){
  const [tab, setTab] = useState("basic");
  const [active, setActive] = useState(true);
  const [showDupWarning, setShowDupWarning] = useState(false);
  const tabs = [
    {key:"basic",label:"Basic"},{key:"address",label:"Address"},{key:"contact",label:"Contact"},
    {key:"bank",label:"Bank"},{key:"tax",label:"Tax"},{key:"documents",label:"Documents"},
    {key:"notes",label:"Notes"},{key:"history",label:"History"},{key:"linked",label:"Linked Txns"},{key:"custom",label:"Custom Fields"}
  ];
  const inp = {padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%"};
  const labelStyle = {fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:4,display:"block"};
  const CMDLabel = ({label:l,children}) => <div><label style={labelStyle}>{l}</label>{children}</div>;

  return (
    <PHASE2_Page title="Customer Master — Detail View"
      subtitle="Universal 10-tab pattern · applies to all party masters (Customers, Suppliers, Sub-agents, Employees)"
      toolbar={<>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11.5,color:"#5a6691",cursor:"pointer",padding:"5px 10px",background:active?"#d4edda":"#f8d7da",borderRadius:5}}>
          <input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>
          <span style={{fontWeight:700,color:active?"#155724":"#721c24"}}>{active?"Active":"Inactive"}</span>
        </label>
        <button style={{padding:"7px 12px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:11.5,cursor:"pointer",fontWeight:600,color:"#5a6691"}}>Merge with…</button>
        <button onClick={()=>setShowDupWarning(!showDupWarning)} style={{padding:"7px 12px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:11.5,cursor:"pointer",fontWeight:600,color:"#5a6691"}}>Check Duplicates</button>
        <button style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>💾 Save</button>
      </>}>

      {showDupWarning && (
        <div style={{padding:12,background:"#fff3cd",border:"1px solid #ffeaa7",borderLeft:"3px solid #856404",borderRadius:6,marginBottom:14}}>
          <p style={{margin:0,fontSize:12,color:"#856404",fontWeight:700}}>⚠ 2 possible duplicates detected</p>
          <div style={{marginTop:6,fontSize:11,color:"#856404"}}>
            • "L &amp; T Limited" (CUST-BOM-00098) — 87% match · last txn 2024-12-15<br/>
            • "L T Group" (CUST-AMD-00012) — 72% match · last txn 2023-08-22
          </div>
          <div style={{marginTop:8,display:"flex",gap:8}}>
            <button style={{padding:"4px 10px",background:"#856404",color:"#fff",border:"none",borderRadius:4,fontSize:10.5,fontWeight:700,cursor:"pointer"}}>Open Merge Tool</button>
            <button onClick={()=>setShowDupWarning(false)} style={{padding:"4px 10px",background:"transparent",border:"1px solid #856404",color:"#856404",borderRadius:4,fontSize:10.5,fontWeight:700,cursor:"pointer"}}>Dismiss</button>
          </div>
        </div>
      )}

      <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
        <div style={{display:"flex",borderBottom:"1px solid #e1e3ec",overflowX:"auto",background:"#fafbfd"}}>
          {tabs.map(t=><button key={t.key} onClick={()=>setTab(t.key)} style={tabBtnStyle(tab===t.key)}>{t.label}</button>)}
        </div>

        <div style={{padding:18,minHeight:420}}>
          {tab==="basic" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <CMDLabel label="Customer Code"><input style={{...inp,fontFamily:"monospace"}} defaultValue="CUST-BOM-00142"/></CMDLabel>
              <CMDLabel label="Customer Name"><input style={inp} defaultValue=""/></CMDLabel>
              <CMDLabel label="Type"><select style={inp}><option>Corporate</option><option>Individual</option><option>Sub-Agent</option><option>Govt / PSU</option></select></CMDLabel>
              <CMDLabel label="Branch"><select style={inp}><option>TKHO</option><option>BOM</option><option>AMD</option></select></CMDLabel>
              <CMDLabel label="Industry"><select style={inp}><option>Engineering & Construction</option><option>IT/ITES</option><option>Manufacturing</option><option>BFSI</option></select></CMDLabel>
              <CMDLabel label="Credit Limit"><input type="number" style={inp} defaultValue="5000000"/></CMDLabel>
              <CMDLabel label="Credit Days"><input type="number" style={inp} defaultValue="45"/></CMDLabel>
              <CMDLabel label="Default Currency"><select style={inp}>{ACTIVE_CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></CMDLabel>
            </div>
          )}
          {tab==="address" && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>3 addresses on file</p>
                <button style={{padding:"5px 11px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>+ Add Address</button>
              </div>
              {[{type:"Registered Office",addr:"L&T House, Ballard Estate, Mumbai 400001"},{type:"Billing Address",addr:"L&T Towers, Powai, Mumbai 400072"},{type:"Shipping Address",addr:"L&T HRD Centre, Lonavla 410401"}].map((a,i)=>(
                <div key={i} style={{padding:12,border:"1px solid #e1e3ec",borderRadius:6,marginBottom:8}}>
                  <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>{a.type}{i===0&&<span style={{marginLeft:8,padding:"1px 7px",background:"#d4a437",color:"#0d1326",borderRadius:3,fontSize:9,fontWeight:700}}>DEFAULT</span>}</p>
                  <p style={{margin:"3px 0 0",fontSize:11.5,color:"#5a6691"}}>{a.addr}</p>
                </div>
              ))}
            </div>
          )}
          {tab==="contact" && (
            <div>
              <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>3 contact persons</p>
              {[].map((c,i)=>(
                <div key={i} style={{padding:10,border:"1px solid #e1e3ec",borderRadius:6,marginBottom:6,display:"grid",gridTemplateColumns:"2fr 2fr 1.5fr",gap:10,alignItems:"center"}}>
                  <div><p style={{margin:0,fontSize:12,fontWeight:600,color:"#0d1326"}}>{c.name}</p><p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{c.role}</p></div>
                  <div style={{fontSize:11,color:"#5a6691"}}>{c.email}</div>
                  <div style={{fontSize:11,color:"#5a6691",fontFamily:"monospace"}}>{c.phone}</div>
                </div>
              ))}
            </div>
          )}
          {tab==="bank" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <CMDLabel label="Bank Name"><input style={inp} defaultValue="HDFC Bank"/></CMDLabel>
              <CMDLabel label="Branch"><input style={inp} defaultValue="Ballard Estate, Mumbai"/></CMDLabel>
              <CMDLabel label="Account No."><input style={{...inp,fontFamily:"monospace"}} defaultValue="50100012345678"/></CMDLabel>
              <CMDLabel label="IFSC"><input style={{...inp,fontFamily:"monospace"}} defaultValue="HDFC0000045"/></CMDLabel>
              <CMDLabel label="SWIFT (for intl.)"><input style={{...inp,fontFamily:"monospace"}} defaultValue="HDFCINBB"/></CMDLabel>
              <CMDLabel label="Account Type"><select style={inp}><option>Current</option><option>Savings</option><option>NRE</option><option>NRO</option></select></CMDLabel>
            </div>
          )}
          {tab==="tax" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <CMDLabel label="GSTIN"><input style={{...inp,fontFamily:"monospace"}} defaultValue="27AAACL0140P1ZW"/></CMDLabel>
              <CMDLabel label="GST Reg. Type"><select style={inp}><option>Regular</option><option>Composition</option><option>SEZ</option><option>Overseas</option></select></CMDLabel>
              <CMDLabel label="PAN"><input style={{...inp,fontFamily:"monospace"}} defaultValue="AAACL0140P"/></CMDLabel>
              <CMDLabel label="TAN"><input style={{...inp,fontFamily:"monospace"}} defaultValue="MUMA12345B"/></CMDLabel>
              <CMDLabel label="LUT No. (if exporter)"><input style={inp} placeholder="—"/></CMDLabel>
              <CMDLabel label="State"><input style={inp} defaultValue="Maharashtra (27)"/></CMDLabel>
            </div>
          )}
          {tab==="documents" && (
            <div>
              <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>4 documents uploaded</p>
              {[{name:"GST Certificate.pdf",size:"285 KB",when:"2024-04-10"},{name:"PAN Card.pdf",size:"142 KB",when:"2024-04-10"},{name:"Cancelled Cheque.pdf",size:"98 KB",when:"2024-04-10"},{name:"Annual Agreement 2026.pdf",size:"1.4 MB",when:"2026-04-01"}].map((d,i)=>(
                <div key={i} style={{padding:10,border:"1px solid #e1e3ec",borderRadius:6,marginBottom:6,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18}}>📎</span>
                  <div style={{flex:1}}><p style={{margin:0,fontSize:12,fontWeight:600,color:"#0d1326"}}>{d.name}</p><p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{d.size} · uploaded {d.when}</p></div>
                  <button style={{padding:"3px 10px",background:"transparent",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:4,fontSize:10.5,cursor:"pointer"}}>View</button>
                  <button style={{padding:"3px 10px",background:"transparent",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:4,fontSize:10.5,cursor:"pointer"}}>Download</button>
                </div>
              ))}
              <button style={{marginTop:8,padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>📤 Upload Document</button>
            </div>
          )}
          {tab==="notes" && (
            <CMDLabel label="Internal Notes (visible only to staff)">
              <textarea rows={10} style={{...inp,fontFamily:"inherit",resize:"vertical"}} defaultValue={"• Premium corporate client since 2019\n• Prefers Premium Economy on long-haul\n• CFO approves > ₹5L bookings\n• Net 45 payment terms, generally on time\n• Annual contract renewed April 2026"}/>
            </CMDLabel>
          )}
          {tab==="history" && (
            <div>
              <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Last 6 changes (inline audit history)</p>
              {[].map((h,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"6px 0",borderBottom:"1px solid #f0f2f7"}}>
                  <span style={{fontSize:10.5,fontFamily:"monospace",color:"#5a6691",minWidth:120}}>{h.ts}</span>
                  <span style={{fontSize:11.5,fontWeight:600,color:"#0d1326",minWidth:110}}>{h.user}</span>
                  <span style={{fontSize:11.5,color:"#0d1326"}}>{h.action}</span>
                </div>
              ))}
            </div>
          )}
          {tab==="linked" && (
            <div>
              <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Linked vouchers — last 30 days (5 of 142)</p>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
                <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Date</th><th style={RPT_thStyle}>Voucher</th><th style={RPT_thStyle}>Type</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
                <tbody>{[{date:"2026-05-18",vno:"INV-BOM/2026/8741",type:"Tax Invoice",amount:485000,status:"Paid"},{date:"2026-05-15",vno:"RV-BOM/2026/4519",type:"Receipt",amount:485000,status:"Cleared"},{date:"2026-05-08",vno:"INV-BOM/2026/8728",type:"Tax Invoice",amount:142500,status:"Outstanding"},{date:"2026-05-02",vno:"INV-BOM/2026/8721",type:"Tax Invoice",amount:285000,status:"Paid"},{date:"2026-04-30",vno:"CN-BOM/2026/0085",type:"Credit Note",amount:-12500,status:"Adjusted"}].map((r,i)=>(<tr key={i}><td style={RPT_tdStyle}>{r.date}</td><td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:600}}>{r.vno}</td><td style={RPT_tdStyle}>{r.type}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:r.amount<0?"#A32D2D":"#0d1326"}}>{fmtINR(Math.abs(r.amount))}</td><td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:600,background:r.status==="Paid"||r.status==="Cleared"?"#d4edda":r.status==="Outstanding"?"#fff3cd":"#e2e3e5",color:r.status==="Paid"||r.status==="Cleared"?"#155724":r.status==="Outstanding"?"#856404":"#383d41"}}>{r.status}</span></td></tr>))}</tbody>
              </table>
            </div>
          )}
          {tab==="custom" && (
            <div>
              <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Custom fields (configured in Settings → Custom Fields Manager)</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <CMDLabel label="Account Manager"><input style={inp} defaultValue=""/></CMDLabel>
                <CMDLabel label="Procurement Code (Client side)"><input style={{...inp,fontFamily:"monospace"}} defaultValue="LNT-VEN-04258"/></CMDLabel>
                <CMDLabel label="SLA Tier"><select style={inp}><option>Platinum</option><option>Gold</option><option>Silver</option></select></CMDLabel>
                <CMDLabel label="Loyalty Score"><input type="number" style={inp} defaultValue="92"/></CMDLabel>
                <CMDLabel label="Last Site Visit"><input type="date" style={inp} defaultValue="2026-03-15"/></CMDLabel>
                <CMDLabel label="Next Review Date"><input type="date" style={inp} defaultValue="2026-07-15"/></CMDLabel>
              </div>
              <p style={{margin:"14px 0 0",fontSize:10.5,color:"#5a6691"}}>↗ Manage custom fields in Settings</p>
            </div>
          )}
        </div>
      </div>

      {/* Last-modified footer */}
      <div style={{marginTop:14,padding:"10px 14px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"#5a6691"}}>
        <span>Created by <b style={{color:"#0d1326"}}>AD</b> on 2024-04-10 12:00</span>
        <span>Last modified by <b style={{color:"#0d1326"}}>—</b></span>
        <span>Record ID: <span style={{fontFamily:"monospace"}}>CUST-BOM-00142</span></span>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   2. BULK IMPORT — works for any master (3-step wizard)
   ════════════════════════════════════════════════════════════════════ */


export function BulkImportMaster(){
  const [step, setStep] = useState(1);
  const [importType, setImportType] = useState("Customers");
  const types = ["Customers","Suppliers","Sub-Agents","Employees","Chart of Accounts","Tax Codes","Forex Rates","Numbering Series"];
  const inp = {padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%"};

  return (
    <PHASE2_Page title="Bulk Import Master Data" subtitle="Upload Excel/CSV files to create master records in bulk — works for any master type">
      {/* Stepper */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18,padding:"14px 18px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:8}}>
        {[{n:1,label:"Select Type"},{n:2,label:"Download Template / Upload File"},{n:3,label:"Preview & Validate"}].map((s,i,arr)=>(
          <div key={s.n} style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:step>=s.n?"#d4a437":"#e1e3ec",color:step>=s.n?"#0d1326":"#5a6691",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13}}>{step>s.n?"✓":s.n}</div>
            <div><p style={{margin:0,fontSize:11.5,fontWeight:700,color:"#0d1326"}}>{s.label}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>Step {s.n} of 3</p></div>
            {i<arr.length-1&&<div style={{flex:1,height:2,background:step>s.n?"#d4a437":"#e1e3ec",marginLeft:6}}/>}
          </div>
        ))}
      </div>

      {step===1 && (
        <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:20}}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Which master are you importing?</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
            {types.map(t=>(
              <label key={t} style={{padding:14,border:importType===t?"2px solid #d4a437":"1px solid #e1e3ec",borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:importType===t?"#fff8e8":"#fff"}}>
                <input type="radio" checked={importType===t} onChange={()=>setImportType(t)}/>
                <span style={{fontSize:12,fontWeight:600,color:"#0d1326"}}>{t}</span>
              </label>
            ))}
          </div>
          <div style={{marginTop:20,display:"flex",justifyContent:"flex-end"}}>
            <button onClick={()=>setStep(2)} style={{padding:"9px 22px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer"}}>Next →</button>
          </div>
        </div>
      )}

      {step===2 && (
        <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:20}}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Importing: <span style={{color:"#d4a437"}}>{importType}</span></p>
          <div style={{padding:16,background:"#fafbfd",border:"1px dashed #cbd0dc",borderRadius:6,marginBottom:14}}>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>📥 Download Template First</p>
            <p style={{margin:"4px 0 10px",fontSize:11,color:"#5a6691"}}>Get the Excel template with the right columns and sample rows for {importType}</p>
            <button style={{padding:"7px 14px",background:"#fff",border:"1px solid #d4a437",color:"#d4a437",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>📥 Download {importType}_Template.xlsx</button>
          </div>
          <div style={{padding:30,background:"#fff",border:"2px dashed #cbd0dc",borderRadius:8,textAlign:"center"}}>
            <p style={{margin:0,fontSize:32}}>📤</p>
            <p style={{margin:"6px 0 4px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Drag &amp; drop your file here, or click to browse</p>
            <p style={{margin:0,fontSize:11,color:"#5a6691"}}>Supports .xlsx, .xls, .csv · Max 10 MB · Max 5000 rows</p>
            <button style={{marginTop:12,padding:"8px 16px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>📁 Browse Files</button>
          </div>
          <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}>
            <button onClick={()=>setStep(1)} style={{padding:"9px 18px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>← Back</button>
            <button onClick={()=>setStep(3)} style={{padding:"9px 22px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer"}}>Preview & Validate →</button>
          </div>
        </div>
      )}

      {step===3 && (
        <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:20}}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Validation Preview</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
            <div style={{padding:12,background:"#d4edda",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:24,fontWeight:700,color:"#155724"}}>48</p><p style={{margin:0,fontSize:11,color:"#155724",fontWeight:600}}>Valid rows</p></div>
            <div style={{padding:12,background:"#fff3cd",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:24,fontWeight:700,color:"#856404"}}>3</p><p style={{margin:0,fontSize:11,color:"#856404",fontWeight:600}}>Warnings (duplicates)</p></div>
            <div style={{padding:12,background:"#f8d7da",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:24,fontWeight:700,color:"#721c24"}}>2</p><p style={{margin:0,fontSize:11,color:"#721c24",fontWeight:600}}>Errors (will skip)</p></div>
            <div style={{padding:12,background:"#e1e3ec",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:24,fontWeight:700,color:"#0d1326"}}>53</p><p style={{margin:0,fontSize:11,color:"#0d1326",fontWeight:600}}>Total in file</p></div>
          </div>
          <div style={{maxHeight:280,overflowY:"auto",border:"1px solid #e1e3ec",borderRadius:6}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead style={{background:"#f7f8fb",position:"sticky",top:0}}><tr><th style={RPT_thStyle}>Row</th><th style={RPT_thStyle}>Code</th><th style={RPT_thStyle}>Name</th><th style={RPT_thStyle}>GSTIN</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
              <tbody>
                {[].map(row=>(
                  <tr key={row.r} style={{background:row.status==="error"?"#fff5f5":row.status==="warning"?"#fffbed":"#fff",borderBottom:"1px solid #f0f2f7"}}>
                    <td style={{...RPT_tdStyle,color:"#5a6691"}}>{row.r}</td>
                    <td style={{...RPT_tdStyle,fontFamily:"monospace"}}>{row.code}</td>
                    <td style={RPT_tdStyle}>{row.name||<span style={{color:"#A32D2D"}}>—</span>}</td>
                    <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5}}>{row.gst}</td>
                    <td style={{padding:"6px 12px",textAlign:"center",borderBottom:"1px solid #f0f2f7"}}>
                      {row.status==="valid"&&<span style={{padding:"2px 8px",background:"#d4edda",color:"#155724",borderRadius:3,fontSize:10,fontWeight:700}}>✓ Valid</span>}
                      {row.status==="warning"&&<span title={row.msg} style={{padding:"2px 8px",background:"#fff3cd",color:"#856404",borderRadius:3,fontSize:10,fontWeight:700}}>⚠ {row.msg}</span>}
                      {row.status==="error"&&<span title={row.msg} style={{padding:"2px 8px",background:"#f8d7da",color:"#721c24",borderRadius:3,fontSize:10,fontWeight:700}}>✗ {row.msg}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}>
            <button onClick={()=>setStep(2)} style={{padding:"9px 18px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>← Back</button>
            <div style={{display:"flex",gap:8}}>
              <button style={{padding:"9px 18px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>📥 Download Error Report</button>
              <button style={{padding:"9px 22px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ Import 48 Valid Rows</button>
            </div>
          </div>
        </div>
      )}

      {/* Recent imports */}
      <div style={{marginTop:18,padding:14,background:"#fff",border:"1px solid #e1e3ec",borderRadius:8}}>
        <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Recent imports</p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Date</th><th style={RPT_thStyle}>Type</th><th style={RPT_thStyle}>By</th><th style={{...RPT_thStyle,textAlign:"right"}}>Rows</th><th style={{...RPT_thStyle,textAlign:"right"}}>Imported</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
          <tbody>{[].map((r,i)=>(<tr key={i}><td style={RPT_tdStyle}>{r.date}</td><td style={RPT_tdStyle}>{r.type}</td><td style={RPT_tdStyle}>{r.user}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{r.rows}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#22c55e"}}>{r.imported}</td><td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",background:"#d4edda",color:"#155724",borderRadius:3,fontSize:10,fontWeight:700}}>{r.status}</span></td></tr>))}</tbody>
        </table>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   3. MERGE RECORDS UTILITY (any master)
   ════════════════════════════════════════════════════════════════════ */


export function MergeRecordsUtility(){
  const [masterType, setMasterType] = useState("Customers");
  const [source, setSource] = useState("L T Group (CUST-AMD-00012)");
  const [target, setTarget] = useState("");
  const inp = {padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%"};

  return (
    <PHASE2_Page title="Merge Records Utility"
      subtitle="Combine duplicate master records · all transactions reassigned · source record marked inactive · audit-tracked">
      <div style={{padding:14,background:"#fff3cd",border:"1px solid #ffeaa7",borderLeft:"3px solid #856404",borderRadius:6,marginBottom:14}}>
        <p style={{margin:0,fontSize:12,color:"#856404",fontWeight:700}}>⚠ Merge is permanent</p>
        <p style={{margin:"3px 0 0",fontSize:11,color:"#856404"}}>All transactions, addresses, contacts, and documents from the Source record will be transferred to the Target record. The Source record will be marked inactive but kept for audit. Only Director or Senior Finance Manager can perform merge.</p>
      </div>

      <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:20,marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:18}}>
          <div>
            <label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",marginBottom:4,display:"block"}}>Master Type</label>
            <select value={masterType} onChange={e=>setMasterType(e.target.value)} style={inp}>
              {["Customers","Suppliers","Sub-Agents","Employees","Chart of Accounts","Tax Codes"].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,color:"#A32D2D",fontWeight:700,textTransform:"uppercase",marginBottom:4,display:"block"}}>Source (will be merged out)</label>
            <select value={source} onChange={e=>setSource(e.target.value)} style={{...inp,borderColor:"#A32D2D"}}>
              <option value="">Select customer…</option>
            </select>
          </div>
          <div>
            <label style={{fontSize:11,color:"#22c55e",fontWeight:700,textTransform:"uppercase",marginBottom:4,display:"block"}}>Target (will keep)</label>
            <select value={target} onChange={e=>setTarget(e.target.value)} style={{...inp,borderColor:"#22c55e"}}>
              <option value="">Select customer…</option>
            </select>
          </div>
        </div>

        {/* Comparison preview */}
        <div style={{border:"1px solid #e1e3ec",borderRadius:6,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",background:"#0d1326",color:"#fff",fontSize:12,fontWeight:700}}>Comparison Preview</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Field</th><th style={{...RPT_thStyle,color:"#A32D2D"}}>Source (out)</th><th style={{...RPT_thStyle,color:"#22c55e"}}>Target (kept)</th><th style={{...RPT_thStyle,textAlign:"center"}}>After Merge</th></tr></thead>
            <tbody>
              {[
                {field:"Name",src:"",tgt:"",result:""},
                {field:"GSTIN",src:"24AAACL0140P1ZH (AMD)",tgt:"27AAACL0140P1ZW (BOM)",result:"Both kept as alternate GSTINs"},
                {field:"Credit Limit",src:"₹10L",tgt:"₹50L",result:"₹50L (higher)"},
                {field:"Address Count",src:"1",tgt:"3",result:"4 (combined)"},
                {field:"Contact Persons",src:"2",tgt:"3",result:"5 (combined)"},
                {field:"Documents",src:"2",tgt:"4",result:"6 (combined)"},
                {field:"Linked Transactions",src:"18 vouchers (₹4.8L)",tgt:"142 vouchers (₹2.85Cr)",result:"160 vouchers (₹2.90Cr) → all under Target"},
                {field:"Created",src:"2022-06-08",tgt:"2024-04-10",result:"Target's date kept"},
              ].map((row,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #f0f2f7"}}>
                  <td style={{...RPT_tdStyle,fontWeight:700}}>{row.field}</td>
                  <td style={{...RPT_tdStyle,color:"#A32D2D",textDecoration:"line-through",opacity:0.7}}>{row.src}</td>
                  <td style={{...RPT_tdStyle,color:"#22c55e"}}>{row.tgt}</td>
                  <td style={{...RPT_tdStyle,textAlign:"center",fontWeight:600}}>{row.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{marginTop:18,padding:12,background:"#fafbfd",borderRadius:6}}>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#0d1326",cursor:"pointer"}}>
            <input type="checkbox"/>
            <span>I understand that all 18 transactions from the Source will be reassigned to the Target, and this action cannot be undone.</span>
          </label>
        </div>

        <div style={{marginTop:18,display:"flex",justifyContent:"flex-end",gap:8}}>
          <button style={{padding:"9px 18px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button style={{padding:"9px 22px",background:"#A32D2D",color:"#fff",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer"}}>⚠ Confirm Merge</button>
        </div>
      </div>

      {/* Recent merges */}
      <div style={{padding:14,background:"#fff",border:"1px solid #e1e3ec",borderRadius:8}}>
        <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Recent merges (audit history)</p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Date</th><th style={RPT_thStyle}>Type</th><th style={RPT_thStyle}>Source → Target</th><th style={RPT_thStyle}>By</th><th style={{...RPT_thStyle,textAlign:"right"}}>Txns Moved</th></tr></thead>
          <tbody>{[].map((m,i)=>(<tr key={i}><td style={RPT_tdStyle}>{m.date}</td><td style={RPT_tdStyle}>{m.type}</td><td style={RPT_tdStyle}>{m.merge}</td><td style={RPT_tdStyle}>{m.user}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{m.txns}</td></tr>))}</tbody>
        </table>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PHASE 2 — TRANSACTIONS (5 voucher capability screens)
   ════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════
   1. BULK VOUCHER IMPORT
   ════════════════════════════════════════════════════════════════════ */

export function MasterChangeQueue(){
  const [filter,setFilter]=useState("ALL");
  const statuses=["Pending Approval","Approved","Rejected"];
  const filtered=filter==="ALL"?MASTER_CHANGE_QUEUE:MASTER_CHANGE_QUEUE.filter(q=>q.status===filter);
  const pending=MASTER_CHANGE_QUEUE.filter(q=>q.status==="Pending Approval").length;
  const approved=MASTER_CHANGE_QUEUE.filter(q=>q.status==="Approved").length;
  const rejected=MASTER_CHANGE_QUEUE.filter(q=>q.status==="Rejected").length;
  const statusStyle={"Pending Approval":{bg:"#fff3cd",color:"#856404"},Approved:{bg:"#d4edda",color:"#155724"},Rejected:{bg:"#f8d7da",color:"#721c24"}};
  return(
    <PHASE2_Page title="Master Data Change Request Queue"
      subtitle="All master-data change requests requiring approval · vendor bank/PAN, credit limits, user permissions, CoA, etc."
      toolbar={<select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,background:"#fff"}}><option value="ALL">All statuses</option>{statuses.map(s=><option key={s}>{s}</option>)}</select>}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Pending Approval",v:pending,c:"#f97316"},{l:"Approved (MTD)",v:approved,c:"#22c55e"},{l:"Rejected (MTD)",v:rejected,c:"#A32D2D"},{l:"High-Risk Pending",v:1,c:"#A32D2D"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:k.c}}>{k.v}</p></div>
        ))}
      </div>
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#f7f8fb"}}>
            <th style={RPT_thStyle}>Request ID</th>
            <th style={RPT_thStyle}>Change Type</th>
            <th style={RPT_thStyle}>Entity</th>
            <th style={RPT_thStyle}>Detail</th>
            <th style={RPT_thStyle}>Requested By</th>
            <th style={RPT_thStyle}>Approver</th>
            <th style={{...RPT_thStyle,textAlign:"center"}}>Status</th>
            <th style={{...RPT_thStyle,textAlign:"center"}}>Action</th>
          </tr></thead>
          <tbody>{filtered.map(q=>(
            <tr key={q.id} style={{borderBottom:"1px solid #f0f2f7",background:q.priority==="High"?"#fff5f5":"#fff"}}>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5,color:"#5a6691"}}>{q.id}</td>
              <td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:q.priority==="High"?"#f8d7da":"#e6e8f1",color:q.priority==="High"?"#721c24":"#0d1326",borderRadius:3,fontSize:10.5,fontWeight:700}}>{q.type}</span></td>
              <td style={{...RPT_tdStyle,fontWeight:700}}>{q.entity}</td>
              <td style={{...RPT_tdStyle,fontSize:11,color:"#0d1326"}}>{q.detail}{q.extraCheck&&<p style={{margin:"2px 0 0",fontSize:10,color:"#A32D2D",fontStyle:"italic"}}>⚠ {q.extraCheck}</p>}{q.rejectReason&&<p style={{margin:"2px 0 0",fontSize:10,color:"#A32D2D",fontStyle:"italic"}}>Rejected: {q.rejectReason}</p>}</td>
              <td style={{...RPT_tdStyle,fontSize:11}}>{q.requestedBy}<p style={{margin:0,fontSize:10,color:"#5a6691"}}>{q.requestDate}</p></td>
              <td style={{...RPT_tdStyle,fontSize:11,fontWeight:600,color:"#d4a437"}}>{q.approver}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"3px 9px",borderRadius:3,fontSize:10,fontWeight:700,...(statusStyle[q.status]||{})}}>{q.status}</span>{q.approvedDate&&<p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691"}}>{q.approvedDate}</p>}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}>
                {q.status==="Pending Approval"?(
                  <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                    <button style={{padding:"3px 8px",background:"#22c55e",color:"#fff",border:"none",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>Approve</button>
                    <button style={{padding:"3px 8px",background:"#A32D2D",color:"#fff",border:"none",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>Reject</button>
                  </div>
                ):<button style={{padding:"3px 8px",background:"transparent",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:3,fontSize:10,cursor:"pointer"}}>View Log</button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </PHASE2_Page>
  );
}


export function PassportManager({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:branch?.code;
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [form,setForm]=useState({client:"",person:"",passport:"",nationality:"Indian",issued:"",expiry:"",branch:"BOM"});
  const [passports,setPassports]=useState(_PASSPORTS);
  const TODAY="2026-05-19";

  const filtered=passports.filter(p=>(
    (!brCode||p.branch===brCode)&&
    (!search||p.person.toLowerCase().includes(search.toLowerCase())||p.client.toLowerCase().includes(search.toLowerCase())||p.passport.includes(search))
  ));

  const daysToExpiry=d=>Math.ceil((new Date(d)-new Date(TODAY))/(1000*60*60*24));
  const expStatus=d=>{const dl=daysToExpiry(d);return dl<0?"Expired":dl<90?"Expiring Soon":dl<180?"Expiring in 6mo":"Valid";};
  const STATUS_CLR={"Valid":"#27500A","Expiring in 6mo":"#1D9E75","Expiring Soon":"#854F0B","Expired":"#A32D2D","Visa Expiring":"#854F0B"};
  const STATUS_BG={"Valid":"#EAF3DE","Expiring in 6mo":"#EAF3DE","Expiring Soon":"#FAEEDA","Expired":"#FCEBEB","Visa Expiring":"#FAEEDA"};

  const expiringSoon=filtered.filter(p=>daysToExpiry(p.expiry)<180&&daysToExpiry(p.expiry)>0);

  return (
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🛂</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Passport & Document Manager</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Client passports · Visa stamps · Expiry alerts</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name / passport / client..." style={{...inp,width:220,minHeight:32,fontSize:11}}/>
          <ExportBtn name="passports" rows={filtered} columns={[{key:"person",label:"Person"},{key:"client",label:"Client"},{key:"passport",label:"Passport No."},{key:"nationality",label:"Nationality"},{key:"issued",label:"Issued"},{key:"expiry",label:"Expiry"},{key:"visas",label:"Visas in Passport"},{key:"branch",label:"Branch"}]}/>
          <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Add Passport</button>
        </div>
      </div>

      {expiringSoon.length>0&&(
        <div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:10.5,color:"#854F0B",fontWeight:600,display:"flex",gap:8,alignItems:"center"}}>
          <AlertTriangle size={15}/>
          {expiringSoon.length} passport{expiringSoon.length>1?"s":""} expiring within 6 months:
          {expiringSoon.map(p=><span key={p.id} style={{marginLeft:6,padding:"1px 7px",borderRadius:999,background:"#854F0B",color:"#fff",fontSize:9.5}}>{p.person} ({daysToExpiry(p.expiry)}d)</span>)}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[{l:"Total Passports",v:String(filtered.length),c:"#384677",bg:"#f3f4f8"},
          {l:"Valid",v:String(filtered.filter(p=>daysToExpiry(p.expiry)>=180).length),c:"#27500A",bg:"#EAF3DE"},
          {l:"Expiring <6mo",v:String(filtered.filter(p=>daysToExpiry(p.expiry)<180&&daysToExpiry(p.expiry)>0).length),c:"#854F0B",bg:"#FAEEDA"},
          {l:"Expired",v:String(filtered.filter(p=>daysToExpiry(p.expiry)<=0).length),c:"#A32D2D",bg:"#FCEBEB"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      <div style={{...card,padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Person","Client","Passport No.","Nationality","Issued","Expiry","Days Left","Visas in Passport","Branch","Status"].map((h,i)=>(
              <th key={i} style={{padding:"9px 11px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((p,i)=>{
            const dl=daysToExpiry(p.expiry);
            const st=expStatus(p.expiry);
            return (
              <tr key={p.id} style={{borderBottom:"1px solid #f3f4f8",background:dl<0?"#fff5f5":dl<90?"#fffaf0":i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 11px",fontWeight:600,color:"#0d1326"}}>{p.person}</td>
                <td style={{padding:"8px 11px",color:"#384677"}}>{p.client}</td>
                <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:10,color:"#185FA5",fontWeight:700}}>{p.passport}</td>
                <td style={{padding:"8px 11px",color:"#5a6691"}}>{p.nationality}</td>
                <td style={{padding:"8px 11px",color:"#5a6691",whiteSpace:"nowrap"}}>{p.issued}</td>
                <td style={{padding:"8px 11px",color:dl<90?"#A32D2D":dl<180?"#854F0B":"#5a6691",fontWeight:dl<180?700:400,whiteSpace:"nowrap"}}>{p.expiry}</td>
                <td style={{padding:"8px 11px",fontWeight:700,color:dl<0?"#A32D2D":dl<90?"#854F0B":"#27500A"}}>{dl<0?`${Math.abs(dl)}d EXPIRED`:`${dl}d`}</td>
                <td style={{padding:"8px 11px",fontSize:10,color:"#5a6691",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis"}}>{p.visas.length>0?p.visas.join(" · "):"None"}</td>
                <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 6px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{p.branch}</span></td>
                <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[st]||"#f3f4f8",color:STATUS_CLR[st]||"#5a6691"}}>{st}</span></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Add Passport Record</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Person name"><input value={form.person} onChange={e=>setForm(f=>({...f,person:e.target.value}))} style={inp}/></FL>
                <FL label="Client account"><input value={form.client} onChange={e=>setForm(f=>({...f,client:e.target.value}))} style={inp}/></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Passport number"><input value={form.passport} onChange={e=>setForm(f=>({...f,passport:e.target.value}))} style={{...inp,fontFamily:"monospace",textTransform:"uppercase"}}/></FL>
                <FL label="Nationality"><input value={form.nationality} onChange={e=>setForm(f=>({...f,nationality:e.target.value}))} style={inp}/></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Issue date"><input type="date" value={form.issued} onChange={e=>setForm(f=>({...f,issued:e.target.value}))} style={inp}/></FL>
                <FL label="Expiry date"><input type="date" value={form.expiry} onChange={e=>setForm(f=>({...f,expiry:e.target.value}))} style={inp}/></FL>
              </div>
              <FL label="Branch"><select value={form.branch} onChange={e=>setForm(f=>({...f,branch:e.target.value}))} style={inp}>{BRANCH_CODES.map(b=><option key={b}>{b}</option>)}</select></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={()=>{
                const id=`PP${String(passports.length+1).padStart(3,"0")}`;
                const st=expStatus(form.expiry);
                setPassports(p=>[{...form,id,visas:[],type:"B2C",dob:"",status:st},...p]);
                setModal(false);
              }} style={btnG}>💾 Save Passport</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   USER MENU + SIGN-OUT  (in TopBar, next to notification bell)
   ════════════════════════════════════════════════════════════════════ */
