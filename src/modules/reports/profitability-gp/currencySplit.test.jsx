// D2 — consolidated (ALL) view currency split. When the analytics response carries a
// non-empty `byCurrency`, the profitability reports must render India (₹) and Africa ($)
// subtotals SEPARATELY (each in its own symbol), never one blended figure. Single-branch
// responses omit `byCurrency` and render exactly as before (covered by reportRowDrill).
jest.mock('recharts', () => {
  const React = require('react');
  const Pass = ({ children }) => React.createElement('div', null, children);
  const Null = () => null;
  return { ResponsiveContainer: Pass, BarChart: Pass, Bar: Null, Line: Null, XAxis: Null, YAxis: Null, CartesianGrid: Null, Tooltip: Null, Legend: Null };
});

const INR_USD_YIELD = {
  rows: [{ destination: 'Dubai', bookings: 2, revenue: 1000, cost: 600, gp: 400, gpPct: 40 }],
  byCurrency: [
    { currency: 'INR', symbol: '₹', totals: { bookings: 2, revenue: 200000, cost: 120000, gp: 80000, gpPct: 40 }, rows: [{ destination: 'Mumbai Dep', bookings: 2, revenue: 200000, cost: 120000, gp: 80000, gpPct: 40 }] },
    { currency: 'USD', symbol: '$', totals: { bookings: 1, revenue: 5000, cost: 3000, gp: 2000, gpPct: 40 }, rows: [{ destination: 'Nairobi Dep', bookings: 1, revenue: 5000, cost: 3000, gp: 2000, gpPct: 40 }] },
  ],
};
const INR_USD_LTV = {
  rows: [{ name: 'Acme', firstBooking: '2026-01', lastBooking: '2026-06', totalBookings: 3, ltv: 600, avgBasket: 200, monthsActive: 6, recencyDays: 10 }],
  byCurrency: [
    { currency: 'INR', symbol: '₹', totals: { customers: 1, ltv: 500000, bookings: 4 }, rows: [{ name: 'Mumbai Traders', firstBooking: '2026-01', lastBooking: '2026-06', totalBookings: 4, ltv: 500000, avgBasket: 125000, monthsActive: 6, recencyDays: 12 }] },
    { currency: 'USD', symbol: '$', totals: { customers: 1, ltv: 8000, bookings: 2 }, rows: [{ name: 'Nairobi Safaris', firstBooking: '2026-02', lastBooking: '2026-05', totalBookings: 2, ltv: 8000, avgBasket: 4000, monthsActive: 3, recencyDays: 20 }] },
  ],
};
const INR_USD_ABC = {
  rows: [{ name: 'Acme', value: 600, share: 100, cumPct: 100, class: 'A' }],
  classes: { A: { count: 1, value: 600, share: 100 }, B: { count: 0, value: 0, share: 0 }, C: { count: 0, value: 0, share: 0 } },
  byCurrency: [
    { currency: 'INR', symbol: '₹', total: 500000, classes: { A: { count: 1, value: 400000, share: 80 }, B: { count: 1, value: 75000, share: 15 }, C: { count: 1, value: 25000, share: 5 } }, rows: [{ name: 'Mumbai Traders', value: 400000, share: 80, cumPct: 80, class: 'A' }] },
    { currency: 'USD', symbol: '$', total: 8000, classes: { A: { count: 1, value: 6400, share: 80 }, B: { count: 0, value: 0, share: 0 }, C: { count: 0, value: 0, share: 0 } }, rows: [{ name: 'Nairobi Safaris', value: 6400, share: 80, cumPct: 80, class: 'A' }] },
  ],
};

const mkQ = (data) => ({ data, isLoading: false, isError: false });
const mockYield = jest.fn(() => mkQ({}));
const mockLtv = jest.fn(() => mkQ({}));
const mockAbc = jest.fn(() => mkQ({}));
jest.mock('../../../core/useAccounting', () => ({
  useYieldByDestination: (...a) => mockYield(...a),
  useCustomerLtv: (...a) => mockLtv(...a),
  useAbcAnalysis: (...a) => mockAbc(...a),
  branchCode: (b) => (b && b.code) || b || null,
}));
// core/api reads import.meta.env (ESM) — stub it so the transitive reportDateBar → period
// import chain doesn't evaluate it under Jest's CJS transform.
jest.mock('../../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));

import { render, screen } from '@testing-library/react';
import { RPT_YieldDestination } from './yieldDestination';
import { RPT_CustomerLTV } from './customerLtv';
import { RPT_ABCAnalysis } from './abcAnalysis';

afterEach(() => jest.clearAllMocks());

describe('D2 consolidated currency split — profitability reports', () => {
  test('Yield by Destination shows ₹ (India) and $ (Africa) blocks', () => {
    mockYield.mockReturnValue(mkQ(INR_USD_YIELD));
    render(<RPT_YieldDestination branch={'ALL'} />);
    expect(screen.getByText('(India)')).toBeInTheDocument();
    expect(screen.getByText('(Africa)')).toBeInTheDocument();
    // each currency renders its OWN rows (never a blended one), each labelled once.
    expect(screen.getByText('Mumbai Dep')).toBeInTheDocument();
    expect(screen.getByText('Nairobi Dep')).toBeInTheDocument();
    // two "Total Revenue" tiles — one per currency block, not a single blended figure.
    expect(screen.getAllByText('Total Revenue')).toHaveLength(2);
  });

  test('Customer LTV shows per-currency subtotals + grouped rows', () => {
    mockLtv.mockReturnValue(mkQ(INR_USD_LTV));
    render(<RPT_CustomerLTV branch={'ALL'} />);
    expect(screen.getByText('(India)')).toBeInTheDocument();
    expect(screen.getByText('(Africa)')).toBeInTheDocument();
    expect(screen.getByText('Mumbai Traders')).toBeInTheDocument();
    expect(screen.getByText('Nairobi Safaris')).toBeInTheDocument();
  });

  test('ABC Analysis shows per-currency class cards + tables', () => {
    mockAbc.mockReturnValue(mkQ(INR_USD_ABC));
    render(<RPT_ABCAnalysis branch={'ALL'} />);
    expect(screen.getByText('(India)')).toBeInTheDocument();
    expect(screen.getByText('(Africa)')).toBeInTheDocument();
    expect(screen.getByText('Mumbai Traders')).toBeInTheDocument();
    expect(screen.getByText('Nairobi Safaris')).toBeInTheDocument();
    // Class A card renders in BOTH currency blocks.
    expect(screen.getAllByText('CLASS A')).toHaveLength(2);
  });
});
