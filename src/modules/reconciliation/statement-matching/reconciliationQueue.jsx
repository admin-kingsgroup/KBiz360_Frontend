/* ════════════════════════════════════════════════════════════════════
   RECONCILIATION QUEUE — bank/OD ledgers pending certificate reconciliation
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of finance/legacy.jsx —
   MENU_RECONCILIATION ▸ Statement Matching (href /finance/reco-queue), not a
   Finance-menu item. finance/index.js re-exports ReconciliationQueue from
   here so App.jsx's barrel import needed zero changes.
   ════════════════════════════════════════════════════════════════════ */

import { useReconQueue, useReconSummary } from '../../../core/useReconciliation';
import { useBankLedgers } from '../../../core/useBankReco';
import { fmtINR } from '../../../core/format';
import { btnGh } from '../../../core/styles';
import { Skeleton } from '../../../shell/primitives';

// The five tiers, in ladder order, for the pending strip (Daily/Weekly are the
// branch freeze tiers; Month/Quarter/Year certify at TK Group).
const RECO_QUEUE_TIERS = [
  { key:'daily',   label:'Daily' },
  { key:'weekly',  label:'Weekly' },
  { key:'month',   label:'Month-End' },
  { key:'quarter', label:'Quarterly' },
  { key:'year',    label:'Year-End' },
];
// Facts → the row's colour badge + sort rank. Overdue floats to the top, done sinks;
// untouched "pending" ranks above part-worked rows so the most work-to-do is visible.
function recoRowState(it){
  if(it.overdue) return { label:'Overdue', c:'#A32D2D', bg:'#FCEBEB', dot:'#A32D2D', rank:0 };
  if(it.status==='signed'||it.status==='locked') return { label:'Reconciled', c:'#27500A', bg:'#EAF3DE', dot:'#27500A', rank:4 };
  if(it.status==='reconciled') return { label:'Ready to sign', c:'#185FA5', bg:'#E6F1FB', dot:'#185FA5', rank:3 };
  if(it.status==='open'||it.statementImported) return { label:'In progress', c:'#8a5a00', bg:'#FFF4D6', dot:'#d4a437', rank:2 };
  return { label:'Pending', c:'#5a6691', bg:'#eef0f5', dot:'#9aa3bd', rank:1 };
}
const recoWeekShort = (p)=> p ? String(p).replace(/^\d{4}-/,'') : '';
const qTh = (a)=>({padding:"9px 10px",textAlign:a,whiteSpace:"nowrap"});

export function ReconciliationQueue({branch,setRoute}){
  const { data:qData, isLoading:qLoading } = useReconQueue(branch);
  const { data:sData } = useReconSummary(branch);
  const { data:bankData } = useBankLedgers(branch);
  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};
  // Prefer the certificate-backed status rows; fall back to the bare bank-ledger
  // list so the screen never regresses if the status endpoint is unavailable.
  const items = (qData && Array.isArray(qData.items) && qData.items.length)
    ? qData.items
    : (bankData||[]).map(l=>({ code:l.code, name:l.name, group:l.group, status:'not-started', difference:null, statementImported:false, lastReconciled:null, waitingOn:null, overdue:false }));
  const rows = [...items].sort((a,b)=> (recoRowState(a).rank - recoRowState(b).rank) || String(a.name||'').localeCompare(String(b.name||'')));
  const tiers = (sData && sData.tiers) || {};
  const overdueCount = items.filter(it=>it.overdue).length;
  const weekLabel = qData && qData.period ? recoWeekShort(qData.period) : '';
  return(
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:19,fontWeight:800,color:"#0d1326"}}>Reconciliation Queue</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Bank / OD ledgers to reconcile against imported statements — live status from the weekly certificate ladder, so everyone can see what's pending{weekLabel?` (this week ${weekLabel})`:''}.</p>

      {/* Pending strip — how far each tier's close has progressed, plus overdue count. */}
      <div style={{display:"flex",flexWrap:"wrap",gap:8,margin:"0 0 12px"}}>
        {RECO_QUEUE_TIERS.map(t=>{
          const g=tiers[t.key]||{}; const total=g.total||0, done=g.done||0, pct=total?Math.round(done/total*100):0;
          return(
            <div key={t.key} style={{...card,padding:"8px 12px",minWidth:150,flex:"1 1 150px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:".4px"}}>
                <span>{t.label}</span><span style={{color:"#0d1326"}}>{done}/{total}</span>
              </div>
              <div style={{height:5,borderRadius:3,background:"#eef0f5",marginTop:6,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:total&&done>=total?"#27500A":"#d4a437"}}/>
              </div>
            </div>
          );
        })}
        <div style={{...card,padding:"8px 12px",minWidth:150,flex:"1 1 150px",display:"flex",flexDirection:"column",justifyContent:"center",
          background:overdueCount?"#FCEBEB":"#EAF3DE",borderColor:overdueCount?"#f0c9c9":"#cfe3bb"}}>
          <div style={{fontSize:18,fontWeight:800,color:overdueCount?"#A32D2D":"#27500A",lineHeight:1}}>{overdueCount?`⚠ ${overdueCount}`:"✓ 0"}</div>
          <div style={{fontSize:10.5,color:overdueCount?"#A32D2D":"#27500A",fontWeight:700,marginTop:3}}>{overdueCount?"overdue this week":"none overdue"}</div>
        </div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={qTh("left")}>Bank Ledger</th>
              <th style={qTh("left")}>Group</th>
              <th style={qTh("left")}>Last reconciled</th>
              <th style={qTh("center")}>Statement</th>
              <th style={qTh("right")}>Difference</th>
              <th style={qTh("left")}>Status</th>
              <th style={qTh("left")}>Waiting on</th>
              <th style={qTh("center")}>Action</th>
            </tr></thead>
            <tbody>
              {rows.map((it,i)=>{
                const st=recoRowState(it);
                return(
                  <tr key={it.code||it.name||i} style={{background:i%2?"#f3f4f8":"#fff",borderBottom:"1px solid #cdd1d8"}}>
                    <td style={{padding:"8px 10px",fontWeight:600}}>{it.name}</td>
                    <td style={{padding:"8px 10px",color:"#5a6691"}}>{it.group||"Bank Accounts"}</td>
                    <td style={{padding:"8px 10px",fontFamily:"monospace",color:it.lastReconciled?"#0d1326":"#9aa3bd"}}>{it.lastReconciled?recoWeekShort(it.lastReconciled.period):"never"}</td>
                    <td style={{padding:"8px 10px",textAlign:"center",fontSize:11,fontWeight:700,color:it.statementImported?"#27500A":"#9aa3bd"}}>{it.statementImported?"✓ Imported":"✗ Missing"}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",color:it.difference==null?"#9aa3bd":Math.abs(it.difference)<1?"#27500A":"#A32D2D"}}>{it.difference==null?"—":fmtINR(it.difference)}</td>
                    <td style={{padding:"8px 10px"}}><span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11,fontWeight:700,color:st.c,background:st.bg,padding:"3px 9px",borderRadius:20,whiteSpace:"nowrap"}}><span style={{width:7,height:7,borderRadius:"50%",background:st.dot}}/>{st.label}</span></td>
                    <td style={{padding:"8px 10px",color:it.waitingOn?"#0d1326":"#9aa3bd",fontWeight:it.waitingOn?600:400}}>{it.waitingOn||"—"}</td>
                    <td style={{padding:"8px 10px",textAlign:"center"}}><button title="Open the weekly certificate register to reconcile & sign" onClick={()=>setRoute&&setRoute('/reconciliation/weekly')} style={{...btnGh,minHeight:28,fontSize:11}}>Reconcile</button></td>
                  </tr>
                );
              })}
              {qLoading && Array.from({length:5}).map((_,i)=>(
                <tr key={`sk-${i}`} style={{borderBottom:"1px solid #cdd1d8"}}>
                  <td colSpan={8} style={{padding:"10px"}}><Skeleton className="h-4 w-full" style={{opacity:Math.max(0.4,1-i*0.15)}} /></td>
                </tr>
              ))}
              {!qLoading && rows.length===0&&<tr><td colSpan={8} style={{padding:20,textAlign:"center",color:"#5a6691"}}>No bank ledgers yet - create a Bank ledger to reconcile.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend — one colour language across the queue, the bell and the cockpit tile. */}
      <div style={{display:"flex",flexWrap:"wrap",gap:14,margin:"10px 2px 0",fontSize:10.5,color:"#5a6691"}}>
        {[["#A32D2D","Overdue — past Friday"],["#9aa3bd","Pending / not started"],["#d4a437","In progress"],["#185FA5","Ready to sign"],["#27500A","Reconciled"]].map(([c,l])=>(
          <span key={l} style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:"50%",background:c}}/>{l}</span>
        ))}
      </div>
    </div>
  );
}
