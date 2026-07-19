// ───────────────────────────────────────────────────────────────────────────
// SUPPORT PREFILL — a one-shot hand-off from the "Report" action on the screen-
// number badge to the Support ticket form. The badge stashes {title, description,
// route} here, then routes to /support/tickets; the Support page reads (and clears)
// it — on mount, or immediately via the 'kbiz:support-prefill' event when it is
// already open — to pop the Raise-Ticket dialog pre-filled with the screen context.
// A plain module singleton is enough — client-side navigation keeps it in memory.
// ───────────────────────────────────────────────────────────────────────────
let pending = null;

export function setSupportPrefill(value) {
  pending = value || null;
  // Wake an already-mounted Support page (navigate() is a no-op when you're already
  // on /support/tickets, so mount-time consumption alone would miss that case).
  try { window.dispatchEvent(new CustomEvent('kbiz:support-prefill')); } catch { /* non-DOM ctx */ }
}

// Return the pending prefill and clear it, so it's consumed exactly once.
export function takeSupportPrefill() { const v = pending; pending = null; return v; }

// Never let one user's stashed report survive into the next session on a shared
// device — logout clears every kb360-* localStorage key but not this in-memory value.
if (typeof window !== 'undefined') {
  window.addEventListener('kbiz:logout', () => { pending = null; });
}
