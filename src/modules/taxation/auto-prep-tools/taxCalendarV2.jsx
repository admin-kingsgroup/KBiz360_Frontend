/* BUSINESS SUB-MODULE REORG (2026-07-14): moved out of taxation/legacy.jsx into
   its business sub-module folder — Taxation Auto-Prep Tools group
   (href /tax/calendar — supersedes the dead TaxCalendar left behind in
   legacy.jsx, which is registered later in App.jsx and never reached).
   taxation/index.js re-exports TaxCalendarV2 from here so App.jsx's barrel
   import needed zero changes. */

import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Calendar, ChevronDown, Download, Plus, Settings, Users } from 'lucide-react';
import { Menu as DropdownMenu } from '../../../core/ux/Menu';
import { useGpBills, useRcmLiability, useProfitAndLoss, useTaxSummary, useConfigValue, useSaveConfigValue } from '../../../core/useAccounting';
import { useTaxCalendar } from '../../../core/useReference';
import { useMasterMutations } from '../../../core/useMasters';
import { toast } from '../../../core/ux/toast';
import { CUR_MONTH, MONTH_OPTIONS, monthLabel, monthLabelLong, todayISO, CUR_FY, fyOptions, fyRange, rangeNote } from '../../../core/dates';
import { fmt, fmtINR } from '../../../core/format';
import { _TCS_ENTRIES, _TDS_ENTRIES, cardStyle } from '../../../core/helpers';
import { useTdsLedgerStatements, tdsAccrualEntries, tdsReliefTotal, taxableOf, gstOf, saleBills, fyQuarterOfISO } from '../taxLive';
import { useMobile } from '../../../core/hooks';
import { useModalEsc } from '../../../core/ux/useModalEsc';
import { clickable } from '../../../core/ux/clickable';
import { listKeyNav } from '../../../core/ux/listKeys';
import { B, FL, RPT_tdStyle, RPT_thStyle, bc, btnG, btnGh, card, inp, tabBtnStyle } from '../../../core/styles';
import { MiniBar, share, pctText } from '../../../core/insightsUI';
import { TDS_SECTIONS } from '../../../core/taxSections';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';
import { openPrintPreview } from '../../../core/PrintPreview';
import { SampleBanner } from '../../../core/ux/SampleBanner';
import { isViewOnly, VIEW_ONLY_REASON } from '../../../shell/primitives';

export function TaxCalendarV2(){
  const vo=isViewOnly();
  const [filter,setFilter]=useState("ALL");
  const TAX_CALENDAR_EVENTS=useTaxCalendar().data||[];   // DB-backed (/api/tax-calendar)
  // Add Due Date persists via /api/tax-calendar (admin-write CRUD) — the calendar
  // starts empty on a fresh db, so the team must be able to feed it from here.
  const qc=useQueryClient();
  const { create }=useMasterMutations('tax-calendar');
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [form,setForm]=useState({date:"",type:"GST",title:"",entity:"",amount:0});
  const saveEvent=()=>{
    if(create.isPending) return;
    if(!form.date||!form.title.trim()){toast('Due date and filing title are required','error');return;}
    create.mutate({...form,amount:+form.amount||0,status:'Upcoming',active:true},{
      onSuccess:()=>{qc.invalidateQueries({queryKey:['ref','tax-calendar']});toast('Due date added');setModal(false);setForm({date:"",type:"GST",title:"",entity:"",amount:0});},
      onError:(e)=>toast('Could not save — '+(e?.message||'unknown error'),'error'),
    });
  };
  const types=[...new Set(TAX_CALENDAR_EVENTS.map(e=>e.type))];
  const filtered=filter==="ALL"?TAX_CALENDAR_EVENTS:TAX_CALENDAR_EVENTS.filter(e=>e.type===filter);
  const overdue=TAX_CALENDAR_EVENTS.filter(e=>e.status==="Overdue").length;
  const dueToday=TAX_CALENDAR_EVENTS.filter(e=>e.status==="Due Today").length;
  const upcoming7=TAX_CALENDAR_EVENTS.filter(e=>e.status==="Upcoming"&&new Date(e.date)<=new Date("2026-05-27")).length;
  return(
    <PHASE2_Page title="Tax Calendar — Reminders" subtitle="All compliance filing dates · GST · TDS · PF · ESI · Advance Tax · VAT · ROC"
      toolbar={<><select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}><option value="ALL">All types</option>{types.map(t=><option key={t}>{t}</option>)}</select><button onClick={()=>setModal(true)} style={{padding:"7px 12px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>＋ Add Due Date</button><button style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>📅 Export to Calendar</button></>}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Overdue",v:overdue,c:"#A32D2D"},{l:"Due Today",v:dueToday,c:"#f97316"},{l:"Due This Week",v:upcoming7,c:"#d4a437"},{l:"Total Upcoming",v:TAX_CALENDAR_EVENTS.length,c:"#0d1326"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:k.c}}>{k.v}</p></div>
        ))}
      </div>
      <div style={cardStyle}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Due Date</th><th style={RPT_thStyle}>Type</th><th style={RPT_thStyle}>Filing / Payment</th><th style={RPT_thStyle}>Entity</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th><th style={{...RPT_thStyle,textAlign:"center"}}>Days</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th><th style={{...RPT_thStyle,textAlign:"center"}}>Action</th></tr></thead>
          <tbody>{filtered.map((e,i)=>{
            const days=Math.round((new Date(e.date)-new Date("2026-05-20"))/86400000);
            return(
              <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:e.status==="Due Today"?"#fff8e8":"#fff"}}>
                <td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:600,color:days<=0?"#A32D2D":days<=7?"#f97316":"#0d1326"}}>{e.date}</td>
                <td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{e.type}</span></td>
                <td style={{...RPT_tdStyle,fontWeight:600}}>{e.title}</td>
                <td style={{...RPT_tdStyle,color:"#5a6691",fontSize:11}}>{e.entity}</td>
                <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:e.amount>0?700:400,color:e.amount>0?"#A32D2D":"#5a6691"}}>{e.amount>0?fmtINR(e.amount):"—"}</td>
                <td style={{...RPT_tdStyle,textAlign:"center",fontWeight:700,color:days<=0?"#A32D2D":days<=7?"#f97316":"#5a6691"}}>{days<=0?"DUE":days+"d"}</td>
                <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"3px 9px",borderRadius:3,fontSize:10,fontWeight:700,background:e.status==="Due Today"?"#f8d7da":e.status==="Filed"?"#d4edda":"#fff3cd",color:e.status==="Due Today"?"#721c24":e.status==="Filed"?"#155724":"#856404"}}>{e.status}</span></td>
                <td style={{...RPT_tdStyle,textAlign:"center"}}>
                  <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                    <button style={{padding:"3px 7px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:3,fontSize:10,fontWeight:700,cursor:"pointer"}}>File</button>
                    <button style={{padding:"3px 7px",background:"#fff",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:3,fontSize:10,fontWeight:600,cursor:"pointer"}}>⏰</button>
                  </div>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22"}}>Add Statutory Due Date</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5b616e"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:10}}>
                <FL label="Due date"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={inp}/></FL>
                <FL label="Type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}>{["GST","TDS","TCS","PF","ESI","Advance Tax","VAT","ROC","IT Return","Other"].map(t=><option key={t}>{t}</option>)}</select></FL>
              </div>
              <FL label="Filing / payment"><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. GSTR-3B — June 2026" style={inp}/></FL>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:10}}>
                <FL label="Entity / branch"><input value={form.entity} onChange={e=>setForm(f=>({...f,entity:e.target.value}))} placeholder="e.g. Travkings BOM" style={inp}/></FL>
                <FL label="Amount (₹, optional)"><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} style={inp}/></FL>
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={saveEvent} disabled={vo} title={vo?VIEW_ONLY_REASON:undefined} style={vo?{...btnG,opacity:0.5,cursor:"not-allowed"}:btnG}>💾 Save Due Date</button>
            </div>
          </div>
        </div>
      )}
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SETTINGS — ADMIN POWER (8 screens)
   Doc Templates · Email/SMS Templates · Approval Matrix Builder
   Custom Fields · Field Access · Bulk Users · Permissions Matrix · Branding
   ════════════════════════════════════════════════════════════════════ */

/* ── Settings seed data ───────────────────────────────────────────── */

