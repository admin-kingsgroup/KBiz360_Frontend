/* ════════════════════════════════════════════════════════════════════
   masters/components/mstr — shared master-screen chrome (modernized)
   ════════════════════════════════════════════════════════════════════
   Drop-in replacements for the old helpers.jsx MstrShell / MstrModal (same
   props), rebuilt responsive on the brand tokens + shared Modal. Swapping
   the import in legacy.jsx lifts every MstrShell screen + MstrModal dialog
   to a wrapping, mobile-friendly header and a scroll-safe modal at once —
   without touching each screen's body.
   ──────────────────────────────────────────────────────────────────── */

import React from 'react';
import { Modal, Button } from '../../../shell/primitives';

/* Master page header: icon chip · title · count badge · right-aligned actions.
   Header wraps on small screens; content is full-width with responsive padding. */
export function MstrShell({ title, icon, badge, badgeBg, badgeC, actions, children }) {
  return (
    <div className="mx-auto w-full max-w-[1260px] px-3 py-3 tablet:px-4 tablet:py-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E6F1FB] text-lg">{icon}</div>}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="truncate text-[17px] font-bold tracking-tight text-navy">{title}</h2>
            {badge && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: badgeBg || '#E6F1FB', color: badgeC || '#185FA5' }}>{badge}</span>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/* Master dialog on the shared Modal (Esc + backdrop close, internal scroll,
   mobile-safe sizing). Footer preserves the original Cancel / Save buttons —
   both close (the legacy forms did not persist; live masters own real saves). */
export function MstrModal({ title, onClose, children }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={onClose}>Save</Button>
        </>
      }
    >
      <div className="p-4">{children}</div>
    </Modal>
  );
}
