import { useAppConfig } from '../useReference';
import { TDS_SECTIONS, GST_SLABS } from '../taxSections';
import { PMT_MODES_V } from '../helpers';

// Bundled fallback for the credit/debit-note reason lists (used only until the
// backend app-config key 'voucherRef' loads, or if it's absent).
// Cancellation / refund of a sale or purchase is handled ONLY by the Refund (RF) /
// Reissue (RI) vouchers (full reversal of the original booking). Credit / Debit Notes
// are for OTHER adjustments — discounts, rate differences, corrections.
const NOTE_REASONS = {
  credit: ['Fare Correction', 'Discount Allowed', 'Rate Difference', 'Other Adjustment'],
  debit: ['Rate Difference', 'Overcharge Correction', 'Discount Received', 'Other Adjustment'],
};

/**
 * Live voucher-form reference data (TDS sections, GST slabs, payment modes, note
 * reasons), sourced from app-config (key 'voucherRef') so it's admin-editable.
 * Falls back to the bundled constants until it loads / if the key is absent.
 */
export function useVoucherRef() {
  const cfg = useAppConfig('voucherRef').data || {};
  return {
    tdsSections: cfg.tdsSections || TDS_SECTIONS,
    gstSlabs: cfg.gstSlabs || GST_SLABS,
    paymentModes: cfg.paymentModes || PMT_MODES_V,
    noteReasons: cfg.noteReasons || NOTE_REASONS,
  };
}
