/* ════════════════════════════════════════════════════════════════════
   SHELL/SIDENAV.JSX
   Auto-generated from KBiz360_v2.jsx · 157 lines · 1 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Menu, Search, User } from 'lucide-react';
import { TRow } from '../core/helpers';
import { getMenu } from '../core/menus';
import { bc } from '../core/styles';
import { BranchSwitcher } from './BranchSwitcher';
import { UserSwitcher } from './UserSwitcher';

export function SideNav({branch,setBranch,route,setRoute,onClose,currentUser,switchUser}){
  const cfg=bc(branch);
  const isIndia=cfg.taxType==="GST";
  const menu=getMenu(branch, currentUser);
  const [exp,setExp]=useState({});
  const go=href=>{setRoute(href);if(onClose)onClose();};

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",
      background:"#0d1326",overflow:"hidden"}}>
      {/* User + Branch switchers */}
      <div style={{padding:"10px 12px",borderBottom:"1px solid #1a2340",flexShrink:0}}>
        <UserSwitcher currentUser={currentUser} switchUser={switchUser}/>
        <BranchSwitcher branch={branch} setBranch={setBranch} currentUser={currentUser}/>
        <div style={{marginTop:7,padding:"3px 8px",borderRadius:5,fontSize:9.5,fontWeight:700,
          textAlign:"center",background:isIndia?"#185FA520":"#27500A20",
          color:isIndia?"#5da0e0":"#5ab84b",
          border:"1px solid "+(isIndia?"#185FA540":"#27500A40")}}>
          {branch==="ALL"?"🌐 Multi-regime":isIndia?"🇮🇳 GST Regime":"🌍 VAT Regime"}
        </div>
      </div>
      {/* Search filter */}
      <div style={{padding:"6px 10px",borderBottom:"1px solid #1a2340",flexShrink:0}}>
        <input placeholder="Search menu..." id="navSearch"
          onChange={e=>{
            const q=e.target.value.toLowerCase();
            document.querySelectorAll("[data-nav-label]").forEach(el=>{
              el.style.display=el.dataset.navLabel.toLowerCase().includes(q)||q===""?"":"none";
            });
          }}
          style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid #2a3550",
            borderRadius:6,padding:"9px 10px",fontSize:12,color:"#c8cfe0",outline:"none",
            boxSizing:"border-box",WebkitAppearance:"none"}}/>
      </div>
      {/* Menu */}
      <div style={{flex:1,overflowY:"auto",paddingTop:4}}>
        {menu.map((item,idx)=>{
          if(!item.children){
            const active=route===item.href;
            return (
              <div key={idx} onClick={()=>go(item.href)}
                style={{display:"flex",alignItems:"center",gap:9,padding:"11px 14px",minHeight:44,
                  cursor:"pointer",borderRadius:"6px",margin:"1px 6px",
                  WebkitTapHighlightColor:"transparent",userSelect:"none",touchAction:"manipulation",
                  background:active?"rgba(212,164,55,0.12)":"transparent",
                  borderLeft:active?"3px solid #d4a437":"3px solid transparent"}}>
                {item.icon&&<item.icon size={14} style={{color:active?"#d4a437":"#A32D2D",flexShrink:0}}/>}
                <span style={{fontSize:12,fontWeight:active?700:500,
                  color:active?"#d4a437":"#A32D2D",letterSpacing:"0.01em"}}>{item.label}</span>
              </div>
            );
          }
          const anyActive=item.children.some(c=>route===c.href);
          const isOpen=exp[item.label]===true;
          return (
            <div key={idx}>
              <div onClick={()=>setExp(e=>({...e,[item.label]:!e[item.label]}))}
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"11px 14px",minHeight:44,cursor:"pointer",borderRadius:"6px",margin:"1px 6px",
                  WebkitTapHighlightColor:"transparent",userSelect:"none",touchAction:"manipulation",
                  borderLeft:anyActive?"3px solid #d4a437":"3px solid transparent",
                  background:anyActive?"rgba(212,164,55,0.1)":isOpen?"rgba(255,255,255,0.03)":"transparent"}}>
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  {item.icon&&<item.icon size={14} style={{color:anyActive?"#d4a437":"#A32D2D",flexShrink:0}}/>}
                  <span style={{fontSize:12,fontWeight:anyActive?700:500,
                    color:anyActive?"#d4a437":"#A32D2D",letterSpacing:"0.01em"}}>{item.label}</span>
                  {item._regime&&(
                    <span style={{fontSize:7.5,padding:"1px 5px",borderRadius:3,fontWeight:800,letterSpacing:"0.5px",
                      background:item._regime==="GST"?"#185FA530":item._regime==="VAT"?"#27500A30":"#d4a43730",
                      color:item._regime==="GST"?"#5da0e0":item._regime==="VAT"?"#5ab84b":"#d4a437"}}>
                      {item._regime}
                    </span>
                  )}
                </div>
                <ChevronDown size={11} style={{color:anyActive?"#d4a437":"#3d4a6b",flexShrink:0,
                  transform:isOpen?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s"}}/>
              </div>
              {isOpen&&(
                <div>
                  {item.children.map((c,ci)=>{
                    /* Divider / section label */
                    if(c.divider){
                      return (
                        <div key={ci} style={{padding:"6px 16px 2px 38px",marginTop:ci===0?0:4}}>
                          <span style={{fontSize:8.5,fontWeight:800,letterSpacing:"0.8px",
                            textTransform:"uppercase",color:"#d4a437"}}>{c.label}</span>
                        </div>
                      );
                    }
                    /* Nested sub-group (children with children) */
                    if(c.children){
                      const subKey = item.label+"__"+c.label;
                      const subOpen = exp[subKey]===true;
                      const subActive = c.children.some(gc=>route===gc.href);
                      return (
                        <div key={ci}>
                          <div onClick={()=>setExp(e=>({...e,[subKey]:!e[subKey]}))}
                            data-nav-label={c.label}
                            style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                              padding:"9px 14px 9px 38px",minHeight:40,cursor:"pointer",margin:"1px 6px",borderRadius:5,
                              WebkitTapHighlightColor:"transparent",userSelect:"none",touchAction:"manipulation",
                              background:subActive?"rgba(212,164,55,0.10)":subOpen?"rgba(255,255,255,0.03)":"transparent"}}>
                            <span style={{fontSize:11.5,fontWeight:subActive||subOpen?700:500,
                              color:subActive?"#d4a437":"#A32D2D"}}>{c.label}</span>
                            {subOpen
                              ? <ChevronDown size={11} style={{color:"#5a6691"}}/>
                              : <ChevronRight size={11} style={{color:"#5a6691"}}/>}
                          </div>
                          {subOpen&&c.children.map((gc,gci)=>{
                            const gActive=route===gc.href;
                            return (
                              <div key={gci} onClick={()=>go(gc.href)}
                                data-nav-label={gc.label}
                                style={{display:"flex",alignItems:"center",gap:6,
                                  padding:"9px 14px 9px 54px",minHeight:40,cursor:"pointer",margin:"0 6px",borderRadius:4,
                                  WebkitTapHighlightColor:"transparent",userSelect:"none",touchAction:"manipulation",
                                  background:gActive?"rgba(212,164,55,0.12)":"transparent",
                                  borderLeft:gActive?"3px solid #d4a437":"3px solid transparent"}}>
                                <span style={{fontSize:11,fontWeight:gActive?700:400,
                                  color:gActive?"#d4a437":"#A32D2D"}}>{gc.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    const ca=route===c.href;
                    return (
                      <div key={ci} onClick={()=>go(c.href)}
                        data-nav-label={c.label} style={{display:"flex",alignItems:"center",gap:6,
                          padding:"9px 14px 9px 38px",minHeight:40,cursor:"pointer",
                          WebkitTapHighlightColor:"transparent",userSelect:"none",touchAction:"manipulation",
                          background:ca?"rgba(212,164,55,0.12)":"transparent",
                          borderLeft:ca?"3px solid #d4a437":"3px solid transparent",
                          borderRadius:"0 6px 6px 0",margin:"1px 6px 1px 0"}}>
                        {ca&&<div style={{width:4,height:4,borderRadius:"50%",background:"#d4a437",flexShrink:0}}/>}
                        <span style={{fontSize:11,fontWeight:ca?700:400,
                          color:ca?"#d4a437":"#fff",lineHeight:1.3}}>{c.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Footer */}
      <div style={{padding:"10px 16px",borderTop:"1px solid #1a2340",flexShrink:0}}>
        <p style={{margin:0,fontSize:9,color:"#384677",textAlign:"center"}}>KBiz360 v1.0 · THE BUSINESS ENGINE</p>
      </div>
    </div>
  );
}


/* ── TRow ── */
