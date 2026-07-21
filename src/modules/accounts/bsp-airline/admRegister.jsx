/* ════════════════════════════════════════════════════════════════
   ADM REGISTER  /purchase/adm
   Agent Debit Memos — airlines debit the agency via BSP · 30-day dispute window
   ════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { AlertTriangle, ChevronDown, Plus, Search } from 'lucide-react';
import { BRANCH_CODES, branchCurrencies, branchMainCurrency } from '../../../core/data';
import { useAdmReasonCodes } from '../../../core/useReference';
import { useAdmMemos, useCreateAdmMemo, useDisputeAdmMemo, useAcceptAdmMemo, useRejectAdmMemo, useReverseAdmMemo } from '../../../core/useAdmMemos';
import { toast } from '../../../core/ux/toast';
import { confirmDialog } from '../../../core/ux/confirm';
import { useModalEsc } from '../../../core/ux/useModalEsc';
import { Menu as StatusMenu } from '../../../core/ux/Menu';
import { todayISO } from '../../../core/dates';
import { useMobile } from '../../../core/hooks';
import { FL, bc, btnG, btnGh, card, inp } from '../../../core/styles';
import { localeOf } from '../../../core/format';
// Leaf, test-safe view-only read (NOT core/api — no import.meta) to gate the raw write buttons.
import { isViewOnly, VIEW_ONLY_REASON } from '../../../shell/primitives';

export function AdmRegister({branch}){
  const mob=useMobile();
  const ADM_REASON_CODES=useAdmReasonCodes().data||{};   // DB-backed (/api/adm-reason-codes)
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  // View-only user: write (accept/reject/reverse/record/file-dispute) buttons are pre-disabled
  // with a reason — never a live no-op that only 403s. Collapses to the original when vo is false.
  const vo=isViewOnly();

  // Live DB-backed register (/api/adm-memos?kind=adm). Accept spawns a PENDING
  // gated ADM voucher into the approval queue (source: 'adm-register').
  const memosQ=useAdmMemos("adm",branch);
  const createM=useCreateAdmMemo();
  const disputeM=useDisputeAdmMemo();
  const acceptM=useAcceptAdmMemo();
  const rejectM=useRejectAdmMemo();
  const reverseM=useReverseAdmMemo();
  // Keep the DB _id as `rid` for id-addressed actions (accept/reject/dispute/reverse hit
  // /api/adm-memos/:id which validates an ObjectId); `id` stays the memoNo for display/search.
  const adms=(memosQ.data||[]).map(m=>({...m,rid:m.id,id:m.memoNo,iataNum:m.iataNum||""}));

  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [disputeModal,setDisputeModal]=useState(null);
  const [disputeNote,setDisputeNote]=useState("");
  const [statusFilter,setStatusFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [form,setForm]=useState({airline:"Air India",airlineCode:"AI",ticketNo:"",passenger:"",
    sector:"",reasonCode:"FD",amount:0,currency:(brCode&&branchMainCurrency(brCode))||"INR",branch:brCode||"BOM",consultant:"",remarks:""});

  const TODAY=todayISO();
  const daysLeft=(deadline)=>deadline?Math.ceil((new Date(deadline)-new Date(TODAY))/(1000*60*60*24)):0;

  const filtered=adms.filter(a=>(
    (statusFilter==="All"||a.status===statusFilter)&&
    (!search||(a.id||"").toLowerCase().includes(search.toLowerCase())||
     (a.airline||"").toLowerCase().includes(search.toLowerCase())||
     (a.passenger||"").toLowerCase().includes(search.toLowerCase())||
     (a.ticketNo||"").includes(search))
  ));

  // Backend dispute lifecycle: Received → Disputed → Accepted (spawns voucher) / Rejected.
  const STATUSES=["All","Received","Disputed","Accepted","Rejected"];
  const STATUS_CLR={Received:"#2563eb",Disputed:"#dc2626",Accepted:"#16a34a",Rejected:"#5b616e"};
  const STATUS_BG={Received:"#e8f0ff",Disputed:"#fbe9e9",Accepted:"#e8f6ed",Rejected:"#f4f5f7"};

  const totPending=filtered.filter(a=>!["Accepted","Rejected"].includes(a.status))
    .reduce((s,a)=>s+(a.amount||0),0);
  const totAccepted=filtered.filter(a=>a.status==="Accepted").reduce((s,a)=>s+(a.amount||0),0);
  const overdue   =filtered.filter(a=>!["Accepted","Rejected","Disputed"].includes(a.status)&&a.responseDeadline&&daysLeft(a.responseDeadline)<0);
  const f=n=>cur+Number(Math.round(n)).toLocaleString(localeOf(cur));

  const addAdm=()=>{
    createM.mutate({kind:"adm",...form,branch:form.branch},{
      onSuccess:()=>{setModal(false); toast("ADM recorded");},
      onError:(e)=>toast("Could not record — "+e.message,"error"),
    });
  };

  const acceptAdm=(m)=>acceptM.mutate({id:m.rid},{
    onSuccess:(r)=>toast(`ADM accepted — voucher ${(r&&(r.voucherVno||(r.voucher&&r.voucher.vno)))||""} created (pending approval)`),
    onError:(e)=>toast("Could not accept — "+e.message,"error"),
  });
  const rejectAdm=(m)=>rejectM.mutate({id:m.rid},{onSuccess:()=>toast("ADM rejected"),onError:(e)=>toast(e.message,"error")});
  // Reverse (un-accept): a locked ADM leg can't be revoked/edited/deleted directly, so the
  // memo drives the reverse-out — un-posts its voucher (viaMaster) and returns to Received.
  // Requires a reason (it touches real books).
  const reverseAdm=async(m)=>{
    const {confirmed,reason}=await confirmDialog({title:`Reverse ${m.id}?`,message:`This un-accepts the memo and reverses its voucher ${m.voucherVno||""} out of the books (memo returns to Received; the voucher number is retired).`,danger:true,reasonRequired:true,reasonLabel:"Reason for reversal",confirmLabel:"Reverse"});
    if(!confirmed)return;
    reverseM.mutate({id:m.rid,reason},{onSuccess:()=>toast(`ADM ${m.id} reversed — voucher un-posted`),onError:(e)=>toast("Could not reverse — "+e.message,"error")});
  };

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#fbe9e9",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:22}}>📩</span>
          </div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>ADM Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>
              Agent Debit Memos · Airlines debit the agency via BSP · 30-day dispute window
            </p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,background:"#f4f5f7",border:"1px solid #e3e6eb",borderRadius:10,padding:4,boxShadow:"0 1px 2px rgba(16,18,22,0.04)"}}>
            <div style={{position:"relative"}}>
              <Search size={12} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#9aa1ab"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="ADM no / airline / ticket / passenger..."
                style={{...inp,width:220,minHeight:32,fontSize:11,paddingLeft:26,paddingRight:search?22:10,border:"none",background:"#fff",borderRadius:7}}/>
              {search&&(
                <button onClick={()=>setSearch("")} aria-label="Clear search"
                  style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",border:"none",background:"none",cursor:"pointer",color:"#9aa1ab",fontSize:14,lineHeight:1,padding:2}}>×</button>
              )}
            </div>
            <StatusMenu
              ariaLabel="Filter by status"
              menuRole="listbox"
              width={150}
              items={STATUSES.map(s=>({key:s,label:s,selected:s===statusFilter,onSelect:()=>setStatusFilter(s)}))}
              renderTrigger={({ref,toggle,triggerProps})=>(
                <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                  style={{...inp,display:"flex",alignItems:"center",gap:6,width:"auto",minHeight:32,fontSize:11,paddingRight:10,paddingLeft:10,border:"none",background:"#fff",borderRadius:7,fontWeight:600,color:"#2e323c",cursor:"pointer"}}>
                  {statusFilter}
                  <ChevronDown size={12} style={{color:"#5b616e"}}/>
                </button>
              )}
            />
          </div>
          <button onClick={()=>setModal(true)} style={{...btnG,background:"#dc2626",fontSize:11}}>
            <Plus size={13}/> New ADM
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Total ADMs",        v:String(filtered.length),              c:"#2563eb",bg:"#e8f0ff"},
          {l:"Pending / Disputed",v:f(totPending),                        c:"#dc2626",bg:"#fbe9e9"},
          {l:"Accepted (posted)", v:f(totAccepted),                       c:"#16a34a",bg:"#e8f6ed"},
          {l:"Overdue (>deadline)",v:String(overdue.length),              c:overdue.length>0?"#7B1F1F":"#16a34a",bg:overdue.length>0?"#fbe9e9":"#e8f6ed"},
          {l:"Under Dispute",      v:String(adms.filter(a=>a.status==="Disputed").length),c:"#d97706",bg:"#fbeedb"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase",letterSpacing:"0.5px"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:mob?18:22,fontWeight:800,color:"#1a1c22"}}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdue.length>0&&(
        <div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#fbe9e9",
          border:"1px solid #f3c9c9",fontSize:10.5,color:"#dc2626",fontWeight:600,
          display:"flex",alignItems:"center",gap:8}}>
          <AlertTriangle size={15}/>
          {overdue.length} ADM{overdue.length>1?"s":""} past the 30-day dispute deadline
          — will be auto-debited from BSP next settlement:
          {overdue.map(a=><span key={a.id} style={{marginLeft:8,padding:"1px 7px",borderRadius:999,background:"#dc2626",color:"#fff",fontSize:9.5}}>{a.id}</span>)}
        </div>
      )}

      {/* ADM table */}
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:1100}}>
            <thead>
              <tr style={{background:"#1a1c22"}}>
                {["ADM Number","Date","Airline","Ticket No.","PAX Name","Sector","Reason","Amount","Deadline","Status","Actions"].map((h,i)=>(
                  <th key={i} style={{padding:"9px 10px",textAlign:i===7?"right":"left",
                    color:"#c2a04a",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a,i)=>{
                const dl=daysLeft(a.responseDeadline);
                const isOverdue=dl<0&&!["Accepted","Rejected","Disputed"].includes(a.status);
                const isUrgent=dl>=0&&dl<=7&&!["Accepted","Rejected","Disputed"].includes(a.status);
                const rc=ADM_REASON_CODES[a.reasonCode]||{code:a.reasonCode,label:a.reasonCode,desc:""};
                return (
                  <tr key={a.id} style={{borderBottom:"1px solid #dfe2e7",
                    background:isOverdue?"#fff5f5":isUrgent?"#fffaf0":i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"8px 10px"}}>
                      <p style={{margin:0,fontFamily:"monospace",fontSize:10,color:"#dc2626",fontWeight:700}}>{a.id}</p>
                      <p style={{margin:0,fontSize:8.5,color:"#5b616e"}}>{a.date}</p>
                    </td>
                    <td style={{padding:"8px 10px"}}>
                      <p style={{margin:0,fontWeight:700,color:"#1a1c22"}}>{a.airline}</p>
                      <p style={{margin:0,fontSize:9,color:"#5b616e"}}>IATA {a.iataNum}</p>
                    </td>
                    <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:10,color:"#2563eb"}}>{a.ticketNo||"—"}</td>
                    <td style={{padding:"8px 10px",fontWeight:600,color:"#2e323c",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.passenger||"—"}</td>
                    <td style={{padding:"8px 10px",color:"#5b616e",whiteSpace:"nowrap"}}>{a.sector||"—"}</td>
                    <td style={{padding:"8px 10px"}}>
                      <p style={{margin:0,fontSize:10,fontWeight:700,color:"#d97706"}}>{rc.code} — {rc.label}</p>
                      <p style={{margin:0,fontSize:8.5,color:"#5b616e",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={a.remarks}>{a.remarks}</p>
                    </td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,fontVariantNumeric:"tabular-nums",
                      color:"#dc2626",fontSize:13}}>{a.currency}{Number(a.amount).toLocaleString()}</td>
                    <td style={{padding:"8px 10px"}}>
                      {["Accepted","Rejected"].includes(a.status)
                        ?<p style={{margin:0,fontSize:10,color:"#16a34a"}}>{a.status==="Accepted"?`✔ ${a.voucherVno||"posted"}`:"—"}</p>
                        :<div>
                          <p style={{margin:0,fontSize:10,fontWeight:700,color:isOverdue?"#dc2626":isUrgent?"#d97706":"#2e323c"}}>
                            {isOverdue?`${Math.abs(dl)} days OVERDUE`:isUrgent?`${dl} days left`:`${dl} days`}
                          </p>
                          <p style={{margin:0,fontSize:8.5,color:"#5b616e"}}>Due: {a.responseDeadline}</p>
                        </div>
                      }
                    </td>
                    <td style={{padding:"8px 10px"}}>
                      <span style={{fontSize:9.5,padding:"3px 8px",borderRadius:999,fontWeight:700,
                        background:STATUS_BG[a.status]||"#f4f5f7",color:STATUS_CLR[a.status]||"#5b616e"}}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{padding:"8px 10px"}}>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {["Received","Disputed"].includes(a.status)&&(
                          <button onClick={()=>{setDisputeNote("");setDisputeModal(a);}} style={{...btnG,padding:"2px 7px",fontSize:9,background:"#dc2626",whiteSpace:"nowrap"}}>Dispute</button>
                        )}
                        {["Received","Disputed"].includes(a.status)&&(
                          <button onClick={()=>acceptAdm(a)} disabled={acceptM.isPending||vo} title={vo?VIEW_ONLY_REASON:"Accept → create a pending ADM voucher"} style={{...btnG,padding:"2px 7px",fontSize:9,background:"#16a34a",whiteSpace:"nowrap",...(vo?{background:"#cfd6e4",color:"#6b7280",cursor:"not-allowed"}:{})}}>Accept → Voucher</button>
                        )}
                        {a.status==="Disputed"&&<button onClick={()=>rejectAdm(a)} disabled={vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...btnGh,padding:"2px 7px",fontSize:9,whiteSpace:"nowrap",...(vo?{background:"#cfd6e4",color:"#6b7280",cursor:"not-allowed"}:{})}}>Reject</button>}
                        {a.status==="Accepted"&&a.voucherVno&&<span style={{fontSize:9,color:"#16a34a",fontWeight:700}}>→ {a.voucherVno}</span>}
                        {a.status==="Accepted"&&<button onClick={()=>reverseAdm(a)} disabled={reverseM.isPending||vo} title={vo?VIEW_ONLY_REASON:"Reverse (un-accept) → un-post the voucher, memo back to Received"} style={{...btnGh,padding:"2px 7px",fontSize:9,color:"#dc2626",borderColor:"#dc2626",whiteSpace:"nowrap",...(vo?{background:"#cfd6e4",color:"#6b7280",cursor:"not-allowed"}:{})}}>↺ Reverse</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length===0&&(
                <tr><td colSpan={11} style={{padding:"28px",textAlign:"center",color:"#5b616e"}}>No ADMs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info box */}
      <div style={{marginTop:12,padding:"10px 14px",borderRadius:9,background:"#e8f0ff",border:"1px solid #cfe0f8",fontSize:10,color:"#2563eb"}}>
        <b>ADM Process:</b> Airline raises ADM via BSP Link → Agency receives notification → 30-day window to dispute or accept →
        If no response within 30 days, ADM is auto-accepted and debited from next BSP settlement →
        If disputed, airline must respond within 60 days → Unresolved disputes escalate to IATA.
        Always dispute with documentary evidence (fare quote, waiver approval, correspondence).
      </div>

      {/* New ADM modal */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:560,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",position:"sticky",top:0,background:"#1a1c22",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#c2a04a"}}>Record New ADM</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#9197a3"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:10}}>
                <FL label="Airline name"><input value={form.airline} onChange={e=>setForm(f=>({...f,airline:e.target.value}))} style={inp} placeholder="Air India"/></FL>
                <FL label="Airline code (2-letter)"><input value={form.airlineCode} onChange={e=>setForm(f=>({...f,airlineCode:e.target.value.toUpperCase()}))} style={{...inp,fontFamily:"monospace"}} placeholder="AI" maxLength={2}/></FL>
              </div>
              <FL label="Ticket number"><input value={form.ticketNo} onChange={e=>setForm(f=>({...f,ticketNo:e.target.value}))} style={{...inp,fontFamily:"monospace"}} placeholder="098-1234567890"/></FL>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:10}}>
                <FL label="Passenger name"><input value={form.passenger} onChange={e=>setForm(f=>({...f,passenger:e.target.value}))} style={inp}/></FL>
                <FL label="Sector"><input value={form.sector} onChange={e=>setForm(f=>({...f,sector:e.target.value}))} style={inp} placeholder="BOM-DXB"/></FL>
              </div>
              <FL label="Reason code">
                <select value={form.reasonCode} onChange={e=>setForm(f=>({...f,reasonCode:e.target.value}))} style={inp}>
                  {Object.values(ADM_REASON_CODES).map(r=><option key={r.code} value={r.code}>{r.code} — {r.label}</option>)}
                </select>
              </FL>
              <div style={{padding:"8px 12px",borderRadius:8,background:"#fbeedb",fontSize:9.5,color:"#d97706"}}>
                {ADM_REASON_CODES[form.reasonCode]?.desc}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:10}}>
                <FL label="ADM amount"><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:+e.target.value}))} style={inp}/></FL>
                <FL label="Currency"><select value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))} style={inp}>{branchCurrencies(form.branch).map(c=><option key={c}>{c}</option>)}</select></FL>
                <FL label="Branch"><select value={form.branch} onChange={e=>setForm(f=>({...f,branch:e.target.value,currency:branchMainCurrency(e.target.value)}))} style={inp}>{BRANCH_CODES.map(b=><option key={b}>{b}</option>)}</select></FL>
              </div>
              <FL label="Remarks / Airline explanation"><textarea value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}}/></FL>
              <div style={{padding:"9px 12px",borderRadius:8,background:"#fbe9e9",border:"1px solid #f3c9c9",fontSize:9.5,color:"#dc2626",fontWeight:600}}>
                Response deadline: 30 days from today — {new Date(Date.now()+30*86400000).toISOString().slice(0,10)}. Failure to dispute = auto-accepted and BSP debit raised.
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8,position:"sticky",bottom:0,background:"#fff"}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={addAdm} disabled={vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...btnG,background:"#dc2626",...(vo?{background:"#cfd6e4",color:"#6b7280",cursor:"not-allowed"}:{})}}>💾 Record ADM</button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute modal */}
      {disputeModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",background:"#fbe9e9",borderRadius:"14px 14px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#dc2626"}}>Dispute ADM — {disputeModal.id}</p>
                <p style={{margin:"2px 0 0",fontSize:10,color:"#dc2626"}}>{disputeModal.airline} · {disputeModal.currency}{Number(disputeModal.amount).toLocaleString()} · Due {disputeModal.responseDeadline}</p>
              </div>
              <button onClick={()=>setDisputeModal(null)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#dc2626"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{padding:"9px 12px",borderRadius:8,background:"#fbeedb",fontSize:10,color:"#d97706"}}>
                <b>Reason raised:</b> {ADM_REASON_CODES[disputeModal.reasonCode]?.label} — {disputeModal.remarks}
              </div>
              <FL label="Dispute grounds (detailed explanation)">
                <textarea rows={4} value={disputeNote} onChange={e=>setDisputeNote(e.target.value)} style={{...inp,resize:"vertical"}}
                  placeholder="e.g. Fare was correctly issued as per published fare BOM-DXB Y class dated 05-Mar-2026. Attaching fare quote from Amadeus GDS and booking confirmation. Commission per our PLACI Level 4 agreement dated 01-Apr-2025 signed by Area Manager..."/>
              </FL>
              <FL label="Documents attached">
                <input style={inp} placeholder="e.g. Amadeus fare quote, PLACI agreement, approval email"/>
              </FL>
              <div style={{padding:"9px 12px",borderRadius:8,background:"#e8f0ff",fontSize:9.5,color:"#2563eb",fontWeight:600}}>
                Dispute will be filed via BSP Link within 24 hours. Airline has 60 days to respond. Track status in ADM Register.
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setDisputeModal(null)} style={btnGh}>Cancel</button>
              <button disabled={disputeM.isPending||vo} title={vo?VIEW_ONLY_REASON:undefined} onClick={()=>{
                disputeM.mutate({id:disputeModal.rid,note:disputeNote||"Dispute filed via BSP Link — awaiting airline response"},{
                  onSuccess:()=>{setDisputeModal(null);toast("Dispute filed");},
                  onError:(e)=>toast("Could not file dispute — "+e.message,"error"),
                });
              }} style={{...btnG,background:"#dc2626",opacity:disputeM.isPending?0.6:1,cursor:disputeM.isPending?"not-allowed":"pointer",...(vo?{background:"#cfd6e4",color:"#6b7280",cursor:"not-allowed"}:{})}}>{disputeM.isPending?"📨 Filing…":"📨 File Dispute"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
