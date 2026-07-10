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
    { id: 'suppliers-drill-BOM', branch: 'BOM', assignee: 'FM', label: 'BOM-scoped example task', section: 'Chart & Codes', link: '/masters/ledgers', check: 'example = 0', remark: 'Branch-scoped row.', status: 'pending' },
    { id: 'voucher-types', branch: 'Central', assignee: 'FM', label: 'Voucher Types', section: 'Numbering & Docs', link: '/masters/voucher-types', check: 'vouchertypes = 8', remark: 'Seeded.', status: 'done' },
    { id: 'policy-guard', branch: 'Central', assignee: 'Owner', label: 'Policy-guard go-live', section: 'Governance', link: '/tk/controls', check: "tkflags['core.policy_guard'] = off", remark: 'Dual-approve.', status: 'pending' },
  ],
  summary: { pending: 3, done: 1, total: 4, byAssignee: {} },
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
  coverage: {
    total: 75,
    byVia: { task: 41, scan: 13, system: 11, transactions: 4, 'manual-recon': 5, 'crm-side': 1 },
    modules: [
      { id: 'accounting', name: 'Core Accounting (journals)', head: 'Accounting & Ledgers', kind: 'op', via: 'scan' },
      { id: 'ledgers', name: 'Chart of Accounts / Ledgers', head: 'Accounting & Ledgers', kind: 'op', via: 'task' },
      { id: 'auth', name: 'Authentication', head: 'System · Config · Access', kind: 'sys', via: 'system' },
    ],
  },
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
    mockGetSetupTasks.mockClear();
    mockGetSetupTasks.mockResolvedValue(PAYLOAD);
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
    // Full-tree coverage proof renders — every sub-module accounted for
    expect(screen.getByText('Module scan coverage — 75/75 sub-modules accounted for')).toBeInTheDocument();
    const cov = screen.getByTestId('tk-tasks-coverage');
    expect(cov.textContent).toContain('Core Accounting (journals)');
    expect(cov.textContent).toContain('Authentication');
  });

  test('branch scoping is client-side: BOM pill filters tasks without mixing Central rows', async () => {
    renderWith();
    await screen.findByText('Credit Facilities & Limits');
    fireEvent.click(screen.getByTestId('tk-tasks-branch-BOM'));
    expect(await screen.findByText('BOM-scoped example task')).toBeInTheDocument();
    // Branchwise never mixes: Central-only config is not in the pending table
    expect(screen.queryByText('Credit Facilities & Limits')).not.toBeInTheDocument();
    // No opening-balance surface anywhere — full history imported, nothing to key in
    expect(screen.queryByText(/opening balance/i)).not.toBeInTheDocument();
    expect(mockGetSetupTasks).toHaveBeenCalledTimes(1); // one payload, no per-branch refetch
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
