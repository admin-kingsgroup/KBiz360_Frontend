/* ════════════════════════════════════════════════════════════════════
   MODULES/OPERATIONS.JSX
   Auto-generated from KBiz360_v2.jsx · 399 lines · 3 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { AlertTriangle, Download, Plus, Save, Search } from 'lucide-react';
import { exportToCSV } from '../core/business-logic';
import { BOOKING_FILES_SEED, _BOOKING_FILES, _PASSPORTS, useDensity } from '../core/helpers';
import { useMobile } from '../core/hooks';
import { FL, bc, btnG, btnGh, card, inp } from '../core/styles';

export function BookingFiles({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const {density,pad,fs}=useDensity();

  const [files,setFiles]=useState(Object.values(BOOKING_FILES_SEED));
  const [modal,setModal]=useState(false);
  const [detail,setDetail]=useState(null);
  const [statusFilter,setStatusFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [form,setForm]=useState({client:"",module:"Holiday",dest:"",pax:1,travel:"",consultant:"Rahul M"});

  const STATUSES=["All","Proforma Sent","Deposit Received","Confirmed","Partially Paid","Fully Paid","Completed","Cancelled"];
  const STATUS_CLR={
    "Proforma Sent":"#5a6691","Deposit Received":"#185FA5","Confirmed":"#854F0B",
    "Partially Paid":"#1D9E75","Fully Paid":"#27500A","Completed":"#27500A","Cancelled":"#A32D2D"
  };
  const STATUS_BG={
    "Proforma Sent":"#f3f4f8","Deposit Received":"#E6F1FB","Confirmed":"#FAEEDA",
    "Partially Paid":"#EAF3DE","Fully Paid":"#EAF3DE","Completed":"#EAF3DE","Cancelled":"#FCEBEB"
  };

  const filtered=files.filter(f=>(
    (!brCode||f.branch===brCode)&&
    (statusFilter==="All"||f.status===statusFilter)&&
    (!search||f.id.includes(search)||f.client.toLowerCase().includes(search.toLowerCase())||f.dest.toLowerCase().includes(search.toLowerCase()))
  ));

  const totValue=filtered.reduce((s,f)=>s+f.totalValue,0);
  const totGP   =filtered.reduce((s,f)=>s+f.gp,0);
  const totPending=filtered.reduce((s,f)=>s+(f.totalValue-f.collected),0);

  const createFile=()=>{
    const brKey=form.branch||brCode||"BOM";
    const seq=(_bfSeq[brKey]||0)+1;
    _bfSeq[brKey]=seq;
    const id=`TK-${brKey}-2026-0${seq.toString().padStart(3,"0")}`;
    const f2={...form,id,branch:brKey,status:"Confirmed",advance:0,
      totalValue:0,collected:0,vouchers:[],gp:0};
    _BOOKING_FILES[id]=f2;
    setFiles(Object.values(_BOOKING_FILES));
    setModal(false);
  };

  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");
  const paidPct=file=>file.totalValue>0?Math.round(file.collected/file.totalValue*100):0;

  return (
    <div style={{padding:"12px 10px",maxWidth:1360,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📁</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Booking Files</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>
              Trip dockets linking all vouchers per booking · {filtered.length} files
            </p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="File no / client / dest..." style={{...inp,width:200,minHeight:32,fontSize:11}}/>
          <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> New File</button>
          <button onClick={()=>exportToCSV(filtered,["id","branch","client","module","dest","pax","travel","status","totalValue","collected","gp"],"booking-files.csv")}
            style={{...btnGh,fontSize:11}}><Download size={13}/> CSV</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[{l:"Total Files",v:String(filtered.length),c:"#384677",bg:"#f3f4f8"},
          {l:"Total Value",v:f(totValue),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Gross Profit",v:f(totGP),c:"#27500A",bg:"#EAF3DE"},
          {l:"Pending Collection",v:f(totPending),c:"#A32D2D",bg:"#FCEBEB"},
          {l:"GP%",v:`${totValue>0?Math.round(totGP/totValue*100):0}%`,c:"#854F0B",bg:"#FAEEDA"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:mob?17:21,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:fs,minWidth:900}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["File No.","Branch","Client","Module","Destination","Travel Date","Value","GP","Payment","Status","Vouchers","Action"].map((h,i)=>(
                <th key={i} style={{padding:pad,textAlign:i>=6&&i<=8?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((file,i)=>(
                <tr key={file.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa",cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f0f4ff"}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#fafafa"}
                  onClick={()=>setDetail(file)}>
                  <td style={{padding:pad,fontFamily:"monospace",fontSize:10,color:"#185FA5",fontWeight:700}}>{file.id}</td>
                  <td style={{padding:pad}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,background:"#EAF3DE",color:"#27500A",fontWeight:700}}>{file.branch}</span></td>
                  <td style={{padding:pad,fontWeight:600,color:"#0d1326"}}>{file.client}</td>
                  <td style={{padding:pad}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{file.module}</span></td>
                  <td style={{padding:pad,color:"#384677"}}>{file.dest}</td>
                  <td style={{padding:pad,color:"#5a6691",whiteSpace:"nowrap"}}>{file.travel}</td>
                  <td style={{padding:pad,textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{f(file.totalValue)}</td>
                  <td style={{padding:pad,textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:file.gp>0?"#27500A":"#A32D2D"}}>{f(file.gp)}</td>
                  <td style={{padding:pad,textAlign:"right",minWidth:100}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
                      <span style={{fontSize:10,fontWeight:700,color:paidPct(file)===100?"#27500A":"#854F0B"}}>{paidPct(file)}% paid</span>
                      <div style={{width:70,height:5,borderRadius:3,background:"#e1e3ec",overflow:"hidden"}}>
                        <div style={{width:`${paidPct(file)}%`,height:"100%",borderRadius:3,background:paidPct(file)===100?"#27500A":"#d4a437"}}/>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:pad}}>
                    <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,
                      background:STATUS_BG[file.status]||"#f3f4f8",color:STATUS_CLR[file.status]||"#5a6691",whiteSpace:"nowrap"}}>{file.status}</span>
                  </td>
                  <td style={{padding:pad,textAlign:"center",color:"#5a6691",fontSize:10}}>{file.vouchers.length}</td>
                  <td style={{padding:pad}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>setDetail(file)} style={{...btnGh,padding:"2px 8px",fontSize:9.5}}>Open</button>
                  </td>
                </tr>
              ))}
              {filtered.length===0&&<tr><td colSpan={12} style={{padding:"24px",textAlign:"center",color:"#5a6691"}}>No booking files found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {detail&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:640,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",background:"#0d1326",borderRadius:"14px 14px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0}}>
              <div>
                <p style={{margin:0,fontSize:14,fontWeight:800,color:"#d4a437"}}>{detail.id}</p>
                <p style={{margin:"2px 0 0",fontSize:10,color:"#8b94b3"}}>{detail.client} · {detail.dest} · {detail.travel}</p>
              </div>
              <button onClick={()=>setDetail(null)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#8b94b3"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
                {[{l:"Total Value",v:f(detail.totalValue)},{l:"Collected",v:f(detail.collected)},{l:"Balance",v:f(detail.totalValue-detail.collected)},
                  {l:"GP",v:f(detail.gp)},{l:"GP%",v:`${detail.totalValue>0?Math.round(detail.gp/detail.totalValue*100):0}%`},{l:"Pax",v:String(detail.pax)},
                ].map((k,i)=>(
                  <div key={i} style={{padding:"9px 12px",borderRadius:8,background:"#f3f4f8"}}>
                    <p style={{margin:0,fontSize:9,color:"#5a6691",textTransform:"uppercase"}}>{k.l}</p>
                    <p style={{margin:"2px 0 0",fontSize:15,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
                  </div>
                ))}
              </div>
              <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Linked Vouchers ({detail.vouchers.length})</p>
              {detail.vouchers.length>0
                ?<div style={{...card,padding:0,overflow:"hidden"}}>
                  {detail.vouchers.map((v,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                      padding:"9px 12px",borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                      <span style={{fontFamily:"monospace",fontSize:10.5,color:"#185FA5"}}>{v}</span>
                      <button onClick={()=>{setDetail(null);setRoute("/sales/flight");}} style={{...btnGh,padding:"2px 8px",fontSize:9.5}}>Open</button>
                    </div>
                  ))}
                </div>
                :<p style={{fontSize:11,color:"#5a6691"}}>No vouchers linked yet. Open individual modules to link to this file.</p>
              }
              <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
                {["Add Payment","Add Voucher","Cancel File","Print File"].map(a=>(
                  <button key={a} style={{...btnGh,padding:"5px 12px",fontSize:10.5}}>{a}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New file modal */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Create New Booking File</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <FL label="Client name"><input value={form.client} onChange={e=>setForm(f=>({...f,client:e.target.value}))} style={inp}/></FL>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Module"><select value={form.module} onChange={e=>setForm(f=>({...f,module:e.target.value}))} style={inp}>{["Flight","Holiday","Hotel","Car","Visa","Insurance","Misc","MICE"].map(m=><option key={m}>{m}</option>)}</select></FL>
                <FL label="Pax"><input type="number" value={form.pax} onChange={e=>setForm(f=>({...f,pax:+e.target.value}))} style={inp}/></FL>
              </div>
              <FL label="Destination"><input value={form.dest} onChange={e=>setForm(f=>({...f,dest:e.target.value}))} style={inp}/></FL>
              <FL label="Travel date"><input type="date" value={form.travel} onChange={e=>setForm(f=>({...f,travel:e.target.value}))} style={inp}/></FL>
              <FL label="Consultant"><select value={form.consultant} onChange={e=>setForm(f=>({...f,consultant:e.target.value}))} style={inp}>
                {["Rahul M","Priya S","Amit K","Neha P","Kevin O","Amina H","Sujeet"].map(c=><option key={c}>{c}</option>)}
              </select></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={createFile} style={btnG}>📁 Create File</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PHASE 3 — GROUP EXECUTIVE DASHBOARD  /group-dashboard
   ════════════════════════════════════════════════════════════════
*/

export function PassportManager({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:branch?.code;
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({client:"",person:"",passport:"",nationality:"Indian",issued:"",expiry:"",branch:"BOM"});
  const [passports,setPassports]=useState(_PASSPORTS);
  const TODAY="2026-05-19";

  const filtered=passports.filter(p=>(
    (!brCode||p.branch===brCode)&&
    (!search||p.person.toLowerCase().includes(search.toLowerCase())||p.client.toLowerCase().includes(search.toLowerCase())||p.passport.includes(search))
  ));

  const daysToExpiry=d=>Math.ceil((new Date(d)-new Date(TODAY))/(1000*60*60*24));
  const expStatus=d=>{const dl=daysToExpiry(d);return dl<0?"Expired":dl<90?"Expiring Soon":dl<180?"Expiring in 6mo":"Valid";};
  const STATUS_CLR={"Valid":"#27500A","Expiring in 6mo":"#1D9E75","Expiring Soon":"#854F0B","Expired":"#A32D2D","Visa Expiring":"#854F0B"};
  const STATUS_BG={"Valid":"#EAF3DE","Expiring in 6mo":"#EAF3DE","Expiring Soon":"#FAEEDA","Expired":"#FCEBEB","Visa Expiring":"#FAEEDA"};

  const expiringSoon=filtered.filter(p=>daysToExpiry(p.expiry)<180&&daysToExpiry(p.expiry)>0);

  return (
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🛂</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Passport & Document Manager</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Client passports · Visa stamps · Expiry alerts</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name / passport / client..." style={{...inp,width:220,minHeight:32,fontSize:11}}/>
          <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Add Passport</button>
        </div>
      </div>

      {expiringSoon.length>0&&(
        <div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:10.5,color:"#854F0B",fontWeight:600,display:"flex",gap:8,alignItems:"center"}}>
          <AlertTriangle size={15}/>
          {expiringSoon.length} passport{expiringSoon.length>1?"s":""} expiring within 6 months:
          {expiringSoon.map(p=><span key={p.id} style={{marginLeft:6,padding:"1px 7px",borderRadius:999,background:"#854F0B",color:"#fff",fontSize:9.5}}>{p.person} ({daysToExpiry(p.expiry)}d)</span>)}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[{l:"Total Passports",v:String(filtered.length),c:"#384677",bg:"#f3f4f8"},
          {l:"Valid",v:String(filtered.filter(p=>daysToExpiry(p.expiry)>=180).length),c:"#27500A",bg:"#EAF3DE"},
          {l:"Expiring <6mo",v:String(filtered.filter(p=>daysToExpiry(p.expiry)<180&&daysToExpiry(p.expiry)>0).length),c:"#854F0B",bg:"#FAEEDA"},
          {l:"Expired",v:String(filtered.filter(p=>daysToExpiry(p.expiry)<=0).length),c:"#A32D2D",bg:"#FCEBEB"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Person","Client","Passport No.","Nationality","Issued","Expiry","Days Left","Visas in Passport","Branch","Status"].map((h,i)=>(
              <th key={i} style={{padding:"9px 11px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((p,i)=>{
            const dl=daysToExpiry(p.expiry);
            const st=expStatus(p.expiry);
            return (
              <tr key={p.id} style={{borderBottom:"1px solid #f3f4f8",background:dl<0?"#fff5f5":dl<90?"#fffaf0":i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 11px",fontWeight:600,color:"#0d1326"}}>{p.person}</td>
                <td style={{padding:"8px 11px",color:"#384677"}}>{p.client}</td>
                <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:10,color:"#185FA5",fontWeight:700}}>{p.passport}</td>
                <td style={{padding:"8px 11px",color:"#5a6691"}}>{p.nationality}</td>
                <td style={{padding:"8px 11px",color:"#5a6691",whiteSpace:"nowrap"}}>{p.issued}</td>
                <td style={{padding:"8px 11px",color:dl<90?"#A32D2D":dl<180?"#854F0B":"#5a6691",fontWeight:dl<180?700:400,whiteSpace:"nowrap"}}>{p.expiry}</td>
                <td style={{padding:"8px 11px",fontWeight:700,color:dl<0?"#A32D2D":dl<90?"#854F0B":"#27500A"}}>{dl<0?`${Math.abs(dl)}d EXPIRED`:`${dl}d`}</td>
                <td style={{padding:"8px 11px",fontSize:10,color:"#5a6691",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis"}}>{p.visas.length>0?p.visas.join(" · "):"None"}</td>
                <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 6px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{p.branch}</span></td>
                <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[st]||"#f3f4f8",color:STATUS_CLR[st]||"#5a6691"}}>{st}</span></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Add Passport Record</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Person name"><input value={form.person} onChange={e=>setForm(f=>({...f,person:e.target.value}))} style={inp}/></FL>
                <FL label="Client account"><input value={form.client} onChange={e=>setForm(f=>({...f,client:e.target.value}))} style={inp}/></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Passport number"><input value={form.passport} onChange={e=>setForm(f=>({...f,passport:e.target.value}))} style={{...inp,fontFamily:"monospace",textTransform:"uppercase"}}/></FL>
                <FL label="Nationality"><input value={form.nationality} onChange={e=>setForm(f=>({...f,nationality:e.target.value}))} style={inp}/></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Issue date"><input type="date" value={form.issued} onChange={e=>setForm(f=>({...f,issued:e.target.value}))} style={inp}/></FL>
                <FL label="Expiry date"><input type="date" value={form.expiry} onChange={e=>setForm(f=>({...f,expiry:e.target.value}))} style={inp}/></FL>
              </div>
              <FL label="Branch"><select value={form.branch} onChange={e=>setForm(f=>({...f,branch:e.target.value}))} style={inp}>{["TKHO","BOM","AMD","NBO","DAR","FBM"].map(b=><option key={b}>{b}</option>)}</select></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={()=>{
                const id=`PP${String(passports.length+1).padStart(3,"0")}`;
                const st=expStatus(form.expiry);
                setPassports(p=>[{...form,id,visas:[],type:"B2C",dob:"",status:st},...p]);
                setModal(false);
              }} style={btnG}>💾 Save Passport</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── ITEM 8: AIR TICKET CONTROL REGISTER  /purchase/ticket-control ── */

export function DocumentManager({branch}){
  const mob=useMobile();
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("All");
  const DOCS=[
    {id:"DOC001",name:"Sharma Bali Passport Scan.pdf",type:"Passport",client:"Sharma Enterprises",booking:"BOM/1726/SH00012",size:"1.2 MB",date:"2026-05-15",tags:["Passport","Bali"]},
    {id:"DOC002",name:"TechCorp_MICE_Proposal.pdf",type:"Proposal",client:"TechCorp MICE",booking:"ENQ-BOM-002",size:"3.4 MB",date:"2026-05-18",tags:["MICE","Proposal"]},
    {id:"DOC003",name:"Visa_Application_Patel.pdf",type:"Visa Application",client:"Patel Exports",booking:"BOM/1726/SV00008",size:"0.8 MB",date:"2026-05-12",tags:["Visa","Application"]},
    {id:"DOC004",name:"Air_India_Invoice.pdf",type:"Supplier Invoice",client:"—",booking:"BOM/1726/PF00022",size:"0.5 MB",date:"2026-05-10",tags:["Invoice","Airline"]},
    {id:"DOC005",name:"Marriott_Confirmation.pdf",type:"Hotel Voucher",client:"Sharma Enterprises",booking:"BOM/1726/SH00012",size:"0.3 MB",date:"2026-05-15",tags:["Hotel","Confirmation"]},
  ];
  const types=["All",...new Set(DOCS.map(d=>d.type))];
  const filtered=DOCS.filter(d=>(filter==="All"||d.type===filter)&&(!search||d.name.toLowerCase().includes(search.toLowerCase())||d.client.toLowerCase().includes(search.toLowerCase())));
  const TYPE_ICONS={"Passport":"🛂","Proposal":"📋","Visa Application":"📄","Supplier Invoice":"🧾","Hotel Voucher":"🏨","Other":"📁"};
  const TYPE_CLR={"Passport":"#185FA5","Proposal":"#854F0B","Visa Application":"#1D9E75","Supplier Invoice":"#A32D2D","Hotel Voucher":"#27500A"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📁</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Document Manager</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{filtered.length} documents · Link to bookings · Passport scans · Visa applications</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents..." style={{...inp,width:200,minHeight:32,fontSize:11}}/>
          <button style={{...btnG,fontSize:11}}>📎 Upload Document</button>
        </div>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto"}}>
        {types.map(t=><button key={t} onClick={()=>setFilter(t)} style={{...filter===t?btnG:btnGh,fontSize:10.5,padding:"4px 12px",flexShrink:0}}>{t}</button>)}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:10}}>
        {filtered.map(d=>(
          <div key={d.id} style={{...card,padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
              <span style={{fontSize:22,flexShrink:0}}>{TYPE_ICONS[d.type]||"📄"}</span>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontSize:11,fontWeight:600,color:"#0d1326",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</p>
                <span style={{fontSize:9.5,padding:"1px 6px",borderRadius:999,fontWeight:700,background:(TYPE_CLR[d.type]||"#384677")+"22",color:TYPE_CLR[d.type]||"#384677"}}>{d.type}</span>
              </div>
            </div>
            <div style={{fontSize:10.5,color:"#5a6691"}}>
              {d.client!=="—"&&<p style={{margin:"0 0 2px"}}>👤 {d.client}</p>}
              {d.booking&&<p style={{margin:"0 0 2px",fontFamily:"monospace",fontSize:9.5,color:"#185FA5"}}>{d.booking}</p>}
              <p style={{margin:0}}>{d.date} · {d.size}</p>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button style={{...btnGh,fontSize:9.5,padding:"3px 9px",flex:1}}>👁 View</button>
              <button style={{...btnGh,fontSize:9.5,padding:"3px 9px",flex:1}}><Download size={11}/> Download</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── BUDGET PLANNING ──────────────────────────────────────────── */
