/* ════════════════════════════════════════════════════════════════
   BSP SETTLEMENT SUMMARY  /purchase/bsp-summary
   Reads the REAL books: the BSP Supplier (Sundry Creditor) ledger →
   outstanding payable + every posting against it, live flight
   Sales/Purchases → period settlement maths, and the ADM/ACM registers.
   ════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAdmReasonCodes, useLedgerRegistry } from '../../../core/useReference';
import { useAdmMemos } from '../../../core/useAdmMemos';
import { useLedgerStatement } from '../../../core/useAccounting';
import { LedgerActions } from '../../../core/ledgerActions';
import { contraLedgerName, lineNarration } from '../../../core/cashBookRows';
import { openLedgerModal } from '../../../core/LedgerModalHost';
import { useLivePurchaseRegistry, useLiveSalesTickets } from '../../../core/useVouchers';
import { CUR_MONTH, MONTH_OPTIONS } from '../../../core/dates';
import { ACM_REASON_CODES } from '../../../core/helpers';
import { useMobile } from '../../../core/hooks';
import { Menu as StatusMenu } from '../../../core/ux/Menu';
import { bc, card, inp } from '../../../core/styles';
import { SkeletonTable } from '../../../shell/primitives';

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
          ?<div style={{padding:12}}><SkeletonTable rows={5} cols={6} className="border-0 shadow-none" /></div>
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
