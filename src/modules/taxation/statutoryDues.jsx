import { useStatutoryDues } from '../../core/useTaxReco';
import { compactAmt, fmtINR } from '../../core/format';
import { cardStyle } from '../../core/helpers';
import { RPT_thStyle, RPT_tdStyle } from '../../core/styleTokens';
import { RPT_Page, RptState } from '../../core/reportPage';

export function RPT_StatutoryDues(){

  const q=useStatutoryDues();
  const rows=q.data?.rows||[];
  const t=q.data?.totals||{overdue:0,pending:0,upcoming:0,dueValue:0};
  // Money is per currency — ₹ India (GST/TDS) vs $ Africa (VAT/WHT), never blended.
  const sym=(c)=>(!c||c==="INR")?"₹":"$";
  const dueParts=t.dueByCurrency&&Object.keys(t.dueByCurrency).length
    ? Object.entries(t.dueByCurrency).filter(([,v])=>Number(v)).map(([c,v])=>compactAmt(v,{currency:sym(c)}))
    : (Number(t.dueValue)?[fmtINR(t.dueValue)]:[]);
  const dueLabel=dueParts.length?dueParts.join(" · "):"—";
  return (
    <RPT_Page title="Statutory Dues Calendar" subtitle="All compliance dates · filing status &amp; reminders">
      <RptState q={q} empty={rows.length===0} label="statutory dues">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Overdue</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#A32D2D"}}>{t.overdue}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Pending</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#f97316"}}>{t.pending}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Upcoming</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#d4a437"}}>{t.upcoming}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Total Due Value</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>{dueLabel}</p></div>
      </div>
      <div style={{...cardStyle,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Due Date</th><th style={RPT_thStyle}>Authority</th><th style={RPT_thStyle}>Filing</th><th style={RPT_thStyle}>Entity</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th><th style={{...RPT_thStyle,textAlign:"center"}}>Days Left</th><th style={{...RPT_thStyle,textAlign:"center"}}>Status</th></tr></thead>
          <tbody>{rows.map((d,i)=>(<tr key={d.id||i}><td style={{...RPT_tdStyle,fontFamily:"monospace",fontWeight:600}}>{d.due}</td><td style={RPT_tdStyle}><span style={{padding:"2px 8px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700,color:"#0d1326"}}>{d.authority}</span></td><td style={{...RPT_tdStyle,fontWeight:600}}>{d.filing}</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>{d.entity}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{d.amount>0?compactAmt(d.amount,{currency:sym(d.currency)}):"—"}</td><td style={{...RPT_tdStyle,textAlign:"center",fontWeight:700,color:d.daysLeft<=0?"#A32D2D":d.daysLeft<=7?"#f97316":d.daysLeft<=30?"#d4a437":"#5a6691"}}>{d.status==="Filed"?"—":d.daysLeft<=0?"DUE NOW":d.daysLeft+"d"}</td><td style={{...RPT_tdStyle,textAlign:"center"}}><span style={{padding:"3px 10px",borderRadius:3,fontSize:10,fontWeight:700,letterSpacing:"0.3px",background:d.status==="Filed"?"#d4edda":d.status==="Pending"?"#f8d7da":d.status==="Upcoming"?"#fff3cd":"#f8d7da",color:d.status==="Filed"?"#155724":d.status==="Pending"?"#721c24":d.status==="Upcoming"?"#856404":"#721c24"}}>{d.status}</span></td></tr>))}</tbody>
        </table>
      </div>
      </RptState>
    </RPT_Page>
  );
}
