// ───────────────────────────────────────────────────────────────────────────
// SUPPORT PREFILL — a one-shot hand-off from the "Report" action on the screen-
// number badge to the Support ticket form. The badge stashes {title, description}
// here, then routes to /support/tickets; the Support page reads (and clears) it on
// mount to auto-open the Raise-Ticket dialog pre-filled with the screen context.
// A plain module singleton is enough — client-side navigation keeps it in memory.
// ───────────────────────────────────────────────────────────────────────────
let pending = null;

export function setSupportPrefill(value) { pending = value || null; }

// Return the pending prefill and clear it, so it's consumed exactly once.
export function takeSupportPrefill() { const v = pending; pending = null; return v; }
