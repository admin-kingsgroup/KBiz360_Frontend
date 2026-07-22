// ─── Booking invoice printing with optional local-currency toggle ────────────
// One entry point for printing a Sales / Purchase booking invoice. India branches
// print straight in ₹. Africa (VAT) branches keep their books in USD but may also
// print in the branch's LOCAL currency at the daily branch FX rate — so this builds
// BOTH variants and hands them to the Print Preview, which shows a USD / local toggle.
// When today's rate hasn't been set the local tab is locked (printing is blocked per
// the daily-FX design); books never move — the conversion is display-only.
import { apiGet } from './api';
import { buildBookingInvoice } from './invoiceHtml';
import { isVatBranch } from './voucherSpecs';
import { branchCode } from './useAccounting';
import { branchCurrenciesOf } from './referenceCache';
import { openPrintPreview } from './PrintPreview';

const val = (...vs) => vs.find((v) => v != null && String(v).trim() !== '') || '';

// Party-master back-fill. The booking's customer/supplier subdoc is often thin (B2B
// entry stamps only ledger fields), and a transaction-derived party has NO master row
// at all — its billing identity (GSTIN, email, contact) lives on the branch LEDGER.
// Resolve here, once, so every print entry point (registers, booking folder, approvals)
// gets the same billed-to detail: caller-supplied master → customers/suppliers master
// by name → ledger fields underneath, merged field-by-field.
async function resolvePartyMaster(booking, side, code, given = {}) {
  const nm = String((side === 'sale' ? booking.customer : booking.supplier)?.name || '').trim().toLowerCase();
  if (!nm) return given;
  const eq = (x) => String(x?.name || '').trim().toLowerCase() === nm;
  let master = given;
  if (!val(master.gstin, master.address, master.email, master.contact, master.phone)) {
    try { master = ((await apiGet(side === 'sale' ? '/api/customers' : '/api/suppliers')) || []).find(eq) || given; }
    catch { master = given; }
  }
  let ledger = null;
  try {
    const rows = (await apiGet('/api/ledgers', { branch: code })) || [];
    ledger = rows.find((l) => eq(l) && String(l.branch || '').toUpperCase() === code) || rows.find(eq) || null;
  } catch { ledger = null; }
  if (!ledger) return master;
  return {
    ...master,
    gstin: val(master.gstin, ledger.gstin),
    email: val(master.email, ledger.email),
    contact: val(master.contact, master.phone, ledger.contactNumber),
  };
}

export async function printBookingInvoice({ booking, side, branch, master = {}, title }) {
  const code = branchCode(branch) || String(booking.branch || '').toUpperCase();
  const party = await resolvePartyMaster(booking, side, code, master);
  // A refund/reissue booking carries no passenger rows of its own — fetch the ORIGINAL
  // sale it reverses (by-link, read-only) so the printed invoice can show the passengers
  // and sectors being refunded/reissued. Best-effort: the invoice prints without it.
  const base = {};
  if (['RF', 'RI'].includes(String(booking.module || '').toUpperCase()) && booking.againstInvoice) {
    try { base.original = await apiGet('/api/booking-orders/by-link', { link: booking.againstInvoice, branch: code }); }
    catch { /* original not resolvable — print without passenger context */ }
  }
  const usd = buildBookingInvoice(booking, side, branch, party, base);
  const ttl = title || `${side === 'sale' ? 'Sales Invoice' : 'Purchase Invoice'} · ${booking.bookingNo || booking.linkNo || ''}`;

  // India / single-currency branch → one invoice, no toggle. FBM is VAT but USD-only
  // (no secondary currency), so its invoices print straight in USD like India's in ₹.
  if (!isVatBranch(code) || branchCurrenciesOf(code).length < 2) {
    openPrintPreview({ title: ttl, recommend: 'portrait', html: usd });
    return;
  }

  // Dual-currency Africa branch → offer a USD / local-currency toggle from today's
  // daily branch FX rate.
  let fx = null;
  try { fx = await apiGet(`/api/forex-rates/branch/${code}`); } catch { fx = null; }
  // `applicable:false` = the backend says this branch has no local currency (stale
  // branch cache on our side) → plain USD invoice, no toggle.
  if (fx && fx.applicable === false) { openPrintPreview({ title: ttl, recommend: 'portrait', html: usd }); return; }
  const to = (fx && fx.to) || 'Local';
  const variants = [{ label: 'USD', html: usd }];
  if (fx && fx.set && Number(fx.rate) > 0) {
    variants.push({
      label: to,
      html: buildBookingInvoice(booking, side, branch, party, { ...base, fxRate: fx.rate, localCurrency: to, fxDate: fx.date }),
    });
  } else {
    // No rate for today → block local printing (show a locked tab with the reason).
    variants.push({ label: to, disabled: true, note: `Today's FX rate is not set for ${code} — local-currency printing is blocked until an accountant enters it (Masters › Forex Rates).` });
  }
  openPrintPreview({ title: ttl, recommend: 'portrait', html: usd, currencyVariants: variants });
}
