/* ════════════════════════════════════════════════════════════════════
   PRINT PREVIEW BEFORE SAVING
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of transactions/legacy.jsx
   into its business sub-module folder — MENU_FINANCE ▸ Tools & Calculators
   ▸ "Print Preview Before Saving" (href /finance/print-preview).
   transactions/index.js re-exports PrintPreview (+ amountInWordsINR,
   used only by this screen) from here so App.jsx's barrel import needed
   zero changes.

   LIVE (2026-07-10): formal print layout of a REAL voucher, loaded by number
   from /api/vouchers?vno=… . The old inert "Save & Post" is gone — posting
   happens in Voucher Approvals; this screen renders and prints.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { inpStd, btnG } from '../../../core/styles';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';
import { openPrintPreview } from '../../../core/PrintPreview';

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
export function PrintPreview(){
  const [vnoInput,setVnoInput]=useState("");
  const [live,setLive]=useState(null);
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const load=async()=>{
    const vno=vnoInput.trim(); if(!vno)return;
    setBusy(true); setErr(""); setLive(null);
    try{
      const { apiGet } = await import('../../../core/api');
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
