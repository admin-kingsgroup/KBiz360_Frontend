// Sr-FM panels: PeriodCloseTable shows ONE honest indicator (not the old 3 fake TB/Recon/
// Approve columns driven by a single boolean); BankBalancesPanel + VarianceFlagsPanel render
// amounts via the branch-aware formatMoney (no raw "/1000 K", no dead acctNo / % of limit).
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PeriodCloseTable } from '../components/tables/PeriodCloseTable';
import { BankBalancesPanel } from '../components/shared/BankBalancesPanel';
import { VarianceFlagsPanel } from '../components/shared/VarianceFlagsPanel';

const money = (n) => `$${Math.round(Number(n) || 0)}`;

describe('PeriodCloseTable', () => {
  test('collapses to Branch / Entries Posted / Status (no fake TB/Recon/Approve columns)', () => {
    render(<PeriodCloseTable rows={[{ branch: 'BOM', tbClosed: true, reconciled: true, approved: true, status: 'Closed' }]} />);
    expect(screen.getByText('Entries Posted')).toBeInTheDocument();
    expect(screen.getByText('✓ All posted')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.queryByText('TB')).toBeNull();
    expect(screen.queryByText('Recon')).toBeNull();
    expect(screen.queryByText('Approve')).toBeNull();
  });
});

describe('BankBalancesPanel', () => {
  test('renders the balance via formatMoney (branch currency), no /1000K and no dead acctNo/limit', () => {
    render(<BankBalancesPanel accounts={[{ id: '1', bank: 'KCB', branch: 'NBO', openingBal: 500000 }]} formatMoney={money} />);
    expect(screen.getByText('$500000')).toBeInTheDocument();
    expect(screen.queryByText(/% of limit/)).toBeNull();
    expect(screen.queryByText(/\.\.\./)).toBeNull();   // no "...{acctNo}" line
  });
});

describe('VarianceFlagsPanel', () => {
  test('shows the overrun amount via formatMoney, not raw /1000K', () => {
    render(<VarianceFlagsPanel flags={[{ account: 'Travel', variance: 50000, pct: 20, branch: 'NBO', date: '2026-06-30' }]} formatMoney={money} />);
    expect(screen.getByText(/\$50000 over budget/)).toBeInTheDocument();
    expect(screen.queryByText(/50K/)).toBeNull();
  });
});
