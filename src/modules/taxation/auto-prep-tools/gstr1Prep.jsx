/* BUSINESS SUB-MODULE REORG (2026-07-14): moved out of taxation/legacy.jsx into
   its business sub-module folder — Taxation Auto-Prep Tools group
   (href /tax/gstr-1-prep). taxation/index.js re-exports GSTR1Prep from here
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
import { SampleBanner } from '../../../core/ux/SampleBanner';

export function GSTR1Prep(){
  const [period,setPeriod]=useState(CUR_MONTH);
  const [entity,setEntity]=useState("Head Office — 27AAACT1234A1ZF");
  const [tab,setTab]=useState("b2b");
  const totalB2BTaxable=GSTR1_B2B.reduce((s,r)=>s+r.taxable,0);
  const totalB2BTax=GSTR1_B2B.reduce((s,r)=>s+r.igst+r.cgst+r.sgst,0);
  const totalB2CTaxable=GSTR1_B2C.reduce((s,r)=>s+r.taxable,0);
  return(
    <PHASE2_Page title="GSTR-1 Auto-Prep" subtitle="Outward supplies auto-aggregated from sales vouchers · ready for JSON download"
      toolbar={<><select value={period} onChange={e=>setPeriod(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}>{MONTH_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select><select value={entity} onChange={e=>setEntity(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}><option>Head Office — 27AAACT1234A1ZF</option><option>BOM — 27AAACT5678B1ZG</option><option>AMD — 24AAACT9012C1ZH</option></select><button style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>📥 Download JSON</button><button style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>📤 File on GST Portal</button></>}>
      {/* Summary tiles */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Total Invoices",v:GSTR1_B2B.reduce((s,r)=>s+r.invoices,0)+GSTR1_B2C.length,c:"#0d1326"},{l:"B2B Taxable",v:fmtINR(totalB2BTaxable),c:"#3b82f6"},{l:"B2C Taxable",v:fmtINR(totalB2CTaxable),c:"#22c55e"},{l:"Total Tax",v:fmtINR(totalB2BTax),c:"#d4a437"},{l:"GSTR-1 Status",v:"Draft",c:"#f97316"}].map(k=>(
          <div key={k.l} style={{...cardStyle,borderTop:"3px solid "+k.c}}><p style={{margin:0,fontSize:10,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>{k.l}</p><p style={{margin:"4px 0 0",fontSize:16,fontWeight:700,color:"#0d1326"}}>{k.v}</p></div>
        ))}
      </div>
      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"1px solid #cdd1d8",background:"#fff",border:"1px solid #cdd1d8",borderRadius:"8px 8px 0 0",overflow:"hidden",marginBottom:0}}>
        {[{k:"b2b",l:"B2B Supplies"},{k:"b2c",l:"B2C Supplies"},{k:"hsn",l:"HSN Summary"}].map(t=><button key={t.k} onClick={()=>setTab(t.k)} style={tabBtnStyle(tab===t.k)}>{t.l}</button>)}
      </div>
      <div style={{background:"#fff",border:"1px solid #cdd1d8",borderTop:"none",borderRadius:"0 0 8px 8px",overflow:"hidden"}}>
        {tab==="b2b"&&(
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>GSTIN</th><th style={RPT_thStyle}>Recipient</th><th style={{...RPT_thStyle,textAlign:"center"}}>Invoices</th><th style={{...RPT_thStyle,textAlign:"right"}}>Taxable</th><th style={{...RPT_thStyle,textAlign:"right"}}>IGST</th><th style={{...RPT_thStyle,textAlign:"right"}}>CGST</th><th style={{...RPT_thStyle,textAlign:"right"}}>SGST</th><th style={{...RPT_thStyle,textAlign:"right"}}>Total</th></tr></thead>
            <tbody>{GSTR1_B2B.map(r=>(<tr key={r.gstin} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5}}>{r.gstin}</td><td style={{...RPT_tdStyle,fontWeight:600}}>{r.name}</td><td style={{...RPT_tdStyle,textAlign:"center"}}>{r.invoices}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{fmtINR(r.taxable)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#3b82f6"}}>{r.igst>0?fmtINR(r.igst):"—"}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e"}}>{r.cgst>0?fmtINR(r.cgst):"—"}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e"}}>{r.sgst>0?fmtINR(r.sgst):"—"}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(r.total)}</td></tr>))}
            <tr style={{background:"#fafbfd",fontWeight:700,borderTop:"2px solid #0d1326"}}><td style={{...RPT_tdStyle,fontWeight:700}} colSpan={2}>TOTAL B2B</td><td style={{...RPT_tdStyle,textAlign:"center",fontWeight:700}}>{GSTR1_B2B.reduce((s,r)=>s+r.invoices,0)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(totalB2BTaxable)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(GSTR1_B2B.reduce((s,r)=>s+r.igst,0))}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(GSTR1_B2B.reduce((s,r)=>s+r.cgst,0))}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(GSTR1_B2B.reduce((s,r)=>s+r.sgst,0))}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(GSTR1_B2B.reduce((s,r)=>s+r.total,0))}</td></tr></tbody>
          </table>
        )}
        {tab==="b2c"&&(
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Place of Supply</th><th style={{...RPT_thStyle,textAlign:"right"}}>Taxable</th><th style={{...RPT_thStyle,textAlign:"right"}}>Rate</th><th style={{...RPT_thStyle,textAlign:"right"}}>IGST</th><th style={{...RPT_thStyle,textAlign:"right"}}>CGST</th><th style={{...RPT_thStyle,textAlign:"right"}}>SGST</th></tr></thead>
            <tbody>{GSTR1_B2C.map(r=>(<tr key={r.place} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{...RPT_tdStyle,fontWeight:600}}>{r.place}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{fmtINR(r.taxable)}</td><td style={{...RPT_tdStyle,textAlign:"center"}}>{r.rate}%</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#3b82f6"}}>{r.igst>0?fmtINR(r.igst):"—"}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e"}}>{r.cgst>0?fmtINR(r.cgst):"—"}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e"}}>{r.sgst>0?fmtINR(r.sgst):"—"}</td></tr>))}</tbody>
          </table>
        )}
        {tab==="hsn"&&(
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>HSN/SAC</th><th style={RPT_thStyle}>Description</th><th style={{...RPT_thStyle,textAlign:"right"}}>Qty</th><th style={{...RPT_thStyle,textAlign:"right"}}>Taxable</th><th style={{...RPT_thStyle,textAlign:"right"}}>IGST</th><th style={{...RPT_thStyle,textAlign:"right"}}>CGST</th><th style={{...RPT_thStyle,textAlign:"right"}}>SGST</th></tr></thead>
            <tbody>{[{hsn:"996411",desc:"Air transport services",qty:284,taxable:8500000,igst:540000,cgst:405000,sgst:405000},{hsn:"996312",desc:"Hotel accommodation",qty:98,taxable:3200000,igst:192000,cgst:144000,sgst:144000},{hsn:"996519",desc:"Tour operator services",qty:142,taxable:2400000,igst:90000,cgst:90000,sgst:90000},{hsn:"999799",desc:"Visa facilitation",qty:412,taxable:520000,igst:0,cgst:46800,sgst:46800}].map(r=>(<tr key={r.hsn} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:700}}>{r.hsn}</td><td style={RPT_tdStyle}>{r.desc}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{r.qty}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{fmtINR(r.taxable)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#3b82f6"}}>{fmtINR(r.igst)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e"}}>{fmtINR(r.cgst)}</td><td style={{...RPT_tdStyle,textAlign:"right",color:"#22c55e"}}>{fmtINR(r.sgst)}</td></tr>))}</tbody>
          </table>
        )}
      </div>
    </PHASE2_Page>
  );
}

/* ════════════════════════════════════════════════════════════════════
   11. GSTR-3B AUTO-PREP
   ════════════════════════════════════════════════════════════════════ */

