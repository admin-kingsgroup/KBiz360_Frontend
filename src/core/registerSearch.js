// ─── Register search haystacks ────────────────────────────────────────────────
// Free-text search for the SO/PO registers. Each builder flattens everything
// captured on a record into one lower-cased string so the search bar can find a
// deal by passenger / guest / applicant name, ticket no, PNR, sector, passport,
// customer, supplier, link no, voucher no — any value entered on the SO/PO.

// Booking (Module Sales/Purchase/S&P Register) — header + every captured line +
// flight sectors.
export function bookingHaystack(b) {
  const parts = [
    b.bookingNo, b.linkNo, b.date, b.headerRef, b.packageType, b.remarks,
    b.saleVno, b.purchaseVno, b.module,
    b.customer?.name, b.customer?.gstin, b.customer?.contact, b.customer?.email,
    b.supplier?.name, b.supplier?.gstin, b.supplier?.contact,
  ];
  const eat = (obj) => {
    if (obj && typeof obj === 'object') {
      Object.values(obj).forEach((v) => { if (v && typeof v === 'object') eat(v); else parts.push(v); });
    }
  };
  (b.rows || []).forEach(eat);
  return parts.filter((x) => x != null && x !== '').join('  ').toLowerCase();
}

// Global search — a per-file GP bill (/api/accounting/gp-bills) flattened to the
// searchable fields shown in the results table.
export function gpBillHaystack(b) {
  return [b.id, b.client, b.dest, b.supplier, b.consultant, b.airline]
    .filter((x) => x != null && x !== '')
    .join('  ')
    .toLowerCase();
}

// Filter + rank live GP bills for the global search bar. Returns at most `limit`
// matches, each enriched with gp / gpPct (guarding a zero-revenue divide).
export function filterGpBills(bills, query, limit = 50) {
  const needle = String(query || '').trim().toLowerCase();
  if (needle.length < 2) return [];
  return (bills || [])
    .filter((b) => gpBillHaystack(b).includes(needle))
    .slice(0, limit)
    .map((b) => {
      const gp = (b.sell || 0) - (b.cost || 0);
      return { ...b, gp, gpPct: b.sell ? +((gp / b.sell) * 100).toFixed(1) : 0 };
    });
}

// Posted voucher (Sales/Purchase Register) — header + every line's label and meta
// (passenger / ticket / PNR / sector …).
export function voucherHaystack(v) {
  const parts = [v.date, v.vno, v.type, v.category, v.party, v.linkNo];
  for (const ln of v.lines || []) {
    parts.push(ln.label, ln.ledger, ln.ledgerName);
    const m = ln.meta && typeof ln.meta === 'object' ? ln.meta : null;
    if (m) for (const val of Object.values(m)) parts.push(val);
  }
  return parts.filter((x) => x != null && x !== '').join('  ').toLowerCase();
}
