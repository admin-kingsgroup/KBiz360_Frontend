import { useState, useEffect } from 'react';
import { clickable } from '../../../core/ux/clickable';
import { card } from '../../../core/styleTokens';

const _DM_LISTENERS=new Set();

function toggleDarkMode(){_DARK_MODE=!_DARK_MODE;_DM_LISTENERS.forEach(fn=>fn(_DARK_MODE));}

function useDarkMode(){
  const [dark,setDark]=useState(_DARK_MODE);
  useEffect(()=>{_DM_LISTENERS.add(setDark);return()=>_DM_LISTENERS.delete(setDark);},[]);
  return [dark,toggleDarkMode];
}

/* ── TABLE ROW DENSITY ── */
let _DENSITY="comfortable"; // compact | comfortable | spacious

const _DENSITY_LISTENERS=new Set();

function setDensity(d){_DENSITY=d;_DENSITY_LISTENERS.forEach(fn=>fn(d));}

function useDensity(){
  const [d,setD]=useState(_DENSITY);
  useEffect(()=>{_DENSITY_LISTENERS.add(setD);return()=>_DENSITY_LISTENERS.delete(setD);},[]);
  const pad={compact:"4px 8px",comfortable:"8px 12px",spacious:"13px 16px"}[d]||"8px 12px";
  const fs={compact:10.5,comfortable:11.5,spacious:12.5}[d]||11.5;
  return {density:d,pad:pad,fs:fs};
}

export function UxPreferences(){
  const [dark,toggleDark]=useDarkMode();
  const {density}=useDensity();

  return (
    <div style={{padding:"12px 10px",maxWidth:700,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>⚙</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Display Preferences</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Personalise your KBiz360 experience</p>
        </div>
      </div>

      <div style={{...card,marginBottom:12}}>
        <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>🌙 Dark Mode</p>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{margin:0,fontSize:12,color:"#384677"}}>Dark theme for low-light environments</p>
            <p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691"}}>Currently: <b>{dark?"Dark":"Light"}</b></p>
          </div>
          <div {...clickable(toggleDark)} style={{width:48,height:26,borderRadius:13,background:dark?"#0d1326":"#e1e3ec",cursor:"pointer",
            position:"relative",transition:"background 0.2s",border:`2px solid ${dark?"#d4a437":"#bfc3d6"}`}}>
            <div style={{position:"absolute",top:2,left:dark?22:2,width:18,height:18,borderRadius:"50%",
              background:dark?"#d4a437":"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
          </div>
        </div>
      </div>

      <div style={{...card,marginBottom:12}}>
        <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>📏 Table Density</p>
        <div style={{display:"flex",gap:8}}>
          {["compact","comfortable","spacious"].map(d=>(
            <button key={d} onClick={()=>setDensity(d)} style={{
              flex:1,padding:"10px",borderRadius:8,cursor:"pointer",fontWeight:600,
              textTransform:"capitalize",fontSize:11,
              background:density===d?"#0d1326":"#f3f4f8",
              color:density===d?"#d4a437":"#384677",
              border:`2px solid ${density===d?"#d4a437":"#e1e3ec"}`
            }}>{d}</button>
          ))}
        </div>
        <p style={{margin:"8px 0 0",fontSize:10,color:"#5a6691"}}>Compact = more rows visible. Spacious = easier reading. Currently: <b style={{textTransform:"capitalize"}}>{density}</b></p>
      </div>

      <div style={{...card,marginBottom:12}}>
        <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>⌨ Keyboard Shortcuts</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Ctrl+K","Global Search / Command Palette"],["Ctrl+S","Save current voucher"],["Ctrl+N","New voucher (current module)"],["Esc","Close modal / cancel"],["Alt+D","Jump to Dashboard"],["Alt+S","Jump to Sales → Flight"],["Alt+P","Jump to Purchase → Flight"],["Alt+R","Jump to GP Reports"],].map(([k,v])=>(
            <div key={k} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 8px",borderRadius:7,background:"#f3f4f8"}}>
              <kbd style={{padding:"2px 8px",borderRadius:4,background:"#0d1326",color:"#d4a437",fontFamily:"monospace",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{k}</kbd>
              <span style={{fontSize:10.5,color:"#384677"}}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{...card}}>
        <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>📊 Export Options</p>
        <p style={{margin:0,fontSize:11,color:"#5a6691"}}>Every report and table has an Export CSV button. Click it to download data to Excel. For PDF exports, use the Print button and select "Save as PDF" in the print dialog. The Itinerary Builder has direct HTML export.</p>
      </div>
    </div>
  );
}
