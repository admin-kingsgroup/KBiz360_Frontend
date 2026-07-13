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

export function BrandingSettings(){
  const [brand,setBrand]=useState({companyName:"Travkings Tours & Travels Pvt. Ltd.",tagline:"Your Journey, Our Passion",primaryEmail:"accounts@travkings.com",supportPhone:"+91 22 6654 8800",primaryColor:"#0d1326",accentColor:"#d4a437",website:"www.travkings.com"});
  const upd=k=>e=>setBrand(b=>({...b,[k]:e.target.value}));
  const inp={padding:"8px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12.5,width:"100%"};
  return(
    <PHASE2_Page title="Branding Settings" subtitle="Preview — branding is not persisted to the server yet (app branding comes from core/brand.js)"
      toolbar={<button disabled title="Branding persistence isn’t wired to the server yet — preview only" style={{padding:"8px 18px",background:"#eef0f6",color:"#9aa3bd",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,fontWeight:700,cursor:"not-allowed"}}>💾 Save Branding</button>}>
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
                    <input type="color" value={brand[c.k]} onChange={upd(c.k)} style={{width:44,height:38,border:"1px solid #cdd1d8",borderRadius:4,cursor:"pointer",padding:3}}/>
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
              <button disabled title="Logo upload isn’t wired to the server yet" style={{padding:"7px 14px",background:"#eef0f6",color:"#9aa3bd",border:"1px solid #cdd1d8",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"not-allowed"}}>📤 Upload Logo (PNG/SVG)</button>
              <p style={{margin:"6px 0 0",fontSize:10,color:"#5a6691"}}>Recommended: 300×80px · transparent background</p>
            </div>
          </div>
        </div>
        {/* Live preview */}
        <div style={cardStyle}>
          <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Live Preview</p>
          <div style={{border:"1px solid #cdd1d8",borderRadius:8,overflow:"hidden",marginBottom:12}}>
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
          <div style={{border:"1px solid #cdd1d8",borderRadius:6,overflow:"hidden"}}>
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
