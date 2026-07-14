/* ════════════════════════════════════════════════════════════════════
   TDS AUTO-CALCULATOR
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of finance/legacy.jsx —
   this is a Taxation screen (href /finance/tds-calculator, listed under the
   regime-aware Taxation menus in core/data.js), not a Finance-menu item.
   finance/index.js re-exports TDSCalculator from here so App.jsx's barrel
   import needed zero changes.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { cardStyle } from '../../core/helpers';
import { RPT_thStyle, RPT_tdStyle } from '../../core/styles';
import { fmtINR } from '../../core/format';
import { PHASE2_Page } from '../../shell/PHASE2_Page';

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
