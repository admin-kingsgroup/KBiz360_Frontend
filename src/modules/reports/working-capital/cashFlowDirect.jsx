/* ════════════════════════════════════════════════════════════════════
   CASH FLOW STATEMENT — DIRECT METHOD (sample figures — not yet wired to
   live books)
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of finance/legacy.jsx —
   not menu-linked, but thematically grouped with CashFlowForecast /
   WorkingCapitalDashboard under MENU_REPORTS ▸ Working Capital.
   finance/index.js re-exports CashFlowDirect from here so App.jsx's barrel
   import needed zero changes.
   ════════════════════════════════════════════════════════════════════ */

import { useMobile } from '../../../core/hooks';
import { bc } from '../../../core/styles';
import { fmt } from '../../../core/format';

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
