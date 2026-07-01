import React from 'react';

/* ════════════════════════════════════════════════════════════════════
   ui — tiny presentational primitives shared across eager + lazy modules
   ════════════════════════════════════════════════════════════════════
   Extracted from helpers.jsx so eager shell components (e.g. SideNav) can use
   them without pulling the whole helpers feature into the initial bundle.
   helpers.jsx re-exports these under their original names. */

/* Label/value row used in compact summary panels. */
export function TRow({ l, v }){
  return (
    <div style={{display:"flex",justifyContent:"space-between",
      fontSize:11.5,padding:"3px 0",borderBottom:"1px solid #dfe2e7"}}>
      <span style={{color:"#5a6691"}}>{l}</span>
      <span style={{fontVariantNumeric:"tabular-nums"}}>{v}</span>
    </div>
  );
}
