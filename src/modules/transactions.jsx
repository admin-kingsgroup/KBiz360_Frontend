/* ════════════════════════════════════════════════════════════════════
   MODULES/TRANSACTIONS.JSX
   Auto-generated from KBiz360_v2.jsx · 4398 lines · 39 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Calendar, Check, Clock, Download, Plus, Printer, Save, Search } from 'lucide-react';
import { Area, Line } from 'recharts';
import { getAllPurchases, getAvailablePurchases, getUnmatchedTickets, settlePurchaseEntry } from '../core/business-logic';
import { ADM_DATA, ADM_REASON_CODES, BRANCHES, GP_BILLS, LEDGER_REGISTRY, PURCHASE_REGISTRY, SALE_TO_PURCH_MOD } from '../core/data';
import { fmt, fmtINR } from '../core/format';
import { ACM_DATA, ACM_REASON_CODES, LedgerSelect, RECURRING_DATA, REFUNDS_DATA, Recruitment, STATUS_FLOW, TAB_Page, TRow, TrainingRecords, VTD, VTH, _ADM_LIST, _TICKET_CTRL, cardStyle, tabPanel } from '../core/helpers';
import { triggerSaveRefresh, useMobile, useVNo } from '../core/hooks';
import { ARow, B, DBtn, FL, RPT_tdStyle, RPT_thStyle, VHead, VNarr, VParty, VTot, VWrap, bc, btnG, btnGh, card, inp, inpStd, tabBtnStyle } from '../core/styles';
import { Dashboard } from './dashboard';
import { TDS_SECTIONS } from './finance';
import { ChartOfAccounts, MastersLedgers, MastersSubAgents } from './masters';
import { DocumentManager } from './operations';
import { ApiKeySettings } from './settings';
import { Form26AS } from './taxation';
import { NotificationCentre } from '../shell/NotifPanel';
import { PHASE2_Page } from '../shell/PHASE2_Page';

export function PurchaseLinkField({branch,saleMod,saleAmt,onSelect,selected}){
  const mob=useMobile();
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState("");
  const cfg=bc(branch);
  const cur=cfg.cur;
  const purchMod=SALE_TO_PURCH_MOD[saleMod]||"PF";
  const available=getAvailablePurchases(purchMod,branch);
  const allPurch  =getAllPurchases(purchMod,branch);
  const filtered  =search
    ?available.filter(p=>
        p.vno.toLowerCase().includes(search.toLowerCase())||
        p.supplier.toLowerCase().includes(search.toLowerCase())||
        p.ref.toLowerCase().includes(search.toLowerCase())||
        p.desc.toLowerCase().includes(search.toLowerCase()))
    :available;

  const isLinked=!!selected;
  const gp=isLinked&&saleAmt?saleAmt-selected.amt:0;
  const gpPct=isLinked&&saleAmt>0?+((gp/saleAmt)*100).toFixed(1):0;
  const gpC=gpPct>=25?"#27500A":gpPct>=15?"#854F0B":"#A32D2D";

  const MOD_LABELS={
    PF:"Flight Tickets",PH:"Holiday Packages",PHT:"Hotels",
    PC:"Car Rentals",PV:"Visas",PI:"Insurance",PM:"Miscellaneous",
  };

  return (
    <div style={{position:"relative",borderBottom:"2px solid "+(isLinked?"#C0DD97":"#F7C1C1"),
      background:isLinked?"#f8fff8":"#fffafa"}}>

      {/* ── Compact top bar ── */}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",
        flexWrap:mob?"wrap":"nowrap"}}>

        {/* Status icon */}
        <div style={{width:32,height:32,borderRadius:8,flexShrink:0,
          background:isLinked?"#EAF3DE":"#FCEBEB",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>
          {isLinked?"🔗":"⚠"}
        </div>

        {/* Label + selected info */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontSize:9.5,fontWeight:700,color:isLinked?"#27500A":"#A32D2D",
              textTransform:"uppercase",letterSpacing:"0.5px"}}>
              {isLinked?"Purchase Linked":"Link Purchase Entry"}
            </span>
            <span style={{fontSize:9,padding:"1px 7px",borderRadius:999,
              background:isLinked?"#EAF3DE":"#FCEBEB",
              color:isLinked?"#27500A":"#A32D2D",fontWeight:700}}>
              {isLinked?"MANDATORY ✔":"SAVE BLOCKED 🔒"}
            </span>
          </div>

          {isLinked?(
            <div style={{display:"flex",alignItems:"center",gap:12,marginTop:3,flexWrap:"wrap"}}>
              <span style={{fontFamily:"monospace",fontSize:11.5,fontWeight:700,color:"#185FA5"}}>
                {selected.vno}
              </span>
              <span style={{fontSize:11,color:"#384677"}}>{selected.supplier}</span>
              <span style={{fontSize:10,color:"#5a6691",fontStyle:"italic"}}>{selected.desc}</span>
              <span style={{fontSize:11,fontWeight:700,color:"#0d1326",fontVariantNumeric:"tabular-nums"}}>
                {cur+fmt(selected.amt)}
              </span>
              {saleAmt>0&&(
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,
                  background:gpPct>=25?"#EAF3DE":gpPct>=15?"#FAEEDA":"#FCEBEB",
                  color:gpC}}>
                  GP {gpPct}%
                </span>
              )}
            </div>
          ):(
            <p style={{margin:"2px 0 0",fontSize:10,color:"#A32D2D"}}>
              Select a {MOD_LABELS[purchMod]||"purchase"} entry before saving this voucher
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div style={{display:"flex",gap:7,flexShrink:0}}>
          {isLinked&&(
            <button onClick={()=>onSelect(null)}
              style={{padding:"5px 10px",background:"transparent",border:"1px solid #e1e3ec",
                borderRadius:7,fontSize:10.5,cursor:"pointer",color:"#5a6691",fontWeight:500}}>
              ✕
            </button>
          )}
          <button
            onClick={()=>setOpen(o=>!o)}
            style={{display:"flex",alignItems:"center",gap:5,
              padding:mob?"6px 11px":"6px 14px",borderRadius:8,
              fontSize:11,fontWeight:700,cursor:"pointer",
              background:isLinked?"transparent":"#0d1326",
              color:isLinked?"#27500A":"#fff",
              border:isLinked?"1.5px solid #C0DD97":"1.5px solid #0d1326",
              transition:"all 0.15s",whiteSpace:"nowrap"}}>
            🔗 {isLinked?"Change":"Select Purchase"} ({available.length})
          </button>
        </div>
      </div>

      {/* ── Dropdown panel ── */}
      {open&&(
        <div style={{
          position:"absolute",top:"100%",left:0,right:0,
          background:"#fff",border:"1.5px solid #0d1326",
          borderTop:"none",borderRadius:"0 0 12px 12px",
          boxShadow:"0 16px 48px rgba(0,0,0,0.18)",
          zIndex:300,maxHeight:460,
          display:"flex",flexDirection:"column",overflow:"hidden",
        }}>

          {/* Dropdown header */}
          <div style={{padding:"11px 16px",background:"#0d1326",
            display:"flex",alignItems:"center",justifyContent:"space-between",
            gap:10,flexShrink:0}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:14}}>{branch==="ALL"?"🌐":branch?.flag}</span>
                <p style={{margin:0,fontSize:12,fontWeight:700,color:"#fff"}}>
                  Purchase — {MOD_LABELS[purchMod]}
                </p>
              </div>
              <p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691"}}>
                {branch?.code||"ALL"} branch · {cfg.curCode} · {available.length} available
                {" · "}{allPurch.filter(p=>p.settled).length} already linked
              </p>
            </div>
            <button onClick={()=>{setOpen(false);setSearch("");}}
              style={{background:"transparent",border:"none",color:"#5a6691",
                cursor:"pointer",fontSize:20,lineHeight:1,padding:"2px 6px"}}>✕</button>
          </div>

          {/* Search */}
          <div style={{padding:"9px 14px",borderBottom:"1px solid #e1e3ec",flexShrink:0,
            background:"#f9fafb"}}>
            <input autoFocus
              value={search} onChange={e=>setSearch(e.target.value)}
              placeholder={"Search voucher no., supplier, reference, description..."}
              style={{width:"100%",padding:"7px 12px",border:"1.5px solid #e1e3ec",
                borderRadius:8,fontSize:11.5,outline:"none",boxSizing:"border-box",
                background:"#fff"}}
            />
          </div>

          {/* Stats row */}
          <div style={{display:"flex",gap:12,padding:"7px 16px",
            borderBottom:"1px solid #e1e3ec",background:"#f9fafb",flexShrink:0}}>
            <span style={{fontSize:10,color:"#5a6691"}}>
              <b style={{color:"#27500A"}}>{available.length}</b> available to link
            </span>
            <span style={{fontSize:10,color:"#5a6691"}}>
              <b style={{color:"#384677"}}>{allPurch.filter(p=>p.settled).length}</b> already linked
            </span>
            {search&&(
              <span style={{fontSize:10,color:"#185FA5"}}>
                <b>{filtered.length}</b> matching "{search}"
              </span>
            )}
          </div>

          {/* List */}
          <div style={{overflowY:"auto",flex:1}}>
            {filtered.length===0?(
              <div style={{padding:"28px",textAlign:"center",color:"#5a6691"}}>
                <p style={{margin:"0 0 6px",fontSize:22}}>🔍</p>
                <p style={{margin:"0 0 4px",fontSize:12,fontWeight:600,color:"#0d1326"}}>
                  {branch==="ALL"
                    ?"Select a branch first — cannot link vouchers in Travkings Group mode"
                    :`No available Purchase — ${MOD_LABELS[purchMod]} for ${branch?.code}`}
                </p>
                <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>
                  {branch!=="ALL"&&"Create a purchase entry first, then come back here to link it."}
                </p>
              </div>
            ):(
              filtered.map((p,i)=>{
                const isSelected=selected?.vno===p.vno&&selected?.ref===p.ref;
                const previewGP=saleAmt?saleAmt-p.amt:0;
                const previewGPPct=saleAmt&&saleAmt>0?+((previewGP/saleAmt)*100).toFixed(1):null;
                const pgC=previewGPPct!=null?(previewGPPct>=25?"#27500A":previewGPPct>=15?"#854F0B":"#A32D2D"):"#5a6691";
                return (
                  <div key={i}
                    onClick={()=>{onSelect(p);setOpen(false);setSearch("");}}
                    style={{
                      padding:"11px 16px",borderBottom:"1px solid #f3f4f8",
                      cursor:"pointer",transition:"background 0.1s",
                      background:isSelected?"#EAF3DE":"#fff",
                      display:"flex",alignItems:"center",gap:14,
                    }}
                    onMouseEnter={e=>{if(!isSelected)e.currentTarget.style.background="#f5fbf5";}}
                    onMouseLeave={e=>{if(!isSelected)e.currentTarget.style.background="#fff";}}
                  >
                    {/* Left: check/radio indicator */}
                    <div style={{width:18,height:18,borderRadius:"50%",flexShrink:0,
                      border:isSelected?"none":"2px solid #e1e3ec",
                      background:isSelected?"#27500A":"transparent",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff"}}>
                      {isSelected&&"✔"}
                    </div>

                    {/* Middle: voucher info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:"#185FA5"}}>
                          {p.vno}
                        </span>
                        <span style={{fontSize:11}}>{BRANCHES.find(b=>b.code===p.branch)?.flag}</span>
                        <span style={{fontSize:9,padding:"1px 6px",borderRadius:999,
                          background:"#EAF3DE",color:"#27500A",fontWeight:700}}>
                          Available
                        </span>
                        <span style={{fontSize:9,color:"#5a6691"}}>{p.date}</span>
                      </div>
                      <p style={{margin:"0 0 2px",fontSize:11.5,fontWeight:600,color:"#0d1326"}}>
                        {p.supplier}
                      </p>
                      <p style={{margin:0,fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>
                        {p.desc}
                      </p>
                      <p style={{margin:"3px 0 0",fontSize:10,fontFamily:"monospace",color:"#8b94b3"}}>
                        Ref: {p.ref}
                      </p>
                    </div>

                    {/* Right: amount + GP preview */}
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <p style={{margin:"0 0 4px",fontSize:15,fontWeight:800,color:"#0d1326",
                        fontVariantNumeric:"tabular-nums"}}>
                        {cur+fmt(p.amt)}
                      </p>
                      {previewGPPct!=null&&(
                        <span style={{fontSize:10.5,padding:"3px 9px",borderRadius:999,
                          fontWeight:700,
                          background:previewGPPct>=25?"#EAF3DE":previewGPPct>=15?"#FAEEDA":"#FCEBEB",
                          color:pgC}}>
                          GP {previewGPPct}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div style={{padding:"9px 16px",background:"#f9fafb",
            borderTop:"1px solid #e1e3ec",flexShrink:0,
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{margin:0,fontSize:10,color:"#5a6691"}}>
              {branch==="ALL"?"Switch to a branch to link vouchers."
                :branch?.code+" branch · "+cfg.curCode+" · Create purchase first if not listed above"}
            </p>
            <button onClick={()=>{setOpen(false);setSearch("");}}
              style={{padding:"5px 12px",background:"#0d1326",color:"#fff",
                border:"none",borderRadius:7,fontSize:10.5,cursor:"pointer",fontWeight:600}}>
              Close ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



export function SalesFlight({branch,setRoute}){
  const vNo=useVNo(branch,"SF");
  const [linkedPurch,setLinkedPurch]=useState(null);
  const [pax,setPax]=useState([
    {id:1,name:"Mr. Rajiv Sharma",  ticket:"098-2156789012",airline:"Air India",sector:"BOM-DXB",date:"2026-05-16",cls:"Economy",base:18000,taxes:2500},
    {id:2,name:"Mrs. Rohan", ticket:"098-2156789013",airline:"Air India",sector:"BOM-DXB",date:"2026-05-16",cls:"Economy",base:18000,taxes:2500},
  ]);
  const [sc,setSc]=useState(1500);
  const t=useMemo(()=>{
    const base=pax.reduce((s,p)=>s+(+p.base||0),0);
    const taxes=pax.reduce((s,p)=>s+(+p.taxes||0),0);
    const cgst=+(sc*0.09).toFixed(2);
    const sgst=+(sc*0.09).toFixed(2);
    return {base:base,taxes:taxes,sc:sc,cgst:cgst,sgst:sgst,total:base+taxes+sc+cgst+sgst};
  },[pax,sc]);
  const upd=(id,f,v)=>setPax(ps=>ps.map(p=>p.id===id?{...p,[f]:v}:p));
  const add=()=>setPax(ps=>[...ps,{id:Date.now(),name:"",ticket:"",airline:"",sector:"",date:"",cls:"Economy",base:0,taxes:0}]);
  const rm=id=>setPax(ps=>ps.filter(p=>p.id!==id));
  const cfg=bc(branch);
  const cur=cfg.cur;
  return (
    <div style={{padding:"12px 10px",maxWidth:1260,margin:"0 auto",paddingBottom:72}}>
      <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:12,overflow:"hidden"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"12px 16px",background:"#0d1326"}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <div style={{width:38,height:38,borderRadius:9,background:"#E6F1FB",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>✈</div>
            <div>
              <p style={{margin:0,fontSize:15,fontWeight:700,color:"#fff"}}>Sales — Flight Tickets</p>
              <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{"Voucher · "+(branch?.code||"BOM")+" · "+vNo}</p>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <span style={{fontSize:10,padding:"4px 10px",borderRadius:999,
              background:cfg.taxType==="GST"?"#E6F1FB":"#EAF3DE",
              color:cfg.taxType==="GST"?"#185FA5":"#27500A",fontWeight:700}}>
              {branch?.flag} {cfg.curCode} · {cfg.taxType==="GST"?"GST 18%":"VAT "+cfg.vatRate+"%"}
            </span>
          </div>
        </div>

        {/* ── Mandatory purchase link field ── */}
        <PurchaseLinkField branch={branch} saleMod="SF"
          saleAmt={t.total} selected={linkedPurch} onSelect={setLinkedPurch}/>

        {/* Voucher fields */}
        <div style={{padding:"13px 16px",borderBottom:"1px solid #e1e3ec"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
            <FL label="Voucher no."><input value={vNo} readOnly style={{...inp,background:"#f3f4f8",color:"#5a6691"}}/></FL>
            <FL label="Date"><input type="date" defaultValue="2026-05-16" style={inp}/></FL>
            <FL label="Invoice type"><select style={inp}><option>Tax Invoice</option><option>Bill of Supply</option><option>Proforma</option></select></FL>
            <FL label="Reference"><input defaultValue="REF-AI-78421" style={inp}/></FL>
          </div>
        </div>

        {/* Party */}
        <div style={{padding:"13px 16px",borderBottom:"1px solid #e1e3ec"}}>
          <p style={{margin:"0 0 8px",fontSize:10,color:"#5a6691",textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:600}}>Customer</p>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:11}}>
            <FL label="Customer / Party A/c"><input defaultValue="Sharma Enterprises Pvt. Ltd." style={inp}/></FL>
            <FL label={cfg.taxType==="GST"?"GSTIN":"Tax ID"}><input defaultValue="27AABCS1234L1Z5" style={inp}/></FL>
            <FL label={cfg.taxType==="GST"?"Place of supply":"Country"}>
              <select style={inp}>
                {cfg.taxType==="GST"
                  ?<><option>Maharashtra (27)</option><option>Gujarat (24)</option><option>Delhi (07)</option></>
                  :<><option>Kenya</option><option>Tanzania</option><option>DRC</option></>
                }
              </select>
            </FL>
          </div>
        </div>

        {/* Passenger table */}
        <div style={{padding:"13px 16px",borderBottom:"1px solid #e1e3ec"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:600}}>Passengers</p>
            <button onClick={add} style={{...btnGh,padding:"5px 11px",fontSize:11,display:"flex",alignItems:"center",gap:5}}>
              <Plus size={12}/> Add passenger
            </button>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",fontSize:11.5,borderCollapse:"collapse",minWidth:780}}>
              <thead><tr style={{background:"#f3f4f8"}}>
                {["#","Passenger","Ticket no.","Airline","Sector","Date","Class","Base fare","Taxes",""].map((h,i)=>(
                  <th key={i} style={{padding:"7px 8px",textAlign:i>=7?"right":"left",
                    fontSize:10,color:"#5a6691",fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{pax.map((p,i)=>(
                <tr key={p.id} style={{borderBottom:"1px solid #e1e3ec"}}>
                  <td style={{padding:"4px 8px",color:"#5a6691"}}>{i+1}</td>
                  <td style={{padding:3}}><input value={p.name} onChange={e=>upd(p.id,"name",e.target.value)} style={{...inp,minWidth:160}}/></td>
                  <td style={{padding:3}}><input value={p.ticket} onChange={e=>upd(p.id,"ticket",e.target.value)} style={{...inp,minWidth:130,fontFamily:"monospace"}}/></td>
                  <td style={{padding:3}}><input value={p.airline} onChange={e=>upd(p.id,"airline",e.target.value)} style={{...inp,minWidth:90}}/></td>
                  <td style={{padding:3}}><input value={p.sector} onChange={e=>upd(p.id,"sector",e.target.value)} style={{...inp,minWidth:90}}/></td>
                  <td style={{padding:3}}><input type="date" value={p.date} onChange={e=>upd(p.id,"date",e.target.value)} style={{...inp,minWidth:120}}/></td>
                  <td style={{padding:3}}><select value={p.cls} onChange={e=>upd(p.id,"cls",e.target.value)} style={{...inp,minWidth:90}}><option>Economy</option><option>Business</option><option>First</option></select></td>
                  <td style={{padding:3}}><input type="number" value={p.base} onChange={e=>upd(p.id,"base",+e.target.value)} style={{...inp,minWidth:90,textAlign:"right"}}/></td>
                  <td style={{padding:3}}><input type="number" value={p.taxes} onChange={e=>upd(p.id,"taxes",+e.target.value)} style={{...inp,minWidth:80,textAlign:"right"}}/></td>
                  <td style={{padding:"4px 8px",textAlign:"center"}}>
                    <button onClick={()=>rm(p.id)} style={{background:"transparent",border:"none",color:"#A32D2D",cursor:"pointer",fontSize:16}}>×</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        {/* Tax + Totals */}
        <div style={{padding:"13px 16px",borderBottom:"1px solid #e1e3ec"}}>
          <p style={{margin:"0 0 8px",fontSize:10,color:"#5a6691",textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:600}}>
            {cfg.taxType==="GST"?"Service charge & GST":"Service charge & VAT"}
          </p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
            <FL label={"Service charge "+cur}><input type="number" value={sc} onChange={e=>setSc(+e.target.value)} style={inp}/></FL>
            {cfg.taxType==="GST"
              ?<><FL label="CGST 9%"><input value={fmt(t.cgst)} readOnly style={{...inp,background:"#f3f4f8"}}/></FL>
                <FL label="SGST 9%"><input value={fmt(t.sgst)} readOnly style={{...inp,background:"#f3f4f8"}}/></FL></>
              :<FL label={"VAT "+cfg.vatRate+"%"}><input value={fmt(+(sc*cfg.vatRate/100).toFixed(2))} readOnly style={{...inp,background:"#f3f4f8"}}/></FL>
            }
          </div>
        </div>

        {/* Narration + summary */}
        <div style={{padding:"13px 16px",background:"#f9fafb"}}>
          <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:14}}>
            <FL label="Narration"><textarea rows={3} defaultValue={"Being air tickets issued to Sharma Enterprises — "+pax.length+" pax"} style={{...inp,resize:"vertical"}}/></FL>
            <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:10,padding:14}}>
              <TRow l="Base fare" v={cur+" "+fmt(t.base)}/>
              <TRow l="Airline taxes" v={cur+" "+fmt(t.taxes)}/>
              <TRow l="Service charge" v={cur+" "+fmt(t.sc)}/>
              <TRow l={cfg.taxType==="GST"?"CGST 9%":"VAT "+cfg.vatRate+"%"} v={cur+" "+fmt(t.cgst)}/>
              {cfg.taxType==="GST"&&<TRow l="SGST 9%" v={cur+" "+fmt(t.sgst)}/>}
              <div style={{borderTop:"2px solid #0d1326",margin:"8px 0",paddingTop:8,
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:700}}>Invoice total</span>
                <span style={{fontSize:18,fontWeight:800,color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>
                  {cur+" "+fmt(t.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div style={{position:"sticky",bottom:0,background:"#f3f4f8",borderTop:"1px solid #e1e3ec",
        padding:"12px 10px",display:"flex",gap:9,justifyContent:"flex-end"}}>
        <button style={btnGh}>Cancel</button>
        <button
          disabled={!linkedPurch}
          style={{...btnG,
            background:linkedPurch?"#0d1326":"#9ca3af",
            cursor:linkedPurch?"pointer":"not-allowed",
            opacity:linkedPurch?1:0.6,
          }}
          onClick={()=>{
            if(!linkedPurch)return;
            settlePurchaseEntry(linkedPurch);
            triggerSaveRefresh();
          }}
          title={linkedPurch?"Save voucher":"Select a purchase entry first"}
        >
          {linkedPurch?"Accept & save ✔":"Link Purchase to Enable Save"}
        </button>
      </div>
    </div>
  );
}


/* SalesHoliday — see rebuilt version below */

export function SalesCar({branch,setRoute}){
  const vNo=useVNo(branch,"SC");
  const [rows,setRows]=useState([
    {id:1,vehicle:"Toyota Innova Crysta",type:"MUV",pickup:"Mumbai Airport T2",drop:"Pune Station",days:3,rate:4200,km:0,drv:0},
    {id:2,vehicle:"Toyota Etios",type:"Sedan",pickup:"Pune Station",drop:"Pune Station",days:2,rate:2800,km:0,drv:0},
  ]);
  const [gstScheme,setGstScheme]=useState("5");
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),vehicle:"",type:"Sedan",pickup:"",drop:"",days:1,rate:0,km:0,drv:0}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));
  const sub=rows.reduce((s,r)=>s+(+r.rate||0)*(+r.days||1)+(+r.km||0)+(+r.drv||0),0);
  const gstPct=+gstScheme;
  const cgst=+(sub*gstPct/200).toFixed(2);
  const sgst=cgst;
  const total=+(sub+cgst+sgst).toFixed(2);
  return (
    <VWrap title="Sales Voucher — Car Rentals" icon="🚗" vNo={vNo} branch={branch} type="sales" saleMod="SC" saleAmt={total||0} setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} name="Nexus Industries" gstin="27AACNI2211J1Z1"/>
      <ARow label="Vehicle &amp; hire details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:860}}>
          <thead><tr>
            {["#","Vehicle","Type","Pickup","Drop","Days","Rate/day ₹","Extra km ₹","Driver ₹","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=5&&i<=9}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const rowTotal=(+r.rate||0)*(+r.days||1)+(+r.km||0)+(+r.drv||0);
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.vehicle} onChange={e=>upd(r.id,"vehicle",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}>
                  <select value={r.type} onChange={e=>upd(r.id,"type",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}>
                    <option>Sedan</option><option>MUV</option><option>SUV</option><option>Tempo</option><option>Bus</option>
                  </select>
                </td>
                <td style={{padding:3}}><input value={r.pickup} onChange={e=>upd(r.id,"pickup",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input value={r.drop} onChange={e=>upd(r.id,"drop",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input type="number" value={r.days} onChange={e=>upd(r.id,"days",+e.target.value||1)} style={{...inp,minHeight:28,fontSize:11,width:55,textAlign:"right"}}/></td>
                <td style={{padding:3}}><input type="number" value={r.rate} onChange={e=>upd(r.id,"rate",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
                <td style={{padding:3}}><input type="number" value={r.km} onChange={e=>upd(r.id,"km",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
                <td style={{padding:3}}><input type="number" value={r.drv} onChange={e=>upd(r.id,"drv",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
                <VTD c={fmt(rowTotal)} r/>
                <DBtn fn={()=>rm(r.id)}/>
              </tr>
            );
          })}</tbody>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label="GST scheme">
            <select value={gstScheme} onChange={e=>setGstScheme(e.target.value)} style={inp}>
              <option value="5">5% — No ITC (standard hire)</option>
              <option value="12">12% — With ITC (B2B / aggregator)</option>
            </select>
          </FL>
          <FL label={"CGST "+gstPct/2+"% ₹"}><input value={fmt(cgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
          <FL label={"SGST "+gstPct/2+"% ₹"}><input value={fmt(sgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
        </div>
        <div style={{marginTop:9,padding:"8px 12px",background:"#E6F1FB",borderRadius:8,fontSize:11.5,color:"#185FA5"}}>
          {bc(branch).taxType==="GST"
            ? (gstScheme==="5"
              ? "5% GST — No ITC. Standard car hire (SAC 996601). Apply when hiring with operator."
              : "12% GST — ITC available for B2B / aggregator transport.")
            : bc(branch).taxType+" "+bc(branch).vatRate+"% on hire charges."}
        </div>
      </div>
      <VNarr def="Being car hire charges — Innova Crysta BOM-Pune + Etios local Pune, 28-30 May 2026, Nexus Industries.">
        <VTot branch={branch}
          lines={[
            {l:"Hire charges (base)",v:"₹ "+fmt(sub)},
            {l:"CGST "+gstPct/2+"%",v:"₹ "+fmt(cgst)},
            {l:"SGST "+gstPct/2+"%",v:"₹ "+fmt(sgst)},
          ]}
          total={total}
        />
      </VNarr>
    </VWrap>
  );
}


/* ── SALES: VISAS ────────────────────────────────────────── */

export function SalesVisa({branch,setRoute}){
  const vNo=useVNo(branch,"SV");
  const [appl,setAppl]=useState([
    {id:1,name:"Mr. Rajiv Sharma",pp:"Z1234567",dob:"1975-04-15",nat:"Indian",country:"UAE",vtype:"Tourist 30D",vfsRef:"VFS-DXB-112233",embFee:4800,vfsFee:1800},
    {id:2,name:"Mrs. Rohan",pp:"Z1234568",dob:"1978-09-22",nat:"Indian",country:"UAE",vtype:"Tourist 30D",vfsRef:"VFS-DXB-112234",embFee:4800,vfsFee:1800},
  ]);
  const [svc,setSvc]=useState(2500);
  const upd=(id,k,v)=>setAppl(as=>as.map(a=>a.id===id?{...a,[k]:v}:a));
  const add=()=>setAppl(as=>[...as,{id:Date.now(),name:"",pp:"",dob:"",nat:"Indian",country:"",vtype:"",vfsRef:"",embFee:0,vfsFee:0}]);
  const rm=id=>setAppl(as=>as.filter(a=>a.id!==id));
  const embTot=appl.reduce((s,a)=>s+(+a.embFee||0),0);
  const vfsTot=appl.reduce((s,a)=>s+(+a.vfsFee||0),0);
  const cgst=+(svc*0.09).toFixed(2);
  const sgst=cgst;
  const total=+(embTot+vfsTot+svc+cgst+sgst).toFixed(2);
  return (
    <VWrap title="Sales Voucher — Visas" icon="🛂" vNo={vNo} branch={branch} type="sales" saleMod="SV" saleAmt={total||0} setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} name="Sharma Enterprises Pvt. Ltd." gstin="27AABCS1234L1Z5"/>
      <ARow label="Applicant details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
          <thead><tr>
            {["#","Applicant name","Passport no.","DOB","Nationality","Visa country","Visa type","VFS ref.","Embassy fee ₹","VFS fee ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=8&&i<=9}/>)}
          </tr></thead>
          <tbody>{appl.map((a,i)=>(
            <tr key={a.id} style={{borderBottom:"1px solid #e1e3ec"}}>
              <VTD c={i+1}/>
              <td style={{padding:3}}><input value={a.name} onChange={e=>upd(a.id,"name",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={a.pp} onChange={e=>upd(a.id,"pp",e.target.value.toUpperCase())} style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace",width:90}}/></td>
              <td style={{padding:3}}><input type="date" value={a.dob} onChange={e=>upd(a.id,"dob",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={a.nat} onChange={e=>upd(a.id,"nat",e.target.value)} style={{...inp,minHeight:28,fontSize:11,width:80}}/></td>
              <td style={{padding:3}}><input value={a.country} onChange={e=>upd(a.id,"country",e.target.value)} style={{...inp,minHeight:28,fontSize:11,width:80}}/></td>
              <td style={{padding:3}}><input value={a.vtype} onChange={e=>upd(a.id,"vtype",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={a.vfsRef} onChange={e=>upd(a.id,"vfsRef",e.target.value)} style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace"}}/></td>
              <td style={{padding:3}}><input type="number" value={a.embFee} onChange={e=>upd(a.id,"embFee",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:80}}/></td>
              <td style={{padding:3}}><input type="number" value={a.vfsFee} onChange={e=>upd(a.id,"vfsFee",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:80}}/></td>
              <DBtn fn={()=>rm(a.id)}/>
            </tr>
          ))}</tbody>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label={bc(branch).cur+"Service charge"}>
            <input type="number" value={svc} onChange={e=>setSvc(+e.target.value||0)} style={{...inp,textAlign:"right"}}/>
          </FL>
          <FL label="CGST 9% ₹"><input value={fmt(cgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
          <FL label="SGST 9% ₹"><input value={fmt(sgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
        </div>
        <div style={{marginTop:9,display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          <div style={{padding:"8px 12px",background:"#E6F1FB",borderRadius:8,fontSize:11.5,color:"#185FA5"}}>
            Embassy fees (<b>{"₹ "+fmt(embTot)}</b>) and VFS fees (<b>{"₹ "+fmt(vfsTot)}</b>) are pure pass-through — not agency income. GST 18% applies only on service charge.
          </div>
          <div style={{padding:"8px 12px",background:"#f3f4f8",borderRadius:8,fontSize:11.5,color:"#5a6691"}}>
            SAC code: <b>998212</b> — Visa and passport services. Issue tax invoice showing service charge separately from pass-through fees.
          </div>
        </div>
      </div>
      <VNarr def="Being visa processing charges — Sharma Enterprises, 2 applicants, UAE Tourist 30D via VFS Dubai centre.">
        <VTot branch={branch}
          lines={[
            {l:"Embassy fees (pass-through)",v:"₹ "+fmt(embTot)},
            {l:"VFS / processing fees (pass-through)",v:"₹ "+fmt(vfsTot)},
            {l:"Agency service charge",v:"₹ "+fmt(svc)},
            {l:"CGST 9%",v:"₹ "+fmt(cgst)},
            {l:"SGST 9%",v:"₹ "+fmt(sgst)},
          ]}
          total={total}
        />
      </VNarr>
    </VWrap>
  );
}


/* ── SALES: HOTELS ───────────────────────────────────────── */

export function SalesHotel({branch,setRoute}){
  const vNo=useVNo(branch,"SHT");
  const [rows,setRows]=useState([
    {id:1,hotel:"Hyatt Regency Ahmedabad",ci:"2026-06-05",co:"2026-06-08",rtype:"Deluxe King",rooms:2,nights:3,rate:9500,meal:"CP"},
  ]);
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),hotel:"",ci:"",co:"",rtype:"Deluxe",rooms:1,nights:1,rate:0,meal:"EP"}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));

  function gstSlab(rate){
    if(rate<1000)return 0;
    if(rate<=7500)return 12;
    return 18;
  }
  const sub=rows.reduce((s,r)=>s+(+r.rate||0)*(+r.rooms||1)*(+r.nights||1),0);
  const gstAmt=rows.reduce((s,r)=>{
    const lineTotal=(+r.rate||0)*(+r.rooms||1)*(+r.nights||1);
    return s+lineTotal*gstSlab(+r.rate||0)/100;
  },0);
  const cgst=+(gstAmt/2).toFixed(2);
  const sgst=cgst;
  const total=+(sub+cgst+sgst).toFixed(2);

  const slabBg={0:"#f3f4f8",12:"#FAEEDA",18:"#FCEBEB"};
  const slabC={0:"#5a6691",12:"#854F0B",18:"#A32D2D"};
  const slabLabel={0:"0% — Nil GST (below ₹1,000/night)",12:"12% — Mid-range (₹1k–₹7.5k/night)",18:"18% — Luxury (above ₹7,500/night)"};

  return (
    <VWrap title="Sales Voucher — Hotels" icon="🏨" vNo={vNo} branch={branch} type="sales" saleMod="SHT" saleAmt={total||0} setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} name="Apex Pharma Ltd." gstin="27AAPFL9876K1Z3"/>
      <ARow label="Accommodation details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:920}}>
          <thead><tr>
            {["#","Hotel / property","Check-in","Check-out","Room type","Rooms","Nights","Rate/room/night ₹","Meal plan","GST slab","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=5&&i<=6||i===7||i===10}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const slab=gstSlab(+r.rate||0);
            const lineTotal=(+r.rate||0)*(+r.rooms||1)*(+r.nights||1);
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.hotel} onChange={e=>upd(r.id,"hotel",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input type="date" value={r.ci} onChange={e=>upd(r.id,"ci",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input type="date" value={r.co} onChange={e=>upd(r.id,"co",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input value={r.rtype} onChange={e=>upd(r.id,"rtype",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input type="number" value={r.rooms} onChange={e=>upd(r.id,"rooms",+e.target.value||1)} style={{...inp,minHeight:28,fontSize:11,width:50,textAlign:"right"}}/></td>
                <td style={{padding:3}}><input type="number" value={r.nights} onChange={e=>upd(r.id,"nights",+e.target.value||1)} style={{...inp,minHeight:28,fontSize:11,width:50,textAlign:"right"}}/></td>
                <td style={{padding:3}}><input type="number" value={r.rate} onChange={e=>upd(r.id,"rate",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
                <td style={{padding:3}}>
                  <select value={r.meal} onChange={e=>upd(r.id,"meal",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}>
                    <option>EP</option><option>CP</option><option>MAP</option><option>AP</option>
                  </select>
                </td>
                <td style={{padding:"4px 7px"}}>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:6,background:slabBg[slab],color:slabC[slab],fontWeight:600,whiteSpace:"nowrap"}}>{slab}%</span>
                </td>
                <VTD c={fmt(lineTotal)} r/>
                <DBtn fn={()=>rm(r.id)}/>
              </tr>
            );
          })}</tbody>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <p style={{margin:"0 0 9px",fontSize:10,color:"#5a6691",letterSpacing:"0.5px",textTransform:"uppercase"}}>GST summary — auto-calculated per slab</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label="CGST ₹"><input value={fmt(cgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
          <FL label="SGST ₹"><input value={fmt(sgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
          <FL label="IGST ₹"><input value={fmt(0)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
        </div>
        <div style={{marginTop:9,display:"flex",flexDirection:"column",gap:6}}>
          {[0,12,18].map(slab=>{
            const slabRows=rows.filter(r=>gstSlab(+r.rate||0)===slab);
            if(!slabRows.length)return null;
            const slabBase=slabRows.reduce((s,r)=>s+(+r.rate||0)*(+r.rooms||1)*(+r.nights||1),0);
            return (
              <div key={slab} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 11px",background:slabBg[slab],borderRadius:7,fontSize:11.5,color:slabC[slab]}}>
                <span style={{fontWeight:700,minWidth:60}}>{slab}% slab</span>
                <span>{slabLabel[slab]}</span>
                <span style={{marginLeft:"auto",fontWeight:600}}>{"₹ "+fmt(slabBase)} taxable</span>
                <span style={{fontWeight:700}}>{"₹ "+fmt(+(slabBase*slab/100).toFixed(2))} GST</span>
              </div>
            );
          })}
        </div>
      </div>
      <VNarr def="Being hotel accommodation — Apex Pharma Ltd., Hyatt Regency Ahmedabad, 2 Deluxe King rooms, 5-8 June 2026 (3 nights), CP meal plan.">
        <VTot branch={branch}
          lines={[
            {l:"Room charges",v:"₹ "+fmt(sub)},
            {l:"CGST",v:"₹ "+fmt(cgst)},
            {l:"SGST",v:"₹ "+fmt(sgst)},
          ]}
          total={total}
        />
      </VNarr>
    </VWrap>
  );
}


/* ── SALES: INSURANCE ────────────────────────────────────── */

export function SalesInsurance({branch,setRoute}){
  const vNo=useVNo(branch,"SI");
  const [rows,setRows]=useState([
    {id:1,insurer:"TATA AIG General Insurance",plan:"Travel Guard — Overseas",insured:"Rajiv Sharma",pp:"Z1234567",from:"2026-06-10",to:"2026-06-17",dest:"Bali, Indonesia",coverage:"USD 100,000",premium:4200,policy:""},
    {id:2,insurer:"TATA AIG General Insurance",plan:"Travel Guard — Overseas",insured:"Rohan",pp:"Z1234568",from:"2026-06-10",to:"2026-06-17",dest:"Bali, Indonesia",coverage:"USD 100,000",premium:4200,policy:""},
  ]);
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),insurer:"",plan:"",insured:"",pp:"",from:"",to:"",dest:"",coverage:"",premium:0,policy:""}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));
  const premTot=rows.reduce((s,r)=>s+(+r.premium||0),0);
  const taxRate=bc(branch).taxType==="GST"?0.09:(bc(branch).vatRate||18)/200;
  const cgst=+(premTot*taxRate).toFixed(2);
  const sgst=bc(branch).taxType==="GST"?cgst:0;
  const vatAmt=bc(branch).taxType!=="GST"?+(premTot*(bc(branch).vatRate||18)/100).toFixed(2):0;
  const total=+(premTot+cgst+sgst).toFixed(2);
  return (
    <VWrap title="Sales Voucher — Insurance" icon="🛡" vNo={vNo} branch={branch} type="sales" saleMod="SI" saleAmt={total||0} setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} name="Mehta &amp; Sons" gstin="24AABCM8765G1Z2"/>
      <ARow label="Policy details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:960}}>
          <thead><tr>
            {["#","Insurer","Plan / product","Insured person","Passport no.","Trip from","Trip to","Destination","Coverage","Premium ₹","Policy no.",""].map((h,i)=><VTH key={i} c={h} r={i===9}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>(
            <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
              <VTD c={i+1}/>
              <td style={{padding:3}}><input value={r.insurer} onChange={e=>upd(r.id,"insurer",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={r.plan} onChange={e=>upd(r.id,"plan",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={r.insured} onChange={e=>upd(r.id,"insured",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={r.pp} onChange={e=>upd(r.id,"pp",e.target.value.toUpperCase())} style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace",width:88}}/></td>
              <td style={{padding:3}}><input type="date" value={r.from} onChange={e=>upd(r.id,"from",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input type="date" value={r.to} onChange={e=>upd(r.id,"to",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={r.dest} onChange={e=>upd(r.id,"dest",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={r.coverage} onChange={e=>upd(r.id,"coverage",e.target.value)} style={{...inp,minHeight:28,fontSize:11,width:110}}/></td>
              <td style={{padding:3}}><input type="number" value={r.premium} onChange={e=>upd(r.id,"premium",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:80}}/></td>
              <td style={{padding:3}}><input value={r.policy} onChange={e=>upd(r.id,"policy",e.target.value)} placeholder="After issuance" style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace"}}/></td>
              <DBtn fn={()=>rm(r.id)}/>
            </tr>
          ))}</tbody>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label={bc(branch).cur+"Total premium"}><input value={fmt(premTot)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
          <FL label="CGST 9% ₹"><input value={fmt(cgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
          <FL label="SGST 9% ₹"><input value={fmt(sgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
          <FL label="Invoice total ₹"><input value={fmt(total)} readOnly style={{...inp,textAlign:"right",fontWeight:700,background:"#f3f4f8",color:"#185FA5"}}/></FL>
        </div>
        <div style={{marginTop:9,display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          <div style={{padding:"8px 12px",background:"#E6F1FB",borderRadius:8,fontSize:11.5,color:"#185FA5"}}>
            GST 18% on full premium value (SAC 997131 — Life &amp; non-life insurance). ITC available to registered buyer. Collect at time of premium payment.
          </div>
          <div style={{padding:"8px 12px",background:"#f3f4f8",borderRadius:8,fontSize:11.5,color:"#5a6691"}}>
            Commission received from insurer is also taxable at 18% and must be invoiced separately by the agency to the insurance company (reverse flow).
          </div>
        </div>
      </div>
      <VNarr def="Being travel insurance premium — TATA AIG Travel Guard Overseas, 2 pax, Bali trip 10-17 June 2026, Mehta &amp; Sons.">
        <VTot branch={branch}
          lines={[
            {l:"Total premium",v:"₹ "+fmt(premTot)},
            {l:"CGST 9%",v:"₹ "+fmt(cgst)},
            {l:"SGST 9%",v:"₹ "+fmt(sgst)},
          ]}
          total={total}
        />
      </VNarr>
    </VWrap>
  );
}


/* ── SALES: MISCELLANEOUS ────────────────────────────────── */

export function SalesMisc({branch,setRoute}){
  const vNo=useVNo(branch,"SM");
  const [rows,setRows]=useState([
    {id:1,desc:"SIM card — Airtel International Roaming",sac:"996429",qty:2,unit:"Nos",rate:999,gstPct:18},
    {id:2,desc:"Travel documentation & attestation charges",sac:"998212",qty:1,unit:"Job",rate:1500,gstPct:18},
    {id:3,desc:"Forex card issuance fee (Niyo Global)",sac:"996611",qty:1,unit:"Nos",rate:200,gstPct:18},
  ]);
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),desc:"",sac:"",qty:1,unit:"Nos",rate:0,gstPct:18}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));

  const sub=rows.reduce((s,r)=>s+(+r.rate||0)*(+r.qty||1),0);
  const gstAmt=rows.reduce((s,r)=>s+((+r.rate||0)*(+r.qty||1))*(r.gstPct/100),0);
  const total=+(sub+gstAmt).toFixed(2);

  const gstByRate={};
  rows.forEach(r=>{
    const amt=(+r.rate||0)*(+r.qty||1);
    const g=+(amt*(r.gstPct/100)).toFixed(2);
    if(!gstByRate[r.gstPct])gstByRate[r.gstPct]={taxable:0,gst:0};
    gstByRate[r.gstPct].taxable+=amt;
    gstByRate[r.gstPct].gst+=g;
  });

  const rateBg={0:"#f3f4f8",5:"#EAF3DE",12:"#FAEEDA",18:"#E6F1FB"};
  const rateC={0:"#5a6691",5:"#27500A",12:"#854F0B",18:"#185FA5"};

  return (
    <VWrap title="Sales Voucher — Miscellaneous" icon="📦" vNo={vNo} branch={branch} type="sales" saleMod="SM" saleAmt={total||0} setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} name="Sharma Enterprises Pvt. Ltd." gstin="27AABCS1234L1Z5"/>
      <ARow label="Service / item details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:820}}>
          <thead><tr>
            {["#","Description","SAC code","Qty","Unit","Rate ₹","GST %","Amount ₹","GST ₹","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=5&&i<=9}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const amt=(+r.rate||0)*(+r.qty||1);
            const g=+(amt*(r.gstPct/100)).toFixed(2);
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.desc} onChange={e=>upd(r.id,"desc",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input value={r.sac} onChange={e=>upd(r.id,"sac",e.target.value)} style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace",width:82}}/></td>
                <td style={{padding:3}}><input type="number" value={r.qty} onChange={e=>upd(r.id,"qty",+e.target.value||1)} style={{...inp,minHeight:28,fontSize:11,width:55,textAlign:"right"}}/></td>
                <td style={{padding:3}}>
                  <select value={r.unit} onChange={e=>upd(r.id,"unit",e.target.value)} style={{...inp,minHeight:28,fontSize:11,width:70}}>
                    <option>Nos</option><option>Job</option><option>Hrs</option><option>Days</option><option>Pax</option>
                  </select>
                </td>
                <td style={{padding:3}}><input type="number" value={r.rate} onChange={e=>upd(r.id,"rate",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
                <td style={{padding:3}}>
                  <select value={r.gstPct} onChange={e=>upd(r.id,"gstPct",+e.target.value)} style={{...inp,minHeight:28,fontSize:11,background:rateBg[r.gstPct],color:rateC[r.gstPct],fontWeight:600}}>
                    <option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option>
                  </select>
                </td>
                <VTD c={fmt(amt)} r/>
                <VTD c={fmt(g)} r/>
                <td style={{padding:"4px 7px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{fmt(amt+g)}</td>
                <DBtn fn={()=>rm(r.id)}/>
              </tr>
            );
          })}</tbody>
          <tfoot>
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
              <td colSpan={7} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(sub)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#27500A"}}>{fmt(gstAmt)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#185FA5"}}>{fmt(total)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <p style={{margin:"0 0 9px",fontSize:10,color:"#5a6691",letterSpacing:"0.5px",textTransform:"uppercase"}}>GST breakup by rate</p>
        <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
          {Object.entries(gstByRate).map(([rate,vals])=>(
            <div key={rate} style={{flex:1,minWidth:160,padding:"9px 13px",borderRadius:9,background:rateBg[+rate],border:"1px solid "+(rateBg[+rate])}}>
              <p style={{margin:0,fontSize:10,fontWeight:700,color:rateC[+rate],textTransform:"uppercase",letterSpacing:"0.5px"}}>{rate}% GST slab</p>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:11.5}}>
                <span style={{color:rateC[+rate]}}>Taxable</span>
                <span style={{fontWeight:600,color:rateC[+rate],fontVariantNumeric:"tabular-nums"}}>{"₹ "+fmt(vals.taxable)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11.5}}>
                <span style={{color:rateC[+rate]}}>GST</span>
                <span style={{fontWeight:700,color:rateC[+rate],fontVariantNumeric:"tabular-nums"}}>{"₹ "+fmt(vals.gst)}</span>
              </div>
            </div>
          ))}
          {Object.keys(gstByRate).length===0&&<p style={{fontSize:11.5,color:"#8b94b3",margin:0}}>Add line items above to see GST breakup.</p>}
        </div>
      </div>
      <VNarr def="Being miscellaneous travel services — SIM cards, documentation charges, forex card issuance for Sharma Enterprises Pvt. Ltd.">
        <VTot branch={branch}
          lines={[
            {l:"Sub-total (taxable)",v:"₹ "+fmt(sub)},
            {l:"Total GST",v:"₹ "+fmt(gstAmt)},
          ]}
          total={total}
        />
      </VNarr>
    </VWrap>
  );
}


/* ── SALES: CREDIT NOTES ─────────────────────────────────── */

export function SalesCreditNote({branch,setRoute}){
  const vNo=useVNo(branch,"SCN");
  const [rows,setRows]=useState([
    {id:1,origVno:"SH/2026/0018",origDate:"2026-05-01",party:"Mehta & Sons",gstin:"24AABCM8765G1Z2",reason:"Cancellation — Bali holiday package",module:"Holiday",taxable:242800,gstPct:5,gstAmt:12140,tcsAmt:12140},
  ]);
  const [cnType,setCnType]=useState("full");
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),origVno:"",origDate:"",party:"",gstin:"",reason:"",module:"Flight",taxable:0,gstPct:18,gstAmt:0,tcsAmt:0}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));

  const totTaxable=rows.reduce((s,r)=>s+(+r.taxable||0),0);
  const totGst=rows.reduce((s,r)=>s+(+r.gstAmt||0),0);
  const totTcs=rows.reduce((s,r)=>s+(+r.tcsAmt||0),0);
  const totCredit=+(totTaxable+totGst+totTcs).toFixed(2);

  const modClr={Flight:{bg:"#E6F1FB",c:"#185FA5"},Holiday:{bg:"#EAF3DE",c:"#27500A"},Hotel:{bg:"#FAEEDA",c:"#854F0B"},Car:{bg:"#F3E8FF",c:"#5B21B6"},Visa:{bg:"#FCEBEB",c:"#A32D2D"},Insurance:{bg:"#FEF3C7",c:"#92400E"},Misc:{bg:"#f3f4f8",c:"#5a6691"}};

  return (
    <VWrap title="Sales Credit Note" icon="📋" vNo={vNo} branch={branch} type="sales" saleMod="SCN" saleAmt={totCredit||0} setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label="Credit note type">
            <select value={cnType} onChange={e=>setCnType(e.target.value)} style={inp}>
              <option value="full">Full cancellation</option>
              <option value="partial">Partial / amendment</option>
              <option value="discount">Post-sale discount</option>
              <option value="return">Service return</option>
            </select>
          </FL>
          <FL label="Against original invoice"><input defaultValue="SH/2026/0018" style={inp}/></FL>
          <FL label="Reason code">
            <select style={inp}>
              <option>01 — Sales return</option>
              <option>02 — Post-sale discount</option>
              <option>03 — Deficiency in services</option>
              <option>04 — Correction in invoice</option>
              <option>05 — Change in POS</option>
            </select>
          </FL>
        </div>
      </div>
      <ARow label="Credit note lines" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:960}}>
          <thead><tr>
            {["#","Original voucher","Date","Party / GSTIN","Reason","Module","Taxable ₹","GST %","GST reversed ₹","TCS reversed ₹","Total credit ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=6&&i<=10}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const mc=modClr[r.module]||modClr.Misc;
            const lineTotal=(+r.taxable||0)+(+r.gstAmt||0)+(+r.tcsAmt||0);
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.origVno} onChange={e=>upd(r.id,"origVno",e.target.value)} style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace",width:110}}/></td>
                <td style={{padding:3}}><input type="date" value={r.origDate} onChange={e=>upd(r.id,"origDate",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}>
                  <input value={r.party} onChange={e=>upd(r.id,"party",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/>
                  <input value={r.gstin} onChange={e=>upd(r.id,"gstin",e.target.value.toUpperCase())} placeholder="GSTIN" style={{...inp,minHeight:24,fontSize:10,fontFamily:"monospace",marginTop:2}}/>
                </td>
                <td style={{padding:3}}><input value={r.reason} onChange={e=>upd(r.id,"reason",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}>
                  <select value={r.module} onChange={e=>upd(r.id,"module",e.target.value)} style={{...inp,minHeight:28,fontSize:11,background:mc.bg,color:mc.c,fontWeight:600}}>
                    {["Flight","Holiday","Hotel","Car","Visa","Insurance","Misc"].map(m=><option key={m}>{m}</option>)}
                  </select>
                </td>
                <td style={{padding:3}}><input type="number" value={r.taxable} onChange={e=>upd(r.id,"taxable",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
                <td style={{padding:3}}>
                  <select value={r.gstPct} onChange={e=>upd(r.id,"gstPct",+e.target.value)} style={{...inp,minHeight:28,fontSize:11,width:65}}>
                    {[0,5,12,18].map(p=><option key={p} value={p}>{p}%</option>)}
                  </select>
                </td>
                <td style={{padding:3}}><input type="number" value={r.gstAmt} onChange={e=>upd(r.id,"gstAmt",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
                <td style={{padding:3}}><input type="number" value={r.tcsAmt} onChange={e=>upd(r.id,"tcsAmt",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
                <td style={{padding:"4px 7px",textAlign:"right",fontWeight:700,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>({fmt(lineTotal)})</td>
                <DBtn fn={()=>rm(r.id)}/>
              </tr>
            );
          })}</tbody>
          <tfoot>
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
              <td colSpan={6} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Total credit</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#A32D2D"}}>({fmt(totTaxable)})</td>
              <td/>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#A32D2D"}}>({fmt(totGst)})</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#A32D2D"}}>({fmt(totTcs)})</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#A32D2D"}}>({fmt(totCredit)})</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          <div style={{padding:"9px 13px",background:"#FCEBEB",border:"1px solid #F7C1C1",borderRadius:9,fontSize:11.5,color:"#A32D2D"}}>
            Credit notes reduce the supplier output GST liability. Buyer must also reverse corresponding ITC claimed against the original invoice. Link this CN to original invoice in GSTR-1 (Table 9B).
          </div>
          <div style={{padding:"9px 13px",background:"#FAEEDA",border:"1px solid #FAC775",borderRadius:9,fontSize:11.5,color:"#854F0B"}}>
            TCS reversed: If original invoice collected TCS under 206C(1G), the credit note must also reverse TCS proportionately. Issue revised Form 27D to buyer after reversal.
          </div>
        </div>
      </div>
      <VNarr def="Being credit note issued against SH/2026/0018 — full cancellation of Bali holiday package, Mehta & Sons, with GST and TCS reversal.">
        <div style={{background:"#FCEBEB",border:"1px solid #F7C1C1",borderRadius:10,padding:14}}>
          <p style={{margin:"0 0 6px",fontSize:12,fontWeight:600,color:"#A32D2D"}}>Total credit note value</p>
          <p style={{margin:"0 0 8px",fontSize:26,fontWeight:800,color:"#A32D2D",fontVariantNumeric:"tabular-nums",letterSpacing:"-0.02em"}}>({bc(branch).cur+fmt(totCredit)})</p>
          <div style={{display:"flex",flexDirection:"column",gap:3,fontSize:11}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#854F0B"}}>Taxable reversed</span><span style={{color:"#A32D2D",fontWeight:600}}>({fmt(totTaxable)})</span></div>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#854F0B"}}>GST reversed</span><span style={{color:"#A32D2D",fontWeight:600}}>({fmt(totGst)})</span></div>
            {totTcs>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#854F0B"}}>TCS reversed</span><span style={{color:"#A32D2D",fontWeight:600}}>({fmt(totTcs)})</span></div>}
          </div>
        </div>
      </VNarr>
    </VWrap>
  );
}


/* ── PURCHASE: FLIGHT TICKETS ────────────────────────────── */

export function PurchaseFlight({branch,setRoute}){
  const vNo=useVNo(branch,"PF");
  const [pax,setPax]=useState([
    {id:1,name:"Mr. Rajiv Sharma",ticket:"098-2156789012",airline:"Air India",sector:"BOM-DXB",cls:"Economy",date:"2026-05-28",base:18500,taxes:3800},
    {id:2,name:"Mrs. Rohan",ticket:"098-2156789013",airline:"Air India",sector:"BOM-DXB",cls:"Economy",date:"2026-05-28",base:18500,taxes:3800},
  ]);
  const upd=(id,k,v)=>setPax(ps=>ps.map(p=>p.id===id?{...p,[k]:v}:p));
  const add=()=>setPax(ps=>[...ps,{id:Date.now(),name:"",ticket:"",airline:"",sector:"",cls:"Economy",date:"",base:0,taxes:0}]);
  const rm=id=>setPax(ps=>ps.filter(p=>p.id!==id));
  const totalBase=pax.reduce((s,p)=>s+(+p.base||0),0);
  const totalTax=pax.reduce((s,p)=>s+(+p.taxes||0),0);
  const total=+(totalBase+totalTax).toFixed(2);
  return (
    <VWrap title="Purchase Voucher — Flight Tickets" icon="✈" vNo={vNo} branch={branch} type="purchase" setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} label="Supplier" name="BSP India (IATA)" gstin="07AABSB5678C1Z9"/>
      <ARow label="Ticket cost details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:860}}>
          <thead><tr>
            {["#","Passenger","Ticket no.","Airline","Sector","Class","Date","Base cost ₹","Taxes ₹","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=7&&i<=9}/>)}
          </tr></thead>
          <tbody>{pax.map((p,i)=>(
            <tr key={p.id} style={{borderBottom:"1px solid #e1e3ec"}}>
              <VTD c={i+1}/>
              <td style={{padding:3}}><input value={p.name} onChange={e=>upd(p.id,"name",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={p.ticket} onChange={e=>upd(p.id,"ticket",e.target.value)} style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace"}}/></td>
              <td style={{padding:3}}><input value={p.airline} onChange={e=>upd(p.id,"airline",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={p.sector} onChange={e=>upd(p.id,"sector",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}>
                <select value={p.cls} onChange={e=>upd(p.id,"cls",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}>
                  <option>Economy</option><option>Premium Economy</option><option>Business</option><option>First</option>
                </select>
              </td>
              <td style={{padding:3}}><input type="date" value={p.date} onChange={e=>upd(p.id,"date",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input type="number" value={p.base} onChange={e=>upd(p.id,"base",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
              <td style={{padding:3}}><input type="number" value={p.taxes} onChange={e=>upd(p.id,"taxes",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
              <VTD c={fmt((+p.base||0)+(+p.taxes||0))} r/>
              <DBtn fn={()=>rm(p.id)}/>
            </tr>
          ))}</tbody>
          <tfoot>
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
              <td colSpan={7} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(totalBase)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(totalTax)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#185FA5"}}>{fmt(total)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          <div style={{padding:"8px 12px",background:"#EAF3DE",borderRadius:8,fontSize:11.5,color:"#27500A"}}>
            Accounting: <b>Dr Flight Ticket Purchase</b> &nbsp;|&nbsp; <b>Cr BSP India / Airline ledger</b>. Base fare and taxes are both cost — no GST on ticket purchase side.
          </div>
          <div style={{padding:"8px 12px",background:"#f3f4f8",borderRadius:8,fontSize:11.5,color:"#5a6691"}}>
            Input GST applicable only on GDS charges or agency service fees billed separately by the supplier — not on ticket base fare or airline taxes.
          </div>
        </div>
      </div>
      <VNarr def="Being air ticket cost purchased via BSP — Air India BOM-DXB, 2 pax Economy, departure 28 May 2026.">
        <VTot branch={branch}
          lines={[
            {l:"Net ticket cost (base fare)",v:"₹ "+fmt(totalBase)},
            {l:"Airline taxes & surcharges",v:"₹ "+fmt(totalTax)},
          ]}
          total={total}
        />
      </VNarr>
    </VWrap>
  );
}

/* ── PURCHASE: HOLIDAY PACKAGES ──────────────────────────── */

export function PurchaseHoliday({branch,setRoute}){
  const vNo=useVNo(branch,"PH");
  const [rows,setRows]=useState([
    {id:1,dmc:"Bali Tours DMC",pkg:"Bali Land Package 7N/8D",dest:"Bali, Indonesia",pax:2,dept:"2026-06-10",rtrn:"2026-06-17",cost:140000,currency:"USD",forex:84.5},
  ]);
  const [inputGst,setInputGst]=useState(false);
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),dmc:"",pkg:"",dest:"",pax:1,dept:"",rtrn:"",cost:0,currency:"USD",forex:84.5}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));
  const total=rows.reduce((s,r)=>s+(+r.cost||0),0);
  return (
    <VWrap title="Purchase Voucher — Holiday Packages" icon="🌴" vNo={vNo} branch={branch} type="purchase" setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} label="DMC / Supplier" name="Bali Tours DMC" gstin=""/>
      <ARow label="Package purchase lines" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:880}}>
          <thead><tr>
            {["#","DMC / Supplier","Package name","Destination","Pax","Dept.","Return","Currency","Forex rate","Cost ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=8&&i<=9}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>(
            <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
              <VTD c={i+1}/>
              <td style={{padding:3}}><input value={r.dmc} onChange={e=>upd(r.id,"dmc",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={r.pkg} onChange={e=>upd(r.id,"pkg",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={r.dest} onChange={e=>upd(r.id,"dest",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input type="number" value={r.pax} onChange={e=>upd(r.id,"pax",+e.target.value||1)} style={{...inp,minHeight:28,fontSize:11,width:50,textAlign:"right"}}/></td>
              <td style={{padding:3}}><input type="date" value={r.dept} onChange={e=>upd(r.id,"dept",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input type="date" value={r.rtrn} onChange={e=>upd(r.id,"rtrn",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}>
                <select value={r.currency} onChange={e=>upd(r.id,"currency",e.target.value)} style={{...inp,minHeight:28,fontSize:11,width:70}}>
                  {["USD","EUR","GBP","AED","SGD","KES","TZS","INR"].map(c=><option key={c}>{c}</option>)}
                </select>
              </td>
              <td style={{padding:3}}><input type="number" value={r.forex} onChange={e=>upd(r.id,"forex",+e.target.value||1)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:70}}/></td>
              <td style={{padding:3}}><input type="number" value={r.cost} onChange={e=>upd(r.id,"cost",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
              <DBtn fn={()=>rm(r.id)}/>
            </tr>
          ))}</tbody>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label="Input GST claimable">
            <select value={inputGst?"yes":"no"} onChange={e=>setInputGst(e.target.value==="yes")} style={inp}>
              <option value="no">No — overseas DMC (no GST)</option>
              <option value="yes">Yes — Indian supplier with GST</option>
            </select>
          </FL>
          <FL label="Input GST ₹"><input value={inputGst?fmt(+(total*0.05).toFixed(2)):"0.00"} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
        </div>
        <div style={{marginTop:9,padding:"8px 12px",background:"#E6F1FB",borderRadius:8,fontSize:11.5,color:"#185FA5"}}>
          Accounting: <b>Dr Tour Package Purchase</b> &nbsp;|&nbsp; <b>Cr DMC / Supplier ledger</b>. For overseas DMCs, no input GST. For domestic Indian suppliers, claim input GST if invoice provided.
        </div>
      </div>
      <VNarr def="Being Bali land package cost from Bali Tours DMC — 2 pax, 7N/8D, departure 10 June 2026.">
        <VTot branch={branch} lines={[{l:"Package cost",v:"₹ "+fmt(total)}]} total={total}/>
      </VNarr>
    </VWrap>
  );
}

/* ── PURCHASE: HOTELS ────────────────────────────────────── */

export function PurchaseHotelVoucher({branch,setRoute}){
  const vNo=useVNo(branch,"PHT");
  const [rows,setRows]=useState([
    {id:1,hotel:"Hyatt Regency Ahmedabad",ci:"2026-06-05",co:"2026-06-08",rtype:"Deluxe King",rooms:2,nights:3,rate:8000,meal:"CP"},
  ]);
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),hotel:"",ci:"",co:"",rtype:"Deluxe",rooms:1,nights:1,rate:0,meal:"EP"}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));

  function gstSlab(rate){ if(rate<1000)return 0; if(rate<=7500)return 12; return 18; }

  const sub=rows.reduce((s,r)=>s+(+r.rate||0)*(+r.rooms||1)*(+r.nights||1),0);
  const inputGst=rows.reduce((s,r)=>{
    const lineTotal=(+r.rate||0)*(+r.rooms||1)*(+r.nights||1);
    return s+lineTotal*gstSlab(+r.rate||0)/100;
  },0);
  const total=+(sub+inputGst).toFixed(2);
  const slabBg={0:"#f3f4f8",12:"#FAEEDA",18:"#FCEBEB"};
  const slabC={0:"#5a6691",12:"#854F0B",18:"#A32D2D"};

  return (
    <VWrap title="Purchase Voucher — Hotels" icon="🏨" vNo={vNo} branch={branch} type="purchase" setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} label="Hotel / Supplier" name="Hyatt Regency Ahmedabad" gstin="24AABCH7890J1Z5"/>
      <ARow label="Hotel purchase lines" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
          <thead><tr>
            {["#","Hotel","Check-in","Check-out","Room type","Rooms","Nights","Rate/room ₹","Meal","GST slab","Input GST ₹","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=5&&i<=6||i>=10}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const slab=gstSlab(+r.rate||0);
            const lineBase=(+r.rate||0)*(+r.rooms||1)*(+r.nights||1);
            const lineGst=+(lineBase*slab/100).toFixed(2);
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.hotel} onChange={e=>upd(r.id,"hotel",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input type="date" value={r.ci} onChange={e=>upd(r.id,"ci",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input type="date" value={r.co} onChange={e=>upd(r.id,"co",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input value={r.rtype} onChange={e=>upd(r.id,"rtype",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input type="number" value={r.rooms} onChange={e=>upd(r.id,"rooms",+e.target.value||1)} style={{...inp,minHeight:28,fontSize:11,width:50,textAlign:"right"}}/></td>
                <td style={{padding:3}}><input type="number" value={r.nights} onChange={e=>upd(r.id,"nights",+e.target.value||1)} style={{...inp,minHeight:28,fontSize:11,width:50,textAlign:"right"}}/></td>
                <td style={{padding:3}}><input type="number" value={r.rate} onChange={e=>upd(r.id,"rate",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
                <td style={{padding:3}}>
                  <select value={r.meal} onChange={e=>upd(r.id,"meal",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}>
                    <option>EP</option><option>CP</option><option>MAP</option><option>AP</option>
                  </select>
                </td>
                <td style={{padding:"4px 7px"}}>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:6,background:slabBg[slab],color:slabC[slab],fontWeight:600,whiteSpace:"nowrap"}}>{slab}%</span>
                </td>
                <VTD c={fmt(lineGst)} r/>
                <VTD c={fmt(lineBase+lineGst)} r/>
                <DBtn fn={()=>rm(r.id)}/>
              </tr>
            );
          })}</tbody>
          <tfoot>
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
              <td colSpan={10} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#27500A"}}>{fmt(inputGst)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#185FA5"}}>{fmt(total)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{padding:"8px 12px",background:"#EAF3DE",borderRadius:8,fontSize:11.5,color:"#27500A"}}>
          Accounting: <b>Dr Hotel Purchase</b> &nbsp;|&nbsp; <b>Dr Input CGST / SGST</b> &nbsp;|&nbsp; <b>Cr Hotel / Supplier ledger</b>. ITC on hotel stays claimable only for business travel — not for personal or exempt use.
        </div>
      </div>
      <VNarr def="Being hotel room charges — Hyatt Regency Ahmedabad, 2 Deluxe King rooms, 3 nights, 5-8 June 2026, with input GST claim.">
        <VTot branch={branch}
          lines={[
            {l:"Room charges (taxable)",v:"₹ "+fmt(sub)},
            {l:"Input GST (ITC claim)",v:"₹ "+fmt(inputGst)},
          ]}
          total={total}
        />
      </VNarr>
    </VWrap>
  );
}

/* ── PURCHASE: VISAS ─────────────────────────────────────── */

export function PurchaseVisa({branch,setRoute}){
  const vNo=useVNo(branch,"PV");
  const [rows,setRows]=useState([
    {id:1,applicant:"Rajiv Sharma",pp:"Z1234567",country:"UAE",ftype:"Embassy fee",supplier:"UAE Embassy — VFS Dubai",ref:"VFS-DXB-112233",amount:4800,currency:"INR"},
    {id:2,applicant:"Rohan",pp:"Z1234568",country:"UAE",ftype:"VFS service fee",supplier:"VFS Global Services",ref:"VFS-DXB-112234",amount:1800,currency:"INR"},
  ]);
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),applicant:"",pp:"",country:"",ftype:"Embassy fee",supplier:"",ref:"",amount:0,currency:"INR"}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));

  const embTotal=rows.filter(r=>r.ftype==="Embassy fee").reduce((s,r)=>s+(+r.amount||0),0);
  const vfsTotal=rows.filter(r=>r.ftype!=="Embassy fee").reduce((s,r)=>s+(+r.amount||0),0);
  const total=rows.reduce((s,r)=>s+(+r.amount||0),0);

  const ftypeBg={"Embassy fee":{bg:"#E6F1FB",c:"#185FA5"},"VFS service fee":{bg:"#FAEEDA",c:"#854F0B"},"TLS fee":{bg:"#F3E8FF",c:"#5B21B6"},"Govt. processing fee":{bg:"#EAF3DE",c:"#27500A"}};

  return (
    <VWrap title="Purchase Voucher — Visas" icon="🛂" vNo={vNo} branch={branch} type="purchase" setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} label="Primary Supplier" name="VFS Global Services" gstin="27AABVV4321F1Z6"/>
      <ARow label="Visa fee payment lines" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
          <thead><tr>
            {["#","Applicant","Passport","Country","Fee type","Supplier / payee","Reference","Currency","Amount ₹",""].map((h,i)=><VTH key={i} c={h} r={i===8}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const fc=ftypeBg[r.ftype]||{bg:"#f3f4f8",c:"#5a6691"};
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.applicant} onChange={e=>upd(r.id,"applicant",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input value={r.pp} onChange={e=>upd(r.id,"pp",e.target.value.toUpperCase())} style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace",width:88}}/></td>
                <td style={{padding:3}}><input value={r.country} onChange={e=>upd(r.id,"country",e.target.value)} style={{...inp,minHeight:28,fontSize:11,width:70}}/></td>
                <td style={{padding:3}}>
                  <select value={r.ftype} onChange={e=>upd(r.id,"ftype",e.target.value)} style={{...inp,minHeight:28,fontSize:11,background:fc.bg,color:fc.c,fontWeight:600}}>
                    <option>Embassy fee</option><option>VFS service fee</option><option>TLS fee</option><option>Govt. processing fee</option>
                  </select>
                </td>
                <td style={{padding:3}}><input value={r.supplier} onChange={e=>upd(r.id,"supplier",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input value={r.ref} onChange={e=>upd(r.id,"ref",e.target.value)} style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace"}}/></td>
                <td style={{padding:3}}>
                  <select value={r.currency} onChange={e=>upd(r.id,"currency",e.target.value)} style={{...inp,minHeight:28,fontSize:11,width:70}}>
                    {["INR","USD","EUR","AED","GBP"].map(c=><option key={c}>{c}</option>)}
                  </select>
                </td>
                <td style={{padding:3}}><input type="number" value={r.amount} onChange={e=>upd(r.id,"amount",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
                <DBtn fn={()=>rm(r.id)}/>
              </tr>
            );
          })}</tbody>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:9}}>
          {[
            {l:"Embassy fees",v:"₹ "+fmt(embTotal),bg:"#E6F1FB",c:"#185FA5"},
            {l:"VFS / processing fees",v:"₹ "+fmt(vfsTotal),bg:"#FAEEDA",c:"#854F0B"},
            {l:"Total outflow",v:"₹ "+fmt(total),bg:"#f3f4f8",c:"#384677"},
            {l:"Input GST",v:"Nil — pass-through",bg:"#EAF3DE",c:"#27500A"},
          ].map((s,i)=>(
            <div key={i} style={{background:s.bg,borderRadius:9,padding:"9px 13px"}}>
              <p style={{margin:0,fontSize:9.5,color:s.c,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>{s.l}</p>
              <p style={{margin:"3px 0 0",fontSize:14,fontWeight:700,color:s.c}}>{s.v}</p>
            </div>
          ))}
        </div>
        <div style={{padding:"8px 12px",background:"#E6F1FB",borderRadius:8,fontSize:11.5,color:"#185FA5"}}>
          All visa fees are pure pass-through costs — no input GST to claim. Accounting: <b>Dr Visa Fee Expense</b> &nbsp;|&nbsp; <b>Cr Bank / Cash</b>. Record each fee separately against its payee ledger.
        </div>
      </div>
      <VNarr def="Being visa fees paid to UAE Embassy via VFS Global — 2 applicants, UAE Tourist 30D, pass-through recovery from Sharma Enterprises.">
        <VTot branch={branch}
          lines={[
            {l:"Embassy fees (Dr Visa Fee A/c)",v:"₹ "+fmt(embTotal)},
            {l:"VFS / processing fees",v:"₹ "+fmt(vfsTotal)},
          ]}
          total={total}
        />
      </VNarr>
    </VWrap>
  );
}


/* ── RECEIPT VOUCHER ─────────────────────────────────────── */

/* ── Voucher helper constants ─────────────────────────────────── */

export function PurchaseCar({branch,setRoute}){
  const vNo=useVNo(branch,"PC");
  const [rows,setRows]=useState([
    {id:1,vendor:"Mombasa Car Hire Kenya",vehicle:"Toyota Land Cruiser",type:"SUV",pickup:"Nairobi Airport",drop:"Nairobi Airport",days:3,rate:8500,currency:"KES",km:0,drv:0},
    {id:2,vendor:"Riya Travels Mumbai",vehicle:"Toyota Innova Crysta",type:"MUV",pickup:"BOM T2",drop:"Pune Station",days:1,rate:4500,currency:"INR",km:0,drv:500},
  ]);
  const [gstScheme,setGstScheme]=useState("5");
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),vendor:"",vehicle:"",type:"Sedan",pickup:"",drop:"",days:1,rate:0,currency:"INR",km:0,drv:0}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));
  const sub=rows.reduce((s,r)=>s+(+r.rate||0)*(+r.days||1)+(+r.km||0)+(+r.drv||0),0);
  const gstPct=+gstScheme;
  const inputCgst=+(sub*gstPct/200).toFixed(2);
  const inputSgst=inputCgst;
  const total=+(sub+inputCgst+inputSgst).toFixed(2);
  return (
    <VWrap title="Purchase Voucher — Car Rentals" icon="🚗" vNo={vNo} branch={branch} type="purchase" setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} label="Supplier / Transport Co." name="Mombasa Car Hire Kenya" gstin=""/>
      <ARow label="Vehicle hire details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:920}}>
          <thead><tr>
            {["#","Vendor","Vehicle","Type","Pickup","Drop","Days","Currency","Rate/day","Extra km","Driver","Total",""].map((h,i)=><VTH key={i} c={h} r={i>=8&&i<=11}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const rowTotal=(+r.rate||0)*(+r.days||1)+(+r.km||0)+(+r.drv||0);
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.vendor} onChange={e=>upd(r.id,"vendor",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input value={r.vehicle} onChange={e=>upd(r.id,"vehicle",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}>
                  <select value={r.type} onChange={e=>upd(r.id,"type",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}>
                    <option>Sedan</option><option>MUV</option><option>SUV</option><option>Tempo</option><option>Bus</option>
                  </select>
                </td>
                <td style={{padding:3}}><input value={r.pickup} onChange={e=>upd(r.id,"pickup",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input value={r.drop} onChange={e=>upd(r.id,"drop",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input type="number" value={r.days} onChange={e=>upd(r.id,"days",+e.target.value||1)} style={{...inp,minHeight:28,fontSize:11,width:50,textAlign:"right"}}/></td>
                <td style={{padding:3}}>
                  <select value={r.currency} onChange={e=>upd(r.id,"currency",e.target.value)} style={{...inp,minHeight:28,fontSize:11,width:70}}>
                    {["INR","KES","TZS","USD","AED"].map(c=><option key={c}>{c}</option>)}
                  </select>
                </td>
                <td style={{padding:3}}><input type="number" value={r.rate} onChange={e=>upd(r.id,"rate",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
                <td style={{padding:3}}><input type="number" value={r.km} onChange={e=>upd(r.id,"km",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:70}}/></td>
                <td style={{padding:3}}><input type="number" value={r.drv} onChange={e=>upd(r.id,"drv",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:70}}/></td>
                <VTD c={fmt(rowTotal)} r/>
                <DBtn fn={()=>rm(r.id)}/>
              </tr>
            );
          })}</tbody>
          <tfoot>
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
              <td colSpan={11} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#185FA5"}}>{fmt(sub)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label="Input GST scheme">
            <select value={gstScheme} onChange={e=>setGstScheme(e.target.value)} style={inp}>
              <option value="5">5% — No ITC (Indian vendors)</option>
              <option value="12">12% — With ITC (B2B registered)</option>
              <option value="0">0% — Overseas / no GST</option>
            </select>
          </FL>
          <FL label={"Input CGST "+gstPct/2+"% ₹"}><input value={gstPct>0?fmt(inputCgst):"0.00"} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
          <FL label={"Input SGST "+gstPct/2+"% ₹"}><input value={gstPct>0?fmt(inputSgst):"0.00"} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
        </div>
        <div style={{marginTop:9,display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          <div style={{padding:"8px 12px",background:"#EAF3DE",borderRadius:8,fontSize:11.5,color:"#27500A"}}>
            Accounting: <b>Dr Car Hire Expense</b> + <b>Dr Input CGST/SGST</b> | <b>Cr Vendor ledger</b>. TDS 194C applicable — deduct 1% (individual) or 2% (company) on payments above threshold.
          </div>
          <div style={{padding:"8px 12px",background:"#f3f4f8",borderRadius:8,fontSize:11.5,color:"#5a6691"}}>
            For overseas vendors (Kenya/Tanzania/DRC), no Indian GST applies. Book cost in respective foreign currency and record forex gain/loss on settlement.
          </div>
        </div>
      </div>
      <VNarr def="Being car hire charges — Land Cruiser Nairobi 3 days + Innova BOM-Pune 1 day, May 2026.">
        <VTot branch={branch}
          lines={[
            {l:"Hire charges (base)",v:"₹ "+fmt(sub)},
            {l:"Input CGST "+gstPct/2+"%",v:"₹ "+fmt(gstPct>0?inputCgst:0)},
            {l:"Input SGST "+gstPct/2+"%",v:"₹ "+fmt(gstPct>0?inputSgst:0)},
          ]}
          total={gstPct>0?total:sub}
        />
      </VNarr>
    </VWrap>
  );
}

/* ── PURCHASE: INSURANCE ─────────────────────────────────── */

export function PurchaseInsurance({branch,setRoute}){
  const vNo=useVNo(branch,"PI");
  const [rows,setRows]=useState([
    {id:1,insurer:"TATA AIG General Insurance",plan:"Travel Guard — Overseas",insured:"Rajiv Sharma",pp:"Z1234567",from:"2026-06-10",to:"2026-06-17",coverage:"USD 100,000",premium:3500,commission:700,policy:""},
    {id:2,insurer:"TATA AIG General Insurance",plan:"Travel Guard — Overseas",insured:"Rohan",pp:"Z1234568",from:"2026-06-10",to:"2026-06-17",coverage:"USD 100,000",premium:3500,commission:700,policy:""},
  ]);
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),insurer:"",plan:"",insured:"",pp:"",from:"",to:"",coverage:"",premium:0,commission:0,policy:""}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));
  const premTot=rows.reduce((s,r)=>s+(+r.premium||0),0);
  const commTot=rows.reduce((s,r)=>s+(+r.commission||0),0);
  const inputGst=+(premTot*0.18).toFixed(2);
  const netPay=+(premTot-commTot).toFixed(2);
  return (
    <VWrap title="Purchase Voucher — Insurance" icon="🛡" vNo={vNo} branch={branch} type="purchase" setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} label="Insurer / Supplier" name="TATA AIG General Insurance" gstin="27AABCT1234G1Z5"/>
      <ARow label="Policy purchase details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:980}}>
          <thead><tr>
            {["#","Insurer","Plan","Insured","Passport","From","To","Coverage","Net premium ₹","Commission ₹","Policy no.",""].map((h,i)=><VTH key={i} c={h} r={i>=8&&i<=9}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>(
            <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
              <VTD c={i+1}/>
              <td style={{padding:3}}><input value={r.insurer} onChange={e=>upd(r.id,"insurer",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={r.plan} onChange={e=>upd(r.id,"plan",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={r.insured} onChange={e=>upd(r.id,"insured",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={r.pp} onChange={e=>upd(r.id,"pp",e.target.value.toUpperCase())} style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace",width:88}}/></td>
              <td style={{padding:3}}><input type="date" value={r.from} onChange={e=>upd(r.id,"from",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input type="date" value={r.to} onChange={e=>upd(r.id,"to",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={r.coverage} onChange={e=>upd(r.id,"coverage",e.target.value)} style={{...inp,minHeight:28,fontSize:11,width:110}}/></td>
              <td style={{padding:3}}><input type="number" value={r.premium} onChange={e=>upd(r.id,"premium",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:80}}/></td>
              <td style={{padding:3}}><input type="number" value={r.commission} onChange={e=>upd(r.id,"commission",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:80}}/></td>
              <td style={{padding:3}}><input value={r.policy} onChange={e=>upd(r.id,"policy",e.target.value)} placeholder="After issuance" style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace"}}/></td>
              <DBtn fn={()=>rm(r.id)}/>
            </tr>
          ))}</tbody>
          <tfoot>
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
              <td colSpan={8} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12}}>{fmt(premTot)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#27500A"}}>{fmt(commTot)}</td>
              <td colSpan={2}/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11,marginBottom:9}}>
          <FL label={bc(branch).cur+"Total premium"}><input value={fmt(premTot)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
          <FL label="Commission earned ₹"><input value={fmt(commTot)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#27500A",fontWeight:600}}/></FL>
          <FL label="Input GST 18% ₹"><input value={fmt(inputGst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
          <FL label="Net payable to insurer ₹"><input value={fmt(netPay)} readOnly style={{...inp,textAlign:"right",fontWeight:700,background:"#f3f4f8",color:"#185FA5"}}/></FL>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          <div style={{padding:"8px 12px",background:"#EAF3DE",borderRadius:8,fontSize:11.5,color:"#27500A"}}>
            Accounting: <b>Dr Insurance Premium Expense</b> + <b>Dr Input CGST/SGST 9%</b> | <b>Cr Insurer ledger</b>. Commission credit to <b>Commission Income A/c</b> — taxable at 18% (issue separate invoice to insurer).
          </div>
          <div style={{padding:"8px 12px",background:"#E6F1FB",borderRadius:8,fontSize:11.5,color:"#185FA5"}}>
            TDS 194D applies on commission received from insurer. Deduct 5% TDS on commission income above threshold. Commission is agency income — book separately from premium pass-through.
          </div>
        </div>
      </div>
      <VNarr def="Being travel insurance premium purchase — TATA AIG Travel Guard Overseas, 2 pax, Bali trip 10-17 June 2026. Commission 20% deducted.">
        <VTot branch={branch}
          lines={[
            {l:"Gross premium",v:"₹ "+fmt(premTot)},
            {l:"Less: Commission earned",v:"(₹ "+fmt(commTot)+")"},
            {l:"Input GST 18% (ITC claim)",v:"₹ "+fmt(inputGst)},
          ]}
          total={+(netPay+inputGst).toFixed(2)}
        />
      </VNarr>
    </VWrap>
  );
}

/* ── PURCHASE: MISCELLANEOUS ─────────────────────────────── */

export function PurchaseMisc({branch,setRoute}){
  const vNo=useVNo(branch,"PM");
  const [rows,setRows]=useState([
    {id:1,vendor:"Airtel Business",desc:"International SIM cards x10",sac:"996429",qty:10,unit:"Nos",rate:850,gstPct:18,tds:false},
    {id:2,vendor:"Singh Stationery",desc:"Office stationery & printing",sac:"996812",qty:1,unit:"Job",rate:3200,gstPct:18,tds:false},
    {id:3,vendor:"M/s Cleantech Services",desc:"Office housekeeping — May",sac:"998531",qty:1,unit:"Month",rate:12000,gstPct:18,tds:true},
  ]);
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),vendor:"",desc:"",sac:"",qty:1,unit:"Nos",rate:0,gstPct:18,tds:false}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));

  const sub=rows.reduce((s,r)=>s+(+r.rate||0)*(+r.qty||1),0);
  const inputGst=rows.reduce((s,r)=>s+((+r.rate||0)*(+r.qty||1))*(r.gstPct/100),0);
  const tdsAmt=rows.filter(r=>r.tds).reduce((s,r)=>s+((+r.rate||0)*(+r.qty||1))*0.02,0);
  const total=+(sub+inputGst).toFixed(2);

  const gstByRate={};
  rows.forEach(r=>{
    const amt=(+r.rate||0)*(+r.qty||1);
    if(!gstByRate[r.gstPct])gstByRate[r.gstPct]={taxable:0,gst:0};
    gstByRate[r.gstPct].taxable+=amt;
    gstByRate[r.gstPct].gst+=+(amt*r.gstPct/100).toFixed(2);
  });
  const rateBg={0:"#f3f4f8",5:"#EAF3DE",12:"#FAEEDA",18:"#E6F1FB"};
  const rateC={0:"#5a6691",5:"#27500A",12:"#854F0B",18:"#185FA5"};

  return (
    <VWrap title="Purchase Voucher — Miscellaneous" icon="📦" vNo={vNo} branch={branch} type="purchase" setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} label="Primary Supplier" name="Various / Multiple" gstin=""/>
      <ARow label="Expense / purchase lines" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
          <thead><tr>
            {["#","Vendor","Description","SAC","Qty","Unit","Rate ₹","GST %","Amount ₹","Input GST ₹","TDS?","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=6&&i<=11}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const amt=(+r.rate||0)*(+r.qty||1);
            const gst=+(amt*r.gstPct/100).toFixed(2);
            const tdsLine=r.tds?+(amt*0.02).toFixed(2):0;
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.vendor} onChange={e=>upd(r.id,"vendor",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input value={r.desc} onChange={e=>upd(r.id,"desc",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input value={r.sac} onChange={e=>upd(r.id,"sac",e.target.value)} style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace",width:82}}/></td>
                <td style={{padding:3}}><input type="number" value={r.qty} onChange={e=>upd(r.id,"qty",+e.target.value||1)} style={{...inp,minHeight:28,fontSize:11,width:55,textAlign:"right"}}/></td>
                <td style={{padding:3}}>
                  <select value={r.unit} onChange={e=>upd(r.id,"unit",e.target.value)} style={{...inp,minHeight:28,fontSize:11,width:72}}>
                    <option>Nos</option><option>Job</option><option>Month</option><option>Hrs</option><option>Days</option>
                  </select>
                </td>
                <td style={{padding:3}}><input type="number" value={r.rate} onChange={e=>upd(r.id,"rate",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
                <td style={{padding:3}}>
                  <select value={r.gstPct} onChange={e=>upd(r.id,"gstPct",+e.target.value)} style={{...inp,minHeight:28,fontSize:11,background:rateBg[r.gstPct],color:rateC[r.gstPct],fontWeight:600}}>
                    <option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option>
                  </select>
                </td>
                <VTD c={fmt(amt)} r/>
                <VTD c={fmt(gst)} r/>
                <td style={{padding:"4px 7px",textAlign:"center"}}>
                  <input type="checkbox" checked={r.tds} onChange={e=>upd(r.id,"tds",e.target.checked)} title="TDS 194C applicable" style={{cursor:"pointer",width:16,height:16}}/>
                </td>
                <td style={{padding:"4px 7px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums"}}>
                  <div>{fmt(amt+gst)}</div>
                  {r.tds&&<div style={{fontSize:9.5,color:"#854F0B"}}>TDS: ({fmt(tdsLine)})</div>}
                </td>
                <DBtn fn={()=>rm(r.id)}/>
              </tr>
            );
          })}</tbody>
          <tfoot>
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
              <td colSpan={8} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(sub)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#185FA5"}}>{fmt(inputGst)}</td>
              <td style={{padding:"7px 8px",textAlign:"center",fontSize:10,color:"#854F0B"}}>{tdsAmt>0?"TDS: ("+fmt(tdsAmt)+")":""}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#185FA5"}}>{fmt(total)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <p style={{margin:"0 0 9px",fontSize:10,color:"#5a6691",letterSpacing:"0.5px",textTransform:"uppercase"}}>Input GST breakup &amp; TDS summary</p>
        <div style={{display:"flex",gap:9,flexWrap:"wrap",marginBottom:9}}>
          {Object.entries(gstByRate).map(([rate,vals])=>(
            <div key={rate} style={{flex:1,minWidth:155,padding:"9px 13px",borderRadius:9,background:rateBg[+rate]}}>
              <p style={{margin:0,fontSize:10,fontWeight:700,color:rateC[+rate],textTransform:"uppercase",letterSpacing:"0.5px"}}>{rate}% Input GST</p>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:11.5}}>
                <span style={{color:rateC[+rate]}}>Taxable</span>
                <span style={{fontWeight:600,color:rateC[+rate],fontVariantNumeric:"tabular-nums"}}>{"₹ "+fmt(vals.taxable)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11.5}}>
                <span style={{color:rateC[+rate]}}>ITC claim</span>
                <span style={{fontWeight:700,color:rateC[+rate],fontVariantNumeric:"tabular-nums"}}>{"₹ "+fmt(vals.gst)}</span>
              </div>
            </div>
          ))}
          {tdsAmt>0&&(
            <div style={{flex:1,minWidth:155,padding:"9px 13px",borderRadius:9,background:"#FAEEDA"}}>
              <p style={{margin:0,fontSize:10,fontWeight:700,color:"#854F0B",textTransform:"uppercase",letterSpacing:"0.5px"}}>TDS 194C (2%)</p>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:11.5}}>
                <span style={{color:"#854F0B"}}>To deduct</span>
                <span style={{fontWeight:700,color:"#854F0B",fontVariantNumeric:"tabular-nums"}}>({"₹ "+fmt(tdsAmt)})</span>
              </div>
              <p style={{margin:"3px 0 0",fontSize:10,color:"#854F0B"}}>Deposit by 7th of next month</p>
            </div>
          )}
        </div>
        <div style={{padding:"8px 12px",background:"#EAF3DE",borderRadius:8,fontSize:11.5,color:"#27500A"}}>
          Accounting: <b>Dr respective expense A/c</b> + <b>Dr Input CGST/SGST</b> | <b>Cr Vendor ledger</b> (net of TDS). TDS-applicable lines marked with checkbox — deduct before payment.
        </div>
      </div>
      <VNarr def="Being miscellaneous purchases — SIM cards, stationery, housekeeping services for May 2026.">
        <VTot branch={branch}
          lines={[
            {l:"Sub-total",v:"₹ "+fmt(sub)},
            {l:"Total input GST (ITC)",v:"₹ "+fmt(inputGst)},
            {l:"TDS to deduct",v:"(₹ "+fmt(tdsAmt)+")"},
          ]}
          total={total}
        />
      </VNarr>
    </VWrap>
  );
}


/* ── UNMATCHED TICKETS SCREEN ─────────────────────────────────── */

export function UnmatchedTickets({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const isAll=branch==="ALL";
  const unmatched=getUnmatchedTickets(branch);
  const [sel,setSel]=useState(null);  /* selected ticket for action */
  const [filter,setFilter]=useState("All");
  const airlines=[...new Set(unmatched.map(t=>t.airline))];
  const rows=filter==="All"?unmatched:unmatched.filter(t=>t.airline===filter);

  /* Group by branch for ALL view */
  const byBranch=isAll?BRANCHES.reduce((acc,b)=>{
    const bRows=unmatched.filter(t=>t.branch===b.code);
    if(bRows.length)acc.push({branch:b,rows:bRows});
    return acc;
  },[]):null;

  const totalAmt=rows.reduce((s,t)=>s+t.saleAmt,0);

  return (
    <div style={{padding:mob?"10px 8px":"14px 16px",maxWidth:1260,margin:"0 auto"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",
        marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <button onClick={()=>setRoute("/dashboard")}
              style={{background:"transparent",border:"none",cursor:"pointer",
                color:"#5a6691",padding:0,display:"flex",alignItems:"center",gap:4,fontSize:11}}>
              <ArrowLeft size={13}/> Dashboard
            </button>
          </div>
          <p style={{margin:0,fontSize:9.5,color:"#A32D2D",letterSpacing:"0.5px",
            textTransform:"uppercase",fontWeight:600}}>⚠ Alert — Action Required</p>
          <h1 style={{margin:"3px 0 0",fontSize:mob?16:21,fontWeight:700,
            color:"#0d1326",letterSpacing:"-0.02em"}}>Unmatched Flight Tickets</h1>
          <p style={{margin:"2px 0 0",fontSize:11,color:"#5a6691"}}>
            Sales vouchers raised but no purchase entry found · {branch==="ALL"?"All branches":branch?.code+" — "+branch?.city}
          </p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={{...btnG,display:"flex",alignItems:"center",gap:5,fontSize:11}}>
            <Download size={12}/> Export list
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{display:"grid",
        gridTemplateColumns:mob?"1fr 1fr":"repeat(auto-fit,minmax(160px,1fr))",
        gap:mob?8:11,marginBottom:14}}>
        <div style={{background:"#FCEBEB",border:"1px solid #F7C1C1",borderRadius:10,padding:"10px 12px"}}><p style={{margin:0,fontSize:9.5,color:"#A32D2D",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>Unmatched tickets</p><p style={{margin:"4px 0 0",fontSize:mob?18:22,fontWeight:800,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{unmatched.length}</p></div>
          <div style={{background:"#FAEEDA",border:"1px solid #FAC775",borderRadius:10,padding:"10px 12px"}}><p style={{margin:0,fontSize:9.5,color:"#854F0B",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>Sale value at risk</p><p style={{margin:"4px 0 0",fontSize:mob?18:22,fontWeight:800,color:"#854F0B",fontVariantNumeric:"tabular-nums"}}>{cfg.cur+fmt(totalAmt)}</p></div>
          <div style={{background:"#E6F1FB",border:"1px solid #B5D4F4",borderRadius:10,padding:"10px 12px"}}><p style={{margin:0,fontSize:9.5,color:"#185FA5",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>Airlines affected</p><p style={{margin:"4px 0 0",fontSize:mob?18:22,fontWeight:800,color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>{new Set(unmatched.map(t=>t.airline)).size}</p></div>
          <div style={{background:"#f3f4f8",border:"1px solid #e1e3ec",borderRadius:10,padding:"10px 12px"}}><p style={{margin:0,fontSize:9.5,color:"#384677",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>Branches affected</p><p style={{margin:"4px 0 0",fontSize:mob?18:22,fontWeight:800,color:"#384677",fontVariantNumeric:"tabular-nums"}}>{new Set(unmatched.map(t=>t.branch)).size}</p></div>
      </div>

      {/* What this means */}
      <div style={{padding:"11px 14px",background:"#FCEBEB",border:"1px solid #F7C1C1",
        borderRadius:10,marginBottom:14,fontSize:11.5,color:"#A32D2D",lineHeight:1.6}}>
        <b>What this means:</b> A sales voucher was raised (customer billed) but no purchase voucher
        exists for the same ticket number. This causes <b>inflated P&L</b> (revenue without cost),
        <b> incorrect creditor balances</b> (BSP/airline not payable), and <b>BSP reconciliation failure</b>.
        Create the missing purchase entries before the next BSP settlement cycle.
      </div>

      {/* Filter bar */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:11,color:"#5a6691",fontWeight:500}}>Filter by airline:</span>
        {["All",...airlines].map(a=>(
          <button key={a} onClick={()=>setFilter(a)}
            style={{padding:"4px 10px",borderRadius:7,border:"1px solid #e1e3ec",fontSize:11,
              background:filter===a?"#0d1326":"#fff",
              color:filter===a?"#fff":"#5a6691",cursor:"pointer"}}>
            {a}
          </button>
        ))}
        <span style={{marginLeft:"auto",fontSize:11,color:"#A32D2D",fontWeight:600}}>
          {rows.length} unmatched
        </span>
      </div>

      {/* Ticket table / cards */}
      {mob?(
        /* Mobile cards */
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {rows.map((t,i)=>(
            <div key={i} style={{background:"#fff",border:"1px solid #F7C1C1",
              borderRadius:10,padding:"11px 13px",
              borderLeft:"4px solid #e24b4a"}}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"flex-start",marginBottom:6}}>
                <div>
                  <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>{t.passenger}</p>
                  <p style={{margin:"2px 0 0",fontSize:10,fontFamily:"monospace",color:"#5a6691"}}>{t.ticket}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:"#A32D2D",
                    fontVariantNumeric:"tabular-nums"}}>{cfg.cur+fmt(t.saleAmt)}</p>
                  <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{t.airline}</p>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",flexWrap:"wrap",gap:6}}>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,
                    background:"#f3f4f8",color:"#384677"}}>{t.sector}</span>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,
                    background:"#FAEEDA",color:"#854F0B"}}>{t.branch}</span>
                  <span style={{fontSize:10,color:"#5a6691"}}>{t.date}</span>
                </div>
                <button
                  onClick={()=>setRoute("/purchase/flight")}
                  style={{...btnG,fontSize:10,padding:"4px 10px"}}>
                  + Create Purchase
                </button>
              </div>
              <p style={{margin:"6px 0 0",fontSize:10,color:"#5a6691"}}>
                Sales voucher: <span style={{fontFamily:"monospace",color:"#185FA5"}}>{t.vno}</span>
                {" · "}{t.customer}
              </p>
            </div>
          ))}
        </div>
      ):(
        /* Desktop table */
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",fontSize:11.5,borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#0d1326"}}>
                  {["Branch","Date","Passenger","Passport","Ticket no.","Airline","Sector","Class","Sales voucher","Customer","Billed ₹","Action"].map((h,i)=>(
                    <th key={i} style={{textAlign:i>=10&&i<=10?"right":"left",
                      padding:"9px 11px",fontWeight:600,color:"#d4a437",fontSize:10.5,
                      whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((t,i)=>(
                  <tr key={i}
                    style={{borderBottom:"1px solid #fde8e8",
                      background:i%2===0?"#fff":"#fffafa"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#fff5f5"}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#fffafa"}>
                    <td style={{padding:"8px 11px"}}>
                      <span style={{display:"flex",alignItems:"center",gap:5}}>
                        <span style={{fontSize:13}}>{BRANCHES.find(b=>b.code===t.branch)?.flag}</span>
                        <span style={{fontWeight:600,color:"#384677"}}>{t.branch}</span>
                      </span>
                    </td>
                    <td style={{padding:"8px 11px",color:"#5a6691"}}>{t.date}</td>
                    <td style={{padding:"8px 11px",fontWeight:600}}>{t.passenger}</td>
                    <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:10.5,color:"#5a6691"}}>{t.pp}</td>
                    <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:10.5,color:"#185FA5"}}>{t.ticket}</td>
                    <td style={{padding:"8px 11px"}}>{t.airline}</td>
                    <td style={{padding:"8px 11px"}}>
                      <span style={{padding:"2px 7px",borderRadius:6,background:"#f3f4f8",
                        fontSize:10.5,fontWeight:600}}>{t.sector}</span>
                    </td>
                    <td style={{padding:"8px 11px",color:"#5a6691"}}>{t.cls}</td>
                    <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:10.5,color:"#185FA5"}}>{t.vno}</td>
                    <td style={{padding:"8px 11px",color:"#384677"}}>{t.customer}</td>
                    <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,
                      color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>
                      {cfg.cur+fmt(t.saleAmt)}
                    </td>
                    <td style={{padding:"8px 11px"}}>
                      <button
                        onClick={()=>setRoute("/purchase/flight")}
                        style={{...btnG,fontSize:10,padding:"4px 10px",whiteSpace:"nowrap"}}>
                        + Purchase entry
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
                  <td colSpan={10} style={{padding:"9px 11px",fontWeight:700,color:"#A32D2D"}}>
                    Total exposure — {rows.length} unmatched ticket{rows.length!==1?"s":""}
                  </td>
                  <td style={{padding:"9px 11px",textAlign:"right",fontWeight:800,
                    color:"#A32D2D",fontSize:14,fontVariantNumeric:"tabular-nums"}}>
                    {cfg.cur+fmt(rows.reduce((s,t)=>s+t.saleAmt,0))}
                  </td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Next steps guide */}
      <div style={{marginTop:16,display:"grid",
        gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:11}}>
        <div key="1" style={{background:"#E6F1FB",borderRadius:10,padding:"13px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
              <span style={{width:22,height:22,borderRadius:"50%",background:"#185FA5",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>1</span>
              <p style={{margin:0,fontSize:12,fontWeight:700,color:"#185FA5"}}>Create purchase entry</p>
            </div>
            <p style={{margin:0,fontSize:11,color:"#384677",lineHeight:1.5}}>Go to Purchase, enter BSP cost against ticket number.</p>
            <button onClick={()=>setRoute("/purchase/flight")} style={{...btnG,fontSize:10,marginTop:8}}>Go to Purchase</button>
          </div>
          <div key="2" style={{background:"#EAF3DE",borderRadius:10,padding:"13px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
              <span style={{width:22,height:22,borderRadius:"50%",background:"#27500A",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>2</span>
              <p style={{margin:0,fontSize:12,fontWeight:700,color:"#27500A"}}>Verify with BSP report</p>
            </div>
            <p style={{margin:0,fontSize:11,color:"#384677",lineHeight:1.5}}>Cross-check unmatched ticket numbers against BSP billing statement.</p>
            <button onClick={()=>setRoute("/bank-reco")} style={{...btnG,fontSize:10,marginTop:8,background:"#27500A"}}>Go to Bank Reco</button>
          </div>
          <div key="3" style={{background:"#f3f4f8",borderRadius:10,padding:"13px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
              <span style={{width:22,height:22,borderRadius:"50%",background:"#384677",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>3</span>
              <p style={{margin:0,fontSize:12,fontWeight:700,color:"#384677"}}>Reconcile &amp; close</p>
            </div>
            <p style={{margin:0,fontSize:11,color:"#384677",lineHeight:1.5}}>Run the P&amp;L to confirm costs are booked.</p>
            <button onClick={()=>setRoute("/reports/pnl")} style={{...btnGh,fontSize:10,marginTop:8}}>Go to P&amp;L</button>
          </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EXPENSE BUDGET SYSTEM — Constants & Store
   ════════════════════════════════════════════════════════════════ */


export function SalesDebitNote({branch,setRoute}){
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?"BOM":branch?.code||"BOM";
  const [notes]=useState([
    {id:`${brCode}/1726/SDN00001`,date:"2026-05-12",origVno:"BOM/1726/SH00018",client:"Mehta & Sons",reason:"Date change fee",amount:5000,gst:900,total:5900,status:"Raised"},
    {id:`${brCode}/1726/SDN00002`,date:"2026-05-15",origVno:"BOM/1726/SF00043",client:"Sharma Enterprises",reason:"Excess baggage surcharge",amount:3500,gst:630,total:4130,status:"Collected"},
  ]);
  const REASONS=["Date change fee","Cancellation charge","Excess baggage surcharge","Amendment fee","Upgrade difference","Additional service charge","Other"];
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({client:"",origVno:"",reason:"Date change fee",amount:0});

  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📈</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Debit Notes</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Prefix: SDN · Raise additional charges against existing invoices</p>
          </div>
        </div>
        <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> New Debit Note</button>
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Debit Note No.","Date","Original Voucher","Client","Reason","Amount","GST","Total","Status"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=5&&i<=7?"right":"left",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{notes.map((n,i)=>(
            <tr key={n.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{n.id}</td>
              <td style={{padding:"9px 12px",fontSize:10.5,color:"#5a6691"}}>{n.date}</td>
              <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:10,color:"#854F0B"}}>{n.origVno}</td>
              <td style={{padding:"9px 12px",fontWeight:600,color:"#0d1326"}}>{n.client}</td>
              <td style={{padding:"9px 12px",color:"#384677"}}>{n.reason}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{cur}{n.amount.toLocaleString()}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#A32D2D"}}>{cur}{n.gst.toLocaleString()}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{cur}{n.total.toLocaleString()}</td>
              <td style={{padding:"9px 12px"}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,background:n.status==="Collected"?"#EAF3DE":"#FAEEDA",color:n.status==="Collected"?"#27500A":"#854F0B"}}>{n.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>New Debit Note</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <FL label="Original voucher no."><input value={form.origVno} onChange={e=>setForm(f=>({...f,origVno:e.target.value}))} style={{...inp,fontFamily:"monospace"}} placeholder="BOM/1726/SH00018"/></FL>
              <FL label="Client"><input value={form.client} onChange={e=>setForm(f=>({...f,client:e.target.value}))} style={inp}/></FL>
              <FL label="Reason"><select value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} style={inp}>{REASONS.map(r=><option key={r}>{r}</option>)}</select></FL>
              <FL label="Charge amount (excl. GST)"><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:+e.target.value}))} style={inp}/></FL>
              <div style={{padding:"9px 12px",borderRadius:8,background:"#E6F1FB",fontSize:10,color:"#185FA5"}}>GST 18% on debit note: {cur}{Math.round(form.amount*0.18).toLocaleString()} · Total: {cur}{Math.round(form.amount*1.18).toLocaleString()}</div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={()=>setModal(false)} style={btnG}>💾 Raise Debit Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   CANCELLATION WORKFLOW  /sales/cancellation
   ════════════════════════════════════════════════════════════════ */

export function SalesCancellation({branch}){
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [cancellations]=useState([
    {id:"CXL-BOM-001",date:"2026-05-14",origVno:"BOM/0826/SH00014",client:"Globex Consulting",module:"Holiday",dest:"Dubai",origAmt:98000,cancCharge:15000,refundToClient:83000,supplierRefund:68000,netLoss:0,status:"Refund Pending"},
    {id:"CXL-BOM-002",date:"2026-05-10",origVno:"BOM/0826/SF00041",client:"TechCorp MICE",module:"Flight",dest:"Doha",origAmt:62000,cancCharge:8000,refundToClient:54000,supplierRefund:54000,netLoss:0,status:"Completed"},
    {id:"CXL-AMD-001",date:"2026-05-08",origVno:"AMD/0826/SH00008",client:"Patel Exports",module:"Holiday",dest:"Thailand",origAmt:168000,cancCharge:35000,refundToClient:133000,supplierRefund:140000,netLoss:7000,status:"Refund Paid"},
  ]);
  const [modal,setModal]=useState(false);

  const totCancCharge=cancellations.reduce((s,c)=>s+c.cancCharge,0);
  const totRefund    =cancellations.reduce((s,c)=>s+c.refundToClient,0);

  return (
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#FCEBEB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>❌</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Cancellation Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Track cancellations, charges, and client refunds</p>
          </div>
        </div>
        <button onClick={()=>setModal(true)} style={{...btnG,background:"#A32D2D",fontSize:11}}><Plus size={13}/> New Cancellation</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Total Cancellations",v:String(cancellations.length),  c:"#A32D2D",bg:"#FCEBEB"},
          {l:"Cancellation Charges",v:cur+totCancCharge.toLocaleString(),c:"#27500A",bg:"#EAF3DE"},
          {l:"Refunds to Clients",  v:cur+totRefund.toLocaleString(),    c:"#854F0B",bg:"#FAEEDA"},
          {l:"Pending Refunds",     v:String(cancellations.filter(c=>c.status==="Refund Pending").length),c:"#A32D2D",bg:"#FCEBEB"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Ref","Date","Original Voucher","Client","Module","Orig Amt","Canc. Charge","Client Refund","Supplier Refund","Net Loss","Status"].map((h,i)=>(
              <th key={i} style={{padding:"9px 10px",textAlign:i>=5?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{cancellations.map((c,i)=>(
            <tr key={c.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:9.5,color:"#A32D2D"}}>{c.id}</td>
              <td style={{padding:"8px 10px",fontSize:10,color:"#5a6691"}}>{c.date}</td>
              <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:9.5,color:"#854F0B"}}>{c.origVno}</td>
              <td style={{padding:"8px 10px",fontWeight:600,color:"#0d1326"}}>{c.client}</td>
              <td style={{padding:"8px 10px"}}><span style={{fontSize:9.5,padding:"2px 6px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{c.module}</span></td>
              <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{cur}{c.origAmt.toLocaleString()}</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:"#27500A"}}>{cur}{c.cancCharge.toLocaleString()}</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#A32D2D"}}>{cur}{c.refundToClient.toLocaleString()}</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#185FA5"}}>{cur}{c.supplierRefund.toLocaleString()}</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:c.netLoss>0?"#A32D2D":"#27500A"}}>{c.netLoss>0?`-${cur}${c.netLoss.toLocaleString()}`:"Nil"}</td>
              <td style={{padding:"8px 10px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:c.status==="Completed"?"#EAF3DE":c.status==="Refund Paid"?"#EAF3DE":"#FAEEDA",color:c.status==="Completed"?"#27500A":c.status==="Refund Paid"?"#1D9E75":"#854F0B"}}>{c.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   REFUND TRACKING  /purchase/refunds
   ════════════════════════════════════════════════════════════════ */

export function PurchaseRefunds({branch}){
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [refunds]=useState([
    {id:"REF-BOM-001",date:"2026-05-13",supplier:"BSP India",module:"Flight",origVno:"BOM/0826/PF00041",tickets:2,refundReq:51000,refundRec:48500,tds:0,status:"Received",notes:"Partial — airline penalty deducted"},
    {id:"REF-BOM-002",date:"2026-05-10",supplier:"Bali Tours DMC",module:"Holiday",origVno:"BOM/0826/PH00016",tickets:1,refundReq:128000,refundRec:0,tds:0,status:"Applied",notes:"Awaiting DMC confirmation"},
    {id:"REF-AMD-001",date:"2026-05-08",supplier:"VFS Global",module:"Visa",origVno:"AMD/0826/PV00003",tickets:2,refundReq:17800,refundRec:17800,tds:0,status:"Received",notes:"Full refund — visa rejected"},
    {id:"REF-NBO-001",date:"2026-04-30",supplier:"KQ Direct",module:"Flight",origVno:"NBO/0826/SF00015",tickets:3,refundReq:560000,refundRec:504000,tds:0,status:"Received",notes:"10% cancellation charge by Kenya Airways"},
  ]);
  const totReq=refunds.reduce((s,r)=>s+r.refundReq,0);
  const totRec=refunds.reduce((s,r)=>s+r.refundRec,0);
  const pending=refunds.filter(r=>r.status==="Applied").reduce((s,r)=>s+r.refundReq,0);

  return (
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:36,height:36,borderRadius:9,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>💫</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Refund Tracking</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Track airline, DMC, hotel refunds against purchase vouchers</p>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Total Requested",v:cur+totReq.toLocaleString(),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Total Received",v:cur+totRec.toLocaleString(),c:"#27500A",bg:"#EAF3DE"},
          {l:"Pending",v:cur+pending.toLocaleString(),c:"#A32D2D",bg:"#FCEBEB"},
          {l:"Recovery %",v:`${totReq>0?Math.round(totRec/totReq*100):0}%`,c:"#854F0B",bg:"#FAEEDA"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Ref No.","Date","Supplier","Module","Original Voucher","Requested","Received","Pending","Status","Notes"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=5&&i<=7?"right":"left",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{refunds.map((r,i)=>(
            <tr key={r.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{r.id}</td>
              <td style={{padding:"9px 12px",fontSize:10.5,color:"#5a6691"}}>{r.date}</td>
              <td style={{padding:"9px 12px",fontWeight:600,color:"#0d1326"}}>{r.supplier}</td>
              <td style={{padding:"9px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:700,background:"#E6F1FB",color:"#185FA5"}}>{r.module}</span></td>
              <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:10,color:"#854F0B"}}>{r.origVno}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{cur}{r.refundReq.toLocaleString()}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:r.refundRec>0?"#27500A":"#bfc3d6"}}>{r.refundRec>0?cur+r.refundRec.toLocaleString():"—"}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:r.refundReq-r.refundRec>0?"#A32D2D":"#27500A"}}>{r.refundReq-r.refundRec>0?cur+(r.refundReq-r.refundRec).toLocaleString():"Nil"}</td>
              <td style={{padding:"9px 12px"}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,background:r.status==="Received"?"#EAF3DE":"#FAEEDA",color:r.status==="Received"?"#27500A":"#854F0B"}}>{r.status}</span></td>
              <td style={{padding:"9px 12px",fontSize:10,color:"#5a6691",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.notes}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SUB-AGENTS MASTER  /masters/sub-agents
   ════════════════════════════════════════════════════════════════ */
/* MastersSubAgents — see rebuilt version below */

export function AdmRegister({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;

  const [adms,setAdms]=useState(_ADM_LIST);
  const [modal,setModal]=useState(false);
  const [disputeModal,setDisputeModal]=useState(null);
  const [statusFilter,setStatusFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [form,setForm]=useState({airline:"Air India",airlineCode:"AI",ticketNo:"",passenger:"",
    sector:"",reasonCode:"FD",amount:0,currency:"INR",branch:"BOM",consultant:"",remarks:""});

  const TODAY="2026-05-19";
  const daysLeft=(deadline)=>Math.ceil((new Date(deadline)-new Date(TODAY))/(1000*60*60*24));

  const filtered=adms.filter(a=>(
    (!brCode||a.branch===brCode)&&
    (statusFilter==="All"||a.status===statusFilter)&&
    (!search||a.id.toLowerCase().includes(search.toLowerCase())||
     a.airline.toLowerCase().includes(search.toLowerCase())||
     a.passenger.toLowerCase().includes(search.toLowerCase())||
     a.ticketNo.includes(search))
  ));

  const STATUSES=["All","Received","Under Review","Disputed","Accepted","Settled","Waived"];
  const STATUS_CLR={Received:"#185FA5","Under Review":"#854F0B",Disputed:"#A32D2D",
    Accepted:"#A32D2D",Settled:"#27500A",Waived:"#1D9E75"};
  const STATUS_BG={Received:"#E6F1FB","Under Review":"#FAEEDA",Disputed:"#FCEBEB",
    Accepted:"#FCEBEB",Settled:"#EAF3DE",Waived:"#EAF3DE"};

  const totPending=filtered.filter(a=>!["Settled","Waived"].includes(a.status))
    .reduce((s,a)=>s+a.amount,0);
  const totSettled=filtered.filter(a=>a.status==="Settled").reduce((s,a)=>s+a.amount,0);
  const overdue   =filtered.filter(a=>!["Settled","Waived","Disputed"].includes(a.status)&&daysLeft(a.responseDeadline)<0);
  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");

  const addAdm=()=>{
    const id=`ADM-${form.airlineCode}-2026-${String(adms.length+1).padStart(4,"0")}`;
    const date=TODAY;
    const deadline=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
    const bspDebit=new Date(Date.now()+31*86400000).toISOString().slice(0,10);
    setAdms(a=>[{...form,id,date,responseDeadline:deadline,bspDebitDate:bspDebit,status:"Received",disputeNote:""},...a]);
    setModal(false);
  };

  const updateStatus=(id,status)=>setAdms(a=>a.map(x=>x.id===id?{...x,status}:x));

  return (
    <div style={{padding:"12px 10px",maxWidth:1360,margin:"0 auto"}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FCEBEB",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:22}}>📩</span>
          </div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>ADM Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>
              Agent Debit Memos · Airlines debit the agency via BSP · 30-day dispute window
            </p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
            style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="ADM no / airline / ticket / passenger..."
            style={{...inp,width:220,minHeight:32,fontSize:11}}/>
          <button onClick={()=>setModal(true)} style={{...btnG,background:"#A32D2D",fontSize:11}}>
            <Plus size={13}/> New ADM
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Total ADMs",        v:String(filtered.length),              c:"#185FA5",bg:"#E6F1FB"},
          {l:"Pending / Disputed",v:f(totPending),                        c:"#A32D2D",bg:"#FCEBEB"},
          {l:"Settled (BSP debit)",v:f(totSettled),                       c:"#27500A",bg:"#EAF3DE"},
          {l:"Overdue (>deadline)",v:String(overdue.length),              c:overdue.length>0?"#7B1F1F":"#27500A",bg:overdue.length>0?"#FCEBEB":"#EAF3DE"},
          {l:"Under Dispute",      v:String(adms.filter(a=>a.status==="Disputed").length),c:"#854F0B",bg:"#FAEEDA"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase",letterSpacing:"0.5px"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:mob?18:22,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdue.length>0&&(
        <div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#FCEBEB",
          border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600,
          display:"flex",alignItems:"center",gap:8}}>
          <AlertTriangle size={15}/>
          {overdue.length} ADM{overdue.length>1?"s":""} past the 30-day dispute deadline
          — will be auto-debited from BSP next settlement:
          {overdue.map(a=><span key={a.id} style={{marginLeft:8,padding:"1px 7px",borderRadius:999,background:"#A32D2D",color:"#fff",fontSize:9.5}}>{a.id}</span>)}
        </div>
      )}

      {/* ADM table */}
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:1100}}>
            <thead>
              <tr style={{background:"#0d1326"}}>
                {["ADM Number","Date","Airline","Ticket No.","Passenger","Sector","Reason","Amount","Deadline","Status","Actions"].map((h,i)=>(
                  <th key={i} style={{padding:"9px 10px",textAlign:i===7?"right":"left",
                    color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a,i)=>{
                const dl=daysLeft(a.responseDeadline);
                const isOverdue=dl<0&&!["Settled","Waived","Disputed"].includes(a.status);
                const isUrgent=dl>=0&&dl<=7&&!["Settled","Waived","Disputed"].includes(a.status);
                const rc=ADM_REASON_CODES[a.reasonCode]||{label:a.reasonCode,desc:""};
                return (
                  <tr key={a.id} style={{borderBottom:"1px solid #f3f4f8",
                    background:isOverdue?"#fff5f5":isUrgent?"#fffaf0":i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"8px 10px"}}>
                      <p style={{margin:0,fontFamily:"monospace",fontSize:10,color:"#A32D2D",fontWeight:700}}>{a.id}</p>
                      <p style={{margin:0,fontSize:8.5,color:"#5a6691"}}>{a.date}</p>
                    </td>
                    <td style={{padding:"8px 10px"}}>
                      <p style={{margin:0,fontWeight:700,color:"#0d1326"}}>{a.airline}</p>
                      <p style={{margin:0,fontSize:9,color:"#5a6691"}}>IATA {a.iataNum}</p>
                    </td>
                    <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{a.ticketNo||"—"}</td>
                    <td style={{padding:"8px 10px",fontWeight:600,color:"#384677",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.passenger||"—"}</td>
                    <td style={{padding:"8px 10px",color:"#5a6691",whiteSpace:"nowrap"}}>{a.sector||"—"}</td>
                    <td style={{padding:"8px 10px"}}>
                      <p style={{margin:0,fontSize:10,fontWeight:700,color:"#854F0B"}}>{rc.code} — {rc.label}</p>
                      <p style={{margin:0,fontSize:8.5,color:"#5a6691",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={a.remarks}>{a.remarks}</p>
                    </td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,fontVariantNumeric:"tabular-nums",
                      color:"#A32D2D",fontSize:13}}>{a.currency}{Number(a.amount).toLocaleString()}</td>
                    <td style={{padding:"8px 10px"}}>
                      {["Settled","Waived"].includes(a.status)
                        ?<p style={{margin:0,fontSize:10,color:"#27500A"}}>✔ {a.bspDebitDate}</p>
                        :<div>
                          <p style={{margin:0,fontSize:10,fontWeight:700,color:isOverdue?"#A32D2D":isUrgent?"#854F0B":"#384677"}}>
                            {isOverdue?`${Math.abs(dl)} days OVERDUE`:isUrgent?`${dl} days left`:`${dl} days`}
                          </p>
                          <p style={{margin:0,fontSize:8.5,color:"#5a6691"}}>Due: {a.responseDeadline}</p>
                        </div>
                      }
                    </td>
                    <td style={{padding:"8px 10px"}}>
                      <span style={{fontSize:9.5,padding:"3px 8px",borderRadius:999,fontWeight:700,
                        background:STATUS_BG[a.status]||"#f3f4f8",color:STATUS_CLR[a.status]||"#5a6691"}}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{padding:"8px 10px"}}>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {a.status==="Received"&&<button onClick={()=>updateStatus(a.id,"Under Review")} style={{...btnGh,padding:"2px 7px",fontSize:9,whiteSpace:"nowrap"}}>Review</button>}
                        {["Received","Under Review"].includes(a.status)&&(
                          <button onClick={()=>setDisputeModal(a)} style={{...btnG,padding:"2px 7px",fontSize:9,background:"#A32D2D",whiteSpace:"nowrap"}}>Dispute</button>
                        )}
                        {["Received","Under Review"].includes(a.status)&&(
                          <button onClick={()=>updateStatus(a.id,"Accepted")} style={{...btnGh,padding:"2px 7px",fontSize:9,whiteSpace:"nowrap"}}>Accept</button>
                        )}
                        {a.status==="Accepted"&&<button onClick={()=>updateStatus(a.id,"Settled")} style={{...btnG,padding:"2px 7px",fontSize:9,background:"#27500A",whiteSpace:"nowrap"}}>Mark Settled</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length===0&&(
                <tr><td colSpan={11} style={{padding:"28px",textAlign:"center",color:"#5a6691"}}>No ADMs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info box */}
      <div style={{marginTop:12,padding:"10px 14px",borderRadius:9,background:"#E6F1FB",border:"1px solid #B5D4F4",fontSize:10,color:"#185FA5"}}>
        <b>ADM Process:</b> Airline raises ADM via BSP Link → Agency receives notification → 30-day window to dispute or accept →
        If no response within 30 days, ADM is auto-accepted and debited from next BSP settlement →
        If disputed, airline must respond within 60 days → Unresolved disputes escalate to IATA.
        Always dispute with documentary evidence (fare quote, waiver approval, correspondence).
      </div>

      {/* New ADM modal */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:560,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",position:"sticky",top:0,background:"#0d1326",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#d4a437"}}>Record New ADM</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#8b94b3"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Airline name"><input value={form.airline} onChange={e=>setForm(f=>({...f,airline:e.target.value}))} style={inp} placeholder="Air India"/></FL>
                <FL label="Airline code (2-letter)"><input value={form.airlineCode} onChange={e=>setForm(f=>({...f,airlineCode:e.target.value.toUpperCase()}))} style={{...inp,fontFamily:"monospace"}} placeholder="AI" maxLength={2}/></FL>
              </div>
              <FL label="Ticket number"><input value={form.ticketNo} onChange={e=>setForm(f=>({...f,ticketNo:e.target.value}))} style={{...inp,fontFamily:"monospace"}} placeholder="098-1234567890"/></FL>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Passenger name"><input value={form.passenger} onChange={e=>setForm(f=>({...f,passenger:e.target.value}))} style={inp}/></FL>
                <FL label="Sector"><input value={form.sector} onChange={e=>setForm(f=>({...f,sector:e.target.value}))} style={inp} placeholder="BOM-DXB"/></FL>
              </div>
              <FL label="Reason code">
                <select value={form.reasonCode} onChange={e=>setForm(f=>({...f,reasonCode:e.target.value}))} style={inp}>
                  {Object.values(ADM_REASON_CODES).map(r=><option key={r.code} value={r.code}>{r.code} — {r.label}</option>)}
                </select>
              </FL>
              <div style={{padding:"8px 12px",borderRadius:8,background:"#FAEEDA",fontSize:9.5,color:"#854F0B"}}>
                {ADM_REASON_CODES[form.reasonCode]?.desc}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <FL label="ADM amount"><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:+e.target.value}))} style={inp}/></FL>
                <FL label="Currency"><select value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))} style={inp}><option>INR</option><option>KES</option><option>TZS</option><option>USD</option></select></FL>
                <FL label="Branch"><select value={form.branch} onChange={e=>setForm(f=>({...f,branch:e.target.value}))} style={inp}>{["TKHO","BOM","AMD","NBO","DAR","FBM"].map(b=><option key={b}>{b}</option>)}</select></FL>
              </div>
              <FL label="Remarks / Airline explanation"><textarea value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}}/></FL>
              <div style={{padding:"9px 12px",borderRadius:8,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:9.5,color:"#A32D2D",fontWeight:600}}>
                Response deadline: 30 days from today — {new Date(Date.now()+30*86400000).toISOString().slice(0,10)}. Failure to dispute = auto-accepted and BSP debit raised.
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8,position:"sticky",bottom:0,background:"#fff"}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={addAdm} style={{...btnG,background:"#A32D2D"}}>💾 Record ADM</button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute modal */}
      {disputeModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",background:"#FCEBEB",borderRadius:"14px 14px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#A32D2D"}}>Dispute ADM — {disputeModal.id}</p>
                <p style={{margin:"2px 0 0",fontSize:10,color:"#A32D2D"}}>{disputeModal.airline} · {disputeModal.currency}{Number(disputeModal.amount).toLocaleString()} · Due {disputeModal.responseDeadline}</p>
              </div>
              <button onClick={()=>setDisputeModal(null)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#A32D2D"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{padding:"9px 12px",borderRadius:8,background:"#FAEEDA",fontSize:10,color:"#854F0B"}}>
                <b>Reason raised:</b> {ADM_REASON_CODES[disputeModal.reasonCode]?.label} — {disputeModal.remarks}
              </div>
              <FL label="Dispute grounds (detailed explanation)">
                <textarea rows={4} style={{...inp,resize:"vertical"}}
                  placeholder="e.g. Fare was correctly issued as per published fare BOM-DXB Y class dated 05-Mar-2026. Attaching fare quote from Amadeus GDS and booking confirmation. Commission per our PLACI Level 4 agreement dated 01-Apr-2025 signed by Area Manager..."/>
              </FL>
              <FL label="Documents attached">
                <input style={inp} placeholder="e.g. Amadeus fare quote, PLACI agreement, approval email"/>
              </FL>
              <div style={{padding:"9px 12px",borderRadius:8,background:"#E6F1FB",fontSize:9.5,color:"#185FA5",fontWeight:600}}>
                Dispute will be filed via BSP Link within 24 hours. Airline has 60 days to respond. Track status in ADM Register.
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setDisputeModal(null)} style={btnGh}>Cancel</button>
              <button onClick={()=>{
                setAdms(a=>a.map(x=>x.id===disputeModal.id?{...x,status:"Disputed",disputeNote:"Dispute filed via BSP Link — awaiting airline response"}:x));
                setDisputeModal(null);
              }} style={{...btnG,background:"#A32D2D"}}>📨 File Dispute</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ACM REGISTER  /purchase/acm
   Agent Credit Memos — airline credits the agency via BSP
   ════════════════════════════════════════════════════════════════ */

export function BspSummary({branch}){
  const mob=useMobile();
  const [period,setPeriod]=useState("2026-05");
  const PERIODS=[{v:"2026-03",l:"Mar 2026"},{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"}];
  const brCode=branch==="ALL"?null:branch?.code;

  /* Compute from real data */
  const tickets=GP_BILLS.filter(b=>b.mod==="Flight"&&(!brCode||b.branch===brCode)&&b.date.startsWith(period));
  const grossSales=tickets.reduce((s,b)=>s+b.sell,0);
  const ticketCost=tickets.reduce((s,b)=>s+b.cost,0);
  const commission=Math.round(ticketCost*0.02);
  const bspCharge =Math.round(ticketCost*0.0025);
  const admTotal  =ADM_DATA.filter(a=>(!brCode||a.branch===brCode)&&a.date.startsWith(period)&&a.currency==="INR").reduce((s,a)=>s+a.amount,0);
  const acmTotal  =ACM_DATA.filter(a=>(!brCode||a.branch===brCode)&&a.date.startsWith(period)&&a.currency==="INR").reduce((s,a)=>s+a.amount,0);
  const netBsp    =ticketCost-commission-bspCharge-admTotal+acmTotal;

  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");

  const rows=[
    {label:"Gross ticket sales (BSP)",               amt:grossSales,  type:"neutral",bold:false},
    {label:"Less: Ticket cost (airline net fare)",    amt:-ticketCost, type:"debit",  bold:false},
    {label:"Agency commission (2% avg)",             amt:commission,  type:"credit", bold:false},
    {label:"─── BSP NET AMOUNT ───",                 amt:ticketCost,  type:"section",bold:true},
    {label:"Less: ADMs raised this period",          amt:-admTotal,   type:admTotal>0?"debit":"neutral",bold:false},
    {label:"Plus: ACMs received this period",        amt:acmTotal,    type:acmTotal>0?"credit":"neutral",bold:false},
    {label:"Less: BSP service charge (0.25%)",       amt:-bspCharge,  type:"debit",  bold:false},
    {label:"═══ NET BSP SETTLEMENT AMOUNT ═══",      amt:netBsp,      type:"total",  bold:true},
  ];

  const TYPE_CLR={credit:"#27500A",debit:"#A32D2D",neutral:"#0d1326",section:"#185FA5",total:"#0d1326"};

  return (
    <div style={{padding:"12px 10px",maxWidth:900,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🏦</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>BSP Settlement Summary</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>
              Net BSP position — Ticket sales minus ADMs plus ACMs minus BSP charges
            </p>
          </div>
        </div>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
      </div>

      {/* KPI row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Ticket Sales",      v:f(grossSales), c:"#185FA5",bg:"#E6F1FB"},
          {l:"Commission Income", v:f(commission), c:"#27500A",bg:"#EAF3DE"},
          {l:"ADM Debits",        v:f(admTotal),   c:"#A32D2D",bg:"#FCEBEB"},
          {l:"ACM Credits",       v:f(acmTotal),   c:"#1D9E75",bg:"#EAF3DE"},
          {l:"Net Settlement",    v:f(netBsp),     c:netBsp>0?"#27500A":"#A32D2D",bg:netBsp>0?"#EAF3DE":"#FCEBEB"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:mob?17:21,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Settlement computation */}
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{padding:"10px 16px",background:"#0d1326",borderBottom:"1px solid #1a2340"}}>
          <p style={{margin:0,fontSize:12,fontWeight:700,color:"#d4a437"}}>
            BSP Settlement Computation — {PERIODS.find(p=>p.v===period)?.l} · {brCode||"India (BOM+AMD)"}
          </p>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} style={{
                borderBottom:"1px solid #f3f4f8",
                background:r.type==="total"?"#0d1326":r.type==="section"?"#f0f4ff":i%2===0?"#fff":"#fafafa"
              }}>
                <td style={{padding:"11px 16px",fontWeight:r.bold?700:400,
                  color:r.type==="total"?"#d4a437":r.type==="section"?"#185FA5":TYPE_CLR[r.type]||"#0d1326",
                  fontSize:r.bold?12:11.5}}>{r.label}</td>
                <td style={{padding:"11px 16px",textAlign:"right",fontWeight:r.bold?800:500,
                  fontVariantNumeric:"tabular-nums",fontSize:r.bold?14:12,
                  color:r.type==="total"?"#fff":r.amt<0?"#A32D2D":r.amt>0&&r.type==="credit"?"#27500A":"#0d1326"}}>
                  {r.amt===0?"—":r.amt<0?`(${f(Math.abs(r.amt))})`:f(r.amt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADM/ACM breakdown */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {/* ADMs this period */}
        <div style={{...card}}>
          <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#A32D2D"}}>📩 ADMs This Period</p>
          {ADM_DATA.filter(a=>(!brCode||a.branch===brCode)&&a.date.startsWith(period)).length===0
            ?<p style={{margin:0,fontSize:11,color:"#5a6691"}}>No ADMs this period</p>
            :ADM_DATA.filter(a=>(!brCode||a.branch===brCode)&&a.date.startsWith(period)).map(a=>(
              <div key={a.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f3f4f8",fontSize:11}}>
                <div>
                  <p style={{margin:0,fontWeight:600,color:"#0d1326",fontSize:10.5}}>{a.id}</p>
                  <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{a.airline} · {ADM_REASON_CODES[a.reasonCode]?.label}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{margin:0,fontWeight:700,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{a.currency}{a.amount.toLocaleString()}</p>
                  <span style={{fontSize:9,padding:"1px 6px",borderRadius:999,background:"#FCEBEB",color:"#A32D2D",fontWeight:700}}>{a.status}</span>
                </div>
              </div>
          ))}
        </div>
        {/* ACMs this period */}
        <div style={{...card}}>
          <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#27500A"}}>📨 ACMs This Period</p>
          {ACM_DATA.filter(a=>(!brCode||a.branch===brCode)&&a.date.startsWith(period)).length===0
            ?<p style={{margin:0,fontSize:11,color:"#5a6691"}}>No ACMs this period</p>
            :ACM_DATA.filter(a=>(!brCode||a.branch===brCode)&&a.date.startsWith(period)).map(a=>(
              <div key={a.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f3f4f8",fontSize:11}}>
                <div>
                  <p style={{margin:0,fontWeight:600,color:"#0d1326",fontSize:10.5}}>{a.id}</p>
                  <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{a.airline} · {ACM_REASON_CODES[a.reasonCode]?.label}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{margin:0,fontWeight:700,color:"#27500A",fontVariantNumeric:"tabular-nums"}}>+{a.currency}{a.amount.toLocaleString()}</p>
                  <span style={{fontSize:9,padding:"1px 6px",borderRadius:999,background:"#EAF3DE",color:"#27500A",fontWeight:700}}>{a.status}</span>
                </div>
              </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   PHASES 2–8: Booking Files · Group Dashboard · Tax Calendar ·
   Client 360 · Visa Tracker · Leave Management · Expense Claims ·
   Power UX (dark mode, export, shortcuts, density)
   ════════════════════════════════════════════════════════════════ */

/* ── BOOKING FILE DATA ── */

export function TicketControlRegister({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:branch?.code;
  const [tickets,setTickets]=useState(_TICKET_CTRL);
  const [filter,setFilter]=useState("All");
  const [search,setSearch]=useState("");

  const STATUSES=["All","Open","Used","Voided","Refunded","Exchanged","Reissued"];
  const STATUS_CLR={Open:"#185FA5",Used:"#27500A",Voided:"#A32D2D",Refunded:"#854F0B",Exchanged:"#1D9E75",Reissued:"#384677"};
  const STATUS_BG={Open:"#E6F1FB",Used:"#EAF3DE",Voided:"#FCEBEB",Refunded:"#FAEEDA",Exchanged:"#EAF3DE",Reissued:"#f3f4f8"};

  const filtered=tickets.filter(t=>(
    (!brCode||t.branch===brCode)&&
    (filter==="All"||t.status===filter)&&
    (!search||t.ticket.includes(search)||t.pax.toLowerCase().includes(search.toLowerCase())||t.pnr.includes(search.toUpperCase()))
  ));
  const totByStatus={};
  STATUSES.slice(1).forEach(s=>totByStatus[s]=tickets.filter(t=>(!brCode||t.branch===brCode)&&t.status===s).length);

  return (
    <div style={{padding:"12px 10px",maxWidth:1300,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🎫</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Air Ticket Control Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Track every ticket: Issued · Used · Voided · Refunded · Exchanged · Reissued</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <select value={filter} onChange={e=>setFilter(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ticket / PNR / passenger..." style={{...inp,width:200,minHeight:32,fontSize:11}}/>
        </div>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
        {STATUSES.slice(1).map(s=>(
          <div key={s} onClick={()=>setFilter(f=>f===s?"All":s)}
            style={{flexShrink:0,padding:"7px 12px",borderRadius:8,cursor:"pointer",textAlign:"center",
              border:`2px solid ${filter===s?"#0d1326":"#e1e3ec"}`,
              background:filter===s?"#0d1326":STATUS_BG[s]||"#f3f4f8"}}>
            <p style={{margin:0,fontSize:16,fontWeight:800,color:filter===s?"#d4a437":STATUS_CLR[s]}}>{totByStatus[s]||0}</p>
            <p style={{margin:"1px 0 0",fontSize:8.5,fontWeight:700,color:filter===s?"#fff":STATUS_CLR[s],whiteSpace:"nowrap"}}>{s}</p>
          </div>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:1000}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Ticket Number","Airline","Passenger","Sector","Class","PNR","Issue Date","Travel Date","Fare","BSP Status","Ticket Status","Actions"].map((h,i)=>(
                <th key={i} style={{padding:"9px 10px",textAlign:i===8?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filtered.map((t,i)=>(
              <tr key={t.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:10,color:"#185FA5",fontWeight:700}}>{t.ticket}</td>
                <td style={{padding:"8px 10px",fontWeight:600,color:"#0d1326"}}>{t.airline}</td>
                <td style={{padding:"8px 10px",color:"#384677"}}>{t.pax}</td>
                <td style={{padding:"8px 10px",fontWeight:600,color:"#854F0B"}}>{t.sector}</td>
                <td style={{padding:"8px 10px",textAlign:"center",fontFamily:"monospace",fontSize:10.5,fontWeight:700}}>{t.class}</td>
                <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:10.5,color:"#185FA5",fontWeight:700}}>{t.pnr}</td>
                <td style={{padding:"8px 10px",color:"#5a6691",whiteSpace:"nowrap"}}>{t.issueDate}</td>
                <td style={{padding:"8px 10px",color:"#5a6691",whiteSpace:"nowrap"}}>{t.travelDate}</td>
                <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:600}}>
                  {t.branch==="NBO"?"KES":"₹"}{Number(t.fare).toLocaleString()}
                </td>
                <td style={{padding:"8px 10px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:STATUS_BG[t.bspStatus]||"#f3f4f8",color:STATUS_CLR[t.bspStatus]||"#5a6691"}}>{t.bspStatus}</span></td>
                <td style={{padding:"8px 10px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:STATUS_BG[t.status]||"#f3f4f8",color:STATUS_CLR[t.status]||"#5a6691"}}>{t.status}</span></td>
                <td style={{padding:"8px 10px"}}>
                  {t.status==="Open"&&(
                    <select onChange={e=>{if(e.target.value)setTickets(ts=>ts.map(x=>x.id===t.id?{...x,status:e.target.value,bspStatus:e.target.value}:x));}}
                      style={{fontSize:9.5,border:"1px solid #e1e3ec",borderRadius:5,padding:"2px 5px",background:"#f9fafb"}}>
                      <option value="">Update...</option>
                      <option>Used</option><option>Voided</option><option>Refunded</option><option>Exchanged</option><option>Reissued</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── ITEM 9: MARKUP / NET RATE SHEET  /masters/markup ──────────── */

export function QuickCreate({setRoute}){
  const [open,setOpen]=useState(false);
  const SHORTCUTS=[
    {icon:"✈",label:"New Flight Sale",route:"/sales/flight"},
    {icon:"🌴",label:"New Holiday Sale",route:"/sales/holiday"},
    {icon:"📁",label:"New Booking File",route:"/bookings"},
    {icon:"💰",label:"New Receipt",route:"/receipts"},
    {icon:"💸",label:"New Payment",route:"/payments"},
    {icon:"📓",label:"Journal Entry",route:"/journal"},
  ];
  return (
    <>
      {open&&<div style={{position:"fixed",inset:0,zIndex:498}} onClick={()=>setOpen(false)}/>}
      <div style={{position:"fixed",bottom:24,right:24,zIndex:499,display:"flex",flexDirection:"column-reverse",alignItems:"flex-end",gap:8}}>
        {open&&SHORTCUTS.map((s,i)=>(
          <button key={i} onClick={()=>{setOpen(false);setRoute&&setRoute(s.route);}}
            style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:24,
              background:"#0d1326",border:"1px solid #d4a437",color:"#fff",cursor:"pointer",
              fontSize:11,fontWeight:600,boxShadow:"0 4px 12px rgba(0,0,0,0.3)",whiteSpace:"nowrap",
              animation:`slideUp 0.${i+1}s ease`}}>
            <span style={{fontSize:15}}>{s.icon}</span>{s.label}
          </button>
        ))}
        <button onClick={()=>setOpen(o=>!o)}
          style={{width:52,height:52,borderRadius:"50%",background:open?"#d4a437":"#0d1326",
            border:`3px solid ${open?"#0d1326":"#d4a437"}`,color:open?"#0d1326":"#d4a437",
            cursor:"pointer",fontSize:24,fontWeight:700,boxShadow:"0 4px 16px rgba(13,19,38,0.4)",
            display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
          {open?"✕":"+"}
        </button>
      </div>
    </>
  );
}

/* ── PINNED + RECENT SIDEBAR SECTION ── */

export function BspCsvImport({branch}){
  const [file,setFile]=useState(null);
  const [parsed,setParsed]=useState([]);
  const [matched,setMatched]=useState([]);
  const [step,setStep]=useState(1); // 1=upload 2=preview 3=reconcile

  const handleFile=e=>{
    const f=e.target.files[0];
    if(!f)return;
    setFile(f);
    /* Simulate CSV parse */
    const SAMPLE_ROWS=[
      {ticketNo:"098-2156789012",airline:"Air India",pax:"Rajiv Sharma",sector:"BOM-DXB",amount:"41000.00",currency:"INR",type:"SALE",status:"Ticketed"},
      {ticketNo:"176-8901234567",airline:"Emirates",pax:"Priya Mehta",sector:"BOM-DXB-LHR",amount:"69000.00",currency:"INR",type:"SALE",status:"Ticketed"},
      {ticketNo:"526-3456789012",airline:"IndiGo",pax:"Rohan",sector:"BOM-DEL",amount:"7600.00",currency:"INR",type:"REFUND",status:"Refunded"},
      {ticketNo:"098-2156789099",airline:"Air India",pax:"New Passenger",sector:"BOM-SIN",amount:"55000.00",currency:"INR",type:"SALE",status:"Ticketed"},
    ];
    setParsed(SAMPLE_ROWS);
    /* Auto-match against PURCHASE_REGISTRY */
    const matchResult=SAMPLE_ROWS.map(row=>({...row,inBooks:row.ticketNo!=="098-2156789099",variance:row.ticketNo!=="098-2156789099"?0:55000}));
    setMatched(matchResult);
    setStep(2);
  };

  return (
    <div style={{padding:"12px 10px",maxWidth:1000,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📂</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>BSP Statement Import</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Upload BSP Link CSV / SITI billing file → auto-match against book entries</p>
        </div>
      </div>

      {/* Step indicators */}
      <div style={{display:"flex",gap:0,marginBottom:16,...card,padding:"12px 16px"}}>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:0}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",background:step>=1?"#0d1326":"#e1e3ec",color:step>=1?"#d4a437":"#bfc3d6"}}>1</div><span style={{fontSize:11,fontWeight:step===1?700:400,color:step===1?"#0d1326":"#5a6691"}}>Upload File</span></div><div style={{flex:1,height:1,background:"#e1e3ec",margin:"0 8px"}}/></div><div style={{flex:1,display:"flex",alignItems:"center",gap:0}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",background:step>=2?"#0d1326":"#e1e3ec",color:step>=2?"#d4a437":"#bfc3d6"}}>2</div><span style={{fontSize:11,fontWeight:step===2?700:400,color:step===2?"#0d1326":"#5a6691"}}>Preview & Match</span></div><div style={{flex:1,height:1,background:"#e1e3ec",margin:"0 8px"}}/></div><div style={{flex:1,display:"flex",alignItems:"center",gap:0}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",background:step>=3?"#0d1326":"#e1e3ec",color:step>=3?"#d4a437":"#bfc3d6"}}>3</div><span style={{fontSize:11,fontWeight:step===3?700:400,color:step===3?"#0d1326":"#5a6691"}}>Reconcile</span></div></div>
      </div>

      {step===1&&(
        <div style={{...card,textAlign:"center",padding:"40px 20px"}}>
          <p style={{margin:"0 0 8px",fontSize:32}}>📂</p>
          <p style={{margin:"0 0 16px",fontSize:14,fontWeight:600,color:"#0d1326"}}>Upload BSP Billing CSV</p>
          <p style={{margin:"0 0 20px",fontSize:11,color:"#5a6691"}}>Download from BSP Link → Reports → Billing Statement → CSV format. Supported: BSP India (IATA), KQ Direct, any airline CSV.</p>
          <input type="file" accept=".csv,.txt" onChange={handleFile} style={{display:"none"}} id="bspFileInput"/>
          <label htmlFor="bspFileInput" style={{...btnG,cursor:"pointer",display:"inline-block",padding:"10px 24px",fontSize:12}}>📂 Choose CSV File</label>
          <p style={{margin:"16px 0 0",fontSize:9.5,color:"#5a6691"}}>Or click below to use sample data for demo</p>
          <button onClick={()=>handleFile({target:{files:[{name:"BSP_May2026.csv"}]}})} style={{...btnGh,marginTop:8,fontSize:10}}>Use Sample Data</button>
        </div>
      )}

      {step===2&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>Parsed: {parsed.length} records from {file?.name||"sample"}</p>
            <div style={{display:"flex",gap:8}}>
              <span style={{fontSize:10.5,padding:"4px 10px",borderRadius:999,background:"#EAF3DE",color:"#27500A",fontWeight:700}}>{matched.filter(m=>m.inBooks).length} Matched</span>
              <span style={{fontSize:10.5,padding:"4px 10px",borderRadius:999,background:"#FCEBEB",color:"#A32D2D",fontWeight:700}}>{matched.filter(m=>!m.inBooks).length} Unmatched</span>
              <button onClick={()=>setStep(3)} style={{...btnG,fontSize:11}}>Proceed →</button>
            </div>
          </div>
          <div style={{...card,padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#0d1326"}}>
                {["Ticket No.","Airline","Passenger","Sector","Amount","Type","In Books","Status"].map((h,i)=>(
                  <th key={i} style={{padding:"9px 11px",textAlign:i===4?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{matched.map((r,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:!r.inBooks?"#fff5f5":i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:9.5,color:"#185FA5"}}>{r.ticketNo}</td>
                  <td style={{padding:"8px 11px",fontWeight:600,color:"#0d1326"}}>{r.airline}</td>
                  <td style={{padding:"8px 11px",color:"#384677"}}>{r.pax}</td>
                  <td style={{padding:"8px 11px",color:"#5a6691"}}>{r.sector}</td>
                  <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>₹{Number(r.amount).toLocaleString()}</td>
                  <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:r.type==="SALE"?"#E6F1FB":"#FAEEDA",color:r.type==="SALE"?"#185FA5":"#854F0B"}}>{r.type}</span></td>
                  <td style={{padding:"8px 11px",textAlign:"center"}}>{r.inBooks?"✅":"❌"}</td>
                  <td style={{padding:"8px 11px"}}>{!r.inBooks?<button style={{...btnG,padding:"2px 8px",fontSize:9.5,background:"#A32D2D",whiteSpace:"nowrap"}}>Create Entry</button>:<span style={{color:"#27500A",fontSize:12}}>✔</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {step===3&&(
        <div style={{...card,padding:"24px",textAlign:"center",background:"#EAF3DE"}}>
          <p style={{margin:"0 0 8px",fontSize:32}}>✅</p>
          <p style={{margin:"0 0 8px",fontSize:15,fontWeight:700,color:"#27500A"}}>Reconciliation Complete</p>
          <p style={{margin:0,fontSize:11,color:"#5a6691"}}>{matched.filter(m=>m.inBooks).length} tickets matched · {matched.filter(m=>!m.inBooks).length} new entries created · BSP statement synced with books.</p>
          <button onClick={()=>{setStep(1);setParsed([]);setMatched([]);setFile(null);}} style={{...btnGh,marginTop:16}}>Import Another File</button>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ITEM 22: GDS PNR IMPORT  /purchase/gds-import
   ════════════════════════════════════════════════════════════════ */

export function GdsPnrImport({branch,setRoute}){
  const [pnr,setPnr]=useState("");
  const [gds,setGds]=useState("Amadeus");
  const [parsed,setParsed]=useState(null);
  const [loading,setLoading]=useState(false);

  const parsePnr=()=>{
    if(!pnr.trim())return;
    setLoading(true);
    setTimeout(()=>{
      /* Simulate GDS PNR parse */
      setParsed({
        pnr:pnr.trim().toUpperCase(),gds,airline:"Air India",
        sectors:[{from:"BOM",to:"DXB",date:"2026-07-15",flight:"AI-131",class:"Y",dep:"09:30",arr:"11:30"}],
        pax:[{name:"SHARMA RAJIV MR",type:"ADT",ticket:"098-2156789099"}],
        fare:41000,taxes:8200,total:49200,currency:"INR",
        status:"Ticketed",fareClass:"Y",fareBasis:"YOWUS",
      });
      setLoading(false);
    },800);
  };

  const createVoucher=()=>{
    setRoute&&setRoute("/purchase/flight");
  };

  return (
    <div style={{padding:"12px 10px",maxWidth:800,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>✈</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>GDS PNR Import</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Paste PNR from Amadeus / Sabre / Galileo → auto-fill ticket details</p>
        </div>
      </div>

      <div style={{...card,marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto",gap:10,alignItems:"flex-end"}}>
          <FL label="GDS System"><select value={gds} onChange={e=>setGds(e.target.value)} style={{...inp,minWidth:130}}><option>Amadeus</option><option>Sabre</option><option>Galileo</option><option>Direct Airline</option></select></FL>
          <FL label="PNR / Booking Reference"><input value={pnr} onChange={e=>setPnr(e.target.value.toUpperCase())} style={{...inp,fontFamily:"monospace",textTransform:"uppercase",fontSize:14,fontWeight:700,letterSpacing:2}} placeholder="ABCDE1" maxLength={8}/></FL>
          <div style={{paddingBottom:2}}><button onClick={parsePnr} disabled={!pnr.trim()||loading} style={{...btnG,padding:"10px 16px",fontSize:12,opacity:!pnr.trim()||loading?0.6:1}}>{loading?"Fetching...":"Fetch PNR →"}</button></div>
        </div>
      </div>

      {parsed&&(
        <div style={{...card}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>PNR: <span style={{fontFamily:"monospace",color:"#185FA5"}}>{parsed.pnr}</span> — {parsed.gds}</p>
            <span style={{fontSize:11,padding:"3px 10px",borderRadius:999,background:"#EAF3DE",color:"#27500A",fontWeight:700}}>{parsed.status}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            {[{l:"Airline",v:parsed.airline},{l:"Fare Class",v:`${parsed.fareClass} (${parsed.fareBasis})`},
              {l:"Base Fare",v:`₹${parsed.fare.toLocaleString()}`},{l:"Taxes & Fees",v:`₹${parsed.taxes.toLocaleString()}`},
              {l:"Total",v:`₹${parsed.total.toLocaleString()}`},{l:"Currency",v:parsed.currency},
            ].map((k,i)=>(
              <div key={i} style={{padding:"8px 12px",borderRadius:8,background:"#f3f4f8"}}>
                <p style={{margin:0,fontSize:9,color:"#5a6691",textTransform:"uppercase"}}>{k.l}</p>
                <p style={{margin:"2px 0 0",fontSize:13,fontWeight:700,color:"#0d1326"}}>{k.v}</p>
              </div>
            ))}
          </div>
          <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Sectors</p>
          {parsed.sectors.map((s,i)=>(
            <div key={i} style={{padding:"10px 14px",borderRadius:9,background:"#E6F1FB",marginBottom:8,display:"flex",gap:16,alignItems:"center"}}>
              <span style={{fontSize:18,fontWeight:800,color:"#185FA5"}}>{s.from}</span>
              <span style={{fontSize:14,color:"#5a6691"}}>✈ {s.flight} · {s.date}</span>
              <span style={{fontSize:18,fontWeight:800,color:"#185FA5"}}>{s.to}</span>
              <span style={{fontSize:11,color:"#5a6691"}}>{s.dep} → {s.arr} · {s.class}</span>
            </div>
          ))}
          <p style={{margin:"12px 0 6px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Passengers</p>
          {parsed.pax.map((p,i)=>(
            <div key={i} style={{padding:"8px 12px",borderRadius:8,background:"#f3f4f8",display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontWeight:600,color:"#0d1326"}}>{p.name}</span>
              <span style={{fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{p.ticket}</span>
            </div>
          ))}
          <div style={{marginTop:14,display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={()=>setParsed(null)} style={btnGh}>Clear</button>
            <button onClick={createVoucher} style={{...btnG,background:"#27500A"}}>📋 Create Purchase Voucher</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ITEM 23: TALLY XML EXPORT  /reports/tally-export
   ════════════════════════════════════════════════════════════════ */

export function ReceiptVoucher({branch}){
  const mob=useMobile();
  const vNo=useVNo(branch,"RV");
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch?.code||"BOM";

  const bankLedgers=LEDGER_REGISTRY.filter(l=>l.type==="Bank"||l.type==="Cash");
  const [date,setDate]=useState("2026-05-19");
  const [bankLedger,setBankLedger]=useState("hdfc_bom");
  const [party,setParty]=useState("sharma");
  const [payMode,setPayMode]=useState("NEFT");
  const [utr,setUtr]=useState("");
  const [chequeNo,setChequeNo]=useState("");
  const [chequeDate,setChequeDate]=useState("");
  const [clearDate,setClearDate]=useState("");
  const [amount,setAmount]=useState(52170);
  const [tdsDeducted,setTdsDeducted]=useState(false);
  const [tdsSection,setTdsSection]=useState("194H");
  const [tdsAmt,setTdsAmt]=useState(0);
  const [againstInv,setAgainstInv]=useState("");
  const [narration,setNarration]=useState("");
  const [saved,setSaved]=useState(false);

  const bankName=LEDGER_REGISTRY.find(l=>l.id===bankLedger)?.name||bankLedger;
  const partyName=LEDGER_REGISTRY.find(l=>l.id===party)?.name||party;
  const grossAmt=amount+tdsAmt;
  const netReceipt=amount;
  const tdsSec=TDS_SECTIONS[tdsSection];

  const autoTds=()=>{
    if(tdsDeducted&&tdsSec){
      const computed=Math.round(grossAmt*tdsSec.rate/100);
      setTdsAmt(computed);
      setAmount(grossAmt-computed);
    }
  };

  const autoNarr=()=>{
    const n=`Being receipt from ${partyName} via ${payMode}${utr?` UTR ${utr}`:""}${againstInv?` against ${againstInv}`:""}`;
    setNarration(n);
  };

  const jEntries=[
    {side:"Dr",ledger:bankName,             amount:netReceipt,note:"Amount received"},
    ...(tdsDeducted&&tdsAmt>0?[{side:"Dr",ledger:`TDS Receivable (${tdsSection})`,amount:tdsAmt,note:"TDS deducted by party"}]:[]),
    {side:"Cr",ledger:partyName,            amount:grossAmt,note:"Party ledger settled"},
  ];
  const tDr=jEntries.filter(e=>e.side==="Dr").reduce((s,e)=>s+e.amount,0);
  const tCr=jEntries.filter(e=>e.side==="Cr").reduce((s,e)=>s+e.amount,0);
  const balanced=Math.abs(tDr-tCr)<0.01;
  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");

  return (
    <VWrap title="Receipt Voucher" icon="💰" vNo={vNo} branch={branch}>
      <VHead vNo={vNo}/>

      {/* Main form */}
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14,padding:"14px 0"}}>
        {/* Left column */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <FL label="Receipt date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></FL>
          <FL label="Payment mode">
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["NEFT","RTGS","UPI","Cheque","Cash","Card"].map(m=>(
                <button key={m} onClick={()=>setPayMode(m)} style={{padding:"5px 11px",borderRadius:6,fontSize:10.5,fontWeight:600,cursor:"pointer",
                  background:payMode===m?"#0d1326":"#f3f4f8",color:payMode===m?"#d4a437":"#384677",border:"1.5px solid "+(payMode===m?"#d4a437":"#e1e3ec")}}>
                  {m}
                </button>
              ))}
            </div>
          </FL>
          {(payMode==="NEFT"||payMode==="RTGS")&&<FL label="UTR / Reference number"><input value={utr} onChange={e=>setUtr(e.target.value)} style={{...inp,fontFamily:"monospace"}} placeholder="UTR123456789012"/></FL>}
          {payMode==="UPI"&&<FL label="UPI Transaction ID"><input value={utr} onChange={e=>setUtr(e.target.value)} style={{...inp,fontFamily:"monospace"}} placeholder="UPI123456789"/></FL>}
          {payMode==="Cheque"&&<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <FL label="Cheque number"><input value={chequeNo} onChange={e=>setChequeNo(e.target.value)} style={{...inp,fontFamily:"monospace"}}/></FL>
              <FL label="Cheque date"><input type="date" value={chequeDate} onChange={e=>setChequeDate(e.target.value)} style={inp}/></FL>
            </div>
            <FL label="Expected clearing date"><input type="date" value={clearDate} onChange={e=>setClearDate(e.target.value)} style={inp}/></FL>
          </>}
          <FL label="Bank / Cash account (Dr — where money is going)">
            <LedgerSelect value={bankLedger} onChange={setBankLedger} filter={l=>l.type==="Bank"||l.type==="Cash"} placeholder="Select bank account..."/>
          </FL>
        </div>

        {/* Right column */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <FL label="Received from (party ledger — Cr)">
            <LedgerSelect value={party} onChange={setParty} filter={l=>l.type==="Debtor"} placeholder="Select client/debtor..."/>
          </FL>
          <FL label="Against invoice / booking file"><input value={againstInv} onChange={e=>setAgainstInv(e.target.value)} style={inp} placeholder="e.g. BOM/1726/SF00042 or TK-BOM-2026-0401"/></FL>

          {/* TDS section */}
          <div style={{padding:"10px 12px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775"}}>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:tdsDeducted?8:0}}>
              <input type="checkbox" checked={tdsDeducted} onChange={e=>setTdsDeducted(e.target.checked)} style={{cursor:"pointer",accentColor:"#854F0B"}}/>
              <span style={{fontSize:11,fontWeight:700,color:"#854F0B"}}>Party has deducted TDS before paying</span>
            </label>
            {tdsDeducted&&<>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:8}}>
                <FL label="TDS Section">
                  <select value={tdsSection} onChange={e=>setTdsSection(e.target.value)} style={inp}>
                    {Object.entries(TDS_SECTIONS).filter(([k])=>k!=="None").map(([k,v])=><option key={k} value={k}>{k}</option>)}
                  </select>
                </FL>
                <FL label="Rate"><div style={{...inp,background:"#f9fafb",fontSize:11,color:"#854F0B",fontWeight:700,display:"flex",alignItems:"center"}}>{tdsSec?.rate||0}%</div></FL>
                <FL label="TDS amount deducted"><input type="number" value={tdsAmt} onChange={e=>setTdsAmt(+e.target.value)} style={inp}/></FL>
              </div>
              <button onClick={autoTds} style={{...btnGh,fontSize:10,marginTop:4,padding:"3px 10px"}}>Auto-compute TDS</button>
            </>}
          </div>

          <FL label="Amount received (net, after TDS if any)">
            <input type="number" value={amount} onChange={e=>setAmount(+e.target.value)} style={{...inp,fontSize:16,fontWeight:700,color:"#0d1326"}}/>
          </FL>
          {tdsDeducted&&tdsAmt>0&&<div style={{padding:"6px 12px",borderRadius:7,background:"#E6F1FB",fontSize:10.5,color:"#185FA5"}}>
            Gross receivable: <b>{f(grossAmt)}</b> · TDS: <b>{f(tdsAmt)}</b> · Net receipt: <b>{f(netReceipt)}</b>
          </div>}
        </div>
      </div>

      {/* Narration */}
      <div style={{padding:"0 0 12px"}}>
        <FL label="Narration">
          <div style={{display:"flex",gap:8}}>
            <textarea value={narration} onChange={e=>setNarration(e.target.value)} rows={2}
              style={{...inp,flex:1,resize:"vertical"}} placeholder="Accounting narration..."/>
            <button onClick={autoNarr} style={{...btnGh,fontSize:10,padding:"4px 10px",height:"fit-content",marginTop:4}}>Auto</button>
          </div>
        </FL>
      </div>

      {/* Accounting effect */}
      <div style={{marginBottom:14,padding:"12px 14px",borderRadius:10,background:"#f3f4f8",border:"1px solid #e1e3ec"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <p style={{margin:0,fontSize:11,fontWeight:700,color:"#0d1326"}}>📒 Accounting Effect (Double Entry)</p>
          <span style={{fontSize:10.5,padding:"2px 9px",borderRadius:999,fontWeight:700,
            background:balanced?"#EAF3DE":"#FCEBEB",color:balanced?"#27500A":"#A32D2D"}}>
            {balanced?"✔ Balanced":"✗ Difference: "+f(Math.abs(tDr-tCr))}
          </span>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Dr/Cr","Ledger Account","Amount","Note"].map((h,i)=>(
              <th key={i} style={{padding:"6px 10px",textAlign:i===2?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {jEntries.map((e,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:e.side==="Dr"?"#f0f8ff":"#f0fff4"}}>
                <td style={{padding:"7px 10px",fontWeight:800,color:e.side==="Dr"?"#185FA5":"#27500A",fontFamily:"monospace"}}>{e.side}</td>
                <td style={{padding:"7px 10px",fontWeight:500,color:"#0d1326"}}>{e.ledger}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(e.amount)}</td>
                <td style={{padding:"7px 10px",fontSize:10,color:"#5a6691"}}>{e.note}</td>
              </tr>
            ))}
            <tr style={{background:"#0d1326"}}>
              <td colSpan={2} style={{padding:"7px 10px",fontWeight:700,color:"#d4a437"}}>TOTAL</td>
              <td style={{padding:"7px 10px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(tDr)} / {f(tCr)}</td>
              <td/>
            </tr>
          </tbody>
        </table>
      </div>

      <VNarr def={narration||`Being receipt from ${partyName} via ${payMode}${utr?" ref "+utr:""}${againstInv?" against "+againstInv:""}`}/>
      <VTot label="Total Receipt" val={amount} cur={cur}/>

      {saved&&<div style={{padding:"10px 14px",borderRadius:9,background:"#EAF3DE",fontSize:11,color:"#27500A",fontWeight:700,textAlign:"center"}}>✔ Receipt Voucher {vNo} saved · Ledger {partyName} updated</div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:10}}>
        <button onClick={()=>setSaved(true)} disabled={!balanced} style={{...btnG,opacity:!balanced?0.5:1,background:balanced?"#27500A":"#bfc3d6"}}>
          💾 Post Receipt {!balanced?"(Balance First)":""}
        </button>
      </div>
    </VWrap>
  );
}

/* ════════════════════════════════════════════════════════════════
   PAYMENT VOUCHER — COMPLETE REBUILD
   Dr Creditor  |  Cr Bank  |  Cr TDS Payable (if TDS deducted)
   ════════════════════════════════════════════════════════════════ */

export function PaymentVoucher({branch}){
  const mob=useMobile();
  const vNo=useVNo(branch,"PMT");
  const cfg=bc(branch);
  const cur=cfg.cur;

  const [date,setDate]=useState("2026-05-19");
  const [party,setParty]=useState("bsp_india");
  const [bankLedger,setBankLedger]=useState("hdfc_bom");
  const [payMode,setPayMode]=useState("NEFT");
  const [utr,setUtr]=useState("");
  const [amount,setAmount]=useState(214000);
  const [deductTds,setDeductTds]=useState(false);
  const [tdsSection,setTdsSection]=useState("194H");
  const [tdsAmt,setTdsAmt]=useState(0);
  const [againstInv,setAgainstInv]=useState("");
  const [narration,setNarration]=useState("");
  const [saved,setSaved]=useState(false);
  const [isBsp,setIsBsp]=useState(false);

  const partyName=LEDGER_REGISTRY.find(l=>l.id===party)?.name||party;
  const bankName=LEDGER_REGISTRY.find(l=>l.id===bankLedger)?.name||bankLedger;
  const tdsSec=TDS_SECTIONS[tdsSection];
  const grossAmt=amount+tdsAmt;
  const netBank=amount;
  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");

  const autoTds=()=>{
    if(deductTds&&tdsSec&&grossAmt>tdsSec.threshold){
      setTdsAmt(Math.round(grossAmt*tdsSec.rate/100));
      setAmount(grossAmt-Math.round(grossAmt*tdsSec.rate/100));
    }
  };

  const jEntries=[
    {side:"Dr",ledger:partyName,  amount:grossAmt,note:"Party account settled"},
    {side:"Cr",ledger:bankName,   amount:netBank, note:"Payment from bank"},
    ...(deductTds&&tdsAmt>0?[{side:"Cr",ledger:`TDS Payable (${tdsSection})`,amount:tdsAmt,note:"TDS to be deposited by 7th"}]:[]),
  ];
  const tDr=jEntries.filter(e=>e.side==="Dr").reduce((s,e)=>s+e.amount,0);
  const tCr=jEntries.filter(e=>e.side==="Cr").reduce((s,e)=>s+e.amount,0);
  const balanced=Math.abs(tDr-tCr)<0.01;

  return (
    <VWrap title="Payment Voucher" icon="💸" vNo={vNo} branch={branch}>
      <VHead vNo={vNo}/>

      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14,padding:"14px 0"}}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <FL label="Payment date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></FL>

          {/* Payment type - BSP has special treatment */}
          <FL label="Payment type">
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <button onClick={()=>setBsp(false)} style={{flex:1,padding:"7px",border:"none",cursor:"pointer",fontWeight:!bsp?700:500,background:!bsp?"#fff":"transparent",borderRadius:6}}>Regular Payment</button><button onClick={()=>setBsp(true)} style={{flex:1,padding:"7px",border:"none",cursor:"pointer",fontWeight:bsp?700:500,background:bsp?"#fff":"transparent",borderRadius:6}}>BSP Settlement</button>
            </div>
          </FL>
          {isBsp&&<div style={{padding:"8px 12px",borderRadius:8,background:"#E6F1FB",fontSize:10,color:"#185FA5"}}>
            BSP payment — debits BSP India Payable, credits bank. Challan for current week's tickets.
          </div>}

          <FL label="Pay to (party ledger — Dr)">
            <LedgerSelect value={party} onChange={setParty}
              filter={l=>l.type==="Creditor"||l.type==="Bank"||l.type==="Capital"||l.type==="Tax"||l.type==="Liability"}
              placeholder="Select supplier/creditor..."/>
          </FL>
          <FL label="Payment mode">
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["NEFT","RTGS","UPI","Cheque","Cash"].map(m=>(
                <button key={m} onClick={()=>setPayMode(m)} style={{padding:"4px 10px",borderRadius:6,fontSize:10.5,fontWeight:600,cursor:"pointer",
                  background:payMode===m?"#A32D2D":"#f3f4f8",color:payMode===m?"#fff":"#384677",border:"1.5px solid "+(payMode===m?"#A32D2D":"#e1e3ec")}}>
                  {m}
                </button>
              ))}
            </div>
          </FL>
          {payMode!=="Cash"&&<FL label="UTR / Reference"><input value={utr} onChange={e=>setUtr(e.target.value)} style={{...inp,fontFamily:"monospace"}} placeholder="UTR or transaction ref"/></FL>}
          <FL label="Pay from (bank/cash account — Cr)">
            <LedgerSelect value={bankLedger} onChange={setBankLedger} filter={l=>l.type==="Bank"||l.type==="Cash"} placeholder="Select bank..."/>
          </FL>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <FL label="Against invoice / BSP week"><input value={againstInv} onChange={e=>setAgainstInv(e.target.value)} style={inp} placeholder="Invoice no. or BSP billing period"/></FL>

          {/* TDS deduction */}
          <div style={{padding:"10px 12px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775"}}>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:deductTds?8:0}}>
              <input type="checkbox" checked={deductTds} onChange={e=>setDeductTds(e.target.checked)} style={{cursor:"pointer",accentColor:"#854F0B"}}/>
              <span style={{fontSize:11,fontWeight:700,color:"#854F0B"}}>Deduct TDS at source before payment</span>
            </label>
            {deductTds&&<>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                <FL label="TDS Section"><select value={tdsSection} onChange={e=>setTdsSection(e.target.value)} style={inp}>
                  {Object.entries(TDS_SECTIONS).filter(([k])=>k!=="None").map(([k,v])=><option key={k} value={k}>{k} ({v.rate}%)</option>)}
                </select></FL>
                <FL label="TDS amount"><input type="number" value={tdsAmt} onChange={e=>setTdsAmt(+e.target.value)} style={inp}/></FL>
                <div style={{display:"flex",alignItems:"flex-end"}}><button onClick={autoTds} style={{...btnGh,fontSize:10,padding:"6px 10px",width:"100%"}}>Auto-calc</button></div>
              </div>
              <p style={{margin:"6px 0 0",fontSize:9.5,color:"#854F0B"}}>Threshold: ₹{TDS_SECTIONS[tdsSection]?.threshold?.toLocaleString()} · Rate: {TDS_SECTIONS[tdsSection]?.rate}% · TDS due to Govt by 7th of next month</p>
            </>}
          </div>

          <FL label="Amount to pay (net after TDS)">
            <input type="number" value={amount} onChange={e=>setAmount(+e.target.value)} style={{...inp,fontSize:16,fontWeight:700,color:"#A32D2D"}}/>
          </FL>
          {deductTds&&tdsAmt>0&&<div style={{padding:"6px 12px",borderRadius:7,background:"#FCEBEB",fontSize:10.5,color:"#A32D2D"}}>
            Gross liability: <b>{f(grossAmt)}</b> · TDS held: <b>{f(tdsAmt)}</b> · Net payment: <b>{f(netBank)}</b>
          </div>}
          <FL label="Narration">
            <textarea value={narration} onChange={e=>setNarration(e.target.value)} rows={2}
              style={{...inp,resize:"vertical"}} placeholder="e.g. Being payment to BSP India for May 2026 BSP billing..."/>
          </FL>
        </div>
      </div>

      {/* Accounting effect */}
      <div style={{marginBottom:14,padding:"12px 14px",borderRadius:10,background:"#f3f4f8",border:"1px solid #e1e3ec"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <p style={{margin:0,fontSize:11,fontWeight:700,color:"#0d1326"}}>📒 Accounting Effect</p>
          <span style={{fontSize:10.5,padding:"2px 9px",borderRadius:999,fontWeight:700,background:balanced?"#EAF3DE":"#FCEBEB",color:balanced?"#27500A":"#A32D2D"}}>
            {balanced?"✔ Balanced":"✗ "+f(Math.abs(tDr-tCr))+" difference"}
          </span>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:"#0d1326"}}>{["Dr/Cr","Ledger","Amount","Note"].map((h,i)=><th key={i} style={{padding:"6px 10px",textAlign:i===2?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>{h}</th>)}</tr></thead>
          <tbody>{jEntries.map((e,i)=>(
            <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:e.side==="Dr"?"#f0f8ff":"#f0fff4"}}>
              <td style={{padding:"7px 10px",fontWeight:800,color:e.side==="Dr"?"#185FA5":"#27500A",fontFamily:"monospace"}}>{e.side}</td>
              <td style={{padding:"7px 10px",fontWeight:500}}>{e.ledger}</td>
              <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(e.amount)}</td>
              <td style={{padding:"7px 10px",fontSize:10,color:"#5a6691"}}>{e.note}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <VTot label="Total Payment" val={amount} cur={cur}/>
      {saved&&<div style={{padding:"10px",borderRadius:9,background:"#EAF3DE",fontSize:11,color:"#27500A",fontWeight:700,textAlign:"center"}}>✔ Payment Voucher {vNo} posted · {partyName} ledger updated{deductTds&&tdsAmt>0?` · TDS ${f(tdsAmt)} to deposit by 7th`:""}</div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:10}}>
        <button onClick={()=>setSaved(true)} disabled={!balanced} style={{...btnG,background:balanced?"#A32D2D":"#bfc3d6",opacity:!balanced?0.6:1}}>
          💸 Post Payment {!balanced?"(Balance First)":""}
        </button>
      </div>
    </VWrap>
  );
}

/* ════════════════════════════════════════════════════════════════
   CONTRA ENTRY — COMPLETE REBUILD
   Cash/Bank → Cash/Bank transfer only
   ════════════════════════════════════════════════════════════════ */

export function ContraVoucher({branch}){
  const mob=useMobile();
  const vNo=useVNo(branch,"CV");
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [date,setDate]=useState("2026-05-19");
  const [fromLedger,setFromLedger]=useState("cash_bom");
  const [toLedger,setToLedger]=useState("hdfc_bom");
  const [amount,setAmount]=useState(10000);
  const [ref,setRef]=useState("");
  const [narration,setNarration]=useState("");
  const [saved,setSaved]=useState(false);
  const fromName=LEDGER_REGISTRY.find(l=>l.id===fromLedger)?.name||fromLedger;
  const toName  =LEDGER_REGISTRY.find(l=>l.id===toLedger)?.name||toLedger;
  const isSame=fromLedger===toLedger;
  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");
  return (
    <VWrap title="Contra Entry" icon="🔄" vNo={vNo} branch={branch}>
      <VHead vNo={vNo}/>
      <div style={{padding:"10px 0 6px",marginBottom:8,fontSize:10.5,color:"#185FA5",background:"#E6F1FB",borderRadius:8,textAlign:"center"}}>
        Contra entries are ONLY for transfers between Cash and Bank accounts
      </div>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:12,padding:"12px 0"}}>
        <FL label="Transfer FROM (Cr — reducing)">
          <LedgerSelect value={fromLedger} onChange={setFromLedger} filter={l=>l.type==="Bank"||l.type==="Cash"} placeholder="Select..."/>
        </FL>
        <FL label="Transfer TO (Dr — increasing)">
          <LedgerSelect value={toLedger} onChange={setToLedger} filter={l=>(l.type==="Bank"||l.type==="Cash")&&l.id!==fromLedger} placeholder="Select..."/>
        </FL>
        <FL label="Amount"><input type="number" value={amount} onChange={e=>setAmount(+e.target.value)} style={{...inp,fontSize:15,fontWeight:700}}/></FL>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingBottom:12}}>
        <FL label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></FL>
        <FL label="Reference (UTR/Cash receipt no.)"><input value={ref} onChange={e=>setRef(e.target.value)} style={inp}/></FL>
      </div>
      <FL label="Narration"><textarea value={narration||`Being contra — cash deposited to bank / transfer from ${fromName} to ${toName}`} onChange={e=>setNarration(e.target.value)} rows={2} style={{...inp,resize:"vertical",marginBottom:12}}/></FL>
      {isSame&&<div style={{padding:"8px 12px",borderRadius:8,background:"#FCEBEB",fontSize:10.5,color:"#A32D2D",fontWeight:600,marginBottom:8}}>⚠ From and To accounts must be different</div>}
      <div style={{padding:"12px 14px",borderRadius:10,background:"#f3f4f8",marginBottom:12}}>
        <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#0d1326"}}>📒 Accounting Effect</p>
        {[{side:"Dr",ledger:toName,  note:"Account receiving funds"},
          {side:"Cr",ledger:fromName,note:"Account transferring funds"}
        ].map((e,i)=>(
          <div key={i} style={{display:"flex",gap:12,padding:"6px 0",borderBottom:"1px solid #f3f4f8",fontSize:11}}>
            <span style={{fontWeight:800,color:e.side==="Dr"?"#185FA5":"#27500A",fontFamily:"monospace",width:24}}>{e.side}</span>
            <span style={{flex:1,color:"#0d1326"}}>{e.ledger}</span>
            <span style={{fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(amount)}</span>
            <span style={{fontSize:9.5,color:"#5a6691"}}>{e.note}</span>
          </div>
        ))}
      </div>
      {saved&&<div style={{padding:"10px",borderRadius:9,background:"#EAF3DE",fontSize:11,color:"#27500A",fontWeight:700,textAlign:"center",marginBottom:8}}>✔ Contra {vNo} posted</div>}
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button onClick={()=>setSaved(true)} disabled={isSame||amount<=0} style={{...btnG,background:!isSame&&amount>0?"#185FA5":"#bfc3d6",opacity:isSame||amount<=0?0.5:1}}>🔄 Post Contra</button>
      </div>
    </VWrap>
  );
}

/* ════════════════════════════════════════════════════════════════
   JOURNAL ENTRY — COMPLETE REBUILD
   Multi-line Dr/Cr with ledger autocomplete and validation
   ════════════════════════════════════════════════════════════════ */

export function JournalEntry({branch}){
  const mob=useMobile();
  const vNo=useVNo(branch,"JV");
  const cfg=bc(branch);
  const cur=cfg.cur;

  const JV_TEMPLATES=[
    {name:"Salary Payable",entries:[
      {ledger:"e_salary",dr:120000,cr:0,narr:"Gross salaries for the month"},
      {ledger:"tds_pay_j",dr:0,cr:6000,narr:"TDS on salaries (194J)"},
      {ledger:"pf_pay",dr:0,cr:14400,narr:"PF deduction (12% employee + 12% employer)"},
      {ledger:"esi_pay",dr:0,cr:3900,narr:"ESI deduction (3.25% employer + 0.75% employee)"},
      {ledger:"salary_pay",dr:0,cr:95700,narr:"Net salary payable to staff"},
    ]},
    {name:"GST Transfer",entries:[
      {ledger:"cgst_out",dr:14850,cr:0,narr:"Transfer Output CGST"},
      {ledger:"sgst_out",dr:14850,cr:0,narr:"Transfer Output SGST"},
      {ledger:"cgst_in",dr:0,cr:8500,narr:"Input CGST setoff"},
      {ledger:"sgst_in",dr:0,cr:8500,narr:"Input SGST setoff"},
      {ledger:"hdfc_bom",dr:0,cr:12700,narr:"Net GST payment from bank"},
    ]},
    {name:"Depreciation",entries:[
      {ledger:"e_depn",dr:5000,cr:0,narr:"Monthly depreciation — computers (3yr life)"},
      {ledger:"retained",dr:0,cr:5000,narr:"Accumulated depreciation contra"},
    ]},
    {name:"ADM Provision",entries:[
      {ledger:"e_bad",dr:8400,cr:0,narr:"ADM provision — EK dispute (ADM-EK-2026-0428)"},
      {ledger:"adm_prov",dr:0,cr:8400,narr:"ADM Provision Account — contingent liability"},
    ]},
    {name:"TDS Deposit",entries:[
      {ledger:"tds_pay_h",dr:10700,cr:0,narr:"TDS 194H deposited to Govt for Apr 2026"},
      {ledger:"hdfc_bom",dr:0,cr:10700,narr:"Payment from bank — OLTAS challan"},
    ]},
  ];

  const [entries,setEntries]=useState([
    {id:1,ledger:"cgst_out",dr:0,cr:14850,narr:"Transfer output CGST"},
    {id:2,ledger:"sgst_out",dr:0,cr:14850,narr:"Transfer output SGST"},
    {id:3,ledger:"cgst_in",dr:8500,cr:0,narr:"Input CGST setoff"},
    {id:4,ledger:"sgst_in",dr:8500,cr:0,narr:"Input SGST setoff"},
    {id:5,ledger:"hdfc_bom",dr:0,cr:12700,narr:"Net GST payment"},
  ]);
  const [date,setDate]=useState("2026-05-19");
  const [masterNarr,setMasterNarr]=useState("Being GST payment for April 2026");
  const [saved,setSaved]=useState(false);

  const upd=(id,k,v)=>setEntries(es=>es.map(e=>e.id===id?{...e,[k]:v}:e));
  const add=()=>setEntries(es=>[...es,{id:Date.now(),ledger:"",dr:0,cr:0,narr:""}]);
  const rm=id=>setEntries(es=>es.filter(e=>e.id!==id));
  const applyTemplate=(tmpl)=>{
    setEntries(tmpl.entries.map((e,i)=>({id:i+1,...e})));
    setMasterNarr(`Being ${tmpl.name} entry`);
  };
  const tDr=entries.reduce((s,e)=>s+(+e.dr||0),0);
  const tCr=entries.reduce((s,e)=>s+(+e.cr||0),0);
  const balanced=Math.abs(tDr-tCr)<0.01;
  const f=n=>n>0?cur+Number(Math.round(n)).toLocaleString("en-IN"):"—";
  const getLedgerName=id=>LEDGER_REGISTRY.find(l=>l.id===id)?.name||id;

  return (
    <VWrap title="Journal Entry" icon="📒" vNo={vNo} branch={branch}>
      <VHead vNo={vNo}/>

      {/* Templates */}
      <div style={{padding:"10px 0 12px"}}>
        <p style={{margin:"0 0 8px",fontSize:10.5,fontWeight:700,color:"#5a6691",textTransform:"uppercase",letterSpacing:"0.5px"}}>Quick Templates</p>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {JV_TEMPLATES.map(t=>(
            <button key={t.name} onClick={()=>applyTemplate(t)} style={{padding:"4px 11px",borderRadius:7,fontSize:10.5,fontWeight:600,cursor:"pointer",background:"#f3f4f8",color:"#384677",border:"1.5px solid #e1e3ec"}}
              onMouseEnter={e=>{e.currentTarget.style.background="#0d1326";e.currentTarget.style.color="#d4a437";}}
              onMouseLeave={e=>{e.currentTarget.style.background="#f3f4f8";e.currentTarget.style.color="#384677";}}>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <FL label="Journal date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></FL>
        <FL label="Master narration"><input value={masterNarr} onChange={e=>setMasterNarr(e.target.value)} style={inp}/></FL>
      </div>

      {/* Dr/Cr Matrix */}
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:680}}>
            <thead><tr style={{background:"#0d1326"}}>
              <th style={{padding:"8px 10px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5,width:36}}>#</th>
              <th style={{padding:"8px 10px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>Ledger Account</th>
              <th style={{padding:"8px 10px",textAlign:"right",color:"#5da0e0",fontWeight:700,fontSize:9.5,width:130}}>Dr (₹)</th>
              <th style={{padding:"8px 10px",textAlign:"right",color:"#5ab84b",fontWeight:700,fontSize:9.5,width:130}}>Cr (₹)</th>
              <th style={{padding:"8px 10px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>Line Narration</th>
              <th style={{width:32}}/>
            </tr></thead>
            <tbody>
              {entries.map((e,i)=>(
                <tr key={e.id} style={{borderBottom:"1px solid #f3f4f8",background:e.dr>0?"#f0f8ff":e.cr>0?"#f0fff4":"#fff"}}>
                  <td style={{padding:"4px 8px",textAlign:"center",fontSize:10.5,color:"#5a6691"}}>{i+1}</td>
                  <td style={{padding:"3px 6px",minWidth:220}}>
                    <LedgerSelect value={e.ledger} onChange={v=>upd(e.id,"ledger",v)} placeholder="Select ledger..." style={{minHeight:30,fontSize:10.5}}/>
                  </td>
                  <td style={{padding:"3px 6px"}}>
                    <input type="number" value={e.dr||""} onChange={ev=>{upd(e.id,"dr",+ev.target.value||0);if(ev.target.value>0)upd(e.id,"cr",0);}}
                      placeholder="0.00" style={{...inp,textAlign:"right",minHeight:30,fontSize:11,color:"#185FA5",fontWeight:600}}/>
                  </td>
                  <td style={{padding:"3px 6px"}}>
                    <input type="number" value={e.cr||""} onChange={ev=>{upd(e.id,"cr",+ev.target.value||0);if(ev.target.value>0)upd(e.id,"dr",0);}}
                      placeholder="0.00" style={{...inp,textAlign:"right",minHeight:30,fontSize:11,color:"#27500A",fontWeight:600}}/>
                  </td>
                  <td style={{padding:"3px 6px"}}>
                    <input value={e.narr} onChange={ev=>upd(e.id,"narr",ev.target.value)} style={{...inp,minHeight:30,fontSize:10.5}}/>
                  </td>
                  <td style={{padding:"3px 6px",textAlign:"center"}}>
                    <button onClick={()=>rm(e.id)} style={{background:"transparent",border:"none",cursor:"pointer",color:"#A32D2D",fontSize:16,lineHeight:1}}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
                <td colSpan={2} style={{padding:"8px 10px"}}>
                  <button onClick={add} style={{...btnGh,fontSize:10.5,padding:"4px 12px"}}><Plus size={12}/> Add Line</button>
                </td>
                <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,fontVariantNumeric:"tabular-nums",color:"#185FA5",fontSize:14}}>{f(tDr)}</td>
                <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,fontVariantNumeric:"tabular-nums",color:"#27500A",fontSize:14}}>{f(tCr)}</td>
                <td colSpan={2} style={{padding:"8px 10px",textAlign:"right"}}>
                  <span style={{fontSize:11,padding:"3px 10px",borderRadius:999,fontWeight:700,
                    background:balanced?"#EAF3DE":"#FCEBEB",color:balanced?"#27500A":"#A32D2D"}}>
                    {balanced?"✔ Balanced":"Diff: "+f(Math.abs(tDr-tCr))}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {!balanced&&<div style={{padding:"8px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:700,marginBottom:10}}>
        ⚠ Journal entry is not balanced. Dr ({f(tDr)}) must equal Cr ({f(tCr)}). Difference: {f(Math.abs(tDr-tCr))}. Add or adjust a line.
      </div>}

      <VNarr def={masterNarr}/>
      {saved&&<div style={{padding:"10px",borderRadius:9,background:"#EAF3DE",fontSize:11,color:"#27500A",fontWeight:700,textAlign:"center",marginBottom:8}}>✔ Journal Entry {vNo} posted · {entries.length} ledgers updated</div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={()=>setSaved(true)} disabled={!balanced||entries.length<2} style={{...btnG,background:balanced&&entries.length>=2?"#185FA5":"#bfc3d6",opacity:!balanced||entries.length<2?0.6:1}}>
          📒 Post Journal {!balanced?"(Balance First)":entries.length<2?"(Min 2 lines)":""}
        </button>
      </div>
    </VWrap>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PRIORITY 2 — MASTERS + TAX + REPORTS
   Chart of Accounts · Ledgers · Sub-Agents · Tax/SAC
   TDS/TCS Register · Holiday Package Fields · P&L Enhancement
   ════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════
   CHART OF ACCOUNTS — COMPLETE WITH ALL TRAVEL AGENCY GROUPS
   ════════════════════════════════════════════════════════════════ */
/* ChartOfAccounts — see rebuilt version below */
/* MastersLedgers — see rebuilt version below */

export function SalesHoliday({branch,setRoute}){
  const mob=useMobile();
  const vNo=useVNo(branch,"SH");
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [client,setClient]=useState("Sharma Enterprises");
  const [tourCode,setTourCode]=useState("");
  const [dest,setDest]=useState("Dubai");
  const [deptDate,setDeptDate]=useState("2026-06-10");
  const [returnDate,setReturnDate]=useState("2026-06-14");
  const [pax,setPax]=useState(2);
  const [gstScheme,setGstScheme]=useState("A"); // A = agent 18% on fee | B = tour operator 5% on package
  const [consultant,setConsultant]=useState("Rahul M");
  const [components,setComponents]=useState([
    {id:1,type:"Flight",desc:"Air India BOM-DXB return × 2",cost:82000,sell:88000,gstRate:0,sacCode:"998552"},
    {id:2,type:"Hotel",desc:"Marriott Dubai 4N × 2 pax",cost:55000,sell:62000,gstRate:12,sacCode:"996311"},
    {id:3,type:"Transfers",desc:"Airport transfers × 2 ways",cost:3500,sell:5000,gstRate:5,sacCode:"998557"},
    {id:4,type:"Visa",desc:"UAE Visa Service × 2",cost:4800,sell:9600,gstRate:18,sacCode:"999299"},
    {id:5,type:"Insurance",desc:"Travel insurance × 2",cost:2400,sell:3200,gstRate:18,sacCode:"997133"},
  ]);
  const addComp=()=>setComponents(c=>[...c,{id:Date.now(),type:"Other",desc:"",cost:0,sell:0,gstRate:18,sacCode:""}]);
  const updComp=(id,k,v)=>setComponents(c=>c.map(x=>x.id===id?{...x,[k]:v}:x));
  const rmComp=id=>setComponents(c=>c.filter(x=>x.id!==id));

  const totCost=components.reduce((s,c)=>s+c.cost,0);
  const totSell=components.reduce((s,c)=>s+c.sell,0);
  const gp=totSell-totCost;
  const gpPct=totSell>0?+(gp/totSell*100).toFixed(1):0;

  // GST computation based on scheme
  const gstAmt=gstScheme==="A"
    ? Math.round(gp*0.18) // 18% on service fee/GP only
    : Math.round(totSell*0.05); // 5% on total package

  const COMP_TYPES=["Flight","Hotel","Transfers","Guide/Sightseeing","Visa","Insurance","Meals","Cruise","Excursion","Other"];
  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");
  return (
    <VWrap title="Holiday Package Sale" icon="🌴" vNo={vNo} branch={branch}>
      <VHead vNo={vNo}/>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:12,padding:"10px 0 12px"}}>
        <FL label="Client"><input value={client} onChange={e=>setClient(e.target.value)} style={inp}/></FL>
        <FL label="Tour code (optional)"><input value={tourCode} onChange={e=>setTourCode(e.target.value)} style={inp} placeholder="e.g. DXB-4N-2PAX"/></FL>
        <FL label="Destination"><input value={dest} onChange={e=>setDest(e.target.value)} style={inp}/></FL>
        <FL label="Departure date"><input type="date" value={deptDate} onChange={e=>setDeptDate(e.target.value)} style={inp}/></FL>
        <FL label="Return date"><input type="date" value={returnDate} onChange={e=>setReturnDate(e.target.value)} style={inp}/></FL>
        <FL label="No. of pax"><input type="number" value={pax} onChange={e=>setPax(+e.target.value)} style={inp}/></FL>
      </div>

      {/* GST Scheme selection */}
      <div style={{marginBottom:14,padding:"12px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775"}}>
        <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#854F0B"}}>GST Scheme (choose before invoice)</p>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <button onClick={()=>setGstScheme("A")} style={{flex:1,padding:"8px 12px",borderRadius:8,cursor:"pointer",
            background:gstScheme==="A"?"#854F0B":"#fff",color:gstScheme==="A"?"#fff":"#854F0B",
            border:"2px solid #854F0B",fontSize:10.5,fontWeight:600}}>
            Scheme A — 18% GST on service fee/commission only (ITC available)
          </button>
          <button onClick={()=>setGstScheme("B")} style={{flex:1,padding:"8px 12px",borderRadius:8,cursor:"pointer",
            background:gstScheme==="B"?"#854F0B":"#fff",color:gstScheme==="B"?"#fff":"#854F0B",
            border:"2px solid #854F0B",fontSize:10.5,fontWeight:600}}>
            Scheme B — 5% GST on total package value (No ITC — tour operator)
          </button>
        </div>
        <p style={{margin:0,fontSize:10,color:"#854F0B"}}>
          {gstScheme==="A"
            ?"You are acting as a TRAVEL AGENT — GST 18% on GP ₹"+gp.toLocaleString()+" = ₹"+gstAmt.toLocaleString()+". ITC on GDS/software/office expenses ALLOWED."
            :"You are a TOUR OPERATOR — GST 5% on package value ₹"+totSell.toLocaleString()+" = ₹"+gstAmt.toLocaleString()+". NO ITC allowed. Use for domestic/outbound holiday packages."}
        </p>
      </div>

      {/* Component breakout */}
      <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Package Component Breakout <span style={{fontSize:9.5,color:"#5a6691"}}>(required for tour operator GST and GSTR-1)</span></p>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:750}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["#","Type","Description","SAC Code","Cost Price","Sell Price","GST Rate","GP",""].map((h,i)=>(
                <th key={i} style={{padding:"8px 10px",textAlign:i>=4&&i<=7?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {components.map((c,i)=>(
                <tr key={c.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"4px 8px",textAlign:"center",color:"#5a6691",fontSize:10}}>{i+1}</td>
                  <td style={{padding:"3px 6px"}}>
                    <select value={c.type} onChange={e=>updComp(c.id,"type",e.target.value)} style={{...inp,minHeight:28,fontSize:10.5}}>
                      {COMP_TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={{padding:"3px 6px"}}>
                    <input value={c.desc} onChange={e=>updComp(c.id,"desc",e.target.value)} style={{...inp,minHeight:28,fontSize:10.5,minWidth:160}}/>
                  </td>
                  <td style={{padding:"3px 6px"}}>
                    <input value={c.sacCode} onChange={e=>updComp(c.id,"sacCode",e.target.value)} style={{...inp,minHeight:28,fontSize:10,fontFamily:"monospace",width:80}}/>
                  </td>
                  <td style={{padding:"3px 6px"}}>
                    <input type="number" value={c.cost} onChange={e=>updComp(c.id,"cost",+e.target.value)} style={{...inp,minHeight:28,textAlign:"right",fontSize:11,fontWeight:600,color:"#A32D2D"}}/>
                  </td>
                  <td style={{padding:"3px 6px"}}>
                    <input type="number" value={c.sell} onChange={e=>updComp(c.id,"sell",+e.target.value)} style={{...inp,minHeight:28,textAlign:"right",fontSize:11,fontWeight:600,color:"#185FA5"}}/>
                  </td>
                  <td style={{padding:"3px 6px"}}>
                    <select value={c.gstRate} onChange={e=>updComp(c.id,"gstRate",+e.target.value)} style={{...inp,minHeight:28,fontSize:10.5,width:65}}>
                      {[0,5,12,18].map(r=><option key={r} value={r}>{r}%</option>)}
                    </select>
                  </td>
                  <td style={{padding:"4px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:c.sell-c.cost>0?"#27500A":"#A32D2D"}}>
                    {f(c.sell-c.cost)}
                  </td>
                  <td style={{padding:"4px 8px",textAlign:"center"}}>
                    <button onClick={()=>rmComp(c.id)} style={{background:"transparent",border:"none",cursor:"pointer",color:"#A32D2D",fontSize:16}}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
              <td colSpan={4} style={{padding:"8px 10px",fontWeight:700,color:"#d4a437",fontSize:11}}>
                <button onClick={addComp} style={{...btnGh,fontSize:10,padding:"3px 10px",color:"#d4a437",borderColor:"#d4a437"}}><Plus size={11}/> Add Component</button>
              </td>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,color:"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(totCost)}</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(totSell)}</td>
              <td style={{padding:"8px 10px",textAlign:"right",color:"#d4a437",fontSize:10.5,fontWeight:700}}>{gstScheme==="A"?"18% on GP":"5% on pkg"}</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(gp)} ({gpPct}%)</td>
              <td/>
            </tr></tfoot>
          </table>
        </div>
      </div>

      {/* GST + Total summary */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:10,marginBottom:12}}>
        {[{l:"Package Cost",v:f(totCost),c:"#A32D2D"},{l:"Sell Price (net)",v:f(totSell),c:"#185FA5"},
          {l:"GST on Invoice",v:f(gstAmt),c:"#854F0B"},{l:"Total Billed",v:f(totSell+gstAmt),c:"#0d1326"},
          {l:"GP ("+gpPct+"%)",v:f(gp),c:gpPct>=12?"#27500A":gpPct>=8?"#854F0B":"#A32D2D"},
        ].map((k,i)=>(
          <div key={i} style={{padding:"9px 12px",borderRadius:8,background:"#f3f4f8",textAlign:"center"}}>
            <p style={{margin:0,fontSize:9,color:"#5a6691",textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"3px 0 0",fontSize:13,fontWeight:800,color:k.c}}>{k.v}</p>
          </div>
        ))}
      </div>

      <VParty branch={branch} label="Client" name={client} gstin="27AABCX****1Z5"/>
      <VNarr def={`Being holiday package sale — ${dest}, ${pax} pax, ${deptDate} to ${returnDate}${tourCode?" tour code "+tourCode:""}. GST Scheme ${gstScheme} applicable.`}/>
      <VTot label="Total Invoice" val={totSell+gstAmt} cur={cur}/>
    </VWrap>
  );
}

/* ════════════════════════════════════════════════════════════════
   VENDOR TERMS MASTER — ENHANCED
   ════════════════════════════════════════════════════════════════ */

export function RecurringVouchers({branch}){
  const mob=useMobile();
  const [templates,setTemplates]=useState(RECURRING_DATA);
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({name:"",type:"Journal",freq:"Monthly",day:1,dr:"",cr:"",amt:0});
  const TODAY="2026-05-19";
  const due=templates.filter(t=>t.active&&t.nextRun<=TODAY);
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const run=id=>setTemplates(ts=>ts.map(t=>t.id===id?{...t,lastRun:TODAY,nextRun:TODAY.replace(/-\d\d$/,"-01").replace(/\d{4}/,(y)=>t.freq==="Monthly"?y:String(parseInt(y)+1))}:t));

  return(
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔄</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Recurring Voucher Templates</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{templates.length} templates · {due.length} due for posting · Auto-posting saves time each month</p>
          </div>
        </div>
        <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> New Template</button>
      </div>

      {due.length>0&&<div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:10.5,color:"#854F0B",fontWeight:600,display:"flex",gap:8,flexWrap:"wrap"}}>
        <Clock size={14}/> {due.length} recurring voucher{due.length>1?"s":""} due for posting:
        {due.map(t=><span key={t.id} style={{padding:"1px 7px",borderRadius:999,background:"#854F0B",color:"#fff",fontSize:9.5}}>{t.name}</span>)}
        <button onClick={()=>due.forEach(t=>run(t.id))} style={{...btnG,padding:"2px 10px",fontSize:9.5,background:"#854F0B",marginLeft:"auto"}}>Post All Now</button>
      </div>}

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Template","Type","Freq","Dr Ledger","Cr Ledger","Amount","Next Run","Status","Action"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i===6?"center":i===5?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{templates.map((t,i)=>(
            <tr key={t.id} style={{borderBottom:"1px solid #f3f4f8",background:t.nextRun<=TODAY?"#fffaf0":i%2===0?"#fff":"#fafafa",opacity:t.active?1:0.5}}>
              <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{t.name}</td>
              <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{t.type}</span></td>
              <td style={{padding:"8px 12px",color:"#384677",fontSize:10.5}}>{t.freq}</td>
              <td style={{padding:"8px 12px",color:"#A32D2D",fontSize:10.5}}>{t.dr}</td>
              <td style={{padding:"8px 12px",color:"#27500A",fontSize:10.5}}>{t.cr}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(t.amt)}</td>
              <td style={{padding:"8px 12px",textAlign:"center",fontWeight:t.nextRun<=TODAY?700:400,color:t.nextRun<=TODAY?"#854F0B":"#5a6691"}}>{t.nextRun}{t.nextRun<=TODAY&&" ⚡"}</td>
              <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:t.active?"#EAF3DE":"#f3f4f8",color:t.active?"#27500A":"#5a6691"}}>{t.active?"Active":"Paused"}</span></td>
              <td style={{padding:"8px 12px"}}>
                <div style={{display:"flex",gap:4}}>
                  {t.active&&t.nextRun<=TODAY&&<button onClick={()=>run(t.id)} style={{...btnG,padding:"2px 8px",fontSize:9.5,background:"#27500A"}}>Post</button>}
                  <button onClick={()=>setTemplates(ts=>ts.map(x=>x.id===t.id?{...x,active:!x.active}:x))} style={{...btnGh,padding:"2px 8px",fontSize:9.5}}>{t.active?"Pause":"Resume"}</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>New Recurring Template</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <FL label="Template name"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp} placeholder="e.g. Office Rent — BOM"/></FL>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <FL label="Voucher type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}><option>Journal</option><option>Payment</option><option>Receipt</option></select></FL>
                <FL label="Frequency"><select value={form.freq} onChange={e=>setForm(f=>({...f,freq:e.target.value}))} style={inp}><option>Monthly</option><option>Quarterly</option><option>Annual</option><option>Weekly</option></select></FL>
                <FL label="Day of month"><input type="number" min={1} max={31} value={form.day} onChange={e=>setForm(f=>({...f,day:+e.target.value}))} style={inp}/></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Debit ledger"><input value={form.dr} onChange={e=>setForm(f=>({...f,dr:e.target.value}))} style={inp} placeholder="e.g. Office Rent"/></FL>
                <FL label="Credit ledger"><input value={form.cr} onChange={e=>setForm(f=>({...f,cr:e.target.value}))} style={inp} placeholder="e.g. HDFC Bank"/></FL>
              </div>
              <FL label="Amount (₹)"><input type="number" value={form.amt} onChange={e=>setForm(f=>({...f,amt:+e.target.value}))} style={inp}/></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={()=>{const id=`REC${String(templates.length+1).padStart(3,"0")}`;setTemplates(ts=>[...ts,{...form,id,lastRun:"—",nextRun:`2026-06-${String(form.day).padStart(2,"0")}`,active:true}]);setModal(false);}} style={btnG}>Create Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── FOREX GAIN / LOSS REPORT ────────────────────────────────── */

export function RefundTracker({branch,setRoute}){
  const mob=useMobile();
  const [refunds,setRefunds]=useState(REFUNDS_DATA);
  const [sel,setSel]=useState(null);
  const STATUS_CLR={"Cancellation Requested":"#854F0B","BSP Filed":"#185FA5","Airline Refund Received":"#1D9E75","Client Refund Done":"#27500A",Closed:"#5a6691"};
  const STATUS_BG ={"Cancellation Requested":"#FAEEDA","BSP Filed":"#E6F1FB","Airline Refund Received":"#EAF3DE","Client Refund Done":"#EAF3DE",Closed:"#f3f4f8"};
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const advance=id=>setRefunds(rs=>rs.map(r=>r.id===id?{...r,status:STATUS_FLOW[Math.min(STATUS_FLOW.indexOf(r.status)+1,STATUS_FLOW.length-1)]}:r));

  return(
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FCEBEB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>↩</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Refund Tracker</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Cancellation → BSP → Airline → Client refund pipeline</p>
          </div>
        </div>
        <button onClick={()=>setRoute("/sales/cancellation")} style={{...btnGh,fontSize:11}}>+ New Cancellation</button>
      </div>

      {/* Pipeline overview */}
      <div style={{display:"flex",gap:0,marginBottom:14,overflow:"auto"}}>
        {STATUS_FLOW.map((s,i)=>{
          const cnt=refunds.filter(r=>r.status===s).length;
          return(
            <div key={s} style={{flex:1,textAlign:"center",padding:"8px 4px",borderRight:i<STATUS_FLOW.length-1?"1px dashed #e1e3ec":"none",minWidth:100}}>
              <p style={{margin:0,fontSize:20,fontWeight:800,color:cnt>0?STATUS_CLR[s]:"#bfc3d6"}}>{cnt}</p>
              <p style={{margin:"2px 0 0",fontSize:8.5,fontWeight:600,color:cnt>0?STATUS_CLR[s]:"#bfc3d6",lineHeight:1.3}}>{s}</p>
            </div>
          );
        })}
      </div>

      {refunds.map(r=>{
        const stageIdx=STATUS_FLOW.indexOf(r.status);
        return(
          <div key={r.id} style={{...card,marginBottom:10,borderLeft:`4px solid ${STATUS_CLR[r.status]||"#384677"}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                  <span style={{fontFamily:"monospace",fontSize:9.5,padding:"1px 7px",borderRadius:4,background:"#0d1326",color:"#d4a437"}}>{r.id}</span>
                  <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[r.status],color:STATUS_CLR[r.status]}}>{r.status}</span>
                </div>
                <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>{r.client} — {r.dest}</p>
                <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Booking: {r.bookingId} · Cancelled: {r.cancelDate} · Reason: {r.reason}</p>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>Original: {f(r.amount)}</p>
                <p style={{margin:"1px 0 0",fontSize:12,fontWeight:700,color:"#A32D2D"}}>Charges: {f(r.charges)}</p>
                <p style={{margin:"1px 0 0",fontSize:14,fontWeight:800,color:"#27500A"}}>Refund: {f(r.refundAmt)}</p>
              </div>
            </div>

            {/* Stage progress */}
            <div style={{display:"flex",gap:0,marginBottom:10}}>
              {STATUS_FLOW.map((s,i)=>(
                <div key={s} style={{flex:1,height:4,borderRadius:i===0?"4px 0 0 4px":i===STATUS_FLOW.length-1?"0 4px 4px 0":"none",
                  background:i<=stageIdx?STATUS_CLR[r.status]:"#e1e3ec"}}/>
              ))}
            </div>

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:10.5,color:"#5a6691"}}>
                BSP Ref: <b>{r.bspRef||"—"}</b> · Refund mode: <b>{r.mode}</b>
                {r.clientRefund&&<span style={{marginLeft:8,color:"#27500A",fontWeight:700}}>✔ Client refund done</span>}
              </div>
              {stageIdx<STATUS_FLOW.length-1&&(
                <button onClick={()=>advance(r.id)} style={{...btnG,padding:"4px 12px",fontSize:10,background:STATUS_CLR[STATUS_FLOW[stageIdx+1]]||"#0d1326"}}>
                  → {STATUS_FLOW[stageIdx+1]}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   BATCH D — PRIORITY 4: SYSTEM + STRATEGIC (8 screens)
   QuickPOS · NotificationCentre · CorporateAccounts
   Form26AS · ApiKeySettings · Recruitment · TrainingRecords · DocumentManager
   ════════════════════════════════════════════════════════════════ */

/* ── POS / QUICK BOOKING ─────────────────────────────────────── */

export function QuickPOS({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch?.code||"BOM";
  const vNo=useVNo(branch,"POS");
  const [step,setStep]=useState(1); // 1=client 2=service 3=payment 4=done
  const [client,setClient]=useState({name:"",mobile:"",isExisting:false});
  const [service,setService]=useState("Flight");
  const [amount,setAmount]=useState(0);
  const [mode,setMode]=useState("Cash");
  const [ref,setRef]=useState("");
  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");

  const SERVICES=[
    {name:"Flight Ticket",icon:"✈",color:"#185FA5",bg:"#E6F1FB",suggestAmt:8500,route:"/sales/flight"},
    {name:"Holiday Package",icon:"🌴",color:"#27500A",bg:"#EAF3DE",suggestAmt:45000,route:"/sales/holiday"},
    {name:"Visa",icon:"🛂",color:"#854F0B",bg:"#FAEEDA",suggestAmt:3800,route:"/sales/visa"},
    {name:"Hotel",icon:"🏨",color:"#1D9E75",bg:"#EAF3DE",suggestAmt:12000,route:"/sales/hotel"},
    {name:"Insurance",icon:"🛡",color:"#384677",bg:"#f3f4f8",suggestAmt:1500,route:"/sales/insurance"},
    {name:"Miscellaneous",icon:"📋",color:"#5a6691",bg:"#f3f4f8",suggestAmt:2000,route:"/sales/misc"},
  ];
  const selSvc=SERVICES.find(s=>s.name===service)||SERVICES[0];

  return(
    <div style={{padding:"12px 10px",maxWidth:700,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>⚡</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Quick POS Booking</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Walk-in client · Fast entry · Instant receipt · {brCode}</p>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          {["1","2","3","4"].map((n,i)=>(
            <div key={n} style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,
              background:step>i+1?"#27500A":step===i+1?"#0d1326":"#f3f4f8",
              color:step>i+1?"#fff":step===i+1?"#d4a437":"#5a6691"}}>
              {step>i+1?"✔":n}
            </div>
          ))}
        </div>
      </div>

      {step===1&&(
        <div style={{...card}}>
          <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Step 1 — Client Details</p>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <button onClick={()=>setClient(c=>({...c,isExisting:false}))} style={{...!client.isExisting?btnG:btnGh,fontSize:11,flex:1}}>Walk-in / New</button>
            <button onClick={()=>setClient(c=>({...c,isExisting:true}))} style={{...client.isExisting?btnG:btnGh,fontSize:11,flex:1}}>Existing Client</button>
          </div>
          {!client.isExisting&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <FL label="Client name"><input value={client.name} onChange={e=>setClient(c=>({...c,name:e.target.value}))} style={inp} placeholder="Enter name or 'Walk-in'"/></FL>
              <FL label="Mobile number"><input value={client.mobile} onChange={e=>setClient(c=>({...c,mobile:e.target.value}))} style={inp} placeholder="+91 98200 XXXXX"/></FL>
            </div>
          )}
          {client.isExisting&&(
            <FL label="Search existing client">
              <select style={inp} onChange={e=>setClient(c=>({...c,name:e.target.value,mobile:""}))} defaultValue="">
                <option value="" disabled>Select client...</option>
                {[...new Set(GP_BILLS.map(b=>b.client))].sort().map(c=><option key={c}>{c}</option>)}
              </select>
            </FL>
          )}
          <button onClick={()=>setStep(2)} disabled={!client.name} style={{...btnG,marginTop:16,width:"100%",opacity:!client.name?0.5:1}}>Next → Select Service</button>
        </div>
      )}

      {step===2&&(
        <div style={{...card}}>
          <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Step 2 — Service & Amount</p>
          <p style={{margin:"0 0 12px",fontSize:10.5,color:"#5a6691"}}>Client: <b>{client.name}</b></p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
            {SERVICES.map(s=>(
              <div key={s.name} onClick={()=>{setService(s.name);setAmount(s.suggestAmt);}}
                style={{padding:"12px 10px",borderRadius:10,cursor:"pointer",textAlign:"center",border:`2px solid ${service===s.name?s.color:"#e1e3ec"}`,background:service===s.name?s.bg:"#fff",transition:"all 0.15s"}}>
                <span style={{fontSize:22}}>{s.icon}</span>
                <p style={{margin:"4px 0 0",fontSize:10.5,fontWeight:700,color:s.color}}>{s.name}</p>
                <p style={{margin:"1px 0 0",fontSize:9,color:"#5a6691"}}>~{cur+(s.suggestAmt/1000).toFixed(0)}K</p>
              </div>
            ))}
          </div>
          <FL label="Amount (₹)"><input type="number" value={amount} onChange={e=>setAmount(+e.target.value)} style={{...inp,fontSize:18,fontWeight:700,color:"#0d1326"}}/></FL>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button onClick={()=>setStep(1)} style={{...btnGh,flex:1}}>← Back</button>
            <button onClick={()=>setStep(3)} disabled={!amount} style={{...btnG,flex:2,opacity:!amount?0.5:1}}>Next → Payment</button>
          </div>
        </div>
      )}

      {step===3&&(
        <div style={{...card}}>
          <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Step 3 — Payment Collection</p>
          <div style={{padding:"12px 14px",borderRadius:9,background:"#EAF3DE",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <p style={{margin:0,fontSize:10.5,color:"#27500A"}}>{client.name} — {service}</p>
              <p style={{margin:"2px 0 0",fontSize:22,fontWeight:800,color:"#27500A"}}>{f(amount)}</p>
            </div>
            <span style={{fontSize:24}}>{selSvc.icon}</span>
          </div>
          <FL label="Payment mode">
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["Cash","UPI","Card","Cheque","NEFT"].map(m=>(
                <button key={m} onClick={()=>setMode(m)} style={{padding:"6px 14px",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:600,
                  background:mode===m?"#0d1326":"#f3f4f8",color:mode===m?"#d4a437":"#384677",border:`1.5px solid ${mode===m?"#d4a437":"#e1e3ec"}`}}>
                  {m}
                </button>
              ))}
            </div>
          </FL>
          {mode!=="Cash"&&<FL label="Reference / UTR"><input value={ref} onChange={e=>setRef(e.target.value)} style={{...inp,marginTop:8}} placeholder="Transaction ref..."/></FL>}
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button onClick={()=>setStep(2)} style={{...btnGh,flex:1}}>← Back</button>
            <button onClick={()=>setStep(4)} style={{...btnG,flex:2,background:"#27500A",fontSize:13}}>✔ Confirm & Print Receipt</button>
          </div>
        </div>
      )}

      {step===4&&(
        <div style={{...card,textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:12}}>✅</div>
          <p style={{margin:"0 0 4px",fontSize:16,fontWeight:800,color:"#27500A"}}>Booking Confirmed!</p>
          <p style={{margin:"0 0 14px",fontSize:11,color:"#5a6691"}}>Receipt #{vNo} · {client.name} · {service} · {f(amount)}</p>
          <div style={{padding:"12px 14px",borderRadius:9,background:"#f3f4f8",marginBottom:14,textAlign:"left"}}>
            <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:11,borderBottom:"1px solid #e1e3ec"}}><span style={{color:"#5a6691"}}>Voucher No.</span><span style={{fontWeight:600}}>{vNo}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:11,borderBottom:"1px solid #e1e3ec"}}><span style={{color:"#5a6691"}}>Client</span><span style={{fontWeight:600}}>{client.name}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:11,borderBottom:"1px solid #e1e3ec"}}><span style={{color:"#5a6691"}}>Service</span><span style={{fontWeight:600}}>{service}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:11}}><span style={{color:"#5a6691"}}>Branch</span><span style={{fontWeight:600}}>{bc(branch).voucherPrefix}</span></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>window.print()} style={{...btnG,flex:1}}><Printer size={13}/> Print Receipt</button>
            <button onClick={()=>setRoute(selSvc.route)} style={{...btnGh,flex:1}}>Full Invoice →</button>
            <button onClick={()=>{setStep(1);setClient({name:"",mobile:"",isExisting:false});setAmount(0);}} style={{...btnGh,flex:1}}>New Booking</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── NOTIFICATION CENTRE ─────────────────────────────────────── */

export function VoucherEntryTabbed(){
  const [tab,setTab]=useState("entry");
  const tabs=[{id:"entry",label:"1. Entry"},{id:"lines",label:"2. Line Items"},{id:"tax",label:"3. Tax Computation"},{id:"attach",label:"4. Attachments"},{id:"approval",label:"5. Approvals"},{id:"audit",label:"6. Audit Trail"},{id:"related",label:"7. Related Vouchers"},{id:"notes",label:"8. Notes"}];
  return TAB_Page("Receipt Voucher — RV-BOM/2026/4521", "Customer: L&T Limited · Amount: ₹4,85,000 · Posted 2026-05-19 · Standardised 8-tab structure",
    {user:"Rohan",date:"2026-05-19 17:42",created:"2026-05-19 17:30"},
    <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
      <div style={{display:"flex",borderBottom:"1px solid #e1e3ec",overflowX:"auto",background:"#fafbfd"}}>{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={tabBtnStyle(tab===t.id)}>{t.label}</button>)}</div>
      {tab==="entry"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
          <FL label="Voucher No."><input defaultValue="RV-BOM/2026/4521" readOnly style={{...inpStd,fontFamily:"monospace",background:"#fafbfd"}}/></FL>
          <FL label="Voucher Date"><input type="date" defaultValue="2026-05-19" style={inpStd}/></FL>
          <FL label="Branch"><select style={inpStd}><option>BOM (Mumbai)</option></select></FL>
          <FL label="Customer"><select style={inpStd}><option>L&T Limited (CUST-BOM-00128)</option></select></FL>
          <FL label="Bank/Cash A/c"><select style={inpStd}><option>HDFC BOM Operational — XXXX4321</option><option>SBI BOM — XXXX2255</option></select></FL>
          <FL label="Payment Mode"><select style={inpStd}><option>NEFT</option><option>RTGS</option><option>Cheque</option><option>UPI</option></select></FL>
          <FL label="Amount (₹)"><input type="number" defaultValue="485000" style={{...inpStd,fontWeight:700,fontSize:14}}/></FL>
          <FL label="Reference No."><input defaultValue="UTR123456789" style={{...inpStd,fontFamily:"monospace"}}/></FL>
          <FL label="Currency"><input defaultValue="INR" readOnly style={{...inpStd,background:"#fafbfd"}}/></FL>
          <div style={{gridColumn:"1 / -1"}}><FL label="Narration"><textarea defaultValue="Receipt against Invoice INV-BOM/2026/8721 dt 15-May-2026" rows={2} style={{...inpStd,fontFamily:"inherit",resize:"vertical"}}/></FL></div>
        </div>
      )}
      {tab==="lines"&&tabPanel(
        <>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead style={{background:"#f7f8fb"}}><tr>{["#","Invoice Ref","Invoice Date","Invoice Amt","Outstanding","Allocated","Balance"].map((h,i)=><th key={h} style={{padding:"9px 12px",textAlign:i<2?"left":"right",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
            <tbody>
              <tr style={{borderBottom:"1px solid #f0f2f7"}}><td style={{padding:"10px 12px"}}>1</td><td style={{padding:"10px 12px",fontFamily:"monospace",fontWeight:600}}>INV-BOM/2026/8721</td><td style={{padding:"10px 12px",textAlign:"right",color:"#5a6691"}}>2026-05-15</td><td style={{padding:"10px 12px",textAlign:"right"}}>₹3,25,000</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700}}>₹3,25,000</td><td style={{padding:"10px 12px",textAlign:"right"}}><input defaultValue="325000" type="number" style={{...inpStd,textAlign:"right",fontWeight:700,maxWidth:120,marginLeft:"auto"}}/></td><td style={{padding:"10px 12px",textAlign:"right",color:"#22c55e",fontWeight:700}}>₹0</td></tr>
              <tr style={{borderBottom:"1px solid #f0f2f7"}}><td style={{padding:"10px 12px"}}>2</td><td style={{padding:"10px 12px",fontFamily:"monospace",fontWeight:600}}>INV-BOM/2026/8688</td><td style={{padding:"10px 12px",textAlign:"right",color:"#5a6691"}}>2026-05-08</td><td style={{padding:"10px 12px",textAlign:"right"}}>₹1,85,000</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700}}>₹1,85,000</td><td style={{padding:"10px 12px",textAlign:"right"}}><input defaultValue="160000" type="number" style={{...inpStd,textAlign:"right",fontWeight:700,maxWidth:120,marginLeft:"auto"}}/></td><td style={{padding:"10px 12px",textAlign:"right",color:"#A32D2D",fontWeight:700}}>₹25,000</td></tr>
              <tr style={{background:"#0d1326",color:"#d4a437"}}><td colSpan={5} style={{padding:"10px 12px",fontWeight:700,textAlign:"right"}}>TOTAL ALLOCATED</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,fontSize:13,fontFamily:"monospace"}}>₹4,85,000</td><td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace"}}>₹25,000</td></tr>
            </tbody>
          </table>
          <button style={{marginTop:8,padding:"7px 14px",background:"transparent",border:"1px dashed #d4a437",color:"#d4a437",borderRadius:5,fontSize:11.5,cursor:"pointer",fontWeight:600}}>+ Add another invoice to allocate against</button>
        </>
      )}
      {tab==="tax"&&tabPanel(
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326",marginBottom:10}}>Tax Computation (for Receipt Voucher — typically nil)</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <tbody>
              <tr style={{borderBottom:"1px solid #f0f2f7"}}><td style={{padding:"9px 12px",color:"#5a6691"}}>Gross Receipt</td><td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace"}}>₹4,85,000</td></tr>
              <tr style={{borderBottom:"1px solid #f0f2f7"}}><td style={{padding:"9px 12px",color:"#5a6691"}}>Less: TDS u/s 194C (deducted by L&T)</td><td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:"#A32D2D"}}>(–) ₹9,700</td></tr>
              <tr style={{borderBottom:"1px solid #f0f2f7"}}><td style={{padding:"9px 12px",color:"#5a6691"}}>Net Receipt</td><td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700}}>₹4,75,300</td></tr>
              <tr style={{borderBottom:"1px solid #f0f2f7"}}><td style={{padding:"9px 12px",color:"#5a6691"}}>TDS Certificate Received?</td><td style={{padding:"9px 12px",textAlign:"right"}}><span style={{padding:"2px 8px",background:"#fff3cd",color:"#856404",borderRadius:3,fontSize:10,fontWeight:700}}>Pending — Q1 26-27</span></td></tr>
              <tr><td style={{padding:"9px 12px",color:"#5a6691"}}>GST Impact</td><td style={{padding:"9px 12px",textAlign:"right",color:"#5a6691"}}>Nil (Receipt — already accounted at invoice stage)</td></tr>
            </tbody>
          </table>
        </div>
      )}
      {tab==="attach"&&tabPanel(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:14}}>{[{n:"NEFT Confirmation",sz:"245 KB",ty:"pdf"},{n:"Customer Email Confirmation",sz:"82 KB",ty:"eml"}].map((f,i)=>(<div key={i} style={{padding:14,background:"#fafbfd",border:"1px solid #e1e3ec",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:30}}>{f.ty==="pdf"?"📄":"📧"}</p><p style={{margin:"6px 0 2px",fontSize:11,color:"#0d1326",fontWeight:600}}>{f.n}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{f.sz} · {f.ty.toUpperCase()}</p><button style={{marginTop:6,padding:"3px 10px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:4,fontSize:10,cursor:"pointer",fontWeight:600}}>↓ Download</button></div>))}</div>
          <div style={{padding:30,border:"2px dashed #d4a437",borderRadius:8,textAlign:"center",background:"#fafbfd"}}><p style={{margin:0,fontSize:36}}>📂</p><p style={{margin:"6px 0 2px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Drag & drop or browse</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>PDF, image, eml — max 10 MB per file</p></div>
        </div>
      )}
      {tab==="approval"&&tabPanel(
        <div>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Approval Workflow</p>
          {[{step:"Created",by:"Rohan",ts:"2026-05-19 17:30",status:"done"},{step:"Maker Review",by:"Rohan",ts:"2026-05-19 17:42",status:"done"},{step:"Checker (Sr.AE)",by:"Sughra Sayed",ts:"2026-05-19 18:08",status:"done"},{step:"Sr. FM Approval",by:"Auto-skipped (within Sr.AE limit)",ts:"—",status:"skip"},{step:"Posted to Books",by:"System",ts:"2026-05-19 18:08",status:"done"}].map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",background:"#fafbfd",borderRadius:6,marginBottom:8,border:"1px solid #e1e3ec"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:s.status==="done"?"#22c55e":s.status==="skip"?"#cbd0dc":"#d4a437",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14}}>{s.status==="done"?"✓":s.status==="skip"?"⊘":"○"}</div>
              <div style={{flex:1}}><p style={{margin:0,fontSize:12.5,fontWeight:700,color:"#0d1326"}}>{s.step}</p><p style={{margin:"2px 0 0",fontSize:11,color:"#5a6691"}}>by {s.by} · {s.ts}</p></div>
              <span style={{padding:"3px 10px",background:s.status==="done"?"#d4edda":s.status==="skip"?"#e2e3e5":"#fff3cd",color:s.status==="done"?"#155724":s.status==="skip"?"#383d41":"#856404",borderRadius:3,fontSize:10,fontWeight:700,letterSpacing:"0.3px"}}>{s.status.toUpperCase()}</span>
            </div>))}
        </div>
      )}
      {tab==="audit"&&tabPanel(
        <div>{[{ts:"2026-05-19 18:08",u:"System",a:"POSTED",d:"Posted to General Ledger"},{ts:"2026-05-19 18:08",u:"Sughra Sayed",a:"APPROVED",d:"Approved within ₹50K-₹2L tier"},{ts:"2026-05-19 17:42",u:"Rohan",a:"SUBMITTED",d:"Submitted for approval"},{ts:"2026-05-19 17:40",u:"Rohan",a:"EDITED",d:"Reference No. updated: blank → UTR123456789"},{ts:"2026-05-19 17:30",u:"Rohan",a:"CREATED",d:"Receipt voucher created against L&T Limited"}].map((h,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",borderBottom:"1px solid #f0f2f7"}}><span style={{fontFamily:"monospace",fontSize:10.5,color:"#5a6691",minWidth:130}}>{h.ts}</span><span style={{fontSize:11.5,color:"#0d1326",fontWeight:600,minWidth:110}}>{h.u}</span><span style={{padding:"2px 8px",background:h.a==="POSTED"||h.a==="APPROVED"?"#d4edda":h.a==="CREATED"?"#cfe2ff":"#fff3cd",color:h.a==="POSTED"||h.a==="APPROVED"?"#155724":h.a==="CREATED"?"#004085":"#856404",borderRadius:3,fontSize:9.5,fontWeight:700,minWidth:80,textAlign:"center"}}>{h.a}</span><span style={{fontSize:11.5,color:"#5a6691"}}>{h.d}</span></div>))}</div>
      )}
      {tab==="related"&&tabPanel(
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead style={{background:"#f7f8fb"}}><tr>{["Voucher","Type","Date","Amount","Relationship"].map((h,i)=><th key={h} style={{padding:"9px 12px",textAlign:i===3?"right":"left",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>{[{v:"INV-BOM/2026/8721",t:"Tax Invoice",d:"2026-05-15",a:325000,r:"Settled (full)"},{v:"INV-BOM/2026/8688",t:"Tax Invoice",d:"2026-05-08",a:185000,r:"Partially settled (₹1.60L of ₹1.85L)"}].map(r=>(<tr key={r.v} style={{borderBottom:"1px solid #f0f2f7"}}><td style={{padding:"10px 12px",fontFamily:"monospace",fontWeight:600}}>{r.v}</td><td style={{padding:"10px 12px"}}>{r.t}</td><td style={{padding:"10px 12px",color:"#5a6691"}}>{r.d}</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700}}>₹{r.a.toLocaleString("en-IN")}</td><td style={{padding:"10px 12px",fontSize:11.5,color:"#5a6691"}}>{r.r}</td></tr>))}</tbody>
        </table>
      )}
      {tab==="notes"&&tabPanel(
        <div>
          {[{u:"Rohan",ts:"2026-05-19 17:30",txt:"Customer settled INV-8721 fully and partial INV-8688. ₹25K of INV-8688 still pending — to follow up next week.",me:true},{u:"Sughra Sayed",ts:"2026-05-19 18:08",txt:"Approved. Please ensure TDS certificate is collected when Q1 returns are filed by L&T.",me:false}].map((c,i)=>(<div key={i} style={{display:"flex",gap:10,marginBottom:10,flexDirection:c.me?"row-reverse":"row"}}><div style={{width:32,height:32,borderRadius:"50%",background:c.me?"#2F7A8E":"#6B4C8B",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11,flexShrink:0}}>{c.u.substring(0,2).toUpperCase()}</div><div style={{maxWidth:"70%",padding:"8px 12px",background:c.me?"#0d1326":"#fafbfd",color:c.me?"#fff":"#0d1326",borderRadius:c.me?"8px 8px 2px 8px":"8px 8px 8px 2px",border:c.me?"none":"1px solid #e1e3ec"}}><p style={{margin:0,fontSize:11,opacity:0.7,fontWeight:600}}>{c.u}</p><p style={{margin:"3px 0",fontSize:12,lineHeight:1.45}}>{c.txt}</p><p style={{margin:0,fontSize:9.5,opacity:0.6}}>{c.ts}</p></div></div>))}
          <div style={{marginTop:10,display:"flex",gap:8}}><input placeholder="Add comment..." style={{flex:1,padding:9,border:"1px solid #e1e3ec",borderRadius:6,fontSize:12}}/><button style={{padding:"9px 18px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,cursor:"pointer",fontWeight:700}}>Send</button></div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   4. REPORT VIEWER (9 tabs) — generic report wrapper
   ════════════════════════════════════════════════════════════════════ */


export function BulkVoucherImport(){
  const [step,setStep]=useState(1);
  const [vType,setVType]=useState("Payment Voucher");
  const vTypes=[
    {type:"Receipt Voucher",icon:"⬇",desc:"Customer receipts in bulk"},
    {type:"Payment Voucher",icon:"⬆",desc:"Vendor payments in bulk"},
    {type:"Journal Voucher",icon:"📒",desc:"Adjustments, provisions, corrections"},
    {type:"Tax Invoice (Sales)",icon:"📄",desc:"Batch sales invoice creation"},
    {type:"Purchase Invoice",icon:"📥",desc:"Vendor bills from CSV/Excel"},
    {type:"Contra Voucher",icon:"🔄",desc:"Bank-to-bank transfers"},
  ];
  const inp={padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12,width:"100%"};

  const PREVIEW_ROWS=[
    {r:1,date:"2026-05-01",party:"Air India Ltd. (BSP)",ledger:"Air India BSP Payable",amount:4250000,branch:"BOM",status:"valid"},
    {r:2,date:"2026-05-01",party:"Dubai Wonders DMC",ledger:"DMC Payable",amount:1240000,branch:"BOM",status:"valid"},
    {r:3,date:"2026-05-02",party:"Kenya Safari Lodge",ledger:"KSL Payable",amount:980000,branch:"NBO",status:"valid"},
    {r:4,date:"2026-05-02",party:"",ledger:"Marriott Group",amount:680000,branch:"BOM",status:"error",msg:"Party name missing"},
    {r:5,date:"2026-05-03",party:"VFS Global",ledger:"VFS Payable",amount:0,branch:"BOM",status:"error",msg:"Amount cannot be 0"},
    {r:6,date:"2026-05-03",party:"Hertz Car Rental",ledger:"Hertz Payable",amount:450000,branch:"AMD",status:"warning",msg:"Possible duplicate of PV-AMD/2026/1015"},
    {r:7,date:"2026-05-04",party:"Bajaj Allianz Ins.",ledger:"Insurance Payable",amount:380000,branch:"BOM",status:"valid"},
  ];

  return (
    <PHASE2_Page title="Bulk Voucher Import via Excel"
      subtitle="Post multiple vouchers in one shot from a spreadsheet — supports Receipt, Payment, Journal, Sales, Purchase">
      {/* Stepper */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18,padding:"14px 18px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:8}}>
        {[{n:1,label:"Voucher Type"},{n:2,label:"Template & Upload"},{n:3,label:"Preview & Post"}].map((s,i,arr)=>(
          <div key={s.n} style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:step>=s.n?"#d4a437":"#e1e3ec",color:step>=s.n?"#0d1326":"#5a6691",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,flexShrink:0}}>{step>s.n?"✓":s.n}</div>
            <div><p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>{s.label}</p></div>
            {i<arr.length-1&&<div style={{flex:1,height:2,background:step>s.n?"#d4a437":"#e1e3ec",marginLeft:4}}/>}
          </div>
        ))}
      </div>

      {step===1&&(
        <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:20}}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>What type of vouchers are you importing?</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {vTypes.map(v=>(
              <label key={v.type} style={{padding:14,border:vType===v.type?"2px solid #d4a437":"1px solid #e1e3ec",borderRadius:6,cursor:"pointer",background:vType===v.type?"#fff8e8":"#fff",display:"flex",alignItems:"flex-start",gap:10}}>
                <input type="radio" checked={vType===v.type} onChange={()=>setVType(v.type)} style={{marginTop:3}}/>
                <div><p style={{margin:0,fontSize:12.5,fontWeight:700,color:"#0d1326"}}>{v.icon} {v.type}</p><p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{v.desc}</p></div>
              </label>
            ))}
          </div>
          <div style={{marginTop:18,display:"flex",gap:10,alignItems:"center"}}>
            <label style={{fontSize:11.5,color:"#5a6691"}}>Branch:</label>
            <select style={{...inp,width:160}} defaultValue="BOM"><option>All branches</option><option>BOM</option><option>AMD</option><option>NBO</option><option>DAR</option><option>FBM</option><option>TKHO</option></select>
            <label style={{fontSize:11.5,color:"#5a6691",marginLeft:8}}>Period:</label>
            <select style={{...inp,width:180}}><option>May 2026</option><option>Apr 2026</option><option>Mar 2026</option></select>
          </div>
          <div style={{marginTop:20,display:"flex",justifyContent:"flex-end"}}>
            <button onClick={()=>setStep(2)} style={{padding:"9px 22px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer"}}>Next →</button>
          </div>
        </div>
      )}

      {step===2&&(
        <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:20}}>
          <p style={{margin:"0 0 4px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Importing: <span style={{color:"#d4a437"}}>{vType}</span></p>
          <p style={{margin:"0 0 14px",fontSize:11.5,color:"#5a6691"}}>Required columns: Date · Party Name · Ledger · Amount · Narration · Branch · Currency</p>
          <div style={{padding:16,background:"#fafbfd",border:"1px dashed #cbd0dc",borderRadius:6,marginBottom:14}}>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>📥 Download Template</p>
            <p style={{margin:"4px 0 10px",fontSize:11,color:"#5a6691"}}>Get the pre-formatted Excel sheet with sample rows, data validation, and dropdown menus</p>
            <div style={{display:"flex",gap:8}}>
              <button style={{padding:"7px 14px",background:"#fff",border:"1px solid #d4a437",color:"#d4a437",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>📥 Download Template.xlsx</button>
              <button style={{padding:"7px 14px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:5,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>📋 Download Sample CSV</button>
            </div>
          </div>
          <div style={{padding:32,background:"#fff",border:"2px dashed #cbd0dc",borderRadius:8,textAlign:"center"}}>
            <p style={{margin:0,fontSize:32}}>📤</p>
            <p style={{margin:"6px 0 4px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Drag &amp; drop your file here, or click to browse</p>
            <p style={{margin:"0 0 10px",fontSize:11,color:"#5a6691"}}>Supports .xlsx, .xls, .csv · Max 5 MB · Max 1000 rows per batch</p>
            <button style={{padding:"8px 16px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>📁 Browse Files</button>
          </div>
          <div style={{marginTop:20,display:"flex",justifyContent:"space-between"}}>
            <button onClick={()=>setStep(1)} style={{padding:"9px 18px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>← Back</button>
            <button onClick={()=>setStep(3)} style={{padding:"9px 22px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer"}}>Validate →</button>
          </div>
        </div>
      )}

      {step===3&&(
        <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:20}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
            <div style={{padding:12,background:"#d4edda",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:22,fontWeight:700,color:"#155724"}}>4</p><p style={{margin:0,fontSize:11,color:"#155724",fontWeight:600}}>Ready to post</p></div>
            <div style={{padding:12,background:"#fff3cd",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:22,fontWeight:700,color:"#856404"}}>1</p><p style={{margin:0,fontSize:11,color:"#856404",fontWeight:600}}>Duplicate warning</p></div>
            <div style={{padding:12,background:"#f8d7da",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:22,fontWeight:700,color:"#721c24"}}>2</p><p style={{margin:0,fontSize:11,color:"#721c24",fontWeight:600}}>Errors (will skip)</p></div>
            <div style={{padding:12,background:"#e6e8f1",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:22,fontWeight:700,color:"#0d1326"}}>{fmtINR(PREVIEW_ROWS.filter(r=>r.status==="valid").reduce((s,r)=>s+r.amount,0))}</p><p style={{margin:0,fontSize:11,color:"#5a6691",fontWeight:600}}>Total valid value</p></div>
          </div>
          <div style={{border:"1px solid #e1e3ec",borderRadius:6,overflow:"hidden",marginBottom:16}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead style={{background:"#f7f8fb"}}><tr><th style={RPT_thStyle}>Row</th><th style={RPT_thStyle}>Date</th><th style={RPT_thStyle}>Party</th><th style={RPT_thStyle}>Ledger</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th><th style={RPT_thStyle}>Branch</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
              <tbody>{PREVIEW_ROWS.map(r=>(
                <tr key={r.r} style={{background:r.status==="error"?"#fff5f5":r.status==="warning"?"#fffbed":"#fff",borderBottom:"1px solid #f0f2f7"}}>
                  <td style={{...RPT_tdStyle,color:"#5a6691"}}>{r.r}</td>
                  <td style={{...RPT_tdStyle,fontFamily:"monospace"}}>{r.date}</td>
                  <td style={RPT_tdStyle}>{r.party||<span style={{color:"#A32D2D"}}>—</span>}</td>
                  <td style={{...RPT_tdStyle,color:"#5a6691"}}>{r.ledger}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{r.amount>0?fmtINR(r.amount):<span style={{color:"#A32D2D"}}>0</span>}</td>
                  <td style={RPT_tdStyle}><span style={{padding:"1px 6px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{r.branch}</span></td>
                  <td style={{...RPT_tdStyle,textAlign:"center"}}>
                    {r.status==="valid"&&<span style={{padding:"2px 8px",background:"#d4edda",color:"#155724",borderRadius:3,fontSize:10,fontWeight:700}}>✓ Valid</span>}
                    {r.status==="warning"&&<span title={r.msg} style={{padding:"2px 8px",background:"#fff3cd",color:"#856404",borderRadius:3,fontSize:10,fontWeight:700,cursor:"help"}}>⚠ {r.msg?.split(" ").slice(0,2).join(" ")}</span>}
                    {r.status==="error"&&<span title={r.msg} style={{padding:"2px 8px",background:"#f8d7da",color:"#721c24",borderRadius:3,fontSize:10,fontWeight:700,cursor:"help"}}>✗ {r.msg}</span>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{padding:10,background:"#fafbfd",borderRadius:6,marginBottom:16}}>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#0d1326",cursor:"pointer"}}>
              <input type="checkbox"/>
              Post all 4 valid vouchers to BOM · May 2026. Voucher numbers will be assigned automatically using the Numbering Series Master.
            </label>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <button onClick={()=>setStep(2)} style={{padding:"9px 18px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>← Back</button>
            <div style={{display:"flex",gap:8}}>
              <button style={{padding:"9px 16px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>📥 Download Error Report</button>
              <button style={{padding:"9px 22px",background:"#22c55e",color:"#fff",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ Post 4 Valid Vouchers</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,padding:14,background:"#fff",border:"1px solid #e1e3ec",borderRadius:8}}>
        <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Recent batch imports</p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Date</th><th style={RPT_thStyle}>Type</th><th style={RPT_thStyle}>By</th><th style={RPT_thStyle}>Branch</th><th style={{...RPT_thStyle,textAlign:"right"}}>Rows</th><th style={{...RPT_thStyle,textAlign:"right"}}>Posted</th><th style={{...RPT_thStyle,textAlign:"right"}}>Total Value</th></tr></thead>
          <tbody>{[{date:"2026-05-15",type:"Payment Voucher",user:"Rohan",branch:"BOM",rows:18,posted:16,value:12450000},{date:"2026-05-08",type:"Tax Invoice",user:"Mujeet",branch:"NBO",rows:24,posted:24,value:8500000},{date:"2026-04-30",type:"Receipt Voucher",user:"Mohan",branch:"AMD",rows:12,posted:11,value:4200000}].map((r,i)=>(<tr key={i}><td style={RPT_tdStyle}>{r.date}</td><td style={RPT_tdStyle}>{r.type}</td><td style={RPT_tdStyle}>{r.user}</td><td style={RPT_tdStyle}><span style={{padding:"1px 6px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{r.branch}</span></td><td style={{...RPT_tdStyle,textAlign:"right"}}>{r.rows}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#22c55e"}}>{r.posted}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(r.value)}</td></tr>))}</tbody>
        </table>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   2. MULTI-CURRENCY SINGLE VOUCHER
   ════════════════════════════════════════════════════════════════════ */

export function MultiCurrencyVoucher(){
  const INR_PER_USD=84.52, INR_PER_EUR=91.24;
  const [saleAmt,setSaleAmt]=useState(8500);
  const [costAmt,setCostAmt]=useState(6200);
  const saleCur="USD", costCur="EUR";
  const saleINR=Math.round(saleAmt*INR_PER_USD);
  const costINR=Math.round(costAmt*INR_PER_EUR);
  const gpINR=saleINR-costINR;
  const gpPct=(gpINR/saleINR*100).toFixed(1);
  const inp={padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12};

  return (
    <PHASE2_Page title="Multi-Currency Voucher" subtitle="Single voucher · sale in one currency · cost in another · auto GP calculation in INR">
      <div style={{padding:12,background:"#e8f0fe",border:"1px solid #b8d0f8",borderLeft:"3px solid #3b82f6",borderRadius:6,marginBottom:14,fontSize:11.5,color:"#1e3a5f"}}>
        <b>How it works:</b> Enter the sale amount in the billing currency (e.g. USD) and cost in the supplier currency (e.g. EUR). KBiz360 converts both to the base currency (INR) using daily forex rates and calculates GP automatically.
      </div>
      <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:20}}>
        {/* Header */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:18,paddingBottom:14,borderBottom:"1px solid #f0f2f7"}}>
          <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Voucher Type</label><select style={{...inp,width:"100%"}}><option>Sales Voucher</option><option>Mixed Purchase-Sale</option></select></div>
          <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Date</label><input type="date" defaultValue="2026-05-20" style={{...inp,width:"100%"}}/></div>
          <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Branch</label><select style={{...inp,width:"100%"}}><option>BOM</option></select></div>
        </div>

        {/* Revenue side */}
        <div style={{padding:14,background:"#f0fff4",border:"1px solid #bbf7d0",borderRadius:6,marginBottom:10}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#155724"}}>📄 Revenue side (Sale)</p>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:10,alignItems:"flex-end"}}>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Customer</label><input defaultValue="TechCorp Solutions" style={{...inp,width:"100%"}}/></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Currency</label><select style={{...inp,width:"100%"}}><option>USD</option><option>EUR</option><option>INR</option></select></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Rate (₹/USD)</label><input readOnly value={INR_PER_USD} style={{...inp,width:"100%",background:"#f7f8fb",fontFamily:"monospace"}}/></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Amount (USD)</label><input type="number" value={saleAmt} onChange={e=>setSaleAmt(+e.target.value)} style={{...inp,width:"100%",fontFamily:"monospace",fontWeight:700}}/></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>INR Equivalent</label><input readOnly value={"₹"+saleINR.toLocaleString("en-IN")} style={{...inp,width:"100%",background:"#d4edda",fontFamily:"monospace",fontWeight:700,color:"#155724"}}/></div>
          </div>
        </div>

        {/* Cost side */}
        <div style={{padding:14,background:"#fff5f5",border:"1px solid #fecaca",borderRadius:6,marginBottom:10}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#721c24"}}>📥 Cost side (Purchase)</p>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:10,alignItems:"flex-end"}}>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Supplier</label><input defaultValue="Marriott Group (Bali)" style={{...inp,width:"100%"}}/></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Currency</label><select style={{...inp,width:"100%"}}><option>EUR</option><option>USD</option><option>INR</option></select></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Rate (₹/EUR)</label><input readOnly value={INR_PER_EUR} style={{...inp,width:"100%",background:"#f7f8fb",fontFamily:"monospace"}}/></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Amount (EUR)</label><input type="number" value={costAmt} onChange={e=>setCostAmt(+e.target.value)} style={{...inp,width:"100%",fontFamily:"monospace",fontWeight:700}}/></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>INR Equivalent</label><input readOnly value={"₹"+costINR.toLocaleString("en-IN")} style={{...inp,width:"100%",background:"#f8d7da",fontFamily:"monospace",fontWeight:700,color:"#721c24"}}/></div>
          </div>
        </div>

        {/* Auto-calculated GP summary */}
        <div style={{padding:14,background:"#fff8e8",border:"1px solid #fde68a",borderRadius:6,marginBottom:14}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Auto-calculated in INR (base currency)</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700}}>SALE</p><p style={{margin:"3px 0 0",fontSize:17,fontWeight:700,color:"#155724"}}>{fmtINR(saleINR)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>${saleAmt.toLocaleString()} × ₹{INR_PER_USD}</p></div>
            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700}}>COST</p><p style={{margin:"3px 0 0",fontSize:17,fontWeight:700,color:"#721c24"}}>{fmtINR(costINR)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>€{costAmt.toLocaleString()} × ₹{INR_PER_EUR}</p></div>
            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700}}>GROSS PROFIT</p><p style={{margin:"3px 0 0",fontSize:17,fontWeight:700,color:gpINR>0?"#22c55e":"#A32D2D"}}>{fmtINR(gpINR)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>after forex conversion</p></div>
            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700}}>GP %</p><p style={{margin:"3px 0 0",fontSize:17,fontWeight:700,color:+gpPct>=20?"#22c55e":+gpPct>=12?"#d4a437":"#A32D2D"}}>{gpPct}%</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>on sale value</p></div>
          </div>
        </div>

        {/* Posting lines */}
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Accounting posting lines (auto-generated)</p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5,marginBottom:14}}>
          <thead style={{background:"#f7f8fb"}}><tr><th style={RPT_thStyle}>Ledger</th><th style={RPT_thStyle}>Narration</th><th style={{...RPT_thStyle,textAlign:"right"}}>Debit (₹)</th><th style={{...RPT_thStyle,textAlign:"right"}}>Credit (₹)</th></tr></thead>
          <tbody>
            <tr style={{borderBottom:"1px solid #f0f2f7"}}><td style={RPT_tdStyle}>TechCorp Solutions (Receivable)</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>Bali Package — May 2026</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{saleINR.toLocaleString("en-IN")}</td><td style={RPT_tdStyle}/></tr>
            <tr style={{borderBottom:"1px solid #f0f2f7"}}><td style={RPT_tdStyle}>Sales — Bali Holidays</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>${saleAmt} @ ₹{INR_PER_USD}</td><td style={RPT_tdStyle}/><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{saleINR.toLocaleString("en-IN")}</td></tr>
            <tr style={{borderBottom:"1px solid #f0f2f7"}}><td style={RPT_tdStyle}>Tour Cost — Hotels</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>€{costAmt} @ ₹{INR_PER_EUR}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{costINR.toLocaleString("en-IN")}</td><td style={RPT_tdStyle}/></tr>
            <tr style={{borderBottom:"1px solid #f0f2f7"}}><td style={RPT_tdStyle}>Marriott Group (Payable)</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>Marriott Bali, 3 nights</td><td style={RPT_tdStyle}/><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{costINR.toLocaleString("en-IN")}</td></tr>
          </tbody>
          <tfoot style={{background:"#fafbfd",fontWeight:700}}><tr><td style={{...RPT_tdStyle,fontWeight:700}}>TOTAL</td><td style={RPT_tdStyle}/><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,borderTop:"2px solid #e1e3ec"}}>{(saleINR+costINR).toLocaleString("en-IN")}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,borderTop:"2px solid #e1e3ec"}}>{(saleINR+costINR).toLocaleString("en-IN")}</td></tr></tfoot>
        </table>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
          <button style={{padding:"8px 16px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>Print Preview</button>
          <button style={{padding:"8px 16px",background:"#0d1326",color:"#d4a437",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>Submit for Approval</button>
          <button style={{padding:"8px 18px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>💾 Save Voucher</button>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   3. VOUCHER COMMENTS THREAD
   ════════════════════════════════════════════════════════════════════ */

export function VoucherCommentsDemo(){
  const [comment,setComment]=useState("");
  const THREAD=[
    {user:"Rohan",role:"Accts Exec — BOM",ts:"2026-05-17 10:15",color:"#2F7A8E",msg:"Payment for Air India BSP settlement — April 2026. BSP debit note received. Amount ₹2,85,000 confirmed by BSP portal.",attachment:"BSP_April_Debit.pdf"},
    {user:"Sughra Sayed",role:"Sr. Accounts Executive",ts:"2026-05-17 11:30",color:"#6B4C8B",msg:"Please check — my BSP reconciliation shows ₹2,84,150. Difference of ₹850. Is this a charge? Also please attach the BSP statement showing the debit, not just the debit note.",attachment:null},
    {user:"Rohan",role:"Accts Exec — BOM",ts:"2026-05-17 14:22",color:"#2F7A8E",msg:"Attached the BSP statement. The ₹850 difference is the SURC (System Usage & Reporting Charge) levied by BSP directly. This was pre-approved by Faiz sir per Board minute 2026-03-15.",attachment:"BSP_Statement_April.pdf"},
    {user:"Faiz Patel",role:"Senior Finance Manager",ts:"2026-05-17 15:45",color:"#0d1326",msg:"Confirmed. SURC of ₹850 is a BSP-mandated charge approved in our Board minute dated 15-Mar-2026 (item 6.4). Total ₹2,85,000 is correct. Sughra please proceed with approval.",attachment:null},
    {user:"Sughra Sayed",role:"Sr. Accounts Executive",ts:"2026-05-17 16:10",color:"#6B4C8B",msg:"Understood. Voucher approved ✓. Rohan please collect Faiz sir's physical signature as well.",attachment:null},
  ];
  const voucherInfo={no:"PV-BOM/2026/0892",date:"2026-05-17",type:"Payment Voucher",party:"Air India Ltd. (BSP)",amount:285000,status:"Approved"};

  return (
    <PHASE2_Page title="Voucher Comments Thread" subtitle="Collaborate on a voucher before approval · all comments are audit-tracked">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.7fr",gap:14}}>
        {/* Voucher summary panel */}
        <div>
          <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:16,marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Voucher Details</p>
              <span style={{padding:"3px 10px",background:"#d4edda",color:"#155724",borderRadius:4,fontSize:10.5,fontWeight:700}}>✓ Approved</span>
            </div>
            {[{l:"Voucher No.",v:voucherInfo.no},{l:"Date",v:voucherInfo.date},{l:"Type",v:voucherInfo.type},{l:"Party",v:voucherInfo.party},{l:"Amount",v:fmtINR(voucherInfo.amount)}].map((f,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f0f2f7"}}>
                <span style={{fontSize:11,color:"#5a6691",fontWeight:600}}>{f.l}</span>
                <span style={{fontSize:11.5,color:"#0d1326",fontWeight:600,fontFamily:f.l.includes("No.")||f.l==="Amount"?"monospace":"inherit"}}>{f.v}</span>
              </div>
            ))}
          </div>
          <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:14}}>
            <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Approval Timeline</p>
            {[{user:"Rohan",action:"Created & submitted",ts:"10:15",color:"#2F7A8E"},{user:"Sughra Sayed",action:"Query raised",ts:"11:30",color:"#6B4C8B"},{user:"Faiz Patel",action:"Clarified SURC",ts:"15:45",color:"#0d1326"},{user:"Sughra Sayed",action:"Approved ✓",ts:"16:10",color:"#22c55e"}].map((t,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:t.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>{t.user.substring(0,2).toUpperCase()}</div>
                  {i<3&&<div style={{width:2,height:16,background:"#e1e3ec",marginTop:2}}/>}
                </div>
                <div style={{paddingTop:4}}><p style={{margin:0,fontSize:11.5,fontWeight:600,color:"#0d1326"}}>{t.user}</p><p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{t.action} · {t.ts}</p></div>
              </div>
            ))}
          </div>
        </div>

        {/* Comments thread */}
        <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>💬 Comment Thread</p>
            <span style={{fontSize:11,color:"#5a6691"}}>{THREAD.length} messages · 1 day ago</span>
          </div>
          <div style={{flex:1,padding:16,overflowY:"auto",maxHeight:440}}>
            {THREAD.map((c,i)=>(
              <div key={i} style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:c.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{c.user.substring(0,2).toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:4}}>
                      <span style={{fontSize:12.5,fontWeight:700,color:"#0d1326"}}>{c.user}</span>
                      <span style={{fontSize:10.5,color:"#5a6691"}}>{c.role}</span>
                      <span style={{fontSize:10,color:"#5a6691",marginLeft:"auto"}}>{c.ts}</span>
                    </div>
                    <div style={{padding:"10px 12px",background:i%2===0?"#f7f8fb":"#f0f4f8",borderRadius:6,fontSize:12,color:"#0d1326",lineHeight:1.5,borderLeft:"3px solid "+c.color}}>
                      {c.msg}
                      {c.attachment&&(
                        <div style={{marginTop:8,padding:"5px 8px",background:"#fff",borderRadius:4,border:"1px solid #e1e3ec",display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                          <span>📎</span><span style={{fontSize:10.5,color:"#d4a437",fontWeight:600}}>{c.attachment}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{padding:"10px 14px",borderTop:"1px solid #e1e3ec"}}>
            <div style={{display:"flex",gap:8}}>
              <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Add a comment… (Shift+Enter for new line, Enter to send)" rows={2} style={{flex:1,padding:"8px 10px",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,resize:"none",fontFamily:"inherit"}}/>
              <button style={{padding:"8px 14px",background:"#0d1326",color:"#d4a437",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer",alignSelf:"flex-end"}}>Send</button>
            </div>
            <p style={{margin:"5px 0 0",fontSize:10,color:"#5a6691"}}>📎 Attach file · @mention · All comments are audit-logged</p>
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   4. PRINT PREVIEW BEFORE SAVING
   ════════════════════════════════════════════════════════════════════ */

export function PrintPreviewDemo(){
  const [show,setShow]=useState(true);
  const voucher={no:"PV-BOM/2026/0893",date:"20 May 2026",type:"Payment Voucher",branch:"BOM — Mumbai",payTo:"Air India Ltd. (BSP)",bank:"HDFC Bank BOM A/c ...4321",mode:"NEFT",refNo:"NEFT2605120024",amount:285000,amountWords:"Indian Rupees Two Lakhs Eighty-Five Thousand Only",narration:"BSP settlement April 2026 — SURC included as per Board minute 2026-03-15",lines:[{ledger:"Air India BSP Payable",dr:285000,cr:0},{ledger:"HDFC Bank BOM Current A/c",dr:0,cr:285000}]};

  const printPage = {background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,maxWidth:740,margin:"0 auto",padding:"30px 36px",fontFamily:"Georgia, serif"};

  return (
    <PHASE2_Page title="Print Preview Before Saving" subtitle="Review the formatted voucher before committing · matches the actual printout">
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginBottom:12}}>
        <button style={{padding:"7px 14px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>← Edit Voucher</button>
        <button onClick={()=>window.print()} style={{padding:"7px 14px",background:"#fff",border:"1px solid #0d1326",color:"#0d1326",borderRadius:6,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>🖨 Print</button>
        <button style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>✓ Save & Post</button>
      </div>

      <div style={printPage}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,paddingBottom:14,borderBottom:"2px solid #0d1326"}}>
          <div>
            <p style={{margin:0,fontSize:20,fontWeight:700,color:"#0d1326",letterSpacing:"0.5px"}}>Travkings Tours &amp; Travels Pvt. Ltd.</p>
            <p style={{margin:"2px 0 0",fontSize:11,color:"#5a6691"}}>IATA Accredited · GST 27AAACT1234A1ZF · CIN U63090MH2006PTC160xxx</p>
            <p style={{margin:"1px 0 0",fontSize:11,color:"#5a6691"}}>Lower Parel, Mumbai 400013 · +91 22 6654 8800</p>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{margin:0,fontSize:18,fontWeight:700,color:"#0d1326",textTransform:"uppercase",letterSpacing:"1px"}}>{voucher.type}</p>
            <p style={{margin:"4px 0 0",fontSize:13,color:"#5a6691",fontFamily:"monospace"}}>{voucher.no}</p>
          </div>
        </div>

        {/* Meta */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18,fontSize:12}}>
          <div>
            <div style={{display:"flex",gap:8,marginBottom:4}}><span style={{minWidth:80,color:"#5a6691"}}>Date</span><b>{voucher.date}</b></div>
            <div style={{display:"flex",gap:8,marginBottom:4}}><span style={{minWidth:80,color:"#5a6691"}}>Branch</span><b>{voucher.branch}</b></div>
            <div style={{display:"flex",gap:8,marginBottom:4}}><span style={{minWidth:80,color:"#5a6691"}}>Pay to</span><b>{voucher.payTo}</b></div>
          </div>
          <div>
            <div style={{display:"flex",gap:8,marginBottom:4}}><span style={{minWidth:80,color:"#5a6691"}}>Bank</span><b>{voucher.bank}</b></div>
            <div style={{display:"flex",gap:8,marginBottom:4}}><span style={{minWidth:80,color:"#5a6691"}}>Mode</span><b>{voucher.mode}</b></div>
            <div style={{display:"flex",gap:8,marginBottom:4}}><span style={{minWidth:80,color:"#5a6691"}}>Ref No.</span><b style={{fontFamily:"monospace"}}>{voucher.refNo}</b></div>
          </div>
        </div>

        {/* Amount */}
        <div style={{padding:14,background:"#f7f8fb",border:"1px solid #e1e3ec",borderRadius:6,marginBottom:18,textAlign:"center"}}>
          <p style={{margin:0,fontSize:11,color:"#5a6691",textTransform:"uppercase",letterSpacing:"0.5px"}}>Amount</p>
          <p style={{margin:"4px 0 2px",fontSize:28,fontWeight:700,color:"#0d1326",fontFamily:"Georgia"}}>₹ {voucher.amount.toLocaleString("en-IN")}</p>
          <p style={{margin:0,fontSize:11.5,color:"#0d1326",fontStyle:"italic"}}>( {voucher.amountWords} )</p>
        </div>

        {/* Posting lines */}
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:14}}>
          <thead><tr style={{background:"#0d1326",color:"#fff"}}><th style={{padding:"8px 12px",textAlign:"left",fontWeight:600}}>Ledger Account</th><th style={{padding:"8px 12px",textAlign:"right",fontWeight:600}}>Debit (₹)</th><th style={{padding:"8px 12px",textAlign:"right",fontWeight:600}}>Credit (₹)</th></tr></thead>
          <tbody>
            {voucher.lines.map((l,i)=><tr key={i} style={{borderBottom:"1px solid #e1e3ec"}}><td style={{padding:"8px 12px"}}>{l.ledger}</td><td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace"}}>{l.dr>0?l.dr.toLocaleString("en-IN"):"—"}</td><td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace"}}>{l.cr>0?l.cr.toLocaleString("en-IN"):"—"}</td></tr>)}
          </tbody>
          <tfoot><tr style={{fontWeight:700,borderTop:"2px solid #0d1326"}}><td style={{padding:"8px 12px"}}>Total</td><td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace"}}>{voucher.amount.toLocaleString("en-IN")}</td><td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace"}}>{voucher.amount.toLocaleString("en-IN")}</td></tr></tfoot>
        </table>

        <p style={{fontSize:11.5,color:"#0d1326",marginBottom:28}}><b>Narration:</b> {voucher.narration}</p>

        {/* Signatories */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20,marginTop:28,paddingTop:14,borderTop:"1px solid #e1e3ec"}}>
          {["Prepared by","Checked by","Authorised by"].map(s=>(
            <div key={s} style={{textAlign:"center"}}>
              <div style={{height:40,borderBottom:"1px solid #0d1326",marginBottom:4}}/>
              <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{s}</p>
            </div>
          ))}
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   5. AUTO-LINKED VOUCHERS (Sale ↔ Receipt, Purchase ↔ Payment)
   ════════════════════════════════════════════════════════════════════ */

export function AutoLinkedVouchers(){
  const [cycle,setCycle]=useState("sale");
  const SALE_CYCLE=[
    {step:1,voucher:"INV-BOM/2026/8742",type:"Tax Invoice",party:"L&T Limited",amount:485000,date:"2026-05-10",status:"Outstanding",color:"#d4a437"},
    {step:2,voucher:"RV-BOM/2026/4521",type:"Receipt Voucher",party:"L&T Limited",amount:485000,date:"2026-05-15",status:"Posted",color:"#22c55e"},
    {step:3,voucher:"INV-BOM/2026/8742",type:"Tax Invoice (auto-updated)",party:"L&T Limited",amount:485000,date:"2026-05-10",status:"PAID ✓",color:"#22c55e"},
  ];
  const PUR_CYCLE=[
    {step:1,voucher:"PUR-BOM/2026/3214",type:"Purchase Invoice",party:"Air India BSP",amount:285000,date:"2026-05-12",status:"Unpaid",color:"#A32D2D"},
    {step:2,voucher:"PV-BOM/2026/0892",type:"Payment Voucher",party:"Air India BSP",amount:285000,date:"2026-05-17",status:"Approved",color:"#d4a437"},
    {step:3,voucher:"PUR-BOM/2026/3214",type:"Purchase Invoice (auto-updated)",party:"Air India BSP",amount:285000,date:"2026-05-12",status:"PAID ✓",color:"#22c55e"},
  ];
  const steps=cycle==="sale"?SALE_CYCLE:PUR_CYCLE;
  const LINK_TABLE=[
    {sale:"INV-BOM/2026/8742",receipt:"RV-BOM/2026/4521",amount:485000,party:"L&T Limited",date:"2026-05-15"},
    {sale:"INV-BOM/2026/8728",receipt:"RV-BOM/2026/4519",amount:142500,party:"L&T Limited",date:"2026-05-08"},
    {sale:"INV-BOM/2026/9001",receipt:"—",amount:285000,party:"TechCorp Solutions",date:"—"},
    {sale:"PUR-BOM/2026/3214",receipt:"PV-BOM/2026/0892",amount:285000,party:"Air India BSP",date:"2026-05-17"},
    {sale:"PUR-BOM/2026/3208",receipt:"PV-BOM/2026/0888",amount:124000,party:"Dubai Wonders DMC",date:"2026-05-12"},
  ];

  return (
    <PHASE2_Page title="Auto-link Related Vouchers" subtitle="Sale Invoice ↔ Receipt · Purchase Invoice ↔ Payment — auto-matched on party + amount + date proximity">
      <div style={{padding:12,background:"#e8f0fe",border:"1px solid #b8d0f8",borderLeft:"3px solid #3b82f6",borderRadius:6,marginBottom:14,fontSize:11.5,color:"#1e3a5f"}}>
        <b>Auto-link logic:</b> When a Receipt is posted for a party, KBiz360 automatically looks for an outstanding Sales Invoice with the same party and amount (±5% tolerance). If found, the invoice is marked as Paid and the two vouchers are bi-directionally linked. Same for Purchase ↔ Payment.
      </div>

      {/* Cycle selector */}
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {[{k:"sale",label:"Sale ↔ Receipt cycle"},{k:"purchase",label:"Purchase ↔ Payment cycle"}].map(b=>(
          <button key={b.k} onClick={()=>setCycle(b.k)} style={{padding:"8px 18px",border:cycle===b.k?"2px solid #0d1326":"1px solid #e1e3ec",background:cycle===b.k?"#0d1326":"#fff",color:cycle===b.k?"#d4a437":"#5a6691",borderRadius:6,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{b.label}</button>
        ))}
      </div>

      {/* Flow visualization */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:0,marginBottom:18,padding:"24px 20px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflowX:"auto"}}>
        {steps.map((s,i)=>(
          <div key={s.step} style={{display:"flex",alignItems:"center"}}>
            <div style={{width:200,padding:14,background:"#fff",border:"2px solid "+s.color,borderRadius:8,textAlign:"center",position:"relative"}}>
              <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:s.color,color:"#fff",borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>{s.step}</div>
              <p style={{margin:"6px 0 4px",fontSize:11,fontWeight:700,color:s.color,textTransform:"uppercase",letterSpacing:"0.4px"}}>{s.type}</p>
              <p style={{margin:0,fontSize:10.5,fontFamily:"monospace",color:"#0d1326",fontWeight:700}}>{s.voucher}</p>
              <p style={{margin:"3px 0",fontSize:11,color:"#0d1326"}}>{s.party}</p>
              <p style={{margin:"3px 0 0",fontSize:13,fontWeight:700,color:"#0d1326"}}>{fmtINR(s.amount)}</p>
              <span style={{display:"inline-block",marginTop:6,padding:"2px 8px",background:s.status.includes("PAID")||s.status==="Posted"?"#d4edda":s.status==="Approved"?"#fff3cd":"#f8d7da",color:s.status.includes("PAID")||s.status==="Posted"?"#155724":s.status==="Approved"?"#856404":"#721c24",borderRadius:3,fontSize:10.5,fontWeight:700}}>{s.status}</span>
            </div>
            {i<steps.length-1&&(
              <div style={{width:60,display:"flex",flexDirection:"column",alignItems:"center",padding:"0 4px"}}>
                <div style={{fontSize:20,color:"#d4a437",fontWeight:700}}>→</div>
                <p style={{margin:0,fontSize:9,color:"#5a6691",textAlign:"center",lineHeight:1.3}}>auto-<br/>linked</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Linked vouchers table */}
      <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",borderBottom:"1px solid #e1e3ec",background:"#fafbfd",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <p style={{margin:0,fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Linked Voucher Register</p>
          <button style={{padding:"5px 12px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:5,fontSize:11,fontWeight:600,cursor:"pointer"}}>📤 Export</button>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Invoice / Purchase</th><th style={RPT_thStyle}>Receipt / Payment</th><th style={RPT_thStyle}>Party</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th><th style={RPT_thStyle}>Settled On</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
          <tbody>{LINK_TABLE.map((r,i)=>(
            <tr key={i} style={{borderBottom:"1px solid #f0f2f7"}}>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:600,fontSize:11}}>{r.sale}</td>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",color:r.receipt==="—"?"#A32D2D":"#22c55e",fontWeight:r.receipt==="—"?400:600,fontSize:11}}>{r.receipt}</td>
              <td style={RPT_tdStyle}>{r.party}</td>
              <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(r.amount)}</td>
              <td style={{...RPT_tdStyle,color:r.date==="—"?"#A32D2D":"#5a6691"}}>{r.date}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:3,fontSize:10.5,fontWeight:700,background:r.receipt!=="—"?"#d4edda":"#fff3cd",color:r.receipt!=="—"?"#155724":"#856404"}}>{r.receipt!=="—"?"Linked ✓":"Pending"}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PHASE 2 — FINANCE DEPTH (6 screens)
   Bank Balance Dashboard · TDS Calculator · Interest Calculator
   Investment Register · Loan Amortization · Reconciliation Queue
   ════════════════════════════════════════════════════════════════════ */

/* ── Seed data ────────────────────────────────────────────────────── */

