// ⑤ Financial Position — Balance Sheet health + tax net, and Capital vs Investment.
jest.mock('../../../core/useAccounting', () => ({
  useBalanceSheet: jest.fn(),
  useTaxSummary: jest.fn(),
  useCapitalAnalysis: jest.fn(),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BalanceHealthPanel } from '../components/shared/BalanceHealthPanel';
import { CapitalPanel } from '../components/shared/CapitalPanel';
import { useBalanceSheet, useTaxSummary, useCapitalAnalysis } from '../../../core/useAccounting';

afterEach(() => jest.clearAllMocks());
const money = (n) => `₹${Math.round(n)}`;

describe('BalanceHealthPanel', () => {
  test('shows Balanced when assets = liabilities + equity', () => {
    useBalanceSheet.mockReturnValue({ data: { assets: [{ amount: 1000 }], liabilities: [{ amount: 600 }, { amount: 400 }] } });
    useTaxSummary.mockReturnValue({ data: { netPayable: 250 } });
    render(<BalanceHealthPanel branch={'BOM'} range={{ to: '2026-03-31' }} formatMoney={money} onView={jest.fn()} onViewTax={jest.fn()} />);
    expect(screen.getByText('✓ Balanced')).toBeInTheDocument();
    expect(screen.getByText('₹250')).toBeInTheDocument();
    expect(screen.getByText('payable')).toBeInTheDocument();
  });

  test('flags an out-of-balance sheet and a refundable tax', () => {
    useBalanceSheet.mockReturnValue({ data: { assets: [{ amount: 1000 }], liabilities: [{ amount: 940 }] } });
    useTaxSummary.mockReturnValue({ data: { netPayable: -75 } });
    render(<BalanceHealthPanel branch={'BOM'} range={{ to: '2026-03-31' }} formatMoney={money} />);
    expect(screen.getByText('⚠ Out of balance by ₹60')).toBeInTheDocument();
    expect(screen.getByText('refundable')).toBeInTheDocument();
  });
});

describe('CapitalPanel', () => {
  test('renders in-flow / blocked split and GP yield, and drills', () => {
    useCapitalAnalysis.mockReturnValue({
      data: { totals: { capitalInvested: 1000, capitalBlocked: 300, inflowCapital: 700, blockedPct: 30, inflowPct: 70, gpYield: 22.5 } },
    });
    const onView = jest.fn();
    render(<CapitalPanel branch={'BOM'} range={{ from: 'a', to: 'b' }} formatMoney={money} onView={onView} />);
    expect(screen.getByText(/capital employed/)).toBeInTheDocument();
    expect(screen.getByText('22.5%')).toBeInTheDocument();
    fireEvent.click(screen.getByText('View →'));
    expect(onView).toHaveBeenCalled();
  });

  test('shows empty state when nothing is posted', () => {
    useCapitalAnalysis.mockReturnValue({ data: { totals: {} }, isLoading: false });
    render(<CapitalPanel branch={'BOM'} range={{}} formatMoney={money} />);
    expect(screen.getByText(/No capital postings/)).toBeInTheDocument();
  });
});
