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
import { Switch, Skeleton } from '../../../shell/primitives';
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

/* ══════════════════════════════════════════════════════════════════
   SETTINGS → USERS & ROLES — COMPLETE REBUILD
   Granular permission matrix: every module × every action
   Role templates, per-user overrides, branch access, special toggles
   ════════════════════════════════════════════════════════════════ */

/* ── PERMISSION SCHEMA ────────────────────────────────────────── */

// The three apps that share the CRM `users` collection and honour the per-app login gate.
const APP_ACCESS_COLS=[
  {key:"crm", label:"CRM",           hint:"Kings CRM"},
  {key:"erp", label:"ERP (Books)",   hint:"KBiz360 Books"},
  {key:"app", label:"Smart Connect", hint:"KBiz360 Smart Connect mobile app"},
];

/* App Access tab — every CRM + ERP user with a login toggle per app. Toggle OFF blocks
   that app's login (and evicts an active session within ~1 min). Data comes from
   /api/user-access (the shared `users` collection), NOT the ERP BooksAccess grants.
   Top-level (not nested in SettingsUsers) so the search input keeps focus while typing. */
function AppAccessTab({ rows, search, setSearch, onToggle, loaded }){
  return (
    <div>
      <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users..."
          style={{...inp,width:220,minHeight:32,fontSize:11}}/>
        <span style={{fontSize:10.5,color:"#5a6691",display:"flex",alignItems:"center",gap:5}}>
          <Smartphone size={13}/> Toggle which apps each user can log into. <b>Off</b> = login blocked; open sessions end within ~1 min.
        </span>
        <button onClick={()=>exportToCSV(rows.map(u=>({id:u.id,name:u.name,email:u.email,role:u.role,status:u.status,crm:!!u.access?.crm,erp:!!u.access?.erp,app:!!u.access?.app})),["id","name","email","role","status","crm","erp","app"],"app-access.csv")}
          style={{...btnGh,fontSize:11,marginLeft:"auto"}}><Download size={13}/> Export</button>
      </div>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:14}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["User","Email","Role",...APP_ACCESS_COLS.map(a=>a.label)].map((h,i)=>(
              <th key={i} title={i>=3?APP_ACCESS_COLS[i-3].hint:undefined} style={{padding:"9px 12px",textAlign:i<3?"left":"center",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {!loaded && Array.from({length:5}).map((_,i)=>(
              <tr key={`sk-${i}`}><td colSpan={6} style={{padding:"10px 12px"}}><Skeleton className="h-4 w-full" style={{opacity:Math.max(0.4,1-i*0.15)}} /></td></tr>
            ))}
            {loaded && rows.length===0&&(
              <tr><td colSpan={6} style={{padding:"18px 12px",textAlign:"center",color:"#5a6691"}}>No users match your search.</td></tr>
            )}
            {rows.map((u,i)=>(
              <tr key={u.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326",whiteSpace:"nowrap"}}>
                  {u.name||"—"}
                  {u.status&&u.status!=="active"&&<span style={{marginLeft:6,fontSize:9,padding:"1px 6px",borderRadius:999,background:"#FCEBEB",color:"#A32D2D",fontWeight:700}}>{u.status}</span>}
                </td>
                <td style={{padding:"8px 12px",color:"#5a6691",fontSize:10.5}}>{u.email||"—"}</td>
                <td style={{padding:"8px 12px",color:"#5a6691",fontSize:10.5}}>{u.role||"—"}</td>
                {APP_ACCESS_COLS.map(a=>(
                  <td key={a.key} style={{padding:"8px 12px",textAlign:"center"}}>
                    <span style={{display:"inline-flex"}}>
                      <Switch checked={!!u.access?.[a.key]} onChange={(v)=>onToggle(u,a.key,v)} label=""/>
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SettingsUsers({ embedded=false, tab:tabProp, onTabChange }={}){
  const usersLive=useUsersAdmin().data;                          // DB-backed (/api/auth/users)
  const [users,setUsers]=useState([]);
  useEffect(()=>{ if(usersLive) setUsers(usersLive); },[usersLive]);
  const [tabState,setTabState]=useState("users"); // users | roles | access
  const tab=tabProp||tabState;
  const setTab=(t)=>{ if(onTabChange) onTabChange(t); else setTabState(t); };
  // App Access tab: EVERY CRM + ERP user with their per-app login toggles (/api/user-access).
  const accessLive=useUserAccess().data;
  const [accessRows,setAccessRows]=useState([]);
  useEffect(()=>{ if(accessLive) setAccessRows(accessLive); },[accessLive]);
  const [accessSearch,setAccessSearch]=useState("");
  // The signed-in admin's own email — used to stop them locking THEMSELVES out of the
  // app they're currently using (ERP). Read straight from the stored session user.
  const myEmail=(()=>{ try{ return String(JSON.parse(localStorage.getItem("kb360-user")||"null")?.email||"").toLowerCase(); }catch{ return ""; } })();
  const [selUser,setSelUser]=useState(null);
  const [selRole,setSelRole]=useState(null);
  const [editPerms,setEditPerms]=useState(null); // {userId, perms, special}
  const [newUserModal,setNewUserModal]=useState(false); useModalEsc(()=>setNewUserModal(false),newUserModal);
  const [newUserForm,setNewUserForm]=useState({name:"",email:"",phone:"",role:"Accounts Executive",branches:["BOM"],password:"",confirm:""});
  const [search,setSearch]=useState("");
  const mob=useMobile();
  const qc=useQueryClient();
  // Role grants come from the DB (Settings → Roles); built into the legacy map shape.
  const ROLE_TEMPLATES=Object.fromEntries((useRoles().data||[]).map(r=>[r.name,r]));
  const createUserMut=useMutation({mutationFn:(b)=>apiPost('/api/auth/users',b),onSuccess:()=>qc.invalidateQueries({queryKey:['ref','users']})});
  const updateUserMut=useMutation({mutationFn:({id,body})=>apiPut(`/api/auth/users/${id}`,body),onSuccess:()=>qc.invalidateQueries({queryKey:['ref','users']})});
  const deleteUserMut=useMutation({mutationFn:(id)=>apiDelete(`/api/auth/users/${id}`),onSuccess:()=>qc.invalidateQueries({queryKey:['ref','users']})});
  const setAccessMut=useMutation({mutationFn:({id,body})=>apiPatch(`/api/user-access/${id}`,body),onSuccess:()=>qc.invalidateQueries({queryKey:['ref','user-access']})});

  const ALL_BRANCHES=BRANCH_CODES;
  const ROLE_NAMES=Object.keys(ROLE_TEMPLATES);
  const ROLE_CLR=Object.fromEntries(Object.entries(ROLE_TEMPLATES).map(([k,v])=>[k,v.color]));
  const ROLE_BG =Object.fromEntries(Object.entries(ROLE_TEMPLATES).map(([k,v])=>[k,v.bg]));

  /* Load permissions for editing */
  const startEdit=(user)=>{
    // Guard: ROLE_TEMPLATES is built from useRoles().data and is empty while roles load
    // (or if the user's role has no template) — `tmpl.perms` would then throw and blank
    // the whole Users screen. Fall back to a safe empty matrix.
    const tmpl=ROLE_TEMPLATES[user.role]||ROLE_TEMPLATES["Accounts Executive"]||{perms:{},special:{}};
    setEditPerms({
      userId:user.id,
      userName:user.name,
      userRole:user.role,
      perms:JSON.parse(JSON.stringify(tmpl.perms||{})),
      special:{...(tmpl.special||{})},
      branches:[...(user.branches||[])],
    });
  };

  /* Persist the edited access. The backend BooksAccess model backs (and ENFORCES) role +
     branch access; the per-module `perms` matrix / `special` toggles are a UI overlay that
     no server endpoint stores, so Save persists the role + branches that actually take
     effect. Previously this button discarded everything (it only closed the modal). */
  const savePermissions=()=>{
    if(!editPerms)return;
    updateUserMut.mutate(
      {id:editPerms.userId, body:{role:editPerms.userRole, branches:editPerms.branches}},
      {
        onSuccess:()=>{ toast(`Saved access for ${editPerms.userName}`); setEditPerms(null); },
        onError:(e)=>toast(e?.message||'Failed to save permissions','error'),
      }
    );
  };

  const togglePerm=(modId,action)=>{
    setEditPerms(ep=>({
      ...ep,
      perms:{...ep.perms,[modId]:{...ep.perms[modId],[action]:!ep.perms[modId][action]}},
    }));
  };

  const toggleGroupAction=(grp,action,val)=>{
    setEditPerms(ep=>{
      const np={...ep.perms};
      grp.mods.forEach(m=>{ if(np[m.id])np[m.id]={...np[m.id],[action]:val}; });
      return {...ep,perms:np};
    });
  };

  const toggleModAll=(modId,val)=>{
    setEditPerms(ep=>({
      ...ep,
      perms:{...ep.perms,[modId]:ACTIONS.reduce((o,a)=>({...o,[a]:val}),{})},
    }));
  };

  const applyTemplate=(roleName)=>{
    const tmpl=ROLE_TEMPLATES[roleName];
    if(!tmpl)return;
    setEditPerms(ep=>({...ep,userRole:roleName,
      perms:JSON.parse(JSON.stringify(tmpl.perms||{})),
      special:{...(tmpl.special||{})},
    }));
  };

  const isGroupAllChecked=(grp,action)=>grp.mods.every(m=>editPerms?.perms[m.id]?.[action]);
  const isModAllChecked=(modId)=>ACTIONS.every(a=>editPerms?.perms[modId]?.[a]);

  const filteredUsers=users.filter(u=>!search||u.name.toLowerCase().includes(search.toLowerCase())||u.email.toLowerCase().includes(search.toLowerCase()));

  /* ── APP ACCESS ───────────────────────────────────────────────────
     The per-user login toggles. The presentational table is a STABLE top-level
     component (AppAccessTab, defined above this function) so its search box keeps
     focus while typing; this closure only owns the toggle mutation + self-lock guard. */
  const toggleAccess=(u,key,val)=>{
    // Guard against locking YOURSELF out of the app you're using right now.
    if(!val && key==="erp" && u.email && u.email.toLowerCase()===myEmail){
      toast("You can't disable your own ERP access while signed in here.","error");
      return;
    }
    // Optimistic flip; reverts on error, and the invalidate refetch confirms on success.
    setAccessRows(rows=>rows.map(r=>r.id===u.id?{...r,access:{...r.access,[key]:val}}:r));
    setAccessMut.mutate(
      {id:u.id, body:{[key]:val}},
      {
        onSuccess:()=>toast(`${val?"Enabled":"Disabled"} ${APP_ACCESS_COLS.find(a=>a.key===key).label} login for ${u.name||u.email}`),
        onError:(e)=>{
          setAccessRows(rows=>rows.map(r=>r.id===u.id?{...r,access:{...r.access,[key]:!val}}:r));
          toast(e?.message||"Failed to update access","error");
        },
      }
    );
  };
  const filteredAccess=accessRows.filter(u=>!accessSearch||(u.name||"").toLowerCase().includes(accessSearch.toLowerCase())||(u.email||"").toLowerCase().includes(accessSearch.toLowerCase()));

  /* ── USERS LIST VIEW ── */
  const UsersTab=()=>(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users..."
          style={{...inp,width:220,minHeight:32,fontSize:11}}/>
        <button onClick={()=>setNewUserModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Add User</button>
        <button onClick={()=>exportToCSV(users,["id","name","email","role","branches","active","last"],"users.csv")}
          style={{...btnGh,fontSize:11}}><Download size={13}/> Export</button>
      </div>

      <div style={{...card,padding:0,overflow:"hidden",marginBottom:14}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Name","Email","Phone","Role","Branch Access","Last Login","Status","Actions"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filteredUsers.map((u,i)=>(
            <tr key={u.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:ROLE_BG[u.role]||"#f3f4f8",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,
                    color:ROLE_CLR[u.role]||"#5a6691",flexShrink:0}}>
                    {String(u.name||u.email||"?").split(" ").map(n=>n[0]).filter(Boolean).join("").slice(0,2)||"?"}
                  </div>
                  <span style={{fontWeight:600,color:"#0d1326"}}>{u.name||u.email||"—"}</span>
                </div>
              </td>
              <td style={{padding:"8px 12px",color:"#5a6691",fontSize:10.5}}>{u.email}</td>
              <td style={{padding:"8px 12px",color:"#5a6691",fontSize:10.5}}>{u.phone||"—"}</td>
              <td style={{padding:"8px 12px"}}>
                <span style={{fontSize:10,padding:"2px 9px",borderRadius:999,fontWeight:700,
                  background:ROLE_BG[u.role]||"#f3f4f8",color:ROLE_CLR[u.role]||"#5a6691"}}>{u.role}</span>
              </td>
              <td style={{padding:"8px 12px"}}>
                <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                  {(u.branches||[]).includes("ALL")
                    ?<span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#0d1326",color:"#d4a437",fontWeight:700}}>ALL</span>
                    :(u.branches||[]).map(b=><span key={b} style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{b}</span>)
                  }
                </div>
              </td>
              <td style={{padding:"8px 12px",color:"#5a6691",fontSize:10,whiteSpace:"nowrap"}}>{u.last}</td>
              <td style={{padding:"8px 12px"}}>
                <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,
                  background:u.active?"#EAF3DE":"#FCEBEB",color:u.active?"#27500A":"#A32D2D"}}>
                  {u.active?"Active":"Inactive"}
                </span>
              </td>
              <td style={{padding:"8px 12px"}}>
                <div style={{display:"flex",gap:4}}>
                  <button onClick={()=>startEdit(u)} style={{...btnG,padding:"3px 9px",fontSize:9.5,background:"#185FA5"}}>Permissions</button>
                  <button disabled={updateUserMut.isPending}
                    onClick={()=>updateUserMut.mutate({id:u.id,body:{active:!u.active}},{onError:(e)=>toast(e?.message||'Failed to update user','error')})}
                    style={{...btnGh,padding:"3px 9px",fontSize:9.5,color:u.active?"#A32D2D":"#27500A",opacity:updateUserMut.isPending?0.5:1}}>
                    {u.active?"Deactivate":"Activate"}
                  </button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );

  /* ── PERMISSION MATRIX EDITOR ── */
  const PermissionEditor=()=>{
    if(!editPerms)return null;
    const RISK_CLR={HIGH:"#A32D2D",MED:"#854F0B",LOW:"#27500A"};
    const RISK_BG ={HIGH:"#FCEBEB",MED:"#FAEEDA",LOW:"#EAF3DE"};
    return (
      <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.75)",zIndex:600,
        display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"10px",overflow:"auto"}}>
        <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:1100,
          boxShadow:"0 24px 64px rgba(0,0,0,0.4)",maxHeight:"95vh",overflow:"auto"}}>

          {/* Header */}
          <div style={{position:"sticky",top:0,background:"#0d1326",borderRadius:"14px 14px 0 0",
            padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",zIndex:10}}>
            <div>
              <p style={{margin:0,fontSize:15,fontWeight:800,color:"#d4a437"}}>🔐 Permission Matrix — {editPerms.userName}</p>
              <p style={{margin:"2px 0 0",fontSize:10,color:"#8b94b3"}}>Current role: {editPerms.userRole} · Customise individual module access below</p>
            </div>
            <button onClick={()=>setEditPerms(null)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:22,color:"#8b94b3"}}>✕</button>
          </div>

          <div style={{padding:"14px 18px"}}>
            {/* Role template quick-apply */}
            <div style={{...card,marginBottom:14,background:"#f9fafb"}}>
              <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Quick Apply Role Template</p>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                {ROLE_NAMES.map(r=>(
                  <button key={r} onClick={()=>applyTemplate(r)}
                    style={{padding:"5px 12px",borderRadius:7,cursor:"pointer",fontSize:10.5,fontWeight:700,
                      background:editPerms.userRole===r?ROLE_CLR[r]||"#0d1326":ROLE_BG[r]||"#f3f4f8",
                      color:editPerms.userRole===r?"#fff":ROLE_CLR[r]||"#384677",
                      border:`1.5px solid ${ROLE_CLR[r]||"#e1e3ec"}`}}>
                    {r}
                  </button>
                ))}
              </div>
              <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{ROLE_TEMPLATES[editPerms.userRole]?.desc||"Custom permissions"}</p>
            </div>

            {/* Branch access */}
            <div style={{...card,marginBottom:14}}>
              <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Branch Access</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {ALL_BRANCHES.map(b=>(
                  <label key={b} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",
                    padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:600,
                    background:editPerms.branches.includes(b)?"#0d1326":"#f3f4f8",
                    color:editPerms.branches.includes(b)?"#d4a437":"#384677",
                    border:`2px solid ${editPerms.branches.includes(b)?"#d4a437":"#e1e3ec"}`}}>
                    <input type="checkbox" checked={editPerms.branches.includes(b)} style={{display:"none"}}
                      onChange={()=>setEditPerms(ep=>({...ep,
                        branches:ep.branches.includes(b)?ep.branches.filter(x=>x!==b):[...ep.branches,b]
                      }))}/>
                    {BRANCHES.find(br=>br.code===b)?.flag||""} {b}
                  </label>
                ))}
                <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",
                  padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:600,
                  background:editPerms.branches.length===5?"#A32D2D":"#f3f4f8",
                  color:editPerms.branches.length===5?"#fff":"#384677",
                  border:`2px solid ${editPerms.branches.length===5?"#A32D2D":"#e1e3ec"}`}}
                  onClick={()=>setEditPerms(ep=>({...ep,branches:ep.branches.length===5?[]:ALL_BRANCHES}))}>
                  🌐 {CONSOLIDATED_LABEL}
                </label>
              </div>
            </div>

            {/* Special Toggles */}
            <div style={{...card,marginBottom:14}}>
              <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Special Permissions</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:8}}>
                {SPECIAL_TOGGLES.map(t=>(
                  <label key={t.id} style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",
                    padding:"9px 12px",borderRadius:9,
                    background:editPerms.special[t.id]?RISK_BG[t.risk]:"#f3f4f8",
                    border:`1.5px solid ${editPerms.special[t.id]?"#"+{HIGH:"F7C1C1",MED:"FAC775",LOW:"C0DD97"}[t.risk]:"#e1e3ec"}`}}>
                    <input type="checkbox" checked={!!editPerms.special[t.id]} onChange={()=>
                      setEditPerms(ep=>({...ep,special:{...ep.special,[t.id]:!ep.special[t.id]}}))}
                      style={{marginTop:2,cursor:"pointer",accentColor:RISK_CLR[t.risk]}}/>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:10.5,fontWeight:700,color:"#0d1326"}}>{t.label}</span>
                        <span style={{fontSize:8,padding:"1px 5px",borderRadius:999,fontWeight:800,
                          background:RISK_BG[t.risk],color:RISK_CLR[t.risk]}}>{t.risk}</span>
                      </div>
                      <p style={{margin:"1px 0 0",fontSize:9.5,color:"#5a6691",lineHeight:1.4}}>{t.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Module Permission Matrix */}
            <div style={{marginBottom:14}}>
              <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Module Permissions</p>
              <div style={{...card,padding:0,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:10.5}}>
                  <thead>
                    <tr style={{background:"#0d1326"}}>
                      <th style={{padding:"10px 14px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:10,width:"35%"}}>Module</th>
                      <th style={{padding:"10px 6px",textAlign:"center",color:"#d4a437",fontWeight:700,fontSize:10,width:20}}>All</th>
                      {ACTIONS.map(a=>(
                        <th key={a} style={{padding:"10px 6px",textAlign:"center",fontWeight:700,fontSize:9.5,color:ACTION_CLR[a]||"#d4a437",minWidth:52}}>
                          {ACTION_LABELS[a]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERM_MODULES.map((grp,gi)=>(
                      <>
                        {/* Group header row */}
                        <tr key={`grp-${gi}`} style={{background:"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
                          <td style={{padding:"6px 14px",fontWeight:800,color:"#384677",fontSize:10.5}}>
                            {grp.icon} {grp.group}
                          </td>
                          <td style={{padding:"4px 6px",textAlign:"center"}}>
                            <input type="checkbox" style={{cursor:"pointer"}}
                              checked={ACTIONS.every(a=>isGroupAllChecked(grp,a))}
                              onChange={e=>ACTIONS.forEach(a=>toggleGroupAction(grp,a,e.target.checked))}/>
                          </td>
                          {ACTIONS.map(a=>(
                            <td key={a} style={{padding:"4px 6px",textAlign:"center"}}>
                              <button onClick={()=>toggleGroupAction(grp,a,!isGroupAllChecked(grp,a))}
                                style={{fontSize:8.5,padding:"1px 5px",borderRadius:3,cursor:"pointer",fontWeight:700,
                                  background:isGroupAllChecked(grp,a)?(ACTION_CLR[a]||"#384677"):"#e1e3ec",
                                  color:isGroupAllChecked(grp,a)?"#fff":"#5a6691",border:"none",whiteSpace:"nowrap"}}>
                                {isGroupAllChecked(grp,a)?"All ✔":"All"}
                              </button>
                            </td>
                          ))}
                        </tr>
                        {/* Module rows */}
                        {grp.mods.map((mod,mi)=>(
                          <tr key={`mod-${mod.id}`} style={{borderBottom:"1px solid #dfe2e7",
                            background:mi%2===0?"#fff":"#fafafa"}}>
                            <td style={{padding:"6px 14px 6px 26px",color:"#384677",fontSize:10.5}}>
                              {mod.label}
                            </td>
                            <td style={{padding:"4px 6px",textAlign:"center"}}>
                              <input type="checkbox" style={{cursor:"pointer",accentColor:"#0d1326"}}
                                checked={isModAllChecked(mod.id)}
                                onChange={e=>toggleModAll(mod.id,e.target.checked)}/>
                            </td>
                            {ACTIONS.map(a=>(
                              <td key={a} style={{padding:"4px 6px",textAlign:"center"}}>
                                <input type="checkbox" style={{cursor:"pointer",accentColor:ACTION_CLR[a]||"#384677"}}
                                  checked={!!editPerms.perms[mod.id]?.[a]}
                                  onChange={()=>togglePerm(mod.id,a)}/>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer save */}
          <div style={{position:"sticky",bottom:0,background:"#fff",borderTop:"1px solid #cdd1d8",
            padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",
            boxShadow:"0 -4px 12px rgba(0,0,0,0.08)"}}>
            <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>
              Editing permissions for <b>{editPerms.userName}</b> · Role: <b>{editPerms.userRole}</b>
            </p>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setEditPerms(null)} style={btnGh}>Cancel</button>
              {/* Persist only what the backend stores: a user's permissions are driven by
                  their ROLE (granular perms/special come from the role template) plus the
                  branch scope. perms/special are UI-derived from the role and not stored.
                  savePermissions() persists role + branches with toast + error handling. */}
              <button onClick={savePermissions} disabled={updateUserMut.isPending} style={{...btnG,background:"#27500A",opacity:updateUserMut.isPending?0.6:1,cursor:updateUserMut.isPending?"wait":"pointer"}}>{updateUserMut.isPending?"Saving…":"💾 Save Permissions"}</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ── ROLE SUMMARY CARDS ── */
  const RolesTab=()=>(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:12}}>
      {Object.entries(ROLE_TEMPLATES).map(([rName,rDef])=>(
        <div key={rName} style={{...card,borderTop:`4px solid ${rDef.color}`,padding:0,overflow:"hidden"}}>
          <div style={{padding:"12px 14px",background:rDef.bg}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,fontWeight:800,color:rDef.color}}>{rName}</span>
              <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,background:rDef.color,color:"#fff",fontWeight:700}}>
                {users.filter(u=>u.role===rName).length} user{users.filter(u=>u.role===rName).length!==1?"s":""}
              </span>
            </div>
            <p style={{margin:"4px 0 0",fontSize:10.5,color:rDef.color,fontWeight:500}}>{rDef.desc}</p>
          </div>
          <div style={{padding:"10px 14px"}}>
            {/* Show special toggles summary */}
            <p style={{margin:"0 0 6px",fontSize:9.5,fontWeight:700,color:"#384677",textTransform:"uppercase",letterSpacing:"0.5px"}}>Special Access</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {SPECIAL_TOGGLES.filter(t=>rDef.special?.[t.id]).map(t=>(
                <span key={t.id} style={{fontSize:8.5,padding:"2px 6px",borderRadius:999,fontWeight:700,
                  background:({HIGH:"#FCEBEB",MED:"#FAEEDA",LOW:"#EAF3DE"})[t.risk],
                  color:({HIGH:"#A32D2D",MED:"#854F0B",LOW:"#27500A"})[t.risk]}}>{t.label}</span>
              ))}
              {SPECIAL_TOGGLES.filter(t=>rDef.special?.[t.id]).length===0&&<span style={{fontSize:10,color:"#5a6691"}}>No special permissions</span>}
            </div>
            {/* Module access summary */}
            <p style={{margin:"10px 0 6px",fontSize:9.5,fontWeight:700,color:"#384677",textTransform:"uppercase",letterSpacing:"0.5px"}}>Module Access</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {PERM_MODULES.map(grp=>{
                const hasAny=grp.mods.some(m=>ACTIONS.some(a=>rDef.perms?.[m.id]?.[a]));
                const hasAll=grp.mods.every(m=>ACTIONS.every(a=>rDef.perms?.[m.id]?.[a]));
                if(!hasAny)return null;
                return (
                  <span key={grp.group} style={{fontSize:8.5,padding:"2px 7px",borderRadius:999,fontWeight:700,
                    background:hasAll?"#0d1326":"#E6F1FB",color:hasAll?"#d4a437":"#185FA5"}}>
                    {grp.icon} {grp.group}{hasAll?" (Full)":""}
                  </span>
                );
              })}
            </div>
          </div>
          <div style={{padding:"8px 14px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end"}}>
            <button onClick={()=>{setTab("users");}} style={{...btnGh,fontSize:10,padding:"3px 10px"}}>View Users →</button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={embedded?undefined:{padding:"12px 10px",maxWidth:1300,margin:"0 auto"}}>
      {!embedded&&(
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FCEBEB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔐</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Users & Roles</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>
              {users.length} users · {Object.keys(ROLE_TEMPLATES).length} roles · Granular module permissions
            </p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setTab("users")} style={{flex:1,padding:"8px 12px",border:"none",cursor:"pointer",fontWeight:tab==="users"?700:500,background:tab==="users"?"#fff":"transparent",borderRadius:6}}>👥 Users</button><button onClick={()=>setTab("roles")} style={{flex:1,padding:"8px 12px",border:"none",cursor:"pointer",fontWeight:tab==="roles"?700:500,background:tab==="roles"?"#fff":"transparent",borderRadius:6}}>🎭 Role Templates</button><button onClick={()=>setTab("access")} style={{flex:1,padding:"8px 12px",border:"none",cursor:"pointer",fontWeight:tab==="access"?700:500,background:tab==="access"?"#fff":"transparent",borderRadius:6}}>🔐 App Access</button>
        </div>
      </div>
      )}

      {/* Summary KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Total Users",      v:String(users.length),               c:"#384677",bg:"#f3f4f8"},
          {l:"Active",           v:String(users.filter(u=>u.active).length),c:"#27500A",bg:"#EAF3DE"},
          {l:"Role Templates",   v:String(Object.keys(ROLE_TEMPLATES).length),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Branches Covered", v:"5",                                 c:"#854F0B",bg:"#FAEEDA"},
          {l:"Inactive",         v:String(users.filter(u=>!u.active).length),c:"#A32D2D",bg:"#FCEBEB"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:22,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      {tab==="users"&&<UsersTab/>}
      {tab==="roles"&&<RolesTab/>}
      {tab==="access"&&<AppAccessTab rows={filteredAccess} search={accessSearch} setSearch={setAccessSearch} onToggle={toggleAccess} loaded={accessRows.length>0}/>}

      {/* Permission editor overlay */}
      {editPerms&&<PermissionEditor/>}

      {/* New user modal */}
      {newUserModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Add New User</p>
              <button onClick={()=>setNewUserModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Full name"><input value={newUserForm.name} onChange={e=>setNewUserForm(f=>({...f,name:e.target.value}))} style={inp}/></FL>
                <FL label="Email"><input type="email" value={newUserForm.email} onChange={e=>setNewUserForm(f=>({...f,email:e.target.value}))} style={inp}/></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Mobile / Phone"><input value={newUserForm.phone||""} onChange={e=>setNewUserForm(f=>({...f,phone:e.target.value}))} style={inp}/></FL>
                <FL label="Role"><select value={newUserForm.role} onChange={e=>setNewUserForm(f=>({...f,role:e.target.value}))} style={inp}>
                  {ROLE_NAMES.map(r=><option key={r}>{r}</option>)}
                </select></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Password"><input type="password" autoComplete="new-password" value={newUserForm.password} onChange={e=>setNewUserForm(f=>({...f,password:e.target.value}))} placeholder="Min 8 characters" style={inp}/></FL>
                <FL label="Confirm Password"><input type="password" autoComplete="new-password" value={newUserForm.confirm} onChange={e=>setNewUserForm(f=>({...f,confirm:e.target.value}))} placeholder="Re-enter password" style={inp}/></FL>
              </div>
              <FL label="Branch Access">
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
                  {ALL_BRANCHES.map(b=>(
                    <label key={b} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",
                      padding:"4px 10px",borderRadius:6,fontSize:10.5,fontWeight:600,
                      background:newUserForm.branches.includes(b)?"#0d1326":"#f3f4f8",
                      color:newUserForm.branches.includes(b)?"#d4a437":"#384677",
                      border:`1.5px solid ${newUserForm.branches.includes(b)?"#d4a437":"#e1e3ec"}`}}>
                      <input type="checkbox" style={{display:"none"}}
                        checked={newUserForm.branches.includes(b)}
                        onChange={()=>setNewUserForm(f=>({...f,
                          branches:f.branches.includes(b)?f.branches.filter(x=>x!==b):[...f.branches,b]
                        }))}/>
                      {BRANCHES.find(br=>br.code===b)?.flag||""} {b}
                    </label>
                  ))}
                </div>
              </FL>
              <div style={{padding:"9px 12px",borderRadius:8,background:"#f3f4f8",fontSize:9.5,color:"#5a6691"}}>
                Creates a login for <b>ERP + CRM</b> with the password above — Books role <b>{newUserForm.role}</b> and a basic CRM role are assigned. Mobile app access stays off until enabled on the App Access tab. If this email already has a login, its password is kept.
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setNewUserModal(false)} style={btnGh}>Cancel</button>
              <button disabled={createUserMut.isPending} onClick={()=>{
                if(!newUserForm.name.trim()||!newUserForm.email.trim()){ toast("Name and email are required","error"); return; }
                if((newUserForm.password||"").length<8){ toast("Password must be at least 8 characters","error"); return; }
                if(newUserForm.password!==newUserForm.confirm){ toast("Passwords do not match","error"); return; }
                const { confirm, ...payload }=newUserForm;
                createUserMut.mutate({...payload,active:true},{  // persists to /api/auth/users
                  onSuccess:()=>{ setNewUserModal(false); setNewUserForm({name:"",email:"",phone:"",role:"Accounts Executive",branches:["BOM"],password:"",confirm:""}); toast(`User ${newUserForm.name} created`); },
                  onError:(e)=>toast(e?.message||"Could not create user","error"),
                });
              }} style={{...btnG,opacity:createUserMut.isPending?0.6:1,cursor:createUserMut.isPending?"not-allowed":"pointer"}}>{createUserMut.isPending?"Adding…":"Add User"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
