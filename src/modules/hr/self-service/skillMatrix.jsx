/* ══════════════════════════════════════════════════════════════════
   SKILL MATRIX (/hr/skills)
   ══════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { SKILLS_DATA, cardStyle } from '../../../core/helpers';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';

export function SkillMatrix(){
  const [selEmp,setSelEmp]=useState("");
  const emps=[];
  const categories=[...new Set(SKILLS_DATA.map(s=>s.category))];
  const Stars=({n,max=5,color="#d4a437"})=><span style={{letterSpacing:1}}>{Array.from({length:max},(_,i)=><span key={i} style={{color:i<n?color:"#e1e3ec",fontSize:14}}>★</span>)}</span>;
  return(
    <PHASE2_Page title="Skill Matrix" subtitle="Employee competency mapping · current level vs target · development gaps"
      toolbar={<select value={selEmp} onChange={e=>setSelEmp(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}>{emps.map(e=><option key={e}>{e}</option>)}</select>}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
        <div style={cardStyle}>
          <p style={{margin:"0 0 14px",fontSize:13,fontWeight:700,color:"#0d1326"}}>{selEmp} — Skill Assessment</p>
          {categories.map(cat=>(
            <div key={cat} style={{marginBottom:16}}>
              <p style={{margin:"0 0 8px",fontSize:10.5,fontWeight:700,color:"#5a6691",textTransform:"uppercase",letterSpacing:"0.4px"}}>{cat}</p>
              {SKILLS_DATA.filter(s=>s.category===cat).map(s=>(
                <div key={s.skill} style={{display:"grid",gridTemplateColumns:"160px 1fr 1fr 80px",gap:10,alignItems:"center",padding:"7px 0",borderBottom:"1px solid #dfe2e7"}}>
                  <span style={{fontSize:12,color:"#0d1326",fontWeight:600}}>{s.skill}</span>
                  <div>
                    <p style={{margin:"0 0 2px",fontSize:9.5,color:"#5a6691"}}>Current Level</p>
                    <Stars n={s.level}/>
                  </div>
                  <div>
                    <p style={{margin:"0 0 2px",fontSize:9.5,color:"#5a6691"}}>Target Level</p>
                    <Stars n={s.target} color="#0d1326"/>
                  </div>
                  <span style={{fontSize:10.5,padding:"2px 7px",borderRadius:3,background:s.level>=s.target?"#d4edda":"#fff3cd",color:s.level>=s.target?"#155724":"#856404",fontWeight:700,textAlign:"center"}}>{s.level>=s.target?"Met":"Gap: "+(s.target-s.level)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={cardStyle}>
            <p style={{margin:"0 0 10px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Competency Summary</p>
            {(()=>{const met=SKILLS_DATA.filter(s=>s.level>=s.target).length;const total=SKILLS_DATA.length;const pct=Math.round(met/total*100);return(<>
              <div style={{height:80,width:80,borderRadius:"50%",border:`8px solid #d4a437`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",background:"#fff"}}>
                <p style={{margin:0,fontSize:18,fontWeight:700,color:"#0d1326"}}>{pct}%</p>
              </div>
              <p style={{textAlign:"center",margin:"0 0 8px",fontSize:11.5,color:"#5a6691"}}>{met}/{total} skills at or above target</p>
            </>);})()} 
            {[{label:"Skills at target",count:SKILLS_DATA.filter(s=>s.level>=s.target).length,color:"#22c55e"},{label:"Skills below target",count:SKILLS_DATA.filter(s=>s.level<s.target).length,color:"#f97316"},{label:"Skills assessed",count:SKILLS_DATA.length,color:"#0d1326"}].map(s=>(
              <div key={s.label} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #dfe2e7",fontSize:11.5}}>
                <span style={{color:"#5a6691"}}>{s.label}</span><b style={{color:s.color}}>{s.count}</b>
              </div>
            ))}
          </div>
          <div style={{padding:12,background:"#fff",border:"1px solid #cdd1d8",borderRadius:8}}>
            <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Development Focus Areas</p>
            {SKILLS_DATA.filter(s=>s.level<s.target).map(s=>(
              <div key={s.skill} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #dfe2e7",fontSize:11.5}}>
                <span style={{color:"#0d1326"}}>{s.skill}</span>
                <span style={{color:"#f97316",fontWeight:700}}>L{s.level}→L{s.target}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PHASE2_Page>
  );
}
