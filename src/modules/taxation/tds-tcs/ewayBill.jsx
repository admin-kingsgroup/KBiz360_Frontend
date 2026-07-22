/* BUSINESS SUB-MODULE REORG (2026-07-14): moved out of taxation/legacy.jsx into
   its business sub-module folder — Taxation TDS/TCS group (href /tax/eway).
   taxation/index.js re-exports EWayBill from here so App.jsx's barrel import
   needed zero changes. GSP_NOTE is duplicated here (also used by
   compliance/taxEInvoice.jsx) — a one-line string const, not worth a shared
   module for.
   */

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
import { SampleBanner } from '../../../core/ux/SampleBanner';

const GSP_NOTE = 'Awaiting GSP/IRP provider credentials — configure under Settings ▸ GSP-IRP';

export function EWayBill({branch}){
  const brCode=branch==="ALL"?null:(branch?.code||null);   // null = consolidated (all branches)
  const [period,setPeriod]=useState(CUR_MONTH);
  const EWB_THRESHOLD=50000; // e-way bill required for goods movement ≥ ₹50,000
  const GP=useGpBills(branch).data||[];   // live booking bills (/api/accounting/gp-bills)
  // Candidates: posted sale invoices ≥ ₹50,000 for the period. Most of the book is
  // services (no e-way bill needed) — this register flags the invoices that COULD
  // need one (MICE materials / tour kits / merchandise) so nothing slips by value.
  const candidates=saleBills(GP,brCode,{from:`${period}-01`,to:`${period}-31`}).filter(b=>(+b.sell||0)>=EWB_THRESHOLD);
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");

  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📦</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>E-Way Bill Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{brCode||"All branches"} · {monthLabel(period)} · invoices ≥ ₹50,000 from the live books · ewaybillgst.gov.in</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {MONTH_OPTIONS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <button disabled title={GSP_NOTE} aria-disabled="true" style={{...btnG,fontSize:11,opacity:0.5,cursor:"not-allowed"}}><Plus size={13}/> Generate E-Way Bill</button>
        </div>
      </div>

      <div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:10.5,color:"#854F0B",fontWeight:600}}>
        🔌 {GSP_NOTE}. Candidate invoices below are live from the books; EWB numbers fill in once the provider is connected.
      </div>
      <div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#E6F1FB",border:"1px solid #B5D4F4",fontSize:10.5,color:"#185FA5"}}>
        <b>When required:</b> Movement of goods valued ≥ ₹50,000 between states or within the same state. Applicable for MICE materials, tour kits, and promotional goods — NOT for pure service invoices. Validity: 200 km/day; expires at midnight.
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Invoice / file ref","Date","Party","Module","Invoice value","EWB No.","Status"].map((h,i)=>(
              <th key={i} style={{padding:"8px 10px",textAlign:i===4?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {candidates.length===0&&<tr><td colSpan={7} style={{padding:"24px",textAlign:"center",color:"#5a6691"}}>No sale invoices ≥ ₹50,000 for {monthLabel(period)} — nothing needs an e-way bill this period.</td></tr>}
            {candidates.map((b,i)=>(
              <tr key={b.id+i} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:9.5,color:"#185FA5"}}>{b.id}</td>
                <td style={{padding:"7px 10px",color:"#5a6691",whiteSpace:"nowrap"}}>{b.date}</td>
                <td style={{padding:"7px 10px",fontWeight:600,color:"#0d1326"}}>{b.client}</td>
                <td style={{padding:"7px 10px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{b.mod}</span></td>
                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(b.sell)}</td>
                <td style={{padding:"7px 10px",fontSize:10,color:"#8b94b3",whiteSpace:"nowrap"}}>— awaiting GSP provider</td>
                <td style={{padding:"7px 10px"}}><span title={GSP_NOTE} style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:"#f3f4f8",color:"#5a6691"}}>Not generated</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   FIXED ASSETS MODULE — Register, Depreciation, Disposal, Blocks
   ════════════════════════════════════════════════════════════════ */


/* GSTR-9C — LIVE books-vs-returns reconciliation.
   · Turnover per books  = Sales Accounts total from /api/accounting/profit-and-loss
   · Turnover per GSTR   = GST base of the posted sale invoices (/api/accounting/gp-bills,
                           the same source the GSTR-1 screen files from)
   · Tax per books       = /api/accounting/tax-summary (Output − ITC from the tax ledgers)
   Adjustments that live OUTSIDE the system (unbilled revenue, post-FY credit notes,
   audited-FS adjustments, figures actually filed) are explicit MANUAL rows that
   default 0 and persist per branch × FY via /api/app-config. */
