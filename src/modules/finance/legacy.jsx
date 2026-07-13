/* ════════════════════════════════════════════════════════════════════
   MODULES/FINANCE.JSX
   Auto-generated from KBiz360_v2.jsx · 1893 lines · 20 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { confirmDialog } from '../../core/ux/confirm';
import { toast } from '../../core/ux/toast';
import { clickable } from '../../core/ux/clickable';
import { SampleBanner } from '../../core/ux/SampleBanner';
import { Menu as DropdownMenu } from '../../core/ux/Menu';
import { AlertTriangle, ChevronDown, Download, Lock, Plus, Printer, Save, Upload, RefreshCw, Link2, Unlink, Search, FileText, Trash2, X } from 'lucide-react';
import { useBankLedgers, useBankBook, useBankStatement, useBankReconSummary, useBankBRS, useImportStatement, useAutoMatch, useManualMatch, useGroupMatch, useUnmatch, useSetReconStatus, useClearStatement, useRefreshBankReco } from '../../core/useBankReco';
import { useParseStatementFile } from '../../core/useStatementFile';
import { useReconQueue, useReconSummary } from '../../core/useReconciliation';
import { usePDCs, usePDCSummary, useCreatePDC, useDepositPDC, useBouncePDC, useRepresentPDC, useDeletePDC } from '../../core/usePDC';
import { branchCode } from '../../core/useAccounting';
import { PeriodBar } from '../../core/period';
import { exportToCSV } from '../../core/business-logic';
import { BRANCH_CODES, CASH, EXP_ACTUALS, FX_RATES, GP_BILLS, LOAN_REGISTER, CONSOLIDATED_LABEL } from '../../core/data';
import { fmt, fmtINR } from '../../core/format';
import { CUR_MONTH, MONTH_OPTIONS, FY_MONTHS, monthLabel, todayISO, fmtDate, CUR_FY, rangeNote } from '../../core/dates';
import { BANK_ACCOUNTS_DATA, INVESTMENT_DATA, INVESTMENT_SECTIONS, _ADVANCES, cardStyle } from '../../core/helpers';
import { useMobile } from '../../core/hooks';
import { useChartOfAccounts, useTrialBalance } from '../../core/useAccounting';
import { useCrud, useAdvances } from '../../core/useRegisters';
import { B, FL, RPT_tdStyle, RPT_thStyle, bc, btnG, btnGh, card, inp } from '../../core/styles';
import { Dashboard } from '../dashboard';
import { PfEsiChallan } from '../hr';
import { ForexReport } from '../reports';
import { EWayBill, Form26AS } from '../taxation';
import { RecurringVouchers } from '../transactions';
import { PHASE2_Page } from '../../shell/PHASE2_Page';
import { openPrintPreview } from '../../core/PrintPreview';


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
  const bookFiltered=bookLines.filter(l=>!q||`${l.date} ${l.vno} ${l.narration} ${l.party}`.toLowerCase().includes(q));
  const stmtFiltered=stmt.filter(l=>!q||`${l.date} ${l.reference} ${l.chequeNo} ${l.utr} ${l.description}`.toLowerCase().includes(q));

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
              {["detailed","minimal"].map(v=>(
                <button key={v} onClick={()=>setView(v)} style={{...((view===v)?btnG:btnGh),fontSize:10,padding:"4px 10px",textTransform:"capitalize"}}>{v}</button>
              ))}
            </div>
          </div>

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
                    {bookLoading&&<tr><td colSpan={7} style={{padding:14,textAlign:"center",color:"#5a6691",fontSize:11}}>Loading…</td></tr>}
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
                    {stmtLoading&&<tr><td colSpan={8} style={{padding:14,textAlign:"center",color:"#5a6691",fontSize:11}}>Loading…</td></tr>}
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
          {!brs?(<p style={{fontSize:11,color:"#5a6691"}}>Loading…</p>):(
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

export function CashFlowForecast({branch}){
  const cur=bc(branch).cur;
  const brCode=branch==="ALL"?undefined:branch&&branch.code;
  const { rows, create, remove } = useCrud('cashflow-forecast', brCode?{branch:brCode}:{});
  const tb=useTrialBalance(branch,{}).data||{};
  const openingCash=(tb.rows||[]).filter(r=>/cash|bank/i.test(r.group||"")).reduce((s,r)=>s+((r.closingDebit||0)-(r.closingCredit||0)),0);
  const blank={date:'',kind:'inflow',category:'',amount:''};
  const [f,setF]=useState(blank);
  const set=(k)=>(e)=>setF(s=>({...s,[k]:e.target.value}));
  const add=()=>{ if(!brCode){ toast('Select a specific branch (not All) before adding.','error'); return; } if(!f.date||!f.amount){return;} create.mutate({branch:brCode,date:f.date,kind:f.kind,category:f.category,amount:Number(f.amount)||0},{onSuccess:()=>setF(blank)}); };
  const today=new Date(); today.setHours(0,0,0,0);
  const wk=(d)=>{ const dt=new Date(d); return Math.floor((dt-today)/(7*86400000)); };
  const weeks=Array.from({length:13},(_,i)=>({i,inflow:0,outflow:0}));
  rows.forEach(r=>{ const w=wk(r.date); if(w>=0&&w<13){ if(r.kind==="inflow")weeks[w].inflow+=r.amount||0; else weeks[w].outflow+=r.amount||0; } });
  let bal=openingCash; const wrows=weeks.map(w=>{ const net=w.inflow-w.outflow; bal+=net; const d=new Date(today.getTime()+w.i*7*86400000); return {...w,net,bal,label:d.toISOString().slice(5,10)}; });
  const totIn=weeks.reduce((s,w)=>s+w.inflow,0),totOut=weeks.reduce((s,w)=>s+w.outflow,0);
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};
  const ip={...inp,minHeight:30,fontSize:11,width:"100%"};
  const kc=(label,val,col)=>(<div style={{...card,borderTop:`3px solid ${col}`}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>{label}</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:col}}>{cur+fmt(val)}</p></div>);
  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:19,fontWeight:800,color:"#0d1326"}}>13-Week Cash-Flow Forecast</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Opening cash is live from the books; add expected in/out lines to project the closing balance.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {kc("Opening Cash",openingCash,"#185FA5")}{kc("13-wk Inflow",totIn,"#27500A")}{kc("13-wk Outflow",totOut,"#A32D2D")}{kc("Projected Close",openingCash+totIn-totOut,"#854F0B")}
      </div>
      <div style={{...card,marginBottom:12}}>
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Add expected cash line</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,alignItems:"center"}}>
          <input style={ip} type="date" value={f.date} onChange={set('date')}/>
          <DropdownMenu
            ariaLabel="Kind"
            menuRole="listbox"
            items={[
              { key:'inflow', label:'▲ Inflow', selected:f.kind==='inflow', onSelect:()=>setF(s=>({...s,kind:'inflow'})) },
              { key:'outflow', label:'▼ Outflow', selected:f.kind==='outflow', onSelect:()=>setF(s=>({...s,kind:'outflow'})) },
            ]}
            renderTrigger={({ ref, toggle, triggerProps }) => (
              <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                style={{...ip,display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,fontWeight:700,color:f.kind==="inflow"?"#27500A":"#A32D2D",cursor:"pointer",textAlign:"left"}}>
                {f.kind==="inflow"?"▲ Inflow":"▼ Outflow"}
                <ChevronDown size={13} style={{color:"#5b616e",flexShrink:0}}/>
              </button>
            )}
          />
          <input style={ip} placeholder="Category" value={f.category} onChange={set('category')}/>
          <input style={ip} type="number" placeholder="Amount" value={f.amount} onChange={set('amount')}/>
          <button onClick={add} disabled={create.isPending} style={{...btnG,minHeight:32,fontSize:11}}>+ Add</button>
        </div>
      </div>
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Week of</th><th style={{padding:"9px 8px",textAlign:"right"}}>Inflow</th><th style={{padding:"9px 8px",textAlign:"right"}}>Outflow</th><th style={{padding:"9px 8px",textAlign:"right"}}>Net</th><th style={{padding:"9px 8px",textAlign:"right"}}>Running Balance</th>
            </tr></thead>
            <tbody>
              {wrows.map((w)=>(<tr key={w.i} style={{borderBottom:"1px solid #cdd1d8"}}>
                <td style={{padding:"6px 8px"}}>W{w.i+1} ({w.label})</td>
                <td style={{padding:"6px 8px",textAlign:"right",color:"#27500A"}}>{w.inflow?cur+fmt(w.inflow):"-"}</td>
                <td style={{padding:"6px 8px",textAlign:"right",color:"#A32D2D"}}>{w.outflow?cur+fmt(w.outflow):"-"}</td>
                <td style={{padding:"6px 8px",textAlign:"right"}}>{cur+fmt(w.net)}</td>
                <td style={{padding:"6px 8px",textAlign:"right",fontWeight:700,color:w.bal<0?"#A32D2D":"#0d1326"}}>{cur+fmt(w.bal)}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>
      {rows.length>0&&<div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#f3f4f8"}}><tr><th style={{padding:"7px 8px",textAlign:"left"}}>Date</th><th style={{padding:"7px 8px",textAlign:"left"}}>Kind</th><th style={{padding:"7px 8px",textAlign:"left"}}>Category</th><th style={{padding:"7px 8px",textAlign:"right"}}>Amount</th><th style={{padding:"7px 8px"}}></th></tr></thead>
            <tbody>
              {rows.map((r)=>(<tr key={r.id} style={{borderBottom:"1px solid #dfe2e7"}}>
                <td style={{padding:"6px 8px"}}>{r.date}</td><td style={{padding:"6px 8px"}}>{r.kind}</td><td style={{padding:"6px 8px"}}>{r.category||"-"}</td>
                <td style={{padding:"6px 8px",textAlign:"right",fontWeight:600,color:r.kind==="inflow"?"#27500A":"#A32D2D"}}>{cur+fmt(r.amount)}</td>
                <td style={{padding:"6px 8px",textAlign:"center"}}><button onClick={()=>remove.mutate(r.id)} style={{background:"none",border:"none",color:"#A32D2D",cursor:"pointer",fontWeight:700}}>x</button></td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   BATCH B — PRIORITY 2: COMPLIANCE + FINANCE
   PfEsiChallan · YearEndClose · RecurringVouchers
   ForexReport · Form26AS · EWayBill · GratuityRegister
   ════════════════════════════════════════════════════════════════ */

/* ── PF / ESI CHALLAN REGISTER ───────────────────────────────── */


/* ── RECURRING VOUCHER TEMPLATES ─────────────────────────────── */

// Single source of truth lives in core/taxSections; re-exported here for the
// existing importers of this module.
export { TDS_SECTIONS } from '../../core/taxSections';

export function LoanEmiRegister({branch}){
  const cur=bc(branch).cur;
  const brCode=branch==="ALL"?undefined:branch&&branch.code;
  const { rows, create, remove } = useCrud('loans', brCode?{branch:brCode}:{});
  const blank={lender:'',type:'Term',purpose:'',principal:'',rate:'',tenure:'',emi:'',balance:'',nextDue:''};
  const [f,setF]=useState(blank);
  const set=(k)=>(e)=>setF(s=>({...s,[k]:e.target.value}));
  const add=()=>{ if(!brCode){ toast('Select a specific branch (not All) before adding.','error'); return; } if(!f.lender){return;} create.mutate({branch:brCode,lender:f.lender,type:f.type,purpose:f.purpose,principal:Number(f.principal)||0,rate:Number(f.rate)||0,tenure:Number(f.tenure)||0,emi:Number(f.emi)||0,balance:Number(f.balance)||Number(f.principal)||0,nextDue:f.nextDue,status:'active'},{onSuccess:()=>setF(blank)}); };
  const totP=rows.reduce((s,l)=>s+(l.principal||0),0),totB=rows.reduce((s,l)=>s+(l.balance||0),0),totE=rows.reduce((s,l)=>s+(l.emi||0),0);
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};
  const ip={...inp,minHeight:30,fontSize:11,width:"100%"};
  const kc=(label,val,col)=>(<div style={{...card,borderTop:`3px solid ${col}`}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>{label}</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:col}}>{cur+fmt(val)}</p></div>);
  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:19,fontWeight:800,color:"#0d1326"}}>Loan & EMI Register</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Term / Vehicle / Working-capital / OD loans. Live - shows 0 until you add a loan.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {kc("Total Borrowed",totP,"#185FA5")}{kc("Outstanding",totB,"#A32D2D")}{kc("Repaid",totP-totB,"#27500A")}{kc("Monthly EMI",totE,"#854F0B")}
      </div>
      <div style={{...card,marginBottom:12}}>
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Add loan</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:6,alignItems:"center"}}>
          <input style={ip} placeholder="Lender" value={f.lender} onChange={set('lender')}/>
          <input style={ip} placeholder="Type" value={f.type} onChange={set('type')}/>
          <input style={ip} type="number" placeholder="Principal" value={f.principal} onChange={set('principal')}/>
          <input style={ip} type="number" placeholder="Rate %" value={f.rate} onChange={set('rate')}/>
          <input style={ip} type="number" placeholder="Tenure m" value={f.tenure} onChange={set('tenure')}/>
          <input style={ip} type="number" placeholder="EMI" value={f.emi} onChange={set('emi')}/>
          <input style={ip} type="number" placeholder="Balance" value={f.balance} onChange={set('balance')}/>
          <button onClick={add} disabled={create.isPending} style={{...btnG,minHeight:32,fontSize:11}}>+ Add</button>
        </div>
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Lender / Type</th><th style={{padding:"9px 8px",textAlign:"right"}}>Principal</th><th style={{padding:"9px 8px",textAlign:"center"}}>Rate</th><th style={{padding:"9px 8px",textAlign:"center"}}>Tenure</th><th style={{padding:"9px 8px",textAlign:"right"}}>EMI</th><th style={{padding:"9px 8px",textAlign:"right"}}>Balance</th><th style={{padding:"9px 8px",textAlign:"center"}}>Next Due</th><th style={{padding:"9px 8px"}}></th>
            </tr></thead>
            <tbody>
              {rows.map((l,i)=>(<tr key={l.id} style={{background:i%2?"#f3f4f8":"#fff",borderBottom:"1px solid #cdd1d8"}}>
                <td style={{padding:"7px 8px",fontWeight:600}}>{l.lender}<div style={{fontSize:9.5,color:"#5a6691",fontWeight:400}}>{l.type}{l.purpose?(" - "+l.purpose):''}</div></td>
                <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(l.principal)}</td>
                <td style={{padding:"7px 8px",textAlign:"center",color:"#854F0B"}}>{l.rate}%</td>
                <td style={{padding:"7px 8px",textAlign:"center"}}>{l.tenure>0?l.tenure+" m":"OD"}</td>
                <td style={{padding:"7px 8px",textAlign:"right"}}>{l.emi>0?cur+fmt(l.emi):"-"}</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,color:"#A32D2D"}}>{cur+fmt(l.balance)}</td>
                <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{l.nextDue||"-"}</td>
                <td style={{padding:"7px 8px",textAlign:"center"}}><button onClick={()=>remove.mutate(l.id)} style={{background:"none",border:"none",color:"#A32D2D",cursor:"pointer",fontWeight:700}}>x</button></td>
              </tr>))}
              {rows.length===0&&<tr><td colSpan={8} style={{padding:20,textAlign:"center",color:"#5a6691"}}>No loans yet - add one above.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function WorkingCapitalDashboard({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;

  const TREND=[
    {month:"Dec'25",ar:18500000,inv:850000,ap:14200000,wc:5150000,dso:48,dpo:42},
    {month:"Jan'26",ar:19200000,inv:920000,ap:15850000,wc:4270000,dso:46,dpo:45},
    {month:"Feb'26",ar:20100000,inv:880000,ap:16500000,wc:4480000,dso:45,dpo:46},
    {month:"Mar'26",ar:21500000,inv:950000,ap:17800000,wc:4650000,dso:42,dpo:48},
    {month:"Apr'26",ar:22000000,inv:920000,ap:18100000,wc:4820000,dso:40,dpo:50},
    {month:"May'26",ar:22500000,inv:850000,ap:18250000,wc:5100000,dso:38,dpo:52},
  ];
  const curr=TREND[TREND.length-1];
  const prev=TREND[TREND.length-2];

  const cycle=curr.dso-curr.dpo;
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>💼 Working Capital Dashboard</h2>
      <p style={{margin:"4px 0 8px",fontSize:11.5,color:"#5a6691"}}>Receivables + Inventory − Payables · Cash conversion cycle · 6-month trend</p>
      <div role="note" style={{margin:"0 0 14px",padding:"8px 12px",background:"#FAEEDA",border:"1px solid #f0d28a",borderRadius:8,fontSize:11.5,color:"#854F0B",fontWeight:600}}>⚠ Sample figures — this layout isn’t wired to your live books yet. Do not use for reporting or decisions.</div>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Trade Receivables</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{cur+fmt(curr.ar)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>DSO {curr.dso} days</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Inventory</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{cur+fmt(curr.inv)}</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Trade Payables</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{cur+fmt(curr.ap)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>DPO {curr.dpo} days</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Net Working Capital</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{cur+fmt(curr.wc)}</p><p style={{margin:0,fontSize:10,color:curr.wc>prev.wc?"#27500A":"#A32D2D"}}>{curr.wc>prev.wc?"↑":"↓"} vs prev</p></div>
      </div>

      <div style={{...card,marginBottom:14}}>
        <h3 style={{margin:"0 0 8px",fontSize:12,color:"#0d1326"}}>Cash Conversion Cycle</h3>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <div style={{background:"#E6F1FB",padding:"8px 12px",borderRadius:6,minWidth:140,textAlign:"center"}}>
            <div style={{fontSize:10,color:"#185FA5",fontWeight:700,textTransform:"uppercase"}}>DSO</div>
            <div style={{fontSize:18,fontWeight:800,color:"#185FA5"}}>{curr.dso}d</div>
          </div>
          <span style={{fontSize:18,color:"#5a6691"}}>＋</span>
          <div style={{background:"#FAEEDA",padding:"8px 12px",borderRadius:6,minWidth:140,textAlign:"center"}}>
            <div style={{fontSize:10,color:"#854F0B",fontWeight:700,textTransform:"uppercase"}}>Inventory Days</div>
            <div style={{fontSize:18,fontWeight:800,color:"#854F0B"}}>3d</div>
          </div>
          <span style={{fontSize:18,color:"#5a6691"}}>－</span>
          <div style={{background:"#FCEBEB",padding:"8px 12px",borderRadius:6,minWidth:140,textAlign:"center"}}>
            <div style={{fontSize:10,color:"#A32D2D",fontWeight:700,textTransform:"uppercase"}}>DPO</div>
            <div style={{fontSize:18,fontWeight:800,color:"#A32D2D"}}>{curr.dpo}d</div>
          </div>
          <span style={{fontSize:18,color:"#5a6691"}}>＝</span>
          <div style={{background:cycle<0?"#EAF3DE":"#f3f4f8",padding:"8px 14px",borderRadius:6,minWidth:160,textAlign:"center",border:"2px solid "+(cycle<0?"#27500A":"#5a6691")}}>
            <div style={{fontSize:10,color:cycle<0?"#27500A":"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Cash Cycle</div>
            <div style={{fontSize:20,fontWeight:800,color:cycle<0?"#27500A":"#5a6691"}}>{cycle}d</div>
          </div>
        </div>
        <p style={{margin:"10px 0 0",fontSize:10.5,color:"#5a6691"}}>
          {cycle<0?"✓ Negative cycle — suppliers fund your operations":"You finance operations for "+cycle+" days before getting paid"}
        </p>
      </div>

      <h3 style={{margin:"8px 0 6px",fontSize:13,color:"#0d1326"}}>6-Month Trend</h3>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Month</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Receivables</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Inventory</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Payables</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Working Capital</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>DSO</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>DPO</th>
            </tr></thead>
            <tbody>
              {TREND.map((r,i)=>(
                <tr key={r.month} style={{background:i===TREND.length-1?"#FAEEDA":i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #cdd1d8",fontWeight:i===TREND.length-1?700:400}}>
                  <td style={{padding:"7px 8px"}}>{r.month}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(r.ar)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(r.inv)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(r.ap)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",color:"#854F0B",fontWeight:700}}>{cur+fmt(r.wc)}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}>{r.dso}d</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}>{r.dpo}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


export function CashFlowDirect({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;

  const OPERATING=[
    {label:"Receipts from customers",value:118500000},
    {label:"Receipts from sub-agents",value:4200000},
    {label:"Other operating receipts",value:850000},
    {label:"Total operating inflows",value:123550000,subtotal:true},
    {label:"Payments to airlines (BSP & non-BSP)",value:-72500000},
    {label:"Payments to DMCs & hotels",value:-28500000},
    {label:"Payments to other suppliers",value:-5850000},
    {label:"Payments to employees",value:-8450000},
    {label:"Taxes paid (GST, TDS, Income Tax)",value:-4500000},
    {label:"Other operating payments",value:-2850000},
    {label:"Total operating outflows",value:-122650000,subtotal:true},
    {label:"Net cash from operating activities",value:900000,total:true},
  ];
  const INVESTING=[
    {label:"Purchase of fixed assets",value:-3850000},
    {label:"Sale of fixed assets",value:185000},
    {label:"Purchase of investments",value:-2500000},
    {label:"Interest received",value:425000},
    {label:"Net cash from investing activities",value:-5740000,total:true},
  ];
  const FINANCING=[
    {label:"Long-term borrowings raised",value:5000000},
    {label:"Repayment of borrowings (principal)",value:-1850000},
    {label:"Interest paid",value:-1450000},
    {label:"Dividend paid",value:-500000},
    {label:"Net cash from financing activities",value:1200000,total:true},
  ];

  const netCash=900000-5740000+1200000;
  const openingCash=22850000;
  const closingCash=openingCash+netCash;

  const Section=({title,rows,color})=>(
    <div style={{marginBottom:14}}>
      <h3 style={{margin:"0 0 6px",fontSize:13,color}}>{title}</h3>
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} style={{background:r.total?"#FAEEDA":r.subtotal?"#f3f4f8":"#fff",borderBottom:"1px solid #cdd1d8"}}>
                <td style={{padding:"8px 10px",fontWeight:r.total?700:r.subtotal?600:400}}>{r.label}</td>
                <td style={{padding:"8px 10px",textAlign:"right",fontWeight:r.total?700:r.subtotal?600:400,color:r.value<0?"#A32D2D":r.value>0?(r.total?color:"#27500A"):"#5a6691"}}>{r.value<0?`(${cur+fmt(Math.abs(r.value))})`:cur+fmt(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>💧 Cash Flow Statement — Direct Method</h2>
      <p style={{margin:"4px 0 8px",fontSize:11.5,color:"#5a6691"}}>AS 3 / Ind AS 7 · RBI-preferred format</p>
      <div role="note" style={{margin:"0 0 14px",padding:"8px 12px",background:"#FAEEDA",border:"1px solid #f0d28a",borderRadius:8,fontSize:11.5,color:"#854F0B",fontWeight:600}}>⚠ Sample figures — this statement isn’t wired to your live books yet. Do not use for filing or decisions.</div>

      <Section title="A. Cash Flows from Operating Activities" rows={OPERATING} color="#185FA5"/>
      <Section title="B. Cash Flows from Investing Activities" rows={INVESTING} color="#854F0B"/>
      <Section title="C. Cash Flows from Financing Activities" rows={FINANCING} color="#A32D2D"/>

      <div style={{background:"#0d1326",color:"#d4a437",borderRadius:10,padding:"14px 16px"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <tbody>
            <tr><td style={{padding:"4px 0"}}>Net increase / (decrease) in cash (A + B + C)</td><td style={{padding:"4px 0",textAlign:"right",fontWeight:700}}>{netCash<0?`(${cur+fmt(Math.abs(netCash))})`:cur+fmt(netCash)}</td></tr>
            <tr><td style={{padding:"4px 0"}}>Cash and cash equivalents — Opening</td><td style={{padding:"4px 0",textAlign:"right"}}>{cur+fmt(openingCash)}</td></tr>
            <tr style={{borderTop:"1px solid #d4a437"}}><td style={{padding:"6px 0",fontWeight:700,fontSize:13}}>Cash and cash equivalents — Closing</td><td style={{padding:"6px 0",textAlign:"right",fontWeight:700,fontSize:13}}>{cur+fmt(closingCash)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}


export const TDS_SECTIONS_TABLE = [
  {section:"194A",description:"Interest (other than securities)",threshold:40000,rateWithPAN:10,rateWithoutPAN:20,category:"Interest"},
  {section:"194C",description:"Payment to contractors/sub-contractors",threshold:30000,rateWithPAN:1,rateWithoutPAN:20,rateCompany:2,category:"Contract"},
  {section:"194H",description:"Commission or brokerage",threshold:15000,rateWithPAN:2,rateWithoutPAN:20,category:"Commission"},
  {section:"194I(a)",description:"Rent — plant & machinery",threshold:240000,rateWithPAN:2,rateWithoutPAN:20,category:"Rent"},
  {section:"194I(b)",description:"Rent — land, building, furniture",threshold:240000,rateWithPAN:10,rateWithoutPAN:20,category:"Rent"},
  {section:"194J",description:"Fees for professional/technical services",threshold:30000,rateWithPAN:10,rateWithoutPAN:20,category:"Professional"},
  {section:"194Q",description:"Purchase of goods",threshold:5000000,rateWithPAN:0.1,rateWithoutPAN:5,category:"Purchase"},
  {section:"206C(1H)",description:"TCS on sale of goods > ₹50L",threshold:5000000,rateWithPAN:0.1,rateWithoutPAN:1,category:"TCS"},
];

/* ════════════════════════════════════════════════════════════════════
   1. BANK BALANCE DASHBOARD
   ════════════════════════════════════════════════════════════════════ */

export function BankBalanceDashboard({ branch }={}){
  // Follows the top-bar branch: a specific branch pins the dashboard to it (no
  // "All branches" override); the full cross-branch list lives under ALL.
  const shellCode = branch && branch !== "ALL" ? (branch.code || branch) : "ALL";
  const [filterBranch,setFilterBranch]=useState(shellCode);
  useEffect(()=>{ setFilterBranch(shellCode); },[shellCode]);
  const branchArg = filterBranch==="ALL" ? "ALL" : { code: filterBranch };
  const tb = useTrialBalance(branchArg, {}).data || {};
  const rows = (tb.rows||[]).filter(r=>/cash|bank/i.test(r.group||""));
  const bal = (r)=> (r.closingDebit||0)-(r.closingCredit||0);
  const cashTotal = rows.filter(r=>/cash/i.test(r.group)).reduce((s,r)=>s+bal(r),0);
  const bankTotal = rows.filter(r=>/bank/i.test(r.group)).reduce((s,r)=>s+bal(r),0);
  const total = cashTotal + bankTotal;
  const kpi=(label,val,sub,col)=>(<div style={{...cardStyle,borderTop:`3px solid ${col}`}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>{label}</p><p style={{margin:"5px 0 2px",fontSize:22,fontWeight:700,color:val<0?"#A32D2D":"#0d1326"}}>{fmtINR(val)}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>{sub}</p></div>);
  return(
    <PHASE2_Page title="Bank Balance Dashboard"
      subtitle="Live cash & bank balances from the books · shows 0 until entries are posted"
      toolbar={<select value={filterBranch} disabled={shellCode!=="ALL"} title={shellCode!=="ALL"?"Scoped by the top-bar branch — switch it there":undefined} onChange={e=>setFilterBranch(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}>
        {shellCode==="ALL" && <option value="ALL">All branches</option>}
        {(shellCode==="ALL"?BRANCH_CODES:[shellCode]).map(b=><option key={b}>{b}</option>)}
      </select>}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:14}}>
        {kpi("Total Liquid (INR)",total,`${rows.length} cash/bank ledger${rows.length===1?"":"s"}`,total<0?"#A32D2D":"#22c55e")}
        {kpi("Bank Balance",bankTotal,"all bank ledgers","#d4a437")}
        {kpi("Cash in Hand",cashTotal,"all cash ledgers","#3b82f6")}
      </div>
      <div style={cardStyle}>
        <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Cash &amp; Bank Ledgers — Live Balances</p>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr><th style={RPT_thStyle}>Ledger</th><th style={RPT_thStyle}>Group</th><th style={{...RPT_thStyle,textAlign:"right"}}>Balance (INR)</th></tr></thead>
            <tbody>
              {rows.map((r,i)=>(<tr key={i} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{...RPT_tdStyle,fontWeight:600}}>{r.ledger}</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>{r.group}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:bal(r)<0?"#A32D2D":"#0d1326"}}>{fmtINR(bal(r))}</td></tr>))}
              {rows.length===0&&<tr><td colSpan={3} style={{...RPT_tdStyle,textAlign:"center",color:"#5a6691",padding:20}}>No cash/bank balances yet — post receipts/payments and they appear here.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   2. TDS AUTO-CALCULATOR
   ════════════════════════════════════════════════════════════════════ */

export function TDSCalculator(){
  const [section,setSection]=useState("194C");
  const [amount,setAmount]=useState(500000);
  const [hasPAN,setHasPAN]=useState(true);
  const [isCompany,setIsCompany]=useState(false);
  const [pan,setPan]=useState("AAACL0140P");

  const sec=TDS_SECTIONS_TABLE.find(s=>s.section===section)||TDS_SECTIONS_TABLE[0];
  const rate=hasPAN?(isCompany&&sec.rateCompany?sec.rateCompany:sec.rateWithPAN):sec.rateWithoutPAN;
  const tdsAmt=Math.round(amount*rate/100);
  const netPayable=amount-tdsAmt;
  const aboveThreshold=amount>sec.threshold;
  const inp={padding:"8px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12.5,width:"100%"};

  return(
    <PHASE2_Page title="TDS Auto-Calculator" subtitle="Section auto-selected · rate auto-applied based on PAN availability · threshold check">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {/* Inputs */}
        <div style={cardStyle}>
          <p style={{margin:"0 0 16px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Voucher Details</p>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Payment Nature / Section</label>
              <select value={section} onChange={e=>setSection(e.target.value)} style={inp}>
                {TDS_SECTIONS_TABLE.map(s=><option key={s.section} value={s.section}>{s.section} — {s.description}</option>)}
              </select></div>
            <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Gross Payment Amount (₹)</label>
              <input type="number" value={amount} onChange={e=>setAmount(+e.target.value)} style={{...inp,fontFamily:"monospace",fontSize:14,fontWeight:700}}/></div>
            <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Vendor PAN</label>
              <div style={{display:"flex",gap:8}}>
                <input value={pan} onChange={e=>setPan(e.target.value)} style={{...inp,fontFamily:"monospace"}} placeholder="AAACL0140P"/>
                <span style={{padding:"8px 12px",background:pan.length===10?"#d4edda":"#f8d7da",color:pan.length===10?"#155724":"#721c24",borderRadius:5,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{pan.length===10?"✓ Valid":"✗ Invalid"}</span>
              </div></div>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,cursor:"pointer"}}>
              <input type="checkbox" checked={hasPAN} onChange={e=>setHasPAN(e.target.checked)}/>
              <span>Vendor has submitted PAN</span>
            </label>
            {section==="194C"&&<label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,cursor:"pointer"}}>
              <input type="checkbox" checked={isCompany} onChange={e=>setIsCompany(e.target.checked)}/>
              <span>Vendor is a Company (2% rate applies)</span>
            </label>}
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,cursor:"pointer"}}>
              <input type="checkbox"/>
              <span>15G / 15H declaration received</span>
            </label>
          </div>
        </div>

        {/* Results */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Threshold check */}
          <div style={{padding:14,background:aboveThreshold?"#fff8e8":"#f0fff4",border:"1px solid "+(aboveThreshold?"#fde68a":"#bbf7d0"),borderRadius:8}}>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:aboveThreshold?"#856404":"#155724"}}>
              {aboveThreshold?"✓ Above threshold — TDS applicable":"○ Below threshold — TDS not applicable"}
            </p>
            <p style={{margin:"3px 0 0",fontSize:11,color:"#5a6691"}}>{sec.section} threshold: ₹{sec.threshold.toLocaleString("en-IN")} | Payment: ₹{amount.toLocaleString("en-IN")}</p>
          </div>

          {/* Calculation breakdown */}
          <div style={cardStyle}>
            <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>TDS Calculation</p>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[
                {label:"Section",val:sec.section+" — "+sec.description,mono:false},
                {label:"TDS Rate",val:rate+"% "+(hasPAN?"(with PAN)":"(NO PAN — higher rate)"),mono:false,color:!hasPAN?"#A32D2D":"#0d1326"},
                {label:"Gross Amount",val:"₹ "+amount.toLocaleString("en-IN"),mono:true},
                {label:"TDS Amount",val:"₹ "+tdsAmt.toLocaleString("en-IN"),mono:true,bold:true,color:"#A32D2D"},
                {label:"Net Payable to Vendor",val:"₹ "+netPayable.toLocaleString("en-IN"),mono:true,bold:true,color:"#22c55e"},
              ].map((r,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #dfe2e7"}}>
                  <span style={{fontSize:11.5,color:"#5a6691"}}>{r.label}</span>
                  <span style={{fontSize:r.bold?14:12,fontWeight:r.bold?700:500,color:r.color||"#0d1326",fontFamily:r.mono?"monospace":"inherit"}}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{padding:14,background:"#0d1326",borderRadius:8,color:"#fff"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><p style={{margin:0,fontSize:11,color:"#d4a437",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>Pay to Vendor</p><p style={{margin:"4px 0 0",fontSize:26,fontWeight:700,fontFamily:"monospace",color:"#fff"}}>{fmtINR(netPayable)}</p></div>
              <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:11,color:"#d4a437",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>Deposit TDS to Govt</p><p style={{margin:"4px 0 0",fontSize:26,fontWeight:700,fontFamily:"monospace",color:"#d4a437"}}>{fmtINR(tdsAmt)}</p></div>
            </div>
            <p style={{margin:"10px 0 0",fontSize:10.5,color:"#5a6691",borderTop:"1px solid #ffffff20",paddingTop:8}}>Challan 281 · Due by 7th of following month · Credit to TRACES within 30 days</p>
          </div>

          {/* TDS rates reference */}
          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Quick rate reference — {sec.section}</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#f7f8fb"}}><th style={{...RPT_thStyle,textAlign:"left"}}>Condition</th><th style={{...RPT_thStyle,textAlign:"right"}}>Rate</th></tr></thead>
              <tbody>
                <tr><td style={RPT_tdStyle}>With valid PAN{sec.rateCompany?" (Individual/HUF)":""}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{sec.rateWithPAN}%</td></tr>
                {sec.rateCompany&&<tr><td style={RPT_tdStyle}>With valid PAN (Company)</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{sec.rateCompany}%</td></tr>}
                <tr><td style={RPT_tdStyle}>Without PAN / invalid PAN</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#A32D2D"}}>{sec.rateWithoutPAN}%</td></tr>
                <tr><td style={RPT_tdStyle}>Threshold (per transaction)</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{fmtINR(sec.threshold)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   3. INTEREST CALCULATOR (delayed payments)
   ════════════════════════════════════════════════════════════════════ */

export function InterestCalculator(){
  const [principal,setPrincipal]=useState(500000);
  const [rate,setRate]=useState(18);
  const [dueDate,setDueDate]=useState("2026-04-01");
  const [calcDate,setCalcDate]=useState(todayISO());
  const [mode,setMode]=useState("simple");
  const inp={padding:"8px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12.5,width:"100%"};

  const msPerDay=86400000;
  const days=Math.max(0,Math.round((new Date(calcDate)-new Date(dueDate))/msPerDay));
  const simpleInt=Math.round(principal*rate/100*days/365);
  const compInt=Math.round(principal*(Math.pow(1+rate/100/12,days/30.44)-1));
  const interest=mode==="simple"?simpleInt:compInt;
  const total=principal+interest;

  const monthly=[];
  let rem=principal,runInt=0;
  const monthRate=rate/100/12;
  for(let m=1;m<=Math.min(Math.ceil(days/30),12);m++){
    const mInt=Math.round(rem*monthRate);
    runInt+=mInt;
    monthly.push({m,opening:rem,interest:mInt,cumInt:runInt});
  }

  return(
    <PHASE2_Page title="Interest Calculator — Delayed Payments"
      subtitle="Calculate interest on overdue invoices · simple or compound · per-day granularity">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={cardStyle}>
          <p style={{margin:"0 0 16px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Input Parameters</p>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Outstanding Amount (Principal)</label>
              <input type="number" value={principal} onChange={e=>setPrincipal(+e.target.value)} style={{...inp,fontFamily:"monospace",fontSize:14,fontWeight:700}}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Due Date</label>
                <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={inp}/></div>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Calculate As Of</label>
                <input type="date" value={calcDate} onChange={e=>setCalcDate(e.target.value)} style={inp}/></div>
            </div>
            <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Interest Rate (% p.a.)</label>
              <input type="number" step="0.5" value={rate} onChange={e=>setRate(+e.target.value)} style={{...inp,fontFamily:"monospace",fontSize:14,fontWeight:700}}/></div>
            <div style={{display:"flex",gap:8}}>
              {["simple","compound"].map(m=>(
                <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"9px",border:mode===m?"2px solid #d4a437":"1px solid #cdd1d8",background:mode===m?"#fff8e8":"#fff",color:mode===m?"#0d1326":"#5a6691",borderRadius:6,fontSize:12,fontWeight:mode===m?700:500,cursor:"pointer",textTransform:"capitalize"}}>{m} Interest</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{padding:18,background:"#0d1326",borderRadius:8,color:"#fff",textAlign:"center"}}>
            <p style={{margin:0,fontSize:11,color:"#d4a437",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Delay — {days} days</p>
            <p style={{margin:"8px 0 4px",fontSize:11,color:"#5a6691"}}>Principal</p>
            <p style={{margin:"0 0 8px",fontSize:20,fontWeight:700,fontFamily:"monospace",color:"#fff"}}>{fmtINR(principal)}</p>
            <div style={{borderTop:"1px solid #ffffff20",paddingTop:8,marginTop:4}}>
              <p style={{margin:0,fontSize:11,color:"#f97316",fontWeight:700,textTransform:"uppercase"}}>Interest ({mode})</p>
              <p style={{margin:"4px 0 8px",fontSize:28,fontWeight:700,fontFamily:"monospace",color:"#f97316"}}>+ {fmtINR(interest)}</p>
            </div>
            <div style={{borderTop:"1px solid #ffffff20",paddingTop:8}}>
              <p style={{margin:0,fontSize:11,color:"#d4a437",fontWeight:700,textTransform:"uppercase"}}>Total Recoverable</p>
              <p style={{margin:"4px 0 0",fontSize:30,fontWeight:700,fontFamily:"monospace",color:"#d4a437"}}>{fmtINR(total)}</p>
            </div>
          </div>

          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Monthly Breakup</p>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead><tr style={{background:"#f7f8fb"}}>
                <th style={RPT_thStyle}>Month</th>
                <th style={{...RPT_thStyle,textAlign:"right"}}>Opening</th>
                <th style={{...RPT_thStyle,textAlign:"right"}}>Interest</th>
                <th style={{...RPT_thStyle,textAlign:"right"}}>Cumul. Int.</th>
              </tr></thead>
              <tbody>{monthly.map(r=>(
                <tr key={r.m} style={{borderBottom:"1px solid #dfe2e7"}}>
                  <td style={{...RPT_tdStyle,fontWeight:600}}>Month {r.m}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{fmtINR(r.opening)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",color:"#f97316",fontWeight:700,fontFamily:"monospace"}}>{fmtINR(r.interest)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{fmtINR(r.cumInt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   4. INVESTMENT REGISTER
   ════════════════════════════════════════════════════════════════════ */

export function InvestmentRegister({branch}){
  const cur=(bc(branch||'ALL')||{}).cur||'INR ';
  const brCode=(!branch||branch==="ALL")?undefined:branch&&branch.code;
  const { rows, create, remove } = useCrud('investments', brCode?{branch:brCode}:{});
  const blank={instrument:'',type:'FD',institution:'',amount:'',rate:'',maturityDate:'',maturityValue:'',status:'active'};
  const [f,setF]=useState(blank);
  const set=(k)=>(e)=>setF(s=>({...s,[k]:e.target.value}));
  const add=()=>{ if(!brCode){ toast('Select a specific branch (not All) before adding.','error'); return; } if(!f.instrument){return;} create.mutate({branch:brCode,instrument:f.instrument,type:f.type,institution:f.institution,amount:Number(f.amount)||0,rate:Number(f.rate)||0,maturityDate:f.maturityDate,maturityValue:Number(f.maturityValue)||0,status:f.status},{onSuccess:()=>setF(blank)}); };
  const totA=rows.reduce((s,i)=>s+(i.amount||0),0),totM=rows.reduce((s,i)=>s+(i.maturityValue||0),0);
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};
  const ip={...inp,minHeight:30,fontSize:11,width:"100%"};
  const kc=(label,val,col)=>(<div style={{...card,borderTop:`3px solid ${col}`}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>{label}</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:col}}>{cur+fmt(val)}</p></div>);
  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:19,fontWeight:800,color:"#0d1326"}}>Investment Register</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>FD / Mutual Fund / Bond / Equity / Property. Live - shows 0 until you add an investment.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {kc("Total Invested",totA,"#185FA5")}{kc("Maturity Value",totM,"#27500A")}{kc("Expected Gain",totM-totA,"#854F0B")}
      </div>
      <div style={{...card,marginBottom:12}}>
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Add investment</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:6,alignItems:"center"}}>
          <input style={ip} placeholder="Instrument" value={f.instrument} onChange={set('instrument')}/>
          <input style={ip} placeholder="Type" value={f.type} onChange={set('type')}/>
          <input style={ip} placeholder="Institution" value={f.institution} onChange={set('institution')}/>
          <input style={ip} type="number" placeholder="Amount" value={f.amount} onChange={set('amount')}/>
          <input style={ip} type="number" placeholder="Rate %" value={f.rate} onChange={set('rate')}/>
          <input style={ip} type="date" value={f.maturityDate} onChange={set('maturityDate')}/>
          <input style={ip} type="number" placeholder="Maturity Val" value={f.maturityValue} onChange={set('maturityValue')}/>
          <button onClick={add} disabled={create.isPending} style={{...btnG,minHeight:32,fontSize:11}}>+ Add</button>
        </div>
      </div>
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Instrument</th><th style={{padding:"9px 8px",textAlign:"left"}}>Type</th><th style={{padding:"9px 8px",textAlign:"left"}}>Institution</th><th style={{padding:"9px 8px",textAlign:"right"}}>Amount</th><th style={{padding:"9px 8px",textAlign:"center"}}>Rate</th><th style={{padding:"9px 8px",textAlign:"center"}}>Maturity</th><th style={{padding:"9px 8px",textAlign:"right"}}>Maturity Val</th><th style={{padding:"9px 8px",textAlign:"center"}}>Status</th><th style={{padding:"9px 8px"}}></th>
            </tr></thead>
            <tbody>
              {rows.map((iv,i)=>(<tr key={iv.id} style={{background:i%2?"#f3f4f8":"#fff",borderBottom:"1px solid #cdd1d8"}}>
                <td style={{padding:"7px 8px",fontWeight:600}}>{iv.instrument}</td>
                <td style={{padding:"7px 8px"}}>{iv.type}</td>
                <td style={{padding:"7px 8px",color:"#5a6691"}}>{iv.institution||"-"}</td>
                <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(iv.amount)}</td>
                <td style={{padding:"7px 8px",textAlign:"center",color:"#854F0B"}}>{iv.rate?iv.rate+"%":"-"}</td>
                <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{iv.maturityDate||"-"}</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,color:"#27500A"}}>{iv.maturityValue?cur+fmt(iv.maturityValue):"-"}</td>
                <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{iv.status}</td>
                <td style={{padding:"7px 8px",textAlign:"center"}}><button onClick={()=>remove.mutate(iv.id)} style={{background:"none",border:"none",color:"#A32D2D",cursor:"pointer",fontWeight:700}}>x</button></td>
              </tr>))}
              {rows.length===0&&<tr><td colSpan={9} style={{padding:20,textAlign:"center",color:"#5a6691"}}>No investments yet - add one above.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function LoanAmortization(){
  const [principal,setPrincipal]=useState(5000000);
  const [annualRate,setAnnualRate]=useState(10.5);
  const [tenureMonths,setTenureMonths]=useState(60);
  const [startDate,setStartDate]=useState("2026-06-01");
  const [showAll,setShowAll]=useState(false);
  const inp={padding:"8px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12.5,width:"100%"};

  const r=annualRate/100/12;
  const emi=principal>0&&r>0&&tenureMonths>0
    ?Math.round(principal*r*Math.pow(1+r,tenureMonths)/(Math.pow(1+r,tenureMonths)-1))
    :0;
  const totalPayment=emi*tenureMonths;
  const totalInterest=totalPayment-principal;

  const schedule=[];
  let bal=principal;
  const start=new Date(startDate);
  for(let m=1;m<=tenureMonths;m++){
    const intComp=Math.round(bal*r);
    const princComp=emi-intComp;
    bal=Math.max(0,bal-princComp);
    const d=new Date(start);
    d.setMonth(d.getMonth()+m-1);
    schedule.push({m,date:d.toISOString().slice(0,7),opening:bal+princComp,emi,interest:intComp,principal:princComp,closing:bal});
  }
  const display=showAll?schedule:schedule.slice(0,12);

  return(
    <PHASE2_Page title="Loan Amortization Schedule" subtitle="Full EMI breakup · month-by-month principal vs interest split">
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:14}}>
        {/* Inputs */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={cardStyle}>
            <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Loan Parameters</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Loan Amount (Principal)</label>
                <input type="number" value={principal} onChange={e=>setPrincipal(+e.target.value)} style={{...inp,fontFamily:"monospace",fontSize:14,fontWeight:700}}/></div>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Annual Interest Rate (%)</label>
                <input type="number" step="0.25" value={annualRate} onChange={e=>setAnnualRate(+e.target.value)} style={{...inp,fontFamily:"monospace",fontSize:14,fontWeight:700}}/></div>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Tenure (months)</label>
                <input type="number" value={tenureMonths} onChange={e=>setTenureMonths(+e.target.value)} style={{...inp,fontFamily:"monospace",fontSize:14,fontWeight:700}}/>
                <p style={{margin:"3px 0 0",fontSize:10.5,color:"#5a6691"}}>{Math.floor(tenureMonths/12)}y {tenureMonths%12}m</p></div>
              <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>First EMI Date</label>
                <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={inp}/></div>
            </div>
          </div>

          {/* EMI summary */}
          <div style={{padding:16,background:"#0d1326",borderRadius:8,color:"#fff"}}>
            <p style={{margin:"0 0 10px",fontSize:11,color:"#d4a437",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Monthly EMI</p>
            <p style={{margin:"0 0 12px",fontSize:30,fontWeight:700,fontFamily:"monospace",color:"#fff"}}>{fmtINR(emi)}</p>
            {[{l:"Principal",v:fmtINR(principal),c:"#fff"},{l:"Total Interest",v:fmtINR(totalInterest),c:"#f97316"},{l:"Total Payment",v:fmtINR(totalPayment),c:"#d4a437"}].map(r=>(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderTop:"1px solid #ffffff15"}}>
                <span style={{fontSize:11,color:"#5a6691"}}>{r.l}</span>
                <span style={{fontSize:12,fontWeight:700,color:r.c,fontFamily:"monospace"}}>{r.v}</span>
              </div>
            ))}
          </div>

          {/* Interest ratio bar */}
          <div style={cardStyle}>
            <p style={{margin:"0 0 8px",fontSize:11.5,fontWeight:700,color:"#0d1326"}}>Principal vs Interest breakdown</p>
            <div style={{height:14,borderRadius:5,overflow:"hidden",display:"flex"}}>
              <div style={{background:"#22c55e",flex:principal}} title={`Principal: ${fmtINR(principal)}`}/>
              <div style={{background:"#f97316",flex:totalInterest}} title={`Interest: ${fmtINR(totalInterest)}`}/>
            </div>
            <div style={{display:"flex",gap:14,marginTop:6,fontSize:10.5}}>
              <span><span style={{color:"#22c55e",fontWeight:700}}>■</span> Principal {Math.round(principal/totalPayment*100)}%</span>
              <span><span style={{color:"#f97316",fontWeight:700}}>■</span> Interest {Math.round(totalInterest/totalPayment*100)}%</span>
            </div>
          </div>
        </div>

        {/* Schedule table */}
        <div style={cardStyle}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Amortization Schedule</p>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowAll(!showAll)} style={{padding:"5px 12px",background:"#fff",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:5,fontSize:11,fontWeight:600,cursor:"pointer"}}>{showAll?"Show first 12":"Show all "+tenureMonths}</button>
              <button style={{padding:"5px 12px",background:"#fff",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:5,fontSize:11,fontWeight:600,cursor:"pointer"}}>📥 Excel</button>
            </div>
          </div>
          <div style={{maxHeight:480,overflowY:"auto",border:"1px solid #cdd1d8",borderRadius:6}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
              <thead style={{background:"#f7f8fb",position:"sticky",top:0}}>
                <tr><th style={RPT_thStyle}>#</th><th style={RPT_thStyle}>Date</th><th style={{...RPT_thStyle,textAlign:"right"}}>Opening</th><th style={{...RPT_thStyle,textAlign:"right"}}>EMI</th><th style={{...RPT_thStyle,textAlign:"right",color:"#f97316"}}>Interest</th><th style={{...RPT_thStyle,textAlign:"right",color:"#22c55e"}}>Principal</th><th style={{...RPT_thStyle,textAlign:"right"}}>Closing</th></tr>
              </thead>
              <tbody>{display.map(r=>(
                <tr key={r.m} style={{borderBottom:"1px solid #dfe2e7",background:r.m%2===0?"#fafbfd":"#fff"}}>
                  <td style={{...RPT_tdStyle,color:"#5a6691"}}>{r.m}</td>
                  <td style={{...RPT_tdStyle,fontFamily:"monospace"}}>{r.date}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{fmtINR(r.opening)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,fontFamily:"monospace"}}>{fmtINR(r.emi)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",color:"#f97316",fontFamily:"monospace"}}>{fmtINR(r.interest)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e",fontFamily:"monospace"}}>{fmtINR(r.principal)}</td>
                  <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{fmtINR(r.closing)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {!showAll&&tenureMonths>12&&<p style={{margin:"8px 0 0",fontSize:10.5,color:"#5a6691",textAlign:"center"}}>Showing 12 of {tenureMonths} instalments · click "Show all" to expand</p>}
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   6. RECONCILIATION QUEUE
   ════════════════════════════════════════════════════════════════════ */

// The four tiers, in ladder order, for the pending strip.
const RECO_QUEUE_TIERS = [
  { key:'weekly',  label:'Weekly' },
  { key:'month',   label:'Month-End' },
  { key:'quarter', label:'Quarterly' },
  { key:'year',    label:'Year-End' },
];
// Facts → the row's colour badge + sort rank. Overdue floats to the top, done sinks;
// untouched "pending" ranks above part-worked rows so the most work-to-do is visible.
function recoRowState(it){
  if(it.overdue) return { label:'Overdue', c:'#A32D2D', bg:'#FCEBEB', dot:'#A32D2D', rank:0 };
  if(it.status==='signed'||it.status==='locked') return { label:'Reconciled', c:'#27500A', bg:'#EAF3DE', dot:'#27500A', rank:4 };
  if(it.status==='reconciled') return { label:'Ready to sign', c:'#185FA5', bg:'#E6F1FB', dot:'#185FA5', rank:3 };
  if(it.status==='open'||it.statementImported) return { label:'In progress', c:'#8a5a00', bg:'#FFF4D6', dot:'#d4a437', rank:2 };
  return { label:'Pending', c:'#5a6691', bg:'#eef0f5', dot:'#9aa3bd', rank:1 };
}
const recoWeekShort = (p)=> p ? String(p).replace(/^\d{4}-/,'') : '';
const qTh = (a)=>({padding:"9px 10px",textAlign:a,whiteSpace:"nowrap"});

export function ReconciliationQueue({branch,setRoute}){
  const { data:qData, isLoading:qLoading } = useReconQueue(branch);
  const { data:sData } = useReconSummary(branch);
  const { data:bankData } = useBankLedgers(branch);
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};
  // Prefer the certificate-backed status rows; fall back to the bare bank-ledger
  // list so the screen never regresses if the status endpoint is unavailable.
  const items = (qData && Array.isArray(qData.items) && qData.items.length)
    ? qData.items
    : (bankData||[]).map(l=>({ code:l.code, name:l.name, group:l.group, status:'not-started', difference:null, statementImported:false, lastReconciled:null, waitingOn:null, overdue:false }));
  const rows = [...items].sort((a,b)=> (recoRowState(a).rank - recoRowState(b).rank) || String(a.name||'').localeCompare(String(b.name||'')));
  const tiers = (sData && sData.tiers) || {};
  const overdueCount = items.filter(it=>it.overdue).length;
  const weekLabel = qData && qData.period ? recoWeekShort(qData.period) : '';
  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:19,fontWeight:800,color:"#0d1326"}}>Reconciliation Queue</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Bank / OD ledgers to reconcile against imported statements — live status from the weekly certificate ladder, so everyone can see what's pending{weekLabel?` (this week ${weekLabel})`:''}.</p>

      {/* Pending strip — how far each tier's close has progressed, plus overdue count. */}
      <div style={{display:"flex",flexWrap:"wrap",gap:8,margin:"0 0 12px"}}>
        {RECO_QUEUE_TIERS.map(t=>{
          const g=tiers[t.key]||{}; const total=g.total||0, done=g.done||0, pct=total?Math.round(done/total*100):0;
          return(
            <div key={t.key} style={{...card,padding:"8px 12px",minWidth:150,flex:"1 1 150px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:".4px"}}>
                <span>{t.label}</span><span style={{color:"#0d1326"}}>{done}/{total}</span>
              </div>
              <div style={{height:5,borderRadius:3,background:"#eef0f5",marginTop:6,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:total&&done>=total?"#27500A":"#d4a437"}}/>
              </div>
            </div>
          );
        })}
        <div style={{...card,padding:"8px 12px",minWidth:150,flex:"1 1 150px",display:"flex",flexDirection:"column",justifyContent:"center",
          background:overdueCount?"#FCEBEB":"#EAF3DE",borderColor:overdueCount?"#f0c9c9":"#cfe3bb"}}>
          <div style={{fontSize:18,fontWeight:800,color:overdueCount?"#A32D2D":"#27500A",lineHeight:1}}>{overdueCount?`⚠ ${overdueCount}`:"✓ 0"}</div>
          <div style={{fontSize:10.5,color:overdueCount?"#A32D2D":"#27500A",fontWeight:700,marginTop:3}}>{overdueCount?"overdue this week":"none overdue"}</div>
        </div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={qTh("left")}>Bank Ledger</th>
              <th style={qTh("left")}>Group</th>
              <th style={qTh("left")}>Last reconciled</th>
              <th style={qTh("center")}>Statement</th>
              <th style={qTh("right")}>Difference</th>
              <th style={qTh("left")}>Status</th>
              <th style={qTh("left")}>Waiting on</th>
              <th style={qTh("center")}>Action</th>
            </tr></thead>
            <tbody>
              {rows.map((it,i)=>{
                const st=recoRowState(it);
                return(
                  <tr key={it.code||it.name||i} style={{background:i%2?"#f3f4f8":"#fff",borderBottom:"1px solid #cdd1d8"}}>
                    <td style={{padding:"8px 10px",fontWeight:600}}>{it.name}</td>
                    <td style={{padding:"8px 10px",color:"#5a6691"}}>{it.group||"Bank Accounts"}</td>
                    <td style={{padding:"8px 10px",fontFamily:"monospace",color:it.lastReconciled?"#0d1326":"#9aa3bd"}}>{it.lastReconciled?recoWeekShort(it.lastReconciled.period):"never"}</td>
                    <td style={{padding:"8px 10px",textAlign:"center",fontSize:11,fontWeight:700,color:it.statementImported?"#27500A":"#9aa3bd"}}>{it.statementImported?"✓ Imported":"✗ Missing"}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",color:it.difference==null?"#9aa3bd":Math.abs(it.difference)<1?"#27500A":"#A32D2D"}}>{it.difference==null?"—":fmtINR(it.difference)}</td>
                    <td style={{padding:"8px 10px"}}><span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11,fontWeight:700,color:st.c,background:st.bg,padding:"3px 9px",borderRadius:20,whiteSpace:"nowrap"}}><span style={{width:7,height:7,borderRadius:"50%",background:st.dot}}/>{st.label}</span></td>
                    <td style={{padding:"8px 10px",color:it.waitingOn?"#0d1326":"#9aa3bd",fontWeight:it.waitingOn?600:400}}>{it.waitingOn||"—"}</td>
                    <td style={{padding:"8px 10px",textAlign:"center"}}><button title="Open the weekly certificate register to reconcile & sign" onClick={()=>setRoute&&setRoute('/reconciliation/weekly')} style={{...btnGh,minHeight:28,fontSize:11}}>Reconcile</button></td>
                  </tr>
                );
              })}
              {rows.length===0&&<tr><td colSpan={8} style={{padding:20,textAlign:"center",color:"#5a6691"}}>{qLoading?"Loading…":"No bank ledgers yet - create a Bank ledger to reconcile."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend — one colour language across the queue, the bell and the cockpit tile. */}
      <div style={{display:"flex",flexWrap:"wrap",gap:14,margin:"10px 2px 0",fontSize:10.5,color:"#5a6691"}}>
        {[["#A32D2D","Overdue — past Friday"],["#9aa3bd","Pending / not started"],["#d4a437","In progress"],["#185FA5","Ready to sign"],["#27500A","Reconciled"]].map(([c,l])=>(
          <span key={l} style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:"50%",background:c}}/>{l}</span>
        ))}
      </div>
    </div>
  );
}

export function InvestmentDeclaration(){
  const [vals,setVals]=useState(Object.fromEntries(INVESTMENT_SECTIONS.map(s=>[s.section,s.declared])));
  const totalDeclared=Object.values(vals).reduce((s,v)=>s+v,0);
  const estimatedTax=Math.max(0,Math.round((totalDeclared>500000?(totalDeclared-500000)*0.2:0)-totalDeclared*0.05));
  const inp={padding:"7px 8px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,textAlign:"right",fontFamily:"monospace",width:120};
  return(
    <PHASE2_Page title="Investment Declaration — FY 2026-27" subtitle="Declare your tax-saving investments · used for TDS calculation">
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
        <div style={cardStyle}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Declare Investments (FY 2026-27)</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Section & Description</th><th style={{...RPT_thStyle,textAlign:"right"}}>Max Limit</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount Declared</th><th style={RPT_thStyle}>Proof Required</th></tr></thead>
            <tbody>{INVESTMENT_SECTIONS.map(s=>(
              <tr key={s.section} style={{borderBottom:"1px solid #dfe2e7"}}>
                <td style={{...RPT_tdStyle,fontWeight:600}}>{s.label}</td>
                <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:"#5a6691"}}>{s.limit>0?fmtINR(s.limit):"No limit"}</td>
                <td style={{padding:"6px 12px",borderBottom:"1px solid #dfe2e7",textAlign:"right"}}>
                  <input type="number" value={vals[s.section]||""} onChange={e=>setVals(v=>({...v,[s.section]:+e.target.value}))} style={{...inp,borderColor:s.limit>0&&(vals[s.section]||0)>s.limit?"#A32D2D":"#e1e3ec"}}/>
                  {s.limit>0&&(vals[s.section]||0)>s.limit&&<p style={{margin:"2px 0 0",fontSize:9.5,color:"#A32D2D"}}>Exceeds limit</p>}
                </td>
                <td style={{...RPT_tdStyle,fontSize:10.5,color:"#5a6691"}}>{s.proof}</td>
              </tr>
            ))}</tbody>
          </table>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14}}>
            <button style={{padding:"8px 16px",background:"#fff",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>Save Draft</button>
            <button style={{padding:"8px 18px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>Submit Declaration</button>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{padding:16,background:"#0d1326",borderRadius:8,color:"#fff"}}>
            <p style={{margin:"0 0 10px",fontSize:11,color:"#d4a437",fontWeight:700,textTransform:"uppercase"}}>Tax Summary (estimate)</p>
            {[{l:"Gross Salary",v:"₹5,76,000"},{l:"Total Deductions",v:fmtINR(totalDeclared)},{l:"Taxable Income",v:fmtINR(Math.max(0,576000-totalDeclared))}].map(r=>(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #ffffff15",fontSize:12}}>
                <span style={{color:"#5a6691"}}>{r.l}</span><span style={{fontWeight:700,fontFamily:"monospace"}}>{r.v}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,fontSize:14,fontWeight:700}}>
              <span style={{color:"#d4a437"}}>Tax Saved</span>
              <span style={{color:"#22c55e",fontFamily:"monospace"}}>{fmtINR(Math.round(totalDeclared*0.2))}</span>
            </div>
          </div>
          <div style={{padding:12,background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,fontSize:11,color:"#5a6691"}}>
            <p style={{margin:"0 0 6px",fontWeight:700,color:"#0d1326",fontSize:12}}>⚠ Important</p>
            <p style={{margin:0}}>• Submit actual proof documents by 31-Jan-2027<br/>• Declarations must be submitted by 15-Apr-2026<br/>• False declarations attract tax + penalty<br/>• Consult your CA for complex scenarios</p>
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   6. FORM 16 GENERATOR
   ════════════════════════════════════════════════════════════════════ */
