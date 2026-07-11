import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../api/voucherPolicy', () => ({
  getVoucherPolicy: jest.fn(),
  setVoucherPolicy: jest.fn(),
  proposeVoucherPolicy: jest.fn().mockResolvedValue({}),
}));
// eslint-disable-next-line import/first
import { EnforcementMatrix } from '../EnforcementMatrix';
// eslint-disable-next-line import/first
import { getVoucherPolicy, setVoucherPolicy, proposeVoucherPolicy } from '../api/voucherPolicy';

const DATA = {
  categories: [{ key: 'payment', label: 'Payment' }, { key: 'journal', label: 'Journal' }],
  defaults: { enforce: false, threshold: 0, effectiveDate: '' },
  store: { default: { payment: { enforce: true, threshold: 50000 } }, branches: { BOM: { payment: { threshold: 20000 } } } },
  effective: {},
};

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('EnforcementMatrix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    try { localStorage.clear(); } catch { /* ignore */ }
    getVoucherPolicy.mockResolvedValue(DATA);
    setVoucherPolicy.mockResolvedValue({ store: DATA.store, effective: {} });
  });

  test('seeds rows from the effective policy for the branch (BOM threshold override)', async () => {
    renderWith(<EnforcementMatrix branch="BOM" />);
    await waitFor(() => expect(screen.getByLabelText('Payment threshold')).toHaveValue(20000));
    // enforce inherits the group default (true) → the switch reads checked
    expect(screen.getByRole('switch', { name: /Enforce Payment/ })).toHaveAttribute('aria-checked', 'true');
  });

  test('OWNER: Apply saves the row LIVE via setVoucherPolicy(branch, category, patch)', async () => {
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<EnforcementMatrix branch="BOM" />);
    const thr = await screen.findByLabelText('Payment threshold');
    fireEvent.change(thr, { target: { value: '15000' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Apply$/ })[0]);
    await waitFor(() => expect(setVoucherPolicy).toHaveBeenCalledWith('BOM', 'payment', expect.objectContaining({ threshold: 15000, enforce: true })));
    expect(proposeVoucherPolicy).not.toHaveBeenCalled();
  });

  test('NON-owner: Apply PROPOSES via proposeVoucherPolicy', async () => {
    renderWith(<EnforcementMatrix branch="AMD" />);
    // toggle enforce on the Journal row then propose
    fireEvent.click(await screen.findByRole('switch', { name: /Enforce Journal/ }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Propose$/ })[1]);
    await waitFor(() => expect(proposeVoucherPolicy).toHaveBeenCalledWith('AMD', 'journal', expect.objectContaining({ enforce: true })));
    expect(setVoucherPolicy).not.toHaveBeenCalled();
  });

  test('renders the combined Booking (SO/PO/GP) row and a separate Inter-Branch (INB) row', async () => {
    getVoucherPolicy.mockResolvedValue({
      categories: [{ key: 'booking', label: 'Booking (SO/PO/GP)' }, { key: 'inb', label: 'Inter-Branch (INB)' }],
      defaults: { enforce: false, threshold: 0, effectiveDate: '' },
      store: { default: {}, branches: {} },
      effective: {},
    });
    renderWith(<EnforcementMatrix branch="BOM" />);
    expect(await screen.findByText('Booking (SO/PO/GP)')).toBeInTheDocument();
    expect(screen.getByText('Inter-Branch (INB)')).toBeInTheDocument();
  });

  test('rejects a negative threshold before saving', async () => {
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<EnforcementMatrix branch="default" />);
    const thr = await screen.findByLabelText('Payment threshold');
    fireEvent.change(thr, { target: { value: '-1' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Apply$/ })[0]);
    expect(await screen.findByRole('status')).toHaveTextContent(/valid amount/i);
    expect(setVoucherPolicy).not.toHaveBeenCalled();
  });
});
