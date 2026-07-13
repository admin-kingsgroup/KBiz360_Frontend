import { useFxExposure } from '../../../core/useAccounting';
import { fmtINR } from '../../../core/format';
import { cardStyle } from '../../../core/helpers';
import { RPT_thStyle, RPT_tdStyle } from '../../../core/styleTokens';
import { RPT_Page, RptState } from '../../../core/reportPage';

/* 16. Currency Exposure */

export function RPT_CurrencyExposure({ branch }){

  const q=useFxExposure(branch);
  const rows=q.data?.rows||[];
  const t=q.data?.totals||{currencies:0,inrEquivalent:0,missingRates:0};
  const n=(v)=>Number(v||0).toLocaleString("en-IN");
  return (
    <RPT_Page title="Currency Exposure Report" subtitle="Open foreign-currency positions per currency · net exposure & INR equivalent (live from posted books)">
      <RptState q={q} empty={rows.length===0} label="foreign-currency exposure">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Currencies in Use</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{t.currencies}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Net INR Equivalent</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{fmtINR(t.inrEquivalent)}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Currencies w/o Rate</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:t.missingRates>0?"#A32D2D":"#155724"}}>{t.missingRates}</p></div>
      </div>
      <div style={cardStyle}>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Currency</th><th style={RPT_thStyle}>Branches</th><th style={{...RPT_thStyle,textAlign:"right"}}>Receivables</th><th style={{...RPT_thStyle,textAlign:"right"}}>Payables</th><th style={{...RPT_thStyle,textAlign:"right"}}>Cash Held</th><th style={{...RPT_thStyle,textAlign:"right"}}>Net Exposure</th><th style={{...RPT_thStyle,textAlign:"right"}}>Rate → INR</th><th style={{...RPT_thStyle,textAlign:"right"}}>INR Equivalent</th></tr></thead>
          <tbody>{rows.map(c=>(<tr key={c.currency}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:700}}>{c.currency}</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>{(c.branches||[]).join(", ")}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{n(c.receivables)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{n(c.payables)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace"}}>{n(c.cashHeld)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",fontWeight:700}}>{n(c.netExposure)}</td><td style={{...RPT_tdStyle,textAlign:"right",fontFamily:"monospace",color:c.rateStale?"#A32D2D":"#5a6691"}}>{c.rateStale?"no rate":c.rate}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:c.inrEquivalent==null?"#A32D2D":"#0d1326"}}>{c.inrEquivalent==null?"rate missing":fmtINR(c.inrEquivalent)}</td></tr>))}</tbody>
        </table></div>
      </div>
      <p style={{margin:"10px 2px 0",fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>Amounts shown in each foreign currency; INR equivalent uses the latest forex rate on file. Hedged/unhedged positions are not shown — the system does not yet track FX hedges or forward contracts, so this reflects open exposure only.</p>
      </RptState>
    </RPT_Page>
  );
}
