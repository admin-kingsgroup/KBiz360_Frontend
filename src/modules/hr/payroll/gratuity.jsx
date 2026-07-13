/* ── Gratuity Register wrapper (/hr/gratuity) ───────────────────────
   The provision figure is a CLIENT-SIDE actuarial estimate (Basic+DA × 15/26 ×
   service years) — it is never journalled, so this wrapper says so before the
   register renders. */

import { AlertTriangle } from 'lucide-react';
import { GratuityRegister } from '../../../core/helpers';

export function GratuityEstimateView({branch}){
  return(
    <div>
      <div style={{maxWidth:1100,margin:"12px auto 0",padding:"10px 14px",borderRadius:9,background:"#FAEEDA",border:"1px solid #FAC775",fontSize:11,color:"#854F0B",fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
        <AlertTriangle size={14} style={{flexShrink:0}}/> View-only actuarial estimate — computed on screen from current Basic+DA and service length. It is NOT posted to the books: no gratuity provision ledger entry exists.
      </div>
      <GratuityRegister branch={branch}/>
    </div>
  );
}
