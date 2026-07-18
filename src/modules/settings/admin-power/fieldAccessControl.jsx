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

export function FieldAccessControl(){
  const accessColor={"View+Edit":"#22c55e","View Only":"#d4a437","Hidden":"#A32D2D"};
  const PERM_ROLES=(useRoles().data||[]).map(r=>r.name);   // DB-backed role names
  // Live field-access rules (GET /api/field-access). Was hardcoded FIELD_ACCESS_DATA.
  const accessRows=useFieldAccess().data||[];
  const qc=useQueryClient();
  const vo=isViewOnly();
  // Unsaved edits keyed by rule id → { roleName: access } (merged over row.roles on save).
  const [draft,setDraft]=useState({});
  const dirtyCount=Object.keys(draft).length;
  const save=async()=>{
    try{
      for(const [id,roles] of Object.entries(draft)){
        const row=accessRows.find(r=>r.id===id); if(!row) continue;
        await apiPut(`/api/field-access/${id}`,{roles:{...row.roles,...roles}});
      }
      toast(`Saved ${dirtyCount} rule${dirtyCount!==1?"s":""}`); setDraft({});
      qc.invalidateQueries({queryKey:["ref","field-access"]});
    }catch(e){ toast(e.message||"Save failed","error"); }
  };
  return(
    <PHASE2_Page title="Field-Level Access Control" subtitle="Control which fields each role can view or edit · per module · per field">
      <div style={cardStyle}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead>
              <tr style={{background:"#f7f8fb"}}>
                <th style={RPT_thStyle}>Field</th>
                <th style={RPT_thStyle}>Module</th>
                {PERM_ROLES.map(r=><th key={r} style={{...RPT_thStyle,textAlign:"center",minWidth:120}}>{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {accessRows.map((row)=>(
                <tr key={row.id} style={{borderBottom:"1px solid #dfe2e7"}}>
                  <td style={{...RPT_tdStyle,fontWeight:700}}>{row.field}</td>
                  <td style={{...RPT_tdStyle,color:"#5a6691"}}>{row.module}</td>
                  {PERM_ROLES.map(r=>{
                    const access=(draft[row.id]&&draft[row.id][r])||row.roles[r]||"Hidden";
                    return(
                      <td key={r} style={{padding:"6px 12px",textAlign:"center",borderBottom:"1px solid #dfe2e7"}}>
                        <select value={access} onChange={e=>setDraft(d=>({...d,[row.id]:{...(d[row.id]||{}),[r]:e.target.value}}))} style={{padding:"3px 6px",border:"1px solid "+(accessColor[access]||"#e1e3ec"),borderRadius:4,fontSize:10.5,background:"#fff",color:accessColor[access]||"#5a6691",fontWeight:700,cursor:"pointer"}}>
                          <option>View+Edit</option><option>View Only</option><option>Hidden</option>
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:12,display:"flex",justifyContent:"flex-end",alignItems:"center",gap:10}}>
          {dirtyCount>0&&<span style={{fontSize:11.5,color:"#9a6700",fontWeight:600}}>{dirtyCount} unsaved rule{dirtyCount!==1?"s":""}</span>}
          <button onClick={save} disabled={!dirtyCount||vo} title={vo?VIEW_ONLY_REASON:undefined} style={{padding:"8px 18px",background:dirtyCount?"#d4a437":"#eef0f6",color:dirtyCount?"#0d1326":"#9aa3bd",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:dirtyCount?"pointer":"not-allowed",...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>💾 Save Access Rules</button>
        </div>
      </div>
    </PHASE2_Page>
  );
}
