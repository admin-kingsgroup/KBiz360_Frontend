import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { perfTargetRow, fyStr } from '../utils/perfTarget';
import { investmentRow } from '../utils/investment';

jest.mock('../../../core/api', () => ({ apiGet: jest.fn().mockResolvedValue({}) }));
// eslint-disable-next-line import/first
import { PerformanceTargets } from '../PerformanceTargets';
// eslint-disable-next-line import/first
import { InvestmentDashboard } from '../InvestmentDashboard';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('perfTarget utils', () => {
  test('perfTargetRow computes achievement + variance branchwise', () => {
    const r = perfTargetRow({ code: 'BOM', currency: 'INR' }, { target: 1000, actual: 900 });
    expect(r).toMatchObject({ code: 'BOM', cur: 'INR', target: 1000, actual: 900, variance: -100, achievement: 90 });
  });
  test('no target → achievement 0, never divide-by-zero', () => {
    expect(perfTargetRow({ code: 'X' }, {})).toMatchObject({ target: 0, achievement: 0 });
  });
  test('fyStr formats like 2026-27', () => {
    expect(fyStr(new Date(2026, 6, 1))).toBe('2026-27');
    expect(fyStr(new Date(2026, 1, 1))).toBe('2025-26');
  });
});

describe('investment utils', () => {
  test('investmentRow pulls capital fields, defensive to missing', () => {
    expect(investmentRow({ code: 'BOM', currency: 'INR' }, { capitalInvested: 5000, investments: 2000, loans: 1000, capitalEmployed: 8000, profit: 500 }))
      .toMatchObject({ capitalInvested: 5000, investments: 2000, loans: 1000, capitalEmployed: 8000, profit: 500 });
    expect(investmentRow({ code: 'X' }, null)).toMatchObject({ capitalInvested: 0, profit: 0 });
  });
});

describe('branchwise dashboards render', () => {
  test('Performance vs Target renders branchwise, not consolidated', async () => {
    renderWith(<PerformanceTargets />);
    const table = await screen.findByTestId('tk-perf-target');
    expect(table.textContent).toMatch(/BOM/);
    expect(screen.getByText(/never consolidated/i)).toBeInTheDocument();
  });
  test('Investment renders branchwise, not consolidated', async () => {
    renderWith(<InvestmentDashboard />);
    const table = await screen.findByTestId('tk-investment');
    expect(table.textContent).toMatch(/BOM/);
    expect(screen.getAllByText(/never consolidated/i).length).toBeGreaterThan(0);
  });
});
