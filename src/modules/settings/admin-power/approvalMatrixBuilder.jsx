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

export function ApprovalMatrixBuilder(){
  // LIVE 2026-07-10: rows are controlled and 💾 Save & Publish diffs against the
  // server — new rows POST (next AL-### allocated), edited rows PUT, removed rows
  // DELETE — all on /api/approval-limits. Was preview-only with a disabled save.
  const live=useApprovalLimits().data;
  const qc=useQueryClient();
  const [rules,setRules]=useState([]);
  const [removed,setRemoved]=useState([]); // dbIds queued for DELETE on save
  const [saving,setSaving]=useState(false);
  const vo=isViewOnly();
  useEffect(()=>{ if(live){ setRules(live.map(r=>({...r}))); setRemoved([]);} },[live]);
  const [form,setForm]=useState({role:"Accounts Executive",voucherType:"Payment Voucher",minAmount:0,maxAmount:50000,backup:"Sr. Accounts Executive"});
  const groupByType={};
  rules.forEach(r=>{if(!groupByType[r.voucherType])groupByType[r.voucherType]=[];groupByType[r.voucherType].push(r);});
  const fmt=n=>n>=999999999?"Unlimited":"₹"+n.toLocaleString("en-IN");
  const inp={padding:"7px 8px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:11.5,width:"100%"};
  const setRule=(id,patch)=>setRules(rs=>rs.map(x=>x.id===id?{...x,...patch,_dirty:true}:x));
  const removeRule=(rule)=>{ if(rule.dbId)setRemoved(d=>[...d,rule.dbId]); setRules(rs=>rs.filter(x=>x.id!==rule.id)); };
  const saveAll=async()=>{
    setSaving(true);
    try{
      let nextNo=Math.max(0,...(live||[]).map(x=>parseInt(String(x.alId||"").replace(/\D/g,""),10)||0))+1;
      let created=0,updated=0,deleted=0;
      for(const dbId of removed){ await apiDelete(`/api/approval-limits/${dbId}`); deleted++; }
      for(const r of rules){
        const body={role:r.role,voucherType:r.voucherType,minAmount:Number(r.minAmount)||0,maxAmount:Number(r.maxAmount)||999999999,backup:r.backup||"",active:r.active!==false};
        if(!r.dbId){ await apiPost("/api/approval-limits",{alId:`AL-${String(nextNo++).padStart(3,"0")}`,...body}); created++; }
        else if(r._dirty){ await apiPut(`/api/approval-limits/${r.dbId}`,body); updated++; }
      }
      toast(`Approval matrix published — ${created} added · ${updated} updated · ${deleted} removed.`);
      qc.invalidateQueries({queryKey:["ref","approval-limits"]});
    }catch(e){ toast(e.message||"Publish failed","error"); }
    finally{ setSaving(false); }
  };
  return(
    <PHASE2_Page title="Approval Matrix Builder" subtitle="Per-role, per-voucher-type thresholds — saved live to /api/approval-limits"
      toolbar={<button onClick={saveAll} disabled={saving||vo} title={vo?VIEW_ONLY_REASON:undefined} style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",opacity:saving?0.6:1,...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>💾 {saving?"Publishing…":"Save & Publish"}</button>}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14}}>
        <div>
          {Object.entries(groupByType).map(([type,typeRules])=>(
            <div key={type} style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,overflow:"hidden",marginBottom:12}}>
              <div style={{padding:"9px 14px",background:"#0d1326",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <p style={{margin:0,fontSize:12.5,fontWeight:700}}>{type}</p>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
                <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Approver Role</th><th style={{...RPT_thStyle,textAlign:"right"}}>From (₹)</th><th style={{...RPT_thStyle,textAlign:"right"}}>To (₹)</th><th style={RPT_thStyle}>Backup</th><th style={{...RPT_thStyle,textAlign:"center"}}></th></tr></thead>
                <tbody>{typeRules.map((r)=>(<tr key={r.id} style={{borderBottom:"1px solid #dfe2e7"}}>
                  <td style={RPT_tdStyle}><select value={r.role} onChange={e=>setRule(r.id,{role:e.target.value})} style={{...inp,width:"auto"}}><option>Accounts Executive</option><option>Sr. Accounts Executive</option><option>Senior Finance Manager</option><option>Director</option></select></td>
                  <td style={{padding:"6px 12px",borderBottom:"1px solid #dfe2e7"}}><input type="number" value={r.minAmount} onChange={e=>setRule(r.id,{minAmount:+e.target.value})} style={{...inp,textAlign:"right",fontFamily:"monospace",width:100}}/></td>
                  <td style={{padding:"6px 12px",borderBottom:"1px solid #dfe2e7"}}><input type="number" value={r.maxAmount<999999999?r.maxAmount:""} onChange={e=>setRule(r.id,{maxAmount:e.target.value===""?999999999:+e.target.value})} placeholder="Unlimited" style={{...inp,textAlign:"right",fontFamily:"monospace",width:100}}/></td>
                  <td style={RPT_tdStyle}><input value={r.backup||""} onChange={e=>setRule(r.id,{backup:e.target.value})} style={{...inp,width:"auto"}}/></td>
                  <td style={{padding:"6px 12px",textAlign:"center",borderBottom:"1px solid #dfe2e7"}}>
                    <button onClick={()=>removeRule(r)} disabled={vo} title={vo?VIEW_ONLY_REASON:"Remove tier (deleted on Save & Publish)"} style={{padding:"2px 8px",background:"#fbe9e9",border:"1px solid #f3c9c9",color:"#dc2626",borderRadius:3,fontSize:10.5,cursor:"pointer",fontWeight:700,...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>✕</button>
                  </td>
                </tr>))}</tbody>
              </table>
            </div>
          ))}
        </div>
        {/* Add new rule */}
        <div style={cardStyle}>
          <p style={{margin:"0 0 12px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Add Rule</p>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Voucher Type</label><select value={form.voucherType} onChange={e=>setForm(f=>({...f,voucherType:e.target.value}))} style={inp}><option>Payment Voucher</option><option>Journal Voucher</option><option>Cash Refund</option><option>Forex Trade</option><option>Period Lock</option></select></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Approver Role</label><select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} style={inp}><option>Accounts Executive</option><option>Sr. Accounts Executive</option><option>Senior Finance Manager</option><option>Director</option></select></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Min Amount (₹)</label><input type="number" value={form.minAmount} onChange={e=>setForm(f=>({...f,minAmount:+e.target.value}))} style={{...inp,fontFamily:"monospace"}}/></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Max Amount (₹, 0 = unlimited)</label><input type="number" value={form.maxAmount} onChange={e=>setForm(f=>({...f,maxAmount:+e.target.value}))} style={{...inp,fontFamily:"monospace"}}/></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Backup Approver</label><input value={form.backup} onChange={e=>setForm(f=>({...f,backup:e.target.value}))} style={inp}/></div>
            <button onClick={()=>{setRules(r=>[...r,{id:"AL-NEW-"+Date.now(),...form}]);}} style={{padding:"8px",background:"#0d1326",color:"#d4a437",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Add Rule</button>
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}
