// ───────────────────────────────────────────────────────────────────────────
// Accessible, promise-based confirm / prompt — replaces window.confirm/prompt.
// Fire from anywhere (no hook), await the result:
//
//   import { confirmDialog } from '../core/ux/confirm';
//   const { confirmed } = await confirmDialog({ title: 'Sign out?', danger: true });
//   if (confirmed) signOut();
//
//   // with a required reason (reject / delete):
//   const { confirmed, reason } = await confirmDialog({
//     title: `Reject ${b.bookingNo}?`, message: 'This marks it Rejected (no books impact).',
//     danger: true, reasonRequired: true, reasonLabel: 'Reason', confirmLabel: 'Reject',
//   });
//   if (confirmed) reject.mutate({ id, reason });
//
// Built on the shared <Modal> (role="dialog", aria-modal, Esc-to-close, focus). Mount
// <ConfirmHost/> once near the app root (next to <ToastHost/>). Dialogs queue, so two
// overlapping calls each resolve in turn instead of clobbering one another.
// ───────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { Modal } from './Modal.jsx';
import { btnG, btnGh } from '../styleTokens.jsx';

let sink = null;
let seq = 1;

export function confirmDialog(opts = {}) {
  return new Promise((resolve) => {
    const req = { id: seq++, confirmLabel: 'Confirm', cancelLabel: 'Cancel', ...opts, resolve };
    // No host mounted (e.g. a non-UI context) → fail safe: treat as cancelled.
    if (sink) sink(req); else resolve({ confirmed: false, reason: '' });
  });
}

// Pure resolution rule, exported for unit tests: a required reason must be non-empty
// before a confirm can go through; cancel always passes. Returns the resolution
// payload, or null when the action is blocked (keep the dialog open).
export function _resolveConfirm(req, reason, confirmed) {
  const r = String(reason == null ? '' : reason).trim();
  if (confirmed && req && req.reasonRequired && !r) return null;
  return { confirmed, reason: r };
}

// Test seam: lets a host (or a test) register as the dialog sink.
export function _setConfirmSink(fn) { sink = fn; return () => { if (sink === fn) sink = null; }; }

export function ConfirmHost() {
  const [queue, setQueue] = useState([]);
  const [reason, setReason] = useState('');
  const cur = queue[0];

  useEffect(() => _setConfirmSink((req) => setQueue((q) => [...q, req])), []);
  // Seed the reason field whenever a new dialog surfaces.
  useEffect(() => { setReason(cur && cur.reasonDefault ? cur.reasonDefault : ''); }, [cur && cur.id]);

  if (!cur) return null;

  const settle = (confirmed) => {
    const out = _resolveConfirm(cur, reason, confirmed);
    if (!out) return; // blocked (required reason missing) → keep open
    cur.resolve(out);
    setQueue((q) => q.slice(1));
  };

  const wantsReason = !!(cur.reason || cur.reasonRequired);
  const blocked = cur.reasonRequired && !reason.trim();
  const confirmStyle = cur.danger ? { ...btnG, background: '#A32D2D' } : btnG;

  const footer = (
    <>
      <button type="button" onClick={() => settle(false)} style={btnGh}>{cur.cancelLabel}</button>
      <button type="button" onClick={() => settle(true)} disabled={blocked}
        style={{ ...confirmStyle, opacity: blocked ? 0.55 : 1, cursor: blocked ? 'not-allowed' : 'pointer' }}>
        {cur.confirmLabel}
      </button>
    </>
  );

  return (
    <Modal title={cur.title} sub={cur.sub} onClose={() => settle(false)} maxWidth={cur.maxWidth || 460} footer={footer}>
      <div style={{ padding: 16 }}>
        {cur.message && (
          <div style={{ fontSize: 12.5, color: '#384677', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{cur.message}</div>
        )}
        {wantsReason && (
          <div style={{ marginTop: cur.message ? 12 : 0 }}>
            <label htmlFor="kb-confirm-reason" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6691', marginBottom: 4 }}>
              {cur.reasonLabel || 'Reason'}{cur.reasonRequired && <span style={{ color: '#A32D2D' }}> *</span>}
            </label>
            <textarea id="kb-confirm-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder={cur.reasonPlaceholder || ''}
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cdd1d8', borderRadius: 7, padding: '8px 10px', fontSize: 12, resize: 'vertical' }} />
          </div>
        )}
      </div>
    </Modal>
  );
}
