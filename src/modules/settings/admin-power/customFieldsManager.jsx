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

export function CustomFieldsManager(){
  // Live custom fields (GET /api/custom-fields). Was hardcoded CUSTOM_FIELDS_DATA.
  const all=useCustomFields().data||[];
  const qc=useQueryClient();
  const [master,setMaster]=useState("ALL");
  const [modal,setModal]=useState(null); // null | {dbId?, master, label, type, options, required, active}
  const masters=["ALL","Customer","Supplier","Employee"];
  const filtered=master==="ALL"?all:all.filter(f=>f.master===master);
  const refetch=()=>qc.invalidateQueries({queryKey:["ref","custom-fields"]});
  const openNew=()=>setModal({master:master==="ALL"?"Customer":master,label:"",type:"Text",options:"",required:false,active:true});
  const saveModal=async()=>{
    if(!modal.label.trim()){toast("Field label is required","error");return;}
    try{
      if(modal.dbId){ await apiPut(`/api/custom-fields/${modal.dbId}`,{master:modal.master,label:modal.label,type:modal.type,options:modal.options,required:modal.required,active:modal.active}); toast(`Saved ${modal.label}`); }
      else{
        const next=Math.max(0,...all.map(x=>parseInt(String(x.id).replace(/\D/g,""),10)||0))+1;
        await apiPost("/api/custom-fields",{cfId:`CF-${String(next).padStart(3,"0")}`,master:modal.master,label:modal.label,type:modal.type,options:modal.options,required:modal.required,active:modal.active});
        toast(`Added ${modal.label}`);
      }
      setModal(null); refetch();
    }catch(e){ toast(e.message||"Save failed","error"); }
  };
  const toggleActive=async(f)=>{
    try{ await apiPut(`/api/custom-fields/${f.dbId}`,{active:!f.active}); refetch(); }
    catch(e){ toast(e.message||"Update failed","error"); }
  };
  const mInp={padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,width:"100%"};
  return(
    <PHASE2_Page title="Custom Fields Manager" subtitle="Add fields to any master without code changes · applies across all branches"
      toolbar={<><select value={master} onChange={e=>setMaster(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}>{masters.map(m=><option key={m}>{m}</option>)}</select><button onClick={openNew} style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Add Field</button></>}>
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Master</th><th style={RPT_thStyle}>Field Label</th><th style={RPT_thStyle}>Type</th><th style={RPT_thStyle}>Options / Format</th><th style={{...RPT_thStyle,textAlign:"center"}}>Required</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th><th style={{...RPT_thStyle,textAlign:"center"}}>Action</th></tr></thead>
          <tbody>{filtered.map(f=>(
            <tr key={f.id} style={{borderBottom:"1px solid #dfe2e7"}}>
              <td style={RPT_tdStyle}><span style={{padding:"2px 7px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{f.master}</span></td>
              <td style={{...RPT_tdStyle,fontWeight:700}}>{f.label}</td>
              <td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:"#fafbfd",border:"1px solid #cdd1d8",borderRadius:3,fontSize:11}}>{f.type}</span></td>
              <td style={{...RPT_tdStyle,color:"#5a6691",fontSize:11}}>{f.options||"—"}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}>{f.required?<span style={{color:"#A32D2D",fontWeight:700}}>Yes</span>:"—"}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:700,background:f.active?"#d4edda":"#e2e3e5",color:f.active?"#155724":"#383d41"}}>{f.active?"Active":"Inactive"}</span></td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}>
                <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                  <button onClick={()=>setModal({dbId:f.dbId,master:f.master,label:f.label,type:f.type,options:f.options||"",required:!!f.required,active:f.active!==false})} style={{padding:"3px 8px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>toggleActive(f)} title={f.active?"Deactivate":"Activate"} style={{padding:"3px 8px",background:"transparent",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:3,fontSize:10,cursor:"pointer"}}>{f.active?"Off":"On"}</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(13,19,38,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={()=>setModal(null)}>
          <div style={{background:"#fff",borderRadius:10,padding:18,width:400,maxWidth:"92vw"}} onClick={e=>e.stopPropagation()}>
            <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>{modal.dbId?"Edit Field":"Add Field"}</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Master</label><select value={modal.master} onChange={e=>setModal(m=>({...m,master:e.target.value}))} style={mInp}><option>Customer</option><option>Supplier</option><option>Employee</option></select></div>
              <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Field Label</label><input value={modal.label} onChange={e=>setModal(m=>({...m,label:e.target.value}))} style={mInp}/></div>
              <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Type</label><select value={modal.type} onChange={e=>setModal(m=>({...m,type:e.target.value}))} style={mInp}><option>Text</option><option>Number</option><option>Date</option><option>Dropdown</option><option>Checkbox</option></select></div>
              {modal.type==="Dropdown"&&<div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Options (comma-separated)</label><input value={modal.options} onChange={e=>setModal(m=>({...m,options:e.target.value}))} style={mInp}/></div>}
              <div style={{display:"flex",gap:16}}>
                <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer"}}><input type="checkbox" checked={modal.required} onChange={e=>setModal(m=>({...m,required:e.target.checked}))}/>Required</label>
                <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer"}}><input type="checkbox" checked={modal.active} onChange={e=>setModal(m=>({...m,active:e.target.checked}))}/>Active</label>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
                <button onClick={()=>setModal(null)} style={{padding:"7px 14px",background:"#fff",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
                <button onClick={saveModal} style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>💾 Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PHASE2_Page>
  );
}
