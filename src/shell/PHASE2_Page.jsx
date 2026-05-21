/* ════════════════════════════════════════════════════════════════════
   SHELL/PHASE2_PAGE.JSX
   Auto-generated from KBiz360_v2.jsx · 22 lines · 1 declarations
   ════════════════════════════════════════════════════════════════════ */

import React from 'react';
import { tabBtnStyle } from '../core/styles';

export function PHASE2_Page({title, subtitle, toolbar, children}){
  return (
    <div style={{padding:18, maxWidth:1400, margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:14,marginBottom:14,paddingBottom:12,borderBottom:"1px solid #e1e3ec"}}>
        <div>
          <h2 style={{margin:0, fontSize:20, color:"#0d1326", fontWeight:700}}>{title}</h2>
          <p style={{margin:"3px 0 0", fontSize:12, color:"#5a6691"}}>{subtitle}</p>
        </div>
        {toolbar && <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>{toolbar}</div>}
      </div>
      {children}
    </div>
  );
}

/* tabBtnStyle defined earlier in file (line ~22317) */

/* ════════════════════════════════════════════════════════════════════
   1. CUSTOMER MASTER — DETAIL VIEW (universal 10-tab pattern)
   Demonstrates: tabs, active toggle, duplicate check, merge, last-modified footer, inline audit
   ════════════════════════════════════════════════════════════════════ */

