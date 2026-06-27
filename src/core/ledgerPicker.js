// ───────────────────────────────────────────────────────────────────────────
// Pure state derivation for the Ledger Account picker (accountingLive LedgerAcLive).
//
// Selection (what's chosen in the dropdown) is DECOUPLED from what's displayed:
// the statement panel only changes when the user presses "Show". This prevents the
// old controlled-<select> desync — where narrowing the option list left the bound
// value pointing at a ledger no longer in the list, so the dropdown VISUALLY showed
// one ledger (e.g. "ICICI Bank Credit Card") while the panel below still rendered
// the stale one ("ICICI Bank"). No React, no side effects — unit-tested in isolation.
// ───────────────────────────────────────────────────────────────────────────

// `pick`     — the current dropdown choice (not yet shown), '' before any pick
// `shown`    — the ledger last committed via "Show", '' before any Show
// `fallback` — default ledger (last-opened pref → first ledger), '' while loading
// Returns { selected, display, dirty }:
//   selected — value the <select> binds to (the dropdown choice)
//   display  — ledger the statement actually fetches + renders
//   dirty    — true when the pick differs from what's displayed ("Show" enabled)
export function resolveLedgerSelection({ pick = '', shown = '', fallback = '' } = {}) {
  const selected = pick || fallback;
  const display = shown || fallback;
  const dirty = !!selected && selected !== display;
  return { selected, display, dirty };
}
