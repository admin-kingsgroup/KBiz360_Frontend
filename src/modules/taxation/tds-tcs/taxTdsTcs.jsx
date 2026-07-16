/* BUSINESS SUB-MODULE REORG (2026-07-14): moved out of taxation/legacy.jsx into
   its business sub-module folder — Taxation TDS/TCS group (href /tax/tds).
   taxation/index.js re-exports TaxTdsTcs from here so App.jsx's barrel import
   needed zero changes. */

import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Calendar, ChevronDown, Download, Plus, Settings, Users } from 'lucide-react';
import { Menu as DropdownMenu } from '../../../core/ux/Menu';
import { useGpBills, useRcmLiability, useProfitAndLoss, useTaxSummary, useConfigValue, useSaveConfigValue, useWithholdingRegister } from '../../../core/useAccounting';
import { useTaxCalendar } from '../../../core/useReference';
import { useMasterMutations } from '../../../core/useMasters';
import { toast } from '../../../core/ux/toast';
import { CUR_MONTH, MONTH_OPTIONS, monthLabel, monthLabelLong, todayISO, CUR_FY, fyOptions, fyRange, rangeNote } from '../../../core/dates';
import { fmt, fmtINR } from '../../../core/format';
import { _TCS_ENTRIES, _TDS_ENTRIES, cardStyle } from '../../../core/helpers';
import { useTdsLedgerStatements, tdsAccrualEntries, tdsReliefTotal, taxableOf, gstOf, saleBills, fyQuarterOfISO } from '../taxLive';
import { useMobile } from '../../../core/hooks';
import { useModalEsc } from '../../../core/ux/useModalEsc';
import { clickable } from '../../../core/ux/clickable';
import { listKeyNav } from '../../../core/ux/listKeys';
import { B, FL, RPT_tdStyle, RPT_thStyle, bc, btnG, btnGh, card, inp, tabBtnStyle } from '../../../core/styles';
import { MiniBar, share, pctText } from '../../../core/insightsUI';
import { TDS_SECTIONS } from '../../../core/taxSections';
import { PHASE2_Page } from '../../../shell/PHASE2_Page';
import { openPrintPreview } from '../../../core/PrintPreview';
import { SampleBanner } from '../../../core/ux/SampleBanner';
import { isVatBranch } from '../../../core/voucherSpecs';

// Regime wrapper: India (GST) branches get the TDS/TCS register; Africa (VAT) branches
// get the Withholding Tax (WHT) register instead — same "Withholding Tax" menu entry
// (/tax/tds), forked by branch so NBO/DAR/FBM never see India 194C / 26Q / 206C in ₹.
export function TaxTdsTcs({ branch }) {
  const brCode = branch === 'ALL' ? null : (branch?.code || null);
  return isVatBranch(brCode) ? <WhtRegister branch={branch} /> : <TdsTcsIndia branch={branch} />;
}

function TdsTcsIndia({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:(branch?.code||null);   // null = consolidated (all branches)
  const [tab,setTab]=useState("tds"); // tds | tcs | challan
  const [period,setPeriod]=useState(CUR_MONTH);
  const PERIODS=MONTH_OPTIONS;
  const [tdsEntries,setTdsEntries]=useState(_TDS_ENTRIES);
  const [modal,setModal]=useState(false); useModalEsc(()=>setModal(false),modal);
  const [form,setForm]=useState({payee:"",pan:"",section:"194C",nature:"",gross:0,date:""});

  const tFiltered=tdsEntries.filter(t=>(t.date||'').startsWith(period));
  const totTds=tFiltered.reduce((s,t)=>s+t.tds,0);
  const totPending=tFiltered.filter(t=>t.status!=="Deposited").reduce((s,t)=>s+t.tds,0);
  const totTcs=_TCS_ENTRIES.filter(t=>(t.date||'').startsWith(period)).reduce((s,t)=>s+t.tcs,0);
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");

  const markDeposited=(id)=>setTdsEntries(ts=>ts.map(t=>t.id===id?{...t,status:"Deposited",challanDate:"2026-05-"+new Date().getDate().toString().padStart(2,"0"),challanBsr:"0600115",challanSerial:String(Math.floor(Math.random()*90000)+10000)}:t));

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📋</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>TDS / TCS Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{brCode||"All branches"} · {PERIODS.find(p=>p.v===period)?.l} · TDS due 7th · Form 26Q / 27EQ data</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          {tab==="tds"&&<button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Add TDS Entry</button>}
        </div>
      </div>

      {totPending>0&&<div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600,display:"flex",gap:8}}>
        <AlertTriangle size={14}/> {f(totPending)} TDS pending deposit — deposit by 7th of next month to avoid interest (1.5%/mo) and penalty
      </div>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[{l:"TDS Deducted",v:f(totTds),c:"#854F0B",bg:"#FAEEDA"},
          {l:"TDS Pending Deposit",v:f(totPending),c:"#A32D2D",bg:"#FCEBEB"},
          {l:"TCS Collected",v:f(totTcs),c:"#185FA5",bg:"#E6F1FB"},
          {l:"TDS Entries",v:String(tFiltered.length),c:"#384677",bg:"#f3f4f8"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:mob?17:21,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,background:"#f3f4f8",borderRadius:"9px 9px 0 0",border:"1px solid #cdd1d8",overflow:"hidden",marginBottom:0}}>
        <button onClick={()=>setTab("tds")} style={{padding:"8px 14px",border:"none",cursor:"pointer",fontWeight:tab==="tds"?700:500,background:tab==="tds"?"#fff":"transparent",borderRadius:6,fontSize:11}}>TDS Register (194C/H/J/D)</button><button onClick={()=>setTab("tcs")} style={{padding:"8px 14px",border:"none",cursor:"pointer",fontWeight:tab==="tcs"?700:500,background:tab==="tcs"?"#fff":"transparent",borderRadius:6,fontSize:11}}>TCS Register (206C 1G)</button><button onClick={()=>setTab("lower")} style={{padding:"8px 14px",border:"none",cursor:"pointer",fontWeight:tab==="lower"?700:500,background:tab==="lower"?"#fff":"transparent",borderRadius:6,fontSize:11}}>Lower Deduction Certs</button>
      </div>

      {tab==="tds"&&(
        <div style={{...card,padding:0,overflow:"hidden",borderTop:"none",borderRadius:"0 0 9px 9px"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Date","Payee","PAN","Section","Nature","Gross","Rate","TDS Amt","Net Paid","Challan/Status","Action"].map((h,i)=>(
                <th key={i} style={{padding:"8px 10px",textAlign:i>=5&&i<=7?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{tFiltered.map((t,i)=>(
              <tr key={t.id} style={{borderBottom:"1px solid #dfe2e7",background:t.status!=="Deposited"?"#fffaf0":i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"7px 10px",color:"#5a6691",whiteSpace:"nowrap"}}>{t.date}</td>
                <td style={{padding:"7px 10px",fontWeight:600,color:"#0d1326"}}>{t.payee}</td>
                <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:9.5,color:"#5a6691"}}>{t.pan}</td>
                <td style={{padding:"7px 10px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#FAEEDA",color:"#854F0B",fontWeight:700}}>{t.section}</span></td>
                <td style={{padding:"7px 10px",fontSize:10.5,color:"#384677"}}>{t.nature}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(t.gross)}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:"#854F0B"}}>{t.rate}%</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{f(t.tds)}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(t.net)}</td>
                <td style={{padding:"7px 10px"}}>
                  {t.status==="Deposited"
                    ?<div>
                      <p style={{margin:0,fontSize:9.5,color:"#27500A",fontWeight:700}}>✔ Deposited</p>
                      <p style={{margin:0,fontSize:8.5,color:"#5a6691"}}>{t.challanDate} · BSR {t.challanBsr}</p>
                    </div>
                    :<span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,background:"#FCEBEB",color:"#A32D2D",fontWeight:700}}>Pending</span>
                  }
                </td>
                <td style={{padding:"7px 10px"}}>
                  {t.status!=="Deposited"&&<button onClick={()=>markDeposited(t.id)} style={{...btnG,padding:"2px 8px",fontSize:9.5,background:"#27500A",whiteSpace:"nowrap"}}>Mark Paid</button>}
                </td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
              <td colSpan={5} style={{padding:"8px 10px",fontWeight:700,color:"#d4a437",fontSize:11}}>TOTAL — {tFiltered.length} entries · 26Q basis</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(tFiltered.reduce((s,t)=>s+t.gross,0))}</td>
              <td style={{padding:"8px 10px",textAlign:"right",color:"#8b94b3"}}/>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totTds)}</td>
              <td colSpan={3}/>
            </tr></tfoot>
          </table>
        </div>
      )}

      {tab==="tcs"&&(
        <div style={{...card,padding:0,overflow:"hidden",borderTop:"none",borderRadius:"0 0 9px 9px"}}>
          <div style={{padding:"10px 14px",background:"#E6F1FB",borderBottom:"1px solid #B5D4F4",fontSize:10.5,color:"#185FA5"}}>
            <b>TCS u/s 206C(1G)</b> — TCS must be collected from buyer when booking international holiday packages &gt; ₹7,00,000. Rate: 5% (PAN provided) / 10% (No PAN). Deposit by 7th of next month. Quarterly return: Form 27EQ.
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#0d1326"}}>
              {["Date","Client","PAN","Section","Nature","Package Value","Rate","TCS Collected","Deposit Due","Status"].map((h,i)=>(
                <th key={i} style={{padding:"8px 10px",textAlign:i>=5&&i<=7?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{_TCS_ENTRIES.filter(t=>(t.date||'').startsWith(period)).map((t,i)=>(
              <tr key={t.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"7px 10px",color:"#5a6691"}}>{t.date}</td>
                <td style={{padding:"7px 10px",fontWeight:600,color:"#0d1326"}}>{t.collector}</td>
                <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:9.5}}>{t.pan}</td>
                <td style={{padding:"7px 10px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{t.section}</span></td>
                <td style={{padding:"7px 10px",fontSize:10.5,color:"#384677"}}>{t.nature}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>₹{t.gross.toLocaleString()}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:"#185FA5"}}>{t.rate}%</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:"#185FA5",fontVariantNumeric:"tabular-nums"}}>₹{t.tcs.toLocaleString()}</td>
                <td style={{padding:"7px 10px",color:"#5a6691",whiteSpace:"nowrap"}}>{t.depositDue}</td>
                <td style={{padding:"7px 10px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,background:"#EAF3DE",color:"#27500A",fontWeight:700}}>{t.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab==="challan"&&(
        <div style={{...card,borderTop:"none",borderRadius:"0 0 9px 9px"}}>
          <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>Challan Summary — {PERIODS.find(p=>p.v===period)?.l}</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:12}}>
            {Object.entries(TDS_SECTIONS).filter(([k])=>k!=="None").map(([sec,def])=>{
              const secEntries=tFiltered.filter(t=>t.section===sec);
              const secTotal=secEntries.reduce((s,t)=>s+t.tds,0);
              if(secEntries.length===0)return null;
              return (
                <div key={sec} style={{padding:"12px 14px",borderRadius:9,border:"1px solid #cdd1d8",background:"#f9fafb"}}>
                  <p style={{margin:"0 0 4px",fontSize:12,fontWeight:700,color:"#0d1326"}}>{sec}</p>
                  <p style={{margin:"0 0 8px",fontSize:10.5,color:"#5a6691"}}>{def.label.split("—")[1]?.trim()||def.label}</p>
                  <p style={{margin:"0 0 4px",fontSize:16,fontWeight:800,color:"#854F0B"}}>₹{secTotal.toLocaleString()}</p>
                  <p style={{margin:0,fontSize:9.5,color:"#5a6691"}}>{secEntries.length} deductions · Due: 7th Jun 2026</p>
                  <div style={{marginTop:8}}>
                    <div style={{display:"flex",gap:8,fontSize:9.5,color:"#5a6691"}}>
                      <span>BSR Code:</span><input style={{flex:1,border:"1px solid #cdd1d8",borderRadius:4,padding:"2px 6px",fontSize:10,fontFamily:"monospace"}} placeholder="BSRXXX"/>
                      <span>S.No.:</span><input style={{width:60,border:"1px solid #cdd1d8",borderRadius:4,padding:"2px 6px",fontSize:10,fontFamily:"monospace"}} placeholder="00000"/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #cdd1d8",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Record TDS Deduction</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Date"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={inp}/></FL>
                <FL label="TDS Section"><select value={form.section} onChange={e=>setForm(f=>({...f,section:e.target.value}))} style={inp}>
                  {Object.entries(TDS_SECTIONS).filter(([k])=>k!=="None").map(([k,v])=><option key={k} value={k}>{k} — {v.rate}%</option>)}
                </select></FL>
              </div>
              <FL label="Payee name"><input value={form.payee} onChange={e=>setForm(f=>({...f,payee:e.target.value}))} style={inp}/></FL>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Payee PAN"><input value={form.pan} onChange={e=>setForm(f=>({...f,pan:e.target.value.toUpperCase()}))} style={{...inp,fontFamily:"monospace"}} maxLength={10}/></FL>
                <FL label="Nature of payment"><input value={form.nature} onChange={e=>setForm(f=>({...f,nature:e.target.value}))} style={inp}/></FL>
              </div>
              <FL label="Gross amount"><input type="number" value={form.gross} onChange={e=>{const g=+e.target.value;setForm(f=>({...f,gross:g}));}} style={inp}/></FL>
              {form.gross>0&&TDS_SECTIONS[form.section]&&<div style={{padding:"8px 12px",borderRadius:8,background:"#FAEEDA",fontSize:10,color:"#854F0B"}}>
                TDS @ {TDS_SECTIONS[form.section].rate}% = ₹{Math.round(form.gross*TDS_SECTIONS[form.section].rate/100).toLocaleString()} · Net payable: ₹{Math.round(form.gross*(1-TDS_SECTIONS[form.section].rate/100)).toLocaleString()}
              </div>}
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #cdd1d8",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={()=>{
                const tds=Math.round(form.gross*(TDS_SECTIONS[form.section]?.rate||0)/100);
                const id=`TDS${String(tdsEntries.length+1).padStart(3,"0")}`;
                setTdsEntries(ts=>[...ts,{...form,id,tds,net:form.gross-tds,status:"Pending",quarter:"Q1 FY27",challanBsr:"",challanDate:"",challanSerial:""}]);
                setModal(false);
              }} style={{...btnG,background:"#854F0B"}}>Record TDS</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   WITHHOLDING TAX (WHT) REGISTER — Africa (VAT) branches
   The India-world TDS/TCS register has no meaning for NBO/DAR/FBM (no 194C /
   26Q / 206C, and books are in USD). This is the regime-appropriate view they
   get from the "Withholding Tax" menu: WHT deducted at source on supplier
   payments / purchase-expense vouchers (→ WHT Payable) and WHT withheld from
   our receipts (→ WHT Receivable), in the branch currency.
   ════════════════════════════════════════════════════════════════ */
function WhtRegister({ branch }) {
  const brCode = branch === 'ALL' ? null : (branch?.code || null);
  const cur = (bc({ code: brCode }) || {}).cur || '$';
  const [period, setPeriod] = useState(CUR_MONTH);
  const PERIODS = MONTH_OPTIONS;
  // Live WHT register — postings to WHT Payable / WHT Receivable for this branch + period.
  const { data, isLoading } = useWithholdingRegister(branch, period);
  const rows = (data && data.rows) || [];
  const totals = (data && data.totals) || { payable: 0, receivable: 0 };
  // 2dp, NOT whole units: a USD book bills to the CENT (voucherSpecs deliberately skips the
  // whole-unit round-off for non-INR), so rounding a $12.50 withholding to "$13" would both
  // misstate it and stop the tiles footing to the rows. Whole-unit is an INR convention
  // inherited from the India register.
  const f = (n) => cur + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div style={{ padding: '12px 10px', maxWidth: 1600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EAF3F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧾</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0d1326' }}>Withholding Tax (WHT) Register</h2>
            <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#5a6691' }}>{brCode || 'All branches'} · {PERIODS.find((p) => p.v === period)?.l} · WHT withheld on supplier payments</p>
          </div>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11 }}>
          {PERIODS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 14 }}>
        {[{ l: 'WHT Payable (we withheld)', v: f(totals.payable), c: '#1a6b52', bg: '#EAF3F0' },
          { l: 'WHT Receivable (withheld from us)', v: f(totals.receivable), c: '#185FA5', bg: '#E6F1FB' },
          { l: 'WHT Entries', v: String(rows.length), c: '#384677', bg: '#f3f4f8' },
        ].map((k, i) => (
          <div key={i} style={{ ...card, borderTop: `3px solid ${k.c}`, padding: '11px 13px', background: k.bg }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: k.c, textTransform: 'uppercase' }}>{k.l}</p>
            <p style={{ margin: '4px 0 0', fontSize: 21, fontWeight: 800, color: '#0d1326' }}>{k.v}</p>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 9, background: '#EAF3F0', border: '1px solid #BFDDD3', fontSize: 10.5, color: '#1a6b52' }}>
        Withholding Tax is deducted at source on supplier/vendor payments and purchase-expense vouchers for {brCode || 'this branch'}. Deducted WHT posts to <b>WHT Payable</b> and is remitted to the local revenue authority per the branch's WHT rules; WHT withheld from our own receipts posts to <b>WHT Receivable</b> (recoverable). Amounts are in {cur}.
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead><tr style={{ background: '#0d1326' }}>
            {['Date', 'Party', 'Voucher', 'Direction', 'Ledger', 'WHT Amt'].map((h, i) => (
              <th key={i} style={{ padding: '8px 10px', textAlign: i === 5 ? 'right' : 'left', color: '#5fb89b', fontWeight: 700, fontSize: 9.5, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '26px 14px', textAlign: 'center', color: '#8b94b3', fontSize: 11 }}>
                {isLoading ? 'Loading…' : <>No WHT entries for {PERIODS.find((p) => p.v === period)?.l}. WHT is captured on purchase-expense &amp; payment vouchers.</>}
              </td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #dfe2e7', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '7px 10px', color: '#5a6691', whiteSpace: 'nowrap' }}>{r.date}</td>
                <td style={{ padding: '7px 10px', fontWeight: 600, color: '#0d1326' }}>{r.party || '—'}</td>
                <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: 9.5, color: '#5a6691' }}>{r.voucherNo}</td>
                <td style={{ padding: '7px 10px' }}><span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 999, background: r.direction === 'payable' ? '#EAF3F0' : '#E6F1FB', color: r.direction === 'payable' ? '#1a6b52' : '#185FA5', fontWeight: 700 }}>{r.direction === 'payable' ? 'Payable' : 'Receivable'}</span></td>
                <td style={{ padding: '7px 10px', fontSize: 10, color: '#384677' }}>{r.ledger}</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: r.direction === 'payable' ? '#1a6b52' : '#185FA5', fontVariantNumeric: 'tabular-nums' }}>{f(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SALES HOLIDAY — ENHANCED with GST scheme + component breakout
   ════════════════════════════════════════════════════════════════ */

/* Form 26AS — TDS-receivable view, LIVE from the books: the TDS Receivable
   chart ledgers' Dr accruals (a customer/supplier withheld tax on us), grouped
   by deductor × section. The 26AS side itself lives on TRACES and is NOT in the
   system — that column stays honestly blank until a 26AS import exists (same
   stance as the GSTR-2B reconciliation). */
