import { useDocumentTypes } from '../../../core/useReference';
import { MASTER_PAGE } from '../../../core/helpers';
import { HExportBtn } from '../shared/hExportBtn';

export function DocumentTypeMaster(){
  // Live print-template master (GET /api/document-types). Was hardcoded DOCUMENT_TYPES_DATA.
  const rows = useDocumentTypes().data || [];
  return MASTER_PAGE("Document Type Master","Configurable templates for invoices, receipts, certificates — header, footer, logo, numbering",
    <>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <p style={{margin:0,fontSize:12,color:"#5a6691"}}>{rows.length} document templates configured · {rows.filter(d=>d.active).length} active</p>
        <div style={{flex:1}}/>
        <button style={{padding:"8px 14px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,fontSize:12,cursor:"pointer"}}>📥 Import</button>
        <HExportBtn name="document-types" rows={rows} columns={[{key:"type",label:"Document Type"},{key:"layout",label:"Layout"},{key:"header",label:"Header"},{key:"footer",label:"Footer"},{key:"numberingSeries",label:"Numbering Series"},{key:"active",label:"Active"}]}/>
        <button style={{padding:"8px 16px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>+ Add Document Type</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))",gap:12}}>
        {rows.map(d=>(
          <div key={d.id} style={{background:"#fff",border:"1px solid #cdd1d8",borderRadius:8,padding:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <p style={{margin:0,fontSize:13.5,fontWeight:700,color:"#0d1326"}}>{d.type}</p>
              <span style={{padding:"2px 7px",background:d.active?"#d4edda":"#f8d7da",color:d.active?"#155724":"#721c24",borderRadius:3,fontSize:10.5,fontWeight:600}}>{d.active?"Active":"Inactive"}</span>
            </div>
            <div style={{fontSize:11.5,lineHeight:1.6,color:"#5a6691",marginBottom:10}}>
              <p style={{margin:0}}><span style={{fontWeight:700,color:"#0d1326"}}>Layout:</span> {d.layout}</p>
              <p style={{margin:0}}><span style={{fontWeight:700,color:"#0d1326"}}>Header:</span> {d.header}</p>
              <p style={{margin:0}}><span style={{fontWeight:700,color:"#0d1326"}}>Footer:</span> {d.footer}</p>
              <p style={{margin:0,fontFamily:"monospace"}}><span style={{fontWeight:700,color:"#0d1326",fontFamily:"sans-serif"}}>Numbering:</span> {d.numberingSeries}</p>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button style={{padding:"5px 10px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:4,fontSize:11,cursor:"pointer",fontWeight:600,flex:1}}>Edit Layout</button>
              <button style={{padding:"5px 10px",background:"transparent",border:"1px solid #cdd1d8",color:"#5a6691",borderRadius:4,fontSize:11,cursor:"pointer",fontWeight:600}}>Preview</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
