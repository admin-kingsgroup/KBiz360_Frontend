/* ════════════════════════════════════════════════════════════════════
   MODULES/MASTERS.JSX
   Auto-generated from KBiz360_v2.jsx · 2884 lines · 25 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { AlertTriangle, Check, Download, Plus, Save, Search, Settings } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ADM_DATA, CASH, CUSTOMERS, FOREX_RATES_DATA, GP_BILLS, NUMBERING_SERIES_DATA } from '../core/data';
import { fmt, fmtINR } from '../core/format';
import { ACM_DATA, APPROVAL_LIMITS_DATA, BANK_ACCOUNTS_DATA, COST_CENTERS_DATA, CURRENCY_DATA, DashboardRouter, MASTER_CHANGE_QUEUE, MASTER_PAGE, MstrModal, MstrShell, PROJECTS_DATA, TAB_Page, TOUR_CODES_DATA, VENDOR_ADVANCES_DATA, _PASSPORTS, cardStyle, tabPanel } from '../core/helpers';
import { useMobile } from '../core/hooks';
import { B, FL, RPT_tdStyle, RPT_thStyle, bc, btnG, btnGh, card, inp, inpStd, tabBtnStyle } from '../core/styles';
import { PHASE2_Page } from '../shell/PHASE2_Page';
import { TopBar } from '../shell/TopBar';

export function MastersForex(){
  const [rates,setRates]=useState(FOREX_RATES_DATA);
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({from:"USD",to:"INR",rate:0,source:"Manual"});
  const CURRENCIES=["USD","AED","GBP","EUR","SGD","KES","TZS","THB","AUD","CAD"];

  const save=()=>{
    const rec={...form,date:new Date().toISOString().slice(0,10)};
    setRates(r=>[rec,...r]);
    setModal(false);
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
        <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Add Rate</button>
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
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
              <td style={{padding:"9px 14px",textAlign:"right",fontSize:10.5,color:"#5a6691",fontVariantNumeric:"tabular-nums"}}>1 {r.to} = {(1/r.rate).toFixed(4)} {r.from}</td>
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
                <FL label="To currency"><select value={form.to} onChange={e=>setForm(f=>({...f,to:e.target.value}))} style={inp}>{["INR","KES","TZS","USD",...CURRENCIES].map(c=><option key={c}>{c}</option>)}</select></FL>
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

export function Supplier360({branch}){
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;

  const ALL_SUPPLIERS=[...new Set(GP_BILLS.filter(b=>!brCode||b.branch===brCode).map(b=>b.supplier))];
  const [supplier,setSupplier]=useState(ALL_SUPPLIERS[0]||"BSP India");

  const suppBills=GP_BILLS.filter(b=>b.supplier===supplier&&(!brCode||b.branch===brCode));
  const totCost=suppBills.reduce((s,b)=>s+b.cost,0);
  const totRev =suppBills.reduce((s,b)=>s+b.sell,0);
  const totGP  =totRev-totCost;
  const gpPct  =totRev>0?+(totGP/totRev*100).toFixed(1):0;
  const outstanding=Math.round(totCost*0.20);
  const mods=[...new Set(suppBills.map(b=>b.mod))];
  const branches=[...new Set(suppBills.map(b=>b.branch))];

  /* ADMs/ACMs for this supplier */
  const suppADMs=ADM_DATA.filter(a=>a.airline===supplier||a.airline.includes(supplier.split(" ")[0]));
  const suppACMs=ACM_DATA.filter(a=>a.airline===supplier||a.airline.includes(supplier.split(" ")[0]));
  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");

  return (
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🏢</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Supplier 360° View</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Complete supplier profile — purchases, outstanding, ADMs, ACMs, performance</p>
          </div>
        </div>
        <select value={supplier} onChange={e=>setSupplier(e.target.value)} style={{...inp,width:240,minHeight:32,fontSize:11}}>
          {ALL_SUPPLIERS.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Profile card */}
      <div style={{...card,marginBottom:14,background:"linear-gradient(135deg,#0d1326,#185FA5)",border:"none"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12}}>
          {[
            {l:"Total Purchases",v:f(totCost)},{l:"GP Generated",v:f(totGP)},
            {l:"Avg GP%",v:`${gpPct}%`},{l:"Bookings",v:String(suppBills.length)},
            {l:"Outstanding Payable",v:f(outstanding)},{l:"ADMs Raised",v:String(suppADMs.length)},
          ].map((k,i)=>(
            <div key={i} style={{padding:"10px 14px",borderRadius:9,background:"rgba(255,255,255,0.1)"}}>
              <p style={{margin:0,fontSize:9,color:"rgba(255,255,255,0.6)",textTransform:"uppercase",fontWeight:700}}>{k.l}</p>
              <p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:"#fff"}}>{k.v}</p>
            </div>
          ))}
        </div>
        <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
          <p style={{margin:0,fontSize:10,color:"rgba(255,255,255,0.6)"}}>Modules:</p>
          {mods.map(m=><span key={m} style={{padding:"2px 9px",borderRadius:999,background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:10,fontWeight:700}}>{m}</span>)}
          <p style={{margin:"0 0 0 12px",fontSize:10,color:"rgba(255,255,255,0.6)"}}>Branches:</p>
          {branches.map(b=><span key={b} style={{padding:"2px 9px",borderRadius:999,background:"rgba(212,164,55,0.3)",color:"#d4a437",fontSize:10,fontWeight:700}}>{b}</span>)}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
        {/* Purchase history */}
        <div>
          <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Purchase History ({suppBills.length} bookings)</p>
          <div style={{...card,padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{background:"#0d1326"}}>
                {["Voucher No.","Date","Module","Destination","Cost","GP","GP%"].map((h,i)=>(
                  <th key={i} style={{padding:"8px 10px",textAlign:i>=4?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{suppBills.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10).map((b,i)=>{
                const gp=b.sell-b.cost;const gpPct2=+(gp/b.sell*100).toFixed(1);
                return (
                  <tr key={b.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:9.5,color:"#185FA5"}}>{b.id}</td>
                    <td style={{padding:"7px 10px",color:"#5a6691"}}>{b.date}</td>
                    <td style={{padding:"7px 10px"}}><span style={{fontSize:9.5,padding:"2px 6px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{b.mod}</span></td>
                    <td style={{padding:"7px 10px",color:"#384677"}}>{b.dest}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(b.cost)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:gp>0?"#27500A":"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{f(gp)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}><span style={{fontSize:9.5,padding:"2px 6px",borderRadius:999,fontWeight:800,background:gpPct2>=12?"#EAF3DE":"#FAEEDA",color:gpPct2>=12?"#27500A":"#854F0B"}}>{gpPct2}%</span></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>

        {/* ADMs / ACMs */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{...card,borderTop:"3px solid #A32D2D"}}>
            <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#A32D2D"}}>ADMs ({suppADMs.length})</p>
            {suppADMs.length===0?<p style={{fontSize:11,color:"#5a6691"}}>No ADMs from this supplier</p>
              :suppADMs.map(a=>(
                <div key={a.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f3f4f8",fontSize:10.5}}>
                  <div><p style={{margin:0,fontFamily:"monospace",fontSize:9.5,color:"#A32D2D"}}>{a.id}</p><p style={{margin:0,fontSize:9,color:"#5a6691"}}>{a.reasonCode} — {a.date}</p></div>
                  <div style={{textAlign:"right"}}><p style={{margin:0,fontWeight:700,color:"#A32D2D"}}>{a.currency}{a.amount.toLocaleString()}</p><span style={{fontSize:9,padding:"1px 5px",borderRadius:999,background:"#FCEBEB",color:"#A32D2D",fontWeight:700}}>{a.status}</span></div>
                </div>
              ))
            }
          </div>
          <div style={{...card,borderTop:"3px solid #27500A"}}>
            <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#27500A"}}>ACMs ({suppACMs.length})</p>
            {suppACMs.length===0?<p style={{fontSize:11,color:"#5a6691"}}>No ACMs from this supplier</p>
              :suppACMs.map(a=>(
                <div key={a.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f3f4f8",fontSize:10.5}}>
                  <div><p style={{margin:0,fontFamily:"monospace",fontSize:9.5,color:"#27500A"}}>{a.id}</p><p style={{margin:0,fontSize:9,color:"#5a6691"}}>{a.reasonCode} — {a.date}</p></div>
                  <div style={{textAlign:"right"}}><p style={{margin:0,fontWeight:700,color:"#27500A"}}>+{a.currency}{a.amount.toLocaleString()}</p><span style={{fontSize:9,padding:"1px 5px",borderRadius:999,background:"#EAF3DE",color:"#27500A",fontWeight:700}}>{a.status}</span></div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
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

export function MastersSubAgents(){
  const mob=useMobile();
  const [modal,setModal]=useState(false);
  const [sel,setSel]=useState(null);
  const [form,setForm]=useState({name:"",iata:"",email:"",phone:"",type:"Retail",city:"",currency:"INR",
    commType:"Percentage of GP",commRate:10,creditLimit:200000,creditDays:30,paymentCycle:"Monthly"});

  const SUBAGENTS=[
    {id:"SA001",name:"Skyline Travels",        iata:"14-3 88888 1",email:"info@skyline.in",   phone:"+91 22 1234 5678",type:"Retail",   city:"Mumbai",  currency:"INR",commType:"% of GP",  commRate:15,creditLimit:500000,creditDays:30,paymentCycle:"Monthly",revYTD:840000,gpYTD:126000,books:24,active:true,joined:"2021-06-01",territory:"Mumbai, Thane"},
    {id:"SA002",name:"Global Wings",            iata:"",            email:"gw@global.in",     phone:"+91 79 2345 6789",type:"Corporate",city:"Ahmedabad",currency:"INR",commType:"Fixed ₹",  commRate:1200,creditLimit:300000,creditDays:45,paymentCycle:"Monthly",revYTD:560000,gpYTD:67200,books:18,active:true,joined:"2022-03-15",territory:"Gujarat"},
    {id:"SA003",name:"Paradise Holidays",       iata:"14-3 77777 2",email:"paradise@ph.in",   phone:"+91 11 3456 7890",type:"Retail",   city:"Delhi",   currency:"INR",commType:"% of sell",commRate:8, creditLimit:400000,creditDays:30,paymentCycle:"Bi-weekly",revYTD:1120000,gpYTD:89600,books:31,active:true,joined:"2020-11-01",territory:"Delhi NCR"},
    {id:"SA004",name:"Nairobi Getaways Ltd.",   iata:"",            email:"nbo@nget.co.ke",   phone:"+254 722 345678",type:"Local",    city:"Nairobi",currency:"KES",commType:"% of GP",  commRate:20,creditLimit:1500000,creditDays:30,paymentCycle:"Monthly",revYTD:3200000,gpYTD:640000,books:15,active:true,joined:"2023-01-10",territory:"Nairobi CBD"},
    {id:"SA005",name:"Online Deals (OTA)",      iata:"",            email:"ops@onlinedeals.in",phone:"+91 80 4567 8901",type:"Online",  city:"Bangalore",currency:"INR",commType:"% of sell",commRate:6, creditLimit:1000000,creditDays:15,paymentCycle:"Weekly",revYTD:2340000,gpYTD:140400,books:67,active:true,joined:"2022-08-01",territory:"Pan India Online"},
  ];

  const TYPE_CLR={Retail:"#185FA5",Corporate:"#854F0B",Local:"#27500A",Online:"#1D9E75"};
  const TYPE_BG ={Retail:"#E6F1FB",Corporate:"#FAEEDA",Local:"#EAF3DE",Online:"#EAF3DE"};
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");

  return (
    <div style={{padding:"12px 10px",maxWidth:1300,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🤝</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Sub-Agents Master</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Commission structure · Performance · Credit limits · Payment cycles</p>
          </div>
        </div>
        <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Add Sub-Agent</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        {[{l:"Sub-Agents",v:String(SUBAGENTS.length),c:"#384677",bg:"#f3f4f8"},
          {l:"Active",v:String(SUBAGENTS.filter(s=>s.active).length),c:"#27500A",bg:"#EAF3DE"},
          {l:"Total YTD Revenue",v:f(SUBAGENTS.reduce((s,a)=>s+a.revYTD,0)),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Commission Paid YTD",v:f(SUBAGENTS.reduce((s,a)=>s+(a.commType.includes("%")?a.gpYTD*(a.commRate/100):a.books*a.commRate),0)),c:"#854F0B",bg:"#FAEEDA"},
          {l:"Total Bookings",v:String(SUBAGENTS.reduce((s,a)=>s+a.books,0)),c:"#1D9E75",bg:"#EAF3DE"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:12}}>
        {SUBAGENTS.map(s=>(
          <div key={s.id} onClick={()=>setSel(sel?.id===s.id?null:s)}
            style={{...card,cursor:"pointer",borderTop:`4px solid ${TYPE_CLR[s.type]||"#384677"}`,
              border:sel?.id===s.id?`2px solid ${TYPE_CLR[s.type]}`:"1px solid #e1e3ec",
              boxShadow:sel?.id===s.id?"0 4px 16px rgba(0,0,0,0.1)":"none"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>{s.name}</p>
                <p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691"}}>{s.city} · {s.type} · {s.iata||"Non-IATA"}</p>
              </div>
              <span style={{fontSize:9.5,padding:"2px 9px",borderRadius:999,fontWeight:700,background:TYPE_BG[s.type],color:TYPE_CLR[s.type]}}>{s.type}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              <div style={{textAlign:"center",padding:"10px 16px",background:"#f9fafb",borderRadius:8,flex:1}}><div style={{fontSize:11,color:"#5a6691",marginBottom:4}}>YTD Revenue</div><div style={{fontWeight:700,color:"#0d1326"}}>{f(s.revYTD)}</div></div><div style={{textAlign:"center",padding:"10px 16px",background:"#f9fafb",borderRadius:8,flex:1}}><div style={{fontSize:11,color:"#5a6691",marginBottom:4}}>YTD GP</div><div style={{fontWeight:700,color:"#1D9E75"}}>{f(s.gpYTD)}</div></div><div style={{textAlign:"center",padding:"10px 16px",background:"#f9fafb",borderRadius:8,flex:1}}><div style={{fontSize:11,color:"#5a6691",marginBottom:4}}>Bookings</div><div style={{fontWeight:700,color:"#0d1326"}}>{String(s.bookings)}</div></div><div style={{textAlign:"center",padding:"10px 16px",background:"#f9fafb",borderRadius:8,flex:1}}><div style={{fontSize:11,color:"#5a6691",marginBottom:4}}>Outstanding</div><div style={{fontWeight:700,color:"#A32D2D"}}>{f(s.outstanding)}</div></div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10.5,color:"#5a6691",borderTop:"1px solid #f3f4f8",paddingTop:8}}>
              <span>Commission: <b style={{color:"#0d1326"}}>{s.commType.includes("%")?`${s.commRate}%`:`₹${s.commRate}/booking`}</b></span>
              <span>Cycle: <b style={{color:"#0d1326"}}>{s.paymentCycle}</b></span>
              <span>Credit: <b style={{color:"#0d1326"}}>{s.creditDays}d</b></span>
            </div>
            {sel?.id===s.id&&(
              <div style={{marginTop:12,padding:"10px 12px",borderRadius:8,background:"#f3f4f8"}}>
                {[
                  {l:"IATA No.",v:s.iata||"Non-IATA"},
                  {l:"Email",v:s.email},{l:"Phone",v:s.phone},
                  {l:"Territory",v:s.territory},{l:"Currency",v:s.currency},
                  {l:"Credit Limit",v:f(s.creditLimit)},{l:"Joined",v:s.joined},
                ].map((r,i)=>(
                  <div key={i} style={{display:"flex",gap:8,padding:"4px 0",borderBottom:"1px solid #e1e3ec",fontSize:10.5}}>
                    <span style={{color:"#5a6691",minWidth:100,flexShrink:0}}>{r.l}</span>
                    <span style={{color:"#0d1326",fontWeight:500}}>{r.v}</span>
                  </div>
                ))}
                <div style={{marginTop:8,display:"flex",gap:6}}>
                  <button style={{...btnG,fontSize:10,padding:"4px 12px"}}>Edit</button>
                  <button style={{...btnGh,fontSize:10,padding:"4px 12px"}}>Statement</button>
                  <button style={{...btnGh,fontSize:10,padding:"4px 12px"}}>Pay Commission</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:600,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Add Sub-Agent</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Agency name"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp}/></FL>
                <FL label="Type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}><option>Retail</option><option>Corporate</option><option>Local</option><option>Online</option></select></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="IATA number (if any)"><input value={form.iata} onChange={e=>setForm(f=>({...f,iata:e.target.value}))} style={{...inp,fontFamily:"monospace"}} placeholder="14-3 XXXXX X"/></FL>
                <FL label="City / Territory"><input value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} style={inp}/></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Email"><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} style={inp}/></FL>
                <FL label="Phone"><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} style={inp}/></FL>
              </div>
              <div style={{...card,background:"#f9fafb",padding:"12px"}}>
                <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Commission Structure</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  <FL label="Commission type"><select value={form.commType} onChange={e=>setForm(f=>({...f,commType:e.target.value}))} style={inp}>
                    <option>Percentage of GP</option><option>Percentage of sell price</option><option>Fixed ₹ per booking</option>
                  </select></FL>
                  <FL label={form.commType==="Fixed ₹ per booking"?"Fixed ₹/booking":"Rate %"}><input type="number" value={form.commRate} onChange={e=>setForm(f=>({...f,commRate:+e.target.value}))} style={inp}/></FL>
                  <FL label="Payment cycle"><select value={form.paymentCycle} onChange={e=>setForm(f=>({...f,paymentCycle:e.target.value}))} style={inp}><option>Weekly</option><option>Bi-weekly</option><option>Monthly</option><option>Per booking</option></select></FL>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:8}}>
                  <FL label="Credit limit (₹)"><input type="number" value={form.creditLimit} onChange={e=>setForm(f=>({...f,creditLimit:+e.target.value}))} style={inp}/></FL>
                  <FL label="Credit days"><input type="number" value={form.creditDays} onChange={e=>setForm(f=>({...f,creditDays:+e.target.value}))} style={inp}/></FL>
                  <FL label="Currency"><select value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))} style={inp}><option>INR</option><option>KES</option><option>TZS</option><option>USD</option></select></FL>
                </div>
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={()=>setModal(false)} style={btnG}>Add Sub-Agent</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TDS / TCS REGISTER — COMPLETE REBUILD  /tax/tds
   Full register with 26Q/27EQ data preparation
   ════════════════════════════════════════════════════════════════ */

export function VendorTermsMaster({branch}){
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [terms,setTerms]=useState([
    {id:"VT001",supplier:"BSP India",type:"BSP",terms:"Weekly — every Monday",days:7,dueAmt:214000,dueDate:"2026-05-20",tds:"194H",tdsRate:5,status:"Due Soon"},
    {id:"VT002",supplier:"Air India",type:"Airline",terms:"30 days from invoice",days:30,dueAmt:88000,dueDate:"2026-06-06",tds:"None",tdsRate:0,status:"Upcoming"},
    {id:"VT003",supplier:"Emirates GSA",type:"Airline",terms:"30 days from invoice",days:30,dueAmt:155000,dueDate:"2026-06-07",tds:"None",tdsRate:0,status:"Upcoming"},
    {id:"VT004",supplier:"Bali Tours DMC",type:"DMC",terms:"50% advance, balance 7d before departure",days:7,dueAmt:107000,dueDate:"2026-06-03",tds:"194C",tdsRate:2,status:"Upcoming"},
    {id:"VT005",supplier:"Island Escapes",type:"DMC",terms:"Full payment on confirmation",days:0,dueAmt:96000,dueDate:"2026-05-21",tds:"194C",tdsRate:2,status:"Due Soon"},
    {id:"VT006",supplier:"VFS Global",type:"Visa Agency",terms:"Immediate on application",days:0,dueAmt:16800,dueDate:"2026-05-19",tds:"194J",tdsRate:10,status:"Due Today"},
    {id:"VT007",supplier:"TATA AIG",type:"Insurer",terms:"Immediate on policy issue",days:0,dueAmt:6900,dueDate:"2026-05-20",tds:"194D",tdsRate:5,status:"Due Soon"},
    {id:"VT008",supplier:"KQ Direct",type:"Airline",terms:"Weekly BSP settlement",days:7,dueAmt:760000,dueDate:"2026-05-26",tds:"None",tdsRate:0,status:"Upcoming"},
  ]);
  const TODAY="2026-05-19";
  const daysLeft=d=>Math.ceil((new Date(d)-new Date(TODAY))/(1000*60*60*24));
  const totDue=terms.filter(t=>daysLeft(t.dueDate)<=7).reduce((s,t)=>s+t.dueAmt,0);
  const totTds=terms.filter(t=>t.tds!=="None").reduce((s,t)=>s+Math.round(t.dueAmt*t.tdsRate/100),0);
  const STATUS_CLR={"Due Today":"#A32D2D","Due Soon":"#854F0B","Upcoming":"#27500A","Overdue":"#7B1F1F"};
  const STATUS_BG={"Due Today":"#FCEBEB","Due Soon":"#FAEEDA","Upcoming":"#EAF3DE","Overdue":"#FCEBEB"};
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>⏰</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Vendor Payment Terms</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{f(totDue)} due in 7 days · TDS to deduct: {f(totTds)}</p>
        </div>
      </div>
      {terms.filter(t=>daysLeft(t.dueDate)<=0).length>0&&(
        <div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600,display:"flex",gap:8}}>
          <AlertTriangle size={14}/> Overdue payments — process immediately to avoid supplier suspension
        </div>
      )}
      <div style={{...card,padding:0,overflow:"hidden"}}>
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
  const [modal,setModal]=useState(false);
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
          "KCB Bank CA — NBO","Equity Bank CA — NBO",
          "CRDB Bank — DAR","Rawbank — FBM",
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
          "VAT Payable — Kenya (16%)","VAT Payable — Tanzania (18%)","VAT Payable — DRC (16%)",
          "WHT Payable — Kenya","WHT Payable — Tanzania",
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
          <div key={g.id} style={{...card,padding:0,overflow:"hidden"}}>
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
  const [modal,setModal]=useState(false);
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("All");
  const ledgers=[
    {id:1, name:"HDFC Bank CA — Nariman Point",group:"Current Assets",nature:"Dr",ob:2480000,currency:"INR",active:true},
    {id:2, name:"ICICI Bank CA — Fort",         group:"Current Assets",nature:"Dr",ob:680000, currency:"INR",active:true},
    {id:3, name:"Cash in Hand",                  group:"Current Assets",nature:"Dr",ob:45000,  currency:"INR",active:true},
    {id:4, name:"Flight Ticket Sales",            group:"Sales Accounts",nature:"Cr",ob:0,      currency:"INR",active:true},
    {id:5, name:"Holiday Package Sales",          group:"Sales Accounts",nature:"Cr",ob:0,      currency:"INR",active:true},
    {id:6, name:"Hotel Sales",                    group:"Sales Accounts",nature:"Cr",ob:0,      currency:"INR",active:true},
    {id:7, name:"Flight Ticket Purchase",         group:"Purchase Accounts",nature:"Dr",ob:0,   currency:"INR",active:true},
    {id:8, name:"BSP India Payable",              group:"Current Liabilities",nature:"Cr",ob:320000,currency:"INR",active:true},
    {id:9, name:"Output CGST",                    group:"Duties & Taxes",nature:"Cr",ob:0,      currency:"INR",active:true},
    {id:10,name:"Output SGST",                    group:"Duties & Taxes",nature:"Cr",ob:0,      currency:"INR",active:true},
    {id:11,name:"Output IGST",                    group:"Duties & Taxes",nature:"Cr",ob:0,      currency:"INR",active:true},
    {id:12,name:"Input CGST",                     group:"Current Assets",nature:"Dr",ob:0,      currency:"INR",active:true},
    {id:13,name:"Input SGST",                     group:"Current Assets",nature:"Dr",ob:0,      currency:"INR",active:true},
    {id:14,name:"TCS Payable",                    group:"Duties & Taxes",nature:"Cr",ob:0,      currency:"INR",active:true},
    {id:15,name:"Sharma Enterprises Pvt. Ltd.",   group:"Sundry Debtors",nature:"Dr",ob:215000, currency:"INR",active:true},
    {id:16,name:"Mehta & Sons",                   group:"Sundry Debtors",nature:"Dr",ob:180000, currency:"INR",active:true},
    {id:17,name:"Proprietor Capital",             group:"Capital Account",nature:"Cr",ob:5000000,currency:"INR",active:true},
    {id:18,name:"Salaries & Wages",               group:"Indirect Expenses",nature:"Dr",ob:0,   currency:"INR",active:true},
    {id:19,name:"KCB Bank — Nairobi",             group:"Current Assets",nature:"Dr",ob:2240000,currency:"KES",active:true},
    {id:20,name:"Rawbank USD — Lubumbashi",        group:"Current Assets",nature:"Dr",ob:58000,  currency:"USD",active:true},
  ];
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
      <div style={{...card,padding:0,overflow:"hidden"}}>
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
            <FL label="Currency"><select style={inp}><option>INR</option><option>KES</option><option>TZS</option><option>USD</option></select></FL>
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
  const [modal,setModal]=useState(false);
  const [editRec,setEditRec]=useState(null);

  /* ══ SEPARATE DATA STORES — never mixed ══════════════════════════
     B2B : Registered businesses with GSTIN
     B2C : Individuals / unregistered buyers
     B2E : Corporate employee travel accounts
     ═══════════════════════════════════════════════════════════════ */

  const [b2bData,setB2bData]=useState([
    {id:1,name:"Sharma Enterprises Pvt. Ltd.",gstin:"27AABCS1234L1Z5",state:"Maharashtra",city:"Mumbai",    credit:500000,out:215000,contact:"Rajiv Sharma",   mobile:"+91 98201 11111",email:"rajiv@sharma.co",   pan:"AABCS1234L",active:true},
    {id:2,name:"Mehta & Sons",                gstin:"27AABCM5678K1Z2",state:"Maharashtra",city:"Mumbai",    credit:300000,out:180000,contact:"Anil Mehta",     mobile:"+91 98201 22222",email:"anil@mehta.in",     pan:"AABCM5678K",active:true},
    {id:3,name:"Apex Pharma Ltd.",             gstin:"27AABCA9012J1Z3",state:"Maharashtra",city:"Mumbai",    credit:400000,out:98000, contact:"HR Manager",     mobile:"+91 98201 33333",email:"travel@apex.com",   pan:"AABCA9012J",active:true},
    {id:4,name:"Globex Consulting",            gstin:"27AABCG3456H1Z4",state:"Maharashtra",city:"Mumbai",    credit:200000,out:340000,contact:"Rohan",     mobile:"+91 98201 44444",email:"priya@globex.in",   pan:"AABCG3456H",active:true},
    {id:5,name:"Nexus Industries",             gstin:"27AABCN7890F1Z5",state:"Maharashtra",city:"Pune",      credit:250000,out:85000, contact:"Vikram Nair",    mobile:"+91 98201 55555",email:"vikram@nexus.in",   pan:"AABCN7890F",active:true},
    {id:6,name:"TechCorp Solutions Pvt. Ltd.", gstin:"27AABCT2345E1Z6",state:"Karnataka",  city:"Bangalore", credit:600000,out:185000,contact:"Travel Admin",   mobile:"+91 80 4000 1234",email:"admin@techcorp.in",pan:"AABCT2345E",active:true},
    {id:7,name:"Patel Exports Ltd.",           gstin:"24AABCP6789D1Z7",state:"Gujarat",    city:"Ahmedabad", credit:350000,out:72000, contact:"Jayesh Patel",   mobile:"+91 98254 11111",email:"jayesh@patelx.in",  pan:"AABCP6789D",active:true},
    {id:8,name:"Gujarat Ceramics Ltd.",        gstin:"24AABCG1357H1Z8",state:"Gujarat",    city:"Ahmedabad", credit:280000,out:0,     contact:"Nilesh Modi",    mobile:"+91 98254 22222",email:"nilesh@gujceram.in",pan:"AABCG1357H",active:true},
  ]);

  const [b2cData,setB2cData]=useState([
    {id:1,name:"Rohan",         country:"India",   city:"Mumbai",    passport:"Z1234567",mobile:"+91 98201 66666",email:"kavita@gmail.com",  dob:"1985-03-12",credit:50000, out:8420, active:true},
    {id:2,name:"Rajiv Sharma",        country:"India",   city:"Mumbai",    passport:"Z1234568",mobile:"+91 98201 77777",email:"rajiv.p@gmail.com",  dob:"1978-07-22",credit:25000, out:0,    active:true},
    {id:3,name:"Suresh Iyer",         country:"India",   city:"Mumbai",    passport:"K3456790",mobile:"+91 98201 88888",email:"suresh@gmail.com",   dob:"1980-11-05",credit:30000, out:0,    active:true},
    {id:4,name:"Priya Mehta",         country:"India",   city:"Ahmedabad", passport:"M2345678",mobile:"+91 98254 33333",email:"priya.m@gmail.com",  dob:"1990-06-15",credit:20000, out:0,    active:true},
    {id:5,name:"James Kamau",         country:"Kenya",   city:"Nairobi",   passport:"KE123456",mobile:"+254 72 400 1234",email:"james@gmail.com",   dob:"1982-04-18",credit:200000,out:0,    active:true},
    {id:6,name:"Fatuma Said",         country:"Tanzania",city:"Dar es Salaam",passport:"TZ234567",mobile:"+255 75 400 1234",email:"fatuma@gmail.com",dob:"1988-09-25",credit:300000,out:0, active:true},
    {id:7,name:"Mujeet",       country:"Kenya",   city:"Nairobi",   passport:"KE234567",mobile:"+254 73 400 5678",email:"grace@gmail.com",   dob:"1992-01-30",credit:150000,out:0,    active:true},
    {id:8,name:"Pierre Kabila",       country:"DRC",     city:"Lubumbashi",passport:"CD123456",mobile:"+243 99 400 1234",email:"pierre@gmail.com",  dob:"1975-12-10",credit:500,  out:0,    active:true},
  ]);

  const [b2eData,setB2eData]=useState([
    {id:1,empAcct:"TechCorp — Employee Travel A/c", company:"TechCorp Solutions Pvt. Ltd.",compGstin:"27AABCT2345E1Z6",dept:"All Departments",  city:"Bangalore",credit:1000000,out:42000, adminContact:"HR Dept",mobile:"+91 80 4000 5678",email:"travel.hr@techcorp.in",  active:true},
    {id:2,empAcct:"Nexus Industries — Staff Travel", company:"Nexus Industries",            compGstin:"27AABCN7890F1Z5",dept:"Operations & Sales",city:"Pune",     credit:500000, out:18000, adminContact:"Admin",   mobile:"+91 98201 99999",email:"admin.travel@nexus.in",    active:true},
    {id:3,empAcct:"Apex Pharma — Field Force Travel",company:"Apex Pharma Ltd.",            compGstin:"27AABCA9012J1Z3",dept:"Medical Sales",    city:"Mumbai",   credit:300000, out:0,     adminContact:"HR Manager",mobile:"+91 98201 33333",email:"fieldstaff@apex.com",       active:true},
    {id:4,empAcct:"Globex — Consultant Travel",      company:"Globex Consulting",           compGstin:"27AABCG3456H1Z4",dept:"Consulting",       city:"Mumbai",   credit:200000, out:28000, adminContact:"Rohan",mobile:"+91 98201 44444",email:"priya@globex.in",            active:true},
    {id:5,empAcct:"Patel Exports — Trade Visits",    company:"Patel Exports Ltd.",          compGstin:"24AABCP6789D1Z7",dept:"Export / Sourcing", city:"Ahmedabad",credit:150000, out:0,     adminContact:"Jayesh Patel",mobile:"+91 98254 11111",email:"export.travel@patelx.in",active:true},
  ]);

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
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:4}}>
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
                <FL label="Customer full name"><input value={editRec.name||""} onChange={e=>set({name:e.target.value})} style={inp} placeholder="e.g. Rohan"/></FL>
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
  const [modal,setModal]=useState(false);
  const [search,setSearch]=useState("");
  const [typeFilter,setTypeFilter]=useState("All");
  const supps=[
    {id:1, name:"BSP India (IATA Clearing)",  type:"Airline/BSP",   gstin:"27AABCB1234A1Z1",currency:"INR",tds:"194C",commPct:0,active:true},
    {id:2, name:"Emirates GSA India",          type:"Airline/BSP",   gstin:"27AABCE5678B1Z2",currency:"INR",tds:"",    commPct:5,active:true},
    {id:3, name:"Air India Ltd.",              type:"Airline/BSP",   gstin:"07AABCA9012C1Z3",currency:"INR",tds:"",    commPct:3,active:true},
    {id:4, name:"Bali Tours DMC Co.",          type:"DMC/Operator",  gstin:"",               currency:"USD",tds:"",    commPct:10,active:true},
    {id:5, name:"Singapore MICE & Events DMC", type:"DMC/Operator",  gstin:"",               currency:"SGD",tds:"",    commPct:8, active:true},
    {id:6, name:"Island Escapes Maldives DMC", type:"DMC/Operator",  gstin:"",               currency:"USD",tds:"",    commPct:12,active:true},
    {id:7, name:"Hyatt Hotels & Resorts",      type:"Hotel",         gstin:"27AABCH3456D1Z4",currency:"INR",tds:"194C",commPct:10,active:true},
    {id:8, name:"ITC Hotels Ltd.",             type:"Hotel",         gstin:"27AABCI7890E1Z5",currency:"INR",tds:"194C",commPct:12,active:true},
    {id:9, name:"Riya Travels & Tours",        type:"Car/Transport", gstin:"27AABCR2345F1Z6",currency:"INR",tds:"194C",commPct:0, active:true},
    {id:10,name:"VFS Global India",            type:"Visa Agency",   gstin:"27AABCV6789G1Z7",currency:"INR",tds:"",    commPct:0, active:true},
    {id:11,name:"TATA AIG General Insurance",  type:"Insurance",     gstin:"27AABCT0123H1Z8",currency:"INR",tds:"194D",commPct:15,active:true},
    {id:12,name:"Jubilee Insurance (Kenya)",   type:"Insurance",     gstin:"",               currency:"KES",tds:"",    commPct:12,active:true},
  ];
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
      <div style={{...card,padding:0,overflow:"hidden"}}>
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
            <FL label="Settlement currency"><select style={inp}><option>INR</option><option>USD</option><option>EUR</option><option>AED</option><option>KES</option><option>TZS</option></select></FL>
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
  const [modal,setModal]=useState(false);
  const [search,setSearch]=useState("");
  const airlines=[
    {id:1, iata:"AI",  name:"Air India",           country:"India",       type:"Full Service",hub:"DEL",bsp:true, alliance:"None",   gds:"1A/1G/1B",commPct:3},
    {id:2, iata:"EK",  name:"Emirates",             country:"UAE",         type:"Full Service",hub:"DXB",bsp:true, alliance:"None",   gds:"1A/1G/1B",commPct:5},
    {id:3, iata:"6E",  name:"IndiGo",               country:"India",       type:"Low Cost",    hub:"DEL",bsp:true, alliance:"None",   gds:"1G",      commPct:0},
    {id:4, iata:"SG",  name:"SpiceJet",             country:"India",       type:"Low Cost",    hub:"DEL",bsp:true, alliance:"None",   gds:"1G",      commPct:0},
    {id:5, iata:"QR",  name:"Qatar Airways",        country:"Qatar",       type:"Full Service",hub:"DOH",bsp:true, alliance:"One",    gds:"1A/1G/1B",commPct:5},
    {id:6, iata:"EY",  name:"Etihad Airways",       country:"UAE",         type:"Full Service",hub:"AUH",bsp:true, alliance:"None",   gds:"1A/1G",   commPct:4},
    {id:7, iata:"G9",  name:"Air Arabia",           country:"UAE",         type:"Low Cost",    hub:"SHJ",bsp:false,alliance:"None",   gds:"Direct",  commPct:0},
    {id:8, iata:"KQ",  name:"Kenya Airways",        country:"Kenya",       type:"Full Service",hub:"NBO",bsp:true, alliance:"Sky",    gds:"1A/1G",   commPct:5},
    {id:9, iata:"ET",  name:"Ethiopian Airlines",   country:"Ethiopia",    type:"Full Service",hub:"ADD",bsp:true, alliance:"Star",   gds:"1A/1G/1B",commPct:5},
    {id:10,iata:"LH",  name:"Lufthansa",            country:"Germany",     type:"Full Service",hub:"FRA",bsp:true, alliance:"Star",   gds:"1A/1G/1B",commPct:5},
    {id:11,iata:"BA",  name:"British Airways",      country:"UK",          type:"Full Service",hub:"LHR",bsp:true, alliance:"One",    gds:"1A/1B",   commPct:5},
    {id:12,iata:"9W",  name:"Jet Airways",          country:"India",       type:"Full Service",hub:"BOM",bsp:false,alliance:"None",   gds:"",        commPct:0},
  ];
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
        <button key="a" onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}>
          <Plus size={13}/> New Airline
        </button>
      ]}>
      <div style={{...card,padding:0,overflow:"hidden"}}>
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
  const [modal,setModal]=useState(false);
  const [tab,setTab]=useState("hotels");
  const [search,setSearch]=useState("");
  const hotels=[
    {id:1, name:"Hyatt Regency Ahmedabad", city:"Ahmedabad",stars:5,gstSlab:18,tariff:8500, chain:"Hyatt",contract:true},
    {id:2, name:"ITC Grand Central Mumbai",city:"Mumbai",   stars:5,gstSlab:18,tariff:12000,chain:"ITC",  contract:true},
    {id:3, name:"Oberoi New Delhi",        city:"New Delhi", stars:5,gstSlab:18,tariff:15000,chain:"Oberoi",contract:true},
    {id:4, name:"Taj Lands End Mumbai",    city:"Mumbai",   stars:5,gstSlab:18,tariff:11000,chain:"Taj",  contract:false},
    {id:5, name:"Radisson Blu Ahmedabad",  city:"Ahmedabad",stars:4,gstSlab:18,tariff:6500, chain:"Radisson",contract:true},
    {id:6, name:"Lemon Tree Premier",      city:"Mumbai",   stars:4,gstSlab:12,tariff:4500, chain:"Lemon Tree",contract:true},
    {id:7, name:"Ibis Mumbai Airport",     city:"Mumbai",   stars:3,gstSlab:12,tariff:3200, chain:"Ibis",  contract:false},
    {id:8, name:"Nairobi Serena Hotel",    city:"Nairobi",  stars:5,gstSlab:16,tariff:18000,chain:"Serena",contract:true},
    {id:9, name:"Hyatt Regency Dar",       city:"Dar es Salaam",stars:5,gstSlab:18,tariff:22000,chain:"Hyatt",contract:true},
    {id:10,name:"Karavia Hotel Lubumbashi",city:"Lubumbashi",stars:4,gstSlab:16,tariff:180,  chain:"Karavia",contract:true},
  ];
  const dmcs=[
    {id:1, name:"Bali Tours DMC Co.",        country:"Indonesia",speciality:"Beach/Adventure",currency:"USD",commPct:10,contract:true},
    {id:2, name:"Singapore MICE & Events",   country:"Singapore", speciality:"MICE/Corporate", currency:"SGD",commPct:8, contract:true},
    {id:3, name:"Island Escapes Maldives",   country:"Maldives",  speciality:"Luxury Beach",   currency:"USD",commPct:12,contract:true},
    {id:4, name:"Thailand Discovery DMC",    country:"Thailand",  speciality:"Cultural/Beach",  currency:"THB",commPct:10,contract:false},
    {id:5, name:"Dubai Wonders DMC",         country:"UAE",       speciality:"City/Shopping",   currency:"AED",commPct:8, contract:true},
    {id:6, name:"Maasai Mara Safaris",       country:"Kenya",     speciality:"Safari/Wildlife", currency:"KES",commPct:10,contract:true},
    {id:7, name:"Zanzibar Beach DMC",        country:"Tanzania",  speciality:"Beach/Spice",     currency:"TZS",commPct:12,contract:true},
    {id:8, name:"DRC Safari Operator",       country:"DRC",       speciality:"Gorilla/Nature",  currency:"USD",commPct:15,contract:false},
  ];
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
        <button key="a" onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}>
          <Plus size={13}/> {tab==="hotels"?"New Hotel":"New DMC"}
        </button>
      ]}>
      {tab==="hotels"?(
        <div style={{...card,padding:0,overflow:"hidden"}}>
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
        <div style={{...card,padding:0,overflow:"hidden"}}>
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
              <FL label="Settlement currency"><select style={inp}><option>USD</option><option>EUR</option><option>AED</option><option>SGD</option><option>THB</option><option>KES</option><option>TZS</option></select></FL>
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

export function MastersTaxRates(){
  const [tab,setTab]=useState("gst");
  const [search,setSearch]=useState("");
  const gstRates=[
    {id:1, sac:"996421",service:"Flight Tickets — Domestic",       module:"Flight",  basis:"Service charge only",rate:18,itc:"Yes",tcs:"No"},
    {id:2, sac:"996422",service:"Flight Tickets — International",  module:"Flight",  basis:"Service charge only",rate:18,itc:"Yes",tcs:"No"},
    {id:3, sac:"998555",service:"Holiday Package — Tour Operator",  module:"Holiday", basis:"Full package value",  rate:5, itc:"No", tcs:"5% overseas >7L"},
    {id:4, sac:"998555",service:"Holiday Package — Agent Scheme",   module:"Holiday", basis:"Service charge",      rate:18,itc:"Yes",tcs:"5% overseas >7L"},
    {id:5, sac:"996311",service:"Hotel — Tariff < ₹1,000/night",   module:"Hotel",   basis:"Room charge",         rate:0, itc:"No", tcs:"No"},
    {id:6, sac:"996311",service:"Hotel — ₹1,000–₹7,500/night",     module:"Hotel",   basis:"Room charge",         rate:12,itc:"Yes",tcs:"No"},
    {id:7, sac:"996311",service:"Hotel — Above ₹7,500/night",      module:"Hotel",   basis:"Room charge",         rate:18,itc:"Yes",tcs:"No"},
    {id:8, sac:"996601",service:"Car Rental — With Driver",         module:"Car",     basis:"Hire charges",        rate:5, itc:"No", tcs:"No"},
    {id:9, sac:"996601",service:"Car Rental — B2B Aggregator",      module:"Car",     basis:"Hire charges",        rate:12,itc:"Yes",tcs:"No"},
    {id:10,sac:"998212",service:"Visa Processing Service Charge",   module:"Visa",    basis:"Service fee only",    rate:18,itc:"Yes",tcs:"No"},
    {id:11,sac:"997131",service:"Travel Insurance Premium",         module:"Insurance",basis:"Full premium",       rate:18,itc:"No", tcs:"No"},
    {id:12,sac:"Various",service:"Miscellaneous Services",          module:"Misc",    basis:"Per item",            rate:0, itc:"Varies",tcs:"No"},
  ];
  const tcsTds=[
    {section:"206C(1G)",nature:"TCS",rate:"5%",  threshold:"Rs.7L/buyer/year",applicability:"Overseas tour package collection from buyer"},
    {section:"194C",    nature:"TDS",rate:"1%/2%",threshold:"Rs.30K/txn or Rs.1L/year",applicability:"Car hire payments: 1% individual, 2% company"},
    {section:"194H",    nature:"TDS",rate:"5%",  threshold:"Rs.15K/year",applicability:"Commission paid to airlines/sub-agents"},
    {section:"194J",    nature:"TDS",rate:"10%", threshold:"Rs.30K/year",applicability:"Professional fees (CA, lawyer, consultant)"},
    {section:"194D",    nature:"TDS",rate:"5%",  threshold:"Rs.15K/year",applicability:"Commission received from insurance company"},
    {section:"194I",    nature:"TDS",rate:"10%", threshold:"Rs.2.4L/year",applicability:"Office/premises rent payments"},
  ];
  const afVat=[
    {branch:"NBO — Kenya", rate:"16%",authority:"KRA",tin:"PIN",deadline:"20th of month",input:"Full credit",wht:"5% services"},
    {branch:"DAR — Tanzania",rate:"18%",authority:"TRA",tin:"TPIN",deadline:"20th of month",input:"Full credit",wht:"5% services"},
    {branch:"FBM — DRC",   rate:"16%",authority:"DGI",tin:"NIF", deadline:"20th of month",input:"Full credit",wht:"14% services"},
  ];
  const filt_g=gstRates.filter(r=>!search||
    r.service.toLowerCase().includes(search.toLowerCase())||
    r.sac.includes(search)||r.module.toLowerCase().includes(search.toLowerCase())
  );
  const rateColor={0:"#5a6691",5:"#27500A",12:"#854F0B",18:"#A32D2D"};
  const rateBg   ={0:"#f3f4f8",5:"#EAF3DE",12:"#FAEEDA",18:"#FCEBEB"};
  return (
    <MstrShell title="Tax Rates" icon="📋"
      actions={[
        <div key="tabs" style={{display:"flex",borderRadius:8,overflow:"hidden",border:"1px solid #e1e3ec"}}>
          <button key="gst" onClick={()=>setTab("gst")} style={{padding:"6px 14px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab==="gst"?700:400,background:tab==="gst"?"#0d1326":"#fff",color:tab==="gst"?"#d4a437":"#5a6691"}}>India GST</button><button key="tcstds" onClick={()=>setTab("tcstds")} style={{padding:"6px 14px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab==="tcstds"?700:400,background:tab==="tcstds"?"#0d1326":"#fff",color:tab==="tcstds"?"#d4a437":"#5a6691"}}>TDS/TCS</button><button key="vat" onClick={()=>setTab("vat")} style={{padding:"6px 14px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab==="vat"?700:400,background:tab==="vat"?"#0d1326":"#fff",color:tab==="vat"?"#d4a437":"#5a6691"}}>Africa VAT</button>
        </div>,
        tab==="gst"&&<input key="s" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search SAC, module..." style={{...inp,width:200,minHeight:32,fontSize:11}}/>,
      ]}>
      {tab==="gst"&&(
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["SAC Code","Service","Module","Taxable Basis","GST %","ITC","TCS"].map((h,i)=>(
                <th key={i} style={{padding:"9px 10px",textAlign:i>=4?"center":"left",
                  color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filt_g.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 10px",fontFamily:"monospace",fontWeight:700,color:"#185FA5"}}>{r.sac}</td>
                <td style={{padding:"8px 10px",color:"#0d1326"}}>{r.service}</td>
                <td style={{padding:"8px 10px"}}>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:700,
                    background:"#E6F1FB",color:"#185FA5"}}>{r.module}</span>
                </td>
                <td style={{padding:"8px 10px",fontSize:10.5,color:"#5a6691"}}>{r.basis}</td>
                <td style={{padding:"8px 10px",textAlign:"center"}}>
                  <span style={{fontSize:11,padding:"3px 9px",borderRadius:999,fontWeight:800,
                    background:rateBg[r.rate]||"#f3f4f8",color:rateColor[r.rate]||"#5a6691"}}>
                    {r.rate}%
                  </span>
                </td>
                <td style={{padding:"8px 10px",textAlign:"center",fontSize:10,fontWeight:700,
                  color:r.itc==="Yes"?"#27500A":r.itc==="No"?"#A32D2D":"#854F0B"}}>{r.itc}</td>
                <td style={{padding:"8px 10px",textAlign:"center",fontSize:10,
                  color:r.tcs!=="No"?"#854F0B":"#bfc3d6"}}>{r.tcs}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {tab==="tcstds"&&(
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Section","Nature","Rate","Threshold","When it applies"].map((h,i)=>(
                <th key={i} style={{padding:"9px 12px",textAlign:"left",
                  color:"#d4a437",fontWeight:700,fontSize:10}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{tcsTds.map((r,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",fontFamily:"monospace",fontWeight:800,color:"#185FA5"}}>{r.section}</td>
                <td style={{padding:"8px 12px"}}>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,
                    background:r.nature==="TCS"?"#FAEEDA":"#E6F1FB",
                    color:r.nature==="TCS"?"#854F0B":"#185FA5"}}>{r.nature}</span>
                </td>
                <td style={{padding:"8px 12px",fontWeight:700,color:"#0d1326"}}>{r.rate}</td>
                <td style={{padding:"8px 12px",fontSize:10.5,color:"#5a6691"}}>{r.threshold}</td>
                <td style={{padding:"8px 12px",color:"#384677"}}>{r.applicability}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {tab==="vat"&&(
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#1D5C1D"}}>
              {["Branch","VAT Rate","Authority","Tax ID","Return Deadline","Input Credit","WHT — Services"].map((h,i)=>(
                <th key={i} style={{padding:"9px 12px",textAlign:"left",
                  color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{afVat.map((r,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",fontWeight:700,color:"#0d1326"}}>{r.branch}</td>
                <td style={{padding:"8px 12px"}}>
                  <span style={{fontSize:12,padding:"3px 9px",borderRadius:999,fontWeight:800,
                    background:"#EAF3DE",color:"#1D5C1D"}}>{r.rate}</span>
                </td>
                <td style={{padding:"8px 12px",fontWeight:700,color:"#185FA5"}}>{r.authority}</td>
                <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:11,color:"#5a6691"}}>{r.tin}</td>
                <td style={{padding:"8px 12px",color:"#384677"}}>{r.deadline}</td>
                <td style={{padding:"8px 12px",color:"#27500A",fontWeight:700}}>{r.input}</td>
                <td style={{padding:"8px 12px",color:"#854F0B",fontWeight:700}}>{r.wht}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </MstrShell>
  );
}


export function TourCodeMaster({branch,setRoute}){
  const mob=useMobile();
  const [codes,setCodes]=useState(TOUR_CODES_DATA);
  const [modal,setModal]=useState(false);
  const [search,setSearch]=useState("");
  const [form,setForm]=useState({id:"",name:"",dest:"",nights:4,days:5,pax:"FIT",base:0,peak:0,off:0,gp:12,active:true,tags:[],mods:["Flight","Hotel"]});

  const filtered=codes.filter(c=>!search||c.name.toLowerCase().includes(search.toLowerCase())||c.dest.toLowerCase().includes(search.toLowerCase())||c.id.toLowerCase().includes(search.toLowerCase()));
  const PAX_TYPE={FIT:"#185FA5",GIT:"#854F0B",MICE:"#A32D2D"};
  const PAX_BG  ={FIT:"#E6F1FB",GIT:"#FAEEDA",MICE:"#FCEBEB"};
  const MOD_ICONS={Flight:"✈",Hotel:"🏨",Transfers:"🚐",Visa:"🛂",Insurance:"🛡",Guide:"🧭",Cruise:"🚢",Meals:"🍽"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1300,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🗂</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Tour Code / Package Master</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{filtered.length} packages · Reusable templates for holiday invoices</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search packages..." style={{...inp,width:200,minHeight:32,fontSize:11}}/>
          <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> New Package</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:12}}>
        {filtered.map(c=>(
          <div key={c.id} style={{...card,padding:0,overflow:"hidden",opacity:c.active?1:0.6}}>
            <div style={{padding:"11px 14px",background:c.pax==="GIT"?"#FAEEDA":c.pax==="MICE"?"#FCEBEB":"#E6F1FB",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                  <span style={{fontFamily:"monospace",fontSize:9.5,padding:"2px 7px",borderRadius:4,background:"#0d1326",color:"#d4a437",fontWeight:700}}>{c.id}</span>
                  <span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:PAX_BG[c.pax],color:PAX_TYPE[c.pax]}}>{c.pax}</span>
                </div>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>{c.name}</p>
                <p style={{margin:"1px 0 0",fontSize:10,color:"#5a6691"}}>📍 {c.dest} · {c.nights}N/{c.days}D</p>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{margin:0,fontSize:14,fontWeight:800,color:"#0d1326"}}>₹{(c.base/1000).toFixed(0)}K</p>
                <p style={{margin:"1px 0 0",fontSize:9.5,color:"#5a6691"}}>per pax base</p>
              </div>
            </div>
            <div style={{padding:"10px 14px"}}>
              {/* Pricing tiers */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:11}}><span style={{color:"#27500A"}}>Off-peak</span><span style={{fontWeight:600}}>{c.off}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:11}}><span style={{color:"#185FA5"}}>Base</span><span style={{fontWeight:600}}>{c.base}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:11}}><span style={{color:"#A32D2D"}}>Peak</span><span style={{fontWeight:600}}>{c.peak}</span></div>
              </div>
              {/* Modules */}
              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
                {c.mods.map(m=><span key={m} style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#f3f4f8",color:"#384677",fontWeight:600}}>{MOD_ICONS[m]||"•"} {m}</span>)}
              </div>
              {/* Tags + GP */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {c.tags.map(t=><span key={t} style={{fontSize:8.5,padding:"1px 6px",borderRadius:999,background:"#E6F1FB",color:"#185FA5"}}>{t}</span>)}
                </div>
                <span style={{fontSize:10.5,fontWeight:800,color:"#27500A"}}>GP {c.gp}%</span>
              </div>
              <div style={{marginTop:10,display:"flex",gap:6}}>
                <button onClick={()=>setRoute("/sales/holiday")} style={{...btnG,fontSize:10,padding:"4px 12px",flex:1}}>📋 Use in Sale</button>
                <button style={{...btnGh,fontSize:10,padding:"4px 10px"}}>✏ Edit</button>
                <button onClick={()=>setCodes(cs=>cs.map(x=>x.id===c.id?{...x,active:!x.active}:x))} style={{...btnGh,fontSize:10,padding:"4px 10px",color:c.active?"#A32D2D":"#27500A"}}>{c.active?"Archive":"Restore"}</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:560,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>New Tour Code</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Tour code (unique ID)"><input value={form.id} onChange={e=>setForm(f=>({...f,id:e.target.value.toUpperCase()}))} style={{...inp,fontFamily:"monospace"}} placeholder="DXB-4N-2P"/></FL>
                <FL label="Package name"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp}/></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <FL label="Destination"><input value={form.dest} onChange={e=>setForm(f=>({...f,dest:e.target.value}))} style={inp}/></FL>
                <FL label="Nights"><input type="number" value={form.nights} onChange={e=>setForm(f=>({...f,nights:+e.target.value,days:+e.target.value+1}))} style={inp}/></FL>
                <FL label="Pax type"><select value={form.pax} onChange={e=>setForm(f=>({...f,pax:e.target.value}))} style={inp}><option>FIT</option><option>GIT</option><option>MICE</option></select></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10}}>
                <FL label="Off-peak ₹/pax"><input type="number" value={form.off} onChange={e=>setForm(f=>({...f,off:+e.target.value}))} style={inp}/></FL>
                <FL label="Base ₹/pax"><input type="number" value={form.base} onChange={e=>setForm(f=>({...f,base:+e.target.value}))} style={inp}/></FL>
                <FL label="Peak ₹/pax"><input type="number" value={form.peak} onChange={e=>setForm(f=>({...f,peak:+e.target.value}))} style={inp}/></FL>
                <FL label="Min GP%"><input type="number" value={form.gp} onChange={e=>setForm(f=>({...f,gp:+e.target.value}))} style={inp}/></FL>
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={()=>{setCodes(cs=>[{...form,mods:["Flight","Hotel","Transfers"],tags:[],active:true,updated:"2026-05-19"},...cs]);setModal(false);}} style={btnG}>Create Package</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CASH BOOK REPORT ────────────────────────────────────────── */

export function VendorAdvances({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [filter,setFilter]=useState("Unadjusted");

  const all=VENDOR_ADVANCES_DATA.filter(a=>!brCode||a.branch===brCode);
  const visible=filter==="Unadjusted"?all.filter(a=>a.unadjusted>0):filter==="Fully Adjusted"?all.filter(a=>a.unadjusted===0):all;

  const totGiven=visible.reduce((s,a)=>s+a.amount,0);
  const totAdj=visible.reduce((s,a)=>s+a.adjusted,0);
  const totUnadj=visible.reduce((s,a)=>s+a.unadjusted,0);
  const aged=visible.filter(a=>a.ageDays>30&&a.unadjusted>0).length;

  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>💵 Vendor / Supplier Advances</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>Unadjusted advances · Airline block deposits · DMC pre-payments · Ageing &amp; reconciliation</p>
        </div>
        <button style={{padding:"7px 14px",border:"none",background:"#d4a437",color:"#0d1326",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"}}>＋ Record Advance</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Total Advances Given</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{cur+fmt(totGiven)}</p></div>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Adjusted</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{cur+fmt(totAdj)}</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Unadjusted</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{cur+fmt(totUnadj)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{aged} aged &gt; 30 days</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Records</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{visible.length}</p></div>
      </div>

      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        {["Unadjusted","Fully Adjusted","All"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"4px 12px",border:"1px solid "+(filter===f?"#0d1326":"#e1e3ec"),background:filter===f?"#0d1326":"#fff",color:filter===f?"#d4a437":"#5a6691",borderRadius:14,fontSize:11,fontWeight:600,cursor:"pointer"}}>{f}</button>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Advance ID</th><th style={{padding:"9px 8px",textAlign:"left"}}>Vendor</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Type</th><th style={{padding:"9px 8px",textAlign:"center"}}>Date</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Amount</th><th style={{padding:"9px 8px",textAlign:"right"}}>Adjusted</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Unadjusted</th><th style={{padding:"9px 8px",textAlign:"center"}}>Age</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Reference</th>
            </tr></thead>
            <tbody>
              {visible.map((a,i)=>(
                <tr key={a.id} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{a.id}</td>
                  <td style={{padding:"7px 8px",fontWeight:600}}>{a.vendor}<div style={{fontSize:9.5,color:"#5a6691"}}>{a.contact}</div></td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:a.vendorType==="Airline"?"#E6F1FB":"#FAEEDA",color:a.vendorType==="Airline"?"#185FA5":"#854F0B"}}>{a.vendorType}</span></td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{a.date}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(a.amount)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",color:"#27500A"}}>{cur+fmt(a.adjusted)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,color:a.unadjusted>0?"#A32D2D":"#5a6691"}}>{cur+fmt(a.unadjusted)}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontWeight:600,color:a.ageDays>30?"#A32D2D":a.ageDays>15?"#854F0B":"#27500A"}}>{a.ageDays}d</td>
                  <td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>{a.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


export function BankAccountMaster({branch}){
  const [search,setSearch]=useState("");
  const [filterBranch,setFilterBranch]=useState(branch==="ALL"?"ALL":branch?.code||"ALL");
  const filtered=BANK_ACCOUNTS_DATA.filter(b=>{
    if(filterBranch!=="ALL"&&b.branch!==filterBranch) return false;
    const q=search.toLowerCase();
    if(q && !(b.bank.toLowerCase().includes(q) || b.accountNo.toLowerCase().includes(q) || b.ifsc.toLowerCase().includes(q))) return false;
    return true;
  });
  const totalByCurrency=filtered.reduce((acc,b)=>{
    acc[b.currency]=(acc[b.currency]||0)+b.openingBal;
    return acc;
  },{});
  return MASTER_PAGE("Bank Account Master","All bank accounts where Travkings holds money — per branch, per currency",
    <>
      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:14}}>
        {Object.entries(totalByCurrency).map(([cur,amt])=>(
          <div key={cur} style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:"10px 13px"}}>
            <p style={{margin:0,fontSize:10.5,color:"#5a6691",letterSpacing:"0.5px",textTransform:"uppercase",fontWeight:700}}>Cash + Bank — {cur}</p>
            <p style={{margin:"4px 0 0",fontSize:18,fontWeight:700,color:"#0d1326"}}>{cur} {amt.toLocaleString("en-IN",{maximumFractionDigits:0})}</p>
          </div>
        ))}
      </div>
      {/* Toolbar */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <input type="text" placeholder="Search bank / account / IFSC..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:"1 1 280px",minWidth:200,padding:"8px 11px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12.5}}/>
        <select value={filterBranch} onChange={e=>setFilterBranch(e.target.value)}
          style={{padding:"8px 11px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12.5,background:"#fff"}}>
          <option value="ALL">All branches</option>
          {["TKHO","BOM","AMD","NBO","DAR","FBM"].map(b=><option key={b} value={b}>{b}</option>)}
        </select>
        <button style={{padding:"8px 14px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,cursor:"pointer"}}>📥 Import</button>
        <button style={{padding:"8px 14px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,cursor:"pointer"}}>📤 Export</button>
        <button style={{padding:"8px 16px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>+ Add Bank Account</button>
      </div>
      {/* Table */}
      <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead style={{background:"#f7f8fb"}}>
              <tr>
                <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Branch</th>
                <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Bank · Branch</th>
                <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Account No.</th>
                <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>IFSC / SWIFT</th>
                <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Type</th>
                <th style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Opening Bal</th>
                <th style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Limit</th>
                <th style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Status</th>
                <th style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b=>(
                <tr key={b.id} style={{borderBottom:"1px solid #f0f2f7"}}>
                  <td style={{padding:"9px 12px"}}><span style={{padding:"2px 7px",background:"#e6e8f1",color:"#0d1326",borderRadius:3,fontSize:10.5,fontWeight:700}}>{b.branch}</span></td>
                  <td style={{padding:"9px 12px"}}><p style={{margin:0,fontWeight:600,color:"#0d1326"}}>{b.bank}</p><p style={{margin:"1px 0 0",fontSize:10.5,color:"#5a6691"}}>{b.branchAddr}</p></td>
                  <td style={{padding:"9px 12px",fontFamily:"monospace",color:"#0d1326"}}>{b.accountNo}</td>
                  <td style={{padding:"9px 12px",fontFamily:"monospace",color:"#5a6691"}}>{b.ifsc}</td>
                  <td style={{padding:"9px 12px",color:"#5a6691"}}>{b.type} · {b.currency}</td>
                  <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:"#0d1326"}}>{b.currency} {b.openingBal.toLocaleString("en-IN")}</td>
                  <td style={{padding:"9px 12px",textAlign:"right",color:"#5a6691"}}>{b.currency} {b.limit.toLocaleString("en-IN")}</td>
                  <td style={{padding:"9px 12px",textAlign:"center"}}><span style={{padding:"2px 7px",background:b.status==="Active"?"#d4edda":"#f8d7da",color:b.status==="Active"?"#155724":"#721c24",borderRadius:3,fontSize:10.5,fontWeight:600}}>{b.status}</span></td>
                  <td style={{padding:"9px 12px",textAlign:"center"}}>
                    <button style={{padding:"3px 8px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:4,fontSize:10.5,cursor:"pointer",fontWeight:600}}>Edit</button>
                  </td>
                </tr>
              ))}
              {filtered.length===0&&<tr><td colSpan={9} style={{padding:30,textAlign:"center",color:"#5a6691"}}>No bank accounts match the filter</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
   2. CURRENCY MASTER
   ════════════════════════════════════════════════════════════════════ */


export function CurrencyMaster(){
  const [search,setSearch]=useState("");
  const filtered=CURRENCY_DATA.filter(c=>{
    if(!search) return true;
    const q=search.toLowerCase();
    return c.code.toLowerCase().includes(q)||c.name.toLowerCase().includes(q);
  });
  return MASTER_PAGE("Currency Master","All currencies used by Travkings — daily exchange rates auto-update at 9 AM IST",
    <>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <input type="text" placeholder="Search code or name..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:"1 1 280px",minWidth:200,padding:"8px 11px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12.5}}/>
        <button style={{padding:"8px 14px",background:"#fff",border:"1px solid #d4a437",color:"#d4a437",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>↻ Refresh Rates Now</button>
        <button style={{padding:"8px 14px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,cursor:"pointer"}}>📥 Import</button>
        <button style={{padding:"8px 14px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,cursor:"pointer"}}>📤 Export</button>
        <button style={{padding:"8px 16px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>+ Add Currency</button>
      </div>
      <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead style={{background:"#f7f8fb"}}>
            <tr>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Code</th>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Name</th>
              <th style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Symbol</th>
              <th style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>1 unit = ₹</th>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Last Updated</th>
              <th style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Status</th>
              <th style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c=>(
              <tr key={c.code} style={{borderBottom:"1px solid #f0f2f7"}}>
                <td style={{padding:"9px 12px"}}>
                  <span style={{fontFamily:"monospace",fontWeight:700,color:"#0d1326"}}>{c.code}</span>
                  {c.isBase&&<span style={{marginLeft:6,padding:"1px 6px",background:"#d4a437",color:"#0d1326",borderRadius:3,fontSize:9,fontWeight:700}}>BASE</span>}
                </td>
                <td style={{padding:"9px 12px",color:"#0d1326"}}>{c.name}</td>
                <td style={{padding:"9px 12px",textAlign:"center",fontSize:14,color:"#0d1326"}}>{c.symbol}</td>
                <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,color:"#0d1326"}}>{c.dailyRate.toFixed(4)}</td>
                <td style={{padding:"9px 12px",color:"#5a6691",fontSize:11}}>{c.lastUpdated}</td>
                <td style={{padding:"9px 12px",textAlign:"center"}}><span style={{padding:"2px 7px",background:c.active?"#d4edda":"#f8d7da",color:c.active?"#155724":"#721c24",borderRadius:3,fontSize:10.5,fontWeight:600}}>{c.active?"Active":"Inactive"}</span></td>
                <td style={{padding:"9px 12px",textAlign:"center"}}>
                  <button style={{padding:"3px 8px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:4,fontSize:10.5,cursor:"pointer",fontWeight:600}}>Edit Rate</button>
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
        <button style={{padding:"8px 14px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,cursor:"pointer"}}>📤 Export</button>
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


export function ProjectMaster(){
  const [search,setSearch]=useState("");
  const [filterStatus,setFilterStatus]=useState("ALL");
  const filtered=PROJECTS_DATA.filter(p=>{
    if(filterStatus!=="ALL"&&p.status!==filterStatus) return false;
    if(!search) return true;
    const q=search.toLowerCase();
    return p.code.toLowerCase().includes(q)||p.name.toLowerCase().includes(q)||p.client.toLowerCase().includes(q);
  });
  const statusColor={"Active":"#d1e7fd","Quoted":"#fff3cd","Booked":"#d4edda","Completed":"#e2e3e5","Cancelled":"#f8d7da"};
  const statusText={"Active":"#0c5460","Quoted":"#856404","Booked":"#155724","Completed":"#383d41","Cancelled":"#721c24"};
  const totBudget=filtered.reduce((s,p)=>s+p.budget,0);
  const totActual=filtered.reduce((s,p)=>s+p.actual,0);
  return MASTER_PAGE("Project / Tour Code Master","Project-based costing — track budget vs actual per tour package or corporate group booking",
    <>
      {/* Summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,marginBottom:14}}>
        <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:"10px 13px"}}>
          <p style={{margin:0,fontSize:10.5,color:"#5a6691",letterSpacing:"0.5px",textTransform:"uppercase",fontWeight:700}}>Active Projects</p>
          <p style={{margin:"4px 0 0",fontSize:18,fontWeight:700,color:"#0d1326"}}>{PROJECTS_DATA.filter(p=>p.status!=="Completed"&&p.status!=="Cancelled").length}</p>
        </div>
        <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:"10px 13px"}}>
          <p style={{margin:0,fontSize:10.5,color:"#5a6691",letterSpacing:"0.5px",textTransform:"uppercase",fontWeight:700}}>Total Budget</p>
          <p style={{margin:"4px 0 0",fontSize:18,fontWeight:700,color:"#0d1326"}}>₹{(totBudget/100000).toFixed(1)} L</p>
        </div>
        <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:"10px 13px"}}>
          <p style={{margin:0,fontSize:10.5,color:"#5a6691",letterSpacing:"0.5px",textTransform:"uppercase",fontWeight:700}}>Total Actual Spend</p>
          <p style={{margin:"4px 0 0",fontSize:18,fontWeight:700,color:"#0d1326"}}>₹{(totActual/100000).toFixed(1)} L</p>
        </div>
        <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:"10px 13px"}}>
          <p style={{margin:0,fontSize:10.5,color:"#5a6691",letterSpacing:"0.5px",textTransform:"uppercase",fontWeight:700}}>Utilization</p>
          <p style={{margin:"4px 0 0",fontSize:18,fontWeight:700,color:"#0d1326"}}>{totBudget>0?Math.round(totActual/totBudget*100):0}%</p>
        </div>
      </div>
      {/* Toolbar */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <input type="text" placeholder="Search code, project, client..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:"1 1 280px",minWidth:200,padding:"8px 11px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12.5}}/>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
          style={{padding:"8px 11px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12.5,background:"#fff"}}>
          <option value="ALL">All statuses</option>
          {["Active","Quoted","Booked","Completed","Cancelled"].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <button style={{padding:"8px 14px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,cursor:"pointer"}}>📥 Import</button>
        <button style={{padding:"8px 14px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,cursor:"pointer"}}>📤 Export</button>
        <button style={{padding:"8px 16px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>+ New Project / Tour Code</button>
      </div>
      <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead style={{background:"#f7f8fb"}}>
              <tr>
                <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Code</th>
                <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Project / Tour</th>
                <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Client</th>
                <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Period</th>
                <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Manager</th>
                <th style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Budget</th>
                <th style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Actual</th>
                <th style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Util %</th>
                <th style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p=>{
                const util=p.budget>0?Math.round(p.actual/p.budget*100):0;
                return (
                  <tr key={p.code} style={{borderBottom:"1px solid #f0f2f7"}}>
                    <td style={{padding:"9px 12px",fontFamily:"monospace",fontWeight:600,color:"#0d1326"}}>{p.code}</td>
                    <td style={{padding:"9px 12px",color:"#0d1326",fontWeight:600}}>{p.name}</td>
                    <td style={{padding:"9px 12px",color:"#0d1326"}}>{p.client}</td>
                    <td style={{padding:"9px 12px",color:"#5a6691",fontSize:11}}>{p.startDate} → {p.endDate}</td>
                    <td style={{padding:"9px 12px",color:"#0d1326"}}>{p.manager}</td>
                    <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:"#0d1326"}}>₹{(p.budget/1000).toFixed(0)}K</td>
                    <td style={{padding:"9px 12px",textAlign:"right",color:p.actual>p.budget?"#A32D2D":"#0d1326",fontWeight:600}}>₹{(p.actual/1000).toFixed(0)}K</td>
                    <td style={{padding:"9px 12px",textAlign:"center",color:util>100?"#A32D2D":util>80?"#856404":"#155724",fontWeight:700}}>{util}%</td>
                    <td style={{padding:"9px 12px",textAlign:"center"}}><span style={{padding:"2px 8px",background:statusColor[p.status],color:statusText[p.status],borderRadius:3,fontSize:10.5,fontWeight:600}}>{p.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
   5. DOCUMENT TYPE MASTER
   ════════════════════════════════════════════════════════════════════ */


export function ApprovalLimitsMaster(){
  const groupByType={};
  APPROVAL_LIMITS_DATA.forEach(a=>{
    if(!groupByType[a.voucherType])groupByType[a.voucherType]=[];
    groupByType[a.voucherType].push(a);
  });
  const fmt=n=>n>=999999999?"Unlimited":"₹"+n.toLocaleString("en-IN");
  return MASTER_PAGE("Approval Limits Master","Per-role × per-voucher-type thresholds. Defines automatic escalation in voucher workflow",
    <>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <p style={{margin:0,fontSize:12,color:"#5a6691"}}>{APPROVAL_LIMITS_DATA.length} rules configured across {Object.keys(groupByType).length} voucher types</p>
        <div style={{flex:1}}/>
        <button style={{padding:"8px 14px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,cursor:"pointer"}}>📤 Export Matrix</button>
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


export function NumberingSeriesMaster({branch}){
  const [filterBranch,setFilterBranch]=useState(branch==="ALL"?"ALL":branch?.code||"ALL");
  const [search,setSearch]=useState("");
  const filtered=NUMBERING_SERIES_DATA.filter(n=>{
    if(filterBranch!=="ALL"&&n.branch!==filterBranch) return false;
    if(!search) return true;
    const q=search.toLowerCase();
    return n.voucherType.toLowerCase().includes(q)||n.prefix.toLowerCase().includes(q)||n.format.toLowerCase().includes(q);
  });
  return MASTER_PAGE("Numbering Series Master","Per branch × per voucher type numbering. Format tokens: {YY} = 2-digit year, {YYYY} = 4-digit year, {####} = 4-digit sequence",
    <>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <input type="text" placeholder="Search type, prefix, format..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:"1 1 280px",minWidth:200,padding:"8px 11px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12.5}}/>
        <select value={filterBranch} onChange={e=>setFilterBranch(e.target.value)}
          style={{padding:"8px 11px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12.5,background:"#fff"}}>
          <option value="ALL">All branches</option>
          {["TKHO","BOM","AMD","NBO","DAR","FBM"].map(b=><option key={b} value={b}>{b}</option>)}
        </select>
        <button style={{padding:"8px 14px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,cursor:"pointer"}}>📥 Import</button>
        <button style={{padding:"8px 14px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,cursor:"pointer"}}>📤 Export</button>
        <button style={{padding:"8px 16px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>+ Add Series</button>
      </div>
      <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead style={{background:"#f7f8fb"}}>
            <tr>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Branch</th>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Voucher Type</th>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Prefix</th>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Format</th>
              <th style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Next No</th>
              <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Preview</th>
              <th style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Status</th>
              <th style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#5a6691",borderBottom:"1px solid #e1e3ec",fontSize:10.5,letterSpacing:"0.4px",textTransform:"uppercase"}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(n=>{
              const preview=n.format.replace("{YY}","26").replace("{YYYY}","2026").replace("{####}",String(n.nextNo).padStart(4,"0"));
              return (
                <tr key={n.id} style={{borderBottom:"1px solid #f0f2f7"}}>
                  <td style={{padding:"9px 12px"}}><span style={{padding:"2px 7px",background:"#e6e8f1",color:"#0d1326",borderRadius:3,fontSize:10.5,fontWeight:700}}>{n.branch}</span></td>
                  <td style={{padding:"9px 12px",color:"#0d1326",fontWeight:600}}>{n.voucherType}</td>
                  <td style={{padding:"9px 12px",fontFamily:"monospace",fontWeight:700,color:"#0d1326"}}>{n.prefix}</td>
                  <td style={{padding:"9px 12px",fontFamily:"monospace",color:"#5a6691"}}>{n.format}</td>
                  <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,color:"#0d1326"}}>{n.nextNo}</td>
                  <td style={{padding:"9px 12px",fontFamily:"monospace",color:"#d4a437",fontWeight:600}}>{preview}</td>
                  <td style={{padding:"9px 12px",textAlign:"center"}}><span style={{padding:"2px 7px",background:n.active?"#d4edda":"#f8d7da",color:n.active?"#155724":"#721c24",borderRadius:3,fontSize:10.5,fontWeight:600}}>{n.active?"Active":"Inactive"}</span></td>
                  <td style={{padding:"9px 12px",textAlign:"center"}}>
                    <button style={{padding:"3px 8px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:4,fontSize:10.5,cursor:"pointer",fontWeight:600}}>Edit</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
   5 ROLE-SPECIFIC DASHBOARDS
   Routes to specific dashboard via DashboardRouter based on currentUser.role
   ════════════════════════════════════════════════════════════════════ */

/* ── Shared seed data (demo) ──────────────────────────────────────── */


export function CustomerMasterTabbed(){
  const [tab,setTab]=useState("basic");
  const [active,setActive]=useState(true);
  const tabs=[
    {id:"basic",label:"1. Basic Info"},{id:"address",label:"2. Address"},
    {id:"contact",label:"3. Contact Persons"},{id:"bank",label:"4. Bank Details"},
    {id:"tax",label:"5. Tax Info"},{id:"credit",label:"6. Credit Terms"},
    {id:"docs",label:"7. Documents"},{id:"notes",label:"8. Notes"},
    {id:"history",label:"9. History"},{id:"linked",label:"10. Linked Vouchers"},
    {id:"outstanding",label:"11. Outstanding"},{id:"custom",label:"12. Custom Fields"},
  ];
  return TAB_Page("L&T Limited", "Customer Master · CUST-BOM-00128 · Class A · Standardised 12-tab structure",
    {user:"Faiz Patel",date:"2026-05-19 14:08",created:"2024-08-15 09:12"},
    <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
      <div style={{display:"flex",borderBottom:"1px solid #e1e3ec",overflowX:"auto",background:"#fafbfd"}}>
        {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={tabBtnStyle(tab===t.id)}>{t.label}</button>)}
      </div>
      {tab==="basic"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
          <FL label="Legal Name"><input defaultValue="Larsen & Toubro Limited" style={inpStd}/></FL>
          <FL label="Customer Code"><input defaultValue="CUST-BOM-00128" readOnly style={{...inpStd,fontFamily:"monospace",background:"#fafbfd"}}/></FL>
          <FL label="Customer Type"><select style={inpStd}><option>Corporate · Premium</option><option>Corporate · Standard</option><option>Individual</option><option>Travel Agent</option></select></FL>
          <FL label="Country"><select style={inpStd}><option>India</option><option>UAE</option><option>Kenya</option><option>Singapore</option></select></FL>
          <FL label="Industry"><input defaultValue="Engineering & Construction" style={inpStd}/></FL>
          <FL label="Branch"><select style={inpStd}><option>BOM (Mumbai)</option><option>AMD</option><option>TKHO</option></select></FL>
          <FL label="Account Manager"><select style={inpStd}><option>Rohan</option><option>Mohan</option></select></FL>
          <FL label="Status"><div style={{display:"flex",gap:8,alignItems:"center",marginTop:4}}>
            <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}><input type="radio" checked={active} onChange={()=>setActive(true)}/><span style={{fontSize:12}}>Active</span></label>
            <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}><input type="radio" checked={!active} onChange={()=>setActive(false)}/><span style={{fontSize:12}}>Inactive</span></label>
          </div></FL>
          <FL label="Source"><select style={inpStd}><option>Direct Referral</option><option>Cold Outreach</option><option>Digital Marketing</option></select></FL>
        </div>
      )}
      {tab==="address"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {[{type:"Billing",addr:"L&T Tower, Saki Vihar Road, Powai, Mumbai 400072, Maharashtra, India",icon:"📍"},
            {type:"Shipping",addr:"Same as billing address",icon:"🚚"},
            {type:"Registered Office",addr:"L&T House, NM Marg, Ballard Estate, Mumbai 400001, Maharashtra, India",icon:"🏢"}].map(a=>(
              <div key={a.type} style={{padding:12,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec"}}>
                <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase",letterSpacing:"0.4px"}}>{a.icon} {a.type} Address</p>
                <textarea defaultValue={a.addr} rows={3} style={{...inpStd,marginTop:6,fontFamily:"inherit",resize:"vertical"}}/>
              </div>))}
          <button style={{padding:18,background:"transparent",border:"1px dashed #d4a437",color:"#d4a437",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>+ Add another address</button>
        </div>
      )}
      {tab==="contact"&&tabPanel(
        <div>{[{n:"Priya Krishnan",r:"Travel Desk Manager",e:"priya.k@larsentoubro.com",p:"+91 98201 12345",pri:true},
          {n:"Rajat Verma",r:"Finance Controller",e:"rajat.v@larsentoubro.com",p:"+91 98201 54321",pri:false},
          {n:"Anjali Mehta",r:"Procurement Head",e:"anjali.m@larsentoubro.com",p:"+91 98201 99887",pri:false}].map((c,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"40px 1fr 1fr 1fr 1fr 80px",gap:10,alignItems:"center",padding:"10px 12px",background:"#fafbfd",borderRadius:6,marginBottom:8,border:"1px solid #e1e3ec"}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:"#0d1326",color:"#d4a437",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11}}>{c.n.substring(0,2).toUpperCase()}</div>
            <input defaultValue={c.n} style={inpStd}/>
            <input defaultValue={c.r} style={inpStd}/>
            <input defaultValue={c.e} style={{...inpStd,fontFamily:"monospace",fontSize:11}}/>
            <input defaultValue={c.p} style={inpStd}/>
            {c.pri?<span style={{padding:"3px 8px",background:"#d4a437",color:"#0d1326",borderRadius:3,fontSize:9.5,fontWeight:700,textAlign:"center"}}>PRIMARY</span>:<button style={{padding:"3px 8px",background:"transparent",border:"1px solid #e1e3ec",borderRadius:3,fontSize:9.5,cursor:"pointer",color:"#5a6691"}}>Set Primary</button>}
          </div>))}
          <button style={{marginTop:8,padding:"8px 14px",background:"transparent",border:"1px dashed #d4a437",color:"#d4a437",borderRadius:6,cursor:"pointer",fontSize:11.5,fontWeight:600}}>+ Add Contact Person</button>
        </div>
      )}
      {tab==="bank"&&tabPanel(
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead style={{background:"#f7f8fb"}}><tr>
            <th style={{padding:"9px 12px",textAlign:"left",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Bank</th>
            <th style={{padding:"9px 12px",textAlign:"left",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Account</th>
            <th style={{padding:"9px 12px",textAlign:"left",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>IFSC / SWIFT</th>
            <th style={{padding:"9px 12px",textAlign:"left",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Currency</th>
            <th style={{padding:"9px 12px",textAlign:"center",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Primary</th>
            <th style={{padding:"9px 12px",textAlign:"center",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Action</th>
          </tr></thead>
          <tbody>{[{b:"State Bank of India",a:"XXXX 7892",i:"SBIN0001234",c:"INR",p:true},{b:"HDFC Bank",a:"XXXX 1245",i:"HDFC0000045",c:"USD",p:false},{b:"ICICI Bank",a:"XXXX 5566",i:"ICIC0000004",c:"EUR",p:false}].map((b,i)=>(
            <tr key={i} style={{borderBottom:"1px solid #f0f2f7"}}>
              <td style={{padding:"10px 12px",fontWeight:600}}>{b.b}</td><td style={{padding:"10px 12px",fontFamily:"monospace"}}>{b.a}</td>
              <td style={{padding:"10px 12px",fontFamily:"monospace"}}>{b.i}</td><td style={{padding:"10px 12px"}}>{b.c}</td>
              <td style={{padding:"10px 12px",textAlign:"center",color:b.p?"#d4a437":"#cbd0dc",fontSize:16}}>★</td>
              <td style={{padding:"10px 12px",textAlign:"center"}}><button style={{padding:"3px 8px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:4,fontSize:10.5,cursor:"pointer",fontWeight:600}}>Edit</button></td>
            </tr>))}</tbody>
        </table>
      )}
      {tab==="tax"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FL label="GSTIN"><div style={{display:"flex",gap:6}}><input defaultValue="27AAACL0140P1Z6" style={{...inpStd,fontFamily:"monospace"}}/><span style={{padding:"6px 10px",background:"#d4edda",color:"#155724",borderRadius:4,fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>✓ VERIFIED</span></div></FL>
          <FL label="PAN"><input defaultValue="AAACL0140P" style={{...inpStd,fontFamily:"monospace"}}/></FL>
          <FL label="TAN"><input defaultValue="MUMU12345A" style={{...inpStd,fontFamily:"monospace"}}/></FL>
          <FL label="TIN (state)"><input defaultValue="27123456789" style={{...inpStd,fontFamily:"monospace"}}/></FL>
          <FL label="State Code"><input defaultValue="27 (Maharashtra)" readOnly style={{...inpStd,background:"#fafbfd"}}/></FL>
          <FL label="GST Treatment"><select style={inpStd}><option>Registered — Regular</option><option>Registered — Composition</option><option>Unregistered</option><option>SEZ</option></select></FL>
          <FL label="TDS Section"><select style={inpStd}><option>194C @ 2%</option><option>194J @ 10%</option><option>194I @ 10%</option><option>None</option></select></FL>
          <FL label="MSME Status"><select style={inpStd}><option>Not Registered (Large)</option><option>Micro</option><option>Small</option><option>Medium</option></select></FL>
        </div>
      )}
      {tab==="credit"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={{padding:14,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase",letterSpacing:"0.4px"}}>Credit Configuration</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
              <FL label="Credit Limit (₹)"><input defaultValue="800000" type="number" style={inpStd}/></FL>
              <FL label="Credit Period (days)"><input defaultValue="30" type="number" style={inpStd}/></FL>
              <FL label="Payment Terms"><select style={inpStd}><option>Net 30</option><option>Net 15</option><option>Net 45</option><option>Net 60</option><option>Advance</option></select></FL>
              <FL label="Late Payment Interest"><input defaultValue="18% pa" style={inpStd}/></FL>
            </div>
          </div>
          <div style={{padding:14,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase",letterSpacing:"0.4px"}}>Current Exposure</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
              <div><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Outstanding</p><p style={{margin:"3px 0 0",fontSize:18,fontWeight:700,color:"#0d1326"}}>₹4,85,000</p></div>
              <div><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Available</p><p style={{margin:"3px 0 0",fontSize:18,fontWeight:700,color:"#22c55e"}}>₹3,15,000</p></div>
              <div><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>DSO (avg)</p><p style={{margin:"3px 0 0",fontSize:18,fontWeight:700,color:"#22c55e"}}>28 d</p></div>
              <div><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Utilization</p><p style={{margin:"3px 0 0",fontSize:18,fontWeight:700,color:"#d4a437"}}>60%</p></div>
            </div>
            <div style={{marginTop:10,height:6,background:"#f0f2f7",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:"60%",background:"#d4a437"}}/></div>
          </div>
        </div>
      )}
      {tab==="docs"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
          {["GST Certificate","PAN Card","Master Service Agreement","Authorization Letter","Bank Mandate"].map(d=>(
            <div key={d} style={{padding:14,background:"#fafbfd",border:"1px solid #e1e3ec",borderRadius:6,textAlign:"center"}}>
              <p style={{margin:0,fontSize:32}}>📄</p>
              <p style={{margin:"6px 0 2px",fontSize:11.5,color:"#0d1326",fontWeight:600}}>{d}</p>
              <p style={{margin:0,fontSize:10,color:"#5a6691"}}>uploaded 2024-08-15</p>
              <div style={{marginTop:8,display:"flex",gap:4,justifyContent:"center"}}>
                <button style={{padding:"3px 8px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:4,fontSize:10,cursor:"pointer",fontWeight:600}}>View</button>
                <button style={{padding:"3px 8px",background:"transparent",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:4,fontSize:10,cursor:"pointer",fontWeight:600}}>↓</button>
              </div>
            </div>))}
          <button style={{padding:24,background:"transparent",border:"2px dashed #d4a437",color:"#d4a437",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>+ Upload</button>
        </div>
      )}
      {tab==="notes"&&tabPanel(
        <div>
          {[{ts:"2026-05-19 11:30",u:"Rohan",txt:"Priya confirmed Q2 budget of ₹50L for senior management travel — added to forecast",pin:true},
            {ts:"2026-04-22 14:00",u:"Rohan",txt:"Customer requested all bookings to be billed under MSA framework; updated billing terms accordingly",pin:false},
            {ts:"2025-12-08 09:15",u:"Faiz Patel",txt:"Approved credit limit increase ₹5L → ₹8L based on payment history (DSO 28 days)",pin:false}].map((n,i)=>(
            <div key={i} style={{padding:"10px 12px",background:n.pin?"#fff8e7":"#fafbfd",borderRadius:6,marginBottom:8,borderLeft:"3px solid "+(n.pin?"#d4a437":"#e1e3ec")}}>
              <p style={{margin:0,fontSize:12,color:"#0d1326",lineHeight:1.5}}>{n.pin&&"📌 "}{n.txt}</p>
              <p style={{margin:"4px 0 0",fontSize:10,color:"#5a6691"}}>{n.u} · {n.ts}</p>
            </div>))}
          <textarea placeholder="Add a sticky note..." rows={2} style={{...inpStd,marginTop:8,fontFamily:"inherit",resize:"vertical"}}/>
          <button style={{marginTop:6,padding:"6px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>📌 Pin Note</button>
        </div>
      )}
      {tab==="history"&&tabPanel(
        <>
          <p style={{margin:"0 0 12px",fontSize:11.5,color:"#5a6691"}}>Last 12 months transaction summary</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
            {[{l:"Bookings",v:"42",c:"#0d1326"},{l:"Revenue",v:"₹1.85 Cr",c:"#22c55e"},{l:"Avg Basket",v:"₹4.4L",c:"#d4a437"},{l:"DSO",v:"28 days",c:"#22c55e"}].map(k=>(
              <div key={k.l} style={{padding:12,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec",borderTop:"3px solid "+k.c}}>
                <p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p>
                <p style={{margin:"3px 0 0",fontSize:20,fontWeight:700,color:"#0d1326"}}>{k.v}</p>
              </div>))}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[{m:"Jun",r:1450000},{m:"Jul",r:1820000},{m:"Aug",r:1580000},{m:"Sep",r:2120000},{m:"Oct",r:1650000},{m:"Nov",r:1880000},{m:"Dec",r:2450000},{m:"Jan",r:1320000},{m:"Feb",r:1180000},{m:"Mar",r:1620000},{m:"Apr",r:1480000},{m:"May",r:1850000}]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7"/><XAxis dataKey="m" tick={{fontSize:10,fill:"#5a6691"}}/><YAxis tick={{fontSize:10,fill:"#5a6691"}} tickFormatter={v=>(v/100000).toFixed(0)+"L"}/><Tooltip formatter={v=>"₹"+v.toLocaleString("en-IN")}/>
              <Bar dataKey="r" fill="#d4a437"/>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
      {tab==="linked"&&tabPanel(
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead style={{background:"#f7f8fb"}}><tr>{["Voucher","Date","Type","Branch","Amount","Status","Action"].map((h,i)=><th key={h} style={{padding:"9px 12px",textAlign:i===4?"right":i===5||i===6?"center":"left",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>{[{v:"INV-BOM/2026/8742",d:"2026-05-20",t:"Tax Invoice",b:"BOM",a:142500,s:"Posted"},{v:"RV-BOM/2026/4521",d:"2026-05-19",t:"Receipt",b:"BOM",a:485000,s:"Cleared"},{v:"INV-BOM/2026/8721",d:"2026-05-15",t:"Tax Invoice",b:"BOM",a:325000,s:"Paid"},{v:"INV-BOM/2026/8688",d:"2026-05-08",t:"Tax Invoice",b:"BOM",a:185000,s:"Paid"},{v:"INV-BOM/2026/8654",d:"2026-04-28",t:"Tax Invoice",b:"BOM",a:265000,s:"Paid"}].map(r=>(
            <tr key={r.v} style={{borderBottom:"1px solid #f0f2f7"}}><td style={{padding:"9px 12px",fontFamily:"monospace",fontWeight:600}}>{r.v}</td><td style={{padding:"9px 12px",color:"#5a6691"}}>{r.d}</td><td style={{padding:"9px 12px"}}>{r.t}</td><td style={{padding:"9px 12px"}}><span style={{padding:"2px 6px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{r.b}</span></td><td style={{padding:"9px 12px",textAlign:"right",fontWeight:700}}>₹{r.a.toLocaleString("en-IN")}</td><td style={{padding:"9px 12px",textAlign:"center"}}><span style={{padding:"2px 8px",background:r.s==="Paid"||r.s==="Cleared"?"#d4edda":"#fff3cd",color:r.s==="Paid"||r.s==="Cleared"?"#155724":"#856404",borderRadius:3,fontSize:10,fontWeight:700}}>{r.s}</span></td><td style={{padding:"9px 12px",textAlign:"center"}}><button style={{padding:"3px 8px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:4,fontSize:10,cursor:"pointer",fontWeight:600}}>Open</button></td></tr>))}</tbody>
        </table>
      )}
      {tab==="outstanding"&&tabPanel(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
            {[{b:"Current",a:142500,c:"#22c55e"},{b:"1-30 d",a:185000,c:"#22c55e"},{b:"31-60 d",a:0,c:"#eab308"},{b:"61-90 d",a:0,c:"#f97316"},{b:">90 d",a:0,c:"#A32D2D"}].map(b=>(
              <div key={b.b} style={{padding:10,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec",borderLeft:"3px solid "+b.c}}>
                <p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{b.b}</p>
                <p style={{margin:"3px 0 0",fontSize:14,fontWeight:700,color:"#0d1326"}}>₹{b.a.toLocaleString("en-IN")}</p>
              </div>))}
          </div>
          <div style={cardStyle}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>Outstanding Invoices</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead style={{background:"#f7f8fb"}}><tr><th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#5a6691",fontWeight:700}}>Invoice</th><th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#5a6691",fontWeight:700}}>Date</th><th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#5a6691",fontWeight:700}}>Due Date</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Invoice Amt</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Outstanding</th><th style={{padding:"8px 12px",textAlign:"center",fontSize:10,color:"#5a6691",fontWeight:700}}>Days</th></tr></thead>
              <tbody>{[{v:"INV-BOM/2026/8742",d:"2026-05-20",dd:"2026-06-19",a:142500,o:142500,days:-30},{v:"INV-BOM/2026/8721",d:"2026-05-15",dd:"2026-06-14",a:325000,o:185000,days:-25}].map(r=>(
                <tr key={r.v} style={{borderBottom:"1px solid #f0f2f7"}}><td style={{padding:"8px 12px",fontFamily:"monospace",fontWeight:600}}>{r.v}</td><td style={{padding:"8px 12px",color:"#5a6691"}}>{r.d}</td><td style={{padding:"8px 12px",color:"#5a6691"}}>{r.dd}</td><td style={{padding:"8px 12px",textAlign:"right"}}>₹{r.a.toLocaleString("en-IN")}</td><td style={{padding:"8px 12px",textAlign:"right",fontWeight:700}}>₹{r.o.toLocaleString("en-IN")}</td><td style={{padding:"8px 12px",textAlign:"center",color:r.days<0?"#22c55e":"#A32D2D",fontWeight:700}}>{r.days<0?Math.abs(r.days)+"d left":r.days+"d overdue"}</td></tr>))}</tbody>
            </table>
            <div style={{marginTop:12,padding:10,background:"#0d1326",borderRadius:5,display:"flex",justifyContent:"space-between"}}><span style={{color:"#d4a437",fontSize:11.5,fontWeight:700}}>TOTAL OUTSTANDING</span><span style={{color:"#fff",fontSize:14,fontWeight:700,fontFamily:"monospace"}}>₹3,27,500</span></div>
          </div>
        </>
      )}
      {tab==="custom"&&tabPanel(
        <>
          <p style={{margin:"0 0 14px",fontSize:11.5,color:"#5a6691"}}>Custom fields defined for Customer master · <span style={{color:"#d4a437",fontWeight:600,cursor:"pointer"}}>Manage in Settings → Custom Fields Manager</span></p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <FL label="Procurement Portal ID"><input defaultValue="LT-VEND-00284" style={{...inpStd,fontFamily:"monospace"}}/></FL>
            <FL label="SLA Tier"><select style={inpStd}><option>Tier 1 — Premium</option><option>Tier 2 — Standard</option></select></FL>
            <FL label="Annual Booking Commitment"><input defaultValue="40" type="number" style={inpStd}/></FL>
            <FL label="Negotiated Markup %"><input defaultValue="3.5" type="number" step="0.1" style={inpStd}/></FL>
            <FL label="MSA Reference"><input defaultValue="MSA-2024-LT-001" style={inpStd}/></FL>
            <FL label="MSA Expiry"><input type="date" defaultValue="2027-03-31" style={inpStd}/></FL>
          </div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   2. SUPPLIER MASTER (12 tabs) — Air India BSP demo
   ════════════════════════════════════════════════════════════════════ */


export function SupplierMasterTabbed(){
  const [tab,setTab]=useState("basic");
  const tabs=[{id:"basic",label:"1. Basic Info"},{id:"address",label:"2. Address"},{id:"contact",label:"3. Contact Persons"},{id:"bank",label:"4. Bank Details"},{id:"tax",label:"5. Tax Info"},{id:"credit",label:"6. Payment Terms"},{id:"docs",label:"7. Documents"},{id:"notes",label:"8. Notes"},{id:"history",label:"9. History"},{id:"linked",label:"10. Linked Vouchers"},{id:"outstanding",label:"11. Outstanding"},{id:"custom",label:"12. Custom Fields"}];
  return TAB_Page("Air India Limited (BSP)", "Supplier Master · SUPP-BOM-AI001 · Tier-A · Same 12-tab structure as Customer Master",
    {user:"Sughra Sayed",date:"2026-05-18 16:30",created:"2018-04-12 11:00"},
    <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
      <div style={{display:"flex",borderBottom:"1px solid #e1e3ec",overflowX:"auto",background:"#fafbfd"}}>{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={tabBtnStyle(tab===t.id)}>{t.label}</button>)}</div>
      {tab==="basic"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
          <FL label="Legal Name"><input defaultValue="Air India Limited" style={inpStd}/></FL>
          <FL label="Supplier Code"><input defaultValue="SUPP-BOM-AI001" readOnly style={{...inpStd,fontFamily:"monospace",background:"#fafbfd"}}/></FL>
          <FL label="Supplier Type"><select style={inpStd}><option>Airline (BSP)</option><option>DMC</option><option>Hotel</option><option>Visa Service</option><option>Insurance</option><option>Transfer</option></select></FL>
          <FL label="Country"><select style={inpStd}><option>India</option><option>UAE</option><option>Kenya</option></select></FL>
          <FL label="Category"><input defaultValue="Domestic + International Airline" style={inpStd}/></FL>
          <FL label="Branch"><select style={inpStd}><option>BOM (Mumbai)</option><option>All Branches</option></select></FL>
          <FL label="Vendor Manager"><select style={inpStd}><option>Faiz Patel</option><option>Rohan</option></select></FL>
          <FL label="Status"><span style={{display:"inline-block",padding:"6px 12px",background:"#d4edda",color:"#155724",borderRadius:5,fontSize:12,fontWeight:700}}>✓ Active · BSP-eligible</span></FL>
          <FL label="Preferred"><label style={{display:"flex",alignItems:"center",gap:6,paddingTop:6,cursor:"pointer"}}><input type="checkbox" defaultChecked/><span style={{fontSize:12}}>Yes — Tier-A Vendor</span></label></FL>
        </div>
      )}
      {tab==="address"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={{padding:12,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase"}}>🏢 Head Office</p>
            <textarea defaultValue="Airlines House, 113 Gurudwara Rakabganj Road, New Delhi 110001, India" rows={3} style={{...inpStd,marginTop:6,fontFamily:"inherit",resize:"vertical"}}/>
          </div>
          <div style={{padding:12,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase"}}>📍 Mumbai Office</p>
            <textarea defaultValue="Air India Building, Nariman Point, Mumbai 400021, Maharashtra, India" rows={3} style={{...inpStd,marginTop:6,fontFamily:"inherit",resize:"vertical"}}/>
          </div>
        </div>
      )}
      {tab==="contact"&&tabPanel(
        <div>{[{n:"Sandeep Khanna",r:"GSA Manager — West India",e:"sandeep.khanna@airindia.in",p:"+91 22 2202 1234",pri:true},{n:"Priti Joshi",r:"Finance — Accounts Receivable",e:"priti.joshi@airindia.in",p:"+91 22 2202 5678",pri:false},{n:"BSP Helpdesk",r:"Settlement Support",e:"bsp.india@airindia.in",p:"+91 22 6649 9999",pri:false}].map((c,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"40px 1fr 1fr 1fr 1fr 80px",gap:10,alignItems:"center",padding:"10px 12px",background:"#fafbfd",borderRadius:6,marginBottom:8,border:"1px solid #e1e3ec"}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:"#A32D2D",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11}}>{c.n.substring(0,2).toUpperCase()}</div>
            <input defaultValue={c.n} style={inpStd}/><input defaultValue={c.r} style={inpStd}/>
            <input defaultValue={c.e} style={{...inpStd,fontFamily:"monospace",fontSize:11}}/><input defaultValue={c.p} style={inpStd}/>
            {c.pri?<span style={{padding:"3px 8px",background:"#d4a437",color:"#0d1326",borderRadius:3,fontSize:9.5,fontWeight:700,textAlign:"center"}}>PRIMARY</span>:<button style={{padding:"3px 8px",background:"transparent",border:"1px solid #e1e3ec",borderRadius:3,fontSize:9.5,cursor:"pointer"}}>Set Primary</button>}
          </div>))}
        </div>
      )}
      {tab==="bank"&&tabPanel(
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead style={{background:"#f7f8fb"}}><tr>{["Bank","Account","IFSC","Currency","Beneficiary","Primary"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>{[{b:"State Bank of India — BSP Settlement",a:"XXXX BSP01",i:"SBIN0000691",c:"INR",bn:"BSP India Settlement A/c",p:true},{b:"HDFC Bank — Direct",a:"XXXX 8847",i:"HDFC0000060",c:"INR",bn:"Air India Limited",p:false}].map((b,i)=>(
            <tr key={i} style={{borderBottom:"1px solid #f0f2f7"}}><td style={{padding:"10px 12px",fontWeight:600}}>{b.b}</td><td style={{padding:"10px 12px",fontFamily:"monospace"}}>{b.a}</td><td style={{padding:"10px 12px",fontFamily:"monospace"}}>{b.i}</td><td style={{padding:"10px 12px"}}>{b.c}</td><td style={{padding:"10px 12px",fontSize:11,color:"#5a6691"}}>{b.bn}</td><td style={{padding:"10px 12px",color:b.p?"#d4a437":"#cbd0dc",fontSize:16}}>★</td></tr>))}</tbody>
        </table>
      )}
      {tab==="tax"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FL label="GSTIN"><input defaultValue="07AAACA4471A1Z3" style={{...inpStd,fontFamily:"monospace"}}/></FL>
          <FL label="PAN"><input defaultValue="AAACA4471A" style={{...inpStd,fontFamily:"monospace"}}/></FL>
          <FL label="TAN"><input defaultValue="DELA12345B" style={{...inpStd,fontFamily:"monospace"}}/></FL>
          <FL label="IATA Code"><input defaultValue="098" style={{...inpStd,fontFamily:"monospace"}}/></FL>
          <FL label="BSP Code"><input defaultValue="14-2-9028" style={{...inpStd,fontFamily:"monospace"}}/></FL>
          <FL label="TDS Section"><select style={inpStd}><option>194O @ 0.1% (TDS on Transport)</option><option>None — exempted</option></select></FL>
          <FL label="MSME Status"><select style={inpStd}><option>Not Registered (PSU)</option><option>Micro</option><option>Small</option></select></FL>
          <FL label="GST Treatment"><select style={inpStd}><option>Registered Regular</option><option>SEZ</option></select></FL>
        </div>
      )}
      {tab==="credit"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={{padding:14,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase"}}>BSP Settlement Configuration</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
              <FL label="Settlement Cycle"><select style={inpStd}><option>Bi-Monthly (BSP)</option><option>Weekly</option><option>Monthly</option></select></FL>
              <FL label="Credit Days"><input defaultValue="15" type="number" style={inpStd}/></FL>
              <FL label="Payment Method"><select style={inpStd}><option>BSP NEFT</option><option>Bank Transfer</option><option>Cheque</option></select></FL>
              <FL label="Late Fee"><input defaultValue="As per IATA" style={inpStd}/></FL>
            </div>
          </div>
          <div style={{padding:14,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase"}}>Current Payable</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
              <div><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>This Cycle</p><p style={{margin:"3px 0 0",fontSize:18,fontWeight:700,color:"#0d1326"}}>₹2,85,000</p></div>
              <div><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Next Settlement</p><p style={{margin:"3px 0 0",fontSize:14,fontWeight:700,color:"#A32D2D"}}>2026-05-30</p></div>
              <div><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>DPO (avg)</p><p style={{margin:"3px 0 0",fontSize:18,fontWeight:700,color:"#22c55e"}}>14 d</p></div>
              <div><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Rating</p><p style={{margin:"3px 0 0",fontSize:14,fontWeight:700,color:"#d4a437"}}>⭐ Excellent</p></div>
            </div>
          </div>
        </div>
      )}
      {tab==="docs"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>{["GSA Agreement","BSP Settlement Mandate","IATA Authorization","GST Certificate","PAN Card"].map(d=>(<div key={d} style={{padding:14,background:"#fafbfd",border:"1px solid #e1e3ec",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:32}}>📄</p><p style={{margin:"6px 0 2px",fontSize:11.5,color:"#0d1326",fontWeight:600}}>{d}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>2018-04-12</p><button style={{marginTop:6,padding:"3px 10px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:4,fontSize:10,cursor:"pointer",fontWeight:600}}>View</button></div>))}</div>
      )}
      {tab==="notes"&&tabPanel(
        <div>{[{ts:"2026-05-18 10:00",u:"Faiz Patel",txt:"BSP settlement amounts to be reconciled against IATA Cycle Statement before payment release",pin:true},{ts:"2026-04-15 14:20",u:"Rohan",txt:"Air India introduced 5% fuel surcharge effective May 1 — communicated to all consultants",pin:false}].map((n,i)=>(<div key={i} style={{padding:"10px 12px",background:n.pin?"#fff8e7":"#fafbfd",borderRadius:6,marginBottom:8,borderLeft:"3px solid "+(n.pin?"#d4a437":"#e1e3ec")}}><p style={{margin:0,fontSize:12,color:"#0d1326",lineHeight:1.5}}>{n.pin&&"📌 "}{n.txt}</p><p style={{margin:"4px 0 0",fontSize:10,color:"#5a6691"}}>{n.u} · {n.ts}</p></div>))}</div>
      )}
      {tab==="history"&&tabPanel(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>{[{l:"Vouchers (12m)",v:"285",c:"#0d1326"},{l:"Total Spend",v:"₹4.25 Cr",c:"#A32D2D"},{l:"Avg per Voucher",v:"₹1.49L",c:"#d4a437"},{l:"DPO",v:"14 days",c:"#22c55e"}].map(k=>(<div key={k.l} style={{padding:12,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec",borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"3px 0 0",fontSize:20,fontWeight:700,color:"#0d1326"}}>{k.v}</p></div>))}</div>
        </>
      )}
      {tab==="linked"&&tabPanel(
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead style={{background:"#f7f8fb"}}><tr>{["Voucher","Date","Type","Amount","Status"].map((h,i)=><th key={h} style={{padding:"9px 12px",textAlign:i===3?"right":i===4?"center":"left",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>{[{v:"PV-BOM/2026/0892",d:"2026-05-20",t:"Payment",a:285000,s:"Cleared"},{v:"BSP-BOM/2026/0287",d:"2026-05-15",t:"Purchase Bill",a:285000,s:"Posted"},{v:"PV-BOM/2026/0865",d:"2026-05-05",t:"Payment",a:412000,s:"Cleared"},{v:"BSP-BOM/2026/0252",d:"2026-04-30",t:"Purchase Bill",a:412000,s:"Paid"}].map(r=>(<tr key={r.v} style={{borderBottom:"1px solid #f0f2f7"}}><td style={{padding:"9px 12px",fontFamily:"monospace",fontWeight:600}}>{r.v}</td><td style={{padding:"9px 12px",color:"#5a6691"}}>{r.d}</td><td style={{padding:"9px 12px"}}>{r.t}</td><td style={{padding:"9px 12px",textAlign:"right",fontWeight:700}}>₹{r.a.toLocaleString("en-IN")}</td><td style={{padding:"9px 12px",textAlign:"center"}}><span style={{padding:"2px 8px",background:r.s==="Paid"||r.s==="Cleared"?"#d4edda":"#fff3cd",color:r.s==="Paid"||r.s==="Cleared"?"#155724":"#856404",borderRadius:3,fontSize:10,fontWeight:700}}>{r.s}</span></td></tr>))}</tbody>
        </table>
      )}
      {tab==="outstanding"&&tabPanel(
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>Open BSP Settlements (we owe)</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}><thead style={{background:"#f7f8fb"}}><tr><th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#5a6691",fontWeight:700}}>Bill</th><th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#5a6691",fontWeight:700}}>Cycle</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Bill Amt</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Outstanding</th><th style={{padding:"8px 12px",textAlign:"center",fontSize:10,color:"#5a6691",fontWeight:700}}>Due Date</th></tr></thead>
          <tbody><tr style={{borderBottom:"1px solid #f0f2f7"}}><td style={{padding:"8px 12px",fontFamily:"monospace",fontWeight:600}}>BSP-BOM/2026/0301</td><td style={{padding:"8px 12px"}}>May Cycle 2</td><td style={{padding:"8px 12px",textAlign:"right"}}>₹185,000</td><td style={{padding:"8px 12px",textAlign:"right",fontWeight:700}}>₹185,000</td><td style={{padding:"8px 12px",textAlign:"center",color:"#22c55e",fontWeight:600}}>10d left</td></tr></tbody></table>
          <div style={{marginTop:12,padding:10,background:"#0d1326",borderRadius:5,display:"flex",justifyContent:"space-between"}}><span style={{color:"#d4a437",fontSize:11.5,fontWeight:700}}>TOTAL PAYABLE TO AIR INDIA</span><span style={{color:"#fff",fontSize:14,fontWeight:700,fontFamily:"monospace"}}>₹1,85,000</span></div>
        </div>
      )}
      {tab==="custom"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FL label="IATA Approval Date"><input type="date" defaultValue="2018-04-12" style={inpStd}/></FL>
          <FL label="GSA Code"><input defaultValue="GSA-MUM-098" style={{...inpStd,fontFamily:"monospace"}}/></FL>
          <FL label="Commission Slab"><select style={inpStd}><option>Standard (1%)</option><option>Volume Plus (1.5%)</option><option>Premium (2%)</option></select></FL>
          <FL label="Performance Bond"><input defaultValue="₹5,00,000" style={inpStd}/></FL>
        </div>
      )}
    </div>
  );
}

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
              <CMDLabel label="Customer Name"><input style={inp} defaultValue="L&T Limited"/></CMDLabel>
              <CMDLabel label="Type"><select style={inp}><option>Corporate</option><option>Individual</option><option>Sub-Agent</option><option>Govt / PSU</option></select></CMDLabel>
              <CMDLabel label="Branch"><select style={inp}><option>BOM</option><option>AMD</option><option>TKHO</option><option>NBO</option><option>DAR</option><option>FBM</option></select></CMDLabel>
              <CMDLabel label="Industry"><select style={inp}><option>Engineering & Construction</option><option>IT/ITES</option><option>Manufacturing</option><option>BFSI</option></select></CMDLabel>
              <CMDLabel label="Credit Limit"><input type="number" style={inp} defaultValue="5000000"/></CMDLabel>
              <CMDLabel label="Credit Days"><input type="number" style={inp} defaultValue="45"/></CMDLabel>
              <CMDLabel label="Default Currency"><select style={inp}><option>INR</option><option>USD</option><option>EUR</option></select></CMDLabel>
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
              {[{name:"Mr. Rajesh Iyer",role:"Travel Manager",email:"rajesh.iyer@lntech.com",phone:"+91 98200 12345"},{name:"Ms. Priya Sharma",role:"Finance Controller",email:"priya.sharma@lntech.com",phone:"+91 98200 67890"},{name:"Mr. Anil Joshi",role:"Procurement Head",email:"anil.joshi@lntech.com",phone:"+91 98200 24680"}].map((c,i)=>(
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
              {[{ts:"2026-05-14 11:42",user:"Rohan",action:"Credit limit increased ₹40L → ₹50L"},{ts:"2026-05-08 14:20",user:"Faiz Patel",action:"Approved credit limit increase"},{ts:"2026-04-01 09:15",user:"Rohan",action:"Updated annual agreement document"},{ts:"2026-03-12 16:40",user:"Rohan",action:"Added contact: Mr. Anil Joshi"},{ts:"2026-02-28 10:30",user:"Sughra Sayed",action:"Updated billing address"},{ts:"2024-04-10 12:00",user:"AD",action:"Created customer master"}].map((h,i)=>(
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
                <CMDLabel label="Account Manager"><input style={inp} defaultValue="Rohan (BOM)"/></CMDLabel>
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
        <span>Last modified by <b style={{color:"#0d1326"}}>Rohan</b> on 2026-05-14 11:42</span>
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
                {[{r:1,code:"CUST-BOM-00200",name:"Adani Group",gst:"24AAACA0123F1ZK",status:"valid"},{r:2,code:"CUST-BOM-00201",name:"Bajaj Auto Ltd.",gst:"27AAACB1234D1ZS",status:"valid"},{r:3,code:"CUST-BOM-00202",name:"Wipro Limited",gst:"29AAACW0987A1ZP",status:"warning",msg:"Possible duplicate of CUST-BOM-00098"},{r:4,code:"CUST-BOM-00203",name:"HCL Technologies",gst:"INVALID-GSTIN",status:"error",msg:"GSTIN format invalid"},{r:5,code:"CUST-BOM-00204",name:"Mahindra Group",gst:"27AAACM0001H1ZE",status:"valid"},{r:6,code:"CUST-BOM-00205",name:"",gst:"27AAACN0078J1ZA",status:"error",msg:"Customer Name is required"},{r:7,code:"CUST-BOM-00206",name:"Maruti Suzuki",gst:"06AAACM5678K1ZG",status:"valid"}].map(row=>(
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
          <tbody>{[{date:"2026-05-14",type:"Customers",user:"Faiz Patel",rows:42,imported:40,status:"Complete"},{date:"2026-04-22",type:"Forex Rates",user:"Sughra Sayed",rows:7,imported:7,status:"Complete"},{date:"2026-04-01",type:"Suppliers",user:"AD",rows:124,imported:120,status:"Complete"}].map((r,i)=>(<tr key={i}><td style={RPT_tdStyle}>{r.date}</td><td style={RPT_tdStyle}>{r.type}</td><td style={RPT_tdStyle}>{r.user}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{r.rows}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#22c55e"}}>{r.imported}</td><td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",background:"#d4edda",color:"#155724",borderRadius:3,fontSize:10,fontWeight:700}}>{r.status}</span></td></tr>))}</tbody>
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
  const [target, setTarget] = useState("L&T Limited (CUST-BOM-00142)");
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
              <option>L T Group (CUST-AMD-00012)</option>
              <option>L &amp; T Limited (CUST-BOM-00098)</option>
              <option>L&amp;T Ltd (CUST-BOM-00103)</option>
            </select>
          </div>
          <div>
            <label style={{fontSize:11,color:"#22c55e",fontWeight:700,textTransform:"uppercase",marginBottom:4,display:"block"}}>Target (will keep)</label>
            <select value={target} onChange={e=>setTarget(e.target.value)} style={{...inp,borderColor:"#22c55e"}}>
              <option>L&amp;T Limited (CUST-BOM-00142)</option>
              <option>Reliance Industries (CUST-BOM-00021)</option>
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
                {field:"Name",src:"L T Group",tgt:"L&T Limited",result:"L&T Limited"},
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
          <tbody>{[{date:"2026-04-15",type:"Suppliers",merge:"Emirates GS (BOM) → Emirates Airlines",user:"Faiz Patel",txns:48},{date:"2026-03-08",type:"Customers",merge:"Sharma & Co → Sharma Enterprises",user:"Afshin Dhanani",txns:124}].map((m,i)=>(<tr key={i}><td style={RPT_tdStyle}>{m.date}</td><td style={RPT_tdStyle}>{m.type}</td><td style={RPT_tdStyle}>{m.merge}</td><td style={RPT_tdStyle}>{m.user}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{m.txns}</td></tr>))}</tbody>
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
  const [modal,setModal]=useState(false);
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

      <div style={{...card,padding:0,overflow:"hidden"}}>
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
              <FL label="Branch"><select value={form.branch} onChange={e=>setForm(f=>({...f,branch:e.target.value}))} style={inp}>{["TKHO","BOM","AMD","NBO","DAR","FBM"].map(b=><option key={b}>{b}</option>)}</select></FL>
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
