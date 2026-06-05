/* ════════════════════════════════════════════════════════════════════
   MODULES/TRANSACTIONS.JSX
   Auto-generated from KBiz360_v2.jsx · 4398 lines · 39 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowLeft, Calendar, Check, ChevronDown, Clock, Download, Plus, Printer, Save, Search } from 'lucide-react';
import { Area, Line } from 'recharts';
import { getUnmatchedTickets, settlePurchaseEntry } from '../core/business-logic';
import { ACTIVE_CURRENCIES, ADM_DATA, BRANCHES, BRANCH_CODES, GP_BILLS, PURCHASE_REGISTRY, SALE_TO_PURCH_MOD, branchCurrencies, branchMainCurrency, genVNo } from '../core/data';
import { useAdmReasonCodes, useLedgerRegistry } from '../core/useReference';
import { useLedgerStatement, useCreateVoucher, useOpenBills, useSalesRegister, usePurchaseRegister } from '../core/useAccounting';
import { useLivePurchaseRegistry, useLiveSalesTickets } from '../core/useVouchers';
import { fmt, fmtINR } from '../core/format';
import { todayISO, CUR_MONTH, MONTH_OPTIONS } from '../core/dates';
import { ACM_DATA, ACM_REASON_CODES, LedgerSelect, RECURRING_DATA, REFUNDS_DATA, Recruitment, STATUS_FLOW, TAB_Page, TRow, TrainingRecords, VTD, VTH, _ACM_LIST, _ADM_LIST, _TICKET_CTRL, cardStyle, tabPanel } from '../core/helpers';
import { triggerSaveRefresh, useMobile, useVNo } from '../core/hooks';
import { ARow, B, DBtn, FL, RPT_tdStyle, RPT_thStyle, SalespersonField, VHead, VNarr, VParty, VTot, VWrap, bc, btnG, btnGh, card, inp, inpStd, tabBtnStyle } from '../core/styles';
import { Dashboard } from './dashboard';
import { TDS_SECTIONS } from './finance';
import { ChartOfAccounts, MastersLedgers, MastersSubAgents } from './masters';
import { ApiKeySettings } from './settings';
import { Form26AS } from './taxation';
import { NotificationCentre } from '../shell/NotifPanel';
import { PHASE2_Page } from '../shell/PHASE2_Page';

/* ════════════════════════════════════════════════════════════════════
   FINANCE VOUCHER PERSISTENCE
   Every Finance voucher (Receipt/Payment/Contra/Journal/Credit/Debit/Purchase
   Expense) posts a balanced double-entry to the live engine (POST /api/vouchers).
   The backend builds the journal and the reports (Trial Balance, P&L, Balance
   Sheet, Day Book, GST, ageing) aggregate from it — so a saved voucher updates
   everything at once. Helpers below are shared by all the voucher forms.
   ════════════════════════════════════════════════════════════════════ */

// The consolidated "ALL" view can't post (a voucher belongs to one branch);
// returns the branch code, or null when on ALL.
export function brCodeOf(branch){ return (branch && branch !== "ALL") ? (branch.code || branch) : null; }

// Travel module → canonical Sales / Purchase ledger name (so a note posts the
// reversal against the right revenue / cost head; the engine resolves the group
// from the live chart, defaulting to Sales / Purchase Accounts).
export const SALES_LEDGER_BY_MODULE = { Flight:"Sales — Air Tickets", Holiday:"Sales — Holiday Packages", Hotel:"Sales — Hotel Bookings", Car:"Sales — Car Rentals", Visa:"Sales — Visa Services", Insurance:"Sales — Travel Insurance", Misc:"Sales — Other Services" };
export const PURCH_LEDGER_BY_MODULE = { Flight:"Purchase — Air Tickets", Holiday:"Purchase — Land Packages", Hotel:"Purchase — Hotel Costs", Car:"Purchase — Car Rentals", Visa:"Purchase — Visa Costs", Insurance:"Purchase — Insurance Costs", Misc:"Purchase — Other Services" };

// Inline save status banner driven by a react-query mutation result.
export function VSaveMsg({m,okText}){
  if(m.isPending) return <div style={{padding:"10px",borderRadius:9,background:"#E6F1FB",fontSize:11,color:"#185FA5",fontWeight:700,textAlign:"center",marginBottom:8}}>Posting voucher…</div>;
  if(m.isError)   return <div style={{padding:"10px",borderRadius:9,background:"#FCEBEB",fontSize:11,color:"#A32D2D",fontWeight:700,textAlign:"center",marginBottom:8}}>✗ {String(m.error?.message||"Could not save voucher")}</div>;
  if(m.isSuccess) return <div style={{padding:"10px",borderRadius:9,background:"#EAF3DE",fontSize:11,color:"#27500A",fontWeight:700,textAlign:"center",marginBottom:8}}>{okText}</div>;
  return null;
}

/* ════════════════════════════════════════════════════════════════════
   SHARED VOUCHER BUILDING BLOCKS  (rebuilt Finance vouchers)
   The Receipt / Payment / Contra / Journal / Credit Note / Debit Note /
   Purchase-Expense forms below follow the provided HTML mockups — same layout
   and logic — rendered in the KBiz360 theme, wired to the live chart of accounts
   (LedgerSelect / useLedgerRegistry) and the /api/vouchers posting engine.
   ════════════════════════════════════════════════════════════════════ */

// DR green / CR maroon — the DR/CR colour convention used across the voucher forms.
export const V_DR = "#1B6B4C";
export const V_CR = "#9B2C2C";
const _r2 = (n) => Math.round((Number(n)||0)*100)/100;

// 2-decimal currency formatter for the voucher screens.
export const vf2 = (cur,n) => cur + Number(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});

// Teaching banner atop each voucher (mirrors the HTML "explain" strip).
export function VExplain({children}){
  return (
    <div style={{padding:"10px 14px",background:"#FDFAF4",border:"1px solid #EFE7D4",borderRadius:9,fontSize:11.5,color:"#5a6691",lineHeight:1.55,marginBottom:14}}>
      {children}
    </div>
  );
}

// Balanced / out-of-balance status bar (mirrors the HTML status strip).
export function VBalanceBar({dr,cr,cur,okPrefix="Balanced",emptyText="Enter amounts to balance the voucher"}){
  const diff=_r2(dr-cr); const has=dr>0||cr>0; const ok=diff===0&&has;
  return (
    <div style={{display:"flex",alignItems:"center",gap:9,padding:"10px 14px",borderRadius:8,marginBottom:12,fontSize:12,fontWeight:700,
      background:ok?"#EAF3DE":"#FCEBEB",color:ok?"#27500A":"#A32D2D",border:"1px solid "+(ok?"#C0DD97":"#F7C1C1")}}>
      <span style={{width:9,height:9,borderRadius:"50%",background:"currentColor",flexShrink:0}}/>
      <span>{!has?emptyText:ok?`${okPrefix} — ${vf2(cur,dr)} Dr = ${vf2(cur,cr)} Cr`:`Out of balance by ${vf2(cur,Math.abs(diff))}`}</span>
    </div>
  );
}

// Read-only double-entry preview (Ledger · DR/CR · Amount) — the journal that
// will post, derived from the form. Mirrors the HTML "Account Entries" table.
export function VJournalPreview({rows,cur,title="Accounting Effect (Double Entry)"}){
  const dr=rows.reduce((s,r)=>s+(r.side==="DR"?(+r.amount||0):0),0);
  const cr=rows.reduce((s,r)=>s+(r.side==="CR"?(+r.amount||0):0),0);
  return (
    <div style={{marginBottom:12}}>
      <p style={{margin:"0 0 6px",fontSize:10.5,fontWeight:700,color:"#0d1326"}}>📒 {title}</p>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Ledger Account","Dr/Cr",`Amount (${cur})`,"Note"].map((h,i)=>
              <th key={i} style={{padding:"7px 10px",textAlign:i===2?"right":i===1?"center":"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:r.side==="DR"?"#f0fbf5":"#fdf3f3"}}>
                <td style={{padding:"7px 10px",fontWeight:500,color:"#0d1326"}}>{r.ledger||"—"}</td>
                <td style={{padding:"7px 10px",textAlign:"center"}}>
                  <span style={{fontSize:9,fontWeight:800,letterSpacing:".5px",padding:"2px 8px",borderRadius:4,color:"#fff",background:r.side==="DR"?V_DR:V_CR}}>{r.side}</span>
                </td>
                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{vf2(cur,r.amount)}</td>
                <td style={{padding:"7px 10px",fontSize:10,color:"#5a6691"}}>{r.note||""}</td>
              </tr>
            ))}
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
              <td colSpan={2} style={{padding:"7px 10px",fontWeight:800,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Total</td>
              <td style={{padding:"7px 10px",textAlign:"right",fontWeight:800,color:"#0d1326",fontVariantNumeric:"tabular-nums"}}>{vf2(cur,dr)} / {vf2(cur,cr)}</td>
              <td/>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Place-of-supply toggle → drives gstMode ('intra' CGST+SGST · 'inter' IGST).
export function VPlaceOfSupply({mode,onChange}){
  return (
    <FL label="Place of Supply">
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[["intra","Within state — CGST + SGST"],["inter","Outside state — IGST"]].map(([k,lab])=>(
          <button key={k} onClick={()=>onChange(k)} style={{padding:"7px 13px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
            background:mode===k?"#0d1326":"#fff",color:mode===k?"#d4a437":"#384677",border:"1.5px solid "+(mode===k?"#d4a437":"#e1e3ec")}}>{lab}</button>
        ))}
      </div>
    </FL>
  );
}

// Pure allocation summary — single source of truth for the bill-wise panel and
// for posting. `amount` is the gross settlement value (clears the bill's gross
// outstanding); `onAcc` is the remainder deliberately parked as an advance.
export function allocSummary(alloc,amount,parkOnAcc,mode){
  const allocated=_r2(Object.values(alloc||{}).reduce((s,v)=>s+(+v||0),0));
  if(mode==="onaccount") return {allocated:0,un:0,onAcc:_r2(amount),valid:amount>0,count:0};
  const un=_r2(amount-allocated);
  const onAcc=(un>0.001&&parkOnAcc)?un:0;
  const count=Object.values(alloc||{}).filter(v=>(+v||0)>0).length;
  const valid=amount>0&&allocated>0&&allocated<=amount+0.001&&(un<=0.001||parkOnAcc);
  return {allocated,un,onAcc,valid,count};
}

// Bill-wise allocation panel (Receipt / Payment) — open bills with ageing, an
// allocate box + "Full" per bill, an Against-Bills / On-Account mode toggle and a
// summary foot. Controlled by the parent voucher form. Mirrors the HTML panel.
export function BillAllocPanel({side,party,q,amount,alloc,onSetAlloc,onFull,mode,onMode,parkOnAcc,onParkOnAcc,cur}){
  const bills=q?.data?.bills||[];
  const advances=q?.data?.advances||0;
  const {allocated,un,onAcc}=allocSummary(alloc,amount,parkOnAcc,mode);
  const settleWord=side==="supplier"?"payment":"receipt";
  const showOnAccToggle=mode==="bills"&&un>0.001&&allocated>0&&allocated<=amount+0.001;
  const ageTone=(d)=>d<=7?["#1B6B4C","#EAF3DE"]:d<=30?["#B7791F","#FAEEDA"]:["#9B2C2C","#FCEBEB"];

  return (
    <div style={{border:"1px solid #e1e3ec",borderRadius:10,overflow:"hidden",marginBottom:12}}>
      {/* header + Apply As toggle */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",padding:"10px 14px",background:"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.6px",color:"#d4a437",textTransform:"uppercase"}}>Bill-wise Allocation</span>
          {party&&<span style={{fontSize:11.5,fontWeight:700,color:"#0d1326"}}>{party}</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.5px",color:"#5a6691",textTransform:"uppercase"}}>Apply As</span>
          <div style={{display:"inline-flex",border:"1px solid #e1e3ec",borderRadius:6,overflow:"hidden"}}>
            {[["bills","Against Bills"],["onaccount","On Account"]].map(([m,lab])=>(
              <button key={m} onClick={()=>onMode(m)} style={{border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:10.5,fontWeight:700,padding:"6px 13px",
                background:mode===m?"#0d1326":"#fff",color:mode===m?"#d4a437":"#5a6691"}}>{lab}</button>
            ))}
          </div>
        </div>
      </div>

      {mode==="onaccount"?(
        <div style={{padding:"20px 16px",textAlign:"center"}}>
          <p style={{margin:0,fontSize:10,fontWeight:700,letterSpacing:"0.6px",color:"#5a6691",textTransform:"uppercase"}}>Full amount parked as advance</p>
          <p style={{margin:"6px 0",fontSize:26,fontWeight:800,color:"#B7791F",fontVariantNumeric:"tabular-nums"}}>{vf2(cur,amount)}</p>
          <p style={{margin:"0 auto",maxWidth:460,fontSize:11,color:"#5a6691",lineHeight:1.5}}>No bill is settled now. The amount is held as a credit on {party||"the party"}'s account and adjusts against their future bills.</p>
        </div>
      ):(
        <>
          {q?.isLoading?(
            <div style={{padding:"18px 16px",textAlign:"center",fontSize:11.5,color:"#5a6691"}}>Loading open bills…</div>
          ):bills.length===0?(
            <div style={{padding:"18px 16px",textAlign:"center",fontSize:11.5,color:"#5a6691"}}>
              {party?`No open bills for ${party}. Use “On Account” to park this ${settleWord} as an advance.`:`Select a party to load their open bills.`}
            </div>
          ):(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
                <thead><tr style={{background:"#fafafa",borderBottom:"1px solid #e1e3ec"}}>
                  {["Bill No.","Date","Age","Outstanding","Status",`Allocate (${cur})`].map((h,i)=>(
                    <th key={i} style={{padding:"8px 12px",textAlign:i>=3?(i===4?"center":"right"):"left",fontSize:9,fontWeight:700,letterSpacing:"0.4px",color:"#5a6691",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {bills.map(b=>{
                    const [ac,abg]=ageTone(b.ageDays);
                    return (
                      <tr key={b.billVno} style={{borderBottom:"1px solid #f3f4f8"}}>
                        <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10.5,fontWeight:700,color:"#0d1326"}}>{b.billVno}</td>
                        <td style={{padding:"8px 12px",fontSize:10.5,color:"#5a6691"}}>{b.date}</td>
                        <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,fontWeight:700,padding:"2px 7px",borderRadius:999,background:abg,color:ac}}>{b.ageDays}d</span></td>
                        <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{vf2(cur,b.outstanding)}</td>
                        <td style={{padding:"8px 12px",textAlign:"center"}}>
                          <span style={{fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:999,textTransform:"uppercase",
                            background:b.status==="partial"?"#FAEEDA":"#FCEBEB",color:b.status==="partial"?"#854F0B":"#A32D2D"}}>{b.status}</span>
                        </td>
                        <td style={{padding:"6px 12px",textAlign:"right",whiteSpace:"nowrap"}}>
                          <input type="number" min="0" max={b.outstanding} value={alloc[b.billVno]||""} placeholder="0"
                            onChange={e=>onSetAlloc(b.billVno,e.target.value,b.outstanding)}
                            style={{...inp,width:104,display:"inline-block",textAlign:"right",fontWeight:600,minHeight:28}}/>
                          <button onClick={()=>onFull(b.billVno,b.outstanding)} style={{border:"none",background:"transparent",color:"#d4a437",fontSize:10,fontWeight:700,cursor:"pointer",textDecoration:"underline",marginLeft:6,fontFamily:"inherit"}}>Full</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* summary foot */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",padding:"10px 14px",background:"#f3f4f8",borderTop:"1.5px solid #0d1326"}}>
            <div style={{display:"flex",gap:22,flexWrap:"wrap"}}>
              {[["Voucher Amount",vf2(cur,amount),"#0d1326"],["Allocated",vf2(cur,allocated),"#d4a437"],["Unallocated",vf2(cur,_r2(un-onAcc)),(_r2(un-onAcc)>0.001?"#A32D2D":"#27500A")],...(onAcc>0?[["On Account",vf2(cur,onAcc),"#B7791F"]]:[])].map(([l,v,c],i)=>(
                <div key={i}><p style={{margin:0,fontSize:8.5,fontWeight:700,letterSpacing:"0.5px",color:"#5a6691",textTransform:"uppercase"}}>{l}</p><p style={{margin:"2px 0 0",fontSize:13.5,fontWeight:800,color:c,fontVariantNumeric:"tabular-nums"}}>{v}</p></div>
              ))}
            </div>
            {showOnAccToggle&&(
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:11,fontWeight:700,color:"#384677"}}>
                <input type="checkbox" checked={parkOnAcc} onChange={e=>onParkOnAcc(e.target.checked)} style={{width:15,height:15,accentColor:"#d4a437",cursor:"pointer"}}/>
                Park balance <span style={{color:"#B7791F"}}>On Account</span> (advance)
              </label>
            )}
          </div>
        </>
      )}

      {advances>0&&(
        <div style={{padding:"8px 14px",fontSize:10.5,color:"#854F0B",background:"#FAEEDA",borderTop:"1px solid #FAC775"}}>
          ℹ {party} already holds {vf2(cur,advances)} on account (advance) — it will auto-adjust against open bills.
        </div>
      )}
    </div>
  );
}

export function PurchaseLinkField({branch,saleMod,saleAmt,onSelect,selected}){
  const mob=useMobile();
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState("");
  const cfg=bc(branch);
  const cur=cfg.cur;
  const purchMod=SALE_TO_PURCH_MOD[saleMod]||"PF";
  // Live registry from KBiz Books backend (falls back to demo data when API
  // is unreachable or returns empty). Replaces direct static-array reads.
  const liveRegistry=useLivePurchaseRegistry(purchMod, branch?.code);
  const available=liveRegistry.filter(p=>!p.settled);
  const allPurch  =liveRegistry;
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
    {id:1,name:"Mr. Rajiv Sharma",  ticket:"098-2156789012",airline:"Air India",sector:"BOM-DXB",date:"2026-05-16",cls:"Economy",base:18000,k3:1400,tax:0,otherTax:1100},
    {id:2,name:"Mrs. Rohan", ticket:"098-2156789013",airline:"Air India",sector:"BOM-DXB",date:"2026-05-16",cls:"Economy",base:18000,k3:1400,tax:0,otherTax:1100},
  ]);
  const [sc,setSc]=useState(1500);
  const [tripType,setTripType]=useState("International"); // International | Domestic
  const [irn,setIrn]=useState("a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456");
  const [terms,setTerms]=useState("1. Tickets are non-refundable unless airline policy permits.\n2. Date/route changes attract airline change fee + fare difference.\n3. Cancellation charges as per airline rules apply.\n4. Passport must be valid for 6 months beyond travel date.\n5. Visa, insurance and on-board services not included unless specified.");
  const [qrFile,setQrFile]=useState(null);
  const [partyGstin,setPartyGstin]=useState("27AABCS1234L1Z5");
  const intra=(partyGstin||"").trim().slice(0,2)==="27"; // office is in Mumbai (27)
  const t=useMemo(()=>{
    const base=pax.reduce((s,p)=>s+(+p.base||0),0);
    const k3=pax.reduce((s,p)=>s+(+p.k3||0),0);
    const tax=pax.reduce((s,p)=>s+(+p.tax||0),0);
    const otherTax=pax.reduce((s,p)=>s+(+p.otherTax||0),0);
    const taxes=k3+tax+otherTax;
    const gstFull=+(sc*0.18).toFixed(2);
    const cgst=intra?+(sc*0.09).toFixed(2):0;
    const sgst=intra?+(sc*0.09).toFixed(2):0;
    const igst=intra?0:gstFull;
    return {base:base,k3:k3,tax:tax,otherTax:otherTax,taxes:taxes,sc:sc,cgst:cgst,sgst:sgst,igst:igst,gstFull:gstFull,total:base+taxes+sc+gstFull};
  },[pax,sc,intra]);
  const upd=(id,f,v)=>setPax(ps=>ps.map(p=>p.id===id?{...p,[f]:v}:p));
  const add=()=>setPax(ps=>[...ps,{id:Date.now(),name:"",ticket:"",airline:"",sector:"",date:"",cls:"Economy",base:0,k3:0,tax:0,otherTax:0}]);
  const rm=id=>setPax(ps=>ps.filter(p=>p.id!==id));
  const cfg=bc(branch);
  const cur=cfg.cur;
  const isIntl=tripType==="International";
  return (
    <div style={{padding:"12px 10px",maxWidth:1260,margin:"0 auto",paddingBottom:72}}>
      <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:12,overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"12px 16px",background:"#0d1326"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:11}}>
              <div style={{width:38,height:38,borderRadius:9,background:"#E6F1FB",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>✈</div>
              <div>
                <p style={{margin:0,fontSize:15,fontWeight:700,color:"#fff"}}>Sales — Flight Tickets</p>
                <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{"Voucher · "+(branch?.code||"BOM")+" · "+vNo}</p>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:0,borderRadius:999,overflow:"hidden",border:"1px solid #2a3450"}}>
                <button onClick={()=>setTripType("Domestic")}
                  style={{padding:"5px 12px",fontSize:10,fontWeight:700,cursor:"pointer",border:"none",
                    background:tripType==="Domestic"?"#27500A":"transparent",
                    color:tripType==="Domestic"?"#fff":"#8b94b3"}}>
                  🇮🇳 Domestic
                </button>
                <button onClick={()=>setTripType("International")}
                  style={{padding:"5px 12px",fontSize:10,fontWeight:700,cursor:"pointer",border:"none",
                    background:tripType==="International"?"#185FA5":"transparent",
                    color:tripType==="International"?"#fff":"#8b94b3"}}>
                  🌍 International
                </button>
              </div>
              <span style={{fontSize:10,padding:"4px 10px",borderRadius:999,
                background:cfg.taxType==="GST"?"#E6F1FB":"#EAF3DE",
                color:cfg.taxType==="GST"?"#185FA5":"#27500A",fontWeight:700}}>
                {branch?.flag} {cfg.curCode} · {cfg.taxType==="GST"?"GST 18%":"VAT "+cfg.vatRate+"%"}
              </span>
            </div>
          </div>
          {/* IRN row */}
          <div style={{marginTop:10,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <label style={{fontSize:9.5,color:"#8b94b3",fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",whiteSpace:"nowrap"}}>IRN No.</label>
            <input value={irn} onChange={e=>setIrn(e.target.value)}
              style={{flex:1,minWidth:280,padding:"6px 10px",borderRadius:6,border:"1px solid #2a3450",
                background:"#1a2238",color:"#d4a437",fontFamily:"monospace",fontSize:10.5,fontWeight:600}}/>
            <span style={{fontSize:9,padding:"3px 9px",borderRadius:999,background:"#d4a437",color:"#0d1326",fontWeight:700,whiteSpace:"nowrap"}}>
              e-Invoice IRN
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
            <FL label="Date"><input type="date" defaultValue={todayISO()} style={inp}/></FL>
            <FL label="Invoice type"><select style={inp}><option>Tax Invoice</option><option>Bill of Supply</option><option>Proforma</option></select></FL>
            <FL label="Reference"><input defaultValue="REF-AI-78421" style={inp}/></FL>
            <SalespersonField branch={branch}/>
          </div>
        </div>

        {/* Party */}
        <div style={{padding:"13px 16px",borderBottom:"1px solid #e1e3ec"}}>
          <p style={{margin:"0 0 8px",fontSize:10,color:"#5a6691",textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:600}}>Customer</p>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:11}}>
            <FL label="Customer / Party A/c"><input placeholder="Select customer…" style={inp}/></FL>
            <FL label={cfg.taxType==="GST"?"GSTIN":"Tax ID"}><input value={partyGstin} onChange={e=>setPartyGstin(e.target.value.toUpperCase())} style={{...inp,fontFamily:"monospace"}}/></FL>
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
            <table style={{width:"100%",fontSize:11.5,borderCollapse:"collapse",minWidth:880}}>
              <thead><tr style={{background:"#f3f4f8"}}>
                {["#","Passenger","Ticket no.","Airline","Sector","Date","Class","Base fare","K3","Taxes","Other taxes",""].map((h,i)=>(
                  <th key={i} style={{padding:"7px 8px",textAlign:i>=7&&i<=10?"right":"left",
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
                  <td style={{padding:3}}><input type="number" value={p.k3} onChange={e=>upd(p.id,"k3",+e.target.value)} style={{...inp,minWidth:75,textAlign:"right"}} title="K3 tax (GST on airline tax — typically applicable on international tickets)"/></td>
                  <td style={{padding:3}}><input type="number" value={p.tax} onChange={e=>upd(p.id,"tax",+e.target.value)} style={{...inp,minWidth:80,textAlign:"right"}} title="Taxes / levies on this ticket"/></td>
                  <td style={{padding:3}}><input type="number" value={p.otherTax} onChange={e=>upd(p.id,"otherTax",+e.target.value)} style={{...inp,minWidth:80,textAlign:"right"}} title="Other taxes — YQ/YR fuel, airport fees, UDF, PSF"/></td>
                  <td style={{padding:"4px 8px",textAlign:"center"}}>
                    <button onClick={()=>rm(p.id)} style={{background:"transparent",border:"none",color:"#A32D2D",cursor:"pointer",fontSize:16}}>×</button>
                  </td>
                </tr>
              ))}</tbody>
              <tfoot><tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
                <td colSpan={7} style={{padding:"7px 8px",fontWeight:700,fontSize:11,color:"#5a6691"}}>Totals</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#185FA5"}}>{fmt(t.base)}</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#854F0B"}}>{fmt(t.k3)}</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#854F0B"}}>{fmt(t.tax)}</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#854F0B"}}>{fmt(t.otherTax)}</td>
                <td/>
              </tr></tfoot>
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
              ?(intra
                  ?<><FL label="CGST 9%"><input value={fmt(t.cgst)} readOnly style={{...inp,background:"#f3f4f8"}}/></FL>
                     <FL label="SGST 9%"><input value={fmt(t.sgst)} readOnly style={{...inp,background:"#f3f4f8"}}/></FL></>
                  :<FL label="IGST 18%"><input value={fmt(t.igst)} readOnly style={{...inp,background:"#f3f4f8"}}/></FL>)
              :<FL label={"VAT "+cfg.vatRate+"%"}><input value={fmt(+(sc*cfg.vatRate/100).toFixed(2))} readOnly style={{...inp,background:"#f3f4f8"}}/></FL>
            }
          </div>
          <p style={{margin:"6px 0 0",fontSize:10,color:intra?"#27500A":"#185FA5",fontWeight:600}}>
            {cfg.taxType==="GST"&&(intra
              ?"Intra-state supply (GSTIN starts with 27 — Maharashtra). CGST 9% + SGST 9% applied."
              :"Inter-state supply (GSTIN state code ≠ 27). IGST 18% applied; CGST/SGST suppressed.")}
          </p>
        </div>

        {/* Narration + summary */}
        <div style={{padding:"13px 16px",background:"#f9fafb"}}>
          <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:14}}>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <FL label="Narration"><textarea rows={2} defaultValue={"Being air tickets issued — "+pax.length+" pax · "+tripType} style={{...inp,resize:"vertical"}}/></FL>
              <FL label="Terms & Conditions">
                <textarea rows={5} value={terms} onChange={e=>setTerms(e.target.value)} style={{...inp,resize:"vertical",fontSize:10.5,lineHeight:1.45}}/>
              </FL>
              <div>
                <label style={{fontSize:10,color:"#5a6691",fontWeight:600,letterSpacing:"0.4px",textTransform:"uppercase"}}>GST QR Code</label>
                <div style={{marginTop:4,padding:"10px 12px",border:"2px dashed #c7cbe0",borderRadius:8,background:"#fff",
                  display:"flex",alignItems:"center",gap:11,flexWrap:"wrap"}}>
                  {qrFile
                    ?<>
                      <div style={{width:54,height:54,borderRadius:6,background:"#f3f4f8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,border:"1px solid #e1e3ec"}}>▦</div>
                      <div style={{flex:1,minWidth:140}}>
                        <p style={{margin:0,fontSize:11,fontWeight:700,color:"#0d1326"}}>{qrFile.name}</p>
                        <p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691"}}>{(qrFile.size/1024).toFixed(1)} KB · uploaded</p>
                      </div>
                      <button onClick={()=>setQrFile(null)} style={{...btnGh,fontSize:10,padding:"4px 10px",color:"#A32D2D",borderColor:"#A32D2D"}}>Remove</button>
                    </>
                    :<>
                      <div style={{width:54,height:54,borderRadius:6,background:"#f3f4f8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#8b94b3",border:"1px solid #e1e3ec"}}>▦</div>
                      <div style={{flex:1,minWidth:140}}>
                        <p style={{margin:0,fontSize:11,fontWeight:600,color:"#0d1326"}}>Upload GST e-Invoice QR code</p>
                        <p style={{margin:"2px 0 0",fontSize:9.5,color:"#5a6691"}}>PNG / JPG · signed QR from IRP portal</p>
                      </div>
                      <label style={{...btnGh,fontSize:10,padding:"5px 12px",cursor:"pointer",display:"inline-block"}}>
                        Choose file
                        <input type="file" accept="image/png,image/jpeg" style={{display:"none"}}
                          onChange={e=>{const f=e.target.files?.[0];if(f)setQrFile(f);}}/>
                      </label>
                    </>
                  }
                </div>
              </div>
            </div>
            <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:10,padding:14,alignSelf:"start"}}>
              <TRow l="Base fare" v={cur+" "+fmt(t.base)}/>
              <TRow l="K3 tax" v={cur+" "+fmt(t.k3)}/>
              <TRow l="Taxes" v={cur+" "+fmt(t.tax)}/>
              <TRow l="Other taxes" v={cur+" "+fmt(t.otherTax)}/>
              <TRow l="Service charge" v={cur+" "+fmt(t.sc)}/>
              {cfg.taxType==="GST"
                ?(intra
                    ?<><TRow l="CGST 9%" v={cur+" "+fmt(t.cgst)}/><TRow l="SGST 9%" v={cur+" "+fmt(t.sgst)}/></>
                    :<TRow l="IGST 18%" v={cur+" "+fmt(t.igst)}/>)
                :<TRow l={"VAT "+cfg.vatRate+"%"} v={cur+" "+fmt(+(sc*cfg.vatRate/100).toFixed(2))}/>}
              <div style={{borderTop:"2px solid #0d1326",margin:"8px 0",paddingTop:8,
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:700}}>Invoice total</span>
                <span style={{fontSize:18,fontWeight:800,color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>
                  {cur+" "+fmt(t.total)}
                </span>
              </div>
              <p style={{margin:"10px 0 0",fontSize:9.5,color:"#5a6691",fontStyle:"italic"}}>
                {isIntl
                  ?"International ticket — K3 (GST on airline tax) typically applies. CGST/SGST on service charge only."
                  :"Domestic ticket — K3 generally nil. Full GST on base fare + service charge as applicable."}
              </p>
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
  const [row,setRow]=useState({vehicle:"Toyota Innova Crysta",pickup:"Mumbai Airport T2",drop:"Pune Station",days:3,basic:12600,otherFare:1500,svc:800});
  const [partyGstin,setPartyGstin]=useState("27AACNI2211J1Z1");
  const intra=(partyGstin||"").trim().slice(0,2)==="27";
  const upd=(k,v)=>setRow(r=>({...r,[k]:v}));
  const sub=(+row.basic||0)+(+row.otherFare||0)+(+row.svc||0);
  const gstFull=+(sub*0.05).toFixed(2);
  const cgst=intra?+(sub*0.025).toFixed(2):0;
  const sgst=intra?+(sub*0.025).toFixed(2):0;
  const igst=intra?0:gstFull;
  const total=+(sub+gstFull).toFixed(2);
  return (
    <VWrap title="Sales Voucher — Car Rentals" icon="🚗" vNo={vNo} branch={branch} type="sales" saleMod="SC" saleAmt={total||0} setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} name="" gstin={partyGstin} onGstinChange={setPartyGstin}/>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <p style={{margin:"0 0 8px",fontSize:10,color:"#5a6691",textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:600}}>Vehicle &amp; hire details</p>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:820}}>
          <thead><tr>
            {["#","Vehicle","Pickup","Drop","Days","Basic ₹","Other fare ₹","Service charge ₹","Total ₹"].map((h,i)=><VTH key={i} c={h} r={i>=4&&i<=8}/>)}
          </tr></thead>
          <tbody>
            <tr style={{borderBottom:"1px solid #e1e3ec"}}>
              <VTD c={1}/>
              <td style={{padding:3}}>
                <input value={row.vehicle} onChange={e=>upd("vehicle",e.target.value)} style={{...inp,minHeight:28,fontSize:11}} title="Vehicle type / model"/>
              </td>
              <td style={{padding:3}}><input value={row.pickup} onChange={e=>upd("pickup",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={row.drop} onChange={e=>upd("drop",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input type="number" value={row.days} onChange={e=>upd("days",+e.target.value||1)} style={{...inp,minHeight:28,fontSize:11,width:60,textAlign:"right"}}/></td>
              <td style={{padding:3}}><input type="number" value={row.basic} onChange={e=>upd("basic",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}} title="Basic hire charges"/></td>
              <td style={{padding:3}}><input type="number" value={row.otherFare} onChange={e=>upd("otherFare",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}} title="Toll, parking, extra km, driver allowance"/></td>
              <td style={{padding:3}}><input type="number" value={row.svc} onChange={e=>upd("svc",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}} title="Agency service charge"/></td>
              <VTD c={fmt(sub)} r/>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label="GST rate"><input value={intra?"5% (CGST 2.5% + SGST 2.5%)":"5% (IGST)"} readOnly style={{...inp,background:"#f3f4f8",color:"#5a6691",fontWeight:600,cursor:"not-allowed"}}/></FL>
          {intra
            ?<>
              <FL label="CGST 2.5% ₹"><input value={fmt(cgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
              <FL label="SGST 2.5% ₹"><input value={fmt(sgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
            </>
            :<FL label="IGST 5% ₹"><input value={fmt(igst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>}
        </div>
        <div style={{marginTop:9,padding:"8px 12px",background:"#E6F1FB",borderRadius:8,fontSize:11.5,color:"#185FA5"}}>
          5% GST applied on (Basic + Other fare + Service charge). SAC 996601 — Rental services of road vehicles with operator. {intra?"Intra-state (27): CGST 2.5% + SGST 2.5%.":"Inter-state (state ≠ 27): IGST 5%."} No ITC available to buyer under the 5% scheme.
        </div>
      </div>
      <VNarr def={`Being car rental charges — ${row.pickup} to ${row.drop}, ${row.days} day(s).`}>
        <VTot branch={branch}
          lines={[
            {l:"Basic",v:"₹ "+fmt(row.basic)},
            {l:"Other fare",v:"₹ "+fmt(row.otherFare)},
            {l:"Service charge",v:"₹ "+fmt(row.svc)},
            ...(intra
              ?[{l:"CGST 2.5%",v:"₹ "+fmt(cgst)},{l:"SGST 2.5%",v:"₹ "+fmt(sgst)}]
              :[{l:"IGST 5%",v:"₹ "+fmt(igst)}]),
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
    {id:1,name:"Mr. Rajiv Sharma",pp:"Z1234567",country:"UAE",vtype:"Tourist 30D",vfsFee:1800,taxes:324,otherTax:150},
    {id:2,name:"Mrs. Rohan",pp:"Z1234568",country:"UAE",vtype:"Tourist 30D",vfsFee:1800,taxes:324,otherTax:150},
  ]);
  const [svc,setSvc]=useState(2500);
  const [partyGstin,setPartyGstin]=useState("27AABCS1234L1Z5");
  const intra=(partyGstin||"").trim().slice(0,2)==="27";
  const upd=(id,k,v)=>setAppl(as=>as.map(a=>a.id===id?{...a,[k]:v}:a));
  const add=()=>setAppl(as=>[...as,{id:Date.now(),name:"",pp:"",country:"",vtype:"",vfsFee:0,taxes:0,otherTax:0}]);
  const rm=id=>setAppl(as=>as.filter(a=>a.id!==id));
  const vfsTot=appl.reduce((s,a)=>s+(+a.vfsFee||0),0);
  const taxesTot=appl.reduce((s,a)=>s+(+a.taxes||0),0);
  const otherTot=appl.reduce((s,a)=>s+(+a.otherTax||0),0);
  const gstFull=+(svc*0.18).toFixed(2);
  const cgst=intra?+(svc*0.09).toFixed(2):0;
  const sgst=intra?+(svc*0.09).toFixed(2):0;
  const igst=intra?0:gstFull;
  const total=+(vfsTot+taxesTot+otherTot+svc+gstFull).toFixed(2);
  return (
    <VWrap title="Sales Voucher — Visas" icon="🛂" vNo={vNo} branch={branch} type="sales" saleMod="SV" saleAmt={total||0} setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} name="" gstin={partyGstin} onGstinChange={setPartyGstin}/>
      <div style={{padding:"8px 16px",borderBottom:"1px solid #e1e3ec",background:"#f9fafb",display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
        <span style={{fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Demo presets</span>
        <button onClick={()=>setPartyGstin("27AABCS1234L1Z5")}
          style={{padding:"4px 11px",borderRadius:999,border:"1px solid "+(intra?"#27500A":"#c7cbe0"),
            background:intra?"#27500A":"#fff",color:intra?"#fff":"#27500A",fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
          Intra-state · Mumbai (27)
        </button>
        <button onClick={()=>setPartyGstin("24AAGCG7456L1Z9")}
          style={{padding:"4px 11px",borderRadius:999,border:"1px solid "+(!intra?"#185FA5":"#c7cbe0"),
            background:!intra?"#185FA5":"#fff",color:!intra?"#fff":"#185FA5",fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
          Inter-state · Gujarat (24)
        </button>
        <span style={{fontSize:10,color:"#5a6691",marginLeft:"auto"}}>Click a preset to load a demo customer and watch CGST/SGST flip to IGST.</span>
      </div>
      <ARow label="Applicant details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:880}}>
          <thead><tr>
            {["#","Applicant name","Passport no.","Visa country","Visa type","VFS fee ₹","Taxes ₹","Other taxes ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=5&&i<=7}/>)}
          </tr></thead>
          <tbody>{appl.map((a,i)=>(
            <tr key={a.id} style={{borderBottom:"1px solid #e1e3ec"}}>
              <VTD c={i+1}/>
              <td style={{padding:3}}><input value={a.name} onChange={e=>upd(a.id,"name",e.target.value)} style={{...inp,minHeight:28,fontSize:11,minWidth:150}}/></td>
              <td style={{padding:3}}><input value={a.pp} onChange={e=>upd(a.id,"pp",e.target.value.toUpperCase())} style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace",width:100}}/></td>
              <td style={{padding:3}}><input value={a.country} onChange={e=>upd(a.id,"country",e.target.value)} style={{...inp,minHeight:28,fontSize:11,width:90}}/></td>
              <td style={{padding:3}}><input value={a.vtype} onChange={e=>upd(a.id,"vtype",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input type="number" value={a.vfsFee} onChange={e=>upd(a.id,"vfsFee",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:90}}/></td>
              <td style={{padding:3}}><input type="number" value={a.taxes} onChange={e=>upd(a.id,"taxes",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:80}} title="GST / VAT on VFS fee"/></td>
              <td style={{padding:3}}><input type="number" value={a.otherTax} onChange={e=>upd(a.id,"otherTax",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:80}} title="Service tax, biometric, courier — non-creditable"/></td>
              <DBtn fn={()=>rm(a.id)}/>
            </tr>
          ))}</tbody>
          <tfoot>
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
              <td colSpan={5} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(vfsTot)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#854F0B"}}>{fmt(taxesTot)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#854F0B"}}>{fmt(otherTot)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label={bc(branch).cur+"Service charge"}>
            <input type="number" value={svc} onChange={e=>setSvc(+e.target.value||0)} style={{...inp,textAlign:"right"}}/>
          </FL>
          {intra
            ?<>
              <FL label="CGST 9% ₹"><input value={fmt(cgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
              <FL label="SGST 9% ₹"><input value={fmt(sgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
            </>
            :<FL label="IGST 18% ₹"><input value={fmt(igst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>}
        </div>
        <div style={{marginTop:9,padding:"8px 12px",background:"#E6F1FB",borderRadius:8,fontSize:11.5,color:"#185FA5"}}>
          SAC code: <b>998212</b> — Visa and passport services. {intra?"Intra-state (27): CGST 9% + SGST 9% on service charge.":"Inter-state (state ≠ 27): IGST 18% on service charge."}
        </div>
      </div>
      <VNarr def="Being visa processing charges — 2 applicants, UAE Tourist 30D via VFS Dubai centre.">
        <VTot branch={branch}
          lines={[
            {l:"VFS fee (pass-through)",v:"₹ "+fmt(vfsTot)},
            {l:"Taxes",v:"₹ "+fmt(taxesTot)},
            {l:"Other taxes",v:"₹ "+fmt(otherTot)},
            {l:"Agency service charge",v:"₹ "+fmt(svc)},
            ...(intra
              ?[{l:"CGST 9%",v:"₹ "+fmt(cgst)},{l:"SGST 9%",v:"₹ "+fmt(sgst)}]
              :[{l:"IGST 18%",v:"₹ "+fmt(igst)}]),
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
    {id:1,passenger:"Mr. Rajiv Sharma",ci:"2026-06-05",co:"2026-06-08",rtype:"Deluxe King",meal:"CP",basic:24000,taxes:2880,otherTax:600},
  ]);
  const [svc,setSvc]=useState(1500);
  const [partyGstin,setPartyGstin]=useState("27AAPFL9876K1Z3");
  const intra=(partyGstin||"").trim().slice(0,2)==="27";
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),passenger:"",ci:"",co:"",rtype:"Deluxe",meal:"EP",basic:0,taxes:0,otherTax:0}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));

  const totBasic=rows.reduce((s,r)=>s+(+r.basic||0),0);
  const totTaxes=rows.reduce((s,r)=>s+(+r.taxes||0),0);
  const totOther=rows.reduce((s,r)=>s+(+r.otherTax||0),0);
  const subTable=totBasic+totTaxes+totOther;
  const gstFull=+(svc*0.18).toFixed(2);
  const cgst=intra?+(svc*0.09).toFixed(2):0;
  const sgst=intra?+(svc*0.09).toFixed(2):0;
  const igst=intra?0:gstFull;
  const total=+(subTable+svc+gstFull).toFixed(2);

  return (
    <VWrap title="Sales Voucher — Hotels" icon="🏨" vNo={vNo} branch={branch} type="sales" saleMod="SHT" saleAmt={total||0} setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} name="" gstin={partyGstin} onGstinChange={setPartyGstin}/>
      <div style={{padding:"8px 16px",borderBottom:"1px solid #e1e3ec",background:"#f9fafb",display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
        <span style={{fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Demo presets</span>
        <button onClick={()=>setPartyGstin("27AAPFL9876K1Z3")}
          style={{padding:"4px 11px",borderRadius:999,border:"1px solid "+(intra?"#27500A":"#c7cbe0"),
            background:intra?"#27500A":"#fff",color:intra?"#fff":"#27500A",fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
          Intra-state · Mumbai (27)
        </button>
        <button onClick={()=>setPartyGstin("24AAGCG7456L1Z9")}
          style={{padding:"4px 11px",borderRadius:999,border:"1px solid "+(!intra?"#185FA5":"#c7cbe0"),
            background:!intra?"#185FA5":"#fff",color:!intra?"#fff":"#185FA5",fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
          Inter-state · Gujarat (24)
        </button>
        <span style={{fontSize:10,color:"#5a6691",marginLeft:"auto"}}>Click a preset to load a demo customer and watch CGST/SGST flip to IGST.</span>
      </div>
      <ARow label="Accommodation details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:960}}>
          <thead><tr>
            {["#","Passenger Name","Check-in","Check-out","Room type","Meal plan","Room fare / Basic fare ₹","Taxes ₹","Other tax ₹","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=6&&i<=9}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const lineTotal=(+r.basic||0)+(+r.taxes||0)+(+r.otherTax||0);
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.passenger} onChange={e=>upd(r.id,"passenger",e.target.value)} style={{...inp,minHeight:28,fontSize:11,minWidth:160}}/></td>
                <td style={{padding:3}}><input type="date" value={r.ci} onChange={e=>upd(r.id,"ci",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input type="date" value={r.co} onChange={e=>upd(r.id,"co",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input value={r.rtype} onChange={e=>upd(r.id,"rtype",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}>
                  <select value={r.meal} onChange={e=>upd(r.id,"meal",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}>
                    <option>EP</option><option>CP</option><option>MAP</option><option>AP</option>
                  </select>
                </td>
                <td style={{padding:3}}><input type="number" value={r.basic} onChange={e=>upd(r.id,"basic",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
                <td style={{padding:3}}><input type="number" value={r.taxes} onChange={e=>upd(r.id,"taxes",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}} title="GST / occupancy / luxury tax charged by the hotel"/></td>
                <td style={{padding:3}}><input type="number" value={r.otherTax} onChange={e=>upd(r.id,"otherTax",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}} title="City fee, resort fee, tourism levy, destination tax"/></td>
                <VTD c={fmt(lineTotal)} r/>
                <DBtn fn={()=>rm(r.id)}/>
              </tr>
            );
          })}</tbody>
          <tfoot>
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
              <td colSpan={6} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(totBasic)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#854F0B"}}>{fmt(totTaxes)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#854F0B"}}>{fmt(totOther)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#185FA5"}}>{fmt(subTable)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label={bc(branch).cur+"Service charge"}>
            <input type="number" value={svc} onChange={e=>setSvc(+e.target.value||0)} style={{...inp,textAlign:"right"}}/>
          </FL>
          {intra
            ?<>
              <FL label="CGST 9% ₹"><input value={fmt(cgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
              <FL label="SGST 9% ₹"><input value={fmt(sgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
            </>
            :<FL label="IGST 18% ₹"><input value={fmt(igst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>}
        </div>
        <div style={{marginTop:9,padding:"8px 12px",background:"#E6F1FB",borderRadius:8,fontSize:11.5,color:"#185FA5"}}>
          SAC code: <b>998552</b> — Tour operator / accommodation reservation. Room fare + Taxes + Other tax are pass-through to the customer. {intra?"Intra-state (27): CGST 9% + SGST 9% on agency service charge.":"Inter-state (state ≠ 27): IGST 18% on agency service charge."}
        </div>
      </div>
      <VNarr def="Being hotel accommodation — Hyatt Regency Ahmedabad, 5-8 June 2026, CP meal plan.">
        <VTot branch={branch}
          lines={[
            {l:"Room fare / Basic fare",v:"₹ "+fmt(totBasic)},
            {l:"Taxes",v:"₹ "+fmt(totTaxes)},
            {l:"Other tax",v:"₹ "+fmt(totOther)},
            {l:"Agency service charge",v:"₹ "+fmt(svc)},
            ...(intra
              ?[{l:"CGST 9%",v:"₹ "+fmt(cgst)},{l:"SGST 9%",v:"₹ "+fmt(sgst)}]
              :[{l:"IGST 18%",v:"₹ "+fmt(igst)}]),
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
    {id:1,name:"TATA AIG General Insurance",pp:"Z1234567",dest:"Bali, Indonesia",basic:4200,otherTax:0,svc:500},
    {id:2,name:"TATA AIG General Insurance",pp:"Z1234568",dest:"Bali, Indonesia",basic:4200,otherTax:0,svc:500},
  ]);
  const [partyGstin,setPartyGstin]=useState("24AABCM8765G1Z2");
  const intra=(partyGstin||"").trim().slice(0,2)==="27";
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),name:"",pp:"",dest:"",basic:0,otherTax:0,svc:0}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));
  const totBasic=rows.reduce((s,r)=>s+(+r.basic||0),0);
  const totOther=rows.reduce((s,r)=>s+(+r.otherTax||0),0);
  const totSvc=rows.reduce((s,r)=>s+(+r.svc||0),0);
  const taxable=totBasic+totOther+totSvc;
  const isGST=bc(branch).taxType==="GST";
  const gstFull=isGST?+(taxable*0.18).toFixed(2):+(taxable*(bc(branch).vatRate||18)/100).toFixed(2);
  const cgst=isGST&&intra?+(taxable*0.09).toFixed(2):0;
  const sgst=isGST&&intra?+(taxable*0.09).toFixed(2):0;
  const igst=isGST&&!intra?gstFull:0;
  const total=+(taxable+gstFull).toFixed(2);
  return (
    <VWrap title="Sales Voucher — Insurance" icon="🛡" vNo={vNo} branch={branch} type="sales" saleMod="SI" saleAmt={total||0} setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} name="" gstin={partyGstin} onGstinChange={setPartyGstin}/>
      <ARow label="Policy details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:880}}>
          <thead><tr>
            {["#","Name","Passport no.","Destination","Basic ₹","Other tax ₹","Service charge ₹","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=4&&i<=7}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const lineTotal=(+r.basic||0)+(+r.otherTax||0)+(+r.svc||0);
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.name} onChange={e=>upd(r.id,"name",e.target.value)} style={{...inp,minHeight:28,fontSize:11,minWidth:180}}/></td>
                <td style={{padding:3}}><input value={r.pp} onChange={e=>upd(r.id,"pp",e.target.value.toUpperCase())} style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace",width:100}}/></td>
                <td style={{padding:3}}><input value={r.dest} onChange={e=>upd(r.id,"dest",e.target.value)} style={{...inp,minHeight:28,fontSize:11,minWidth:130}}/></td>
                <td style={{padding:3}}><input type="number" value={r.basic} onChange={e=>upd(r.id,"basic",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:85}} title="Basic / net premium amount"/></td>
                <td style={{padding:3}}><input type="number" value={r.otherTax} onChange={e=>upd(r.id,"otherTax",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:80}} title="Stamp duty, levy or other non-creditable tax on policy"/></td>
                <td style={{padding:3}}><input type="number" value={r.svc} onChange={e=>upd(r.id,"svc",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:85}} title="Agency service charge"/></td>
                <VTD c={fmt(lineTotal)} r/>
                <DBtn fn={()=>rm(r.id)}/>
              </tr>
            );
          })}</tbody>
          <tfoot>
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
              <td colSpan={4} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(totBasic)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#854F0B"}}>{fmt(totOther)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#27500A"}}>{fmt(totSvc)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#185FA5"}}>{fmt(taxable)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label={bc(branch).cur+"Taxable value"}><input value={fmt(taxable)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
          {intra
            ?<>
              <FL label="CGST 9% ₹"><input value={fmt(cgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
              <FL label="SGST 9% ₹"><input value={fmt(sgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
            </>
            :<FL label="IGST 18% ₹"><input value={fmt(igst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>}
          <FL label="Invoice total ₹"><input value={fmt(total)} readOnly style={{...inp,textAlign:"right",fontWeight:700,background:"#f3f4f8",color:"#185FA5"}}/></FL>
        </div>
        <div style={{marginTop:9,padding:"8px 12px",background:"#E6F1FB",borderRadius:8,fontSize:11.5,color:"#185FA5"}}>
          GST 18% on (Basic + Other tax + Service charge). SAC 997131 — Life &amp; non-life insurance. {intra?"Intra-state (27): split as CGST 9% + SGST 9%.":"Inter-state (state ≠ 27): IGST 18%."}
        </div>
      </div>
      <VNarr def="Being travel insurance premium — 2 pax, Bali destination.">
        <VTot branch={branch}
          lines={[
            {l:"Basic",v:"₹ "+fmt(totBasic)},
            {l:"Other tax",v:"₹ "+fmt(totOther)},
            {l:"Service charge",v:"₹ "+fmt(totSvc)},
            ...(intra
              ?[{l:"CGST 9%",v:"₹ "+fmt(cgst)},{l:"SGST 9%",v:"₹ "+fmt(sgst)}]
              :[{l:"IGST 18%",v:"₹ "+fmt(igst)}]),
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
    {id:1,gl:"SIM card — Airtel International Roaming",sac:"996429",amt:1998,gstPct:18},
    {id:2,gl:"Travel documentation & attestation charges",sac:"998212",amt:1500,gstPct:18},
    {id:3,gl:"Forex card issuance fee (Niyo Global)",sac:"996611",amt:200,gstPct:18},
  ]);
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),gl:"",sac:"",amt:0,gstPct:18}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));

  const sub=rows.reduce((s,r)=>s+(+r.amt||0),0);
  const gstAmt=rows.reduce((s,r)=>s+(+r.amt||0)*(r.gstPct/100),0);
  const total=+(sub+gstAmt).toFixed(2);

  const gstByRate={};
  rows.forEach(r=>{
    const amt=+r.amt||0;
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
      <VParty branch={branch} name="" gstin=""/>
      <ARow label="Service / item details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:760}}>
          <thead><tr>
            {["#","G.L Name","SAC code","Amount ₹","GST %","GST ₹","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=3&&i<=6}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const amt=+r.amt||0;
            const g=+(amt*(r.gstPct/100)).toFixed(2);
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.gl} onChange={e=>upd(r.id,"gl",e.target.value)} style={{...inp,minHeight:28,fontSize:11,minWidth:220}}/></td>
                <td style={{padding:3}}><input value={r.sac} onChange={e=>upd(r.id,"sac",e.target.value)} style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace",width:90}}/></td>
                <td style={{padding:3}}><input type="number" value={r.amt} onChange={e=>upd(r.id,"amt",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
                <td style={{padding:3}}>
                  <select value={r.gstPct} onChange={e=>upd(r.id,"gstPct",+e.target.value)} style={{...inp,minHeight:28,fontSize:11,background:rateBg[r.gstPct],color:rateC[r.gstPct],fontWeight:600,width:75}}>
                    <option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option>
                  </select>
                </td>
                <VTD c={fmt(g)} r/>
                <td style={{padding:"4px 7px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{fmt(amt+g)}</td>
                <DBtn fn={()=>rm(r.id)}/>
              </tr>
            );
          })}</tbody>
          <tfoot>
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
              <td colSpan={3} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(sub)}</td>
              <td/>
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
      <VNarr def="Being miscellaneous travel services — SIM cards, documentation charges, forex card issuance.">
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
  return <NoteVoucher branch={branch} kind="credit"/>;
}

/* Credit Note (sales return — reduce what a customer owes) and Debit Note
   (purchase return — reduce what we owe a supplier) share one form; `kind` flips
   the party side, the base ledger and the GST direction. Follows the HTML notes:
   Place of Supply switches CGST+SGST ↔ IGST; income/expense + GST are reversed and
   the party is settled. GST + TCS reversal are kept from the live app. */
function NoteVoucher({branch,kind}){
  const isCredit=kind==="credit";
  const mob=useMobile();
  const vNo=useVNo(branch,isCredit?"SCN":"SDN");
  const cfg=bc(branch);
  const cur=cfg.cur;
  const GST_RATES=[0,5,12,18,28];
  const REASONS=isCredit
    ?["Ticket Cancellation / Refund","Fare Correction","Sales Return","Discount Allowed","Rate Difference"]
    :["Ticket Cancellation by Airline","Purchase Return","Rate Difference","Overcharge Correction","Discount Received"];
  const baseLedger=isCredit?"Sales Return":"Purchase Return";
  const gstKind=isCredit?"Output":"Input";

  const [date,setDate]=useState(todayISO());
  const [againstInv,setAgainstInv]=useState("");
  const [gstMode,setGstMode]=useState("intra");   // intra → CGST+SGST · inter → IGST
  const [party,setParty]=useState("");
  const [reason,setReason]=useState(REASONS[0]);
  const [taxableStr,setTaxableStr]=useState("");
  const [gstPct,setGstPct]=useState(18);
  const [tcsStr,setTcsStr]=useState("");
  const [narration,setNarration]=useState("");

  const LEDGER_REGISTRY=useLedgerRegistry(branch).data||[];
  const partyName=LEDGER_REGISTRY.find(l=>l.id===party)?.name||"";
  const taxable=_r2(+taxableStr||0);
  const gstAmt=_r2(taxable*gstPct/100);
  const tcs=_r2(+tcsStr||0);
  const total=_r2(taxable+gstAmt+tcs);
  const cgst=gstMode==="intra"?_r2(gstAmt/2):0;
  const sgst=gstMode==="intra"?_r2(gstAmt-cgst):0;
  const noteSide=isCredit?"DR":"CR";   // income/expense + GST reversed on this side
  const gstRows=gstAmt>0?(gstMode==="inter"
    ?[{side:noteSide,ledger:`IGST ${gstKind}`,amount:gstAmt,note:`IGST @ ${gstPct}% reversed`}]
    :[{side:noteSide,ledger:`CGST ${gstKind}`,amount:cgst,note:`CGST @ ${gstPct/2}% reversed`},{side:noteSide,ledger:`SGST ${gstKind}`,amount:sgst,note:`SGST @ ${gstPct/2}% reversed`}]):[];
  const tcsRow=tcs>0?[{side:noteSide,ledger:isCredit?"TCS Payable — 206C(1G)":"TCS Receivable",amount:tcs,note:"TCS reversed"}]:[];
  const baseRow={side:noteSide,ledger:baseLedger,amount:taxable,note:reason};
  const partyRow={side:isCredit?"CR":"DR",ledger:partyName||(isCredit?"Customer (Debtor)":"Supplier (Creditor)"),amount:total,note:isCredit?"Customer outstanding reduced":"Supplier outstanding reduced"};
  const jrows=isCredit?[baseRow,...gstRows,...tcsRow,partyRow]:[partyRow,baseRow,...gstRows,...tcsRow];

  const post=useCreateVoucher();
  const brPost=brCodeOf(branch);
  const canPost=!!brPost&&!!partyName&&taxable>0&&!post.isPending;
  const reset=()=>{ setTaxableStr("");setTcsStr("");setNarration("");setAgainstInv(""); };
  const doSave=()=>{
    if(!canPost)return;
    post.mutate({
      vno:vNo, type:isCredit?"SCN":"SDN", category:isCredit?"credit-note":"debit-note", branch:brPost, date,
      party:partyName, partyType:isCredit?"customer":"supplier",
      lines:[{ledger:baseLedger, amt:taxable, desc:reason}],
      subtotal:taxable, taxAmt:gstAmt, gstMode, tcsAmt:tcs, total,
      againstInvoice:againstInv, linkNo:againstInv,
      remarks:narration||`Being ${isCredit?"credit":"debit"} note — ${reason}${againstInv?` vs ${againstInv}`:""}`,
      status:"saved",
    });
  };

  const tDr=jrows.reduce((s,r)=>s+(r.side==="DR"?r.amount:0),0);
  const tCr=jrows.reduce((s,r)=>s+(r.side==="CR"?r.amount:0),0);
  const title=isCredit?"Credit Note":"Debit Note";
  return (
    <VWrap title={title} icon={isCredit?"📋":"📈"} vNo={vNo} branch={branch}>
      <VHead vNo={vNo}/>
      <div style={{padding:"14px 16px"}}>
        <VExplain>
          {isCredit
            ?<><b style={{color:"#A07828"}}>Credit Note:</b> issued to a <b>customer</b> to reduce what they owe (cancellation, refund, fare correction). The income &amp; output GST are <b>Debited</b> (reversed); the customer is <b>Credited</b>. Outside-state Place of Supply switches the GST to <b>IGST</b>.</>
            :<><b style={{color:"#A07828"}}>Debit Note:</b> issued to a <b>supplier</b> to reduce what you owe (purchase return, overcharge, airline cancellation). The supplier is <b>Debited</b>; the purchase &amp; input GST are <b>Credited</b> (reversed). Outside-state Place of Supply switches the GST to <b>IGST</b>.</>}
        </VExplain>

        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"1fr 1fr 1fr",gap:12,marginBottom:14}}>
          <FL label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></FL>
          <FL label="Against invoice"><input value={againstInv} onChange={e=>setAgainstInv(e.target.value)} style={inp} placeholder="DS/32/26-27"/></FL>
          <VPlaceOfSupply mode={gstMode} onChange={setGstMode}/>
        </div>

        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:14}}>
          <FL label={isCredit?"Credit To (Customer / Debtor)":"Debit To (Supplier / Creditor)"}>
            <LedgerSelect branch={branch} value={party} onChange={setParty} filter={l=>l.type===(isCredit?"Debtor":"Creditor")} placeholder={isCredit?"Select customer / debtor...":"Select supplier / creditor..."}/>
          </FL>
          <FL label="Reason"><select value={reason} onChange={e=>setReason(e.target.value)} style={inp}>{REASONS.map(r=><option key={r}>{r}</option>)}</select></FL>
        </div>

        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:14}}>
          <FL label={`Taxable amount (${cur})`}><input type="number" value={taxableStr} onChange={e=>setTaxableStr(e.target.value)} placeholder="0.00" style={{...inp,textAlign:"right",fontWeight:700}}/></FL>
          <FL label="GST rate"><select value={gstPct} onChange={e=>setGstPct(+e.target.value)} style={inp}>{GST_RATES.map(r=><option key={r} value={r}>{r}%</option>)}</select></FL>
          <FL label={`TCS reversed (${cur}, optional)`}><input type="number" value={tcsStr} onChange={e=>setTcsStr(e.target.value)} placeholder="0.00" style={{...inp,textAlign:"right"}}/></FL>
        </div>

        <p style={{margin:"0 0 6px",fontSize:9,fontWeight:700,letterSpacing:"1px",color:"#A07828",textTransform:"uppercase"}}>Account Entries</p>
        <VJournalPreview rows={jrows} cur={cur}/>
        <VBalanceBar dr={tDr} cr={tCr} cur={cur} emptyText="Enter the taxable amount to build the note"/>

        <FL label="Narration"><textarea value={narration} onChange={e=>setNarration(e.target.value)} rows={2} style={{...inp,resize:"vertical",marginBottom:12}} placeholder={`Being ${isCredit?"credit":"debit"} note for ${reason.toLowerCase()}${againstInv?` against ${againstInv}`:""}`}/></FL>

        <VSaveMsg m={post} okText={`✔ ${title} ${vNo} posted · ${partyName} outstanding ${isCredit?"reduced":"reduced"} ${vf2(cur,total)} · GST${tcs>0?"/TCS":""} reversed · books refreshed`}/>
        {!brPost&&<div style={{padding:"8px 12px",borderRadius:8,background:"#FAEEDA",fontSize:10.5,color:"#854F0B",fontWeight:600,textAlign:"center",marginBottom:8}}>Select a specific branch (not “All”) to post this note.</div>}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={reset} style={btnGh}>Reset</button>
          <button onClick={doSave} disabled={!canPost} style={{...btnG,background:canPost?(isCredit?"#9B2C2C":"#1B6B4C"):"#bfc3d6",opacity:canPost?1:0.55}}>
            {isCredit?"📋":"📈"} Save {title} {post.isPending?"…":!partyName?`(Pick ${isCredit?"Customer":"Supplier"})`:taxable<=0?"(Enter Amount)":""}
          </button>
        </div>
      </div>
    </VWrap>
  );
}


/* ════════════════════════════════════════════════════════════════
   REFUND & REISSUE  (against a sales invoice)   /finance/refund · /finance/reissue
   Mirrors the provided Travkings HTML mockups — a module strip (Flights / Holidays /
   Hotels / Car Rental / Insurance / Visa / Misc), the supplier refund/payable calc,
   our retained service charge + markup (+GST) and the customer refund/bill — rendered
   in the KBiz360 theme. BOTH act ONLY on an existing sales invoice, picked from the
   dropdown (Save is blocked until one is chosen). Each posts a balanced double-entry
   (category 'refund' / 'reissue', type RF / RI) so the Trial Balance, P&L, Balance
   Sheet, Day Book, GST and module GP all update at once.

     Refund     Dr Supplier  | Cr Customer + Cr Service/Markup income + Cr Output GST
     Reissue    Dr Customer   | Cr Supplier  + Cr Service/Markup income + Cr Output GST
   ════════════════════════════════════════════════════════════════ */

// Sale voucher `type` → product module key (drives ledger names + strip labels).
const SALE_TYPE_MODULE = { SF:"Flight", SH:"Holiday", SHT:"Hotel", SC:"Car", SV:"Visa", SI:"Insurance", SM:"Misc" };

// Per-module display config for the Refund / Reissue strip (mirrors the mockup MODULES).
const RR_MODULES = {
  Flight:    {tab:"Flights",    supplier:"IndiGo Airlines (Creditor)",      sup:"airline",        ref1:"PNR",            ref2:"Ticket No",       rfCancel:"Airline Cancellation Charge",  riFee:"Airline Reissue / Change Fee", diff:"Fare Difference"},
  Holiday:   {tab:"Holidays",   supplier:"Tour Operator (Creditor)",        sup:"tour operator",  ref1:"Package Ref",    ref2:"Booking ID",      rfCancel:"Operator Cancellation Charge", riFee:"Operator Amendment Fee",       diff:"Package Difference"},
  Hotel:     {tab:"Hotels",     supplier:"Hotel / Aggregator (Creditor)",   sup:"hotel",          ref1:"Booking Ref",    ref2:"Confirmation No", rfCancel:"Hotel Cancellation Charge",    riFee:"Date-change Fee",              diff:"Tariff Difference"},
  Car:       {tab:"Car Rental", supplier:"Rental Company (Creditor)",       sup:"rental company", ref1:"Rental Ref",     ref2:"Voucher No",      rfCancel:"Rental Cancellation Charge",   riFee:"Modification Fee",             diff:"Rental Difference"},
  Insurance: {tab:"Insurance",  supplier:"Insurer (Creditor)",              sup:"insurer",        ref1:"Policy No",      ref2:"Certificate No",  rfCancel:"Policy Cancellation Charge",   riFee:"Endorsement Fee",              diff:"Premium Difference"},
  Visa:      {tab:"Visa",       supplier:"Embassy / VFS (Creditor)",        sup:"embassy/VFS",    ref1:"Application No", ref2:"Reference No",    rfCancel:"Processing Charge Retained",   riFee:"Re-submission Fee",            diff:"Category Difference"},
  Misc:      {tab:"Misc.",      supplier:"Vendor (Creditor)",               sup:"vendor",         ref1:"Reference No",   ref2:"Invoice No",      rfCancel:"Vendor Cancellation Charge",   riFee:"Service / Amendment Fee",      diff:"Amount Difference"},
};
const RR_ORDER = ["Flight","Holiday","Hotel","Car","Insurance","Visa","Misc"];
// Per-module Purchase/Cost ledger the supplier's service charge is debited to on a
// refund/reissue (so it reduces that module's GP). Mirrors the backend PRODUCT_META.
const RR_COST_LEDGER = {
  Flight:"Purchase — Air Tickets", Holiday:"Purchase — Holiday Packages", Hotel:"Purchase — Hotels",
  Car:"Purchase — Car Rental", Insurance:"Purchase — Insurance", Visa:"Purchase — Visa", Misc:"Purchase — Misc",
};

/* ── Sale-invoice fare breakup (client mirror of backend vouchers.dto) ──────────
   The Books frontend points at PROD by default, so a Refund/Reissue must stay
   correct even before the enriched API is deployed. Each helper prefers the
   backend-derived field (inv.baseFare / inv.serviceCharge / inv.pax) and falls
   back to computing it from the sale's line.meta breakup. */
const SVC_META_RE=/service\s*charge|service\s*fee|agency\s*fee|handling\s*fee|\bmark[\s-]?up\b/i;
const TAX_META_RE=/\b(cgst|sgst|igst|gst|vat|tcs|tds)\b/i;
const _meta2num=v=>{ const n=Number(String(v==null?"":v).replace(/[, ]/g,"")); return Number.isFinite(n)?n:0; };

// Agency service charge + markup retained at the time of sale (our income, NOT the
// fare paid to the supplier). GST/TCS keys are excluded so they never count here.
function invServiceCharge(inv){
  if(inv&&inv.serviceCharge!=null) return _r2(inv.serviceCharge);
  let svc=0;
  for(const ln of (inv?.lines||[])){
    const meta=(ln&&ln.meta)||{};
    for(const k of Object.keys(meta)){ if(SVC_META_RE.test(k)&&!TAX_META_RE.test(k)) svc+=_meta2num(meta[k]); }
  }
  return _r2(svc);
}
// Original fare paid to the supplier — the taxable base EXCLUDING service charge /
// markup, CGST/SGST/IGST and TCS (GST & TCS are never folded into `subtotal`).
function invBaseFare(inv){
  if(inv&&inv.baseFare!=null) return _r2(inv.baseFare);
  return _r2(Math.max(0,(inv?.subtotal||0)-invServiceCharge(inv)));
}
// Per-pax base fare for one line — the line amount net of THAT line's own service
// charge/markup (so summed across pax it reconciles to invBaseFare).
function lineBaseFare(ln){
  const amt=_meta2num(ln&&ln.amt);
  if(amt<=0) return 0;
  let svc=0; const meta=(ln&&ln.meta)||{};
  for(const k of Object.keys(meta)){ if(SVC_META_RE.test(k)&&!TAX_META_RE.test(k)) svc+=_meta2num(meta[k]); }
  return _r2(Math.max(0,amt-svc));
}
// Passenger / booking rows (+ per-pax base fare) for the pax-detail panel, the
// searchable option text and per-passenger partial refund/reissue.
function invPax(inv){
  const rows=(inv?.lines||[])
    .filter(ln=>ln&&(ln.passenger||ln.ticket||ln.pnr||ln.sector))
    .map(ln=>({name:ln.passenger||"",ticket:ln.ticket||"",pnr:ln.pnr||"",sector:ln.sector||"",airline:ln.airline||"",cls:ln.cls||"",ticketType:ln.ticketType||"",travelDate:ln.travelDate||"",baseFare:lineBaseFare(ln)}));
  if(rows.length){
    // If no line carried an amount, split the invoice base equally across pax.
    if(!rows.some(p=>p.baseFare>0)){ const each=_r2(invBaseFare(inv)/rows.length); rows.forEach(p=>{p.baseFare=each;}); }
    return rows;
  }
  // Fallback: backend identity-only pax (no line amounts) → equal base split.
  if(inv&&Array.isArray(inv.pax)&&inv.pax.length){ const each=_r2(invBaseFare(inv)/inv.pax.length); return inv.pax.map(p=>({...p,baseFare:p.baseFare!=null?p.baseFare:each})); }
  return [];
}
// Stable key for a pax row (drives the per-passenger selection sets).
const paxKey=(p,i)=>`${p.ticket||""}|${p.pnr||""}|${p.name||""}|${i}`;
const _r2DateP=n=>String(n).padStart(2,"0");
// Backspace-friendly date entry. The native <input type="date"> won't let Backspace
// move from the year segment back to the month; this is a plain text field (DD-MM-YYYY)
// where Backspace edits the whole string, parsing to ISO (YYYY-MM-DD) for the model.
function DateField({value,onChange,style}){
  const toDisplay=iso=>{ const m=String(iso||"").match(/^(\d{4})-(\d{2})-(\d{2})$/); return m?`${m[3]}-${m[2]}-${m[1]}`:(iso||""); };
  const [txt,setTxt]=useState(toDisplay(value));
  useEffect(()=>{ setTxt(toDisplay(value)); },[value]);
  const commit=s=>{
    setTxt(s);
    const m=s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if(!m) return;
    let [,d,mo,y]=m; if(y.length===2) y="20"+y;
    const dd=+d, mm=+mo, yy=+y;
    if(mm<1||mm>12||dd<1||dd>31) return;
    const iso=`${String(yy).padStart(4,"0")}-${_r2DateP(mm)}-${_r2DateP(dd)}`;
    const dt=new Date(iso+"T00:00:00");
    if(!isNaN(dt.getTime())) onChange(iso);
  };
  return <input type="text" inputMode="numeric" value={txt} onChange={e=>commit(e.target.value)} placeholder="DD-MM-YYYY" style={style}/>;
}

/* Searchable sales-invoice picker — the only document a Refund/Reissue acts on.
   Mirrors LedgerSelect's portal dropdown (so a parent's overflow can't clip it) and
   filters by voucher no, customer, date, and every pax name / ticket / PNR / sector. */
function InvoiceSelect({invoices,value,onChange,cur,loading,placeholder,noun="sales invoice"}){
  const nounPlural=noun+"s";
  const [q,setQ]=useState("");
  const [open,setOpen]=useState(false);
  const [rect,setRect]=useState(null);
  const [activeIdx,setActiveIdx]=useState(0);   // keyboard-highlighted option
  const ref=useRef(null), menuRef=useRef(null);
  const selected=invoices.find(v=>v.id===value);
  const norm=s=>String(s||"").toLowerCase();
  const paxText=inv=>invPax(inv).map(p=>`${p.name} ${p.ticket} ${p.pnr} ${p.sector} ${p.airline}`).join(" ");
  const filtered=invoices.filter(inv=>{
    if(!q) return true; const t=norm(q);
    return norm(inv.vno).includes(t)||norm(inv.party).includes(t)||norm(inv.date).includes(t)||norm(paxText(inv)).includes(t);
  }).slice(0,20);
  const paxLabel=inv=>{ const px=invPax(inv); if(!px.length) return ""; const head=(px.map(p=>p.name).filter(Boolean)[0])||px[0].ticket||px[0].pnr||""; return px.length>1?`${head} +${px.length-1} more`:head; };
  const place=()=>{ if(ref.current) setRect(ref.current.getBoundingClientRect()); };
  const openMenu=()=>{ place(); setQ(""); setOpen(true); };
  useEffect(()=>{
    if(!open)return;
    const onDoc=e=>{ if(ref.current?.contains(e.target)||menuRef.current?.contains(e.target))return; setOpen(false); };
    const reposition=()=>place();
    document.addEventListener("mousedown",onDoc);
    window.addEventListener("scroll",reposition,true);
    window.addEventListener("resize",reposition);
    return()=>{ document.removeEventListener("mousedown",onDoc); window.removeEventListener("scroll",reposition,true); window.removeEventListener("resize",reposition); };
  },[open]);
  // Reset the keyboard highlight to the top whenever the query (result set) or open state changes.
  useEffect(()=>{ setActiveIdx(0); },[q,open]);
  // Arrow Up/Down to move, Enter to pick, Esc to close — from the search box.
  const onKeyNav=e=>{
    if(e.key==="ArrowDown"){ e.preventDefault(); setActiveIdx(i=>Math.min(i+1,filtered.length-1)); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); setActiveIdx(i=>Math.max(i-1,0)); }
    else if(e.key==="Enter"){ e.preventDefault(); const pick=filtered[activeIdx]; if(pick){ onChange(pick.id); setOpen(false); } }
    else if(e.key==="Escape"){ e.preventDefault(); setOpen(false); }
  };
  const menu=open&&rect&&createPortal(
    <div ref={menuRef} style={{position:"fixed",top:rect.bottom+4,left:rect.left,width:Math.max(rect.width,330),zIndex:4000,background:"#fff",
      border:"1px solid #e1e3ec",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.18)",overflow:"hidden"}}>
      <div style={{position:"relative"}}>
        <Search size={13} style={{position:"absolute",left:10,top:9,color:"#8b94b3"}}/>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)} onKeyDown={onKeyNav} placeholder="Search by invoice no, party, pax, ticket, PNR or sector…  (↑ ↓ to move · Enter to select)"
          style={{width:"100%",border:"none",borderBottom:"1px solid #e1e3ec",padding:"8px 12px 8px 30px",fontSize:11,outline:"none",boxSizing:"border-box"}}/>
      </div>
      <div style={{maxHeight:300,overflowY:"auto"}}>
        {filtered.map((inv,idx)=>{
          const pl=paxLabel(inv);
          const active=idx===activeIdx;
          return (
            <div key={inv.id} ref={el=>{ if(active&&el) el.scrollIntoView({block:"nearest"}); }}
              onClick={()=>{onChange(inv.id);setOpen(false);}} onMouseEnter={()=>setActiveIdx(idx)}
              style={{padding:"8px 12px",cursor:"pointer",borderBottom:"1px solid #f3f4f8",background:active?"#eaf0ff":"transparent"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"baseline"}}>
                <span style={{fontFamily:"monospace",fontSize:10.5,fontWeight:700,color:"#185FA5"}}>{inv.vno}</span>
                <span style={{fontSize:11,fontWeight:700,color:"#0d1326",fontVariantNumeric:"tabular-nums"}}>{vf2(cur,inv.total)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",gap:10,marginTop:2}}>
                <span style={{fontSize:10.5,color:"#0d1326",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inv.party||"—"}</span>
                <span style={{fontSize:9.5,color:"#5a6691",flexShrink:0}}>{inv.date}</span>
              </div>
              {pl&&<div style={{fontSize:9.5,color:"#5a6691",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                <span style={{color:"#A07828",fontWeight:700}}>{invPax(inv).length} pax</span> · {pl}</div>}
            </div>
          );
        })}
        {filtered.length===0&&<div style={{padding:"12px",fontSize:11,color:"#5a6691"}}>{loading?`Loading ${nounPlural}…`:`No matching ${noun}`}</div>}
      </div>
      <div style={{padding:"6px 10px",borderTop:"1px solid #f3f4f8",fontSize:9.5,color:"#5a6691"}}>{invoices.length} {nounPlural} · type to filter</div>
    </div>, document.body);
  return (
    <div ref={ref} style={{position:"relative"}}>
      <div onClick={()=>open?setOpen(false):openMenu()} style={{...inp,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",minHeight:32,
        borderColor:selected?"#C0DD97":"#F7C1C1",background:selected?"#f8fff8":"#fffafa"}}>
        {selected
          ?<span style={{fontSize:11,color:"#0d1326",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><b style={{fontFamily:"monospace",color:"#185FA5"}}>{selected.vno}</b> · {selected.party||"—"} · {vf2(cur,selected.total)}</span>
          :<span style={{fontSize:11,color:"#bf7d7d"}}>{loading?`Loading ${nounPlural}…`:(invoices.length?(placeholder||`Search & select a ${noun}…`):`No ${nounPlural} in this branch`)}</span>}
        <ChevronDown size={12} style={{color:"#5a6691",flexShrink:0}}/>
      </div>
      {menu}
    </div>
  );
}

/* Pax + fare breakup of the picked invoice — confirms WHO travelled and shows the
   original fare net of service charge + GST that the refund/reissue acts on. When
   `selectable`, each passenger gets a checkbox so only the cancelled/amended pax are
   refunded/reissued (for a ticket with multiple issuances). */
function InvoicePaxPanel({inv,cur,label="Invoice",selectable=false,selected,onToggle,onToggleAll}){
  if(!inv) return null;
  const pax=invPax(inv);
  const isSel=(p,i)=> !selectable || !selected || selected.has(paxKey(p,i));
  const selPax=pax.filter((p,i)=>isSel(p,i));
  const allSel=pax.length>0 && selPax.length===pax.length;
  const selBase=selectable ? _r2(selPax.reduce((s,p)=>s+(+p.baseFare||0),0)) : invBaseFare(inv);
  const svc=invServiceCharge(inv);
  const gst=_r2(inv.taxAmt||inv.gstAmt||0), tcs=_r2(inv.tcsAmt||0);
  const chip=(l,v,c)=>(
    <div style={{flex:1,minWidth:118,padding:"7px 11px",borderRadius:7,background:"#f3f4f8",border:"1px solid #e1e3ec"}}>
      <div style={{fontSize:8.5,fontWeight:700,letterSpacing:".5px",color:"#5a6691",textTransform:"uppercase"}}>{l}</div>
      <div style={{fontSize:13,fontWeight:800,marginTop:2,color:c||"#0d1326",fontVariantNumeric:"tabular-nums"}}>{vf2(cur,v)}</div>
    </div>
  );
  return (
    <div style={{...card,padding:"11px 13px",marginBottom:14,background:"#FBFCFE"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6,marginBottom:8}}>
        <span style={{fontSize:9,fontWeight:700,letterSpacing:"1px",color:"#A07828",textTransform:"uppercase"}}>{label} {inv.vno} · Pax Detail{selectable&&pax.length>1?<span style={{color:"#185FA5"}}> · select who to {label.toLowerCase().includes("purchase")?"settle":"refund/reissue"}</span>:null}</span>
        <span style={{fontSize:9.5,color:"#5a6691"}}>{selectable&&pax.length>0?`${selPax.length}/${pax.length} pax · `:""}{inv.date} · {inv.party||"—"}{inv.gstMode?` · ${inv.gstMode==="inter"?"Inter-state (IGST)":"Intra-state (CGST+SGST)"}`:""}</span>
      </div>
      {pax.length>0?(
        <div style={{overflowX:"auto",marginBottom:9}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:10.5}}>
            <thead><tr style={{borderBottom:"1px solid #e1e3ec"}}>
              {selectable&&<th style={{padding:"4px 8px",textAlign:"center"}}><input type="checkbox" checked={allSel} onChange={()=>onToggleAll&&onToggleAll(pax,!allSel)} title="Select all"/></th>}
              {["#","Passenger","Ticket / Ref","Sector","Airline / Operator","Class","Base Fare"].map((h,i)=>(
                <th key={i} style={{textAlign:i===0?"center":i===6?"right":"left",padding:"4px 8px",fontSize:8.5,fontWeight:700,color:"#5a6691",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{pax.map((p,i)=>{
              const sel=isSel(p,i);
              return (
              <tr key={i} style={{borderBottom:".5px solid #f3f4f8",opacity:selectable&&!sel?0.4:1}}>
                {selectable&&<td style={{padding:"4px 8px",textAlign:"center"}}><input type="checkbox" checked={sel} onChange={()=>onToggle&&onToggle(paxKey(p,i))}/></td>}
                <td style={{padding:"4px 8px",textAlign:"center",color:"#9A9A9A"}}>{i+1}</td>
                <td style={{padding:"4px 8px",fontWeight:600,color:"#0d1326",whiteSpace:"nowrap"}}>{p.name||"—"}</td>
                <td style={{padding:"4px 8px",fontFamily:"monospace",fontSize:9.5,color:"#185FA5",whiteSpace:"nowrap"}}>{p.ticket||p.pnr||"—"}</td>
                <td style={{padding:"4px 8px",color:"#5a6691",whiteSpace:"nowrap"}}>{p.sector||"—"}</td>
                <td style={{padding:"4px 8px",color:"#5a6691",whiteSpace:"nowrap"}}>{p.airline||"—"}</td>
                <td style={{padding:"4px 8px",color:"#5a6691",whiteSpace:"nowrap"}}>{p.cls||"—"}</td>
                <td style={{padding:"4px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#1B6B4C",fontWeight:600,whiteSpace:"nowrap"}}>{vf2(cur,p.baseFare||0)}</td>
              </tr>
            );})}</tbody>
          </table>
        </div>
      ):<div style={{fontSize:10,color:"#9A9A9A",marginBottom:9}}>No passenger detail recorded on this invoice.</div>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {chip(selectable?"Selected Fare (excl. svc + GST)":"Original Fare (excl. svc + GST)",selBase,"#1B6B4C")}
        {chip("Service Charge + Markup",svc,"#A07828")}
        {chip("GST collected",gst,"#185FA5")}
        {tcs>0&&chip("TCS collected",tcs,"#854F0B")}
        {chip("Invoice Total",inv.total,"#0d1326")}
      </div>
    </div>
  );
}

export function RefundVoucher({branch}){ return <RefundReissueVoucher branch={branch} kind="refund"/>; }
export function ReissueVoucher({branch}){ return <RefundReissueVoucher branch={branch} kind="reissue"/>; }

function RefundReissueVoucher({branch,kind}){
  const isRefund=kind==="refund";
  const mob=useMobile();
  const vNo=useVNo(branch,isRefund?"RF":"RI");
  const cfg=bc(branch); const cur=cfg.cur;

  const [date,setDate]=useState(todayISO());
  const [module,setModule]=useState("Flight");
  const [invId,setInvId]=useState("");            // selected sale voucher id (mandatory → customer leg)
  const [ref1,setRef1]=useState(""); const [ref2,setRef2]=useState("");
  const [gstMode,setGstMode]=useState("intra");
  // Refund-only inputs
  const [origFare,setOrigFare]=useState(0);
  const [supCancel,setSupCancel]=useState(0);
  // Reissue-only inputs
  const [changeFee,setChangeFee]=useState(0);
  const [fareDiff,setFareDiff]=useState(0);
  // Charges levied BY THE SUPPLIER on the cancellation/amendment — reduce the refund /
  // add to the payable. GST on them is folded into the supplier net (a direct cost).
  const [supSvc,setSupSvc]=useState(0);
  const [supGstRate,setSupGstRate]=useState(18);
  // Our retained income.
  const [svc,setSvc]=useState(0);
  const [gstRateSvc,setGstRateSvc]=useState(18);
  const [markup,setMarkup]=useState(0);
  const [gstRateMk,setGstRateMk]=useState(18);
  const [narration,setNarration]=useState("");

  // Live sale + purchase invoices for this branch. A refund/reissue settles BOTH in
  // one voucher: the SALE drives the customer (debtor) leg, the auto-linked PURCHASE
  // drives the supplier (creditor) leg / original cost.
  const salesQ=useSalesRegister(branch);
  const invoices=salesQ.data||[];
  const selInv=invoices.find(v=>v.id===invId);
  const purchQ=usePurchaseRegister(branch);
  const purchases=purchQ.data||[];
  // The related PURCHASE invoice is AUTO-LINKED from the picked sale (every sale shares
  // a Link No with its purchase) — there is NO manual purchase picker. Falls back to a
  // shared ticket-no / PNR match for live CRM data that leaves Link No blank.
  const selPur=useMemo(()=>{
    if(!selInv) return null;
    const key=(selInv.linkNo||"").trim();
    if(key){ const m=purchases.find(p=>(p.linkNo||"").trim()===key); if(m) return m; }
    const tickets=new Set(invPax(selInv).map(p=>(p.ticket||"").trim()).filter(Boolean));
    const pnrs=new Set(invPax(selInv).map(p=>(p.pnr||"").trim()).filter(Boolean));
    if(tickets.size||pnrs.size) return purchases.find(p=>invPax(p).some(x=>(x.ticket&&tickets.has(x.ticket.trim()))||(x.pnr&&pnrs.has(x.pnr.trim()))))||null;
    return null;
  },[selInv,purchases]);

  const cfgM=RR_MODULES[module]||RR_MODULES.Misc;
  // Supplier (creditor) = the auto-linked purchase's party; customer (debtor) = the
  // sale's party. Both are LOCKED on a refund/reissue — not editable.
  const supplierName=selPur?.party || cfgM.supplier;
  const supplierGroup=selPur?.partyGroup || "";
  const customerName=selInv?.party || "";
  const customerGroup=selInv?.partyGroup || "";

  // ── Per-passenger selection (a ticket / Link No can carry multiple issuances) ──
  const salePax=invPax(selInv);
  const purPax=invPax(selPur);
  const [salePaxSel,setSalePaxSel]=useState(()=>new Set());
  const [purPaxSel,setPurPaxSel]=useState(()=>new Set());
  useEffect(()=>{ setSalePaxSel(new Set(salePax.map((p,i)=>paxKey(p,i)))); },[selInv?.id]); // default: all
  useEffect(()=>{ setPurPaxSel(new Set(purPax.map((p,i)=>paxKey(p,i)))); },[selPur?.id]);    // default: all
  const togglePax=setSel=>k=>setSel(s=>{ const n=new Set(s); n.has(k)?n.delete(k):n.add(k); return n; });
  const toggleAllPax=setSel=>(list,on)=>setSel(on?new Set(list.map((p,i)=>paxKey(p,i))):new Set());
  const selPurBase=_r2(purPax.filter((p,i)=>purPaxSel.has(paxKey(p,i))).reduce((s,p)=>s+(+p.baseFare||0),0));
  const selSaleNames=salePax.filter((p,i)=>salePaxSel.has(paxKey(p,i))).map(p=>p.name).filter(Boolean);

  // Picking a sales invoice prefills module, references and GST mode (customer side).
  const pickInvoice=(id)=>{
    setInvId(id);
    const inv=invoices.find(v=>v.id===id); if(!inv)return;
    setModule(SALE_TYPE_MODULE[inv.type]||"Misc");
    setGstMode(inv.gstMode==="inter"?"inter":"intra");
    const l0=(inv.lines&&inv.lines[0])||{};
    setRef1(l0.pnr||inv.vno||"");
    setRef2(l0.ticket||"");
  };

  // Prefill the Refund "Original Fare" from the SELECTED purchase passengers (net of
  // service charge & the CGST/SGST/IGST already on the purchase). Falls back to the whole
  // purchase, then the sale, until the link resolves. Keyed on ids + selection so a
  // background refetch can't clobber it.
  const purSelKey=[...purPaxSel].sort().join(",");
  useEffect(()=>{
    if(!isRefund) return;
    if(selPur&&purPax.length) setOrigFare(selPurBase);
    else if(selPur) setOrigFare(invBaseFare(selPur));
    else if(selInv) setOrigFare(invBaseFare(selInv));
  },[selPur?.id,selInv?.id,purSelKey,isRefund]);

  // ── Calc (mirrors the mockup formulae) ──
  const gstSvc=Math.round(svc*gstRateSvc)/100;
  const gstMk =Math.round(markup*gstRateMk)/100;
  const supGst=_r2(Math.round(supSvc*supGstRate)/100);   // GST charged BY the supplier on its service
  const taxAmt=_r2(gstSvc+gstMk);
  const ourCharges=_r2(svc+gstSvc+markup+gstMk);
  const supRefund=_r2(Math.max(0,origFare-supCancel-supSvc-supGst));  // refund: net the supplier returns us
  const supPayable=_r2(changeFee+fareDiff+supSvc+supGst);             // reissue: net we owe the supplier
  // The supplier's service charge is OUR cost (booked separately, see supChargeRows) —
  // it is NOT adjusted against the customer. So the customer figure is the fare/fee
  // only ± our charges, never ± the supplier's service charge.
  const custRefund=_r2((origFare-supCancel)-ourCharges);  // refund: balance to customer (may be <0 → invalid)
  const custBill=_r2((changeFee+fareDiff)+ourCharges);    // reissue: total billed to customer
  const supSvcLedger=RR_COST_LEDGER[module]||"Purchase — Misc";
  const supplierAmt=isRefund?supRefund:supPayable;
  const total=isRefund?custRefund:custBill;

  // GST preview legs (split by place of supply).
  const gstRows=taxAmt>0?(gstMode==="inter"
    ?[{side:"CR",ledger:"IGST Output",amount:taxAmt,note:"IGST on our charges"}]
    :[{side:"CR",ledger:"CGST Output",amount:_r2(taxAmt/2),note:"CGST on our charges"},{side:"CR",ledger:"SGST Output",amount:_r2(taxAmt-_r2(taxAmt/2)),note:"SGST on our charges"}]):[];
  const incomeRows=[
    ...(svc>0?[{side:"CR",ledger:"Service Charge Income",amount:svc,note:"retained service charge"}]:[]),
    ...(markup>0?[{side:"CR",ledger:"Markup Income",amount:markup,note:"retained markup"}]:[]),
  ];
  // Supplier service charge → our own cost (per-module Purchase head, reduces GP); its
  // GST → claimable Input credit. Both are SEPARATE legs, never netted with the customer.
  const supChargeRows=[
    ...(supSvc>0?[{side:"DR",ledger:supSvcLedger,amount:supSvc,note:"supplier service charge (our cost)"}]:[]),
    ...(supGst>0?(gstMode==="inter"
      ?[{side:"DR",ledger:"IGST Input",amount:supGst,note:"input IGST on supplier charge (claimable)"}]
      :[{side:"DR",ledger:"CGST Input",amount:_r2(supGst/2),note:"input CGST on supplier charge"},{side:"DR",ledger:"SGST Input",amount:_r2(supGst-_r2(supGst/2)),note:"input SGST on supplier charge"}]):[]),
  ];
  const jrows=isRefund?[
    {side:"DR",ledger:supplierName,amount:supRefund,note:"refund receivable from supplier (net of its charges)"},
    ...supChargeRows,
    {side:"CR",ledger:customerName||"Customer (Debtor)",amount:custRefund,note:"refund payable to customer"},
    ...incomeRows,...gstRows,
  ]:[
    {side:"DR",ledger:customerName||"Customer (Debtor)",amount:custBill,note:"total billed to customer"},
    ...supChargeRows,
    {side:"CR",ledger:supplierName,amount:supPayable,note:"fee + difference + supplier charges payable"},
    ...incomeRows,...gstRows,
  ];
  const tDr=jrows.reduce((s,r)=>s+(r.side==="DR"?r.amount:0),0);
  const tCr=jrows.reduce((s,r)=>s+(r.side==="CR"?r.amount:0),0);

  // Gross profit = our service charge + markup LESS the supplier's service charge
  // (a direct cost). Its GST is claimable input credit, so it never hits GP.
  const gp=_r2(svc+markup-supSvc);
  const gpBase=isRefund?supRefund:custBill;
  const gpPct=gpBase>0?_r2(gp/gpBase*100):0;

  const post=useCreateVoucher();
  const brPost=brCodeOf(branch);
  const chargesExceed=isRefund&&custRefund<0;
  const amountsOk=isRefund?(supRefund>0&&custRefund>=0):(supPayable>0&&custBill>0);
  const canPost=!!brPost&&!!selInv&&!!selPur&&!!supplierName&&!!customerName&&amountsOk&&!post.isPending;

  const reset=()=>{ setSupCancel(0);setChangeFee(0);setFareDiff(0);setSupSvc(0);setSvc(0);setMarkup(0);setNarration(""); };
  const paxNote=selSaleNames.length&&selSaleNames.length<salePax.length?` · pax: ${selSaleNames.join(", ")}`:"";
  const doSave=()=>{
    if(!canPost)return;
    post.mutate({
      vno:vNo, type:isRefund?"RF":"RI", category:isRefund?"refund":"reissue", branch:brPost, date,
      party:customerName, partyType:"customer", partyGroup:customerGroup,
      counterParty:supplierName, counterPartyGroup:supplierGroup, supplierAmt, supplierSvc:supSvc, supplierGst:supGst, supplierSvcLedger:supSvcLedger,
      lines:[
        {ledger:"Service Charge Income", amt:svc, desc:"Retained service charge", drCr:"Cr"},
        {ledger:"Markup Income", amt:markup, desc:"Retained markup", drCr:"Cr"},
      ].filter(l=>(+l.amt||0)>0),
      subtotal:_r2(svc+markup), taxAmt, gstMode, total,
      againstInvoice:selInv.vno, againstPurchase:selPur?.vno||"",
      linkNo:selInv.linkNo||selPur?.linkNo||selInv.vno, costCenter:selInv.costCenter||selPur?.costCenter||"",
      remarks:narration||`Being ${kind} of ${module.toLowerCase()} booking ${ref1||selInv.vno} against ${selInv.vno}${selPur?` / ${selPur.vno}`:""}${paxNote}`,
      status:"saved",
    });
  };

  const accent=isRefund?"#A32D2D":"#185FA5";   // refund = reversal (maroon) · reissue = re-bill (blue)
  const title=isRefund?"Refund Voucher":"Reissue Voucher";
  const num=(v,set,extra={})=>(<input type="number" value={v||""} onChange={e=>set(+e.target.value||0)} placeholder="0.00" style={{...inp,textAlign:"right",fontWeight:600,...extra}}/>);

  return (
    <VWrap title={title} icon={isRefund?"💳":"🔄"} vNo={vNo} branch={branch}>
      <VHead vNo={vNo}/>
      <div style={{padding:"14px 16px"}}>
        <VExplain>
          {isRefund
            ?<><b style={{color:"#A07828"}}>Refund:</b> a customer cancels a {module.toLowerCase()} booking. The {cfgM.sup} refunds the fare minus its cancellation charge; you retain a service charge + markup (+GST) and refund the balance to the customer. The supplier is <b>Debited</b> (receivable); the customer, your income & GST are <b>Credited</b>. Any <b>service charge the {cfgM.sup} levies is booked as your own cost</b> (separate {supSvcLedger} leg, reducing GP) and its GST as input credit — <b>not</b> passed to the customer. <b>Pick both the sales invoice</b> being cancelled <b>and its purchase invoice</b> below.</>
            :<><b style={{color:"#A07828"}}>Reissue:</b> a customer changes a {module.toLowerCase()} booking. The {cfgM.sup} charges a change fee plus any fare difference; you add a service charge + markup (+GST) and bill the total to the customer. The customer is <b>Debited</b>; the supplier, your income & GST are <b>Credited</b>. Any <b>service charge the {cfgM.sup} levies is booked as your own cost</b> (separate {supSvcLedger} leg, reducing GP) and its GST as input credit — <b>not</b> added to the customer's bill. <b>Pick both the sales invoice</b> being amended <b>and its purchase invoice</b> below.</>}
        </VExplain>

        {/* Module strip — mirrors the mockup tabs */}
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14,borderBottom:"1px solid #e1e3ec",paddingBottom:10}}>
          {RR_ORDER.map(m=>(
            <button key={m} onClick={()=>setModule(m)} style={{padding:"6px 13px",borderRadius:7,fontSize:10.5,fontWeight:700,cursor:"pointer",textTransform:"uppercase",letterSpacing:".3px",
              background:module===m?"#0d1326":"#f3f4f8",color:module===m?"#d4a437":"#5a6691",border:"1.5px solid "+(module===m?"#d4a437":"#e1e3ec")}}>{RR_MODULES[m].tab}</button>
          ))}
        </div>

        {/* Voucher date + place of supply */}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:14}}>
          <FL label="Date (DD-MM-YYYY)"><DateField value={date} onChange={setDate} style={inp}/></FL>
          <VPlaceOfSupply mode={gstMode} onChange={setGstMode}/>
        </div>

        {/* ① Sales side — settles the customer (debtor) leg (required) */}
        <p style={{margin:"0 0 8px",fontSize:9,fontWeight:700,letterSpacing:"1px",color:"#185FA5",textTransform:"uppercase"}}>① Sales Invoice — customer side (required)</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12,marginBottom:10}}>
          <FL label={`Against Sales Invoice — ${isRefund?"cancel":"amend"} (required)`}>
            <InvoiceSelect invoices={invoices} value={invId} onChange={pickInvoice} cur={cur} loading={salesQ.isLoading} noun="sales invoice"/>
          </FL>
        </div>
        <InvoicePaxPanel inv={selInv} cur={cur} label="Sales Invoice" selectable selected={salePaxSel} onToggle={togglePax(setSalePaxSel)} onToggleAll={toggleAllPax(setSalePaxSel)}/>

        {/* ② Purchase side — AUTO-LINKED from the sale by Link No (no manual pick) */}
        <p style={{margin:"0 0 8px",fontSize:9,fontWeight:700,letterSpacing:"1px",color:"#27500A",textTransform:"uppercase"}}>② Purchase Invoice — supplier side (auto-linked by Link No · sets the original cost)</p>
        {selPur
          ? <InvoicePaxPanel inv={selPur} cur={cur} label="Purchase Invoice · auto-linked" selectable selected={purPaxSel} onToggle={togglePax(setPurPaxSel)} onToggleAll={toggleAllPax(setPurPaxSel)}/>
          : selInv
            ? <div style={{padding:"10px 13px",borderRadius:8,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600,marginBottom:14}}>⚠ No purchase invoice is linked to {selInv.vno}{selInv.linkNo?` (Link No ${selInv.linkNo})`:" — the sale has no Link No"}{purchQ.isLoading?" · loading purchases…":""}. A refund/reissue must settle the linked purchase — check the purchase exists with the same Link No.</div>
            : <div style={{padding:"10px 13px",borderRadius:8,background:"#f3f4f8",border:"1px solid #e1e3ec",fontSize:10.5,color:"#5a6691",marginBottom:14}}>Pick a sales invoice above — its linked purchase invoice loads automatically.</div>}

        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:14}}>
          <FL label={cfgM.ref1}><input value={ref1} onChange={e=>setRef1(e.target.value)} style={inp} placeholder={cfgM.ref1}/></FL>
          <FL label={cfgM.ref2}><input value={ref2} onChange={e=>setRef2(e.target.value)} style={inp} placeholder={cfgM.ref2}/></FL>
          <FL label="Supplier (Creditor) · locked"><div title={supplierName} style={{...inp,background:"#f3f4f8",color:"#3A3A3A",display:"flex",alignItems:"center",minHeight:32,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{supplierName||"— from purchase —"}</div></FL>
          <FL label="Customer (Debtor) · locked"><div title={customerName} style={{...inp,background:"#f3f4f8",color:"#3A3A3A",display:"flex",alignItems:"center",minHeight:32,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{customerName||"— from sale —"}</div></FL>
        </div>

        {/* Calc grid — mirrors the mockup calc-grid */}
        <p style={{margin:"0 0 8px",fontSize:9,fontWeight:700,letterSpacing:"1px",color:"#A07828",textTransform:"uppercase"}}>{module} {isRefund?"Refund":"Reissue"} Calculation</p>
        <div style={{...card,padding:"14px 16px",marginBottom:14}}>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:"10px 26px"}}>
            {isRefund?<>
              <RRLine label="Original Fare" sub={selPur?`from purchase ${selPur.vno} (excl. svc + GST)`:`paid to ${cfgM.sup}`}>{num(origFare,setOrigFare)}</RRLine>
              <RRLine label={cfgM.rfCancel} sub={`${cfgM.sup} retains`}>{num(supCancel,setSupCancel)}</RRLine>
              <RRLine label="Supplier Service Charge" sub={`our cost → ${supSvcLedger} (reduces GP)`}>{num(supSvc,setSupSvc)}</RRLine>
              <RRLine label={<>GST on Supplier Charge @<input type="number" value={supGstRate} onChange={e=>setSupGstRate(+e.target.value||0)} style={{width:42,padding:"2px 4px",border:"1px solid #e1e3ec",borderRadius:4,fontSize:11,textAlign:"right"}}/>%</>} sub="input credit (claimable)" derived><input type="number" value={supGst} disabled style={{...inp,textAlign:"right",fontWeight:700,background:"#f3f4f8",color:"#5a6691"}}/></RRLine>
              <RRLine label="Supplier Refund to Us" sub="fare − cancellation − supplier charges" derived><input type="number" value={supRefund} disabled style={{...inp,textAlign:"right",fontWeight:700,background:"#f3f4f8",color:"#5a6691"}}/></RRLine>
              <div/>
            </>:<>
              <RRLine label={cfgM.riFee} sub={`charged by ${cfgM.sup}`}>{num(changeFee,setChangeFee)}</RRLine>
              <RRLine label={cfgM.diff} sub="new − old">{num(fareDiff,setFareDiff)}</RRLine>
              <RRLine label="Supplier Service Charge" sub={`our cost → ${supSvcLedger} (reduces GP)`}>{num(supSvc,setSupSvc)}</RRLine>
              <RRLine label={<>GST on Supplier Charge @<input type="number" value={supGstRate} onChange={e=>setSupGstRate(+e.target.value||0)} style={{width:42,padding:"2px 4px",border:"1px solid #e1e3ec",borderRadius:4,fontSize:11,textAlign:"right"}}/>%</>} sub="input credit (claimable)" derived><input type="number" value={supGst} disabled style={{...inp,textAlign:"right",fontWeight:700,background:"#f3f4f8",color:"#5a6691"}}/></RRLine>
              <RRLine label="Payable to Supplier" sub="fee + difference + supplier charges" derived><input type="number" value={supPayable} disabled style={{...inp,textAlign:"right",fontWeight:700,background:"#f3f4f8",color:"#5a6691"}}/></RRLine>
              <div/>
            </>}
            <RRLine label="Our Service Charge" sub="our income, retained">{num(svc,setSvc)}</RRLine>
            <RRLine label={<>GST on Service @<input type="number" value={gstRateSvc} onChange={e=>setGstRateSvc(+e.target.value||0)} style={{width:42,padding:"2px 4px",border:"1px solid #e1e3ec",borderRadius:4,fontSize:11,textAlign:"right"}}/>%</>} sub="on service charge" derived><input type="number" value={gstSvc} disabled style={{...inp,textAlign:"right",fontWeight:700,background:"#f3f4f8",color:"#5a6691"}}/></RRLine>
            <RRLine label="Our Markup" sub="our margin, retained">{num(markup,setMarkup)}</RRLine>
            <RRLine label={<>GST on Markup @<input type="number" value={gstRateMk} onChange={e=>setGstRateMk(+e.target.value||0)} style={{width:42,padding:"2px 4px",border:"1px solid #e1e3ec",borderRadius:4,fontSize:11,textAlign:"right"}}/>%</>} sub="on markup" derived><input type="number" value={gstMk} disabled style={{...inp,textAlign:"right",fontWeight:700,background:"#f3f4f8",color:"#5a6691"}}/></RRLine>
          </div>
          {/* Highlight: amount to / from customer */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginTop:12,padding:"11px 14px",borderRadius:8,background:"#FDFAF4",border:"1px solid "+(chargesExceed?"#F7C1C1":"#EFE7D4")}}>
            <span style={{fontSize:12.5,fontWeight:800,color:chargesExceed?"#A32D2D":"#A07828"}}>{isRefund?"Refund to Customer":"Total Billed to Customer"}<span style={{display:"block",fontSize:10,fontWeight:400,color:"#9A9A9A"}}>{isRefund?"(fare − cancellation) − our charges · excl. supplier svc":"fee + difference + service + markup + GST · excl. supplier svc"}</span></span>
            <span style={{fontSize:17,fontWeight:800,color:chargesExceed?"#A32D2D":"#A07828",fontVariantNumeric:"tabular-nums"}}>{vf2(cur,isRefund?custRefund:custBill)}</span>
          </div>
        </div>

        <p style={{margin:"0 0 6px",fontSize:9,fontWeight:700,letterSpacing:"1px",color:"#A07828",textTransform:"uppercase"}}>Account Entries</p>
        <VJournalPreview rows={jrows} cur={cur}/>
        <VBalanceBar dr={tDr} cr={tCr} cur={cur} emptyText="Pick the sales + purchase invoices and enter the figures"/>

        {/* Gross Profit cards */}
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
          <div style={{flex:1,minWidth:160,...card,padding:"12px 16px",background:"#f3f4f8"}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:".6px",color:"#5a6691",textTransform:"uppercase"}}>Gross Profit (Service + Markup − Supplier Svc)</div>
            <div style={{fontSize:18,fontWeight:800,color:gp<0?"#A32D2D":"#1B6B4C",marginTop:3,fontVariantNumeric:"tabular-nums"}}>{vf2(cur,gp)}</div>
          </div>
          <div style={{flex:1,minWidth:160,...card,padding:"12px 16px",background:"#f3f4f8"}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:".6px",color:"#5a6691",textTransform:"uppercase"}}>GP % <span style={{textTransform:"none",fontWeight:400}}>(on {isRefund?"supplier refund":"total billed"})</span></div>
            <div style={{fontSize:18,fontWeight:800,color:"#A07828",marginTop:3,fontVariantNumeric:"tabular-nums"}}>{gpPct.toFixed(2)}%</div>
          </div>
        </div>

        <FL label="Narration"><textarea value={narration} onChange={e=>setNarration(e.target.value)} rows={2} style={{...inp,resize:"vertical",marginBottom:12}} placeholder={selInv?`Being ${kind} of ${module.toLowerCase()} booking ${ref1||selInv.vno} against ${selInv.vno}`:`Being ${kind} processed for the selected ${module.toLowerCase()} booking`}/></FL>

        <VSaveMsg m={post} okText={`✔ ${title} ${vNo} posted · ${isRefund?`${customerName} refunded ${vf2(cur,custRefund)}`:`${customerName} billed ${vf2(cur,custBill)}`} · against ${selInv?.vno||""} · books refreshed`}/>
        {chargesExceed&&<div style={{padding:"8px 12px",borderRadius:8,background:"#FCEBEB",fontSize:10.5,color:"#A32D2D",fontWeight:600,textAlign:"center",marginBottom:8}}>⚠ Your service charge + markup (+GST) exceed the supplier refund — the customer cannot be refunded a negative amount.</div>}
        {!brPost&&<div style={{padding:"8px 12px",borderRadius:8,background:"#FAEEDA",fontSize:10.5,color:"#854F0B",fontWeight:600,textAlign:"center",marginBottom:8}}>Select a specific branch (not “All”) to post this voucher.</div>}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={reset} style={btnGh}>Reset</button>
          <button onClick={doSave} disabled={!canPost} style={{...btnG,background:canPost?accent:"#bfc3d6",opacity:canPost?1:0.55}}>
            {isRefund?"💳":"🔄"} Save {title} {post.isPending?"…":!selInv?"(Pick Sales Invoice)":!selPur?"(Pick Purchase Invoice)":chargesExceed?"(Charges Exceed Refund)":!amountsOk?"(Enter Amounts)":""}
          </button>
        </div>
      </div>
    </VWrap>
  );
}

// One calculation row inside the Refund / Reissue calc grid.
function RRLine({label,sub,children,derived}){
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"7px 0",borderBottom:".5px solid #f3f4f8"}}>
      <label style={{fontSize:11.5,fontWeight:600,color:derived?"#5a6691":"#3A3A3A"}}>{label}<span style={{display:"block",fontSize:9.5,fontWeight:400,color:"#9A9A9A",marginTop:1}}>{sub}</span></label>
      <div style={{width:128,flexShrink:0}}>{children}</div>
    </div>
  );
}


/* ── PURCHASE: FLIGHT TICKETS ────────────────────────────── */

export function PurchaseFlight({branch,setRoute}){
  const vNo=useVNo(branch,"PF");
  const [pax,setPax]=useState([
    {id:1,name:"Mr. Rajiv Sharma",ticket:"098-2156789012",airline:"Air India",sector:"BOM-DXB",cls:"Economy",date:"2026-05-28",base:18500,k3:2200,otherTax:1600},
    {id:2,name:"Mrs. Rohan",ticket:"098-2156789013",airline:"Air India",sector:"BOM-DXB",cls:"Economy",date:"2026-05-28",base:18500,k3:2200,otherTax:1600},
  ]);
  const [tripType,setTripType]=useState("International"); // International | Domestic
  const [irn,setIrn]=useState("f6e5d4c3b2a1987654321fedcba9876543210abcdef1234567890abcdef98765");
  const [terms,setTerms]=useState("1. Supplier invoice subject to BSP weekly settlement timelines.\n2. Refunds processed only after airline credits the BSP ARC report.\n3. ADM/ACM raised by airline will be passed on without markup.\n4. Tickets governed by airline's published conditions of carriage.\n5. Disputes to be raised within 7 days of BSP report.");
  const [qrFile,setQrFile]=useState(null);
  const upd=(id,k,v)=>setPax(ps=>ps.map(p=>p.id===id?{...p,[k]:v}:p));
  const add=()=>setPax(ps=>[...ps,{id:Date.now(),name:"",ticket:"",airline:"",sector:"",cls:"Economy",date:"",base:0,k3:0,otherTax:0}]);
  const rm=id=>setPax(ps=>ps.filter(p=>p.id!==id));
  const totalBase=pax.reduce((s,p)=>s+(+p.base||0),0);
  const totalK3=pax.reduce((s,p)=>s+(+p.k3||0),0);
  const totalOther=pax.reduce((s,p)=>s+(+p.otherTax||0),0);
  const totalTax=totalK3+totalOther;
  const total=+(totalBase+totalTax).toFixed(2);
  const isIntl=tripType==="International";
  return (
    <VWrap title="Purchase Voucher — Flight Tickets" icon="✈" vNo={vNo} branch={branch} type="purchase" setRoute={setRoute}>
      <VHead vNo={vNo}/>

      {/* Trip type + IRN strip */}
      <div style={{padding:"10px 16px",background:"#0d1326",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",gap:0,borderRadius:999,overflow:"hidden",border:"1px solid #2a3450"}}>
            <button onClick={()=>setTripType("Domestic")}
              style={{padding:"5px 12px",fontSize:10,fontWeight:700,cursor:"pointer",border:"none",
                background:tripType==="Domestic"?"#27500A":"transparent",
                color:tripType==="Domestic"?"#fff":"#8b94b3"}}>
              🇮🇳 Domestic
            </button>
            <button onClick={()=>setTripType("International")}
              style={{padding:"5px 12px",fontSize:10,fontWeight:700,cursor:"pointer",border:"none",
                background:tripType==="International"?"#185FA5":"transparent",
                color:tripType==="International"?"#fff":"#8b94b3"}}>
              🌍 International
            </button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:280}}>
            <label style={{fontSize:9.5,color:"#8b94b3",fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",whiteSpace:"nowrap"}}>IRN No.</label>
            <input value={irn} onChange={e=>setIrn(e.target.value)}
              style={{flex:1,minWidth:240,padding:"6px 10px",borderRadius:6,border:"1px solid #2a3450",
                background:"#1a2238",color:"#d4a437",fontFamily:"monospace",fontSize:10.5,fontWeight:600}}/>
            <span style={{fontSize:9,padding:"3px 9px",borderRadius:999,background:"#d4a437",color:"#0d1326",fontWeight:700,whiteSpace:"nowrap"}}>
              e-Invoice IRN
            </span>
          </div>
        </div>
      </div>

      <VParty branch={branch} label="Supplier" name="BSP India (IATA)" gstin="07AABSB5678C1Z9"/>
      <ARow label="Ticket cost details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:960}}>
          <thead><tr>
            {["#","Passenger","Ticket no.","Airline","Sector","Class","Date","Base cost ₹","K3 ₹","Taxes ₹","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=7&&i<=10}/>)}
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
              <td style={{padding:3}}><input type="number" value={p.k3} onChange={e=>upd(p.id,"k3",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}} title="K3 tax (GST on airline tax — typically applicable on international tickets)"/></td>
              <td style={{padding:3}}><input type="number" value={p.otherTax} onChange={e=>upd(p.id,"otherTax",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}} title="Taxes — YQ/YR fuel, airport fees, UDF, PSF"/></td>
              <VTD c={fmt((+p.base||0)+(+p.k3||0)+(+p.otherTax||0))} r/>
              <DBtn fn={()=>rm(p.id)}/>
            </tr>
          ))}</tbody>
          <tfoot>
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
              <td colSpan={7} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(totalBase)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#854F0B"}}>{fmt(totalK3)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#854F0B"}}>{fmt(totalOther)}</td>
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
            {isIntl
              ?"International ticket — K3 (GST on airline tax) appears on supplier BSP invoice and is input-creditable. Other taxes (YQ/YR, UDF, PSF) are non-creditable pass-through."
              :"Domestic ticket — K3 generally nil. Input GST applies only on GDS / agency service fees, not on base fare or airline taxes."}
          </div>
        </div>
      </div>

      {/* Terms & GST QR upload */}
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:14}}>
          <FL label="Terms & Conditions">
            <textarea rows={5} value={terms} onChange={e=>setTerms(e.target.value)} style={{...inp,resize:"vertical",fontSize:10.5,lineHeight:1.45}}/>
          </FL>
          <div>
            <label style={{fontSize:10,color:"#5a6691",fontWeight:600,letterSpacing:"0.4px",textTransform:"uppercase"}}>GST QR Code</label>
            <div style={{marginTop:4,padding:"10px 12px",border:"2px dashed #c7cbe0",borderRadius:8,background:"#fff",
              display:"flex",alignItems:"center",gap:11,flexWrap:"wrap"}}>
              {qrFile
                ?<>
                  <div style={{width:54,height:54,borderRadius:6,background:"#f3f4f8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,border:"1px solid #e1e3ec"}}>▦</div>
                  <div style={{flex:1,minWidth:140}}>
                    <p style={{margin:0,fontSize:11,fontWeight:700,color:"#0d1326"}}>{qrFile.name}</p>
                    <p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691"}}>{(qrFile.size/1024).toFixed(1)} KB · uploaded</p>
                  </div>
                  <button onClick={()=>setQrFile(null)} style={{...btnGh,fontSize:10,padding:"4px 10px",color:"#A32D2D",borderColor:"#A32D2D"}}>Remove</button>
                </>
                :<>
                  <div style={{width:54,height:54,borderRadius:6,background:"#f3f4f8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#8b94b3",border:"1px solid #e1e3ec"}}>▦</div>
                  <div style={{flex:1,minWidth:140}}>
                    <p style={{margin:0,fontSize:11,fontWeight:600,color:"#0d1326"}}>Upload supplier GST QR code</p>
                    <p style={{margin:"2px 0 0",fontSize:9.5,color:"#5a6691"}}>PNG / JPG · signed QR from BSP / airline e-invoice</p>
                  </div>
                  <label style={{...btnGh,fontSize:10,padding:"5px 12px",cursor:"pointer",display:"inline-block"}}>
                    Choose file
                    <input type="file" accept="image/png,image/jpeg" style={{display:"none"}}
                      onChange={e=>{const f=e.target.files?.[0];if(f)setQrFile(f);}}/>
                  </label>
                </>
              }
            </div>
          </div>
        </div>
      </div>

      <VNarr def={`Being air ticket cost purchased via BSP — ${tripType}, 2 pax Economy, departure 28 May 2026.`}>
        <VTot branch={branch}
          lines={[
            {l:"Net ticket cost (base fare)",v:"₹ "+fmt(totalBase)},
            {l:"K3 tax",v:"₹ "+fmt(totalK3)},
            {l:"Other taxes & surcharges",v:"₹ "+fmt(totalOther)},
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
  const [dmc,setDmc]=useState("Bali Tours DMC");
  const [pkg,setPkg]=useState("Bali Land Package 7N/8D");
  const [dest,setDest]=useState("Bali, Indonesia");
  const [pax,setPax]=useState(2);
  const [dept,setDept]=useState("2026-06-10");
  const [rtrn,setRtrn]=useState("2026-06-17");
  const [pkgType,setPkgType]=useState("International"); // International | Domestic
  const [basic,setBasic]=useState({desc:"Bali land package — hotel + transfers (7N/8D)",sac:"998552",amt:140000});
  const [service,setService]=useState({desc:"DMC handling + guide + sightseeing",sac:"998555",amt:18000});
  const updBasic=(k,v)=>setBasic(b=>({...b,[k]:v}));
  const updService=(k,v)=>setService(s=>({...s,[k]:v}));

  const basicAmt=+basic.amt||0;
  const serviceAmt=+service.amt||0;
  const subTotal=basicAmt+serviceAmt;
  const gstAmt=+(subTotal*0.05).toFixed(2);
  const isIntl=pkgType==="International";
  const tcsAmt=isIntl?+((subTotal+gstAmt)*0.02).toFixed(2):0;
  const grandTotal=+(subTotal+gstAmt+tcsAmt).toFixed(2);

  return (
    <VWrap title="Purchase Voucher — Holiday Packages" icon="🌴" vNo={vNo} branch={branch} type="purchase" setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} label="DMC / Supplier" name={dmc} gstin=""/>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:11,padding:"10px 16px 12px"}}>
        <FL label="DMC / Supplier"><input value={dmc} onChange={e=>setDmc(e.target.value)} style={inp}/></FL>
        <FL label="Package name"><input value={pkg} onChange={e=>setPkg(e.target.value)} style={inp}/></FL>
        <FL label="Destination"><input value={dest} onChange={e=>setDest(e.target.value)} style={inp}/></FL>
        <FL label="No. of pax"><input type="number" value={pax} onChange={e=>setPax(+e.target.value||1)} style={inp}/></FL>
        <FL label="Departure date"><input type="date" value={dept} onChange={e=>setDept(e.target.value)} style={inp}/></FL>
        <FL label="Return date"><input type="date" value={rtrn} onChange={e=>setRtrn(e.target.value)} style={inp}/></FL>
      </div>

      {/* Package Type selector */}
      <div style={{margin:"0 16px 14px",padding:"12px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775"}}>
        <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#854F0B"}}>Package Type</p>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <button onClick={()=>setPkgType("Domestic")} style={{flex:1,padding:"8px 12px",borderRadius:8,cursor:"pointer",
            background:pkgType==="Domestic"?"#27500A":"#fff",color:pkgType==="Domestic"?"#fff":"#27500A",
            border:"2px solid #27500A",fontSize:11,fontWeight:600}}>
            Domestic — GST 5% only (No TCS)
          </button>
          <button onClick={()=>setPkgType("International")} style={{flex:1,padding:"8px 12px",borderRadius:8,cursor:"pointer",
            background:pkgType==="International"?"#185FA5":"#fff",color:pkgType==="International"?"#fff":"#185FA5",
            border:"2px solid #185FA5",fontSize:11,fontWeight:600}}>
            International — GST 5% + TCS 2%
          </button>
        </div>
        <p style={{margin:0,fontSize:10,color:"#854F0B"}}>
          {isIntl
            ?"INTERNATIONAL outbound package — GST 5% on (Basic + Service) and TCS 2% on (Basic + Service + GST). Verify supplier TCS certificate."
            :"DOMESTIC package — GST 5% on (Basic + Service). No TCS applicable."}
        </p>
      </div>

      {/* Component breakout — fixed GL rows */}
      <p style={{margin:"0 16px 8px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Package Component Breakout <span style={{fontSize:9.5,color:"#5a6691"}}>(Basic + Service → GST 5% → TCS 2% if international)</span></p>
      <div style={{margin:"0 16px",...card,padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["S.NO","GL Name","Description","SAC Code","Cost Price"].map((h,i)=>(
                <th key={i} style={{padding:"8px 10px",textAlign:i===4?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              <tr style={{borderBottom:"1px solid #f3f4f8",background:"#fff"}}>
                <td style={{padding:"4px 10px",textAlign:"center",color:"#5a6691",fontSize:10}}>1</td>
                <td style={{padding:"4px 10px",fontWeight:700,color:"#0d1326",fontSize:11}}>Basic</td>
                <td style={{padding:"3px 6px"}}><input value={basic.desc} onChange={e=>updBasic("desc",e.target.value)} style={{...inp,minHeight:28,fontSize:10.5,minWidth:200}}/></td>
                <td style={{padding:"3px 6px"}}><input value={basic.sac} onChange={e=>updBasic("sac",e.target.value)} style={{...inp,minHeight:28,fontSize:10,fontFamily:"monospace",width:90}}/></td>
                <td style={{padding:"3px 6px"}}><input type="number" value={basic.amt} onChange={e=>updBasic("amt",+e.target.value)} style={{...inp,minHeight:28,textAlign:"right",fontSize:11,fontWeight:600,color:"#A32D2D"}}/></td>
              </tr>
              <tr style={{borderBottom:"1px solid #f3f4f8",background:"#fafafa"}}>
                <td style={{padding:"4px 10px",textAlign:"center",color:"#5a6691",fontSize:10}}>2</td>
                <td style={{padding:"4px 10px",fontWeight:700,color:"#0d1326",fontSize:11}}>Service</td>
                <td style={{padding:"3px 6px"}}><input value={service.desc} onChange={e=>updService("desc",e.target.value)} style={{...inp,minHeight:28,fontSize:10.5,minWidth:200}}/></td>
                <td style={{padding:"3px 6px"}}><input value={service.sac} onChange={e=>updService("sac",e.target.value)} style={{...inp,minHeight:28,fontSize:10,fontFamily:"monospace",width:90}}/></td>
                <td style={{padding:"3px 6px"}}><input type="number" value={service.amt} onChange={e=>updService("amt",+e.target.value)} style={{...inp,minHeight:28,textAlign:"right",fontSize:11,fontWeight:600,color:"#A32D2D"}}/></td>
              </tr>
              <tr style={{borderBottom:"1px solid #e1e3ec",background:"#f3f4f8"}}>
                <td style={{padding:"6px 10px",textAlign:"center",color:"#0d1326",fontSize:10,fontWeight:700}}>3</td>
                <td style={{padding:"6px 10px",fontWeight:800,color:"#0d1326",fontSize:11.5}}>Total</td>
                <td style={{padding:"6px 10px",fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>Basic + Service</td>
                <td style={{padding:"6px 10px"}}></td>
                <td style={{padding:"6px 10px",textAlign:"right",fontWeight:800,fontSize:12,color:"#0d1326",fontVariantNumeric:"tabular-nums"}}>{fmt(subTotal)}</td>
              </tr>
              <tr style={{borderBottom:"1px solid #f3f4f8",background:"#fff"}}>
                <td style={{padding:"6px 10px",textAlign:"center",color:"#854F0B",fontSize:10,fontWeight:700}}>4</td>
                <td style={{padding:"6px 10px",fontWeight:700,color:"#854F0B",fontSize:11}}>GST (5%)</td>
                <td style={{padding:"6px 10px",fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>5% on (Basic + Service)</td>
                <td style={{padding:"6px 10px",fontSize:10,fontFamily:"monospace",color:"#5a6691"}}>—</td>
                <td style={{padding:"6px 10px",textAlign:"right",fontWeight:700,fontSize:11.5,color:"#854F0B",fontVariantNumeric:"tabular-nums"}}>{fmt(gstAmt)}</td>
              </tr>
              <tr style={{borderBottom:"1px solid #f3f4f8",background:"#fafafa",opacity:isIntl?1:0.45}}>
                <td style={{padding:"6px 10px",textAlign:"center",color:"#185FA5",fontSize:10,fontWeight:700}}>5</td>
                <td style={{padding:"6px 10px",fontWeight:700,color:"#185FA5",fontSize:11}}>TCS (2%) {!isIntl&&<span style={{fontSize:9,color:"#5a6691",fontWeight:500}}>— N/A (Domestic)</span>}</td>
                <td style={{padding:"6px 10px",fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>2% on (Basic + Service + GST) — international only</td>
                <td style={{padding:"6px 10px",fontSize:10,fontFamily:"monospace",color:"#5a6691"}}>—</td>
                <td style={{padding:"6px 10px",textAlign:"right",fontWeight:700,fontSize:11.5,color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>{fmt(tcsAmt)}</td>
              </tr>
            </tbody>
            <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
              <td colSpan={4} style={{padding:"8px 10px",fontWeight:800,color:"#d4a437",fontSize:11.5}}>Grand Total ({pkgType})</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,color:"#d4a437",fontSize:13,fontVariantNumeric:"tabular-nums"}}>{fmt(grandTotal)}</td>
            </tr></tfoot>
          </table>
        </div>
      </div>

      <div style={{padding:"0 16px 12px"}}>
        <div style={{padding:"8px 12px",background:"#E6F1FB",borderRadius:8,fontSize:11.5,color:"#185FA5"}}>
          Accounting: <b>Dr Tour Package Purchase</b> &nbsp;|&nbsp; <b>Dr Input GST 5%</b> {isIntl&&<>&nbsp;|&nbsp; <b>Dr TCS Receivable</b></>} &nbsp;|&nbsp; <b>Cr {dmc||"DMC / Supplier"} ledger</b>.
        </div>
      </div>

      <VNarr def={`Being ${pkg||"holiday package"} purchase (${pkgType}) from ${dmc} — ${pax} pax, departure ${dept}. GST 5% on Basic+Service${isIntl?", TCS 2% on Basic+Service+GST":""}.`}>
        <VTot branch={branch}
          lines={[
            {l:"Basic",v:"₹ "+fmt(basicAmt)},
            {l:"Service",v:"₹ "+fmt(serviceAmt)},
            {l:"Total (Basic + Service)",v:"₹ "+fmt(subTotal)},
            {l:"GST 5%",v:"₹ "+fmt(gstAmt)},
            ...(isIntl?[{l:"TCS 2% (International)",v:"₹ "+fmt(tcsAmt)}]:[]),
          ]}
          total={grandTotal}
        />
      </VNarr>
    </VWrap>
  );
}

/* ── PURCHASE: HOTELS ────────────────────────────────────── */

export function PurchaseHotelVoucher({branch,setRoute}){
  const vNo=useVNo(branch,"PHT");
  const [rows,setRows]=useState([
    {id:1,passenger:"Mr. Rajiv Sharma",ci:"2026-06-05",co:"2026-06-08",rtype:"Deluxe King",meal:"CP",basic:20000,taxes:2400,otherTax:500},
  ]);
  const [svc,setSvc]=useState(0);
  const [partyGstin,setPartyGstin]=useState("24AABCH7890J1Z5");
  const intra=(partyGstin||"").trim().slice(0,2)==="27";
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),passenger:"",ci:"",co:"",rtype:"Deluxe",meal:"EP",basic:0,taxes:0,otherTax:0}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));

  const totBasic=rows.reduce((s,r)=>s+(+r.basic||0),0);
  const totTaxes=rows.reduce((s,r)=>s+(+r.taxes||0),0);
  const totOther=rows.reduce((s,r)=>s+(+r.otherTax||0),0);
  const subTable=totBasic+totTaxes+totOther;
  const gstFull=+(svc*0.18).toFixed(2);
  const cgst=intra?+(svc*0.09).toFixed(2):0;
  const sgst=intra?+(svc*0.09).toFixed(2):0;
  const igst=intra?0:gstFull;
  const total=+(subTable+svc+gstFull).toFixed(2);

  return (
    <VWrap title="Purchase Voucher — Hotels" icon="🏨" vNo={vNo} branch={branch} type="purchase" setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} label="Hotel / Supplier" name="Hyatt Regency Ahmedabad" gstin={partyGstin} onGstinChange={setPartyGstin}/>
      <div style={{padding:"8px 16px",borderBottom:"1px solid #e1e3ec",background:"#f9fafb",display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
        <span style={{fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Demo presets</span>
        <button onClick={()=>setPartyGstin("27AABCH1234M1Z2")}
          style={{padding:"4px 11px",borderRadius:999,border:"1px solid "+(intra?"#27500A":"#c7cbe0"),
            background:intra?"#27500A":"#fff",color:intra?"#fff":"#27500A",fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
          Intra-state · Mumbai supplier (27)
        </button>
        <button onClick={()=>setPartyGstin("24AABCH7890J1Z5")}
          style={{padding:"4px 11px",borderRadius:999,border:"1px solid "+(!intra?"#185FA5":"#c7cbe0"),
            background:!intra?"#185FA5":"#fff",color:!intra?"#fff":"#185FA5",fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
          Inter-state · Gujarat supplier (24)
        </button>
        <span style={{fontSize:10,color:"#5a6691",marginLeft:"auto"}}>Click a preset to flip supplier GSTIN and watch Input CGST/SGST become Input IGST.</span>
      </div>
      <ARow label="Hotel purchase lines" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:960}}>
          <thead><tr>
            {["#","Passenger Name","Check-in","Check-out","Room type","Meal","Room fare / Basic fare ₹","Taxes ₹","Other tax ₹","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=6&&i<=9}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const lineTotal=(+r.basic||0)+(+r.taxes||0)+(+r.otherTax||0);
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.passenger} onChange={e=>upd(r.id,"passenger",e.target.value)} style={{...inp,minHeight:28,fontSize:11,minWidth:160}}/></td>
                <td style={{padding:3}}><input type="date" value={r.ci} onChange={e=>upd(r.id,"ci",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input type="date" value={r.co} onChange={e=>upd(r.id,"co",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input value={r.rtype} onChange={e=>upd(r.id,"rtype",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}>
                  <select value={r.meal} onChange={e=>upd(r.id,"meal",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}>
                    <option>EP</option><option>CP</option><option>MAP</option><option>AP</option>
                  </select>
                </td>
                <td style={{padding:3}}><input type="number" value={r.basic} onChange={e=>upd(r.id,"basic",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
                <td style={{padding:3}}><input type="number" value={r.taxes} onChange={e=>upd(r.id,"taxes",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}} title="GST / occupancy / luxury tax on the supplier invoice"/></td>
                <td style={{padding:3}}><input type="number" value={r.otherTax} onChange={e=>upd(r.id,"otherTax",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}} title="City fee, resort fee, tourism levy, destination tax"/></td>
                <VTD c={fmt(lineTotal)} r/>
                <DBtn fn={()=>rm(r.id)}/>
              </tr>
            );
          })}</tbody>
          <tfoot>
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
              <td colSpan={6} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(totBasic)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#854F0B"}}>{fmt(totTaxes)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#854F0B"}}>{fmt(totOther)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#185FA5"}}>{fmt(subTable)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label={bc(branch).cur+"Service charge"}>
            <input type="number" value={svc} onChange={e=>setSvc(+e.target.value||0)} style={{...inp,textAlign:"right"}}/>
          </FL>
          {intra
            ?<>
              <FL label="Input CGST 9% ₹"><input value={fmt(cgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
              <FL label="Input SGST 9% ₹"><input value={fmt(sgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
            </>
            :<FL label="Input IGST 18% ₹"><input value={fmt(igst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>}
        </div>
        <div style={{marginTop:9,padding:"8px 12px",background:"#EAF3DE",borderRadius:8,fontSize:11.5,color:"#27500A"}}>
          Accounting: <b>Dr Hotel Purchase</b> &nbsp;|&nbsp; <b>Dr Input GST</b> (from Taxes column + 18% on service charge) &nbsp;|&nbsp; <b>Cr Hotel / Supplier ledger</b>. {intra?"Intra-state (27): CGST 9% + SGST 9% on service charge.":"Inter-state (state ≠ 27): IGST 18% on service charge."} ITC on hotel stays claimable only for business travel.
        </div>
      </div>
      <VNarr def="Being hotel room charges — Hyatt Regency Ahmedabad, 5-8 June 2026, with input GST claim.">
        <VTot branch={branch}
          lines={[
            {l:"Room fare / Basic fare",v:"₹ "+fmt(totBasic)},
            {l:"Taxes",v:"₹ "+fmt(totTaxes)},
            {l:"Other tax",v:"₹ "+fmt(totOther)},
            {l:"Service charge",v:"₹ "+fmt(svc)},
            ...(intra
              ?[{l:"Input CGST 9%",v:"₹ "+fmt(cgst)},{l:"Input SGST 9%",v:"₹ "+fmt(sgst)}]
              :[{l:"Input IGST 18%",v:"₹ "+fmt(igst)}]),
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
    {id:1,name:"Rajiv Sharma",pp:"Z1234567",country:"UAE",vtype:"Tourist 30D",vfsFee:1500,taxes:270,otherTax:100},
    {id:2,name:"Rohan",pp:"Z1234568",country:"UAE",vtype:"Tourist 30D",vfsFee:1500,taxes:270,otherTax:100},
  ]);
  const [svc,setSvc]=useState(1500);
  const [partyGstin,setPartyGstin]=useState("27AABVV4321F1Z6");
  const intra=(partyGstin||"").trim().slice(0,2)==="27";
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),name:"",pp:"",country:"",vtype:"",vfsFee:0,taxes:0,otherTax:0}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));

  const vfsTotal=rows.reduce((s,r)=>s+(+r.vfsFee||0),0);
  const taxesTotal=rows.reduce((s,r)=>s+(+r.taxes||0),0);
  const otherTotal=rows.reduce((s,r)=>s+(+r.otherTax||0),0);
  const gstFull=+(svc*0.18).toFixed(2);
  const cgst=intra?+(svc*0.09).toFixed(2):0;
  const sgst=intra?+(svc*0.09).toFixed(2):0;
  const igst=intra?0:gstFull;
  const total=+(vfsTotal+taxesTotal+otherTotal+svc+gstFull).toFixed(2);

  return (
    <VWrap title="Purchase Voucher — Visas" icon="🛂" vNo={vNo} branch={branch} type="purchase" setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} label="Primary Supplier" name="VFS Global Services" gstin={partyGstin} onGstinChange={setPartyGstin}/>
      <div style={{padding:"8px 16px",borderBottom:"1px solid #e1e3ec",background:"#f9fafb",display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
        <span style={{fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Demo presets</span>
        <button onClick={()=>setPartyGstin("27AABVV4321F1Z6")}
          style={{padding:"4px 11px",borderRadius:999,border:"1px solid "+(intra?"#27500A":"#c7cbe0"),
            background:intra?"#27500A":"#fff",color:intra?"#fff":"#27500A",fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
          Intra-state · Mumbai supplier (27)
        </button>
        <button onClick={()=>setPartyGstin("07AABVV9988N1Z4")}
          style={{padding:"4px 11px",borderRadius:999,border:"1px solid "+(!intra?"#185FA5":"#c7cbe0"),
            background:!intra?"#185FA5":"#fff",color:!intra?"#fff":"#185FA5",fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
          Inter-state · Delhi supplier (07)
        </button>
        <span style={{fontSize:10,color:"#5a6691",marginLeft:"auto"}}>Click a preset to flip supplier GSTIN and watch Input CGST/SGST become Input IGST.</span>
      </div>
      <ARow label="Visa fee payment lines" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:880}}>
          <thead><tr>
            {["#","Applicant","Passport","Visa country","Visa type","VFS fee ₹","Taxes ₹","Other taxes ₹","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=5&&i<=8}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const lineTotal=(+r.vfsFee||0)+(+r.taxes||0)+(+r.otherTax||0);
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.name} onChange={e=>upd(r.id,"name",e.target.value)} style={{...inp,minHeight:28,fontSize:11,minWidth:150}}/></td>
                <td style={{padding:3}}><input value={r.pp} onChange={e=>upd(r.id,"pp",e.target.value.toUpperCase())} style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace",width:100}}/></td>
                <td style={{padding:3}}><input value={r.country} onChange={e=>upd(r.id,"country",e.target.value)} style={{...inp,minHeight:28,fontSize:11,width:90}}/></td>
                <td style={{padding:3}}><input value={r.vtype} onChange={e=>upd(r.id,"vtype",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><input type="number" value={r.vfsFee} onChange={e=>upd(r.id,"vfsFee",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:90}}/></td>
                <td style={{padding:3}}><input type="number" value={r.taxes} onChange={e=>upd(r.id,"taxes",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:80}} title="GST / VAT on VFS fee — appears on supplier invoice"/></td>
                <td style={{padding:3}}><input type="number" value={r.otherTax} onChange={e=>upd(r.id,"otherTax",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:80}} title="Service tax, biometric, courier — non-creditable"/></td>
                <VTD c={fmt(lineTotal)} r/>
                <DBtn fn={()=>rm(r.id)}/>
              </tr>
            );
          })}</tbody>
          <tfoot>
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
              <td colSpan={5} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(vfsTotal)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#854F0B"}}>{fmt(taxesTotal)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#854F0B"}}>{fmt(otherTotal)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#185FA5"}}>{fmt(total)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label={bc(branch).cur+"Service charge"}>
            <input type="number" value={svc} onChange={e=>setSvc(+e.target.value||0)} style={{...inp,textAlign:"right"}}/>
          </FL>
          {intra
            ?<>
              <FL label="CGST 9% ₹"><input value={fmt(cgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
              <FL label="SGST 9% ₹"><input value={fmt(sgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
            </>
            :<FL label="IGST 18% ₹"><input value={fmt(igst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>}
        </div>
        <div style={{marginTop:9,padding:"8px 12px",background:"#E6F1FB",borderRadius:8,fontSize:11.5,color:"#185FA5"}}>
          Accounting: <b>Dr Visa Fee Expense</b> &nbsp;|&nbsp; <b>Dr Input GST</b> (from Taxes column + 18% on service charge) &nbsp;|&nbsp; <b>Cr VFS / Supplier ledger</b>. {intra?"Intra-state (27): CGST 9% + SGST 9% on service charge.":"Inter-state (state ≠ 27): IGST 18% on service charge."} Other taxes (biometric, courier) are non-creditable pass-through.
        </div>
      </div>
      <VNarr def="Being visa fees paid to VFS Global — 2 applicants, UAE Tourist 30D, pass-through recovery from the customer.">
        <VTot branch={branch}
          lines={[
            {l:"VFS fee",v:"₹ "+fmt(vfsTotal)},
            {l:"Taxes",v:"₹ "+fmt(taxesTotal)},
            {l:"Other taxes",v:"₹ "+fmt(otherTotal)},
            {l:"Service charge",v:"₹ "+fmt(svc)},
            ...(intra
              ?[{l:"CGST 9%",v:"₹ "+fmt(cgst)},{l:"SGST 9%",v:"₹ "+fmt(sgst)}]
              :[{l:"IGST 18%",v:"₹ "+fmt(igst)}]),
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
  const [row,setRow]=useState({vendor:"Riya Travels Mumbai",vehicle:"Toyota Innova Crysta",pickup:"BOM T2",drop:"Pune Station",days:1,basic:4500,otherFare:500,svc:0});
  const [partyGstin,setPartyGstin]=useState("27AAACR1234R1Z0");
  const intra=(partyGstin||"").trim().slice(0,2)==="27";
  const upd=(k,v)=>setRow(r=>({...r,[k]:v}));
  const sub=(+row.basic||0)+(+row.otherFare||0)+(+row.svc||0);
  const gstFull=+(sub*0.05).toFixed(2);
  const inputCgst=intra?+(sub*0.025).toFixed(2):0;
  const inputSgst=intra?+(sub*0.025).toFixed(2):0;
  const inputIgst=intra?0:gstFull;
  const total=+(sub+gstFull).toFixed(2);
  return (
    <VWrap title="Purchase Voucher — Car Rentals" icon="🚗" vNo={vNo} branch={branch} type="purchase" setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} label="Supplier / Transport Co." name={row.vendor} gstin={partyGstin} onGstinChange={setPartyGstin}/>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <p style={{margin:"0 0 8px",fontSize:10,color:"#5a6691",textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:600}}>Vehicle hire details</p>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:880}}>
          <thead><tr>
            {["#","Vendor","Vehicle","Pickup","Drop","Days","Basic ₹","Other fare ₹","Service charge ₹","Total ₹"].map((h,i)=><VTH key={i} c={h} r={i>=5&&i<=9}/>)}
          </tr></thead>
          <tbody>
            <tr style={{borderBottom:"1px solid #e1e3ec"}}>
              <VTD c={1}/>
              <td style={{padding:3}}><input value={row.vendor} onChange={e=>upd("vendor",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}>
                <input value={row.vehicle} onChange={e=>upd("vehicle",e.target.value)} style={{...inp,minHeight:28,fontSize:11}} title="Vehicle type / model"/>
              </td>
              <td style={{padding:3}}><input value={row.pickup} onChange={e=>upd("pickup",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={row.drop} onChange={e=>upd("drop",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input type="number" value={row.days} onChange={e=>upd("days",+e.target.value||1)} style={{...inp,minHeight:28,fontSize:11,width:60,textAlign:"right"}}/></td>
              <td style={{padding:3}}><input type="number" value={row.basic} onChange={e=>upd("basic",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}} title="Basic hire charges on supplier invoice"/></td>
              <td style={{padding:3}}><input type="number" value={row.otherFare} onChange={e=>upd("otherFare",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}} title="Toll, parking, extra km, driver allowance"/></td>
              <td style={{padding:3}}><input type="number" value={row.svc} onChange={e=>upd("svc",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}} title="Supplier service / handling charge"/></td>
              <VTD c={fmt(sub)} r/>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label="Input GST rate"><input value={intra?"5% (CGST 2.5% + SGST 2.5%)":"5% (IGST)"} readOnly style={{...inp,background:"#f3f4f8",color:"#5a6691",fontWeight:600,cursor:"not-allowed"}}/></FL>
          {intra
            ?<>
              <FL label="Input CGST 2.5% ₹"><input value={fmt(inputCgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
              <FL label="Input SGST 2.5% ₹"><input value={fmt(inputSgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
            </>
            :<FL label="Input IGST 5% ₹"><input value={fmt(inputIgst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>}
        </div>
        <div style={{marginTop:9,padding:"8px 12px",background:"#EAF3DE",borderRadius:8,fontSize:11.5,color:"#27500A"}}>
          5% GST on (Basic + Other fare + Service charge). {intra?"Intra-state (27): CGST 2.5% + SGST 2.5%.":"Inter-state (state ≠ 27): IGST 5%."} Accounting: <b>Dr Car Hire Expense</b> + <b>Dr Input {intra?"CGST/SGST":"IGST"}</b> | <b>Cr Vendor ledger</b>. TDS 194C: deduct 1% (individual) or 2% (company) above threshold.
        </div>
      </div>
      <VNarr def={`Being car rental charges from ${row.vendor} — ${row.pickup} to ${row.drop}, ${row.days} day(s).`}>
        <VTot branch={branch}
          lines={[
            {l:"Basic",v:"₹ "+fmt(row.basic)},
            {l:"Other fare",v:"₹ "+fmt(row.otherFare)},
            {l:"Service charge",v:"₹ "+fmt(row.svc)},
            ...(intra
              ?[{l:"Input CGST 2.5%",v:"₹ "+fmt(inputCgst)},{l:"Input SGST 2.5%",v:"₹ "+fmt(inputSgst)}]
              :[{l:"Input IGST 5%",v:"₹ "+fmt(inputIgst)}]),
          ]}
          total={total}
        />
      </VNarr>
    </VWrap>
  );
}

/* ── PURCHASE: INSURANCE ─────────────────────────────────── */

export function PurchaseInsurance({branch,setRoute}){
  const vNo=useVNo(branch,"PI");
  const [rows,setRows]=useState([
    {id:1,name:"TATA AIG General Insurance",pp:"Z1234567",dest:"Bali, Indonesia",basic:3500,otherTax:0,svc:200},
    {id:2,name:"TATA AIG General Insurance",pp:"Z1234568",dest:"Bali, Indonesia",basic:3500,otherTax:0,svc:200},
  ]);
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),name:"",pp:"",dest:"",basic:0,otherTax:0,svc:0}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));
  const totBasic=rows.reduce((s,r)=>s+(+r.basic||0),0);
  const totOther=rows.reduce((s,r)=>s+(+r.otherTax||0),0);
  const totSvc=rows.reduce((s,r)=>s+(+r.svc||0),0);
  const taxable=totBasic+totOther+totSvc;
  const inputGst=+(taxable*0.18).toFixed(2);
  const total=+(taxable+inputGst).toFixed(2);
  return (
    <VWrap title="Purchase Voucher — Insurance" icon="🛡" vNo={vNo} branch={branch} type="purchase" setRoute={setRoute}>
      <VHead vNo={vNo}/>
      <VParty branch={branch} label="Insurer / Supplier" name="TATA AIG General Insurance" gstin="27AABCT1234G1Z5"/>
      <ARow label="Policy purchase details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:880}}>
          <thead><tr>
            {["#","Name","Passport","Destination","Basic ₹","Other tax ₹","Service charge ₹","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=4&&i<=7}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const lineTotal=(+r.basic||0)+(+r.otherTax||0)+(+r.svc||0);
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.name} onChange={e=>upd(r.id,"name",e.target.value)} style={{...inp,minHeight:28,fontSize:11,minWidth:180}}/></td>
                <td style={{padding:3}}><input value={r.pp} onChange={e=>upd(r.id,"pp",e.target.value.toUpperCase())} style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace",width:100}}/></td>
                <td style={{padding:3}}><input value={r.dest} onChange={e=>upd(r.id,"dest",e.target.value)} style={{...inp,minHeight:28,fontSize:11,minWidth:130}}/></td>
                <td style={{padding:3}}><input type="number" value={r.basic} onChange={e=>upd(r.id,"basic",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:85}} title="Basic / net premium charged by insurer"/></td>
                <td style={{padding:3}}><input type="number" value={r.otherTax} onChange={e=>upd(r.id,"otherTax",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:80}} title="Stamp duty, levy or other non-creditable tax"/></td>
                <td style={{padding:3}}><input type="number" value={r.svc} onChange={e=>upd(r.id,"svc",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:85}} title="Supplier service / processing charge"/></td>
                <VTD c={fmt(lineTotal)} r/>
                <DBtn fn={()=>rm(r.id)}/>
              </tr>
            );
          })}</tbody>
          <tfoot>
            <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
              <td colSpan={4} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(totBasic)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#854F0B"}}>{fmt(totOther)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#27500A"}}>{fmt(totSvc)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#185FA5"}}>{fmt(taxable)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e1e3ec"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11,marginBottom:9}}>
          <FL label={bc(branch).cur+"Taxable value"}><input value={fmt(taxable)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
          <FL label="Input GST 18% ₹"><input value={fmt(inputGst)} readOnly style={{...inp,textAlign:"right",background:"#f3f4f8",color:"#5a6691"}}/></FL>
          <FL label="Total payable ₹"><input value={fmt(total)} readOnly style={{...inp,textAlign:"right",fontWeight:700,background:"#f3f4f8",color:"#185FA5"}}/></FL>
        </div>
        <div style={{padding:"8px 12px",background:"#EAF3DE",borderRadius:8,fontSize:11.5,color:"#27500A"}}>
          Accounting: <b>Dr Insurance Premium Expense</b> + <b>Dr Input CGST/SGST 9%</b> | <b>Cr Insurer ledger</b>. Input GST 18% (SAC 997131) is creditable when on-billed to the customer.
        </div>
      </div>
      <VNarr def="Being travel insurance premium purchase — 2 pax, Bali destination.">
        <VTot branch={branch}
          lines={[
            {l:"Basic",v:"₹ "+fmt(totBasic)},
            {l:"Other tax",v:"₹ "+fmt(totOther)},
            {l:"Service charge",v:"₹ "+fmt(totSvc)},
            {l:"Input GST 18% (ITC claim)",v:"₹ "+fmt(inputGst)},
          ]}
          total={total}
        />
      </VNarr>
    </VWrap>
  );
}

/* ── PURCHASE: MISCELLANEOUS ─────────────────────────────── */

export function PurchaseMisc({branch,setRoute}){
  const vNo=useVNo(branch,"PM");
  const [rows,setRows]=useState([
    {id:1,vendor:"Airtel Business",gl:"International SIM cards x10",sac:"996429",amt:8500,gstPct:18,tds:false},
    {id:2,vendor:"Singh Stationery",gl:"Office stationery & printing",sac:"996812",amt:3200,gstPct:18,tds:false},
    {id:3,vendor:"M/s Cleantech Services",gl:"Office housekeeping — May",sac:"998531",amt:12000,gstPct:18,tds:true},
  ]);
  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:Date.now(),vendor:"",gl:"",sac:"",amt:0,gstPct:18,tds:false}]);
  const rm=id=>setRows(rs=>rs.filter(r=>r.id!==id));

  const sub=rows.reduce((s,r)=>s+(+r.amt||0),0);
  const inputGst=rows.reduce((s,r)=>s+(+r.amt||0)*(r.gstPct/100),0);
  const tdsAmt=rows.filter(r=>r.tds).reduce((s,r)=>s+(+r.amt||0)*0.02,0);
  const total=+(sub+inputGst).toFixed(2);

  const gstByRate={};
  rows.forEach(r=>{
    const amt=+r.amt||0;
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
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:840}}>
          <thead><tr>
            {["#","Vendor","G.L Name","SAC","Amount ₹","GST %","Input GST ₹","TDS?","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=4&&i<=8}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const amt=+r.amt||0;
            const gst=+(amt*r.gstPct/100).toFixed(2);
            const tdsLine=r.tds?+(amt*0.02).toFixed(2):0;
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #e1e3ec"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.vendor} onChange={e=>upd(r.id,"vendor",e.target.value)} style={{...inp,minHeight:28,fontSize:11,minWidth:160}}/></td>
                <td style={{padding:3}}><input value={r.gl} onChange={e=>upd(r.id,"gl",e.target.value)} style={{...inp,minHeight:28,fontSize:11,minWidth:200}}/></td>
                <td style={{padding:3}}><input value={r.sac} onChange={e=>upd(r.id,"sac",e.target.value)} style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace",width:90}}/></td>
                <td style={{padding:3}}><input type="number" value={r.amt} onChange={e=>upd(r.id,"amt",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
                <td style={{padding:3}}>
                  <select value={r.gstPct} onChange={e=>upd(r.id,"gstPct",+e.target.value)} style={{...inp,minHeight:28,fontSize:11,background:rateBg[r.gstPct],color:rateC[r.gstPct],fontWeight:600,width:75}}>
                    <option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option>
                  </select>
                </td>
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
              <td colSpan={4} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(sub)}</td>
              <td/>
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
  return <NoteVoucher branch={branch} kind="debit"/>;
}

/* ════════════════════════════════════════════════════════════════
   CANCELLATION WORKFLOW  /sales/cancellation
   ════════════════════════════════════════════════════════════════ */

export function SalesCancellation({branch}){
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [cancellations]=useState([]);
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
  const ADM_REASON_CODES=useAdmReasonCodes().data||{};   // DB-backed (/api/adm-reason-codes)
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

  const TODAY=todayISO();
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
                <FL label="Currency"><select value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))} style={inp}>{branchCurrencies(form.branch).map(c=><option key={c}>{c}</option>)}</select></FL>
                <FL label="Branch"><select value={form.branch} onChange={e=>setForm(f=>({...f,branch:e.target.value,currency:branchMainCurrency(e.target.value)}))} style={inp}>{BRANCH_CODES.map(b=><option key={b}>{b}</option>)}</select></FL>
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
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [period,setPeriod]=useState(CUR_MONTH);
  const PERIODS=MONTH_OPTIONS;
  const brCode=branch==="ALL"?null:branch?.code;
  const ADM_REASON_CODES=useAdmReasonCodes().data||{};   // DB-backed (/api/adm-reason-codes)

  /* Selected month → [from, to] date range (1st → last day of month) */
  const [py,pm]=period.split("-").map(Number);
  const from=`${period}-01`;
  const to=`${period}-${String(new Date(py,pm,0).getDate()).padStart(2,"0")}`;

  /* ── LIVE DATA ────────────────────────────────────────────────────
     This page now reads the REAL books instead of the (empty) demo
     arrays it used to filter:
       · BSP Supplier (Sundry Creditor) ledger → outstanding payable +
         every posting against it, from the double-entry engine.
       · Live flight Sales / Purchases         → period settlement maths.
       · ADM / ACM registers                   → debit / credit memos.   */

  // 1) Resolve the BSP supplier ledger from the live chart of accounts.
  //    Prefer a Sundry-Creditor "BSP" ledger; fall back to any BSP ledger.
  const ledgers=useLedgerRegistry(branch).data||[];
  const bspLedger=ledgers.find(l=>/bsp/i.test(l.name||"")&&/credit/i.test(l.group||""))
                ||ledgers.find(l=>/bsp/i.test(l.name||"")&&l.type==="Creditor")
                ||ledgers.find(l=>/bsp/i.test(l.name||""));
  const bspLedgerName=bspLedger?.name||"BSP India (IATA)";

  // 2) BSP supplier ledger statement — authoritative transactions + balance.
  const stmtQ=useLedgerStatement(bspLedgerName,branch,{from,to});
  const stmt=stmtQ.data;
  const stmtLines=stmt?.lines||[];
  // Outstanding payable to BSP: a Creditor balance is naturally Cr (positive).
  const closingPayable=stmt?(stmt.closingSide==="Cr"?stmt.closingBalance:-stmt.closingBalance):0;

  // 3) Live flight sales / purchases for the period settlement computation.
  const sales=useLiveSalesTickets("SF",brCode).filter(s=>s.date>=from&&s.date<=to);
  const purch=useLivePurchaseRegistry("PF",brCode).filter(p=>p.date>=from&&p.date<=to);
  const grossSales=sales.reduce((s,t)=>s+(Number(t.saleAmt)||0),0);
  const ticketCost=purch.reduce((s,p)=>s+(Number(p.amt)||0),0);
  const commission=Math.round(ticketCost*0.02);
  const bspCharge =Math.round(ticketCost*0.0025);

  // 4) ADM / ACM memos for the period (same store the ADM register uses).
  const admList=_ADM_LIST.filter(a=>(!brCode||a.branch===brCode)&&String(a.date||"").startsWith(period)&&(!a.currency||a.currency===cur));
  const acmList=_ACM_LIST.filter(a=>(!brCode||a.branch===brCode)&&String(a.date||"").startsWith(period)&&(!a.currency||a.currency===cur));
  const admTotal=admList.reduce((s,a)=>s+(Number(a.amount)||0),0);
  const acmTotal=acmList.reduce((s,a)=>s+(Number(a.amount)||0),0);
  const netBsp  =ticketCost-commission-bspCharge-admTotal+acmTotal;

  const f=n=>cur+Number(Math.round(n||0)).toLocaleString("en-IN");

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
              Linked to <b style={{color:"#185FA5"}}>{bspLedgerName}</b> ({bspLedger?.group||"Sundry Creditors"}) · Net BSP position from live books
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
          {l:"Ticket Cost (BSP)", v:f(ticketCost), c:"#854F0B",bg:"#FAEEDA"},
          {l:"ADM Debits",        v:f(admTotal),   c:"#A32D2D",bg:"#FCEBEB"},
          {l:"ACM Credits",       v:f(acmTotal),   c:"#1D9E75",bg:"#EAF3DE"},
          {l:"Net Settlement",    v:f(netBsp),     c:netBsp>0?"#27500A":"#A32D2D",bg:netBsp>0?"#EAF3DE":"#FCEBEB"},
          {l:`BSP Payable (${stmt?.closingSide||"Cr"})`, v:f(Math.abs(closingPayable)), c:"#0d1326",bg:"#eef0f6"},
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

      {/* BSP Supplier ledger — live transactions & running balance */}
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{padding:"10px 16px",background:"#0d1326",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:"#d4a437"}}>🔗 BSP Supplier Ledger — {bspLedgerName}</p>
            <p style={{margin:"2px 0 0",fontSize:9.5,color:"#8b93b3"}}>{bspLedger?.group||"Sundry Creditors"} · {stmtLines.length} postings · {from} → {to}</p>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{margin:0,fontSize:9,color:"#8b93b3",textTransform:"uppercase",fontWeight:700}}>Outstanding payable</p>
            <p style={{margin:"2px 0 0",fontSize:16,fontWeight:800,color:closingPayable>=0?"#F7C1C1":"#C0DD97"}}>{f(Math.abs(closingPayable))} {stmt?.closingSide||"Cr"}</p>
          </div>
        </div>
        {stmtQ.isLoading
          ?<div style={{padding:"24px",textAlign:"center",color:"#5a6691",fontSize:12}}>Loading BSP ledger…</div>
          :stmtQ.isError
          ?<div style={{padding:"20px",textAlign:"center",color:"#A32D2D",fontSize:12}}>⚠ Couldn't load BSP ledger — {stmtQ.error?.message||"check your connection"}</div>
          :(<>
            <div style={{padding:"8px 16px",background:"#f3f4f8",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between",fontSize:11,flexWrap:"wrap",gap:6}}>
              <span style={{color:"#5a6691"}}>Opening: {f(stmt?.openingBalance)} {stmt?.openingSide||"Cr"}</span>
              <span style={{color:"#5a6691"}}>Period: Dr {f(stmt?.totalDebit)} · Cr {f(stmt?.totalCredit)}</span>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
                <thead><tr style={{background:"#0d1326"}}>
                  {["Date","Voucher","Particulars","Dr","Cr","Balance"].map((h,i)=>(
                    <th key={i} style={{padding:"8px 12px",textAlign:i>=3?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {stmtLines.length===0&&<tr><td colSpan={6} style={{padding:"24px",textAlign:"center",color:"#5a6691",fontSize:11.5}}>No BSP postings in {PERIODS.find(p=>p.v===period)?.l}. Book a flight purchase or BSP payment against {bspLedgerName}.</td></tr>}
                  {stmtLines.map((e,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"7px 12px",color:"#5a6691",whiteSpace:"nowrap"}}>{e.date}</td>
                      <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{e.vno}</td>
                      <td style={{padding:"7px 12px",color:"#384677"}}>{e.narration||e.party||e.category}</td>
                      <td style={{padding:"7px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:e.debit>0?"#185FA5":"#bfc3d6"}}>{e.debit>0?f(e.debit):"—"}</td>
                      <td style={{padding:"7px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:e.credit>0?"#A32D2D":"#bfc3d6"}}>{e.credit>0?f(e.credit):"—"}</td>
                      <td style={{padding:"7px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:e.balanceSide==="Cr"?"#A32D2D":"#185FA5"}}>{f(Math.abs(e.balance))} {e.balanceSide}</td>
                    </tr>
                  ))}
                </tbody>
                {stmtLines.length>0&&<tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
                  <td colSpan={3} style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",fontSize:12}}>CLOSING — {bspLedgerName}</td>
                  <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(stmt?.totalDebit)}</td>
                  <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(stmt?.totalCredit)}</td>
                  <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(Math.abs(closingPayable))} {stmt?.closingSide||"Cr"}</td>
                </tr></tfoot>}
              </table>
            </div>
          </>)}
      </div>

      {/* ADM/ACM breakdown */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {/* ADMs this period */}
        <div style={{...card}}>
          <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#A32D2D"}}>📩 ADMs This Period</p>
          {admList.length===0
            ?<p style={{margin:0,fontSize:11,color:"#5a6691"}}>No ADMs this period</p>
            :admList.map(a=>(
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
          {acmList.length===0
            ?<p style={{margin:0,fontSize:11,color:"#5a6691"}}>No ACMs this period</p>
            :acmList.map(a=>(
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
                  {"₹"}{Number(t.fare).toLocaleString()}
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
  return <RcptPmtVoucher branch={branch} side="customer"/>;
}

/* Receipt (money IN from a debtor) and Payment (money OUT to a creditor) share
   the bill-wise allocation + On-Account engine; `side` flips the direction. */
function RcptPmtVoucher({branch,side}){
  const isReceipt=side==="customer";
  const mob=useMobile();
  const vNo=useVNo(branch,isReceipt?"RV":"PMT");
  const cfg=bc(branch);
  const cur=cfg.cur;
  const LEDGER_REGISTRY=useLedgerRegistry(branch).data||[];   // live chart of accounts

  const [date,setDate]=useState(todayISO());
  const [bankLedger,setBankLedger]=useState("");
  const [party,setParty]=useState("");
  const [payMode,setPayMode]=useState("NEFT");
  const [utr,setUtr]=useState("");
  const [amount,setAmount]=useState(0);            // net cash moved
  const [tds,setTds]=useState(false);
  const [tdsSection,setTdsSection]=useState("194H");
  const [tdsAmt,setTdsAmt]=useState(0);
  const [narration,setNarration]=useState("");
  // Bill-wise allocation state
  const [mode,setMode]=useState("bills");          // 'bills' | 'onaccount'
  const [alloc,setAlloc]=useState({});             // billVno → amount
  const [parkOnAcc,setParkOnAcc]=useState(false);

  const bankName=LEDGER_REGISTRY.find(l=>l.id===bankLedger)?.name||"";
  const partyName=LEDGER_REGISTRY.find(l=>l.id===party)?.name||"";
  const tdsSec=TDS_SECTIONS[tdsSection];
  const net=+amount||0;
  const gross=_r2(net+(tds?(+tdsAmt||0):0));        // gross = what settles the bill(s)

  // Live open bills for the selected party.
  const billsQ=useOpenBills(partyName,branch,side);
  const billIdMap=useMemo(()=>{const m={};(billsQ.data?.bills||[]).forEach(b=>{m[b.billVno]=b.billId;});return m;},[billsQ.data]);

  // Reset allocation whenever the party changes (their bills change).
  useEffect(()=>{ setAlloc({}); setParkOnAcc(false); setMode("bills"); },[partyName]);

  const sum=allocSummary(alloc,gross,parkOnAcc,mode);
  const setAllocFor=(vno,val,out)=>{ let v=+val||0; if(v<0)v=0; if(v>out)v=out; setAlloc(a=>({...a,[vno]:v})); };
  const fullAlloc=(vno,out)=>{
    const others=Object.entries(alloc).reduce((s,[k,v])=>k===vno?s:s+(+v||0),0);
    const remain=Math.max(0,_r2(gross-others));
    setAlloc(a=>({...a,[vno]:gross>0?Math.min(out,remain):out}));
  };
  const autoTds=()=>{ if(tds&&tdsSec){ setTdsAmt(Math.round(net*tdsSec.rate/(100-tdsSec.rate))); } };

  const jrows=isReceipt?[
    {side:"DR",ledger:bankName||"Bank / Cash",amount:net,note:"Amount received"},
    ...(tds&&+tdsAmt>0?[{side:"DR",ledger:`TDS Receivable (${tdsSection})`,amount:+tdsAmt,note:"TDS deducted by party"}]:[]),
    {side:"CR",ledger:partyName||"Debtor",amount:gross,note:"Customer outstanding cleared"},
  ]:[
    {side:"DR",ledger:partyName||"Creditor",amount:gross,note:"Supplier account settled"},
    {side:"CR",ledger:bankName||"Bank / Cash",amount:net,note:"Paid from bank / cash"},
    ...(tds&&+tdsAmt>0?[{side:"CR",ledger:`TDS Payable (${tdsSection})`,amount:+tdsAmt,note:"TDS withheld at source"}]:[]),
  ];

  const post=useCreateVoucher();
  const brPost=brCodeOf(branch);
  const canPost=!!brPost&&!!partyName&&!!bankName&&gross>0&&sum.valid&&!post.isPending;
  const reset=()=>{ setAmount(0);setUtr("");setNarration("");setTds(false);setTdsAmt(0);setAlloc({});setParkOnAcc(false);setMode("bills"); };
  const doSave=()=>{
    if(!canPost)return;
    const allocations=Object.entries(alloc).filter(([,v])=>(+v||0)>0).map(([vno,v])=>({billVno:vno,billId:billIdMap[vno]||"",amount:+v}));
    post.mutate({
      vno:vNo, type:isReceipt?"RV":"PMT", category:isReceipt?"receipt":"payment", branch:brPost, date,
      party:partyName, partyType:isReceipt?"customer":"supplier",
      bankRef:bankName, paymentMode:payMode,
      subtotal:net, total:gross, tdsAmt:tds?(+tdsAmt||0):0,
      allocations, onAccount:sum.onAcc, applyMode:mode,
      remarks:narration||`Being ${isReceipt?"receipt from":"payment to"} ${partyName} via ${payMode}${utr?` ref ${utr}`:""}`,
      status:"saved",
    });
  };

  const accent=isReceipt?"#27500A":"#A32D2D";
  return (
    <VWrap title={isReceipt?"Receipt Voucher":"Payment Voucher"} icon={isReceipt?"💰":"💸"} vNo={vNo} branch={branch}>
      <VHead vNo={vNo}/>
      <div style={{padding:"14px 16px"}}>
        <VExplain>
          {isReceipt
            ?<><b style={{color:"#A07828"}}>Receipt:</b> money coming <b>in</b> from a debtor. Cash/Bank is <b>Debited</b>, the customer <b>Credited</b>. Pick the customer to load their open bills and allocate the receipt — park any balance <b>On Account</b> as an advance.</>
            :<><b style={{color:"#A07828"}}>Payment:</b> money going <b>out</b> to a creditor. The supplier is <b>Debited</b>, Cash/Bank <b>Credited</b>. Pick the supplier to load their open bills and allocate the payment — park any balance <b>On Account</b> as an advance.</>}
        </VExplain>

        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
          {/* Left */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <FL label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></FL>
            <FL label={isReceipt?"Received from (Customer / Debtor — Cr)":"Pay to (Supplier / Creditor — Dr)"}>
              <LedgerSelect branch={branch} value={party} onChange={setParty} filter={l=>l.type===(isReceipt?"Debtor":"Creditor")} placeholder={isReceipt?"Select customer / debtor...":"Select supplier / creditor..."}/>
            </FL>
            <FL label={isReceipt?"Received in (Bank / Cash — Dr)":"Paid from (Bank / Cash — Cr)"}>
              <LedgerSelect branch={branch} value={bankLedger} onChange={setBankLedger} filter={l=>l.type==="Bank"||l.type==="Cash"} placeholder="Select bank / cash account..."/>
            </FL>
          </div>
          {/* Right */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <FL label="Payment mode">
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["NEFT","RTGS","UPI","Cheque","Cash"].map(m=>(
                  <button key={m} onClick={()=>setPayMode(m)} style={{padding:"5px 11px",borderRadius:6,fontSize:10.5,fontWeight:600,cursor:"pointer",
                    background:payMode===m?"#0d1326":"#f3f4f8",color:payMode===m?"#d4a437":"#384677",border:"1.5px solid "+(payMode===m?"#d4a437":"#e1e3ec")}}>{m}</button>
                ))}
              </div>
            </FL>
            {payMode!=="Cash"&&<FL label="UTR / Reference"><input value={utr} onChange={e=>setUtr(e.target.value)} style={{...inp,fontFamily:"monospace"}} placeholder="UTR / cheque / txn ref"/></FL>}
            <FL label={isReceipt?"Amount received (net of TDS)":"Amount paid (net of TDS)"}>
              <input type="number" value={amount||""} onChange={e=>setAmount(+e.target.value||0)} placeholder="0.00" style={{...inp,fontSize:16,fontWeight:700,color:accent}}/>
            </FL>
          </div>
        </div>

        {/* TDS (kept from the live app) */}
        <div style={{padding:"10px 12px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775",margin:"12px 0"}}>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:tds?8:0}}>
            <input type="checkbox" checked={tds} onChange={e=>setTds(e.target.checked)} style={{cursor:"pointer",accentColor:"#854F0B"}}/>
            <span style={{fontSize:11,fontWeight:700,color:"#854F0B"}}>{isReceipt?"Party has deducted TDS before paying":"Deduct TDS at source before paying"}</span>
          </label>
          {tds&&<div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr auto",gap:8,alignItems:"end"}}>
            <FL label="TDS Section"><select value={tdsSection} onChange={e=>setTdsSection(e.target.value)} style={inp}>{Object.entries(TDS_SECTIONS).filter(([k])=>k!=="None").map(([k,v])=><option key={k} value={k}>{k} ({v.rate}%)</option>)}</select></FL>
            <FL label="Rate"><div style={{...inp,background:"#f9fafb",color:"#854F0B",fontWeight:700,display:"flex",alignItems:"center"}}>{tdsSec?.rate||0}%</div></FL>
            <FL label="TDS amount"><input type="number" value={tdsAmt||""} onChange={e=>setTdsAmt(+e.target.value||0)} style={inp}/></FL>
            <button onClick={autoTds} style={{...btnGh,fontSize:10,padding:"7px 10px"}}>Auto-calc</button>
          </div>}
          {tds&&+tdsAmt>0&&<p style={{margin:"6px 0 0",fontSize:10,color:"#854F0B"}}>Gross settlement <b>{vf2(cur,gross)}</b> · {isReceipt?"TDS receivable":"TDS payable"} <b>{vf2(cur,tdsAmt)}</b> · {isReceipt?"Net received":"Net paid"} <b>{vf2(cur,net)}</b></p>}
        </div>

        {/* Bill-wise allocation */}
        <BillAllocPanel side={side} party={partyName} q={billsQ} amount={gross}
          alloc={alloc} onSetAlloc={setAllocFor} onFull={fullAlloc}
          mode={mode} onMode={setMode} parkOnAcc={parkOnAcc} onParkOnAcc={setParkOnAcc} cur={cur}/>

        <VJournalPreview rows={jrows} cur={cur}/>

        <FL label="Narration"><textarea value={narration} onChange={e=>setNarration(e.target.value)} rows={2} style={{...inp,resize:"vertical",marginBottom:12}} placeholder={partyName?`Being ${isReceipt?"receipt from":"payment to"} ${partyName}`:"Accounting narration..."}/></FL>

        <VSaveMsg m={post} okText={`✔ ${isReceipt?"Receipt":"Payment"} ${vNo} posted · ${partyName} ${isReceipt?"received":"paid"} ${vf2(cur,gross)}${sum.onAcc>0?` · ${vf2(cur,sum.onAcc)} On Account`:""} · books refreshed`}/>
        {!brPost&&<div style={{padding:"8px 12px",borderRadius:8,background:"#FAEEDA",fontSize:10.5,color:"#854F0B",fontWeight:600,textAlign:"center",marginBottom:8}}>Select a specific branch (not “All”) to post this voucher.</div>}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={reset} style={btnGh}>Reset</button>
          <button onClick={doSave} disabled={!canPost} style={{...btnG,background:canPost?accent:"#bfc3d6",opacity:canPost?1:0.55}}>
            {isReceipt?"💰":"💸"} Save Voucher {post.isPending?"…":!partyName?`(Pick ${isReceipt?"Customer":"Supplier"})`:!bankName?"(Pick Bank)":gross<=0?"(Enter Amount)":!sum.valid?(mode==="bills"?"(Allocate / On Account)":""):""}
          </button>
        </div>
      </div>
    </VWrap>
  );
}

/* ════════════════════════════════════════════════════════════════
   PAYMENT VOUCHER — COMPLETE REBUILD
   Dr Creditor  |  Cr Bank  |  Cr TDS Payable (if TDS deducted)
   ════════════════════════════════════════════════════════════════ */

export function PaymentVoucher({branch}){
  return <RcptPmtVoucher branch={branch} side="supplier"/>;
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
  const LEDGER_REGISTRY=useLedgerRegistry(branch).data||[];   // live chart of accounts
  const [date,setDate]=useState(todayISO());
  // HTML semantics: DR = "Transferred To" (account receiving), CR = "Transferred From" (source).
  const [drLedger,setDrLedger]=useState("");   // destination (Dr) → posts as lines[0].ledger
  const [crLedger,setCrLedger]=useState("");   // source (Cr)      → posts as bankRef
  const [amount,setAmount]=useState(0);
  const [ref,setRef]=useState("");
  const [narration,setNarration]=useState("");

  const drName=LEDGER_REGISTRY.find(l=>l.id===drLedger)?.name||"";
  const crName=LEDGER_REGISTRY.find(l=>l.id===crLedger)?.name||"";
  const isSame=!!drLedger&&drLedger===crLedger;
  const amt=+amount||0;
  const ready=drName&&crName&&!isSame&&amt>0;

  const jrows=[
    {side:"DR",ledger:drName,amount:amt,note:"Account receiving funds"},
    {side:"CR",ledger:crName,amount:amt,note:"Account transferring funds"},
  ];

  const post=useCreateVoucher();
  const brPost=brCodeOf(branch);
  const doReset=()=>{ setAmount(0); setRef(""); setNarration(""); };
  const doSave=()=>{
    if(!ready||!brPost||post.isPending)return;
    post.mutate({
      vno:vNo, type:"CV", category:"contra", branch:brPost, date,
      party:"", partyType:"bank",
      bankRef:crName,                          // source (Cr) bank/cash ledger NAME
      lines:[{ledger:drName, amt, desc:`Transfer in from ${crName}`}], // destination (Dr)
      subtotal:amt, total:amt,
      remarks:narration||`Being contra — transfer from ${crName} to ${drName}${ref?` (${ref})`:""}`,
      status:"saved",
    });
  };

  return (
    <VWrap title="Contra Voucher" icon="🔄" vNo={vNo} branch={branch}>
      <VHead vNo={vNo}/>
      <div style={{padding:"14px 16px"}}>
        <VExplain><b style={{color:"#A07828"}}>Contra:</b> moving funds between your own Cash &amp; Bank accounts. One is <b>Debited</b>, the other <b>Credited</b> — same amount, entered once.</VExplain>

        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14,marginBottom:14}}>
          <FL label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></FL>
          <FL label="Reference (UTR / cash receipt no.)"><input value={ref} onChange={e=>setRef(e.target.value)} style={inp} placeholder="Optional"/></FL>
        </div>

        {/* DR — transferred to */}
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}>
            <span style={{fontSize:9.5,fontWeight:800,letterSpacing:".5px",padding:"3px 10px",borderRadius:4,color:"#fff",background:V_DR}}>DR</span>
            <span style={{fontSize:11,fontWeight:700,color:"#5a6691"}}>Transferred To (Cash / Bank)</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 180px",gap:12}}>
            <LedgerSelect branch={branch} value={drLedger} onChange={setDrLedger} filter={l=>l.type==="Bank"||l.type==="Cash"} placeholder="Select bank / cash account..."/>
            <input type="number" value={amount||""} onChange={e=>setAmount(+e.target.value||0)} placeholder="0.00" style={{...inp,textAlign:"right",fontSize:15,fontWeight:700,borderLeft:`3px solid ${V_DR}`}}/>
          </div>
        </div>

        {/* CR — transferred from */}
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}>
            <span style={{fontSize:9.5,fontWeight:800,letterSpacing:".5px",padding:"3px 10px",borderRadius:4,color:"#fff",background:V_CR}}>CR</span>
            <span style={{fontSize:11,fontWeight:700,color:"#5a6691"}}>Transferred From (Cash / Bank)</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 180px",gap:12}}>
            <LedgerSelect branch={branch} value={crLedger} onChange={setCrLedger} filter={l=>(l.type==="Bank"||l.type==="Cash")&&l.id!==drLedger} placeholder="Select bank / cash account..."/>
            <input type="number" value={amount||""} onChange={e=>setAmount(+e.target.value||0)} placeholder="0.00" style={{...inp,textAlign:"right",fontSize:15,fontWeight:700,borderLeft:`3px solid ${V_CR}`}}/>
          </div>
        </div>

        {isSame&&<div style={{padding:"8px 12px",borderRadius:8,background:"#FCEBEB",fontSize:10.5,color:"#A32D2D",fontWeight:600,marginBottom:10}}>⚠ The two accounts must be different.</div>}
        <VBalanceBar dr={ready?amt:0} cr={ready?amt:0} cur={cur} emptyText="Pick two accounts and enter the amount"/>

        <FL label="Narration"><textarea value={narration} onChange={e=>setNarration(e.target.value)} rows={2} style={{...inp,resize:"vertical",marginBottom:12}} placeholder={crName&&drName?`Being contra — transfer from ${crName} to ${drName}`:"Being cash withdrawn / deposited between own accounts"}/></FL>

        <VSaveMsg m={post} okText={`✔ Contra ${vNo} posted · ${crName} → ${drName} · books refreshed`}/>
        {!brPost&&<div style={{padding:"8px 12px",borderRadius:8,background:"#FAEEDA",fontSize:10.5,color:"#854F0B",fontWeight:600,textAlign:"center",marginBottom:8}}>Select a specific branch (not “All”) to post this voucher.</div>}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={doReset} style={btnGh}>Reset</button>
          <button onClick={doSave} disabled={!ready||!brPost||post.isPending} style={{...btnG,background:(ready&&brPost)?"#185FA5":"#bfc3d6",opacity:(!ready||!brPost||post.isPending)?0.55:1}}>🔄 Save Voucher {post.isPending?"…":""}</button>
        </div>
      </div>
    </VWrap>
  );
}

/* ════════════════════════════════════════════════════════════════
   JOURNAL ENTRY — COMPLETE REBUILD
   Multi-line Dr/Cr with ledger autocomplete and validation
   ════════════════════════════════════════════════════════════════ */

export function JournalEntry({branch}){
  const vNo=useVNo(branch,"JV");
  const cfg=bc(branch);
  const cur=cfg.cur;
  const LEDGER_REGISTRY=useLedgerRegistry(branch).data||[];   // live chart of accounts

  const [date,setDate]=useState(todayISO());
  const [masterNarr,setMasterNarr]=useState("");
  const [rows,setRows]=useState([{id:1,ledger:"",type:"DR",amount:""},{id:2,ledger:"",type:"CR",amount:""}]);
  const nextId=useRef(3);

  const upd=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  const add=()=>setRows(rs=>[...rs,{id:nextId.current++,ledger:"",type:"DR",amount:""}]);
  const del=id=>setRows(rs=>{const next=rs.filter(r=>r.id!==id);return next.length?next:[{id:nextId.current++,ledger:"",type:"DR",amount:""}];});
  const reset=()=>{setRows([{id:nextId.current++,ledger:"",type:"DR",amount:""},{id:nextId.current++,ledger:"",type:"CR",amount:""}]);setMasterNarr("");};

  const getLedgerName=id=>LEDGER_REGISTRY.find(l=>l.id===id)?.name||"";
  const tDr=rows.reduce((s,r)=>s+(r.type==="DR"?(+r.amount||0):0),0);
  const tCr=rows.reduce((s,r)=>s+(r.type==="CR"?(+r.amount||0):0),0);
  const balanced=Math.abs(tDr-tCr)<0.01;

  const post=useCreateVoucher();
  const brPost=brCodeOf(branch);
  const postLines=rows.filter(r=>r.ledger&&(+r.amount||0)>0);
  const canPost=balanced&&(tDr>0)&&postLines.length>=2&&brPost;
  const doSave=()=>{
    if(!canPost||post.isPending)return;
    post.mutate({
      vno:vNo, type:"JV", category:"journal", branch:brPost, date,
      lines:postLines.map(r=>({ledger:getLedgerName(r.ledger), amt:+r.amount||0, drCr:r.type==="DR"?"Dr":"Cr", desc:masterNarr||""})),
      subtotal:tDr, total:tDr,
      remarks:masterNarr||"Being adjustment entry passed",
      status:"saved",
    });
  };

  return (
    <VWrap title="Journal Voucher" icon="📒" vNo={vNo} branch={branch}>
      <VHead vNo={vNo}/>
      <div style={{padding:"14px 16px"}}>
        <VExplain><b style={{color:"#A07828"}}>Journal:</b> adjustment entries with line-by-line DR/CR. Add as many lines as needed — <b>Total Debit must equal Total Credit</b> to save.</VExplain>

        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12,marginBottom:14}}>
          <FL label="Journal date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></FL>
          <FL label="Master narration"><input value={masterNarr} onChange={e=>setMasterNarr(e.target.value)} style={inp} placeholder="Being adjustment entry passed"/></FL>
        </div>

        <p style={{margin:"0 0 7px",fontSize:9,fontWeight:700,letterSpacing:"1px",color:"#A07828",textTransform:"uppercase"}}>Account Entries</p>
        <div style={{...card,padding:0,overflow:"hidden",marginBottom:6}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:620}}>
              <thead><tr style={{background:"#0d1326"}}>
                <th style={{padding:"8px 10px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>Ledger Account</th>
                <th style={{padding:"8px 10px",textAlign:"center",color:"#d4a437",fontWeight:700,fontSize:9.5,width:74}}>Dr / Cr</th>
                <th style={{padding:"8px 10px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:9.5,width:150}}>Amount ({cur})</th>
                <th style={{width:38}}/>
              </tr></thead>
              <tbody>
                {rows.map(r=>(
                  <tr key={r.id} style={{borderBottom:"1px solid #f3f4f8",background:r.type==="DR"?"#f0fbf5":"#fdf3f3"}}>
                    <td style={{padding:"4px 8px",minWidth:240}}>
                      <LedgerSelect branch={branch} value={r.ledger} onChange={v=>upd(r.id,"ledger",v)} placeholder="Select ledger..." style={{minHeight:30,fontSize:11}}/>
                    </td>
                    <td style={{padding:"4px 8px"}}>
                      <div style={{display:"flex",border:"1px solid #e1e3ec",borderRadius:5,overflow:"hidden",width:64,margin:"0 auto"}}>
                        {["DR","CR"].map(t=>(
                          <button key={t} onClick={()=>upd(r.id,"type",t)} style={{flex:1,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:9.5,fontWeight:800,padding:"6px 0",
                            background:r.type===t?(t==="DR"?V_DR:V_CR):"#fff",color:r.type===t?"#fff":"#9A9A9A"}}>{t}</button>
                        ))}
                      </div>
                    </td>
                    <td style={{padding:"4px 8px"}}>
                      <input type="number" min="0" step="0.01" value={r.amount} onChange={e=>upd(r.id,"amount",e.target.value)} placeholder="0.00" style={{...inp,textAlign:"right",minHeight:30,fontWeight:600}}/>
                    </td>
                    <td style={{padding:"4px 8px",textAlign:"center"}}>
                      <button onClick={()=>del(r.id)} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9A9A9A",fontSize:16,lineHeight:1}} title="Remove line">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
                  <td style={{padding:"8px 10px"}}><button onClick={add} style={{...btnGh,fontSize:10.5,padding:"4px 12px"}}><Plus size={12}/> Add Entry Line</button></td>
                  <td style={{padding:"8px 6px",textAlign:"right",fontSize:9,fontWeight:700,color:"#5a6691"}}>TOTAL</td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,fontSize:13,fontVariantNumeric:"tabular-nums",color:"#0d1326"}}>{vf2(cur,tDr)} / {vf2(cur,tCr)}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <VBalanceBar dr={tDr} cr={tCr} cur={cur} emptyText="Enter amounts to balance the voucher"/>

        <VSaveMsg m={post} okText={`✔ Journal Voucher ${vNo} posted · ${postLines.length} ledgers updated · Trial Balance refreshed`}/>
        {!brPost&&<div style={{padding:"8px 12px",borderRadius:8,background:"#FAEEDA",fontSize:10.5,color:"#854F0B",fontWeight:600,textAlign:"center",marginBottom:8}}>Select a specific branch (not “All”) to post this voucher.</div>}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={reset} style={btnGh}>Reset</button>
          <button onClick={doSave} disabled={!canPost||post.isPending} style={{...btnG,background:canPost?"#185FA5":"#bfc3d6",opacity:(!canPost||post.isPending)?0.6:1}}>
            📒 Save Voucher {!balanced?"(Balance First)":postLines.length<2?"(Min 2 lines)":!brPost?"(Pick Branch)":post.isPending?"…":""}
          </button>
        </div>
      </div>
    </VWrap>
  );
}

/* ════════════════════════════════════════════════════════════════
   PURCHASE EXPENSE VOUCHER  /purchase-expense
   Supplier expenses & asset purchases bought on credit, with GST:
     Expense / Asset A/c   Dr
     Input CGST/SGST/IGST  Dr
     To Supplier A/c       Cr
   Posts a real balanced journal (category 'purchase-expense', type PXP) so the
   ledgers, Trial Balance, P&L (expense) / Balance Sheet (asset), GST report and
   supplier outstanding all update at once.
   ════════════════════════════════════════════════════════════════ */

export function PurchaseExpenseVoucher({branch}){
  const mob=useMobile();
  const vNo=useVNo(branch,"PXP");
  const cfg=bc(branch);
  const cur=cfg.cur;
  const LEDGER_REGISTRY=useLedgerRegistry(branch).data||[];   // live chart of accounts
  const GST_RATES=[0,5,12,18,28];
  const TDS_OPTS=[["None","No TDS"],["194C","194C — Contractor / DMC (2%)"],["194J","194J — Professional / Technical (10%)"],["194H","194H — Commission / Brokerage (5%)"],["194D","194D — Insurance (5%)"]];

  const [date,setDate]=useState(todayISO());
  const [billNo,setBillNo]=useState("");
  const [party,setParty]=useState("");
  const [lines,setLines]=useState([{id:1,ledger:"",amt:0,desc:""}]);
  const nextId=useRef(2);
  const [gstApplicable,setGstApplicable]=useState(true);
  const [gstMode,setGstMode]=useState("intra");   // intra → CGST+SGST · inter → IGST
  const [gstPct,setGstPct]=useState(18);
  const [tdsSection,setTdsSection]=useState("None");
  const [narration,setNarration]=useState("");
  const [attachments,setAttachments]=useState([]);
  const [attName,setAttName]=useState("");

  const getLedgerName=id=>LEDGER_REGISTRY.find(l=>l.id===id)?.name||id;
  const partyLedger=LEDGER_REGISTRY.find(l=>l.id===party);
  const partyName=partyLedger?.name||"";
  const partyGroup=partyLedger?.group||"";

  const updLine=(id,k,v)=>setLines(ls=>ls.map(l=>l.id===id?{...l,[k]:v}:l));
  const addLine=()=>setLines(ls=>[...ls,{id:nextId.current++,ledger:"",amt:0,desc:""}]);
  const rmLine=id=>setLines(ls=>ls.length>1?ls.filter(l=>l.id!==id):ls);
  const addAtt=()=>{ if(attName.trim()){ setAttachments(a=>[...a,{name:attName.trim()}]); setAttName(""); } };

  const lineRows=lines.filter(l=>(+l.amt||0)!==0);
  const taxable=_r2(lineRows.reduce((s,l)=>s+(+l.amt||0),0));
  const gstAmt=gstApplicable?_r2(taxable*gstPct/100):0;
  const total=_r2(taxable+gstAmt);                              // invoice value
  const cgst=gstMode==="intra"?_r2(gstAmt/2):0;
  const sgst=gstMode==="intra"?_r2(gstAmt-cgst):0;
  const igst=gstMode==="inter"?gstAmt:0;
  const tdsSec=TDS_SECTIONS[tdsSection]||{rate:0};
  const tdsRate=tdsSec.rate||0;
  const tds=_r2(taxable*tdsRate/100);                           // TDS on the taxable value
  const payable=_r2(total-tds);                                 // supplier gets total net of TDS

  const jrows=[
    ...lineRows.map(l=>({side:"DR",ledger:getLedgerName(l.ledger)||"Expense / Asset",amount:+l.amt||0,note:l.desc||"Taxable value"})),
    ...(gstApplicable&&gstAmt>0?(gstMode==="intra"
        ?[{side:"DR",ledger:"CGST Input",amount:cgst,note:`input CGST @ ${gstPct/2}% (claimable)`},{side:"DR",ledger:"SGST Input",amount:sgst,note:`input SGST @ ${gstPct/2}% (claimable)`}]
        :[{side:"DR",ledger:"IGST Input",amount:igst,note:`input IGST @ ${gstPct}% (claimable)`}]):[]),
    {side:"CR",ledger:partyName||"Supplier (Sundry Creditor)",amount:payable,note:tds>0?"payable (net of TDS)":"total payable to supplier"},
    ...(tds>0?[{side:"CR",ledger:"TDS Payable",amount:tds,note:`TDS deducted @ ${tdsRate}%`}]:[]),
  ];

  const post=useCreateVoucher();
  const brPost=brCodeOf(branch);
  const canPost=!!brPost&&!!party&&lineRows.length>0&&lineRows.every(l=>l.ledger)&&total>0;
  const submit=(status)=>{
    if(!canPost||post.isPending)return;
    post.mutate({
      vno:vNo, type:"PXP", category:"purchase-expense", branch:brPost, date,
      party:partyName, partyType:"supplier", partyGroup,
      lines:lineRows.map(l=>({ledger:getLedgerName(l.ledger), amt:+l.amt||0, desc:l.desc||""})),
      subtotal:taxable, taxAmt:gstAmt, gstMode:gstApplicable?gstMode:"", tdsAmt:tds, total,
      againstInvoice:billNo,
      attachments:attachments.filter(a=>a.name.trim()).map(a=>({name:a.name.trim(),url:a.url||""})),
      remarks:narration||`Being ${gstApplicable?"GST ":""}expense/asset purchase from ${partyName}${billNo?` vide bill ${billNo}`:""}`,
      status,
    });
  };

  return (
    <VWrap title="Purchase Voucher" icon="🧾" vNo={vNo} branch={branch}>
      <VHead vNo={vNo}/>
      <div style={{padding:"14px 16px"}}>
        <VExplain><b style={{color:"#A07828"}}>Purchase:</b> buying an asset or expense from a supplier. The <b>Asset / Expense account and input GST are Debited</b> (GST is claimable as input credit); the <b>supplier (Sundry Creditors) is Credited</b> with the total. Any <b>TDS</b> is withheld on the taxable value — the supplier gets the net.</VExplain>

        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"1fr 1fr 1fr",gap:12,marginBottom:14}}>
          <FL label="Voucher date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></FL>
          <FL label="Bill / Invoice no."><input value={billNo} onChange={e=>setBillNo(e.target.value)} style={inp} placeholder="VEND-4471"/></FL>
          {gstApplicable?<VPlaceOfSupply mode={gstMode} onChange={setGstMode}/>:<div/>}
        </div>

        <FL label="Supplier / Vendor (party ledger — Cr)"><LedgerSelect branch={branch} value={party} onChange={setParty} filter={l=>l.type==="Creditor"} placeholder="Sundry Creditors / Supplier Others..."/></FL>

        {/* Debit side — expense & asset ledgers */}
        <p style={{margin:"14px 0 6px",fontSize:9,fontWeight:700,color:"#A07828",textTransform:"uppercase",letterSpacing:"1px"}}>Debit — Asset / Expense Ledgers</p>
        <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
              <thead><tr style={{background:"#0d1326"}}>
                <th style={{padding:"8px 10px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5,width:34}}>#</th>
                <th style={{padding:"8px 10px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>Expense / Asset Ledger</th>
                <th style={{padding:"8px 10px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5}}>Description</th>
                <th style={{padding:"8px 10px",textAlign:"right",color:"#d4a437",fontWeight:700,fontSize:9.5,width:140}}>Amount ({cur})</th>
                <th style={{width:32}}/>
              </tr></thead>
              <tbody>
                {lines.map((l,i)=>(
                  <tr key={l.id} style={{borderBottom:"1px solid #f3f4f8",background:(+l.amt||0)>0?"#f0fbf5":"#fff"}}>
                    <td style={{padding:"4px 8px",textAlign:"center",fontSize:10.5,color:"#5a6691"}}>{i+1}</td>
                    <td style={{padding:"3px 6px",minWidth:240}}>
                      <LedgerSelect branch={branch} value={l.ledger} onChange={v=>updLine(l.id,"ledger",v)} filter={x=>x.type==="Expense"||x.type==="Asset"} placeholder="Office Rent / Computer Asset..." style={{minHeight:30,fontSize:10.5}}/>
                    </td>
                    <td style={{padding:"3px 6px"}}>
                      <input value={l.desc} onChange={e=>updLine(l.id,"desc",e.target.value)} style={{...inp,minHeight:30,fontSize:10.5}} placeholder="e.g. June office rent / 5× laptops"/>
                    </td>
                    <td style={{padding:"3px 6px"}}>
                      <input type="number" value={l.amt||""} onChange={e=>updLine(l.id,"amt",+e.target.value||0)} placeholder="0.00" style={{...inp,textAlign:"right",minHeight:30,fontSize:11,fontWeight:600}}/>
                    </td>
                    <td style={{padding:"3px 6px",textAlign:"center"}}>
                      <button onClick={()=>rmLine(l.id)} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9A9A9A",fontSize:16,lineHeight:1}}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:"#f3f4f8",borderTop:"2px solid #e1e3ec"}}>
                  <td colSpan={3} style={{padding:"8px 10px"}}><button onClick={addLine} style={{...btnGh,fontSize:10.5,padding:"4px 12px"}}><Plus size={12}/> Add Line</button></td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,fontVariantNumeric:"tabular-nums",color:"#0d1326",fontSize:14}}>{vf2(cur,taxable)}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* GST + TDS */}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
          <div style={{padding:"12px 14px",borderRadius:10,background:"#FDFAF4",border:"1px solid #EFE7D4"}}>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:gstApplicable?10:0}}>
              <input type="checkbox" checked={gstApplicable} onChange={e=>setGstApplicable(e.target.checked)} style={{cursor:"pointer",accentColor:"#A07828"}}/>
              <span style={{fontSize:11.5,fontWeight:700,color:"#A07828"}}>GST Applicable (Input Tax Credit)</span>
            </label>
            {gstApplicable&&<div style={{display:"flex",gap:14,alignItems:"end",flexWrap:"wrap"}}>
              <FL label="GST rate"><select value={gstPct} onChange={e=>setGstPct(+e.target.value)} style={{...inp,minWidth:90}}>{GST_RATES.map(r=><option key={r} value={r}>{r}%</option>)}</select></FL>
              <div style={{fontSize:11,display:"flex",gap:12,flexWrap:"wrap"}}>
                {gstMode==="intra"?<><span>CGST <b>{vf2(cur,cgst)}</b></span><span>SGST <b>{vf2(cur,sgst)}</b></span></>:<span>IGST <b>{vf2(cur,igst)}</b></span>}
              </div>
            </div>}
          </div>
          <div style={{padding:"12px 14px",borderRadius:10,background:"#FAEEDA",border:"1px solid #FAC775"}}>
            <p style={{margin:"0 0 8px",fontSize:11.5,fontWeight:700,color:"#854F0B"}}>TDS Deduction (on taxable value)</p>
            <div style={{display:"flex",gap:12,alignItems:"end",flexWrap:"wrap"}}>
              <FL label="TDS Section"><select value={tdsSection} onChange={e=>setTdsSection(e.target.value)} style={{...inp,minWidth:200}}>{TDS_OPTS.map(([k,lab])=><option key={k} value={k}>{lab}</option>)}</select></FL>
              <div style={{fontSize:11}}>Rate <b style={{color:"#854F0B"}}>{tdsRate}%</b> · TDS <b style={{color:"#854F0B"}}>{vf2(cur,tds)}</b></div>
            </div>
          </div>
        </div>

        <VJournalPreview rows={jrows} cur={cur} title="Voucher Entry (auto-generated)"/>

        {/* Narration + attachments */}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
          <FL label="Narration"><textarea value={narration} onChange={e=>setNarration(e.target.value)} rows={2} style={{...inp,resize:"vertical"}} placeholder="e.g. Being office rent for June 2026 payable to ABC Realtors..."/></FL>
          <FL label="Attachments (bill / invoice reference)">
            <div style={{display:"flex",gap:6}}>
              <input value={attName} onChange={e=>setAttName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addAtt();}}} style={{...inp,flex:1}} placeholder="Filename or reference..."/>
              <button onClick={addAtt} style={{...btnGh,padding:"4px 10px"}}>＋ Attach</button>
            </div>
            {attachments.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
              {attachments.map((a,i)=>(
                <span key={i} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:10,padding:"3px 8px",borderRadius:999,background:"#f3f4f8",color:"#384677",border:"1px solid #e1e3ec"}}>
                  📎 {a.name}<button onClick={()=>setAttachments(x=>x.filter((_,j)=>j!==i))} style={{background:"transparent",border:"none",cursor:"pointer",color:"#A32D2D"}}>✕</button>
                </span>
              ))}
            </div>}
            <p style={{margin:"4px 0 0",fontSize:9,color:"#8b94b3"}}>References are saved with the voucher; binary upload to storage is not yet wired.</p>
          </FL>
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderRadius:8,background:"#f3f4f8",marginBottom:12,fontSize:12}}>
          <span style={{fontWeight:700,color:"#5a6691"}}>Invoice {vf2(cur,total)}{tds>0?` · TDS ${vf2(cur,tds)} · Supplier gets ${vf2(cur,payable)}`:""}</span>
          <span style={{fontSize:16,fontWeight:800,color:"#0d1326"}}>{vf2(cur,total)}</span>
        </div>

        <VSaveMsg m={post} okText={`✔ Purchase Voucher ${vNo} posted · ${partyName} outstanding ↑ · ledgers / Trial Balance / GST report refreshed`}/>
        {!brPost&&<div style={{padding:"8px 12px",borderRadius:8,background:"#FAEEDA",fontSize:10.5,color:"#854F0B",fontWeight:600,textAlign:"center",marginBottom:8}}>Select a specific branch (not “All”) to post this voucher.</div>}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={()=>submit("draft")} disabled={!canPost||post.isPending} style={{...btnGh,opacity:(!canPost||post.isPending)?0.5:1}}>Save Draft</button>
          <button onClick={()=>submit("saved")} disabled={!canPost||post.isPending} style={{...btnG,background:canPost?"#27500A":"#bfc3d6",opacity:(!canPost||post.isPending)?0.6:1}}>
            🧾 Save Purchase {!party?"(Select Supplier)":lineRows.length===0?"(Add a Line)":post.isPending?"…":""}
          </button>
        </div>
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
  const [client,setClient]=useState("");
  const [tourCode,setTourCode]=useState("");
  const [dest,setDest]=useState("Dubai");
  const [deptDate,setDeptDate]=useState("2026-06-10");
  const [returnDate,setReturnDate]=useState("2026-06-14");
  const [pax,setPax]=useState(2);
  const [pkgType,setPkgType]=useState("International"); // International | Domestic — drives TCS
  const [consultant,setConsultant]=useState("Rahul M");
  const [basic,setBasic]=useState({desc:"Air India BOM-DXB return × 2 + Marriott Dubai 4N",sac:"998552",amt:140000});
  const [service,setService]=useState({desc:"Transfers, visa, insurance, agent service fee",sac:"998555",amt:25000});
  const updBasic=(k,v)=>setBasic(b=>({...b,[k]:v}));
  const updService=(k,v)=>setService(s=>({...s,[k]:v}));

  const basicAmt=+basic.amt||0;
  const serviceAmt=+service.amt||0;
  const subTotal=basicAmt+serviceAmt;
  const gstAmt=+(subTotal*0.05).toFixed(2);
  const isIntl=pkgType==="International";
  const tcsAmt=isIntl?+((subTotal+gstAmt)*0.02).toFixed(2):0;
  const grandTotal=+(subTotal+gstAmt+tcsAmt).toFixed(2);

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

      {/* Package Type selector — drives TCS applicability */}
      <div style={{marginBottom:14,padding:"12px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775"}}>
        <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#854F0B"}}>Package Type</p>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <button onClick={()=>setPkgType("Domestic")} style={{flex:1,padding:"8px 12px",borderRadius:8,cursor:"pointer",
            background:pkgType==="Domestic"?"#27500A":"#fff",color:pkgType==="Domestic"?"#fff":"#27500A",
            border:"2px solid #27500A",fontSize:11,fontWeight:600}}>
            Domestic — GST 5% only (No TCS)
          </button>
          <button onClick={()=>setPkgType("International")} style={{flex:1,padding:"8px 12px",borderRadius:8,cursor:"pointer",
            background:pkgType==="International"?"#185FA5":"#fff",color:pkgType==="International"?"#fff":"#185FA5",
            border:"2px solid #185FA5",fontSize:11,fontWeight:600}}>
            International — GST 5% + TCS 2%
          </button>
        </div>
        <p style={{margin:0,fontSize:10,color:"#854F0B"}}>
          {isIntl
            ?"INTERNATIONAL outbound package — GST 5% on (Basic + Service) and TCS 2% u/s 206C(1G) on (Basic + Service + GST). Threshold ₹7L per FY waived in this demo."
            :"DOMESTIC package — GST 5% on (Basic + Service). No TCS applicable."}
        </p>
      </div>

      {/* Component breakout — fixed GL rows */}
      <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Package Component Breakout <span style={{fontSize:9.5,color:"#5a6691"}}>(Basic + Service → GST 5% → TCS 2% if international)</span></p>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["S.NO","GL Name","Description","SAC Code","Sell Price"].map((h,i)=>(
                <th key={i} style={{padding:"8px 10px",textAlign:i===4?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {/* 1. Basic */}
              <tr style={{borderBottom:"1px solid #f3f4f8",background:"#fff"}}>
                <td style={{padding:"4px 10px",textAlign:"center",color:"#5a6691",fontSize:10}}>1</td>
                <td style={{padding:"4px 10px",fontWeight:700,color:"#0d1326",fontSize:11}}>Basic</td>
                <td style={{padding:"3px 6px"}}>
                  <input value={basic.desc} onChange={e=>updBasic("desc",e.target.value)} style={{...inp,minHeight:28,fontSize:10.5,minWidth:200}}/>
                </td>
                <td style={{padding:"3px 6px"}}>
                  <input value={basic.sac} onChange={e=>updBasic("sac",e.target.value)} style={{...inp,minHeight:28,fontSize:10,fontFamily:"monospace",width:90}}/>
                </td>
                <td style={{padding:"3px 6px"}}>
                  <input type="number" value={basic.amt} onChange={e=>updBasic("amt",+e.target.value)} style={{...inp,minHeight:28,textAlign:"right",fontSize:11,fontWeight:600,color:"#185FA5"}}/>
                </td>
              </tr>
              {/* 2. Service */}
              <tr style={{borderBottom:"1px solid #f3f4f8",background:"#fafafa"}}>
                <td style={{padding:"4px 10px",textAlign:"center",color:"#5a6691",fontSize:10}}>2</td>
                <td style={{padding:"4px 10px",fontWeight:700,color:"#0d1326",fontSize:11}}>Service</td>
                <td style={{padding:"3px 6px"}}>
                  <input value={service.desc} onChange={e=>updService("desc",e.target.value)} style={{...inp,minHeight:28,fontSize:10.5,minWidth:200}}/>
                </td>
                <td style={{padding:"3px 6px"}}>
                  <input value={service.sac} onChange={e=>updService("sac",e.target.value)} style={{...inp,minHeight:28,fontSize:10,fontFamily:"monospace",width:90}}/>
                </td>
                <td style={{padding:"3px 6px"}}>
                  <input type="number" value={service.amt} onChange={e=>updService("amt",+e.target.value)} style={{...inp,minHeight:28,textAlign:"right",fontSize:11,fontWeight:600,color:"#185FA5"}}/>
                </td>
              </tr>
              {/* 3. Total (subtotal) */}
              <tr style={{borderBottom:"1px solid #e1e3ec",background:"#f3f4f8"}}>
                <td style={{padding:"6px 10px",textAlign:"center",color:"#0d1326",fontSize:10,fontWeight:700}}>3</td>
                <td style={{padding:"6px 10px",fontWeight:800,color:"#0d1326",fontSize:11.5}}>Total</td>
                <td style={{padding:"6px 10px",fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>Basic + Service</td>
                <td style={{padding:"6px 10px"}}></td>
                <td style={{padding:"6px 10px",textAlign:"right",fontWeight:800,fontSize:12,color:"#0d1326",fontVariantNumeric:"tabular-nums"}}>{f(subTotal)}</td>
              </tr>
              {/* 4. GST 5% */}
              <tr style={{borderBottom:"1px solid #f3f4f8",background:"#fff"}}>
                <td style={{padding:"6px 10px",textAlign:"center",color:"#854F0B",fontSize:10,fontWeight:700}}>4</td>
                <td style={{padding:"6px 10px",fontWeight:700,color:"#854F0B",fontSize:11}}>GST (5%)</td>
                <td style={{padding:"6px 10px",fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>5% on (Basic + Service)</td>
                <td style={{padding:"6px 10px",fontSize:10,fontFamily:"monospace",color:"#5a6691"}}>—</td>
                <td style={{padding:"6px 10px",textAlign:"right",fontWeight:700,fontSize:11.5,color:"#854F0B",fontVariantNumeric:"tabular-nums"}}>{f(gstAmt)}</td>
              </tr>
              {/* 5. TCS 2% */}
              <tr style={{borderBottom:"1px solid #f3f4f8",background:"#fafafa",opacity:isIntl?1:0.45}}>
                <td style={{padding:"6px 10px",textAlign:"center",color:"#185FA5",fontSize:10,fontWeight:700}}>5</td>
                <td style={{padding:"6px 10px",fontWeight:700,color:"#185FA5",fontSize:11}}>TCS (2%) {!isIntl&&<span style={{fontSize:9,color:"#5a6691",fontWeight:500}}>— N/A (Domestic)</span>}</td>
                <td style={{padding:"6px 10px",fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>2% on (Basic + Service + GST) — international only</td>
                <td style={{padding:"6px 10px",fontSize:10,fontFamily:"monospace",color:"#5a6691"}}>—</td>
                <td style={{padding:"6px 10px",textAlign:"right",fontWeight:700,fontSize:11.5,color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>{f(tcsAmt)}</td>
              </tr>
            </tbody>
            <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
              <td colSpan={4} style={{padding:"8px 10px",fontWeight:800,color:"#d4a437",fontSize:11.5}}>Grand Total ({pkgType})</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,color:"#d4a437",fontSize:13,fontVariantNumeric:"tabular-nums"}}>{f(grandTotal)}</td>
            </tr></tfoot>
          </table>
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:10,marginBottom:12}}>
        {[{l:"Basic",v:f(basicAmt),c:"#185FA5"},{l:"Service",v:f(serviceAmt),c:"#185FA5"},
          {l:"GST 5%",v:f(gstAmt),c:"#854F0B"},{l:"TCS 2%",v:isIntl?f(tcsAmt):"N/A",c:isIntl?"#185FA5":"#8b94b3"},
          {l:"Grand Total",v:f(grandTotal),c:"#0d1326"},
        ].map((k,i)=>(
          <div key={i} style={{padding:"9px 12px",borderRadius:8,background:"#f3f4f8",textAlign:"center"}}>
            <p style={{margin:0,fontSize:9,color:"#5a6691",textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"3px 0 0",fontSize:13,fontWeight:800,color:k.c}}>{k.v}</p>
          </div>
        ))}
      </div>

      <VParty branch={branch} label="Client" name={client} gstin="27AABCX****1Z5"/>
      <VNarr def={`Being holiday package sale (${pkgType}) — ${dest}, ${pax} pax, ${deptDate} to ${returnDate}${tourCode?" tour code "+tourCode:""}. GST 5% on Basic+Service${isIntl?", TCS 2% u/s 206C(1G) on Basic+Service+GST":""}.`}/>
      <VTot label="Total Invoice" val={grandTotal} cur={cur}/>
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
  const TODAY=todayISO();
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
          <FL label="Voucher Date"><input type="date" defaultValue={todayISO()} style={inpStd}/></FL>
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
   2. MULTI-CURRENCY SINGLE VOUCHER
   ════════════════════════════════════════════════════════════════════ */

export function MultiCurrencyVoucher(){
  const [saleAmt,setSaleAmt]=useState(850000);
  const [costAmt,setCostAmt]=useState(620000);
  const saleCur="INR", costCur="INR";
  const saleINR=Math.round(saleAmt);
  const costINR=Math.round(costAmt);
  const gpINR=saleINR-costINR;
  const gpPct=(gpINR/saleINR*100).toFixed(1);
  const inp={padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:5,fontSize:12};

  return (
    <PHASE2_Page title="Gross Profit Voucher" subtitle="Single voucher · sale and cost in INR · auto GP calculation">
      <div style={{padding:12,background:"#e8f0fe",border:"1px solid #b8d0f8",borderLeft:"3px solid #3b82f6",borderRadius:6,marginBottom:14,fontSize:11.5,color:"#1e3a5f"}}>
        <b>How it works:</b> Enter the sale amount billed to the customer and the cost paid to the supplier — both in INR. KBiz360 calculates gross profit and GP% automatically.
      </div>
      <div style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:20}}>
        {/* Header */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:18,paddingBottom:14,borderBottom:"1px solid #f0f2f7"}}>
          <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Voucher Type</label><select style={{...inp,width:"100%"}}><option>Sales Voucher</option><option>Mixed Purchase-Sale</option></select></div>
          <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Date</label><input type="date" defaultValue={todayISO()} style={{...inp,width:"100%"}}/></div>
          <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Branch</label><select style={{...inp,width:"100%"}}><option>BOM</option><option>AMD</option></select></div>
        </div>

        {/* Revenue side */}
        <div style={{padding:14,background:"#f0fff4",border:"1px solid #bbf7d0",borderRadius:6,marginBottom:10}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#155724"}}>📄 Revenue side (Sale)</p>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10,alignItems:"flex-end"}}>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Customer</label><input placeholder="Customer" style={{...inp,width:"100%"}}/></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Currency</label><select style={{...inp,width:"100%"}}>{ACTIVE_CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Amount (₹)</label><input type="number" value={saleAmt} onChange={e=>setSaleAmt(+e.target.value)} style={{...inp,width:"100%",fontFamily:"monospace",fontWeight:700}}/></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>INR Value</label><input readOnly value={"₹"+saleINR.toLocaleString("en-IN")} style={{...inp,width:"100%",background:"#d4edda",fontFamily:"monospace",fontWeight:700,color:"#155724"}}/></div>
          </div>
        </div>

        {/* Cost side */}
        <div style={{padding:14,background:"#fff5f5",border:"1px solid #fecaca",borderRadius:6,marginBottom:10}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#721c24"}}>📥 Cost side (Purchase)</p>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10,alignItems:"flex-end"}}>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Supplier</label><input defaultValue="Marriott Group (Bali)" style={{...inp,width:"100%"}}/></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Currency</label><select style={{...inp,width:"100%"}}>{ACTIVE_CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>Amount (₹)</label><input type="number" value={costAmt} onChange={e=>setCostAmt(+e.target.value)} style={{...inp,width:"100%",fontFamily:"monospace",fontWeight:700}}/></div>
            <div><label style={{fontSize:10.5,color:"#5a6691",fontWeight:700,display:"block",marginBottom:3}}>INR Value</label><input readOnly value={"₹"+costINR.toLocaleString("en-IN")} style={{...inp,width:"100%",background:"#f8d7da",fontFamily:"monospace",fontWeight:700,color:"#721c24"}}/></div>
          </div>
        </div>

        {/* Auto-calculated GP summary */}
        <div style={{padding:14,background:"#fff8e8",border:"1px solid #fde68a",borderRadius:6,marginBottom:14}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Auto-calculated (INR)</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700}}>SALE</p><p style={{margin:"3px 0 0",fontSize:17,fontWeight:700,color:"#155724"}}>{fmtINR(saleINR)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>billed to customer</p></div>
            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700}}>COST</p><p style={{margin:"3px 0 0",fontSize:17,fontWeight:700,color:"#721c24"}}>{fmtINR(costINR)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>paid to supplier</p></div>
            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700}}>GROSS PROFIT</p><p style={{margin:"3px 0 0",fontSize:17,fontWeight:700,color:gpINR>0?"#22c55e":"#A32D2D"}}>{fmtINR(gpINR)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>sale − cost</p></div>
            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700}}>GP %</p><p style={{margin:"3px 0 0",fontSize:17,fontWeight:700,color:+gpPct>=20?"#22c55e":+gpPct>=12?"#d4a437":"#A32D2D"}}>{gpPct}%</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>on sale value</p></div>
          </div>
        </div>

        {/* Posting lines */}
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Accounting posting lines (auto-generated)</p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5,marginBottom:14}}>
          <thead style={{background:"#f7f8fb"}}><tr><th style={RPT_thStyle}>Ledger</th><th style={RPT_thStyle}>Narration</th><th style={{...RPT_thStyle,textAlign:"right"}}>Debit (₹)</th><th style={{...RPT_thStyle,textAlign:"right"}}>Credit (₹)</th></tr></thead>
          <tbody>
            <tr style={{borderBottom:"1px solid #f0f2f7"}}><td style={RPT_tdStyle}>Customer (Receivable)</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>Sample package</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{saleINR.toLocaleString("en-IN")}</td><td style={RPT_tdStyle}/></tr>
            <tr style={{borderBottom:"1px solid #f0f2f7"}}><td style={RPT_tdStyle}>Sales — Bali Holidays</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>Package sale</td><td style={RPT_tdStyle}/><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{saleINR.toLocaleString("en-IN")}</td></tr>
            <tr style={{borderBottom:"1px solid #f0f2f7"}}><td style={RPT_tdStyle}>Tour Cost — Hotels</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>Supplier cost</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{costINR.toLocaleString("en-IN")}</td><td style={RPT_tdStyle}/></tr>
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
  const LINK_TABLE=[]; // populated from live linked sale/receipt vouchers

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

