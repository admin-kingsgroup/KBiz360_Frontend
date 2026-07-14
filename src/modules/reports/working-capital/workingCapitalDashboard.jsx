/* ════════════════════════════════════════════════════════════════════
   WORKING CAPITAL DASHBOARD (sample figures — not yet wired to live books)
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of finance/legacy.jsx —
   MENU_REPORTS ▸ Working Capital (href /reports/working-capital), not a
   Finance-menu item. finance/index.js re-exports WorkingCapitalDashboard
   from here so App.jsx's barrel import needed zero changes.
   ════════════════════════════════════════════════════════════════════ */

import { useMobile } from '../../../core/hooks';
import { bc } from '../../../core/styles';
import { fmt } from '../../../core/format';

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
