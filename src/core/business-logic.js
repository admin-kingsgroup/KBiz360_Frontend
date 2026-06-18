/* ════════════════════════════════════════════════════════════════════
   CORE/BUSINESS-LOGIC.JS
   Auto-generated from KBiz360_v2.jsx · 66 lines · 9 declarations
   ════════════════════════════════════════════════════════════════════ */

import { MODULE_ICONS, PURCHASE_REGISTRY, _MOD_KEY, _UNLINKED_SALES } from './data';
import { _NOTIFS } from './notifStore';

export function getAvailablePurchases(modType,branch){
  const brCode=branch==="ALL"?null:branch?.code;
  return (PURCHASE_REGISTRY[modType]||[]).filter(p=>!p.settled&&(!brCode||p.branch===brCode));
}

export function getAllPurchases(modType,branch){
  const brCode=branch==="ALL"?null:branch?.code;
  return (PURCHASE_REGISTRY[modType]||[]).filter(p=>!brCode||p.branch===brCode);
}


export function settlePurchaseEntry(entry){
  if(!entry)return;
  Object.values(PURCHASE_REGISTRY).forEach(arr=>
    arr.forEach(e=>{if(e.vno===entry.vno&&e.ref===entry.ref)e.settled=true;})
  );
}


export function recordUnlinkedSale(sale){
  if(!_UNLINKED_SALES.some(s=>s.vno===sale.vno&&s.mod===sale.mod))
    _UNLINKED_SALES.push({...sale,
      _source:"sale_unlinked",
      date:new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}),
    });
}


export function getAllUnmatched(branch){
  const brCode=branch==="ALL"?null:branch?.code;
  const mods=["Flight","Holiday","Hotel","Car","Visa","Insurance","Misc"];
  return mods.map(mod=>{
    const purchRows=(PURCHASE_REGISTRY[_MOD_KEY[mod]]||[])
      .filter(e=>!e.settled&&(!brCode||e.branch===brCode))
      .map(e=>({...e,_source:"purch_unsettled",_label:"Purchase not linked to any sale",saleAmt:0}));
    const saleRows=_UNLINKED_SALES
      .filter(s=>s.mod===mod&&(!brCode||s.branch===brCode))
      .map(s=>({...s,_source:"sale_unlinked",_label:"Sale saved without purchase entry"}));
    const rows=[...purchRows,...saleRows];
    return {mod:mod,icon:MODULE_ICONS[mod]||"📋",rows:rows};
  }).filter(m=>m.rows.length>0);
}


export function getUnmatchedTickets(branch){
  const all=getAllUnmatched(branch);
  return (all.find(m=>m.mod==="Flight")||{rows:[]}).rows;
}



export function getUnreadCount(){return _NOTIFS.filter(n=>!n.read).length;}

/* ════════════════════════════════════════════════════════════════
   DEBIT NOTE  /finance/debit-note  (SDN)
   ════════════════════════════════════════════════════════════════ */

export function exportToCSV(rows,headers,filename){
  const csvContent=[headers.join(","),...rows.map(r=>headers.map(h=>{
    const v=String(r[h]||"").replace(/,/g,"").replace(/"/g,"'");
    return `"${v}"`;
  }).join(","))].join("\n");
  const blob=new Blob([csvContent],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=filename;document.body.appendChild(a);
  a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
}

/* ════════════════════════════════════════════════════════════════
   PHASE 2 — BOOKING FILE SYSTEM  /bookings
   ════════════════════════════════════════════════════════════════ */

export function isPinned(route){return _PINNED_ROUTES.some(r=>r.route===route);}
