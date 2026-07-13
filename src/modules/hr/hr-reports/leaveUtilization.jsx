import { useMasterList } from '../../../core/useMasters';
import { fromEmpDTO } from '../employeeMap';
import { fromLeaveDTO } from '../hrMaps';
import { buildLeaveUtilization } from '../hrReports';
import { cardStyle } from '../../../core/helpers';
import { RPT_thStyle, RPT_tdStyle } from '../../../core/styleTokens';
import { RPT_Page } from '../../../core/reportPage';

/* 12. Leave Utilization */

export function RPT_LeaveUtilization(){

  const emps=((useMasterList('employees').data)||[]).map(fromEmpDTO);
  const leaves=((useMasterList('leave-requests').data)||[]).map(fromLeaveDTO);
  const LEAVE_UTILIZATION=buildLeaveUtilization(emps,leaves);
  return (
    <RPT_Page title="Leave Utilization Report" subtitle="% of entitlement used per employee · current FY">
      <div style={{...cardStyle,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr><th style={RPT_thStyle}>Employee</th><th style={RPT_thStyle}>Branch</th><th style={{...RPT_thStyle,textAlign:"right"}}>Entitled</th><th style={{...RPT_thStyle,textAlign:"right"}}>Used</th><th style={{...RPT_thStyle,textAlign:"right"}}>Balance</th><th style={{...RPT_thStyle,textAlign:"right"}}>CL</th><th style={{...RPT_thStyle,textAlign:"right"}}>SL</th><th style={{...RPT_thStyle,textAlign:"right"}}>EL</th><th style={{...RPT_thStyle,textAlign:"center"}}>Utilization</th></tr></thead>
          <tbody>{LEAVE_UTILIZATION.length===0&&(<tr><td colSpan={9} style={{...RPT_tdStyle,textAlign:"center",color:"#8b94b3"}}>No employees yet.</td></tr>)}{LEAVE_UTILIZATION.map(l=>(<tr key={l.empId}><td style={{...RPT_tdStyle,fontWeight:600}}>{l.name}</td><td style={RPT_tdStyle}><span style={{padding:"2px 6px",background:"#e6e8f1",borderRadius:3,fontSize:10,fontWeight:700}}>{l.branch}</span></td><td style={{...RPT_tdStyle,textAlign:"right"}}>{l.entitled}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{l.used}</td><td style={{...RPT_tdStyle,textAlign:"right",color:l.balance<5?"#A32D2D":"#0d1326"}}>{l.balance}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{l.casual}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{l.sick}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{l.earned}</td><td style={{padding:"6px 12px",borderBottom:"1px solid #dfe2e7"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{flex:1,height:6,background:"#f0f2f7",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:l.utilPct+"%",background:l.utilPct>75?"#A32D2D":l.utilPct>50?"#d4a437":"#22c55e",borderRadius:3}}/></div><span style={{fontSize:10.5,fontWeight:700,color:l.utilPct>75?"#A32D2D":"#0d1326",minWidth:36,textAlign:"right"}}>{l.utilPct.toFixed(0)}%</span></div></td></tr>))}</tbody>
        </table>
      </div>
    </RPT_Page>
  );
}
