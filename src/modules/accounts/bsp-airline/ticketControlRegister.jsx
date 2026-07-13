/* ════════════════════════════════════════════════════════════════
   AIR TICKET CONTROL REGISTER  /purchase/ticket-control
   Track every ticket: Issued · Used · Voided · Refunded · Exchanged · Reissued
   ════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { _TICKET_CTRL } from '../../../core/helpers';
import { useMobile } from '../../../core/hooks';
import { clickable } from '../../../core/ux/clickable';
import { Menu as StatusMenu } from '../../../core/ux/Menu';
import { card, inp } from '../../../core/styles';

export function TicketControlRegister({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:branch?.code;
  const [tickets,setTickets]=useState(_TICKET_CTRL);
  const [filter,setFilter]=useState("All");
  const [search,setSearch]=useState("");

  const STATUSES=["All","Open","Used","Voided","Refunded","Exchanged","Reissued"];
  const STATUS_CLR={Open:"#2563eb",Used:"#16a34a",Voided:"#dc2626",Refunded:"#d97706",Exchanged:"#3fb7a3",Reissued:"#2e323c"};
  const STATUS_BG={Open:"#e8f0ff",Used:"#e8f6ed",Voided:"#fbe9e9",Refunded:"#fbeedb",Exchanged:"#e8f6ed",Reissued:"#f4f5f7"};

  const filtered=tickets.filter(t=>(
    (!brCode||t.branch===brCode)&&
    (filter==="All"||t.status===filter)&&
    (!search||t.ticket.includes(search)||t.pax.toLowerCase().includes(search.toLowerCase())||t.pnr.includes(search.toUpperCase()))
  ));
  const totByStatus={};
  STATUSES.slice(1).forEach(s=>totByStatus[s]=tickets.filter(t=>(!brCode||t.branch===brCode)&&t.status===s).length);

  return (
    <div style={{padding:"12px 10px",maxWidth:1600,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#e8f0ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🎫</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a1c22"}}>Air Ticket Control Register</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5b616e"}}>Track every ticket: Issued · Used · Voided · Refunded · Exchanged · Reissued</p>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,background:"#f4f5f7",border:"1px solid #e3e6eb",borderRadius:10,padding:4,boxShadow:"0 1px 2px rgba(16,18,22,0.04)"}}>
          <div style={{position:"relative"}}>
            <Search size={12} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#9aa1ab"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ticket / PNR / passenger..."
              style={{...inp,width:200,minHeight:32,fontSize:11,paddingLeft:26,paddingRight:search?22:10,border:"none",background:"#fff",borderRadius:7}}/>
            {search&&(
              <button onClick={()=>setSearch("")} aria-label="Clear search"
                style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",border:"none",background:"none",cursor:"pointer",color:"#9aa1ab",fontSize:14,lineHeight:1,padding:2}}>×</button>
            )}
          </div>
          <StatusMenu
            ariaLabel="Filter by status"
            menuRole="listbox"
            width={150}
            items={STATUSES.map(s=>({key:s,label:s,selected:s===filter,onSelect:()=>setFilter(s)}))}
            renderTrigger={({ref,toggle,triggerProps})=>(
              <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                style={{...inp,display:"flex",alignItems:"center",gap:6,width:"auto",minHeight:32,fontSize:11,paddingRight:10,paddingLeft:10,border:"none",background:"#fff",borderRadius:7,fontWeight:600,color:"#2e323c",cursor:"pointer"}}>
                {filter}
                <ChevronDown size={12} style={{color:"#5b616e"}}/>
              </button>
            )}
          />
        </div>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        {STATUSES.slice(1).map(s=>(
          <div key={s} {...clickable(()=>setFilter(f=>f===s?"All":s))}
            className={`rounded-brand border border-t-[3px] px-3 py-4 cursor-pointer transition ${filter===s?"border-navy bg-surface-alt":"border-surface-border bg-surface"}`}
            style={{flex:"1 1 140px",minWidth:120,textAlign:"start",borderTopColor:STATUS_CLR[s]}}>
            <p className="text-[8.5px] font-bold uppercase tracking-wide whitespace-nowrap" style={{color:STATUS_CLR[s]}}>{s}</p>
            <p className="mt-1 text-base font-extrabold tabular-nums text-navy tablet:text-lg">{totByStatus[s]||0}</p>
          </div>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:1000}}>
            <thead><tr style={{background:"#1a1c22"}}>
              {["Ticket Number","Airline","PAX Name","Sector","Class","PNR","Issue Date","Travel Date","Fare","BSP Status","Ticket Status","Actions"].map((h,i)=>(
                <th key={i} style={{padding:"9px 10px",textAlign:i===8?"right":"left",color:"#c2a04a",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filtered.map((t,i)=>(
              <tr key={t.id} style={{borderBottom:"1px solid #dfe2e7",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:10,color:"#2563eb",fontWeight:700}}>{t.ticket}</td>
                <td style={{padding:"8px 10px",fontWeight:600,color:"#1a1c22"}}>{t.airline}</td>
                <td style={{padding:"8px 10px",color:"#2e323c"}}>{t.pax}</td>
                <td style={{padding:"8px 10px",fontWeight:600,color:"#d97706"}}>{t.sector}</td>
                <td style={{padding:"8px 10px",textAlign:"center",fontFamily:"monospace",fontSize:10.5,fontWeight:700}}>{t.class}</td>
                <td style={{padding:"8px 10px",fontFamily:"monospace",fontSize:10.5,color:"#2563eb",fontWeight:700}}>{t.pnr}</td>
                <td style={{padding:"8px 10px",color:"#5b616e",whiteSpace:"nowrap"}}>{t.issueDate}</td>
                <td style={{padding:"8px 10px",color:"#5b616e",whiteSpace:"nowrap"}}>{t.travelDate}</td>
                <td style={{padding:"8px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:600}}>
                  {"₹"}{Number(t.fare).toLocaleString()}
                </td>
                <td style={{padding:"8px 10px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:STATUS_BG[t.bspStatus]||"#f4f5f7",color:STATUS_CLR[t.bspStatus]||"#5b616e"}}>{t.bspStatus}</span></td>
                <td style={{padding:"8px 10px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:STATUS_BG[t.status]||"#f4f5f7",color:STATUS_CLR[t.status]||"#5b616e"}}>{t.status}</span></td>
                <td style={{padding:"8px 10px"}}>
                  {t.status==="Open"&&(
                    <select onChange={e=>{if(e.target.value)setTickets(ts=>ts.map(x=>x.id===t.id?{...x,status:e.target.value,bspStatus:e.target.value}:x));}}
                      style={{fontSize:9.5,border:"1px solid #cdd1d8",borderRadius:5,padding:"2px 5px",background:"#f9fafb"}}>
                      <option value="">Update...</option>
                      <option>Used</option><option>Voided</option><option>Refunded</option><option>Exchanged</option><option>Reissued</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
