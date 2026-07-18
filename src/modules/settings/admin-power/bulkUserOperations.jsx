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

export function BulkUserOperations(){
  const [selected,setSelected]=useState({});
  const [role,setRole]=useState("");
  const _USERS_DATA=useUsersAdmin().data||[];   // DB-backed (/api/auth/users)
  const roles=(useRoles().data||[]).map(r=>r.name);
  const qc=useQueryClient();
  const vo=isViewOnly();
  const toggle=id=>setSelected(s=>({...s,[id]:!s[id]}));
  const allSelected=_USERS_DATA.every(u=>selected[u.id]);
  const toggleAll=()=>{if(allSelected)setSelected({});else setSelected(Object.fromEntries(_USERS_DATA.map(u=>[u.id,true])));};
  const selCount=Object.values(selected).filter(Boolean).length;
  // Bootstrap fallback accounts have id = email (no DB record) — PUT /users/:id
  // needs a Mongo id, so they are skipped and reported.
  const isDbId=id=>/^[0-9a-f]{24}$/i.test(String(id));
  const apply=async(label,body)=>{
    const ids=Object.keys(selected).filter(id=>selected[id]);
    const dbIds=ids.filter(isDbId), skipped=ids.length-dbIds.length;
    if(!dbIds.length){toast("Selected accounts are bootstrap fallbacks — manage them in Users & Roles","error");return;}
    let ok=0,failed=0;
    for(const id of dbIds){ try{ await apiPut(`/api/auth/users/${id}`,body); ok++; }catch(e){ failed++; } }
    toast(`${label}: ${ok} updated${failed?`, ${failed} failed`:""}${skipped?`, ${skipped} skipped (no DB record)`:""}`,failed?"error":undefined);
    setSelected({}); qc.invalidateQueries({queryKey:["ref","users"]});
  };
  const disabledBtn={padding:"7px 14px",background:"#e1e3ec",color:"#5a6691",border:"none",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"not-allowed"};
  const actBtn=(bg,t)=>({padding:"7px 14px",background:selCount>0?bg:"#e1e3ec",color:selCount>0?t:"#5a6691",border:"none",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:selCount>0?"pointer":"not-allowed"});
  return(
    <PHASE2_Page title="Bulk User Operations" subtitle="Select multiple users · apply role change · activate / deactivate">
      {/* Action bar */}
      <div style={{padding:"10px 14px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,marginBottom:12,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <span style={{fontSize:12,fontWeight:700,color:"#0d1326"}}>{selCount} user{selCount!==1?"s":""} selected</span>
        <div style={{flex:1}}/>
        <select value={role} onChange={e=>setRole(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:11.5,background:"#fff"}}>
          <option value="">— pick role —</option>{roles.map(r=><option key={r}>{r}</option>)}
        </select>
        <button onClick={()=>role?apply("Change Role",{role}):toast("Pick a role first","error")} disabled={!selCount||vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...actBtn("#0d1326","#d4a437"),...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>Change Role</button>
        <button onClick={()=>apply("Activate",{active:true})} disabled={!selCount||vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...actBtn("#22c55e","#fff"),...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>Activate</button>
        <button onClick={()=>apply("Deactivate",{active:false})} disabled={!selCount||vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...actBtn("#f97316","#fff"),...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>Deactivate</button>
        <button disabled title="Per-user only — use Settings → Users & Roles (admin password reset)" style={disabledBtn}>Reset Password</button>
        <button disabled title="Branch scope is managed per-user in Settings → Users & Roles / Page Visibility" style={disabledBtn}>Change Branch</button>
      </div>
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#f7f8fb"}}>
            <th style={{...RPT_thStyle,width:36}}><input type="checkbox" checked={allSelected} onChange={toggleAll}/></th>
            <th style={RPT_thStyle}>User</th><th style={RPT_thStyle}>Email</th><th style={RPT_thStyle}>Role</th><th style={RPT_thStyle}>Branches</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th><th style={RPT_thStyle}>Last Login</th>
          </tr></thead>
          <tbody>{_USERS_DATA.map(u=>(
            <tr key={u.id} style={{borderBottom:"1px solid #dfe2e7",background:selected[u.id]?"#fff8e8":"#fff"}}>
              <td style={{padding:"8px 12px",borderBottom:"1px solid #dfe2e7"}}><input type="checkbox" checked={!!selected[u.id]} onChange={()=>toggle(u.id)}/></td>
              <td style={RPT_tdStyle}><p style={{margin:0,fontWeight:700}}>{u.name}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{u.id}</p></td>
              <td style={{...RPT_tdStyle,fontSize:11,color:"#5a6691"}}>{u.email}</td>
              <td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:"#e6e8f1",borderRadius:3,fontSize:10.5,fontWeight:600}}>{u.role}</span></td>
              <td style={{...RPT_tdStyle,fontSize:11}}>{Array.isArray(u.branches)?u.branches.join(", "):u.branches}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:700,background:u.active?"#d4edda":"#f8d7da",color:u.active?"#155724":"#721c24"}}>{u.active?"Active":"Inactive"}</span></td>
              <td style={{...RPT_tdStyle,fontSize:11,color:"#5a6691"}}>{u.lastLogin || u.last_login || '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </PHASE2_Page>
  );
}
