import React, { useState, useEffect } from 'react';
import { todayISO } from '../../../core/dates';
import { AlertTriangle, Download, Lock, Plus, Save, Search, Settings, Smartphone, User, Users } from 'lucide-react';
import { Line } from 'recharts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { exportToCSV } from '../../../core/business-logic';
import { toast } from '../../../core/ux/toast';
import { clickable } from '../../../core/ux/clickable';
import { listKeyNav } from '../../../core/ux/listKeys';
import { ACTION_CLR, ACTION_LABELS, BRANCHES, BRANCH_CODES, CONSOLIDATED_LABEL } from '../../../core/data';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../../../core/api';
import { useUsersAdmin, useUserAccess, useRoles, useCompanyProfiles, useApprovalRules, useApprovalLimits, useEmailTemplates, useCustomFields, useFieldAccess } from '../../../core/useReference';
import { Switch, isViewOnly, VIEW_ONLY_REASON } from '../../../shell/primitives';
import { useModalEsc } from '../../../core/ux/useModalEsc';
import { fmt } from '../../../core/format';
import { PERM_ACTIONS, cardStyle } from '../../../core/helpers';
import { useIsMob, useMobile } from '../../../core/hooks';
// Permission CATALOGUE (which modules/actions/toggles exist) stays in code as
// app structure; the per-role GRANTS, users, company profiles and approval rules
// are DB-backed (see the useReference hooks above).
import { ACTIONS, PERM_MODULES, PERM_MODULES_P2, SPECIAL_TOGGLES } from '../../../core/permissions';
import { FL, RPT_tdStyle, RPT_thStyle, btnG, btnGh, card, inp } from '../../../core/styles';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';

export function EmailSMSTemplates(){
  // Live email/SMS templates (GET /api/email-templates). Was hardcoded EMAIL_TEMPLATES_DATA.
  const templates=useEmailTemplates().data||[];
  const qc=useQueryClient();
  const vo=isViewOnly();
  const [sel,setSel]=useState(0);
  const [edit,setEdit]=useState({name:"",trigger:"",channel:"Email",subject:"",active:true,body:""});
  const t=templates[sel]||templates[0]||{name:"",body:"",channel:"Email",trigger:"",subject:"",active:true};
  useEffect(()=>{ const cur=templates[sel]; if(cur) setEdit({name:cur.name||"",trigger:cur.trigger||"",channel:cur.channel||"Email",subject:cur.subject||"",active:cur.active!==false,body:cur.body||""}); },[sel,templates.length]);
  const refetch=()=>qc.invalidateQueries({queryKey:["ref","email-templates"]});
  const save=async()=>{
    if(!t.dbId){toast("Nothing to save yet — create a template first","error");return;}
    try{ await apiPut(`/api/email-templates/${t.dbId}`,{name:edit.name,trigger:edit.trigger,channel:edit.channel,subject:edit.subject,active:edit.active,body:edit.body}); toast(`Saved ${edit.name||t.id}`); refetch(); }
    catch(e){ toast(e.message||"Save failed","error"); }
  };
  const addNew=async()=>{
    // etId is the required unique display code — allocate the next ET-### slot.
    const next=Math.max(0,...templates.map(x=>parseInt(String(x.id).replace(/\D/g,""),10)||0))+1;
    const etId=`ET-${String(next).padStart(3,"0")}`;
    try{ await apiPost("/api/email-templates",{etId,name:`New Template ${next}`,channel:"Email",active:true}); toast(`Created ${etId}`); refetch(); setSel(0); }
    catch(e){ toast(e.message||"Create failed","error"); }
  };
  const tokens=["{CustomerName}","{BookingRef}","{TripName}","{Amount}","{DueDate}","{VoucherNo}","{ConsultantName}","{BranchPhone}","{InvoiceNo}","{Date}"];
  // Send pipeline (LIVE 2026-07-10): POST /api/email-templates/:id/send renders the
  // tokens and mails over the server's SMTP config; 503 with the reason when SMTP
  // isn't configured — the send modal surfaces that honestly.
  const [sendModal,setSendModal]=useState(null); // {to, vars:{}}
  const openSend=async()=>{
    if(!t.dbId){toast("Save the template first","error");return;}
    try{
      const meta=await apiGet(`/api/email-templates/${t.dbId}/placeholders`);
      const vars={}; (meta.placeholders||[]).forEach(p=>{vars[p]="";});
      setSendModal({to:"",vars,smtp:meta.smtpConfigured});
    }catch(e){ toast(e.message||"Failed to load template","error"); }
  };
  const doSend=async()=>{
    try{
      const r=await apiPost(`/api/email-templates/${t.dbId}/send`,{to:sendModal.to,vars:sendModal.vars});
      toast(`Sent "${r.subject}" to ${r.to.join(", ")}`); setSendModal(null);
    }catch(e){ toast(e.message||"Send failed","error"); }
  };
  return(
    <PHASE2_Page title="Email / SMS Template Editor" subtitle="Customise communication templates · token substitution · channel-specific"
      toolbar={<><button onClick={save} disabled={vo} title={vo?VIEW_ONLY_REASON:undefined} style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>💾 Save Template</button><button onClick={openSend} style={{padding:"7px 12px",background:"#0d1326",border:"none",color:"#d4a437",borderRadius:6,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>📤 Send…</button></>}>
      <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:14}}>
        {/* Template list */}
        <div style={cardStyle} onKeyDown={listKeyNav()}>
          <p style={{margin:"0 0 10px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Templates ({templates.length})</p>
          {templates.map((tmpl,i)=>(
            <div key={tmpl.id} {...clickable(()=>setSel(i),{role:'option'})} style={{padding:"9px 10px",border:sel===i?"2px solid #d4a437":"1px solid #cdd1d8",borderRadius:6,marginBottom:6,cursor:"pointer",background:sel===i?"#fff8e8":"#fff"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <p style={{margin:0,fontSize:11.5,fontWeight:700,color:"#0d1326"}}>{tmpl.name}</p>
                <span style={{padding:"1px 6px",background:tmpl.channel==="SMS"?"#fff3cd":"#cfe2ff",color:tmpl.channel==="SMS"?"#856404":"#004085",borderRadius:3,fontSize:9.5,fontWeight:700}}>{tmpl.channel}</span>
              </div>
              <p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691"}}>{tmpl.trigger}</p>
            </div>
          ))}
          <button onClick={addNew} disabled={vo} title={vo?VIEW_ONLY_REASON:undefined} style={{width:"100%",padding:"7px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer",marginTop:6,...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>+ New Template</button>
        </div>
        {/* Editor */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={cardStyle}>
            <p style={{margin:"0 0 12px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Edit — {t.name}</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:12}}>
              <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Name</label><input value={edit.name} onChange={e=>setEdit(x=>({...x,name:e.target.value}))} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,width:"100%"}}/></div>
              <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Trigger</label><input value={edit.trigger} onChange={e=>setEdit(x=>({...x,trigger:e.target.value}))} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,width:"100%"}}/></div>
              <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Channel</label><select value={edit.channel} onChange={e=>setEdit(x=>({...x,channel:e.target.value}))} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,width:"100%"}}><option>Email</option><option>SMS</option><option>Both</option></select></div>
              <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Status</label><select value={edit.active?"Active":"Inactive"} onChange={e=>setEdit(x=>({...x,active:e.target.value==="Active"}))} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,width:"100%"}}><option>Active</option><option>Inactive</option></select></div>
            </div>
            {edit.channel!=="SMS"&&<div style={{marginBottom:10}}><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Subject</label><input value={edit.subject} onChange={e=>setEdit(x=>({...x,subject:e.target.value}))} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,width:"100%"}}/></div>}
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Body {edit.channel==="SMS"&&<span style={{fontWeight:400,color:"#5a6691"}}>({edit.body.length}/160 chars)</span>}</label><textarea value={edit.body} onChange={e=>setEdit(x=>({...x,body:e.target.value}))} rows={8} style={{padding:"8px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,width:"100%",fontFamily:"monospace",resize:"vertical"}}/></div>
          </div>
          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Available Tokens</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {tokens.map(tok=>(
                <button key={tok} onClick={()=>setEdit(x=>({...x,body:x.body+tok}))} style={{padding:"4px 9px",background:"#e6e8f1",border:"none",borderRadius:4,fontSize:11,fontFamily:"monospace",cursor:"pointer",color:"#0d1326",fontWeight:600}}>{tok}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {sendModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:460,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22"}}>Send — {t.name}</p>
              <button onClick={()=>setSendModal(null)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5b616e"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:10}}>
              {!sendModal.smtp&&<div style={{padding:"8px 12px",borderRadius:8,background:"#FFF8E1",border:"1px solid #F1E3B0",fontSize:11,color:"#854F0B"}}>⚠ SMTP is not configured on the server (SMTP_HOST) — sending will fail until it is.</div>}
              <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>To (comma-separated)</label><input value={sendModal.to} onChange={e=>setSendModal(m=>({...m,to:e.target.value}))} placeholder="name@company.com, …" style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,width:"100%"}}/></div>
              {Object.keys(sendModal.vars).length>0&&<p style={{margin:"4px 0 0",fontSize:10.5,color:"#5a6691",fontWeight:700}}>Token values</p>}
              {Object.keys(sendModal.vars).map(k=>(
                <div key={k}><label style={{fontSize:10.5,color:"#5a6691",fontWeight:600,display:"block",marginBottom:3,fontFamily:"monospace"}}>{`{${k}}`}</label><input value={sendModal.vars[k]} onChange={e=>setSendModal(m=>({...m,vars:{...m.vars,[k]:e.target.value}}))} style={{padding:"6px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,width:"100%"}}/></div>
              ))}
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setSendModal(null)} style={{padding:"7px 14px",background:"#fff",border:"1px solid #cdd1d8",color:"#5b616e",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
              <button onClick={doSend} disabled={!sendModal.to.trim()||vo} title={vo?VIEW_ONLY_REASON:undefined} style={{padding:"7px 16px",background:"#0d1326",color:"#d4a437",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",opacity:sendModal.to.trim()?1:0.5,...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>📤 Send now</button>
            </div>
          </div>
        </div>
      )}
    </PHASE2_Page>
  );
}
