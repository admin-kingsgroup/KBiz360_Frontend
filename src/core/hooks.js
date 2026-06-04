/* ════════════════════════════════════════════════════════════════════
   CORE/HOOKS.JS
   Auto-generated from KBiz360_v2.jsx · 73 lines · 7 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from 'react';
import { Save, Settings, User } from 'lucide-react';
import { _EXP_BGT_LISTENERS, _SAVE_LISTENERS, genVNo } from './data';
import { _NOTIF_LISTENERS } from './helpers';

export function useVNo(branch,pfx){
  const [vNo]=useState(()=>genVNo(branch,pfx));
  return vNo;
}



/* ── Branch-aware navigation menu ──────────────────────────────────
   Taxation section (India / GST):
   India  (TKHO/BOM/AMD) → GST modules (GSTR-1, GSTR-3B, TDS, RCM, E-Invoice)
   Travkings Group          → Full list (consolidated view)
   ─────────────────────────────────────────────────────────────── */

/* Sections common to every branch */
/* ══════════════════════════════════════════════════════════════════
   NAVIGATION — CLEAN & COMPACT (KBiz360 v1.0)
   Logic: Operational flow → Masters → Finance → Tax → Reports → HR → Settings
   Section dividers use {divider:true, label:"..."} for visual grouping
   ════════════════════════════════════════════════════════════════ */

/* ── MASTERS ─────────────────────────────────────────────────── */

export function useMobile(bp=768){
  const [mob,setMob]=useState(()=>typeof window!=="undefined"&&window.innerWidth<bp);
  useEffect(()=>{
    const fn=()=>setMob(window.innerWidth<bp);
    window.addEventListener("resize",fn);
    return()=>window.removeEventListener("resize",fn);
  },[bp]);
  return mob;
}

/* Print a voucher in a new window */
/* ── Print / PDF helper ─────────────────────────────────────────
   Generates a full A4 invoice HTML and downloads it as a file.
   User opens the file → Ctrl+P → Save as PDF.
   Also sets a React state to show an in-page preview modal.
   ─────────────────────────────────────────────────────────────── */
let _printModalSetter=null; /* set by PrintModal component */


export function triggerSaveRefresh(){_SAVE_LISTENERS.forEach(fn=>fn());}

export function useSaveRefresh(){
  const [tick,setTick]=useState(0);
  useEffect(()=>{
    const fn=()=>setTick(t=>t+1);
    _SAVE_LISTENERS.add(fn);
    return()=>_SAVE_LISTENERS.delete(fn);
  },[]);
  return tick;
}


export function useBgtRefresh(){
  const [t,setT]=useState(0);
  useEffect(()=>{
    const fn=()=>setT(x=>x+1);
    _EXP_BGT_LISTENERS.add(fn);
    return()=>_EXP_BGT_LISTENERS.delete(fn);
  },[]);
  return t;
}

export function useIsMob(){const [m,setM]=useState(()=>window.innerWidth<768);return m;}

/* ── Branches ─────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════
   SETTINGS → BRANCH CONFIGURATION — COMPLETE REBUILD
   All 18 missing fields added + structured bank accounts
   ════════════════════════════════════════════════════════════════ */


export function useNotifRefresh(){
  const [t,setT]=useState(0);
  useEffect(()=>{const fn=()=>setT(x=>x+1);_NOTIF_LISTENERS.add(fn);return()=>_NOTIF_LISTENERS.delete(fn);},[]);
  return t;
}
