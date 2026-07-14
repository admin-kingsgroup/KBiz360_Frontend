/* ════════════════════════════════════════════════════════════════════
   INVESTMENT REGISTER
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of finance/legacy.jsx
   into its business sub-module folder — MENU_FINANCE ▸ Period-End, Targets
   & Accruals ▸ Registers ▸ "Investment Register" (href /finance/investments).
   finance/index.js re-exports InvestmentRegister from here so App.jsx's
   barrel import needed zero changes.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { toast } from '../../../core/ux/toast';
import { useCrud } from '../../../core/useRegisters';
import { bc, btnG, inp } from '../../../core/styles';
import { fmt } from '../../../core/format';

export function InvestmentRegister({branch}){
  const cur=(bc(branch||'ALL')||{}).cur||'INR ';
  const brCode=(!branch||branch==="ALL")?undefined:branch&&branch.code;
  const { rows, create, remove } = useCrud('investments', brCode?{branch:brCode}:{});
  const blank={instrument:'',type:'FD',institution:'',amount:'',rate:'',maturityDate:'',maturityValue:'',status:'active'};
  const [f,setF]=useState(blank);
  const set=(k)=>(e)=>setF(s=>({...s,[k]:e.target.value}));
  const add=()=>{ if(!brCode){ toast('Select a specific branch (not All) before adding.','error'); return; } if(!f.instrument){return;} create.mutate({branch:brCode,instrument:f.instrument,type:f.type,institution:f.institution,amount:Number(f.amount)||0,rate:Number(f.rate)||0,maturityDate:f.maturityDate,maturityValue:Number(f.maturityValue)||0,status:f.status},{onSuccess:()=>setF(blank)}); };
  const totA=rows.reduce((s,i)=>s+(i.amount||0),0),totM=rows.reduce((s,i)=>s+(i.maturityValue||0),0);
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};
  const ip={...inp,minHeight:30,fontSize:11,width:"100%"};
  const kc=(label,val,col)=>(<div style={{...card,borderTop:`3px solid ${col}`}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>{label}</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:col}}>{cur+fmt(val)}</p></div>);
  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:19,fontWeight:800,color:"#0d1326"}}>Investment Register</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>FD / Mutual Fund / Bond / Equity / Property. Live - shows 0 until you add an investment.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {kc("Total Invested",totA,"#185FA5")}{kc("Maturity Value",totM,"#27500A")}{kc("Expected Gain",totM-totA,"#854F0B")}
      </div>
      <div style={{...card,marginBottom:12}}>
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Add investment</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:6,alignItems:"center"}}>
          <input style={ip} placeholder="Instrument" value={f.instrument} onChange={set('instrument')}/>
          <input style={ip} placeholder="Type" value={f.type} onChange={set('type')}/>
          <input style={ip} placeholder="Institution" value={f.institution} onChange={set('institution')}/>
          <input style={ip} type="number" placeholder="Amount" value={f.amount} onChange={set('amount')}/>
          <input style={ip} type="number" placeholder="Rate %" value={f.rate} onChange={set('rate')}/>
          <input style={ip} type="date" value={f.maturityDate} onChange={set('maturityDate')}/>
          <input style={ip} type="number" placeholder="Maturity Val" value={f.maturityValue} onChange={set('maturityValue')}/>
          <button onClick={add} disabled={create.isPending} style={{...btnG,minHeight:32,fontSize:11}}>+ Add</button>
        </div>
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Instrument</th><th style={{padding:"9px 8px",textAlign:"left"}}>Type</th><th style={{padding:"9px 8px",textAlign:"left"}}>Institution</th><th style={{padding:"9px 8px",textAlign:"right"}}>Amount</th><th style={{padding:"9px 8px",textAlign:"center"}}>Rate</th><th style={{padding:"9px 8px",textAlign:"center"}}>Maturity</th><th style={{padding:"9px 8px",textAlign:"right"}}>Maturity Val</th><th style={{padding:"9px 8px",textAlign:"center"}}>Status</th><th style={{padding:"9px 8px"}}></th>
            </tr></thead>
            <tbody>
              {rows.map((iv,i)=>(<tr key={iv.id} style={{background:i%2?"#f3f4f8":"#fff",borderBottom:"1px solid #cdd1d8"}}>
                <td style={{padding:"7px 8px",fontWeight:600}}>{iv.instrument}</td>
                <td style={{padding:"7px 8px"}}>{iv.type}</td>
                <td style={{padding:"7px 8px",color:"#5a6691"}}>{iv.institution||"-"}</td>
                <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(iv.amount)}</td>
                <td style={{padding:"7px 8px",textAlign:"center",color:"#854F0B"}}>{iv.rate?iv.rate+"%":"-"}</td>
                <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{iv.maturityDate||"-"}</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,color:"#27500A"}}>{iv.maturityValue?cur+fmt(iv.maturityValue):"-"}</td>
                <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{iv.status}</td>
                <td style={{padding:"7px 8px",textAlign:"center"}}><button onClick={()=>remove.mutate(iv.id)} style={{background:"none",border:"none",color:"#A32D2D",cursor:"pointer",fontWeight:700}}>x</button></td>
              </tr>))}
              {rows.length===0&&<tr><td colSpan={9} style={{padding:20,textAlign:"center",color:"#5a6691"}}>No investments yet - add one above.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
