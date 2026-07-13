import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readinessFromFlags } from '../utils/readiness';

const FLAG_STATE = {
  flags: {
    'core.policy_guard': { enabled: false, foundation: false, label: 'Master control' },
    'branch.hide_statements': { enabled: true, foundation: false, label: 'Hide statements' },
    'branch.central_relocated': { enabled: false, foundation: false, label: 'Relocate central' },
    'branch.pending_by_default': { foundation: true, label: 'Pending by default' },
  },
};

describe('readinessFromFlags', () => {
  test('computes engaged count + green %', () => {
    const r = readinessFromFlags(FLAG_STATE);
    expect(r.total).toBe(4);
    expect(r.engaged).toBe(2);                 // hide_statements (enabled) + pending_by_default (foundation)
    expect(r.pct).toBe(50);
    expect(r.masterOn).toBe(false);            // core.policy_guard off
  });
  test('foundation flags count as engaged', () => {
    const r = readinessFromFlags(FLAG_STATE);
    const found = r.items.find((i) => i.key === 'branch.pending_by_default');
    expect(found.on).toBe(true);
    expect(found.foundation).toBe(true);
  });
  test('masterOn true when core.policy_guard is enabled', () => {
    const r = readinessFromFlags({ flags: { 'core.policy_guard': { enabled: true } } });
    expect(r.masterOn).toBe(true);
    expect(r.pct).toBe(100);
  });
  test('empty / missing state is safe', () => {
    expect(readinessFromFlags(undefined)).toEqual({ total: 0, engaged: 0, pct: 0, masterOn: false, items: [] });
  });
});

jest.mock('../api/flags', () => ({ getFlagState: jest.fn().mockResolvedValue({
  flags: { 'core.policy_guard': { enabled: false, label: 'Master control' }, 'branch.hide_statements': { enabled: true, label: 'Hide statements' } },
}) }));
// eslint-disable-next-line import/first
import { ConfigReadiness } from '../setup-roles/ConfigReadiness';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('ConfigReadiness', () => {
  test('renders the green % and a per-control status table', async () => {
    renderWith(<ConfigReadiness />);
    // wait for the query to resolve (a control row appears)
    expect(await screen.findByText('Master control')).toBeInTheDocument();
    expect(await screen.findByText('50%')).toBeInTheDocument();          // 1 of 2 engaged
    expect(screen.getByText(/Dormant · migration-safe/)).toBeInTheDocument(); // master off
  });
});
