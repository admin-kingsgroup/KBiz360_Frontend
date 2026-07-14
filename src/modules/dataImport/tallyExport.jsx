/* ════════════════════════════════════════════════════════════════════
   TALLY XML EXPORT
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of taxation/legacy.jsx —
   this is an Admin ▸ Import / Export Data ▸ Export screen (href
   /reports/tally-export, MENU_IMPORT_EXPORT in core/menus.js), not a
   Taxation screen — it was misfiled in the taxation monolith. taxation/
   index.js re-exports TallyExport from here so App.jsx's barrel import
   needed zero changes.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { Download } from 'lucide-react';
import { useGpBills } from '../../core/useAccounting';
import { CUR_MONTH, MONTH_OPTIONS } from '../../core/dates';
import { FL, bc, btnG, card, inp } from '../../core/styles';
import { SampleBanner } from '../../core/ux/SampleBanner';

export function TallyExport({branch}){
  const cfg=bc(branch);
  const brCode=branch==="ALL"?null:branch?.code;
  const [period,setPeriod]=useState(CUR_MONTH);
  const [exportType,setExportType]=useState("trial-balance");
  const PERIODS=MONTH_OPTIONS;
  const GP=useGpBills(branch).data||[];   // live booking bills (/api/accounting/gp-bills)

  const generateXML=()=>{
    const bills=GP.filter(b=>(!brCode||b.branch===brCode)&&(b.date||'').startsWith(period));
    const totRev=bills.reduce((s,b)=>s+b.sell,0);
    const totCost=bills.reduce((s,b)=>s+b.cost,0);

    const xml=`<?xml version="1.0" encoding="UTF-8"?>
<!-- KBiz360 Tally Export — ${exportType} — ${period} -->
<!-- Generated: ${new Date().toISOString()} -->
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${branch?.entity||"Travkings Tours &amp; Travels"}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <!-- Trial Balance Ledgers -->
          <GROUP NAME="Sales Revenue" RESERVEDNAME="">
            <PARENT>Primary</PARENT>
          </GROUP>
          <LEDGER NAME="Sales - Flight Tickets">
            <PARENT>Sales Revenue</PARENT>
            <OPENINGBALANCE>${bills.filter(b=>b.mod==="Flight").reduce((s,b)=>s+b.sell,0)}</OPENINGBALANCE>
          </LEDGER>
          <LEDGER NAME="Sales - Holiday Packages">
            <PARENT>Sales Revenue</PARENT>
            <OPENINGBALANCE>${bills.filter(b=>b.mod==="Holiday").reduce((s,b)=>s+b.sell,0)}</OPENINGBALANCE>
          </LEDGER>
          <LEDGER NAME="Cost of Sales">
            <PARENT>Direct Expenses</PARENT>
            <OPENINGBALANCE>${totCost}</OPENINGBALANCE>
          </LEDGER>
          <!-- GP: ${totRev - totCost} | Bookings: ${bills.length} -->
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    const blob=new Blob([xml],{type:"text/xml;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`KBiz360_Tally_Export_${exportType}_${period}_${brCode||"ALL"}.xml`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  };

  return (
    <div style={{padding:"12px 10px",maxWidth:800,margin:"0 auto"}}>
      <SampleBanner note="The generated Tally XML is a SUMMARY of sales/cost ledgers (derived from live GP bills) for the period — it does NOT yet emit full ledger masters, individual vouchers, or party balances. The export-type selector affects the label only; use the accounting reports for full detail until the complete Tally export is built." />
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📤</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Tally XML Export</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Export KBiz360 data as Tally-compatible XML for statutory accounting</p>
        </div>
      </div>

      <div style={{...card,marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <FL label="Export type"><select value={exportType} onChange={e=>setExportType(e.target.value)} style={inp}>
            <option value="trial-balance">Trial Balance</option>
            <option value="ledgers">Ledger Accounts</option>
            <option value="vouchers">All Vouchers</option>
            <option value="party-masters">Party Masters (Debtors/Creditors)</option>
          </select></FL>
          <FL label="Period"><select value={period} onChange={e=>setPeriod(e.target.value)} style={inp}>
            {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select></FL>
        </div>
        <div style={{padding:"12px 14px",borderRadius:9,background:"#f3f4f8",marginBottom:16}}>
          <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:"#0d1326"}}>What will be exported:</p>
          {exportType==="trial-balance"&&<p style={{margin:0,fontSize:11,color:"#5a6691"}}>All ledger closing balances for {period} in Tally XML format. Import into Tally: Gateway → Import → XML.</p>}
          {exportType==="ledgers"&&<p style={{margin:0,fontSize:11,color:"#5a6691"}}>Full ledger transaction list for {period}. Creates ledger masters + all Dr/Cr entries.</p>}
          {exportType==="vouchers"&&<p style={{margin:0,fontSize:11,color:"#5a6691"}}>All vouchers (sales, purchase, receipts, payments) for {period} as Tally voucher XML.</p>}
          {exportType==="party-masters"&&<p style={{margin:0,fontSize:11,color:"#5a6691"}}>All client and supplier masters with opening balances — for Tally party master creation.</p>}
        </div>
        <button onClick={generateXML} style={{...btnG,width:"100%",fontSize:12,padding:"11px"}}>⬇ Generate & Download Tally XML</button>
      </div>

      <div style={{...card,background:"#E6F1FB",border:"1px solid #B5D4F4",fontSize:10,color:"#185FA5"}}>
        <b>How to import in Tally:</b> Open Tally ERP 9 or Tally Prime → Gateway of Tally → Import → XML → Browse to downloaded file → Import. Ensure company name matches exactly. Recommended: import into a test company first to verify data before the live company.
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   PRIORITY 1 — FINANCE VOUCHERS (Complete Rebuild)
   Receipt · Payment · Journal · Contra
   With: ledger autocomplete · TDS auto-calc · Dr=Cr validation
   ════════════════════════════════════════════════════════════════ */

/* ── GLOBAL LEDGER REGISTRY (used by all finance vouchers) ──── */

