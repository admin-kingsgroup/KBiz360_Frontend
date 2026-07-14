import { useMobile } from '../../core/hooks';
import { bc } from '../../core/styleTokens';
import { fmt } from '../../core/format';
import { SampleBanner } from '../../core/ux/SampleBanner';

export const MSME_OVERDUE_DATA = [];

export function MsmeTracker({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;

  const bills=MSME_OVERDUE_DATA.filter(b=>!brCode||b.branch===brCode);
  const critical=bills.filter(b=>b.ageDays>=45);
  const high=bills.filter(b=>b.ageDays>=30&&b.ageDays<45);
  const watch=bills.filter(b=>b.ageDays<30);
  const totalAtRisk=critical.reduce((s,b)=>s+b.outstanding,0);
  const totalDisallow=Math.round(totalAtRisk*0.3); // potential income-tax disallowance
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>⚠️ MSME 45-Day Compliance Tracker</h2>
      <p style={{margin:"4px 0 10px",fontSize:11.5,color:"#5a6691"}}>Section 43B(h) of Income Tax Act · Pay MSME suppliers within 45 days or lose tax deduction</p>
      <SampleBanner note="MSME supplier registration (UDYAM) is not yet captured on supplier masters — 43B(h) exposure cannot be computed from the live books. The figures below are NOT a clean bill of health; flag MSME suppliers first." />

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Critical (&gt; 45 days)</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{critical.length}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{cur+fmt(totalAtRisk)} at risk</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>High (30-45)</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{high.length}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Watch (&lt; 30)</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{watch.length}</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Potential Tax Hit</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{cur+fmt(totalDisallow)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>30% IT disallowance</p></div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Bill #</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>MSME Supplier</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>UDYAM Number</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Bill Date</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Due Date</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Age</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Outstanding</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Risk</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Action</th>
            </tr></thead>
            <tbody>
              {bills.sort((a,b)=>b.ageDays-a.ageDays).map((b,i)=>(
                <tr key={b.id} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{b.id}</td>
                  <td style={{padding:"7px 8px",fontWeight:600}}>{b.supplier}</td>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#5a6691"}}>{b.msmeNo}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{b.billDate}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10,fontWeight:b.ageDays>=45?700:400,color:b.ageDays>=45?"#A32D2D":"#5a6691"}}>{b.dueDate}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontWeight:700,color:b.ageDays>=45?"#A32D2D":b.ageDays>=30?"#854F0B":"#185FA5"}}>{b.ageDays}d</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700}}>{cur+fmt(b.outstanding)}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:b.risk==="Critical"?"#FCEBEB":b.risk==="High"?"#FAEEDA":b.risk==="Medium"?"#E6F1FB":"#f3f4f8",color:b.risk==="Critical"?"#A32D2D":b.risk==="High"?"#854F0B":b.risk==="Medium"?"#185FA5":"#5a6691"}}>{b.risk}</span></td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><button style={{padding:"3px 10px",border:"none",background:"#d4a437",color:"#0d1326",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer"}}>Pay Now</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{marginTop:12,padding:"10px 14px",background:"#FCEBEB",borderLeft:"4px solid #A32D2D",borderRadius:6}}>
        <p style={{margin:0,fontSize:11,color:"#A32D2D",fontWeight:700}}>⚠️ Statutory Alert — Section 43B(h)</p>
        <p style={{margin:"4px 0 0",fontSize:10.5,color:"#0d1326"}}>If MSME suppliers are not paid within 45 days (or as agreed, whichever is earlier), the expense becomes disallowable in the year of incurrence. Tax deduction is only available in the year of actual payment. Tag MSME flag in Supplier Master.</p>
      </div>
    </div>
  );
}
