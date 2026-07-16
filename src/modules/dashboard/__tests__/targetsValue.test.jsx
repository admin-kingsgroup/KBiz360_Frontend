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

// D2 — consolidated (ALL) view: when a response carries a non-empty `byCurrency`, the
// panels split India (₹) and Africa ($) SEPARATELY instead of one blended figure.
describe('D2 consolidated currency split — shared panels', () => {
  test('TargetsPanel renders ₹ (India) and $ (Africa) attainment blocks', () => {
    useTargetsVsActual.mockReturnValue({ data: {
      totals: { actual: 800, target: 1000 },
      byCurrency: [
        { currency: 'INR', symbol: '₹', totals: { actual: 720000, target: 900000 } },
        { currency: 'USD', symbol: '$', totals: { actual: 16000, target: 20000 } },
      ],
    } });
    useBudgetVsActual.mockReturnValue({ data: {
      totals: { actual: 120, budget: 100 },
      byCurrency: [
        { currency: 'INR', symbol: '₹', totals: { actual: 810000, budget: 900000 } },
        { currency: 'USD', symbol: '$', totals: { actual: 22000, budget: 20000 } },
      ],
    } });
    render(<TargetsPanel branch={'ALL'} range={{ from: '2025-04-01', to: '2026-03-31' }} formatMoney={money} onView={jest.fn()} />);
    expect(screen.getByText('(India)')).toBeInTheDocument();
    expect(screen.getByText('(Africa)')).toBeInTheDocument();
    // Each currency block repeats the four metric bars → 2 "Sales vs Target" labels.
    expect(screen.getAllByText('Sales vs Target')).toHaveLength(2);
  });

  test('TopCustomersPanel splits customers per currency', () => {
    useCustomerLtv.mockReturnValue({ data: {
      totals: { customers: 2, ltv: 508000 },
      rows: [{ name: 'Mumbai Traders', ltv: 500000, gpPct: 16 }, { name: 'Nairobi Safaris', ltv: 8000, gpPct: 20 }],
      byCurrency: [
        { currency: 'INR', symbol: '₹', totals: { customers: 1, ltv: 500000 }, rows: [{ name: 'Mumbai Traders', ltv: 500000, gpPct: 16 }] },
        { currency: 'USD', symbol: '$', totals: { customers: 1, ltv: 8000 }, rows: [{ name: 'Nairobi Safaris', ltv: 8000, gpPct: 20 }] },
      ],
    } });
    render(<TopCustomersPanel branch={'ALL'} range={{ from: 'a', to: 'b' }} formatMoney={money} />);
    expect(screen.getByText('(India) · 1 total')).toBeInTheDocument();
    expect(screen.getByText('(Africa) · 1 total')).toBeInTheDocument();
    expect(screen.getByText('Mumbai Traders')).toBeInTheDocument();
    expect(screen.getByText('Nairobi Safaris')).toBeInTheDocument();
  });
});
