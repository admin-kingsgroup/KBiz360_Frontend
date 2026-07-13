/* ── Performance Review (/hr/performance) ─────────────────────── */

import { useState } from 'react';
import { PERFORMANCE_REVIEWS, cardStyle } from '../../../core/helpers';
import { RPT_tdStyle, RPT_thStyle, tabBtnStyle } from '../../../core/styles';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';

export function PerformanceReview(){
  const [tab,setTab]=useState("current");
  const kpis=[{kpi:"Voucher Accuracy %",target:"≥ 99%",weight:25},{kpi:"Month-end Close (by)",target:"5th of month",weight:20},{kpi:"Pending Items < N",target:"< 5 items",weight:15},{kpi:"Training Completion",target:"100%",weight:15},{kpi:"Customer Escalations",target:"0",weight:15},{kpi:"Process Improvements",target:"2/year",weight:10}];
  const prev=PERFORMANCE_REVIEWS[0];
  return(
    <PHASE2_Page title="Performance Review Module" subtitle="Annual KPI-based reviews · self-assessment · manager rating">
      <div style={{display:"flex",borderBottom:"1px solid #cdd1d8",marginBottom:14,background:"#fff",borderRadius:"8px 8px 0 0",overflow:"hidden",border:"1px solid #cdd1d8"}}>
        {[{k:"current",l:"FY 2025-26 (In Progress)"},{k:"history",l:"Previous Reviews"}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={tabBtnStyle(tab===t.k)}>{t.l}</button>
        ))}
      </div>
      {tab==="current"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={cardStyle}>
            <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>KPI Self-Assessment — FY 2025-26</p>
            {kpis.map((k,i)=>(
              <div key={i} style={{marginBottom:14,paddingBottom:14,borderBottom:"1px solid #dfe2e7"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#0d1326"}}>{k.kpi}</span>
                  <span style={{fontSize:10.5,color:"#5a6691"}}>Weight: {k.weight}%</span>
                </div>
                <p style={{margin:"0 0 6px",fontSize:10.5,color:"#5a6691"}}>Target: {k.target}</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div><label style={{fontSize:10,color:"#5a6691",fontWeight:700,display:"block",marginBottom:2}}>My Achievement</label><input style={{padding:"5px 8px",border:"1px solid #cdd1d8",borderRadius:4,fontSize:11.5,width:"100%"}} placeholder="e.g. 99.4%"/></div>
                  <div><label style={{fontSize:10,color:"#5a6691",fontWeight:700,display:"block",marginBottom:2}}>Self-Rating (1-5)</label><select style={{padding:"5px 8px",border:"1px solid #cdd1d8",borderRadius:4,fontSize:11.5,width:"100%"}}><option>5 — Exceeded</option><option selected>4 — Met</option><option>3 — Partially Met</option><option>2 — Below Target</option><option>1 — Not Met</option></select></div>
                </div>
              </div>
            ))}
            <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.4px"}}>Overall Self-Comments</label><textarea rows={3} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,width:"100%",fontFamily:"inherit",resize:"none"}} placeholder="Achievements, challenges, and development areas…"/></div>
            <button style={{marginTop:12,padding:"9px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer",width:"100%"}}>Submit Self-Assessment</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{padding:14,background:"#fff8e8",border:"1px solid #fde68a",borderRadius:8}}>
              <p style={{margin:"0 0 6px",fontSize:12,fontWeight:700,color:"#856404"}}>📅 Review Timeline</p>
              {[{step:"Self-assessment submission",by:"31-May-2026",done:false},{step:"Manager review",by:"15-Jun-2026",done:false},{step:"Calibration session",by:"25-Jun-2026",done:false},{step:"Final rating & feedback",by:"30-Jun-2026",done:false}].map((t,i)=>(
                <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"4px 0",fontSize:11.5}}>
                  <span style={{color:t.done?"#22c55e":"#5a6691"}}>{t.done?"✓":"○"}</span>
                  <span style={{color:"#0d1326"}}>{t.step}</span>
                  <span style={{marginLeft:"auto",color:"#856404",fontFamily:"monospace",fontSize:11}}>{t.by}</span>
                </div>
              ))}
            </div>
            <div style={cardStyle}>
              <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:"#0d1326"}}>My Development Goals</p>
              {["Complete GST Advanced certification by Aug 2026","Learn Power BI for financial dashboards","Shadow Sr. AE on period-end close process","Attend travel industry FHRAI conference"].map((g,i)=>(
                <div key={i} style={{display:"flex",gap:8,padding:"5px 0",borderBottom:"1px solid #dfe2e7",fontSize:11.5}}>
                  <input type="checkbox" defaultChecked={i<1}/>
                  <span style={{textDecoration:i<1?"line-through":"none",color:i<1?"#5a6691":"#0d1326"}}>{g}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {tab==="history"&&!prev&&(
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:12,color:"#5a6691",textAlign:"center",padding:"24px 0"}}>No previous reviews on record yet.</p>
        </div>
      )}
      {tab==="history"&&prev&&(
        <div style={cardStyle}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Previous Review — {prev.period}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div><p style={{margin:0,fontSize:11,color:"#5a6691"}}>Reviewer: <b style={{color:"#0d1326"}}>{prev.reviewer}</b></p><p style={{margin:"3px 0 0",fontSize:11,color:"#5a6691"}}>Grade: <b style={{color:"#d4a437",fontSize:13}}>{prev.grade}</b></p></div>
            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:11,color:"#5a6691"}}>Score</p><p style={{margin:0,fontSize:36,fontWeight:700,color:"#0d1326"}}>{prev.score}<span style={{fontSize:14,color:"#5a6691"}}>/100</span></p></div>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>KPI</th><th style={{...RPT_thStyle,textAlign:"right"}}>Target</th><th style={{...RPT_thStyle,textAlign:"right"}}>Actual</th><th style={{...RPT_thStyle,textAlign:"right"}}>Score</th></tr></thead>
            <tbody>{(prev.kpis||[]).map((k,i)=>(<tr key={i} style={{borderBottom:"1px solid #dfe2e7"}}><td style={RPT_tdStyle}>{k.kpi}</td><td style={{...RPT_tdStyle,textAlign:"right"}}>{k.target}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:"#22c55e"}}>{k.actual}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{k.score}</td></tr>))}</tbody>
          </table>
          <div style={{marginTop:12,padding:12,background:"#fafbfd",borderRadius:6}}>
            <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Manager Comments</p>
            <p style={{margin:0,fontSize:11.5,color:"#5a6691"}}>{prev.comments}</p>
          </div>
        </div>
      )}
    </PHASE2_Page>
  );
}
