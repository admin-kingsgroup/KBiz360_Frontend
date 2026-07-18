import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useMobile } from '../../../core/hooks';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { useModalEsc } from '../../../core/ux/useModalEsc';
import { fromJobDTO, toJobPayload, JOB_NEXT_STATUS } from '../hrMaps';
import { todayISO } from '../../../core/dates';
import { toast } from '../../../core/ux/toast';
import { FL, btnG, btnGh, card, inp } from '../../../core/styleTokens';
import { Skeleton, isViewOnly, VIEW_ONLY_REASON } from '../../../shell/primitives';

export function Recruitment({branch}){
  const vo=isViewOnly();
  const mob=useMobile();
  const brScope=branch==="ALL"?"":(branch?.code||"");
  const jobsQ=useMasterList('job-openings', brScope?{branch:brScope}:{});
  const jobs=((jobsQ.data)||[]).map(fromJobDTO);
  const {create,update}=useMasterMutations('job-openings');
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const blank={title:"",dept:"",branch:brScope||"BOM",location:"",type:"Full-time",salary:"",skills:"",applicants:0,posted:todayISO(),status:"Open"};
  const [form,setForm]=useState(blank);
  const STATUS_CLR={Open:"#185FA5",Interviewing:"#854F0B",Hired:"#27500A","On-hold":"#854F0B",Closed:"#5a6691"};
  const STATUS_BG ={Open:"#E6F1FB",Interviewing:"#FAEEDA",Hired:"#EAF3DE","On-hold":"#FAEEDA",Closed:"#f3f4f8"};

  const advance=(j)=>update.mutate({id:j.id,body:toJobPayload({...j,status:JOB_NEXT_STATUS[j.status]||"Closed"})},
    {onError:e=>toast(e?.message||"Could not update","error")});
  const postJob=()=>{
    if(!form.title){toast("Job title is required","error");return;}
    create.mutate(toJobPayload(form),{
      onSuccess:()=>{toast("Job posted");setModal(false);setForm(blank);},
      onError:e=>toast(e?.message||"Could not post job","error")});
  };

  return(
    <div style={{padding:"20px 32px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>👔</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Recruitment</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{jobsQ.isLoading?<Skeleton className="inline-block h-3 w-28 align-middle" />:`${jobs.filter(j=>j.status==="Open").length} open positions`} · {jobs.reduce((s,j)=>s+j.applicants,0)} total applicants · {branch==="ALL"?"All branches":(branch?.code||brScope||"—")}</p>
          </div>
        </div>
        <button onClick={()=>{setForm(blank);setModal(true);}} style={{...btnG,fontSize:11}}><Plus size={13}/> Post Job</button>
      </div>

      {jobs.length===0&&!jobsQ.isLoading&&(
        <div style={{...card,padding:"24px",textAlign:"center",color:"#8b94b3",fontSize:12}}>No job openings for this branch. Use “Post Job” to add one.</div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:12}}>
        {jobs.map(j=>(
          <div key={j.id} style={{...card,borderTop:`3px solid ${STATUS_CLR[j.status]||"#384677"}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>{j.title}</p>
                <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{j.dept} · {j.location} · {j.type}</p>
              </div>
              <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[j.status],color:STATUS_CLR[j.status]}}>{j.status}</span>
            </div>
            <div style={{display:"flex",gap:10,marginBottom:8}}>
              <div style={{flex:1,padding:"6px 10px",borderRadius:7,background:"#f3f4f8",textAlign:"center"}}>
                <p style={{margin:0,fontSize:8.5,color:"#5a6691"}}>Applicants</p>
                <p style={{margin:"1px 0 0",fontSize:16,fontWeight:800,color:"#0d1326"}}>{j.applicants}</p>
              </div>
              <div style={{flex:2,padding:"6px 10px",borderRadius:7,background:"#f3f4f8"}}>
                <p style={{margin:0,fontSize:8.5,color:"#5a6691"}}>Salary range</p>
                <p style={{margin:"1px 0 0",fontSize:11,fontWeight:700,color:"#27500A"}}>{j.salary}</p>
              </div>
            </div>
            <p style={{margin:"0 0 10px",fontSize:10.5,color:"#5a6691"}}><b>Skills:</b> {j.skills}</p>
            <div style={{display:"flex",gap:6}}>
              <button style={{...btnG,fontSize:10,padding:"4px 12px",flex:1}}>View Applicants</button>
              <button onClick={()=>advance(j)} disabled={update.isPending||vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...btnGh,fontSize:10,padding:"4px 10px",...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>{j.status==="Open"?"→ Interview":j.status==="Interviewing"?"→ Hire":j.status==="Hired"?"Close":"Close"}</button>
            </div>
          </div>
        ))}
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:520,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Post a Job Opening</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <FL label="Job title"><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={inp}/></FL>
              <FL label="Department"><input value={form.dept} onChange={e=>setForm(f=>({...f,dept:e.target.value}))} style={inp}/></FL>
              <FL label="Branch"><input value={form.branch} onChange={e=>setForm(f=>({...f,branch:e.target.value}))} style={inp}/></FL>
              <FL label="Location"><input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} style={inp}/></FL>
              <FL label="Employment type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}>{["Full-time","Part-time","Contract"].map(t=><option key={t}>{t}</option>)}</select></FL>
              <FL label="Salary range"><input value={form.salary} onChange={e=>setForm(f=>({...f,salary:e.target.value}))} placeholder="₹35K–50K/mo" style={inp}/></FL>
              <FL label="Applicants"><input type="number" value={form.applicants} onChange={e=>setForm(f=>({...f,applicants:e.target.value}))} style={inp}/></FL>
              <FL label="Opened on"><input type="date" value={form.posted} onChange={e=>setForm(f=>({...f,posted:e.target.value}))} style={inp}/></FL>
              <div style={{gridColumn:"1/-1"}}><FL label="Skills"><input value={form.skills} onChange={e=>setForm(f=>({...f,skills:e.target.value}))} placeholder="GDS, ticketing, holiday packages" style={inp}/></FL></div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={postJob} disabled={create.isPending||vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...btnG,...(vo?{background:'#cfd6e4',color:'#6b7280',cursor:'not-allowed'}:{})}}>{create.isPending?"Posting…":"Post Job"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
