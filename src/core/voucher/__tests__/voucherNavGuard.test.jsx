// Phase 2 — the unified voucher engine (VoucherShell) arms the app-wide unsaved-
// changes guard, so leaving a half-filled voucher (receipt / payment / contra /
// journal / purchase-expense / debit-note / refund / ADM / ACM — every category
// runs through this one engine) prompts before discarding it. The guard is a
// serialized-snapshot compare, so this proves the wiring for ALL categories at once.
jest.mock('../../useAccounting', () => ({
  useVoucherPreview: jest.fn(() => ({ data: { postings: [], balanced: true, totalDebit: 0, totalCredit: 0, diff: 0 } })),
  useVoucherJournal: jest.fn(() => ({ data: { postings: [], balanced: true, totalDebit: 0, totalCredit: 0, diff: 0 }, isLoading: false })),
  useCreateVoucher: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateVoucher: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useRevokeVoucher: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  fetchRevokeCheck: jest.fn(() => Promise.resolve({ blocks: [], warnings: [], journalRows: 0 })),
}));
jest.mock('../../ux/confirm', () => ({ confirmDialog: jest.fn(() => Promise.resolve({ confirmed: false })) }));
const mockViewOnly = jest.fn(() => false);
jest.mock('../../api', () => ({ isViewOnly: () => mockViewOnly(), isApprover: () => true, VIEW_ONLY_REASON: 'View only' }));
jest.mock('../../PrintPreview', () => ({ openPrintPreview: jest.fn() }));
jest.mock('../../styles', () => ({
  B: {}, bc: () => ({ cur: '₹' }),
  VWrap: ({ children }) => <div>{children}</div>, VHead: () => null,
  FL: ({ children }) => <div>{children}</div>,
  inp: {}, card: {}, btnG: {}, btnGh: {},
}));
// A registry entry whose form binds a real input to `state`, so typing actually
// mutates the snapshot the guard watches.
jest.mock('../registry', () => ({
  VOUCHER_REGISTRY: {
    payment: {
      label: 'Payment', icon: '₹', type: 'PMT',
      fields: ({ state, setState }) => (
        <input aria-label="narration" value={state.narration || ''}
          onChange={(e) => setState((s) => ({ ...s, narration: e.target.value }))} />
      ),
      initial: () => ({ narration: '' }),
      fromVoucher: (v) => ({ narration: v.narration || '' }),
      toBody: () => ({}),
      validate: () => ({ ok: true, hint: '' }),
    },
  },
}));
jest.mock('../JvBlock', () => ({ JvBlock: () => null }));
jest.mock('../../ux/forms', () => ({ useFormKeys: () => ({ ref: { current: null }, onKeyDown: jest.fn() }) }));
jest.mock('../../ux/toast', () => ({ toast: jest.fn() }));
jest.mock('../../ux/widgets.jsx', () => ({ Kbd: () => null }));
jest.mock('../../hooks', () => ({ triggerSaveRefresh: jest.fn() }));
jest.mock('../../useNextNo', () => ({ useVNo: () => 'PMT/BOM/26/0002' }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoucherShell } from '../VoucherShell';
import { isGuardDirty, clearNavGuard } from '../../ux/navGuard';

afterEach(() => { clearNavGuard(); mockViewOnly.mockReturnValue(false); });

describe('VoucherShell — unsaved-changes nav guard', () => {
  test('a blank voucher is not dirty; typing a field arms the guard', () => {
    render(<VoucherShell category="payment" mode="create" branch="BOM" cur="₹" />);
    expect(isGuardDirty()).toBe(false);
    fireEvent.change(screen.getByLabelText('narration'), { target: { value: 'Office rent' } });
    expect(isGuardDirty()).toBe(true);
  });

  test('clearing the field back to pristine disarms the guard (snapshot compare, not a one-way flag)', () => {
    render(<VoucherShell category="payment" mode="create" branch="BOM" cur="₹" />);
    const inp = screen.getByLabelText('narration');
    fireEvent.change(inp, { target: { value: 'x' } });
    expect(isGuardDirty()).toBe(true);
    fireEvent.change(inp, { target: { value: '' } });
    expect(isGuardDirty()).toBe(false);
  });

  test('unmounting the form clears the guard (no stale dirty-check after the screen is gone)', () => {
    const { unmount } = render(<VoucherShell category="payment" mode="create" branch="BOM" cur="₹" />);
    fireEvent.change(screen.getByLabelText('narration'), { target: { value: 'y' } });
    expect(isGuardDirty()).toBe(true);
    unmount();
    expect(isGuardDirty()).toBe(false);
  });

  // Regression: reset() reseeds the SAME shape the pristine snapshot captured (incl. the
  // shell-added sourceRef key), so a freshly-blanked form is genuinely clean — no spurious
  // "unsaved changes" prompt after Reset / ＋New Voucher / a closeOnSave reset.
  test('after Reset, a blanked form is NOT falsely dirty', () => {
    render(<VoucherShell category="payment" mode="create" branch="BOM" cur="₹" />);
    fireEvent.change(screen.getByLabelText('narration'), { target: { value: 'typed' } });
    expect(isGuardDirty()).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /^Reset$/i }));
    expect(isGuardDirty()).toBe(false);
  });

  // A view-only account can't save, so its edits are moot — the guard must not false-arm
  // (and threaten "changes will be lost") for someone who changed nothing savable.
  test('a view-only user never arms the guard, even after typing', () => {
    mockViewOnly.mockReturnValue(true);
    render(<VoucherShell category="payment" mode="create" branch="BOM" cur="₹" />);
    fireEvent.change(screen.getByLabelText('narration'), { target: { value: 'anything' } });
    expect(isGuardDirty()).toBe(false);
  });
});
