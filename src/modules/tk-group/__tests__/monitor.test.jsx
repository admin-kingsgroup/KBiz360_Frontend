import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { overviewKpis, streamRows, actorName } from '../utils/monitor';

// api/monitor pulls core/api (import.meta) → mock for the container smoke tests.
// The Control Tower Overview also reads the health/integrity/trend/readiness summaries;
// stub them to empty so the summary charts render (zeros) without a network.
jest.mock('../api/monitor', () => ({
  getOverview: jest.fn(), getBranchCockpit: jest.fn(), getAudit: jest.fn(),
  getGroupHealth: jest.fn().mockResolvedValue({}), getIntegrity: jest.fn().mockResolvedValue({}),
  getTrend: jest.fn().mockResolvedValue({}), getSetupReadiness: jest.fn().mockResolvedValue({}),
}));
// eslint-disable-next-line import/first
import { getOverview, getBranchCockpit, getAudit } from '../api/monitor';
// eslint-disable-next-line import/first
import { ControlTower } from '../ControlTower';
// eslint-disable-next-line import/first
import { BranchCockpit } from '../BranchCockpit';
// eslint-disable-next-line import/first
import { AuditTrail } from '../AuditTrail';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('monitor utils', () => {
  test('overviewKpis pulls the four headline numbers', () => {
    const o = { pendingTotal: 3, oldestPendingDays: 5, lockedPeriods: 2, controls: [{ enabled: true }, { enabled: false }] };
    const byKey = Object.fromEntries(overviewKpis(o).map((k) => [k.key, k.value]));
    expect(byKey).toEqual({ pending: 3, oldest: 5, locked: 2, controls: 1 });
  });
  test('streamRows + actorName', () => {
    expect(streamRows({ streamPending: { governance: 2, decision: 1 } }).map((r) => r.value)).toEqual([2, 1]);
    expect(actorName({ name: 'Farhan' })).toBe('Farhan');
    expect(actorName(null)).toBe('—');
  });
});

describe('ControlTower', () => {
  test('renders KPIs and a live control', async () => {
    getOverview.mockResolvedValue({ pendingTotal: 4, oldestPendingDays: 9, lockedPeriods: 1, controls: [{ key: 'core.policy_guard', enabled: false, label: 'Master' }], streamPending: { governance: 3, decision: 1 }, recentEvents: [] });
    renderWith(<ControlTower />);
    expect(await screen.findByText('Master')).toBeInTheDocument();
    expect(screen.getByTestId('tk-kpis')).toHaveTextContent('9');
    // Sectioned into tabs (like the ERP Rules Manager), Overview default.
    ['Overview', 'Group Health', 'Setup Readiness', 'Close & Integrity', 'Scrutiny Trend', 'Governance']
      .forEach((t) => expect(screen.getByRole('button', { name: t })).toBeInTheDocument());
  });
});

describe('BranchCockpit', () => {
  test('renders a per-branch row', async () => {
    getBranchCockpit.mockResolvedValue({ items: [{ branch: 'BOM', pendingDecisions: 2, pendingGovernance: 0, lockedPeriods: ['2026-06'] }] });
    renderWith(<BranchCockpit />);
    expect(await screen.findByText('BOM')).toBeInTheDocument();
    expect(screen.getByText('2026-06')).toBeInTheDocument();
  });
});

describe('AuditTrail', () => {
  test('renders control events', async () => {
    getAudit.mockResolvedValue({ items: [{ _id: '1', ts: '2026-07-04T10:00:00Z', action: 'approval.approve', actor: { name: 'Owner' }, branch: 'BOM' }] });
    renderWith(<AuditTrail />);
    expect(await screen.findByText('approval.approve')).toBeInTheDocument();
  });
});
