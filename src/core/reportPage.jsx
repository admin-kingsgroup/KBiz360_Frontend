import { useRef } from 'react';
import { guardExport } from './exportGuard';
import { openPrintPreview } from './PrintPreview';
import { cardStyle } from './helpers';

export const PAGE_MAX = 1600;

// Generic client-side export for RPT_Page reports: scrapes the rendered detail table
// (the one with the most body rows) from the page container and downloads it as CSV or a
// simple Excel-openable .xls (HTML table). Works for ANY RPT_ report with no per-report
// plumbing — mirrors the DOM-based PDF/print button. (These buttons were previously dead.)
function exportRptTable(pageEl, title, kind) {
  const toast = (msg) => { try { window.dispatchEvent(new CustomEvent('kb:toast', { detail: { id: `exp-${kind}-${Date.now()}`, msg, kind: 'error', ttl: 2600 } })); } catch { /* ignore */ } };
  if (!pageEl) return;
  const tables = [...pageEl.querySelectorAll('table')];
  if (!tables.length) { toast('Nothing to export on this report.'); return; }
  const table = tables.slice().sort((a, b) => b.querySelectorAll('tbody tr').length - a.querySelectorAll('tbody tr').length)[0];
  const cellsOf = (tr) => [...tr.querySelectorAll('th,td')].map((c) => (c.textContent || '').replace(/\s+/g, ' ').trim());
  const matrix = [...table.querySelectorAll('tr')].map(cellsOf).filter((r) => r.length);
  if (!matrix.length) { toast('Nothing to export on this report.'); return; }
  const slug = String(title || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report';
  // Report/Export controls chokepoint — dormant unless the Owner engages the export
  // policy, then a restricted export is blocked (and logged) instead of downloading.
  guardExport({ report: title || slug, scope: 'branch', format: kind === 'xls' ? 'xls' : 'csv', rowCount: Math.max(0, matrix.length - 1) }, () => {
    let blob, ext;
    if (kind === 'xls') {
      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const html = `<table border="1">${matrix.map((r, i) => `<tr>${r.map((c) => `<t${i === 0 ? 'h' : 'd'}>${esc(c)}</t${i === 0 ? 'h' : 'd'}>`).join('')}</tr>`).join('')}</table>`;
      blob = new Blob([`﻿<html><head><meta charset="utf-8"></head><body>${html}</body></html>`], { type: 'application/vnd.ms-excel' }); ext = 'xls';
    } else {
      const q = (s) => (/[",\n\r]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : s);
      blob = new Blob([`﻿${matrix.map((r) => r.map(q).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' }); ext = 'csv';
    }
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `${slug}.${ext}`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  });
}

export function RPT_Page({title,subtitle,toolbar,children}){
  const pageRef=useRef(null);
  return (
    <div ref={pageRef} style={{padding:18,maxWidth:PAGE_MAX,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:14,marginBottom:14,paddingBottom:12,borderBottom:"1px solid #cdd1d8"}}>
        <div>
          <h2 style={{margin:0,fontSize:20,color:"#0d1326",fontWeight:700}}>{title}</h2>
          <p style={{margin:"3px 0 0",fontSize:12,color:"#5a6691"}}>{subtitle}</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {toolbar}
          <button onClick={()=>openPrintPreview({ selector: 'main', title: title||'Report', recommend: 'portrait' })} style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,fontSize:11.5,cursor:"pointer",fontWeight:600,color:"#5a6691"}}>📄 PDF</button>
          <button onClick={()=>exportRptTable(pageRef.current, title, 'xls')} title="Export the table to Excel" style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,fontSize:11.5,cursor:"pointer",fontWeight:600,color:"#5a6691"}}>📊 Excel</button>
          <button onClick={()=>exportRptTable(pageRef.current, title, 'csv')} title="Export the table to CSV" style={{padding:"7px 12px",background:"#fff",border:"1px solid #cdd1d8",borderRadius:6,fontSize:11.5,cursor:"pointer",fontWeight:600,color:"#5a6691"}}>📋 CSV</button>
        </div>
      </div>
      {children}
    </div>
  );
}

/* Standard loading / error / empty cards for the live reports (mirrors
   Supplier 360). Renders `children` only once data is ready & non-empty. */
export function RptState({ q, empty, label = 'data', children }) {
  if (q.isError) return (
    <div style={{ ...cardStyle, background: '#FCEBEB', border: '1px solid #E8B4B4' }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0d1326' }}>Couldn’t load {label}</p>
      <p style={{ margin: '3px 0 0', fontSize: 11, color: '#A32D2D' }}>{q.error?.message || 'Request failed.'} — check you’re signed in and the ERP API is reachable.</p>
    </div>
  );
  if (q.isLoading) return <div style={{ ...cardStyle, textAlign: 'center', color: '#5a6691', fontSize: 12 }}>Loading {label}…</div>;
  if (empty) return (
    <div style={{ ...cardStyle, background: '#FFF8E8', border: '1px solid #F0D98A' }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0d1326' }}>No {label} for the selected period</p>
      <p style={{ margin: '3px 0 0', fontSize: 11, color: '#5a6691' }}>This report aggregates posted sale/purchase bills. Widen the date range (try “All”) or bill some vouchers and they’ll appear here.</p>
    </div>
  );
  return children;
}
