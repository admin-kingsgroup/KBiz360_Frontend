/* ════════════════════════════════════════════════════════════════════
   LOAN & EMI REGISTER
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of finance/legacy.jsx
   into its business sub-module folder — MENU_FINANCE ▸ Period-End, Targets
   & Accruals ▸ Registers ▸ "Loan / EMI Register" (href /accounting/loans).
   finance/index.js re-exports LoanEmiRegister from here so App.jsx's barrel
   import needed zero changes.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { toast } from '../../../core/ux/toast';
import { useCrud } from '../../../core/useRegisters';
import { bc, btnG, inp } from '../../../core/styles';
import { fmt } from '../../../core/format';
import { isViewOnly, VIEW_ONLY_REASON } from '../../../shell/primitives';

export function LoanEmiRegister({branch}){
  const vo=isViewOnly();
  const cur=bc(branch).cur;
  const brCode=branch==="ALL"?undefined:branch&&branch.code;
  const { rows, create, remove } = useCrud('loans', brCode?{branch:brCode}:{});
  const blank={lender:'',type:'Term',purpose:'',principal:'',rate:'',tenure:'',emi:'',balance:'',nextDue:''};
  const [f,setF]=useState(blank);
  const set=(k)=>(e)=>setF(s=>({...s,[k]:e.target.value}));
  const add=()=>{ if(!brCode){ toast('Select a specific branch (not All) before adding.','error'); return; } if(!f.lender){return;} create.mutate({branch:brCode,lender:f.lender,type:f.type,purpose:f.purpose,principal:Number(f.principal)||0,rate:Number(f.rate)||0,tenure:Number(f.tenure)||0,emi:Number(f.emi)||0,balance:Number(f.balance)||Number(f.principal)||0,nextDue:f.nextDue,status:'active'},{onSuccess:()=>setF(blank)}); };
  const totP=rows.reduce((s,l)=>s+(l.principal||0),0),totB=rows.reduce((s,l)=>s+(l.balance||0),0),totE=rows.reduce((s,l)=>s+(l.emi||0),0);
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};
  const ip={...inp,minHeight:30,fontSize:11,width:"100%"};
  const kc=(label,val,col)=>(<div style={{...card,borderTop:`3px solid ${col}`}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>{label}</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:col}}>{cur+fmt(val)}</p></div>);
  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:19,fontWeight:800,color:"#0d1326"}}>Loan & EMI Register</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Term / Vehicle / Working-capital / OD loans. Live - shows 0 until you add a loan.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {kc("Total Borrowed",totP,"#185FA5")}{kc("Outstanding",totB,"#A32D2D")}{kc("Repaid",totP-totB,"#27500A")}{kc("Monthly EMI",totE,"#854F0B")}
      </div>
      <div style={{...card,marginBottom:12}}>
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Add loan</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:6,alignItems:"center"}}>
          <input style={ip} placeholder="Lender" value={f.lender} onChange={set('lender')}/>
          <input style={ip} placeholder="Type" value={f.type} onChange={set('type')}/>
          <input style={ip} type="number" placeholder="Principal" value={f.principal} onChange={set('principal')}/>
          <input style={ip} type="number" placeholder="Rate %" value={f.rate} onChange={set('rate')}/>
          <input style={ip} type="number" placeholder="Tenure m" value={f.tenure} onChange={set('tenure')}/>
          <input style={ip} type="number" placeholder="EMI" value={f.emi} onChange={set('emi')}/>
          <input style={ip} type="number" placeholder="Balance" value={f.balance} onChange={set('balance')}/>
          <button onClick={add} disabled={create.isPending||vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...btnG,minHeight:32,fontSize:11,...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>+ Add</button>
        </div>
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Lender / Type</th><th style={{padding:"9px 8px",textAlign:"right"}}>Principal</th><th style={{padding:"9px 8px",textAlign:"center"}}>Rate</th><th style={{padding:"9px 8px",textAlign:"center"}}>Tenure</th><th style={{padding:"9px 8px",textAlign:"right"}}>EMI</th><th style={{padding:"9px 8px",textAlign:"right"}}>Balance</th><th style={{padding:"9px 8px",textAlign:"center"}}>Next Due</th><th style={{padding:"9px 8px"}}></th>
            </tr></thead>
            <tbody>
              {rows.map((l,i)=>(<tr key={l.id} style={{background:i%2?"#f3f4f8":"#fff",borderBottom:"1px solid #cdd1d8"}}>
                <td style={{padding:"7px 8px",fontWeight:600}}>{l.lender}<div style={{fontSize:9.5,color:"#5a6691",fontWeight:400}}>{l.type}{l.purpose?(" - "+l.purpose):''}</div></td>
                <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(l.principal)}</td>
                <td style={{padding:"7px 8px",textAlign:"center",color:"#854F0B"}}>{l.rate}%</td>
                <td style={{padding:"7px 8px",textAlign:"center"}}>{l.tenure>0?l.tenure+" m":"OD"}</td>
                <td style={{padding:"7px 8px",textAlign:"right"}}>{l.emi>0?cur+fmt(l.emi):"-"}</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,color:"#A32D2D"}}>{cur+fmt(l.balance)}</td>
                <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{l.nextDue||"-"}</td>
                <td style={{padding:"7px 8px",textAlign:"center"}}><button onClick={()=>remove.mutate(l.id)} disabled={vo} title={vo?VIEW_ONLY_REASON:undefined} style={{background:"none",border:"none",color:"#A32D2D",cursor:"pointer",fontWeight:700,...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>x</button></td>
              </tr>))}
              {rows.length===0&&<tr><td colSpan={8} style={{padding:20,textAlign:"center",color:"#5a6691"}}>No loans yet - add one above.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
