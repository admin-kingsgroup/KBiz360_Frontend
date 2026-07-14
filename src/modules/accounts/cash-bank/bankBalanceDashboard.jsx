/* ════════════════════════════════════════════════════════════════════
   BANK BALANCE DASHBOARD
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of finance/legacy.jsx —
   MENU_ACCOUNTS ▸ Cash & Bank (href /finance/bank-balance), not a
   Finance-menu item. finance/index.js re-exports BankBalanceDashboard from
   here so App.jsx's barrel import needed zero changes.
   ════════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { useTrialBalance } from '../../../core/useAccounting';
import { BRANCH_CODES } from '../../../core/data';
import { fmtINR } from '../../../core/format';
import { cardStyle } from '../../../core/helpers';
import { RPT_thStyle, RPT_tdStyle } from '../../../core/styles';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';

export function BankBalanceDashboard({ branch }={}){
  // Follows the top-bar branch: a specific branch pins the dashboard to it (no
  // "All branches" override); the full cross-branch list lives under ALL.
  const shellCode = branch && branch !== "ALL" ? (branch.code || branch) : "ALL";
  const [filterBranch,setFilterBranch]=useState(shellCode);
  useEffect(()=>{ setFilterBranch(shellCode); },[shellCode]);
  const branchArg = filterBranch==="ALL" ? "ALL" : { code: filterBranch };
  const tb = useTrialBalance(branchArg, {}).data || {};
  const rows = (tb.rows||[]).filter(r=>/cash|bank/i.test(r.group||""));
  const bal = (r)=> (r.closingDebit||0)-(r.closingCredit||0);
  const cashTotal = rows.filter(r=>/cash/i.test(r.group)).reduce((s,r)=>s+bal(r),0);
  const bankTotal = rows.filter(r=>/bank/i.test(r.group)).reduce((s,r)=>s+bal(r),0);
  const total = cashTotal + bankTotal;
  const kpi=(label,val,sub,col)=>(<div style={{...cardStyle,borderTop:`3px solid ${col}`}}><p style={{margin:0,fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>{label}</p><p style={{margin:"5px 0 2px",fontSize:22,fontWeight:700,color:val<0?"#A32D2D":"#0d1326"}}>{fmtINR(val)}</p><p style={{margin:0,fontSize:11,color:"#5a6691"}}>{sub}</p></div>);
  return(
    <PHASE2_Page title="Bank Balance Dashboard"
      subtitle="Live cash & bank balances from the books · shows 0 until entries are posted"
      toolbar={<select value={filterBranch} disabled={shellCode!=="ALL"} title={shellCode!=="ALL"?"Scoped by the top-bar branch — switch it there":undefined} onChange={e=>setFilterBranch(e.target.value)} style={{padding:"7px 10px",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,background:"#fff"}}>
        {shellCode==="ALL" && <option value="ALL">All branches</option>}
        {(shellCode==="ALL"?BRANCH_CODES:[shellCode]).map(b=><option key={b}>{b}</option>)}
      </select>}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:14}}>
        {kpi("Total Liquid (INR)",total,`${rows.length} cash/bank ledger${rows.length===1?"":"s"}`,total<0?"#A32D2D":"#22c55e")}
        {kpi("Bank Balance",bankTotal,"all bank ledgers","#d4a437")}
        {kpi("Cash in Hand",cashTotal,"all cash ledgers","#3b82f6")}
      </div>
      <div style={cardStyle}>
        <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#0d1326"}}>Cash &amp; Bank Ledgers — Live Balances</p>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr><th style={RPT_thStyle}>Ledger</th><th style={RPT_thStyle}>Group</th><th style={{...RPT_thStyle,textAlign:"right"}}>Balance (INR)</th></tr></thead>
            <tbody>
              {rows.map((r,i)=>(<tr key={i} style={{borderBottom:"1px solid #dfe2e7"}}><td style={{...RPT_tdStyle,fontWeight:600}}>{r.ledger}</td><td style={{...RPT_tdStyle,color:"#5a6691"}}>{r.group}</td><td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700,color:bal(r)<0?"#A32D2D":"#0d1326"}}>{fmtINR(bal(r))}</td></tr>))}
              {rows.length===0&&<tr><td colSpan={3} style={{...RPT_tdStyle,textAlign:"center",color:"#5a6691",padding:20}}>No cash/bank balances yet — post receipts/payments and they appear here.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </PHASE2_Page>
  );
}
