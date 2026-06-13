import { useAppConfig } from '../useReference';
import { TDS_SECTIONS, GST_SLABS } from '../taxSections';
import { PMT_MODES_V } from '../helpers';

// Bundled fallback for the credit/debit-note reason lists (used only until the
// backend app-config key 'voucherRef' loads, or if it's absent).
const NOTE_REASONS = {
  credit: ['Ticket Cancellation / Refund', 'Fare Correction', 'Sales Return', 'Discount Allowed', 'Rate Difference'],
  debit: ['Ticket Cancellation by Airline', 'Purchase Return', 'Rate Difference', 'Overcharge Correction', 'Discount Received'],
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
