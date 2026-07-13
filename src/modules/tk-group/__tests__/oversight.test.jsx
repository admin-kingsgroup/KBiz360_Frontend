import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { branchExceptions, riskScore } from '../utils/exceptions';

// Both dashboards hit endpoints via core/api / api/monitor → mock them.
jest.mock('../../../core/api', () => ({ apiGet: jest.fn().mockResolvedValue({ rows: [] }) }));
jest.mock('../api/monitor', () => ({ getBranchCockpit: jest.fn().mockResolvedValue({ items: [
  { branch: 'BOM', pendingDecisions: 2, pendingGovernance: 1, lockedPeriods: ['2026-06'] },
  { branch: 'AMD', pendingDecisions: 0, pendingGovernance: 0, lockedPeriods: [] },
] }) }));
// eslint-disable-next-line import/first
import { ExceptionsRisk } from '../performance-oversight/ExceptionsRisk';
// eslint-disable-next-line import/first
import { ComplianceClose } from '../performance-oversight/ComplianceClose';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('exceptions utils', () => {
  test('flags net loss (high), thin margin + no bookings (watch)', () => {
    expect(branchExceptions({ np: -100, sales: 1000, gpPct: 8, bookings: 3 })).toEqual(
      expect.arrayContaining([{ sev: 'high', label: 'Net loss' }, { sev: 'med', label: 'Thin margin (8%)' }]),
    );
    expect(branchExceptions({ np: 500, sales: 1000, gpPct: 20, bookings: 0 })).toEqual([{ sev: 'med', label: 'No bookings' }]);
    expect(branchExceptions({ np: 500, sales: 1000, gpPct: 20, bookings: 5 })).toEqual([]);
  });
  test('riskScore ranks high above med', () => {
    expect(riskScore([{ sev: 'high' }])).toBeGreaterThan(riskScore([{ sev: 'med' }]));
  });
});

describe('ExceptionsRisk', () => {
  test('renders a branchwise table and states it is not consolidated', async () => {
    renderWith(<ExceptionsRisk />);
    const table = await screen.findByTestId('tk-exceptions');
    expect(table.textContent).toMatch(/BOM/);
    expect(screen.getByText(/never consolidated/i)).toBeInTheDocument();
  });
});

describe('ComplianceClose', () => {
  test('shows per-branch lock + pending status branchwise', async () => {
    renderWith(<ComplianceClose />);
    const table = await screen.findByTestId('tk-compliance');
    expect(await screen.findByText(/Locked · 2026-06/)).toBeInTheDocument();  // BOM locked
    expect(table.textContent).toMatch(/AMD/);
    expect(screen.getByText(/3 to clear/)).toBeInTheDocument();               // BOM 2+1 pending
    expect(screen.getByText('Clear')).toBeInTheDocument();                    // AMD clear
  });
});
