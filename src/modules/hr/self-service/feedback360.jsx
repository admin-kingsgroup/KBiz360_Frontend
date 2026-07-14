/* ══════════════════════════════════════════════════════════════════
   360° FEEDBACK MODULE (/hr/feedback-360)
   ══════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { FEEDBACK_360_DATA, cardStyle } from '../../../core/helpers';
import { RPT_tdStyle, RPT_thStyle, tabBtnStyle } from '../../../core/styles';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';

export function Feedback360(){
  const [tab,setTab]=useState("received");
  const avgScore=FEEDBACK_360_DATA.filter(f=>f.submitted&&f.score).reduce((s,f,_,a)=>s+f.score/a.filter(x=>x.submitted).length,0);
  const QUESTIONS=["Demonstrates technical competence in their role","Communicates clearly and effectively","Meets commitments and deadlines","Collaborates well with the team","Suggests improvements proactively","Shows ownership and accountability"];
  return(
    <PHASE2_Page title="360° Feedback Module" subtitle="Multi-source feedback · manager · peers · self · all anonymous except manager">
      <div style={{display:"flex",borderBottom:"1px solid #cdd1d8",marginBottom:14,background:"#fff",border:"1px solid #cdd1d8",borderRadius:"8px 8px 0 0",overflow:"hidden"}}>
        {[{k:"received",l:"My Feedback"},{k:"give",l:"Give Feedback"},{k:"status",l:"Submission Status"}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={tabBtnStyle(tab===t.k)}>{t.l}</button>
        ))}
      </div>
      {tab==="received"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:14}}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{...cardStyle,textAlign:"center"}}>
              <p style={{margin:0,fontSize:11,color:"#5a6691",textTransform:"uppercase",fontWeight:700}}>Overall Score</p>
              <p style={{margin:"8px 0",fontSize:44,fontWeight:700,color:"#0d1326"}}>{avgScore.toFixed(0)}<span style={{fontSize:14,color:"#5a6691"}}>/100</span></p>
              <p style={{margin:0,fontSize:11.5,color:"#d4a437",fontWeight:600}}>Based on {FEEDBACK_360_DATA.filter(f=>f.submitted).length} of {FEEDBACK_360_DATA.length} responses</p>
            </div>
            {FEEDBACK_360_DATA.map((f,i)=>(
              <div key={i} style={{...cardStyle,display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:"#0d1326",color:"#d4a437",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{f.from.substring(0,2).toUpperCase()}</div>
                <div style={{flex:1}}>
                  <p style={{margin:0,fontSize:12,fontWeight:700,color:"#0d1326"}}>{f.from}</p>
                  <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{f.relation}</p>
                </div>
                {f.submitted?<span style={{fontSize:16,fontWeight:700,color:"#d4a437"}}>{f.score}</span>:<span style={{fontSize:10,color:"#5a6691",padding:"2px 6px",background:"#f7f8fb",borderRadius:3}}>Pending</span>}
              </div>
            ))}
          </div>
          <div style={cardStyle}>
            <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Dimension Scores</p>
            {QUESTIONS.map((q,i)=>{const score=65+i*5;return(
              <div key={i} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:11.5,color:"#0d1326"}}>{q}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#0d1326"}}>{score}/100</span>
                </div>
                <div style={{height:8,background:"#f0f2f7",borderRadius:4}}><div style={{height:"100%",width:score+"%",background:score>=80?"#22c55e":score>=60?"#d4a437":"#A32D2D",borderRadius:4}}/></div>
              </div>
            );})}
            <div style={{marginTop:14,padding:12,background:"#fafbfd",borderRadius:6}}>
              <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:"#0d1326"}}>Qualitative Feedback (aggregated)</p>
              <p style={{margin:0,fontSize:11.5,color:"#5a6691",lineHeight:1.5}}>"Strong attention to detail on vouchers. Would benefit from proactive communication when delays are expected. Very reliable team member."</p>
            </div>
          </div>
        </div>
      )}
      {tab==="give"&&(
        <div style={cardStyle}>
          <p style={{margin:"0 0 4px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Give Feedback to: <select style={{border:"1px solid #cdd1d8",borderRadius:4,padding:"3px 8px",fontSize:12}}><option value="">— Select —</option></select></p>
          <p style={{margin:"0 0 14px",fontSize:10.5,color:"#5a6691"}}>Your feedback is anonymous to the recipient (visible only to HR)</p>
          {QUESTIONS.map((q,i)=>(
            <div key={i} style={{marginBottom:14,paddingBottom:14,borderBottom:"1px solid #dfe2e7"}}>
              <p style={{margin:"0 0 8px",fontSize:12.5,fontWeight:600,color:"#0d1326"}}>{q}</p>
              <div style={{display:"flex",gap:8}}>
                {[1,2,3,4,5].map(s=><button key={s} style={{width:40,height:40,borderRadius:5,border:"1px solid #cdd1d8",background:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,color:"#5a6691"}}>{s}</button>)}
                <span style={{fontSize:10.5,color:"#5a6691",alignSelf:"center",marginLeft:4}}>1=Needs improvement · 5=Outstanding</span>
              </div>
            </div>
          ))}
          <div><label style={{fontSize:11,color:"#5a6691",fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.4px"}}>Written Comments</label><textarea rows={3} style={{padding:"8px 10px",border:"1px solid #cdd1d8",borderRadius:5,fontSize:12,width:"100%",fontFamily:"inherit",resize:"none"}} placeholder="Specific examples, strengths, areas for growth…"/></div>
          <button style={{marginTop:12,padding:"9px 22px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer"}}>Submit Feedback</button>
        </div>
      )}
      {tab==="status"&&(
        <div style={cardStyle}>
          <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Submission Status — Cycle: FY 2025-26 Q4</p>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>From</th><th style={RPT_thStyle}>Relation</th><th style={{...RPT_thStyle,textAlign:"center"}}>Submitted</th></tr></thead>
            <tbody>{FEEDBACK_360_DATA.map((f,i)=>(<tr key={i} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{...RPT_tdStyle,fontWeight:600}}>{f.from}</td><td style={RPT_tdStyle}>{f.relation}</td><td style={{...RPT_tdStyle,textAlign:"center"}}>{f.submitted?<span style={{color:"#22c55e",fontWeight:700}}>✓ Submitted</span>:<span style={{color:"#f97316",fontWeight:600}}>Pending</span>}</td></tr>))}</tbody>
          </table>
        </div>
      )}
    </PHASE2_Page>
  );
}
