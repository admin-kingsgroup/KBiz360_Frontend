// ───────────────────────────────────────────────────────────────────────────
// Cash Book row helpers (pure — unit-tested in __tests__/cashBookRows.test.js).
//
// A ledger statement line from /api/accounting/ledger carries the contra
// ledger(s) in `particulars` (an array of { ledger, group, side, amount }),
// the posting narration in `narration`, and the voucher narration in
// `entryNarration`. The Cash Book shows the contra LEDGER NAME as the main
// "Particulars", with the narration revealed underneath on "Expand all".
// ───────────────────────────────────────────────────────────────────────────

// Tally "Particulars": the contra ledger(s) — the other leg(s) of the voucher.
// Multiple distinct legs collapse to "First (+N more)". Falls back to party /
// category / em-dash when no contra leg is present (e.g. opening rows).
export function contraLedgerName(ln) {
  if (!ln) return '—';
  const ps = ln.particulars;
  if (Array.isArray(ps) && ps.length) {
    const names = [...new Set(ps.map((p) => (p && p.ledger) || p).filter(Boolean))];
    if (names.length) return names.length === 1 ? String(names[0]) : `${names[0]} (+${names.length - 1} more)`;
  }
  return ln.party || ln.category || '—';
}

// The narration to show under the ledger name when "Expand all" is on.
export function lineNarration(ln) {
  if (!ln) return '';
  return ln.narration || ln.entryNarration || '';
}
