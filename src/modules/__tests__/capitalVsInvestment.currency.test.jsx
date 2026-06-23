// Capital vs Investment must render in the branch's own currency — ₹ for India
// branches, $ for the USD branches (NBO / DAR / FBM). Regression for the old
// hardcoded-₹ bug that mislabelled African-branch figures.
jest.mock('../../core/period', () => ({ PeriodBar: () => null }));
jest.mock('../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})) }));
jest.mock('../../core/styleTokens', () => ({
  bc: (b) => ({ cur: (b && (b.code === 'NBO' || b.code === 'DAR' || b.code === 'FBM')) ? '$' : '₹' }),
}));

const DATA = {
  totals: { capitalInvested: 5000000, capitalBlocked: 1000000, inflowCapital: 4000000, grossProfit: 800000, grossRevenue: 6000000, gpYield: 20, gpMargin: 13.3, flowTurnover: 1.5, blockedPct: 20, inflowPct: 80, flowComposition: 4000000 },
  capital: [{ grp: 'Capital Account', src: 'bs', total: 5000000, ledgers: [{ n: 'Owner Capital', a: 5000000 }] }],
  blocked: [], flow: [], revenue: [],
};
jest.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: DATA, isLoading: false, error: null }) }));

import { render, screen } from '@testing-library/react';
import { CapitalVsInvestmentLive } from '../capitalVsInvestment';

test('India branch (BOM) renders ₹ figures', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'BOM' }} />);
  expect(screen.getAllByText(/₹/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/\$5/)).toBeNull();
});

test('USD branch (NBO) renders $ figures, not ₹', () => {
  render(<CapitalVsInvestmentLive branch={{ code: 'NBO' }} />);
  expect(screen.getAllByText(/\$/).length).toBeGreaterThan(0);
  // the owner-capital ledger amount must not carry a rupee sign
  expect(screen.getByText('Owner Capital').closest('tr')).toHaveTextContent('$');
});
