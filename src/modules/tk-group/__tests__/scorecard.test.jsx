import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { scorecardRow, fyRange } from '../utils/scorecard';

// BranchScorecard hits accounting endpoints via core/api (import.meta) → mock it.
jest.mock('../../../core/api', () => ({ apiGet: jest.fn().mockResolvedValue({ rows: [] }) }));
// eslint-disable-next-line import/first
import { BranchScorecard } from '../BranchScorecard';

describe('scorecard utils', () => {
  test('scorecardRow: sales from invoice rows, GP/NP from P&L, branchwise', () => {
    const row = scorecardRow(
      { code: 'BOM', currency: 'INR', city: 'Mumbai' },
      { grossProfit: 3000, netProfit: 1000 },
      { rows: [{ sale: 5000 }, { sale: 5000 }] },
    );
    expect(row).toMatchObject({ code: 'BOM', cur: '₹', sales: 10000, gp: 3000, np: 1000, bookings: 2, gpPct: 30 });
  });

  test('missing data → zeros, never NaN', () => {
    expect(scorecardRow({ code: 'X' }, null, null)).toMatchObject({ sales: 0, gp: 0, np: 0, bookings: 0, gpPct: 0 });
  });

  test('fyRange returns an Apr–Mar window (local components)', () => {
    expect(fyRange(new Date(2026, 6, 10))).toEqual({ from: '2026-04-01', to: '2026-07-10' }); // July → FY starts Apr 2026
    expect(fyRange(new Date(2026, 1, 10)).from).toBe('2025-04-01');                            // Feb → FY started Apr 2025
  });
});

describe('BranchScorecard', () => {
  test('renders a branchwise row per branch and states it is not consolidated', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><BranchScorecard /></QueryClientProvider>);
    const table = await screen.findByTestId('tk-scorecard');
    expect(table.textContent).toMatch(/BOM/);   // branches present, side by side
    expect(table.textContent).toMatch(/FBM/);
    expect(screen.getByText(/never consolidated/i)).toBeInTheDocument();
    expect(screen.getByText(/No group total by design/i)).toBeInTheDocument();
  });
});
