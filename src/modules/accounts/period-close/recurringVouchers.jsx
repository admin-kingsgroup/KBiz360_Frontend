/* ════════════════════════════════════════════════════════════════
   RECURRING VOUCHER TEMPLATES  /accounting/recurring
   LIVE (2026-07-10): templates persist via /api/recurring-vouchers; "Post" creates a
   REAL voucher (JV/RV/PMT series) through the universal pending gate — the approver
   still signs off each occurrence. A daily backend cron (RECURRING_CRON) also posts
   due templates automatically.
   ════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLedgerRegistry } from '../../../core/useReference';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { toast } from '../../../core/ux/toast';
import { useModalEsc } from '../../../core/ux/useModalEsc';
import { todayISO } from '../../../core/dates';
import { LedgerSelect } from '../../../core/helpers';
import { triggerSaveRefresh, useMobile } from '../../../core/hooks';
import { FL, btnG, btnGh, card, inp } from '../../../core/styles';

export function RecurringVouchers({branch}){
  const mob=useMobile();
  const qc=useQueryClient();
  const { data: masterRows = [] } = useMasterList('recurring-vouchers');
  const { create, update } = useMasterMutations('recurring-vouchers');
  const CAT_LABEL={journal:"Journal",payment:"Payment",receipt:"Receipt"};
  const templates=(masterRows||[]).map(t=>({...t,type:CAT_LABEL[t.category]||t.category,lastRun:t.lastRun||"—"}));
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [posting,setPosting]=useState(false);
  const [form,setForm]=useState({name:"",type:"Journal",freq:"Monthly",day:1,dr:"",cr:"",amt:0});
  // LedgerSelect carries the registry id — postings join by NAME, so resolve at save.
  const ledgerReg=useLedgerRegistry(branch).data||[];
  const ledgerNameOf=(id)=>((ledgerReg.find(l=>l.id===id)||{}).name)||id;
  const TODAY=todayISO();
  const due=templates.filter(t=>t.active&&t.nextRun<=TODAY);
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const refresh=()=>qc.invalidateQueries({queryKey:['master','recurring-vouchers']});
  const run=async(id)=>{
    setPosting(true);
    try{
      const { apiPost } = await import('../../../core/api');
      const r=await apiPost(`/api/recurring-vouchers/${id}/post`);
      toast(`Voucher ${r.vno} created (pending approval) · next run ${r.nextRun}`);
      refresh(); triggerSaveRefresh();
    }catch(e){ toast(e?.message||"Posting failed","error"); }
    finally{ setPosting(false); }
  };
  const runAll=async()=>{
    setPosting(true);
    try{
      const { apiPost } = await import('../../../core/api');
      const r=await apiPost('/api/recurring-vouchers/post-due');
      toast(`${r.posted.length}/${r.due} due templates posted as pending vouchers${r.failed.length?` · ${r.failed.length} failed`:""}`);
      refresh(); triggerSaveRefresh();
    }catch(e){ toast(e?.message||"Posting failed","error"); }
    finally{ setPosting(false); }
  };

  return(
    <div style={{padding:"16px 24px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#e8f0ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔄</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>Recurring Voucher Templates</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>{templates.length} templates · {due.length} due for posting · Auto-posting saves time each month</p>
          </div>
        </div>
        <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> New Template</button>
      </div>

      {due.length>0&&<div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#fbeedb",border:"1px solid #f3d9a8",fontSize:10.5,color:"#d97706",fontWeight:600,display:"flex",gap:8,flexWrap:"wrap"}}>
        <Clock size={14}/> {due.length} recurring voucher{due.length>1?"s":""} due for posting:
        {due.map(t=><span key={t.id} style={{padding:"1px 7px",borderRadius:999,background:"#d97706",color:"#fff",fontSize:9.5}}>{t.name}</span>)}
        <button onClick={runAll} disabled={posting} style={{...btnG,padding:"2px 10px",fontSize:9.5,background:"#d97706",marginLeft:"auto",opacity:posting?0.5:1}}>{posting?"Posting…":"Post All Now"}</button>
      </div>}

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#1a1c22"}}>
            {["Template","Type","Freq","Dr Ledger","Cr Ledger","Amount","Next Run","Status","Action"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i===6?"center":i===5?"right":"left",color:"#c2a04a",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{templates.map((t,i)=>(
            <tr key={t.id} style={{borderBottom:"1px solid #dfe2e7",background:t.nextRun<=TODAY?"#fffaf0":i%2===0?"#fff":"#fafafa",opacity:t.active?1:0.5}}>
              <td style={{padding:"8px 12px",fontWeight:600,color:"#1a1c22"}}>{t.name}</td>
              <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#e8f0ff",color:"#2563eb",fontWeight:700}}>{t.type}</span></td>
              <td style={{padding:"8px 12px",color:"#2e323c",fontSize:10.5}}>{t.freq}</td>
              <td style={{padding:"8px 12px",color:"#dc2626",fontSize:10.5}}>{t.dr}</td>
              <td style={{padding:"8px 12px",color:"#16a34a",fontSize:10.5}}>{t.cr}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(t.amt)}</td>
              <td style={{padding:"8px 12px",textAlign:"center",fontWeight:t.nextRun<=TODAY?700:400,color:t.nextRun<=TODAY?"#d97706":"#5b616e"}}>{t.nextRun}{t.nextRun<=TODAY&&" ⚡"}</td>
              <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:t.active?"#e8f6ed":"#f4f5f7",color:t.active?"#16a34a":"#5b616e"}}>{t.active?"Active":"Paused"}</span></td>
              <td style={{padding:"8px 12px"}}>
                <div style={{display:"flex",gap:4}}>
                  {t.active&&t.nextRun<=TODAY&&<button onClick={()=>run(t.id)} disabled={posting} style={{...btnG,padding:"2px 8px",fontSize:9.5,background:"#16a34a",opacity:posting?0.5:1}}>Post</button>}
                  <button onClick={()=>update.mutate({id:t.id,body:{active:!t.active}})} style={{...btnGh,padding:"2px 8px",fontSize:9.5}}>{t.active?"Pause":"Resume"}</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22"}}>New Recurring Template</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5b616e"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <FL label="Template name"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp} placeholder="e.g. Office Rent — BOM"/></FL>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:10}}>
                <FL label="Voucher type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}><option>Journal</option><option>Payment</option><option>Receipt</option></select></FL>
                <FL label="Frequency"><select value={form.freq} onChange={e=>setForm(f=>({...f,freq:e.target.value}))} style={inp}><option>Monthly</option><option>Quarterly</option><option>Annual</option><option>Weekly</option></select></FL>
                <FL label="Day of month"><input type="number" min={1} max={31} value={form.day} onChange={e=>setForm(f=>({...f,day:+e.target.value}))} style={inp}/></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:10}}>
                <FL label="Debit ledger"><LedgerSelect value={form.dr} onChange={v=>setForm(f=>({...f,dr:v}))} placeholder="e.g. Office Rent"/></FL>
                <FL label="Credit ledger"><LedgerSelect value={form.cr} onChange={v=>setForm(f=>({...f,cr:v}))} placeholder="e.g. HDFC Bank"/></FL>
              </div>
              <FL label="Amount (₹)"><input type="number" value={form.amt} onChange={e=>setForm(f=>({...f,amt:+e.target.value}))} style={inp}/></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button disabled={!form.name.trim()||!form.dr||!form.cr||!(form.amt>0)||create.isPending}
                onClick={()=>create.mutate(
                  {name:form.name.trim(),category:form.type.toLowerCase(),freq:form.freq,day:form.day,dr:ledgerNameOf(form.dr),cr:ledgerNameOf(form.cr),amt:form.amt,
                   branch:branch&&branch!=="ALL"&&branch.code?branch.code:"BOM",active:true},
                  {onSuccess:()=>{setModal(false);setForm({name:"",type:"Journal",freq:"Monthly",day:1,dr:"",cr:"",amt:0});toast("Recurring template saved.");}})}
                style={{...btnG,opacity:!form.name.trim()||!form.dr||!form.cr||!(form.amt>0)?0.5:1}}>{create.isPending?"Saving…":"Create Template"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
