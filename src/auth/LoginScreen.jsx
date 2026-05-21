/* ════════════════════════════════════════════════════════════════════
   AUTH/LOGINSCREEN.JSX
   Auto-generated from KBiz360_v2.jsx · 312 lines · 1 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Lock, Plane, Users } from 'lucide-react';
import { KBIZ_LOGO } from '../core/brand';
import { _USERS_DATA } from '../core/data';
import { useMobile } from '../core/hooks';

export function LoginScreen({onSignIn}){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [showPwd,setShowPwd]=useState(false);
  const [remember,setRemember]=useState(true);
  const [showAllUsers,setShowAllUsers]=useState(false);
  const [signing,setSigning]=useState(null);
  const mob=useMobile();

  const handleSignIn = (user) => {
    setSigning(user.id);
    setTimeout(()=>onSignIn(user), 500);
  };

  const handleFormSubmit = () => {
    // Try to match email to a user; default to Afshin (Director)
    const matched = _USERS_DATA.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    const target = matched || _USERS_DATA.find(u=>u.name==="Afshin Dhanani") || _USERS_DATA[0];
    handleSignIn(target);
  };

  // Quick-access user tiles (4 representative roles)
  const quickUsers = [
    _USERS_DATA.find(u=>u.name==="Afshin Dhanani"),
    _USERS_DATA.find(u=>u.name==="Faiz Patel"),
    _USERS_DATA.find(u=>u.name==="Sughra Sayed"),
    _USERS_DATA.find(u=>u.name==="Rohan"),
  ].filter(Boolean);

  const roleColor = {
    "Super Admin":"#A32D2D","Director":"#3C1B14",
    "Senior Finance Manager":"#0d1326","Sr. Accounts Executive":"#6B4C8B",
    "Accounts Executive":"#2F7A8E","HR Manager":"#384677",
  };
  const getInitials = (name)=>name.split(" ").map(s=>s[0]).slice(0,2).join("").toUpperCase();

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:mob?"column":"row",
      background:"#0d1326",overflow:mob?"auto":"hidden"}}>

      {/* ═══════ LEFT PANEL — TRAVKINGS BRAND STORY ═══════ */}
      <div style={{flex:mob?"none":"0 0 52%",position:"relative",
        background:"linear-gradient(135deg,#0d1326 0%,#1a2340 60%,#2a1810 100%)",
        padding:mob?"36px 24px 24px":"50px 50px",
        display:"flex",flexDirection:"column",justifyContent:"space-between",
        minHeight:mob?"auto":"100vh",color:"#fff",overflow:"hidden"}}>

        {/* Decorative pinwheel watermark */}
        {!mob && (
          <img src={KBIZ_LOGO} alt="" aria-hidden="true"
            style={{position:"absolute",right:-120,bottom:-120,width:520,height:520,
              opacity:0.06,pointerEvents:"none",borderRadius:60}}/>
        )}
        {/* Decorative gold corner accent */}
        <div style={{position:"absolute",top:0,left:0,width:6,height:"100%",
          background:"linear-gradient(180deg,#d4a437 0%,#9a6810 100%)"}}/>

        {/* Top: Travkings Branding */}
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,
            padding:"6px 12px",background:"rgba(212,164,55,0.15)",borderRadius:5,
            border:"1px solid rgba(212,164,55,0.4)",marginBottom:18}}>
            <Plane size={12} style={{color:"#d4a437"}}/>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",color:"#d4a437"}}>
              IATA ACCREDITED · EST. 2008
            </span>
          </div>
          <h1 style={{margin:0,fontSize:mob?34:48,fontWeight:800,color:"#fff",
            letterSpacing:"-0.025em",lineHeight:1}}>
            <span style={{color:"#d4a437"}}>TRAV</span>KINGS
          </h1>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#A32D2D",fontWeight:700,
            letterSpacing:"3px",textTransform:"uppercase"}}>
            Tours &amp; Travels Pvt. Ltd.
          </p>
          <div style={{height:2,width:60,background:"#d4a437",margin:"18px 0"}}/>
          <p style={{margin:0,fontSize:mob?14:17,color:"#c8cfe0",lineHeight:1.5,
            maxWidth:480,fontWeight:400}}>
            Crafting extraordinary journeys across <b style={{color:"#fff"}}>India, Kenya, Tanzania &amp; DR Congo</b> for over 18 years.
          </p>
        </div>

        {/* Middle: 6 Branches grid */}
        <div style={{position:"relative",zIndex:1,margin:mob?"24px 0":"32px 0"}}>
          <p style={{margin:"0 0 10px",fontSize:9,fontWeight:700,color:"#8b94b3",
            letterSpacing:"1.5px",textTransform:"uppercase"}}>Our Branches</p>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"1fr 1fr 1fr",gap:8}}>
            {[
              {flag:"🇮🇳",code:"TKHO",city:"Mumbai (HO)",bg:"rgba(255,255,255,0.05)"},
              {flag:"🇮🇳",code:"BOM",city:"Mumbai",bg:"rgba(255,255,255,0.05)"},
              {flag:"🇮🇳",code:"AMD",city:"Ahmedabad",bg:"rgba(255,255,255,0.05)"},
              {flag:"🇰🇪",code:"NBO",city:"Nairobi",bg:"rgba(255,255,255,0.05)"},
              {flag:"🇹🇿",code:"DAR",city:"Dar es Salaam",bg:"rgba(255,255,255,0.05)"},
              {flag:"🇨🇩",code:"FBM",city:"Lubumbashi",bg:"rgba(255,255,255,0.05)"},
            ].map(b=>(
              <div key={b.code} style={{display:"flex",alignItems:"center",gap:8,
                padding:"8px 10px",background:b.bg,borderRadius:6,
                border:"1px solid rgba(255,255,255,0.08)"}}>
                <span style={{fontSize:18,lineHeight:1}}>{b.flag}</span>
                <div style={{minWidth:0}}>
                  <p style={{margin:0,fontSize:11,fontWeight:700,color:"#fff"}}>{b.code}</p>
                  <p style={{margin:0,fontSize:9.5,color:"#8b94b3",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Powered by KBiz360 */}
        <div style={{position:"relative",zIndex:1,
          padding:"14px 16px",background:"rgba(0,0,0,0.3)",borderRadius:8,
          border:"1px solid rgba(212,164,55,0.2)",
          display:"flex",alignItems:"center",gap:12}}>
          <img src={KBIZ_LOGO} alt="KBiz360" style={{width:42,height:42,borderRadius:8,
            flexShrink:0}}/>
          <div style={{minWidth:0,flex:1}}>
            <p style={{margin:0,fontSize:8.5,color:"#8b94b3",fontWeight:700,
              letterSpacing:"1.2px",textTransform:"uppercase"}}>Powered by</p>
            <p style={{margin:"1px 0 0",fontSize:15,fontWeight:800,color:"#fff",letterSpacing:"-0.02em"}}>
              <span style={{color:"#d4a437"}}>KBiz</span>360 <span style={{fontSize:10,color:"#8b94b3",fontWeight:600,marginLeft:4}}>Smart Travel ERP</span>
            </p>
            <p style={{margin:"2px 0 0",fontSize:8,color:"#d4a437",fontWeight:700,letterSpacing:"1.5px"}}>
              THE BUSINESS ENGINE
            </p>
          </div>
        </div>
      </div>

      {/* ═══════ RIGHT PANEL — LOGIN FORM ═══════ */}
      <div style={{flex:mob?"none":"1",background:"#f7f8fb",
        display:"flex",alignItems:"center",justifyContent:"center",
        padding:mob?"30px 20px 40px":"40px 30px",minHeight:mob?"auto":"100vh"}}>
        <div style={{width:"100%",maxWidth:400}}>
          {/* Form heading */}
          <div style={{marginBottom:22}}>
            <p style={{margin:0,fontSize:11,color:"#5a6691",fontWeight:700,
              letterSpacing:"1.5px",textTransform:"uppercase"}}>Welcome back</p>
            <h2 style={{margin:"4px 0 0",fontSize:24,fontWeight:800,color:"#0d1326",
              letterSpacing:"-0.02em"}}>Sign in to continue</h2>
            <p style={{margin:"6px 0 0",fontSize:12.5,color:"#5a6691",lineHeight:1.5}}>
              Access your dashboard, vouchers, and reports for all Travkings entities.
            </p>
          </div>

          {/* Email field */}
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:"#0d1326",
              marginBottom:5,letterSpacing:"0.3px"}}>Email Address</label>
            <div style={{position:"relative"}}>
              <Users size={14} style={{position:"absolute",left:12,top:14,color:"#8b94b3"}}/>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="you@travkings.com"
                onKeyDown={e=>{if(e.key==="Enter")handleFormSubmit();}}
                style={{width:"100%",padding:"12px 14px 12px 36px",
                  border:"1px solid #d8dbe6",borderRadius:7,fontSize:13,
                  background:"#fff",color:"#0d1326",outline:"none",
                  boxSizing:"border-box",WebkitAppearance:"none",
                  transition:"border-color 0.2s"}}
                onFocus={e=>e.target.style.borderColor="#d4a437"}
                onBlur={e=>e.target.style.borderColor="#d8dbe6"}/>
            </div>
          </div>

          {/* Password field */}
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:"#0d1326",
              marginBottom:5,letterSpacing:"0.3px"}}>Password</label>
            <div style={{position:"relative"}}>
              <Lock size={14} style={{position:"absolute",left:12,top:14,color:"#8b94b3"}}/>
              <input type={showPwd?"text":"password"} value={password}
                onChange={e=>setPassword(e.target.value)}
                placeholder="Enter your password"
                onKeyDown={e=>{if(e.key==="Enter")handleFormSubmit();}}
                style={{width:"100%",padding:"12px 40px 12px 36px",
                  border:"1px solid #d8dbe6",borderRadius:7,fontSize:13,
                  background:"#fff",color:"#0d1326",outline:"none",
                  boxSizing:"border-box",WebkitAppearance:"none",
                  transition:"border-color 0.2s"}}
                onFocus={e=>e.target.style.borderColor="#d4a437"}
                onBlur={e=>e.target.style.borderColor="#d8dbe6"}/>
              <button onClick={()=>setShowPwd(s=>!s)}
                style={{position:"absolute",right:8,top:8,
                  background:"transparent",border:"none",padding:6,
                  cursor:"pointer",color:"#5a6691",fontSize:11,fontWeight:600}}>
                {showPwd?"Hide":"Show"}
              </button>
            </div>
          </div>

          {/* Remember + Forgot */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            marginBottom:18,flexWrap:"wrap",gap:8}}>
            <label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",
              userSelect:"none"}}>
              <input type="checkbox" checked={remember}
                onChange={()=>setRemember(r=>!r)}
                style={{width:15,height:15,cursor:"pointer",accentColor:"#d4a437"}}/>
              <span style={{fontSize:12,color:"#0d1326",fontWeight:500}}>Remember me for 30 days</span>
            </label>
            <a href="#" onClick={e=>{e.preventDefault();alert("A reset link would be emailed to your registered address.");}}
              style={{fontSize:12,color:"#d4a437",fontWeight:700,
                textDecoration:"none"}}>Forgot password?</a>
          </div>

          {/* Sign In button */}
          <button onClick={handleFormSubmit} disabled={signing!==null}
            style={{width:"100%",padding:"14px 16px",background:signing?"#5a6691":"#0d1326",
              color:"#d4a437",border:"none",borderRadius:8,fontSize:14,fontWeight:800,
              cursor:signing?"wait":"pointer",letterSpacing:"0.5px",
              WebkitTapHighlightColor:"transparent",touchAction:"manipulation",
              transition:"background 0.2s",marginBottom:16}}>
            {signing?"Signing in...":"Sign In"} →
          </button>

          {/* Divider */}
          <div style={{display:"flex",alignItems:"center",gap:10,margin:"18px 0"}}>
            <div style={{flex:1,height:1,background:"#d8dbe6"}}/>
            <span style={{fontSize:10,color:"#8b94b3",fontWeight:700,letterSpacing:"1px"}}>
              OR CONTINUE AS
            </span>
            <div style={{flex:1,height:1,background:"#d8dbe6"}}/>
          </div>

          {/* Quick demo user buttons */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            {quickUsers.map(u=>(
              <button key={u.id} onClick={()=>handleSignIn(u)} disabled={signing!==null}
                style={{display:"flex",alignItems:"center",gap:9,padding:"9px 11px",
                  background:"#fff",border:"1px solid #d8dbe6",borderRadius:7,
                  cursor:signing?"wait":"pointer",textAlign:"left",
                  WebkitTapHighlightColor:"transparent",touchAction:"manipulation",
                  transition:"all 0.15s",opacity:signing && signing!==u.id?0.5:1}}
                onMouseOver={e=>{if(!signing){e.currentTarget.style.borderColor="#d4a437";e.currentTarget.style.background="#fff8e8";}}}
                onMouseOut={e=>{if(!signing){e.currentTarget.style.borderColor="#d8dbe6";e.currentTarget.style.background="#fff";}}}>
                <div style={{width:30,height:30,borderRadius:"50%",
                  background:roleColor[u.role]||"#5a6691",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:10.5,fontWeight:800,color:"#fff",flexShrink:0}}>
                  {getInitials(u.name)}
                </div>
                <div style={{minWidth:0,flex:1}}>
                  <p style={{margin:0,fontSize:11.5,fontWeight:700,color:"#0d1326",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {u.name.split(" ")[0]}
                  </p>
                  <p style={{margin:0,fontSize:9,color:"#5a6691",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {u.role.replace("Senior","Sr.").replace("Accounts ","").replace("Manager","Mgr")}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* See all users link */}
          <button onClick={()=>setShowAllUsers(s=>!s)}
            style={{width:"100%",padding:"8px",background:"transparent",
              border:"none",color:"#5a6691",fontSize:11,fontWeight:600,
              cursor:"pointer",textAlign:"center"}}>
            {showAllUsers?"Hide":"Show"} all {_USERS_DATA.length} accounts {showAllUsers?"▲":"▼"}
          </button>

          {showAllUsers && (
            <div style={{background:"#fff",border:"1px solid #d8dbe6",borderRadius:7,
              padding:6,marginTop:6,maxHeight:200,overflowY:"auto"}}>
              {_USERS_DATA.map(u=>(
                <button key={u.id} onClick={()=>handleSignIn(u)} disabled={signing!==null}
                  style={{display:"flex",alignItems:"center",gap:9,padding:"7px 9px",
                    background:"transparent",border:"none",borderRadius:5,width:"100%",
                    cursor:signing?"wait":"pointer",textAlign:"left",
                    WebkitTapHighlightColor:"transparent",touchAction:"manipulation",
                    opacity:signing && signing!==u.id?0.5:1}}
                  onMouseOver={e=>{if(!signing)e.currentTarget.style.background="#f7f8fb";}}
                  onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{width:24,height:24,borderRadius:"50%",
                    background:roleColor[u.role]||"#5a6691",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:9,fontWeight:800,color:"#fff",flexShrink:0}}>
                    {getInitials(u.name)}
                  </div>
                  <div style={{minWidth:0,flex:1}}>
                    <p style={{margin:0,fontSize:11,fontWeight:600,color:"#0d1326"}}>
                      {u.name} <span style={{fontSize:9,color:"#5a6691",fontWeight:500,marginLeft:4}}>
                        {u.role} · {Array.isArray(u.branches)?u.branches.join(","):u.branches}
                      </span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{marginTop:24,paddingTop:18,borderTop:"1px solid #e1e3ec",textAlign:"center"}}>
            <p style={{margin:0,fontSize:10,color:"#8b94b3",lineHeight:1.6}}>
              © 2026 Travkings Tours &amp; Travels Pvt. Ltd. · All rights reserved.<br/>
              Need access? Contact <b style={{color:"#5a6691"}}>ad@travkings.com</b>
            </p>
            <p style={{margin:"8px 0 0",fontSize:9,color:"#8b94b3"}}>
              v1.0 · Secure SSL Connection · 2FA Available
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SIGNED-OUT SCREEN  (shown when currentUser === null)
   ════════════════════════════════════════════════════════════════════ */
