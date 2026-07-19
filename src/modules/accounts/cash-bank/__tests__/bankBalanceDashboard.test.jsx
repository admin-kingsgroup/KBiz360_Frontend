// Pins the consolidated Bank Balance Dashboard: in ALL scope it used to sum ₹ (India) + $
// (Africa) cash/bank into one "Total Liquid (INR)" figure. Now it renders each branch in
// its own currency from tb.byBranch — a $ branch shows $, a ₹ branch shows ₹, never merged.
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('../../../../core/styles', () => ({
  bc: (b) => ({ cur: b && b.code === 'DAR' ? '$' : '₹' }),
  RPT_thStyle: {}, RPT_tdStyle: {},
}));
jest.mock('../../../../core/format', () => ({ money: (n, cur) => `${cur}${Math.round(Number(n) || 0)}` }));
jest.mock('../../../../core/helpers', () => ({ cardStyle: {} }));
jest.mock('../../../../core/data', () => ({ BRANCH_CODES: ['BOM', 'AMD', 'DAR', 'FBM', 'NBO', 'BOMMB'] }));
jest.mock('../../../../shell/PHASE2_Page', () => ({ PHASE2_Page: ({ children, toolbar }) => <div>{toolbar}{children}</div> }));

const TB = {
  rows: [{ ledger: 'KCB Bank', group: 'Bank Accounts', closingDebit: 5000, closingCredit: 0 }], // used by single-branch
  byBranch: [
    { branch: 'BOM', rows: [{ ledger: 'HDFC', group: 'Bank Accounts', closingDebit: 3000, closingCredit: 0 }] },
    { branch: 'DAR', rows: [{ ledger: 'KCB Bank', group: 'Bank Accounts', closingDebit: 5000, closingCredit: 0 }] },
  ],
};
jest.mock('../../../../core/useAccounting', () => ({ useTrialBalance: () => ({ data: TB }) }));

// eslint-disable-next-line import/first
import { BankBalanceDashboard } from '../bankBalanceDashboard';

describe('BankBalanceDashboard — per-branch currency, no ₹+$ merge', () => {
  test('ALL scope: each branch in its own currency (₹ BOM and $ DAR), no merged INR total', () => {
    render(<BankBalanceDashboard branch="ALL" />);
    // BOM figures render in ₹ and DAR figures in $ within their own blocks — this is the
    // proof there is no cross-currency merge (a blend would collapse to a single symbol).
    // (Branch codes also appear in the toolbar <option>s, so assert on the unique amounts.)
    expect(screen.getAllByText('₹3000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$5000').length).toBeGreaterThan(0);
    // the old blended "Total Liquid (INR)" label is gone
    expect(screen.queryByText(/Total Liquid \(INR\)/)).toBeNull();
  });

  test('single Africa branch renders in $ (not ₹)', () => {
    render(<BankBalanceDashboard branch={{ code: 'DAR' }} />);
    expect(screen.getAllByText('$5000').length).toBeGreaterThan(0);
    expect(screen.queryByText('₹5000')).toBeNull();
  });
});
