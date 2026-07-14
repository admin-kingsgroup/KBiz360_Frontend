/* Approvals feature barrel — unified voucher approvals queue.
   BUSINESS SUB-MODULE REORG (2026-07-14): BookingApprovals (the SO/PO/GP
   queue used by voucherApprovals.jsx's UnifiedApprovals dispatcher) moved
   in from bookingOrder/legacy.jsx to ./bookingApprovals.jsx — NOT re-exported
   from this barrel on purpose: voucherApprovals.jsx imports BookingApprovals
   from '../bookingOrder' (which re-exports it from ./bookingApprovals.jsx),
   and several tests do `jest.mock('../bookingOrder', () => ({ BookingApprovals:
   () => null }))` while importing VoucherApprovals/InbApprovals from THIS
   barrel — adding an eager `export … from './bookingApprovals'` here would
   load the real module (pulling in core/api.js's import.meta chain) and
   bypass that mock, same as the reconciliation/tally-reconciliation barrels
   hit earlier in this reorg. Import BookingApprovals from './bookingApprovals'
   directly if a new consumer needs it without going through bookingOrder. */
export * from './voucherApprovals';
