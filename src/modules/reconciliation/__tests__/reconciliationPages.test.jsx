// Render smoke tests for the three Reconciliation pages — catches runtime JSX /
// prop / hook wiring that the production build cannot (build only proves the
// modules parse). The module API is mocked; react-query runs for real.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../api', () => ({
  getSummary: jest.fn(() => Promise.resolve({
    periods: { weekly: '2026-W28', month: '2026-07', quarter: 'FY2026-27-Q2', year: 'FY2026-27' },
    tiers: { weekly: { total: 2, signed: 1, locked: 0 }, month: { total: 0 }, quarter: { total: 0 }, year: { total: 0 } },
  })),
  getPending: jest.fn(() => Promise.resolve({
    rows: [
      { tier: 'year', period: 'FY2025-26', label: 'Year-End Closing — FY2025-26 (Apr 2025 – Mar 2026)', state: 'not-started', done: 0, total: 0 },
      { tier: 'month', period: '2026-04', label: 'Month-End Closing — April 2026', state: 'not-started', done: 0, total: 0 },
      { tier: 'weekly', period: '2026-W29', label: 'Weekly Reconciliation — 2026-W29', dueOn: '2026-07-17', upcoming: true, state: 'not-started', done: 0, total: 0 },
    ],
  })),
  getTree: jest.fn(() => Promise.resolve({
    period: '2026-W28',
    groups: [{ parentGroup: 'Current Assets', subGroups: [{ subGroup: 'Bank Accounts', items: [
      { _id: 'c1', branch: 'BOM', tier: 'weekly', period: '2026-W28', status: 'reconciled', signatures: [], exceptions: [], attachments: [], snapshot: { frozenAt: '2026-07-09', difference: 0 }, ledger: { name: 'ICICI Bank A/c', code: 'BOM-BNK-0001', parentGroup: 'Current Assets', subGroup: 'Bank Accounts' } },
    ] }] }],
  })),
  getList: jest.fn(() => Promise.resolve([
    { _id: 'c1', certNo: 'WK/BOM/2026-W28/B1', branch: 'BOM', tier: 'weekly', period: '2026-W28', status: 'open', signatures: [], attachments: [],
      exceptions: [{ _id: 'e1', text: 'Cheque unpresented 90+ days', resolved: false }],
      snapshot: { frozenAt: null }, ledger: { name: 'ICICI Bank A/c', code: 'B1', parentGroup: 'Current Assets', subGroup: 'Bank Accounts' } },
    { _id: 'c2', certNo: 'ME/BOM/2026-04/B1', branch: 'BOM', tier: 'month', period: '2026-04', status: 'open', signatures: [], attachments: [], exceptions: [],
      snapshot: { frozenAt: null }, ledger: { name: 'HDFC Bank A/c', code: 'B2', parentGroup: 'Current Assets', subGroup: 'Bank Accounts' } },
  ])),
  getRulebook: jest.fn(() => Promise.resolve({ periods: { weekly: '2026-W28', month: '2026-07', quarter: 'CY2026-Q3', year: 'CY2026' } })),
  getCertificate: jest.fn(() => Promise.resolve(null)),
  generateCertificates: jest.fn(() => Promise.resolve({ created: 3, total: 9 })),
  freezeSnapshot: jest.fn(), addAttachment: jest.fn(), addException: jest.fn(),
  resolveException: jest.fn(), signCertificate: jest.fn(), attachScan: jest.fn(),
}));

import { ReconciliationHub } from '../ReconciliationHub';
import { ReconReportsPage } from '../ReconReportsPage';
import { RuleBookPage } from '../RuleBookPage';
import { getRulebook } from '../api';

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

describe('ReconciliationHub · render (tier-locked pages — the menu is the tier switch)', () => {
  test('weekly page: this tier\'s card ONLY + the grouped ledger register', async () => {
    wrap(<ReconciliationHub branch="BOM" tier="weekly" setRoute={() => {}} currentUser={{ role: 'Super Admin' }} />);
    expect(await screen.findByText('Weekly Reconciliation')).toBeInTheDocument(); // page title
    expect(screen.getByText('Weekly')).toBeInTheDocument();                   // the tier progress card
    expect(screen.queryByText('Month-End')).not.toBeInTheDocument();          // other tiers live on their own pages
    expect(screen.queryByText('Quarterly')).not.toBeInTheDocument();
    expect(screen.queryByText('Year-End')).not.toBeInTheDocument();
    expect(await screen.findByText('ICICI Bank A/c')).toBeInTheDocument();   // register row
    expect(screen.getByText('Current Assets')).toBeInTheDocument();          // parent group band
    expect(screen.getByText('Bank Accounts')).toBeInTheDocument();           // sub-group band
  });

  test('monthly page: tier prop locks the page to Month-End (H1 matches the menu entry)', async () => {
    wrap(<ReconciliationHub branch="BOM" tier="month" setRoute={() => {}} currentUser={{ role: 'Super Admin' }} />);
    expect(await screen.findByText('Monthly Reconciliation')).toBeInTheDocument(); // same words the user clicked
    expect(screen.getByText('Month-End')).toBeInTheDocument();                     // the tier's formal name on the card
    expect(screen.queryByText('Weekly')).not.toBeInTheDocument();
  });

  test('branch prop as an OBJECT (the real app shape) selects that branch', async () => {
    wrap(<ReconciliationHub branch={{ code: 'AMD', city: 'Ahmedabad' }} tier="weekly" setRoute={() => {}} currentUser={{ role: 'Super Admin' }} />);
    const amdChip = await screen.findByRole('tab', { name: /AMD/ });
    expect(amdChip).toHaveAttribute('aria-selected', 'true');
  });

  test('Branch Accountant: weekly page works + the TK-Group note', async () => {
    wrap(<ReconciliationHub branch="BOM" tier="weekly" setRoute={() => {}} currentUser={{ role: 'Branch Accountant' }} />);
    expect(await screen.findByText('Weekly')).toBeInTheDocument();
    expect(screen.queryByText('Month-End')).not.toBeInTheDocument();
    expect(screen.getByText(/worked from TK Group Central/i)).toBeInTheDocument();
  });

  test('Branch Accountant on a central tier URL: guarded, not broken', async () => {
    wrap(<ReconciliationHub branch="BOM" tier="quarter" setRoute={() => {}} currentUser={{ role: 'Branch Accountant' }} />);
    expect(await screen.findByText('Central closing tier')).toBeInTheDocument();
    expect(screen.getByText(/WEEKLY cycle only/i)).toBeInTheDocument();
    expect(screen.queryByText('ICICI Bank A/c')).not.toBeInTheDocument();     // no register leaks
  });
});

describe('ReconReportsPage · render (one report per tier)', () => {
  test('Weekly Report: only weekly pending rows + weekly certs; upcoming Friday shown', async () => {
    wrap(<ReconReportsPage branch="BOM" tier="weekly" setRoute={() => {}} currentUser={{ role: 'Director' }} />);
    expect(await screen.findByText('Weekly Report')).toBeInTheDocument();     // page title
    expect(await screen.findByText(/Weekly Reconciliation — 2026-W29/)).toBeInTheDocument();
    expect(screen.queryByText(/Year-End Closing/)).not.toBeInTheDocument();   // other tiers live on their own reports
    expect(screen.queryByText(/Month-End Closing/)).not.toBeInTheDocument();
    expect(screen.getByText(/opens Fri/)).toBeInTheDocument();               // upcoming = no Generate button
    expect(await screen.findByText(/Cheque unpresented 90\+ days/)).toBeInTheDocument(); // open exceptions report
    // certNo appears in BOTH the register and the open-exceptions list
    expect(screen.getAllByText('WK/BOM/2026-W28/B1').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('ME/BOM/2026-04/B1')).not.toBeInTheDocument();  // month cert on the Monthly Report only
  });

  test('Yearly Report: only the year-end backlog row', async () => {
    wrap(<ReconReportsPage branch="BOM" tier="year" setRoute={() => {}} currentUser={{ role: 'Director' }} />);
    expect(await screen.findByText('Yearly Report')).toBeInTheDocument(); // H1 matches the menu entry
    expect(await screen.findByText(/Year-End Closing — FY2025-26/)).toBeInTheDocument();
    expect(screen.queryByText(/Weekly Reconciliation — 2026-W29/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Month-End Closing/)).not.toBeInTheDocument();
  });

  test('Branch Accountant: weekly report works; a central tier report is guarded', async () => {
    wrap(<ReconReportsPage branch="BOM" tier="weekly" setRoute={() => {}} currentUser={{ role: 'Branch Accountant' }} />);
    expect(await screen.findByText(/Weekly Reconciliation — 2026-W29/)).toBeInTheDocument();
    wrap(<ReconReportsPage branch="BOM" tier="year" setRoute={() => {}} currentUser={{ role: 'Branch Accountant' }} />);
    expect(await screen.findByText('Central closing tier')).toBeInTheDocument();
  });
});

describe('RuleBookPage · render', () => {
  test('renders tiers, roles, steps and the eight golden rules with branch-aware periods (object branch prop)', async () => {
    wrap(<RuleBookPage branch={{ code: 'NBO', city: 'Nairobi' }} setRoute={() => {}} />);
    expect(await screen.findByText('Reconciliation Rule Book')).toBeInTheDocument();
    expect(screen.getByText('1 · The four tiers')).toBeInTheDocument();
    expect(screen.getByText('2 · Roles — who does what')).toBeInTheDocument();
    expect(screen.getByText('4 · The eight golden rules')).toBeInTheDocument();
    expect(await screen.findByText('CY2026-Q3')).toBeInTheDocument();        // Africa regime period from API
    expect(getRulebook).toHaveBeenCalledWith({ branch: 'NBO' });             // branch passed through
    expect(screen.getByText('RULE 08')).toBeInTheDocument();
  });
});
