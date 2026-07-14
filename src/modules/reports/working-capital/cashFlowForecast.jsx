/* ════════════════════════════════════════════════════════════════════
   13-WEEK CASH-FLOW FORECAST
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of finance/legacy.jsx —
   MENU_REPORTS ▸ Working Capital (href /reports/cashflow-forecast), not a
   Finance-menu item. finance/index.js re-exports CashFlowForecast from here
   so App.jsx's barrel import needed zero changes.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { Menu as DropdownMenu } from '../../../core/ux/Menu';
import { ChevronDown } from 'lucide-react';
import { toast } from '../../../core/ux/toast';
import { useCrud } from '../../../core/useRegisters';
import { useTrialBalance } from '../../../core/useAccounting';
import { bc, btnG, inp } from '../../../core/styles';
import { fmt } from '../../../core/format';

export function CashFlowForecast({branch}){
  const cur=bc(branch).cur;
  const brCode=branch==="ALL"?undefined:branch&&branch.code;
  const { rows, create, remove } = useCrud('cashflow-forecast', brCode?{branch:brCode}:{});
  const tb=useTrialBalance(branch,{}).data||{};
  const openingCash=(tb.rows||[]).filter(r=>/cash|bank/i.test(r.group||"")).reduce((s,r)=>s+((r.closingDebit||0)-(r.closingCredit||0)),0);
  const blank={date:'',kind:'inflow',category:'',amount:''};
  const [f,setF]=useState(blank);
  const set=(k)=>(e)=>setF(s=>({...s,[k]:e.target.value}));
  const add=()=>{ if(!brCode){ toast('Select a specific branch (not All) before adding.','error'); return; } if(!f.date||!f.amount){return;} create.mutate({branch:brCode,date:f.date,kind:f.kind,category:f.category,amount:Number(f.amount)||0},{onSuccess:()=>setF(blank)}); };
  const today=new Date(); today.setHours(0,0,0,0);
  const wk=(d)=>{ const dt=new Date(d); return Math.floor((dt-today)/(7*86400000)); };
  const weeks=Array.from({length:13},(_,i)=>({i,inflow:0,outflow:0}));
  rows.forEach(r=>{ const w=wk(r.date); if(w>=0&&w<13){ if(r.kind==="inflow")weeks[w].inflow+=r.amount||0; else weeks[w].outflow+=r.amount||0; } });
  let bal=openingCash; const wrows=weeks.map(w=>{ const net=w.inflow-w.outflow; bal+=net; const d=new Date(today.getTime()+w.i*7*86400000); return {...w,net,bal,label:d.toISOString().slice(5,10)}; });
  const totIn=weeks.reduce((s,w)=>s+w.inflow,0),totOut=weeks.reduce((s,w)=>s+w.outflow,0);
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};
  const ip={...inp,minHeight:30,fontSize:11,width:"100%"};
  const kc=(label,val,col)=>(<div style={{...card,borderTop:`3px solid ${col}`}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>{label}</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:col}}>{cur+fmt(val)}</p></div>);
  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:19,fontWeight:800,color:"#0d1326"}}>13-Week Cash-Flow Forecast</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Opening cash is live from the books; add expected in/out lines to project the closing balance.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {kc("Opening Cash",openingCash,"#185FA5")}{kc("13-wk Inflow",totIn,"#27500A")}{kc("13-wk Outflow",totOut,"#A32D2D")}{kc("Projected Close",openingCash+totIn-totOut,"#854F0B")}
      </div>
      <div style={{...card,marginBottom:12}}>
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Add expected cash line</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,alignItems:"center"}}>
          <input style={ip} type="date" value={f.date} onChange={set('date')}/>
          <DropdownMenu
            ariaLabel="Kind"
            menuRole="listbox"
            items={[
              { key:'inflow', label:'▲ Inflow', selected:f.kind==='inflow', onSelect:()=>setF(s=>({...s,kind:'inflow'})) },
              { key:'outflow', label:'▼ Outflow', selected:f.kind==='outflow', onSelect:()=>setF(s=>({...s,kind:'outflow'})) },
            ]}
            renderTrigger={({ ref, toggle, triggerProps }) => (
              <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                style={{...ip,display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,fontWeight:700,color:f.kind==="inflow"?"#27500A":"#A32D2D",cursor:"pointer",textAlign:"left"}}>
                {f.kind==="inflow"?"▲ Inflow":"▼ Outflow"}
                <ChevronDown size={13} style={{color:"#5b616e",flexShrink:0}}/>
              </button>
            )}
          />
          <input style={ip} placeholder="Category" value={f.category} onChange={set('category')}/>
          <input style={ip} type="number" placeholder="Amount" value={f.amount} onChange={set('amount')}/>
          <button onClick={add} disabled={create.isPending} style={{...btnG,minHeight:32,fontSize:11}}>+ Add</button>
        </div>
      </div>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Week of</th><th style={{padding:"9px 8px",textAlign:"right"}}>Inflow</th><th style={{padding:"9px 8px",textAlign:"right"}}>Outflow</th><th style={{padding:"9px 8px",textAlign:"right"}}>Net</th><th style={{padding:"9px 8px",textAlign:"right"}}>Running Balance</th>
            </tr></thead>
            <tbody>
              {wrows.map((w)=>(<tr key={w.i} style={{borderBottom:"1px solid #cdd1d8"}}>
                <td style={{padding:"6px 8px"}}>W{w.i+1} ({w.label})</td>
                <td style={{padding:"6px 8px",textAlign:"right",color:"#27500A"}}>{w.inflow?cur+fmt(w.inflow):"-"}</td>
                <td style={{padding:"6px 8px",textAlign:"right",color:"#A32D2D"}}>{w.outflow?cur+fmt(w.outflow):"-"}</td>
                <td style={{padding:"6px 8px",textAlign:"right"}}>{cur+fmt(w.net)}</td>
                <td style={{padding:"6px 8px",textAlign:"right",fontWeight:700,color:w.bal<0?"#A32D2D":"#0d1326"}}>{cur+fmt(w.bal)}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>
      {rows.length>0&&<div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#f3f4f8"}}><tr><th style={{padding:"7px 8px",textAlign:"left"}}>Date</th><th style={{padding:"7px 8px",textAlign:"left"}}>Kind</th><th style={{padding:"7px 8px",textAlign:"left"}}>Category</th><th style={{padding:"7px 8px",textAlign:"right"}}>Amount</th><th style={{padding:"7px 8px"}}></th></tr></thead>
            <tbody>
              {rows.map((r)=>(<tr key={r.id} style={{borderBottom:"1px solid #dfe2e7"}}>
                <td style={{padding:"6px 8px"}}>{r.date}</td><td style={{padding:"6px 8px"}}>{r.kind}</td><td style={{padding:"6px 8px"}}>{r.category||"-"}</td>
                <td style={{padding:"6px 8px",textAlign:"right",fontWeight:600,color:r.kind==="inflow"?"#27500A":"#A32D2D"}}>{cur+fmt(r.amount)}</td>
                <td style={{padding:"6px 8px",textAlign:"center"}}><button onClick={()=>remove.mutate(r.id)} style={{background:"none",border:"none",color:"#A32D2D",cursor:"pointer",fontWeight:700}}>x</button></td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>}
    </div>
  );
}
