// ⑥ Targets & Value — attainment bars (sales/GP/collections + budget) and top customers.
jest.mock('../../../core/useAccounting', () => ({
  useTargetsVsActual: jest.fn(),
  useBudgetVsActual: jest.fn(),
  useCustomerLtv: jest.fn(),
}));
jest.mock('../../../core/period', () => ({ fyStartMonth: () => 3 })); // April FY start

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TargetsPanel } from '../components/shared/TargetsPanel';
import { TopCustomersPanel } from '../components/shared/TopCustomersPanel';
import { useTargetsVsActual, useBudgetVsActual, useCustomerLtv } from '../../../core/useAccounting';

afterEach(() => jest.clearAllMocks());
const money = (n) => `₹${Math.round(n)}`;

describe('TargetsPanel', () => {
  test('renders attainment per metric and a no-target state', () => {
    useTargetsVsActual.mockImplementation((_b, metric) => {
      const totals = {
        sales: { actual: 800, target: 1000 },        // 80%
        gp: { actual: 0, target: 0 },                // no target
        collections: { actual: 500, target: 400 },   // 125%
      }[metric];
      return { data: { totals } };
    });
    useBudgetVsActual.mockReturnValue({ data: { totals: { actual: 120, budget: 100 } } }); // over budget
    render(<TargetsPanel branch={'BOM'} range={{ from: '2025-04-01', to: '2026-03-31' }} formatMoney={money} onView={jest.fn()} />);
    expect(screen.getByText('Sales vs Target')).toBeInTheDocument();
    expect(screen.getByText(/80%/)).toBeInTheDocument();
    expect(screen.getByText(/125%/)).toBeInTheDocument();
    expect(screen.getByText('no target set')).toBeInTheDocument(); // GP has no target
    expect(screen.getByText('🎯 Targets', { exact: false })).toBeInTheDocument();
  });
});

describe('TopCustomersPanel', () => {
  test('lists top customers, derives ABC class from cumulative share, and drills', () => {
    // No `class` field from the endpoint — the panel derives it from cumulative LTV
    // share (A ≤80%, B ≤95%, C tail). Total = 1,000,000 → cum 700k=70% (A), 1,000k=100% (C).
    useCustomerLtv.mockReturnValue({
      data: {
        totals: { customers: 42, ltv: 1000000 },
        rows: [
          { name: 'Globe Travels', ltv: 700000, gpPct: 12 },
          { name: 'Sky Holidays', ltv: 300000, gpPct: 9 },
        ],
      },
    });
    const onView = jest.fn();
    render(<TopCustomersPanel branch={'BOM'} range={{ from: 'a', to: 'b' }} formatMoney={money} onView={onView} />);
    expect(screen.getByText('Globe Travels')).toBeInTheDocument();
    expect(screen.getByText('12% GP')).toBeInTheDocument();
    expect(screen.getByTitle('Class A')).toBeInTheDocument(); // derived
    expect(screen.getByTitle('Class C')).toBeInTheDocument(); // derived
    expect(screen.getByText('⭐ Top Customers', { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByText('View →'));
    expect(onView).toHaveBeenCalled();
  });

  test('shows empty state with no customers', () => {
    useCustomerLtv.mockReturnValue({ data: { rows: [] }, isLoading: false });
    render(<TopCustomersPanel branch={'BOM'} range={{}} formatMoney={money} />);
    expect(screen.getByText(/No customer activity/)).toBeInTheDocument();
  });
});
