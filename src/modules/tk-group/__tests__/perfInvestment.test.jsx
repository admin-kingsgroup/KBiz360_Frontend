import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { perfTargetRow, fyStr } from '../utils/perfTarget';
import { investmentRow, fixFirstFlags } from '../utils/investment';

jest.mock('../../../core/api', () => ({ apiGet: jest.fn().mockResolvedValue({}) }));
// eslint-disable-next-line import/first
import { PerformanceTargets } from '../performance-oversight/PerformanceTargets';
// eslint-disable-next-line import/first
import { InvestmentDashboard } from '../performance-oversight/InvestmentDashboard';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('perfTarget utils', () => {
  test('perfTargetRow computes achievement + variance branchwise', () => {
    const r = perfTargetRow({ code: 'BOM', currency: 'INR' }, { totals: { target: 1000, actual: 900 } });
    expect(r).toMatchObject({ code: 'BOM', cur: '₹', target: 1000, actual: 900, variance: -100, achievement: 90 });
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
    // Real capital-analysis shape: scalars under `.totals`; the row remaps
    // capitalBlocked→investments, quasiCapital→loans, netProfit→profit.
    expect(investmentRow({ code: 'BOM', currency: 'INR' }, { totals: { capitalInvested: 5000, capitalBlocked: 2000, quasiCapital: 1000, capitalEmployed: 8000, netProfit: 500 } }))
      .toMatchObject({ capitalInvested: 5000, investments: 2000, loans: 1000, capitalEmployed: 8000, profit: 500 });
    expect(investmentRow({ code: 'X' }, null)).toMatchObject({ capitalInvested: 0, profit: 0 });
  });
  test('fixFirstFlags flags low ROI / high overdue / budget-over against configured limits', () => {
    const L = { investmentMinRoi: 1.5, investmentMaxOverduePct: 15, investmentMaxBudgetOverPct: 10 };
    expect(fixFirstFlags({ roi: 1.2, overduePct: 5, budgetOverPct: 2 }, L)).toEqual([expect.stringMatching(/ROI/)]);
    expect(fixFirstFlags({ roi: 2, overduePct: 20, budgetOverPct: 12 }, L)).toHaveLength(2);
    expect(fixFirstFlags({ roi: 2, overduePct: 5, budgetOverPct: 2 }, L)).toEqual([]); // clear
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
