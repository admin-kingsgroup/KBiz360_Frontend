// Pins the consolidated Cash-Flow Forecast: in ALL scope opening cash used to sum ₹ (India)
// + $ (Africa) into one figure. Now ALL renders one forecast PER BRANCH from tb.byBranch,
// each in its own currency; a single branch renders one forecast in its currency.
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('../../../../core/styles', () => ({ bc: (b) => ({ cur: b && b.code === 'DAR' ? '$' : '₹' }), btnG: {}, inp: {} }));
jest.mock('../../../../core/format', () => ({ fmt: (n) => String(n) }));
jest.mock('../../../../shell/primitives', () => ({ isViewOnly: () => false, VIEW_ONLY_REASON: 'view only' }));
jest.mock('../../../../core/ux/Menu', () => ({ Menu: () => <div /> }));
jest.mock('lucide-react', () => ({ ChevronDown: () => <span /> }));
jest.mock('../../../../core/useRegisters', () => ({
  useCrud: () => ({ rows: [], create: { mutate: jest.fn(), isPending: false }, remove: { mutate: jest.fn() } }),
}));
jest.mock('../../../../core/useAccounting', () => ({
  useTrialBalance: () => ({
    data: {
      rows: [{ group: 'Bank', closingDebit: 5000, closingCredit: 0 }], // used single-branch
      byBranch: [
        { branch: 'BOM', rows: [{ group: 'Bank', closingDebit: 3000, closingCredit: 0 }] },
        { branch: 'DAR', rows: [{ group: 'Bank', closingDebit: 5000, closingCredit: 0 }] },
      ],
    },
  }),
}));

// eslint-disable-next-line import/first
import { CashFlowForecast } from '../cashFlowForecast';

describe('CashFlowForecast — per-branch currency, no ₹+$ merge', () => {
  test('ALL scope renders per-branch forecasts (BOM opening ₹3000, DAR opening $5000)', () => {
    render(<CashFlowForecast branch="ALL" />);
    expect(screen.getAllByText('₹3000').length).toBeGreaterThan(0); // BOM opening cash
    expect(screen.getAllByText('$5000').length).toBeGreaterThan(0); // DAR opening cash
    // per-branch forecast body is present (not a pick-a-branch notice)
    expect(screen.getAllByText('Projected Close').length).toBeGreaterThan(0);
  });

  test('single branch renders one forecast in its currency', () => {
    render(<CashFlowForecast branch={{ code: 'BOM' }} />);
    expect(screen.getAllByText('Projected Close').length).toBe(1);
    expect(screen.getAllByText('₹5000').length).toBeGreaterThan(0); // opening cash in ₹
  });
});
