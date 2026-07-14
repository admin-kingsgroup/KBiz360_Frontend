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

export function DocTemplateEditor(){
  const [selDoc,setSelDoc]=useState("Tax Invoice");
  const [header,setHeader]=useState("Travkings Tours & Travels Pvt. Ltd.");
  const [footer,setFooter]=useState("Subject to Mumbai Jurisdiction · Powered by KBiz360 — The Business Engine");
  const [showLogo,setShowLogo]=useState(true);
  const [showGST,setShowGST]=useState(true);
  const [color,setColor]=useState("#0d1326");
  const docs=["Tax Invoice","Payment Voucher","Receipt Voucher","Quotation","Hotel Voucher","Transfer Voucher","Visa Cover Letter"];
  return(
    <PHASE2_Page title="Document Template Editor" subtitle="Preview — layout options are not persisted to the server yet (invoice printing uses core/invoiceHtml.js)"
      toolbar={<><select value={selDoc} onChange={e=>setSelDoc(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}>{docs.map(d=><option key={d}>{d}</option>)}</select><button disabled title="Template persistence isn’t wired to the server yet — preview only" style={{padding:"7px 14px",background:"#eef0f6",color:"#9aa3bd",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,fontWeight:700,cursor:"not-allowed"}}>💾 Save Template</button><button disabled title="Preview only" style={{padding:"7px 12px",background:"#eef0f6",border:"1px solid #cdd1d8",color:"#9aa3bd",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"not-allowed"}}>Reset to Default</button></>}>
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
            <textarea value={header} onChange={e=>setHeader(e.target.value)} rows={3} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,width:"100%",fontFamily:"inherit",resize:"none"}}/>
          </div>
          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Footer</p>
            <textarea value={footer} onChange={e=>setFooter(e.target.value)} rows={2} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,width:"100%",fontFamily:"inherit",resize:"none"}}/>
          </div>
          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Brand Color</p>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{width:40,height:34,border:"1px solid #cdd1d8",borderRadius:4,cursor:"pointer",padding:2}}/>
              <input value={color} onChange={e=>setColor(e.target.value)} style={{flex:1,padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,fontFamily:"monospace"}}/>
            </div>
            <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
              {["#0d1326","#d4a437","#A32D2D","#2F7A8E","#22c55e","#3b82f6"].map(c=>(
                <div key={c} {...clickable(()=>setColor(c))} style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",border:color===c?"2px solid #fff":"none",boxShadow:color===c?"0 0 0 2px "+c:"none"}}/>
              ))}
            </div>
          </div>
        </div>
        {/* Live preview */}
        <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,overflow:"hidden"}}>
          <div style={{padding:"8px 14px",background:"#fafbfd",borderBottom:"1px solid #cdd1d8",fontSize:11,color:"#5a6691"}}>Live Preview — {selDoc}</div>
          <div style={{padding:20}}>
            <div style={{border:"1px solid #cdd1d8",borderRadius:4,overflow:"hidden"}}>
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
              <div style={{padding:"8px 14px",background:"#f7f8fb",borderTop:"1px solid #cdd1d8",fontSize:9.5,color:"#5a6691",textAlign:"center"}}>{footer}</div>
            </div>
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}
