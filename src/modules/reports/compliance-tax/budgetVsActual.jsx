import { useState } from 'react';
import { Download } from 'lucide-react';
import { useMobile } from '../../../core/hooks';
import { SampleBanner } from '../../../core/ux/SampleBanner';
import { CONSOLIDATED_LABEL } from '../../../core/data';
import { inp, btnGh, card } from '../../../core/styleTokens';

export function BudgetPlanning({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:branch?.code;
  const [fy,setFy]=useState("FY 2026-27");
  const BUDGET_HEADS=[
    {cat:"Income",gl:"Revenue — All Modules",budget:120000000,actual:23180000,var:0},
    {cat:"Income",gl:"Commission Income",budget:8000000,actual:1480000,var:0},
    {cat:"Direct Cost",gl:"Airline & Hotel Purchase",budget:95000000,actual:18200000,var:0},
    {cat:"Expenses",gl:"Salaries & Wages",budget:12000000,actual:2080000,var:0},
    {cat:"Expenses",gl:"Office Rent",budget:1440000,actual:240000,var:0},
    {cat:"Expenses",gl:"GDS Charges",budget:540000,actual:90000,var:0},
    {cat:"Expenses",gl:"Advertising",budget:600000,actual:64000,var:0},
    {cat:"Expenses",gl:"Software Subscriptions",budget:336000,actual:56000,var:0},
    {cat:"Expenses",gl:"Other Expenses",budget:800000,actual:138000,var:0},
  ];
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const MONTHS=2; // Apr + May done
  const pct=n=>MONTHS>0?+(n/MONTHS/12*100).toFixed(1):0;

  return(
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <SampleBanner note="budget figures and actuals are sample data, not live." />
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📊</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Budget vs Actual</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{fy} · {MONTHS}/12 months elapsed · {brCode||CONSOLIDATED_LABEL}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <select value={fy} onChange={e=>setFy(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}><option>FY 2026-27</option><option>FY 2025-26</option></select>
          <button style={{...btnGh,fontSize:11}}><Download size={12}/> Export</button>
        </div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Category","GL Account","Annual Budget","YTD Actual","YTD Expected","Variance","Utilisation"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=2?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{BUDGET_HEADS.map((r,i)=>{
            const expected=Math.round(r.budget*MONTHS/12);
            const variance=r.actual-expected;
            const utilPct=r.budget>0?Math.round(r.actual/r.budget*100):0;
            const expectedPct=Math.round(MONTHS/12*100);
            const good=(r.cat==="Income"&&variance>=0)||(r.cat!=="Income"&&variance<=0);
            return(
              <tr key={i} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:r.cat==="Income"?"#E6F1FB":r.cat==="Direct Cost"?"#FCEBEB":"#f3f4f8",color:r.cat==="Income"?"#185FA5":r.cat==="Direct Cost"?"#A32D2D":"#384677"}}>{r.cat}</span></td>
                <td style={{padding:"8px 12px",fontWeight:500,color:"#0d1326"}}>{r.gl}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(r.budget)}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{f(r.actual)}</td>
                <td style={{padding:"8px 12px",textAlign:"right",color:"#5a6691",fontVariantNumeric:"tabular-nums"}}>{f(expected)}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:good?"#27500A":"#A32D2D"}}>{variance>=0?"+":""}{f(variance)}</td>
                <td style={{padding:"8px 12px",textAlign:"right"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
                    <div style={{width:50,height:6,borderRadius:3,background:"#e1e3ec",overflow:"hidden"}}>
                      <div style={{width:`${Math.min(utilPct,100)}%`,height:"100%",background:good?"#27500A":"#A32D2D",borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:10.5,fontWeight:700,color:good?"#27500A":"#A32D2D"}}>{utilPct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}
