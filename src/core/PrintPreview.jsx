// ─── In-app A4 Print Preview ──────────────────────────────────────────────────
// A single, reusable WYSIWYG print/PDF preview used everywhere. Any screen opens
// it by dispatching a `kb:print` CustomEvent:
//
//   window.dispatchEvent(new CustomEvent('kb:print', { detail: {
//     selector: 'main',                 // OR html: '<...>'  OR node: HTMLElement
//     title: 'Profit & Loss',
//     recommend: 'landscape',           // suggested orientation ('portrait' default)
//   }}));
//
// The preview renders the captured content inside an A4 (or Letter) page frame at
// the chosen Orientation / Margins / Shrink-to-fit, shows it on screen, and prints
// the SAME iframe — so the printout (and "Save as PDF") matches the preview exactly.
// The app uses mostly inline styles, so cloning outerHTML + copying <style>/<link>
// from <head> reproduces the document faithfully.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const PAPER = { A4: { w: 210, h: 297 }, Letter: { w: 216, h: 279 } }; // mm (portrait)
const MARGIN_MM = { Normal: 10, Narrow: 6, None: 0 };
const MM_PX = 96 / 25.4; // CSS px per mm at 96dpi

const grab = (detail = {}) => {
  if (detail.html) return detail.html;
  const el = detail.node || document.querySelector(detail.selector || 'main');
  if (!el) return '<div style="padding:24px;font-family:sans-serif">Nothing to print.</div>';
  // Drop elements explicitly marked no-print from the captured clone.
  const clone = el.cloneNode(true);
  clone.querySelectorAll('.noprint, .no-print, .np, .cl-noprint').forEach((n) => n.remove());
  return clone.outerHTML;
};
const headStyles = () => Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map((n) => n.outerHTML).join('\n');

export function PrintPreviewHost() {
  const [job, setJob] = useState(null);          // { html, title, recommend }
  // App-wide print defaults: Portrait · A4 · Narrow margins · Shrink-to-fit ON.
  const [orient, setOrient] = useState('portrait');
  const [paper, setPaper] = useState('A4');
  const [margin, setMargin] = useState('Narrow');
  const [fit, setFit] = useState(true);
  const frameRef = useRef(null);

  useEffect(() => {
    const onPrint = (e) => {
      const d = e.detail || {};
      setJob({ html: grab(d), title: d.title || 'Document', recommend: d.recommend === 'landscape' ? 'landscape' : 'portrait' });
    };
    window.addEventListener('kb:print', onPrint);
    return () => window.removeEventListener('kb:print', onPrint);
  }, []);

  // Open every print job with the standard defaults: Portrait · A4 · Narrow margins
  // · Shrink-to-fit ON. (The screen's `recommend` is still shown as a hint so the
  // user can one-click switch to Landscape for wide reports.)
  useEffect(() => { if (job) { setOrient('portrait'); setPaper('A4'); setMargin('Narrow'); setFit(true); } }, [job]);

  const page = useMemo(() => {
    const p = PAPER[paper]; const land = orient === 'landscape';
    const wMm = land ? p.h : p.w, hMm = land ? p.w : p.h, m = MARGIN_MM[margin];
    return { wMm, hMm, m, printW: wMm - 2 * m, printH: hMm - 2 * m };
  }, [paper, orient, margin]);

  // (Re)render the iframe whenever the job or any option changes.
  const render = useCallback(() => {
    const frame = frameRef.current; if (!frame || !job) return;
    const doc = frame.contentDocument;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8">${headStyles()}
      <style>
        @page { size: ${paper} ${orient}; margin: ${page.m}mm; }
        html,body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        #pp-wrap{ box-sizing:border-box; }
        @media screen { body{background:#9aa0ad;padding:14px} #pp-wrap{background:#fff;margin:0 auto;box-shadow:0 0 14px rgba(0,0,0,.3)} }
      </style></head>
      <body><div id="pp-wrap"><div id="pp-content">${job.html}</div></div></body></html>`);
    doc.close();

    // Lay out the on-screen A4 page, then shrink-to-fit the content to the printable width.
    const apply = () => {
      const wrap = doc.getElementById('pp-wrap');
      const content = doc.getElementById('pp-content');
      if (!wrap || !content) return;
      const printWpx = page.printW * MM_PX;
      wrap.style.width = page.wMm + 'mm';
      wrap.style.minHeight = page.hMm + 'mm';
      wrap.style.padding = page.m + 'mm';
      content.style.transformOrigin = 'top left';
      content.style.width = printWpx + 'px';
      content.style.transform = 'none';
      const natural = content.scrollWidth;
      const scale = fit && natural > printWpx ? printWpx / natural : 1;
      content.style.transform = `scale(${scale})`;
      // keep the (scaled) block from leaving whitespace to its right
      content.style.width = (printWpx / scale) + 'px';
      // a matching @media print scale so the printout equals the preview
      let ps = doc.getElementById('pp-print-scale');
      if (!ps) { ps = doc.createElement('style'); ps.id = 'pp-print-scale'; doc.head.appendChild(ps); }
      ps.textContent = `@media print{ body{background:#fff;padding:0} #pp-wrap{box-shadow:none;margin:0;padding:0;width:auto;min-height:0} #pp-content{ transform:scale(${scale}); width:${printWpx / scale}px } }`;
    };
    // give the browser a tick to lay out before measuring
    if (doc.readyState === 'complete') setTimeout(apply, 30); else frame.onload = () => setTimeout(apply, 30);
  }, [job, paper, orient, margin, fit, page]);

  useEffect(() => { render(); }, [render]);

  if (!job) return null;
  const close = () => setJob(null);
  const doPrint = () => { const f = frameRef.current; if (f && f.contentWindow) { f.contentWindow.focus(); f.contentWindow.print(); } };

  const seg = (active) => ({ padding: '5px 11px', fontSize: 11.5, fontWeight: 600, border: '1px solid #cdd1d8', background: active ? '#185FA5' : '#fff', color: active ? '#fff' : '#5a6691', cursor: 'pointer' });
  const wideRecommended = job.recommend === 'landscape';

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.55)', zIndex: 9000, display: 'flex', flexDirection: 'column' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderBottom: '1px solid #cdd1d8', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 14, color: '#0d1326' }}>🖨 Print Preview — {job.title}</strong>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#5a6691' }}>Orientation
          <span style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden' }}>
            <button onClick={() => setOrient('portrait')} style={{ ...seg(orient === 'portrait'), borderRight: 'none' }}>Portrait</button>
            <button onClick={() => setOrient('landscape')} style={seg(orient === 'landscape')}>Landscape</button>
          </span>
          <span style={{ fontSize: 10.5, color: '#8b94b3' }}>· recommended: <b style={{ color: '#185FA5' }}>{wideRecommended ? 'Landscape' : 'Portrait'}</b></span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#5a6691' }}>Paper
          <select value={paper} onChange={(e) => setPaper(e.target.value)} style={{ padding: '4px 6px', fontSize: 11.5, border: '1px solid #cdd1d8', borderRadius: 5 }}><option>A4</option><option>Letter</option></select>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#5a6691' }}>Margins
          <select value={margin} onChange={(e) => setMargin(e.target.value)} style={{ padding: '4px 6px', fontSize: 11.5, border: '1px solid #cdd1d8', borderRadius: 5 }}><option>Normal</option><option>Narrow</option><option>None</option></select>
        </span>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#5a6691', cursor: 'pointer' }}>
          <input type="checkbox" checked={fit} onChange={(e) => setFit(e.target.checked)} /> Shrink to fit
        </label>
        <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8 }}>
          <button onClick={doPrint} style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>🖨 Print / Save PDF</button>
          <button onClick={close} style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: '#fff', color: '#5a6691', border: '1px solid #cdd1d8', borderRadius: 6, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
      <iframe ref={frameRef} title="print-preview" onClick={(e) => e.stopPropagation()} style={{ flex: 1, width: '100%', border: 'none', background: '#9aa0ad' }} />
    </div>
  );
}

// Convenience helper for buttons.
export const openPrintPreview = (detail) => window.dispatchEvent(new CustomEvent('kb:print', { detail }));
