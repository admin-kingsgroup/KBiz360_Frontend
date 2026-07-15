import { useQuery } from '@tanstack/react-query';
import { apiGet, getAuthToken } from '../../../core/api';
import { cardStyle } from '../../../core/helpers';
import { RPT_Page } from '../../../core/reportPage';
import { Skeleton } from '../../../shell/primitives';

/* 13. Birthday & Anniversary Calendar */

export function RPT_BirthdayCalendar(){

  const statsQ=useQuery({queryKey:['employees','stats'],queryFn:()=>apiGet('/api/employees/stats'),enabled:!!getAuthToken(),staleTime:60_000});
  const stats=statsQ.data||{birthdays:[],anniversaries:[]};
  return (
    <RPT_Page title="Birthday &amp; Anniversary Calendar" subtitle="Engagement events for HR &amp; team celebrations">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:14,fontWeight:700,color:"#0d1326",marginBottom:12}}>🎂 Upcoming Birthdays</p>
          {statsQ.isLoading && (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {Array.from({length:3}).map((_,i)=>(
                <div key={`sk-${i}`} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0"}}>
                  <Skeleton className="h-11 w-11" style={{borderRadius:"50%",opacity:Math.max(0.4,1-i*0.15)}} />
                  <div style={{flex:1}}><Skeleton className="h-3 w-1/2" style={{marginBottom:6}} /><Skeleton className="h-2.5 w-1/3" /></div>
                </div>
              ))}
            </div>
          )}
          {!statsQ.isLoading && (stats.birthdays||[]).length===0&&<p style={{color:"#5a6691",fontSize:12}}>No upcoming birthdays</p>}
          {(stats.birthdays||[]).map(b=>(<div key={b.name} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #dfe2e7"}}><div style={{width:44,height:44,borderRadius:"50%",background:"#d4a437",display:"flex",alignItems:"center",justifyContent:"center",color:"#0d1326",fontSize:14,fontWeight:700}}>{b.name.substring(0,2).toUpperCase()}</div><div style={{flex:1}}><p style={{margin:0,fontSize:13,color:"#0d1326",fontWeight:700}}>{b.name}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>{b.branch} · {b.date}</p></div></div>))}
        </div>
        <div style={cardStyle}>
          <p style={{margin:0,fontSize:14,fontWeight:700,color:"#0d1326",marginBottom:12}}>🎉 Work Anniversaries</p>
          {statsQ.isLoading && (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {Array.from({length:3}).map((_,i)=>(
                <div key={`sk-${i}`} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0"}}>
                  <Skeleton className="h-11 w-11" style={{borderRadius:"50%",opacity:Math.max(0.4,1-i*0.15)}} />
                  <div style={{flex:1}}><Skeleton className="h-3 w-1/2" style={{marginBottom:6}} /><Skeleton className="h-2.5 w-1/3" /></div>
                </div>
              ))}
            </div>
          )}
          {!statsQ.isLoading && (stats.anniversaries||[]).length===0&&<p style={{color:"#5a6691",fontSize:12}}>No upcoming anniversaries</p>}
          {(stats.anniversaries||[]).map(a=>(<div key={a.name} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #dfe2e7"}}><div style={{width:44,height:44,borderRadius:"50%",background:"#6B4C8B",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,fontWeight:700}}>{a.years}</div><div style={{flex:1}}><p style={{margin:0,fontSize:13,color:"#0d1326",fontWeight:700}}>{a.name}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>{a.branch} · {a.years} year{a.years!==1?"s":""} on {a.date}</p></div></div>))}
        </div>
      </div>
    </RPT_Page>
  );
}
