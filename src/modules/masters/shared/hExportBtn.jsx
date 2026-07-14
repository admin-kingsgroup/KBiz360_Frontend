import { exportToExcel } from '../../../core/exportExcel';

export const HExportBtn=({name,columns,rows,label="📤 Export"})=>{
  const empty=!rows||rows.length===0;
  return <button onClick={()=>exportToExcel(name,columns,rows||[])} disabled={empty} title="Export to Excel"
    style={{padding:"8px 14px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,fontSize:11,cursor:empty?"not-allowed":"pointer",opacity:empty?0.5:1}}>{label}</button>;
};
