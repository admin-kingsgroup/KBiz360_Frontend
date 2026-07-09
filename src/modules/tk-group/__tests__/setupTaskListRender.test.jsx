import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Render smoke test for the Task List tab: proves the FE↔BE wiring contract
// (payload shape → tables/pills/KPIs), the branch/user scoping interactions,
// and the Complete → deep-link, without a real backend.
const PAYLOAD = {
  generatedAt: '2026-07-09T12:00:00.000Z',
  branches: ['BOM', 'BOMMB', 'AMD', 'NBO', 'DAR', 'FBM'],
  assignees: ['FM', 'Developer', 'Owner'],
  tasks: [
    { id: 'credit-facilities', branch: 'Central', assignee: 'FM', label: 'Credit Facilities & Limits', section: 'Finance config', link: '/masters/credit-facilities', check: 'creditfacilities = 0', remark: 'Enter every credit line.', status: 'pending' },
    { id: 'opening-balances-BOM', branch: 'BOM', assignee: 'FM', label: 'Opening Balances — BOM', section: 'Chart & Codes', link: '/masters/ledgers', check: '0 / 34 ledgers set', remark: 'Enter from cut-off TB.', status: 'pending' },
    { id: 'voucher-types', branch: 'Central', assignee: 'FM', label: 'Voucher Types', section: 'Numbering & Docs', link: '/masters/voucher-types', check: 'vouchertypes = 8', remark: 'Seeded.', status: 'done' },
    { id: 'policy-guard', branch: 'Central', assignee: 'Owner', label: 'Policy-guard go-live', section: 'Governance', link: '/tk/controls', check: "tkflags['core.policy_guard'] = off", remark: 'Dual-approve.', status: 'pending' },
  ],
  summary: { pending: 3, done: 1, total: 4, byAssignee: {} },
  ledgers: {
    byBranch: [
      { branch: 'BOM', pending: 34, total: 34, entered: 0 },
      { branch: 'BOMMB', pending: 34, total: 34, entered: 0 },
      { branch: 'AMD', pending: 34, total: 34, entered: 0 },
      { branch: 'NBO', pending: 34, total: 34, entered: 0 },
      { branch: 'DAR', pending: 34, total: 34, entered: 0 },
      { branch: 'FBM', pending: 34, total: 34, entered: 0 },
    ],
    branch: null,
    items: [],
    capped: false,
  },
  parties: {
    customers: { total: 2, incomplete: 1, capped: false, items: [
      { name: 'NeuIQ Technologies Private Limited', branch: 'BOM', missing: ['Credit limit', 'GST treatment'] },
    ] },
    suppliers: { total: 90, incomplete: 1, capped: false, items: [
      { name: 'IATA-BSP [Stock]', branch: 'BOM', missing: ['Contact (phone/email)'] },
    ] },
    employees: { total: 3, incomplete: 1, capped: false, items: [
      { name: 'Half Entered', branch: 'BOM', missing: ['Designation', 'Basic salary'] },
    ] },
  },
};

const BOM_PAYLOAD = {
  ...PAYLOAD,
  ledgers: { ...PAYLOAD.ledgers, branch: 'BOM', items: [
    { code: 'L1156', name: 'Round Off', group: 'Variable Expenses', subGroup: 'Office Expenses' },
  ] },
};

const mockGetSetupTasks = jest.fn();
jest.mock('../api/monitor', () => ({
  getSetupTasks: (...a) => mockGetSetupTasks(...a),
  getDevFindings: jest.fn().mockResolvedValue([]),
}));
// eslint-disable-next-line import/first
import { SetupTaskList } from '../SetupTaskList';
// eslint-disable-next-line import/first
import { ALL_ITEMS, isCleared } from '../../devControl/registry';

function renderWith(ui, setRoute) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><SetupTaskList setRoute={setRoute} /></QueryClientProvider>);
}

describe('SetupTaskList render (wiring smoke)', () => {
  const openDev = ALL_ITEMS.filter((i) => !isCleared(i, undefined)).length;
  beforeEach(() => {
    mockGetSetupTasks.mockImplementation(async (branch) => (branch === 'BOM' ? BOM_PAYLOAD : PAYLOAD));
  });

  test('renders KPI tiles, branch + user bars, and both task tables from the payload', async () => {
    renderWith();
    // Await loaded data (not just the shell) before asserting the bars/tables.
    expect(await screen.findByText('Credit Facilities & Limits')).toBeInTheDocument();
    // Branch sub-selector present with Central pill + all six branches
    ['ALL', 'Central', 'BOM', 'BOMMB', 'AMD', 'NBO', 'DAR', 'FBM'].forEach((b) => {
      expect(screen.getByTestId(`tk-tasks-branch-${b}`)).toBeInTheDocument();
    });
    // User pills name the actual people
    expect(screen.getByTestId('tk-tasks-user-FM').textContent).toContain('FM · Faiz');
    expect(screen.getByTestId('tk-tasks-user-Owner').textContent).toContain('Owner · Afshin');
    // Pending table: 3 config pending + every open dev-registry finding
    expect(screen.getByText(`To configure (${3 + openDev})`)).toBeInTheDocument();
    expect(screen.getByText('Configured — moved here automatically (1)')).toBeInTheDocument();
    expect(screen.getByText('Voucher Types')).toBeInTheDocument(); // in the done table
    // Party completeness drill renders with exact missing details
    expect(screen.getByText('NeuIQ Technologies Private Limited')).toBeInTheDocument();
    expect(screen.getByText('Credit limit · GST treatment')).toBeInTheDocument();
    // Staff completeness drill renders too
    expect(screen.getByText('Employees with missing details (1)')).toBeInTheDocument();
    expect(screen.getByText('Designation · Basic salary')).toBeInTheDocument();
    // Ledger cards mode at ALL scope — six per-branch cards
    expect(screen.getByTestId('tk-tasks-ledgercards')).toBeInTheDocument();
  });

  test('branch drill-in: BOM pill refetches with branch and lists its pending ledgers only', async () => {
    renderWith();
    await screen.findByText('Credit Facilities & Limits');
    fireEvent.click(screen.getByTestId('tk-tasks-branch-BOM'));
    // Ledger drill table replaces the cards, fed by the branch-scoped fetch
    expect(await screen.findByText(/Ledgers awaiting opening balance · BOM/)).toBeInTheDocument();
    expect(await screen.findByText('Round Off')).toBeInTheDocument();
    expect(mockGetSetupTasks).toHaveBeenCalledWith('BOM');
    // Branchwise never mixes: Central-only config is not in the pending table
    expect(screen.queryByText('Credit Facilities & Limits')).not.toBeInTheDocument();
    expect(screen.getByText('Opening Balances — BOM')).toBeInTheDocument();
  });

  test('user scoping + Complete → deep-links through setRoute', async () => {
    const setRoute = jest.fn();
    renderWith(undefined, setRoute);
    await screen.findByText('Credit Facilities & Limits');
    // Scope to Owner: only the activation remains; party drill hides
    fireEvent.click(screen.getByTestId('tk-tasks-user-Owner'));
    expect(await screen.findByText(/To configure \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('Policy-guard go-live')).toBeInTheDocument();
    expect(screen.queryByText(/Party master completeness/)).not.toBeInTheDocument();
    // Complete → routes to the task's screen
    fireEvent.click(screen.getAllByText('Complete →')[0]);
    expect(setRoute).toHaveBeenCalledWith('/tk/controls');
  });
});
