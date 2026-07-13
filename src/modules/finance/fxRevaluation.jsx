import { useState, useEffect } from 'react';
import { useMobile } from '../../core/hooks';
import { toast } from '../../core/ux/toast';
import { fmt } from '../../core/format';
import { CUR_MONTH, MONTH_OPTIONS } from '../../core/dates';

/* ── FX REVALUATION — LIVE (2026-07-10) ─────────────────────────────
   Per-CURRENCY revaluation of the consolidated foreign exposure against the
   LAST revaluation's rates (branch books are single-currency, so ledger-level
   FCY revaluation doesn't exist here). "Post Revaluation JV" creates ONE
   PENDING journal voucher in the HO (BOM) books via
   POST /api/accounting/fx-revaluation — it posts only when approved.
   First run per currency establishes the baseline (records rates, no JV). */
export function FxRevaluation({branch,setRoute}){
  const mob=useMobile();
  const cur="₹"; // the revaluation JV + INR equivalents live in the HO (INR) books
  const [period,setPeriod]=useState(CUR_MONTH);
  const [data,setData]=useState(null);
  const [err,setErr]=useState("");
  const [posting,setPosting]=useState(false);

  const load=async(p)=>{
    setErr("");
    try{ const { apiGet } = await import('../../core/api'); setData(await apiGet('/api/accounting/fx-revaluation',{period:p})); }
    catch(e){ setErr(e?.message||"Failed to load FX revaluation"); }
  };
  useEffect(()=>{ load(period); },[period]);

  const postJv=async()=>{
    setPosting(true); setErr("");
    try{
      const { apiPost } = await import('../../core/api');
      const res=await apiPost('/api/accounting/fx-revaluation',{period});
      setData(res);
      toast(res?.record?.voucherVno ? `Revaluation JV ${res.record.voucherVno} created (pending approval).` : `Baseline rates recorded for ${period} — no JV needed.`);
    }catch(e){ setErr(e?.message||"Post failed"); }
    finally{ setPosting(false); }
  };

  const rows=(data?.rows||[]).map(r=>({
    ledger:`Net ${r.currency} exposure (${(r.branches||[]).join(", ")})`,
    branch:(r.branches||[]).join("/"), ccy:r.currency, origAmt:r.netExposure,
    bookRate:r.baselineRate, monthEndRate:r.currentRate,
    bookValue:r.bookValue??0, revalued:r.revalued, fxGain:r.delta||0,
  }));
  const totGain=rows.reduce((s,r)=>s+(r.fxGain>0?r.fxGain:0),0);
  const totLoss=rows.reduce((s,r)=>s+(r.fxGain<0?Math.abs(r.fxGain):0),0);
  const net=totGain-totLoss;

  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>💱 Period-End FX Revaluation</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>Mark foreign-currency balances to month-end rate · Auto-posts FX gain/loss JV · AS 11 / Ind AS 21</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:7,fontSize:11.5}}>
            {MONTH_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <button onClick={postJv} disabled={posting||!data||data.alreadyPosted||!rows.length}
            style={{padding:"7px 14px",border:"none",background:"#d4a437",color:"#0d1326",borderRadius:7,fontSize:11,fontWeight:700,cursor:posting||!data||data?.alreadyPosted||!rows.length?"not-allowed":"pointer",opacity:posting||!data||data?.alreadyPosted||!rows.length?0.5:1}}>
            📒 {posting?"Posting…":data?.alreadyPosted?"Already posted":data?.baseline?"Record Baseline Rates":"Post Revaluation JV"}
          </button>
        </div>
      </div>

      {err&&<div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:11,color:"#A32D2D",fontWeight:600}}>{err}</div>}
      {data?.alreadyPosted&&(
        <div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#E9F3E4",border:"1px solid #BFDDB0",fontSize:11,color:"#27500A"}}>
          ✔ {period} revaluation posted{data.record?.voucherVno?<> — JV <b>{data.record.voucherVno}</b> (approve it in Voucher Approvals to hit the books)</>:" as the rate baseline (no JV needed)"}. Posted by {data.record?.postedBy||"—"}.
        </div>
      )}
      {!data?.alreadyPosted&&data?.baseline&&(
        <div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#E6F1FB",border:"1px solid #B9D9F5",fontSize:11,color:"#185FA5"}}>
          First revaluation — this run records today's rates as the baseline; the next period's run posts the movement as a JV.
        </div>
      )}
      {(data?.missingRates||[]).length>0&&(
        <div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#FFF8E1",border:"1px solid #F1E3B0",fontSize:11,color:"#854F0B"}}>
          ⚠ No INR rate on file for: {data.missingRates.join(", ")} — add it under Masters ▸ Forex Rates to include that currency.
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Unrealised Gain</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{cur+fmt(totGain)}</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Unrealised Loss</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{cur+fmt(totLoss)}</p></div>
        <div style={{...card,borderTop:"3px solid "+(net>=0?"#27500A":"#A32D2D")}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Net Impact</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:net>=0?"#27500A":"#A32D2D"}}>{cur+fmt(net)}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Ledgers to Revalue</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{rows.length}</p></div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Ledger</th><th style={{padding:"9px 8px",textAlign:"center"}}>Ccy</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>FCY Amount</th><th style={{padding:"9px 8px",textAlign:"right"}}>Book Rate</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Month-End Rate</th><th style={{padding:"9px 8px",textAlign:"right"}}>Book Value</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Revalued</th><th style={{padding:"9px 8px",textAlign:"right"}}>FX Gain/(Loss)</th>
            </tr></thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #cdd1d8"}}>
                  <td style={{padding:"7px 8px",fontWeight:600}}>{r.ledger}<div style={{fontSize:9.5,color:"#5a6691",fontWeight:400}}>{r.branch}</div></td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:"#E6F1FB",color:"#185FA5"}}>{r.ccy}</span></td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{fmt(r.origAmt)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontSize:10,color:"#5a6691"}}>{r.bookRate==null?"— (baseline)":r.bookRate.toFixed(2)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontSize:10,color:"#854F0B",fontWeight:600}}>{r.monthEndRate.toFixed(2)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{r.bookRate==null?"—":cur+fmt(r.bookValue)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(r.revalued)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,color:r.fxGain>0?"#27500A":"#A32D2D"}}>{r.fxGain>0?"+":""}{cur+fmt(r.fxGain)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{background:"#FAEEDA",fontWeight:700,fontSize:11.5}}>
              <tr><td colSpan={7} style={{padding:"9px 8px",textAlign:"right"}}>NET FX REVALUATION</td>
              <td style={{padding:"9px 8px",textAlign:"right",color:net>=0?"#27500A":"#A32D2D"}}>{net>=0?"+":""}{cur+fmt(net)}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p style={{marginTop:14,fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>
        💡 Posts ONE pending JV in the HO (BOM) books: FX Revaluation Adjustment ↔ Foreign Currency Translation Reserve (FCTR — equity,
        never P&L, per AS 11/Ind AS 21 translation). Each period's JV is the movement since the last revaluation, so no reversal entry is needed.
      </p>
    </div>
  );
}
