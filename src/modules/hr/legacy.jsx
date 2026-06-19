/* ════════════════════════════════════════════════════════════════════
   MODULES/HR.JSX
   Auto-generated from KBiz360_v2.jsx · 2204 lines · 18 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from 'react';
import { AlertTriangle, BarChart2, Calendar, Check, Download, Lock, Plus, Save, Search, Settings, Users } from 'lucide-react';
import { Legend, Line } from 'recharts';
import { BRANCHES, EMP_LOANS_DATA, HR_BRANCHES_F, HR_DEPTS, HR_EMPLOYEES_DATA } from '../../core/data';
import { fmt, fmtINR } from '../../core/format';
import { Breadcrumb, FEEDBACK_360_DATA, GRP_COLORS, MY_CLAIMS_DATA, MY_PAYSLIP_DATA, PERFORMANCE_REVIEWS, SKILLS_DATA, TAB_Page, _EXPENSE_CLAIMS, _LEAVES, _LEAVE_BALANCES, _REVISION_DUE, _SALARY_HISTORY, cardStyle, tabPanel } from '../../core/helpers';
import { useMobile } from '../../core/hooks';
import { useModalEsc } from '../../core/ux/useModalEsc';
import { useExpenseLedgers, useFiscalYears, useExpenseBudgets } from '../../core/useReference';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPut } from '../../core/api';
import { B, FL, RPT_tdStyle, RPT_thStyle, bc, btnG, btnGh, card, inp, inpStd, tabBtnStyle } from '../../core/styles';
import { PHASE2_Page } from '../../shell/PHASE2_Page';

export function ExpenseBudget({branch,setRoute}){
  const mob=useMobile();
  const EXP_LEDGERS=useExpenseLedgers().data||[];          // DB-backed (/api/expense-ledgers)
  const FY_LIST=useFiscalYears().data||[];                 // DB-backed (/api/fiscal-years)
  const budgetRows=useExpenseBudgets().data;               // DB-backed (/api/expense-budgets)
  const qc=useQueryClient();
  const saveMut=useMutation({mutationFn:(payload)=>apiPut('/api/expense-budgets/bulk',payload),onSuccess:()=>qc.invalidateQueries({queryKey:['ref','expense-budgets']})});
  const [fy,setFy]=useState("2025-26");
  const [tab,setTab]=useState("monthly");
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(null);
  const [groupFilter,setGroupFilter]=useState("All");
  /* When ALL selected, let user pick which branch to configure */
  const [activeBr,setActiveBr]=useState(null);
  const isAll=branch==="ALL";
  const brObj=isAll?(activeBr||BRANCHES[1]):(branch||BRANCHES[1]);
  const brCode=brObj?.code||"BOM";
  const cfg=bc(brObj);
  const cur=cfg.cur;
  const fyObj=FY_LIST.find(f=>f.v===fy)||FY_LIST[1]||{l:fy,v:fy};
  const groups=["All",...new Set(EXP_LEDGERS.map(l=>l.group))];
  const visLedgers=EXP_LEDGERS.filter(l=>groupFilter==="All"||l.group===groupFilter);
  const saved=useMemo(()=>{
    const rows=(budgetRows||[]).filter(r=>r.branch===brCode&&r.fy===fy);
    return Object.fromEntries(rows.map(r=>[r.ledgerCode,{monthly:r.monthly,yearly:r.yearly}]));
  },[budgetRows,brCode,fy]);
  const tgts=draft||saved;
  const totM=EXP_LEDGERS.reduce((s,l)=>s+(tgts[l.id]?.monthly||0),0);
  const totY=EXP_LEDGERS.reduce((s,l)=>s+(tgts[l.id]?.yearly||0),0);

  const startEdit=()=>{const base={};EXP_LEDGERS.forEach(l=>{const s=saved[l.id]||{monthly:0,yearly:0};base[l.id]={monthly:s.monthly,yearly:s.yearly||s.monthly*12};});setDraft(base);setEditing(true);};
  const cancelEdit=()=>{setDraft(null);setEditing(false);};
  const saveEdit=()=>{
    const rows=Object.entries(draft||{}).map(([ledgerCode,v])=>({ledgerCode,monthly:v.monthly,yearly:v.yearly}));
    saveMut.mutate({branch:brCode,fy,rows});
    setDraft(null);setEditing(false);
  };
  const updM=(id,v)=>setDraft(d=>({...d,[id]:{...d[id],monthly:+v,yearly:Math.round(+v*12)}}));
  const updY=(id,v)=>setDraft(d=>({...d,[id]:{...d[id],yearly:+v,monthly:Math.round(+v/12)}}));
  const f=n=>n>=1000000?(n/100000).toFixed(1)+"L":n>=1000?(n/1000).toFixed(0)+"K":n>0?String(n):"—";
  const ff=n=>n>0?cur+Number(n).toLocaleString("en-IN"):"—";

  return (
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>💰</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Expense Budget</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{brCode} · {fyObj.l} · Ledger-wise</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <select value={fy} onChange={e=>setFy(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {FY_LIST.map(f=><option key={f.v} value={f.v}>{f.l}</option>)}
          </select>
          <select value={groupFilter} onChange={e=>setGroupFilter(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {groups.map(g=><option key={g}>{g}</option>)}
          </select>
          {!editing
            ?<button onClick={startEdit} style={{...btnG,background:"#185FA5",fontSize:11}}>✏ Set / Edit Budget</button>
            :<><button onClick={cancelEdit} style={btnGh}>Cancel</button><button onClick={saveEdit} style={btnG}>💾 Save Budget</button></>
          }
          <button onClick={()=>setRoute("/reports/exp-bgt")} style={{...btnGh,fontSize:11,display:"flex",alignItems:"center",gap:5}}><BarChart2 size={13}/> BGT vs ACT</button>
        </div>
      </div>

      {/* Branch tabs when ALL selected */}
      {isAll&&(
        <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
          <p style={{margin:"auto 6px auto 0",fontSize:10.5,color:"#5a6691",fontWeight:600}}>Configure branch:</p>
          {BRANCHES.map(b=>(
            <button key={b.code} onClick={()=>{setActiveBr(b);setEditing(false);setDraft(null);}}
              style={{padding:"5px 12px",borderRadius:7,border:"1px solid #e1e3ec",fontSize:11,cursor:"pointer",
                fontWeight:brCode===b.code?700:400,
                background:brCode===b.code?"#0d1326":"#fff",
                color:brCode===b.code?"#d4a437":"#5a6691"}}>
              {b.flag} {b.code}<span style={{marginLeft:5,padding:"1px 6px",background:b.isHO?"#d4a437":"#e1e3ec",color:b.isHO?"#0d1326":"#5a6691",borderRadius:3,fontSize:8.5,fontWeight:700,letterSpacing:"0.3px"}}>{b.isHO?"Main Branch":"Branch"}</span>
            </button>
          ))}
        </div>
      )}

      {/* KPI cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #185FA5",padding:"12px 14px",background:"#E6F1FB"}}><p style={{margin:0,fontSize:9.5,fontWeight:700,color:"#185FA5",textTransform:"uppercase",letterSpacing:"0.4px"}}>Monthly Budget</p><p style={{margin:"4px 0 2px",fontSize:mob?17:21,fontWeight:800,color:"#0d1326"}}>{cur+f(totM)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{`${EXP_LEDGERS.filter(l=>tgts[l.id]?.monthly>0).length} ledgers set`}</p></div>
          <div style={{...card,borderTop:"3px solid #27500A",padding:"12px 14px",background:"#EAF3DE"}}><p style={{margin:0,fontSize:9.5,fontWeight:700,color:"#27500A",textTransform:"uppercase",letterSpacing:"0.4px"}}>Annual Budget</p><p style={{margin:"4px 0 2px",fontSize:mob?17:21,fontWeight:800,color:"#0d1326"}}>{cur+f(totY)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{fyObj.l}</p></div>
          <div style={{...card,borderTop:"3px solid #854F0B",padding:"12px 14px",background:"#FAEEDA"}}><p style={{margin:0,fontSize:9.5,fontWeight:700,color:"#854F0B",textTransform:"uppercase",letterSpacing:"0.4px"}}>Branch</p><p style={{margin:"4px 0 2px",fontSize:mob?17:21,fontWeight:800,color:"#0d1326"}}>{brCode}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{cfg.taxType+" · "+cur}</p></div>
      </div>

      {/* View tabs */}
      <div style={{display:"flex",gap:6,marginBottom:10}}>
        <button onClick={()=>setTab("monthly")} style={{padding:"6px 10px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab==="monthly"?700:500,background:tab==="monthly"?"#0d1326":"transparent",color:tab==="monthly"?"#d4a437":"#5a6691",borderRadius:6}}>Monthly Budget</button><button onClick={()=>setTab("yearly")} style={{padding:"6px 10px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab==="yearly"?700:500,background:tab==="yearly"?"#0d1326":"transparent",color:tab==="yearly"?"#d4a437":"#5a6691",borderRadius:6}}>Yearly Budget</button><button onClick={()=>setTab("actuals")} style={{padding:"6px 10px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab==="actuals"?700:500,background:tab==="actuals"?"#0d1326":"transparent",color:tab==="actuals"?"#d4a437":"#5a6691",borderRadius:6}}>Actuals</button>
      </div>

      {/* Monthly / Yearly table */}
      {(tab==="monthly"||tab==="yearly")&&(
        <div style={{...card,padding:0,overflow:"hidden"}}>
          {editing&&<div style={{padding:"9px 14px",background:"#FAEEDA",borderBottom:"1px solid #FAC775",fontSize:10.5,color:"#854F0B",fontWeight:600}}>✏ Editing {brCode} — {fyObj.l} — changing monthly auto-updates yearly (×12)</div>}
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#0d1326"}}>
              <th style={{padding:"10px 14px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:10}}>Expense Ledger</th>
              <th style={{padding:"10px 14px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:10}}>Group</th>
              <th style={{padding:"10px 14px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:10}}>Monthly Budget ({cur})</th>
              <th style={{padding:"10px 14px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:10}}>Annual Budget ({cur})</th>
              {tab==="monthly"&&<th style={{padding:"10px 14px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:10}}>% of Total</th>}
            </tr></thead>
            <tbody>{visLedgers.map((l,i)=>{
              const t=tgts[l.id]||{monthly:0,yearly:0};
              const pct=totM>0?+(t.monthly/totM*100).toFixed(1):0;
              const gc=GRP_COLORS[l.group]||"#384677";
              return (
                <tr key={l.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"10px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:16}}>{l.icon}</span>
                      <span style={{fontWeight:600,color:"#0d1326"}}>{l.name}</span>
                    </div>
                  </td>
                  <td style={{padding:"10px 14px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:gc+"22",color:gc}}>{l.group}</span></td>
                  {editing?(
                    <>
                      <td style={{padding:"6px 10px"}}><input type="number" value={draft?.[l.id]?.monthly||0} onChange={e=>updM(l.id,e.target.value)} style={{...inp,textAlign:"right",minHeight:32}}/><p style={{margin:"2px 0 0",fontSize:8.5,color:"#5a6691",textAlign:"right"}}>{cur}{f(draft?.[l.id]?.monthly||0)}</p></td>
                      <td style={{padding:"6px 10px"}}><input type="number" value={draft?.[l.id]?.yearly||0} onChange={e=>updY(l.id,e.target.value)} style={{...inp,textAlign:"right",minHeight:32}}/><p style={{margin:"2px 0 0",fontSize:8.5,color:"#5a6691",textAlign:"right"}}>{cur}{f(draft?.[l.id]?.yearly||0)}</p></td>
                    </>
                  ):(
                    <>
                      <td style={{padding:"10px 14px",textAlign:"right"}}>{t.monthly>0?<div><p style={{margin:0,fontWeight:700,color:"#0d1326",fontSize:13,fontVariantNumeric:"tabular-nums"}}>{ff(t.monthly)}</p><p style={{margin:0,fontSize:9,color:"#5a6691"}}>{cur}{f(t.monthly)}</p></div>:<span style={{color:"#bfc3d6",fontSize:11}}>Not set</span>}</td>
                      <td style={{padding:"10px 14px",textAlign:"right"}}>{t.yearly>0?<div><p style={{margin:0,fontWeight:700,color:"#185FA5",fontSize:13,fontVariantNumeric:"tabular-nums"}}>{ff(t.yearly)}</p><p style={{margin:0,fontSize:9,color:"#5a6691"}}>{cur}{f(t.yearly)}</p></div>:<span style={{color:"#bfc3d6",fontSize:11}}>Not set</span>}</td>
                    </>
                  )}
                  {tab==="monthly"&&!editing&&<td style={{padding:"10px 14px",textAlign:"right"}}>{pct>0&&<div><span style={{fontSize:11,fontWeight:700,color:"#384677"}}>{pct}%</span><div style={{background:"#f3f4f8",borderRadius:999,height:6,marginTop:4,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(pct*3,100)}%`,background:gc,borderRadius:999}}/></div></div>}</td>}
                </tr>
              );
            })}</tbody>
            <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
              <td colSpan={2} style={{padding:"11px 14px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL — {fyObj.l} · {brCode}</td>
              <td style={{padding:"11px 14px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums",fontSize:14}}>{cur+Number(totM).toLocaleString("en-IN")}/mo</td>
              <td style={{padding:"11px 14px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums",fontSize:14}}>{cur+Number(totY).toLocaleString("en-IN")}/yr</td>
              {tab==="monthly"&&<td style={{padding:"11px 14px",textAlign:"right",color:"#d4a437",fontWeight:700}}>100%</td>}
            </tr></tfoot>
          </table>
        </div>
      )}

      {/* 12-Month Spread */}
      {tab==="spread"&&(
        <div style={{...card,padding:0,overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:10.5,minWidth:1100}}>
            <thead><tr style={{background:"#0d1326"}}>
              <th style={{padding:"9px 12px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:10,position:"sticky",left:0,background:"#0d1326",minWidth:160}}>Ledger</th>
              {fyObj.months.map((m,i)=><th key={i} style={{padding:"9px 8px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{m}</th>)}
              <th style={{padding:"9px 12px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:10}}>Annual</th>
            </tr></thead>
            <tbody>{visLedgers.map((l,i)=>{
              const t=tgts[l.id]||{monthly:0,yearly:0};
              return (
                <tr key={l.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326",position:"sticky",left:0,background:i%2===0?"#fff":"#fafafa",borderRight:"1px solid #e1e3ec"}}>{l.icon} {l.name}</td>
                  {fyObj.months.map((_,mi)=><td key={mi} style={{padding:"8px 8px",textAlign:"right",color:t.monthly>0?"#384677":"#bfc3d6",fontVariantNumeric:"tabular-nums"}}>{t.monthly>0?f(t.monthly):"—"}</td>)}
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>{t.yearly>0?f(t.yearly):"—"}</td>
                </tr>
              );
            })}</tbody>
            <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
              <td style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",position:"sticky",left:0,background:"#0d1326"}}>TOTAL</td>
              {fyObj.months.map((_,mi)=><td key={mi} style={{padding:"9px 8px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(totM)}</td>)}
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totY)}</td>
            </tr></tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EXPENSE BGT vs ACT REPORT — MTD / YTD / Annual · Travkings Group
   ════════════════════════════════════════════════════════════════ */

export function HrEmployees({branch}){
  const mob=useMobile();
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [selected,setSelected]=useState(null);
  const [search,setSearch]=useState("");
  const [deptFilter,setDeptFilter]=useState("All");
  const [brFilter,setBrFilter]=useState(branch==="ALL"?"All":branch?.code||"All");
  const [emps,setEmps]=useState(HR_EMPLOYEES_DATA);

  const filtered=emps.filter(e=>(
    (deptFilter==="All"||e.dept===deptFilter)&&
    (brFilter==="All"||e.branch===brFilter)&&
    (!search||e.name.toLowerCase().includes(search.toLowerCase())||
     e.id.toLowerCase().includes(search.toLowerCase())||
     e.desig.toLowerCase().includes(search.toLowerCase()))
  ));

  const DEPT_CLR={"Operations":"#185FA5","Sales":"#27500A","Accounts":"#854F0B","IT":"#384677","HR & Admin":"#A32D2D"};
  const brCfg=e=>BRANCHES.find(b=>b.code===e.branch)||{cur:"₹",curCode:"INR"};

  const gross=e=>e.basic+e.hra+e.da+e.travel+e.medical;
  const deductions=e=>e.pf+e.esi+e.tds;
  const net=e=>gross(e)-deductions(e);

  return (
    <div style={{padding:"12px 10px",maxWidth:1300,margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
        flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#E6F1FB",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>👥</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Employee Master</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>
              {filtered.length} employees · All branches · {new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"})}
            </p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <select value={brFilter} onChange={e=>setBrFilter(e.target.value)}
            style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {HR_BRANCHES_F.map(b=><option key={b}>{b}</option>)}
          </select>
          <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}
            style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {HR_DEPTS.map(d=><option key={d}>{d}</option>)}
          </select>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search name, ID, designation..." style={{...inp,width:220,minHeight:32,fontSize:11}}/>
          <button onClick={()=>{setSelected(null);setModal(true);}}
            style={{...btnG,fontSize:11}}><Plus size={13}/> New Employee</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #185FA5",padding:"11px 14px",background:"#E6F1FB"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#185FA5",textTransform:"uppercase",letterSpacing:"0.5px"}}>Total Employees</p><p style={{margin:"4px 0 0",fontSize:24,fontWeight:800,color:"#0d1326"}}>{String(emps.length)}</p></div>
          <div style={{...card,borderTop:"3px solid #27500A",padding:"11px 14px",background:"#EAF3DE"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#27500A",textTransform:"uppercase",letterSpacing:"0.5px"}}>Active</p><p style={{margin:"4px 0 0",fontSize:24,fontWeight:800,color:"#0d1326"}}>{String(emps.filter(e=>e.status==="Active").length)}</p></div>
          <div style={{...card,borderTop:"3px solid #854F0B",padding:"11px 14px",background:"#FAEEDA"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#854F0B",textTransform:"uppercase",letterSpacing:"0.5px"}}>Branches</p><p style={{margin:"4px 0 0",fontSize:24,fontWeight:800,color:"#0d1326"}}>5</p></div>
          <div style={{...card,borderTop:"3px solid #384677",padding:"11px 14px",background:"#f3f4f8"}}><p style={{margin:0,fontSize:9,fontWeight:700,color:"#384677",textTransform:"uppercase",letterSpacing:"0.5px"}}>Departments</p><p style={{margin:"4px 0 0",fontSize:24,fontWeight:800,color:"#0d1326"}}>{String(new Set(emps.map(e=>e.dept)).size)}</p></div>
      </div>

      {/* Employee table */}
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Emp ID","Employee Name","Branch","Department","Designation","Gross Salary","Net Salary","Status",""].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=5&&i<=6?"right":"left",
                color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((e,i)=>{
            const bc2=brCfg(e);
            const c=DEPT_CLR[e.dept]||"#384677";
            return (
              <tr key={e.id} style={{borderBottom:"1px solid #f3f4f8",
                background:i%2===0?"#fff":"#fafafa",cursor:"pointer"}}
                onMouseEnter={ev=>ev.currentTarget.style.background="#f0f4ff"}
                onMouseLeave={ev=>ev.currentTarget.style.background=i%2===0?"#fff":"#fafafa"}
                onClick={()=>{setSelected(e);setModal(true);}}>
                <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:10.5,
                  fontWeight:700,color:"#185FA5"}}>{e.id}</td>
                <td style={{padding:"9px 12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,
                      background:c+"22",display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:12,fontWeight:700,color:c}}>
                      {e.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                    </div>
                    <div>
                      <p style={{margin:0,fontWeight:600,color:"#0d1326"}}>{e.name}</p>
                      <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{e.email}</p>
                    </div>
                  </div>
                </td>
                <td style={{padding:"9px 12px"}}>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:700,
                    background:"#E6F1FB",color:"#185FA5"}}>{e.branch}</span>
                </td>
                <td style={{padding:"9px 12px"}}>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:600,
                    background:c+"18",color:c}}>{e.dept}</span>
                </td>
                <td style={{padding:"9px 12px",color:"#384677"}}>{e.desig}</td>
                <td style={{padding:"9px 12px",textAlign:"right",fontWeight:600,
                  fontVariantNumeric:"tabular-nums",color:"#384677"}}>
                  {bc2.cur}{gross(e).toLocaleString()}
                </td>
                <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,
                  fontVariantNumeric:"tabular-nums",color:"#27500A"}}>
                  {bc2.cur}{net(e).toLocaleString()}
                </td>
                <td style={{padding:"9px 12px"}}>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,
                    background:e.status==="Active"?"#EAF3DE":"#f3f4f8",
                    color:e.status==="Active"?"#27500A":"#9ca3af"}}>{e.status}</span>
                </td>
                <td style={{padding:"9px 12px"}}>
                  <button onClick={ev=>{ev.stopPropagation();setSelected(e);setModal(true);}}
                    style={{...btnGh,padding:"3px 10px",fontSize:10}}>Edit</button>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>

      {/* Employee detail modal */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",
          zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:600,
            maxHeight:"92vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            {/* Modal header */}
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",
              position:"sticky",top:0,background:"#0d1326",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#d4a437"}}>
                {selected?`Edit — ${selected.name}`:"New Employee"}
              </p>
              <button onClick={()=>{setModal(false);setSelected(null);}}
                style={{background:"transparent",border:"none",cursor:"pointer",
                  fontSize:20,color:"#8b94b3"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px"}}>
              {selected&&(
                <>
                  {/* Basic info */}
                  <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:"#0d1326",
                    textTransform:"uppercase",letterSpacing:"0.5px"}}>Personal & Job Details</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                    <FL label="Employee ID"><input defaultValue={selected.id} style={{...inp,fontFamily:"monospace"}}/></FL>
                    <FL label="Full name"><input defaultValue={selected.name} style={inp}/></FL>
                    <FL label="Branch"><select defaultValue={selected.branch} style={inp}>
                      {BRANCHES.map(b=><option key={b.code}>{b.code}</option>)}</select></FL>
                    <FL label="Department"><select defaultValue={selected.dept} style={inp}>
                      {HR_DEPTS.filter(d=>d!=="All").map(d=><option key={d}>{d}</option>)}</select></FL>
                    <FL label="Designation"><input defaultValue={selected.desig} style={inp}/></FL>
                    <FL label="Date of joining"><input type="date" defaultValue={selected.joined} style={inp}/></FL>
                    <FL label="Date of birth"><input type="date" defaultValue={selected.dob} style={inp}/></FL>
                    <FL label="Mobile"><input defaultValue={selected.mobile} style={inp}/></FL>
                    <FL label="Email" ><input defaultValue={selected.email} style={inp}/></FL>
                    <FL label="Status"><select defaultValue={selected.status} style={inp}><option>Active</option><option>Inactive</option></select></FL>
                  </div>

                  {/* Salary structure */}
                  <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:"#0d1326",
                    textTransform:"uppercase",letterSpacing:"0.5px"}}>Salary Structure</p>
                  <div style={{...card,padding:"12px 14px",background:"#f9fafb",marginBottom:14}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11}}>
                      <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #e1e3ec"}}><span style={{color:"#5a6691"}}>Basic</span><span style={{fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{BRANCHES.find(b=>b.code===selected.branch)?.cur||"₹"}{selected.basic.toLocaleString()}</span></div>
                        <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #e1e3ec"}}><span style={{color:"#5a6691"}}>HRA</span><span style={{fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{BRANCHES.find(b=>b.code===selected.branch)?.cur||"₹"}{selected.hra.toLocaleString()}</span></div>
                        <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #e1e3ec"}}><span style={{color:"#5a6691"}}>DA</span><span style={{fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{BRANCHES.find(b=>b.code===selected.branch)?.cur||"₹"}{selected.da.toLocaleString()}</span></div>
                        <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #e1e3ec"}}><span style={{color:"#5a6691"}}>Travel Allowance</span><span style={{fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{BRANCHES.find(b=>b.code===selected.branch)?.cur||"₹"}{selected.travel.toLocaleString()}</span></div>
                        <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #e1e3ec"}}><span style={{color:"#5a6691"}}>Medical</span><span style={{fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{BRANCHES.find(b=>b.code===selected.branch)?.cur||"₹"}{selected.medical.toLocaleString()}</span></div>
                      <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",
                        borderTop:"2px solid #0d1326",gridColumn:"1/-1",fontWeight:800,fontSize:12}}>
                        <span>Gross Salary</span>
                        <span style={{color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>
                          {BRANCHES.find(b=>b.code===selected.branch)?.cur||"₹"}{gross(selected).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <p style={{margin:"10px 0 6px",fontSize:11,fontWeight:700,color:"#A32D2D"}}>Deductions</p>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11}}>
                      <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #e1e3ec"}}><span style={{color:"#5a6691"}}>PF</span><span style={{fontWeight:600,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{BRANCHES.find(b=>b.code===selected.branch)?.cur||"₹"}{selected.pf.toLocaleString()}</span></div>
                        <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #e1e3ec"}}><span style={{color:"#5a6691"}}>ESI</span><span style={{fontWeight:600,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{BRANCHES.find(b=>b.code===selected.branch)?.cur||"₹"}{selected.esi.toLocaleString()}</span></div>
                        <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #e1e3ec"}}><span style={{color:"#5a6691"}}>TDS</span><span style={{fontWeight:600,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{BRANCHES.find(b=>b.code===selected.branch)?.cur||"₹"}{selected.tds.toLocaleString()}</span></div>
                      <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",
                        borderTop:"2px solid #A32D2D",gridColumn:"1/-1",fontWeight:800,fontSize:12}}>
                        <span>Net Take-home</span>
                        <span style={{color:"#27500A",fontVariantNumeric:"tabular-nums"}}>
                          {BRANCHES.find(b=>b.code===selected.branch)?.cur||"₹"}{net(selected).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bank */}
                  <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:"#0d1326",textTransform:"uppercase",letterSpacing:"0.5px"}}>Bank Details</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <FL label="Bank name"><input defaultValue={selected.bank} style={inp}/></FL>
                    <FL label="Account number"><input defaultValue={selected.ac} style={{...inp,fontFamily:"monospace"}}/></FL>
                  </div>
                </>
              )}
              {!selected&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <FL label="Employee ID"><input placeholder="TK-BOM-006" style={{...inp,fontFamily:"monospace"}}/></FL>
                  <FL label="Full name"><input style={inp}/></FL>
                  <FL label="Branch"><select style={inp}>{BRANCHES.map(b=><option key={b.code}>{b.code}</option>)}</select></FL>
                  <FL label="Department"><select style={inp}>{HR_DEPTS.filter(d=>d!=="All").map(d=><option key={d}>{d}</option>)}</select></FL>
                  <FL label="Designation"><input style={inp}/></FL>
                  <FL label="Date of joining"><input type="date" style={inp}/></FL>
                  <FL label="Basic salary"><input type="number" style={inp}/></FL>
                  <FL label="Mobile"><input style={inp}/></FL>
                </div>
              )}
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",
              display:"flex",justifyContent:"flex-end",gap:8,position:"sticky",bottom:0,background:"#fff"}}>
              <button onClick={()=>{setModal(false);setSelected(null);}} style={btnGh}>Cancel</button>
              <button onClick={()=>{setModal(false);setSelected(null);}} style={btnG}>Save Employee</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Attendance ───────────────────────────────────────────────── */

export function HrAttendance({branch}){
  const [month,setMonth]=useState("2026-05");
  const [empFilter,setEmpFilter]=useState("All");
  const [brFilter,setBrFilter]=useState(branch==="ALL"?"All":branch?.code||"All");

  const MONTHS=[{v:"2026-03",l:"Mar 2026"},{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"}];
  const STATUS_CLR={P:{bg:"#EAF3DE",c:"#27500A",l:"Present"},A:{bg:"#FCEBEB",c:"#A32D2D",l:"Absent"},
    L:{bg:"#FAEEDA",c:"#854F0B",l:"Leave"},H:{bg:"#E6F1FB",c:"#185FA5",l:"Holiday"},
    WO:{bg:"#f3f4f8",c:"#5a6691",l:"Week Off"}};

  const getDaysInMonth=m=>{const [y,mo]=m.split("-").map(Number);return new Date(y,mo,0).getDate();};
  const getDay=d=>new Date(month+"-"+String(d).padStart(2,"0")).getDay();

  const emps=HR_EMPLOYEES_DATA.filter(e=>
    (brFilter==="All"||e.branch===brFilter)&&
    (empFilter==="All"||e.id===empFilter)
  ).slice(0,8);

  const days=getDaysInMonth(month);

  /* Generate deterministic attendance */
  const getAtt=(empId,day)=>{
    const dow=getDay(day);
    if(dow===0) return "WO";
    if(dow===6) return "WO";
    const seed=(empId.charCodeAt(empId.length-1)+day)%10;
    if(seed===0) return "A";
    if(seed===1) return "L";
    return "P";
  };

  const summary=emp=>{
    const att=Array.from({length:days},(_,i)=>getAtt(emp.id,i+1));
    return {P:att.filter(a=>a==="P").length,A:att.filter(a=>a==="A").length,
            L:att.filter(a=>a==="L").length,WO:att.filter(a=>a==="WO").length,H:att.filter(a=>a==="H").length};
  };

  return (
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#EAF3DE",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📅</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Attendance Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{MONTHS.find(m2=>m2.v===month)?.l}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <select value={month} onChange={e=>setMonth(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {MONTHS.map(m2=><option key={m2.v} value={m2.v}>{m2.l}</option>)}
          </select>
          <select value={brFilter} onChange={e=>setBrFilter(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {HR_BRANCHES_F.map(b=><option key={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        {Object.entries(STATUS_CLR).map(([k,v])=>(
          <span key={k} style={{fontSize:10,padding:"3px 10px",borderRadius:999,fontWeight:700,background:v.bg,color:v.c}}>
            {k} = {v.l}
          </span>
        ))}
      </div>

      {/* Attendance grid */}
      <div style={{...card,padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:10.5,minWidth:900}}>
          <thead>
            <tr style={{background:"#0d1326"}}>
              <th style={{padding:"9px 12px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:10,
                position:"sticky",left:0,background:"#0d1326",minWidth:160}}>Employee</th>
              {Array.from({length:days},(_,i)=>{
                const dow=getDay(i+1);
                const isWk=dow===0||dow===6;
                return (
                  <th key={i} style={{padding:"6px 4px",textAlign:"center",width:28,
                    color:isWk?"#5a6691":"#d4a437",fontWeight:700,fontSize:9}}>
                    <div>{i+1}</div>
                    <div style={{fontSize:8,fontWeight:400}}>{"SMTWTFS"[dow]}</div>
                  </th>
                );
              })}
              <th style={{padding:"9px 10px",color:"#d4a437",fontWeight:700,fontSize:9,textAlign:"center"}}>P</th>
              <th style={{padding:"9px 10px",color:"#d4a437",fontWeight:700,fontSize:9,textAlign:"center"}}>A</th>
              <th style={{padding:"9px 10px",color:"#d4a437",fontWeight:700,fontSize:9,textAlign:"center"}}>L</th>
            </tr>
          </thead>
          <tbody>{emps.map((emp,ei)=>{
            const s=summary(emp);
            return (
              <tr key={emp.id} style={{borderBottom:"1px solid #f3f4f8",
                background:ei%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"7px 12px",position:"sticky",left:0,
                  background:ei%2===0?"#fff":"#fafafa",borderRight:"1px solid #e1e3ec"}}>
                  <p style={{margin:0,fontWeight:600,color:"#0d1326",fontSize:11}}>{emp.name}</p>
                  <p style={{margin:0,fontSize:9,color:"#5a6691"}}>{emp.branch} · {emp.dept}</p>
                </td>
                {Array.from({length:days},(_,i)=>{
                  const att=getAtt(emp.id,i+1);
                  const ac=STATUS_CLR[att];
                  return (
                    <td key={i} style={{padding:"4px 2px",textAlign:"center"}}>
                      <span style={{display:"inline-block",width:20,height:20,borderRadius:4,
                        lineHeight:"20px",fontSize:8.5,fontWeight:700,
                        background:ac.bg,color:ac.c}}>
                        {att}
                      </span>
                    </td>
                  );
                })}
                <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700,color:"#27500A"}}>{s.P}</td>
                <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700,color:"#A32D2D"}}>{s.A}</td>
                <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700,color:"#854F0B"}}>{s.L}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Salary Run (Payroll) ─────────────────────────────────────── */

export function HrPayroll({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?"BOM":branch?.code||"BOM";
  const [tab,setTab]=useState("register"); // register | pf-esi | bankfile | form16 | journal
  const [period,setPeriod]=useState("2026-05");
  const [processed,setProcessed]=useState(false);
  const [journalPosted,setJournalPosted]=useState(false);
  const PERIODS=[{v:"2026-03",l:"Mar 2026"},{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"}];

  const emps=HR_EMPLOYEES_DATA.filter(e=>e.branch===brCode&&e.status==="Active");

  const payroll=useMemo(()=>emps.map(e=>{
    const basic   =e.basic;
    const hra     =e.hra;
    const gross   =e.basic+e.hra+e.da+e.travel+e.medical;
    const special =gross-basic-hra;
    // PF: 12% of Basic (both employee & employer)
    const empPF   =Math.round(basic*0.12);
    const empPFr  =Math.round(basic*0.12);  // employer
    // ESI: only if gross <= 21000
    const esiElig =gross<=21000;
    const empESI  =esiElig?Math.round(gross*0.0075):0;
    const empESIr =esiElig?Math.round(gross*0.0325):0;
    // Professional Tax (Maharashtra)
    const profTax =gross>20000?200:gross>15000?150:gross>10000?100:0;
    // LWP — no loss-of-pay field on the employee master, default to 0
    const lwpDays =e.lwpDays||0;
    const lwpDed  =Math.round(gross/26*lwpDays);
    // TDS on salary (simplified)
    const annualGross=(gross-empPF-profTax-lwpDed)*12;
    const tdsBase=annualGross>700000?annualGross-700000:0;
    const tds=annualGross>700000?Math.round((tdsBase*0.20+200000*0.10+250000*0.05)/12):
      annualGross>500000?Math.round((annualGross-500000)*0.10/12+250000*0.05/12):
      annualGross>250000?Math.round((annualGross-250000)*0.05/12):0;
    const net =gross-empPF-empESI-profTax-lwpDed-tds;
    return {...e,basic:basic,hra:hra,special:special,gross:gross,empPF:empPF,empPFr:empPFr,empESI:empESI,empESIr:empESIr,profTax:profTax,lwpDays:lwpDays,lwpDed:lwpDed,tds:tds,net:net};
  }),[brCode,period]);

  const totals=useMemo(()=>({
    gross:  payroll.reduce((s,e)=>s+e.gross,0),
    empPF:  payroll.reduce((s,e)=>s+e.empPF,0),
    empPFr: payroll.reduce((s,e)=>s+e.empPFr,0),
    empESI: payroll.reduce((s,e)=>s+e.empESI,0),
    empESIr:payroll.reduce((s,e)=>s+e.empESIr,0),
    profTax:payroll.reduce((s,e)=>s+e.profTax,0),
    lwpDed: payroll.reduce((s,e)=>s+e.lwpDed,0),
    tds:    payroll.reduce((s,e)=>s+e.tds,0),
    net:    payroll.reduce((s,e)=>s+e.net,0),
  }),[payroll]);

  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");

  /* ── PAYROLL JOURNAL ENTRIES ─────────────────────────── */
  const journalEntries=[
    {side:"Dr",ledger:"Salaries & Wages",          amount:totals.gross,  note:"Gross salary expense"},
    {side:"Cr",ledger:"Employee PF Payable",        amount:totals.empPF,  note:"Employee PF 12% of basic"},
    {side:"Dr",ledger:"Employer PF Contribution",   amount:totals.empPFr, note:"Employer PF expense"},
    {side:"Cr",ledger:"PF Payable",                 amount:totals.empPF+totals.empPFr, note:"Total PF to EPFO by 15th"},
    {side:"Dr",ledger:"Employer ESI Contribution",  amount:totals.empESIr,note:"Employer ESI 3.25%"},
    {side:"Cr",ledger:"ESI Payable",                amount:totals.empESI+totals.empESIr,note:"Total ESI to ESIC by 15th"},
    {side:"Cr",ledger:"Professional Tax Payable",   amount:totals.profTax,note:"Prof Tax — Maharashtra"},
    {side:"Cr",ledger:"TDS Payable (194C)",         amount:totals.tds,    note:"TDS on salaries — deposit by 7th"},
    {side:"Cr",ledger:"Salary Payable",             amount:totals.net,    note:"Net salary — pay by 1st"},
  ];
  const jDr=journalEntries.filter(e=>e.side==="Dr").reduce((s,e)=>s+e.amount,0);
  const jCr=journalEntries.filter(e=>e.side==="Cr").reduce((s,e)=>s+e.amount,0);
  const balDiff=jDr-jCr; const balanced=balDiff>=-0.01&&balDiff<=0.01;
  const hrpContainerStyle={padding:"12px 10px",maxWidth:1300,margin:"0 auto"};

  return (
    <div style={hrpContainerStyle}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>💼</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Salary & Payroll</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{brCode} · {PERIODS.find(p=>p.v===period)?.l} · {emps.length} employees</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          {!processed
            ?<button onClick={()=>setProcessed(true)} style={{...btnG,fontSize:11,background:"#27500A"}}>⚙ Process Payroll</button>
            :<span style={{padding:"6px 12px",borderRadius:9,background:"#EAF3DE",color:"#27500A",fontSize:11,fontWeight:700}}>✔ Processed</span>}
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
      <div style={{display:"flex",gap:0,background:"#f3f4f8",borderRadius:"9px 9px 0 0",border:"1px solid #e1e3ec",overflowX:"auto"}}>
        <button onClick={()=>setTab("register")} style={{flexShrink:0,padding:"9px 14px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab==="register"?700:500,color:tab==="register"?"#0d1326":"#5a6691",background:tab==="register"?"#fff":"transparent",borderRadius:"9px 9px 0 0"}}>📋 Payroll Register</button><button onClick={()=>setTab("pf-esi")} style={{flexShrink:0,padding:"9px 14px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab==="pf-esi"?700:500,color:tab==="pf-esi"?"#0d1326":"#5a6691",background:tab==="pf-esi"?"#fff":"transparent",borderRadius:"9px 9px 0 0"}}>🏦 PF / ESI</button><button onClick={()=>setTab("bankfile")} style={{flexShrink:0,padding:"9px 14px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab==="bankfile"?700:500,color:tab==="bankfile"?"#0d1326":"#5a6691",background:tab==="bankfile"?"#fff":"transparent",borderRadius:"9px 9px 0 0"}}>🏧 Bank File</button><button onClick={()=>setTab("form16")} style={{flexShrink:0,padding:"9px 14px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab==="form16"?700:500,color:tab==="form16"?"#0d1326":"#5a6691",background:tab==="form16"?"#fff":"transparent",borderRadius:"9px 9px 0 0"}}>📄 Form 16</button><button onClick={()=>setTab("journal")} style={{flexShrink:0,padding:"9px 14px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab==="journal"?700:500,color:tab==="journal"?"#0d1326":"#5a6691",background:tab==="journal"?"#fff":"transparent",borderRadius:"9px 9px 0 0"}}>📒 Journal</button>
      </div>

      {/* TAB: PAYROLL REGISTER */}
      {tab==="register"&&(
        <div style={{...card,padding:0,overflow:"hidden",borderTop:"none",borderRadius:"0 0 9px 9px"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:1000}}>
              <thead><tr style={{background:"#0d1326"}}>
                {["Employee","Basic","HRA","Special","LWP","Gross","PF (E)","ESI (E)","Prof Tax","TDS","Net Pay"].map((h,i)=>(
                  <th key={i} style={{padding:"8px 10px",textAlign:i>1?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {payroll.map((e,i)=>(
                  <tr key={e.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
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
                  </tr>
                ))}
              </tbody>
              <tfoot><tr style={{background:"#0d1326"}}>
                <td style={{padding:"8px 10px",fontWeight:700,color:"#d4a437"}}>TOTAL</td>
                {[totals.gross*0.5,totals.gross*0.2,totals.gross*0.3,0,totals.gross,totals.empPF,totals.empESI,totals.profTax,totals.tds,totals.net].map((v,i)=>(
                  <td key={i} style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:"#fff",fontVariantNumeric:"tabular-nums",fontSize:11}}>{v>0?f(v):"—"}</td>
                ))}
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
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #e1e3ec"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:400,color:"#0d1326"}}>Employee Contribution (12% Basic)</p><p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>Deducted from salary</p></div><span style={{fontSize:11,fontWeight:600,color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>{f(totals.empPF)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #e1e3ec"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:400,color:"#0d1326"}}>Employer Contribution (12% Basic)</p><p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>Company expense</p></div><span style={{fontSize:11,fontWeight:600,color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>{f(totals.empPFr)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #e1e3ec"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:700,color:"#0d1326"}}>Total PF Deposit</p><p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>Via ECR by 15th</p></div><span style={{fontSize:12,fontWeight:800,color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>{f(totals.empPF+totals.empPFr)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #e1e3ec"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:400,color:"#0d1326"}}>Admin Charges (0.5%)</p><p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>0.5% of wages</p></div><span style={{fontSize:11,fontWeight:600,color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>{f(Math.round((totals.empPF+totals.empPFr)*0.005))}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #e1e3ec"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:400,color:"#0d1326"}}>Deposit Deadline</p><p style={{margin:0,fontSize:9.5,color:"#A32D2D"}}>Late = 12% p.a. interest</p></div><span style={{fontSize:11,fontWeight:700,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>15 Jun 2026</span></div>
              </div>
              <div style={{...card,background:"#f9fafb"}}>
                <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>ESI Corporation</p>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #e1e3ec"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:400,color:"#0d1326"}}>Employee Contribution (0.75%)</p><p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>Deducted from gross</p></div><span style={{fontSize:11,fontWeight:600,color:"#1D9E75",fontVariantNumeric:"tabular-nums"}}>{f(totals.empESI)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #e1e3ec"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:400,color:"#0d1326"}}>Employer Contribution (3.25%)</p><p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>Company expense</p></div><span style={{fontSize:11,fontWeight:600,color:"#1D9E75",fontVariantNumeric:"tabular-nums"}}>{f(totals.empESIr)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #e1e3ec"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:700,color:"#0d1326"}}>Total ESI Deposit</p><p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>Via EC by 15th</p></div><span style={{fontSize:12,fontWeight:800,color:"#1D9E75",fontVariantNumeric:"tabular-nums"}}>{f(totals.empESI+totals.empESIr)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #e1e3ec"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:400,color:"#0d1326"}}>Eligible employees</p><p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>Gross up to ₹21,000</p></div><span style={{fontSize:11,fontWeight:600,color:"#1D9E75",fontVariantNumeric:"tabular-nums"}}>{String(payroll.filter(e=>e.empESI>0).length)+" of "+String(emps.length)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #e1e3ec"}}><div><p style={{margin:0,fontSize:10.5,fontWeight:400,color:"#0d1326"}}>Deposit Deadline</p><p style={{margin:0,fontSize:9.5,color:"#A32D2D"}}>Late = 12% p.a. interest</p></div><span style={{fontSize:11,fontWeight:700,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>15 Jun 2026</span></div>
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
                <tr key={e.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
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
                  <tr key={e.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"7px 12px",fontWeight:600,color:"#0d1326"}}>{e.name}</td>
                    <td style={{padding:"7px 12px",fontSize:10.5,color:"#5a6691"}}>{e.designation||"Staff"}</td>
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
                <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:e.side==="Dr"?"#f0f8ff":"#f0fff4"}}>
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

export function HrPayslips({branch}){
  const [month,setMonth]=useState("2026-05");
  const [empId,setEmpId]=useState("");
  const [brFilter,setBrFilter]=useState(branch==="ALL"?"All":branch?.code||"All");

  const MONTHS=[{v:"2026-03",l:"Mar 2026"},{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"}];

  const filtEmps=HR_EMPLOYEES_DATA.filter(e=>brFilter==="All"||e.branch===brFilter);
  const emp=HR_EMPLOYEES_DATA.find(e=>e.id===empId)||HR_EMPLOYEES_DATA[0];
  const brCfg=BRANCHES.find(b=>b.code===emp.branch)||{cur:"₹",entity:"Travkings Tours & Travels"};
  const c=brCfg.cur;
  const gross=emp.basic+emp.hra+emp.da+emp.travel+emp.medical;
  const deductions=emp.pf+emp.esi+emp.tds;
  const net=gross-deductions;

  return (
    <div style={{padding:"12px 10px",maxWidth:900,margin:"0 auto"}}>
      {/* Controls */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        flexWrap:"wrap",gap:10,marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#f3f4f8",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🧾</div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Payslips</h2>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <select value={month} onChange={e=>setMonth(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {MONTHS.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
          <select value={brFilter} onChange={e=>{setBrFilter(e.target.value);}} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {HR_BRANCHES_F.map(b=><option key={b}>{b}</option>)}
          </select>
          <select value={empId} onChange={e=>setEmpId(e.target.value)} style={{...inp,width:200,minHeight:32,fontSize:11}}>
            {filtEmps.map(e=><option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
          </select>
        </div>
      </div>

      {/* Payslip card */}
      <div style={{...card,overflow:"hidden",boxShadow:"0 4px 24px rgba(0,0,0,0.1)"}}>
        {/* Header */}
        <div style={{background:"#0d1326",padding:"20px 24px",display:"flex",
          justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{margin:0,fontSize:20,fontWeight:800,color:"#d4a437",letterSpacing:"-0.02em"}}>
              TRAVKINGS
            </p>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#8b94b3"}}>{brCfg.entity||"Travkings Tours & Travels"}</p>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#fff"}}>PAYSLIP</p>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#d4a437"}}>{MONTHS.find(m=>m.v===month)?.l}</p>
          </div>
        </div>

        {/* Employee info */}
        <div style={{padding:"16px 24px",borderBottom:"1px solid #e1e3ec",
          display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,background:"#f9fafb"}}>
          {[
            ["Employee Name",emp.name],["Employee ID",emp.id],
            ["Designation",emp.desig],["Department",emp.dept],
            ["Branch",emp.branch],["Date of Joining",emp.joined],
            ["Bank",emp.bank],["A/c No.",emp.ac],
          ].map(([l,v],i)=>(
            <div key={i} style={{display:"flex",gap:6}}>
              <span style={{fontSize:10.5,color:"#5a6691",minWidth:110}}>{l}:</span>
              <span style={{fontSize:10.5,fontWeight:600,color:"#0d1326"}}>{v}</span>
            </div>
          ))}
        </div>

        {/* Earnings & Deductions */}
        <div style={{padding:"16px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          {/* Earnings */}
          <div>
            <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:"#27500A",textTransform:"uppercase",letterSpacing:"0.5px"}}>Earnings</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#EAF3DE"}}>
                <th style={{padding:"6px 10px",textAlign:"left",color:"#27500A",fontWeight:700,fontSize:10}}>Component</th>
                <th style={{padding:"6px 10px",textAlign:"right",color:"#27500A",fontWeight:700,fontSize:10}}>Amount</th>
              </tr></thead>
              <tbody>
                {[["Basic Salary",emp.basic],["HRA",emp.hra],["Dearness Allowance",emp.da],["Travel Allowance",emp.travel],["Medical Allowance",emp.medical]].map(([l,v],i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #f3f4f8"}}>
                    <td style={{padding:"6px 10px",color:"#384677"}}>{l}</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{c}{v.toLocaleString()}</td>
                  </tr>
                ))}
                <tr style={{background:"#EAF3DE",borderTop:"2px solid #27500A"}}>
                  <td style={{padding:"8px 10px",fontWeight:700}}>Gross Earnings</td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,color:"#27500A",fontVariantNumeric:"tabular-nums"}}>{c}{gross.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deductions */}
          <div>
            <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:"#A32D2D",textTransform:"uppercase",letterSpacing:"0.5px"}}>Deductions</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#FCEBEB"}}>
                <th style={{padding:"6px 10px",textAlign:"left",color:"#A32D2D",fontWeight:700,fontSize:10}}>Component</th>
                <th style={{padding:"6px 10px",textAlign:"right",color:"#A32D2D",fontWeight:700,fontSize:10}}>Amount</th>
              </tr></thead>
              <tbody>
                {[["Provident Fund",emp.pf],["ESI",emp.esi],["Income Tax (TDS)",emp.tds]].map(([l,v],i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #f3f4f8"}}>
                    <td style={{padding:"6px 10px",color:"#384677"}}>{l}</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{v>0?c+v.toLocaleString():"—"}</td>
                  </tr>
                ))}
                <tr style={{background:"#FCEBEB",borderTop:"2px solid #A32D2D"}}>
                  <td style={{padding:"8px 10px",fontWeight:700}}>Total Deductions</td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{c}{deductions.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Net Pay */}
        <div style={{margin:"0 24px 20px",padding:"14px 18px",
          background:"#0d1326",borderRadius:10,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{margin:0,fontSize:10.5,color:"#8b94b3"}}>Net Take-home Pay</p>
            <p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691"}}>{MONTHS.find(m=>m.v===month)?.l} · Credited to {emp.bank}</p>
          </div>
          <p style={{margin:0,fontSize:28,fontWeight:900,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>
            {c}{net.toLocaleString()}
          </p>
        </div>

        {/* Footer */}
        <div style={{padding:"12px 24px",borderTop:"1px solid #e1e3ec",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <p style={{margin:0,fontSize:9.5,color:"#bfc3d6"}}>
            This is a computer-generated payslip. No signature required.
          </p>
          <button onClick={()=>{
            const html=document.getElementById("payslip-content")?.innerHTML||"";
            const blob=new Blob([`<html><body style="font-family:Arial;padding:20mm">${html}</body></html>`],{type:"text/html"});
            const url=URL.createObjectURL(blob);const a=document.createElement("a");
            a.href=url;a.download=`Payslip_${emp.id}_${month}.html`;
            document.body.appendChild(a);a.click();document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }} style={{...btnG,fontSize:11,display:"flex",alignItems:"center",gap:5}}>
            <Download size={13}/> Download Payslip
          </button>
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   SETTINGS — 4 Screens
   Company Profile · Branches · Users & Roles · Audit Log
   ════════════════════════════════════════════════════════════════ */

/* ── Company Profile ─────────────────────────────────────────── */

export function HrLeave({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:branch?.code;
  const [leaves,setLeaves]=useState(_LEAVES);
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [tab,setTab]=useState("requests"); // requests | calendar | balances
  const [form,setForm]=useState({empId:"",empName:"",type:"Annual Leave",from:"",to:"",reason:""});

  const filtered=leaves.filter(l=>!brCode||HR_EMPLOYEES_DATA.find(e=>e.id===l.empId&&e.branch===brCode));
  const pending =filtered.filter(l=>l.status==="Pending");
  const approved=filtered.filter(l=>l.status==="Approved");
  const STATUS_CLR={Pending:"#854F0B",Approved:"#27500A",Rejected:"#A32D2D"};
  const STATUS_BG ={Pending:"#FAEEDA",Approved:"#EAF3DE",Rejected:"#FCEBEB"};
  const TYPE_ICON ={"Annual Leave":"🏖","Sick Leave":"🏥","Casual Leave":"🎯","LWP":"❌"};

  const approve=(id)=>setLeaves(ls=>ls.map(l=>l.id===id?{...l,status:"Approved",approvedBy:"Manager"}:l));
  const reject =(id)=>setLeaves(ls=>ls.map(l=>l.id===id?{...l,status:"Rejected"}:l));

  const submit=()=>{
    const days=Math.ceil((new Date(form.to)-new Date(form.from))/(1000*60*60*24))+1;
    setLeaves(ls=>[{...form,id:`LV${String(ls.length+1).padStart(3,"0")}`,days,status:"Pending",approvedBy:""},...ls]);
    setModal(false);
  };

  return (
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🌴</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Leave Management</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{pending.length} pending approval · Annual / Sick / Casual / LWP</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {["requests","balances"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{...tab===t?btnG:btnGh,fontSize:11,textTransform:"capitalize"}}>{t}</button>
          ))}
          <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Apply</button>
        </div>
      </div>

      {pending.length>0&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:10.5,color:"#854F0B",fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
        <AlertTriangle size={14}/> {pending.length} leave request{pending.length>1?"s":""} pending your approval
      </div>}

      {tab==="requests"&&(
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["ID","Employee","Leave Type","From","To","Days","Reason","Status","Approved By","Actions"].map((h,i)=>(
                <th key={i} style={{padding:"9px 12px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filtered.map((l,i)=>(
              <tr key={l.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10,color:"#5a6691"}}>{l.id}</td>
                <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{l.empName}</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:10}}>{TYPE_ICON[l.type]||"📋"} {l.type}</span></td>
                <td style={{padding:"8px 12px",color:"#5a6691",whiteSpace:"nowrap"}}>{l.from}</td>
                <td style={{padding:"8px 12px",color:"#5a6691",whiteSpace:"nowrap"}}>{l.to}</td>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:"#185FA5"}}>{l.days}</td>
                <td style={{padding:"8px 12px",color:"#384677",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.reason}</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[l.status],color:STATUS_CLR[l.status]}}>{l.status}</span></td>
                <td style={{padding:"8px 12px",color:"#5a6691",fontSize:10}}>{l.approvedBy||"—"}</td>
                <td style={{padding:"8px 12px"}}>
                  {l.status==="Pending"&&<div style={{display:"flex",gap:4}}>
                    <button onClick={()=>approve(l.id)} style={{...btnG,padding:"2px 7px",fontSize:9,background:"#27500A"}}>✓ Approve</button>
                    <button onClick={()=>reject(l.id)}  style={{...btnGh,padding:"2px 7px",fontSize:9,color:"#A32D2D"}}>✗ Reject</button>
                  </div>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab==="balances"&&(
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Employee","Branch","Annual Leave","Sick Leave","Casual Leave","Total Available"].map((h,i)=>(
                <th key={i} style={{padding:"9px 14px",textAlign:i>=2?"right":"left",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{HR_EMPLOYEES_DATA.filter(e=>!brCode||e.branch===brCode).map((e,i)=>{
              const bal=_LEAVE_BALANCES[e.id]||{AL:18,SL:12,CL:6};
              return (
                <tr key={e.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"9px 14px",fontWeight:600,color:"#0d1326"}}>{e.name}</td>
                  <td style={{padding:"9px 14px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{e.branch}</span></td>
                  <td style={{padding:"9px 14px",textAlign:"right"}}><span style={{fontSize:13,fontWeight:800,color:bal.AL<5?"#A32D2D":"#27500A"}}>{bal.AL}</span><span style={{fontSize:10,color:"#5a6691"}}> / 18 days</span></td>
                  <td style={{padding:"9px 14px",textAlign:"right"}}><span style={{fontSize:13,fontWeight:800,color:bal.SL<3?"#A32D2D":"#1D9E75"}}>{bal.SL}</span><span style={{fontSize:10,color:"#5a6691"}}> / 12 days</span></td>
                  <td style={{padding:"9px 14px",textAlign:"right"}}><span style={{fontSize:13,fontWeight:800,color:"#185FA5"}}>{bal.CL}</span><span style={{fontSize:10,color:"#5a6691"}}> / 6 days</span></td>
                  <td style={{padding:"9px 14px",textAlign:"right",fontWeight:800,fontSize:15,color:"#0d1326"}}>{bal.AL+bal.SL+bal.CL}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:460,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Apply for Leave</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <FL label="Employee"><select value={form.empId} onChange={e=>{const emp=HR_EMPLOYEES_DATA.find(x=>x.id===e.target.value);setForm(f=>({...f,empId:e.target.value,empName:emp?.name||""}));}} style={inp}>
                {HR_EMPLOYEES_DATA.filter(e=>!brCode||e.branch===brCode).map(e=><option key={e.id} value={e.id}>{e.name} ({e.branch})</option>)}
              </select></FL>
              <FL label="Leave type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}>
                {["Annual Leave","Sick Leave","Casual Leave","LWP"].map(t=><option key={t}>{t}</option>)}
              </select></FL>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="From"><input type="date" value={form.from} onChange={e=>setForm(f=>({...f,from:e.target.value}))} style={inp}/></FL>
                <FL label="To"><input type="date" value={form.to} onChange={e=>setForm(f=>({...f,to:e.target.value}))} style={inp}/></FL>
              </div>
              <FL label="Reason"><textarea value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}}/></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={submit} style={btnG}>📨 Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PHASE 6b — EXPENSE CLAIMS  /hr/expenses
   ════════════════════════════════════════════════════════════════ */

export function HrExpenses({branch}){
  const brCode=branch==="ALL"?null:branch?.code;
  const [claims,setClaims]=useState(_EXPENSE_CLAIMS);
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [form,setForm]=useState({empId:"",empName:"",date:"",category:"Travel",desc:"",amount:0});

  const filtered=claims.filter(c=>!brCode||HR_EMPLOYEES_DATA.find(e=>e.id===c.empId&&e.branch===brCode));
  const totPending =filtered.filter(c=>!c.paid).reduce((s,c)=>s+c.amount,0);
  const totApproved=filtered.filter(c=>c.status==="Approved"&&!c.paid).reduce((s,c)=>s+c.amount,0);
  const CATS=["Travel","Entertainment","Stationery","Telephone","Miscellaneous"];

  const submit=()=>{
    setClaims(cs=>[{...form,id:`EXP${String(cs.length+1).padStart(3,"0")}`,receipt:false,status:"Pending",paid:false},...cs]);
    setModal(false);
  };

  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>💳</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Employee Expense Claims</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{filtered.filter(c=>c.status==="Pending").length} pending · ₹{totApproved.toLocaleString()} approved & pending payment</p>
          </div>
        </div>
        <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> New Claim</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        {[{l:"Claims",v:String(filtered.length),c:"#384677",bg:"#f3f4f8"},
          {l:"Pending Approval",v:String(filtered.filter(c=>c.status==="Pending").length),c:"#854F0B",bg:"#FAEEDA"},
          {l:"Approved — Unpaid",v:"₹"+totApproved.toLocaleString(),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Total Pending",v:"₹"+totPending.toLocaleString(),c:"#A32D2D",bg:"#FCEBEB"},
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
            {["ID","Employee","Date","Category","Description","Amount","Receipt","Approval","Payment"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i===5?"right":"left",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((c,i)=>(
            <tr key={c.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10,color:"#5a6691"}}>{c.id}</td>
              <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{c.empName}</td>
              <td style={{padding:"8px 12px",color:"#5a6691",whiteSpace:"nowrap"}}>{c.date}</td>
              <td style={{padding:"8px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{c.category}</span></td>
              <td style={{padding:"8px 12px",color:"#384677"}}>{c.desc}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>₹{c.amount.toLocaleString()}</td>
              <td style={{padding:"8px 12px",textAlign:"center"}}>{c.receipt?"✅":"❌"}</td>
              <td style={{padding:"8px 12px"}}>
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,
                  background:c.status==="Approved"?"#EAF3DE":"#FAEEDA",
                  color:c.status==="Approved"?"#27500A":"#854F0B"}}>{c.status}</span>
                {c.status==="Pending"&&<button onClick={()=>setClaims(cs=>cs.map(x=>x.id===c.id?{...x,status:"Approved"}:x))} style={{...btnG,padding:"2px 6px",fontSize:8.5,marginLeft:4,background:"#27500A"}}>✓</button>}
              </td>
              <td style={{padding:"8px 12px"}}>
                {c.status==="Approved"
                  ?<span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,background:c.paid?"#EAF3DE":"#FAEEDA",color:c.paid?"#27500A":"#854F0B"}}>{c.paid?"Paid":"Pending"}</span>
                  :<span style={{color:"#bfc3d6",fontSize:10}}>—</span>
                }
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:440,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Submit Expense Claim</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <FL label="Employee"><select value={form.empId} onChange={e=>{const emp=HR_EMPLOYEES_DATA.find(x=>x.id===e.target.value);setForm(f=>({...f,empId:e.target.value,empName:emp?.name||""}));}} style={inp}>
                {HR_EMPLOYEES_DATA.filter(e=>!brCode||e.branch===brCode).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
              </select></FL>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Date"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={inp}/></FL>
                <FL label="Category"><select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={inp}>{CATS.map(c=><option key={c}>{c}</option>)}</select></FL>
              </div>
              <FL label="Description"><input value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} style={inp}/></FL>
              <FL label="Amount (₹)"><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:+e.target.value}))} style={inp}/></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={submit} style={btnG}>💳 Submit Claim</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PHASE 7 — POWER UX: Settings panel (dark mode, density)
   ════════════════════════════════════════════════════════════════ */

export function SalaryRevision({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:branch?.code;
  const [tab,setTab]=useState("due"); // due | history

  const dueFiltered=_REVISION_DUE.filter(e=>!brCode||e.branch===brCode);
  const overdue=dueFiltered.filter(e=>e.status==="OVERDUE");

  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📈</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Salary Revision Tracker</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{overdue.length} overdue · Next due dates · Full revision history</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {["due","history"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{...tab===t?btnG:btnGh,fontSize:11,textTransform:"capitalize"}}>{t==="due"?"Due Reviews":"History"}</button>
          ))}
        </div>
      </div>

      {overdue.length>0&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600,display:"flex",gap:8}}>
        <AlertTriangle size={15}/> {overdue.length} salary revision{overdue.length>1?"s":""} overdue: {overdue.map(e=>`${e.empName} (${e.daysPast}d)`).join(", ")}
      </div>}

      {tab==="due"&&(
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Employee","Branch","Current Basic","Last Revised","Next Due","Status","Suggested Incr. (10%)","Action"].map((h,i)=>(
                <th key={i} style={{padding:"9px 12px",textAlign:i>=2&&i<=2?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{dueFiltered.map((e,i)=>{
              const suggested=Math.round(e.currentBasic*0.10);
              return (
                <tr key={e.empId} style={{borderBottom:"1px solid #f3f4f8",background:e.status==="OVERDUE"?"#fff5f5":i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{e.empName}</td>
                  <td style={{padding:"8px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{e.branch}</span></td>
                  <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>₹{e.currentBasic.toLocaleString()}</td>
                  <td style={{padding:"8px 12px",color:"#5a6691",whiteSpace:"nowrap"}}>{e.lastRevision}</td>
                  <td style={{padding:"8px 12px",color:e.status==="OVERDUE"?"#A32D2D":"#5a6691",fontWeight:e.status==="OVERDUE"?700:400,whiteSpace:"nowrap"}}>{e.nextDue}</td>
                  <td style={{padding:"8px 12px"}}>
                    <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,
                      background:e.status==="OVERDUE"?"#FCEBEB":"#FAEEDA",
                      color:e.status==="OVERDUE"?"#A32D2D":"#854F0B"}}>
                      {e.status==="OVERDUE"?`${e.daysPast}d OVERDUE`:`Due in ${Math.abs(e.daysPast)}d`}
                    </span>
                  </td>
                  <td style={{padding:"8px 12px",fontWeight:700,color:"#27500A"}}>+₹{suggested.toLocaleString()}/mo → ₹{(e.currentBasic+suggested).toLocaleString()}</td>
                  <td style={{padding:"8px 12px"}}><button style={{...btnG,padding:"3px 10px",fontSize:9.5,background:"#27500A",whiteSpace:"nowrap"}}>Process Revision</button></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      {tab==="history"&&(
        <div>
          {_SALARY_HISTORY.filter(h=>!brCode||HR_EMPLOYEES_DATA.find(e=>e.id===h.empId&&e.branch===brCode)).map(h=>(
            <div key={h.empId} style={{...card,marginBottom:12}}>
              <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>{h.empName} — Salary History (Joined: {h.joined})</p>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr style={{background:"#f3f4f8"}}>
                  {["Effective Date","Basic Salary","Increment","Increment %","Reason"].map((col,i)=>(
                    <th key={i} style={{padding:"7px 10px",textAlign:i>=1&&i<=3?"right":"left",fontSize:9.5,fontWeight:700,color:"#384677"}}>{col}</th>
                  ))}
                </tr></thead>
                <tbody>{h.revisions.map((r,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"7px 10px",color:"#5a6691",whiteSpace:"nowrap"}}>{r.date}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>₹{r.basic.toLocaleString()}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:r.incr>0?"#27500A":"#5a6691"}}>{r.incr>0?`+₹${r.incr.toLocaleString()}`:"Nil"}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:r.pct>0?"#27500A":"#5a6691"}}>{r.pct>0?`${r.pct}%`:"—"}</td>
                    <td style={{padding:"7px 10px",color:"#384677"}}>{r.reason}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   BATCH D — UX POWER + INTEGRATIONS (Items 16–26)
   16. Column Visibility Toggle (global)
   17. Pinned / Favourite Routes
   18. Recent Pages List
   19. Breadcrumb Navigation
   20. Quick Create Floating Button
   21. BSP CSV Import
   22. GDS PNR Import
   23. Tally XML Export
   24. WhatsApp Send
   25. Email Automation
   ════════════════════════════════════════════════════════════════ */

/* ── GLOBAL COLUMN VISIBILITY STATE ── */

export function PfEsiChallan({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?"BOM":branch?.code||"BOM";
  const [month,setMonth]=useState("2026-05");
  const [tab,setTab]=useState("pf"); // pf | esi | pt
  const MONTHS=[{v:"2026-03",l:"Mar 2026"},{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"}];
  const emps=HR_EMPLOYEES_DATA.filter(e=>e.branch===brCode||brCode==="All");
  const gross=e=>e.basic+e.hra+e.da+e.travel+e.medical;
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const dueYear=parseInt(month.slice(0,4),10), dueMonRaw=parseInt(month.slice(5),10)+1;
  const dueYr=dueMonRaw>12?dueYear+1:dueYear, dueMon=dueMonRaw>12?1:dueMonRaw;
  const DUE_DATE=dueYr+"-"+String(dueMon).padStart(2,"0")+"-15";

  // PF data
  const pfData=emps.map(e=>({
    name:e.name,uan:"100"+String(HR_EMPLOYEES_DATA.indexOf(e)+123456789).slice(-9),
    basic:e.basic,empPF:Math.round(e.basic*0.12),emplPF:Math.round(e.basic*0.12),
    empEPS:Math.round(Math.min(e.basic,15000)*0.0833),emplEPS:Math.round(Math.min(e.basic,15000)*0.0833),
  }));
  const totEmpPF=pfData.reduce((s,e)=>s+e.empPF,0);
  const totEmplPF=pfData.reduce((s,e)=>s+e.emplPF,0);
  const totEPS=pfData.reduce((s,e)=>s+e.emplEPS,0);
  const totalPFChallan=totEmpPF+totEmplPF;

  // ESI data
  const esiEmps=emps.filter(e=>gross(e)<=21000);
  const esiData=esiEmps.map(e=>({
    name:e.name,esic:"31"+String(HR_EMPLOYEES_DATA.indexOf(e)+10000000).slice(-8),
    gross:gross(e),empESI:Math.round(gross(e)*0.0075),emplESI:Math.round(gross(e)*0.0325),
  }));
  const totEmpESI=esiData.reduce((s,e)=>s+e.empESI,0);
  const totEmplESI=esiData.reduce((s,e)=>s+e.emplESI,0);

  // PT data (Maharashtra)
  const ptData=emps.filter(e=>gross(e)>10000).map(e=>({name:e.name,gross:gross(e),pt:200}));
  const totPT=ptData.reduce((s,e)=>s+e.pt,0);

  const [challanPF,setChallanPF]=useState({bsr:"",date:"",trn:"",status:"Pending"});
  const [challanESI,setChallanESI]=useState({bsr:"",date:"",trn:"",status:"Pending"});

  return(
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
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

      {/* Alert */}
      <div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:10.5,color:"#854F0B",fontWeight:600}}>
        <AlertTriangle size={14} style={{display:"inline",marginRight:6}}/> PF challan due: <b>{DUE_DATE}</b> · Late filing: 1% simple interest per month + penalty up to ₹10,000 per day
      </div>

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
      <div style={{display:"flex",gap:0,background:"#f3f4f8",borderRadius:"9px 9px 0 0",border:"1px solid #e1e3ec"}}>
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
            <tbody>{pfData.map((e,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
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
          {/* Challan entry */}
          <div style={{padding:"12px 14px",background:"#f9fafb",borderTop:"1px solid #e1e3ec"}}>
            <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Record PF Challan Payment</p>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
              <FL label="BSR Code"><input value={challanPF.bsr} onChange={e=>setChallanPF(c=>({...c,bsr:e.target.value}))} style={{...inp,fontFamily:"monospace",width:120}} placeholder="0600115"/></FL>
              <FL label="Challan Date"><input type="date" value={challanPF.date} onChange={e=>setChallanPF(c=>({...c,date:e.target.value}))} style={{...inp,width:150}}/></FL>
              <FL label="TRN / Ref No."><input value={challanPF.trn} onChange={e=>setChallanPF(c=>({...c,trn:e.target.value}))} style={{...inp,fontFamily:"monospace",width:160}} placeholder="CRN123456"/></FL>
              <button onClick={()=>setChallanPF(c=>({...c,status:"Paid"}))} style={{...btnG,background:"#27500A",fontSize:11,marginBottom:4}}>✔ Mark PF Paid — {f(totalPFChallan)}</button>
            </div>
            {challanPF.status==="Paid"&&<p style={{margin:"8px 0 0",fontSize:11,color:"#27500A",fontWeight:700}}>✅ PF Challan marked as paid · BSR {challanPF.bsr} · {challanPF.date}</p>}
          </div>
        </div>
      )}

      {tab==="esi"&&(
        <div style={{...card,borderTop:"none",borderRadius:"0 0 9px 9px",padding:0,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",background:"#EAF3DE",borderBottom:"1px solid #C0DD97",fontSize:10.5,color:"#27500A"}}>
            ESI applicable for employees with gross salary ≤ ₹21,000/month. Employee: 0.75% · Employer: 3.25% · Due by 15th of following month
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Employee","ESIC No.","Gross","Emp ESI (0.75%)","Empl ESI (3.25%)","Total ESI"].map((h,i)=>(
                <th key={i} style={{padding:"8px 12px",textAlign:i>=2?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{esiData.map((e,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"7px 12px",fontWeight:600,color:"#0d1326"}}>{e.name}</td>
                <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:10,color:"#5a6691"}}>{e.esic}</td>
                <td style={{padding:"7px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(e.gross)}</td>
                <td style={{padding:"7px 12px",textAlign:"right",color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{f(e.empESI)}</td>
                <td style={{padding:"7px 12px",textAlign:"right",color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>{f(e.emplESI)}</td>
                <td style={{padding:"7px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(e.empESI+e.emplESI)}</td>
              </tr>
            ))}
            {esiData.length===0&&<tr><td colSpan={6} style={{padding:"20px",textAlign:"center",color:"#5a6691"}}>No employees eligible for ESI (all earning &gt;₹21,000)</td></tr>}
            </tbody>
            <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
              <td colSpan={3} style={{padding:"8px 12px",fontWeight:700,color:"#d4a437",fontSize:11}}>TOTAL ESI CHALLAN</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(totEmpESI)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#B5D4F4",fontVariantNumeric:"tabular-nums"}}>{f(totEmplESI)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totEmpESI+totEmplESI)}</td>
            </tr></tfoot>
          </table>
        </div>
      )}

      {tab==="pt"&&(
        <div style={{...card,borderTop:"none",borderRadius:"0 0 9px 9px",padding:0,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",background:"#E6F1FB",borderBottom:"1px solid #B5D4F4",fontSize:10.5,color:"#185FA5"}}>
            Professional Tax (Maharashtra): ₹200/month for employees earning &gt;₹10,000 · Paid to state govt via mahagst.gov.in · Monthly challan
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#0d1326"}}>{["Employee","Gross Salary","PT Applicable","PT Amount"].map((h,i)=><th key={i} style={{padding:"8px 12px",textAlign:i>=1?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>{h}</th>)}</tr></thead>
            <tbody>{ptData.map((e,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
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

/* ── YEAR-END CLOSING ─────────────────────────────────────────── */

export function EmployeeAdvances({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [filter,setFilter]=useState("Active");

  const all=EMP_LOANS_DATA.filter(l=>!brCode||l.branch===brCode);
  const visible=filter==="Active"?all.filter(l=>l.outstanding>0):filter==="Closed"?all.filter(l=>l.outstanding===0):all;

  const totDisbursed=visible.reduce((s,l)=>s+l.principal,0);
  const totOutstanding=visible.reduce((s,l)=>s+l.outstanding,0);
  const totEmi=visible.reduce((s,l)=>s+(l.outstanding>0?l.emi:0),0);
  const activeCount=visible.filter(l=>l.outstanding>0).length;
  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>👤 Employee Loans &amp; Salary Advances</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>Loan disbursement · EMI deduction schedule · Auto-recovery from payroll</p>
        </div>
        <button style={{padding:"7px 14px",border:"none",background:"#d4a437",color:"#0d1326",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"}}>＋ Disburse Loan</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Total Disbursed</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{cur+fmt(totDisbursed)}</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Outstanding</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{cur+fmt(totOutstanding)}</p></div>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Active Loans</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{activeCount}</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Monthly EMI Recovery</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{cur+fmt(totEmi)}</p></div>
      </div>

      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        {["Active","Closed","All"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"4px 12px",border:"1px solid "+(filter===f?"#0d1326":"#e1e3ec"),background:filter===f?"#0d1326":"#fff",color:filter===f?"#d4a437":"#5a6691",borderRadius:14,fontSize:11,fontWeight:600,cursor:"pointer"}}>{f}</button>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Loan ID</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Employee</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Type</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Principal</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Disbursed</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>EMI</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Paid/Total</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Outstanding</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Status</th>
            </tr></thead>
            <tbody>
              {visible.map((l,i)=>(
                <tr key={l.id} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{l.id}</td>
                  <td style={{padding:"7px 8px",fontWeight:600}}>{l.name}<div style={{fontSize:9.5,color:"#5a6691",fontWeight:400}}>{l.empCode} · {l.designation} · {l.branch}</div></td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:l.type==="Salary Advance"?"#FAEEDA":l.type==="Education Loan"?"#E6F1FB":"#FCEBEB",color:l.type==="Salary Advance"?"#854F0B":l.type==="Education Loan"?"#185FA5":"#A32D2D"}}>{l.type}</span></td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600}}>{cur+fmt(l.principal)}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{l.disbursedDate}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(l.emi)}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{l.paid}/{l.emiCount}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,color:l.outstanding>0?"#A32D2D":"#27500A"}}>{cur+fmt(l.outstanding)}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:l.outstanding>0?"#FAEEDA":"#EAF3DE",color:l.outstanding>0?"#854F0B":"#27500A"}}>{l.outstanding>0?"Active":"Closed"}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{background:"#FAEEDA",fontWeight:700,fontSize:11.5}}>
              <tr><td colSpan={3} style={{padding:"9px 8px",textAlign:"right"}}>TOTAL</td>
              <td style={{padding:"9px 8px",textAlign:"right"}}>{cur+fmt(totDisbursed)}</td>
              <td></td>
              <td style={{padding:"9px 8px",textAlign:"right"}}>{cur+fmt(totEmi)}</td>
              <td></td>
              <td style={{padding:"9px 8px",textAlign:"right",color:"#A32D2D"}}>{cur+fmt(totOutstanding)}</td>
              <td></td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p style={{marginTop:12,fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>
        💡 EMI auto-deducted from monthly payroll · Interest on staff loans &lt; SBI lending rate is treated as perquisite (Sec 17(2))
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SETTINGS & WORKFLOW ADDITIONS
   Period Lock, Approval Workflow, Pending Approvals, Bank API, GSP/IRP
   ════════════════════════════════════════════════════════════════ */


export function EmployeeMasterTabbed(){
  const [tab,setTab]=useState("basic");
  const tabs=[{id:"basic",label:"1. Basic Info"},{id:"address",label:"2. Address"},{id:"bank",label:"3. Bank Details"},{id:"tax",label:"4. Tax Info"},{id:"salary",label:"5. Salary Components"},{id:"leave",label:"6. Leave Balance"},{id:"attend",label:"7. Attendance"},{id:"perf",label:"8. Performance"},{id:"docs",label:"9. Documents"},{id:"notes",label:"10. Notes"}];
  return TAB_Page("Employee Master", "10-tab structure",
    {user:"AD",date:"2026-05-19 11:30",created:"2017-06-01 09:00"},
    <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
      <div style={{display:"flex",borderBottom:"1px solid #e1e3ec",overflowX:"auto",background:"#fafbfd"}}>{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={tabBtnStyle(tab===t.id)}>{t.label}</button>)}</div>
      {tab==="basic"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
          <FL label="Full Name"><input defaultValue="" style={inpStd}/></FL>
          <FL label="Employee ID"><input defaultValue="" readOnly style={{...inpStd,fontFamily:"monospace",background:"#fafbfd"}}/></FL>
          <FL label="Date of Birth"><input type="date" defaultValue="1985-03-22" style={inpStd}/></FL>
          <FL label="Designation"><input defaultValue="Senior Finance Manager (CFO-equivalent)" style={inpStd}/></FL>
          <FL label="Department"><select style={inpStd}><option>Finance</option><option>Operations</option><option>HR</option><option>IT</option></select></FL>
          <FL label="Branch"><select style={inpStd}><option>TKHO</option><option>BOM</option><option>AMD</option></select></FL>
          <FL label="Date of Joining"><input type="date" defaultValue="2017-06-01" style={inpStd}/></FL>
          <FL label="Years of Service"><input defaultValue="9 years" readOnly style={{...inpStd,background:"#fafbfd"}}/></FL>
          <FL label="Reporting To"><select style={inpStd}><option value="">— Select —</option></select></FL>
          <FL label="Email (Official)"><input defaultValue="faiz.fm@travkings.com" style={{...inpStd,fontFamily:"monospace",fontSize:11}}/></FL>
          <FL label="Phone"><input defaultValue="+91 98201 47892" style={inpStd}/></FL>
          <FL label="Status"><span style={{display:"inline-block",padding:"6px 12px",background:"#d4edda",color:"#155724",borderRadius:5,fontSize:12,fontWeight:700}}>✓ Active · Permanent</span></FL>
        </div>
      )}
      {tab==="address"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={{padding:12,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase"}}>🏠 Current Address</p>
            <textarea defaultValue="Flat 1402, Sapphire Heights, Andheri West, Mumbai 400053, Maharashtra, India" rows={3} style={{...inpStd,marginTop:6,fontFamily:"inherit",resize:"vertical"}}/>
          </div>
          <div style={{padding:12,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase"}}>🏡 Permanent Address</p>
            <textarea defaultValue="Patel Niwas, Khambhalia Gate, Jamnagar 361001, Gujarat, India" rows={3} style={{...inpStd,marginTop:6,fontFamily:"inherit",resize:"vertical"}}/>
          </div>
          <div style={{padding:12,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec",gridColumn:"1 / -1"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#d4a437",textTransform:"uppercase"}}>📞 Emergency Contact</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:6}}>
              <FL label="Name"><input defaultValue="Rukhsana Patel" style={inpStd}/></FL>
              <FL label="Relationship"><input defaultValue="Spouse" style={inpStd}/></FL>
              <FL label="Phone"><input defaultValue="+91 98201 11223" style={inpStd}/></FL>
            </div>
          </div>
        </div>
      )}
      {tab==="bank"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FL label="Bank Name"><input defaultValue="HDFC Bank" style={inpStd}/></FL>
          <FL label="Account Number"><input defaultValue="50100123456789" style={{...inpStd,fontFamily:"monospace"}}/></FL>
          <FL label="IFSC"><input defaultValue="HDFC0000182" style={{...inpStd,fontFamily:"monospace"}}/></FL>
          <FL label="Account Type"><select style={inpStd}><option>Savings</option><option>Salary</option><option>Current</option></select></FL>
          <FL label="Beneficiary Name"><input defaultValue="FAIZ AHMED PATEL" style={inpStd}/></FL>
          <FL label="Branch"><input defaultValue="HDFC Andheri West" style={inpStd}/></FL>
          <div style={{gridColumn:"1 / -1",padding:10,background:"#fff3cd",border:"1px solid #ffe69a",borderRadius:6}}>
            <p style={{margin:0,fontSize:11.5,color:"#856404"}}><b>⚠ Bank account changes require approval</b> from the employee's reporting manager and HR Manager, and a void cheque/bank statement attachment.</p>
          </div>
        </div>
      )}
      {tab==="tax"&&tabPanel(
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:14}}>
            <FL label="PAN"><input defaultValue="ABCPF1234D" style={{...inpStd,fontFamily:"monospace"}}/></FL>
            <FL label="Aadhaar"><input defaultValue="XXXX XXXX 4521" style={{...inpStd,fontFamily:"monospace"}}/></FL>
            <FL label="Tax Regime"><select style={inpStd}><option>New Regime (FY 25-26)</option><option>Old Regime</option></select></FL>
          </div>
          <div style={cardStyle}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>Investment Declaration (FY 2025-26)</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead style={{background:"#f7f8fb"}}><tr><th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#5a6691",fontWeight:700}}>Section</th><th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#5a6691",fontWeight:700}}>Investment Type</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Declared</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Proof Received</th></tr></thead>
              <tbody>{[{s:"80C",t:"PPF + ELSS",d:150000,p:150000},{s:"80D",t:"Health Insurance",d:25000,p:25000},{s:"80CCD(1B)",t:"NPS",d:50000,p:0},{s:"24(b)",t:"Home Loan Interest",d:200000,p:200000}].map(r=>(<tr key={r.s} style={{borderBottom:"1px solid #f0f2f7"}}><td style={{padding:"8px 12px",fontFamily:"monospace",fontWeight:600}}>{r.s}</td><td style={{padding:"8px 12px"}}>{r.t}</td><td style={{padding:"8px 12px",textAlign:"right"}}>₹{r.d.toLocaleString("en-IN")}</td><td style={{padding:"8px 12px",textAlign:"right",color:r.p===r.d?"#22c55e":r.p>0?"#d4a437":"#A32D2D",fontWeight:700}}>₹{r.p.toLocaleString("en-IN")}</td></tr>))}</tbody>
            </table>
          </div>
        </>
      )}
      {tab==="salary"&&tabPanel(
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead style={{background:"#f7f8fb"}}><tr><th style={{padding:"9px 12px",textAlign:"left",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Component</th><th style={{padding:"9px 12px",textAlign:"right",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Monthly (₹)</th><th style={{padding:"9px 12px",textAlign:"right",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Annual (₹)</th><th style={{padding:"9px 12px",textAlign:"center",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Type</th></tr></thead>
          <tbody>{[{c:"Basic Salary",m:80000,t:"Earning"},{c:"House Rent Allowance (HRA)",m:32000,t:"Earning"},{c:"Conveyance Allowance",m:6000,t:"Earning"},{c:"Special Allowance",m:24000,t:"Earning"},{c:"Medical Allowance",m:1250,t:"Earning"},{c:"Provident Fund (Employee)",m:-9600,t:"Deduction"},{c:"Professional Tax",m:-200,t:"Deduction"},{c:"Income Tax (TDS)",m:-12500,t:"Deduction"}].map(r=>(<tr key={r.c} style={{borderBottom:"1px solid #f0f2f7"}}><td style={{padding:"9px 12px",fontWeight:r.c==="Basic Salary"?700:400}}>{r.c}</td><td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:r.m<0?"#A32D2D":"#0d1326",fontWeight:600}}>{r.m<0?"(":""}₹{Math.abs(r.m).toLocaleString("en-IN")}{r.m<0?")":""}</td><td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:r.m<0?"#A32D2D":"#0d1326"}}>{r.m<0?"(":""}₹{Math.abs(r.m*12).toLocaleString("en-IN")}{r.m<0?")":""}</td><td style={{padding:"9px 12px",textAlign:"center"}}><span style={{padding:"2px 8px",background:r.t==="Earning"?"#d4edda":"#f8d7da",color:r.t==="Earning"?"#155724":"#721c24",borderRadius:3,fontSize:10,fontWeight:700}}>{r.t}</span></td></tr>))}
          <tr style={{background:"#0d1326",color:"#d4a437"}}><td style={{padding:"10px 12px",fontWeight:700,letterSpacing:"0.3px"}}>NET TAKE-HOME (per month)</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,fontFamily:"monospace",fontSize:14}}>₹1,20,950</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,fontFamily:"monospace",fontSize:14}}>₹14,51,400</td><td></td></tr></tbody>
        </table>
      )}
      {tab==="leave"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {[{type:"Casual Leave (CL)",entitled:12,used:4,color:"#d4a437"},{type:"Sick Leave (SL)",entitled:8,used:2,color:"#A32D2D"},{type:"Earned Leave (EL)",entitled:24,used:2,color:"#22c55e"}].map(l=>{const pct=l.used/l.entitled*100;return (<div key={l.type} style={{padding:14,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec",borderTop:"3px solid "+l.color}}><p style={{margin:0,fontSize:11.5,fontWeight:700,color:"#0d1326"}}>{l.type}</p><div style={{display:"flex",alignItems:"baseline",gap:6,marginTop:8}}><span style={{fontSize:26,fontWeight:700,color:"#0d1326"}}>{l.entitled-l.used}</span><span style={{fontSize:12,color:"#5a6691"}}>/ {l.entitled} days left</span></div><div style={{marginTop:8,height:6,background:"#f0f2f7",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:l.color,borderRadius:3}}/></div><p style={{margin:"6px 0 0",fontSize:10.5,color:"#5a6691"}}>{l.used} used · {l.entitled-l.used} remaining</p></div>);})}
        </div>
      )}
      {tab==="attend"&&tabPanel(
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:14}}>Monthly Attendance Summary</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead style={{background:"#f7f8fb"}}><tr><th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#5a6691",fontWeight:700}}>Month</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Working Days</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Present</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Absent</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>Leave</th><th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#5a6691",fontWeight:700}}>%</th></tr></thead>
            <tbody>{[{m:"May-26",w:22,p:21,a:0,l:1,pct:95.5},{m:"Apr-26",w:21,p:20,a:0,l:1,pct:95.2},{m:"Mar-26",w:23,p:23,a:0,l:0,pct:100},{m:"Feb-26",w:20,p:19,a:0,l:1,pct:95.0}].map(r=>(<tr key={r.m} style={{borderBottom:"1px solid #f0f2f7"}}><td style={{padding:"8px 12px",fontWeight:600}}>{r.m}</td><td style={{padding:"8px 12px",textAlign:"right"}}>{r.w}</td><td style={{padding:"8px 12px",textAlign:"right",color:"#22c55e",fontWeight:700}}>{r.p}</td><td style={{padding:"8px 12px",textAlign:"right",color:r.a>0?"#A32D2D":"#5a6691"}}>{r.a}</td><td style={{padding:"8px 12px",textAlign:"right",color:"#d4a437"}}>{r.l}</td><td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:r.pct>=95?"#22c55e":"#d4a437"}}>{r.pct.toFixed(1)}%</td></tr>))}</tbody>
          </table>
        </div>
      )}
      {tab==="perf"&&tabPanel(
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
            {[{l:"Last Review",v:"Mar 2026",c:"#0d1326"},{l:"Rating",v:"4.5 / 5 ⭐",c:"#22c55e"},{l:"Next Review",v:"Mar 2027",c:"#d4a437"}].map(k=>(<div key={k.l} style={{padding:12,background:"#fafbfd",borderRadius:6,border:"1px solid #e1e3ec",borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"3px 0 0",fontSize:18,fontWeight:700,color:"#0d1326"}}>{k.v}</p></div>))}
          </div>
          <div style={cardStyle}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>Performance History</p>
            {[{p:"FY 2025-26",r:4.5,k:"Exceeded all targets · Led GST automation project · Clean audit"},{p:"FY 2024-25",r:4.2,k:"Met all targets · Successfully managed branch expansion"},{p:"FY 2023-24",r:4.0,k:"Met all targets · Process improvements in receivables management"}].map(p=>(<div key={p.p} style={{padding:"10px 12px",background:"#fafbfd",borderRadius:6,marginBottom:6,border:"1px solid #e1e3ec"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>{p.p}</p><span style={{padding:"2px 8px",background:p.r>=4.5?"#d4edda":p.r>=4?"#fff3cd":"#f8d7da",color:p.r>=4.5?"#155724":p.r>=4?"#856404":"#721c24",borderRadius:3,fontSize:11,fontWeight:700}}>⭐ {p.r}</span></div><p style={{margin:0,fontSize:11,color:"#5a6691"}}>{p.k}</p></div>))}
          </div>
        </>
      )}
      {tab==="docs"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>{["Offer Letter","Employment Contract","Background Verification","Educational Certificates","CA Membership Certificate","PAN Card Copy","Aadhaar Card Copy"].map(d=>(<div key={d} style={{padding:14,background:"#fafbfd",border:"1px solid #e1e3ec",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:32}}>📄</p><p style={{margin:"6px 0 2px",fontSize:11.5,color:"#0d1326",fontWeight:600}}>{d}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>2017-06-01</p><button style={{marginTop:6,padding:"3px 10px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:4,fontSize:10,cursor:"pointer",fontWeight:600}}>View</button></div>))}<button style={{padding:24,background:"transparent",border:"2px dashed #d4a437",color:"#d4a437",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>+ Upload</button></div>
      )}
      {tab==="notes"&&tabPanel(
        <div>{[].map((n,i)=>(<div key={i} style={{padding:"10px 12px",background:"#fafbfd",borderRadius:6,marginBottom:8,borderLeft:"3px solid #d4a437"}}><p style={{margin:0,fontSize:12,color:"#0d1326",lineHeight:1.5}}>{n.txt}</p><p style={{margin:"4px 0 0",fontSize:10,color:"#5a6691"}}>{n.u} · {n.ts}</p></div>))}</div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PHASE 2 — UNIVERSAL MASTER FEATURES (3 screens covering 7 features)
   ════════════════════════════════════════════════════════════════════ */


export function HRPortal({setRoute}){
  const tiles=[
    {icon:"📋",title:"Leave Application",sub:"Apply / check balance",route:"/hr/leave-apply",color:"#3b82f6"},
    {icon:"💰",title:"Reimbursement Claim",sub:"Submit expense claims",route:"/hr/reimbursement",color:"#22c55e"},
    {icon:"🧾",title:"My Payslip",sub:"View & download payslips",route:"/hr/my-payslip",color:"#d4a437"},
    {icon:"📑",title:"Investment Declaration",sub:"Submit IT investments",route:"/hr/investment-declaration",color:"#6B4C8B"},
    {icon:"📃",title:"Form 16",sub:"Annual salary certificate",route:"/hr/form-16",color:"#0d1326"},
    {icon:"⭐",title:"Performance Review",sub:"View & submit reviews",route:"/hr/performance",color:"#f97316"},
    {icon:"🔄",title:"360° Feedback",sub:"Give & receive feedback",route:"/hr/feedback-360",color:"#A32D2D"},
    {icon:"🎓",title:"Skill Matrix",sub:"My skills & development",route:"/hr/skills",color:"#2F7A8E"},
  ];
  return(
    <PHASE2_Page title="Employee Self-Service Portal" subtitle="">
      {/* Quick stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginBottom:18}}>
        {[{l:"Leave Balance",v:"7 days",c:"#22c55e"},{l:"Pending Claims",v:"₹1,240",c:"#f97316"},{l:"Last Payslip",v:"Apr 2026",c:"#d4a437"},{l:"Tax Declared",v:"₹2,44,600",c:"#6B4C8B"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"5px 0 0",fontSize:20,fontWeight:700,color:"#0d1326"}}>{k.v}</p></div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12}}>
        {tiles.map(t=>(
          <button key={t.route} onClick={()=>setRoute(t.route)}
            style={{padding:20,background:"#fff",border:"1px solid #e1e3ec",borderRadius:10,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:16,boxShadow:"0 2px 8px rgba(0,0,0,0.04)",borderLeft:"4px solid "+t.color}}>
            <span style={{fontSize:30}}>{t.icon}</span>
            <div><p style={{margin:0,fontSize:13.5,fontWeight:700,color:"#0d1326"}}>{t.title}</p><p style={{margin:"2px 0 0",fontSize:11,color:"#5a6691"}}>{t.sub}</p></div>
          </button>
        ))}
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   2. LEAVE APPLICATION WORKFLOW
   ════════════════════════════════════════════════════════════════════ */

export function LeaveApply(){
  const [type,setType]=useState("Casual Leave");
  const [from,setFrom]=useState("2026-06-02");
  const [to,setTo]=useState("2026-06-03");
  const [reason,setReason]=useState("");
  const [submitted,setSubmitted]=useState(false);
  const inp={padding:"8px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12.5,width:"100%"};
  const days=Math.max(1,Math.round((new Date(to)-new Date(from))/86400000)+1);
  const balances=[{type:"Casual Leave",balance:4},{type:"Sick Leave",balance:8},{type:"Earned Leave",balance:7},{type:"LOP",balance:null}];
  const bal=balances.find(b=>b.type===type);
  const MY_LEAVE_HISTORY=[];
  return(
    <PHASE2_Page title="Leave Application" subtitle="Apply for leave">
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {submitted?(
            <div style={{padding:24,background:"#d4edda",border:"1px solid #bbf7d0",borderRadius:8,textAlign:"center"}}>
              <p style={{margin:0,fontSize:32}}>✅</p>
              <p style={{margin:"10px 0 4px",fontSize:15,fontWeight:700,color:"#155724"}}>Leave application submitted!</p>
              <p style={{margin:0,fontSize:12,color:"#155724"}}>Awaiting approval · You'll receive an email notification</p>
              <button onClick={()=>setSubmitted(false)} style={{marginTop:14,padding:"8px 18px",background:"#155724",color:"#fff",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>Apply Another</button>
            </div>
          ):(
            <div style={cardStyle}>
              <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>New Leave Application</p>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Leave Type</label>
                  <select value={type} onChange={e=>setType(e.target.value)} style={inp}>{balances.map(b=><option key={b.type}>{b.type}</option>)}</select></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>From</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={inp}/></div>
                  <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>To</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} style={inp}/></div>
                </div>
                <div style={{padding:10,background:"#fff8e8",border:"1px solid #fde68a",borderRadius:6,display:"flex",justifyContent:"space-between",fontSize:12}}>
                  <span>Duration: <b>{days} day{days!==1?"s":""}</b></span>
                  {bal?.balance!=null&&<span>Balance after: <b style={{color:bal.balance-days<0?"#A32D2D":"#22c55e"}}>{bal.balance-days} day{bal.balance-days!==1?"s":""}</b></span>}
                  {bal?.balance==null&&<span style={{color:"#5a6691"}}>LOP — salary deducted</span>}
                </div>
                <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Reason</label><textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} style={{...inp,fontFamily:"inherit",resize:"vertical"}} placeholder="Brief reason for leave…"/></div>
                <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Backup arrangement (who will cover)</label><input style={inp} placeholder="Who will cover"/></div>
                <button onClick={()=>reason.length>0&&setSubmitted(true)} style={{padding:"10px",background:reason.length>0?"#d4a437":"#e1e3ec",color:reason.length>0?"#0d1326":"#5a6691",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:reason.length>0?"pointer":"not-allowed"}}>Submit Application</button>
              </div>
            </div>
          )}
          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Leave History</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Dates</th><th style={RPT_thStyle}>Type</th><th style={{...RPT_thStyle,textAlign:"center"}}>Days</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
              <tbody>{MY_LEAVE_HISTORY.map((h,i)=>(<tr key={i} style={{borderBottom:"1px solid #f0f2f7"}}><td style={{...RPT_tdStyle,fontSize:10.5}}>{h.dates}</td><td style={RPT_tdStyle}>{h.type}</td><td style={{...RPT_tdStyle,textAlign:"center"}}>{h.days}</td><td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 7px",background:"#d4edda",color:"#155724",borderRadius:3,fontSize:10,fontWeight:700}}>{h.status}</span></td></tr>))}</tbody>
            </table>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={cardStyle}>
            <p style={{margin:"0 0 12px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Leave Balance</p>
            {balances.filter(b=>b.balance!=null).map(b=>(
              <div key={b.type} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:11.5,color:"#0d1326"}}>{b.type}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#0d1326"}}>{b.balance} days</span>
                </div>
                <div style={{height:6,background:"#f0f2f7",borderRadius:3}}><div style={{height:"100%",width:(b.balance/12*100)+"%",background:b.balance<=2?"#A32D2D":b.balance<=5?"#d4a437":"#22c55e",borderRadius:3}}/></div>
              </div>
            ))}
          </div>
          <div style={{padding:14,background:"#fafbfd",border:"1px solid #e1e3ec",borderRadius:8,fontSize:11.5,color:"#5a6691"}}>
            <p style={{margin:"0 0 6px",fontWeight:700,color:"#0d1326",fontSize:12}}>Approval chain</p>
            <p style={{margin:0}}>1. Reporting Manager — primary approver</p>
            <p style={{margin:"3px 0 0"}}>2. Department Head — for leaves &gt; 5 days</p>
            <p style={{margin:"8px 0 0",fontSize:10.5}}>Approved within 1 working day</p>
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   3. REIMBURSEMENT CLAIM WORKFLOW
   ════════════════════════════════════════════════════════════════════ */

export function ReimbursementClaim(){
  const [items,setItems]=useState([{id:1,date:"2026-05-20",cat:"Stationery",desc:"",amount:0}]);
  const [nextId,setNextId]=useState(2);
  const addItem=()=>{setItems(it=>[...it,{id:nextId,date:"2026-05-20",cat:"Travel",desc:"",amount:0}]);setNextId(n=>n+1);};
  const removeItem=id=>setItems(it=>it.filter(x=>x.id!==id));
  const total=items.reduce((s,x)=>s+x.amount,0);
  const inp={padding:"6px 8px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:11.5,width:"100%"};
  const cats=["Travel","Meals","Stationery","Internet","Mobile","Equipment","Training","Other"];
  return(
    <PHASE2_Page title="Reimbursement Claim" subtitle="Submit expense claims for approval and payment">
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={cardStyle}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Claim Line Items</p>
              <button onClick={addItem} style={{padding:"5px 12px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:5,fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add Row</button>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Date</th><th style={RPT_thStyle}>Category</th><th style={RPT_thStyle}>Description</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th><th style={RPT_thStyle}>Receipt</th><th style={RPT_thStyle}/></tr></thead>
              <tbody>
                {items.map(it=>(
                  <tr key={it.id} style={{borderBottom:"1px solid #f0f2f7"}}>
                    <td style={{padding:"6px 8px"}}><input type="date" defaultValue={it.date} style={{...inp,width:120}}/></td>
                    <td style={{padding:"6px 8px"}}><select style={inp}>{cats.map(c=><option key={c} selected={c===it.cat}>{c}</option>)}</select></td>
                    <td style={{padding:"6px 8px"}}><input placeholder="Brief description…" style={inp}/></td>
                    <td style={{padding:"6px 8px"}}><input type="number" defaultValue={it.amount||""} onChange={e=>{const v=+e.target.value;setItems(a=>a.map(x=>x.id===it.id?{...x,amount:v}:x));}} placeholder="0" style={{...inp,textAlign:"right",fontFamily:"monospace",fontWeight:700,width:90}}/></td>
                    <td style={{padding:"6px 8px",textAlign:"center"}}><button style={{padding:"3px 8px",background:"#f7f8fb",border:"1px dashed #cbd0dc",borderRadius:4,fontSize:10,cursor:"pointer",color:"#5a6691"}}>📎 Upload</button></td>
                    <td style={{padding:"6px 8px"}}>{items.length>1&&<button onClick={()=>removeItem(it.id)} style={{padding:"3px 6px",background:"transparent",border:"none",color:"#A32D2D",fontSize:14,cursor:"pointer"}}>×</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,padding:"10px 8px",background:"#f7f8fb",borderRadius:6}}>
              <span style={{fontSize:12,fontWeight:700,color:"#0d1326"}}>Total Claim</span>
              <span style={{fontSize:16,fontWeight:700,color:"#0d1326",fontFamily:"monospace"}}>{fmtINR(total)}</span>
            </div>
            <div style={{marginTop:10}}><label style={{fontSize:11,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.4px"}}>Additional Notes</label><textarea rows={2} style={{...inp,fontFamily:"inherit",resize:"none",fontSize:12}} placeholder="Any context or special instructions…"/></div>
            <div style={{marginTop:12,display:"flex",justifyContent:"flex-end"}}><button style={{padding:"9px 22px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer"}}>Submit Claim — {fmtINR(total)}</button></div>
          </div>
          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>My Claims History</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Claim ID</th><th style={RPT_thStyle}>Date</th><th style={RPT_thStyle}>Category</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th><th style={RPT_thStyle}>Paid On</th></tr></thead>
              <tbody>{MY_CLAIMS_DATA.map(c=>(<tr key={c.id} style={{borderBottom:"1px solid #f0f2f7"}}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5}}>{c.id}</td><td style={RPT_tdStyle}>{c.date}</td><td style={RPT_tdStyle}>{c.category}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(c.amount)}</td><td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:700,background:c.status==="Paid"||c.status==="Approved"?"#d4edda":"#fff3cd",color:c.status==="Paid"||c.status==="Approved"?"#155724":"#856404"}}>{c.status}</span></td><td style={{...RPT_tdStyle,fontSize:11,color:"#5a6691"}}>{c.paid}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
        <div style={{padding:14,background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,height:"fit-content"}}>
          <p style={{margin:"0 0 10px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Policy Limits</p>
          {[{cat:"Travel",limit:"₹2,000/trip"},  {cat:"Meals",limit:"₹500/day"},{cat:"Stationery",limit:"₹1,500/month"},{cat:"Internet",limit:"₹500/month"},{cat:"Equipment",limit:"Mgr approval"},{cat:"Training",limit:"₹10,000/year"}].map(p=>(
            <div key={p.cat} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f0f2f7",fontSize:11.5}}>
              <span style={{color:"#5a6691"}}>{p.cat}</span><span style={{fontWeight:700,color:"#0d1326"}}>{p.limit}</span>
            </div>
          ))}
          <p style={{margin:"10px 0 0",fontSize:10.5,color:"#5a6691"}}>Original receipts required for claims &gt; ₹500. Approved within 3 working days.</p>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   4. PAYSLIP SELF-DOWNLOAD
   ════════════════════════════════════════════════════════════════════ */

export function MyPayslip(){
  const [selMonth,setSelMonth]=useState("April 2026");
  const months=["May 2026","April 2026","March 2026","February 2026","January 2026","December 2025","November 2025","October 2025"];
  const d=MY_PAYSLIP_DATA;
  const totalEarnings=d.earnings.reduce((s,e)=>s+e.amount,0);
  const totalDeductions=d.deductions.reduce((s,e)=>s+e.amount,0);
  const netPay=totalEarnings-totalDeductions;
  return(
    <PHASE2_Page title="My Payslip" subtitle="View and download your monthly salary statement"
      toolbar={<><select value={selMonth} onChange={e=>setSelMonth(e.target.value)} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,background:"#fff"}}>{months.map(m=><option key={m}>{m}</option>)}</select><button onClick={()=>window.print()} style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>📥 Download PDF</button></>}>
      <div style={{maxWidth:680,margin:"0 auto"}}>
        <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
          {/* Header */}
          <div style={{padding:"18px 22px",background:"#0d1326",color:"#fff"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><p style={{margin:0,fontSize:18,fontWeight:700,color:"#d4a437",letterSpacing:"0.5px"}}>Travkings Tours & Travels Pvt. Ltd.</p><p style={{margin:"3px 0 0",fontSize:11,color:"#5a6691"}}>Lower Parel, Mumbai · IATA Accredited</p></div>
              <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:14,fontWeight:700}}>Payslip</p><p style={{margin:"2px 0 0",fontSize:12,color:"#d4a437"}}>{selMonth}</p></div>
            </div>
          </div>
          {/* Employee info */}
          <div style={{padding:"14px 22px",background:"#fafbfd",borderBottom:"1px solid #e1e3ec",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11.5}}>
            {[{l:"Employee",v:d.employee},{l:"Employee ID",v:d.empId},{l:"Branch",v:d.branch},{l:"Department",v:d.dept}].map(f=>(
              <div key={f.l} style={{display:"flex",gap:8}}><span style={{color:"#5a6691",minWidth:90}}>{f.l}:</span><b>{f.v}</b></div>
            ))}
          </div>
          {/* Earnings / Deductions */}
          <div style={{padding:"0 22px",display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid #e1e3ec"}}>
            <div style={{paddingRight:16,borderRight:"1px solid #e1e3ec"}}>
              <p style={{margin:"12px 0 8px",fontSize:11,fontWeight:700,color:"#155724",textTransform:"uppercase",letterSpacing:"0.4px"}}>Earnings</p>
              {d.earnings.map(e=>(
                <div key={e.desc} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f0f2f7",fontSize:11.5}}>
                  <span style={{color:"#0d1326"}}>{e.desc}</span><span style={{fontFamily:"monospace",fontWeight:600}}>₹{e.amount.toLocaleString("en-IN")}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderTop:"2px solid #0d1326",marginTop:4,fontWeight:700}}>
                <span>Gross Earnings</span><span style={{fontFamily:"monospace",color:"#22c55e"}}>₹{totalEarnings.toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div style={{paddingLeft:16}}>
              <p style={{margin:"12px 0 8px",fontSize:11,fontWeight:700,color:"#A32D2D",textTransform:"uppercase",letterSpacing:"0.4px"}}>Deductions</p>
              {d.deductions.map(e=>(
                <div key={e.desc} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f0f2f7",fontSize:11.5}}>
                  <span style={{color:"#0d1326"}}>{e.desc}</span><span style={{fontFamily:"monospace",fontWeight:600}}>₹{e.amount.toLocaleString("en-IN")}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderTop:"2px solid #0d1326",marginTop:4,fontWeight:700}}>
                <span>Total Deductions</span><span style={{fontFamily:"monospace",color:"#A32D2D"}}>₹{totalDeductions.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
          {/* Net pay */}
          <div style={{padding:"16px 22px",background:"#fff8e8",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Net Pay</p><p style={{margin:"2px 0 0",fontSize:11,color:"#5a6691"}}>Credited to HDFC ...4321 on 1st May 2026</p></div>
            <p style={{margin:0,fontSize:26,fontWeight:700,color:"#0d1326",fontFamily:"monospace"}}>₹{netPay.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   5. INVESTMENT DECLARATION FORM
   ════════════════════════════════════════════════════════════════════ */

export function PerformanceReview(){
  const [tab,setTab]=useState("current");
  const kpis=[{kpi:"Voucher Accuracy %",target:"≥ 99%",weight:25},{kpi:"Month-end Close (by)",target:"5th of month",weight:20},{kpi:"Pending Items < N",target:"< 5 items",weight:15},{kpi:"Training Completion",target:"100%",weight:15},{kpi:"Customer Escalations",target:"0",weight:15},{kpi:"Process Improvements",target:"2/year",weight:10}];
  const prev=PERFORMANCE_REVIEWS[0];
  return(
    <PHASE2_Page title="Performance Review Module" subtitle="Annual KPI-based reviews · self-assessment · manager rating">
      <div style={{display:"flex",borderBottom:"1px solid #e1e3ec",marginBottom:14,background:"#fff",borderRadius:"8px 8px 0 0",overflow:"hidden",border:"1px solid #e1e3ec"}}>
        {[{k:"current",l:"FY 2025-26 (In Progress)"},{k:"history",l:"Previous Reviews"}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={tabBtnStyle(tab===t.k)}>{t.l}</button>
        ))}
      </div>
      {tab==="current"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={cardStyle}>
            <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>KPI Self-Assessment — FY 2025-26</p>
            {kpis.map((k,i)=>(
              <div key={i} style={{marginBottom:14,paddingBottom:14,borderBottom:"1px solid #f0f2f7"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#0d1326"}}>{k.kpi}</span>
                  <span style={{fontSize:10.5,color:"#5a6691"}}>Weight: {k.weight}%</span>
                </div>
                <p style={{margin:"0 0 6px",fontSize:10.5,color:"#5a6691"}}>Target: {k.target}</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div><label style={{fontSize:10,color:"#5a6691",fontWeight:700,display:"block",marginBottom:2}}>My Achievement</label><input style={{padding:"5px 8px",border:"1px solid #e1e3ec",borderRadius:4,fontSize:11.5,width:"100%"}} placeholder="e.g. 99.4%"/></div>
                  <div><label style={{fontSize:10,color:"#5a6691",fontWeight:700,display:"block",marginBottom:2}}>Self-Rating (1-5)</label><select style={{padding:"5px 8px",border:"1px solid #e1e3ec",borderRadius:4,fontSize:11.5,width:"100%"}}><option>5 — Exceeded</option><option selected>4 — Met</option><option>3 — Partially Met</option><option>2 — Below Target</option><option>1 — Not Met</option></select></div>
                </div>
              </div>
            ))}
            <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.4px"}}>Overall Self-Comments</label><textarea rows={3} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%",fontFamily:"inherit",resize:"none"}} placeholder="Achievements, challenges, and development areas…"/></div>
            <button style={{marginTop:12,padding:"9px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer",width:"100%"}}>Submit Self-Assessment</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{padding:14,background:"#fff8e8",border:"1px solid #fde68a",borderRadius:8}}>
              <p style={{margin:"0 0 6px",fontSize:12,fontWeight:700,color:"#856404"}}>📅 Review Timeline</p>
              {[{step:"Self-assessment submission",by:"31-May-2026",done:false},{step:"Manager review",by:"15-Jun-2026",done:false},{step:"Calibration session",by:"25-Jun-2026",done:false},{step:"Final rating & feedback",by:"30-Jun-2026",done:false}].map((t,i)=>(
                <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"4px 0",fontSize:11.5}}>
                  <span style={{color:t.done?"#22c55e":"#5a6691"}}>{t.done?"✓":"○"}</span>
                  <span style={{color:"#0d1326"}}>{t.step}</span>
                  <span style={{marginLeft:"auto",color:"#856404",fontFamily:"monospace",fontSize:11}}>{t.by}</span>
                </div>
              ))}
            </div>
            <div style={cardStyle}>
              <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>My Development Goals</p>
              {["Complete GST Advanced certification by Aug 2026","Learn Power BI for financial dashboards","Shadow Sr. AE on period-end close process","Attend travel industry FHRAI conference"].map((g,i)=>(
                <div key={i} style={{display:"flex",gap:8,padding:"5px 0",borderBottom:"1px solid #f0f2f7",fontSize:11.5}}>
                  <input type="checkbox" defaultChecked={i<1}/>
                  <span style={{textDecoration:i<1?"line-through":"none",color:i<1?"#5a6691":"#0d1326"}}>{g}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {tab==="history"&&!prev&&(
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:12,color:"#5a6691",textAlign:"center",padding:"24px 0"}}>No previous reviews on record yet.</p>
        </div>
      )}
      {tab==="history"&&prev&&(
        <div style={cardStyle}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Previous Review — {prev.period}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div><p style={{margin:0,fontSize:11,color:"#5a6691"}}>Reviewer: <b style={{color:"#0d1326"}}>{prev.reviewer}</b></p><p style={{margin:"3px 0 0",fontSize:11,color:"#5a6691"}}>Grade: <b style={{color:"#d4a437",fontSize:13}}>{prev.grade}</b></p></div>
            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:11,color:"#5a6691"}}>Score</p><p style={{margin:0,fontSize:36,fontWeight:700,color:"#0d1326"}}>{prev.score}<span style={{fontSize:14,color:"#5a6691"}}>/100</span></p></div>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>KPI</th><th style={{...RPT_thStyle,textAlign:"right"}}>Target</th><th style={{...RPT_thStyle,textAlign:"right"}}>Actual</th><th style={{...RPT_thStyle,textAlign:"right"}}>Score</th></tr></thead>
            <tbody>{(prev.kpis||[]).map((k,i)=>(<tr key={i} style={{borderBottom:"1px solid #f0f2f7"}}><td style={RPT_tdStyle}>{k.kpi}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{k.target}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#22c55e"}}>{k.actual}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{k.score}</td></tr>))}</tbody>
          </table>
          <div style={{marginTop:12,padding:12,background:"#fafbfd",borderRadius:6}}>
            <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Manager Comments</p>
            <p style={{margin:0,fontSize:11.5,color:"#5a6691"}}>{prev.comments}</p>
          </div>
        </div>
      )}
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   8. 360° FEEDBACK MODULE
   ════════════════════════════════════════════════════════════════════ */

export function Feedback360(){
  const [tab,setTab]=useState("received");
  const avgScore=FEEDBACK_360_DATA.filter(f=>f.submitted&&f.score).reduce((s,f,_,a)=>s+f.score/a.filter(x=>x.submitted).length,0);
  const QUESTIONS=["Demonstrates technical competence in their role","Communicates clearly and effectively","Meets commitments and deadlines","Collaborates well with the team","Suggests improvements proactively","Shows ownership and accountability"];
  return(
    <PHASE2_Page title="360° Feedback Module" subtitle="Multi-source feedback · manager · peers · self · all anonymous except manager">
      <div style={{display:"flex",borderBottom:"1px solid #e1e3ec",marginBottom:14,background:"#fff",border:"1px solid #e1e3ec",borderRadius:"8px 8px 0 0",overflow:"hidden"}}>
        {[{k:"received",l:"My Feedback"},{k:"give",l:"Give Feedback"},{k:"status",l:"Submission Status"}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={tabBtnStyle(tab===t.k)}>{t.l}</button>
        ))}
      </div>
      {tab==="received"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:14}}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{...cardStyle,textAlign:"center"}}>
              <p style={{margin:0,fontSize:11,color:"#5a6691",textTransform:"uppercase",fontWeight:700}}>Overall Score</p>
              <p style={{margin:"8px 0",fontSize:44,fontWeight:700,color:"#0d1326"}}>{avgScore.toFixed(0)}<span style={{fontSize:14,color:"#5a6691"}}>/100</span></p>
              <p style={{margin:0,fontSize:11.5,color:"#d4a437",fontWeight:600}}>Based on {FEEDBACK_360_DATA.filter(f=>f.submitted).length} of {FEEDBACK_360_DATA.length} responses</p>
            </div>
            {FEEDBACK_360_DATA.map((f,i)=>(
              <div key={i} style={{...cardStyle,display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:"#0d1326",color:"#d4a437",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{f.from.substring(0,2).toUpperCase()}</div>
                <div style={{flex:1}}>
                  <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>{f.from}</p>
                  <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{f.relation}</p>
                </div>
                {f.submitted?<span style={{fontSize:16,fontWeight:700,color:"#d4a437"}}>{f.score}</span>:<span style={{fontSize:10,color:"#5a6691",padding:"2px 6px",background:"#f7f8fb",borderRadius:3}}>Pending</span>}
              </div>
            ))}
          </div>
          <div style={cardStyle}>
            <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Dimension Scores</p>
            {QUESTIONS.map((q,i)=>{const score=65+i*5;return(
              <div key={i} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:11.5,color:"#0d1326"}}>{q}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#0d1326"}}>{score}/100</span>
                </div>
                <div style={{height:8,background:"#f0f2f7",borderRadius:4}}><div style={{height:"100%",width:score+"%",background:score>=80?"#22c55e":score>=60?"#d4a437":"#A32D2D",borderRadius:4}}/></div>
              </div>
            );})}
            <div style={{marginTop:14,padding:12,background:"#fafbfd",borderRadius:6}}>
              <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Qualitative Feedback (aggregated)</p>
              <p style={{margin:0,fontSize:11.5,color:"#5a6691",lineHeight:1.5}}>"Strong attention to detail on vouchers. Would benefit from proactive communication when delays are expected. Very reliable team member."</p>
            </div>
          </div>
        </div>
      )}
      {tab==="give"&&(
        <div style={cardStyle}>
          <p style={{margin:"0 0 4px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Give Feedback to: <select style={{border:"1px solid #e1e3ec",borderRadius:4,padding:"3px 8px",fontSize:12}}><option value="">— Select —</option></select></p>
          <p style={{margin:"0 0 14px",fontSize:10.5,color:"#5a6691"}}>Your feedback is anonymous to the recipient (visible only to HR)</p>
          {QUESTIONS.map((q,i)=>(
            <div key={i} style={{marginBottom:14,paddingBottom:14,borderBottom:"1px solid #f0f2f7"}}>
              <p style={{margin:"0 0 8px",fontSize:12.5,fontWeight:600,color:"#0d1326"}}>{q}</p>
              <div style={{display:"flex",gap:8}}>
                {[1,2,3,4,5].map(s=><button key={s} style={{width:40,height:40,borderRadius:5,border:"1px solid #e1e3ec",background:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,color:"#5a6691"}}>{s}</button>)}
                <span style={{fontSize:10.5,color:"#5a6691",alignSelf:"center",marginLeft:4}}>1=Needs improvement · 5=Outstanding</span>
              </div>
            </div>
          ))}
          <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.4px"}}>Written Comments</label><textarea rows={3} style={{padding:"8px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%",fontFamily:"inherit",resize:"none"}} placeholder="Specific examples, strengths, areas for growth…"/></div>
          <button style={{marginTop:12,padding:"9px 22px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer"}}>Submit Feedback</button>
        </div>
      )}
      {tab==="status"&&(
        <div style={cardStyle}>
          <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Submission Status — Cycle: FY 2025-26 Q4</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>From</th><th style={RPT_thStyle}>Relation</th><th style={{...RPT_thStyle,textAlign:"center"}}>Submitted</th></tr></thead>
            <tbody>{FEEDBACK_360_DATA.map((f,i)=>(<tr key={i} style={{borderBottom:"1px solid #f0f2f7"}}><td style={{...RPT_tdStyle,fontWeight:600}}>{f.from}</td><td style={RPT_tdStyle}>{f.relation}</td><td style={{...RPT_tdStyle,textAlign:"center"}}>{f.submitted?<span style={{color:"#22c55e",fontWeight:700}}>✓ Submitted</span>:<span style={{color:"#f97316",fontWeight:600}}>Pending</span>}</td></tr>))}</tbody>
          </table>
        </div>
      )}
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   9. SKILL MATRIX
   ════════════════════════════════════════════════════════════════════ */

export function SkillMatrix(){
  const [selEmp,setSelEmp]=useState("");
  const emps=[];
  const categories=[...new Set(SKILLS_DATA.map(s=>s.category))];
  const Stars=({n,max=5,color="#d4a437"})=><span style={{letterSpacing:1}}>{Array.from({length:max},(_,i)=><span key={i} style={{color:i<n?color:"#e1e3ec",fontSize:14}}>★</span>)}</span>;
  return(
    <PHASE2_Page title="Skill Matrix" subtitle="Employee competency mapping · current level vs target · development gaps"
      toolbar={<select value={selEmp} onChange={e=>setSelEmp(e.target.value)} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,background:"#fff"}}>{emps.map(e=><option key={e}>{e}</option>)}</select>}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
        <div style={cardStyle}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>{selEmp} — Skill Assessment</p>
          {categories.map(cat=>(
            <div key={cat} style={{marginBottom:16}}>
              <p style={{margin:"0 0 8px",fontSize:10.5,fontWeight:700,color:"#5a6691",textTransform:"uppercase",letterSpacing:"0.4px"}}>{cat}</p>
              {SKILLS_DATA.filter(s=>s.category===cat).map(s=>(
                <div key={s.skill} style={{display:"grid",gridTemplateColumns:"160px 1fr 1fr 80px",gap:10,alignItems:"center",padding:"7px 0",borderBottom:"1px solid #f0f2f7"}}>
                  <span style={{fontSize:12,color:"#0d1326",fontWeight:600}}>{s.skill}</span>
                  <div>
                    <p style={{margin:"0 0 2px",fontSize:9.5,color:"#5a6691"}}>Current Level</p>
                    <Stars n={s.level}/>
                  </div>
                  <div>
                    <p style={{margin:"0 0 2px",fontSize:9.5,color:"#5a6691"}}>Target Level</p>
                    <Stars n={s.target} color="#0d1326"/>
                  </div>
                  <span style={{fontSize:10.5,padding:"2px 7px",borderRadius:3,background:s.level>=s.target?"#d4edda":"#fff3cd",color:s.level>=s.target?"#155724":"#856404",fontWeight:700,textAlign:"center"}}>{s.level>=s.target?"Met":"Gap: "+(s.target-s.level)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Competency Summary</p>
            {(()=>{const met=SKILLS_DATA.filter(s=>s.level>=s.target).length;const total=SKILLS_DATA.length;const pct=Math.round(met/total*100);return(<>
              <div style={{height:80,width:80,borderRadius:"50%",border:`8px solid #d4a437`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",background:"#fff"}}>
                <p style={{margin:0,fontSize:18,fontWeight:700,color:"#0d1326"}}>{pct}%</p>
              </div>
              <p style={{textAlign:"center",margin:"0 0 8px",fontSize:11.5,color:"#5a6691"}}>{met}/{total} skills at or above target</p>
            </>);})()} 
            {[{label:"Skills at target",count:SKILLS_DATA.filter(s=>s.level>=s.target).length,color:"#22c55e"},{label:"Skills below target",count:SKILLS_DATA.filter(s=>s.level<s.target).length,color:"#f97316"},{label:"Skills assessed",count:SKILLS_DATA.length,color:"#0d1326"}].map(s=>(
              <div key={s.label} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f0f2f7",fontSize:11.5}}>
                <span style={{color:"#5a6691"}}>{s.label}</span><b style={{color:s.color}}>{s.count}</b>
              </div>
            ))}
          </div>
          <div style={{padding:12,background:"#fff",border:"1px solid #e1e3ec",borderRadius:8}}>
            <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Development Focus Areas</p>
            {SKILLS_DATA.filter(s=>s.level<s.target).map(s=>(
              <div key={s.skill} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f0f2f7",fontSize:11.5}}>
                <span style={{color:"#0d1326"}}>{s.skill}</span>
                <span style={{color:"#f97316",fontWeight:700}}>L{s.level}→L{s.target}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAXATION — AUTOMATION (4 new screens)
   GSTR-1 · GSTR-3B · Form 16A · Tax Calendar
   ════════════════════════════════════════════════════════════════════ */

/* ── Tax seed data ────────────────────────────────────────────────── */

