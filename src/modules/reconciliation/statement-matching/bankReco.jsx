/* ════════════════════════════════════════════════════════════════════
   BANK RECONCILIATION + PDC REGISTER + BOUNCE WORKFLOW
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of finance/legacy.jsx —
   Bank Reconciliation is MENU_RECONCILIATION ▸ Statement Matching (href
   /bank-reco), not a Finance-menu item. finance/index.js re-exports BankReco
   from here so App.jsx's barrel import needed zero changes.
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState, useEffect } from 'react';
import { confirmDialog } from '../../../core/ux/confirm';
import { toast } from '../../../core/ux/toast';
import { clickable } from '../../../core/ux/clickable';
import { AlertTriangle, Download, Plus, Printer, Upload, RefreshCw, Link2, Unlink, Search, FileText, Trash2, X } from 'lucide-react';
import { useBankLedgers, useBankBook, useBankStatement, useBankReconSummary, useBankBRS, useImportStatement, useAutoMatch, useManualMatch, useGroupMatch, useUnmatch, useSetReconStatus, useClearStatement, useRefreshBankReco } from '../../../core/useBankReco';
import { useParseStatementFile } from '../../../core/useStatementFile';
import { usePDCs, usePDCSummary, useCreatePDC, useDepositPDC, useBouncePDC, useRepresentPDC, useDeletePDC } from '../../../core/usePDC';
import { branchCode } from '../../../core/useAccounting';
import { PeriodBar } from '../../../core/period';
import { CONSOLIDATED_LABEL } from '../../../core/data';
import { CUR_MONTH, todayISO, fmtDate } from '../../../core/dates';
import { bc, btnG, btnGh, card, inp } from '../../../core/styles';
import { useMobile } from '../../../core/hooks';
import { openPrintPreview } from '../../../core/PrintPreview';
import ReconFreezePanel from './ReconFreezePanel';
import { Skeleton, SkeletonTable } from '../../../shell/primitives';

const RECON_CLR = {
  reconciled:   { c:"#27500A", bg:"#EAF3DE", label:"Reconciled" },
  unreconciled: { c:"#8a5a00", bg:"#FFF4D6", label:"Unreconciled" },
  partial:      { c:"#185FA5", bg:"#E6F1FB", label:"Partial" },
  exception:    { c:"#A32D2D", bg:"#FCEBEB", label:"Exception" },
};

function StatusChip({status}){
  const s=RECON_CLR[status]||RECON_CLR.unreconciled;
  return <span style={{fontSize:9,padding:"2px 7px",borderRadius:999,fontWeight:700,background:s.bg,color:s.c,whiteSpace:"nowrap"}}>{s.label}</span>;
}

/* Parse CSV (commas) or TSV (paste from Excel) → { headers, rows:string[][] }. */
function parseDelimited(text){
  const clean=String(text||"").replace(/\r\n/g,"\n").replace(/\r/g,"\n").trim();
  if(!clean) return {headers:[],rows:[]};
  const first=clean.split("\n")[0];
  const delim=(first.split("\t").length>first.split(",").length)?"\t":",";
  const recs=[]; let field="",row=[],inQ=false;
  for(let i=0;i<clean.length;i++){
    const ch=clean[i];
    if(inQ){
      if(ch==='"'){ if(clean[i+1]==='"'){ field+='"'; i++; } else inQ=false; }
      else field+=ch;
    } else if(ch==='"') inQ=true;
    else if(ch===delim){ row.push(field); field=""; }
    else if(ch==="\n"){ row.push(field); recs.push(row); row=[]; field=""; }
    else field+=ch;
  }
  row.push(field); recs.push(row);
  const headers=(recs.shift()||[]).map(h=>h.trim());
  const rows=recs.filter(r=>r.some(c=>String(c).trim()!==""));
  return {headers,rows};
}

const IMPORT_FIELDS=[
  {k:"date",        label:"Date *"},
  {k:"reference",   label:"Reference"},
  {k:"chequeNo",    label:"Cheque No."},
  {k:"utr",         label:"UTR / RRN"},
  {k:"description", label:"Description"},
  {k:"debit",       label:"Withdrawal / Debit"},
  {k:"credit",      label:"Deposit / Credit"},
  {k:"amountSigned",label:"Amount (signed, − = out)"},
  {k:"balance",     label:"Running Balance"},
];

/* Best-guess column → field mapping from the statement's header row. */
function guessMapping(headers){
  const m={}; const has=(h,...w)=>w.some(x=>h.includes(x));
  headers.forEach((raw,idx)=>{
    const h=String(raw||"").toLowerCase();
    if(m.date==null && has(h,"date")) m.date=idx;
    else if(m.chequeNo==null && has(h,"cheque","chq")) m.chequeNo=idx;
    else if(m.utr==null && has(h,"utr","rrn")) m.utr=idx;
    else if(m.description==null && has(h,"narration","description","particular","remark","detail")) m.description=idx;
    else if(m.debit==null && has(h,"withdrawal","paid out","debit")) m.debit=idx;
    else if(m.credit==null && has(h,"deposit","paid in","credit")) m.credit=idx;
    else if(m.balance==null && has(h,"balance")) m.balance=idx;
    else if(m.reference==null && has(h,"ref")) m.reference=idx;
    else if(m.amountSigned==null && has(h,"amount")) m.amountSigned=idx;
  });
  return m;
}

function parseNum(x){
  let s=String(x==null?"":x).trim(); if(!s) return 0;
  const neg=/^\(.*\)$/.test(s)||s.startsWith("-")||/\bdr\b/i.test(s);
  s=s.replace(/[^0-9.]/g,""); let n=parseFloat(s);
  if(!isFinite(n)) return 0; return neg?-n:n;
}

/* Normalise common Indian bank date formats to ISO YYYY-MM-DD. */
function normDate(v){
  const s=String(v||"").trim(); if(!s) return "";
  let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return `${m[1]}-${m[2]}-${m[3]}`;
  m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if(m){ let [,d,mo,y]=m; if(y.length===2) y="20"+y; return `${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
  const MON={jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"};
  m=s.match(/^(\d{1,2})[\-\s]([A-Za-z]{3})[A-Za-z]*[\-\s](\d{2,4})/);
  if(m){ let [,d,mon,y]=m; if(y.length===2) y="20"+y; const mm=MON[mon.toLowerCase()]; if(mm) return `${y}-${mm}-${String(d).padStart(2,"0")}`; }
  // Date.parse treats a bare date as LOCAL midnight — read LOCAL components (not
  // toISOString, which is UTC and shifts the day back in +ve timezones like IST).
  const t=Date.parse(s); if(!isNaN(t)){ const d=new Date(t); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  return ""; // unrecognized → not a date; don't fabricate one that would never show in a period view
}

/* Build importable rows from the raw grid + the chosen column mapping. */
function buildImportRows(rows,mapping){
  const at=(r,k)=> mapping[k]!=null ? r[mapping[k]] : "";
  return rows.map(r=>{
    let debit = mapping.debit!=null ? Math.abs(parseNum(at(r,"debit"))) : 0;
    let credit= mapping.credit!=null ? Math.abs(parseNum(at(r,"credit"))) : 0;
    if(mapping.amountSigned!=null && !debit && !credit){
      const a=parseNum(at(r,"amountSigned")); if(a<0) debit=Math.abs(a); else credit=a;
    }
    return {
      date:normDate(at(r,"date")),
      reference:String(at(r,"reference")||"").trim(),
      chequeNo:String(at(r,"chequeNo")||"").trim(),
      utr:String(at(r,"utr")||"").trim(),
      description:String(at(r,"description")||"").trim(),
      debit, credit,
      balance: mapping.balance!=null ? parseNum(at(r,"balance")) : null,
    };
  });
}

/* Dependency-free CSV download. */
function downloadCSV(filename,headerArr,rowArrs){
  const esc=v=>{ const s=String(v==null?"":v); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; };
  const csv=[headerArr.join(","),...rowArrs.map(r=>r.map(esc).join(","))].join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}

/* Printable demand notice for a bounced cheque (for openPrintPreview). */
function demandNoticeHTML(p,f){
  return `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;line-height:1.6">
    <h2 style="margin:0 0 4px">Demand Notice — Dishonoured Cheque</h2>
    <p style="color:#555;margin:0 0 16px">Ref: ${p.chequeNo||"—"} · ${p.chequeDate||""}</p>
    <p>To: <b>${p.party}</b></p>
    <p>This is to inform you that your cheque <b>#${p.chequeNo||"—"}</b> drawn on <b>${p.bank||"—"}</b>
    for the sum of <b>${f(p.amount)}</b> dated <b>${p.chequeDate||""}</b>, presented towards settlement of your
    outstanding dues, has been <b>returned unpaid</b>${p.bounceReason?` for the reason: <i>${p.bounceReason}</i>`:""}.</p>
    <p>You are hereby called upon to make payment of the said amount${p.bounceFee?` together with bounce charges of ${f(p.bounceFee)}`:""}
    within 15 days of receipt of this notice, failing which we shall be constrained to initiate appropriate
    proceedings under Section 138 of the Negotiable Instruments Act, 1881, at your risk and cost.</p>
    <p style="margin-top:32px">For Travkings Tours and Travels<br/><br/>Authorised Signatory</p>
  </div>`;
}

/* Printable Bank Reconciliation Statement HTML (for openPrintPreview). */
function brsHTML(brs,ledger,asOf,f){
  if(!brs) return "<p>No data</p>";
  const row=(label,amt,bold)=>`<tr><td style="padding:5px 10px;${bold?'font-weight:700':''}">${label}</td><td style="padding:5px 10px;text-align:right;${bold?'font-weight:700':''}">${f(amt)}</td></tr>`;
  const items=(arr,signFlip)=>arr.length?arr.map(l=>row(`&nbsp;&nbsp;${l.date} · ${l.vno||l.description||l.reference||'—'}`,signFlip?-l.signed:l.signed)).join(""):`<tr><td colspan="2" style="padding:4px 22px;color:#888">None</td></tr>`;
  return `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto">
    <h2 style="margin:0 0 2px">Bank Reconciliation Statement</h2>
    <p style="margin:0 0 12px;color:#555">${ledger} · as on ${asOf||''}</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tbody>
        ${row("Balance as per Books",brs.bookBalance,true)}
        <tr><td colspan="2" style="padding:8px 10px 2px;font-weight:700;color:#27500A">Add/Less: Bank-only items</td></tr>
        ${items(brs.bankOnly,false)}
        <tr><td colspan="2" style="padding:8px 10px 2px;font-weight:700;color:#A32D2D">Less: Entries in books not yet in bank</td></tr>
        ${items(brs.bookOnly,true)}
        <tr style="border-top:2px solid #000">${`<td style="padding:7px 10px;font-weight:700">Derived Balance as per Bank</td><td style="padding:7px 10px;text-align:right;font-weight:700">${f(brs.derivedBankBalance)}</td>`}</tr>
        ${row("Actual Balance per Bank Statement",brs.bankBalance)}
        ${row("Difference",brs.difference,true)}
      </tbody>
    </table>
  </div>`;
}

export function BankReco({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const code=branchCode(branch);

  /* ── Bank ledger picker (live) ── */
  const {data:bankLedgers=[],isLoading:ledgersLoading}=useBankLedgers(branch);
  const [ledger,setLedger]=useState("");
  useEffect(()=>{ if(!ledger && bankLedgers.length) setLedger(bankLedgers[0].name); },[bankLedgers,ledger]);

  /* ── Date filters (default: current month → today) ── */
  const [from,setFrom]=useState(CUR_MONTH+"-01");
  const [to,setTo]=useState(todayISO());
  const range={from,to};

  /* ── Live data ── */
  const {data:book,isLoading:bookLoading}=useBankBook(ledger,branch,range);
  const {data:stmt=[],isLoading:stmtLoading}=useBankStatement(ledger,branch,range);
  const {data:summary}=useBankReconSummary(ledger,branch,range);

  /* ── Mutations ── */
  const importMut=useImportStatement();
  const autoMut=useAutoMatch();
  const matchMut=useManualMatch();
  const groupMut=useGroupMatch();
  const unmatchMut=useUnmatch();
  const statusMut=useSetReconStatus();
  const clearMut=useClearStatement();

  /* ── UI state ── */
  const [tab,setTab]=useState("reco");        // reco | brs | pdc | bounce
  const {data:brs}=useBankBRS(ledger,branch,range);
  const [view,setView]=useState("detailed");  // detailed | minimal
  const [search,setSearch]=useState("");
  const [onlyOpen,setOnlyOpen]=useState(false); // filter both tables to just the still-open lines (driven by the Freeze tab's jump chip)
  const [selBooks,setSelBooks]=useState([]);   // { bookKey, vno, debit, credit }[] — N book legs → one line (split)
  const [selStmt,setSelStmt]=useState(null);   // statement line
  const [showImport,setShowImport]=useState(false);

  /* PDC Register — live backend (post-dated cheque lifecycle + bounce workflow) */
  const {data:pdcs=[]}=usePDCs(branch);
  const {data:pdcSummary}=usePDCSummary(branch);
  const createPDC=useCreatePDC();
  const depositMut=useDepositPDC();
  const bounceMut=useBouncePDC();
  const representMut=useRepresentPDC();
  const deletePDCMut=useDeletePDC();
  const [pdcForm,setPdcForm]=useState({party:"",chequeNo:"",bank:"",chequeDate:"",amount:""});
  const depositPDC=id=>depositMut.mutate({id});
  const bouncePDC=async id=>{ const {confirmed,reason}=await confirmDialog({title:"Bounce cheque",message:"This marks the cheque returned unpaid. Reverse the receipt and charge the bounce fee from the books.",danger:true,reasonRequired:true,reasonLabel:"Reason for return (e.g. Insufficient funds)",confirmLabel:"Mark Bounced"}); if(confirmed) bounceMut.mutate({id,reason}); };
  const addPDC=()=>{ if(!pdcForm.party||!pdcForm.chequeDate||!(Number(pdcForm.amount)>0))return; createPDC.mutate({branch:code,...pdcForm,amount:Number(pdcForm.amount)},{onSuccess:()=>setPdcForm({party:"",chequeNo:"",bank:"",chequeDate:"",amount:""})}); };
  const PDC_CLR={Pending:"#185FA5",Deposited:"#27500A",Bounced:"#A32D2D"};
  const PDC_BG ={Pending:"#E6F1FB",Deposited:"#EAF3DE",Bounced:"#FCEBEB"};

  const f=n=>(n==null||isNaN(n))?"—":(n<0?"-":"")+cur+Math.abs(Math.round(n)).toLocaleString("en-IN");
  const bankCcy=(bankLedgers.find(b=>b.name===ledger)||{}).currency||cfg.cur;

  const bookLines=book?.lines||[];
  const q=search.trim().toLowerCase();
  const bookFiltered=bookLines.filter(l=>(!q||`${l.date} ${l.vno} ${l.narration} ${l.party}`.toLowerCase().includes(q))&&(!onlyOpen||!l.reconciled));
  const stmtFiltered=stmt.filter(l=>(!q||`${l.date} ${l.reference} ${l.chequeNo} ${l.utr} ${l.description}`.toLowerCase().includes(q))&&(!onlyOpen||l.status==="unreconciled"||l.status==="exception"));

  /* ── Manual match: pair one or more book lines with one statement line (N:1 split) ── */
  const toggleBook=(b)=>setSelBooks(p=>p.some(x=>x.bookKey===b.bookKey)?p.filter(x=>x.bookKey!==b.bookKey):[...p,b]);
  const bookSum=selBooks.reduce((t,b)=>t+(b.debit-b.credit),0);
  const stmtSigned=selStmt?(selStmt.credit-selStmt.debit):0;
  const variancePreview=(selBooks.length&&selStmt)?Math.round((stmtSigned-bookSum)*100)/100:0;
  const clearSel=()=>{setSelBooks([]);setSelStmt(null);};
  const confirmMatch=async()=>{
    if(!selBooks.length||!selStmt) return;
    // Guardrail: a match that doesn't tie is usually a SPLIT (one bank line = several
    // book entries). Warn before saving a partial — otherwise add the remaining legs.
    if(Math.abs(variancePreview)>0.01){
      const {confirmed}=await confirmDialog({
        title:"Amounts don’t match — is this a split?",
        message:`The selected book ${selBooks.length>1?"entries":"entry"} and the statement line differ by ${f(Math.abs(variancePreview))}.\n\nA single bank line is often several book entries combined (a split). If so, select all the legs so they sum to the line. Matching now records a PARTIAL with this variance.`,
        confirmLabel:"Match as partial",
        cancelLabel:"Cancel",
      });
      if(!confirmed) return;
    }
    const done={onSuccess:clearSel};
    if(selBooks.length===1){
      const b=selBooks[0];
      matchMut.mutate({id:selStmt.id,bookKey:b.bookKey,vno:b.vno,bookDebit:b.debit,bookCredit:b.credit},done);
    }else{
      groupMut.mutate({id:selStmt.id,books:selBooks.map(b=>({bookKey:b.bookKey,vno:b.vno,debit:b.debit,credit:b.credit}))},done);
    }
  };
  const runAutoMatch=()=>autoMut.mutate({ledger,branch:code,from,to});

  /* Re-fetch ERP Books after a voucher was corrected (pulls the live ledger again). */
  const refreshBooks=useRefreshBankReco();
  const [refreshing,setRefreshing]=useState(false);
  const reFetchBooks=async()=>{ setRefreshing(true); try{ await refreshBooks(); toast("ERP Books re-fetched"); } finally{ setRefreshing(false); } };

  const exportRecon=()=>{
    const rows=[
      ...stmtFiltered.map(l=>["STATEMENT",l.date,l.reference||l.chequeNo||l.utr,l.description,l.debit||"",l.credit||"",RECON_CLR[l.status]?.label||l.status]),
      ...bookFiltered.map(l=>["BOOK",l.date,l.vno,l.narration,l.credit||"",l.debit||"",l.reconciled?"Reconciled":"Unreconciled"]),
    ];
    downloadCSV(`bank-reco-${ledger}-${from}_to_${to}.csv`,["Side","Date","Ref / Voucher","Narration","Debit","Credit","Status"],rows);
  };

  /* KPI definitions from the live summary */
  const KPIS=[
    {l:"Book Balance",   v:f(summary?.bookBalance),   c:"#27500A", bg:"#EAF3DE"},
    {l:`Bank Balance${summary?.bankBalanceDerived?" *":""}`, v:f(summary?.bankBalance), c:"#185FA5", bg:"#E6F1FB"},
    {l:"Reconciled",     v:f(summary?.reconciledAmount), sub:`${summary?.counts?.statementReconciled||0} lines`, c:"#27500A", bg:"#EAF3DE"},
    {l:"Unreconciled",   v:f(summary?.unreconciledAmount), sub:`${(summary?.counts?.statementUnreconciled||0)} stmt · ${(summary?.counts?.bookUnreconciled||0)} book`, c:"#8a5a00", bg:"#FFF4D6"},
    {l:"Difference",     v:f(summary?.differenceAmount), c:Math.abs(summary?.differenceAmount||0)<1?"#27500A":"#A32D2D", bg:Math.abs(summary?.differenceAmount||0)<1?"#EAF3DE":"#FCEBEB"},
  ];

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🏦</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Bank Reconciliation</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{code||CONSOLIDATED_LABEL} · Book (ledger) vs Bank statement · auto &amp; manual matching</p>
          </div>
        </div>
        <div style={{display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
          <select value={ledger} onChange={e=>{setLedger(e.target.value);setSelBooks([]);setSelStmt(null);}} style={{...inp,width:"auto",minWidth:180,minHeight:32,fontSize:11}}>
            {bankLedgers.length===0&&<option value="">{ledgersLoading?"Loading banks…":"No bank ledgers"}</option>}
            {bankLedgers.map(b=><option key={b.code||b.name} value={b.name}>{b.name}{b.currency&&b.currency!=="INR"?` (${b.currency})`:""}</option>)}
          </select>
          <PeriodBar branch={branch} compact defaultPreset="all" onChange={(r)=>{setFrom(r.from);setTo(r.to);}}/>
          <button onClick={reFetchBooks} disabled={!ledger||refreshing} title="Re-fetch the ERP Books after correcting a voucher" style={{...btnGh,fontSize:11,opacity:(!ledger||refreshing)?0.6:1}}><RefreshCw size={12} style={refreshing?{animation:"spin 0.8s linear infinite"}:undefined}/> {refreshing?"Refreshing…":"Re-fetch Books"}</button>
          <button onClick={runAutoMatch} disabled={!ledger||autoMut.isPending} style={{...btnG,fontSize:11,opacity:(!ledger||autoMut.isPending)?0.6:1}}><RefreshCw size={12}/> {autoMut.isPending?"Matching…":"Auto-match"}</button>
          <button onClick={()=>setShowImport(s=>!s)} disabled={!ledger} style={{...btnGh,fontSize:11,opacity:!ledger?0.6:1}}><Upload size={12}/> Import</button>
          <button onClick={exportRecon} disabled={!ledger} style={{...btnGh,fontSize:11,opacity:!ledger?0.6:1}}><Download size={12}/> Export</button>
        </div>
      </div>

      {/* Auto-match result toast */}
      {autoMut.isSuccess&&autoMut.data&&(
        <div style={{...card,padding:"8px 12px",marginBottom:10,background:"#EAF3DE",border:"1px solid #c3e0a0",fontSize:11,color:"#27500A"}}>
          ✔ Auto-match: {autoMut.data.matched} reconciled (of {autoMut.data.scannedStatement} statement / {autoMut.data.scannedBook} book lines scanned).
        </div>
      )}

      {/* No bank ledgers helper */}
      {!ledgersLoading&&bankLedgers.length===0&&(
        <div style={{...card,padding:"14px 16px",marginBottom:12,background:"#FFF4D6",border:"1px solid #f0d98a",fontSize:11.5,color:"#8a5a00"}}>
          No bank ledgers found. Create one under <b>Masters → Bank Accounts</b> (group “Bank Accounts”), or post any bank receipt/payment — the ledger is auto-created — then return here.
        </div>
      )}

      {/* Import panel */}
      {showImport&&ledger&&<ImportPanel ledger={ledger} code={code} from={from} to={to}
        onImported={({from:f,to:t})=>{ setFrom(f); setTo(t); }}
        onClose={()=>setShowImport(false)} importMut={importMut} clearMut={clearMut}/>}

      {/* KPI cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:12}}>
        {KPIS.map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"10px 12px",background:k.bg}}>
            <p style={{margin:0,fontSize:8.5,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"3px 0 0",fontSize:17,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
            {k.sub&&<p style={{margin:"2px 0 0",fontSize:9,color:k.c}}>{k.sub}</p>}
          </div>
        ))}
      </div>
      {summary?.bankBalanceDerived&&<p style={{margin:"-6px 0 10px",fontSize:9.5,color:"#5a6691"}}>* Bank Balance derived from book opening + statement movement (no running-balance column was imported).</p>}

      {/* Tabs */}
      <div style={{display:"flex",gap:0,background:"#f3f4f8",borderRadius:"9px 9px 0 0",border:"1px solid #cdd1d8"}}>
        <button onClick={()=>setTab("reco")} style={{padding:"7px 12px",border:"none",cursor:"pointer",fontWeight:tab==="reco"?700:500,background:tab==="reco"?"#fff":"transparent",borderRadius:6,fontSize:11}}>🔄 Reconciliation</button><button onClick={()=>setTab("brs")} style={{padding:"7px 12px",border:"none",cursor:"pointer",fontWeight:tab==="brs"?700:500,background:tab==="brs"?"#fff":"transparent",borderRadius:6,fontSize:11}}>🧾 BRS Report</button><button onClick={()=>setTab("pdc")} style={{padding:"7px 12px",border:"none",cursor:"pointer",fontWeight:tab==="pdc"?700:500,background:tab==="pdc"?"#fff":"transparent",borderRadius:6,fontSize:11}}>📑 PDC Register</button><button onClick={()=>setTab("bounce")} style={{padding:"7px 12px",border:"none",cursor:"pointer",fontWeight:tab==="bounce"?700:500,background:tab==="bounce"?"#fff":"transparent",borderRadius:6,fontSize:11}}>🔴 Bounce / Returns</button>
      </div>

      {tab==="reco"&&(
        <div style={{border:"1px solid #cdd1d8",borderTop:"none",borderRadius:"0 0 9px 9px",background:"#fff",padding:12}}>
          {/* Toolbar */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6,background:"#f3f4f8",borderRadius:8,padding:"4px 8px"}}>
              <Search size={13} color="#5a6691"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search date / ref / narration…" style={{border:"none",background:"transparent",outline:"none",fontSize:11,minWidth:200}}/>
            </div>
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>setOnlyOpen(o=>!o)} title="Show only the still-open (unreconciled / exception) lines" style={{...((onlyOpen)?btnG:btnGh),fontSize:10,padding:"4px 10px"}}>{onlyOpen?"● ":""}Unreconciled only</button>
              {["detailed","minimal"].map(v=>(
                <button key={v} onClick={()=>setView(v)} style={{...((view===v)?btnG:btnGh),fontSize:10,padding:"4px 10px",textTransform:"capitalize"}}>{v}</button>
              ))}
            </div>
          </div>

          {/* Freeze & Certify this bank ledger for the month (blocks revoke/edit once frozen) */}
          <ReconFreezePanel branch={branch} code={(bankLedgers.find(b=>b.name===ledger)||{}).code} name={ledger} ledgerLabel={ledger}
            defaultPeriod={to ? to.slice(0,7) : undefined} currency={bankCcy} statementBalance={summary?.bankBalance}
            onShowUnreconciled={setOnlyOpen} showingUnreconciled={onlyOpen} />

          {/* Manual-match action bar */}
          {(selBooks.length>0||selStmt)&&(
            <div style={{...card,padding:"8px 12px",marginBottom:10,background:"#E6F1FB",border:"1px solid #B5D4F4",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:11,color:"#185FA5"}}>
                <b>Manual match —</b> Book: {selBooks.length>0?`${selBooks.length} ${selBooks.length>1?"entries":"entry"} (${f(bookSum)})`:<i>select one or more book entries</i>} ↔ Statement: {selStmt?`${selStmt.date} (${f(stmtSigned)})`:<i>select a statement line</i>}
                {selBooks.length>1&&<span style={{color:"#185FA5",fontWeight:700}}> · {selBooks.length}-way split</span>}
                {selBooks.length>0&&selStmt&&Math.abs(variancePreview)>0.01&&<span style={{color:"#A32D2D",fontWeight:700}}> · variance {f(variancePreview)} → Partial</span>}
                {selBooks.length>0&&selStmt&&Math.abs(variancePreview)<=0.01&&<span style={{color:"#27500A",fontWeight:700}}> · ties out ✓</span>}
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={confirmMatch} disabled={!selBooks.length||!selStmt||matchMut.isPending||groupMut.isPending} style={{...btnG,fontSize:10.5,padding:"4px 12px",background:"#27500A",opacity:(!selBooks.length||!selStmt)?0.5:1}}><Link2 size={12}/> Match</button>
                <button onClick={clearSel} style={{...btnGh,fontSize:10.5,padding:"4px 10px"}}><X size={12}/> Clear</button>
              </div>
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
            {/* Book entries */}
            <div>
              <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Book Entries (Ledger) <span style={{fontWeight:400,color:"#5a6691"}}>· {bookFiltered.length}</span></p>
              <div style={{...card,padding:0,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead><tr style={{background:"#0d1326"}}>{(view==="minimal"?["Date","Voucher","Amount","Status"]:["Date","Voucher","Narration","Debit","Credit","Balance","Status"]).map((h,i)=><th key={i} style={{padding:"7px 9px",textAlign:(h==="Debit"||h==="Credit"||h==="Amount"||h==="Balance")?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {bookLoading&&Array.from({length:6}).map((_,i)=>(
                      <tr key={`sk-${i}`}><td colSpan={7} style={{padding:"8px 9px"}}><Skeleton className="h-3.5 w-full" style={{opacity:Math.max(0.4,1-i*0.15)}} /></td></tr>
                    ))}
                    {!bookLoading&&bookFiltered.length===0&&<tr><td colSpan={7} style={{padding:14,textAlign:"center",color:"#5a6691",fontSize:11}}>No book entries for this bank/period.</td></tr>}
                    {bookFiltered.map((l,i)=>{
                      const sel=selBooks.some(b=>b.bookKey===l.bookKey);
                      const net=l.debit-l.credit;
                      return (
                        <tr key={l.bookKey} {...(!l.reconciled ? clickable(()=>{ toggleBook({bookKey:l.bookKey,vno:l.vno,debit:l.debit,credit:l.credit}); }) : {})}
                          style={{borderBottom:"1px solid #dfe2e7",cursor:l.reconciled?"default":"pointer",background:sel?"#FFF4D6":l.reconciled?"#EAF3DE":i%2===0?"#fff":"#fafafa"}}>
                          <td style={{padding:"6px 9px",color:"#5a6691",fontSize:10,whiteSpace:"nowrap"}}>{fmtDate?fmtDate(l.date):l.date}</td>
                          <td style={{padding:"6px 9px",fontFamily:"monospace",fontSize:9.5,color:"#185FA5"}}>{l.vno}</td>
                          {view!=="minimal"&&<td style={{padding:"6px 9px",fontSize:10.5,color:"#384677",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={l.narration}>{l.narration||l.party}</td>}
                          {view==="minimal"
                            ?<td style={{padding:"6px 9px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",color:net>=0?"#27500A":"#A32D2D"}}>{f(net)}</td>
                            :<><td style={{padding:"6px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#A32D2D"}}>{l.debit?f(l.debit):""}</td>
                               <td style={{padding:"6px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#27500A"}}>{l.credit?f(l.credit):""}</td></>}
                          {view!=="minimal"&&<td style={{padding:"6px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#5a6691",whiteSpace:"nowrap"}} title="Running book balance">{l.balance!=null?`${f(Math.abs(l.balance))} ${l.balanceSide||""}`.trim():"—"}</td>}
                          <td style={{padding:"6px 9px",textAlign:"center"}}><StatusChip status={l.reconciled?l.status:"unreconciled"}/></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bank statement */}
            <div>
              <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Bank Statement <span style={{fontWeight:400,color:"#5a6691"}}>· {stmtFiltered.length}</span></p>
              <div style={{...card,padding:0,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead><tr style={{background:"#0d1326"}}>{(view==="minimal"?["Date","Description","Amount","Status",""]:["Date","Ref / Cheque / UTR","Description","Debit","Credit","Balance","Status",""]).map((h,i)=><th key={i} style={{padding:"7px 9px",textAlign:(h==="Debit"||h==="Credit"||h==="Amount"||h==="Balance")?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {stmtLoading&&Array.from({length:6}).map((_,i)=>(
                      <tr key={`sk-${i}`}><td colSpan={8} style={{padding:"8px 9px"}}><Skeleton className="h-3.5 w-full" style={{opacity:Math.max(0.4,1-i*0.15)}} /></td></tr>
                    ))}
                    {!stmtLoading&&stmtFiltered.length===0&&<tr><td colSpan={8} style={{padding:14,textAlign:"center",color:"#5a6691",fontSize:11}}>No statement lines. Use <b>Import</b> to load a bank statement (CSV / paste).</td></tr>}
                    {stmtFiltered.map((l,i)=>{
                      const sel=selStmt?.id===l.id;
                      const net=l.credit-l.debit;
                      const ref=l.reference||l.chequeNo||l.utr||"";
                      const open=l.status==="unreconciled"||l.status==="exception";
                      return (
                        <tr key={l.id} {...(open ? clickable(()=>{ setSelStmt(sel?null:l); }) : {})}
                          style={{borderBottom:"1px solid #dfe2e7",cursor:open?"pointer":"default",background:sel?"#FFF4D6":l.status==="reconciled"?"#EAF3DE":l.status==="partial"?"#E6F1FB":l.status==="exception"?"#FCEBEB":i%2===0?"#fff":"#fafafa"}}>
                          <td style={{padding:"6px 9px",color:"#5a6691",fontSize:10,whiteSpace:"nowrap"}}>{fmtDate?fmtDate(l.date):l.date}</td>
                          {view!=="minimal"&&<td style={{padding:"6px 9px",fontFamily:"monospace",fontSize:9,color:"#185FA5",maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={ref}>{ref}</td>}
                          <td style={{padding:"6px 9px",fontSize:10.5,color:"#384677",maxWidth:view==="minimal"?180:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={l.description}>{l.description}</td>
                          {view==="minimal"
                            ?<td style={{padding:"6px 9px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",color:net>=0?"#27500A":"#A32D2D"}}>{f(net)}</td>
                            :<><td style={{padding:"6px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#A32D2D"}}>{l.debit?f(l.debit):""}</td>
                               <td style={{padding:"6px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#27500A"}}>{l.credit?f(l.credit):""}</td></>}
                          {view!=="minimal"&&<td style={{padding:"6px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#5a6691",whiteSpace:"nowrap"}} title={l.balance!=null?"Running balance from the imported statement":"Import a statement with a Balance column to populate this"}>{l.balance!=null?f(l.balance):"—"}</td>}
                          <td style={{padding:"6px 9px",textAlign:"center"}}><StatusChip status={l.status}/></td>
                          <td style={{padding:"6px 6px",textAlign:"center",whiteSpace:"nowrap"}}>
                            {(l.status==="reconciled"||l.status==="partial")
                              ? <button title="Unmatch" onClick={e=>{e.stopPropagation();unmatchMut.mutate({id:l.id});}} style={{...btnGh,padding:"2px 6px",fontSize:9,color:"#A32D2D"}}><Unlink size={11}/></button>
                              : l.status==="exception"
                                ? <button title="Clear exception" onClick={e=>{e.stopPropagation();statusMut.mutate({id:l.id,status:"unreconciled"});}} style={{...btnGh,padding:"2px 6px",fontSize:9}}>↺</button>
                                : <button title="Flag exception" onClick={e=>{e.stopPropagation();statusMut.mutate({id:l.id,status:"exception"});}} style={{...btnGh,padding:"2px 6px",fontSize:9,color:"#8a5a00"}}><AlertTriangle size={11}/></button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <p style={{margin:"10px 2px 0",fontSize:9.5,color:"#5a6691"}}>Tip: select <b>one or more</b> Book entries (tap several that together sum to the line — a split) and one Statement line, then <b>Match</b>. Use <b>Auto-match</b> to pair by amount + date + reference. Reconciliation state is saved server-side and survives voucher edits.</p>
        </div>
      )}

      {tab==="brs"&&(
        <div style={{...card,borderTop:"none",borderRadius:"0 0 9px 9px",padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div>
              <p style={{margin:0,fontSize:13,fontWeight:800,color:"#0d1326"}}>Bank Reconciliation Statement</p>
              <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{ledger} · as on {to}{brs?.balanced?" · ✔ reconciled":brs&&Math.abs(brs.difference)>0.01?` · ⚠ difference ${f(brs.difference)}`:""}</p>
            </div>
            <button onClick={()=>openPrintPreview&&openPrintPreview(brsHTML(brs,ledger,to,f))} disabled={!brs} style={{...btnG,fontSize:11,padding:"6px 12px",opacity:brs?1:0.6}}><Printer size={13}/> Print</button>
          </div>
          {!brs?(<SkeletonTable rows={6} cols={2} />):(
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <tbody>
              <tr style={{borderBottom:"2px solid #0d1326"}}><td style={{padding:"7px 10px",fontWeight:700}}>Balance as per Books</td><td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(brs.bookBalance)}</td></tr>
              <tr><td colSpan={2} style={{padding:"8px 10px 2px",fontSize:10.5,fontWeight:700,color:"#27500A",textTransform:"uppercase"}}>Add: Credits in bank not in books / Less: charges ({brs.counts.bankOnly})</td></tr>
              {brs.bankOnly.map((l,i)=>(<tr key={"bk"+i} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"5px 10px 5px 22px",color:"#5a6691"}}>{l.date} · {l.description||l.reference||"—"} <span style={{fontSize:9.5,color:"#8893b8"}}>({l.kind})</span></td><td style={{padding:"5px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:l.signed<0?"#A32D2D":"#27500A"}}>{f(l.signed)}</td></tr>))}
              {brs.bankOnly.length===0&&<tr><td colSpan={2} style={{padding:"4px 22px",color:"#8893b8",fontSize:11}}>None</td></tr>}
              <tr><td colSpan={2} style={{padding:"8px 10px 2px",fontSize:10.5,fontWeight:700,color:"#A32D2D",textTransform:"uppercase"}}>Less: Entries in books not yet in bank ({brs.counts.bookOnly})</td></tr>
              {brs.bookOnly.map((l,i)=>(<tr key={"bo"+i} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{padding:"5px 10px 5px 22px",color:"#5a6691"}}>{l.date} · {l.vno} · {l.narration||"—"} <span style={{fontSize:9.5,color:"#8893b8"}}>({l.kind})</span></td><td style={{padding:"5px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:l.signed<0?"#A32D2D":"#27500A"}}>{f(-l.signed)}</td></tr>))}
              {brs.bookOnly.length===0&&<tr><td colSpan={2} style={{padding:"4px 22px",color:"#8893b8",fontSize:11}}>None</td></tr>}
              <tr style={{borderTop:"2px solid #0d1326"}}><td style={{padding:"7px 10px",fontWeight:700}}>Derived Balance as per Bank</td><td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(brs.derivedBankBalance)}</td></tr>
              <tr><td style={{padding:"7px 10px",color:"#5a6691"}}>Actual Balance per Bank Statement{brs.bankBalanceDerived?" (derived)":""}</td><td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(brs.bankBalance)}</td></tr>
              <tr style={{background:brs.balanced?"#EAF3DE":"#FCEBEB"}}><td style={{padding:"7px 10px",fontWeight:700,color:brs.balanced?"#27500A":"#A32D2D"}}>Difference</td><td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:brs.balanced?"#27500A":"#A32D2D"}}>{f(brs.difference)}</td></tr>
            </tbody>
          </table>)}
        </div>
      )}

      {tab==="pdc"&&(
        <div style={{...card,borderTop:"none",borderRadius:"0 0 9px 9px",padding:0,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",background:"#E6F1FB",borderBottom:"1px solid #B5D4F4",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{margin:0,fontSize:11,color:"#185FA5"}}>PDC Register — Post-Dated Cheques received from clients. Deposit on or after cheque date.</p>
            <span style={{fontSize:10.5,fontWeight:700,color:"#185FA5"}}>Pending: {pdcSummary?.counts?.pending ?? pdcs.filter(p=>p.status==="Pending").length} · Due to deposit: {pdcSummary?.dueToDeposit ?? 0}</span>
          </div>
          {/* Add a PDC */}
          <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center",padding:"10px 14px",borderBottom:"1px solid #dfe2e7"}}>
            <input value={pdcForm.party} onChange={e=>setPdcForm(s=>({...s,party:e.target.value}))} placeholder="Client" style={{...inp,minWidth:160}}/>
            <input value={pdcForm.chequeNo} onChange={e=>setPdcForm(s=>({...s,chequeNo:e.target.value}))} placeholder="Cheque No." style={{...inp,width:120}}/>
            <input value={pdcForm.bank} onChange={e=>setPdcForm(s=>({...s,bank:e.target.value}))} placeholder="Drawee bank" style={{...inp,width:130}}/>
            <input type="date" value={pdcForm.chequeDate} onChange={e=>setPdcForm(s=>({...s,chequeDate:e.target.value}))} style={{...inp,width:150}}/>
            <input type="number" value={pdcForm.amount} onChange={e=>setPdcForm(s=>({...s,amount:e.target.value}))} placeholder="Amount" style={{...inp,width:120,textAlign:"right"}}/>
            <button onClick={addPDC} disabled={!pdcForm.party||!pdcForm.chequeDate||!(Number(pdcForm.amount)>0)||createPDC.isPending} style={{...btnG,padding:"6px 12px",fontSize:11,opacity:(!pdcForm.party||!pdcForm.chequeDate||!(Number(pdcForm.amount)>0))?0.6:1}}><Plus size={12}/> Add PDC</button>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Client","Cheque No.","Bank","Cheque Date","Amount","Status","Action"].map((h,i)=>(
                <th key={i} style={{padding:"9px 12px",textAlign:i===4?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {pdcs.length===0&&<tr><td colSpan={7} style={{padding:14,textAlign:"center",color:"#5a6691"}}>No post-dated cheques on record.</td></tr>}
              {pdcs.map((p,i)=>(
              <tr key={p.id} style={{borderBottom:"1px solid #dfe2e7",background:p.status==="Bounced"?"#fff5f5":i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{p.party}</td>
                <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10.5}}>{p.chequeNo||"—"}</td>
                <td style={{padding:"8px 12px",color:"#5a6691"}}>{p.bank||"—"}</td>
                <td style={{padding:"8px 12px",color:"#5a6691",whiteSpace:"nowrap"}}>{p.chequeDate}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(p.amount)}</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:PDC_BG[p.status],color:PDC_CLR[p.status]}}>{p.status}</span></td>
                <td style={{padding:"8px 12px"}}>
                  {p.status==="Pending"&&<div style={{display:"flex",gap:4}}>
                    <button onClick={()=>depositPDC(p.id)} style={{...btnG,padding:"2px 8px",fontSize:9.5,background:"#27500A"}}>Deposit</button>
                    <button onClick={()=>bouncePDC(p.id)} style={{...btnGh,padding:"2px 8px",fontSize:9.5,color:"#A32D2D"}}>Bounce</button>
                    <button onClick={()=>deletePDCMut.mutate({id:p.id})} title="Delete" style={{...btnGh,padding:"2px 8px",fontSize:9.5,color:"#5a6691"}}>✕</button>
                  </div>}
                  {p.status==="Deposited"&&<span style={{fontSize:10,color:"#27500A"}}>✔ {p.depositDate}</span>}
                  {p.status==="Bounced"&&<button onClick={()=>representMut.mutate({id:p.id})} style={{...btnG,padding:"2px 8px",fontSize:9.5,background:"#A32D2D"}}>Re-present</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab==="bounce"&&(
        <div style={{...card,borderTop:"none",borderRadius:"0 0 9px 9px"}}>
          <div style={{padding:"10px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",marginBottom:12}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:"#A32D2D"}}>⚠ Bounced Cheque Workflow</p>
            <p style={{margin:"4px 0 0",fontSize:10.5,color:"#A32D2D"}}>When a cheque bounces: (1) Reverse the receipt entry in books · (2) Charge bank bounce fee · (3) Notify client · (4) Issue demand notice · (5) Re-present or collect NEFT</p>
          </div>
          {pdcs.filter(p=>p.status==="Bounced").map(p=>(
            <div key={p.id} style={{...card,marginBottom:8,borderLeft:"4px solid #A32D2D",padding:"12px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:"#A32D2D"}}>{p.party} — Cheque #{p.chequeNo||"—"}</p>
                  <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{p.bank||"—"} · Date: {p.chequeDate} · {f(p.amount)}{p.bounceReason?` · ${p.bounceReason}`:""}{p.bounceFee?` · fee ${f(p.bounceFee)}`:""}</p>
                </div>
                <span style={{fontSize:10.5,padding:"3px 10px",borderRadius:999,background:"#FCEBEB",color:"#A32D2D",fontWeight:700}}>BOUNCED</span>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent(`Dear ${p.party}, your cheque #${p.chequeNo||""} for ${f(p.amount)} dated ${p.chequeDate} has been returned unpaid${p.bounceReason?` (${p.bounceReason})`:""}. Kindly arrange payment at the earliest.`)}`,"_blank","noopener")} style={{...btnGh,fontSize:10.5,padding:"4px 12px"}}>💬 WhatsApp Client</button>
                <button onClick={()=>openPrintPreview&&openPrintPreview(demandNoticeHTML(p,f))} style={{...btnG,fontSize:10.5,padding:"4px 12px",background:"#A32D2D"}}>📋 Issue Demand Notice</button>
                <button onClick={()=>representMut.mutate({id:p.id})} style={{...btnG,fontSize:10.5,padding:"4px 12px"}}>🔄 Re-present Cheque</button>
              </div>
            </div>
          ))}
          {pdcs.filter(p=>p.status==="Bounced").length===0&&<p style={{fontSize:11,color:"#27500A"}}>✔ No bounced cheques</p>}
        </div>
      )}
    </div>
  );
}

/* Statement import — paste, upload CSV, or upload a PDF (extracted + stored to
   S3 server-side), map columns, preview, import. */
function ImportPanel({ledger,code,from,to,onClose,importMut,clearMut,onImported}){
  const [raw,setRaw]=useState("");
  const [fileName,setFileName]=useState("");
  const [pdfResult,setPdfResult]=useState(null); // {key,fileName,headers,rows,warning} once a PDF has been uploaded+parsed
  const parsePdf=useParseStatementFile();
  const parsedRaw=useMemo(()=>parseDelimited(raw),[raw]);
  const {headers,rows}=pdfResult?{headers:pdfResult.headers,rows:pdfResult.rows}:parsedRaw;
  const [mapping,setMapping]=useState({});
  useEffect(()=>{ setMapping(guessMapping(headers)); },[raw,pdfResult]); // re-guess whenever a new file/paste/PDF lands
  const built=useMemo(()=>buildImportRows(rows,mapping),[rows,mapping]);
  const valid=built.filter(r=>r.date&&(r.debit||r.credit));
  const onFile=e=>{
    const file=e.target.files?.[0]; if(!file) return;
    setPdfResult(null);
    if(/\.pdf$/i.test(file.name)){
      setFileName(file.name); setRaw("");
      parsePdf.mutate({file,module:"bank-reconciliation"},{onSuccess:data=>setPdfResult(data)});
      return;
    }
    setFileName(file.name); const rd=new FileReader(); rd.onload=()=>setRaw(String(rd.result||"")); rd.readAsText(file);
  };
  // Post exactly the rows we counted (valid), then widen — never shrink — the
  // period so every row we just imported is visible below. ISO dates sort/compare
  // lexicographically, so string min/max is chronological.
  const doImport=()=>{
    const dates=valid.map(r=>r.date).filter(Boolean).sort();
    const fileFrom=dates[0], fileTo=dates[dates.length-1];
    importMut.mutate({ledger,branch:code,rows:valid,fileName,sourceFileKey:pdfResult?.key},{onSuccess:()=>{
      if(fileFrom) onImported?.({from:fileFrom<from?fileFrom:from, to:fileTo>to?fileTo:to});
      setRaw(""); setFileName(""); setPdfResult(null);
    }});
  };

  return (
    <div style={{...card,padding:14,marginBottom:12,border:"1px solid #B5D4F4",background:"#fbfdff"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <p style={{margin:0,fontSize:12.5,fontWeight:700,color:"#185FA5"}}><FileText size={14} style={{verticalAlign:"-2px"}}/> Import Bank Statement — {ledger}</p>
        <button onClick={onClose} style={{...btnGh,fontSize:10.5,padding:"3px 8px"}}><X size={12}/> Close</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div>
          <label style={{fontSize:10,fontWeight:700,color:"#5a6691",textTransform:"uppercase"}}>1 · Upload CSV / PDF or paste from Excel</label>
          <input type="file" accept=".csv,.txt,.tsv,.pdf" onChange={onFile} disabled={parsePdf.isPending} style={{display:"block",margin:"6px 0",fontSize:11}}/>
          <textarea value={raw} onChange={e=>{setRaw(e.target.value);if(pdfResult)setPdfResult(null);}} placeholder={"Paste rows here (Tab or comma separated). First row = headers, e.g.\nDate,Cheque No,Narration,Withdrawal,Deposit,Balance"} rows={6} style={{...inp,width:"100%",fontSize:10.5,fontFamily:"monospace",resize:"vertical"}}/>
          {parsePdf.isPending&&<p style={{margin:"4px 0 0",fontSize:10,color:"#185FA5"}}>Extracting text &amp; storing to S3…</p>}
          {parsePdf.isError&&<p style={{margin:"4px 0 0",fontSize:10,color:"#A32D2D"}}>{String(parsePdf.error?.message||"Could not read this PDF.")}</p>}
          {pdfResult?.warning&&<p style={{margin:"4px 0 0",fontSize:10,color:"#8a5a00"}}>⚠ {pdfResult.warning}</p>}
          {fileName&&!parsePdf.isPending&&<p style={{margin:"4px 0 0",fontSize:10,color:"#5a6691"}}>Loaded: {fileName}{pdfResult?" · stored to S3 · rows extracted from PDF text":""}</p>}
        </div>
        <div>
          <label style={{fontSize:10,fontWeight:700,color:"#5a6691",textTransform:"uppercase"}}>2 · Map columns</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:6}}>
            {IMPORT_FIELDS.map(fl=>(
              <div key={fl.k} style={{display:"flex",flexDirection:"column"}}>
                <span style={{fontSize:9,color:"#5a6691"}}>{fl.label}</span>
                <select value={mapping[fl.k]==null?"":mapping[fl.k]} onChange={e=>setMapping(m=>({...m,[fl.k]:e.target.value===""?null:Number(e.target.value)}))} style={{...inp,minHeight:28,fontSize:10,padding:"3px 6px"}} disabled={!headers.length}>
                  <option value="">(none)</option>
                  {headers.map((h,idx)=><option key={idx} value={idx}>{h||`Col ${idx+1}`}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      {valid.length>0&&(
        <div style={{marginTop:10}}>
          <p style={{margin:"0 0 4px",fontSize:10,fontWeight:700,color:"#5a6691"}}>3 · Preview ({valid.length} valid of {rows.length} rows)</p>
          <div style={{...card,padding:0,overflow:"auto",maxHeight:160}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
              <thead><tr style={{background:"#0d1326"}}>{["Date","Ref","Cheque","UTR","Description","Debit","Credit","Balance"].map((h,i)=><th key={i} style={{padding:"5px 8px",textAlign:["Debit","Credit","Balance"].includes(h)?"right":"left",color:"#d4a437",fontSize:8.5}}>{h}</th>)}</tr></thead>
              <tbody>{valid.slice(0,8).map((r,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #dfe2e7"}}>
                  <td style={{padding:"4px 8px"}}>{r.date}</td><td style={{padding:"4px 8px"}}>{r.reference}</td><td style={{padding:"4px 8px"}}>{r.chequeNo}</td><td style={{padding:"4px 8px"}}>{r.utr}</td>
                  <td style={{padding:"4px 8px",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.description}</td>
                  <td style={{padding:"4px 8px",textAlign:"right"}}>{r.debit||""}</td><td style={{padding:"4px 8px",textAlign:"right"}}>{r.credit||""}</td><td style={{padding:"4px 8px",textAlign:"right"}}>{r.balance??""}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{display:"flex",gap:8,marginTop:10,alignItems:"center"}}>
        <button onClick={doImport} disabled={!valid.length||mapping.date==null||importMut.isPending} style={{...btnG,fontSize:11,opacity:(!valid.length||mapping.date==null||importMut.isPending)?0.5:1}}><Upload size={12}/> {importMut.isPending?"Importing…":`Import ${valid.length} lines`}</button>
        <button onClick={async()=>{ const{confirmed}=await confirmDialog({title:'Clear all statement lines?',message:`Delete ALL statement lines for ${ledger} between ${from} and ${to}? This cannot be undone.`,danger:true,confirmLabel:'Clear period'}); if(confirmed) clearMut.mutate({ledger,from,to}); }} disabled={clearMut.isPending} style={{...btnGh,fontSize:11,color:"#A32D2D"}}><Trash2 size={12}/> Clear period</button>
        {importMut.isSuccess&&importMut.data&&<span style={{fontSize:10.5,color:"#27500A"}}>✔ {importMut.data.inserted} imported{importMut.data.duplicate?`, ${importMut.data.duplicate} already on file (re-import)`:""}{importMut.data.blank?`, ${importMut.data.blank} blank`:""}.</span>}
        {(importMut.isError||clearMut.isError)&&<span style={{fontSize:10.5,color:"#A32D2D"}}>{String(importMut.error?.message||clearMut.error?.message||"Failed")}</span>}
      </div>
    </div>
  );
}
