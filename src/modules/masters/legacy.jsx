/* ════════════════════════════════════════════════════════════════════
   MODULES/MASTERS.JSX
   Auto-generated from KBiz360_v2.jsx · 2884 lines · 25 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import { todayISO } from '../../core/dates';
import { confirmDialog } from '../../core/ux/confirm';
import { AlertTriangle, Check, Download, Pencil, Plus, Save, Search, Settings, Trash2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ACTIVE_CURRENCIES, ADM_DATA, BRANCH_CODES, CASH, CUSTOMERS, FOREX_RATES_DATA, GP_BILLS, SUBAGENTS } from '../../core/data';
import { useNumberingSeries, useApprovalLimits } from '../../core/useReference';
import { useMasterList, useMasterMutations } from '../../core/useMasters';
import { apiPost, apiPut } from '../../core/api';
import { fmt, fmtINR, localeOf } from '../../core/format';
import { exportToExcel } from '../../core/exportExcel';
import { ACM_DATA, BANK_ACCOUNTS_DATA, COST_CENTERS_DATA, DashboardRouter, MASTER_CHANGE_QUEUE, MASTER_PAGE, PROJECTS_DATA, TAB_Page, TOUR_CODES_DATA, VENDOR_ADVANCES_DATA, cardStyle, tabPanel } from '../../core/helpers';
import { toast } from '../../core/ux/toast';
import { SETTLE_CYCLES, PAY_METHODS } from '../../core/partyEnums';
// MstrShell / MstrModal modernized (responsive header + shared Modal) — same props.
import { MstrShell, MstrModal } from './components/mstr';
import { useMobile } from '../../core/hooks';
import { useGpBills } from '../../core/useAccounting';
import { useModalEsc } from '../../core/ux/useModalEsc';
import { ReportDateBar, ReportSearch, matchNeedle, resolveReportRange } from '../../core/reportDateBar';
import { B, FL, RPT_tdStyle, RPT_thStyle, bc, btnG, btnGh, card, inp, inpStd, tabBtnStyle } from '../../core/styles';
import { PHASE2_Page } from '../../shell/PHASE2_Page';
import { TopBar } from '../../shell/TopBar';
import { clickable } from '../../core/ux/clickable';

export function MastersForex(){
  // Live forex rates from /api/forex-rates (date/from/to/rate/source). Add Rate
  // persists via the create mutation, so the table reflects the live collection.
  const { data: rates = [] } = useMasterList('forex-rates');
  const { create } = useMasterMutations('forex-rates');
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  // Default To to a non-INR currency so the From≠To guard isn't tripped by the
  // initial INR→INR pair (the user only needs to type the rate).
  const [form,setForm]=useState({from:"INR",to:(ACTIVE_CURRENCIES.find((c)=>c!=="INR")||"USD"),rate:0,source:"Manual"});
  const CURRENCIES=ACTIVE_CURRENCIES;

  const save=async()=>{
    if(create.isPending) return;            // ignore double-clicks while the POST is in flight
    if(+form.rate<=0){
      await confirmDialog({title:"Invalid exchange rate",message:"Exchange rate must be greater than 0.",confirmLabel:"OK",cancelLabel:"Close"});
      return;
    }
    if(form.from===form.to){
      await confirmDialog({title:"Invalid currency pair",message:"From and To currency must differ (e.g. INR → INR is not a valid rate).",confirmLabel:"OK",cancelLabel:"Close"});
      return;
    }
    const rec={...form,date:new Date().toISOString().slice(0,10)};
    create.mutate(rec,{
      onSuccess:()=>setModal(false),
      onError:(e)=>confirmDialog({title:"Save failed",message:`Could not save the rate — ${e?.message||'unknown error'}.`,confirmLabel:"OK",cancelLabel:"Close"}),
    });
  };

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#fbeedb",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>💱</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>Forex Exchange Rates</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>Used in foreign currency vouchers for INR conversion · Source: RBI / CBK / BOT</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <ExportBtn name="forex-rates" rows={rates} columns={[{key:"date",label:"Date"},{key:"from",label:"From Currency"},{key:"to",label:"To Currency"},{key:"rate",label:"Exchange Rate"},{key:"source",label:"Source"}]}/>
          <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Add Rate</button>
        </div>
      </div>
      <div style={{...card,padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#1a1c22"}}>
            {["Date","From Currency","To Currency","Exchange Rate","Source","Implied (1 INR)"].map((h,i)=>(
              <th key={i} style={{padding:"9px 14px",textAlign:i===3||i===5?"right":"left",color:"#c2a04a",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{rates.map((r,i)=>{
            // Coerce — legacy/imported docs may carry rate as a string/null, which would
            // crash on .toFixed and blank the whole screen.
            const rate=Number(r.rate)||0;
            return (
            <tr key={r._id||`${r.date}-${r.from}-${r.to}-${i}`} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"9px 14px",fontFamily:"monospace",fontSize:10.5,color:"#5b616e"}}>{r.date}</td>
              <td style={{padding:"9px 14px"}}>
                <span style={{fontSize:13,fontWeight:800,color:"#2563eb",background:"#e8f0ff",padding:"3px 10px",borderRadius:999}}>{r.from}</span>
              </td>
              <td style={{padding:"9px 14px"}}>
                <span style={{fontSize:13,fontWeight:800,color:"#16a34a",background:"#e8f6ed",padding:"3px 10px",borderRadius:999}}>{r.to}</span>
              </td>
              <td style={{padding:"9px 14px",textAlign:"right",fontWeight:800,fontSize:15,fontVariantNumeric:"tabular-nums",color:"#1a1c22"}}>{rate.toFixed(2)}</td>
              <td style={{padding:"9px 14px",fontSize:10.5,color:"#5b616e"}}>{r.source}</td>
              <td style={{padding:"9px 14px",textAlign:"right",fontSize:10.5,color:"#5b616e",fontVariantNumeric:"tabular-nums"}}>1 {r.to} = {rate>0?(1/rate).toFixed(4):"—"} {r.from}</td>
            </tr>
          );})}</tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:420,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22"}}>Add Exchange Rate</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5b616e"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
                <FL label="From currency"><select value={form.from} onChange={e=>setForm(f=>({...f,from:e.target.value}))} style={inp}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></FL>
                <FL label="To currency"><select value={form.to} onChange={e=>setForm(f=>({...f,to:e.target.value}))} style={inp}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></FL>
              </div>
              <FL label="Exchange rate"><input type="number" step="0.01" value={form.rate} onChange={e=>setForm(f=>({...f,rate:+e.target.value}))} style={inp} placeholder="e.g. 83.42"/></FL>
              <FL label="Source"><select value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value}))} style={inp}><option>RBI</option><option>CBK</option><option>BOT</option><option>DGI</option><option>Manual</option><option>Bank Rate</option></select></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={save} disabled={create.isPending} style={{...btnG, opacity: create.isPending ? 0.6 : 1, cursor: create.isPending ? 'not-allowed' : 'pointer'}}>{create.isPending ? 'Saving…' : '💾 Save Rate'}</button>
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


export function ChartOfAccounts(){
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [form,setForm]=useState({name:"",type:"Asset",parent:"Current Assets"});

  const COA_GROUPS=[
    {id:1, name:"Capital Account",         type:"Liability", parent:"Primary",
     sub:["Proprietor's Capital","Partner Capital A","Partner Capital B","Retained Earnings","Reserve & Surplus","Share Application Money"]},
    {id:2, name:"Loans (Liability)",        type:"Liability", parent:"Primary",
     sub:["Bank Overdraft / CC Limit","Secured Loans","Unsecured Loans — Directors & Partners","Vehicle Loan","Equipment Finance Lease"]},
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
     sub:["Flight Ticket Income — Domestic","Flight Ticket Income — International",
          "Holiday Package Income — Domestic","Holiday Package Income — International",
          "Hotel Income","Car Rental Income","Visa Service Fee Income",
          "Insurance Premium Income","Miscellaneous Service Income",
          "Commission Income — Air India","Commission Income — Emirates","Commission Income — Other Airlines",
          "PLACI / Override Commission Income","SVF Income","Documentation Fee Income",
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

  const TYPE_CLR={Asset:"#2563eb",Liability:"#dc2626",Income:"#16a34a",Expense:"#d97706"};
  const TYPE_BG ={Asset:"#e8f0ff",Liability:"#fbe9e9",Income:"#e8f6ed",Expense:"#fbeedb"};
  const filtered=COA_GROUPS.filter(g=>!search||
    g.name.toLowerCase().includes(search.toLowerCase())||
    g.sub.some(s=>s.toLowerCase().includes(search.toLowerCase())));
  const totalLedgers=COA_GROUPS.reduce((s,g)=>s+g.sub.length,0);

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#e8f6ed",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🗄</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>Chart of Accounts</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>{COA_GROUPS.length} account groups · {totalLedgers} ledger accounts · Travel agency standard structure</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search groups or ledgers..." style={{...inp,width:240,minHeight:32,fontSize:11}}/>
          <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Add Group</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,350px),1fr))",gap:12}}>
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
                <div key={i} style={{padding:"4px 0",borderBottom:i<g.sub.length-1?"1px solid #dfe2e7":"none",
                  fontSize:10.5,color:s.startsWith("Auto-created")?"#cbd0db":s.startsWith("Accum")?"#d97706":"#2e323c",
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
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22"}}>Add Account Group</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5b616e"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <FL label="Group name"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp}/></FL>
              <FL label="Type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}><option>Asset</option><option>Liability</option><option>Income</option><option>Expense</option></select></FL>
              <FL label="Parent group"><select value={form.parent} onChange={e=>setForm(f=>({...f,parent:e.target.value}))} style={inp}>
                {["Primary","Capital Account","Current Assets","Current Liabilities","Sales Accounts","Purchase Accounts","Indirect Expenses"].map(p=><option key={p}>{p}</option>)}
              </select></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
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
          <thead><tr style={{background:"#1a1c22"}}>
            {["Ledger Name","Group","Nature","Opening Balance","Currency","Status",""].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=2?"center":"left",
                color:"#c2a04a",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((l,i)=>(
            <tr key={l.id} style={{borderBottom:"1px solid #dfe2e7",
              background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px",fontWeight:600,color:"#1a1c22"}}>{l.name}</td>
              <td style={{padding:"8px 12px",color:"#5b616e",fontSize:11}}>{l.group}</td>
              <td style={{padding:"8px 12px",textAlign:"center"}}>
                <span style={{padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:700,
                  background:l.nature==="Dr"?"#e8f0ff":"#e8f6ed",
                  color:l.nature==="Dr"?"#2563eb":"#16a34a"}}>{l.nature}</span>
              </td>
              <td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace",
                fontWeight:600,color:l.ob>0?"#1a1c22":"#cbd0db"}}>
                {l.ob>0?l.ob.toLocaleString("en-IN"):"—"}
              </td>
              <td style={{padding:"8px 12px",textAlign:"center",fontSize:10,
                color:"#5b616e",fontWeight:600}}>{l.currency}</td>
              <td style={{padding:"8px 12px",textAlign:"center"}}>
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,
                  background:l.active?"#e8f6ed":"#f3f4f8",
                  color:l.active?"#16a34a":"#9ca3af"}}>{l.active?"Active":"Inactive"}</span>
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
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
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
    B2B:{label:"B2B — Registered Business",icon:"🏢",color:"#2563eb",bg:"#e8f0ff",
      rule:"Tax Invoice issued with buyer GSTIN. Buyer can claim Input Tax Credit. Reported invoice-wise in GSTR-1 B2B table.",
      cols:["Company Name","GSTIN","State / City","Credit","Outstanding","Contact",""]},
    B2C:{label:"B2C — Individual / Unregistered",icon:"👤",color:"#16a34a",bg:"#e8f6ed",
      rule:"Tax Invoice without buyer GSTIN (or Bill of Supply if exempt). No ITC to buyer. Reported aggregate in GSTR-1 B2C table.",
      cols:["Customer Name","Country / City","Passport No.","Credit","Outstanding","Contact",""]},
    B2E:{label:"B2E — Corporate Employee Travel",icon:"💼",color:"#d97706",bg:"#fbeedb",
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
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>

      {/* Page header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
        marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>Customer Master</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>
            Three separate registers — B2B · B2C · B2E — maintained independently
          </p>
        </div>
      </div>

      {/* Tab selector — 3 large cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:10,marginBottom:14}}>
        {Object.entries(TABS).map(([t,c])=>{
          const count=sets[t].data.length;
          const active=tab===t;
          const outAmt=sets[t].data.reduce((s,d)=>s+d.out,0);
          return (
            <div key={t} {...clickable(()=>{setTab(t);setSearch("");})}
              style={{padding:"12px 14px",borderRadius:10,cursor:"pointer",
                border:`2px solid ${active?c.color:"#e6e8ec"}`,
                background:active?c.bg:"#fff",
                transition:"all 0.15s",
                boxShadow:active?"0 4px 12px rgba(0,0,0,0.08)":"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <span style={{fontSize:20}}>{c.icon}</span>
                <span style={{fontSize:22,fontWeight:800,color:c.color,lineHeight:1}}>{count}</span>
              </div>
              <p style={{margin:"0 0 2px",fontSize:11.5,fontWeight:700,color:"#1a1c22"}}>{t}</p>
              <p style={{margin:"0 0 6px",fontSize:9.5,color:"#5b616e",lineHeight:1.3}}>
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
            <tr style={{background:"#1a1c22"}}>
              {cfg.cols.map((h,i)=>(
                <th key={i} style={{padding:"9px 12px",
                  textAlign:(tab==="B2B"&&i>=3&&i<=4)||(tab==="B2C"&&i>=3&&i<=4)||(tab==="B2E"&&i>=3&&i<=4)?"right":"left",
                  color:"#c2a04a",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0?(
              <tr><td colSpan={cfg.cols.length}
                style={{padding:"32px",textAlign:"center",color:"#5b616e",fontSize:12}}>
                No {tab} customers found. {search&&"Try clearing your search."}
              </td></tr>
            ):filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #dfe2e7",
                background:i%2===0?"#fff":"#fafafa",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f0f4ff"}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#fafafa"}>

                {tab==="B2B"&&<>
                  <td style={{padding:"8px 12px"}}>
                    <p style={{margin:0,fontWeight:600,color:"#1a1c22"}}>{r.name}</p>
                    <p style={{margin:0,fontSize:9.5,color:"#5b616e"}}>{r.email}</p>
                  </td>
                  <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10.5,color:"#2563eb"}}>{r.gstin}</td>
                  <td style={{padding:"8px 12px",fontSize:11}}>
                    <p style={{margin:0,color:"#2e323c"}}>{r.state}</p>
                    <p style={{margin:0,fontSize:9.5,color:"#5b616e"}}>{r.city}</p>
                  </td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,color:"#2e323c"}}>{outFmt(r.credit)}</td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,
                    color:r.out>r.credit*0.8?"#dc2626":r.out>0?"#d97706":"#16a34a"}}>{outFmt(r.out)}</td>
                  <td style={{padding:"8px 12px"}}>
                    <p style={{margin:0,fontSize:11,color:"#2e323c"}}>{r.contact}</p>
                    <p style={{margin:0,fontSize:9.5,color:"#5b616e"}}>{r.mobile}</p>
                  </td>
                </>}

                {tab==="B2C"&&<>
                  <td style={{padding:"8px 12px"}}>
                    <p style={{margin:0,fontWeight:600,color:"#1a1c22"}}>{r.name}</p>
                    <p style={{margin:0,fontSize:9.5,color:"#5b616e"}}>{r.email}</p>
                  </td>
                  <td style={{padding:"8px 12px",fontSize:11}}>
                    <p style={{margin:0,color:"#2e323c"}}>{r.country}</p>
                    <p style={{margin:0,fontSize:9.5,color:"#5b616e"}}>{r.city}</p>
                  </td>
                  <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:11,
                    color:"#2563eb",fontWeight:600}}>{r.passport||"—"}</td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,color:"#2e323c"}}>{outFmt(r.credit)}</td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,
                    color:r.out>0?"#d97706":"#16a34a"}}>{outFmt(r.out)}</td>
                  <td style={{padding:"8px 12px"}}>
                    <p style={{margin:0,fontSize:11,color:"#2e323c"}}>{r.name}</p>
                    <p style={{margin:0,fontSize:9.5,color:"#5b616e"}}>{r.mobile}</p>
                  </td>
                </>}

                {tab==="B2E"&&<>
                  <td style={{padding:"8px 12px"}}>
                    <p style={{margin:0,fontWeight:600,color:"#1a1c22"}}>{r.empAcct}</p>
                    <p style={{margin:0,fontSize:9.5,color:"#5b616e"}}>{r.email}</p>
                  </td>
                  <td style={{padding:"8px 12px"}}>
                    <p style={{margin:0,fontSize:11,color:"#2e323c",fontWeight:600}}>{r.company}</p>
                    <p style={{margin:0,fontSize:9,fontFamily:"monospace",color:"#2563eb"}}>{r.compGstin}</p>
                  </td>
                  <td style={{padding:"8px 12px",color:"#5b616e",fontSize:11}}>{r.dept}</td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,color:"#2e323c"}}>{outFmt(r.credit)}</td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,
                    color:r.out>r.credit*0.5?"#dc2626":r.out>0?"#d97706":"#16a34a"}}>{outFmt(r.out)}</td>
                  <td style={{padding:"8px 12px"}}>
                    <p style={{margin:0,fontSize:11,color:"#2e323c"}}>{r.adminContact}</p>
                    <p style={{margin:0,fontSize:9.5,color:"#5b616e"}}>{r.mobile}</p>
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
            <tfoot><tr style={{background:"#f9fafb",borderTop:"2px solid #cdd1d8"}}>
              <td colSpan={3} style={{padding:"8px 12px",fontWeight:700,fontSize:11,color:"#2e323c"}}>
                {filtered.length} {tab} customer{filtered.length!==1?"s":""}
                {search&&` matching "${search}"`}
              </td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#2e323c"}}>
                {outFmt(filtered.reduce((s,r)=>s+r.credit,0))}
              </td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,
                color:filtered.some(r=>r.out>0)?"#d97706":"#16a34a"}}>
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
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",
              position:"sticky",top:0,background:"#fff",zIndex:1,
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:10.5,padding:"3px 9px",borderRadius:999,
                  fontWeight:800,background:cfg.bg,color:cfg.color}}>{tab}</span>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22"}}>
                  {cur.data.some(d=>d.id===editRec.id)?"Edit":"New"} {cfg.label.split("—")[0].trim()} Customer
                </p>
              </div>
              <button onClick={()=>{setModal(false);setEditRec(null);}}
                style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5b616e"}}>✕</button>
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
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
                  <FL label="State"><input value={editRec.state||""} onChange={e=>set({state:e.target.value})} style={inp} placeholder="Maharashtra"/></FL>
                  <FL label="City"><input value={editRec.city||""} onChange={e=>set({city:e.target.value})} style={inp} placeholder="Mumbai"/></FL>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
                  <FL label="Contact person"><input value={editRec.contact||""} onChange={e=>set({contact:e.target.value})} style={inp}/></FL>
                  <FL label="Mobile"><input value={editRec.mobile||""} onChange={e=>set({mobile:e.target.value})} style={inp}/></FL>
                </div>
                <FL label="Email"><input type="email" value={editRec.email||""} onChange={e=>set({email:e.target.value})} style={inp}/></FL>
                <FL label="Credit limit (INR)"><input type="number" value={editRec.credit||0} onChange={e=>set({credit:+e.target.value})} style={inp}/></FL>
                <div style={{padding:"9px 12px",borderRadius:8,background:"#e8f0ff",
                  border:"1px solid #B5D4F4",fontSize:9.5,color:"#2563eb",fontWeight:600}}>
                  B2B Invoice rule: Tax Invoice must carry buyer GSTIN. Filed invoice-wise in GSTR-1 B2B table. Buyer can claim ITC.
                </div>
              </div>
            )}

            {/* B2C FORM */}
            {tab==="B2C"&&(
              <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
                <FL label="Customer full name"><input value={editRec.name||""} onChange={e=>set({name:e.target.value})} style={inp} placeholder="e.g. ABC Corp"/></FL>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
                  <FL label="Country"><input value={editRec.country||""} onChange={e=>set({country:e.target.value})} style={inp} placeholder="India"/></FL>
                  <FL label="City"><input value={editRec.city||""} onChange={e=>set({city:e.target.value})} style={inp}/></FL>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
                  <FL label="Passport number"><input value={editRec.passport||""} onChange={e=>set({passport:e.target.value.toUpperCase()})} style={{...inp,fontFamily:"monospace"}} placeholder="Z1234567"/></FL>
                  <FL label="Date of birth"><input type="date" value={editRec.dob||""} onChange={e=>set({dob:e.target.value})} style={inp}/></FL>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
                  <FL label="Mobile"><input value={editRec.mobile||""} onChange={e=>set({mobile:e.target.value})} style={inp}/></FL>
                  <FL label="Email"><input type="email" value={editRec.email||""} onChange={e=>set({email:e.target.value})} style={inp}/></FL>
                </div>
                <FL label="Credit limit"><input type="number" value={editRec.credit||0} onChange={e=>set({credit:+e.target.value})} style={inp}/></FL>
                <div style={{padding:"9px 12px",borderRadius:8,background:"#e8f6ed",
                  border:"1px solid #bfe6cd",fontSize:9.5,color:"#16a34a",fontWeight:600}}>
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
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
                  <FL label="Department / Division">
                    <input value={editRec.dept||""} onChange={e=>set({dept:e.target.value})} style={inp} placeholder="All Departments"/>
                  </FL>
                  <FL label="City / Location">
                    <input value={editRec.city||""} onChange={e=>set({city:e.target.value})} style={inp}/>
                  </FL>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
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
                <div style={{padding:"9px 12px",borderRadius:8,background:"#fbeedb",
                  border:"1px solid #f3d9a8",fontSize:9.5,color:"#d97706",fontWeight:600}}>
                  B2E Invoice rule: Tax Invoice with parent company GSTIN. ITC claimed by employer. Maintain separate employee-wise travel ledger under this account.
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",
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
          <thead><tr style={{background:"#1a1c22"}}>
            {["Supplier Name","Type","GSTIN","Currency","TDS Section","Commission",""].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=4?"center":"left",
                color:"#c2a04a",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((s,i)=>(
            <tr key={s.id} style={{borderBottom:"1px solid #dfe2e7",
              background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px",fontWeight:600,color:"#1a1c22"}}>{s.name}</td>
              <td style={{padding:"8px 12px"}}>
                <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:700,
                  background:"#e8f0ff",color:"#2563eb"}}>{s.type}</span>
              </td>
              <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10,
                color:s.gstin?"#2563eb":"#cbd0db"}}>{s.gstin||"Overseas"}</td>
              <td style={{padding:"8px 12px",textAlign:"center",fontSize:11,
                fontWeight:700,color:"#2e323c"}}>{s.currency}</td>
              <td style={{padding:"8px 12px",textAlign:"center",fontSize:10.5,
                color:s.tds?"#d97706":"#cbd0db"}}>{s.tds||"—"}</td>
              <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,
                color:s.commPct>0?"#16a34a":"#cbd0db"}}>
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
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10}}>
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
   6. HOTELS & DMCs
   ════════════════════════════════════════════════════════════════ */
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
          style={{flex:"1 1 280px",minWidth:200,padding:"8px 11px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12.5}}/>
        <button style={{padding:"8px 14px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,cursor:"pointer"}}>📥 Import</button>
        <ExportBtn name="cost-centers" rows={filtered} columns={[{key:"code",label:"Code"},{key:"name",label:"Name"},{key:"parent",label:"Parent"},{key:"manager",label:"Manager"},{key:"desc",label:"Description"},{key:"active",label:"Active"}]}/>
        <button style={{padding:"8px 16px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:6,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>+ Add Cost Center</button>
      </div>
      <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead style={{background:"#f7f8fb"}}>
            <tr>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5b616e",borderBottom:"1px solid #cdd1d8",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Code</th>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5b616e",borderBottom:"1px solid #cdd1d8",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Name</th>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5b616e",borderBottom:"1px solid #cdd1d8",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Parent</th>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5b616e",borderBottom:"1px solid #cdd1d8",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Manager</th>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5b616e",borderBottom:"1px solid #cdd1d8",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Description</th>
              <th style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#5b616e",borderBottom:"1px solid #cdd1d8",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Status</th>
              <th style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#5b616e",borderBottom:"1px solid #cdd1d8",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c=>(
              <tr key={c.code} style={{borderBottom:"1px solid #dfe2e7",background:c.parent==="—"?"#fafbfd":"#fff"}}>
                <td style={{padding:"9px 12px",fontFamily:"monospace",fontWeight:600,color:"#1a1c22"}}>{c.code}</td>
                <td style={{padding:"9px 12px",color:"#1a1c22",fontWeight:c.parent==="—"?700:400,paddingLeft:c.parent==="—"?12:28}}>{c.name}</td>
                <td style={{padding:"9px 12px",color:"#5b616e",fontFamily:"monospace"}}>{c.parent}</td>
                <td style={{padding:"9px 12px",color:"#1a1c22"}}>{c.manager}</td>
                <td style={{padding:"9px 12px",color:"#5b616e",fontSize:11.5}}>{c.desc}</td>
                <td style={{padding:"9px 12px",textAlign:"center"}}><span style={{padding:"2px 7px",background:c.active?"#e8f6ed":"#fbe9e9",color:c.active?"#16a34a":"#dc2626",borderRadius:3,fontSize:10.5,fontWeight:600}}>{c.active?"Active":"Inactive"}</span></td>
                <td style={{padding:"9px 12px",textAlign:"center"}}>
                  <button style={{padding:"3px 8px",background:"transparent",border:"1px solid #c2a04a",color:"#c2a04a",borderRadius:4,fontSize:10.5,cursor:"pointer",fontWeight:600}}>Edit</button>
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
  const inp = {padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,width:"100%"};
  const labelStyle = {fontSize:11,color:"#5b616e",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:4,display:"block"};
  const CMDLabel = ({label:l,children}) => <div><label style={labelStyle}>{l}</label>{children}</div>;

  return (
    <PHASE2_Page title="Customer Master — Detail View"
      subtitle="Universal 10-tab pattern · applies to all party masters (Customers, Suppliers, Sub-agents, Employees)"
      toolbar={<>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11.5,color:"#5b616e",cursor:"pointer",padding:"5px 10px",background:active?"#e8f6ed":"#fbe9e9",borderRadius:5}}>
          <input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>
          <span style={{fontWeight:700,color:active?"#16a34a":"#dc2626"}}>{active?"Active":"Inactive"}</span>
        </label>
        <button style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,fontSize:11.5,cursor:"pointer",fontWeight:600,color:"#5b616e"}}>Merge with…</button>
        <button onClick={()=>setShowDupWarning(!showDupWarning)} style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,fontSize:11.5,cursor:"pointer",fontWeight:600,color:"#5b616e"}}>Check Duplicates</button>
        <button style={{padding:"7px 14px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>💾 Save</button>
      </>}>

      {showDupWarning && (
        <div style={{padding:12,background:"#fbeedb",border:"1px solid #ffeaa7",borderLeft:"3px solid #d97706",borderRadius:6,marginBottom:14}}>
          <p style={{margin:0,fontSize:12,color:"#d97706",fontWeight:700}}>⚠ 2 possible duplicates detected</p>
          <div style={{marginTop:6,fontSize:11,color:"#d97706"}}>
            • "L &amp; T Limited" (CUST-BOM-00098) — 87% match · last txn 2024-12-15<br/>
            • "L T Group" (CUST-AMD-00012) — 72% match · last txn 2023-08-22
          </div>
          <div style={{marginTop:8,display:"flex",gap:8}}>
            <button style={{padding:"4px 10px",background:"#d97706",color:"#fff",border:"none",borderRadius:4,fontSize:10.5,fontWeight:700,cursor:"pointer"}}>Open Merge Tool</button>
            <button onClick={()=>setShowDupWarning(false)} style={{padding:"4px 10px",background:"transparent",border:"1px solid #d97706",color:"#d97706",borderRadius:4,fontSize:10.5,fontWeight:700,cursor:"pointer"}}>Dismiss</button>
          </div>
        </div>
      )}

      <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,overflow:"hidden"}}>
        <div style={{display:"flex",borderBottom:"1px solid #cdd1d8",overflowX:"auto",background:"#fafbfd"}}>
          {tabs.map(t=><button key={t.key} onClick={()=>setTab(t.key)} style={tabBtnStyle(tab===t.key)}>{t.label}</button>)}
        </div>

        <div style={{padding:18,minHeight:420}}>
          {tab==="basic" && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:14}}>
              <CMDLabel label="Customer Code"><input style={{...inp,fontFamily:"monospace"}} defaultValue="CUST-BOM-00142"/></CMDLabel>
              <CMDLabel label="Customer Name"><input style={inp} defaultValue=""/></CMDLabel>
              <CMDLabel label="Type"><select style={inp}><option>Corporate</option><option>Individual</option><option>Sub-Agent</option><option>Govt / PSU</option></select></CMDLabel>
              <CMDLabel label="Branch"><select style={inp}><option>BOMMB</option><option>BOM</option><option>AMD</option></select></CMDLabel>
              <CMDLabel label="Industry"><select style={inp}><option>Engineering & Construction</option><option>IT/ITES</option><option>Manufacturing</option><option>BFSI</option></select></CMDLabel>
              <CMDLabel label="Credit Limit"><input type="number" style={inp} defaultValue="5000000"/></CMDLabel>
              <CMDLabel label="Credit Days"><input type="number" style={inp} defaultValue="45"/></CMDLabel>
              <CMDLabel label="Default Currency"><select style={inp}>{ACTIVE_CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></CMDLabel>
            </div>
          )}
          {tab==="address" && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22"}}>3 addresses on file</p>
                <button style={{padding:"5px 11px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>+ Add Address</button>
              </div>
              {[{type:"Registered Office",addr:"L&T House, Ballard Estate, Mumbai 400001"},{type:"Billing Address",addr:"L&T Towers, Powai, Mumbai 400072"},{type:"Shipping Address",addr:"L&T HRD Centre, Lonavla 410401"}].map((a,i)=>(
                <div key={i} style={{padding:12,border:"1px solid #cdd1d8",borderRadius:6,marginBottom:8}}>
                  <p style={{margin:0,fontSize:12,fontWeight:700,color:"#1a1c22"}}>{a.type}{i===0&&<span style={{marginLeft:8,padding:"1px 7px",background:"#c2a04a",color:"#1a1c22",borderRadius:3,fontSize:9,fontWeight:700}}>DEFAULT</span>}</p>
                  <p style={{margin:"3px 0 0",fontSize:11.5,color:"#5b616e"}}>{a.addr}</p>
                </div>
              ))}
            </div>
          )}
          {tab==="contact" && (
            <div>
              <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#1a1c22"}}>3 contact persons</p>
              {[].map((c,i)=>(
                <div key={i} style={{padding:10,border:"1px solid #cdd1d8",borderRadius:6,marginBottom:6,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:10,alignItems:"center"}}>
                  <div><p style={{margin:0,fontSize:12,fontWeight:600,color:"#1a1c22"}}>{c.name}</p><p style={{margin:0,fontSize:10.5,color:"#5b616e"}}>{c.role}</p></div>
                  <div style={{fontSize:11,color:"#5b616e"}}>{c.email}</div>
                  <div style={{fontSize:11,color:"#5b616e",fontFamily:"monospace"}}>{c.phone}</div>
                </div>
              ))}
            </div>
          )}
          {tab==="bank" && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:14}}>
              <CMDLabel label="Bank Name"><input style={inp} defaultValue="HDFC Bank"/></CMDLabel>
              <CMDLabel label="Branch"><input style={inp} defaultValue="Ballard Estate, Mumbai"/></CMDLabel>
              <CMDLabel label="Account No."><input style={{...inp,fontFamily:"monospace"}} defaultValue="50100012345678"/></CMDLabel>
              <CMDLabel label="IFSC"><input style={{...inp,fontFamily:"monospace"}} defaultValue="HDFC0000045"/></CMDLabel>
              <CMDLabel label="SWIFT (for intl.)"><input style={{...inp,fontFamily:"monospace"}} defaultValue="HDFCINBB"/></CMDLabel>
              <CMDLabel label="Account Type"><select style={inp}><option>Current</option><option>Savings</option><option>NRE</option><option>NRO</option></select></CMDLabel>
            </div>
          )}
          {tab==="tax" && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:14}}>
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
              <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#1a1c22"}}>4 documents uploaded</p>
              {[{name:"GST Certificate.pdf",size:"285 KB",when:"2024-04-10"},{name:"PAN Card.pdf",size:"142 KB",when:"2024-04-10"},{name:"Cancelled Cheque.pdf",size:"98 KB",when:"2024-04-10"},{name:"Annual Agreement 2026.pdf",size:"1.4 MB",when:"2026-04-01"}].map((d,i)=>(
                <div key={i} style={{padding:10,border:"1px solid #cdd1d8",borderRadius:6,marginBottom:6,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18}}>📎</span>
                  <div style={{flex:1}}><p style={{margin:0,fontSize:12,fontWeight:600,color:"#1a1c22"}}>{d.name}</p><p style={{margin:0,fontSize:10.5,color:"#5b616e"}}>{d.size} · uploaded {d.when}</p></div>
                  <button style={{padding:"3px 10px",background:"transparent",border:"1px solid #cdd1d8",color:"#5b616e",borderRadius:4,fontSize:10.5,cursor:"pointer"}}>View</button>
                  <button style={{padding:"3px 10px",background:"transparent",border:"1px solid #cdd1d8",color:"#5b616e",borderRadius:4,fontSize:10.5,cursor:"pointer"}}>Download</button>
                </div>
              ))}
              <button style={{marginTop:8,padding:"7px 14px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>📤 Upload Document</button>
            </div>
          )}
          {tab==="notes" && (
            <CMDLabel label="Internal Notes (visible only to staff)">
              <textarea rows={10} style={{...inp,fontFamily:"inherit",resize:"vertical"}} defaultValue={"• Premium corporate client since 2019\n• Prefers Premium Economy on long-haul\n• CFO approves > ₹5L bookings\n• Net 45 payment terms, generally on time\n• Annual contract renewed April 2026"}/>
            </CMDLabel>
          )}
          {tab==="history" && (
            <div>
              <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#1a1c22"}}>Last 6 changes (inline audit history)</p>
              {[].map((h,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"6px 0",borderBottom:"1px solid #dfe2e7"}}>
                  <span style={{fontSize:10.5,fontFamily:"monospace",color:"#5b616e",minWidth:120}}>{h.ts}</span>
                  <span style={{fontSize:11.5,fontWeight:600,color:"#1a1c22",minWidth:110}}>{h.user}</span>
                  <span style={{fontSize:11.5,color:"#1a1c22"}}>{h.action}</span>
                </div>
              ))}
            </div>
          )}
          {tab==="linked" && (
            <div>
              <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#1a1c22"}}>Linked vouchers — last 30 days (5 of 142)</p>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
                <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Date</th><th style={RPT_thStyle}>Voucher</th><th style={RPT_thStyle}>Type</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
                <tbody>{[{date:"2026-05-18",vno:"INV-BOM/2026/8741",type:"Tax Invoice",amount:485000,status:"Paid"},{date:"2026-05-15",vno:"RV-BOM/2026/4519",type:"Receipt",amount:485000,status:"Cleared"},{date:"2026-05-08",vno:"INV-BOM/2026/8728",type:"Tax Invoice",amount:142500,status:"Outstanding"},{date:"2026-05-02",vno:"INV-BOM/2026/8721",type:"Tax Invoice",amount:285000,status:"Paid"}].map((r,i)=>(<tr key={i}><td style={RPT_tdStyle}>{r.date}</td><td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:600}}>{r.vno}</td><td style={RPT_tdStyle}>{r.type}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:r.amount<0?"#dc2626":"#1a1c22"}}>{fmtINR(Math.abs(r.amount))}</td><td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:600,background:r.status==="Paid"||r.status==="Cleared"?"#e8f6ed":r.status==="Outstanding"?"#fbeedb":"#e2e3e5",color:r.status==="Paid"||r.status==="Cleared"?"#16a34a":r.status==="Outstanding"?"#d97706":"#383d41"}}>{r.status}</span></td></tr>))}</tbody>
              </table>
            </div>
          )}
          {tab==="custom" && (
            <div>
              <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#1a1c22"}}>Custom fields (configured in Settings → Custom Fields Manager)</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:14}}>
                <CMDLabel label="Account Manager"><input style={inp} defaultValue=""/></CMDLabel>
                <CMDLabel label="Procurement Code (Client side)"><input style={{...inp,fontFamily:"monospace"}} defaultValue="LNT-VEN-04258"/></CMDLabel>
                <CMDLabel label="SLA Tier"><select style={inp}><option>Platinum</option><option>Gold</option><option>Silver</option></select></CMDLabel>
                <CMDLabel label="Loyalty Score"><input type="number" style={inp} defaultValue="92"/></CMDLabel>
                <CMDLabel label="Last Site Visit"><input type="date" style={inp} defaultValue="2026-03-15"/></CMDLabel>
                <CMDLabel label="Next Review Date"><input type="date" style={inp} defaultValue="2026-07-15"/></CMDLabel>
              </div>
              <p style={{margin:"14px 0 0",fontSize:10.5,color:"#5b616e"}}>↗ Manage custom fields in Settings</p>
            </div>
          )}
        </div>
      </div>

      {/* Last-modified footer */}
      <div style={{marginTop:14,padding:"10px 14px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"#5b616e"}}>
        <span>Created by <b style={{color:"#1a1c22"}}>AD</b> on 2024-04-10 12:00</span>
        <span>Last modified by <b style={{color:"#1a1c22"}}>—</b></span>
        <span>Record ID: <span style={{fontFamily:"monospace"}}>CUST-BOM-00142</span></span>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
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
  const statusStyle={"Pending Approval":{bg:"#fbeedb",color:"#d97706"},Approved:{bg:"#e8f6ed",color:"#16a34a"},Rejected:{bg:"#fbe9e9",color:"#dc2626"}};
  return(
    <PHASE2_Page title="Master Data Change Request Queue"
      subtitle="All master-data change requests requiring approval · vendor bank/PAN, credit limits, user permissions, CoA, etc."
      toolbar={<select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}><option value="ALL">All statuses</option>{statuses.map(s=><option key={s}>{s}</option>)}</select>}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,150px),1fr))",gap:10,marginBottom:14}}>
        {[{l:"Pending Approval",v:pending,c:"#d97706"},{l:"Approved (MTD)",v:approved,c:"#16a34a"},{l:"Rejected (MTD)",v:rejected,c:"#dc2626"},{l:"High-Risk Pending",v:MASTER_CHANGE_QUEUE.filter(q=>q.status==="Pending Approval"&&/high/i.test(q.risk||q.riskLevel||q.priority||"")).length,c:"#dc2626"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5b616e",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:k.c}}>{k.v}</p></div>
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
            <tr key={q.id} style={{borderBottom:"1px solid #dfe2e7",background:q.priority==="High"?"#fff5f5":"#fff"}}>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5,color:"#5b616e"}}>{q.id}</td>
              <td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:q.priority==="High"?"#fbe9e9":"#e6e8f1",color:q.priority==="High"?"#dc2626":"#1a1c22",borderRadius:3,fontSize:10.5,fontWeight:700}}>{q.type}</span></td>
              <td style={{...RPT_tdStyle,fontWeight:700}}>{q.entity}</td>
              <td style={{...RPT_tdStyle,fontSize:11,color:"#1a1c22"}}>{q.detail}{q.extraCheck&&<p style={{margin:"2px 0 0",fontSize:10,color:"#dc2626",fontStyle:"italic"}}>⚠ {q.extraCheck}</p>}{q.rejectReason&&<p style={{margin:"2px 0 0",fontSize:10,color:"#dc2626",fontStyle:"italic"}}>Rejected: {q.rejectReason}</p>}</td>
              <td style={{...RPT_tdStyle,fontSize:11}}>{q.requestedBy}<p style={{margin:0,fontSize:10,color:"#5b616e"}}>{q.requestDate}</p></td>
              <td style={{...RPT_tdStyle,fontSize:11,fontWeight:600,color:"#c2a04a"}}>{q.approver}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"3px 9px",borderRadius:3,fontSize:10,fontWeight:700,...(statusStyle[q.status]||{})}}>{q.status}</span>{q.approvedDate&&<p style={{margin:"2px 0 0",fontSize:10,color:"#5b616e"}}>{q.approvedDate}</p>}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}>
                {q.status==="Pending Approval"?(
                  <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                    <button style={{padding:"3px 8px",background:"#16a34a",color:"#fff",border:"none",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>Approve</button>
                    <button style={{padding:"3px 8px",background:"#dc2626",color:"#fff",border:"none",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>Reject</button>
                  </div>
                ):<button style={{padding:"3px 8px",background:"transparent",border:"1px solid #cdd1d8",color:"#5b616e",borderRadius:3,fontSize:10,cursor:"pointer"}}>View Log</button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </PHASE2_Page>
  );
}



/* ════════════════════════════════════════════════════════════════════
   USER MENU + SIGN-OUT  (in TopBar, next to notification bell)
   ════════════════════════════════════════════════════════════════════ */
