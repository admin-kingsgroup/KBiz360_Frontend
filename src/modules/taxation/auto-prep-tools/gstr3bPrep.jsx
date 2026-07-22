/* BUSINESS SUB-MODULE REORG (2026-07-14): moved out of taxation/legacy.jsx into
   its business sub-module folder — Taxation Auto-Prep Tools group
   (href /tax/gstr-3b-prep). taxation/index.js re-exports GSTR3BPrep from here
   so App.jsx's barrel import needed zero changes. */

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
import { companyProfile } from '../../../core/referenceCache';
import { SampleBanner } from '../../../core/ux/SampleBanner';

// BUSINESS SUB-MODULE REORG (2026-07-14): left behind in taxation/legacy.jsx
// during the move — GSTR3BPrep is its only consumer, so it belongs here, not
// there. Fixed after the move exposed a runtime ReferenceError
// (GSTR3B_SUMMARY was undefined).
export const GSTR3B_SUMMARY = {
  period:"April 2026",
  outwardSupplies:{taxable:12500000,exempt:450000,nilRated:0,nonGST:0,igst:1845000,cgst:972000,sgst:972000,cess:0},
  inwardRCM:{taxable:85000,igst:15300,cgst:0,sgst:0},
  itcAvailable:{igst:1240000,cgst:485000,sgst:485000,total:2210000},
  itcReversed:{igst:0,cgst:45000,sgst:45000,total:90000},
  netITC:2120000,
  taxPayable:{igst:605300,cgst:487000,sgst:487000,cess:0,total:1579300},
  taxFromITC:{igst:605300,cgst:487000,sgst:487000,total:1579300},
  cashPayable:0,
  interestPenalty:0,
};

export function GSTR3BPrep({branch}){
  // Filing entity/GSTIN from the ACTIVE branch's company profile (was a hardcoded
  // "27AAACT1234A1ZF (Head Office)" placeholder — BOM's GSTIN on every branch).
  const brCode=branch&&branch!=="ALL"?(branch.code||branch):null;
  const gstin=(companyProfile(brCode)||{}).gstin||"";
  const entityLabel=brCode?`${brCode}${gstin?` · ${gstin}`:" · (GSTIN not set in Company Profile)"}`:"All branches";
  const d=GSTR3B_SUMMARY;
  const Section=({no,title,rows,highlight})=>(
    <div style={{...cardStyle,marginBottom:12}}>
      <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#fff",background:"#0d1326",padding:"6px 10px",borderRadius:4}}>Table {no} — {title}</p>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
        {rows.map((row,i)=>(
          <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:row.bold?"#fafbfd":"#fff"}}>
            <td style={{...RPT_tdStyle,fontWeight:row.bold?700:400,paddingLeft:row.sub?24:12}}>{row.label}</td>
            <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:highlight==="gst"?"#3b82f6":"#0d1326",fontWeight:row.bold?700:500}}>{row.igst!==undefined?fmtINR(row.igst):"—"}</td>
            <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:highlight==="gst"?"#22c55e":"#0d1326",fontWeight:row.bold?700:500}}>{row.cgst!==undefined?fmtINR(row.cgst):"—"}</td>
            <td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:highlight==="gst"?"#22c55e":"#0d1326",fontWeight:row.bold?700:500}}>{row.sgst!==undefined?fmtINR(row.sgst):"—"}</td>
            {row.total!==undefined&&<td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,fontFamily:"monospace"}}>{fmtINR(row.total)}</td>}
          </tr>
        ))}
      </table>
    </div>
  );
  return(
    <PHASE2_Page title="GSTR-3B Auto-Prep" subtitle={`Summary return auto-built from vouchers · ${entityLabel}`}
      toolbar={<><button style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>📥 Download JSON</button><button style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>📤 File on GST Portal</button></>}>
      <SampleBanner note="this GSTR-3B summary is sample data, not a live return." />
      {/* Liability summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Outward Tax",v:fmtINR(d.outwardSupplies.igst+d.outwardSupplies.cgst+d.outwardSupplies.sgst),c:"#A32D2D"},{l:"ITC Available",v:fmtINR(d.itcAvailable.total),c:"#22c55e"},{l:"Net ITC Applied",v:fmtINR(d.netITC),c:"#d4a437"},{l:"Cash Payment",v:fmtINR(d.cashPayable),c:"#22c55e"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"4px 0 0",fontSize:18,fontWeight:700,color:"#0d1326"}}>{k.v}</p></div>
        ))}
      </div>
      <Section no="3.1" title="Details of outward supplies" highlight="gst" rows={[
        {label:"Taxable supplies (other than zero rated)",igst:d.outwardSupplies.igst,cgst:d.outwardSupplies.cgst,sgst:d.outwardSupplies.sgst,total:d.outwardSupplies.igst+d.outwardSupplies.cgst+d.outwardSupplies.sgst},
        {label:"Exempt / nil rated / non-GST supplies",igst:0,cgst:0,sgst:0,total:d.outwardSupplies.exempt,sub:true},
      ]}/>
      <Section no="4" title="Eligible ITC" highlight="itc" rows={[
        {label:"ITC Available — IGST",igst:d.itcAvailable.igst,cgst:0,sgst:0,bold:false},
        {label:"ITC Available — CGST/SGST",igst:0,cgst:d.itcAvailable.cgst,sgst:d.itcAvailable.sgst},
        {label:"ITC Reversed",igst:0,cgst:d.itcReversed.cgst,sgst:d.itcReversed.sgst},
        {label:"Net ITC Available",igst:d.itcAvailable.igst,cgst:d.itcAvailable.cgst-d.itcReversed.cgst,sgst:d.itcAvailable.sgst-d.itcReversed.sgst,total:d.netITC,bold:true},
      ]}/>
      <Section no="6" title="Payment of tax" rows={[
        {label:"Tax payable",igst:d.taxPayable.igst,cgst:d.taxPayable.cgst,sgst:d.taxPayable.sgst,total:d.taxPayable.total,bold:true},
        {label:"Paid through ITC",igst:d.taxFromITC.igst,cgst:d.taxFromITC.cgst,sgst:d.taxFromITC.sgst,total:d.taxFromITC.total},
        {label:"Paid through Cash",igst:0,cgst:0,sgst:0,total:0,bold:true},
      ]}/>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   12. TDS CERTIFICATE FORM 16A GENERATOR
   ════════════════════════════════════════════════════════════════════ */

/* Form 16A — TDS certificates per deductee, LIVE from the TDS Payable chart
   ledgers: each Cr accrual (TDS withheld on a purchase/payment voucher) is a
   deduction entry, grouped per vendor for the selected FY quarter. Download
   renders the printable certificate (openPrintPreview) with the live figures.
   PAN/TAN/challan details are not tracked in the system — the certificate
   shows explicit fill-in blanks for them (no invented identifiers). */
