/* ════════════════════════════════════════════════════════════════════
   MODULES/SETTINGS.JSX
   Auto-generated from KBiz360_v2.jsx · 1738 lines · 15 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Download, Lock, Plus, Save, Search, Settings, User, Users } from 'lucide-react';
import { Line } from 'recharts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { exportToCSV } from '../core/business-logic';
import { toast } from '../core/ux/toast';
import { ACTION_CLR, ACTION_LABELS, BRANCHES, BRANCH_CODES, CONSOLIDATED_LABEL } from '../core/data';
import { apiPost, apiPut, apiDelete } from '../core/api';
import { useUsersAdmin, useRoles, useCompanyProfiles, useApprovalRules } from '../core/useReference';
import { useModalEsc } from '../core/ux/useModalEsc';
import { fmt } from '../core/format';
import { APPROVAL_LIMITS_DATA, CUSTOM_FIELDS_DATA, EMAIL_TEMPLATES_DATA, FIELD_ACCESS_DATA, PERM_ACTIONS, cardStyle } from '../core/helpers';
import { useIsMob, useMobile } from '../core/hooks';
// Permission CATALOGUE (which modules/actions/toggles exist) stays in code as
// app structure; the per-role GRANTS, users, company profiles and approval rules
// are DB-backed (see the useReference hooks above).
import { ACTIONS, PERM_MODULES, PERM_MODULES_P2, SPECIAL_TOGGLES } from '../core/permissions';
import { FL, RPT_tdStyle, RPT_thStyle, btnG, btnGh, card, inp } from '../core/styles';
import { PHASE2_Page } from '../shell/PHASE2_Page';

export function SettingsCompany(){
  const [tab,setTab]=useState("india");
  const [saved,setSaved]=useState(false);
  const profiles=useCompanyProfiles().data||[];                 // DB-backed (/api/company-profile)

  // Build the India entity view from the live BOM (primary) + AMD profiles.
  const bom=profiles.find(p=>p.code==="BOM")||{};
  const amd=profiles.find(p=>p.code==="AMD")||{};
  const companies=[
    {
      key:"india", flag:"🇮🇳", label:"India Entity",
      name:bom.entity||"Travkings Tours & Travels",
      type:"Partnership Firm",
      pan:bom.pan,
      gstin1:bom.gstin, gstState1:bom.state?`${bom.state} (${bom.stateCode||""})`.trim():"",
      gstin2:amd.gstin, gstState2:amd.state?`${amd.state} (${amd.stateCode||""})`.trim():"",
      tan:bom.tan,
      addr1:bom.operAddr,
      addr2:[bom.city&&`${bom.city} – ${bom.pin||""}`.trim(),bom.state,bom.country].filter(Boolean).join(", "),
      phone:bom.phone,
      email:bom.email,
      web:bom.website,
      iata:bom.iataNo,
      bsp:bom.bspParticipant,
      logo:"TK",
      fy:bom.fyStart?`${bom.fyStart} – March`:"April – March",
      currency:[bom.currency,bom.cur_sym].filter(Boolean).join(" "),
      gst:bom.taxRate?`GST ${bom.taxRate}`:"GST",
    },
  ];

  const co=companies.find(c=>c.key===tab)||companies[0];
  const isIndia=tab==="india";

  const Row=({l,v,mono})=>(
    <div style={{display:"flex",gap:8,padding:"8px 0",borderBottom:"1px solid #f3f4f8",alignItems:"flex-start"}}>
      <span style={{fontSize:10.5,color:"#5a6691",minWidth:160,flexShrink:0,paddingTop:1}}>{l}</span>
      <span style={{fontSize:11,fontWeight:600,color:"#0d1326",
        fontFamily:mono?"monospace":"inherit",letterSpacing:mono?"0.5px":"normal"}}>{v||"—"}</span>
    </div>
  );

  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
        flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:44,height:44,borderRadius:10,background:"#0d1326",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:18,fontWeight:800,color:"#d4a437"}}>TK</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Company Profile</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>
              Travkings Tours & Travels · 4 legal entities · 1 HO + 5 branches
            </p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setSaved(true)} style={{...btnG,fontSize:11}}>
            {saved?"✔ Saved":"Save Changes"}
          </button>
        </div>
      </div>

      {/* Entity tabs */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {companies.map(co2=>(
          <button key={co2.key} onClick={()=>setTab(co2.key)}
            style={{padding:"7px 16px",borderRadius:8,border:"1px solid #e1e3ec",
              fontSize:11,cursor:"pointer",fontWeight:tab===co2.key?700:400,
              background:tab===co2.key?"#0d1326":"#fff",
              color:tab===co2.key?"#d4a437":"#5a6691"}}>
            {co2.flag} {co2.label}
          </button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:useIsMob()?"1fr":"1fr 1fr",gap:14}}>
        {/* Legal details */}
        <div style={{...card}}>
          <p style={{margin:"0 0 4px",fontSize:12,fontWeight:700,color:"#0d1326"}}>🏢 Legal Details</p>
          <Row l="Company name" v={co.name}/>
          <Row l="Entity type"  v={co.type}/>
          {isIndia&&<><Row l="PAN" v={co.pan} mono/>
          <Row l="GSTIN — BOM (MH)" v={co.gstin1} mono/>
          <Row l="GST State — BOM"  v={co.gstState1}/>
          <Row l="GSTIN — AMD (GJ)" v={co.gstin2} mono/>
          <Row l="GST State — AMD"  v={co.gstState2}/>
          <Row l="TAN"              v={co.tan} mono/></>}
          {!isIndia&&<><Row l={tab==="kenya"?"VAT PIN":tab==="tanzania"?"TPIN":"NIF"} v={co.gstin1} mono/>
          <Row l="Tax Authority" v={co.gstState1}/></>}
          <Row l="Financial Year" v={co.fy}/>
          <Row l="Currency"       v={co.currency}/>
          <Row l="Tax regime"     v={co.gst}/>
        </div>

        {/* Contact & Operations */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{...card}}>
            <p style={{margin:"0 0 4px",fontSize:12,fontWeight:700,color:"#0d1326"}}>📍 Address & Contact</p>
            <Row l="Address line 1" v={co.addr1}/>
            <Row l="Address line 2" v={co.addr2}/>
            <Row l="Phone"          v={co.phone}/>
            <Row l="Email"          v={co.email}/>
            {co.web&&<Row l="Website" v={co.web}/>}
          </div>
          {(co.iata||co.bsp)&&(
            <div style={{...card}}>
              <p style={{margin:"0 0 4px",fontSize:12,fontWeight:700,color:"#0d1326"}}>✈ IATA & BSP</p>
              {co.iata&&<Row l="IATA Agent Code" v={co.iata} mono/>}
              {co.bsp&&<Row l="BSP Membership"   v={co.bsp}/>}
            </div>
          )}
          <div style={{...card,background:"#E6F1FB",border:"1px solid #B5D4F4"}}>
            <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#185FA5"}}>Invoice footer note</p>
            <textarea rows={3}
              defaultValue={`${co.name} | ${co.addr1}, ${co.addr2} | ${co.phone}`}
              style={{...inp,fontSize:10.5,resize:"vertical"}}/>
            <p style={{margin:"5px 0 0",fontSize:9.5,color:"#5a6691"}}>
              This text appears on the footer of all printed invoices for this entity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


export function SettingsBranches(){
  const mob=useMobile();
  const [sel,setSel]=useState(null);
  const [tab,setTab]=useState("overview"); // overview | identity | compliance | banking | vouchers
  const [editBank,setEditBank]=useState(false);
  const profilesLive=useCompanyProfiles().data;                 // DB-backed (/api/company-profile)
  const [branches,setBranches]=useState([]);
  useEffect(()=>{ if(profilesLive) setBranches(profilesLive); },[profilesLive]);
  const TODAY="2026-05-19";
  const daysLeft=d=>d?Math.ceil((new Date(d)-new Date(TODAY))/(1000*60*60*24)):null;

  const TAX_CLR={GST:"#185FA5",VAT:"#27500A"};
  const TAX_BG ={GST:"#E6F1FB",VAT:"#EAF3DE"};
  const selBranch=sel?branches.find(b=>b.code===sel):null;

  const LicenseAlert=({label,expiry})=>{
    const dl=daysLeft(expiry);
    if(!expiry)return null;
    const clr=dl&&dl<90?"#A32D2D":dl&&dl<180?"#854F0B":"#27500A";
    const bg=dl&&dl<90?"#FCEBEB":dl&&dl<180?"#FAEEDA":"#EAF3DE";
    return (
      <div style={{display:"flex",justifyContent:"space-between",padding:"6px 10px",borderRadius:7,background:bg,marginBottom:5}}>
        <span style={{fontSize:10.5,color:"#0d1326"}}>{label}</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:10,color:"#5a6691"}}>{expiry}</span>
          <span style={{fontSize:9.5,padding:"1px 7px",borderRadius:999,fontWeight:700,background:clr,color:"#fff"}}>
            {dl&&dl<0?"EXPIRED":dl&&dl<90?`${dl}d`:dl&&dl<180?`${dl}d`:"Valid"}
          </span>
        </div>
      </div>
    );
  };

  const BranchCard=({b})=>(
    <div onClick={()=>setSel(sel===b.code?null:b.code)} style={{
      ...card,cursor:"pointer",padding:0,overflow:"hidden",
      border:sel===b.code?"2px solid #d4a437":"1px solid #e1e3ec",
      transform:sel===b.code?"translateY(-2px)":"none",
      transition:"all 0.15s",boxShadow:sel===b.code?"0 6px 20px rgba(0,0,0,0.12)":"none"}}>
      <div style={{padding:"11px 14px",background:sel===b.code?"#0d1326":"#f9fafb",
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:26}}>{b.flag}</span>
          <div>
            <p style={{margin:0,fontSize:14,fontWeight:800,color:sel===b.code?"#d4a437":"#0d1326"}}>{b.code} — {b.city}</p>
            <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{b.country} · {b.entity}</p>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,
            background:TAX_BG[b.tax],color:TAX_CLR[b.tax]}}>{b.tax} {b.taxRate}</span>
          <p style={{margin:"3px 0 0",fontSize:9,color:b.active?"#27500A":"#A32D2D",fontWeight:700}}>
            ● {b.active?"Active":"Inactive"}
          </p>
        </div>
      </div>
      {/* Quick stats row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderTop:"1px solid #f3f4f8"}}>
        <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #e1e3ec",fontSize:11}}><span style={{color:"#5a6691"}}>Currency</span><span style={{fontWeight:600}}>{b.currency}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #e1e3ec",fontSize:11}}><span style={{color:"#5a6691"}}>Staff</span><span style={{fontWeight:600}}>{String(b.staff)}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #e1e3ec",fontSize:11}}><span style={{color:"#5a6691"}}>FY Start</span><span style={{fontWeight:600}}>{b.fyStart}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:11}}><span style={{color:"#5a6691"}}>Voucher Prefix</span><span style={{fontWeight:600}}>{b.voucherPrefix}</span></div>
      </div>
    </div>
  );

  return (
    <div style={{padding:"12px 10px",maxWidth:1300,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🏦</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Branch Configuration</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>
              1 HO + 5 branches · 4 countries · 5 currencies · IATA · Banking · Compliance
            </p>
          </div>
        </div>
        <button style={{...btnG,fontSize:11}}><Plus size={13}/> Add Branch</button>
      </div>

      {/* Expiry alert strip */}
      {branches.some(b=>daysLeft(b.travelLicExpiry)&&daysLeft(b.travelLicExpiry)<180)&&(
        <div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:10.5,color:"#854F0B",fontWeight:600,display:"flex",gap:8,flexWrap:"wrap"}}>
          <AlertTriangle size={14}/>
          License renewals needed:
          {branches.filter(b=>daysLeft(b.travelLicExpiry)&&daysLeft(b.travelLicExpiry)<180).map(b=>(
            <span key={b.code} style={{padding:"1px 8px",borderRadius:999,background:"#854F0B",color:"#fff",fontSize:9.5}}>
              {b.code}: Travel Lic ({daysLeft(b.travelLicExpiry)}d)
            </span>
          ))}
          {branches.filter(b=>daysLeft(b.iataAccredExpiry)&&daysLeft(b.iataAccredExpiry)<180).map(b=>(
            <span key={b.code+"_iata"} style={{padding:"1px 8px",borderRadius:999,background:"#A32D2D",color:"#fff",fontSize:9.5}}>
              {b.code}: IATA ({daysLeft(b.iataAccredExpiry)}d)
            </span>
          ))}
        </div>
      )}

      {/* Branch cards grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:10,marginBottom:14}}>
        {branches.map(b=><BranchCard key={b.code} b={b}/>)}
      </div>

      {/* Detail panel */}
      {selBranch&&(
        <div style={{...card,padding:0,overflow:"hidden"}}>
          {/* Detail tabs */}
          <div style={{display:"flex",gap:0,background:"#f3f4f8",borderBottom:"1px solid #e1e3ec",overflowX:"auto"}}>
            <button onClick={()=>setTab("overview")} style={{flex:1,padding:"8px",border:"none",cursor:"pointer",fontWeight:tab==="overview"?700:400,background:tab==="overview"?"#fff":"transparent",borderRadius:6}}>📋 Overview</button><button onClick={()=>setTab("identity")} style={{flex:1,padding:"8px",border:"none",cursor:"pointer",fontWeight:tab==="identity"?700:400,background:tab==="identity"?"#fff":"transparent",borderRadius:6}}>🏢 Identity & Tax</button><button onClick={()=>setTab("compliance")} style={{flex:1,padding:"8px",border:"none",cursor:"pointer",fontWeight:tab==="compliance"?700:400,background:tab==="compliance"?"#fff":"transparent",borderRadius:6}}>📋 Compliance</button><button onClick={()=>setTab("bank")} style={{flex:1,padding:"8px",border:"none",cursor:"pointer",fontWeight:tab==="bank"?700:400,background:tab==="bank"?"#fff":"transparent",borderRadius:6}}>🏦 Bank Details</button>
          </div>

          <div style={{padding:"16px 18px"}}>
            {tab==="overview"&&(
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:16}}>
                <div>
                  <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>📍 Location & Contact</p>
                  {[
                    {l:"Operating Address",v:selBranch.operAddr},
                    {l:"Registered Address",v:selBranch.regAddr},
                    {l:"PIN / ZIP Code",v:selBranch.pin||"—"},
                    {l:"State / Province",v:`${selBranch.state} (Code: ${selBranch.stateCode||"N/A"})`},
                    {l:"Timezone",v:selBranch.timezone},
                    {l:"Phone",v:selBranch.phone},
                    {l:"WhatsApp",v:selBranch.whatsapp||"—"},
                    {l:"Email",v:selBranch.email},
                    {l:"Website",v:selBranch.website||"—"},
                  ].map((r,i)=>(
                    <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid #f3f4f8"}}>
                      <span style={{fontSize:10.5,color:"#5a6691",minWidth:130,flexShrink:0}}>{r.l}</span>
                      <span style={{fontSize:10.5,color:"#0d1326",fontWeight:500}}>{r.v}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>⚙ System & Finance</p>
                  {[
                    {l:"Financial Year Starts",v:selBranch.fyStart},
                    {l:"GST/VAT Filing",v:selBranch.gstFreq},
                    {l:"Intercompany Markup",v:`${selBranch.intercoMarkup}%`},
                    {l:"Cost Centre Code",v:selBranch.costCentre||"—"},
                    {l:"BSP Settlement Day",v:selBranch.bspSettleDay},
                    {l:"Currency",v:`${selBranch.currency} (${selBranch.cur_sym})`},
                    {l:"Authorised Signatory",v:`${selBranch.authSignatory} — ${selBranch.authDesignation}`},
                    {l:"Staff Count",v:String(selBranch.staff)},
                    {l:"Status",v:selBranch.active?"Active ●":"Inactive ●"},
                  ].map((r,i)=>(
                    <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid #f3f4f8"}}>
                      <span style={{fontSize:10.5,color:"#5a6691",minWidth:130,flexShrink:0}}>{r.l}</span>
                      <span style={{fontSize:10.5,color:"#0d1326",fontWeight:500}}>{r.v}</span>
                    </div>
                  ))}
                  <div style={{marginTop:12,display:"flex",gap:8}}>
                    <button style={{...btnG,fontSize:11,flex:1}}>✏ Edit Branch</button>
                    <button style={{...btnGh,fontSize:11}}>🖨 Print Profile</button>
                  </div>
                </div>
              </div>
            )}

            {tab==="identity"&&(
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:16}}>
                <div>
                  <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>🏢 Legal Identity</p>
                  {[
                    {l:"Legal Entity Name",v:selBranch.entity,bold:true},
                    {l:"Country",v:selBranch.country},
                    {l:"State / Province",v:selBranch.state},
                    {l:"State Code",v:selBranch.stateCode||"N/A"},
                    ...(selBranch.tax==="GST"?[
                      {l:"PAN Number",v:selBranch.pan||"—"},
                      {l:"GSTIN",v:selBranch.gstin,bold:true,mono:true},
                      {l:"TAN Number",v:selBranch.tan||"—",mono:true},
                      {l:"GST Filing Frequency",v:selBranch.gstFreq},
                    ]:[
                      {l:"VAT / Tax Number",v:selBranch.gstin,bold:true,mono:true},
                    ]),
                  ].map((r,i)=>(
                    <div key={i} style={{display:"flex",gap:8,padding:"8px 0",borderBottom:"1px solid #f3f4f8"}}>
                      <span style={{fontSize:10.5,color:"#5a6691",minWidth:140,flexShrink:0}}>{r.l}</span>
                      <span style={{fontSize:r.mono?11:10.5,fontFamily:r.mono?"monospace":"inherit",
                        color:"#0d1326",fontWeight:r.bold?700:500}}>{r.v}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>✈ IATA & BSP</p>
                  {[
                    {l:"IATA Agency No.",v:selBranch.iataNo,bold:true,mono:true},
                    {l:"BSP Participant No.",v:selBranch.bspParticipant,mono:true},
                    {l:"BSP Settlement Day",v:selBranch.bspSettleDay},
                    {l:"Authorised Signatory",v:selBranch.authSignatory},
                    {l:"Designation",v:selBranch.authDesignation},
                  ].map((r,i)=>(
                    <div key={i} style={{display:"flex",gap:8,padding:"8px 0",borderBottom:"1px solid #f3f4f8"}}>
                      <span style={{fontSize:10.5,color:"#5a6691",minWidth:140,flexShrink:0}}>{r.l}</span>
                      <span style={{fontSize:r.mono?11:10.5,fontFamily:r.mono?"monospace":"inherit",
                        color:"#0d1326",fontWeight:r.bold?700:500}}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab==="compliance"&&(
              <div>
                <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>📜 Licenses & Accreditation — Expiry Tracker</p>
                <LicenseAlert label="Travel Agency License" expiry={selBranch.travelLicExpiry}/>
                <LicenseAlert label="IATA Accreditation" expiry={selBranch.iataAccredExpiry}/>
                <div style={{...card,background:"#f9fafb",marginTop:12}}>
                  <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#0d1326"}}>License Details</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    {[
                      {l:"Travel Lic. Number",v:selBranch.travelLicNo},
                      {l:"Travel Lic. Expiry",v:selBranch.travelLicExpiry},
                      {l:"IATA Accreditation No.",v:selBranch.iataAccredNo},
                      {l:"IATA Expiry",v:selBranch.iataAccredExpiry},
                    ].map((r,i)=>(
                      <div key={i} style={{padding:"8px 12px",borderRadius:8,background:"#fff",border:"1px solid #e1e3ec"}}>
                        <p style={{margin:0,fontSize:9,color:"#5a6691",textTransform:"uppercase"}}>{r.l}</p>
                        <p style={{margin:"2px 0 0",fontSize:12,fontWeight:700,color:"#0d1326",fontFamily:"monospace"}}>{r.v}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:12,padding:"10px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:10,color:"#854F0B"}}>
                    Set calendar reminders 6 months before expiry. Late renewal may suspend BSP billing rights. Verify with IATA website: agencylist.iata.org
                  </div>
                </div>
              </div>
            )}

            {tab==="banking"&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>🏦 Bank Accounts — {selBranch.code}</p>
                  <button style={{...btnG,fontSize:11,padding:"5px 12px"}}><Plus size={12}/> Add Bank</button>
                </div>
                {selBranch.banks.map((bk,i)=>(
                  <div key={i} style={{...card,marginBottom:10,borderLeft:`4px solid ${bk.primary?"#d4a437":"#e1e3ec"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:18}}>🏦</span>
                        <div>
                          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>{bk.bankName}</p>
                          <p style={{margin:0,fontSize:10,color:"#5a6691"}}>{bk.branch} · {bk.type} Account</p>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        {bk.primary&&<span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,background:"#0d1326",color:"#d4a437",fontWeight:700}}>PRIMARY</span>}
                        <button style={{...btnGh,fontSize:9.5,padding:"2px 8px"}}>Edit</button>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>
                      {[
                        {l:"Account Number",v:bk.acNo,mono:true},
                        {l:"IFSC Code",v:bk.ifsc||"—",mono:true},
                        {l:"SWIFT Code",v:bk.swift||"—",mono:true},
                        {l:"Account Type",v:bk.type},
                      ].map((r,j)=>(
                        <div key={j} style={{padding:"6px 10px",borderRadius:7,background:"#f3f4f8"}}>
                          <p style={{margin:0,fontSize:8.5,color:"#5a6691",textTransform:"uppercase"}}>{r.l}</p>
                          <p style={{margin:"2px 0 0",fontSize:11,fontWeight:700,color:"#0d1326",fontFamily:r.mono?"monospace":"inherit"}}>{r.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{padding:"10px 14px",borderRadius:9,background:"#E6F1FB",border:"1px solid #B5D4F4",fontSize:10,color:"#185FA5",marginTop:8}}>
                  Primary bank account is used for BSP direct debit settlement. Ensure BSP mandate is registered with this account. IFSC code is mandatory for India. SWIFT code is required for international wire transfers (Africa branches).
                </div>
              </div>
            )}

            {tab==="vouchers"&&(
              <div>
                <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>🔢 Voucher Numbering Series — {selBranch.code}</p>
                <div style={{...card,marginBottom:12,background:"#f9fafb",padding:"10px 14px",fontSize:10.5,color:"#5a6691"}}>
                  Format: <b style={{color:"#0d1326",fontFamily:"monospace"}}>{selBranch.code}/DDYY/PREFIX+00001</b>
                  &nbsp;· Example: <b style={{color:"#185FA5",fontFamily:"monospace"}}>BOM/1726/SF00001</b>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:8}}>
                  {[
                    {pre:"SF",  label:"Sales — Flight",       cat:"Sales"},
                    {pre:"SH",  label:"Sales — Holiday",      cat:"Sales"},
                    {pre:"SHT", label:"Sales — Hotel",         cat:"Sales"},
                    {pre:"SC",  label:"Sales — Car",           cat:"Sales"},
                    {pre:"SV",  label:"Sales — Visa",          cat:"Sales"},
                    {pre:"SI",  label:"Sales — Insurance",     cat:"Sales"},
                    {pre:"SM",  label:"Sales — Misc",          cat:"Sales"},
                    {pre:"SPI", label:"Proforma Invoice",       cat:"Sales"},
                    {pre:"SCN", label:"Credit Note",            cat:"Sales"},
                    {pre:"SDN", label:"Debit Note",             cat:"Sales"},
                    {pre:"PF",  label:"Purchase — Flight",     cat:"Purchase"},
                    {pre:"PH",  label:"Purchase — Holiday",    cat:"Purchase"},
                    {pre:"PHT", label:"Purchase — Hotel",      cat:"Purchase"},
                    {pre:"PV",  label:"Purchase — Visa",       cat:"Purchase"},
                    {pre:"PC",  label:"Purchase — Car",        cat:"Purchase"},
                    {pre:"PI",  label:"Purchase — Insurance",  cat:"Purchase"},
                    {pre:"PM",  label:"Purchase — Misc",       cat:"Purchase"},
                    {pre:"RV",  label:"Receipt Voucher",        cat:"Finance"},
                    {pre:"PMT", label:"Payment Voucher",        cat:"Finance"},
                    {pre:"CV",  label:"Contra Voucher",         cat:"Finance"},
                    {pre:"JV",  label:"Journal Voucher",        cat:"Finance"},
                  ].map((v,i)=>{
                    const CAT_CLR={Sales:"#185FA5",Purchase:"#854F0B",Finance:"#27500A"};
                    return (
                      <div key={i} style={{padding:"8px 12px",borderRadius:8,background:"#fff",border:"1px solid #e1e3ec",
                        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <p style={{margin:0,fontSize:9,color:"#5a6691"}}>{v.label}</p>
                          <p style={{margin:"1px 0 0",fontSize:11,fontWeight:700,color:"#0d1326",fontFamily:"monospace"}}>
                            {selBranch.code}/DDYY/<span style={{color:CAT_CLR[v.cat]}}>{selBranch.voucherPrefixes?.[v.pre]||v.pre}</span>00001
                          </p>
                        </div>
                        <span style={{fontSize:9,padding:"2px 7px",borderRadius:999,fontWeight:700,
                          background:(CAT_CLR[v.cat]||"#384677")+"22",color:CAT_CLR[v.cat]||"#384677"}}>{v.cat}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SETTINGS → USERS & ROLES — COMPLETE REBUILD
   Granular permission matrix: every module × every action
   Role templates, per-user overrides, branch access, special toggles
   ════════════════════════════════════════════════════════════════ */

/* ── PERMISSION SCHEMA ────────────────────────────────────────── */

export function SettingsUsers(){
  const usersLive=useUsersAdmin().data;                          // DB-backed (/api/auth/users)
  const [users,setUsers]=useState([]);
  useEffect(()=>{ if(usersLive) setUsers(usersLive); },[usersLive]);
  const [tab,setTab]=useState("users"); // users | roles | matrix
  const [selUser,setSelUser]=useState(null);
  const [selRole,setSelRole]=useState(null);
  const [editPerms,setEditPerms]=useState(null); // {userId, perms, special}
  const [newUserModal,setNewUserModal]=useState(false); useModalEsc(()=>setNewUserModal(false),newUserModal);
  const [newUserForm,setNewUserForm]=useState({name:"",email:"",phone:"",role:"Accounts Executive",branches:["BOM"]});
  const [search,setSearch]=useState("");
  const mob=useMobile();
  const qc=useQueryClient();
  // Role grants come from the DB (Settings → Roles); built into the legacy map shape.
  const ROLE_TEMPLATES=Object.fromEntries((useRoles().data||[]).map(r=>[r.name,r]));
  const createUserMut=useMutation({mutationFn:(b)=>apiPost('/api/auth/users',b),onSuccess:()=>qc.invalidateQueries({queryKey:['ref','users']})});
  const updateUserMut=useMutation({mutationFn:({id,body})=>apiPut(`/api/auth/users/${id}`,body),onSuccess:()=>qc.invalidateQueries({queryKey:['ref','users']})});
  const deleteUserMut=useMutation({mutationFn:(id)=>apiDelete(`/api/auth/users/${id}`),onSuccess:()=>qc.invalidateQueries({queryKey:['ref','users']})});

  const ALL_BRANCHES=BRANCH_CODES;
  const ROLE_NAMES=Object.keys(ROLE_TEMPLATES);
  const ROLE_CLR=Object.fromEntries(Object.entries(ROLE_TEMPLATES).map(([k,v])=>[k,v.color]));
  const ROLE_BG =Object.fromEntries(Object.entries(ROLE_TEMPLATES).map(([k,v])=>[k,v.bg]));

  /* Load permissions for editing */
  const startEdit=(user)=>{
    const tmpl=ROLE_TEMPLATES[user.role]||ROLE_TEMPLATES["Accounts Executive"];
    setEditPerms({
      userId:user.id,
      userName:user.name,
      userRole:user.role,
      perms:JSON.parse(JSON.stringify(tmpl.perms)),
      special:{...tmpl.special},
      branches:[...user.branches],
    });
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
      perms:JSON.parse(JSON.stringify(tmpl.perms)),
      special:{...tmpl.special},
    }));
  };

  const isGroupAllChecked=(grp,action)=>grp.mods.every(m=>editPerms?.perms[m.id]?.[action]);
  const isModAllChecked=(modId)=>ACTIONS.every(a=>editPerms?.perms[modId]?.[a]);

  const filteredUsers=users.filter(u=>!search||u.name.toLowerCase().includes(search.toLowerCase())||u.email.toLowerCase().includes(search.toLowerCase()));

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
            <tr key={u.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:ROLE_BG[u.role]||"#f3f4f8",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,
                    color:ROLE_CLR[u.role]||"#5a6691",flexShrink:0}}>
                    {u.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                  </div>
                  <span style={{fontWeight:600,color:"#0d1326"}}>{u.name}</span>
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
                  {u.branches.includes("ALL")
                    ?<span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#0d1326",color:"#d4a437",fontWeight:700}}>ALL</span>
                    :u.branches.map(b=><span key={b} style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{b}</span>)
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
                  <button onClick={()=>updateUserMut.mutate({id:u.id,body:{active:!u.active}})}
                    style={{...btnGh,padding:"3px 9px",fontSize:9.5,color:u.active?"#A32D2D":"#27500A"}}>
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
                        <tr key={`grp-${gi}`} style={{background:"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
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
                          <tr key={`mod-${mod.id}`} style={{borderBottom:"1px solid #f3f4f8",
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
          <div style={{position:"sticky",bottom:0,background:"#fff",borderTop:"1px solid #e1e3ec",
            padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",
            boxShadow:"0 -4px 12px rgba(0,0,0,0.08)"}}>
            <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>
              Editing permissions for <b>{editPerms.userName}</b> · Role: <b>{editPerms.userRole}</b>
            </p>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setEditPerms(null)} style={btnGh}>Cancel</button>
              <button onClick={()=>{setEditPerms(null);}} style={{...btnG,background:"#27500A"}}>💾 Save Permissions</button>
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
              {SPECIAL_TOGGLES.filter(t=>rDef.special[t.id]).map(t=>(
                <span key={t.id} style={{fontSize:8.5,padding:"2px 6px",borderRadius:999,fontWeight:700,
                  background:({HIGH:"#FCEBEB",MED:"#FAEEDA",LOW:"#EAF3DE"})[t.risk],
                  color:({HIGH:"#A32D2D",MED:"#854F0B",LOW:"#27500A"})[t.risk]}}>{t.label}</span>
              ))}
              {SPECIAL_TOGGLES.filter(t=>rDef.special[t.id]).length===0&&<span style={{fontSize:10,color:"#5a6691"}}>No special permissions</span>}
            </div>
            {/* Module access summary */}
            <p style={{margin:"10px 0 6px",fontSize:9.5,fontWeight:700,color:"#384677",textTransform:"uppercase",letterSpacing:"0.5px"}}>Module Access</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {PERM_MODULES.map(grp=>{
                const hasAny=grp.mods.some(m=>ACTIONS.some(a=>rDef.perms[m.id]?.[a]));
                const hasAll=grp.mods.every(m=>ACTIONS.every(a=>rDef.perms[m.id]?.[a]));
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
          <div style={{padding:"8px 14px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end"}}>
            <button onClick={()=>{setTab("users");}} style={{...btnGh,fontSize:10,padding:"3px 10px"}}>View Users →</button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{padding:"12px 10px",maxWidth:1300,margin:"0 auto"}}>
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
          <button onClick={()=>setTab("users")} style={{flex:1,padding:"8px 12px",border:"none",cursor:"pointer",fontWeight:tab==="users"?700:500,background:tab==="users"?"#fff":"transparent",borderRadius:6}}>👥 Users</button><button onClick={()=>setTab("roles")} style={{flex:1,padding:"8px 12px",border:"none",cursor:"pointer",fontWeight:tab==="roles"?700:500,background:tab==="roles"?"#fff":"transparent",borderRadius:6}}>🎭 Role Templates</button>
        </div>
      </div>

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

      {/* Permission editor overlay */}
      {editPerms&&<PermissionEditor/>}

      {/* New user modal */}
      {newUserModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between"}}>
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
                Role template <b>{newUserForm.role}</b> will be applied. You can customise individual permissions after creation.
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setNewUserModal(false)} style={btnGh}>Cancel</button>
              <button disabled={createUserMut.isPending} onClick={()=>{
                if(!newUserForm.name.trim()||!newUserForm.email.trim()){ toast("Name and email are required","error"); return; }
                createUserMut.mutate({...newUserForm,active:true},{  // persists to /api/auth/users
                  onSuccess:()=>{ setNewUserModal(false); setNewUserForm({name:"",email:"",phone:"",role:"Accounts Executive",branches:["BOM"]}); toast(`User ${newUserForm.name} created`); },
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

export function SettingsAudit(){
  const [search,setSearch]=useState("");
  const [typeFilter,setTypeFilter]=useState("All");
  const [brFilter,setBrFilter]=useState("All");

  const LOGS=[];

  const ACTION_CLR={CREATE:"#27500A",SAVE:"#185FA5",EDIT:"#854F0B",LOGIN:"#384677",LOGOUT:"#5a6691",PRINT:"#1D9E75",DELETE:"#A32D2D"};
  const ACTION_BG= {CREATE:"#EAF3DE",SAVE:"#E6F1FB",EDIT:"#FAEEDA",LOGIN:"#f3f4f8",LOGOUT:"#f3f4f8",PRINT:"#EAF3DE",DELETE:"#FCEBEB"};
  const TYPES=["All","CREATE","EDIT","SAVE","PRINT","LOGIN","LOGOUT","DELETE"];

  const filtered=LOGS.filter(l=>(
    (typeFilter==="All"||l.action===typeFilter)&&
    (brFilter==="All"||l.branch===brFilter)&&
    (!search||l.user.toLowerCase().includes(search.toLowerCase())||
     l.desc.toLowerCase().includes(search.toLowerCase())||
     l.module.toLowerCase().includes(search.toLowerCase()))
  ));

  return (
    <div style={{padding:"12px 10px",maxWidth:1300,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#f3f4f8",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📋</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Audit Log</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>All user activity · May 2026</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
            style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <select value={brFilter} onChange={e=>setBrFilter(e.target.value)}
            style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {["All",...BRANCH_CODES].map(b=><option key={b}>{b}</option>)}
          </select>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search user, module, action..."
            style={{...inp,width:220,minHeight:32,fontSize:11}}/>
        </div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Timestamp","User","Branch","Action","Module","Description","IP"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:"left",
                color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((l,i)=>(
            <tr key={l.id} style={{borderBottom:"1px solid #f3f4f8",
              background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10.5,
                color:"#5a6691",whiteSpace:"nowrap"}}>{l.ts}</td>
              <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{l.user}</td>
              <td style={{padding:"8px 12px"}}>
                <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:700,
                  background:"#E6F1FB",color:"#185FA5"}}>{l.branch}</span>
              </td>
              <td style={{padding:"8px 12px"}}>
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,
                  background:ACTION_BG[l.action]||"#f3f4f8",
                  color:ACTION_CLR[l.action]||"#384677"}}>{l.action}</span>
              </td>
              <td style={{padding:"8px 12px",color:"#384677",fontSize:11}}>{l.module}</td>
              <td style={{padding:"8px 12px",color:"#5a6691",maxWidth:280,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                fontSize:11}}>{l.desc}</td>
              <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10,
                color:"#bfc3d6"}}>{l.ip}</td>
            </tr>
          ))}</tbody>
        </table>
        {filtered.length===0&&(
          <div style={{padding:"32px",textAlign:"center",color:"#5a6691"}}>
            No log entries match your filter.
          </div>
        )}
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   NEW MODULES — Proforma, Debit Note, Cancellation, Refunds,
   Sub-agents, Forex, Commission, CRM, Itinerary, Recurring JV,
   BSP Recon, Vendor Due, Global Search, Notifications
   ════════════════════════════════════════════════════════════════ */

/* ── Sub-agents master data ─── */

export function ApiKeySettings(){
  const [keys,setKeys]=useState([
    {id:1,name:"Amadeus GDS",service:"Amadeus",key:"AMAD-XXXX-XXXX-XXXX",secret:"••••••••",env:"Production",status:"Active",lastTest:"2026-05-15 09:00"},
    {id:2,name:"WhatsApp Business API",service:"WhatsApp",key:"WABA-XXXX-XXXX-XXXX",secret:"••••••••",env:"Production",status:"Active",lastTest:"2026-05-19 08:30"},
    {id:3,name:"BSP Link India",service:"IATA BSP",key:"BSP-IN-XXXXXXXXXX",secret:"••••••••",env:"Production",status:"Active",lastTest:"2026-05-18 17:00"},
    {id:4,name:"SMTP Email (Travkings)",service:"Email",key:"smtp.travkings.com",secret:"••••••••",env:"Production",status:"Active",lastTest:"2026-05-19 07:00"},
    {id:5,name:"IRP E-Invoice API",service:"GSTN IRP",key:"IRP-XXXX-XXXX-XXXX",secret:"••••••••",env:"Sandbox",status:"Testing",lastTest:"2026-05-10"},
  ]);
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const SVC_ICONS={Amadeus:"✈",WhatsApp:"💬","IATA BSP":"📋",Email:"📧","GSTN IRP":"🏛",Custom:"⚙"};
  const STATUS_CLR={Active:"#27500A",Testing:"#854F0B",Inactive:"#A32D2D"};
  const STATUS_BG ={Active:"#EAF3DE",Testing:"#FAEEDA",Inactive:"#FCEBEB"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1000,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#f3f4f8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔑</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>API Key Management</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{keys.length} integrations · GDS · WhatsApp · BSP · GSTN · Email</p>
          </div>
        </div>
        <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Add Integration</button>
      </div>

      <div style={{...card,marginBottom:12,background:"#FAEEDA",border:"1px solid #FAC775",padding:"10px 14px",fontSize:10.5,color:"#854F0B"}}>
        🔒 API keys are stored encrypted. Never share keys externally. Rotate keys every 90 days. Super Admin access only.
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {keys.map((k,i)=>(
          <div key={k.id} style={{...card,padding:"12px 16px",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{width:40,height:40,borderRadius:10,background:"#f3f4f8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
              {SVC_ICONS[k.service]||"🔑"}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                <span style={{fontWeight:700,fontSize:12,color:"#0d1326"}}>{k.name}</span>
                <span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:STATUS_BG[k.status],color:STATUS_CLR[k.status]}}>{k.status}</span>
                <span style={{fontSize:9,padding:"1px 6px",borderRadius:999,background:k.env==="Production"?"#0d1326":"#f3f4f8",color:k.env==="Production"?"#d4a437":"#5a6691"}}>{k.env}</span>
              </div>
              <div style={{display:"flex",gap:16,fontSize:10.5,color:"#5a6691",flexWrap:"wrap"}}>
                <span style={{fontFamily:"monospace"}}>{k.key}</span>
                <span>Secret: {k.secret}</span>
                <span>Last tested: {k.lastTest}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button style={{...btnG,padding:"4px 10px",fontSize:9.5,background:"#185FA5"}}>🔧 Test</button>
              <button style={{...btnGh,padding:"4px 10px",fontSize:9.5}}>🔄 Rotate</button>
              <button onClick={()=>setKeys(ks=>ks.map(x=>x.id===k.id?{...x,status:x.status==="Active"?"Inactive":"Active"}:x))} style={{...btnGh,padding:"4px 10px",fontSize:9.5,color:k.status==="Active"?"#A32D2D":"#27500A"}}>{k.status==="Active"?"Disable":"Enable"}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── RECRUITMENT MODULE ───────────────────────────────────────── */

export function ApprovalWorkflow({branch,setRoute}){
  const mob=useMobile();
  const APPROVAL_RULES=useApprovalRules().data||[];   // DB-backed (/api/approval-rules)
  const active=APPROVAL_RULES.filter(r=>r.active).length;
  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>✅ Approval Workflow Configuration</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>Maker–Checker rules · Threshold-based approval routing · Segregation of duties</p>
        </div>
        <button onClick={()=>setRoute&&setRoute("/approvals")} style={{padding:"7px 14px",border:"1px solid #185FA5",background:"#fff",color:"#185FA5",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer"}}>📋 Pending Approvals Queue</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Active Rules</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{active}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Voucher Types</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{new Set(APPROVAL_RULES.map(r=>r.voucherType)).size}</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Approvers</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{new Set(APPROVAL_RULES.map(r=>r.approver)).size}</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Avg SLA</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>16h</p></div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Rule ID</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Voucher Type</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Condition / Trigger</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Primary Approver</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Backup</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>SLA</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Status</th>
            </tr></thead>
            <tbody>
              {APPROVAL_RULES.map((r,i)=>(
                <tr key={r.id} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{r.id}</td>
                  <td style={{padding:"7px 8px",fontWeight:600}}>{r.voucherType}</td>
                  <td style={{padding:"7px 8px",fontSize:10.5}}>{r.condition}</td>
                  <td style={{padding:"7px 8px",fontWeight:600,color:"#185FA5"}}>{r.approver}</td>
                  <td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>{r.backup}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10,fontWeight:600,color:"#854F0B"}}>{r.sla}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:r.active?"#EAF3DE":"#f3f4f8",color:r.active?"#27500A":"#5a6691"}}>{r.active?"Active":"Inactive"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


export function GspIrpSettings({branch,setRoute}){
  const mob=useMobile();
  const GSP_STATS=[
    {label:"E-Invoices Generated (May 2026)",value:"1,847",sub:"Out of 1,924 eligible"},
    {label:"Success Rate",value:"96.0%",sub:"77 failures · review needed"},
    {label:"Avg Generation Time",value:"1.8 sec",sub:"GSP latency"},
    {label:"IRN Cancellations",value:"12",sub:"Within 24 hours · valid"},
  ];
  const FAILURES=[
    {invoice:"INV-BOM-2026-1842",date:"2026-05-18",amount:285000,error:"Recipient GSTIN inactive",action:"Update GSTIN"},
    {invoice:"INV-BOM-2026-1856",date:"2026-05-18",amount:48000,error:"HSN code 998551 needs 6-digit",action:"Edit & retry"},
    {invoice:"INV-AMD-2026-0498",date:"2026-05-19",amount:18500,error:"Place of supply mismatch",action:"Correct POS"},
    {invoice:"INV-BOM-2026-1898",date:"2026-05-19",amount:125000,error:"Item rate exceeds 2 decimal",action:"Round to 2dp"},
  ];
  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1300,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>📤 GSP / IRP Direct E-Invoice Integration</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>NIC IRP via GST Suvidha Provider · Bulk e-invoice generation · Auto-IRN &amp; QR</p>
        </div>
        <span style={{padding:"4px 12px",background:"#EAF3DE",color:"#27500A",borderRadius:14,fontSize:11,fontWeight:700}}>● Connected — TaxClue GSP</span>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {GSP_STATS.map((s,i)=>(
          <div key={i} style={{...card,borderTop:"3px solid "+["#185FA5","#27500A","#854F0B","#A32D2D"][i]}}>
            <p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>{s.label}</p>
            <p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:["#185FA5","#27500A","#854F0B","#A32D2D"][i]}}>{s.value}</p>
            <p style={{margin:0,fontSize:10,color:"#5a6691"}}>{s.sub}</p>
          </div>
        ))}
      </div>

      <h3 style={{margin:"8px 0 6px",fontSize:13,color:"#0d1326"}}>Configuration</h3>
      <div style={{...card,marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(2,1fr)",gap:12}}>
          <div><p style={{margin:"0 0 3px",fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>GSP Provider</p><p style={{margin:0,fontSize:13,fontWeight:600}}>TaxClue Tax Solutions</p></div>
          <div><p style={{margin:"0 0 3px",fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>API Endpoint</p><p style={{margin:0,fontSize:11,fontFamily:"monospace",color:"#185FA5"}}>https://api.taxclue.in/v1.03/invoice</p></div>
          <div><p style={{margin:"0 0 3px",fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Auto-Generate</p><p style={{margin:0,fontSize:13,fontWeight:600,color:"#27500A"}}>✓ On invoice save (B2B &amp; Export)</p></div>
          <div><p style={{margin:"0 0 3px",fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Threshold</p><p style={{margin:0,fontSize:13,fontWeight:600}}>All B2B invoices (turnover &gt; ₹5 cr)</p></div>
        </div>
      </div>

      <h3 style={{margin:"8px 0 6px",fontSize:13,color:"#0d1326"}}>Recent Failures — Review &amp; Retry</h3>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Invoice</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Date</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Amount</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Error</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Action Required</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Retry</th>
            </tr></thead>
            <tbody>
              {FAILURES.map((f,i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{f.invoice}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{f.date}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600}}>₹{fmt(f.amount)}</td>
                  <td style={{padding:"7px 8px",color:"#A32D2D",fontSize:10.5,fontWeight:600}}>{f.error}</td>
                  <td style={{padding:"7px 8px",fontSize:10,color:"#854F0B"}}>{f.action}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><button style={{padding:"3px 10px",border:"none",background:"#d4a437",color:"#0d1326",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer"}}>Retry</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



/* ════════════════════════════════════════════════════════════════════
   7 NEW MASTERS — Tier-A
   To be inserted before `export default function KB360App` in KBiz360_v2.jsx
   ════════════════════════════════════════════════════════════════════ */

/* ─── Seed data ──────────────────────────────────────────────────── */


export function DocTemplateEditor(){
  const [selDoc,setSelDoc]=useState("Tax Invoice");
  const [header,setHeader]=useState("Travkings Tours & Travels Pvt. Ltd.");
  const [footer,setFooter]=useState("Subject to Mumbai Jurisdiction · Powered by KBiz360 — The Business Engine");
  const [showLogo,setShowLogo]=useState(true);
  const [showGST,setShowGST]=useState(true);
  const [color,setColor]=useState("#0d1326");
  const docs=["Tax Invoice","Payment Voucher","Receipt Voucher","Credit Note","Quotation","Hotel Voucher","Transfer Voucher","Visa Cover Letter"];
  return(
    <PHASE2_Page title="Document Template Editor" subtitle="Customise invoice and voucher layouts · header · footer · logo · colours · font"
      toolbar={<><select value={selDoc} onChange={e=>setSelDoc(e.target.value)} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,background:"#fff"}}>{docs.map(d=><option key={d}>{d}</option>)}</select><button style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>💾 Save Template</button><button style={{padding:"7px 12px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>Reset to Default</button></>}>
      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:14}}>
        {/* Controls */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={cardStyle}>
            <p style={{margin:"0 0 12px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Layout Options</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[{l:"Show Company Logo",state:showLogo,set:setShowLogo},{l:"Show GST/Tax Info",state:showGST,set:setShowGST},{l:"Show QR Code",state:false,set:()=>{}},{l:"Show Signature Box",state:true,set:()=>{}}].map(o=>(
                <label key={o.l} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12}}>
                  <input type="checkbox" checked={o.state} onChange={e=>o.set(e.target.checked)}/>
                  <span>{o.l}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Header</p>
            <textarea value={header} onChange={e=>setHeader(e.target.value)} rows={3} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%",fontFamily:"inherit",resize:"none"}}/>
          </div>
          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Footer</p>
            <textarea value={footer} onChange={e=>setFooter(e.target.value)} rows={2} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%",fontFamily:"inherit",resize:"none"}}/>
          </div>
          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Brand Color</p>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{width:40,height:34,border:"1px solid #e1e3ec",borderRadius:4,cursor:"pointer",padding:2}}/>
              <input value={color} onChange={e=>setColor(e.target.value)} style={{flex:1,padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,fontFamily:"monospace"}}/>
            </div>
            <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
              {["#0d1326","#d4a437","#A32D2D","#2F7A8E","#22c55e","#3b82f6"].map(c=>(
                <div key={c} onClick={()=>setColor(c)} style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",border:color===c?"2px solid #fff":"none",boxShadow:color===c?"0 0 0 2px "+c:"none"}}/>
              ))}
            </div>
          </div>
        </div>
        {/* Live preview */}
        <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
          <div style={{padding:"8px 14px",background:"#fafbfd",borderBottom:"1px solid #e1e3ec",fontSize:11,color:"#5a6691"}}>Live Preview — {selDoc}</div>
          <div style={{padding:20}}>
            <div style={{border:"1px solid #e1e3ec",borderRadius:4,overflow:"hidden"}}>
              {/* Header */}
              <div style={{padding:"14px 18px",background:color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  {showLogo&&<div style={{width:40,height:40,background:"rgba(255,255,255,0.2)",borderRadius:4,marginBottom:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"rgba(255,255,255,0.6)"}}>LOGO</div>}
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:"#fff"}}>{header.split("\n")[0]}</p>
                  {showGST&&<p style={{margin:"2px 0 0",fontSize:9.5,color:"rgba(255,255,255,0.7)"}}>GST: 27AAACT1234A1ZF · TAN: MUMA12345B · IATA Accredited</p>}
                </div>
                <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:15,fontWeight:700,color:"#d4a437"}}>{selDoc.toUpperCase()}</p><p style={{margin:"2px 0 0",fontSize:10,color:"rgba(255,255,255,0.7)"}}>INV-BOM/2026/8742</p></div>
              </div>
              {/* Body placeholder */}
              <div style={{padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{fontSize:11}}><p style={{margin:0,fontWeight:700}}>Bill To: —</p><p style={{margin:0,color:"#5a6691"}}>GSTIN: 27AAACL0140P1ZW</p></div>
                  <div style={{fontSize:11,textAlign:"right"}}><p style={{margin:0}}>Date: 20 May 2026</p><p style={{margin:0}}>Due: 04 Jul 2026</p></div>
                </div>
                <div style={{height:60,background:"#f7f8fb",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10}}>
                  <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>Line items table</p>
                </div>
                <div style={{display:"flex",justifyContent:"flex-end",fontSize:12,fontWeight:700,color:color}}>Total: ₹4,85,000</div>
              </div>
              {/* Footer */}
              <div style={{padding:"8px 14px",background:"#f7f8fb",borderTop:"1px solid #e1e3ec",fontSize:9.5,color:"#5a6691",textAlign:"center"}}>{footer}</div>
            </div>
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   15. EMAIL / SMS TEMPLATE EDITOR
   ════════════════════════════════════════════════════════════════════ */

export function EmailSMSTemplates(){
  const [sel,setSel]=useState(0);
  const [editBody,setEditBody]=useState(EMAIL_TEMPLATES_DATA[0].body);
  const t=EMAIL_TEMPLATES_DATA[sel];
  const tokens=["{CustomerName}","{BookingRef}","{TripName}","{Amount}","{DueDate}","{VoucherNo}","{ConsultantName}","{BranchPhone}","{InvoiceNo}","{Date}"];
  return(
    <PHASE2_Page title="Email / SMS Template Editor" subtitle="Customise communication templates · token substitution · channel-specific"
      toolbar={<><button style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>💾 Save Template</button><button style={{padding:"7px 12px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>Send Test</button></>}>
      <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:14}}>
        {/* Template list */}
        <div style={cardStyle}>
          <p style={{margin:"0 0 10px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Templates ({EMAIL_TEMPLATES_DATA.length})</p>
          {EMAIL_TEMPLATES_DATA.map((tmpl,i)=>(
            <div key={tmpl.id} onClick={()=>{setSel(i);setEditBody(tmpl.body);}} style={{padding:"9px 10px",border:sel===i?"2px solid #d4a437":"1px solid #e1e3ec",borderRadius:6,marginBottom:6,cursor:"pointer",background:sel===i?"#fff8e8":"#fff"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <p style={{margin:0,fontSize:11.5,fontWeight:700,color:"#0d1326"}}>{tmpl.name}</p>
                <span style={{padding:"1px 6px",background:tmpl.channel==="SMS"?"#fff3cd":"#cfe2ff",color:tmpl.channel==="SMS"?"#856404":"#004085",borderRadius:3,fontSize:9.5,fontWeight:700}}>{tmpl.channel}</span>
              </div>
              <p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691"}}>{tmpl.trigger}</p>
            </div>
          ))}
          <button style={{width:"100%",padding:"7px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer",marginTop:6}}>+ New Template</button>
        </div>
        {/* Editor */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={cardStyle}>
            <p style={{margin:"0 0 12px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Edit — {t.name}</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
              <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Trigger</label><input defaultValue={t.trigger} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%"}}/></div>
              <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Channel</label><select defaultValue={t.channel} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%"}}><option>Email</option><option>SMS</option><option>Both</option></select></div>
              <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Status</label><select defaultValue={t.active?"Active":"Inactive"} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%"}}><option>Active</option><option>Inactive</option></select></div>
            </div>
            {t.channel==="Email"&&<div style={{marginBottom:10}}><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Subject</label><input defaultValue={t.subject} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%"}}/></div>}
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Body {t.channel==="SMS"&&<span style={{fontWeight:400,color:"#5a6691"}}>({editBody.length}/160 chars)</span>}</label><textarea value={editBody} onChange={e=>setEditBody(e.target.value)} rows={8} style={{padding:"8px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%",fontFamily:"monospace",resize:"vertical"}}/></div>
          </div>
          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Available Tokens</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {tokens.map(tok=>(
                <button key={tok} onClick={()=>setEditBody(b=>b+tok)} style={{padding:"4px 9px",background:"#e6e8f1",border:"none",borderRadius:4,fontSize:11,fontFamily:"monospace",cursor:"pointer",color:"#0d1326",fontWeight:600}}>{tok}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   16. APPROVAL MATRIX BUILDER
   ════════════════════════════════════════════════════════════════════ */

export function ApprovalMatrixBuilder(){
  const [rules,setRules]=useState(APPROVAL_LIMITS_DATA);
  const [form,setForm]=useState({role:"Accounts Executive",voucherType:"Payment Voucher",minAmount:0,maxAmount:50000,backup:"Sr. Accounts Executive"});
  const groupByType={};
  rules.forEach(r=>{if(!groupByType[r.voucherType])groupByType[r.voucherType]=[];groupByType[r.voucherType].push(r);});
  const fmt=n=>n>=999999999?"Unlimited":"₹"+n.toLocaleString("en-IN");
  const inp={padding:"7px 8px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:11.5,width:"100%"};
  return(
    <PHASE2_Page title="Approval Matrix Builder" subtitle="Drag-and-configure per-role, per-voucher-type thresholds · changes take effect immediately"
      toolbar={<button style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>💾 Save & Publish</button>}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14}}>
        <div>
          {Object.entries(groupByType).map(([type,typeRules])=>(
            <div key={type} style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden",marginBottom:12}}>
              <div style={{padding:"9px 14px",background:"#0d1326",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <p style={{margin:0,fontSize:12.5,fontWeight:700}}>{type}</p>
                <button onClick={()=>setRules(r=>r.filter(x=>x.voucherType!==type||x.id!==typeRules[typeRules.length-1].id))} style={{padding:"2px 8px",background:"transparent",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",borderRadius:3,fontSize:10,cursor:"pointer"}}>Remove last tier</button>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
                <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Approver Role</th><th style={{...RPT_thStyle,textAlign:"right"}}>From (₹)</th><th style={{...RPT_thStyle,textAlign:"right"}}>To (₹)</th><th style={RPT_thStyle}>Backup</th><th style={{...RPT_thStyle,textAlign:"center"}}>↕</th></tr></thead>
                <tbody>{typeRules.map((r,i)=>(<tr key={r.id} style={{borderBottom:"1px solid #f0f2f7"}}>
                  <td style={RPT_tdStyle}><select defaultValue={r.role} style={{...inp,width:"auto"}}><option>Accounts Executive</option><option>Sr. Accounts Executive</option><option>Senior Finance Manager</option><option>Director</option></select></td>
                  <td style={{padding:"6px 12px",borderBottom:"1px solid #f0f2f7"}}><input type="number" defaultValue={r.minAmount} style={{...inp,textAlign:"right",fontFamily:"monospace",width:100}}/></td>
                  <td style={{padding:"6px 12px",borderBottom:"1px solid #f0f2f7"}}><input type="number" defaultValue={r.maxAmount<999999999?r.maxAmount:""} placeholder="Unlimited" style={{...inp,textAlign:"right",fontFamily:"monospace",width:100}}/></td>
                  <td style={RPT_tdStyle}><input defaultValue={r.backup} style={{...inp,width:"auto"}}/></td>
                  <td style={{padding:"6px 12px",textAlign:"center",borderBottom:"1px solid #f0f2f7"}}>
                    <div style={{display:"flex",gap:2,justifyContent:"center"}}>
                      {i>0&&<button style={{padding:"2px 6px",background:"#f7f8fb",border:"1px solid #e1e3ec",borderRadius:2,cursor:"pointer",fontSize:11}}>▲</button>}
                      {i<typeRules.length-1&&<button style={{padding:"2px 6px",background:"#f7f8fb",border:"1px solid #e1e3ec",borderRadius:2,cursor:"pointer",fontSize:11}}>▼</button>}
                    </div>
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
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Voucher Type</label><select value={form.voucherType} onChange={e=>setForm(f=>({...f,voucherType:e.target.value}))} style={inp}><option>Payment Voucher</option><option>Journal Voucher</option><option>Credit Note</option><option>Cash Refund</option><option>Forex Trade</option><option>Period Lock</option></select></div>
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

/* ════════════════════════════════════════════════════════════════════
   17. CUSTOM FIELDS MANAGER
   ════════════════════════════════════════════════════════════════════ */

export function CustomFieldsManager(){
  const [master,setMaster]=useState("ALL");
  const masters=["ALL","Customer","Supplier","Employee"];
  const filtered=master==="ALL"?CUSTOM_FIELDS_DATA:CUSTOM_FIELDS_DATA.filter(f=>f.master===master);
  return(
    <PHASE2_Page title="Custom Fields Manager" subtitle="Add fields to any master without code changes · applies across all branches"
      toolbar={<><select value={master} onChange={e=>setMaster(e.target.value)} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,background:"#fff"}}>{masters.map(m=><option key={m}>{m}</option>)}</select><button style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Add Field</button></>}>
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Master</th><th style={RPT_thStyle}>Field Label</th><th style={RPT_thStyle}>Type</th><th style={RPT_thStyle}>Options / Format</th><th style={{...RPT_thStyle,textAlign:"center"}}>Required</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th><th style={{...RPT_thStyle,textAlign:"center"}}>Action</th></tr></thead>
          <tbody>{filtered.map(f=>(
            <tr key={f.id} style={{borderBottom:"1px solid #f0f2f7"}}>
              <td style={RPT_tdStyle}><span style={{padding:"2px 7px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{f.master}</span></td>
              <td style={{...RPT_tdStyle,fontWeight:700}}>{f.label}</td>
              <td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:"#fafbfd",border:"1px solid #e1e3ec",borderRadius:3,fontSize:11}}>{f.type}</span></td>
              <td style={{...RPT_tdStyle,color:"#5a6691",fontSize:11}}>{f.options||"—"}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}>{f.required?<span style={{color:"#A32D2D",fontWeight:700}}>Yes</span>:"—"}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:700,background:f.active?"#d4edda":"#e2e3e5",color:f.active?"#155724":"#383d41"}}>{f.active?"Active":"Inactive"}</span></td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}>
                <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                  <button style={{padding:"3px 8px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>Edit</button>
                  <button style={{padding:"3px 8px",background:"transparent",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:3,fontSize:10,cursor:"pointer"}}>↕</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   18. FIELD-LEVEL ACCESS CONTROL
   ════════════════════════════════════════════════════════════════════ */

export function FieldAccessControl(){
  const accessColor={"View+Edit":"#22c55e","View Only":"#d4a437","Hidden":"#A32D2D"};
  const PERM_ROLES=(useRoles().data||[]).map(r=>r.name);   // DB-backed role names
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
              {FIELD_ACCESS_DATA.map((row,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #f0f2f7"}}>
                  <td style={{...RPT_tdStyle,fontWeight:700}}>{row.field}</td>
                  <td style={{...RPT_tdStyle,color:"#5a6691"}}>{row.module}</td>
                  {PERM_ROLES.map(r=>{
                    const access=row.roles[r]||"Hidden";
                    return(
                      <td key={r} style={{padding:"6px 12px",textAlign:"center",borderBottom:"1px solid #f0f2f7"}}>
                        <select defaultValue={access} style={{padding:"3px 6px",border:"1px solid "+(accessColor[access]||"#e1e3ec"),borderRadius:4,fontSize:10.5,background:"#fff",color:accessColor[access]||"#5a6691",fontWeight:700,cursor:"pointer"}}>
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
        <div style={{marginTop:12,display:"flex",justifyContent:"flex-end"}}>
          <button style={{padding:"8px 18px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>💾 Save Access Rules</button>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   19. BULK USER OPERATIONS
   ════════════════════════════════════════════════════════════════════ */

export function BulkUserOperations(){
  const [selected,setSelected]=useState({});
  const _USERS_DATA=useUsersAdmin().data||[];   // DB-backed (/api/auth/users)
  const toggle=id=>setSelected(s=>({...s,[id]:!s[id]}));
  const allSelected=_USERS_DATA.every(u=>selected[u.id]);
  const toggleAll=()=>{if(allSelected)setSelected({});else setSelected(Object.fromEntries(_USERS_DATA.map(u=>[u.id,true])));};
  const selCount=Object.values(selected).filter(Boolean).length;
  return(
    <PHASE2_Page title="Bulk User Operations" subtitle="Select multiple users · apply role change · reset password · activate / deactivate">
      {/* Action bar */}
      <div style={{padding:"10px 14px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,marginBottom:12,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <span style={{fontSize:12,fontWeight:700,color:"#0d1326"}}>{selCount} user{selCount!==1?"s":""} selected</span>
        <div style={{flex:1}}/>
        {[{l:"Change Role",c:"#0d1326",t:"#d4a437"},{l:"Activate",c:"#22c55e",t:"#fff"},{l:"Deactivate",c:"#f97316",t:"#fff"},{l:"Reset Password",c:"#3b82f6",t:"#fff"},{l:"Change Branch",c:"#6B4C8B",t:"#fff"}].map(btn=>(
          <button key={btn.l} style={{padding:"7px 14px",background:selCount>0?btn.c:"#e1e3ec",color:selCount>0?btn.t:"#5a6691",border:"none",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:selCount>0?"pointer":"not-allowed"}}>{btn.l}</button>
        ))}
      </div>
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#f7f8fb"}}>
            <th style={{...RPT_thStyle,width:36}}><input type="checkbox" checked={allSelected} onChange={toggleAll}/></th>
            <th style={RPT_thStyle}>User</th><th style={RPT_thStyle}>Email</th><th style={RPT_thStyle}>Role</th><th style={RPT_thStyle}>Branches</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th><th style={RPT_thStyle}>Last Login</th>
          </tr></thead>
          <tbody>{_USERS_DATA.map(u=>(
            <tr key={u.id} style={{borderBottom:"1px solid #f0f2f7",background:selected[u.id]?"#fff8e8":"#fff"}}>
              <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f2f7"}}><input type="checkbox" checked={!!selected[u.id]} onChange={()=>toggle(u.id)}/></td>
              <td style={RPT_tdStyle}><p style={{margin:0,fontWeight:700}}>{u.name}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{u.id}</p></td>
              <td style={{...RPT_tdStyle,fontSize:11,color:"#5a6691"}}>{u.email}</td>
              <td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:"#e6e8f1",borderRadius:3,fontSize:10.5,fontWeight:600}}>{u.role}</span></td>
              <td style={{...RPT_tdStyle,fontSize:11}}>{Array.isArray(u.branches)?u.branches.join(", "):u.branches}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:700,background:u.active?"#d4edda":"#f8d7da",color:u.active?"#155724":"#721c24"}}>{u.active?"Active":"Inactive"}</span></td>
              <td style={{...RPT_tdStyle,fontSize:11,color:"#5a6691"}}>2026-05-{10+u.id}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   20. PERMISSIONS MATRIX (role × module × action)
   ════════════════════════════════════════════════════════════════════ */

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
      toolbar={<div style={{display:"flex",gap:6}}>{PERM_ROLES.map(r=><button key={r} onClick={()=>setSelRole(r)} style={{padding:"5px 12px",border:selRole===r?"2px solid #0d1326":"1px solid #e1e3ec",background:selRole===r?"#0d1326":"#fff",color:selRole===r?"#d4a437":"#5a6691",borderRadius:5,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{r}</button>)}</div>}>
      <div style={cardStyle}>
        <p style={{margin:"0 0 12px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Permissions for: <span style={{color:"#d4a437"}}>{selRole}</span></p>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#f7f8fb"}}>
              <th style={{...RPT_thStyle,minWidth:150}}>Module</th>
              {PERM_ACTIONS.map(a=><th key={a} style={{...RPT_thStyle,textAlign:"center",minWidth:70}}>{a}</th>)}
            </tr></thead>
            <tbody>{PERM_MODULES_P2.map(mod=>(
              <tr key={mod} style={{borderBottom:"1px solid #f0f2f7"}}>
                <td style={{...RPT_tdStyle,fontWeight:700}}>{mod}</td>
                {PERM_ACTIONS.map(action=>{
                  const ok=hasAccess(selRole,mod,action);
                  return(
                    <td key={action} style={{padding:"8px",textAlign:"center",borderBottom:"1px solid #f0f2f7",cursor:"pointer"}}
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

/* ════════════════════════════════════════════════════════════════════
   21. BRANDING SETTINGS
   ════════════════════════════════════════════════════════════════════ */

export function BrandingSettings(){
  const [brand,setBrand]=useState({companyName:"Travkings Tours & Travels Pvt. Ltd.",tagline:"Your Journey, Our Passion",primaryEmail:"accounts@travkings.com",supportPhone:"+91 22 6654 8800",primaryColor:"#0d1326",accentColor:"#d4a437",website:"www.travkings.com"});
  const upd=k=>e=>setBrand(b=>({...b,[k]:e.target.value}));
  const inp={padding:"8px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12.5,width:"100%"};
  return(
    <PHASE2_Page title="Branding Settings" subtitle="Logo · brand colours · company name · contact details · used across all documents and emails"
      toolbar={<button style={{padding:"8px 18px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>💾 Save Branding</button>}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={cardStyle}>
            <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Company Identity</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[{l:"Company Name",k:"companyName"},{l:"Tagline",k:"tagline"},{l:"Primary Email",k:"primaryEmail"},{l:"Support Phone",k:"supportPhone"},{l:"Website",k:"website"}].map(f=>(
                <div key={f.k}><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:3}}>{f.l}</label><input value={brand[f.k]} onChange={upd(f.k)} style={inp}/></div>
              ))}
            </div>
          </div>
          <div style={cardStyle}>
            <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Brand Colours</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[{l:"Primary (Navy)",k:"primaryColor"},{l:"Accent (Gold)",k:"accentColor"}].map(c=>(
                <div key={c.k}>
                  <label style={{fontSize:11,color:"#5a6691",fontWeight:700,display:"block",marginBottom:4}}>{c.l}</label>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input type="color" value={brand[c.k]} onChange={upd(c.k)} style={{width:44,height:38,border:"1px solid #e1e3ec",borderRadius:4,cursor:"pointer",padding:3}}/>
                    <input value={brand[c.k]} onChange={upd(c.k)} style={{...inp,fontFamily:"monospace",width:100}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={cardStyle}>
            <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Logo Upload</p>
            <div style={{padding:20,border:"2px dashed #cbd0dc",borderRadius:6,textAlign:"center"}}>
              <div style={{width:80,height:80,background:brand.primaryColor,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",color:brand.accentColor,fontSize:22,fontWeight:700}}>TK</div>
              <p style={{margin:"0 0 8px",fontSize:12,color:"#5a6691"}}>Current logo placeholder</p>
              <button style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>📤 Upload Logo (PNG/SVG)</button>
              <p style={{margin:"6px 0 0",fontSize:10,color:"#5a6691"}}>Recommended: 300×80px · transparent background</p>
            </div>
          </div>
        </div>
        {/* Live preview */}
        <div style={cardStyle}>
          <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Live Preview</p>
          <div style={{border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden",marginBottom:12}}>
            {/* Header bar */}
            <div style={{padding:"12px 16px",background:brand.primaryColor,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,background:brand.accentColor,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:brand.primaryColor}}>TK</div>
                <div><p style={{margin:0,fontSize:13,fontWeight:700,color:"#fff"}}>{brand.companyName.split(" ").slice(0,1).join(" ")}</p><p style={{margin:0,fontSize:9,color:brand.accentColor}}>{brand.tagline}</p></div>
              </div>
              <span style={{fontSize:10,color:brand.accentColor,fontWeight:700}}>KBiz360</span>
            </div>
            {/* Sample invoice header */}
            <div style={{padding:"14px 16px",borderBottom:"2px solid "+brand.primaryColor,display:"flex",justifyContent:"space-between"}}>
              <div><p style={{margin:0,fontSize:14,fontWeight:700,color:brand.primaryColor}}>{brand.companyName}</p><p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{brand.tagline} · {brand.website}</p></div>
              <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:13,fontWeight:700,color:brand.accentColor}}>TAX INVOICE</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>INV-BOM/2026/8742</p></div>
            </div>
            <div style={{padding:"10px 16px",background:"#fafbfd",display:"flex",justifyContent:"space-between",fontSize:10.5,color:"#5a6691"}}>
              <span>{brand.primaryEmail}</span><span>{brand.supportPhone}</span>
            </div>
          </div>
          {/* Email preview */}
          <div style={{border:"1px solid #e1e3ec",borderRadius:6,overflow:"hidden"}}>
            <div style={{padding:"8px 12px",background:brand.primaryColor,textAlign:"center"}}>
              <p style={{margin:0,fontSize:11,color:brand.accentColor,fontWeight:700}}>Email Header</p>
            </div>
            <div style={{padding:12,textAlign:"center",fontSize:11,color:"#5a6691"}}>
              <div style={{width:48,height:48,background:brand.primaryColor,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px",color:brand.accentColor,fontSize:14,fontWeight:700}}>TK</div>
              <p style={{margin:"0 0 4px",fontWeight:700,color:brand.primaryColor}}>{brand.companyName}</p>
              <p style={{margin:0,color:"#5a6691"}}>{brand.tagline}</p>
            </div>
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   HO CONTROL CENTER — 7 SCREENS (Points C, D, E, F, G)
   ════════════════════════════════════════════════════════════════════ */

/* ── HO seed data ─────────────────────────────────────────────────── */

