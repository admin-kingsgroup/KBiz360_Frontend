// Pure ledger-dropdown filtering, split out of helpers.jsx so it can be
// unit-tested without pulling that module's heavy import graph.

// Render cap for the ledger dropdown. The menu body already scrolls
// (maxHeight 220), so this only bounds DOM nodes per open, not reachability —
// the previous value of 12 hid every ledger past the first dozen, and because
// the chart is sorted by account code the field appeared to list only the
// low-coded Sundry Creditors. Type to narrow when there are more matches.
export const LEDGER_PICKER_CAP = 50;

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
