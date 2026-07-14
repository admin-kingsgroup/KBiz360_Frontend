import { useMobile } from '../../../core/hooks';
import { useMasterList } from '../../../core/useMasters';
import { fromEmpDTO } from '../employeeMap';
import { card } from '../../../core/styleTokens';

export function GratuityRegister({branch}){
  const mob=useMobile();
  const brScope=branch==="ALL"?"":(branch?.code||"");
  /* Live, branch-scoped employees; gratuity provision is computed from Basic+DA
     and length of service per the Payment of Gratuity Act. */
  const emps=((useMasterList('employees', brScope?{branch:brScope}:{}).data)||[]).map(fromEmpDTO);
  const DOJ_TO_YEARS=doj=>{const d=new Date(doj);const n=new Date();return+((n-d)/(365.25*86400000)).toFixed(2);};
  const GRATUITY=e=>{
    const yrs=DOJ_TO_YEARS(e.joined||"2021-04-01");
    if(yrs<5)return{eligible:false,yrs:yrs,amount:0,note:"<5 years service"};
    const basic=e.basic+(e.da||0);
    const amt=Math.round(basic*yrs*15/26);
    return{eligible:true,yrs,amount:amt,note:`${yrs.toFixed(1)} yrs × 15/26`};
  };
  const data=emps.map(e=>({...e,...GRATUITY(e)}));
  const eligible=data.filter(e=>e.eligible);
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const totProvision=data.reduce((s,e)=>{const g=GRATUITY(e);const basic=(e.basic||0)+(e.da||0);return s+Math.round(basic*g.yrs*15/26);},0);

  return(
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🎁</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Gratuity Register</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>As per Payment of Gratuity Act 1972 · 15/26 × Basic+DA × Years · {eligible.length} eligible employees</p>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Total Employees",v:String(data.length),c:"#384677",bg:"#f3f4f8"},
          {l:"Eligible (≥5 yrs)",v:String(eligible.length),c:"#27500A",bg:"#EAF3DE"},
          {l:"Not Yet Eligible",v:String(data.length-eligible.length),c:"#854F0B",bg:"#FAEEDA"},
          {l:"Total Gratuity Provision",v:f(totProvision),c:"#185FA5",bg:"#E6F1FB"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"10px 12px",background:k.bg}}>
            <p style={{margin:0,fontSize:8.5,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"3px 0 0",fontSize:mob?15:18,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      <div style={{padding:"9px 14px",borderRadius:9,background:"#E6F1FB",border:"1px solid #B5D4F4",marginBottom:12,fontSize:10.5,color:"#185FA5"}}>
        Formula: <b>Gratuity = (Last drawn Basic+DA) × Years × 15 ÷ 26</b> · Maximum: ₹20,00,000 (₹20L) · Payable on resignation, retirement, or death/disability after 5 years of continuous service.
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Employee","Branch","DOJ","Service","Basic+DA","Gratuity Provision","Eligible","Note"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=4&&i<=5?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{data.map((e,i)=>{
            const g=GRATUITY(e);
            return(
              <tr key={e.id} style={{borderBottom:"1px solid #dfe2e7",background:g.eligible?"#f0fff4":i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{e.name}</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 6px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{e.branch}</span></td>
                <td style={{padding:"8px 12px",color:"#5a6691",whiteSpace:"nowrap"}}>{e.joined||"2021-04-01"}</td>
                <td style={{padding:"8px 12px",fontWeight:600,color:g.yrs>=5?"#27500A":"#854F0B"}}>{g.yrs.toFixed(1)} yrs</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f((e.basic||0)+(e.da||0))}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:g.eligible?"#27500A":"#5a6691"}}>{g.eligible?f(g.amount):"—"}</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:g.eligible?"#EAF3DE":"#f3f4f8",color:g.eligible?"#27500A":"#5a6691"}}>{g.eligible?"Yes":"No"}</span></td>
                <td style={{padding:"8px 12px",fontSize:10,color:"#5a6691"}}>{g.note}</td>
              </tr>
            );
          })}</tbody>
          <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={5} style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL GRATUITY PROVISION (ALL EMPLOYEES)</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totProvision)}</td>
            <td colSpan={2}/>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}
