// ───────────────────────────────────────────────────────────────────────────
// BOOKING FOLDER — open the WHOLE SO/PO/GP deal from ANYWHERE, in one view.
//
// A booking is the business truth, but on approval it fragments into separate
// vouchers (1 Sale + N Purchase). Every drill-down used to land on a FRAGMENT —
// a sales/client click showed only the SO voucher, a purchase/supplier click only
// that PO voucher — so the deal had to be re-stitched in your head. This host
// resolves ANY reference (Link No, booking no, or a Sales / Purchase / N-PO leg
// invoice no) to the ONE folder: the readable SO/PO/GP header + GP on top, each
// side's posted Dr/Cr journal below. The journals STAY split (correct accounting);
// only the VIEW is unified.
//
//   import { openBookingFolder } from '../core/BookingFolderHost';
//   openBookingFolder('LK/BOM/00524', { branch });                    // by Link No
//   openBookingFolder('BOM/0626/SF00495', { branch, voucherId, vno }); // by sale/purchase vno
//
// Mounted once (App.jsx). Mirrors openLedgerModal's fire-and-forget event pattern.
// A ref that isn't part of a booking (a manual sale/purchase voucher) falls back to
// opening that single voucher, so a ledger click never dead-ends.
// ───────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState, Suspense } from 'react';
import { apiGet } from './api';
import { JvBlock } from './voucher/JvBlock';
import { pushModal } from './ux/modalStore';
import { bc } from './styleTokens';
import { VSPECS } from './voucherSpecs';
import { printBookingInvoice } from './printInvoice';
import { setNavFocus } from './ux/navFocus';

// VoucherEditor lives in the heavy accountingLive module — load it lazily, and only
// for the rare fallback (a manual sale/purchase voucher that has no booking behind it).
const VoucherEditor = React.lazy(() =>
  import('../modules/accountingLive').then((m) => ({ default: m.VoucherEditor })));

const DARK = '#111111', DIM = '#6A6A6A';

// Fire from anywhere. `ref` = Link No / booking no / sale or purchase (or leg) invoice
// no. opts.branch is the current shell branch (object or code); opts.voucherId + vno let
// a ledger click fall back to the plain voucher when the ref isn't a booking leg.
export function openBookingFolder(ref, { branch, voucherId, vno } = {}) {
  if (!ref) return;
  const code = typeof branch === 'string' ? branch : (branch && branch.code) || '';
  try {
    window.dispatchEvent(new CustomEvent('kb:booking-folder', { detail: { ref: String(ref), branch: code, voucherId: voucherId || '', vno: vno || '' } }));
  } catch { /* ignore */ }
}

const money = (branch, n) => {
  const b = bc(branch); const loc = (b.cur === '₹' || b.cur === '₨' || b.cur === 'Rs') ? 'en-IN' : 'en-US';
  return b.cur + Number(n || 0).toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const STATUS = {
  approved: { bg: '#E7F4EC', bd: '#9AD3B4', fg: '#155F42', lbl: '● Approved · posted' },
  posted:   { bg: '#E7F4EC', bd: '#9AD3B4', fg: '#155F42', lbl: '● Approved · posted' },
  pending:  { bg: '#FBF3DE', bd: '#E8D9A8', fg: '#6B4E0F', lbl: '● Pending' },
  rejected: { bg: '#FBE9E7', bd: '#E6B4AC', fg: '#8A2C1C', lbl: '● Rejected' },
  cancelled:{ bg: '#EEF0F3', bd: '#D3D8E0', fg: '#5A6472', lbl: '● Cancelled' },
  deleted:  { bg: '#EEF0F3', bd: '#D3D8E0', fg: '#5A6472', lbl: '● Deleted' },
};

function Totals({ branch, so, po, gp, noSupplier }) {
  const cell = { flex: 1, minWidth: 140, padding: '8px 12px', borderRadius: 8, background: '#F7F9FC', border: '1px solid #E0E5EE' };
  const lbl = { fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700 };
  const val = { fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 15, marginTop: 2 };
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '4px 0 12px' }}>
      <div style={cell}><div style={{ ...lbl, color: '#1C556E' }}>Sale (SO)</div><div style={{ ...val, color: '#14161a' }}>{money(branch, so && so.total)}</div></div>
      {!noSupplier && <div style={cell}><div style={{ ...lbl, color: '#7A4D16' }}>Purchase (PO)</div><div style={{ ...val, color: '#14161a' }}>{money(branch, po && po.total)}</div></div>}
      <div style={{ ...cell, background: '#E7F4EC', border: '1px solid #9AD3B4' }}>
        <div style={{ ...lbl, color: '#155F42' }}>Gross Profit</div>
        <div style={{ ...val, color: '#155F42' }}>{money(branch, gp && gp.total)} <span style={{ fontSize: 11, fontWeight: 600, color: '#5A6472' }}>({(gp && gp.pct) ?? 0}%)</span></div>
      </div>
    </div>
  );
}

export function BookingFolderHost({ branch: shellBranch }) {
  const [job, setJob] = useState(null);       // { ref, branch, voucherId, vno }
  const [state, setState] = useState({ loading: false, err: '', data: null, fallback: false });

  useEffect(() => {
    const onOpen = (e) => { const d = e.detail || {}; if (d.ref) setJob({ ref: d.ref, branch: d.branch || '', voucherId: d.voucherId || '', vno: d.vno || '' }); };
    window.addEventListener('kb:booking-folder', onOpen);
    return () => window.removeEventListener('kb:booking-folder', onOpen);
  }, []);

  // A navigation elsewhere (kb:open-register — e.g. the Approvals deep-link below) closes
  // this overlay so it doesn't sit on top of the screen we just navigated to.
  useEffect(() => {
    const onNav = () => setJob(null);
    window.addEventListener('kb:open-register', onNav);
    return () => window.removeEventListener('kb:open-register', onNav);
  }, []);

  useEffect(() => {
    if (!job) { setState({ loading: false, err: '', data: null, fallback: false }); return undefined; }
    const pop = pushModal(() => setJob(null)); // Esc closes
    let cancelled = false;
    setState({ loading: true, err: '', data: null, fallback: false });
    (async () => {
      try {
        const bq = job.branch && job.branch !== 'ALL' ? job.branch : '';
        const d = await apiGet('/api/booking-orders/folder', { ref: job.ref, branch: bq });
        if (!cancelled) setState({ loading: false, err: '', data: d, fallback: false });
      } catch (e) {
        // Not a booking leg (a manual voucher / pure import). If the caller handed us the
        // voucher, drop to the single-voucher view so the click still lands somewhere.
        if (!cancelled) setState({ loading: false, err: e?.message || 'Not found', data: null, fallback: !!job.voucherId });
      }
    })();
    return () => { cancelled = true; pop(); };
  }, [job]);

  if (!job) return null;
  const branch = shellBranch;
  const cur = bc(branch).cur;
  const close = () => setJob(null);
  const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 18, lineHeight: 1, padding: '0 2px' };
  const btn = (bg) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, border: bg ? 'none' : '1px solid #cdd1d8', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: bg || '#fff', color: bg ? '#fff' : DARK });

  const d = state.data;
  const b = d && d.booking;
  const jv = d && d.journal;
  const inb = d && d.kind === 'inb' ? d.deal : null;
  const st = (b && STATUS[b.status]) || STATUS.pending;
  const modName = b ? (VSPECS[b.module]?.name || b.module) : '';
  const jerr = d && d.journalError;
  // A rejected/cancelled/deleted deal's journal was reversed out (or never posted) — its
  // recomputed JV must NOT be read as live. Pending = a preview that posts on approval.
  const voidDeal = b && (b.status === 'rejected' || b.status === 'cancelled' || b.status === 'deleted');
  const note = (bg, bd, fg) => ({ padding: '8px 12px', borderRadius: 7, background: bg, border: `1px solid ${bd}`, color: fg, fontSize: 12, margin: '2px 0 10px' });

  const doPrint = async (side) => {
    if (!b) return;
    let full = b;
    try { if (b.id) full = await apiGet(`/api/booking-orders/${b.id}`); } catch { full = b; }
    // Print in the BOOKING's own branch/currency (not the shell branch) — else a USD/Africa
    // deal opened from a ₹ / consolidated view would print in ₹.
    const printBranch = full.branch ? { code: full.branch } : branch;
    await printBookingInvoice({ booking: full, side, branch: printBranch, title: `${side === 'sale' ? 'Sales' : 'Purchase'} Invoice · ${full.bookingNo || full.linkNo || ''}` });
  };
  // Correction path: bookings are edit-locked as vouchers, so the deal is managed in
  // SO/PO/GP Approvals — edit it there if still pending, or revoke → edit if approved
  // (all legs move together). Deep-link focused on this booking (mirrors openParentFile);
  // the host closes itself on the kb:open-register it fires.
  const manageInApprovals = () => {
    if (!b) return;
    const ref = b.bookingNo || b.linkNo || '';
    setNavFocus('/transactions/approvals', { kind: 'file', domain: 'sopogp', status: b.status === 'pending' ? 'pending' : 'approved', search: ref, label: 'SO / PO / GP booking', ref });
    try { window.dispatchEvent(new CustomEvent('kb:open-register', { detail: { route: '/transactions/approvals' } })); } catch { /* ignore */ }
  };

  return (
    <div onMouseDown={close} style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,17,0.55)', zIndex: 8950, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '3.5vh 2vw' }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: 'min(1000px, 96vw)', maxHeight: '93vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 16px', borderBottom: '1px solid #DEDBD4', background: '#FDFAF4' }}>
          <strong style={{ fontSize: 13.5, color: DARK, letterSpacing: '.2px' }}>🗂 Booking Folder{b ? <> — {b.bookingNo}</> : ''}</strong>
          <button onClick={close} title="Close (Esc)" aria-label="Close" style={iconBtn}>✕</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px', minHeight: 0 }}>
          {state.loading && <div style={{ padding: 28, color: DIM, fontSize: 13, textAlign: 'center' }}>Loading the whole SO/PO/GP deal…</div>}

          {/* Fallback — the ref is a standalone voucher (no booking behind it). */}
          {!state.loading && state.fallback && (
            <div>
              <div style={{ padding: '9px 12px', borderRadius: 7, background: '#EEF3FA', border: '1px solid #C9D8EC', color: '#274B76', fontSize: 12, marginBottom: 10 }}>
                This voucher isn’t part of an SO/PO/GP booking — showing the single voucher.
              </div>
              <Suspense fallback={<div style={{ padding: 20, color: DIM, fontSize: 13 }}>Loading voucher…</div>}>
                <VoucherEditor voucherId={job.voucherId} cur={cur} onBack={close} onClose={close} />
              </Suspense>
            </div>
          )}

          {!state.loading && !state.fallback && state.err && (
            <div style={{ padding: 20, color: '#8A2C1C', fontSize: 13, textAlign: 'center' }}>Couldn’t open the deal — {state.err}</div>
          )}

          {/* INB deal (inter-branch) — no BookingOrder; show its two legs' identity. */}
          {!state.loading && inb && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: DARK }}>Inter-branch deal · {inb.linkNo || ''}</div>
              <div style={{ fontSize: 12, color: DIM, margin: '4px 0 10px' }}>
                Sale <b>{inb.saleVno || '—'}</b> · Purchase <b>{inb.purchaseVno || '—'}</b>
              </div>
              <div style={{ fontSize: 12, color: DIM }}>Open it from the INB Approvals screen to see the full journal.</div>
            </div>
          )}

          {/* The folder — booking header + GP + totals + every side's JV. */}
          {!state.loading && b && (
            <div>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: DARK, letterSpacing: '-.01em' }}>{b.bookingNo}</div>
                  <div style={{ fontSize: 12, color: DIM, marginTop: 3 }}>
                    Link No <b style={{ color: '#14161a' }}>{b.linkNo || '—'}</b> · Branch <b style={{ color: '#14161a' }}>{b.branch}</b>
                    {b.date ? <> · {b.date}</> : null} · Module <b style={{ color: '#14161a' }}>{modName}</b>
                    {(b.purchases || []).length ? <> · <b style={{ color: '#14161a' }}>1 SO : {1 + b.purchases.length} PO</b> folder</> : null}
                  </div>
                  <div style={{ fontSize: 12.5, marginTop: 6 }}>
                    <span style={{ color: DIM }}>Client</span> — <b>{(b.customer && (b.customer.ledgerName || b.customer.name)) || '—'}</b>
                    {!b.noSupplier && <> &nbsp;·&nbsp; <span style={{ color: DIM }}>Supplier</span> — <b>{(b.supplier && (b.supplier.ledgerName || b.supplier.name)) || '—'}</b></>}
                  </div>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: st.fg, background: st.bg, border: `1px solid ${st.bd}`, padding: '4px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>{st.lbl}</div>
              </div>

              {/* Currency follows the BOOKING's own branch, not the shell branch — so a USD
                  (Africa) deal shown while the shell is on ₹ / consolidated still reads in $. */}
              <Totals branch={b.branch ? { code: b.branch } : branch} so={b.so} po={b.po} gp={b.gp} noSupplier={b.noSupplier} />

              {/* Status truth about the journal below, so a recomputed JV is never mistaken
                  for one that's actually on the books. */}
              {jerr ? (
                <div style={note('#FBE9E7', '#E6B4AC', '#8A2C1C')}>⚠ The journal couldn’t be built for this deal — showing the booking only. <span style={{ opacity: 0.8 }}>{jerr}</span></div>
              ) : voidDeal ? (
                <div style={note('#FBE9E7', '#E6B4AC', '#8A2C1C')}>⚠ This deal is <b>{b.status}</b> — the journal below is <b>not on the books</b> (reversed out / never posted). Shown for reference only.</div>
              ) : b.status === 'pending' ? (
                <div style={note('#FBF3DE', '#E8D9A8', '#6B4E0F')}>Preview — <b>not yet posted</b>. Approving this booking posts the journal below.</div>
              ) : null}

              {/* Sale JV */}
              {jv && jv.sale && (
                <JvBlock title="Sales voucher (SO)" sub={jv.sale.vno} color="#1C556E" postings={jv.sale.postings} />
              )}
              {/* Primary Purchase JV */}
              {jv && jv.purchase && (
                <JvBlock title="Purchase voucher (PO)" sub={jv.purchase.vno} color="#7A4D16" postings={jv.purchase.postings} />
              )}
              {/* Additional N-PO legs — one JvBlock each (folder deals only). */}
              {jv && (jv.purchaseLegs || []).map((leg, i) => (
                <JvBlock key={i} title={`Purchase leg ${i + 2} · ${VSPECS[leg.module]?.name || leg.module}`} sub={`${leg.vno}${leg.supplier ? ' · ' + leg.supplier : ''}`} color="#7A4D16" postings={leg.postings} />
              ))}

              {jv && !jv.balanced && (
                <div style={{ fontSize: 11.5, color: '#8A2C1C', fontWeight: 700, marginTop: 4 }}>⚠ This deal’s journal is currently out of balance.</div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!state.loading && b && (
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap', padding: '11px 16px', borderTop: '1px solid #DEDBD4', background: '#FAFBFD' }}>
            <span style={{ fontSize: 11.5, color: voidDeal ? '#8A93A2' : !jv ? '#8A2C1C' : jv.balanced ? '#155F42' : '#8A2C1C', fontWeight: 700 }}>
              {voidDeal
                ? `● Not on the books (${b.status})`
                : !jv
                  ? '● Journal unavailable'
                  : `${jv.balanced ? '● Balanced' : '● Check balance'} — 1 Sale JV${!b.noSupplier ? ` + ${1 + (b.purchases || []).length} Purchase JV` : ''}`}
            </span>
            <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 9, flexWrap: 'wrap' }}>
              <button onClick={() => doPrint('sale')} style={btn('')}>🖨 Print SO</button>
              {!b.noSupplier && <button onClick={() => doPrint('purchase')} style={btn('')}>🖨 Print PO</button>}
              <button onClick={manageInApprovals} title="Open this deal in SO/PO/GP Approvals — edit it if pending, or revoke → edit if approved (all legs move together)" style={btn('#A07828')}>Open in Approvals →</button>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
