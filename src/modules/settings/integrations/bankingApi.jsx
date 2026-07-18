/* ════════════════════════════════════════════════════════════════════
   BANKING API INTEGRATION  /settings/banking-api
   Credentials persist via the existing /api/app-config mechanism (key
   'integration.banking'); the integration itself stays DORMANT (no bank
   aggregator contract yet): Test Connection / enable stay disabled. Secrets
   are stored as entered (single-company internal tool) but masked in the UI
   after save — leaving a secret blank on re-save keeps the stored one.
   ════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useConfigValue, useSaveConfigValue } from '../../../core/useAccounting';
import { toast } from '../../../core/ux/toast';
import { useMobile } from '../../../core/hooks';
import { FL, inp, btnG, btnGh } from '../../../core/styles';
import { isViewOnly, VIEW_ONLY_REASON } from '../../../shell/primitives';

const BANKING_CONFIG_KEY='integration.banking';
const BANKING_AWAITING='Awaiting bank API / aggregator provider contract — Test Connection and live sync stay disabled until then.';

export function BankingApiSettings({branch,setRoute}){
  const mob=useMobile();
  const q=useConfigValue(BANKING_CONFIG_KEY);
  const saved=q.data||{};
  const saveCfg=useSaveConfigValue();
  const [form,setForm]=useState({bankName:"",provider:"",apiBase:"",clientId:"",accountNo:"",clientSecret:"",apiKey:""});
  const [dirty,setDirty]=useState(false);
  useEffect(()=>{
    if(!q.data||dirty)return;
    setForm(f=>({...f,bankName:q.data.bankName||"",provider:q.data.provider||"",apiBase:q.data.apiBase||"",clientId:q.data.clientId||"",accountNo:q.data.accountNo||""}));
  },[q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const set=(k)=>(e)=>{setDirty(true);setForm(f=>({...f,[k]:e.target.value}));};
  const configured=!!(saved.apiBase||saved.clientId||saved.bankName);
  const vo=isViewOnly(); // view-only accounts can review credentials but not save them

  const onSave=()=>{
    const value={
      ...saved,
      bankName:form.bankName.trim(),provider:form.provider.trim(),apiBase:form.apiBase.trim(),
      clientId:form.clientId.trim(),accountNo:form.accountNo.trim(),
      ...(form.clientSecret?{clientSecret:form.clientSecret}:{}),   // blank = keep stored secret
      ...(form.apiKey?{apiKey:form.apiKey}:{}),
      enabled:false, // dormant until a provider contract exists
      updatedAt:new Date().toISOString(),
    };
    saveCfg.mutate({key:BANKING_CONFIG_KEY,value,description:'Banking API credentials (integration dormant — awaiting provider contract)'},{
      onSuccess:()=>{toast('Banking API settings saved');setForm(f=>({...f,clientSecret:"",apiKey:""}));setDirty(false);},
      onError:(e)=>toast('Could not save — '+(e?.message||'unknown error'),'error'),
    });
  };

  const card={background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",padding:"12px 14px"};
  const secretHint=(k)=>saved[k]?"••••••••  (saved)":"not set";

  return(
    <div style={{padding:"12px 10px",maxWidth:900,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>🏦 Banking API Integration</h2>
          <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Real-time bank balance · Auto-reconciliation · Bulk NEFT/RTGS — credentials persist here; sync goes live once a provider is contracted</p>
        </div>
        <span style={{fontSize:10,padding:"3px 10px",borderRadius:999,fontWeight:700,background:configured?"#FAEEDA":"#f3f4f8",color:configured?"#854F0B":"#5a6691"}}>
          {configured?"● Credentials saved — integration dormant":"○ Not configured"}
        </span>
      </div>

      <div style={{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:10.5,color:"#854F0B",fontWeight:600}}>
        🔌 {BANKING_AWAITING} Nothing is transmitted anywhere — this page only persists the credentials (app-config <code>{BANKING_CONFIG_KEY}</code>).
      </div>

      <div style={{...card,marginBottom:12}}>
        <p style={{margin:"0 0 12px",fontSize:12.5,fontWeight:700,color:"#0d1326"}}>Provider credentials</p>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
          <FL label="Bank"><input value={form.bankName} onChange={set('bankName')} placeholder="e.g. HDFC Bank" style={inp}/></FL>
          <FL label="Aggregator / API provider"><input value={form.provider} onChange={set('provider')} placeholder="e.g. bank direct API, Setu, Falcon…" style={inp}/></FL>
          <FL label="API endpoint (base URL)"><input value={form.apiBase} onChange={set('apiBase')} placeholder="https://…" style={{...inp,fontFamily:"monospace",fontSize:11}}/></FL>
          <FL label="Account number"><input value={form.accountNo} onChange={set('accountNo')} placeholder="account no." style={{...inp,fontFamily:"monospace",fontSize:11}}/></FL>
          <FL label="Client ID"><input value={form.clientId} onChange={set('clientId')} placeholder="client id" style={{...inp,fontFamily:"monospace",fontSize:11}} autoComplete="off"/></FL>
          <FL label="Client secret"><input type="password" value={form.clientSecret} onChange={set('clientSecret')} placeholder={secretHint('clientSecret')} style={{...inp,fontFamily:"monospace",fontSize:11}} autoComplete="new-password"/></FL>
          <FL label="API key"><input type="password" value={form.apiKey} onChange={set('apiKey')} placeholder={secretHint('apiKey')} style={{...inp,fontFamily:"monospace",fontSize:11}} autoComplete="new-password"/></FL>
        </div>
        <p style={{margin:"8px 0 0",fontSize:10,color:"#5a6691"}}>Secrets are masked after save — leave a secret blank to keep the stored one, type to replace it.</p>
        <div style={{display:"flex",gap:8,alignItems:"center",marginTop:14,flexWrap:"wrap"}}>
          <button onClick={onSave} disabled={saveCfg.isPending||vo} title={vo?VIEW_ONLY_REASON:undefined} style={{...btnG,fontSize:11.5,opacity:(saveCfg.isPending||vo)?0.6:1}}><Save size={13}/> {saveCfg.isPending?"Saving…":"Save credentials"}</button>
          <button disabled title={BANKING_AWAITING} aria-disabled="true" style={{...btnGh,fontSize:11.5,opacity:0.5,cursor:"not-allowed"}}>Test connection</button>
          <span title={BANKING_AWAITING} style={{fontSize:10,padding:"3px 10px",borderRadius:999,fontWeight:700,background:"#f3f4f8",color:"#5a6691"}}>Live sync: awaiting provider contract</span>
        </div>
      </div>

      <div style={{...card,background:"#E6F1FB",border:"1px solid #B5D4F4",fontSize:10,color:"#185FA5"}}>
        Once a bank API / aggregator contract exists: live balances land on the dashboard bank/cash tiles, statement lines feed auto-reconciliation against the Cash/Bank Book, and payment runs can initiate bulk NEFT/RTGS. Until then, bank balances stay manual via the Bank Book.
      </div>
    </div>
  );
}
