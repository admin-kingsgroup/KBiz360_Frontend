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

export async function printBookingInvoice({ booking, side, branch, master = {}, title }) {
  const usd = buildBookingInvoice(booking, side, branch, master);
  const ttl = title || `${side === 'sale' ? 'Sales Invoice' : 'Purchase Invoice'} · ${booking.bookingNo || booking.linkNo || ''}`;
  const code = branchCode(branch) || String(booking.branch || '').toUpperCase();

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
      html: buildBookingInvoice(booking, side, branch, master, { fxRate: fx.rate, localCurrency: to, fxDate: fx.date }),
    });
  } else {
    // No rate for today → block local printing (show a locked tab with the reason).
    variants.push({ label: to, disabled: true, note: `Today's FX rate is not set for ${code} — local-currency printing is blocked until an accountant enters it (Masters › Forex Rates).` });
  }
  openPrintPreview({ title: ttl, recommend: 'portrait', html: usd, currencyVariants: variants });
}
