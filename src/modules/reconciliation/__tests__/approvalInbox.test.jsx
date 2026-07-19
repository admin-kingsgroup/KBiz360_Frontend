// TK Group Central · Approval Inbox — the role-routing (who a frozen cert waits
// on) and the "Waiting on me" filter, rendered end-to-end with a mocked inbox.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../api', () => ({
  getInbox: jest.fn(() => Promise.resolve({
    me: 'Senior Finance Manager',
    items: [
      { certId: 'a', branch: 'BOM', tier: 'weekly', period: '2026-W28', ledger: 'ICICI Bank A/c', code: 'B1', status: 'signed', difference: 0, waitingOn: 'FM', action: 'Approved', reopened: false },
      { certId: 'b', branch: 'AMD', tier: 'daily', period: '2026-07-15', ledger: 'HDFC Bank A/c', code: 'B2', status: 'reconciled', difference: 0, waitingOn: 'AE', action: 'Approved', reopened: false },
      { certId: 'c', branch: 'BOM', tier: 'month', period: '2026-06', ledger: 'Capital A/c', code: 'C1', status: 'signed', difference: 0, waitingOn: 'Owner', action: 'Locked', reopened: true },
    ],
    byBranch: [],
  })),
}));

import { ApprovalInbox, roleActs } from '../inbox/ApprovalInbox';

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

describe('reconciliation · Approval Inbox (TK Group Central)', () => {
  test('roleActs routes by chain role (Owner ≡ Super Admin; Owner covers a Director step — Rule 07 — and break-glasses the BA prepare step)', () => {
    expect(roleActs('Senior Finance Manager', 'FM')).toBe(true);
    expect(roleActs('Sr. Accounts Executive', 'AE')).toBe(true);
    expect(roleActs('Super Admin', 'Owner')).toBe(true);
    expect(roleActs('Super Admin', 'Director')).toBe(true);   // Rule 07 fallback
    expect(roleActs('Super Admin', 'Branch Accountant', 'month')).toBe(true);  // Owner break-glass — MONTH only
    expect(roleActs('Super Admin', 'Branch Accountant', 'weekly')).toBe(false); // not the soft daily/weekly branch step
    expect(roleActs('Branch Accountant', 'Branch Accountant', 'weekly')).toBe(true); // a real BA, any tier
    expect(roleActs('Senior Finance Manager', 'Branch Accountant', 'month')).toBe(false); // Owner-only break-glass
    expect(roleActs('Director', 'Owner')).toBe(false);
    expect(roleActs('Branch Accountant', 'AE')).toBe(false);
  });

  test('"Waiting on me" filters to the FM items only; the counts show the whole board', async () => {
    wrap(<ApprovalInbox branch="ALL" setRoute={() => {}} currentUser={{ role: 'Senior Finance Manager' }} />);
    expect(await screen.findByText('ICICI Bank A/c')).toBeInTheDocument(); // weekly BOM → waits on FM
    expect(screen.queryByText('HDFC Bank A/c')).not.toBeInTheDocument();   // daily AMD → waits on AE (hidden)
    expect(screen.queryByText('Capital A/c')).not.toBeInTheDocument();     // month BOM → waits on Owner (hidden)
    expect(screen.getByText('Waiting on me (1)')).toBeInTheDocument();
    expect(screen.getByText('All pending (3)')).toBeInTheDocument();
  });
});
