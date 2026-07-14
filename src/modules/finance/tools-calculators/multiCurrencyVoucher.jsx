/* ════════════════════════════════════════════════════════════════════
   MULTI-CURRENCY SINGLE VOUCHER
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of transactions/legacy.jsx
   into its business sub-module folder — MENU_FINANCE ▸ Tools & Calculators
   ▸ "Multi-Currency Voucher" (href /finance/multi-currency). transactions/
   index.js re-exports MultiCurrencyVoucher from here so App.jsx's barrel
   import needed zero changes.

   LIVE (2026-07-10): converts FCY→INR from the live forex-rates master and
   posts ONE balanced 4-line JV (Dr Customer / Cr Sales · Dr Cost / Cr
   Supplier) via /api/vouchers — pending until approved. Manual JVs to Sales
   ledgers are an audited, supported path (they land in the
   Sales-Reconciliation "Other / Manual" bucket).
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { toast } from '../../../core/ux/toast';
import { useCreateVoucher } from '../../../core/useAccounting';
import { useMasterList } from '../../../core/useMasters';
import { useLedgerRegistry } from '../../../core/useReference';
import { ACTIVE_CURRENCIES, BRANCH_CODES } from '../../../core/data';
import { LedgerSelect } from '../../../core/helpers';
import { fmtINR } from '../../../core/format';
import { todayISO } from '../../../core/dates';
import { RPT_thStyle, RPT_tdStyle } from '../../../core/styles';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';
import { openPrintPreview } from '../../../core/PrintPreview';

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
