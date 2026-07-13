import { useState, useMemo } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { Menu as DropdownMenu } from '../../../core/ux/Menu';
import { useGpBills } from '../../../core/useAccounting';
import { bc, inp, btnGh, card } from '../../../core/styleTokens';
import { PERIOD_OPTIONS as MONTH_PERIOD_OPTIONS, FY_YTD_MONTHS } from '../../../core/dates';
import { exportToCSV } from '../../../core/business-logic';
import { useMobile } from '../../../core/hooks';

export function PackagePnL({branch}){
  const mob=useMobile();
  const [period,setPeriod]=useState("YTD");
  const PERIODS=MONTH_PERIOD_OPTIONS;
  const FY_MONTHS=FY_YTD_MONTHS;
  // LIVE: per-booking GP list (GET /api/accounting/gp-bills, branch-scoped server-side),
  // filtered to Holiday/MICE packages. Previously read the empty GP_BILLS seed (always blank).
  const gpQ=useGpBills(branch);
  const bills=useMemo(()=>(gpQ.data||[]).filter(b=>(b.mod==="Holiday"||b.mod==="MICE")&&(period==="YTD"?FY_MONTHS.includes(String(b.date||"").slice(0,7)):String(b.date||"").startsWith(period))),[gpQ.data,period]);

  // Group by tour code (falls back to a destination-derived code when the booking
  // carries no explicit tour code).
  const pkgMap={};
  bills.forEach(b=>{
    const tourCode=b.tourCode||`TC-${b.dest?.slice(0,3).toUpperCase()||"OTH"}`;
    if(!pkgMap[tourCode])pkgMap[tourCode]={code:tourCode,dest:b.dest||"Various",rev:0,cost:0,bks:0,pax:0};
    pkgMap[tourCode].rev+=(b.sell||0);pkgMap[tourCode].cost+=(b.cost||0);pkgMap[tourCode].bks++;pkgMap[tourCode].pax+=b.pax||2;
  });
  const rows=Object.values(pkgMap).map(p=>({...p,gp:p.rev-p.cost,gpPct:p.rev>0?+(( p.rev-p.cost)/p.rev*100).toFixed(1):0,gpPerPax:p.pax>0?Math.round((p.rev-p.cost)/p.pax):0})).sort((a,b)=>b.gp-a.gp);
  const cur=(bc(branch)||{}).cur||"₹";
  const f=n=>cur+Number(Math.round(n||0)).toLocaleString((cur==="₹"||cur==="₨"||cur==="Rs")?"en-IN":"en-US");

  return(
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📦</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Package P&L by Tour Code</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{rows.length} tour codes · {bills.length} holiday bookings · GP per package</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <DropdownMenu
            ariaLabel="Period"
            menuRole="listbox"
            items={PERIODS.map(p=>({key:p.v,label:p.l,selected:period===p.v,onSelect:()=>setPeriod(p.v)}))}
            renderTrigger={({ref,toggle,triggerProps})=>(
              <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                style={{...inp,width:"auto",minHeight:32,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                {PERIODS.find(p=>p.v===period)?.l||period}
                <ChevronDown size={13} style={{color:"#5b616e",flexShrink:0}}/>
              </button>
            )}
          />
          <button onClick={()=>exportToCSV(rows,["code","dest","bks","pax","rev","cost","gp","gpPct"],"package-pnl.csv")} style={{...btnGh,fontSize:11}}><Download size={12}/> CSV</button>
        </div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Tour Code","Destination","Bookings","Pax","Revenue","Cost","Gross Profit","GP%","GP/Pax","Rating"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=2?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{rows.map((r,i)=>(
            <tr key={r.code} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px",fontFamily:"monospace",fontWeight:700,color:"#185FA5"}}>{r.code}</td>
              <td style={{padding:"8px 12px",fontWeight:500,color:"#0d1326"}}>{r.dest}</td>
              <td style={{padding:"8px 12px",textAlign:"right"}}>{r.bks}</td>
              <td style={{padding:"8px 12px",textAlign:"right"}}>{r.pax}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(r.rev)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{f(r.cost)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#27500A",fontVariantNumeric:"tabular-nums"}}>{f(r.gp)}</td>
              <td style={{padding:"8px 12px",textAlign:"right"}}><span style={{fontSize:10.5,padding:"2px 7px",borderRadius:999,fontWeight:800,background:r.gpPct>=15?"#EAF3DE":r.gpPct>=8?"#FAEEDA":"#FCEBEB",color:r.gpPct>=15?"#27500A":r.gpPct>=8?"#854F0B":"#A32D2D"}}>{r.gpPct}%</span></td>
              <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#384677"}}>{f(r.gpPerPax)}</td>
              <td style={{padding:"8px 12px",textAlign:"right"}}>{r.gpPct>=15?"⭐⭐⭐":r.gpPct>=10?"⭐⭐":"⭐"}</td>
            </tr>
          ))}
          {rows.length===0&&<tr><td colSpan={10} style={{padding:"24px",textAlign:"center",color:"#5a6691"}}>{gpQ.isLoading?"Loading holiday bookings…":"No holiday bookings for this period"}</td></tr>}
          </tbody>
          {rows.length>0&&<tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={4} style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(rows.reduce((s,r)=>s+r.rev,0))}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(rows.reduce((s,r)=>s+r.cost,0))}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(rows.reduce((s,r)=>s+r.gp,0))}</td>
            <td colSpan={3}/>
          </tr></tfoot>}
        </table>
      </div>
    </div>
  );
}
