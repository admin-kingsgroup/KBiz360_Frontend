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
import { Switch } from '../../../shell/primitives';
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

export function PermissionsMatrix(){
  const [selRole,setSelRole]=useState("Accounts Executive");
  const PERM_ROLES=(useRoles().data||[]).map(r=>r.name);   // DB-backed role names
  const fullAccess=["Super Admin","Director"];
  const noSettings=["Accounts Executive","Sr. Accounts Executive"];
  const hrOnly=["HR Manager"];
  const hasAccess=(role,module,action)=>{
    if(fullAccess.includes(role)) return true;
    if(module==="Settings"&&noSettings.includes(role)) return false;
    if(["HR & Payroll"].includes(module)&&role==="Accounts Executive") return false;
    if(action==="Delete"&&!["Super Admin","Director","Senior Finance Manager"].includes(role)) return false;
    if(action==="Approve"&&role==="Accounts Executive") return false;
    return true;
  };
  return(
    <PHASE2_Page title="Permissions Matrix" subtitle="Role × Module × Action — full visibility grid · click any cell to toggle"
      toolbar={<div style={{display:"flex",gap:6}}>{PERM_ROLES.map(r=><button key={r} onClick={()=>setSelRole(r)} style={{padding:"5px 12px",border:selRole===r?"2px solid #0d1326":"1px solid #cdd1d8",background:selRole===r?"#0d1326":"#fff",color:selRole===r?"#d4a437":"#5a6691",borderRadius:5,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{r}</button>)}</div>}>
      <div style={cardStyle}>
        <p style={{margin:"0 0 12px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Permissions for: <span style={{color:"#d4a437"}}>{selRole}</span></p>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#f7f8fb"}}>
              <th style={{...RPT_thStyle,minWidth:150}}>Module</th>
              {PERM_ACTIONS.map(a=><th key={a} style={{...RPT_thStyle,textAlign:"center",minWidth:70}}>{a}</th>)}
            </tr></thead>
            <tbody>{PERM_MODULES_P2.map(mod=>(
              <tr key={mod} style={{borderBottom:"1px solid #dfe2e7"}}>
                <td style={{...RPT_tdStyle,fontWeight:700}}>{mod}</td>
                {PERM_ACTIONS.map(action=>{
                  const ok=hasAccess(selRole,mod,action);
                  return(
                    <td key={action} style={{padding:"8px",textAlign:"center",borderBottom:"1px solid #dfe2e7",cursor:"pointer"}}
                      title={ok?"Click to revoke":"Click to grant"}>
                      {ok
                        ?<span style={{width:22,height:22,borderRadius:"50%",background:"#22c55e",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700}}>✓</span>
                        :<span style={{width:22,height:22,borderRadius:"50%",background:"#f0f2f7",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#5a6691"}}>—</span>
                      }
                    </td>
                  );
                })}
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div style={{marginTop:10,display:"flex",gap:14,fontSize:10.5,color:"#5a6691"}}>
          <span><span style={{color:"#22c55e",fontWeight:700}}>✓</span> = Permitted</span>
          <span>— = Not permitted</span>
          <span style={{marginLeft:"auto",color:"#d4a437"}}>Showing: {selRole}</span>
        </div>
      </div>
    </PHASE2_Page>
  );
}
