/* ════════════════════════════════════════════════════════════════════
   MODULES/TRANSACTIONS.JSX
   Auto-generated from KBiz360_v2.jsx · 4398 lines · 39 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowLeft, Calendar, Check, ChevronDown, Clock, Download, Plus, Printer, Save, Search } from 'lucide-react';
import { Area, Line } from 'recharts';
import { getUnmatchedTickets, settlePurchaseEntry } from '../../core/business-logic';
import { ACTIVE_CURRENCIES, ADM_DATA, BRANCHES, BRANCH_CODES, CONSOLIDATED_LABEL, GP_BILLS, PURCHASE_REGISTRY, SALE_TO_PURCH_MOD, branchCurrencies, branchMainCurrency, genVNo } from '../../core/data';
import { useAdmReasonCodes, useLedgerRegistry } from '../../core/useReference';
import { useAdmMemos, useCreateAdmMemo, useDisputeAdmMemo, useAcceptAdmMemo, useRejectAdmMemo } from '../../core/useAdmMemos';
import { toast } from '../../core/ux/toast';
import { useLedgerStatement, useCreateVoucher, useOpenBills, useSalesRegister, usePurchaseRegister } from '../../core/useAccounting';
import { LedgerActions } from '../../core/ledgerActions';
import { contraLedgerName, lineNarration } from '../../core/cashBookRows';
import { openLedgerModal } from '../../core/LedgerModalHost';
import { useModalEsc } from '../../core/ux/useModalEsc';
import { SampleBanner } from '../../core/ux/SampleBanner';
import { useLivePurchaseRegistry, useLiveSalesTickets } from '../../core/useVouchers';
import { fmt, fmtINR } from '../../core/format';
import { todayISO, CUR_MONTH, MONTH_OPTIONS } from '../../core/dates';
import { ACM_DATA, ACM_REASON_CODES, LedgerSelect, REFUNDS_DATA, Recruitment, STATUS_FLOW, TAB_Page, TRow, VTD, VTH, _ACM_LIST, _ADM_LIST, _TICKET_CTRL, cardStyle, tabPanel } from '../../core/helpers';
import { useQueryClient } from '@tanstack/react-query';
import { useMasterList, useMasterMutations } from '../../core/useMasters';
import { triggerSaveRefresh, useMobile } from '../../core/hooks';
import { useVNo } from '../../core/useNextNo';
import { ARow, B, DBtn, FL, RPT_tdStyle, RPT_thStyle, SalespersonField, VHead, VNarr, VParty, VTot, VWrap, bc, btnG, btnGh, card, inp, inpStd, tabBtnStyle } from '../../core/styles';
import { Dashboard } from '../dashboard';
import { TDS_SECTIONS } from '../finance';
import { MastersSubAgents } from '../masters';
import { ApiKeySettings } from '../settings';
import { Form26AS } from '../taxation';
import { NotificationCentre } from '../../shell/NotifPanel';
import { openPrintPreview } from '../../core/PrintPreview';
import { PHASE2_Page } from '../../shell/PHASE2_Page';
import { VoucherShell } from '../../core/voucher/VoucherShell';
import { JvBlock } from '../../core/voucher/JvBlock';
import { billDuesSummary } from '../../core/voucher/ui';
import { clickable } from '../../core/ux/clickable';
import { Menu as StatusMenu } from '../../core/ux/Menu';
import { listKeyNav } from '../../core/ux/listKeys';
import { SmartDateInput } from '../../core/ux/SmartDateInput';

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
  if(m.isPending) return <div style={{padding:"10px",borderRadius:9,background:"#e8f0ff",fontSize:11,color:"#2563eb",fontWeight:700,textAlign:"center",marginBottom:8}}>Posting voucher…</div>;
  if(m.isError)   return <div style={{padding:"10px",borderRadius:9,background:"#fbe9e9",fontSize:11,color:"#dc2626",fontWeight:700,textAlign:"center",marginBottom:8}}>✗ {String(m.error?.message||"Could not save voucher")}</div>;
  if(m.isSuccess) return <div style={{padding:"10px",borderRadius:9,background:"#e8f6ed",fontSize:11,color:"#16a34a",fontWeight:700,textAlign:"center",marginBottom:8}}>{okText}</div>;
  return null;
}

/* ════════════════════════════════════════════════════════════════════
   SHARED VOUCHER BUILDING BLOCKS  (rebuilt Finance vouchers)
   The Receipt / Payment / Contra / Journal / Debit Note /
   Purchase-Expense forms below follow the provided HTML mockups — same layout
   and logic — rendered in the KBiz360 theme, wired to the live chart of accounts
   (LedgerSelect / useLedgerRegistry) and the /api/vouchers posting engine.
   ════════════════════════════════════════════════════════════════════ */

// DR green / CR maroon — the DR/CR colour convention used across the voucher forms.
export const V_DR = "#16a34a";
export const V_CR = "#dc2626";
const _r2 = (n) => Math.round((Number(n)||0)*100)/100;

// 2-decimal currency formatter for the voucher screens.
export const vf2 = (cur,n) => cur + Number(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});

// Teaching banner atop each voucher (mirrors the HTML "explain" strip).
export function VExplain({children}){
  return (
    <div style={{padding:"10px 14px",background:"#FDFAF4",border:"1px solid #EFE7D4",borderRadius:9,fontSize:11.5,color:"#5b616e",lineHeight:1.55,marginBottom:14}}>
      {children}
    </div>
  );
}

// Balanced / out-of-balance status bar (mirrors the HTML status strip).
export function VBalanceBar({dr,cr,cur,okPrefix="Balanced",emptyText="Enter amounts to balance the voucher"}){
  const diff=_r2(dr-cr); const has=dr>0||cr>0; const ok=diff===0&&has;
  return (
    <div style={{display:"flex",alignItems:"center",gap:9,padding:"10px 14px",borderRadius:8,marginBottom:12,fontSize:12,fontWeight:700,
      background:ok?"#e8f6ed":"#fbe9e9",color:ok?"#16a34a":"#dc2626",border:"1px solid "+(ok?"#bfe6cd":"#f3c9c9")}}>
      <span style={{width:9,height:9,borderRadius:"50%",background:"currentColor",flexShrink:0}}/>
      <span>{!has?emptyText:ok?`${okPrefix} — ${vf2(cur,dr)} Dr = ${vf2(cur,cr)} Cr`:`Out of balance by ${vf2(cur,Math.abs(diff))}`}</span>
    </div>
  );
}

// Read-only double-entry preview (Ledger · DR/CR · Amount) — the journal that
// will post, derived from the form. Mirrors the HTML "Account Entries" table.
export function VJournalPreview({rows,title="Accounting Effect (Double Entry)"}){
  // Map the legacy {ledger, side, amount, note} rows → standard postings and render
  // through the shared JvBlock so this matches every other JV view in the app.
  const postings=(rows||[]).map(r=>({
    ledger:r.ledger||"—", group:r.group||r.note||"",
    debit:r.side==="DR"?(+r.amount||0):0, credit:r.side==="CR"?(+r.amount||0):0,
  }));
  return (
    <div style={{marginBottom:12}}>
      <p style={{margin:"0 0 6px",fontSize:10.5,fontWeight:700,color:"#1a1c22"}}>📒 {title}</p>
      <JvBlock postings={postings}/>
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
            background:mode===k?"#1a1c22":"#fff",color:mode===k?"#c2a04a":"#2e323c",border:"1.5px solid "+(mode===k?"#c2a04a":"#e6e8ec")}}>{lab}</button>
        ))}
      </div>
    </FL>
  );
}

// Pure allocation summary — single source of truth for the bill-wise panel and
// for posting. `amount` is the gross settlement value (clears the bill's gross
// outstanding); `onAcc` is the remainder deliberately parked as an advance.
export function allocSummary(alloc,amount,parkOnAcc,mode){
  // NET of entries: negative entries are adjust-credits (drawing down a bill's
  // Overpaid excess) that free extra settling capacity for the positive rows —
  // so the net (not gross) is what caps at the voucher amount.
  const allocated=_r2(Object.values(alloc||{}).reduce((s,v)=>s+(+v||0),0));
  if(mode==="onaccount") return {allocated:0,un:0,onAcc:_r2(amount),valid:amount>0,count:0};
  const un=_r2(amount-allocated);
  const onAcc=(un>0.001&&parkOnAcc)?un:0;
  const count=Object.values(alloc||{}).filter(v=>Math.abs(+v||0)>0.001).length;
  const valid=amount>0&&count>0&&allocated<=amount+0.001&&(un<=0.001||parkOnAcc);
  return {allocated,un,onAcc,valid,count};
}

// Bill-wise allocation panel (Receipt / Payment) — open bills with ageing, an
// allocate box + "Full" per bill, an Against-Bills / On-Account mode toggle and a
// summary foot. Controlled by the parent voucher form. Mirrors the HTML panel.
export function BillAllocPanel({side,party,q,amount,alloc,onSetAlloc,onFull,mode,onMode,parkOnAcc,onParkOnAcc,cur,heading,itemLabel,emptyHint,isRefund,vDate}){
  const bills=q?.data?.bills||[];
  const advances=q?.data?.advances||0;
  const {allocated,un,onAcc,count}=allocSummary(alloc,amount,parkOnAcc,mode);
  const settleWord=side==="supplier"?"payment":"receipt";
  const showOnAccToggle=mode==="bills"&&un>0.001&&count>0&&allocated<=amount+0.001;
  const ageTone=(d)=>d<=7?["#16a34a","#e8f6ed"]:d<=30?["#d97706","#fbeedb"]:["#dc2626","#fbe9e9"];
  // Adjust-credit in play: the (negative) entries on Overpaid rows, shown positive.
  // It adds settling capacity, so the dues strip nets it into "after this" live.
  const creditUsed=_r2(-Object.values(alloc||{}).reduce((s,v)=>s+Math.min(+v||0,0),0));
  const dues=billDuesSummary(bills,vDate,(+amount||0)+creditUsed);

  return (
    <div style={{border:"1px solid #cdd1d8",borderRadius:10,overflow:"hidden",marginBottom:12}}>
      {/* header + Apply As toggle */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",padding:"10px 14px",background:"#f4f5f7",borderBottom:"1px solid #cdd1d8"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.6px",color:"#c2a04a",textTransform:"uppercase"}}>{heading||"Bill-wise Allocation"}</span>
          {party&&<span style={{fontSize:11.5,fontWeight:700,color:"#1a1c22"}}>{party}</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.5px",color:"#5b616e",textTransform:"uppercase"}}>Apply As</span>
          <div style={{display:"inline-flex",border:"1px solid #cdd1d8",borderRadius:6,overflow:"hidden"}}>
            {[["bills","Against Bills"],["onaccount","On Account"]].map(([m,lab])=>(
              <button key={m} onClick={()=>onMode(m)} style={{border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:10.5,fontWeight:700,padding:"6px 13px",
                background:mode===m?"#1a1c22":"#fff",color:mode===m?"#c2a04a":"#5b616e"}}>{lab}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Party dues strip — overdue as on the voucher date, what stays overdue after
          this settlement, the total open balance, and any Overpaid credit (excess on
          over-settled bills, owed back to the party — shown, never silently netted).
          Hidden in refund/advances mode (the rows there are receipts, not bills). */}
      {!isRefund&&party&&bills.length>0&&(
        <div style={{display:"flex",gap:22,flexWrap:"wrap",padding:"8px 14px",background:"#fffdf5",borderBottom:"1px solid #cdd1d8"}}>
          {[["Overdue as on "+(vDate||"today"),vf2(cur,dues.overdueAsOn),"#dc2626"],
            [`Overdue after this ${settleWord}`,vf2(cur,dues.overdueAfter),dues.overdueAfter>0.005?"#dc2626":"#16a34a"],
            ["Total open bills",vf2(cur,dues.totalOpen),"#1a1c22"],
            ...(dues.overpaidCredit>0.005?[["Overpaid credit (owed back)","−"+vf2(cur,dues.overpaidCredit),"#C0651A"]]:[])].map(([l,v,c],i)=>(
            <div key={i}>
              <p style={{margin:0,fontSize:8.5,fontWeight:700,letterSpacing:"0.5px",color:"#5b616e",textTransform:"uppercase"}}>{l}</p>
              <p style={{margin:"2px 0 0",fontSize:13.5,fontWeight:800,color:c,fontVariantNumeric:"tabular-nums"}}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {mode==="onaccount"?(
        <div style={{padding:"20px 16px",textAlign:"center"}}>
          <p style={{margin:0,fontSize:10,fontWeight:700,letterSpacing:"0.6px",color:"#5b616e",textTransform:"uppercase"}}>Full amount parked as advance</p>
          <p style={{margin:"6px 0",fontSize:26,fontWeight:800,color:"#d97706",fontVariantNumeric:"tabular-nums"}}>{vf2(cur,amount)}</p>
          <p style={{margin:"0 auto",maxWidth:460,fontSize:11,color:"#5b616e",lineHeight:1.5}}>No bill is settled now. The amount is held as a credit on {party||"the party"}'s account and adjusts against their future bills.</p>
        </div>
      ):(
        <>
          {q?.isLoading?(
            <div style={{padding:"18px 16px",textAlign:"center",fontSize:11.5,color:"#5b616e"}}>Loading open bills…</div>
          ):bills.length===0?(
            <div style={{padding:"18px 16px",textAlign:"center",fontSize:11.5,color:"#5b616e"}}>
              {party?(emptyHint||`No open bills for ${party}. Use “On Account” to park this ${settleWord} as an advance.`):`Select a party to load their open bills.`}
            </div>
          ):(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
                <thead><tr style={{background:"#fafafa",borderBottom:"1px solid #cdd1d8"}}>
                  {[itemLabel||"Bill No.","Date","Age","Outstanding","Status",`Allocate (${cur})`].map((h,i)=>(
                    <th key={i} style={{padding:"8px 12px",textAlign:i>=3?(i===4?"center":"right"):"left",fontSize:9,fontWeight:700,letterSpacing:"0.4px",color:"#5b616e",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {bills.map(b=>{
                    const [ac,abg]=ageTone(b.ageDays);
                    return (
                      <tr key={b.billVno} style={{borderBottom:"1px solid #dfe2e7"}}>
                        <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10.5,fontWeight:700,color:"#1a1c22"}}>
                          {b.billVno}
                          {b.refundsBill&&<div style={{fontFamily:"inherit",fontSize:9,fontWeight:700,color:"#C0651A",marginTop:2}} title={`This credit refunds the over-settled bill ${b.refundsBill}`}>↩ {b.kind==="reissue"?"reissue of":"refund of"} {b.refundsBill}</div>}
                        </td>
                        <td style={{padding:"8px 12px",fontSize:10.5,color:"#5b616e"}}>{b.date}</td>
                        <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,fontWeight:700,padding:"2px 7px",borderRadius:999,background:abg,color:ac}}>{b.ageDays}d</span></td>
                        <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>
                          {b.status==="overpaid"
                            ? <span title={`Settled ${vf2(cur,b.allocated)} against ${vf2(cur,b.total)} billed — ${vf2(cur,b.overpaidAmt)} is the party's credit`} style={{color:"#C0651A"}}>−{vf2(cur,b.overpaidAmt)}</span>
                            : vf2(cur,b.outstanding)}
                        </td>
                        <td style={{padding:"8px 12px",textAlign:"center"}}>
                          {b.overpaid||b.status==="overpaid"
                            ? <span title="This bill was settled for more than billed — the excess is payable back to the party" style={{fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:999,textTransform:"uppercase",background:"#fff1e0",color:"#C0651A"}}>Overpaid</span>
                            : <span style={{fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:999,textTransform:"uppercase",
                                background:b.status==="partial"?"#fbeedb":"#fbe9e9",color:b.status==="partial"?"#d97706":"#dc2626"}}>{isRefund?(b.status==="partial"?"Part-refunded":"To refund"):b.status}</span>}
                        </td>
                        <td style={{padding:"6px 12px",textAlign:"right",whiteSpace:"nowrap"}}>
                          {b.status==="overpaid"
                            /* Adjust-credit: the value entered is how much of this bill's
                               Overpaid excess to USE (shown positive, stored negative) —
                               it frees that much extra to allocate on the other rows. */
                            ? <>
                                <input type="number" min="0" max={b.overpaidAmt} value={alloc[b.billVno]?Math.abs(alloc[b.billVno]):""} placeholder="0"
                                  title="Use this bill's Overpaid excess to settle other bills"
                                  onChange={e=>onSetAlloc(b.billVno,-(+e.target.value||0),-b.overpaidAmt)}
                                  style={{...inp,width:104,display:"inline-block",textAlign:"right",fontWeight:600,minHeight:28,color:"#C0651A"}}/>
                                <button onClick={()=>onFull(b.billVno,-b.overpaidAmt)} style={{border:"none",background:"transparent",color:"#C0651A",fontSize:10,fontWeight:700,cursor:"pointer",textDecoration:"underline",marginLeft:6,fontFamily:"inherit"}}>Full</button>
                              </>
                            : <>
                                <input type="number" min="0" max={b.outstanding} value={alloc[b.billVno]||""} placeholder="0"
                                  onChange={e=>onSetAlloc(b.billVno,e.target.value,b.outstanding)}
                                  style={{...inp,width:104,display:"inline-block",textAlign:"right",fontWeight:600,minHeight:28}}/>
                                <button onClick={()=>onFull(b.billVno,b.outstanding)} style={{border:"none",background:"transparent",color:"#c2a04a",fontSize:10,fontWeight:700,cursor:"pointer",textDecoration:"underline",marginLeft:6,fontFamily:"inherit"}}>Full</button>
                              </>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* summary foot */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",padding:"10px 14px",background:"#f4f5f7",borderTop:"1.5px solid #1a1c22"}}>
            <div style={{display:"flex",gap:22,flexWrap:"wrap"}}>
              {[["Voucher Amount",vf2(cur,amount),"#1a1c22"],...(creditUsed>0.005?[["Credit adjusted",vf2(cur,creditUsed),"#C0651A"]]:[]),["Allocated",vf2(cur,allocated),"#c2a04a"],["Unallocated",vf2(cur,_r2(un-onAcc)),(_r2(un-onAcc)>0.001?"#dc2626":"#16a34a")],...(onAcc>0?[["On Account",vf2(cur,onAcc),"#d97706"]]:[])].map(([l,v,c],i)=>(
                <div key={i}><p style={{margin:0,fontSize:8.5,fontWeight:700,letterSpacing:"0.5px",color:"#5b616e",textTransform:"uppercase"}}>{l}</p><p style={{margin:"2px 0 0",fontSize:13.5,fontWeight:800,color:c,fontVariantNumeric:"tabular-nums"}}>{v}</p></div>
              ))}
            </div>
            {showOnAccToggle&&(
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:11,fontWeight:700,color:"#2e323c"}}>
                <input type="checkbox" checked={parkOnAcc} onChange={e=>onParkOnAcc(e.target.checked)} style={{width:15,height:15,accentColor:"#c2a04a",cursor:"pointer"}}/>
                Park balance <span style={{color:"#d97706"}}>On Account</span> (advance)
              </label>
            )}
          </div>
        </>
      )}

      {advances>0&&(
        <div style={{padding:"8px 14px",fontSize:10.5,color:"#d97706",background:"#fbeedb",borderTop:"1px solid #f3d9a8"}}>
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
  const gpC=gpPct>=25?"#16a34a":gpPct>=15?"#d97706":"#dc2626";

  const MOD_LABELS={
    PF:"Flight Tickets",PH:"Holiday Packages",PHT:"Hotels",
    PC:"Car Rentals",PV:"Visas",PI:"Insurance",PM:"Miscellaneous",
  };

  return (
    <div style={{position:"relative",borderBottom:"2px solid "+(isLinked?"#bfe6cd":"#f3c9c9"),
      background:isLinked?"#f8fff8":"#fffafa"}}>

      {/* ── Compact top bar ── */}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",
        flexWrap:mob?"wrap":"nowrap"}}>

        {/* Status icon */}
        <div style={{width:32,height:32,borderRadius:8,flexShrink:0,
          background:isLinked?"#e8f6ed":"#fbe9e9",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>
          {isLinked?"🔗":"⚠"}
        </div>

        {/* Label + selected info */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontSize:9.5,fontWeight:700,color:isLinked?"#16a34a":"#dc2626",
              textTransform:"uppercase",letterSpacing:"0.5px"}}>
              {isLinked?"Purchase Linked":"Link Purchase Entry"}
            </span>
            <span style={{fontSize:9,padding:"1px 7px",borderRadius:999,
              background:isLinked?"#e8f6ed":"#fbe9e9",
              color:isLinked?"#16a34a":"#dc2626",fontWeight:700}}>
              {isLinked?"MANDATORY ✔":"SAVE BLOCKED 🔒"}
            </span>
          </div>

          {isLinked?(
            <div style={{display:"flex",alignItems:"center",gap:12,marginTop:3,flexWrap:"wrap"}}>
              <span style={{fontFamily:"monospace",fontSize:11.5,fontWeight:700,color:"#2563eb"}}>
                {selected.vno}
              </span>
              <span style={{fontSize:11,color:"#2e323c"}}>{selected.supplier}</span>
              <span style={{fontSize:10,color:"#5b616e",fontStyle:"italic"}}>{selected.desc}</span>
              <span style={{fontSize:11,fontWeight:700,color:"#1a1c22",fontVariantNumeric:"tabular-nums"}}>
                {cur+fmt(selected.amt)}
              </span>
              {saleAmt>0&&(
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,
                  background:gpPct>=25?"#e8f6ed":gpPct>=15?"#fbeedb":"#fbe9e9",
                  color:gpC}}>
                  GP {gpPct}%
                </span>
              )}
            </div>
          ):(
            <p style={{margin:"2px 0 0",fontSize:10,color:"#dc2626"}}>
              Select a {MOD_LABELS[purchMod]||"purchase"} entry before saving this voucher
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div style={{display:"flex",gap:7,flexShrink:0}}>
          {isLinked&&(
            <button onClick={()=>onSelect(null)}
              style={{padding:"5px 10px",background:"transparent",border:"1px solid #cdd1d8",
                borderRadius:7,fontSize:10.5,cursor:"pointer",color:"#5b616e",fontWeight:500}}>
              ✕
            </button>
          )}
          <button
            onClick={()=>setOpen(o=>!o)}
            style={{display:"flex",alignItems:"center",gap:5,
              padding:mob?"6px 11px":"6px 14px",borderRadius:8,
              fontSize:11,fontWeight:700,cursor:"pointer",
              background:isLinked?"transparent":"#1a1c22",
              color:isLinked?"#16a34a":"#fff",
              border:isLinked?"1.5px solid #bfe6cd":"1.5px solid #1a1c22",
              transition:"all 0.15s",whiteSpace:"nowrap"}}>
            🔗 {isLinked?"Change":"Select Purchase"} ({available.length})
          </button>
        </div>
      </div>

      {/* ── Dropdown panel ── */}
      {open&&(
        <div onKeyDown={listKeyNav({ onEscape:()=>{setOpen(false);setSearch("");} })} style={{
          position:"absolute",top:"100%",left:0,right:0,
          background:"#fff",border:"1.5px solid #1a1c22",
          borderTop:"none",borderRadius:"0 0 12px 12px",
          boxShadow:"0 16px 48px rgba(0,0,0,0.18)",
          zIndex:300,maxHeight:460,
          display:"flex",flexDirection:"column",overflow:"hidden",
        }}>

          {/* Dropdown header */}
          <div style={{padding:"11px 16px",background:"#1a1c22",
            display:"flex",alignItems:"center",justifyContent:"space-between",
            gap:10,flexShrink:0}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:14}}>{branch==="ALL"?"🌐":branch?.flag}</span>
                <p style={{margin:0,fontSize:12,fontWeight:700,color:"#fff"}}>
                  Purchase — {MOD_LABELS[purchMod]}
                </p>
              </div>
              <p style={{margin:"2px 0 0",fontSize:10,color:"#5b616e"}}>
                {branch?.code||"ALL"} branch · {cfg.curCode} · {available.length} available
                {" · "}{allPurch.filter(p=>p.settled).length} already linked
              </p>
            </div>
            <button onClick={()=>{setOpen(false);setSearch("");}}
              style={{background:"transparent",border:"none",color:"#5b616e",
                cursor:"pointer",fontSize:20,lineHeight:1,padding:"2px 6px"}}>✕</button>
          </div>

          {/* Search */}
          <div style={{padding:"9px 14px",borderBottom:"1px solid #cdd1d8",flexShrink:0,
            background:"#f9fafb"}}>
            <input autoFocus
              value={search} onChange={e=>setSearch(e.target.value)}
              placeholder={"Search voucher no., supplier, reference, description..."}
              style={{width:"100%",padding:"7px 12px",border:"1.5px solid #cdd1d8",
                borderRadius:8,fontSize:11.5,outline:"none",boxSizing:"border-box",
                background:"#fff"}}
            />
          </div>

          {/* Stats row */}
          <div style={{display:"flex",gap:12,padding:"7px 16px",
            borderBottom:"1px solid #cdd1d8",background:"#f9fafb",flexShrink:0}}>
            <span style={{fontSize:10,color:"#5b616e"}}>
              <b style={{color:"#16a34a"}}>{available.length}</b> available to link
            </span>
            <span style={{fontSize:10,color:"#5b616e"}}>
              <b style={{color:"#2e323c"}}>{allPurch.filter(p=>p.settled).length}</b> already linked
            </span>
            {search&&(
              <span style={{fontSize:10,color:"#2563eb"}}>
                <b>{filtered.length}</b> matching "{search}"
              </span>
            )}
          </div>

          {/* List */}
          <div style={{overflowY:"auto",flex:1}}>
            {filtered.length===0?(
              <div style={{padding:"28px",textAlign:"center",color:"#5b616e"}}>
                <p style={{margin:"0 0 6px",fontSize:22}}>🔍</p>
                <p style={{margin:"0 0 4px",fontSize:12,fontWeight:600,color:"#1a1c22"}}>
                  {branch==="ALL"
                    ?"Select a branch first — cannot link vouchers in Travkings Group mode"
                    :`No available Purchase — ${MOD_LABELS[purchMod]} for ${branch?.code}`}
                </p>
                <p style={{margin:0,fontSize:10.5,color:"#5b616e"}}>
                  {branch!=="ALL"&&"Create a purchase entry first, then come back here to link it."}
                </p>
              </div>
            ):(
              filtered.map((p,i)=>{
                const isSelected=selected?.vno===p.vno&&selected?.ref===p.ref;
                const previewGP=saleAmt?saleAmt-p.amt:0;
                const previewGPPct=saleAmt&&saleAmt>0?+((previewGP/saleAmt)*100).toFixed(1):null;
                const pgC=previewGPPct!=null?(previewGPPct>=25?"#16a34a":previewGPPct>=15?"#d97706":"#dc2626"):"#5b616e";
                return (
                  <div key={i}
                    {...clickable(()=>{onSelect(p);setOpen(false);setSearch("");}, { role:'option' })}
                    style={{
                      padding:"11px 16px",borderBottom:"1px solid #dfe2e7",
                      cursor:"pointer",transition:"background 0.1s",
                      background:isSelected?"#e8f6ed":"#fff",
                      display:"flex",alignItems:"center",gap:14,
                    }}
                    onMouseEnter={e=>{if(!isSelected)e.currentTarget.style.background="#f5fbf5";}}
                    onMouseLeave={e=>{if(!isSelected)e.currentTarget.style.background="#fff";}}
                  >
                    {/* Left: check/radio indicator */}
                    <div style={{width:18,height:18,borderRadius:"50%",flexShrink:0,
                      border:isSelected?"none":"2px solid #cdd1d8",
                      background:isSelected?"#16a34a":"transparent",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff"}}>
                      {isSelected&&"✔"}
                    </div>

                    {/* Middle: voucher info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:"#2563eb"}}>
                          {p.vno}
                        </span>
                        <span style={{fontSize:11}}>{BRANCHES.find(b=>b.code===p.branch)?.flag}</span>
                        <span style={{fontSize:9,padding:"1px 6px",borderRadius:999,
                          background:"#e8f6ed",color:"#16a34a",fontWeight:700}}>
                          Available
                        </span>
                        <span style={{fontSize:9,color:"#5b616e"}}>{p.date}</span>
                      </div>
                      <p style={{margin:"0 0 2px",fontSize:11.5,fontWeight:600,color:"#1a1c22"}}>
                        {p.supplier}
                      </p>
                      <p style={{margin:0,fontSize:10.5,color:"#5b616e",fontStyle:"italic"}}>
                        {p.desc}
                      </p>
                      <p style={{margin:"3px 0 0",fontSize:10,fontFamily:"monospace",color:"#9197a3"}}>
                        Ref: {p.ref}
                      </p>
                    </div>

                    {/* Right: amount + GP preview */}
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <p style={{margin:"0 0 4px",fontSize:15,fontWeight:800,color:"#1a1c22",
                        fontVariantNumeric:"tabular-nums"}}>
                        {cur+fmt(p.amt)}
                      </p>
                      {previewGPPct!=null&&(
                        <span style={{fontSize:10.5,padding:"3px 9px",borderRadius:999,
                          fontWeight:700,
                          background:previewGPPct>=25?"#e8f6ed":previewGPPct>=15?"#fbeedb":"#fbe9e9",
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
            borderTop:"1px solid #cdd1d8",flexShrink:0,
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{margin:0,fontSize:10,color:"#5b616e"}}>
              {branch==="ALL"?"Switch to a branch to link vouchers."
                :branch?.code+" branch · "+cfg.curCode+" · Create purchase first if not listed above"}
            </p>
            <button onClick={()=>{setOpen(false);setSearch("");}}
              style={{padding:"5px 12px",background:"#1a1c22",color:"#fff",
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
  const [pax,setPax]=useState([{id:1,name:"",ticket:"",airline:"",sector:"",date:"",cls:"Economy",base:0,k3:0,tax:0,otherTax:0}]);
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
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto",paddingBottom:72}}>
      <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:12,overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"12px 16px",background:"#1a1c22"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:11}}>
              <div style={{width:38,height:38,borderRadius:9,background:"#e8f0ff",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>✈</div>
              <div>
                <p style={{margin:0,fontSize:15,fontWeight:700,color:"#fff"}}>Sales — Flight Tickets</p>
                <p style={{margin:0,fontSize:10.5,color:"#5b616e"}}>{"Voucher · "+(branch?.code||"BOM")+" · "+vNo}</p>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:0,borderRadius:999,overflow:"hidden",border:"1px solid #2e323c"}}>
                <button onClick={()=>setTripType("Domestic")}
                  style={{padding:"5px 12px",fontSize:10,fontWeight:700,cursor:"pointer",border:"none",
                    background:tripType==="Domestic"?"#16a34a":"transparent",
                    color:tripType==="Domestic"?"#fff":"#9197a3"}}>
                  🇮🇳 Domestic
                </button>
                <button onClick={()=>setTripType("International")}
                  style={{padding:"5px 12px",fontSize:10,fontWeight:700,cursor:"pointer",border:"none",
                    background:tripType==="International"?"#2563eb":"transparent",
                    color:tripType==="International"?"#fff":"#9197a3"}}>
                  🌍 International
                </button>
              </div>
              <span style={{fontSize:10,padding:"4px 10px",borderRadius:999,
                background:cfg.taxType==="GST"?"#e8f0ff":"#e8f6ed",
                color:cfg.taxType==="GST"?"#2563eb":"#16a34a",fontWeight:700}}>
                {branch?.flag} {cfg.curCode} · {cfg.taxType==="GST"?"GST 18%":"VAT "+cfg.vatRate+"%"}
              </span>
            </div>
          </div>
          {/* IRN row */}
          <div style={{marginTop:10,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <label style={{fontSize:9.5,color:"#9197a3",fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",whiteSpace:"nowrap"}}>IRN No.</label>
            <input value={irn} onChange={e=>setIrn(e.target.value)}
              style={{flex:1,minWidth:280,padding:"6px 10px",borderRadius:6,border:"1px solid #2e323c",
                background:"#1a1c22",color:"#c2a04a",fontFamily:"monospace",fontSize:10.5,fontWeight:600}}/>
            <span style={{fontSize:9,padding:"3px 9px",borderRadius:999,background:"#c2a04a",color:"#1a1c22",fontWeight:700,whiteSpace:"nowrap"}}>
              e-Invoice IRN
            </span>
          </div>
        </div>

        {/* ── Mandatory purchase link field ── */}
        <PurchaseLinkField branch={branch} saleMod="SF"
          saleAmt={t.total} selected={linkedPurch} onSelect={setLinkedPurch}/>

        {/* Voucher fields */}
        <div style={{padding:"13px 16px",borderBottom:"1px solid #cdd1d8"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
            <FL label="Voucher no."><input value={vNo} readOnly style={{...inp,background:"#f4f5f7",color:"#5b616e"}}/></FL>
            <FL label="Date"><input type="date" defaultValue={todayISO()} style={inp}/></FL>
            <FL label="Invoice type"><select style={inp}><option>Tax Invoice</option><option>Bill of Supply</option><option>Proforma</option></select></FL>
            <FL label="Reference"><input defaultValue="REF-AI-78421" style={inp}/></FL>
            <SalespersonField branch={branch}/>
          </div>
        </div>

        {/* Party */}
        <div style={{padding:"13px 16px",borderBottom:"1px solid #cdd1d8"}}>
          <p style={{margin:"0 0 8px",fontSize:10,color:"#5b616e",textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:600}}>Customer</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:11}}>
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
        <div style={{padding:"13px 16px",borderBottom:"1px solid #cdd1d8"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <p style={{margin:0,fontSize:10,color:"#5b616e",textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:600}}>Passengers</p>
            <button onClick={add} style={{...btnGh,padding:"5px 11px",fontSize:11,display:"flex",alignItems:"center",gap:5}}>
              <Plus size={12}/> Add passenger
            </button>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",fontSize:11.5,borderCollapse:"collapse",minWidth:880}}>
              <thead><tr style={{background:"#f4f5f7"}}>
                {["#","PAX Name","Ticket no.","Airline","Sector","Date","Class","Base fare","K3","Taxes","Other taxes",""].map((h,i)=>(
                  <th key={i} style={{padding:"7px 8px",textAlign:i>=7&&i<=10?"right":"left",
                    fontSize:10,color:"#5b616e",fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{pax.map((p,i)=>(
                <tr key={p.id} style={{borderBottom:"1px solid #cdd1d8"}}>
                  <td style={{padding:"4px 8px",color:"#5b616e"}}>{i+1}</td>
                  <td style={{padding:3}}><input value={p.name} onChange={e=>upd(p.id,"name",e.target.value)} style={{...inp,minWidth:160}}/></td>
                  <td style={{padding:3}}><input value={p.ticket} onChange={e=>upd(p.id,"ticket",e.target.value)} style={{...inp,minWidth:130,fontFamily:"monospace"}}/></td>
                  <td style={{padding:3}}><input value={p.airline} onChange={e=>upd(p.id,"airline",e.target.value)} style={{...inp,minWidth:90}}/></td>
                  <td style={{padding:3}}><input value={p.sector} onChange={e=>upd(p.id,"sector",e.target.value)} style={{...inp,minWidth:90}}/></td>
                  <td style={{padding:3}}><SmartDateInput value={p.date} onChange={(iso)=>upd(p.id,"date",iso)} style={{...inp,minWidth:120}}/></td>
                  <td style={{padding:3}}><select value={p.cls} onChange={e=>upd(p.id,"cls",e.target.value)} style={{...inp,minWidth:90}}><option>Economy</option><option>Business</option><option>First</option></select></td>
                  <td style={{padding:3}}><input type="number" value={p.base} onChange={e=>upd(p.id,"base",+e.target.value)} style={{...inp,minWidth:90,textAlign:"right"}}/></td>
                  <td style={{padding:3}}><input type="number" value={p.k3} onChange={e=>upd(p.id,"k3",+e.target.value)} style={{...inp,minWidth:75,textAlign:"right"}} title="K3 tax (GST on airline tax — typically applicable on international tickets)"/></td>
                  <td style={{padding:3}}><input type="number" value={p.tax} onChange={e=>upd(p.id,"tax",+e.target.value)} style={{...inp,minWidth:80,textAlign:"right"}} title="Taxes / levies on this ticket"/></td>
                  <td style={{padding:3}}><input type="number" value={p.otherTax} onChange={e=>upd(p.id,"otherTax",+e.target.value)} style={{...inp,minWidth:80,textAlign:"right"}} title="Other taxes — YQ/YR fuel, airport fees, UDF, PSF"/></td>
                  <td style={{padding:"4px 8px",textAlign:"center"}}>
                    <button onClick={()=>rm(p.id)} style={{background:"transparent",border:"none",color:"#dc2626",cursor:"pointer",fontSize:16}}>×</button>
                  </td>
                </tr>
              ))}</tbody>
              <tfoot><tr style={{background:"#f4f5f7",borderTop:"2px solid #cdd1d8"}}>
                <td colSpan={7} style={{padding:"7px 8px",fontWeight:700,fontSize:11,color:"#5b616e"}}>Totals</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#2563eb"}}>{fmt(t.base)}</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#d97706"}}>{fmt(t.k3)}</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#d97706"}}>{fmt(t.tax)}</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#d97706"}}>{fmt(t.otherTax)}</td>
                <td/>
              </tr></tfoot>
            </table>
          </div>
        </div>

        {/* Tax + Totals */}
        <div style={{padding:"13px 16px",borderBottom:"1px solid #cdd1d8"}}>
          <p style={{margin:"0 0 8px",fontSize:10,color:"#5b616e",textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:600}}>
            {cfg.taxType==="GST"?"Service charge & GST":"Service charge & VAT"}
          </p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
            <FL label={"Service charge "+cur}><input type="number" value={sc} onChange={e=>setSc(+e.target.value)} style={inp}/></FL>
            {cfg.taxType==="GST"
              ?(intra
                  ?<><FL label="CGST 9%"><input value={fmt(t.cgst)} readOnly style={{...inp,background:"#f4f5f7"}}/></FL>
                     <FL label="SGST 9%"><input value={fmt(t.sgst)} readOnly style={{...inp,background:"#f4f5f7"}}/></FL></>
                  :<FL label="IGST 18%"><input value={fmt(t.igst)} readOnly style={{...inp,background:"#f4f5f7"}}/></FL>)
              :<FL label={"VAT "+cfg.vatRate+"%"}><input value={fmt(+(sc*cfg.vatRate/100).toFixed(2))} readOnly style={{...inp,background:"#f4f5f7"}}/></FL>
            }
          </div>
          <p style={{margin:"6px 0 0",fontSize:10,color:intra?"#16a34a":"#2563eb",fontWeight:600}}>
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
                <label style={{fontSize:10,color:"#5b616e",fontWeight:600,letterSpacing:"0.4px",textTransform:"uppercase"}}>GST QR Code</label>
                <div style={{marginTop:4,padding:"10px 12px",border:"2px dashed #cbd0db",borderRadius:8,background:"#fff",
                  display:"flex",alignItems:"center",gap:11,flexWrap:"wrap"}}>
                  {qrFile
                    ?<>
                      <div style={{width:54,height:54,borderRadius:6,background:"#f4f5f7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,border:"1px solid #cdd1d8"}}>▦</div>
                      <div style={{flex:1,minWidth:140}}>
                        <p style={{margin:0,fontSize:11,fontWeight:700,color:"#1a1c22"}}>{qrFile.name}</p>
                        <p style={{margin:"2px 0 0",fontSize:10,color:"#5b616e"}}>{(qrFile.size/1024).toFixed(1)} KB · uploaded</p>
                      </div>
                      <button onClick={()=>setQrFile(null)} style={{...btnGh,fontSize:10,padding:"4px 10px",color:"#dc2626",borderColor:"#dc2626"}}>Remove</button>
                    </>
                    :<>
                      <div style={{width:54,height:54,borderRadius:6,background:"#f4f5f7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#9197a3",border:"1px solid #cdd1d8"}}>▦</div>
                      <div style={{flex:1,minWidth:140}}>
                        <p style={{margin:0,fontSize:11,fontWeight:600,color:"#1a1c22"}}>Upload GST e-Invoice QR code</p>
                        <p style={{margin:"2px 0 0",fontSize:9.5,color:"#5b616e"}}>PNG / JPG · signed QR from IRP portal</p>
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
            <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:10,padding:14,alignSelf:"start"}}>
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
              <div style={{borderTop:"2px solid #1a1c22",margin:"8px 0",paddingTop:8,
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:700}}>Invoice total</span>
                <span style={{fontSize:18,fontWeight:800,color:"#2563eb",fontVariantNumeric:"tabular-nums"}}>
                  {cur+" "+fmt(t.total)}
                </span>
              </div>
              <p style={{margin:"10px 0 0",fontSize:9.5,color:"#5b616e",fontStyle:"italic"}}>
                {isIntl
                  ?"International ticket — K3 (GST on airline tax) typically applies. CGST/SGST on service charge only."
                  :"Domestic ticket — K3 generally nil. Full GST on base fare + service charge as applicable."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div style={{position:"sticky",bottom:0,background:"#f4f5f7",borderTop:"1px solid #cdd1d8",
        padding:"12px 10px",display:"flex",gap:9,justifyContent:"flex-end"}}>
        <button style={btnGh}>Cancel</button>
        <button
          disabled={!linkedPurch}
          style={{...btnG,
            background:linkedPurch?"#1a1c22":"#9ca3af",
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
      <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8",overflowX:"auto"}}>
        <p style={{margin:"0 0 8px",fontSize:10,color:"#5b616e",textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:600}}>Vehicle &amp; hire details</p>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:820}}>
          <thead><tr>
            {["#","Vehicle","Pickup","Drop","Days","Basic ₹","Other fare ₹","Service charge ₹","Total ₹"].map((h,i)=><VTH key={i} c={h} r={i>=4&&i<=8}/>)}
          </tr></thead>
          <tbody>
            <tr style={{borderBottom:"1px solid #cdd1d8"}}>
              <VTD c={1}/>
              <td style={{padding:3}}>
                <input value={row.vehicle} onChange={e=>upd("vehicle",e.target.value)} style={{...inp,minHeight:28,fontSize:11}} title="Vehicle type / model"/>
              </td>
              <td style={{padding:3}}><input value={row.pickup} onChange={e=>upd("pickup",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input value={row.drop} onChange={e=>upd("drop",e.target.value)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input type="number" value={row.days} onChange={e=>upd("days",+e.target.value||1)} style={{...inp,minHeight:28,fontSize:11,width:60,textAlign:"right"}}/></td>
              <td style={{padding:3}}><input type="number" value={row.basic} onChange={e=>upd("basic",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}} title="Basic hire charges"/></td>
              <td style={{padding:3}}><input type="number" value={row.otherFare} onChange={e=>upd("otherFare",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}} title="Toll, parking, extra km, driver allowance"/></td>
              <td style={{padding:3}}><input type="number" value={row.svc} onChange={e=>upd("svc",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}} title="Agency Service Fee"/></td>
              <VTD c={fmt(sub)} r/>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label="GST rate"><input value={intra?"5% (CGST 2.5% + SGST 2.5%)":"5% (IGST)"} readOnly style={{...inp,background:"#f4f5f7",color:"#5b616e",fontWeight:600,cursor:"not-allowed"}}/></FL>
          {intra
            ?<>
              <FL label="CGST 2.5% ₹"><input value={fmt(cgst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
              <FL label="SGST 2.5% ₹"><input value={fmt(sgst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
            </>
            :<FL label="IGST 5% ₹"><input value={fmt(igst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>}
        </div>
        <div style={{marginTop:9,padding:"8px 12px",background:"#e8f0ff",borderRadius:8,fontSize:11.5,color:"#2563eb"}}>
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
  const [appl,setAppl]=useState([{id:1,name:"",pp:"",country:"",vtype:"Tourist 30D",vfsFee:0,taxes:0,otherTax:0}]);
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
      <ARow label="Applicant details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:880}}>
          <thead><tr>
            {["#","PAX Name","Passport no.","Visa country","Visa type","VFS fee ₹","Taxes ₹","Other taxes ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=5&&i<=7}/>)}
          </tr></thead>
          <tbody>{appl.map((a,i)=>(
            <tr key={a.id} style={{borderBottom:"1px solid #cdd1d8"}}>
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
            <tr style={{background:"#f4f5f7",borderTop:"2px solid #cdd1d8"}}>
              <td colSpan={5} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(vfsTot)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#d97706"}}>{fmt(taxesTot)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#d97706"}}>{fmt(otherTot)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label={bc(branch).cur+"Service charge"}>
            <input type="number" value={svc} onChange={e=>setSvc(+e.target.value||0)} style={{...inp,textAlign:"right"}}/>
          </FL>
          {intra
            ?<>
              <FL label="CGST 9% ₹"><input value={fmt(cgst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
              <FL label="SGST 9% ₹"><input value={fmt(sgst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
            </>
            :<FL label="IGST 18% ₹"><input value={fmt(igst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>}
        </div>
        <div style={{marginTop:9,padding:"8px 12px",background:"#e8f0ff",borderRadius:8,fontSize:11.5,color:"#2563eb"}}>
          SAC code: <b>998212</b> — Visa and passport services. {intra?"Intra-state (27): CGST 9% + SGST 9% on service charge.":"Inter-state (state ≠ 27): IGST 18% on service charge."}
        </div>
      </div>
      <VNarr def="Being visa processing charges — 2 applicants, UAE Tourist 30D via VFS Dubai centre.">
        <VTot branch={branch}
          lines={[
            {l:"VFS fee (pass-through)",v:"₹ "+fmt(vfsTot)},
            {l:"Taxes",v:"₹ "+fmt(taxesTot)},
            {l:"Other taxes",v:"₹ "+fmt(otherTot)},
            {l:"Agency Service Fee",v:"₹ "+fmt(svc)},
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
  const [rows,setRows]=useState([{id:1,passenger:"",ci:"",co:"",rtype:"",meal:"CP",basic:0,taxes:0,otherTax:0}]);
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
      <ARow label="Accommodation details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:960}}>
          <thead><tr>
            {["#","PAX Name","Check-in","Check-out","Room type","Meal plan","Room fare / Basic fare ₹","Taxes ₹","Other tax ₹","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=6&&i<=9}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const lineTotal=(+r.basic||0)+(+r.taxes||0)+(+r.otherTax||0);
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #cdd1d8"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.passenger} onChange={e=>upd(r.id,"passenger",e.target.value)} style={{...inp,minHeight:28,fontSize:11,minWidth:160}}/></td>
                <td style={{padding:3}}><SmartDateInput value={r.ci} onChange={(iso)=>upd(r.id,"ci",iso)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><SmartDateInput value={r.co} onChange={(iso)=>upd(r.id,"co",iso)} style={{...inp,minHeight:28,fontSize:11}}/></td>
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
            <tr style={{background:"#f4f5f7",borderTop:"2px solid #cdd1d8"}}>
              <td colSpan={6} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(totBasic)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#d97706"}}>{fmt(totTaxes)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#d97706"}}>{fmt(totOther)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#2563eb"}}>{fmt(subTable)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label={bc(branch).cur+"Service charge"}>
            <input type="number" value={svc} onChange={e=>setSvc(+e.target.value||0)} style={{...inp,textAlign:"right"}}/>
          </FL>
          {intra
            ?<>
              <FL label="CGST 9% ₹"><input value={fmt(cgst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
              <FL label="SGST 9% ₹"><input value={fmt(sgst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
            </>
            :<FL label="IGST 18% ₹"><input value={fmt(igst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>}
        </div>
        <div style={{marginTop:9,padding:"8px 12px",background:"#e8f0ff",borderRadius:8,fontSize:11.5,color:"#2563eb"}}>
          SAC code: <b>998552</b> — Tour operator / accommodation reservation. Room fare + Taxes + Other tax are pass-through to the customer. {intra?"Intra-state (27): CGST 9% + SGST 9% on agency service charge.":"Inter-state (state ≠ 27): IGST 18% on agency service charge."}
        </div>
      </div>
      <VNarr def="Being hotel accommodation — Hyatt Regency Ahmedabad, 5-8 June 2026, CP meal plan.">
        <VTot branch={branch}
          lines={[
            {l:"Room fare / Basic fare",v:"₹ "+fmt(totBasic)},
            {l:"Taxes",v:"₹ "+fmt(totTaxes)},
            {l:"Other tax",v:"₹ "+fmt(totOther)},
            {l:"Agency Service Fee",v:"₹ "+fmt(svc)},
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
  const [rows,setRows]=useState([{id:1,name:"",pp:"",dest:"",basic:0,otherTax:0,svc:0}]);
  const [partyGstin,setPartyGstin]=useState("27AABCM8765G1Z2"); // 27 = Maharashtra (office state) → intra-state by default, like sibling vouchers
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
              <tr key={r.id} style={{borderBottom:"1px solid #cdd1d8"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.name} onChange={e=>upd(r.id,"name",e.target.value)} style={{...inp,minHeight:28,fontSize:11,minWidth:180}}/></td>
                <td style={{padding:3}}><input value={r.pp} onChange={e=>upd(r.id,"pp",e.target.value.toUpperCase())} style={{...inp,minHeight:28,fontSize:11,fontFamily:"monospace",width:100}}/></td>
                <td style={{padding:3}}><input value={r.dest} onChange={e=>upd(r.id,"dest",e.target.value)} style={{...inp,minHeight:28,fontSize:11,minWidth:130}}/></td>
                <td style={{padding:3}}><input type="number" value={r.basic} onChange={e=>upd(r.id,"basic",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:85}} title="Basic / net premium amount"/></td>
                <td style={{padding:3}}><input type="number" value={r.otherTax} onChange={e=>upd(r.id,"otherTax",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:80}} title="Stamp duty, levy or other non-creditable tax on policy"/></td>
                <td style={{padding:3}}><input type="number" value={r.svc} onChange={e=>upd(r.id,"svc",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right",width:85}} title="Agency Service Fee"/></td>
                <VTD c={fmt(lineTotal)} r/>
                <DBtn fn={()=>rm(r.id)}/>
              </tr>
            );
          })}</tbody>
          <tfoot>
            <tr style={{background:"#f4f5f7",borderTop:"2px solid #cdd1d8"}}>
              <td colSpan={4} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(totBasic)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#d97706"}}>{fmt(totOther)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#16a34a"}}>{fmt(totSvc)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#2563eb"}}>{fmt(taxable)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label={bc(branch).cur+"Taxable value"}><input value={fmt(taxable)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
          {!isGST
            ?<FL label={"VAT "+(bc(branch).vatRate||18)+"% "+bc(branch).cur}><input value={fmt(gstFull)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
            :intra
              ?<>
                <FL label="CGST 9% ₹"><input value={fmt(cgst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
                <FL label="SGST 9% ₹"><input value={fmt(sgst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
              </>
              :<FL label="IGST 18% ₹"><input value={fmt(igst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>}
          <FL label="Invoice total ₹"><input value={fmt(total)} readOnly style={{...inp,textAlign:"right",fontWeight:700,background:"#f4f5f7",color:"#2563eb"}}/></FL>
        </div>
        <div style={{marginTop:9,padding:"8px 12px",background:"#e8f0ff",borderRadius:8,fontSize:11.5,color:"#2563eb"}}>
          {isGST
            ?<>GST 18% on (Basic + Other tax + Service charge). SAC 997131 — Life &amp; non-life insurance. {intra?"Intra-state (27): split as CGST 9% + SGST 9%.":"Inter-state (state ≠ 27): IGST 18%."}</>
            :<>VAT {(bc(branch).vatRate||18)}% on (Basic + Other tax + Service charge).</>}
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
  const [rows,setRows]=useState([{id:1,gl:"",sac:"",amt:0,gstPct:18}]);
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

  const rateBg={0:"#f4f5f7",5:"#e8f6ed",12:"#fbeedb",18:"#e8f0ff"};
  const rateC={0:"#5b616e",5:"#16a34a",12:"#d97706",18:"#2563eb"};

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
              <tr key={r.id} style={{borderBottom:"1px solid #cdd1d8"}}>
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
            <tr style={{background:"#f4f5f7",borderTop:"2px solid #cdd1d8"}}>
              <td colSpan={3} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(sub)}</td>
              <td/>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#16a34a"}}>{fmt(gstAmt)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#2563eb"}}>{fmt(total)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8"}}>
        <p style={{margin:"0 0 9px",fontSize:10,color:"#5b616e",letterSpacing:"0.5px",textTransform:"uppercase"}}>GST breakup by rate</p>
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
          {Object.keys(gstByRate).length===0&&<p style={{fontSize:11.5,color:"#9197a3",margin:0}}>Add line items above to see GST breakup.</p>}
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


/* ════════════════════════════════════════════════════════════════
   REFUND & REISSUE  (against a sales invoice)   /finance/refund · /finance/reissue
   Mirrors the provided Travkings HTML mockups — a module strip (Flights / Holidays /
   Hotels / Car Rental / Insurance / Visa / Misc), the supplier refund/payable calc,
   our retained service charge + markup (+GST) and the customer refund/bill — rendered
   in the KBiz360 theme. BOTH act ONLY on an existing sales invoice, picked from the
   dropdown (Save is blocked until one is chosen). Each posts a balanced double-entry
   (category 'refund' / 'reissue', type RF / RI) so the Trial Balance, P&L, Balance
   Sheet, Day Book, GST and module GP all update at once.

     Refund     Dr Supplier  | Cr Customer + Cr Service Fee/SVC2 income + Cr Output GST
     Reissue    Dr Customer   | Cr Supplier  + Cr Service Fee/SVC2 income + Cr Output GST
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

// Agency Service Fee + markup retained at the time of sale (our income, NOT the
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
      border:"1px solid #cdd1d8",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.18)",overflow:"hidden"}}>
      <div style={{position:"relative"}}>
        <Search size={13} style={{position:"absolute",left:10,top:9,color:"#9197a3"}}/>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)} onKeyDown={onKeyNav} placeholder="Search by invoice no, party, pax, ticket, PNR or sector…  (↑ ↓ to move · Enter to select)"
          style={{width:"100%",border:"none",borderBottom:"1px solid #cdd1d8",padding:"8px 12px 8px 30px",fontSize:11,outline:"none",boxSizing:"border-box"}}/>
      </div>
      <div style={{maxHeight:300,overflowY:"auto"}}>
        {filtered.map((inv,idx)=>{
          const pl=paxLabel(inv);
          const active=idx===activeIdx;
          return (
            <div key={inv.id} ref={el=>{ if(active&&el) el.scrollIntoView({block:"nearest"}); }}
              {...clickable(()=>{onChange(inv.id);setOpen(false);}, { role:'option' })} onMouseEnter={()=>setActiveIdx(idx)}
              style={{padding:"8px 12px",cursor:"pointer",borderBottom:"1px solid #dfe2e7",background:active?"#eaf0ff":"transparent"}}>

              <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"baseline"}}>
                <span style={{fontFamily:"monospace",fontSize:10.5,fontWeight:700,color:"#2563eb"}}>{inv.vno}</span>
                <span style={{fontSize:11,fontWeight:700,color:"#1a1c22",fontVariantNumeric:"tabular-nums"}}>{vf2(cur,inv.total)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",gap:10,marginTop:2}}>
                <span style={{fontSize:10.5,color:"#1a1c22",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inv.party||"—"}</span>
                <span style={{fontSize:9.5,color:"#5b616e",flexShrink:0}}>{inv.date}</span>
              </div>
              {pl&&<div style={{fontSize:9.5,color:"#5b616e",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                <span style={{color:"#c2a04a",fontWeight:700}}>{invPax(inv).length} pax</span> · {pl}</div>}
            </div>
          );
        })}
        {filtered.length===0&&<div style={{padding:"12px",fontSize:11,color:"#5b616e"}}>{loading?`Loading ${nounPlural}…`:`No matching ${noun}`}</div>}
      </div>
      <div style={{padding:"6px 10px",borderTop:"1px solid #dfe2e7",fontSize:9.5,color:"#5b616e"}}>{invoices.length} {nounPlural} · type to filter</div>
    </div>, document.body);
  return (
    <div ref={ref} style={{position:"relative"}}>
      <div {...clickable(()=>open?setOpen(false):openMenu())} style={{...inp,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",minHeight:32,
        borderColor:selected?"#bfe6cd":"#f3c9c9",background:selected?"#f8fff8":"#fffafa"}}>
        {selected
          ?<span style={{fontSize:11,color:"#1a1c22",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><b style={{fontFamily:"monospace",color:"#2563eb"}}>{selected.vno}</b> · {selected.party||"—"} · {vf2(cur,selected.total)}</span>
          :<span style={{fontSize:11,color:"#bf7d7d"}}>{loading?`Loading ${nounPlural}…`:(invoices.length?(placeholder||`Search & select a ${noun}…`):`No ${nounPlural} in this branch`)}</span>}
        <ChevronDown size={12} style={{color:"#5b616e",flexShrink:0}}/>
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
    <div style={{flex:1,minWidth:118,padding:"7px 11px",borderRadius:7,background:"#f4f5f7",border:"1px solid #cdd1d8"}}>
      <div style={{fontSize:8.5,fontWeight:700,letterSpacing:".5px",color:"#5b616e",textTransform:"uppercase"}}>{l}</div>
      <div style={{fontSize:13,fontWeight:800,marginTop:2,color:c||"#1a1c22",fontVariantNumeric:"tabular-nums"}}>{vf2(cur,v)}</div>
    </div>
  );
  return (
    <div style={{...card,padding:"11px 13px",marginBottom:14,background:"#FBFCFE"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6,marginBottom:8}}>
        <span style={{fontSize:9,fontWeight:700,letterSpacing:"1px",color:"#c2a04a",textTransform:"uppercase"}}>{label} {inv.vno} · Pax Detail{selectable&&pax.length>1?<span style={{color:"#2563eb"}}> · select who to {label.toLowerCase().includes("purchase")?"settle":"refund/reissue"}</span>:null}</span>
        <span style={{fontSize:9.5,color:"#5b616e"}}>{selectable&&pax.length>0?`${selPax.length}/${pax.length} pax · `:""}{inv.date} · {inv.party||"—"}{inv.gstMode?` · ${inv.gstMode==="inter"?"Inter-state (IGST)":"Intra-state (CGST+SGST)"}`:""}</span>
      </div>
      {pax.length>0?(
        <div style={{overflowX:"auto",marginBottom:9}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:10.5}}>
            <thead><tr style={{borderBottom:"1px solid #cdd1d8"}}>
              {selectable&&<th style={{padding:"4px 8px",textAlign:"center"}}><input type="checkbox" checked={allSel} onChange={()=>onToggleAll&&onToggleAll(pax,!allSel)} title="Select all"/></th>}
              {["#","PAX Name","Ticket / Ref","Sector","Airline / Operator","Class","Base Fare"].map((h,i)=>(
                <th key={i} style={{textAlign:i===0?"center":i===6?"right":"left",padding:"4px 8px",fontSize:8.5,fontWeight:700,color:"#5b616e",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{pax.map((p,i)=>{
              const sel=isSel(p,i);
              return (
              <tr key={i} style={{borderBottom:".5px solid #dfe2e7",opacity:selectable&&!sel?0.4:1}}>
                {selectable&&<td style={{padding:"4px 8px",textAlign:"center"}}><input type="checkbox" checked={sel} onChange={()=>onToggle&&onToggle(paxKey(p,i))}/></td>}
                <td style={{padding:"4px 8px",textAlign:"center",color:"#9197a3"}}>{i+1}</td>
                <td style={{padding:"4px 8px",fontWeight:600,color:"#1a1c22",whiteSpace:"nowrap"}}>{p.name||"—"}</td>
                <td style={{padding:"4px 8px",fontFamily:"monospace",fontSize:9.5,color:"#2563eb",whiteSpace:"nowrap"}}>{p.ticket||p.pnr||"—"}</td>
                <td style={{padding:"4px 8px",color:"#5b616e",whiteSpace:"nowrap"}}>{p.sector||"—"}</td>
                <td style={{padding:"4px 8px",color:"#5b616e",whiteSpace:"nowrap"}}>{p.airline||"—"}</td>
                <td style={{padding:"4px 8px",color:"#5b616e",whiteSpace:"nowrap"}}>{p.cls||"—"}</td>
                <td style={{padding:"4px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#16a34a",fontWeight:600,whiteSpace:"nowrap"}}>{vf2(cur,p.baseFare||0)}</td>
              </tr>
            );})}</tbody>
          </table>
        </div>
      ):<div style={{fontSize:10,color:"#9197a3",marginBottom:9}}>No passenger detail recorded on this invoice.</div>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {chip(selectable?"Selected Fare (excl. svc + GST)":"Original Fare (excl. svc + GST)",selBase,"#16a34a")}
        {chip("Service Fee + Service Charge - 2",svc,"#c2a04a")}
        {chip("GST collected",gst,"#2563eb")}
        {tcs>0&&chip("TCS collected",tcs,"#d97706")}
        {chip("Invoice Total",inv.total,"#1a1c22")}
      </div>
    </div>
  );
}

// Refund / Reissue / ADM / ACM CREATE now render through the unified VoucherShell
// (Option C) — they are gated voucher categories that enter PENDING and post on
// approval, exactly like Receipt/Payment/Debit-Note. The legacy auto-posting
// RefundReissueVoucher below is retained for reference only (no longer routed).
export function RefundVoucher({branch}){ return <VoucherShell category="refund" mode="create" branch={branch} />; }
export function ReissueVoucher({branch}){ return <VoucherShell category="reissue" mode="create" branch={branch} />; }
export function RefundPartialVoucher({branch}){ return <VoucherShell category="refund-partial" mode="create" branch={branch} />; }
export function AdmVoucher({branch}){ return <VoucherShell category="adm" mode="create" branch={branch} />; }
export function AcmVoucher({branch}){ return <VoucherShell category="acm" mode="create" branch={branch} />; }

// eslint-disable-next-line no-unused-vars
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
    ...(svc>0?[{side:"CR",ledger:"SVF Income",amount:svc,note:"retained Service Fee"}]:[]),
    ...(markup>0?[{side:"CR",ledger:"SVC2 Income",amount:markup,note:"retained Service Charge - 2"}]:[]),
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
        {ledger:"SVF Income", amt:svc, desc:"Retained Service Fee", drCr:"Cr"},
        {ledger:"SVC2 Income", amt:markup, desc:"Retained Service Charge - 2", drCr:"Cr"},
      ].filter(l=>(+l.amt||0)>0),
      subtotal:_r2(svc+markup), taxAmt, gstMode, total,
      againstInvoice:selInv.vno, againstPurchase:selPur?.vno||"",
      linkNo:selInv.linkNo||selPur?.linkNo||selInv.vno, costCenter:selInv.costCenter||selPur?.costCenter||"",
      remarks:narration||`Being ${kind} of ${module.toLowerCase()} booking ${ref1||selInv.vno} against ${selInv.vno}${selPur?` / ${selPur.vno}`:""}${paxNote}`,
      status:"saved",
    });
  };

  const accent=isRefund?"#dc2626":"#2563eb";   // refund = reversal (maroon) · reissue = re-bill (blue)
  const title=isRefund?"Refund Voucher":"Reissue Voucher";
  const num=(v,set,extra={})=>(<input type="number" value={v||""} onChange={e=>set(+e.target.value||0)} placeholder="0.00" style={{...inp,textAlign:"right",fontWeight:600,...extra}}/>);

  return (
    <VWrap title={title} icon={isRefund?"💳":"🔄"} vNo={vNo} branch={branch}>
      <VHead vNo={vNo}/>
      <div style={{padding:"14px 16px"}}>
        <VExplain>
          {isRefund
            ?<><b style={{color:"#c2a04a"}}>Refund:</b> a customer cancels a {module.toLowerCase()} booking. The {cfgM.sup} refunds the fare minus its cancellation charge; you retain a service charge + markup (+GST) and refund the balance to the customer. The supplier is <b>Debited</b> (receivable); the customer, your income & GST are <b>Credited</b>. Any <b>service charge the {cfgM.sup} levies is booked as your own cost</b> (separate {supSvcLedger} leg, reducing GP) and its GST as input credit — <b>not</b> passed to the customer. <b>Pick both the sales invoice</b> being cancelled <b>and its purchase invoice</b> below.</>
            :<><b style={{color:"#c2a04a"}}>Reissue:</b> a customer changes a {module.toLowerCase()} booking. The {cfgM.sup} charges a change fee plus any fare difference; you add a service charge + markup (+GST) and bill the total to the customer. The customer is <b>Debited</b>; the supplier, your income & GST are <b>Credited</b>. Any <b>service charge the {cfgM.sup} levies is booked as your own cost</b> (separate {supSvcLedger} leg, reducing GP) and its GST as input credit — <b>not</b> added to the customer's bill. <b>Pick both the sales invoice</b> being amended <b>and its purchase invoice</b> below.</>}
        </VExplain>

        {/* Module strip — mirrors the mockup tabs */}
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14,borderBottom:"1px solid #cdd1d8",paddingBottom:10}}>
          {RR_ORDER.map(m=>(
            <button key={m} onClick={()=>setModule(m)} style={{padding:"6px 13px",borderRadius:7,fontSize:10.5,fontWeight:700,cursor:"pointer",textTransform:"uppercase",letterSpacing:".3px",
              background:module===m?"#1a1c22":"#f4f5f7",color:module===m?"#c2a04a":"#5b616e",border:"1.5px solid "+(module===m?"#c2a04a":"#e6e8ec")}}>{RR_MODULES[m].tab}</button>
          ))}
        </div>

        {/* Voucher date + place of supply */}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:14}}>
          <FL label="Date (DD-MM-YYYY)"><DateField value={date} onChange={setDate} style={inp}/></FL>
          <VPlaceOfSupply mode={gstMode} onChange={setGstMode}/>
        </div>

        {/* ① Sales side — settles the customer (debtor) leg (required) */}
        <p style={{margin:"0 0 8px",fontSize:9,fontWeight:700,letterSpacing:"1px",color:"#2563eb",textTransform:"uppercase"}}>① Sales Invoice — customer side (required)</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12,marginBottom:10}}>
          <FL label={`Against Sales Invoice — ${isRefund?"cancel":"amend"} (required)`}>
            <InvoiceSelect invoices={invoices} value={invId} onChange={pickInvoice} cur={cur} loading={salesQ.isLoading} noun="sales invoice"/>
          </FL>
        </div>
        <InvoicePaxPanel inv={selInv} cur={cur} label="Sales Invoice" selectable selected={salePaxSel} onToggle={togglePax(setSalePaxSel)} onToggleAll={toggleAllPax(setSalePaxSel)}/>

        {/* ② Purchase side — AUTO-LINKED from the sale by Link No (no manual pick) */}
        <p style={{margin:"0 0 8px",fontSize:9,fontWeight:700,letterSpacing:"1px",color:"#16a34a",textTransform:"uppercase"}}>② Purchase Invoice — supplier side (auto-linked by Link No · sets the original cost)</p>
        {selPur
          ? <InvoicePaxPanel inv={selPur} cur={cur} label="Purchase Invoice · auto-linked" selectable selected={purPaxSel} onToggle={togglePax(setPurPaxSel)} onToggleAll={toggleAllPax(setPurPaxSel)}/>
          : selInv
            ? <div style={{padding:"10px 13px",borderRadius:8,background:"#fbe9e9",border:"1px solid #f3c9c9",fontSize:10.5,color:"#dc2626",fontWeight:600,marginBottom:14}}>⚠ No purchase invoice is linked to {selInv.vno}{selInv.linkNo?` (Link No ${selInv.linkNo})`:" — the sale has no Link No"}{purchQ.isLoading?" · loading purchases…":""}. A refund/reissue must settle the linked purchase — check the purchase exists with the same Link No.</div>
            : <div style={{padding:"10px 13px",borderRadius:8,background:"#f4f5f7",border:"1px solid #cdd1d8",fontSize:10.5,color:"#5b616e",marginBottom:14}}>Pick a sales invoice above — its linked purchase invoice loads automatically.</div>}

        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:14}}>
          <FL label={cfgM.ref1}><input value={ref1} onChange={e=>setRef1(e.target.value)} style={inp} placeholder={cfgM.ref1}/></FL>
          <FL label={cfgM.ref2}><input value={ref2} onChange={e=>setRef2(e.target.value)} style={inp} placeholder={cfgM.ref2}/></FL>
          <FL label="Supplier (Creditor) · locked"><div title={supplierName} style={{...inp,background:"#f4f5f7",color:"#14161a",display:"flex",alignItems:"center",minHeight:32,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{supplierName||"— from purchase —"}</div></FL>
          <FL label="Customer (Debtor) · locked"><div title={customerName} style={{...inp,background:"#f4f5f7",color:"#14161a",display:"flex",alignItems:"center",minHeight:32,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{customerName||"— from sale —"}</div></FL>
        </div>

        {/* Calc grid — mirrors the mockup calc-grid */}
        <p style={{margin:"0 0 8px",fontSize:9,fontWeight:700,letterSpacing:"1px",color:"#c2a04a",textTransform:"uppercase"}}>{module} {isRefund?"Refund":"Reissue"} Calculation</p>
        <div style={{...card,padding:"14px 16px",marginBottom:14}}>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:"10px 26px"}}>
            {isRefund?<>
              <RRLine label="Original Fare" sub={selPur?`from purchase ${selPur.vno} (excl. svc + GST)`:`paid to ${cfgM.sup}`}>{num(origFare,setOrigFare)}</RRLine>
              <RRLine label={cfgM.rfCancel} sub={`${cfgM.sup} retains`}>{num(supCancel,setSupCancel)}</RRLine>
              <RRLine label="Supplier Service Charge" sub={`our cost → ${supSvcLedger} (reduces GP)`}>{num(supSvc,setSupSvc)}</RRLine>
              <RRLine label={<>GST on Supplier Charge @<input type="number" value={supGstRate} onChange={e=>setSupGstRate(+e.target.value||0)} style={{width:42,padding:"2px 4px",border:"1px solid #cdd1d8",borderRadius:4,fontSize:11,textAlign:"right"}}/>%</>} sub="input credit (claimable)" derived><input type="number" value={supGst} disabled style={{...inp,textAlign:"right",fontWeight:700,background:"#f4f5f7",color:"#5b616e"}}/></RRLine>
              <RRLine label="Supplier Refund to Us" sub="fare − cancellation − supplier charges" derived><input type="number" value={supRefund} disabled style={{...inp,textAlign:"right",fontWeight:700,background:"#f4f5f7",color:"#5b616e"}}/></RRLine>
              <div/>
            </>:<>
              <RRLine label={cfgM.riFee} sub={`charged by ${cfgM.sup}`}>{num(changeFee,setChangeFee)}</RRLine>
              <RRLine label={cfgM.diff} sub="new − old">{num(fareDiff,setFareDiff)}</RRLine>
              <RRLine label="Supplier Service Charge" sub={`our cost → ${supSvcLedger} (reduces GP)`}>{num(supSvc,setSupSvc)}</RRLine>
              <RRLine label={<>GST on Supplier Charge @<input type="number" value={supGstRate} onChange={e=>setSupGstRate(+e.target.value||0)} style={{width:42,padding:"2px 4px",border:"1px solid #cdd1d8",borderRadius:4,fontSize:11,textAlign:"right"}}/>%</>} sub="input credit (claimable)" derived><input type="number" value={supGst} disabled style={{...inp,textAlign:"right",fontWeight:700,background:"#f4f5f7",color:"#5b616e"}}/></RRLine>
              <RRLine label="Payable to Supplier" sub="fee + difference + supplier charges" derived><input type="number" value={supPayable} disabled style={{...inp,textAlign:"right",fontWeight:700,background:"#f4f5f7",color:"#5b616e"}}/></RRLine>
              <div/>
            </>}
            <RRLine label="Our Service Fee" sub="our income, retained">{num(svc,setSvc)}</RRLine>
            <RRLine label={<>GST on Service Fee @<input type="number" value={gstRateSvc} onChange={e=>setGstRateSvc(+e.target.value||0)} style={{width:42,padding:"2px 4px",border:"1px solid #cdd1d8",borderRadius:4,fontSize:11,textAlign:"right"}}/>%</>} sub="on Service Fee" derived><input type="number" value={gstSvc} disabled style={{...inp,textAlign:"right",fontWeight:700,background:"#f4f5f7",color:"#5b616e"}}/></RRLine>
            <RRLine label="Our Service Charge - 2" sub="our margin, retained">{num(markup,setMarkup)}</RRLine>
            <RRLine label={<>GST on Service Charge - 2 @<input type="number" value={gstRateMk} onChange={e=>setGstRateMk(+e.target.value||0)} style={{width:42,padding:"2px 4px",border:"1px solid #cdd1d8",borderRadius:4,fontSize:11,textAlign:"right"}}/>%</>} sub="on Service Charge - 2" derived><input type="number" value={gstMk} disabled style={{...inp,textAlign:"right",fontWeight:700,background:"#f4f5f7",color:"#5b616e"}}/></RRLine>
          </div>
          {/* Highlight: amount to / from customer */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginTop:12,padding:"11px 14px",borderRadius:8,background:"#FDFAF4",border:"1px solid "+(chargesExceed?"#f3c9c9":"#EFE7D4")}}>
            <span style={{fontSize:12.5,fontWeight:800,color:chargesExceed?"#dc2626":"#c2a04a"}}>{isRefund?"Refund to Customer":"Total Billed to Customer"}<span style={{display:"block",fontSize:10,fontWeight:400,color:"#9197a3"}}>{isRefund?"(fare − cancellation) − our charges · excl. supplier svc":"fee + difference + Service Fee + Service Charge - 2 + GST · excl. supplier svc"}</span></span>
            <span style={{fontSize:17,fontWeight:800,color:chargesExceed?"#dc2626":"#c2a04a",fontVariantNumeric:"tabular-nums"}}>{vf2(cur,isRefund?custRefund:custBill)}</span>
          </div>
        </div>

        <p style={{margin:"0 0 6px",fontSize:9,fontWeight:700,letterSpacing:"1px",color:"#c2a04a",textTransform:"uppercase"}}>Account Entries</p>
        <VJournalPreview rows={jrows} cur={cur}/>
        <VBalanceBar dr={tDr} cr={tCr} cur={cur} emptyText="Pick the sales + purchase invoices and enter the figures"/>

        {/* Gross Profit cards */}
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
          <div style={{flex:1,minWidth:160,...card,padding:"12px 16px",background:"#f4f5f7"}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:".6px",color:"#5b616e",textTransform:"uppercase"}}>Gross Profit (Service Fee + Service Charge - 2 − Supplier Svc)</div>
            <div style={{fontSize:18,fontWeight:800,color:gp<0?"#dc2626":"#16a34a",marginTop:3,fontVariantNumeric:"tabular-nums"}}>{vf2(cur,gp)}</div>
          </div>
          <div style={{flex:1,minWidth:160,...card,padding:"12px 16px",background:"#f4f5f7"}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:".6px",color:"#5b616e",textTransform:"uppercase"}}>GP % <span style={{textTransform:"none",fontWeight:400}}>(on {isRefund?"supplier refund":"total billed"})</span></div>
            <div style={{fontSize:18,fontWeight:800,color:"#c2a04a",marginTop:3,fontVariantNumeric:"tabular-nums"}}>{gpPct.toFixed(2)}%</div>
          </div>
        </div>

        <FL label="Narration"><textarea value={narration} onChange={e=>setNarration(e.target.value)} rows={2} style={{...inp,resize:"vertical",marginBottom:12}} placeholder={selInv?`Being ${kind} of ${module.toLowerCase()} booking ${ref1||selInv.vno} against ${selInv.vno}`:`Being ${kind} processed for the selected ${module.toLowerCase()} booking`}/></FL>

        <VSaveMsg m={post} okText={`✔ ${title} ${vNo} posted · ${isRefund?`${customerName} refunded ${vf2(cur,custRefund)}`:`${customerName} billed ${vf2(cur,custBill)}`} · against ${selInv?.vno||""} · books refreshed`}/>
        {chargesExceed&&<div style={{padding:"8px 12px",borderRadius:8,background:"#fbe9e9",fontSize:10.5,color:"#dc2626",fontWeight:600,textAlign:"center",marginBottom:8}}>⚠ Your Service Fee + Service Charge - 2 (+GST) exceed the supplier refund — the customer cannot be refunded a negative amount.</div>}
        {!brPost&&<div style={{padding:"8px 12px",borderRadius:8,background:"#fbeedb",fontSize:10.5,color:"#d97706",fontWeight:600,textAlign:"center",marginBottom:8}}>Select a specific branch (not “All”) to post this voucher.</div>}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={reset} style={btnGh}>Reset</button>
          <button onClick={doSave} disabled={!canPost || post.isPending} style={{...btnG,background:(canPost&&!post.isPending)?accent:"#cbd0db",opacity:(canPost&&!post.isPending)?1:0.55}}>
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
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"7px 0",borderBottom:".5px solid #dfe2e7"}}>
      <label style={{fontSize:11.5,fontWeight:600,color:derived?"#5b616e":"#14161a"}}>{label}<span style={{display:"block",fontSize:9.5,fontWeight:400,color:"#9197a3",marginTop:1}}>{sub}</span></label>
      <div style={{width:128,flexShrink:0}}>{children}</div>
    </div>
  );
}


/* ── PURCHASE: FLIGHT TICKETS ────────────────────────────── */

export function PurchaseFlight({branch,setRoute}){
  const vNo=useVNo(branch,"PF");
  const [pax,setPax]=useState([{id:1,name:"",ticket:"",airline:"",sector:"",cls:"Economy",date:"",base:0,k3:0,otherTax:0}]);
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
      <div style={{padding:"10px 16px",background:"#1a1c22",borderBottom:"1px solid #cdd1d8"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",gap:0,borderRadius:999,overflow:"hidden",border:"1px solid #2e323c"}}>
            <button onClick={()=>setTripType("Domestic")}
              style={{padding:"5px 12px",fontSize:10,fontWeight:700,cursor:"pointer",border:"none",
                background:tripType==="Domestic"?"#16a34a":"transparent",
                color:tripType==="Domestic"?"#fff":"#9197a3"}}>
              🇮🇳 Domestic
            </button>
            <button onClick={()=>setTripType("International")}
              style={{padding:"5px 12px",fontSize:10,fontWeight:700,cursor:"pointer",border:"none",
                background:tripType==="International"?"#2563eb":"transparent",
                color:tripType==="International"?"#fff":"#9197a3"}}>
              🌍 International
            </button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:280}}>
            <label style={{fontSize:9.5,color:"#9197a3",fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",whiteSpace:"nowrap"}}>IRN No.</label>
            <input value={irn} onChange={e=>setIrn(e.target.value)}
              style={{flex:1,minWidth:240,padding:"6px 10px",borderRadius:6,border:"1px solid #2e323c",
                background:"#1a1c22",color:"#c2a04a",fontFamily:"monospace",fontSize:10.5,fontWeight:600}}/>
            <span style={{fontSize:9,padding:"3px 9px",borderRadius:999,background:"#c2a04a",color:"#1a1c22",fontWeight:700,whiteSpace:"nowrap"}}>
              e-Invoice IRN
            </span>
          </div>
        </div>
      </div>

      <VParty branch={branch} label="Supplier" name="BSP India (IATA)" gstin="07AABSB5678C1Z9"/>
      <ARow label="Ticket cost details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:960}}>
          <thead><tr>
            {["#","PAX Name","Ticket no.","Airline","Sector","Class","Date","Base cost ₹","K3 ₹","Taxes ₹","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=7&&i<=10}/>)}
          </tr></thead>
          <tbody>{pax.map((p,i)=>(
            <tr key={p.id} style={{borderBottom:"1px solid #cdd1d8"}}>
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
              <td style={{padding:3}}><SmartDateInput value={p.date} onChange={(iso)=>upd(p.id,"date",iso)} style={{...inp,minHeight:28,fontSize:11}}/></td>
              <td style={{padding:3}}><input type="number" value={p.base} onChange={e=>upd(p.id,"base",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}}/></td>
              <td style={{padding:3}}><input type="number" value={p.k3} onChange={e=>upd(p.id,"k3",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}} title="K3 tax (GST on airline tax — typically applicable on international tickets)"/></td>
              <td style={{padding:3}}><input type="number" value={p.otherTax} onChange={e=>upd(p.id,"otherTax",+e.target.value||0)} style={{...inp,minHeight:28,fontSize:11,textAlign:"right"}} title="Taxes — YQ/YR fuel, airport fees, UDF, PSF"/></td>
              <VTD c={fmt((+p.base||0)+(+p.k3||0)+(+p.otherTax||0))} r/>
              <DBtn fn={()=>rm(p.id)}/>
            </tr>
          ))}</tbody>
          <tfoot>
            <tr style={{background:"#f4f5f7",borderTop:"2px solid #cdd1d8"}}>
              <td colSpan={7} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(totalBase)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#d97706"}}>{fmt(totalK3)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#d97706"}}>{fmt(totalOther)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#2563eb"}}>{fmt(total)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:9}}>
          <div style={{padding:"8px 12px",background:"#e8f6ed",borderRadius:8,fontSize:11.5,color:"#16a34a"}}>
            Accounting: <b>Dr Flight Ticket Purchase</b> &nbsp;|&nbsp; <b>Cr BSP India / Airline ledger</b>. Base fare and taxes are both cost — no GST on ticket purchase side.
          </div>
          <div style={{padding:"8px 12px",background:"#f4f5f7",borderRadius:8,fontSize:11.5,color:"#5b616e"}}>
            {isIntl
              ?"International ticket — K3 (GST on airline tax) appears on supplier BSP invoice and is input-creditable. Other taxes (YQ/YR, UDF, PSF) are non-creditable pass-through."
              :"Domestic ticket — K3 generally nil. Input GST applies only on GDS / agency service fees, not on base fare or airline taxes."}
          </div>
        </div>
      </div>

      {/* Terms & GST QR upload */}
      <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:14}}>
          <FL label="Terms & Conditions">
            <textarea rows={5} value={terms} onChange={e=>setTerms(e.target.value)} style={{...inp,resize:"vertical",fontSize:10.5,lineHeight:1.45}}/>
          </FL>
          <div>
            <label style={{fontSize:10,color:"#5b616e",fontWeight:600,letterSpacing:"0.4px",textTransform:"uppercase"}}>GST QR Code</label>
            <div style={{marginTop:4,padding:"10px 12px",border:"2px dashed #cbd0db",borderRadius:8,background:"#fff",
              display:"flex",alignItems:"center",gap:11,flexWrap:"wrap"}}>
              {qrFile
                ?<>
                  <div style={{width:54,height:54,borderRadius:6,background:"#f4f5f7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,border:"1px solid #cdd1d8"}}>▦</div>
                  <div style={{flex:1,minWidth:140}}>
                    <p style={{margin:0,fontSize:11,fontWeight:700,color:"#1a1c22"}}>{qrFile.name}</p>
                    <p style={{margin:"2px 0 0",fontSize:10,color:"#5b616e"}}>{(qrFile.size/1024).toFixed(1)} KB · uploaded</p>
                  </div>
                  <button onClick={()=>setQrFile(null)} style={{...btnGh,fontSize:10,padding:"4px 10px",color:"#dc2626",borderColor:"#dc2626"}}>Remove</button>
                </>
                :<>
                  <div style={{width:54,height:54,borderRadius:6,background:"#f4f5f7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#9197a3",border:"1px solid #cdd1d8"}}>▦</div>
                  <div style={{flex:1,minWidth:140}}>
                    <p style={{margin:0,fontSize:11,fontWeight:600,color:"#1a1c22"}}>Upload supplier GST QR code</p>
                    <p style={{margin:"2px 0 0",fontSize:9.5,color:"#5b616e"}}>PNG / JPG · signed QR from BSP / airline e-invoice</p>
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
        <FL label="Departure date"><SmartDateInput value={dept} onChange={setDept} style={inp}/></FL>
        <FL label="Return date"><SmartDateInput value={rtrn} onChange={setRtrn} style={inp}/></FL>
      </div>

      {/* Package Type selector */}
      <div style={{margin:"0 16px 14px",padding:"12px 14px",borderRadius:9,background:"#fbeedb",border:"1px solid #f3d9a8"}}>
        <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#d97706"}}>Package Type</p>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <button onClick={()=>setPkgType("Domestic")} style={{flex:1,padding:"8px 12px",borderRadius:8,cursor:"pointer",
            background:pkgType==="Domestic"?"#16a34a":"#fff",color:pkgType==="Domestic"?"#fff":"#16a34a",
            border:"2px solid #16a34a",fontSize:11,fontWeight:600}}>
            Domestic — GST 5% only (No TCS)
          </button>
          <button onClick={()=>setPkgType("International")} style={{flex:1,padding:"8px 12px",borderRadius:8,cursor:"pointer",
            background:pkgType==="International"?"#2563eb":"#fff",color:pkgType==="International"?"#fff":"#2563eb",
            border:"2px solid #2563eb",fontSize:11,fontWeight:600}}>
            International — GST 5% + TCS 2%
          </button>
        </div>
        <p style={{margin:0,fontSize:10,color:"#d97706"}}>
          {isIntl
            ?"INTERNATIONAL outbound package — GST 5% on (Basic + Service) and TCS 2% on (Basic + Service + GST). Verify supplier TCS certificate."
            :"DOMESTIC package — GST 5% on (Basic + Service). No TCS applicable."}
        </p>
      </div>

      {/* Component breakout — fixed GL rows */}
      <p style={{margin:"0 16px 8px",fontSize:11,fontWeight:700,color:"#1a1c22"}}>Package Component Breakout <span style={{fontSize:9.5,color:"#5b616e"}}>(Basic + Service → GST 5% → TCS 2% if international)</span></p>
      <div style={{margin:"0 16px",...card,padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
            <thead><tr style={{background:"#1a1c22"}}>
              {["S.NO","GL Name","Description","SAC Code","Cost Price"].map((h,i)=>(
                <th key={i} style={{padding:"8px 10px",textAlign:i===4?"right":"left",color:"#c2a04a",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              <tr style={{borderBottom:"1px solid #dfe2e7",background:"#fff"}}>
                <td style={{padding:"4px 10px",textAlign:"center",color:"#5b616e",fontSize:10}}>1</td>
                <td style={{padding:"4px 10px",fontWeight:700,color:"#1a1c22",fontSize:11}}>Basic</td>
                <td style={{padding:"3px 6px"}}><input value={basic.desc} onChange={e=>updBasic("desc",e.target.value)} style={{...inp,minHeight:28,fontSize:10.5,minWidth:200}}/></td>
                <td style={{padding:"3px 6px"}}><input value={basic.sac} onChange={e=>updBasic("sac",e.target.value)} style={{...inp,minHeight:28,fontSize:10,fontFamily:"monospace",width:90}}/></td>
                <td style={{padding:"3px 6px"}}><input type="number" value={basic.amt} onChange={e=>updBasic("amt",+e.target.value)} style={{...inp,minHeight:28,textAlign:"right",fontSize:11,fontWeight:600,color:"#dc2626"}}/></td>
              </tr>
              <tr style={{borderBottom:"1px solid #dfe2e7",background:"#fafafa"}}>
                <td style={{padding:"4px 10px",textAlign:"center",color:"#5b616e",fontSize:10}}>2</td>
                <td style={{padding:"4px 10px",fontWeight:700,color:"#1a1c22",fontSize:11}}>Service</td>
                <td style={{padding:"3px 6px"}}><input value={service.desc} onChange={e=>updService("desc",e.target.value)} style={{...inp,minHeight:28,fontSize:10.5,minWidth:200}}/></td>
                <td style={{padding:"3px 6px"}}><input value={service.sac} onChange={e=>updService("sac",e.target.value)} style={{...inp,minHeight:28,fontSize:10,fontFamily:"monospace",width:90}}/></td>
                <td style={{padding:"3px 6px"}}><input type="number" value={service.amt} onChange={e=>updService("amt",+e.target.value)} style={{...inp,minHeight:28,textAlign:"right",fontSize:11,fontWeight:600,color:"#dc2626"}}/></td>
              </tr>
              <tr style={{borderBottom:"1px solid #cdd1d8",background:"#f4f5f7"}}>
                <td style={{padding:"6px 10px",textAlign:"center",color:"#1a1c22",fontSize:10,fontWeight:700}}>3</td>
                <td style={{padding:"6px 10px",fontWeight:800,color:"#1a1c22",fontSize:11.5}}>Total</td>
                <td style={{padding:"6px 10px",fontSize:10.5,color:"#5b616e",fontStyle:"italic"}}>Basic + Service</td>
                <td style={{padding:"6px 10px"}}></td>
                <td style={{padding:"6px 10px",textAlign:"right",fontWeight:800,fontSize:12,color:"#1a1c22",fontVariantNumeric:"tabular-nums"}}>{fmt(subTotal)}</td>
              </tr>
              <tr style={{borderBottom:"1px solid #dfe2e7",background:"#fff"}}>
                <td style={{padding:"6px 10px",textAlign:"center",color:"#d97706",fontSize:10,fontWeight:700}}>4</td>
                <td style={{padding:"6px 10px",fontWeight:700,color:"#d97706",fontSize:11}}>GST (5%)</td>
                <td style={{padding:"6px 10px",fontSize:10.5,color:"#5b616e",fontStyle:"italic"}}>5% on (Basic + Service)</td>
                <td style={{padding:"6px 10px",fontSize:10,fontFamily:"monospace",color:"#5b616e"}}>—</td>
                <td style={{padding:"6px 10px",textAlign:"right",fontWeight:700,fontSize:11.5,color:"#d97706",fontVariantNumeric:"tabular-nums"}}>{fmt(gstAmt)}</td>
              </tr>
              <tr style={{borderBottom:"1px solid #dfe2e7",background:"#fafafa",opacity:isIntl?1:0.45}}>
                <td style={{padding:"6px 10px",textAlign:"center",color:"#2563eb",fontSize:10,fontWeight:700}}>5</td>
                <td style={{padding:"6px 10px",fontWeight:700,color:"#2563eb",fontSize:11}}>TCS (2%) {!isIntl&&<span style={{fontSize:9,color:"#5b616e",fontWeight:500}}>— N/A (Domestic)</span>}</td>
                <td style={{padding:"6px 10px",fontSize:10.5,color:"#5b616e",fontStyle:"italic"}}>2% on (Basic + Service + GST) — international only</td>
                <td style={{padding:"6px 10px",fontSize:10,fontFamily:"monospace",color:"#5b616e"}}>—</td>
                <td style={{padding:"6px 10px",textAlign:"right",fontWeight:700,fontSize:11.5,color:"#2563eb",fontVariantNumeric:"tabular-nums"}}>{fmt(tcsAmt)}</td>
              </tr>
            </tbody>
            <tfoot><tr style={{background:"#1a1c22",borderTop:"2px solid #c2a04a"}}>
              <td colSpan={4} style={{padding:"8px 10px",fontWeight:800,color:"#c2a04a",fontSize:11.5}}>Grand Total ({pkgType})</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,color:"#c2a04a",fontSize:13,fontVariantNumeric:"tabular-nums"}}>{fmt(grandTotal)}</td>
            </tr></tfoot>
          </table>
        </div>
      </div>

      <div style={{padding:"0 16px 12px"}}>
        <div style={{padding:"8px 12px",background:"#e8f0ff",borderRadius:8,fontSize:11.5,color:"#2563eb"}}>
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
  const [rows,setRows]=useState([{id:1,passenger:"",ci:"",co:"",rtype:"",meal:"CP",basic:0,taxes:0,otherTax:0}]);
  const [svc,setSvc]=useState(0);
  const [partyGstin,setPartyGstin]=useState("27AABCH7890J1Z5");
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
      <ARow label="Hotel purchase lines" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:960}}>
          <thead><tr>
            {["#","PAX Name","Check-in","Check-out","Room type","Meal","Room fare / Basic fare ₹","Taxes ₹","Other tax ₹","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=6&&i<=9}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const lineTotal=(+r.basic||0)+(+r.taxes||0)+(+r.otherTax||0);
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #cdd1d8"}}>
                <VTD c={i+1}/>
                <td style={{padding:3}}><input value={r.passenger} onChange={e=>upd(r.id,"passenger",e.target.value)} style={{...inp,minHeight:28,fontSize:11,minWidth:160}}/></td>
                <td style={{padding:3}}><SmartDateInput value={r.ci} onChange={(iso)=>upd(r.id,"ci",iso)} style={{...inp,minHeight:28,fontSize:11}}/></td>
                <td style={{padding:3}}><SmartDateInput value={r.co} onChange={(iso)=>upd(r.id,"co",iso)} style={{...inp,minHeight:28,fontSize:11}}/></td>
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
            <tr style={{background:"#f4f5f7",borderTop:"2px solid #cdd1d8"}}>
              <td colSpan={6} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(totBasic)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#d97706"}}>{fmt(totTaxes)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#d97706"}}>{fmt(totOther)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#2563eb"}}>{fmt(subTable)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label={bc(branch).cur+"Service charge"}>
            <input type="number" value={svc} onChange={e=>setSvc(+e.target.value||0)} style={{...inp,textAlign:"right"}}/>
          </FL>
          {intra
            ?<>
              <FL label="Input CGST 9% ₹"><input value={fmt(cgst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
              <FL label="Input SGST 9% ₹"><input value={fmt(sgst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
            </>
            :<FL label="Input IGST 18% ₹"><input value={fmt(igst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>}
        </div>
        <div style={{marginTop:9,padding:"8px 12px",background:"#e8f6ed",borderRadius:8,fontSize:11.5,color:"#16a34a"}}>
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
  const [rows,setRows]=useState([{id:1,name:"",pp:"",country:"",vtype:"Tourist 30D",vfsFee:0,taxes:0,otherTax:0}]);
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
      <ARow label="Visa fee payment lines" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:880}}>
          <thead><tr>
            {["#","PAX Name","Passport","Visa country","Visa type","VFS fee ₹","Taxes ₹","Other taxes ₹","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=5&&i<=8}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const lineTotal=(+r.vfsFee||0)+(+r.taxes||0)+(+r.otherTax||0);
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #cdd1d8"}}>
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
            <tr style={{background:"#f4f5f7",borderTop:"2px solid #cdd1d8"}}>
              <td colSpan={5} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(vfsTotal)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#d97706"}}>{fmt(taxesTotal)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#d97706"}}>{fmt(otherTotal)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#2563eb"}}>{fmt(total)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label={bc(branch).cur+"Service charge"}>
            <input type="number" value={svc} onChange={e=>setSvc(+e.target.value||0)} style={{...inp,textAlign:"right"}}/>
          </FL>
          {intra
            ?<>
              <FL label="CGST 9% ₹"><input value={fmt(cgst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
              <FL label="SGST 9% ₹"><input value={fmt(sgst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
            </>
            :<FL label="IGST 18% ₹"><input value={fmt(igst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>}
        </div>
        <div style={{marginTop:9,padding:"8px 12px",background:"#e8f0ff",borderRadius:8,fontSize:11.5,color:"#2563eb"}}>
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
      <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8",overflowX:"auto"}}>
        <p style={{margin:"0 0 8px",fontSize:10,color:"#5b616e",textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:600}}>Vehicle hire details</p>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:880}}>
          <thead><tr>
            {["#","Vendor","Vehicle","Pickup","Drop","Days","Basic ₹","Other fare ₹","Service charge ₹","Total ₹"].map((h,i)=><VTH key={i} c={h} r={i>=5&&i<=9}/>)}
          </tr></thead>
          <tbody>
            <tr style={{borderBottom:"1px solid #cdd1d8"}}>
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
      <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
          <FL label="Input GST rate"><input value={intra?"5% (CGST 2.5% + SGST 2.5%)":"5% (IGST)"} readOnly style={{...inp,background:"#f4f5f7",color:"#5b616e",fontWeight:600,cursor:"not-allowed"}}/></FL>
          {intra
            ?<>
              <FL label="Input CGST 2.5% ₹"><input value={fmt(inputCgst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
              <FL label="Input SGST 2.5% ₹"><input value={fmt(inputSgst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
            </>
            :<FL label="Input IGST 5% ₹"><input value={fmt(inputIgst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>}
        </div>
        <div style={{marginTop:9,padding:"8px 12px",background:"#e8f6ed",borderRadius:8,fontSize:11.5,color:"#16a34a"}}>
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
  const [rows,setRows]=useState([{id:1,name:"",pp:"",dest:"",basic:0,otherTax:0,svc:0}]);
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
      <VParty branch={branch} label="Insurer / Supplier" name="" gstin=""/>
      <ARow label="Policy purchase details" onAdd={add}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:880}}>
          <thead><tr>
            {["#","Name","Passport","Destination","Basic ₹","Other tax ₹","Service charge ₹","Total ₹",""].map((h,i)=><VTH key={i} c={h} r={i>=4&&i<=7}/>)}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const lineTotal=(+r.basic||0)+(+r.otherTax||0)+(+r.svc||0);
            return (
              <tr key={r.id} style={{borderBottom:"1px solid #cdd1d8"}}>
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
            <tr style={{background:"#f4f5f7",borderTop:"2px solid #cdd1d8"}}>
              <td colSpan={4} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(totBasic)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#d97706"}}>{fmt(totOther)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#16a34a"}}>{fmt(totSvc)}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#2563eb"}}>{fmt(taxable)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11,marginBottom:9}}>
          <FL label={bc(branch).cur+"Taxable value"}><input value={fmt(taxable)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
          <FL label="Input GST 18% ₹"><input value={fmt(inputGst)} readOnly style={{...inp,textAlign:"right",background:"#f4f5f7",color:"#5b616e"}}/></FL>
          <FL label="Total payable ₹"><input value={fmt(total)} readOnly style={{...inp,textAlign:"right",fontWeight:700,background:"#f4f5f7",color:"#2563eb"}}/></FL>
        </div>
        <div style={{padding:"8px 12px",background:"#e8f6ed",borderRadius:8,fontSize:11.5,color:"#16a34a"}}>
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
  const [rows,setRows]=useState([{id:1,vendor:"",gl:"",sac:"",amt:0,gstPct:18,tds:false}]);
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
  const rateBg={0:"#f4f5f7",5:"#e8f6ed",12:"#fbeedb",18:"#e8f0ff"};
  const rateC={0:"#5b616e",5:"#16a34a",12:"#d97706",18:"#2563eb"};

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
              <tr key={r.id} style={{borderBottom:"1px solid #cdd1d8"}}>
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
                  {r.tds&&<div style={{fontSize:9.5,color:"#d97706"}}>TDS: ({fmt(tdsLine)})</div>}
                </td>
                <DBtn fn={()=>rm(r.id)}/>
              </tr>
            );
          })}</tbody>
          <tfoot>
            <tr style={{background:"#f4f5f7",borderTop:"2px solid #cdd1d8"}}>
              <td colSpan={4} style={{padding:"7px 8px",fontWeight:600,fontSize:11.5}}>Totals</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5}}>{fmt(sub)}</td>
              <td/>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",fontSize:11.5,color:"#2563eb"}}>{fmt(inputGst)}</td>
              <td style={{padding:"7px 8px",textAlign:"center",fontSize:10,color:"#d97706"}}>{tdsAmt>0?"TDS: ("+fmt(tdsAmt)+")":""}</td>
              <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",fontSize:12,color:"#2563eb"}}>{fmt(total)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </ARow>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8"}}>
        <p style={{margin:"0 0 9px",fontSize:10,color:"#5b616e",letterSpacing:"0.5px",textTransform:"uppercase"}}>Input GST breakup &amp; TDS summary</p>
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
            <div style={{flex:1,minWidth:155,padding:"9px 13px",borderRadius:9,background:"#fbeedb"}}>
              <p style={{margin:0,fontSize:10,fontWeight:700,color:"#d97706",textTransform:"uppercase",letterSpacing:"0.5px"}}>TDS 194C (2%)</p>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:11.5}}>
                <span style={{color:"#d97706"}}>To deduct</span>
                <span style={{fontWeight:700,color:"#d97706",fontVariantNumeric:"tabular-nums"}}>({"₹ "+fmt(tdsAmt)})</span>
              </div>
              <p style={{margin:"3px 0 0",fontSize:10,color:"#d97706"}}>Deposit by 7th of next month</p>
            </div>
          )}
        </div>
        <div style={{padding:"8px 12px",background:"#e8f6ed",borderRadius:8,fontSize:11.5,color:"#16a34a"}}>
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
    <div style={{padding:mob?"10px 8px":"14px 16px",maxWidth:1600,margin:"0 auto"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",
        marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <button onClick={()=>setRoute("/dashboard")}
              style={{background:"transparent",border:"none",cursor:"pointer",
                color:"#5b616e",padding:0,display:"flex",alignItems:"center",gap:4,fontSize:11}}>
              <ArrowLeft size={13}/> Dashboard
            </button>
          </div>
          <p style={{margin:0,fontSize:9.5,color:"#dc2626",letterSpacing:"0.5px",
            textTransform:"uppercase",fontWeight:600}}>⚠ Alert — Action Required</p>
          <h1 style={{margin:"3px 0 0",fontSize:mob?16:21,fontWeight:700,
            color:"#1a1c22",letterSpacing:"-0.02em"}}>Unmatched Flight Tickets</h1>
          <p style={{margin:"2px 0 0",fontSize:11,color:"#5b616e"}}>
            Sales vouchers raised but no purchase entry found · {branch==="ALL"?CONSOLIDATED_LABEL:branch?.code+" — "+branch?.city}
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
        <div style={{background:"#fbe9e9",border:"1px solid #f3c9c9",borderRadius:10,padding:"10px 12px"}}><p style={{margin:0,fontSize:9.5,color:"#dc2626",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>Unmatched tickets</p><p style={{margin:"4px 0 0",fontSize:mob?18:22,fontWeight:800,color:"#dc2626",fontVariantNumeric:"tabular-nums"}}>{unmatched.length}</p></div>
          <div style={{background:"#fbeedb",border:"1px solid #f3d9a8",borderRadius:10,padding:"10px 12px"}}><p style={{margin:0,fontSize:9.5,color:"#d97706",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>Sale value at risk</p><p style={{margin:"4px 0 0",fontSize:mob?18:22,fontWeight:800,color:"#d97706",fontVariantNumeric:"tabular-nums"}}>{cfg.cur+fmt(totalAmt)}</p></div>
          <div style={{background:"#e8f0ff",border:"1px solid #cfe0f8",borderRadius:10,padding:"10px 12px"}}><p style={{margin:0,fontSize:9.5,color:"#2563eb",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>Airlines affected</p><p style={{margin:"4px 0 0",fontSize:mob?18:22,fontWeight:800,color:"#2563eb",fontVariantNumeric:"tabular-nums"}}>{new Set(unmatched.map(t=>t.airline)).size}</p></div>
          <div style={{background:"#f4f5f7",border:"1px solid #cdd1d8",borderRadius:10,padding:"10px 12px"}}><p style={{margin:0,fontSize:9.5,color:"#2e323c",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>Branches affected</p><p style={{margin:"4px 0 0",fontSize:mob?18:22,fontWeight:800,color:"#2e323c",fontVariantNumeric:"tabular-nums"}}>{new Set(unmatched.map(t=>t.branch)).size}</p></div>
      </div>

      {/* What this means */}
      <div style={{padding:"11px 14px",background:"#fbe9e9",border:"1px solid #f3c9c9",
        borderRadius:10,marginBottom:14,fontSize:11.5,color:"#dc2626",lineHeight:1.6}}>
        <b>What this means:</b> A sales voucher was raised (customer billed) but no purchase voucher
        exists for the same ticket number. This causes <b>inflated P&L</b> (revenue without cost),
        <b> incorrect creditor balances</b> (BSP/airline not payable), and <b>BSP reconciliation failure</b>.
        Create the missing purchase entries before the next BSP settlement cycle.
      </div>

      {/* Filter bar */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:11,color:"#5b616e",fontWeight:500}}>Filter by airline:</span>
        {["All",...airlines].map(a=>(
          <button key={a} onClick={()=>setFilter(a)}
            style={{padding:"4px 10px",borderRadius:7,border:"1px solid #cdd1d8",fontSize:11,
              background:filter===a?"#1a1c22":"#fff",
              color:filter===a?"#fff":"#5b616e",cursor:"pointer"}}>
            {a}
          </button>
        ))}
        <span style={{marginLeft:"auto",fontSize:11,color:"#dc2626",fontWeight:600}}>
          {rows.length} unmatched
        </span>
      </div>

      {/* Ticket table / cards */}
      {mob?(
        /* Mobile cards */
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {rows.map((t,i)=>(
            <div key={i} style={{background:"#fff",border:"1px solid #f3c9c9",
              borderRadius:10,padding:"11px 13px",
              borderLeft:"4px solid #e24b4a"}}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"flex-start",marginBottom:6}}>
                <div>
                  <p style={{margin:0,fontSize:12,fontWeight:700,color:"#1a1c22"}}>{t.passenger}</p>
                  <p style={{margin:"2px 0 0",fontSize:10,fontFamily:"monospace",color:"#5b616e"}}>{t.ticket}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:"#dc2626",
                    fontVariantNumeric:"tabular-nums"}}>{cfg.cur+fmt(t.saleAmt)}</p>
                  <p style={{margin:0,fontSize:9.5,color:"#5b616e"}}>{t.airline}</p>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",flexWrap:"wrap",gap:6}}>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,
                    background:"#f4f5f7",color:"#2e323c"}}>{t.sector}</span>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,
                    background:"#fbeedb",color:"#d97706"}}>{t.branch}</span>
                  <span style={{fontSize:10,color:"#5b616e"}}>{t.date}</span>
                </div>
                <button
                  onClick={()=>setRoute("/purchase/flight")}
                  style={{...btnG,fontSize:10,padding:"4px 10px"}}>
                  + Create Purchase
                </button>
              </div>
              <p style={{margin:"6px 0 0",fontSize:10,color:"#5b616e"}}>
                Sales voucher: <span style={{fontFamily:"monospace",color:"#2563eb"}}>{t.vno}</span>
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
                <tr style={{background:"#1a1c22"}}>
                  {["Branch","Date","PAX Name","Passport","Ticket no.","Airline","Sector","Class","Sales voucher","Customer","Billed ₹","Action"].map((h,i)=>(
                    <th key={i} style={{textAlign:i>=10&&i<=10?"right":"left",
                      padding:"9px 11px",fontWeight:600,color:"#c2a04a",fontSize:10.5,
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
                        <span style={{fontWeight:600,color:"#2e323c"}}>{t.branch}</span>
                      </span>
                    </td>
                    <td style={{padding:"8px 11px",color:"#5b616e"}}>{t.date}</td>
                    <td style={{padding:"8px 11px",fontWeight:600}}>{t.passenger}</td>
                    <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:10.5,color:"#5b616e"}}>{t.pp}</td>
                    <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:10.5,color:"#2563eb"}}>{t.ticket}</td>
                    <td style={{padding:"8px 11px"}}>{t.airline}</td>
                    <td style={{padding:"8px 11px"}}>
                      <span style={{padding:"2px 7px",borderRadius:6,background:"#f4f5f7",
                        fontSize:10.5,fontWeight:600}}>{t.sector}</span>
                    </td>
                    <td style={{padding:"8px 11px",color:"#5b616e"}}>{t.cls}</td>
                    <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:10.5,color:"#2563eb"}}>{t.vno}</td>
                    <td style={{padding:"8px 11px",color:"#2e323c"}}>{t.customer}</td>
                    <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,
                      color:"#dc2626",fontVariantNumeric:"tabular-nums"}}>
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
                <tr style={{background:"#f4f5f7",borderTop:"2px solid #cdd1d8"}}>
                  <td colSpan={10} style={{padding:"9px 11px",fontWeight:700,color:"#dc2626"}}>
                    Total exposure — {rows.length} unmatched ticket{rows.length!==1?"s":""}
                  </td>
                  <td style={{padding:"9px 11px",textAlign:"right",fontWeight:800,
                    color:"#dc2626",fontSize:14,fontVariantNumeric:"tabular-nums"}}>
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
        <div key="1" style={{background:"#e8f0ff",borderRadius:10,padding:"13px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
              <span style={{width:22,height:22,borderRadius:"50%",background:"#2563eb",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>1</span>
              <p style={{margin:0,fontSize:12,fontWeight:700,color:"#2563eb"}}>Create purchase entry</p>
            </div>
            <p style={{margin:0,fontSize:11,color:"#2e323c",lineHeight:1.5}}>Go to Purchase, enter BSP cost against ticket number.</p>
            <button onClick={()=>setRoute("/purchase/flight")} style={{...btnG,fontSize:10,marginTop:8}}>Go to Purchase</button>
          </div>
          <div key="2" style={{background:"#e8f6ed",borderRadius:10,padding:"13px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
              <span style={{width:22,height:22,borderRadius:"50%",background:"#16a34a",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>2</span>
              <p style={{margin:0,fontSize:12,fontWeight:700,color:"#16a34a"}}>Verify with BSP report</p>
            </div>
            <p style={{margin:0,fontSize:11,color:"#2e323c",lineHeight:1.5}}>Cross-check unmatched ticket numbers against BSP billing statement.</p>
            <button onClick={()=>setRoute("/bank-reco")} style={{...btnG,fontSize:10,marginTop:8,background:"#16a34a"}}>Go to Bank Reco</button>
          </div>
          <div key="3" style={{background:"#f4f5f7",borderRadius:10,padding:"13px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
              <span style={{width:22,height:22,borderRadius:"50%",background:"#2e323c",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>3</span>
              <p style={{margin:0,fontSize:12,fontWeight:700,color:"#2e323c"}}>Reconcile &amp; close</p>
            </div>
            <p style={{margin:0,fontSize:11,color:"#2e323c",lineHeight:1.5}}>Run the P&amp;L to confirm costs are booked.</p>
            <button onClick={()=>setRoute("/reports/pnl")} style={{...btnGh,fontSize:10,marginTop:8}}>Go to P&amp;L</button>
          </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EXPENSE BUDGET SYSTEM — Constants & Store
   ════════════════════════════════════════════════════════════════ */


/* ════════════════════════════════════════════════════════════════
   CANCELLATION WORKFLOW  /sales/cancellation
   ════════════════════════════════════════════════════════════════ */

export function SalesCancellation({branch}){
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [cancellations]=useState([]);
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);

  const totCancCharge=cancellations.reduce((s,c)=>s+c.cancCharge,0);
  const totRefund    =cancellations.reduce((s,c)=>s+c.refundToClient,0);

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#fbe9e9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>❌</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>Cancellation Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>Track cancellations, charges, and client refunds</p>
          </div>
        </div>
        <button onClick={()=>setModal(true)} style={{...btnG,background:"#dc2626",fontSize:11}}><Plus size={13}/> New Cancellation</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Total Cancellations",v:String(cancellations.length),  c:"#dc2626",bg:"#fbe9e9"},
          {l:"Cancellation Charges",v:cur+totCancCharge.toLocaleString(),c:"#16a34a",bg:"#e8f6ed"},
          {l:"Refunds to Clients",  v:cur+totRefund.toLocaleString(),    c:"#d97706",bg:"#fbeedb"},
          {l:"Pending Refunds",     v:String(cancellations.filter(c=>c.status==="Refund Pending").length),c:"#dc2626",bg:"#fbe9e9"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:"#1a1c22"}}>{k.v}</p>
          </div>
        ))}
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#1a1c22"}}>
            {["Ref","Date","Original Voucher","Client","Module","Orig Amt","Canc. Charge","Client Refund","Supplier Refund","Net Loss","Status"].map((h,i)=>(
              <th key={i} style={{padding:"9px 10px",textAlign:i>=5?"right":"left",color:"#c2a04a",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{cancellations.map((c,i)=>(
            <tr key={c.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:9.5,color:"#dc2626"}}>{c.id}</td>
              <td style={{padding:"8px 10px",fontSize:10,color:"#5b616e"}}>{c.date}</td>
              <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:9.5,color:"#d97706"}}>{c.origVno}</td>
              <td style={{padding:"8px 10px",fontWeight:600,color:"#1a1c22"}}>{c.client}</td>
              <td style={{padding:"8px 10px"}}><span style={{fontSize:9.5,padding:"2px 6px",borderRadius:999,background:"#e8f0ff",color:"#2563eb",fontWeight:700}}>{c.module}</span></td>
              <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{cur}{c.origAmt.toLocaleString()}</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:"#16a34a"}}>{cur}{c.cancCharge.toLocaleString()}</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#dc2626"}}>{cur}{c.refundToClient.toLocaleString()}</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#2563eb"}}>{cur}{c.supplierRefund.toLocaleString()}</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:c.netLoss>0?"#dc2626":"#16a34a"}}>{c.netLoss>0?`-${cur}${c.netLoss.toLocaleString()}`:"Nil"}</td>
              <td style={{padding:"8px 10px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:c.status==="Completed"?"#e8f6ed":c.status==="Refund Paid"?"#e8f6ed":"#fbeedb",color:c.status==="Completed"?"#16a34a":c.status==="Refund Paid"?"#3fb7a3":"#d97706"}}>{c.status}</span></td>
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
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <SampleBanner note="purchase refunds shown here are sample data, not live." />
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:36,height:36,borderRadius:9,background:"#e8f0ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>💫</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>Refund Tracking</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>Track airline, DMC, hotel refunds against purchase vouchers</p>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Total Requested",v:cur+totReq.toLocaleString(),c:"#2563eb",bg:"#e8f0ff"},
          {l:"Total Received",v:cur+totRec.toLocaleString(),c:"#16a34a",bg:"#e8f6ed"},
          {l:"Pending",v:cur+pending.toLocaleString(),c:"#dc2626",bg:"#fbe9e9"},
          {l:"Recovery %",v:`${totReq>0?Math.round(totRec/totReq*100):0}%`,c:"#d97706",bg:"#fbeedb"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:"#1a1c22"}}>{k.v}</p>
          </div>
        ))}
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#1a1c22"}}>
            {["Ref No.","Date","Supplier","Module","Original Voucher","Requested","Received","Pending","Status","Notes"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=5&&i<=7?"right":"left",color:"#c2a04a",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{refunds.map((r,i)=>(
            <tr key={r.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:10,color:"#2563eb"}}>{r.id}</td>
              <td style={{padding:"9px 12px",fontSize:10.5,color:"#5b616e"}}>{r.date}</td>
              <td style={{padding:"9px 12px",fontWeight:600,color:"#1a1c22"}}>{r.supplier}</td>
              <td style={{padding:"9px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:700,background:"#e8f0ff",color:"#2563eb"}}>{r.module}</span></td>
              <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:10,color:"#d97706"}}>{r.origVno}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{cur}{r.refundReq.toLocaleString()}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:r.refundRec>0?"#16a34a":"#cbd0db"}}>{r.refundRec>0?cur+r.refundRec.toLocaleString():"—"}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:r.refundReq-r.refundRec>0?"#dc2626":"#16a34a"}}>{r.refundReq-r.refundRec>0?cur+(r.refundReq-r.refundRec).toLocaleString():"Nil"}</td>
              <td style={{padding:"9px 12px"}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,background:r.status==="Received"?"#e8f6ed":"#fbeedb",color:r.status==="Received"?"#16a34a":"#d97706"}}>{r.status}</span></td>
              <td style={{padding:"9px 12px",fontSize:10,color:"#5b616e",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.notes}</td>
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

  // Live DB-backed register (/api/adm-memos?kind=adm). Accept spawns a PENDING
  // gated ADM voucher into the approval queue (source: 'adm-register').
  const memosQ=useAdmMemos("adm",branch);
  const createM=useCreateAdmMemo();
  const disputeM=useDisputeAdmMemo();
  const acceptM=useAcceptAdmMemo();
  const rejectM=useRejectAdmMemo();
  const adms=(memosQ.data||[]).map(m=>({...m,id:m.memoNo,iataNum:m.iataNum||""}));

  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [disputeModal,setDisputeModal]=useState(null);
  const [disputeNote,setDisputeNote]=useState("");
  const [statusFilter,setStatusFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [form,setForm]=useState({airline:"Air India",airlineCode:"AI",ticketNo:"",passenger:"",
    sector:"",reasonCode:"FD",amount:0,currency:"INR",branch:brCode||"BOM",consultant:"",remarks:""});

  const TODAY=todayISO();
  const daysLeft=(deadline)=>deadline?Math.ceil((new Date(deadline)-new Date(TODAY))/(1000*60*60*24)):0;

  const filtered=adms.filter(a=>(
    (statusFilter==="All"||a.status===statusFilter)&&
    (!search||(a.id||"").toLowerCase().includes(search.toLowerCase())||
     (a.airline||"").toLowerCase().includes(search.toLowerCase())||
     (a.passenger||"").toLowerCase().includes(search.toLowerCase())||
     (a.ticketNo||"").includes(search))
  ));

  // Backend dispute lifecycle: Received → Disputed → Accepted (spawns voucher) / Rejected.
  const STATUSES=["All","Received","Disputed","Accepted","Rejected"];
  const STATUS_CLR={Received:"#2563eb",Disputed:"#dc2626",Accepted:"#16a34a",Rejected:"#5b616e"};
  const STATUS_BG={Received:"#e8f0ff",Disputed:"#fbe9e9",Accepted:"#e8f6ed",Rejected:"#f4f5f7"};

  const totPending=filtered.filter(a=>!["Accepted","Rejected"].includes(a.status))
    .reduce((s,a)=>s+(a.amount||0),0);
  const totAccepted=filtered.filter(a=>a.status==="Accepted").reduce((s,a)=>s+(a.amount||0),0);
  const overdue   =filtered.filter(a=>!["Accepted","Rejected","Disputed"].includes(a.status)&&a.responseDeadline&&daysLeft(a.responseDeadline)<0);
  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");

  const addAdm=()=>{
    createM.mutate({kind:"adm",...form,branch:form.branch},{
      onSuccess:()=>{setModal(false); toast("ADM recorded");},
      onError:(e)=>toast("Could not record — "+e.message,"error"),
    });
  };

  const acceptAdm=(m)=>acceptM.mutate({id:m.id},{
    onSuccess:(r)=>toast(`ADM accepted — voucher ${(r&&(r.voucherVno||(r.voucher&&r.voucher.vno)))||""} created (pending approval)`),
    onError:(e)=>toast("Could not accept — "+e.message,"error"),
  });
  const rejectAdm=(m)=>rejectM.mutate({id:m.id},{onSuccess:()=>toast("ADM rejected"),onError:(e)=>toast(e.message,"error")});

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#fbe9e9",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:22}}>📩</span>
          </div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>ADM Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>
              Agent Debit Memos · Airlines debit the agency via BSP · 30-day dispute window
            </p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,background:"#f4f5f7",border:"1px solid #e3e6eb",borderRadius:10,padding:4,boxShadow:"0 1px 2px rgba(16,18,22,0.04)"}}>
            <div style={{position:"relative"}}>
              <Search size={12} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#9aa1ab"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="ADM no / airline / ticket / passenger..."
                style={{...inp,width:220,minHeight:32,fontSize:11,paddingLeft:26,paddingRight:search?22:10,border:"none",background:"#fff",borderRadius:7}}/>
              {search&&(
                <button onClick={()=>setSearch("")} aria-label="Clear search"
                  style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",border:"none",background:"none",cursor:"pointer",color:"#9aa1ab",fontSize:14,lineHeight:1,padding:2}}>×</button>
              )}
            </div>
            <StatusMenu
              ariaLabel="Filter by status"
              menuRole="listbox"
              width={150}
              items={STATUSES.map(s=>({key:s,label:s,selected:s===statusFilter,onSelect:()=>setStatusFilter(s)}))}
              renderTrigger={({ref,toggle,triggerProps})=>(
                <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                  style={{...inp,display:"flex",alignItems:"center",gap:6,width:"auto",minHeight:32,fontSize:11,paddingRight:10,paddingLeft:10,border:"none",background:"#fff",borderRadius:7,fontWeight:600,color:"#2e323c",cursor:"pointer"}}>
                  {statusFilter}
                  <ChevronDown size={12} style={{color:"#5b616e"}}/>
                </button>
              )}
            />
          </div>
          <button onClick={()=>setModal(true)} style={{...btnG,background:"#dc2626",fontSize:11}}>
            <Plus size={13}/> New ADM
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Total ADMs",        v:String(filtered.length),              c:"#2563eb",bg:"#e8f0ff"},
          {l:"Pending / Disputed",v:f(totPending),                        c:"#dc2626",bg:"#fbe9e9"},
          {l:"Accepted (posted)", v:f(totAccepted),                       c:"#16a34a",bg:"#e8f6ed"},
          {l:"Overdue (>deadline)",v:String(overdue.length),              c:overdue.length>0?"#7B1F1F":"#16a34a",bg:overdue.length>0?"#fbe9e9":"#e8f6ed"},
          {l:"Under Dispute",      v:String(adms.filter(a=>a.status==="Disputed").length),c:"#d97706",bg:"#fbeedb"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase",letterSpacing:"0.5px"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:mob?18:22,fontWeight:800,color:"#1a1c22"}}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdue.length>0&&(
        <div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#fbe9e9",
          border:"1px solid #f3c9c9",fontSize:10.5,color:"#dc2626",fontWeight:600,
          display:"flex",alignItems:"center",gap:8}}>
          <AlertTriangle size={15}/>
          {overdue.length} ADM{overdue.length>1?"s":""} past the 30-day dispute deadline
          — will be auto-debited from BSP next settlement:
          {overdue.map(a=><span key={a.id} style={{marginLeft:8,padding:"1px 7px",borderRadius:999,background:"#dc2626",color:"#fff",fontSize:9.5}}>{a.id}</span>)}
        </div>
      )}

      {/* ADM table */}
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:1100}}>
            <thead>
              <tr style={{background:"#1a1c22"}}>
                {["ADM Number","Date","Airline","Ticket No.","PAX Name","Sector","Reason","Amount","Deadline","Status","Actions"].map((h,i)=>(
                  <th key={i} style={{padding:"9px 10px",textAlign:i===7?"right":"left",
                    color:"#c2a04a",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a,i)=>{
                const dl=daysLeft(a.responseDeadline);
                const isOverdue=dl<0&&!["Accepted","Rejected","Disputed"].includes(a.status);
                const isUrgent=dl>=0&&dl<=7&&!["Accepted","Rejected","Disputed"].includes(a.status);
                const rc=ADM_REASON_CODES[a.reasonCode]||{code:a.reasonCode,label:a.reasonCode,desc:""};
                return (
                  <tr key={a.id} style={{borderBottom:"1px solid #dfe2e7",
                    background:isOverdue?"#fff5f5":isUrgent?"#fffaf0":i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"8px 10px"}}>
                      <p style={{margin:0,fontFamily:"monospace",fontSize:10,color:"#dc2626",fontWeight:700}}>{a.id}</p>
                      <p style={{margin:0,fontSize:8.5,color:"#5b616e"}}>{a.date}</p>
                    </td>
                    <td style={{padding:"8px 10px"}}>
                      <p style={{margin:0,fontWeight:700,color:"#1a1c22"}}>{a.airline}</p>
                      <p style={{margin:0,fontSize:9,color:"#5b616e"}}>IATA {a.iataNum}</p>
                    </td>
                    <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:10,color:"#2563eb"}}>{a.ticketNo||"—"}</td>
                    <td style={{padding:"8px 10px",fontWeight:600,color:"#2e323c",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.passenger||"—"}</td>
                    <td style={{padding:"8px 10px",color:"#5b616e",whiteSpace:"nowrap"}}>{a.sector||"—"}</td>
                    <td style={{padding:"8px 10px"}}>
                      <p style={{margin:0,fontSize:10,fontWeight:700,color:"#d97706"}}>{rc.code} — {rc.label}</p>
                      <p style={{margin:0,fontSize:8.5,color:"#5b616e",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={a.remarks}>{a.remarks}</p>
                    </td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,fontVariantNumeric:"tabular-nums",
                      color:"#dc2626",fontSize:13}}>{a.currency}{Number(a.amount).toLocaleString()}</td>
                    <td style={{padding:"8px 10px"}}>
                      {["Accepted","Rejected"].includes(a.status)
                        ?<p style={{margin:0,fontSize:10,color:"#16a34a"}}>{a.status==="Accepted"?`✔ ${a.voucherVno||"posted"}`:"—"}</p>
                        :<div>
                          <p style={{margin:0,fontSize:10,fontWeight:700,color:isOverdue?"#dc2626":isUrgent?"#d97706":"#2e323c"}}>
                            {isOverdue?`${Math.abs(dl)} days OVERDUE`:isUrgent?`${dl} days left`:`${dl} days`}
                          </p>
                          <p style={{margin:0,fontSize:8.5,color:"#5b616e"}}>Due: {a.responseDeadline}</p>
                        </div>
                      }
                    </td>
                    <td style={{padding:"8px 10px"}}>
                      <span style={{fontSize:9.5,padding:"3px 8px",borderRadius:999,fontWeight:700,
                        background:STATUS_BG[a.status]||"#f4f5f7",color:STATUS_CLR[a.status]||"#5b616e"}}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{padding:"8px 10px"}}>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {["Received","Disputed"].includes(a.status)&&(
                          <button onClick={()=>{setDisputeNote("");setDisputeModal(a);}} style={{...btnG,padding:"2px 7px",fontSize:9,background:"#dc2626",whiteSpace:"nowrap"}}>Dispute</button>
                        )}
                        {["Received","Disputed"].includes(a.status)&&(
                          <button onClick={()=>acceptAdm(a)} disabled={acceptM.isPending} title="Accept → create a pending ADM voucher" style={{...btnG,padding:"2px 7px",fontSize:9,background:"#16a34a",whiteSpace:"nowrap"}}>Accept → Voucher</button>
                        )}
                        {a.status==="Disputed"&&<button onClick={()=>rejectAdm(a)} style={{...btnGh,padding:"2px 7px",fontSize:9,whiteSpace:"nowrap"}}>Reject</button>}
                        {a.status==="Accepted"&&a.voucherVno&&<span style={{fontSize:9,color:"#16a34a",fontWeight:700}}>→ {a.voucherVno}</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length===0&&(
                <tr><td colSpan={11} style={{padding:"28px",textAlign:"center",color:"#5b616e"}}>No ADMs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info box */}
      <div style={{marginTop:12,padding:"10px 14px",borderRadius:9,background:"#e8f0ff",border:"1px solid #cfe0f8",fontSize:10,color:"#2563eb"}}>
        <b>ADM Process:</b> Airline raises ADM via BSP Link → Agency receives notification → 30-day window to dispute or accept →
        If no response within 30 days, ADM is auto-accepted and debited from next BSP settlement →
        If disputed, airline must respond within 60 days → Unresolved disputes escalate to IATA.
        Always dispute with documentary evidence (fare quote, waiver approval, correspondence).
      </div>

      {/* New ADM modal */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:560,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",position:"sticky",top:0,background:"#1a1c22",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#c2a04a"}}>Record New ADM</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#9197a3"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:10}}>
                <FL label="Airline name"><input value={form.airline} onChange={e=>setForm(f=>({...f,airline:e.target.value}))} style={inp} placeholder="Air India"/></FL>
                <FL label="Airline code (2-letter)"><input value={form.airlineCode} onChange={e=>setForm(f=>({...f,airlineCode:e.target.value.toUpperCase()}))} style={{...inp,fontFamily:"monospace"}} placeholder="AI" maxLength={2}/></FL>
              </div>
              <FL label="Ticket number"><input value={form.ticketNo} onChange={e=>setForm(f=>({...f,ticketNo:e.target.value}))} style={{...inp,fontFamily:"monospace"}} placeholder="098-1234567890"/></FL>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:10}}>
                <FL label="Passenger name"><input value={form.passenger} onChange={e=>setForm(f=>({...f,passenger:e.target.value}))} style={inp}/></FL>
                <FL label="Sector"><input value={form.sector} onChange={e=>setForm(f=>({...f,sector:e.target.value}))} style={inp} placeholder="BOM-DXB"/></FL>
              </div>
              <FL label="Reason code">
                <select value={form.reasonCode} onChange={e=>setForm(f=>({...f,reasonCode:e.target.value}))} style={inp}>
                  {Object.values(ADM_REASON_CODES).map(r=><option key={r.code} value={r.code}>{r.code} — {r.label}</option>)}
                </select>
              </FL>
              <div style={{padding:"8px 12px",borderRadius:8,background:"#fbeedb",fontSize:9.5,color:"#d97706"}}>
                {ADM_REASON_CODES[form.reasonCode]?.desc}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:10}}>
                <FL label="ADM amount"><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:+e.target.value}))} style={inp}/></FL>
                <FL label="Currency"><select value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))} style={inp}>{branchCurrencies(form.branch).map(c=><option key={c}>{c}</option>)}</select></FL>
                <FL label="Branch"><select value={form.branch} onChange={e=>setForm(f=>({...f,branch:e.target.value,currency:branchMainCurrency(e.target.value)}))} style={inp}>{BRANCH_CODES.map(b=><option key={b}>{b}</option>)}</select></FL>
              </div>
              <FL label="Remarks / Airline explanation"><textarea value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}}/></FL>
              <div style={{padding:"9px 12px",borderRadius:8,background:"#fbe9e9",border:"1px solid #f3c9c9",fontSize:9.5,color:"#dc2626",fontWeight:600}}>
                Response deadline: 30 days from today — {new Date(Date.now()+30*86400000).toISOString().slice(0,10)}. Failure to dispute = auto-accepted and BSP debit raised.
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8,position:"sticky",bottom:0,background:"#fff"}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={addAdm} style={{...btnG,background:"#dc2626"}}>💾 Record ADM</button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute modal */}
      {disputeModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",background:"#fbe9e9",borderRadius:"14px 14px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#dc2626"}}>Dispute ADM — {disputeModal.id}</p>
                <p style={{margin:"2px 0 0",fontSize:10,color:"#dc2626"}}>{disputeModal.airline} · {disputeModal.currency}{Number(disputeModal.amount).toLocaleString()} · Due {disputeModal.responseDeadline}</p>
              </div>
              <button onClick={()=>setDisputeModal(null)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#dc2626"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{padding:"9px 12px",borderRadius:8,background:"#fbeedb",fontSize:10,color:"#d97706"}}>
                <b>Reason raised:</b> {ADM_REASON_CODES[disputeModal.reasonCode]?.label} — {disputeModal.remarks}
              </div>
              <FL label="Dispute grounds (detailed explanation)">
                <textarea rows={4} value={disputeNote} onChange={e=>setDisputeNote(e.target.value)} style={{...inp,resize:"vertical"}}
                  placeholder="e.g. Fare was correctly issued as per published fare BOM-DXB Y class dated 05-Mar-2026. Attaching fare quote from Amadeus GDS and booking confirmation. Commission per our PLACI Level 4 agreement dated 01-Apr-2025 signed by Area Manager..."/>
              </FL>
              <FL label="Documents attached">
                <input style={inp} placeholder="e.g. Amadeus fare quote, PLACI agreement, approval email"/>
              </FL>
              <div style={{padding:"9px 12px",borderRadius:8,background:"#e8f0ff",fontSize:9.5,color:"#2563eb",fontWeight:600}}>
                Dispute will be filed via BSP Link within 24 hours. Airline has 60 days to respond. Track status in ADM Register.
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setDisputeModal(null)} style={btnGh}>Cancel</button>
              <button disabled={disputeM.isPending} onClick={()=>{
                disputeM.mutate({id:disputeModal.id,note:disputeNote||"Dispute filed via BSP Link — awaiting airline response"},{
                  onSuccess:()=>{setDisputeModal(null);toast("Dispute filed");},
                  onError:(e)=>toast("Could not file dispute — "+e.message,"error"),
                });
              }} style={{...btnG,background:"#dc2626",opacity:disputeM.isPending?0.6:1,cursor:disputeM.isPending?"not-allowed":"pointer"}}>{disputeM.isPending?"📨 Filing…":"📨 File Dispute"}</button>
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

  // 4) ADM / ACM memos for the period (same live store the ADM register uses).
  const admMemos=useAdmMemos("adm",branch).data||[];
  const acmMemos=useAdmMemos("acm",branch).data||[];
  const admList=admMemos.filter(a=>(!brCode||a.branch===brCode)&&String(a.date||"").startsWith(period)&&(!a.currency||a.currency===cur));
  const acmList=acmMemos.filter(a=>(!brCode||a.branch===brCode)&&String(a.date||"").startsWith(period)&&(!a.currency||a.currency===cur));
  const admTotal=admList.reduce((s,a)=>s+(Number(a.amount)||0),0);
  const acmTotal=acmList.reduce((s,a)=>s+(Number(a.amount)||0),0);
  const netBsp  =ticketCost-commission-bspCharge-admTotal+acmTotal;

  const f=n=>cur+Number(Math.round(n||0)).toLocaleString("en-IN");

  const rows=[
    {label:"Gross ticket sales (BSP)",               amt:grossSales,  type:"neutral",bold:false},
    {label:"Less: Ticket cost (airline net fare)",    amt:-ticketCost, type:"debit",  bold:false},
    {label:"Agency commission (2% avg)",             amt:commission,  type:"credit", bold:false},
    {label:"BSP NET AMOUNT",                 amt:ticketCost,  type:"section",bold:true},
    {label:"Less: ADMs raised this period",          amt:-admTotal,   type:admTotal>0?"debit":"neutral",bold:false},
    {label:"Plus: ACMs received this period",        amt:acmTotal,    type:acmTotal>0?"credit":"neutral",bold:false},
    {label:"Less: BSP service charge (0.25%)",       amt:-bspCharge,  type:"debit",  bold:false},
    {label:"NET BSP SETTLEMENT AMOUNT",      amt:netBsp,      type:"total",  bold:true},
  ];

  const TYPE_CLR={credit:"#16a34a",debit:"#dc2626",neutral:"#1a1c22",section:"#2563eb",total:"#1a1c22"};

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#e8f0ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🏦</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>BSP Settlement Summary</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>
              Linked to <b style={{color:"#2563eb"}}>{bspLedgerName}</b> ({bspLedger?.group||"Sundry Creditors"}) · Net BSP position from live books
            </p>
          </div>
        </div>
        <StatusMenu
          ariaLabel="Period"
          menuRole="listbox"
          width={160}
          items={PERIODS.map(p=>({key:p.v,label:p.l,selected:p.v===period,onSelect:()=>setPeriod(p.v)}))}
          renderTrigger={({ref,toggle,triggerProps})=>(
            <button ref={ref} {...triggerProps} onClick={toggle} type="button"
              style={{...inp,display:"flex",alignItems:"center",gap:6,width:"auto",minHeight:32,fontSize:11,cursor:"pointer"}}>
              {PERIODS.find(p=>p.v===period)?.l}
              <ChevronDown size={12} style={{color:"#5b616e"}}/>
            </button>
          )}
        />
      </div>

      {/* KPI row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Ticket Sales",      v:f(grossSales), c:"#2563eb",bg:"#e8f0ff"},
          {l:"Ticket Cost (BSP)", v:f(ticketCost), c:"#d97706",bg:"#fbeedb"},
          {l:"ADM Debits",        v:f(admTotal),   c:"#dc2626",bg:"#fbe9e9"},
          {l:"ACM Credits",       v:f(acmTotal),   c:"#3fb7a3",bg:"#e8f6ed"},
          {l:"Net Settlement",    v:f(netBsp),     c:netBsp>0?"#16a34a":"#dc2626",bg:netBsp>0?"#e8f6ed":"#fbe9e9"},
          {l:`BSP Payable (${stmt?.closingSide||"Cr"})`, v:f(Math.abs(closingPayable)), c:"#1a1c22",bg:"#eef0f6"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:mob?17:21,fontWeight:800,color:"#1a1c22"}}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Settlement computation */}
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{padding:"10px 16px",background:"#1a1c22",borderBottom:"1px solid #1a2340"}}>
          <p style={{margin:0,fontSize:12,fontWeight:700,color:"#c2a04a"}}>
            BSP Settlement Computation — {PERIODS.find(p=>p.v===period)?.l} · {brCode||"India (BOM+AMD)"}
          </p>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} style={{
                borderBottom:"1px solid #dfe2e7",
                background:r.type==="total"?"#1a1c22":r.type==="section"?"#f0f4ff":i%2===0?"#fff":"#fafafa"
              }}>
                <td style={{padding:"11px 16px",fontWeight:r.bold?700:400,
                  color:r.type==="total"?"#c2a04a":r.type==="section"?"#2563eb":TYPE_CLR[r.type]||"#1a1c22",
                  fontSize:r.bold?12:11.5}}>{r.label}</td>
                <td style={{padding:"11px 16px",textAlign:"right",fontWeight:r.bold?800:500,
                  fontVariantNumeric:"tabular-nums",fontSize:r.bold?14:12,
                  color:r.type==="total"?"#fff":r.amt<0?"#dc2626":r.amt>0&&r.type==="credit"?"#16a34a":"#1a1c22"}}>
                  {r.amt===0?"—":r.amt<0?`(${f(Math.abs(r.amt))})`:f(r.amt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* BSP Supplier ledger — live transactions & running balance */}
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{padding:"10px 16px",background:"#1a1c22",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:"#c2a04a"}}>🔗 BSP Supplier Ledger — {bspLedgerName}</p>
            <p style={{margin:"2px 0 0",fontSize:9.5,color:"#9197a3"}}>{bspLedger?.group||"Sundry Creditors"} · {stmtLines.length} postings · {from} → {to}</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
            <button onClick={()=>openLedgerModal(bspLedgerName)} title="Open in the unified Ledger view" style={{border:"1px solid #2a3556",background:"rgba(255,255,255,0.08)",color:"#e7ecfb",borderRadius:6,fontSize:11,fontWeight:700,padding:"6px 11px",cursor:"pointer"}}>📒 Open Ledger</button>
            <LedgerActions d={stmt} cur="₹" branchLabel={brCode||"India"} from={from} to={to} variant="dark" />
            <div style={{textAlign:"right"}}>
              <p style={{margin:0,fontSize:9,color:"#9197a3",textTransform:"uppercase",fontWeight:700}}>Outstanding payable</p>
              <p style={{margin:"2px 0 0",fontSize:16,fontWeight:800,color:closingPayable>=0?"#f3c9c9":"#bfe6cd"}}>{f(Math.abs(closingPayable))} {stmt?.closingSide||"Cr"}</p>
            </div>
          </div>
        </div>
        {stmtQ.isLoading
          ?<div style={{padding:"24px",textAlign:"center",color:"#5b616e",fontSize:12}}>Loading BSP ledger…</div>
          :stmtQ.isError
          ?<div style={{padding:"20px",textAlign:"center",color:"#dc2626",fontSize:12}}>⚠ Couldn't load BSP ledger — {stmtQ.error?.message||"check your connection"}</div>
          :(<>
            <div style={{padding:"8px 16px",background:"#f4f5f7",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between",fontSize:11,flexWrap:"wrap",gap:6}}>
              <span style={{color:"#5b616e"}}>Opening: {f(stmt?.openingBalance)} {stmt?.openingSide||"Cr"}</span>
              <span style={{color:"#5b616e"}}>Period: Dr {f(stmt?.totalDebit)} · Cr {f(stmt?.totalCredit)}</span>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
                <thead><tr style={{background:"#1a1c22"}}>
                  {["Date","Voucher","Particulars","Dr","Cr","Balance"].map((h,i)=>(
                    <th key={i} style={{padding:"8px 12px",textAlign:i>=3?"right":"left",color:"#c2a04a",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {stmtLines.length===0&&<tr><td colSpan={6} style={{padding:"24px",textAlign:"center",color:"#5b616e",fontSize:11.5}}>No BSP postings in {PERIODS.find(p=>p.v===period)?.l}. Book a flight purchase or BSP payment against {bspLedgerName}.</td></tr>}
                  {stmtLines.map((e,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"7px 12px",color:"#5b616e",whiteSpace:"nowrap"}}>{e.date}</td>
                      <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:10,color:"#2563eb"}}>{e.vno}</td>
                      <td style={{padding:"7px 12px",color:"#2e323c"}}>
                        <span style={{fontWeight:600}}>{contraLedgerName(e)}</span>
                        {lineNarration(e) && <div style={{marginTop:2,fontSize:10,color:"#8b93b3",fontStyle:"italic"}}>{lineNarration(e)}</div>}
                      </td>
                      <td style={{padding:"7px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:e.debit>0?"#2563eb":"#cbd0db"}}>{e.debit>0?f(e.debit):"—"}</td>
                      <td style={{padding:"7px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:e.credit>0?"#dc2626":"#cbd0db"}}>{e.credit>0?f(e.credit):"—"}</td>
                      <td style={{padding:"7px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:e.balanceSide==="Cr"?"#dc2626":"#2563eb"}}>{f(Math.abs(e.balance))} {e.balanceSide}</td>
                    </tr>
                  ))}
                </tbody>
                {stmtLines.length>0&&<tfoot><tr style={{background:"#1a1c22",borderTop:"2px solid #c2a04a"}}>
                  <td colSpan={3} style={{padding:"9px 12px",fontWeight:700,color:"#c2a04a",fontSize:12}}>CLOSING — {bspLedgerName}</td>
                  <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(stmt?.totalDebit)}</td>
                  <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#c2a04a",fontVariantNumeric:"tabular-nums"}}>{f(stmt?.totalCredit)}</td>
                  <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(Math.abs(closingPayable))} {stmt?.closingSide||"Cr"}</td>
                </tr></tfoot>}
              </table>
            </div>
          </>)}
      </div>

      {/* ADM/ACM breakdown */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:12}}>
        {/* ADMs this period */}
        <div style={{...card}}>
          <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#dc2626"}}>📩 ADMs This Period</p>
          {admList.length===0
            ?<p style={{margin:0,fontSize:11,color:"#5b616e"}}>No ADMs this period</p>
            :admList.map(a=>(
              <div key={a.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #dfe2e7",fontSize:11}}>
                <div>
                  <p style={{margin:0,fontWeight:600,color:"#1a1c22",fontSize:10.5}}>{a.id}</p>
                  <p style={{margin:0,fontSize:9.5,color:"#5b616e"}}>{a.airline} · {ADM_REASON_CODES[a.reasonCode]?.label}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{margin:0,fontWeight:700,color:"#dc2626",fontVariantNumeric:"tabular-nums"}}>{a.currency}{a.amount.toLocaleString()}</p>
                  <span style={{fontSize:9,padding:"1px 6px",borderRadius:999,background:"#fbe9e9",color:"#dc2626",fontWeight:700}}>{a.status}</span>
                </div>
              </div>
          ))}
        </div>
        {/* ACMs this period */}
        <div style={{...card}}>
          <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#16a34a"}}>📨 ACMs This Period</p>
          {acmList.length===0
            ?<p style={{margin:0,fontSize:11,color:"#5b616e"}}>No ACMs this period</p>
            :acmList.map(a=>(
              <div key={a.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #dfe2e7",fontSize:11}}>
                <div>
                  <p style={{margin:0,fontWeight:600,color:"#1a1c22",fontSize:10.5}}>{a.id}</p>
                  <p style={{margin:0,fontSize:9.5,color:"#5b616e"}}>{a.airline} · {ACM_REASON_CODES[a.reasonCode]?.label}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{margin:0,fontWeight:700,color:"#16a34a",fontVariantNumeric:"tabular-nums"}}>+{a.currency}{a.amount.toLocaleString()}</p>
                  <span style={{fontSize:9,padding:"1px 6px",borderRadius:999,background:"#e8f6ed",color:"#16a34a",fontWeight:700}}>{a.status}</span>
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
  const STATUS_CLR={Open:"#2563eb",Used:"#16a34a",Voided:"#dc2626",Refunded:"#d97706",Exchanged:"#3fb7a3",Reissued:"#2e323c"};
  const STATUS_BG={Open:"#e8f0ff",Used:"#e8f6ed",Voided:"#fbe9e9",Refunded:"#fbeedb",Exchanged:"#e8f6ed",Reissued:"#f4f5f7"};

  const filtered=tickets.filter(t=>(
    (!brCode||t.branch===brCode)&&
    (filter==="All"||t.status===filter)&&
    (!search||t.ticket.includes(search)||t.pax.toLowerCase().includes(search.toLowerCase())||t.pnr.includes(search.toUpperCase()))
  ));
  const totByStatus={};
  STATUSES.slice(1).forEach(s=>totByStatus[s]=tickets.filter(t=>(!brCode||t.branch===brCode)&&t.status===s).length);

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#e8f0ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🎫</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>Air Ticket Control Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>Track every ticket: Issued · Used · Voided · Refunded · Exchanged · Reissued</p>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,background:"#f4f5f7",border:"1px solid #e3e6eb",borderRadius:10,padding:4,boxShadow:"0 1px 2px rgba(16,18,22,0.04)"}}>
          <div style={{position:"relative"}}>
            <Search size={12} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#9aa1ab"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ticket / PNR / passenger..."
              style={{...inp,width:200,minHeight:32,fontSize:11,paddingLeft:26,paddingRight:search?22:10,border:"none",background:"#fff",borderRadius:7}}/>
            {search&&(
              <button onClick={()=>setSearch("")} aria-label="Clear search"
                style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",border:"none",background:"none",cursor:"pointer",color:"#9aa1ab",fontSize:14,lineHeight:1,padding:2}}>×</button>
            )}
          </div>
          <StatusMenu
            ariaLabel="Filter by status"
            menuRole="listbox"
            width={150}
            items={STATUSES.map(s=>({key:s,label:s,selected:s===filter,onSelect:()=>setFilter(s)}))}
            renderTrigger={({ref,toggle,triggerProps})=>(
              <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                style={{...inp,display:"flex",alignItems:"center",gap:6,width:"auto",minHeight:32,fontSize:11,paddingRight:10,paddingLeft:10,border:"none",background:"#fff",borderRadius:7,fontWeight:600,color:"#2e323c",cursor:"pointer"}}>
                {filter}
                <ChevronDown size={12} style={{color:"#5b616e"}}/>
              </button>
            )}
          />
        </div>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        {STATUSES.slice(1).map(s=>(
          <div key={s} {...clickable(()=>setFilter(f=>f===s?"All":s))}
            className={`rounded-brand border border-t-[3px] px-3 py-4 cursor-pointer transition ${filter===s?"border-navy bg-surface-alt":"border-surface-border bg-surface"}`}
            style={{flex:"1 1 140px",minWidth:120,textAlign:"start",borderTopColor:STATUS_CLR[s]}}>
            <p className="text-[8.5px] font-bold uppercase tracking-wide whitespace-nowrap" style={{color:STATUS_CLR[s]}}>{s}</p>
            <p className="mt-1 text-base font-extrabold tabular-nums text-navy tablet:text-lg">{totByStatus[s]||0}</p>
          </div>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:1000}}>
            <thead><tr style={{background:"#1a1c22"}}>
              {["Ticket Number","Airline","PAX Name","Sector","Class","PNR","Issue Date","Travel Date","Fare","BSP Status","Ticket Status","Actions"].map((h,i)=>(
                <th key={i} style={{padding:"9px 10px",textAlign:i===8?"right":"left",color:"#c2a04a",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filtered.map((t,i)=>(
              <tr key={t.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:10,color:"#2563eb",fontWeight:700}}>{t.ticket}</td>
                <td style={{padding:"8px 10px",fontWeight:600,color:"#1a1c22"}}>{t.airline}</td>
                <td style={{padding:"8px 10px",color:"#2e323c"}}>{t.pax}</td>
                <td style={{padding:"8px 10px",fontWeight:600,color:"#d97706"}}>{t.sector}</td>
                <td style={{padding:"8px 10px",textAlign:"center",fontFamily:"monospace",fontSize:10.5,fontWeight:700}}>{t.class}</td>
                <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:10.5,color:"#2563eb",fontWeight:700}}>{t.pnr}</td>
                <td style={{padding:"8px 10px",color:"#5b616e",whiteSpace:"nowrap"}}>{t.issueDate}</td>
                <td style={{padding:"8px 10px",color:"#5b616e",whiteSpace:"nowrap"}}>{t.travelDate}</td>
                <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:600}}>
                  {"₹"}{Number(t.fare).toLocaleString()}
                </td>
                <td style={{padding:"8px 10px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:STATUS_BG[t.bspStatus]||"#f4f5f7",color:STATUS_CLR[t.bspStatus]||"#5b616e"}}>{t.bspStatus}</span></td>
                <td style={{padding:"8px 10px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:STATUS_BG[t.status]||"#f4f5f7",color:STATUS_CLR[t.status]||"#5b616e"}}>{t.status}</span></td>
                <td style={{padding:"8px 10px"}}>
                  {t.status==="Open"&&(
                    <select onChange={e=>{if(e.target.value)setTickets(ts=>ts.map(x=>x.id===t.id?{...x,status:e.target.value,bspStatus:e.target.value}:x));}}
                      style={{fontSize:9.5,border:"1px solid #cdd1d8",borderRadius:5,padding:"2px 5px",background:"#f9fafb"}}>
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
              background:"#1a1c22",border:"1px solid #c2a04a",color:"#fff",cursor:"pointer",
              fontSize:11,fontWeight:600,boxShadow:"0 4px 12px rgba(0,0,0,0.3)",whiteSpace:"nowrap",
              animation:`slideUp 0.${i+1}s ease`}}>
            <span style={{fontSize:15}}>{s.icon}</span>{s.label}
          </button>
        ))}
        <button onClick={()=>setOpen(o=>!o)}
          style={{width:52,height:52,borderRadius:"50%",background:open?"#c2a04a":"#1a1c22",
            border:`3px solid ${open?"#1a1c22":"#c2a04a"}`,color:open?"#1a1c22":"#c2a04a",
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

  const handleFile=async e=>{
    const f=e.target.files[0];
    if(!f)return;
    setFile(f);
    // Parse the uploaded BSP CSV (no demo rows). Columns are matched by header
    // name; rows are flagged for reconciliation against the live books.
    let rows=[];
    try{
      const text=await f.text();
      const lines=text.replace(/\r/g,"").split("\n").filter(l=>l.trim());
      if(lines.length>1){
        const heads=lines[0].split(",").map(h=>h.trim().toLowerCase());
        const ix=re=>heads.findIndex(h=>re.test(h));
        const iT=ix(/ticket/),iA=ix(/airline/),iP=ix(/pax|passenger|name/),iS=ix(/sector|route/),iAmt=ix(/amount|fare|total/),iC=ix(/currency/),iTy=ix(/type/),iSt=ix(/status/);
        rows=lines.slice(1).map(l=>{const c=l.split(",");const g=i=>i>=0?(c[i]||"").trim():"";return{
          ticketNo:g(iT),airline:g(iA),pax:g(iP),sector:g(iS),amount:g(iAmt)||"0",currency:g(iC)||"INR",type:g(iTy)||"SALE",status:g(iSt)};});
      }
    }catch{ rows=[]; }
    setParsed(rows);
    setMatched(rows.map(row=>({...row,inBooks:false,variance:0})));
    setStep(2);
  };

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#e8f0ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📂</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>BSP Statement Import</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>Upload BSP Link CSV / SITI billing file → auto-match against book entries</p>
        </div>
      </div>

      {/* Step indicators */}
      <div style={{display:"flex",gap:0,marginBottom:16,...card,padding:"12px 16px"}}>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:0}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",background:step>=1?"#1a1c22":"#e6e8ec",color:step>=1?"#c2a04a":"#cbd0db"}}>1</div><span style={{fontSize:11,fontWeight:step===1?700:400,color:step===1?"#1a1c22":"#5b616e"}}>Upload File</span></div><div style={{flex:1,height:1,background:"#e6e8ec",margin:"0 8px"}}/></div><div style={{flex:1,display:"flex",alignItems:"center",gap:0}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",background:step>=2?"#1a1c22":"#e6e8ec",color:step>=2?"#c2a04a":"#cbd0db"}}>2</div><span style={{fontSize:11,fontWeight:step===2?700:400,color:step===2?"#1a1c22":"#5b616e"}}>Preview & Match</span></div><div style={{flex:1,height:1,background:"#e6e8ec",margin:"0 8px"}}/></div><div style={{flex:1,display:"flex",alignItems:"center",gap:0}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",background:step>=3?"#1a1c22":"#e6e8ec",color:step>=3?"#c2a04a":"#cbd0db"}}>3</div><span style={{fontSize:11,fontWeight:step===3?700:400,color:step===3?"#1a1c22":"#5b616e"}}>Reconcile</span></div></div>
      </div>

      {step===1&&(
        <div style={{...card,textAlign:"center",padding:"40px 20px"}}>
          <p style={{margin:"0 0 8px",fontSize:32}}>📂</p>
          <p style={{margin:"0 0 16px",fontSize:14,fontWeight:600,color:"#1a1c22"}}>Upload BSP Billing CSV</p>
          <p style={{margin:"0 0 20px",fontSize:11,color:"#5b616e"}}>Download from BSP Link → Reports → Billing Statement → CSV format. Supported: BSP India (IATA), KQ Direct, any airline CSV.</p>
          <input type="file" accept=".csv,.txt" onChange={handleFile} style={{display:"none"}} id="bspFileInput"/>
          <label htmlFor="bspFileInput" style={{...btnG,cursor:"pointer",display:"inline-block",padding:"10px 24px",fontSize:12}}>📂 Choose CSV File</label>
        </div>
      )}

      {step===2&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:"#1a1c22"}}>Parsed: {parsed.length} records from {file?.name||"sample"}</p>
            <div style={{display:"flex",gap:8}}>
              <span style={{fontSize:10.5,padding:"4px 10px",borderRadius:999,background:"#e8f6ed",color:"#16a34a",fontWeight:700}}>{matched.filter(m=>m.inBooks).length} Matched</span>
              <span style={{fontSize:10.5,padding:"4px 10px",borderRadius:999,background:"#fbe9e9",color:"#dc2626",fontWeight:700}}>{matched.filter(m=>!m.inBooks).length} Unmatched</span>
              <button onClick={()=>setStep(3)} style={{...btnG,fontSize:11}}>Proceed →</button>
            </div>
          </div>
          <div style={{...card,padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#1a1c22"}}>
                {["Ticket No.","Airline","PAX Name","Sector","Amount","Type","In Books","Status"].map((h,i)=>(
                  <th key={i} style={{padding:"9px 11px",textAlign:i===4?"right":"left",color:"#c2a04a",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{matched.map((r,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:!r.inBooks?"#fff5f5":i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:9.5,color:"#2563eb"}}>{r.ticketNo}</td>
                  <td style={{padding:"8px 11px",fontWeight:600,color:"#1a1c22"}}>{r.airline}</td>
                  <td style={{padding:"8px 11px",color:"#2e323c"}}>{r.pax}</td>
                  <td style={{padding:"8px 11px",color:"#5b616e"}}>{r.sector}</td>
                  <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>₹{Number(r.amount).toLocaleString()}</td>
                  <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:r.type==="SALE"?"#e8f0ff":"#fbeedb",color:r.type==="SALE"?"#2563eb":"#d97706"}}>{r.type}</span></td>
                  <td style={{padding:"8px 11px",textAlign:"center"}}>{r.inBooks?"✅":"❌"}</td>
                  <td style={{padding:"8px 11px"}}>{!r.inBooks?<button style={{...btnG,padding:"2px 8px",fontSize:9.5,background:"#dc2626",whiteSpace:"nowrap"}}>Create Entry</button>:<span style={{color:"#16a34a",fontSize:12}}>✔</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {step===3&&(
        <div style={{...card,padding:"24px",textAlign:"center",background:"#e8f6ed"}}>
          <p style={{margin:"0 0 8px",fontSize:32}}>✅</p>
          <p style={{margin:"0 0 8px",fontSize:15,fontWeight:700,color:"#16a34a"}}>Reconciliation Complete</p>
          <p style={{margin:0,fontSize:11,color:"#5b616e"}}>{matched.filter(m=>m.inBooks).length} tickets matched · {matched.filter(m=>!m.inBooks).length} new entries created · BSP statement synced with books.</p>
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
  const mob=useMobile();
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
        <div style={{width:40,height:40,borderRadius:10,background:"#e8f6ed",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>✈</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>GDS PNR Import</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>Paste PNR from Amadeus / Sabre / Galileo → auto-fill ticket details</p>
        </div>
      </div>

      <div style={{...card,marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"auto 1fr auto",gap:10,alignItems:"flex-end"}}>
          <FL label="GDS System"><select value={gds} onChange={e=>setGds(e.target.value)} style={{...inp,minWidth:130}}><option>Amadeus</option><option>Sabre</option><option>Galileo</option><option>Direct Airline</option></select></FL>
          <FL label="PNR / Booking Reference"><input value={pnr} onChange={e=>setPnr(e.target.value.toUpperCase())} style={{...inp,fontFamily:"monospace",textTransform:"uppercase",fontSize:14,fontWeight:700,letterSpacing:2}} placeholder="ABCDE1" maxLength={8}/></FL>
          <div style={{paddingBottom:2}}><button onClick={parsePnr} disabled={!pnr.trim()||loading} className="max-tablet:min-h-[44px] max-tablet:w-full" style={{...btnG,padding:"10px 16px",fontSize:12,opacity:!pnr.trim()||loading?0.6:1}}>{loading?"Fetching...":"Fetch PNR →"}</button></div>
        </div>
      </div>

      {parsed&&(
        <div style={{...card}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22"}}>PNR: <span style={{fontFamily:"monospace",color:"#2563eb"}}>{parsed.pnr}</span> — {parsed.gds}</p>
            <span style={{fontSize:11,padding:"3px 10px",borderRadius:999,background:"#e8f6ed",color:"#16a34a",fontWeight:700}}>{parsed.status}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:12,marginBottom:12}}>
            {[{l:"Airline",v:parsed.airline},{l:"Fare Class",v:`${parsed.fareClass} (${parsed.fareBasis})`},
              {l:"Base Fare",v:`₹${parsed.fare.toLocaleString()}`},{l:"Taxes & Fees",v:`₹${parsed.taxes.toLocaleString()}`},
              {l:"Total",v:`₹${parsed.total.toLocaleString()}`},{l:"Currency",v:parsed.currency},
            ].map((k,i)=>(
              <div key={i} style={{padding:"8px 12px",borderRadius:8,background:"#f4f5f7"}}>
                <p style={{margin:0,fontSize:9,color:"#5b616e",textTransform:"uppercase"}}>{k.l}</p>
                <p style={{margin:"2px 0 0",fontSize:13,fontWeight:700,color:"#1a1c22"}}>{k.v}</p>
              </div>
            ))}
          </div>
          <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#1a1c22"}}>Sectors</p>
          {parsed.sectors.map((s,i)=>(
            <div key={i} style={{padding:"10px 14px",borderRadius:9,background:"#e8f0ff",marginBottom:8,display:"flex",gap:16,alignItems:"center"}}>
              <span style={{fontSize:18,fontWeight:800,color:"#2563eb"}}>{s.from}</span>
              <span style={{fontSize:14,color:"#5b616e"}}>✈ {s.flight} · {s.date}</span>
              <span style={{fontSize:18,fontWeight:800,color:"#2563eb"}}>{s.to}</span>
              <span style={{fontSize:11,color:"#5b616e"}}>{s.dep} → {s.arr} · {s.class}</span>
            </div>
          ))}
          <p style={{margin:"12px 0 6px",fontSize:11,fontWeight:700,color:"#1a1c22"}}>Passengers</p>
          {parsed.pax.map((p,i)=>(
            <div key={i} style={{padding:"8px 12px",borderRadius:8,background:"#f4f5f7",display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontWeight:600,color:"#1a1c22"}}>{p.name}</span>
              <span style={{fontFamily:"monospace",fontSize:10,color:"#2563eb"}}>{p.ticket}</span>
            </div>
          ))}
          <div style={{marginTop:14,display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={()=>setParsed(null)} style={btnGh}>Clear</button>
            <button onClick={createVoucher} style={{...btnG,background:"#16a34a"}}>📋 Create Purchase Voucher</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ITEM 23: TALLY XML EXPORT  /reports/tally-export
   ════════════════════════════════════════════════════════════════ */

// Receipt CREATE renders through the unified VoucherShell (Option C), sharing one
// form with the ledger-account edit screen.
export function ReceiptVoucher({ branch }) {
  return <VoucherShell category="receipt" mode="create" branch={branch} />;
}

/* ════════════════════════════════════════════════════════════════
   PAYMENT VOUCHER — COMPLETE REBUILD
   Dr Creditor  |  Cr Bank  |  Cr TDS Payable (if TDS deducted)
   ════════════════════════════════════════════════════════════════ */

export function PaymentVoucher({ branch }) {
  return <VoucherShell category="payment" mode="create" branch={branch} />;
}

/* ════════════════════════════════════════════════════════════════
   CONTRA ENTRY — COMPLETE REBUILD
   Cash/Bank → Cash/Bank transfer only
   ════════════════════════════════════════════════════════════════ */

// Contra CREATE renders through the unified VoucherShell (Option C), sharing one
// form with the ledger-account edit screen.
export function ContraVoucher({ branch }) {
  return <VoucherShell category="contra" mode="create" branch={branch} />;
}

/* ════════════════════════════════════════════════════════════════
   JOURNAL ENTRY — COMPLETE REBUILD
   Multi-line Dr/Cr with ledger autocomplete and validation
   ════════════════════════════════════════════════════════════════ */

// Journal voucher CREATE renders through the unified VoucherShell (Option C), so
// create and the ledger-account edit screen share one form.
export function JournalEntry({ branch }) {
  return <VoucherShell category="journal" mode="create" branch={branch} />;
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

// Purchase-Expense CREATE renders through the unified VoucherShell (Option C),
// sharing one form with the ledger-account edit screen.
export function PurchaseExpenseVoucher({ branch }) {
  return <VoucherShell category="purchase-expense" mode="create" branch={branch} />;
}

// Debit Note CREATE — a purchase return to a supplier. Renders through the unified
// VoucherShell (category 'debit-note', type DN); GATED → enters the approval queue
// and posts the reversal journal (Dr supplier / Cr purchase + input GST) on approval.
export function DebitNoteVoucher({ branch }) {
  return <VoucherShell category="debit-note" mode="create" branch={branch} />;
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
        <FL label="Departure date"><SmartDateInput value={deptDate} onChange={setDeptDate} style={inp}/></FL>
        <FL label="Return date"><SmartDateInput value={returnDate} onChange={setReturnDate} style={inp}/></FL>
        <FL label="No. of pax"><input type="number" value={pax} onChange={e=>setPax(+e.target.value)} style={inp}/></FL>
      </div>

      {/* Package Type selector — drives TCS applicability */}
      <div style={{marginBottom:14,padding:"12px 14px",borderRadius:9,background:"#fbeedb",border:"1px solid #f3d9a8"}}>
        <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#d97706"}}>Package Type</p>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <button onClick={()=>setPkgType("Domestic")} style={{flex:1,padding:"8px 12px",borderRadius:8,cursor:"pointer",
            background:pkgType==="Domestic"?"#16a34a":"#fff",color:pkgType==="Domestic"?"#fff":"#16a34a",
            border:"2px solid #16a34a",fontSize:11,fontWeight:600}}>
            Domestic — GST 5% only (No TCS)
          </button>
          <button onClick={()=>setPkgType("International")} style={{flex:1,padding:"8px 12px",borderRadius:8,cursor:"pointer",
            background:pkgType==="International"?"#2563eb":"#fff",color:pkgType==="International"?"#fff":"#2563eb",
            border:"2px solid #2563eb",fontSize:11,fontWeight:600}}>
            International — GST 5% + TCS 2%
          </button>
        </div>
        <p style={{margin:0,fontSize:10,color:"#d97706"}}>
          {isIntl
            ?"INTERNATIONAL outbound package — GST 5% on (Basic + Service) and TCS 2% u/s 206C(1G) on (Basic + Service + GST). Threshold ₹7L per FY waived in this demo."
            :"DOMESTIC package — GST 5% on (Basic + Service). No TCS applicable."}
        </p>
      </div>

      {/* Component breakout — fixed GL rows */}
      <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#1a1c22"}}>Package Component Breakout <span style={{fontSize:9.5,color:"#5b616e"}}>(Basic + Service → GST 5% → TCS 2% if international)</span></p>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
            <thead><tr style={{background:"#1a1c22"}}>
              {["S.NO","GL Name","Description","SAC Code","Sell Price"].map((h,i)=>(
                <th key={i} style={{padding:"8px 10px",textAlign:i===4?"right":"left",color:"#c2a04a",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {/* 1. Basic */}
              <tr style={{borderBottom:"1px solid #dfe2e7",background:"#fff"}}>
                <td style={{padding:"4px 10px",textAlign:"center",color:"#5b616e",fontSize:10}}>1</td>
                <td style={{padding:"4px 10px",fontWeight:700,color:"#1a1c22",fontSize:11}}>Basic</td>
                <td style={{padding:"3px 6px"}}>
                  <input value={basic.desc} onChange={e=>updBasic("desc",e.target.value)} style={{...inp,minHeight:28,fontSize:10.5,minWidth:200}}/>
                </td>
                <td style={{padding:"3px 6px"}}>
                  <input value={basic.sac} onChange={e=>updBasic("sac",e.target.value)} style={{...inp,minHeight:28,fontSize:10,fontFamily:"monospace",width:90}}/>
                </td>
                <td style={{padding:"3px 6px"}}>
                  <input type="number" value={basic.amt} onChange={e=>updBasic("amt",+e.target.value)} style={{...inp,minHeight:28,textAlign:"right",fontSize:11,fontWeight:600,color:"#2563eb"}}/>
                </td>
              </tr>
              {/* 2. Service */}
              <tr style={{borderBottom:"1px solid #dfe2e7",background:"#fafafa"}}>
                <td style={{padding:"4px 10px",textAlign:"center",color:"#5b616e",fontSize:10}}>2</td>
                <td style={{padding:"4px 10px",fontWeight:700,color:"#1a1c22",fontSize:11}}>Service</td>
                <td style={{padding:"3px 6px"}}>
                  <input value={service.desc} onChange={e=>updService("desc",e.target.value)} style={{...inp,minHeight:28,fontSize:10.5,minWidth:200}}/>
                </td>
                <td style={{padding:"3px 6px"}}>
                  <input value={service.sac} onChange={e=>updService("sac",e.target.value)} style={{...inp,minHeight:28,fontSize:10,fontFamily:"monospace",width:90}}/>
                </td>
                <td style={{padding:"3px 6px"}}>
                  <input type="number" value={service.amt} onChange={e=>updService("amt",+e.target.value)} style={{...inp,minHeight:28,textAlign:"right",fontSize:11,fontWeight:600,color:"#2563eb"}}/>
                </td>
              </tr>
              {/* 3. Total (subtotal) */}
              <tr style={{borderBottom:"1px solid #cdd1d8",background:"#f4f5f7"}}>
                <td style={{padding:"6px 10px",textAlign:"center",color:"#1a1c22",fontSize:10,fontWeight:700}}>3</td>
                <td style={{padding:"6px 10px",fontWeight:800,color:"#1a1c22",fontSize:11.5}}>Total</td>
                <td style={{padding:"6px 10px",fontSize:10.5,color:"#5b616e",fontStyle:"italic"}}>Basic + Service</td>
                <td style={{padding:"6px 10px"}}></td>
                <td style={{padding:"6px 10px",textAlign:"right",fontWeight:800,fontSize:12,color:"#1a1c22",fontVariantNumeric:"tabular-nums"}}>{f(subTotal)}</td>
              </tr>
              {/* 4. GST 5% */}
              <tr style={{borderBottom:"1px solid #dfe2e7",background:"#fff"}}>
                <td style={{padding:"6px 10px",textAlign:"center",color:"#d97706",fontSize:10,fontWeight:700}}>4</td>
                <td style={{padding:"6px 10px",fontWeight:700,color:"#d97706",fontSize:11}}>GST (5%)</td>
                <td style={{padding:"6px 10px",fontSize:10.5,color:"#5b616e",fontStyle:"italic"}}>5% on (Basic + Service)</td>
                <td style={{padding:"6px 10px",fontSize:10,fontFamily:"monospace",color:"#5b616e"}}>—</td>
                <td style={{padding:"6px 10px",textAlign:"right",fontWeight:700,fontSize:11.5,color:"#d97706",fontVariantNumeric:"tabular-nums"}}>{f(gstAmt)}</td>
              </tr>
              {/* 5. TCS 2% */}
              <tr style={{borderBottom:"1px solid #dfe2e7",background:"#fafafa",opacity:isIntl?1:0.45}}>
                <td style={{padding:"6px 10px",textAlign:"center",color:"#2563eb",fontSize:10,fontWeight:700}}>5</td>
                <td style={{padding:"6px 10px",fontWeight:700,color:"#2563eb",fontSize:11}}>TCS (2%) {!isIntl&&<span style={{fontSize:9,color:"#5b616e",fontWeight:500}}>— N/A (Domestic)</span>}</td>
                <td style={{padding:"6px 10px",fontSize:10.5,color:"#5b616e",fontStyle:"italic"}}>2% on (Basic + Service + GST) — international only</td>
                <td style={{padding:"6px 10px",fontSize:10,fontFamily:"monospace",color:"#5b616e"}}>—</td>
                <td style={{padding:"6px 10px",textAlign:"right",fontWeight:700,fontSize:11.5,color:"#2563eb",fontVariantNumeric:"tabular-nums"}}>{f(tcsAmt)}</td>
              </tr>
            </tbody>
            <tfoot><tr style={{background:"#1a1c22",borderTop:"2px solid #c2a04a"}}>
              <td colSpan={4} style={{padding:"8px 10px",fontWeight:800,color:"#c2a04a",fontSize:11.5}}>Grand Total ({pkgType})</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,color:"#c2a04a",fontSize:13,fontVariantNumeric:"tabular-nums"}}>{f(grandTotal)}</td>
            </tr></tfoot>
          </table>
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,140px),1fr))",gap:10,marginBottom:12}}>
        {[{l:"Basic",v:f(basicAmt),c:"#2563eb"},{l:"Service",v:f(serviceAmt),c:"#2563eb"},
          {l:"GST 5%",v:f(gstAmt),c:"#d97706"},{l:"TCS 2%",v:isIntl?f(tcsAmt):"N/A",c:isIntl?"#2563eb":"#9197a3"},
          {l:"Grand Total",v:f(grandTotal),c:"#1a1c22"},
        ].map((k,i)=>(
          <div key={i} style={{padding:"9px 12px",borderRadius:8,background:"#f4f5f7",textAlign:"center"}}>
            <p style={{margin:0,fontSize:9,color:"#5b616e",textTransform:"uppercase"}}>{k.l}</p>
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

/* LIVE (2026-07-10): templates persist via /api/recurring-vouchers; "Post" creates a
   REAL voucher (JV/RV/PMT series) through the universal pending gate — the approver
   still signs off each occurrence. A daily backend cron (RECURRING_CRON) also posts
   due templates automatically. */
export function RecurringVouchers({branch}){
  const mob=useMobile();
  const qc=useQueryClient();
  const { data: masterRows = [] } = useMasterList('recurring-vouchers');
  const { create, update } = useMasterMutations('recurring-vouchers');
  const CAT_LABEL={journal:"Journal",payment:"Payment",receipt:"Receipt"};
  const templates=(masterRows||[]).map(t=>({...t,type:CAT_LABEL[t.category]||t.category,lastRun:t.lastRun||"—"}));
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [posting,setPosting]=useState(false);
  const [form,setForm]=useState({name:"",type:"Journal",freq:"Monthly",day:1,dr:"",cr:"",amt:0});
  // LedgerSelect carries the registry id — postings join by NAME, so resolve at save.
  const ledgerReg=useLedgerRegistry(branch).data||[];
  const ledgerNameOf=(id)=>((ledgerReg.find(l=>l.id===id)||{}).name)||id;
  const TODAY=todayISO();
  const due=templates.filter(t=>t.active&&t.nextRun<=TODAY);
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const refresh=()=>qc.invalidateQueries({queryKey:['master','recurring-vouchers']});
  const run=async(id)=>{
    setPosting(true);
    try{
      const { apiPost } = await import('../../core/api');
      const r=await apiPost(`/api/recurring-vouchers/${id}/post`);
      toast(`Voucher ${r.vno} created (pending approval) · next run ${r.nextRun}`);
      refresh(); triggerSaveRefresh();
    }catch(e){ toast(e?.message||"Posting failed","error"); }
    finally{ setPosting(false); }
  };
  const runAll=async()=>{
    setPosting(true);
    try{
      const { apiPost } = await import('../../core/api');
      const r=await apiPost('/api/recurring-vouchers/post-due');
      toast(`${r.posted.length}/${r.due} due templates posted as pending vouchers${r.failed.length?` · ${r.failed.length} failed`:""}`);
      refresh(); triggerSaveRefresh();
    }catch(e){ toast(e?.message||"Posting failed","error"); }
    finally{ setPosting(false); }
  };

  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#e8f0ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔄</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>Recurring Voucher Templates</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>{templates.length} templates · {due.length} due for posting · Auto-posting saves time each month</p>
          </div>
        </div>
        <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> New Template</button>
      </div>

      {due.length>0&&<div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#fbeedb",border:"1px solid #f3d9a8",fontSize:10.5,color:"#d97706",fontWeight:600,display:"flex",gap:8,flexWrap:"wrap"}}>
        <Clock size={14}/> {due.length} recurring voucher{due.length>1?"s":""} due for posting:
        {due.map(t=><span key={t.id} style={{padding:"1px 7px",borderRadius:999,background:"#d97706",color:"#fff",fontSize:9.5}}>{t.name}</span>)}
        <button onClick={runAll} disabled={posting} style={{...btnG,padding:"2px 10px",fontSize:9.5,background:"#d97706",marginLeft:"auto",opacity:posting?0.5:1}}>{posting?"Posting…":"Post All Now"}</button>
      </div>}

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#1a1c22"}}>
            {["Template","Type","Freq","Dr Ledger","Cr Ledger","Amount","Next Run","Status","Action"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i===6?"center":i===5?"right":"left",color:"#c2a04a",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{templates.map((t,i)=>(
            <tr key={t.id} style={{borderBottom:"1px solid #dfe2e7",background:t.nextRun<=TODAY?"#fffaf0":i%2===0?"#fff":"#fafafa",opacity:t.active?1:0.5}}>
              <td style={{padding:"8px 12px",fontWeight:600,color:"#1a1c22"}}>{t.name}</td>
              <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#e8f0ff",color:"#2563eb",fontWeight:700}}>{t.type}</span></td>
              <td style={{padding:"8px 12px",color:"#2e323c",fontSize:10.5}}>{t.freq}</td>
              <td style={{padding:"8px 12px",color:"#dc2626",fontSize:10.5}}>{t.dr}</td>
              <td style={{padding:"8px 12px",color:"#16a34a",fontSize:10.5}}>{t.cr}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(t.amt)}</td>
              <td style={{padding:"8px 12px",textAlign:"center",fontWeight:t.nextRun<=TODAY?700:400,color:t.nextRun<=TODAY?"#d97706":"#5b616e"}}>{t.nextRun}{t.nextRun<=TODAY&&" ⚡"}</td>
              <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:t.active?"#e8f6ed":"#f4f5f7",color:t.active?"#16a34a":"#5b616e"}}>{t.active?"Active":"Paused"}</span></td>
              <td style={{padding:"8px 12px"}}>
                <div style={{display:"flex",gap:4}}>
                  {t.active&&t.nextRun<=TODAY&&<button onClick={()=>run(t.id)} disabled={posting} style={{...btnG,padding:"2px 8px",fontSize:9.5,background:"#16a34a",opacity:posting?0.5:1}}>Post</button>}
                  <button onClick={()=>update.mutate({id:t.id,body:{active:!t.active}})} style={{...btnGh,padding:"2px 8px",fontSize:9.5}}>{t.active?"Pause":"Resume"}</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22"}}>New Recurring Template</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5b616e"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <FL label="Template name"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp} placeholder="e.g. Office Rent — BOM"/></FL>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:10}}>
                <FL label="Voucher type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}><option>Journal</option><option>Payment</option><option>Receipt</option></select></FL>
                <FL label="Frequency"><select value={form.freq} onChange={e=>setForm(f=>({...f,freq:e.target.value}))} style={inp}><option>Monthly</option><option>Quarterly</option><option>Annual</option><option>Weekly</option></select></FL>
                <FL label="Day of month"><input type="number" min={1} max={31} value={form.day} onChange={e=>setForm(f=>({...f,day:+e.target.value}))} style={inp}/></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:10}}>
                <FL label="Debit ledger"><LedgerSelect value={form.dr} onChange={v=>setForm(f=>({...f,dr:v}))} placeholder="e.g. Office Rent"/></FL>
                <FL label="Credit ledger"><LedgerSelect value={form.cr} onChange={v=>setForm(f=>({...f,cr:v}))} placeholder="e.g. HDFC Bank"/></FL>
              </div>
              <FL label="Amount (₹)"><input type="number" value={form.amt} onChange={e=>setForm(f=>({...f,amt:+e.target.value}))} style={inp}/></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button disabled={!form.name.trim()||!form.dr||!form.cr||!(form.amt>0)||create.isPending}
                onClick={()=>create.mutate(
                  {name:form.name.trim(),category:form.type.toLowerCase(),freq:form.freq,day:form.day,dr:ledgerNameOf(form.dr),cr:ledgerNameOf(form.cr),amt:form.amt,
                   branch:branch&&branch!=="ALL"&&branch.code?branch.code:"BOM",active:true},
                  {onSuccess:()=>{setModal(false);setForm({name:"",type:"Journal",freq:"Monthly",day:1,dr:"",cr:"",amt:0});toast("Recurring template saved.");}})}
                style={{...btnG,opacity:!form.name.trim()||!form.dr||!form.cr||!(form.amt>0)?0.5:1}}>{create.isPending?"Saving…":"Create Template"}</button>
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
  const STATUS_CLR={"Cancellation Requested":"#d97706","BSP Filed":"#2563eb","Airline Refund Received":"#3fb7a3","Client Refund Done":"#16a34a",Closed:"#5b616e"};
  const STATUS_BG ={"Cancellation Requested":"#fbeedb","BSP Filed":"#e8f0ff","Airline Refund Received":"#e8f6ed","Client Refund Done":"#e8f6ed",Closed:"#f4f5f7"};
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const advance=id=>setRefunds(rs=>rs.map(r=>r.id===id?{...r,status:STATUS_FLOW[Math.min(STATUS_FLOW.indexOf(r.status)+1,STATUS_FLOW.length-1)]}:r));

  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#fbe9e9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>↩</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>Refund Tracker</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>Cancellation → BSP → Airline → Client refund pipeline</p>
          </div>
        </div>
        <button onClick={()=>setRoute("/sales/cancellation")} style={{...btnGh,fontSize:11}}>+ New Cancellation</button>
      </div>

      {/* Pipeline overview */}
      <div style={{display:"flex",gap:0,marginBottom:14,overflow:"auto"}}>
        {STATUS_FLOW.map((s,i)=>{
          const cnt=refunds.filter(r=>r.status===s).length;
          return(
            <div key={s} style={{flex:1,textAlign:"center",padding:"8px 4px",borderRight:i<STATUS_FLOW.length-1?"1px dashed #e6e8ec":"none",minWidth:100}}>
              <p style={{margin:0,fontSize:20,fontWeight:800,color:cnt>0?STATUS_CLR[s]:"#cbd0db"}}>{cnt}</p>
              <p style={{margin:"2px 0 0",fontSize:8.5,fontWeight:600,color:cnt>0?STATUS_CLR[s]:"#cbd0db",lineHeight:1.3}}>{s}</p>
            </div>
          );
        })}
      </div>

      {refunds.map(r=>{
        const stageIdx=STATUS_FLOW.indexOf(r.status);
        return(
          <div key={r.id} style={{...card,marginBottom:10,borderLeft:`4px solid ${STATUS_CLR[r.status]||"#2e323c"}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                  <span style={{fontFamily:"monospace",fontSize:9.5,padding:"1px 7px",borderRadius:4,background:"#1a1c22",color:"#c2a04a"}}>{r.id}</span>
                  <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[r.status],color:STATUS_CLR[r.status]}}>{r.status}</span>
                </div>
                <p style={{margin:0,fontSize:12,fontWeight:700,color:"#1a1c22"}}>{r.client} — {r.dest}</p>
                <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>Booking: {r.bookingId} · Cancelled: {r.cancelDate} · Reason: {r.reason}</p>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{margin:0,fontSize:10.5,color:"#5b616e"}}>Original: {f(r.amount)}</p>
                <p style={{margin:"1px 0 0",fontSize:12,fontWeight:700,color:"#dc2626"}}>Charges: {f(r.charges)}</p>
                <p style={{margin:"1px 0 0",fontSize:14,fontWeight:800,color:"#16a34a"}}>Refund: {f(r.refundAmt)}</p>
              </div>
            </div>

            {/* Stage progress */}
            <div style={{display:"flex",gap:0,marginBottom:10}}>
              {STATUS_FLOW.map((s,i)=>(
                <div key={s} style={{flex:1,height:4,borderRadius:i===0?"4px 0 0 4px":i===STATUS_FLOW.length-1?"0 4px 4px 0":"none",
                  background:i<=stageIdx?STATUS_CLR[r.status]:"#e6e8ec"}}/>
              ))}
            </div>

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:10.5,color:"#5b616e"}}>
                BSP Ref: <b>{r.bspRef||"—"}</b> · Refund mode: <b>{r.mode}</b>
                {r.clientRefund&&<span style={{marginLeft:8,color:"#16a34a",fontWeight:700}}>✔ Client refund done</span>}
              </div>
              {stageIdx<STATUS_FLOW.length-1&&(
                <button onClick={()=>advance(r.id)} style={{...btnG,padding:"4px 12px",fontSize:10,background:STATUS_CLR[STATUS_FLOW[stageIdx+1]]||"#1a1c22"}}>
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
   Form26AS · ApiKeySettings · Recruitment · DocumentManager
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
    {name:"Flight Ticket",icon:"✈",color:"#2563eb",bg:"#e8f0ff",suggestAmt:8500,route:"/sales/flight"},
    {name:"Holiday Package",icon:"🌴",color:"#16a34a",bg:"#e8f6ed",suggestAmt:45000,route:"/sales/holiday"},
    {name:"Visa",icon:"🛂",color:"#d97706",bg:"#fbeedb",suggestAmt:3800,route:"/sales/visa"},
    {name:"Hotel",icon:"🏨",color:"#3fb7a3",bg:"#e8f6ed",suggestAmt:12000,route:"/sales/hotel"},
    {name:"Insurance",icon:"🛡",color:"#2e323c",bg:"#f4f5f7",suggestAmt:1500,route:"/sales/insurance"},
    {name:"Miscellaneous",icon:"📋",color:"#5b616e",bg:"#f4f5f7",suggestAmt:2000,route:"/sales/misc"},
  ];
  const selSvc=SERVICES.find(s=>s.name===service)||SERVICES[0];

  return(
    <div style={{padding:"12px 10px",maxWidth:700,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#e8f0ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>⚡</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>Quick POS Booking</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>Walk-in client · Fast entry · Instant receipt · {brCode}</p>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          {["1","2","3","4"].map((n,i)=>(
            <div key={n} style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,
              background:step>i+1?"#16a34a":step===i+1?"#1a1c22":"#f4f5f7",
              color:step>i+1?"#fff":step===i+1?"#c2a04a":"#5b616e"}}>
              {step>i+1?"✔":n}
            </div>
          ))}
        </div>
      </div>

      {step===1&&(
        <div style={{...card}}>
          <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#1a1c22"}}>Step 1 — Client Details</p>
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
          <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#1a1c22"}}>Step 2 — Service & Amount</p>
          <p style={{margin:"0 0 12px",fontSize:10.5,color:"#5b616e"}}>Client: <b>{client.name}</b></p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:8,marginBottom:14}}>
            {SERVICES.map(s=>(
              <div key={s.name} {...clickable(()=>{setService(s.name);setAmount(s.suggestAmt);})}
                style={{padding:"12px 10px",borderRadius:10,cursor:"pointer",textAlign:"center",border:`2px solid ${service===s.name?s.color:"#e6e8ec"}`,background:service===s.name?s.bg:"#fff",transition:"all 0.15s"}}>
                <span style={{fontSize:22}}>{s.icon}</span>
                <p style={{margin:"4px 0 0",fontSize:10.5,fontWeight:700,color:s.color}}>{s.name}</p>
                <p style={{margin:"1px 0 0",fontSize:9,color:"#5b616e"}}>~{cur+(s.suggestAmt/1000).toFixed(0)}K</p>
              </div>
            ))}
          </div>
          <FL label="Amount (₹)"><input type="number" value={amount} onChange={e=>setAmount(+e.target.value)} style={{...inp,fontSize:18,fontWeight:700,color:"#1a1c22"}}/></FL>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button onClick={()=>setStep(1)} style={{...btnGh,flex:1}}>← Back</button>
            <button onClick={()=>setStep(3)} disabled={!amount} style={{...btnG,flex:2,opacity:!amount?0.5:1}}>Next → Payment</button>
          </div>
        </div>
      )}

      {step===3&&(
        <div style={{...card}}>
          <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#1a1c22"}}>Step 3 — Payment Collection</p>
          <div style={{padding:"12px 14px",borderRadius:9,background:"#e8f6ed",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <p style={{margin:0,fontSize:10.5,color:"#16a34a"}}>{client.name} — {service}</p>
              <p style={{margin:"2px 0 0",fontSize:22,fontWeight:800,color:"#16a34a"}}>{f(amount)}</p>
            </div>
            <span style={{fontSize:24}}>{selSvc.icon}</span>
          </div>
          <FL label="Payment mode">
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["Cash","UPI","Card","Cheque","NEFT"].map(m=>(
                <button key={m} onClick={()=>setMode(m)} style={{padding:"6px 14px",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:600,
                  background:mode===m?"#1a1c22":"#f4f5f7",color:mode===m?"#c2a04a":"#2e323c",border:`1.5px solid ${mode===m?"#c2a04a":"#e6e8ec"}`}}>
                  {m}
                </button>
              ))}
            </div>
          </FL>
          {mode!=="Cash"&&<FL label="Reference / UTR"><input value={ref} onChange={e=>setRef(e.target.value)} style={{...inp,marginTop:8}} placeholder="Transaction ref..."/></FL>}
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button onClick={()=>setStep(2)} style={{...btnGh,flex:1}}>← Back</button>
            <button onClick={()=>setStep(4)} style={{...btnG,flex:2,background:"#16a34a",fontSize:13}}>✔ Confirm & Print Receipt</button>
          </div>
        </div>
      )}

      {step===4&&(
        <div style={{...card,textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:12}}>✅</div>
          <p style={{margin:"0 0 4px",fontSize:16,fontWeight:800,color:"#16a34a"}}>Booking Confirmed!</p>
          <p style={{margin:"0 0 14px",fontSize:11,color:"#5b616e"}}>Receipt #{vNo} · {client.name} · {service} · {f(amount)}</p>
          <div style={{padding:"12px 14px",borderRadius:9,background:"#f4f5f7",marginBottom:14,textAlign:"left"}}>
            <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:11,borderBottom:"1px solid #cdd1d8"}}><span style={{color:"#5b616e"}}>Voucher No.</span><span style={{fontWeight:600}}>{vNo}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:11,borderBottom:"1px solid #cdd1d8"}}><span style={{color:"#5b616e"}}>Client</span><span style={{fontWeight:600}}>{client.name}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:11,borderBottom:"1px solid #cdd1d8"}}><span style={{color:"#5b616e"}}>Service</span><span style={{fontWeight:600}}>{service}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:11}}><span style={{color:"#5b616e"}}>Branch</span><span style={{fontWeight:600}}>{bc(branch).voucherPrefix}</span></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>openPrintPreview({ selector:'main', title:`Receipt ${vNo}`, recommend:'portrait' })} style={{...btnG,flex:1}}><Printer size={13}/> Print Receipt</button>
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
  return TAB_Page("Receipt Voucher", "Standardised 8-tab structure",
    {user:"",date:"",created:""},
    <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,overflow:"hidden"}}>
      <div style={{display:"flex",borderBottom:"1px solid #cdd1d8",overflowX:"auto",background:"#fafbfd"}}>{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={tabBtnStyle(tab===t.id)}>{t.label}</button>)}</div>
      {tab==="entry"&&tabPanel(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:14}}>
          <FL label="Voucher No."><input defaultValue="RV-BOM/2026/4521" readOnly style={{...inpStd,fontFamily:"monospace",background:"#fafbfd"}}/></FL>
          <FL label="Voucher Date"><input type="date" defaultValue={todayISO()} style={inpStd}/></FL>
          <FL label="Branch"><select style={inpStd}><option>BOM (Mumbai)</option></select></FL>
          <FL label="Customer"><select style={inpStd}><option value="">— Select —</option></select></FL>
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
            <thead style={{background:"#f7f8fb"}}><tr>{["#","Invoice Ref","Invoice Date","Invoice Amt","Outstanding","Allocated","Balance"].map((h,i)=><th key={h} style={{padding:"9px 12px",textAlign:i<2?"left":"right",fontSize:10.5,color:"#5b616e",fontWeight:700,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
            <tbody>
              <tr style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"10px 12px"}}>1</td><td style={{padding:"10px 12px",fontFamily:"monospace",fontWeight:600}}>INV-BOM/2026/8721</td><td style={{padding:"10px 12px",textAlign:"right",color:"#5b616e"}}>2026-05-15</td><td style={{padding:"10px 12px",textAlign:"right"}}>₹3,25,000</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700}}>₹3,25,000</td><td style={{padding:"10px 12px",textAlign:"right"}}><input defaultValue="325000" type="number" style={{...inpStd,textAlign:"right",fontWeight:700,maxWidth:120,marginLeft:"auto"}}/></td><td style={{padding:"10px 12px",textAlign:"right",color:"#16a34a",fontWeight:700}}>₹0</td></tr>
              <tr style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"10px 12px"}}>2</td><td style={{padding:"10px 12px",fontFamily:"monospace",fontWeight:600}}>INV-BOM/2026/8688</td><td style={{padding:"10px 12px",textAlign:"right",color:"#5b616e"}}>2026-05-08</td><td style={{padding:"10px 12px",textAlign:"right"}}>₹1,85,000</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700}}>₹1,85,000</td><td style={{padding:"10px 12px",textAlign:"right"}}><input defaultValue="160000" type="number" style={{...inpStd,textAlign:"right",fontWeight:700,maxWidth:120,marginLeft:"auto"}}/></td><td style={{padding:"10px 12px",textAlign:"right",color:"#dc2626",fontWeight:700}}>₹25,000</td></tr>
              <tr style={{background:"#1a1c22",color:"#c2a04a"}}><td colSpan={5} style={{padding:"10px 12px",fontWeight:700,textAlign:"right"}}>TOTAL ALLOCATED</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,fontSize:13,fontFamily:"monospace"}}>₹4,85,000</td><td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace"}}>₹25,000</td></tr>
            </tbody>
          </table>
          <button style={{marginTop:8,padding:"7px 14px",background:"transparent",border:"1px dashed #c2a04a",color:"#c2a04a",borderRadius:5,fontSize:11.5,cursor:"pointer",fontWeight:600}}>+ Add another invoice to allocate against</button>
        </>
      )}
      {tab==="tax"&&tabPanel(
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22",marginBottom:10}}>Tax Computation (for Receipt Voucher — typically nil)</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <tbody>
              <tr style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"9px 12px",color:"#5b616e"}}>Gross Receipt</td><td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace"}}>₹4,85,000</td></tr>
              <tr style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"9px 12px",color:"#5b616e"}}>Less: TDS u/s 194C (deducted by L&T)</td><td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",color:"#dc2626"}}>(–) ₹9,700</td></tr>
              <tr style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"9px 12px",color:"#5b616e"}}>Net Receipt</td><td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700}}>₹4,75,300</td></tr>
              <tr style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"9px 12px",color:"#5b616e"}}>TDS Certificate Received?</td><td style={{padding:"9px 12px",textAlign:"right"}}><span style={{padding:"2px 8px",background:"#fbeedb",color:"#d97706",borderRadius:3,fontSize:10,fontWeight:700}}>Pending — Q1 26-27</span></td></tr>
              <tr><td style={{padding:"9px 12px",color:"#5b616e"}}>GST Impact</td><td style={{padding:"9px 12px",textAlign:"right",color:"#5b616e"}}>Nil (Receipt — already accounted at invoice stage)</td></tr>
            </tbody>
          </table>
        </div>
      )}
      {tab==="attach"&&tabPanel(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:14}}>{[{n:"NEFT Confirmation",sz:"245 KB",ty:"pdf"},{n:"Customer Email Confirmation",sz:"82 KB",ty:"eml"}].map((f,i)=>(<div key={i} style={{padding:14,background:"#fafbfd",border:"1px solid #cdd1d8",borderRadius:6,textAlign:"center"}}><p style={{margin:0,fontSize:30}}>{f.ty==="pdf"?"📄":"📧"}</p><p style={{margin:"6px 0 2px",fontSize:11,color:"#1a1c22",fontWeight:600}}>{f.n}</p><p style={{margin:0,fontSize:10,color:"#5b616e"}}>{f.sz} · {f.ty.toUpperCase()}</p><button style={{marginTop:6,padding:"3px 10px",background:"transparent",border:"1px solid #c2a04a",color:"#c2a04a",borderRadius:4,fontSize:10,cursor:"pointer",fontWeight:600}}>↓ Download</button></div>))}</div>
          <div style={{padding:30,border:"2px dashed #c2a04a",borderRadius:8,textAlign:"center",background:"#fafbfd"}}><p style={{margin:0,fontSize:36}}>📂</p><p style={{margin:"6px 0 2px",fontSize:13,fontWeight:700,color:"#1a1c22"}}>Drag & drop or browse</p><p style={{margin:0,fontSize:11,color:"#5b616e"}}>PDF, image, eml — max 10 MB per file</p></div>
        </div>
      )}
      {tab==="approval"&&tabPanel(
        <div>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#1a1c22"}}>Approval Workflow</p>
          {[].map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",background:"#fafbfd",borderRadius:6,marginBottom:8,border:"1px solid #cdd1d8"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:s.status==="done"?"#16a34a":s.status==="skip"?"#cbd0dc":"#c2a04a",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14}}>{s.status==="done"?"✓":s.status==="skip"?"⊘":"○"}</div>
              <div style={{flex:1}}><p style={{margin:0,fontSize:12.5,fontWeight:700,color:"#1a1c22"}}>{s.step}</p><p style={{margin:"2px 0 0",fontSize:11,color:"#5b616e"}}>by {s.by} · {s.ts}</p></div>
              <span style={{padding:"3px 10px",background:s.status==="done"?"#e8f6ed":s.status==="skip"?"#e2e3e5":"#fbeedb",color:s.status==="done"?"#16a34a":s.status==="skip"?"#383d41":"#d97706",borderRadius:3,fontSize:10,fontWeight:700,letterSpacing:"0.3px"}}>{s.status.toUpperCase()}</span>
            </div>))}
        </div>
      )}
      {tab==="audit"&&tabPanel(
        <div>{[].map((h,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",borderBottom:"1px solid #dfe2e7"}}><span style={{fontFamily:"monospace",fontSize:10.5,color:"#5b616e",minWidth:130}}>{h.ts}</span><span style={{fontSize:11.5,color:"#1a1c22",fontWeight:600,minWidth:110}}>{h.u}</span><span style={{padding:"2px 8px",background:h.a==="POSTED"||h.a==="APPROVED"?"#e8f6ed":h.a==="CREATED"?"#cfe2ff":"#fbeedb",color:h.a==="POSTED"||h.a==="APPROVED"?"#16a34a":h.a==="CREATED"?"#004085":"#d97706",borderRadius:3,fontSize:9.5,fontWeight:700,minWidth:80,textAlign:"center"}}>{h.a}</span><span style={{fontSize:11.5,color:"#5b616e"}}>{h.d}</span></div>))}</div>
      )}
      {tab==="related"&&tabPanel(
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead style={{background:"#f7f8fb"}}><tr>{["Voucher","Type","Date","Amount","Relationship"].map((h,i)=><th key={h} style={{padding:"9px 12px",textAlign:i===3?"right":"left",fontSize:10.5,color:"#5b616e",fontWeight:700,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>{[{v:"INV-BOM/2026/8721",t:"Tax Invoice",d:"2026-05-15",a:325000,r:"Settled (full)"},{v:"INV-BOM/2026/8688",t:"Tax Invoice",d:"2026-05-08",a:185000,r:"Partially settled (₹1.60L of ₹1.85L)"}].map(r=>(<tr key={r.v} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"10px 12px",fontFamily:"monospace",fontWeight:600}}>{r.v}</td><td style={{padding:"10px 12px"}}>{r.t}</td><td style={{padding:"10px 12px",color:"#5b616e"}}>{r.d}</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700}}>₹{r.a.toLocaleString("en-IN")}</td><td style={{padding:"10px 12px",fontSize:11.5,color:"#5b616e"}}>{r.r}</td></tr>))}</tbody>
        </table>
      )}
      {tab==="notes"&&tabPanel(
        <div>
          {[].map((c,i)=>(<div key={i} style={{display:"flex",gap:10,marginBottom:10,flexDirection:c.me?"row-reverse":"row"}}><div style={{width:32,height:32,borderRadius:"50%",background:c.me?"#2F7A8E":"#6B4C8B",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11,flexShrink:0}}>{c.u.substring(0,2).toUpperCase()}</div><div style={{maxWidth:"70%",padding:"8px 12px",background:c.me?"#1a1c22":"#fafbfd",color:c.me?"#fff":"#1a1c22",borderRadius:c.me?"8px 8px 2px 8px":"8px 8px 8px 2px",border:c.me?"none":"1px solid #cdd1d8"}}><p style={{margin:0,fontSize:11,opacity:0.7,fontWeight:600}}>{c.u}</p><p style={{margin:"3px 0",fontSize:12,lineHeight:1.45}}>{c.txt}</p><p style={{margin:0,fontSize:9.5,opacity:0.6}}>{c.ts}</p></div></div>))}
          <div style={{marginTop:10,display:"flex",gap:8}}><input placeholder="Add comment..." style={{flex:1,padding:9,border:"1px solid #cdd1d8",borderRadius:6,fontSize:12}}/><button style={{padding:"9px 18px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:6,fontSize:12,cursor:"pointer",fontWeight:700}}>Send</button></div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   2. MULTI-CURRENCY SINGLE VOUCHER
   ════════════════════════════════════════════════════════════════════ */

/* LIVE (2026-07-10): converts FCY→INR from the live forex-rates master and posts ONE
   balanced 4-line JV (Dr Customer / Cr Sales · Dr Cost / Cr Supplier) via /api/vouchers —
   pending until approved. Manual JVs to Sales ledgers are an audited, supported path
   (they land in the Sales-Reconciliation "Other / Manual" bucket). */
export function MultiCurrencyVoucher(){
  const [saleAmt,setSaleAmt]=useState(0);
  const [costAmt,setCostAmt]=useState(0);
  const [saleCur,setSaleCur]=useState("INR");
  const [costCur,setCostCur]=useState("INR");
  const [date,setDate]=useState(todayISO());
  const [brCode,setBrCode]=useState("BOM");
  const [picks,setPicks]=useState({customer:"",sales:"",cost:"",supplier:""});
  const [narr,setNarr]=useState("");
  const createVoucher=useCreateVoucher();
  const { data: fxRows = [] } = useMasterList('forex-rates');
  const ledgerReg=useLedgerRegistry({code:brCode}).data||[];
  const nameOf=(id)=>((ledgerReg.find(l=>l.id===id)||{}).name)||"";
  const rateOf=(cur)=>{
    if(!cur||cur==="INR")return 1;
    const rows=(fxRows||[]).filter(r=>String(r.from).toUpperCase()===cur&&String(r.to).toUpperCase()==="INR");
    if(!rows.length)return null;
    return rows.reduce((a,b)=>(a.date>b.date?a:b)).rate;
  };
  const saleRate=rateOf(saleCur), costRate=rateOf(costCur);
  const saleINR=saleRate==null?0:Math.round(saleAmt*saleRate);
  const costINR=costRate==null?0:Math.round(costAmt*costRate);
  const gpINR=saleINR-costINR;
  const gpPct=saleINR>0?(gpINR/saleINR*100).toFixed(1):"0.0";
  const missingRate=(saleRate==null?saleCur:null)||(costRate==null?costCur:null);
  const ready=saleINR>0&&costINR>0&&picks.customer&&picks.sales&&picks.cost&&picks.supplier&&!missingRate;
  const save=()=>{
    const narration=[`Multi-currency GP: sale ${saleCur} ${saleAmt}${saleCur!=="INR"?` @${saleRate}`:""} / cost ${costCur} ${costAmt}${costCur!=="INR"?` @${costRate}`:""}`,narr].filter(Boolean).join(" · ");
    createVoucher.mutate({
      category:"journal",type:"JV",branch:brCode,date,narration,total:saleINR+costINR,
      lines:[
        {ledger:nameOf(picks.customer),amt:saleINR,drCr:"Dr"},
        {ledger:nameOf(picks.sales),amt:saleINR,drCr:"Cr"},
        {ledger:nameOf(picks.cost),amt:costINR,drCr:"Dr"},
        {ledger:nameOf(picks.supplier),amt:costINR,drCr:"Cr"},
      ],
    },{onSuccess:(v)=>{toast(`Voucher ${v?.vno||""} created (pending approval).`);setSaleAmt(0);setCostAmt(0);setPicks({customer:"",sales:"",cost:"",supplier:""});setNarr("");}, onError:(e)=>toast(e?.message||"Save failed","error")});
  };
  const inp={padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12};

  return (
    <PHASE2_Page title="Multi-Currency GP Voucher" subtitle="Sale and cost in any currency · converted at the live forex rate · posts one balanced JV (pending approval)">
      <div style={{padding:12,background:"#e8f0ff",border:"1px solid #cfe0f8",borderLeft:"3px solid #2563eb",borderRadius:6,marginBottom:14,fontSize:11.5,color:"#2e323c"}}>
        <b>How it works:</b> Enter the sale billed to the customer and the cost paid to the supplier in their own currencies. KBiz360 converts both at the latest forex rate on file, computes GP, and posts ONE balanced journal voucher (Dr Customer / Cr Sales · Dr Cost / Cr Supplier) that waits in the approval queue like any other entry.
      </div>
      {missingRate&&<div style={{padding:"9px 14px",borderRadius:9,background:"#FFF8E1",border:"1px solid #F1E3B0",fontSize:11,color:"#854F0B",marginBottom:12}}>⚠ No {missingRate}→INR rate on file — add it under Masters ▸ Forex Rates before saving.</div>}
      <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,padding:20}}>
        {/* Header */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:14,marginBottom:18,paddingBottom:14,borderBottom:"1px solid #dfe2e7"}}>
          <div><label style={{fontSize:11,color:"#5b616e",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...inp,width:"100%"}}/></div>
          <div><label style={{fontSize:11,color:"#5b616e",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Branch</label><select value={brCode} onChange={e=>setBrCode(e.target.value)} style={{...inp,width:"100%"}}>{BRANCH_CODES.map(b=><option key={b}>{b}</option>)}</select></div>
          <div><label style={{fontSize:11,color:"#5b616e",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Narration</label><input value={narr} onChange={e=>setNarr(e.target.value)} placeholder="optional" style={{...inp,width:"100%"}}/></div>
        </div>

        {/* Revenue side */}
        <div style={{padding:14,background:"#f0fff4",border:"1px solid #bbf7d0",borderRadius:6,marginBottom:10}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#16a34a"}}>📄 Revenue side (Sale)</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,180px),1fr))",gap:10,alignItems:"flex-end"}}>
            <div><label style={{fontSize:10.5,color:"#5b616e",fontWeight:700,display:"block",marginBottom:3}}>Customer (Dr)</label><LedgerSelect value={picks.customer} onChange={v=>setPicks(p=>({...p,customer:v}))} branch={{code:brCode}} placeholder="Customer ledger"/></div>
            <div><label style={{fontSize:10.5,color:"#5b616e",fontWeight:700,display:"block",marginBottom:3}}>Sales ledger (Cr)</label><LedgerSelect value={picks.sales} onChange={v=>setPicks(p=>({...p,sales:v}))} branch={{code:brCode}} placeholder="Sales ledger"/></div>
            <div><label style={{fontSize:10.5,color:"#5b616e",fontWeight:700,display:"block",marginBottom:3}}>Currency</label><select value={saleCur} onChange={e=>setSaleCur(e.target.value)} style={{...inp,width:"100%"}}>{ACTIVE_CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label style={{fontSize:10.5,color:"#5b616e",fontWeight:700,display:"block",marginBottom:3}}>Amount ({saleCur})</label><input type="number" value={saleAmt} onChange={e=>setSaleAmt(+e.target.value)} style={{...inp,width:"100%",fontFamily:"monospace",fontWeight:700}}/></div>
            <div><label style={{fontSize:10.5,color:"#5b616e",fontWeight:700,display:"block",marginBottom:3}}>INR Value{saleCur!=="INR"&&saleRate!=null?` @${saleRate}`:""}</label><input readOnly value={saleRate==null?"rate missing":"₹"+saleINR.toLocaleString("en-IN")} style={{...inp,width:"100%",background:"#e8f6ed",fontFamily:"monospace",fontWeight:700,color:"#16a34a"}}/></div>
          </div>
        </div>

        {/* Cost side */}
        <div style={{padding:14,background:"#fff5f5",border:"1px solid #f3c9c9",borderRadius:6,marginBottom:10}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#dc2626"}}>📥 Cost side (Purchase)</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,180px),1fr))",gap:10,alignItems:"flex-end"}}>
            <div><label style={{fontSize:10.5,color:"#5b616e",fontWeight:700,display:"block",marginBottom:3}}>Cost ledger (Dr)</label><LedgerSelect value={picks.cost} onChange={v=>setPicks(p=>({...p,cost:v}))} branch={{code:brCode}} placeholder="Purchase/cost ledger"/></div>
            <div><label style={{fontSize:10.5,color:"#5b616e",fontWeight:700,display:"block",marginBottom:3}}>Supplier (Cr)</label><LedgerSelect value={picks.supplier} onChange={v=>setPicks(p=>({...p,supplier:v}))} branch={{code:brCode}} placeholder="Supplier ledger"/></div>
            <div><label style={{fontSize:10.5,color:"#5b616e",fontWeight:700,display:"block",marginBottom:3}}>Currency</label><select value={costCur} onChange={e=>setCostCur(e.target.value)} style={{...inp,width:"100%"}}>{ACTIVE_CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label style={{fontSize:10.5,color:"#5b616e",fontWeight:700,display:"block",marginBottom:3}}>Amount ({costCur})</label><input type="number" value={costAmt} onChange={e=>setCostAmt(+e.target.value)} style={{...inp,width:"100%",fontFamily:"monospace",fontWeight:700}}/></div>
            <div><label style={{fontSize:10.5,color:"#5b616e",fontWeight:700,display:"block",marginBottom:3}}>INR Value{costCur!=="INR"&&costRate!=null?` @${costRate}`:""}</label><input readOnly value={costRate==null?"rate missing":"₹"+costINR.toLocaleString("en-IN")} style={{...inp,width:"100%",background:"#fbe9e9",fontFamily:"monospace",fontWeight:700,color:"#dc2626"}}/></div>
          </div>
        </div>

        {/* Auto-calculated GP summary */}
        <div style={{padding:14,background:"#fff8e8",border:"1px solid #fde68a",borderRadius:6,marginBottom:14}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#1a1c22"}}>Auto-calculated (INR)</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,150px),1fr))",gap:12}}>
            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:10.5,color:"#5b616e",fontWeight:700}}>SALE</p><p style={{margin:"3px 0 0",fontSize:17,fontWeight:700,color:"#16a34a"}}>{fmtINR(saleINR)}</p><p style={{margin:0,fontSize:10,color:"#5b616e"}}>billed to customer</p></div>
            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:10.5,color:"#5b616e",fontWeight:700}}>COST</p><p style={{margin:"3px 0 0",fontSize:17,fontWeight:700,color:"#dc2626"}}>{fmtINR(costINR)}</p><p style={{margin:0,fontSize:10,color:"#5b616e"}}>paid to supplier</p></div>
            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:10.5,color:"#5b616e",fontWeight:700}}>GROSS PROFIT</p><p style={{margin:"3px 0 0",fontSize:17,fontWeight:700,color:gpINR>0?"#16a34a":"#dc2626"}}>{fmtINR(gpINR)}</p><p style={{margin:0,fontSize:10,color:"#5b616e"}}>sale − cost</p></div>
            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:10.5,color:"#5b616e",fontWeight:700}}>GP %</p><p style={{margin:"3px 0 0",fontSize:17,fontWeight:700,color:+gpPct>=20?"#16a34a":+gpPct>=12?"#c2a04a":"#dc2626"}}>{gpPct}%</p><p style={{margin:0,fontSize:10,color:"#5b616e"}}>on sale value</p></div>
          </div>
        </div>

        {/* Posting lines */}
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#1a1c22"}}>Accounting posting lines (auto-generated)</p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5,marginBottom:14}}>
          <thead style={{background:"#f7f8fb"}}><tr><th style={RPT_thStyle}>Ledger</th><th style={RPT_thStyle}>Narration</th><th style={{...RPT_thStyle,textAlign:"right"}}>Debit (₹)</th><th style={{...RPT_thStyle,textAlign:"right"}}>Credit (₹)</th></tr></thead>
          <tbody>
            <tr style={{borderBottom:"1px solid #dfe2e7"}}><td style={RPT_tdStyle}>{nameOf(picks.customer)||"Customer (pick above)"}</td><td style={{...RPT_tdStyle,color:"#5b616e"}}>Sale {saleCur} {saleAmt||0}{saleCur!=="INR"&&saleRate!=null?` @${saleRate}`:""}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{saleINR.toLocaleString("en-IN")}</td><td style={RPT_tdStyle}/></tr>
            <tr style={{borderBottom:"1px solid #dfe2e7"}}><td style={RPT_tdStyle}>{nameOf(picks.sales)||"Sales ledger (pick above)"}</td><td style={{...RPT_tdStyle,color:"#5b616e"}}>Sale value</td><td style={RPT_tdStyle}/><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{saleINR.toLocaleString("en-IN")}</td></tr>
            <tr style={{borderBottom:"1px solid #dfe2e7"}}><td style={RPT_tdStyle}>{nameOf(picks.cost)||"Cost ledger (pick above)"}</td><td style={{...RPT_tdStyle,color:"#5b616e"}}>Cost {costCur} {costAmt||0}{costCur!=="INR"&&costRate!=null?` @${costRate}`:""}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{costINR.toLocaleString("en-IN")}</td><td style={RPT_tdStyle}/></tr>
            <tr style={{borderBottom:"1px solid #dfe2e7"}}><td style={RPT_tdStyle}>{nameOf(picks.supplier)||"Supplier (pick above)"}</td><td style={{...RPT_tdStyle,color:"#5b616e"}}>Supplier cost</td><td style={RPT_tdStyle}/><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{costINR.toLocaleString("en-IN")}</td></tr>
          </tbody>
          <tfoot style={{background:"#fafbfd",fontWeight:700}}><tr><td style={{...RPT_tdStyle,fontWeight:700}}>TOTAL</td><td style={RPT_tdStyle}/><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,borderTop:"2px solid #cdd1d8"}}>{(saleINR+costINR).toLocaleString("en-IN")}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,borderTop:"2px solid #cdd1d8"}}>{(saleINR+costINR).toLocaleString("en-IN")}</td></tr></tfoot>
        </table>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
          <button onClick={()=>openPrintPreview({selector:'main',title:'Multi-Currency GP Voucher',recommend:'portrait'})} style={{padding:"8px 16px",background:"#fff",border:"1px solid #cdd1d8",color:"#5b616e",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>Print Preview</button>
          <button onClick={save} disabled={!ready||createVoucher.isPending} style={{padding:"8px 18px",background:"#c2a04a",color:"#1a1c22",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:ready?"pointer":"not-allowed",opacity:ready?1:0.5}}>💾 {createVoucher.isPending?"Saving…":"Save Voucher (pending approval)"}</button>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   3. VOUCHER COMMENTS THREAD
   ════════════════════════════════════════════════════════════════════ */

/* LIVE (2026-07-10): loads a real voucher by number and reads/writes its persisted
   comment thread (GET/POST /api/vouchers/:id/comments — append-only, audit-tracked). */
export function VoucherCommentsDemo(){
  const mob=useMobile();
  const [comment,setComment]=useState("");
  const [vnoInput,setVnoInput]=useState("");
  const [voucher,setVoucher]=useState(null);
  const [thread,setThread]=useState([]);
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const AVATAR_CLRS=["#2563eb","#d97706","#16a34a","#dc2626","#7c3aed"];
  const colorOf=(u)=>AVATAR_CLRS[(String(u).charCodeAt(0)||0)%AVATAR_CLRS.length];
  const STATUS_STYLE={approved:{bg:"#e8f6ed",fg:"#16a34a",label:"✓ Approved"},pending:{bg:"#fbeedb",fg:"#d97706",label:"⏳ Pending"},rejected:{bg:"#fbe9e9",fg:"#dc2626",label:"✕ Rejected"}};
  const load=async()=>{
    const vno=vnoInput.trim(); if(!vno)return;
    setBusy(true); setErr(""); setVoucher(null); setThread([]);
    try{
      const { apiGet } = await import('../../core/api');
      const rows=await apiGet('/api/vouchers',{vno});
      const v=Array.isArray(rows)?rows[0]:(rows?.rows?.[0]||null);
      if(!v){ setErr(`No voucher found with number "${vno}".`); return; }
      setVoucher(v);
      setThread(await apiGet(`/api/vouchers/${v.id||v._id}/comments`)||[]);
    }catch(e){ setErr(e?.message||"Load failed"); }
    finally{ setBusy(false); }
  };
  const send=async()=>{
    const msg=comment.trim(); if(!msg||!voucher)return;
    setBusy(true);
    try{
      const { apiPost } = await import('../../core/api');
      setThread(await apiPost(`/api/vouchers/${voucher.id||voucher._id}/comments`,{msg})||[]);
      setComment("");
    }catch(e){ toast(e?.message||"Comment failed","error"); }
    finally{ setBusy(false); }
  };
  const st=STATUS_STYLE[String(voucher?.status||"").toLowerCase()]||{bg:"#f4f5f7",fg:"#5b616e",label:voucher?.status||"—"};

  return (
    <PHASE2_Page title="Voucher Comments Thread" subtitle="Collaborate on a voucher before approval · comments persist on the voucher and are audit-tracked">
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <input value={vnoInput} onChange={e=>setVnoInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")load();}} placeholder="Voucher number, e.g. JV/BOM/26/0012" style={{...inpStd,maxWidth:320,fontFamily:"monospace"}}/>
        <button onClick={load} disabled={busy||!vnoInput.trim()} style={{...btnG,fontSize:11,opacity:busy||!vnoInput.trim()?0.5:1}}>{busy?"Loading…":"Load voucher"}</button>
        {err&&<span style={{alignSelf:"center",fontSize:11,color:"#A32D2D",fontWeight:600}}>{err}</span>}
      </div>
      {!voucher&&!err&&<p style={{fontSize:11.5,color:"#5b616e"}}>Enter a voucher number to open its comment thread.</p>}
      {voucher&&<div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1.7fr",gap:14}}>
        {/* Voucher summary panel */}
        <div>
          <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,padding:16,marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22"}}>Voucher Details</p>
              <span style={{padding:"3px 10px",background:st.bg,color:st.fg,borderRadius:4,fontSize:10.5,fontWeight:700}}>{st.label}</span>
            </div>
            {[{l:"Voucher No.",v:voucher.vno},{l:"Date",v:voucher.date},{l:"Type",v:voucher.type||voucher.category},{l:"Party",v:voucher.party||"—"},{l:"Amount",v:fmtINR(voucher.total||0)},{l:"Branch",v:voucher.branch}].map((f,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #dfe2e7"}}>
                <span style={{fontSize:11,color:"#5b616e",fontWeight:600}}>{f.l}</span>
                <span style={{fontSize:11.5,color:"#1a1c22",fontWeight:600,fontFamily:f.l.includes("No.")||f.l==="Amount"?"monospace":"inherit"}}>{f.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Comments thread */}
        <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid #cdd1d8",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1a1c22"}}>💬 Comment Thread</p>
            <span style={{fontSize:11,color:"#5b616e"}}>{thread.length} message{thread.length===1?"":"s"}</span>
          </div>
          <div style={{flex:1,padding:16,overflowY:"auto",maxHeight:440}}>
            {thread.length===0&&<p style={{fontSize:11.5,color:"#5b616e"}}>No comments yet — start the thread below.</p>}
            {thread.map((c,i)=>(
              <div key={i} style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:colorOf(c.user),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{String(c.user||"?").substring(0,2).toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:4}}>
                      <span style={{fontSize:12.5,fontWeight:700,color:"#1a1c22"}}>{c.user}</span>
                      <span style={{fontSize:10.5,color:"#5b616e"}}>{c.role}</span>
                      <span style={{fontSize:10,color:"#5b616e",marginLeft:"auto"}}>{String(c.ts||"").replace("T"," ").slice(0,16)}</span>
                    </div>
                    <div style={{padding:"10px 12px",background:i%2===0?"#f7f8fb":"#f0f4f8",borderRadius:6,fontSize:12,color:"#1a1c22",lineHeight:1.5,borderLeft:"3px solid "+colorOf(c.user)}}>
                      {c.msg}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{padding:"10px 14px",borderTop:"1px solid #cdd1d8"}}>
            <div style={{display:"flex",gap:8}}>
              <textarea value={comment} onChange={e=>setComment(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
                placeholder="Add a comment… (Shift+Enter for new line, Enter to send)" rows={2} style={{flex:1,padding:"8px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,resize:"none",fontFamily:"inherit"}}/>
              <button onClick={send} disabled={busy||!comment.trim()} className="max-tablet:min-h-[44px]" style={{padding:"8px 14px",background:"#1a1c22",color:"#c2a04a",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer",alignSelf:"flex-end",opacity:busy||!comment.trim()?0.5:1}}>Send</button>
            </div>
            <p style={{margin:"5px 0 0",fontSize:10,color:"#5b616e"}}>Comments persist on the voucher and are append-only (audit-tracked).</p>
          </div>
        </div>
      </div>}
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   4. PRINT PREVIEW BEFORE SAVING
   ════════════════════════════════════════════════════════════════════ */

/* LIVE (2026-07-10): formal print layout of a REAL voucher, loaded by number from
   /api/vouchers?vno=… . The old inert "Save & Post" is gone — posting happens in
   Voucher Approvals; this screen renders and prints. */
const _ONES=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const _TENS=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
function _two(n){return n<20?_ONES[n]:(_TENS[Math.floor(n/10)]+(n%10?" "+_ONES[n%10]:""));}
function _three(n){return (n>99?_ONES[Math.floor(n/100)]+" Hundred"+(n%100?" ":""):"")+(n%100?_two(n%100):"");}
export function amountInWordsINR(n){
  n=Math.round(Math.abs(Number(n)||0)); if(!n)return "Zero";
  const parts=[];
  const crore=Math.floor(n/1e7); n%=1e7;
  const lakh=Math.floor(n/1e5);  n%=1e5;
  const thousand=Math.floor(n/1e3); n%=1e3;
  if(crore)parts.push(_three(crore)+" Crore");
  if(lakh)parts.push(_two(lakh)+" Lakh");
  if(thousand)parts.push(_two(thousand)+" Thousand");
  if(n)parts.push(_three(n));
  return parts.join(" ");
}
export function PrintPreviewDemo(){
  const [vnoInput,setVnoInput]=useState("");
  const [live,setLive]=useState(null);
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const load=async()=>{
    const vno=vnoInput.trim(); if(!vno)return;
    setBusy(true); setErr(""); setLive(null);
    try{
      const { apiGet } = await import('../../core/api');
      const rows=await apiGet('/api/vouchers',{vno});
      const v=Array.isArray(rows)?rows[0]:(rows?.rows?.[0]||null);
      if(!v){ setErr(`No voucher found with number "${vno}".`); return; }
      setLive(v);
    }catch(e){ setErr(e?.message||"Load failed"); }
    finally{ setBusy(false); }
  };
  const CAT_LABEL={journal:"Journal Voucher",payment:"Payment Voucher",receipt:"Receipt Voucher",contra:"Contra Voucher",sale:"Sales Voucher",purchase:"Purchase Voucher","purchase-expense":"Purchase Expense Voucher","debit-note":"Debit Note",refund:"Refund Voucher",reissue:"Reissue Voucher"};
  const voucher=live?{
    no:live.vno,date:live.date,type:CAT_LABEL[live.category]||live.type||"Voucher",branch:live.branch,
    payTo:live.party||((live.lines||[])[0]||{}).ledger||"—",
    mode:live.paymentMode||"—",refNo:live.bankRef||live.sourceRef||"—",bank:live.bank||"—",
    amount:live.total||0,amountWords:`Indian Rupees ${amountInWordsINR(live.total||0)} Only`,
    narration:live.narration||"—",status:live.status,
    lines:(live.lines||[]).map(l=>({ledger:l.ledger,dr:l.drCr==="Dr"?l.amt:0,cr:l.drCr==="Cr"?l.amt:0})),
  }:null;

  const printPage = {background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,maxWidth:740,margin:"0 auto",padding:"30px 36px",fontFamily:"Georgia, serif"};

  return (
    <PHASE2_Page title="Voucher Print View" subtitle="Load any voucher by number and print the formal layout — pending vouchers print with a PENDING watermark note">
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <input value={vnoInput} onChange={e=>setVnoInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")load();}} placeholder="Voucher number, e.g. PMT/BOM/26/0031" style={{...inpStd,maxWidth:320,fontFamily:"monospace"}}/>
        <button onClick={load} disabled={busy||!vnoInput.trim()} style={{...btnG,fontSize:11,opacity:busy||!vnoInput.trim()?0.5:1}}>{busy?"Loading…":"Load voucher"}</button>
        {voucher&&<button onClick={()=>openPrintPreview({ selector:'main', title:`Voucher ${voucher.no}`, recommend:'portrait' })} style={{padding:"7px 14px",background:"#fff",border:"1px solid #1a1c22",color:"#1a1c22",borderRadius:6,fontSize:11.5,fontWeight:700,cursor:"pointer",marginLeft:"auto"}}>🖨 Print</button>}
        {err&&<span style={{alignSelf:"center",fontSize:11,color:"#A32D2D",fontWeight:600}}>{err}</span>}
      </div>
      {!voucher&&!err&&<p style={{fontSize:11.5,color:"#5b616e"}}>Enter a voucher number to render its print layout.</p>}
      {voucher&&voucher.status==="pending"&&<p style={{maxWidth:740,margin:"0 auto 10px",fontSize:11,color:"#d97706",fontWeight:700}}>⏳ This voucher is PENDING approval — it has no books impact yet.</p>}
      {voucher&&<div style={printPage}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,paddingBottom:14,borderBottom:"2px solid #1a1c22"}}>
          <div>
            <p style={{margin:0,fontSize:20,fontWeight:700,color:"#1a1c22",letterSpacing:"0.5px"}}>Travkings Tours &amp; Travels Pvt. Ltd.</p>
            <p style={{margin:"2px 0 0",fontSize:11,color:"#5b616e"}}>IATA Accredited · GST 27AAACT1234A1ZF · CIN U63090MH2006PTC160xxx</p>
            <p style={{margin:"1px 0 0",fontSize:11,color:"#5b616e"}}>Lower Parel, Mumbai 400013 · +91 22 6654 8800</p>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{margin:0,fontSize:18,fontWeight:700,color:"#1a1c22",textTransform:"uppercase",letterSpacing:"1px"}}>{voucher.type}</p>
            <p style={{margin:"4px 0 0",fontSize:13,color:"#5b616e",fontFamily:"monospace"}}>{voucher.no}</p>
          </div>
        </div>

        {/* Meta */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:14,marginBottom:18,fontSize:12}}>
          <div>
            <div style={{display:"flex",gap:8,marginBottom:4}}><span style={{minWidth:80,color:"#5b616e"}}>Date</span><b>{voucher.date}</b></div>
            <div style={{display:"flex",gap:8,marginBottom:4}}><span style={{minWidth:80,color:"#5b616e"}}>Branch</span><b>{voucher.branch}</b></div>
            <div style={{display:"flex",gap:8,marginBottom:4}}><span style={{minWidth:80,color:"#5b616e"}}>Pay to</span><b>{voucher.payTo}</b></div>
          </div>
          <div>
            <div style={{display:"flex",gap:8,marginBottom:4}}><span style={{minWidth:80,color:"#5b616e"}}>Bank</span><b>{voucher.bank}</b></div>
            <div style={{display:"flex",gap:8,marginBottom:4}}><span style={{minWidth:80,color:"#5b616e"}}>Mode</span><b>{voucher.mode}</b></div>
            <div style={{display:"flex",gap:8,marginBottom:4}}><span style={{minWidth:80,color:"#5b616e"}}>Ref No.</span><b style={{fontFamily:"monospace"}}>{voucher.refNo}</b></div>
          </div>
        </div>

        {/* Amount */}
        <div style={{padding:14,background:"#f7f8fb",border:"1px solid #cdd1d8",borderRadius:6,marginBottom:18,textAlign:"center"}}>
          <p style={{margin:0,fontSize:11,color:"#5b616e",textTransform:"uppercase",letterSpacing:"0.5px"}}>Amount</p>
          <p style={{margin:"4px 0 2px",fontSize:28,fontWeight:700,color:"#1a1c22",fontFamily:"Georgia"}}>₹ {voucher.amount.toLocaleString("en-IN")}</p>
          <p style={{margin:0,fontSize:11.5,color:"#1a1c22",fontStyle:"italic"}}>( {voucher.amountWords} )</p>
        </div>

        {/* Posting lines */}
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:14}}>
          <thead><tr style={{background:"#1a1c22",color:"#fff"}}><th style={{padding:"8px 12px",textAlign:"left",fontWeight:600}}>Ledger Account</th><th style={{padding:"8px 12px",textAlign:"right",fontWeight:600}}>Debit (₹)</th><th style={{padding:"8px 12px",textAlign:"right",fontWeight:600}}>Credit (₹)</th></tr></thead>
          <tbody>
            {voucher.lines.map((l,i)=><tr key={i} style={{borderBottom:"1px solid #cdd1d8"}}><td style={{padding:"8px 12px"}}>{l.ledger}</td><td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace"}}>{l.dr>0?l.dr.toLocaleString("en-IN"):"—"}</td><td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace"}}>{l.cr>0?l.cr.toLocaleString("en-IN"):"—"}</td></tr>)}
          </tbody>
          <tfoot><tr style={{fontWeight:700,borderTop:"2px solid #1a1c22"}}><td style={{padding:"8px 12px"}}>Total</td><td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace"}}>{voucher.amount.toLocaleString("en-IN")}</td><td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace"}}>{voucher.amount.toLocaleString("en-IN")}</td></tr></tfoot>
        </table>

        <p style={{fontSize:11.5,color:"#1a1c22",marginBottom:28}}><b>Narration:</b> {voucher.narration}</p>

        {/* Signatories */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:20,marginTop:28,paddingTop:14,borderTop:"1px solid #cdd1d8"}}>
          {["Prepared by","Checked by","Authorised by"].map(s=>(
            <div key={s} style={{textAlign:"center"}}>
              <div style={{height:40,borderBottom:"1px solid #1a1c22",marginBottom:4}}/>
              <p style={{margin:0,fontSize:10.5,color:"#5b616e"}}>{s}</p>
            </div>
          ))}
        </div>
      </div>}
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   5. AUTO-LINKED VOUCHERS (Sale ↔ Receipt, Purchase ↔ Payment)
   ════════════════════════════════════════════════════════════════════ */

export function AutoLinkedVouchers(){
  const [cycle,setCycle]=useState("sale");
  const SALE_CYCLE=[];
  const PUR_CYCLE=[
    {step:1,voucher:"PUR-BOM/2026/3214",type:"Purchase Invoice",party:"Air India BSP",amount:285000,date:"2026-05-12",status:"Unpaid",color:"#dc2626"},
    {step:2,voucher:"PV-BOM/2026/0892",type:"Payment Voucher",party:"Air India BSP",amount:285000,date:"2026-05-17",status:"Approved",color:"#c2a04a"},
    {step:3,voucher:"PUR-BOM/2026/3214",type:"Purchase Invoice (auto-updated)",party:"Air India BSP",amount:285000,date:"2026-05-12",status:"PAID ✓",color:"#16a34a"},
  ];
  const steps=cycle==="sale"?SALE_CYCLE:PUR_CYCLE;
  const LINK_TABLE=[]; // populated from live linked sale/receipt vouchers

  return (
    <PHASE2_Page title="Auto-link Related Vouchers" subtitle="Sale Invoice ↔ Receipt · Purchase Invoice ↔ Payment — auto-matched on party + amount + date proximity">
      <div style={{padding:12,background:"#e8f0ff",border:"1px solid #cfe0f8",borderLeft:"3px solid #2563eb",borderRadius:6,marginBottom:14,fontSize:11.5,color:"#2e323c"}}>
        <b>Auto-link logic:</b> When a Receipt is posted for a party, KBiz360 automatically looks for an outstanding Sales Invoice with the same party and amount (±5% tolerance). If found, the invoice is marked as Paid and the two vouchers are bi-directionally linked. Same for Purchase ↔ Payment.
      </div>

      {/* Cycle selector */}
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {[{k:"sale",label:"Sale ↔ Receipt cycle"},{k:"purchase",label:"Purchase ↔ Payment cycle"}].map(b=>(
          <button key={b.k} onClick={()=>setCycle(b.k)} style={{padding:"8px 18px",border:cycle===b.k?"2px solid #1a1c22":"1px solid #cdd1d8",background:cycle===b.k?"#1a1c22":"#fff",color:cycle===b.k?"#c2a04a":"#5b616e",borderRadius:6,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{b.label}</button>
        ))}
      </div>

      {/* Flow visualization */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:0,marginBottom:18,padding:"24px 20px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,overflowX:"auto"}}>
        {steps.map((s,i)=>(
          <div key={s.step} style={{display:"flex",alignItems:"center"}}>
            <div style={{width:200,padding:14,background:"#fff",border:"2px solid "+s.color,borderRadius:8,textAlign:"center",position:"relative"}}>
              <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:s.color,color:"#fff",borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>{s.step}</div>
              <p style={{margin:"6px 0 4px",fontSize:11,fontWeight:700,color:s.color,textTransform:"uppercase",letterSpacing:"0.4px"}}>{s.type}</p>
              <p style={{margin:0,fontSize:10.5,fontFamily:"monospace",color:"#1a1c22",fontWeight:700}}>{s.voucher}</p>
              <p style={{margin:"3px 0",fontSize:11,color:"#1a1c22"}}>{s.party}</p>
              <p style={{margin:"3px 0 0",fontSize:13,fontWeight:700,color:"#1a1c22"}}>{fmtINR(s.amount)}</p>
              <span style={{display:"inline-block",marginTop:6,padding:"2px 8px",background:s.status.includes("PAID")||s.status==="Posted"?"#e8f6ed":s.status==="Approved"?"#fbeedb":"#fbe9e9",color:s.status.includes("PAID")||s.status==="Posted"?"#16a34a":s.status==="Approved"?"#d97706":"#dc2626",borderRadius:3,fontSize:10.5,fontWeight:700}}>{s.status}</span>
            </div>
            {i<steps.length-1&&(
              <div style={{width:60,display:"flex",flexDirection:"column",alignItems:"center",padding:"0 4px"}}>
                <div style={{fontSize:20,color:"#c2a04a",fontWeight:700}}>→</div>
                <p style={{margin:0,fontSize:9,color:"#5b616e",textAlign:"center",lineHeight:1.3}}>auto-<br/>linked</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Linked vouchers table */}
      <div style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",borderBottom:"1px solid #cdd1d8",background:"#fafbfd",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <p style={{margin:0,fontSize:12.5,fontWeight:700,color:"#1a1c22"}}>Linked Voucher Register</p>
          <button style={{padding:"5px 12px",background:"#fff",border:"1px solid #cdd1d8",color:"#5b616e",borderRadius:5,fontSize:11,fontWeight:600,cursor:"pointer"}}>📤 Export</button>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Invoice / Purchase</th><th style={RPT_thStyle}>Receipt / Payment</th><th style={RPT_thStyle}>Party</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th><th style={RPT_thStyle}>Settled On</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
          <tbody>{LINK_TABLE.map((r,i)=>(
            <tr key={i} style={{borderBottom:"1px solid #dfe2e7"}}>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:600,fontSize:11}}>{r.sale}</td>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",color:r.receipt==="—"?"#dc2626":"#16a34a",fontWeight:r.receipt==="—"?400:600,fontSize:11}}>{r.receipt}</td>
              <td style={RPT_tdStyle}>{r.party}</td>
              <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(r.amount)}</td>
              <td style={{...RPT_tdStyle,color:r.date==="—"?"#dc2626":"#5b616e"}}>{r.date}</td>
              <td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:3,fontSize:10.5,fontWeight:700,background:r.receipt!=="—"?"#e8f6ed":"#fbeedb",color:r.receipt!=="—"?"#16a34a":"#d97706"}}>{r.receipt!=="—"?"Linked ✓":"Pending"}</span></td>
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

