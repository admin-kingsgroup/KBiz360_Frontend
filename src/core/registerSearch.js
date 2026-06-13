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
