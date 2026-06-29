// ④ Cash & Working Capital — 13-week forecast summary + AR/AP ageing buckets.
jest.mock('../../../core/useAccounting', () => ({
  useCashForecast: jest.fn(),
  useAgeing: jest.fn(),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CashForecastPanel } from '../components/shared/CashForecastPanel';
import { AgeingPanel } from '../components/shared/AgeingPanel';
import { useCashForecast, useAgeing } from '../../../core/useAccounting';

afterEach(() => jest.clearAllMocks());
const money = (n) => `₹${Math.round(n)}`;

describe('CashForecastPanel', () => {
  test('summarises opening/in/out/closing and flags the low point', () => {
    useCashForecast.mockReturnValue({
      data: {
        opening: 100,
        rows: [
          { week: 'W1', inflow: 50, outflow: 20, closing: 130 },
          { week: 'W2', inflow: 10, outflow: 200, closing: -60 },
          { week: 'W3', inflow: 80, outflow: 10, closing: 10 },
        ],
      },
    });
    const onView = jest.fn();
    render(<CashForecastPanel branch={'BOM'} range={{ label: 'All' }} formatMoney={money} onView={onView} />);
    expect(screen.getByText('₹100')).toBeInTheDocument();   // opening
    expect(screen.getByText('₹140')).toBeInTheDocument();   // inflow 50+10+80
    expect(screen.getByText('₹230')).toBeInTheDocument();   // outflow 20+200+10
    expect(screen.getByText('₹10')).toBeInTheDocument();    // projected closing (last row)
    expect(screen.getByText(/Cash gap at W2/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('View →'));
    expect(onView).toHaveBeenCalled();
  });

  test('shows an empty state with no forecast rows', () => {
    useCashForecast.mockReturnValue({ data: { opening: 0, rows: [] }, isLoading: false });
    render(<CashForecastPanel branch={'BOM'} range={{ label: 'All' }} formatMoney={money} />);
    expect(screen.getByText(/No open invoices to project/)).toBeInTheDocument();
  });
});

describe('AgeingPanel', () => {
  test('renders AR and AP totals with bucket breakdown', () => {
    useAgeing.mockReturnValue({
      data: {
        receivables: { totals: { d0: 110, d30: 50, d60: 20, d90: 30, total: 210 } },
        payables: { totals: { d0: 45, d30: 0, d60: 0, d90: 10, total: 55 } },
      },
    });
    render(<AgeingPanel branch={'BOM'} formatMoney={money} onView={jest.fn()} />);
    expect(screen.getByText('Receivables (to collect)')).toBeInTheDocument();
    expect(screen.getByText('Payables (to pay)')).toBeInTheDocument();
    expect(screen.getByText('₹210')).toBeInTheDocument(); // AR total
    expect(screen.getByText('₹55')).toBeInTheDocument();  // AP total
  });
});
