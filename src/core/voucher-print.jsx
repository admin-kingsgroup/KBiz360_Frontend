/* ════════════════════════════════════════════════════════════════════
   CORE/VOUCHER-PRINT.JS
   Auto-generated from KBiz360_v2.jsx · 117 lines · 1 declarations
   ════════════════════════════════════════════════════════════════════ */

import { Save } from 'lucide-react';
import { bc } from './styles';
import { companyProfile } from './referenceCache';

export function openPrintWindow(branch,vNo,title,el){
  const cfg=bc(branch);
  const isIndia=cfg.taxType==="GST";

  // Company letterhead pulled from the live company-profile master (DB-backed).
  const prof=companyProfile(branch?.code||"BOM")||{};
  const taxId=prof.gstin?`${cfg.taxType||"GSTIN"}: ${prof.gstin}`:"";
  const addr=[prof.operAddr, [taxId, prof.phone?`Phone: ${prof.phone}`:""].filter(Boolean).join(" | ")].filter(Boolean).join("<br/>");
  const companyName=(prof.entity||"Travkings Tours & Travels");
  const bodyHTML=el?el.innerHTML:"<p style='color:#999'>Voucher content not available for preview.</p>";
  const safeName=(vNo||"voucher").replace(/\//g,"-");

  const html=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${title} · ${vNo}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#222;background:#fff}
  @media screen{body{padding:12mm;max-width:210mm;margin:0 auto;box-shadow:0 0 20px rgba(0,0,0,0.12)}}
  @media print{body{padding:8mm;max-width:none;box-shadow:none}}
  .top-bar{background:#0d1326;color:#d4a437;padding:10px 16px;display:flex;
    justify-content:space-between;align-items:center;font-weight:700;font-size:11pt}
  .top-bar span{color:#fff;font-size:9pt;font-weight:400}
  .letterhead{display:flex;justify-content:space-between;align-items:flex-start;
    padding:14px 16px 10px;border-bottom:2px solid #0d1326}
  .company{font-size:20pt;font-weight:900;color:#0d1326;letter-spacing:-0.5px}
  .company-sub{font-size:9pt;color:#5a6691;margin-top:3px}
  .addr{font-size:8.5pt;color:#5a6691;line-height:1.6;text-align:right}
  .voucher-meta{display:flex;justify-content:space-between;align-items:center;
    padding:9px 16px;background:#f3f4f8;border-bottom:1px solid #e1e3ec}
  .voucher-title{font-size:13pt;font-weight:700;color:#0d1326}
  .voucher-no{font-family:Courier New,monospace;font-size:11pt;font-weight:700;
    color:#185FA5;background:#E6F1FB;padding:3px 10px;border-radius:5px}
  .content{padding:12px 16px}
  /* Hide interactive elements in print */
  button,select,input[type=button],input[type=submit]{display:none!important}
  input,textarea,select{border:none!important;background:transparent!important;
    outline:none!important;font-size:inherit!important}
  .footer{margin-top:20px;padding:12px 16px;border-top:2px solid #0d1326;
    display:flex;justify-content:space-between;align-items:flex-end;font-size:8.5pt;color:#5a6691}
  .sig-box{border-top:1px solid #0d1326;padding-top:6px;min-width:120px;text-align:center;font-size:8pt}
  .tax-note{margin-top:10px;padding:8px 12px;background:#f9fafb;border:1px solid #e1e3ec;
    font-size:8pt;color:#5a6691;border-radius:4px}
  .no-print{text-align:center;padding:16px;background:#f3f4f8;border-radius:8px;
    margin-bottom:16px;font-size:10pt}
  @media print{.no-print{display:none}}
</style>
</head>
<body>
<div class="no-print">
  <strong>KBiz360 Voucher Preview</strong> &nbsp;·&nbsp;
  Press <kbd>Ctrl+P</kbd> (or <kbd>Cmd+P</kbd> on Mac) → choose <strong>Save as PDF</strong>
</div>

<div class="top-bar">
  <span style="color:#d4a437;font-size:12pt">TRAVKINGS &nbsp;·&nbsp; KBiz360 Smart Travel ERP — The Business Engine</span>
  <span>Printed: ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</span>
</div>

<div class="letterhead">
  <div>
    <div class="company">${companyName}</div>
    <div class="company-sub">${cfg.curCode} &nbsp;·&nbsp; ${isIndia?"GST Regime":"VAT Regime"}</div>
  </div>
  <div class="addr">${addr}</div>
</div>

<div class="voucher-meta">
  <div class="voucher-title">${title}</div>
  <div class="voucher-no">${vNo}</div>
</div>

<div class="content">${bodyHTML}</div>

<div class="tax-note">
  ${isIndia
    ?"Subject to GST as applicable. E.&amp;O.E. This is a computer-generated document."
    :"Subject to VAT as applicable. E.&amp;O.E. This is a computer-generated document."}
  &nbsp; Payment terms: 7 days net. Jurisdiction: ${branch?.city||"Mumbai"}.
</div>

<div class="footer">
  <div>
    <div>${cfg.curCode} · ${isIndia?"GST":"VAT"} · KBiz360 v1.0</div>
    <div style="margin-top:2px;font-size:7.5pt">Confidential — Travkings Tours &amp; Travels</div>
  </div>
  <div style="text-align:right">
    <div class="sig-box">Authorised Signatory</div>
    <div style="margin-top:4px">${(branch?.code||"BOM")} Branch</div>
  </div>
</div>
</body>
</html>`;

  /* ── Trigger HTML file download ── */
  try{
    const blob=new Blob([html],{type:"text/html;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`${safeName}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  }catch(err){
    /* Fallback: show in preview modal if download blocked */
    if(_printModalSetter)_printModalSetter({html:html,vNo:vNo,title:title});
  }
}

/* ── Shared style objects ── */
