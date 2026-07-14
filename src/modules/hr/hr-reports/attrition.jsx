import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMasterList } from '../../../core/useMasters';
import { fromEmpDTO } from '../employeeMap';
import { todayISO } from '../../../core/dates';
import { lastMonths, buildAttrition } from '../hrReports';
import { cardStyle } from '../../../core/helpers';
import { RPT_thStyle, RPT_tdStyle } from '../../../core/styleTokens';
import { RPT_Page } from '../../../core/reportPage';

export function RPT_Attrition(){

  const emps=((useMasterList('employees').data)||[]).map(fromEmpDTO);
  const months=lastMonths(todayISO().slice(0,7),12);
  const {rows:ATTRITION_DATA,ttlJoiners,ttlLeavers,annualAttrition:annualAttritionN}=buildAttrition(emps,months);
  const annualAttrition=(annualAttritionN||0).toFixed(1);
  return (
    <RPT_Page title="Attrition Rate Report" subtitle="Monthly joiners vs leavers · FY 2025-26">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Joiners YTD</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#22c55e"}}>{ttlJoiners}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Leavers YTD</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#A32D2D"}}>{ttlLeavers}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Net Add</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#0d1326"}}>+{ttlJoiners-ttlLeavers}</p></div>
        <div style={cardStyle}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase"}}>Annual Attrition</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:Number(annualAttrition)>20?"#A32D2D":"#0d1326"}}>{annualAttrition}%</p></div>
      </div>
      <div style={cardStyle}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={ATTRITION_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7"/>
            <XAxis dataKey="month" tick={{fontSize:10,fill:"#5a6691"}}/>
            <YAxis tick={{fontSize:10,fill:"#5a6691"}}/>
            <Tooltip/>
            <Legend wrapperStyle={{fontSize:11}}/>
            <Bar dataKey="joiners" fill="#22c55e" name="Joiners"/>
            <Bar dataKey="leavers" fill="#A32D2D" name="Leavers"/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{...cardStyle,marginTop:14,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Month</th><th style={{...RPT_thStyle,textAlign:"right"}}>Opening HC</th><th style={{...RPT_thStyle,textAlign:"right"}}>Joiners</th><th style={{...RPT_thStyle,textAlign:"right"}}>Leavers</th><th style={{...RPT_thStyle,textAlign:"right"}}>Closing HC</th><th style={{...RPT_thStyle,textAlign:"right"}}>Attrition %</th></tr></thead>
          <tbody>{ATTRITION_DATA.map(m=>(<tr key={m.month}><td style={{...RPT_tdStyle,fontWeight:600}}>{m.month}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{m.openingHc}</td><td style={{...RPT_tdStyle,textAlign:"right",color:m.joiners>0?"#22c55e":"#5a6691",fontWeight:m.joiners>0?700:400}}>{m.joiners||"—"}</td><td style={{...RPT_tdStyle,textAlign:"right",color:m.leavers>0?"#A32D2D":"#5a6691",fontWeight:m.leavers>0?700:400}}>{m.leavers||"—"}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{m.closingHc}</td><td style={{...RPT_tdStyle,textAlign:"right",color:m.attritionRate>0?"#A32D2D":"#5a6691"}}>{m.attritionRate>0?m.attritionRate.toFixed(1)+"%":"—"}</td></tr>))}</tbody>
        </table>
      </div>
    </RPT_Page>
  );
}
