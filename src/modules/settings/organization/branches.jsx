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

export function SettingsBranches(){
  const mob=useMobile();
  const [sel,setSel]=useState(null);
  const [tab,setTab]=useState("overview"); // overview | identity | compliance | banking | vouchers
  const [editBank,setEditBank]=useState(false);
  const profilesLive=useCompanyProfiles().data;                 // DB-backed (/api/company-profile)
  const [branches,setBranches]=useState([]);
  useEffect(()=>{ if(profilesLive) setBranches(profilesLive); },[profilesLive]);
  const TODAY=todayISO();
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
    <div {...clickable(()=>setSel(sel===b.code?null:b.code))} style={{
      ...card,cursor:"pointer",padding:0,overflow:"hidden",
      border:sel===b.code?"2px solid #d4a437":"1px solid #cdd1d8",
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
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderTop:"1px solid #dfe2e7"}}>
        <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #cdd1d8",fontSize:11}}><span style={{color:"#5a6691"}}>Currency</span><span style={{fontWeight:600}}>{b.currency}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #cdd1d8",fontSize:11}}><span style={{color:"#5a6691"}}>Staff</span><span style={{fontWeight:600}}>{String(b.staff)}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #cdd1d8",fontSize:11}}><span style={{color:"#5a6691"}}>FY Start</span><span style={{fontWeight:600}}>{b.fyStart}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:11}}><span style={{color:"#5a6691"}}>Voucher Prefix</span><span style={{fontWeight:600}}>{b.voucherPrefix}</span></div>
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
          <div style={{display:"flex",gap:0,background:"#f3f4f8",borderBottom:"1px solid #cdd1d8",overflowX:"auto"}}>
            <button onClick={()=>setTab("overview")} style={{flex:1,padding:"8px",border:"none",cursor:"pointer",fontWeight:tab==="overview"?700:400,background:tab==="overview"?"#fff":"transparent",borderRadius:6}}>📋 Overview</button><button onClick={()=>setTab("identity")} style={{flex:1,padding:"8px",border:"none",cursor:"pointer",fontWeight:tab==="identity"?700:400,background:tab==="identity"?"#fff":"transparent",borderRadius:6}}>🏢 Identity & Tax</button><button onClick={()=>setTab("compliance")} style={{flex:1,padding:"8px",border:"none",cursor:"pointer",fontWeight:tab==="compliance"?700:400,background:tab==="compliance"?"#fff":"transparent",borderRadius:6}}>📋 Compliance</button><button onClick={()=>setTab("bank")} style={{flex:1,padding:"8px",border:"none",cursor:"pointer",fontWeight:tab==="bank"?700:400,background:tab==="bank"?"#fff":"transparent",borderRadius:6}}>🏦 Bank Details</button><button onClick={()=>setTab("vouchers")} style={{flex:1,padding:"8px",border:"none",cursor:"pointer",fontWeight:tab==="vouchers"?700:400,background:tab==="vouchers"?"#fff":"transparent",borderRadius:6}}>🔢 Voucher Series</button>
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
                    <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid #dfe2e7"}}>
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
                    <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid #dfe2e7"}}>
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
                    <div key={i} style={{display:"flex",gap:8,padding:"8px 0",borderBottom:"1px solid #dfe2e7"}}>
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
                    <div key={i} style={{display:"flex",gap:8,padding:"8px 0",borderBottom:"1px solid #dfe2e7"}}>
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
                      <div key={i} style={{padding:"8px 12px",borderRadius:8,background:"#fff",border:"1px solid #cdd1d8"}}>
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

            {tab==="bank"&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>🏦 Bank Accounts — {selBranch.code}</p>
                  <button style={{...btnG,fontSize:11,padding:"5px 12px"}}><Plus size={12}/> Add Bank</button>
                </div>
                {(selBranch.banks||[]).map((bk,i)=>(
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
                      <div key={i} style={{padding:"8px 12px",borderRadius:8,background:"#fff",border:"1px solid #cdd1d8",
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
