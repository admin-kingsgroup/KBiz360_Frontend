import { useState } from 'react';
import { ReportDateBar, resolveReportRange } from '../../../core/reportDateBar';
import { useCustomerLtv } from '../../../core/useAccounting';
import { cardStyle } from '../../../core/helpers';
import { currencySplit, curRegion } from '../../../core/format';
import { RPT_thStyle, RPT_tdStyle } from '../../../core/styleTokens';
import { RPT_Page, RptState } from '../../../core/reportPage';
import { cmoney, cmoneyOf, rrow, partyLink } from './analyticsShared';

/* 9. Customer LTV */

function LtvTable({ rows, m, setRoute }){
  return (
    <div style={{...cardStyle,overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
        <thead><tr><th style={RPT_thStyle}>Customer</th><th style={RPT_thStyle}>First Booking</th><th style={RPT_thStyle}>Last Booking</th><th style={{...RPT_thStyle,textAlign:"right"}}>Bookings</th><th style={{...RPT_thStyle,textAlign:"right"}}>LTV</th><th style={{...RPT_thStyle,textAlign:"right"}}>Avg Basket</th><th style={{...RPT_thStyle,textAlign:"center"}}>Active</th><th style={{...RPT_thStyle,textAlign:"center"}}>Recency</th></tr></thead>
        <tbody>{rows.map(c=>(<tr key={c.name} {...rrow(setRoute, partyLink("/reports/customer-360", c.name))}><td style={{...RPT_tdStyle,fontWeight:600}}>{c.name}</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>{c.firstBooking}</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>{c.lastBooking}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{c.totalBookings}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{m(c.ltv)}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{m(c.avgBasket)}</td><td style={{...RPT_tdStyle,textAlign:"center"}}>{c.monthsActive}m</td><td style={{...RPT_tdStyle,textAlign:"center",color:c.recencyDays<=30?"#22c55e":c.recencyDays<=90?"#d4a437":"#A32D2D",fontWeight:700}}>{c.recencyDays}d ago</td></tr>))}</tbody>
      </table>
    </div>
  );
}

export function RPT_CustomerLTV({ branch, setRoute }){
  const [range,setRange]=useState(()=>({mode:'all',...resolveReportRange('all')}));
  const q=useCustomerLtv(branch,{from:range.from||undefined,to:range.to||undefined});
  const sorted=q.data?.rows||[];   // server computes LTV, basket, active span & recency
  // Consolidated ALL view mixing currencies → India (₹) & Africa ($) customers kept separate.
  const split=currencySplit(q.data);
  return (
    <RPT_Page title="Customer Lifetime Value (LTV)" subtitle="Cumulative value per customer — live from posted sales"
      toolbar={<ReportDateBar value={range} onChange={setRange}/>}>
      <RptState q={q} empty={sorted.length===0} label="customer sales">
      {split
        ? split.map((c)=>{const t=c.totals||{};return (
            <section key={c.currency} style={{marginBottom:18}}>
              <div style={{display:"flex",alignItems:"baseline",gap:10,margin:"0 0 8px",flexWrap:"wrap"}}>
                <h3 style={{margin:0,fontSize:13,fontWeight:800,color:"#0d1326"}}>{c.symbol} <span style={{color:"#5a6691",fontWeight:600}}>({curRegion(c.symbol,c.currency)})</span></h3>
                <span style={{fontSize:11.5,color:"#5a6691"}}>{t.customers||0} customers · LTV <b style={{color:"#0d1326"}}>{cmoneyOf(c.symbol,t.ltv||0)}</b> · {t.bookings||0} bookings</span>
              </div>
              <LtvTable rows={c.rows||[]} m={(n)=>cmoneyOf(c.symbol,n)} setRoute={setRoute}/>
            </section>
          );})
        : <LtvTable rows={sorted} m={(n)=>cmoney(branch,n)} setRoute={setRoute}/>}
      </RptState>
    </RPT_Page>
  );
}
