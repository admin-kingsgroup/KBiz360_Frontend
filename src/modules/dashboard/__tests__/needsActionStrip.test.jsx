// ② Needs-Action strip — renders a chip per outstanding item and drills to the
// right screen; shows an "all clear" line when nothing is pending.
jest.mock('../../../core/useAccounting', () => ({
  useAlerts: jest.fn(),
  useVoucherApprovals: jest.fn(),
  useBookingOrders: jest.fn(),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NeedsActionStrip } from '../components/shared/NeedsActionStrip';
import { useAlerts, useVoucherApprovals, useBookingOrders } from '../../../core/useAccounting';

const mockHooks = ({ alerts = [], pending = { n: 0, amount: 0 }, bookings = [] }) => {
  useAlerts.mockReturnValue({ data: { alerts } });
  useVoucherApprovals.mockReturnValue({ data: { counts: { pending } } });
  useBookingOrders.mockReturnValue({ data: bookings });
};
afterEach(() => jest.clearAllMocks());

describe('NeedsActionStrip', () => {
  test('renders a chip per outstanding item and drills on click', () => {
    mockHooks({
      alerts: [{ severity: 'error' }, { severity: 'error' }, { severity: 'warn' }, { severity: 'info' }],
      pending: { n: 9, amount: 640000 },
      bookings: [{ id: 'b1' }, { id: 'b2' }],
    });
    const navigate = jest.fn();
    render(<NeedsActionStrip branch={'BOM'} navigate={navigate} formatMoney={(n) => `₹${n}`} />);

    expect(screen.getByText('2 critical alerts')).toBeInTheDocument();
    expect(screen.getByText('1 warning')).toBeInTheDocument();
    expect(screen.getByText('9 approvals pending · ₹640000')).toBeInTheDocument();
    expect(screen.getByText('2 SO/PO/GP pending')).toBeInTheDocument();

    fireEvent.click(screen.getByText('2 critical alerts'));
    expect(navigate).toHaveBeenCalledWith('/dashboard/alerts');
    fireEvent.click(screen.getByText('9 approvals pending · ₹640000'));
    expect(navigate).toHaveBeenCalledWith('/transactions/voucher-approvals');
    fireEvent.click(screen.getByText('2 SO/PO/GP pending'));
    expect(navigate).toHaveBeenCalledWith('/transactions/approvals');
  });

  test('shows the all-clear line when nothing is pending', () => {
    mockHooks({});
    render(<NeedsActionStrip branch={'BOM'} navigate={jest.fn()} />);
    expect(screen.getByText(/All clear/i)).toBeInTheDocument();
  });

  test('singularises a single approval and omits zero-count chips', () => {
    mockHooks({ alerts: [{ severity: 'error' }], pending: { n: 1, amount: 1699 } });
    render(<NeedsActionStrip branch={'BOM'} navigate={jest.fn()} formatMoney={(n) => `₹${n}`} />);
    expect(screen.getByText('1 critical alert')).toBeInTheDocument();
    expect(screen.getByText('1 approval pending · ₹1699')).toBeInTheDocument();
    expect(screen.queryByText(/warning/)).toBeNull();
    expect(screen.queryByText(/SO\/PO\/GP/)).toBeNull();
  });
});
