// ───────────────────────────────────────────────────────────────────────────
// Global Report Action Bar.
//
// Mounted once in the app shell (App.jsx), just above the routed <Page/>. On any
// report / finance / tax / accounting / register route it shows one consistent
// toolbar giving every such screen the same three actions:
//
//     📤 Tally Export ▾   ·   🖨 Print   ·   📄 PDF
//
// • Print / PDF open the in-app A4 Print Preview (PrintPreviewHost) on the live
//   report content — so they work on every screen with zero per-report wiring.
// • Tally Export builds a Tally-importable XML. If the visible screen registered
//   structured rows via `useReportExport`, those are used (high quality);
//   otherwise the bar scrapes the report's largest table (generic fallback).
//
// The bar carries the `noprint` class so it never appears in the printout.
// ───────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { openPrintPreview } from './PrintPreview';
import { ledgersToTallyXml, vouchersToTallyXml, scrapeLedgerRows, downloadXml } from './tallyXml';
import { subscribeReportExport, getReportExport } from './reportExportContext';
import { toast } from './ux/toast';

// Routes that represent a viewable report / register / books screen.
export function isReportRoute(route = '') {
  if (!route) return false;
  if (/^\/(reports|finance|tax|accounting|assets|group)\b/.test(route)) return true;
  if (/^\/ho\/.*register/.test(route)) return true;
  if (/^\/hr\/(gratuity|tds|register)/.test(route)) return true;
  // Sales / Purchase product routes resolve to the read-only Module Register.
  if (/^\/(sales|purchase)\/(flight|holiday|hotel|visa|car|insurance|misc|adm|acm|ticket-control)$/.test(route)) return true;
  return false;
}

// A short, human title from the route tail when the screen didn't supply one.
function titleFromRoute(route = '') {
  const tail = route.split('/').filter(Boolean).pop() || 'report';
  return tail.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const PAD = '8px 12px';

export function ReportActionBar({ route, branch }) {
  const [ctx, setCtx] = useState(getReportExport());
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => subscribeReportExport(setCtx), []);
  // Close the dropdown on any outside click.
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!isReportRoute(route)) return null;

  const title = (ctx && ctx.title) || titleFromRoute(route);
  const company = (ctx && ctx.company) || (branch && branch.entity) || undefined;
  const recommend = (ctx && ctx.recommend) || 'landscape';
  const brTag = (branch && branch.code) || (branch === 'ALL' ? 'ALL' : '');

  const print = () => openPrintPreview({ selector: 'main', title, recommend });

  const exportTally = () => {
    setOpen(false);
    let xml = '';
    let count = 0;
    if (ctx && ctx.kind === 'vouchers' && Array.isArray(ctx.rows) && ctx.rows.length) {
      xml = vouchersToTallyXml({ company, rows: ctx.rows });
      count = ctx.rows.length;
    } else if (ctx && Array.isArray(ctx.rows) && ctx.rows.length) {
      xml = ledgersToTallyXml({ company, rows: ctx.rows });
      count = ctx.rows.length;
    } else {
      // Generic fallback: scrape the report's largest table.
      const rows = scrapeLedgerRows(document.querySelector('main'));
      if (!rows.length) {
        toast('No tabular data found on this screen to export to Tally.', 'info');
        return;
      }
      xml = ledgersToTallyXml({ company, rows });
      count = rows.length;
    }
    const stem = `Tally_${String(title).replace(/[^\w]+/g, '-')}${brTag ? `_${brTag}` : ''}`;
    downloadXml(stem, xml);
    toast(`Tally XML exported — ${count} ${ctx && ctx.kind === 'vouchers' ? 'voucher(s)' : 'ledger(s)'}.`, 'success');
  };

  return (
    <div
      className="noprint"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
        padding: '7px 12px', background: '#fff', borderBottom: '1px solid #cdd1d8',
        position: 'sticky', top: 0, zIndex: 40, flexWrap: 'wrap',
      }}
    >
      <span style={{ marginRight: 'auto', fontSize: 11, fontWeight: 700, color: '#5a6691', letterSpacing: 0.3, textTransform: 'uppercase' }}>
        {title}
      </span>

      <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={() => setOpen((o) => !o)}
          title="Export this report as a Tally-importable XML"
          style={{ padding: PAD, background: '#0d1326', color: '#d4a437', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          📤 Tally Export ▾
        </button>
        {open && (
          <div style={{ position: 'absolute', top: '110%', right: 0, background: '#fff', border: '1px solid #cdd1d8', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', width: 240, zIndex: 100, overflow: 'hidden' }}>
            <p style={{ margin: 0, padding: '8px 12px', fontSize: 10, color: '#5a6691', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #dfe2e7' }}>
              Tally XML · Import into Tally
            </p>
            <button onClick={exportTally} style={ddItem} onMouseEnter={hov} onMouseLeave={unhov}>
              <span style={{ fontSize: 15, width: 20 }}>📒</span>
              <div><div style={{ fontWeight: 700, color: '#0d1326' }}>Download Tally XML</div><div style={{ fontSize: 10, color: '#5a6691' }}>Ledgers / vouchers from this report</div></div>
            </button>
            <div style={{ padding: '7px 12px', fontSize: 10, color: '#8b94b3', borderTop: '1px solid #dfe2e7', lineHeight: 1.5 }}>
              Gateway of Tally → Import → XML → pick the file.
            </div>
          </div>
        )}
      </div>

      {/* One button — the print preview is also where you Save as PDF, so the two
          separate Print / PDF buttons were the same action. */}
      <button onClick={print} title="Open the print preview — print or Save as PDF from there" style={btn}>🖨 Print / Save as PDF</button>
    </div>
  );
}

const btn = { padding: PAD, background: '#fff', color: '#0d1326', border: '1px solid #cdd1d8', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };
const ddItem = { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: 12 };
const hov = (e) => { e.currentTarget.style.background = '#f7f8fb'; };
const unhov = (e) => { e.currentTarget.style.background = ''; };
