/* ════════════════════════════════════════════════════════════════════
   MODULES/HR.JSX
   Auto-generated from KBiz360_v2.jsx · 2204 lines · 18 declarations
   ════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from 'react';
import { BarChart2 } from 'lucide-react';
import { BRANCHES } from '../../core/data';
import { compactAmt, localeOf } from '../../core/format';
import { GRP_COLORS } from '../../core/helpers';
import { useMobile } from '../../core/hooks';
import { useModalEsc } from '../../core/ux/useModalEsc';
import { useExpenseLedgers, useFiscalYears, useExpenseBudgets } from '../../core/useReference';
import { useMasterMutations } from '../../core/useMasters';
import { toast } from '../../core/ux/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPut } from '../../core/api';
import { FL, bc, btnG, btnGh, card, inp } from '../../core/styles';
import { isViewOnly, VIEW_ONLY_REASON } from '../../shell/primitives';

export function ExpenseBudget({branch,setRoute}){
  const mob=useMobile();
  const EXP_LEDGERS=useExpenseLedgers().data||[];          // DB-backed (/api/expense-ledgers)
  const FY_LIST=useFiscalYears().data||[];                 // DB-backed (/api/fiscal-years)
  const budgetRows=useExpenseBudgets().data;               // DB-backed (/api/expense-budgets)
  const qc=useQueryClient();
  const saveMut=useMutation({mutationFn:(payload)=>apiPut('/api/expense-budgets/bulk',payload),onSuccess:()=>qc.invalidateQueries({queryKey:['ref','expense-budgets']})});
  // Expense-ledger catalogue entry (/api/expense-ledgers) — the catalogue has no
  // master screen of its own, and budgets can't be set until it has rows.
  const ledgerMut=useMasterMutations('expense-ledgers');
  const vo=isViewOnly();
  const [ledgerModal,setLedgerModal]=useState(false); useModalEsc(()=>setLedgerModal(false),ledgerModal);
  const [ledgerForm,setLedgerForm]=useState({code:"",name:"",group:""});
  const saveLedger=()=>{
    if(ledgerMut.create.isPending) return;
    if(!ledgerForm.code.trim()||!ledgerForm.name.trim()){toast('Ledger code and name are required','error');return;}
    ledgerMut.create.mutate({...ledgerForm,code:ledgerForm.code.trim().toUpperCase(),sortOrder:EXP_LEDGERS.length+1,active:true},{
      onSuccess:()=>{qc.invalidateQueries({queryKey:['ref','expense-ledgers']});toast('Expense ledger added');setLedgerModal(false);setLedgerForm({code:"",name:"",group:""});},
      onError:(e)=>toast('Could not save — '+(e?.message||'unknown error'),'error'),
    });
  };
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
  const f=n=>compactAmt(n,{currency:'',dash:true}); // canonical compact (fixes 1–10 lakh shown as "K")
  const ff=n=>n>0?cur+Number(n).toLocaleString(localeOf(cur)):"—";

  return (
    <div style={{padding:"20px 32px",maxWidth:1600,margin:"0 auto"}}>
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
          <button onClick={()=>setLedgerModal(true)} style={{...btnGh,fontSize:11}}>＋ Add Ledger</button>
          {!editing
            ?<button onClick={startEdit} style={{...btnG,background:"#185FA5",fontSize:11}}>✏ Set / Edit Budget</button>
            :<><button onClick={cancelEdit} style={btnGh}>Cancel</button><button onClick={saveEdit} disabled={vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...btnG,...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>💾 Save Budget</button></>
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
              style={{padding:"5px 12px",borderRadius:7,border:"1px solid #cdd1d8",fontSize:11,cursor:"pointer",
                fontWeight:brCode===b.code?700:400,
                background:brCode===b.code?"#0d1326":"#fff",
                color:brCode===b.code?"#d4a437":"#5a6691"}}>
              {b.flag} {b.code}<span style={{marginLeft:5,padding:"1px 6px",background:"#e1e3ec",color:"#5a6691",borderRadius:3,fontSize:8.5,fontWeight:700,letterSpacing:"0.3px"}}>Branch</span>
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
                <tr key={l.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
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
              <td style={{padding:"11px 14px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums",fontSize:14}}>{cur+Number(totM).toLocaleString(localeOf(cur))}/mo</td>
              <td style={{padding:"11px 14px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums",fontSize:14}}>{cur+Number(totY).toLocaleString(localeOf(cur))}/yr</td>
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
                <tr key={l.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326",position:"sticky",left:0,background:i%2===0?"#fff":"#fafafa",borderRight:"1px solid #cdd1d8"}}>{l.icon} {l.name}</td>
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
      {ledgerModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:440,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22"}}>Add Expense Ledger</p>
              <button onClick={()=>setLedgerModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5b616e"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,180px),1fr))",gap:10}}>
                <FL label="Code"><input value={ledgerForm.code} onChange={e=>setLedgerForm(f=>({...f,code:e.target.value}))} placeholder="e.g. SAL" style={{...inp,fontFamily:"monospace",textTransform:"uppercase"}}/></FL>
                <FL label="Group"><input value={ledgerForm.group} onChange={e=>setLedgerForm(f=>({...f,group:e.target.value}))} placeholder="e.g. Staff Costs" list="exp-ledger-groups" style={inp}/></FL>
                <datalist id="exp-ledger-groups">{groups.filter(g=>g!=="All").map(g=><option key={g} value={g}/>)}</datalist>
              </div>
              <FL label="Ledger name"><input value={ledgerForm.name} onChange={e=>setLedgerForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Salaries & Wages" style={inp}/></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setLedgerModal(false)} style={btnGh}>Cancel</button>
              <button onClick={saveLedger} disabled={vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...btnG,...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>💾 Save Ledger</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EXPENSE BGT vs ACT REPORT — MTD / YTD / Annual · Travkings Group
   ════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════
   TAXATION — AUTOMATION (4 new screens)
   GSTR-1 · GSTR-3B · Form 16A · Tax Calendar
   ════════════════════════════════════════════════════════════════════ */

/* ── Tax seed data ────────────────────────────────────────────────── */

