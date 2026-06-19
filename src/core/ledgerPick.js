// Pure ledger-dropdown filtering, split out of helpers.jsx so it can be
// unit-tested without pulling that module's heavy import graph.

// Render cap for the ledger dropdown — a safety bound on DOM nodes, NOT a
// "show only the top N" feature. The menu body scrolls (maxHeight 220) and the
// search box matches by name AND group, so the whole chart must be reachable.
//
// History: the original cap of 12 (then a stop-gap 50) truncated the list. The
// API returns ledgers sorted by account code, and parties (Sundry Debtors/
// Creditors) own the low codes, so non-party heads sit deep in the list —
// expenses ~index 24, assets ~77, liabilities ~153, tax ~192, capital ~255.
// Any cap below the chart size therefore hid entire account classes (the user
// saw "only creditors", then "no expenses/assets/tax"). The largest real chart
// (consolidated all-branch view) is ~620 ledgers, so 2000 shows every account
// in every branch with headroom while still guarding against a pathological
// future chart. Type to narrow; scroll to browse.
export const LEDGER_PICKER_CAP = 2000;

// Filter a ledger registry by the search query and the caller's filter, then
// cap the rendered slice. Returns { matches, shown }: `matches` = every ledger
// passing query + filter, `shown` = the capped slice actually rendered.
export function pickLedgers(registry, q, filter, cap = LEDGER_PICKER_CAP) {
  const needle = (q || '').toLowerCase();
  const matches = (registry || []).filter((l) => {
    const matchQ = !needle || l.name.toLowerCase().includes(needle) || (l.group || '').toLowerCase().includes(needle);
    const matchFilter = !filter || filter(l);
    return matchQ && matchFilter;
  });
  return { matches, shown: matches.slice(0, cap) };
}
