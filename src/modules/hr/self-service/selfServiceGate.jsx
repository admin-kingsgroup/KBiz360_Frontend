/* ── Self-service identity gate ────────────────────────────────────
   Every self-service page (/hr/portal, /hr/leave-apply, /hr/my-payslip,
   /hr/form-16) resolves the LOGGED-IN user's employee record via useMyEmployee
   (localStorage 'kb360-user' email ⇄ employee master email, case-insensitive).
   No match → this empty state — NEVER demo data. `children` is a render-prop
   that receives the resolved employee. */

import { PHASE2_Page } from '../../../shell/PHASE2_Page';

export const SS_MONTH_LABEL=m=>m?new Date(m+"-01T00:00:00").toLocaleString("en",{month:"short",year:"numeric"}):"—";
export const SS_DEFAULT_ENT={annual:18,sick:12,casual:6};

export function SelfServiceGate({title,subtitle,my,children}){
  if(my.isLoading) return (
    <PHASE2_Page title={title} subtitle={subtitle}>
      <div style={{padding:"48px 16px",textAlign:"center",color:"#8b94b3",fontSize:13}}>Loading your employee profile…</div>
    </PHASE2_Page>
  );
  if(!my.employee) return (
    <PHASE2_Page title={title} subtitle={subtitle}>
      <div style={{maxWidth:540,margin:"40px auto",padding:"28px 26px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:10,textAlign:"center"}}>
        <p style={{margin:0,fontSize:34}}>🪪</p>
        {my.isError?(<>
          <p style={{margin:"12px 0 6px",fontSize:14,fontWeight:700,color:"#0d1326"}}>Couldn't load the employee list</p>
          <p style={{margin:0,fontSize:12,color:"#5a6691",lineHeight:1.6}}>Please try again in a moment.</p>
        </>):(<>
          <p style={{margin:"12px 0 6px",fontSize:14,fontWeight:700,color:"#0d1326"}}>Your login isn't linked to an employee profile</p>
          <p style={{margin:0,fontSize:12,color:"#5a6691",lineHeight:1.6}}>
            Ask HR to add your email{my.email?<> (<b>{my.email}</b>)</>:""} to your employee record in the Employee Master.
          </p>
        </>)}
      </div>
    </PHASE2_Page>
  );
  return children(my.employee);
}
