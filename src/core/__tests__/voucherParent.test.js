// useRevokeAction pulls in useAccounting → api.js (Vite `import.meta.env`, unparseable by
// jest). voucherParent itself is pure (local PARENT_LABEL/PARENT_NAV only), so stub the
// heavy deps to let the module load.
jest.mock('../useAccounting', () => ({ useRevokeVoucher: () => ({}), fetchRevokeCheck: () => {} }));
jest.mock('../api', () => ({ isApprover: () => false }));
jest.mock('../ux/confirm', () => ({ confirmDialog: () => {} }));
jest.mock('../ux/toast', () => ({ toast: () => {} }));
jest.mock('../ux/navFocus', () => ({ setNavFocus: () => {} }));
import { voucherParent } from '../voucher/useRevokeAction';

// voucherParent() is the FE mirror of the backend LOCKED_MASTERS gate: it returns a
// { label, ref, source, navigable } parent for a leg locked to a master (SO/PO/GP booking,
// INB deal, purchase-expense order, ADM/ACM register) and null otherwise. Both VoucherShell's
// read-only treatment AND the Approvals-queue Delete gate key off it, and the backend now
// 409s a direct delete/edit/revoke of exactly this set — so the predicate must match it.
describe('voucherParent — master-locked leg detection (FE mirror of backend LOCKED_MASTERS)', () => {
  test.each([
    ['booking', 'SO / PO / GP booking', true],
    ['inb', 'INB deal', true],
    ['expense-order', 'purchase expense order', false],
    ['adm-register', 'ADM register', false],
    ['acm-register', 'ACM register', false],
  ])('a locked %s leg resolves to its parent (navigable=%s)', (source, label, navigable) => {
    expect(voucherParent({ locked: true, source, bookingId: 'BO/9' })).toEqual({ label, ref: 'BO/9', source, navigable });
  });

  test('ref falls back to sourceRef when there is no bookingId', () => {
    expect(voucherParent({ locked: true, source: 'inb', sourceRef: 'INB/BOM/26/1' }).ref).toBe('INB/BOM/26/1');
  });

  test('an UNLOCKED voucher has no parent — Delete stays enabled, leg is editable', () => {
    expect(voucherParent({ locked: false, source: 'booking', bookingId: 'BO/9' })).toBeNull();
  });

  test('a locked voucher with a non-master source has no parent (a direct/manual GL entry)', () => {
    expect(voucherParent({ locked: true, source: 'manual' })).toBeNull();
    expect(voucherParent({ locked: true, source: 'import' })).toBeNull();
  });

  test('null / undefined / empty input is safe', () => {
    expect(voucherParent(null)).toBeNull();
    expect(voucherParent(undefined)).toBeNull();
    expect(voucherParent({})).toBeNull();
  });
});
