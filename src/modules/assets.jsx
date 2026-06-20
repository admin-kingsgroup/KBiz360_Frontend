/* ════════════════════════════════════════════════════════════════════
   MODULES/ASSETS.JSX
   Auto-generated from KBiz360_v2.jsx · 547 lines · 5 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Plus, Printer } from 'lucide-react';
import { Line } from 'recharts';
import { fmt } from '../core/format';
import { ACM_REASON_CODES } from '../core/helpers';
import { useAssetCategories } from '../core/useReference';
import { useMasterList } from '../core/useMasters';
import { useAdmMemos, useCreateAdmMemo, useAcceptAdmMemo, useRejectAdmMemo, useDisputeAdmMemo } from '../core/useAdmMemos';
import { toast } from '../core/ux/toast';
import { BRANCH_CODES, branchCurrencies, branchMainCurrency } from '../core/data';
import { useMobile } from '../core/hooks';
import { useModalEsc } from '../core/ux/useModalEsc';
import { FL, bc, btnG, btnGh, card, inp } from '../core/styles';
import { SampleBanner } from '../core/ux/SampleBanner';

export function AcmRegister({branch}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;

  // Live DB-backed register (/api/adm-memos?kind=acm). Accept spawns a PENDING
  // gated ACM voucher into the approval queue (source: 'acm-register').
  const memosQ=useAdmMemos("acm",branch);
  const createM=useCreateAdmMemo();
  const acceptM=useAcceptAdmMemo();
  const rejectM=useRejectAdmMemo();
  const disputeM=useDisputeAdmMemo();
  const acms=(memosQ.data||[]).map(m=>({...m,id:m.memoNo,iataNum:m.iataNum||"",bspCreditDate:m.bspDebitDate||""}));

  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [statusFilter,setStatusFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [form,setForm]=useState({airline:"Air India",airlineCode:"AI",ticketNo:"",
    reasonCode:"RC",amount:0,currency:"INR",branch:brCode||"BOM",remarks:""});

  const filtered=acms.filter(a=>(
    (statusFilter==="All"||a.status===statusFilter)&&
    (!search||(a.id||"").toLowerCase().includes(search.toLowerCase())||
     (a.airline||"").toLowerCase().includes(search.toLowerCase()))
  ));

  // Backend lifecycle: Received → Disputed → Accepted (spawns voucher) / Rejected.
  const STATUSES=["All","Received","Disputed","Accepted","Rejected"];
  const STATUS_CLR={Received:"#185FA5",Disputed:"#A32D2D",Accepted:"#27500A",Rejected:"#5a6691"};
  const STATUS_BG ={Received:"#E6F1FB",Disputed:"#FCEBEB",Accepted:"#EAF3DE",Rejected:"#f3f4f8"};

  const totPending =filtered.filter(a=>!["Accepted","Rejected"].includes(a.status)).reduce((s,a)=>s+(a.amount||0),0);
  const totAccepted=filtered.filter(a=>a.status==="Accepted").reduce((s,a)=>s+(a.amount||0),0);
  const f=n=>cur+Number(Math.round(n)).toLocaleString("en-IN");

  const addAcm=()=>{
    createM.mutate({kind:"acm",...form,branch:form.branch},{
      onSuccess:()=>{setModal(false);toast("ACM recorded");},
      onError:(e)=>toast("Could not record — "+e.message,"error"),
    });
  };

  const acceptAcm=(m)=>acceptM.mutate({id:m.id},{
    onSuccess:(r)=>toast(`ACM accepted — voucher ${(r&&(r.voucherVno||(r.voucher&&r.voucher.vno)))||""} created (pending approval)`),
    onError:(e)=>toast("Could not accept — "+e.message,"error"),
  });
  const rejectAcm=(m)=>rejectM.mutate({id:m.id},{onSuccess:()=>toast("ACM rejected"),onError:(e)=>toast(e.message,"error")});

  return (
    <div style={{padding:"12px 10px",maxWidth:1300,margin:"0 auto"}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:22}}>📨</span>
          </div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>ACM Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>
              Agent Credit Memos · Airline credits to the agency via BSP · Refunds, incentives, ADM reversals
            </p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ACM no / airline..."
            style={{...inp,width:200,minHeight:32,fontSize:11}}/>
          <button onClick={()=>setModal(true)} style={{...btnG,background:"#27500A",fontSize:11}}>
            <Plus size={13}/> Record ACM
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Total ACMs",         v:String(filtered.length),   c:"#185FA5",bg:"#E6F1FB"},
          {l:"Pending Credit",     v:f(totPending),             c:"#854F0B",bg:"#FAEEDA"},
          {l:"Accepted (posted)",  v:f(totAccepted),            c:"#27500A",bg:"#EAF3DE"},
          {l:"ADM Reversals",      v:String(acms.filter(a=>a.reasonCode==="AR").length),c:"#1D9E75",bg:"#EAF3DE"},
          {l:"Incentive Credits",  v:String(acms.filter(a=>["IC","CA"].includes(a.reasonCode)).length),c:"#185FA5",bg:"#E6F1FB"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase",letterSpacing:"0.5px"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:mob?18:22,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* ACM table */}
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:950}}>
            <thead>
              <tr style={{background:"#0d1326"}}>
                {["ACM Number","Date","Airline","Ticket / Reference","Reason","Amount","BSP Credit Date","Status","Actions"].map((h,i)=>(
                  <th key={i} style={{padding:"9px 10px",textAlign:i===5?"right":"left",
                    color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a,i)=>{
                const rc=ACM_REASON_CODES[a.reasonCode]||{label:a.reasonCode};
                return (
                  <tr key={a.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"8px 10px"}}>
                      <p style={{margin:0,fontFamily:"monospace",fontSize:10,color:"#27500A",fontWeight:700}}>{a.id}</p>
                      <p style={{margin:0,fontSize:8.5,color:"#5a6691"}}>{a.date}</p>
                    </td>
                    <td style={{padding:"8px 10px"}}>
                      <p style={{margin:0,fontWeight:700,color:"#0d1326"}}>{a.airline}</p>
                      <p style={{margin:0,fontSize:9,color:"#5a6691"}}>IATA {a.iataNum}</p>
                    </td>
                    <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{a.ticketNo||a.passenger||"—"}</td>
                    <td style={{padding:"8px 10px"}}>
                      <p style={{margin:0,fontSize:10,fontWeight:700,color:"#1D9E75"}}>{rc.code} — {rc.label}</p>
                      <p style={{margin:0,fontSize:8.5,color:"#5a6691",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={a.remarks}>{a.remarks}</p>
                    </td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,fontVariantNumeric:"tabular-nums",color:"#27500A",fontSize:13}}>
                      +{a.currency}{Number(a.amount).toLocaleString()}
                    </td>
                    <td style={{padding:"8px 10px",fontSize:10.5,color:"#5a6691"}}>{a.bspCreditDate}</td>
                    <td style={{padding:"8px 10px"}}>
                      <span style={{fontSize:9.5,padding:"3px 8px",borderRadius:999,fontWeight:700,
                        background:STATUS_BG[a.status]||"#f3f4f8",color:STATUS_CLR[a.status]||"#5a6691"}}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{padding:"8px 10px"}}>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {["Received","Disputed"].includes(a.status)&&(
                          <button onClick={()=>acceptAcm(a)} disabled={acceptM.isPending} title="Accept → create a pending ACM voucher" style={{...btnG,padding:"2px 7px",fontSize:9,background:"#27500A",whiteSpace:"nowrap"}}>Accept → Voucher</button>
                        )}
                        {a.status==="Received"&&<button onClick={()=>disputeM.mutate({id:a.id,note:"Query raised on credit"},{onSuccess:()=>toast("Query raised")})} style={{...btnGh,padding:"2px 7px",fontSize:9}}>Query</button>}
                        {a.status==="Disputed"&&<button onClick={()=>rejectAcm(a)} style={{...btnGh,padding:"2px 7px",fontSize:9}}>Reject</button>}
                        {a.status==="Accepted"&&a.voucherVno&&<span style={{fontSize:9,color:"#27500A",fontWeight:700}}>→ {a.voucherVno}</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length===0&&(
                <tr><td colSpan={9} style={{padding:"28px",textAlign:"center",color:"#5a6691"}}>No ACMs found</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
                <td colSpan={4} style={{padding:"9px 10px",fontWeight:700,color:"#d4a437",fontSize:11}}>
                  TOTAL — {filtered.length} ACMs
                </td>
                <td style={{padding:"9px 10px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums",fontSize:12}}>
                  +{cur}{Number(filtered.reduce((s,a)=>s+a.amount,0)).toLocaleString()}
                </td>
                <td colSpan={4}/>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Info box */}
      <div style={{marginTop:12,padding:"10px 14px",borderRadius:9,background:"#EAF3DE",border:"1px solid #C0DD97",fontSize:10,color:"#27500A"}}>
        <b>ACM Types:</b> RC (Refund Credit) — ticket refund processed via BSP ·
        IC (Incentive Credit) — PLACI/volume bonus ·
        CA (Commission Adjustment) — retroactive commission ·
        AR (ADM Reversal) — disputed ADM upheld in agency favour ·
        TC (Tax Credit) — excess tax recovered.
        All ACMs are credited to your next BSP settlement — no action required to receive credit.
      </div>

      {/* New ACM modal */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",background:"#EAF3DE",borderRadius:"14px 14px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#27500A"}}>Record New ACM</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#27500A"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Airline"><input value={form.airline} onChange={e=>setForm(f=>({...f,airline:e.target.value}))} style={inp}/></FL>
                <FL label="Airline code"><input value={form.airlineCode} onChange={e=>setForm(f=>({...f,airlineCode:e.target.value.toUpperCase()}))} style={{...inp,fontFamily:"monospace"}} maxLength={2}/></FL>
              </div>
              <FL label="Ticket number / Reference"><input value={form.ticketNo} onChange={e=>setForm(f=>({...f,ticketNo:e.target.value}))} style={{...inp,fontFamily:"monospace"}} placeholder="Leave blank for incentive ACMs"/></FL>
              <FL label="Reason code">
                <select value={form.reasonCode} onChange={e=>setForm(f=>({...f,reasonCode:e.target.value}))} style={inp}>
                  {Object.values(ACM_REASON_CODES).map(r=><option key={r.code} value={r.code}>{r.code} — {r.label}</option>)}
                </select>
              </FL>
              <div style={{padding:"7px 10px",borderRadius:7,background:"#EAF3DE",fontSize:9.5,color:"#27500A"}}>{ACM_REASON_CODES[form.reasonCode]?.desc}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <FL label="Credit amount"><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:+e.target.value}))} style={inp}/></FL>
                <FL label="Currency"><select value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))} style={inp}>{branchCurrencies(form.branch).map(c=><option key={c}>{c}</option>)}</select></FL>
                <FL label="Branch"><select value={form.branch} onChange={e=>setForm(f=>({...f,branch:e.target.value,currency:branchMainCurrency(e.target.value)}))} style={inp}>{BRANCH_CODES.map(b=><option key={b}>{b}</option>)}</select></FL>
              </div>
              <FL label="Remarks"><textarea value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}}/></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={addAcm} style={{...btnG,background:"#27500A"}}>💾 Record ACM</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   BSP SUMMARY  /purchase/bsp-summary
   Net BSP position: Sales - ADMs + ACMs = Settlement
   ════════════════════════════════════════════════════════════════ */

export function FixedAssetRegister({branch,setRoute}){
  const mob=useMobile();
  const ASSET_CATEGORIES=useAssetCategories().data||[];   // DB-backed (/api/asset-categories)
  const FIXED_ASSETS_DATA=(useMasterList("fixed-assets").data||[]).map(a=>({...a,id:a.assetId||a.id})); // live /api/fixed-assets
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [catFilter,setCatFilter]=useState("ALL");
  const [statusFilter,setStatusFilter]=useState("Active");
  const [showAdd,setShowAdd]=useState(false);

  const visible=FIXED_ASSETS_DATA.filter(a=>(!brCode||a.branch===brCode)&&(catFilter==="ALL"||a.code===catFilter)&&(statusFilter==="ALL"||a.status===statusFilter));

  const totCost=visible.reduce((s,a)=>s+a.cost,0);
  const totWdv=visible.reduce((s,a)=>s+a.wdv,0);
  const totDepYtd=totCost-totWdv;
  const catCount=new Set(visible.map(a=>a.code)).size;

  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>📊 Fixed Asset Register</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>Asset master · Auto-depreciation · Disposal · IT Act block reporting</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>setRoute&&setRoute("/assets/depreciation")} style={{padding:"7px 14px",border:"1px solid #185FA5",background:"#fff",color:"#185FA5",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer"}}>📉 Depreciation Schedule</button>
          <button onClick={()=>setRoute&&setRoute("/assets/blocks")} style={{padding:"7px 14px",border:"1px solid #854F0B",background:"#fff",color:"#854F0B",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer"}}>🏛 Block of Assets</button>
          <button onClick={()=>setShowAdd(true)} style={{padding:"7px 14px",border:"none",background:"#d4a437",color:"#0d1326",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"}}>＋ Add Asset</button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #185FA5"}}>
          <p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase",letterSpacing:"0.4px"}}>Gross Block</p>
          <p style={{margin:"4px 0 0",fontSize:mob?17:21,fontWeight:800,color:"#0d1326"}}>{cur+fmt(totCost)}</p>
          <p style={{margin:0,fontSize:10,color:"#5a6691"}}>{visible.length} assets</p>
        </div>
        <div style={{...card,borderTop:"3px solid #27500A"}}>
          <p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase",letterSpacing:"0.4px"}}>Net Block (WDV)</p>
          <p style={{margin:"4px 0 0",fontSize:mob?17:21,fontWeight:800,color:"#27500A"}}>{cur+fmt(totWdv)}</p>
          <p style={{margin:0,fontSize:10,color:"#5a6691"}}>After depreciation</p>
        </div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}>
          <p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase",letterSpacing:"0.4px"}}>Accumulated Dep.</p>
          <p style={{margin:"4px 0 0",fontSize:mob?17:21,fontWeight:800,color:"#A32D2D"}}>{cur+fmt(totDepYtd)}</p>
          <p style={{margin:0,fontSize:10,color:"#5a6691"}}>{((totDepYtd/totCost)*100||0).toFixed(1)}% of gross</p>
        </div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}>
          <p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase",letterSpacing:"0.4px"}}>Categories</p>
          <p style={{margin:"4px 0 0",fontSize:mob?17:21,fontWeight:800,color:"#854F0B"}}>{catCount}</p>
          <p style={{margin:0,fontSize:10,color:"#5a6691"}}>of {ASSET_CATEGORIES.length} blocks</p>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
        <span style={{fontSize:11,color:"#5a6691",marginRight:4}}>Category:</span>
        {["ALL",...ASSET_CATEGORIES.map(c=>c.code)].map(c=>(
          <button key={c} onClick={()=>setCatFilter(c)} style={{padding:"4px 10px",border:"1px solid "+(catFilter===c?"#0d1326":"#e1e3ec"),background:catFilter===c?"#0d1326":"#fff",color:catFilter===c?"#d4a437":"#5a6691",borderRadius:14,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
            {c==="ALL"?"All":c}
          </button>
        ))}
      </div>

      {/* Asset table */}
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}>
              <tr>
                <th style={{padding:"9px 8px",textAlign:"left",fontWeight:700}}>Asset ID</th>
                <th style={{padding:"9px 8px",textAlign:"left",fontWeight:700}}>Description</th>
                <th style={{padding:"9px 8px",textAlign:"left",fontWeight:700}}>Category</th>
                <th style={{padding:"9px 8px",textAlign:"center",fontWeight:700}}>Branch</th>
                <th style={{padding:"9px 8px",textAlign:"center",fontWeight:700}}>Purchase</th>
                <th style={{padding:"9px 8px",textAlign:"right",fontWeight:700}}>Cost</th>
                <th style={{padding:"9px 8px",textAlign:"center",fontWeight:700}}>Method</th>
                <th style={{padding:"9px 8px",textAlign:"right",fontWeight:700}}>WDV</th>
                <th style={{padding:"9px 8px",textAlign:"center",fontWeight:700}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a,i)=>{
                const cat=ASSET_CATEGORIES.find(c=>c.code===a.code)||{};
                return(
                  <tr key={a.id} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
                    <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{a.id}</td>
                    <td style={{padding:"7px 8px",fontWeight:600,color:"#0d1326"}}>{a.name}</td>
                    <td style={{padding:"7px 8px",color:"#5a6691"}}>{cat.name||a.code}</td>
                    <td style={{padding:"7px 8px",textAlign:"center",color:"#5a6691"}}>{a.branch}</td>
                    <td style={{padding:"7px 8px",textAlign:"center",color:"#5a6691",fontSize:10}}>{a.purchaseDate}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600}}>{cur+fmt(a.cost)}</td>
                    <td style={{padding:"7px 8px",textAlign:"center",fontSize:10,fontWeight:600,color:a.method==="WDV"?"#854F0B":"#185FA5"}}>{a.method}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,color:"#27500A"}}>{cur+fmt(a.wdv)}</td>
                    <td style={{padding:"7px 8px",textAlign:"center"}}>
                      <span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:a.status==="Active"?"#EAF3DE":"#FCEBEB",color:a.status==="Active"?"#27500A":"#A32D2D"}}>{a.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{marginTop:14,fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>
        💡 SLM = Straight Line Method · WDV = Written Down Value · IT Act block rates apply for tax depreciation. Companies Act rates for book depreciation.
      </p>
    </div>
  );
}


export function AssetDepreciation({branch,setRoute}){
  const mob=useMobile();
  const ASSET_CATEGORIES=useAssetCategories().data||[];   // DB-backed (/api/asset-categories)
  const FIXED_ASSETS_DATA=(useMasterList("fixed-assets").data||[]).map(a=>({...a,id:a.assetId||a.id})); // live /api/fixed-assets
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [period,setPeriod]=useState("2026-05");

  const assets=FIXED_ASSETS_DATA.filter(a=>(!brCode||a.branch===brCode)&&a.status==="Active");

  // compute monthly depreciation per asset
  const schedule=assets.map(a=>{
    const cat=ASSET_CATEGORIES.find(c=>c.code===a.code)||{};
    const rate=cat.coRate||10;
    const monthlyDep=a.method==="SLM"?((a.cost-a.salvage)*(rate/100))/12:(a.wdv*(rate/100))/12;
    return {...a,rate,monthlyDep,annualDep:monthlyDep*12,catName:cat.name||a.code};
  });

  const totMonthly=schedule.reduce((s,a)=>s+a.monthlyDep,0);
  const totAnnual=schedule.reduce((s,a)=>s+a.annualDep,0);
  const totCost=assets.reduce((s,a)=>s+a.cost,0);
  const totWdv=assets.reduce((s,a)=>s+a.wdv,0);

  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>📉 Depreciation Schedule</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>Monthly &amp; annual depreciation · Companies Act rates · Auto-posts JV at month-end</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:7,fontSize:11.5}}>
            <option value="2026-05">May 2026</option><option value="2026-04">Apr 2026</option><option value="2026-03">Mar 2026</option>
          </select>
          <button style={{padding:"7px 14px",border:"none",background:"#d4a437",color:"#0d1326",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"}}>📒 Post Depreciation JV</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #185FA5"}}>
          <p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Monthly Dep.</p>
          <p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{cur+fmt(Math.round(totMonthly))}</p>
        </div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}>
          <p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Annual Dep.</p>
          <p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{cur+fmt(Math.round(totAnnual))}</p>
        </div>
        <div style={{...card,borderTop:"3px solid #27500A"}}>
          <p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Total WDV</p>
          <p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{cur+fmt(totWdv)}</p>
        </div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}>
          <p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Gross Block</p>
          <p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{cur+fmt(totCost)}</p>
        </div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}>
              <tr>
                <th style={{padding:"9px 8px",textAlign:"left"}}>Asset</th>
                <th style={{padding:"9px 8px",textAlign:"center"}}>Method</th>
                <th style={{padding:"9px 8px",textAlign:"center"}}>Rate %</th>
                <th style={{padding:"9px 8px",textAlign:"right"}}>Opening WDV</th>
                <th style={{padding:"9px 8px",textAlign:"right"}}>Monthly Dep.</th>
                <th style={{padding:"9px 8px",textAlign:"right"}}>Annual Dep.</th>
                <th style={{padding:"9px 8px",textAlign:"right"}}>Closing WDV</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((a,i)=>(
                <tr key={a.id} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
                  <td style={{padding:"7px 8px",fontWeight:600,color:"#0d1326"}}>{a.name}<div style={{fontSize:9.5,color:"#5a6691",fontWeight:400}}>{a.id} · {a.branch}</div></td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10,fontWeight:600,color:a.method==="WDV"?"#854F0B":"#185FA5"}}>{a.method}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}>{a.rate.toFixed(2)}%</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(a.wdv)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",color:"#A32D2D",fontWeight:600}}>{cur+fmt(Math.round(a.monthlyDep))}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600}}>{cur+fmt(Math.round(a.annualDep))}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,color:"#27500A"}}>{cur+fmt(Math.round(a.wdv-a.monthlyDep))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{background:"#FAEEDA",fontWeight:700,fontSize:11.5}}>
              <tr>
                <td colSpan={4} style={{padding:"9px 8px",textAlign:"right"}}>TOTAL</td>
                <td style={{padding:"9px 8px",textAlign:"right",color:"#A32D2D"}}>{cur+fmt(Math.round(totMonthly))}</td>
                <td style={{padding:"9px 8px",textAlign:"right"}}>{cur+fmt(Math.round(totAnnual))}</td>
                <td style={{padding:"9px 8px",textAlign:"right",color:"#27500A"}}>{cur+fmt(Math.round(totWdv-totMonthly))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}


export function AssetDisposal({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;

  const DISPOSALS=[
    {id:"DSP-001",assetId:"FA-BOM-0099",name:"Old HP Printer",disposalDate:"2026-03-15",reason:"Sale",bookValue:8500,saleValue:12000,gain:3500,buyer:"Office Solutions Pvt Ltd",method:"Sold"},
    {id:"DSP-002",assetId:"FA-AMD-0045",name:"Dell Workstation (4 yrs)",disposalDate:"2026-02-20",reason:"Sale",bookValue:15000,saleValue:8000,gain:-7000,buyer:"Cash buyer",method:"Sold"},
    {id:"DSP-004",assetId:"FA-BOM-0067",name:"Conference Room Projector",disposalDate:"2025-12-05",reason:"Transfer",bookValue:18000,saleValue:18000,gain:0,buyer:"Internal transfer",method:"Transferred"},
  ];

  const totGain=DISPOSALS.reduce((s,d)=>s+(d.gain>0?d.gain:0),0);
  const totLoss=DISPOSALS.reduce((s,d)=>s+(d.gain<0?Math.abs(d.gain):0),0);
  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <SampleBanner note="asset disposals & capital gain/loss aren’t wired to live data yet." />
      <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>♻ Asset Disposal &amp; Transfer</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Sale · Scrap · Inter-branch transfer · Auto capital gain/loss calc</p>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Capital Gain YTD</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{cur+fmt(totGain)}</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Capital Loss YTD</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{cur+fmt(totLoss)}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Disposals</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{DISPOSALS.length}</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Net P&amp;L</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:totGain-totLoss>=0?"#27500A":"#A32D2D"}}>{cur+fmt(totGain-totLoss)}</p></div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Disposal ID</th><th style={{padding:"9px 8px",textAlign:"left"}}>Asset</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Date</th><th style={{padding:"9px 8px",textAlign:"center"}}>Type</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Book Value</th><th style={{padding:"9px 8px",textAlign:"right"}}>Sale Value</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Gain/(Loss)</th><th style={{padding:"9px 8px",textAlign:"left"}}>Buyer/Notes</th>
            </tr></thead>
            <tbody>
              {DISPOSALS.map((d,i)=>(
                <tr key={d.id} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{d.id}</td>
                  <td style={{padding:"7px 8px",fontWeight:600}}>{d.name}<div style={{fontSize:9.5,color:"#5a6691"}}>{d.assetId}</div></td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{d.disposalDate}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:d.method==="Sold"?"#EAF3DE":d.method==="Transferred"?"#E6F1FB":"#FAEEDA",color:d.method==="Sold"?"#27500A":d.method==="Transferred"?"#185FA5":"#854F0B"}}>{d.method}</span></td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(d.bookValue)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(d.saleValue)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,color:d.gain>0?"#27500A":d.gain<0?"#A32D2D":"#5a6691"}}>{d.gain>0?"+":""}{cur+fmt(d.gain)}</td>
                  <td style={{padding:"7px 8px",fontSize:10,color:"#5a6691"}}>{d.buyer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


export function BlockOfAssets({branch,setRoute}){
  const mob=useMobile();
  const ASSET_CATEGORIES=useAssetCategories().data||[];   // DB-backed (/api/asset-categories)
  const FIXED_ASSETS_DATA=(useMasterList("fixed-assets").data||[]).map(a=>({...a,id:a.assetId||a.id})); // live /api/fixed-assets
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;

  const assets=FIXED_ASSETS_DATA.filter(a=>!brCode||a.branch===brCode);

  // group by IT Act block
  const blocks=ASSET_CATEGORIES.map(cat=>{
    const blkAssets=assets.filter(a=>a.code===cat.code);
    const opening=blkAssets.reduce((s,a)=>s+a.cost,0);
    const wdv=blkAssets.reduce((s,a)=>s+a.wdv,0);
    const itDep=opening*(cat.itRate/100);
    return {...cat,assets:blkAssets.length,opening,wdv,itDep,closing:Math.max(0,wdv-itDep)};
  }).filter(b=>b.assets>0);

  const totOpening=blocks.reduce((s,b)=>s+b.opening,0);
  const totItDep=blocks.reduce((s,b)=>s+b.itDep,0);
  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>🏛 Block of Assets — Income Tax Act</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Section 32 block-wise depreciation for tax computation · Different from Companies Act rates</p>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>IT Act Dep.</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{cur+fmt(Math.round(totItDep))}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>FY 2025-26 · WDV method</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Blocks Active</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{blocks.length}</p></div>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Gross Block</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{cur+fmt(totOpening)}</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Tax vs Book Diff</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{cur+fmt(Math.round(totItDep*0.2))}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>Deferred tax impact</p></div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>IT Block</th><th style={{padding:"9px 8px",textAlign:"center"}}>IT Rate</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Assets</th><th style={{padding:"9px 8px",textAlign:"right"}}>Opening WDV</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Additions</th><th style={{padding:"9px 8px",textAlign:"right"}}>Deletions</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>IT Depreciation</th><th style={{padding:"9px 8px",textAlign:"right"}}>Closing WDV</th>
            </tr></thead>
            <tbody>
              {blocks.map((b,i)=>(
                <tr key={b.code} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
                  <td style={{padding:"7px 8px",fontWeight:600}}>{b.block}<div style={{fontSize:9.5,color:"#5a6691",fontWeight:400}}>{b.name}</div></td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontWeight:700,color:"#854F0B"}}>{b.itRate}%</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}>{b.assets}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(b.opening)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",color:"#27500A"}}>—</td>
                  <td style={{padding:"7px 8px",textAlign:"right",color:"#A32D2D"}}>—</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,color:"#A32D2D"}}>{cur+fmt(Math.round(b.itDep))}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,color:"#27500A"}}>{cur+fmt(Math.round(b.closing))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{background:"#FAEEDA",fontWeight:700,fontSize:11.5}}>
              <tr><td colSpan={3} style={{padding:"9px 8px",textAlign:"right"}}>TOTAL</td>
              <td style={{padding:"9px 8px",textAlign:"right"}}>{cur+fmt(totOpening)}</td>
              <td colSpan={2}></td>
              <td style={{padding:"9px 8px",textAlign:"right",color:"#A32D2D"}}>{cur+fmt(Math.round(totItDep))}</td>
              <td style={{padding:"9px 8px",textAlign:"right",color:"#27500A"}}>{cur+fmt(Math.round(totOpening-totItDep))}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FINANCE ADDITIONS — Vendor Advances, Loans/EMI, FX Revaluation
   ════════════════════════════════════════════════════════════════ */

