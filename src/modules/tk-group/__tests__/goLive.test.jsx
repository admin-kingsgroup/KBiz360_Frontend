import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { enforcementEngaged, goLiveStatus, goLiveSteps } from '../utils/goLive';

// GoLive pulls api/flags + api/governance (core/api import.meta) → mock both.
jest.mock('../api/flags', () => ({ getFlagState: jest.fn() }));
jest.mock('../api/governance', () => ({ getPendingByType: jest.fn().mockResolvedValue([]) }));
// eslint-disable-next-line import/first
import { GoLive } from '../setup-roles/GoLive';
// eslint-disable-next-line import/first
import { getFlagState } from '../api/flags';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('go-live utils', () => {
  test('enforcementEngaged / goLiveStatus reflect any configurable flag (not foundation)', () => {
    expect(enforcementEngaged({ flags: { 'entry.mandatory_docs': { enabled: true } } })).toBe(true);
    expect(enforcementEngaged({ flags: { 'entry.mandatory_docs': { enabled: false } } })).toBe(false);
    expect(enforcementEngaged({ flags: { 'reports.log_exports': { enabled: false, branches: { BOM: true } } } })).toBe(true); // per-branch on
    expect(enforcementEngaged({ flags: { 'core.audit_log': { foundation: true } } })).toBe(false); // foundation doesn't count
    expect(goLiveStatus({ flags: {} })).toBe('dormant');
  });
  test('steps: dormant → engage/live not done; a pending flag marks "engage" done; foundation always done', () => {
    const dormant = goLiveSteps({ flags: { x: {} } }, 0);
    expect(dormant.find((s) => s.key === 'live').done).toBe(false);
    expect(dormant.find((s) => s.key === 'engage').done).toBe(false);
    expect(dormant.find((s) => s.key === 'foundation').done).toBe(true);   // day-one enforcing
    const proposed = goLiveSteps({ flags: { x: {} } }, 1);
    expect(proposed.find((s) => s.key === 'engage').done).toBe(true);
    const live = goLiveSteps({ flags: { 'entry.mandatory_docs': { enabled: true } } }, 0);
    expect(live.every((s) => s.done)).toBe(true);
  });
});

describe('GoLive container', () => {
  beforeEach(() => jest.clearAllMocks());
  test('shows DORMANT when no configurable rule is engaged', async () => {
    getFlagState.mockResolvedValue({ flags: { 'entry.mandatory_docs': { enabled: false } } });
    renderWith(<GoLive setRoute={() => {}} />);
    expect(await screen.findByText(/controls are built but not enforcing/)).toBeInTheDocument();
  });
  test('shows LIVE when a configurable rule is engaged', async () => {
    getFlagState.mockResolvedValue({ flags: { 'entry.mandatory_docs': { enabled: true } } });
    renderWith(<GoLive setRoute={() => {}} />);
    // wait for the async flag query to flip the banner to LIVE
    expect(await screen.findByText(/the control guard is engaged/)).toBeInTheDocument();
  });
});
